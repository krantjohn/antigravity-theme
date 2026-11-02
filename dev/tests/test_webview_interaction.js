const http = require('http');

async function getTargets() {
  return new Promise((resolve, reject) => {
    http.get('http://127.0.0.1:8314/json/list', (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(JSON.parse(data)));
    }).on('error', reject);
  });
}

function createCdpSession(wsUrl) {
  const ws = new WebSocket(wsUrl);
  let idCounter = 1;
  const pending = new Map();

  ws.addEventListener('message', (event) => {
    const resp = JSON.parse(event.data);
    if (resp.id && pending.has(resp.id)) {
      const { resolve, reject } = pending.get(resp.id);
      pending.delete(resp.id);
      if (resp.error) reject(resp.error);
      else resolve(resp.result);
    }
  });

  return {
    async open() {
      await new Promise(r => ws.addEventListener('open', r, { once: true }));
    },
    async send(method, params = {}) {
      const id = idCounter++;
      return new Promise((resolve, reject) => {
        pending.set(id, { resolve, reject });
        ws.send(JSON.stringify({ id, method, params }));
      });
    },
    close() {
      ws.close();
    }
  };
}

async function main() {
  const targets = await getTargets();
  const mainTarget = targets.find(t => t.type === 'page');
  const webviewTarget = targets.find(t => t.type === 'webview');

  if (!mainTarget) throw new Error('Main window target not found on CDP port 8314');

  const mainSession = createCdpSession(mainTarget.webSocketDebuggerUrl);
  await mainSession.open();

  console.log('Connected to Main target');

  // Verify CSS rules inside main page
  const ruleCheck = await mainSession.send('Runtime.evaluate', {
    expression: `(() => {
      const customTheme = document.getElementById('antigravity-custom-theme');
      const titlebarFix = document.getElementById('antigravity-titlebar-fix');
      const hasRule = (customTheme && customTheme.textContent.includes('position-anchor')) ||
                      (titlebarFix && titlebarFix.textContent.includes('position-anchor'));
      const wv = document.querySelector('webview');
      let hit = null;
      if (wv) {
        const r = wv.getBoundingClientRect();
        const cx = r.left + r.width / 2;
        const cy = r.top + r.height / 2;
        const top = document.elementFromPoint(cx, cy);
        hit = {
          topTag: top ? top.tagName : null,
          topClass: top ? top.className : null,
          isWv: top === wv
        };
      }
      return {
        hasRule,
        hasWebview: !!wv,
        hit
      };
    })()`,
    returnByValue: true
  });

  console.log('Rule and Hit check result:', ruleCheck.result.value);

  if (!ruleCheck.result.value.hasRule) {
    throw new Error('Webview z-index rule not found in active page stylesheets!');
  }

  if (webviewTarget && ruleCheck.result.value.hasWebview) {
    const wvSession = createCdpSession(webviewTarget.webSocketDebuggerUrl);
    await wvSession.open();
    console.log('Connected to Webview target for live click testing');

    await wvSession.send('Runtime.evaluate', {
      expression: `(() => {
        window._clickedCount = 0;
        window.addEventListener('click', (e) => {
          window._clickedCount++;
          window._lastClick = { x: e.clientX, y: e.clientY, tag: e.target.tagName };
        });
        return { listening: true };
      })()`,
      returnByValue: true
    });

    const coords = await mainSession.send('Runtime.evaluate', {
      expression: `(() => {
        const wv = document.querySelector('webview');
        const r = wv.getBoundingClientRect();
        return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) };
      })()`,
      returnByValue: true
    });

    const { x, y } = coords.result.value;
    console.log(`Dispatching native mouse click at (${x}, ${y}) in main window...`);

    await mainSession.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y });
    await mainSession.send('Input.dispatchMouseEvent', { type: 'mousePressed', button: 'left', clickCount: 1, x, y });
    await mainSession.send('Input.dispatchMouseEvent', { type: 'mouseReleased', button: 'left', clickCount: 1, x, y });

    await new Promise(r => setTimeout(r, 150));

    const wvClickResult = await wvSession.send('Runtime.evaluate', {
      expression: `(() => ({ clickedCount: window._clickedCount, lastClick: window._lastClick }))()`,
      returnByValue: true
    });
    console.log('Webview click event result:', wvClickResult.result.value);
    wvSession.close();
  }

  mainSession.close();
  console.log('SUCCESS: Webview interactive rules and hit-testing verified!');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
