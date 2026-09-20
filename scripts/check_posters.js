const fs = require('fs');
const crypto = require('crypto');
const path = require('path');

function getHash(buf) {
  return crypto.createHash('sha256').update(buf).digest('hex');
}

const inputPosterPath = 'C:\\Users\\lenvo\\.gemini\\antigravity\\wallpapers\\input_poster.jpg';
const leftPosterPath = 'C:\\Users\\lenvo\\.gemini\\antigravity\\wallpapers\\left_poster.jpg';
const leftWallpaperJpg = 'C:\\Users\\lenvo\\.gemini\\antigravity\\wallpapers\\left_wallpaper.jpg';

const inputPoster = fs.readFileSync(inputPosterPath);
const leftPoster = fs.readFileSync(leftPosterPath);
console.log('input_poster.jpg:', inputPoster.length, getHash(inputPoster));
console.log('left_poster.jpg:', leftPoster.length, getHash(leftPoster));
if (fs.existsSync(leftWallpaperJpg)) {
  const lw = fs.readFileSync(leftWallpaperJpg);
  console.log('left_wallpaper.jpg:', lw.length, getHash(lw));
}

const css = fs.readFileSync('C:\\Users\\lenvo\\.gemini\\antigravity\\custom_theme.css', 'utf-8');
const regex = /url\("data:image\/jpeg;base64,([^"]+)"\)/g;
let match;
let count = 0;
while ((match = regex.exec(css)) !== null) {
  count++;
  const buf = Buffer.from(match[1], 'base64');
  console.log(`CSS b64 #${count}: len=${buf.length}, hash=${getHash(buf)}`);
}
