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
        (function() {
          const v = document.querySelector('.antigravity-slot-video[data-slot="bottom"]');
          if (!v) return { found: false };
          return {
            found: true,
            src: v.src,
            currentSrc: v.currentSrc,
            error: v.error ? { code: v.error.code, message: v.error.message } : null,
            networkState: v.networkState,
            readyState: v.readyState,
            paused: v.paused,
            ended: v.ended,
            offsetWidth: v.offsetWidth,
            offsetHeight: v.offsetHeight,
            parentOffsetWidth: v.parentElement ? v.parentElement.offsetWidth : 0,
            parentOffsetHeight: v.parentElement ? v.parentElement.offsetHeight : 0,
            parentClass: v.parentElement ? v.parentElement.className : ''
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
        console.log('Video detail:', JSON.stringify(resp.result.result.value, null, 2));
        ws.close();
      }
    });
  });
});
