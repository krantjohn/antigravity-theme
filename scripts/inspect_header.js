const http = require('http');

async function test() {
  const r = await fetch('http://127.0.0.1:8314/json');
  const pages = await r.json();
  const page = pages.find(p => p.type === 'page');
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  ws.onopen = () => {
    ws.send(JSON.stringify({
      id: 1,
      method: 'Runtime.evaluate',
      params: {
        expression: `(() => {
          const btns = Array.from(document.querySelectorAll('button')).filter(b => {
            const r = b.getBoundingClientRect();
            return r.top < 100 && r.left > 250;
          }).map(b => ({
            text: b.innerText.trim(),
            aria: b.getAttribute('aria-label'),
            title: b.getAttribute('title'),
            classes: b.className,
            svg: b.querySelector('svg')?.outerHTML
          }));
          return btns;
        })()`,
        returnByValue: true
      }
    }));
  };
  ws.onmessage = (e) => {
    const res = JSON.parse(e.data);
    console.log(JSON.stringify(res.result.result.value, null, 2));
    ws.close();
  };
}
test();
