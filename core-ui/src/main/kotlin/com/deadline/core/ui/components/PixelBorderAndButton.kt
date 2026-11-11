package com.deadline.core.ui.components

import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsPressedAsState
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxScope
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.IntOffset
import androidx.compose.ui.unit.dp
import com.deadline.core.ui.theme.DeadLinePalette

/**
 * Moldura 9-patch procedural em pixel art 8-bit com cantos chanfrados em degrau de 1 pixel virtual
 * e sombra interna estilo Game Boy / Pokemon (Secao 20 · WP-06).
 */
@Composable
fun Pixel9PatchCard(
    modifier: Modifier = Modifier,
    backgroundColor: Color = DeadLinePalette.FurWhite,
    borderColor: Color = DeadLinePalette.InkBlack,
    shadowColor: Color = DeadLinePalette.FurCreamShadow,
    pixelSize: Dp = 3.dp,
    contentPadding: Dp = 12.dp,
    content: @Composable BoxScope.() -> Unit,
) {
    Box(
        modifier = modifier
            .drawBehind {
                val px = pixelSize.toPx()
                val w = size.width
                val h = size.height

                // Preenchimento central (sem os 4 cantos externos)
                drawRect(
                    color = backgroundColor,
                    topLeft = Offset(px, px),
                    size = Size((w - 2 * px).coerceAtLeast(0f), (h - 2 * px).coerceAtLeast(0f)),
                )

                // Sombra interna inferior e direita (estilo 9-patch 8-bit)
                drawRect(
                    color = shadowColor,
                    topLeft = Offset(px, (h - 2 * px).coerceAtLeast(0f)),
                    size = Size((w - 2 * px).coerceAtLeast(0f), px),
                )
                drawRect(
                    color = shadowColor,
                    topLeft = Offset((w - 2 * px).coerceAtLeast(0f), px),
                    size = Size(px, (h - 2 * px).coerceAtLeast(0f)),
                )

                // Bordas superior e inferior (recortadas nos cantos)
                drawRect(
                    color = borderColor,
                    topLeft = Offset(px, 0f),
                    size = Size((w - 2 * px).coerceAtLeast(0f), px),
                )
                drawRect(
                    color = borderColor,
                    topLeft = Offset(px, (h - px).coerceAtLeast(0f)),
                    size = Size((w - 2 * px).coerceAtLeast(0f), px),
                )

                // Bordas esquerda e direita (recortadas nos cantos)
                drawRect(
                    color = borderColor,
                    topLeft = Offset(0f, px),
                    size = Size(px, (h - 2 * px).coerceAtLeast(0f)),
                )
                drawRect(
                    color = borderColor,
                    topLeft = Offset((w - px).coerceAtLeast(0f), px),
                    size = Size(px, (h - 2 * px).coerceAtLeast(0f)),
                )
            }
            .padding(contentPadding),
        content = content,
    )
}

/**
 * Botao em pixel art 8-bit com estado pressionado que desloca a face em +1 pixel virtual
 * e reduz a sombra inferior (Secao 20 · WP-06).
 */
@Composable
fun PixelButton(
    text: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
    containerColor: Color = DeadLinePalette.CalicoOrange,
    shadowColor: Color = DeadLinePalette.CalicoOrangeShadow,
    textColor: Color = DeadLinePalette.FurWhite,
    pixelSize: Dp = 3.dp,
) {
    val interactionSource = remember { MutableInteractionSource() }
    val isPressed by interactionSource.collectIsPressedAsState()
    val pressOffsetPx = if (isPressed && enabled) 1 else 0

    Box(
        modifier = modifier
            .clickable(
                interactionSource = interactionSource,
                indication = null,
                enabled = enabled,
                onClick = onClick,
            )
            .offset { IntOffset(0, (pressOffsetPx * pixelSize.roundToPx())) },
        contentAlignment = Alignment.Center,
    ) {
        Pixel9PatchCard(
            backgroundColor = if (enabled) containerColor else DeadLinePalette.CalicoGrayMid,
            shadowColor = if (enabled) shadowColor else DeadLinePalette.CalicoGrayDark,
            pixelSize = pixelSize,
            contentPadding = 10.dp,
        ) {
            Text(
                text = text,
                style = MaterialTheme.typography.titleSmall,
                color = textColor,
            )
        }
    }
}
