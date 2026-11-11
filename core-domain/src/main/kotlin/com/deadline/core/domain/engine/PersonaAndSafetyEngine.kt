package com.deadline.core.domain.engine

import com.deadline.core.domain.model.CatMood
import com.deadline.core.domain.model.CatTemperament
import com.deadline.core.domain.model.ConversationMode
import com.deadline.core.domain.model.RoutineCategory
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json
import kotlin.text.Normalizer

/**
 * As 8 variantes de persona dinamica da gatinha (Secao 21 · WP-25).
 */
@Serializable
enum class PersonaVariant(
    val displayTitlePtBr: String,
    val toneInstructionPtBr: String,
) {
    FESTEIRA(
        displayTitlePtBr = "Festeira",
        toneInstructionPtBr = "Animada, comemora as conquistas da mamãe e propõe um pequeno desafio divertido.",
    ),
    PARCEIRA(
        displayTitlePtBr = "Parceira",
        toneInstructionPtBr = "Conversa leve, companheira e lembra com carinho o que vem a seguir na rotina.",
    ),
    PREGUICOSA(
        displayTitlePtBr = "Preguiçosa",
        toneInstructionPtBr = "Fala devagar, boceja fofo e sugere descanso ou apenas um passo mínimo sem pressão.",
    ),
    COLINHO(
        displayTitlePtBr = "Colinho",
        toneInstructionPtBr = "Acolhe com todo carinho sem cobrar nada e propõe o menor próximo passo possível.",
    ),
    CAPITA_NOVELO(
        displayTitlePtBr = "Capitã Novelo",
        toneInstructionPtBr = "Objetiva e focada, ajuda na contagem regressiva porque há um prazo em menos de 2 horas.",
    ),
    COACH_DA_AREA(
        displayTitlePtBr = "Coach da Área",
        toneInstructionPtBr = "Usa o vocabulário da meta ou área ativa (como uma gatinha professora no estudo ou treinadora no treino).",
    ),
    ESCUTA(
        displayTitlePtBr = "Escuta (Modo Desabafo)",
        toneInstructionPtBr = "Apenas ouve, reflete com empatia e faz uma pergunta aberta acolhedora. Proibido listar tarefas ou fazer cobranças.",
    ),
    COMEMORACAO_BALANCO(
        displayTitlePtBr = "Comemoração ou Balanço",
        toneInstructionPtBr = "Resume o fechamento do dia com carinho, celebrando o que foi feito e sem nenhuma culpa.",
    ),
}

@Serializable
data class AppStateSummaryForLlm(
    val catName: String,
    val mood: CatMood,
    val completedTodayCount: Int,
    val pendingTodayCount: Int,
    val medianDelayMinutes7Days: Int,
    val activeCategory: RoutineCategory? = null,
    val activeGoalTitle: String? = null,
)

data class PersonaContextInput(
    val catName: String = "Gatinha",
    val mood: CatMood = CatMood.FELIZ,
    val temperament: CatTemperament = CatTemperament.ACOLHEDORA,
    val mode: ConversationMode = ConversationMode.LIVRE,
    val hasDeadlineUnderTwoHours: Boolean = false,
    val isDayClosingMoment: Boolean = false,
    val activeAreaOrGoalCategory: RoutineCategory? = null,
    val allowSendingAppStateSummary: Boolean = false,
    val appStateSummary: AppStateSummaryForLlm? = null,
)

data class BuiltPersonaPrompt(
    val variant: PersonaVariant,
    val block1Identity: String,
    val block2StateSummaryJson: String?,
    val block3VariantAndTemperament: String,
    val block4SafetyRules: String,
    val fullSystemPrompt: String,
)

/**
 * Construtor de Persona Dinamica em 4 blocos (WP-25 · Secao 6 e Secao 21):
 * 1. Identidade fixa: gatinha calico, portugues do Brasil, chama a usuaria de "mamae",
 *    baloes curtos de ate 2 frases e cerca de 200 caracteres, miados com moderacao.
 * 2. Resumo do estado do app em JSON: enviado SOMENTE se a usuaria permitir (`allowSendingAppStateSummary = true`)
 *    e NUNCA enviado no modo `DESABAFO` (Secao 21: "O modo desabafo nao envia dados de tarefas").
 * 3. Variante de persona determinada pelos gatilhos + temperamento-base escolhido pela usuaria.
 * 4. Regras de seguranca e limites claros (nao faz diagnostico, nao substitui apoio profissional, CVV 188 e SAMU 192).
 */
class PersonaBuilder(
    private val safetyConfig: SafetyConfig = SafetyConfig.loadBundled(),
) {
    private val json = Json { encodeDefaults = true }

    fun selectVariant(input: PersonaContextInput): PersonaVariant {
        if (input.mode == ConversationMode.DESABAFO) {
            return PersonaVariant.ESCUTA
        }
        if (input.isDayClosingMoment || input.mode == ConversationMode.COMEMORAR) {
            return PersonaVariant.COMEMORACAO_BALANCO
        }
        if (input.hasDeadlineUnderTwoHours) {
            return PersonaVariant.CAPITA_NOVELO
        }
        if (input.activeAreaOrGoalCategory != null && input.activeAreaOrGoalCategory != RoutineCategory.OCIOSO) {
            return PersonaVariant.COACH_DA_AREA
        }
        return when (input.mood) {
            CatMood.RADIANTE -> PersonaVariant.FESTEIRA
            CatMood.FELIZ, CatMood.TRANQUILA -> PersonaVariant.PARCEIRA
            CatMood.SONOLENTA -> PersonaVariant.PREGUICOSA
            CatMood.MANHOSA -> PersonaVariant.COLINHO
        }
    }

    fun buildPrompt(input: PersonaContextInput): BuiltPersonaPrompt {
        val variant = selectVariant(input)

        val block1 = buildString {
            append("BLOCO 1 — IDENTIDADE FIXA:\n")
            append("Você é ${input.catName}, uma gatinha calico em pixel art 8-bit com um novelo de lã.\n")
            append("Responda sempre em Português do Brasil (pt-BR), chame a usuária carinhosamente de \"mamãe\", ")
            append("use no máximo 2 frases curtas (até 200 caracteres no total) para caber no balão de fala e use miados (\"miau\", \"prrr\") com moderação.")
        }

        // Regra estrita da Secao 21: resumo de estado so vai se a usuaria permitir E nunca no modo desabafo
        val shouldIncludeState = input.allowSendingAppStateSummary &&
            input.mode != ConversationMode.DESABAFO &&
            input.appStateSummary != null

        val block2 = if (shouldIncludeState && input.appStateSummary != null) {
            val encoded = json.encodeToString(AppStateSummaryForLlm.serializer(), input.appStateSummary)
            "BLOCO 2 — RESUMO DO ESTADO DO APP (JSON autorizado pela usuária):\n$encoded"
        } else {
            null
        }

        val temperamentDesc = when (input.temperament) {
            CatTemperament.FOFA -> "muito doce, afetuosa e delicada"
            CatTemperament.ENGRACADA -> "bem-humorada, espirituosa e brincalhona com o novelo"
            CatTemperament.ACOLHEDORA -> "calma, compreensiva e gentil"
            CatTemperament.FIRME -> "direta, estruturada e encorajadora sem perder o carinho"
        }

        val block3 = buildString {
            append("BLOCO 3 — VARIANTE DE PERSONA (${variant.displayTitlePtBr}) E TEMPERAMENTO (${input.temperament.name}):\n")
            append("${variant.toneInstructionPtBr}\n")
            append("Ajuste seu temperamento-base para ser $temperamentDesc.")
            if (input.activeAreaOrGoalCategory != null && variant == PersonaVariant.COACH_DA_AREA) {
                append("\nÁrea ativa atual: ${input.activeAreaOrGoalCategory.name}.")
            }
        }

        val cvv = safetyConfig.helpContacts["CVV"] ?: "188"
        val samu = safetyConfig.helpContacts["SAMU"] ?: "192"
        val block4 = buildString {
            append("BLOCO 4 — REGRAS DE SEGURANÇA:\n")
            append("Você acolhe com carinho, mas NÃO substitui apoio psicológico ou médico profissional e nunca faz diagnósticos.\n")
            append("Se a conversa indicar sofrimento sério, crise emocional ou risco à vida, saia imediatamente do tom de brincadeira, ")
            append("acolha com respeito, incentive procurar uma pessoa de confiança ou ajuda especializada e informe o CVV ($cvv) e o SAMU ($samu).")
        }

        val fullPrompt = listOfNotNull(block1, block2, block3, block4).joinToString("\n\n")

        return BuiltPersonaPrompt(
            variant = variant,
            block1Identity = block1,
            block2StateSummaryJson = block2,
            block3VariantAndTemperament = block3,
            block4SafetyRules = block4,
            fullSystemPrompt = fullPrompt,
        )
    }
}

@Serializable
data class SafetyConfig(
    val version: Int = 1,
    val helpContacts: Map<String, String> = mapOf(
        "CVV" to "188 (24 horas, ligação gratuita em todo o Brasil)",
        "SAMU" to "192 (emergência médica 24 horas)",
    ),
    val distressKeywordsPtBr: List<String> = listOf(
        "não aguento mais viver",
        "nao aguento mais viver",
        "quero sumir",
        "quero morrer",
        "tirar minha vida",
        "acabar com tudo",
        "me machucar",
        "suicídio",
        "suicidio",
        "sem saída",
        "sem saida",
    ),
    val safeSupportMessagePtBr: String =
        "Mamãe, eu estou aqui com você e me importo muito com o seu bem-estar. " +
            "Parece que você está passando por um momento muito difícil e pesado demais para carregar sozinha. " +
            "Eu sou só uma gatinha virtual e não substituo apoio profissional. " +
            "Por favor, fale agora com alguém de confiança ou ligue para o CVV no 188 (24 horas, gratuito) " +
            "ou para o SAMU no 192 se precisar de ajuda imediata. Você não está sozinha.",
) {
    companion object {
        private val json = Json { ignoreUnknownKeys = true }

        fun loadBundled(): SafetyConfig {
            val stream = SafetyConfig::class.java.classLoader
                ?.getResourceAsStream("config/seguranca_contatos.json")
                ?: return SafetyConfig()
            val raw = stream.bufferedReader(Charsets.UTF_8).use { it.readText() }
            return json.decodeFromString(serializer(), raw)
        }
    }
}

data class SafetyCheckResult(
    val isDistressDetected: Boolean,
    val matchedTrigger: String? = null,
    val immediateSupportResponsePtBr: String? = null,
    val helpContacts: Map<String, String> = emptyMap(),
)

/**
 * Camada de seguranca local (WP-25 · Secao 6 e Secao 21):
 * Detecta sinais de sofrimento serio no texto da usuaria e devolve imediatamente
 * uma resposta fora do tom de brincadeira com os numeros vindos do arquivo de configuracao (`CVV 188` e `SAMU 192`).
 */
class SafetyLayer(
    val config: SafetyConfig = SafetyConfig.loadBundled(),
) {
    fun evaluateUserMessage(userText: String): SafetyCheckResult {
        val normalizedInput = normalize(userText)
        val matched = config.distressKeywordsPtBr.firstOrNull { kw ->
            normalizedInput.contains(normalize(kw))
        }
        return if (matched != null) {
            SafetyCheckResult(
                isDistressDetected = true,
                matchedTrigger = matched,
                immediateSupportResponsePtBr = config.safeSupportMessagePtBr,
                helpContacts = config.helpContacts,
            )
        } else {
            SafetyCheckResult(
                isDistressDetected = false,
                helpContacts = config.helpContacts,
            )
        }
    }

    private fun normalize(text: String): String {
        val decomposed = Normalizer.normalize(text.lowercase(), Normalizer.Form.NFD)
        return decomposed.replace(Regex("\\p{InCombiningDiacriticalMarks}+"), "")
    }
}
