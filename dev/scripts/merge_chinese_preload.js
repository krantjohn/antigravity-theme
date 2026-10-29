const fs = require('fs');
const path = require('path');
const os = require('os');

const preloadPath = path.join(__dirname, '..', '..', 'core', 'preload.js');
const chineseEnginePath = path.join(os.homedir(), '.gemini', 'antigravity', 'brain', 'f40afff2-0f5d-40e2-aff3-1e977ec8b018', 'scratch', 'chinese_loc', 'chinese_engine.js');

let preload = fs.readFileSync(preloadPath, 'utf-8');
const chineseEngine = fs.readFileSync(chineseEnginePath, 'utf-8');

// Check if already merged
if (preload.includes('Chinese Localization Engine')) {
  console.log('Chinese Localization Engine is already present in preload.js');
} else {
  // Find where contextBridge exposes APIs (after electron_1.contextBridge.exposeInMainWorld('wsl', wslAPI);)
  const exposeMarker = "electron_1.contextBridge.exposeInMainWorld('wsl', wslAPI);";
  const idx = preload.indexOf(exposeMarker);
  if (idx === -1) {
    throw new Error('exposeMarker not found in preload.js');
  }

  const insertPos = idx + exposeMarker.length;
  preload = preload.slice(0, insertPos) + '\n\n' + chineseEngine + '\n\n' + preload.slice(insertPos);
  fs.writeFileSync(preloadPath, preload, 'utf-8');
  console.log('✓ Successfully merged Chinese Localization Engine into core/preload.js!');
}
