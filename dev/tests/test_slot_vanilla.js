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
    assert(css.includes('body::before, html::before'));
    assert(css.includes('display: none !important;'));
    assert(css.includes('#antigravity-video-left'));
    console.log('✓ Generated CSS cleanly removes wallpaper/video and sets native background for left slot');

    // Test 4: Restore other slots while left is vanilla
    console.log('[Test 4] Restoring "mid" and "bottom" to vanilla...');
    await themeEngine.restoreSlotVanilla('mid');
    await themeEngine.restoreSlotVanilla('bottom');
    const configMulti = themeEngine.loadSlotsConfig();
    assert.strictEqual(configMulti.mid.type, 'none');
    assert.strictEqual(configMulti.bottom.type, 'none');
    const cssMulti = themeEngine.generateMasterCss(configMulti);
    assert(cssMulti.includes('/* 底部输入框强制恢复官方原生深色卡片样式 */'));
    assert(cssMulti.includes('/* 活跃终端界面背景彻底还原 */'));
    console.log('✓ Generated CSS contains per-slot vanilla rules for all specified slots');

    console.log('=======================================================');
    console.log('🎉 ALL PER-SLOT VANILLA RESTORE TESTS PASSED!');
    console.log('=======================================================');
  } finally {
    // Restore initial config if present
    if (initialConfig) {
      fs.writeFileSync(configPath, JSON.stringify(initialConfig, null, 2), 'utf8');
      const css = themeEngine.generateMasterCss(initialConfig);
      const customCssPath = path.join(path.dirname(configPath), 'custom_theme.css');
      fs.writeFileSync(customCssPath, css, 'utf8');
      console.log('✓ Initial config restored.');
    }
  }
}

runTests().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
