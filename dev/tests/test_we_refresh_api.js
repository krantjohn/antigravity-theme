const http = require('http');
const assert = require('assert');
const { server, PORT } = require('../../studio/server');
const themeEngine = require('../../core/theme_engine');

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

async function run() {
  console.log('Testing Wallpaper Engine Refresh & Detection Endpoints...');

  try {
    // 1. Test GET /api/we/list with refresh=true
    console.log('[Test 1] Testing GET /api/we/list?refresh=true ...');
    const getRes = await request('GET', '/api/we/list?refresh=true');
    assert.strictEqual(getRes.status, 200, 'GET /api/we/list?refresh=true should return 200');
    assert.strictEqual(getRes.json.success, true, 'GET response should have success: true');
    assert.strictEqual(typeof getRes.json.count, 'number', 'GET response should have numeric count');
    assert.ok(Array.isArray(getRes.json.items), 'GET response items should be an array');
    assert.strictEqual(getRes.json.refreshed, true, 'GET response should indicate refreshed: true');
    console.log(`✓ [Test 1] GET /api/we/list?refresh=true passed (count: ${getRes.json.count})`);

    // 2. Test POST /api/we/refresh
    console.log('[Test 2] Testing POST /api/we/refresh ...');
    const postRes = await request('POST', '/api/we/refresh');
    assert.strictEqual(postRes.status, 200, 'POST /api/we/refresh should return 200');
    assert.strictEqual(postRes.json.success, true, 'POST response should have success: true');
    assert.strictEqual(typeof postRes.json.count, 'number', 'POST response should have numeric count');
    assert.ok(Array.isArray(postRes.json.items), 'POST response items should be an array');
    assert.strictEqual(postRes.json.refreshed, true, 'POST response should indicate refreshed: true');
    console.log(`✓ [Test 2] POST /api/we/refresh passed (count: ${postRes.json.count})`);

    // 3. Test themeEngine.listWallpaperEngineWallpapers with refresh option
    console.log('[Test 3] Testing themeEngine.listWallpaperEngineWallpapers({ refresh: true }) ...');
    const items = themeEngine.listWallpaperEngineWallpapers({ refresh: true });
    assert.ok(Array.isArray(items), 'themeEngine should return array of items on refresh');
    console.log(`✓ [Test 3] themeEngine.listWallpaperEngineWallpapers passed (count: ${items.length})`);

    console.log('ALL API REFRESH TESTS PASSED!');
    process.exit(0);
  } catch (err) {
    console.error('TEST FAILED:', err);
    process.exit(1);
  }
}

run();
