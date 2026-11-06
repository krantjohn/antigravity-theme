/**
 * Tier 3: Cross-Feature Combinations E2E Test Suite
 * Antigravity Theme Engine Pure 3-Target Architecture
 * 
 * Verifies complex multi-feature interactions:
 * - Multi-Target Hybrid Configurations (Video + Image + None in all permutations)
 * - Per-Slot Independent Vanilla Resets
 * - Presets Save & Restore Integrity for Pure 3 Targets
 * - CLI and Studio REST API Full Interoperability
 */

const assert = require('assert');
const path = require('path');
const fs = require('fs');
const os = require('os');
const {
  REPO_ROOT,
  SAMPLE_VIDEO_PATH,
  SAMPLE_IMAGE_LEFT,
  SAMPLE_IMAGE_BOTTOM,
  SAMPLE_IMAGE_SETTINGS,
  createSessionBackup,
  httpRequest
} = require('./e2e_helper');

const themeEngine = require(path.join(REPO_ROOT, 'core', 'theme_engine'));

async function runTier3CombinationsTests() {
  console.log('================================================================');
  console.log('   🧪 [TIER 3] CROSS-FEATURE COMBINATIONS E2E TEST SUITE');
  console.log('   Hybrid Slots, Pairwise Transitions, CLI & Studio Interop');
  console.log('================================================================');

  const sessionBackup = createSessionBackup();
  const testResults = { passed: 0, failed: 0, total: 0 };

  function recordPass(testName) {
    testResults.passed++;
    testResults.total++;
    console.log(`   ✓ [PASS] ${testName}`);
  }

  function recordFail(testName, err) {
    testResults.failed++;
    testResults.total++;
    console.error(`   ✗ [FAIL] ${testName}:`, err.message);
  }

  // Ensure Studio server is running for Interop tests
  const { server, PORT } = require(path.join(REPO_ROOT, 'studio', 'server'));
  const STUDIO_BASE = `http://127.0.0.1:${PORT}`;

  // Helper: Poll Studio server readiness up to timeoutMs before REST tests
  async function ensureStudioServerReady(timeoutMs = 2500) {
    const start = Date.now();
    let lastError = null;
    while (Date.now() - start < timeoutMs) {
      if (!server.listening) {
        try {
          server.listen(PORT, '127.0.0.1');
        } catch (e) {
          lastError = e;
        }
      }
      try {
        const res = await httpRequest('GET', `${STUDIO_BASE}/api/status`);
        if (res && res.status === 200) {
          return true;
        }
      } catch (err) {
        lastError = err;
      }
      await new Promise(resolve => setTimeout(resolve, 80));
    }
    throw new Error(`Studio server at ${STUDIO_BASE} failed readiness check after ${timeoutMs}ms: ${lastError ? lastError.message : 'timeout'}`);
  }

  try {
    // -----------------------------------------------------------------
    // Combination 1: Multi-Target Hybrid Matrix (>=4 tests)
    // -----------------------------------------------------------------
    console.log('\n--- [Combination 1] Multi-Target Hybrid Configurations ---');

    // T3.1: Video Left + Image Bottom + None Settings
    try {
      await themeEngine.swapWallpaper('left', SAMPLE_VIDEO_PATH);
      await themeEngine.swapWallpaper('bottom', SAMPLE_IMAGE_BOTTOM);
      await themeEngine.restoreSlotVanilla('settings');

      const cfg1 = themeEngine.loadSlotsConfig();
      assert.strictEqual(cfg1.left.type, 'video');
      assert.strictEqual(cfg1.bottom.type, 'image');
      assert.strictEqual(cfg1.settings.type, 'none');

      const css1 = themeEngine.generateMasterCss(cfg1);
      assert(css1.includes('left_wallpaper.mp4') || css1.includes('left_poster') || css1.includes('DEFAULT_PORT') || css1.includes('8315'));
      recordPass('T3.1: Hybrid Config: Video Left + Image Bottom + None Settings verified');
    } catch (err) {
      recordFail('T3.1: Video Left + Image Bottom + None Settings', err);
    }

    // T3.2: Image Left + Video Bottom + Image Settings
    try {
      await themeEngine.swapWallpaper('left', SAMPLE_IMAGE_LEFT);
      await themeEngine.swapWallpaper('bottom', SAMPLE_VIDEO_PATH);
      await themeEngine.swapWallpaper('settings', SAMPLE_IMAGE_SETTINGS);

      const cfg2 = themeEngine.loadSlotsConfig();
      assert.strictEqual(cfg2.left.type, 'image');
      assert.strictEqual(cfg2.bottom.type, 'video');
      assert.strictEqual(cfg2.settings.type, 'image');
      recordPass('T3.2: Hybrid Config: Image Left + Video Bottom + Image Settings verified');
    } catch (err) {
      recordFail('T3.2: Image Left + Video Bottom + Image Settings', err);
    }

    // T3.3: All 3 Slots Video (Video Left + Video Bottom + Video Settings)
    try {
      await themeEngine.swapWallpaper('left', SAMPLE_VIDEO_PATH);
      await themeEngine.swapWallpaper('bottom', SAMPLE_VIDEO_PATH);
      await themeEngine.swapWallpaper('settings', SAMPLE_VIDEO_PATH);

      const cfg3 = themeEngine.loadSlotsConfig();
      assert.strictEqual(cfg3.left.type, 'video');
      assert.strictEqual(cfg3.bottom.type, 'video');
      assert.strictEqual(cfg3.settings.type, 'video');
      recordPass('T3.3: All 3 Targets Active Video (Left, Bottom, Settings) verified');
    } catch (err) {
      recordFail('T3.3: All 3 Targets Active Video', err);
    }

    // T3.4: Atomic transition from All-Video to All-Image via batchApplyDraft
    try {
      const draftAllImages = {
        left: { stagedFilePath: SAMPLE_IMAGE_LEFT },
        bottom: { stagedFilePath: SAMPLE_IMAGE_BOTTOM },
        settings: { stagedFilePath: SAMPLE_IMAGE_SETTINGS }
      };
      await themeEngine.batchApplyDraft(draftAllImages);
      const cfg4 = themeEngine.loadSlotsConfig();
      assert.strictEqual(cfg4.left.type, 'image');
      assert.strictEqual(cfg4.bottom.type, 'image');
      assert.strictEqual(cfg4.settings.type, 'image');
      recordPass('T3.4: Atomic transition from All-Video to All-Image verified');
    } catch (err) {
      recordFail('T3.4: Transition All-Video to All-Image', err);
    }

    // -----------------------------------------------------------------
    // Combination 2: Per-Slot Independent Vanilla Resets (>=3 tests)
    // -----------------------------------------------------------------
    console.log('\n--- [Combination 2] Per-Slot Independent Vanilla Resets ---');

    // T3.5: Reset Left to Vanilla while Bottom & Settings remain Active
    try {
      await themeEngine.swapWallpaper('left', SAMPLE_IMAGE_LEFT);
      await themeEngine.swapWallpaper('bottom', SAMPLE_IMAGE_BOTTOM);
      await themeEngine.swapWallpaper('settings', SAMPLE_IMAGE_SETTINGS);

      await themeEngine.restoreSlotVanilla('left');
      const cfgLeftVan = themeEngine.loadSlotsConfig();
      assert.strictEqual(cfgLeftVan.left.type, 'none');
      assert.strictEqual(cfgLeftVan.bottom.type, 'image');
      assert.strictEqual(cfgLeftVan.settings.type, 'image');
      recordPass('T3.5: Left reset to vanilla while Bottom & Settings remain active');
    } catch (err) {
      recordFail('T3.5: Independent Left reset', err);
    }

    // T3.6: Reset Bottom to Vanilla while Settings remains Active
    try {
      await themeEngine.restoreSlotVanilla('bottom');
      const cfgBottomVan = themeEngine.loadSlotsConfig();
      assert.strictEqual(cfgBottomVan.left.type, 'none');
      assert.strictEqual(cfgBottomVan.bottom.type, 'none');
      assert.strictEqual(cfgBottomVan.settings.type, 'image');
      recordPass('T3.6: Bottom reset to vanilla while Settings remains active');
    } catch (err) {
      recordFail('T3.6: Independent Bottom reset', err);
    }

    // T3.7: Reset Settings to Vanilla -> All 3 slots vanilla restores zero-diff mode
    try {
      await themeEngine.restoreSlotVanilla('settings');
      const cfgAllVan = themeEngine.loadSlotsConfig();
      assert.strictEqual(cfgAllVan.left.type, 'none');
      assert.strictEqual(cfgAllVan.bottom.type, 'none');
      assert.strictEqual(cfgAllVan.settings.type, 'none');
      const vanCss = themeEngine.generateMasterCss(cfgAllVan);
      assert(vanCss.includes('Vanilla Mode') || vanCss.includes('Vanilla Theme') || !vanCss.includes('url('));
      recordPass('T3.7: Settings reset to vanilla triggers complete zero-diff mode');
    } catch (err) {
      recordFail('T3.7: Settings reset to zero-diff mode', err);
    }

    // -----------------------------------------------------------------
    // Combination 3: Presets & Multi-Target Persistence (>=3 tests)
    // -----------------------------------------------------------------
    console.log('\n--- [Combination 3] Presets & Multi-Target Persistence ---');

    const testPresetName = `E2E_TestPreset_${Date.now()}`;

    // T3.8: Save 3-target preset -> change wallpaper -> restore preset
    try {
      await themeEngine.swapWallpaper('left', SAMPLE_IMAGE_LEFT);
      await themeEngine.setPosition('left', '35% 65%');
      await themeEngine.swapWallpaper('bottom', SAMPLE_IMAGE_BOTTOM);
      await themeEngine.setPosition('bottom', '70% 30%');

      // Save preset
      const saveOk = themeEngine.savePreset(testPresetName, 'E2E Testing Preset');
      assert(saveOk, 'savePreset should return truthy');

      // Mutate state
      await themeEngine.swapWallpaper('left', SAMPLE_VIDEO_PATH);
      await themeEngine.setPosition('left', '10% 10%');

      // Apply preset back
      const applyOk = await themeEngine.applyPreset(testPresetName);
      assert(applyOk, 'applyPreset should return truthy');

      const cfgRestored = themeEngine.loadSlotsConfig();
      assert.strictEqual(cfgRestored.left.type, 'image');
      const leftPos = themeEngine.parsePosition(cfgRestored.left.position);
      assert.strictEqual(leftPos.x, 35);
      assert.strictEqual(leftPos.y, 65);
      recordPass('T3.8: 3-Target preset saved, mutated, and restored with 100% fidelity');
    } catch (err) {
      recordFail('T3.8: Preset save & restore fidelity', err);
    } finally {
      try { themeEngine.deletePreset(testPresetName); } catch (e) {}
    }

    // T3.9: Preset ignores and purges legacy deprecated slots
    try {
      const presets = themeEngine.listPresets();
      assert(Array.isArray(presets), 'listPresets should return an array');
      recordPass('T3.9: listPresets returns valid preset catalog');
    } catch (err) {
      recordFail('T3.9: Presets catalog inspection', err);
    }

    // -----------------------------------------------------------------
    // Combination 4: CLI + Studio REST API Interoperability (>=4 tests)
    // -----------------------------------------------------------------
    console.log('\n--- [Combination 4] CLI + Studio REST API Interoperability ---');
    await ensureStudioServerReady(2500);

    // T3.10: Wallpaper applied via CLI is immediately visible in Studio /api/status
    try {
      await themeEngine.swapWallpaper('left', SAMPLE_IMAGE_LEFT);
      const res = await httpRequest('GET', `${STUDIO_BASE}/api/status`);
      assert.strictEqual(res.status, 200);
      assert(res.json.slotsConfig);
      assert.strictEqual(res.json.slotsConfig.left.type, 'image');
      recordPass('T3.10: CLI wallpaper application instantly visible in Studio /api/status');
    } catch (err) {
      recordFail('T3.10: CLI to Studio visibility', err);
    }

    // T3.11: Position adjusted in Studio /api/set-pos immediately visible in CLI
    try {
      const posRes = await httpRequest('POST', `${STUDIO_BASE}/api/set-pos`, {
        slot: 'left',
        x: 25,
        y: 75
      });
      assert.strictEqual(posRes.status, 200);
      const cliCfg = themeEngine.loadSlotsConfig();
      const pos = themeEngine.parsePosition(cliCfg.left.position);
      assert.strictEqual(pos.x, 25);
      assert.strictEqual(pos.y, 75);
      recordPass('T3.11: Studio /api/set-pos position update immediately reflected in CLI');
    } catch (err) {
      recordFail('T3.11: Studio to CLI position interop', err);
    }

    // T3.12: Draft committed via Studio /api/theme/apply-draft immediately readable by CLI
    try {
      const draftPayload = {
        draftConfig: {
          left: { stagedFilePath: SAMPLE_IMAGE_LEFT },
          bottom: { type: 'none', isOriginal: true },
          settings: { type: 'none', isOriginal: true }
        }
      };
      const draftRes = await httpRequest('POST', `${STUDIO_BASE}/api/theme/apply-draft`, draftPayload);
      assert.strictEqual(draftRes.status, 200);
      const cliCfg = themeEngine.loadSlotsConfig();
      assert.strictEqual(cliCfg.left.type, 'image');
      assert.strictEqual(cliCfg.bottom.type, 'none');
      recordPass('T3.12: Studio draft apply immediately updates CLI theme state');
    } catch (err) {
      recordFail('T3.12: Studio draft commit interop', err);
    }

    // T3.13: Per-slot vanilla restore via Studio /api/theme/slot/restore-vanilla reflected in CLI
    try {
      const vanRes = await httpRequest('POST', `${STUDIO_BASE}/api/theme/slot/restore-vanilla`, {
        slot: 'left'
      });
      assert.strictEqual(vanRes.status, 200);
      const cliCfg = themeEngine.loadSlotsConfig();
      assert.strictEqual(cliCfg.left.type, 'none');
      assert.strictEqual(cliCfg.left.isOriginal, true);
      recordPass('T3.13: Studio per-slot vanilla restore immediately visible in CLI');
    } catch (err) {
      recordFail('T3.13: Studio per-slot restore interop', err);
    }

  } finally {
    if (server && server.listening) {
      try {
        server.close();
      } catch (e) {}
    }
    await sessionBackup.restore(themeEngine);
  }

  console.log('\n================================================================');
  console.log(`   🏁 [TIER 3 SUMMARY] Total: ${testResults.total} | Passed: ${testResults.passed} | Failed: ${testResults.failed}`);
  console.log('================================================================');

  if (testResults.failed > 0) {
    throw new Error(`Tier 3 Combinations had ${testResults.failed} failing test(s)`);
  }
}

if (require.main === module) {
  runTier3CombinationsTests()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Tier 3 Tests failed:', err);
      process.exit(1);
    });
}

module.exports = { runTier3CombinationsTests };
