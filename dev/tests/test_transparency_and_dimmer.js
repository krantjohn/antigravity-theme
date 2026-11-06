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
    // Phase 1: Normalization & Edge-Case Sanitization Unit Tests
    // -----------------------------------------------------------------------
    console.log('\n[Phase 1] 校验 normalizeDarkMaskOpacity 与 getDarkMaskAlpha 边界值与异常输入...');
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
    console.log('   ✓ normalizeDarkMaskOpacity / getDarkMaskAlpha 边界测试全部通过');

    // -----------------------------------------------------------------------
    // Phase 2: generateMasterCss Conditional Injection & Zero-Diff Guarantee
    // -----------------------------------------------------------------------
    console.log('\n[Phase 2] 校验 generateMasterCss 独立开关与零污染保证...');
    const baseMockConfig = {
      isOriginal: false,
      left: { key: 'left', file: 'left_wallpaper.mp4', type: 'video', position: 'center center' },
      bottom: { key: 'bottom', file: '', type: 'none', position: 'center center', isOriginal: true },
      settings: { key: 'settings', file: '', type: 'none', position: 'center center', isOriginal: true },
      transparentSidebar: false,
      transparentHeader: false,
      darkMaskOpacity: 0
    };

    // 2.1 Default disabled -> zero overrides for sidebar, header, or dimmer
    const cssDefault = themeEngine.generateMasterCss(baseMockConfig);
    assert(!cssDefault.includes('3a. Optional Left Sidebar Transparency'), 'Default config must not emit sidebar transparency');
    assert(!cssDefault.includes('3b. Optional Top Header Bar Transparency'), 'Default config must not emit header transparency');
    assert(!cssDefault.includes('3c. Regional Adjustable Dark Mask'), 'Default config must not emit dark mask');
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

    // 2.4 Only darkMaskOpacity = 45
    const cssMaskOnly = themeEngine.generateMasterCss({
      ...baseMockConfig,
      darkMaskOpacity: 45
    });
    assert(cssMaskOnly.includes('3c. Regional Adjustable Dark Mask'), 'Must emit 3c when darkMaskOpacity > 0');
    assert(cssMaskOnly.includes('div[data-testid="aux-pane-split"] > div.flex:first-child'), 'Must target main conversation region');
    assert(cssMaskOnly.includes('rgba(0, 0, 0, 0.45)'), 'Must emit exact alpha 0.45');
    assert(!cssMaskOnly.includes('3a. Optional Left Sidebar Transparency'));
    assert(!cssMaskOnly.includes('3b. Optional Top Header Bar Transparency'));

    // 2.5 Combined: Sidebar + Header + Dark Mask (80%)
    const cssCombined = themeEngine.generateMasterCss({
      ...baseMockConfig,
      transparentSidebar: true,
      transparentHeader: true,
      darkMaskOpacity: 80
    });
    assert(cssCombined.includes('3a. Optional Left Sidebar Transparency'));
    assert(cssCombined.includes('3b. Optional Top Header Bar Transparency'));
    assert(cssCombined.includes('3c. Regional Adjustable Dark Mask'));
    assert(cssCombined.includes('rgba(0, 0, 0, 0.8)'));

    // 2.6 Vanilla / Inactive left slot -> zero overrides even if flags are true
    const cssVanilla = themeEngine.generateMasterCss({
      ...baseMockConfig,
      isOriginal: true,
      transparentSidebar: true,
      transparentHeader: true,
      darkMaskOpacity: 60
    });
    assert.strictEqual(cssVanilla, '/* Antigravity Wallpaper Engine: Vanilla Mode */\n', 'Vanilla mode must emit only the Vanilla Mode comment');

    const cssInactiveLeft = themeEngine.generateMasterCss({
      ...baseMockConfig,
      left: { key: 'left', file: '', type: 'none', isOriginal: true },
      bottom: { key: 'bottom', file: 'input_wallpaper.mp4', type: 'video', position: 'center center' },
      transparentSidebar: true,
      transparentHeader: true,
      darkMaskOpacity: 60
    });
    assert(!cssInactiveLeft.includes('3a. Optional Left Sidebar Transparency'), 'Inactive left slot must not make sidebar transparent');
    assert(!cssInactiveLeft.includes('3b. Optional Top Header Bar Transparency'), 'Inactive left slot must not make header transparent');
    assert(!cssInactiveLeft.includes('3c. Regional Adjustable Dark Mask'), 'Inactive left slot must not apply dark mask');
    console.log('   ✓ generateMasterCss 条件生成与零污染校验全部通过');

    // -----------------------------------------------------------------------
    // Phase 3: Persistence across batchApplyDraft, Presets, Vanilla & Baseline
    // -----------------------------------------------------------------------
    console.log('\n[Phase 3] 校验草稿提交、预设存取、原版还原与基准重置持久化...');
    const sampleLeft = (configSnapshot.left && configSnapshot.left.file) || 'left_wallpaper.mp4';
    const draftToApply = {
      ...configSnapshot,
      isOriginal: false,
      left: {
        ...(configSnapshot.left || {}),
        key: 'left',
        file: sampleLeft,
        type: sampleLeft.endsWith('.mp4') ? 'video' : 'image',
        position: 'center center',
        isOriginal: false
      },
      transparentSidebar: true,
      transparentHeader: true,
      darkMaskOpacity: 55
    };

    const appliedCfg = await themeEngine.batchApplyDraft(draftToApply);
    assert.strictEqual(appliedCfg.transparentSidebar, true);
    assert.strictEqual(appliedCfg.transparentHeader, true);
    assert.strictEqual(appliedCfg.darkMaskOpacity, 55);

    const diskCfg = themeEngine.loadSlotsConfig();
    assert.strictEqual(diskCfg.transparentSidebar, true);
    assert.strictEqual(diskCfg.transparentHeader, true);
    assert.strictEqual(diskCfg.darkMaskOpacity, 55);

    const testPresetName = `R2_R3_AutoTest_${Date.now()}`;
    try {
      const savedManifest = themeEngine.savePreset(testPresetName, 'R2/R3/R4 transparency and dimmer test preset');
      assert(savedManifest && savedManifest.slotsConfig, 'savePreset must return manifest with slotsConfig');
      assert.strictEqual(savedManifest.slotsConfig.transparentSidebar, true);
      assert.strictEqual(savedManifest.slotsConfig.transparentHeader, true);
      assert.strictEqual(savedManifest.slotsConfig.darkMaskOpacity, 55);

      // Restore original vanilla -> must reset flags to false / 0
      await themeEngine.restoreOriginal();
      const vanillaCfg = themeEngine.loadSlotsConfig();
      assert.strictEqual(vanillaCfg.isOriginal, true);
      assert.strictEqual(vanillaCfg.transparentSidebar, false);
      assert.strictEqual(vanillaCfg.transparentHeader, false);
      assert.strictEqual(vanillaCfg.darkMaskOpacity, 0);

      // Apply saved preset -> must restore flags to true / true / 55
      const presetAppliedOk = await themeEngine.applyPreset(testPresetName);
      assert(presetAppliedOk, 'applyPreset must succeed');
      const restoredFromPreset = themeEngine.loadSlotsConfig();
      assert.strictEqual(restoredFromPreset.transparentSidebar, true);
      assert.strictEqual(restoredFromPreset.transparentHeader, true);
      assert.strictEqual(restoredFromPreset.darkMaskOpacity, 55);
    } finally {
      try { themeEngine.deletePreset(testPresetName); } catch (_) {}
      // Also clean up any previous R2_R3_AutoTest_* preset
      try {
        (themeEngine.listPresets() || []).forEach(p => {
          if (p.name && p.name.startsWith('R2_R3_AutoTest_')) {
            themeEngine.deletePreset(p.name);
          }
        });
      } catch (_) {}
    }
    console.log('   ✓ 草稿固化、预设保存/恢复、原版重置持久化校验全部通过');

    // -----------------------------------------------------------------------
    // Phase 4: Live CDP 8314 DOM Verification (if Antigravity is running)
    // -----------------------------------------------------------------------
    console.log('\n[Phase 4] 校验 CDP 8314 实时 DOM 样式计算 (Live Antigravity Client)...');
    const liveStyles = await evaluateOnCdp8314(`(function() {
      var sb = document.querySelector('div[role="navigation"][aria-label="Sidebar"]');
      var hdr = document.querySelector('[data-testid="title-menu-bar"]');
      var hdrParent = hdr ? hdr.parentElement : null;
      var chat = document.querySelector('div[data-testid="aux-pane-split"] > div.flex:first-child') || document.querySelector('.agy-sheet');
      return {
        hasSidebar: Boolean(sb),
        sidebarBg: sb ? window.getComputedStyle(sb).backgroundColor : null,
        hasHeader: Boolean(hdr),
        headerBg: hdr ? window.getComputedStyle(hdr).backgroundColor : null,
        headerParentBg: hdrParent ? window.getComputedStyle(hdrParent).backgroundColor : null,
        hasChat: Boolean(chat),
        chatBg: chat ? window.getComputedStyle(chat).backgroundColor : null
      };
    })()`);

    if (liveStyles && liveStyles.hasSidebar && liveStyles.hasHeader) {
      assert.strictEqual(liveStyles.sidebarBg, 'rgba(17, 17, 20, 0.45)', 'Live Sidebar computed background-color must be rgba(17, 17, 20, 0.45)');
      assert.strictEqual(liveStyles.headerBg, 'rgba(17, 17, 20, 0.45)', 'Live Header computed background-color must be rgba(17, 17, 20, 0.45)');
      assert.strictEqual(liveStyles.headerParentBg, 'rgba(0, 0, 0, 0)', 'Live Header parent wrapper must remain transparent rgba(0, 0, 0, 0) to prevent double-stacked 70% darkness');
      if (liveStyles.hasChat) {
        assert.strictEqual(liveStyles.chatBg, 'rgba(0, 0, 0, 0.55)', 'Live Chat regional dark mask computed background-color must be rgba(0, 0, 0, 0.55)');
      }
      console.log(`   ✓ CDP 8314 开启态实时计算样式验证通过 (无双层叠加): Sidebar=${liveStyles.sidebarBg}, Header=${liveStyles.headerBg}, HeaderParent=${liveStyles.headerParentBg}, ChatDimmer=${liveStyles.chatBg}`);

      // Edge Case: restoreSlotVanilla('left') while transparentSidebar/Header/darkMaskOpacity remain true/55 in config
      await themeEngine.restoreSlotVanilla('left');
      const afterLeftVanillaCfg = themeEngine.loadSlotsConfig();
      const afterLeftVanillaCss = themeEngine.generateMasterCss(afterLeftVanillaCfg);
      assert(!afterLeftVanillaCss.includes('3a. Optional Left Sidebar Transparency'), 'restoreSlotVanilla(left) must suppress 3a even when transparentSidebar is true');
      assert(!afterLeftVanillaCss.includes('3b. Optional Top Header Bar Transparency'), 'restoreSlotVanilla(left) must suppress 3b even when transparentHeader is true');
      assert(!afterLeftVanillaCss.includes('3c. Regional Adjustable Dark Mask'), 'restoreSlotVanilla(left) must suppress 3c even when darkMaskOpacity > 0');

      const liveAfterLeftVanilla = await evaluateOnCdp8314(`(function() {
        var sb = document.querySelector('div[role="navigation"][aria-label="Sidebar"]');
        var hdr = document.querySelector('[data-testid="title-menu-bar"]');
        var chat = document.querySelector('div[data-testid="aux-pane-split"] > div.flex:first-child') || document.querySelector('.agy-sheet');
        return {
          sidebarBg: sb ? window.getComputedStyle(sb).backgroundColor : null,
          headerBg: hdr ? window.getComputedStyle(hdr).backgroundColor : null,
          chatBg: chat ? window.getComputedStyle(chat).backgroundColor : null
        };
      })()`);
      if (liveAfterLeftVanilla) {
        assert.strictEqual(liveAfterLeftVanilla.sidebarBg, 'rgb(17, 17, 20)', 'Sidebar must revert to stock opaque when left slot is restored to vanilla');
        assert.strictEqual(liveAfterLeftVanilla.headerBg, 'rgb(17, 17, 20)', 'Header must revert to stock opaque when left slot is restored to vanilla');
        if (liveAfterLeftVanilla.chatBg) {
          assert.strictEqual(liveAfterLeftVanilla.chatBg, 'rgba(0, 0, 0, 0)', 'ChatDimmer must revert to transparent when left slot is restored to vanilla');
        }
      }

      // Now explicitly disable toggles & dimmer with active left slot and verify stock opaque restoration in live DOM
      await themeEngine.batchApplyDraft({
        ...draftToApply,
        transparentSidebar: false,
        transparentHeader: false,
        darkMaskOpacity: 0
      });
      const liveOpaqueStyles = await evaluateOnCdp8314(`(function() {
        var sb = document.querySelector('div[role="navigation"][aria-label="Sidebar"]');
        var hdr = document.querySelector('[data-testid="title-menu-bar"]');
        var chat = document.querySelector('div[data-testid="aux-pane-split"] > div.flex:first-child') || document.querySelector('.agy-sheet');
        return {
          sidebarBg: sb ? window.getComputedStyle(sb).backgroundColor : null,
          headerBg: hdr ? window.getComputedStyle(hdr).backgroundColor : null,
          chatBg: chat ? window.getComputedStyle(chat).backgroundColor : null
        };
      })()`);
      if (liveOpaqueStyles) {
        assert.strictEqual(liveOpaqueStyles.sidebarBg, 'rgb(17, 17, 20)', 'Disabled Sidebar must revert to stock opaque rgb(17, 17, 20)');
        assert.strictEqual(liveOpaqueStyles.headerBg, 'rgb(17, 17, 20)', 'Disabled Header must revert to stock opaque rgb(17, 17, 20)');
        if (liveOpaqueStyles.chatBg) {
          assert.strictEqual(liveOpaqueStyles.chatBg, 'rgba(0, 0, 0, 0)', 'Disabled ChatDimmer must revert to rgba(0, 0, 0, 0)');
        }
        console.log(`   ✓ CDP 8314 关闭态与单槽位恢复原版验证通过: Sidebar=${liveOpaqueStyles.sidebarBg}, Header=${liveOpaqueStyles.headerBg}, ChatDimmer=${liveOpaqueStyles.chatBg}`);
      }
    } else {
      console.log('   ℹ️ CDP 8314 离线或无活动页面，跳过实时 DOM 计算样式断言');
    }

    // -----------------------------------------------------------------------
    // Phase 5: Studio GUI Assets & REST API Integration (Port 8316)
    // -----------------------------------------------------------------------
    console.log('\n[Phase 5] 校验 Theme Studio 前端控件与 REST API (/api/theme/apply-draft & /api/apply-draft & /api/presets/save)...');
    const { server, PORT } = require('../../studio/server');
    serverInstance = server;

    const htmlRes = await httpRequest(PORT, 'GET', '/');
    assert.strictEqual(htmlRes.status, 200);
    assert(htmlRes.text.includes('id="section-transparency-dimmer"'), 'index.html must include #section-transparency-dimmer');
    assert(htmlRes.text.includes('id="toggle-transparent-sidebar"'), 'index.html must include #toggle-transparent-sidebar');
    assert(htmlRes.text.includes('id="toggle-transparent-header"'), 'index.html must include #toggle-transparent-header');
    assert(htmlRes.text.includes('id="slider-dark-mask"'), 'index.html must include #slider-dark-mask');
    assert(htmlRes.text.includes('左侧对话栏透明'), 'index.html must include Chinese label for sidebar transparency');
    assert(htmlRes.text.includes('顶部状态栏透明'), 'index.html must include Chinese label for header transparency');
    assert(htmlRes.text.includes('壁纸暗色遮罩 / 亮度调节'), 'index.html must include Chinese label for dark mask slider');

    const cssRes = await httpRequest(PORT, 'GET', '/style.css');
    assert.strictEqual(cssRes.status, 200);
    assert(cssRes.text.includes('.mockup-window.transparent-sidebar'), 'style.css must include .mockup-window.transparent-sidebar');
    assert(cssRes.text.includes('.mockup-window.transparent-header'), 'style.css must include .mockup-window.transparent-header');
    assert(cssRes.text.includes('--mock-dark-mask-opacity'), 'style.css must include --mock-dark-mask-opacity');

    const jsRes = await httpRequest(PORT, 'GET', '/app.js');
    assert.strictEqual(jsRes.status, 200);
    assert(jsRes.text.includes('toggleTransparentSidebar'), 'app.js must reference toggleTransparentSidebar');
    assert(jsRes.text.includes('toggleTransparentHeader'), 'app.js must reference toggleTransparentHeader');
    assert(jsRes.text.includes('sliderDarkMask'), 'app.js must reference sliderDarkMask');

    // Test POST /api/apply-draft and POST /api/theme/apply-draft
    const apiApplyRes = await httpRequest(PORT, 'POST', '/api/apply-draft', {
      draftConfig: {
        ...draftToApply,
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

    const statusRes = await httpRequest(PORT, 'GET', '/api/status');
    assert.strictEqual(statusRes.status, 200);
    assert.strictEqual(statusRes.json.slotsConfig.transparentSidebar, true);
    assert.strictEqual(statusRes.json.slotsConfig.transparentHeader, false);
    assert.strictEqual(statusRes.json.slotsConfig.darkMaskOpacity, 35);

    // Test POST /api/presets/save with uncommitted draftConfig from Studio draft bar
    const studioDraftPresetName = `R2_R3_StudioDraftPreset_${Date.now()}`;
    try {
      const saveDraftPresetRes = await httpRequest(PORT, 'POST', '/api/presets/save', {
        name: studioDraftPresetName,
        draftConfig: {
          ...draftToApply,
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
    } finally {
      try { themeEngine.deletePreset(studioDraftPresetName); } catch (_) {}
    }

    console.log('   ✓ Studio GUI 控件、样式与 REST API (含草稿直存预设) 验证全部通过');

    console.log('\n🎉 ALL R2/R3/R4/R5 TRANSPARENCY & DIMMER TESTS PASSED!');
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
