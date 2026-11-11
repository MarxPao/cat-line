package com.deadline.ai.llm

import android.content.Context
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import com.deadline.core.domain.port.LlmChunk
import com.deadline.core.domain.port.LlmProvider
import com.deadline.core.domain.port.LlmProviderFamily
import com.deadline.core.domain.port.LlmRequest
import com.deadline.core.domain.port.SecretVault
import dagger.Binds
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.flow
import kotlinx.coroutines.flow.flowOn
import kotlinx.coroutines.withContext
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.buildJsonArray
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import java.io.File
import java.security.KeyStore
import java.util.concurrent.TimeUnit
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Cofre de segredos usando Android Keystore (AES-GCM 256 bits) fora do backup do sistema (WP-24 · AD-16).
 * Nunca registra chaves em Log.
 */
@Singleton
class AndroidKeystoreSecretVault @Inject constructor(
    @ApplicationContext private val context: Context,
) : SecretVault {

    private val vaultDir: File by lazy {
        File(context.noBackupFilesDir, "deadline_vault").apply { mkdirs() }
    }

    override suspend fun put(name: String, v: ByteArray) = withContext(Dispatchers.IO) {
        val secretKey = getOrCreateHardwareBackedKey()
        val cipher = Cipher.getInstance(TRANSFORMATION)
        cipher.init(Cipher.ENCRYPT_MODE, secretKey)
        val iv = cipher.iv
        val cipherText = cipher.doFinal(v)

        val target = File(vaultDir, sanitizeFileName(name))
        target.outputStream().use { out ->
            out.write(iv.size)
            out.write(iv)
            out.write(cipherText)
        }
    }

    override suspend fun get(name: String): ByteArray? = withContext(Dispatchers.IO) {
        val target = File(vaultDir, sanitizeFileName(name))
        if (!target.exists()) return@withContext null
        runCatching {
            val allBytes = target.readBytes()
            if (allBytes.size < 2) return@runCatching null
            val ivSize = allBytes[0].toInt() and 0xFF
            if (allBytes.size <= 1 + ivSize) return@runCatching null
            val iv = allBytes.copyOfRange(1, 1 + ivSize)
            val encrypted = allBytes.copyOfRange(1 + ivSize, allBytes.size)

            val secretKey = getOrCreateHardwareBackedKey()
            val cipher = Cipher.getInstance(TRANSFORMATION)
            cipher.init(Cipher.DECRYPT_MODE, secretKey, GCMParameterSpec(128, iv))
            cipher.doFinal(encrypted)
        }.getOrNull()
    }

    private fun getOrCreateHardwareBackedKey(): SecretKey {
        val keyStore = KeyStore.getInstance(ANDROID_KEYSTORE).apply { load(null) }
        val existing = keyStore.getEntry(MASTER_KEY_ALIAS, null) as? KeyStore.SecretKeyEntry
        if (existing != null) return existing.secretKey

        val keyGenerator = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, ANDROID_KEYSTORE)
        val spec = KeyGenParameterSpec.Builder(
            MASTER_KEY_ALIAS,
            KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT,
        )
            .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
            .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
            .setKeySize(256)
            .build()
        keyGenerator.init(spec)
        return keyGenerator.generateKey()
    }

    private fun sanitizeFileName(name: String): String =
        name.replace(Regex("[^a-zA-Z0-9._-]"), "_") + ".enc"

    companion object {
        private const val ANDROID_KEYSTORE = "AndroidKeyStore"
        private const val MASTER_KEY_ALIAS = "deadline_master_aes_gcm_key"
        private const val TRANSFORMATION = "AES/GCM/NoPadding"
    }
}

/**
 * Roteador BYOK com os 3 adaptadores de familia de API (WP-24 · AD-13 e Secao 21):
 * 1. Google Gemini (`generativelanguage.googleapis.com`)
 * 2. Anthropic (`api.anthropic.com/v1/messages`)
 * 3. OpenAI-Compatible (`api.openai.com/v1/chat/completions` / OpenRouter)
 *
 * Sem chave ou sem internet, cai silenciosamente para as falas de reserva por humor.
 */
@Singleton
class ByokRoutingLlmProvider @Inject constructor(
    private val secretVault: SecretVault,
    private val httpClient: OkHttpClient,
) : LlmProvider {

    private val json = Json { ignoreUnknownKeys = true }
    private val jsonMediaType = "application/json; charset=utf-8".toMediaType()

    override fun stream(req: LlmRequest): Flow<LlmChunk> = flow {
        val apiKey = secretVault.get("llm_byok_api_key")?.let { String(it, Charsets.UTF_8) }?.trim()
        if (apiKey.isNullOrEmpty()) {
            emit(
                LlmChunk(
                    textDelta = "Miau, mamãe! Estou no modo offline, mas estou aqui torcendo por você!",
                    isComplete = true,
                    estimatedTokensUsed = 0,
                )
            )
            return@flow
        }

        val family = secretVault.get("llm_byok_provider")
            ?.let { String(it, Charsets.UTF_8) }
            ?.let { runCatching { LlmProviderFamily.valueOf(it) }.getOrNull() }
            ?: LlmProviderFamily.GEMINI

        val model = secretVault.get("llm_byok_model")
            ?.let { String(it, Charsets.UTF_8) }
            ?.takeIf { it.isNotBlank() }
            ?: defaultModelFor(family)

        val httpRequest = when (family) {
            LlmProviderFamily.GEMINI -> buildGeminiRequest(apiKey, model, req)
            LlmProviderFamily.ANTHROPIC -> buildAnthropicRequest(apiKey, model, req)
            LlmProviderFamily.OPENAI_COMPATIBLE -> buildOpenAiRequest(apiKey, model, req)
        }

        val responseText = httpClient.newCall(httpRequest).execute().use { resp ->
            if (!resp.isSuccessful) {
                error("HTTP ${resp.code}")
            }
            val rawBody = resp.body?.string().orEmpty()
            extractContentFromResponse(family, rawBody)
        }

        // Emite em pequenos pedacos para alimentar o balao de maquina de escrever em fluxo
        val words = responseText.chunked(24)
        val estimatedTokens = (req.systemPrompt.length + responseText.length) / 4
        words.forEachIndexed { idx, part ->
            val isLast = idx == words.lastIndex
            emit(
                LlmChunk(
                    textDelta = part,
                    isComplete = isLast,
                    estimatedTokensUsed = if (isLast) estimatedTokens else 0,
                )
            )
        }
    }.flowOn(Dispatchers.IO)

    override suspend fun testKey(): Result<Unit> = withContext(Dispatchers.IO) {
        runCatching {
            val chunks = mutableListOf<LlmChunk>()
            stream(
                LlmRequest(
                    systemPrompt = "Responda apenas: Miau OK",
                    messages = listOf(com.deadline.core.domain.port.LlmMessage("user", "Teste de chave")),
                    maxOutputTokens = 16,
                )
            ).collect { chunks += it }
            require(chunks.isNotEmpty() && chunks.sumOf { it.estimatedTokensUsed } > 0) {
                "Configure uma chave de API válida antes de testar."
            }
        }
    }

    private fun defaultModelFor(family: LlmProviderFamily): String = when (family) {
        LlmProviderFamily.GEMINI -> "gemini-2.5-flash"
        LlmProviderFamily.ANTHROPIC -> "claude-3-5-haiku-latest"
        LlmProviderFamily.OPENAI_COMPATIBLE -> "gpt-4o-mini"
    }

    private fun buildGeminiRequest(apiKey: String, model: String, req: LlmRequest): Request {
        val url = "https://generativelanguage.googleapis.com/v1beta/models/$model:generateContent?key=$apiKey"
        val payload = buildJsonObject {
            put(
                "systemInstruction",
                buildJsonObject {
                    put(
                        "parts",
                        buildJsonArray {
                            add(buildJsonObject { put("text", JsonPrimitive(req.systemPrompt)) })
                        }
                    )
                }
            )
            put(
                "contents",
                buildJsonArray {
                    req.messages.forEach { msg ->
                        add(
                            buildJsonObject {
                                put("role", JsonPrimitive(if (msg.role == "assistant") "model" else "user"))
                                put(
                                    "parts",
                                    buildJsonArray {
                                        add(buildJsonObject { put("text", JsonPrimitive(msg.content)) })
                                    }
                                )
                            }
                        )
                    }
                }
            )
            put(
                "generationConfig",
                buildJsonObject {
                    put("maxOutputTokens", JsonPrimitive(req.maxOutputTokens))
                    if (req.expectJsonSchema) {
                        put("responseMimeType", JsonPrimitive("application/json"))
                    }
                }
            )
        }
        return Request.Builder()
            .url(url)
            .post(payload.toString().toRequestBody(jsonMediaType))
            .build()
    }

    private fun buildAnthropicRequest(apiKey: String, model: String, req: LlmRequest): Request {
        val payload = buildJsonObject {
            put("model", JsonPrimitive(model))
            put("max_tokens", JsonPrimitive(req.maxOutputTokens))
            put("system", JsonPrimitive(req.systemPrompt))
            put(
                "messages",
                buildJsonArray {
                    req.messages.forEach { msg ->
                        add(
                            buildJsonObject {
                                put("role", JsonPrimitive(msg.role))
                                put("content", JsonPrimitive(msg.content))
                            }
                        )
                    }
                }
            )
        }
        return Request.Builder()
            .url("https://api.anthropic.com/v1/messages")
            .addHeader("x-api-key", apiKey)
            .addHeader("anthropic-version", "2023-06-01")
            .post(payload.toString().toRequestBody(jsonMediaType))
            .build()
    }

    private fun buildOpenAiRequest(apiKey: String, model: String, req: LlmRequest): Request {
        val payload = buildJsonObject {
            put("model", JsonPrimitive(model))
            put("max_tokens", JsonPrimitive(req.maxOutputTokens))
            if (req.expectJsonSchema) {
                put("response_format", buildJsonObject { put("type", JsonPrimitive("json_object")) })
            }
            put(
                "messages",
                buildJsonArray {
                    add(
                        buildJsonObject {
                            put("role", JsonPrimitive("system"))
                            put("content", JsonPrimitive(req.systemPrompt))
                        }
                    )
                    req.messages.forEach { msg ->
                        add(
                            buildJsonObject {
                                put("role", JsonPrimitive(msg.role))
                                put("content", JsonPrimitive(msg.content))
                            }
                        )
                    }
                }
            )
        }
        return Request.Builder()
            .url("https://api.openai.com/v1/chat/completions")
            .addHeader("Authorization", "Bearer $apiKey")
            .post(payload.toString().toRequestBody(jsonMediaType))
            .build()
    }

    private fun extractContentFromResponse(family: LlmProviderFamily, rawBody: String): String =
        runCatching {
            val root: JsonObject = json.decodeFromString(JsonObject.serializer(), rawBody)
            when (family) {
                LlmProviderFamily.GEMINI -> {
                    val candidates: JsonArray = root["candidates"]?.jsonArray ?: return@runCatching ""
                    val content = candidates.firstOrNull()?.jsonObject?.get("content")?.jsonObject
                    val parts = content?.get("parts")?.jsonArray
                    parts?.firstOrNull()?.jsonObject?.get("text")?.jsonPrimitive?.content.orEmpty()
                }
                LlmProviderFamily.ANTHROPIC -> {
                    val content = root["content"]?.jsonArray
                    content?.firstOrNull()?.jsonObject?.get("text")?.jsonPrimitive?.content.orEmpty()
                }
                LlmProviderFamily.OPENAI_COMPATIBLE -> {
                    val choices = root["choices"]?.jsonArray
                    val msg = choices?.firstOrNull()?.jsonObject?.get("message")?.jsonObject
                    msg?.get("content")?.jsonPrimitive?.content.orEmpty()
                }
            }
        }.getOrDefault("")
}

@Module
@InstallIn(SingletonComponent::class)
abstract class AiLlmModule {

    @Binds
    @Singleton
    abstract fun bindSecretVault(impl: AndroidKeystoreSecretVault): SecretVault

    @Binds
    @Singleton
    abstract fun bindLlmProvider(impl: ByokRoutingLlmProvider): LlmProvider

    companion object {
        @Provides
        @Singleton
        fun provideOkHttpClient(): OkHttpClient =
            OkHttpClient.Builder()
                .connectTimeout(15, TimeUnit.SECONDS)
                .readTimeout(30, TimeUnit.SECONDS)
                .build()
    }
}
