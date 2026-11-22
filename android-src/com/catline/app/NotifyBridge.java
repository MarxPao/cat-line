package com.catline.app;

import android.Manifest;
import android.app.Activity;
import android.app.AlarmManager;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.PowerManager;
import android.provider.Settings;
import android.util.Log;
import android.webkit.JavascriptInterface;

import org.json.JSONObject;

/**
 * Diagnostico e atalhos de configuracao dos avisos (ponte AndroidNotify).
 * Mostra para a usuaria o que impede um aviso de chegar: permissao de notificacao, alarme exato
 * e economia de bateria, e leva direto a tela certa do Android.
 */
public class NotifyBridge {
    private static final String TAG = "CatLineNotifyBridge";
    private final Activity activity;

    public NotifyBridge(Activity activity) {
        this.activity = activity;
    }

    @JavascriptInterface
    public String status() {
        JSONObject o = new JSONObject();
        try {
            Context ctx = activity.getApplicationContext();
            NotificationManager nm = (NotificationManager) ctx.getSystemService(Context.NOTIFICATION_SERVICE);

            boolean notifications = true;
            boolean channelBlocked = false;
            if (nm != null) {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) notifications = nm.areNotificationsEnabled();
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    NotificationHelper.ensureChannel(ctx);
                    NotificationChannel ch = nm.getNotificationChannel(NotificationHelper.CHANNEL_ID);
                    channelBlocked = ch != null && ch.getImportance() == NotificationManager.IMPORTANCE_NONE;
                }
            }

            boolean exact = true;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                AlarmManager am = (AlarmManager) ctx.getSystemService(Context.ALARM_SERVICE);
                exact = am != null && am.canScheduleExactAlarms();
            }

            boolean battery = true;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                PowerManager pm = (PowerManager) ctx.getSystemService(Context.POWER_SERVICE);
                battery = pm != null && pm.isIgnoringBatteryOptimizations(ctx.getPackageName());
            }

            o.put("sdk", Build.VERSION.SDK_INT);
            o.put("notifications", notifications);
            o.put("channelBlocked", channelBlocked);
            o.put("exactAlarm", exact);
            o.put("batteryUnrestricted", battery);
            o.put("manufacturer", Build.MANUFACTURER == null ? "" : Build.MANUFACTURER.toLowerCase());
        } catch (Exception e) {
            Log.e(TAG, "Falha ao ler o estado dos avisos", e);
        }
        return o.toString();
    }

    @JavascriptInterface
    public void requestNotificationPermission() {
        run(new Runnable() {
            @Override public void run() {
                if (Build.VERSION.SDK_INT >= 33
                        && activity.checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS)
                        != android.content.pm.PackageManager.PERMISSION_GRANTED
                        && activity.shouldShowRequestPermissionRationale(Manifest.permission.POST_NOTIFICATIONS)) {
                    activity.requestPermissions(new String[]{Manifest.permission.POST_NOTIFICATIONS}, 7001);
                } else if (Build.VERSION.SDK_INT >= 33
                        && activity.checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS)
                        != android.content.pm.PackageManager.PERMISSION_GRANTED
                        && !wasAskedBefore()) {
                    markAsked();
                    activity.requestPermissions(new String[]{Manifest.permission.POST_NOTIFICATIONS}, 7001);
                } else {
                    openNotificationSettingsNow();
                }
            }
        });
    }

    @JavascriptInterface
    public void openNotificationSettings() {
        run(new Runnable() { @Override public void run() { openNotificationSettingsNow(); } });
    }

    @JavascriptInterface
    public void openExactAlarmSettings() {
        run(new Runnable() {
            @Override public void run() {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                    Intent i = new Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM,
                            Uri.parse("package:" + activity.getPackageName()));
                    if (start(i)) return;
                }
                openAppDetails();
            }
        });
    }

    @JavascriptInterface
    public void openBatterySettings() {
        run(new Runnable() {
            @Override public void run() {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                    if (start(new Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS))) return;
                }
                openAppDetails();
            }
        });
    }

    /** Remove todos os alarmes de aviso agendados. */
    @JavascriptInterface
    public void cancelAllReminders() {
        NotificationHelper.cancelAllScheduled(activity.getApplicationContext());
    }

    /** Mostra agora um aviso igual aos reais, para conferir som, vibracao e botoes. */
    @JavascriptInterface
    public void sendTestNow() {
        NotificationHelper.showNotification(activity.getApplicationContext(), "teste-aviso",
                "Aviso de teste da gatinha", "agora", NotificationHelper.KIND_NOW, "pink");
    }

    // ---------- internos ----------

    private boolean wasAskedBefore() {
        return activity.getSharedPreferences("catline_notify_prefs", Context.MODE_PRIVATE).getBoolean("asked", false);
    }

    private void markAsked() {
        activity.getSharedPreferences("catline_notify_prefs", Context.MODE_PRIVATE).edit().putBoolean("asked", true).apply();
    }

    private void openNotificationSettingsNow() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            Intent i = new Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS)
                    .putExtra(Settings.EXTRA_APP_PACKAGE, activity.getPackageName());
            if (start(i)) return;
        }
        openAppDetails();
    }

    private void openAppDetails() {
        start(new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.parse("package:" + activity.getPackageName())));
    }

    private boolean start(Intent intent) {
        try {
            activity.startActivity(intent);
            return true;
        } catch (Exception e) {
            Log.w(TAG, "Tela de configuracao indisponivel", e);
            return false;
        }
    }

    private void run(Runnable r) {
        activity.runOnUiThread(r);
    }
}
