// =========================================================================
// 🌸 Antigravity Theme Studio —— Desktop App Launcher
// Zero Background Footprint, Seamless Native Edge / Chrome App Mode
// =========================================================================

const { spawn, exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

// 1. Start Studio HTTP Backend
const { server, PORT } = require('./server');

// 2. Locate Best Browser Runner (Edge or Chrome in borderless App Mode)
function findBrowser() {
  const candidates = [
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    path.join(process.env.LOCALAPPDATA || '', 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
    path.join(process.env.LOCALAPPDATA || '', 'Google', 'Chrome', 'Application', 'chrome.exe')
  ];

  for (const c of candidates) {
    if (c && fs.existsSync(c)) {
      return c;
    }
  }
  return null;
}

const browserExe = findBrowser();
const appUrl = `http://127.0.0.1:${PORT}`;

console.log('=======================================================');
console.log('   🌸 Antigravity Theme Studio 极简桌面工坊');
console.log('   🚀 正在调起独立原生应用窗口...');
console.log('   💡 用完即关，零后台常驻，零性能消耗！');
console.log('=======================================================');

if (browserExe) {
  // Use dedicated temporary profile directory for clean isolated app window
  const profileDir = path.join(os.tmpdir(), 'antigravity_studio_profile');
  // Ensure profile window_placement does not restore a small or clipped window
  try {
    const prefPath = path.join(profileDir, 'Default', 'Preferences');
    if (fs.existsSync(prefPath)) {
      const prefs = JSON.parse(fs.readFileSync(prefPath, 'utf8'));
      if (prefs.browser && prefs.browser.window_placement) {
        prefs.browser.window_placement.maximized = true;
        fs.writeFileSync(prefPath, JSON.stringify(prefs));
      }
    }
  } catch (_) {}

  const child = spawn(browserExe, [
    `--app=${appUrl}`,
    '--start-maximized',
    `--user-data-dir=${profileDir}`,
    '--no-first-run',
    '--no-default-browser-check'
  ], {
    detached: false,
    stdio: 'ignore'
  });

  child.on('error', (err) => {
    console.error('[Studio] 启动应用窗口失败:', err.message);
  });
} else {
  console.log('未检测到 Edge/Chrome 独立桌面环境，正在使用系统默认浏览器打开...');
  const startCmd = process.platform === 'win32' ? `start "" "${appUrl}"` : `open "${appUrl}"`;
  exec(startCmd);
}
