const http = require('http');

async function inspect() {
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
      const result = {};

      // 1. Sidebar HTML & structure
      const sidebar = document.querySelector('.relative.flex.w-full.h-full > .flex:first-child');
      if (sidebar) {
        result.sidebarWidth = sidebar.getBoundingClientRect().width;
        result.sidebarHtml = sidebar.innerHTML;
      }

      // 2. Main content area (center chat + auxiliary pane)
      const mainArea = document.querySelector('.relative.flex.w-full.h-full > div:last-child');
      if (mainArea) {
        result.mainAreaChildren = Array.from(mainArea.children).map(c => ({
          tag: c.tagName,
          class: c.className,
          w: Math.round(c.getBoundingClientRect().width),
          h: Math.round(c.getBoundingClientRect().height)
        }));
      }

      // 3. Chat header
      const chatHeader = document.querySelector('[data-testid="chat-header"], header, .flex.items-center.justify-between');
      if (chatHeader) {
        result.chatHeaderHtml = chatHeader.outerHTML;
      }

      // 4. Input box container
      const inputBox = document.getElementById('antigravity.agentSidePanelInputBox');
      if (inputBox) {
        result.inputBoxHtml = inputBox.outerHTML;
      }

      return result;
    })()`;

    const res = await call('Runtime.evaluate', {
      expression: expr,
      returnByValue: true
    });
    
    // Save to a file so we can view it without console truncation
    const fs = require('fs');
    const path = require('path');
    const outDir = path.join(__dirname, '../tests/snapshots');
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
    const outPath = path.join(outDir, 'antigravity_dom_dump.json');
    fs.writeFileSync(outPath, JSON.stringify(res.result.value, null, 2), 'utf8');
    console.log('Saved DOM dump to tests/snapshots/antigravity_dom_dump.json (size:', fs.statSync(outPath).size, 'bytes)');
    ws.close();
  });
}

inspect().catch(console.error);
