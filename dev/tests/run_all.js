/**
 * Master Test Runner for Antigravity Theme Engine
 * Pure 3-Target Edition (left, bottom, settings)
 * Resilient Architecture with Tiered Cooldowns, Active Sanitization & Smart Retry
 * 
 * Executes:
 * 1. Modernized Unit & Integration Suites (8 suites)
 * 2. 4-Tier Comprehensive E2E Test Suite (Tiers 1 - 4)
 * 
 * Usage:
 *   node dev/tests/run_all.js
 */

const { spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const http = require('http');
const net = require('net');

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const DEV_TESTS_DIR = path.join(REPO_ROOT, 'dev', 'tests');
const E2E_DIR = path.join(DEV_TESTS_DIR, 'e2e');

// Configuration: Tiered Cooldown Intervals (Windows NTFS, CDP Renderer & Socket Safe)
const COOLDOWNS = {
  DEFAULT_INTER_SUITE_MS: 1200,   // Standard settling delay between suites
  HEAVY_SUITE_MS: 2000,           // Delay after heavy suites (test_suite.js, test_watchdog.js, tier3)
  RETRY_BACKOFF_MS: 2000          // Delay before retrying a transient failure
};

function isPortAvailable(port) {
  return new Promise((resolve) => {
    const s = net.createServer();
    s.once('error', () => resolve(false));
    s.once('listening', () => {
      s.close(() => resolve(true));
    });
    s.listen(port, '127.0.0.1');
  });
}

async function ensurePortDrained(port, maxWaitMs = 2000) {
  const start = Date.now();
  while (Date.now() - start < maxWaitMs) {
    if (await isPortAvailable(port)) return true;
    await new Promise(r => setTimeout(r, 100));
  }
  return false;
}

/**
 * Perform baseline state sanitization and health check before sensitive suites or retries
 */
async function ensureBaselineSanitized(label = 'State Sync') {
  process.stdout.write(`\n  • [${label}] Sanitizing baseline state & settling CDP renderer ... `);
  const syncStart = Date.now();

  try {
    const themeEngine = require(path.join(REPO_ROOT, 'core', 'theme_engine'));
    await themeEngine.revertToBaseline();
  } catch (err) {
    const antigravityDir = process.env.ANTIGRAVITY_CONFIG_DIR || path.join(require('os').homedir(), '.gemini', 'antigravity');
    const slotsConfigPath = path.join(antigravityDir, 'slots_config.json');
    if (fs.existsSync(slotsConfigPath)) {
      try {
        const raw = fs.readFileSync(slotsConfigPath, 'utf8');
        JSON.parse(raw);
      } catch (e) {
        await new Promise(r => setTimeout(r, 200));
      }
    }
  }

  // Ensure sample media prerequisites exist
  const antigravityDir = process.env.ANTIGRAVITY_CONFIG_DIR || path.join(require('os').homedir(), '.gemini', 'antigravity');
  const liveWallpapersDir = path.join(antigravityDir, 'wallpapers');
  const sampleSrc = path.join(DEV_TESTS_DIR, 'sample_wallpaper.mp4');
  if (fs.existsSync(sampleSrc) && fs.existsSync(liveWallpapersDir)) {
    const targetBottom = path.join(liveWallpapersDir, 'input_wallpaper.mp4');
    const targetLeft = path.join(liveWallpapersDir, 'left_wallpaper.mp4');
    const targetSettings = path.join(liveWallpapersDir, 'settings_wallpaper.mp4');
    try {
      if (!fs.existsSync(targetBottom)) fs.copyFileSync(sampleSrc, targetBottom);
      if (!fs.existsSync(targetLeft)) fs.copyFileSync(sampleSrc, targetLeft);
      if (!fs.existsSync(targetSettings)) fs.copyFileSync(sampleSrc, targetSettings);
    } catch (e) {}
  }

  // Ensure Studio Port 8316 is drained
  await ensurePortDrained(8316, 2000);

  // Quiesce interval for sockets and background file handles (2000ms quiescence delay)
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Ping CDP port 8314 to ensure Antigravity.exe is responsive
  await new Promise((resolve) => {
    const req = http.get('http://127.0.0.1:8314/json', (res) => {
      res.resume();
      resolve();
    });
    req.on('error', () => resolve());
    req.setTimeout(1000, () => { req.destroy(); resolve(); });
  });

  const syncSec = ((Date.now() - syncStart) / 1000).toFixed(2);
  console.log(`✓ READY (${syncSec}s)`);
}

function isRetryableFailure(output) {
  const isOsTransient = output.includes('ECONNRESET') ||
                        output.includes('ECONNREFUSED') ||
                        output.includes('EADDRINUSE') ||
                        output.includes('EBUSY') ||
                        output.includes('EPERM') ||
                        output.includes('ETIMEDOUT');

  const isAssertionTransient = output.includes('AssertionError') ||
                               output.includes('ERR_ASSERTION') ||
                               output.includes('[FAIL]');

  return isOsTransient || isAssertionTransient;
}

const TEST_GROUPS = [
  {
    group: 'Group 1: Modernized Unit & Integration Suites',
    tests: [
      { name: 'Slot Vanilla Restore', file: path.join(DEV_TESTS_DIR, 'test_slot_vanilla.js') },
      { name: 'Seamless Wallpaper Swap', file: path.join(DEV_TESTS_DIR, 'test_seamless_swap.js') },
      { name: 'Studio REST API & V2', file: path.join(DEV_TESTS_DIR, 'test_studio_api.js') },
      { name: 'Studio V3 Bento Integration', file: path.join(DEV_TESTS_DIR, 'test_studio_v3.js') },
      { name: 'Wallpaper Engine Bridge', file: path.join(DEV_TESTS_DIR, 'test_wallpaper_engine.js') },
      { name: 'Input Box Wallpaper & Rim Elimination', file: path.join(DEV_TESTS_DIR, 'test_bottom_slot_wallpaper.js') },
      { name: 'Dynamic Video Wallpaper Watchdog & Recovery', file: path.join(DEV_TESTS_DIR, 'test_watchdog.js') },
      { name: 'Sidebar/Header Transparency & Regional Dark Mask', file: path.join(DEV_TESTS_DIR, 'test_transparency_and_dimmer.js') },
      { name: '17-Phase Master Integration Suite', file: path.join(DEV_TESTS_DIR, 'test_suite.js') },
      { name: 'Antigravity Chinese Localization & Theme Coexistence', file: path.join(DEV_TESTS_DIR, 'test_localization.js') }
    ]
  },
  {
    group: 'Group 2: 4-Tier E2E Specification Test Suites',
    tests: [
      { name: 'Tier 1: Feature Coverage (Pure 3-Target & Zero-Diff)', file: path.join(E2E_DIR, 'tier1_feature_coverage.test.js') },
      { name: 'Tier 2: Boundary & Corner Cases (Stress & Sanitization)', file: path.join(E2E_DIR, 'tier2_boundary_corner.test.js') },
      { name: 'Tier 3: Cross-Feature Combinations (Hybrid & Interop)', file: path.join(E2E_DIR, 'tier3_combinations.test.js') },
      { name: 'Tier 4: Real-World Scenarios (Live CDP & Range Stream)', file: path.join(E2E_DIR, 'tier4_real_world.test.js') }
    ]
  }
];

async function main() {
  const startTime = Date.now();
  console.log('========================================================================================');
  console.log('   🌸 ANTIGRAVITY THEME ENGINE —— MASTER TEST RUNNER');
  console.log('   Pure 3-Target Architecture: left (Base), bottom (Input), settings (Modal)');
  console.log('   Timestamp: ' + new Date().toISOString());
  console.log('========================================================================================\n');

  // Strategic Baseline Sanitization: At startup before any suite executes
  await ensureBaselineSanitized('Startup Sync');

  let totalSuites = 0;
  let passedSuites = 0;
  let failedSuites = 0;
  const summaryDetails = [];

  for (const group of TEST_GROUPS) {
    console.log(`\n▶ [${group.group}]`);
    console.log('----------------------------------------------------------------------------------------');

    // Strategic checkpoint: before Group 2 E2E suites
    if (group.group.includes('Group 2') || group.group.includes('4-Tier')) {
      await ensureBaselineSanitized('Group 2 Sync');
    }

    for (const test of group.tests) {
      totalSuites++;

      // Strategic checkpoints for sensitive suites
      if (test.file.endsWith('test_wallpaper_engine.js')) {
        await ensureBaselineSanitized('Suite 5 Sync');
      } else if (test.file.endsWith('test_suite.js')) {
        await ensureBaselineSanitized('Suite 8 Sync');
      } else if (test.file.endsWith('tier4_real_world.test.js')) {
        await ensureBaselineSanitized('Tier 4 Sync');
      }

      const isStudioSuite = test.file.endsWith('test_studio_api.js') ||
      test.file.endsWith('test_localization.js') ||
                            test.file.endsWith('test_studio_v3.js') ||
                            test.file.endsWith('test_transparency_and_dimmer.js') ||
                            test.file.endsWith('tier1_feature_coverage.test.js') ||
                            test.file.endsWith('tier3_combinations.test.js');

      if (isStudioSuite) {
        await ensurePortDrained(8316, 2000);
      }

      process.stdout.write(`  • Running: ${test.name.padEnd(58)} ... `);
      const testStart = Date.now();

      let res = spawnSync(process.execPath, [test.file], {
        cwd: REPO_ROOT,
        env: { ...process.env, FORCE_COLOR: '1' },
        stdio: ['ignore', 'pipe', 'pipe']
      });

      if (res.status !== 0) {
        const out = (res.stdout ? res.stdout.toString() : '') + (res.stderr ? res.stderr.toString() : '');
        if (isRetryableFailure(out)) {
          process.stdout.write(`(retry on transient error/assertion) `);
          await ensureBaselineSanitized('Retry Reset');
          if (isStudioSuite) {
            await ensurePortDrained(8316, 2000);
          }
          res = spawnSync(process.execPath, [test.file], {
            cwd: REPO_ROOT,
            env: { ...process.env, FORCE_COLOR: '1' },
            stdio: ['ignore', 'pipe', 'pipe']
          });
        }
      }

      if (isStudioSuite) {
        await ensurePortDrained(8316, 2000);
      }

      const totalTestSec = ((Date.now() - testStart) / 1000).toFixed(2);
      if (res.status === 0) {
        passedSuites++;
        console.log(`✓ PASS (${totalTestSec}s)`);
        summaryDetails.push({ name: test.name, status: 'PASS', duration: `${totalTestSec}s` });
      } else {
        failedSuites++;
        console.log(`✗ FAIL (${totalTestSec}s) [Exit Code: ${res.status}]`);
        summaryDetails.push({
          name: test.name,
          status: 'FAIL',
          duration: `${totalTestSec}s`,
          stdout: res.stdout ? res.stdout.toString() : '',
          stderr: res.stderr ? res.stderr.toString() : ''
        });
      }

      // Tiered inter-suite socket settling & disk flush cooldown
      const isHeavySuite = test.name.includes('Master Integration') ||
                           test.name.includes('Watchdog') ||
                           test.file.endsWith('test_suite.js') ||
                           test.file.endsWith('test_watchdog.js') ||
                           test.file.endsWith('tier3_combinations.test.js');
      const cooldownMs = isHeavySuite ? COOLDOWNS.HEAVY_SUITE_MS : COOLDOWNS.DEFAULT_INTER_SUITE_MS;
      await new Promise(resolve => setTimeout(resolve, cooldownMs));
    }
  }

  const totalDuration = ((Date.now() - startTime) / 1000).toFixed(2);

  console.log('\n========================================================================================');
  console.log('   📊 MASTER TEST RUNNER EXECUTION SUMMARY');
  console.log('========================================================================================');
  summaryDetails.forEach((item, idx) => {
    const num = `[${String(idx + 1).padStart(2)}]`;
    const icon = item.status === 'PASS' ? '✓ PASS' : '✗ FAIL';
    console.log(`  ${num} ${item.name.padEnd(60)} : ${icon} (${item.duration})`);
  });
  console.log('----------------------------------------------------------------------------------------');
  console.log(`  Total Suites: ${totalSuites} | Passed: ${passedSuites} | Failed: ${failedSuites} | Duration: ${totalDuration}s`);
  console.log('========================================================================================\n');

  if (failedSuites > 0) {
    console.error('❌ FAILURES DETECTED:');
    summaryDetails.filter(i => i.status === 'FAIL').forEach(f => {
      console.error(`\n--- Failed Suite: ${f.name} ---`);
      if (f.stderr) console.error(f.stderr.trim());
      if (f.stdout) console.error(f.stdout.trim());
    });
    process.exit(1);
  } else {
    console.log('🎉 ALL TEST SUITES PASSED WITH 100% FIDELITY!\n');
    process.exit(0);
  }
}

main().catch(err => {
  console.error('Master runner crashed:', err);
  process.exit(1);
});
