const assert = require('assert');
const http = require('http');
const path = require('path');
const { startMediaServer, isMediaServerRunning, MIME_TYPES } = require('../core/media_server');

const testWallpapersDir = path.join(__dirname, '..', 'wallpapers');
const TEST_PORT = 8321;

async function runTests() {
  console.log('Testing media_server.js...');

  const beforeStart = await isMediaServerRunning(TEST_PORT);
  assert.strictEqual(beforeStart, false, 'Should report not running before start');

  const server = startMediaServer(testWallpapersDir, TEST_PORT);

  // Wait for server to listen
  await new Promise(r => setTimeout(r, 100));

  const afterStart = await isMediaServerRunning(TEST_PORT);
  assert.strictEqual(afterStart, true, 'Should report running after start');

  // Test 1: Health check
  await new Promise((resolve, reject) => {
    http.get(`http://127.0.0.1:${TEST_PORT}/health`, (res) => {
      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(res.headers['access-control-allow-origin'], '*');
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        assert.strictEqual(data, 'OK');
        resolve();
      });
    }).on('error', reject);
  });

  // Test 2: Fetching an existing wallpaper
  await new Promise((resolve, reject) => {
    http.get(`http://127.0.0.1:${TEST_PORT}/left_wallpaper.jpg`, (res) => {
      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(res.headers['content-type'], 'image/jpeg');
      assert.strictEqual(res.headers['accept-ranges'], 'bytes');
      assert.ok(parseInt(res.headers['content-length'], 10) > 0);
      resolve();
    }).on('error', reject);
  });

  // Test 3: Range request
  await new Promise((resolve, reject) => {
    const options = {
      hostname: '127.0.0.1',
      port: TEST_PORT,
      path: '/left_wallpaper.jpg',
      headers: { Range: 'bytes=0-99' }
    };
    http.get(options, (res) => {
      assert.strictEqual(res.statusCode, 206);
      assert.strictEqual(res.headers['content-range'], `bytes 0-99/${res.headers['content-range'].split('/')[1]}`);
      assert.strictEqual(res.headers['content-length'], '100');
      resolve();
    }).on('error', reject);
  });

  // Test 4: 404 for nonexistent file
  await new Promise((resolve, reject) => {
    http.get(`http://127.0.0.1:${TEST_PORT}/nonexistent_file.mp4`, (res) => {
      assert.strictEqual(res.statusCode, 404);
      resolve();
    }).on('error', reject);
  });

  // Clean up
  if (typeof server.closeAllConnections === 'function') {
    server.closeAllConnections();
  }
  server.close();
  http.globalAgent.destroy();
  console.log('✓ All media_server.js unit tests passed!');
  process.exit(0);
}

runTests().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
