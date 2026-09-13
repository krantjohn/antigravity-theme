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
  revertToBaseline,
  loadSlotsConfig,
  saveSlotsConfig,
  setFontColor,
  listFontPresets,
  resolveFontColor,
  parseHexColor,
  adjustBrightness,
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

function evalCdp(expression) {
  return new Promise((resolve, reject) => {
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
          ws.addEventListener('open', () => {
            ws.send(JSON.stringify({ id: 1, method: 'Runtime.evaluate', params: { expression, awaitPromise: true } }));
          });
          ws.addEventListener('message', (evt) => {
            const resp = JSON.parse(evt.data);
            ws.close();
            if (resp.result && resp.result.result) {
              resolve(resp.result.result.value);
            } else {
              resolve(resp);
            }
          });
          ws.addEventListener('error', reject);
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

async function runTests() {
  console.log('=======================================================');
  console.log('   🧪 Antigravity 动态与静态壁纸深度自动化测试套件');
  console.log('=======================================================');
  console.log('');

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

  // Allow 500ms for CDP evaluation to settle
  await new Promise(r => setTimeout(r, 600));

  const cdpVideoCheck = await evalCdp(`
    new Promise((resolve) => {
      const start = Date.now();
      const check = () => {
        const v = document.getElementById('antigravity-video-left');
        if (v && v.paused) {
          v.play().catch(() => {});
        }
        if (v && v.readyState >= 1) {
          resolve(JSON.stringify({
            exists: true,
            src: v.src,
            paused: v.paused,
            readyState: v.readyState,
            slot: v.getAttribute('data-slot')
          }));
        } else if (Date.now() - start > 3000) {
          resolve(JSON.stringify({
            exists: !!v,
            src: v ? v.src : null,
            paused: v ? v.paused : null,
            readyState: v ? v.readyState : 0,
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
  await new Promise(r => setTimeout(r, 600));

  const cdpBottomCheck = await evalCdp(`
    new Promise((resolve) => {
      const start = Date.now();
      const check = () => {
        const vids = document.querySelectorAll('.antigravity-slot-video[data-slot="bottom"]');
        const v = vids[0];
        if (v && v.paused) {
          v.play().catch(() => {});
        }
        if (v && v.readyState >= 1 && !v.paused) {
          resolve(JSON.stringify({
            count: vids.length,
            src: v.src,
            paused: v.paused,
            readyState: v.readyState
          }));
        } else if (Date.now() - start > 4000) {
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

  // Test 6: Video swap on slot right (sidebar/drawer) with singleton isolation check
  console.log('\n[Test 6] 测试槽位【右】(独立抽屉/侧栏) 切换为动态视频并校验单例隔离...');
  const swapRightResult = await swapWallpaper('右', sampleVideoPath);
  assert.ok(swapRightResult);
  await new Promise(r => setTimeout(r, 600));

  const cdpRightCheck = await evalCdp(`
    new Promise((resolve) => {
      const start = Date.now();
      const check = () => {
        const hasContainer = !!document.querySelector('div[data-aux-pane-open="true"], [class*="terminal-drawer"]');
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

  // Test dynamic opening and closing of auxiliary pane
  const hasToggleBtn = await evalCdp(`!!document.querySelector('button[aria-label="Toggle Auxiliary Pane"]')`);
  if (hasToggleBtn) {
    // If currently open, close it first so we can deterministically test opening it
    if (rightState.hasContainer) {
      await evalCdp(`document.querySelector('button[aria-label="Toggle Auxiliary Pane"]').click()`);
      await new Promise(r => setTimeout(r, 600));
    }
    console.log('   正在测试动态展开辅助侧栏并校验 slot right 动态视频实时挂载...');
    await evalCdp(`document.querySelector('button[aria-label="Toggle Auxiliary Pane"]').click()`);
    let rightOpenState = { count: 0, readyState: 0 };
    for (let attempt = 0; attempt < 30; attempt++) {
      await new Promise(r => setTimeout(r, 100));
      const cdpRightOpenCheck = await evalCdp(`
        (() => {
          const vids = document.querySelectorAll('.antigravity-slot-video[data-slot="right"]');
          const v = vids[0];
          const container = document.querySelector('div[data-aux-pane-open="true"]');
          return JSON.stringify({
            count: vids.length,
            mountedInContainer: !!(v && container && container.contains(v)),
            readyState: v ? v.readyState : 0,
            paused: v ? v.paused : null
          });
        })()
      `);
      rightOpenState = JSON.parse(cdpRightOpenCheck);
      if (rightOpenState.count === 1 && rightOpenState.readyState >= 1) break;
    }
    console.log('   CDP 侧栏展开后视频挂载状态:', rightOpenState);
    assert.strictEqual(rightOpenState.count, 1, 'Exactly 1 right video must be mounted when auxiliary pane is open');
    assert.ok(rightOpenState.mountedInContainer, 'Video must be contained inside auxiliary drawer');
    assert.ok(rightOpenState.readyState >= 1, 'Right video must have readyState >= 1');

    // Close auxiliary pane again
    await evalCdp(`document.querySelector('button[aria-label="Toggle Auxiliary Pane"]').click()`);
    await new Promise(r => setTimeout(r, 800));

    const cdpRightClosedCheck = await evalCdp(`
      (() => {
        const vids = document.querySelectorAll('.antigravity-slot-video[data-slot="right"]');
        return JSON.stringify({ count: vids.length });
      })()
    `);
    const rightClosedState = JSON.parse(cdpRightClosedCheck);
    assert.strictEqual(rightClosedState.count, 0, 'Video must be cleanly unmounted when auxiliary pane is closed');
    console.log('   ✓ 辅助侧栏动态展开挂载与收起卸载生命周期闭环验证通过');
  }
  console.log('✓ [Test 6] 槽位【右】单例隔离校验通过 (准确控制视频实例，无DOM泄漏)');

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
            hasBackgroundImage: cs.backgroundImage.includes('data:image')
          }));
        } else if (Date.now() - start > 4000) {
          resolve(JSON.stringify({
            leftVideoExists: !!v,
            totalVideos: allVideos.length,
            hasBackgroundImage: cs.backgroundImage.includes('data:image')
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
  assert.strictEqual(staticState.hasBackgroundImage, true, 'body::before must contain base64 background-image');
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

  await new Promise(r => setTimeout(r, 600));
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

  await new Promise(r => setTimeout(r, 600));
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

  console.log('\n=======================================================');
  console.log('✨ 所有的 13 项单元与深度端到端实测全部通过 (PASS)！');
  console.log('=======================================================');
  process.exit(0);
}

runTests().catch(err => {
  console.error('❌ 测试失败:', err);
  process.exit(1);
});
