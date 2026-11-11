package com.deadline.core.domain.engine

import com.deadline.core.domain.config.CommitmentsConfig
import com.deadline.core.domain.model.CheckIn
import com.deadline.core.domain.model.Commitment
import com.deadline.core.domain.model.CommitmentId
import com.deadline.core.domain.model.CommitmentState
import com.deadline.core.domain.model.DayClosure
import com.deadline.core.domain.model.RewardEvent
import java.time.Clock
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId

data class DayClosureResult(
    val closure: DayClosure,
    val updatedCommitments: List<Commitment> = emptyList(),
    val newCheckIns: List<CheckIn> = emptyList(),
    val rewardEvents: List<RewardEvent> = emptyList(),
    val wasAlreadyClosed: Boolean = false,
)

data class BatchResolutionResult(
    val updatedCommitments: List<Commitment> = emptyList(),
    val createdCommitments: List<Commitment> = emptyList(),
    val createdCheckIns: List<CheckIn> = emptyList(),
)

/**
 * Motor de lógica pura do Fechamento do Dia (v3.2.0 · Prompt 7).
 *
 * Princípios:
 * - Sem punição: nenhum compromisso esquecido é marcado automaticamente como não cumprido.
 * - Suporte a resolução individual: cumprido retroativo, não cumprido, remarcar.
 * - Operação em lote: "marcar todos como cumpridos no horário planejado" com lateMinutes = 0.
 * - Adiar resolução: mantém o compromisso como UNMARKED fora das métricas.
 * - Idempotência estrita: DayClosure e recompensa (+1 vínculo) registrados uma única vez por dia lógico.
 * - Reconciliação sequencial de múltiplos dias acumulados.
 */
class DayClosureEngine(
    private val clock: Clock,
    private val stateMachine: CommitmentStateMachine = CommitmentStateMachine(clock),
    private val rewardLedger: RewardLedgerEngine = RewardLedgerEngine(clock),
) {
    /**
     * Identifica compromissos do dia lógico que ainda não foram resolvidos (PENDING ou UNMARKED).
     */
    fun findUnresolved(
        logicalDay: LocalDate,
        commitments: List<Commitment>,
        referenceZone: ZoneId = ZoneId.of("America/Sao_Paulo"),
    ): List<Commitment> = commitments.filter { c ->
        val cDate = c.plannedStart.atZone(c.plannedZone ?: referenceZone).toLocalDate()
        cDate == logicalDay && (c.state == CommitmentState.PENDING || c.state == CommitmentState.UNMARKED)
    }

    /**
     * Resolve compromisso esquecido como cumprido (retroativo).
     */
    fun resolveAsDone(
        commitment: Commitment,
        actualAt: Instant,
    ): Pair<Commitment, CheckIn> {
        val res = stateMachine.checkIn(commitment, actualAt = actualAt, retroactive = true)
        return Pair(res.commitment, res.checkIn)
    }

    /**
     * Resolve compromisso esquecido como não cumprido (marcação explícita).
     */
    fun resolveAsMissed(commitment: Commitment): Commitment {
        val res = stateMachine.markMissed(commitment)
        return res.commitment
    }

    /**
     * Resolve compromisso esquecido como remarcado para nova data/hora.
     */
    fun resolveAsRescheduled(
        commitment: Commitment,
        newCommitmentId: CommitmentId,
        newPlannedStart: Instant,
        newPlannedZone: ZoneId = commitment.plannedZone,
    ): Pair<Commitment, Commitment> {
        val res = stateMachine.reschedule(commitment, newCommitmentId, newPlannedStart, newPlannedZone)
        return Pair(res.original, res.replacement)
    }

    /**
     * Operação em lote: marca todos os pendentes selecionados como cumpridos no horário planejado.
     */
    fun resolveAllAsPlanned(unresolved: List<Commitment>): BatchResolutionResult {
        val updated = mutableListOf<Commitment>()
        val checkIns = mutableListOf<CheckIn>()

        unresolved.forEach { c ->
            val res = stateMachine.checkIn(c, actualAt = c.plannedStart, retroactive = true)
            updated.add(res.commitment)
            checkIns.add(res.checkIn)
        }

        return BatchResolutionResult(
            updatedCommitments = updated,
            createdCheckIns = checkIns,
        )
    }

    /**
     * Adia a resolução: compromissos PENDING passam a UNMARKED e permanecem fora das métricas.
     */
    fun postpone(unresolved: List<Commitment>): List<Commitment> = unresolved.map { c ->
        if (c.state == CommitmentState.PENDING) {
            stateMachine.markUnmarked(c).commitment
        } else {
            c
        }
    }

    /**
     * Executa o fechamento do dia lógico.
     * Idempotente: se o dia já foi fechado, retorna o registro existente sem duplicar recompensas.
     */
    fun closeDay(
        logicalDay: LocalDate,
        commitments: List<Commitment>,
        existingClosures: List<DayClosure>,
        existingRewardEvents: List<RewardEvent>,
        config: CommitmentsConfig = CommitmentsConfig.loadBundled(),
        referenceZone: ZoneId = ZoneId.of("America/Sao_Paulo"),
    ): DayClosureResult {
        val existing = existingClosures.firstOrNull { it.logicalDay == logicalDay }
        if (existing != null) {
            return DayClosureResult(
                closure = existing,
                wasAlreadyClosed = true,
            )
        }

        // Qualquer compromisso ainda PENDING deste dia é resguardado como UNMARKED
        val unresolved = findUnresolved(logicalDay, commitments, referenceZone)
        val updatedCommitments = unresolved.filter { it.state == CommitmentState.PENDING }.map {
            stateMachine.markUnmarked(it).commitment
        }

        val closure = DayClosure(
            logicalDay = logicalDay,
            closedAt = clock.instant(),
        )

        val rewardRes = rewardLedger.awardDayClosure(
            logicalDay = logicalDay,
            existingEvents = existingRewardEvents,
            config = config,
        )

        return DayClosureResult(
            closure = closure,
            updatedCommitments = updatedCommitments,
            rewardEvents = rewardRes.events,
            wasAlreadyClosed = false,
        )
    }

    /**
     * Identifica dias intermediários não fechados em caso de reboot ou dias sem abrir o app.
     */
    fun reconcilePendingDays(
        lastClosedDay: LocalDate,
        currentLogicalDay: LocalDate,
    ): List<LocalDate> {
        val pendingDays = mutableListOf<LocalDate>()
        var cursor = lastClosedDay.plusDays(1)
        while (cursor.isBefore(currentLogicalDay)) {
            pendingDays.add(cursor)
            cursor = cursor.plusDays(1)
        }
        return pendingDays
    }
}
