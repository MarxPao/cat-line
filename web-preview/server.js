const http = require('http');
const fs = require('fs');
const path = require('path');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.apk': 'application/vnd.android.package-archive'
};

function startServer(port) {
  const server = http.createServer((req, res) => {
    const cleanUrl = (req.url || '/').split('?')[0];
    const relPath = cleanUrl === '/' ? 'index.html' : cleanUrl.replace(/^\/+/, '');
    const filePath = path.join(__dirname, relPath);

    fs.readFile(filePath, (err, data) => {
      if (err) {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('Arquivo não encontrado');
        return;
      }
      const ext = path.extname(filePath).toLowerCase();
      const headers = {
        'Content-Type': MIME_TYPES[ext] || 'application/octet-stream',
        'Content-Length': data.length,
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Connection': 'close'
      };
      if (ext === '.apk') {
        headers['Content-Disposition'] = 'attachment; filename="CatLine-Instalador.apk"';
      }
      res.writeHead(200, headers);
      res.end(data);
    });
  });

  server.on('error', (e) => {
    console.error(`Port ${port} error:`, e.message);
  });

  server.listen(port, () => {
    console.log(`Dead Line Web Preview rodando em http://localhost:${port}`);
  });
}

startServer(5500);
startServer(8888);
