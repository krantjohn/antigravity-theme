const fs = require('fs');

async function dumpLive() {
  const list = await fetch('http://127.0.0.1:8314/json').then(r => r.json());
  const page = list.find(p => p.type === 'page');
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  function call(method, params = {}) {
    return new Promise(resolve => {
      const id = Math.floor(Math.random() * 100000);
      const h = evt => {
        const m = JSON.parse(evt.data);
        if (m.id === id) {
          ws.removeEventListener('message', h);
          resolve(m.result);
        }
      };
      ws.addEventListener('message', h);
      ws.send(JSON.stringify({ id, method, params }));
    });
  }
  ws.addEventListener('open', async () => {
    const breadcrumb = await call('Runtime.evaluate', {
      expression: 'document.querySelector("[data-testid=\'breadcrumb-segment\']")?.parentElement?.outerHTML',
      returnByValue: true
    });

    const header = await call('Runtime.evaluate', {
      expression: 'document.querySelector("[data-testid=\'install-editor\']")?.parentElement?.outerHTML',
      returnByValue: true
    });

    const inputWrap = await call('Runtime.evaluate', {
      expression: 'document.querySelector("[data-testid=\'model-selector-trigger\']")?.closest(".relative")?.parentElement?.outerHTML',
      returnByValue: true
    });

    const conversationRow = await call('Runtime.evaluate', {
      expression: 'document.querySelector("[data-testid=\'conversation-row-sidebar\']")?.outerHTML',
      returnByValue: true
    });

    const res = {
      breadcrumb: breadcrumb.result.value,
      header: header.result.value,
      inputWrap: inputWrap.result.value,
      conversationRow: conversationRow.result.value
    };

    fs.writeFileSync('tests/exact_live_inspection.json', JSON.stringify(res, null, 2));
    console.log('Saved inspection to tests/exact_live_inspection.json');

    ws.close();
    process.exit(0);
  });
}
dumpLive().catch(console.error);
