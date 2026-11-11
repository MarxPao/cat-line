const fs = require('fs');
const path = require('path');

const webDir = path.join(__dirname, '..', 'web-preview');
const indexPath = path.join(webDir, 'index.html');
const cssPath = path.join(webDir, 'style.css');
const clockPath = path.join(webDir, 'clock.js');
const commitmentsConfigPath = path.join(webDir, 'commitments-config.js');
const goalStepEnginePath = path.join(webDir, 'goal-step-engine.js');
const commitmentStateMachinePath = path.join(webDir, 'commitment-state-machine.js');
const delayMetricsEnginePath = path.join(webDir, 'delay-metrics-engine.js');
const rewardLedgerEnginePath = path.join(webDir, 'reward-ledger-engine.js');
const dayClosureEnginePath = path.join(webDir, 'day-closure-engine.js');
const weeklyLogEnginePath = path.join(webDir, 'weekly-log-engine.js');
const backupEnginePath = path.join(webDir, 'backup-engine.js');
const jsPath = path.join(webDir, 'app.js');
const imgPath = path.join(webDir, 'gatinha_referencia.jpg');
const iconPath = path.join(webDir, 'icon-192.png');

let html = fs.readFileSync(indexPath, 'utf8');
const css = fs.readFileSync(cssPath, 'utf8');
const clockJs = fs.readFileSync(clockPath, 'utf8');
const commitmentsConfigJs = fs.readFileSync(commitmentsConfigPath, 'utf8');
const goalStepEngineJs = fs.readFileSync(goalStepEnginePath, 'utf8');
const commitmentStateMachineJs = fs.readFileSync(commitmentStateMachinePath, 'utf8');
const delayMetricsEngineJs = fs.readFileSync(delayMetricsEnginePath, 'utf8');
const rewardLedgerEngineJs = fs.readFileSync(rewardLedgerEnginePath, 'utf8');
const dayClosureEngineJs = fs.readFileSync(dayClosureEnginePath, 'utf8');
const weeklyLogEngineJs = fs.readFileSync(weeklyLogEnginePath, 'utf8');
const backupEngineJs = fs.readFileSync(backupEnginePath, 'utf8');
const js = fs.readFileSync(jsPath, 'utf8');
const imgBase64 = fs.readFileSync(imgPath).toString('base64');
const imgDataUri = `data:image/jpeg;base64,${imgBase64}`;

if (fs.existsSync(iconPath)) {
  const iconBase64 = fs.readFileSync(iconPath).toString('base64');
  const iconDataUri = `data:image/png;base64,${iconBase64}`;
  html = html.replace(/href="icon-192\.png"/g, `href="${iconDataUri}"`);
}

// Substitui imagem por data URI
html = html.replace(/gatinha_referencia\.jpg/g, imgDataUri);

// Substitui link css por <style>
html = html.replace('<link rel="stylesheet" href="style.css">', `<style>\n${css}\n</style>`);

// Substitui scripts clock.js, commitments-config.js, goal-step-engine.js e app.js por <script> inlined
html = html.replace('<script src="clock.js"></script>', `<script>\n${clockJs}\n</script>`);
html = html.replace('<script src="commitments-config.js"></script>', `<script>\n${commitmentsConfigJs}\n</script>`);
html = html.replace('<script src="goal-step-engine.js"></script>', `<script>\n${goalStepEngineJs}\n</script>`);
html = html.replace('<script src="commitment-state-machine.js"></script>', `<script>\n${commitmentStateMachineJs}\n</script>`);
html = html.replace('<script src="delay-metrics-engine.js"></script>', `<script>\n${delayMetricsEngineJs}\n</script>`);
html = html.replace('<script src="reward-ledger-engine.js"></script>', `<script>\n${rewardLedgerEngineJs}\n</script>`);
html = html.replace('<script src="day-closure-engine.js"></script>', `<script>\n${dayClosureEngineJs}\n</script>`);
html = html.replace('<script src="weekly-log-engine.js"></script>', `<script>\n${weeklyLogEngineJs}\n</script>`);
html = html.replace('<script src="backup-engine.js"></script>', `<script>\n${backupEngineJs}\n</script>`);
html = html.replace('<script src="app.js"></script>', `<script>\n${js}\n</script>`);

const outPath = path.join(__dirname, '..', 'CatLine-App.html');
fs.writeFileSync(outPath, html, 'utf8');

console.log('Single-file CatLine-App.html generated successfully at:', outPath);
console.log('File size:', (fs.statSync(outPath).size / 1024).toFixed(2), 'KB');
