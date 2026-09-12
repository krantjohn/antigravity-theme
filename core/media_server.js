const http = require('http');
const fs = require('fs');
const path = require('path');

const MIME_TYPES = {
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.ogg': 'video/ogg',
  '.ogv': 'video/ogg',
  '.mov': 'video/quicktime',
  '.m4v': 'video/mp4',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.json': 'application/json'
};

const DEFAULT_PORT = 8315;

function createMediaServer(wallpapersDir, port = DEFAULT_PORT) {
  const server = http.createServer((req, res) => {
    // Enable CORS for Chromium / Electron renderer
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', '*');

    if (req.method === 'OPTIONS') {
      res.writeHead(200);
      res.end();
      return;
    }

    try {
      const urlObj = new URL(req.url, `http://${req.headers.host || '127.0.0.1'}`);
      const pathname = decodeURIComponent(urlObj.pathname);

      // Health check endpoint
      if (pathname === '/health' || pathname === '/ping') {
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end('OK');
        return;
      }

      // API endpoint for slots config
      if (pathname === '/api/slots' || pathname === '/slots_config.json') {
        const configPath = path.join(wallpapersDir, 'slots_config.json');
        if (fs.existsSync(configPath)) {
          const content = fs.readFileSync(configPath, 'utf8');
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(content);
        } else {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end('{}');
        }
        return;
      }

      // Security check: restrict access to wallpapersDir and sanitize file name
      const safeName = path.basename(pathname);
      if (!safeName || safeName === '.' || safeName === '..') {
        res.writeHead(400, { 'Content-Type': 'text/plain' });
        res.end('Bad Request');
        return;
      }

      const filePath = path.join(wallpapersDir, safeName);
      if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not Found');
        return;
      }

      const stat = fs.statSync(filePath);
      const fileSize = stat.size;
      const ext = path.extname(filePath).toLowerCase();
      const contentType = MIME_TYPES[ext] || 'application/octet-stream';

      if (req.method === 'HEAD') {
        res.writeHead(200, {
          'Content-Length': fileSize,
          'Content-Type': contentType,
          'Accept-Ranges': 'bytes'
        });
        res.end();
        return;
      }

      // Range request support for HTML5 video seeking & streaming
      const range = req.headers.range;
      if (range) {
        const parts = range.replace(/bytes=/, '').split('-');
        let start = parseInt(parts[0], 10);
        let end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

        if (isNaN(start)) {
          start = fileSize - end;
          end = fileSize - 1;
        }

        if (start < 0 || start >= fileSize || end >= fileSize || start > end) {
          res.writeHead(416, {
            'Content-Range': `bytes */${fileSize}`
          });
          res.end();
          return;
        }

        const chunkSize = (end - start) + 1;
        const stream = fs.createReadStream(filePath, { start, end });
        res.writeHead(206, {
          'Content-Range': `bytes ${start}-${end}/${fileSize}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': chunkSize,
          'Content-Type': contentType
        });
        stream.pipe(res);
        stream.on('error', () => {
          res.destroy();
        });
        res.on('close', () => {
          stream.destroy();
        });
      } else {
        res.writeHead(200, {
          'Content-Length': fileSize,
          'Content-Type': contentType,
          'Accept-Ranges': 'bytes'
        });
        const stream = fs.createReadStream(filePath);
        stream.pipe(res);
        stream.on('error', () => {
          res.destroy();
        });
        res.on('close', () => {
          stream.destroy();
        });
      }
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('Internal Server Error: ' + err.message);
    }
  });

  server.on('error', (err) => {
    if (err.code !== 'EADDRINUSE') {
      console.warn('[MediaServer] Server warning:', err.message);
    }
  });

  return server;
}

function startMediaServer(wallpapersDir, port = DEFAULT_PORT, callback) {
  const server = createMediaServer(wallpapersDir, port);
  let callbackCalled = false;
  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      if (typeof callback === 'function' && !callbackCalled) {
        callbackCalled = true;
        callback(null, server);
      }
    } else {
      if (typeof callback === 'function' && !callbackCalled) {
        callbackCalled = true;
        callback(err);
      }
    }
  });
  server.listen(port, '127.0.0.1', () => {
    if (typeof callback === 'function' && !callbackCalled) {
      callbackCalled = true;
      callback(null, server);
    }
  });
  return server;
}

function isMediaServerRunning(port = DEFAULT_PORT) {
  return new Promise((resolve) => {
    const req = http.get(`http://127.0.0.1:${port}/health`, { timeout: 1000 }, (res) => {
      resolve(res.statusCode === 200);
    });
    req.on('error', () => resolve(false));
    req.on('timeout', () => {
      req.destroy();
      resolve(false);
    });
  });
}

module.exports = {
  createMediaServer,
  startMediaServer,
  isMediaServerRunning,
  DEFAULT_PORT,
  MIME_TYPES
};
