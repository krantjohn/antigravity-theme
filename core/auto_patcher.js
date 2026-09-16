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
    if (!_cl.hasSwitch('ignore-gpu-blocklist')) _cl.appendSwitch('ignore-gpu-blocklist');
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

const slotsConfigPath = path.join(antigravityDir, 'slots_config.json');
let initialSlotsConfig = null;
try {
  if (fs.existsSync(slotsConfigPath)) {
    initialSlotsConfig = JSON.parse(fs.readFileSync(slotsConfigPath, 'utf8'));
  }
} catch (e) {}
const initialSlotsConfigJson = JSON.stringify(initialSlotsConfig || {});

const themeInjectionCode = `
// ================= Antigravity Master Theme & Dynamic Video Auto-Loader =================
(function() {
  const SERVER_URL = 'http://127.0.0.1:8315';
  let cachedConfig = {"left":{"key":"left","file":"left_wallpaper.mp4","type":"video","version":1789301454022,"position":"0% 45%","desc":"AI主对话界面 / 全局底图","poster":"left_poster.jpg"},"mid":{"key":"mid","file":"mid_wallpaper.mp4","type":"video","version":1789301802474,"position":"75% 50%","desc":"终端界面 (活跃终端壁纸)","poster":"mid_poster.gif"},"right":{"key":"right","file":"right_wallpaper.mp4","type":"video","version":1789302062720,"position":"70% 50%","desc":"最右侧界面 (独立终端/侧栏壁纸)","poster":"right_poster.jpg"},"bottom":{"key":"bottom","file":"input_wallpaper.mp4","type":"video","version":1789300554146,"position":"50% 40%","desc":"底部输入框","poster":"input_poster.gif"},"settings":{"key":"settings","file":"settings_wallpaper.png","type":"image","version":1789298704540,"position":"center 65%","desc":"设置界面"},"fontColor":{"id":"obsidian-black","name":"暗夜曜黑 (Obsidian Black)","primary":"#0f172a","secondary":"#1e293b","muted":"#475569","terminal":"#05070d","shadow":"0 0 2px #ffffff, 0 1px 3px rgba(255, 255, 255, 0.95), 0 0 4px rgba(255, 255, 255, 0.85)","terminalShadow":"0 0 2px #ffffff, 0 1px 2px rgba(255, 255, 255, 0.98), 0 0 1px #ffffff, 0 0 5px rgba(255, 255, 255, 0.85)","isDarkText":true,"desc":"适合纯白、超亮浅色动漫或明亮风景壁纸，曜黑字体搭配白辉光描边，不晃眼且字迹清晰","aliases":["2","black","obsidian-black","暗黑","黑","曜黑","暗夜曜黑"]}};
  try {
    const _fs = require('fs');
    const _path = require('path');
    const _os = require('os');
    const _cfg = _path.join(process.env.ANTIGRAVITY_CONFIG_DIR || _path.join(_os.homedir(), '.gemini', 'antigravity'), 'slots_config.json');
    if (_fs.existsSync(_cfg)) {
      const _data = JSON.parse(_fs.readFileSync(_cfg, 'utf8'));
      if (_data) cachedConfig = _data;
    }
  } catch(e) {}
  let lastAppliedConfigHash = JSON.stringify(cachedConfig || {});
  let isFetching = false;

  // Tick 0 极速挂载底图壁纸 (0ms 显示海报图并立即预载视频流，绝无开机黑屏与卡顿延迟)
  function mountTickZeroBase() {
    try {
      const cfg = cachedConfig;
      if (!cfg || !cfg.left || cfg.left.type !== 'video' || !cfg.left.file) return;
      const left = cfg.left;
      const vParam = (left && left.version) ? ('?v=' + left.version) : '';
      const src = SERVER_URL + '/' + encodeURIComponent(left.file) + vParam;
      const posterSrc = (left && left.poster) ? (SERVER_URL + '/' + encodeURIComponent(left.poster) + vParam) : '';
      const posLeft = (left && left.position) || '0% 45%';
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
        leftVid.style.transform = 'translate3d(0, 0, 0)';
        leftVid.style.contain = 'layout paint';
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
          if (leftVid.error || leftVid.networkState === 3 || leftVid.readyState === 0) {
            leftVid.src = src;
            leftVid.load();
            leftVid.play().catch(function(){});
          }
        };
        leftVid.addEventListener('error', function() {
          setTimeout(tryRecoverLeft, 100);
          setTimeout(tryRecoverLeft, 300);
          setTimeout(tryRecoverLeft, 800);
        });
        (document.body || document.documentElement).prepend(leftVid);
        leftVid.play().catch(function(){});
      } else if (document.body && leftVid.parentElement !== document.body) {
        document.body.prepend(leftVid);
      }
    } catch(e) {}
  }
  mountTickZeroBase();

  // 1. 样式表热注入与双重挂载机制 (<link> 极速挂载 + <style> 容灾同步，避免重复全量拉取 5MB 样式)
  async function applyTheme(force) {
    try {
      let titlebarFix = document.getElementById('antigravity-titlebar-fix');
      if (!titlebarFix) {
        titlebarFix = document.createElement('style');
        titlebarFix.id = 'antigravity-titlebar-fix';
        titlebarFix.textContent = [
          '/* 6.1 顶部标题栏与窗口原生控制按钮防碰撞防御 (Windows Electron Native Window Controls Collision Prevention) */',
          'div.absolute.top-0.right-0.z-50.flex.items-center.shrink-0,',
          'div.absolute.top-0:has(> div > [data-testid="toggle-aux-sidebar"]),',
          'div.absolute.top-0:has(> [data-testid="toggle-aux-sidebar"]),',
          'div:has(> div > [data-testid="toggle-aux-sidebar"]):not([class*="group"]):not([class*="pane"]) {',
          '  right: max(138px, calc(100vw - env(titlebar-area-width, calc(100vw - 138px)))) !important;',
          '}',
          '/* 辅助面板展开时顶栏标签页与加号按钮右侧内边距，确保不被最大化/侧边栏切换按钮遮挡 (64px按钮组 + 8px自然间距 = 72px) */',
          'div[data-aux-pane-open="true"] div.shrink-0.flex.items-center.border-b:has([data-testid="aux-panel-plus-dropdown-trigger"]),',
          'div[data-aux-pane-open="true"] div.shrink-0.flex.items-center.border-b:has(button[aria-label*="tab" i]) {',
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
          '  background: rgba(22, 24, 34, 0.94) !important;',
          '  backdrop-filter: blur(6px) !important;',
          '  -webkit-backdrop-filter: blur(6px) !important;',
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
    if (p.offsetWidth === 0 && p.offsetHeight === 0) return false;
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
        if (document.body && leftVid.parentElement !== document.body) {
          document.body.prepend(leftVid);
        }
        if (leftVid.error || (leftVid.networkState === 3 && leftVid.readyState === 0)) {
          leftVid.src = src;
          leftVid.load();
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
          leftVid.style.transform = 'translate3d(0, 0, 0)';
          leftVid.style.contain = 'layout paint';
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
            setTimeout(function() {
              if (leftVid.error) {
                leftVid.load();
                if (!document.hidden) leftVid.play().catch(function(){});
              }
            }, 300);
          });
          (document.body || document.documentElement).prepend(leftVid);
        }
        if (document.body && leftVid.parentElement !== document.body) {
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
        'div[data-aux-pane-open="true"] div.flex.flex-col.gap-2.overflow-y-auto.h-full.w-full.bg-background',
        'div[data-aux-pane-open="true"] [class*="terminal-drawer"]'
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
                // 要求抽屉已展开可见，避免在抽屉收起（宽度 0px）时无效挂载
                if (el.offsetWidth < 50) {
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
            if (vid.error || (vid.networkState === 3 && vid.readyState === 0)) {
              vid.src = src;
              vid.load();
            }
            syncVideoPlaybackState(vid);
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
            vid.style.transform = 'translate3d(0, 0, 0)';
            vid.style.contain = 'layout paint';
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
              setTimeout(function() {
                if (vid.error) {
                  vid.load();
                  if (isVideoVisible(vid)) vid.play().catch(function(){});
                }
              }, 300);
            });
            if (!targetContainer.dataset.agPositioned) {
              targetContainer.dataset.agPositioned = 'true';
              if (!targetContainer.style.position || targetContainer.style.position === 'static') {
                targetContainer.style.position = 'relative';
              }
              targetContainer.style.overflow = 'hidden';
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
        applyTheme(true);
      }
    }
    applyVideos();
  }

  const initEngine = () => {
    applyTheme();
    applyVideos();

    // Fast startup retry ladder (50ms, 150ms, 300ms, 600ms, 1200ms, 2500ms, 5000ms)
    // Ensures videos mount immediately as React components hydrate
    [50, 150, 300, 600, 1200, 2500, 5000].forEach(function(delay) {
      setTimeout(applyVideos, delay);
    });

    if (window.__antigravityVideoObserver) {
      try { window.__antigravityVideoObserver.disconnect(); } catch(e) {}
      window.__antigravityVideoObserver = null;
    }

    let debounceTimer = null;
    const scheduledApply = function(mutations) {
      if (mutations && mutations.length > 0) {
        let isRelevant = false;
        for (let i = 0; i < mutations.length; i++) {
          const m = mutations[i];
          const target = m.target;
          if (!target || target.nodeType === 3) continue;
          const tag = target.nodeName ? target.nodeName.toLowerCase() : '';
          if (tag === 'span' || tag === 'code' || tag === 'p' || tag === 'pre' || tag === 'a') continue;
          if (target.closest && (target.closest('.xterm') || target.closest('.terminal') || target.closest('.monaco-editor') || target.closest('pre') || target.closest('.code-block') || target.closest('[data-testid*="message"]'))) {
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
                if (role === 'dialog' || ds === 'open' || 
                  node.id === 'antigravity.agentSidePanelInputBox' || 
                  (node.id && node.id.includes('agentSidePanelInputBox')) ||
                  (node.classList && (node.classList.contains('terminal') || node.classList.contains('xterm') ||
                   node.classList.contains('overflow-y-auto') || node.classList.contains('bg-background') ||
                   node.classList.contains('bg-card') || node.classList.contains('bg-card-border'))) ||
                  (node.className && typeof node.className === 'string' && (node.className.includes('terminal') || node.className.includes('drawer') || node.className.includes('bg-card') || node.className.includes('agentSidePanelInputBox') || (node.className.includes('overflow-y-auto') && node.className.includes('bg-background')))) ||
                  (node.querySelector && node.querySelector('.terminal, .xterm, [class*="terminal-drawer"], [id*="agentSidePanelInputBox"], div.bg-card, div.rounded-2xl.bg-card-border, div.flex.flex-col.gap-2.overflow-y-auto.h-full.w-full.bg-background'))) {
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

      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(function() {
        debounceTimer = null;
        applyVideos();
      }, 200);
    };

    window.__antigravityVideoObserver = new MutationObserver(scheduledApply);
    window.__antigravityVideoObserver.observe(document.body || document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['data-aux-pane-open', 'data-state', 'aria-expanded', 'hidden']
    });

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

    // ================= Update Notification & Instant Toast =================
    window.showThemeToast = function(msg, duration = 3000) {
      try {
        let toast = document.getElementById('antigravity-theme-toast');
        if (!toast) {
          toast = document.createElement('div');
          toast.id = 'antigravity-theme-toast';
          toast.style.cssText = 'position: fixed; top: 48px; right: 24px; z-index: 999999; background: rgba(15, 23, 42, 0.92); color: #ffffff; padding: 10px 18px; border-radius: 10px; font-size: 13px; font-weight: 500; letter-spacing: 0.2px; box-shadow: 0 8px 24px rgba(0,0,0,0.35), 0 0 1px rgba(255,255,255,0.3); backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px); border: 1px solid rgba(255,255,255,0.18); transition: opacity 0.3s cubic-bezier(0.16, 1, 0.3, 1), transform 0.3s cubic-bezier(0.16, 1, 0.3, 1); opacity: 0; transform: translateY(-8px) scale(0.96); pointer-events: none; display: flex; align-items: center; gap: 8px;';
          document.body.appendChild(toast);
        }
        toast.textContent = msg;
        toast.style.opacity = '1';
        toast.style.transform = 'translateY(0) scale(1)';
        clearTimeout(toast._timer);
        if (duration > 0) {
          toast._timer = setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(-8px) scale(0.96)';
          }, duration);
        }
      } catch(e) {}
    };

    // ================= Update Modal & Notification =================
    window.showThemeUpdateModal = function(version = '2.14.0') {
      try {
        const existing = document.getElementById('antigravity-update-modal');
        if (existing) existing.remove();

        const overlay = document.createElement('div');
        overlay.id = 'antigravity-update-modal';
        overlay.style.cssText = 'position: fixed; inset: 0; background: rgba(0, 0, 0, 0.75); backdrop-filter: blur(4px); -webkit-backdrop-filter: blur(4px); z-index: 9999999; display: flex; align-items: center; justify-content: center; opacity: 0; transition: opacity 0.22s cubic-bezier(0.16, 1, 0.3, 1);';

        const box = document.createElement('div');
        box.style.cssText = 'background: #0f172a; border: 1px solid rgba(255, 255, 255, 0.18); box-shadow: 0 25px 60px rgba(0, 0, 0, 0.9), 0 0 35px rgba(56, 189, 248, 0.25); border-radius: 20px; padding: 28px 32px; max-width: 480px; width: 90%; color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; transform: scale(0.92) translateY(8px); transition: transform 0.22s cubic-bezier(0.16, 1, 0.3, 1); box-sizing: border-box; user-select: none;';

        box.innerHTML = '<div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 18px;">' +
          '<div style="display: flex; align-items: center; gap: 12px;">' +
            '<div style="font-size: 26px; filter: drop-shadow(0 0 10px rgba(56, 189, 248, 0.6));">🚀</div>' +
            '<div>' +
              '<div style="font-size: 18px; font-weight: 700; color: #ffffff; letter-spacing: 0.2px;">Google Antigravity 检查更新</div>' +
              '<div style="display: flex; align-items: center; gap: 6px; margin-top: 4px;">' +
                '<span style="font-size: 11.5px; padding: 2px 9px; border-radius: 9999px; background: rgba(56, 189, 248, 0.18); color: #38bdf8; border: 1px solid rgba(56, 189, 248, 0.4); font-weight: 600;">发现官方新版本 v' + version + '</span>' +
              '</div>' +
            '</div>' +
          '</div>' +
          '<button id="ag-modal-close-x" style="background: rgba(255, 255, 255, 0.08); border: none; color: #94a3b8; font-size: 15px; cursor: pointer; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; border-radius: 8px; transition: all 0.15s;" onmouseover="this.style.color=\\'#fff\\'; this.style.background=\\'rgba(255,255,255,0.16)\\'" onmouseout="this.style.color=\\'#94a3b8\\'; this.style.background=\\'rgba(255,255,255,0.08)\\'">✕</button>' +
        '</div>' +
        '<div style="background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 12px; padding: 14px 18px; margin-bottom: 16px;">' +
          '<div style="display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 8px;">' +
            '<span style="color: #94a3b8;">当前运行版本</span>' +
            '<span style="color: #e2e8f0; font-weight: 500;">v2.13.1</span>' +
          '</div>' +
          '<div style="display: flex; justify-content: space-between; font-size: 13px;">' +
            '<span style="color: #94a3b8;">官方最新版本</span>' +
            '<span style="color: #38bdf8; font-weight: 700;">v' + version + '</span>' +
          '</div>' +
        '</div>' +
        '<div style="font-size: 12.5px; line-height: 1.6; color: #cbd5e1; margin-bottom: 22px; padding: 12px 14px; background: rgba(245, 158, 11, 0.12); border-left: 3.5px solid #f59e0b; border-radius: 8px;">' +
          '<div style="font-weight: 600; color: #fbbf24; margin-bottom: 3px; display: flex; align-items: center; gap: 6px;">' +
            '<span>🌸</span><span>二次元主题美化环境保护</span>' +
          '</div>' +
          '当前客户端已应用壁纸与个性化增强补丁。直接覆盖升级将需要重新安装补丁。建议您先在工具中保存壁纸预设，或按需前往官网下载新版。' +
        '</div>' +
        '<div style="display: flex; flex-direction: column; gap: 10px;">' +
          '<button id="ag-modal-btn-download" style="background: linear-gradient(135deg, #0284c7, #2563eb); color: #ffffff; border: none; border-radius: 10px; padding: 11px 18px; font-size: 13.5px; font-weight: 600; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; box-shadow: 0 4px 14px rgba(14, 165, 233, 0.4); transition: all 0.15s;" onmouseover="this.style.filter=\\'brightness(1.1)\\'; this.style.transform=\\'translateY(-1px)\\'" onmouseout="this.style.filter=\\'none\\'; this.style.transform=\\'none\\'">' +
            '<span>前往官网下载安装包</span>' +
            '<span style="font-weight: bold;">→</span>' +
          '</button>' +
          '<div style="display: flex; gap: 10px;">' +
            '<button id="ag-modal-btn-changelog" style="flex: 1; background: rgba(255, 255, 255, 0.08); color: #e2e8f0; border: 1px solid rgba(255, 255, 255, 0.14); border-radius: 10px; padding: 9px 14px; font-size: 12.5px; font-weight: 500; cursor: pointer; transition: all 0.15s;" onmouseover="this.style.background=\\'rgba(255,255,255,0.14)\\'" onmouseout="this.style.background=\\'rgba(255,255,255,0.08)\\'">查看更新日志</button>' +
            '<button id="ag-modal-btn-dismiss" style="flex: 1; background: transparent; color: #94a3b8; border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 10px; padding: 9px 14px; font-size: 12.5px; cursor: pointer; transition: all 0.15s;" onmouseover="this.style.background=\\'rgba(255,255,255,0.06)\\'; this.style.color=\\'#cbd5e1\\'" onmouseout="this.style.background=\\'transparent\\'; this.style.color=\\'#94a3b8\\'">稍后提醒</button>' +
          '</div>' +
        '</div>';

        overlay.appendChild(box);
        document.body.appendChild(overlay);

        const closeModal = () => {
          overlay.style.opacity = '0';
          box.style.transform = 'scale(0.92) translateY(8px)';
          setTimeout(() => {
            if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
          }, 220);
        };

        requestAnimationFrame(() => {
          overlay.style.opacity = '1';
          box.style.transform = 'scale(1) translateY(0)';
        });

        overlay.querySelector('#ag-modal-close-x').onclick = closeModal;
        overlay.querySelector('#ag-modal-btn-dismiss').onclick = closeModal;
        overlay.onclick = (e) => {
          if (e.target === overlay) closeModal();
        };

        overlay.querySelector('#ag-modal-btn-download').onclick = () => {
          closeModal();
          if (window.electronNative && window.electronNative.openExternal) {
            window.electronNative.openExternal('https://antigravity.google');
          } else {
            window.open('https://antigravity.google', '_blank');
          }
          if (window.showThemeToast) {
            window.showThemeToast('✨ 正在打开 Antigravity 官方下载页面...', 3000);
          }
        };

        overlay.querySelector('#ag-modal-btn-changelog').onclick = () => {
          closeModal();
          if (window.electronNative && window.electronNative.openExternal) {
            window.electronNative.openExternal('https://antigravity.google/docs/changelog');
          } else {
            window.open('https://antigravity.google/docs/changelog', '_blank');
          }
        };

        const onKeyDown = (e) => {
          if (e.key === 'Escape') {
            closeModal();
            document.removeEventListener('keydown', onKeyDown);
          }
        };
        document.addEventListener('keydown', onKeyDown);
      } catch(e) {}
    };

    if (window.electronUpdater && typeof window.electronUpdater.onStateChanged === 'function' && !window.__updaterHooked) {
      window.__updaterHooked = true;
      window.electronUpdater.onStateChanged((state) => {
        if (!state) return;
        if (state.type === 'checking for updates') {
          window.showThemeToast('🔍 正在检查更新...', 2500);
        } else if (state.type === 'available for download') {
          const ver = (state.update && state.update.version) ? state.update.version : '2.14.0';
          window.showThemeToast('✨ 发现新版本 v' + ver + '，点击标题栏更新按钮查看详情', 5000);
        } else if (state.type === 'idle') {
          if (window.__userJustCheckedUpdates) {
            window.__userJustCheckedUpdates = false;
            window.showThemeToast('✓ 当前已是最新版本', 3000);
          }
        }
      });
    }

    if (!window.__updateClickHooked) {
      window.__updateClickHooked = true;
      document.addEventListener('click', async (e) => {
        try {
          const target = e.target;
          if (!target) return;

          // Check for menu "Check for Updates"
          if (target.textContent && target.textContent.trim() === 'Check for Updates') {
            window.__userJustCheckedUpdates = true;
            window.showThemeToast('🔍 正在检查更新...', 3000);
            return;
          }

          // Check for titlebar "Update Available →" button
          const updateBtn = (target.closest && target.closest('[data-testid="app-update-button"]')) ||
            (target.textContent && target.textContent.includes('Update Available') && (target.closest('button, [role="button"]') || target.tagName === 'SPAN' || target.tagName === 'DIV') ? (target.closest('[data-testid="app-update-button"]') || target) : null);

          if (updateBtn) {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();

            let ver = '2.14.0';
            try {
              if (window.electronUpdater && window.electronUpdater.getState) {
                const state = await window.electronUpdater.getState();
                if (state && state.update && state.update.version) {
                  ver = state.update.version;
                }
              }
            } catch(err) {}

            window.showThemeUpdateModal(ver);
          }
        } catch(e) {}
      }, true);
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

// 5.5 Patch updater.js (防止静默自动更新再次覆盖主题补丁 & 完善中文弹窗反馈)
const updaterPath = path.join(appDist, 'updater.js');
if (fs.existsSync(updaterPath)) {
  let updaterContent = fs.readFileSync(updaterPath, 'utf8');
  if (updaterContent.includes('autoUpdater.autoDownload = true')) {
    updaterContent = updaterContent.replace('autoUpdater.autoDownload = true;', 'autoUpdater.autoDownload = false; // Theme patch: prevent silent overwrite');
    updaterContent = updaterContent.replace('autoUpdater.autoInstallOnAppQuit = electron_1.app.isPackaged;', 'autoUpdater.autoInstallOnAppQuit = false; // Theme patch: prevent silent overwrite');
  }

  // Inject update-available dialog
  if (!updaterContent.includes('Antigravity 检查更新') && updaterContent.includes("console.log(`[AutoUpdater] Update available: ${info.version}`);")) {
    updaterContent = updaterContent.replace(
      /updateMenuState\(MenuUpdateStep\.DownloadingUpdate\);[\s\S]*?isManualCheck = false;/m,
      `updateMenuState(MenuUpdateStep.CheckForUpdates);
        if (isManualCheck && !isHeadless) {
            const win = electron_1.BrowserWindow.getFocusedWindow();
            const currentVer = electron_1.app.getVersion();
            const options = {
                type: 'info',
                title: 'Antigravity 检查更新',
                message: \`发现新版本 v\${info.version} (当前版本: v\${currentVer})\`,
                detail: \`Google Antigravity 官方已发布更新版本 v\${info.version}。\\n\\n提示：当前客户端已安装「二次元主题美化与动态壁纸增强补丁」，直接覆盖升级将需要重新安装补丁。\\n\\n是否前往官网下载最新安装包？\`,
                buttons: ['前往官网下载', '查看更新日志', '暂不更新'],
                defaultId: 0,
                cancelId: 2,
                noLink: true
            };
            const showPromise = win ? electron_1.dialog.showMessageBox(win, options) : electron_1.dialog.showMessageBox(options);
            showPromise.then((res) => {
                if (res.response === 0) {
                    electron_1.shell.openExternal('https://antigravity.google');
                } else if (res.response === 1) {
                    electron_1.shell.openExternal('https://antigravity.google/docs/changelog');
                }
            }).catch(() => {});
        }
        isManualCheck = false;`
    );

    // Inject update-not-available Chinese dialog
    updaterContent = updaterContent.replace(
      /message: 'No updates available',[\s\S]*?buttons: \['OK'\],/m,
      `message: '当前已是最新版本',\n                detail: \`当前版本 v\${currentVer}，暂无可用更新。\`,\n                buttons: ['确定'],`
    );

    // Inject error dialog
    updaterContent = updaterContent.replace(
      /electron_updater_1\.autoUpdater\.on\('error', \(err\) => \{[\s\S]*?updateMenuState\(MenuUpdateStep\.CheckForUpdates\);[\s\S]*?isManualCheck = false;\s*\}\);/m,
      `electron_updater_1.autoUpdater.on('error', (err) => {
        console.error('[AutoUpdater] Error:', err.message);
        broadcastState({ type: types_1.UpdateState.Idle });
        updateMenuState(MenuUpdateStep.CheckForUpdates);
        if (isManualCheck && !isHeadless) {
            const win = electron_1.BrowserWindow.getFocusedWindow();
            const options = {
                type: 'warning',
                title: 'Antigravity 检查更新',
                message: '检查更新失败',
                detail: \`无法连接到更新服务器，请检查网络连接或代理设置。\\n\\n详细信息: \${err.message || err}\`,
                buttons: ['确定'],
            };
            if (win) {
                electron_1.dialog.showMessageBox(win, options);
            }
            else {
                electron_1.dialog.showMessageBox(options);
            }
        }
        isManualCheck = false;
    });`
    );
  }

  fs.writeFileSync(updaterPath, updaterContent, 'utf8');
  console.log('✓ updater.js 静默后台下载已拦截保护 & 中文交互弹窗已植入完成');
}

// 6. 打包生成 app.asar.patched
console.log('[5/5] 正在重新打包并生成 app.asar.patched 补丁镜像...');
execSync(`npx --yes asar pack "${appDir}" "${patchedAsarPath}"`, { stdio: 'inherit' });
console.log('✓ app.asar.patched 打包生成完毕！');

try {
  fs.copyFileSync(patchedAsarPath, asarPath);
  console.log('✓ app.asar 已直接更新并固化完成！');
} catch (e) {
  console.log('提示: app.asar 复制提示:', e.message);
}

// 7. 安全接管 app-update.yml，防止静默更新再次清空美化
const appUpdateYml = path.join(resDir, 'app-update.yml');
const appUpdateYmlBak = path.join(resDir, 'app-update.yml.bak');
if (fs.existsSync(appUpdateYml)) {
  try {
    if (!fs.existsSync(appUpdateYmlBak)) {
      fs.copyFileSync(appUpdateYml, appUpdateYmlBak);
    }
    fs.writeFileSync(appUpdateYml, '# Auto-update disabled by Antigravity Theme Customizer\nprovider: generic\nurl: http://127.0.0.1:8315/noop-update/\n', 'utf8');
    console.log('✓ app-update.yml 已安全接管 (防止意外覆盖)');
  } catch (e) {}
}

console.log('');
console.log('=======================================================');
console.log('✨ 核心注入镜像打包完成！接下来运行 patch_core 即可固化生效。');
console.log('=======================================================');
