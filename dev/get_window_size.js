const http = require('http');

async function getWindowSize() {
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

  ws.onopen = () => {
    ws.send(JSON.stringify({
      id: 1,
      method: 'Runtime.evaluate',
      params: {
        expression: `(() => {
          const v = document.getElementById('antigravity-video-left');
          return {
            windowInnerWidth: window.innerWidth,
            windowInnerHeight: window.innerHeight,
            windowRatio: (window.innerWidth / window.innerHeight).toFixed(4),
            videoWidth: v ? v.videoWidth : null,
            videoHeight: v ? v.videoHeight : null,
            videoRatio: v ? (v.videoWidth / v.videoHeight).toFixed(4) : null,
            videoStyleObjectPosition: v ? v.style.objectPosition : null,
            videoComputedObjectPosition: v ? window.getComputedStyle(v).objectPosition : null
          };
        })()`,
        returnByValue: true
      }
    }));
  };

  ws.onmessage = (event) => {
    const resp = JSON.parse(event.data);
    if (resp.id === 1) {
      console.log('Video & Window stats:', JSON.stringify(resp.result?.result?.value, null, 2));
      ws.close();
      process.exit(0);
    }
  };
}
getWindowSize();
