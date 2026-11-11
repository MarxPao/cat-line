package com.deadline.core.data.config

import android.content.Context
import com.deadline.core.domain.config.CommitmentsConfig
import com.deadline.core.domain.config.EconomyConfig
import com.deadline.core.domain.model.CatMood
import com.deadline.core.domain.model.RoutineCategory
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json
import javax.inject.Inject
import javax.inject.Singleton

@Serializable
data class RoutineStationConfig(
    val category: RoutineCategory,
    val animationTag: String,
    val stationId: String,
    val virtualX: Int,
    val virtualY: Int,
)

@Serializable
data class RoutineCatalogConfig(
    val version: Int = 1,
    val stations: List<RoutineStationConfig> = defaultStations(),
) {
    companion object {
        fun defaultStations(): List<RoutineStationConfig> = listOf(
            RoutineStationConfig(RoutineCategory.ESTUDAR_LER, "estudar_ler", "estante_livros", 40, 140),
            RoutineStationConfig(RoutineCategory.TRABALHAR, "trabalhar", "escrivaninha_notebook", 135, 140),
            RoutineStationConfig(RoutineCategory.TREINAR, "treinar", "tapete_treino", 45, 250),
            RoutineStationConfig(RoutineCategory.COMER, "comer", "tigelinha_racao", 140, 220),
            RoutineStationConfig(RoutineCategory.HIGIENE, "higiene", "cantinho_banho", 35, 195),
            RoutineStationConfig(RoutineCategory.LAZER, "lazer", "tv_videogame", 90, 200),
            RoutineStationConfig(RoutineCategory.DORMIR, "dormir", "caminha_gatinha", 140, 300),
            RoutineStationConfig(RoutineCategory.CUIDAR_CASA, "cuidar_casa", "centro_comodo", 90, 260),
            RoutineStationConfig(RoutineCategory.SAIR, "sair", "tapete_porta", 90, 355),
            RoutineStationConfig(RoutineCategory.OCIOSO, "ociosa", "tapete_central", 90, 230),
        )
    }
}

@Serializable
data class FallbackSpeechConfig(
    val version: Int = 1,
    val byMood: Map<CatMood, List<String>> = mapOf(
        CatMood.RADIANTE to listOf(
            "Miau, mamãe! Hoje estamos voando! Qual é o próximo desafio?",
            "Prrr! O novelo está super enroladinho hoje, que orgulho de você!",
        ),
        CatMood.FELIZ to listOf(
            "Miau!Estou aqui do seu lado, mamãe. Vamos ver o que vem a seguir?",
            "Ronrom... você está indo muito bem hoje!",
        ),
        CatMood.TRANQUILA to listOf(
            "Miau, mamãe. Um passinho de cada vez já puxa o nosso fio.",
            "Estou quietinha aqui no tapete esperando você marcar o próximo item.",
        ),
        CatMood.SONOLENTA to listOf(
            "Miaaau... *bocejo*... se estiver cansada, que tal escolher só uma coisinha bem pequenininha?",
            "Vamos devagarinho hoje, mamãe. Descansar também faz parte.",
        ),
        CatMood.MANHOSA to listOf(
            "Miau, mamãe... vem cá me fazer um carinho? Sem cobrança, só o menor passinho quando você quiser.",
            "Estou manhosinha aqui no seu colo. Qualquer coisinha que você fizer já me deixa feliz.",
        ),
    ),
    val safetyHelpContacts: Map<String, String> = mapOf(
        "CVV" to "188 (24 horas, ligação gratuita)",
        "SAMU" to "192 (emergência médica)",
    ),
)

/**
 * Carregador de arquivos JSON versionados de configuracao de jogo (AD-10 · WP-05).
 */
@Singleton
class JsonGameConfigLoader @Inject constructor(
    @ApplicationContext private val context: Context,
) {
    private val json = Json { ignoreUnknownKeys = true }

    fun loadEconomyConfig(): EconomyConfig {
        val raw = readAssetOrNull("config/economia.json")
        return if (raw != null) {
            EconomyConfig.fromJsonString(raw)
        } else {
            EconomyConfig.loadBundled()
        }
    }

    fun loadRoutineCatalogConfig(): RoutineCatalogConfig {
        val raw = readAssetOrNull("config/rotina_estacoes.json") ?: return RoutineCatalogConfig()
        return json.decodeFromString(RoutineCatalogConfig.serializer(), raw)
    }

    fun loadFallbackSpeechConfig(): FallbackSpeechConfig {
        val raw = readAssetOrNull("config/falas_reserva.json") ?: return FallbackSpeechConfig()
        return json.decodeFromString(FallbackSpeechConfig.serializer(), raw)
    }

    fun loadCommitmentsConfig(): CommitmentsConfig {
        val raw = readAssetOrNull("config/commitments.v1.json")
        return if (raw != null) {
            CommitmentsConfig.fromJsonString(raw)
        } else {
            CommitmentsConfig.loadBundled()
        }
    }

    private fun readAssetOrNull(assetPath: String): String? =
        runCatching {
            context.assets.open(assetPath).bufferedReader(Charsets.UTF_8).use { it.readText() }
        }.getOrNull()
}
