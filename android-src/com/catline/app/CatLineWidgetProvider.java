package com.catline.app;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;
import android.util.Log;
import android.view.View;
import android.widget.RemoteViews;

import org.json.JSONArray;
import org.json.JSONObject;

/**
 * Widget "Hoje" da tela inicial: mostra ate 3 proximos compromissos e permite marcar "Feito".
 *
 * O app web envia um resumo do dia por AndroidWidget.updateWidget(json). O botao "Feito" usa o mesmo
 * caminho das notificacoes (ReminderReceiver, ACTION_COMPLETE_TASK), entao o app conclui o compromisso
 * na proxima vez que abrir.
 */
public class CatLineWidgetProvider extends AppWidgetProvider {
    private static final String TAG = "CatLineWidget";
    private static final String PREFS = "catline_widget_prefs";
    private static final String KEY_SNAPSHOT = "snapshot";
    private static final int MAX_ROWS = 3;

    private static final int[] ROW = {R.id.widget_row1, R.id.widget_row2, R.id.widget_row3};
    private static final int[] TIME = {R.id.widget_time1, R.id.widget_time2, R.id.widget_time3};
    private static final int[] TITLE = {R.id.widget_title1, R.id.widget_title2, R.id.widget_title3};
    private static final int[] DONE = {R.id.widget_done1, R.id.widget_done2, R.id.widget_done3};

    @Override
    public void onUpdate(Context context, AppWidgetManager manager, int[] appWidgetIds) {
        for (int id : appWidgetIds) {
            render(context, manager, id);
        }
    }

    /** Guarda o resumo enviado pelo app e redesenha os widgets. */
    public static void saveSnapshot(Context context, String json) {
        if (json == null || json.length() > 20000) return;
        try {
            new JSONObject(json); // valida antes de guardar
            context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().putString(KEY_SNAPSHOT, json).apply();
            refreshAll(context);
        } catch (Exception e) {
            Log.w(TAG, "Resumo do widget invalido", e);
        }
    }

    /** Remove um compromisso concluido do resumo e redesenha, sem esperar o app abrir. */
    public static void markDoneAndRefresh(Context context, String taskId) {
        if (taskId == null) return;
        try {
            SharedPreferences prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
            JSONObject snap = new JSONObject(prefs.getString(KEY_SNAPSHOT, "{}"));
            JSONArray items = snap.optJSONArray("items");
            if (items == null) return;
            JSONArray kept = new JSONArray();
            boolean removed = false;
            for (int i = 0; i < items.length(); i++) {
                JSONObject it = items.getJSONObject(i);
                if (taskId.equals(it.optString("id"))) { removed = true; continue; }
                kept.put(it);
            }
            if (!removed) return;
            snap.put("items", kept);
            snap.put("doneToday", snap.optInt("doneToday", 0) + 1);
            prefs.edit().putString(KEY_SNAPSHOT, snap.toString()).apply();
            refreshAll(context);
        } catch (Exception e) {
            Log.w(TAG, "Falha ao atualizar o widget depois de concluir", e);
        }
    }

    public static void refreshAll(Context context) {
        try {
            AppWidgetManager manager = AppWidgetManager.getInstance(context);
            int[] ids = manager.getAppWidgetIds(new ComponentName(context, CatLineWidgetProvider.class));
            for (int id : ids) render(context, manager, id);
        } catch (Exception e) {
            Log.w(TAG, "Falha ao redesenhar o widget", e);
        }
    }

    private static int immutableFlag() {
        return Build.VERSION.SDK_INT >= 23 ? PendingIntent.FLAG_IMMUTABLE : 0;
    }

    private static void render(Context context, AppWidgetManager manager, int appWidgetId) {
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_hoje);

        JSONObject snap;
        try {
            snap = new JSONObject(context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString(KEY_SNAPSHOT, "{}"));
        } catch (Exception e) {
            snap = new JSONObject();
        }
        JSONArray items = snap.optJSONArray("items");
        int count = items == null ? 0 : Math.min(items.length(), MAX_ROWS);
        int doneToday = snap.optInt("doneToday", 0);
        int totalToday = snap.optInt("totalToday", 0);

        views.setTextViewText(R.id.widget_header, "🐾 Hoje");
        views.setTextViewText(R.id.widget_progress,
                totalToday > 0 ? (doneToday + " de " + totalToday + " feitos") : "");

        for (int i = 0; i < MAX_ROWS; i++) {
            if (i < count) {
                JSONObject it = items.optJSONObject(i);
                String id = it == null ? "" : it.optString("id");
                String title = it == null ? "" : it.optString("title");
                String time = it == null ? "" : it.optString("time");
                String color = it == null ? "pink" : it.optString("color", "pink");

                views.setViewVisibility(ROW[i], View.VISIBLE);
                views.setTextViewText(TIME[i], time);
                views.setTextViewText(TITLE[i], title);

                Intent done = new Intent(context, ReminderReceiver.class);
                done.setAction(NotificationHelper.ACTION_COMPLETE_TASK);
                done.putExtra(NotificationHelper.EXTRA_TASK_ID, id);
                done.putExtra(NotificationHelper.EXTRA_TASK_TITLE, title);
                done.putExtra(NotificationHelper.EXTRA_COLOR, color);
                int req = 41000 + (Math.abs(id.hashCode()) % 50000);
                PendingIntent pi = PendingIntent.getBroadcast(context, req, done,
                        PendingIntent.FLAG_UPDATE_CURRENT | immutableFlag());
                views.setOnClickPendingIntent(DONE[i], pi);
            } else {
                views.setViewVisibility(ROW[i], View.GONE);
            }
        }

        if (count == 0) {
            views.setViewVisibility(R.id.widget_empty, View.VISIBLE);
            views.setTextViewText(R.id.widget_empty, totalToday > 0
                    ? "Tudo em dia! A gatinha está orgulhosa 🐾"
                    : "Nada marcado para hoje. Toque para abrir o Cat Line.");
        } else {
            views.setViewVisibility(R.id.widget_empty, View.GONE);
        }

        Intent open = new Intent(context, MainActivity.class);
        open.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        PendingIntent openPi = PendingIntent.getActivity(context, 40999, open,
                PendingIntent.FLAG_UPDATE_CURRENT | immutableFlag());
        views.setOnClickPendingIntent(R.id.widget_root, openPi);
        views.setOnClickPendingIntent(R.id.widget_header, openPi);

        manager.updateAppWidget(appWidgetId, views);
    }
}
