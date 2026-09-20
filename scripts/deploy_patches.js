const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');
const { triggerLiveHotReload, loadSlotsConfig, generateMasterCss } = require('../core/theme_engine');

const localAppData = process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local');
const resDir = path.join(localAppData, 'Programs', 'antigravity', 'resources');
const appDir = path.join(resDir, 'app');
const targetPreload = path.join(appDir, 'dist', 'preload.js');
const sourcePreload = path.join(__dirname, '..', 'preload.js');
const patchedAsar = path.join(resDir, 'app.asar.patched');
const asarPath = path.join(resDir, 'app.asar');

console.log('[1/4] Copying updated preload.js to app/dist/preload.js...');
fs.copyFileSync(sourcePreload, targetPreload);
console.log('✓ Successfully copied preload.js');

console.log('[2/4] Repacking app.asar.patched...');
execSync(`npx --yes asar pack "${appDir}" "${patchedAsar}"`, { stdio: 'inherit' });
console.log('✓ Successfully packed app.asar.patched');

console.log('[3/4] Checking if app.asar can be replaced directly...');
try {
  fs.copyFileSync(patchedAsar, asarPath);
  console.log('✓ Successfully updated app.asar directly!');
} catch (e) {
  console.log('ℹ app.asar is locked by running process (will take effect via app/ directory or next launch)');
}

console.log('[4/4] Triggering hot reload via CDP 8314...');
const config = loadSlotsConfig();
const css = generateMasterCss(config);
triggerLiveHotReload(config, css);
console.log('✓ Hot reload triggered successfully!');
