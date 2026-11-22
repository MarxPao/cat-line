package com.catline.app;

import android.content.ComponentName;
import android.content.ContentResolver;
import android.content.Context;
import android.content.pm.PackageManager;
import android.provider.Settings;
import android.util.Log;

/**
 * Liga o servico de bloqueio sem passar pela tela de Acessibilidade, quando o aparelho concedeu
 * a permissao WRITE_SECURE_SETTINGS por ADB:
 *
 *   adb shell pm grant com.catline.app android.permission.WRITE_SECURE_SETTINGS
 *
 * Essa permissao e poderosa, entao o Cat Line so a usa para acrescentar ou conferir o proprio servico na lista
 * de acessibilidade. Nunca apaga servicos de outros apps. Sem a permissao, nada aqui faz efeito.
 */
final class AccessibilityEnabler {
    private static final String TAG = "CatLineA11yEnabler";
    static final String PERMISSION = "android.permission.WRITE_SECURE_SETTINGS";

    private AccessibilityEnabler() {}

    static boolean canSelfEnable(Context c) {
        return c.checkCallingOrSelfPermission(PERMISSION) == PackageManager.PERMISSION_GRANTED;
    }

    private static ComponentName component(Context c) {
        return new ComponentName(c, BlockerService.class);
    }

    static boolean isEnabled(Context c) {
        ComponentName cn = component(c);
        String raw = Settings.Secure.getString(c.getContentResolver(), Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES);
        return AccessibilityListEditor.contains(raw, cn.flattenToString(), cn.flattenToShortString());
    }

    /** Resultado: ok, already, no_permission ou error. */
    static String enable(Context c) {
        if (!canSelfEnable(c)) return "no_permission";
        try {
            ContentResolver cr = c.getContentResolver();
            ComponentName cn = component(c);
            String raw = Settings.Secure.getString(cr, Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES);
            boolean already = AccessibilityListEditor.contains(raw, cn.flattenToString(), cn.flattenToShortString());
            if (!already) {
                String next = AccessibilityListEditor.add(raw, cn.flattenToString(), cn.flattenToShortString());
                Settings.Secure.putString(cr, Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES, next);
            }
            if (Settings.Secure.getInt(cr, Settings.Secure.ACCESSIBILITY_ENABLED, 0) != 1) {
                Settings.Secure.putInt(cr, Settings.Secure.ACCESSIBILITY_ENABLED, 1);
            }
            return already ? "already" : "ok";
        } catch (SecurityException e) {
            Log.w(TAG, "Permissao avancada ausente ou revogada", e);
            return "no_permission";
        } catch (Exception e) {
            Log.e(TAG, "Falha ao ligar o servico", e);
            return "error";
        }
    }

    /**
     * Religa o servico se o Android o desligou, mas so quando a usuaria pediu isso no app, o modulo Foco
     * esta ligado e o modo descanso nao esta ativo. Se ela desligou o servico de proposito e nao quer
     * que volte, basta desmarcar a opcao no cartao do bloqueador.
     */
    static void healIfNeeded(Context c) {
        try {
            if (!BlockerStore.isAutoEnable(c)) return;
            if (!canSelfEnable(c)) return;
            if (!BlockerStore.isFocoEnabled(c)) return;
            if (BlockerStore.state(c).optBoolean("restMode")) return;
            if (isEnabled(c)) return;
            Log.i(TAG, "Servico desligado pelo sistema; religando: " + enable(c));
        } catch (Exception e) {
            Log.w(TAG, "Falha ao conferir o servico", e);
        }
    }
}
