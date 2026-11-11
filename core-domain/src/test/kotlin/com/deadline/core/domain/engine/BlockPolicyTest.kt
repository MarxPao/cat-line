package com.deadline.core.domain.engine

import com.deadline.core.domain.model.CommitmentId
import com.deadline.core.domain.model.CommitmentType
import com.deadline.core.domain.model.EffortLevel
import com.deadline.core.domain.model.Occurrence
import com.deadline.core.domain.model.OccurrenceId
import com.deadline.core.domain.model.OccurrenceState
import com.deadline.core.domain.model.RigorLevel
import com.deadline.core.domain.model.RoutineCategory
import com.deadline.core.domain.port.BlockDecision
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import java.time.Instant
import java.time.LocalDate
import java.time.LocalTime
import java.time.ZoneId
import java.time.ZonedDateTime

class BlockPolicyTest {

    private val policy = BlockPolicy()
    private val zone = ZoneId.of("America/Sao_Paulo")
    private val now = ZonedDateTime.of(2026, 10, 25, 15, 0, 0, 0, zone).toInstant()

    @Test
    fun `lista de excecoes protegida sempre vence mesmo com regra nivel 4 FIRME`() {
        val rules = mapOf(
            "com.whatsapp" to AppBlockRule(packageName = "com.whatsapp", rigor = RigorLevel.FIRME),
            "com.android.settings" to AppBlockRule(packageName = "com.android.settings", rigor = RigorLevel.FIRME),
            "com.deadline.app" to AppBlockRule(packageName = "com.deadline.app", rigor = RigorLevel.FIRME),
        )

        assertEquals(
            BlockDecision.Allow,
            policy.evaluateForegroundPackage("com.whatsapp", now, zone, rules, emptyList()),
        )
        assertEquals(
            BlockDecision.Allow,
            policy.evaluateForegroundPackage("com.android.settings", now, zone, rules, emptyList()),
        )
        assertEquals(
            BlockDecision.Allow,
            policy.evaluateForegroundPackage("com.deadline.app", now, zone, rules, emptyList()),
        )
    }

    @Test
    fun `sessao de desbloqueio ativa libera o app mas bloqueia assim que expira`() {
        val pkg = "com.instagram.android"
        val rules = mapOf(
            pkg to AppBlockRule(
                packageName = pkg,
                rigor = RigorLevel.CONDICIONAL,
                windowStart = LocalTime.of(8, 0),
                windowEnd = LocalTime.of(22, 0),
            )
        )
        val pendingOcc = Occurrence(
            id = OccurrenceId("o-1"),
            commitmentId = CommitmentId("c-1"),
            title = "Estudar 30 min",
            type = CommitmentType.TAREFA,
            effort = EffortLevel.M,
            category = RoutineCategory.ESTUDAR_LER,
            dayKey = LocalDate.of(2026, 10, 25),
            zoneId = zone,
            deadline = now.plusSeconds(3600),
            state = OccurrenceState.PENDENTE,
        )

        val session = ActiveUnlockSession(
            id = "sess-1",
            packageName = pkg,
            grantedAt = now.minusSeconds(60),
            expiresAt = now.plusSeconds(15 * 60),
            reason = "Tarefa concluída",
        )

        // Enquanto a sessao esta ativa -> Allow
        val duringSession = policy.evaluateForegroundPackage(
            foregroundPackage = pkg,
            now = now,
            zoneId = zone,
            rulesByPackage = rules,
            activeSessions = listOf(session),
            todayOccurrences = listOf(pendingOcc),
        )
        assertEquals(BlockDecision.Allow, duringSession)

        // Apos expirar (16 min depois) -> Block com saida garantida de 10s
        val afterExpiration = policy.evaluateForegroundPackage(
            foregroundPackage = pkg,
            now = now.plusSeconds(16 * 60),
            zoneId = zone,
            rulesByPackage = rules,
            activeSessions = listOf(session),
            todayOccurrences = listOf(pendingOcc),
        )
        assertTrue(afterExpiration is BlockDecision.Block)
        val block = afterExpiration as BlockDecision.Block
        assertEquals(10, block.emergencyHoldSeconds)
        assertEquals(listOf("Estudar 30 min"), block.pendingTaskTitles)
    }

    @Test
    fun `modo descanso suspende qualquer nivel de bloqueio`() {
        val pkg = "com.zhiliaoapp.musically"
        val rules = mapOf(pkg to AppBlockRule(packageName = pkg, rigor = RigorLevel.FIRME))

        val decision = policy.evaluateForegroundPackage(
            foregroundPackage = pkg,
            now = now,
            zoneId = zone,
            rulesByPackage = rules,
            activeSessions = emptyList(),
            isRestModeActive = true,
        )
        assertEquals(BlockDecision.Allow, decision)
    }

    @Test
    fun `presets de redes sociais contem instagram tiktok youtube e buscam corretamente`() {
        val instagram = BlockPolicy.findPresetForPackage("com.instagram.android")
        assertTrue(instagram != null)
        assertEquals("Instagram", instagram?.name)
        assertEquals("📸", instagram?.iconEmoji)

        val tiktok = BlockPolicy.findPresetForPackage("com.zhiliaoapp.musically")
        assertTrue(tiktok != null)
        assertEquals("TikTok", tiktok?.name)

        // WhatsApp nunca deve ser preset para bloqueio
        val whatsapp = BlockPolicy.findPresetForPackage("com.whatsapp")
        assertEquals(null, whatsapp)
    }
}
