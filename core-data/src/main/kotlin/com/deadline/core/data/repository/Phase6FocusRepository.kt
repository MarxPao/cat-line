package com.deadline.core.data.repository

import com.deadline.core.data.db.AppUsageDao
import com.deadline.core.data.db.AppUsageHourlyBucketEntity
import com.deadline.core.data.db.BlockRuleEntity
import com.deadline.core.data.db.CatProfileDao
import com.deadline.core.data.db.OccurrenceDao
import com.deadline.core.data.db.UnlockSessionEntity
import com.deadline.core.data.mapper.toDomain
import com.deadline.core.domain.engine.ActiveUnlockSession
import com.deadline.core.domain.engine.AppBlockRule
import com.deadline.core.domain.engine.BlockPolicy
import com.deadline.core.domain.event.DomainEvent
import com.deadline.core.domain.event.EventBus
import com.deadline.core.domain.model.RigorLevel
import com.deadline.core.domain.port.BlockDecision
import com.deadline.core.domain.port.DailyAppUsageReportItem
import com.deadline.core.domain.port.FocusControlRepository
import com.deadline.core.domain.port.UsageSource
import com.deadline.core.domain.time.DayBoundary
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.flow
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.launch
import java.time.Clock
import java.time.Duration
import java.time.Instant
import java.time.LocalTime
import java.util.UUID
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Implementacao de `FocusControlRepository` (WP-28 e WP-29 · Secao 7 e Secao 22):
 * - Guarda regras de bloqueio por app e horario.
 * - Observa eventos `DomainEvent.CheckInRegistrado` e abre sessao automatica de desbloqueio
 *   com duracao para apps no rigor `CONDICIONAL`.
 * - Coleta amostras de `UsageSource` em baldes por hora `(packageName, hourStartEpochMillis)`
 *   e limpa registros com mais de 180 dias.
 */
@Singleton
class RoomFocusControlRepository @Inject constructor(
    private val appUsageDao: AppUsageDao,
    private val occurrenceDao: OccurrenceDao,
    private val catProfileDao: CatProfileDao,
    private val usageSource: UsageSource,
    private val blockPolicy: BlockPolicy,
    private val dayBoundary: DayBoundary,
    private val eventBus: EventBus,
    private val clock: Clock,
) : FocusControlRepository {

    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)

    init {
        // Secao 22: "O dominio observa os check-ins e abre uma sessao de desbloqueio com duracao"
        scope.launch {
            eventBus.events.collect { event ->
                if (event is DomainEvent.CheckInRegistrado) {
                    val enabledRules = appUsageDao.getEnabledBlockRules()
                    val nowMillis = clock.instant().toEpochMilli()
                    enabledRules
                        .filter { it.rigorLevel == RigorLevel.CONDICIONAL.level }
                        .forEach { rule ->
                            val durationMillis = rule.unlockPassMinutes.coerceAtLeast(5) * 60_000L
                            appUsageDao.insertUnlockSession(
                                UnlockSessionEntity(
                                    id = UUID.randomUUID().toString(),
                                    packageName = rule.packageName,
                                    grantedAtEpochMillis = nowMillis,
                                    expiresAtEpochMillis = nowMillis + durationMillis,
                                    reason = "Check-in realizado: ${event.occurrenceId.value}",
                                )
                            )
                        }
                }
            }
        }
    }

    override fun observeBlockRules(): Flow<List<AppBlockRule>> =
        appUsageDao.observeAllBlockRules().map { list ->
            list.map { it.toDomainRule() }
        }

    override fun observeTodayUsageReport(): Flow<List<DailyAppUsageReportItem>> = flow {
        val todayKey = dayBoundary.currentDayKey(clock)
        val startInstant = dayBoundary.startOfLogicalDay(todayKey, clock.zone)
        val endInstant = dayBoundary.endOfLogicalDay(todayKey, clock.zone)
        val buckets = appUsageDao.getBucketsInRange(
            fromEpochMillis = startInstant.toEpochMilli(),
            toEpochMillis = endInstant.toEpochMilli(),
        )
        val report = buckets
            .groupBy { it.packageName }
            .map { (pkg, items) ->
                val totalMin = (items.sumOf { it.foregroundMillis } / 60_000L).coerceAtLeast(1L)
                DailyAppUsageReportItem(
                    packageName = pkg,
                    totalMinutesToday = totalMin,
                    dailyGoalMinutes = 60L,
                )
            }
            .sortedByDescending { it.totalMinutesToday }
        emit(report)
    }

    override suspend fun upsertBlockRule(
        packageName: String,
        rigor: RigorLevel,
        windowStart: LocalTime,
        windowEnd: LocalTime,
        unlockPassMinutes: Int,
    ) {
        val cleanPkg = packageName.trim().lowercase()
        if (cleanPkg.isBlank() || blockPolicy.isProtectedPackage(cleanPkg)) return

        appUsageDao.upsertBlockRule(
            BlockRuleEntity(
                packageName = cleanPkg,
                rigorLevel = rigor.level,
                activeDaysMask = 0b1111111,
                windowStartLocalTime = windowStart.toString(),
                windowEndLocalTime = windowEnd.toString(),
                unlockPassMinutes = unlockPassMinutes.coerceIn(5, 120),
                enabled = true,
            )
        )
    }

    override suspend fun removeBlockRule(packageName: String) {
        appUsageDao.deleteBlockRule(packageName.trim().lowercase())
    }

    override suspend fun grantEmergencyOrPassSession(
        packageName: String,
        durationMinutes: Int,
        reason: String,
    ) {
        val nowMillis = clock.instant().toEpochMilli()
        appUsageDao.insertUnlockSession(
            UnlockSessionEntity(
                id = UUID.randomUUID().toString(),
                packageName = packageName.trim().lowercase(),
                grantedAtEpochMillis = nowMillis,
                expiresAtEpochMillis = nowMillis + (durationMinutes.coerceAtLeast(1) * 60_000L),
                reason = reason,
            )
        )
    }

    override suspend fun evaluatePackageForService(foregroundPackage: String): BlockDecision {
        val now = clock.instant()
        val rulesMap = appUsageDao.getEnabledBlockRules()
            .map { it.toDomainRule() }
            .associateBy { it.packageName }

        val sessions = appUsageDao.getActiveUnlockSessions(now.toEpochMilli()).map {
            ActiveUnlockSession(
                id = it.id,
                packageName = it.packageName,
                grantedAt = Instant.ofEpochMilli(it.grantedAtEpochMillis),
                expiresAt = Instant.ofEpochMilli(it.expiresAtEpochMillis),
                reason = it.reason,
            )
        }

        val todayKey = dayBoundary.currentDayKey(clock)
        val todayOccurrences = occurrenceDao.getByDayKey(todayKey.toString()).map { it.toDomain() }
        val isRestMode = catProfileDao.getProfile()?.isRestModeActive ?: false

        return blockPolicy.evaluateForegroundPackage(
            foregroundPackage = foregroundPackage.trim().lowercase(),
            now = now,
            zoneId = clock.zone,
            rulesByPackage = rulesMap,
            activeSessions = sessions,
            todayOccurrences = todayOccurrences,
            isRestModeActive = isRestMode,
        )
    }

    override suspend fun sampleRecentUsageEvents() {
        val now = clock.instant()
        val from = now.minus(Duration.ofHours(6))
        val events = usageSource.readEvents(from, now)
        if (events.isNotEmpty()) {
            val buckets = events
                .groupBy { ev ->
                    val hourStart = (ev.occurredAt.toEpochMilli() / 3_600_000L) * 3_600_000L
                    ev.packageName to hourStart
                }
                .map { (key, list) ->
                    AppUsageHourlyBucketEntity(
                        packageName = key.first,
                        hourStartEpochMillis = key.second,
                        foregroundMillis = list.sumOf { it.foregroundMillis },
                    )
                }
            appUsageDao.upsertBuckets(buckets)
        }
        // Limpeza de retencao de 180 dias (Secao 5 da Arquitetura e Secao 22)
        val cutoff180Days = now.minus(Duration.ofDays(180)).toEpochMilli()
        appUsageDao.purgeOlderThan(cutoff180Days)
    }

    private fun BlockRuleEntity.toDomainRule(): AppBlockRule =
        AppBlockRule(
            packageName = packageName,
            rigor = RigorLevel.entries.firstOrNull { it.level == rigorLevel } ?: RigorLevel.AVISO,
            windowStart = runCatching { LocalTime.parse(windowStartLocalTime) }.getOrDefault(LocalTime.of(8, 0)),
            windowEnd = runCatching { LocalTime.parse(windowEndLocalTime) }.getOrDefault(LocalTime.of(23, 0)),
            unlockPassMinutes = unlockPassMinutes,
            enabled = enabled,
        )
}
