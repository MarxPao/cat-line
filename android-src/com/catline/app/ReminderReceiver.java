package com.catline.app;

import android.app.NotificationManager;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.util.Log;

/**
 * Receptor de transmissões de alarme e cliques de ação nas notificações nativas do Cat Line.
 */
public class ReminderReceiver extends BroadcastReceiver {
    private static final String TAG = "CatLineReminderRcvr";

    @Override
    public void onReceive(Context context, Intent intent) {
        if (intent == null || intent.getAction() == null) return;
        String action = intent.getAction();

        if (NotificationHelper.ACTION_TRIGGER_REMINDER.equals(action)) {
            String id = intent.getStringExtra(NotificationHelper.EXTRA_TASK_ID);
            String title = intent.getStringExtra(NotificationHelper.EXTRA_TASK_TITLE);
            String timeStr = intent.getStringExtra(NotificationHelper.EXTRA_TASK_TIME);

            Log.d(TAG, "Disparando lembrete nativo: " + title);
            NotificationHelper.showReminderNotification(context, id, title, timeStr);

        } else if (NotificationHelper.ACTION_COMPLETE_TASK.equals(action)) {
            String id = intent.getStringExtra(NotificationHelper.EXTRA_TASK_ID);
            String title = intent.getStringExtra(NotificationHelper.EXTRA_TASK_TITLE);

            Log.d(TAG, "Ação 'Feito ✓' acionada diretamente na notificação para: " + id);

            // Cancela a notificação ativa
            if (id != null) {
                NotificationManager nm = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
                if (nm != null) {
                    nm.cancel(Math.abs(id.hashCode()));
                }
            }

            // Registra a tarefa como concluída para consumo pela WebView
            NotificationHelper.recordTaskCompletedLocally(context, id, title);

        } else if (Intent.ACTION_BOOT_COMPLETED.equals(action)) {
            Log.d(TAG, "Dispositivo reiniciado. Cat Line pronto para reagendar compromissos.");
        }
    }
}
