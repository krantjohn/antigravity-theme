const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');

const chromeExe = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const studio = require('../../studio/server');

async function wait(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function testRendering() {
  console.log('--- Testing Studio Visual Rendering & Layout ---');
  
  // 1. Launch Chrome Headless with CDP on port 9222
  const profileDir = path.join(__dirname, '../../.tmp_chrome_test_profile');
  if (fs.existsSync(profileDir)) {
    fs.rmSync(profileDir, { recursive: true, force: true });
  }

  const chromeProc = spawn(chromeExe, [
    '--headless=new',
    '--remote-debugging-port=9222',
    '--window-size=1600,960',
    `--user-data-dir=${profileDir}`,
    '--no-first-run',
    '--no-default-browser-check',
    'http://127.0.0.1:8316'
  ], { stdio: 'ignore' });

  // Wait for CDP to be available
  let page = null;
  for (let i = 0; i < 30; i++) {
    await wait(300);
    try {
      const res = await fetch('http://127.0.0.1:9222/json');
      const list = await res.json();
      page = list.find(p => p.type === 'page' && p.url.includes('8316'));
      if (page) break;
    } catch (_) {}
  }

  if (!page) {
    console.error('Failed to connect to headless Chrome CDP');
    chromeProc.kill();
    process.exit(1);
  }

  console.log('Connected to headless Chrome:', page.webSocketDebuggerUrl);
  const ws = new WebSocket(page.webSocketDebuggerUrl);

  function call(method, params = {}) {
    return new Promise((resolve) => {
      const id = Math.floor(Math.random() * 1000000);
      const handler = (evt) => {
        const msg = JSON.parse(evt.data);
        if (msg.id === id) {
          ws.removeEventListener('message', handler);
          resolve(msg.result);
        }
      };
      ws.addEventListener('message', handler);
      ws.send(JSON.stringify({ id, method, params }));
    });
  }

  ws.addEventListener('open', async () => {
    // Wait for page to initialize
    await wait(1500);

    const testViewports = [
      { name: '1707x1019 (Current User Screen)', w: 1707, h: 1019 },
      { name: '1536x864 (1080p @ 125%)', w: 1536, h: 864 },
      { name: '1280x720 (1080p @ 150%)', w: 1280, h: 720 },
      { name: '1920x1080 (1080p @ 100%)', w: 1920, h: 1080 }
    ];

    const snapshotsDir = path.join(__dirname, '../tests/snapshots');
    if (!fs.existsSync(snapshotsDir)) fs.mkdirSync(snapshotsDir, { recursive: true });

    for (const vp of testViewports) {
      console.log(`\n================ Testing Viewport: ${vp.name} ================`);
      await call('Emulation.setDeviceMetricsOverride', {
        width: vp.w,
        height: vp.h,
        deviceScaleFactor: 1,
        mobile: false
      });
      await wait(500);

      const metrics = await call('Runtime.evaluate', {
        expression: `(() => {
          const scaler = document.getElementById('mockup-scaler');
          const viewport = document.getElementById('mockup-viewport');
          const windowEl = document.getElementById('ag-mockup');
          const inspector = document.querySelector('.inspector-panel');
          const toolbar = document.querySelector('.preview-toolbar');
          const header = document.querySelector('.app-header');
          const workspace = document.querySelector('.workspace-container');

          const sRect = scaler ? scaler.getBoundingClientRect() : {};
          const vRect = viewport ? viewport.getBoundingClientRect() : {};
          const wRect = windowEl ? windowEl.getBoundingClientRect() : {};
          const iRect = inspector ? inspector.getBoundingClientRect() : {};
          const tRect = toolbar ? toolbar.getBoundingClientRect() : {};

          return {
            windowInner: { w: window.innerWidth, h: window.innerHeight },
            headerH: header ? header.offsetHeight : 0,
            toolbarH: toolbar ? toolbar.offsetHeight : 0,
            workspaceH: workspace ? workspace.offsetHeight : 0,
            inspectorW: iRect.width,
            viewportRect: { w: vRect.width, h: vRect.height, top: vRect.top, left: vRect.left, bottom: vRect.bottom, right: vRect.right },
            scalerTransform: scaler ? scaler.style.transform : '',
            mockupRect: { w: Math.round(wRect.width), h: Math.round(wRect.height), top: Math.round(wRect.top), bottom: Math.round(wRect.bottom), left: Math.round(wRect.left), right: Math.round(wRect.right) },
            isHorizontallyClipped: (wRect.left < vRect.left - 1) || (wRect.right > vRect.right + 1),
            isVerticallyClipped: (wRect.top < vRect.top - 1) || (wRect.bottom > vRect.bottom + 1),
            bodyScrollH: document.body.scrollHeight,
            bodyClientH: document.body.clientHeight
          };
        })()`,
        returnByValue: true
      });

      console.log('Metrics:', JSON.stringify(metrics.result.value, null, 2));

      // Take screenshot of this viewport
      const shot = await call('Page.captureScreenshot', { format: 'png' });
      const filename = path.join(snapshotsDir, `studio_vp_${vp.w}x${vp.h}.png`);
      fs.writeFileSync(filename, Buffer.from(shot.data, 'base64'));
      console.log(`Saved screenshot to ${filename}`);
    }

    // Test inspector collapse
    console.log('\n================ Testing Inspector Collapse & Wide View ================');
    await call('Runtime.evaluate', { expression: `document.getElementById('btn-toggle-inspector').click()` });
    await wait(400);
    const collapseMetrics = await call('Runtime.evaluate', {
      expression: `(() => {
        const inspector = document.querySelector('.inspector-panel');
        const viewport = document.getElementById('mockup-viewport');
        const scaler = document.getElementById('mockup-scaler');
        return {
          inspectorW: inspector.offsetWidth,
          viewportW: viewport.offsetWidth,
          scalerTransform: scaler.style.transform
        };
      })()`,
      returnByValue: true
    });
    console.log('Collapsed Metrics:', JSON.stringify(collapseMetrics.result.value, null, 2));
    const shotCollapsed = await call('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(snapshotsDir, 'studio_collapsed_inspector.png'), Buffer.from(shotCollapsed.data, 'base64'));
    console.log('Saved screenshot to tests/snapshots/studio_collapsed_inspector.png');

    // Test expanding inspector back
    await call('Runtime.evaluate', { expression: `document.getElementById('btn-expand-inspector').click()` });
    await wait(400);

    // Test Aux-pane toggle
    console.log('\n================ Testing Aux-Pane Toggle ================');
    await call('Runtime.evaluate', { expression: `document.getElementById('btn-toggle-aux-pane').click()` });
    await wait(400);
    const auxClosedMetrics = await call('Runtime.evaluate', {
      expression: `(() => {
        const agMockup = document.getElementById('ag-mockup');
        const mockRightPane = document.getElementById('mock-right-pane');
        const isClosed = agMockup.classList.contains('aux-closed');
        const paneDisplay = window.getComputedStyle(mockRightPane).display;
        return { isClosed, paneDisplay };
      })()`,
      returnByValue: true
    });
    console.log('Aux Pane Closed Metrics:', JSON.stringify(auxClosedMetrics.result.value, null, 2));
    const shotAuxClosed = await call('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(snapshotsDir, 'studio_aux_closed.png'), Buffer.from(shotAuxClosed.data, 'base64'));
    console.log('Saved screenshot to tests/snapshots/studio_aux_closed.png');

    ws.close();
    chromeProc.kill();
    studio.server.close();
    await wait(400);
    try { fs.rmSync(profileDir, { recursive: true, force: true }); } catch (e) {}
    process.exit(0);
  });
}

testRendering().catch(err => {
  console.error(err);
  process.exit(1);
});
