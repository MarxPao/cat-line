package com.catline.app;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

/**
 * Edita o texto de Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES, que guarda os servicos de
 * acessibilidade ligados separados por ":".
 *
 * Classe pura, sem dependencia do Android, para poder ser testada no JDK.
 * Regra de ouro: nunca apagar os servicos de outros apps, como o TalkBack. So acrescenta ou remove o nosso.
 */
final class AccessibilityListEditor {
    private AccessibilityListEditor() {}

    /** Quebra o texto salvo em itens, ignorando vazios, espacos e o texto "null" que alguns aparelhos gravam. */
    static List<String> split(String raw) {
        List<String> out = new ArrayList<String>();
        if (raw == null) return out;
        for (String part : raw.split(":")) {
            String s = part.trim();
            if (s.length() == 0 || s.equalsIgnoreCase("null")) continue;
            out.add(s);
        }
        return out;
    }

    private static boolean same(String item, String... names) {
        for (String n : names) {
            if (n != null && item.equalsIgnoreCase(n)) return true;
        }
        return false;
    }

    /** Verdadeiro se o servico aparece na lista pelo nome completo ou pelo curto. */
    static boolean contains(String raw, String fullName, String shortName) {
        for (String item : split(raw)) {
            if (same(item, fullName, shortName)) return true;
        }
        return false;
    }

    /** Devolve a lista com o servico acrescentado no fim, sem duplicar e sem mexer nos outros. */
    static String add(String raw, String fullName, String shortName) {
        List<String> items = split(raw);
        for (String item : items) {
            if (same(item, fullName, shortName)) return join(items);
        }
        items.add(fullName);
        return join(items);
    }

    /** Devolve a lista sem o nosso servico, preservando todos os outros na mesma ordem. */
    static String remove(String raw, String fullName, String shortName) {
        List<String> kept = new ArrayList<String>();
        for (String item : split(raw)) {
            if (!same(item, fullName, shortName)) kept.add(item);
        }
        return join(kept);
    }

    private static String join(List<String> items) {
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < items.size(); i++) {
            if (i > 0) sb.append(':');
            sb.append(items.get(i));
        }
        return sb.toString().toLowerCase(Locale.ROOT).equals("null") ? "" : sb.toString();
    }
}
