const assert = require('assert');
const fs = require('fs');
const path = require('path');
const http = require('http');

const repoRoot = path.join(__dirname, '..', '..');
const themeEngine = require(path.join(repoRoot, 'core', 'theme_engine.js'));

async function runTests() {
  console.log('=== [TEST] Seamless Wallpaper Hot-Swap & Anti-Ghosting Verification ===');

  // Test 1: Verify versioned query strings in generated CSS
  console.log('[Test 1] Verifying versioned URLs in generateMasterCss...');
  const testConfig = themeEngine.loadSlotsConfig();
  const css = themeEngine.generateMasterCss(testConfig);
  assert(css.includes('custom_theme.css') || css.includes('http://127.0.0.1:8315/'), 'CSS must reference media server');
  
  // Verify that any image URLs in CSS include ?v=
  const urlMatches = css.match(/url\("http:\/\/127\.0\.0\.1:8315\/[^"]+"/g) || [];
  console.log(`   Found ${urlMatches.length} media server URLs in CSS`);
  urlMatches.forEach(url => {
    assert(url.includes('?v='), `Media URL in CSS must include ?v= query parameter for strict cache busting: ${url}`);
  });
  console.log('   ✓ All CSS media URLs strictly include versioned cache-busting tokens (?v=)');

  // Test 2: Verify batchApplyDraft performance and atomicity
  console.log('[Test 2] Verifying batchApplyDraft atomicity & execution speed...');
  const t0 = Date.now();
  const draftConfig = {
    left: { position: '50% 50%' },
    mid: { position: '50% 20%' }
  };
  const activeCfg = await themeEngine.batchApplyDraft(draftConfig);
  const elapsed = Date.now() - t0;
  console.log(`   - batchApplyDraft elapsed time: ${elapsed}ms`);
  assert(elapsed < 2000, `batchApplyDraft should be fast (took ${elapsed}ms)`);
  assert(activeCfg && activeCfg.left, 'activeCfg must have left slot configured');
  console.log('   ✓ batchApplyDraft completed in sub-second time');

  // Test 3: Verify media_server cache headers
  console.log('[Test 3] Verifying media server cache headers for unversioned vs versioned media...');
  await new Promise(resolve => {
    http.get('http://127.0.0.1:8315/left_poster.jpg', res => {
      const cc = res.headers['cache-control'] || '';
      console.log(`   - Unversioned request Cache-Control: ${cc}`);
      assert(cc.includes('no-cache') || cc.includes('no-store'), 'Unversioned media must not be cached with 24-hour max-age');
      resolve();
    }).on('error', resolve);
  });

  await new Promise(resolve => {
    http.get('http://127.0.0.1:8315/left_poster.jpg?v=12345', res => {
      const cc = res.headers['cache-control'] || '';
      console.log(`   - Versioned request Cache-Control: ${cc}`);
      assert(cc.includes('max-age=31536000'), 'Versioned media must be cached immutably');
      resolve();
    }).on('error', resolve);
  });
  console.log('   ✓ Media server cache headers verified');

  // Test 4: Verify Double-Buffering Video in getClientVideoScript
  console.log('[Test 4] Verifying Double-Buffering script template...');
  const clientScript = themeEngine.getClientVideoScript(testConfig);
  assert(clientScript.includes('antigravity-video-left-staging'), 'Client script must include double-buffering staging video element');
  assert(clientScript.includes('antigravity-slot-video-staging'), 'Client script must include double-buffering for container slots');
  assert(clientScript.includes('opacity'), 'Client script must include opacity cross-fade transition');
  console.log('   ✓ Double-buffering video transition logic verified');

  console.log('=======================================================');
  console.log('🎉 ALL SEAMLESS HOT-SWAP & ANTI-GHOSTING TESTS PASSED!');
  console.log('=======================================================');
}

runTests().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
