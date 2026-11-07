const http = require('http');
const fs = require('fs');

async function testPositionDiff() {
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
    console.log('1. Setting objectPosition to 0% 50% (left-most)...');
    await evalCode(`(() => {
      const v = document.getElementById('antigravity-video-left');
      if (v) v.style.setProperty('object-position', '0% 50%', 'important');
    })()`);
    await new Promise(r => setTimeout(r, 400));
    const ssLeft = await screenshot();
    fs.writeFileSync('C:\\Users\\Administrator\\.gemini\\antigravity\\brain\\f40afff2-0f5d-40e2-aff3-1e977ec8b018\\test_pos_0_50.png', Buffer.from(ssLeft, 'base64'));

    console.log('2. Setting objectPosition to 100% 50% (right-most)...');
    await evalCode(`(() => {
      const v = document.getElementById('antigravity-video-left');
      if (v) v.style.setProperty('object-position', '100% 50%', 'important');
    })()`);
    await new Promise(r => setTimeout(r, 400));
    const ssRight = await screenshot();
    fs.writeFileSync('C:\\Users\\Administrator\\.gemini\\antigravity\\brain\\f40afff2-0f5d-40e2-aff3-1e977ec8b018\\test_pos_100_50.png', Buffer.from(ssRight, 'base64'));

    console.log('3. Setting objectPosition to 50% 0% (top-most)...');
    await evalCode(`(() => {
      const v = document.getElementById('antigravity-video-left');
      if (v) v.style.setProperty('object-position', '50% 0%', 'important');
    })()`);
    await new Promise(r => setTimeout(r, 400));
    const ssTop = await screenshot();
    fs.writeFileSync('C:\\Users\\Administrator\\.gemini\\antigravity\\brain\\f40afff2-0f5d-40e2-aff3-1e977ec8b018\\test_pos_50_0.png', Buffer.from(ssTop, 'base64'));

    console.log('4. Setting objectPosition to 50% 100% (bottom-most)...');
    await evalCode(`(() => {
      const v = document.getElementById('antigravity-video-left');
      if (v) v.style.setProperty('object-position', '50% 100%', 'important');
    })()`);
    await new Promise(r => setTimeout(r, 400));
    const ssBottom = await screenshot();
    fs.writeFileSync('C:\\Users\\Administrator\\.gemini\\antigravity\\brain\\f40afff2-0f5d-40e2-aff3-1e977ec8b018\\test_pos_50_100.png', Buffer.from(ssBottom, 'base64'));

    // Restore to 53% 49%
    await evalCode(`(() => {
      const v = document.getElementById('antigravity-video-left');
      if (v) v.style.setProperty('object-position', '53% 49%', 'important');
    })()`);

    console.log('Done testing!');
    ws.close();
    process.exit(0);
  };
}
testPositionDiff().catch(e => { console.error(e); process.exit(1); });
