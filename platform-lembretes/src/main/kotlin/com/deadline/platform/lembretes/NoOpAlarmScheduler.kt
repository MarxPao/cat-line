package com.deadline.platform.lembretes

import com.deadline.core.domain.model.Occurrence
import com.deadline.core.domain.model.OccurrenceId
import com.deadline.core.domain.port.AlarmScheduler
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class NoOpAlarmScheduler @Inject constructor() : AlarmScheduler {
    override fun schedule(o: Occurrence) = Unit
    override fun cancel(id: OccurrenceId) = Unit
}
