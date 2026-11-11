package com.deadline.core.domain.config

import com.deadline.core.domain.model.DayCloseTier
import com.deadline.core.domain.model.DelayTier
import com.deadline.core.domain.model.EffortLevel
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json

@Serializable
data class WeeklyChestConfig(
    val minFish: Long = 40L,
    val maxFish: Long = 120L,
    val pityGuaranteeEveryChests: Int = 4,
)

@Serializable
data class DayCloseThresholdsConfig(
    val bronzeRatio: Double = 0.50,
    val silverRatio: Double = 0.75,
    val goldRatio: Double = 1.00,
)

@Serializable
data class GoldenYarnMilestonesConfig(
    val shortGoal: Long = 1L,
    val mediumGoal: Long = 3L,
    val longGoal: Long = 5L,
    val goldDaysInWeekThreshold: Int = 5,
    val goldWeekReward: Long = 1L,
)

@Serializable
data class StoreReferencePricesConfig(
    val simpleCosmeticMin: Long = 40L,
    val simpleCosmeticMax: Long = 80L,
    val mediumCosmeticOrFurnitureMin: Long = 150L,
    val mediumCosmeticOrFurnitureMax: Long = 300L,
    val largeSceneItemMin: Long = 600L,
    val largeSceneItemMax: Long = 1000L,
    val foodOrToyMin: Long = 10L,
    val foodOrToyMax: Long = 30L,
    val newAreaGoldenYarn: Long = 8L,
    val newCatGoldenYarn: Long = 15L,
    val reserveYarnGoldenYarn: Long = 2L,
    val maxReserveYarnHeld: Int = 2,
)

@Serializable
data class MoodWeightsConfig(
    val punctualityWeight: Double = 0.45,
    val consistencyWeight: Double = 0.35,
    val focusWeight: Double = 0.20,
    val radiantThreshold: Double = 85.0,
    val happyThreshold: Double = 70.0,
    val calmThreshold: Double = 50.0,
    val sleepyThreshold: Double = 30.0,
)

/**
 * Configuracao versionada de Economia e Humor carregada de JSON (AD-10 · Secao 18 e Secao 19).
 * Nenhum numero magico de jogo fica fixo nas regras.
 */
@Serializable
data class EconomyConfig(
    val version: Int = 1,
    val taskBaseRewards: Map<EffortLevel, Long> = mapOf(
        EffortLevel.P to 5L,
        EffortLevel.M to 10L,
        EffortLevel.G to 20L,
    ),
    val maxPaidSmallTasksPerDay: Int = 10,
    val diminishingReturnsStartItemIndex: Int = 12,
    val diminishingReturnsMultiplier: Double = 0.5,
    val retroactiveCheckInMultiplier: Double = 0.5,
    val punctualityMultipliers: Map<DelayTier, Double> = mapOf(
        DelayTier.ADIANTADO to 1.2,
        DelayTier.NO_PRAZO to 1.0,
        DelayTier.ATRASADO_LEVE to 0.6,
        DelayTier.ATRASADO_FORTE to 0.3,
        DelayTier.PERDIDO to 0.0,
    ),
    val habitBaseReward: Long = 8L,
    val habitStreakStepBonus: Double = 0.02,
    val habitStreakMaxMultiplier: Double = 1.5,
    val maxOvercomingBonusFish: Long = 15L,
    val overcomingReferenceMinutes: Double = 15.0,
    val dayCloseRewards: Map<DayCloseTier, Long> = mapOf(
        DayCloseTier.NENHUM to 0L,
        DayCloseTier.BRONZE to 10L,
        DayCloseTier.PRATA to 20L,
        DayCloseTier.OURO to 35L,
    ),
    val dayCloseThresholds: DayCloseThresholdsConfig = DayCloseThresholdsConfig(),
    val recoveryDayEveningMinItems: Int = 2,
    val screenTimeWithinGoalReward: Long = 10L,
    val weeklyChest: WeeklyChestConfig = WeeklyChestConfig(),
    val goldenYarnMilestones: GoldenYarnMilestonesConfig = GoldenYarnMilestonesConfig(),
    val storeReferencePrices: StoreReferencePricesConfig = StoreReferencePricesConfig(),
    val moodWeights: MoodWeightsConfig = MoodWeightsConfig(),
) {
    companion object {
        private val json = Json { ignoreUnknownKeys = true }

        fun fromJsonString(rawJson: String): EconomyConfig =
            json.decodeFromString(serializer(), rawJson)

        fun loadBundled(): EconomyConfig {
            val stream = EconomyConfig::class.java.classLoader
                ?.getResourceAsStream("config/economia.json")
                ?: return EconomyConfig()
            val text = stream.bufferedReader(Charsets.UTF_8).use { it.readText() }
            return fromJsonString(text)
        }
    }
}
