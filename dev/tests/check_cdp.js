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
            ws.send(JSON.stringify({ id: 1, method: 'Runtime.evaluate', params: { expression, awaitPromise: true } }));
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
    const bottomSelectors = [
      '[id="antigravity.agentSidePanelInputBox"] > div.bg-card:not([role="listbox"]):not([data-mention-menu]):not([class*="bottom-full"])',
      '[id="antigravity.agentSidePanelInputBox"] > div[class*="bg-card"]:not([role="listbox"]):not([data-mention-menu]):not([class*="bottom-full"])',
      'div.rounded-2xl.bg-card-border > div.bg-card:not([role="listbox"]):not([data-mention-menu]):not([class*="bottom-full"])',
      'div.rounded-2xl.bg-card-border > div[class*="bg-card"]:not([role="listbox"]):not([data-mention-menu]):not([class*="bottom-full"])',
      'div[data-testid="running-items-panel"] + div > div.bg-card'
    ];
    const foundElements = bottomSelectors.map(sel => ({ sel, found: !!document.querySelector(sel) }));
    const vids = Array.from(document.querySelectorAll('video')).map(v => ({
      id: v.id,
      className: v.className,
      dataSlot: v.getAttribute('data-slot'),
      src: v.src,
      paused: v.paused,
      parent: v.parentElement ? v.parentElement.tagName + '.' + v.parentElement.className : null
    }));
    return JSON.stringify({
      foundElements,
      vids,
      hasApplyVideos: typeof window.__antigravityApplyVideos === 'function'
    });
  })()`);
  console.log(result);
})();
