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
        (async function() {
          const vids = Array.from(document.querySelectorAll('video'));
          const results = [];
          for (const v of vids) {
            try {
              await v.play();
              results.push({ id: v.id, slot: v.getAttribute('data-slot'), success: true, currentTime: v.currentTime, readyState: v.readyState });
            } catch(e) {
              results.push({ id: v.id, slot: v.getAttribute('data-slot'), success: false, err: e.message });
            }
          }
          return results;
        })()
      `;
      ws.send(JSON.stringify({
        id: 1,
        method: 'Runtime.evaluate',
        params: { expression: expr, awaitPromise: true, returnByValue: true }
      }));
    });
    ws.addEventListener('message', (event) => {
      const resp = JSON.parse(event.data);
      console.log('Play results:', JSON.stringify(resp.result.result.value, null, 2));
      ws.close();
    });
  });
});
