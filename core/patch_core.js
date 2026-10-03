const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync, spawn } = require('child_process');

console.log('=======================================================');
console.log('   🌸 Antigravity Theme Customizer —— 核心永久固化');
console.log('=======================================================');
console.log('');

const localAppData = process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local');
const defaultResDir = path.join(localAppData, 'Programs', 'antigravity', 'resources');
const resDir = process.env.ANTIGRAVITY_RESOURCES || defaultResDir;

const asarPath = path.join(resDir, 'app.asar');
const patchedAsarPath = path.join(resDir, 'app.asar.patched');
const asarOrigBak = path.join(resDir, 'app.asar.orig.bak');
const appDir = path.join(resDir, 'app');
const exePath = path.join(localAppData, 'Programs', 'antigravity', 'Antigravity.exe');

const repoMediaServer = path.join(__dirname, 'media_server.js');
const distMediaServer = path.join(appDir, 'dist', 'media_server.js');
const antigravityDir = process.env.ANTIGRAVITY_CONFIG_DIR || path.join(os.homedir(), '.gemini', 'antigravity');
const userMediaServer = path.join(antigravityDir, 'media_server.js');
const repoPreload = path.join(__dirname, '..', 'preload.js');
const distPreload = path.join(appDir, 'dist', 'preload.js');
const repoMain = path.join(__dirname, '..', 'main.js');
const distMain = path.join(appDir, 'dist', 'main.js');

try {
  if (fs.existsSync(path.join(appDir, 'dist'))) {
    if (fs.existsSync(repoMediaServer)) fs.copyFileSync(repoMediaServer, distMediaServer);
    if (fs.existsSync(repoPreload)) fs.copyFileSync(repoPreload, distPreload);
    if (fs.existsSync(repoMain)) fs.copyFileSync(repoMain, distMain);
  }
  if (fs.existsSync(repoMediaServer)) fs.copyFileSync(repoMediaServer, userMediaServer);
} catch(e) {}

// 0. Backup original unpatched app.asar if not already backed up
if (fs.existsSync(asarPath) && !fs.existsSync(asarOrigBak)) {
  console.log('[0/3] 正在创建官方原版 app.asar 物理防丢失备份...');
  try {
    fs.copyFileSync(asarPath, asarOrigBak);
    console.log(`✓ 官方原版核心物理备份创建成功: ${asarOrigBak}`);
  } catch (e) {
    console.warn('⚠️ 物理备份创建提示:', e.message);
  }
}

// 1. Always pack patched asar from appDir to ensure latest fixes
console.log('[1/3] 正在从源码打包最新补丁镜像...');
const npxCmd = process.platform === 'win32' ? 'npx.cmd' : 'npx';
try {
  execSync(`${npxCmd} --yes asar pack "${appDir}" "${patchedAsarPath}" --unpack-dir "node_modules/chrome-devtools-mcp"`, { stdio: 'inherit' });
} catch (err) {
  console.error('❌ 打包失败:', err.message);
  process.exit(1);
}

// 2. Safely guard against terminating Antigravity process
const allowKill = process.env.ALLOW_ANTIGRAVITY_KILL === '1' || process.argv.includes('--force-kill');
if (allowKill) {
  console.log('[2/3] 正在安全解除 Antigravity 文件占用...');
  try {
    execSync('taskkill /f /im "Antigravity.exe"', { stdio: 'ignore' });
  } catch (e) {}
  const waitMs = (ms) => {
    const start = Date.now();
    while (Date.now() - start < ms) {}
  };
  waitMs(1500);
} else {
  console.log('[2/3] 保护模式生效：跳过自动关闭 Antigravity 进程以保持会话活跃 (如需强制终止请传 --force-kill 或设置 ALLOW_ANTIGRAVITY_KILL=1)');
}

// 3. Replace app.asar with app.asar.patched
try {
  fs.copyFileSync(patchedAsarPath, asarPath);
  console.log('✓ [3/3] 核心包 app.asar 替换成功！(美化已永久焊入底层)');
} catch (err) {
  if (allowKill) {
    console.error('❌ 替换重试中:', err.message);
    const waitMs = (ms) => {
      const start = Date.now();
      while (Date.now() - start < ms) {}
    };
    waitMs(1000);
    try {
      fs.copyFileSync(patchedAsarPath, asarPath);
      console.log('✓ [3/3] 重试成功！app.asar 替换完成');
    } catch (err2) {
      console.error('❌ 仍被占用，请手动退出 Antigravity 后再运行此程序:', err2.message);
      process.exit(1);
    }
  } else {
    console.warn(`⚠️ [3/3] app.asar 当前正被运行中的客户端占用 (${err.message})。`);
    console.log('ℹ️ 补丁镜像 app.asar.patched 已生成就绪，退出或下次启动客户端时可直接应用/替换。');
  }
}

// 4. Restart Antigravity (only if it was terminated)
if (allowKill || process.argv.includes('--restart')) {
  console.log('\n正在重新启动 Antigravity 客户端...');
  try {
    if (fs.existsSync(exePath)) {
      const child = spawn(exePath, [], {
        detached: true,
        stdio: 'ignore'
      });
      child.unref();
    } else {
      console.log('提示: 请手动点击快捷方式启动 Antigravity');
    }
  } catch (e) {
    console.log('提示: 请手动打开 Antigravity 图标启动程序');
  }
}

console.log('');
console.log('=======================================================');
console.log('✨ 恭喜！美化已永久固化完成！');
console.log('今后无论重启电脑、刷新页面、更新会话，美化都不会再掉！');
console.log('=======================================================');
