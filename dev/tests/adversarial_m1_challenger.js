/**
 * Adversarial Empirical Challenge Suite for Milestone 1
 * Targets:
 * 1. Slot input fuzzing & uncaught exception stress (null, numbers, boolean, objects, symbols)
 * 2. Invalid and deprecated slot names (mid, right, unicode, empty, proto pollution)
 * 3. Rapid wallpaper swaps and concurrency resilience
 * 4. Terminal & auxiliary drawer strict transparency invariants
 * 5. Live CDP (8314) & Media server (8315) verification without interrupting Antigravity.exe
 */

const fs = require('fs');
const path = require('path');
const http = require('http');
const assert = require('assert');

const engine = require('../../core/theme_engine');
const { startMediaServer, isMediaServerRunning, DEFAULT_PORT } = require('../../core/media_server');

const antigravityDir = process.env.ANTIGRAVITY_CONFIG_DIR || path.join(require('os').homedir(), '.gemini', 'antigravity');
const slotsConfigPath = path.join(antigravityDir, 'slots_config.json');
const repoWallpapers = path.join(__dirname, '..', '..', 'wallpapers');
const sampleVideoPath = path.join(__dirname, 'sample_wallpaper.mp4');

const results = {
  passed: 0,
  failed: 0,
  vulnerabilities: []
};

function recordPass(testName) {
  results.passed++;
  console.log(`  ✓ [PASS] ${testName}`);
}

function recordVuln(severity, title, details) {
  results.failed++;
  results.vulnerabilities.push({ severity, title, details });
  console.log(`  ❌ [${severity.toUpperCase()}] ${title}: ${details}`);
}

async function evalCdp(expression) {
  return new Promise((resolve, reject) => {
    http.get('http://127.0.0.1:8314/json', (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try {
          const list = JSON.parse(data);
          const page = list.find(p => p.type === 'page');
          if (!page) return reject(new Error('No page found in CDP targets'));
          const ws = new WebSocket(page.webSocketDebuggerUrl);
          ws.addEventListener('open', () => {
            ws.send(JSON.stringify({ id: 1, method: 'Runtime.evaluate', params: { expression, returnByValue: true, awaitPromise: true } }));
          });
          ws.addEventListener('message', (evt) => {
            try {
              const resp = JSON.parse(evt.data);
              ws.close();
              resolve(resp.result && resp.result.result ? resp.result.result.value : resp);
            } catch (e) {
              resolve(null);
            }
          });
          ws.addEventListener('error', reject);
        } catch (e) { reject(e); }
      });
    }).on('error', reject);
  });
}

async function runAdversarialSuite() {
  console.log('========================================================================');
  console.log(' 🔥 ADVERSARIAL EMPIRICAL CHALLENGE SUITE: MILESTONE 1');
  console.log('========================================================================\n');

  // Backup current live configuration
  let originalConfig = null;
  if (fs.existsSync(slotsConfigPath)) {
    try {
      originalConfig = JSON.parse(fs.readFileSync(slotsConfigPath, 'utf8'));
    } catch (e) {}
  }

  try {
    // -------------------------------------------------------------------------
    // Phase 1: Slot Input Fuzzing (Type safety & Unhandled Exception Mining)
    // -------------------------------------------------------------------------
    console.log('▶ [Phase 1: Slot Input Fuzzing & Type Robustness]');
    
    const fuzzInputs = [
      { label: 'null', val: null },
      { label: 'undefined', val: undefined },
      { label: 'empty string', val: '' },
      { label: 'whitespace only', val: '   ' },
      { label: 'number 0', val: 0 },
      { label: 'number 1', val: 1 },
      { label: 'number 42', val: 42 },
      { label: 'negative number -1', val: -1 },
      { label: 'float 3.14', val: 3.14 },
      { label: 'NaN', val: NaN },
      { label: 'boolean true', val: true },
      { label: 'boolean false', val: false },
      { label: 'empty object {}', val: {} },
      { label: 'empty array []', val: [] },
      { label: 'nested object { a: 1 }', val: { a: 1 } },
      { label: 'symbol Symbol(left)', val: Symbol('left') }
    ];

    const methodsToFuzz = [
      { name: 'restoreSlotVanilla', fn: (val) => engine.restoreSlotVanilla(val) },
      { name: 'swapWallpaper', fn: (val) => engine.swapWallpaper(val, path.join(repoWallpapers, 'left_wallpaper.jpg')) },
      { name: 'setPosition', fn: (val) => engine.setPosition(val, 'center center') },
      { name: 'adjustPosition', fn: (val) => engine.adjustPosition(val, 'up', 5) },
      { name: 'resetPosition', fn: (val) => engine.resetPosition(val) },
      { name: 'resetSlotWallpaper', fn: (val) => engine.resetSlotWallpaper(val) }
    ];

    for (const method of methodsToFuzz) {
      for (const input of fuzzInputs) {
        try {
          const res = await method.fn(input.val);
          // If it didn't throw and returned false or { ok: false }, that is safe rejection
          if (res === false || (res && res.ok === false) || (typeof res === 'object' && !res.ok)) {
            // safely handled
          }
        } catch (err) {
          // If it threw an uncaught TypeError (e.g. slotInput.toLowerCase is not a function)
          recordVuln('High', `Unhandled Exception in ${method.name}`, 
            `Passing ${input.label} caused uncaught exception: "${err.message}"`);
        }
      }
    }
    if (results.vulnerabilities.filter(v => v.title.includes('Unhandled Exception in')).length === 0) {
      recordPass('All fuzz inputs handled safely without uncaught exceptions');
    }

    // -------------------------------------------------------------------------
    // Phase 2: Invalid, Deprecated & Malicious Slot Name Validation
    // -------------------------------------------------------------------------
    console.log('\n▶ [Phase 2: Deprecated & Malicious Slot Rejection]');

    const invalidSlotNames = [
      'mid', 'MID', 'Mid', 'mId',
      'right', 'RIGHT', 'Right',
      '中', '右', '中间', '右侧',
      'left\0', 'left\u200B', 'left\n', 'left\t',
      'left<script>alert(1)</script>',
      '../../etc/passwd', '..\\..\\windows\\system32',
      '__proto__', 'constructor', 'prototype', 'toString', 'valueOf',
      '🚀', '💥', '✨',
      'A'.repeat(10000) // Buffer/string overflow stress
    ];

    for (const slotName of invalidSlotNames) {
      const resVanilla = await engine.restoreSlotVanilla(slotName);
      assert.strictEqual(resVanilla, false, `restoreSlotVanilla("${slotName}") must return false`);

      const resSwap = await engine.swapWallpaper(slotName, path.join(repoWallpapers, 'left_wallpaper.jpg'));
      assert.strictEqual(resSwap, false, `swapWallpaper("${slotName}") must return false`);

      const resSetPos = await engine.setPosition(slotName, '50% 50%');
      assert.strictEqual(resSetPos, false, `setPosition("${slotName}") must return false`);

      const resAdj = await engine.adjustPosition(slotName, 'up');
      assert.strictEqual(resAdj, false, `adjustPosition("${slotName}") must return false`);
    }
    recordPass(`Successfully rejected ${invalidSlotNames.length} invalid/deprecated/malicious slot names`);

    // Verify valid slots and aliases are accepted
    const validSlots = ['left', '左', 'global', 'main', 'base', 'bottom', '下', 'input', 'settings', '设置', '设', 'config'];
    for (const valid of validSlots) {
      const alias = engine.SLOT_ALIASES[valid.toLowerCase()];
      assert.ok(alias, `Alias for ${valid} must exist`);
      assert.ok(['left', 'bottom', 'settings'].includes(alias), `Target for ${valid} must be one of 3 valid targets`);
    }
    recordPass(`Confirmed all ${validSlots.length} valid slot aliases map strictly to 3 targets (left, bottom, settings)`);

    // -------------------------------------------------------------------------
    // Phase 3: Terminal & Drawer Strict Transparency & CSS Purge Invariants
    // -------------------------------------------------------------------------
    console.log('\n▶ [Phase 3: Terminal & Drawer Transparency & Zero-Diff Invariants]');

    // Scenario A: Vanilla Mode (isOriginal: true)
    const vanillaCss = engine.generateMasterCss({ isOriginal: true });
    assert.strictEqual(vanillaCss.trim(), '/* Antigravity Wallpaper Engine: Vanilla Mode */',
      'Vanilla mode must generate strictly vanilla comment and zero styling rules');
    recordPass('Vanilla Mode generates 100% zero-diff comment with zero styling rules');

    // Scenario B: Active 3-Target configuration
    const activeTestConfig = {
      isOriginal: false,
      left: { key: 'left', file: 'left_wallpaper.jpg', type: 'image', position: 'center center' },
      bottom: { key: 'bottom', file: 'input_wallpaper.jpg', type: 'image', position: 'center 6%' },
      settings: { key: 'settings', file: 'settings_wallpaper.png', type: 'image', position: 'center 65%' }
    };
    const activeCss = engine.generateMasterCss(activeTestConfig);

    // Verify Terminal transparency
    assert.ok(activeCss.includes('.terminal.xterm'), 'Master CSS must contain .terminal.xterm selector');
    assert.ok(activeCss.includes('background: transparent !important;'), 'Terminal must have background: transparent !important');
    assert.ok(activeCss.includes('background-image: none !important;'), 'Terminal must have background-image: none !important');
    recordPass('Terminal rules enforce strictly transparent pass-through and no background-image');

    // Verify Auxiliary Drawer transparency
    assert.ok(activeCss.includes('[aria-label="Auxiliary Pane"]') || activeCss.includes('.antigravity-drawer') || activeCss.includes('aside'),
      'Master CSS must contain auxiliary pane selector');
    assert.ok(activeCss.includes('border-left: none !important;'), 'Drawer must have border-left: none !important');
    recordPass('Auxiliary drawer rules enforce strictly transparent pass-through');

    // Verify Elimination of Styling Tweaks
    const forbiddenPatterns = [
      '#f472b6', 'rgba(244, 114, 182', '244, 114, 182',
      'Maple Mono', 'maple-mono',
      '#ff1493', '#ff69b4',
      'backdrop-filter: blur',
      'text-shadow: 0 0 8px',
      'crtShutdown', 'crt-power-off'
    ];
    for (const pattern of forbiddenPatterns) {
      assert.strictEqual(activeCss.includes(pattern), false, `Active CSS must not contain forbidden tweak: "${pattern}"`);
    }
    recordPass('Purged 100% of intrusive styling tweaks (pink accents, Maple Mono font, CRT animations, blur filters)');

    // -------------------------------------------------------------------------
    // Phase 4: Rapid Wallpaper Swapping & Concurrency Stress Test
    // -------------------------------------------------------------------------
    console.log('\n▶ [Phase 4: Rapid Wallpaper Swapping & Concurrency Stress]');

    const staticImg = path.join(repoWallpapers, 'left_wallpaper.jpg');
    const dynamicVid = sampleVideoPath;

    if (fs.existsSync(dynamicVid) && fs.existsSync(staticImg)) {
      console.log('  Executing 10 rapid alternating swaps between video and image on left slot...');
      for (let i = 0; i < 10; i++) {
        const target = (i % 2 === 0) ? dynamicVid : staticImg;
        const ok = await engine.swapWallpaper('left', target);
        assert.ok(ok, `Rapid swap iteration ${i + 1} must succeed`);
      }
      recordPass('10 sequential rapid wallpaper swaps succeeded cleanly');

      // Concurrency stress: concurrent position adjustments and slot status queries
      console.log('  Firing 15 concurrent position adjustments...');
      const directions = ['up', 'down', 'left', 'right', 'center'];
      const promises = [];
      for (let i = 0; i < 15; i++) {
        promises.push(engine.adjustPosition('left', directions[i % directions.length], 2));
      }
      await Promise.all(promises);

      // Verify slots_config.json integrity
      const postStressConfig = engine.loadSlotsConfig();
      assert.ok(postStressConfig.left, 'Config left slot must exist after concurrency stress');
      assert.ok(postStressConfig.left.position, 'Position string must remain valid');
      recordPass('Config integrity and position math preserved under concurrency stress');
    } else {
      console.log('  ⚠️ Sample media missing, skipping rapid media swap stress');
    }

    // -------------------------------------------------------------------------
    // Phase 5: Live Infrastructure Continuity (CDP 8314 & Media Server 8315)
    // -------------------------------------------------------------------------
    console.log('\n▶ [Phase 5: Live Infrastructure Continuity Verification]');

    // 1. Verify Media Server (port 8315) Range streaming
    const mediaCheck = await new Promise((resolve) => {
      const req = http.request({
        host: '127.0.0.1',
        port: 8315,
        path: '/left_wallpaper.mp4',
        headers: { Range: 'bytes=0-1023' }
      }, (res) => {
        let chunkLen = 0;
        res.on('data', chunk => chunkLen += chunk.length);
        res.on('end', () => {
          resolve({
            statusCode: res.statusCode,
            acceptRanges: res.headers['accept-ranges'],
            contentRange: res.headers['content-range'],
            bytesReceived: chunkLen
          });
        });
      });
      req.on('error', (err) => resolve({ error: err.message }));
      req.end();
    });

    if (mediaCheck.statusCode === 206 || mediaCheck.statusCode === 200) {
      recordPass(`Media server (port 8315) active: HTTP ${mediaCheck.statusCode}, bytes received: ${mediaCheck.bytesReceived}`);
    } else {
      recordVuln('Medium', 'Media Server HTTP Check Failed', JSON.stringify(mediaCheck));
    }

    // 2. Verify Live CDP connection (port 8314)
    try {
      const cdpRes = await evalCdp('(() => ({ title: document.title, location: window.location.href, vids: document.querySelectorAll("video").length }))()');
      if (cdpRes && cdpRes.title !== undefined) {
        recordPass(`CDP connection (port 8314) verified live: Page title "${cdpRes.title}", active videos: ${cdpRes.vids}`);
      } else {
        recordVuln('High', 'CDP Evaluation Returned Invalid Payload', JSON.stringify(cdpRes));
      }
    } catch (err) {
      recordVuln('High', 'CDP Connection Failed', err.message);
    }

  } finally {
    // Restore user environment safely
    if (originalConfig) {
      try {
        fs.writeFileSync(slotsConfigPath, JSON.stringify(originalConfig, null, 2), 'utf8');
        const css = engine.generateMasterCss(originalConfig);
        fs.writeFileSync(path.join(antigravityDir, 'custom_theme.css'), css, 'utf8');
        await engine.triggerLiveHotReload(css, originalConfig);
        console.log('\n✓ Live user environment successfully restored.');
      } catch (e) {}
    }
  }

  // Final Summary
  console.log('\n========================================================================');
  console.log(` 📊 ADVERSARIAL STRESS TEST SUMMARY`);
  console.log(`    Total Passed Checks: ${results.passed}`);
  console.log(`    Vulnerabilities Found: ${results.vulnerabilities.length}`);
  console.log('========================================================================\n');

  if (results.vulnerabilities.length > 0) {
    console.log('Vulnerability Details:');
    results.vulnerabilities.forEach((v, idx) => {
      console.log(`  [${idx + 1}] [${v.severity}] ${v.title}: ${v.details}`);
    });
  }

  return results;
}

if (require.main === module) {
  runAdversarialSuite()
    .then((res) => {
      process.exit(res.vulnerabilities.length > 0 ? 1 : 0);
    })
    .catch((err) => {
      console.error('Fatal suite crash:', err);
      process.exit(2);
    });
}

module.exports = { runAdversarialSuite };
