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
  let cachedConfig = {"left":{"key":"left","file":"left_wallpaper.mp4","type":"video","version":1790842917156,"position":"center center","desc":"AI主对话界面 / 全局底图","poster":"left_poster.jpg"},"mid":{"key":"mid","file":"mid_wallpaper.jpg","type":"image","position":"center 20%","desc":"终端界面 (活跃终端壁纸)","version":1790842917156},"right":{"key":"right","file":"right_wallpaper.jpg","type":"image","position":"center 20%","desc":"最右侧界面 (独立终端/侧栏壁纸)","version":1790842917156},"bottom":{"key":"bottom","file":"input_wallpaper.mp4","type":"video","version":1790842917156,"position":"50% 36%","desc":"底部输入框","poster":"input_poster.jpg"},"settings":{"key":"settings","file":"settings_wallpaper.png","type":"image","position":"center 65%","desc":"设置界面","version":1790842917156},"fontColor":{"id":"pure-white","name":"纯白高对比 (Pure White)","primary":"#ffffff","secondary":"#f1f5f9","muted":"#94a3b8","terminal":"#ffffff","shadow":"0 1px 3px rgba(0, 0, 0, 0.95), 0 0 2px rgba(0, 0, 0, 0.95)","terminalShadow":"0 1px 3px rgba(0, 0, 0, 0.95), 0 0 2px rgba(0, 0, 0, 0.95)","isDarkText":false,"desc":"适合绝大多数暗色、炫彩或复杂壁纸，纯白字体配深色轮廓，极致清晰","aliases":["1","white","pure-white","纯白","白","高对比白"]},"isOriginal":false};
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

  // Tick 0 极速挂载底图壁纸 (0ms 显示高保真静态海报图并立即挂载至 documentElement，绝无开机黑屏与卡顿延迟)
  function mountTickZeroBase() {
    try {
      const cfg = (window.__antigravityConfig && window.__antigravityConfig.isOriginal) ? window.__antigravityConfig : (window.__antigravityConfig || cachedConfig);
      if (!cfg || cfg.isOriginal || !cfg.left || cfg.left.type !== 'video' || !cfg.left.file) return;
      const left = cfg.left;
      const vParam = (left && left.version) ? ('?v=' + left.version) : '';
      const src = SERVER_URL + '/' + encodeURIComponent(left.file) + vParam;
      const posterSrc = (left && left.poster) ? (getBase64DataUri(left.poster) || (SERVER_URL + '/' + encodeURIComponent(left.poster) + vParam)) : '';
      const posLeft = (left && left.position) || '0% 45%';

      const bottom = cfg.bottom;
      const bottomPosterSrc = (bottom && bottom.poster) ? (getBase64DataUri(bottom.poster) || (SERVER_URL + '/' + encodeURIComponent(bottom.poster) + vParam)) : '';
      const posBottom = (bottom && bottom.position) || '50% 36%';

      // 0ms 高保真底图静态海报瞬发样式，杜绝开机黑屏/空白
      let zeroLatencyStyle = document.getElementById('antigravity-zero-latency-style');
      if (!zeroLatencyStyle && (posterSrc || bottomPosterSrc)) {
        zeroLatencyStyle = document.createElement('style');
        zeroLatencyStyle.id = 'antigravity-zero-latency-style';
        const rules = [
          'html {',
          '  background-color: transparent !important;',
          '}',
          'html::before {',
          '  content: "" !important;',
          '  position: fixed !important;',
          '  top: 0 !important; left: 0 !important; right: 0 !important; bottom: 0 !important;',
          '  width: 100vw !important; height: 100vh !important;',
          posterSrc ? '  background-image: linear-gradient(rgba(11, 12, 20, 0.06), rgba(11, 12, 20, 0.10)), url("' + posterSrc + '") !important;' : '',
          '  background-size: cover !important;',
          '  background-position: ' + posLeft + ' !important;',
          '  background-repeat: no-repeat !important;',
          '  pointer-events: none !important;',
          '  z-index: 0 !important;',
          '}'
        ];
        if (bottomPosterSrc) {
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
          '#root, #app {',
          '  position: relative !important;',
          '  z-index: 1 !important;',
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
            if (!document.hidden) leftVid.play().catch(function(){});
          }
        };
        leftVid.addEventListener('error', function() {
          setTimeout(tryRecoverLeft, 1000);
        });

        // 挂载至 document.body (若 DOM 构建中则暂挂 documentElement.prepend，确保绝不遮挡主对话区)
        if (!leftVid.isConnected) {
          if (document.body) {
            document.body.prepend(leftVid);
          } else if (document.documentElement) {
            document.documentElement.prepend(leftVid);
          }
          if (!document.hidden) leftVid.play().catch(function(){});
        }
        if (document.body && leftVid.parentElement !== document.body) {
          document.body.prepend(leftVid);
        }
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
          '/* 6.3 顶部标题栏操作与控制按钮点击保证 (Titlebar Buttons Responsiveness) */',
          'header button,',
          'header [role="button"],',
          'header a,',
          '[class*="titlebar"] button,',
          '[class*="titlebar"] [role="button"],',
          '[class*="titlebar"] a,',
          'div.absolute.top-0 button,',
          'div.absolute.top-0 [role="button"],',
          '.titlebar-button {',
          '  -webkit-app-region: no-drag !important;',
          '  pointer-events: auto !important;',
          '  cursor: pointer !important;',
          '}',
          '/* 6.1 顶部标题栏与窗口原生控制按钮防碰撞防御 (Windows Electron Native Window Controls Collision Prevention) */',
          'div.absolute.top-0.right-0.z-50.flex.items-center.shrink-0,',
          'div.absolute.top-0:has(> div > [data-testid="toggle-aux-sidebar"]),',
          'div.absolute.top-0:has(> [data-testid="toggle-aux-sidebar"]),',
          'div:has(> div > [data-testid="toggle-aux-sidebar"]):not([class*="group"]):not([class*="pane"]) {',
          '  right: max(138px, calc(100vw - env(titlebar-area-width, calc(100vw - 138px)))) !important;',
          '}',
          '/* 辅助面板展开时顶栏标签页与加号按钮右侧内边距，确保不被最大化/侧边栏切换按钮遮挡 (64px按钮组 + 8px自然间距 = 72px) */',
          'div[data-aux-pane-open="true"] div.shrink-0.flex.items-center.border-b:has([data-testid="aux-panel-plus-dropdown-trigger"]),',
          '[aria-label="Auxiliary Pane"] div.shrink-0.flex.items-center.border-b:has([data-testid="aux-panel-plus-dropdown-trigger"]),',
          'div[data-aux-pane-open="true"] div.shrink-0.flex.items-center.border-b:has(button[aria-label*="tab" i]),',
          '[aria-label="Auxiliary Pane"] div.shrink-0.flex.items-center.border-b:has(button[aria-label*="tab" i]) {',
          '  padding-right: calc(max(138px, calc(100vw - env(titlebar-area-width, calc(100vw - 138px)))) + 72px) !important;',
          '}',
          '/* 当辅助面板收起时，主对话顶栏更多操作容器紧邻侧边栏切换按钮，严格限定于父级容器，杜绝子元素重复嵌套叠加 padding (32px单按钮 + 10px自然间距 = 42px) */',
          'div.h-screen.w-screen:not(:has(div[data-aux-pane-open="true"])) div.flex.items-center.justify-end.shrink-0:has([data-testid="titlebar-more-actions"]) {',
          '  padding-right: calc(max(138px, calc(100vw - env(titlebar-area-width, calc(100vw - 138px)))) + 42px) !important;',
          '}',
          'div.h-screen.w-screen:not(:has(div[data-aux-pane-open="true"])) div.flex.items-center.justify-end.shrink-0:has([data-testid="titlebar-more-actions"]) > div {',
          '  padding-right: 0px !important;',
          '}',
          '/* 6.2 顶部原生菜单栏与下拉菜单层级保障 (Menubar Stacking Context & Dropdown Quality) */',
          'div.h-screen.w-screen > div.shrink-0:has(div.flex.items-center.gap-1.bg-sidebar),',
          'div.h-screen.w-screen > div.shrink-0:has(button) {',
          '  position: relative !important;',
          '  z-index: 9000 !important;',
          '}',
          'div.absolute.top-full:has(button),',
          'div.absolute.top-full.border.shadow-lg {',
          '  background: rgba(22, 24, 34, 0.96) !important;',
          '  border: 1px solid rgba(255, 255, 255, 0.12) !important;',
          '  border-radius: 8px !important;',
          '  box-shadow: 0 8px 24px -4px rgba(0, 0, 0, 0.5) !important;',
          '  z-index: 10000 !important;',
          '  overflow: hidden !important;',
          '}',
          'div.absolute.top-full:has(button) button {',
          '  padding: 6px 12px !important;',
          '  color: #f1f5f9 !important;',
          '  font-weight: 500 !important;',
          '  transition: all 0.15s ease !important;',
          '}',
          'div.absolute.top-full:has(button) button:hover {',
          '  background: rgba(255, 255, 255, 0.12) !important;',
          '  color: #ffffff !important;',
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
        const res = await fetch(SERVER_URL + '/custom_theme.css', { cache: 'default' });
        if (res.ok) {
          const text = await res.text();
          if (text && text !== style.textContent) {
            style.textContent = text;
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
    if (document.hidden) return false;
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
    if (isVideoVisible(v)) {
      if (v.paused && v.readyState >= 1) {
        v.play().catch(function() {});
      }
      checkAndShowVideo(v);
    } else {
      if (!v.paused) {
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
          if (v.paused && v.readyState >= 1) {
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

  if (!window.__antigravityDocVisibilityListener) {
    window.__antigravityDocVisibilityListener = true;
    document.addEventListener('visibilitychange', function() {
      const allVids = document.querySelectorAll('.antigravity-slot-video');
      if (document.hidden) {
        for (let i = 0; i < allVids.length; i++) {
          if (!allVids[i].paused) allVids[i].pause();
        }
      } else {
        for (let i = 0; i < allVids.length; i++) {
          syncVideoPlaybackState(allVids[i]);
        }
      }
    });
  }

  // 3. 动态视频槽位自动化挂载与播放引擎 (硬件加速合成层隔离与快速通道)
  function applyVideos() {
    if (document.body) {
      const zeroStyle = document.getElementById('antigravity-zero-latency-style');
      if (zeroStyle) {
        try { zeroStyle.remove(); } catch(e) {}
      }
    }
    const config = (window.__antigravityConfig && window.__antigravityConfig.isOriginal) ? window.__antigravityConfig : (window.__antigravityConfig || cachedConfig);
    if (!config) return;
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
          leftVid.style.backgroundPosition = (config.left && config.left.position) || '0% 45%';
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
        if (document.body && leftVid.parentElement !== document.body) {
          document.body.prepend(leftVid);
        }
        if (document.body && document.body.firstElementChild !== leftVid && document.body.contains(leftVid)) {
          document.body.prepend(leftVid);
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
            if (!document.hidden) leftVid.play().catch(function(){});
          }
        }
        if (!document.hidden && leftVid.paused && leftVid.readyState >= 1) {
          leftVid.play().catch(function(){});
        }
        checkAndShowVideo(leftVid);
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
          leftVid.setAttribute('disablepictureinpicture', '');
          leftVid.disableRemotePlayback = true;
          leftVid.setAttribute('disableremoteplayback', '');
          leftVid.style.position = 'fixed';
          leftVid.style.top = '0';
          leftVid.style.left = '0';
          leftVid.style.width = '100vw';
          leftVid.style.height = '100vh';
          leftVid.style.objectFit = 'cover';
          leftVid.style.objectPosition = (config.left && config.left.position) || '0% 45%';
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
            leftVid.style.backgroundPosition = (config.left && config.left.position) || '0% 45%';
          }
          leftVid.addEventListener('playing', function() {
            checkAndShowVideo(leftVid);
          });
          leftVid.addEventListener('canplay', function() {
            if (!document.hidden && leftVid.paused) leftVid.play().catch(function(){});
          });
          leftVid.addEventListener('error', function() {
            const now = Date.now();
            leftVid._lastErrorRetry = leftVid._lastErrorRetry || 0;
            leftVid._errorRetryCount = leftVid._errorRetryCount || 0;
            if (leftVid._errorRetryCount < 3 && (now - leftVid._lastErrorRetry > 2000)) {
              leftVid._lastErrorRetry = now;
              leftVid._errorRetryCount++;
              setTimeout(function() {
                if (leftVid.error) {
                  leftVid.load();
                  if (!document.hidden) leftVid.play().catch(function(){});
                }
              }, 1000);
            }
          });
          if (!leftVid.isConnected) {
            if (document.body) {
              document.body.prepend(leftVid);
            } else if (document.documentElement) {
              document.documentElement.prepend(leftVid);
            }
          }
        }
        if (!leftVid.isConnected) {
          if (document.body) {
            document.body.prepend(leftVid);
          } else if (document.documentElement) {
            document.documentElement.prepend(leftVid);
          }
        }
        if (document.body && leftVid.parentElement !== document.body) {
          document.body.prepend(leftVid);
        }
        if (document.body && document.body.firstElementChild !== leftVid && document.body.contains(leftVid)) {
          document.body.prepend(leftVid);
        }
        if (posterSrc && leftVid.getAttribute('poster') !== posterSrc) {
          leftVid.poster = posterSrc;
          leftVid.setAttribute('poster', posterSrc);
          leftVid.style.backgroundImage = 'url("' + posterSrc + '")';
          leftVid.style.backgroundSize = 'cover';
          leftVid.style.backgroundPosition = (config.left && config.left.position) || '0% 45%';
        }
        if (leftVid.dataset.currentSrc !== src) {
          leftVid.dataset.currentSrc = src;
          leftVid.src = src;
          leftVid.load();
          if (!document.hidden) leftVid.play().catch(function(){});
        }
        leftVid.style.objectPosition = (config.left && config.left.position) || '0% 45%';
        if (!document.hidden && leftVid.paused && leftVid.readyState >= 1) {
          leftVid.play().catch(function(){});
        }
        checkAndShowVideo(leftVid);
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

    // [中/右/下/设置] 容器槽位
    const slotSelectors = {
      'mid': [
        '.terminal.xterm',
        'div.terminal-wrapper',
        '[data-panel="terminal"]'
      ],
      'right': [
        '[aria-label="Auxiliary Pane"] div.flex.flex-col.gap-2.overflow-y-auto.h-full.w-full',
        'div[role="region"][aria-label="Terminal"] div.flex.flex-col.gap-2.overflow-y-auto.h-full.w-full',
        'div.flex.flex-col.gap-2.overflow-y-auto.h-full.w-full.bg-background',
        '[class*="terminal-drawer"]'
      ],
      'bottom': [
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
      left: (config.left && config.left.position) || (config.positions && config.positions.left) || '0% 45%',
      mid: (config.mid && config.mid.position) || (config.positions && config.positions.mid) || 'center center',
      right: (config.right && config.right.position) || (config.positions && config.positions.right) || 'center center',
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
      } else {
        // 1. Locate current valid targetContainer
        let targetContainer = null;
        for (let i = 0; i < selectors.length; i++) {
          try {
            const el = document.querySelector(selectors[i]);
            if (el && el !== document.body && el !== document.documentElement) {
              if (slotKey === 'mid') {
                // 严格限定只挂载在终端（.terminal.xterm），绝不挂载到会话抽屉
                if (!el.classList.contains('terminal') && !el.classList.contains('xterm') && !el.querySelector('.terminal, .xterm')) {
                  continue;
                }
                if (el.closest('[class*="terminal-drawer"]') || 
                    (el.classList.contains('overflow-y-auto') && el.classList.contains('bg-background')) ||
                    el.closest('div.flex.flex-col.gap-2.overflow-y-auto.h-full.w-full.bg-background')) {
                  continue;
                }
              }
              if (slotKey === 'right') {
                // 严格判定排除终端容器
                if (el.classList.contains('terminal') || el.classList.contains('xterm') || el.querySelector('.terminal, .xterm')) {
                  continue;
                }
                // 要求抽屉已展开可见，避免在抽屉收起时无效挂载
                if (el.style.display === 'none' || el.style.visibility === 'hidden' || el.hasAttribute('hidden') || (el.closest && el.closest('[data-aux-pane-open="false"], [data-state="closed"]'))) {
                  continue;
                }
                if (el.querySelector('[id="antigravity.agentSidePanelInputBox"]') || el.querySelector('#antigravity\\.agentSidePanelInputBox')) {
                  continue;
                }
                // 防右壁纸污染：整个辅助大容器（Overview总览/时间线/工件预览/代码审查等）必须完全透明，绝不可被右壁纸覆盖！
                if (el.getAttribute('aria-label') === 'Auxiliary Pane' || 
                    el.getAttribute('aria-label') === 'Overview' ||
                    el.getAttribute('aria-label') === 'Review' ||
                    el.closest('[aria-label="Overview"]') ||
                    el.closest('[aria-label="Review"]') ||
                    el.querySelector('[aria-label="Overview"]') ||
                    el.querySelector('[aria-label="Review"]')) {
                  continue;
                }
              }
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
            continue;
          }

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
            vid.style.display = 'block';
            if (posterSrc) {
              vid.poster = posterSrc;
              vid.setAttribute('poster', posterSrc);
              vid.style.backgroundImage = 'url("' + posterSrc + '")';
              vid.style.backgroundSize = 'cover';
              vid.style.backgroundPosition = slotPositions[slotKey] || 'center center';
            }
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
            targetContainer.prepend(vid);
          }
          if (posterSrc && vid.getAttribute('poster') !== posterSrc) {
            vid.poster = posterSrc;
            vid.setAttribute('poster', posterSrc);
            vid.style.backgroundImage = 'url("' + posterSrc + '")';
            vid.style.backgroundSize = 'cover';
            vid.style.backgroundPosition = slotPositions[slotKey] || 'center center';
          }
          if (vid.dataset.currentSrc !== src) {
            vid.dataset.currentSrc = src;
            vid.src = src;
            vid.load();
            if (isVideoVisible(vid)) vid.play().catch(function(){});
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
        if (cachedConfig.isOriginal) {
          applyVideos();
        } else {
          applyTheme(true);
          applyVideos();
        }
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

    let debounceTimer = null;
    const scheduledApply = function(mutations) {
      let isHighPriority = false;
      if (mutations && mutations.length > 0) {
        let isRelevant = false;
        for (let i = 0; i < mutations.length; i++) {
          const m = mutations[i];
          const target = m.target;
          if (!target || target.nodeType === 3) continue;
          if (target.closest && target.closest('.markdown, [data-testid*="message"], [data-role="assistant"], pre, code, .prose, .monaco-editor, .xterm, [class*="message"]')) {
            continue;
          }
          if (m.type === 'attributes') {
            const attr = m.attributeName;
            if (attr === 'data-aux-pane-open' || attr === 'data-state' || attr === 'aria-expanded' || attr === 'hidden') {
              isRelevant = true;
              break;
            }
          } else if (m.type === 'childList') {
            for (let j = 0; j < m.addedNodes.length; j++) {
              const node = m.addedNodes[j];
              if (node.nodeType === 1) {
                const role = node.getAttribute ? node.getAttribute('role') : null;
                const ds = node.getAttribute ? node.getAttribute('data-state') : null;
                if (node.id === 'antigravity.agentSidePanelInputBox' || 
                    (node.id && node.id.includes('agentSidePanelInputBox')) ||
                    (node.classList && (node.classList.contains('bg-card') || node.classList.contains('bg-card-border')))) {
                  isRelevant = true;
                  isHighPriority = true;
                  break;
                }
                if (role === 'dialog' || ds === 'open' || 
                  (node.classList && (node.classList.contains('terminal') || node.classList.contains('xterm') ||
                   node.classList.contains('overflow-y-auto') || node.classList.contains('bg-background')))) {
                  isRelevant = true;
                  break;
                }
              }
            }
            if (isRelevant) break;
            for (let j = 0; j < m.removedNodes.length; j++) {
              const node = m.removedNodes[j];
              if (node.nodeType === 1) {
                if (node.id === 'antigravity-video-left' || (node.classList && (node.classList.contains('antigravity-slot-video') || node.classList.contains('terminal') || node.classList.contains('xterm') || node.classList.contains('overflow-y-auto') || node.classList.contains('bg-card'))) || (node.getAttribute && node.getAttribute('role') === 'dialog')) {
                  isRelevant = true;
                  break;
                }
              }
            }
            if (isRelevant) break;
          }
        }
        if (!isRelevant) return;
      }

      if (window.__antigravityConfig && window.__antigravityConfig.isOriginal) {
        return;
      }
      if (window.__isDraggingSplit || (document.body && document.body.classList.contains('is-resizing'))) {
        return;
      }

      if (isHighPriority) {
        if (debounceTimer) {
          clearTimeout(debounceTimer);
          debounceTimer = null;
        }
        applyVideos();
        return;
      }

      if (debounceTimer) return;
      debounceTimer = setTimeout(function() {
        debounceTimer = null;
        applyVideos();
      }, 50);
    };

    window.__antigravityVideoObserver = new MutationObserver(scheduledApply);
    window.__antigravityVideoObserver.observe(document.body || document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['data-aux-pane-open', 'data-state', 'aria-expanded', 'hidden']
    });

    // 拖拽与窗口缩放 60FPS 性能优化：监听分栏拖拽与窗口尺寸变动
    let resizeThrottleTimer = null;
    const onDragStart = function(e) {
      const target = e.target;
      if (!target) return;
      let isHandle = false;
      if (target.classList && (target.classList.contains('cursor-col-resize') || target.classList.contains('cursor-row-resize'))) {
        isHandle = true;
      } else if (target.style && target.style.cursor && target.style.cursor.includes('resize')) {
        isHandle = true;
      }
      if (isHandle) {
        window.__isDraggingSplit = true;
        if (document.body) document.body.classList.add('is-resizing');
      }
    };
    const onDragEnd = function() {
      if (window.__isDraggingSplit) {
        window.__isDraggingSplit = false;
        if (document.body) document.body.classList.remove('is-resizing');
        applyVideos();
      }
    };
    const onWindowResize = function() {
      if (document.body) document.body.classList.add('is-resizing');
      if (resizeThrottleTimer) clearTimeout(resizeThrottleTimer);
      resizeThrottleTimer = setTimeout(function() {
        resizeThrottleTimer = null;
        if (document.body) document.body.classList.remove('is-resizing');
        applyVideos();
      }, 150);
    };

    try {
      if (window.__antigravityDragStartHandler) {
        window.removeEventListener('pointerdown', window.__antigravityDragStartHandler, true);
        window.removeEventListener('pointerup', window.__antigravityDragEndHandler, true);
        window.removeEventListener('pointercancel', window.__antigravityDragEndHandler, true);
        window.removeEventListener('resize', window.__antigravityResizeHandler);
      }
      window.__antigravityDragStartHandler = onDragStart;
      window.__antigravityDragEndHandler = onDragEnd;
      window.__antigravityResizeHandler = onWindowResize;
      window.addEventListener('pointerdown', onDragStart, true);
      window.addEventListener('pointerup', onDragEnd, true);
      window.addEventListener('pointercancel', onDragEnd, true);
      window.addEventListener('resize', onWindowResize);
    } catch(e) {}

    // 定期与流媒体配置对齐同步 (从 2 秒降至 10 秒，仅对比 1KB JSON，零冗余开销)
    if (window.__antigravitySyncInterval) {
      clearInterval(window.__antigravitySyncInterval);
    }
    if (window.__antigravityPreloadInterval) {
      clearInterval(window.__antigravityPreloadInterval);
    }
    if (window.__antigravityInterval) {
      clearInterval(window.__antigravityInterval);
    }
    window.__antigravitySyncInterval = setInterval(syncAndApply, 10000);
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
    if (lv && document.body && lv.parentElement !== document.body) {
      document.body.prepend(lv);
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
