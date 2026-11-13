package com.catline.app;

import android.app.AlarmManager;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.Color;
import android.os.Build;
import android.util.Log;

import org.json.JSONArray;
import org.json.JSONObject;

/**
 * Lembretes e avisos de prazo do Cat Line, com o novelo como mascote da notificacao.
 * Apenas APIs do framework Android (zero AndroidX).
 *
 * Estagios de aviso: PRE_DAY (1 dia antes), PRE_HOUR (1 hora antes), NOW (na hora), OVERDUE (venceu).
 * Estado do novelo: frouxo (longe) -> enrolando (perto) -> emaranhado (vencendo/vencido) -> brincando (feito).
 */
public final class NotificationHelper {
    private static final String TAG = "CatLineNotification";
    public static final String CHANNEL_ID = "catline_reminders_channel";
    public static final String ACTION_TRIGGER_REMINDER = "com.catline.app.ACTION_TRIGGER_REMINDER";
    public static final String ACTION_COMPLETE_TASK = "com.catline.app.ACTION_COMPLETE_TASK";

    public static final String EXTRA_TASK_ID = "task_id";
    public static final String EXTRA_TASK_TITLE = "task_title";
    public static final String EXTRA_TASK_TIME = "task_time";
    public static final String EXTRA_KIND = "kind";
    public static final String EXTRA_COLOR = "yarn_color";

    public static final String KIND_PRE_DAY = "PRE_DAY";
    public static final String KIND_PRE_HOUR = "PRE_HOUR";
    public static final String KIND_NOW = "NOW";
    public static final String KIND_OVERDUE = "OVERDUE";
    private static final String[] ALL_KINDS = {KIND_PRE_DAY, KIND_PRE_HOUR, KIND_NOW, KIND_OVERDUE};

    private static final String PREFS_COMPLETED = "catline_completed_tasks_prefs";
    private static final String KEY_COMPLETED_LIST = "completed_tasks_queue";
    private static final String PREFS_SCHEDULE = "catline_scheduled_reminders_prefs";

    private NotificationHelper() {}

    public static void ensureChannel(Context ctx) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationManager nm = (NotificationManager) ctx.getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm != null && nm.getNotificationChannel(CHANNEL_ID) == null) {
                NotificationChannel channel = new NotificationChannel(
                        CHANNEL_ID, "Lembretes da Gatinha", NotificationManager.IMPORTANCE_HIGH);
                channel.setDescription("Compromissos, prazos e o novelo do Cat Line");
                channel.enableLights(true);
                channel.setLightColor(Color.parseColor("#DF8F49"));
                channel.enableVibration(true);
                channel.setVibrationPattern(new long[]{0, 250, 150, 250});
                nm.createNotificationChannel(channel);
            }
        }
    }

    // ---------- Agendamento ----------

    /** Compat: lembrete simples na hora do compromisso. */
    public static void scheduleReminder(Context ctx, String taskId, String title, String timeStr, long triggerAtMillis) {
        scheduleDeadline(ctx, taskId, title, timeStr, triggerAtMillis, KIND_NOW, "pink");
    }

    public static void scheduleDeadline(Context ctx, String taskId, String title, String timeStr,
                                        long triggerAtMillis, String kind, String colorId) {
        if (taskId == null || triggerAtMillis <= System.currentTimeMillis()) return;
        if (kind == null) kind = KIND_NOW;
        if (colorId == null || colorId.length() == 0) colorId = "pink";
        try {
            ensureChannel(ctx);
            AlarmManager am = (AlarmManager) ctx.getSystemService(Context.ALARM_SERVICE);
            if (am == null) return;

            PendingIntent pi = PendingIntent.getBroadcast(ctx, reqCode(taskId, kind),
                    buildTriggerIntent(ctx, taskId, title, timeStr, kind, colorId), piFlags());

            boolean exact = true;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                exact = am.canScheduleExactAlarms();
            }
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                if (exact) am.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAtMillis, pi);
                else am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAtMillis, pi);
            } else {
                am.setExact(AlarmManager.RTC_WAKEUP, triggerAtMillis, pi);
            }
            persistSchedule(ctx, taskId, title, timeStr, triggerAtMillis, kind, colorId);
        } catch (Exception e) {
            Log.e(TAG, "Falha ao agendar lembrete nativo", e);
        }
    }

    /** Cancela todos os estagios de aviso da tarefa. */
    public static void cancelReminder(Context ctx, String taskId) {
        if (taskId == null) return;
        try {
            AlarmManager am = (AlarmManager) ctx.getSystemService(Context.ALARM_SERVICE);
            for (String kind : ALL_KINDS) {
                if (am != null) {
                    PendingIntent pi = PendingIntent.getBroadcast(ctx, reqCode(taskId, kind),
                            buildTriggerIntent(ctx, taskId, null, null, kind, null), piFlags());
                    am.cancel(pi);
                    pi.cancel();
                }
                removeSchedule(ctx, taskId, kind);
            }
        } catch (Exception e) {
            Log.e(TAG, "Falha ao cancelar lembrete", e);
        }
    }

    /** Reagenda alarmes futuros salvos (apos reboot do aparelho). */
    public static void rescheduleAll(Context ctx) {
        try {
            SharedPreferences sp = ctx.getSharedPreferences(PREFS_SCHEDULE, Context.MODE_PRIVATE);
            long now = System.currentTimeMillis();
            for (String key : sp.getAll().keySet()) {
                try {
                    JSONObject o = new JSONObject(sp.getString(key, "{}"));
                    long at = o.optLong("at", 0);
                    if (at > now) {
                        scheduleDeadline(ctx, o.optString("id"), o.optString("title"), o.optString("time"),
                                at, o.optString("kind", KIND_NOW), o.optString("color", "pink"));
                    } else {
                        sp.edit().remove(key).apply();
                    }
                } catch (Exception ignored) {}
            }
        } catch (Exception e) {
            Log.e(TAG, "Falha ao reagendar", e);
        }
    }

    // ---------- Exibicao ----------

    public static void showReminderNotification(Context ctx, String taskId, String title, String timeStr) {
        showNotification(ctx, taskId, title, timeStr, KIND_NOW, "pink");
    }

    public static void showNotification(Context ctx, String taskId, String title, String timeStr,
                                        String kind, String colorId) {
        try {
            ensureChannel(ctx);
            NotificationManager nm = (NotificationManager) ctx.getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm == null) return;
            if (kind == null) kind = KIND_NOW;
            String t = title != null ? title : "Compromisso";
            String when = timeStr != null ? timeStr : "agora";

            int notifId = reqCode(taskId, kind);
            String head, body, state;
            if (KIND_PRE_DAY.equals(kind)) {
                head = "Novelo solto, mas o prazo chega amanha";
                body = "\"" + t + "\" vence amanha (" + when + "). Ainda da tempo, mamae!";
                state = "frouxo";
            } else if (KIND_PRE_HOUR.equals(kind)) {
                head = "O novelo ta enrolando!";
                body = "Falta 1 hora para \"" + t + "\" (" + when + ").";
                state = "enrolando";
            } else if (KIND_OVERDUE.equals(kind)) {
                head = "Ai, o novelo se emaranhou";
                body = "\"" + t + "\" passou do prazo. Bora desenrolar com calma?";
                state = "emaranhado";
            } else {
                head = "Hora do compromisso!";
                body = t + " · " + when;
                state = "enrolando";
            }

            Intent openIntent = new Intent(ctx, MainActivity.class);
            openIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
            PendingIntent openPi = PendingIntent.getActivity(ctx, notifId, openIntent, piFlags());

            Intent doneIntent = new Intent(ctx, ReminderReceiver.class);
            doneIntent.setAction(ACTION_COMPLETE_TASK);
            doneIntent.putExtra(EXTRA_TASK_ID, taskId);
            doneIntent.putExtra(EXTRA_TASK_TITLE, title);
            doneIntent.putExtra(EXTRA_COLOR, colorId);
            PendingIntent donePi = PendingIntent.getBroadcast(ctx, notifId + 10000, doneIntent, piFlags());

            Notification.Builder b = newBuilder(ctx);
            b.setSmallIcon(smallIcon(ctx))
             .setContentTitle(head)
             .setContentText(body)
             .setStyle(new Notification.BigTextStyle().bigText(body))
             .setContentIntent(openPi)
             .setAutoCancel(true)
             .setPriority(Notification.PRIORITY_HIGH)
             .setDefaults(Notification.DEFAULT_ALL)
             .addAction(0, "Feito", donePi);
            Bitmap large = noveloBitmap(ctx, state, colorId);
            if (large != null) b.setLargeIcon(large);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                b.setColor(Color.parseColor("#DF8F49"));
            }
            nm.notify(notifId, b.build());

            removeSchedule(ctx, taskId, kind);
        } catch (Exception e) {
            Log.e(TAG, "Falha ao exibir notificacao", e);
        }
    }

    /** Confirmacao com o novelo brincando apos tocar em "Feito". */
    public static void showDoneCelebration(Context ctx, String taskId, String title, String colorId) {
        try {
            ensureChannel(ctx);
            NotificationManager nm = (NotificationManager) ctx.getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm == null) return;
            Notification.Builder b = newBuilder(ctx);
            b.setSmallIcon(smallIcon(ctx))
             .setContentTitle("Miau! O novelo ta brincando")
             .setContentText("\"" + (title != null ? title : "Compromisso") + "\" feito. Orgulho de voce!")
             .setAutoCancel(true);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) b.setTimeoutAfter(6000);
            Bitmap large = noveloBitmap(ctx, "brincando", colorId);
            if (large != null) b.setLargeIcon(large);
            nm.notify(reqCode(taskId, "DONE"), b.build());
        } catch (Throwable ignored) {}
    }

    // ---------- Helpers ----------

    private static Notification.Builder newBuilder(Context ctx) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) return new Notification.Builder(ctx, CHANNEL_ID);
        return new Notification.Builder(ctx);
    }

    private static int smallIcon(Context ctx) {
        int id = ctx.getResources().getIdentifier("ic_stat_novelo", "drawable", ctx.getPackageName());
        return id != 0 ? id : ctx.getApplicationInfo().icon;
    }

    private static Bitmap noveloBitmap(Context ctx, String state, String colorId) {
        try {
            String c = (colorId == null || colorId.length() == 0) ? "pink" : colorId;
            int id = ctx.getResources().getIdentifier("novelo_" + state + "_" + c, "drawable", ctx.getPackageName());
            if (id == 0) id = ctx.getResources().getIdentifier("novelo_" + state + "_pink", "drawable", ctx.getPackageName());
            return id != 0 ? BitmapFactory.decodeResource(ctx.getResources(), id) : null;
        } catch (Throwable t) {
            return null;
        }
    }

    private static Intent buildTriggerIntent(Context ctx, String id, String title, String time, String kind, String color) {
        Intent intent = new Intent(ctx, ReminderReceiver.class);
        intent.setAction(ACTION_TRIGGER_REMINDER);
        intent.putExtra(EXTRA_TASK_ID, id);
        intent.putExtra(EXTRA_TASK_TITLE, title);
        intent.putExtra(EXTRA_TASK_TIME, time);
        intent.putExtra(EXTRA_KIND, kind);
        intent.putExtra(EXTRA_COLOR, color);
        return intent;
    }

    private static int piFlags() {
        int f = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) f |= PendingIntent.FLAG_IMMUTABLE;
        return f;
    }

    private static int reqCode(String taskId, String kind) {
        return Math.abs((taskId + "|" + kind).hashCode() % 900000);
    }

    private static void persistSchedule(Context ctx, String id, String title, String time, long at, String kind, String color) {
        try {
            JSONObject o = new JSONObject();
            o.put("id", id); o.put("title", title); o.put("time", time);
            o.put("at", at); o.put("kind", kind); o.put("color", color);
            ctx.getSharedPreferences(PREFS_SCHEDULE, Context.MODE_PRIVATE)
               .edit().putString(id + "|" + kind, o.toString()).apply();
        } catch (Exception ignored) {}
    }

    private static void removeSchedule(Context ctx, String id, String kind) {
        ctx.getSharedPreferences(PREFS_SCHEDULE, Context.MODE_PRIVATE).edit().remove(id + "|" + kind).apply();
    }

    // ---------- Tarefas concluidas pela notificacao ----------

    public static synchronized void recordTaskCompletedLocally(Context ctx, String taskId, String taskTitle) {
        try {
            SharedPreferences prefs = ctx.getSharedPreferences(PREFS_COMPLETED, Context.MODE_PRIVATE);
            JSONArray arr = new JSONArray(prefs.getString(KEY_COMPLETED_LIST, "[]"));
            JSONObject item = new JSONObject();
            item.put("taskId", taskId);
            item.put("taskTitle", taskTitle);
            item.put("completedAt", System.currentTimeMillis());
            arr.put(item);
            prefs.edit().putString(KEY_COMPLETED_LIST, arr.toString()).apply();
        } catch (Exception e) {
            Log.e(TAG, "Falha ao registrar tarefa feita", e);
        }
    }

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
