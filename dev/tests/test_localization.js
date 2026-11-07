const http = require('http');
const assert = require('assert');
const path = require('path');
const fs = require('fs');

async function runLocalizationTests() {
  console.log('=======================================================');
  console.log('   🧪 Antigravity 界面中文汉化与美化深度集成自动化测试');
  console.log('=======================================================');

  const localizationManager = require('../../core/localization_manager');
  const { server, PORT } = require('../../studio/server');

  function request(method, apiPath, body = null) {
    return new Promise((resolve, reject) => {
      const opts = {
        host: '127.0.0.1',
        port: PORT,
        path: apiPath,
        method: method,
        headers: {}
      };
      if (body) {
        opts.headers['Content-Type'] = 'application/json';
      }
      const req = http.request(opts, (res) => {
        let data = [];
        res.on('data', chunk => data.push(chunk));
        res.on('end', () => {
          const buf = Buffer.concat(data);
          const ct = res.headers['content-type'] || '';
          let parsed = null;
          if (ct.includes('application/json')) {
            try { parsed = JSON.parse(buf.toString('utf8')); } catch(e) {}
          }
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: buf,
            json: parsed,
            text: buf.toString('utf8')
          });
        });
      });
      req.on('error', reject);
      if (body) {
        req.write(JSON.stringify(body));
      }
      req.end();
    });
  }

  try {
    // 1. Direct Module Verification
    console.log('[Test 1] 校验 localizationManager 状态检测与字典完整度...');
    const status = localizationManager.getStatus();
    assert.strictEqual(status.success, true);
    assert.strictEqual(status.version, '2.29.0');
    assert.strictEqual(status.dictCount, 8);
    assert(Array.isArray(status.dictFiles));
    assert(status.dictFiles.includes('common.json'));
    assert(status.dictFiles.includes('v2.29.0.json'));
    console.log(`   ✓ 状态与 8 组高精度字典检测完全通过 (已发现 ${status.dictCount} 组字典)`);

    // 2. GET /api/status telemetry payload
    console.log('[Test 2] 校验 GET /api/status 遥测数据包包含汉化状态...');
    const statusRes = await request('GET', '/api/status');
    assert.strictEqual(statusRes.status, 200);
    assert(statusRes.json && statusRes.json.localization);
    assert.strictEqual(statusRes.json.localization.version, '2.29.0');
    assert.strictEqual(statusRes.json.localization.dictCount, 8);
    console.log('   ✓ /api/status 正确返回 localization 状态对象');

    // 3. GET /api/localization/status
    console.log('[Test 3] 校验专用接口 GET /api/localization/status...');
    const locStatusRes = await request('GET', '/api/localization/status');
    assert.strictEqual(locStatusRes.status, 200);
    assert.strictEqual(locStatusRes.json.success, true);
    assert.strictEqual(locStatusRes.json.dictCount, 8);
    console.log('   ✓ GET /api/localization/status 响应正常 (200 OK)');

    // 4. Test Enable Chinese Localization
    console.log('[Test 4] 校验一键开启中文汉化 POST /api/localization/enable...');
    const enableRes = await request('POST', '/api/localization/enable');
    assert.strictEqual(enableRes.status, 200);
    assert.strictEqual(enableRes.json.success, true);
    assert.strictEqual(enableRes.json.isChineseInstalled, true);
    assert.strictEqual(localizationManager.isChineseInstalled(), true);
    console.log('   ✓ 中文汉化已成功写入并校验生效');

    // 5. Verify Zero Interference with Theme Hooks
    console.log('[Test 5] 验证汉化注入后美化底层代码 (custom_theme.css & hooks) 100% 保持完整...');
    const resDir = localizationManager.getResourcesDir();
    const asarPath = path.join(resDir, 'app.asar');
    const appPreload = path.join(resDir, 'app', 'dist', 'preload.js');
    let preloadContent = '';
    if (fs.existsSync(appPreload)) {
      preloadContent = fs.readFileSync(appPreload, 'utf8');
    } else {
      const eng = require('../../core/localization_engine');
      preloadContent = eng.AsarArchive.readFile(asarPath, 'dist/preload.js').toString('utf8');
    }
    assert(preloadContent.includes('__ANTIGRAVITY_CHINESE_LOCALIZATION_START__'), '必须包含汉化特征签名');
    assert(preloadContent.includes('custom_theme.css'), '必须 100% 保持 custom_theme.css 美化挂载点');
    console.log('   ✓ 汉化代码与美化底层完美共存，美化核心挂载点零受损');

    // 6. Test Disable Chinese Localization (Restoring Official English)
    console.log('[Test 6] 校验一键恢复官方英文原版 POST /api/localization/disable...');
    const disableRes = await request('POST', '/api/localization/disable');
    assert.strictEqual(disableRes.status, 200);
    assert.strictEqual(disableRes.json.success, true);
    assert.strictEqual(disableRes.json.isChineseInstalled, false);
    assert.strictEqual(localizationManager.isChineseInstalled(), false);

    // Verify preload is clean of localization but STILL HAS theme
    let cleanPreload = '';
    if (fs.existsSync(appPreload)) {
      cleanPreload = fs.readFileSync(appPreload, 'utf8');
    } else {
      const eng = require('../../core/localization_engine');
      cleanPreload = eng.AsarArchive.readFile(asarPath, 'dist/preload.js').toString('utf8');
    }
    assert(!cleanPreload.includes('__ANTIGRAVITY_CHINESE_LOCALIZATION_START__'), '必须完全清除汉化特征代码');
    assert(cleanPreload.includes('custom_theme.css'), '必须 100% 保持 custom_theme.css 美化挂载点');
    console.log('   ✓ 汉化代码已安全剥离，官方原生英文完全恢复，美化底层安然无恙');

    // 7. Test Toggle
    console.log('[Test 7] 校验切换接口 POST /api/localization/toggle 往复切换...');
    const toggle1 = await request('POST', '/api/localization/toggle');
    assert.strictEqual(toggle1.json.isChineseInstalled, true);
    console.log('   ✓ 切换 1: 英文 -> 中文 成功');

    const toggle2 = await request('POST', '/api/localization/toggle');
    assert.strictEqual(toggle2.json.isChineseInstalled, false);
    console.log('   ✓ 切换 2: 中文 -> 英文 成功');

    // 8. Verify Frontend Assets
    console.log('[Test 8] 校验 Theme Studio 前端视图与多语言资产...');
    const htmlRes = await request('GET', '/index.html');
    assert(htmlRes.text.includes('btn-localization-toggle'), '首页必须包含顶部汉化快捷按钮');
    assert(htmlRes.text.includes('card-localization'), '安全中心必须包含汉化管理卡片');

    const appJsRes = await request('GET', '/app.js');
    assert(appJsRes.text.includes('renderLocalizationUI'), 'app.js 必须包含汉化渲染逻辑');
    assert(appJsRes.text.includes('toggleChineseLocalization'), 'app.js 必须包含汉化切换逻辑');

    const i18nRes = await request('GET', '/i18n.js');
    assert(i18nRes.text.includes('safety.localization_title'), 'i18n.js 必须包含汉化文案字典');
    console.log('   ✓ 前端资产、按钮与国际化字典校验通过');

    console.log('');
    console.log('=======================================================');
    console.log('   🎉 Antigravity 汉化集成所有 8 项测试全部 100% PASS！');
    console.log('=======================================================');
    return true;
  } catch (err) {
    console.error('❌ 测试未通过:', err);
    throw err;
  }
}

if (require.main === module) {
  runLocalizationTests().then(() => {
    setTimeout(() => process.exit(0), 100);
  }).catch(() => {
    setTimeout(() => process.exit(1), 100);
  });
}

module.exports = { runLocalizationTests };
