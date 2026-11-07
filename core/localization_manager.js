const fs = require('fs');
const path = require('path');
const os = require('os');
const engine = require('./localization_engine.js');

const SIGNATURE_START = engine.SIGNATURE_START;
const SIGNATURE_END = engine.SIGNATURE_END;

let _cachedResourcesDir = null;

function getResourcesDir() {
  if (_cachedResourcesDir) return _cachedResourcesDir;
  const localAppdata = process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local');
  const defaultPath = path.join(localAppdata, 'Programs', 'antigravity', 'resources');
  if (fs.existsSync(defaultPath)) {
    _cachedResourcesDir = defaultPath;
    return _cachedResourcesDir;
  }
  const installDir = engine.detectInstallationDir("", { quiet: true });
  if (!installDir) {
    _cachedResourcesDir = defaultPath;
    return _cachedResourcesDir;
  }
  if (fs.existsSync(path.join(installDir, 'resources'))) {
    _cachedResourcesDir = path.join(installDir, 'resources');
    return _cachedResourcesDir;
  }
  _cachedResourcesDir = installDir;
  return _cachedResourcesDir;
}

let _cachedInstalledResult = null;
let _cachedInstalledKey = null;

function invalidateLocalizationCache() {
  _cachedInstalledResult = null;
  _cachedInstalledKey = null;
}

function isChineseInstalled() {
  const resDir = getResourcesDir();
  const asarPath = path.join(resDir, 'app.asar');
  const appPreload = path.join(resDir, 'app', 'dist', 'preload.js');

  let key = '';
  try { if (fs.existsSync(asarPath)) key += fs.statSync(asarPath).mtimeMs; } catch(_) {}
  try { if (fs.existsSync(appPreload)) key += '_' + fs.statSync(appPreload).mtimeMs; } catch(_) {}

  if (key && _cachedInstalledKey === key && _cachedInstalledResult !== null) {
    return _cachedInstalledResult;
  }

  let result = false;

  // Check unpacked app first if it exists
  if (fs.existsSync(appPreload)) {
    try {
      const content = fs.readFileSync(appPreload, 'utf8');
      if (content.includes(SIGNATURE_START)) result = true;
    } catch (_) {}
  }

  // Check asar if unpacked is clean
  if (!result && fs.existsSync(asarPath)) {
    try {
      const preloadBuf = engine.AsarArchive.readFile(asarPath, 'dist/preload.js');
      if (preloadBuf && preloadBuf.toString('utf8').includes(SIGNATURE_START)) {
        result = true;
      }
    } catch (_) {}
  }

  _cachedInstalledKey = key;
  _cachedInstalledResult = result;
  return result;
}

function liveInjectCdp() {
  // Per user directive: Live CDP DOM MutationObserver injection is disabled to prevent
  // Chromium hardware-accelerated video decoder stalls, disappearance of navigation buttons,
  // and auxiliary subagent panel collapse. Localization changes take effect cleanly on client restart.
}

function liveDisconnectCdp() {
  // Per user directive: Live CDP DOM manipulation disabled. Client restart applies clean stock English.
}

function enableChineseLocalization() {
  const resDir = getResourcesDir();
  console.log(`[LocalizationManager] 正在向 ${resDir} 安装 Antigravity 界面中文汉化...`);

  // 1. Run engine installer
  const success = engine.installLocalization(resDir);
  if (!success) {
    throw new Error('汉化注入失败，请检查文件写入权限或是否有外部进程锁定');
  }

  // 2. Also ensure unpacked resources/app is synchronized if it exists
  const appDir = path.join(resDir, 'app');
  if (fs.existsSync(appDir)) {
    try {
      const asarPath = path.join(resDir, 'app.asar');
      const filesToSync = [
        'dist/preload.js',
        'dist/menu.js',
        'dist/tray.js',
        'dist/updater.js',
        'dist/provisionSplash.js',
        'dist/wsl.js',
        'dist/main.js',
        'dist/ipcHandlers.js'
      ];
      for (const rel of filesToSync) {
        const buf = engine.AsarArchive.readFile(asarPath, rel);
        if (buf) {
          const dest = path.join(appDir, rel);
          fs.mkdirSync(path.dirname(dest), { recursive: true });
          fs.writeFileSync(dest, buf.toString('utf8'), 'utf8');
        }
      }
    } catch (e) {
      console.warn('[LocalizationManager] 同步 app 目录提示:', e.message);
    }
  }

  // 3. Update slots_config.json
  try {
    const configDir = process.env.ANTIGRAVITY_CONFIG_DIR || path.join(os.homedir(), '.gemini', 'antigravity');
    const cfgPath = path.join(configDir, 'slots_config.json');
    if (fs.existsSync(cfgPath)) {
      const cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
      cfg.chineseLocalization = true;
      fs.writeFileSync(cfgPath, JSON.stringify(cfg, null, 2), 'utf8');
    }
  } catch (_) {}

  // 4. Do not execute destructive live CDP hot injection or Page.reload.
  // Localization changes cleanly take effect upon client restart.
  invalidateLocalizationCache();
  console.log('[LocalizationManager] ✨ 中文汉化配置已写入！重启 Antigravity 客户端后完整生效。');
  return {
    success: true,
    isChineseInstalled: true,
    needsRestart: true,
    message: '中文汉化已就绪！请重启 Antigravity 客户端以完整生效。'
  };
}

function disableChineseLocalization() {
  const resDir = getResourcesDir();
  console.log(`[LocalizationManager] 正在从 ${resDir} 卸载中文汉化，恢复官方原版英文...`);

  const asarPath = path.join(resDir, 'app.asar');
  const filePatches = {};
  let modified = false;

  // 1. Strip from asar
  if (fs.existsSync(asarPath)) {
    try {
      const preloadBuf = engine.AsarArchive.readFile(asarPath, 'dist/preload.js');
      if (preloadBuf) {
        const orig = preloadBuf.toString('utf8');
        const stripped = engine.cleanJsContent(orig);
        if (stripped !== orig) {
          filePatches['dist/preload.js'] = stripped;
          modified = true;
        }
      }

      const menuBuf = engine.AsarArchive.readFile(asarPath, 'dist/menu.js');
      if (menuBuf) {
        const orig = menuBuf.toString('utf8');
        const stripped = engine.cleanMenuJsContent(orig);
        if (stripped !== orig) {
          filePatches['dist/menu.js'] = stripped;
          modified = true;
        }
      }

      const trayBuf = engine.AsarArchive.readFile(asarPath, 'dist/tray.js');
      if (trayBuf) {
        const orig = trayBuf.toString('utf8');
        const stripped = engine.cleanTrayJsContent(orig);
        if (stripped !== orig) {
          filePatches['dist/tray.js'] = stripped;
          modified = true;
        }
      }

      const ipcBuf = engine.AsarArchive.readFile(asarPath, 'dist/ipcHandlers.js');
      if (ipcBuf) {
        const orig = ipcBuf.toString('utf8');
        const stripped = engine.cleanIpcHandlersJsContent(orig);
        if (stripped !== orig) {
          filePatches['dist/ipcHandlers.js'] = stripped;
          modified = true;
        }
      }

      if (modified) {
        const tempAsar = path.join(resDir, 'app.asar.tmp');
        engine.AsarArchive.patchArchive(asarPath, tempAsar, filePatches);
        try {
          fs.copyFileSync(tempAsar, asarPath);
          fs.unlinkSync(tempAsar);
        } catch (e) {
          fs.renameSync(tempAsar, asarPath);
        }
      }
    } catch (e) {
      console.error('[LocalizationManager] 还原 asar 异常:', e.message);
    }
  }

  // 2. Strip from unpacked resources/app if exists
  const appDir = path.join(resDir, 'app');
  if (fs.existsSync(appDir)) {
    try {
      const appPreload = path.join(appDir, 'dist', 'preload.js');
      if (fs.existsSync(appPreload)) {
        const orig = fs.readFileSync(appPreload, 'utf8');
        const stripped = engine.cleanJsContent(orig);
        if (stripped !== orig) fs.writeFileSync(appPreload, stripped, 'utf8');
      }

      const appMenu = path.join(appDir, 'dist', 'menu.js');
      if (fs.existsSync(appMenu)) {
        const orig = fs.readFileSync(appMenu, 'utf8');
        const stripped = engine.cleanMenuJsContent(orig);
        if (stripped !== orig) fs.writeFileSync(appMenu, stripped, 'utf8');
      }

      const appTray = path.join(appDir, 'dist', 'tray.js');
      if (fs.existsSync(appTray)) {
        const orig = fs.readFileSync(appTray, 'utf8');
        const stripped = engine.cleanTrayJsContent(orig);
        if (stripped !== orig) fs.writeFileSync(appTray, stripped, 'utf8');
      }

      const appIpc = path.join(appDir, 'dist', 'ipcHandlers.js');
      if (fs.existsSync(appIpc)) {
        const orig = fs.readFileSync(appIpc, 'utf8');
        const stripped = engine.cleanIpcHandlersJsContent(orig);
        if (stripped !== orig) fs.writeFileSync(appIpc, stripped, 'utf8');
      }
    } catch (e) {
      console.warn('[LocalizationManager] 同步 app 目录卸载提示:', e.message);
    }
  }

  // 3. Clean up app.asar.bak if created during install
  try {
    const bakPath = path.join(resDir, 'app.asar.bak');
    if (fs.existsSync(bakPath)) fs.unlinkSync(bakPath);
  } catch (_) {}

  // 4. Update slots_config.json
  try {
    const configDir = process.env.ANTIGRAVITY_CONFIG_DIR || path.join(os.homedir(), '.gemini', 'antigravity');
    const cfgPath = path.join(configDir, 'slots_config.json');
    if (fs.existsSync(cfgPath)) {
      const cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
      cfg.chineseLocalization = false;
      fs.writeFileSync(cfgPath, JSON.stringify(cfg, null, 2), 'utf8');
    }
  } catch (_) {}

  // 5. Do not execute destructive live CDP disconnect or Page.reload.
  // Localization changes cleanly take effect upon client restart.
  invalidateLocalizationCache();
  console.log('[LocalizationManager] ✨ 官方原版英文已恢复！重启 Antigravity 客户端后完整生效。');
  return {
    success: true,
    isChineseInstalled: false,
    needsRestart: true,
    message: '官方原版英文已就绪！请重启 Antigravity 客户端以完整生效。'
  };
}

function getStatus() {
  const isInstalled = isChineseInstalled();
  const resDir = getResourcesDir();
  const dictDir = path.join(__dirname, 'dicts');
  let dictFiles = [];
  try {
    if (fs.existsSync(dictDir)) {
      dictFiles = fs.readdirSync(dictDir).filter(f => f.endsWith('.json'));
    }
  } catch (_) {}

  return {
    success: true,
    isChineseInstalled: isInstalled,
    resourcesDir: resDir,
    version: '2.29.0',
    dictCount: dictFiles.length,
    dictFiles
  };
}

module.exports = {
  getResourcesDir,
  isChineseInstalled,
  invalidateLocalizationCache,
  enableChineseLocalization,
  disableChineseLocalization,
  getStatus,
  liveInjectCdp,
  liveDisconnectCdp
};
