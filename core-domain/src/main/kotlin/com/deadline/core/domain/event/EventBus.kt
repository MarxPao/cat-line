package com.deadline.core.domain.event

import com.deadline.core.domain.model.CatMood
import com.deadline.core.domain.model.CheckIn
import com.deadline.core.domain.model.CheckInOrigin
import com.deadline.core.domain.model.CommitmentId
import com.deadline.core.domain.model.DayCloseTier
import com.deadline.core.domain.model.GoalId
import com.deadline.core.domain.model.GoalStepId
import com.deadline.core.domain.model.OccurrenceId
import kotlinx.coroutines.channels.BufferOverflow
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.flow.asSharedFlow
import java.time.Instant
import java.time.LocalDate

sealed interface DomainEvent {
    val occurredAt: Instant

    data class CheckInRegistrado(
        val occurrenceId: OccurrenceId,
        val dayKey: LocalDate,
        val delayMinutes: Long,
        val origin: CheckInOrigin,
        val fishEarned: Long,
        override val occurredAt: Instant,
    ) : DomainEvent

    data class DiaFechado(
        val dayKey: LocalDate,
        val tier: DayCloseTier,
        val medianDelayMinutes: Long,
        val newMood: CatMood,
        override val occurredAt: Instant,
    ) : DomainEvent

    data class MetaConcluida(
        val goalId: GoalId,
        val goldenYarnEarned: Long,
        override val occurredAt: Instant,
    ) : DomainEvent

    data class HumorAlterado(
        val previousMood: CatMood,
        val currentMood: CatMood,
        override val occurredAt: Instant,
    ) : DomainEvent

    data class NovelinhoGracinhaDisparada(
        val reason: String,
        override val occurredAt: Instant,
    ) : DomainEvent

    data class StepDone(
        val stepId: GoalStepId,
        val goalId: GoalId,
        override val occurredAt: Instant,
    ) : DomainEvent

    data class GoalDone(
        val goalId: GoalId,
        override val occurredAt: Instant,
    ) : DomainEvent

    data class CommitmentCheckedIn(
        val commitmentId: CommitmentId,
        val checkIn: CheckIn,
        override val occurredAt: Instant,
    ) : DomainEvent

    data class CommitmentMissed(
        val commitmentId: CommitmentId,
        override val occurredAt: Instant,
    ) : DomainEvent

    data class CommitmentRescheduled(
        val originalCommitmentId: CommitmentId,
        val newCommitmentId: CommitmentId,
        val newPlannedStart: Instant,
        override val occurredAt: Instant,
    ) : DomainEvent

    data class CommitmentUnmarked(
        val commitmentId: CommitmentId,
        override val occurredAt: Instant,
    ) : DomainEvent

    data class CommitmentUndone(
        val commitmentId: CommitmentId,
        val previousCheckIn: CheckIn,
        val compensationRewardKey: String,
        override val occurredAt: Instant,
    ) : DomainEvent
}

interface EventBus {
    val events: SharedFlow<DomainEvent>
    suspend fun publish(e: DomainEvent)
}

class InMemoryEventBus(
    replay: Int = 0,
    extraBufferCapacity: Int = 64,
) : EventBus {
    private val _events = MutableSharedFlow<DomainEvent>(
        replay = replay,
        extraBufferCapacity = extraBufferCapacity,
        onBufferOverflow = BufferOverflow.DROP_OLDEST,
    )

    override val events: SharedFlow<DomainEvent> = _events.asSharedFlow()

    override suspend fun publish(e: DomainEvent) {
        _events.emit(e)
    }
}
