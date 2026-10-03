const { spawn } = require('child_process');
const fs = require('fs');
const studio = require('../studio/server');

async function testPure() {
  const chromeProc = spawn('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', [
    '--headless=new',
    '--remote-debugging-port=9222',
    '--window-size=1600,960',
    'http://127.0.0.1:8316'
  ], { stdio: 'ignore' });

  await new Promise(r => setTimeout(r, 1500));
  const list = await fetch('http://127.0.0.1:9222/json').then(r => r.json());
  const page = list.find(p => p.type === 'page' && p.url.includes('8316'));
  const ws = new WebSocket(page.webSocketDebuggerUrl);

  function call(method, params = {}) {
    return new Promise(resolve => {
      const id = Math.floor(Math.random() * 100000);
      const h = evt => {
        const m = JSON.parse(evt.data);
        if (m.id === id) { ws.removeEventListener('message', h); resolve(m.result); }
      };
      ws.addEventListener('message', h);
      ws.send(JSON.stringify({ id, method, params }));
    });
  }

  ws.addEventListener('open', async () => {
    await new Promise(r => setTimeout(r, 1000));
    await call('Runtime.evaluate', { expression: 'document.getElementById("btn-toggle-pure-wallpaper").click()' });
    await new Promise(r => setTimeout(r, 400));
    const shot = await call('Page.captureScreenshot', { format: 'png' });
    const snapshotsDir = 'tests/snapshots';
    if (!fs.existsSync(snapshotsDir)) fs.mkdirSync(snapshotsDir, { recursive: true });
    fs.writeFileSync('tests/snapshots/studio_pure_wallpaper_mode.png', Buffer.from(shot.data, 'base64'));
    console.log('Saved tests/snapshots/studio_pure_wallpaper_mode.png');
    ws.close();
    chromeProc.kill();
    studio.server.close();
    process.exit(0);
  });
}
testPure().catch(console.error);
