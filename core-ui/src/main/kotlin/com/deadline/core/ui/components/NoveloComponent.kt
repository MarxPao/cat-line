package com.deadline.core.ui.components

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.size
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.drawscope.DrawScope
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import com.deadline.core.ui.theme.DeadLinePalette

/**
 * Os quatro modos do componente Novelo definidos na Secao 20 e WP-06:
 * 1. BARRA: o fio sai do novelo formando a barra de progresso (tarefas / metas).
 * 2. CRONOMETRO: o novelo diminui de raio conforme o prazo se aproxima.
 * 3. GRAFICO: o fio com nos representa a linha de atraso mediano ao longo da semana ("O Fio").
 * 4. EDICAO: um mini novelo 16x16 ao lado de cada campo de edicao de compromisso/habito.
 */
sealed interface NoveloMode {
    data class Barra(
        val progressZeroToOne: Float,
        val label: String? = null,
        val isGolden: Boolean = false,
    ) : NoveloMode

    data class Cronometro(
        val remainingFractionZeroToOne: Float,
        val remainingTimeText: String,
    ) : NoveloMode

    data class Grafico(
        val delayPointsMinutes: List<Float>,
        val toleranceMinutes: Float = 5f,
    ) : NoveloMode

    data class Edicao(
        val isActiveField: Boolean = false,
        val isGolden: Boolean = false,
    ) : NoveloMode
}

@Composable
fun NoveloComponent(
    mode: NoveloMode,
    modifier: Modifier = Modifier,
) {
    when (mode) {
        is NoveloMode.Barra -> NoveloProgressBar(mode, modifier)
        is NoveloMode.Cronometro -> NoveloTimer(mode, modifier)
        is NoveloMode.Grafico -> NoveloDelayGraph(mode, modifier)
        is NoveloMode.Edicao -> NoveloFieldIndicator(mode, modifier)
    }
}

@Composable
private fun NoveloProgressBar(
    mode: NoveloMode.Barra,
    modifier: Modifier = Modifier,
) {
    val yarnMain = if (mode.isGolden) DeadLinePalette.GoldenYarn else DeadLinePalette.YarnPink
    val yarnShadow = if (mode.isGolden) DeadLinePalette.CalicoOrangeShadow else DeadLinePalette.YarnPinkDark
    val clamped = mode.progressZeroToOne.coerceIn(0f, 1f)

    Column(modifier = modifier.fillMaxWidth(), verticalArrangement = Arrangement.spacedBy(4.dp)) {
        mode.label?.let {
            Text(text = it, style = MaterialTheme.typography.labelSmall)
        }
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            PixelYarnBallIcon(
                size = 24.dp,
                scaleFraction = (0.45f + 0.55f * clamped),
                mainColor = yarnMain,
                shadowColor = yarnShadow,
            )
            Canvas(
                modifier = Modifier
                    .weight(1f)
                    .height(14.dp),
            ) {
                val px = 3.dp.toPx()
                // Trilho de fundo
                drawRect(
                    color = DeadLinePalette.FurCreamShadow,
                    topLeft = Offset(0f, px),
                    size = Size(size.width, size.height - 2 * px),
                )
                // Fio desenrolado proporcional ao progresso
                val activeW = size.width * clamped
                drawRect(
                    color = yarnMain,
                    topLeft = Offset(0f, px),
                    size = Size(activeW, size.height - 2 * px),
                )
                // Contorno superior e inferior do fio
                drawRect(
                    color = DeadLinePalette.InkBlack,
                    topLeft = Offset(0f, 0f),
                    size = Size(size.width, px),
                )
                drawRect(
                    color = DeadLinePalette.InkBlack,
                    topLeft = Offset(0f, size.height - px),
                    size = Size(size.width, px),
                )
            }
        }
    }
}

@Composable
private fun NoveloTimer(
    mode: NoveloMode.Cronometro,
    modifier: Modifier = Modifier,
) {
    val fraction = mode.remainingFractionZeroToOne.coerceIn(0f, 1f)
    val yarnColor = when {
        fraction > 0.5f -> DeadLinePalette.YarnPink
        fraction > 0.2f -> DeadLinePalette.GoldenYarn
        else -> DeadLinePalette.AlertRed
    }
    Row(
        modifier = modifier,
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        PixelYarnBallIcon(
            size = 28.dp,
            scaleFraction = (0.30f + 0.70f * fraction),
            mainColor = yarnColor,
            shadowColor = DeadLinePalette.YarnPinkDark,
        )
        Text(
            text = mode.remainingTimeText,
            style = MaterialTheme.typography.titleSmall,
            color = DeadLinePalette.InkBlack,
        )
    }
}

@Composable
private fun NoveloDelayGraph(
    mode: NoveloMode.Grafico,
    modifier: Modifier = Modifier,
) {
    val points = mode.delayPointsMinutes
    Canvas(
        modifier = modifier
            .fillMaxWidth()
            .height(120.dp),
    ) {
        if (points.isEmpty()) return@Canvas

        val minVal = (points.minOrNull() ?: -10f).coerceAtMost(-5f)
        val maxVal = (points.maxOrNull() ?: 30f).coerceAtLeast(mode.toleranceMinutes + 10f)
        val range = (maxVal - minVal).coerceAtLeast(1f)

        fun yFor(minutes: Float): Float {
            val normalized = (minutes - minVal) / range
            return size.height - (normalized * (size.height - 24f)) - 12f
        }

        // Linha guia de tolerancia ("no prazo")
        val toleranceY = yFor(mode.toleranceMinutes)
        drawLine(
            color = DeadLinePalette.LeafGreen,
            start = Offset(0f, toleranceY),
            end = Offset(size.width, toleranceY),
            strokeWidth = 2.dp.toPx(),
        )

        // O Fio de la ligando os pontos da semana
        val stepX = if (points.size == 1) 0f else (size.width - 32f) / (points.size - 1)
        val path = Path()
        val coords = points.mapIndexed { idx, value ->
            Offset(16f + idx * stepX, yFor(value))
        }
        coords.forEachIndexed { idx, pt ->
            if (idx == 0) path.moveTo(pt.x, pt.y) else path.lineTo(pt.x, pt.y)
        }
        drawPath(
            path = path,
            color = DeadLinePalette.YarnPinkDark,
            style = Stroke(width = 4.dp.toPx()),
        )

        // Nos do fio em cada dia
        coords.forEachIndexed { idx, pt ->
            val isOnTime = points[idx] <= mode.toleranceMinutes
            val nodeColor = if (isOnTime) DeadLinePalette.LeafGreen else DeadLinePalette.YarnPink
            drawRect(
                color = DeadLinePalette.InkBlack,
                topLeft = Offset(pt.x - 6.dp.toPx(), pt.y - 6.dp.toPx()),
                size = Size(12.dp.toPx(), 12.dp.toPx()),
            )
            drawRect(
                color = nodeColor,
                topLeft = Offset(pt.x - 4.dp.toPx(), pt.y - 4.dp.toPx()),
                size = Size(8.dp.toPx(), 8.dp.toPx()),
            )
        }
    }
}

@Composable
private fun NoveloFieldIndicator(
    mode: NoveloMode.Edicao,
    modifier: Modifier = Modifier,
) {
    val main = when {
        mode.isGolden -> DeadLinePalette.GoldenYarn
        mode.isActiveField -> DeadLinePalette.CalicoOrange
        else -> DeadLinePalette.YarnPink
    }
    PixelYarnBallIcon(
        modifier = modifier,
        size = 18.dp,
        scaleFraction = 1f,
        mainColor = main,
        shadowColor = DeadLinePalette.YarnPinkDark,
    )
}

@Composable
fun PixelYarnBallIcon(
    size: Dp,
    scaleFraction: Float = 1f,
    mainColor: Color = DeadLinePalette.YarnPink,
    shadowColor: Color = DeadLinePalette.YarnPinkDark,
    modifier: Modifier = Modifier,
) {
    Canvas(modifier = modifier.size(size)) {
        drawPixelYarnBall(
            scale = scaleFraction.coerceIn(0.25f, 1f),
            mainColor = mainColor,
            shadowColor = shadowColor,
        )
    }
}

private fun DrawScope.drawPixelYarnBall(
    scale: Float,
    mainColor: Color,
    shadowColor: Color,
) {
    val boxSize = size.minDimension * scale
    val startX = (size.width - boxSize) / 2f
    val startY = (size.height - boxSize) / 2f
    val px = boxSize / 8f

    // Contorno 8x8 em blocos de pixel
    drawRect(
        color = DeadLinePalette.InkBlack,
        topLeft = Offset(startX + px, startY + px),
        size = Size(px * 6, px * 6),
    )
    // Miolo do novelo
    drawRect(
        color = mainColor,
        topLeft = Offset(startX + 2 * px, startY + 2 * px),
        size = Size(px * 4, px * 4),
    )
    // Sombra e fios cruzados internos
    drawRect(
        color = shadowColor,
        topLeft = Offset(startX + 3 * px, startY + 4 * px),
        size = Size(px * 3, px * 2),
    )
    // Pontinha de fio saindo na base direita
    drawRect(
        color = mainColor,
        topLeft = Offset(startX + 6 * px, startY + 6 * px),
        size = Size(px * 2, px),
    )
}
