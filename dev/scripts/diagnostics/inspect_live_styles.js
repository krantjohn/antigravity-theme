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
          const styles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]')).map(s => ({
            tag: s.tagName,
            id: s.id,
            href: s.href || '',
            textLen: (s.textContent || '').length,
            preview: (s.textContent || '').substring(0, 100)
          }));
          
          const sel = '[id="antigravity.agentSidePanelInputBox"] > div.bg-card';
          const el = document.querySelector(sel);
          let matchedRules = [];
          if (el) {
            // Check inline style
            const inlineBg = el.style.backgroundImage;
            // Check computed style
            const computedBg = window.getComputedStyle(el).backgroundImage;
            return {
              styles,
              inlineBg,
              computedBg: computedBg ? computedBg.substring(0, 200) : ''
            };
          }
          return { styles, elFound: false };
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
        console.log('Live styles inspection:', JSON.stringify(resp.result.result.value, null, 2));
        ws.close();
      }
    });
  });
});
