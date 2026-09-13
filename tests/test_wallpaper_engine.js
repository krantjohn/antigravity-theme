const fs = require('fs');
const path = require('path');
const assert = require('assert');
const {
  findSteamRoots,
  parseLibraryFolders,
  getAllSteamLibraries,
  findWorkshopDirs,
  scanWorkshopWallpapers,
  getWallpaperById,
  formatWallpaperTable
} = require('../core/wallpaper_engine_bridge');
const {
  swapWallpaperFromWE,
  loadSlotsConfig,
  saveSlotsConfig,
  generateMasterCss,
  triggerLiveHotReload,
  revertToBaseline
} = require('../core/theme_engine');

async function runWallpaperEngineTests() {
  console.log('====================================================================');
  console.log('   🧪 Steam Wallpaper Engine 创意工坊深度自动化测试');
  console.log('====================================================================\n');

  // CRITICAL USER INTEGRITY: Backup user configuration and wallpaper state
  const antigravityDir = process.env.ANTIGRAVITY_CONFIG_DIR || path.join(require('os').homedir(), '.gemini', 'antigravity');
  const userBackupDir = path.join(antigravityDir, 'user_wallpaper_backup');
  const liveWallpapersDir = path.join(antigravityDir, 'wallpapers');
  const customCssPath = path.join(antigravityDir, 'custom_theme.css');
  const goldenConfigPath = path.join(antigravityDir, 'slots_config.golden_backup.json');

  if (!fs.existsSync(userBackupDir)) {
    fs.mkdirSync(userBackupDir, { recursive: true });
    if (fs.existsSync(liveWallpapersDir)) {
      fs.readdirSync(liveWallpapersDir).forEach(f => {
        try { fs.copyFileSync(path.join(liveWallpapersDir, f), path.join(userBackupDir, f)); } catch (e) {}
      });
    }
  }

  let userConfigBackup = loadSlotsConfig();
  if (fs.existsSync(goldenConfigPath)) {
    try { userConfigBackup = JSON.parse(fs.readFileSync(goldenConfigPath, 'utf8')); } catch (e) {}
  } else if (fs.existsSync(path.join(userBackupDir, 'slots_config.json'))) {
    try { userConfigBackup = JSON.parse(fs.readFileSync(path.join(userBackupDir, 'slots_config.json'), 'utf8')); } catch (e) {}
  }

  async function restoreUserWallpaperEnvironment() {
    console.log('\n[Restore] 正在自动恢复用户原始壁纸与字体配置 (杜绝误重置)...');
    if (fs.existsSync(userBackupDir)) {
      fs.readdirSync(userBackupDir).forEach(f => {
        try {
          fs.copyFileSync(path.join(userBackupDir, f), path.join(liveWallpapersDir, f));
        } catch (e) {}
      });
    }
    let targetConfig = userConfigBackup;
    if (fs.existsSync(goldenConfigPath)) {
      try { targetConfig = JSON.parse(fs.readFileSync(goldenConfigPath, 'utf8')); } catch (e) {}
    }
    saveSlotsConfig(targetConfig);
    const userCss = generateMasterCss(targetConfig);
    fs.writeFileSync(customCssPath, userCss, 'utf-8');
    try { fs.writeFileSync(path.join(liveWallpapersDir, 'custom_theme.css'), userCss, 'utf-8'); } catch (e) {}
    await triggerLiveHotReload(userCss, targetConfig);
    console.log('✓ 用户原始壁纸与配置已 100% 自动恢复！');
  }

  try {

  // Test 1: Batch scripts format verification
  console.log('[Test 1] 校验 bin/*.bat 脚本编码与 CRLF 行尾规范 (防止 CMD 漂移截断)...');
  const binDir = path.join(__dirname, '..', 'bin');
  const batFiles = fs.readdirSync(binDir).filter(f => f.endsWith('.bat'));
  assert.ok(batFiles.length >= 3, 'At least 3 batch files must exist in bin');

  for (const batFile of batFiles) {
    const fullPath = path.join(binDir, batFile);
    const buf = fs.readFileSync(fullPath);
    const content = buf.toString('utf8');

    // Check CRLF
    assert.ok(!content.replace(/\r\n/g, '').includes('\n'), `${batFile} must only contain CRLF line endings!`);
    assert.ok(content.includes('chcp 65001 >nul'), `${batFile} must set UTF-8 code page (chcp 65001)`);
    assert.ok(content.includes('%~dp0'), `${batFile} must safely resolve relative script path using %~dp0`);
    console.log(`   ✓ ${batFile.padEnd(22)} 校验通过 (CRLF, UTF-8, Safe Path)`);
  }
  console.log('✓ [Test 1] 所有批处理文件规范性检测 100% 通过\n');

  // Test 2: Steam root discovery
  console.log('[Test 2] 校验 Steam 安装路径及库文件夹解析...');
  const roots = findSteamRoots();
  console.log(`   检测到 Steam 根目录:`, roots);
  assert.ok(Array.isArray(roots), 'Roots must be an array');
  assert.ok(roots.length > 0, 'Should find at least 1 Steam root on this system');

  const libs = getAllSteamLibraries();
  console.log(`   检测到 Steam 游戏库:`, libs);
  assert.ok(libs.length > 0, 'Should find at least 1 Steam library');
  console.log('✓ [Test 2] Steam 安装路径与游戏库检索成功\n');

  // Test 3: Wallpaper Engine workshop directory discovery
  console.log('[Test 3] 校验 Wallpaper Engine (431960) 工坊目录发现...');
  const workshopDirs = findWorkshopDirs();
  console.log(`   工坊目录:`, workshopDirs);
  assert.ok(workshopDirs.length > 0, 'Should detect at least 1 Wallpaper Engine workshop directory');
  assert.ok(fs.existsSync(workshopDirs[0]), 'Detected workshop directory must exist on disk');
  console.log('✓ [Test 3] Wallpaper Engine 创意工坊路径定位正确\n');

  // Test 4: Wallpaper scanning and metadata parsing
  console.log('[Test 4] 扫描已下载壁纸及 project.json 元数据解析...');
  const wallpapers = scanWorkshopWallpapers({ refresh: true });
  console.log(`   共解析到已下载壁纸数量: ${wallpapers.length} 项`);
  assert.ok(wallpapers.length > 0, 'Should discover installed wallpapers');

  const sample = wallpapers[0];
  assert.ok(sample.id, 'Item must have an id');
  assert.ok(sample.title, 'Item must have a title');
  assert.ok(sample.mediaType === 'video' || sample.mediaType === 'image', 'mediaType must be video or image');
  assert.ok(fs.existsSync(sample.mediaPath), `Media file must exist on disk: ${sample.mediaPath}`);
  console.log(`   示例壁纸 #1: [${sample.mediaType === 'video' ? '视频' : '图片'}] ${sample.title} (${sample.sizeMb} MB)`);
  console.log('✓ [Test 4] 壁纸解析正确，物理文件确认存在\n');

  // Test 5: Type filtering (video vs image)
  console.log('[Test 5] 测试壁纸分类过滤 (动态视频 vs 静态/场景)...');
  const videoOnly = scanWorkshopWallpapers({ typeFilter: 'video' });
  const imageOnly = scanWorkshopWallpapers({ typeFilter: 'image' });
  console.log(`   动态视频壁纸: ${videoOnly.length} 项 | 图像/场景预览: ${imageOnly.length} 项`);
  assert.ok(videoOnly.length > 0, 'Should find video wallpapers');
  assert.ok(videoOnly.every(w => w.mediaType === 'video'), 'All videoOnly items must have mediaType === video');
  assert.ok(imageOnly.every(w => w.mediaType === 'image'), 'All imageOnly items must have mediaType === image');
  console.log('✓ [Test 5] 分类过滤器逻辑无误\n');

  // Test 6: Search functionality
  console.log('[Test 6] 测试关键词搜索与多模态匹配...');
  const searchResults = scanWorkshopWallpapers({ search: '碧蓝' });
  console.log(`   搜索 "碧蓝" 命中: ${searchResults.length} 项`);
  assert.ok(searchResults.length > 0, 'Should find at least 1 item matching "碧蓝"');
  assert.ok(searchResults.every(w => w.title.includes('碧蓝') || w.id.includes('碧蓝')), 'Filtered results must match query');
  console.log('✓ [Test 6] 关键词模糊搜索功能正常\n');

  // Test 7: Lookup by ID, 1-based index, and partial title
  console.log('[Test 7] 校验多模式匹配 getWallpaperById (ID / 序号 / 标题)...');
  const byId = getWallpaperById(sample.id);
  assert.strictEqual(byId?.id, sample.id, 'Lookup by ID must match');

  const byIndex = getWallpaperById(1);
  assert.strictEqual(byIndex?.id, sample.id, 'Lookup by 1-based index 1 must match first item');

  const byTitle = getWallpaperById(sample.title);
  assert.strictEqual(byTitle?.id, sample.id, 'Lookup by exact title must match');

  const invalidLookup = getWallpaperById('non_existent_9999999999');
  assert.strictEqual(invalidLookup, null, 'Invalid ID lookup must return null');
  console.log('✓ [Test 7] 序号、工坊ID、标题匹配及边界异常处理完全通过\n');

  // Test 8: Table formatter
  console.log('[Test 8] 校验终端壁纸列表格式化渲染...');
  const table = formatWallpaperTable(wallpapers, 5);
  assert.ok(table.includes('Steam Wallpaper Engine 创意工坊已安装壁纸列表'));
  assert.ok(table.includes(sample.title.slice(0, 20)));
  console.log('✓ [Test 8] 终端可视化排版表格生成无误\n');

  // Test 9: Swap wallpaper from Wallpaper Engine into Antigravity slot
  console.log('[Test 9] 测试从创意工坊一键应用壁纸到槽位【中】(终端)...');
  const targetWallpaper = videoOnly[0];
  console.log(`   正在应用: [${targetWallpaper.id}] ${targetWallpaper.title}`);
  const swapResult = await swapWallpaperFromWE(targetWallpaper.id, '中');
  assert.ok(swapResult, 'swapWallpaperFromWE should succeed');

  const configAfter = loadSlotsConfig();
  assert.strictEqual(configAfter.mid.type, 'video');
  assert.ok(configAfter.mid.file.endsWith('.mp4') || configAfter.mid.file.endsWith('.webm'));
  console.log('✓ [Test 9] Wallpaper Engine 壁纸无缝应用到终端槽位成功\n');

  // Test 10: Revert to baseline
  console.log('[Test 10] 测试恢复基线保证环境整洁...');
  await revertToBaseline();
  const restoredConfig = loadSlotsConfig();
  assert.strictEqual(restoredConfig.mid.type, 'image');
  console.log('✓ [Test 10] 成功还原基线配置\n');

  // Test 11: Path deduplication and casing normalization
  console.log('[Test 11] 校验 Steam 根目录与游戏库路径去重 (避免大小写产生重复项)...');
  const rootSet = new Set(roots.map(r => r.toLowerCase()));
  assert.strictEqual(roots.length, rootSet.size, 'Steam roots must be strictly deduplicated');
  const libSet = new Set(libs.map(l => l.toLowerCase()));
  assert.strictEqual(libs.length, libSet.size, 'Steam libraries must be strictly deduplicated');
  console.log('✓ [Test 11] Steam 路径大小写规范化与去重校验通过\n');

  // Test 12: Web / Live2D wallpaper detection (must NOT falsely treat .ogg audio as video)
  console.log('[Test 12] 校验 Web/Live2D 壁纸类型解析 (防止音频 .ogg 被误识别为视频)...');
  const webItems = wallpapers.filter(w => w.rawType.toLowerCase() === 'web');
  console.log(`   扫描到 Web 类型壁纸: ${webItems.length} 项`);
  for (const item of webItems) {
    assert.strictEqual(item.mediaType, 'image', `Web item ${item.id} should use preview image, not audio-as-video`);
    assert.ok(!item.file.endsWith('.ogg'), `Web item ${item.id} must not use .ogg as media file!`);
    console.log(`   ✓ Web壁纸 [${item.id}] ${item.title.slice(0, 20)} -> ${item.file} (${item.mediaType})`);
  }
  console.log('✓ [Test 12] Web/Live2D 壁纸无误判，已安全回退至高清预览动图\n');

  // Test 13: Search index consistency and slot case insensitivity
  console.log('[Test 13] 校验搜索结果全局序号一致性与槽位大小写自适应 (MID/left/TERMINAL)...');
  const searchItems = scanWorkshopWallpapers({ search: '碧蓝' });
  assert.ok(searchItems.length > 0);
  const secondMatch = searchItems[1] || searchItems[0];
  const resolvedByIndex = getWallpaperById(secondMatch.index);
  assert.strictEqual(resolvedByIndex?.id, secondMatch.id, 'Global index displayed in table must resolve to identical item');

  // Test case-insensitive slot input (e.g. 'MID')
  console.log(`   测试大写槽位名 'MID' 应用壁纸 [${secondMatch.id}]...`);
  const swapUpperMid = await swapWallpaperFromWE(secondMatch.id, 'MID');
  assert.ok(swapUpperMid, 'swapWallpaperFromWE with uppercase slot MID must succeed');
  await revertToBaseline();
  console.log('✓ [Test 13] 序号一致性及槽位大小写自适应验证通过\n');

  // Test 14: Batch script CMD execution with quotes (drag-and-drop safety)
  console.log('[Test 14] 校验 cmd.exe 实际执行批处理脚本，模拟拖放带双引号路径与参数转发...');
  const { execSync } = require('child_process');
  const swapBat = path.join(binDir, 'swap_wallpaper.bat');
  const weBat = path.join(binDir, 'wallpaper_engine.bat');

  // Test swap_wallpaper.bat with args and quotes
  const sampleImage = path.join(__dirname, '..', 'wallpapers', 'mid_wallpaper.jpg');
  const batOut = execSync(`cmd.exe /c "call "${swapBat}" --status"`, { encoding: 'utf8' });
  assert.ok(batOut.includes('Antigravity 壁纸槽位状态一览'), 'swap_wallpaper.bat --status must succeed');

  // Test swap_wallpaper.bat font commands (both with and without dashes)
  const fontListOut = execSync(`cmd.exe /c "call "${swapBat}" fonts"`, { encoding: 'utf8' });
  assert.ok(fontListOut.includes('Antigravity 字体颜色与高对比预设列表'), 'swap_wallpaper.bat fonts must list presets');

  const fontDashListOut = execSync(`cmd.exe /c "call "${swapBat}" --fonts"`, { encoding: 'utf8' });
  assert.ok(fontDashListOut.includes('Antigravity 字体颜色与高对比预设列表'), 'swap_wallpaper.bat --fonts must list presets');

  const setFontOut = execSync(`cmd.exe /c "call "${swapBat}" font 1"`, { encoding: 'utf8' });
  assert.ok(setFontOut.includes('已选定字体颜色'), 'swap_wallpaper.bat font 1 must succeed');

  const weBatOut = execSync(`cmd.exe /c "call "${weBat}" --list-we"`, { encoding: 'utf8' });
  assert.ok(weBatOut.includes('Steam Wallpaper Engine'), 'wallpaper_engine.bat --list-we must succeed');
  console.log('✓ [Test 14] 真实批处理文件调用与双引号安全处理验证通过\n');

  console.log('====================================================================');
  console.log('✨ Steam Wallpaper Engine 模块 14 项深度自动化测试全部 PASS！');
  console.log('====================================================================');
  } finally {
    await restoreUserWallpaperEnvironment();
  }
}

runWallpaperEngineTests().catch(err => {
  console.error('❌ 测试未通过:', err);
  process.exit(1);
});
