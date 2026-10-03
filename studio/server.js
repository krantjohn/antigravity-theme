const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { exec, execSync } = require('child_process');

const themeEngine = require('../core/theme_engine');

const PORT = 8316;
const PUBLIC_DIR = path.join(__dirname, 'public');

// MIME types for static assets
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.mp4': 'video/mp4'
};

// Helper: send JSON response
function sendJson(res, statusCode, data) {
  const body = JSON.stringify(data);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  });
  res.end(body);
}

// Helper: parse request JSON body
function parseBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', chunk => raw += chunk);
    req.on('end', () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', reject);
  });
}

// Helper: check CDP 8314 and Media 8315 availability
function checkPortStatus(port) {
  return new Promise((resolve) => {
    const client = http.get(`http://127.0.0.1:${port}/json`, { timeout: 800 }, (res) => {
      resolve(res.statusCode === 200);
    });
    client.on('error', () => resolve(false));
    client.on('timeout', () => {
      client.destroy();
      resolve(false);
    });
  });
}

// Helper: check Media Server status
function checkMediaServerStatus() {
  return new Promise((resolve) => {
    const client = http.get(`http://127.0.0.1:8315/health`, { timeout: 800 }, (res) => {
      resolve(res.statusCode === 200);
    });
    client.on('error', () => resolve(false));
    client.on('timeout', () => {
      client.destroy();
      resolve(false);
    });
  });
}

// Helper: Open native Windows file dialog
function openNativeFileDialog() {
  return new Promise((resolve) => {
    const exePath = path.join(__dirname, '..', 'bin', 'file_dialog.exe');
    const resultFile = path.join(__dirname, '.selected_file.txt');
    try { if (fs.existsSync(resultFile)) fs.unlinkSync(resultFile); } catch (e) {}

    // Read last directory memory if exists
    let lastDir = '';
    const memoryFile = path.join(__dirname, '.last_browse_dir.txt');
    if (fs.existsSync(memoryFile)) {
      try { lastDir = fs.readFileSync(memoryFile, 'utf8').trim(); } catch (e) {}
    }

    if (fs.existsSync(exePath)) {
      const args = (lastDir && fs.existsSync(lastDir)) ? `"${lastDir}"` : '';
      exec(`"${exePath}" ${args}`, { encoding: 'utf8', windowsHide: true }, (err, stdout) => {
        let selected = stdout ? stdout.trim() : '';
        if (!selected && fs.existsSync(resultFile)) {
          try { selected = fs.readFileSync(resultFile, 'utf8').trim(); } catch (e) {}
        }
        try { if (fs.existsSync(resultFile)) fs.unlinkSync(resultFile); } catch (e) {}
        resolve(selected);
      });
      return;
    }

    // Fallback: PowerShell with Base64 EncodedCommand (avoids pipe character issues)
    const psScript = [
      'Add-Type -AssemblyName System.Windows.Forms',
      '[System.Windows.Forms.Application]::EnableVisualStyles()',
      '$d = New-Object System.Windows.Forms.OpenFileDialog',
      '$d.Filter = "媒体与视频文件 (*.mp4;*.webm;*.jpg;*.png;*.webp)|*.mp4;*.webm;*.jpg;*.png;*.webp|所有文件 (*.*)|*.*"',
      '$d.Title = "🌸 选择要作为 Antigravity 壁纸的素材文件"',
      '$d.RestoreDirectory = $false',
      (lastDir && fs.existsSync(lastDir)) ? `$d.InitialDirectory = "${lastDir.replace(/\\/g, '\\\\')}"` : '',
      'if ($d.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK) {',
      '    [Console]::OutputEncoding = [System.Text.Encoding]::UTF8',
      '    Write-Host -NoNewline $d.FileName',
      '}'
    ].filter(Boolean).join("\r\n");

    const b64 = Buffer.from(psScript, 'utf16le').toString('base64');
    exec(`powershell -NoProfile -Sta -EncodedCommand ${b64}`, { encoding: 'utf8', windowsHide: true }, (err, stdout) => {
      let chosen = stdout ? stdout.trim() : '';
      if (chosen) {
        try { fs.writeFileSync(memoryFile, path.dirname(chosen), 'utf8'); } catch (e) {}
      }
      resolve(chosen);
    });
  });
}

const server = http.createServer(async (req, res) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    });
    res.end();
    return;
  }

  const parsedUrl = new URL(req.url, `http://127.0.0.1:${PORT}`);
  const pathname = parsedUrl.pathname;

  // ------------------------------------------------------------------
  // REST API Endpoints
  // ------------------------------------------------------------------

  // 1. GET /api/status - Complete live status
  if (req.method === 'GET' && pathname === '/api/status') {
    try {
      const isCdpOnline = await checkPortStatus(8314);
      const isMediaOnline = await checkMediaServerStatus();
      const slotsConfig = themeEngine.loadSlotsConfig();
      const presets = themeEngine.listPresets();
      const fontPresets = themeEngine.FONT_PRESETS;

      const localAppData = process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local');
      const defaultResDir = path.join(localAppData, 'Programs', 'antigravity', 'resources');
      const resDir = process.env.ANTIGRAVITY_RESOURCES || defaultResDir;
      const asarOrigBak = path.join(resDir, 'app.asar.orig.bak');
      const hasBackup = fs.existsSync(asarOrigBak);
      let backupSize = 0;
      if (hasBackup) {
        try { backupSize = (fs.statSync(asarOrigBak).size / 1024 / 1024).toFixed(2); } catch(e) {}
      }

      let weCount = 0;
      try {
        const weList = themeEngine.listWallpaperEngineWallpapers();
        weCount = weList ? weList.length : 0;
      } catch (e) {}

      return sendJson(res, 200, {
        success: true,
        isCdpOnline,
        isMediaOnline,
        slotsConfig,
        presets,
        fontPresets,
        hasBackup,
        backupSize,
        weCount,
        slotsMeta: themeEngine.SLOTS_META
      });
    } catch (err) {
      return sendJson(res, 500, { success: false, error: err.message });
    }
  }

  // 2. POST /api/swap - Swap slot wallpaper
  if (req.method === 'POST' && pathname === '/api/swap') {
    try {
      const body = await parseBody(req);
      const { slot, filePath } = body;
      if (!slot || !filePath) {
        return sendJson(res, 400, { success: false, error: 'slot and filePath are required' });
      }
      if (!fs.existsSync(filePath)) {
        return sendJson(res, 404, { success: false, error: `文件不存在: ${filePath}` });
      }

      console.log(`[Studio] 正在为槽位 [${slot}] 更换壁纸: ${filePath}`);
      const ok = await themeEngine.swapWallpaper(slot, filePath);
      const isOk = typeof ok === 'boolean' ? ok : Boolean(ok && ok.ok !== false);
      return sendJson(res, 200, { success: isOk, slot, filePath });
    } catch (err) {
      return sendJson(res, 500, { success: false, error: err.message });
    }
  }

  // 3. POST /api/set-pos - Update wallpaper position
  if (req.method === 'POST' && pathname === '/api/set-pos') {
    try {
      const body = await parseBody(req);
      const { slot, x, y } = body;
      if (!slot || x === undefined) {
        return sendJson(res, 400, { success: false, error: 'slot and x coordinate are required' });
      }

      const ok = await themeEngine.setPosition(slot, x, y);
      const isOk = typeof ok === 'boolean' ? ok : Boolean(ok && ok.ok !== false);
      return sendJson(res, 200, { success: isOk, slot, x, y });
    } catch (err) {
      return sendJson(res, 500, { success: false, error: err.message });
    }
  }

  // 4. POST /api/set-font - Update font color
  if (req.method === 'POST' && pathname === '/api/set-font') {
    try {
      const body = await parseBody(req);
      const { color } = body;
      if (!color) {
        return sendJson(res, 400, { success: false, error: 'color is required' });
      }

      const ok = await themeEngine.setFontColor(color);
      const isOk = typeof ok === 'boolean' ? ok : Boolean(ok && ok.ok !== false);
      return sendJson(res, 200, { success: isOk, color });
    } catch (err) {
      return sendJson(res, 500, { success: false, error: err.message });
    }
  }

  // 5. POST /api/presets/save - Save preset
  if (req.method === 'POST' && pathname === '/api/presets/save') {
    try {
      const body = await parseBody(req);
      const { name, desc } = body;
      if (!name) {
        return sendJson(res, 400, { success: false, error: 'Preset name is required' });
      }

      const ok = themeEngine.savePreset(name, desc || '');
      const isOk = typeof ok === 'boolean' ? ok : Boolean(ok && ok.ok !== false);
      return sendJson(res, 200, { success: isOk, name });
    } catch (err) {
      return sendJson(res, 500, { success: false, error: err.message });
    }
  }

  // 6. POST /api/presets/apply - Apply preset
  if (req.method === 'POST' && pathname === '/api/presets/apply') {
    try {
      const body = await parseBody(req);
      const { name } = body;
      if (!name) {
        return sendJson(res, 400, { success: false, error: 'Preset name is required' });
      }

      const ok = await themeEngine.applyPreset(name);
      const isOk = typeof ok === 'boolean' ? ok : Boolean(ok && ok.ok !== false);
      return sendJson(res, 200, { success: isOk, name });
    } catch (err) {
      return sendJson(res, 500, { success: false, error: err.message });
    }
  }

  // 7. POST /api/presets/delete - Delete preset
  if (req.method === 'POST' && pathname === '/api/presets/delete') {
    try {
      const body = await parseBody(req);
      const { name } = body;
      if (!name) {
        return sendJson(res, 400, { success: false, error: 'Preset name is required' });
      }

      const ok = themeEngine.deletePreset(name);
      const isOk = typeof ok === 'boolean' ? ok : Boolean(ok && ok.ok !== false);
      return sendJson(res, 200, { success: isOk, name });
    } catch (err) {
      return sendJson(res, 500, { success: false, error: err.message });
    }
  }

  // 8. POST /api/theme/vanilla - Restore vanilla mode
  if (req.method === 'POST' && pathname === '/api/theme/vanilla') {
    try {
      const ok = await themeEngine.restoreOriginal();
      const isOk = typeof ok === 'boolean' ? ok : Boolean(ok && ok.ok !== false);
      return sendJson(res, 200, { success: isOk });
    } catch (err) {
      return sendJson(res, 500, { success: false, error: err.message });
    }
  }

  // 9. POST /api/theme/uninstall - Completely physical uninstall
  if (req.method === 'POST' && pathname === '/api/theme/uninstall') {
    try {
      const ok = await themeEngine.uninstallCompletely();
      const isOk = typeof ok === 'boolean' ? ok : Boolean(ok && ok.ok !== false);
      return sendJson(res, 200, { success: isOk });
    } catch (err) {
      return sendJson(res, 500, { success: false, error: err.message });
    }
  }

  // 10. POST /api/file/browse - Pop open native Windows File Dialog
  if (req.method === 'POST' && pathname === '/api/file/browse') {
    try {
      const selectedPath = await openNativeFileDialog();
      return sendJson(res, 200, { success: true, filePath: selectedPath });
    } catch (err) {
      return sendJson(res, 500, { success: false, error: err.message });
    }
  }

  // 11. POST /api/shutdown - Graceful exit of the tool
  if (req.method === 'POST' && pathname === '/api/shutdown') {
    sendJson(res, 200, { success: true, message: 'Studio server is shutting down. Goodbye!' });
    console.log('[Studio] 用户请求彻底退出，正在完全销毁后台进程...');
    setTimeout(() => {
      server.close();
      process.exit(0);
    }, 400);
    return;
  }

  // ------------------------------------------------------------------
  // Static File Serving
  // ------------------------------------------------------------------
  let reqPath = pathname === '/' ? '/index.html' : pathname;
  const safePath = path.normalize(reqPath).replace(/^(\.\.[\/\\])+/, '');
  const filePath = path.join(PUBLIC_DIR, safePath);

  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': contentType });
    fs.createReadStream(filePath).pipe(res);
    return;
  }

  res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('404 Not Found');
});

server.listen(PORT, '127.0.0.1', () => {
  console.log('=======================================================');
  console.log('   🌸 Antigravity Theme Studio (Raycast / Linear Bento)');
  console.log(`   🚀 控制台服务已就绪: http://127.0.0.1:${PORT}`);
  console.log('   💡 用完即关，零后台常驻，零性能消耗！');
  console.log('=======================================================');
});

server.PORT = PORT;
server.server = server;

module.exports = { server, PORT };
