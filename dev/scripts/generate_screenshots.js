const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');

const chromeExe = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const studio = require('../../studio/server');

async function wait(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function captureCDPAntigravity() {
  console.log('[1/4] Capturing Antigravity Live Client via CDP 8314...');
  return new Promise((resolve) => {
    http.get('http://127.0.0.1:8314/json', (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const list = JSON.parse(data);
          const page = list.find(p => p.type === 'page');
          if (!page) {
            console.warn('No Antigravity page found');
            return resolve(false);
          }
          const ws = new WebSocket(page.webSocketDebuggerUrl);
          ws.addEventListener('open', () => {
            ws.send(JSON.stringify({
              id: 1,
              method: 'Page.captureScreenshot',
              params: { format: 'png', quality: 100 }
            }));
          });
          ws.addEventListener('message', (evt) => {
            const resp = JSON.parse(evt.data);
            if (resp.id === 1 && resp.result && resp.result.data) {
              const out = path.join(__dirname, '../assets/previews/antigravity_live_workbench.png');
              fs.writeFileSync(out, Buffer.from(resp.result.data, 'base64'));
              console.log('✓ Saved:', out);
              ws.close();
              resolve(true);
            }
          });
        } catch (e) {
          console.error(e);
          resolve(false);
        }
      });
    }).on('error', (e) => {
      console.warn('Antigravity CDP not responding:', e.message);
      resolve(false);
    });
  });
}

async function captureStudioViews() {
  console.log('[2/4] Launching Headless Chrome to capture Theme Studio views...');
  const profileDir = path.join(__dirname, '../../.tmp_chrome_readme_profile');
  if (fs.existsSync(profileDir)) {
    fs.rmSync(profileDir, { recursive: true, force: true });
  }

  const chromeProc = spawn(chromeExe, [
    '--headless=new',
    '--remote-debugging-port=9333',
    '--window-size=1560,960',
    '--force-device-scale-factor=1',
    `--user-data-dir=${profileDir}`,
    '--no-first-run',
    '--no-default-browser-check',
    'http://127.0.0.1:8316'
  ], { stdio: 'ignore' });

  let page = null;
  for (let i = 0; i < 30; i++) {
    await wait(300);
    try {
      const res = await fetch('http://127.0.0.1:9333/json');
      const list = await res.json();
      page = list.find(p => p.type === 'page' && p.url.includes('8316'));
      if (page) break;
    } catch (_) {}
  }

  if (!page) {
    console.error('Failed to connect to Chrome CDP');
    chromeProc.kill();
    return;
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

  await new Promise((resolve) => ws.addEventListener('open', resolve));

  // Let studio initialize, fetch status, load slots
  await wait(2500);

  // 1. Dark Mode Overview
  console.log('Capturing Theme Studio - Dark Mode...');
  const shotDark = await call('Page.captureScreenshot', { format: 'png' });
  const darkPath = path.join(__dirname, '../assets/previews/theme_studio_dark.png');
  fs.writeFileSync(darkPath, Buffer.from(shotDark.data, 'base64'));
  console.log('✓ Saved:', darkPath);

  // 2. Light Mode Overview
  console.log('Switching to Light Mode...');
  await call('Runtime.evaluate', {
    expression: 'document.getElementById("btn-theme-toggle").click()'
  });
  await wait(1000);
  const shotLight = await call('Page.captureScreenshot', { format: 'png' });
  const lightPath = path.join(__dirname, '../assets/previews/theme_studio_light.png');
  fs.writeFileSync(lightPath, Buffer.from(shotLight.data, 'base64'));
  console.log('✓ Saved:', lightPath);

  // Switch back to Dark Mode
  await call('Runtime.evaluate', {
    expression: 'document.getElementById("btn-theme-toggle").click()'
  });
  await wait(400);

  // 3. Steam Wallpaper Engine Grid
  console.log('Opening Steam Wallpaper Engine tab...');
  await call('Runtime.evaluate', {
    expression: 'document.getElementById("nav-tab-we").click()'
  });
  await wait(1500);
  const shotWe = await call('Page.captureScreenshot', { format: 'png' });
  const wePath = path.join(__dirname, '../assets/previews/theme_studio_workshop.png');
  fs.writeFileSync(wePath, Buffer.from(shotWe.data, 'base64'));
  console.log('✓ Saved:', wePath);

  // 4. Presets Vault tab
  console.log('Opening Presets Vault tab...');
  await call('Runtime.evaluate', {
    expression: 'document.getElementById("nav-tab-presets").click()'
  });
  await wait(1000);
  const shotPreset = await call('Page.captureScreenshot', { format: 'png' });
  const presetPath = path.join(__dirname, '../assets/previews/theme_studio_presets.png');
  fs.writeFileSync(presetPath, Buffer.from(shotPreset.data, 'base64'));
  console.log('✓ Saved:', presetPath);

  ws.close();
  chromeProc.kill();
  console.log('[2/4] Headless Chrome captures finished successfully.');
}

async function run() {
  await captureCDPAntigravity();
  await captureStudioViews();
  process.exit(0);
}

run();
