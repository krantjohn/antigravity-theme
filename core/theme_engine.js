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
const localThemeEnginePath = path.join(antigravityDir, 'theme_engine.js');
const repoThemeEnginePath = path.join(__dirname, 'theme_engine.js');
if (fs.existsSync(repoThemeEnginePath)) {
  try {
    fs.copyFileSync(repoThemeEnginePath, localThemeEnginePath);
  } catch(e) {}
}
const baselineDir = path.join(antigravityDir, 'backups', 'baseline_v1_初版');
const slotsConfigPath = path.join(antigravityDir, 'slots_config.json');
const presetsDir = path.join(antigravityDir, 'presets');
if (!fs.existsSync(presetsDir)) {
  try { fs.mkdirSync(presetsDir, { recursive: true }); } catch (e) {}
}

function getPresetsDir() {
  if (!fs.existsSync(presetsDir)) {
    try { fs.mkdirSync(presetsDir, { recursive: true }); } catch (e) {}
  }
  return presetsDir;
}

/**
 * 确保 MP4 视频为 FastStart 格式（将 moov 原子前置到 ftyp 之后）
 * 彻底消除 Chromium 播放视频时探测尾部原子的多次 HTTP 往返与卡顿延迟
 */
function ensureMp4Faststart(filePath) {
  try {
    if (!fs.existsSync(filePath)) return false;
    const ext = path.extname(filePath).toLowerCase();
    if (ext !== '.mp4' && ext !== '.m4v' && ext !== '.mov') return false;
    const stat = fs.statSync(filePath);
    if (stat.size < 32) return false;
    const fd = fs.openSync(filePath, 'r');
    
    const atoms = [];
    let offset = 0;
    const hdrBuf = Buffer.alloc(16);
    
    while (offset < stat.size) {
      const bytesRead = fs.readSync(fd, hdrBuf, 0, 8, offset);
      if (bytesRead < 8) break;
      let atomSize = hdrBuf.readUInt32BE(0);
      const atomType = hdrBuf.toString('latin1', 4, 8);
      
      if (atomSize === 1) {
        fs.readSync(fd, hdrBuf, 8, 8, offset + 8);
        atomSize = Number(hdrBuf.readBigUInt64BE(8));
      } else if (atomSize === 0) {
        atomSize = stat.size - offset;
      }
      
      atoms.push({ type: atomType, offset, size: atomSize });
      if (atomSize <= 0) break;
      offset += atomSize;
    }
    
    if (atoms.length >= 2 && atoms[0].type === 'ftyp' && atoms[1].type === 'moov') {
      fs.closeSync(fd);
      return false; // 已经为 FastStart 格式
    }
    
    const moovIdx = atoms.findIndex(a => a.type === 'moov');
    if (moovIdx === -1) {
      fs.closeSync(fd);
      return false;
    }
    
    const moovAtom = atoms[moovIdx];
    const moovBuf = Buffer.alloc(moovAtom.size);
    fs.readSync(fd, moovBuf, 0, moovAtom.size, moovAtom.offset);
    fs.closeSync(fd);
    
    // 偏移修正：moov 移动到前面后，内部所有 chunk offsets 需加上 shift
    const shift = moovAtom.size;
    let pos = 0;
    while (pos < moovBuf.length - 8) {
      const tag = moovBuf.toString('latin1', pos + 4, pos + 8);
      if (tag === 'stco') {
        const atomSize = moovBuf.readUInt32BE(pos);
        const count = moovBuf.readUInt32BE(pos + 12);
        for (let i = 0; i < count; i++) {
          const entryPos = pos + 16 + i * 4;
          if (entryPos + 4 <= moovBuf.length) {
            const curVal = moovBuf.readUInt32BE(entryPos);
            moovBuf.writeUInt32BE(curVal + shift, entryPos);
          }
        }
        pos += atomSize;
      } else if (tag === 'co64') {
        const atomSize = moovBuf.readUInt32BE(pos);
        const count = moovBuf.readUInt32BE(pos + 12);
        for (let i = 0; i < count; i++) {
          const entryPos = pos + 16 + i * 8;
          if (entryPos + 8 <= moovBuf.length) {
            const curVal = moovBuf.readBigUInt64BE(entryPos);
            moovBuf.writeBigUInt64BE(curVal + BigInt(shift), entryPos);
          }
        }
        pos += atomSize;
      } else {
        pos++;
      }
    }
    
    const tempOut = filePath + '.faststart_tmp';
    const outFd = fs.openSync(tempOut, 'w');
    const readFd = fs.openSync(filePath, 'r');
    
    for (const a of atoms) {
      if (a.type === 'ftyp') {
        const ftypBuf = Buffer.alloc(a.size);
        fs.readSync(readFd, ftypBuf, 0, a.size, a.offset);
        fs.writeSync(outFd, ftypBuf);
        fs.writeSync(outFd, moovBuf);
      } else if (a.type === 'moov') {
        continue;
      } else {
        let remaining = a.size;
        let readPos = a.offset;
        const chunkBuf = Buffer.alloc(1024 * 1024);
        while (remaining > 0) {
          const toRead = Math.min(remaining, chunkBuf.length);
          fs.readSync(readFd, chunkBuf, 0, toRead, readPos);
          fs.writeSync(outFd, chunkBuf, 0, toRead);
          remaining -= toRead;
          readPos += toRead;
        }
      }
    }
    
    fs.closeSync(readFd);
    fs.closeSync(outFd);
    
    fs.unlinkSync(filePath);
    fs.renameSync(tempOut, filePath);
    return true;
  } catch (e) {
    console.warn(`[FastStart] 优化视频失败: ${filePath}`, e.message);
    return false;
  }
}

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
      if (config[key].type === 'video' && !config[key].poster) {
        const prefix = key === 'bottom' ? 'input' : key;
        const matchingPoster = allFiles.find(f => {
          const e = path.extname(f).toLowerCase();
          return IMAGE_EXTS.has(e) && f.startsWith(`${prefix}_poster`);
        });
        if (matchingPoster) {
          config[key].poster = matchingPoster;
          modified = true;
        }
      }
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
  let resolvedName = filename;
  const ext = path.extname(filename).toLowerCase();
  if (ext === '.gif') {
    const base = filename.slice(0, -ext.length);
    for (const altExt of ['.jpg', '.jpeg', '.png', '.webp']) {
      const altFile = base + altExt;
      if (fs.existsSync(path.join(wallpapersDir, altFile)) || fs.existsSync(path.join(repoWallpapersDir, altFile))) {
        resolvedName = altFile;
        break;
      }
    }
  }
  let filePath = path.join(wallpapersDir, resolvedName);
  if (!fs.existsSync(filePath)) {
    const fallbackPath = path.join(repoWallpapersDir, resolvedName);
    if (fs.existsSync(fallbackPath)) {
      filePath = fallbackPath;
    } else {
      filePath = path.join(wallpapersDir, filename);
      if (!fs.existsSync(filePath)) {
        const fb = path.join(repoWallpapersDir, filename);
        if (fs.existsSync(fb)) filePath = fb;
        else {
          console.warn(`Warning: ${filename} not found in wallpapers directory.`);
          return '';
        }
      }
    }
  }
  const buf = fs.readFileSync(filePath);
  const actualExt = path.extname(filePath).toLowerCase();
  let mime = 'image/jpeg';
  if (buf.length >= 4 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4E && buf[3] === 0x47) {
    mime = 'image/png';
  } else if (buf.length >= 3 && buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46) {
    mime = 'image/gif';
  } else if (actualExt === '.webp') {
    mime = 'image/webp';
  } else if (actualExt === '.svg') {
    mime = 'image/svg+xml';
  }
  return `data:${mime};base64,` + buf.toString('base64');
}

/**
 * Inspects video container atoms (MP4/WebM) to detect the video codec.
 * Identifies H.264 (AVC1), VP8/VP9, AV1 as Chromium/Electron compatible.
 * Warns if HEVC/H.265 (hvc1/hev1) or ProRes is detected.
 */
function detectVideoCodec(filePath) {
  if (!filePath || !fs.existsSync(filePath)) {
    return { codec: 'unknown', isElectronSupported: false, error: 'File not found' };
  }
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.webm' || ext === '.ogv') {
    return { codec: ext.slice(1), isElectronSupported: true };
  }
  try {
    const fd = fs.openSync(filePath, 'r');
    const stat = fs.fstatSync(fd);
    const readSize = Math.min(stat.size, 4 * 1024 * 1024);
    const buf = Buffer.alloc(readSize);
    fs.readSync(fd, buf, 0, readSize, 0);

    let tailBuf = null;
    if (stat.size > readSize) {
      const tailSize = Math.min(stat.size - readSize, 2 * 1024 * 1024);
      tailBuf = Buffer.alloc(tailSize);
      fs.readSync(fd, tailBuf, 0, tailSize, stat.size - tailSize);
    }
    fs.closeSync(fd);

    const checkBuf = (b) => {
      if (b.includes(Buffer.from('avc1')) || b.includes(Buffer.from('avc3'))) {
        return { codec: 'h264', isElectronSupported: true };
      }
      if (b.includes(Buffer.from('vp09')) || b.includes(Buffer.from('vp08'))) {
        return { codec: 'vp9', isElectronSupported: true };
      }
      if (b.includes(Buffer.from('av01'))) {
        return { codec: 'av1', isElectronSupported: true };
      }
      if (b.includes(Buffer.from('hvc1')) || b.includes(Buffer.from('hev1'))) {
        return {
          codec: 'hevc',
          isElectronSupported: false,
          warning: '该视频使用 HEVC/H.265 编码，Electron 默认不支持解码此编码。系统已自动提取高清静态首帧海报作为兜底保障，杜绝黑屏！'
        };
      }
      if (b.includes(Buffer.from('apch')) || b.includes(Buffer.from('apcn')) || b.includes(Buffer.from('apcs'))) {
        return { codec: 'prores', isElectronSupported: false, warning: 'ProRes 编码不被浏览器支持。已自动配置静态海报兜底。' };
      }
      return null;
    };

    let result = checkBuf(buf);
    if (!result && tailBuf) {
      result = checkBuf(tailBuf);
    }
    if (result) return result;

    return { codec: 'unknown', isElectronSupported: true };
  } catch (e) {
    return { codec: 'unknown', isElectronSupported: true, error: e.message };
  }
}

/**
 * Automatically extracts a crystal-clear frame from any video using OpenCV or Python/ffmpeg.
 * Guaranteed zero-black fallback even when a standalone video has no companion image!
 */
function extractPosterFromVideo(videoPath, targetPosterPath) {
  if (!videoPath || !fs.existsSync(videoPath)) return false;
  const candidates = [
    'D:\\SteamLibrary\\steamapps\\common\\wallpaper_engine\\dlc\\pymidas\\python.exe',
    'python',
    'python3'
  ];
  const cp = require('child_process');
  for (const py of candidates) {
    try {
      const vSafe = videoPath.replace(/\\/g, '/');
      const pSafe = targetPosterPath.replace(/\\/g, '/');
      const script = 'import cv2, sys; cap = cv2.VideoCapture(r\x22' + vSafe + '\x22); cap.set(cv2.CAP_PROP_POS_MSEC, 1000); ret, f = cap.read(); (not ret) and (cap.set(cv2.CAP_PROP_POS_FRAMES, 0), None); ret, f = (ret, f) if ret else cap.read(); cv2.imwrite(r\x22' + pSafe + '\x22, f) if ret else sys.exit(1); cap.release()';
      cp.execFileSync(py, ['-c', script], { timeout: 8000, stdio: 'pipe', windowsHide: true });
      if (fs.existsSync(targetPosterPath) && fs.statSync(targetPosterPath).size > 1000) {
        return true;
      }
    } catch (e) {}
  }
  return false;
}

/**
 * Searches the folder of a video for companion poster or preview images (e.g. from Wallpaper Engine workshop items).
 */
function findCompanionPoster(videoPath) {
  if (!videoPath) return null;
  try {
    const dir = path.dirname(videoPath);
    if (!fs.existsSync(dir)) return null;

    // 1. Check if project.json exists in directory
    const pjPath = path.join(dir, 'project.json');
    if (fs.existsSync(pjPath)) {
      try {
        const pj = JSON.parse(fs.readFileSync(pjPath, 'utf8'));
        if (pj.preview) {
          const pCandidate = path.join(dir, pj.preview);
          if (fs.existsSync(pCandidate)) return pCandidate;
        }
      } catch (e) {}
    }

    // 2. Common preview names
    const baseWithoutExt = path.basename(videoPath, path.extname(videoPath));
    const commonNames = [
      'preview.gif', 'preview.jpg', 'preview.png', 'preview.webp',
      'poster.jpg', 'poster.png', 'cover.jpg', 'cover.png',
      `${baseWithoutExt}.jpg`, `${baseWithoutExt}.png`, `${baseWithoutExt}.webp`, `${baseWithoutExt}.gif`
    ];
    for (const name of commonNames) {
      const p = path.join(dir, name);
      if (fs.existsSync(p)) return p;
    }

    // 3. Any image in the same directory
    const files = fs.readdirSync(dir);
    for (const f of files) {
      const ext = path.extname(f).toLowerCase();
      if (IMAGE_EXTS.has(ext)) {
        return path.join(dir, f);
      }
    }
  } catch (e) {}
  return null;
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

  // Zero-Black-Void Protection:
  // Fallback static wallpapers guarantee that body::before and every container ALWAYS has a crisp image,
  // preventing any black screen during video buffering, stalls, or decoder errors!
  const leftImg = isLeftVideo ? (slotsConfig.left.poster || 'left_wallpaper.jpg') : (slotsConfig.left?.file || 'left_wallpaper.jpg');
  const midImg = isMidVideo ? (slotsConfig.mid.poster || 'mid_wallpaper.jpg') : (slotsConfig.mid?.file || 'mid_wallpaper.jpg');
  const rightImg = isRightVideo ? (slotsConfig.right.poster || 'right_wallpaper.jpg') : (slotsConfig.right?.file || 'right_wallpaper.jpg');
  const bottomImg = isBottomVideo ? (slotsConfig.bottom.poster || 'input_wallpaper.jpg') : (slotsConfig.bottom?.file || 'input_wallpaper.jpg');
  const settingsImg = isSettingsVideo ? (slotsConfig.settings.poster || 'settings_wallpaper.png') : (slotsConfig.settings?.file || 'settings_wallpaper.png');

  const b64Left = getBase64(leftImg) || getBase64('left_wallpaper.jpg');
  const b64Mid = getBase64(midImg) || getBase64('mid_wallpaper.jpg');
  const b64Right = getBase64(rightImg) || getBase64('right_wallpaper.jpg');
  const b64Bottom = getBase64(bottomImg) || getBase64('input_wallpaper.jpg');
  const b64Settings = getBase64(settingsImg) || getBase64('settings_wallpaper.png');

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
  background-image: linear-gradient(
      rgba(11, 12, 20, 0.06), 
      rgba(11, 12, 20, 0.10)
    )${b64Left ? `,\n    url("${b64Left}")` : ''} !important;
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
  contain: layout paint !important;
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

/* 6.1 顶部标题栏与窗口原生控制按钮防碰撞防御 (Windows Electron Native Window Controls Collision Prevention) */
/* 右侧边栏展开/收起按钮紧靠 Windows 原生控制按钮左侧 (~138px) 并保留自然间距 */
div.absolute.top-0.right-0.z-50.flex.items-center.shrink-0,
div.absolute.top-0:has(> div > [data-testid="toggle-aux-sidebar"]),
div.absolute.top-0:has(> [data-testid="toggle-aux-sidebar"]),
div:has(> div > [data-testid="toggle-aux-sidebar"]):not([class*="group"]):not([class*="pane"]) {
  right: max(138px, calc(100vw - env(titlebar-area-width, calc(100vw - 138px)))) !important;
}

/* 辅助面板展开时顶栏标签页与加号按钮右侧内边距，确保不被最大化/侧边栏切换按钮遮挡 (64px按钮组 + 8px自然间距 = 72px) */
div[data-aux-pane-open="true"] div.shrink-0.flex.items-center.border-b:has([data-testid="aux-panel-plus-dropdown-trigger"]),
div[data-aux-pane-open="true"] div.shrink-0.flex.items-center.border-b:has(button[aria-label*="tab" i]) {
  padding-right: calc(max(138px, calc(100vw - env(titlebar-area-width, calc(100vw - 138px)))) + 72px) !important;
}

/* 当辅助面板收起时，主对话顶栏更多操作容器紧邻侧边栏切换按钮，严格限定于父级容器，杜绝子元素重复嵌套叠加 padding (32px单按钮 + 10px自然间距 = 42px) */
div.h-screen.w-screen:not(:has(div[data-aux-pane-open="true"])) div.flex.items-center.justify-end.shrink-0:has([data-testid="titlebar-more-actions"]) {
  padding-right: calc(max(138px, calc(100vw - env(titlebar-area-width, calc(100vw - 138px)))) + 42px) !important;
}
div.h-screen.w-screen:not(:has(div[data-aux-pane-open="true"])) div.flex.items-center.justify-end.shrink-0:has([data-testid="titlebar-more-actions"]) > div {
  padding-right: 0px !important;
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
  background-color: rgba(14, 16, 28, 0.92) !important;
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
[id="antigravity.agentSidePanelInputBox"],
div[data-testid="agent-input-box"],
div.rounded-2xl.bg-card-border:has(> div.bg-card),
div:has(> [id="antigravity.agentSidePanelInputBox"]) {
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
[id="antigravity.agentSidePanelInputBox"] > div.bg-card:not([role="listbox"]):not([role="menu"]):not([data-mention-menu]):not([data-radix-popper-content-wrapper]):not([class*="bottom-full"]):not([class*="absolute"]):not([data-state="open"]),
[id="antigravity.agentSidePanelInputBox"] > div[class*="bg-card"]:not([role="listbox"]):not([role="menu"]):not([data-mention-menu]):not([data-radix-popper-content-wrapper]):not([class*="bottom-full"]):not([class*="absolute"]):not([data-state="open"]),
div.rounded-2xl.bg-card-border > div.bg-card:not([role="listbox"]):not([role="menu"]):not([data-mention-menu]):not([data-radix-popper-content-wrapper]):not([class*="bottom-full"]):not([class*="absolute"]):not([data-state="open"]) {
  position: relative !important;
  background-color: transparent !important;
  background-image: 
    linear-gradient(
      rgba(12, 14, 24, 0.15), 
      rgba(12, 14, 24, 0.28)
    )${b64Bottom ? `,\n    url("${b64Bottom}")` : ''} !important;
  background-size: cover !important;
  background-position: ${posBottom} !important;
  background-repeat: no-repeat !important;
  border-radius: 15px !important;
  overflow: hidden !important;
}

/* 强制输入卡片内部所有子元素（文本输入行、工具栏、附件预览栏）背景透明且无多余贴图 */
[id="antigravity.agentSidePanelInputBox"] > div.bg-card:not([role="listbox"]):not([data-mention-menu]) div:not([class*="thumbnail"]):not(img),
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
[id="antigravity.agentSidePanelInputBox"] [role="listbox"],
[id="antigravity.agentSidePanelInputBox"] [data-mention-menu],
[id="antigravity.agentSidePanelInputBox"] div.absolute,
[id="antigravity.agentSidePanelInputBox"] div[class*="bottom-full"] {
  background-image: none !important;
}

div[role="listbox"][data-mention-menu],
div[role="listbox"][aria-label="Mentions"],
div[data-mention-menu],
[id="antigravity.agentSidePanelInputBox"] div[role="listbox"],
[id="antigravity.agentSidePanelInputBox"] div.absolute.bottom-full.bg-card,
[id="antigravity.agentSidePanelInputBox"] div[class*="bottom-full"] {
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
[id="antigravity.agentSidePanelInputBox"] div[role="listbox"] div[class*="overflow-y-auto"] {
  background-color: transparent !important;
  background-image: none !important;
}

div[role="listbox"][data-mention-menu] [role="option"],
div[role="listbox"][data-mention-menu] div[id^="typeahead-item"],
div[role="listbox"][data-mention-menu] div.cursor-pointer,
[data-mention-menu] [role="option"],
[data-mention-menu] div[id^="typeahead-item"],
[data-mention-menu] div.cursor-pointer,
[id="antigravity.agentSidePanelInputBox"] [role="listbox"] [role="option"],
[id="antigravity.agentSidePanelInputBox"] [role="listbox"] div.cursor-pointer {
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
[id="antigravity.agentSidePanelInputBox"] [role="listbox"] [role="option"]:hover,
[id="antigravity.agentSidePanelInputBox"] [role="listbox"] [role="option"][aria-selected="true"],
[id="antigravity.agentSidePanelInputBox"] [role="listbox"] div.cursor-pointer:hover {
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
[id="antigravity.agentSidePanelInputBox"] [role="listbox"] span,
[id="antigravity.agentSidePanelInputBox"] [role="listbox"] div {
  color: ${font.primary} !important;
  text-shadow: ${font.shadow} !important;
}

div[role="listbox"][data-mention-menu] svg,
[data-mention-menu] svg,
[id="antigravity.agentSidePanelInputBox"] [role="listbox"] svg {
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
  background: rgba(14, 16, 28, 0.55) !important;
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
  background-color: rgba(15, 18, 30, 0.92) !important;
  backdrop-filter: blur(8px) saturate(130%) !important;
  -webkit-backdrop-filter: blur(8px) saturate(130%) !important;
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
    )${b64Mid ? `,\n    url("${b64Mid}")` : ''} !important;
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
div:has(> div > div > .terminal.xterm) div.flex.items-center.justify-between.pl-3.pr-2.py-1 {
  background-color: rgba(11, 12, 20, 0.18) !important;
  backdrop-filter: blur(14px) saturate(140%) !important;
  -webkit-backdrop-filter: blur(14px) saturate(140%) !important;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08) !important;
}

div.group\\/file-row:has([class*="font-medium"]),
div.group\\/file-row {
  background-color: rgba(11, 12, 20, 0.35) !important;
  border-bottom: 1px solid rgba(255, 255, 255, 0.04) !important;
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
div[data-aux-pane-open="true"] > div:not(.flex.flex-col.gap-2.overflow-y-auto.h-full.w-full):not([class*="terminal-drawer"]),
div[data-aux-pane-open="true"] .shrink-0,
div[data-aux-pane-open="true"] .flex-grow,
div[data-aux-pane-open="true"] .border-b,
div[data-aux-pane-open="true"] .border-border,
div[data-aux-pane-open="true"] .bg-background:not(.flex.flex-col.gap-2.overflow-y-auto.h-full.w-full):not([class*="terminal-drawer"]) {
  background-color: transparent !important;
  background-image: none !important;
  background: transparent !important;
}

/* 12.2 【右】仅在展开的右侧独立会话抽屉展示右壁纸 (彻底移除终端选择器，杜绝与中壁纸争抢冲突) */
div[data-aux-pane-open="true"] div.flex.flex-col.gap-2.overflow-y-auto.h-full.w-full.bg-background,
div[data-aux-pane-open="true"] [class*="terminal-drawer"] {
  position: relative !important;
  background-color: transparent !important;
  background-image: 
    linear-gradient(
      rgba(11, 12, 20, 0.12), 
      rgba(11, 12, 20, 0.20)
    )${b64Right ? `,\n    url("${b64Right}")` : ''} !important;
  background-size: cover !important;
  background-position: ${posRight} !important;
  background-repeat: no-repeat !important;
  border-left: 1px solid rgba(249, 168, 212, 0.35) !important;
  box-shadow: none !important;
}

/* 严禁右壁纸污染整个辅助面板、Overview总览、任务时间线、Artifact工件预览或Review审查区！ */
[aria-label="Auxiliary Pane"],
[aria-label="Auxiliary Pane"] > div:not(.flex.flex-col.gap-2.overflow-y-auto.h-full.w-full):not([class*="terminal-drawer"]),
[aria-label="Overview"],
[aria-label="Overview"] *,
[aria-label="Review"],
[aria-label="Review"] *,
div[role="region"][aria-label="Overview"],
div[data-aux-pane-open="true"] [aria-label="Auxiliary Pane"],
div[data-aux-pane-open="true"] .py-3.flex.h-full.w-full.flex-col.gap-6.flex-grow.min-h-0.overflow-y-auto {
  background-image: none !important;
  background-color: transparent !important;
  background: transparent !important;
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

div:has([id="antigravity.agentSidePanelInputBox"]) > div,
div:has([id="antigravity.agentSidePanelInputBox"]) .overflow-y-auto {
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
  background-color: rgba(14, 16, 30, 0.58) !important;
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
  background-color: transparent !important;
  background-image: 
    linear-gradient(
      rgba(8, 10, 20, 0.20), 
      rgba(8, 10, 20, 0.35)
    )${b64Settings ? `,\n    url("${b64Settings}")` : ''} !important;
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
  background-color: rgba(26, 32, 60, 0.88) !important;
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
  transform: translate3d(0, 0, 0) !important;
  backface-visibility: hidden !important;
  contain: layout paint !important;
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

    function checkAndShowVideo(v) {
      if (!v) return;
      if (v.style.display !== 'block') {
        v.style.display = 'block';
      }
    }

    // 智能可视性判定引擎：精确感知抽屉折叠、终端收缩、设置弹窗关闭、祖先隐藏及视口相交
    function isVideoVisible(v) {
      if (!v || !v.isConnected) return false;
      if (v.id === 'antigravity-video-left') return !document.hidden;
      if (document.hidden) return false;
      const rect = v.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return false;
      if (v.closest('[hidden], [aria-hidden="true"], [data-state="closed"]')) return false;
      const style = window.getComputedStyle(v);
      if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') return false;
      if (v.parentElement) {
        const pStyle = window.getComputedStyle(v.parentElement);
        if (pStyle.display === 'none' || pStyle.visibility === 'hidden' || pStyle.opacity === '0') return false;
      }
      return (
        rect.bottom > 0 &&
        rect.right > 0 &&
        rect.top < (window.innerHeight || document.documentElement.clientHeight) &&
        rect.left < (window.innerWidth || document.documentElement.clientWidth)
      );
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

    // Tick 0 极速挂载底图壁纸 (0ms 显示海报图并立即预载视频流，绝无开机黑屏与卡顿延迟)
    function mountTickZeroBase() {
      try {
        const left = config.left;
        if (!left || left.type !== 'video' || !left.file) return;
        const vParam = (left && left.version) ? ('?v=' + left.version) : ('?v=' + Date.now());
        const src = SERVER_URL + '/' + encodeURIComponent(left.file) + vParam;
        const posterSrc = (left && left.poster) ? (SERVER_URL + '/' + encodeURIComponent(left.poster) + vParam) : '';
        const posLeft = '${posLeft}';
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
          leftVid.style.willChange = 'transform';
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
          leftVid.addEventListener('error', function() {
            setTimeout(function() {
              if (leftVid.error) {
                leftVid.load();
                if (!document.hidden) leftVid.play().catch(function(){});
              }
            }, 300);
          });
          (document.body || document.documentElement).prepend(leftVid);
          if (!document.hidden) leftVid.play().catch(function(){});
        } else if (document.body && leftVid.parentElement !== document.body) {
          document.body.prepend(leftVid);
        }
      } catch(e) {}
    }
    mountTickZeroBase();

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
          if (entry.isIntersecting && entry.intersectionRatio > 0.01 && isVideoVisible(v)) {
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

    function applyVideos() {
      // 1. Slot: left (Global base wallpaper)
      const left = config.left;
      if (left && left.type === 'video' && left.file) {
        const vParam = (left && left.version) ? ('?v=' + left.version) : ('?v=' + Date.now());
        const src = SERVER_URL + '/' + encodeURIComponent(left.file) + vParam;
        const posterSrc = (left && left.poster) ? (SERVER_URL + '/' + encodeURIComponent(left.poster) + vParam) : '';
        let leftVid = document.getElementById('antigravity-video-left');
        if (leftVid && leftVid.isConnected && leftVid.dataset.currentSrc === src) {
          if (document.body && leftVid.parentElement !== document.body) {
            document.body.prepend(leftVid);
          }
          if (!document.hidden && leftVid.paused && leftVid.readyState >= 1) {
            leftVid.play().catch(function() {});
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
            leftVid.style.objectPosition = '${posLeft}';
            leftVid.style.zIndex = '0';
            leftVid.style.pointerEvents = 'none';
            leftVid.style.transform = 'translate3d(0, 0, 0)';
            leftVid.style.contain = 'layout paint';
            leftVid.style.willChange = 'transform';
            leftVid.style.display = 'block';
            if (posterSrc) {
              leftVid.poster = posterSrc;
              leftVid.setAttribute('poster', posterSrc);
              leftVid.style.backgroundImage = 'url("' + posterSrc + '")';
              leftVid.style.backgroundSize = 'cover';
              leftVid.style.backgroundPosition = '${posLeft}';
            }
            leftVid.addEventListener('playing', function() {
              checkAndShowVideo(leftVid);
            });
            leftVid.addEventListener('canplay', function() {
              if (!document.hidden && leftVid.paused) leftVid.play().catch(function() {});
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
            leftVid.style.backgroundPosition = '${posLeft}';
          }
          if (leftVid.dataset.currentSrc !== src) {
            leftVid.dataset.currentSrc = src;
            leftVid.src = src;
            leftVid.load();
            if (!document.hidden) leftVid.play().catch(function() {});
          }
          leftVid.style.objectPosition = '${posLeft}';
          if (!document.hidden && leftVid.paused && leftVid.readyState >= 1) {
            leftVid.play().catch(function() {});
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

      // 2. Container slots: mid, right, bottom, settings
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

      for (const slotKey in slotSelectors) {
        const slotData = config[slotKey];
        const isVideo = slotData && slotData.type === 'video' && slotData.file;
        const vParam = (slotData && slotData.version) ? ('?v=' + slotData.version) : ('?v=' + Date.now());
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
          let targetContainer = null;
          for (let i = 0; i < selectors.length; i++) {
            try {
              const el = document.querySelector(selectors[i]);
              if (el && el !== document.body && el !== document.documentElement) {
                if (slotKey === 'mid') {
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
                  if (el.classList.contains('terminal') || el.classList.contains('xterm') || el.querySelector('.terminal, .xterm')) {
                    continue;
                  }
                  if (el.offsetWidth < 50) {
                    continue;
                  }
                  if (el.querySelector('[id="antigravity.agentSidePanelInputBox"]') || el.querySelector('#antigravity\\.agentSidePanelInputBox')) {
                    continue;
                  }
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
            if (vid && vid.dataset.currentSrc === src) {
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
              vid.style.willChange = 'transform';
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
                if (isVideoVisible(vid) && vid.paused) vid.play().catch(function() {});
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
              if (isVideoVisible(vid)) vid.play().catch(function() {});
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

    window.__antigravityActiveConfig = config;
    window.__antigravityApplyVideos = applyVideos;
    applyVideos();

    // Fast startup retry ladder
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
          if (target.closest && (target.closest('.xterm') || target.closest('.terminal') || target.closest('pre') || target.closest('.code-block') || target.closest('[data-testid*="message"]'))) {
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
      attributeFilter: ['data-aux-pane-open', 'data-state', 'aria-expanded', 'hidden']
    });

    if (window.__antigravitySyncInterval) {
      clearInterval(window.__antigravitySyncInterval);
    }
    if (window.__antigravityPreloadInterval) {
      clearInterval(window.__antigravityPreloadInterval);
    }
    if (window.__antigravityInterval) {
      clearInterval(window.__antigravityInterval);
    }
    window.__antigravitySyncInterval = setInterval(function() {
      if (window.__antigravityApplyVideos) {
        window.__antigravityApplyVideos();
      }
    }, 8000);
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
                    let titlebarFix = document.getElementById('antigravity-titlebar-fix');
                    if (titlebarFix) {
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
                        '  backdrop-filter: blur(20px) saturate(180%) !important;',
                        '  -webkit-backdrop-filter: blur(20px) saturate(180%) !important;',
                        '  border: 1px solid rgba(255, 255, 255, 0.12) !important;',
                        '  border-radius: 8px !important;',
                        '  box-shadow: 0 12px 30px -4px rgba(0, 0, 0, 0.6), 0 4px 12px rgba(0, 0, 0, 0.4) !important;',
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
                    }
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

async function swapWallpaper(slotInput, srcPath, customPosterPath) {
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

  // 视频编码检测与静态海报兜底提取
  let posterFileName = null;
  let isSupportedCodec = true;
  if (isVideo) {
    const codecInfo = detectVideoCodec(srcPath);
    if (codecInfo && !codecInfo.isElectronSupported) {
      isSupportedCodec = false;
      if (codecInfo.warning) {
        console.warn(`⚠️ 视频编码警告: ${codecInfo.warning}`);
      }
    }
    const posterPrefix = slotKey === 'bottom' ? 'input' : slotKey;
    const defaultPosterTarget = path.join(wallpapersDir, `${posterPrefix}_poster.jpg`);
    let companionPoster = customPosterPath || findCompanionPoster(srcPath);

    // If no existing companion poster was found, automatically extract a frame from the video!
    if (!companionPoster || !fs.existsSync(companionPoster)) {
      console.log(`      正在从视频中提取高清静态首帧作为保底...`);
      const extracted = extractPosterFromVideo(srcPath, defaultPosterTarget);
      if (extracted) {
        companionPoster = defaultPosterTarget;
      }
    }

    if (companionPoster && fs.existsSync(companionPoster)) {
      try {
        const pExt = path.extname(companionPoster).toLowerCase();
        posterFileName = `${posterPrefix}_poster${pExt}`;
        const posterTargetPath = path.join(wallpapersDir, posterFileName);
        if (path.resolve(companionPoster) !== path.resolve(posterTargetPath)) {
          fs.copyFileSync(companionPoster, posterTargetPath);
        }
        // Also synchronize the slot's primary static wallpaper with this poster
        // so that the background and fallbacks match the user's selected video!
        const staticFallbackTarget = path.join(wallpapersDir, `${posterPrefix}_wallpaper${pExt}`);
        try { fs.copyFileSync(posterTargetPath, staticFallbackTarget); } catch (e) {}
        console.log(`✓ 已自动配置静态兜底海报: ${posterFileName}`);
      } catch (e) {
        console.warn('提取静态兜底海报失败:', e.message);
      }
    }
  }

  if (path.resolve(srcPath) !== path.resolve(targetPath)) {
    fs.copyFileSync(srcPath, targetPath);
  }
  if (isVideo) {
    ensureMp4Faststart(targetPath);
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
  if (posterFileName) {
    slotsConfig[slotKey].poster = posterFileName;
  } else if (!isVideo) {
    delete slotsConfig[slotKey].poster;
  }
  if (isVideo && !isSupportedCodec) {
    slotsConfig[slotKey].unsupportedCodec = true;
  } else {
    delete slotsConfig[slotKey].unsupportedCodec;
  }
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
  console.log('💡 预设管理: 可使用 node core/theme_engine.js --save-preset <名称> [描述] 保存当前完整配置为独立预设，');
  console.log('            使用 node core/theme_engine.js --list-presets 查看已保存预设列表，');
  console.log('            使用 node core/theme_engine.js --apply-preset <名称/序号> 一键恢复并实时生效。');
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

  return swapWallpaper(slotInput, wallpaper.mediaPath, wallpaper.previewPath);
}

function listWallpaperEngineWallpapers(search = '', limit = 50) {
  const list = scanWorkshopWallpapers({ search });
  console.log(formatWallpaperTable(list, limit));
  return list;
}

/**
 * Visual width helpers for console table alignment with CJK/full-width characters.
 */
function getVisualWidth(str) {
  if (!str) return 0;
  let width = 0;
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i);
    if (
      (code >= 0x1100 && code <= 0x115f) ||
      (code >= 0x2e80 && code <= 0xa4cf) ||
      (code >= 0xac00 && code <= 0xd7a3) ||
      (code >= 0xf900 && code <= 0xfaff) ||
      (code >= 0xfe10 && code <= 0xfe19) ||
      (code >= 0xfe30 && code <= 0xfe6f) ||
      (code >= 0xff00 && code <= 0xff60) ||
      (code >= 0xffe0 && code <= 0xffe6)
    ) {
      width += 2;
    } else {
      width += 1;
    }
  }
  return width;
}

function padEndVisual(str, targetWidth) {
  const currentWidth = getVisualWidth(str);
  if (currentWidth >= targetWidth) return str;
  return str + ' '.repeat(targetWidth - currentWidth);
}

function truncateVisual(str, maxWidth) {
  if (getVisualWidth(str) <= maxWidth) return str;
  let res = '';
  let w = 0;
  for (let i = 0; i < str.length; i++) {
    const ch = str[i];
    const cw = getVisualWidth(ch);
    if (w + cw + 1 > maxWidth) {
      return res + '…';
    }
    res += ch;
    w += cw;
  }
  return res;
}

/**
 * Sanitizes preset name for safe folder and file naming across Windows and POSIX.
 * Strictly prevents path traversal ('..', '.'), trailing dots/spaces, and Windows reserved names.
 */
function sanitizePresetName(name) {
  if (!name || typeof name !== 'string') return '';
  let clean = name.trim().replace(/^["']+|["']+$/g, '').trim();
  clean = clean.replace(/[\\/:*?"<>|]/g, '_');
  clean = clean.replace(/^[. ]+|[. ]+$/g, '');
  if (!clean || clean === '..' || clean === '.') {
    return '';
  }
  const reserved = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i;
  if (reserved.test(clean)) {
    clean = `preset_${clean}`;
  }
  return clean;
}

/**
 * Saves current wallpaper configuration, slot positions, font settings,
 * and archives all physical media files (videos, images, posters) into a self-contained preset directory.
 */
function savePreset(presetName, description, options = {}) {
  if (!presetName || typeof presetName !== 'string' || !presetName.trim()) {
    console.error('❌ 请提供有效的预设名称！用法: node core/theme_engine.js --save-preset <预设名称> [描述]');
    return null;
  }
  const cleanName = presetName.trim().replace(/^["']+|["']+$/g, '').trim();
  const folderName = sanitizePresetName(cleanName);
  if (!folderName) {
    console.error('❌ 预设名称无效（包含非法字符、路径穿透或全为空白）！');
    return null;
  }

  const pDir = getPresetsDir();
  const targetDir = path.join(pDir, folderName);
  const presetWallpapersDir = path.join(targetDir, 'wallpapers');

  if (!fs.existsSync(presetWallpapersDir)) {
    fs.mkdirSync(presetWallpapersDir, { recursive: true });
  }

  console.log('=======================================================');
  console.log(`   💾 正在保存当前壁纸全套配置为独立预设: 【${cleanName}】`);
  console.log('=======================================================');

  const currentConfig = loadSlotsConfig();
  const archivedConfig = JSON.parse(JSON.stringify(currentConfig));

  // 1. Collect all media files to archive
  const filesToArchive = new Map(); // targetFileName -> sourceAbsolutePath
  const fileRoles = {};

  for (const [key, slot] of Object.entries(archivedConfig)) {
    if (key === 'fontColor' || !slot || typeof slot !== 'object') continue;
    if (slot.file) {
      let absPath = slot.file;
      if (!path.isAbsolute(absPath)) {
        absPath = path.join(wallpapersDir, slot.file);
        if (!fs.existsSync(absPath)) {
          const repoPath = path.join(repoWallpapersDir, slot.file);
          if (fs.existsSync(repoPath)) absPath = repoPath;
        }
      }
      let baseName = path.basename(slot.file);
      if (filesToArchive.has(baseName) && filesToArchive.get(baseName) !== absPath) {
        baseName = `${key}_${baseName}`;
      }
      if (fs.existsSync(absPath)) {
        filesToArchive.set(baseName, absPath);
        fileRoles[baseName] = `${key} 槽位主壁纸`;
        slot.file = baseName;
      }
    }
    if (slot.poster) {
      let absPath = slot.poster;
      if (!path.isAbsolute(absPath)) {
        absPath = path.join(wallpapersDir, slot.poster);
        if (!fs.existsSync(absPath)) {
          const repoPath = path.join(repoWallpapersDir, slot.poster);
          if (fs.existsSync(repoPath)) absPath = repoPath;
        }
      }
      let baseName = path.basename(slot.poster);
      if (filesToArchive.has(baseName) && filesToArchive.get(baseName) !== absPath) {
        baseName = `${key}_${baseName}`;
      }
      if (fs.existsSync(absPath)) {
        filesToArchive.set(baseName, absPath);
        fileRoles[baseName] = `${key} 槽位海报`;
        slot.poster = baseName;
      }
    } else if (slot.type === 'video') {
      const activeFile = filesToArchive.get(slot.file);
      if (activeFile) {
        const companion = findCompanionPoster(activeFile);
        if (companion && fs.existsSync(companion)) {
          let baseName = path.basename(companion);
          if (filesToArchive.has(baseName) && filesToArchive.get(baseName) !== companion) {
            baseName = `${key}_${baseName}`;
          }
          filesToArchive.set(baseName, companion);
          fileRoles[baseName] = `${key} 伴生海报`;
          slot.poster = baseName;
        }
      }
    }

    // Default static fallback image if present
    const defaultFile = SLOTS_META[key]?.defaultFile;
    if (defaultFile && !filesToArchive.has(defaultFile)) {
      const defaultPath = path.join(wallpapersDir, defaultFile);
      const repoDefault = path.join(repoWallpapersDir, defaultFile);
      if (fs.existsSync(defaultPath)) {
        filesToArchive.set(defaultFile, defaultPath);
        fileRoles[defaultFile] = `${key} 默认保底壁纸`;
      } else if (fs.existsSync(repoDefault)) {
        filesToArchive.set(defaultFile, repoDefault);
        fileRoles[defaultFile] = `${key} 默认保底壁纸`;
      }
    }
  }

  // 2. Clean up any stale files in presetWallpapersDir when overwriting an existing preset
  if (fs.existsSync(presetWallpapersDir)) {
    const existingFiles = fs.readdirSync(presetWallpapersDir);
    for (const ef of existingFiles) {
      if (!filesToArchive.has(ef)) {
        try { fs.unlinkSync(path.join(presetWallpapersDir, ef)); } catch (e) {}
      }
    }
  }

  // 3. Safely copy media files into preset's wallpapers folder
  const archivedManifest = [];
  let totalBytes = 0;

  for (const [filename, srcPath] of filesToArchive.entries()) {
    const destPath = path.join(presetWallpapersDir, filename);
    try {
      if (fs.existsSync(destPath)) {
        try { fs.chmodSync(destPath, 0o666); } catch (e) {}
      }
      if (path.resolve(srcPath) !== path.resolve(destPath)) {
        fs.copyFileSync(srcPath, destPath);
      }
      const stat = fs.statSync(destPath);
      totalBytes += stat.size;
      archivedManifest.push({
        filename,
        size: stat.size,
        sizeFormatted: (stat.size / 1024 / 1024).toFixed(2) + ' MB',
        role: fileRoles[filename] || '素材文件'
      });
    } catch (e) {
      console.warn(`   ⚠️ 归档文件 ${filename} 出现警告: ${e.message}`);
    }
  }

  // 4. Write metadata and configuration files
  const now = new Date();
  const timeStr = now.getFullYear() + '-' +
    String(now.getMonth() + 1).padStart(2, '0') + '-' +
    String(now.getDate()).padStart(2, '0') + ' ' +
    String(now.getHours()).padStart(2, '0') + ':' +
    String(now.getMinutes()).padStart(2, '0') + ':' +
    String(now.getSeconds()).padStart(2, '0');

  const presetMeta = {
    name: cleanName,
    id: folderName,
    createdAt: Date.now(),
    createdAtFormatted: timeStr,
    updatedAt: Date.now(),
    description: description ? description.trim() : `于 ${timeStr} 保存的完整壁纸与槽位配置`,
    slotsConfig: archivedConfig,
    files: archivedManifest,
    totalSize: totalBytes,
    totalSizeFormatted: (totalBytes / 1024 / 1024).toFixed(2) + ' MB'
  };

  fs.writeFileSync(path.join(targetDir, 'preset.json'), JSON.stringify(presetMeta, null, 2), 'utf8');
  fs.writeFileSync(path.join(targetDir, 'slots_config.json'), JSON.stringify(archivedConfig, null, 2), 'utf8');

  console.log(`✓ 预设【${cleanName}】已安全归档并保存成功！`);
  console.log(`   📁 存放目录: ${targetDir}`);
  console.log(`   📦 归档素材: ${archivedManifest.length} 个文件 (共 ${presetMeta.totalSizeFormatted})`);
  console.log(`   🎨 字体配色: ${archivedConfig.fontColor?.name || archivedConfig.fontColor?.id || '默认'}`);
  console.log('   🎯 槽位布局:');
  for (const [key, slot] of Object.entries(archivedConfig)) {
    if (key === 'fontColor' || !slot || typeof slot !== 'object') continue;
    const meta = SLOTS_META[key] || { desc: key };
    console.log(`      [${meta.desc} (${key})]: ${slot.file} (${slot.type || 'image'}, 位置: ${slot.position || '默认'})`);
  }
  console.log('=======================================================');
  return presetMeta;
}

/**
 * Internal helper to read all valid presets from the presets directory.
 */
function listPresetsInternal() {
  const pDir = getPresetsDir();
  if (!fs.existsSync(pDir)) return [];
  const entries = fs.readdirSync(pDir, { withFileTypes: true });
  const presets = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const presetFolder = path.join(pDir, entry.name);
    const presetJsonPath = path.join(presetFolder, 'preset.json');
    const slotsJsonPath = path.join(presetFolder, 'slots_config.json');

    let preset = null;
    if (fs.existsSync(presetJsonPath)) {
      try {
        preset = JSON.parse(fs.readFileSync(presetJsonPath, 'utf8'));
      } catch (e) {}
    }

    if (!preset && fs.existsSync(slotsJsonPath)) {
      try {
        const slotsConfig = JSON.parse(fs.readFileSync(slotsJsonPath, 'utf8'));
        const stat = fs.statSync(slotsJsonPath);
        preset = {
          name: entry.name,
          id: entry.name,
          createdAt: stat.birthtimeMs || stat.mtimeMs,
          slotsConfig
        };
      } catch (e) {}
    }

    if (preset && preset.slotsConfig) {
      if (!preset.id) preset.id = entry.name;
      if (!preset.name) preset.name = entry.name;
      const pwDir = path.join(presetFolder, 'wallpapers');
      if (fs.existsSync(pwDir)) {
        const files = fs.readdirSync(pwDir);
        preset.fileCount = files.length;
        if (!preset.totalSize) {
          let sz = 0;
          for (const f of files) {
            try { sz += fs.statSync(path.join(pwDir, f)).size; } catch (e) {}
          }
          preset.totalSize = sz;
          preset.totalSizeFormatted = (sz / 1024 / 1024).toFixed(2) + ' MB';
        }
      }
      presets.push(preset);
    }
  }

  presets.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
  return presets;
}

/**
 * Formats presets into a human-readable table string with CJK-aware visual column alignment.
 */
function formatPresetTable(presets) {
  if (!presets || presets.length === 0) {
    return [
      '================================================================================',
      '  📦 Antigravity 已保存壁纸预设列表 (0 个预设)',
      '================================================================================',
      'ℹ️ 当前暂无已保存的壁纸预设。',
      '',
      '💡 快捷提示:',
      '   • 保存当前配置为新预设: node core/theme_engine.js --save-preset <预设名称> [描述]',
      '   • 或运行: bin\\preset_manager.bat / bin\\swap_wallpaper.bat 进入交互菜单',
      '================================================================================'
    ].join('\n');
  }

  const lines = [
    '========================================================================================================================',
    `  📦 Antigravity 已保存壁纸预设列表 (共 ${presets.length} 个预设)`,
    '========================================================================================================================',
    '序号  预设名称             保存时间             素材大小   字体配色            各槽位配置摘要',
    '------------------------------------------------------------------------------------------------------------------------'
  ];

  presets.forEach((p, idx) => {
    const num = padEndVisual(`[${idx + 1}]`, 6);
    const name = padEndVisual(truncateVisual(p.name, 18), 20);
    const time = padEndVisual(p.createdAtFormatted || '未知时间', 21);
    const size = padEndVisual(p.totalSizeFormatted || (p.totalSize ? (p.totalSize / 1024 / 1024).toFixed(1) + ' MB' : '-'), 11);
    const font = padEndVisual(truncateVisual(p.slotsConfig?.fontColor?.name || p.slotsConfig?.fontColor?.id || '默认', 18), 20);

    const slotSummaries = [];
    for (const [key, slot] of Object.entries(p.slotsConfig || {})) {
      if (key === 'fontColor' || !slot || typeof slot !== 'object') continue;
      const typeStr = slot.type === 'video' ? '视频' : '图';
      const posStr = slot.position ? `, ${slot.position}` : '';
      slotSummaries.push(`${key}(${typeStr}${posStr})`);
    }
    const summaryStr = slotSummaries.join(', ');

    lines.push(`${num} ${name} ${time} ${size} ${font} ${summaryStr}`);
  });

  lines.push('------------------------------------------------------------------------------------------------------------------------');
  lines.push('💡 快速操作指南:');
  lines.push('   • 一键应用预设: node core/theme_engine.js --apply-preset <名称或序号>  (例如: --apply-preset 1)');
  lines.push('   • 查看预设详情: node core/theme_engine.js --show-preset <名称或序号>');
  lines.push('   • 删除已有预设: node core/theme_engine.js --delete-preset <名称或序号>');
  lines.push('========================================================================================================================');

  return lines.join('\n');
}

/**
 * Lists all saved presets with summary table.
 */
function listPresets() {
  const presets = listPresetsInternal();
  console.log(formatPresetTable(presets));
  return presets;
}

/**
 * Resolves a preset by 1-based index number, exact id/name, case-insensitive match, or substring.
 * Safely rejects empty/whitespace strings.
 */
function getPresetDetails(nameOrIndex) {
  const presets = listPresetsInternal();
  if (!presets || presets.length === 0) return null;
  if (nameOrIndex === undefined || nameOrIndex === null) return null;

  const str = String(nameOrIndex).trim().replace(/^["']+|["']+$/g, '').trim();
  if (!str) return null;

  // 1. Exact match on id or name
  let found = presets.find(p => p.id === str || p.name === str);
  if (found) {
    return {
      preset: found,
      index: presets.indexOf(found) + 1,
      presetDir: path.join(getPresetsDir(), found.id)
    };
  }

  // 2. 1-based index
  const idx = parseInt(str, 10);
  if (!isNaN(idx) && String(idx) === str && idx >= 1 && idx <= presets.length) {
    const preset = presets[idx - 1];
    return {
      preset,
      index: idx,
      presetDir: path.join(getPresetsDir(), preset.id)
    };
  }

  // 3. Case-insensitive match
  const lower = str.toLowerCase();
  found = presets.find(p => p.id.toLowerCase() === lower || p.name.toLowerCase() === lower);
  if (found) {
    return {
      preset: found,
      index: presets.indexOf(found) + 1,
      presetDir: path.join(getPresetsDir(), found.id)
    };
  }

  // 4. Substring match (only for non-empty search of >= 2 chars)
  if (str.length >= 2) {
    found = presets.find(p => p.name.toLowerCase().includes(lower) || p.id.toLowerCase().includes(lower));
    if (found) {
      return {
        preset: found,
        index: presets.indexOf(found) + 1,
        presetDir: path.join(getPresetsDir(), found.id)
      };
    }
  }

  return null;
}

/**
 * Shows comprehensive details of a specific preset.
 */
function showPreset(nameOrIndex) {
  const details = getPresetDetails(nameOrIndex);
  if (!details) {
    console.error(`❌ 未找到预设: "${nameOrIndex}"`);
    console.error('');
    listPresets();
    return false;
  }
  const { preset, presetDir, index } = details;
  console.log('=======================================================');
  console.log(`   📦 预设详情: [${index}] ${preset.name}`);
  console.log('=======================================================');
  console.log(`   ID: ${preset.id}`);
  console.log(`   保存时间: ${preset.createdAtFormatted || new Date(preset.createdAt).toLocaleString()}`);
  console.log(`   描述: ${preset.description || '(无)'}`);
  console.log(`   素材总大小: ${preset.totalSizeFormatted || '未知'}`);
  console.log(`   目录路径: ${presetDir}`);
  console.log('');
  const font = preset.slotsConfig?.fontColor;
  console.log(`   🎨 字体配色: ${font?.name || font?.id || '默认'}`);
  if (font?.primary) console.log(`      主字色: ${font.primary} | 终端字色: ${font.terminal || font.primary}`);
  console.log('');
  console.log('   🎯 各槽位配置:');
  for (const [key, slot] of Object.entries(preset.slotsConfig || {})) {
    if (key === 'fontColor' || !slot || typeof slot !== 'object') continue;
    const meta = SLOTS_META[key] || { desc: key };
    console.log(`      【${meta.desc} (${key})】`);
    console.log(`         文件: ${slot.file} (${slot.type || 'image'})`);
    console.log(`         位置: ${slot.position || '默认'}`);
    if (slot.poster) console.log(`         海报: ${slot.poster}`);
  }
  if (preset.files && preset.files.length > 0) {
    console.log('');
    console.log(`   📦 归档素材清单 (${preset.files.length} 个文件):`);
    preset.files.forEach(f => {
      console.log(`      • ${f.filename.padEnd(28)} ${(f.sizeFormatted || (f.size + ' B')).padEnd(10)} [${f.role}]`);
    });
  }
  console.log('=======================================================');
  return true;
}

/**
 * Applies a saved preset:
 * 1. Safely backs up active configuration to slots_config.pre_preset_backup.json
 * 2. Restores all physical media files to wallpapers directory (skipping identical files)
 * 3. Updates slots_config.json with fresh cache-busting tokens
 * 4. Re-compiles custom_theme.css
 * 5. Ensures media server is online
 * 6. Triggers live 0.3s seamless hot-reload via CDP (8314)
 */
async function applyPreset(nameOrIndex) {
  const details = getPresetDetails(nameOrIndex);
  if (!details) {
    console.error(`❌ 未找到预设: "${nameOrIndex}"`);
    console.error('');
    listPresets();
    return false;
  }

  const { preset, presetDir } = details;
  console.log('=======================================================');
  console.log(`   🚀 正在一键应用壁纸预设: 【${preset.name}】`);
  console.log('=======================================================');
  if (preset.description) {
    console.log(`   📝 描述: ${preset.description}`);
  }
  console.log(`   📅 保存时间: ${preset.createdAtFormatted || new Date(preset.createdAt).toLocaleString()}`);
  console.log('');

  // 0. Safety backup of active configuration before applying preset
  try {
    const currentActiveConfig = loadSlotsConfig();
    const backupPath = path.join(antigravityDir, 'slots_config.pre_preset_backup.json');
    fs.writeFileSync(backupPath, JSON.stringify(currentActiveConfig, null, 2), 'utf8');
  } catch (e) {}

  // 1. Restore archived files into active wallpapersDir
  console.log(`[1/4] 正在从预设归档还原素材文件到运行目录...`);
  const presetWallpapersDir = path.join(presetDir, 'wallpapers');
  let restoredCount = 0;
  let restoredBytes = 0;

  if (fs.existsSync(presetWallpapersDir)) {
    const files = fs.readdirSync(presetWallpapersDir);
    for (const file of files) {
      const src = path.join(presetWallpapersDir, file);
      const dst = path.join(wallpapersDir, file);
      try {
        const stat = fs.statSync(src);
        if (stat.isFile()) {
          if (fs.existsSync(dst)) {
            const dstStat = fs.statSync(dst);
            // If identical file already in place, avoid unnecessary rewriting to prevent playback locks
            if (dstStat.size === stat.size && Math.abs(dstStat.mtimeMs - stat.mtimeMs) < 1000) {
              restoredCount++;
              restoredBytes += stat.size;
              continue;
            }
            try { fs.chmodSync(dst, 0o666); } catch (e) {}
          }
          if (path.resolve(src) !== path.resolve(dst)) {
            fs.copyFileSync(src, dst);
          }
          restoredCount++;
          restoredBytes += stat.size;
        }
      } catch (e) {
        console.warn(`   ⚠️ 还原文件 ${file} 时出现警告: ${e.message}`);
      }
    }
  }
  console.log(`✓ 已成功还原 ${restoredCount} 个素材文件 (${(restoredBytes / 1024 / 1024).toFixed(2)} MB)`);

  // 2. Update slots_config.json
  console.log(`[2/4] 更新槽位配置与位置...`);
  const targetConfig = JSON.parse(JSON.stringify(preset.slotsConfig));
  const newVersion = Date.now();
  for (const [key, slot] of Object.entries(targetConfig)) {
    if (key !== 'fontColor' && slot && typeof slot === 'object') {
      slot.key = slot.key || key;
      slot.version = newVersion;
    }
  }
  if (!targetConfig.fontColor) {
    const current = loadSlotsConfig();
    if (current && current.fontColor) {
      targetConfig.fontColor = current.fontColor;
    }
  }
  saveSlotsConfig(targetConfig);
  console.log(`✓ slots_config.json 已更新为预设配置`);

  // 3. Recompile custom_theme.css
  console.log(`[3/4] 重新编译 custom_theme.css 并确保流媒体服务就绪...`);
  const css = generateMasterCss(targetConfig);
  fs.writeFileSync(customCssPath, css, 'utf-8');
  try { fs.writeFileSync(path.join(wallpapersDir, 'custom_theme.css'), css, 'utf-8'); } catch (e) {}
  console.log(`✓ custom_theme.css 编译完成 (${(css.length / 1024 / 1024).toFixed(2)} MB)`);

  await ensureMediaServer(wallpapersDir, DEFAULT_PORT);

  // 4. Seamless hot reload via CDP
  console.log(`[4/4] 触发界面 0.3 秒无缝热重载 (CDP 8314)...`);
  const reloadPromise = await triggerLiveHotReload(css, targetConfig);

  console.log('');
  console.log(`✨ 预设【${preset.name}】已成功应用并实时生效！`);
  console.log('');
  return reloadPromise;
}

/**
 * Deletes a saved preset directory.
 */
function deletePreset(nameOrIndex) {
  const details = getPresetDetails(nameOrIndex);
  if (!details) {
    console.error(`❌ 未找到要删除的预设: "${nameOrIndex}"`);
    return false;
  }
  const { preset, presetDir } = details;
  try {
    fs.rmSync(presetDir, { recursive: true, force: true });
    console.log(`✓ 预设【${preset.name}】已成功删除。`);
    return true;
  } catch (e) {
    console.error(`❌ 删除预设失败: ${e.message}`);
    return false;
  }
}

/**
 * Prints comprehensive help message for theme engine CLI.
 */
function printHelp() {
  console.log(`
================================================================================
  🚀 Antigravity Theme Engine —— 壁纸、位置微调与预设管理引擎
================================================================================

【壁纸预设管理 (Wallpaper Presets)】:
  node core/theme_engine.js --save-preset <预设名称> [描述]
      保存当前壁纸全套配置(包括视频/图片素材、槽位坐标及字体配色)为独立预设
  node core/theme_engine.js --apply-preset <预设名称或序号>
      一键切换并激活指定预设 (素材自动恢复，并通过 CDP 端口 8314 触发 0.3s 无缝热重载)
  node core/theme_engine.js --list-presets
      查看所有已保存预设的详细列表与元信息
  node core/theme_engine.js --show-preset <预设名称或序号>
      查看指定预设的详细配置与素材文件清单
  node core/theme_engine.js --delete-preset <预设名称或序号>
      删除指定已保存的预设

【槽位壁纸更换 (Wallpaper Slots)】:
  node core/theme_engine.js --swap <槽位> <文件路径>
      更换指定槽位壁纸 (槽位: 左/中/右/下/设置)
  node core/theme_engine.js --swap-we <壁纸序号/创意工坊ID> <槽位>
      从 Steam Wallpaper Engine 创意工坊选择壁纸应用至指定槽位
  node core/theme_engine.js --list-we [搜索词]
      列出已安装的 Steam Wallpaper Engine 创意工坊壁纸

【位置微调与字体颜色 (Position & Font)】:
  node core/theme_engine.js --set-pos <槽位> <X坐标> [Y坐标]
  node core/theme_engine.js --adj-pos <槽位> <方向(up/down/left/right)> [步长%]
  node core/theme_engine.js --set-font <预设名/序号/Hex>
  node core/theme_engine.js --list-fonts
  node core/theme_engine.js --status
================================================================================
`);
}

if (require.main === module) {
  const args = process.argv.slice(2);
  if (args[0] === '--help' || args[0] === '-h' || args[0] === 'help') {
    printHelp();
  } else if (
    args[0] === '--save-preset' || args[0] === '--save' || args[0] === 'save-preset' ||
    args[0] === 'save'
  ) {
    if (!args[1]) {
      console.error('❌ 请提供要保存的预设名称。');
      console.error('   用法: node core/theme_engine.js --save-preset <预设名称> [描述]');
      console.error('   示例: node core/theme_engine.js --save-preset 赛博朋克 "霓虹雨夜动态预设"');
      process.exit(1);
    }
    const name = args[1];
    const desc = args.slice(2).join(' ');
    const res = savePreset(name, desc);
    if (!res) process.exit(1);
  } else if (
    args[0] === '--apply-preset' || args[0] === '--apply' || args[0] === '--load-preset' ||
    args[0] === '--preset' || args[0] === 'apply-preset' || args[0] === 'apply' ||
    args[0] === 'load' || (args[0] === 'preset' && args[1])
  ) {
    if (!args[1]) {
      console.error('❌ 请提供要应用的预设名称或序号。');
      console.error('   用法: node core/theme_engine.js --apply-preset <预设名称/序号>');
      console.error('   提示: 可使用 node core/theme_engine.js --list-presets 查看已保存预设列表。');
      process.exit(1);
    }
    applyPreset(args[1]).then(ok => {
      if (!ok) process.exit(1);
    }).catch(err => {
      console.error(err);
      process.exit(1);
    });
  } else if (
    args[0] === '--list-presets' || args[0] === '--presets' || args[0] === '--list-preset' ||
    args[0] === 'list-presets' || args[0] === 'presets' || (args[0] === 'preset' && !args[1])
  ) {
    listPresets();
  } else if (
    args[0] === '--show-preset' || args[0] === '--info-preset' || args[0] === '--show' ||
    args[0] === '--info' || args[0] === 'show-preset' || args[0] === 'info-preset' ||
    args[0] === 'show' || args[0] === 'info'
  ) {
    if (!args[1]) {
      console.error('❌ 请提供要查看详情的预设名称或序号。用法: node core/theme_engine.js --show-preset <预设名称/序号>');
      process.exit(1);
    }
    const ok = showPreset(args[1]);
    if (!ok) process.exit(1);
  } else if (
    args[0] === '--delete-preset' || args[0] === '--remove-preset' || args[0] === '--del-preset' ||
    args[0] === '--delete' || args[0] === '--del' || args[0] === 'delete-preset' ||
    args[0] === 'del-preset' || args[0] === 'delete' || args[0] === 'del' ||
    args[0] === 'remove-preset' || args[0] === 'remove'
  ) {
    if (!args[1]) {
      console.error('❌ 请提供要删除的预设名称或序号。用法: node core/theme_engine.js --delete-preset <预设名称/序号>');
      process.exit(1);
    }
    const ok = deletePreset(args[1]);
    if (!ok) process.exit(1);
  } else if (args[0] === '--swap' && args[1] && args[2]) {
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
  triggerLiveHotReload,
  detectVideoCodec,
  findCompanionPoster,
  extractPosterFromVideo,
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
  savePreset,
  listPresets,
  applyPreset,
  deletePreset,
  getPresetDetails,
  showPreset,
  formatPresetTable,
  sanitizePresetName,
  getPresetsDir,
  getVisualWidth,
  padEndVisual,
  truncateVisual,
  printHelp,
  FONT_PRESETS,
  SLOTS,
  SLOTS_META,
  SLOT_ALIASES,
  VIDEO_EXTS,
  IMAGE_EXTS
};

