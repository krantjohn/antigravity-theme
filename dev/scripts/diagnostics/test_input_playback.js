const http = require('http');

http.get('http://127.0.0.1:8314/json', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    const list = JSON.parse(data);
    const page = list.find(p => p.type === 'page');
    const ws = new WebSocket(page.webSocketDebuggerUrl);
    ws.addEventListener('open', () => {
      const expr = `
        new Promise((resolve) => {
          const v = document.createElement('video');
          v.src = 'http://127.0.0.1:8315/input_wallpaper.mp4';
          v.onloadeddata = () => resolve({ ok: true, width: v.videoWidth, height: v.videoHeight });
          v.onerror = () => resolve({ ok: false, error: v.error ? v.error.message || v.error.code : 'unknown' });
          setTimeout(() => resolve({ ok: false, timeout: true }), 3000);
        })
      `;
      ws.send(JSON.stringify({
        id: 1,
        method: 'Runtime.evaluate',
        params: { expression: expr, awaitPromise: true, returnByValue: true }
      }));
    });
    ws.addEventListener('message', (event) => {
      const resp = JSON.parse(event.data);
      if (resp.id === 1) {
        console.log('Playback result:', resp.result.result.value);
        ws.close();
      }
    });
  });
});
