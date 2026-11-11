package com.catline.app;

import android.content.Context;
import android.content.SharedPreferences;
import android.os.Build;
import android.security.keystore.KeyGenParameterSpec;
import android.security.keystore.KeyProperties;
import android.util.Base64;
import android.util.Log;

import java.nio.charset.StandardCharsets;
import java.security.KeyStore;
import java.security.SecureRandom;
import javax.crypto.Cipher;
import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;

/**
 * Cofre seguro local do Cat Line utilizando o Android KeyStore nativo.
 * Criptografia AES-GCM 256 bits com IV aleatório por entrada.
 * 100% puro framework Android (zero AndroidX / zero dependências externas).
 */
public final class SecureVault {
    private static final String TAG = "CatLineVault";
    private static final String KEYSTORE_PROVIDER = "AndroidKeyStore";
    private static final String MASTER_KEY_ALIAS = "CatLineMasterKey_v1";
    private static final String PREFS_NAME = "catline_secure_vault";
    private static final String TRANSFORMATION = "AES/GCM/NoPadding";
    private static final int GCM_IV_LENGTH = 12; // 96 bits recomendado pelo NIST
    private static final int GCM_TAG_LENGTH = 128; // bits

    private SecureVault() {}

    private static synchronized SecretKey getOrCreateMasterKey() throws Exception {
        KeyStore keyStore = KeyStore.getInstance(KEYSTORE_PROVIDER);
        keyStore.load(null);

        if (!keyStore.containsAlias(MASTER_KEY_ALIAS)) {
            KeyGenerator keyGen = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, KEYSTORE_PROVIDER);
            KeyGenParameterSpec.Builder builder = new KeyGenParameterSpec.Builder(
                    MASTER_KEY_ALIAS,
                    KeyProperties.PURPOSE_ENCRYPT | KeyProperties.PURPOSE_DECRYPT)
                    .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
                    .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
                    .setKeySize(256)
                    .setRandomizedEncryptionRequired(true);

            keyGen.init(builder.build());
            return keyGen.generateKey();
        }

        KeyStore.SecretKeyEntry entry = (KeyStore.SecretKeyEntry) keyStore.getEntry(MASTER_KEY_ALIAS, null);
        return entry.getSecretKey();
    }

    /**
     * Cifra e armazena um segredo no cofre local privado.
     */
    public static synchronized void put(Context ctx, String alias, String plainText) {
        if (alias == null || alias.trim().isEmpty()) return;
        if (plainText == null) {
            remove(ctx, alias);
            return;
        }

        try {
            SecretKey key = getOrCreateMasterKey();
            Cipher cipher = Cipher.getInstance(TRANSFORMATION);
            cipher.init(Cipher.ENCRYPT_MODE, key);

            byte[] iv = cipher.getIV();
            byte[] cipherText = cipher.doFinal(plainText.getBytes(StandardCharsets.UTF_8));

            // Concatena IV (12 bytes) + CipherText
            byte[] combined = new byte[iv.length + cipherText.length];
            System.arraycopy(iv, 0, combined, 0, iv.length);
            System.arraycopy(cipherText, 0, combined, iv.length, cipherText.length);

            String encoded = Base64.encodeToString(combined, Base64.NO_WRAP);
            SharedPreferences prefs = ctx.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            prefs.edit().putString(alias, encoded).apply();
        } catch (Exception e) {
            Log.e(TAG, "Falha ao gravar segredo no cofre: " + alias, e);
        }
    }

    /**
     * Recupera e decifra um segredo armazenado no cofre local.
     */
    public static synchronized String get(Context ctx, String alias) {
        if (alias == null) return null;
        try {
            SharedPreferences prefs = ctx.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            String encoded = prefs.getString(alias, null);
            if (encoded == null) return null;

            byte[] combined = Base64.decode(encoded, Base64.NO_WRAP);
            if (combined.length <= GCM_IV_LENGTH) return null;

            byte[] iv = new byte[GCM_IV_LENGTH];
            int cipherTextLen = combined.length - GCM_IV_LENGTH;
            byte[] cipherText = new byte[cipherTextLen];

            System.arraycopy(combined, 0, iv, 0, GCM_IV_LENGTH);
            System.arraycopy(combined, GCM_IV_LENGTH, cipherText, 0, cipherTextLen);

            SecretKey key = getOrCreateMasterKey();
            Cipher cipher = Cipher.getInstance(TRANSFORMATION);
            GCMParameterSpec spec = new GCMParameterSpec(GCM_TAG_LENGTH, iv);
            cipher.init(Cipher.DECRYPT_MODE, key, spec);

            byte[] plainBytes = cipher.doFinal(cipherText);
            return new String(plainBytes, StandardCharsets.UTF_8);
        } catch (Exception e) {
            Log.e(TAG, "Falha ao recuperar segredo do cofre: " + alias, e);
            return null;
        }
    }

    /**
     * Remove um segredo do cofre.
     */
    public static synchronized void remove(Context ctx, String alias) {
        if (alias == null) return;
        try {
            SharedPreferences prefs = ctx.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            prefs.edit().remove(alias).apply();
        } catch (Exception e) {
            Log.e(TAG, "Falha ao remover segredo: " + alias, e);
        }
    }

    /**
     * Verifica se o segredo existe no cofre.
     */
    public static synchronized boolean has(Context ctx, String alias) {
        if (alias == null) return false;
        SharedPreferences prefs = ctx.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        return prefs.contains(alias);
    }
}
