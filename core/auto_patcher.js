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

// 1. 确保 app.asar 已经解包到 app 目录
console.log('[1/5] 正在解包 app.asar 核心文件...');
if (fs.existsSync(appDir)) {
  try {
    fs.rmSync(appDir, { recursive: true, force: true });
  } catch (e) {}
}
execSync(`npx --yes asar extract "${asarPath}" "${appDir}"`, { stdio: 'inherit' });

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
    if (!_cl.hasSwitch('enable-zero-copy')) _cl.appendSwitch('enable-zero-copy');
    if (!_cl.hasSwitch('ignore-gpu-blocklist')) _cl.appendSwitch('ignore-gpu-blocklist');
    if (!_cl.hasSwitch('enable-hardware-overlays')) _cl.appendSwitch('enable-hardware-overlays', 'single-fullscreen,single-on-top,underlay');
  }
} catch(e) {}
// ====================================================================================
`;

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

const themeInjectionCode = `
// ================= Antigravity Master Theme & Dynamic Video Auto-Loader =================
(function() {
  const SERVER_URL = 'http://127.0.0.1:8315';
  let cachedConfig = null;
  let lastAppliedConfigHash = '';
  let isFetching = false;

  // 1. 样式表热注入与双重挂载机制 (<link> 极速挂载 + <style> 容灾同步，避免重复全量拉取 5MB 样式)
  async function applyTheme(force) {
    try {
      let link = document.getElementById('antigravity-custom-theme-link');
      if (!link) {
        link = document.createElement('link');
        link.id = 'antigravity-custom-theme-link';
        link.rel = 'stylesheet';
        link.href = SERVER_URL + '/custom_theme.css';
        (document.head || document.documentElement).appendChild(link);
      }
      let style = document.getElementById('antigravity-custom-theme');
      if (!style) {
        style = document.createElement('style');
        style.id = 'antigravity-custom-theme';
        (document.head || document.documentElement).appendChild(style);
      }
      if (force || !style.textContent) {
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
    if (!v || v.error) {
      if (v) v.style.display = 'none';
      return;
    }
    const decoded = (typeof v.webkitDecodedFrameCount === 'number') ? v.webkitDecodedFrameCount : 0;
    const hasTimeProgress = v.currentTime > 0.05;
    const isReadyToPaint = v.readyState >= 2 && !v.paused && (decoded > 0 || hasTimeProgress);
    if (isReadyToPaint && v.style.display !== 'block') {
      v.style.display = 'block';
    }
  }

  // 3. 动态视频槽位自动化挂载与播放引擎 (硬件加速合成层隔离与快速通道)
  function applyVideos() {
    const config = cachedConfig;
    if (!config) return;

    // [左] 全局底图
    const left = config.left;
    if (left && left.type === 'video' && left.file) {
      const vParam = (left && left.version) ? ('?v=' + left.version) : '';
      const src = SERVER_URL + '/' + encodeURIComponent(left.file) + vParam;
      const posterSrc = (left && left.poster) ? (SERVER_URL + '/' + encodeURIComponent(left.poster) + vParam) : '';
      let leftVid = document.getElementById('antigravity-video-left');
      if (leftVid && leftVid.isConnected && leftVid.dataset.currentSrc === src) {
        if (leftVid.paused && leftVid.readyState >= 1) {
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
          leftVid.style.transform = 'translate3d(0, 0, 0)';
          leftVid.style.contain = 'strict';
          leftVid.style.willChange = 'transform';
          leftVid.style.display = 'none';
          if (posterSrc) {
            leftVid.poster = posterSrc;
            leftVid.setAttribute('poster', posterSrc);
          }
          leftVid.addEventListener('playing', function() {
            setTimeout(function() { checkAndShowVideo(leftVid); }, 50);
          });
          leftVid.addEventListener('timeupdate', function() {
            checkAndShowVideo(leftVid);
          });
          leftVid.addEventListener('canplay', function() {
            if (leftVid.paused) leftVid.play().catch(function(){});
          });
          leftVid.addEventListener('error', function() {
            leftVid.style.display = 'none';
          });
          leftVid.addEventListener('stalled', function() {
            if ((leftVid.webkitDecodedFrameCount || 0) === 0 && (leftVid.currentTime || 0) === 0) {
              leftVid.style.display = 'none';
            }
          });
          leftVid.addEventListener('waiting', function() {
            if ((leftVid.webkitDecodedFrameCount || 0) === 0 && (leftVid.currentTime || 0) === 0) {
              leftVid.style.display = 'none';
            }
          });
          (document.body || document.documentElement).prepend(leftVid);
        }
        if (posterSrc && leftVid.getAttribute('poster') !== posterSrc) {
          leftVid.poster = posterSrc;
          leftVid.setAttribute('poster', posterSrc);
        }
        if (leftVid.dataset.currentSrc !== src) {
          leftVid.dataset.currentSrc = src;
          leftVid.style.display = 'none';
          leftVid.src = src;
          leftVid.load();
          leftVid.play().catch(function(){});
          const token = Date.now();
          leftVid.dataset.loadToken = String(token);
          setTimeout(function() {
            if (leftVid.dataset.loadToken === String(token)) {
              checkAndShowVideo(leftVid);
            }
          }, 1500);
        }
        if (leftVid.paused && leftVid.readyState >= 1) {
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
        'div[data-aux-pane-open="true"] .terminal.xterm',
        'div[data-aux-pane-open="true"] div.terminal-wrapper',
        'div[data-aux-pane-open="true"] [data-panel="terminal"]',
        '[class*="terminal-drawer"]',
        'div[data-aux-pane-open="true"] div.flex.flex-col.gap-2.overflow-y-auto.h-full.w-full.bg-background'
      ],
      'bottom': [
        '[id="antigravity.agentSidePanelInputBox"] > div.bg-card:not([role="listbox"]):not([data-mention-menu]):not([class*="bottom-full"])',
        '[id="antigravity.agentSidePanelInputBox"] > div[class*="bg-card"]:not([role="listbox"]):not([data-mention-menu]):not([class*="bottom-full"])',
        'div.rounded-2xl.bg-card-border > div.bg-card:not([role="listbox"]):not([data-mention-menu]):not([class*="bottom-full"])'
      ],
      'settings': [
        '[role="dialog"]',
        'div[data-state="open"]:has(div.bg-sidebar)',
        'div.settings-modal-container'
      ]
    };

    for (const slotKey in slotSelectors) {
      const slotData = config[slotKey];
      const isVideo = slotData && slotData.type === 'video' && slotData.file;
      const vParam = (slotData && slotData.version) ? ('?v=' + slotData.version) : '';
      const src = isVideo ? (SERVER_URL + '/' + encodeURIComponent(slotData.file) + vParam) : null;
      const posterSrc = (isVideo && slotData.poster) ? (SERVER_URL + '/' + encodeURIComponent(slotData.poster) + vParam) : '';
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
              if (slotKey === 'right') {
                if (el.querySelector('[id="antigravity.agentSidePanelInputBox"]') || el.querySelector('#antigravity\\\\.agentSidePanelInputBox')) {
                  continue;
                }
                // 防右壁纸污染：整个辅助大容器（Overview总览/时间线/工件预览/代码审查等）必须完全透明，绝不可被右壁纸覆盖！
                const isTerm = el.classList.contains('xterm') || el.classList.contains('terminal') || !!el.querySelector('.terminal, .xterm, [data-panel="terminal"]');
                if (!isTerm) {
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
              }
              targetContainer = el;
              break;
            }
          } catch(e) {}
        }

        // 2. Clean up any video instances that are NOT inside the active targetContainer
        const existingVids = document.querySelectorAll('.antigravity-slot-video[data-slot="' + slotKey + '"]');
        for (let i = 0; i < existingVids.length; i++) {
          if (!targetContainer || existingVids[i].parentElement !== targetContainer) {
            existingVids[i].pause();
            existingVids[i].removeAttribute('src');
            existingVids[i].load();
            existingVids[i].remove();
          }
        }

        // 3. If targetContainer exists, manage the single slot video
        if (targetContainer) {
          const allSlotVidsInContainer = targetContainer.querySelectorAll(':scope > .antigravity-slot-video[data-slot="' + slotKey + '"]');
          for (let i = 1; i < allSlotVidsInContainer.length; i++) {
            allSlotVidsInContainer[i].pause();
            allSlotVidsInContainer[i].removeAttribute('src');
            allSlotVidsInContainer[i].load();
            allSlotVidsInContainer[i].remove();
          }
          let vid = allSlotVidsInContainer[0];

          // Fast-path: already mounted in targetContainer with expected source
          if (vid && vid.dataset.currentSrc === src) {
            if (vid.paused && vid.readyState >= 1) {
              vid.play().catch(function(){});
            }
            checkAndShowVideo(vid);
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
            vid.style.transform = 'translate3d(0, 0, 0)';
            vid.style.contain = 'strict';
            vid.style.willChange = 'transform';
            vid.style.display = 'none';
            if (posterSrc) {
              vid.poster = posterSrc;
              vid.setAttribute('poster', posterSrc);
            }
            vid.addEventListener('playing', function() {
              setTimeout(function() { checkAndShowVideo(vid); }, 50);
            });
            vid.addEventListener('timeupdate', function() {
              checkAndShowVideo(vid);
            });
            vid.addEventListener('canplay', function() {
              if (vid.paused) vid.play().catch(function(){});
            });
            vid.addEventListener('error', function() {
              vid.style.display = 'none';
            });
            vid.addEventListener('stalled', function() {
              if ((vid.webkitDecodedFrameCount || 0) === 0 && (vid.currentTime || 0) === 0) {
                vid.style.display = 'none';
              }
            });
            vid.addEventListener('waiting', function() {
              if ((vid.webkitDecodedFrameCount || 0) === 0 && (vid.currentTime || 0) === 0) {
                vid.style.display = 'none';
              }
            });
            if (!targetContainer.dataset.agPositioned) {
              targetContainer.dataset.agPositioned = 'true';
              if (!targetContainer.style.position || targetContainer.style.position === 'static') {
                targetContainer.style.position = 'relative';
              }
            }
            targetContainer.prepend(vid);
          }
          if (posterSrc && vid.getAttribute('poster') !== posterSrc) {
            vid.poster = posterSrc;
            vid.setAttribute('poster', posterSrc);
          }
          if (vid.dataset.currentSrc !== src) {
            vid.dataset.currentSrc = src;
            vid.style.display = 'none';
            vid.src = src;
            vid.load();
            vid.play().catch(function(){});
            const token = Date.now();
            vid.dataset.loadToken = String(token);
            setTimeout(function() {
              if (vid.dataset.loadToken === String(token)) {
                checkAndShowVideo(vid);
              }
            }, 1500);
          }
          if (vid.paused && vid.readyState >= 1) {
            vid.play().catch(function(){});
          }
          checkAndShowVideo(vid);
        }
      }
    }
  }

  // 4. 定时轮询与 DOM 监听自适应驱动 (智能去抖与低开销轮询)
  async function syncAndApply() {
    const cfg = await fetchConfig();
    if (cfg) {
      const cfgHash = JSON.stringify(cfg);
      if (cfgHash !== lastAppliedConfigHash) {
        lastAppliedConfigHash = cfgHash;
        await applyTheme(true);
      }
    }
    applyVideos();
  }

  const initEngine = () => {
    applyTheme();
    syncAndApply();
    if (!window.__antigravityVideoObserver) {
      let debounceTimer = null;
      const scheduledApply = function(mutations) {
        if (mutations && mutations.length > 0) {
          let isRelevant = false;
          for (let i = 0; i < mutations.length; i++) {
            const m = mutations[i];
            if (m.type === 'attributes') {
              isRelevant = true;
              break;
            } else if (m.type === 'childList') {
              for (let j = 0; j < m.addedNodes.length; j++) {
                const node = m.addedNodes[j];
                if (node.nodeType === 1) {
                  const role = node.getAttribute ? node.getAttribute('role') : null;
                  const ds = node.getAttribute ? node.getAttribute('data-state') : null;
                  if (role === 'dialog' || ds === 'open' || node.id === 'antigravity.agentSidePanelInputBox' || (node.classList && (node.classList.contains('terminal') || node.classList.contains('xterm')))) {
                    isRelevant = true;
                    break;
                  }
                }
              }
              if (isRelevant) break;
              for (let j = 0; j < m.removedNodes.length; j++) {
                const node = m.removedNodes[j];
                if (node.nodeType === 1) {
                  if (node.id === 'antigravity-video-left' || (node.classList && node.classList.contains('antigravity-slot-video')) || (node.getAttribute && node.getAttribute('role') === 'dialog')) {
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

        if (debounceTimer) return;
        debounceTimer = setTimeout(function() {
          debounceTimer = null;
          applyVideos();
        }, 100);
      };

      window.__antigravityVideoObserver = new MutationObserver(scheduledApply);
      window.__antigravityVideoObserver.observe(document.body || document.documentElement, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['data-aux-pane-open', 'data-state', 'aria-expanded', 'hidden']
      });

      // 定期与流媒体配置对齐同步 (从 2 秒降至 8 秒，仅对比 1KB JSON，零冗余开销)
      setInterval(syncAndApply, 8000);
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initEngine);
  } else {
    initEngine();
  }
})();
// =========================================================================
`;

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

// 6. 打包生成 app.asar.patched
console.log('[5/5] 正在重新打包并生成 app.asar.patched 补丁镜像...');
execSync(`npx --yes asar pack "${appDir}" "${patchedAsarPath}"`, { stdio: 'inherit' });
console.log('✓ app.asar.patched 打包生成完毕！');

try {
  fs.copyFileSync(patchedAsarPath, asarPath);
  console.log('✓ app.asar 已直接更新并固化完成！');
} catch (e) {
  console.log('提示: app.asar 当前被占用，稍后可运行 patch_core 固化生效');
}

console.log('');
console.log('=======================================================');
console.log('✨ 核心注入镜像打包完成！接下来运行 patch_core 即可固化生效。');
console.log('=======================================================');
