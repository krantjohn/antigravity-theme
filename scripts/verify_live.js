const http = require('http');
const fs = require('fs');

http.get('http://127.0.0.1:8314/json', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    const list = JSON.parse(data);
    const page = list.find(p => p.type === 'page');
    if (!page) {
      console.log('No page target found');
      return;
    }
    const ws = new WebSocket(page.webSocketDebuggerUrl);
    ws.addEventListener('open', () => {
      ws.send(JSON.stringify({
        id: 1,
        method: 'Page.captureScreenshot',
        params: { format: 'png' }
      }));
    });
    ws.addEventListener('message', (event) => {
      const resp = JSON.parse(event.data);
      if (resp.id === 1 && resp.result && resp.result.data) {
        const outPath = 'C:\\\\Users\\\\lenvo\\\\.gemini\\\\antigravity\\\\brain\\\\2ea5575d-04fc-4078-88aa-ed41ef4479c6\\\\perf_optimized_live_v3.png';
        fs.writeFileSync(outPath, Buffer.from(resp.result.data, 'base64'));
        console.log('Screenshot saved to:', outPath);
        ws.close();
      }
    });
  });
});
