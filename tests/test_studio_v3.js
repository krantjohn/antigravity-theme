const http = require('http');
const path = require('path');
const fs = require('fs');

async function runTests() {
  console.log('--- Starting Studio v3.0 Automated Test Suite ---');
  
  // 1. Require server.js
  const studio = require('../studio/server');
  const server = studio.server;
  const PORT = studio.PORT;
  
  function get(urlPath, headers = {}) {
    return new Promise((resolve, reject) => {
      http.get(`http://127.0.0.1:${PORT}${urlPath}`, { headers }, res => {
        let raw = '';
        res.on('data', chunk => raw += chunk);
        res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: raw }));
      }).on('error', reject);
    });
  }

  function post(urlPath, jsonBody) {
    return new Promise((resolve, reject) => {
      const data = JSON.stringify(jsonBody);
      const req = http.request(`http://127.0.0.1:${PORT}${urlPath}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(data)
        }
      }, res => {
        let raw = '';
        res.on('data', chunk => raw += chunk);
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, body: JSON.parse(raw) });
          } catch(e) {
            resolve({ status: res.statusCode, raw });
          }
        });
      });
      req.on('error', reject);
      req.write(data);
      req.end();
    });
  }

  try {
    // Test 1: HTML index
    console.log('[Test 1] GET /');
    const indexRes = await get('/');
    if (indexRes.status === 200 && indexRes.body.includes('Antigravity Theme Studio')) {
      console.log('✓ Index HTML served correctly');
    } else {
      throw new Error(`Index failed: status=${indexRes.status}`);
    }

    // Test 2: style.css
    console.log('[Test 2] GET /style.css');
    const cssRes = await get('/style.css');
    if (cssRes.status === 200 && cssRes.body.includes('.mockup-window')) {
      console.log('✓ style.css served with mockup styles');
    } else {
      throw new Error(`CSS failed: status=${cssRes.status}`);
    }

    // Test 3: app.js
    console.log('[Test 3] GET /app.js');
    const jsRes = await get('/app.js');
    if (jsRes.status === 200 && jsRes.body.includes('renderMockupPreview')) {
      console.log('✓ app.js served with renderMockupPreview');
    } else {
      throw new Error(`JS failed: status=${jsRes.status}`);
    }

    // Test 4: /api/status
    console.log('[Test 4] GET /api/status');
    const statusRes = await get('/api/status');
    const statusData = JSON.parse(statusRes.body);
    if (statusData.success && statusData.slotsConfig) {
      console.log(`✓ /api/status OK: slotsConfig present (left: ${statusData.slotsConfig.left?.file})`);
    } else {
      throw new Error('/api/status failed');
    }

    // Test 5: /api/we/list
    console.log('[Test 5] GET /api/we/list');
    const weRes = await get('/api/we/list');
    const weData = JSON.parse(weRes.body);
    if (weData.success && Array.isArray(weData.items)) {
      console.log(`✓ /api/we/list OK: ${weData.items.length} Steam Wallpaper Engine items found`);
    } else {
      throw new Error('/api/we/list failed');
    }

    // Test 6: /api/preview-file
    console.log('[Test 6] GET /api/preview-file?path=left_wallpaper.mp4');
    const previewRes = await get('/api/preview-file?path=left_wallpaper.mp4', { Range: 'bytes=0-1023' });
    if (previewRes.status === 206 || previewRes.status === 200) {
      console.log(`✓ /api/preview-file streaming responded with status ${previewRes.status}`);
    } else {
      throw new Error(`/api/preview-file failed: status=${previewRes.status}`);
    }

    // Test 7: /api/theme/apply-draft
    console.log('[Test 7] POST /api/theme/apply-draft');
    const draftPayload = {
      draftConfig: {
        left: { position: 'center center' },
        mid: { position: 'center 20%' }
      },
      fontColor: 'pure-white'
    };
    const draftRes = await post('/api/theme/apply-draft', draftPayload);
    if (draftRes.status === 200 && draftRes.body.success) {
      console.log('✓ /api/theme/apply-draft committed draft changes successfully');
    } else {
      throw new Error(`/api/theme/apply-draft failed: ${JSON.stringify(draftRes.body)}`);
    }

    console.log('\n=============================================');
    console.log('🎉 ALL STUDIO V3.0 AUTOMATED TESTS PASSED! 🎉');
    console.log('=============================================');
  } catch (err) {
    console.error('❌ Test failed:', err);
    process.exitCode = 1;
  } finally {
    if (server.listening) {
      server.close();
    }
    process.exit(process.exitCode || 0);
  }
}

runTests();
