package com.deadline.core.game.atlas

import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json

@Serializable
data class AsepriteRect(
    val x: Int,
    val y: Int,
    val w: Int,
    val h: Int,
)

@Serializable
data class AsepriteSize(
    val w: Int,
    val h: Int,
)

@Serializable
data class AsepriteAnchorPoint(
    val x: Int,
    val y: Int,
)

@Serializable
data class AsepriteFrameEntry(
    val frame: AsepriteRect,
    val rotated: Boolean = false,
    val trimmed: Boolean = false,
    val spriteSourceSize: AsepriteRect,
    val sourceSize: AsepriteSize,
    val duration: Int = 100,
    val anchors: Map<String, AsepriteAnchorPoint> = mapOf(
        "head_anchor" to AsepriteAnchorPoint(32, 18),
        "neck_anchor" to AsepriteAnchorPoint(32, 34),
        "tail_anchor" to AsepriteAnchorPoint(44, 48),
        "paw_anchor" to AsepriteAnchorPoint(24, 54),
    ),
)

@Serializable
data class AsepriteFrameTag(
    val name: String,
    val from: Int,
    val to: Int,
    val direction: String = "forward",
)

@Serializable
data class AsepriteMeta(
    val image: String = "cat_atlas.png",
    val size: AsepriteSize = AsepriteSize(3968, 64),
    val frameTags: List<AsepriteFrameTag> = emptyList(),
)

@Serializable
data class AsepriteAtlasDocument(
    val frames: Map<String, AsepriteFrameEntry>,
    val meta: AsepriteMeta,
)

/**
 * Carregador do formato JSON do Aseprite com fallback para o catalogo de 21 animacoes do MVP (WP-14 · AD-14).
 */
object AsepriteAtlasLoader {
    private val json = Json { ignoreUnknownKeys = true }

    val MVP_ANIMATION_SPECS: List<Triple<String, Int, Int>> = listOf(
        Triple("ociosa", 2, 8),
        Triple("andar", 4, 10),
        Triple("dormir", 2, 4),
        Triple("comer", 3, 8),
        Triple("higiene", 3, 8),
        Triple("lazer", 3, 8),
        Triple("estudar_ler", 3, 8),
        Triple("trabalhar", 3, 10),
        Triple("treinar", 4, 10),
        Triple("cuidar_casa", 3, 8),
        Triple("sair", 2, 8),
        Triple("feliz", 2, 8),
        Triple("comemorar", 4, 12),
        Triple("sonolenta", 3, 6),
        Triple("manhosa", 2, 6),
        Triple("olhar_relogio", 3, 8),
        Triple("espreguicar", 3, 8),
        Triple("lamber_se", 3, 8),
        Triple("brincar_novelo", 4, 10),
        Triple("ronronar", 2, 8),
        Triple("miar_falando", 2, 10),
    )

    fun parseJson(rawJson: String): AsepriteAtlasDocument =
        json.decodeFromString(AsepriteAtlasDocument.serializer(), rawJson)

    fun buildDefaultPlaceholderAtlas(): AsepriteAtlasDocument {
        val frames = linkedMapOf<String, AsepriteFrameEntry>()
        val tags = mutableListOf<AsepriteFrameTag>()
        var globalIdx = 0

        for ((tag, count, fps) in MVP_ANIMATION_SPECS) {
            val fromIdx = globalIdx
            val durationMs = 1000 / fps
            for (localIdx in 0 until count) {
                val bob = if (localIdx % 2 == 1) 1 else 0
                val jump = if (tag == "comemorar" && localIdx % 2 == 1) -3 else 0
                frames["cat_${tag}_$localIdx.aseprite"] = AsepriteFrameEntry(
                    frame = AsepriteRect(x = globalIdx * 64, y = 0, w = 64, h = 64),
                    spriteSourceSize = AsepriteRect(0, 0, 64, 64),
                    sourceSize = AsepriteSize(64, 64),
                    duration = durationMs,
                    anchors = mapOf(
                        "head_anchor" to AsepriteAnchorPoint(32, 16 + bob + jump),
                        "neck_anchor" to AsepriteAnchorPoint(32, 34 + bob + jump),
                        "tail_anchor" to AsepriteAnchorPoint(44, 48 + jump),
                        "paw_anchor" to AsepriteAnchorPoint(24, 54 + jump),
                    ),
                )
                globalIdx++
            }
            tags += AsepriteFrameTag(name = tag, from = fromIdx, to = globalIdx - 1)
        }

        return AsepriteAtlasDocument(
            frames = frames,
            meta = AsepriteMeta(
                image = "cat_atlas.png",
                size = AsepriteSize(globalIdx * 64, 64),
                frameTags = tags,
            ),
        )
    }
}
