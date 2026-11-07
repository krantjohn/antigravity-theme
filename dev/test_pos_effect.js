const http = require('http');

async function testPositionEffect() {
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
          if (!v) return 'No video';
          
          // Test with objectPosition 0% 50% vs 100% 50%
          const orig = v.style.objectPosition;
          v.style.objectPosition = '0% 50%';
          const r0 = v.getBoundingClientRect();
          
          v.style.objectPosition = '100% 50%';
          const r100 = v.getBoundingClientRect();
          
          v.style.objectPosition = orig;
          
          return {
            videoWidth: v.videoWidth,
            videoHeight: v.videoHeight,
            windowW: window.innerWidth,
            windowH: window.innerHeight,
            r0: { width: r0.width, height: r0.height },
            r100: { width: r100.width, height: r100.height }
          };
        })()`,
        returnByValue: true
      }
    }));
  };

  ws.onmessage = (event) => {
    const resp = JSON.parse(event.data);
    if (resp.id === 1) {
      console.log('Result:', resp.result?.result?.value);
      ws.close();
      process.exit(0);
    }
  };
}
testPositionEffect();
