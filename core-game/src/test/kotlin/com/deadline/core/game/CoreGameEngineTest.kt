package com.deadline.core.game

import com.deadline.core.game.animator.CatEyeVariant
import com.deadline.core.game.animator.LayeredCatAnimator
import com.deadline.core.game.atlas.AsepriteAtlasLoader
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class CoreGameEngineTest {

    @Test
    fun `VirtualGridScaler calcula escala inteira exata de 4x em 720, 6x em 1080 e 8x em 1440`() {
        assertEquals(4, VirtualGridScaler.computeIntegerScale(720f))
        assertEquals(6, VirtualGridScaler.computeIntegerScale(1080f))
        assertEquals(8, VirtualGridScaler.computeIntegerScale(1440f))
    }

    @Test
    fun `AsepriteAtlasLoader contem todas as 21 animacoes do MVP com pontos de ancoragem`() {
        val atlas = AsepriteAtlasLoader.buildDefaultPlaceholderAtlas()
        assertEquals(21, atlas.meta.frameTags.size)
        assertTrue(atlas.frames.values.all { "head_anchor" in it.anchors && "tail_anchor" in it.anchors })
    }

    @Test
    fun `LayeredCatAnimator respeita a opcao remover animacoes congelando no quadro zero`() {
        val animator = LayeredCatAnimator()
        val frozen = animator.resolveCompositeFrame(
            animationTag = "comemorar",
            elapsedMillis = 3_500L,
            animationsEnabled = false,
        )
        assertEquals(0, frozen.localFrameIndex)
        assertEquals(0, frozen.tailFrameIndex)
        assertEquals(CatEyeVariant.HAPPY_ARC, frozen.eyeVariant)
    }
}
