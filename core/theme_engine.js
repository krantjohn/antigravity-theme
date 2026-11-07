const fs = require('fs');
const path = require('path');
const http = require('http');
const os = require('os');
const { startMediaServer, ensureMediaServer, isMediaServerRunning, DEFAULT_PORT } = require('./media_server');
const {
  scanWorkshopWallpapers,
  sortWallpapers,
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
  'left': { key: 'left', id: 'left', name: '左侧对话背景', desc: 'AI主对话界面 / 全局底图', defaultFile: 'left_wallpaper.jpg', defaultPosition: 'center center' },
  'bottom': { key: 'bottom', id: 'bottom', name: '底部输入框', desc: '底部输入框', defaultFile: 'input_wallpaper.jpg', defaultPosition: 'center 6%' },
  'settings': { key: 'settings', id: 'settings', name: '设置面板', desc: '设置界面', defaultFile: 'settings_wallpaper.png', defaultPosition: 'center 65%' }
};

const SLOT_ALIASES = {
  '左': 'left', 'left': 'left', 'global': 'left', 'main': 'left', 'base': 'left',
  '下': 'bottom', 'bottom': 'bottom', 'input': 'bottom',
  '设置': 'settings', 'settings': 'settings', '设': 'settings', 'config': 'settings'
};

function normalizeSlotInput(slotInput) {
  if (typeof slotInput !== 'string') return null;
  if (slotInput !== slotInput.trim()) return null;
  if (/[\0\u200B]/.test(slotInput)) return null;
  const normalized = slotInput.toLowerCase();
  return SLOT_ALIASES[normalized] || (SLOTS_META[normalized] ? normalized : null);
}

function formatSlotDisplay(slotInput) {
  if (typeof slotInput === 'symbol') {
    return slotInput.description ? 'Symbol(' + slotInput.description + ')' : 'Symbol()';
  }
  return String(slotInput);
}



// Kept for backward compatibility
const SLOTS = {
  '左': { file: 'left_wallpaper.jpg', key: 'left', desc: 'AI主对话界面 / 全局底图' },
  'left': { file: 'left_wallpaper.jpg', key: 'left', desc: 'AI主对话界面 / 全局底图' },
  'global': { file: 'left_wallpaper.jpg', key: 'left', desc: 'AI主对话界面 / 全局底图' },
  'main': { file: 'left_wallpaper.jpg', key: 'left', desc: 'AI主对话界面 / 全局底图' },
  'base': { file: 'left_wallpaper.jpg', key: 'left', desc: 'AI主对话界面 / 全局底图' },
  
  '下': { file: 'input_wallpaper.jpg', key: 'bottom', desc: '底部输入框' },
  'bottom': { file: 'input_wallpaper.jpg', key: 'bottom', desc: '底部输入框' },
  'input': { file: 'input_wallpaper.jpg', key: 'bottom', desc: '底部输入框' },
  
  '设置': { file: 'settings_wallpaper.png', key: 'settings', desc: '设置界面' },
  'settings': { file: 'settings_wallpaper.png', key: 'settings', desc: '设置界面' },
  '设': { file: 'settings_wallpaper.png', key: 'settings', desc: '设置界面' },
  'config': { file: 'settings_wallpaper.png', key: 'settings', desc: '设置界面' }
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

/**
 * Synchronous sleep helper using Atomics.wait for zero-CPU synchronous delay.
 * Falls back to high-resolution timestamp polling if SharedArrayBuffer is unavailable.
 */
function sleepSync(ms) {
  if (ms <= 0) return;
  try {
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
  } catch (e) {
    const end = Date.now() + ms;
    while (Date.now() < end) {}
  }
}

/**
 * Robust, atomic file writer with exponential backoff and jitter for Windows filesystem locking.
 * Handles transient EBUSY (sharing violation), EPERM, and EACCES (access denied).
 * 
 * Strategy:
 * 1. Writes content to a unique temporary file in the same directory (same volume).
 * 2. Flushes data to disk with fs.fsyncSync via open file descriptor.
 * 3. Attempts atomic replace via fs.renameSync within an exponential backoff retry loop.
 * 4. If renameSync fails on all attempts (e.g. Windows reader handle open without FILE_SHARE_DELETE),
 *    falls back to direct write with fs.fsyncSync within an exponential backoff retry loop.
 * 5. Cleans up temporary file in all code paths.
 * 6. Logs warnings/errors appropriately. Never swallows errors silently without logging.
 *
 * @param {string} targetPath - Absolute path to destination file
 * @param {string|Buffer} data - Content to write
 * @param {object} [options]
 * @param {number} [options.maxRetries=5] - Maximum retry attempts per phase
 * @param {number} [options.baseDelayMs=50] - Initial delay before backoff
 * @param {number} [options.maxDelayMs=300] - Cap on retry backoff
 * @returns {boolean} True if write succeeded, false otherwise
 */
function writeFileSyncSafe(targetPath, data, options = {}) {
  const maxRetries = options.maxRetries || 8;
  const baseDelayMs = options.baseDelayMs || 40;
  const maxDelayMs = options.maxDelayMs || 350;

  const dir = path.dirname(targetPath);
  if (!fs.existsSync(dir)) {
    try {
      fs.mkdirSync(dir, { recursive: true });
    } catch (e) {}
  }

  const tmpName = `.${path.basename(targetPath)}.tmp.${process.pid}.${Date.now()}.${Math.random().toString(36).slice(2, 8)}`;
  const tmpPath = path.join(dir, tmpName);
  const dataBuf = Buffer.isBuffer(data) ? data : Buffer.from(data, typeof data === 'string' ? 'utf8' : undefined);

  let writtenToTmp = false;
  try {
    const fd = fs.openSync(tmpPath, 'w');
    fs.writeSync(fd, dataBuf, 0, dataBuf.length, 0);
    try {
      fs.fsyncSync(fd);
    } catch (_) {}
    fs.closeSync(fd);
    writtenToTmp = true;
  } catch (err) {
    // If temp file write itself fails, proceed to direct write phase
  }

  let success = false;
  let lastError = null;
  let retriesUsed = 0;

  // Phase 1: Atomic rename from temporary file
  if (writtenToTmp) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        fs.renameSync(tmpPath, targetPath);
        success = true;
        break;
      } catch (err) {
        lastError = err;
        retriesUsed++;
        if (err.code === 'EBUSY' || err.code === 'EPERM' || err.code === 'EACCES') {
          if (attempt < maxRetries) {
            const jitter = Math.floor(Math.random() * 35) + 10;
            const delay = Math.min(maxDelayMs, (baseDelayMs * Math.pow(1.4, attempt - 1)) + jitter);
            sleepSync(delay);
          }
        } else {
          break;
        }
      }
    }
  }

  // Phase 2: Fallback to non-truncating direct write with fsync and retry
  if (!success) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      let directFd = null;
      try {
        const fileExists = fs.existsSync(targetPath);
        // CRITICAL: Open existing file with 'r+' to eliminate the 0-byte truncation window
        const openFlag = fileExists ? 'r+' : 'w';
        directFd = fs.openSync(targetPath, openFlag);

        // Write data starting at offset 0
        const bytesWritten = fs.writeSync(directFd, dataBuf, 0, dataBuf.length, 0);

        // Truncate trailing bytes only AFTER new data has been written
        fs.ftruncateSync(directFd, bytesWritten);
        try {
          fs.fsyncSync(directFd);
        } catch (_) {}
        fs.closeSync(directFd);
        directFd = null;
        success = true;
        break;
      } catch (err) {
        if (directFd !== null) {
          try { fs.closeSync(directFd); } catch (_) {}
        }
        lastError = err;
        retriesUsed++;
        if (err.code === 'EBUSY' || err.code === 'EPERM' || err.code === 'EACCES') {
          if (attempt < maxRetries) {
            const jitter = Math.floor(Math.random() * 35) + 10;
            const delay = Math.min(maxDelayMs, (baseDelayMs * Math.pow(1.4, attempt - 1)) + jitter);
            sleepSync(delay);
          }
        } else {
          break;
        }
      }
    }
  }

  // Cleanup temporary file in all cases
  if (writtenToTmp) {
    try {
      if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath);
    } catch (_) {}
  }

  if (retriesUsed > 0 && success) {
    console.warn(`[writeFileSyncSafe] Note: Write to ${path.basename(targetPath)} succeeded after ${retriesUsed} lock retry attempt(s).`);
  } else if (!success) {
    console.error(`[writeFileSyncSafe] Error: Failed to write ${targetPath} after ${retriesUsed} retries: ${lastError ? lastError.message : 'Unknown error'}`);
  }

  return success;
}

/**
 * Safe JSON file reader with retry on transient Windows file lock contention.
 * Handles transient EBUSY, EPERM, empty content, and partial writes (SyntaxError).
 */
function readJsonFileSyncSafe(filePath, maxRetries = 8, baseDelayMs = 25) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      if (!fs.existsSync(filePath)) {
        // Handle transient window during MoveFileExW rename
        if (attempt < 3 && attempt < maxRetries) {
          const jitter = Math.floor(Math.random() * 20);
          sleepSync((baseDelayMs * attempt) + jitter);
          continue;
        }
        return null;
      }

      const content = fs.readFileSync(filePath, 'utf8');
      if (content && content.trim().length > 0) {
        try {
          return JSON.parse(content);
        } catch (jsonErr) {
          // SyntaxError indicates an in-flight write; backoff and retry
          if (attempt < maxRetries) {
            const jitter = Math.floor(Math.random() * 25);
            sleepSync((baseDelayMs * attempt) + jitter);
            continue;
          }
          console.warn(`[readJsonFileSyncSafe] JSON parse error in ${path.basename(filePath)} after ${attempt} attempts: ${jsonErr.message}`);
          return null;
        }
      }

      // CRITICAL: Empty content ("" or whitespace) on existing file means write in progress!
      if (attempt < maxRetries) {
        const jitter = Math.floor(Math.random() * 25);
        sleepSync((baseDelayMs * attempt) + jitter);
        continue;
      }
    } catch (err) {
      if ((err.code === 'EBUSY' || err.code === 'EPERM' || err.code === 'EACCES') && attempt < maxRetries) {
        const jitter = Math.floor(Math.random() * 25);
        sleepSync((baseDelayMs * attempt) + jitter);
        continue;
      }
      if (attempt >= maxRetries) {
        console.warn(`[readJsonFileSyncSafe] Failed reading ${path.basename(filePath)} after ${attempt} attempts: ${err.message}`);
      }
    }
  }
  return null;
}

/**
 * Normalizes darkMaskOpacity to an integer percentage in [0, 80] (default 0).
 * Seamlessly accepts both decimal fractions in (0, 1) (e.g., 0.45 -> 45, 0.8 -> 80)
 * and percentage numbers in [1, 100] (clamped to 80).
 */
function normalizeDarkMaskOpacity(val) {
  if (val === undefined || val === null || val === '' || typeof val === 'boolean' || typeof val === 'object' || typeof val === 'symbol') {
    return 0;
  }
  const num = Number(val);
  if (!Number.isFinite(num) || num <= 0) return 0;
  if (num > 0 && num < 1) {
    return Math.min(80, Math.max(0, Math.round(num * 100)));
  }
  return Math.min(80, Math.max(0, Math.round(num)));
}

/**
 * Computes the CSS alpha value in [0, 0.8] for a given darkMaskOpacity configuration value.
 */
function getDarkMaskAlpha(val) {
  const pct = normalizeDarkMaskOpacity(val);
  if (pct <= 0) return 0;
  return Number((pct / 100).toFixed(2));
}

/**
 * Resolves the normalized darkMaskOpacity (0..80) for a given slot ('left', 'bottom', 'settings').
 * Keeps top-level config.darkMaskOpacity and config.left.darkMaskOpacity seamlessly synchronized
 * in both directions for backward compatibility.
 */
function getSlotDarkMaskOpacity(slotsConfig, slotKey) {
  if (!slotsConfig || typeof slotsConfig !== 'object') return 0;
  if (slotKey === 'left') {
    const hasSlotMask = Boolean(slotsConfig.left && typeof slotsConfig.left === 'object' && slotsConfig.left.darkMaskOpacity !== undefined);
    const hasTopMask = slotsConfig.darkMaskOpacity !== undefined;
    if (hasSlotMask && hasTopMask) {
      const slotVal = normalizeDarkMaskOpacity(slotsConfig.left.darkMaskOpacity);
      const topVal = normalizeDarkMaskOpacity(slotsConfig.darkMaskOpacity);
      if (slotsConfig._syncedLeftMask !== undefined) {
        if (slotVal !== slotsConfig._syncedLeftMask) return slotVal;
        if (topVal !== slotsConfig._syncedLeftMask) return topVal;
      }
      if (slotVal === 0 && topVal > 0 && slotsConfig._syncedLeftMask === undefined) {
        return topVal;
      }
      return slotVal;
    }
    if (hasSlotMask) return normalizeDarkMaskOpacity(slotsConfig.left.darkMaskOpacity);
    return normalizeDarkMaskOpacity(slotsConfig.darkMaskOpacity);
  }
  if (slotsConfig[slotKey] && typeof slotsConfig[slotKey] === 'object' && slotsConfig[slotKey].darkMaskOpacity !== undefined) {
    return normalizeDarkMaskOpacity(slotsConfig[slotKey].darkMaskOpacity);
  }
  return 0;
}

/**
 * Normalizes and synchronizes per-slot darkMaskOpacity across left, bottom, settings,
 * and top-level darkMaskOpacity on a config object in place.
 * Returns true if any property was modified.
 */
function syncConfigDarkMaskOpacity(config) {
  if (!config || typeof config !== 'object') return false;
  let changed = false;
  const leftVal = getSlotDarkMaskOpacity(config, 'left');
  if (config.darkMaskOpacity !== leftVal) {
    config.darkMaskOpacity = leftVal;
    changed = true;
  }
  if (config.left && typeof config.left === 'object') {
    if (config.left.darkMaskOpacity !== leftVal) {
      config.left.darkMaskOpacity = leftVal;
      changed = true;
    }
  }
  for (const k of ['bottom', 'settings']) {
    if (config[k] && typeof config[k] === 'object') {
      const kVal = getSlotDarkMaskOpacity(config, k);
      if (config[k].darkMaskOpacity !== kVal) {
        config[k].darkMaskOpacity = kVal;
        changed = true;
      }
    }
  }
  try {
    Object.defineProperty(config, '_syncedLeftMask', {
      value: leftVal,
      writable: true,
      configurable: true,
      enumerable: false
    });
  } catch (_) {}
  return changed;
}

let cachedLastValidConfig = null;

function loadSlotsConfig() {
  const mirrorConfigPath = path.join(wallpapersDir, 'slots_config.json');
  const fileExistedOnDisk = fs.existsSync(slotsConfigPath) || fs.existsSync(mirrorConfigPath);

  let config = readJsonFileSyncSafe(slotsConfigPath);
  if (!config) {
    // If primary read hits transient lock or does not exist, fall back to mirror copy in wallpapersDir
    config = readJsonFileSyncSafe(mirrorConfigPath);
  }

  if (!config) {
    if (fileExistedOnDisk) {
      console.warn('[loadSlotsConfig] Warning: slots_config.json exists on disk but was temporarily unreadable. Performing extended quiesce retry...');
      sleepSync(100);
      config = readJsonFileSyncSafe(slotsConfigPath, 8, 40) || readJsonFileSyncSafe(mirrorConfigPath, 8, 40);
    }

    if (!config) {
      if (fileExistedOnDisk) {
        console.error('[loadSlotsConfig] Error: slots_config.json exists on disk but remained unreadable after retries. Preserving disk state.');
        if (cachedLastValidConfig) {
          console.warn('[loadSlotsConfig] Returning cached last-known-valid configuration without overwriting disk.');
          const copy = JSON.parse(JSON.stringify(cachedLastValidConfig));
          syncConfigDarkMaskOpacity(copy);
          return copy;
        }
        // In-memory fallback ONLY - NEVER write to disk when disk file exists!
        const fb = {
          isOriginal: true,
          transparentSidebar: false,
          transparentHeader: false,
          darkMaskOpacity: 0,
          left: { key: 'left', file: '', type: 'none', position: 'center center', desc: 'AI主对话界面 / 全局底图', darkMaskOpacity: 0 },
          bottom: { key: 'bottom', file: '', type: 'none', position: 'center 6%', desc: '底部输入框', darkMaskOpacity: 0 },
          settings: { key: 'settings', file: '', type: 'none', position: 'center 65%', desc: '设置界面', darkMaskOpacity: 0 }
        };
        syncConfigDarkMaskOpacity(fb);
        return fb;
      }

      // First-time fresh installation ONLY: no config exists anywhere on disk
      config = {
        isOriginal: true,
        transparentSidebar: false,
        transparentHeader: false,
        darkMaskOpacity: 0,
        left: { key: 'left', file: '', type: 'none', position: 'center center', desc: 'AI主对话界面 / 全局底图', darkMaskOpacity: 0 },
        bottom: { key: 'bottom', file: '', type: 'none', position: 'center 6%', desc: '底部输入框', darkMaskOpacity: 0 },
        settings: { key: 'settings', file: '', type: 'none', position: 'center 65%', desc: '设置界面', darkMaskOpacity: 0 }
      };
      saveSlotsConfig(config);
      cachedLastValidConfig = JSON.parse(JSON.stringify(config));
      return config;
    }
  }

  // Update last-known-good cache
  cachedLastValidConfig = JSON.parse(JSON.stringify(config));

  let modified = false;
  if (config) {
    if (config.mid !== undefined) { delete config.mid; modified = true; }
    if (config.right !== undefined) { delete config.right; modified = true; }
    if (config.fontColor !== undefined) { delete config.fontColor; modified = true; }
    if (typeof config.transparentSidebar !== 'boolean') {
      config.transparentSidebar = Boolean(config.transparentSidebar);
      modified = true;
    }
    if (typeof config.transparentHeader !== 'boolean') {
      config.transparentHeader = Boolean(config.transparentHeader);
      modified = true;
    }
    if (syncConfigDarkMaskOpacity(config)) {
      modified = true;
    }
  }

  if (config && config.isOriginal) {
    if (modified) {
      saveSlotsConfig(config);
    }
    return config;
  }

  const allFiles = fs.existsSync(wallpapersDir) ? fs.readdirSync(wallpapersDir) : [];

  for (const [key, meta] of Object.entries(SLOTS_META)) {
    const existing = config[key];
    const preservedPosition = (existing && existing.position) ? existing.position : (meta.defaultPosition || 'center center');
    const preservedMask = getSlotDarkMaskOpacity(config, key);
    if (existing && existing.type === 'none') {
      config[key].file = existing.file || '';
      config[key].position = preservedPosition;
      config[key].desc = meta.desc;
      config[key].darkMaskOpacity = preservedMask;
      continue;
    }
    if (!existing || !existing.file) {
      config[key] = {
        key,
        file: (existing && existing.file) || '',
        type: (existing && existing.type) || 'none',
        position: preservedPosition,
        desc: meta.desc,
        darkMaskOpacity: preservedMask
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
      if (config[key].type === 'video') {
        const prefix = key === 'bottom' ? 'input' : key;
        if (config[key].poster && config[key].poster.toLowerCase().endsWith('.gif')) {
          config[key].poster = null;
          modified = true;
        }
        const highResPoster = allFiles.find(f => {
          const e = path.extname(f).toLowerCase();
          return (e === '.jpg' || e === '.jpeg' || e === '.png' || e === '.webp') && f.startsWith(`${prefix}_poster`);
        });
        if (highResPoster && config[key].poster !== highResPoster) {
          config[key].poster = highResPoster;
          modified = true;
        } else if (!config[key].poster) {
          const videoFile = config[key].file;
          const vAbs = path.isAbsolute(videoFile) ? videoFile : path.join(wallpapersDir, videoFile);
          const pTarget = path.join(wallpapersDir, `${prefix}_poster.jpg`);
          if (fs.existsSync(vAbs)) {
            const ok = extractPosterFromVideo(vAbs, pTarget);
            if (ok) {
              config[key].poster = `${prefix}_poster.jpg`;
              allFiles.push(`${prefix}_poster.jpg`);
              modified = true;
            }
          }
        }
      }
      config[key].position = preservedPosition;
      config[key].desc = meta.desc;
      config[key].darkMaskOpacity = preservedMask;
    }
  }

  if (syncConfigDarkMaskOpacity(config)) {
    modified = true;
  }

  if (modified || !fs.existsSync(slotsConfigPath)) {
    saveSlotsConfig(config);
  }
  return config;
}

function saveSlotsConfig(config) {
  if (!config || typeof config !== 'object') {
    console.warn('[saveSlotsConfig] Warning: Invalid config object provided to saveSlotsConfig');
    return false;
  }
  syncConfigDarkMaskOpacity(config);
  const jsonStr = JSON.stringify(config, null, 2);
  const ok1 = writeFileSyncSafe(slotsConfigPath, jsonStr);
  let ok2 = true;
  try {
    ok2 = writeFileSyncSafe(path.join(wallpapersDir, 'slots_config.json'), jsonStr);
  } catch (e) {
    console.warn('[saveSlotsConfig] Warning updating mirror copy in wallpapersDir:', e.message);
    ok2 = false;
  }
  if (ok1 || ok2) {
    cachedLastValidConfig = JSON.parse(JSON.stringify(config));
  }
  return ok1 && ok2;
}

function getBase64(filename) {
  if (!filename) return '';
  let resolvedName = filename;
  const ext = path.extname(filename).toLowerCase();
  if (ext === '.gif' || ext === '.png') {
    const base = filename.slice(0, -ext.length);
    for (const altExt of ['.jpg', '.jpeg', '.webp', '.png']) {
      const altFile = base + altExt;
      if (altFile !== filename && (fs.existsSync(path.join(wallpapersDir, altFile)) || fs.existsSync(path.join(repoWallpapersDir, altFile)))) {
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
    'python',
    'python3',
    'D:\\SteamLibrary\\steamapps\\common\\wallpaper_engine\\dlc\\pymidas\\python.exe'
  ];
  const cp = require('child_process');
  for (const py of candidates) {
    try {
      const vSafe = videoPath.replace(/\\/g, '/');
      const pSafe = targetPosterPath.replace(/\\/g, '/');
      const script = [
        'import cv2, sys',
        `cap = cv2.VideoCapture(r"${vSafe}")`,
        'if not cap.isOpened(): sys.exit(1)',
        'ret, f = cap.read()',
        'if not ret:',
        '    cap.set(cv2.CAP_PROP_POS_MSEC, 500)',
        '    ret, f = cap.read()',
        'if not ret: sys.exit(1)',
        'h, w = f.shape[:2]',
        'if w > 3840 or h > 2160:',
        '    scale = min(3840.0 / w, 2160.0 / h)',
        '    f = cv2.resize(f, (max(1, int(w * scale)), max(1, int(h * scale))), interpolation=cv2.INTER_AREA)',
        `cv2.imwrite(r"${pSafe}", f, [cv2.IMWRITE_JPEG_QUALITY, 95])`,
        'cap.release()'
      ].join('\n');
      cp.execFileSync(py, ['-c', script], { timeout: 15000, stdio: 'pipe', windowsHide: true });
      if (fs.existsSync(targetPosterPath) && fs.statSync(targetPosterPath).size > 1000) {
        return true;
      }
    } catch (e) {}
  }
  // Fallback to ffmpeg if available
  try {
    cp.execFileSync('ffmpeg', [
      '-y', '-ss', '00:00:00.000', '-i', videoPath,
      '-vframes', '1', '-q:v', '2', targetPosterPath
    ], { timeout: 15000, stdio: 'pipe', windowsHide: true });
    if (fs.existsSync(targetPosterPath) && fs.statSync(targetPosterPath).size > 1000) {
      return true;
    }
  } catch(e) {}
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
          if (fs.existsSync(pCandidate) && !pj.preview.toLowerCase().endsWith('.gif')) {
            return pCandidate;
          }
        }
      } catch (e) {}
    }

    // 2. Common high-res preview and poster names (prioritizing high-res formats over low-res GIF)
    const baseWithoutExt = path.basename(videoPath, path.extname(videoPath));
    const commonNames = [
      `${baseWithoutExt}.jpg`, `${baseWithoutExt}.png`, `${baseWithoutExt}.webp`,
      'poster.jpg', 'poster.png', 'poster.webp',
      'cover.jpg', 'cover.png', 'cover.webp',
      'preview.jpg', 'preview.png', 'preview.webp',
      `${baseWithoutExt}.jpeg`, 'poster.jpeg', 'preview.jpeg'
    ];
    for (const name of commonNames) {
      const p = path.join(dir, name);
      if (fs.existsSync(p)) return p;
    }

    // 3. Fallback: ONLY check generic common names if directory is dedicated to this single video
    const files = fs.readdirSync(dir);
    const videoFiles = files.filter(f => VIDEO_EXTS.has(path.extname(f).toLowerCase()));
    if (videoFiles.length <= 1) {
      const commonNames = [
        'preview.jpg', 'preview.png', 'preview.webp',
        'poster.jpg', 'poster.png', 'poster.webp',
        'cover.jpg', 'cover.png', 'cover.webp'
      ];
      for (const name of commonNames) {
        const p = path.join(dir, name);
        if (fs.existsSync(p)) return p;
      }
    }
  } catch (e) {}
  return null;
}

function generateMasterCss(slotsConfig) {
  if (!slotsConfig) {
    slotsConfig = loadSlotsConfig();
  }

  const isLeftActive = Boolean(slotsConfig?.left && slotsConfig.left.type !== 'none' && slotsConfig.left.file);
  const isBottomActive = Boolean(slotsConfig?.bottom && slotsConfig.bottom.type !== 'none' && slotsConfig.bottom.file);
  const isSettingsActive = Boolean(slotsConfig?.settings && slotsConfig.settings.type !== 'none' && slotsConfig.settings.file);

  // Requirement: Return empty CSS comment when unconfigured or default
  if (!slotsConfig || slotsConfig.isOriginal || (!isLeftActive && !isBottomActive && !isSettingsActive)) {
    return '/* Antigravity Wallpaper Engine: Vanilla Mode */\n';
  }

  const isLeftVideo = slotsConfig.left && slotsConfig.left.type === 'video';
  const isBottomVideo = slotsConfig.bottom && slotsConfig.bottom.type === 'video';
  const isSettingsVideo = slotsConfig.settings && slotsConfig.settings.type === 'video';

  function resolveSlotImg(key, slotConfig, defaultStatic) {
    if (!slotConfig || slotConfig.type === 'none' || !slotConfig.file) return '';
    if (slotConfig.type === 'video') {
      const prefix = key === 'bottom' ? 'input' : key;
      let poster = slotConfig.poster;
      if (poster && poster.toLowerCase().endsWith('.gif')) poster = null;
      if (!poster) {
        const candidate = `${prefix}_poster.jpg`;
        if (fs.existsSync(path.join(wallpapersDir, candidate))) poster = candidate;
      }
      return poster || defaultStatic;
    }
    return slotConfig.file || defaultStatic;
  }

  const leftImg = resolveSlotImg('left', slotsConfig.left, 'left_wallpaper.jpg');
  const bottomImg = resolveSlotImg('bottom', slotsConfig.bottom, 'input_wallpaper.jpg');
  const settingsImg = resolveSlotImg('settings', slotsConfig.settings, 'settings_wallpaper.png');

  const serverBase = `http://127.0.0.1:${DEFAULT_PORT || 8315}`;
  
  function getInlineOrUrl(imgFile, slotVersion) {
    if (!imgFile) return '';
    const vParam = slotVersion ? `?v=${slotVersion}` : `?v=${Date.now()}`;
    return `${serverBase}/${encodeURIComponent(imgFile)}${vParam}`;
  }

  const b64Left = getInlineOrUrl(leftImg, slotsConfig.left && slotsConfig.left.version);
  const b64Bottom = getInlineOrUrl(bottomImg, slotsConfig.bottom && slotsConfig.bottom.version);
  const b64Settings = getInlineOrUrl(settingsImg, slotsConfig.settings && slotsConfig.settings.version);

  const posLeft = getSlotPosition(slotsConfig, 'left');
  const posBottom = getSlotPosition(slotsConfig, 'bottom');
  const posSettings = getSlotPosition(slotsConfig, 'settings');

  const isTransparentSidebar = Boolean(!slotsConfig.isOriginal && isLeftActive && slotsConfig.transparentSidebar === true);
  const isTransparentHeader = Boolean(!slotsConfig.isOriginal && isLeftActive && slotsConfig.transparentHeader === true);
  const leftAlpha = (!slotsConfig.isOriginal && isLeftActive) ? getDarkMaskAlpha(getSlotDarkMaskOpacity(slotsConfig, 'left')) : 0;
  const bottomAlpha = (!slotsConfig.isOriginal && (isBottomActive || isLeftActive)) ? getDarkMaskAlpha(getSlotDarkMaskOpacity(slotsConfig, 'bottom')) : 0;
  const settingsAlpha = (!slotsConfig.isOriginal && isSettingsActive) ? getDarkMaskAlpha(getSlotDarkMaskOpacity(slotsConfig, 'settings')) : 0;

  const sidebarAlpha = leftAlpha > 0 ? Number((0.45 + leftAlpha * 0.45).toFixed(2)) : 0.45;
  const headerAlpha = leftAlpha > 0 ? Number((0.45 + leftAlpha * 0.45).toFixed(2)) : 0.45;

  return `/* ==========================================================================
   Antigravity Wallpaper Engine - Pure 3-Target Edition
   Targets: [Target 1: left (Base)] | [Target 2: bottom (Input Box)] | [Target 3: settings (Settings Modal)]
   Pass-through Transparent: [terminal.xterm] | [Auxiliary Pane]
   ========================================================================== */

/* 1. Global Base Layout */
html, body {
  overflow: hidden !important;
  width: 100% !important;
  height: 100% !important;
  margin: 0 !important;
  padding: 0 !important;
  background-color: transparent !important;
  background: transparent !important;
}

#root, #app {
  position: relative !important;
  z-index: 1 !important;
  overflow: hidden !important;
  width: 100% !important;
  height: 100% !important;
  background-color: transparent !important;
  background: transparent !important;
}

body > div:has(webview),
div:has(> webview),
webview {
  z-index: 10 !important;
  pointer-events: auto !important;
}

[style*="anchor-name: --builtin-browser-anchor"],
[style*="anchor-name:--builtin-browser-anchor"] {
  pointer-events: none !important;
}

html::-webkit-scrollbar,
body::-webkit-scrollbar,
#root::-webkit-scrollbar {
  display: none !important;
  width: 0 !important;
  height: 0 !important;
}

/* 2. Target 1: Base Wallpaper (slot: left) */
${isLeftActive ? `
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
  background-image: ${b64Left ? `url("${b64Left}")` : 'none'} !important;
  background-size: cover !important;
  background-position: ${posLeft} !important;
  background-repeat: no-repeat !important;
  pointer-events: none !important;
  z-index: 0 !important;
  transform: translate3d(0, 0, 0) !important;
  backface-visibility: hidden !important;
}

#antigravity-video-left {
  position: fixed !important;
  top: 0 !important;
  left: 0 !important;
  right: 0 !important;
  bottom: 0 !important;
  width: 100% !important;
  height: 100% !important;
  object-fit: cover !important;
  object-position: ${posLeft} !important;
  pointer-events: none !important;
  z-index: 0 !important;
  transform: translate3d(0, 0, 0) !important;
  backface-visibility: hidden !important;
  contain: strict !important;
}
` : ''}

/* 3. Main Conversation Area Transparency (Allows Base Wallpaper to Shine Through) */
#root, #app, [data-theme], .h-screen, .w-screen, .flex-1,
.agy-shell, .agy-shell.bg-background, #root > div.agy-shell,
.agy-sheet, .browser-hole-opaque {
  background-color: transparent !important;
  background: transparent !important;
}

main .overflow-y-auto,
div[role="region"] .overflow-y-auto,
.relative.w-full.h-full.overflow-y-auto,
div.flex-1.min-h-0.overflow-y-auto,
div.overflow-y-auto.min-h-0.w-full,
div.overflow-y-auto.isolate {
  background-color: transparent !important;
  background: transparent !important;
}

main [class*="bg-gradient-to-b"],
main [class*="bg-gradient-to-t"],
main [class*="scroll-fade"],
main [class*="scroller-mask"],
main [class*="turn-separator"] {
  background-image: none !important;
  background-color: transparent !important;
  background: transparent !important;
  mask-image: none !important;
  -webkit-mask-image: none !important;
}

div[class*="sticky"],
div.sticky,
main div.sticky,
[class*="group/user-input-step"],
div.sticky > div > [class*="group/user-input-step"] {
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
}

div.absolute.bottom-0.pointer-events-none.left-4,
div.absolute.bottom-0.inset-x-4.pointer-events-none,
div[class*="pointer-events-none"][class*="bottom-0"][class*="left-4"],
div[class*="inset-x-4"][class*="pointer-events-none"][class*="bottom-0"],
div.pointer-events-none[style*="linear-gradient"],
div.absolute.top-0.pointer-events-none.left-4,
div.absolute.top-0.inset-x-4.pointer-events-none,
div[class*="pointer-events-none"][class*="top-0"][class*="left-4"] {
  background: transparent !important;
  background-image: none !important;
  display: none !important;
}
${isTransparentSidebar ? `
/* 3a. Optional Left Sidebar Transparency (Shares Main Wallpaper) */
div[role="navigation"][aria-label="Sidebar"],
div[role="navigation"][aria-label="侧边栏"],
aside[aria-label="Sidebar"],
aside[aria-label="侧边栏"] {
  background: rgba(17, 17, 20, ${sidebarAlpha}) !important;
  background-color: rgba(17, 17, 20, ${sidebarAlpha}) !important;
  backdrop-filter: blur(20px) saturate(180%) !important;
  -webkit-backdrop-filter: blur(20px) saturate(180%) !important;
  border-right: 1px solid rgba(255, 255, 255, 0.08) !important;
  position: relative !important;
  z-index: 40 !important;
  pointer-events: auto !important;
}

div[role="navigation"][aria-label="Sidebar"] button,
div[role="navigation"][aria-label="侧边栏"] button,
div[role="navigation"][aria-label="Sidebar"] a,
div[role="navigation"][aria-label="侧边栏"] a,
div[role="navigation"][aria-label="Sidebar"] [role="button"],
div[role="navigation"][aria-label="侧边栏"] [role="button"],
aside[aria-label="Sidebar"] button,
aside[aria-label="侧边栏"] button,
aside[aria-label="Sidebar"] a,
aside[aria-label="侧边栏"] a,
aside[aria-label="Sidebar"] [role="button"],
aside[aria-label="侧边栏"] [role="button"] {
  pointer-events: auto !important;
  -webkit-app-region: no-drag !important;
  cursor: pointer !important;
}

div[role="navigation"][aria-label="Sidebar"] .bg-sidebar,
div[role="navigation"][aria-label="侧边栏"] .bg-sidebar,
aside[aria-label="Sidebar"] .bg-sidebar,
aside[aria-label="侧边栏"] .bg-sidebar {
  background: transparent !important;
  background-color: transparent !important;
}

div[role="navigation"][aria-label="Sidebar"] .bg-sidebar-secondary,
div[role="navigation"][aria-label="侧边栏"] .bg-sidebar-secondary,
aside[aria-label="Sidebar"] .bg-sidebar-secondary,
aside[aria-label="侧边栏"] .bg-sidebar-secondary {
  background: rgba(255, 255, 255, 0.08) !important;
  background-color: rgba(255, 255, 255, 0.08) !important;
}
` : ''}${isTransparentHeader ? `
/* 3b. Optional Top Header Bar Transparency (Shares Main Wallpaper) */
.agy-shell > div.shrink-0,
div.shrink-0:has(> [data-testid="title-menu-bar"]),
div.shrink-0:has([data-testid="title-menu-bar"]) {
  background: transparent !important;
  background-color: transparent !important;
  position: relative !important;
  z-index: 9000 !important;
  overflow: visible !important;
  contain: none !important;
}

[data-testid="title-menu-bar"] {
  background: rgba(17, 17, 20, ${headerAlpha}) !important;
  background-color: rgba(17, 17, 20, ${headerAlpha}) !important;
  backdrop-filter: blur(20px) saturate(180%) !important;
  -webkit-backdrop-filter: blur(20px) saturate(180%) !important;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08) !important;
  position: relative !important;
  z-index: 9000 !important;
  overflow: visible !important;
  contain: none !important;
}

[data-testid="title-menu-bar"] button,
[data-testid="title-menu-bar"] [data-testid="title-menu-bar-item"],
[data-testid="title-menu-bar"] [role="button"],
[data-testid="title-menu-bar"] a,
[data-testid="title-menu-bar"] div.relative,
[data-testid="title-menu-bar"] div.relative * {
  -webkit-app-region: no-drag !important;
  pointer-events: auto !important;
  cursor: pointer !important;
  user-select: none !important;
}

[data-testid="title-menu-bar"] div.absolute.top-full,
[data-testid="title-menu-bar"] div[data-state="open"] {
  position: absolute !important;
  z-index: 10000 !important;
  -webkit-app-region: no-drag !important;
  pointer-events: auto !important;
  contain: none !important;
  background: rgba(22, 24, 34, 0.98) !important;
  border: 1px solid rgba(255, 255, 255, 0.15) !important;
  border-radius: 8px !important;
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.6) !important;
  overflow: hidden !important;
}

[data-testid="title-menu-bar"] div.absolute.top-full button,
[data-testid="title-menu-bar"] [data-testid="title-menu-bar-option"] {
  -webkit-app-region: no-drag !important;
  pointer-events: auto !important;
  cursor: pointer !important;
  padding: 6px 12px !important;
  color: #f1f5f9 !important;
  font-weight: 500 !important;
  transition: all 0.15s ease !important;
}

[data-testid="title-menu-bar"] div.absolute.top-full button:hover,
[data-testid="title-menu-bar"] [data-testid="title-menu-bar-option"]:hover {
  background: rgba(255, 255, 255, 0.12) !important;
  color: #ffffff !important;
}
` : ''}
/* 4. Terminal & Auxiliary Drawer Seamless Transparency (Pure 3-Target Contract) */
.terminal.xterm,
[data-panel="terminal"],
.xterm-dom-renderer-owner-1,
div.terminal-wrapper,
div:has(> .xterm-screen),
.terminal.xterm .xterm-viewport,
.terminal.xterm .xterm-screen,
[aria-label="Auxiliary Pane"],
[aria-label="辅助面板"],
div.bg-background:has([aria-label="Auxiliary Pane"]),
div.bg-background:has([aria-label="辅助面板"]),
aside[aria-label*="drawer"],
[data-panel="auxiliary"],
div[role="region"][aria-label="Terminal"],
div[role="region"][aria-label="终端"],
[class*="terminal-drawer"],
div.flex.flex-col.gap-2.overflow-y-auto.h-full.w-full.bg-background {
  background: transparent !important;
  background-color: transparent !important;
  background-image: none !important;
  border-left: none !important;
  box-shadow: none !important;
}
${leftAlpha > 0 ? `
/* 3c. Regional Adjustable Dark Mask / Brightness Dimmer */
div[data-testid="aux-pane-split"] > div.flex:first-child,
div[data-testid="aux-pane-split"] > div:not(:first-child):not(.bg-border),
.agy-sheet:not(:has([data-testid="aux-pane-split"])),
main[class*="bg-background"]:not(.agy-sheet *):not([data-testid="aux-pane-split"] *),
[aria-label="Auxiliary Pane"]:not(.agy-sheet *):not([data-testid="aux-pane-split"] *):not([aria-label="Auxiliary Pane"] *),
[aria-label="辅助面板"]:not(.agy-sheet *):not([data-testid="aux-pane-split"] *):not([aria-label="辅助面板"] *),
aside[aria-label*="drawer"]:not(.agy-sheet *):not([data-testid="aux-pane-split"] *),
[data-panel="auxiliary"]:not(.agy-sheet *):not([data-testid="aux-pane-split"] *) {
  background-color: rgba(7, 9, 14, ${leftAlpha}) !important;
  background: rgba(7, 9, 14, ${leftAlpha}) !important;
}
` : ''}
.antigravity-slot-video[data-slot="mid"],
.antigravity-slot-video[data-slot="right"] {
  display: none !important;
}

/* 5. Target 2: Input Box (slot: bottom) */
[id="antigravity.agentSidePanelInputBox"],
.surface-composer,
div[data-testid="agent-input-box"],
div.rounded-2xl.bg-card-border:has(> div.bg-card),
div:has(> [id="antigravity.agentSidePanelInputBox"]) {
  background-color: transparent !important;
  background: transparent !important;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.35), 0 0 0 1px rgba(255, 255, 255, 0.08) !important;
}

${isBottomActive ? `
[id="antigravity.agentSidePanelInputBox"] > div.bg-card:not([role="listbox"]):not([role="menu"]):not([data-mention-menu]):not([data-radix-popper-content-wrapper]):not([class*="bottom-full"]):not([class*="absolute"]):not([data-state="open"]),
[id="antigravity.agentSidePanelInputBox"] > div[class*="bg-card"]:not([role="listbox"]):not([role="menu"]):not([data-mention-menu]):not([data-radix-popper-content-wrapper]):not([class*="bottom-full"]):not([class*="absolute"]):not([data-state="open"]),
[id="antigravity.agentSidePanelInputBox"] .surface-composer-card:not([role="listbox"]):not([role="menu"]):not([data-mention-menu]):not([data-radix-popper-content-wrapper]):not([class*="bottom-full"]):not([class*="absolute"]):not([data-state="open"]),
.surface-composer-card:not([role="listbox"]):not([role="menu"]):not([data-mention-menu]):not([data-radix-popper-content-wrapper]):not([class*="bottom-full"]):not([class*="absolute"]):not([data-state="open"]),
div.rounded-2xl.bg-card-border > div.bg-card:not([role="listbox"]):not([role="menu"]):not([data-mention-menu]):not([data-radix-popper-content-wrapper]):not([class*="bottom-full"]):not([class*="absolute"]):not([data-state="open"]) {
  position: relative !important;
  background-color: transparent !important;
  background-image: ${b64Bottom ? (bottomAlpha > 0 ? `linear-gradient(rgba(7, 9, 14, ${bottomAlpha}), rgba(7, 9, 14, ${bottomAlpha})), url("${b64Bottom}")` : `url("${b64Bottom}")`) : 'none'} !important;
  background-size: cover !important;
  background-position: ${posBottom} !important;
  background-repeat: no-repeat !important;
  overflow: hidden !important;
}

[id="antigravity.agentSidePanelInputBox"] > div.bg-card:not([role="listbox"]):not([data-mention-menu]) div:not([class*="thumbnail"]):not(img),
[id="antigravity.agentSidePanelInputBox"] .surface-composer-card:not([role="listbox"]):not([data-mention-menu]) div:not([class*="thumbnail"]):not(img),
.surface-composer-card:not([role="listbox"]):not([data-mention-menu]) div:not([class*="thumbnail"]):not(img),
div.rounded-2xl.bg-card-border > div.bg-card:not([role="listbox"]):not([data-mention-menu]) div:not([class*="thumbnail"]):not(img) {
  background-image: none !important;
  background-color: transparent !important;
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
  transform: translateZ(0) !important;
  backface-visibility: hidden !important;
}

[id="antigravity.agentSidePanelInputBox"] > div.bg-card > *:not(.antigravity-slot-video),
[id="antigravity.agentSidePanelInputBox"] > div[class*="bg-card"] > *:not(.antigravity-slot-video),
[id="antigravity.agentSidePanelInputBox"] .surface-composer-card > *:not(.antigravity-slot-video),
.surface-composer-card > *:not(.antigravity-slot-video),
div.rounded-2xl.bg-card-border > div.bg-card > *:not(.antigravity-slot-video) {
  position: relative !important;
  z-index: 2 !important;
}
${bottomAlpha > 0 ? `
/* 5b. Input Box Dark Mask / Brightness Dimmer (slot: bottom) */
[id="antigravity.agentSidePanelInputBox"] > div.bg-card:has(> .antigravity-slot-video[data-slot="bottom"])::after,
[id="antigravity.agentSidePanelInputBox"] > div[class*="bg-card"]:has(> .antigravity-slot-video[data-slot="bottom"])::after,
[id="antigravity.agentSidePanelInputBox"] .surface-composer-card:has(> .antigravity-slot-video[data-slot="bottom"])::after,
.surface-composer-card:has(> .antigravity-slot-video[data-slot="bottom"])::after,
div.rounded-2xl.bg-card-border > div.bg-card:has(> .antigravity-slot-video[data-slot="bottom"])::after {
  content: "" !important;
  position: absolute !important;
  inset: 0 !important;
  background-color: rgba(7, 9, 14, ${bottomAlpha}) !important;
  background: rgba(7, 9, 14, ${bottomAlpha}) !important;
  pointer-events: none !important;
  z-index: 1 !important;
  border-radius: inherit !important;
}
` : ''}
` : `
/* Bottom slot transparent pass-through when left has wallpaper */
${isLeftActive ? `
[id="antigravity.agentSidePanelInputBox"] .surface-composer-card,
.surface-composer-card {
  background-color: ${bottomAlpha > 0 ? `rgba(7, 9, 14, ${Number((0.45 + bottomAlpha * 0.55).toFixed(2))})` : 'rgba(19, 19, 23, 0.45)'} !important;
  backdrop-filter: blur(12px) !important;
  -webkit-backdrop-filter: blur(12px) !important;
}
` : ''}
`}

${(isBottomActive || isLeftActive) ? `
/* Ensure input box footer buttons and text maintain clear frosted glass pill visibility over wallpapers */
[id="antigravity.agentSidePanelInputBox"] .agy-composer-footer button:not([data-testid="voice-start-button"]):not([data-testid="input-cancel-button"]),
.surface-composer .agy-composer-footer button:not([data-testid="voice-start-button"]):not([data-testid="input-cancel-button"]) {
  background: rgba(18, 20, 28, 0.65) !important;
  backdrop-filter: blur(8px) !important;
  -webkit-backdrop-filter: blur(8px) !important;
  border: 1px solid rgba(255, 255, 255, 0.12) !important;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3) !important;
  color: rgb(235, 235, 240) !important;
  transition: all 0.15s ease !important;
}

[id="antigravity.agentSidePanelInputBox"] .agy-composer-footer button:hover:not([data-testid="voice-start-button"]):not([data-testid="input-cancel-button"]),
.surface-composer .agy-composer-footer button:hover:not([data-testid="voice-start-button"]):not([data-testid="input-cancel-button"]) {
  background: rgba(30, 34, 50, 0.85) !important;
  border-color: rgba(255, 255, 255, 0.25) !important;
  color: #ffffff !important;
}

[id="antigravity.agentSidePanelInputBox"] div[aria-label="Message input"],
[id="antigravity.agentSidePanelInputBox"] div[aria-label="消息输入"],
.surface-composer div[aria-label="Message input"],
.surface-composer div[aria-label="消息输入"],
[id="antigravity.agentSidePanelInputBox"] p.pointer-events-none,
.surface-composer p.pointer-events-none {
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.7) !important;
}
` : ''}

/* 6. Target 3: Settings Dialog (slot: settings) */
[data-radix-dialog-overlay] {
  background-color: rgba(5, 7, 16, 0.85) !important;
  z-index: 998 !important;
}

${isSettingsActive ? `
[role="dialog"],
div[data-state="open"]:has(div.bg-sidebar),
div.settings-modal-container {
  position: relative !important;
  background-color: transparent !important;
  background-image: ${b64Settings ? (settingsAlpha > 0 ? `linear-gradient(rgba(7, 9, 14, ${settingsAlpha}), rgba(7, 9, 14, ${settingsAlpha})), url("${b64Settings}")` : `url("${b64Settings}")`) : 'none'} !important;
  background-size: cover !important;
  background-position: ${posSettings} !important;
  background-repeat: no-repeat !important;
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
}

[role="dialog"] > *:not(.antigravity-slot-video),
div[data-state="open"]:has(div.bg-sidebar) > *:not(.antigravity-slot-video),
div.settings-modal-container > *:not(.antigravity-slot-video) {
  position: relative !important;
  z-index: 1 !important;
}
${settingsAlpha > 0 ? `
/* 6b. Settings Dialog Dark Mask / Brightness Dimmer (slot: settings) */
[role="dialog"]:has(> .antigravity-slot-video[data-slot="settings"])::after,
div[data-state="open"]:has(div.bg-sidebar):has(> .antigravity-slot-video[data-slot="settings"])::after,
div.settings-modal-container:has(> .antigravity-slot-video[data-slot="settings"])::after {
  content: "" !important;
  position: absolute !important;
  inset: 0 !important;
  background-color: rgba(7, 9, 14, ${settingsAlpha}) !important;
  background: rgba(7, 9, 14, ${settingsAlpha}) !important;
  pointer-events: none !important;
  z-index: 0 !important;
  border-radius: inherit !important;
}
` : ''}

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
` : ''}

/* 7. Common Video Element Containment */
.antigravity-slot-video {
  pointer-events: none !important;
  user-select: none !important;
  -webkit-user-select: none !important;
  transform: translate3d(0, 0, 0) !important;
  backface-visibility: hidden !important;
  contain: layout paint !important;
}
`;
}

function getClientVideoScript(config) {
  if (config && config.isOriginal) {
    return `
    (function() {
      try {
        window.__antigravityConfig = { isOriginal: true };
        window.__antigravityApplyVideos = null;
        if (window.__antigravityVideoObserver) {
          try { window.__antigravityVideoObserver.disconnect(); } catch(e) {}
          window.__antigravityVideoObserver = null;
        }
        if (window.__antigravityVideoVisibilityObserver) {
          try { window.__antigravityVideoVisibilityObserver.disconnect(); } catch(e) {}
          window.__antigravityVideoVisibilityObserver = null;
        }
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
        // 1. 彻底暂停并销毁所有槽位视频与残留播放器
        const vids = document.querySelectorAll('.antigravity-slot-video, #antigravity-video-left, video');
        for (let i = 0; i < vids.length; i++) {
          try {
            if (vids[i].classList.contains('antigravity-slot-video') || vids[i].id === 'antigravity-video-left' || vids[i].dataset.slot) {
              vids[i].pause();
              vids[i].removeAttribute('src');
              vids[i].load();
              vids[i].remove();
            }
          } catch(e) {}
        }
        // 2. 清理所有 0ms 兜底海报与注入样式
        const zeroStyle = document.getElementById('antigravity-zero-latency-style');
        if (zeroStyle) {
          try { zeroStyle.remove(); } catch(e) {}
        }
        // 3. 彻底清除所有容器（输入框、终端、侧栏、弹窗）的残留背景与定位属性
        const allSlotContainers = document.querySelectorAll([
          '[id*="InputBox"] > div',
          'div.rounded-2xl.bg-card-border > div',
          '[data-ag-positioned]',
          '.terminal-wrapper',
          '[data-panel="terminal"]',
          '[role="dialog"]',
          '[class*="terminal-drawer"]'
        ].join(','));
        for (let i = 0; i < allSlotContainers.length; i++) {
          try {
            const el = allSlotContainers[i];
            el.style.setProperty('background-image', 'none', 'important');
            el.style.setProperty('background-color', 'var(--color-card)', 'important');
            el.style.removeProperty('overflow');
            el.style.removeProperty('contain');
            el.style.removeProperty('will-change');
            delete el.dataset.agPositioned;
          } catch(e) {}
        }
      } catch(e) {}
    })();
    `;
  }

  const configJson = JSON.stringify(config || {});
  const posLeft = getSlotPosition(config, 'left');
  const posBottom = getSlotPosition(config, 'bottom');
  const posSettings = getSlotPosition(config, 'settings');

  const serverBase = `http://127.0.0.1:${DEFAULT_PORT}`;
  const slotPosters = {};
  ['left', 'bottom', 'settings'].forEach(slotKey => {
    const slotData = config && config[slotKey];
    if (slotData && slotData.poster) {
      const v = slotData.version ? `?v=${slotData.version}` : `?v=${Date.now()}`;
      slotPosters[slotKey] = `${serverBase}/${encodeURIComponent(slotData.poster)}${v}`;
    }
  });
  const slotPostersJson = JSON.stringify(slotPosters);

  return `
  (function() {
    const SERVER_URL = 'http://127.0.0.1:${DEFAULT_PORT}';
    const config = ${configJson};
    const slotPosters = ${slotPostersJson};
    window.__antigravityConfig = config;
    const slotPositions = {
      'left': '${posLeft}',
      'bottom': '${posBottom}',
      'settings': '${posSettings}'
    };

    function checkAndShowVideo(v) {
      if (!v) return;
      if (v.style.display !== 'block') {
        v.style.display = 'block';
      }
    }

    // 视频无缝循环自愈与意外暂停恢复守护 (Loop & Freeze Watchdog)
    function setupVideoLoopGuards(videoEl) {
      if (!videoEl || videoEl._loopGuardsAttached) return;
      videoEl._loopGuardsAttached = true;

      // 1. 原生 ended 事件兜底 (处理任何到达终点的极速重启)
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

    // 智能可视性判定引擎：无重排轻量检测，精确感知折叠、弹窗关闭、祖先隐藏与视口相交
    function isVideoVisible(v) {
      if (!v || !v.isConnected) return false;
      if (v.id === 'antigravity-video-left') return true;
      if (v._isIntersecting === false) return false;
      if (v.style.display === 'none' || v.style.visibility === 'hidden') return false;
      const p = v.parentElement;
      if (!p) return false;
      if (p.style && (p.style.display === 'none' || p.style.visibility === 'hidden')) return false;
      if (p.hasAttribute && p.hasAttribute('hidden')) return false;
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

    // Tick 0 极速挂载底图壁纸 (0ms 显示海报图并立即预载视频流，绝无开机黑屏与卡顿延迟)
    function mountTickZeroBase() {
      try {
        const left = config.left;
        if (!left || left.type !== 'video' || !left.file) {
          const oldLefts = document.querySelectorAll('#antigravity-video-left, .antigravity-slot-video[data-slot="left"]');
          for (let i = 0; i < oldLefts.length; i++) {
            try {
              oldLefts[i].pause();
              oldLefts[i].removeAttribute('src');
              oldLefts[i].load();
              oldLefts[i].remove();
            } catch(e) {}
          }
          const bottom = config.bottom;
          if (!bottom || bottom.type !== 'video' || !bottom.file) {
            const oldBottomVids = document.querySelectorAll('.antigravity-slot-video[data-slot="bottom"]');
            for (let i = 0; i < oldBottomVids.length; i++) {
              try {
                oldBottomVids[i].pause();
                oldBottomVids[i].removeAttribute('src');
                oldBottomVids[i].load();
                oldBottomVids[i].remove();
              } catch(e) {}
            }
          }
          return;
        }
        const vParam = (left && left.version) ? ('?v=' + left.version) : ('?v=' + Date.now());
        const src = SERVER_URL + '/' + encodeURIComponent(left.file) + vParam;
        const posterSrc = slotPosters['left'] || ((left && left.poster) ? (SERVER_URL + '/' + encodeURIComponent(left.poster) + vParam) : '');
        const posLeft = '${posLeft}';

        const bottom = config.bottom;
        const bottomPosterSrc = slotPosters['bottom'] || ((bottom && bottom.poster) ? (SERVER_URL + '/' + encodeURIComponent(bottom.poster) + vParam) : '');
        const posBottom = '${posBottom}';

        if (document.body) {
          const zeroStyle = document.getElementById('antigravity-zero-latency-style');
          if (zeroStyle) {
            try { zeroStyle.remove(); } catch(e) {}
          }
        }

        // 0ms 高保真底图与底部卡片静态海报瞬发样式，杜绝开机黑屏与卡顿延迟
        let zeroLatencyStyle = document.getElementById('antigravity-zero-latency-style');
        if (!zeroLatencyStyle && (posterSrc || bottomPosterSrc)) {
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
            '}'
          );
          zeroLatencyStyle.textContent = rules.join('\\n');
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
          setupVideoLoopGuards(leftVid);
          leftVid.addEventListener('playing', function() {
            checkAndShowVideo(leftVid);
            const zeroStyle = document.getElementById('antigravity-zero-latency-style');
            if (zeroStyle) {
              try { zeroStyle.remove(); } catch(e) {}
            }
          });
          leftVid.addEventListener('canplay', function() {
            if (leftVid.paused) leftVid.play().catch(function(){});
          });
          leftVid.addEventListener('error', function() {
            setTimeout(function() {
              if (leftVid.error) {
                leftVid.load();
                leftVid.play().catch(function(){});
              }
            }, 300);
          });
          if (!leftVid.isConnected) {
            if (document.body) {
              document.body.prepend(leftVid);
            } else if (document.documentElement) {
              document.documentElement.prepend(leftVid);
            }
            leftVid.play().catch(function(){});
          }
          if (document.body && leftVid.parentElement !== document.body) {
            document.body.prepend(leftVid);
          }
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
      const onResume = function() {
        const allVids = document.querySelectorAll('.antigravity-slot-video, #antigravity-video-left, video');
        for (let i = 0; i < allVids.length; i++) {
          if (allVids[i]._pausedByHidden) {
            allVids[i]._pausedByHidden = false;
          }
          syncVideoPlaybackState(allVids[i]);
        }
        if (typeof window.runWatchdogCycle === 'function') {
          window.runWatchdogCycle(true);
        }
      };
      document.addEventListener('visibilitychange', function() {
        if (document.hidden) {
          const allVids = document.querySelectorAll('.antigravity-slot-video, #antigravity-video-left, video');
          for (let i = 0; i < allVids.length; i++) {
            if (!allVids[i].paused) {
              allVids[i]._pausedByHidden = true;
              allVids[i].pause();
            }
          }
        } else {
          onResume();
        }
      });
      window.addEventListener('focus', onResume, true);
      window.addEventListener('pageshow', onResume, true);
      window.addEventListener('online', onResume, true);
      window.addEventListener('pointerdown', function() {
        const now = Date.now();
        if (!window.__lastPointerNudge || now - window.__lastPointerNudge > 3000) {
          window.__lastPointerNudge = now;
          onResume();
        }
      }, { passive: true });
    }

    function applyVideos() {
      if (window.__antigravityConfig && window.__antigravityConfig.isOriginal) {
        const allVids = document.querySelectorAll('.antigravity-slot-video, #antigravity-video-left');
        for (let i = 0; i < allVids.length; i++) {
          try {
            allVids[i].pause();
            allVids[i].removeAttribute('src');
            allVids[i].load();
            allVids[i].remove();
          } catch(e) {}
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
      // 1. Slot: left (Global base wallpaper)
      const left = config.left;
      if (left && left.type === 'video' && left.file) {
        const vParam = (left && left.version) ? ('?v=' + left.version) : ('?v=' + Date.now());
        const src = SERVER_URL + '/' + encodeURIComponent(left.file) + vParam;
        const posterSrc = slotPosters['left'] || ((left && left.poster) ? (SERVER_URL + '/' + encodeURIComponent(left.poster) + vParam) : '');
        let leftVid = document.getElementById('antigravity-video-left');
        if (leftVid && leftVid.isConnected && leftVid.dataset.currentSrc === src) {
          if (posterSrc && leftVid.getAttribute('poster') !== posterSrc) {
            leftVid.poster = posterSrc;
            leftVid.setAttribute('poster', posterSrc);
            leftVid.style.backgroundImage = 'url("' + posterSrc + '")';
            leftVid.style.backgroundSize = 'cover';
            leftVid.style.backgroundPosition = '${posLeft}';
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
              leftVid.play().catch(function(){});
            }
          }
          setupVideoLoopGuards(leftVid);
          if (leftVid.paused && leftVid.readyState >= 1) {
            if (leftVid.currentTime >= leftVid.duration - 0.2 || leftVid.ended) leftVid.currentTime = 0;
            leftVid.play().catch(function() {});
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
              stagingVid.style.objectPosition = '${posLeft}';
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
              leftVid.style.objectPosition = '${posLeft}';
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
                leftVid.style.backgroundPosition = '${posLeft}';
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
            leftVid.style.objectPosition = '${posLeft}';
            setupVideoLoopGuards(leftVid);
            if (leftVid.paused && leftVid.readyState >= 1) {
              leftVid.play().catch(function() {});
            }
            checkAndShowVideo(leftVid);
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

      // 2. Container slots: bottom, settings
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
      for (const slotKey in slotSelectors) {
        const slotData = config[slotKey];
        const isVideo = slotData && slotData.type === 'video' && slotData.file;
        const vParam = (slotData && slotData.version) ? ('?v=' + slotData.version) : ('?v=' + Date.now());
        const src = isVideo ? (SERVER_URL + '/' + encodeURIComponent(slotData.file) + vParam) : null;
        const posterSrc = slotPosters[slotKey] || ((isVideo && slotData.poster) ? (SERVER_URL + '/' + encodeURIComponent(slotData.poster) + vParam) : '');
        const selectors = slotSelectors[slotKey];

        if (!isVideo) {
          const oldVids = document.querySelectorAll('.antigravity-slot-video[data-slot="' + slotKey + '"]');
          for (let i = 0; i < oldVids.length; i++) {
            oldVids[i].pause();
            oldVids[i].removeAttribute('src');
            oldVids[i].load();
            oldVids[i].remove();
          }
          for (let i = 0; i < selectors.length; i++) {
            try {
              const el = document.querySelector(selectors[i]);
              if (el) {
                if (config.isOriginal || (slotData && (slotData.type === 'none' || slotData.isOriginal))) {
                  el.style.setProperty('background-image', 'none', 'important');
                  if (slotKey === 'bottom') {
                    if (config.isOriginal || !config.left || config.left.type === 'none') {
                      el.style.setProperty('background-color', 'var(--color-card, #131722)', 'important');
                    } else {
                      el.style.removeProperty('background-color');
                    }
                  } else {
                    el.style.removeProperty('background-color');
                  }
                  el.style.removeProperty('overflow');
                  el.style.removeProperty('contain');
                  el.style.removeProperty('will-change');
                  delete el.dataset.agPositioned;
                } else {
                  el.style.removeProperty('background-color');
                  el.style.removeProperty('background-image');
                }
              }
            } catch(e) {}
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
            } catch (e) {}
          }

          if (targetContainer) {
            targetContainer.style.removeProperty('background-color');
            targetContainer.style.removeProperty('background-image');
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
                vid.style.backgroundPosition = (slotPositions[slotKey] || 'center center');
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
                if (isVideoVisible(vid) && vid.paused) vid.play().catch(function() {});
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
                      stagingContainerVid.play().then(performContainerSwap).catch(function() {
                        performContainerSwap();
                      });
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
            setupVideoLoopGuards(vid);
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

    window.__antigravityActiveConfig = config;

    window.__antigravityApplyVideos = applyVideos;
    applyVideos();

    // Gentle startup retry ladder without aggressive abort loops
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
            if (window.__antigravityApplyVideos) {
              window.__antigravityApplyVideos();
            }
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
      const allVids = document.querySelectorAll('.antigravity-slot-video, #antigravity-video-left');
      for (let i = 0; i < allVids.length; i++) {
        const v = allVids[i];
        if (!v.paused) {
          v._wasPlayingBeforeResize = true;
          v.pause();
        }
      }
      const iframes = document.querySelectorAll('iframe');
      for (let i = 0; i < iframes.length; i++) {
        iframes[i].style.pointerEvents = 'none';
      }
    };

    const resumeVideosAfterResize = function() {
      if (!window.__isResizing && !window.__isDraggingSplit) return;
      if (window.__isDraggingSplit) {
        const dragAge = Date.now() - (window.__dragStartTime || 0);
        if (dragAge <= 3000) return;
        window.__isDraggingSplit = false;
      }
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
        if (v._wasPlayingBeforeResize || v.paused) {
          v._wasPlayingBeforeResize = false;
          syncVideoPlaybackState(v);
        }
      }
      if (window.__antigravityApplyVideos) {
        window.__antigravityApplyVideos();
      } else if (typeof applyVideos === 'function') {
        applyVideos();
      }
    };

    
    // 极致原生 60FPS/120FPS 性能：左侧会话切换导航协调器 (消除切会话卡顿与 GPU 解码竞争)
    let navThrottleTimer = null;
    let navMaxTimeoutTimer = null;
    window.__isNavigating = false;

    const pauseVideosForNav = function() {
      if (window.__isNavigating) return;
      window.__isNavigating = true;
      if (document.body && !document.body.classList.contains('is-navigating')) {
        document.body.classList.add('is-navigating');
      }
      const allVids = document.querySelectorAll('.antigravity-slot-video, #antigravity-video-left');
      for (let i = 0; i < allVids.length; i++) {
        const v = allVids[i];
        if (!v.paused) {
          v._wasPlayingBeforeNav = true;
          v.pause();
        }
      }
      const iframes = document.querySelectorAll('iframe');
      for (let i = 0; i < iframes.length; i++) {
        iframes[i].style.pointerEvents = 'none';
      }
    };

    const resumeVideosAfterNav = function() {
      if (!window.__isNavigating) return;
      if (navThrottleTimer) { clearTimeout(navThrottleTimer); navThrottleTimer = null; }
      if (navMaxTimeoutTimer) { clearTimeout(navMaxTimeoutTimer); navMaxTimeoutTimer = null; }
      window.__isNavigating = false;
      if (document.body && document.body.classList.contains('is-navigating')) {
        document.body.classList.remove('is-navigating');
      }
      const iframes = document.querySelectorAll('iframe');
      for (let i = 0; i < iframes.length; i++) {
        iframes[i].style.pointerEvents = '';
      }
      const allVids = document.querySelectorAll('.antigravity-slot-video, #antigravity-video-left');
      for (let i = 0; i < allVids.length; i++) {
        const v = allVids[i];
        if (v._wasPlayingBeforeNav || v.paused) {
          v._wasPlayingBeforeNav = false;
          syncVideoPlaybackState(v);
        }
      }
      if (window.__antigravityApplyVideos) {
        window.__antigravityApplyVideos();
      } else if (typeof applyVideos === 'function') {
        applyVideos();
      }
    };

    const onNavClick = function(e) {
      const target = e.target;
      if (!target) return;
      const navItem = target.closest ? target.closest('a[href*="/c/"], a.absolute.inset-0, [data-testid*="conversation"], [class*="conversation-row"]') : null;
      if (!navItem) return;
      pauseVideosForNav();

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
        pauseVideosForNav();
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

        // Circuit Breaker: max 5 recoveries within 30 seconds
        if (v._recoveryTimestamps.length > 5) {
          if (!v._circuitOpenUntil || now > v._circuitOpenUntil) {
            v._circuitOpenUntil = now + 20000; // 20s cooldown
            logRecovery(slot, 'circuit-breaker-tripped', 'Exceeded 5 retries within 30s');
            try { v.pause(); } catch(e) {}
            v.style.opacity = '0';
            const poster = v.getAttribute('poster') || (v.dataset && v.dataset.poster) || '';
            if (poster) {
              v.style.backgroundImage = 'url("' + poster + '")';
              v.style.backgroundSize = 'cover';
              if (v.parentElement) {
                v.parentElement.style.backgroundImage = 'url("' + poster + '")';
                v.parentElement.style.backgroundSize = 'cover';
                v.parentElement.style.backgroundPosition = v.style.backgroundPosition || 'center center';
              }
            }
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
          // Tier 3: Token stream reload against local media server (port 8315)
          v._watchdogRecoveryTier = 4;
          logRecovery(slot, 'tier3-stream-reload', reason);
          try {
            const base = v.dataset.currentSrc || v.src;
            if (base) {
              const newSrc = updateCacheBuster(base, now);
              v.dataset.currentSrc = newSrc;
              v.src = newSrc;
              v.load();
              v.play().catch(function(){});
            }
          } catch(e) {}
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
          if (typeof v._lastWatchdogTime === 'number') {
            const delta = Math.abs(v.currentTime - v._lastWatchdogTime);
            if (delta < 0.005) {
              v._stallCycles = (v._stallCycles || 0) + 1;
              if (v._stallCycles >= 2) {
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
  })();
  `;
}

function triggerLiveHotReload(arg1, arg2, onComplete) {
  return new Promise((resolve) => {
    const finish = () => {
      if (typeof onComplete === 'function') {
        try { onComplete(); } catch (e) {}
      }
      resolve(true);
    };

    try {
      let activeConfig, activeCss;
      if (typeof arg1 === 'string') {
        activeCss = arg1;
        activeConfig = (arg2 && typeof arg2 === 'object') ? arg2 : loadSlotsConfig();
      } else {
        activeConfig = (arg1 && typeof arg1 === 'object') ? arg1 : loadSlotsConfig();
        activeCss = typeof arg2 === 'string' ? arg2 : generateMasterCss(activeConfig);
      }
      try {
        if (customCssPath && fs.existsSync(path.dirname(customCssPath))) {
          fs.writeFileSync(customCssPath, activeCss, 'utf-8');
        }
      } catch (e) {}
      http.get('http://127.0.0.1:8314/json', (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const list = JSON.parse(data);
            const page = list.find(p => p.type === 'page' && !p.url.startsWith('data:')) || list.find(p => p.type === 'page');
            if (page) {
              const ws = new WebSocket(page.webSocketDebuggerUrl);
              ws.addEventListener('open', () => {
                const videoScript = getClientVideoScript(activeConfig);
                const isLeftAct = Boolean(activeConfig && !activeConfig.isOriginal && activeConfig.left && activeConfig.left.type !== 'none' && activeConfig.left.file);
                const isTransSb = Boolean(isLeftAct && activeConfig.transparentSidebar === true);
                const isTransHdr = Boolean(isLeftAct && activeConfig.transparentHeader === true);
                const leftMaskAlpha = isLeftAct ? getDarkMaskAlpha(getSlotDarkMaskOpacity(activeConfig, 'left')) : 0;
                const isBotAct = Boolean(activeConfig && !activeConfig.isOriginal && activeConfig.bottom && activeConfig.bottom.type !== 'none' && activeConfig.bottom.file);
                const botMaskAlpha = (!activeConfig || activeConfig.isOriginal) ? 0 : getDarkMaskAlpha(getSlotDarkMaskOpacity(activeConfig, 'bottom'));
                const isSettingsAct = Boolean(activeConfig && !activeConfig.isOriginal && activeConfig.settings && activeConfig.settings.type !== 'none' && activeConfig.settings.file);
                const settingsMaskAlpha = (!activeConfig || activeConfig.isOriginal) ? 0 : getDarkMaskAlpha(getSlotDarkMaskOpacity(activeConfig, 'settings'));
                const liveSbAlpha = leftMaskAlpha > 0 ? Number((0.45 + leftMaskAlpha * 0.45).toFixed(2)) : 0.45;
                const liveHdrAlpha = leftMaskAlpha > 0 ? Number((0.45 + leftMaskAlpha * 0.45).toFixed(2)) : 0.45;
                const applyCode = `
                  (function() {
                    let titlebarFix = document.getElementById('antigravity-titlebar-fix');
                    if (titlebarFix) {
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
                        '.agy-shell > div.shrink-0 a,',
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
                        'aside[aria-label="Sidebar"] {',
                        '  position: relative !important;',
                        '  z-index: 40 !important;',
                        '  pointer-events: auto !important;',
                        '}',
                        'div[role="navigation"][aria-label="Sidebar"] button,',
                        'div[role="navigation"][aria-label="Sidebar"] a,',
                        'div[role="navigation"][aria-label="Sidebar"] [role="button"],',
                        'aside[aria-label="Sidebar"] button,',
                        'aside[aria-label="Sidebar"] a,',
                        'aside[aria-label="Sidebar"] [role="button"] {',
                        '  pointer-events: auto !important;',
                        '  -webkit-app-region: no-drag !important;',
                        '  cursor: pointer !important;',
                        '}'${!isTransSb ? `,
                        'div[role="navigation"][aria-label="Sidebar"], aside[aria-label="Sidebar"] {',
                        '  background: var(--color-sidebar, var(--sidebar, #111114)) !important;',
                        '  background-color: var(--color-sidebar, var(--sidebar, #111114)) !important;',
                        '  backdrop-filter: none !important;',
                        '  -webkit-backdrop-filter: none !important;',
                        '}'` : `,
                        'div[role="navigation"][aria-label="Sidebar"], aside[aria-label="Sidebar"] {',
                        '  background: rgba(17, 17, 20, ${liveSbAlpha}) !important;',
                        '  background-color: rgba(17, 17, 20, ${liveSbAlpha}) !important;',
                        '  backdrop-filter: blur(20px) saturate(180%) !important;',
                        '  -webkit-backdrop-filter: blur(20px) saturate(180%) !important;',
                        '  border-right: 1px solid rgba(255, 255, 255, 0.08) !important;',
                        '}'`}${!isTransHdr ? `,
                        '[data-testid="title-menu-bar"] {',
                        '  background: var(--color-shell, var(--shell, #111114)) !important;',
                        '  background-color: var(--color-shell, var(--shell, #111114)) !important;',
                        '  backdrop-filter: none !important;',
                        '  -webkit-backdrop-filter: none !important;',
                        '}'` : `,
                        '.agy-shell > div.shrink-0, div.shrink-0:has(> [data-testid="title-menu-bar"]), div.shrink-0:has([data-testid="title-menu-bar"]) {',
                        '  background: transparent !important;',
                        '  background-color: transparent !important;',
                        '}',
                        '[data-testid="title-menu-bar"] {',
                        '  background: rgba(17, 17, 20, ${liveHdrAlpha}) !important;',
                        '  background-color: rgba(17, 17, 20, ${liveHdrAlpha}) !important;',
                        '  backdrop-filter: blur(20px) saturate(180%) !important;',
                        '  -webkit-backdrop-filter: blur(20px) saturate(180%) !important;',
                        '  border-bottom: 1px solid rgba(255, 255, 255, 0.08) !important;',
                        '}'`}${leftMaskAlpha <= 0 ? `,
                        'div[data-testid="aux-pane-split"] > div.flex:first-child,',
                        'div[data-testid="aux-pane-split"] > div:not(:first-child):not(.bg-border),',
                        '.agy-sheet:not(:has([data-testid="aux-pane-split"])),',
                        'main[class*="bg-background"]:not(.agy-sheet *):not([data-testid="aux-pane-split"] *),',
                        '[aria-label="Auxiliary Pane"]:not(.agy-sheet *):not([data-testid="aux-pane-split"] *):not([aria-label="Auxiliary Pane"] *),',
                        '[aria-label="辅助面板"]:not(.agy-sheet *):not([data-testid="aux-pane-split"] *):not([aria-label="辅助面板"] *),',
                        'aside[aria-label*="drawer"]:not(.agy-sheet *):not([data-testid="aux-pane-split"] *),',
                        '[data-panel="auxiliary"]:not(.agy-sheet *):not([data-testid="aux-pane-split"] *) {',
                        '  background-color: transparent !important;',
                        '  background: transparent !important;',
                        '}'` : ''}${botMaskAlpha <= 0 ? `,
                        '.surface-composer-card:has(> .antigravity-slot-video[data-slot="bottom"])::after,',
                        'div.bg-card:has(> .antigravity-slot-video[data-slot="bottom"])::after {',
                        '  content: none !important;',
                        '  display: none !important;',
                        '}'` : ''}${settingsMaskAlpha <= 0 ? `,
                        '[role="dialog"]:has(> .antigravity-slot-video[data-slot="settings"])::after,',
                        'div.settings-modal-container:has(> .antigravity-slot-video[data-slot="settings"])::after {',
                        '  content: none !important;',
                        '  display: none !important;',
                        '}'` : ''}
                      ].join('\\n');
                    }
                    let link = document.getElementById('antigravity-custom-theme-link');
                    if (link) {
                      link.disabled = true;
                      link.removeAttribute('rel');
                      link.removeAttribute('href');
                    }
                    let instantStyle = document.getElementById('antigravity-custom-theme-instant');
                    if (instantStyle) {
                      try { instantStyle.remove(); } catch(e) {}
                    }
                    if (document.body) {
                      const zeroStyle = document.getElementById('antigravity-zero-latency-style');
                      if (zeroStyle) {
                        try { zeroStyle.remove(); } catch(e) {}
                      }
                    }
                    let s = document.getElementById('antigravity-custom-theme');
                    if (!s) {
                      s = document.createElement('style');
                      s.id = 'antigravity-custom-theme';
                      document.head.appendChild(s);
                    }
                    s.textContent = ${JSON.stringify(activeCss)};

                    ${videoScript}

                    try {
                      window.postMessage({ type: 'antigravity-config-updated', config: ${JSON.stringify(activeConfig)} }, '*');
                    } catch(e) {}

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
                let contexts = [];
                let waitingCount = 0;
                let receivedCount = 0;

                ws.addEventListener('message', (evt) => {
                  try {
                    const msg = JSON.parse(evt.data);
                    if (msg.method === 'Runtime.executionContextCreated') {
                      contexts.push(msg.params.context);
                    }
                    if (msg.id === 1) {
                      setTimeout(() => {
                        const targetContexts = contexts.length > 0 ? contexts : [{ id: undefined }];
                        waitingCount = targetContexts.length + 1;
                        targetContexts.forEach((ctx, idx) => {
                          const params = { expression: applyCode };
                          if (ctx && ctx.id !== undefined) params.contextId = ctx.id;
                          ws.send(JSON.stringify({ id: 100 + idx, method: 'Runtime.evaluate', params }));
                        });
                        ws.send(JSON.stringify({ id: 999, method: 'Runtime.evaluate', params: { expression: applyCode } }));
                      }, 40);
                    } else if (msg.id >= 100) {
                      receivedCount++;
                      if (receivedCount >= waitingCount) {
                        onDone();
                      }
                    }
                  } catch(e) {
                    onDone();
                  }
                });
                ws.send(JSON.stringify({ id: 1, method: 'Runtime.enable' }));
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


async function batchApplyDraft(draftConfig, fontColor) {
  if (!draftConfig || typeof draftConfig !== 'object') {
    throw new Error('draftConfig is required');
  }

  const slotsConfig = loadSlotsConfig();
  const prevLeftMask = getSlotDarkMaskOpacity(slotsConfig, 'left');
  let hasChanges = false;
  const now = Date.now();

  for (const slotKey of ['left', 'bottom', 'settings']) {
    const slotData = draftConfig[slotKey];
    if (!slotData) continue;
    const slotMeta = SLOTS_META[slotKey];
    const hasStaged = Boolean(slotData.stagedFilePath && fs.existsSync(slotData.stagedFilePath));

    // Case 1: Slot restored to vanilla / none
    if (!hasStaged && (slotData.type === 'none' || slotData.isOriginal)) {
      if (!slotsConfig[slotKey] || slotsConfig[slotKey].type !== 'none' || !slotsConfig[slotKey].isOriginal || slotsConfig[slotKey].darkMaskOpacity !== 0) {
        slotsConfig[slotKey] = {
          key: slotKey,
          file: '',
          type: 'none',
          position: 'center center',
          desc: slotMeta.desc,
          isOriginal: true,
          darkMaskOpacity: 0,
          version: now
        };
        delete slotsConfig[slotKey].poster;
        delete slotsConfig[slotKey].unsupportedCodec;
        if (slotKey === 'left') {
          slotsConfig.darkMaskOpacity = 0;
        }
        hasChanges = true;
      }
      continue;
    }

    // Case 2: New staged file for this slot
    if (hasStaged) {
      delete slotData.isOriginal;
      const srcPath = slotData.stagedFilePath;
      const ext = path.extname(srcPath).toLowerCase();
      const isVideo = VIDEO_EXTS.has(ext);
      const isImage = IMAGE_EXTS.has(ext);

      if (isVideo || isImage) {
        const prefix = slotKey === 'bottom' ? 'input' : slotKey;
        const targetFileName = `${prefix}_wallpaper${ext}`;
        const targetPath = path.join(wallpapersDir, targetFileName);

        // Clean up stale alternate extensions for this slot in wallpapersDir
        ['.mp4', '.webm', '.mov', '.jpg', '.jpeg', '.png', '.gif', '.webp'].forEach(oldExt => {
          if (oldExt !== ext) {
            const oldFile = path.join(wallpapersDir, `${prefix}_wallpaper${oldExt}`);
            try { if (fs.existsSync(oldFile)) fs.unlinkSync(oldFile); } catch (e) {}
          }
        });

        // Copy file to targetPath
        if (path.resolve(srcPath) !== path.resolve(targetPath)) {
          fs.copyFileSync(srcPath, targetPath);
        }

        let posterFileName = null;
        let isSupportedCodec = true;

        if (isVideo) {
          const codecInfo = detectVideoCodec(srcPath);
          if (codecInfo && !codecInfo.isElectronSupported) {
            isSupportedCodec = false;
          }

          const defaultPosterTarget = path.join(wallpapersDir, `${prefix}_poster.jpg`);
          ['.png', '.gif', '.webp'].forEach(pExt => {
            const oldPoster = path.join(wallpapersDir, `${prefix}_poster${pExt}`);
            try { if (fs.existsSync(oldPoster)) fs.unlinkSync(oldPoster); } catch (e) {}
          });

          let companionPoster = findCompanionPoster(srcPath);
          let needsExtract = !companionPoster || !fs.existsSync(companionPoster);
          if (needsExtract) {
            const extracted = extractPosterFromVideo(srcPath, defaultPosterTarget);
            if (extracted) {
              companionPoster = defaultPosterTarget;
            }
          }

          if (companionPoster && fs.existsSync(companionPoster)) {
            try {
              let pExt = path.extname(companionPoster).toLowerCase();
              if (pExt === '.gif') pExt = '.jpg';
              posterFileName = `${prefix}_poster${pExt}`;
              const posterTargetPath = path.join(wallpapersDir, posterFileName);
              if (path.resolve(companionPoster) !== path.resolve(posterTargetPath)) {
                fs.copyFileSync(companionPoster, posterTargetPath);
              }
              const staticFallbackTarget = path.join(wallpapersDir, `${prefix}_wallpaper${pExt}`);
              try { fs.copyFileSync(posterTargetPath, staticFallbackTarget); } catch (e) {}
            } catch (e) {}
          }

          ensureMp4Faststart(targetPath);
        }

        const prevPos = slotsConfig[slotKey]?.position || slotMeta.defaultPosition || 'center center';
        const finalPos = slotData.position ? parsePosition(slotData.position, prevPos).str : prevPos;
        const finalSlotMask = slotData.darkMaskOpacity !== undefined
          ? normalizeDarkMaskOpacity(slotData.darkMaskOpacity)
          : getSlotDarkMaskOpacity(slotsConfig, slotKey);

        slotsConfig[slotKey] = {
          key: slotKey,
          file: targetFileName,
          type: isVideo ? 'video' : 'image',
          version: now,
          position: finalPos,
          desc: slotMeta.desc,
          darkMaskOpacity: finalSlotMask
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

        hasChanges = true;
      }
    } else {
      // Case 3: Existing file/type/position/per-slot darkMaskOpacity updated or restored
      if (slotData.file) {
        const inferredType = (slotData.type && slotData.type !== 'none' && slotData.type !== 'vanilla')
          ? slotData.type
          : (/\.(mp4|webm|mov)$/i.test(slotData.file) ? 'video' : 'image');
        if (!slotsConfig[slotKey] || slotsConfig[slotKey].file !== slotData.file || slotsConfig[slotKey].type !== inferredType || slotsConfig[slotKey].isOriginal) {
          slotsConfig[slotKey] = {
            ...(slotsConfig[slotKey] || {}),
            key: slotKey,
            file: slotData.file,
            type: inferredType,
            version: now,
            position: slotsConfig[slotKey]?.position || SLOTS_META[slotKey].defaultPosition || 'center center',
            desc: SLOTS_META[slotKey].desc,
            darkMaskOpacity: getSlotDarkMaskOpacity(slotsConfig, slotKey)
          };
          if (slotData.poster) {
            slotsConfig[slotKey].poster = slotData.poster;
          }
          delete slotsConfig[slotKey].isOriginal;
          hasChanges = true;
        }
      }
      if (slotData.position) {
        const currentPos = slotsConfig[slotKey]?.position;
        const newPos = parsePosition(slotData.position, SLOTS_META[slotKey].defaultPosition).str;
        if (currentPos !== newPos) {
          if (!slotsConfig[slotKey]) {
            slotsConfig[slotKey] = {
              key: slotKey,
              file: SLOTS_META[slotKey].defaultFile,
              type: 'image',
              version: now,
              desc: SLOTS_META[slotKey].desc,
              darkMaskOpacity: 0
            };
          }
          slotsConfig[slotKey].position = newPos;
          slotsConfig[slotKey].version = now;
          hasChanges = true;
        }
      }
      if (slotData.darkMaskOpacity !== undefined) {
        const nextSlotMask = normalizeDarkMaskOpacity(slotData.darkMaskOpacity);
        if (!slotsConfig[slotKey]) {
          slotsConfig[slotKey] = {
            key: slotKey,
            file: SLOTS_META[slotKey].defaultFile,
            type: 'image',
            version: now,
            position: SLOTS_META[slotKey].defaultPosition || 'center center',
            desc: SLOTS_META[slotKey].desc,
            darkMaskOpacity: nextSlotMask
          };
          hasChanges = true;
        } else if (slotsConfig[slotKey].darkMaskOpacity !== nextSlotMask) {
          slotsConfig[slotKey].darkMaskOpacity = nextSlotMask;
          slotsConfig[slotKey].version = now;
          hasChanges = true;
        }
      }
    }
  }

  if (draftConfig.transparentSidebar !== undefined) {
    const nextSidebar = Boolean(draftConfig.transparentSidebar);
    if (slotsConfig.transparentSidebar !== nextSidebar) {
      slotsConfig.transparentSidebar = nextSidebar;
      hasChanges = true;
    }
  } else if (typeof slotsConfig.transparentSidebar !== 'boolean') {
    slotsConfig.transparentSidebar = false;
  }

  if (draftConfig.transparentHeader !== undefined) {
    const nextHeader = Boolean(draftConfig.transparentHeader);
    if (slotsConfig.transparentHeader !== nextHeader) {
      slotsConfig.transparentHeader = nextHeader;
      hasChanges = true;
    }
  } else if (typeof slotsConfig.transparentHeader !== 'boolean') {
    slotsConfig.transparentHeader = false;
  }

  const leftWasRestoredVanilla = Boolean(
    draftConfig.left &&
    !(draftConfig.left.stagedFilePath && fs.existsSync(draftConfig.left.stagedFilePath)) &&
    (draftConfig.left.type === 'none' || draftConfig.left.isOriginal)
  );

  if (leftWasRestoredVanilla) {
    slotsConfig.darkMaskOpacity = 0;
    if (slotsConfig.left) slotsConfig.left.darkMaskOpacity = 0;
  } else {
    const hasDraftSlotLeftMask = Boolean(draftConfig.left && draftConfig.left.darkMaskOpacity !== undefined);
    const hasDraftTopMask = draftConfig.darkMaskOpacity !== undefined;
    let finalLeftMask = prevLeftMask;
    if (hasDraftSlotLeftMask && hasDraftTopMask) {
      const dSlot = normalizeDarkMaskOpacity(draftConfig.left.darkMaskOpacity);
      const dTop = normalizeDarkMaskOpacity(draftConfig.darkMaskOpacity);
      if (dSlot === dTop) {
        finalLeftMask = dSlot;
      } else if (dSlot !== prevLeftMask) {
        finalLeftMask = dSlot;
      } else if (dTop !== prevLeftMask) {
        finalLeftMask = dTop;
      } else {
        finalLeftMask = dSlot;
      }
    } else if (hasDraftSlotLeftMask) {
      finalLeftMask = normalizeDarkMaskOpacity(draftConfig.left.darkMaskOpacity);
    } else if (hasDraftTopMask) {
      finalLeftMask = normalizeDarkMaskOpacity(draftConfig.darkMaskOpacity);
    }
    if (slotsConfig.darkMaskOpacity !== finalLeftMask) {
      slotsConfig.darkMaskOpacity = finalLeftMask;
      hasChanges = true;
    }
    if (slotsConfig.left && typeof slotsConfig.left === 'object' && slotsConfig.left.darkMaskOpacity !== finalLeftMask) {
      slotsConfig.left.darkMaskOpacity = finalLeftMask;
      hasChanges = true;
    }
  }

  slotsConfig.isOriginal = false;
  syncConfigDarkMaskOpacity(slotsConfig);
  saveSlotsConfig(slotsConfig);

  // Recompile CSS ONCE
  const css = generateMasterCss(slotsConfig);
  fs.writeFileSync(customCssPath, css, 'utf-8');
  try { fs.writeFileSync(path.join(wallpapersDir, 'custom_theme.css'), css, 'utf-8'); } catch (e) {}

  await ensureMediaServer(wallpapersDir, DEFAULT_PORT);

  // Trigger live hot reload EXACTLY ONCE
  await triggerLiveHotReload(css, slotsConfig);

  return slotsConfig;
}

async function swapWallpaper(slotInput, srcPath, customPosterPath) {
  const _normInput = normalizeSlotInput(slotInput);
  if (!_normInput) {
    console.error('❌ 请提供槽位名称: 左, 下, 设置');
    return false;
  }
  const slotKey = SLOT_ALIASES[normalizeSlotInput(slotInput)];
  if (!slotKey || !SLOTS_META[slotKey]) {
    console.error(`❌ 未知槽位: "${formatSlotDisplay(slotInput)}"。支持的槽位为: 左, 下, 设置`);
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

  console.log(`[1/4] 正在更新【${formatSlotDisplay(slotInput)} (${slotMeta.desc})】的壁纸素材...`);
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
    let companionPoster = customPosterPath;

    // For video wallpapers, always ensure a crystal-clear native 4K/2K frame 0 is extracted as poster
    let needsExtract = !companionPoster || !fs.existsSync(companionPoster);
    if (!needsExtract && companionPoster) {
      const ext = path.extname(companionPoster).toLowerCase();
      if (ext === '.gif') {
        needsExtract = true;
      } else {
        try {
          const st = fs.statSync(companionPoster);
          if (st.size < 150 * 1024) needsExtract = true;
        } catch (e) {}
      }
    }

    if (needsExtract) {
      console.log(`      正在从视频中提取超清原生 4K/2K 静态首帧作为保底...`);
      const extracted = extractPosterFromVideo(srcPath, defaultPosterTarget);
      if (extracted) {
        companionPoster = defaultPosterTarget;
      } else {
        companionPoster = findCompanionPoster(srcPath);
      }
    }

    if (companionPoster && fs.existsSync(companionPoster)) {
      try {
        let pExt = path.extname(companionPoster).toLowerCase();
        if (pExt === '.gif') pExt = '.jpg';
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
  const prevDarkMask = getSlotDarkMaskOpacity(slotsConfig, slotKey);
  slotsConfig[slotKey] = {
    key: slotKey,
    file: targetFileName,
    type: isVideo ? 'video' : 'image',
    version: Date.now(),
    position: prevPosition,
    desc: slotMeta.desc,
    darkMaskOpacity: prevDarkMask
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
  slotsConfig.isOriginal = false;
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

  console.log(`✨ 【${formatSlotDisplay(slotInput)}】壁纸更换完成！已实时生效。`);
  return reloadPromise;
}

/**
 * 将指定单个槽位恢复为官方原版纯净模样 (清除该区域壁纸、保留官方原生背景与质感)
 * @param {string} slotInput - 槽位名称或别名 (左, 中, 右, 下, 设置 等)
 * @returns {Promise<boolean>}
 */
async function restoreSlotVanilla(slotInput) {
  const _normInput = normalizeSlotInput(slotInput);
  if (!_normInput) {
    console.error('❌ 请提供槽位名称: 左, 下, 设置');
    return false;
  }
  const slotKey = SLOT_ALIASES[normalizeSlotInput(slotInput)];
  if (!slotKey || !SLOTS_META[slotKey]) {
    console.error(`❌ 未知槽位: "${formatSlotDisplay(slotInput)}"。支持的槽位为: 左, 下, 设置`);
    return false;
  }

  const slotMeta = SLOTS_META[slotKey];
  console.log(`[1/3] 正在将槽位【${formatSlotDisplay(slotInput)} (${slotMeta.desc})】恢复为官方原版纯净模样...`);

  const slotsConfig = loadSlotsConfig();
  slotsConfig[slotKey] = {
    key: slotKey,
    file: '',
    type: 'none',
    position: 'center center',
    desc: slotMeta.desc,
    isOriginal: true,
    darkMaskOpacity: 0,
    version: Date.now()
  };
  delete slotsConfig[slotKey].poster;
  delete slotsConfig[slotKey].unsupportedCodec;
  if (slotKey === 'left') {
    slotsConfig.darkMaskOpacity = 0;
  }

  saveSlotsConfig(slotsConfig);
  console.log(`✓ slots_config.json 已更新为原版配置`);

  console.log(`[2/3] 重新编译并输出 custom_theme.css...`);
  const css = generateMasterCss(slotsConfig);
  fs.writeFileSync(customCssPath, css, 'utf-8');
  try { fs.writeFileSync(path.join(wallpapersDir, 'custom_theme.css'), css, 'utf-8'); } catch(e) {}
  console.log(`✓ custom_theme.css 已更新 (${(css.length / 1024 / 1024).toFixed(2)} MB)`);

  console.log(`[3/3] 触发界面热重载与实时生效...`);
  const reloadPromise = await triggerLiveHotReload(css, slotsConfig);

  console.log(`✨ 【${formatSlotDisplay(slotInput)}】已成功恢复为官方原版纯净模样！已实时生效。`);
  return reloadPromise;
}

async function revertToBaseline() {
  console.log(`正在从黄金基线【初版】恢复...`);
  let sourceWallpapersDir = null;
  let baselineCssPath = null;
  if (fs.existsSync(baselineDir)) {
    baselineCssPath = path.join(baselineDir, 'custom_theme.css');
    const baselineWallpapers = path.join(baselineDir, 'wallpapers');
    if (fs.existsSync(baselineWallpapers)) {
      sourceWallpapersDir = baselineWallpapers;
    }
  }

  if (!sourceWallpapersDir) {
    const repoWallpapersDir = path.join(__dirname, '..', 'wallpapers');
    if (fs.existsSync(repoWallpapersDir)) {
      sourceWallpapersDir = repoWallpapersDir;
      console.log(`ℹ️ 初版备份不存在，自动使用仓库自带壁纸目录作为基线: ${repoWallpapersDir}`);
    }
  }

  if (!sourceWallpapersDir) {
    console.error(`❌ 未找到初版备份目录: ${baselineDir} 且仓库壁纸目录不可用`);
    return false;
  }

  fs.readdirSync(sourceWallpapersDir).forEach(f => {
    fs.copyFileSync(path.join(sourceWallpapersDir, f), path.join(wallpapersDir, f));
  });

  // 重置槽位为初始全静态图片
  const baselineConfig = {};
  for (const [key, meta] of Object.entries(SLOTS_META)) {
    baselineConfig[key] = {
      key,
      file: meta.defaultFile,
      type: 'image',
      version: Date.now(),
      position: meta.defaultPosition || 'center center',
      desc: meta.desc,
      darkMaskOpacity: 0
    };
  }
  baselineConfig.isOriginal = false;
  baselineConfig.transparentSidebar = false;
  baselineConfig.transparentHeader = false;
  baselineConfig.darkMaskOpacity = 0;
  saveSlotsConfig(baselineConfig);

  console.log(`✓ 初版文件已全部还原，正在重新编译并输出黄金基线样式...`);
  const css = generateMasterCss(baselineConfig);
  fs.writeFileSync(customCssPath, css, 'utf-8');
  try { fs.writeFileSync(path.join(wallpapersDir, 'custom_theme.css'), css, 'utf-8'); } catch(e) {}

  // Also update baselineCssPath so that baseline backup does not contain stale buggy selectors
  if (baselineCssPath && fs.existsSync(baselineCssPath)) {
    fs.writeFileSync(baselineCssPath, css, 'utf-8');
  }

  console.log(`✓ 黄金基线样式表已生成 (${(css.length / 1024 / 1024).toFixed(2)} MB)，正在热重载...`);
  const reloadPromise = await triggerLiveHotReload(css, baselineConfig);
  console.log(`✨ 成功还原为【初版】黄金基线！`);
  return reloadPromise;
}

async function setPosition(slotInput, posX, posY) {
  const _normInput = normalizeSlotInput(slotInput);
  if (!_normInput) {
    console.error('❌ 请提供槽位名称: 左, 下, 设置');
    return false;
  }
  const slotKey = SLOT_ALIASES[normalizeSlotInput(slotInput)];
  if (!slotKey || !SLOTS_META[slotKey]) {
    console.error(`❌ 未知槽位: "${formatSlotDisplay(slotInput)}"。支持的槽位为: 左, 下, 设置`);
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

  console.log(`[1/3] 已设置槽位【${formatSlotDisplay(slotInput)} (${SLOTS_META[slotKey].desc})】壁纸显示位置: ${posStr}`);

  console.log(`[2/3] 重新编译并输出 custom_theme.css...`);
  const css = generateMasterCss(slotsConfig);
  fs.writeFileSync(customCssPath, css, 'utf-8');
  try { fs.writeFileSync(path.join(wallpapersDir, 'custom_theme.css'), css, 'utf-8'); } catch(e) {}
  console.log(`✓ custom_theme.css 已更新 (${(css.length / 1024 / 1024).toFixed(2)} MB)`);

  console.log(`[3/3] 触发界面热重载与实时生效...`);
  const reloadPromise = await triggerLiveHotReload(css, slotsConfig);
  console.log(`✨ 【${formatSlotDisplay(slotInput)}】壁纸位置已调整为 ${posStr}！已实时生效。`);
  return { ok: true, slot: slotKey, position: posStr };
}

async function adjustPosition(slotInput, direction, delta = 5) {
  const _normInput = normalizeSlotInput(slotInput);
  if (!_normInput) {
    console.error('❌ 请提供槽位名称: 左, 下, 设置');
    return false;
  }
  const slotKey = SLOT_ALIASES[normalizeSlotInput(slotInput)];
  if (!slotKey || !SLOTS_META[slotKey]) {
    console.error(`❌ 未知槽位: "${formatSlotDisplay(slotInput)}"。支持的槽位为: 左, 下, 设置`);
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
  const norm = normalizeSlotInput(slotInput) || 'all';
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
    console.error(`❌ 未知槽位: "${formatSlotDisplay(slotInput)}"。支持的槽位为: 左, 下, 设置, 或 all (全部)`);
    return false;
  }

  const defaultPos = SLOTS_META[slotKey].defaultPosition || 'center center';
  return setPosition(slotInput, defaultPos);
}

/**
 * 将指定槽位的壁纸恢复为初始黄金基线默认素材，并重置其对齐位置。
 * 若 slotInput 为 'all'，则执行 revertToBaseline() 恢复全套基线。
 */
async function resetSlotWallpaper(slotInput) {
  const norm = normalizeSlotInput(slotInput) || 'all';
  if (norm === 'all' || norm === '全部' || norm === 'baseline' || norm === '基线' || norm === '*') {
    const ok = await revertToBaseline();
    return { ok: Boolean(ok), slot: 'all' };
  }

  const slotKey = SLOT_ALIASES[norm];
  if (!slotKey || !SLOTS_META[slotKey]) {
    console.error(`❌ 未知槽位: "${formatSlotDisplay(slotInput)}"。支持的槽位为: 左, 下, 设置, 或 all (全部)`);
    return false;
  }

  const meta = SLOTS_META[slotKey];
  let sourceDir = null;
  const repoWallpapers = path.join(__dirname, '..', 'wallpapers');
  const baselineWallpapers = path.join(baselineDir, 'wallpapers');

  if (fs.existsSync(baselineWallpapers) && fs.existsSync(path.join(baselineWallpapers, meta.defaultFile))) {
    sourceDir = baselineWallpapers;
  } else if (fs.existsSync(repoWallpapers) && fs.existsSync(path.join(repoWallpapers, meta.defaultFile))) {
    sourceDir = repoWallpapers;
  }

  if (!sourceDir) {
    console.error(`❌ 无法找到槽位 [${slotKey}] 的默认基线素材文件: ${meta.defaultFile}`);
    return false;
  }

  const defaultFilePath = path.join(sourceDir, meta.defaultFile);
  console.log(`[ThemeEngine] 正在将槽位 [${slotKey}] 重置为初始默认素材: ${meta.defaultFile}`);
  const ok = await swapWallpaper(slotKey, defaultFilePath);
  if (ok) {
    await setPosition(slotKey, meta.defaultPosition || 'center center');
  }
  return { ok: Boolean(ok), slot: slotKey, file: meta.defaultFile };
}

function listSlotsStatus() {
  const config = loadSlotsConfig();
  if (config && config.isOriginal) {
    console.log('=======================================================');
    console.log('   🛡️ Antigravity 壁纸槽位状态一览');
    console.log('=======================================================');
    console.log('');
    console.log('   当前模式: 🛡️ [官方原版纯净模式 (Official Vanilla)]');
    console.log('   运行状态: 零自定义壁纸、零视频硬件解码、零毛玻璃，极致原生流畅');
    console.log('');
    console.log('💡 随时一键切回个性化壁纸:');
    console.log('   • 恢复原版前的个性化配置: node core/theme_engine.js --apply-preset "恢复原版前的个性化配置"');
    console.log('   • 或应用已有预设: node core/theme_engine.js --apply-preset 1');
    console.log('   • 或运行批处理菜单: dev\\bin\\preset_manager.bat');
    console.log('=======================================================');
    return;
  }
  console.log('=======================================================');
  console.log('   🌸 Antigravity 壁纸槽位状态一览');
  console.log('=======================================================');
  console.log('');
  for (const [key, meta] of Object.entries(SLOTS_META)) {
    const item = config[key];
    if (!item || item.type === 'none' || !item.file) {
      console.log(`槽位 [${key.padEnd(8)}] (${meta.desc}):`);
      console.log(`   类型: 🛡️ [官方原版默认]`);
      console.log(`   🎯 位置: ${getSlotPosition(config, key)}`);
      console.log('');
      continue;
    }
    const isVid = item.type === 'video';
    const typeLabel = isVid ? '🎬 [动态视频]' : '🖼️ [静态壁纸]';
    const filePath = path.join(wallpapersDir, item.file);
    const exists = fs.existsSync(filePath);
    const size = exists ? (fs.statSync(filePath).size / 1024 / 1024).toFixed(2) + ' MB' : '未找到文件';
    const pos = getSlotPosition(config, key);
    console.log(`槽位 [${key.padEnd(8)}] (${meta.desc}):`);
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

  const slotKey = SLOT_ALIASES[normalizeSlotInput(slotInput)];
  if (!slotKey || !SLOTS_META[slotKey]) {
    console.error(`❌ 未知槽位: "${formatSlotDisplay(slotInput)}"。支持的槽位为: 左, 下, 设置 (left, bottom, settings)`);
    return false;
  }

  console.log(`🎮 从 Steam Wallpaper Engine 选定壁纸: 【${wallpaper.title}】 (ID: ${wallpaper.id})`);
  console.log(`   素材类型: ${wallpaper.mediaType === 'video' ? '🎬 动态视频' : '🖼️ 静态图像'} (${wallpaper.file})`);
  console.log(`   原始类型: ${wallpaper.rawType} | 大小: ${wallpaper.sizeMb} MB`);
  console.log(`   素材路径: ${wallpaper.mediaPath}`);

  return swapWallpaper(slotInput, wallpaper.mediaPath, wallpaper.previewPath);
}

function listWallpaperEngineWallpapers(optionsOrSearch = '', limit = 50, refresh = false) {
  let search = '';
  let lim = limit;
  let ref = refresh;
  let sortBy = 'default';
  if (typeof optionsOrSearch === 'object' && optionsOrSearch !== null) {
    search = optionsOrSearch.search || '';
    lim = optionsOrSearch.limit || 50;
    ref = Boolean(optionsOrSearch.refresh);
    sortBy = optionsOrSearch.sort || optionsOrSearch.sortBy || 'default';
  } else {
    search = optionsOrSearch || '';
  }
  const list = scanWorkshopWallpapers({ search, refresh: ref, sortBy });
  console.log(formatWallpaperTable(list, lim));
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
  if (options && options.draftConfig && typeof options.draftConfig === 'object') {
    const dc = options.draftConfig;
    if (dc.transparentSidebar !== undefined) archivedConfig.transparentSidebar = Boolean(dc.transparentSidebar);
    if (dc.transparentHeader !== undefined) archivedConfig.transparentHeader = Boolean(dc.transparentHeader);
    if (dc.darkMaskOpacity !== undefined) archivedConfig.darkMaskOpacity = normalizeDarkMaskOpacity(dc.darkMaskOpacity);
    for (const sKey of ['left', 'bottom', 'settings']) {
      if (dc[sKey] && typeof dc[sKey] === 'object' && archivedConfig[sKey]) {
        if (dc[sKey].position) archivedConfig[sKey].position = dc[sKey].position;
        if (dc[sKey].darkMaskOpacity !== undefined) {
          archivedConfig[sKey].darkMaskOpacity = normalizeDarkMaskOpacity(dc[sKey].darkMaskOpacity);
          if (sKey === 'left') {
            archivedConfig.darkMaskOpacity = archivedConfig[sKey].darkMaskOpacity;
          }
        }
      }
    }
  }

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
    if (slot.type === 'video') {
      const prefix = key === 'bottom' ? 'input' : key;
      if (slot.poster && slot.poster.toLowerCase().endsWith('.gif')) {
        const jpgCandidate = `${prefix}_poster.jpg`;
        if (fs.existsSync(path.join(wallpapersDir, jpgCandidate))) {
          slot.poster = jpgCandidate;
        } else {
          slot.poster = null;
        }
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

  delete archivedConfig.fontColor;
  archivedConfig.transparentSidebar = Boolean(archivedConfig.transparentSidebar);
  archivedConfig.transparentHeader = Boolean(archivedConfig.transparentHeader);
  syncConfigDarkMaskOpacity(archivedConfig);
  fs.writeFileSync(path.join(targetDir, 'preset.json'), JSON.stringify(presetMeta, null, 2), 'utf8');
  fs.writeFileSync(path.join(targetDir, 'slots_config.json'), JSON.stringify(archivedConfig, null, 2), 'utf8');

  console.log(`✓ 预设【${cleanName}】已安全归档并保存成功！`);
  console.log(`   📁 存放目录: ${targetDir}`);
  console.log(`   📦 归档素材: ${archivedManifest.length} 个文件 (共 ${presetMeta.totalSizeFormatted})`);
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
      '   • 或运行: dev\\bin\\preset_manager.bat / dev\\bin\\swap_wallpaper.bat 进入交互菜单',
      '================================================================================'
    ].join('\n');
  }

  const lines = [
    '========================================================================================================================',
    `  📦 Antigravity 已保存壁纸预设列表 (共 ${presets.length} 个预设)`,
    '========================================================================================================================',
    '序号  预设名称             保存时间             素材大小   各槽位配置摘要',
    '------------------------------------------------------------------------------------------------------------------------'
  ];

  presets.forEach((p, idx) => {
    const num = padEndVisual(`[${idx + 1}]`, 6);
    const name = padEndVisual(truncateVisual(p.name, 18), 20);
    const time = padEndVisual(p.createdAtFormatted || '未知时间', 21);
    const size = padEndVisual(p.totalSizeFormatted || (p.totalSize ? (p.totalSize / 1024 / 1024).toFixed(1) + ' MB' : '-'), 11);

    const slotSummaries = [];
    for (const [key, slot] of Object.entries(p.slotsConfig || {})) {
      if (key === 'fontColor' || !slot || typeof slot !== 'object') continue;
      const typeStr = slot.type === 'video' ? '视频' : '图';
      const posStr = slot.position ? `, ${slot.position}` : '';
      slotSummaries.push(`${key}(${typeStr}${posStr})`);
    }
    const summaryStr = slotSummaries.join(', ');

    lines.push(`${num} ${name} ${time} ${size} ${summaryStr}`);
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
      if (slot.type === 'video') {
        const prefix = key === 'bottom' ? 'input' : key;
        if (slot.poster && slot.poster.toLowerCase().endsWith('.gif')) {
          slot.poster = null;
        }
        const jpgCandidate = `${prefix}_poster.jpg`;
        if (fs.existsSync(path.join(wallpapersDir, jpgCandidate))) {
          slot.poster = jpgCandidate;
        } else if (fs.existsSync(path.join(presetWallpapersDir, jpgCandidate))) {
          slot.poster = jpgCandidate;
        } else {
          const vAbs = path.join(wallpapersDir, slot.file);
          if (fs.existsSync(vAbs)) {
            const ok = extractPosterFromVideo(vAbs, path.join(wallpapersDir, jpgCandidate));
            if (ok) slot.poster = jpgCandidate;
          }
        }
      }
    }
  }
  delete targetConfig.fontColor;
  targetConfig.transparentSidebar = Boolean(targetConfig.transparentSidebar);
  targetConfig.transparentHeader = Boolean(targetConfig.transparentHeader);
  syncConfigDarkMaskOpacity(targetConfig);
  targetConfig.isOriginal = false;
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
 * Restores Antigravity to official vanilla state:
 * 1. Automatically snapshots active custom wallpaper/font configuration to "恢复原版前的个性化配置" preset
 * 2. Creates slots_config.pre_vanilla_backup.json safety backup
 * 3. Writes vanilla slots_config.json (isOriginal: true)
 * 4. Generates minimal vanilla custom_theme.css (hiding body::before and video players)
 * 5. Triggers 0.3s seamless hot reload via CDP 8314 (pausing & removing all video DOM elements)
 */
async function restoreOriginal() {
  console.log('=======================================================');
  console.log('   🛡️ 正在执行：一键恢复 Antigravity 官方原版纯净模式');
  console.log('=======================================================');

  const currentConfig = loadSlotsConfig();

  // 1. 自动安全快照备份（若当前非原版模式且存在配置）
  if (!currentConfig.isOriginal) {
    console.log('[1/4] 正在为当前个性化壁纸与字体配置创建安全快照预设...');
    const snapshotName = '恢复原版前的个性化配置';
    const snapshotDesc = `在恢复官方原版前由系统自动创建的安全快照 (${new Date().toLocaleString()})`;
    try {
      savePreset(snapshotName, snapshotDesc);
      console.log(`✓ 已自动归档至独立预设: 【${snapshotName}】`);
    } catch (e) {
      console.warn(`⚠️ 自动快照保存出现警告: ${e.message}`);
    }
    try {
      const backupPath = path.join(antigravityDir, 'slots_config.pre_vanilla_backup.json');
      fs.writeFileSync(backupPath, JSON.stringify(currentConfig, null, 2), 'utf8');
    } catch (e) {}
  } else {
    console.log('[1/4] 当前已处于官方原版模式，跳过重复快照。');
  }

  // 2. 构建纯净原版配置
  console.log('[2/4] 生成官方原版配置并重置 slots_config.json...');
  const vanillaConfig = {
    isOriginal: true,
    transparentSidebar: false,
    transparentHeader: false,
    darkMaskOpacity: 0,
    version: Date.now(),
    left: { key: 'left', file: '', type: 'none', version: Date.now(), desc: '官方原版默认', position: 'center center', darkMaskOpacity: 0 },
    bottom: { key: 'bottom', file: '', type: 'none', version: Date.now(), desc: '官方原版默认', position: 'center center', darkMaskOpacity: 0 },
    settings: { key: 'settings', file: '', type: 'none', version: Date.now(), desc: '官方原版默认', position: 'center center', darkMaskOpacity: 0 }
  };
  saveSlotsConfig(vanillaConfig);
  console.log('✓ slots_config.json 已重置为官方原版');

  // 3. 输出极简原版样式
  console.log('[3/4] 编译极简纯净样式表 (移除所有透明毛玻璃与壁纸覆盖)...');
  const css = generateMasterCss(vanillaConfig);
  fs.writeFileSync(customCssPath, css, 'utf-8');
  try { fs.writeFileSync(path.join(wallpapersDir, 'custom_theme.css'), css, 'utf-8'); } catch (e) {}
  console.log(`✓ custom_theme.css 已重置为官方纯净版 (${(css.length / 1024).toFixed(2)} KB)`);

  // 4. 触发 CDP 0.3s 热重载，卸载视频并重置样式
  console.log('[4/4] 触发界面 0.3 秒极速热重载与视频播放器彻底卸载 (CDP 8314)...');
  const reloadPromise = await triggerLiveHotReload(css, vanillaConfig);

  console.log('');
  console.log('=======================================================');
  console.log('✨ 已成功恢复为【Google Antigravity 官方原版纯净模式】！');
  console.log('=======================================================');
  console.log('   • 视频硬件解码器已彻底卸载，CPU/GPU 零无效能耗');
  console.log('   • 自定义透明度与毛玻璃滤镜已移除，界面回归官方原生');
  console.log('   • 原有个性化壁纸与位置已安全保存至预设【恢复原版前的个性化配置】');
  console.log('');
  console.log('💡 随时一键切回壁纸配置:');
  console.log('   • 命令行: node core/theme_engine.js --apply-preset "恢复原版前的个性化配置"');
  console.log('   • 或运行: dev\\bin\\preset_manager.bat / dev\\bin\\swap_wallpaper.bat');
  console.log('=======================================================');
  console.log('');
  return reloadPromise;
}

/**
 * 彻底卸载美化并物理还原官方 app.asar 核心与配置文件
 */
async function uninstallCompletely() {
  console.log('=======================================================');
  console.log('   🗑️ 正在执行：完全卸载美化并物理还原官方核心');
  console.log('=======================================================');

  console.log('[1/4] 正在安全解除 Antigravity 进程与文件占用...');
  const allowKill = process.env.ALLOW_ANTIGRAVITY_KILL === '1' || process.argv.includes('--force-kill');
  if (allowKill) {
    try {
      const { execSync } = require('child_process');
      execSync('taskkill /f /im "Antigravity.exe"', { stdio: 'ignore' });
      const waitMs = (ms) => {
        const start = Date.now();
        while (Date.now() - start < ms) {}
      };
      waitMs(1200);
    } catch (e) {}
  } else {
    console.log('ℹ️ 保护模式生效：跳过自动关闭 Antigravity 进程以保持会话活跃 (如需强制终止请传 --force-kill 或设置 ALLOW_ANTIGRAVITY_KILL=1)');
  }

  const localAppData = process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local');
  const defaultResDir = path.join(localAppData, 'Programs', 'antigravity', 'resources');
  const resDir = process.env.ANTIGRAVITY_RESOURCES || defaultResDir;
  const asarPath = path.join(resDir, 'app.asar');
  const asarOrigBak = path.join(resDir, 'app.asar.orig.bak');
  const patchedAsarPath = path.join(resDir, 'app.asar.patched');
  const appDir = path.join(resDir, 'app');
  const appUpdateYml = path.join(resDir, 'app-update.yml');
  const appUpdateYmlBak = path.join(resDir, 'app-update.yml.bak');

  console.log('[2/4] 正在物理还原官方原版 app.asar...');
  if (fs.existsSync(asarOrigBak)) {
    try {
      fs.copyFileSync(asarOrigBak, asarPath);
      console.log(`✓ 成功将官方原版核心 (${(fs.statSync(asarPath).size / 1024 / 1024).toFixed(2)} MB) 物理还原至: ${asarPath}`);
    } catch (err) {
      if (allowKill) {
        console.error(`❌ 还原 app.asar 失败: ${err.message}`);
      } else {
        console.warn(`⚠️ 还原 app.asar 提示: ${err.message} (当前客户端正在运行占用，退出后可手动将 ${asarOrigBak} 覆盖至 ${asarPath})`);
      }
    }
  } else {
    console.log(`ℹ️ 未找到物理备份文件: ${asarOrigBak}`);
  }

  console.log('[3/4] 正在还原官方更新配置与清理补丁临时文件...');
  if (fs.existsSync(appUpdateYmlBak)) {
    try {
      fs.copyFileSync(appUpdateYmlBak, appUpdateYml);
      fs.rmSync(appUpdateYmlBak, { force: true });
      console.log(`✓ 成功还原官方 app-update.yml`);
    } catch (e) {
      console.warn(`⚠️ 还原 app-update.yml 提示: ${e.message}`);
    }
  }

  if (fs.existsSync(patchedAsarPath)) {
    try {
      fs.rmSync(patchedAsarPath, { force: true });
      console.log(`✓ 已清理补丁镜像 app.asar.patched`);
    } catch (e) {}
  }

  if (fs.existsSync(appDir)) {
    try {
      fs.rmSync(appDir, { recursive: true, force: true });
      console.log(`✓ 已清理解包源码目录 app`);
    } catch (e) {}
  }

  console.log('[4/4] 正在重置主题样式与配置为官方默认...');
  try {
    const vanillaConfig = {
      isOriginal: true,
      transparentSidebar: false,
      transparentHeader: false,
      darkMaskOpacity: 0,
      version: Date.now(),
      left: { key: 'left', file: '', type: 'none', version: Date.now(), desc: '官方原版默认', position: 'center center', darkMaskOpacity: 0 },
      bottom: { key: 'bottom', file: '', type: 'none', version: Date.now(), desc: '官方原版默认', position: 'center center', darkMaskOpacity: 0 },
      settings: { key: 'settings', file: '', type: 'none', version: Date.now(), desc: '官方原版默认', position: 'center center', darkMaskOpacity: 0 }
    };
    saveSlotsConfig(vanillaConfig);
    fs.writeFileSync(customCssPath, '/* Vanilla Mode - No Custom CSS */\n', 'utf8');
    try { fs.writeFileSync(path.join(wallpapersDir, 'custom_theme.css'), '/* Vanilla Mode - No Custom CSS */\n', 'utf8'); } catch(e) {}
    console.log(`✓ 主题配置文件与样式已重置为官方原版`);
  } catch (e) {}

  console.log('');
  console.log('=======================================================');
  console.log('✨ 完全卸载成功！Antigravity 已恢复官方出厂原生物理状态。');
  console.log('=======================================================');
  return true;
}

/**
 * Prints comprehensive help message for theme engine CLI.
 */
function printHelp() {
  console.log(`
================================================================================
  🚀 Antigravity Theme Engine —— 壁纸、位置微调与预设管理引擎
================================================================================

【完全卸载与物理还原 (Complete Uninstall)】:
  node core/theme_engine.js --uninstall-completely
      彻底卸载美化、物理还原官方原版 app.asar 与官方更新配置，恢复出厂原生状态

【恢复官方原版纯净模式 (Restore Vanilla)】:
  node core/theme_engine.js --restore-original
      一键恢复 Antigravity 官方原版 (纯净无壁纸、无视频硬解、零能耗，自动快照当前配置)

【壁纸预设管理 (Wallpaper Presets)】:
  node core/theme_engine.js --save-preset <预设名称> [描述]
      保存当前壁纸全套配置(包括视频/图片素材及槽位坐标)为独立预设
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
      更换指定槽位壁纸 (槽位: 左/下/设置)
  node core/theme_engine.js --swap-we <壁纸序号/创意工坊ID> <槽位>
      从 Steam Wallpaper Engine 创意工坊选择壁纸应用至指定槽位
  node core/theme_engine.js --list-we [搜索词]
      列出已安装的 Steam Wallpaper Engine 创意工坊壁纸

【位置微调与状态 (Position & Status)】:
  node core/theme_engine.js --set-pos <槽位> <X坐标> [Y坐标]
  node core/theme_engine.js --adj-pos <槽位> <方向(up/down/left/right)> [步长%]
  node core/theme_engine.js --reset-pos [槽位]
  node core/theme_engine.js --status
================================================================================
`);
}

if (require.main === module) {
  const args = process.argv.slice(2);
  if (args[0] === '--help' || args[0] === '-h' || args[0] === 'help') {
    printHelp();
  } else if (
    args[0] === '--uninstall-completely' || args[0] === '--uninstall' || args[0] === 'uninstall' ||
    args[0] === '--completely-uninstall'
  ) {
    uninstallCompletely().then(ok => {
      if (!ok) process.exit(1);
    }).catch(err => {
      console.error(err);
      process.exit(1);
    });
  } else if (
    args[0] === '--restore-original' || args[0] === '--original' || args[0] === '--vanilla' ||
    args[0] === '--restore-vanilla' || args[0] === 'restore-original' || args[0] === 'original' ||
    args[0] === 'vanilla'
  ) {
    restoreOriginal().then(ok => {
      if (!ok) process.exit(1);
    }).catch(err => {
      console.error(err);
      process.exit(1);
    });
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
      console.error('❌ 参数错误。用法: node core/theme_engine.js --swap-we <壁纸序号/创意工坊ID> <槽位(左/下/设置)>');
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
    let search = '';
    let sortBy = 'default';
    for (let i = 1; i < args.length; i++) {
      if (args[i] === '--sort' || args[i] === '-s') {
        sortBy = args[++i] || 'default';
      } else {
        search = (search ? search + ' ' : '') + args[i];
      }
    }
    listWallpaperEngineWallpapers({ search, sortBy });

  } else if (
    args[0] === '--set-position' || args[0] === '--set-pos' || args[0] === '--pos' ||
    args[0] === 'set-pos' || args[0] === 'set-position' || args[0] === 'pos' ||
    args[0] === 'position' || (args[0] === '--position' && args[1])
  ) {
    if (!args[1] || !args[2]) {
      console.error('❌ 参数错误。用法: node core/theme_engine.js --set-pos <槽位(左/下/设置)> <X坐标> [Y坐标]');
      console.error('   示例: node core/theme_engine.js --set-pos 左 50% 30%');
      console.error('   示例: node core/theme_engine.js --set-pos 底部 "center 6%"');
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
  } else if (
    args[0] === '--reset-slot' || args[0] === '--reset-wallpaper' ||
    args[0] === 'reset-slot' || args[0] === 'reset-wallpaper'
  ) {
    resetSlotWallpaper(args[1] || 'all').then(res => {
      if (!res) process.exit(1);
    }).catch(err => {
      console.error(err);
      process.exit(1);
    });
  } else if (args[0] === '--set-left' && args[1]) {
    swapWallpaper('左', args[1]);
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
            const page = list.find(p => p.type === 'page' && !p.url.startsWith('data:')) || list.find(p => p.type === 'page');
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

/**
 * 校验 Antigravity 核心注入状态（是否已注入 CDP 8314 与流媒体 8315）
 */
function checkInjectionStatus() {
  const localAppData = process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local');
  const rDir = process.env.ANTIGRAVITY_RESOURCES || path.join(localAppData, 'Programs', 'antigravity', 'resources');
  const aPath = path.join(rDir, 'app.asar');
  const aBak = path.join(rDir, 'app.asar.orig.bak');
  const appDistMain = path.join(rDir, 'app', 'dist', 'main.js');

  const asarExists = fs.existsSync(aPath);
  let asarPatched = false;
  if (asarExists) {
    try {
      const fd = fs.openSync(aPath, 'r');
      const buf = Buffer.alloc(32768);
      const read = fs.readSync(fd, buf, 0, 32768, 0);
      fs.closeSync(fd);
      asarPatched = buf.toString('utf8', 0, read).includes('media_server.js');
    } catch(e) {}
  }

  let appDirPatched = false;
  if (fs.existsSync(appDistMain)) {
    try {
      const mainContent = fs.readFileSync(appDistMain, 'utf8');
      appDirPatched = mainContent.includes('media_server.js') || mainContent.includes('8314');
    } catch(e) {}
  }

  const isPatched = asarPatched || appDirPatched;
  const hasBackup = fs.existsSync(aBak);
  
  let isFreshOfficialUpdate = false;
  if (asarExists && !asarPatched) {
    if (!hasBackup) {
      isFreshOfficialUpdate = true;
    } else {
      try {
        const asarStat = fs.statSync(aPath);
        const bakStat = fs.statSync(aBak);
        if (asarStat.size !== bakStat.size || asarStat.mtimeMs > bakStat.mtimeMs + 2000) {
          isFreshOfficialUpdate = true;
        }
      } catch(e) {}
    }
  }

  return {
    isPatched,
    asarPatched,
    appDirPatched,
    hasBackup,
    isFreshOfficialUpdate,
    asarExists
  };
}

/**
 * 执行一键安装/注入美化底层补丁 (即使官方更新后也是一键自动化完成)
 */
async function installPatch() {
  console.log('=======================================================');
  console.log('   ⚡ 正在执行：一键注入 / 安装 Antigravity 美化核心');
  console.log('=======================================================');

  const patcherScript = path.join(__dirname, 'auto_patcher.js');
  if (!fs.existsSync(patcherScript)) {
    throw new Error('未找到补丁脚本: ' + patcherScript);
  }

  // 1. 运行 auto_patcher.js 自动化解包、注入与打包
  const { execSync } = require('child_process');
  execSync(`node "${patcherScript}"`, { stdio: 'inherit', env: process.env });

  // 2. 重新编译 Master CSS
  const cfg = loadSlotsConfig();
  const css = generateMasterCss(cfg);
  try {
    fs.writeFileSync(customCssPath, css, 'utf8');
    fs.writeFileSync(path.join(wallpapersDir, 'custom_theme.css'), css, 'utf8');
  } catch(e) {}

  // 3. 启动流媒体服务
  try {
    await ensureMediaServer(wallpapersDir, DEFAULT_PORT);
  } catch(e) {}

  // 4. 尝试热重载 (如果客户端当前已在线)
  try {
    await triggerLiveHotReload(css, cfg);
  } catch(e) {}

  const status = checkInjectionStatus();
  return {
    success: true,
    status
  };
}

module.exports = {
  batchApplyDraft,
  swapWallpaper,
  restoreSlotVanilla,
  swapWallpaperFromWE,
  listWallpaperEngineWallpapers,
  scanWorkshopWallpapers,
  getWallpaperById,
  formatWallpaperTable,
  generateMasterCss,
  restoreOriginal,
  uninstallCompletely,
  revertToBaseline,
  checkInjectionStatus,
  installPatch,
  loadSlotsConfig,
  saveSlotsConfig,
  triggerLiveHotReload,
  detectVideoCodec,
  findCompanionPoster,
  extractPosterFromVideo,
  getClientVideoScript,
  listSlotsStatus,
  normalizeSlotInput,
  setPosition,
  adjustPosition,
  resetPosition,
  resetSlotWallpaper,
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
  SLOTS,
  SLOTS_META,
  SLOT_ALIASES,
  ensureMp4Faststart,
  VIDEO_EXTS,
  IMAGE_EXTS,
  antigravityDir,
  wallpapersDir,
  WALLPAPERS_DIR: wallpapersDir,
  customCssPath,
  slotsConfigPath,
  sleepSync,
  writeFileSyncSafe,
  readJsonFileSyncSafe,
  normalizeDarkMaskOpacity,
  getDarkMaskAlpha,
  getSlotDarkMaskOpacity,
  syncConfigDarkMaskOpacity
};


