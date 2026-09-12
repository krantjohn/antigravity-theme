const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const WE_APP_ID = '431960';
const VIDEO_EXTS = new Set(['.mp4', '.webm', '.ogv', '.mov', '.m4v']);
const IMAGE_EXTS = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp']);

let _cachedWallpapers = null;
let _cacheTime = 0;
const CACHE_TTL_MS = 60 * 1000; // 60s cache

/**
 * Normalizes and canonicalizes a path for consistent comparison on Windows.
 */
function canonicalPath(p) {
  if (!p) return '';
  try {
    if (fs.existsSync(p)) {
      return fs.realpathSync.native(p);
    }
  } catch (e) {}
  const resolved = path.resolve(p);
  if (process.platform === 'win32' && resolved.length >= 2 && resolved[1] === ':') {
    return resolved[0].toUpperCase() + resolved.slice(1);
  }
  return resolved;
}

/**
 * Discovers Steam installation directories via Windows Registry, environment variables, and common paths.
 * @returns {string[]} List of unique, existing Steam root paths.
 */
function findSteamRoots() {
  const roots = new Map(); // lowercase canonical -> display path

  function addRoot(candidate) {
    if (!candidate) return;
    const clean = candidate.trim().replace(/\//g, '\\');
    if (fs.existsSync(clean)) {
      const c = canonicalPath(clean);
      const key = c.toLowerCase();
      if (!roots.has(key)) {
        roots.set(key, c);
      }
    }
  }

  // 0. Environment variables
  if (process.env.STEAM_PATH) addRoot(process.env.STEAM_PATH);
  if (process.env.STEAM_DIR) addRoot(process.env.STEAM_DIR);

  if (process.platform === 'win32') {
    // 1. Query Registry HKCU
    try {
      const out = execSync('reg query "HKCU\\Software\\Valve\\Steam" /v SteamPath', {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore'],
        windowsHide: true
      });
      const m = out.match(/SteamPath\s+REG_SZ\s+(.+)/i);
      if (m && m[1]) addRoot(m[1]);
    } catch (e) {}

    // 2. Query Registry HKLM 64-bit
    try {
      const out = execSync('reg query "HKLM\\SOFTWARE\\WOW6432Node\\Valve\\Steam" /v InstallPath', {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore'],
        windowsHide: true
      });
      const m = out.match(/InstallPath\s+REG_SZ\s+(.+)/i);
      if (m && m[1]) addRoot(m[1]);
    } catch (e) {}

    // 3. Query Registry HKLM 32-bit
    try {
      const out = execSync('reg query "HKLM\\SOFTWARE\\Valve\\Steam" /v InstallPath', {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore'],
        windowsHide: true
      });
      const m = out.match(/InstallPath\s+REG_SZ\s+(.+)/i);
      if (m && m[1]) addRoot(m[1]);
    } catch (e) {}

    // 4. Common drive scans (C to H)
    const drives = ['C', 'D', 'E', 'F', 'G', 'H'];
    for (const drive of drives) {
      addRoot(`${drive}:\\Program Files (x86)\\Steam`);
      addRoot(`${drive}:\\Program Files\\Steam`);
      addRoot(`${drive}:\\Steam`);
    }
  }

  return Array.from(roots.values());
}

/**
 * Parses libraryfolders.vdf from Steam directory to find all game libraries across drives.
 * @param {string} steamRoot
 * @returns {string[]} List of library root paths.
 */
function parseLibraryFolders(steamRoot) {
  const libraries = new Map();
  if (!steamRoot || !fs.existsSync(steamRoot)) return [];
  const rootCan = canonicalPath(steamRoot);
  libraries.set(rootCan.toLowerCase(), rootCan);

  const vdfCandidates = [
    path.join(steamRoot, 'steamapps', 'libraryfolders.vdf'),
    path.join(steamRoot, 'config', 'libraryfolders.vdf'),
    path.join(steamRoot, 'config', 'config.vdf')
  ];

  for (const vdfPath of vdfCandidates) {
    if (!fs.existsSync(vdfPath)) continue;
    try {
      const content = fs.readFileSync(vdfPath, 'utf8');

      // Modern Steam VDF: "path"    "D:\\SteamLibrary"
      const pathRegex = /"path"\s+"([^"]+)"/gi;
      let match;
      while ((match = pathRegex.exec(content)) !== null) {
        let libPath = match[1].replace(/\\\\/g, '\\');
        if (fs.existsSync(libPath)) {
          const can = canonicalPath(libPath);
          libraries.set(can.toLowerCase(), can);
        }
      }

      // Legacy Steam VDF: "1"    "D:\\SteamLibrary"
      const legacyRegex = /"\d+"\s+"([^"]+)"/gi;
      while ((match = legacyRegex.exec(content)) !== null) {
        let libPath = match[1].replace(/\\\\/g, '\\');
        if (fs.existsSync(libPath) && fs.existsSync(path.join(libPath, 'steamapps'))) {
          const can = canonicalPath(libPath);
          libraries.set(can.toLowerCase(), can);
        }
      }
    } catch (e) {}
  }

  // Also check common root SteamLibrary on drives
  const drives = ['C', 'D', 'E', 'F', 'G', 'H'];
  for (const d of drives) {
    const directLib = `${d}:\\SteamLibrary`;
    if (fs.existsSync(directLib) && fs.existsSync(path.join(directLib, 'steamapps'))) {
      const can = canonicalPath(directLib);
      libraries.set(can.toLowerCase(), can);
    }
  }

  return Array.from(libraries.values());
}

/**
 * Gets all Steam libraries across all detected Steam roots.
 * @returns {string[]}
 */
function getAllSteamLibraries() {
  const roots = findSteamRoots();
  const allLibs = new Map();
  for (const root of roots) {
    const libs = parseLibraryFolders(root);
    for (const lib of libs) {
      const can = canonicalPath(lib);
      allLibs.set(can.toLowerCase(), can);
    }
  }
  return Array.from(allLibs.values());
}

/**
 * Finds all Wallpaper Engine workshop directories.
 * @returns {string[]}
 */
function findWorkshopDirs() {
  const workshopDirs = new Map();

  // User override
  if (process.env.WALLPAPER_ENGINE_DIR && fs.existsSync(process.env.WALLPAPER_ENGINE_DIR)) {
    const can = canonicalPath(process.env.WALLPAPER_ENGINE_DIR);
    workshopDirs.set(can.toLowerCase(), can);
  }

  const libs = getAllSteamLibraries();
  for (const lib of libs) {
    const wsDir = path.join(lib, 'steamapps', 'workshop', 'content', WE_APP_ID);
    if (fs.existsSync(wsDir)) {
      const can = canonicalPath(wsDir);
      workshopDirs.set(can.toLowerCase(), can);
    }
  }

  return Array.from(workshopDirs.values());
}

/**
 * Finds default projects bundled with Wallpaper Engine.
 * @returns {string[]}
 */
function findDefaultProjectsDirs() {
  const libs = getAllSteamLibraries();
  const dirs = new Map();
  for (const lib of libs) {
    const defDir = path.join(lib, 'steamapps', 'common', 'wallpaper_engine', 'projects', 'defaultprojects');
    if (fs.existsSync(defDir)) {
      const can = canonicalPath(defDir);
      dirs.set(can.toLowerCase(), can);
    }
    const myProjectsDir = path.join(lib, 'steamapps', 'common', 'wallpaper_engine', 'projects', 'myprojects');
    if (fs.existsSync(myProjectsDir)) {
      const can = canonicalPath(myProjectsDir);
      dirs.set(can.toLowerCase(), can);
    }
  }
  return Array.from(dirs.values());
}

/**
 * Scans all downloaded Wallpaper Engine wallpapers and parses project.json.
 * @param {Object} [options]
 * @param {'all'|'video'|'image'} [options.typeFilter='all']
 * @param {string} [options.search='']
 * @param {boolean} [options.refresh=false]
 * @returns {Array} List of wallpaper items
 */
function scanWorkshopWallpapers(options = {}) {
  const { typeFilter = 'all', search = '', refresh = false } = options;

  const now = Date.now();
  if (!refresh && _cachedWallpapers && (now - _cacheTime < CACHE_TTL_MS)) {
    return filterWallpapers(_cachedWallpapers, typeFilter, search);
  }

  const workshopDirs = findWorkshopDirs();
  const extraDirs = findDefaultProjectsDirs();
  const allScanDirs = [...workshopDirs, ...extraDirs];

  const results = [];
  const seenFolders = new Set();

  for (const scanDir of allScanDirs) {
    let subDirs = [];
    try {
      subDirs = fs.readdirSync(scanDir);
    } catch (e) {
      continue;
    }

    for (const sub of subDirs) {
      const itemFolder = path.join(scanDir, sub);
      const cFolder = canonicalPath(itemFolder);
      if (seenFolders.has(cFolder)) continue;
      seenFolders.add(cFolder);

      try {
        const stat = fs.statSync(itemFolder);
        if (!stat.isDirectory()) continue;
      } catch (e) {
        continue;
      }

      const projectJsonPath = path.join(itemFolder, 'project.json');
      if (!fs.existsSync(projectJsonPath)) continue;

      let projectData;
      try {
        projectData = JSON.parse(fs.readFileSync(projectJsonPath, 'utf8'));
      } catch (e) {
        continue;
      }

      const itemId = String(sub);
      const workshopId = String(projectData.workshopid || sub);
      const title = projectData.title || sub;
      const rawType = (projectData.type || 'unknown').toLowerCase();
      const declaredFile = projectData.file || '';
      const previewFile = projectData.preview || 'preview.jpg';

      let mediaPath = null;
      let mediaType = 'unknown';

      // 1. Check if declared file is a direct video
      if (declaredFile) {
        const ext = path.extname(declaredFile).toLowerCase();
        const candidatePath = path.join(itemFolder, declaredFile);
        if (VIDEO_EXTS.has(ext) && fs.existsSync(candidatePath)) {
          mediaPath = candidatePath;
          mediaType = 'video';
        } else if (IMAGE_EXTS.has(ext) && fs.existsSync(candidatePath)) {
          mediaPath = candidatePath;
          mediaType = 'image';
        }
      }

      // 2. If declared type is video, but declaredFile wasn't directly found or was relative
      if (!mediaPath && rawType === 'video') {
        try {
          const files = fs.readdirSync(itemFolder);
          const vid = files.find(f => VIDEO_EXTS.has(path.extname(f).toLowerCase()));
          if (vid) {
            mediaPath = path.join(itemFolder, vid);
            mediaType = 'video';
          }
        } catch (e) {}
      }

      // 3. If still not resolved or it's a scene/web, check for preview image / animated gif
      const previewCandidate = path.join(itemFolder, previewFile);
      const previewExists = fs.existsSync(previewCandidate);

      if (!mediaPath) {
        if (previewExists) {
          mediaPath = previewCandidate;
          mediaType = 'image';
        } else {
          // Look for any preview image in the folder
          try {
            const files = fs.readdirSync(itemFolder);
            const img = files.find(f => IMAGE_EXTS.has(path.extname(f).toLowerCase()));
            if (img) {
              mediaPath = path.join(itemFolder, img);
              mediaType = 'image';
            }
          } catch (e) {}
        }
      }

      if (!mediaPath) continue;

      let sizeBytes = 0;
      try {
        sizeBytes = fs.statSync(mediaPath).size;
      } catch (e) {}

      const item = {
        id: itemId,
        workshopId,
        title: title.trim(),
        rawType: projectData.type || 'unknown',
        mediaType,
        mediaPath,
        previewPath: previewExists ? previewCandidate : mediaPath,
        file: path.basename(mediaPath),
        folder: itemFolder,
        sizeMb: (sizeBytes / (1024 * 1024)).toFixed(2),
        description: (projectData.description || '').slice(0, 150),
        tags: Array.isArray(projectData.tags) ? projectData.tags : []
      };

      results.push(item);
    }
  }

  // Sort: video first, then alphabetical by title
  results.sort((a, b) => {
    if (a.mediaType === 'video' && b.mediaType !== 'video') return -1;
    if (a.mediaType !== 'video' && b.mediaType === 'video') return 1;
    return a.title.localeCompare(b.title, 'zh-CN');
  });

  // Assign persistent 1-based index so table display and ID lookup stay synchronized
  results.forEach((item, index) => {
    item.index = index + 1;
  });

  _cachedWallpapers = results;
  _cacheTime = Date.now();

  return filterWallpapers(results, typeFilter, search);
}

function filterWallpapers(list, typeFilter, search) {
  let filtered = list;
  if (typeFilter === 'video') {
    filtered = filtered.filter(w => w.mediaType === 'video');
  } else if (typeFilter === 'image') {
    filtered = filtered.filter(w => w.mediaType === 'image');
  }

  if (search) {
    const q = search.toLowerCase();
    filtered = filtered.filter(item =>
      item.title.toLowerCase().includes(q) ||
      item.id.toLowerCase().includes(q) ||
      item.workshopId.toLowerCase().includes(q) ||
      item.file.toLowerCase().includes(q)
    );
  }

  return filtered;
}

/**
 * Finds a wallpaper by workshop ID, folder name, or 1-based index from current scan.
 * @param {string|number} idOrIndex
 * @param {Array} [cachedList]
 * @returns {Object|null}
 */
function getWallpaperById(idOrIndex, cachedList = null) {
  if (!idOrIndex) return null;
  const list = cachedList || scanWorkshopWallpapers();
  const str = String(idOrIndex).trim();

  // 1. Direct match by workshop folder ID or workshopId
  const directMatch = list.find(w => w.id === str || w.workshopId === str);
  if (directMatch) return directMatch;

  // 2. Match by 1-based persistent index or position
  const num = parseInt(str, 10);
  if (!isNaN(num) && num >= 1 && num <= list.length) {
    const indexed = list.find(w => w.index === num);
    if (indexed) return indexed;
    return list[num - 1];
  }

  // 3. Case-insensitive title match
  const titleMatch = list.find(w => w.title.toLowerCase() === str.toLowerCase());
  if (titleMatch) return titleMatch;

  // 4. Case-insensitive title substring match
  const substrMatch = list.find(w => w.title.toLowerCase().includes(str.toLowerCase()));
  if (substrMatch) return substrMatch;

  return null;
}

/**
 * Formats the list of wallpapers for display in terminal/console.
 * @param {Array} wallpapers
 * @param {number} [limit=50]
 * @returns {string}
 */
function formatWallpaperTable(wallpapers, limit = 50) {
  if (!wallpapers || wallpapers.length === 0) {
    return '（未扫描到 Wallpaper Engine 创意工坊壁纸，请确认 Steam 是否已安装且已下载壁纸）';
  }

  const lines = [];
  lines.push('========================================================================================');
  lines.push(`  🎮 Steam Wallpaper Engine 创意工坊已安装壁纸列表 (共扫描到 ${wallpapers.length} 项)`);
  lines.push('========================================================================================');
  lines.push(`  序号   创意工坊ID    类型       文件大小    壁纸标题`);
  lines.push('----------------------------------------------------------------------------------------');

  const slice = wallpapers.slice(0, limit);
  slice.forEach((w, idx) => {
    const displayIndex = w.index || (idx + 1);
    const numStr = String(displayIndex).padStart(4, ' ');
    const idStr = w.id.padEnd(12, ' ');
    const typeIcon = w.mediaType === 'video' ? '🎬 视频' : '🖼️ 图像';
    const sizeStr = (w.sizeMb + ' MB').padStart(9, ' ');
    const titleStr = w.title.length > 40 ? w.title.slice(0, 37) + '...' : w.title;
    lines.push(` [${numStr}]  ${idStr}  ${typeIcon}  ${sizeStr}  ${titleStr}`);
  });

  if (wallpapers.length > limit) {
    lines.push('----------------------------------------------------------------------------------------');
    lines.push(`  ... 还有 ${wallpapers.length - limit} 项未显示。使用 --list-we <关键词> 进行搜索过滤。`);
  }
  lines.push('========================================================================================');

  return lines.join('\n');
}

module.exports = {
  WE_APP_ID,
  findSteamRoots,
  parseLibraryFolders,
  getAllSteamLibraries,
  findWorkshopDirs,
  findDefaultProjectsDirs,
  scanWorkshopWallpapers,
  getWallpaperById,
  formatWallpaperTable
};
