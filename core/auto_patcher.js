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

// 复制流媒体服务模块到 app/dist 目录
const distMediaServerPath = path.join(appDist, 'media_server.js');
if (fs.existsSync(repoMediaServerPath)) {
  fs.copyFileSync(repoMediaServerPath, distMediaServerPath);
  console.log('✓ 已植入 media_server.js 流媒体服务模块');
}

// 2. Patch main.js (固定 CDP 调试端口 8314 & 启动动态壁纸流媒体服务器 8315)
console.log('[2/5] 正在注入 main.js (启用 8314 调试端口 & 8315 流媒体服务)...');
const mainPath = path.join(appDist, 'main.js');
let mainContent = fs.readFileSync(mainPath, 'utf8');

const mediaServerInjectionCode = `
// ================= Antigravity Wallpaper Media Server =================
try {
  const { startMediaServer } = require('./media_server');
  const _os = require('os');
  const _path = require('path');
  const _antigravityDir = process.env.ANTIGRAVITY_CONFIG_DIR || _path.join(_os.homedir(), '.gemini', 'antigravity');
  startMediaServer(_path.join(_antigravityDir, 'wallpapers'), 8315);
} catch(e) {}
// =====================================================================
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

if (!mainContent.includes('Antigravity Wallpaper Media Server')) {
  mainContent += '\n' + mediaServerInjectionCode;
}
fs.writeFileSync(mainPath, mainContent, 'utf8');
console.log('✓ main.js 注入完成');

// 3. Patch preload.js (启动自启自动载入 custom_theme.css & 动态视频引擎 并热监听)
console.log('[3/5] 正在注入 preload.js (前台开机自启 & 动态壁纸自适应引擎)...');
const preloadPath = path.join(appDist, 'preload.js');
let preloadContent = fs.readFileSync(preloadPath, 'utf8');

const themeInjectionCode = `
// ================= Antigravity Master Theme & Dynamic Video Auto-Loader =================
(function() {
  try {
    const fs = require('fs');
    const path = require('path');
    const customCssPath = '${customCssPath}';
    const antigravityDir = path.dirname(customCssPath);
    const slotsConfigPath = path.join(antigravityDir, 'slots_config.json').replace(/\\\\/g, '/');
    const SERVER_URL = 'http://127.0.0.1:8315';

    // In-memory cache for configuration to avoid UI-thread disk I/O on DOM mutations
    let cachedConfig = null;
    const reloadConfig = () => {
      try {
        if (fs.existsSync(slotsConfigPath)) {
          cachedConfig = JSON.parse(fs.readFileSync(slotsConfigPath, 'utf8'));
        }
      } catch(e) {}
    };
    reloadConfig();

    // 1. 样式表热注入
    const applyTheme = () => {
      try {
        if (fs.existsSync(customCssPath)) {
          let style = document.getElementById('antigravity-custom-theme');
          if (!style) {
            style = document.createElement('style');
            style.id = 'antigravity-custom-theme';
            (document.head || document.documentElement).appendChild(style);
          }
          style.textContent = fs.readFileSync(customCssPath, 'utf8');
        }
      } catch(e) {}
    };

    // 2. 动态视频槽位自动化挂载
    const applyVideos = () => {
      try {
        if (!cachedConfig) reloadConfig();
        const config = cachedConfig;
        if (!config) return;

        // [左] 全局底图
        const left = config.left;
        const allLeftVids = document.querySelectorAll('#antigravity-video-left, .antigravity-slot-video[data-slot="left"]');
        if (left && left.type === 'video' && left.file) {
          const src = SERVER_URL + '/' + encodeURIComponent(left.file);
          for (let i = 1; i < allLeftVids.length; i++) {
            allLeftVids[i].pause();
            allLeftVids[i].removeAttribute('src');
            allLeftVids[i].load();
            allLeftVids[i].remove();
          }
          let leftVid = allLeftVids[0];
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
            leftVid.addEventListener('canplay', function() {
              if (leftVid.paused) leftVid.play().catch(function(){});
            });
            leftVid.addEventListener('loadeddata', function() {
              if (leftVid.paused) leftVid.play().catch(function(){});
            });
            (document.body || document.documentElement).prepend(leftVid);
          }
          if (leftVid.dataset.currentSrc !== src) {
            leftVid.dataset.currentSrc = src;
            leftVid.src = src;
            leftVid.load();
          }
          if (leftVid.paused) {
            leftVid.play().catch(function(){});
          }
          leftVid.style.display = 'block';
        } else {
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
            'div.flex-1.flex.flex-col.min-w-0.h-full:has([id="antigravity.agentSidePanelInputBox"])',
            'div.flex-1.flex.flex-col.min-w-0.h-full:has(#antigravity\\\\.agentSidePanelInputBox)',
            'div.flex.flex-col.gap-2.overflow-y-auto.h-full.w-full.bg-background',
            '[class*="terminal-drawer"]'
          ],
          'bottom': [
            'div.bg-card:has([contenteditable="true"])',
            'div.bg-card:has(textarea)',
            'div:has(> [contenteditable="true"]):not([role="dialog"] *)',
            'div:has(> textarea):not([role="dialog"] *)',
            'div.rounded-2xl.bg-card-border > div.bg-card',
            'div.relative.flex.flex-col.p-px.rounded-2xl.bg-card-border > div.bg-card',
            'div.relative.flex.flex-col.p-px.rounded-2xl.bg-card-border > div.relative.flex.flex-col.gap-0',
            'div[class*="rounded-2xl"][class*="bg-card-border"] > div[class*="bg-card"]',
            'div.relative.flex.flex-col.gap-0[class*="bg-card"]',
            'div.relative.flex.flex-col.p-px.rounded-2xl.bg-card-border > div.relative.flex.flex-col.gap-0.p-1',
            'div.relative.flex.flex-col.gap-0.p-1.rounded-\\\\[calc\\\\(theme\\\\(borderRadius\\\\.2xl\\\\)-1px\\\\)\\\\].bg-card'
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
          const src = isVideo ? (SERVER_URL + '/' + encodeURIComponent(slotData.file)) : null;
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

            const existingVids = document.querySelectorAll('.antigravity-slot-video[data-slot="' + slotKey + '"]');
            for (let i = 0; i < existingVids.length; i++) {
              if (!targetContainer || existingVids[i].parentElement !== targetContainer) {
                existingVids[i].pause();
                existingVids[i].removeAttribute('src');
                existingVids[i].load();
                existingVids[i].remove();
              }
            }

            if (targetContainer) {
              const allSlotVidsInContainer = targetContainer.querySelectorAll(':scope > .antigravity-slot-video[data-slot="' + slotKey + '"]');
              for (let i = 1; i < allSlotVidsInContainer.length; i++) {
                allSlotVidsInContainer[i].pause();
                allSlotVidsInContainer[i].removeAttribute('src');
                allSlotVidsInContainer[i].load();
                allSlotVidsInContainer[i].remove();
              }
              let vid = allSlotVidsInContainer[0];
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
                vid.addEventListener('canplay', function() {
                  if (vid.paused) vid.play().catch(function(){});
                });
                vid.addEventListener('loadeddata', function() {
                  if (vid.paused) vid.play().catch(function(){});
                });
                const pos = window.getComputedStyle(targetContainer).position;
                if (!pos || pos === 'static') {
                  targetContainer.style.position = 'relative';
                }
                targetContainer.prepend(vid);
              }
              if (vid.dataset.currentSrc !== src) {
                vid.dataset.currentSrc = src;
                vid.src = src;
                vid.load();
              }
              if (vid.paused) {
                vid.play().catch(function(){});
              }
            }
          }
        }
      } catch(err) {}
    };

    const initEngine = () => {
      applyTheme();
      applyVideos();
      if (!window.__antigravityVideoObserver) {
        let debounceTimer = null;
        const scheduledApply = function() {
          if (debounceTimer) return;
          debounceTimer = setTimeout(function() {
            debounceTimer = null;
            applyVideos();
          }, 150);
        };
        window.__antigravityVideoObserver = new MutationObserver(scheduledApply);
        window.__antigravityVideoObserver.observe(document.body || document.documentElement, {
          childList: true,
          subtree: true
        });
        setInterval(applyVideos, 3000);
      }
    };

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initEngine);
    } else {
      initEngine();
    }

    try {
      if (fs.existsSync(customCssPath)) {
        fs.watchFile(customCssPath, { interval: 300 }, applyTheme);
      }
      if (fs.existsSync(slotsConfigPath)) {
        fs.watchFile(slotsConfigPath, { interval: 300 }, () => {
          reloadConfig();
          applyVideos();
        });
      }
    } catch(e) {}
  } catch(err) {}
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

console.log('');
console.log('=======================================================');
console.log('✨ 核心注入镜像打包完成！接下来运行 patch_core 即可固化生效。');
console.log('=======================================================');
