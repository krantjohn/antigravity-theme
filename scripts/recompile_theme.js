const fs = require('fs');
const path = require('path');
const os = require('os');
const { generateMasterCss, triggerLiveHotReload, loadSlotsConfig } = require('../core/theme_engine');

const config = loadSlotsConfig();
console.log('Active slots:');
console.log(' - left:', config.left ? `${config.left.type} (${config.left.file})` : 'none');
console.log(' - mid:', config.mid ? `${config.mid.type} (${config.mid.file})` : 'none');
console.log(' - right:', config.right ? `${config.right.type} (${config.right.file})` : 'none');
console.log(' - bottom:', config.bottom ? `${config.bottom.type} (${config.bottom.file})` : 'none');
console.log(' - settings:', config.settings ? `${config.settings.type} (${config.settings.file})` : 'none');

const css = generateMasterCss(config);
const cssPath = path.join(os.homedir(), '.gemini', 'antigravity', 'custom_theme.css');
fs.writeFileSync(cssPath, css, 'utf-8');
console.log(`Generated master CSS at ${cssPath} (${css.length} bytes)`);

triggerLiveHotReload(css, config);
console.log('Triggered live hot reload via CDP 8314!');
