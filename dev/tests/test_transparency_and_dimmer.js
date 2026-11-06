/**
 * Comprehensive Verification Suite for Milestones 2 & 3 (R2, R3, R4, R5):
 * - R2: Independent Left Sidebar & Top Header Bar Optional Transparency
 * - R3: Regional Adjustable Dark Mask / Brightness Dimmer (0% - 80%)
 * - R4: Antigravity Theme Studio GUI Controls, Live Mockup Sync & REST API Integration
 * - R5: Preset Persistence, Zero-Diff Vanilla Guarantee & Live CDP 8314 DOM Verification
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const http = require('http');

const themeEngine = require('../../core/theme_engine');

function httpRequest(port, method, reqPath, body = null) {
  return new Promise((resolve, reject) => {
    const opts = {
      host: '127.0.0.1',
      port,
      path: reqPath,
      method,
      headers: {}
    };
    if (body !== null) {
      opts.headers['Content-Type'] = 'application/json';
    }
    const req = http.request(opts, (res) => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => {
        const buf = Buffer.concat(chunks);
        const text = buf.toString('utf8');
        let json = null;
        try { json = JSON.parse(text); } catch (_) {}
        resolve({ status: res.statusCode, text, json });
      });
    });
    req.on('error', reject);
    if (body !== null) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function evaluateOnCdp8314(expression) {
  const targets = await new Promise((resolve) => {
    const req = http.get('http://127.0.0.1:8314/json', { timeout: 1000 }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } catch (_) { resolve([]); }
      });
    });
    req.on('error', () => resolve([]));
    req.on('timeout', () => { req.destroy(); resolve([]); });
  });

  const pageTarget = targets.find(t => t.type === 'page' && t.webSocketDebuggerUrl && !t.title.includes('Launchpad'));
  if (!pageTarget) return null;

  return new Promise((resolve) => {
    const ws = new WebSocket(pageTarget.webSocketDebuggerUrl);
    const timer = setTimeout(() => {
      try { ws.close(); } catch (_) {}
      resolve(null);
    }, 3000);

    ws.onopen = () => {
      ws.send(JSON.stringify({
        id: 1,
        method: 'Runtime.evaluate',
        params: { expression, returnByValue: true }
      }));
    };
    ws.onmessage = (event) => {
      clearTimeout(timer);
      try {
        const msg = JSON.parse(event.data);
        ws.close();
        resolve(msg.result && msg.result.result ? msg.result.result.value : null);
      } catch (_) {
        try { ws.close(); } catch (_) {}
        resolve(null);
      }
    };
    ws.onerror = () => {
      clearTimeout(timer);
      resolve(null);
    };
  });
}

async function runTests() {
  console.log('======================================================================');
  console.log('   🧪 R2/R3/R4/R5 透明侧边栏、顶部状态栏与暗色遮罩全链路自动化测试');
  console.log('======================================================================');

  const configSnapshot = JSON.parse(JSON.stringify(themeEngine.loadSlotsConfig()));
  let serverInstance = null;

  try {
    // -----------------------------------------------------------------------
    // Phase 1: Normalization, Per-Slot Extraction & Sync Unit Tests
    // -----------------------------------------------------------------------
    console.log('\n[Phase 1] 校验 normalizeDarkMaskOpacity / getSlotDarkMaskOpacity / syncConfigDarkMaskOpacity 边界值与双向同步...');
    assert.strictEqual(themeEngine.normalizeDarkMaskOpacity(undefined), 0);
    assert.strictEqual(themeEngine.normalizeDarkMaskOpacity(null), 0);
    assert.strictEqual(themeEngine.normalizeDarkMaskOpacity(NaN), 0);
    assert.strictEqual(themeEngine.normalizeDarkMaskOpacity(false), 0);
    assert.strictEqual(themeEngine.normalizeDarkMaskOpacity(true), 0);
    assert.strictEqual(themeEngine.normalizeDarkMaskOpacity({}), 0);
    assert.strictEqual(themeEngine.normalizeDarkMaskOpacity([]), 0);
    assert.strictEqual(themeEngine.normalizeDarkMaskOpacity('invalid'), 0);
    assert.strictEqual(themeEngine.normalizeDarkMaskOpacity(-25), 0);
    assert.strictEqual(themeEngine.normalizeDarkMaskOpacity(0), 0);
    assert.strictEqual(themeEngine.normalizeDarkMaskOpacity(45), 45);
    assert.strictEqual(themeEngine.normalizeDarkMaskOpacity('60'), 60);
    assert.strictEqual(themeEngine.normalizeDarkMaskOpacity(80), 80);
    assert.strictEqual(themeEngine.normalizeDarkMaskOpacity(95), 80, 'Upper bound must clamp at 80%');
    assert.strictEqual(themeEngine.normalizeDarkMaskOpacity(0.45), 45, 'Decimal fraction (0,1) must normalize to percentage');

    assert.strictEqual(themeEngine.getDarkMaskAlpha(0), 0);
    assert.strictEqual(themeEngine.getDarkMaskAlpha(-10), 0);
    assert.strictEqual(themeEngine.getDarkMaskAlpha(35), 0.35);
    assert.strictEqual(themeEngine.getDarkMaskAlpha(80), 0.8);
    assert.strictEqual(themeEngine.getDarkMaskAlpha(100), 0.8);
    assert.strictEqual(themeEngine.getDarkMaskAlpha(0.5), 0.5);

    // Per-slot extraction & bidirectional sync between left.darkMaskOpacity and top-level darkMaskOpacity
    const syncTestCfg = {
      left: { file: 'a.mp4', type: 'video' },
      bottom: { file: 'b.mp4', type: 'video', darkMaskOpacity: 35 },
      settings: { file: 'c.mp4', type: 'video', darkMaskOpacity: 95 },
      darkMaskOpacity: 50
    };
    themeEngine.syncConfigDarkMaskOpacity(syncTestCfg);
    assert.strictEqual(syncTestCfg.left.darkMaskOpacity, 50, 'top-level darkMaskOpacity must sync into left.darkMaskOpacity');
    assert.strictEqual(syncTestCfg.darkMaskOpacity, 50);
    assert.strictEqual(syncTestCfg.bottom.darkMaskOpacity, 35);
    assert.strictEqual(syncTestCfg.settings.darkMaskOpacity, 80, 'settings.darkMaskOpacity must clamp to 80');

    // Mutate top-level darkMaskOpacity -> must propagate to left.darkMaskOpacity
    syncTestCfg.darkMaskOpacity = 25;
    themeEngine.syncConfigDarkMaskOpacity(syncTestCfg);
    assert.strictEqual(syncTestCfg.left.darkMaskOpacity, 25);
    assert.strictEqual(syncTestCfg.darkMaskOpacity, 25);

    // Mutate left.darkMaskOpacity -> must propagate to top-level darkMaskOpacity
    syncTestCfg.left.darkMaskOpacity = 65;
    themeEngine.syncConfigDarkMaskOpacity(syncTestCfg);
    assert.strictEqual(syncTestCfg.left.darkMaskOpacity, 65);
    assert.strictEqual(syncTestCfg.darkMaskOpacity, 65);
    console.log('   ✓ normalizeDarkMaskOpacity / getSlotDarkMaskOpacity / syncConfigDarkMaskOpacity 边界与双向同步测试全部通过');

    // -----------------------------------------------------------------------
    // Phase 2: generateMasterCss Conditional Injection & Per-Slot Dark Mask
    // -----------------------------------------------------------------------
    console.log('\n[Phase 2] 校验 generateMasterCss 三槽位独立遮罩、主对话右侧栏联动与零污染保证...');
    const baseMockConfig = {
      isOriginal: false,
      left: { key: 'left', file: 'left_wallpaper.mp4', type: 'video', position: 'center center', darkMaskOpacity: 0 },
      bottom: { key: 'bottom', file: '', type: 'none', position: 'center center', isOriginal: true, darkMaskOpacity: 0 },
      settings: { key: 'settings', file: '', type: 'none', position: 'center center', isOriginal: true, darkMaskOpacity: 0 },
      transparentSidebar: false,
      transparentHeader: false,
      darkMaskOpacity: 0
    };

    // 2.1 Default disabled -> zero overrides for sidebar, header, or any slot dimmer
    const cssDefault = themeEngine.generateMasterCss(baseMockConfig);
    assert(!cssDefault.includes('3a. Optional Left Sidebar Transparency'), 'Default config must not emit sidebar transparency');
    assert(!cssDefault.includes('3b. Optional Top Header Bar Transparency'), 'Default config must not emit header transparency');
    assert(!cssDefault.includes('3c. Regional Adjustable Dark Mask'), 'Default config must not emit left dark mask');
    assert(!cssDefault.includes('5b. Input Box Dark Mask'), 'Default config must not emit bottom dark mask');
    assert(!cssDefault.includes('6b. Settings Dialog Dark Mask'), 'Default config must not emit settings dark mask');
    assert(!cssDefault.includes('div[role="navigation"][aria-label="Sidebar"]'), 'Default config must not touch Sidebar');
    assert(!cssDefault.includes('[data-testid="title-menu-bar"]'), 'Default config must not touch Title Menu Bar');

    // 2.2 Only transparentSidebar = true
    const cssSidebarOnly = themeEngine.generateMasterCss({
      ...baseMockConfig,
      transparentSidebar: true
    });
    assert(cssSidebarOnly.includes('3a. Optional Left Sidebar Transparency'), 'Must emit 3a when transparentSidebar is true');
    assert(cssSidebarOnly.includes('div[role="navigation"][aria-label="Sidebar"]'), 'Must target Sidebar selector');
    assert(cssSidebarOnly.includes('rgba(17, 17, 20, 0.45)'), 'Must apply translucent frosted glass to Sidebar');
    assert(cssSidebarOnly.includes('div[role="navigation"][aria-label="Sidebar"] .bg-sidebar'), 'Must clear inner .bg-sidebar opaque strips');
    assert(!cssSidebarOnly.includes('3b. Optional Top Header Bar Transparency'), 'Must not emit 3b when transparentHeader is false');
    assert(!cssSidebarOnly.includes('3c. Regional Adjustable Dark Mask'), 'Must not emit 3c when darkMaskOpacity is 0');

    // 2.3 Only transparentHeader = true
    const cssHeaderOnly = themeEngine.generateMasterCss({
      ...baseMockConfig,
      transparentHeader: true
    });
    assert(cssHeaderOnly.includes('3b. Optional Top Header Bar Transparency'), 'Must emit 3b when transparentHeader is true');
    assert(cssHeaderOnly.includes('[data-testid="title-menu-bar"]'), 'Must target title-menu-bar');
    assert(cssHeaderOnly.includes('rgba(17, 17, 20, 0.45)'), 'Must apply translucent frosted glass to Header');
    assert(!cssHeaderOnly.includes('3a. Optional Left Sidebar Transparency'), 'Must not emit 3a when transparentSidebar is false');
    assert(!cssHeaderOnly.includes('3c. Regional Adjustable Dark Mask'), 'Must not emit 3c when darkMaskOpacity is 0');

    // 2.4 Left darkMaskOpacity = 45 -> must dim BOTH main conversation AND right auxiliary pane
    const cssMaskOnly = themeEngine.generateMasterCss({
      ...baseMockConfig,
      left: { ...baseMockConfig.left, darkMaskOpacity: 45 },
      darkMaskOpacity: 45
    });
    assert(cssMaskOnly.includes('3c. Regional Adjustable Dark Mask'), 'Must emit 3c when left darkMaskOpacity > 0');
    assert(cssMaskOnly.includes('div[data-testid="aux-pane-split"] > div.flex:first-child'), 'Must target main conversation region');
    assert(cssMaskOnly.includes('div[data-testid="aux-pane-split"] > div:not(:first-child):not(.bg-border)'), 'Must target right auxiliary pane in aux-pane-split');
    assert(cssMaskOnly.includes('[aria-label="Auxiliary Pane"]'), 'Must target Auxiliary Pane selector');
    assert(cssMaskOnly.includes('rgba(7, 9, 14, 0.45)'), 'Must emit exact alpha 0.45 with rgba(7, 9, 14, 0.45)');
    assert(!cssMaskOnly.includes('3a. Optional Left Sidebar Transparency'));
    assert(!cssMaskOnly.includes('3b. Optional Top Header Bar Transparency'));

    // 2.5 Per-Slot Independent Dark Masks: bottom (50%) and settings (65%)
    const cssPerSlotMasks = themeEngine.generateMasterCss({
      ...baseMockConfig,
      left: { ...baseMockConfig.left, darkMaskOpacity: 30 },
      bottom: { key: 'bottom', file: 'input_wallpaper.mp4', type: 'video', position: 'center center', isOriginal: false, darkMaskOpacity: 50 },
      settings: { key: 'settings', file: 'settings_wallpaper.mp4', type: 'video', position: 'center center', isOriginal: false, darkMaskOpacity: 65 }
    });
    assert(cssPerSlotMasks.includes('3c. Regional Adjustable Dark Mask'), 'Must emit 3c for left');
    assert(cssPerSlotMasks.includes('rgba(7, 9, 14, 0.3)'), 'Must emit left alpha 0.3');
    assert(cssPerSlotMasks.includes('5b. Input Box Dark Mask / Brightness Dimmer (slot: bottom)'), 'Must emit 5b for bottom');
    assert(cssPerSlotMasks.includes('linear-gradient(rgba(7, 9, 14, 0.5), rgba(7, 9, 14, 0.5))'), 'Must layer linear-gradient 0.5 on bottom');
    assert(cssPerSlotMasks.includes(':has(> .antigravity-slot-video[data-slot="bottom"])::after'), 'Must emit ::after video dimmer for bottom');
    assert(cssPerSlotMasks.includes('6b. Settings Dialog Dark Mask / Brightness Dimmer (slot: settings)'), 'Must emit 6b for settings');
    assert(cssPerSlotMasks.includes('linear-gradient(rgba(7, 9, 14, 0.65), rgba(7, 9, 14, 0.65))'), 'Must layer linear-gradient 0.65 on settings');
    assert(cssPerSlotMasks.includes(':has(> .antigravity-slot-video[data-slot="settings"])::after'), 'Must emit ::after video dimmer for settings');

    // 2.6 Combined: Sidebar + Header + Dark Mask (80%)
    const cssCombined = themeEngine.generateMasterCss({
      ...baseMockConfig,
      transparentSidebar: true,
      transparentHeader: true,
      darkMaskOpacity: 80
    });
    assert(cssCombined.includes('3a. Optional Left Sidebar Transparency'));
    assert(cssCombined.includes('3b. Optional Top Header Bar Transparency'));
    assert(cssCombined.includes('3c. Regional Adjustable Dark Mask'));
    assert(cssCombined.includes('rgba(7, 9, 14, 0.8)'));

    // 2.7 Vanilla / Inactive slots -> zero overrides even if flags/masks are set
    const cssVanilla = themeEngine.generateMasterCss({
      ...baseMockConfig,
      isOriginal: true,
      transparentSidebar: true,
      transparentHeader: true,
      darkMaskOpacity: 60,
      left: { ...baseMockConfig.left, darkMaskOpacity: 60 },
      bottom: { ...baseMockConfig.bottom, darkMaskOpacity: 60 },
      settings: { ...baseMockConfig.settings, darkMaskOpacity: 60 }
    });
    assert.strictEqual(cssVanilla, '/* Antigravity Wallpaper Engine: Vanilla Mode */\n', 'Vanilla mode must emit only the Vanilla Mode comment');

    const cssInactiveLeftButActiveBottom = themeEngine.generateMasterCss({
      ...baseMockConfig,
      left: { key: 'left', file: '', type: 'none', isOriginal: true, darkMaskOpacity: 60 },
      bottom: { key: 'bottom', file: 'input_wallpaper.mp4', type: 'video', position: 'center center', isOriginal: false, darkMaskOpacity: 40 },
      transparentSidebar: true,
      transparentHeader: true,
      darkMaskOpacity: 60
    });
    assert(!cssInactiveLeftButActiveBottom.includes('3a. Optional Left Sidebar Transparency'), 'Inactive left slot must not make sidebar transparent');
    assert(!cssInactiveLeftButActiveBottom.includes('3b. Optional Top Header Bar Transparency'), 'Inactive left slot must not make header transparent');
    assert(!cssInactiveLeftButActiveBottom.includes('3c. Regional Adjustable Dark Mask'), 'Inactive left slot must not apply left dark mask');
    assert(cssInactiveLeftButActiveBottom.includes('5b. Input Box Dark Mask / Brightness Dimmer (slot: bottom)'), 'Active bottom slot must still emit its own 40% dark mask');
    console.log('   ✓ generateMasterCss 三槽位独立遮罩、主对话右侧栏联动与零污染校验全部通过');

    // -----------------------------------------------------------------------
    // Phase 3: Persistence across batchApplyDraft, Presets, Vanilla & Baseline
    // -----------------------------------------------------------------------
    console.log('\n[Phase 3] 校验三槽位独立遮罩在草稿提交、预设存取、单槽位还原与原版重置中的持久化...');
    const sampleLeft = (configSnapshot.left && configSnapshot.left.file) || 'left_wallpaper.mp4';
    const sampleBottom = (configSnapshot.bottom && configSnapshot.bottom.file) || sampleLeft;
    const sampleSettings = (configSnapshot.settings && configSnapshot.settings.file) || sampleLeft;
    const draftToApply = {
      ...configSnapshot,
      isOriginal: false,
      left: {
        ...(configSnapshot.left || {}),
        key: 'left',
        file: sampleLeft,
        type: sampleLeft.endsWith('.mp4') ? 'video' : 'image',
        position: 'center center',
        isOriginal: false,
        darkMaskOpacity: 55
      },
      bottom: {
        ...(configSnapshot.bottom || {}),
        key: 'bottom',
        file: sampleBottom,
        type: sampleBottom.endsWith('.mp4') ? 'video' : 'image',
        position: 'center center',
        isOriginal: false,
        darkMaskOpacity: 45
      },
      settings: {
        ...(configSnapshot.settings || {}),
        key: 'settings',
        file: sampleSettings,
        type: sampleSettings.endsWith('.mp4') ? 'video' : 'image',
        position: 'center center',
        isOriginal: false,
        darkMaskOpacity: 60
      },
      transparentSidebar: true,
      transparentHeader: true,
      darkMaskOpacity: 55
    };

    const appliedCfg = await themeEngine.batchApplyDraft(draftToApply);
    assert.strictEqual(appliedCfg.transparentSidebar, true);
    assert.strictEqual(appliedCfg.transparentHeader, true);
    assert.strictEqual(appliedCfg.darkMaskOpacity, 55);
    assert.strictEqual(appliedCfg.left.darkMaskOpacity, 55);
    assert.strictEqual(appliedCfg.bottom.darkMaskOpacity, 45);
    assert.strictEqual(appliedCfg.settings.darkMaskOpacity, 60);

    const diskCfg = themeEngine.loadSlotsConfig();
    assert.strictEqual(diskCfg.transparentSidebar, true);
    assert.strictEqual(diskCfg.transparentHeader, true);
    assert.strictEqual(diskCfg.darkMaskOpacity, 55);
    assert.strictEqual(diskCfg.left.darkMaskOpacity, 55);
    assert.strictEqual(diskCfg.bottom.darkMaskOpacity, 45);
    assert.strictEqual(diskCfg.settings.darkMaskOpacity, 60);

    const testPresetName = `R2_R3_AutoTest_${Date.now()}`;
    try {
      const savedManifest = themeEngine.savePreset(testPresetName, 'R2/R3/R4 per-slot dark mask test preset');
      assert(savedManifest && savedManifest.slotsConfig, 'savePreset must return manifest with slotsConfig');
      assert.strictEqual(savedManifest.slotsConfig.transparentSidebar, true);
      assert.strictEqual(savedManifest.slotsConfig.transparentHeader, true);
      assert.strictEqual(savedManifest.slotsConfig.darkMaskOpacity, 55);
      assert.strictEqual(savedManifest.slotsConfig.left.darkMaskOpacity, 55);
      assert.strictEqual(savedManifest.slotsConfig.bottom.darkMaskOpacity, 45);
      assert.strictEqual(savedManifest.slotsConfig.settings.darkMaskOpacity, 60);

      // Restore original vanilla -> must reset all flags and per-slot masks to false / 0
      await themeEngine.restoreOriginal();
      const vanillaCfg = themeEngine.loadSlotsConfig();
      assert.strictEqual(vanillaCfg.isOriginal, true);
      assert.strictEqual(vanillaCfg.transparentSidebar, false);
      assert.strictEqual(vanillaCfg.transparentHeader, false);
      assert.strictEqual(vanillaCfg.darkMaskOpacity, 0);
      assert.strictEqual(vanillaCfg.left.darkMaskOpacity, 0);
      assert.strictEqual(vanillaCfg.bottom.darkMaskOpacity, 0);
      assert.strictEqual(vanillaCfg.settings.darkMaskOpacity, 0);

      // Apply saved preset -> must restore flags and all 3 per-slot dark masks (55 / 45 / 60)
      const presetAppliedOk = await themeEngine.applyPreset(testPresetName);
      assert(presetAppliedOk, 'applyPreset must succeed');
      const restoredFromPreset = themeEngine.loadSlotsConfig();
      assert.strictEqual(restoredFromPreset.transparentSidebar, true);
      assert.strictEqual(restoredFromPreset.transparentHeader, true);
      assert.strictEqual(restoredFromPreset.darkMaskOpacity, 55);
      assert.strictEqual(restoredFromPreset.left.darkMaskOpacity, 55);
      assert.strictEqual(restoredFromPreset.bottom.darkMaskOpacity, 45);
      assert.strictEqual(restoredFromPreset.settings.darkMaskOpacity, 60);
    } finally {
      try { themeEngine.deletePreset(testPresetName); } catch (_) {}
      try {
        (themeEngine.listPresets() || []).forEach(p => {
          if (p.name && p.name.startsWith('R2_R3_AutoTest_')) {
            themeEngine.deletePreset(p.name);
          }
        });
      } catch (_) {}
    }
    console.log('   ✓ 三槽位独立遮罩在草稿固化、预设保存/恢复、原版重置中的持久化校验全部通过');

    // -----------------------------------------------------------------------
    // Phase 4: Live CDP 8314 DOM Verification (if Antigravity is running)
    // -----------------------------------------------------------------------
    console.log('\n[Phase 4] 校验 CDP 8314 实时 DOM 样式计算 (主对话区 + 右侧副栏联动遮罩 + 提问框遮罩)...');
    const liveStyles = await evaluateOnCdp8314(`(function() {
      var sb = document.querySelector('div[role="navigation"][aria-label="Sidebar"]');
      var hdr = document.querySelector('[data-testid="title-menu-bar"]');
      var hdrParent = hdr ? hdr.parentElement : null;
      var sheet = document.querySelector('.agy-sheet');
      var split = document.querySelector('div[data-testid="aux-pane-split"]');
      var chat = document.querySelector('div[data-testid="aux-pane-split"] > div.flex:first-child') || sheet;
      var aux = document.querySelector('div[data-testid="aux-pane-split"] > div:not(:first-child):not(.bg-border)') || document.querySelector('[aria-label="Auxiliary Pane"]');
      var auxInner = aux ? aux.querySelector('.browser-hole-ancestor') : null;
      var composer = document.querySelector('#antigravity\\\\.agentSidePanelInputBox .surface-composer-card');
      var composerAfterBg = composer ? window.getComputedStyle(composer, '::after').backgroundColor : null;
      return {
        hasSidebar: Boolean(sb),
        sidebarBg: sb ? window.getComputedStyle(sb).backgroundColor : null,
        hasHeader: Boolean(hdr),
        headerBg: hdr ? window.getComputedStyle(hdr).backgroundColor : null,
        headerParentBg: hdrParent ? window.getComputedStyle(hdrParent).backgroundColor : null,
        sheetBg: sheet ? window.getComputedStyle(sheet).backgroundColor : null,
        splitBg: split ? window.getComputedStyle(split).backgroundColor : null,
        hasChat: Boolean(chat),
        chatBg: chat ? window.getComputedStyle(chat).backgroundColor : null,
        hasAux: Boolean(aux),
        auxBg: aux ? window.getComputedStyle(aux).backgroundColor : null,
        auxInnerBg: auxInner ? window.getComputedStyle(auxInner).backgroundColor : null,
        hasComposer: Boolean(composer),
        composerBgImage: composer ? window.getComputedStyle(composer).backgroundImage : null,
        composerAfterBg: composerAfterBg
      };
    })()`);

    if (liveStyles && liveStyles.hasSidebar && liveStyles.hasHeader) {
      assert.strictEqual(liveStyles.sidebarBg, 'rgba(17, 17, 20, 0.45)', 'Live Sidebar computed background-color must be rgba(17, 17, 20, 0.45)');
      assert.strictEqual(liveStyles.headerBg, 'rgba(17, 17, 20, 0.45)', 'Live Header computed background-color must be rgba(17, 17, 20, 0.45)');
      assert.strictEqual(liveStyles.headerParentBg, 'rgba(0, 0, 0, 0)', 'Live Header parent wrapper must remain transparent rgba(0, 0, 0, 0)');
      if (liveStyles.hasChat) {
        assert.strictEqual(liveStyles.chatBg, 'rgba(7, 9, 14, 0.55)', 'Live Main Conversation regional dark mask must be rgba(7, 9, 14, 0.55)');
      }
      if (liveStyles.hasAux) {
        assert.strictEqual(liveStyles.auxBg, 'rgba(7, 9, 14, 0.55)', 'Live Right Auxiliary Pane dark mask must match Main Conversation at rgba(7, 9, 14, 0.55)');
        if (liveStyles.splitBg !== null) {
          assert.strictEqual(liveStyles.splitBg, 'rgba(0, 0, 0, 0)', 'aux-pane-split wrapper must remain transparent to prevent double-stacking');
        }
        if (liveStyles.auxInnerBg !== null) {
          assert.strictEqual(liveStyles.auxInnerBg, 'rgba(0, 0, 0, 0)', 'Nested child inside Right Auxiliary Pane must remain transparent to prevent double-stacking');
        }
      }
      if (liveStyles.hasComposer) {
        const hasBottomDimmer = (liveStyles.composerBgImage && liveStyles.composerBgImage.includes('rgba(7, 9, 14, 0.45)')) ||
          liveStyles.composerAfterBg === 'rgba(7, 9, 14, 0.45)';
        assert(hasBottomDimmer, 'Live Input Box (.surface-composer-card) must have 45% dark mask rgba(7, 9, 14, 0.45)');
      }
      console.log(`   ✓ CDP 8314 开启态实时计算样式验证通过 (无双层叠加): Sidebar=${liveStyles.sidebarBg}, Header=${liveStyles.headerBg}, MainChat=${liveStyles.chatBg}, RightAuxPane=${liveStyles.auxBg}, AuxInner=${liveStyles.auxInnerBg}`);

      // Edge Case: restoreSlotVanilla('left') must clear left & right aux pane mask to 0, while keeping bottom's 45% mask intact
      await themeEngine.restoreSlotVanilla('left');
      const afterLeftVanillaCfg = themeEngine.loadSlotsConfig();
      assert.strictEqual(afterLeftVanillaCfg.left.darkMaskOpacity, 0, 'restoreSlotVanilla(left) must reset left.darkMaskOpacity to 0');
      assert.strictEqual(afterLeftVanillaCfg.darkMaskOpacity, 0, 'restoreSlotVanilla(left) must reset top-level darkMaskOpacity to 0');
      assert.strictEqual(afterLeftVanillaCfg.bottom.darkMaskOpacity, 45, 'restoreSlotVanilla(left) must preserve bottom.darkMaskOpacity = 45');
      assert.strictEqual(afterLeftVanillaCfg.settings.darkMaskOpacity, 60, 'restoreSlotVanilla(left) must preserve settings.darkMaskOpacity = 60');

      const afterLeftVanillaCss = themeEngine.generateMasterCss(afterLeftVanillaCfg);
      assert(!afterLeftVanillaCss.includes('3a. Optional Left Sidebar Transparency'), 'restoreSlotVanilla(left) must suppress 3a');
      assert(!afterLeftVanillaCss.includes('3b. Optional Top Header Bar Transparency'), 'restoreSlotVanilla(left) must suppress 3b');
      assert(!afterLeftVanillaCss.includes('3c. Regional Adjustable Dark Mask'), 'restoreSlotVanilla(left) must suppress 3c');
      assert(afterLeftVanillaCss.includes('5b. Input Box Dark Mask'), 'restoreSlotVanilla(left) must keep 5b active for bottom');

      const liveAfterLeftVanilla = await evaluateOnCdp8314(`(function() {
        var sb = document.querySelector('div[role="navigation"][aria-label="Sidebar"]');
        var hdr = document.querySelector('[data-testid="title-menu-bar"]');
        var chat = document.querySelector('div[data-testid="aux-pane-split"] > div.flex:first-child') || document.querySelector('.agy-sheet');
        var aux = document.querySelector('div[data-testid="aux-pane-split"] > div:not(:first-child):not(.bg-border)');
        return {
          sidebarBg: sb ? window.getComputedStyle(sb).backgroundColor : null,
          headerBg: hdr ? window.getComputedStyle(hdr).backgroundColor : null,
          chatBg: chat ? window.getComputedStyle(chat).backgroundColor : null,
          auxBg: aux ? window.getComputedStyle(aux).backgroundColor : null
        };
      })()`);
      if (liveAfterLeftVanilla) {
        assert.strictEqual(liveAfterLeftVanilla.sidebarBg, 'rgb(17, 17, 20)', 'Sidebar must revert to stock opaque when left slot is restored to vanilla');
        assert.strictEqual(liveAfterLeftVanilla.headerBg, 'rgb(17, 17, 20)', 'Header must revert to stock opaque when left slot is restored to vanilla');
        if (liveAfterLeftVanilla.chatBg) {
          assert.strictEqual(liveAfterLeftVanilla.chatBg, 'rgba(0, 0, 0, 0)', 'ChatDimmer must revert to transparent when left slot is restored to vanilla');
        }
        if (liveAfterLeftVanilla.auxBg) {
          assert.strictEqual(liveAfterLeftVanilla.auxBg, 'rgba(0, 0, 0, 0)', 'RightAuxPane must revert to transparent when left slot is restored to vanilla');
        }
      }

      // Now explicitly disable toggles & all slot dimmers with active left slot and verify stock restoration in live DOM
      await themeEngine.batchApplyDraft({
        ...draftToApply,
        left: { ...draftToApply.left, darkMaskOpacity: 0 },
        bottom: { ...draftToApply.bottom, darkMaskOpacity: 0 },
        settings: { ...draftToApply.settings, darkMaskOpacity: 0 },
        transparentSidebar: false,
        transparentHeader: false,
        darkMaskOpacity: 0
      });
      const liveOpaqueStyles = await evaluateOnCdp8314(`(function() {
        var sb = document.querySelector('div[role="navigation"][aria-label="Sidebar"]');
        var hdr = document.querySelector('[data-testid="title-menu-bar"]');
        var chat = document.querySelector('div[data-testid="aux-pane-split"] > div.flex:first-child') || document.querySelector('.agy-sheet');
        var aux = document.querySelector('div[data-testid="aux-pane-split"] > div:not(:first-child):not(.bg-border)');
        return {
          sidebarBg: sb ? window.getComputedStyle(sb).backgroundColor : null,
          headerBg: hdr ? window.getComputedStyle(hdr).backgroundColor : null,
          chatBg: chat ? window.getComputedStyle(chat).backgroundColor : null,
          auxBg: aux ? window.getComputedStyle(aux).backgroundColor : null
        };
      })()`);
      if (liveOpaqueStyles) {
        assert.strictEqual(liveOpaqueStyles.sidebarBg, 'rgb(17, 17, 20)', 'Disabled Sidebar must revert to stock opaque rgb(17, 17, 20)');
        assert.strictEqual(liveOpaqueStyles.headerBg, 'rgb(17, 17, 20)', 'Disabled Header must revert to stock opaque rgb(17, 17, 20)');
        if (liveOpaqueStyles.chatBg) {
          assert.strictEqual(liveOpaqueStyles.chatBg, 'rgba(0, 0, 0, 0)', 'Disabled ChatDimmer must revert to rgba(0, 0, 0, 0)');
        }
        if (liveOpaqueStyles.auxBg) {
          assert.strictEqual(liveOpaqueStyles.auxBg, 'rgba(0, 0, 0, 0)', 'Disabled RightAuxPane dimmer must revert to rgba(0, 0, 0, 0)');
        }
        console.log(`   ✓ CDP 8314 关闭态与单槽位恢复原版验证通过: Sidebar=${liveOpaqueStyles.sidebarBg}, Header=${liveOpaqueStyles.headerBg}, MainChat=${liveOpaqueStyles.chatBg}, RightAuxPane=${liveOpaqueStyles.auxBg}`);
      }
    } else {
      console.log('   ℹ️ CDP 8314 离线或无活动页面，跳过实时 DOM 计算样式断言');
    }

    // -----------------------------------------------------------------------
    // Phase 5: Studio GUI Assets & REST API Integration (Port 8316)
    // -----------------------------------------------------------------------
    console.log('\n[Phase 5] 校验 Theme Studio 前端三槽位遮罩控件与 REST API (/api/theme/apply-draft & /api/apply-draft & /api/presets/save)...');
    const { server, PORT } = require('../../studio/server');
    serverInstance = server;

    const htmlRes = await httpRequest(PORT, 'GET', '/');
    assert.strictEqual(htmlRes.status, 200);
    assert(htmlRes.text.includes('id="section-transparency-dimmer"'), 'index.html must include #section-transparency-dimmer');
    assert(htmlRes.text.includes('id="toggle-transparent-sidebar"'), 'index.html must include #toggle-transparent-sidebar');
    assert(htmlRes.text.includes('id="toggle-transparent-header"'), 'index.html must include #toggle-transparent-header');
    assert(htmlRes.text.includes('id="label-dark-mask"'), 'index.html must include #label-dark-mask');
    assert(htmlRes.text.includes('id="slider-dark-mask"'), 'index.html must include #slider-dark-mask');
    assert(htmlRes.text.includes('左侧对话栏透明'), 'index.html must include Chinese label for sidebar transparency');
    assert(htmlRes.text.includes('顶部状态栏透明'), 'index.html must include Chinese label for header transparency');
    assert(htmlRes.text.includes('壁纸暗色遮罩 / 亮度调节'), 'index.html must include Chinese label for dark mask slider');

    const cssRes = await httpRequest(PORT, 'GET', '/style.css');
    assert.strictEqual(cssRes.status, 200);
    assert(cssRes.text.includes('.mockup-window.transparent-sidebar'), 'style.css must include .mockup-window.transparent-sidebar');
    assert(cssRes.text.includes('.mockup-window.transparent-header'), 'style.css must include .mockup-window.transparent-header');
    assert(cssRes.text.includes('#mock-right-pane::before'), 'style.css must include #mock-right-pane::before for right pane dark mask');
    assert(cssRes.text.includes('.mock-chat-area::before'), 'style.css must include .mock-chat-area::before for main chat dark mask');
    assert(cssRes.text.includes('.mock-aux-pane::before'), 'style.css must include .mock-aux-pane::before for right pane dark mask');
    assert(cssRes.text.includes('#mock-slot-bottom::before'), 'style.css must include #mock-slot-bottom::before for bottom dark mask');
    assert(cssRes.text.includes('#mock-slot-settings::before'), 'style.css must include #mock-slot-settings::before for settings dark mask');
    assert(cssRes.text.includes('--mock-dark-mask-opacity'), 'style.css must include --mock-dark-mask-opacity');
    assert(cssRes.text.includes('--mock-bottom-dark-mask-opacity'), 'style.css must include --mock-bottom-dark-mask-opacity');
    assert(cssRes.text.includes('--mock-settings-dark-mask-opacity'), 'style.css must include --mock-settings-dark-mask-opacity');

    const jsRes = await httpRequest(PORT, 'GET', '/app.js');
    assert.strictEqual(jsRes.status, 200);
    assert(jsRes.text.includes('toggleTransparentSidebar'), 'app.js must reference toggleTransparentSidebar');
    assert(jsRes.text.includes('toggleTransparentHeader'), 'app.js must reference toggleTransparentHeader');
    assert(jsRes.text.includes('sliderDarkMask'), 'app.js must reference sliderDarkMask');
    assert(jsRes.text.includes('getSlotDarkMask'), 'app.js must include getSlotDarkMask');
    assert(jsRes.text.includes('setSlotDarkMask'), 'app.js must include setSlotDarkMask');
    assert(jsRes.text.includes('ensureDraftConfig'), 'app.js must include ensureDraftConfig');
    assert(!jsRes.text.includes('sliderDarkMask.disabled = Boolean(isVanilla)'), 'app.js must not disable sliderDarkMask on vanilla');
    assert(jsRes.text.includes('sliderDarkMask.disabled = false'), 'app.js must keep sliderDarkMask enabled across slots');
    assert(jsRes.text.includes('--mock-bottom-dark-mask-opacity'), 'app.js must update --mock-bottom-dark-mask-opacity');
    assert(jsRes.text.includes('--mock-settings-dark-mask-opacity'), 'app.js must update --mock-settings-dark-mask-opacity');

    const i18nRes = await httpRequest(PORT, 'GET', '/i18n.js');
    assert.strictEqual(i18nRes.status, 200);
    assert(i18nRes.text.includes('dimmer.dark_mask_label_left'), 'i18n.js must include dimmer.dark_mask_label_left');
    assert(i18nRes.text.includes('dimmer.dark_mask_label_bottom'), 'i18n.js must include dimmer.dark_mask_label_bottom');
    assert(i18nRes.text.includes('dimmer.dark_mask_label_settings'), 'i18n.js must include dimmer.dark_mask_label_settings');

    // Test POST /api/apply-draft and POST /api/theme/apply-draft with per-slot darkMaskOpacity
    const apiApplyRes = await httpRequest(PORT, 'POST', '/api/apply-draft', {
      draftConfig: {
        ...draftToApply,
        left: { ...draftToApply.left, darkMaskOpacity: 35 },
        bottom: { ...draftToApply.bottom, darkMaskOpacity: 50 },
        settings: { ...draftToApply.settings, darkMaskOpacity: 70 },
        transparentSidebar: true,
        transparentHeader: false,
        darkMaskOpacity: 35
      }
    });
    assert.strictEqual(apiApplyRes.status, 200);
    assert.strictEqual(apiApplyRes.json.success, true);
    assert.strictEqual(apiApplyRes.json.slotsConfig.transparentSidebar, true);
    assert.strictEqual(apiApplyRes.json.slotsConfig.transparentHeader, false);
    assert.strictEqual(apiApplyRes.json.slotsConfig.darkMaskOpacity, 35);
    assert.strictEqual(apiApplyRes.json.slotsConfig.left.darkMaskOpacity, 35);
    assert.strictEqual(apiApplyRes.json.slotsConfig.bottom.darkMaskOpacity, 50);
    assert.strictEqual(apiApplyRes.json.slotsConfig.settings.darkMaskOpacity, 70);

    const statusRes = await httpRequest(PORT, 'GET', '/api/status');
    assert.strictEqual(statusRes.status, 200);
    assert.strictEqual(statusRes.json.slotsConfig.transparentSidebar, true);
    assert.strictEqual(statusRes.json.slotsConfig.transparentHeader, false);
    assert.strictEqual(statusRes.json.slotsConfig.darkMaskOpacity, 35);
    assert.strictEqual(statusRes.json.slotsConfig.left.darkMaskOpacity, 35);
    assert.strictEqual(statusRes.json.slotsConfig.bottom.darkMaskOpacity, 50);
    assert.strictEqual(statusRes.json.slotsConfig.settings.darkMaskOpacity, 70);

    // Test POST /api/presets/save with uncommitted draftConfig from Studio draft bar
    const studioDraftPresetName = `R2_R3_StudioDraftPreset_${Date.now()}`;
    try {
      const saveDraftPresetRes = await httpRequest(PORT, 'POST', '/api/presets/save', {
        name: studioDraftPresetName,
        draftConfig: {
          ...draftToApply,
          left: { ...draftToApply.left, darkMaskOpacity: 65 },
          bottom: { ...draftToApply.bottom, darkMaskOpacity: 25 },
          settings: { ...draftToApply.settings, darkMaskOpacity: 40 },
          transparentSidebar: false,
          transparentHeader: true,
          darkMaskOpacity: 65
        }
      });
      assert.strictEqual(saveDraftPresetRes.status, 200);
      assert.strictEqual(saveDraftPresetRes.json.success, true);
      const savedDetails = themeEngine.getPresetDetails(studioDraftPresetName);
      assert(savedDetails && savedDetails.preset && savedDetails.preset.slotsConfig, 'Saved studio draft preset must exist');
      assert.strictEqual(savedDetails.preset.slotsConfig.transparentSidebar, false);
      assert.strictEqual(savedDetails.preset.slotsConfig.transparentHeader, true);
      assert.strictEqual(savedDetails.preset.slotsConfig.darkMaskOpacity, 65);
      assert.strictEqual(savedDetails.preset.slotsConfig.left.darkMaskOpacity, 65);
      assert.strictEqual(savedDetails.preset.slotsConfig.bottom.darkMaskOpacity, 25);
      assert.strictEqual(savedDetails.preset.slotsConfig.settings.darkMaskOpacity, 40);
    } finally {
      try { themeEngine.deletePreset(studioDraftPresetName); } catch (_) {}
    }

    // Verify Theme Studio Mockup Preview input box dark mask layer order & CSS rules
    const studioCss = fs.readFileSync(path.join(__dirname, '../../studio/public/style.css'), 'utf8');
    assert(studioCss.includes('#mock-slot-bottom > .mock-slot-bg'), 'Mockup input box wallpaper layer must have z-index: 0');
    assert(studioCss.includes('#mock-slot-bottom::before'), 'Mockup input box dark mask pseudo-element must exist');
    assert(studioCss.includes('--mock-bottom-dark-mask-opacity'), 'Mockup input box must use --mock-bottom-dark-mask-opacity');

    const studioAppJs = fs.readFileSync(path.join(__dirname, '../../studio/public/app.js'), 'utf8');
    assert(studioAppJs.includes('const bottomMaskPct = getSlotDarkMask(cfgSource, \'bottom\');'), 'app.js must extract bottom dark mask directly without zero-forcing');

    console.log('   ✓ Studio GUI 三槽位遮罩控件、样式与 REST API (含草稿直存预设与输入框实览图层顺序) 验证全部通过');

    console.log('\n🎉 ALL R2/R3/R4/R5 TRANSPARENCY & PER-SLOT DIMMER TESTS PASSED!');
  } finally {
    if (serverInstance) {
      await new Promise(r => serverInstance.close(() => r()));
    }
    // Restore original user/baseline configuration cleanly
    try {
      await themeEngine.batchApplyDraft(configSnapshot);
    } catch (_) {}
  }
}

runTests().then(() => {
  process.exit(0);
}).catch(err => {
  console.error('\n❌ 测试失败:', err);
  process.exit(1);
});
