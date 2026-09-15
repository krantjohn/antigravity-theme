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
  '.mkv': 'video/x-matroska',
  '.avi': 'video/x-msvideo',
  '.flv': 'video/x-flv',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.bmp': 'image/bmp',
  '.svg': 'image/svg+xml',
  '.json': 'application/json; charset=utf-8',
  '.css': 'text/css; charset=utf-8'
};

const DEFAULT_PORT = 8315;

function createMediaServer(wallpapersDir, port = DEFAULT_PORT) {
  // In-memory caches to eliminate synchronous disk I/O and large string allocations
  let cachedCssBuf = null;
  let cachedCssMtime = 0;
  let cachedCssEtag = '';

  let cachedSlotsContent = null;
  let cachedSlotsMtime = 0;
  let cachedSlotsEtag = '';

  const statCache = new Map();
  const filePathCache = new Map();

  const server = http.createServer((req, res) => {
    // Enable CORS for Chromium / Electron renderer
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', '*');
    res.setHeader('Access-Control-Expose-Headers', 'Content-Range, Accept-Ranges, Content-Length, Content-Type, ETag');

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
        res.writeHead(200, {
          'Content-Type': 'text/plain',
          'Cache-Control': 'no-cache'
        });
        res.end('OK');
        return;
      }

      // API endpoint for slots config
      if (pathname === '/api/slots' || pathname === '/slots_config.json') {
        const configPath1 = path.join(wallpapersDir, 'slots_config.json');
        const configPath2 = path.join(path.dirname(wallpapersDir), 'slots_config.json');
        const configPath = fs.existsSync(configPath1) ? configPath1 : (fs.existsSync(configPath2) ? configPath2 : null);

        if (configPath) {
          try {
            const stat = fs.statSync(configPath);
            if (stat.mtimeMs !== cachedSlotsMtime || !cachedSlotsContent) {
              cachedSlotsContent = fs.readFileSync(configPath, 'utf8');
              cachedSlotsMtime = stat.mtimeMs;
              cachedSlotsEtag = `W/"slots-${stat.size.toString(16)}-${Math.floor(stat.mtimeMs).toString(16)}"`;
            }

            if (req.headers['if-none-match'] === cachedSlotsEtag) {
              res.writeHead(304);
              res.end();
              return;
            }

            res.writeHead(200, {
              'Content-Type': 'application/json; charset=utf-8',
              'Content-Length': Buffer.byteLength(cachedSlotsContent, 'utf8'),
              'ETag': cachedSlotsEtag,
              'Cache-Control': 'no-cache, must-revalidate'
            });
            res.end(cachedSlotsContent);
          } catch (e) {
            res.writeHead(500, { 'Content-Type': 'text/plain' });
            res.end('{}');
          }
        } else {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end('{}');
        }
        return;
      }

      // API endpoint for custom_theme.css (optimized in-memory cache & 304 validation)
      if (pathname === '/custom_theme.css' || pathname === '/theme.css') {
        const cssPath1 = path.join(path.dirname(wallpapersDir), 'custom_theme.css');
        const cssPath2 = path.join(wallpapersDir, 'custom_theme.css');
        const cssPath = fs.existsSync(cssPath1) ? cssPath1 : (fs.existsSync(cssPath2) ? cssPath2 : null);

        if (cssPath) {
          try {
            const stat = fs.statSync(cssPath);
            if (stat.mtimeMs !== cachedCssMtime || !cachedCssBuf) {
              cachedCssBuf = fs.readFileSync(cssPath);
              cachedCssMtime = stat.mtimeMs;
              cachedCssEtag = `W/"css-${stat.size.toString(16)}-${Math.floor(stat.mtimeMs).toString(16)}"`;
            }

            if (req.headers['if-none-match'] === cachedCssEtag) {
              res.writeHead(304);
              res.end();
              return;
            }

            res.writeHead(200, {
              'Content-Type': 'text/css; charset=utf-8',
              'Content-Length': cachedCssBuf.length,
              'ETag': cachedCssEtag,
              'Cache-Control': 'no-cache, must-revalidate'
            });
            res.end(cachedCssBuf);
          } catch (e) {
            res.writeHead(500, { 'Content-Type': 'text/plain' });
            res.end('/* Error reading theme css */');
          }
        } else {
          res.writeHead(404, { 'Content-Type': 'text/plain' });
          res.end('/* custom_theme.css not found */');
        }
        return;
      }

      // Security check: sanitize file name
      const safeName = path.basename(pathname);
      if (!safeName || safeName === '.' || safeName === '..') {
        res.writeHead(400, { 'Content-Type': 'text/plain' });
        res.end('Bad Request');
        return;
      }

      // Candidate search locations for files (with memory path cache to eliminate redundant sync I/O)
      let filePath = filePathCache.get(safeName);
      if (!filePath || !fs.existsSync(filePath)) {
        const candidatePaths = [
          path.join(wallpapersDir, safeName),
          path.join(path.dirname(wallpapersDir), safeName),
          path.join(path.dirname(wallpapersDir), 'wallpapers', safeName),
          path.join(__dirname, '..', 'wallpapers', safeName)
        ];
        filePath = candidatePaths.find(p => {
          try {
            return fs.existsSync(p) && fs.statSync(p).isFile();
          } catch(e) {
            return false;
          }
        });
        if (filePath) {
          if (filePathCache.size > 200) {
            const firstKey = filePathCache.keys().next().value;
            filePathCache.delete(firstKey);
          }
          filePathCache.set(safeName, filePath);
        }
      }

      if (!filePath) {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not Found: ' + safeName);
        return;
      }

      // Stat cache with 3s TTL to avoid repeated sync disk IO during intense streaming seeks
      let stat;
      const now = Date.now();
      const cachedStat = statCache.get(filePath);
      if (cachedStat && (now - cachedStat.time < 3000)) {
        stat = cachedStat.stat;
      } else {
        try {
          stat = fs.statSync(filePath);
          if (statCache.size > 200) {
            const firstKey = statCache.keys().next().value;
            statCache.delete(firstKey);
          }
          statCache.set(filePath, { stat, time: now });
        } catch(e) {
          res.writeHead(404, { 'Content-Type': 'text/plain' });
          res.end('Not Found: ' + safeName);
          return;
        }
      }

      const fileSize = stat.size;
      const ext = path.extname(filePath).toLowerCase();
      const contentType = MIME_TYPES[ext] || 'application/octet-stream';
      const etag = `W/"${fileSize.toString(16)}-${Math.floor(stat.mtimeMs).toString(16)}"`;
      const lastModified = stat.mtime.toUTCString();

      // 304 Not Modified validation for smooth looping and browser media caching
      if (req.headers['if-none-match'] === etag || 
          (req.headers['if-modified-since'] && new Date(req.headers['if-modified-since']) >= stat.mtime)) {
        res.writeHead(304);
        res.end();
        return;
      }

      const isMedia = ext === '.mp4' || ext === '.webm' || ext === '.ogg' || ext === '.jpg' || ext === '.png' || ext === '.gif' || ext === '.webp';
      const hasVersion = urlObj.searchParams.has('v');
      const cacheHeader = isMedia 
        ? (hasVersion ? 'public, max-age=31536000, immutable' : 'public, max-age=86400, stale-while-revalidate=604800') 
        : 'no-cache';

      if (req.method === 'HEAD') {
        res.writeHead(200, {
          'Content-Length': fileSize,
          'Content-Type': contentType,
          'Accept-Ranges': 'bytes',
          'ETag': etag,
          'Last-Modified': lastModified,
          'Cache-Control': cacheHeader
        });
        res.end();
        return;
      }

      // Range request support for HTML5 60FPS video seeking & streaming
      const range = req.headers.range;
      if (range) {
        const parts = range.replace(/bytes=/, '').split('-');
        let start = 0;
        let end = fileSize - 1;

        if (parts[0] === '' && parts[1] !== '') {
          // Suffix byte range: bytes=-500 (last 500 bytes)
          const suffix = parseInt(parts[1], 10);
          if (isNaN(suffix) || suffix <= 0) {
            res.writeHead(416, { 'Content-Range': `bytes */${fileSize}` });
            res.end();
            return;
          }
          start = Math.max(0, fileSize - suffix);
          end = fileSize - 1;
        } else if (parts[0] !== '' && parts[1] === '') {
          // Open-ended range: bytes=500-
          start = parseInt(parts[0], 10);
          end = fileSize - 1;
        } else if (parts[0] !== '' && parts[1] !== '') {
          // Explicit range: bytes=500-999
          start = parseInt(parts[0], 10);
          end = parseInt(parts[1], 10);
        } else {
          // Invalid range header
          res.writeHead(416, { 'Content-Range': `bytes */${fileSize}` });
          res.end();
          return;
        }

        if (isNaN(start) || isNaN(end) || start < 0 || start >= fileSize || end >= fileSize || start > end) {
          res.writeHead(416, {
            'Content-Range': `bytes */${fileSize}`
          });
          res.end();
          return;
        }

        const chunkSize = (end - start) + 1;
        // Dynamic adaptive buffer: bounded between 64KB and 512KB to minimize memory allocation while maximizing 60FPS throughput
        const bufferSize = Math.min(512 * 1024, Math.max(64 * 1024, chunkSize));
        const stream = fs.createReadStream(filePath, { start, end, highWaterMark: bufferSize });
        res.writeHead(206, {
          'Content-Range': `bytes ${start}-${end}/${fileSize}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': chunkSize,
          'Content-Type': contentType,
          'ETag': etag,
          'Last-Modified': lastModified,
          'Cache-Control': cacheHeader,
          'Connection': 'keep-alive',
          'Keep-Alive': 'timeout=60'
        });
        stream.pipe(res);
        const cleanup = () => {
          stream.destroy();
        };
        stream.on('error', () => {
          res.destroy();
        });
        res.on('error', cleanup);
        res.on('close', cleanup);
        res.on('finish', cleanup);
      } else {
        const bufferSize = Math.min(512 * 1024, Math.max(64 * 1024, fileSize));
        res.writeHead(200, {
          'Content-Length': fileSize,
          'Content-Type': contentType,
          'Accept-Ranges': 'bytes',
          'ETag': etag,
          'Last-Modified': lastModified,
          'Cache-Control': cacheHeader,
          'Connection': 'keep-alive',
          'Keep-Alive': 'timeout=60'
        });
        const stream = fs.createReadStream(filePath, { highWaterMark: bufferSize });
        stream.pipe(res);
        const cleanup = () => {
          stream.destroy();
        };
        stream.on('error', () => {
          res.destroy();
        });
        res.on('error', cleanup);
        res.on('close', cleanup);
        res.on('finish', cleanup);
      }
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('Internal Server Error: ' + err.message);
    }
  });

  server.keepAliveTimeout = 65000;
  server.headersTimeout = 66000;
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
