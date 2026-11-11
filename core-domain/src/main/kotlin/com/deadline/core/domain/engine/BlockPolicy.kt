package com.deadline.core.domain.engine

import com.deadline.core.domain.model.CommitmentId
import com.deadline.core.domain.model.Occurrence
import com.deadline.core.domain.model.OccurrenceState
import com.deadline.core.domain.model.RigorLevel
import com.deadline.core.domain.port.BlockDecision
import java.time.DayOfWeek
import java.time.Instant
import java.time.LocalTime
import java.time.ZoneId
import java.time.ZonedDateTime

data class AppBlockRule(
    val packageName: String,
    val appName: String = "",
    val iconEmoji: String = "📱",
    val rigor: RigorLevel = RigorLevel.AVISO,
    val activeDays: Set<DayOfWeek> = DayOfWeek.entries.toSet(),
    val windowStart: LocalTime = LocalTime.of(8, 0),
    val windowEnd: LocalTime = LocalTime.of(23, 0),
    val requiredCommitmentIds: Set<CommitmentId> = emptySet(),
    val frictionWaitSeconds: Int = 15,
    val frictionFishCost: Long = 0L,
    val unlockPassMinutes: Int = 15,
    val enabled: Boolean = true,
)

data class SocialMediaPreset(
    val id: String,
    val name: String,
    val packageName: String,
    val iconEmoji: String,
    val defaultRigor: RigorLevel = RigorLevel.AVISO,
    val suggestedWindowStart: LocalTime = LocalTime.of(8, 0),
    val suggestedWindowEnd: LocalTime = LocalTime.of(22, 0),
)

data class ActiveUnlockSession(
    val id: String,
    val packageName: String,
    val grantedAt: Instant,
    val expiresAt: Instant,
    val reason: String,
) {
    fun isActiveAt(instant: Instant): Boolean =
        !instant.isBefore(grantedAt) && instant.isBefore(expiresAt)
}

/**
 * Motor de politica de bloqueio em Kotlin puro (WP-29 · Secao 6, Secao 7 e Secao 22):
 *
 * Regras inegociaveis atendidas:
 * 1. Lista de excecoes protegida SEMPRE vence: telefone/discador, emergencia, WhatsApp (`com.whatsapp`),
 *    configuracoes do sistema (`com.android.settings`), launchers e o proprio Dead Line (`com.deadline.app`)
 *    nunca sao bloqueados, mesmo que uma regra tente inclui-los.
 * 2. Modo descanso (`isRestModeActive = true`) suspende todos os bloqueios.
 * 3. Sessao de desbloqueio ativa (`ActiveUnlockSession`) libera o app enquanto nao expirar (exceto no nivel 4 FIRME,
 *    que nao concede passe).
 * 4. Niveis de rigor (Secao 22):
 *    - 0 OBSERVAR: apenas mede o tempo, retorna `Allow`.
 *    - 1 AVISO: a gatinha aparece num balao que pode ser fechado (`Warn`).
 *    - 2 FRICCAO: espera configuravel (padrao 15s) e uma pergunta reflexiva (`Friction`).
 *    - 3 CONDICIONAL: bloqueado ate cumprir as tarefas escolhidas; se todas as tarefas exigidas no dia
 *      estiverem feitas (`FEITO`), libera automaticamente; caso contrario retorna `Block` listando as pendentes.
 *    - 4 FIRME: sem passe; so saida de emergencia segurando a gatinha por 10s (`Block` com `emergencyHoldSeconds = 10`).
 */
class BlockPolicy(
    val protectedPackages: Set<String> = DEFAULT_PROTECTED_PACKAGES,
) {

    fun evaluateForegroundPackage(
        foregroundPackage: String,
        now: Instant,
        zoneId: ZoneId,
        rulesByPackage: Map<String, AppBlockRule>,
        activeSessions: List<ActiveUnlockSession>,
        todayOccurrences: List<Occurrence> = emptyList(),
        isRestModeActive: Boolean = false,
        knownLauncherPackages: Set<String> = emptySet(),
    ): BlockDecision {
        // 1. Excecoes protegidas sempre vencem
        if (isProtectedPackage(foregroundPackage, knownLauncherPackages)) {
            return BlockDecision.Allow
        }

        // 2. Modo descanso suspende o bloqueio
        if (isRestModeActive) {
            return BlockDecision.Allow
        }

        val rule = rulesByPackage[foregroundPackage] ?: return BlockDecision.Allow
        if (!rule.enabled) return BlockDecision.Allow

        val zonedNow = ZonedDateTime.ofInstant(now, zoneId)
        if (zonedNow.dayOfWeek !in rule.activeDays) {
            return BlockDecision.Allow
        }
        if (!isWithinTimeWindow(zonedNow.toLocalTime(), rule.windowStart, rule.windowEnd)) {
            return BlockDecision.Allow
        }

        // 3. Nivel 0 (Observar) nunca interfere
        if (rule.rigor == RigorLevel.OBSERVAR) {
            return BlockDecision.Allow
        }

        // 4. Sessao de desbloqueio valida libera (exceto no Nivel 4 FIRME que nao tem passe)
        val hasValidSession = rule.rigor != RigorLevel.FIRME &&
            activeSessions.any { it.packageName == foregroundPackage && it.isActiveAt(now) }
        if (hasValidSession) {
            return BlockDecision.Allow
        }

        return when (rule.rigor) {
            RigorLevel.OBSERVAR -> BlockDecision.Allow

            RigorLevel.AVISO -> BlockDecision.Warn(
                packageName = foregroundPackage,
                message = "Miau, mamãe! Você abriu este app no horário de foco. Quer mesmo continuar aqui?",
            )

            RigorLevel.FRICCAO -> BlockDecision.Friction(
                packageName = foregroundPackage,
                waitSeconds = rule.frictionWaitSeconds.coerceAtLeast(5),
                promptQuestion = "Mamãe, o que você veio buscar aqui ajuda a puxar o nosso fio de hoje?",
                fishCost = rule.frictionFishCost.coerceAtLeast(0L),
            )

            RigorLevel.CONDICIONAL -> {
                val pendingRequired = if (rule.requiredCommitmentIds.isEmpty()) {
                    todayOccurrences.filter { it.state == OccurrenceState.PENDENTE }
                } else {
                    todayOccurrences.filter {
                        it.commitmentId in rule.requiredCommitmentIds && it.state != OccurrenceState.FEITO
                    }
                }

                if (pendingRequired.isEmpty()) {
                    BlockDecision.Allow
                } else {
                    BlockDecision.Block(
                        packageName = foregroundPackage,
                        rigor = RigorLevel.CONDICIONAL,
                        pendingTaskTitles = pendingRequired.map { it.title },
                        emergencyHoldSeconds = EMERGENCY_HOLD_SECONDS,
                    )
                }
            }

            RigorLevel.FIRME -> {
                val pendingTitles = todayOccurrences
                    .filter { it.state == OccurrenceState.PENDENTE }
                    .map { it.title }
                BlockDecision.Block(
                    packageName = foregroundPackage,
                    rigor = RigorLevel.FIRME,
                    pendingTaskTitles = pendingTitles,
                    emergencyHoldSeconds = EMERGENCY_HOLD_SECONDS,
                )
            }
        }
    }

    fun isProtectedPackage(
        packageName: String,
        knownLauncherPackages: Set<String> = emptySet(),
    ): Boolean {
        val normalized = packageName.trim().lowercase()
        if (normalized in protectedPackages || normalized in knownLauncherPackages.map { it.lowercase() }) {
            return true
        }
        return PROTECTED_PREFIXES.any { prefix -> normalized.startsWith(prefix) }
    }

    private fun isWithinTimeWindow(now: LocalTime, start: LocalTime, end: LocalTime): Boolean =
        if (!end.isBefore(start)) {
            !now.isBefore(start) && !now.isAfter(end)
        } else {
            // Janela que atravessa a meia-noite (ex: 22:00 as 02:00)
            !now.isBefore(start) || !now.isAfter(end)
        }

    companion object {
        const val EMERGENCY_HOLD_SECONDS: Int = 10

        val DEFAULT_PROTECTED_PACKAGES: Set<String> = setOf(
            "com.deadline.app",
            "com.whatsapp",
            "com.whatsapp.w4b",
            "com.android.settings",
            "com.android.dialer",
            "com.google.android.dialer",
            "com.samsung.android.dialer",
            "com.android.incallui",
            "com.android.emergency",
            "com.android.systemui",
        )

        private val PROTECTED_PREFIXES: List<String> = listOf(
            "com.android.launcher",
            "com.google.android.apps.nexuslauncher",
            "com.sec.android.app.launcher",
            "com.miui.home",
        )

        val POPULAR_SOCIAL_MEDIA_PRESETS: List<SocialMediaPreset> = listOf(
            SocialMediaPreset("instagram", "Instagram", "com.instagram.android", "📸", RigorLevel.AVISO),
            SocialMediaPreset("tiktok", "TikTok", "com.zhiliaoapp.musically", "🎵", RigorLevel.CONDICIONAL),
            SocialMediaPreset("twitter", "Twitter / X", "com.twitter.android", "🩵", RigorLevel.AVISO),
            SocialMediaPreset("youtube", "YouTube", "com.google.android.youtube", "🔴", RigorLevel.FRICCAO),
            SocialMediaPreset("facebook", "Facebook", "com.facebook.katana", "📘", RigorLevel.AVISO),
            SocialMediaPreset("reddit", "Reddit", "com.reddit.frontpage", "🤖", RigorLevel.FRICCAO),
            SocialMediaPreset("pinterest", "Pinterest", "com.pinterest", "📌", RigorLevel.AVISO),
            SocialMediaPreset("threads", "Threads", "com.instagram.barcelona", "🧵", RigorLevel.AVISO),
        )

        fun findPresetForPackage(packageName: String): SocialMediaPreset? =
            POPULAR_SOCIAL_MEDIA_PRESETS.firstOrNull { it.packageName.equals(packageName.trim(), ignoreCase = true) }
    }
}
