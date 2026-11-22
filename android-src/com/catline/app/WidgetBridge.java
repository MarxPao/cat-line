package com.catline.app;

import android.content.Context;
import android.webkit.JavascriptInterface;

/** Ponte JavaScript para o widget "Hoje". Recebe so o resumo do dia, nunca dados completos. */
public class WidgetBridge {
    private final Context ctx;

    public WidgetBridge(Context ctx) {
        this.ctx = ctx.getApplicationContext();
    }

    @JavascriptInterface
    public void updateWidget(String json) {
        CatLineWidgetProvider.saveSnapshot(ctx, json);
    }
}
