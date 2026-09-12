const fs = require('fs');
const path = require('path');
const http = require('http');
const os = require('os');
const { startMediaServer, ensureMediaServer, isMediaServerRunning, DEFAULT_PORT } = require('./media_server');
const {
  scanWorkshopWallpapers,
  getWallpaperById,
  formatWallpaperTable,
  getAllSteamLibraries,
  findWorkshopDirs
} = require('./wallpaper_engine_bridge');

const antigravityDir = process.env.ANTIGRAVITY_CONFIG_DIR || path.join(os.homedir(), '.gemini', 'antigravity');
const repoWallpapersDir = path.join(__dirname, '..', 'wallpapers');

if (!fs.existsSync(antigravityDir)) {
  fs.mkdirSync(antigravityDir, { recursive: true });
}
const localWallpapersDir = path.join(antigravityDir, 'wallpapers');
if (!fs.existsSync(localWallpapersDir)) {
  fs.mkdirSync(localWallpapersDir, { recursive: true });
  if (fs.existsSync(repoWallpapersDir)) {
    fs.cpSync(repoWallpapersDir, localWallpapersDir, { recursive: true });
  }
}

const wallpapersDir = localWallpapersDir;
const customCssPath = path.join(antigravityDir, 'custom_theme.css');
const baselineDir = path.join(antigravityDir, 'backups', 'baseline_v1_初版');
const slotsConfigPath = path.join(antigravityDir, 'slots_config.json');

const VIDEO_EXTS = new Set(['.mp4', '.webm', '.ogg', '.ogv', '.mov', '.m4v']);
const IMAGE_EXTS = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg']);

const SLOTS_META = {
  'left': { key: 'left', defaultFile: 'left_wallpaper.jpg', desc: 'AI主对话界面 / 全局底图' },
  'mid': { key: 'mid', defaultFile: 'mid_wallpaper.jpg', desc: '终端界面 (活跃终端壁纸)' },
  'right': { key: 'right', defaultFile: 'right_wallpaper.jpg', desc: '最右侧界面 (独立终端/侧栏壁纸)' },
  'bottom': { key: 'bottom', defaultFile: 'input_wallpaper.jpg', desc: '底部输入框' },
  'settings': { key: 'settings', defaultFile: 'settings_wallpaper.png', desc: '设置界面' }
};

const SLOT_ALIASES = {
  '左': 'left', 'left': 'left', 'global': 'left', 'main': 'left',
  '中': 'mid', 'mid': 'mid', 'terminal': 'mid',
  '右': 'right', 'right': 'right', 'standalone': 'right',
  '下': 'bottom', 'bottom': 'bottom', 'input': 'bottom',
  '设置': 'settings', 'settings': 'settings'
};

// Kept for backward compatibility
const SLOTS = {
  '左': { file: 'left_wallpaper.jpg', key: 'left', desc: 'AI主对话界面 / 全局底图' },
  'left': { file: 'left_wallpaper.jpg', key: 'left', desc: 'AI主对话界面 / 全局底图' },
  'global': { file: 'left_wallpaper.jpg', key: 'left', desc: 'AI主对话界面 / 全局底图' },
  'main': { file: 'left_wallpaper.jpg', key: 'left', desc: 'AI主对话界面 / 全局底图' },
  
  '中': { file: 'mid_wallpaper.jpg', key: 'mid', desc: '终端界面 (活跃终端壁纸)' },
  'mid': { file: 'mid_wallpaper.jpg', key: 'mid', desc: '终端界面 (活跃终端壁纸)' },
  'terminal': { file: 'mid_wallpaper.jpg', key: 'mid', desc: '终端界面 (活跃终端壁纸)' },
  
  '右': { file: 'right_wallpaper.jpg', key: 'right', desc: '最右侧界面 (独立终端/侧栏壁纸)' },
  'right': { file: 'right_wallpaper.jpg', key: 'right', desc: '最右侧界面 (独立终端/侧栏壁纸)' },
  'standalone': { file: 'right_wallpaper.jpg', key: 'right', desc: '最右侧界面 (独立终端/侧栏壁纸)' },
  
  '下': { file: 'input_wallpaper.jpg', key: 'bottom', desc: '底部输入框' },
  'bottom': { file: 'input_wallpaper.jpg', key: 'bottom', desc: '底部输入框' },
  'input': { file: 'input_wallpaper.jpg', key: 'bottom', desc: '底部输入框' },
  
  '设置': { file: 'settings_wallpaper.png', key: 'settings', desc: '设置界面' },
  'settings': { file: 'settings_wallpaper.png', key: 'settings', desc: '设置界面' }
};

function loadSlotsConfig() {
  let config = {};
  if (fs.existsSync(slotsConfigPath)) {
    try {
      config = JSON.parse(fs.readFileSync(slotsConfigPath, 'utf8'));
    } catch (e) {}
  }

  let modified = false;
  const allFiles = fs.existsSync(wallpapersDir) ? fs.readdirSync(wallpapersDir) : [];

  for (const [key, meta] of Object.entries(SLOTS_META)) {
    if (!config[key] || !config[key].file) {
      let foundFile = meta.defaultFile;
      let foundType = 'image';

      // 1. Check for video in wallpapersDir
      const prefix = key === 'bottom' ? 'input_wallpaper' : `${key}_wallpaper`;
      const matchingVideo = allFiles.find(f => {
        const ext = path.extname(f).toLowerCase();
        return VIDEO_EXTS.has(ext) && f.startsWith(prefix);
      });

      if (matchingVideo) {
        foundFile = matchingVideo;
        foundType = 'video';
      } else {
        const matchingImage = allFiles.find(f => {
          const ext = path.extname(f).toLowerCase();
          return IMAGE_EXTS.has(ext) && f.startsWith(prefix);
        });
        if (matchingImage) {
          foundFile = matchingImage;
          foundType = 'image';
        }
      }

      config[key] = {
        key,
        file: foundFile,
        type: foundType,
        desc: meta.desc
      };
      modified = true;
    } else {
      const activePath = path.join(wallpapersDir, config[key].file);
      if (!fs.existsSync(activePath) && !fs.existsSync(path.join(repoWallpapersDir, config[key].file))) {
        config[key].file = meta.defaultFile;
        modified = true;
      }
      const ext = path.extname(config[key].file).toLowerCase();
      config[key].type = VIDEO_EXTS.has(ext) ? 'video' : 'image';
      config[key].desc = meta.desc;
    }
  }

  if (modified || !fs.existsSync(slotsConfigPath)) {
    saveSlotsConfig(config);
  }
  return config;
}

function saveSlotsConfig(config) {
  const jsonStr = JSON.stringify(config, null, 2);
  try {
    fs.writeFileSync(slotsConfigPath, jsonStr, 'utf8');
  } catch (e) {}
  try {
    fs.writeFileSync(path.join(wallpapersDir, 'slots_config.json'), jsonStr, 'utf8');
  } catch (e) {}
}

function getBase64(filename) {
  if (!filename) return '';
  let filePath = path.join(wallpapersDir, filename);
  if (!fs.existsSync(filePath)) {
    const fallbackPath = path.join(repoWallpapersDir, filename);
    if (fs.existsSync(fallbackPath)) {
      filePath = fallbackPath;
    } else {
      console.warn(`Warning: ${filename} not found in wallpapers directory.`);
      return '';
    }
  }
  const buf = fs.readFileSync(filePath);
  const ext = path.extname(filename).toLowerCase();
  let mime = 'image/jpeg';
  if (buf.length >= 4 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4E && buf[3] === 0x47) {
    mime = 'image/png';
  } else if (buf.length >= 3 && buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46) {
    mime = 'image/gif';
  } else if (ext === '.webp') {
    mime = 'image/webp';
  } else if (ext === '.svg') {
    mime = 'image/svg+xml';
  }
  return `data:${mime};base64,` + buf.toString('base64');
}

function generateMasterCss(slotsConfig) {
  if (!slotsConfig) {
    slotsConfig = loadSlotsConfig();
  }

  const isLeftVideo = slotsConfig.left && slotsConfig.left.type === 'video';
  const isMidVideo = slotsConfig.mid && slotsConfig.mid.type === 'video';
  const isRightVideo = slotsConfig.right && slotsConfig.right.type === 'video';
  const isBottomVideo = slotsConfig.bottom && slotsConfig.bottom.type === 'video';
  const isSettingsVideo = slotsConfig.settings && slotsConfig.settings.type === 'video';

  const b64Left = !isLeftVideo ? getBase64(slotsConfig.left?.file || 'left_wallpaper.jpg') : '';
  const b64Mid = !isMidVideo ? getBase64(slotsConfig.mid?.file || 'mid_wallpaper.jpg') : '';
  const b64Right = !isRightVideo ? getBase64(slotsConfig.right?.file || 'right_wallpaper.jpg') : '';
  const b64Bottom = !isBottomVideo ? getBase64(slotsConfig.bottom?.file || 'input_wallpaper.jpg') : '';
  const b64Settings = !isSettingsVideo ? getBase64(slotsConfig.settings?.file || 'settings_wallpaper.png') : '';

  return `/* ==========================================================================
   Antigravity 2.0 Master Custom Theme - 5-Slot Dynamic Hybrid Edition
   Slots: [左: 主对话区/全局底图] | [中: 活跃终端壁纸] | [右: 极简无杂线侧栏壁纸] | [下: 底部输入框] | [设置: 设置弹窗]
   Supports: Static Images (JPG/PNG/GIF/WebP) & Dynamic Hardware-Accelerated Video (MP4/WebM)
   ========================================================================== */

/* 1. Global Base & 消灭外层全局拖动条 */
html, body {
  background-color: #0b0c14 !important;
  color: #f1f5f9 !important;
  overflow: hidden !important;
  width: 100% !important;
  height: 100% !important;
  margin: 0 !important;
  padding: 0 !important;
}

#root, #app {
  overflow: hidden !important;
  width: 100% !important;
  height: 100% !important;
  max-width: 100vw !important;
  max-height: 100vh !important;
}

/* 隐藏全局最外层多余的拖动条，保持界面完整铺满 */
html::-webkit-scrollbar,
body::-webkit-scrollbar,
#root::-webkit-scrollbar {
  display: none !important;
  width: 0 !important;
  height: 0 !important;
}

/* 2. Fullscreen GPU-Accelerated Unified Base Wallpaper (左: 主对话区/全局底图) */
body::before {
  content: "" !important;
  position: fixed !important;
  top: 0 !important;
  left: 0 !important;
  right: 0 !important;
  bottom: 0 !important;
  width: 100vw !important;
  height: 100vh !important;
  background-color: transparent !important;
  background-image: 
    linear-gradient(
      rgba(11, 12, 20, 0.06), 
      rgba(11, 12, 20, 0.10)
    )${isLeftVideo ? '' : `,\n    url("${b64Left}")`} !important;
  background-size: cover !important;
  background-position: center !important;
  background-repeat: no-repeat !important;
  background-attachment: fixed !important;
  pointer-events: none !important;
  z-index: 0 !important;
  transform: translate3d(0, 0, 0) !important;
  backface-visibility: hidden !important;
  will-change: transform !important;
}

#antigravity-video-left {
  position: fixed !important;
  top: 0 !important;
  left: 0 !important;
  right: 0 !important;
  bottom: 0 !important;
  width: 100vw !important;
  height: 100vh !important;
  object-fit: cover !important;
  object-position: center !important;
  pointer-events: none !important;
  z-index: 0 !important;
  transform: translate3d(0, 0, 0) !important;
  backface-visibility: hidden !important;
}

/* 3. Global Transparent Layout */
#root, #app, [data-theme], .h-screen, .w-screen, .flex-1 {
  background-color: transparent !important;
  background: transparent !important;
}

/* 4. 主对话区彻底通透净化：消灭一切滚动黑带与渐变遮罩 */
main [class*="bg-gradient-to-b"],
main [class*="bg-gradient-to-t"],
main [class*="from-neutral"],
main [class*="from-zinc"],
main [class*="from-stone"],
main [class*="from-gray"],
main [class*="from-black"],
main [class*="from-background"],
main [class*="scroll-fade"],
main [class*="scroller-mask"],
main [class*="turn-separator"],
main hr {
  background-image: none !important;
  background-color: transparent !important;
  background: transparent !important;
  box-shadow: none !important;
  border-color: transparent !important;
  mask-image: none !important;
  -webkit-mask-image: none !important;
}

/* 彻底消灭用户提问 Sticky 包装层的黑底与伪元素黑色渐变 */
div[class*="sticky"],
div.sticky,
main div.sticky,
[class*="group/user-input-step"],
div:has(> div > [class*="group/user-input-step"]) {
  background: transparent !important;
  background-color: transparent !important;
}

div.sticky::before,
div.sticky::after,
div[class*="sticky"]::before,
div[class*="sticky"]::after,
div[class*="group/user-input-step"]::before,
div[class*="group/user-input-step"]::after {
  content: none !important;
  display: none !important;
  background: transparent !important;
  background-image: none !important;
}

/* 仅清除输入框上方的黑色过渡遮罩 */
div.absolute.bottom-0.inset-x-4.pointer-events-none,
div[class*="inset-x-4"][class*="pointer-events-none"][class*="bottom-0"] {
  background: transparent !important;
  background-image: none !important;
  display: none !important;
}

/* 5. Left Sidebar */
aside, nav, [class*="sidebar"], [class*="Sidebar"], [class*="navigation"], [class*="Navigation"] {
  background-color: rgba(14, 15, 26, 0.35) !important;
  backdrop-filter: blur(10px) !important;
  -webkit-backdrop-filter: blur(10px) !important;
  border-right: 1px solid rgba(226, 232, 240, 0.12) !important;
  box-shadow: none !important;
}

/* 6. Top Header & Title Bar & Navigation Buttons */
header, [class*="header"], [class*="Header"], [class*="titlebar"], [class*="menubar"] {
  background-color: rgba(14, 15, 26, 0.35) !important;
  backdrop-filter: blur(10px) !important;
  -webkit-backdrop-filter: blur(10px) !important;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08) !important;
  box-shadow: none !important;
}

button[aria-label="Go Back"],
button[aria-label="Toggle Sidebar"],
button[aria-label="Go Forward"],
button[aria-label*="Undo"],
button[aria-label*="Back"],
button[aria-label*="返回"],
button[aria-label*="撤销"] {
  opacity: 1 !important;
  color: #ffffff !important;
  visibility: visible !important;
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.8)) !important;
  transition: all 0.2s ease !important;
}

button[aria-label="Go Back"]:hover,
button[aria-label="Toggle Sidebar"]:hover,
button[aria-label*="Undo"]:hover {
  color: #38bdf8 !important;
  background-color: rgba(56, 189, 248, 0.22) !important;
  box-shadow: 0 0 10px rgba(56, 189, 248, 0.45) !important;
}

/* ==========================================================================
   7. 专属落樱微光气泡 (Mika Blossom Mist Glass)
   ========================================================================== */
div.relative.p-px.rounded-xl.bg-card-border:has([class*="user-input"]),
div.relative.p-px.rounded-xl.bg-card-border:has([class*="user"]),
div.group\\/user-input-step div.relative.p-px.rounded-xl {
  background: linear-gradient(
    135deg, 
    rgba(244, 114, 182, 0.14) 0%, 
    rgba(251, 207, 232, 0.08) 50%,
    rgba(147, 197, 253, 0.10) 100%
  ) !important;
  backdrop-filter: blur(12px) saturate(140%) !important;
  -webkit-backdrop-filter: blur(12px) saturate(140%) !important;
  border: 1px solid rgba(244, 114, 182, 0.38) !important;
  border-radius: 14px !important;
  box-shadow: 
    0 4px 16px rgba(0, 0, 0, 0.25),
    inset 0 1px 1px rgba(255, 255, 255, 0.40),
    0 0 10px rgba(244, 114, 182, 0.16) !important;
}

div.relative.flex.flex-row.items-end.gap-2.p-1\\.5.bg-card:has([class*="user"]),
div.group\\/user-input-step div.bg-card {
  background-color: transparent !important;
  background: transparent !important;
}

div.group\\/user-input-step .whitespace-pre-wrap,
[class*="user-message"] span,
[class*="user-message"] div {
  color: #ffffff !important;
  font-weight: 500 !important;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.95), 0 0 2px rgba(0, 0, 0, 0.9) !important;
}

div.group\\/user-input-step [class*="thumbnail"],
div.group\\/user-input-step img {
  border: 1px solid rgba(244, 114, 182, 0.45) !important;
  border-radius: 8px !important;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.35) !important;
}

/* 用户消息气泡右下角的返回/回滚 (Undo) 与复制工具栏 */
div.user-input-buttons-container,
[class*="user-input-buttons-container"],
div.group\\/user-input-step div.user-input-buttons-container {
  display: flex !important;
  background-color: rgba(14, 16, 28, 0.85) !important;
  backdrop-filter: blur(12px) !important;
  -webkit-backdrop-filter: blur(12px) !important;
  border: 1px solid rgba(244, 114, 182, 0.50) !important;
  border-radius: 9999px !important;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.60), 0 0 10px rgba(244, 114, 182, 0.30) !important;
  z-index: 50 !important;
  transition: opacity 0.2s ease, transform 0.2s ease !important;
}

div.group\\/user-input-step:hover div.user-input-buttons-container,
div.user-input-buttons-container:hover,
div.group\\/user-input-step:focus-within div.user-input-buttons-container {
  opacity: 1 !important;
  pointer-events: auto !important;
}

div.user-input-buttons-container button,
[class*="user-input-buttons-container"] button {
  color: #f1f5f9 !important;
  opacity: 0.90 !important;
  transition: all 0.18s ease !important;
  border-radius: 9999px !important;
  padding: 4px !important;
}

div.user-input-buttons-container button:hover,
[class*="user-input-buttons-container"] button:hover {
  color: #ffffff !important;
  background-color: rgba(244, 114, 182, 0.35) !important;
  transform: scale(1.1) !important;
}

/* 8. 底部输入框整体琉璃质感与输入卡片 */
div.relative.flex.flex-col.p-px.rounded-2xl.bg-card-border button.cursor-pointer,
div.relative.flex.flex-col.p-px.rounded-2xl.bg-card-border [role="option"] {
  border-radius: 10px !important;
  margin: 2px 0 !important;
  padding: 6px 10px !important;
  transition: all 0.18s cubic-bezier(0.16, 1, 0.3, 1) !important;
  border: 1px solid transparent !important;
}

div.relative.flex.flex-col.p-px.rounded-2xl.bg-card-border button.cursor-pointer span,
div.relative.flex.flex-col.p-px.rounded-2xl.bg-card-border button.cursor-pointer div {
  color: #ffffff !important;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.9) !important;
}

div.relative.flex.flex-col.p-px.rounded-2xl.bg-card-border button.cursor-pointer svg {
  color: #f472b6 !important;
  filter: drop-shadow(0 0 4px rgba(244, 114, 182, 0.5)) !important;
}

div.relative.flex.flex-col.p-px.rounded-2xl.bg-card-border button.cursor-pointer:hover,
div.relative.flex.flex-col.p-px.rounded-2xl.bg-card-border [role="option"][aria-selected="true"],
div.relative.flex.flex-col.p-px.rounded-2xl.bg-card-border [role="option"]:hover,
div.relative.flex.flex-col.p-px.rounded-2xl.bg-card-border [class*="hover\\:bg"]:hover {
  background: linear-gradient(
    90deg, 
    rgba(244, 114, 182, 0.28) 0%, 
    rgba(56, 189, 248, 0.20) 100%
  ) !important;
  border: 1px solid rgba(244, 114, 182, 0.50) !important;
  box-shadow: 
    0 4px 12px rgba(0, 0, 0, 0.35),
    inset 0 1px 1px rgba(255, 255, 255, 0.40),
    0 0 10px rgba(244, 114, 182, 0.25) !important;
  transform: translateX(3px) !important;
}

/* 底部实际输入卡片（下: 壁纸高亮通透呈现） */
div.rounded-2xl.bg-card-border > div.bg-card,
div.relative.flex.flex-col.p-px.rounded-2xl.bg-card-border > div.bg-card,
div.relative.flex.flex-col.p-px.rounded-2xl.bg-card-border > div.relative.flex.flex-col.gap-0,
div.relative.flex.flex-col.gap-0[class*="bg-card"],
div.bg-card:has([contenteditable="true"]),
div.bg-card:has(textarea),
div:has(> [contenteditable="true"]):not([role="dialog"] *),
div:has(> textarea):not([role="dialog"] *),
div.relative.flex.flex-col.p-px.rounded-2xl.bg-card-border > div.relative.flex.flex-col.gap-0.p-1,
div.relative.flex.flex-col.gap-0.p-1.rounded-\\[calc\\(theme\\(borderRadius\\.2xl\\)-1px\\)\\].bg-card {
  position: relative !important;
  background-image: 
    linear-gradient(
      rgba(12, 14, 24, 0.15), 
      rgba(12, 14, 24, 0.28)
    )${isBottomVideo ? '' : `,\n    url("${b64Bottom}")`} !important;
  background-size: cover !important;
  background-position: center 6% !important;
  background-repeat: no-repeat !important;
  border-radius: 15px !important;
  overflow: hidden !important;
}

.antigravity-slot-video[data-slot="bottom"] {
  position: absolute !important;
  top: 0 !important;
  left: 0 !important;
  width: 100% !important;
  height: 100% !important;
  object-fit: cover !important;
  object-position: center 6% !important;
  pointer-events: none !important;
  z-index: 0 !important;
  border-radius: 15px !important;
}

[contenteditable="true"],
textarea,
div.max-h-\\[300px\\] {
  color: #ffffff !important;
  text-shadow: 0 1px 4px rgba(0, 0, 0, 0.95), 0 0 2px rgba(0, 0, 0, 0.95) !important;
  font-weight: 500 !important;
  position: relative !important;
  z-index: 1 !important;
}

[data-placeholder]::before,
[placeholder] {
  color: rgba(255, 255, 255, 0.85) !important;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.95) !important;
}

div.relative.flex.flex-col.gap-0.p-1 button,
div.relative.flex.flex-col.gap-0.p-1 [role="button"] {
  backdrop-filter: blur(8px) !important;
  background: rgba(0, 0, 0, 0.35) !important;
  border: 1px solid rgba(255, 255, 255, 0.25) !important;
  color: #ffffff !important;
  position: relative !important;
  z-index: 1 !important;
}

/* 9. Code Blocks */
pre, code, [class*="code-block"] {
  background-color: rgba(10, 11, 20, 0.88) !important;
}

/* 10. Popovers & Dialogs 通用 */
[data-radix-popper-content],
[data-radix-menu-content],
[data-radix-dropdown-menu-content],
[data-radix-popover-content],
[data-radix-select-content],
[role="menu"],
[role="listbox"],
[cmdk-root] {
  background-color: #121322 !important;
  border: 1px solid rgba(226, 232, 240, 0.38) !important;
  border-radius: 10px !important;
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.90) !important;
  opacity: 1 !important;
  visibility: visible !important;
  z-index: 99999 !important;
}

/* ==========================================================================
   11. 【中】活跃终端专属壁纸与现代黑客风黑色极清文字 (Active Terminals)
   ========================================================================== */
div.relative.flex-1.flex.min-w-0.h-full:has(.terminal.xterm),
div.flex:has(> div > div > .terminal.xterm),
.terminal.xterm,
[data-panel="terminal"],
div:has(> .xterm) {
  border-left: 1.5px solid rgba(249, 168, 212, 0.85) !important;
  box-shadow: 
    -1px 0 6px rgba(249, 168, 212, 0.75),
    -3px 0 14px rgba(244, 114, 182, 0.45),
    -6px 0 28px rgba(244, 114, 182, 0.22) !important;
  background-color: transparent !important;
  position: relative !important;
  z-index: 10 !important;
}

.terminal.xterm,
.xterm-dom-renderer-owner-1,
div.terminal-wrapper,
div:has(> .xterm-screen) {
  position: relative !important;
  background-color: transparent !important;
  background-image: 
    linear-gradient(
      rgba(11, 12, 20, 0.12), 
      rgba(11, 12, 20, 0.18)
    )${isMidVideo ? '' : `,\n    url("${b64Mid}")`} !important;
  background-size: cover !important;
  background-position: center 20% !important;
  background-repeat: no-repeat !important;
  overflow: hidden !important;
}

.antigravity-slot-video[data-slot="mid"] {
  position: absolute !important;
  top: 0 !important;
  left: 0 !important;
  width: 100% !important;
  height: 100% !important;
  object-fit: cover !important;
  object-position: center 20% !important;
  pointer-events: none !important;
  z-index: 0 !important;
}

.terminal.xterm .xterm-viewport,
.terminal.xterm .xterm-screen,
.terminal.xterm .xterm-scrollable-element,
.terminal.xterm canvas,
.xterm,
.xterm .xterm-screen canvas {
  background-color: transparent !important;
  background: transparent !important;
  position: relative !important;
  z-index: 1 !important;
}

/* 终端字体：升级为圆润可爱带中文等宽的 Maple Mono NF CN 现代编程字体 */
.xterm-char-measure-element {
  font-family: 'Maple Mono NF CN', 'Maple Mono CN', 'Maple Mono', monospace !important;
  font-weight: 500 !important;
  font-size: 13px !important;
  letter-spacing: 0px !important;
}

.terminal.xterm,
.terminal.xterm .xterm-rows,
.terminal.xterm .xterm-rows span,
.terminal.xterm .xterm-rows div,
.terminal.xterm span,
.terminal.xterm div {
  font-family: 'Maple Mono NF CN', 'Maple Mono CN', 'Maple Mono', 'Sarasa Term SC', 'LXGW WenKai Mono', 'Microsoft YaHei UI', monospace !important;
  font-feature-settings: 'liga' 1, 'calt' 1 !important;
  color: #05070d !important;
  font-weight: 600 !important;
  letter-spacing: 0px !important;
  text-shadow: 
    0 0 2px #ffffff,
    0 1px 2px rgba(255, 255, 255, 0.98),
    0 0 1px #ffffff,
    0 0 5px rgba(255, 255, 255, 0.85) !important;
}

/* 终端彩色语法项 */
.terminal.xterm [class*="xterm-color-0"] { color: #334155 !important; }
.terminal.xterm [class*="xterm-color-1"], .terminal.xterm [class*="xterm-fg-1"] { color: #b91c1c !important; text-shadow: 0 0 2px #ffffff, 0 1px 2px #fff !important; }
.terminal.xterm [class*="xterm-color-2"], .terminal.xterm [class*="xterm-fg-2"] { color: #047857 !important; text-shadow: 0 0 2px #ffffff, 0 1px 2px #fff !important; }
.terminal.xterm [class*="xterm-color-3"], .terminal.xterm [class*="xterm-fg-3"] { color: #b45309 !important; text-shadow: 0 0 2px #ffffff, 0 1px 2px #fff !important; }
.terminal.xterm [class*="xterm-color-4"], .terminal.xterm [class*="xterm-fg-4"] { color: #1d4ed8 !important; text-shadow: 0 0 2px #ffffff, 0 1px 2px #fff !important; }
.terminal.xterm [class*="xterm-color-5"], .terminal.xterm [class*="xterm-fg-5"] { color: #be185d !important; text-shadow: 0 0 2px #ffffff, 0 1px 2px #fff !important; }
.terminal.xterm [class*="xterm-color-6"], .terminal.xterm [class*="xterm-fg-6"] { color: #0f766e !important; text-shadow: 0 0 2px #ffffff, 0 1px 2px #fff !important; }
.terminal.xterm [class*="xterm-color-7"], .terminal.xterm [class*="xterm-fg-7"] { color: #0f172a !important; text-shadow: 0 0 2px #ffffff, 0 1px 2px #fff !important; }

/* 终端光标：深曜黑搭配霓虹绯红外发光边框 */
.xterm .xterm-cursor-block, 
.xterm .xterm-cursor,
.xterm-cursor-layer .xterm-cursor {
  background-color: #090d16 !important;
  border: 1.5px solid #f472b6 !important;
  box-shadow: 0 0 10px #f472b6, 0 0 16px rgba(244, 114, 182, 0.7) !important;
}

/* 顶部两层顶栏彻底透明化与琉璃化 */
div.shrink-0.flex.items-center.gap-0.5.border-b.pl-1.5.pr-9,
div:has(> div > div > .terminal.xterm) div.shrink-0.flex.items-center.gap-0.5.border-b,
header div.shrink-0.flex.items-center.gap-0.5.border-b {
  background-color: rgba(14, 16, 28, 0.22) !important;
  backdrop-filter: blur(14px) saturate(140%) !important;
  -webkit-backdrop-filter: blur(14px) saturate(140%) !important;
  border-bottom: 1px solid rgba(255, 255, 255, 0.10) !important;
}

div.flex.items-center.justify-between.pl-3.pr-2.py-1,
div.group\\/file-row:has([class*="font-medium"]),
div:has(> div > div > .terminal.xterm) div.flex.items-center.justify-between.pl-3.pr-2.py-1 {
  background-color: rgba(11, 12, 20, 0.18) !important;
  backdrop-filter: blur(14px) saturate(140%) !important;
  -webkit-backdrop-filter: blur(14px) saturate(140%) !important;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08) !important;
}

div.shrink-0.flex.items-center.gap-0.5.border-b button,
div.flex.items-center.justify-between.pl-3.pr-2.py-1 button,
div.group\\/file-row button {
  background-color: rgba(255, 255, 255, 0.08) !important;
  border: 1px solid rgba(255, 255, 255, 0.14) !important;
  border-radius: 6px !important;
  color: #f1f5f9 !important;
  transition: all 0.18s ease !important;
}

div.shrink-0.flex.items-center.gap-0.5.border-b button:hover,
div.flex.items-center.justify-between.pl-3.pr-2.py-1 button:hover,
div.group\\/file-row button:hover {
  background-color: rgba(244, 63, 94, 0.30) !important;
  border-color: rgba(244, 63, 94, 0.65) !important;
  box-shadow: 0 0 10px rgba(244, 63, 94, 0.40) !important;
}

div.flex.items-center.justify-between.pl-3.pr-2.py-1 span,
div.group\\/file-row span {
  color: #ffffff !important;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.9) !important;
  font-weight: 600 !important;
}

.xterm .xterm-viewport::-webkit-scrollbar {
  width: 5px !important;
  background-color: transparent !important;
  border-radius: 4px !important;
}
.xterm .xterm-viewport::-webkit-scrollbar-thumb {
  background-color: rgba(244, 63, 94, 0.40) !important;
  border-radius: 4px !important;
}
.xterm .xterm-viewport::-webkit-scrollbar-thumb:hover {
  background-color: rgba(244, 63, 94, 0.70) !important;
}

/* ==========================================================================
   12. 【右】独立侧栏壁纸 + 极简纯净无杂线琉璃质感 (Right Drawer)
   ========================================================================== */
div[data-aux-pane-open="true"],
[class*="terminal-drawer"] {
  position: relative !important;
  background-color: transparent !important;
  background-image: 
    linear-gradient(
      rgba(11, 12, 20, 0.12), 
      rgba(11, 12, 20, 0.20)
    )${isRightVideo ? '' : `,\n    url("${b64Right}")`} !important;
  background-size: cover !important;
  background-position: center 20% !important;
  background-repeat: no-repeat !important;
  border-left: 1.5px solid rgba(249, 168, 212, 0.85) !important;
  box-shadow: 
    -1px 0 6px rgba(249, 168, 212, 0.75),
    -3px 0 14px rgba(244, 114, 182, 0.45),
    -6px 0 28px rgba(244, 114, 182, 0.22) !important;
  z-index: 10 !important;
  overflow: hidden !important;
}

div[data-aux-pane-open="true"] [aria-label="Auxiliary Pane"],
div[data-aux-pane-open="true"] div.flex.flex-col.gap-2.overflow-y-auto.h-full.w-full.bg-background,
div[data-aux-pane-open="true"] > div {
  background-color: transparent !important;
  background-image: none !important;
  background: transparent !important;
  border-left: none !important;
  box-shadow: none !important;
}

.antigravity-slot-video[data-slot="right"] {
  position: absolute !important;
  top: 0 !important;
  left: 0 !important;
  width: 100% !important;
  height: 100% !important;
  object-fit: cover !important;
  object-position: center 20% !important;
  pointer-events: none !important;
  z-index: 0 !important;
}

div:has(#antigravity\\\\.agentSidePanelInputBox) > div,
div:has(#antigravity\\\\.agentSidePanelInputBox) .overflow-y-auto {
  background-color: transparent !important;
  background: transparent !important;
}

/* 侧边栏“对话”顶栏 */
div.flex.flex-col.gap-2.overflow-y-auto.h-full.w-full.bg-background div.flex.w-full.items-center.justify-between.select-none.pl-4.pr-3,
div.flex.flex-col.gap-2.overflow-y-auto.h-full.w-full.bg-background div.flex.w-full.items-center.justify-between.gap-1\\.5.select-none {
  background-color: transparent !important;
  border: none !important;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08) !important;
  box-shadow: none !important;
  padding-top: 6px !important;
  padding-bottom: 6px !important;
  margin-bottom: 4px !important;
}

div.flex.flex-col.gap-2.overflow-y-auto.h-full.w-full.bg-background div.flex.w-full.items-center.justify-between.select-none.pl-4.pr-3 span,
div.flex.flex-col.gap-2.overflow-y-auto.h-full.w-full.bg-background div.flex.w-full.items-center.justify-between.gap-1\\.5.select-none span {
  color: #fdf2f8 !important;
  font-weight: 600 !important;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.8) !important;
}

div.flex.flex-col.gap-2.overflow-y-auto.h-full.w-full.bg-background div.flex.w-full.items-center.justify-between.gap-1\\.5.px-2.py-1.text-sm.rounded-md,
div.flex.flex-col.gap-2.overflow-y-auto.h-full.w-full.bg-background [class*="item"],
div.flex.flex-col.gap-2.overflow-y-auto.h-full.w-full.bg-background div.relative.flex.items-center,
div.flex.flex-col.gap-2.overflow-y-auto.h-full.w-full.bg-background button {
  background-color: rgba(14, 16, 30, 0.40) !important;
  backdrop-filter: blur(12px) !important;
  -webkit-backdrop-filter: blur(12px) !important;
  border: 1px solid rgba(255, 255, 255, 0.12) !important;
  border-radius: 8px !important;
  color: #ffffff !important;
  font-weight: 500 !important;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.9) !important;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.25) !important;
  transition: all 0.2s ease !important;
}

div.flex.flex-col.gap-2.overflow-y-auto.h-full.w-full.bg-background div.flex.w-full.items-center.justify-between.gap-1\\.5.px-2.py-1.text-sm.rounded-md:hover,
div.flex.flex-col.gap-2.overflow-y-auto.h-full.w-full.bg-background button:hover {
  background: linear-gradient(
    90deg, 
    rgba(244, 114, 182, 0.28) 0%, 
    rgba(56, 189, 248, 0.20) 100%
  ) !important;
  border-color: rgba(244, 114, 182, 0.60) !important;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.45) !important;
  transform: translateY(-1px) !important;
}

div.flex.flex-col.gap-2.overflow-y-auto.h-full.w-full.bg-background div:not([class*="user-input-step"]):not([class*="bg-card-border"]) {
  border-color: transparent !important;
}

/* ==========================================================================
   16. 【设置】设置对话框专属插画壁纸与水晶磨砂视效
   ========================================================================== */
[data-radix-dialog-overlay] {
  background-color: rgba(5, 7, 16, 0.72) !important;
  backdrop-filter: blur(14px) !important;
  -webkit-backdrop-filter: blur(14px) !important;
  z-index: 998 !important;
}

[role="dialog"],
div[data-state="open"]:has(div.bg-sidebar),
div.settings-modal-container {
  position: relative !important;
  background-image: 
    linear-gradient(
      rgba(8, 10, 20, 0.20), 
      rgba(8, 10, 20, 0.35)
    )${isSettingsVideo ? '' : `,\n    url("${b64Settings}")`} !important;
  background-size: cover !important;
  background-position: center 65% !important;
  background-repeat: no-repeat !important;
  border: 1.5px solid rgba(151, 213, 255, 0.45) !important;
  border-radius: 20px !important;
  box-shadow: 
    0 24px 70px rgba(0, 0, 0, 0.85),
    0 0 35px rgba(151, 213, 255, 0.22) !important;
  overflow: hidden !important;
  z-index: 1000 !important;
}

.antigravity-slot-video[data-slot="settings"] {
  position: absolute !important;
  top: 0 !important;
  left: 0 !important;
  width: 100% !important;
  height: 100% !important;
  object-fit: cover !important;
  object-position: center 65% !important;
  pointer-events: none !important;
  z-index: 0 !important;
  border-radius: 20px !important;
}

[role="dialog"] .bg-background,
[role="dialog"] [class*="bg-background"],
[role="dialog"] div.flex-1,
[role="dialog"] div.h-full.w-full,
[role="dialog"] div.relative.w-full.h-full,
[role="dialog"] div.flex.h-full.overflow-auto,
[role="dialog"] div.grow.w-full,
[role="dialog"] div.overflow-y-auto,
[role="dialog"] div.overflow-auto,
[role="dialog"] div.overflow-hidden {
  background-color: transparent !important;
  background: transparent !important;
}

[role="dialog"] div.bg-sidebar,
[role="dialog"] [class*="bg-sidebar"],
[role="dialog"] div.flex:has(> div.h-full.w-full.flex.flex-col.bg-sidebar) {
  background-color: rgba(9, 12, 24, 0.60) !important;
  backdrop-filter: blur(24px) saturate(160%) !important;
  -webkit-backdrop-filter: blur(24px) saturate(160%) !important;
  border-right: 1px solid rgba(255, 255, 255, 0.12) !important;
  box-shadow: 4px 0 20px rgba(0, 0, 0, 0.30) !important;
}

[role="dialog"] div.bg-sidebar button {
  background-color: transparent !important;
  border-radius: 10px !important;
  border: 1px solid transparent !important;
  color: #e2e8f0 !important;
  margin-top: 2px !important;
  margin-bottom: 2px !important;
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1) !important;
}

[role="dialog"] div.bg-sidebar button span,
[role="dialog"] div.bg-sidebar button svg {
  color: #f1f5f9 !important;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.8) !important;
}

[role="dialog"] div.bg-sidebar button:hover,
[role="dialog"] div.bg-sidebar button[data-state="active"],
[role="dialog"] div.bg-sidebar button[aria-selected="true"],
[role="dialog"] div.bg-sidebar button.bg-sidebar-muted,
[role="dialog"] div.bg-sidebar button[class*="hover\\:bg"] {
  background: linear-gradient(
    90deg, 
    rgba(56, 189, 248, 0.32) 0%, 
    rgba(147, 197, 253, 0.20) 100%
  ) !important;
  border: 1px solid rgba(151, 213, 255, 0.55) !important;
  box-shadow: 
    0 4px 14px rgba(0, 0, 0, 0.35),
    inset 0 1px 1px rgba(255, 255, 255, 0.35),
    0 0 12px rgba(56, 189, 248, 0.25) !important;
  transform: translateX(3px) !important;
}

[role="dialog"] div.bg-sidebar div.border-t,
[role="dialog"] div.bg-sidebar [class*="border-t"] {
  border-top: 1px solid rgba(255, 255, 255, 0.12) !important;
  background-color: transparent !important;
}

[role="dialog"] div.rounded-xl.border,
[role="dialog"] div[class*="rounded-xl"][class*="border"],
[role="dialog"] div[class*="divide-y"] {
  background-color: rgba(12, 16, 32, 0.58) !important;
  backdrop-filter: blur(20px) saturate(150%) !important;
  -webkit-backdrop-filter: blur(20px) saturate(150%) !important;
  border: 1px solid rgba(255, 255, 255, 0.15) !important;
  border-radius: 14px !important;
  box-shadow: 
    0 8px 30px rgba(0, 0, 0, 0.35),
    inset 0 1px 1px rgba(255, 255, 255, 0.20),
    0 0 16px rgba(151, 213, 255, 0.10) !important;
}

[role="dialog"] div.divide-y > *,
[role="dialog"] div.divide-border > * {
  border-color: rgba(255, 255, 255, 0.10) !important;
}

[role="dialog"] h1, [role="dialog"] h2, [role="dialog"] h3,
[role="dialog"] [class*="font-semibold"], [role="dialog"] [class*="font-medium"] {
  color: #ffffff !important;
  text-shadow: 0 1px 4px rgba(0, 0, 0, 0.95), 0 0 2px rgba(0, 0, 0, 0.8) !important;
}

[role="dialog"] p, [role="dialog"] [class*="text-muted-foreground"],
[role="dialog"] [class*="text-secondary-foreground"], [role="dialog"] span {
  color: #f1f5f9 !important;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.9) !important;
}

[role="dialog"] [role="combobox"], [role="dialog"] select, [role="dialog"] [role="group"],
[role="dialog"] div.inline-flex.items-center.rounded-lg.border {
  background-color: rgba(18, 22, 44, 0.88) !important;
  border: 1px solid rgba(151, 213, 255, 0.40) !important;
  color: #ffffff !important;
  border-radius: 8px !important;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3) !important;
}

[role="dialog"] button.inline-flex,
[role="dialog"] a.select-none.rounded,
[role="dialog"] [class*="grow"] button {
  backdrop-filter: blur(8px) !important;
  background-color: rgba(26, 32, 60, 0.82) !important;
  border: 1px solid rgba(151, 213, 255, 0.35) !important;
  color: #ffffff !important;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.8) !important;
  border-radius: 8px !important;
  transition: all 0.2s ease !important;
}

[role="dialog"] button.inline-flex:hover,
[role="dialog"] a.select-none.rounded:hover,
[role="dialog"] [class*="grow"] button:hover {
  background-color: rgba(56, 189, 248, 0.40) !important;
  border-color: rgba(151, 213, 255, 0.85) !important;
  box-shadow: 0 0 14px rgba(56, 189, 248, 0.45) !important;
  color: #ffffff !important;
}

[role="dialog"] [role="group"] button {
  border-radius: 6px !important;
  margin: 1px !important;
}

[role="dialog"] button[role="switch"][aria-checked="true"],
[role="dialog"] button[role="switch"][data-state="checked"] {
  background-color: #38bdf8 !important;
  box-shadow: 0 0 12px rgba(56, 189, 248, 0.65) !important;
}

[role="dialog"] > button:first-child,
[role="dialog"] button:has(> svg.text-main-foreground) {
  background-color: rgba(255, 255, 255, 0.12) !important;
  border-radius: 50% !important;
  transition: all 0.2s ease !important;
}

[role="dialog"] > button:first-child:hover,
[role="dialog"] button:has(> svg.text-main-foreground):hover {
  background-color: rgba(244, 114, 182, 0.40) !important;
  box-shadow: 0 0 14px rgba(244, 114, 182, 0.6) !important;
  transform: rotate(90deg) !important;
}

/* ==========================================================================
   Antigravity Dynamic Wallpaper Video Elements
   ========================================================================== */
.antigravity-slot-video {
  pointer-events: none !important;
  user-select: none !important;
  -webkit-user-select: none !important;
  will-change: transform !important;
}
`;
}

function getClientVideoScript(config) {
  const configJson = JSON.stringify(config || {});
  return `
  (function() {
    const SERVER_URL = 'http://127.0.0.1:${DEFAULT_PORT}';
    const config = ${configJson};

    function applyVideos() {
      // 1. Slot: left (Global base wallpaper)
      const left = config.left;
      const allLeftVids = document.querySelectorAll('#antigravity-video-left, .antigravity-slot-video[data-slot="left"]');
      if (left && left.type === 'video' && left.file) {
        const vParam = (left && left.version) ? ('?v=' + left.version) : ('?v=' + Date.now());
        const src = SERVER_URL + '/' + encodeURIComponent(left.file) + vParam;
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
            if (leftVid.paused) leftVid.play().catch(function() {});
          });
          leftVid.addEventListener('loadeddata', function() {
            if (leftVid.paused) leftVid.play().catch(function() {});
          });
          (document.body || document.documentElement).prepend(leftVid);
        }
        if (leftVid.dataset.currentSrc !== src || leftVid.error || leftVid.readyState === 0) {
          leftVid.dataset.currentSrc = src;
          leftVid.src = src;
          leftVid.load();
        }
        if (leftVid.paused) {
          leftVid.play().catch(function() {});
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

      // 2. Container slots: mid, right, bottom, settings
      const slotSelectors = {
        'mid': [
          '.terminal.xterm',
          'div.terminal-wrapper',
          '[data-panel="terminal"]'
        ],
        'right': [
          'div[data-aux-pane-open="true"]',
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
        const vParam = (slotData && slotData.version) ? ('?v=' + slotData.version) : ('?v=' + Date.now());
        const src = isVideo ? (SERVER_URL + '/' + encodeURIComponent(slotData.file) + vParam) : null;
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
                if (slotKey === 'right' && (el.querySelector('#antigravity\\.agentSidePanelInputBox') || el.querySelector('[id="antigravity.agentSidePanelInputBox"]'))) {
                  continue;
                }
                targetContainer = el;
                break;
              }
            } catch (e) {}
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
                if (vid.paused) vid.play().catch(function() {});
              });
              vid.addEventListener('loadeddata', function() {
                if (vid.paused) vid.play().catch(function() {});
              });
              const pos = window.getComputedStyle(targetContainer).position;
              if (!pos || pos === 'static') {
                targetContainer.style.position = 'relative';
              }
              targetContainer.prepend(vid);
            }
            if (vid.dataset.currentSrc !== src || vid.error || vid.readyState === 0) {
              vid.dataset.currentSrc = src;
              vid.src = src;
              vid.load();
            }
            if (vid.paused) {
              vid.play().catch(function() {});
            }
          }
        }
      }
    }

    window.__antigravityActiveConfig = config;
    window.__antigravityApplyVideos = applyVideos;
    applyVideos();

    if (!window.__antigravityVideoObserver) {
      let debounceTimer = null;
      const scheduledApply = function() {
        if (debounceTimer) return;
        debounceTimer = setTimeout(function() {
          debounceTimer = null;
          if (window.__antigravityApplyVideos) {
            window.__antigravityApplyVideos();
          }
        }, 150);
      };

      window.__antigravityVideoObserver = new MutationObserver(scheduledApply);
      window.__antigravityVideoObserver.observe(document.body || document.documentElement, {
        childList: true,
        subtree: true
      });
      setInterval(function() {
        if (window.__antigravityApplyVideos) {
          window.__antigravityApplyVideos();
        }
      }, 3000);
    }
  })();
  `;
}

function triggerLiveHotReload(css, slotsConfig, onComplete) {
  return new Promise((resolve) => {
    const finish = () => {
      if (typeof onComplete === 'function') {
        try { onComplete(); } catch (e) {}
      }
      resolve(true);
    };

    try {
      const activeConfig = loadSlotsConfig();
      const activeCss = css || (fs.existsSync(customCssPath) ? fs.readFileSync(customCssPath, 'utf-8') : '');
      http.get('http://127.0.0.1:8314/json', (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const list = JSON.parse(data);
            const page = list.find(p => p.type === 'page');
            if (page) {
              const ws = new WebSocket(page.webSocketDebuggerUrl);
              ws.addEventListener('open', () => {
                const videoScript = getClientVideoScript(activeConfig);
                const applyCode = `
                  (function() {
                    let s = document.getElementById('antigravity-custom-theme');
                    if (!s) {
                      s = document.createElement('style');
                      s.id = 'antigravity-custom-theme';
                      document.head.appendChild(s);
                    }
                    s.textContent = ${JSON.stringify(activeCss)};

                    ${videoScript}

                    return "Live theme & video hot-reloaded!";
                  })()
                `;
                ws.send(JSON.stringify({ id: 1, method: 'Runtime.evaluate', params: { expression: applyCode } }));
                setTimeout(() => {
                  try { ws.close(); } catch(e) {}
                  finish();
                }, 400);
              });
              ws.addEventListener('error', finish);
            } else {
              finish();
            }
          } catch (e) {
            finish();
          }
        });
      }).on('error', finish);
    } catch (e) {
      finish();
    }
  });
}

async function swapWallpaper(slotInput, srcPath) {
  if (!slotInput) {
    console.error('❌ 请提供槽位名称: 左, 中, 右, 下, 设置');
    return false;
  }
  const slotKey = SLOT_ALIASES[slotInput.toLowerCase()];
  if (!slotKey || !SLOTS_META[slotKey]) {
    console.error(`❌ 未知槽位: "${slotInput}"。支持的槽位为: 左, 中, 右, 下, 设置`);
    return false;
  }

  if (!fs.existsSync(srcPath)) {
    console.error(`❌ 壁纸素材不存在: ${srcPath}`);
    return false;
  }

  const stat = fs.statSync(srcPath);
  if (!stat.isFile()) {
    console.error(`❌ 指定路径不是文件: ${srcPath}`);
    return false;
  }

  const ext = path.extname(srcPath).toLowerCase();
  const isVideo = VIDEO_EXTS.has(ext);
  const isImage = IMAGE_EXTS.has(ext);

  if (!isVideo && !isImage) {
    console.error(`❌ 不支持的文件格式: "${ext}"`);
    console.error(`   支持的视频格式: ${Array.from(VIDEO_EXTS).join(', ')}`);
    console.error(`   支持的图片格式: ${Array.from(IMAGE_EXTS).join(', ')}`);
    return false;
  }

  const slotMeta = SLOTS_META[slotKey];
  const targetFileName = `${slotKey === 'bottom' ? 'input' : slotKey}_wallpaper${ext}`;
  const targetPath = path.join(wallpapersDir, targetFileName);

  console.log(`[1/4] 正在更新【${slotInput} (${slotMeta.desc})】的壁纸素材...`);
  console.log(`      素材类型: ${isVideo ? '🎬 动态视频 (' + ext + ')' : '🖼️ 静态图像 (' + ext + ')'}`);

  if (path.resolve(srcPath) !== path.resolve(targetPath)) {
    fs.copyFileSync(srcPath, targetPath);
  }
  console.log(`✓ 成功写入文件: ${targetPath}`);

  // 更新槽位状态配置
  const slotsConfig = loadSlotsConfig();
  slotsConfig[slotKey] = {
    key: slotKey,
    file: targetFileName,
    type: isVideo ? 'video' : 'image',
    version: Date.now(),
    desc: slotMeta.desc
  };
  saveSlotsConfig(slotsConfig);
  console.log(`✓ slots_config.json 已更新配置`);

  console.log(`[2/4] 重新编译并输出 custom_theme.css...`);
  const css = generateMasterCss(slotsConfig);
  fs.writeFileSync(customCssPath, css, 'utf-8');
  console.log(`✓ custom_theme.css 已更新 (${(css.length / 1024 / 1024).toFixed(2)} MB)`);

  console.log(`[3/4] 启动 / 校验动态壁纸本地流媒体服务器 (8315)...`);
  await ensureMediaServer(wallpapersDir, DEFAULT_PORT);

  console.log(`[4/4] 触发界面热重载与实时生效...`);
  const reloadPromise = await triggerLiveHotReload(css, slotsConfig);

  console.log(`✨ 【${slotInput}】壁纸更换完成！已实时生效。`);
  return reloadPromise;
}

async function revertToBaseline() {
  console.log(`正在从黄金基线【初版】恢复...`);
  if (!fs.existsSync(baselineDir)) {
    console.error(`❌ 未找到初版备份目录: ${baselineDir}`);
    return false;
  }
  const baselineCssPath = path.join(baselineDir, 'custom_theme.css');
  const baselineWallpapers = path.join(baselineDir, 'wallpapers');
  
  if (fs.existsSync(baselineWallpapers)) {
    fs.readdirSync(baselineWallpapers).forEach(f => {
      fs.copyFileSync(path.join(baselineWallpapers, f), path.join(wallpapersDir, f));
    });
  }

  // 重置槽位为初始全静态图片
  const baselineConfig = {};
  for (const [key, meta] of Object.entries(SLOTS_META)) {
    baselineConfig[key] = {
      key,
      file: meta.defaultFile,
      type: 'image',
      version: Date.now(),
      desc: meta.desc
    };
  }
  saveSlotsConfig(baselineConfig);

  console.log(`✓ 初版文件已全部还原，正在重新编译并输出黄金基线样式...`);
  const css = generateMasterCss(baselineConfig);
  fs.writeFileSync(customCssPath, css, 'utf-8');

  // Also update baselineCssPath so that baseline backup does not contain stale buggy selectors
  if (fs.existsSync(baselineCssPath)) {
    fs.writeFileSync(baselineCssPath, css, 'utf-8');
  }

  console.log(`✓ 黄金基线样式表已生成 (${(css.length / 1024 / 1024).toFixed(2)} MB)，正在热重载...`);
  const reloadPromise = await triggerLiveHotReload(css, baselineConfig);
  console.log(`✨ 成功还原为【初版】黄金基线！`);
  return reloadPromise;
}

function listSlotsStatus() {
  const config = loadSlotsConfig();
  console.log('=======================================================');
  console.log('   🌸 Antigravity 壁纸槽位状态一览');
  console.log('=======================================================');
  console.log('');
  for (const [key, item] of Object.entries(config)) {
    const isVid = item.type === 'video';
    const typeLabel = isVid ? '🎬 [动态视频]' : '🖼️ [静态壁纸]';
    const filePath = path.join(wallpapersDir, item.file);
    const exists = fs.existsSync(filePath);
    const size = exists ? (fs.statSync(filePath).size / 1024 / 1024).toFixed(2) + ' MB' : '未找到文件';
    console.log(`槽位 [${key.padEnd(8)}] (${item.desc}):`);
    console.log(`   类型: ${typeLabel}`);
    console.log(`   文件: ${item.file} (${size})`);
    console.log('');
  }
}

async function swapWallpaperFromWE(idOrIndex, slotInput) {
  const wallpaper = getWallpaperById(idOrIndex);
  if (!wallpaper) {
    console.error(`❌ 未在 Steam Wallpaper Engine 创意工坊中找到壁纸: "${idOrIndex}"`);
    console.error(`   提示: 可使用 node core/theme_engine.js --list-we 查看已安装壁纸列表与对应序号/ID。`);
    return false;
  }

  const slotKey = SLOT_ALIASES[slotInput ? slotInput.toLowerCase() : ''];
  if (!slotKey) {
    console.error(`❌ 未知槽位: "${slotInput}"。支持的槽位为: 左, 中, 右, 下, 设置`);
    return false;
  }

  console.log(`🎮 从 Steam Wallpaper Engine 选定壁纸: 【${wallpaper.title}】 (ID: ${wallpaper.id})`);
  console.log(`   素材类型: ${wallpaper.mediaType === 'video' ? '🎬 动态视频' : '🖼️ 静态图像'} (${wallpaper.file})`);
  console.log(`   原始类型: ${wallpaper.rawType} | 大小: ${wallpaper.sizeMb} MB`);
  console.log(`   素材路径: ${wallpaper.mediaPath}`);

  return swapWallpaper(slotInput, wallpaper.mediaPath);
}

function listWallpaperEngineWallpapers(search = '', limit = 50) {
  const list = scanWorkshopWallpapers({ search });
  console.log(formatWallpaperTable(list, limit));
  return list;
}

if (require.main === module) {
  const args = process.argv.slice(2);
  if (args[0] === '--swap' && args[1] && args[2]) {
    swapWallpaper(args[1], args[2]).then(ok => {
      if (!ok) process.exit(1);
    }).catch(err => {
      console.error(err);
      process.exit(1);
    });
  } else if (args[0] === '--swap-we' || args[0] === '--we-swap') {
    let targetId = args[1];
    let targetSlot = args[2];
    // If user passed slot first, e.g. --swap-we 左 3148864242
    if (SLOT_ALIASES[targetId?.toLowerCase()] && !SLOT_ALIASES[targetSlot?.toLowerCase()]) {
      const tmp = targetId;
      targetId = targetSlot;
      targetSlot = tmp;
    }
    if (!targetId || !targetSlot) {
      console.error('❌ 参数错误。用法: node core/theme_engine.js --swap-we <壁纸序号/创意工坊ID> <槽位(左/中/右/下/设置)>');
      process.exit(1);
    } else {
      swapWallpaperFromWE(targetId, targetSlot).then(ok => {
        if (!ok) process.exit(1);
      }).catch(err => {
        console.error(err);
        process.exit(1);
      });
    }
  } else if (args[0] === '--list-we' || args[0] === '--we-list' || args[0] === '-we') {
    const search = args.slice(1).join(' ');
    listWallpaperEngineWallpapers(search);
  } else if (args[0] === '--set-left' && args[1]) {
    swapWallpaper('左', args[1]);
  } else if (args[0] === '--set-mid' && args[1]) {
    swapWallpaper('中', args[1]);
  } else if (args[0] === '--set-right' && args[1]) {
    swapWallpaper('右', args[1]);
  } else if (args[0] === '--set-bottom' && args[1]) {
    swapWallpaper('下', args[1]);
  } else if (args[0] === '--set-settings' && args[1]) {
    swapWallpaper('设置', args[1]);
  } else if (args[0] === '--status' || args[0] === '--list' || args[0] === '-l') {
    listSlotsStatus();
  } else if (args[0] === '--server') {
    console.log('启动动态壁纸流媒体服务器...');
    startMediaServer(wallpapersDir, DEFAULT_PORT, () => {
      console.log(`Media server running at http://127.0.0.1:${DEFAULT_PORT}`);
    });
  } else if (args[0] === '--baseline' || args[0] === '--revert-baseline' || args[0] === '--restore-baseline') {
    revertToBaseline().then(ok => {
      if (!ok) process.exit(1);
    }).catch(err => {
      console.error(err);
      process.exit(1);
    });
  } else if (args[0] === '--rebuild') {
    const slotsConfig = loadSlotsConfig();
    const css = generateMasterCss(slotsConfig);
    fs.writeFileSync(customCssPath, css, 'utf-8');
    console.log(`✓ custom_theme.css 重构完成 (${(css.length / 1024 / 1024).toFixed(2)} MB)`);
    startMediaServer(wallpapersDir, DEFAULT_PORT);
    triggerLiveHotReload(css, slotsConfig, () => {
      http.get('http://127.0.0.1:8314/json', (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const list = JSON.parse(data);
            const page = list.find(p => p.type === 'page');
            if (page) {
              const ws = new WebSocket(page.webSocketDebuggerUrl);
              ws.addEventListener('open', () => {
                ws.send(JSON.stringify({
                  id: 2,
                  method: 'Page.captureScreenshot',
                  params: { format: 'png' }
                }));
              });
              ws.addEventListener('message', (event) => {
                const resp = JSON.parse(event.data);
                if (resp.id === 2 && resp.result && resp.result.data) {
                  fs.writeFileSync(path.join(antigravityDir, 'live_preview.png'), Buffer.from(resp.result.data, 'base64'));
                  console.log('Saved live screenshot to ' + path.join(antigravityDir, 'live_preview.png'));
                  ws.close();
                }
              });
            }
          } catch (e) {}
        });
      }).on('error', () => {});
    });
  } else {
    listSlotsStatus();
  }
}

module.exports = {
  swapWallpaper,
  swapWallpaperFromWE,
  listWallpaperEngineWallpapers,
  scanWorkshopWallpapers,
  getWallpaperById,
  formatWallpaperTable,
  generateMasterCss,
  revertToBaseline,
  loadSlotsConfig,
  saveSlotsConfig,
  getClientVideoScript,
  listSlotsStatus,
  SLOTS,
  SLOTS_META,
  SLOT_ALIASES,
  VIDEO_EXTS,
  IMAGE_EXTS
};

