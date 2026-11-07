"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Preload script — runs in every BrowserWindow before the page loads.
 * Exposes a minimal, secure API via contextBridge so the renderer can
 * communicate with the main-process auto-updater without nodeIntegration.
 */
const electron_1 = require("electron");
const updaterAPI = {
    onStateChanged: (callback) => {
        const handler = (_event, state) => {
            callback(state);
        };
        electron_1.ipcRenderer.on('updater:state-changed', handler);
        // Return unsubscribe function
        return () => {
            electron_1.ipcRenderer.removeListener('updater:state-changed', handler);
        };
    },
    applyUpdate: () => electron_1.ipcRenderer.invoke('updater:apply'),
    quitAndInstall: () => electron_1.ipcRenderer.invoke('updater:quit-and-install'),
    checkForUpdates: () => electron_1.ipcRenderer.invoke('updater:check-for-updates'),
    getState: () => electron_1.ipcRenderer.invoke('updater:get-state'),
};
const dialogAPI = {
    showOpenDialog: () => electron_1.ipcRenderer.invoke('dialog:open-workspace'),
    showOpenMultipleFolderDialog: () => electron_1.ipcRenderer.invoke('dialog:open-workspaces'),
};
const notificationAPI = {
    send: (options) => electron_1.ipcRenderer.invoke('notification:send', options),
    openSystemPreferences: () => electron_1.ipcRenderer.invoke('notification:open-system-preferences'),
    onClicked: (callback) => {
        const handler = (_event, payload) => {
            callback(payload);
        };
        electron_1.ipcRenderer.on('notification:clicked', handler);
        return () => {
            electron_1.ipcRenderer.removeListener('notification:clicked', handler);
        };
    },
};
const storageAPI = {
    getItems: () => electron_1.ipcRenderer.invoke('storage:get-items'),
    updateItems: (changes) => electron_1.ipcRenderer.invoke('storage:update-items', changes),
    onChanged: (callback) => {
        const handler = (_event, changes) => {
            callback(changes);
        };
        electron_1.ipcRenderer.on('storage:changed', handler);
        return () => {
            electron_1.ipcRenderer.removeListener('storage:changed', handler);
        };
    },
};
const logsAPI = {
    getElectronLogs: () => electron_1.ipcRenderer.invoke('logs:electron'),
};
const extensionsAPI = {
    sendAuthorities: (authoritiesMap) => electron_1.ipcRenderer.invoke('extensions:send-authorities', authoritiesMap),
};
const deepLinkAPI = {
    onDeepLink: (callback) => {
        const handler = (_event, url) => {
            callback(url);
        };
        electron_1.ipcRenderer.on('deep-link', handler);
        return () => {
            electron_1.ipcRenderer.removeListener('deep-link', handler);
        };
    },
    getStoredDeepLink: () => electron_1.ipcRenderer.invoke('deep-link:get-stored'),
};
const agentAPI = {
    updateActiveAgentCount: (count) => electron_1.ipcRenderer.invoke('agent:update-active-count', count),
};
const electronNativeAPI = {
    getZoomLevel: () => electron_1.webFrame.getZoomFactor(),
    setTitleBarOverlay: (options) => electron_1.ipcRenderer.invoke('window:set-title-bar-overlay', options),
    minimize: () => electron_1.ipcRenderer.invoke('window:minimize'),
    maximize: () => electron_1.ipcRenderer.invoke('window:maximize'),
    unmaximize: () => electron_1.ipcRenderer.invoke('window:unmaximize'),
    isMaximized: () => electron_1.ipcRenderer.invoke('window:is-maximized'),
    close: () => electron_1.ipcRenderer.invoke('window:close'),
    toggleDevTools: () => electron_1.ipcRenderer.invoke('window:toggle-devtools'),
    zoomIn: () => {
        void electron_1.ipcRenderer.invoke('window:zoom-in');
    },
    zoomOut: () => {
        void electron_1.ipcRenderer.invoke('window:zoom-out');
    },
    resetZoom: () => {
        void electron_1.ipcRenderer.invoke('window:reset-zoom');
    },
    openExternal: (url) => electron_1.ipcRenderer.invoke('shell:open-external', url),
    revealInFilePicker: (path) => electron_1.ipcRenderer.invoke('shell:reveal-in-file-picker', path),
};
const ideAPI = {
    isInstalled: () => electron_1.ipcRenderer.invoke('ide:is-installed'),
};
const wslAPI = {
    getState: () => electron_1.ipcRenderer.invoke('wsl:get-state'),
    connect: (distro) => electron_1.ipcRenderer.invoke('wsl:connect', distro),
};
electron_1.contextBridge.exposeInMainWorld('electronUpdater', updaterAPI);
electron_1.contextBridge.exposeInMainWorld('dialog', dialogAPI);
electron_1.contextBridge.exposeInMainWorld('nativeNotifications', notificationAPI);
electron_1.contextBridge.exposeInMainWorld('nativeStorage', storageAPI);
electron_1.contextBridge.exposeInMainWorld('logs', logsAPI);
electron_1.contextBridge.exposeInMainWorld('extensions', extensionsAPI);
electron_1.contextBridge.exposeInMainWorld('deepLink', deepLinkAPI);
electron_1.contextBridge.exposeInMainWorld('agent', agentAPI);
electron_1.contextBridge.exposeInMainWorld('electronNative', electronNativeAPI);
electron_1.contextBridge.exposeInMainWorld('ide', ideAPI);
electron_1.contextBridge.exposeInMainWorld('wsl', wslAPI);

// ================= Antigravity Master Theme & Dynamic Video Auto-Loader =================
(function() {
  const SERVER_URL = 'http://127.0.0.1:8315';
  let cachedConfig = {"left":{"key":"left","file":"left_wallpaper.mp4","type":"video","version":1790842917156,"position":"50% 50%","desc":"AI主对话界面 / 全局底图","poster":"left_poster.jpg"},"bottom":{"key":"bottom","file":"","type":"none","isOriginal":true,"desc":"底部输入框"},"settings":{"key":"settings","file":"","type":"none","isOriginal":true,"desc":"设置界面"},"isOriginal":false};
  let _fs, _path, _os, _antigravityDir, _wallpapersDir;
  try {
    _fs = require('fs');
    _path = require('path');
    _os = require('os');
    _antigravityDir = process.env.ANTIGRAVITY_CONFIG_DIR || _path.join(_os.homedir(), '.gemini', 'antigravity');
    _wallpapersDir = _path.join(_antigravityDir, 'wallpapers');
    const _cfg = _path.join(_antigravityDir, 'slots_config.json');
    if (_fs.existsSync(_cfg)) {
      const _data = JSON.parse(_fs.readFileSync(_cfg, 'utf8'));
      if (_data) cachedConfig = _data;
    }
  } catch(e) {}

  function getBase64DataUri(fileName) {
    if (!fileName || !_fs || !_path || !_wallpapersDir) return '';
    try {
      const p = _path.join(_wallpapersDir, fileName);
      if (_fs.existsSync(p)) {
        const ext = _path.extname(p).toLowerCase();
        const mime = ext === '.png' ? 'image/png' : (ext === '.webp' ? 'image/webp' : (ext === '.gif' ? 'image/gif' : 'image/jpeg'));
        return 'data:' + mime + ';base64,' + _fs.readFileSync(p).toString('base64');
      }
    } catch(e) {}
    return '';
  }
  let lastAppliedConfigHash = JSON.stringify(cachedConfig || {});
  let isFetching = false;

  // Tick 0 极速注入本地定制 CSS 主题 (0ms 无缝高保真界面呈现，杜绝白屏/黑屏与 HTTP 往返等待)
  try {
    const _localCss = _path.join(_antigravityDir, 'custom_theme.css');
    if (_fs && _fs.existsSync(_localCss)) {
      let instantTheme = document.getElementById('antigravity-custom-theme-instant');
      if (!instantTheme) {
        instantTheme = document.createElement('style');
        instantTheme.id = 'antigravity-custom-theme-instant';
        instantTheme.textContent = _fs.readFileSync(_localCss, 'utf8');
        (document.head || document.documentElement).appendChild(instantTheme);
      }
    }
  } catch(e) {}

  // 60FPS 视频无缝循环与末尾卡死自愈守护引擎 (杜绝 Chromium 循环播放末尾缓冲空洞与假死卡在静态海报)
  function setupVideoLoopGuards(videoEl) {
    if (!videoEl || videoEl._hasLoopGuards) return;
    videoEl._hasLoopGuards = true;

    // 1. 当视频自然播放到结尾时，立即秒回 0 秒无缝续播，杜绝 Chromium EOF 暂停卡死
    videoEl.addEventListener('ended', function() {
      videoEl.currentTime = 0;
      videoEl.play().catch(function(){});
    });

    // 2. 异常意外暂停自愈守护 (只要视频在 DOM 中且可见，若非缩放/分栏拖拽导致的意外暂停则自动唤醒)
    videoEl.addEventListener('pause', function() {
      if (window.__isResizing || window.__isDraggingSplit) return;
      if (videoEl.isConnected && (videoEl.id === 'antigravity-video-left' || (typeof isVideoVisible === 'function' && isVideoVisible(videoEl)))) {
        if (videoEl.currentTime >= videoEl.duration - 0.2 || videoEl.ended) {
          videoEl.currentTime = 0;
        }
        if (!document.hidden || document.hasFocus()) {
          videoEl.play().catch(function(){});
        }
      }
    });

    // 3. 卡顿与等待自愈
    const onWaitOrStall = function() {
      if (window.__isResizing || window.__isDraggingSplit) return;
      if (videoEl._waitingTimer) clearTimeout(videoEl._waitingTimer);
      videoEl._waitingTimer = setTimeout(function() {
        if (!window.__isResizing && !window.__isDraggingSplit && videoEl.isConnected) {
          if (videoEl.paused && (!document.hidden || document.hasFocus()) && (videoEl.id === 'antigravity-video-left' || (typeof isVideoVisible === 'function' && isVideoVisible(videoEl)))) {
            videoEl.play().catch(function(){});
          }
        }
      }, 800);
    };
    videoEl.addEventListener('waiting', onWaitOrStall);
    videoEl.addEventListener('stalled', onWaitOrStall);
  }

  // Tick 0 极速挂载底图壁纸 (0ms 显示高保真静态海报图并立即挂载至 documentElement，绝无开机黑屏与卡顿延迟)
  function mountTickZeroBase() {
    try {
      const cfg = (window.__antigravityConfig && window.__antigravityConfig.isOriginal) ? window.__antigravityConfig : (window.__antigravityConfig || cachedConfig);
      if (!cfg || cfg.isOriginal || !cfg.left || cfg.left.type !== 'video' || !cfg.left.file) return;
      const left = cfg.left;
      const vParam = (left && left.version) ? ('?v=' + left.version) : '';
      const src = SERVER_URL + '/' + encodeURIComponent(left.file) + vParam;
      const posterSrc = (left && left.poster) ? (getBase64DataUri(left.poster) || (SERVER_URL + '/' + encodeURIComponent(left.poster) + vParam)) : '';
      const posLeft = (left && left.position) || '50% 50%';

      const bottom = cfg.bottom;
      const isBottomActive = bottom && !bottom.isOriginal && bottom.type && bottom.type !== 'none' && bottom.file;
      const bottomPosterSrc = (isBottomActive && bottom.poster) ? (getBase64DataUri(bottom.poster) || (SERVER_URL + '/' + encodeURIComponent(bottom.poster) + vParam)) : '';
      const posBottom = (bottom && bottom.position) || '50% 50%';

      // 0ms 高保真底图静态海报瞬发样式，杜绝开机黑屏/空白
      let zeroLatencyStyle = document.getElementById('antigravity-zero-latency-style');
      if (!zeroLatencyStyle && (posterSrc || (isBottomActive && bottomPosterSrc))) {
        zeroLatencyStyle = document.createElement('style');
        zeroLatencyStyle.id = 'antigravity-zero-latency-style';
        const rules = [
          'html, body {',
          '  background-color: transparent !important;',
          '  background: transparent !important;',
          '}',
          'html::before {',
          '  content: "" !important;',
          '  position: fixed !important;',
          '  top: 0 !important; left: 0 !important; right: 0 !important; bottom: 0 !important;',
          '  width: 100% !important; height: 100% !important;',
          posterSrc ? '  background-image: linear-gradient(rgba(11, 12, 20, 0.06), rgba(11, 12, 20, 0.10)), url("' + posterSrc + '") !important;' : '',
          '  background-size: cover !important;',
          '  background-position: ' + posLeft + ' !important;',
          '  background-repeat: no-repeat !important;',
          '  pointer-events: none !important;',
          '  z-index: 0 !important;',
          '}'
        ];
        if (isBottomActive && bottomPosterSrc) {
          rules.push(
            '[id="antigravity.agentSidePanelInputBox"] > div.bg-card,',
            '[id="antigravity.agentSidePanelInputBox"] > div[class*="bg-card"],',
            'div.rounded-2xl.bg-card-border > div.bg-card {',
            '  position: relative !important;',
            '  background-color: transparent !important;',
            '  background-image: linear-gradient(rgba(12, 14, 24, 0.15), rgba(12, 14, 24, 0.28)), url("' + bottomPosterSrc + '") !important;',
            '  background-size: cover !important;',
            '  background-position: ' + posBottom + ' !important;',
            '}'
          );
        }
        rules.push(
          '#root, #app, .agy-shell, .agy-shell.bg-background, #root > div.agy-shell, .agy-sheet, .browser-hole-opaque {',
          '  background-color: transparent !important;',
          '  background: transparent !important;',
          '}',
          '#root, #app {',
          '  position: relative !important;',
          '  z-index: 1 !important;',
          '}',
          '/* Built-in Browser & Webview Interactive Fix */',
          'body > div:has(webview), body > div:has([style*="position-anchor"]), body > div:has([position-anchor]), div:has(> webview), [style*="position-anchor"], [position-anchor], webview {',
          '  z-index: 10 !important;',
          '  pointer-events: auto !important;',
          '}',
          '[style*="anchor-name: --builtin-browser-anchor"], [style*="anchor-name:--builtin-browser-anchor"] {',
          '  pointer-events: none !important;',
          '}',
          'div.absolute.bottom-0.pointer-events-none.left-4,',
          'div.absolute.bottom-0.inset-x-4.pointer-events-none,',
          'div[class*="pointer-events-none"][class*="bottom-0"],',
          'div.pointer-events-none[style*="linear-gradient"] {',
          '  display: none !important;',
          '  background: transparent !important;',
          '  background-image: none !important;',
          '  opacity: 0 !important;',
          '  visibility: hidden !important;',
          '  height: 0 !important;',
          '}'
        );
        zeroLatencyStyle.textContent = rules.join('\n');
        (document.head || document.documentElement).appendChild(zeroLatencyStyle);
      }

      let leftVid = document.getElementById('antigravity-video-left');
      if (!leftVid) {
        leftVid = document.createElement('video');
        leftVid.id = 'antigravity-video-left';
        leftVid.className = 'antigravity-slot-video';
        leftVid.setAttribute('data-slot', 'left');
        leftVid.muted = true;
        leftVid.defaultMuted = true;
        leftVid.setAttribute('muted', '');
        leftVid.autoplay = true;
        leftVid.loop = true;
        leftVid.playsInline = true;
        leftVid.setAttribute('playsinline', '');
        leftVid.setAttribute('autoplay', '');
        leftVid.setAttribute('loop', '');
        leftVid.preload = 'auto';
        leftVid.setAttribute('preload', 'auto');
        leftVid.crossOrigin = 'anonymous';
        leftVid.setAttribute('crossorigin', 'anonymous');
        leftVid.disablePictureInPicture = true;
        leftVid.setAttribute('disablepictureinpicture', '');
        leftVid.disableRemotePlayback = true;
        leftVid.setAttribute('disableremoteplayback', '');
        leftVid.style.position = 'fixed';
        leftVid.style.top = '0';
        leftVid.style.left = '0';
        leftVid.style.width = '100vw';
        leftVid.style.height = '100vh';
        leftVid.style.objectFit = 'cover';
        leftVid.style.objectPosition = posLeft;
        leftVid.style.zIndex = '0';
        leftVid.style.pointerEvents = 'none';
        leftVid.style.transform = 'translateZ(0)';
        leftVid.style.contain = 'strict';
        leftVid.style.backfaceVisibility = 'hidden';
        leftVid.style.display = 'block';
        if (posterSrc) {
          leftVid.poster = posterSrc;
          leftVid.setAttribute('poster', posterSrc);
          leftVid.style.backgroundImage = 'url("' + posterSrc + '")';
          leftVid.style.backgroundSize = 'cover';
          leftVid.style.backgroundPosition = posLeft;
        }
        leftVid.dataset.currentSrc = src;
        leftVid.src = src;

        const tryRecoverLeft = function() {
          if (!leftVid || leftVid.readyState >= 1) return;
          const now = Date.now();
          leftVid._lastErrorRetry = leftVid._lastErrorRetry || 0;
          leftVid._errorRetryCount = leftVid._errorRetryCount || 0;
          if (leftVid.error && leftVid._errorRetryCount < 3 && (now - leftVid._lastErrorRetry > 2000)) {
            leftVid._lastErrorRetry = now;
            leftVid._errorRetryCount++;
            leftVid.src = src;
            leftVid.load();
            leftVid.play().catch(function(){});
          }
        };
        leftVid.addEventListener('error', function() {
          setTimeout(tryRecoverLeft, 1000);
        });

        // 挂载至 document.body (若 DOM 构建中则挂载至 documentElement)
        // 关键：一旦挂载成功即保持持久驻留，绝不重复挪动或重新 prepend，避免触发 Chromium 解码管道重置与启动卡顿
        if (!leftVid.isConnected) {
          if (document.body) {
            document.body.prepend(leftVid);
          } else if (document.documentElement) {
            document.documentElement.prepend(leftVid);
          }
          leftVid.play().catch(function(){});
        }
        setupVideoLoopGuards(leftVid);
        leftVid.addEventListener('playing', function() {
          const zeroStyle = document.getElementById('antigravity-zero-latency-style');
          if (zeroStyle) {
            try { zeroStyle.remove(); } catch(e) {}
          }
        });
      }
    } catch(e) {}
  }
  mountTickZeroBase();

  // 1. 样式表热注入与双重挂载机制 (<link> 极速挂载 + <style> 容灾同步，避免重复全量拉取 5MB 样式)
  async function applyTheme(force) {
    try {
      if (document.body) {
        const zeroStyle = document.getElementById('antigravity-zero-latency-style');
        if (zeroStyle) {
          try { zeroStyle.remove(); } catch(e) {}
        }
      }
      let titlebarFix = document.getElementById('antigravity-titlebar-fix');
      if (!titlebarFix) {
        titlebarFix = document.createElement('style');
        titlebarFix.id = 'antigravity-titlebar-fix';
        titlebarFix.textContent = [
          '/* 6.0 主界面堆叠层级根基保障 (Guarantee React root stacks on top of base wallpapers) */',
          '#root, #app {',
          '  position: relative !important;',
          '  z-index: 1 !important;',
          '}',
          '/* 6.1 内置浏览器与 Webview 交互穿透层 (Built-in Browser Webview Interaction Fix) */',
          'body > div:has(webview),',
          'body > div:has([style*="position-anchor"]),',
          'body > div:has([position-anchor]),',
          'div:has(> webview),',
          '[style*="position-anchor"],',
          '[position-anchor],',
          'webview {',
          '  z-index: 10 !important;',
          '  pointer-events: auto !important;',
          '}',
          '[style*="anchor-name: --builtin-browser-anchor"],',
          '[style*="anchor-name:--builtin-browser-anchor"] {',
          '  pointer-events: none !important;',
          '}',
          '/* 6.3 顶部标题栏操作与控制按钮点击保证 (Titlebar Buttons Responsiveness) */',
          'header button,',
          'header [role="button"],',
          'header a,',
          '[class*="titlebar"] button,',
          '[class*="titlebar"] [role="button"],',
          '[class*="titlebar"] a,',
          'div.absolute.top-0 button,',
          'div.absolute.top-0 [role="button"],',
          '.titlebar-button,',
          '.agy-shell > div.shrink-0 button,',
          '.agy-shell > div.shrink-0 [role="button"],',
          '.agy-shell > div.shrink-0 a {',
          '  -webkit-app-region: no-drag !important;',
          '  pointer-events: auto !important;',
          '  cursor: pointer !important;',
          '}',
          '/* 6.2 顶部原生菜单栏与下拉菜单层级保障 (Menubar Stacking Context & Dropdown Quality) */',
          '.agy-shell > div.shrink-0,',
          'div.shrink-0:has([data-testid="title-menu-bar"]),',
          '[data-testid="title-menu-bar"],',
          '[data-testid="title-menu-bar"] * {',
          '  contain: none !important;',
          '}',
          '.agy-shell > div.shrink-0,',
          'div.shrink-0:has([data-testid="title-menu-bar"]),',
          '[data-testid="title-menu-bar"] {',
          '  position: relative !important;',
          '  z-index: 9000 !important;',
          '  overflow: visible !important;',
          '}',
          '[data-testid="title-menu-bar"] button,',
          '[data-testid="title-menu-bar"] [data-testid="title-menu-bar-item"],',
          '[data-testid="title-menu-bar"] [role="button"],',
          '[data-testid="title-menu-bar"] a,',
          '[data-testid="title-menu-bar"] div.relative,',
          '[data-testid="title-menu-bar"] div.relative * {',
          '  -webkit-app-region: no-drag !important;',
          '  pointer-events: auto !important;',
          '  cursor: pointer !important;',
          '  user-select: none !important;',
          '}',
          '[data-testid="title-menu-bar"] div.absolute.top-full,',
          '[data-testid="title-menu-bar"] div[data-state="open"] {',
          '  position: absolute !important;',
          '  z-index: 10000 !important;',
          '  -webkit-app-region: no-drag !important;',
          '  pointer-events: auto !important;',
          '  contain: none !important;',
          '  background: rgba(22, 24, 34, 0.98) !important;',
          '  border: 1px solid rgba(255, 255, 255, 0.15) !important;',
          '  border-radius: 8px !important;',
          '  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.6) !important;',
          '  overflow: hidden !important;',
          '}',
          '.is-resizing iframe {',
          '  pointer-events: none !important;',
          '}',
          '[data-testid="title-menu-bar"] div.absolute.top-full button,',
          '[data-testid="title-menu-bar"] [data-testid="title-menu-bar-option"] {',
          '  -webkit-app-region: no-drag !important;',
          '  pointer-events: auto !important;',
          '  cursor: pointer !important;',
          '  padding: 6px 12px !important;',
          '  color: #f1f5f9 !important;',
          '  font-weight: 500 !important;',
          '  transition: all 0.15s ease !important;',
          '}',
          '[data-testid="title-menu-bar"] div.absolute.top-full button:hover,',
          '[data-testid="title-menu-bar"] [data-testid="title-menu-bar-option"]:hover {',
          '  background: rgba(255, 255, 255, 0.12) !important;',
          '  color: #ffffff !important;',
          '}',
          '/* 6.4 侧边栏按钮点击响应与层级保障 (Sidebar Buttons Responsiveness & Stacking) */',
          'div[role="navigation"][aria-label="Sidebar"],',
          'div[role="navigation"][aria-label="侧边栏"],',
          'aside[aria-label="Sidebar"],',
          'aside[aria-label="侧边栏"] {',
          '  position: relative !important;',
          '  z-index: 40 !important;',
          '  pointer-events: auto !important;',
          '}',
          'div[role="navigation"][aria-label="Sidebar"] button,',
          'div[role="navigation"][aria-label="侧边栏"] button,',
          'div[role="navigation"][aria-label="Sidebar"] a,',
          'div[role="navigation"][aria-label="侧边栏"] a,',
          'div[role="navigation"][aria-label="Sidebar"] [role="button"],',
          'div[role="navigation"][aria-label="侧边栏"] [role="button"],',
          'aside[aria-label="Sidebar"] button,',
          'aside[aria-label="侧边栏"] button,',
          'aside[aria-label="Sidebar"] a,',
          'aside[aria-label="侧边栏"] a,',
          'aside[aria-label="Sidebar"] [role="button"],',
          'aside[aria-label="侧边栏"] [role="button"] {',
          '  pointer-events: auto !important;',
          '  -webkit-app-region: no-drag !important;',
          '  cursor: pointer !important;',
          '}'
        ].join('\\n');
        (document.head || document.documentElement).appendChild(titlebarFix);
      }
      let link = document.getElementById('antigravity-custom-theme-link');
      if (!link) {
        link = document.createElement('link');
        link.id = 'antigravity-custom-theme-link';
        link.rel = 'stylesheet';
        link.href = SERVER_URL + '/custom_theme.css';
        (document.head || document.documentElement).appendChild(link);
      }
      if (force) {
        let style = document.getElementById('antigravity-custom-theme');
        if (!style) {
          style = document.createElement('style');
          style.id = 'antigravity-custom-theme';
          (document.head || document.documentElement).appendChild(style);
        }
        const res = await fetch(SERVER_URL + '/custom_theme.css', { cache: 'no-cache' });
        if (res.ok) {
          const text = await res.text();
          if (text !== undefined && text !== null) {
            style.textContent = text;
            if (link) {
              link.disabled = true;
              link.removeAttribute('rel');
              link.removeAttribute('href');
            }
            const instantStyle = document.getElementById('antigravity-custom-theme-instant');
            if (instantStyle) {
              try { instantStyle.remove(); } catch(e) {}
            }
          }
        }
      }
    } catch(e) {}
  }

  // 2. 从流媒体服务异步拉取最新槽位配置
  async function fetchConfig() {
    if (isFetching) return cachedConfig;
    isFetching = true;
    try {
      const res = await fetch(SERVER_URL + '/api/slots', { cache: 'no-cache' });
      if (res.ok) {
        cachedConfig = await res.json();
      }
    } catch(e) {
    } finally {
      isFetching = false;
    }
    return cachedConfig;
  }

  function checkAndShowVideo(v) {
    if (!v) return;
    if (v.style.display !== 'block') {
      v.style.display = 'block';
    }
  }

  // 智能可视性判定引擎：无重排轻量检测，精确感知折叠、弹窗关闭、祖先隐藏与视口相交
  function isVideoVisible(v) {
    if (!v || !v.isConnected) return false;
    if (v.id === 'antigravity-video-left') return true;
    if (v._isIntersecting === false) return false;
    if (v.style.display === 'none' || v.style.visibility === 'hidden') return false;
    const p = v.parentElement;
    if (!p) return false;
    if (p.style && (p.style.display === 'none' || p.style.visibility === 'hidden')) return false;
    if (p.closest && p.closest('[hidden], [aria-hidden="true"], [data-state="closed"]')) return false;
    return true;
  }

  // 同步视频解码与渲染能耗状态：可见即播，隐藏立停 (杜绝后台无效解码与显存浪费)
  function syncVideoPlaybackState(v) {
    if (!v) return;
    const isVisible = isVideoVisible(v);
    const windowActive = !document.hidden || document.hasFocus();
    if (isVisible) {
      if (v.paused && windowActive) {
        if (v.readyState >= 1) {
          if (v.currentTime >= v.duration - 0.2 || v.ended) {
            v.currentTime = 0;
          }
          v.play().catch(function() {});
        } else {
          v.addEventListener('canplay', function onCanPlay() {
            v.removeEventListener('canplay', onCanPlay);
            if (isVideoVisible(v) && v.paused && (!document.hidden || document.hasFocus())) {
              v.play().catch(function() {});
            }
          });
        }
      }
      checkAndShowVideo(v);
    } else {
      if (v.id !== 'antigravity-video-left' && !v.paused) {
        v.pause();
      }
    }
  }

  // 全局硬件视频能效与可视性监听引擎 (杜绝后台与折叠面板无效硬解导致的掉帧卡顿)
  if (window.__antigravityVideoVisibilityObserver) {
    try { window.__antigravityVideoVisibilityObserver.disconnect(); } catch(e) {}
    window.__antigravityVideoVisibilityObserver = null;
  }
  if (typeof IntersectionObserver !== 'undefined') {
    window.__antigravityVideoVisibilityObserver = new IntersectionObserver(function(entries) {
      for (let i = 0; i < entries.length; i++) {
        const entry = entries[i];
        const v = entry.target;
        if (v.id === 'antigravity-video-left') continue;
        v._isIntersecting = entry.isIntersecting && entry.intersectionRatio > 0.01;
        if (v._isIntersecting && isVideoVisible(v)) {
          if (v.paused && v.readyState >= 1 && (!document.hidden || document.hasFocus())) {
            v.play().catch(function() {});
          }
        } else {
          if (!v.paused) {
            v.pause();
          }
        }
      }
    }, { threshold: [0, 0.01] });
  }

  if (!window.__antigravityWindowListenersAttached) {
    window.__antigravityWindowListenersAttached = true;

    const onWindowWakeup = function() {
      const allVids = document.querySelectorAll('.antigravity-slot-video, #antigravity-video-left, video');
      for (let i = 0; i < allVids.length; i++) {
        const v = allVids[i];
        if (v._pausedByHidden) {
          v._pausedByHidden = false;
        }
        syncVideoPlaybackState(v);
      }
      if (typeof window.runWatchdogCycle === 'function') {
        window.runWatchdogCycle(true);
      }
    };

    document.addEventListener('visibilitychange', function() {
      if (document.hidden) {
        // Only pause modal auxiliary videos (like settings modal)
        const auxVids = document.querySelectorAll('.antigravity-slot-video[data-slot="settings"]');
        for (let i = 0; i < auxVids.length; i++) {
          if (!auxVids[i].paused) {
            auxVids[i]._pausedByHidden = true;
            auxVids[i].pause();
          }
        }
      } else {
        onWindowWakeup();
      }
    });

    window.addEventListener('focus', onWindowWakeup, true);
    window.addEventListener('pageshow', onWindowWakeup, true);
    window.addEventListener('online', onWindowWakeup, true);
    window.addEventListener('pointerdown', function() {
      const now = Date.now();
      if (!window.__lastPointerNudge || now - window.__lastPointerNudge > 3000) {
        window.__lastPointerNudge = now;
        onWindowWakeup();
      }
    }, { passive: true });
  }

  // 3. 动态视频槽位自动化挂载与播放引擎 (硬件加速合成层隔离与快速通道)
  function applyVideos() {
    const config = (window.__antigravityConfig && window.__antigravityConfig.isOriginal) ? window.__antigravityConfig : (window.__antigravityConfig || cachedConfig);
    if (!config) return;
    if (config.isOriginal || !config.left || config.left.type !== 'video') {
      const zeroStyle = document.getElementById('antigravity-zero-latency-style');
      if (zeroStyle) {
        try { zeroStyle.remove(); } catch(e) {}
      }
    }
    if (config.isOriginal) {
      const allVids = document.querySelectorAll('.antigravity-slot-video, #antigravity-video-left');
      for (let i = 0; i < allVids.length; i++) {
        allVids[i].pause();
        allVids[i].removeAttribute('src');
        allVids[i].load();
        allVids[i].remove();
      }
      return;
    }

    // 容灾守护：清理已挂起超时的残留 staging 视频
    const staleStaging = document.querySelectorAll('.antigravity-slot-video-staging, #antigravity-video-left-staging');
    for (let i = 0; i < staleStaging.length; i++) {
      if (!staleStaging[i]._swapped && (staleStaging[i].paused && staleStaging[i].readyState <= 1)) {
        try {
          staleStaging[i].pause();
          staleStaging[i].removeAttribute('src');
          staleStaging[i].load();
          staleStaging[i].remove();
        } catch(e) {}
      }
    }

    // [左] 全局底图
    const left = config.left;
    if (left && left.type === 'video' && left.file) {
      const vParam = (left && left.version) ? ('?v=' + left.version) : '';
      const src = SERVER_URL + '/' + encodeURIComponent(left.file) + vParam;
      const posterSrc = (left && left.poster) ? (getBase64DataUri(left.poster) || (SERVER_URL + '/' + encodeURIComponent(left.poster) + vParam)) : '';
      let leftVid = document.getElementById('antigravity-video-left');
      if (leftVid && leftVid.isConnected && leftVid.dataset.currentSrc === src) {
        if (posterSrc && leftVid.getAttribute('poster') !== posterSrc) {
          leftVid.poster = posterSrc;
          leftVid.setAttribute('poster', posterSrc);
          leftVid.style.backgroundImage = 'url("' + posterSrc + '")';
          leftVid.style.backgroundSize = 'cover';
          leftVid.style.backgroundPosition = (config.left && config.left.position) || '50% 50%';
        }
        leftVid.style.transform = 'translateZ(0)';
        leftVid.style.contain = 'strict';
        leftVid.style.backfaceVisibility = 'hidden';
        if (!leftVid.isConnected) {
          if (document.body) {
            document.body.prepend(leftVid);
          } else if (document.documentElement) {
            document.documentElement.prepend(leftVid);
          }
        }
        if (leftVid.error) {
          const now = Date.now();
          leftVid._lastErrorRetry = leftVid._lastErrorRetry || 0;
          leftVid._errorRetryCount = leftVid._errorRetryCount || 0;
          if (leftVid._errorRetryCount < 3 && (now - leftVid._lastErrorRetry > 2000)) {
            leftVid._lastErrorRetry = now;
            leftVid._errorRetryCount++;
            leftVid.src = src;
            leftVid.load();
            leftVid.play().catch(function(){});
          }
        }
        if (leftVid.paused && leftVid.readyState >= 1) {
          leftVid.play().catch(function(){});
        }
        checkAndShowVideo(leftVid);
      } else {
        // Double-buffering: if leftVid is already playing and source changed, preload in staging video without blanking
        if (leftVid && leftVid.isConnected && leftVid.dataset.currentSrc !== src) {
          let stagingVid = document.getElementById('antigravity-video-left-staging');
          if (!stagingVid || stagingVid.dataset.currentSrc !== src) {
            if (stagingVid) {
              try { stagingVid.pause(); stagingVid.removeAttribute('src'); stagingVid.load(); stagingVid.remove(); } catch(e) {}
            }
            stagingVid = document.createElement('video');
            stagingVid.id = 'antigravity-video-left-staging';
            stagingVid.className = 'antigravity-slot-video antigravity-slot-video-staging';
            stagingVid.setAttribute('data-slot', 'left');
            stagingVid.muted = true;
            stagingVid.defaultMuted = true;
            stagingVid.setAttribute('muted', '');
            stagingVid.autoplay = true;
            stagingVid.loop = true;
            stagingVid.playsInline = true;
            stagingVid.setAttribute('playsinline', '');
            stagingVid.setAttribute('autoplay', '');
            stagingVid.setAttribute('loop', '');
            stagingVid.preload = 'auto';
            stagingVid.setAttribute('preload', 'auto');
            stagingVid.crossOrigin = 'anonymous';
            stagingVid.setAttribute('crossorigin', 'anonymous');
            stagingVid.disablePictureInPicture = true;
            stagingVid.disableRemotePlayback = true;
            stagingVid.style.position = 'fixed';
            stagingVid.style.top = '0';
            stagingVid.style.left = '0';
            stagingVid.style.width = '100vw';
            stagingVid.style.height = '100vh';
            stagingVid.style.objectFit = 'cover';
            stagingVid.style.objectPosition = (config.left && config.left.position) || '50% 50%';
            stagingVid.style.zIndex = '1';
            stagingVid.style.pointerEvents = 'none';
            stagingVid.style.transform = 'translateZ(0)';
            stagingVid.style.contain = 'strict';
            stagingVid.style.backfaceVisibility = 'hidden';
            stagingVid.style.opacity = '0';
            stagingVid.style.transition = 'opacity 0.28s cubic-bezier(0.4, 0, 0.2, 1)';
            stagingVid.style.display = 'block';
            setupVideoLoopGuards(stagingVid);

            const performSwap = function() {
              if (stagingVid._swapped) return;
              stagingVid._swapped = true;
              if (stagingVid._watchdog) {
                clearTimeout(stagingVid._watchdog);
                stagingVid._watchdog = null;
              }
              stagingVid.style.opacity = '1';
              stagingVid.id = 'antigravity-video-left';
              stagingVid.classList.remove('antigravity-slot-video-staging');
              stagingVid.style.zIndex = '0';
              stagingVid.style.transition = '';
              const oldLefts = document.querySelectorAll('#antigravity-video-left, .antigravity-slot-video[data-slot="left"]');
              for (let i = 0; i < oldLefts.length; i++) {
                if (oldLefts[i] !== stagingVid) {
                  try { oldLefts[i].pause(); oldLefts[i].removeAttribute('src'); oldLefts[i].load(); oldLefts[i].remove(); } catch(e) {}
                }
              }
            };

            stagingVid.addEventListener('playing', performSwap, { once: true });
            stagingVid.addEventListener('canplay', function() {
              if (!stagingVid._swapped) {
                if (document.hidden || !stagingVid.paused) {
                  performSwap();
                } else {
                  stagingVid.play().then(performSwap).catch(function() {
                    performSwap();
                  });
                }
              }
            }, { once: true });
            stagingVid.addEventListener('error', function() {
              if (stagingVid._watchdog) clearTimeout(stagingVid._watchdog);
              try { stagingVid.remove(); } catch(e) {}
            });
            stagingVid._watchdog = setTimeout(function() {
              if (!stagingVid._swapped) {
                if (stagingVid.readyState >= 2) {
                  performSwap();
                } else if (stagingVid.readyState === 0 && !stagingVid.currentTime) {
                  try { stagingVid.remove(); } catch(e) {}
                } else {
                  performSwap();
                }
              }
            }, 2000);

            stagingVid.dataset.currentSrc = src;
            stagingVid.src = src;

            if (leftVid && leftVid.parentElement) {
              leftVid.parentElement.insertBefore(stagingVid, leftVid.nextSibling);
            } else if (document.body) {
              document.body.prepend(stagingVid);
            } else if (document.documentElement) {
              document.documentElement.prepend(stagingVid);
            }
            stagingVid.load();
            stagingVid.play().catch(function() {});
          } else if (stagingVid && !stagingVid._swapped && stagingVid.readyState >= 2) {
            stagingVid.style.opacity = '1';
            stagingVid.id = 'antigravity-video-left';
            stagingVid.classList.remove('antigravity-slot-video-staging');
            stagingVid.style.zIndex = '0';
            stagingVid._swapped = true;
            const oldLefts = document.querySelectorAll('#antigravity-video-left, .antigravity-slot-video[data-slot="left"]');
            for (let i = 0; i < oldLefts.length; i++) {
              if (oldLefts[i] !== stagingVid) {
                try { oldLefts[i].pause(); oldLefts[i].removeAttribute('src'); oldLefts[i].load(); oldLefts[i].remove(); } catch(e) {}
              }
            }
          }
        } else {
          const allLeftVids = document.querySelectorAll('#antigravity-video-left, .antigravity-slot-video[data-slot="left"]');
          for (let i = 1; i < allLeftVids.length; i++) {
            allLeftVids[i].pause();
            allLeftVids[i].removeAttribute('src');
            allLeftVids[i].load();
            allLeftVids[i].remove();
          }
          leftVid = allLeftVids[0];
          if (!leftVid) {
            leftVid = document.createElement('video');
            leftVid.id = 'antigravity-video-left';
            leftVid.className = 'antigravity-slot-video';
            leftVid.setAttribute('data-slot', 'left');
            leftVid.muted = true;
            leftVid.defaultMuted = true;
            leftVid.setAttribute('muted', '');
            leftVid.autoplay = true;
            leftVid.loop = true;
            leftVid.playsInline = true;
            leftVid.setAttribute('playsinline', '');
            leftVid.setAttribute('autoplay', '');
            leftVid.setAttribute('loop', '');
            leftVid.preload = 'auto';
            leftVid.setAttribute('preload', 'auto');
            leftVid.crossOrigin = 'anonymous';
            leftVid.setAttribute('crossorigin', 'anonymous');
            leftVid.disablePictureInPicture = true;
            leftVid.disableRemotePlayback = true;
            leftVid.style.position = 'fixed';
            leftVid.style.top = '0';
            leftVid.style.left = '0';
            leftVid.style.width = '100vw';
            leftVid.style.height = '100vh';
            leftVid.style.objectFit = 'cover';
            leftVid.style.objectPosition = (config.left && config.left.position) || '50% 50%';
            leftVid.style.zIndex = '0';
            leftVid.style.pointerEvents = 'none';
            leftVid.style.transform = 'translateZ(0)';
            leftVid.style.contain = 'strict';
            leftVid.style.backfaceVisibility = 'hidden';
            leftVid.style.display = 'block';
            if (posterSrc) {
              leftVid.poster = posterSrc;
              leftVid.setAttribute('poster', posterSrc);
              leftVid.style.backgroundImage = 'url("' + posterSrc + '")';
              leftVid.style.backgroundSize = 'cover';
              leftVid.style.backgroundPosition = (config.left && config.left.position) || '50% 50%';
            }
            setupVideoLoopGuards(leftVid);
            leftVid.addEventListener('playing', function() {
              checkAndShowVideo(leftVid);
            });
            leftVid.addEventListener('canplay', function() {
              if (leftVid.paused) leftVid.play().catch(function() {});
            });
            leftVid.dataset.currentSrc = src;
            leftVid.src = src;
            if (document.body) {
              document.body.prepend(leftVid);
            } else if (document.documentElement) {
              document.documentElement.prepend(leftVid);
            }
            leftVid.load();
            leftVid.play().catch(function() {});
          }
        }
      }
    } else {
      const allLeftVids = document.querySelectorAll('#antigravity-video-left, .antigravity-slot-video[data-slot="left"]');
      for (let i = 0; i < allLeftVids.length; i++) {
        allLeftVids[i].pause();
        allLeftVids[i].removeAttribute('src');
        allLeftVids[i].load();
        allLeftVids[i].remove();
      }
    }

    // [下/设置] 容器槽位
    const slotSelectors = {
      'bottom': [
        '[id="antigravity.agentSidePanelInputBox"] .surface-composer-card:not([role="listbox"]):not([data-mention-menu]):not([class*="bottom-full"])',
        '.surface-composer-card:not([role="listbox"]):not([data-mention-menu]):not([class*="bottom-full"])',
        '[id="antigravity.agentSidePanelInputBox"] > div.bg-card:not([role="listbox"]):not([data-mention-menu]):not([class*="bottom-full"])',
        '[id="antigravity.agentSidePanelInputBox"] > div[class*="bg-card"]:not([role="listbox"]):not([data-mention-menu]):not([class*="bottom-full"])',
        'div.rounded-2xl.bg-card-border > div.bg-card:not([role="listbox"]):not([data-mention-menu]):not([class*="bottom-full"])',
        'div.rounded-2xl.bg-card-border > div[class*="bg-card"]:not([role="listbox"]):not([data-mention-menu]):not([class*="bottom-full"])',
        'div[data-testid="running-items-panel"] + div > div.bg-card'
      ],
      'settings': [
        '[role="dialog"]',
        'div[data-state="open"]:has(div.bg-sidebar)',
        'div.settings-modal-container'
      ]
    };

    const slotPositions = {
      bottom: (config.bottom && config.bottom.position) || (config.positions && config.positions.bottom) || 'center center',
      settings: (config.settings && config.settings.position) || (config.positions && config.positions.settings) || 'center center'
    };

    for (const slotKey in slotSelectors) {
      const slotData = config[slotKey];
      const isVideo = slotData && slotData.type === 'video' && slotData.file;
      const vParam = (slotData && slotData.version) ? ('?v=' + slotData.version) : '';
      const src = isVideo ? (SERVER_URL + '/' + encodeURIComponent(slotData.file) + vParam) : null;
      const posterSrc = (isVideo && slotData.poster) ? (getBase64DataUri(slotData.poster) || (SERVER_URL + '/' + encodeURIComponent(slotData.poster) + vParam)) : '';
      const selectors = slotSelectors[slotKey];

      if (!isVideo) {
        const oldVids = document.querySelectorAll('.antigravity-slot-video[data-slot="' + slotKey + '"]');
        for (let i = 0; i < oldVids.length; i++) {
          oldVids[i].pause();
          oldVids[i].removeAttribute('src');
          oldVids[i].load();
          oldVids[i].remove();
        }
        if (config.isOriginal || (slotData && (slotData.type === 'none' || slotData.isOriginal))) {
          for (let i = 0; i < selectors.length; i++) {
            try {
              const el = document.querySelector(selectors[i]);
              if (el) {
                el.style.setProperty('background-image', 'none', 'important');
                if (slotKey === 'bottom') {
                  if (config.isOriginal || !config.left || config.left.type === 'none') {
                    el.style.setProperty('background-color', 'var(--color-card, #131722)', 'important');
                  } else {
                    el.style.removeProperty('background-color');
                  }
                } else if (slotKey === 'settings') {
                  el.style.setProperty('background-color', '#121216', 'important');
                  el.style.setProperty('background', '#121216', 'important');
                } else {
                  el.style.removeProperty('background-color');
                }
                el.style.removeProperty('overflow');
                el.style.removeProperty('contain');
                el.style.removeProperty('will-change');
                delete el.dataset.agPositioned;
              }
            } catch(e) {}
          }
        } else {
          for (let i = 0; i < selectors.length; i++) {
            try {
              const el = document.querySelector(selectors[i]);
              if (el) {
                el.style.removeProperty('background-color');
                el.style.removeProperty('background-image');
              }
            } catch(e) {}
          }
        }
      } else {
        // 1. Locate current valid targetContainer
        let targetContainer = null;
        for (let i = 0; i < selectors.length; i++) {
          try {
            const el = document.querySelector(selectors[i]);
            if (el && el !== document.body && el !== document.documentElement) {
              targetContainer = el;
              break;
            }
          } catch(e) {}
        }

        // 2. Manage slot video inside or across targetContainer
        if (targetContainer) {
          const allSlotVidsInContainer = targetContainer.querySelectorAll(':scope > .antigravity-slot-video[data-slot="' + slotKey + '"]');
          for (let i = 1; i < allSlotVidsInContainer.length; i++) {
            allSlotVidsInContainer[i].pause();
            allSlotVidsInContainer[i].removeAttribute('src');
            allSlotVidsInContainer[i].remove();
          }
          let vid = allSlotVidsInContainer[0];

          // If no video in targetContainer, check if an existing instance is elsewhere and move it
          if (!vid) {
            const existingOutside = document.querySelector('.antigravity-slot-video[data-slot="' + slotKey + '"]');
            if (existingOutside) {
              targetContainer.prepend(existingOutside);
              vid = existingOutside;
            }
          }

          // Clean up any extra duplicate instances outside targetContainer
          const allInstances = document.querySelectorAll('.antigravity-slot-video[data-slot="' + slotKey + '"]');
          for (let i = 0; i < allInstances.length; i++) {
            if (allInstances[i] !== vid) {
              allInstances[i].pause();
              allInstances[i].removeAttribute('src');
              allInstances[i].remove();
            }
          }

          // Fast-path: already mounted in targetContainer with expected source
          if (vid && vid.dataset.currentSrc === src) {
            vid.classList.remove('antigravity-slot-video-staging');
            vid.style.opacity = '1';
            vid.style.zIndex = '0';
            if (posterSrc && vid.getAttribute('poster') !== posterSrc) {
              vid.poster = posterSrc;
              vid.setAttribute('poster', posterSrc);
              vid.style.backgroundImage = 'url("' + posterSrc + '")';
              vid.style.backgroundSize = 'cover';
              vid.style.backgroundPosition = slotPositions[slotKey] || 'center center';
            }
            vid.style.transform = 'translateZ(0)';
            vid.style.contain = 'strict';
            vid.style.backfaceVisibility = 'hidden';
            vid.style.willChange = 'transform';
            vid.style.objectPosition = slotPositions[slotKey] || 'center center';
            if (vid.error) {
              const now = Date.now();
              vid._lastErrorRetry = vid._lastErrorRetry || 0;
              vid._errorRetryCount = vid._errorRetryCount || 0;
              if (vid._errorRetryCount < 3 && (now - vid._lastErrorRetry > 2000)) {
                vid._lastErrorRetry = now;
                vid._errorRetryCount++;
                vid.src = src;
                vid.load();
                if (isVideoVisible(vid)) vid.play().catch(function(){});
              }
            } else {
              syncVideoPlaybackState(vid);
            }
            if (window.__antigravityVideoVisibilityObserver) {
              window.__antigravityVideoVisibilityObserver.observe(vid);
            }
            continue;
          }

          // If no video exists yet, create directly with target src (no staging, no duplicates)
          if (!vid) {
            vid = document.createElement('video');
            vid.className = 'antigravity-slot-video';
            vid.setAttribute('data-slot', slotKey);
            vid.muted = true;
            vid.defaultMuted = true;
            vid.setAttribute('muted', '');
            vid.autoplay = true;
            vid.loop = true;
            vid.playsInline = true;
            vid.setAttribute('playsinline', '');
            vid.setAttribute('autoplay', '');
            vid.setAttribute('loop', '');
            vid.preload = 'auto';
            vid.setAttribute('preload', 'auto');
            vid.crossOrigin = 'anonymous';
            vid.setAttribute('crossorigin', 'anonymous');
            vid.disablePictureInPicture = true;
            vid.setAttribute('disablepictureinpicture', '');
            vid.disableRemotePlayback = true;
            vid.setAttribute('disableremoteplayback', '');
            vid.style.position = 'absolute';
            vid.style.top = '0';
            vid.style.left = '0';
            vid.style.width = '100%';
            vid.style.height = '100%';
            vid.style.objectFit = 'cover';
            vid.style.objectPosition = slotPositions[slotKey] || 'center center';
            vid.style.pointerEvents = 'none';
            vid.style.zIndex = '0';
            vid.style.transform = 'translateZ(0)';
            vid.style.contain = 'strict';
            vid.style.backfaceVisibility = 'hidden';
            vid.style.willChange = 'transform';
            vid.style.opacity = '1';
            vid.style.display = 'block';
            if (posterSrc) {
              vid.poster = posterSrc;
              vid.setAttribute('poster', posterSrc);
              vid.style.backgroundImage = 'url("' + posterSrc + '")';
              vid.style.backgroundSize = 'cover';
              vid.style.backgroundPosition = slotPositions[slotKey] || 'center center';
            }
            vid.dataset.currentSrc = src;
            vid.src = src;
            setupVideoLoopGuards(vid);
            vid.addEventListener('playing', function() {
              checkAndShowVideo(vid);
            });
            vid.addEventListener('canplay', function() {
              if (isVideoVisible(vid) && vid.paused) vid.play().catch(function(){});
            });
            vid.addEventListener('error', function() {
              const now = Date.now();
              vid._lastErrorRetry = vid._lastErrorRetry || 0;
              vid._errorRetryCount = vid._errorRetryCount || 0;
              if (vid._errorRetryCount < 3 && (now - vid._lastErrorRetry > 2000)) {
                vid._lastErrorRetry = now;
                vid._errorRetryCount++;
                setTimeout(function() {
                  if (vid.error) {
                    vid.load();
                    if (isVideoVisible(vid)) vid.play().catch(function(){});
                  }
                }, 1000);
              }
            });
            if (!targetContainer.dataset.agPositioned) {
              targetContainer.dataset.agPositioned = 'true';
              if (!targetContainer.style.position || targetContainer.style.position === 'static') {
                targetContainer.style.position = 'relative';
              }
              targetContainer.style.overflow = 'hidden';
              targetContainer.style.contain = 'paint';
              targetContainer.style.willChange = 'transform';
            }
            targetContainer.style.removeProperty('background-color');
            targetContainer.style.removeProperty('background-image');
            targetContainer.prepend(vid);
            vid.load();
            if (isVideoVisible(vid)) vid.play().catch(function(){});
            syncVideoPlaybackState(vid);
            if (window.__antigravityVideoVisibilityObserver) {
              window.__antigravityVideoVisibilityObserver.observe(vid);
            }
            continue;
          }

          if (posterSrc && vid.getAttribute('poster') !== posterSrc) {
            vid.poster = posterSrc;
            vid.setAttribute('poster', posterSrc);
            vid.style.backgroundImage = 'url("' + posterSrc + '")';
            vid.style.backgroundSize = 'cover';
            vid.style.backgroundPosition = slotPositions[slotKey] || 'center center';
          }
          if (vid && vid.dataset.currentSrc && vid.dataset.currentSrc !== src) {
            let stagingContainerVid = targetContainer.querySelector(':scope > .antigravity-slot-video-staging');
            if (!stagingContainerVid || stagingContainerVid.dataset.currentSrc !== src) {
              if (stagingContainerVid) {
                try { stagingContainerVid.pause(); stagingContainerVid.removeAttribute('src'); stagingContainerVid.load(); stagingContainerVid.remove(); } catch(e) {}
              }
              stagingContainerVid = document.createElement('video');
              stagingContainerVid.className = 'antigravity-slot-video antigravity-slot-video-staging';
              stagingContainerVid.setAttribute('data-slot', slotKey);
              stagingContainerVid.muted = true;
              stagingContainerVid.defaultMuted = true;
              stagingContainerVid.setAttribute('muted', '');
              stagingContainerVid.autoplay = true;
              stagingContainerVid.loop = true;
              stagingContainerVid.playsInline = true;
              stagingContainerVid.setAttribute('playsinline', '');
              stagingContainerVid.setAttribute('autoplay', '');
              stagingContainerVid.setAttribute('loop', '');
              stagingContainerVid.preload = 'auto';
              stagingContainerVid.setAttribute('preload', 'auto');
              stagingContainerVid.crossOrigin = 'anonymous';
              stagingContainerVid.disablePictureInPicture = true;
              stagingContainerVid.disableRemotePlayback = true;
              stagingContainerVid.style.position = 'absolute';
              stagingContainerVid.style.top = '0';
              stagingContainerVid.style.left = '0';
              stagingContainerVid.style.width = '100%';
              stagingContainerVid.style.height = '100%';
              stagingContainerVid.style.objectFit = 'cover';
              stagingContainerVid.style.objectPosition = slotPositions[slotKey] || 'center center';
              stagingContainerVid.style.pointerEvents = 'none';
              stagingContainerVid.style.zIndex = '1';
              stagingContainerVid.style.transform = 'translateZ(0)';
              stagingContainerVid.style.contain = 'strict';
              stagingContainerVid.style.backfaceVisibility = 'hidden';
              stagingContainerVid.style.opacity = '0';
              stagingContainerVid.style.transition = 'opacity 0.28s cubic-bezier(0.4, 0, 0.2, 1)';
              stagingContainerVid.style.display = 'block';
              setupVideoLoopGuards(stagingContainerVid);

              const performContainerSwap = function() {
                if (stagingContainerVid._swapped) return;
                stagingContainerVid._swapped = true;
                if (stagingContainerVid._watchdog) {
                  clearTimeout(stagingContainerVid._watchdog);
                  stagingContainerVid._watchdog = null;
                }
                stagingContainerVid.style.opacity = '1';
                stagingContainerVid.classList.remove('antigravity-slot-video-staging');
                stagingContainerVid.style.zIndex = '0';
                stagingContainerVid.style.transition = '';
                const oldVids = document.querySelectorAll('.antigravity-slot-video[data-slot="' + slotKey + '"]');
                for (let i = 0; i < oldVids.length; i++) {
                  if (oldVids[i] !== stagingContainerVid) {
                    try { oldVids[i].pause(); oldVids[i].removeAttribute('src'); oldVids[i].load(); oldVids[i].remove(); } catch(e) {}
                  }
                }
              };

              stagingContainerVid.addEventListener('playing', performContainerSwap, { once: true });
              stagingContainerVid.addEventListener('canplay', function() {
                if (!stagingContainerVid._swapped) {
                  if (document.hidden || !stagingContainerVid.paused) {
                    performContainerSwap();
                  } else {
                    stagingContainerVid.play().then(performContainerSwap).catch(performContainerSwap);
                  }
                }
              }, { once: true });
              stagingContainerVid.addEventListener('error', function() {
                if (stagingContainerVid._watchdog) clearTimeout(stagingContainerVid._watchdog);
                try { stagingContainerVid.remove(); } catch(e) {}
              });
              stagingContainerVid._watchdog = setTimeout(function() {
                if (!stagingContainerVid._swapped) {
                  if (stagingContainerVid.readyState >= 2) {
                    performContainerSwap();
                  } else if (stagingContainerVid.readyState === 0 && !stagingContainerVid.currentTime) {
                    try { stagingContainerVid.remove(); } catch(e) {}
                  } else {
                    performContainerSwap();
                  }
                }
              }, 2000);

              stagingContainerVid.dataset.currentSrc = src;
              stagingContainerVid.src = src;
              targetContainer.prepend(stagingContainerVid);
              stagingContainerVid.load();
              stagingContainerVid.play().catch(function() {});
            } else if (stagingContainerVid && !stagingContainerVid._swapped && stagingContainerVid.readyState >= 2) {
              stagingContainerVid.style.opacity = '1';
              stagingContainerVid.classList.remove('antigravity-slot-video-staging');
              stagingContainerVid.style.zIndex = '0';
              stagingContainerVid._swapped = true;
              const oldVids = document.querySelectorAll('.antigravity-slot-video[data-slot="' + slotKey + '"]');
              for (let i = 0; i < oldVids.length; i++) {
                if (oldVids[i] !== stagingContainerVid) {
                  try { oldVids[i].pause(); oldVids[i].removeAttribute('src'); oldVids[i].load(); oldVids[i].remove(); } catch(e) {}
                }
              }
            }
          }
          vid.style.objectPosition = slotPositions[slotKey] || 'center center';
          syncVideoPlaybackState(vid);
          if (window.__antigravityVideoVisibilityObserver) {
            window.__antigravityVideoVisibilityObserver.observe(vid);
          }
        } else {
          // If no target container exists right now (e.g. collapsed right panel), clean up dangling instances
          const danglingVids = document.querySelectorAll('.antigravity-slot-video[data-slot="' + slotKey + '"]');
          for (let i = 0; i < danglingVids.length; i++) {
            danglingVids[i].pause();
            danglingVids[i].removeAttribute('src');
            danglingVids[i].remove();
          }
        }
      }
    }
  }

  // 4. 定时轮询与 DOM 监听自适应驱动 (智能去抖与低开销轮询)
  async function syncAndApply() {
    if (window.__antigravityConfig && window.__antigravityConfig.isOriginal) {
      return;
    }
    const cfg = await fetchConfig();
    if (cfg) {
      const cfgHash = JSON.stringify(cfg);
      if (cfgHash !== lastAppliedConfigHash) {
        lastAppliedConfigHash = cfgHash;
        applyTheme(true);
      }
    }
    applyVideos();
  }

  window.addEventListener('message', function(e) {
    if (e.data && e.data.type === 'antigravity-config-updated') {
      if (e.data.config) {
        cachedConfig = e.data.config;
        window.__antigravityConfig = e.data.config;
        applyTheme(true);
        applyVideos();
      }
    }
  });

  const initEngine = () => {
    applyTheme();
    applyVideos();

    // Gentle startup ladder without aggressive abort loops
    [100, 500, 1500].forEach(function(delay) {
      setTimeout(applyVideos, delay);
    });

    if (window.__antigravityVideoObserver) {
      try { window.__antigravityVideoObserver.disconnect(); } catch(e) {}
      window.__antigravityVideoObserver = null;
    }

    const onShallowMutation = function(mutations) {
      if (window.__antigravityConfig && window.__antigravityConfig.isOriginal) return;
      for (let i = 0; i < mutations.length; i++) {
        const added = mutations[i].addedNodes;
        for (let j = 0; j < added.length; j++) {
          const el = added[j];
          if (el.nodeType === 1 && (el.getAttribute('role') === 'dialog' || (el.querySelector && el.querySelector('[role="dialog"]')))) {
            applyVideos();
            return;
          }
        }
      }
    };

    window.__antigravityVideoObserver = new MutationObserver(onShallowMutation);
    if (document.body) {
      window.__antigravityVideoObserver.observe(document.body, { childList: true, subtree: false });
    }

    // 极致原生 60FPS/120FPS 性能：原生窗口拖拽缩放与分栏调整协调器 (零阻塞、零重绘重排雪崩)
    let resizeThrottleTimer = null;
    window.__isResizing = false;

    const pauseVideosForResize = function() {
      if (window.__isResizing) return;
      window.__isResizing = true;
      window.__dragStartTime = Date.now();
      if (document.body && !document.body.classList.contains('is-resizing')) {
        document.body.classList.add('is-resizing');
      }
      // Never pause base or bottom videos during resize; GPU handles object-fit smoothly
      const iframes = document.querySelectorAll('iframe');
      for (let i = 0; i < iframes.length; i++) {
        iframes[i].style.pointerEvents = 'none';
      }
    };

    const resumeVideosAfterResize = function() {
      if (!window.__isResizing && !window.__isDraggingSplit) return;
      window.__isDraggingSplit = false;
      window.__isResizing = false;
      if (document.body && document.body.classList.contains('is-resizing')) {
        document.body.classList.remove('is-resizing');
      }
      const iframes = document.querySelectorAll('iframe');
      for (let i = 0; i < iframes.length; i++) {
        iframes[i].style.pointerEvents = '';
      }
      const allVids = document.querySelectorAll('.antigravity-slot-video, #antigravity-video-left');
      for (let i = 0; i < allVids.length; i++) {
        const v = allVids[i];
        if (v.paused) {
          syncVideoPlaybackState(v);
        }
      }
    };

    
    // 极致原生 60FPS/120FPS 性能：左侧会话切换导航协调器 (消除切会话卡顿与 GPU 解码竞争)
    let navThrottleTimer = null;
    let navMaxTimeoutTimer = null;
    window.__isNavigating = false;

    const pauseVideosForNav = function() {
      // Seamless playback: base video continues uninterrupted on navigation
    };

    const resumeVideosAfterNav = function() {
      window.__isNavigating = false;
      if (document.body && document.body.classList.contains('is-navigating')) {
        document.body.classList.remove('is-navigating');
      }
    };

    const onNavClick = function(e) {
      const target = e.target;
      if (!target) return;
      const navItem = target.closest ? target.closest('a[href*="/c/"], a.absolute.inset-0, [data-testid*="conversation"], [class*="conversation-row"]') : null;
      if (!navItem) return;
      /* pauseVideosForNav omitted for smooth 60fps */

      if (navThrottleTimer) clearTimeout(navThrottleTimer);
      navThrottleTimer = setTimeout(function() {
        navThrottleTimer = null;
        resumeVideosAfterNav();
      }, 160);

      if (navMaxTimeoutTimer) clearTimeout(navMaxTimeoutTimer);
      navMaxTimeoutTimer = setTimeout(function() {
        navMaxTimeoutTimer = null;
        resumeVideosAfterNav();
      }, 350);
    };

    const onNavKey = function(e) {
      if (e.key === 'Enter' && e.target && e.target.closest && e.target.closest('a[href*="/c/"], a.absolute.inset-0, [data-testid*="conversation"]')) {
        /* pauseVideosForNav omitted for smooth 60fps */
        if (navThrottleTimer) clearTimeout(navThrottleTimer);
        navThrottleTimer = setTimeout(function() {
          navThrottleTimer = null;
          resumeVideosAfterNav();
        }, 160);
      }
    };

    const onDragStart = function(e) {
      const target = e.target;
      if (!target) return;
      let isHandle = false;
      if (target.closest) {
        const handleEl = target.closest('.cursor-col-resize, .cursor-row-resize, [class*="cursor-col-resize"], [class*="cursor-row-resize"], [class*="sash"], [role="separator"]');
        if (handleEl) {
          isHandle = true;
        }
      }
      if (!isHandle && target.style && target.style.cursor && target.style.cursor.includes('resize')) {
        isHandle = true;
      }
      if (isHandle) {
        window.__isDraggingSplit = true;
        window.__dragStartTime = Date.now();
        pauseVideosForResize();
      }
    };

    const onDragEnd = function() {
      if (window.__isDraggingSplit) {
        window.__isDraggingSplit = false;
        resumeVideosAfterResize();
      }
    };

    const onPointerMove = function(e) {
      if (window.__isDraggingSplit && e && e.buttons === 0) {
        onDragEnd();
      }
    };

    const onWindowResize = function() {
      if (!window.__isResizing) {
        pauseVideosForResize();
      }
      if (resizeThrottleTimer) clearTimeout(resizeThrottleTimer);
      resizeThrottleTimer = setTimeout(function() {
        resizeThrottleTimer = null;
        if (window.__isDraggingSplit) return;
        resumeVideosAfterResize();
      }, 80);
    };

    try {
      if (window.__antigravityDragStartHandler) {
        window.removeEventListener('pointerdown', window.__antigravityDragStartHandler, true);
        window.removeEventListener('pointerup', window.__antigravityDragEndHandler, true);
        window.removeEventListener('pointercancel', window.__antigravityDragEndHandler, true);
        if (window.__antigravityPointerMoveHandler) {
          window.removeEventListener('pointermove', window.__antigravityPointerMoveHandler);
        }
        window.removeEventListener('blur', window.__antigravityDragEndHandler);
        window.removeEventListener('resize', window.__antigravityResizeHandler);
      }
      window.__antigravityDragStartHandler = onDragStart;
      window.__antigravityDragEndHandler = onDragEnd;
      window.__antigravityPointerMoveHandler = onPointerMove;
      window.__antigravityResizeHandler = onWindowResize;
      window.addEventListener('pointerdown', onDragStart, true);
      window.addEventListener('pointerup', onDragEnd, true);
      window.addEventListener('pointercancel', onDragEnd, true);
      window.addEventListener('pointermove', onPointerMove, { passive: true });
      window.addEventListener('blur', onDragEnd);
      window.addEventListener('resize', onWindowResize, { passive: true });

      if (window.__antigravityNavClickHandler) {
        window.removeEventListener('click', window.__antigravityNavClickHandler, true);
        window.removeEventListener('keydown', window.__antigravityNavKeyHandler, true);
      }
      window.__antigravityNavClickHandler = onNavClick;
      window.__antigravityNavKeyHandler = onNavKey;
      window.addEventListener('click', onNavClick, true);
      window.addEventListener('keydown', onNavKey, true);
    } catch(e) {}

    if (window.__antigravitySyncInterval) {
      clearInterval(window.__antigravitySyncInterval);
      window.__antigravitySyncInterval = null;
    }
    if (window.__antigravityPreloadInterval) {
      clearInterval(window.__antigravityPreloadInterval);
      window.__antigravityPreloadInterval = null;
    }
    if (window.__antigravityInterval) {
      clearInterval(window.__antigravityInterval);
      window.__antigravityInterval = null;
    }

    function updateCacheBuster(url, timestamp) {
      try {
        const u = new URL(url);
        u.searchParams.set('_t', timestamp);
        return u.toString();
      } catch(e) {
        const clean = url.replace(/([?&])_t=\d+/g, '').replace(/&&+/g, '&').replace(/[?&]+$/, '');
        const sep = clean.includes('?') ? '&' : '?';
        return clean + sep + '_t=' + timestamp;
      }
    }

    // 4-Tier Graduated Self-Healing Recovery: Double-buffered seamless swap (Tier 4)
    function performDoubleBufferRecovery(v, slot) {
      if (!v || !v.isConnected) return;
      const parent = v.parentElement;
      if (!parent) return;

      const baseSrc = v.dataset.currentSrc || v.src;
      if (!baseSrc) return;

      const newSrc = updateCacheBuster(baseSrc, Date.now());

      const stagingVid = document.createElement('video');
      stagingVid.className = v.className + ' antigravity-slot-video-staging';
      if (v.id) stagingVid.id = v.id + '-staging';
      stagingVid.setAttribute('data-slot', slot);
      stagingVid.muted = true;
      stagingVid.defaultMuted = true;
      stagingVid.setAttribute('muted', '');
      stagingVid.autoplay = true;
      stagingVid.loop = true;
      stagingVid.playsInline = true;
      stagingVid.setAttribute('playsinline', '');
      stagingVid.setAttribute('autoplay', '');
      stagingVid.setAttribute('loop', '');
      stagingVid.preload = 'auto';
      stagingVid.setAttribute('preload', 'auto');
      stagingVid.crossOrigin = 'anonymous';
      stagingVid.setAttribute('crossorigin', 'anonymous');
      stagingVid.disablePictureInPicture = true;
      stagingVid.setAttribute('disablepictureinpicture', '');
      stagingVid.disableRemotePlayback = true;
      stagingVid.setAttribute('disableremoteplayback', '');

      stagingVid.style.position = v.style.position || (slot === 'left' ? 'fixed' : 'absolute');
      stagingVid.style.top = v.style.top || '0';
      stagingVid.style.left = v.style.left || '0';
      stagingVid.style.width = v.style.width || (slot === 'left' ? '100vw' : '100%');
      stagingVid.style.height = v.style.height || (slot === 'left' ? '100vh' : '100%');
      stagingVid.style.objectFit = v.style.objectFit || 'cover';
      stagingVid.style.objectPosition = v.style.objectPosition || 'center center';
      stagingVid.style.pointerEvents = 'none';
      stagingVid.style.zIndex = v.style.zIndex || '0';
      stagingVid.style.transform = 'translateZ(0)';
      stagingVid.style.contain = 'strict';
      stagingVid.style.backfaceVisibility = 'hidden';
      stagingVid.style.opacity = '0';
      stagingVid.style.transition = 'opacity 0.25s ease';
      stagingVid.style.display = 'block';

      const poster = v.getAttribute('poster') || (v.dataset && v.dataset.poster) || '';
      if (poster) {
        stagingVid.poster = poster;
        stagingVid.setAttribute('poster', poster);
        stagingVid.style.backgroundImage = 'url("' + poster + '")';
        stagingVid.style.backgroundSize = 'cover';
        stagingVid.style.backgroundPosition = v.style.backgroundPosition || 'center center';
      }

      stagingVid.dataset.currentSrc = newSrc;
      stagingVid.src = newSrc;
      setupVideoLoopGuards(stagingVid);

      let swapped = false;
      const doSwap = function() {
        if (swapped) return;
        swapped = true;
        stagingVid.classList.remove('antigravity-slot-video-staging');
        const origId = v.id;
        if (origId) {
          v.id = origId + '-old';
          stagingVid.id = origId;
        }
        stagingVid.style.opacity = '1';
        stagingVid.play().catch(function(){});

        let cleaned = false;
        const cleanupOldVideo = function() {
          if (cleaned) return;
          cleaned = true;
          try {
            if (window.__antigravityVideoVisibilityObserver && slot !== 'left') {
              try { window.__antigravityVideoVisibilityObserver.unobserve(v); } catch(e) {}
            }
            if (v && v.parentNode) {
              v.pause();
              v.removeAttribute('src');
              v.load();
              v.remove();
            }
          } catch(e) {}
        };

        stagingVid.addEventListener('transitionend', cleanupOldVideo, { once: true });
        setTimeout(cleanupOldVideo, 300);
      };

      stagingVid.addEventListener('canplay', doSwap, { once: true });
      stagingVid.addEventListener('playing', doSwap, { once: true });

      if (v.nextSibling) {
        parent.insertBefore(stagingVid, v.nextSibling);
      } else {
        parent.appendChild(stagingVid);
      }
      if (window.__antigravityVideoVisibilityObserver && slot !== 'left') {
        try { window.__antigravityVideoVisibilityObserver.observe(stagingVid); } catch(e) {}
      }
      stagingVid.load();
      stagingVid.play().catch(function(){});

      setTimeout(function() {
        if (!swapped) {
          try {
            stagingVid.pause();
            stagingVid.removeAttribute('src');
            stagingVid.remove();
          } catch(e) {}
        }
      }, 4000);
    }

    // =========================================================================
    // 🐕 Dynamic Video Wallpaper Freeze Watchdog & Self-Healing Engine
    // =========================================================================
    (function initWatchdogEngine() {
      if (window.__antigravityWatchdogTimer) {
        clearTimeout(window.__antigravityWatchdogTimer);
        clearInterval(window.__antigravityWatchdogTimer);
        window.__antigravityWatchdogTimer = null;
      }

      const WATCHDOG_INTERVAL_ACTIVE = 1500;
      const WATCHDOG_INTERVAL_BG = 5000;
      let currentIntervalMs = WATCHDOG_INTERVAL_ACTIVE;

      const stats = {
        startedAt: Date.now(),
        tickCount: 0,
        recoveries: 0,
        lastRecoveryTime: null,
        history: []
      };

      function logRecovery(slot, action, reason) {
        stats.recoveries++;
        stats.lastRecoveryTime = Date.now();
        if (stats.history.length > 20) stats.history.shift();
        stats.history.push({ time: new Date().toISOString(), slot, action, reason });
      }

      function recoverElement(v, slot, reason) {
        if (!v) return;
        const now = Date.now();

        if (!v._recoveryTimestamps) v._recoveryTimestamps = [];
        v._recoveryTimestamps = v._recoveryTimestamps.filter(t => now - t <= 30000);
        v._recoveryTimestamps.push(now);

        // Circuit Breaker: graceful backoff without hiding or freezing video
        if (v._recoveryTimestamps.length > 8) {
          if (!v._circuitOpenUntil || now > v._circuitOpenUntil) {
            v._circuitOpenUntil = now + 10000; // 10s cooldown
            logRecovery(slot, 'circuit-breaker-cooldown', 'Backing off recoveries for 10s');
            v._recoveryTimestamps = [];
            v._watchdogRecoveryTier = 1;
            setTimeout(function() {
              if (v && v.isConnected && v.paused) v.play().catch(function(){});
            }, 1000);
          }
          return;
        }

        const tier = v._watchdogRecoveryTier || 1;
        if (tier === 1) {
          // Tier 1: Soft play retry
          v._watchdogRecoveryTier = 2;
          logRecovery(slot, 'tier1-soft-play', reason);
          if (v.currentTime >= v.duration - 0.2 || v.ended) {
            v.currentTime = 0;
          }
          v.play().catch(function(){});
        } else if (tier === 2) {
          // Tier 2: Micro-seek decoder nudge to restart stalled hardware decoders
          v._watchdogRecoveryTier = 3;
          logRecovery(slot, 'tier2-micro-seek', reason);
          try {
            const nextTime = Math.max(0, (v.currentTime + 0.001) % (v.duration || 10));
            v.currentTime = nextTime;
          } catch(e) {}
          v.play().catch(function(){});
        } else if (tier === 3) {
          // Tier 3: Soft seek nudge (retains existing buffer, prevents freeze)
          v._watchdogRecoveryTier = 4;
          logRecovery(slot, 'tier3-seek-nudge', reason);
          try {
            v.currentTime = Math.max(0, (v.currentTime + 0.005) % (v.duration || 10));
          } catch(e) {}
          v.play().catch(function(){});
        } else if (tier === 4) {
          // Tier 4: Double-buffered zero-flicker element replacement
          v._watchdogRecoveryTier = 1;
          logRecovery(slot, 'tier4-double-buffer-swap', reason);
          try {
            performDoubleBufferRecovery(v, slot);
          } catch(e) {
            v.play().catch(function(){});
          }
        }
      }

      function isCircuitTripped() {
        const allVids = document.querySelectorAll('.antigravity-slot-video, #antigravity-video-left');
        const now = Date.now();
        for (let i = 0; i < allVids.length; i++) {
          if (allVids[i]._circuitOpenUntil && now < allVids[i]._circuitOpenUntil) {
            return true;
          }
        }
        return false;
      }

      function evaluateVideo(v, slot) {
        if (!v || !v.isConnected) return;
        const now = Date.now();

        if (v._circuitOpenUntil) {
          if (now < v._circuitOpenUntil) {
            return;
          } else {
            v._circuitOpenUntil = null;
            v._recoveryTimestamps = [];
            v._watchdogRecoveryTier = 1;
            v.style.opacity = '1';
            if (v.parentElement && v.parentElement.style.backgroundImage) {
              v.parentElement.style.backgroundImage = '';
            }
            try { v.play().catch(function(){}); } catch(e) {}
          }
        }

        const isVisible = (v.id === 'antigravity-video-left') || isVideoVisible(v);

        // 1. Paused Anomaly Check (unpause even when window starts minimized/hidden)
        if (v.paused && isVisible) {
          recoverElement(v, slot, 'paused-while-visible');
          return;
        }

        // 2. Decoder Progress Stalling Check (video playing but currentTime not advancing)
        if (!v.paused && v.readyState >= 1) {
          // Loop boundary guard: ignore wrap-arounds near start/end and seeks
          if (v.currentTime < 0.6 || (v.duration && v.currentTime >= (v.duration - 0.6)) || v.seeking) {
            v._stallCycles = 0;
            v._lastWatchdogTime = v.currentTime;
            return;
          }
          if (typeof v._lastWatchdogTime === 'number') {
            const delta = Math.abs(v.currentTime - v._lastWatchdogTime);
            if (delta < 0.005) {
              v._stallCycles = (v._stallCycles || 0) + 1;
              if (v._stallCycles >= 3) {
                v._stallCycles = 0;
                recoverElement(v, slot, 'progress-stalled-delta-' + delta.toFixed(4));
                return;
              }
            } else {
              v._stallCycles = 0;
              v._watchdogRecoveryTier = 1;
              if (v._recoveryTimestamps && v._recoveryTimestamps.length > 0) {
                v._recoveryTimestamps = v._recoveryTimestamps.filter(t => now - t <= 5000);
              }
            }
          }
          v._lastWatchdogTime = v.currentTime;
        }

        // 3. Media Error State Check
        if (v.error) {
          recoverElement(v, slot, 'media-error-' + (v.error.code || 'unknown'));
          return;
        }

        // 4. Buffer Lock Deadlock Check
        if (v.readyState <= 1 && v.src && (now - (v._loadStartTime || now) > 4000)) {
          recoverElement(v, slot, 'buffer-deadlock-readyState-' + v.readyState);
        }
      }

      function checkDragResizeTimeout() {
        if (window.__isDraggingSplit || window.__isResizing) {
          const dragAge = Date.now() - (window.__dragStartTime || 0);
          if (dragAge > 3000) {
            window.__isDraggingSplit = false;
            window.__isResizing = false;
            if (document.body && document.body.classList.contains('is-resizing')) {
              document.body.classList.remove('is-resizing');
            }
            const iframes = document.querySelectorAll('iframe');
            for (let i = 0; i < iframes.length; i++) {
              iframes[i].style.pointerEvents = '';
            }
          }
        }
      }

      function runWatchdogCycle(force) {
        stats.tickCount++;
        const cfg = (window.__antigravityConfig && window.__antigravityConfig.isOriginal)
          ? window.__antigravityConfig
          : (window.__antigravityConfig || (typeof cachedConfig !== 'undefined' ? cachedConfig : null));
        if (cfg && cfg.isOriginal) return;

        checkDragResizeTimeout();
        if ((window.__isDraggingSplit || window.__isResizing) && !force) {
          return;
        }

        // Slot 1: left (Base wallpaper)
        const leftVid = document.getElementById('antigravity-video-left');
        if (leftVid) {
          evaluateVideo(leftVid, 'left');
        } else if (cfg && cfg.left && cfg.left.type === 'video' && cfg.left.file) {
          if (typeof applyVideos === 'function') applyVideos();
        }

        // Slot 2: bottom (Input box)
        const bottomVid = document.querySelector('.antigravity-slot-video[data-slot="bottom"]');
        if (bottomVid) {
          evaluateVideo(bottomVid, 'bottom');
        } else if (cfg && cfg.bottom && cfg.bottom.type === 'video' && cfg.bottom.file) {
          const bottomContainer = document.querySelector('[id="antigravity.agentSidePanelInputBox"] .surface-composer-card, .surface-composer-card');
          if (bottomContainer && typeof applyVideos === 'function') {
            applyVideos();
          }
        }

        // Slot 3: settings (Modal dialog)
        const settingsVid = document.querySelector('.antigravity-slot-video[data-slot="settings"]');
        if (settingsVid) {
          evaluateVideo(settingsVid, 'settings');
        }

        // Adaptive Cadence Adjustment
        const desiredInterval = (document.hidden && !document.hasFocus()) ? WATCHDOG_INTERVAL_BG : WATCHDOG_INTERVAL_ACTIVE;
        if (desiredInterval !== currentIntervalMs) {
          currentIntervalMs = desiredInterval;
          clearInterval(window.__antigravityWatchdogTimer);
          window.__antigravityWatchdogTimer = setInterval(runWatchdogCycle, currentIntervalMs);
        }
      }

      window.runWatchdogCycle = runWatchdogCycle;
      window.__antigravityWatchdogTimer = setInterval(runWatchdogCycle, WATCHDOG_INTERVAL_ACTIVE);
      try { runWatchdogCycle(true); } catch(e) {}
      window.__antigravityWatchdog = {
        version: '2.0.0',
        isRunning: true,
        getStats: function() {
          const activeVids = [];
          const leftV = document.getElementById('antigravity-video-left');
          if (leftV && leftV.isConnected) activeVids.push('left');
          const botV = document.querySelector('.antigravity-slot-video[data-slot="bottom"]');
          if (botV && botV.isConnected) activeVids.push('bottom');
          const setV = document.querySelector('.antigravity-slot-video[data-slot="settings"]');
          if (setV && setV.isConnected) activeVids.push('settings');

          return {
            activeVideos: activeVids,
            recoveries: stats.recoveries,
            lastRecoveryTime: stats.lastRecoveryTime,
            circuitBreakerTripped: isCircuitTripped(),
            tickCount: stats.tickCount,
            history: stats.history.slice(-10)
          };
        },
        forceRecover: function(slot) {
          if (slot) {
            const v = slot === 'left'
              ? document.getElementById('antigravity-video-left')
              : document.querySelector('.antigravity-slot-video[data-slot="' + slot + '"]');
            if (v) recoverElement(v, slot, 'force-recover-api');
          } else {
            runWatchdogCycle(true);
          }
        }
      };
    })();
  };

  let engineStarted = false;
  let earlyBodyChecker = null;
  const startEngine = function() {
    if (engineStarted) return;
    engineStarted = true;
    if (earlyBodyChecker) {
      clearInterval(earlyBodyChecker);
      earlyBodyChecker = null;
    }
    const lv = document.getElementById('antigravity-video-left');
    if (lv && !lv.isConnected) {
      if (document.body) {
        document.body.prepend(lv);
      } else if (document.documentElement) {
        document.documentElement.prepend(lv);
      }
    }
    initEngine();
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startEngine);
    earlyBodyChecker = setInterval(function() {
      if (document.body) {
        startEngine();
      }
    }, 20);
  } else {
    startEngine();
  }
})();

// =========================================================================
// 📺 Retro CRT Television Power-Off Screen Effect (Clean No-Op for Stock Performance)
// =========================================================================
window.__playCrtShutdown = function() {
  return Promise.resolve();
};
