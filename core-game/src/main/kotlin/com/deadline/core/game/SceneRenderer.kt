package com.deadline.core.game

import android.provider.Settings
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableLongStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.runtime.withFrameNanos
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.FilterQuality
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.IntOffset
import androidx.compose.ui.unit.IntSize
import androidx.compose.ui.unit.dp
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import androidx.lifecycle.compose.LocalLifecycleOwner
import com.deadline.core.domain.model.CatMood
import com.deadline.core.domain.model.RoutineCategory
import com.deadline.core.game.animator.CalicoSpriteBitmapFactory
import com.deadline.core.game.animator.LayeredCatAnimator
import com.deadline.core.game.audio.ChiptuneAudioEngine
import com.deadline.core.game.audio.ChiptuneSoundEffect
import com.deadline.core.ui.components.PixelSpeechBubble
import com.deadline.core.ui.theme.DeadLinePalette
import dagger.Binds
import dagger.Module
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import javax.inject.Inject
import javax.inject.Singleton
import kotlin.math.floor
import kotlin.math.hypot
import kotlin.math.max
import kotlin.math.roundToInt

data class SceneState(
    val catName: String = "Gatinha",
    val mood: CatMood = CatMood.FELIZ,
    val activeCategory: RoutineCategory = RoutineCategory.OCIOSO,
    val animationTag: String = "ociosa",
    val catVirtualX: Int = 90,
    val catVirtualY: Int = 230,
    val heldYarnColorHex: Long = 0xFFF0949E,
    val heldYarnShadowHex: Long = 0xFFAD5E65,
    val goalTimeWoundFraction: Float = 0.65f,
    val equippedAccessories: Set<String> = emptySet(),
    val unlockedFurniture: Set<String> = emptySet(),
    val speechBubbleText: String? = null,
    val onCatTapped: (() -> Unit)? = null,
    val onCatLongPressed: (() -> Unit)? = null,
)

/**
 * Porta de renderizacao da cena 8-bit de 180px virtuais com a gatinha 64x64 (Secao 20 · AD-12).
 */
interface SceneRenderer {
    @Composable
    fun Render(state: SceneState, modifier: Modifier)
}

/**
 * Calculo puro da escala inteira para a grade virtual de 180 px de largura (Secao 15 e Secao 20):
 * - 4x em 720 px, 6x em 1080 px, 8x em 1440 px, nunca fracionario para nao borrar o pixel art.
 */
object VirtualGridScaler {
    const val VIRTUAL_WIDTH_PX = 180
    const val CAT_SPRITE_SIZE_PX = 64

    fun computeIntegerScale(canvasWidthPx: Float): Int =
        max(1, floor(canvasWidthPx / VIRTUAL_WIDTH_PX.toFloat()).toInt())
}

/**
 * Implementacao de `SceneRenderer` em Compose Canvas (WP-15 · Secao 20):
 * - Grade virtual de 180 px de largura com escala inteira (`VirtualGridScaler.computeIntegerScale`).
 * - Camadas em ordem Y-sorting:
 *   1. Fundo da area (parede creme, janela, piso de madeira e tapete roxo)
 *   2. Moveis ordenados pela posicao vertical (`virtualY`)
 *   3. Gatinha de 64x64 px desenhada via `drawImage(..., filterQuality = FilterQuality.None)`
 *   4. Efeitos (novelo rolando / estrelinhas)
 *   5. HUD e balao de fala com maquina de escrever e blip chiptune
 * - Laco por `withFrameNanos`: logica a 30 ticks por segundo, pausando quando o app sai de cena
 *   (`ON_STOP`) e respeitando a opcao "remover animacoes" do Android (`ANIMATOR_DURATION_SCALE == 0`).
 */
@Singleton
class ComposeCanvasSceneRenderer @Inject constructor(
    private val audioEngine: ChiptuneAudioEngine,
) : SceneRenderer {

    private val catAnimator = LayeredCatAnimator()

    @Composable
    override fun Render(state: SceneState, modifier: Modifier) {
        val context = LocalContext.current
        val lifecycleOwner = LocalLifecycleOwner.current
        var isForeground by remember { mutableStateOf(true) }

        val animationsEnabled = remember(context) {
            runCatching {
                Settings.Global.getFloat(
                    context.contentResolver,
                    Settings.Global.ANIMATOR_DURATION_SCALE,
                    1f,
                ) > 0f
            }.getOrDefault(true)
        }

        DisposableEffect(lifecycleOwner) {
            val observer = LifecycleEventObserver { _, event ->
                when (event) {
                    Lifecycle.Event.ON_RESUME, Lifecycle.Event.ON_START -> isForeground = true
                    Lifecycle.Event.ON_PAUSE, Lifecycle.Event.ON_STOP -> {
                        isForeground = false
                        audioEngine.stopPurr()
                    }
                    else -> Unit
                }
            }
            lifecycleOwner.lifecycle.addObserver(observer)
            onDispose {
                lifecycleOwner.lifecycle.removeObserver(observer)
                audioEngine.stopPurr()
            }
        }

        var logicTick by remember { mutableLongStateOf(0L) }
        var elapsedMillis by remember { mutableLongStateOf(0L) }

        // Laco withFrameNanos a 30 ticks por segundo (33.3ms por tick), pausado quando fora de cena
        LaunchedEffect(isForeground, animationsEnabled) {
            if (!isForeground || !animationsEnabled) return@LaunchedEffect
            var startNanos = 0L
            var lastTickCount = -1L
            while (isForeground) {
                withFrameNanos { frameNanos ->
                    if (startNanos == 0L) startNanos = frameNanos
                    val elapsedMs = (frameNanos - startNanos) / 1_000_000L
                    elapsedMillis = elapsedMs
                    val currentTick = elapsedMs / 33L // 30 ticks/s
                    if (currentTick != lastTickCount) {
                        lastTickCount = currentTick
                        logicTick = currentTick
                    }
                }
            }
        }

        val waypoints = remember {
            listOf(
                88 to 112,
                38 to 80,
                138 to 82,
                132 to 106,
                128 to 126,
                46 to 124,
            )
        }
        val activeWaypointIdx = ((logicTick / 90L) % waypoints.size).toInt()
        val nextWaypointIdx = ((activeWaypointIdx + 1) % waypoints.size)
        val segmentProgress = ((logicTick % 90L).toFloat() / 60f).coerceIn(0f, 1f)
        val isWalkingNow = animationsEnabled && (logicTick % 90L) < 60L
        val walkStepFrame = ((logicTick / 4L) % 4L).toInt()

        val startWp = waypoints[activeWaypointIdx]
        val endWp = waypoints[nextWaypointIdx]
        val dynamicCatX = if (animationsEnabled) {
            (startWp.first + (endWp.first - startWp.first) * segmentProgress).roundToInt()
        } else {
            state.catVirtualX
        }
        val dynamicCatY = if (animationsEnabled) {
            (startWp.second + (endWp.second - startWp.second) * segmentProgress).roundToInt()
        } else {
            state.catVirtualY / 2
        }

        val heldMainColor = androidx.compose.ui.graphics.Color(state.heldYarnColorHex)
        val heldShadowColor = androidx.compose.ui.graphics.Color(state.heldYarnShadowHex)

        val compositeFrame = remember(state.animationTag, logicTick, animationsEnabled) {
            catAnimator.resolveCompositeFrame(
                animationTag = if (isWalkingNow) "caminhar" else state.animationTag,
                elapsedMillis = elapsedMillis,
                animationsEnabled = animationsEnabled,
            )
        }

        val catBitmap = remember(compositeFrame, state.equippedAccessories, state.heldYarnColorHex, isWalkingNow, walkStepFrame) {
            CalicoSpriteBitmapFactory.createCalicoFrameBitmap(
                frame = compositeFrame,
                equippedAccessories = state.equippedAccessories,
                heldYarnMainColor = heldMainColor,
                heldYarnShadowColor = heldShadowColor,
                isWalking = isWalkingNow,
                walkStepFrame = walkStepFrame,
            )
        }

        Column(
            modifier = modifier.fillMaxWidth(),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            state.speechBubbleText?.let { bubbleText ->
                PixelSpeechBubble(
                    text = bubbleText,
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(bottom = 6.dp),
                    typewriterEnabled = animationsEnabled,
                    onCharacterTyped = { audioEngine.playSpeechBlip() },
                )
            }

            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(260.dp)
                    .pointerInput(Unit) {
                        detectTapGestures(
                            onTap = {
                                audioEngine.playMeow(ChiptuneSoundEffect.MEOW_GREETING)
                                state.onCatTapped?.invoke()
                            },
                            onLongPress = {
                                audioEngine.startPurr()
                                state.onCatLongPressed?.invoke()
                            },
                        )
                    },
            ) {
                Canvas(modifier = Modifier.fillMaxSize()) {
                    val scale = VirtualGridScaler.computeIntegerScale(size.width)
                    val scenePixelWidth = VirtualGridScaler.VIRTUAL_WIDTH_PX * scale
                    val originX = ((size.width - scenePixelWidth) / 2f).coerceAtLeast(0f)
                    val virtualHeight = (size.height / scale).toInt().coerceAtLeast(180)

                    fun vRect(vx: Int, vy: Int, vw: Int, vh: Int, color: androidx.compose.ui.graphics.Color) {
                        drawRect(
                            color = color,
                            topLeft = Offset(originX + vx * scale, (vy * scale).toFloat()),
                            size = Size((vw * scale).toFloat(), (vh * scale).toFloat()),
                        )
                    }

                    // Camada 1: Fundo da area (visao 3/4 estilo Pokemon)
                    vRect(0, 0, 180, 56, DeadLinePalette.WallCream)
                    vRect(0, 56, 180, 2, DeadLinePalette.InkBlack)
                    vRect(0, 58, 180, virtualHeight - 58, DeadLinePalette.WoodFloor)
                    // Janela 8-bit na parede
                    vRect(74, 12, 32, 28, DeadLinePalette.InkBlack)
                    vRect(76, 14, 28, 24, DeadLinePalette.WindowBlue)
                    // Tapete central aconchegante
                    vRect(48, 86, 84, 52, DeadLinePalette.CozyPurple)

                    // Camada 2: Moveis das estacoes ordenados por Y (Y-sorting)
                    // Estante de estudo (y=42)
                    vRect(16, 26, 28, 30, DeadLinePalette.CalicoOrangeShadow)
                    vRect(18, 30, 24, 6, DeadLinePalette.LeafGreen)
                    // Escrivaninha de trabalho (y=44)
                    vRect(132, 34, 32, 22, DeadLinePalette.CalicoOrangeShadow)
                    vRect(140, 28, 14, 10, DeadLinePalette.WindowBlue)
                    // Tigelinha de comida (y=96)
                    vRect(142, 96, 14, 8, DeadLinePalette.AlertRed)
                    // Caminha redonda da gatinha (y=118)
                    vRect(130, 114, 34, 20, DeadLinePalette.YarnPink)

                    // Camada 3: Novelo do Tempo se enrolando conforme o tempo da meta esgota (canto esquerdo)
                    val spoolCx = 24
                    val spoolCy = 112
                    val spoolRadius = (4 + state.goalTimeWoundFraction.coerceIn(0.08f, 1f) * 8f).roundToInt()
                    val spoolDiam = spoolRadius * 2
                    vRect(spoolCx - 13, spoolCy + 8, 26, 5, DeadLinePalette.InkBlack)
                    vRect(spoolCx - spoolRadius - 1, spoolCy - spoolRadius - 1, spoolDiam + 2, spoolDiam + 2, DeadLinePalette.InkBlack)
                    vRect(spoolCx - spoolRadius, spoolCy - spoolRadius, spoolDiam, spoolDiam, heldMainColor)

                    // Camada 4: Gatinha de 64x64 px caminhando pelo ambiente com o novelo colorido na mao
                    val catTopLeftVirtualX = (dynamicCatX - 32).coerceIn(4, 180 - 68)
                    val catTopLeftVirtualY = (dynamicCatY - 48).coerceIn(24, virtualHeight - 68)

                    drawImage(
                        image = catBitmap,
                        srcOffset = IntOffset.Zero,
                        srcSize = IntSize(64, 64),
                        dstOffset = IntOffset(
                            (originX + catTopLeftVirtualX * scale).toInt(),
                            catTopLeftVirtualY * scale,
                        ),
                        dstSize = IntSize(64 * scale, 64 * scale),
                        filterQuality = FilterQuality.None,
                    )

                    // Camada 5: Fio ligando o novelo na patinha da gatinha ao novelo que se enrola no tempo
                    val pawYarnX = catTopLeftVirtualX + 52
                    val pawYarnY = catTopLeftVirtualY + 47
                    val threadSteps = 14
                    for (i in 0..threadSteps) {
                        val t = i.toFloat() / threadSteps.toFloat()
                        val tx = (pawYarnX + (spoolCx - pawYarnX) * t).roundToInt()
                        val ty = (pawYarnY + (spoolCy - pawYarnY) * t).roundToInt()
                        vRect(tx, ty, 2, 2, if (i % 3 == 0) heldShadowColor else heldMainColor)
                    }
                }
            }
        }
    }
}

@Module
@InstallIn(SingletonComponent::class)
abstract class CoreGameModule {
    @Binds
    @Singleton
    abstract fun bindSceneRenderer(impl: ComposeCanvasSceneRenderer): SceneRenderer
}
