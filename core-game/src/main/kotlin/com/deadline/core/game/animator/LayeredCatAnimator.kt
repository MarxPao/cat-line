package com.deadline.core.game.animator

import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.ImageBitmap
import androidx.compose.ui.graphics.Canvas as ComposeGraphicsCanvas
import androidx.compose.ui.graphics.Paint
import androidx.compose.ui.geometry.Rect
import com.deadline.core.game.atlas.AsepriteAnchorPoint
import com.deadline.core.game.atlas.AsepriteAtlasDocument
import com.deadline.core.game.atlas.AsepriteAtlasLoader
import com.deadline.core.ui.theme.DeadLinePalette

enum class CatEyeVariant {
    NORMAL,
    BLINK,
    HAPPY_ARC,
    SLEEPY,
    LOOK_WATCH,
}

data class CompositeCatFrame(
    val animationTag: String,
    val localFrameIndex: Int,
    val bodyBobOffsetPx: Int,
    val tailFrameIndex: Int,
    val eyeVariant: CatEyeVariant,
    val headAnchor: AsepriteAnchorPoint,
    val neckAnchor: AsepriteAnchorPoint,
    val tailAnchor: AsepriteAnchorPoint,
    val pawAnchor: AsepriteAnchorPoint,
)

/**
 * Animador por partes da gatinha 64x64 px (WP-16 · Secao 20):
 * - Monta corpo, cauda, olhos e acessorios seguindo os pontos de ancoragem exportados por quadro.
 * - Cauda e piscar se animam por conta propria.
 * - Respeita a opcao de acessibilidade "remover animacoes" do Android (`animationsEnabled = false`),
 *   congelando no quadro 0 sem piscar nem balancar.
 */
class LayeredCatAnimator(
    val atlas: AsepriteAtlasDocument = AsepriteAtlasLoader.buildDefaultPlaceholderAtlas(),
) {
    private val orderedFrames = atlas.frames.values.toList()

    fun resolveCompositeFrame(
        animationTag: String,
        elapsedMillis: Long,
        animationsEnabled: Boolean = true,
    ): CompositeCatFrame {
        val tagInfo = atlas.meta.frameTags.firstOrNull { it.name == animationTag }
            ?: atlas.meta.frameTags.first()

        val frameCount = (tagInfo.to - tagInfo.from + 1).coerceAtLeast(1)
        val firstEntry = orderedFrames.getOrNull(tagInfo.from)
        val frameDuration = (firstEntry?.duration ?: 100).coerceAtLeast(40)

        val localIndex = if (!animationsEnabled) {
            0
        } else {
            ((elapsedMillis / frameDuration) % frameCount).toInt()
        }

        val entry = orderedFrames.getOrNull(tagInfo.from + localIndex) ?: orderedFrames.first()
        val head = entry.anchors["head_anchor"] ?: AsepriteAnchorPoint(32, 16)
        val neck = entry.anchors["neck_anchor"] ?: AsepriteAnchorPoint(32, 34)
        val tail = entry.anchors["tail_anchor"] ?: AsepriteAnchorPoint(44, 48)
        val paw = entry.anchors["paw_anchor"] ?: AsepriteAnchorPoint(24, 54)

        val tailFrame = if (!animationsEnabled) 0 else ((elapsedMillis / 180L) % 4L).toInt()
        val isBlinkWindow = animationsEnabled && ((elapsedMillis % 3600L) in 3450L..3599L)

        val eyeVariant = when {
            animationTag in setOf("dormir", "sonolenta", "ronronar") -> CatEyeVariant.SLEEPY
            animationTag in setOf("feliz", "comemorar") -> CatEyeVariant.HAPPY_ARC
            animationTag == "olhar_relogio" -> CatEyeVariant.LOOK_WATCH
            isBlinkWindow -> CatEyeVariant.BLINK
            else -> CatEyeVariant.NORMAL
        }

        return CompositeCatFrame(
            animationTag = tagInfo.name,
            localFrameIndex = localIndex,
            bodyBobOffsetPx = head.y - 16,
            tailFrameIndex = tailFrame,
            eyeVariant = eyeVariant,
            headAnchor = head,
            neckAnchor = neck,
            tailAnchor = tail,
            pawAnchor = paw,
        )
    }
}

/**
 * Gera um `ImageBitmap` de 64x64 pixels reais da gatinha calico da imagem de referencia
 * (branca, mancha cinza na orelha esquerda, mancha laranja na orelha direita e cauda,
 * bochechas rosas e contorno preto de 1px) com animacao de caminhar em 4 quadros e
 * novelo colorido na patinha para ser desenhado com `drawImage(..., filterQuality = FilterQuality.None)`.
 */
object CalicoSpriteBitmapFactory {

    fun createCalicoFrameBitmap(
        frame: CompositeCatFrame,
        equippedAccessories: Set<String> = emptySet(),
        heldYarnMainColor: Color = DeadLinePalette.YarnPink,
        heldYarnShadowColor: Color = DeadLinePalette.YarnPinkDark,
        isWalking: Boolean = false,
        walkStepFrame: Int = 0,
    ): ImageBitmap {
        val bitmap = ImageBitmap(64, 64)
        val canvas = ComposeGraphicsCanvas(bitmap)
        val paint = Paint().apply { isAntiAlias = false }

        fun fillPx(x: Int, y: Int, w: Int, h: Int, color: Color) {
            paint.color = color
            canvas.drawRect(
                Rect(
                    x.toFloat().coerceIn(0f, 64f),
                    y.toFloat().coerceIn(0f, 64f),
                    (x + w).toFloat().coerceIn(0f, 64f),
                    (y + h).toFloat().coerceIn(0f, 64f),
                ),
                paint,
            )
        }

        val strideBob = if (isWalking && walkStepFrame % 2 == 1) -2 else frame.bodyBobOffsetPx
        val by = strideBob

        // 1. Camada Cauda (ancorada em tailAnchor, animada em 4 quadros)
        val tailSwing = when (frame.tailFrameIndex % 4) {
            1 -> 2
            3 -> -2
            else -> 0
        }
        val tx = frame.tailAnchor.x
        val ty = frame.tailAnchor.y
        fillPx(tx - 1, ty - 8 + tailSwing, 10, 10, DeadLinePalette.InkBlack)
        fillPx(tx, ty - 7 + tailSwing, 8, 4, DeadLinePalette.CalicoGrayDark)
        fillPx(tx, ty - 3 + tailSwing, 8, 4, DeadLinePalette.CalicoOrange)

        // 2. Camada Corpo + Cabeca 64x64 (fiel a gatinha calico da referencia)
        // Contorno das orelhas
        fillPx(18, 10 + by, 9, 8, DeadLinePalette.InkBlack)
        fillPx(37, 10 + by, 9, 8, DeadLinePalette.InkBlack)
        // Interior das orelhas (mancha cinza esq, mancha laranja dir, miolo rosa)
        fillPx(19, 11 + by, 7, 6, DeadLinePalette.CalicoGrayDark)
        fillPx(21, 13 + by, 4, 4, DeadLinePalette.YarnPink)
        fillPx(38, 11 + by, 7, 6, DeadLinePalette.CalicoOrange)
        fillPx(39, 13 + by, 4, 4, DeadLinePalette.YarnPink)

        // Cabeca com contorno preto de 1px
        fillPx(16, 17 + by, 32, 18, DeadLinePalette.InkBlack)
        fillPx(17, 18 + by, 30, 16, DeadLinePalette.FurWhite)
        // Mancha cinza na testa esquerda e mancha laranja na direita
        fillPx(17, 18 + by, 10, 8, DeadLinePalette.CalicoGrayDark)
        fillPx(37, 18 + by, 10, 8, DeadLinePalette.CalicoOrange)

        // Bochechas rosas e focinho
        fillPx(20, 28 + by, 4, 2, DeadLinePalette.YarnPink)
        fillPx(40, 28 + by, 4, 2, DeadLinePalette.YarnPink)
        fillPx(31, 27 + by, 2, 2, DeadLinePalette.YarnPinkDark)
        if (frame.animationTag == "miar_falando" && frame.localFrameIndex % 2 == 1) {
            fillPx(30, 30 + by, 4, 3, DeadLinePalette.InkBlack)
            fillPx(31, 31 + by, 2, 1, DeadLinePalette.YarnPink)
        } else {
            fillPx(29, 29 + by, 2, 2, DeadLinePalette.InkBlack)
            fillPx(33, 29 + by, 2, 2, DeadLinePalette.InkBlack)
        }

        // Tronco e patinhas com ciclo de caminhada em 4 quadros
        fillPx(18, 35 + by, 28, 16, DeadLinePalette.InkBlack)
        fillPx(19, 36 + by, 26, 14, DeadLinePalette.FurWhite)
        fillPx(24, 36 + by, 16, 2, DeadLinePalette.FurCreamShadow)

        val legLiftA = if (isWalking) (if (walkStepFrame % 4 == 0) -3 else if (walkStepFrame % 4 == 2) 1 else 0) else 0
        val legLiftB = if (isWalking) (if (walkStepFrame % 4 == 2) -3 else if (walkStepFrame % 4 == 0) 1 else 0) else 0
        fillPx(19, 50 + legLiftA, 6, 8, DeadLinePalette.InkBlack)
        fillPx(20, 50 + legLiftA, 4, 7, DeadLinePalette.FurWhite)
        fillPx(27, 50 + legLiftB, 6, 8, DeadLinePalette.InkBlack)
        fillPx(28, 50 + legLiftB, 4, 7, DeadLinePalette.FurWhite)
        fillPx(37, 50 + legLiftA, 6, 8, DeadLinePalette.InkBlack)
        fillPx(38, 50 + legLiftA, 4, 7, DeadLinePalette.FurWhite)

        // Patinha dianteira segurando e brincando com o novelo colorido da meta selecionada
        val pawWave = if (frame.tailFrameIndex % 2 == 0) -2 else 1
        val handX = 42
        val handY = 42 + by + pawWave
        fillPx(handX, handY, 8, 6, DeadLinePalette.InkBlack)
        fillPx(handX + 1, handY + 1, 6, 4, DeadLinePalette.FurWhite)

        // Novelo colorido na mao da gatinha
        val yarnX = handX + 5
        val yarnY = (handY + 1).coerceIn(0, 52)
        fillPx(yarnX, yarnY, 11, 11, DeadLinePalette.InkBlack)
        fillPx(yarnX + 1, yarnY + 1, 9, 9, heldYarnMainColor)
        fillPx(yarnX + 3, yarnY + 4, 5, 3, heldYarnShadowColor)

        // 3. Camada Olhos (independente)
        when (frame.eyeVariant) {
            CatEyeVariant.NORMAL -> {
                fillPx(24, 24 + by, 2, 4, DeadLinePalette.InkBlack)
                fillPx(38, 24 + by, 2, 4, DeadLinePalette.InkBlack)
            }
            CatEyeVariant.BLINK, CatEyeVariant.SLEEPY -> {
                fillPx(23, 26 + by, 4, 1, DeadLinePalette.InkBlack)
                fillPx(37, 26 + by, 4, 1, DeadLinePalette.InkBlack)
            }
            CatEyeVariant.HAPPY_ARC -> {
                fillPx(23, 24 + by, 4, 2, DeadLinePalette.InkBlack)
                fillPx(37, 24 + by, 4, 2, DeadLinePalette.InkBlack)
            }
            CatEyeVariant.LOOK_WATCH -> {
                fillPx(23, 24 + by, 2, 4, DeadLinePalette.InkBlack)
                fillPx(37, 24 + by, 2, 4, DeadLinePalette.InkBlack)
                // Reloginho na pata esquerda (pawAnchor)
                fillPx(frame.pawAnchor.x - 6, frame.pawAnchor.y - 8, 6, 6, DeadLinePalette.GoldenYarn)
            }
        }

        // 4. Camada Acessorios (ancorados em head_anchor ou neck_anchor)
        if ("laco_rosa" in equippedAccessories) {
            val hx = frame.headAnchor.x
            val hy = frame.headAnchor.y
            fillPx(hx + 5, hy - 5, 7, 5, DeadLinePalette.InkBlack)
            fillPx(hx + 6, hy - 4, 5, 3, DeadLinePalette.YarnPink)
        }
        if ("chapeu_mago" in equippedAccessories) {
            val hx = frame.headAnchor.x
            val hy = frame.headAnchor.y
            fillPx(hx - 8, hy - 6, 16, 3, DeadLinePalette.CozyPurple)
            fillPx(hx - 4, hy - 12, 8, 6, DeadLinePalette.CozyPurple)
        }
        if ("cachecol_dourado" in equippedAccessories) {
            val nx = frame.neckAnchor.x
            val ny = frame.neckAnchor.y
            fillPx(nx - 10, ny, 20, 4, DeadLinePalette.GoldenYarn)
        }

        return bitmap
    }
}
