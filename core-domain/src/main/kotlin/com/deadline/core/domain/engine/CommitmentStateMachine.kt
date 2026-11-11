package com.deadline.core.domain.engine

import com.deadline.core.domain.event.DomainEvent
import com.deadline.core.domain.model.CheckIn
import com.deadline.core.domain.model.Commitment
import com.deadline.core.domain.model.CommitmentId
import com.deadline.core.domain.model.CommitmentState
import java.time.Clock
import java.time.Duration
import java.time.Instant
import java.time.LocalDateTime
import java.time.ZoneId

data class CheckInResult(
    val commitment: Commitment,
    val checkIn: CheckIn,
    val events: List<DomainEvent> = emptyList(),
    val wasDuplicate: Boolean = false,
)

data class MissedResult(
    val commitment: Commitment,
    val events: List<DomainEvent> = emptyList(),
)

data class RescheduleResult(
    val original: Commitment,
    val replacement: Commitment,
    val events: List<DomainEvent> = emptyList(),
)

data class UnmarkedResult(
    val commitment: Commitment,
    val events: List<DomainEvent> = emptyList(),
)

data class UndoResult(
    val commitment: Commitment,
    val checkIn: CheckIn,
    val compensationRewardKey: String,
    val events: List<DomainEvent> = emptyList(),
)

/**
 * Máquina de estados completa do Compromisso (v3.2.0 · Prompt 4).
 *
 * Estados:
 * - PENDING: compromisso aguardando realização
 * - DONE: cumprido (via check-in ao vivo ou retroativo)
 * - MISSED: não cumprido (marcação explícita da usuária, sem punição)
 * - RESCHEDULED: remarcado para outro horário/dia
 * - UNMARKED: encerramento do dia sem marcação (não assume missed)
 *
 * Casos de borda atendidos:
 * - Caso 3: Cálculo de atraso com fuso horário (plannedZone) e transição de horário de verão.
 * - Caso 5: Idempotência de check-in (duplo toque não duplica registro).
 * - Caso 6: Desfazer dentro da janela permitida reverte o estado e emite compensação sem apagar histórico.
 * - Caso 7: Ocorrências de compromisso recorrente são instâncias independentes.
 */
class CommitmentStateMachine(
    private val clock: Clock,
) {
    /**
     * Calcula o atraso em minutos entre o planejado e o momento real.
     * Retorna valor negativo caso tenha sido realizado com antecedência.
     */
    fun calculateLateMinutes(
        plannedStart: Instant,
        actualAt: Instant,
        plannedZone: ZoneId = ZoneId.of("UTC"),
    ): Long {
        val plannedZdt = plannedStart.atZone(plannedZone)
        val actualZdt = actualAt.atZone(plannedZone)
        return Duration.between(plannedZdt, actualZdt).toMinutes()
    }

    /**
     * Sobrecarga para cálculo a partir de data/hora local no fuso planejado.
     * Útil quando o compromisso foi agendado em horário de parede local durante transição de DST.
     */
    fun calculateLateMinutes(
        plannedLocal: LocalDateTime,
        actualAt: Instant,
        plannedZone: ZoneId,
    ): Long {
        val plannedZdt = plannedLocal.atZone(plannedZone)
        val actualZdt = actualAt.atZone(plannedZone)
        return Duration.between(plannedZdt, actualZdt).toMinutes()
    }

    /**
     * Transição pending/unmarked -> done
     * Idempotente: se já estiver done, retorna o check-in existente sem duplicar.
     */
    fun checkIn(
        commitment: Commitment,
        actualAt: Instant? = null,
        retroactive: Boolean = false,
        existingCheckIns: List<CheckIn> = emptyList(),
    ): CheckInResult {
        if (commitment.state == CommitmentState.DONE) {
            val existing = existingCheckIns.firstOrNull { it.commitmentId == commitment.id }
                ?: CheckIn(
                    id = "chk_${commitment.id.value}",
                    commitmentId = commitment.id,
                    actualAt = commitment.plannedStart,
                    retroactive = false,
                    lateMinutes = 0L,
                )
            return CheckInResult(
                commitment = commitment,
                checkIn = existing,
                events = emptyList(),
                wasDuplicate = true,
            )
        }

        if (commitment.state != CommitmentState.PENDING && commitment.state != CommitmentState.UNMARKED) {
            throw IllegalStateException(
                "Transição inválida: compromisso no estado ${commitment.state} não pode receber check-in."
            )
        }

        val actual = actualAt ?: clock.instant()
        val isRetro = retroactive || (commitment.state == CommitmentState.UNMARKED)
        val lateMinutes = calculateLateMinutes(commitment.plannedStart, actual, commitment.plannedZone)

        val checkIn = CheckIn(
            id = "chk_${commitment.id.value}_${actual.toEpochMilli()}",
            commitmentId = commitment.id,
            actualAt = actual,
            retroactive = isRetro,
            lateMinutes = lateMinutes,
        )

        val updated = commitment.copy(state = CommitmentState.DONE)
        val event = DomainEvent.CommitmentCheckedIn(commitment.id, checkIn, actual)

        return CheckInResult(
            commitment = updated,
            checkIn = checkIn,
            events = listOf(event),
            wasDuplicate = false,
        )
    }

    /**
     * Transição pending/unmarked -> missed
     */
    fun markMissed(commitment: Commitment): MissedResult {
        if (commitment.state == CommitmentState.MISSED) {
            return MissedResult(commitment = commitment, events = emptyList())
        }

        if (commitment.state != CommitmentState.PENDING && commitment.state != CommitmentState.UNMARKED) {
            throw IllegalStateException(
                "Transição inválida: compromisso no estado ${commitment.state} não pode ser marcado como não cumprido."
            )
        }

        val now = clock.instant()
        val updated = commitment.copy(state = CommitmentState.MISSED)
        val event = DomainEvent.CommitmentMissed(commitment.id, now)

        return MissedResult(commitment = updated, events = listOf(event))
    }

    /**
     * Transição pending/unmarked -> rescheduled
     * Cria nova ocorrência pending vinculada pelo rescheduledFromId.
     */
    fun reschedule(
        commitment: Commitment,
        newCommitmentId: CommitmentId,
        newPlannedStart: Instant,
        newPlannedZone: ZoneId = commitment.plannedZone,
    ): RescheduleResult {
        if (commitment.state != CommitmentState.PENDING && commitment.state != CommitmentState.UNMARKED) {
            throw IllegalStateException(
                "Transição inválida: compromisso no estado ${commitment.state} não pode ser remarcado."
            )
        }

        val now = clock.instant()
        val updatedOriginal = commitment.copy(state = CommitmentState.RESCHEDULED)
        val replacement = commitment.copy(
            id = newCommitmentId,
            plannedStart = newPlannedStart,
            plannedZone = newPlannedZone,
            state = CommitmentState.PENDING,
            rescheduledFromId = commitment.id,
            createdAt = now,
        )

        val event = DomainEvent.CommitmentRescheduled(
            originalCommitmentId = commitment.id,
            newCommitmentId = newCommitmentId,
            newPlannedStart = newPlannedStart,
            occurredAt = now,
        )

        return RescheduleResult(
            original = updatedOriginal,
            replacement = replacement,
            events = listOf(event),
        )
    }

    /**
     * Transição pending -> unmarked (fechamento do dia sem resposta da usuária)
     */
    fun markUnmarked(commitment: Commitment): UnmarkedResult {
        if (commitment.state == CommitmentState.UNMARKED) {
            return UnmarkedResult(commitment = commitment, events = emptyList())
        }

        if (commitment.state != CommitmentState.PENDING) {
            throw IllegalStateException(
                "Transição inválida: compromisso no estado ${commitment.state} não pode ser marcado como sem marcação."
            )
        }

        val now = clock.instant()
        val updated = commitment.copy(state = CommitmentState.UNMARKED)
        val event = DomainEvent.CommitmentUnmarked(commitment.id, now)

        return UnmarkedResult(commitment = updated, events = listOf(event))
    }

    /**
     * Transição done -> pending (desfazer dentro da janela configurada)
     * Reverte estado e emite sinal de compensação sem apagar histórico.
     */
    fun undo(
        commitment: Commitment,
        checkIn: CheckIn,
        undoAt: Instant? = null,
        undoWindowMinutes: Int = 10,
    ): UndoResult {
        if (commitment.state != CommitmentState.DONE) {
            throw IllegalStateException(
                "Transição inválida: apenas compromissos concluídos podem ser desfeitos."
            )
        }

        val now = undoAt ?: clock.instant()
        val elapsedMinutes = Duration.between(checkIn.actualAt, now).toMinutes()

        if (elapsedMinutes > undoWindowMinutes || elapsedMinutes < 0) {
            throw IllegalStateException(
                "Janela de desfazer expirou (limite de ${undoWindowMinutes}m ultrapassado: ${elapsedMinutes}m decorridos)."
            )
        }

        val updated = commitment.copy(state = CommitmentState.PENDING)
        val compensationKey = "undo_commitment:${commitment.id.value}"
        val event = DomainEvent.CommitmentUndone(
            commitmentId = commitment.id,
            previousCheckIn = checkIn,
            compensationRewardKey = compensationKey,
            occurredAt = now,
        )

        return UndoResult(
            commitment = updated,
            checkIn = checkIn,
            compensationRewardKey = compensationKey,
            events = listOf(event),
        )
    }
}
