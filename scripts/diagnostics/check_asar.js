const cp = require('child_process');
const fs = require('fs');
const path = require('path');

const asarPath = 'C:\\Users\\Administrator\\AppData\\Local\\Programs\\antigravity\\resources\\app.asar';
const tmpDir = 'C:\\Users\\Administrator\\antigravity-theme\\tests\\asar_check';
if (fs.existsSync(tmpDir)) fs.rmSync(tmpDir, { recursive: true, force: true });
cp.execSync(`npx.cmd --yes asar extract "${asarPath}" "${tmpDir}"`);

const filesToCheck = ['dist/main.js', 'dist/preload.js', 'dist/media_server.js'];
for (const rel of filesToCheck) {
  const extracted = path.join(tmpDir, rel);
  const local = rel === 'dist/media_server.js' ? path.join(__dirname, '..', 'core', 'media_server.js') : path.join(__dirname, '..', path.basename(rel));
  const exists = fs.existsSync(extracted);
  console.log(`${rel} in asar exists:`, exists);
  if (exists) {
    const extBuf = fs.readFileSync(extracted);
    const locBuf = fs.readFileSync(local);
    console.log(`  size in asar: ${extBuf.length}, local size: ${locBuf.length}, matches: ${extBuf.equals(locBuf)}`);
  }
}
fs.rmSync(tmpDir, { recursive: true, force: true });
