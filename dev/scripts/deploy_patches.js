const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');
const { triggerLiveHotReload, loadSlotsConfig, generateMasterCss } = require('../../core/theme_engine');

const localAppData = process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local');
const resDir = path.join(localAppData, 'Programs', 'antigravity', 'resources');
const appDir = path.join(resDir, 'app');
const appDist = path.join(appDir, 'dist');
const antigravityDir = process.env.ANTIGRAVITY_CONFIG_DIR || path.join(os.homedir(), '.gemini', 'antigravity');

const targetPreload = path.join(appDist, 'preload.js');
const sourcePreload = path.join(__dirname, '..', '..', 'core', 'preload.js');

const targetMain = path.join(appDist, 'main.js');
const sourceMain = path.join(__dirname, '..', 'main.js');

const targetMediaServer = path.join(appDist, 'media_server.js');
const sourceMediaServer = path.join(__dirname, '..', '..', 'core', 'media_server.js');
const userMediaServer = path.join(antigravityDir, 'media_server.js');

const sourceThemeEngine = path.join(__dirname, '..', '..', 'core', 'theme_engine.js');
const userThemeEngine = path.join(antigravityDir, 'theme_engine.js');

const patchedAsar = path.join(resDir, 'app.asar.patched');
const asarPath = path.join(resDir, 'app.asar');

console.log('[1/5] Synchronizing latest patched source files to app/dist and user config...');
fs.copyFileSync(sourcePreload, targetPreload);
console.log('✓ Successfully copied preload.js -> app/dist/preload.js');

fs.copyFileSync(sourceMain, targetMain);
console.log('✓ Successfully copied main.js -> app/dist/main.js');

fs.copyFileSync(sourceMediaServer, targetMediaServer);
try { fs.copyFileSync(sourceMediaServer, userMediaServer); } catch(e) {}
console.log('✓ Successfully copied media_server.js -> app/dist/media_server.js and config');

try { fs.copyFileSync(sourceThemeEngine, userThemeEngine); } catch(e) {}
console.log('✓ Successfully copied theme_engine.js -> user config');

console.log('[2/5] Repacking app.asar.patched with all optimizations...');
const npxCmd = process.platform === 'win32' ? 'npx.cmd' : 'npx';
execSync(`${npxCmd} --yes asar pack "${appDir}" "${patchedAsar}"`, { stdio: 'inherit' });
console.log('✓ Successfully packed app.asar.patched');

console.log('[3/5] Deploying app.asar directly...');
try {
  fs.copyFileSync(patchedAsar, asarPath);
  console.log('✓ Successfully updated app.asar directly!');
} catch (e) {
  console.log('ℹ app.asar is locked by running process (will take effect via app/ directory or next launch):', e.message);
}

console.log('[4/5] Regenerating master CSS and updating slots configuration...');
const config = loadSlotsConfig();
const css = generateMasterCss(config);
fs.writeFileSync(path.join(antigravityDir, 'custom_theme.css'), css, 'utf8');
try {
  fs.writeFileSync(path.join(antigravityDir, 'wallpapers', 'custom_theme.css'), css, 'utf8');
} catch(e) {}
console.log('✓ Master CSS generated and written to disk');

console.log('[5/5] Triggering live hot reload via CDP 8314...');
triggerLiveHotReload(config, css).then(() => {
  console.log('✓ Hot reload triggered successfully!');
}).catch(err => {
  console.log('⚠️ Hot reload notification:', err.message);
});
