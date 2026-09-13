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
  '.json': 'application/json',
  '.css': 'text/css; charset=utf-8'
};

const DEFAULT_PORT = 8315;

function createMediaServer(wallpapersDir, port = DEFAULT_PORT) {
  const server = http.createServer((req, res) => {
    // Enable CORS for Chromium / Electron renderer
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', '*');
    res.setHeader('Cache-Control', 'no-cache, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

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
        const configPath1 = path.join(wallpapersDir, 'slots_config.json');
        const configPath2 = path.join(path.dirname(wallpapersDir), 'slots_config.json');
        const configPath = fs.existsSync(configPath1) ? configPath1 : (fs.existsSync(configPath2) ? configPath2 : null);
        if (configPath) {
          const content = fs.readFileSync(configPath, 'utf8');
          res.writeHead(200, {
            'Content-Type': 'application/json; charset=utf-8',
            'Content-Length': Buffer.byteLength(content, 'utf8')
          });
          res.end(content);
        } else {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end('{}');
        }
        return;
      }

      // API endpoint for custom_theme.css
      if (pathname === '/custom_theme.css' || pathname === '/theme.css') {
        const cssPath1 = path.join(path.dirname(wallpapersDir), 'custom_theme.css');
        const cssPath2 = path.join(wallpapersDir, 'custom_theme.css');
        const cssPath = fs.existsSync(cssPath1) ? cssPath1 : (fs.existsSync(cssPath2) ? cssPath2 : null);
        if (cssPath) {
          const content = fs.readFileSync(cssPath, 'utf8');
          res.writeHead(200, {
            'Content-Type': 'text/css; charset=utf-8',
            'Content-Length': Buffer.byteLength(content, 'utf8')
          });
          res.end(content);
        } else {
          res.writeHead(404, { 'Content-Type': 'text/plain' });
          res.end('/* custom_theme.css not found */');
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

      let filePath = path.join(wallpapersDir, safeName);
      if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
        const altPath = path.join(path.dirname(wallpapersDir), safeName);
        if (fs.existsSync(altPath) && fs.statSync(altPath).isFile()) {
          filePath = altPath;
        } else {
          res.writeHead(404, { 'Content-Type': 'text/plain' });
          res.end('Not Found');
          return;
        }
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
      res.resume();
      resolve(res.statusCode === 200);
    });
    req.on('error', () => resolve(false));
    req.on('timeout', () => {
      req.destroy();
      resolve(false);
    });
  });
}

async function ensureMediaServer(wallpapersDir, port = DEFAULT_PORT) {
  const running = await isMediaServerRunning(port);
  if (running) {
    return true;
  }

  // 1. Try spawning a detached background daemon so it outlives short-lived CLI processes
  try {
    const { spawn } = require('child_process');
    const env = { ...process.env };
    if (process.versions && process.versions.electron) {
      env.ELECTRON_RUN_AS_NODE = '1';
    }
    const child = spawn(process.execPath, [__filename, wallpapersDir, String(port)], {
      detached: true,
      stdio: 'ignore',
      windowsHide: true,
      env
    });
    child.unref();

    for (let i = 0; i < 30; i++) {
      await new Promise(r => setTimeout(r, 100));
      if (await isMediaServerRunning(port)) {
        return true;
      }
    }
  } catch (e) {}

  // 2. Fallback: start in-process
  return new Promise((resolve) => {
    startMediaServer(wallpapersDir, port, (err) => {
      resolve(!err || err.code === 'EADDRINUSE');
    });
  });
}

if (require.main === module) {
  const os = require('os');
  const antigravityDir = process.env.ANTIGRAVITY_CONFIG_DIR || path.join(os.homedir(), '.gemini', 'antigravity');
  const dir = process.argv[2] || path.join(antigravityDir, 'wallpapers');
  const port = parseInt(process.argv[3], 10) || DEFAULT_PORT;
  startMediaServer(dir, port, (err) => {
    if (err && err.code !== 'EADDRINUSE') {
      console.error('[MediaServer] Failed to start:', err.message);
      process.exit(1);
    }
    console.log(`[MediaServer] Listening on http://127.0.0.1:${port} serving ${dir}`);
  });
}

module.exports = {
  createMediaServer,
  startMediaServer,
  ensureMediaServer,
  isMediaServerRunning,
  DEFAULT_PORT,
  MIME_TYPES
};

