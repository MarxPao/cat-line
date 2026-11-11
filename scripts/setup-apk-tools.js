const fs = require('fs');
const path = require('path');
const https = require('https');

const TOOLS_DIR = path.resolve('tools-apk');
if (!fs.existsSync(TOOLS_DIR)) fs.mkdirSync(TOOLS_DIR, { recursive: true });

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    if (fs.existsSync(dest) && fs.statSync(dest).size > 1000) {
      console.log(`Already downloaded: ${path.basename(dest)}`);
      return resolve(dest);
    }
    console.log(`Downloading: ${url} -> ${path.basename(dest)}...`);
    const file = fs.createWriteStream(dest);
    https.get(url, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        return downloadFile(res.headers.location, dest).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`Failed to download ${url}: status ${res.statusCode}`));
      }
      res.pipe(file);
      file.on('finish', () => {
        file.close(() => {
          console.log(`Saved: ${path.basename(dest)} (${(fs.statSync(dest).size / (1024*1024)).toFixed(2)} MB)`);
          resolve(dest);
        });
      });
    }).on('error', (err) => {
      fs.unlink(dest, () => {});
      reject(err);
    });
  });
}

async function main() {
  try {
    // 1. Download aapt2
    const aapt2Jar = path.join(TOOLS_DIR, 'aapt2.jar');
    await downloadFile('https://dl.google.com/dl/android/maven2/com/android/tools/build/aapt2/8.5.2-11315950/aapt2-8.5.2-11315950-windows.jar', aapt2Jar);

    // 2. Download r8 (contains d8)
    const r8Jar = path.join(TOOLS_DIR, 'r8.jar');
    await downloadFile('https://dl.google.com/dl/android/maven2/com/android/tools/r8/8.5.35/r8-8.5.35.jar', r8Jar);

    // 3. Download android.jar (SDK 33)
    const androidJar = path.join(TOOLS_DIR, 'android.jar');
    await downloadFile('https://raw.githubusercontent.com/Sable/android-platforms/master/android-33/android.jar', androidJar);

    console.log("All APK tools downloaded successfully!");
  } catch (err) {
    console.error("Error during download:", err);
    process.exit(1);
  }
}

main();
