package com.deadline.core.domain.engine

import com.deadline.core.domain.model.CatMood
import com.deadline.core.domain.model.CatTemperament
import com.deadline.core.domain.model.ConversationMode
import com.deadline.core.domain.model.RoutineCategory
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class PersonaAndSafetyEngineTest {

    private val personaBuilder = PersonaBuilder()
    private val safetyLayer = SafetyLayer()

    @Test
    fun `PersonaBuilder seleciona a variante correta por gatilho conforme tabela da Secao 21`() {
        // 1. Modo desabafo -> Escuta
        assertEquals(
            PersonaVariant.ESCUTA,
            personaBuilder.selectVariant(PersonaContextInput(mode = ConversationMode.DESABAFO)),
        )

        // 2. Fechamento do dia -> Comemoracao ou balanco
        assertEquals(
            PersonaVariant.COMEMORACAO_BALANCO,
            personaBuilder.selectVariant(PersonaContextInput(isDayClosingMoment = true)),
        )

        // 3. Prazo em menos de 2 horas -> Capita Novelo
        assertEquals(
            PersonaVariant.CAPITA_NOVELO,
            personaBuilder.selectVariant(PersonaContextInput(hasDeadlineUnderTwoHours = true)),
        )

        // 4. Meta ou area ativa -> Coach da area
        assertEquals(
            PersonaVariant.COACH_DA_AREA,
            personaBuilder.selectVariant(PersonaContextInput(activeAreaOrGoalCategory = RoutineCategory.ESTUDAR_LER)),
        )

        // 5. Variantes por humor (Festeira, Parceira, Preguicosa, Colinho)
        assertEquals(
            PersonaVariant.FESTEIRA,
            personaBuilder.selectVariant(PersonaContextInput(mood = CatMood.RADIANTE)),
        )
        assertEquals(
            PersonaVariant.PARCEIRA,
            personaBuilder.selectVariant(PersonaContextInput(mood = CatMood.FELIZ)),
        )
        assertEquals(
            PersonaVariant.PREGUICOSA,
            personaBuilder.selectVariant(PersonaContextInput(mood = CatMood.SONOLENTA)),
        )
        assertEquals(
            PersonaVariant.COLINHO,
            personaBuilder.selectVariant(PersonaContextInput(mood = CatMood.MANHOSA)),
        )
    }

    @Test
    fun `PersonaBuilder inclui resumo de estado JSON somente com permissao da usuaria e nunca no modo desabafo`() {
        val stateSummary = AppStateSummaryForLlm(
            catName = "Mimi",
            mood = CatMood.FELIZ,
            completedTodayCount = 3,
            pendingTodayCount = 2,
            medianDelayMinutes7Days = 4,
        )

        val withoutPermission = personaBuilder.buildPrompt(
            PersonaContextInput(
                allowSendingAppStateSummary = false,
                appStateSummary = stateSummary,
            )
        )
        assertNull(withoutPermission.block2StateSummaryJson)
        assertFalse(withoutPermission.fullSystemPrompt.contains("completedTodayCount"))

        val withPermission = personaBuilder.buildPrompt(
            PersonaContextInput(
                allowSendingAppStateSummary = true,
                appStateSummary = stateSummary,
                temperament = CatTemperament.ENGRACADA,
            )
        )
        assertNotNull(withPermission.block2StateSummaryJson)
        assertTrue(withPermission.fullSystemPrompt.contains("completedTodayCount"))

        // Mesmo com permissao ligada, o modo DESABAFO jamais envia dados de tarefas (Secao 21)
        val inVentingMode = personaBuilder.buildPrompt(
            PersonaContextInput(
                mode = ConversationMode.DESABAFO,
                allowSendingAppStateSummary = true,
                appStateSummary = stateSummary,
            )
        )
        assertNull(inVentingMode.block2StateSummaryJson)
        assertFalse(inVentingMode.fullSystemPrompt.contains("completedTodayCount"))
    }

    @Test
    fun `SafetyLayer detecta palavras-chave de sofrimento e retorna mensagem fora do tom de brincadeira com CVV 188 e SAMU 192`() {
        val normalMsg = safetyLayer.evaluateUserMessage("Mamãe atrasou 10 minutinhos no estudo hoje")
        assertFalse(normalMsg.isDistressDetected)
        assertNull(normalMsg.immediateSupportResponsePtBr)

        val distressMsg = safetyLayer.evaluateUserMessage("Estou tão cansada, acho que quero sumir e acabar com tudo")
        assertTrue(distressMsg.isDistressDetected)
        val response = distressMsg.immediateSupportResponsePtBr ?: ""
        assertTrue(response.contains("188"))
        assertTrue(response.contains("192"))
        assertFalse("Nao deve conter miado de brincadeira na resposta de crise", response.lowercase().contains("miau"))
    }
}
