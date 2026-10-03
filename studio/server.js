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
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0',
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

// Helper: check if Antigravity process is running
function checkAntigravityProcess() {
  return new Promise((resolve) => {
    if (process.platform !== 'win32') return resolve(false);
    exec('tasklist /FI "IMAGENAME eq Antigravity.exe" /NH', { windowsHide: true }, (err, stdout) => {
      if (err || !stdout) return resolve(false);
      resolve(stdout.toLowerCase().includes('antigravity.exe'));
    });
  });
}

// Helper: restart Antigravity client
function restartAntigravity() {
  return new Promise((resolve, reject) => {
    const localAppData = process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local');
    const exePath = path.join(localAppData, 'Programs', 'antigravity', 'Antigravity.exe');
    if (!fs.existsSync(exePath)) {
      return reject(new Error('未找到 Antigravity.exe: ' + exePath));
    }

    console.log('[Studio] 正在重启 Antigravity 客户端...');
    const psScript = [
      '$p = Get-Process Antigravity -ErrorAction SilentlyContinue',
      'if ($p) {',
      '  $p | Stop-Process -Force -ErrorAction SilentlyContinue',
      '  Start-Sleep -Milliseconds 800',
      '}',
      `Start-Process -FilePath "${exePath.replace(/\\/g, '\\\\')}"`
    ].join("\r\n");

    const b64 = Buffer.from(psScript, 'utf16le').toString('base64');
    exec(`powershell -NoProfile -Sta -EncodedCommand ${b64}`, { windowsHide: true }, (err) => {
      if (err) {
        console.error('[Studio] 执行重启失败:', err);
        return reject(err);
      }
      resolve(true);
    });
  });
}

// Helper: Open native Windows file dialog using PowerShell Base64 EncodedCommand
function openNativeFileDialog() {
  return new Promise((resolve) => {
    let lastDir = '';
    const memoryFile = path.join(__dirname, '.last_browse_dir.txt');
    if (fs.existsSync(memoryFile)) {
      try { lastDir = fs.readFileSync(memoryFile, 'utf8').trim(); } catch (e) {}
    }

    const psLines = [
      'Add-Type -AssemblyName System.Windows.Forms',
      '[System.Windows.Forms.Application]::EnableVisualStyles()',
      '$d = New-Object System.Windows.Forms.OpenFileDialog',
      '$d.Filter = "媒体与视频文件 (*.mp4;*.webm;*.jpg;*.png;*.webp)|*.mp4;*.webm;*.jpg;*.png;*.webp|所有文件 (*.*)|*.*"',
      '$d.Title = "🌸 选择要作为 Antigravity 壁纸的素材文件"',
      '$d.RestoreDirectory = $false'
    ];

    if (lastDir && fs.existsSync(lastDir)) {
      psLines.push(`$d.InitialDirectory = "${lastDir.replace(/\\/g, '\\\\')}"`);
    }

    psLines.push('if ($d.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK) {');
    psLines.push('    [Console]::OutputEncoding = [System.Text.Encoding]::UTF8');
    psLines.push('    Write-Host -NoNewline $d.FileName');
    psLines.push('}');

    const script = psLines.join("\r\n");
    const b64 = Buffer.from(script, 'utf16le').toString('base64');
    exec(`powershell -NoProfile -Sta -EncodedCommand ${b64}`, { encoding: 'utf8', windowsHide: true }, (err, stdout) => {
      let chosen = stdout ? stdout.trim() : '';
      if (chosen) {
        try { fs.writeFileSync(memoryFile, path.dirname(chosen), 'utf8'); } catch (e) {}
      }
      resolve(chosen);
    });
  });
}

let lastClientHeartbeat = Date.now();
let hasEverHeartbeated = false;

const server = http.createServer(async (req, res) => {
  lastClientHeartbeat = Date.now();
  hasEverHeartbeated = true;

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
      lastClientHeartbeat = Date.now();
      hasEverHeartbeated = true;
      const isCdpOnline = await checkPortStatus(8314);
      const isMediaOnline = await checkMediaServerStatus();
      const isAntigravityRunning = await checkAntigravityProcess();
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
        isAntigravityRunning,
        slotsConfig,
        presets,
        fontPresets,
        hasBackup,
        backupSize,
        weCount,
        slotsMeta: themeEngine.SLOTS_META,
        patchStatus: themeEngine.checkInjectionStatus()
      });
    } catch (err) {
      return sendJson(res, 500, { success: false, error: err.message });
    }
  }

  // 1.5. POST /api/upload - Stream upload wallpaper directly from browser
  if (req.method === 'POST' && pathname === '/api/upload') {
    try {
      const slot = parsedUrl.searchParams.get('slot') || 'left';
      let rawFilename = parsedUrl.searchParams.get('filename') || 'wallpaper.mp4';
      const cleanFilename = path.basename(rawFilename).replace(/[^\w\.\-\u4e00-\u9fa5]/g, '_');

      const wallpapersDir = themeEngine.WALLPAPERS_DIR || path.join(os.homedir(), '.gemini', 'antigravity', 'wallpapers');
      if (!fs.existsSync(wallpapersDir)) {
        fs.mkdirSync(wallpapersDir, { recursive: true });
      }

      const tempTarget = path.join(wallpapersDir, `upload_${Date.now()}_${cleanFilename}`);
      const fileStream = fs.createWriteStream(tempTarget);

      req.pipe(fileStream);

      await new Promise((resolve, reject) => {
        fileStream.on('finish', resolve);
        fileStream.on('error', reject);
        req.on('error', reject);
      });

      console.log(`[Studio] 接收到浏览器直传素材: ${tempTarget} (${fs.statSync(tempTarget).size} 字节)`);
      const ok = await themeEngine.swapWallpaper(slot, tempTarget);
      const isOk = typeof ok === 'boolean' ? ok : Boolean(ok && ok.ok !== false);
      return sendJson(res, 200, { success: isOk, slot, filePath: tempTarget });
    } catch (err) {
      console.error('[Studio] 上传处理失败:', err);
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

  // 3.1. POST /api/slots/reset-pos - Reset slot position (or all slots)
  if (req.method === 'POST' && pathname === '/api/slots/reset-pos') {
    try {
      const body = await parseBody(req);
      const slot = body.slot || 'all';
      const ok = await themeEngine.resetPosition(slot);
      const isOk = typeof ok === 'boolean' ? ok : Boolean(ok && ok.ok !== false);
      return sendJson(res, 200, { success: isOk, slot });
    } catch (err) {
      return sendJson(res, 500, { success: false, error: err.message });
    }
  }

  // 3.2. POST /api/slots/reset-slot - Reset slot wallpaper and position to baseline default
  if (req.method === 'POST' && pathname === '/api/slots/reset-slot') {
    try {
      const body = await parseBody(req);
      const slot = body.slot || 'left';
      const ok = await themeEngine.resetSlotWallpaper(slot);
      const isOk = typeof ok === 'boolean' ? ok : Boolean(ok && ok.ok !== false);
      return sendJson(res, 200, { success: isOk, slot });
    } catch (err) {
      return sendJson(res, 500, { success: false, error: err.message });
    }
  }

  // 3.3. POST /api/theme/baseline - Revert all 5 slots and font to initial Baseline V1
  if (req.method === 'POST' && pathname === '/api/theme/baseline') {
    try {
      const ok = await themeEngine.revertToBaseline();
      const isOk = typeof ok === 'boolean' ? ok : Boolean(ok && ok.ok !== false);
      return sendJson(res, 200, { success: isOk });
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

  // 4.1. POST /api/font/reset - Reset font to default pure-white
  if (req.method === 'POST' && pathname === '/api/font/reset') {
    try {
      const ok = await themeEngine.setFontColor('pure-white');
      const isOk = typeof ok === 'boolean' ? ok : Boolean(ok && ok.ok !== false);
      return sendJson(res, 200, { success: isOk, color: '#ffffff' });
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

  // 9.5. POST /api/patch/install - Install or re-inject core patch
  if (req.method === 'POST' && pathname === '/api/patch/install') {
    try {
      console.log('[Studio] 收到核心注入请求，正在执行一键补丁安装...');
      const result = await themeEngine.installPatch();
      return sendJson(res, 200, result);
    } catch (err) {
      console.error('[Studio] 补丁注入失败:', err);
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

  // 10.5. POST /api/app/restart - Restart Antigravity client
  if (req.method === 'POST' && pathname === '/api/app/restart') {
    try {
      await restartAntigravity();
      return sendJson(res, 200, { success: true, message: '正在重启 Antigravity 客户端...' });
    } catch (err) {
      console.error('[Studio] 重启 Antigravity 失败:', err);
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
    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    });
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

// Watchdog: auto-terminate if client was once connected and has ceased communicating for 10 minutes
setInterval(() => {
  if (hasEverHeartbeated && (Date.now() - lastClientHeartbeat > 600000)) {
    console.log('[Studio] 客户端已断开超 10 分钟，安全释放后台服务 (零后台残留)...');
    try { server.close(); } catch(e) {}
    process.exit(0);
  }
}, 15000);

server.PORT = PORT;
server.server = server;

module.exports = { server, PORT };
