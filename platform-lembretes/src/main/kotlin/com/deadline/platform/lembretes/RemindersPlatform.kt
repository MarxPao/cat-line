package com.deadline.platform.lembretes

import android.app.AlarmManager
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.work.CoroutineWorker
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.WorkerParameters
import com.deadline.core.domain.model.CheckInCommand
import com.deadline.core.domain.model.CheckInOrigin
import com.deadline.core.domain.model.Occurrence
import com.deadline.core.domain.model.OccurrenceId
import com.deadline.core.domain.port.AlarmScheduler
import com.deadline.core.domain.port.DayRolloverHandler
import com.deadline.core.domain.port.OccurrenceRepository
import dagger.Binds
import dagger.Module
import dagger.hilt.EntryPoint
import dagger.hilt.InstallIn
import dagger.hilt.android.EntryPointAccessors
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch
import java.time.Clock
import java.util.concurrent.TimeUnit
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Implementacao real de `AlarmScheduler` (WP-08 · Secao 4 e Secao 8):
 * - Agenda alarmes exatos (`setExactAndAllowWhileIdle` quando permitido, fallback para `setAndAllowWhileIdle`)
 *   para o horario limite de cada ocorrencia.
 * - Cancela o alarme quando o compromisso e excluido ou feito antes do prazo.
 * - Nunca grava o titulo pessoal do compromisso em logs (AD-15 / AD-16).
 */
@Singleton
class AndroidExactAlarmScheduler @Inject constructor(
    @ApplicationContext private val context: Context,
    private val clock: Clock,
) : AlarmScheduler {

    private val alarmManager: AlarmManager? =
        context.getSystemService(Context.ALARM_SERVICE) as? AlarmManager

    override fun schedule(o: Occurrence) {
        val manager = alarmManager ?: return
        val triggerAtMillis = o.deadline.toEpochMilli()
        if (triggerAtMillis <= clock.instant().toEpochMilli()) return

        val pendingIntent = buildAlarmPendingIntent(
            context = context,
            occurrenceId = o.id.value,
            title = o.title,
            flags = PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        ) ?: return

        val canExact = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            manager.canScheduleExactAlarms()
        } else {
            true
        }

        if (canExact) {
            manager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAtMillis, pendingIntent)
        } else {
            manager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAtMillis, pendingIntent)
        }
    }

    override fun cancel(id: OccurrenceId) {
        val manager = alarmManager ?: return
        val pendingIntent = buildAlarmPendingIntent(
            context = context,
            occurrenceId = id.value,
            title = "",
            flags = PendingIntent.FLAG_NO_CREATE or PendingIntent.FLAG_IMMUTABLE,
        )
        if (pendingIntent != null) {
            manager.cancel(pendingIntent)
            pendingIntent.cancel()
        }
    }

    companion object {
        const val ACTION_SHOW_DEADLINE_NOTIFICATION = "com.deadline.action.SHOW_DEADLINE_NOTIFICATION"
        const val ACTION_MARK_OCCURRENCE_DONE = "com.deadline.action.MARK_OCCURRENCE_DONE"
        const val EXTRA_OCCURRENCE_ID = "extra_occurrence_id"
        const val EXTRA_OCCURRENCE_TITLE = "extra_occurrence_title"
        const val NOTIFICATION_CHANNEL_ID = "deadline_reminders_channel"

        internal fun buildAlarmPendingIntent(
            context: Context,
            occurrenceId: String,
            title: String,
            flags: Int,
        ): PendingIntent? {
            val intent = Intent(context, ReminderActionReceiver::class.java).apply {
                action = ACTION_SHOW_DEADLINE_NOTIFICATION
                putExtra(EXTRA_OCCURRENCE_ID, occurrenceId)
                putExtra(EXTRA_OCCURRENCE_TITLE, title)
            }
            return PendingIntent.getBroadcast(
                context,
                occurrenceId.hashCode(),
                intent,
                flags,
            )
        }
    }
}

@EntryPoint
@InstallIn(SingletonComponent::class)
interface ReminderReceiverEntryPoint {
    fun occurrenceRepository(): OccurrenceRepository
    fun dayRolloverHandler(): DayRolloverHandler
    fun clock(): Clock
}

/**
 * Receptor de alarmes, acao rapida "Feito" na notificacao e reinicio do aparelho (`BOOT_COMPLETED`).
 */
class ReminderActionReceiver : BroadcastReceiver() {

    override fun onReceive(context: Context, intent: Intent?) {
        val action = intent?.action ?: return
        val appContext = context.applicationContext
        val entryPoint = EntryPointAccessors.fromApplication(
            appContext,
            ReminderReceiverEntryPoint::class.java,
        )

        when (action) {
            AndroidExactAlarmScheduler.ACTION_SHOW_DEADLINE_NOTIFICATION -> {
                val occId = intent.getStringExtra(AndroidExactAlarmScheduler.EXTRA_OCCURRENCE_ID) ?: return
                val title = intent.getStringExtra(AndroidExactAlarmScheduler.EXTRA_OCCURRENCE_TITLE)
                    ?: "Hora do compromisso, mamãe!"
                showNotificationWithDoneAction(appContext, occId, title)
            }

            AndroidExactAlarmScheduler.ACTION_MARK_OCCURRENCE_DONE -> {
                val occId = intent.getStringExtra(AndroidExactAlarmScheduler.EXTRA_OCCURRENCE_ID) ?: return
                val pendingResult = goAsync()
                CoroutineScope(SupervisorJob() + Dispatchers.IO).launch {
                    try {
                        entryPoint.occurrenceRepository().registerCheckIn(
                            CheckInCommand(
                                occurrenceId = OccurrenceId(occId),
                                checkedInAt = entryPoint.clock().instant(),
                                origin = CheckInOrigin.NOTIFICACAO,
                            )
                        )
                        val nm = appContext.getSystemService(Context.NOTIFICATION_SERVICE) as? NotificationManager
                        nm?.cancel(occId.hashCode())
                    } finally {
                        pendingResult.finish()
                    }
                }
            }

            Intent.ACTION_BOOT_COMPLETED,
            Intent.ACTION_MY_PACKAGE_REPLACED,
            -> {
                val pendingResult = goAsync()
                CoroutineScope(SupervisorJob() + Dispatchers.IO).launch {
                    try {
                        entryPoint.dayRolloverHandler().runRolloverAndMaterialize()
                        DailyRolloverWorker.enqueuePeriodic(appContext)
                    } finally {
                        pendingResult.finish()
                    }
                }
            }
        }
    }

    private fun showNotificationWithDoneAction(
        context: Context,
        occurrenceId: String,
        title: String,
    ) {
        val nm = context.getSystemService(Context.NOTIFICATION_SERVICE) as? NotificationManager ?: return
        val channel = NotificationChannel(
            AndroidExactAlarmScheduler.NOTIFICATION_CHANNEL_ID,
            "Lembretes da Gatinha",
            NotificationManager.IMPORTANCE_HIGH,
        ).apply {
            description = "Avisos de prazos da agenda com botão rápido Feito"
        }
        nm.createNotificationChannel(channel)

        val doneIntent = Intent(context, ReminderActionReceiver::class.java).apply {
            action = AndroidExactAlarmScheduler.ACTION_MARK_OCCURRENCE_DONE
            putExtra(AndroidExactAlarmScheduler.EXTRA_OCCURRENCE_ID, occurrenceId)
        }
        val donePendingIntent = PendingIntent.getBroadcast(
            context,
            ("done:$occurrenceId").hashCode(),
            doneIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )

        val notification = NotificationCompat.Builder(context, AndroidExactAlarmScheduler.NOTIFICATION_CHANNEL_ID)
            .setSmallIcon(android.R.drawable.ic_popup_reminder)
            .setContentTitle("Miau, mamãe! O novelo está desenrolando")
            .setContentText(title)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setAutoCancel(true)
            .addAction(
                android.R.drawable.checkbox_on_background,
                "Feito!",
                donePendingIntent,
            )
            .build()

        nm.notify(occurrenceId.hashCode(), notification)
    }
}

/**
 * Worker de segundo plano que materializa as ocorrencias 14 dias a frente e fecha o dia logico (WP-08).
 */
class DailyRolloverWorker(
    appContext: Context,
    params: WorkerParameters,
) : CoroutineWorker(appContext, params) {

    override suspend fun doWork(): Result = runCatching {
        val entryPoint = EntryPointAccessors.fromApplication(
            applicationContext,
            ReminderReceiverEntryPoint::class.java,
        )
        entryPoint.dayRolloverHandler().runRolloverAndMaterialize()
        Result.success()
    }.getOrElse {
        Result.retry()
    }

    companion object {
        private const val UNIQUE_WORK_NAME = "deadline_daily_rollover_work"
        private const val WEEKLY_BACKUP_REMINDER_WORK = "deadline_weekly_backup_reminder"

        fun enqueuePeriodic(context: Context) {
            val workManager = WorkManager.getInstance(context)
            val rolloverRequest = PeriodicWorkRequestBuilder<DailyRolloverWorker>(6, TimeUnit.HOURS)
                .build()
            workManager.enqueueUniquePeriodicWork(
                UNIQUE_WORK_NAME,
                ExistingPeriodicWorkPolicy.KEEP,
                rolloverRequest,
            )

            val backupReminderRequest = PeriodicWorkRequestBuilder<WeeklyBackupReminderWorker>(7, TimeUnit.DAYS)
                .build()
            workManager.enqueueUniquePeriodicWork(
                WEEKLY_BACKUP_REMINDER_WORK,
                ExistingPeriodicWorkPolicy.KEEP,
                backupReminderRequest,
            )
        }
    }
}

/**
 * Lembrete semanal amigavel da gatinha para exportar o backup JSON (WP-13 · Secao 24).
 */
class WeeklyBackupReminderWorker(
    appContext: Context,
    params: WorkerParameters,
) : CoroutineWorker(appContext, params) {

    override suspend fun doWork(): Result {
        val nm = applicationContext.getSystemService(Context.NOTIFICATION_SERVICE) as? NotificationManager
            ?: return Result.success()
        val channel = NotificationChannel(
            AndroidExactAlarmScheduler.NOTIFICATION_CHANNEL_ID,
            "Lembretes da Gatinha",
            NotificationManager.IMPORTANCE_DEFAULT,
        )
        nm.createNotificationChannel(channel)

        val notification = NotificationCompat.Builder(
            applicationContext,
            AndroidExactAlarmScheduler.NOTIFICATION_CHANNEL_ID,
        )
            .setSmallIcon(android.R.drawable.ic_menu_save)
            .setContentTitle("Miau, mamãe! Hora de guardar nosso novelo")
            .setContentText("Faz uma semaninha! Que tal exportar um backup dos seus dados?")
            .setAutoCancel(true)
            .build()

        nm.notify(777001, notification)
        return Result.success()
    }
}

@Module
@InstallIn(SingletonComponent::class)
abstract class RemindersPlatformModule {
    @Binds
    @Singleton
    abstract fun bindAlarmScheduler(impl: AndroidExactAlarmScheduler): AlarmScheduler
}
