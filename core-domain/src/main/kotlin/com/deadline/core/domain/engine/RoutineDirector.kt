package com.deadline.core.domain.engine

import com.deadline.core.domain.model.CatMood
import com.deadline.core.domain.model.Occurrence
import com.deadline.core.domain.model.OccurrenceState
import com.deadline.core.domain.model.RoutineCategory
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json
import java.time.Instant
import java.time.LocalDate
import kotlin.random.Random

@Serializable
data class RoutineStationMapping(
    val category: RoutineCategory,
    val animationTag: String,
    val stationId: String,
    val virtualX: Int,
    val virtualY: Int,
)

@Serializable
data class RoutineDirectorConfig(
    val version: Int = 1,
    val stations: List<RoutineStationMapping> = defaultStations(),
    val freeBehaviorWeightsByMood: Map<CatMood, Map<String, Int>> = defaultFreeBehaviorWeights(),
) {
    fun stationFor(category: RoutineCategory): RoutineStationMapping =
        stations.firstOrNull { it.category == category }
            ?: RoutineStationMapping(RoutineCategory.OCIOSO, "ociosa", "tapete_central", 90, 230)

    companion object {
        private val json = Json { ignoreUnknownKeys = true }

        fun loadBundled(): RoutineDirectorConfig {
            val stream = RoutineDirectorConfig::class.java.classLoader
                ?.getResourceAsStream("config/rotina_estacoes.json")
                ?: return RoutineDirectorConfig()
            val raw = stream.bufferedReader(Charsets.UTF_8).use { it.readText() }
            return json.decodeFromString(serializer(), raw)
        }

        fun defaultStations(): List<RoutineStationMapping> = listOf(
            RoutineStationMapping(RoutineCategory.ESTUDAR_LER, "estudar_ler", "estante_livros", 40, 140),
            RoutineStationMapping(RoutineCategory.TRABALHAR, "trabalhar", "escrivaninha_notebook", 135, 140),
            RoutineStationMapping(RoutineCategory.TREINAR, "treinar", "tapete_treino", 45, 250),
            RoutineStationMapping(RoutineCategory.COMER, "comer", "tigelinha_racao", 140, 220),
            RoutineStationMapping(RoutineCategory.HIGIENE, "higiene", "cantinho_banho", 35, 195),
            RoutineStationMapping(RoutineCategory.LAZER, "lazer", "tv_videogame", 90, 200),
            RoutineStationMapping(RoutineCategory.DORMIR, "dormir", "caminha_gatinha", 140, 300),
            RoutineStationMapping(RoutineCategory.CUIDAR_CASA, "cuidar_casa", "centro_comodo", 90, 260),
            RoutineStationMapping(RoutineCategory.SAIR, "sair", "tapete_porta", 90, 355),
            RoutineStationMapping(RoutineCategory.OCIOSO, "ociosa", "tapete_central", 90, 230),
        )

        fun defaultFreeBehaviorWeights(): Map<CatMood, Map<String, Int>> = mapOf(
            CatMood.RADIANTE to mapOf("brincar_novelo" to 40, "feliz" to 30, "andar" to 20, "ociosa" to 10),
            CatMood.FELIZ to mapOf("brincar_novelo" to 30, "feliz" to 30, "lamber_se" to 20, "ociosa" to 20),
            CatMood.TRANQUILA to mapOf("ociosa" to 35, "lamber_se" to 30, "espreguicar" to 20, "andar" to 15),
            CatMood.SONOLENTA to mapOf("sonolenta" to 45, "dormir" to 30, "espreguicar" to 15, "ociosa" to 10),
            CatMood.MANHOSA to mapOf("manhosa" to 55, "ronronar" to 20, "ociosa" to 25),
        )
    }
}

enum class RoutinePriorityReason {
    COMPROMISSO_EM_ANDAMENTO,
    INICIO_PASSOU_SEM_CHECKIN,
    TUDO_DO_DIA_FEITO,
    COMPORTAMENTO_LIVRE,
}

data class RoutineDecision(
    val reason: RoutinePriorityReason,
    val animationTag: String,
    val stationId: String,
    val virtualX: Int,
    val virtualY: Int,
    val activeOccurrenceTitle: String? = null,
)

/**
 * Diretor de rotina em Kotlin puro (WP-17 · Secao 6 e Secao 20):
 * A cada minuto escolhe o que a gatinha faz, exatamente por esta ordem de prioridade:
 * 1. Ha compromisso em andamento (`plannedStart <= now < deadline` e estado `PENDENTE`, ou janela ativa):
 *    faz a animacao da categoria na estacao certa do cenario.
 * 2. O inicio planejado (ou prazo) passou sem check-in: olha o relogio (`olhar_relogio`).
 * 3. Tudo do dia esta feito (pelo menos 1 item planejado no dia e todos `FEITO`): comemora (`comemorar`).
 * 4. Nada a fazer: comportamentos livres, sorteados com peso pelo humor e com semente do dia + minuto,
 *    para parecer viva sem ser caotica e garantindo determinismo em testes com a mesma semente.
 */
class RoutineDirector(
    val config: RoutineDirectorConfig = RoutineDirectorConfig.loadBundled(),
) {

    fun decide(
        occurrencesToday: List<Occurrence>,
        mood: CatMood,
        now: Instant,
        dayKey: LocalDate,
        minuteSlotSeedOffset: Long = now.epochSecond / 60L,
    ): RoutineDecision {
        val activeOccurrences = occurrencesToday.filter { it.state != OccurrenceState.PULADO }
        val pendingOccurrences = activeOccurrences.filter { it.state == OccurrenceState.PENDENTE }

        // 1. Compromisso em andamento (plannedStart <= now <= deadline)
        val ongoing = pendingOccurrences.firstOrNull { occ ->
            val start = occ.plannedStart
            start != null && !now.isBefore(start) && !now.isAfter(occ.deadline)
        }
        if (ongoing != null) {
            val station = config.stationFor(ongoing.category)
            return RoutineDecision(
                reason = RoutinePriorityReason.COMPROMISSO_EM_ANDAMENTO,
                animationTag = station.animationTag,
                stationId = station.stationId,
                virtualX = station.virtualX,
                virtualY = station.virtualY,
                activeOccurrenceTitle = ongoing.title,
            )
        }

        // 2. O inicio planejado (ou prazo) ja passou sem check-in -> olha o relogio
        val overdueOrStartedWithoutCheckIn = pendingOccurrences.firstOrNull { occ ->
            val trigger = occ.plannedStart ?: occ.deadline
            now.isAfter(trigger)
        }
        if (overdueOrStartedWithoutCheckIn != null) {
            val station = config.stationFor(overdueOrStartedWithoutCheckIn.category)
            return RoutineDecision(
                reason = RoutinePriorityReason.INICIO_PASSOU_SEM_CHECKIN,
                animationTag = "olhar_relogio",
                stationId = station.stationId,
                virtualX = station.virtualX,
                virtualY = station.virtualY,
                activeOccurrenceTitle = overdueOrStartedWithoutCheckIn.title,
            )
        }

        // 3. Tudo do dia esta feito -> comemora
        if (activeOccurrences.isNotEmpty() && activeOccurrences.all { it.state == OccurrenceState.FEITO }) {
            val center = config.stationFor(RoutineCategory.OCIOSO)
            return RoutineDecision(
                reason = RoutinePriorityReason.TUDO_DO_DIA_FEITO,
                animationTag = "comemorar",
                stationId = center.stationId,
                virtualX = center.virtualX,
                virtualY = center.virtualY,
            )
        }

        // 4. Nada a fazer -> comportamento livre sorteado com peso pelo humor e semente deterministica
        val combinedSeed = (dayKey.toEpochDay() * 31_536_000L) xor minuteSlotSeedOffset
        val chosenAnimation = pickWeightedAnimation(mood, combinedSeed)
        val stationCategory = when (chosenAnimation) {
            "dormir", "sonolenta" -> RoutineCategory.DORMIR
            else -> RoutineCategory.OCIOSO
        }
        val station = config.stationFor(stationCategory)

        return RoutineDecision(
            reason = RoutinePriorityReason.COMPORTAMENTO_LIVRE,
            animationTag = chosenAnimation,
            stationId = station.stationId,
            virtualX = station.virtualX,
            virtualY = station.virtualY,
        )
    }

    private fun pickWeightedAnimation(mood: CatMood, seed: Long): String {
        val weights = config.freeBehaviorWeightsByMood[mood].orEmpty()
        if (weights.isEmpty()) return "ociosa"

        val totalWeight = weights.values.sum().coerceAtLeast(1)
        val roll = Random(seed).nextInt(totalWeight)
        var cumulative = 0
        for ((anim, weight) in weights) {
            cumulative += weight
            if (roll < cumulative) return anim
        }
        return weights.keys.first()
    }
}
