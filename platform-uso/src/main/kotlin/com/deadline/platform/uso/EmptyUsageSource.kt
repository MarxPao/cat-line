package com.deadline.platform.uso

import com.deadline.core.domain.port.UsageEvent
import com.deadline.core.domain.port.UsageSource
import java.time.Instant
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class EmptyUsageSource @Inject constructor() : UsageSource {
    override suspend fun readEvents(from: Instant, to: Instant): List<UsageEvent> = emptyList()
}
