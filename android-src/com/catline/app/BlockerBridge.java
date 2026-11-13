package com.catline.app;

import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.provider.Settings;
import android.webkit.JavascriptInterface;

/** Ponte JavaScript (window.AndroidBlocker) entre o app web e o bloqueio nativo. */
public class BlockerBridge {
    private final Context ctx;

    public BlockerBridge(Context ctx) {
        this.ctx = ctx.getApplicationContext();
    }

    @JavascriptInterface
    public void syncState(String json) {
        if (json != null) BlockerStore.saveState(ctx, json);
    }

    @JavascriptInterface
    public void grantPass(String pkg, int minutes) {
        BlockerStore.grantPass(ctx, pkg, minutes);
    }

    /** Métodos do Banco de Minutos e Módulo Foco (Fase 5) */
    @JavascriptInterface
    public void syncMinuteBank(String json) {
        if (json == null || json.isEmpty()) return;
        try {
            org.json.JSONObject obj = new org.json.JSONObject(json);
            if (obj.has("focoEnabled")) {
                BlockerStore.setFocoEnabled(ctx, obj.optBoolean("focoEnabled", true));
            }
            if (obj.has("balanceSeconds")) {
                BlockerStore.setMinuteBankBalance(ctx, obj.optLong("balanceSeconds", 0L), obj.optString("txId", ""));
            }
        } catch (Exception ignored) {}
    }

    @JavascriptInterface
    public String pollMinuteBankDebits() {
        return BlockerStore.pollMinuteBankDebits(ctx);
    }

    @JavascriptInterface
    public void ackMinuteBankDebit(String debitId) {
        BlockerStore.ackMinuteBankDebit(ctx, debitId);
    }

    @JavascriptInterface
    public long getMinuteBankBalanceSeconds() {
        return BlockerStore.getMinuteBankBalanceSeconds(ctx);
    }

    @JavascriptInterface
    public boolean isFocoEnabled() {
        return BlockerStore.isFocoEnabled(ctx);
    }

    @JavascriptInterface
    public void revokePass(String pkg) {
        BlockerStore.revokePass(ctx, pkg);
    }

    @JavascriptInterface
    public void clearAllPasses() {
        BlockerStore.clearAllPasses(ctx);
    }

    @JavascriptInterface
    public int sdkInt() {
        return android.os.Build.VERSION.SDK_INT;
    }

    @JavascriptInterface
    public boolean isServiceEnabled() {
        String enabled = Settings.Secure.getString(ctx.getContentResolver(),
                Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES);
        if (enabled == null) return false;
        ComponentName cn = new ComponentName(ctx, BlockerService.class);
        String full = cn.flattenToString();
        String shortName = cn.flattenToShortString();
        for (String s : enabled.split(":")) {
            if (s.equalsIgnoreCase(full) || s.equalsIgnoreCase(shortName)) return true;
        }
        return false;
    }

    @JavascriptInterface
    public void openAccessibilitySettings() {
        Intent i = new Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS);
        i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        ctx.startActivity(i);
    }

    @JavascriptInterface
    public void openAppDetails() {
        Intent i = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS,
                Uri.parse("package:" + ctx.getPackageName()));
        i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        ctx.startActivity(i);
    }

    /** Diagnóstico em JSON: versão, serviço, último app visto e motivo de cada regra. */
    @JavascriptInterface
    public String diagnostics() {
        try {
            org.json.JSONObject o = BlockerStore.diagnostics(ctx);
            o.put("serviceEnabled", isServiceEnabled());
            o.put("sdk", android.os.Build.VERSION.SDK_INT);
            o.put("device", android.os.Build.MANUFACTURER + " " + android.os.Build.MODEL);
            try {
                o.put("version", ctx.getPackageManager().getPackageInfo(ctx.getPackageName(), 0).versionName);
            } catch (Exception e) {
                o.put("version", "?");
            }
            org.json.JSONArray out = new org.json.JSONArray();
            org.json.JSONArray rules = BlockerStore.state(ctx).optJSONArray("rules");
            if (rules != null) {
                for (int i = 0; i < rules.length(); i++) {
                    org.json.JSONObject r = rules.optJSONObject(i);
                    if (r == null) continue;
                    String pkg = r.optString("pkg");
                    BlockPolicy.Decision d = BlockPolicy.explain(ctx, pkg);
                    org.json.JSONObject x = new org.json.JSONObject();
                    x.put("name", r.optString("name"));
                    x.put("pkg", pkg);
                    x.put("installed", isInstalled(pkg));
                    x.put("status", d == null ? "sem regra" : (d.skipReason == null ? "TRAVA AGORA" : d.skipReason));
                    out.put(x);
                }
            }
            o.put("rules", out);
            return o.toString();
        } catch (Exception e) {
            return "{}";
        }
    }

    /** Abre a tela de bloqueio de exemplo para confirmar que ela consegue aparecer. */
    @JavascriptInterface
    public void testBlockScreen() {
        BlockPolicy.Decision d = new BlockPolicy.Decision();
        d.pkg = "teste";
        d.name = "Teste";
        d.windowStart = "00:00";
        d.windowEnd = "23:59";
        d.rigor = 3;
        d.pending = 2;
        d.frictionSeconds = 15;
        d.passMinutes = 15;
        ctx.startActivity(BlockActivity.intentFor(ctx, d));
    }

    /** Métodos de Lembretes Nativos via AlarmManager e NotificationManager */
    @JavascriptInterface
    public void scheduleReminder(String id, String title, String timeStr, long triggerAtMillis) {
        NotificationHelper.scheduleReminder(ctx, id, title, timeStr, triggerAtMillis);
    }

    /** kind: PRE_DAY | PRE_HOUR | NOW | OVERDUE; colorId: pink, gold, blue, green, purple, orange, red */
    @JavascriptInterface
    public void scheduleDeadline(String id, String title, String timeStr, long triggerAtMillis, String kind, String colorId) {
        NotificationHelper.scheduleDeadline(ctx, id, title, timeStr, triggerAtMillis, kind, colorId);
    }

    @JavascriptInterface
    public void cancelReminder(String id) {
        NotificationHelper.cancelReminder(ctx, id);
    }

    @JavascriptInterface
    public String pollCompletedTasks() {
        return NotificationHelper.pollCompletedTasks(ctx);
    }

    /** Métodos do Cofre Seguro Nativo (Android KeyStore AES-GCM) */
    @JavascriptInterface
    public void putSecret(String key, String value) {
        SecureVault.put(ctx, key, value);
    }

    @JavascriptInterface
    public String getSecret(String key) {
        return SecureVault.get(ctx, key);
    }

    @JavascriptInterface
    public void removeSecret(String key) {
        SecureVault.remove(ctx, key);
    }

    @JavascriptInterface
    public boolean hasSecret(String key) {
        return SecureVault.has(ctx, key);
    }

    private boolean isInstalled(String pkg) {
        if (pkg != null && pkg.startsWith("app.custom.")) return true;
        try {
            ctx.getPackageManager().getPackageInfo(pkg, 0);
            return true;
        } catch (Exception e) {
            return false;
        }
    }
}
