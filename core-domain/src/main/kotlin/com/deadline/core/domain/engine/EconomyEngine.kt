package com.deadline.core.domain.engine

import com.deadline.core.domain.config.EconomyConfig
import com.deadline.core.domain.model.CheckInOrigin
import com.deadline.core.domain.model.CheckInRecord
import com.deadline.core.domain.model.CommitmentType
import com.deadline.core.domain.model.CurrencyType
import com.deadline.core.domain.model.DayCloseTier
import com.deadline.core.domain.model.DelayTier
import com.deadline.core.domain.model.EffortLevel
import com.deadline.core.domain.model.GoalHorizon
import com.deadline.core.domain.model.GoalId
import com.deadline.core.domain.model.LedgerEntry
import com.deadline.core.domain.model.LedgerEntryId
import com.deadline.core.domain.model.Occurrence
import java.time.Instant
import java.time.LocalDate
import kotlin.math.min
import kotlin.math.roundToLong

data class DayEconomyContext(
    val dayKey: LocalDate,
    /** Quantidade de itens (tarefas + habitos) ja pagos no dia antes deste check-in (base 0). */
    val completedItemsTodayBeforeThis: Int,
    /** Quantidade de tarefas P ja pagas hoje antes deste check-in. */
    val smallTasksPaidTodayBeforeThis: Int,
    /** Dias consecutivos de sequencia atual do habito (para calculo de bonus). */
    val habitStreakDays: Int = 0,
    /** Regra + referencia ja lancadas no livro-caixa para garantir idempotencia (AD-09). */
    val existingRuleReferences: Set<Pair<String, String>> = emptySet(),
)

data class DayCloseEconomyInput(
    val dayKey: LocalDate,
    val totalPlannedItems: Int,
    val totalCompletedItems: Int,
    /** Quantos itens foram cumpridos a noite (ex: apos as 18h) para elegibilidade de Dia de Recuperacao. */
    val eveningCompletedItems: Int = 0,
    /** Se o dia anterior foi fraco (NENHUM), habilitando a regra do Dia de Recuperacao (Secao 19). */
    val previousDayWasWeak: Boolean = false,
    val todayMedianDelayMinutes: Double? = null,
    val previous7DaysMedianDelayMinutes: Double? = null,
    val screenTimeWithinGoal: Boolean = false,
    val existingRuleReferences: Set<Pair<String, String>> = emptySet(),
)

data class WeeklyChestReward(
    val fishEntries: List<LedgerEntry>,
    val fishAmount: Long,
    val grantedRareCosmeticItem: Boolean,
    val newPityCounter: Int,
)

/**
 * Motor de economia em Kotlin puro (WP-07 · Secao 6 e Secao 19).
 *
 * Regras atendidas:
 * - Zero numeros magicos: todos os valores vem de `EconomyConfig` (`economia.json`).
 * - Sem saldo negativo e sem perdas: item perdido paga 0, atraso reduz o ganho.
 * - Teto de 10 tarefas P pagas por dia.
 * - Check-in retroativo paga 50%.
 * - Habito paga 8 * min(1.5, 1 + 0.02 * diasSequencia).
 * - Rendimento decrescente: a partir do 12º item do dia (1-based >= 12), o ganho cai pela metade.
 * - Fechamento do dia em faixas Bronze (50%), Prata (75%), Ouro (100%) + Dia de Recuperacao (depois de dia fraco,
 *   cumprir 2 itens a noite libera Bronze).
 * - Bonus de superacao (ate 15 peixinhos) quando a mediana do dia fica abaixo da mediana dos ultimos 7 dias.
 * - Cada ganho positivo de peixinhos tambem gera a mesma quantidade de pontos de VINCULO (Secao 19).
 * - Editar um check-in gera lancamento de compensacao no livro-caixa imutavel (sem nunca deixar saldo negativo).
 * - Idempotencia por par `(ruleKey, referenceId)` (AD-09).
 */
class EconomyEngine(
    val config: EconomyConfig = EconomyConfig.loadBundled(),
) {

    fun evaluateCheckIn(
        occurrence: Occurrence,
        checkIn: CheckInRecord,
        context: DayEconomyContext,
        now: Instant,
    ): List<LedgerEntry> {
        val referenceId = occurrence.id.value
        val ruleKey = when (occurrence.type) {
            CommitmentType.HABITO -> RULE_HABIT_CHECKIN
            CommitmentType.TAREFA, CommitmentType.EVENTO -> RULE_TASK_CHECKIN
        }

        if ((ruleKey to referenceId) in context.existingRuleReferences) {
            return emptyList()
        }

        if (checkIn.delayTier == DelayTier.PERDIDO) {
            return emptyList()
        }

        val rawFish = when (occurrence.type) {
            CommitmentType.HABITO -> calculateHabitRawFish(context.habitStreakDays)
            CommitmentType.TAREFA, CommitmentType.EVENTO -> {
                if (occurrence.effort == EffortLevel.P &&
                    context.smallTasksPaidTodayBeforeThis >= config.maxPaidSmallTasksPerDay
                ) {
                    return emptyList()
                }
                val base = config.taskBaseRewards[occurrence.effort] ?: 0L
                val punctualityMult = config.punctualityMultipliers[checkIn.delayTier] ?: 0.0
                base.toDouble() * punctualityMult
            }
        }

        val afterRetroactive = if (checkIn.origin == CheckInOrigin.RETROATIVO) {
            rawFish * config.retroactiveCheckInMultiplier
        } else {
            rawFish
        }

        // 1-based index do item no dia: a partir do 12º item (index >= 12), o ganho cai pela metade
        val itemNumberToday = context.completedItemsTodayBeforeThis + 1
        val afterDiminishing = if (itemNumberToday >= config.diminishingReturnsStartItemIndex) {
            afterRetroactive * config.diminishingReturnsMultiplier
        } else {
            afterRetroactive
        }

        val finalFish = afterDiminishing.roundToLong().coerceAtLeast(0L)
        if (finalFish <= 0L) return emptyList()

        return buildFishAndBondEntries(
            ruleKey = ruleKey,
            referenceId = referenceId,
            fishAmount = finalFish,
            now = now,
        )
    }

    /**
     * Editar um check-in gera um lancamento de compensacao no livro-caixa imutavel (Secao 19).
     * Garante que a compensacao nunca ultrapasse o saldo disponivel (Principio 1: sem saldo negativo).
     */
    fun compensateEditedCheckIn(
        occurrence: Occurrence,
        previousFishGranted: Long,
        updatedCheckIn: CheckInRecord,
        contextForRecalculation: DayEconomyContext,
        currentAvailableFishBalance: Long,
        editIndex: Int,
        now: Instant,
    ): List<LedgerEntry> {
        val recalculatedEntries = evaluateCheckIn(
            occurrence = occurrence,
            checkIn = updatedCheckIn,
            context = contextForRecalculation.copy(existingRuleReferences = emptySet()),
            now = now,
        )
        val newFishAmount = recalculatedEntries
            .filter { it.currency == CurrencyType.PEIXINHOS }
            .sumOf { it.amount }

        val delta = newFishAmount - previousFishGranted
        if (delta == 0L) return emptyList()

        val safeDelta = if (delta < 0L) {
            // Nunca permite que o saldo de peixinhos fique negativo
            maxOf(delta, -currentAvailableFishBalance.coerceAtLeast(0L))
        } else {
            delta
        }
        if (safeDelta == 0L) return emptyList()

        val compRef = "${occurrence.id.value}:edit:$editIndex"
        val entries = mutableListOf(
            LedgerEntry(
                id = LedgerEntryId("$RULE_CHECKIN_COMPENSATION:$compRef:fish"),
                currency = CurrencyType.PEIXINHOS,
                amount = safeDelta,
                ruleKey = RULE_CHECKIN_COMPENSATION,
                referenceId = compRef,
                createdAt = now,
                economyConfigVersion = config.version,
            )
        )
        if (safeDelta > 0L) {
            entries += LedgerEntry(
                id = LedgerEntryId("$RULE_CHECKIN_COMPENSATION:$compRef:bond"),
                currency = CurrencyType.VINCULO,
                amount = safeDelta,
                ruleKey = "$RULE_CHECKIN_COMPENSATION:BOND",
                referenceId = compRef,
                createdAt = now,
                economyConfigVersion = config.version,
            )
        }
        return entries
    }

    fun determineDayCloseTier(input: DayCloseEconomyInput): DayCloseTier {
        if (input.totalPlannedItems <= 0) return DayCloseTier.NENHUM
        val ratio = input.totalCompletedItems.toDouble() / input.totalPlannedItems.toDouble()
        val standardTier = when {
            ratio >= config.dayCloseThresholds.goldRatio -> DayCloseTier.OURO
            ratio >= config.dayCloseThresholds.silverRatio -> DayCloseTier.PRATA
            ratio >= config.dayCloseThresholds.bronzeRatio -> DayCloseTier.BRONZE
            else -> DayCloseTier.NENHUM
        }

        // Dia de recuperacao: depois de um dia fraco, cumprir 2 itens a noite ainda libera o bronze
        if (standardTier == DayCloseTier.NENHUM &&
            input.previousDayWasWeak &&
            input.eveningCompletedItems >= config.recoveryDayEveningMinItems
        ) {
            return DayCloseTier.BRONZE
        }

        return standardTier
    }

    fun evaluateDayClose(
        input: DayCloseEconomyInput,
        now: Instant,
    ): Pair<DayCloseTier, List<LedgerEntry>> {
        val dayRef = input.dayKey.toString()
        val tier = determineDayCloseTier(input)
        val entries = mutableListOf<LedgerEntry>()

        // 1. Fechamento do dia (bronze / prata / ouro)
        val tierFish = config.dayCloseRewards[tier] ?: 0L
        if (tierFish > 0L && (RULE_DAY_CLOSE_TIER to dayRef) !in input.existingRuleReferences) {
            entries += buildFishAndBondEntries(
                ruleKey = RULE_DAY_CLOSE_TIER,
                referenceId = dayRef,
                fishAmount = tierFish,
                now = now,
            )
        }

        // 2. Bonus de superacao (ate 15 peixinhos proporcional a melhora da mediana do dia vs ultimos 7 dias)
        val todayMed = input.todayMedianDelayMinutes
        val prev7Med = input.previous7DaysMedianDelayMinutes
        if (todayMed != null && prev7Med != null && todayMed < prev7Med && input.totalCompletedItems > 0) {
            if ((RULE_OVERCOMING_BONUS to dayRef) !in input.existingRuleReferences) {
                val improvement = prev7Med - todayMed
                val fraction = (improvement / config.overcomingReferenceMinutes).coerceIn(0.0, 1.0)
                val bonusFish = (fraction * config.maxOvercomingBonusFish.toDouble())
                    .roundToLong()
                    .coerceIn(1L, config.maxOvercomingBonusFish)
                entries += buildFishAndBondEntries(
                    ruleKey = RULE_OVERCOMING_BONUS,
                    referenceId = dayRef,
                    fishAmount = bonusFish,
                    now = now,
                )
            }
        }

        // 3. Tela dentro da meta (10 peixinhos no fechamento do dia)
        if (input.screenTimeWithinGoal && (RULE_SCREEN_TIME_GOAL to dayRef) !in input.existingRuleReferences) {
            entries += buildFishAndBondEntries(
                ruleKey = RULE_SCREEN_TIME_GOAL,
                referenceId = dayRef,
                fishAmount = config.screenTimeWithinGoalReward,
                now = now,
            )
        }

        return tier to entries
    }

    /**
     * Bau da semana: 40 a 120 peixinhos (piso proporcional ao desempenho da semana) e 1 item sorteado,
     * com garantia (pity) a cada 4 baus (Secao 19).
     */
    fun evaluateWeeklyChest(
        weekReferenceId: String,
        weeklyCompletionRatio: Double,
        previousChestsWithoutRareItem: Int,
        randomRollZeroToOne: Double = 0.5,
        now: Instant,
    ): WeeklyChestReward {
        val clampedPerf = weeklyCompletionRatio.coerceIn(0.0, 1.0)
        val span = (config.weeklyChest.maxFish - config.weeklyChest.minFish).toDouble()
        val floorFish = config.weeklyChest.minFish + (span * 0.6 * clampedPerf).roundToLong()
        val variableBonus = (span * 0.4 * randomRollZeroToOne.coerceIn(0.0, 1.0)).roundToLong()
        val totalFish = (floorFish + variableBonus).coerceIn(config.weeklyChest.minFish, config.weeklyChest.maxFish)

        val currentChestCount = previousChestsWithoutRareItem + 1
        val guaranteedByPity = currentChestCount >= config.weeklyChest.pityGuaranteeEveryChests
        val wonByRoll = randomRollZeroToOne >= 0.75
        val grantedRareItem = guaranteedByPity || wonByRoll
        val nextPity = if (grantedRareItem) 0 else currentChestCount

        val entries = buildFishAndBondEntries(
            ruleKey = RULE_WEEKLY_CHEST,
            referenceId = weekReferenceId,
            fishAmount = totalFish,
            now = now,
        )

        return WeeklyChestReward(
            fishEntries = entries,
            fishAmount = totalFish,
            grantedRareCosmeticItem = grantedRareItem,
            newPityCounter = nextPity,
        )
    }

    /**
     * Novelos dourados: meta curta 1, media 3, longa 5, semana com 5 dias ouro 1 (Secao 19).
     */
    fun evaluateGoalMilestoneGoldenYarn(
        goalId: GoalId,
        horizon: GoalHorizon,
        existingRuleReferences: Set<Pair<String, String>> = emptySet(),
        now: Instant,
    ): List<LedgerEntry> {
        val ref = goalId.value
        if ((RULE_GOAL_GOLDEN_YARN to ref) in existingRuleReferences) return emptyList()

        val amount = when (horizon) {
            GoalHorizon.SEMANA, GoalHorizon.TAREFA -> config.goldenYarnMilestones.shortGoal
            GoalHorizon.MES -> config.goldenYarnMilestones.mediumGoal
            GoalHorizon.TRIMESTRE, GoalHorizon.VIDA -> config.goldenYarnMilestones.longGoal
        }
        if (amount <= 0L) return emptyList()

        return listOf(
            LedgerEntry(
                id = LedgerEntryId("$RULE_GOAL_GOLDEN_YARN:$ref"),
                currency = CurrencyType.NOVELOS_DOURADOS,
                amount = amount,
                ruleKey = RULE_GOAL_GOLDEN_YARN,
                referenceId = ref,
                createdAt = now,
                economyConfigVersion = config.version,
            )
        )
    }

    fun evaluateGoldWeekGoldenYarn(
        weekReferenceId: String,
        goldDaysCountInWeek: Int,
        existingRuleReferences: Set<Pair<String, String>> = emptySet(),
        now: Instant,
    ): List<LedgerEntry> {
        if (goldDaysCountInWeek < config.goldenYarnMilestones.goldDaysInWeekThreshold) return emptyList()
        if ((RULE_GOLD_WEEK_GOLDEN_YARN to weekReferenceId) in existingRuleReferences) return emptyList()

        return listOf(
            LedgerEntry(
                id = LedgerEntryId("$RULE_GOLD_WEEK_GOLDEN_YARN:$weekReferenceId"),
                currency = CurrencyType.NOVELOS_DOURADOS,
                amount = config.goldenYarnMilestones.goldWeekReward,
                ruleKey = RULE_GOLD_WEEK_GOLDEN_YARN,
                referenceId = weekReferenceId,
                createdAt = now,
                economyConfigVersion = config.version,
            )
        )
    }

    private fun calculateHabitRawFish(streakDays: Int): Double {
        val multiplier = min(
            config.habitStreakMaxMultiplier,
            1.0 + config.habitStreakStepBonus * streakDays.coerceAtLeast(0),
        )
        return config.habitBaseReward.toDouble() * multiplier
    }

    private fun buildFishAndBondEntries(
        ruleKey: String,
        referenceId: String,
        fishAmount: Long,
        now: Instant,
    ): List<LedgerEntry> = listOf(
        LedgerEntry(
            id = LedgerEntryId("$ruleKey:$referenceId:fish"),
            currency = CurrencyType.PEIXINHOS,
            amount = fishAmount,
            ruleKey = ruleKey,
            referenceId = referenceId,
            createdAt = now,
            economyConfigVersion = config.version,
        ),
        LedgerEntry(
            id = LedgerEntryId("$ruleKey:$referenceId:bond"),
            currency = CurrencyType.VINCULO,
            amount = fishAmount,
            ruleKey = "$ruleKey:BOND",
            referenceId = referenceId,
            createdAt = now,
            economyConfigVersion = config.version,
        ),
    )

    companion object {
        const val RULE_TASK_CHECKIN = "TASK_CHECKIN"
        const val RULE_HABIT_CHECKIN = "HABIT_CHECKIN"
        const val RULE_CHECKIN_COMPENSATION = "CHECKIN_COMPENSATION"
        const val RULE_DAY_CLOSE_TIER = "DAY_CLOSE_TIER"
        const val RULE_OVERCOMING_BONUS = "OVERCOMING_BONUS"
        const val RULE_SCREEN_TIME_GOAL = "SCREEN_TIME_GOAL"
        const val RULE_WEEKLY_CHEST = "WEEKLY_CHEST"
        const val RULE_GOAL_GOLDEN_YARN = "GOAL_GOLDEN_YARN"
        const val RULE_GOLD_WEEK_GOLDEN_YARN = "GOLD_WEEK_GOLDEN_YARN"
    }
}
