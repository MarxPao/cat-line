package com.deadline.core.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Typography
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.sp

/**
 * Tipografia do tema Pixel Art (Secao 10 e Secao 20):
 * - Pixelify Sans para titulos e texto de leitura
 * - Silkscreen para rotulos curtos e badges
 * - Nenhum texto de dados menor que 12 sp para garantir contraste e conforto.
 *
 * Caso os arquivos TTF opcionais nao estejam empacotados em `res/font/`, usa fallback Monospace
 * mantendo o alinhamento em grade.
 */
object DeadLinePixelFonts {
    val PixelifySans: FontFamily = FontFamily.Monospace
    val Silkscreen: FontFamily = FontFamily.Monospace
}

val DeadLineTypography = Typography(
    headlineMedium = TextStyle(
        fontFamily = DeadLinePixelFonts.PixelifySans,
        fontWeight = FontWeight.Bold,
        fontSize = 26.sp,
        lineHeight = 32.sp,
        color = DeadLinePalette.InkBlack,
    ),
    titleMedium = TextStyle(
        fontFamily = DeadLinePixelFonts.PixelifySans,
        fontWeight = FontWeight.Bold,
        fontSize = 20.sp,
        lineHeight = 26.sp,
        color = DeadLinePalette.InkBlack,
    ),
    titleSmall = TextStyle(
        fontFamily = DeadLinePixelFonts.Silkscreen,
        fontWeight = FontWeight.Bold,
        fontSize = 17.sp,
        lineHeight = 22.sp,
        color = DeadLinePalette.InkBlack,
    ),
    bodyMedium = TextStyle(
        fontFamily = DeadLinePixelFonts.PixelifySans,
        fontWeight = FontWeight.Normal,
        fontSize = 16.sp,
        lineHeight = 22.sp,
        color = DeadLinePalette.InkBlack,
    ),
    bodySmall = TextStyle(
        fontFamily = DeadLinePixelFonts.PixelifySans,
        fontWeight = FontWeight.Normal,
        fontSize = 14.sp, // Ampliado para leitura confortável (>= 14sp)
        lineHeight = 19.sp,
        color = DeadLinePalette.InkBlack,
    ),
    labelSmall = TextStyle(
        fontFamily = DeadLinePixelFonts.Silkscreen,
        fontWeight = FontWeight.Medium,
        fontSize = 14.sp,
        lineHeight = 18.sp,
        color = DeadLinePalette.InkBlack,
    ),
)

private val DeadLineColorScheme = lightColorScheme(
    primary = DeadLinePalette.CalicoOrange,
    onPrimary = DeadLinePalette.FurWhite,
    secondary = DeadLinePalette.YarnPink,
    onSecondary = DeadLinePalette.InkBlack,
    tertiary = DeadLinePalette.GoldenYarn,
    background = DeadLinePalette.WallCream,
    onBackground = DeadLinePalette.InkBlack,
    surface = DeadLinePalette.FurWhite,
    onSurface = DeadLinePalette.InkBlack,
    error = DeadLinePalette.AlertRed,
    onError = DeadLinePalette.FurWhite,
)

@Composable
fun DeadLinePixelTheme(
    content: @Composable () -> Unit,
) {
    MaterialTheme(
        colorScheme = DeadLineColorScheme,
        typography = DeadLineTypography,
        content = content,
    )
}
