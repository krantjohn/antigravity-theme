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
const localMediaServerPath = path.join(antigravityDir, 'media_server.js');
const repoMediaServerPath = path.join(__dirname, 'media_server.js');
if (fs.existsSync(repoMediaServerPath)) {
  try {
    fs.copyFileSync(repoMediaServerPath, localMediaServerPath);
  } catch(e) {}
}
const baselineDir = path.join(antigravityDir, 'backups', 'baseline_v1_初版');
const slotsConfigPath = path.join(antigravityDir, 'slots_config.json');

const VIDEO_EXTS = new Set(['.mp4', '.webm', '.ogg', '.ogv', '.mov', '.m4v']);
const IMAGE_EXTS = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg']);

const SLOTS_META = {
  'left': { key: 'left', defaultFile: 'left_wallpaper.jpg', desc: 'AI主对话界面 / 全局底图', defaultPosition: 'center center' },
  'mid': { key: 'mid', defaultFile: 'mid_wallpaper.jpg', desc: '终端界面 (活跃终端壁纸)', defaultPosition: 'center 20%' },
  'right': { key: 'right', defaultFile: 'right_wallpaper.jpg', desc: '最右侧界面 (独立终端/侧栏壁纸)', defaultPosition: 'center 20%' },
  'bottom': { key: 'bottom', defaultFile: 'input_wallpaper.jpg', desc: '底部输入框', defaultPosition: 'center 6%' },
  'settings': { key: 'settings', defaultFile: 'settings_wallpaper.png', desc: '设置界面', defaultPosition: 'center 65%' }
};

const SLOT_ALIASES = {
  '左': 'left', 'left': 'left', 'global': 'left', 'main': 'left',
  '中': 'mid', 'mid': 'mid', 'terminal': 'mid',
  '右': 'right', 'right': 'right', 'standalone': 'right',
  '下': 'bottom', 'bottom': 'bottom', 'input': 'bottom',
  '设置': 'settings', 'settings': 'settings'
};

const FONT_PRESETS = {
  'pure-white': {
    id: 'pure-white',
    name: '纯白高对比 (Pure White)',
    primary: '#ffffff',
    secondary: '#f1f5f9',
    muted: '#94a3b8',
    terminal: '#ffffff',
    shadow: '0 1px 3px rgba(0, 0, 0, 0.95), 0 0 2px rgba(0, 0, 0, 0.95)',
    terminalShadow: '0 1px 3px rgba(0, 0, 0, 0.95), 0 0 2px rgba(0, 0, 0, 0.95)',
    isDarkText: false,
    desc: '适合绝大多数暗色、炫彩或复杂壁纸，纯白字体配深色轮廓，极致清晰',
    aliases: ['1', 'white', 'pure-white', '纯白', '白', '高对比白']
  },
  'obsidian-black': {
    id: 'obsidian-black',
    name: '暗夜曜黑 (Obsidian Black)',
    primary: '#0f172a',
    secondary: '#1e293b',
    muted: '#475569',
    terminal: '#05070d',
    shadow: '0 0 2px #ffffff, 0 1px 3px rgba(255, 255, 255, 0.95), 0 0 4px rgba(255, 255, 255, 0.85)',
    terminalShadow: '0 0 2px #ffffff, 0 1px 2px rgba(255, 255, 255, 0.98), 0 0 1px #ffffff, 0 0 5px rgba(255, 255, 255, 0.85)',
    isDarkText: true,
    desc: '适合纯白、超亮浅色动漫或明亮风景壁纸，曜黑字体搭配白辉光描边，不晃眼且字迹清晰',
    aliases: ['2', 'black', 'obsidian-black', '暗黑', '黑', '曜黑', '暗夜曜黑']
  },
  'sakura-pink': {
    id: 'sakura-pink',
    name: '樱花粉 (Sakura Pink)',
    primary: '#fdf2f8',
    secondary: '#fbcfe8',
    muted: '#f472b6',
    terminal: '#fdf2f8',
    shadow: '0 1px 3px rgba(0, 0, 0, 0.92), 0 0 4px rgba(244, 114, 182, 0.50)',
    terminalShadow: '0 1px 3px rgba(0, 0, 0, 0.95), 0 0 4px rgba(244, 114, 182, 0.60)',
    isDarkText: false,
    desc: '粉系二次元主题、甜美唯美风格壁纸的最佳搭档',
    aliases: ['3', 'pink', 'sakura-pink', '樱花粉', '粉', '粉色']
  },
  'cyber-cyan': {
    id: 'cyber-cyan',
    name: '赛博青 (Cyber Cyan)',
    primary: '#e0f2fe',
    secondary: '#7dd3fc',
    muted: '#38bdf8',
    terminal: '#e0f2fe',
    shadow: '0 1px 3px rgba(0, 0, 0, 0.95), 0 0 4px rgba(56, 189, 248, 0.50)',
    terminalShadow: '0 1px 3px rgba(0, 0, 0, 0.95), 0 0 4px rgba(56, 189, 248, 0.60)',
    isDarkText: false,
    desc: '赛博朋克、科幻机甲、极客科技风壁纸搭档',
    aliases: ['4', 'cyan', 'cyber-cyan', '赛博青', '青', '青色', '蓝']
  },
  'golden-sand': {
    id: 'golden-sand',
    name: '暖金 (Golden Sand)',
    primary: '#fef08a',
    secondary: '#fde047',
    muted: '#eab308',
    terminal: '#fef08a',
    shadow: '0 1px 3px rgba(0, 0, 0, 0.95), 0 0 4px rgba(234, 179, 8, 0.45)',
    terminalShadow: '0 1px 3px rgba(0, 0, 0, 0.95), 0 0 4px rgba(234, 179, 8, 0.55)',
    isDarkText: false,
    desc: '落日余晖、暖色调动漫与高贵金色系壁纸搭档',
    aliases: ['5', 'gold', 'golden-sand', '暖金', '金', '金色', '黄']
  },
  'emerald-green': {
    id: 'emerald-green',
    name: '翡翠绿 (Emerald Green)',
    primary: '#ecfdf5',
    secondary: '#a7f3d0',
    muted: '#34d399',
    terminal: '#ecfdf5',
    shadow: '0 1px 3px rgba(0, 0, 0, 0.95), 0 0 4px rgba(52, 211, 153, 0.45)',
    terminalShadow: '0 1px 3px rgba(0, 0, 0, 0.95), 0 0 4px rgba(52, 211, 153, 0.55)',
    isDarkText: false,
    desc: '自然清新、护眼绿色系壁纸搭档',
    aliases: ['6', 'green', 'emerald-green', '翡翠绿', '绿', '绿色']
  }
};

function parseHexColor(input) {
  if (!input || typeof input !== 'string') return null;
  let s = input.trim();
  if (s.startsWith('#')) s = s.slice(1);
  if (s.length === 3) {
    s = s.split('').map(c => c + c).join('');
  } else if (s.length === 4) {
    s = s.slice(0, 3).split('').map(c => c + c).join('');
  } else if (s.length === 8) {
    s = s.slice(0, 6);
  }
  if (!/^[0-9a-fA-F]{6}$/.test(s)) return null;
  const num = parseInt(s, 16);
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  const hex = '#' + s.toLowerCase();
  return { r, g, b, hex };
}

function adjustBrightness(hex, percent) {
  const parsed = parseHexColor(hex);
  if (!parsed) return hex;
  let { r, g, b } = parsed;
  if (percent >= 0) {
    const factor = percent / 100;
    r = Math.min(255, Math.max(0, Math.round(r + (255 - r) * factor)));
    g = Math.min(255, Math.max(0, Math.round(g + (255 - g) * factor)));
    b = Math.min(255, Math.max(0, Math.round(b + (255 - b) * factor)));
  } else {
    const factor = Math.abs(percent) / 100;
    r = Math.min(255, Math.max(0, Math.round(r - r * factor)));
    g = Math.min(255, Math.max(0, Math.round(g - g * factor)));
    b = Math.min(255, Math.max(0, Math.round(b - b * factor)));
  }
  const toHex = (n) => n.toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

const COMMON_COLOR_NAMES = {
  'white': 'pure-white',
  'black': 'obsidian-black',
  'pink': 'sakura-pink',
  'cyan': 'cyber-cyan',
  'gold': 'golden-sand',
  'green': 'emerald-green',
  'red': '#ef4444',
  'blue': '#3b82f6',
  'purple': '#a855f7',
  'yellow': '#eab308',
  'orange': '#f97316',
  'gray': '#94a3b8',
  'grey': '#94a3b8'
};

function resolveFontColor(input, fallbackToDefault = true) {
  if (!input) {
    return fallbackToDefault ? FONT_PRESETS['pure-white'] : null;
  }
  if (typeof input === 'object') {
    if (input.id && FONT_PRESETS[input.id]) return FONT_PRESETS[input.id];
    if (input.customHex) return resolveFontColor(input.customHex, fallbackToDefault);
    if (input.hex) return resolveFontColor(input.hex, fallbackToDefault);
    if (input.color) return resolveFontColor(input.color, fallbackToDefault);
    if (input.primary && input.shadow) return input;
    if (input.primary) return resolveFontColor(input.primary, fallbackToDefault);
    if (input.preset && FONT_PRESETS[input.preset]) return FONT_PRESETS[input.preset];
  }
  const str = String(input).trim().toLowerCase();
  
  for (const [key, preset] of Object.entries(FONT_PRESETS)) {
    if (key.toLowerCase() === str) return preset;
    if (preset.aliases && preset.aliases.some(a => a.toLowerCase() === str)) {
      return preset;
    }
  }

  if (COMMON_COLOR_NAMES[str]) {
    const mapped = COMMON_COLOR_NAMES[str];
    if (FONT_PRESETS[mapped]) return FONT_PRESETS[mapped];
    return resolveFontColor(mapped, fallbackToDefault);
  }

  const parsed = parseHexColor(str);
  if (parsed) {
    const { r, g, b, hex } = parsed;
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    const isDarkText = lum < 128;
    return {
      id: 'custom-' + hex.slice(1),
      name: `自定义颜色 (${hex.toUpperCase()})`,
      primary: hex,
      secondary: isDarkText 
        ? adjustBrightness(hex, 30) 
        : adjustBrightness(hex, -20),
      muted: isDarkText 
        ? adjustBrightness(hex, 60) 
        : adjustBrightness(hex, -40),
      terminal: hex,
      shadow: isDarkText
        ? '0 0 2px #ffffff, 0 1px 3px rgba(255, 255, 255, 0.95), 0 0 4px rgba(255, 255, 255, 0.85)'
        : '0 1px 3px rgba(0, 0, 0, 0.95), 0 0 2px rgba(0, 0, 0, 0.90)',
      terminalShadow: isDarkText
        ? '0 0 2px #ffffff, 0 1px 2px rgba(255, 255, 255, 0.98), 0 0 1px #ffffff, 0 0 5px rgba(255, 255, 255, 0.85)'
        : '0 1px 3px rgba(0, 0, 0, 0.95), 0 0 2px rgba(0, 0, 0, 0.90)',
      isDarkText,
      desc: `用户自定义 Hex 颜色 ${hex.toUpperCase()} (${isDarkText ? '暗色系/白辉光轮廓' : '亮色系/深邃暗影轮廓'})`,
      customHex: hex
    };
  }

  return fallbackToDefault ? FONT_PRESETS['pure-white'] : null;
}

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

const VERTICAL_KEYWORDS = new Set(['top', 'bottom', '上', '下']);
const HORIZONTAL_KEYWORDS = new Set(['left', 'right', '左', '右']);
const CENTER_KEYWORDS = new Set(['center', '中', '居中']);

function parseCoordinate(val, axis = 'x') {
  if (typeof val === 'number') {
    return Math.max(0, Math.min(100, Math.round(val)));
  }
  if (!val || typeof val !== 'string') {
    return 50;
  }
  const s = val.trim().toLowerCase();
  if (s === 'left' || s === '左') return 0;
  if (s === 'right' || s === '右') return 100;
  if (s === 'top' || s === '上') return 0;
  if (s === 'bottom' || s === '下') return 100;
  if (s === 'center' || s === '中' || s === '居中') return 50;

  if (s.endsWith('%')) {
    const num = parseFloat(s);
    return isNaN(num) ? 50 : Math.max(0, Math.min(100, Math.round(num)));
  }
  const num = parseFloat(s);
  return isNaN(num) ? 50 : Math.max(0, Math.min(100, Math.round(num)));
}

function parsePosition(posInput, defaultPos = 'center center') {
  if (!posInput) posInput = defaultPos;
  let x = 50;
  let y = 50;

  if (typeof posInput === 'object' && posInput !== null) {
    x = parseCoordinate(posInput.x, 'x');
    y = parseCoordinate(posInput.y, 'y');
    return { x, y, str: `${x}% ${y}%` };
  }

  const str = String(posInput).trim();
  const parts = str.split(/\s+/).filter(Boolean);
  if (parts.length === 1) {
    const p = parts[0].toLowerCase();
    if (VERTICAL_KEYWORDS.has(p)) {
      x = 50;
      y = parseCoordinate(p, 'y');
    } else if (HORIZONTAL_KEYWORDS.has(p)) {
      x = parseCoordinate(p, 'x');
      y = 50;
    } else if (CENTER_KEYWORDS.has(p)) {
      x = 50;
      y = 50;
    } else {
      x = parseCoordinate(p, 'x');
      y = 50;
    }
  } else if (parts.length >= 2) {
    const p0 = parts[0].toLowerCase();
    const p1 = parts[1].toLowerCase();

    // Check if parts[0] is explicitly vertical (e.g. top center, bottom 20%, 上 居中)
    if (VERTICAL_KEYWORDS.has(p0) && (HORIZONTAL_KEYWORDS.has(p1) || CENTER_KEYWORDS.has(p1) || p1.endsWith('%') || !isNaN(parseFloat(p1)))) {
      y = parseCoordinate(p0, 'y');
      x = parseCoordinate(p1, 'x');
    } else if (HORIZONTAL_KEYWORDS.has(p1) && (VERTICAL_KEYWORDS.has(p0) || CENTER_KEYWORDS.has(p0) || p0.endsWith('%') || !isNaN(parseFloat(p0)))) {
      y = parseCoordinate(p0, 'y');
      x = parseCoordinate(p1, 'x');
    } else {
      x = parseCoordinate(p0, 'x');
      y = parseCoordinate(p1, 'y');
    }
  }

  return { x, y, str: `${x}% ${y}%` };
}

function getSlotPosition(slotsConfig, slotKey) {
  const meta = SLOTS_META[slotKey];
  const defaultPos = meta ? (meta.defaultPosition || 'center center') : 'center center';
  if (!slotsConfig || !slotsConfig[slotKey] || !slotsConfig[slotKey].position) {
    return defaultPos;
  }
  const pos = slotsConfig[slotKey].position;
  if (typeof pos === 'string' && pos.trim()) {
    return pos.trim();
  }
  if (typeof pos === 'object' && pos !== null) {
    const parsed = parsePosition(pos, defaultPos);
    return parsed.str;
  }
  return defaultPos;
}

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
        position: meta.defaultPosition || 'center center',
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
      if (!config[key].position) {
        config[key].position = meta.defaultPosition || 'center center';
        modified = true;
      }
      config[key].desc = meta.desc;
    }
  }

  if (!config.fontColor) {
    config.fontColor = FONT_PRESETS['pure-white'];
    modified = true;
  } else {
    config.fontColor = resolveFontColor(config.fontColor);
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

  const font = resolveFontColor(slotsConfig.fontColor);

  const isLeftVideo = slotsConfig.left && slotsConfig.left.type === 'video';
  const isMidVideo = slotsConfig.mid && slotsConfig.mid.type === 'video';
  const isRightVideo = slotsConfig.right && slotsConfig.right.type === 'video';
  const isBottomVideo = slotsConfig.bottom && slotsConfig.bottom.type === 'video';
  const isSettingsVideo = slotsConfig.settings && slotsConfig.settings.type === 'video';

  const b64Left = !isLeftVideo 
    ? getBase64(slotsConfig.left?.file || 'left_wallpaper.jpg')
    : '';
  const b64Mid = !isMidVideo ? getBase64(slotsConfig.mid?.file || 'mid_wallpaper.jpg') : '';
  const b64Right = !isRightVideo ? getBase64(slotsConfig.right?.file || 'right_wallpaper.jpg') : '';
  const b64Bottom = !isBottomVideo ? getBase64(slotsConfig.bottom?.file || 'input_wallpaper.jpg') : '';
  const b64Settings = !isSettingsVideo ? getBase64(slotsConfig.settings?.file || 'settings_wallpaper.png') : '';

  const posLeft = getSlotPosition(slotsConfig, 'left');
  const posMid = getSlotPosition(slotsConfig, 'mid');
  const posRight = getSlotPosition(slotsConfig, 'right');
  const posBottom = getSlotPosition(slotsConfig, 'bottom');
  const posSettings = getSlotPosition(slotsConfig, 'settings');

  return `/* ==========================================================================
   Antigravity 2.0 Master Custom Theme - 5-Slot Dynamic Hybrid Edition
   Slots: [左: 主对话区/全局底图] | [中: 活跃终端壁纸] | [右: 极简无杂线侧栏壁纸] | [下: 底部输入框] | [设置: 设置弹窗]
   Supports: Static Images (JPG/PNG/GIF/WebP) & Dynamic Hardware-Accelerated Video (MP4/WebM)
   ========================================================================== */

/* 1. Global Base & 消灭外层全局拖动条 */
html, body {
  background-color: #0b0c14 !important;
  color: #e2e8f0 !important;
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
  background-image: ${isLeftVideo ? 'none' : `
    linear-gradient(
      rgba(11, 12, 20, 0.06), 
      rgba(11, 12, 20, 0.10)
    )${b64Left ? `,\n    url("${b64Left}")` : ''}`} !important;
  background-size: cover !important;
  background-position: ${posLeft} !important;
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
  object-position: ${posLeft} !important;
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

/* 5. Left Sidebar & Navigation & Conversation History List (深色磨砂背景保护区：纯净浅白文本，彻底杜绝黑色字体与发虚白光晕) */
aside, nav, [role="navigation"], [class*="sidebar"], [class*="Sidebar"], [class*="navigation"], [class*="Navigation"],
div.bg-sidebar, [data-panel="conversations"], [data-testid*="sidebar"], [data-testid*="conversation-list"] {
  background-color: rgba(14, 15, 26, 0.35) !important;
  backdrop-filter: blur(10px) !important;
  -webkit-backdrop-filter: blur(10px) !important;
  border-right: 1px solid rgba(226, 232, 240, 0.12) !important;
  box-shadow: none !important;
  color: #f1f5f9 !important;
}

/* 5.1 强制保护侧边栏、对话历史列表与文件树所有文本元素：统一轻阴影纯净白字，严禁继承主对话区任何自定义暗黑字体或白辉光描边 */
aside, aside *,
nav, nav *,
[role="navigation"], [role="navigation"] *,
[class*="sidebar"], [class*="sidebar"] *,
[class*="Sidebar"], [class*="Sidebar"] *,
[class*="navigation"], [class*="navigation"] *,
div.bg-sidebar, div.bg-sidebar *,
[data-panel="conversations"], [data-panel="conversations"] *,
[data-testid*="sidebar"], [data-testid*="sidebar"] *,
[data-testid*="conversation-list"], [data-testid*="conversation-list"] *,
[data-testid*="conversation-row"], [data-testid*="conversation-row"] *,
[class*="file-tree"], [class*="file-tree"] *,
[class*="explorer"], [class*="explorer"] *,
[class*="tree-view"], [class*="tree-view"] * {
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.8) !important;
}

aside span, aside p, aside div, aside a, aside button,
nav span, nav p, nav div, nav a, nav button,
[role="navigation"] span, [role="navigation"] p, [role="navigation"] div, [role="navigation"] a, [role="navigation"] button,
[class*="sidebar"] span, [class*="sidebar"] p, [class*="sidebar"] div, [class*="sidebar"] a, [class*="sidebar"] button,
[class*="Sidebar"] span, [class*="Sidebar"] p, [class*="Sidebar"] div, [class*="Sidebar"] a, [class*="Sidebar"] button,
div.bg-sidebar span, div.bg-sidebar p, div.bg-sidebar div, div.bg-sidebar a, div.bg-sidebar button,
[data-panel="conversations"] span, [data-panel="conversations"] p, [data-panel="conversations"] div, [data-panel="conversations"] a,
[data-testid*="sidebar"] span, [data-testid*="sidebar"] p, [data-testid*="sidebar"] div,
[data-testid*="conversation-list"] span, [data-testid*="conversation-list"] p, [data-testid*="conversation-list"] div,
[data-testid*="conversation-row"] span, [data-testid*="conversation-row"] p, [data-testid*="conversation-row"] div,
[data-testid*="conversation-row"] span.truncate,
[data-testid*="conversation-list"] span.truncate,
div.bg-sidebar span.truncate,
[role="navigation"] span.truncate,
[class*="file-tree"] span, [class*="file-tree"] div,
[class*="explorer"] span, [class*="explorer"] div,
[class*="tree-view"] span, [class*="tree-view"] div {
  color: #f1f5f9 !important;
}

aside [class*="text-muted"], nav [class*="text-muted"], [role="navigation"] [class*="text-muted"],
[class*="sidebar"] [class*="text-muted"], [class*="sidebar"] [class*="text-secondary"],
div.bg-sidebar [class*="text-muted"], div.bg-sidebar [class*="text-secondary"],
[data-testid*="sidebar"] [class*="text-muted"], [data-testid*="sidebar"] [class*="text-secondary"],
[data-testid*="conversation-list"] [class*="text-muted"], [data-testid*="conversation-list"] [class*="text-secondary"],
[data-testid*="conversation-row"] [class*="text-muted"], [data-testid*="conversation-row"] [class*="text-secondary"],
[data-testid*="conversation-row"] time,
[data-testid*="conversation-list"] time {
  color: rgba(226, 232, 240, 0.75) !important;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.8) !important;
}

/* 6. Top Header & Title Bar & Navigation Buttons */
header, [class*="header"], [class*="Header"], [class*="titlebar"], [class*="menubar"] {
  background-color: rgba(14, 15, 26, 0.35) !important;
  backdrop-filter: blur(10px) !important;
  -webkit-backdrop-filter: blur(10px) !important;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08) !important;
  box-shadow: none !important;
  color: #f1f5f9 !important;
}

header span, header p, header div,
[class*="header"] span, [class*="titlebar"] span {
  color: #f1f5f9 !important;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.8) !important;
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
   7. 主对话区文字排版与专属落樱微光气泡 (Mika Blossom Mist Glass)
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
div.group\\/user-input-step p,
[class*="user-message"],
[class*="user-message"] p,
[class*="user-message"] span,
[class*="user-message"] div,
div[class*="user-input-step"] p,
div[class*="user-input-step"] span,
div[class*="user-input-step"] div {
  color: ${font.primary} !important;
  font-weight: 500 !important;
  text-shadow: ${font.shadow} !important;
}

/* 7.1 主对话区 AI 回复正文 Markdown 渲染与文本深度高对比度增强 (严格约束至纯文本正文，不污染带背景的小部件与代码块) */
div[role="article"] div.leading-relaxed p:not(pre *),
div[role="article"] div.leading-relaxed li:not(pre *),
div[role="article"] div.leading-relaxed td:not(pre *),
div[role="article"] div.leading-relaxed th:not(pre *),
div[role="article"] div.leading-relaxed blockquote:not(pre *),
div.leading-relaxed p:not(pre *),
div.leading-relaxed li:not(pre *),
div.leading-relaxed td:not(pre *),
div.leading-relaxed th:not(pre *),
div.leading-relaxed blockquote:not(pre *),
div.leading-relaxed > span:not([class*="syntax"]):not([class*="token"]):not([class*="hljs"]):not([class*="code"]):not(.line-content *):not([class*="codicon"]):not(pre *):not([class*="code-block"] *),
main p:not(pre *):not([class*="code-block"] *),
main li:not(pre *):not([class*="code-block"] *),
main td:not(pre *):not([class*="code-block"] *),
main th:not(pre *):not([class*="code-block"] *) {
  color: ${font.primary} !important;
  text-shadow: ${font.shadow} !important;
}

div[role="article"] div.leading-relaxed [class*="text-muted"]:not(pre *):not([class*="code-block"] *),
div.leading-relaxed [class*="text-muted"]:not(pre *):not([class*="code-block"] *),
main [class*="text-muted"]:not(pre *):not([class*="code-block"] *),
main [class*="text-secondary"]:not(pre *):not([class*="code-block"] *),
main time:not(pre *):not([class*="code-block"] *),
main .text-xs:not(pre *):not([class*="code-block"] *),
main .text-sm:not(pre *):not([class*="code-block"] *) {
  color: ${font.secondary} !important;
  text-shadow: ${font.shadow} !important;
}

div[role="article"] div.leading-relaxed h1:not(pre *), div[role="article"] div.leading-relaxed h2:not(pre *), div[role="article"] div.leading-relaxed h3:not(pre *),
div[role="article"] div.leading-relaxed h4:not(pre *), div[role="article"] div.leading-relaxed h5:not(pre *), div[role="article"] div.leading-relaxed h6:not(pre *),
div.leading-relaxed h1:not(pre *), div.leading-relaxed h2:not(pre *), div.leading-relaxed h3:not(pre *),
div.leading-relaxed h4:not(pre *), div.leading-relaxed h5:not(pre *), div.leading-relaxed h6:not(pre *),
main h1:not(pre *), main h2:not(pre *), main h3:not(pre *), main h4:not(pre *), main h5:not(pre *), main h6:not(pre *) {
  color: ${font.primary} !important;
  text-shadow: ${font.shadow} !important;
  font-weight: 700 !important;
}

div[role="article"] div.leading-relaxed a:not(pre *),
div.leading-relaxed a:not(pre *),
main a:not(pre *) {
  color: ${font.muted} !important;
  text-shadow: ${font.shadow} !important;
  text-decoration: underline !important;
}

div[role="article"] div.leading-relaxed strong:not(pre *), div[role="article"] div.leading-relaxed b:not(pre *),
div.leading-relaxed strong:not(pre *), div.leading-relaxed b:not(pre *),
main strong:not(pre *), main b:not(pre *) {
  color: ${font.primary} !important;
  text-shadow: ${font.shadow} !important;
  font-weight: 700 !important;
}

div[role="article"] div.leading-relaxed em:not(pre *), div[role="article"] div.leading-relaxed i:not(pre *),
div.leading-relaxed em:not(pre *), div.leading-relaxed i:not(pre *) {
  color: ${font.primary} !important;
  text-shadow: ${font.shadow} !important;
}

div[role="article"] div.leading-relaxed blockquote:not(pre *),
div.leading-relaxed blockquote:not(pre *),
main blockquote:not(pre *) {
  border-left: 3px solid ${font.muted} !important;
  color: ${font.secondary} !important;
  text-shadow: ${font.shadow} !important;
}

/* 保护自带背景的小部件：思考折叠条、工具调用进度条、运行状态徽章保持原版清爽白字 */
[data-testid="conversation-view"] button,
[data-testid="conversation-view"] button span,
[data-testid="conversation-view"] [class*="tabular-nums"],
[data-testid="conversation-view"] [class*="text-secondary-foreground"],
[data-testid="conversation-view"] [class*="badge"],
div.user-input-buttons-container button,
[class*="user-input-buttons-container"] button {
  color: #f1f5f9 !important;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.8) !important;
}

/* 对话顶栏与面板标题 (严格限制在主对话面板与Pane内，绝不污染侧栏) */
div[data-pane-id] div.flex.w-full.min-w-0 span.truncate,
div[data-pane-id] span.cursor-pointer,
div[data-pane-id] span.truncate.inline-block,
[data-testid="conversation-view"] span.truncate.inline-block {
  color: ${font.primary} !important;
  text-shadow: ${font.shadow} !important;
}

/* 行内代码样式 (Inline Code)：半透明胶囊卡片，拒绝突兀死黑/纯白 */
[data-testid="conversation-view"] code:not(pre code):not([class*="code-block"] *),
div[role="article"] code:not(pre code):not([class*="code-block"] *),
div.leading-relaxed code:not(pre code):not([class*="code-block"] *),
main code:not(pre code),
p > code,
li > code,
td > code {
  color: ${font.primary} !important;
  background-color: ${font.isDarkText ? 'rgba(255, 255, 255, 0.88)' : 'rgba(10, 11, 20, 0.75)'} !important;
  border: 1px solid ${font.isDarkText ? 'rgba(15, 23, 42, 0.18)' : 'rgba(255, 255, 255, 0.12)'} !important;
  text-shadow: ${font.shadow} !important;
  border-radius: 4px !important;
  padding: 1px 5px !important;
  font-family: var(--editor-font-family, monospace) !important;
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
  color: ${font.primary} !important;
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

/* 7.15 侧栏历史对话最终隔离保护：即便主对话区启用暗黑曜黑模式，侧边栏也绝不继承发虚白渐变光晕 */
[role="navigation"] [class*="truncate"],
div.bg-sidebar [class*="truncate"],
[data-testid*="conversation-row"] [class*="truncate"],
[data-testid*="conversation-list"] [class*="truncate"],
[data-testid*="conversation-row"] span,
[data-testid*="conversation-list"] span {
  color: #f1f5f9 !important;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.8) !important;
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
  color: #f1f5f9 !important;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.8) !important;
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

/* 8.1 底部输入卡片外层容器与展开面板彻底通透化，彻底消灭一切实心黑块与黑底 */
#antigravity\.agentSidePanelInputBox,
div[data-testid="agent-input-box"],
div.rounded-2xl.bg-card-border:has(> div.bg-card),
div:has(> #antigravity\.agentSidePanelInputBox) {
  background-color: transparent !important;
  background: transparent !important;
  border-color: transparent !important;
  box-shadow: none !important;
}

[data-testid="running-items-panel"],
[data-testid="running-items-panel"][class*="grid-rows-[0fr]"] {
  background-color: transparent !important;
  background: transparent !important;
  border: none !important;
  border-top: none !important;
  border-bottom: none !important;
  box-shadow: none !important;
  margin-bottom: 0 !important;
  padding: 0 !important;
}

[data-testid="running-items-panel"] > div > div,
[data-testid="running-items-panel"] div[class*="rounded-t-2xl"] {
  background-color: rgba(14, 16, 28, 0.60) !important;
  backdrop-filter: blur(14px) saturate(140%) !important;
  -webkit-backdrop-filter: blur(14px) saturate(140%) !important;
  border: 1px solid rgba(244, 114, 182, 0.35) !important;
  border-bottom: none !important;
  border-radius: 14px 14px 0 0 !important;
  margin-bottom: 2px !important;
}

/* 8.2 底部输入卡片（仅对真正的输入容器挂载壁纸，严格排除指令菜单、下拉列表、弹窗与浮层） */
#antigravity\.agentSidePanelInputBox > div.bg-card:not([role="listbox"]):not([role="menu"]):not([data-mention-menu]):not([data-radix-popper-content-wrapper]):not([class*="bottom-full"]):not([class*="absolute"]):not([data-state="open"]),
#antigravity\.agentSidePanelInputBox > div[class*="bg-card"]:not([role="listbox"]):not([role="menu"]):not([data-mention-menu]):not([data-radix-popper-content-wrapper]):not([class*="bottom-full"]):not([class*="absolute"]):not([data-state="open"]),
div.rounded-2xl.bg-card-border > div.bg-card:not([role="listbox"]):not([role="menu"]):not([data-mention-menu]):not([data-radix-popper-content-wrapper]):not([class*="bottom-full"]):not([class*="absolute"]):not([data-state="open"]) {
  position: relative !important;
  background-image: 
    linear-gradient(
      rgba(12, 14, 24, 0.15), 
      rgba(12, 14, 24, 0.28)
    )${isBottomVideo ? '' : `,\n    url("${b64Bottom}")`} !important;
  background-size: cover !important;
  background-position: ${posBottom} !important;
  background-repeat: no-repeat !important;
  border-radius: 15px !important;
  overflow: hidden !important;
}

/* 强制输入卡片内部所有子元素（文本输入行、工具栏、附件预览栏）背景透明且无多余贴图 */
#antigravity\.agentSidePanelInputBox > div.bg-card:not([role="listbox"]):not([data-mention-menu]) div:not([class*="thumbnail"]):not(img),
div.rounded-2xl.bg-card-border > div.bg-card:not([role="listbox"]):not([data-mention-menu]) div:not([class*="thumbnail"]):not(img) {
  background-image: none !important;
  background-color: transparent !important;
}

/* 8.3 Actions / Slash Command Popup Menu 磨砂琉璃质感（彻底杜绝输入框壁纸渗漏或重复切片） */
div[role="listbox"],
div[role="menu"],
div[data-mention-menu],
[data-mention-menu],
[role="listbox"][data-mention-menu],
[data-radix-popper-content-wrapper] div,
#antigravity\.agentSidePanelInputBox [role="listbox"],
#antigravity\.agentSidePanelInputBox [data-mention-menu],
#antigravity\.agentSidePanelInputBox div.absolute,
#antigravity\.agentSidePanelInputBox div[class*="bottom-full"] {
  background-image: none !important;
}

div[role="listbox"][data-mention-menu],
div[role="listbox"][aria-label="Mentions"],
div[data-mention-menu],
#antigravity\.agentSidePanelInputBox div[role="listbox"],
#antigravity\.agentSidePanelInputBox div.absolute.bottom-full.bg-card,
#antigravity\.agentSidePanelInputBox div[class*="bottom-full"] {
  background-color: ${font.isDarkText ? 'rgba(255, 255, 255, 0.95)' : 'rgba(16, 18, 32, 0.90)'} !important;
  backdrop-filter: blur(20px) saturate(160%) !important;
  -webkit-backdrop-filter: blur(20px) saturate(160%) !important;
  border: 1px solid ${font.isDarkText ? 'rgba(15, 23, 42, 0.20)' : 'rgba(244, 114, 182, 0.40)'} !important;
  border-radius: 16px !important;
  box-shadow: ${font.isDarkText ? '0 16px 48px rgba(0, 0, 0, 0.25), 0 0 15px rgba(255, 255, 255, 0.6)' : '0 16px 48px rgba(0, 0, 0, 0.85), 0 0 20px rgba(244, 114, 182, 0.20)'} !important;
  background-image: none !important;
  overflow: hidden !important;
  z-index: 50 !important;
}

div[role="listbox"][data-mention-menu] div[class*="overflow-y-auto"],
[data-mention-menu] div[class*="overflow-y-auto"],
#antigravity\.agentSidePanelInputBox div[role="listbox"] div[class*="overflow-y-auto"] {
  background-color: transparent !important;
  background-image: none !important;
}

div[role="listbox"][data-mention-menu] [role="option"],
div[role="listbox"][data-mention-menu] div[id^="typeahead-item"],
div[role="listbox"][data-mention-menu] div.cursor-pointer,
[data-mention-menu] [role="option"],
[data-mention-menu] div[id^="typeahead-item"],
[data-mention-menu] div.cursor-pointer,
#antigravity\.agentSidePanelInputBox [role="listbox"] [role="option"],
#antigravity\.agentSidePanelInputBox [role="listbox"] div.cursor-pointer {
  border-radius: 10px !important;
  margin: 2px 4px !important;
  padding: 6px 10px !important;
  transition: all 0.16s ease !important;
  background-image: none !important;
  border: 1px solid transparent !important;
}

div[role="listbox"][data-mention-menu] [role="option"]:hover,
div[role="listbox"][data-mention-menu] [role="option"][aria-selected="true"],
div[role="listbox"][data-mention-menu] div.cursor-pointer:hover,
[data-mention-menu] [role="option"]:hover,
[data-mention-menu] [role="option"][aria-selected="true"],
[data-mention-menu] div.cursor-pointer:hover,
#antigravity\.agentSidePanelInputBox [role="listbox"] [role="option"]:hover,
#antigravity\.agentSidePanelInputBox [role="listbox"] [role="option"][aria-selected="true"],
#antigravity\.agentSidePanelInputBox [role="listbox"] div.cursor-pointer:hover {
  background: linear-gradient(
    90deg, 
    rgba(244, 114, 182, 0.28) 0%, 
    rgba(56, 189, 248, 0.20) 100%
  ) !important;
  border: 1px solid rgba(244, 114, 182, 0.50) !important;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.35), 0 0 10px rgba(244, 114, 182, 0.25) !important;
}

div[role="listbox"][data-mention-menu] span,
div[role="listbox"][data-mention-menu] div,
[data-mention-menu] span,
[data-mention-menu] div,
#antigravity\.agentSidePanelInputBox [role="listbox"] span,
#antigravity\.agentSidePanelInputBox [role="listbox"] div {
  color: ${font.primary} !important;
  text-shadow: ${font.shadow} !important;
}

div[role="listbox"][data-mention-menu] svg,
[data-mention-menu] svg,
#antigravity\.agentSidePanelInputBox [role="listbox"] svg {
  color: #f472b6 !important;
  filter: drop-shadow(0 0 4px rgba(244, 114, 182, 0.6)) !important;
}

.antigravity-slot-video[data-slot="bottom"] {
  position: absolute !important;
  top: 0 !important;
  left: 0 !important;
  width: 100% !important;
  height: 100% !important;
  object-fit: cover !important;
  object-position: ${posBottom} !important;
  pointer-events: none !important;
  z-index: 0 !important;
  border-radius: 15px !important;
}

[contenteditable="true"],
textarea,
div.max-h-\[300px\] {
  color: ${font.primary} !important;
  text-shadow: ${font.shadow} !important;
  font-weight: 500 !important;
  position: relative !important;
  z-index: 1 !important;
}

input::placeholder,
textarea::placeholder,
[contenteditable="true"]::before,
[data-placeholder]::before,
[placeholder] {
  color: ${font.secondary} !important;
  opacity: 0.85 !important;
  text-shadow: ${font.shadow} !important;
}

div.relative.flex.flex-col.gap-0.p-1 button,
div.relative.flex.flex-col.gap-0.p-1 [role="button"] {
  backdrop-filter: blur(8px) !important;
  background: rgba(0, 0, 0, 0.35) !important;
  border: 1px solid rgba(255, 255, 255, 0.25) !important;
  color: #f1f5f9 !important;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.8) !important;
  position: relative !important;
  z-index: 1 !important;
}

/* ==========================================================================
   9. 代码块与多行代码容器 (Sleek Frosted Glass Code Blocks)
   杜绝生硬突兀的死白底色，全主题统一优雅暗色半透明磨砂玻璃卡片与精致微光描边，杜绝字迹发虚/重影/白雾光晕
   ========================================================================== */
pre {
  background: transparent !important;
  background-color: transparent !important;
  border: none !important;
  box-shadow: none !important;
  margin: 0 !important;
  padding: 0 !important;
  color: #e2e8f0 !important;
  text-shadow: none !important;
}

pre > div.relative,
div.relative:has(> .code-block) {
  background-color: rgba(15, 18, 30, 0.88) !important;
  backdrop-filter: blur(16px) saturate(140%) !important;
  -webkit-backdrop-filter: blur(16px) saturate(140%) !important;
  border: 1px solid rgba(244, 114, 182, 0.35) !important;
  border-radius: 12px !important;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.55), 0 0 12px rgba(244, 114, 182, 0.15) !important;
  overflow: hidden !important;
}

/* Header bar */
pre > div.relative > div.min-h-7,
pre [class*="min-h-7"],
div.relative:has(> .code-block) > div.min-h-7 {
  background-color: rgba(22, 26, 42, 0.92) !important;
  border-bottom: 1px solid rgba(244, 114, 182, 0.25) !important;
}

/* Header text & language indicator */
div[role="article"] div.leading-relaxed pre div.min-h-7,
div[role="article"] div.leading-relaxed pre div.min-h-7 *,
div[role="article"] div.leading-relaxed pre [class*="text-muted"],
div[role="article"] div.leading-relaxed pre .text-sm,
div.leading-relaxed pre div.min-h-7,
div.leading-relaxed pre div.min-h-7 *,
main pre div.min-h-7,
main pre div.min-h-7 *,
pre div.min-h-7,
pre div.min-h-7 *,
pre [class*="min-h-7"],
pre [class*="min-h-7"] *,
pre div.min-h-7 div.font-sans,
pre div.min-h-7 span,
div.relative:has(> .code-block) > div.min-h-7 div,
div.relative:has(> .code-block) > div.min-h-7 span {
  color: #cbd5e1 !important;
  text-shadow: none !important;
  font-weight: 600 !important;
  letter-spacing: 0.03em !important;
}

/* Header action buttons & icons */
pre div.min-h-7 button,
pre div.min-h-7 button svg,
pre [class*="min-h-7"] button,
pre [class*="min-h-7"] button svg {
  color: #94a3b8 !important;
  text-shadow: none !important;
  transition: all 0.15s ease !important;
}

pre div.min-h-7 button:hover,
pre [class*="min-h-7"] button:hover {
  color: #f472b6 !important;
  transform: scale(1.08) !important;
}

pre div.min-h-7 button svg,
pre [class*="min-h-7"] button svg {
  color: inherit !important;
  filter: none !important;
}

/* Code text and content: 彻底杜绝文字阴影发虚/重影/黑白雾气光晕 */
pre, pre *,
.code-block, .code-block *,
.code-line, .code-line *,
.line-content, .line-content * {
  text-shadow: none !important;
}

.code-block,
[class*="code-block"],
pre code {
  background: transparent !important;
  background-color: transparent !important;
  border: none !important;
  box-shadow: none !important;
}

.code-block .line-content,
.code-block .line-content span,
.code-block span:not([class*="token"]):not([class*="hljs"]):not([class*="syntax"]),
pre code span:not([class*="token"]):not([class*="hljs"]):not([class*="syntax"]),
pre .line-content span:not([class*="token"]):not([class*="hljs"]):not([class*="syntax"]) {
  color: #e2e8f0 !important;
  text-shadow: none !important;
}

/* 10. Popovers & Dialogs 通用 */
[data-radix-popper-content],
[data-radix-menu-content],
[data-radix-dropdown-menu-content],
[data-radix-popover-content],
[data-radix-select-content],
[role="menu"],
[role="listbox"]:not([data-mention-menu]),
[cmdk-root] {
  background-color: #121322 !important;
  background-image: none !important;
  border: 1px solid rgba(226, 232, 240, 0.35) !important;
  border-radius: 10px !important;
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.85) !important;
  opacity: 1 !important;
  visibility: visible !important;
  z-index: 99999 !important;
}

[data-radix-popper-content] span,
[data-radix-menu-content] span,
[data-radix-dropdown-menu-content] span,
[data-radix-popover-content] span,
[role="menu"] span,
[role="menu"] div,
[role="menuitem"],
[cmdk-root] span,
[cmdk-root] div {
  color: #f1f5f9 !important;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.8) !important;
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
  background-position: ${posMid} !important;
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
  object-position: ${posMid} !important;
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
  color: ${font.terminal} !important;
  font-weight: 600 !important;
  letter-spacing: 0px !important;
  text-shadow: ${font.terminalShadow} !important;
}

/* 终端彩色语法项 (根据文字明暗自适应对比度与阴影轮廓) */
${font.isDarkText ? `
.terminal.xterm [class*="xterm-color-0"] { color: #334155 !important; }
.terminal.xterm [class*="xterm-color-1"], .terminal.xterm [class*="xterm-fg-1"] { color: #b91c1c !important; text-shadow: 0 0 2px #ffffff, 0 1px 2px #ffffff !important; }
.terminal.xterm [class*="xterm-color-2"], .terminal.xterm [class*="xterm-fg-2"] { color: #047857 !important; text-shadow: 0 0 2px #ffffff, 0 1px 2px #ffffff !important; }
.terminal.xterm [class*="xterm-color-3"], .terminal.xterm [class*="xterm-fg-3"] { color: #b45309 !important; text-shadow: 0 0 2px #ffffff, 0 1px 2px #ffffff !important; }
.terminal.xterm [class*="xterm-color-4"], .terminal.xterm [class*="xterm-fg-4"] { color: #1d4ed8 !important; text-shadow: 0 0 2px #ffffff, 0 1px 2px #ffffff !important; }
.terminal.xterm [class*="xterm-color-5"], .terminal.xterm [class*="xterm-fg-5"] { color: #be185d !important; text-shadow: 0 0 2px #ffffff, 0 1px 2px #ffffff !important; }
.terminal.xterm [class*="xterm-color-6"], .terminal.xterm [class*="xterm-fg-6"] { color: #0f766e !important; text-shadow: 0 0 2px #ffffff, 0 1px 2px #ffffff !important; }
.terminal.xterm [class*="xterm-color-7"], .terminal.xterm [class*="xterm-fg-7"] { color: ${font.terminal} !important; text-shadow: ${font.terminalShadow} !important; }
` : `
.terminal.xterm [class*="xterm-color-0"] { color: #94a3b8 !important; text-shadow: ${font.terminalShadow} !important; }
.terminal.xterm [class*="xterm-color-1"], .terminal.xterm [class*="xterm-fg-1"] { color: #f87171 !important; text-shadow: ${font.terminalShadow} !important; }
.terminal.xterm [class*="xterm-color-2"], .terminal.xterm [class*="xterm-fg-2"] { color: #4ade80 !important; text-shadow: ${font.terminalShadow} !important; }
.terminal.xterm [class*="xterm-color-3"], .terminal.xterm [class*="xterm-fg-3"] { color: #facc15 !important; text-shadow: ${font.terminalShadow} !important; }
.terminal.xterm [class*="xterm-color-4"], .terminal.xterm [class*="xterm-fg-4"] { color: #60a5fa !important; text-shadow: ${font.terminalShadow} !important; }
.terminal.xterm [class*="xterm-color-5"], .terminal.xterm [class*="xterm-fg-5"] { color: #f472b6 !important; text-shadow: ${font.terminalShadow} !important; }
.terminal.xterm [class*="xterm-color-6"], .terminal.xterm [class*="xterm-fg-6"] { color: #38bdf8 !important; text-shadow: ${font.terminalShadow} !important; }
.terminal.xterm [class*="xterm-color-7"], .terminal.xterm [class*="xterm-fg-7"] { color: ${font.terminal} !important; text-shadow: ${font.terminalShadow} !important; }
`}

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
div.group\/file-row button {
  background-color: rgba(255, 255, 255, 0.08) !important;
  border: 1px solid rgba(255, 255, 255, 0.14) !important;
  border-radius: 6px !important;
  color: #f1f5f9 !important;
  transition: all 0.18s ease !important;
}

div.shrink-0.flex.items-center.gap-0.5.border-b button:hover,
div.flex.items-center.justify-between.pl-3.pr-2.py-1 button:hover,
div.group\/file-row button:hover {
  background-color: rgba(244, 63, 94, 0.30) !important;
  border-color: rgba(244, 63, 94, 0.65) !important;
  box-shadow: 0 0 10px rgba(244, 63, 94, 0.40) !important;
}

div.flex.items-center.justify-between.pl-3.pr-2.py-1 span,
div.group\/file-row span {
  color: #f1f5f9 !important;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.8) !important;
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
/* 12.1 整个右侧辅助大容器（包含中侧终端与右侧抽屉）：背景必须完全透明，以左侧全局底图为背景！ */
div[data-aux-pane-open="true"] {
  position: relative !important;
  background-color: transparent !important;
  background-image: none !important;
  background: transparent !important;
  border-left: 1.5px solid rgba(249, 168, 212, 0.45) !important;
  box-shadow: 
    -1px 0 6px rgba(249, 168, 212, 0.40),
    -3px 0 14px rgba(244, 114, 182, 0.25) !important;
  z-index: 10 !important;
  overflow: hidden !important;
}

/* 12.1 整个右侧辅助大容器（包含中侧终端、Review面板与右侧抽屉）：背景必须完全透明，以左侧全局底图为背景！ */
div[data-aux-pane-open="true"],
[aria-label="Auxiliary Pane"],
div[data-aux-pane-open="true"] [aria-label="Auxiliary Pane"],
div[data-aux-pane-open="true"] > div,
div[data-aux-pane-open="true"] .shrink-0,
div[data-aux-pane-open="true"] .flex-grow,
div[data-aux-pane-open="true"] .border-b,
div[data-aux-pane-open="true"] .border-border,
div[data-aux-pane-open="true"] .bg-background,
[class*="terminal-drawer"] {
  background-color: transparent !important;
  background-image: none !important;
  background: transparent !important;
}

/* 12.2 【右】仅在右侧对话列表抽屉（Conversation面板，宽度约250px）独立展示右壁纸 */
div[data-aux-pane-open="true"] div.flex.flex-col.gap-2.overflow-y-auto.h-full.w-full.bg-background,
div[data-aux-pane-open="true"] div.flex-1.min-h-0 > div.flex.flex-col.gap-2.overflow-y-auto {
  position: relative !important;
  background-color: transparent !important;
  background-image: 
    linear-gradient(
      rgba(11, 12, 20, 0.12), 
      rgba(11, 12, 20, 0.20)
    )${isRightVideo ? '' : `,\n    url("${b64Right}")`} !important;
  background-size: cover !important;
  background-position: ${posRight} !important;
  background-repeat: no-repeat !important;
  border-left: 1px solid rgba(249, 168, 212, 0.35) !important;
  box-shadow: none !important;
}

.antigravity-slot-video[data-slot="right"] {
  position: absolute !important;
  top: 0 !important;
  left: 0 !important;
  width: 100% !important;
  height: 100% !important;
  object-fit: cover !important;
  object-position: ${posRight} !important;
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
  color: #f1f5f9 !important;
  font-weight: 600 !important;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.8) !important;
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
  color: #f1f5f9 !important;
  font-weight: 500 !important;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.8) !important;
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
  background-position: ${posSettings} !important;
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
  object-position: ${posSettings} !important;
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
  color: #f1f5f9 !important;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.8) !important;
  margin-top: 2px !important;
  margin-bottom: 2px !important;
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1) !important;
}

[role="dialog"] div.bg-sidebar button span,
[role="dialog"] div.bg-sidebar button svg {
  color: #f1f5f9 !important;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.8) !important;
}

[role="dialog"] div.bg-sidebar button:hover,
[role="dialog"] div.bg-sidebar button[data-state="active"],
[role="dialog"] div.bg-sidebar button[aria-selected="true"],
[role="dialog"] div.bg-sidebar button.bg-sidebar-muted,
[role="dialog"] div.bg-sidebar button[class*="hover\:bg"] {
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
  color: #f1f5f9 !important;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.8) !important;
}

[role="dialog"] p, [role="dialog"] [class*="text-muted-foreground"],
[role="dialog"] [class*="text-secondary-foreground"], [role="dialog"] span {
  color: rgba(226, 232, 240, 0.85) !important;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.8) !important;
}

[role="dialog"] [role="combobox"], [role="dialog"] select, [role="dialog"] [role="group"],
[role="dialog"] div.inline-flex.items-center.rounded-lg.border {
  background-color: rgba(18, 22, 44, 0.88) !important;
  border: 1px solid rgba(151, 213, 255, 0.40) !important;
  color: #f1f5f9 !important;
  border-radius: 8px !important;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3) !important;
}

[role="dialog"] button.inline-flex,
[role="dialog"] a.select-none.rounded,
[role="dialog"] [class*="grow"] button {
  backdrop-filter: blur(8px) !important;
  background-color: rgba(26, 32, 60, 0.82) !important;
  border: 1px solid rgba(151, 213, 255, 0.35) !important;
  color: #f1f5f9 !important;
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
  const posLeft = getSlotPosition(config, 'left');
  const posMid = getSlotPosition(config, 'mid');
  const posRight = getSlotPosition(config, 'right');
  const posBottom = getSlotPosition(config, 'bottom');
  const posSettings = getSlotPosition(config, 'settings');

  return `
  (function() {
    const SERVER_URL = 'http://127.0.0.1:${DEFAULT_PORT}';
    const config = ${configJson};
    const slotPositions = {
      'left': '${posLeft}',
      'mid': '${posMid}',
      'right': '${posRight}',
      'bottom': '${posBottom}',
      'settings': '${posSettings}'
    };

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
          leftVid.setAttribute('autoplay', '');
          leftVid.setAttribute('loop', '');
          leftVid.preload = 'auto';
          leftVid.setAttribute('preload', 'auto');
          leftVid.style.objectPosition = '${posLeft}';
          leftVid.addEventListener('loadedmetadata', function() {
            if (leftVid.paused) leftVid.play().catch(function() {});
          });
          leftVid.addEventListener('canplay', function() {
            if (leftVid.paused) leftVid.play().catch(function() {});
          });
          leftVid.addEventListener('loadeddata', function() {
            if (leftVid.paused) leftVid.play().catch(function() {});
          });
          let retryTimer = null;
          leftVid.addEventListener('error', function() {
            if (retryTimer) return;
            retryTimer = setTimeout(function() {
              retryTimer = null;
              if (leftVid && leftVid.error) {
                leftVid.src = src;
                leftVid.load();
                leftVid.play().catch(function() {});
              }
            }, 1200);
          });
          (document.body || document.documentElement).prepend(leftVid);
        }
        if (leftVid.dataset.currentSrc !== src) {
          leftVid.dataset.currentSrc = src;
          leftVid.src = src;
          leftVid.load();
          leftVid.play().catch(function() {});
        }
        leftVid.style.objectPosition = '${posLeft}';
        if (leftVid.paused && leftVid.readyState >= 1) {
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
          'div[data-aux-pane-open="true"] div.flex.flex-col.gap-2.overflow-y-auto',
          'div[data-aux-pane-open="true"] .overflow-y-auto',
          'div[data-aux-pane-open="true"] div.flex-1.min-h-0'
        ],
        'bottom': [
          '#antigravity\\.agentSidePanelInputBox > div.bg-card:not([role="listbox"]):not([data-mention-menu]):not([class*="bottom-full"])',
          '#antigravity\\.agentSidePanelInputBox > div[class*="bg-card"]:not([role="listbox"]):not([data-mention-menu]):not([class*="bottom-full"])',
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
              vid.setAttribute('autoplay', '');
              vid.setAttribute('loop', '');
              vid.preload = 'auto';
              vid.setAttribute('preload', 'auto');
              vid.style.objectPosition = slotPositions[slotKey] || 'center center';
              vid.addEventListener('loadedmetadata', function() {
                if (vid.paused) vid.play().catch(function() {});
              });
              vid.addEventListener('canplay', function() {
                if (vid.paused) vid.play().catch(function() {});
              });
              vid.addEventListener('loadeddata', function() {
                if (vid.paused) vid.play().catch(function() {});
              });
              let retryTimer = null;
              vid.addEventListener('error', function() {
                if (retryTimer) return;
                retryTimer = setTimeout(function() {
                  retryTimer = null;
                  if (vid && vid.error) {
                    vid.src = src;
                    vid.load();
                    vid.play().catch(function() {});
                  }
                }, 1200);
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
              vid.play().catch(function() {});
            }
            vid.style.objectPosition = slotPositions[slotKey] || 'center center';
            if (vid.paused && vid.readyState >= 1) {
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
        subtree: true,
        attributes: true,
        attributeFilter: ['data-aux-pane-open', 'data-state', 'aria-expanded', 'class', 'style', 'hidden']
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
      const activeConfig = slotsConfig || loadSlotsConfig();
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
                let done = false;
                const onDone = () => {
                  if (done) return;
                  done = true;
                  try { ws.close(); } catch(e) {}
                  finish();
                };
                ws.addEventListener('message', (evt) => {
                  try {
                    const msg = JSON.parse(evt.data);
                    if (msg.id === 1) {
                      onDone();
                    }
                  } catch(e) {
                    onDone();
                  }
                });
                ws.send(JSON.stringify({ id: 1, method: 'Runtime.evaluate', params: { expression: applyCode } }));
                setTimeout(onDone, 3000);
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
  const prevPosition = slotsConfig[slotKey]?.position || slotMeta.defaultPosition || 'center center';
  slotsConfig[slotKey] = {
    key: slotKey,
    file: targetFileName,
    type: isVideo ? 'video' : 'image',
    version: Date.now(),
    position: prevPosition,
    desc: slotMeta.desc
  };
  saveSlotsConfig(slotsConfig);
  console.log(`✓ slots_config.json 已更新配置`);

  console.log(`[2/4] 重新编译并输出 custom_theme.css...`);
  const css = generateMasterCss(slotsConfig);
  fs.writeFileSync(customCssPath, css, 'utf-8');
  try { fs.writeFileSync(path.join(wallpapersDir, 'custom_theme.css'), css, 'utf-8'); } catch(e) {}
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
      position: meta.defaultPosition || 'center center',
      desc: meta.desc
    };
  }
  baselineConfig.fontColor = FONT_PRESETS['pure-white'];
  saveSlotsConfig(baselineConfig);

  console.log(`✓ 初版文件已全部还原，正在重新编译并输出黄金基线样式...`);
  const css = generateMasterCss(baselineConfig);
  fs.writeFileSync(customCssPath, css, 'utf-8');
  try { fs.writeFileSync(path.join(wallpapersDir, 'custom_theme.css'), css, 'utf-8'); } catch(e) {}

  // Also update baselineCssPath so that baseline backup does not contain stale buggy selectors
  if (fs.existsSync(baselineCssPath)) {
    fs.writeFileSync(baselineCssPath, css, 'utf-8');
  }

  console.log(`✓ 黄金基线样式表已生成 (${(css.length / 1024 / 1024).toFixed(2)} MB)，正在热重载...`);
  const reloadPromise = await triggerLiveHotReload(css, baselineConfig);
  console.log(`✨ 成功还原为【初版】黄金基线！`);
  return reloadPromise;
}

async function setPosition(slotInput, posX, posY) {
  if (!slotInput) {
    console.error('❌ 请提供槽位名称: 左, 中, 右, 下, 设置');
    return false;
  }
  const slotKey = SLOT_ALIASES[slotInput.toLowerCase()];
  if (!slotKey || !SLOTS_META[slotKey]) {
    console.error(`❌ 未知槽位: "${slotInput}"。支持的槽位为: 左, 中, 右, 下, 设置`);
    return false;
  }

  let posStr;
  if (posY !== undefined && posY !== null && posY !== '') {
    const combined = `${posX} ${posY}`;
    const parsed = parsePosition(combined, SLOTS_META[slotKey].defaultPosition);
    posStr = parsed.str;
  } else {
    const parsed = parsePosition(posX, SLOTS_META[slotKey].defaultPosition);
    posStr = parsed.str;
  }

  const slotsConfig = loadSlotsConfig();
  if (!slotsConfig[slotKey]) {
    slotsConfig[slotKey] = {
      key: slotKey,
      file: SLOTS_META[slotKey].defaultFile,
      type: 'image',
      version: Date.now(),
      desc: SLOTS_META[slotKey].desc
    };
  }
  slotsConfig[slotKey].position = posStr;
  saveSlotsConfig(slotsConfig);

  console.log(`[1/3] 已设置槽位【${slotInput} (${SLOTS_META[slotKey].desc})】壁纸显示位置: ${posStr}`);

  console.log(`[2/3] 重新编译并输出 custom_theme.css...`);
  const css = generateMasterCss(slotsConfig);
  fs.writeFileSync(customCssPath, css, 'utf-8');
  try { fs.writeFileSync(path.join(wallpapersDir, 'custom_theme.css'), css, 'utf-8'); } catch(e) {}
  console.log(`✓ custom_theme.css 已更新 (${(css.length / 1024 / 1024).toFixed(2)} MB)`);

  console.log(`[3/3] 触发界面热重载与实时生效...`);
  const reloadPromise = await triggerLiveHotReload(css, slotsConfig);
  console.log(`✨ 【${slotInput}】壁纸位置已调整为 ${posStr}！已实时生效。`);
  return { ok: true, slot: slotKey, position: posStr };
}

async function adjustPosition(slotInput, direction, delta = 5) {
  if (!slotInput) {
    console.error('❌ 请提供槽位名称: 左, 中, 右, 下, 设置');
    return false;
  }
  const slotKey = SLOT_ALIASES[slotInput.toLowerCase()];
  if (!slotKey || !SLOTS_META[slotKey]) {
    console.error(`❌ 未知槽位: "${slotInput}"。支持的槽位为: 左, 中, 右, 下, 设置`);
    return false;
  }

  const d = (typeof delta === 'number') ? delta : (parseFloat(delta) || 5);
  const slotsConfig = loadSlotsConfig();
  const currentPosStr = getSlotPosition(slotsConfig, slotKey);
  const current = parsePosition(currentPosStr, SLOTS_META[slotKey].defaultPosition);

  let x = current.x;
  let y = current.y;

  const dir = String(direction || '').toLowerCase().trim();
  if (dir === 'up' || dir === 'u' || dir === 'w' || dir === '上' || dir === 'top' || dir === '1') {
    y = Math.max(0, y - d);
  } else if (dir === 'down' || dir === 's' || dir === '下' || dir === 'bottom' || dir === '2') {
    y = Math.min(100, y + d);
  } else if (dir === 'left' || dir === 'a' || dir === '左' || dir === '3') {
    x = Math.max(0, x - d);
  } else if (dir === 'right' || dir === 'd' || dir === '右' || dir === '4') {
    x = Math.min(100, x + d);
  } else if (dir === 'center' || dir === 'c' || dir === '中' || dir === '居中' || dir === '5') {
    x = 50;
    y = 50;
  } else {
    console.error(`❌ 未知移动方向: "${direction}"。支持: up/上/w/1, down/下/s/2, left/左/a/3, right/右/d/4, center/居中/c/5`);
    return false;
  }

  const newPosStr = `${x}% ${y}%`;
  return setPosition(slotInput, newPosStr);
}

async function resetPosition(slotInput) {
  const norm = String(slotInput || 'all').toLowerCase().trim();
  if (!slotInput || norm === 'all' || norm === '全部' || norm === 'reset' || norm === '重置' || norm === '*') {
    const slotsConfig = loadSlotsConfig();
    for (const [key, meta] of Object.entries(SLOTS_META)) {
      if (!slotsConfig[key]) {
        slotsConfig[key] = {
          key,
          file: meta.defaultFile,
          type: 'image',
          version: Date.now(),
          desc: meta.desc
        };
      }
      slotsConfig[key].position = meta.defaultPosition || 'center center';
    }
    saveSlotsConfig(slotsConfig);
    const css = generateMasterCss(slotsConfig);
    fs.writeFileSync(customCssPath, css, 'utf-8');
    try { fs.writeFileSync(path.join(wallpapersDir, 'custom_theme.css'), css, 'utf-8'); } catch(e) {}
    await triggerLiveHotReload(css, slotsConfig);
    console.log(`✨ 所有槽位壁纸位置已重置为默认值！`);
    return { ok: true, slot: 'all' };
  }

  const slotKey = SLOT_ALIASES[norm];
  if (!slotKey || !SLOTS_META[slotKey]) {
    console.error(`❌ 未知槽位: "${slotInput}"。支持的槽位为: 左, 中, 右, 下, 设置, 或 all (全部)`);
    return false;
  }

  const defaultPos = SLOTS_META[slotKey].defaultPosition || 'center center';
  return setPosition(slotInput, defaultPos);
}

async function setFontColor(colorOrPreset) {
  if (!colorOrPreset) {
    console.error('❌ 请输入有效的预设名称或 Hex 颜色值 (例如: pure-white, obsidian-black, #ffffff, #1a1a2e)');
    return false;
  }
  const resolved = resolveFontColor(colorOrPreset, false);
  if (!resolved) {
    console.error(`❌ 未识别的字体预设或无效 Hex 颜色: "${colorOrPreset}"`);
    console.error(`   支持的预设序号: 1 - ${Object.keys(FONT_PRESETS).length}`);
    console.error(`   支持的预设名称: ${Object.keys(FONT_PRESETS).join(', ')}`);
    console.error(`   支持的Hex代码: 例如 #ffffff, #1a1a2e, #ff69b4, #00e5ff (或不带#如 1a1a2e)`);
    console.error(`   提示: 可使用 node core/theme_engine.js --list-font-colors 查看所有预设详情。`);
    return false;
  }
  const slotsConfig = loadSlotsConfig();
  slotsConfig.fontColor = resolved;
  saveSlotsConfig(slotsConfig);

  console.log(`[1/3] 已选定字体颜色: 【${resolved.name}】 (${resolved.primary})`);
  console.log(`      ${resolved.desc}`);

  console.log(`[2/3] 重新编译并输出 custom_theme.css...`);
  const css = generateMasterCss(slotsConfig);
  fs.writeFileSync(customCssPath, css, 'utf-8');
  try { fs.writeFileSync(path.join(wallpapersDir, 'custom_theme.css'), css, 'utf-8'); } catch(e) {}
  console.log(`✓ custom_theme.css 已更新 (${(css.length / 1024 / 1024).toFixed(2)} MB)`);

  console.log(`[3/3] 触发界面热重载与实时生效...`);
  const reloadPromise = await triggerLiveHotReload(css, slotsConfig);
  console.log(`✨ 字体颜色切换完成！已在应用内实时生效。`);
  return reloadPromise;
}

function listFontPresets() {
  const config = loadSlotsConfig();
  const current = resolveFontColor(config.fontColor);
  console.log('====================================================================');
  console.log('   🎨 Antigravity 字体颜色与高对比预设列表');
  console.log('====================================================================\n');
  console.log(`当前激活字体颜色: 【${current.name}】 (${current.primary})\n`);
  
  console.log('序号 | 预设名称                 | 主色调   | 轮廓发光       | 适用壁纸场景');
  console.log('-----+--------------------------+----------+----------------+------------------------------------');
  let idx = 1;
  for (const [key, preset] of Object.entries(FONT_PRESETS)) {
    const isCurrent = (current.id === preset.id) ? ' 👉 [当前]' : '';
    const nameStr = (preset.name + isCurrent).padEnd(24);
    const colorStr = preset.primary.padEnd(8);
    const outlineStr = preset.isDarkText ? '高亮白光轮廓' : '深邃暗影轮廓';
    console.log(`  ${idx}  | ${nameStr} | ${colorStr} | ${outlineStr} | ${preset.desc}`);
    idx++;
  }
  console.log('\n💡 支持自定义颜色: 可直接输入任意 Hex 颜色值 (例如: #ffffff, #1a1a2e, #ff69b4, #00e5ff)');
  console.log('   CLI 用法: node core/theme_engine.js --set-font-color <预设名/序号/Hex>');
  console.log('   批处理用法: bin\\swap_wallpaper.bat --font <预设名/序号/Hex>\n');
  return FONT_PRESETS;
}

function listSlotsStatus() {
  const config = loadSlotsConfig();
  const font = resolveFontColor(config.fontColor);
  console.log('=======================================================');
  console.log('   🌸 Antigravity 壁纸槽位状态一览');
  console.log('=======================================================');
  console.log('');
  console.log(`🎨 当前字体颜色: 【${font.name}】 (${font.primary}) [${font.desc}]`);
  console.log('');
  for (const [key, item] of Object.entries(config)) {
    if (key === 'fontColor') continue;
    const isVid = item.type === 'video';
    const typeLabel = isVid ? '🎬 [动态视频]' : '🖼️ [静态壁纸]';
    const filePath = path.join(wallpapersDir, item.file);
    const exists = fs.existsSync(filePath);
    const size = exists ? (fs.statSync(filePath).size / 1024 / 1024).toFixed(2) + ' MB' : '未找到文件';
    const pos = getSlotPosition(config, key);
    console.log(`槽位 [${key.padEnd(8)}] (${item.desc}):`);
    console.log(`   类型: ${typeLabel}`);
    console.log(`   🎯 位置: ${pos}`);
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
  } else if (
    args[0] === '--set-font-color' || args[0] === '--set-font' || args[0] === '--font-color' ||
    args[0] === '--font' || args[0] === '-font' || args[0] === '-f' ||
    args[0] === 'set-font' || (args[0] === 'font' && args[1])
  ) {
    if (!args[1]) {
      console.error('❌ 请输入字体预设名称、序号或 Hex 颜色代码 (例如: pure-white, obsidian-black, #ffffff, #1a1a2e)');
      console.error('   提示: 可使用 node core/theme_engine.js --list-font-colors 查看所有可用预设。');
      process.exit(1);
    }
    setFontColor(args[1]).then(ok => {
      if (!ok) process.exit(1);
    }).catch(err => {
      console.error(err);
      process.exit(1);
    });
  } else if (
    args[0] === '--list-font-colors' || args[0] === '--list-fonts' || args[0] === '--font-colors' ||
    args[0] === '--fonts' || args[0] === '-fonts' || args[0] === '-list-fonts' ||
    args[0] === 'list-fonts' || args[0] === 'fonts' || (args[0] === 'font' && !args[1])
  ) {
    listFontPresets();
  } else if (
    args[0] === '--set-position' || args[0] === '--set-pos' || args[0] === '--pos' ||
    args[0] === 'set-pos' || args[0] === 'set-position' || args[0] === 'pos' ||
    args[0] === 'position' || (args[0] === '--position' && args[1])
  ) {
    if (!args[1] || !args[2]) {
      console.error('❌ 参数错误。用法: node core/theme_engine.js --set-pos <槽位(左/中/右/下/设置)> <X坐标> [Y坐标]');
      console.error('   示例: node core/theme_engine.js --set-pos 左 50% 30%');
      console.error('   示例: node core/theme_engine.js --set-pos 中 "center 20%"');
      process.exit(1);
    }
    setPosition(args[1], args[2], args[3]).then(res => {
      if (!res) process.exit(1);
    }).catch(err => {
      console.error(err);
      process.exit(1);
    });
  } else if (
    args[0] === '--adjust-position' || args[0] === '--adjust-pos' || args[0] === '--adj-pos' ||
    args[0] === '--adj' || args[0] === 'adjust-pos' || args[0] === 'adjust-position' ||
    args[0] === 'adj-pos' || args[0] === 'adj'
  ) {
    if (!args[1] || !args[2]) {
      console.error('❌ 参数错误。用法: node core/theme_engine.js --adj-pos <槽位> <方向(up/down/left/right)> [步长%]');
      console.error('   示例: node core/theme_engine.js --adj-pos 左 up 5');
      console.error('   示例: node core/theme_engine.js --adj-pos 左 w 5');
      process.exit(1);
    }
    adjustPosition(args[1], args[2], args[3]).then(res => {
      if (!res) process.exit(1);
    }).catch(err => {
      console.error(err);
      process.exit(1);
    });
  } else if (
    args[0] === '--reset-position' || args[0] === '--reset-pos' ||
    args[0] === 'reset-pos' || args[0] === 'reset-position' ||
    args[0] === 'reset'
  ) {
    resetPosition(args[1] || 'all').then(res => {
      if (!res) process.exit(1);
    }).catch(err => {
      console.error(err);
      process.exit(1);
    });
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
  } else if (
    args[0] === '--status' || args[0] === '--list' || args[0] === '-l' ||
    args[0] === '--list-slots' || args[0] === 'list-slots' || args[0] === '--slots' ||
    args[0] === 'slots' || args[0] === 'status'
  ) {
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
    try { fs.writeFileSync(path.join(wallpapersDir, 'custom_theme.css'), css, 'utf-8'); } catch(e) {}
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
  setFontColor,
  listFontPresets,
  resolveFontColor,
  parseHexColor,
  adjustBrightness,
  setPosition,
  adjustPosition,
  resetPosition,
  parsePosition,
  getSlotPosition,
  parseCoordinate,
  FONT_PRESETS,
  SLOTS,
  SLOTS_META,
  SLOT_ALIASES,
  VIDEO_EXTS,
  IMAGE_EXTS
};

