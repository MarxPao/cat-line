package com.deadline.core.ui.components

import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableLongStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.IntOffset
import androidx.compose.ui.unit.dp
import com.deadline.core.ui.theme.DeadLinePalette
import kotlinx.coroutines.delay
import kotlin.math.roundToInt
import kotlin.random.Random

enum class YarnAnticKind(val descriptionPtBr: String) {
    ROLAR_PELA_TELA("O novelo rolou de um cantinho para o outro!"),
    ENROSCAR_NO_BOTAO("O novelo se enroscou na borda da tela!"),
    LEVAR_PATADA("A gatinha deu uma patadinha fofa no novelo!"),
    PULAR_DE_ALEGRIA("O novelo deu um pulinho pelo seu check-in!"),
}

/**
 * Controlador deterministico de intervalo minimo entre gracinhas do novelo (WP-31 · Secao 20):
 * - Respeita a flag `enabled` (`FeatureFlagKey.NOVELO_GRACINHAS`).
 * - Garante intervalo minimo (`minIntervalMillis`, padrao 45s) entre gracinhas espontaneas,
 *   mas permite disparo imediato em eventos importantes (check-in / meta concluida).
 */
class NoveloAnticsLimiter(
    val minIntervalMillis: Long = 45_000L,
) {
    private var lastAnticAtMillis: Long = -minIntervalMillis

    fun canTriggerSpontaneous(nowMillis: Long, enabled: Boolean): Boolean {
        if (!enabled) return false
        return (nowMillis - lastAnticAtMillis) >= minIntervalMillis
    }

    fun recordTriggered(nowMillis: Long) {
        lastAnticAtMillis = nowMillis
    }

    fun pickAntic(seed: Long): YarnAnticKind {
        val all = YarnAnticKind.entries
        return all[Random(seed).nextInt(all.size)]
    }
}

/**
 * Mini novelo presente no rodape/topo de todas as telas do app que faz uma gracinha
 * (rola, se enrosca, leva patada) e pode ser desligado nas configuracoes de modularidade (WP-31 · Secao 7 e Secao 20).
 */
@Composable
fun NoveloScreenAnticBanner(
    enabled: Boolean,
    externalTriggerReason: String? = null,
    modifier: Modifier = Modifier,
) {
    if (!enabled) return

    var currentAntic by remember { mutableStateOf(YarnAnticKind.ROLAR_PELA_TELA) }
    var rollDirection by remember { mutableStateOf(1f) }
    var triggerCount by remember { mutableLongStateOf(0L) }

    LaunchedEffect(externalTriggerReason) {
        if (externalTriggerReason != null) {
            currentAntic = YarnAnticKind.PULAR_DE_ALEGRIA
            rollDirection = if (rollDirection > 0f) -1f else 1f
            triggerCount++
        }
    }

    LaunchedEffect(enabled) {
        while (enabled) {
            delay(45_000L)
            triggerCount++
            currentAntic = YarnAnticKind.entries[(triggerCount % YarnAnticKind.entries.size).toInt()]
            rollDirection = if (rollDirection > 0f) -1f else 1f
        }
    }

    val animatedOffsetX by animateFloatAsState(
        targetValue = if (rollDirection > 0f) 18f else -18f,
        animationSpec = tween(durationMillis = 700),
        label = "yarn_roll_offset",
    )

    Row(
        modifier = modifier
            .fillMaxWidth()
            .padding(horizontal = 8.dp, vertical = 4.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        PixelYarnBallIcon(
            size = 20.dp,
            scaleFraction = 1f,
            mainColor = DeadLinePalette.YarnPink,
            shadowColor = DeadLinePalette.YarnPinkDark,
            modifier = Modifier.offset { IntOffset(animatedOffsetX.roundToInt(), 0) },
        )
        Text(
            text = currentAntic.descriptionPtBr,
            style = MaterialTheme.typography.bodySmall,
            color = DeadLinePalette.InkBlack,
        )
    }
}
