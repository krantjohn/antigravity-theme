const path = require('path');
const os = require('os');
const { ensureMp4Faststart } = require('../core/theme_engine');

const wallpapersDir = path.join(os.homedir(), '.gemini', 'antigravity', 'wallpapers');
const leftMp4 = path.join(wallpapersDir, 'left_wallpaper.mp4');
const inputMp4 = path.join(wallpapersDir, 'input_wallpaper.mp4');

console.log('Testing faststart on left_wallpaper.mp4:', leftMp4);
const resLeft = ensureMp4Faststart(leftMp4);
console.log('left_wallpaper.mp4 faststart result:', resLeft);

console.log('Testing faststart on input_wallpaper.mp4:', inputMp4);
const resInput = ensureMp4Faststart(inputMp4);
console.log('input_wallpaper.mp4 faststart result:', resInput);
