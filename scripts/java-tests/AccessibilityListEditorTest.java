package com.catline.app;

/** Teste do editor da lista de acessibilidade. Roda no JDK, sem Android: javac e java. */
public class AccessibilityListEditorTest {
    static final String FULL = "com.catline.app/com.catline.app.BlockerService";
    static final String SHORT = "com.catline.app/.BlockerService";
    static final String TALKBACK = "com.google.android.marvin.talkback/com.google.android.marvin.talkback.TalkBackService";
    static final String OTHER = "com.outro.app/com.outro.app.Servico";

    static int checks = 0;

    static void eq(String label, Object expected, Object actual) {
        checks++;
        if (!String.valueOf(expected).equals(String.valueOf(actual))) {
            System.out.println("FALHOU: " + label + "\n  esperado: " + expected + "\n  recebido: " + actual);
            System.exit(1);
        }
    }

    public static void main(String[] args) {
        // add: lista vazia ou inexistente
        eq("null", FULL, AccessibilityListEditor.add(null, FULL, SHORT));
        eq("vazio", FULL, AccessibilityListEditor.add("", FULL, SHORT));
        eq("texto null do Android", FULL, AccessibilityListEditor.add("null", FULL, SHORT));
        eq("so espacos", FULL, AccessibilityListEditor.add("   ", FULL, SHORT));

        // add: preserva os outros servicos, na ordem
        eq("com talkback", TALKBACK + ":" + FULL, AccessibilityListEditor.add(TALKBACK, FULL, SHORT));
        eq("com dois", TALKBACK + ":" + OTHER + ":" + FULL, AccessibilityListEditor.add(TALKBACK + ":" + OTHER, FULL, SHORT));

        // add: nao duplica, em nome completo ou curto, em qualquer caixa
        eq("ja completo", TALKBACK + ":" + FULL, AccessibilityListEditor.add(TALKBACK + ":" + FULL, FULL, SHORT));
        eq("ja curto", SHORT, AccessibilityListEditor.add(SHORT, FULL, SHORT));
        eq("ja em outra caixa", FULL.toUpperCase(), AccessibilityListEditor.add(FULL.toUpperCase(), FULL, SHORT));

        // add: limpa lixo sem perder servicos validos
        eq("separadores sobrando", TALKBACK + ":" + FULL, AccessibilityListEditor.add(":" + TALKBACK + "::", FULL, SHORT));
        eq("espacos nas pontas", TALKBACK + ":" + FULL, AccessibilityListEditor.add("  " + TALKBACK + "  ", FULL, SHORT));

        // contains
        eq("contem completo", true, AccessibilityListEditor.contains(TALKBACK + ":" + FULL, FULL, SHORT));
        eq("contem curto", true, AccessibilityListEditor.contains(SHORT, FULL, SHORT));
        eq("nao contem", false, AccessibilityListEditor.contains(TALKBACK, FULL, SHORT));
        eq("nao contem null", false, AccessibilityListEditor.contains(null, FULL, SHORT));
        eq("nao confunde pacote parecido", false,
                AccessibilityListEditor.contains("com.catline.app.outro/com.catline.app.outro.BlockerService", FULL, SHORT));

        // remove: so tira o nosso
        eq("remove unico", "", AccessibilityListEditor.remove(FULL, FULL, SHORT));
        eq("remove no meio", TALKBACK + ":" + OTHER, AccessibilityListEditor.remove(TALKBACK + ":" + FULL + ":" + OTHER, FULL, SHORT));
        eq("remove curto", TALKBACK, AccessibilityListEditor.remove(TALKBACK + ":" + SHORT, FULL, SHORT));
        eq("remove ausente nao muda", TALKBACK, AccessibilityListEditor.remove(TALKBACK, FULL, SHORT));
        eq("remove de null", "", AccessibilityListEditor.remove(null, FULL, SHORT));

        // ida e volta nao estraga a lista original
        String original = TALKBACK + ":" + OTHER;
        eq("ida e volta", original, AccessibilityListEditor.remove(AccessibilityListEditor.add(original, FULL, SHORT), FULL, SHORT));

        System.out.println("OK " + checks + " verificacoes");
    }
}
