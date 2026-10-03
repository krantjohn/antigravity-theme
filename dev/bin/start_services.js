const path = require('path');
const os = require('os');
function run() {
  const { startMediaServer } = require('../core/media_server');
  const { startCdpProxy } = require('./cdp_proxy');
  const antigravityDir = process.env.ANTIGRAVITY_CONFIG_DIR || path.join(os.homedir(), '.gemini', 'antigravity');
  const wallpapersDir = path.join(antigravityDir, 'wallpapers');
  startMediaServer(wallpapersDir, 8315);
  startCdpProxy(7907, 8314);
  const http = require('http');
  // Keep alive
  setInterval(() => {}, 60000);
  console.log('Antigravity Services (Media 8315 & CDP Proxy 8314) running.');
}run();
