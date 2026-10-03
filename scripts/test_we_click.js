const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const chromeExe = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const studio = require('../studio/server');

async function wait(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function testWeClick() {
  console.log('Testing WE Click Preview...');
  const profileDir = path.join(__dirname, '../.tmp_chrome_test_profile');
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
    console.error('Failed to connect to Chrome CDP');
    chromeProc.kill();
    process.exit(1);
  }

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
    await wait(1500);

    // Capture console errors
    await call('Runtime.enable');
    ws.addEventListener('message', (evt) => {
      const msg = JSON.parse(evt.data);
      if (msg.method === 'Runtime.consoleAPICalled' || msg.method === 'Runtime.exceptionThrown') {
        console.log('[Browser Console]', JSON.stringify(msg.params));
      }
    });

    // 1. Click WE tab
    console.log('1. Switching to Steam Workshop tab...');
    await call('Runtime.evaluate', {
      expression: `document.querySelector('.nav-tab[data-tab="view-we"]').click()`
    });
    await wait(1500);

    // 2. Check if items rendered
    const cardsCount = await call('Runtime.evaluate', {
      expression: `document.querySelectorAll('.we-card').length`,
      returnByValue: true
    });
    console.log('WE Cards rendered:', cardsCount.result.value);

    // 3. Click the first card's "预览到主底座" button
    console.log('2. Clicking first card "预览到主底座"...');
    const clickRes = await call('Runtime.evaluate', {
      expression: `(() => {
        const btn = document.querySelector('.btn-we-preview');
        if (!btn) return 'btn not found';
        btn.click();
        return 'clicked';
      })()`,
      returnByValue: true
    });
    console.log('Click result:', clickRes.result.value);
    await wait(1000);

    // 4. Check active tab and left video element
    const previewStatus = await call('Runtime.evaluate', {
      expression: `(() => {
        const activeTab = document.querySelector('.nav-tab.active')?.dataset.tab;
        const videoLeft = document.getElementById('mock-video-left');
        const imgLeft = document.getElementById('mock-img-left');
        return {
          activeTab,
          videoSrc: videoLeft ? videoLeft.src : null,
          videoVisible: videoLeft ? videoLeft.classList.contains('visible') : false,
          imgSrc: imgLeft ? imgLeft.src : null,
          imgVisible: imgLeft ? imgLeft.classList.contains('visible') : false,
          draftLeft: window.state?.draftConfig?.left
        };
      })()`,
      returnByValue: true
    });
    console.log('Preview Status after click:', JSON.stringify(previewStatus.result.value, null, 2));

    const shot = await call('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync('tests/test_we_preview_result.png', Buffer.from(shot.data, 'base64'));
    console.log('Saved screenshot to tests/test_we_preview_result.png');

    ws.close();
    chromeProc.kill();
    studio.server.close();
    process.exit(0);
  });
}

testWeClick().catch(console.error);
