const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const urlFile = path.join(__dirname, 'tunnel_url.txt');

function startTunnel() {
  console.log('Iniciando túnel SSH público com auto-reconexão para Cat Line...');
  const proc = spawn('ssh.exe', [
    '-o', 'StrictHostKeyChecking=no',
    '-o', 'ServerAliveInterval=15',
    '-o', 'ServerAliveCountMax=4',
    '-R', '80:localhost:5500',
    'nokey@localhost.run'
  ]);

  proc.stdout.on('data', (data) => {
    const text = data.toString();
    const match = text.match(/https:\/\/[a-z0-9]+\.lhr\.life/i);
    if (match) {
      const url = match[0];
      console.log('>>> URL PÚBLICA ATIVA DO CAT LINE:', url);
      fs.writeFileSync(urlFile, url, 'utf8');
    }
  });

  proc.stderr.on('data', (data) => {
    const text = data.toString();
    const match = text.match(/https:\/\/[a-z0-9]+\.lhr\.life/i);
    if (match) {
      const url = match[0];
      console.log('>>> URL PÚBLICA ATIVA DO CAT LINE:', url);
      fs.writeFileSync(urlFile, url, 'utf8');
    }
  });

  proc.on('close', (code) => {
    console.log(`Túnel desconectado (código ${code}). Reconectando em 3s...`);
    setTimeout(startTunnel, 3000);
  });
}

startTunnel();
