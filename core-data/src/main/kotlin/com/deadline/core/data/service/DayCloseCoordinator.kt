package com.deadline.core.data.service

import com.deadline.core.data.db.CatProfileDao
import com.deadline.core.data.db.CatProfileEntity
import com.deadline.core.data.db.DayClosureDao
import com.deadline.core.data.db.DayClosureEntity
import com.deadline.core.data.db.LedgerDao
import com.deadline.core.data.db.OccurrenceDao
import com.deadline.core.data.mapper.toDomain
import com.deadline.core.data.mapper.toEntity
import com.deadline.core.data.repository.TransactionRunner
import com.deadline.core.domain.engine.DayCloseEconomyInput
import com.deadline.core.domain.engine.DelayEngine
import com.deadline.core.domain.engine.EconomyEngine
import com.deadline.core.domain.engine.MoodEngine
import com.deadline.core.domain.engine.MoodIndices
import com.deadline.core.domain.engine.RecurrenceEngine
import com.deadline.core.domain.event.DomainEvent
import com.deadline.core.domain.event.EventBus
import com.deadline.core.domain.model.CatMood
import com.deadline.core.domain.model.CatTemperament
import com.deadline.core.domain.model.DayCloseTier
import java.time.Clock
import java.time.LocalDate
import javax.inject.Inject
import javax.inject.Singleton
import kotlin.math.roundToLong

/**
 * Servico de Fechamento do Dia chaveado por `dayKey` (Secao 7 da Arquitetura · AD-08 e AD-09):
 * 1. Idempotente por `dayKey`: se o dia ja foi fechado, retorna sem duplicar moedas nem alterar humor.
 * 2. Marca como `PERDIDO` as ocorrencias pendentes vencidas daquele `dayKey`.
 * 3. `DelayEngine` fecha os agregados (mediana, media, % no prazo).
 * 4. `EconomyEngine` paga o fechamento (bronze/prata/ouro), superacao e tela dentro da meta.
 * 5. `MoodEngine` ajusta o humor da gatinha (maximo 1 degrau por fechamento, congelado em modo descanso).
 * 6. Publica `DomainEvent.DiaFechado` apos o commit da transacao.
 */
@Singleton
class DayCloseCoordinator @Inject constructor(
    private val occurrenceDao: OccurrenceDao,
    private val ledgerDao: LedgerDao,
    private val dayClosureDao: DayClosureDao,
    private val catProfileDao: CatProfileDao,
    private val transactionRunner: TransactionRunner,
    private val recurrenceEngine: RecurrenceEngine,
    private val delayEngine: DelayEngine,
    private val economyEngine: EconomyEngine,
    private val moodEngine: MoodEngine,
    private val eventBus: EventBus,
    private val clock: Clock,
) {

    suspend fun closeDayIfNeeded(
        dayKey: LocalDate,
        screenTimeWithinGoal: Boolean = true,
    ): DayClosureEntity? {
        val dayKeyStr = dayKey.toString()
        val existingClosure = dayClosureDao.getByDayKey(dayKeyStr)
        if (existingClosure != null) {
            return existingClosure
        }

        val now = clock.instant()

        val committedClosure = transactionRunner.runInTransaction {
            val doubleCheck = dayClosureDao.getByDayKey(dayKeyStr)
            if (doubleCheck != null) return@runInTransaction null

            val rawEntities = occurrenceDao.getByDayKey(dayKeyStr)
            val domainOccurrences = rawEntities.map { it.toDomain() }

            // 1. Marca como PERDIDO as ocorrencias vencidas
            val expiredUpdated = recurrenceEngine.markExpiredAsLost(domainOccurrences, now)
            expiredUpdated.forEach { occ ->
                val prev = rawEntities.find { it.id == occ.id.value }
                if (prev != null && prev.state != occ.state.name) {
                    occurrenceDao.updateState(occ.id.value, occ.state.name)
                }
            }

            // 2. DelayEngine fecha os agregados do dia
            val checkInsMap = if (expiredUpdated.isEmpty()) {
                emptyMap()
            } else {
                occurrenceDao.getCheckInsForOccurrences(expiredUpdated.map { it.id.value })
                    .associate { it.occurrenceId to it.toDomain() }
            }
            val delaySummary = delayEngine.summarizeDay(dayKey, expiredUpdated, checkInsMap)

            // Histórico recente para bonus de superacao e dia de recuperacao
            val recentClosures = dayClosureDao.getRecentClosures(limit = 7)
            val prevDayClosure = recentClosures.firstOrNull { it.dayKey == dayKey.minusDays(1).toString() }
            val prevDayWasWeak = prevDayClosure?.tier == DayCloseTier.NENHUM.name
            val prev7Median = if (recentClosures.isEmpty()) {
                null
            } else {
                delayEngine.calculateMedian(recentClosures.map { it.medianDelayMinutes })
            }

            val existingRuleRefs = ledgerDao.getRulesForReference(dayKeyStr)
                .map { it.ruleKey to it.referenceId }
                .toSet()

            // 3. EconomyEngine avalia o fechamento
            val (tier, closeEntries) = economyEngine.evaluateDayClose(
                input = DayCloseEconomyInput(
                    dayKey = dayKey,
                    totalPlannedItems = delaySummary.totalPlannedCount,
                    totalCompletedItems = delaySummary.completedCount,
                    eveningCompletedItems = delaySummary.completedCount,
                    previousDayWasWeak = prevDayWasWeak,
                    todayMedianDelayMinutes = if (delaySummary.completedCount > 0) delaySummary.medianDelayMinutes else null,
                    previous7DaysMedianDelayMinutes = prev7Median,
                    screenTimeWithinGoal = screenTimeWithinGoal,
                    existingRuleReferences = existingRuleRefs,
                ),
                now = now,
            )

            if (closeEntries.isNotEmpty()) {
                ledgerDao.insertAllIgnoreDuplicates(closeEntries.map { it.toEntity() })
            }

            // 4. MoodEngine ajusta o humor da gatinha
            val currentProfile = catProfileDao.getProfile() ?: CatProfileEntity(
                id = CatProfileDao.DEFAULT_CAT_ID,
                name = "Gatinha",
                paletteKey = "calico_default",
                currentMood = CatMood.FELIZ.name,
                temperament = CatTemperament.ACOLHEDORA.name,
            )
            val previousMood = CatMood.valueOf(currentProfile.currentMood)

            val recentPunctualityScores = (recentClosures.map { it.onTimePercentage }.reversed() + delaySummary.onTimePercentage)
            val punctualityIdx = moodEngine.calculateWeightedPunctualityIndex(recentPunctualityScores)
            val consistencyIdx = if (delaySummary.totalPlannedCount == 0) {
                100.0
            } else {
                ((delaySummary.completedCount.toDouble() / delaySummary.totalPlannedCount.toDouble()) * 100.0).coerceIn(0.0, 100.0)
            }
            val focusIdx = if (screenTimeWithinGoal) 90.0 else 45.0

            val moodEval = moodEngine.evaluateDayClose(
                previousMood = previousMood,
                indices = MoodIndices(
                    punctualityIndex = punctualityIdx,
                    consistencyIndex = consistencyIdx,
                    focusIndex = focusIdx,
                ),
                isRestModeActive = currentProfile.isRestModeActive,
            )

            catProfileDao.upsert(currentProfile.copy(currentMood = moodEval.nextMood.name))

            val closureEntity = DayClosureEntity(
                dayKey = dayKeyStr,
                tier = tier.name,
                medianDelayMinutes = delaySummary.medianDelayMinutes,
                meanDelayMinutes = delaySummary.meanDelayMinutes,
                onTimePercentage = delaySummary.onTimePercentage,
                resultingMood = moodEval.nextMood.name,
                closedAtEpochMillis = now.toEpochMilli(),
            )
            val rowId = dayClosureDao.insertIgnoreDuplicate(closureEntity)
            if (rowId == -1L) null else closureEntity
        }

        if (committedClosure != null) {
            eventBus.publish(
                DomainEvent.DiaFechado(
                    dayKey = dayKey,
                    tier = DayCloseTier.valueOf(committedClosure.tier),
                    medianDelayMinutes = committedClosure.medianDelayMinutes.roundToLong(),
                    newMood = CatMood.valueOf(committedClosure.resultingMood),
                    occurredAt = now,
                )
            )
        }

        return committedClosure
    }
}
