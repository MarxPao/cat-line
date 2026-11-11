package com.deadline.core.data.repository

import androidx.room.withTransaction
import com.deadline.core.data.db.DeadLineDatabase
import com.deadline.core.data.db.LedgerDao
import com.deadline.core.data.db.OccurrenceDao
import com.deadline.core.data.mapper.toDomain
import com.deadline.core.data.mapper.toEntity
import com.deadline.core.domain.engine.DayEconomyContext
import com.deadline.core.domain.engine.DelayEngine
import com.deadline.core.domain.engine.EconomyEngine
import com.deadline.core.domain.event.DomainEvent
import com.deadline.core.domain.event.EventBus
import com.deadline.core.domain.model.Balances
import com.deadline.core.domain.model.CheckInCommand
import com.deadline.core.domain.model.CheckInResult
import com.deadline.core.domain.model.CommitmentType
import com.deadline.core.domain.model.CurrencyType
import com.deadline.core.domain.model.EffortLevel
import com.deadline.core.domain.model.LedgerEntry
import com.deadline.core.domain.model.Occurrence
import com.deadline.core.domain.model.OccurrenceState
import com.deadline.core.domain.port.LedgerRepository
import com.deadline.core.domain.port.OccurrenceRepository
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import java.time.Clock
import java.time.LocalDate
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Executa um bloco em transacao atomica (Room em producao, direto em testes unitarios JVM).
 */
fun interface TransactionRunner {
    suspend fun <T> runInTransaction(block: suspend () -> T): T
}

class RoomTransactionRunner @Inject constructor(
    private val database: DeadLineDatabase,
) : TransactionRunner {
    override suspend fun <T> runInTransaction(block: suspend () -> T): T =
        database.withTransaction { block() }
}

/**
 * Implementacao de `LedgerRepository` em Room (WP-05 · Secao 4 e Secao 19).
 * Garante que o saldo calculado nunca fique negativo (Principio 1).
 */
@Singleton
class RoomLedgerRepository @Inject constructor(
    private val ledgerDao: LedgerDao,
) : LedgerRepository {

    override suspend fun append(entries: List<LedgerEntry>) {
        if (entries.isEmpty()) return
        ledgerDao.insertAllIgnoreDuplicates(entries.map { it.toEntity() })
    }

    override fun balance(): Flow<Balances> =
        ledgerDao.observeAll().map { rows ->
            var fish = 0L
            var goldenYarn = 0L
            var bond = 0L
            rows.forEach { row ->
                when (CurrencyType.valueOf(row.currency)) {
                    CurrencyType.PEIXINHOS -> fish += row.amount
                    CurrencyType.NOVELOS_DOURADOS -> goldenYarn += row.amount
                    CurrencyType.VINCULO -> if (row.amount > 0) bond += row.amount
                }
            }
            Balances(
                peixinhos = fish.coerceAtLeast(0L),
                novelosDourados = goldenYarn.coerceAtLeast(0L),
                vinculo = bond.coerceAtLeast(0L),
            )
        }
}

/**
 * Implementacao de `OccurrenceRepository` (WP-05 · AD-08 e AD-09):
 * - Check-in, mudanca de estado da ocorrencia (`FEITO`) e lancamentos no livro-caixa (`LedgerEntry`)
 *   ocorrem na mesma transacao Room.
 * - O evento `DomainEvent.CheckInRegistrado` so e publicado no `EventBus` DEPOIS que a transacao
 *   faz commit com sucesso.
 * - Se `registerCheckIn` for chamado novamente para a mesma ocorrencia e mesmo horario/origem,
 *   o indice unico do livro-caixa impede pagamento duplicado (idempotencia AD-09).
 */
@Singleton
class RoomOccurrenceRepository @Inject constructor(
    private val occurrenceDao: OccurrenceDao,
    private val ledgerDao: LedgerDao,
    private val transactionRunner: TransactionRunner,
    private val delayEngine: DelayEngine,
    private val economyEngine: EconomyEngine,
    private val eventBus: EventBus,
    private val clock: Clock,
) : OccurrenceRepository {

    override fun observeDay(day: LocalDate): Flow<List<Occurrence>> =
        occurrenceDao.observeByDayKey(day.toString()).map { list ->
            list.map { it.toDomain() }
        }

    override suspend fun registerCheckIn(cmd: CheckInCommand): CheckInResult {
        val committedResult = transactionRunner.runInTransaction {
            val entity = occurrenceDao.getById(cmd.occurrenceId.value)
                ?: throw IllegalArgumentException("Ocorrencia nao encontrada: ${cmd.occurrenceId.value}")

            val currentOccurrence = entity.toDomain()
            val existingCheckIn = occurrenceDao.getCheckIn(cmd.occurrenceId.value)
            val checkInRecord = delayEngine.evaluateCheckIn(
                occurrence = currentOccurrence,
                checkedInAt = cmd.checkedInAt,
                origin = cmd.origin,
            )

            // Contabiliza o contexto do dia antes deste check-in
            val sameDayEntities = occurrenceDao.getByDayKey(entity.dayKey)
            val completedBeforeThis = sameDayEntities.count {
                it.id != entity.id && it.state == OccurrenceState.FEITO.name
            }
            val smallTasksPaidBeforeThis = sameDayEntities.count {
                it.id != entity.id &&
                    it.state == OccurrenceState.FEITO.name &&
                    it.type != CommitmentType.HABITO.name &&
                    it.effort == EffortLevel.P.name
            }

            val existingRefs = ledgerDao.getRulesForReference(entity.id)
                .map { it.ruleKey to it.referenceId }
                .toSet()

            val dayContext = DayEconomyContext(
                dayKey = currentOccurrence.dayKey,
                completedItemsTodayBeforeThis = completedBeforeThis,
                smallTasksPaidTodayBeforeThis = smallTasksPaidBeforeThis,
                habitStreakDays = 0,
                existingRuleReferences = existingRefs,
            )

            val now = clock.instant()
            val candidateEntries = if (existingCheckIn == null) {
                economyEngine.evaluateCheckIn(
                    occurrence = currentOccurrence,
                    checkIn = checkInRecord,
                    context = dayContext,
                    now = now,
                )
            } else if (
                existingCheckIn.checkedInAtEpochMillis == cmd.checkedInAt.toEpochMilli() &&
                existingCheckIn.origin == cmd.origin.name
            ) {
                // Chamada identica repetida -> idempotente, nao gera novos lancamentos
                emptyList()
            } else {
                // Edicao retroativa de um check-in ja existente -> gera lancamento de compensacao
                val allLedger = ledgerDao.getAll()
                val previousFishForOcc = allLedger
                    .filter {
                        it.currency == CurrencyType.PEIXINHOS.name &&
                            (it.referenceId == entity.id || it.referenceId.startsWith("${entity.id}:edit:"))
                    }
                    .sumOf { it.amount }
                val totalAvailableFish = allLedger
                    .filter { it.currency == CurrencyType.PEIXINHOS.name }
                    .sumOf { it.amount }
                    .coerceAtLeast(0L)

                economyEngine.compensateEditedCheckIn(
                    occurrence = currentOccurrence,
                    previousFishGranted = previousFishForOcc,
                    updatedCheckIn = checkInRecord,
                    contextForRecalculation = dayContext,
                    currentAvailableFishBalance = totalAvailableFish,
                    editIndex = existingCheckIn.editCount + 1,
                    now = now,
                )
            }

            val nextEditCount = if (existingCheckIn == null) 0 else existingCheckIn.editCount + 1
            occurrenceDao.upsertCheckIn(checkInRecord.toEntity(editCount = nextEditCount))
            occurrenceDao.updateState(entity.id, OccurrenceState.FEITO.name)

            val insertIds = if (candidateEntries.isNotEmpty()) {
                ledgerDao.insertAllIgnoreDuplicates(candidateEntries.map { it.toEntity() })
            } else {
                emptyList()
            }

            // Filtra apenas os lancamentos efetivamente gravados (cujo rowId != -1L)
            val persistedEntries = candidateEntries.filterIndexed { index, _ ->
                insertIds.getOrNull(index) != -1L
            }

            val updatedOccurrence = currentOccurrence.copy(state = OccurrenceState.FEITO)
            CheckInResult(
                occurrence = updatedOccurrence,
                checkIn = checkInRecord,
                ledgerEntries = persistedEntries,
            )
        }

        // AD-08: O evento de dominio so sai DEPOIS que a transacao Room fez commit com sucesso
        val fishEarned = committedResult.ledgerEntries
            .filter { it.currency == CurrencyType.PEIXINHOS }
            .sumOf { it.amount }

        eventBus.publish(
            DomainEvent.CheckInRegistrado(
                occurrenceId = committedResult.occurrence.id,
                dayKey = committedResult.occurrence.dayKey,
                delayMinutes = committedResult.checkIn.delayMinutes,
                origin = committedResult.checkIn.origin,
                fishEarned = fishEarned,
                occurredAt = clock.instant(),
            )
        )

        return committedResult
    }
}
