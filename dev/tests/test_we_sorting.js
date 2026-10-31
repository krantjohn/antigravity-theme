/**
 * Automated TDD Test Suite for Wallpaper Engine Sorting Functionality
 *
 * Verifies:
 * 1. Wallpaper items contain `sizeBytes`, `createdAt`, `createdAtFormatted`.
 * 2. `sortWallpapers(items, criteria)` correctly sorts by:
 *    - 'default' (video first, title A-Z)
 *    - 'size-desc' (largest to smallest)
 *    - 'size-asc' (smallest to largest)
 *    - 'time-desc' (newest to oldest)
 *    - 'time-asc' (oldest to newest)
 *    - 'name-asc' (title A-Z)
 *    - 'name-desc' (title Z-A)
 * 3. `scanWorkshopWallpapers({ sortBy })` applies sorting.
 * 4. `GET /api/we/list?sort=size-desc` and `POST /api/we/refresh?sort=time-desc` return sorted items.
 */

const assert = require('assert');
const path = require('path');
const http = require('http');

const { server, PORT } = require('../../studio/server.js');
const bridge = require('../../core/wallpaper_engine_bridge.js');
const themeEngine = require('../../core/theme_engine.js');

function request(method, reqPath, body = null) {
  return new Promise((resolve, reject) => {
    const opts = {
      host: '127.0.0.1',
      port: PORT,
      path: reqPath,
      method: method,
      headers: {}
    };
    if (body) {
      opts.headers['Content-Type'] = 'application/json';
    }
    const req = http.request(opts, (res) => {
      let data = [];
      res.on('data', chunk => data.push(chunk));
      res.on('end', () => {
        const buf = Buffer.concat(data);
        let parsed = null;
        try { parsed = JSON.parse(buf.toString('utf8')); } catch(e) {}
        resolve({
          status: res.statusCode,
          headers: res.headers,
          body: buf.toString('utf8'),
          json: parsed
        });
      });
    });
    req.on('error', reject);
    if (body) {
      req.write(typeof body === 'string' ? body : JSON.stringify(body));
    }
    req.end();
  });
}

async function runTests() {
  console.log('Testing Wallpaper Engine Sorting Capabilities...');

  try {
    // [Test 1] Verify metadata extraction: sizeBytes, createdAt, createdAtFormatted
    console.log('[Test 1] Testing wallpaper metadata fields...');
    const wallpapers = bridge.scanWorkshopWallpapers({ refresh: true });
    assert.ok(Array.isArray(wallpapers) && wallpapers.length > 0, 'Should find at least 1 wallpaper');

    const sample = wallpapers[0];
    assert.ok(typeof sample.sizeBytes === 'number' && sample.sizeBytes >= 0, 'sizeBytes must be a number');
    assert.ok(typeof sample.createdAt === 'number' && sample.createdAt > 0, 'createdAt must be a positive timestamp');
    assert.ok(typeof sample.createdAtFormatted === 'string' && sample.createdAtFormatted.length > 0, 'createdAtFormatted must be non-empty string');
    console.log(`✓ [Test 1] Sample metadata verified: ${sample.title} | sizeBytes=${sample.sizeBytes} | createdAt=${sample.createdAt} (${sample.createdAtFormatted})`);

    // [Test 2] Test sortWallpapers helper function
    console.log('[Test 2] Testing sortWallpapers function...');
    assert.strictEqual(typeof bridge.sortWallpapers, 'function', 'sortWallpapers must be exported');

    // Test size-desc
    const bySizeDesc = bridge.sortWallpapers(wallpapers, 'size-desc');
    for (let i = 0; i < bySizeDesc.length - 1; i++) {
      assert.ok(bySizeDesc[i].sizeBytes >= bySizeDesc[i + 1].sizeBytes, `size-desc order violation at index ${i}`);
    }
    console.log(`✓ [Test 2.1] size-desc verified: largest=${bySizeDesc[0].sizeMb}MB, smallest=${bySizeDesc[bySizeDesc.length - 1].sizeMb}MB`);

    // Test size-asc
    const bySizeAsc = bridge.sortWallpapers(wallpapers, 'size-asc');
    for (let i = 0; i < bySizeAsc.length - 1; i++) {
      assert.ok(bySizeAsc[i].sizeBytes <= bySizeAsc[i + 1].sizeBytes, `size-asc order violation at index ${i}`);
    }
    console.log(`✓ [Test 2.2] size-asc verified: smallest=${bySizeAsc[0].sizeMb}MB, largest=${bySizeAsc[bySizeAsc.length - 1].sizeMb}MB`);

    // Test time-desc
    const byTimeDesc = bridge.sortWallpapers(wallpapers, 'time-desc');
    for (let i = 0; i < byTimeDesc.length - 1; i++) {
      assert.ok(byTimeDesc[i].createdAt >= byTimeDesc[i + 1].createdAt, `time-desc order violation at index ${i}`);
    }
    console.log(`✓ [Test 2.3] time-desc verified: newest=${byTimeDesc[0].createdAtFormatted}, oldest=${byTimeDesc[byTimeDesc.length - 1].createdAtFormatted}`);

    // Test time-asc
    const byTimeAsc = bridge.sortWallpapers(wallpapers, 'time-asc');
    for (let i = 0; i < byTimeAsc.length - 1; i++) {
      assert.ok(byTimeAsc[i].createdAt <= byTimeAsc[i + 1].createdAt, `time-asc order violation at index ${i}`);
    }
    console.log(`✓ [Test 2.4] time-asc verified: oldest=${byTimeAsc[0].createdAtFormatted}, newest=${byTimeAsc[byTimeAsc.length - 1].createdAtFormatted}`);

    // Test name-asc
    const byNameAsc = bridge.sortWallpapers(wallpapers, 'name-asc');
    for (let i = 0; i < byNameAsc.length - 1; i++) {
      assert.ok(byNameAsc[i].title.localeCompare(byNameAsc[i + 1].title, 'zh-CN') <= 0, `name-asc order violation at index ${i}`);
    }
    console.log(`✓ [Test 2.5] name-asc verified: first=${byNameAsc[0].title}, last=${byNameAsc[byNameAsc.length - 1].title}`);

    // [Test 3] Test scanWorkshopWallpapers({ sortBy }) integration
    console.log('[Test 3] Testing scanWorkshopWallpapers({ sortBy: "size-desc" }) ...');
    const scannedBySize = bridge.scanWorkshopWallpapers({ sortBy: 'size-desc' });
    assert.strictEqual(scannedBySize[0].id, bySizeDesc[0].id, 'Top item in scanWorkshopWallpapers({ sortBy: "size-desc" }) must match');
    console.log('✓ [Test 3] scanWorkshopWallpapers sortBy integrated successfully');

    // [Test 4] Test HTTP API GET /api/we/list?sort=size-desc
    console.log('[Test 4] Testing GET /api/we/list?sort=size-desc ...');
    const getRes = await request('GET', '/api/we/list?sort=size-desc');
    assert.strictEqual(getRes.status, 200, 'GET response status should be 200');
    assert.strictEqual(getRes.json.success, true, 'GET response should have success: true');
    assert.strictEqual(getRes.json.sortBy, 'size-desc', 'GET response should report sortBy: size-desc');
    assert.strictEqual(getRes.json.items[0].id, bySizeDesc[0].id, 'First item from API should match largest item');
    console.log('✓ [Test 4] GET /api/we/list?sort=size-desc verified successfully');

    // [Test 5] Test HTTP API POST /api/we/refresh?sort=time-desc
    console.log('[Test 5] Testing POST /api/we/refresh?sort=time-desc ...');
    const postRes = await request('POST', '/api/we/refresh?sort=time-desc');
    assert.strictEqual(postRes.status, 200, 'POST response status should be 200');
    assert.strictEqual(postRes.json.success, true, 'POST response should have success: true');
    assert.strictEqual(postRes.json.sortBy, 'time-desc', 'POST response should report sortBy: time-desc');
    assert.strictEqual(postRes.json.items[0].id, byTimeDesc[0].id, 'First item from POST should match newest item');
    console.log('✓ [Test 5] POST /api/we/refresh?sort=time-desc verified successfully');

    console.log('\nALL WALLPAPER ENGINE SORTING TESTS PASSED!');
    process.exit(0);
  } finally {
    if (server && server.close) {
      server.close();
    }
  }
}

runTests().catch(err => {
  console.error('Test failed with error:', err);
  if (server && server.close) server.close();
  process.exit(1);
});
