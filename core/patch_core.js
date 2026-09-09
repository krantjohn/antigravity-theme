const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync, spawn } = require('child_process');

console.log('=======================================================');
console.log('   🌸 Antigravity Theme Customizer —— 核心永久固化');
console.log('=======================================================');
console.log('');

const localAppData = process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local');
const defaultResDir = path.join(localAppData, 'Programs', 'antigravity', 'resources');
const resDir = process.env.ANTIGRAVITY_RESOURCES || defaultResDir;

const asarPath = path.join(resDir, 'app.asar');
const patchedAsarPath = path.join(resDir, 'app.asar.patched');
const appDir = path.join(resDir, 'app');
const exePath = path.join(localAppData, 'Programs', 'antigravity', 'Antigravity.exe');

// 1. Check if patched asar exists, if not pack it
if (!fs.existsSync(patchedAsarPath)) {
  console.log('[1/3] 正在从源码打包永久补丁...');
  try {
    execSync(`npx --yes asar pack "${appDir}" "${patchedAsarPath}"`, { stdio: 'inherit' });
  } catch (err) {
    console.error('❌ 打包失败:', err.message);
    process.exit(1);
  }
}

// 2. Terminate Antigravity process to release file lock
console.log('[2/3] 正在安全解除 Antigravity 文件占用...');
try {
  execSync('taskkill /f /im "Antigravity.exe"', { stdio: 'ignore' });
} catch (e) {}

// Wait 1.5s to ensure OS releases lock
const waitMs = (ms) => {
  const start = Date.now();
  while (Date.now() - start < ms) {}
};
waitMs(1500);

// 3. Replace app.asar with app.asar.patched
try {
  fs.copyFileSync(patchedAsarPath, asarPath);
  console.log('✓ [3/3] 核心包 app.asar 替换成功！(美化已永久焊入底层)');
} catch (err) {
  console.error('❌ 替换重试中:', err.message);
  waitMs(1000);
  try {
    fs.copyFileSync(patchedAsarPath, asarPath);
    console.log('✓ [3/3] 重试成功！app.asar 替换完成');
  } catch (err2) {
    console.error('❌ 仍被占用，请手动退出 Antigravity 后再运行此程序:', err2.message);
    process.exit(1);
  }
}

// 4. Restart Antigravity
console.log('\n正在重新启动 Antigravity 客户端...');
try {
  if (fs.existsSync(exePath)) {
    const child = spawn(exePath, [], {
      detached: true,
      stdio: 'ignore'
    });
    child.unref();
  } else {
    console.log('提示: 请手动点击快捷方式启动 Antigravity');
  }
} catch (e) {
  console.log('提示: 请手动打开 Antigravity 图标启动程序');
}

console.log('');
console.log('=======================================================');
console.log('✨ 恭喜！美化已永久固化完成！');
console.log('今后无论重启电脑、刷新页面、更新会话，美化都不会再掉！');
console.log('=======================================================');
