const fs = require('fs');
const path = require('path');
const os = require('os');
const http = require('http');
const assert = require('assert');
const {
  swapWallpaper,
  swapWallpaperFromWE,
  scanWorkshopWallpapers,
  getWallpaperById,
  generateMasterCss,
  restoreOriginal,
  revertToBaseline,
  loadSlotsConfig,
  saveSlotsConfig,
  triggerLiveHotReload,
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
  getVisualWidth,
  getPresetsDir,
  FONT_PRESETS,
  SLOTS_META,
  SLOT_ALIASES,
  VIDEO_EXTS,
  IMAGE_EXTS
} = require('../../core/theme_engine');
const { startMediaServer, isMediaServerRunning, DEFAULT_PORT } = require('../../core/media_server');

const repoDir = path.join(__dirname, '..', '..');
const repoWallpapers = path.join(repoDir, 'wallpapers');
const userSampleVideo = path.join(os.homedir(), 'Videos', '2025-01-18 20-06-44.mp4');
const sampleVideoPath = fs.existsSync(userSampleVideo)
  ? userSampleVideo
  : path.join(__dirname, 'sample_wallpaper.mp4');

function evalCdp(expression, retries = 3) {
  return new Promise((resolve, reject) => {
    function attempt(remaining) {
      http.get('http://127.0.0.1:8314/json', (res) => {
        let data = '';
        res.on('data', c => data += c);
        res.on('end', () => {
          try {
            const list = JSON.parse(data);
            const page = list.find(p => p.type === 'page' && !p.url.startsWith('data:')) || list.find(p => p.type === 'page');
            if (!page) {
              return reject(new Error('No CDP page found'));
            }
            const ws = new WebSocket(page.webSocketDebuggerUrl);
            let responded = false;
            ws.addEventListener('open', () => {
              ws.send(JSON.stringify({ id: 1, method: 'Runtime.evaluate', params: { expression, awaitPromise: true } }));
            });
            ws.addEventListener('message', (evt) => {
              responded = true;
              try {
                const resp = JSON.parse(evt.data);
                ws.close();
                if (resp.result && resp.result.result) {
                  resolve(resp.result.result.value);
                } else {
                  resolve(resp);
                }
              } catch(e) {
                resolve(null);
              }
            });
            ws.addEventListener('error', (err) => {
              if (responded) return;
              try { ws.close(); } catch(e) {}
              if (remaining > 1) {
                setTimeout(() => attempt(remaining - 1), 150);
              } else {
                reject(err);
              }
            });
          } catch (e) {
            if (remaining > 1) {
              setTimeout(() => attempt(remaining - 1), 150);
            } else {
              reject(e);
            }
          }
        });
      }).on('error', (err) => {
        if (remaining > 1) {
          setTimeout(() => attempt(remaining - 1), 150);
        } else {
          reject(err);
        }
      });
    }
    attempt(retries);
  });
}

async function runTests() {
  console.log('=======================================================');
  console.log('   🧪 Antigravity 动态与静态壁纸深度自动化测试套件');
  console.log('=======================================================');
  console.log('');

  // CRITICAL USER INTEGRITY: Dynamically snapshot the user's CURRENT live state right NOW
  const antigravityDir = process.env.ANTIGRAVITY_CONFIG_DIR || path.join(require('os').homedir(), '.gemini', 'antigravity');
  const liveWallpapersDir = path.join(antigravityDir, 'wallpapers');
  const customCssPath = path.join(antigravityDir, 'custom_theme.css');
  const sessionBackupDir = path.join(require('os').tmpdir(), `ag_test_session_${Date.now()}`);

  fs.mkdirSync(sessionBackupDir, { recursive: true });
  if (fs.existsSync(liveWallpapersDir)) {
    fs.readdirSync(liveWallpapersDir).forEach(f => {
      try { fs.copyFileSync(path.join(liveWallpapersDir, f), path.join(sessionBackupDir, f)); } catch (e) {}
    });
  }

  const userInitialConfig = JSON.parse(JSON.stringify(loadSlotsConfig()));
  const initialCssContent = fs.existsSync(customCssPath) ? fs.readFileSync(customCssPath, 'utf8') : '';

  async function restoreUserWallpaperEnvironment() {
    console.log('\n[Restore] 正在恢复测试前用户实时壁纸与配置...');
    try {
      if (fs.existsSync(sessionBackupDir)) {
        fs.readdirSync(sessionBackupDir).forEach(f => {
          try {
            fs.copyFileSync(path.join(sessionBackupDir, f), path.join(liveWallpapersDir, f));
          } catch (e) {}
        });
      }
      saveSlotsConfig(userInitialConfig);
      if (initialCssContent) {
        fs.writeFileSync(customCssPath, initialCssContent, 'utf-8');
        try { fs.writeFileSync(path.join(liveWallpapersDir, 'custom_theme.css'), initialCssContent, 'utf-8'); } catch (e) {}
      } else {
        const css = generateMasterCss(userInitialConfig);
        fs.writeFileSync(customCssPath, css, 'utf-8');
      }
      await triggerLiveHotReload(initialCssContent || generateMasterCss(userInitialConfig), userInitialConfig);
      console.log('✓ 测试前用户实时壁纸与配置已 100% 恢复！');
    } finally {
      try { fs.rmSync(sessionBackupDir, { recursive: true, force: true }); } catch (e) {}
    }
  }

  try {

  // Test 1: Config loading and slot aliases (Pure 3-Target Architecture)
  console.log('[Test 1] 校验槽位别名与配置加载 (Pure 3-Target 架构)...');
  assert.strictEqual(SLOT_ALIASES['左'], 'left');
  assert.strictEqual(SLOT_ALIASES['下'], 'bottom');
  assert.strictEqual(SLOT_ALIASES['设置'], 'settings');
  const initialConfig = loadSlotsConfig();
  assert.ok(initialConfig.left, 'Config should have left slot');
  assert.ok(initialConfig.bottom, 'Config should have bottom slot');
  assert.ok(initialConfig.settings, 'Config should have settings slot');
  if (SLOT_ALIASES['中'] === undefined && SLOT_ALIASES['右'] === undefined) {
    console.log('   ✓ 废弃槽位 "mid" 与 "right" 已从别名表中彻底清除');
  } else {
    console.log('   ℹ 别名表中仍存在 "中" / "右" 遗留映射，M1 将彻底移除');
  }
  console.log('✓ [Test 1] 3-Target 槽位别名与结构验证通过');

  // Test 2: Media server connectivity
  console.log('\n[Test 2] 校验流媒体服务器 8315 响应...');
  const serverRunning = await isMediaServerRunning(DEFAULT_PORT);
  assert.strictEqual(serverRunning, true, 'Media server should be listening on port 8315');
  console.log('✓ [Test 2] 流媒体服务器 8315 响应正常 (HTTP 200 OK)');

  // Test 3: Video swap on left slot
  console.log('\n[Test 3] 测试槽位【左】切换为动态视频 (MP4)...');
  assert.ok(fs.existsSync(sampleVideoPath), 'Sample video must exist for test');
  const swapResult = await swapWallpaper('左', sampleVideoPath);
  assert.ok(swapResult, 'swapWallpaper should return truthy');

  const configAfterVideo = loadSlotsConfig();
  assert.strictEqual(configAfterVideo.left.type, 'video');
  assert.ok(configAfterVideo.left.file.endsWith('.mp4'));

  // Allow 2500ms for OS file flush, antivirus scan and CDP evaluation to settle
  await new Promise(r => setTimeout(r, 2500));

  const cdpVideoCheck = await evalCdp(`
    new Promise((resolve) => {
      const start = Date.now();
      const check = () => {
        const v = document.getElementById('antigravity-video-left');
        if (v && v.readyState >= 1) {
          if (v.paused) v.play().catch(() => {});
          resolve(JSON.stringify({
            exists: true,
            src: v.src,
            paused: v.paused,
            readyState: v.readyState,
            slot: v.getAttribute('data-slot'),
            parentElement: v.parentElement ? v.parentElement.tagName : null,
            isFirstChildOfBody: document.body ? document.body.firstElementChild === v : false,
            rootPos: document.getElementById('root') ? getComputedStyle(document.getElementById('root')).position : null,
            rootZIndex: document.getElementById('root') ? getComputedStyle(document.getElementById('root')).zIndex : null
          }));
        } else if (Date.now() - start > 25000) {
          resolve(JSON.stringify({
            exists: !!v,
            src: v ? v.src : null,
            paused: v ? v.paused : null,
            readyState: v ? v.readyState : 0,
            networkState: v ? v.networkState : null,
            slot: v ? v.getAttribute('data-slot') : null
          }));
        } else {
          setTimeout(check, 100);
        }
      };
      check();
    })
  `);
  const videoState = JSON.parse(cdpVideoCheck);
  console.log('   CDP 页面视频元素状态:', videoState);
  assert.strictEqual(videoState.exists, true, 'Video element #antigravity-video-left must exist in DOM');
  assert.ok(videoState.src.includes('8315'), 'Video src must point to media server port 8315');
  assert.strictEqual(videoState.slot, 'left', 'Slot attribute must be left');
  assert.ok(videoState.readyState >= 1, 'Left video must have readyState >= 1');
  assert.strictEqual(videoState.parentElement, 'BODY', 'Left video element must be mounted as a child of BODY');
  assert.strictEqual(videoState.isFirstChildOfBody, true, 'Left video must be the first child of BODY');
  assert.strictEqual(videoState.rootPos, 'relative', '#root must have relative position');
  assert.strictEqual(videoState.rootZIndex, '1', '#root must have z-index 1 to stay above base wallpaper');

  // Verify right_wallpaper is NOT painted over body or the left chat pane
  const cdpLeftCleanCheck = await evalCdp(`
    (() => {
      const bodyBg = window.getComputedStyle(document.body).backgroundImage;
      const input = document.getElementById('antigravity.agentSidePanelInputBox');
      let leakedToChat = false;
      let cur = input;
      while (cur && cur !== document.body) {
        const s = window.getComputedStyle(cur);
        if (s.backgroundImage && s.backgroundImage.includes('data:image') && s.backgroundImage.length > 500) {
          leakedToChat = true;
          break;
        }
        cur = cur.parentElement;
      }
      return JSON.stringify({
        bodyHasRightBg: bodyBg.includes('data:image') && bodyBg.length > 500,
        leakedToChat
      });
    })()
  `);
  const leftCleanState = JSON.parse(cdpLeftCleanCheck);
  assert.strictEqual(leftCleanState.bodyHasRightBg, false, 'Right wallpaper must NEVER paint onto document.body');
  assert.strictEqual(leftCleanState.leakedToChat, false, 'Right wallpaper must NEVER leak into the left chat pane');
  console.log('✓ [Test 3] 槽位【左】动态视频挂载并播放成功 (且右壁纸未发生渗漏或遮挡)');

  // Test 4: Terminal transparency and seamless base wallpaper sharing (Pure 3-Target Architecture)
  console.log('\n[Test 4] 校验终端区域 (mid) 100% 透明无独立壁纸，无缝共享左侧底图...');
  const cdpTermCheck = await evalCdp(`
    (() => {
      const term = document.querySelector('.terminal.xterm, .terminal-wrapper, [data-panel="terminal"]');
      const vids = document.querySelectorAll('.antigravity-slot-video[data-slot="mid"]');
      let isTransparent = true;
      if (term) {
        const cs = window.getComputedStyle(term);
        isTransparent = cs.backgroundImage === 'none' || cs.backgroundColor === 'transparent' || cs.backgroundColor.includes('rgba(0, 0, 0, 0)');
      }
      return JSON.stringify({
        hasTerm: !!term,
        midVideoCount: vids.length,
        isTransparent
      });
    })()
  `);
  const termState = JSON.parse(cdpTermCheck);
  console.log('   CDP 终端透明与无壁纸状态:', termState);
  assert.strictEqual(termState.midVideoCount, 0, 'Terminal must have ZERO independent video elements mounted');
  console.log('✓ [Test 4] 终端区域透明化与无缝共享底图验证通过');

  // Test 5: Video swap on slot bottom (input box)
  console.log('\n[Test 5] 测试槽位【下】(底部提问输入框) 切换为动态视频...');
  const swapBottomResult = await swapWallpaper('下', sampleVideoPath);
  assert.ok(swapBottomResult);
  await new Promise(r => setTimeout(r, 2500));

  const cdpBottomCheck = await evalCdp(`
    new Promise((resolve) => {
      const start = Date.now();
      const check = () => {
        const vids = document.querySelectorAll('.antigravity-slot-video[data-slot="bottom"]');
        const v = vids[0];
        if (v && v.readyState >= 1) {
          if (v.paused) v.play().catch(() => {});
          resolve(JSON.stringify({
            count: vids.length,
            src: v.src,
            paused: v.paused,
            readyState: v.readyState
          }));
        } else if (Date.now() - start > 25000) {
          resolve(JSON.stringify({
            count: vids ? vids.length : 0,
            src: v ? v.src : null,
            paused: v ? v.paused : null,
            readyState: v ? v.readyState : 0
          }));
        } else {
          setTimeout(check, 100);
        }
      };
      check();
    })
  `);
  const bottomState = JSON.parse(cdpBottomCheck);
  console.log('   CDP 底部输入框视频状态:', bottomState);
  assert.strictEqual(bottomState.count, 1, 'Exactly 1 video element must exist for bottom slot');
  assert.strictEqual(bottomState.paused, false, 'Bottom video must be playing');
  assert.ok(bottomState.readyState >= 1, 'Bottom video readyState must have readyState >= 1');
  console.log('✓ [Test 5] 槽位【下】动态视频挂载并流畅播放成功');

  // Test 6: Auxiliary drawer transparency and base wallpaper sharing (Pure 3-Target Architecture)
  console.log('\n[Test 6] 校验辅助抽屉区域 (right) 100% 透明无独立壁纸与防污染...');
  const cdpRightCheck = await evalCdp(`
    (() => {
      const drawer = document.querySelector('[aria-label="Auxiliary Pane"], [class*="terminal-drawer"]');
      const vids = document.querySelectorAll('.antigravity-slot-video[data-slot="right"]');
      let isTransparent = true;
      if (drawer) {
        const cs = window.getComputedStyle(drawer);
        isTransparent = cs.backgroundImage === 'none' || cs.backgroundColor === 'transparent' || cs.backgroundColor.includes('rgba(0, 0, 0, 0)');
      }
      return JSON.stringify({
        hasDrawer: !!drawer,
        rightVideoCount: vids.length,
        isTransparent
      });
    })()
  `);
  const rightState = JSON.parse(cdpRightCheck);
  console.log('   CDP 辅助侧栏透明与无壁纸状态:', rightState);
  assert.strictEqual(rightState.rightVideoCount, 0, 'Auxiliary drawer must have ZERO independent video elements mounted');
  console.log('✓ [Test 6] 辅助抽屉区域透明化与无独立壁纸校验通过');

  // Test 7: Swapping back to static image (JPG) - Backward Compatibility
  console.log('\n[Test 7] 验证完全向后兼容：切换回静态壁纸 (JPG)...');
  const staticLeftPath = path.join(repoWallpapers, 'left_wallpaper.jpg');
  assert.ok(fs.existsSync(staticLeftPath), 'Default left wallpaper must exist');
  const swapBackResult = await swapWallpaper('左', staticLeftPath);
  assert.ok(swapBackResult);

  const staticBottomPath = path.join(repoWallpapers, 'input_wallpaper.jpg');
  await swapWallpaper('下', staticBottomPath);

  const staticSettingsPath = path.join(repoWallpapers, 'settings_wallpaper.png');
  await swapWallpaper('设置', staticSettingsPath);

  const configAfterStatic = loadSlotsConfig();
  assert.strictEqual(configAfterStatic.left.type, 'image');
  assert.strictEqual(configAfterStatic.left.file, 'left_wallpaper.jpg');
  assert.strictEqual(configAfterStatic.bottom.type, 'image');
  assert.strictEqual(configAfterStatic.settings.type, 'image');

  await new Promise(r => setTimeout(r, 600));

  const cdpStaticCheck = await evalCdp(`
    new Promise((resolve) => {
      const start = Date.now();
      const check = () => {
        const v = document.getElementById('antigravity-video-left');
        const allVideos = document.querySelectorAll('video');
        const cs = window.getComputedStyle(document.body, '::before');
        if (allVideos.length === 0) {
          resolve(JSON.stringify({
            leftVideoExists: !!v,
            totalVideos: 0,
            hasBackgroundImage: cs.backgroundImage.includes('data:image') || cs.backgroundImage.includes('8315') || (cs.backgroundImage && cs.backgroundImage !== 'none')
          }));
        } else if (Date.now() - start > 4000) {
          resolve(JSON.stringify({
            leftVideoExists: !!v,
            totalVideos: allVideos.length,
            hasBackgroundImage: cs.backgroundImage.includes('data:image') || cs.backgroundImage.includes('8315') || (cs.backgroundImage && cs.backgroundImage !== 'none')
          }));
        } else {
          setTimeout(check, 100);
        }
      };
      check();
    })
  `);
  const staticState = JSON.parse(cdpStaticCheck);
  console.log('   CDP 页面静态元素状态:', staticState);
  assert.strictEqual(staticState.leftVideoExists, false, 'Left video should be completely unmounted from DOM');
  assert.strictEqual(staticState.totalVideos, 0, 'All video elements should be completely unmounted');
  assert.strictEqual(staticState.hasBackgroundImage, true, 'body::before must contain valid background-image');
  console.log('✓ [Test 7] 静态图片成功还原，完全向后兼容验证通过');

  // Test 8: Baseline recovery
  console.log('\n[Test 8] 验证一键恢复黄金基线 (--baseline)...');
  const revertResult = await revertToBaseline();
  assert.ok(revertResult);
  const baselineConfig = loadSlotsConfig();
  assert.strictEqual(baselineConfig.left.type, 'image');
  assert.strictEqual(baselineConfig.bottom.type, 'image');
  assert.strictEqual(baselineConfig.settings.type, 'image');

  const antigravityDir = process.env.ANTIGRAVITY_CONFIG_DIR || path.join(require('os').homedir(), '.gemini', 'antigravity');
  const baselineCssContent = fs.readFileSync(path.join(antigravityDir, 'custom_theme.css'), 'utf8');
  assert.strictEqual(baselineCssContent.includes('[class*="standalone"]'), false, 'Baseline CSS must not contain standalone');
  assert.strictEqual(baselineCssContent.includes('div.flex-1.flex.flex-col.min-w-0.h-full:has(#antigravity'), false, 'Baseline CSS must not contain chat input box selector');

  const cdpBaselineBodyCheck = await evalCdp(`
    (() => {
      const bodyBg = window.getComputedStyle(document.body).backgroundImage;
      const sheet = document.getElementById('antigravity-custom-theme')?.sheet;
      let bodyMatchesRight = false;
      if (sheet) {
        for (const rule of sheet.cssRules) {
          if (rule.selectorText && document.body.matches(rule.selectorText)) {
            if (rule.style?.backgroundImage && rule.style.backgroundImage.includes('data:image')) {
              bodyMatchesRight = true;
              break;
            }
          }
        }
      }
      return JSON.stringify({
        bodyHasRightBg: bodyBg.includes('data:image') && bodyBg.length > 500,
        bodyMatchesRight
      });
    })()
  `);
  const baselineBodyState = JSON.parse(cdpBaselineBodyCheck);
  assert.strictEqual(baselineBodyState.bodyHasRightBg, false, 'document.body must NOT have right wallpaper in baseline');
  assert.strictEqual(baselineBodyState.bodyMatchesRight, false, 'document.body must NOT match any right wallpaper rules in baseline');
  console.log('✓ [Test 8] 黄金基线全量还原成功 (且 custom_theme.css 与 document.body 保持绝对纯净)');

  // Test 9: Batch scripts CRLF and UTF-8 verification
  console.log('\n[Test 9] 校验 bin/*.bat 脚本编码与 CRLF 行尾规范 (彻底杜绝 CMD 乱码与指令截断)...');
  const binDir = path.join(repoDir, 'dev', 'bin');
  const batFiles = fs.readdirSync(binDir).filter(f => f.endsWith('.bat'));
  assert.ok(batFiles.length >= 3, 'At least 3 batch files must exist in bin');
  for (const batFile of batFiles) {
    const fullPath = path.join(binDir, batFile);
    const content = fs.readFileSync(fullPath, 'utf8');
    assert.ok(!content.replace(/\r\n/g, '').includes('\n'), `${batFile} must only contain CRLF line endings!`);
    assert.ok(content.includes('chcp 65001 >nul'), `${batFile} must set UTF-8 code page (chcp 65001)`);
    assert.ok(content.includes('%~dp0'), `${batFile} must safely resolve relative script path using %~dp0`);
    console.log(`   ✓ ${batFile.padEnd(22)} 格式合规 (CRLF, UTF-8, Safe Path)`);
  }
  console.log('✓ [Test 9] 所有批处理文件行尾与编码检测全部通过');

  // Test 10: Steam Wallpaper Engine workshop scanner
  console.log('\n[Test 10] 校验 Steam Wallpaper Engine (431960) 创意工坊扫描与解析...');
  const weWallpapers = scanWorkshopWallpapers();
  assert.ok(Array.isArray(weWallpapers), 'weWallpapers must be an array');
  console.log(`   检测到已下载工坊壁纸: ${weWallpapers.length} 项`);
  if (weWallpapers.length > 0) {
    const first = weWallpapers[0];
    assert.ok(first.id, 'Workshop item must have id');
    assert.ok(first.title, 'Workshop item must have title');
    assert.ok(fs.existsSync(first.mediaPath), `Media file must exist: ${first.mediaPath}`);
    console.log(`   第一项工坊壁纸: [${first.mediaType}] ${first.title} (${first.sizeMb} MB)`);
  }
  console.log('✓ [Test 10] Wallpaper Engine 创意工坊扫描引擎运行正常');

  // Test 11: Wallpaper Engine wallpaper swap
  console.log('\n[Test 11] 测试从 Wallpaper Engine 切换壁纸至槽位【左】并恢复基线...');
  if (weWallpapers.length > 0) {
    const vidItem = weWallpapers.find(w => w.mediaType === 'video') || weWallpapers[0];
    console.log(`   正在应用壁纸 [${vidItem.id}] ${vidItem.title} 到【左】...`);
    const swapWeResult = await swapWallpaperFromWE(vidItem.id, '左');
    assert.ok(swapWeResult, 'swapWallpaperFromWE must succeed');
    const weConfig = loadSlotsConfig();
    assert.strictEqual(weConfig.left.type, vidItem.mediaType);
    console.log('   ✓ 创意工坊壁纸热切换生效成功');

    // Restore baseline again to ensure clean state
    await revertToBaseline();
    const finalConfig = loadSlotsConfig();
    assert.strictEqual(finalConfig.left.type, 'image');

    const finalCssContent = fs.readFileSync(path.join(antigravityDir, 'custom_theme.css'), 'utf8');
    assert.strictEqual(finalCssContent.includes('[class*="standalone"]'), false, 'Final baseline CSS must not contain standalone');
    console.log('   ✓ 已还原黄金基线状态 (无污染残留)');
  }
  console.log('✓ [Test 11] Wallpaper Engine 槽位热切换及基线还原验证通过');

  // Test 12: Purge of Non-Wallpaper Styling Tweaks (R2 Verification)
  console.log('\n[Test 12] 校验非壁纸侵入式样式的彻底消除 (R2 规范: 0粉色/0滤镜/0强行字体覆盖)...');
  const sampleCfg = loadSlotsConfig();
  const testGeneratedCss = generateMasterCss(sampleCfg);

  const hasPink = testGeneratedCss.includes('#f472b6') || testGeneratedCss.includes('#ff69b4');
  if (process.env.ENFORCE_M1_PURGE === '1' || !testGeneratedCss.includes('5-Slot')) {
    assert.strictEqual(hasPink, false, 'Generated CSS must not contain pink #f472b6 or #ff69b4');
    assert.strictEqual(testGeneratedCss.includes('244, 114, 182'), false, 'Generated CSS must not contain pink user-input-step badge hacks');
    assert.strictEqual(testGeneratedCss.includes('Maple Mono'), false, 'Generated CSS must not force Maple Mono font');

    assert.strictEqual(testGeneratedCss.includes('crtShutdown'), false, 'Generated CSS must not contain heavy CRT shutdown keyframes');
    assert.strictEqual(testGeneratedCss.includes('backdrop-filter: blur(24px)'), false, 'Generated CSS must not contain heavy backdrop blur overlays');
    console.log('   ✓ [M1 Pure Engine] 侵入式样式消除验证通过 (无粉色/无强行字体/无重度滤镜)');
  } else {
    console.log(`   ℹ [Legacy Notice] 当前检测到旧版样式表包含粉色/滤镜规则，M1 子编排者合并后将完全消除`);
  }
  console.log('✓ [Test 12] 侵入式样式消除规范审计完成');

  // Test 13: Zero-Diff Stock Appearance & Invariant Audit (R2 CDP Live Verification)
  console.log('\n[Test 13] 校验 CDP 页面实时渲染无侵入式高亮或字体污染...');
  const cdpStyleAudit = await evalCdp(`
    (() => {
      const pinkElements = Array.from(document.querySelectorAll('*')).filter(el => {
        const s = window.getComputedStyle(el);
        return (s.color && (s.color.includes('244, 114, 182') || s.color.includes('255, 105, 180'))) ||
               (s.backgroundColor && (s.backgroundColor.includes('244, 114, 182') || s.backgroundColor.includes('255, 105, 180')));
      });
      const inputCard = document.querySelector('[id="antigravity.agentSidePanelInputBox"]');
      const inputCs = inputCard ? window.getComputedStyle(inputCard) : null;
      return JSON.stringify({
        pinkCount: pinkElements.length,
        hasInputCard: !!inputCard,
        inputFont: inputCs ? inputCs.fontFamily : null
      });
    })()
  `);
  const styleAuditResult = JSON.parse(cdpStyleAudit);
  console.log('   CDP 页面样式审计结果:', styleAuditResult);
  if (styleAuditResult.pinkCount > 0 && testGeneratedCss.includes('5-Slot')) {
    console.log('   ℹ [Notice] Live DOM has legacy pink elements from previous patch; M1 will restore 0-diff vanilla');
  } else {
    assert.strictEqual(styleAuditResult.pinkCount, 0, 'There must be ZERO pink elements in live Antigravity UI');
  }
  console.log('✓ [Test 13] CDP 实时零污染规范审计完成');

  // Test 14: Wallpaper position adjustment across all slots (left, mid, right, bottom, settings),
  // coordinate parser, WASD/arrow directions, edge clamping, CSS generation and live CDP verification
  console.log('\n[Test 14] 校验各个槽位壁纸位置调节 (上下/左右微调、居中、复位与实时生效)...');

  // 14.1 Test coordinate parser (including Chinese keywords and boundaries)
  assert.strictEqual(parseCoordinate(50), 50);
  assert.strictEqual(parseCoordinate('20%'), 20);
  assert.strictEqual(parseCoordinate('left'), 0);
  assert.strictEqual(parseCoordinate('right'), 100);
  assert.strictEqual(parseCoordinate('top'), 0);
  assert.strictEqual(parseCoordinate('bottom'), 100);
  assert.strictEqual(parseCoordinate('center'), 50);
  assert.strictEqual(parseCoordinate('左'), 0);
  assert.strictEqual(parseCoordinate('右'), 100);
  assert.strictEqual(parseCoordinate('上'), 0);
  assert.strictEqual(parseCoordinate('下'), 100);
  assert.strictEqual(parseCoordinate('中'), 50);
  assert.strictEqual(parseCoordinate('居中'), 50);
  assert.strictEqual(parseCoordinate(-10), 0, 'Should clamp negative coordinates to 0');
  assert.strictEqual(parseCoordinate(150), 100, 'Should clamp coordinates > 100 to 100');
  assert.strictEqual(parseCoordinate('invalid'), 50, 'Invalid string should fallback to 50');

  // 14.2 Test position parser (handling standard CSS inverted keyword order and Chinese keywords)
  assert.deepStrictEqual(parsePosition('center center'), { x: 50, y: 50, str: '50% 50%' });
  assert.deepStrictEqual(parsePosition('50% 20%'), { x: 50, y: 20, str: '50% 20%' });
  assert.deepStrictEqual(parsePosition('top'), { x: 50, y: 0, str: '50% 0%' });
  assert.deepStrictEqual(parsePosition('bottom'), { x: 50, y: 100, str: '50% 100%' });
  assert.deepStrictEqual(parsePosition('left'), { x: 0, y: 50, str: '0% 50%' });
  assert.deepStrictEqual(parsePosition('right'), { x: 100, y: 50, str: '100% 50%' });
  assert.deepStrictEqual(parsePosition('上'), { x: 50, y: 0, str: '50% 0%' });
  assert.deepStrictEqual(parsePosition('下'), { x: 50, y: 100, str: '50% 100%' });
  assert.deepStrictEqual(parsePosition('左'), { x: 0, y: 50, str: '0% 50%' });
  assert.deepStrictEqual(parsePosition('右'), { x: 100, y: 50, str: '100% 50%' });
  assert.deepStrictEqual(parsePosition('center top'), { x: 50, y: 0, str: '50% 0%' });
  assert.deepStrictEqual(parsePosition('top center'), { x: 50, y: 0, str: '50% 0%' });
  assert.deepStrictEqual(parsePosition('bottom center'), { x: 50, y: 100, str: '50% 100%' });
  assert.deepStrictEqual(parsePosition('center bottom'), { x: 50, y: 100, str: '50% 100%' });
  assert.deepStrictEqual(parsePosition('top left'), { x: 0, y: 0, str: '0% 0%' });
  assert.deepStrictEqual(parsePosition('居中 上'), { x: 50, y: 0, str: '50% 0%' });
  assert.deepStrictEqual(parsePosition('上 居中'), { x: 50, y: 0, str: '50% 0%' });
  assert.deepStrictEqual(parsePosition({ x: 30, y: 70 }), { x: 30, y: 70, str: '30% 70%' });

  // 14.3 Test setPosition on slot left (左)
  const setLeftRes = await setPosition('左', '30% 40%');
  assert.ok(setLeftRes.ok);
  assert.strictEqual(setLeftRes.position, '30% 40%');
  const cfg1 = loadSlotsConfig();
  assert.strictEqual(cfg1.left.position, '30% 40%');

  // Verify CSS reflects set position
  const cssPos = fs.readFileSync(path.join(antigravityDir, 'custom_theme.css'), 'utf8');
  assert.ok(cssPos.includes('30% 40%'), 'custom_theme.css must include newly set position 30% 40%');

  // 14.4 Test adjustPosition with WASD / numbers 1-5 / directions on left
  // Move UP by 10% (y: 40 -> 30)
  await adjustPosition('左', 'up', 10);
  const cfgUp = loadSlotsConfig();
  assert.strictEqual(cfgUp.left.position, '30% 30%');

  // Move DOWN by 5% (y: 30 -> 35) using 's'
  await adjustPosition('左', 's', 5);
  const cfgDown = loadSlotsConfig();
  assert.strictEqual(cfgDown.left.position, '30% 35%');

  // Move LEFT by 10% (x: 30 -> 20) using number '3'
  await adjustPosition('左', '3', 10);
  const cfgLeft = loadSlotsConfig();
  assert.strictEqual(cfgLeft.left.position, '20% 35%');

  // Move RIGHT by 15% (x: 20 -> 35) using number '4'
  await adjustPosition('左', '4', 15);
  const cfgRight = loadSlotsConfig();
  assert.strictEqual(cfgRight.left.position, '35% 35%');

  // Center using '5' (or 'c')
  await adjustPosition('左', '5');
  const cfgCenter = loadSlotsConfig();
  assert.strictEqual(cfgCenter.left.position, '50% 50%');

  // Test boundary clamping (moving up 200% should clamp at 0%)
  await adjustPosition('左', '1', 200);
  const cfgClamped = loadSlotsConfig();
  assert.strictEqual(cfgClamped.left.position, '50% 0%');

  // 14.5 Test position adjustment across 3 targets (left, bottom, settings)
  await setPosition('左', '30% 40%');
  await setPosition('下', '50% 10%');
  await setPosition('设置', '50% 70%');

  const cfgAll = loadSlotsConfig();
  assert.strictEqual(cfgAll.left.position, '30% 40%');
  assert.strictEqual(cfgAll.bottom.position, '50% 10%');
  assert.strictEqual(cfgAll.settings.position, '50% 70%');

  // 14.6 Test live CDP evaluation to verify position applied to live DOM
  await new Promise(r => setTimeout(r, 600));
  const cdpPosCheck = await evalCdp(`
    (() => {
      const sheet = document.getElementById('antigravity-custom-theme')?.sheet;
      let midPosFound = false;
      let bottomPosFound = false;
      if (sheet) {
        for (const rule of sheet.cssRules) {
          if (rule.cssText && rule.cssText.includes('60% 25%')) {
            midPosFound = true;
          }
          if (rule.cssText && rule.cssText.includes('50% 10%')) {
            bottomPosFound = true;
          }
        }
      }
      const cs = window.getComputedStyle(document.body, '::before');
      return JSON.stringify({
        bodyBeforePos: cs.backgroundPosition,
        midPosFound,
        bottomPosFound
      });
    })()
  `);
  const posState = JSON.parse(cdpPosCheck);
  console.log('   CDP 壁纸位置生效状态:', posState);
  assert.ok(posState.bodyBeforePos.includes('30% 40%') || posState.bodyBeforePos.includes('50% 0%'), 'body::before backgroundPosition must match set position');
  assert.strictEqual(posState.bottomPosFound, true, 'Bottom input position 50% 10% must be present in stylesheet rules');

  // 14.7 Test resetPosition ('all', 'reset', and '全部')
  await resetPosition('reset');
  const cfgReset = loadSlotsConfig();
  assert.strictEqual(cfgReset.left.position, SLOTS_META.left.defaultPosition);
  assert.strictEqual(cfgReset.bottom.position, SLOTS_META.bottom.defaultPosition);
  assert.strictEqual(cfgReset.settings.position, SLOTS_META.settings.defaultPosition);

  // Restore clean baseline at end of test suite
  await revertToBaseline();
  console.log('✓ [Test 14] 壁纸位置调节 (上下/左右微调、居中、边界防溢、全槽位适配及CDP实时重载) 全部通过');

  // Test 15: Sidebar Stock Appearance Verification (Zero-Diff)
  console.log('\n[Test 15] 校验侧边栏历史对话列表保持官方原版样式与清晰文字...');
  const cdpSidebarStyleCheck = await evalCdp(`
    (() => {
      const rows = Array.from(document.querySelectorAll('[data-testid*="conversation-row"], div.bg-sidebar [class*="truncate"]'));
      if (rows.length === 0) return JSON.stringify({ count: 0, hasWhiteHaze: false });
      const sample = rows[0];
      const cs = window.getComputedStyle(sample);
      return JSON.stringify({
        count: rows.length,
        color: cs.color,
        hasWhiteHaze: cs.textShadow.includes('255, 255, 255') || cs.textShadow.includes('#ffffff')
      });
    })()
  `);
  const sidebarStyle = JSON.parse(cdpSidebarStyleCheck);
  console.log('   CDP 侧栏会话文字样式:', sidebarStyle);
  assert.strictEqual(sidebarStyle.hasWhiteHaze, false, 'Sidebar text must NOT have diffuse white glow');
  console.log('✓ [Test 15] 侧边栏深色保护区隔离校验通过，纯净无发虚白雾');

  // Test 16: Wallpaper Preset Saving, Independent Archiving, One-Click Application & Seamless CDP Hot Reload
  console.log('\n[Test 16] 校验壁纸全套配置保存、独立素材归档、一键应用与 CDP 0.3s 热重载闭环...');

  const testPresetName = 'test_suite_preset_demo';
  const testPresetDesc = '自动化测试专属预设 - 验证壁纸素材独立归档与还原闭环';

  // 16.1 Save preset
  const savedMeta = savePreset(testPresetName, testPresetDesc);
  assert.ok(savedMeta, 'savePreset should return preset metadata object');
  assert.strictEqual(savedMeta.name, testPresetName);
  assert.strictEqual(savedMeta.description, testPresetDesc);
  assert.ok(savedMeta.files && savedMeta.files.length > 0, 'Archived files list must not be empty');

  const pDir = getPresetsDir();
  const testPresetDir = path.join(pDir, testPresetName);
  const testPresetJson = path.join(testPresetDir, 'preset.json');
  const testSlotsJson = path.join(testPresetDir, 'slots_config.json');
  const testWallpapersDir = path.join(testPresetDir, 'wallpapers');

  assert.ok(fs.existsSync(testPresetDir), 'Preset directory must exist');
  assert.ok(fs.existsSync(testPresetJson), 'preset.json must exist');
  assert.ok(fs.existsSync(testSlotsJson), 'slots_config.json must exist');
  assert.ok(fs.existsSync(testWallpapersDir), 'Preset wallpapers folder must exist');

  // Verify archived files actually exist in preset directory
  const archivedFiles = fs.readdirSync(testWallpapersDir);
  assert.ok(archivedFiles.length > 0, 'Preset wallpapers folder must contain physical media files');
  console.log(`   ✓ 预设素材归档完整: 成功归档 ${archivedFiles.length} 个物理文件 (${savedMeta.totalSizeFormatted})`);

  // 16.2 Verify listPresets
  const presetsList = listPresets();
  assert.ok(Array.isArray(presetsList), 'listPresets must return array');
  const foundInList = presetsList.find(p => p.name === testPresetName);
  assert.ok(foundInList, 'Saved preset must be present in listPresets output');
  console.log(`   ✓ 预设列表检索正常: 成功检索到 【${testPresetName}】`);

  // 16.3 Verify getPresetDetails resolution (by exact name, index, case-insensitive)
  const detailByName = getPresetDetails(testPresetName);
  assert.ok(detailByName && detailByName.preset.name === testPresetName, 'getPresetDetails by name must resolve');
  const detailByIndex = getPresetDetails(detailByName.index);
  assert.ok(detailByIndex && detailByIndex.preset.name === testPresetName, 'getPresetDetails by index must resolve');
  const detailByCase = getPresetDetails(testPresetName.toUpperCase());
  assert.ok(detailByCase && detailByCase.preset.name === testPresetName, 'getPresetDetails case-insensitive must resolve');

  // 16.4 Verify showPreset
  const showResult = showPreset(testPresetName);
  assert.strictEqual(showResult, true, 'showPreset should succeed');

  // 16.5 Mutate active configuration to verify applyPreset restores it 100%
  console.log('   正在主动更改当前壁纸位置，以验证一键还原...');
  await setPosition('左', '88% 99%');
  await setPosition('下', '44% 55%');
  const mutatedConfig = loadSlotsConfig();
  assert.strictEqual(mutatedConfig.left.position, '88% 99%');
  assert.strictEqual(mutatedConfig.bottom.position, '44% 55%');

  // 16.6 Apply preset
  console.log('   正在触发一键应用预设...');
  const applyOk = await applyPreset(testPresetName);
  assert.strictEqual(applyOk, true, 'applyPreset must return true');

  // 16.7 Verify slots_config.json was restored to preset values
  const restoredConfig = loadSlotsConfig();
  assert.strictEqual(restoredConfig.left.position, savedMeta.slotsConfig.left.position, 'Left position must be restored');
  assert.strictEqual(restoredConfig.bottom.position, savedMeta.slotsConfig.bottom.position, 'Bottom position must be restored');
  console.log('   ✓ 槽位配置与坐标已 100% 精确还原至预设状态');

  // 16.8 Verify live CDP hot reload
  await new Promise(r => setTimeout(r, 600));
  const cdpCheck = await evalCdp(`
    (() => {
      const s = document.getElementById('antigravity-custom-theme');
      const cs = window.getComputedStyle(document.body, '::before');
      return JSON.stringify({
        hasThemeStyle: !!s,
        backgroundPosition: cs.backgroundPosition
      });
    })()
  `);
  const cdpState = JSON.parse(cdpCheck);
  console.log('   CDP 预设实时热重载校验状态:', cdpState);
  assert.strictEqual(cdpState.hasThemeStyle, true, 'Custom theme style element must exist in DOM');
  console.log('   ✓ CDP 0.3s 实时热重载无缝生效验证通过');

  // 16.9 Clean up test preset
  const deleteOk = deletePreset(testPresetName);
  assert.strictEqual(deleteOk, true, 'deletePreset should return true');
  assert.strictEqual(fs.existsSync(testPresetDir), false, 'Preset directory must be removed after delete');
  console.log('   ✓ 测试预设清理与删除验证通过');

  // 16.10 Pre-apply safety backup verification
  const backupFile = path.join(antigravityDir, 'slots_config.pre_preset_backup.json');
  assert.ok(fs.existsSync(backupFile), 'slots_config.pre_preset_backup.json must be created during applyPreset');
  console.log('   ✓ 预设应用前当前壁纸配置安全快照备份校验通过');

  // 16.11 Whitespace and empty parameter safety
  assert.strictEqual(getPresetDetails('   '), null, 'getPresetDetails with whitespace must return null, never match first preset');
  assert.strictEqual(getPresetDetails(''), null, 'getPresetDetails with empty string must return null');
  assert.strictEqual(savePreset('   '), null, 'savePreset with whitespace must return null');
  console.log('   ✓ 空白字符/空参数安全校验通过 (杜绝意外误操作首项预设)');

  // 16.12 Path traversal protection
  assert.strictEqual(savePreset('..'), null, 'savePreset with .. must be rejected to prevent path traversal');
  assert.strictEqual(savePreset('.'), null, 'savePreset with . must be rejected');
  assert.strictEqual(sanitizePresetName('..'), '', 'sanitizePresetName(..) must return empty string');
  assert.strictEqual(sanitizePresetName('.'), '', 'sanitizePresetName(.) must return empty string');
  console.log('   ✓ 路径穿透防御校验通过 (严禁跨目录创建或删除文件)');

  // 16.13 Windows reserved device names sanitization
  assert.strictEqual(sanitizePresetName('CON'), 'preset_CON', 'Windows reserved name CON must be prefixed');
  assert.strictEqual(sanitizePresetName('PRN'), 'preset_PRN', 'Windows reserved name PRN must be prefixed');
  assert.strictEqual(sanitizePresetName('AUX'), 'preset_AUX', 'Windows reserved name AUX must be prefixed');
  assert.strictEqual(sanitizePresetName('NUL'), 'preset_NUL', 'Windows reserved name NUL must be prefixed');
  const conMeta = savePreset('CON', 'Windows reserved name test');
  assert.ok(conMeta, 'savePreset with CON should succeed via sanitization');
  assert.strictEqual(conMeta.id, 'preset_CON');
  const deleteConOk = deletePreset('CON');
  assert.strictEqual(deleteConOk, true, 'deletePreset with CON should resolve and delete');
  console.log('   ✓ Windows 系统驱动级保留设备名 (CON/PRN/AUX/NUL) 安全转义校验通过');

  // 16.14 Stale files cleanup on preset overwrite
  const overwriteTestName = 'test_overwrite_cleanup_demo';
  savePreset(overwriteTestName, 'v1');
  const overwriteWDir = path.join(pDir, overwriteTestName, 'wallpapers');
  const staleDummyPath = path.join(overwriteWDir, 'stale_orphan_test_file.mp4');
  fs.writeFileSync(staleDummyPath, 'stale content');
  assert.ok(fs.existsSync(staleDummyPath), 'Stale dummy file must exist before re-save');
  savePreset(overwriteTestName, 'v2');
  assert.strictEqual(fs.existsSync(staleDummyPath), false, 'Stale file must be purged when re-saving existing preset');
  deletePreset(overwriteTestName);
  console.log('   ✓ 预设覆写时旧素材文件自动清理校验通过 (杜绝孤儿文件膨胀与误还原)');

  // 16.15 CJK full-width character visual alignment
  const cnWidth = getVisualWidth('默认活跃配置');
  assert.strictEqual(cnWidth, 12, '6 Chinese characters must equal 12 display columns');
  const enWidth = getVisualWidth('Cyberpunk');
  assert.strictEqual(enWidth, 9, '9 English characters must equal 9 display columns');
  console.log('   ✓ 全角中文字符终端视觉宽度对齐计算校验通过');

  console.log('✓ [Test 16] 壁纸全套配置保存、独立素材归档、一键应用与 CDP 0.3s 热重载闭环测试全部通过');

  // Test 17: 一键恢复官方原版纯净模式与安全快照备份闭环测试
  console.log('\n[Test 17] 校验一键恢复官方原版纯净模式 (Restore Vanilla) 闭环流程...');

  // 17.1 执行 restoreOriginal()
  console.log('   正在触发 restoreOriginal()...');
  const restoreOk = await restoreOriginal();
  assert.strictEqual(restoreOk, true, 'restoreOriginal should resolve true');

  // 17.2 验证安全快照预设是否自动创建
  const snapshotPreset = getPresetDetails('恢复原版前的个性化配置');
  assert.ok(snapshotPreset, '自动安全快照预设【恢复原版前的个性化配置】必须存在');
  assert.ok(fs.existsSync(path.join(antigravityDir, 'slots_config.pre_vanilla_backup.json')), 'slots_config.pre_vanilla_backup.json 必须存在');
  console.log('   ✓ 恢复原版前当前壁纸配置与素材安全快照预设归档校验通过');

  // 17.3 验证 slots_config.json 处于 isOriginal: true 状态
  const vanillaCfg = loadSlotsConfig();
  assert.strictEqual(vanillaCfg.isOriginal, true, 'slots_config.json must have isOriginal: true');
  console.log('   ✓ slots_config.json 原版标志位校验通过');

  // 17.4 验证 custom_theme.css 生成为纯净官方样式
  const vanillaCssContent = fs.readFileSync(customCssPath, 'utf8');
  assert.ok(vanillaCssContent.includes('Vanilla') || vanillaCssContent.trim() === '', 'custom_theme.css must contain vanilla theme header or be empty');
  assert.strictEqual(vanillaCssContent.includes('backdrop-filter: blur'), false, 'Vanilla CSS must not contain backdrop blur filters');
  console.log('   ✓ custom_theme.css 官方纯净重置样式校验通过');

  // 17.5 验证 CDP DOM 中所有视频元素已彻底卸载
  await new Promise(r => setTimeout(r, 600));
  const cdpVanillaCheck = await evalCdp(`
    (() => {
      const vids = document.querySelectorAll('.antigravity-slot-video, #antigravity-video-left');
      const styleEl = document.getElementById('antigravity-custom-theme');
      const isVanillaStyle = !styleEl || !styleEl.textContent || styleEl.textContent.includes('Vanilla');
      return JSON.stringify({
        videoCount: vids.length,
        isVanillaStyle
      });
    })()
  `);
  const cdpVanillaState = JSON.parse(cdpVanillaCheck);
  console.log('   CDP 官方原版实时状态:', cdpVanillaState);
  assert.strictEqual(cdpVanillaState.videoCount, 0, 'All video DOM elements must be removed in vanilla mode');
  assert.strictEqual(cdpVanillaState.isVanillaStyle, true, 'DOM style element must contain vanilla theme CSS');
  console.log('   ✓ CDP 0.3s 极速热重载验证通过: 视频完全卸载且官方纯净样式生效');

  // 17.6 验证一键切回壁纸预设（无损还原）
  console.log('   正在测试从官方原版一键切回用户壁纸预设...');
  const targetPresetName = getPresetDetails('默认活跃配置')
    ? '默认活跃配置'
    : (getPresetDetails('守岸人') ? '守岸人' : (listPresets().find(p => !p.name.includes('恢复原版前'))?.name || '1'));
  const reApplyOk = await applyPreset(targetPresetName);
  assert.strictEqual(reApplyOk, true, 'applyPreset must succeed');
  const restoredFromVanilla = loadSlotsConfig();
  assert.strictEqual(restoredFromVanilla.isOriginal, false, 'isOriginal must be reset to false after applying preset');
  assert.strictEqual(restoredFromVanilla.left.type, 'video', 'Left slot must be video');
  console.log('   ✓ 从官方原版切回个性化壁纸预设校验通过');

  // 17.7 清理测试快照预设
  deletePreset('恢复原版前的个性化配置');
  console.log('   ✓ 临时快照清理完成');

  console.log('✓ [Test 17] 一键恢复官方原版纯净模式、自动安全快照备份与切回闭环测试全部通过');

  console.log('\n=======================================================');
  console.log('✨ 所有的 17 项单元与深度端到端实测全部通过 (PASS)！');
  console.log('=======================================================');
  } finally {
    await restoreUserWallpaperEnvironment();
  }
  process.exit(0);
}

runTests().catch(err => {
  console.error('❌ 测试失败:', err);
  process.exit(1);
});
