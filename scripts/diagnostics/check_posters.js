const fs = require('fs');
const crypto = require('crypto');
const path = require('path');

function getHash(buf) {
  return crypto.createHash('sha256').update(buf).digest('hex');
}

const os = require('os');
const antigravityDir = process.env.ANTIGRAVITY_CONFIG_DIR || path.join(os.homedir(), '.gemini', 'antigravity');
const inputPosterPath = path.join(antigravityDir, 'wallpapers', 'input_poster.jpg');
const leftPosterPath = path.join(antigravityDir, 'wallpapers', 'left_poster.jpg');
const leftWallpaperJpg = path.join(antigravityDir, 'wallpapers', 'left_wallpaper.jpg');

const inputPoster = fs.existsSync(inputPosterPath) ? fs.readFileSync(inputPosterPath) : Buffer.alloc(0);
const leftPoster = fs.existsSync(leftPosterPath) ? fs.readFileSync(leftPosterPath) : Buffer.alloc(0);
console.log('input_poster.jpg:', inputPoster.length, getHash(inputPoster));
console.log('left_poster.jpg:', leftPoster.length, getHash(leftPoster));
if (fs.existsSync(leftWallpaperJpg)) {
  const lw = fs.readFileSync(leftWallpaperJpg);
  console.log('left_wallpaper.jpg:', lw.length, getHash(lw));
}

const cssFile = path.join(antigravityDir, 'custom_theme.css');
const css = fs.existsSync(cssFile) ? fs.readFileSync(cssFile, 'utf-8') : '';
const regex = /url\("data:image\/jpeg;base64,([^"]+)"\)/g;
let match;
let count = 0;
while ((match = regex.exec(css)) !== null) {
  count++;
  const buf = Buffer.from(match[1], 'base64');
  console.log(`CSS b64 #${count}: len=${buf.length}, hash=${getHash(buf)}`);
}
