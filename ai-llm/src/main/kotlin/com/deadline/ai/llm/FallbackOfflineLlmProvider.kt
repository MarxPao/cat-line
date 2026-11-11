package com.deadline.ai.llm

import com.deadline.core.domain.port.LlmChunk
import com.deadline.core.domain.port.LlmProvider
import com.deadline.core.domain.port.LlmRequest
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.flowOf
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class FallbackOfflineLlmProvider @Inject constructor() : LlmProvider {
    override fun stream(req: LlmRequest): Flow<LlmChunk> =
        flowOf(
            LlmChunk(
                textDelta = "Miau, mamãe! Estou aqui com você. Vamos um passinho de cada vez?",
                isComplete = true,
            )
        )

    override suspend fun testKey(): Result<Unit> = Result.success(Unit)
}
