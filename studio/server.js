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
      '$f = New-Object System.Windows.Forms.Form',
      '$f.TopMost = $true',
      '$f.Opacity = 0',
      '$f.ShowInTaskbar = $false',
      '$d = New-Object System.Windows.Forms.OpenFileDialog',
      '$d.Filter = "媒体与视频文件 (*.mp4;*.webm;*.jpg;*.png;*.webp)|*.mp4;*.webm;*.jpg;*.png;*.webp|所有文件 (*.*)|*.*"',
      '$d.Title = "🌸 选择要作为 Antigravity 壁纸的素材文件"',
      '$d.RestoreDirectory = $false'
    ];

    if (lastDir && fs.existsSync(lastDir)) {
      psLines.push(`$d.InitialDirectory = "${lastDir.replace(/\\/g, '\\\\')}"`);
    }

    psLines.push('if ($d.ShowDialog($f) -eq [System.Windows.Forms.DialogResult]::OK) {');
    psLines.push('    [Console]::OutputEncoding = [System.Text.Encoding]::UTF8');
    psLines.push('    [Console]::Out.Write($d.FileName)');
    psLines.push('}');
    psLines.push('$f.Dispose()');

    const script = psLines.join("\r\n");
    const b64 = Buffer.from(script, 'utf16le').toString('base64');
    exec(`powershell -NoProfile -Sta -EncodedCommand ${b64}`, { encoding: 'utf8' }, (err, stdout) => {
      let chosen = stdout ? stdout.trim() : '';
      if (chosen) {
        try { fs.writeFileSync(memoryFile, path.dirname(chosen), 'utf8'); } catch (e) {}
      }
      resolve(chosen);
    });
  });
}

// Helper: Reset app window size and position in Windows and update Preferences
function resetAppWindowPlacement() {
  return new Promise((resolve) => {
    const profileDir = path.join(os.tmpdir(), 'antigravity_studio_profile');
    const prefPath = path.join(profileDir, 'Default', 'Preferences');
    const targetW = 1400;
    const targetH = 860;
    let targetX = 580;
    let targetY = 260;

    try {
      if (fs.existsSync(prefPath)) {
        const prefs = JSON.parse(fs.readFileSync(prefPath, 'utf8'));
        if (!prefs.browser) prefs.browser = {};
        let workW = 2560, workH = 1392;
        try {
          const ex = prefs.browser.app_window_placement?.['127']?.['0']?.['0']?.['1_/'];
          if (ex && ex.work_area_right) {
            workW = ex.work_area_right;
            workH = ex.work_area_bottom;
          }
        } catch (_) {}
        targetX = Math.max(20, Math.round((workW - targetW) / 2));
        targetY = Math.max(20, Math.round((workH - targetH) / 2));
        delete prefs.browser.window_placement;
        prefs.browser.app_window_placement = {
          '127': {
            '0': {
              '0': {
                '1_/': {
                  bottom: targetY + targetH,
                  left: targetX,
                  maximized: false,
                  right: targetX + targetW,
                  top: targetY,
                  work_area_bottom: workH,
                  work_area_left: 0,
                  work_area_right: workW,
                  work_area_top: 0
                }
              }
            }
          }
        };
        fs.writeFileSync(prefPath, JSON.stringify(prefs, null, 2));
      }
    } catch (_) {}

    if (process.platform === 'win32') {
      const psLines = [
        'Add-Type -TypeDefinition @"',
        '  using System;',
        '  using System.Runtime.InteropServices;',
        '  using System.Text;',
        '  public class Win32 {',
        '    [DllImport("user32.dll")] public static extern bool SetWindowPos(IntPtr hWnd, IntPtr hWndInsertAfter, int X, int Y, int cx, int cy, uint uFlags);',
        '    [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);',
        '    [DllImport("user32.dll")] public static extern int GetWindowLong(IntPtr hWnd, int nIndex);',
        '    [DllImport("user32.dll")] public static extern int SetWindowLong(IntPtr hWnd, int nIndex, int dwNewLong);',
        '    [DllImport("user32.dll", SetLastError=true, CharSet=CharSet.Auto)] public static extern int GetWindowText(IntPtr hWnd, StringBuilder lpString, int nMaxCount);',
        '    [DllImport("user32.dll", SetLastError=true, CharSet=CharSet.Auto)] public static extern int GetClassName(IntPtr hWnd, StringBuilder lpString, int nMaxCount);',
        '    [DllImport("user32.dll")] public static extern bool EnumWindows(EnumWindowsProc lpEnumFunc, IntPtr lParam);',
        '    [DllImport("user32.dll")] public static extern int SetWindowRgn(IntPtr hWnd, IntPtr hRgn, bool bRedraw);',
        '    [DllImport("gdi32.dll")] public static extern IntPtr CreateRectRgn(int nLeftRect, int nTopRect, int nRightRect, int nBottomRect);',
        '    public delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);',
        '  }',
        '"@',
        '[Win32]::EnumWindows([Win32+EnumWindowsProc]{',
        '  param($hWnd, $lParam)',
        '  $sbClass = New-Object System.Text.StringBuilder 256',
        '  [Win32]::GetClassName($hWnd, $sbClass, 256) | Out-Null',
        '  $cls = $sbClass.ToString()',
        '  $sb = New-Object System.Text.StringBuilder 256',
        '  [Win32]::GetWindowText($hWnd, $sb, 256) | Out-Null',
        '  $title = $sb.ToString()',
        '  if ($cls -eq "Chrome_WidgetWin_1" -and ($title -like "*Antigravity*" -or $title -like "*127.0.0.1*" -or $title -like "*localhost*")) {',
        '    [Win32]::ShowWindow($hWnd, 9) | Out-Null',
        '    $style = [Win32]::GetWindowLong($hWnd, -16)',
        '    [Win32]::SetWindowLong($hWnd, -16, $style -band (-bnot 0x00C40000)) | Out-Null',
        `    $finalH = ${targetH} + 34`,
        `    $finalY = [Math]::Max(0, ${targetY} - 34)`,
        `    [Win32]::SetWindowPos($hWnd, [IntPtr]::Zero, ${targetX}, $finalY, ${targetW}, $finalH, 0x0064) | Out-Null`,
        `    $hRgn = [Win32]::CreateRectRgn(0, 34, ${targetW}, $finalH)`,
        '    [Win32]::SetWindowRgn($hWnd, $hRgn, $true) | Out-Null',
        '    return $false',
        '  }',
        '  return $true',
        '}, [IntPtr]::Zero) | Out-Null'
      ];
      const script = psLines.join("\r\n");
      const b64 = Buffer.from(script, 'utf16le').toString('base64');
      exec(`powershell -NoProfile -Sta -EncodedCommand ${b64}`, () => {
        resolve(true);
      });
    } else {
      resolve(true);
    }
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

  // 1.1. GET /api/we/list - Return scanned Steam Wallpaper Engine items
  if (req.method === 'GET' && pathname === '/api/we/list') {
    try {
      const items = themeEngine.listWallpaperEngineWallpapers ? themeEngine.listWallpaperEngineWallpapers() : [];
      return sendJson(res, 200, { success: true, count: items.length, items });
    } catch (err) {
      return sendJson(res, 500, { success: false, error: err.message, items: [] });
    }
  }

  // 1.2. GET /api/preview-file - Stream any local media file for in-app preview
  if (req.method === 'GET' && pathname === '/api/preview-file') {
    try {
      let rawPath = parsedUrl.searchParams.get('path');
      if (!rawPath) {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8', 'Access-Control-Allow-Origin': '*' });
        return res.end('File path is required');
      }

      const wallpapersDir = themeEngine.WALLPAPERS_DIR || path.join(os.homedir(), '.gemini', 'antigravity', 'wallpapers');
      if (!path.isAbsolute(rawPath) || !fs.existsSync(rawPath)) {
        const inWallpapers = path.join(wallpapersDir, path.basename(rawPath));
        if (fs.existsSync(inWallpapers)) {
          rawPath = inWallpapers;
        }
      }

      if (!fs.existsSync(rawPath)) {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8', 'Access-Control-Allow-Origin': '*' });
        return res.end('File not found: ' + rawPath);
      }
      const stat = fs.statSync(rawPath);
      if (!stat.isFile()) {
        res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8', 'Access-Control-Allow-Origin': '*' });
        return res.end('Target is not a file');
      }

      const ext = path.extname(rawPath).toLowerCase();
      const contentType = MIME_TYPES[ext] || 'application/octet-stream';
      const range = req.headers.range;

      if (range) {
        const parts = range.replace(/bytes=/, '').split('-');
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : stat.size - 1;
        if (start >= stat.size || end >= stat.size) {
          res.writeHead(416, {
            'Content-Range': `bytes */${stat.size}`,
            'Access-Control-Allow-Origin': '*'
          });
          return res.end();
        }
        const chunksize = (end - start) + 1;
        const fileStream = fs.createReadStream(rawPath, { start, end });
        res.writeHead(206, {
          'Content-Range': `bytes ${start}-${end}/${stat.size}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': chunksize,
          'Content-Type': contentType,
          'Access-Control-Allow-Origin': '*'
        });
        fileStream.pipe(res);
      } else {
        res.writeHead(200, {
          'Content-Length': stat.size,
          'Content-Type': contentType,
          'Accept-Ranges': 'bytes',
          'Access-Control-Allow-Origin': '*'
        });
        fs.createReadStream(rawPath).pipe(res);
      }
      return;
    } catch (err) {
      console.error('[Studio] 预览文件流异常:', err);
      res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8', 'Access-Control-Allow-Origin': '*' });
      return res.end(err.message);
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

  // 8.5. POST /api/theme/apply-draft - Batch apply drafted theme changes to Antigravity
  if (req.method === 'POST' && pathname === '/api/theme/apply-draft') {
    try {
      const body = await parseBody(req);
      const { draftConfig, fontColor } = body;
      if (!draftConfig || typeof draftConfig !== 'object') {
        return sendJson(res, 400, { success: false, error: 'draftConfig is required' });
      }

      console.log('[Studio] 收到正式应用草稿指令，正在批量装配并固化配置...');
      for (const slotKey of ['left', 'mid', 'right', 'bottom', 'settings']) {
        const slotData = draftConfig[slotKey];
        if (slotData) {
          if (slotData.stagedFilePath && fs.existsSync(slotData.stagedFilePath)) {
            await themeEngine.swapWallpaper(slotKey, slotData.stagedFilePath);
          }
          if (slotData.position) {
            const [x, y] = slotData.position.split(' ');
            await themeEngine.setPosition(slotKey, x || 'center', y || 'center');
          }
        }
      }

      if (fontColor) {
        const fKey = typeof fontColor === 'string' ? fontColor : (fontColor.id || fontColor.primary);
        if (fKey) await themeEngine.setFontColor(fKey);
      }

      const activeConfig = themeEngine.loadSlotsConfig();
      return sendJson(res, 200, { success: true, slotsConfig: activeConfig });
    } catch (err) {
      console.error('[Studio] 批量应用草稿失败:', err);
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

  // 10.8. POST /api/window/reset - Snap window size to optimal 1400x860 centered
  if (req.method === 'POST' && pathname === '/api/window/reset') {
    try {
      await resetAppWindowPlacement();
      return sendJson(res, 200, { success: true, message: '已重置为适中推荐尺寸 (1400x860)' });
    } catch (err) {
      return sendJson(res, 500, { success: false, error: err.message });
    }
  }

  // 11. POST /api/shutdown - Graceful exit of the tool and release of all background resources
  if (req.method === 'POST' && pathname === '/api/shutdown') {
    sendJson(res, 200, { success: true, message: 'Studio server is shutting down. Goodbye!' });
    console.log('[Studio] 收到退出指令，正在调起 CRT 原生视窗塌陷动效并释放全部后台服务...');

    if (process.platform === 'win32') {
      try {
        const { spawn, exec } = require('child_process');
        const animatorExe = path.join(__dirname, 'crt_animator.exe');
        if (fs.existsSync(animatorExe)) {
          // 0ms 瞬间调起原生 Win32 窗口偏转线圈塌陷动画程序 (连同操作系统外层窗口一起物理收缩)
          spawn(animatorExe, [], { detached: true, stdio: 'ignore' });
        } else {
          // 降级使用 PowerShell 优雅关闭窗口
          const psClose = `powershell -NoProfile -NonInteractive -Command "Get-Process -Name msedge, chrome -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowTitle -like '*Antigravity*' } | ForEach-Object { $_.CloseMainWindow() }"`;
          exec(psClose, () => {});
        }
      } catch (_) {}
    }

    setTimeout(() => {
      server.close();
      process.exit(0);
    }, 550);
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

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.log(`[Studio] 端口 ${PORT} 已有运行中的服务实例，沿用现有服务。`);
  } else {
    console.error('[Studio] 服务发生错误:', err);
  }
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
