const http = require('http');
// Use Node.js built-in global WebSocket

http.get('http://127.0.0.1:8314/json', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    const targets = JSON.parse(data);
    const page = targets.find(t => t.type === 'page' || t.url.includes('index.html')) || targets[0];
    if (!page) {
      console.log('No page target found');
      return;
    }
    console.log('Connecting to target:', page.title, page.webSocketDebuggerUrl);
    const ws = new WebSocket(page.webSocketDebuggerUrl);
    ws.addEventListener('open', () => {
      const expr = `
        (function() {
          const v = document.createElement('video');
          return {
            mp4vSupport: v.canPlayType('video/mp4; codecs="mp4v.20.8"'),
            avc1Support: v.canPlayType('video/mp4; codecs="avc1.42E01E"'),
            h264Support: v.canPlayType('video/mp4; codecs="avc1.640028"')
          };
        })()
      `;
      ws.send(JSON.stringify({
        id: 1,
        method: 'Runtime.evaluate',
        params: { expression: expr, returnByValue: true }
      }));
    });
    ws.addEventListener('message', (event) => {
      const resp = JSON.parse(event.data);
      if (resp.id === 1) {
        console.log('Codec support in Antigravity:', resp.result.result.value);
        ws.close();
      }
    });
  });
});
