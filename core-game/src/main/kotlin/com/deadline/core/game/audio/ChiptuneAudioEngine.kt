package com.deadline.core.game.audio

import android.content.Context
import android.media.AudioAttributes
import android.media.AudioFocusRequest
import android.media.AudioManager
import android.media.SoundPool
import dagger.hilt.android.qualifiers.ApplicationContext
import java.io.File
import java.nio.ByteBuffer
import java.nio.ByteOrder
import javax.inject.Inject
import javax.inject.Singleton
import kotlin.math.PI
import kotlin.math.sin

enum class ChiptuneSoundEffect {
    MEOW_GREETING,
    MEOW_CELEBRATE,
    MEOW_CURIOUS,
    PURR_LOOP,
    SPEECH_BLIP,
}

/**
 * Motor de audio chiptune 8-bit com `SoundPool`, foco de audio e volumes independentes
 * para Efeitos, Musica e Voz/Blip (WP-18 · Secao 15 e Secao 20):
 * - Gera os arquivos WAV 8-bit chiptune (3 miados, ronronar em loop e blip de fala por letra do balao)
 *   de forma deterministica por codigo e carrega no `SoundPool`.
 */
@Singleton
class ChiptuneAudioEngine @Inject constructor(
    @ApplicationContext private val context: Context,
) {
    private val audioManager: AudioManager? =
        context.getSystemService(Context.AUDIO_SERVICE) as? AudioManager

    private val soundPool: SoundPool by lazy {
        val attrs = AudioAttributes.Builder()
            .setUsage(AudioAttributes.USAGE_GAME)
            .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
            .build()
        SoundPool.Builder()
            .setMaxStreams(4)
            .setAudioAttributes(attrs)
            .build()
    }

    private val soundIds = mutableMapOf<ChiptuneSoundEffect, Int>()
    private var purrStreamId: Int = 0

    var sfxVolume: Float = 0.8f
    var voiceBlipVolume: Float = 0.6f
    var musicVolume: Float = 0.5f
    var isMuted: Boolean = false

    fun ensureLoaded() {
        if (soundIds.isNotEmpty()) return
        val dir = File(context.cacheDir, "chiptune_wav").apply { mkdirs() }

        val specs = mapOf(
            ChiptuneSoundEffect.MEOW_GREETING to generateSquareSweepWav(startHz = 520.0, endHz = 780.0, durationMs = 180),
            ChiptuneSoundEffect.MEOW_CELEBRATE to generateSquareSweepWav(startHz = 580.0, endHz = 980.0, durationMs = 240),
            ChiptuneSoundEffect.MEOW_CURIOUS to generateSquareSweepWav(startHz = 440.0, endHz = 660.0, durationMs = 160),
            ChiptuneSoundEffect.PURR_LOOP to generateSquareSweepWav(startHz = 95.0, endHz = 115.0, durationMs = 320),
            ChiptuneSoundEffect.SPEECH_BLIP to generateSquareSweepWav(startHz = 680.0, endHz = 720.0, durationMs = 35),
        )

        specs.forEach { (effect, bytes) ->
            val file = File(dir, "${effect.name.lowercase()}.wav")
            if (!file.exists()) {
                file.writeBytes(bytes)
            }
            soundIds[effect] = soundPool.load(file.absolutePath, 1)
        }
    }

    fun playMeow(effect: ChiptuneSoundEffect = ChiptuneSoundEffect.MEOW_GREETING) {
        if (isMuted) return
        ensureLoaded()
        requestTransientAudioFocus()
        val id = soundIds[effect] ?: return
        soundPool.play(id, sfxVolume, sfxVolume, 1, 0, 1f)
    }

    fun playSpeechBlip() {
        if (isMuted) return
        ensureLoaded()
        val id = soundIds[ChiptuneSoundEffect.SPEECH_BLIP] ?: return
        soundPool.play(id, voiceBlipVolume, voiceBlipVolume, 0, 0, 1f)
    }

    fun startPurr() {
        if (isMuted) return
        ensureLoaded()
        val id = soundIds[ChiptuneSoundEffect.PURR_LOOP] ?: return
        if (purrStreamId != 0) {
            soundPool.stop(purrStreamId)
        }
        purrStreamId = soundPool.play(id, sfxVolume * 0.7f, sfxVolume * 0.7f, 1, -1, 1f)
    }

    fun stopPurr() {
        if (purrStreamId != 0) {
            soundPool.stop(purrStreamId)
            purrStreamId = 0
        }
    }

    private fun requestTransientAudioFocus() {
        val am = audioManager ?: return
        val req = AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN_TRANSIENT_MAY_DUCK)
            .setAudioAttributes(
                AudioAttributes.Builder()
                    .setUsage(AudioAttributes.USAGE_GAME)
                    .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                    .build()
            )
            .build()
        am.requestAudioFocus(req)
    }

    companion object {
        private const val SAMPLE_RATE = 22_050

        /**
         * Sintetiza um arquivo RIFF/WAV PCM de 16 bits mono com onda quadrada 8-bit chiptune.
         */
        internal fun generateSquareSweepWav(
            startHz: Double,
            endHz: Double,
            durationMs: Int,
        ): ByteArray {
            val totalSamples = (SAMPLE_RATE * durationMs) / 1000
            val pcmData = ByteArray(totalSamples * 2)
            var phase = 0.0

            for (i in 0 until totalSamples) {
                val progress = i.toDouble() / totalSamples.coerceAtLeast(1).toDouble()
                val freq = startHz + (endHz - startHz) * progress
                val envelope = (1.0 - progress * 0.65).coerceIn(0.0, 1.0)
                phase += (2.0 * PI * freq) / SAMPLE_RATE
                val square = if (sin(phase) >= 0.0) 1.0 else -1.0
                val sampleShort = (square * envelope * 9_000).toInt().toShort()
                pcmData[i * 2] = (sampleShort.toInt() and 0xFF).toByte()
                pcmData[i * 2 + 1] = ((sampleShort.toInt() shr 8) and 0xFF).toByte()
            }

            val header = ByteBuffer.allocate(44).order(ByteOrder.LITTLE_ENDIAN).apply {
                put("RIFF".toByteArray(Charsets.US_ASCII))
                putInt(36 + pcmData.size)
                put("WAVE".toByteArray(Charsets.US_ASCII))
                put("fmt ".toByteArray(Charsets.US_ASCII))
                putInt(16) // Subchunk1Size PCM
                putShort(1) // AudioFormat PCM = 1
                putShort(1) // Mono
                putInt(SAMPLE_RATE)
                putInt(SAMPLE_RATE * 2)
                putShort(2) // BlockAlign
                putShort(16) // BitsPerSample
                put("data".toByteArray(Charsets.US_ASCII))
                putInt(pcmData.size)
            }.array()

            return header + pcmData
        }
    }
}
