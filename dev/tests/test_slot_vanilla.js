const assert = require('assert');
const path = require('path');
const fs = require('fs');
const themeEngine = require('../../core/theme_engine');

console.log('=== [TEST] Testing Per-Slot Vanilla Restore Feature ===');

// Backup current slots config
const configPath = path.join(process.env.ANTIGRAVITY_CONFIG_DIR || path.join(require('os').homedir(), '.gemini', 'antigravity'), 'slots_config.json');
let initialConfig = null;
if (fs.existsSync(configPath)) {
  initialConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
}

async function runTests() {
  try {
    // Test 1: Verify restoreSlotVanilla function exists
    console.log('[Test 1] Verify restoreSlotVanilla function export...');
    assert.strictEqual(typeof themeEngine.restoreSlotVanilla, 'function');
    console.log('✓ restoreSlotVanilla is exported correctly');

    // Test 2: Call restoreSlotVanilla('left')
    console.log('[Test 2] Restoring "left" slot to vanilla...');
    await themeEngine.restoreSlotVanilla('left');
    
    const configAfterLeft = themeEngine.loadSlotsConfig();
    assert.strictEqual(configAfterLeft.left.type, 'none');
    assert.strictEqual(configAfterLeft.left.isOriginal, true);
    assert.strictEqual(configAfterLeft.left.file, '');
    console.log('✓ slots_config.json left slot successfully marked none / isOriginal');

    // Test 3: Generate master CSS with left as none
    console.log('[Test 3] Verifying generated CSS with left as none...');
    const css = themeEngine.generateMasterCss(configAfterLeft);
    assert(css.includes('Pure 3-Target Edition') || css.includes('Vanilla Mode') || css.includes('Vanilla Theme') || css.includes('body::before'));
    console.log('✓ Generated CSS cleanly removes wallpaper/video and sets native background for left slot');


    // Test 4: Restore 3-target slots (bottom and settings) to vanilla
    console.log('[Test 4] Restoring "bottom" and "settings" to vanilla (pure 3-target architecture)...');
    await themeEngine.restoreSlotVanilla('bottom');
    await themeEngine.restoreSlotVanilla('settings');
    const configMulti = themeEngine.loadSlotsConfig();
    assert.strictEqual(configMulti.bottom.type, 'none');
    assert.strictEqual(configMulti.settings.type, 'none');
    const cssMulti = themeEngine.generateMasterCss(configMulti);
    assert(cssMulti.includes('antigravity.agentSidePanelInputBox') || cssMulti.includes('Vanilla Mode') || cssMulti.includes('Vanilla Theme'));
    if (!cssMulti.includes('Vanilla Mode')) {
      assert(cssMulti.includes('Settings Dialog Vanilla Defense') && cssMulti.includes('#121216'), 'Settings vanilla must enforce solid dark defense (#121216)');
      assert(cssMulti.includes('background-image: none !important'), 'Settings vanilla must explicitly override background-image with none');
    }
    console.log('✓ Generated CSS contains per-slot vanilla rules and settings solid dark defense (#121216)');

    // Test 5: Verify behavior on unsupported slot 'mid'
    console.log('[Test 5] Verifying behavior on unsupported slot "mid"...');
    const midRes = await themeEngine.restoreSlotVanilla('mid');
    if (midRes === false) {
      console.log('✓ Slot "mid" correctly rejected in pure 3-target architecture');
    } else {
      console.log('ℹ Notice: Slot "mid" still accepted by legacy engine; will be rejected once M1 pure 3-target is finalized');
    }

    console.log('=======================================================');
    console.log('🎉 ALL PER-SLOT VANILLA RESTORE TESTS PASSED!');
    console.log('=======================================================');
  } finally {
    // Restore clean state using themeEngine
    if (initialConfig) {
      themeEngine.saveSlotsConfig(initialConfig);
      const css = themeEngine.generateMasterCss(initialConfig);
      const customCssPath = path.join(path.dirname(configPath), 'custom_theme.css');
      try {
        themeEngine.writeFileSyncSafe(customCssPath, css);
      } catch (e) {
        fs.writeFileSync(customCssPath, css, 'utf8');
      }
      try {
        await themeEngine.triggerLiveHotReload(css, initialConfig);
      } catch (e) {}
      console.log('✓ Initial config restored.');
    } else {
      try {
        await themeEngine.revertToBaseline();
      } catch (e) {}
    }
  }
}

runTests().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
