package com.deadline.core.domain.model

import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId

data class Occurrence(
    val id: OccurrenceId,
    val commitmentId: CommitmentId,
    val title: String,
    val type: CommitmentType,
    val effort: EffortLevel,
    val category: RoutineCategory,
    val goalId: GoalId? = null,
    val dayKey: LocalDate,
    val zoneId: ZoneId,
    val plannedStart: Instant? = null,
    val deadline: Instant,
    val state: OccurrenceState = OccurrenceState.PENDENTE,
)

data class CheckInRecord(
    val occurrenceId: OccurrenceId,
    val checkedInAt: Instant,
    val origin: CheckInOrigin,
    val delayMinutes: Long,
    val delayTier: DelayTier,
)

data class CheckInCommand(
    val occurrenceId: OccurrenceId,
    val checkedInAt: Instant,
    val origin: CheckInOrigin,
)

data class CheckInResult(
    val occurrence: Occurrence,
    val checkIn: CheckInRecord,
    val ledgerEntries: List<LedgerEntry>,
)

data class LedgerEntry(
    val id: LedgerEntryId,
    val currency: CurrencyType,
    val amount: Long,
    val ruleKey: String,
    val referenceId: String,
    val createdAt: Instant,
    val economyConfigVersion: Int,
) {
    init {
        require(economyConfigVersion > 0) { "economyConfigVersion deve ser positivo" }
    }
}

data class Balances(
    val peixinhos: Long = 0L,
    val novelosDourados: Long = 0L,
    val vinculo: Long = 0L,
) {
    init {
        require(peixinhos >= 0L) { "Saldo de peixinhos nunca pode ser negativo (Secao 19)" }
        require(novelosDourados >= 0L) { "Saldo de novelos dourados nunca pode ser negativo (Secao 19)" }
        require(vinculo >= 0L) { "Pontos de vinculo nunca podem ser negativos (Secao 19)" }
    }
}

/**
 * Entidades e Modelos da v3.2.0 (Metas com Passos, Compromissos, Livro-Razão e Logs)
 */
data class GoalStep(
    val id: GoalStepId,
    val goalId: GoalId,
    val title: String,
    val order: Int,
    val estMinutes: Int? = null,
    val targetDate: LocalDate? = null,
    val doneAt: Instant? = null,
    val archived: Boolean = false,
)

data class Goal(
    val id: GoalId,
    val title: String,
    val horizon: GoalHorizon,
    val yarnColor: String = "pink",
    val targetDate: LocalDate? = null,
    val archived: Boolean = false,
    val createdAt: Instant,
    val steps: List<GoalStep> = emptyList(),
)

data class Commitment(
    val id: CommitmentId,
    val title: String,
    val plannedStart: Instant,
    val plannedZone: ZoneId,
    val plannedMinutes: Int? = null,
    val category: RoutineCategory,
    val recurrenceRule: String? = null,
    val goalId: GoalId? = null,
    val stepId: GoalStepId? = null,
    val state: CommitmentState = CommitmentState.PENDING,
    val rescheduledFromId: CommitmentId? = null,
    val createdAt: Instant,
)

data class CheckIn(
    val id: String,
    val commitmentId: CommitmentId,
    val actualAt: Instant,
    val retroactive: Boolean = false,
    val lateMinutes: Long = 0L,
)

data class RewardEvent(
    val id: RewardEventId,
    val idempotencyKey: String,
    val kind: String,
    val fishDelta: Long,
    val bondDelta: Long,
    val refId: String,
    val at: Instant,
    val logicalDay: LocalDate,
)

data class DayClosure(
    val logicalDay: LocalDate,
    val closedAt: Instant,
)

data class WeeklyLog(
    val weekStartLogicalDay: LocalDate,
    val snapshotJson: String,
    val configVersion: Int,
    val createdAt: Instant,
)
