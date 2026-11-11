const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const ROOT = path.resolve('build-apk');
const RES = path.join(ROOT, 'res');
const DRAWABLE = path.join(RES, 'drawable');
const VALUES = path.join(RES, 'values');
const SRC = path.join(ROOT, 'src', 'com', 'deadline', 'app');
const ASSETS = path.join(ROOT, 'assets');

[ROOT, RES, DRAWABLE, VALUES, SRC, ASSETS].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// 1. AndroidManifest.xml
const manifest = `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="com.deadline.app"
    android:versionCode="1"
    android:versionName="1.0.0">

    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.VIBRATE" />

    <application
        android:label="@string/app_name"
        android:icon="@drawable/icon"
        android:theme="@android:style/Theme.NoTitleBar.Fullscreen"
        android:allowBackup="false"
        android:hardwareAccelerated="true">

        <activity
            android:name=".MainActivity"
            android:exported="true"
            android:configChanges="orientation|screenSize|screenLayout|keyboardHidden"
            android:screenOrientation="portrait">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>
    </application>
</manifest>`;
fs.writeFileSync(path.join(ROOT, 'AndroidManifest.xml'), manifest, 'utf8');

// 2. strings.xml
const strings = `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <string name="app_name">Cat Line</string>
</resources>`;
fs.writeFileSync(path.join(VALUES, 'strings.xml'), strings, 'utf8');

// 3. MainActivity.java
const mainActivity = `package com.deadline.app;

import android.app.Activity;
import android.os.Bundle;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.webkit.WebChromeClient;
import android.view.Window;
import android.view.WindowManager;

public class MainActivity extends Activity {
    private WebView webView;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        requestWindowFeature(Window.FEATURE_NO_TITLE);
        getWindow().setFlags(
            WindowManager.LayoutParams.FLAG_FULLSCREEN,
            WindowManager.LayoutParams.FLAG_FULLSCREEN
        );

        webView = new WebView(this);
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setAllowFileAccess(true);
        settings.setAllowContentAccess(true);
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setUseWideViewPort(true);
        settings.setLoadWithOverviewMode(true);

        webView.setWebViewClient(new WebViewClient());
        webView.setWebChromeClient(new WebChromeClient());
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
fs.writeFileSync(path.join(SRC, 'MainActivity.java'), mainActivity, 'utf8');

// 4. assets/index.html
fs.copyFileSync('CatLine-App.html', path.join(ASSETS, 'index.html'));

// 5. Generate a cute pixel art icon (PNG)
// We create an uncompressed RGBA 48x48 PNG with a cute cat & pink yarn
function createPixelArtPng(width, height) {
  // Simple PNG encoder
  const buffer = Buffer.alloc(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      // Background: Cozy warm cream #fff8e7
      let r = 255, g = 248, b = 231, a = 255;
      
      // Border outline (soft purple ink)
      if (x < 2 || x >= width - 2 || y < 2 || y >= height - 2) {
        r = 38; g = 35; b = 53;
      }
      // Cat head (circle/rounded box centered)
      const dx = x - 24;
      const dy = y - 24;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      // Ears
      const isLeftEar = (x >= 12 && x <= 20 && y >= 8 && y <= 16 && (x - 12) + (16 - y) >= 4);
      const isRightEar = (x >= 28 && x <= 36 && y >= 8 && y <= 16 && (36 - x) + (16 - y) >= 4);

      if (isLeftEar || isRightEar) {
        r = 255; g = 179; b = 138; // Calico peach/orange ear
        if (x === 12 || x === 36 || y === 8) { r = 38; g = 35; b = 53; } // outline
      }
      
      // Cat Face
      if (dist <= 15) {
        r = 255; g = 255; b = 255; // White calico base
        // Calico patch (orange on right)
        if (dx > 4 && dy < 6) { r = 235; g = 140; b = 80; }
        // Calico patch (black/brown on left ear side)
        if (dx < -6 && dy < -4) { r = 70; g = 50; b = 40; }

        // Eyes (black pixel dots)
        if ((x === 19 || x === 20 || x === 28 || x === 29) && (y === 22 || y === 23)) {
          r = 38; g = 35; b = 53;
        }
        // Nose (pink)
        if ((x === 23 || x === 24) && y === 26) {
          r = 255; g = 130; b = 160;
        }
        // Mouth
        if ((x >= 22 && x <= 25) && y === 28) {
          r = 38; g = 35; b = 53;
        }
        // Cheeks (blush pink)
        if ((x === 16 || x === 17 || x === 31 || x === 32) && y === 25) {
          r = 255; g = 180; b = 200;
        }
      }

      // Pink Bow on left ear
      if (x >= 15 && x <= 21 && y >= 14 && y <= 18) {
        r = 255; g = 105; b = 180; // Bright pink
        if (x === 18 && y === 16) { r = 255; g = 215; b = 0; } // Gold center knot
      }

      // Cute Yarn Ball at bottom right
      const ydx = x - 35;
      const ydy = y - 35;
      const ydist = Math.sqrt(ydx * ydx + ydy * ydy);
      if (ydist <= 8) {
        r = 255; g = 180; b = 0; // Gold yarn
        if (x % 3 === 0 || y % 3 === 0) { r = 230; g = 140; b = 0; }
      }

      buffer[idx] = r;
      buffer[idx + 1] = g;
      buffer[idx + 2] = b;
      buffer[idx + 3] = a;
    }
  }

  // Create minimal valid PNG with zlib
  const IHDR = Buffer.alloc(13);
  IHDR.writeUInt32BE(width, 0);
  IHDR.writeUInt32BE(height, 4);
  IHDR[8] = 8; // bit depth
  IHDR[9] = 6; // color type RGBA
  IHDR[10] = 0; // compression
  IHDR[11] = 0; // filter
  IHDR[12] = 0; // interlace

  // Raw image data with scanline filter bytes
  const scanlines = Buffer.alloc(height * (width * 4 + 1));
  for (let y = 0; y < height; y++) {
    scanlines[y * (width * 4 + 1)] = 0; // filter None
    buffer.copy(scanlines, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4);
  }

  const IDAT = zlib.deflateSync(scanlines);

  function makeChunk(type, data) {
    const chunk = Buffer.alloc(4 + 4 + data.length + 4);
    chunk.writeUInt32BE(data.length, 0);
    chunk.write(type, 4, 4, 'ascii');
    data.copy(chunk, 8);
    // CRC32
    let c = 0xffffffff;
    const buf = Buffer.concat([Buffer.from(type, 'ascii'), data]);
    for (let i = 0; i < buf.length; i++) {
      c ^= buf[i];
      for (let j = 0; j < 8; j++) {
        c = (c >>> 1) ^ (c & 1 ? 0xedb88320 : 0);
      }
    }
    chunk.writeUInt32BE((c ^ 0xffffffff) >>> 0, 8 + data.length);
    return chunk;
  }

  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdrChunk = makeChunk('IHDR', IHDR);
  const idatChunk = makeChunk('IDAT', IDAT);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([sig, ihdrChunk, idatChunk, iendChunk]);
}

const iconPng = createPixelArtPng(48, 48);
fs.writeFileSync(path.join(DRAWABLE, 'icon.png'), iconPng);

console.log("Project build-apk prepared successfully with code, manifest, strings and cute icon!");
