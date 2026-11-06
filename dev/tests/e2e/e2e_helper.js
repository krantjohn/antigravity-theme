/**
 * E2E Test Suite Common Helper & Safety Infrastructure
 * Antigravity Pure 3-Target Wallpaper Injector
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const http = require('http');

const REPO_ROOT = path.resolve(__dirname, '..', '..', '..');
const WALLPAPERS_DIR = path.join(REPO_ROOT, 'wallpapers');
const DEV_TESTS_DIR = path.join(REPO_ROOT, 'dev', 'tests');

const ANTIGRAVITY_CONFIG_DIR = process.env.ANTIGRAVITY_CONFIG_DIR || path.join(os.homedir(), '.gemini', 'antigravity');
const LIVE_WALLPAPERS_DIR = path.join(ANTIGRAVITY_CONFIG_DIR, 'wallpapers');
const SLOTS_CONFIG_PATH = path.join(ANTIGRAVITY_CONFIG_DIR, 'slots_config.json');
const CUSTOM_CSS_PATH = path.join(ANTIGRAVITY_CONFIG_DIR, 'custom_theme.css');

const userSampleVideo = path.join(os.homedir(), 'Videos', '2025-01-18 20-06-44.mp4');
const SAMPLE_VIDEO_PATH = fs.existsSync(userSampleVideo)
  ? userSampleVideo
  : path.join(DEV_TESTS_DIR, 'sample_wallpaper.mp4');

const SAMPLE_IMAGE_LEFT = path.join(WALLPAPERS_DIR, 'left_wallpaper.jpg');
const SAMPLE_IMAGE_BOTTOM = path.join(WALLPAPERS_DIR, 'input_wallpaper.jpg');
const SAMPLE_IMAGE_SETTINGS = path.join(WALLPAPERS_DIR, 'settings_wallpaper.png');

/**
 * Execute JavaScript expression in live Antigravity Chromium renderer via port 8314 CDP
 */
function evalCdp(expression, retries = 3) {
  return new Promise((resolve, reject) => {
    function attempt(remaining) {
      http.get('http://127.0.0.1:8314/json', (res) => {
        let data = '';
        res.on('data', c => data += c);
        res.on('end', () => {
          try {
            const list = JSON.parse(data);
            const page = list.find(p => p.type === 'page' && !p.url.startsWith('data:')) || list.find(p => p.type === 'page');
            if (!page) {
              return reject(new Error('No CDP page target found on port 8314'));
            }
            const ws = new WebSocket(page.webSocketDebuggerUrl);
            let responded = false;
            ws.addEventListener('open', () => {
              ws.send(JSON.stringify({ id: 1, method: 'Runtime.evaluate', params: { expression, awaitPromise: true, returnByValue: true } }));
            });

            ws.addEventListener('message', (evt) => {
              responded = true;
              try {
                const resp = JSON.parse(evt.data);
                ws.close();
                if (resp.result && resp.result.result) {
                  resolve(resp.result.result.value);
                } else {
                  resolve(resp);
                }
              } catch (e) {
                resolve(null);
              }
            });
            ws.addEventListener('error', (err) => {
              if (responded) return;
              try { ws.close(); } catch (e) {}
              if (remaining > 1) {
                setTimeout(() => attempt(remaining - 1), 200);
              } else {
                reject(err);
              }
            });
          } catch (e) {
            if (remaining > 1) {
              setTimeout(() => attempt(remaining - 1), 200);
            } else {
              reject(e);
            }
          }
        });
      }).on('error', (err) => {
        if (remaining > 1) {
          setTimeout(() => attempt(remaining - 1), 200);
        } else {
          reject(err);
        }
      });
    }
    attempt(retries);
  });
}

/**
 * Send arbitrary CDP command
 */
function sendCdpCommand(method, params = {}, retries = 3) {
  return new Promise((resolve, reject) => {
    function attempt(remaining) {
      http.get('http://127.0.0.1:8314/json', (res) => {
        let data = '';
        res.on('data', c => data += c);
        res.on('end', () => {
          try {
            const list = JSON.parse(data);
            const page = list.find(p => p.type === 'page' && !p.url.startsWith('data:')) || list.find(p => p.type === 'page');
            if (!page) return reject(new Error('No CDP page target'));
            const ws = new WebSocket(page.webSocketDebuggerUrl);
            let responded = false;
            ws.addEventListener('open', () => {
              ws.send(JSON.stringify({ id: 100, method, params }));
            });
            ws.addEventListener('message', (evt) => {
              responded = true;
              try {
                const resp = JSON.parse(evt.data);
                ws.close();
                resolve(resp.result || resp);
              } catch (e) {
                resolve(null);
              }
            });
            ws.addEventListener('error', (err) => {
              if (responded) return;
              try { ws.close(); } catch (e) {}
              if (remaining > 1) setTimeout(() => attempt(remaining - 1), 200);
              else reject(err);
            });
          } catch (e) {
            if (remaining > 1) setTimeout(() => attempt(remaining - 1), 200);
            else reject(e);
          }
        });
      }).on('error', (err) => {
        if (remaining > 1) setTimeout(() => attempt(remaining - 1), 200);
        else reject(err);
      });
    }
    attempt(retries);
  });
}

/**
 * Snapshot user environment state for non-destructive testing
 */
function createSessionBackup() {
  const sessionBackupDir = path.join(os.tmpdir(), `ag_e2e_session_${Date.now()}`);
  fs.mkdirSync(sessionBackupDir, { recursive: true });

  if (fs.existsSync(LIVE_WALLPAPERS_DIR)) {
    fs.readdirSync(LIVE_WALLPAPERS_DIR).forEach(f => {
      try {
        fs.copyFileSync(path.join(LIVE_WALLPAPERS_DIR, f), path.join(sessionBackupDir, f));
      } catch (e) {}
    });
  }

  const initialConfig = fs.existsSync(SLOTS_CONFIG_PATH)
    ? JSON.parse(fs.readFileSync(SLOTS_CONFIG_PATH, 'utf8'))
    : null;
  const initialCss = fs.existsSync(CUSTOM_CSS_PATH)
    ? fs.readFileSync(CUSTOM_CSS_PATH, 'utf8')
    : null;

  return {
    backupDir: sessionBackupDir,
    initialConfig,
    initialCss,
    async restore(themeEngine) {
      console.log('   [Safety Cleanup] 正在恢复测试前现场状态...');
      try {
        if (fs.existsSync(sessionBackupDir)) {
          fs.readdirSync(sessionBackupDir).forEach(f => {
            try {
              fs.copyFileSync(path.join(sessionBackupDir, f), path.join(LIVE_WALLPAPERS_DIR, f));
            } catch (e) {}
          });
        }
        if (initialConfig && themeEngine) {
          themeEngine.saveSlotsConfig(initialConfig);
          if (initialCss) {
            fs.writeFileSync(CUSTOM_CSS_PATH, initialCss, 'utf8');
            try { fs.writeFileSync(path.join(LIVE_WALLPAPERS_DIR, 'custom_theme.css'), initialCss, 'utf8'); } catch (e) {}
          }
          await themeEngine.triggerLiveHotReload(initialCss || themeEngine.generateMasterCss(initialConfig), initialConfig);
        }
        console.log('   ✓ 现场状态已 100% 恢复');
      } finally {
        try { fs.rmSync(sessionBackupDir, { recursive: true, force: true }); } catch (e) {}
      }
    }
  };
}

/**
 * Send HTTP request
 */
function httpRequest(method, urlString, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlString);
    const opts = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method,
      headers: { ...headers }
    };
    let payload = null;
    if (body) {
      if (typeof body === 'object') {
        opts.headers['Content-Type'] = 'application/json';
        payload = JSON.stringify(body);
      } else {
        payload = String(body);
      }
      opts.headers['Content-Length'] = Buffer.byteLength(payload);
    }
    const req = http.request(opts, (res) => {
      let chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => {
        const buf = Buffer.concat(chunks);
        let parsed = null;
        try {
          parsed = JSON.parse(buf.toString('utf8'));
        } catch (e) {}
        resolve({
          status: res.statusCode,
          headers: res.headers,
          body: buf,
          text: buf.toString('utf8'),
          json: parsed
        });
      });
    });
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

module.exports = {
  REPO_ROOT,
  WALLPAPERS_DIR,
  DEV_TESTS_DIR,
  ANTIGRAVITY_CONFIG_DIR,
  LIVE_WALLPAPERS_DIR,
  SLOTS_CONFIG_PATH,
  CUSTOM_CSS_PATH,
  SAMPLE_VIDEO_PATH,
  SAMPLE_IMAGE_LEFT,
  SAMPLE_IMAGE_BOTTOM,
  SAMPLE_IMAGE_SETTINGS,
  evalCdp,
  sendCdpCommand,
  createSessionBackup,
  httpRequest
};
