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
      const specs = {};

      // 1. Sidebar Top Bar (Delta logo + sidebar toggle + navigation arrows)
      const topRow = document.querySelector('.absolute.left-0.top-0');
      if (topRow) {
        specs.sidebarTopRow = {
          html: topRow.innerHTML,
          buttons: Array.from(topRow.querySelectorAll('button, svg')).map(el => ({
            tag: el.tagName,
            aria: el.getAttribute('aria-label'),
            title: el.getAttribute('title'),
            svg: el.outerHTML
          }))
        };
      }

      // 2. New Conversation Button
      const newChatBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('New Conversation'));
      if (newChatBtn) {
        const cs = window.getComputedStyle(newChatBtn);
        specs.newChatBtn = {
          html: newChatBtn.outerHTML,
          padding: cs.padding,
          fontSize: cs.fontSize,
          height: cs.height,
          borderRadius: cs.borderRadius,
          background: cs.backgroundColor
        };
      }

      // 3. Sidebar Navigation Links (Conversation History, Scheduled Tasks)
      const navItems = Array.from(document.querySelectorAll('button, a, div[role="button"]'))
        .filter(el => el.innerText.includes('Conversation History') || el.innerText.includes('Scheduled Tasks'))
        .map(el => ({ text: el.innerText.trim(), html: el.outerHTML }));
      specs.navItems = navItems;

      // 4. Sidebar Conversation List Item
      const activeConv = Array.from(document.querySelectorAll('div, button, a'))
        .find(el => el.innerText && el.innerText.includes('更改壁纸') && el.innerText.includes('27m'));
      if (activeConv) {
        specs.activeConv = {
          html: activeConv.outerHTML,
          rect: activeConv.getBoundingClientRect()
        };
      }

      // 5. Sidebar Settings Button
      const settingsBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Settings'));
      if (settingsBtn) {
        specs.settingsBtn = {
          html: settingsBtn.outerHTML
        };
      }

      // 6. Chat Header Actions
      const chatHeader = document.querySelector('[data-testid="chat-header"]') || Array.from(document.querySelectorAll('div')).find(d => d.innerText && d.innerText.includes('Install IDE') && d.querySelector('button'));
      if (chatHeader) {
        specs.chatHeader = {
          buttons: Array.from(chatHeader.querySelectorAll('button')).map(b => ({
            aria: b.getAttribute('aria-label'),
            text: b.innerText.trim(),
            html: b.outerHTML
          }))
        };
      }

      // 7. Input Box
      const inputBox = document.getElementById('antigravity.agentSidePanelInputBox');
      if (inputBox) {
        specs.inputBox = {
          modelSelector: inputBox.querySelector('[data-testid*="model"], [class*="model"], button:has(svg)')?.outerHTML,
          buttons: Array.from(inputBox.querySelectorAll('button')).map(b => ({
            aria: b.getAttribute('aria-label'),
            title: b.getAttribute('title'),
            html: b.outerHTML
          }))
        };
      }

      // 8. Auxiliary Pane Top / Subagents panel
      const auxPane = document.querySelector('[aria-label="Auxiliary Pane"]');
      if (auxPane) {
        specs.auxPane = {
          html: auxPane.outerHTML.slice(0, 1000)
        };
      }

      return specs;
    })()`;

    const res = await call('Runtime.evaluate', {
      expression: expr,
      returnByValue: true
    });
    
    console.log(JSON.stringify(res.result.value, null, 2));
    ws.close();
  });
}

extract().catch(console.error);
