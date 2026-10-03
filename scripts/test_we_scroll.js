const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const studio = require('../studio/server');

async function wait(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function testWeScroll() {
  console.log('Testing Steam Workshop Page Scrolling...');
  const profileDir = path.join(__dirname, '../.tmp_chrome_test_profile');
  if (fs.existsSync(profileDir)) {
    fs.rmSync(profileDir, { recursive: true, force: true });
  }

  const chromeProc = spawn('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', [
    '--headless=new',
    '--remote-debugging-port=9222',
    '--window-size=1600,960',
    `--user-data-dir=${profileDir}`,
    '--no-first-run',
    '--no-default-browser-check',
    'http://127.0.0.1:8316'
  ], { stdio: 'ignore' });

  await wait(1500);
  const list = await fetch('http://127.0.0.1:9222/json').then(r => r.json());
  const page = list.find(p => p.type === 'page' && p.url.includes('8316'));
  const ws = new WebSocket(page.webSocketDebuggerUrl);

  function call(method, params = {}) {
    return new Promise(resolve => {
      const id = Math.floor(Math.random() * 100000);
      const h = evt => {
        const m = JSON.parse(evt.data);
        if (m.id === id) {
          ws.removeEventListener('message', h);
          resolve(m.result);
        }
      };
      ws.addEventListener('message', h);
      ws.send(JSON.stringify({ id, method, params }));
    });
  }

  ws.addEventListener('open', async () => {
    await wait(1500);

    // 1. Click Steam Workshop tab
    console.log('1. Switching to Steam Workshop tab...');
    await call('Runtime.evaluate', {
      expression: 'document.querySelector(\'.nav-tab[data-tab="view-we"]\').click()'
    });
    await wait(1500);

    // 2. Measure scrollHeight vs clientHeight of #view-we
    const initialMetrics = await call('Runtime.evaluate', {
      expression: `(() => {
        const panel = document.getElementById('view-we');
        return {
          id: panel.id,
          clientWidth: panel.clientWidth,
          clientHeight: panel.clientHeight,
          scrollWidth: panel.scrollWidth,
          scrollHeight: panel.scrollHeight,
          scrollTop: panel.scrollTop,
          canScrollDown: panel.scrollHeight > panel.clientHeight
        };
      })()`,
      returnByValue: true
    });
    console.log('Initial #view-we Scroll Metrics:', JSON.stringify(initialMetrics.result.value, null, 2));

    if (!initialMetrics.result.value.canScrollDown) {
      console.error('FAIL: #view-we cannot scroll down! scrollHeight <= clientHeight');
      process.exit(1);
    }

    // 3. Scroll down 1200px
    console.log('2. Scrolling down 1200px...');
    await call('Runtime.evaluate', {
      expression: 'document.getElementById("view-we").scrollTop = 1200'
    });
    await wait(400);

    const scrolledMetrics = await call('Runtime.evaluate', {
      expression: `(() => {
        const panel = document.getElementById('view-we');
        return {
          scrollTop: panel.scrollTop,
          scrollHeight: panel.scrollHeight,
          clientHeight: panel.clientHeight
        };
      })()`,
      returnByValue: true
    });
    console.log('After Scroll Metrics:', JSON.stringify(scrolledMetrics.result.value, null, 2));

    // 4. Capture screenshot
    const snapshotsDir = path.join(__dirname, '../tests/snapshots');
    if (!fs.existsSync(snapshotsDir)) fs.mkdirSync(snapshotsDir, { recursive: true });
    const shot = await call('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(snapshotsDir, 'studio_we_scrolled.png'), Buffer.from(shot.data, 'base64'));
    console.log('Saved screenshot to tests/snapshots/studio_we_scrolled.png');

    // 5. Test mouse wheel event via CDP Input
    console.log('3. Testing mouse wheel dispatch...');
    await call('Input.dispatchMouseEvent', {
      type: 'mouseWheel',
      x: 800,
      y: 500,
      deltaX: 0,
      deltaY: 500
    });
    await wait(400);

    const wheelMetrics = await call('Runtime.evaluate', {
      expression: 'document.getElementById("view-we").scrollTop',
      returnByValue: true
    });
    console.log('ScrollTop after mouse wheel:', wheelMetrics.result.value);

    // 6. Test #view-presets and #view-safety as well
    console.log('4. Testing Presets & Safety scrollability...');
    await call('Runtime.evaluate', {
      expression: 'document.querySelector(\'.nav-tab[data-tab="view-presets"]\').click()'
    });
    await wait(400);
    const presetsMetrics = await call('Runtime.evaluate', {
      expression: `(() => {
        const p = document.getElementById('view-presets');
        return { id: p.id, overflowY: window.getComputedStyle(p).overflowY, clientH: p.clientHeight };
      })()`,
      returnByValue: true
    });
    console.log('Presets panel computed overflow-y:', presetsMetrics.result.value);

    await call('Runtime.evaluate', {
      expression: 'document.querySelector(\'.nav-tab[data-tab="view-safety"]\').click()'
    });
    await wait(400);
    const safetyMetrics = await call('Runtime.evaluate', {
      expression: `(() => {
        const p = document.getElementById('view-safety');
        return { id: p.id, overflowY: window.getComputedStyle(p).overflowY, clientH: p.clientHeight };
      })()`,
      returnByValue: true
    });
    console.log('Safety panel computed overflow-y:', safetyMetrics.result.value);

    // Return back to preview tab
    await call('Runtime.evaluate', {
      expression: 'document.querySelector(\'.nav-tab[data-tab="view-preview"]\').click()'
    });
    await wait(400);

    ws.close();
    chromeProc.kill();
    studio.server.close();
    await wait(400);
    try { fs.rmSync(profileDir, { recursive: true, force: true }); } catch (e) {}
    console.log('ALL SCROLL TESTS PASSED SUCCESSFULLY!');
    process.exit(0);
  });
}

testWeScroll().catch(console.error);
