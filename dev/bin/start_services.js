const path = require('path');
const os = require('os');
const http = require('http');
const { execSync } = require('child_process');

async function findCdpPort() {
  try {
    const out = execSync('netstat -ano -p tcp', { encoding: 'utf8' });
    const candidates = [];
    for (const line of out.split('\n')) {
      if (line.includes('LISTENING')) {
        const parts = line.trim().split(/\s+/);
        const addr = parts[1];
        if (addr && addr.startsWith('127.0.0.1:')) {
          const port = parseInt(addr.split(':')[1], 10);
          if (port !== 8314 && port !== 8315 && port !== 8316) {
            candidates.push(port);
          }
        }
      }
    }

    for (const port of candidates) {
      try {
        const isCdp = await new Promise((resolve) => {
          const req = http.get(`http://127.0.0.1:${port}/json`, { timeout: 300 }, (res) => {
            let data = '';
            res.on('data', c => data += c);
            res.on('end', () => {
              resolve(res.statusCode === 200 && data.includes('devtoolsFrontendUrl'));
            });
          });
          req.on('error', () => resolve(false));
          req.on('timeout', () => { req.destroy(); resolve(false); });
        });
        if (isCdp) return port;
      } catch (_) {}
    }
  } catch (_) {}
  return 7907; // fallback
}

async function run() {
  const { startMediaServer } = require('../../core/media_server');
  const { startCdpProxy } = require('./cdp_proxy');
  const antigravityDir = process.env.ANTIGRAVITY_CONFIG_DIR || path.join(os.homedir(), '.gemini', 'antigravity');
  const wallpapersDir = path.join(antigravityDir, 'wallpapers');
  
  startMediaServer(wallpapersDir, 8315);
  
  const targetCdpPort = await findCdpPort();
  console.log(`[Services] Detected Antigravity native CDP port: ${targetCdpPort}`);
  startCdpProxy(targetCdpPort, 8314);
  
  // Keep alive
  setInterval(() => {}, 60000);
  console.log('Antigravity Services (Media 8315 & CDP Proxy 8314) running.');
}

run();
