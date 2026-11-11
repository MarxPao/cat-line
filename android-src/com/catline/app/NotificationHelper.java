package com.catline.app;

import android.app.AlarmManager;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Color;
import android.os.Build;
import android.util.Log;

import org.json.JSONArray;
import org.json.JSONObject;

/**
 * Gerenciador nativo de lembretes e notificações do Cat Line.
 * Opera exclusivamente com as APIs do framework Android (zero AndroidX).
 */
public final class NotificationHelper {
    private static final String TAG = "CatLineNotification";
    public static final String CHANNEL_ID = "catline_reminders_channel";
    public static final String ACTION_TRIGGER_REMINDER = "com.catline.app.ACTION_TRIGGER_REMINDER";
    public static final String ACTION_COMPLETE_TASK = "com.catline.app.ACTION_COMPLETE_TASK";

    public static final String EXTRA_TASK_ID = "task_id";
    public static final String EXTRA_TASK_TITLE = "task_title";
    public static final String EXTRA_TASK_TIME = "task_time";

    private static final String PREFS_COMPLETED = "catline_completed_tasks_prefs";
    private static final String KEY_COMPLETED_LIST = "completed_tasks_queue";

    private NotificationHelper() {}

    /**
     * Cria o canal de notificações no Android 8.0+ (API 26+).
     */
    public static void ensureChannel(Context ctx) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationManager nm = (NotificationManager) ctx.getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm != null && nm.getNotificationChannel(CHANNEL_ID) == null) {
                NotificationChannel channel = new NotificationChannel(
                        CHANNEL_ID,
                        "Lembretes da Gatinha",
                        NotificationManager.IMPORTANCE_HIGH
                );
                channel.setDescription("Notificações dos compromissos e rotina do Cat Line");
                channel.enableLights(true);
                channel.setLightColor(Color.parseColor("#DF8F49")); // Laranja Calico
                channel.enableVibration(true);
                channel.setVibrationPattern(new long[]{0, 250, 150, 250});
                nm.createNotificationChannel(channel);
            }
        }
    }

    /**
     * Agenda alarme exato para disparo de notificação no horário especificado.
     */
    public static void scheduleReminder(Context ctx, String taskId, String title, String timeStr, long triggerAtMillis) {
        if (taskId == null || triggerAtMillis <= System.currentTimeMillis()) return;

        try {
            ensureChannel(ctx);
            AlarmManager am = (AlarmManager) ctx.getSystemService(Context.ALARM_SERVICE);
            if (am == null) return;

            Intent intent = new Intent(ctx, ReminderReceiver.class);
            intent.setAction(ACTION_TRIGGER_REMINDER);
            intent.putExtra(EXTRA_TASK_ID, taskId);
            intent.putExtra(EXTRA_TASK_TITLE, title);
            intent.putExtra(EXTRA_TASK_TIME, timeStr);

            int requestCode = Math.abs(taskId.hashCode());
            int flags = PendingIntent.FLAG_UPDATE_CURRENT;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                flags |= PendingIntent.FLAG_IMMUTABLE;
            }

            PendingIntent pi = PendingIntent.getBroadcast(ctx, requestCode, intent, flags);

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                am.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAtMillis, pi);
            } else {
                am.setExact(AlarmManager.RTC_WAKEUP, triggerAtMillis, pi);
            }
            Log.d(TAG, "Lembrete agendado para: " + title + " em " + triggerAtMillis);
        } catch (Exception e) {
            Log.e(TAG, "Falha ao agendar lembrete nativo", e);
        }
    }

    /**
     * Cancela um lembrete previamente agendado.
     */
    public static void cancelReminder(Context ctx, String taskId) {
        if (taskId == null) return;
        try {
            AlarmManager am = (AlarmManager) ctx.getSystemService(Context.ALARM_SERVICE);
            if (am == null) return;

            Intent intent = new Intent(ctx, ReminderReceiver.class);
            intent.setAction(ACTION_TRIGGER_REMINDER);

            int requestCode = Math.abs(taskId.hashCode());
            int flags = PendingIntent.FLAG_UPDATE_CURRENT;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                flags |= PendingIntent.FLAG_IMMUTABLE;
            }

            PendingIntent pi = PendingIntent.getBroadcast(ctx, requestCode, intent, flags);
            am.cancel(pi);
        } catch (Exception e) {
            Log.e(TAG, "Falha ao cancelar lembrete", e);
        }
    }

    /**
     * Exibe a notificação nativa com ação direta 'Feito ✓'.
     */
    public static void showReminderNotification(Context ctx, String taskId, String title, String timeStr) {
        try {
            ensureChannel(ctx);
            NotificationManager nm = (NotificationManager) ctx.getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm == null) return;

            int notifId = Math.abs(taskId.hashCode());

            // Ação ao tocar na notificação: abre o aplicativo
            Intent openIntent = new Intent(ctx, MainActivity.class);
            openIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
            int flags = PendingIntent.FLAG_UPDATE_CURRENT;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                flags |= PendingIntent.FLAG_IMMUTABLE;
            }
            PendingIntent openPi = PendingIntent.getActivity(ctx, notifId, openIntent, flags);

            // Ação direta 'Feito ✓' sem precisar abrir o app
            Intent doneIntent = new Intent(ctx, ReminderReceiver.class);
            doneIntent.setAction(ACTION_COMPLETE_TASK);
            doneIntent.putExtra(EXTRA_TASK_ID, taskId);
            doneIntent.putExtra(EXTRA_TASK_TITLE, title);
            PendingIntent donePi = PendingIntent.getBroadcast(ctx, notifId + 10000, doneIntent, flags);

            String bodyText = (title != null ? title : "Compromisso") + " · " + (timeStr != null ? timeStr : "Agora");

            Notification.Builder builder;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                builder = new Notification.Builder(ctx, CHANNEL_ID);
            } else {
                builder = new Notification.Builder(ctx);
            }

            builder.setSmallIcon(ctx.getApplicationInfo().icon)
                   .setContentTitle("🐱 Cat Line · Hora do Compromisso")
                   .setContentText(bodyText)
                   .setContentIntent(openPi)
                   .setAutoCancel(true)
                   .setPriority(Notification.PRIORITY_HIGH)
                   .setDefaults(Notification.DEFAULT_ALL)
                   .addAction(0, "Feito ✓", donePi);

            nm.notify(notifId, builder.build());
        } catch (Exception e) {
            Log.e(TAG, "Falha ao exibir notificação", e);
        }
    }

    /**
     * Registra conclusão de tarefa pelo botão da notificação na fila compartilhada.
     */
    public static synchronized void recordTaskCompletedLocally(Context ctx, String taskId, String taskTitle) {
        try {
            SharedPreferences prefs = ctx.getSharedPreferences(PREFS_COMPLETED, Context.MODE_PRIVATE);
            String raw = prefs.getString(KEY_COMPLETED_LIST, "[]");
            JSONArray arr = new JSONArray(raw);

            JSONObject item = new JSONObject();
            item.put("taskId", taskId);
            item.put("taskTitle", taskTitle);
            item.put("completedAt", System.currentTimeMillis());
            arr.put(item);

            prefs.edit().putString(KEY_COMPLETED_LIST, arr.toString()).apply();
            Log.d(TAG, "Tarefa registrada como feita via notificação: " + taskId);
        } catch (Exception e) {
            Log.e(TAG, "Falha ao registrar tarefa feita", e);
        }
    }

    /**
     * Retorna e limpa a fila de tarefas concluídas nativamente.
     */
    public static synchronized String pollCompletedTasks(Context ctx) {
        try {
            SharedPreferences prefs = ctx.getSharedPreferences(PREFS_COMPLETED, Context.MODE_PRIVATE);
            String raw = prefs.getString(KEY_COMPLETED_LIST, "[]");
            prefs.edit().remove(KEY_COMPLETED_LIST).apply();
            return raw;
        } catch (Exception e) {
            return "[]";
        }
    }
}
