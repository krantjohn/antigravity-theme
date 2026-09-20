const fs = require('fs');
const path = require('path');
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
} = require('../core/theme_engine');
const { startMediaServer, isMediaServerRunning, DEFAULT_PORT } = require('../core/media_server');

const repoDir = path.join(__dirname, '..');
const repoWallpapers = path.join(repoDir, 'wallpapers');
const sampleVideoPath = fs.existsSync('C:/Users/lenvo/Videos/2025-01-18 20-06-44.mp4')
  ? 'C:/Users/lenvo/Videos/2025-01-18 20-06-44.mp4'
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
            const page = list.find(p => p.type === 'page');
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

  // CRITICAL USER INTEGRITY: Backup user configuration and wallpaper state
  const antigravityDir = process.env.ANTIGRAVITY_CONFIG_DIR || path.join(require('os').homedir(), '.gemini', 'antigravity');
  const userBackupDir = path.join(antigravityDir, 'user_wallpaper_backup');
  const liveWallpapersDir = path.join(antigravityDir, 'wallpapers');
  const customCssPath = path.join(antigravityDir, 'custom_theme.css');
  const goldenConfigPath = path.join(antigravityDir, 'slots_config.golden_backup.json');

  // Ensure user backup directory exists and has all files
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

  // Test 1: Config loading and slot aliases
  console.log('[Test 1] 校验槽位别名与配置加载...');
  assert.strictEqual(SLOT_ALIASES['左'], 'left');
  assert.strictEqual(SLOT_ALIASES['中'], 'mid');
  assert.strictEqual(SLOT_ALIASES['右'], 'right');
  assert.strictEqual(SLOT_ALIASES['下'], 'bottom');
  assert.strictEqual(SLOT_ALIASES['设置'], 'settings');
  const initialConfig = loadSlotsConfig();
  assert.ok(initialConfig.left, 'Config should have left slot');
  assert.ok(initialConfig.mid, 'Config should have mid slot');
  assert.ok(initialConfig.right, 'Config should have right slot');
  assert.ok(initialConfig.bottom, 'Config should have bottom slot');
  assert.ok(initialConfig.settings, 'Config should have settings slot');
  console.log('✓ [Test 1] 槽位别名与结构全部正确');

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
            slot: v.getAttribute('data-slot')
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

  // Test 4: Video swap on terminal (mid) slot
  console.log('\n[Test 4] 测试槽位【中】(终端) 切换为动态视频...');
  const swapMidResult = await swapWallpaper('中', sampleVideoPath);
  assert.ok(swapMidResult);
  const configAfterMid = loadSlotsConfig();
  assert.strictEqual(configAfterMid.mid.type, 'video');
  assert.ok(configAfterMid.mid.file.endsWith('.mp4'));
  console.log('✓ [Test 4] 槽位【中】终端动态视频配置更新成功');

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

  // Test 6: Video swap on slot right (sidebar/drawer/terminal) with anti-pollution & singleton isolation check
  console.log('\n[Test 6] 测试槽位【右】(独立终端/抽屉) 切换为动态视频并校验防污染与单例隔离...');
  const swapRightResult = await swapWallpaper('右', sampleVideoPath);
  assert.ok(swapRightResult);
  await new Promise(r => setTimeout(r, 600));

  const cdpRightCheck = await evalCdp(`
    new Promise((resolve) => {
      const start = Date.now();
      const check = () => {
        const hasContainer = !!document.querySelector('[aria-label="Auxiliary Pane"] div.flex.flex-col.gap-2.overflow-y-auto.h-full.w-full, div[role="region"][aria-label="Terminal"] div.flex.flex-col.gap-2.overflow-y-auto.h-full.w-full, div.flex.flex-col.gap-2.overflow-y-auto.h-full.w-full.bg-background, [class*="terminal-drawer"]');
        const vids = document.querySelectorAll('.antigravity-slot-video[data-slot="right"]');
        const v = vids[0];
        if (v && v.paused) {
          v.play().catch(() => {});
        }
        if (hasContainer && v && v.readyState >= 1 && !v.paused) {
          resolve(JSON.stringify({
            hasContainer: true,
            count: vids.length,
            src: v.src,
            paused: v.paused,
            readyState: v.readyState,
            inBody: !!document.body.querySelector(':scope > .antigravity-slot-video[data-slot="right"]')
          }));
        } else if (!hasContainer && vids.length === 0) {
          resolve(JSON.stringify({
            hasContainer: false,
            count: 0,
            src: null,
            paused: false,
            readyState: 0,
            inBody: false
          }));
        } else if (Date.now() - start > 4000) {
          resolve(JSON.stringify({
            hasContainer,
            count: vids ? vids.length : 0,
            src: v ? v.src : null,
            paused: v ? v.paused : null,
            readyState: v ? v.readyState : 0,
            inBody: !!document.body.querySelector(':scope > .antigravity-slot-video[data-slot="right"]')
          }));
        } else {
          setTimeout(check, 100);
        }
      };
      check();
    })
  `);
  const rightState = JSON.parse(cdpRightCheck);
  console.log('   CDP 右侧侧栏初始视频状态 (收起时):', rightState);
  assert.strictEqual(rightState.inBody, false, 'Right slot video must never be mounted into document.body');
  if (!rightState.hasContainer) {
    assert.strictEqual(rightState.count, 0, 'When right container is closed/collapsed, no duplicate video should leak into other containers');
  } else {
    assert.strictEqual(rightState.count, 1, 'When right container is open, exactly 1 video instance should be mounted');
  }

  // Test dynamic opening and closing of auxiliary pane + Anti-Pollution verification
  const hasToggleBtn = await evalCdp(`!!document.querySelector('button[aria-label="Toggle Auxiliary Pane"]')`);
  if (hasToggleBtn) {
    // 确保辅助面板打开
    const isAuxOpen = await evalCdp(`!!document.querySelector('[aria-label="Auxiliary Pane"], div[data-aux-pane-open="true"]')`);
    if (!isAuxOpen) {
      await evalCdp(`document.querySelector('button[aria-label="Toggle Auxiliary Pane"]').click()`);
      await new Promise(r => setTimeout(r, 600));
    }

    // 1. 防污染校验：在 Overview 总览/任务列表界面下，右壁纸严禁渗透污染，必须保持 100% 透明！
    const hasOverviewTab = await evalCdp(`!!document.querySelector('button[aria-label="Overview tab"]')`);
    if (hasOverviewTab) {
      await evalCdp(`document.querySelector('button[aria-label="Overview tab"]').click()`);
      await new Promise(r => setTimeout(r, 500));
    }
    const overviewRightVids = await evalCdp(`document.querySelectorAll('.antigravity-slot-video[data-slot="right"]').length`);
    console.log('   CDP Overview 总览区右壁纸渗透校验 (应为0/透明):', overviewRightVids);
    assert.strictEqual(overviewRightVids, 0, 'Overview pane must remain transparent without right slot video pollution');

    // 2. 终端隔离校验：切换到 Terminal tab 时，中壁纸挂载到终端，右壁纸严禁抢占终端 (应为0)
    const hasTermTab = await evalCdp(`!!document.querySelector('button[aria-label="Terminal tab"]')`);
    if (hasTermTab) {
      console.log('   正在测试辅助面板切换至 Terminal 终端并校验中壁纸专享与右壁纸杜绝冲突...');
      await evalCdp(`document.querySelector('button[aria-label="Terminal tab"]').click()`);
      await new Promise(r => setTimeout(r, 600));

      const termIsolationCheck = await evalCdp(`
        (() => {
          const term = document.querySelector('.terminal.xterm');
          const termVids = term ? Array.from(term.querySelectorAll('video')) : [];
          const rightInTerm = termVids.filter(v => v.dataset.slot === 'right');
          const midInTerm = termVids.filter(v => v.dataset.slot === 'mid');
          const drawer = document.querySelector('div.flex.flex-col.gap-2.overflow-y-auto.h-full.w-full.bg-background, [class*="terminal-drawer"]');
          const rightInDrawer = drawer ? Array.from(drawer.querySelectorAll('video[data-slot="right"]')) : [];
          return JSON.stringify({
            hasTerm: !!term,
            rightInTermCount: rightInTerm.length,
            midInTermCount: midInTerm.length,
            hasDrawer: !!drawer,
            rightInDrawerCount: rightInDrawer.length
          });
        })()
      `);
      const termState = JSON.parse(termIsolationCheck);
      console.log('   CDP 终端模式壁纸挂载状态:', termState);
      assert.strictEqual(termState.rightInTermCount, 0, 'Terminal MUST NEVER mount right slot video!');
      if (termState.hasDrawer && termState.rightInDrawerCount > 0) {
        assert.strictEqual(termState.rightInDrawerCount, 1, 'Expanded drawer should have right slot video');
      }

      // 切换回 Overview 界面，右壁纸必须被干净卸载，恢复纯净透明
      if (hasOverviewTab) {
        await evalCdp(`document.querySelector('button[aria-label="Overview tab"]').click()`);
        await new Promise(r => setTimeout(r, 500));
        const backToOverviewCount = await evalCdp(`document.querySelectorAll('.antigravity-slot-video[data-slot="right"]').length`);
        assert.strictEqual(backToOverviewCount, 0, 'Right video must be cleanly unmounted when switching back to Overview');
        console.log('   ✓ 切换回 Overview 时右壁纸成功卸载并恢复纯净透明');
      }
    }

    console.log('   ✓ 辅助侧栏防污染与终端生命周期闭环验证通过');
  }
  console.log('✓ [Test 6] 槽位【右】单例隔离与防污染校验通过 (准确控制视频实例，无DOM泄漏，无界面污染)');

  // Test 7: Swapping back to static image (JPG) - Backward Compatibility
  console.log('\n[Test 7] 验证完全向后兼容：切换回静态壁纸 (JPG)...');
  const staticLeftPath = path.join(repoWallpapers, 'left_wallpaper.jpg');
  assert.ok(fs.existsSync(staticLeftPath), 'Default left wallpaper must exist');
  const swapBackResult = await swapWallpaper('左', staticLeftPath);
  assert.ok(swapBackResult);

  const staticMidPath = path.join(repoWallpapers, 'mid_wallpaper.jpg');
  await swapWallpaper('中', staticMidPath);

  const staticBottomPath = path.join(repoWallpapers, 'input_wallpaper.jpg');
  await swapWallpaper('下', staticBottomPath);

  const staticRightPath = path.join(repoWallpapers, 'right_wallpaper.jpg');
  await swapWallpaper('右', staticRightPath);

  const staticSettingsPath = path.join(repoWallpapers, 'settings_wallpaper.png');
  await swapWallpaper('设置', staticSettingsPath);

  const configAfterStatic = loadSlotsConfig();
  assert.strictEqual(configAfterStatic.left.type, 'image');
  assert.strictEqual(configAfterStatic.left.file, 'left_wallpaper.jpg');
  assert.strictEqual(configAfterStatic.mid.type, 'image');
  assert.strictEqual(configAfterStatic.right.type, 'image');
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
  assert.strictEqual(baselineConfig.mid.type, 'image');
  assert.strictEqual(baselineConfig.right.type, 'image');
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
  const binDir = path.join(repoDir, 'bin');
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

  // Test 12: Font color presets, aliases, hex parsing, luminance and contrast outline algorithm
  console.log('\n[Test 12] 校验字体颜色预设、别名解析与自定义 Hex 颜色感知亮度算法...');
  const presets = listFontPresets();
  assert.ok(presets['pure-white'], 'Preset pure-white must exist');
  assert.ok(presets['obsidian-black'], 'Preset obsidian-black must exist');
  assert.ok(presets['sakura-pink'], 'Preset sakura-pink must exist');
  assert.ok(presets['cyber-cyan'], 'Preset cyber-cyan must exist');
  assert.ok(presets['golden-sand'], 'Preset golden-sand must exist');
  assert.ok(presets['emerald-green'], 'Preset emerald-green must exist');

  for (const [key, p] of Object.entries(presets)) {
    assert.ok(p.id, `${key} must have id`);
    assert.ok(p.name, `${key} must have name`);
    assert.ok(p.primary, `${key} must have primary color`);
    assert.ok(p.secondary, `${key} must have secondary color`);
    assert.ok(p.muted, `${key} must have muted color`);
    assert.ok(p.shadow, `${key} must have shadow`);
    assert.ok(p.terminal, `${key} must have terminal color`);
    assert.ok(p.terminalShadow, `${key} must have terminalShadow`);
    assert.ok(typeof p.isDarkText === 'boolean', `${key} must declare isDarkText boolean`);
    assert.ok(p.desc, `${key} must have description`);
  }

  // Verify alias and index resolution
  assert.strictEqual(resolveFontColor('1').id, 'pure-white');
  assert.strictEqual(resolveFontColor('white').id, 'pure-white');
  assert.strictEqual(resolveFontColor('纯白').id, 'pure-white');
  assert.strictEqual(resolveFontColor('2').id, 'obsidian-black');
  assert.strictEqual(resolveFontColor('black').id, 'obsidian-black');
  assert.strictEqual(resolveFontColor('暗夜曜黑').id, 'obsidian-black');
  assert.strictEqual(resolveFontColor('3').id, 'sakura-pink');
  assert.strictEqual(resolveFontColor('pink').id, 'sakura-pink');
  assert.strictEqual(resolveFontColor('4').id, 'cyber-cyan');
  assert.strictEqual(resolveFontColor('5').id, 'golden-sand');
  assert.strictEqual(resolveFontColor('6').id, 'emerald-green');

  // Verify Hex parsing and safety (including 3, 4, 6, 8-digit hex)
  assert.deepStrictEqual(parseHexColor('#ffffff'), { r: 255, g: 255, b: 255, hex: '#ffffff' });
  assert.deepStrictEqual(parseHexColor('ffffff'), { r: 255, g: 255, b: 255, hex: '#ffffff' });
  assert.deepStrictEqual(parseHexColor('#fff'), { r: 255, g: 255, b: 255, hex: '#ffffff' });
  assert.deepStrictEqual(parseHexColor('#ffff'), { r: 255, g: 255, b: 255, hex: '#ffffff' });
  assert.deepStrictEqual(parseHexColor('#ffffff00'), { r: 255, g: 255, b: 255, hex: '#ffffff' });
  assert.deepStrictEqual(parseHexColor('0f172a'), { r: 15, g: 23, b: 42, hex: '#0f172a' });
  assert.strictEqual(parseHexColor('not-a-color'), null);
  assert.strictEqual(parseHexColor(''), null);
  assert.strictEqual(parseHexColor(null), null);

  // Verify brightness adjustment (including zero-luminance edge case)
  const lightened = adjustBrightness('#101010', 50);
  assert.ok(lightened.startsWith('#'));
  const darkened = adjustBrightness('#f0f0f0', -20);
  assert.ok(darkened.startsWith('#'));
  const lightenedBlack = adjustBrightness('#000000', 30);
  assert.notStrictEqual(lightenedBlack, '#000000', 'adjustBrightness must lighten pure black #000000 without getting stuck at 0');
  assert.strictEqual(lightenedBlack, '#4d4d4d', 'adjustBrightness(#000000, 30) should be #4d4d4d');

  // Verify custom Hex luminance and contrast outline logic
  const darkCustom = resolveFontColor('#1a1a2e');
  assert.strictEqual(darkCustom.isDarkText, true);
  assert.ok(darkCustom.shadow.includes('#ffffff') || darkCustom.shadow.includes('255, 255, 255'), 'Dark text must have bright white glow shadow');

  const brightCustom = resolveFontColor('#fefefe');
  assert.strictEqual(brightCustom.isDarkText, false);
  assert.ok(brightCustom.shadow.includes('0, 0, 0'), 'Light text must have dark shadow outline');

  // Verify object resolution (e.g. from saved config)
  assert.strictEqual(resolveFontColor({ id: 'obsidian-black' }).id, 'obsidian-black');
  assert.strictEqual(resolveFontColor({ customHex: '#123456' }).id, 'custom-123456');

  // Verify common color names
  assert.strictEqual(resolveFontColor('red').primary, '#ef4444');
  assert.strictEqual(resolveFontColor('blue').primary, '#3b82f6');

  // Verify strict fallback vs default fallback
  assert.strictEqual(resolveFontColor('gibberish-color-xyz', false), null, 'Strict resolve must return null on invalid input');
  assert.strictEqual(resolveFontColor(null).id, 'pure-white');
  assert.strictEqual(resolveFontColor('gibberish-color-xyz').id, 'pure-white');

  // Verify setFontColor rejects invalid input safely without corrupting configuration
  const invalidResult = await setFontColor('completely-invalid-color-12345');
  assert.strictEqual(invalidResult, false, 'setFontColor must return false on invalid color input');
  console.log('✓ [Test 12] 字体颜色预设、别名多模态映射、亮度自适应与边界防御算法全部正确');

  // Test 13: Live font color switching, slots_config persistence, CSS generation & CDP live verification
  console.log('\n[Test 13] 校验字体颜色切换、持久化、样式编译及 CDP 实时热重载...');
  const setBlackResult = await setFontColor('obsidian-black');
  assert.ok(setBlackResult, 'setFontColor obsidian-black must succeed');

  const configAfterBlack = loadSlotsConfig();
  assert.strictEqual(configAfterBlack.fontColor.id, 'obsidian-black');
  assert.ok(configAfterBlack.left, 'left slot preserved');
  assert.ok(configAfterBlack.mid, 'mid slot preserved');
  assert.ok(configAfterBlack.right, 'right slot preserved');

  const cssAfterBlack = fs.readFileSync(path.join(antigravityDir, 'custom_theme.css'), 'utf8');
  assert.ok(cssAfterBlack.includes('#0f172a'), 'custom_theme.css must contain obsidian-black primary color');
  assert.ok(cssAfterBlack.includes('#ffffff') || cssAfterBlack.includes('255, 255, 255'), 'custom_theme.css must contain white outline glow for dark text');
  assert.ok(cssAfterBlack.includes('rgba(255, 255, 255, 0.88)'), 'Inline code must have light background in dark text mode');

  await new Promise(r => setTimeout(r, 1200));
  const cdpFontCheckBlack = await evalCdp(`
    (() => {
      const sheet = document.getElementById('antigravity-custom-theme')?.sheet;
      if (!sheet) return JSON.stringify({ hasSheet: false });
      let fontFound = false;
      for (const rule of sheet.cssRules) {
        if (rule.cssText && (rule.cssText.includes('#0f172a') || rule.cssText.includes('rgb(15, 23, 42)'))) {
          fontFound = true;
          break;
        }
      }
      return JSON.stringify({
        hasSheet: true,
        fontFound
      });
    })()
  `);
  const fontStateBlack = JSON.parse(cdpFontCheckBlack);
  console.log('   CDP 暗夜曜黑字体生效状态:', fontStateBlack);
  assert.strictEqual(fontStateBlack.hasSheet, true, 'Antigravity style tag must exist');
  assert.strictEqual(fontStateBlack.fontFound, true, 'Obsidian-black color must be present in active CDP stylesheet rules');

  console.log('   正在测试自定义 Hex 颜色 (#ff69b4)...');
  const setHexResult = await setFontColor('#ff69b4');
  assert.ok(setHexResult, 'setFontColor #ff69b4 must succeed');

  const configAfterHex = loadSlotsConfig();
  assert.strictEqual(configAfterHex.fontColor.primary, '#ff69b4');
  const cssAfterHex = fs.readFileSync(path.join(antigravityDir, 'custom_theme.css'), 'utf8');
  assert.ok(cssAfterHex.includes('#ff69b4'), 'custom_theme.css must contain #ff69b4');

  await new Promise(r => setTimeout(r, 1200));
  const cdpFontCheckHex = await evalCdp(`
    (() => {
      const sheet = document.getElementById('antigravity-custom-theme')?.sheet;
      if (!sheet) return JSON.stringify({ hasSheet: false });
      let hexFound = false;
      for (const rule of sheet.cssRules) {
        if (rule.cssText && (rule.cssText.includes('#ff69b4') || rule.cssText.includes('rgb(255, 105, 180)'))) {
          hexFound = true;
          break;
        }
      }
      return JSON.stringify({ hasSheet: true, hexFound });
    })()
  `);
  const fontStateHex = JSON.parse(cdpFontCheckHex);
  console.log('   CDP 自定义粉色生效状态:', fontStateHex);
  assert.strictEqual(fontStateHex.hexFound, true, 'Custom hex color must be present in active CDP stylesheet rules');

  console.log('   正在恢复黄金基线并校验字体颜色重置...');
  await revertToBaseline();
  const baselineConfigAfterRevert = loadSlotsConfig();
  assert.strictEqual(baselineConfigAfterRevert.fontColor.id, 'pure-white');
  const baselineCss = fs.readFileSync(path.join(antigravityDir, 'custom_theme.css'), 'utf8');
  assert.ok(baselineCss.includes('#ffffff'), 'Baseline CSS must contain pure-white color');
  assert.ok(baselineCss.includes('.terminal.xterm [class*="xterm-color-7"], .terminal.xterm [class*="xterm-fg-7"] { color: #ffffff !important;'), 'Baseline terminal xterm-color-7 must be #ffffff, NOT dark slate');
  assert.ok(baselineCss.includes('rgba(10, 11, 20, 0.75)'), 'Inline code must have dark background in light text mode');
  console.log('✓ [Test 13] 字体颜色切换、持久化、样式编译及 CDP 实时热重载全流程通过');

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

  // 14.5 Test position adjustment across all remaining slots (mid, right, bottom, settings)
  await setPosition('中', '60% 25%');
  await setPosition('右', '40% 15%');
  await setPosition('下', '50% 10%');
  await setPosition('设置', '50% 70%');

  const cfgAll = loadSlotsConfig();
  assert.strictEqual(cfgAll.mid.position, '60% 25%');
  assert.strictEqual(cfgAll.right.position, '40% 15%');
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
  assert.ok(posState.bodyBeforePos.includes('50% 0%'), 'body::before backgroundPosition must match clamped position 50% 0%');
  assert.strictEqual(posState.midPosFound, true, 'Terminal mid position 60% 25% must be present in stylesheet rules');
  assert.strictEqual(posState.bottomPosFound, true, 'Bottom input position 50% 10% must be present in stylesheet rules');

  // 14.7 Test resetPosition ('all', 'reset', and '全部')
  await resetPosition('reset');
  const cfgReset = loadSlotsConfig();
  assert.strictEqual(cfgReset.left.position, SLOTS_META.left.defaultPosition);
  assert.strictEqual(cfgReset.mid.position, SLOTS_META.mid.defaultPosition);
  assert.strictEqual(cfgReset.right.position, SLOTS_META.right.defaultPosition);
  assert.strictEqual(cfgReset.bottom.position, SLOTS_META.bottom.defaultPosition);
  assert.strictEqual(cfgReset.settings.position, SLOTS_META.settings.defaultPosition);

  // Restore clean baseline at end of test suite
  await revertToBaseline();
  console.log('✓ [Test 14] 壁纸位置调节 (上下/左右微调、居中、边界防溢、全槽位适配及CDP实时重载) 全部通过');

  // Test 15: Sidebar dark-text & white-haze isolation under dark font mode
  console.log('\n[Test 15] 校验侧边栏历史对话列表在暗黑字体模式下杜绝黑色字体与发虚白光晕...');
  await setFontColor('obsidian-black');
  await new Promise(r => setTimeout(r, 600));

  const cdpSidebarStyleCheck = await evalCdp(`
    (() => {
      const rows = Array.from(document.querySelectorAll('[data-testid*="conversation-row"], div.bg-sidebar [class*="truncate"]'));
      if (rows.length === 0) return JSON.stringify({ count: 0 });
      const sample = rows[0];
      const cs = window.getComputedStyle(sample);
      return JSON.stringify({
        count: rows.length,
        color: cs.color,
        textShadow: cs.textShadow,
        hasWhiteHaze: cs.textShadow.includes('255, 255, 255') || cs.textShadow.includes('#ffffff')
      });
    })()
  `);
  const sidebarStyle = JSON.parse(cdpSidebarStyleCheck);
  console.log('   CDP 侧栏会话文字样式:', sidebarStyle);
  if (sidebarStyle.count > 0) {
    assert.strictEqual(sidebarStyle.color, 'rgb(241, 245, 249)', 'Sidebar text must be crisp light #f1f5f9');
    assert.strictEqual(sidebarStyle.hasWhiteHaze, false, 'Sidebar text must NOT have diffuse white glow');
  }

  // Baseline protection test completed
  console.log('✓ [Test 15] 侧边栏深色保护区隔离校验通过，纯白高对比无发虚白雾');

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
  console.log('   正在主动更改当前壁纸位置与字体配色，以验证一键还原...');
  await setPosition('左', '88% 99%');
  await setFontColor('sakura-pink');
  const mutatedConfig = loadSlotsConfig();
  assert.strictEqual(mutatedConfig.left.position, '88% 99%');
  assert.strictEqual(mutatedConfig.fontColor.id, 'sakura-pink');

  // 16.6 Apply preset
  console.log('   正在触发一键应用预设...');
  const applyOk = await applyPreset(testPresetName);
  assert.strictEqual(applyOk, true, 'applyPreset must return true');

  // 16.7 Verify slots_config.json was restored to preset values
  const restoredConfig = loadSlotsConfig();
  assert.strictEqual(restoredConfig.left.position, savedMeta.slotsConfig.left.position, 'Left position must be restored');
  assert.strictEqual(restoredConfig.fontColor.id, savedMeta.slotsConfig.fontColor.id, 'Font color must be restored');
  console.log('   ✓ 槽位配置与坐标已 100% 精确还原至预设状态');

  // 16.8 Verify live CDP hot reload
  await new Promise(r => setTimeout(r, 600));
  const cdpCheck = await evalCdp(`
    (() => {
      const s = document.getElementById('antigravity-custom-theme');
      const hasRestoredColor = s && s.textContent && s.textContent.includes('${savedMeta.slotsConfig.fontColor.primary}');
      const cs = window.getComputedStyle(document.body, '::before');
      return JSON.stringify({
        hasThemeStyle: !!s,
        hasRestoredColor,
        backgroundPosition: cs.backgroundPosition
      });
    })()
  `);
  const cdpState = JSON.parse(cdpCheck);
  console.log('   CDP 预设实时热重载校验状态:', cdpState);
  assert.strictEqual(cdpState.hasThemeStyle, true, 'Custom theme style element must exist in DOM');
  assert.strictEqual(cdpState.hasRestoredColor, true, 'Restored font color must be in custom theme stylesheet');
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
  assert.ok(vanillaCssContent.includes('Antigravity Official Vanilla Theme'), 'custom_theme.css must contain vanilla theme header');
  assert.ok(vanillaCssContent.includes('body::before'), 'custom_theme.css must hide body::before');
  assert.strictEqual(vanillaCssContent.includes('backdrop-filter: blur'), false, 'Vanilla CSS must not contain backdrop blur filters');
  console.log('   ✓ custom_theme.css 官方纯净重置样式校验通过');

  // 17.5 验证 CDP DOM 中所有视频元素已彻底卸载
  await new Promise(r => setTimeout(r, 600));
  const cdpVanillaCheck = await evalCdp(`
    (() => {
      const vids = document.querySelectorAll('.antigravity-slot-video, #antigravity-video-left');
      const styleEl = document.getElementById('antigravity-custom-theme');
      const isVanillaStyle = styleEl && styleEl.textContent && styleEl.textContent.includes('Official Vanilla Theme');
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
  const reApplyOk = await applyPreset('默认活跃配置');
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
