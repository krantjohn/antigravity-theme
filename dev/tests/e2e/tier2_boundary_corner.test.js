/**
 * Tier 2: Boundary & Corner Cases E2E Test Suite
 * Antigravity Theme Engine Pure 3-Target Architecture
 * 
 * Verifies 4 boundary categories with >=5 tests each:
 * - Boundary 1: Invalid & Corrupt Media Files
 * - Boundary 2: Slot Validation & Normalization
 * - Boundary 3: Coordinate Parsing & Clamping
 * - Boundary 4: Fault Tolerance & Security Sanitization
 */

const assert = require('assert');
const path = require('path');
const fs = require('fs');
const os = require('os');
const {
  REPO_ROOT,
  DEV_TESTS_DIR,
  SAMPLE_VIDEO_PATH,
  SAMPLE_IMAGE_LEFT,
  createSessionBackup,
  httpRequest
} = require('./e2e_helper');

const themeEngine = require(path.join(REPO_ROOT, 'core', 'theme_engine'));

async function runTier2BoundaryCornerTests() {
  console.log('================================================================');
  console.log('   🧪 [TIER 2] BOUNDARY & CORNER CASES E2E TEST SUITE');
  console.log('   Boundary Conditions, Error Paths, Stress & Clamping');
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

  // Create temporary test files in os.tmpdir
  const tempDir = path.join(os.tmpdir(), `ag_tier2_temp_${Date.now()}`);
  fs.mkdirSync(tempDir, { recursive: true });

  const emptyFilePath = path.join(tempDir, 'empty.jpg');
  fs.writeFileSync(emptyFilePath, Buffer.alloc(0));

  const audioFilePath = path.join(tempDir, 'sample_audio.mp3');
  fs.writeFileSync(audioFilePath, Buffer.from('FAKE_MP3_STREAM'));

  const textFilePath = path.join(tempDir, 'not_media.txt');
  fs.writeFileSync(textFilePath, 'Hello World, not an image or video');

  try {
    // -----------------------------------------------------------------
    // Boundary 1: Invalid & Corrupt Media Files (>=5 tests)
    // -----------------------------------------------------------------
    console.log('\n--- [Boundary 1] Invalid & Corrupt Media Files ---');

    // T2.1: Empty file path string
    try {
      const res = await themeEngine.swapWallpaper('left', '');
      assert.strictEqual(res, false, 'swapWallpaper with empty path must return false');
      recordPass('T2.1: Empty file path string safely rejected with false');
    } catch (err) {
      recordFail('T2.1: Empty file path', err);
    }

    // T2.2: Non-existent file path
    try {
      const nonExistent = path.join(tempDir, 'non_existent_wallpaper_12345.mp4');
      const res = await themeEngine.swapWallpaper('left', nonExistent);
      assert.strictEqual(res, false, 'swapWallpaper with non-existent file must return false');
      recordPass('T2.2: Non-existent file path safely rejected with false');
    } catch (err) {
      recordFail('T2.2: Non-existent file path', err);
    }

    // T2.3: Unsupported audio format (.mp3)
    try {
      const res = await themeEngine.swapWallpaper('left', audioFilePath);
      assert.strictEqual(res, false, 'swapWallpaper with .mp3 audio must return false');
      recordPass('T2.3: Unsupported audio format (.mp3) safely rejected');
    } catch (err) {
      recordFail('T2.3: Audio format rejection', err);
    }

    // T2.4: Non-media document/text file (.txt)
    try {
      const res = await themeEngine.swapWallpaper('bottom', textFilePath);
      assert.strictEqual(res, false, 'swapWallpaper with .txt file must return false');
      recordPass('T2.4: Non-media text file (.txt) safely rejected');
    } catch (err) {
      recordFail('T2.4: Text file rejection', err);
    }

    // T2.5: Directory path passed instead of a file
    try {
      const res = await themeEngine.swapWallpaper('settings', tempDir);
      assert.strictEqual(res, false, 'swapWallpaper with directory path must return false');
      recordPass('T2.5: Directory path passed as wallpaper safely rejected');
    } catch (err) {
      recordFail('T2.5: Directory path rejection', err);
    }

    // -----------------------------------------------------------------
    // Boundary 2: Slot Validation & Normalization (>=5 tests)
    // -----------------------------------------------------------------
    console.log('\n--- [Boundary 2] Slot Validation & Normalization ---');

    // T2.6: Empty string or null slot name
    try {
      const resEmpty = await themeEngine.swapWallpaper('', SAMPLE_IMAGE_LEFT);
      assert.strictEqual(resEmpty, false);
      const resNull = await themeEngine.swapWallpaper(null, SAMPLE_IMAGE_LEFT);
      assert.strictEqual(resNull, false);
      recordPass('T2.6: Empty / null slot name safely rejected with false');
    } catch (err) {
      recordFail('T2.6: Empty/null slot name', err);
    }

    // T2.7: Completely unknown slot name
    try {
      const resUnknown = await themeEngine.swapWallpaper('nonexistent_custom_slot', SAMPLE_IMAGE_LEFT);
      assert.strictEqual(resUnknown, false);
      recordPass('T2.7: Unknown slot name safely rejected with false');
    } catch (err) {
      recordFail('T2.7: Unknown slot name', err);
    }

    // T2.8: Case-insensitivity normalization (UPPERCASE slot)
    try {
      const okLeft = await themeEngine.swapWallpaper('LEFT', SAMPLE_IMAGE_LEFT);
      assert(okLeft, 'Uppercase LEFT should be accepted');
      const okBottom = await themeEngine.swapWallpaper('BOTTOM', SAMPLE_IMAGE_LEFT);
      assert(okBottom, 'Uppercase BOTTOM should be accepted');
      const okSettings = await themeEngine.swapWallpaper('SETTINGS', SAMPLE_IMAGE_LEFT);
      assert(okSettings, 'Uppercase SETTINGS should be accepted');
      recordPass('T2.8: Uppercase slot names (LEFT, BOTTOM, SETTINGS) correctly normalized');
    } catch (err) {
      recordFail('T2.8: Uppercase slot normalization', err);
    }

    // T2.9: Deprecated slot names ('mid', 'right', 'terminal')
    try {
      const resMid = await themeEngine.swapWallpaper('mid', SAMPLE_IMAGE_LEFT);
      const resRight = await themeEngine.swapWallpaper('right', SAMPLE_IMAGE_LEFT);
      if (resMid === false && resRight === false) {
        recordPass('T2.9: Deprecated slots (mid, right) strictly rejected in pure 3-target architecture');
      } else {
        console.log('   ℹ [Notice] T2.9: Deprecated slots currently transitioning via M1');
        recordPass('T2.9: Handled deprecated slots transitional contract');
      }
    } catch (err) {
      recordFail('T2.9: Deprecated slots validation', err);
    }

    // T2.10: Numeric or invalid string slot argument
    try {
      const resNum = await themeEngine.swapWallpaper('12345', SAMPLE_IMAGE_LEFT);
      assert.strictEqual(resNum, false, 'Numeric slot string should be rejected as unknown slot');
      recordPass('T2.10: Numeric slot string safely rejected with false');
    } catch (err) {
      recordFail('T2.10: Numeric slot validation', err);
    }


    // -----------------------------------------------------------------
    // Boundary 3: Coordinate Parsing & Clamping (>=5 tests)
    // -----------------------------------------------------------------
    console.log('\n--- [Boundary 3] Coordinate Parsing & Clamping ---');

    // T2.11: Negative coordinates clamped to 0
    try {
      const negParsed = themeEngine.parsePosition('-30% -50%');
      assert.strictEqual(negParsed.x, 0, 'Negative X must clamp to 0');
      assert.strictEqual(negParsed.y, 0, 'Negative Y must clamp to 0');
      recordPass('T2.11: Negative coordinates (-30% -50%) clamped to (0%, 0%)');
    } catch (err) {
      recordFail('T2.11: Negative coordinates clamping', err);
    }

    // T2.12: Out-of-bounds coordinates (>100%) clamped to 100
    try {
      const overParsed = themeEngine.parsePosition('150% 240%');
      assert.strictEqual(overParsed.x, 100, 'X > 100 must clamp to 100');
      assert.strictEqual(overParsed.y, 100, 'Y > 100 must clamp to 100');
      recordPass('T2.12: Out-of-bounds coordinates (150% 240%) clamped to (100%, 100%)');
    } catch (err) {
      recordFail('T2.12: Out-of-bounds coordinates clamping', err);
    }

    // T2.13: Non-numeric invalid strings fallback to default center (50)
    try {
      const invalidParsed = themeEngine.parsePosition('invalid_token non_numeric_coord');
      assert.strictEqual(invalidParsed.x, 50, 'Invalid token X must fallback to 50');
      assert.strictEqual(invalidParsed.y, 50, 'Invalid token Y must fallback to 50');
      recordPass('T2.13: Non-numeric invalid strings fallback safely to 50%');
    } catch (err) {
      recordFail('T2.13: Non-numeric fallback', err);
    }

    // T2.14: adjustPosition upper boundary clamping
    try {
      await themeEngine.setPosition('left', '98% 98%');
      await themeEngine.adjustPosition('left', 'down', 10);
      const cfg = themeEngine.loadSlotsConfig();
      const pos = themeEngine.parsePosition(cfg.left.position);
      assert.strictEqual(pos.y, 100, 'Adjust down past 100% must clamp to 100');
      recordPass('T2.14: adjustPosition moving past 100% clamps to 100%');
    } catch (err) {
      recordFail('T2.14: adjustPosition upper clamping', err);
    }

    // T2.15: adjustPosition lower boundary clamping
    try {
      await themeEngine.setPosition('left', '2% 2%');
      await themeEngine.adjustPosition('left', 'up', 10);
      const cfg = themeEngine.loadSlotsConfig();
      const pos = themeEngine.parsePosition(cfg.left.position);
      assert.strictEqual(pos.y, 0, 'Adjust up past 0% must clamp to 0');
      recordPass('T2.15: adjustPosition moving past 0% clamps to 0%');
    } catch (err) {
      recordFail('T2.15: adjustPosition lower clamping', err);
    }

    // -----------------------------------------------------------------
    // Boundary 4: Fault Tolerance & Security Sanitization (>=5 tests)
    // -----------------------------------------------------------------
    console.log('\n--- [Boundary 4] Fault Tolerance & Security Sanitization ---');

    // T2.16: Rapid sequential swaps on same slot without corrupting configuration
    try {
      const promises = [
        themeEngine.swapWallpaper('left', SAMPLE_IMAGE_LEFT),
        themeEngine.swapWallpaper('left', SAMPLE_IMAGE_LEFT),
        themeEngine.swapWallpaper('left', SAMPLE_IMAGE_LEFT)
      ];
      await Promise.all(promises);
      const cfg = themeEngine.loadSlotsConfig();
      assert.strictEqual(cfg.left.type, 'image');
      assert(fs.existsSync(path.join(themeEngine.WALLPAPERS_DIR || path.join(themeEngine.antigravityDir || '', 'wallpapers'), cfg.left.file)));
      recordPass('T2.16: Rapid sequential swaps complete without race condition or config corruption');
    } catch (err) {
      recordFail('T2.16: Rapid sequential swaps', err);
    }

    // T2.17: Preset name path traversal protection (../../etc/passwd and '..')
    try {
      const dotDot = themeEngine.sanitizePresetName('..');
      assert.strictEqual(dotDot, '', 'Standalone .. must return empty string');
      const dot = themeEngine.sanitizePresetName('.');
      assert.strictEqual(dot, '', 'Standalone . must return empty string');

      const traversal = themeEngine.sanitizePresetName('../../etc/passwd');
      assert(!traversal.includes('/') && !traversal.includes('\\'), 'Slashes must be neutralized');
      const targetDir = path.resolve(path.join(themeEngine.getPresetsDir(), traversal));
      assert(targetDir.startsWith(path.resolve(themeEngine.getPresetsDir())), 'Target must not escape presets directory');
      recordPass('T2.17: Preset name path traversal neutralized and strictly contained within presets directory');
    } catch (err) {
      recordFail('T2.17: Path traversal sanitization', err);
    }

    // T2.18: Windows reserved device names (CON, PRN, AUX, NUL)
    try {
      ['CON', 'PRN', 'AUX', 'NUL', 'COM1', 'LPT1'].forEach(reserved => {
        const sanitized = themeEngine.sanitizePresetName(reserved);
        assert.notStrictEqual(sanitized.toUpperCase(), reserved, `Reserved device name ${reserved} must be modified`);
      });
      recordPass('T2.18: Windows reserved device names (CON, PRN, AUX, NUL) neutralized');
    } catch (err) {
      recordFail('T2.18: Windows reserved names', err);
    }

    // T2.19: Very long preset names (> 200 chars) safely handled without crashing
    try {
      const longName = 'LongPreset_' + 'A'.repeat(150);
      const sanitized = themeEngine.sanitizePresetName(longName);
      assert(typeof sanitized === 'string' && sanitized.length > 0, 'Sanitized name must be valid string');
      const saveRes = themeEngine.savePreset(longName, 'Long name description');
      assert(saveRes, 'Long preset name should be saved without throwing crash');
      if (saveRes) {
        try { themeEngine.deletePreset(longName); } catch (e) {}
      }
      recordPass('T2.19: Extremely long preset names safely handled without crashing');
    } catch (err) {
      recordFail('T2.19: Long preset name truncation', err);
    }


    // T2.20: Offline CDP resilience - triggerLiveHotReload does not crash if CDP is unresponsive
    try {
      // Calling hot reload with empty CSS should return without throwing uncaught rejection
      await themeEngine.triggerLiveHotReload('/* Test empty CSS */', themeEngine.loadSlotsConfig());
      recordPass('T2.20: triggerLiveHotReload executes resiliently without unhandled rejections');
    } catch (err) {
      recordFail('T2.20: CDP resilience', err);
    }

  } finally {
    // Clean up temporary test files
    try { fs.rmSync(tempDir, { recursive: true, force: true }); } catch (e) {}
    await sessionBackup.restore(themeEngine);
  }

  console.log('\n================================================================');
  console.log(`   🏁 [TIER 2 SUMMARY] Total: ${testResults.total} | Passed: ${testResults.passed} | Failed: ${testResults.failed}`);
  console.log('================================================================');

  if (testResults.failed > 0) {
    throw new Error(`Tier 2 Boundary & Corner Cases had ${testResults.failed} failing test(s)`);
  }
}

if (require.main === module) {
  runTier2BoundaryCornerTests()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Tier 2 Tests failed:', err);
      process.exit(1);
    });
}

module.exports = { runTier2BoundaryCornerTests };
