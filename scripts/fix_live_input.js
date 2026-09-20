const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');

const posterPath = path.join(os.homedir(), '.gemini', 'antigravity', 'wallpapers', 'input_poster.jpg');
const posterBuf = fs.readFileSync(posterPath);
const posterB64 = 'data:image/jpeg;base64,' + posterBuf.toString('base64');
const vParam = Date.now();
const videoUrl = `http://127.0.0.1:8315/input_wallpaper.mp4?v=${vParam}`;

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
          if (!el) return { error: 'Input box element not found' };

          // 1. Force update container background to crystal sphere poster
          const posterB64 = ${JSON.stringify(posterB64)};
          const videoUrl = ${JSON.stringify(videoUrl)};
          
          el.style.backgroundImage = 'linear-gradient(rgba(12, 14, 24, 0.15), rgba(12, 14, 24, 0.28)), url("' + posterB64 + '")';
          el.style.backgroundSize = 'cover';
          el.style.backgroundPosition = '50% 40%';

          // 2. Force update video element
          let vid = el.querySelector('video.antigravity-slot-video[data-slot="bottom"]');
          if (!vid) {
            vid = document.createElement('video');
            vid.className = 'antigravity-slot-video';
            vid.setAttribute('data-slot', 'bottom');
            vid.muted = true;
            vid.defaultMuted = true;
            vid.setAttribute('muted', '');
            vid.autoplay = true;
            vid.loop = true;
            vid.playsInline = true;
            vid.setAttribute('playsinline', '');
            vid.setAttribute('autoplay', '');
            vid.setAttribute('loop', '');
            vid.preload = 'auto';
            vid.setAttribute('preload', 'auto');
            vid.crossOrigin = 'anonymous';
            vid.setAttribute('crossorigin', 'anonymous');
            vid.style.position = 'absolute';
            vid.style.top = '0';
            vid.style.left = '0';
            vid.style.width = '100%';
            vid.style.height = '100%';
            vid.style.objectFit = 'cover';
            vid.style.objectPosition = '50% 40%';
            vid.style.pointerEvents = 'none';
            vid.style.zIndex = '0';
            vid.style.display = 'block';
            el.prepend(vid);
          }

          vid.poster = posterB64;
          vid.setAttribute('poster', posterB64);
          vid.style.backgroundImage = 'url("' + posterB64 + '")';
          vid.style.backgroundSize = 'cover';
          vid.style.backgroundPosition = '50% 40%';
          vid.dataset.currentSrc = videoUrl;
          vid.src = videoUrl;
          vid.load();
          const playPromise = vid.play();
          if (playPromise) {
            playPromise.catch(e => console.log('play error:', e));
          }

          // 3. Also update stylesheet link
          let link = document.getElementById('antigravity-custom-theme-link');
          if (link) {
            link.href = 'http://127.0.0.1:8315/custom_theme.css?v=' + Date.now();
          }

          return {
            success: true,
            vidSrc: vid.src,
            vidPoster: vid.poster ? vid.poster.substring(0, 50) + '...' : '',
            paused: vid.paused,
            readyState: vid.readyState
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
        console.log('Result:', JSON.stringify(resp.result.result.value, null, 2));
        setTimeout(() => {
          ws.send(JSON.stringify({
            id: 2,
            method: 'Page.captureScreenshot',
            params: { format: 'png', quality: 90 }
          }));
        }, 1000);
      } else if (resp.id === 2) {
        const buf = Buffer.from(resp.result.data, 'base64');
        const outPath = 'C:\\Users\\lenvo\\.gemini\\antigravity\\brain\\2ea5575d-04fc-4078-88aa-ed41ef4479c6\\live_input_fixed.png';
        fs.writeFileSync(outPath, buf);
        console.log(`Saved screenshot to ${outPath} (${buf.length} bytes)`);
        ws.close();
      }
    });
  });
});
