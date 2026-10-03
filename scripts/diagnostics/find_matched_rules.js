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
          const sel = '[id="antigravity.agentSidePanelInputBox"] > div.bg-card';
          const el = document.querySelector(sel);
          if (!el) return { error: 'Element not found' };

          const results = [];
          for (let i = 0; i < document.styleSheets.length; i++) {
            const sheet = document.styleSheets[i];
            let rules;
            try {
              rules = sheet.cssRules || sheet.rules;
            } catch(e) {
              continue;
            }
            if (!rules) continue;
            for (let j = 0; j < rules.length; j++) {
              const r = rules[j];
              if (r.selectorText && (r.selectorText.includes('agentSidePanelInputBox') || r.selectorText.includes('bg-card'))) {
                if (r.style && r.style.backgroundImage && r.style.backgroundImage !== 'none') {
                  results.push({
                    sheetIndex: i,
                    sheetHref: sheet.href,
                    sheetOwner: sheet.ownerNode ? (sheet.ownerNode.id || sheet.ownerNode.tagName) : null,
                    selector: r.selectorText,
                    bgImage: r.style.backgroundImage.substring(0, 150)
                  });
                }
              }
            }
          }
          return {
            elClass: el.className,
            inlineBg: el.style.backgroundImage,
            matchedRules: results
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
        console.log('Matched rules:', JSON.stringify(resp.result.result.value, null, 2));
        ws.close();
      }
    });
  });
});
