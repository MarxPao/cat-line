package com.deadline.core.ui

import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.luminance
import com.deadline.core.ui.components.NoveloAnticsLimiter
import com.deadline.core.ui.theme.DeadLinePalette
import com.deadline.core.ui.theme.DeadLineTypography
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import kotlin.math.max
import kotlin.math.min

/**
 * Testes de qualidade visual e acessibilidade (WP-31 e WP-32 · Secao 8 e Secao 20):
 * - Confere tamanho minimo estrito de >= 12 sp em todos os estilos tipograficos das telas de dados.
 * - Confere taxa de contraste WCAG (>= 4.5:1) do texto preto `#181425` sobre os fundos de cartao e parede (`#FFFFFF` e `#F7E8D0`).
 * - Confere o limitador de intervalo minimo e chave de desligamento das gracinhas do novelo.
 */
class CoreUiQualityTest {

    @Test
    fun `todos os estilos tipograficos de dados possuem tamanho minimo de 12 sp`() {
        val allStyles = listOf(
            DeadLineTypography.headlineMedium,
            DeadLineTypography.titleMedium,
            DeadLineTypography.titleSmall,
            DeadLineTypography.bodyMedium,
            DeadLineTypography.bodySmall,
            DeadLineTypography.labelSmall,
        )

        allStyles.forEach { style ->
            assertTrue(
                "Estilo com fontSize ${style.fontSize.value}sp viola o piso de 12sp da Secao 20",
                style.fontSize.value >= 12f,
            )
        }
    }

    @Test
    fun `contraste entre texto InkBlack e fundos FurWhite e WallCream supera 10 para 1 (WCAG AAA)`() {
        val ratioOnWhite = contrastRatio(DeadLinePalette.InkBlack, DeadLinePalette.FurWhite)
        val ratioOnWallCream = contrastRatio(DeadLinePalette.InkBlack, DeadLinePalette.WallCream)

        assertTrue("Contraste sobre branco ($ratioOnWhite) deve ser >= 7.0", ratioOnWhite >= 10.0f)
        assertTrue("Contraste sobre creme ($ratioOnWallCream) deve ser >= 7.0", ratioOnWallCream >= 10.0f)
    }

    @Test
    fun `NoveloAnticsLimiter respeita intervalo minimo e opcao de desligar`() {
        val limiter = NoveloAnticsLimiter(minIntervalMillis = 45_000L)

        // Desligado pela usuaria -> nunca dispara
        assertFalse(limiter.canTriggerSpontaneous(nowMillis = 100_000L, enabled = false))

        // Ligado -> dispara na primeira vez, bloqueia antes de 45s e libera apos 45s
        assertTrue(limiter.canTriggerSpontaneous(nowMillis = 0L, enabled = true))
        limiter.recordTriggered(nowMillis = 0L)

        assertFalse(limiter.canTriggerSpontaneous(nowMillis = 30_000L, enabled = true))
        assertTrue(limiter.canTriggerSpontaneous(nowMillis = 45_000L, enabled = true))
    }

    private fun contrastRatio(foreground: Color, background: Color): Float {
        val l1 = foreground.luminance()
        val l2 = background.luminance()
        val brightest = max(l1, l2)
        val darkest = min(l1, l2)
        return (brightest + 0.05f) / (darkest + 0.05f)
    }
}
