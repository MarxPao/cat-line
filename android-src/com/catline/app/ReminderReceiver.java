package com.catline.app;

import android.app.NotificationManager;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.util.Log;

/** Recebe alarmes de aviso, cliques em "Feito" e o boot do aparelho. */
public class ReminderReceiver extends BroadcastReceiver {
    private static final String TAG = "CatLineReminderRcvr";

    @Override
    public void onReceive(Context context, Intent intent) {
        if (intent == null || intent.getAction() == null) return;
        String action = intent.getAction();

        if (NotificationHelper.ACTION_TRIGGER_REMINDER.equals(action)) {
            NotificationHelper.showNotification(context,
                    intent.getStringExtra(NotificationHelper.EXTRA_TASK_ID),
                    intent.getStringExtra(NotificationHelper.EXTRA_TASK_TITLE),
                    intent.getStringExtra(NotificationHelper.EXTRA_TASK_TIME),
                    intent.getStringExtra(NotificationHelper.EXTRA_KIND),
                    intent.getStringExtra(NotificationHelper.EXTRA_COLOR));

        } else if (NotificationHelper.ACTION_COMPLETE_TASK.equals(action)) {
            String id = intent.getStringExtra(NotificationHelper.EXTRA_TASK_ID);
            String title = intent.getStringExtra(NotificationHelper.EXTRA_TASK_TITLE);
            String color = intent.getStringExtra(NotificationHelper.EXTRA_COLOR);
            if (id != null) {
                NotificationManager nm = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
                if (nm != null) {
                    for (String k : new String[]{NotificationHelper.KIND_PRE_DAY, NotificationHelper.KIND_PRE_HOUR,
                            NotificationHelper.KIND_NOW, NotificationHelper.KIND_OVERDUE}) {
                        nm.cancel(Math.abs((id + "|" + k).hashCode() % 900000));
                    }
                }
                NotificationHelper.cancelReminder(context, id);  // cancela avisos futuros dessa tarefa
            }
            NotificationHelper.recordTaskCompletedLocally(context, id, title);
            NotificationHelper.showDoneCelebration(context, id, title, color);

        } else if (NotificationHelper.ACTION_SNOOZE_TASK.equals(action)) {
            String id = intent.getStringExtra(NotificationHelper.EXTRA_TASK_ID);
            String title = intent.getStringExtra(NotificationHelper.EXTRA_TASK_TITLE);
            String color = intent.getStringExtra(NotificationHelper.EXTRA_COLOR);
            int mins = intent.getIntExtra(NotificationHelper.EXTRA_SNOOZE_MIN, 15);
            if (id != null) {
                NotificationManager nm = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
                if (nm != null) {
                    for (String k : new String[]{NotificationHelper.KIND_PRE_DAY, NotificationHelper.KIND_PRE_HOUR,
                            NotificationHelper.KIND_NOW, NotificationHelper.KIND_OVERDUE}) {
                        nm.cancel(Math.abs((id + "|" + k).hashCode() % 900000));
                    }
                }
                long nextAt = System.currentTimeMillis() + (mins * 60000L);
                String label = mins >= 60 ? "Adiado +1h" : "Adiado +" + mins + "m";
                NotificationHelper.scheduleDeadline(context, id, title, label, nextAt, NotificationHelper.KIND_NOW, color);
            }

        } else if (Intent.ACTION_BOOT_COMPLETED.equals(action)) {
            Log.d(TAG, "Reboot: reagendando avisos");
            NotificationHelper.rescheduleAll(context);
        }
    }
}
