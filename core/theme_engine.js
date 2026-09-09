const fs = require('fs');
const path = require('path');
const http = require('http');

const os = require('os');

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

function getBase64(filename) {
  const filePath = path.join(wallpapersDir, filename);
  if (!fs.existsSync(filePath)) {
    console.warn(`Warning: ${filename} not found in wallpapers directory.`);
    return '';
  }
  const buf = fs.readFileSync(filePath);
  const isPng = buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4E && buf[3] === 0x47;
  const mime = isPng ? 'image/png' : 'image/jpeg';
  return `data:${mime};base64,` + buf.toString('base64');
}

function generateMasterCss() {
  const b64Left = getBase64('left_wallpaper.jpg');
  const b64Mid = getBase64('mid_wallpaper.jpg');
  const b64Right = getBase64('right_wallpaper.jpg');
  const b64Bottom = getBase64('input_wallpaper.jpg');
  const b64Settings = getBase64('settings_wallpaper.png');

  return `/* ==========================================================================
   Antigravity 2.0 Master Custom Theme - 5-Slot Live Modular Edition (初版 Baseline v1.0)
   Slots: [左: 主对话区/全局底图] | [中: 活跃终端壁纸] | [右: 极简无杂线侧栏壁纸] | [下: 底部输入框] | [设置: 设置弹窗]
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

/* 2. Fullscreen GPU-Accelerated Unified Base Wallpaper (左: 圣园未花全局底图) */
body::before {
  content: "" !important;
  position: fixed !important;
  top: 0 !important;
  left: 0 !important;
  right: 0 !important;
  bottom: 0 !important;
  width: 100vw !important;
  height: 100vh !important;
  background-image: 
    linear-gradient(
      rgba(11, 12, 20, 0.06), 
      rgba(11, 12, 20, 0.10)
    ),
    url("${b64Left}") !important;
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
   7. 圣园未花专属·极轻透落樱粉雾气泡 (Mika Blossom Mist Glass - 原版微光)
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
  opacity: 1 !important;
  background-color: rgba(244, 114, 182, 0.35) !important;
  box-shadow: 0 0 10px rgba(244, 114, 182, 0.50) !important;
  transform: scale(1.1) !important;
}

div.user-input-buttons-container button[aria-label*="Undo"]:hover,
div.user-input-buttons-container button[aria-label*="Undo changes"]:hover {
  color: #38bdf8 !important;
  background-color: rgba(56, 189, 248, 0.35) !important;
  box-shadow: 0 0 10px rgba(56, 189, 248, 0.60) !important;
}

/* ==========================================================================
   8. 底部输入栏与悬浮任务/排队状态窗 (Bottom Bar & Queue Glass)
   ========================================================================== */
footer div.flex.flex-col.rounded-2xl.border.bg-card,
div.flex.flex-col.p-2\\.5.pl-3.rounded-2xl.border.bg-card {
  background: linear-gradient(
    145deg, 
    rgba(22, 24, 40, 0.70) 0%, 
    rgba(32, 22, 42, 0.75) 50%,
    rgba(18, 20, 36, 0.78) 100%
  ) !important;
  backdrop-filter: blur(20px) saturate(160%) !important;
  -webkit-backdrop-filter: blur(20px) saturate(160%) !important;
  border: 1.5px solid rgba(244, 114, 182, 0.45) !important;
  box-shadow: 
    0 8px 24px rgba(0, 0, 0, 0.45),
    0 0 14px rgba(244, 114, 182, 0.20) !important;
  margin-bottom: 6px !important;
}

footer [class*="bg-card"] pre,
footer [class*="bg-card"] div.rounded-lg,
footer [class*="bg-card"] [class*="rounded"] {
  background-color: rgba(10, 11, 20, 0.55) !important;
  border-color: rgba(244, 114, 182, 0.30) !important;
}

footer div.flex.flex-col.rounded-2xl.border.bg-card span.rounded-full,
footer div.flex.flex-col.rounded-2xl.border.bg-card [class*="bg-secondary"] {
  background-color: rgba(244, 114, 182, 0.30) !important;
  color: #ffffff !important;
  border: 1px solid rgba(244, 114, 182, 0.50) !important;
}

footer div.flex.flex-col.rounded-2xl.border.bg-card span,
footer div.flex.flex-col.rounded-2xl.border.bg-card div {
  color: #f1f5f9 !important;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.9) !important;
}

footer div.flex.flex-col.rounded-2xl.border.bg-card button {
  background-color: rgba(255, 255, 255, 0.08) !important;
  border: 1px solid rgba(255, 255, 255, 0.15) !important;
  border-radius: 6px !important;
  color: #ffffff !important;
  transition: all 0.2s ease !important;
}

footer div.flex.flex-col.rounded-2xl.border.bg-card button:hover {
  background-color: rgba(244, 114, 182, 0.35) !important;
  border-color: rgba(244, 114, 182, 0.70) !important;
  box-shadow: 0 0 10px rgba(244, 114, 182, 0.35) !important;
}

div.relative.flex.flex-col.p-px.rounded-2xl.bg-card-border,
footer div.relative.p-px.rounded-2xl.bg-card-border {
  position: relative !important;
  background: transparent !important;
  background-color: transparent !important;
  border: 1.5px solid rgba(244, 114, 182, 0.55) !important;
  border-radius: 16px !important;
  box-shadow: 
    0 8px 32px rgba(0, 0, 0, 0.60), 
    0 0 16px rgba(244, 114, 182, 0.30) !important;
  overflow: visible !important;
  padding: 0 !important;
}

div.relative.flex.flex-col.p-px.rounded-2xl.bg-card-border div.grid.grid-rows-\\[0fr\\],
div.relative.flex.flex-col.p-px.rounded-2xl.bg-card-border div.grid-rows-\\[0fr\\] {
  padding: 0 !important;
  margin: 0 !important;
  border: none !important;
  height: 0 !important;
  min-height: 0 !important;
  background: transparent !important;
}

div.relative.flex.flex-col.p-px.rounded-2xl.bg-card-border div.grid-rows-\\[1fr\\] div[class*="px-3"],
div.relative.flex.flex-col.p-px.rounded-2xl.bg-card-border div.grid.grid-rows-\\[1fr\\] {
  background: linear-gradient(
    145deg, 
    rgba(22, 24, 40, 0.88) 0%, 
    rgba(32, 22, 42, 0.90) 50%,
    rgba(18, 20, 36, 0.92) 100%
  ) !important;
  backdrop-filter: blur(24px) saturate(180%) !important;
  -webkit-backdrop-filter: blur(24px) saturate(180%) !important;
  border-bottom: 1.5px solid rgba(244, 114, 182, 0.45) !important;
  border-top-left-radius: 15px !important;
  border-top-right-radius: 15px !important;
  box-shadow: 
    0 -10px 30px rgba(0, 0, 0, 0.50),
    inset 0 1px 1px rgba(255, 255, 255, 0.40),
    0 0 16px rgba(244, 114, 182, 0.20) !important;
  z-index: 50 !important;
}

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
div.relative.flex.flex-col.p-px.rounded-2xl.bg-card-border > div.relative.flex.flex-col.gap-0.p-1,
div.relative.flex.flex-col.gap-0.p-1.rounded-\\[calc\\(theme\\(borderRadius\\.2xl\\)-1px\\)\\].bg-card {
  position: relative !important;
  background-image: 
    linear-gradient(
      rgba(12, 14, 24, 0.15), 
      rgba(12, 14, 24, 0.28)
    ),
    url("${b64Bottom}") !important;
  background-size: cover !important;
  background-position: center 6% !important;
  background-repeat: no-repeat !important;
  border-radius: 15px !important;
  overflow: hidden !important;
}

[contenteditable="true"],
textarea,
div.max-h-\\[300px\\] {
  color: #ffffff !important;
  text-shadow: 0 1px 4px rgba(0, 0, 0, 0.95), 0 0 2px rgba(0, 0, 0, 0.95) !important;
  font-weight: 500 !important;
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
   11. 【中】活跃终端专属壁纸与现代黑客风黑色极清文字 (Active Terminals - mid_wallpaper)
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
    ),
    url("${b64Mid}") !important;
  background-size: cover !important;
  background-position: center 20% !important;
  background-repeat: no-repeat !important;
}

.terminal.xterm .xterm-viewport,
.terminal.xterm .xterm-screen,
.terminal.xterm .xterm-scrollable-element,
.terminal.xterm canvas,
.xterm,
.xterm .xterm-screen canvas {
  background-color: transparent !important;
  background: transparent !important;
}

/* 终端字体：升级为圆润可爱带中文等宽的 Maple Mono NF CN 现代编程字体，告别宋体回退发虚与右侧吞字 */
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

/* 终端彩色语法项：深色浓郁现代高对比度配色 */
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
   12. 【右】独立侧栏壁纸 + 极简纯净无杂线琉璃质感 (Right Drawer - Clean Borderless)
   ========================================================================== */
div.flex.flex-col.gap-2.overflow-y-auto.h-full.w-full.bg-background,
div.flex:has(#antigravity\\\\.agentSidePanelInputBox),
div:has(> div > #antigravity\\\\.agentSidePanelInputBox),
div.flex-1.flex.flex-col.min-w-0.h-full:has(#antigravity\\\\.agentSidePanelInputBox),
[class*="standalone"],
[class*="Standalone"],
[class*="terminal-drawer"] {
  position: relative !important;
  background-color: transparent !important;
  background-image: 
    linear-gradient(
      rgba(11, 12, 20, 0.12), 
      rgba(11, 12, 20, 0.20)
    ),
    url("${b64Right}") !important;
  background-size: cover !important;
  background-position: center 20% !important;
  background-repeat: no-repeat !important;
  border-left: 1.5px solid rgba(249, 168, 212, 0.85) !important;
  box-shadow: 
    -1px 0 6px rgba(249, 168, 212, 0.75),
    -3px 0 14px rgba(244, 114, 182, 0.45),
    -6px 0 28px rgba(244, 114, 182, 0.22) !important;
  z-index: 10 !important;
}

div:has(#antigravity\\\\.agentSidePanelInputBox) > div,
div:has(#antigravity\\\\.agentSidePanelInputBox) .overflow-y-auto {
  background-color: transparent !important;
  background: transparent !important;
}

/* 侧边栏“对话”顶栏：彻底去除生硬外框与线条 */
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

/* 侧边栏卡片与按钮：告别多余线条，升级为无杂线通透轻磨砂胶囊 */
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

/* 去除侧栏所有嵌套的杂乱粉色边框 */
div.flex.flex-col.gap-2.overflow-y-auto.h-full.w-full.bg-background div:not([class*="user-input-step"]):not([class*="bg-card-border"]) {
  border-color: transparent !important;
}

/* ==========================================================================
   16. 【设置】设置对话框专属插画壁纸与水晶磨砂视效 (Shiroko & Kuroko Sunset - Bright)
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
    ),
    url("${b64Settings}") !important;
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
`;
}

function swapWallpaper(slotInput, srcImgPath) {
  const slot = SLOTS[slotInput.toLowerCase()];
  if (!slot) {
    console.error(`❌ 未知槽位: "${slotInput}"。支持的槽位为: 左, 中, 右, 下, 设置`);
    return false;
  }

  if (!fs.existsSync(srcImgPath)) {
    console.error(`❌ 图片文件不存在: ${srcImgPath}`);
    return false;
  }

  const targetPath = path.join(wallpapersDir, slot.file);
  console.log(`[1/3] 正在替换【${slotInput} (${slot.desc})】的壁纸素材...`);
  fs.copyFileSync(srcImgPath, targetPath);
  console.log(`✓ 成功更新文件: ${targetPath}`);

  console.log(`[2/3] 重新编译并输出 custom_theme.css...`);
  const css = generateMasterCss();
  fs.writeFileSync(customCssPath, css, 'utf-8');
  console.log(`✓ custom_theme.css 已更新 (${(css.length / 1024 / 1024).toFixed(2)} MB)`);

  console.log(`[3/3] 触发界面热重载与实时生效...`);
  try {
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
              const applyCode = `
                (function() {
                  let s = document.getElementById('antigravity-custom-theme');
                  if (!s) {
                    s = document.createElement('style');
                    s.id = 'antigravity-custom-theme';
                    document.head.appendChild(s);
                  }
                  s.textContent = \`${css.replace(/\\/g, "\\\\").replace(/`/g, "\\`").replace(/\$/g, "\\$")}\`;
                  return "Live theme hot-reloaded!";
                })()
              `;
              ws.send(JSON.stringify({ id: 1, method: 'Runtime.evaluate', params: { expression: applyCode } }));
              setTimeout(() => ws.close(), 300);
            });
          }
        } catch(e) {}
      });
    }).on('error', () => {});
  } catch(e) {}

  console.log(`✨ 【${slotInput}】壁纸更换完成！已实时生效。`);
  return true;
}

function revertToBaseline() {
  console.log(`正在从黄金基线【初版】恢复...`);
  if (!fs.existsSync(baselineDir)) {
    console.error(`❌ 未找到初版备份目录: ${baselineDir}`);
    return false;
  }
  const baselineCssPath = path.join(baselineDir, 'custom_theme.css');
  const baselineWallpapers = path.join(baselineDir, 'wallpapers');
  
  if (fs.existsSync(baselineCssPath)) {
    fs.copyFileSync(baselineCssPath, customCssPath);
  }
  if (fs.existsSync(baselineWallpapers)) {
    fs.readdirSync(baselineWallpapers).forEach(f => {
      fs.copyFileSync(path.join(baselineWallpapers, f), path.join(wallpapersDir, f));
    });
  }
  
  console.log(`✓ 初版文件已全部还原，正在热重载...`);
  const css = fs.readFileSync(customCssPath, 'utf-8');
  try {
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
              const applyCode = `
                (function() {
                  let s = document.getElementById('antigravity-custom-theme');
                  if (!s) {
                    s = document.createElement('style');
                    s.id = 'antigravity-custom-theme';
                    document.head.appendChild(s);
                  }
                  s.textContent = \`${css.replace(/\\/g, "\\\\").replace(/`/g, "\\`").replace(/\$/g, "\\$")}\`;
                  return "Reverted to 初版 baseline!";
                })()
              `;
              ws.send(JSON.stringify({ id: 1, method: 'Runtime.evaluate', params: { expression: applyCode } }));
              setTimeout(() => ws.close(), 300);
            });
          }
        } catch(e) {}
      });
    }).on('error', () => {});
  } catch(e) {}
  console.log(`✨ 成功还原为【初版】黄金基线！`);
  return true;
}

if (require.main === module) {
  const args = process.argv.slice(2);
  if (args[0] === '--swap' && args[1] && args[2]) {
    swapWallpaper(args[1], args[2]);
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
  } else if (args[0] === '--baseline' || args[0] === '--revert-baseline' || args[0] === '--restore-baseline') {
    revertToBaseline();
  } else if (args[0] === '--rebuild') {
    const css = generateMasterCss();
    fs.writeFileSync(customCssPath, css, 'utf-8');
    console.log(`✓ custom_theme.css 重构完成 (${(css.length / 1024 / 1024).toFixed(2)} MB)`);
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
              const applyCode = `
                (function() {
                  let s = document.getElementById('antigravity-custom-theme');
                  if (!s) {
                    s = document.createElement('style');
                    s.id = 'antigravity-custom-theme';
                    document.head.appendChild(s);
                  }
                  s.textContent = \`${css.replace(/\\/g, "\\\\").replace(/`/g, "\\`").replace(/\$/g, "\\$")}\`;
                  return "Live theme hot-reloaded!";
                })()
              `;
              ws.send(JSON.stringify({ id: 1, method: 'Runtime.evaluate', params: { expression: applyCode } }));
              setTimeout(() => {
                ws.send(JSON.stringify({
                  id: 2,
                  method: 'Page.captureScreenshot',
                  params: { format: 'png' }
                }));
              }, 400);
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
        } catch(e) {}
      });
    }).on('error', () => {});
  }
}

module.exports = { swapWallpaper, generateMasterCss, revertToBaseline, SLOTS };
