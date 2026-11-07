const http = require('http');
const eng = require('../../core/localization_engine');

function evalCdp(expression) {
  return new Promise((resolve, reject) => {
    http.get('http://127.0.0.1:8314/json', (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try {
          const list = JSON.parse(data);
          const page = list.find(p => p.type === 'page' && !p.url.startsWith('data:')) || list.find(p => p.type === 'page');
          if (!page) return reject(new Error('No page'));
          const ws = new WebSocket(page.webSocketDebuggerUrl);
          ws.addEventListener('open', () => {
            ws.send(JSON.stringify({
              id: 1,
              method: 'Runtime.evaluate',
              params: {
                expression,
                awaitPromise: true,
                returnByValue: true
              }
            }));
          });
          ws.addEventListener('message', (evt) => {
            try {
              const resp = JSON.parse(evt.data);
              ws.close();
              resolve(resp.result && resp.result.result ? resp.result.result.value : resp);
            } catch (e) {
              resolve(null);
            }
          });
          ws.addEventListener('error', reject);
        } catch (e) { reject(e); }
      });
    }).on('error', reject);
  });
}

(async () => {
  console.log('Generating Chinese translation script...');
  const js = eng.generateJs();
  console.log(`Script size: ${(js.length / 1024).toFixed(1)} KB. Injecting via CDP...`);
  const res = await evalCdp(js + '\n; "LIVE_TRANSLATION_INJECTED_SUCCESSFULLY";');
  console.log('Result:', res);
})();
