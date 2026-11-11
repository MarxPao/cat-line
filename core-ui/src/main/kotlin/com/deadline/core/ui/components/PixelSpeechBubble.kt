package com.deadline.core.ui.components

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import com.deadline.core.ui.theme.DeadLinePalette
import kotlinx.coroutines.delay

/**
 * Balao de fala 8-bit identico a imagem de referencia da gatinha (Secao 1 e Secao 20 · WP-06):
 * - Moldura branca com contorno preto pixelado em degraus
 * - Cauda pixelada apontando para baixo em direcao a cabeca da gatinha
 * - Texto com efeito de maquina de escrever e callback `onCharacterTyped` para tocar o blip chiptune
 */
@Composable
fun PixelSpeechBubble(
    text: String,
    modifier: Modifier = Modifier,
    typewriterEnabled: Boolean = true,
    charDelayMillis: Long = 28L,
    pixelSize: Dp = 3.dp,
    onCharacterTyped: ((Char) -> Unit)? = null,
) {
    var visibleChars by remember(text, typewriterEnabled) {
        mutableIntStateOf(if (typewriterEnabled) 0 else text.length)
    }

    LaunchedEffect(text, typewriterEnabled) {
        if (!typewriterEnabled) {
            visibleChars = text.length
            return@LaunchedEffect
        }
        visibleChars = 0
        for (i in 1..text.length) {
            delay(charDelayMillis)
            visibleChars = i
            val ch = text[i - 1]
            if (!ch.isWhitespace()) {
                onCharacterTyped?.invoke(ch)
            }
        }
    }

    val renderedText = remember(text, visibleChars) {
        text.take(visibleChars.coerceIn(0, text.length))
    }

    Column(
        modifier = modifier,
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Pixel9PatchCard(
            modifier = Modifier.fillMaxWidth(),
            backgroundColor = DeadLinePalette.FurWhite,
            borderColor = DeadLinePalette.InkBlack,
            shadowColor = DeadLinePalette.FurCreamShadow,
            pixelSize = pixelSize,
            contentPadding = 12.dp,
        ) {
            Text(
                text = renderedText,
                style = MaterialTheme.typography.bodyMedium,
                color = DeadLinePalette.InkBlack,
                modifier = Modifier.padding(horizontal = 4.dp),
            )
        }

        // Cauda em degraus de pixel apontando para a gatinha (igual a imagem de referencia)
        Canvas(
            modifier = Modifier
                .width(pixelSize * 8)
                .height(pixelSize * 5),
        ) {
            val px = pixelSize.toPx()
            // Degrau 1 (topo da cauda conectado ao balao)
            drawRect(
                color = DeadLinePalette.FurWhite,
                topLeft = Offset(px * 2, 0f),
                size = Size(px * 3, px),
            )
            drawRect(color = DeadLinePalette.InkBlack, topLeft = Offset(px, 0f), size = Size(px, px))
            drawRect(color = DeadLinePalette.InkBlack, topLeft = Offset(px * 5, 0f), size = Size(px, px))

            // Degrau 2
            drawRect(
                color = DeadLinePalette.FurWhite,
                topLeft = Offset(px * 3, px),
                size = Size(px * 2, px),
            )
            drawRect(color = DeadLinePalette.InkBlack, topLeft = Offset(px * 2, px), size = Size(px, px))
            drawRect(color = DeadLinePalette.InkBlack, topLeft = Offset(px * 5, px), size = Size(px, px))

            // Degrau 3
            drawRect(
                color = DeadLinePalette.FurWhite,
                topLeft = Offset(px * 4, px * 2),
                size = Size(px, px),
            )
            drawRect(color = DeadLinePalette.InkBlack, topLeft = Offset(px * 3, px * 2), size = Size(px, px))
            drawRect(color = DeadLinePalette.InkBlack, topLeft = Offset(px * 5, px * 2), size = Size(px, px))

            // Ponta inferior da cauda
            drawRect(
                color = DeadLinePalette.InkBlack,
                topLeft = Offset(px * 4, px * 3),
                size = Size(px * 2, px * 2),
            )
        }
    }
}
