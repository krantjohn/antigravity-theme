const http = require('http');

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
            ws.send(JSON.stringify({ id: 1, method: 'Runtime.evaluate', params: { expression, awaitPromise: true, returnByValue: true } }));
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
  const result = await evalCdp(`(() => {
    const texts = Array.from(document.querySelectorAll('button, span, a, div'))
      .map(el => el.textContent.trim())
      .filter(t => t.length > 0 && t.length < 35 && !t.includes('\\n'));
    
    const unique = Array.from(new Set(texts));
    const chineseSamples = unique.filter(t => /[\\u4e00-\\u9fa5]/.test(t));
    const englishSamples = unique.filter(t => /^[a-zA-Z\\s]+$/.test(t));
    
    return {
      totalFound: unique.length,
      chineseCount: chineseSamples.length,
      chineseSamples: chineseSamples.slice(0, 25),
      englishSamples: englishSamples.slice(0, 10),
      hasTranslator: typeof window.__agTranslateContextMenuItems === 'function' || !!document.querySelector('[data-ag-translated]') || !!window.__agObserverActive
    };
  })()`);
  
  console.log(JSON.stringify(result, null, 2));
})();
