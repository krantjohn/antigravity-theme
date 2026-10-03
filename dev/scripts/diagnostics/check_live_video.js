const http = require('http');

http.get('http://127.0.0.1:8314/json', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    const list = JSON.parse(data);
    const page = list.find(p => p.type === 'page');
    if (!page) {
      console.log('No page found');
      return;
    }
    const ws = new WebSocket(page.webSocketDebuggerUrl);
    ws.addEventListener('open', () => {
      const expr = `
        (function() {
          const vids = Array.from(document.querySelectorAll('video')).map(v => ({
            id: v.id,
            slot: v.getAttribute('data-slot'),
            poster: v.poster ? v.poster.substring(0, 60) : '',
            isBase64Poster: !!(v.poster && v.poster.startsWith('data:')),
            src: v.src,
            currentTime: v.currentTime,
            readyState: v.readyState,
            paused: v.paused,
            bgImage: v.style.backgroundImage ? v.style.backgroundImage.substring(0, 60) : '',
            parent: v.parentElement ? (v.parentElement.tagName + '.' + (v.parentElement.className || '')) : null
          }));
          return { vids };
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
      console.log('Live videos:', JSON.stringify(resp.result.result.value, null, 2));
      ws.close();
    });
  });
});
