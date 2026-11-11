package com.deadline.core.domain.config

import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json

@Serializable
data class DayBoundaryConfig(
    val logicalDayStartHour: Int = 4,
) {
    init {
        require(logicalDayStartHour in 0..23) {
            "logicalDayStartHour deve estar entre 0 e 23"
        }
    }
}

@Serializable
data class PunctualityConfig(
    val toleranceMinutes: Int = 10,
) {
    init {
        require(toleranceMinutes >= 0) {
            "toleranceMinutes não pode ser negativo"
        }
    }
}

@Serializable
data class WeekConfig(
    val closesOn: String = "sunday",
) {
    init {
        val validDays = setOf("sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday")
        require(closesOn.lowercase() in validDays) {
            "closesOn deve ser um dia da semana válido (ex: sunday)"
        }
    }
}

@Serializable
data class RewardFishBond(
    val fish: Long = 0L,
    val bond: Long = 0L,
) {
    init {
        require(fish >= 0L) { "fish não pode ser negativo" }
        require(bond >= 0L) { "bond não pode ser negativo" }
    }
}

@Serializable
data class RewardsConfig(
    val commitmentDone: RewardFishBond = RewardFishBond(fish = 2L),
    val onTimeBonus: RewardFishBond = RewardFishBond(fish = 1L),
    val stepDone: RewardFishBond = RewardFishBond(fish = 3L),
    val goalDone: RewardFishBond = RewardFishBond(fish = 20L, bond = 5L),
    val dayClosure: RewardFishBond = RewardFishBond(bond = 1L),
    val retroactiveMultiplier: Double = 0.5,
) {
    init {
        require(retroactiveMultiplier in 0.0..1.0) {
            "retroactiveMultiplier deve estar entre 0.0 e 1.0"
        }
    }
}

@Serializable
data class CapsConfig(
    val fishPerLogicalDay: Long = 15L,
    val socialMinutesEarnedPerDay: Long = 30L,
    val minCommitmentMinutesToReward: Int = 5,
) {
    init {
        require(fishPerLogicalDay >= 0L) { "fishPerLogicalDay não pode ser negativo" }
        require(socialMinutesEarnedPerDay >= 0L) { "socialMinutesEarnedPerDay não pode ser negativo" }
        require(minCommitmentMinutesToReward >= 0) { "minCommitmentMinutesToReward não pode ser negativo" }
    }
}

/**
 * Configuração declarativa versionada de compromissos, pontualidade, recompensas e tetos (v3.2.0 · AD-10).
 * Nenhum número mágico fica fixo no código.
 */
@Serializable
data class CommitmentsConfig(
    val version: Int = 1,
    val dayBoundary: DayBoundaryConfig = DayBoundaryConfig(),
    val punctuality: PunctualityConfig = PunctualityConfig(),
    val week: WeekConfig = WeekConfig(),
    val undoWindowMinutes: Int = 10,
    val rewards: RewardsConfig = RewardsConfig(),
    val caps: CapsConfig = CapsConfig(),
) {
    init {
        require(version > 0) { "version deve ser positivo" }
        require(undoWindowMinutes >= 0) { "undoWindowMinutes não pode ser negativo" }
    }

    companion object {
        private val json = Json { ignoreUnknownKeys = true }

        fun fromJsonString(rawJson: String): CommitmentsConfig =
            json.decodeFromString(serializer(), rawJson)

        fun loadBundled(): CommitmentsConfig {
            val stream = CommitmentsConfig::class.java.classLoader
                ?.getResourceAsStream("config/commitments.v1.json")
                ?: return CommitmentsConfig()
            val text = stream.bufferedReader(Charsets.UTF_8).use { it.readText() }
            return fromJsonString(text)
        }
    }
}
