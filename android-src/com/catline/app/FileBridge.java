package com.catline.app;

import android.app.Activity;
import android.content.ContentResolver;
import android.content.Intent;
import android.database.Cursor;
import android.net.Uri;
import android.provider.OpenableColumns;
import android.util.Log;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;

import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;

/**
 * Ponte para escolher e salvar arquivos de texto pelo seletor do Android (SAF).
 * Sem ela, o WebView nao abre input de arquivo nem baixa Blob, e importar ou exportar backup nao funciona.
 *
 * O resultado volta ao JavaScript por window.CatLineNative.onResult({token, ok, name, text, error}).
 * Nao pede nenhuma permissao de armazenamento: a usuaria escolhe o arquivo e o Android libera so aquele.
 */
public class FileBridge {
    private static final String TAG = "CatLineFileBridge";
    public static final int REQ_PICK = 7101;
    public static final int REQ_SAVE = 7102;
    private static final int MAX_BYTES = 5 * 1024 * 1024;

    private final Activity activity;
    private final WebView webView;
    private String pendingToken;
    private String pendingSaveText;

    public FileBridge(Activity activity, WebView webView) {
        this.activity = activity;
        this.webView = webView;
    }

    @JavascriptInterface
    public void pickTextFile(final String token) {
        activity.runOnUiThread(new Runnable() {
            @Override public void run() {
                try {
                    pendingToken = token;
                    Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT);
                    intent.addCategory(Intent.CATEGORY_OPENABLE);
                    intent.setType("*/*");
                    activity.startActivityForResult(intent, REQ_PICK);
                } catch (Exception e) {
                    Log.e(TAG, "Falha ao abrir o seletor", e);
                    reply(token, false, null, null, "picker_unavailable");
                }
            }
        });
    }

    @JavascriptInterface
    public void saveTextFile(final String token, final String filename, final String mime, final String text) {
        if (text == null || text.getBytes(StandardCharsets.UTF_8).length > MAX_BYTES) {
            reply(token, false, null, null, "too_large");
            return;
        }
        activity.runOnUiThread(new Runnable() {
            @Override public void run() {
                try {
                    pendingToken = token;
                    pendingSaveText = text;
                    Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT);
                    intent.addCategory(Intent.CATEGORY_OPENABLE);
                    intent.setType(mime == null || mime.length() == 0 ? "application/octet-stream" : mime);
                    intent.putExtra(Intent.EXTRA_TITLE, filename == null ? "catline.txt" : filename);
                    activity.startActivityForResult(intent, REQ_SAVE);
                } catch (Exception e) {
                    Log.e(TAG, "Falha ao abrir o seletor de destino", e);
                    pendingSaveText = null;
                    reply(token, false, null, null, "picker_unavailable");
                }
            }
        });
    }

    /** Chamado por MainActivity.onActivityResult. Retorna true se o resultado era desta ponte. */
    public boolean handleResult(int requestCode, int resultCode, Intent data) {
        if (requestCode != REQ_PICK && requestCode != REQ_SAVE) return false;
        String token = pendingToken;
        pendingToken = null;
        String textToSave = pendingSaveText;
        pendingSaveText = null;
        if (token == null) return true;

        if (resultCode != Activity.RESULT_OK || data == null || data.getData() == null) {
            reply(token, false, null, null, "cancelled");
            return true;
        }
        Uri uri = data.getData();
        ContentResolver resolver = activity.getContentResolver();
        try {
            if (requestCode == REQ_PICK) {
                String name = displayName(resolver, uri);
                String text = readUtf8(resolver, uri);
                if (text == null) { reply(token, false, name, null, "too_large"); return true; }
                reply(token, true, name, text, null);
            } else {
                OutputStream out = resolver.openOutputStream(uri, "wt");
                if (out == null || textToSave == null) { reply(token, false, null, null, "write_failed"); return true; }
                try { out.write(textToSave.getBytes(StandardCharsets.UTF_8)); out.flush(); } finally { out.close(); }
                reply(token, true, displayName(resolver, uri), null, null);
            }
        } catch (Exception e) {
            Log.e(TAG, "Falha ao ler ou gravar o arquivo", e);
            reply(token, false, null, null, requestCode == REQ_PICK ? "read_failed" : "write_failed");
        }
        return true;
    }

    private static String readUtf8(ContentResolver resolver, Uri uri) throws Exception {
        InputStream in = resolver.openInputStream(uri);
        if (in == null) throw new Exception("sem fluxo de leitura");
        try {
            ByteArrayOutputStream buf = new ByteArrayOutputStream();
            byte[] chunk = new byte[8192];
            int total = 0;
            int n;
            while ((n = in.read(chunk)) != -1) {
                total += n;
                if (total > MAX_BYTES) return null;
                buf.write(chunk, 0, n);
            }
            return new String(buf.toByteArray(), StandardCharsets.UTF_8);
        } finally {
            in.close();
        }
    }

    private static String displayName(ContentResolver resolver, Uri uri) {
        Cursor c = null;
        try {
            c = resolver.query(uri, new String[]{OpenableColumns.DISPLAY_NAME}, null, null, null);
            if (c != null && c.moveToFirst()) return c.getString(0);
        } catch (Exception ignored) {
        } finally {
            if (c != null) c.close();
        }
        return null;
    }

    private void reply(String token, boolean ok, String name, String text, String error) {
        try {
            JSONObject obj = new JSONObject();
            obj.put("token", token);
            obj.put("ok", ok);
            if (name != null) obj.put("name", name);
            if (text != null) obj.put("text", text);
            if (error != null) obj.put("error", error);
            final String js = "window.CatLineNative && window.CatLineNative.onResult(" + obj.toString() + ");";
            activity.runOnUiThread(new Runnable() {
                @Override public void run() {
                    try { webView.evaluateJavascript(js, null); } catch (Exception e) { Log.e(TAG, "evaluateJavascript falhou", e); }
                }
            });
        } catch (Exception e) {
            Log.e(TAG, "Falha ao responder ao JavaScript", e);
        }
    }
}
