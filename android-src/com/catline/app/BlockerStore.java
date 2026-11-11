package com.catline.app;

import android.content.Context;
import android.content.SharedPreferences;
import android.os.SystemClock;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

/** Armazenamento nativo das regras de bloqueio e banco de minutos (lido pelo serviço mesmo com o app fechado). */
final class BlockerStore {
    private static final String PREFS = "catline_blocker";
    private static final String KEY_STATE = "state";
    private static final String KEY_PASS_PREFIX = "pass_";
    private static final String KEY_LAST_PKG = "last_pkg";
    private static final String KEY_LAST_AT = "last_at";
    private static final String KEY_CONNECTED_AT = "connected_at";
    private static final String KEY_LAST_BLOCK = "last_block";
    private static final String KEY_SYNC_AT = "sync_at";

    // Chaves do Banco de Minutos e Módulo Foco (Fase 5)
    private static final String KEY_MINUTE_BANK_BALANCE_SEC = "minute_bank_balance_sec";
    private static final String KEY_FOCO_ENABLED = "foco_module_enabled";
    private static final String KEY_PENDING_DEBITS = "pending_minute_debits";
    private static final String KEY_LAST_SYNC_TX = "last_sync_tx_id";

    private BlockerStore() {}

    private static SharedPreferences prefs(Context c) {
        return c.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }

    static void saveState(Context c, String json) {
        if (json != null && !json.isEmpty()) {
            try {
                JSONObject o = new JSONObject(json);
                if (o.has("focoEnabled")) {
                    setFocoEnabled(c, o.optBoolean("focoEnabled", true));
                }
            } catch (Exception ignored) {}
        }
        prefs(c).edit()
                .putString(KEY_STATE, json)
                .putLong(KEY_SYNC_AT, SystemClock.elapsedRealtime())
                .apply();
    }

    static JSONObject state(Context c) {
        String raw = prefs(c).getString(KEY_STATE, null);
        if (raw != null && !raw.isEmpty()) {
            try {
                JSONObject o = new JSONObject(raw);
                if (o.optJSONArray("rules") != null) return o;
            } catch (JSONException ignored) {}
        }
        return defaultState();
    }

    private static JSONObject defaultState() {
        JSONObject st = new JSONObject();
        try {
            st.put("restMode", false);
            st.put("pending", 3);
            st.put("frictionSeconds", 15);
            st.put("passMinutes", 15);
            JSONArray rules = new JSONArray();
            rules.put(makeRule("Instagram", "com.instagram.android", 3));
            rules.put(makeRule("TikTok", "com.zhiliaoapp.musically", 3));
            rules.put(makeRule("Twitter / X", "com.twitter.android", 3));
            rules.put(makeRule("YouTube", "com.google.android.youtube", 3));
            st.put("rules", rules);
        } catch (JSONException ignored) {}
        return st;
    }

    private static JSONObject makeRule(String name, String pkg, int rigor) throws JSONException {
        JSONObject r = new JSONObject();
        r.put("name", name);
        r.put("pkg", pkg);
        r.put("rigor", rigor);
        r.put("windowStart", "00:00");
        r.put("windowEnd", "23:59");
        r.put("days", "Todos os dias");
        r.put("enabled", true);
        return r;
    }

    // Controle de passes utilizando estritamente SystemClock.elapsedRealtime()
    static void grantPass(Context c, String pkg, int minutes) {
        long expiresAt = SystemClock.elapsedRealtime() + (minutes * 60_000L);
        prefs(c).edit().putLong(KEY_PASS_PREFIX + pkg, expiresAt).apply();
    }

    static void revokePass(Context c, String pkg) {
        prefs(c).edit().remove(KEY_PASS_PREFIX + pkg).apply();
    }

    static boolean hasPass(Context c, String pkg) {
        long expiresAt = prefs(c).getLong(KEY_PASS_PREFIX + pkg, 0L);
        if (expiresAt <= 0L) return false;
        // Purga passes obsoletos da era do relógio de parede (> 1 trilhão de ms)
        if (expiresAt > 1_000_000_000_000L) {
            prefs(c).edit().remove(KEY_PASS_PREFIX + pkg).apply();
            return false;
        }
        return expiresAt > SystemClock.elapsedRealtime();
    }

    static void clearAllPasses(Context c) {
        SharedPreferences p = prefs(c);
        SharedPreferences.Editor ed = p.edit();
        for (String k : p.getAll().keySet()) {
            if (k.startsWith(KEY_PASS_PREFIX)) {
                ed.remove(k);
            }
        }
        ed.apply();
    }

    // Métodos do Banco de Minutos e Módulo Foco (Fase 5)
    static void setFocoEnabled(Context c, boolean enabled) {
        prefs(c).edit().putBoolean(KEY_FOCO_ENABLED, enabled).apply();
    }

    static boolean isFocoEnabled(Context c) {
        return prefs(c).getBoolean(KEY_FOCO_ENABLED, true);
    }

    static void setMinuteBankBalance(Context c, long balanceSeconds, String txId) {
        prefs(c).edit()
                .putLong(KEY_MINUTE_BANK_BALANCE_SEC, Math.max(0L, balanceSeconds))
                .putString(KEY_LAST_SYNC_TX, txId == null ? "" : txId)
                .apply();
    }

    static long getMinuteBankBalanceSeconds(Context c) {
        return prefs(c).getLong(KEY_MINUTE_BANK_BALANCE_SEC, 0L);
    }

    static boolean consumeMinuteBank(Context c, String pkg, int minutesToConsume) {
        long balanceSec = getMinuteBankBalanceSeconds(c);
        int secToConsume = Math.min((int) balanceSec, minutesToConsume * 60);
        if (secToConsume <= 0) return false;

        long newBalance = balanceSec - secToConsume;
        int actualMinutes = Math.max(1, secToConsume / 60);
        grantPass(c, pkg, actualMinutes);

        long nowElapsed = SystemClock.elapsedRealtime();
        String safePkg = pkg != null ? pkg.replace('.', '_') : "app";
        String debitId = "debit_" + safePkg + "_" + nowElapsed;

        try {
            JSONArray debits = new JSONArray(prefs(c).getString(KEY_PENDING_DEBITS, "[]"));
            JSONObject d = new JSONObject();
            d.put("debitId", debitId);
            d.put("pkg", pkg);
            d.put("consumedMinutes", actualMinutes);
            d.put("consumedSeconds", secToConsume);
            d.put("elapsedRealtime", nowElapsed);
            debits.put(d);

            prefs(c).edit()
                    .putLong(KEY_MINUTE_BANK_BALANCE_SEC, newBalance)
                    .putString(KEY_PENDING_DEBITS, debits.toString())
                    .apply();
            return true;
        } catch (JSONException e) {
            return false;
        }
    }

    static String pollMinuteBankDebits(Context c) {
        return prefs(c).getString(KEY_PENDING_DEBITS, "[]");
    }

    static void ackMinuteBankDebit(Context c, String debitId) {
        if (debitId == null || debitId.isEmpty()) return;
        try {
            JSONArray current = new JSONArray(prefs(c).getString(KEY_PENDING_DEBITS, "[]"));
            JSONArray filtered = new JSONArray();
            for (int i = 0; i < current.length(); i++) {
                JSONObject obj = current.optJSONObject(i);
                if (obj != null && !debitId.equals(obj.optString("debitId"))) {
                    filtered.put(obj);
                }
            }
            prefs(c).edit().putString(KEY_PENDING_DEBITS, filtered.toString()).apply();
        } catch (JSONException ignored) {}
    }

    // Telemetria e diagnósticos usando SystemClock.elapsedRealtime()
    static void markConnected(Context c) {
        prefs(c).edit().putLong(KEY_CONNECTED_AT, SystemClock.elapsedRealtime()).apply();
    }

    static void markSeen(Context c, String pkg) {
        prefs(c).edit().putString(KEY_LAST_PKG, pkg).putLong(KEY_LAST_AT, SystemClock.elapsedRealtime()).apply();
    }

    static void markBlocked(Context c, String pkg) {
        prefs(c).edit().putString(KEY_LAST_BLOCK, pkg + "@" + SystemClock.elapsedRealtime()).apply();
    }

    static JSONObject diagnostics(Context c) {
        SharedPreferences p = prefs(c);
        JSONObject o = new JSONObject();
        try {
            o.put("connectedAt", p.getLong(KEY_CONNECTED_AT, 0L));
            o.put("lastPkg", p.getString(KEY_LAST_PKG, ""));
            o.put("lastAt", p.getLong(KEY_LAST_AT, 0L));
            o.put("lastBlock", p.getString(KEY_LAST_BLOCK, ""));
            o.put("syncAt", p.getLong(KEY_SYNC_AT, 0L));
            o.put("minuteBankBalanceSec", p.getLong(KEY_MINUTE_BANK_BALANCE_SEC, 0L));
            o.put("focoEnabled", p.getBoolean(KEY_FOCO_ENABLED, true));
        } catch (JSONException ignored) {}
        return o;
    }
}
