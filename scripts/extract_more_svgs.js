const http = require('http');

async function extract() {
  const r = await fetch('http://127.0.0.1:8314/json');
  const pages = await r.json();
  const page = pages.find(p => p.type === 'page');
  const ws = new WebSocket(page.webSocketDebuggerUrl);

  function call(method, params) {
    return new Promise((resolve) => {
      const id = Math.floor(Math.random() * 100000);
      const handler = (evt) => {
        const msg = JSON.parse(evt.data);
        if (msg.id === id) {
          ws.removeEventListener('message', handler);
          resolve(msg.result);
        }
      };
      ws.addEventListener('message', handler);
      ws.send(JSON.stringify({ id, method, params }));
    });
  }

  ws.addEventListener('open', async () => {
    const expr = `(() => {
      const res = {};
      
      // Top left sidebar header (delta logo, collapse button, back/forward)
      const topLeft = document.querySelector('.absolute.left-0.top-0');
      if (topLeft) {
        res.topLeftHtml = topLeft.innerHTML;
      }

      // Title menu bar (Antigravity, File, View, Window)
      const menuBar = document.querySelector('[data-testid="title-menu-bar"]');
      if (menuBar) {
        res.menuBarHtml = menuBar.outerHTML;
      }

      // Sidebar scroll area
      const sidebarScroll = document.querySelector('aside .overflow-y-auto') || document.querySelector('.relative.flex.w-full.h-full > .flex:first-child');
      if (sidebarScroll) {
        res.sidebarBrief = Array.from(sidebarScroll.querySelectorAll('button, a')).map(b => ({
          text: b.innerText.trim(),
          svg: b.querySelector('svg')?.outerHTML
        }));
      }

      // Chat header
      const chatHdr = document.querySelector('header, [data-testid="chat-header"]') || Array.from(document.querySelectorAll('div')).find(d => d.innerText && d.innerText.includes('Install IDE'));
      if (chatHdr) {
        res.chatHdrHtml = chatHdr.outerHTML;
      }

      return res;
    })()`;

    const result = await call('Runtime.evaluate', {
      expression: expr,
      returnByValue: true
    });
    
    const fs = require('fs');
    fs.writeFileSync('tests/antigravity_svg_dump.json', JSON.stringify(result.result.value, null, 2), 'utf8');
    console.log('Saved SVG dump to tests/antigravity_svg_dump.json');
    ws.close();
  });
}

extract().catch(console.error);
