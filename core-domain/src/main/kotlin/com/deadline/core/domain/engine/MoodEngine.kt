package com.deadline.core.domain.engine

import com.deadline.core.domain.config.MoodWeightsConfig
import com.deadline.core.domain.model.CatMood
import kotlin.math.roundToInt

data class MoodIndices(
    /** Indice de pontualidade dos ultimos 7 dias (0 a 100), com peso maior nos dias mais recentes. */
    val punctualityIndex: Double,
    /** Indice de constancia (habitos feitos sobre previstos, 0 a 100). */
    val consistencyIndex: Double,
    /** Indice de foco (tempo de tela nos apps escolhidos contra a meta, 0 a 100). */
    val focusIndex: Double,
) {
    init {
        require(punctualityIndex in 0.0..100.0) { "punctualityIndex deve estar entre 0 e 100" }
        require(consistencyIndex in 0.0..100.0) { "consistencyIndex deve estar entre 0 e 100" }
        require(focusIndex in 0.0..100.0) { "focusIndex deve estar entre 0 e 100" }
    }
}

data class MoodEvaluationResult(
    val previousMood: CatMood,
    val targetMoodUnclamped: CatMood,
    val nextMood: CatMood,
    val compositeScore: Double,
    val frozenByRestMode: Boolean,
)

/**
 * Motor de humor da gatinha em Kotlin puro (WP-07 · Secao 6 e Secao 18).
 *
 * Regras atendidas:
 * - Tres indices de 0 a 100: pontualidade (ultimos 7 dias com peso maior nos recentes),
 *   constancia (habitos feitos sobre previstos) e foco (tempo de tela contra a meta).
 * - Cinco estados: RADIANTE (rank 4), FELIZ (rank 3), TRANQUILA (rank 2), SONOLENTA (rank 1) e MANHOSA (rank 0).
 * - O humor muda no maximo 1 degrau por fechamento de dia, para um dia ruim nao derrubar a gatinha de uma vez.
 * - Nao existe estado pior que MANHOSA (piso = 0).
 * - O "modo descanso" congela o humor no estado atual.
 */
class MoodEngine(
    private val config: MoodWeightsConfig = MoodWeightsConfig(),
) {

    /**
     * Calcula o indice de pontualidade dos ultimos 7 dias (do mais antigo para o mais recente),
     * atribuindo pesos crescentes (1, 2, 3, 4, 5, 6, 7) aos dias mais recentes.
     */
    fun calculateWeightedPunctualityIndex(recentDailyScoresOldestFirst: List<Double>): Double {
        if (recentDailyScoresOldestFirst.isEmpty()) return 75.0
        val capped = recentDailyScoresOldestFirst.takeLast(7)
        var weightedSum = 0.0
        var totalWeight = 0.0
        capped.forEachIndexed { idx, score ->
            val weight = (idx + 1).toDouble()
            weightedSum += score.coerceIn(0.0, 100.0) * weight
            totalWeight += weight
        }
        return (weightedSum / totalWeight).coerceIn(0.0, 100.0)
    }

    fun evaluateDayClose(
        previousMood: CatMood,
        indices: MoodIndices,
        isRestModeActive: Boolean = false,
    ): MoodEvaluationResult {
        val totalWeight = config.punctualityWeight + config.consistencyWeight + config.focusWeight
        val composite = if (totalWeight <= 0.0) {
            0.0
        } else {
            (
                indices.punctualityIndex * config.punctualityWeight +
                    indices.consistencyIndex * config.consistencyWeight +
                    indices.focusIndex * config.focusWeight
                ) / totalWeight
        }.coerceIn(0.0, 100.0)

        val targetMood = scoreToMood(composite)

        if (isRestModeActive) {
            return MoodEvaluationResult(
                previousMood = previousMood,
                targetMoodUnclamped = targetMood,
                nextMood = previousMood,
                compositeScore = composite,
                frozenByRestMode = true,
            )
        }

        val rankDelta = (targetMood.rank - previousMood.rank).coerceIn(-1, 1)
        val clampedRank = (previousMood.rank + rankDelta).coerceIn(CatMood.MANHOSA.rank, CatMood.RADIANTE.rank)
        val nextMood = moodFromRank(clampedRank)

        return MoodEvaluationResult(
            previousMood = previousMood,
            targetMoodUnclamped = targetMood,
            nextMood = nextMood,
            compositeScore = (composite * 100.0).roundToInt() / 100.0,
            frozenByRestMode = false,
        )
    }

    fun scoreToMood(score: Double): CatMood = when {
        score >= config.radiantThreshold -> CatMood.RADIANTE
        score >= config.happyThreshold -> CatMood.FELIZ
        score >= config.calmThreshold -> CatMood.TRANQUILA
        score >= config.sleepyThreshold -> CatMood.SONOLENTA
        else -> CatMood.MANHOSA
    }

    private fun moodFromRank(rank: Int): CatMood =
        CatMood.entries.first { it.rank == rank }
}
