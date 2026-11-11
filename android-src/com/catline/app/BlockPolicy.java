package com.catline.app;

import android.content.Context;
import android.content.pm.ApplicationInfo;
import android.content.pm.PackageManager;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.Calendar;
import java.util.Locale;

/** Decide se a abertura de um app deve ser interrompida, espelhando as regras do app web. */
final class BlockPolicy {
    private BlockPolicy() {}

    static final class Decision {
        String pkg;
        String rulePkg;
        String name;
        String windowStart;
        String windowEnd;
        int rigor;
        int pending;
        int frictionSeconds;
        int passMinutes;
        /** null quando deve bloquear; senão, motivo legível de não bloquear. */
        String skipReason;
    }

    /** Retorna null quando o app pode ser aberto livremente. */
    static Decision evaluate(Context c, String pkg) {
        Decision d = explain(c, pkg);
        return (d != null && d.skipReason == null) ? d : null;
    }

    /** Exceções absolutas inegociáveis: WhatsApp, telefone/discador, emergência, configurações e Cat Line */
    static boolean isAbsoluteException(String pkg, String label) {
        if (pkg == null || pkg.isEmpty()) return true;
        String p = pkg.toLowerCase(Locale.ROOT);
        String l = label == null ? "" : label.toLowerCase(Locale.ROOT);

        if (p.contains("whatsapp") || l.contains("whatsapp")) return true;
        if (p.contains("dialer") || p.contains("phone") || p.contains("telecom") || l.contains("telefone") || l.contains("chamadas")) return true;
        if (p.contains("emergency") || l.contains("emergência") || l.contains("sos")) return true;
        if (p.contains("settings") || l.contains("configura") || l.contains("ajustes")) return true;
        if (p.contains("catline") || p.contains("deadline") || l.contains("cat line")) return true;
        if (p.equals("com.android.systemui")) return true;
        return false;
    }

    /** Avalia a regra do pacote (ou nome do app instalado) e informa o motivo. */
    static Decision explain(Context c, String pkg) {
        if (pkg == null || pkg.isEmpty()) return null;

        String appLabel = getAppLabel(c, pkg);

        // Salvaguarda 1: Exceções absolutas nunca são bloqueadas
        if (isAbsoluteException(pkg, appLabel)) {
            Decision d = new Decision();
            d.pkg = pkg;
            d.skipReason = "aplicativo essencial protegido";
            return d;
        }

        // Salvaguarda 2: Módulo Foco desligado desativa todo o bloqueio nativo
        if (!BlockerStore.isFocoEnabled(c)) {
            Decision d = new Decision();
            d.pkg = pkg;
            d.skipReason = "módulo foco desativado";
            return d;
        }

        JSONObject st = BlockerStore.state(c);
        JSONArray rules = st.optJSONArray("rules");
        if (rules == null) return null;

        for (int i = 0; i < rules.length(); i++) {
            JSONObject r = rules.optJSONObject(i);
            if (r == null) continue;
            if (!matchesRule(pkg, appLabel, r)) continue;

            String rPkg = r.optString("pkg", pkg);
            Decision d = new Decision();
            d.pkg = pkg;
            d.rulePkg = rPkg;
            d.name = r.optString("name", appLabel.isEmpty() ? pkg : appLabel);
            d.windowStart = r.optString("windowStart", "00:00");
            d.windowEnd = r.optString("windowEnd", "23:59");
            d.rigor = r.optInt("rigor", 3);
            d.pending = st.optInt("pending", 0);
            d.frictionSeconds = st.optInt("frictionSeconds", 15);
            d.passMinutes = st.optInt("passMinutes", 15);

            if (!r.optBoolean("enabled", true)) d.skipReason = "regra pausada";
            else if (st.optBoolean("restMode")) d.skipReason = "modo descanso ativo";
            else if (!inDays(r)) d.skipReason = "fora dos dias " + r.optString("days");
            else if (!inWindow(r)) d.skipReason = "fora do horário " + d.windowStart + "–" + d.windowEnd;
            else if (BlockerStore.hasPass(c, pkg) || BlockerStore.hasPass(c, rPkg)) d.skipReason = "destravado por recompensa";
            else if (d.rigor == 0) d.skipReason = "rigor Observar";
            return d;
        }
        return null;
    }

    private static boolean matchesRule(String pkg, String appLabel, JSONObject r) {
        String rPkg = r.optString("pkg", "").trim().toLowerCase(Locale.ROOT);
        String rName = r.optString("name", "").trim().toLowerCase(Locale.ROOT);
        String p = pkg.trim().toLowerCase(Locale.ROOT);
        String lbl = appLabel == null ? "" : appLabel.trim().toLowerCase(Locale.ROOT);

        if (!rPkg.isEmpty() && p.equals(rPkg)) return true;

        // Famílias de pacotes conhecidos (Lite, regionais, etc.)
        if ((rPkg.contains("musically") || rPkg.contains("trill") || rName.contains("tiktok"))
                && (p.contains("musically") || p.contains("trill") || p.contains("tiktok"))) return true;
        if ((rPkg.contains("instagram") || rName.contains("instagram"))
                && (p.contains("instagram") || p.contains("com.instagram.android") || p.contains("com.instagram.lite"))) return true;
        if ((rPkg.contains("barcelona") || rName.contains("threads"))
                && (p.contains("barcelona") || p.contains("threads"))) return true;
        if ((rPkg.contains("twitter") || rName.contains("twitter") || rName.equals("x"))
                && (p.contains("twitter") || p.contains("com.twitter.android") || p.contains("x.android") || p.contains("com.x."))) return true;
        if ((rPkg.contains("youtube") || rName.contains("youtube"))
                && (p.contains("youtube") && !p.contains("music"))) return true;
        if ((rPkg.contains("facebook") || rName.contains("facebook"))
                && (p.contains("facebook.katana") || p.contains("facebook.lite") || p.contains("com.facebook."))) return true;
        if ((rPkg.contains("reddit") || rName.contains("reddit"))
                && p.contains("reddit")) return true;
        if ((rPkg.contains("pinterest") || rName.contains("pinterest"))
                && p.contains("pinterest")) return true;
        if ((rPkg.contains("netflix") || rName.contains("netflix"))
                && p.contains("netflix")) return true;
        if ((rPkg.contains("discord") || rName.contains("discord"))
                && p.contains("discord")) return true;
        if ((rPkg.contains("twitch") || rName.contains("twitch"))
                && p.contains("twitch")) return true;
        if ((rPkg.contains("kwai") || rName.contains("kwai"))
                && (p.contains("kwai") || p.contains("kuaishou"))) return true;

        // Correspondência pelo nome visível do aplicativo instalado no celular
        if (rName.length() >= 3) {
            if (!lbl.isEmpty() && (lbl.equals(rName) || lbl.contains(rName) || rName.contains(lbl))) {
                return true;
            }
            String slug = rName.replaceAll("[^a-z0-9]", "");
            if (slug.length() >= 4 && p.contains(slug)) {
                return true;
            }
        }
        return false;
    }

    private static String getAppLabel(Context c, String pkg) {
        try {
            PackageManager pm = c.getPackageManager();
            ApplicationInfo ai = pm.getApplicationInfo(pkg, 0);
            CharSequence cs = pm.getApplicationLabel(ai);
            return cs != null ? cs.toString() : "";
        } catch (Exception e) {
            return "";
        }
    }

    private static boolean inDays(JSONObject r) {
        int dow = Calendar.getInstance().get(Calendar.DAY_OF_WEEK);
        boolean weekday = dow >= Calendar.MONDAY && dow <= Calendar.FRIDAY;
        String days = r.optString("days", "Todos os dias");
        if ("Dias úteis".equals(days)) return weekday;
        if ("Fins de semana".equals(days)) return !weekday;
        return true;
    }

    private static boolean inWindow(JSONObject r) {
        String ws = r.optString("windowStart", "00:00");
        String we = r.optString("windowEnd", "23:59");
        if ("00:00".equals(ws) && ("23:59".equals(we) || "00:00".equals(we))) return true;
        Calendar now = Calendar.getInstance();
        int minutes = now.get(Calendar.HOUR_OF_DAY) * 60 + now.get(Calendar.MINUTE);
        int start = toMinutes(ws);
        int end = toMinutes(we);
        if (start == end) return true;
        if (start < end) return minutes >= start && minutes <= end;
        return minutes >= start || minutes <= end;
    }

    private static int toMinutes(String hhmm) {
        try {
            String[] p = hhmm.split(":");
            return Integer.parseInt(p[0]) * 60 + Integer.parseInt(p[1]);
        } catch (Exception e) {
            return 0;
        }
    }
}
