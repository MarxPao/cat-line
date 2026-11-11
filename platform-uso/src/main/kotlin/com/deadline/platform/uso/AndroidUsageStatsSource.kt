package com.deadline.platform.uso

import android.app.usage.UsageEvents
import android.app.usage.UsageStatsManager
import android.content.Context
import androidx.work.CoroutineWorker
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.WorkerParameters
import com.deadline.core.domain.port.FocusControlRepository
import com.deadline.core.domain.port.UsageEvent
import com.deadline.core.domain.port.UsageSource
import dagger.Binds
import dagger.Module
import dagger.hilt.EntryPoint
import dagger.hilt.InstallIn
import dagger.hilt.android.EntryPointAccessors
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import java.time.Instant
import java.util.concurrent.TimeUnit
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Implementacao de `UsageSource` lendo `UsageStatsManager.queryEvents` (WP-28 · Secao 4 e Secao 22).
 */
@Singleton
class AndroidUsageStatsSource @Inject constructor(
    @ApplicationContext private val context: Context,
) : UsageSource {

    override suspend fun readEvents(from: Instant, to: Instant): List<UsageEvent> {
        val manager = context.getSystemService(Context.USAGE_STATS_SERVICE) as? UsageStatsManager
            ?: return emptyList()

        return runCatching {
            val rawEvents = manager.queryEvents(from.toEpochMilli(), to.toEpochMilli())
            val event = UsageEvents.Event()
            val lastResumeByPkg = mutableMapOf<String, Long>()
            val results = mutableListOf<UsageEvent>()

            while (rawEvents.hasNextEvent()) {
                rawEvents.getNextEvent(event)
                val pkg = event.packageName ?: continue
                when (event.eventType) {
                    UsageEvents.Event.ACTIVITY_RESUMED -> {
                        lastResumeByPkg[pkg] = event.timeStamp
                    }
                    UsageEvents.Event.ACTIVITY_PAUSED,
                    UsageEvents.Event.ACTIVITY_STOPPED,
                    -> {
                        val startMillis = lastResumeByPkg.remove(pkg) ?: continue
                        val duration = (event.timeStamp - startMillis).coerceAtLeast(0L)
                        if (duration > 500L) {
                            results += UsageEvent(
                                packageName = pkg,
                                occurredAt = Instant.ofEpochMilli(startMillis),
                                foregroundMillis = duration,
                            )
                        }
                    }
                }
            }
            results
        }.getOrDefault(emptyList())
    }
}

@EntryPoint
@InstallIn(SingletonComponent::class)
interface UsageWorkerEntryPoint {
    fun focusControlRepository(): FocusControlRepository
}

/**
 * Tarefa em segundo plano a cada 15 minutos que amostra o uso de apps e mantem retencao de 180 dias (WP-28 · Secao 22).
 */
class UsageSamplingWorker(
    appContext: Context,
    params: WorkerParameters,
) : CoroutineWorker(appContext, params) {

    override suspend fun doWork(): Result = runCatching {
        val entryPoint = EntryPointAccessors.fromApplication(
            applicationContext,
            UsageWorkerEntryPoint::class.java,
        )
        entryPoint.focusControlRepository().sampleRecentUsageEvents()
        Result.success()
    }.getOrElse {
        Result.success()
    }

    companion object {
        private const val WORK_NAME = "deadline_usage_sampling_15m"

        fun enqueuePeriodic(context: Context) {
            val request = PeriodicWorkRequestBuilder<UsageSamplingWorker>(15, TimeUnit.MINUTES)
                .build()
            WorkManager.getInstance(context).enqueueUniquePeriodicWork(
                WORK_NAME,
                ExistingPeriodicWorkPolicy.KEEP,
                request,
            )
        }
    }
}

@Module
@InstallIn(SingletonComponent::class)
abstract class UsagePlatformModule {
    @Binds
    @Singleton
    abstract fun bindUsageSource(impl: AndroidUsageStatsSource): UsageSource
}
