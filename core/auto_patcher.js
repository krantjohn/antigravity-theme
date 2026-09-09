const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');

const localAppData = process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local');
const defaultResDir = path.join(localAppData, 'Programs', 'antigravity', 'resources');
const resDir = process.env.ANTIGRAVITY_RESOURCES || defaultResDir;

const appDir = path.join(resDir, 'app');
const appDist = path.join(appDir, 'dist');
const asarPath = path.join(resDir, 'app.asar');
const patchedAsarPath = path.join(resDir, 'app.asar.patched');

const antigravityDir = process.env.ANTIGRAVITY_CONFIG_DIR || path.join(os.homedir(), '.gemini', 'antigravity');
const customCssPath = path.join(antigravityDir, 'custom_theme.css').replace(/\\/g, '/');

console.log('=======================================================');
console.log('   🌸 Antigravity Theme Customizer —— 核心补丁生成器');
console.log('=======================================================');
console.log(`Resources 路径: ${resDir}`);
console.log(`主题配置路径:   ${antigravityDir}`);
console.log('');

if (!fs.existsSync(asarPath)) {
  console.error(`❌ 未找到 Antigravity 核心包: ${asarPath}`);
  console.error('请确认 Antigravity 客户端已安装，或通过环境变量 ANTIGRAVITY_RESOURCES 指定 resources 目录。');
  process.exit(1);
}

// 1. 确保 app.asar 已经解包到 app 目录
console.log('[1/5] 正在解包 app.asar 核心文件...');
if (fs.existsSync(appDir)) {
  try {
    fs.rmSync(appDir, { recursive: true, force: true });
  } catch (e) {}
}
execSync(`npx --yes asar extract "${asarPath}" "${appDir}"`, { stdio: 'inherit' });

// 2. Patch main.js (固定 CDP 调试端口 8314)
console.log('[2/5] 正在注入 main.js (启用 8314 调试端口)...');
const mainPath = path.join(appDist, 'main.js');
let mainContent = fs.readFileSync(mainPath, 'utf8');
if (mainContent.includes("'remote-debugging-port', '0'")) {
  mainContent = mainContent.replace("'remote-debugging-port', '0'", "'remote-debugging-port', '8314'");
} else if (!mainContent.includes('8314')) {
  if (mainContent.includes("const HEADLESS =")) {
    mainContent = mainContent.replace(
      "const HEADLESS =",
      "electron_1.app.commandLine.appendSwitch('remote-debugging-port', '8314');\nconst HEADLESS ="
    );
  } else {
    mainContent = "const { app } = require('electron');\ntry { app.commandLine.appendSwitch('remote-debugging-port', '8314'); } catch(e){}\n" + mainContent;
  }
}
fs.writeFileSync(mainPath, mainContent, 'utf8');
console.log('✓ main.js 注入完成');

// 3. Patch preload.js (启动自启自动载入 custom_theme.css 并热监听)
console.log('[3/5] 正在注入 preload.js (前台开机自启)...');
const preloadPath = path.join(appDist, 'preload.js');
let preloadContent = fs.readFileSync(preloadPath, 'utf8');
const themeInjectionCode = `
// ================= Antigravity Master Theme Auto-Loader =================
(function() {
  try {
    const fs = require('fs');
    const customCssPath = '${customCssPath}';
    const applyTheme = () => {
      try {
        if (fs.existsSync(customCssPath)) {
          let style = document.getElementById('antigravity-custom-theme');
          if (!style) {
            style = document.createElement('style');
            style.id = 'antigravity-custom-theme';
            (document.head || document.documentElement).appendChild(style);
          }
          style.textContent = fs.readFileSync(customCssPath, 'utf8');
        }
      } catch(e) {}
    };

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', applyTheme);
    } else {
      applyTheme();
    }

    try {
      if (fs.existsSync(customCssPath)) {
        fs.watchFile(customCssPath, { interval: 300 }, applyTheme);
      }
    } catch(e) {}
  } catch(err) {}
})();
// =========================================================================
`;

if (!preloadContent.includes('Antigravity Master Theme Auto-Loader')) {
  preloadContent += '\n' + themeInjectionCode;
  fs.writeFileSync(preloadPath, preloadContent, 'utf8');
}
console.log('✓ preload.js 注入完成');

// 4. Patch utils.js (Chromium 原生 insertCSS 注入，绝无闪烁与回退)
console.log('[4/5] 正在注入 utils.js (Chromium 底层原生 insertCSS)...');
const utilsPath = path.join(appDist, 'utils.js');
if (fs.existsSync(utilsPath)) {
  let utilsContent = fs.readFileSync(utilsPath, 'utf8');
  if (!utilsContent.includes('custom_theme.css')) {
    utilsContent = utilsContent.replace(
      "win.webContents.on('did-finish-load', () => {",
      `win.webContents.on('did-finish-load', () => {
            try {
                const customCssPath = '${customCssPath}';
                if (fs.existsSync(customCssPath)) {
                    win.webContents.insertCSS(fs.readFileSync(customCssPath, 'utf8'));
                }
            } catch(e) {}`
    );
    utilsContent = utilsContent.replace(
      "void win.loadURL(url);",
      `win.webContents.on('dom-ready', () => {
        try {
            const customCssPath = '${customCssPath}';
            if (fs.existsSync(customCssPath)) {
                win.webContents.insertCSS(fs.readFileSync(customCssPath, 'utf8'));
            }
        } catch(e) {}
    });
    void win.loadURL(url);`
    );
    fs.writeFileSync(utilsPath, utilsContent, 'utf8');
  }
  console.log('✓ utils.js 原生注入完成');
}

// 5. Patch keybindings.js (启用快捷键 F5 / Ctrl+R / F12)
const kbPath = path.join(appDist, 'keybindings.js');
if (fs.existsSync(kbPath)) {
  let kbContent = fs.readFileSync(kbPath, 'utf8');
  if (!kbContent.includes('toggleDevTools')) {
    kbContent = kbContent.replace(
      `if (isCmdOrCtrl && input.key.toLowerCase() === 'q') {\n                actions.onQuitRequested();\n                event.preventDefault();\n            }`,
      `if (isCmdOrCtrl && input.key.toLowerCase() === 'q') {
                actions.onQuitRequested();
                event.preventDefault();
            }
            if ((isCmdOrCtrl && input.shift && input.key.toLowerCase() === 'i') || input.key === 'F12') {
                win.webContents.toggleDevTools();
                event.preventDefault();
            }
            if ((isCmdOrCtrl && input.key.toLowerCase() === 'r') || input.key === 'F5') {
                win.webContents.reload();
                event.preventDefault();
            }`
    );
    fs.writeFileSync(kbPath, kbContent, 'utf8');
    console.log('✓ keybindings.js 快捷键支持完成 (F5/Ctrl+R/F12)');
  }
}

// 6. 打包生成 app.asar.patched
console.log('[5/5] 正在重新打包并生成 app.asar.patched 补丁镜像...');
execSync(`npx --yes asar pack "${appDir}" "${patchedAsarPath}"`, { stdio: 'inherit' });
console.log('✓ app.asar.patched 打包生成完毕！');

console.log('');
console.log('=======================================================');
console.log('✨ 核心注入镜像打包完成！接下来运行 patch_core 即可固化生效。');
console.log('=======================================================');
