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
          const el = document.querySelector(sel) || document.querySelector('div.bg-card');
          if (!el) return { found: false };
          const vids = el.querySelectorAll('video');
          const computed = window.getComputedStyle(el);
          return {
            found: true,
            className: el.className,
            bgImage: computed.backgroundImage ? computed.backgroundImage.substring(0, 100) : '',
            bgPos: computed.backgroundPosition,
            bgSize: computed.backgroundSize,
            zIndex: computed.zIndex,
            videoCount: vids.length,
            videos: Array.from(vids).map(v => ({
              slot: v.getAttribute('data-slot'),
              src: v.src,
              paused: v.paused,
              readyState: v.readyState,
              display: v.style.display,
              zIndex: v.style.zIndex,
              pos: v.style.position,
              top: v.style.top,
              left: v.style.left,
              w: v.style.width,
              h: v.style.height,
              objPos: v.style.objectPosition,
              currentTime: v.currentTime
            }))
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
        console.log('Input box DOM inspection:', JSON.stringify(resp.result.result.value, null, 2));
        ws.close();
      }
    });
  });
});
