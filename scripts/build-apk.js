const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log("=== COMPILANDO APK NATIVO OFICIAL DO CAT LINE (API 33 + PYTHON ZIP_STORED DEX + ZIPALIGN + APKSIGNER V1/V2/V3) ===");

const JAVA_HOME = process.env.JAVA_HOME || 'C:\\Program Files\\Microsoft\\jdk-17.0.20.101-hotspot';
const JAVAC = `"${path.join(JAVA_HOME, 'bin', 'javac.exe')}"`;
const JAVA = `"${path.join(JAVA_HOME, 'bin', 'java.exe')}"`;
const KEYTOOL = `"${path.join(JAVA_HOME, 'bin', 'keytool.exe')}"`;

const BT_DIR = path.resolve('tools-apk', 'build-tools', 'android-13');
const AAPT = `"${path.join(BT_DIR, 'aapt.exe')}"`;
const AAPT2 = `"${path.join(BT_DIR, 'aapt2.exe')}"`;
const ZIPALIGN = `"${path.join(BT_DIR, 'zipalign.exe')}"`;
const D8_JAR = `"${path.join(BT_DIR, 'lib', 'd8.jar')}"`;
const APKSIGNER_JAR = `"${path.join(BT_DIR, 'lib', 'apksigner.jar')}"`;
const ANDROID_JAR = `"${path.resolve('tools-apk', 'android-33.jar')}"`;

const BUILD_DIR = path.resolve('build-apk');
const ASSETS_DIR = path.join(BUILD_DIR, 'assets');
const RES_DIR = path.join(BUILD_DIR, 'res');
const BIN_DIR = path.join(BUILD_DIR, 'bin');
const SRC_DIR = path.join(BUILD_DIR, 'src', 'com', 'catline', 'app');

// Limpa diretório res antigo para não deixar drawable sem densidade
if (fs.existsSync(RES_DIR)) {
  fs.rmSync(RES_DIR, { recursive: true, force: true });
}
if (fs.existsSync(BIN_DIR)) {
  fs.rmSync(BIN_DIR, { recursive: true, force: true });
}

[ASSETS_DIR, path.join(RES_DIR, 'values'), BIN_DIR, SRC_DIR].forEach(d => {
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
});

const safeDate = new Date('2024-01-01T12:00:00Z');
function normalizeTimestamp(filePath) {
  if (fs.existsSync(filePath)) {
    fs.utimesSync(filePath, safeDate, safeDate);
  }
}

// 1. Gera ícones multi-densidade (mdpi, hdpi, xhdpi, xxhdpi, xxxhdpi) + ícones PWA 192/512
console.log("1. Gerando ícones multi-densidade oficiais e strings.xml...");
execSync(`python scripts/apk_helper.py icons "${RES_DIR}" "${path.resolve('web-preview')}"`, { stdio: 'inherit' });

const stringsXml = `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <string name="app_name">Cat Line</string>
</resources>`;
function copyDir(src, dst) {
  fs.mkdirSync(dst, { recursive: true });
  for (const e of fs.readdirSync(src, { withFileTypes: true })) {
    const from = path.join(src, e.name);
    const to = path.join(dst, e.name);
    if (e.isDirectory()) copyDir(from, to);
    else fs.copyFileSync(from, to);
  }
}
copyDir(path.resolve('android-src', 'res'), RES_DIR);
const stringsPath = path.join(RES_DIR, 'values', 'strings.xml');
fs.writeFileSync(stringsPath, stringsXml, 'utf8');
normalizeTimestamp(stringsPath);

// 2. Atualiza index.html dos assets a partir do CatLine-App.html
console.log("2. Atualizando assets internos (CatLine-App.html)...");
const indexHtmlPath = path.join(ASSETS_DIR, 'index.html');
fs.copyFileSync('CatLine-App.html', indexHtmlPath);
normalizeTimestamp(indexHtmlPath);

// 3. AndroidManifest.xml 100% compatível com Android 5.0 a Android 15 (minSdk=21, targetSdk=33 == compileSdk=33)
console.log("3. Configurando AndroidManifest.xml (com.catline.app, minSdk=21, targetSdk=33)...");
const manifest = `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="com.catline.app"
    android:versionCode="13"
    android:versionName="3.2.0"
    android:installLocation="auto">

    <uses-sdk android:minSdkVersion="21" android:targetSdkVersion="33" />

    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.VIBRATE" />
    <uses-permission android:name="android.permission.SYSTEM_ALERT_WINDOW" />
    <uses-permission android:name="android.permission.WAKE_LOCK" />
    <uses-permission android:name="android.permission.RECEIVE_BOOT_COMPLETED" />
    <uses-permission android:name="android.permission.SCHEDULE_EXACT_ALARM" />
    <uses-permission android:name="android.permission.POST_NOTIFICATIONS" />

    <queries>
        <package android:name="com.instagram.android" />
        <package android:name="com.instagram.lite" />
        <package android:name="com.zhiliaoapp.musically" />
        <package android:name="com.ss.android.ugc.trill" />
        <package android:name="com.twitter.android" />
        <package android:name="com.google.android.youtube" />
        <package android:name="com.facebook.katana" />
        <package android:name="com.facebook.lite" />
        <package android:name="com.reddit.frontpage" />
        <package android:name="com.pinterest" />
        <package android:name="com.instagram.barcelona" />
        <package android:name="com.netflix.mediaclient" />
        <package android:name="com.discord" />
        <package android:name="tv.twitch.android.app" />
        <package android:name="com.kwai.video" />
        <package android:name="com.whatsapp" />
        <intent>
            <action android:name="android.intent.action.MAIN" />
            <category android:name="android.intent.category.LAUNCHER" />
        </intent>
    </queries>

    <application
        android:label="@string/app_name"
        android:icon="@drawable/icon"
        android:theme="@android:style/Theme.DeviceDefault.NoActionBar"
        android:allowBackup="false"
        android:hardwareAccelerated="true">

        <activity
            android:name="com.catline.app.MainActivity"
            android:label="@string/app_name"
            android:exported="true"
            android:configChanges="orientation|screenSize|screenLayout|keyboardHidden"
            android:screenOrientation="portrait">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>

        <activity
            android:name="com.catline.app.BlockActivity"
            android:exported="false"
            android:launchMode="singleTask"
            android:taskAffinity=""
            android:excludeFromRecents="true"
            android:screenOrientation="portrait" />

        <service
            android:name="com.catline.app.BlockerService"
            android:exported="true"
            android:label="@string/app_name"
            android:permission="android.permission.BIND_ACCESSIBILITY_SERVICE">
            <intent-filter>
                <action android:name="android.accessibilityservice.AccessibilityService" />
            </intent-filter>
            <meta-data
                android:name="android.accessibilityservice"
                android:resource="@xml/accessibility_service_config" />
        </service>

        <receiver
            android:name="com.catline.app.ReminderReceiver"
            android:exported="false">
            <intent-filter>
                <action android:name="com.catline.app.ACTION_TRIGGER_REMINDER" />
                <action android:name="com.catline.app.ACTION_COMPLETE_TASK" />
                <action android:name="com.catline.app.ACTION_SNOOZE_TASK" />
                <action android:name="android.intent.action.BOOT_COMPLETED" />
            </intent-filter>
        </receiver>
    </application>
</manifest>`;
const manifestPath = path.join(BUILD_DIR, 'AndroidManifest.xml');
fs.writeFileSync(manifestPath, manifest, 'utf8');
normalizeTimestamp(manifestPath);

// 4. Código Java nativo MainActivity.java em com.catline.app
console.log("4. Gerando MainActivity.java nativo...");
const mainActivityJava = `package com.catline.app;

import android.app.Activity;
import android.os.Bundle;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.webkit.WebChromeClient;
import android.view.Window;
import android.graphics.Color;

public class MainActivity extends Activity {
    private WebView webView;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        requestWindowFeature(Window.FEATURE_NO_TITLE);

        if (android.os.Build.VERSION.SDK_INT >= 33
                && checkSelfPermission(\"android.permission.POST_NOTIFICATIONS\") != android.content.pm.PackageManager.PERMISSION_GRANTED) {
            requestPermissions(new String[]{\"android.permission.POST_NOTIFICATIONS\"}, 7001);
        }

        webView = new WebView(this);
        webView.setBackgroundColor(Color.parseColor("#181425"));
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setAllowFileAccess(true);
        settings.setAllowContentAccess(true);
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setUseWideViewPort(true);
        settings.setLoadWithOverviewMode(true);
        settings.setCacheMode(WebSettings.LOAD_DEFAULT);

        webView.setWebViewClient(new WebViewClient());
        webView.setWebChromeClient(new WebChromeClient());
        webView.addJavascriptInterface(new BlockerBridge(this), "AndroidBlocker");
        webView.loadUrl("file:///android_asset/index.html");
        setContentView(webView);
    }

    @Override
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }
}
`;
const srcJava = path.join(SRC_DIR, 'MainActivity.java');
fs.writeFileSync(srcJava, mainActivityJava, 'utf8');
normalizeTimestamp(srcJava);

// 5. Compila recursos com aapt2
console.log("5. Compilando recursos com aapt2 compile...");
const compiledRes = path.join(BUILD_DIR, 'compiled_res.zip');
if (fs.existsSync(compiledRes)) fs.unlinkSync(compiledRes);
execSync(`${AAPT2} compile --dir "${RES_DIR}" -o "${compiledRes}"`, { stdio: 'inherit' });

// 6. Cria pacote base com aapt2 link
console.log("6. Vinculando manifesto e assets ao pacote base com aapt2 link (API 33)...");
const baseApk = path.join(BUILD_DIR, 'base_aapt2.apk');
if (fs.existsSync(baseApk)) fs.unlinkSync(baseApk);
const GEN_DIR = path.join(BUILD_DIR, 'gen');
if (fs.existsSync(GEN_DIR)) fs.rmSync(GEN_DIR, { recursive: true, force: true });
fs.mkdirSync(GEN_DIR, { recursive: true });
execSync(`${AAPT2} link --java "${GEN_DIR}" -I ${ANDROID_JAR} --manifest "${manifestPath}" -o "${baseApk}" -A "${ASSETS_DIR}" "${compiledRes}"`, { stdio: 'inherit' });

// 7. Compila código Java para bytecode Java 8 (52.0)
console.log("7. Compilando código nativo Java (target 1.8)...");
function listFiles(dir, ext) {
  let out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out = out.concat(listFiles(p, ext));
    else if (p.endsWith(ext)) out.push(p);
  }
  return out;
}
// Copia as fontes nativas do bloqueio (android-src) para o diretório de build
copyDir(path.resolve('android-src', 'com', 'catline', 'app'), SRC_DIR);
const javaSources = listFiles(path.join(BUILD_DIR, 'src'), '.java').concat(listFiles(GEN_DIR, '.java'));
const argFile = path.join(BUILD_DIR, 'sources.txt');
fs.writeFileSync(argFile, javaSources.map(f => `"${f.replace(/\\/g, '/')}"`).join('\n'), 'utf8');
execSync(`${JAVAC} -encoding UTF-8 -source 1.8 -target 1.8 -bootclasspath ${ANDROID_JAR} -d "${BIN_DIR}" @"${argFile}"`, { stdio: 'inherit' });

// 8. Converte bytecode para classes.dex com D8 oficial do Build-Tools 33
console.log("8. Gerando classes.dex com D8 oficial (min-api 21)...");
const classFiles = listFiles(BIN_DIR, '.class').map(f => `"${f}"`).join(' ');
const dexFile = path.join(BUILD_DIR, 'classes.dex');
if (fs.existsSync(dexFile)) fs.unlinkSync(dexFile);
execSync(`${JAVA} -cp ${D8_JAR} com.android.tools.r8.D8 --min-api 21 --lib ${ANDROID_JAR} --output "${BUILD_DIR}" ${classFiles}`, { stdio: 'inherit' });
normalizeTimestamp(dexFile);

// 9. Injeta classes.dex como ZIP_STORED (descomprimido, method=0) com Python zipfile limpo!
console.log("9. Empacotando classes.dex (ZIP_STORED descomprimido) com estrutura ZIP limpa...");
const unalignedApk = path.join(BUILD_DIR, 'unaligned.apk');
if (fs.existsSync(unalignedApk)) fs.unlinkSync(unalignedApk);
execSync(`python scripts/apk_helper.py inject-dex "${baseApk}" "${dexFile}" "${unalignedApk}"`, { stdio: 'inherit' });

// 10. ZIPALIGN de 4 bytes e alinhamento de página
console.log("10. Executando zipalign (-p -f -v 4)...");
const alignedApk = path.join(BUILD_DIR, 'aligned.apk');
if (fs.existsSync(alignedApk)) fs.unlinkSync(alignedApk);
execSync(`${ZIPALIGN} -p -f -v 4 "${unalignedApk}" "${alignedApk}"`, { stdio: 'inherit' });

// 11. Gera Keystore com startdate em 2020/01/01
const keystorePath = path.join(BUILD_DIR, 'catline-v3.keystore');
console.log("11. Gerando certificado X.509 com startdate 2020/01/01...");
if (!fs.existsSync(keystorePath)) execSync(`${KEYTOOL} -genkeypair -v -keystore "${keystorePath}" -storetype PKCS12 -alias catline -keyalg RSA -keysize 2048 -sigalg SHA256withRSA -startdate "2020/01/01 00:00:00" -validity 12000 -storepass deadline123 -keypass deadline123 -dname "CN=CatLine, OU=Mobile, O=CatLine, L=SP, ST=SP, C=BR"`, { stdio: 'inherit' });

// 12. Assina o APK final com apksigner (V1 + V2 + V3)
console.log("12. Assinando APK com apksigner (v1 + v2 + v3)...");
const finalApk = path.resolve('CatLine.apk');
const installerApk = path.resolve('CatLine-Instalador.apk');
const versionApk = path.resolve('CatLine-v3.1.0.apk');
const webApk = path.resolve('web-preview', 'CatLine-Instalador.apk');
if (fs.existsSync(finalApk)) fs.unlinkSync(finalApk);

execSync(`${JAVA} -jar ${APKSIGNER_JAR} sign --ks "${keystorePath}" --ks-pass pass:deadline123 --ks-key-alias catline --min-sdk-version 21 --v1-signing-enabled true --v2-signing-enabled true --v3-signing-enabled true --out "${finalApk}" "${alignedApk}"`, { stdio: 'inherit' });

normalizeTimestamp(finalApk);
fs.copyFileSync(finalApk, installerApk);
fs.copyFileSync(finalApk, versionApk);
fs.copyFileSync(finalApk, webApk);
normalizeTimestamp(installerApk);
normalizeTimestamp(versionApk);
normalizeTimestamp(webApk);

// 13. Verificações formais
console.log("\n13. Verificando integridade final...");
const verifyAlignment = execSync(`${ZIPALIGN} -c -v 4 "${finalApk}"`, { encoding: 'utf8' });
console.log(verifyAlignment);

const verifySignature = execSync(`${JAVA} -jar ${APKSIGNER_JAR} verify --verbose --min-sdk-version 21 --print-certs "${finalApk}"`, { encoding: 'utf8' });
console.log("Apksigner:\n" + verifySignature.trim());

const badging = execSync(`${AAPT2} dump badging "${finalApk}"`, { encoding: 'utf8' });
console.log("\nAAPT2 Badging:\n" + badging.trim());
