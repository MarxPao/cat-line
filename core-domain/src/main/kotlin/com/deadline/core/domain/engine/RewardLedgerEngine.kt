package com.deadline.core.domain.engine

import com.deadline.core.domain.config.CommitmentsConfig
import com.deadline.core.domain.model.CheckIn
import com.deadline.core.domain.model.Commitment
import com.deadline.core.domain.model.CommitmentId
import com.deadline.core.domain.model.Goal
import com.deadline.core.domain.model.GoalStep
import com.deadline.core.domain.model.RewardEvent
import com.deadline.core.domain.model.RewardEventId
import java.time.Clock
import java.time.Instant
import java.time.LocalDate

data class LedgerTransactionResult(
    val events: List<RewardEvent> = emptyList(),
    val fishGranted: Long = 0L,
    val bondGranted: Long = 0L,
    val socialMinutesGranted: Long = 0L,
    val fishCapReached: Boolean = false,
    val socialMinutesCapReached: Boolean = false,
    val gentleMessage: String? = null,
)

data class LedgerBalance(
    val totalFish: Long,
    val totalBond: Long,
    val totalSocialMinutesToday: Long,
    val fishEarnedToday: Long,
)

/**
 * Motor do Livro-Razão de Recompensas e Anti-Farm (v3.2.0 · Prompt 6).
 *
 * Princípios:
 * - Sem punição: recompensas nunca deixam saldo negativo.
 * - Idempotência estrita: cada chave idempotencyKey só é emitida uma vez.
 * - Tetos diários lidos de config.caps (peixinhos e minutos de rede social).
 * - Barreira anti-farm para micro-tarefas (minCommitmentMinutesToReward).
 * - Multiplicador de check-in retroativo (retroactiveMultiplier).
 * - Resposta carinhosa da gatinha ao bater teto sem mensagem de bloqueio.
 */
class RewardLedgerEngine(
    private val clock: Clock,
) {
    companion object {
        const val KIND_COMMITMENT_DONE = "commitment_done"
        const val KIND_ON_TIME_BONUS = "on_time_bonus"
        const val KIND_STEP_DONE = "step_done"
        const val KIND_GOAL_DONE = "goal_done"
        const val KIND_DAY_CLOSURE = "day_closure"
        const val KIND_SOCIAL_MINUTES = "social_minutes"
        const val KIND_COMPENSATION = "compensation"

        const val GENTLE_CAP_MESSAGE = "Hoje já juntamos bastante! A gatinha está radiante e cheia de carinho com você."
    }

    /**
     * Calcula o balanço consolidado e os ganhos do dia lógico informado.
     */
    fun calculateBalance(events: List<RewardEvent>, logicalDay: LocalDate): LedgerBalance {
        var totalFish = 0L
        var totalBond = 0L
        var totalSocialToday = 0L
        var fishToday = 0L

        events.forEach { e ->
            if (e.kind == KIND_SOCIAL_MINUTES) {
                if (e.logicalDay == logicalDay) {
                    totalSocialToday += e.fishDelta
                }
            } else {
                totalFish += e.fishDelta
                totalBond += e.bondDelta
                if (e.logicalDay == logicalDay && e.fishDelta > 0) {
                    fishToday += e.fishDelta
                }
            }
        }

        return LedgerBalance(
            totalFish = maxOf(0L, totalFish),
            totalBond = maxOf(0L, totalBond),
            totalSocialMinutesToday = maxOf(0L, totalSocialToday),
            fishEarnedToday = fishToday,
        )
    }

    /**
     * Emite recompensas por conclusão de compromisso (commitmentDone + onTimeBonus + socialMinutes).
     */
    fun awardCommitmentDone(
        commitment: Commitment,
        checkIn: CheckIn,
        existingEvents: List<RewardEvent>,
        config: CommitmentsConfig = CommitmentsConfig.loadBundled(),
        logicalDay: LocalDate,
    ): LedgerTransactionResult {
        val existingKeys = existingEvents.map { it.idempotencyKey }.toSet()
        val balance = calculateBalance(existingEvents, logicalDay)

        val newEvents = mutableListOf<RewardEvent>()
        var fishToGrant = 0L
        var socialMinutesToGrant = 0L
        var fishCapReached = false
        var socialCapReached = false

        val minMinutes = config.caps.minCommitmentMinutesToReward
        val isMicroTask = commitment.plannedMinutes != null && commitment.plannedMinutes < minMinutes

        // 1. Recompensa base do compromisso
        val baseDoneKey = "$KIND_COMMITMENT_DONE:${commitment.id.value}"
        if (!existingKeys.contains(baseDoneKey) && !isMicroTask) {
            val baseFish = config.rewards.commitmentDone.fish.toLong()
            val computedFish = if (checkIn.retroactive) {
                val mult = config.rewards.retroactiveMultiplier
                maxOf(1L, (baseFish * mult).toLong())
            } else {
                baseFish
            }

            val currentFishToday = balance.fishEarnedToday + fishToGrant
            val remainingFishCap = maxOf(0L, config.caps.fishPerLogicalDay.toLong() - currentFishToday)
            val allowedFish = minOf(computedFish, remainingFishCap)

            if (allowedFish < computedFish) {
                fishCapReached = true
            }

            if (allowedFish > 0L) {
                fishToGrant += allowedFish
                newEvents.add(
                    RewardEvent(
                        id = RewardEventId("rew_${commitment.id.value}_done"),
                        idempotencyKey = baseDoneKey,
                        kind = KIND_COMMITMENT_DONE,
                        fishDelta = allowedFish,
                        bondDelta = 0L,
                        refId = commitment.id.value,
                        at = clock.instant(),
                        logicalDay = logicalDay,
                    )
                )
            }
        }

        // 2. Bônus de pontualidade
        val onTimeKey = "$KIND_ON_TIME_BONUS:${commitment.id.value}"
        val isPunctual = checkIn.lateMinutes <= config.punctuality.toleranceMinutes
        if (!existingKeys.contains(onTimeKey) && isPunctual && !isMicroTask) {
            val bonusFish = config.rewards.onTimeBonus.fish.toLong()
            val currentFishToday = balance.fishEarnedToday + fishToGrant
            val remainingFishCap = maxOf(0L, config.caps.fishPerLogicalDay.toLong() - currentFishToday)
            val allowedBonus = minOf(bonusFish, remainingFishCap)

            if (allowedBonus < bonusFish) {
                fishCapReached = true
            }

            if (allowedBonus > 0L) {
                fishToGrant += allowedBonus
                newEvents.add(
                    RewardEvent(
                        id = RewardEventId("rew_${commitment.id.value}_ontime"),
                        idempotencyKey = onTimeKey,
                        kind = KIND_ON_TIME_BONUS,
                        fishDelta = allowedBonus,
                        bondDelta = 0L,
                        refId = commitment.id.value,
                        at = clock.instant(),
                        logicalDay = logicalDay,
                    )
                )
            }
        }

        // 3. Minutos de rede social (+5 min por tarefa)
        val socialKey = "social_min:${commitment.id.value}:$logicalDay"
        if (!existingKeys.contains(socialKey)) {
            val baseSocial = 5L
            val currentSocialToday = balance.totalSocialMinutesToday
            val remainingSocialCap = maxOf(0L, config.caps.socialMinutesEarnedPerDay.toLong() - currentSocialToday)
            val allowedSocial = minOf(baseSocial, remainingSocialCap)

            if (allowedSocial < baseSocial) {
                socialCapReached = true
            }

            if (allowedSocial > 0L) {
                socialMinutesToGrant += allowedSocial
                newEvents.add(
                    RewardEvent(
                        id = RewardEventId("rew_${commitment.id.value}_soc"),
                        idempotencyKey = socialKey,
                        kind = KIND_SOCIAL_MINUTES,
                        fishDelta = allowedSocial,
                        bondDelta = 0L,
                        refId = commitment.id.value,
                        at = clock.instant(),
                        logicalDay = logicalDay,
                    )
                )
            }
        }

        val gentleMsg = if (fishCapReached || socialCapReached) GENTLE_CAP_MESSAGE else null

        return LedgerTransactionResult(
            events = newEvents,
            fishGranted = fishToGrant,
            bondGranted = 0L,
            socialMinutesGranted = socialMinutesToGrant,
            fishCapReached = fishCapReached,
            socialMinutesCapReached = socialCapReached,
            gentleMessage = gentleMsg,
        )
    }

    /**
     * Emite recompensas por conclusão de passo de meta (apenas uma vez na vida do passo).
     */
    fun awardStepDone(
        step: GoalStep,
        existingEvents: List<RewardEvent>,
        config: CommitmentsConfig = CommitmentsConfig.loadBundled(),
        logicalDay: LocalDate,
    ): LedgerTransactionResult {
        val stepKey = "$KIND_STEP_DONE:${step.id.value}"
        val existingKeys = existingEvents.map { it.idempotencyKey }.toSet()

        if (existingKeys.contains(stepKey)) {
            return LedgerTransactionResult()
        }

        val balance = calculateBalance(existingEvents, logicalDay)
        val baseFish = config.rewards.stepDone.fish.toLong()
        val remainingCap = maxOf(0L, config.caps.fishPerLogicalDay.toLong() - balance.fishEarnedToday)
        val allowedFish = minOf(baseFish, remainingCap)
        val capReached = allowedFish < baseFish

        val event = RewardEvent(
            id = RewardEventId("rew_step_${step.id.value}"),
            idempotencyKey = stepKey,
            kind = KIND_STEP_DONE,
            fishDelta = allowedFish,
            bondDelta = 0L,
            refId = step.id.value,
            at = clock.instant(),
            logicalDay = logicalDay,
        )

        return LedgerTransactionResult(
            events = listOf(event),
            fishGranted = allowedFish,
            bondGranted = 0L,
            socialMinutesGranted = 0L,
            fishCapReached = capReached,
            gentleMessage = if (capReached) GENTLE_CAP_MESSAGE else null,
        )
    }

    /**
     * Emite recompensas por conclusão de meta inteira.
     */
    fun awardGoalDone(
        goal: Goal,
        existingEvents: List<RewardEvent>,
        config: CommitmentsConfig = CommitmentsConfig.loadBundled(),
        logicalDay: LocalDate,
    ): LedgerTransactionResult {
        val goalKey = "$KIND_GOAL_DONE:${goal.id.value}"
        val existingKeys = existingEvents.map { it.idempotencyKey }.toSet()

        if (existingKeys.contains(goalKey)) {
            return LedgerTransactionResult()
        }

        val balance = calculateBalance(existingEvents, logicalDay)
        val baseFish = config.rewards.goalDone.fish.toLong()
        val baseBond = config.rewards.goalDone.bond.toLong()

        val remainingCap = maxOf(0L, config.caps.fishPerLogicalDay.toLong() - balance.fishEarnedToday)
        val allowedFish = minOf(baseFish, remainingCap)
        val capReached = allowedFish < baseFish

        val event = RewardEvent(
            id = RewardEventId("rew_goal_${goal.id.value}"),
            idempotencyKey = goalKey,
            kind = KIND_GOAL_DONE,
            fishDelta = allowedFish,
            bondDelta = baseBond,
            refId = goal.id.value,
            at = clock.instant(),
            logicalDay = logicalDay,
        )

        return LedgerTransactionResult(
            events = listOf(event),
            fishGranted = allowedFish,
            bondGranted = baseBond,
            socialMinutesGranted = 0L,
            fishCapReached = capReached,
            gentleMessage = if (capReached) GENTLE_CAP_MESSAGE else null,
        )
    }

    /**
     * Emite recompensa pelo fechamento do dia (idempotente por dia lógico).
     */
    fun awardDayClosure(
        logicalDay: LocalDate,
        existingEvents: List<RewardEvent>,
        config: CommitmentsConfig = CommitmentsConfig.loadBundled(),
    ): LedgerTransactionResult {
        val closureKey = "$KIND_DAY_CLOSURE:$logicalDay"
        val existingKeys = existingEvents.map { it.idempotencyKey }.toSet()

        if (existingKeys.contains(closureKey)) {
            return LedgerTransactionResult()
        }

        val baseBond = config.rewards.dayClosure.bond.toLong()
        val event = RewardEvent(
            id = RewardEventId("rew_close_$logicalDay"),
            idempotencyKey = closureKey,
            kind = KIND_DAY_CLOSURE,
            fishDelta = 0L,
            bondDelta = baseBond,
            refId = logicalDay.toString(),
            at = clock.instant(),
            logicalDay = logicalDay,
        )

        return LedgerTransactionResult(
            events = listOf(event),
            fishGranted = 0L,
            bondGranted = baseBond,
            socialMinutesGranted = 0L,
            fishCapReached = false,
        )
    }

    /**
     * Emite eventos compensatórios para reverter recompensas em caso de "desfazer".
     */
    fun compensateCommitmentUndo(
        commitmentId: CommitmentId,
        existingEvents: List<RewardEvent>,
        logicalDay: LocalDate,
    ): LedgerTransactionResult {
        val relatedEvents = existingEvents.filter {
            it.refId == commitmentId.value &&
                (it.kind == KIND_COMMITMENT_DONE || it.kind == KIND_ON_TIME_BONUS || it.kind == KIND_SOCIAL_MINUTES)
        }

        val existingKeys = existingEvents.map { it.idempotencyKey }.toSet()
        val compensationEvents = mutableListOf<RewardEvent>()
        var fishDeducted = 0L
        var bondDeducted = 0L
        var socialDeducted = 0L

        relatedEvents.forEach { original ->
            val undoKey = "undo:${original.idempotencyKey}"
            if (!existingKeys.contains(undoKey)) {
                val compEvent = RewardEvent(
                    id = RewardEventId("rew_comp_${original.id.value}"),
                    idempotencyKey = undoKey,
                    kind = original.kind,
                    fishDelta = -original.fishDelta,
                    bondDelta = -original.bondDelta,
                    refId = original.refId,
                    at = clock.instant(),
                    logicalDay = logicalDay,
                )
                compensationEvents.add(compEvent)
                if (original.kind == KIND_SOCIAL_MINUTES) {
                    socialDeducted += original.fishDelta
                } else {
                    fishDeducted += original.fishDelta
                    bondDeducted += original.bondDelta
                }
            }
        }

        return LedgerTransactionResult(
            events = compensationEvents,
            fishGranted = -fishDeducted,
            bondGranted = -bondDeducted,
            socialMinutesGranted = -socialDeducted,
        )
    }
}
