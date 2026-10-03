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
  // Use dedicated temporary profile directory so window exit is completely trackable
  const profileDir = path.join(os.tmpdir(), 'antigravity_studio_profile');
  const startTime = Date.now();
  const child = spawn(browserExe, [
    `--app=${appUrl}`,
    '--window-size=1280,860',
    `--user-data-dir=${profileDir}`,
    '--no-first-run',
    '--no-default-browser-check'
  ], {
    detached: false,
    stdio: 'ignore'
  });

  child.on('exit', () => {
    // If window lived longer than 3s, treat as user closing the app
    if (Date.now() - startTime > 3000) {
      console.log('\n[Studio] 客户端窗口已关闭，正在安全退出 (零后台残留)...');
      try { server.close(); } catch (e) {}
      process.exit(0);
    }
  });
} else {
  console.log('未检测到 Edge/Chrome 独立桌面环境，正在使用系统默认浏览器打开...');
  const startCmd = process.platform === 'win32' ? `start "" "${appUrl}"` : `open "${appUrl}"`;
  exec(startCmd);
}
