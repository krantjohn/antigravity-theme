const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');

const localAppData = process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local');
const defaultResDir = path.join(localAppData, 'Programs', 'antigravity', 'resources');
const resDir = process.env.ANTIGRAVITY_RESOURCES || defaultResDir;

const appDir = path.join(resDir, 'app');
const appDist = path.join(appDir, 'dist');
const asarPath = path.join(resDir, 'app.asar');
const patchedAsarPath = path.join(resDir, 'app.asar.patched');

const antigravityDir = process.env.ANTIGRAVITY_CONFIG_DIR || path.join(os.homedir(), '.gemini', 'antigravity');
const customCssPath = path.join(antigravityDir, 'custom_theme.css').replace(/\\/g, '/');
const repoMediaServerPath = path.join(__dirname, 'media_server.js');

console.log('=======================================================');
console.log('   🌸 Antigravity Theme Customizer —— 核心补丁生成器');
console.log('=======================================================');
console.log(`Resources 路径: ${resDir}`);
console.log(`主题配置路径:   ${antigravityDir}`);
console.log('');

if (!fs.existsSync(asarPath)) {
  console.error(`❌ 未找到 Antigravity 核心包: ${asarPath}`);
  console.error('请确认 Antigravity 客户端已安装，或通过环境变量 ANTIGRAVITY_RESOURCES 指定 resources 目录。');
  process.exit(1);
}

const asarOrigBak = path.join(resDir, 'app.asar.orig.bak');
if (fs.existsSync(asarPath) && !fs.existsSync(asarOrigBak)) {
  console.log('[0/5] 正在创建官方原版 app.asar 物理防丢失备份...');
  try {
    fs.copyFileSync(asarPath, asarOrigBak);
    console.log(`✓ 官方原版核心物理备份创建成功: ${asarOrigBak}`);
  } catch(e) {
    console.warn('⚠️ 物理备份创建提示:', e.message);
  }
}

// 1. 确保 app.asar 已经解包到 app 目录
console.log('[1/5] 正在解包 app.asar 核心文件...');
if (fs.existsSync(appDir)) {
  try {
    fs.rmSync(appDir, { recursive: true, force: true });
  } catch (e) {}
}
const npxCmd = process.platform === 'win32' ? 'npx.cmd' : 'npx';
const asarUnpacked = asarPath + '.unpacked';
const origBakUnpacked = asarOrigBak + '.unpacked';
if (fs.existsSync(asarUnpacked) && !fs.existsSync(origBakUnpacked)) {
  try {
    if (process.platform === 'win32') {
      execSync(`powershell -NoProfile -Command "New-Item -ItemType Junction -Path '${origBakUnpacked}' -Target '${asarUnpacked}' -ErrorAction SilentlyContinue"`, { stdio: 'ignore' });
    }
  } catch (e) {}
}

const sourceAsar = (fs.existsSync(asarOrigBak) && fs.statSync(asarOrigBak).size > 1000000) ? asarOrigBak : asarPath;
try {
  execSync(`${npxCmd} --yes asar extract "${sourceAsar}" "${appDir}"`, { stdio: 'inherit' });
} catch (extractErr) {
  if (sourceAsar !== asarPath) {
    console.warn(`⚠️ 解包 ${sourceAsar} 失败 (${extractErr.message})，回退使用 ${asarPath}...`);
    execSync(`${npxCmd} --yes asar extract "${asarPath}" "${appDir}"`, { stdio: 'inherit' });
  } else {
    throw extractErr;
  }
}

// 复制流媒体服务模块到 app/dist 目录以及用户配置目录
const distMediaServerPath = path.join(appDist, 'media_server.js');
const userMediaServerPath = path.join(antigravityDir, 'media_server.js');
if (fs.existsSync(repoMediaServerPath)) {
  fs.copyFileSync(repoMediaServerPath, distMediaServerPath);
  try { fs.copyFileSync(repoMediaServerPath, userMediaServerPath); } catch(e) {}
  console.log('✓ 已植入 media_server.js 流媒体服务模块 (dist & config)');
}

// 2. Patch main.js (固定 CDP 调试端口 8314 & 启动动态壁纸流媒体服务器 8315)
console.log('[2/5] 正在注入 main.js (启用 8314 调试端口 & 8315 流媒体服务)...');
const mainPath = path.join(appDist, 'main.js');
let mainContent = fs.readFileSync(mainPath, 'utf8');

const mediaServerInjectionCode = `
// ================= Antigravity Wallpaper Media Server =================
try {
  const _fs = require('fs');
  const _path = require('path');
  const _os = require('os');
  const _antigravityDir = process.env.ANTIGRAVITY_CONFIG_DIR || _path.join(_os.homedir(), '.gemini', 'antigravity');
  const _p1 = _path.join(__dirname, 'media_server.js');
  const _p2 = _path.join(_antigravityDir, 'media_server.js');
  const _target = _fs.existsSync(_p1) ? _p1 : (_fs.existsSync(_p2) ? _p2 : null);
  if (_target) {
    const { startMediaServer } = require(_target);
    startMediaServer(_path.join(_antigravityDir, 'wallpapers'), 8315);
  }
} catch(e) {}
// =====================================================================

// ================= Antigravity GPU & Rendering Pipeline Acceleration =================
try {
  const { app: _app } = require('electron');
  const _cl = _app ? _app.commandLine : null;
  if (_cl && process.env.ELECTRON_OZONE_PLATFORM_HINT !== 'headless') {
    if (!_cl.hasSwitch('enable-gpu-rasterization')) _cl.appendSwitch('enable-gpu-rasterization');
    if (!_cl.hasSwitch('ignore-gpu-blocklist')) _cl.appendSwitch('ignore-gpu-blocklist');
    if (!_cl.hasSwitch('enable-zero-copy')) _cl.appendSwitch('enable-zero-copy');
    if (!_cl.hasSwitch('enable-accelerated-video-decode')) _cl.appendSwitch('enable-accelerated-video-decode');
    if (!_cl.hasSwitch('enable-accelerated-mjpeg-decode')) _cl.appendSwitch('enable-accelerated-mjpeg-decode');
    if (!_cl.hasSwitch('enable-features')) {
      _cl.appendSwitch('enable-features', 'D3D11VideoDecoder,DirectCompositionVideoOverlays');
    } else {
      const _cur = _cl.getSwitchValue('enable-features');
      if (!_cur.includes('D3D11VideoDecoder')) {
        _cl.appendSwitch('enable-features', _cur + ',D3D11VideoDecoder,DirectCompositionVideoOverlays');
      }
    }
    if (!_cl.hasSwitch('disable-features')) {
      _cl.appendSwitch('disable-features', 'UseChromeOSDirectVideoDecoder');
    }
  }
} catch(e) {}
// ====================================================================================
`;

// Configure Windows high-performance GPU preference for Antigravity.exe
try {
  const exePath = path.join(localAppData, 'Programs', 'antigravity', 'Antigravity.exe');
  if (process.platform === 'win32' && fs.existsSync(exePath)) {
    execSync(`powershell -NoProfile -Command "Set-ItemProperty -Path 'HKCU:\\\\Software\\\\Microsoft\\\\DirectX\\\\UserGpuPreferences' -Name '${exePath}' -Value 'GpuPreference=2;' -ErrorAction SilentlyContinue"`, { stdio: 'ignore' });
  }
} catch (e) {}

if (mainContent.includes("'remote-debugging-port', '0'")) {
  mainContent = mainContent.replace("'remote-debugging-port', '0'", "'remote-debugging-port', '8314'");
} else if (!mainContent.includes('8314')) {
  if (mainContent.includes("const HEADLESS =")) {
    mainContent = mainContent.replace(
      "const HEADLESS =",
      "electron_1.app.commandLine.appendSwitch('remote-debugging-port', '8314');\nconst HEADLESS ="
    );
  } else {
    mainContent = "const { app } = require('electron');\ntry { app.commandLine.appendSwitch('remote-debugging-port', '8314'); } catch(e){}\n" + mainContent;
  }
}

if (mainContent.includes('// ================= Antigravity Wallpaper Media Server =================')) {
  mainContent = mainContent.replace(/\/\/ ================= Antigravity Wallpaper Media Server =================[\s\S]*?\/\/ =====================================================================\n?/g, '');
}
if (mainContent.includes('// ================= Antigravity GPU & Rendering Pipeline Acceleration =================')) {
  mainContent = mainContent.replace(/\/\/ ================= Antigravity GPU & Rendering Pipeline Acceleration =================[\s\S]*?\/\/ ====================================================================================\n?/g, '');
}
// Prepend media server startup and GPU parameters so they take effect early
mainContent = mediaServerInjectionCode + '\n' + mainContent;
fs.writeFileSync(mainPath, mainContent, 'utf8');
console.log('✓ main.js 注入完成 (流媒体服务置顶启动与 GPU 硬件加速)');

// 3. Patch preload.js (启动自启自动载入 custom_theme.css & 动态视频引擎 并热监听)
console.log('[3/5] 正在注入 preload.js (前台开机自启 & 动态壁纸自适应引擎)...');
const preloadPath = path.join(appDist, 'preload.js');
let preloadContent = fs.readFileSync(preloadPath, 'utf8');

const slotsConfigPath = path.join(antigravityDir, 'slots_config.json');
let initialSlotsConfig = null;
try {
  if (fs.existsSync(slotsConfigPath)) {
    initialSlotsConfig = JSON.parse(fs.readFileSync(slotsConfigPath, 'utf8'));
  }
} catch (e) {}
const initialSlotsConfigJson = JSON.stringify(initialSlotsConfig || {});

const repoPreloadPath = path.join(__dirname, "..", "preload.js");
let themeInjectionCode = "";
if (fs.existsSync(repoPreloadPath)) {
  const rootPreload = fs.readFileSync(repoPreloadPath, "utf8");
  const marker = "// ================= Antigravity Master Theme & Dynamic Video Auto-Loader =================";
  const idx = rootPreload.indexOf(marker);
  if (idx !== -1) {
    themeInjectionCode = rootPreload.substring(idx);
    themeInjectionCode = themeInjectionCode.replace(/let cachedConfig = \{[\s\S]*?\};/, `let cachedConfig = ${initialSlotsConfigJson};`);
  }
}

// Clean previous version if exists
if (preloadContent.includes('// ================= Antigravity Master Theme Auto-Loader =================')) {
  preloadContent = preloadContent.replace(/\/\/ ================= Antigravity Master Theme Auto-Loader =================[\s\S]*?\/\/ =========================================================================\n?/g, '');
}
if (preloadContent.includes('// ================= Antigravity Master Theme & Dynamic Video Auto-Loader =================')) {
  preloadContent = preloadContent.replace(/\/\/ ================= Antigravity Master Theme & Dynamic Video Auto-Loader =================[\s\S]*?\/\/ =========================================================================\n?/g, '');
}

preloadContent += '\n' + themeInjectionCode;
fs.writeFileSync(preloadPath, preloadContent, 'utf8');
console.log('✓ preload.js 注入完成');

// 4. Patch utils.js (Chromium 原生 insertCSS 注入，绝无闪烁与回退)
console.log('[4/5] 正在注入 utils.js (Chromium 底层原生 insertCSS)...');
const utilsPath = path.join(appDist, 'utils.js');
if (fs.existsSync(utilsPath)) {
  let utilsContent = fs.readFileSync(utilsPath, 'utf8');
  if (!utilsContent.includes('custom_theme.css')) {
    utilsContent = utilsContent.replace(
      "win.webContents.on('did-finish-load', () => {",
      `win.webContents.on('did-finish-load', () => {
            try {
                const customCssPath = '${customCssPath}';
                if (fs.existsSync(customCssPath)) {
                    win.webContents.insertCSS(fs.readFileSync(customCssPath, 'utf8'));
                }
            } catch(e) {}`
    );
    utilsContent = utilsContent.replace(
      "void win.loadURL(url);",
      `win.webContents.on('dom-ready', () => {
        try {
            const customCssPath = '${customCssPath}';
            if (fs.existsSync(customCssPath)) {
                win.webContents.insertCSS(fs.readFileSync(customCssPath, 'utf8'));
            }
        } catch(e) {}
    });
    void win.loadURL(url);`
    );
    fs.writeFileSync(utilsPath, utilsContent, 'utf8');
  }
  console.log('✓ utils.js 原生注入完成');
}

// 5. Patch keybindings.js (启用快捷键 F5 / Ctrl+R / F12)
const kbPath = path.join(appDist, 'keybindings.js');
if (fs.existsSync(kbPath)) {
  let kbContent = fs.readFileSync(kbPath, 'utf8');
  if (!kbContent.includes('toggleDevTools')) {
    kbContent = kbContent.replace(
      `if (isCmdOrCtrl && input.key.toLowerCase() === 'q') {\n                actions.onQuitRequested();\n                event.preventDefault();\n            }`,
      `if (isCmdOrCtrl && input.key.toLowerCase() === 'q') {
                actions.onQuitRequested();
                event.preventDefault();
            }
            if ((isCmdOrCtrl && input.shift && input.key.toLowerCase() === 'i') || input.key === 'F12') {
                win.webContents.toggleDevTools();
                event.preventDefault();
            }
            if ((isCmdOrCtrl && input.key.toLowerCase() === 'r') || input.key === 'F5') {
                win.webContents.reload();
                event.preventDefault();
            }`
    );
    fs.writeFileSync(kbPath, kbContent, 'utf8');
    console.log('✓ keybindings.js 快捷键支持完成 (F5/Ctrl+R/F12)');
  }
}

// 5.5 Patch updater.js (防止静默自动更新再次覆盖主题补丁)
const updaterPath = path.join(appDist, 'updater.js');
if (fs.existsSync(updaterPath)) {
  let updaterContent = fs.readFileSync(updaterPath, 'utf8');
  if (updaterContent.includes('autoUpdater.autoDownload = true')) {
    updaterContent = updaterContent.replace('autoUpdater.autoDownload = true;', 'autoUpdater.autoDownload = false; // Theme patch: prevent silent overwrite');
    updaterContent = updaterContent.replace('autoUpdater.autoInstallOnAppQuit = electron_1.app.isPackaged;', 'autoUpdater.autoInstallOnAppQuit = false; // Theme patch: prevent silent overwrite');
    fs.writeFileSync(updaterPath, updaterContent, 'utf8');
    console.log('✓ updater.js 静默后台下载已拦截保护');
  }
}

// 6. 打包生成 app.asar.patched
console.log('[5/5] 正在重新打包并生成 app.asar.patched 补丁镜像...');
execSync(`${npxCmd} --yes asar pack "${appDir}" "${patchedAsarPath}"`, { stdio: 'inherit' });
console.log('✓ app.asar.patched 打包生成完毕！');

try {
  fs.copyFileSync(patchedAsarPath, asarPath);
  console.log('✓ app.asar 已直接更新并固化完成！');
} catch (e) {
  console.log('提示: app.asar 复制提示:', e.message);
}

// 7. 还原官方 app-update.yml 配置 (若之前被备份接管)
const appUpdateYml = path.join(resDir, 'app-update.yml');
const appUpdateYmlBak = path.join(resDir, 'app-update.yml.bak');
if (fs.existsSync(appUpdateYmlBak)) {
  try {
    fs.copyFileSync(appUpdateYmlBak, appUpdateYml);
    fs.rmSync(appUpdateYmlBak, { force: true });
    console.log('✓ app-update.yml 已恢复官方原生配置');
  } catch (e) {}
}

console.log('');
console.log('=======================================================');
console.log('✨ 核心注入镜像打包完成！接下来运行 patch_core 即可固化生效。');
console.log('=======================================================');
