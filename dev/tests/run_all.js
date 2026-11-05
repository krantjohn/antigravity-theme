/**
 * Master Test Runner for Antigravity Theme Engine
 * Pure 3-Target Edition (left, bottom, settings)
 * 
 * Executes:
 * 1. Modernized Unit & Integration Suites (6 suites)
 * 2. 4-Tier Comprehensive E2E Test Suite (Tiers 1 - 4)
 * 
 * Usage:
 *   node dev/tests/run_all.js
 */

const { spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const DEV_TESTS_DIR = path.join(REPO_ROOT, 'dev', 'tests');
const E2E_DIR = path.join(DEV_TESTS_DIR, 'e2e');

const TEST_GROUPS = [
  {
    group: 'Group 1: Modernized Unit & Integration Suites',
    tests: [
      { name: 'Slot Vanilla Restore', file: path.join(DEV_TESTS_DIR, 'test_slot_vanilla.js') },
      { name: 'Seamless Wallpaper Swap', file: path.join(DEV_TESTS_DIR, 'test_seamless_swap.js') },
      { name: 'Studio REST API & V2', file: path.join(DEV_TESTS_DIR, 'test_studio_api.js') },
      { name: 'Studio V3 Bento Integration', file: path.join(DEV_TESTS_DIR, 'test_studio_v3.js') },
      { name: 'Wallpaper Engine Bridge', file: path.join(DEV_TESTS_DIR, 'test_wallpaper_engine.js') },
      { name: '17-Phase Master Integration Suite', file: path.join(DEV_TESTS_DIR, 'test_suite.js') }
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

  let totalSuites = 0;
  let passedSuites = 0;
  let failedSuites = 0;
  const summaryDetails = [];

  for (const group of TEST_GROUPS) {
    console.log(`\n▶ [${group.group}]`);
    console.log('----------------------------------------------------------------------------------------');

    for (const test of group.tests) {
      totalSuites++;
      process.stdout.write(`  • Running: ${test.name.padEnd(58)} ... `);
      const testStart = Date.now();

      const res = spawnSync(process.execPath, [test.file], {
        cwd: REPO_ROOT,
        env: { ...process.env, FORCE_COLOR: '1' },
        stdio: ['ignore', 'pipe', 'pipe']
      });

      const durationMs = Date.now() - testStart;
      const durationSec = (durationMs / 1000).toFixed(2);

      if (res.status === 0) {
        passedSuites++;
        console.log(`✓ PASS (${durationSec}s)`);
        summaryDetails.push({ name: test.name, status: 'PASS', duration: `${durationSec}s` });
      } else {
        failedSuites++;
        console.log(`✗ FAIL (${durationSec}s) [Exit Code: ${res.status}]`);
        summaryDetails.push({
          name: test.name,
          status: 'FAIL',
          duration: `${durationSec}s`,
          stdout: res.stdout ? res.stdout.toString() : '',
          stderr: res.stderr ? res.stderr.toString() : ''
        });
      }
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
