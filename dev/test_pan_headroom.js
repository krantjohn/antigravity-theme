const http = require('http');
const fs = require('fs');

async function testPan() {
  const targets = await new Promise((resolve) => {
    http.get('http://127.0.0.1:8314/json', (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(JSON.parse(data)));
    });
  });
  const pageTarget = targets.find(t => t.type === 'page' && !t.url.startsWith('devtools://'));
  const wsUrl = pageTarget.webSocketDebuggerUrl;
  const ws = new globalThis.WebSocket(wsUrl);

  const evalCode = (code) => new Promise((res) => {
    const id = Math.floor(Math.random() * 100000);
    const handler = (evt) => {
      const msg = JSON.parse(evt.data);
      if (msg.id === id) {
        ws.removeEventListener('message', handler);
        res(msg.result?.result?.value);
      }
    };
    ws.addEventListener('message', handler);
    ws.send(JSON.stringify({ id, method: 'Runtime.evaluate', params: { expression: code, returnByValue: true } }));
  });

  const screenshot = () => new Promise((res) => {
    const id = Math.floor(Math.random() * 100000);
    const handler = (evt) => {
      const msg = JSON.parse(evt.data);
      if (msg.id === id) {
        ws.removeEventListener('message', handler);
        res(msg.result?.data);
      }
    };
    ws.addEventListener('message', handler);
    ws.send(JSON.stringify({ id, method: 'Page.captureScreenshot', params: { format: 'png' } }));
  });

  ws.onopen = async () => {
    console.log('Testing Pan Headroom (scale: 1.15)...');
    // Apply pan CSS
    const xPct = 20; // Try 20%
    const yPct = 50; // 50%
    const scale = 1.20;
    const excessW = (scale - 1) * 100; // 20vw
    const excessH = (scale - 1) * 100; // 20vh
    const shiftX = -excessW * (xPct / 100);
    const shiftY = -excessH * (yPct / 100);

    await evalCode(`(() => {
      const v = document.getElementById('antigravity-video-left');
      if (v) {
        v.style.setProperty('width', '${scale * 100}vw', 'important');
        v.style.setProperty('height', '${scale * 100}vh', 'important');
        v.style.setProperty('top', '0', 'important');
        v.style.setProperty('left', '0', 'important');
        v.style.setProperty('transform', 'translate3d(${shiftX}vw, ${shiftY}vh, 0)', 'important');
      }
    })()`);

    await new Promise(r => setTimeout(r, 400));
    const ss1 = await screenshot();
    fs.writeFileSync('C:\\Users\\Administrator\\.gemini\\antigravity\\brain\\f40afff2-0f5d-40e2-aff3-1e977ec8b018\\test_pan_20_50.png', Buffer.from(ss1, 'base64'));

    // Try xPct = 80
    const shiftX80 = -excessW * (80 / 100);
    await evalCode(`(() => {
      const v = document.getElementById('antigravity-video-left');
      if (v) {
        v.style.setProperty('transform', 'translate3d(${shiftX80}vw, ${shiftY}vh, 0)', 'important');
      }
    })()`);

    await new Promise(r => setTimeout(r, 400));
    const ss2 = await screenshot();
    fs.writeFileSync('C:\\Users\\Administrator\\.gemini\\antigravity\\brain\\f40afff2-0f5d-40e2-aff3-1e977ec8b018\\test_pan_80_50.png', Buffer.from(ss2, 'base64'));

    console.log('✓ Screenshots saved for 20% and 80% pan!');
    ws.close();
    process.exit(0);
  };
}
testPan().catch(e => { console.error(e); process.exit(1); });
