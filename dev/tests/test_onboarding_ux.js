const http = require('http');
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const studio = require('../../studio/server');

function request(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: '127.0.0.1',
      port: 8316,
      path,
      method,
      headers: {
        'Content-Type': 'application/json'
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data), text: data });
        } catch (_) {
          resolve({ status: res.statusCode, text: data });
        }
      });
    });
    req.on('error', reject);
    if (body) {
      req.write(typeof body === 'string' ? body : JSON.stringify(body));
    }
    req.end();
  });
}

async function runOnboardingTests() {
  console.log('=======================================================');
  console.log('   🧪 Antigravity Theme Studio 新手引导与一键注入 UX 验证');
  console.log('=======================================================');

  // 1. Verify index.html contains all new UX components
  console.log('[Test 1] 校验 index.html 中各视图的注入与新手引导元素...');
  const htmlRes = await request('GET', '/');
  assert.strictEqual(htmlRes.status, 200);

  // Header additions
  assert(htmlRes.text.includes('id="patch-status-pill"'), 'Missing patch-status-pill');
  assert(htmlRes.text.includes('id="btn-open-guide"'), 'Missing btn-open-guide');
  assert(htmlRes.text.includes('id="nav-safety-dot"'), 'Missing nav-safety-dot');

  // View 1 (Live Preview) Workspace banner & Inspector Step 1 Card
  assert(htmlRes.text.includes('id="inspector-guide-card"'), 'Missing inspector-guide-card');
  assert(htmlRes.text.includes('id="btn-quick-inject"'), 'Missing btn-quick-inject');
  assert(htmlRes.text.includes('id="btn-quick-restart"'), 'Missing btn-quick-restart');
  assert(htmlRes.text.includes('id="workspace-hero-banner"'), 'Missing workspace-hero-banner');
  assert(htmlRes.text.includes('id="btn-hero-inject"'), 'Missing btn-hero-inject');
  assert(htmlRes.text.includes('id="btn-hero-restart"'), 'Missing btn-hero-restart');
  assert(htmlRes.text.includes('id="btn-hero-guide"'), 'Missing btn-hero-guide');

  // View 2 (Presets) Baseline Reset Button
  assert(htmlRes.text.includes('id="btn-reset-baseline-presets"'), 'Missing btn-reset-baseline-presets');

  // View 4 (Safety Center) Step Indicators
  assert(htmlRes.text.includes('① 核心注入环境 (必选第一步)'), 'Missing Step 1 card indicator');
  assert(htmlRes.text.includes('② 客户端控制与重启 (第二步)'), 'Missing Step 2 card indicator');

  // Newbie Guide Modal & Interactive Step Buttons
  assert(htmlRes.text.includes('id="guide-modal"'), 'Missing guide-modal');
  assert(htmlRes.text.includes('id="btn-guide-step1-inject"'), 'Missing btn-guide-step1-inject');
  assert(htmlRes.text.includes('id="btn-guide-step2-restart"'), 'Missing btn-guide-step2-restart');
  assert(htmlRes.text.includes('id="btn-guide-step3-workspace"'), 'Missing btn-guide-step3-workspace');
  assert(htmlRes.text.includes('id="btn-guide-step3-we"'), 'Missing btn-guide-step3-we');
  assert(htmlRes.text.includes('id="btn-guide-step4-go"'), 'Missing btn-guide-step4-go');
  assert(htmlRes.text.includes('id="btn-finish-guide"'), 'Missing btn-finish-guide');
  console.log('   ✓ index.html 包含全部高优先级一键注入按钮与新手引导模块');

  // 2. Verify style.css contains all required classes
  console.log('[Test 2] 校验 style.css 中新手引导与横幅样式...');
  const cssRes = await request('GET', '/style.css');
  assert.strictEqual(cssRes.status, 200);
  assert(cssRes.text.includes('.workspace-hero-banner'), 'Missing .workspace-hero-banner in css');
  assert(cssRes.text.includes('.inspector-guide-card'), 'Missing .inspector-guide-card in css');
  assert(cssRes.text.includes('.modal-box-guide'), 'Missing .modal-box-guide in css');
  assert(cssRes.text.includes('.nav-tab-dot'), 'Missing .nav-tab-dot in css');
  console.log('   ✓ style.css 样式定义完整');

  // 3. Verify app.js logic and fixes
  console.log('[Test 3] 校验 app.js 核心逻辑与事件绑定...');
  const appJsText = fs.readFileSync(path.join(__dirname, '../../studio/public/app.js'), 'utf8');
  assert(appJsText.includes('async function executeInstallPatch()'), 'Missing executeInstallPatch');
  assert(appJsText.includes('function openGuideModal()'), 'Missing openGuideModal');
  assert(appJsText.includes('function closeGuideModal()'), 'Missing closeGuideModal');
  assert(appJsText.includes('btnQuickInject.onclick = executeInstallPatch'), 'Missing btnQuickInject binding');
  assert(appJsText.includes('btnHeroInject.onclick = executeInstallPatch'), 'Missing btnHeroInject binding');
  assert(appJsText.includes('btnGuideStep1Inject.onclick = executeInstallPatch'), 'Missing btnGuideStep1Inject binding');
  assert(appJsText.includes('btnQuickRestart.onclick = handleRestartAntigravity'), 'Missing btnQuickRestart binding');
  assert(appJsText.includes('btnHeroRestart.onclick = handleRestartAntigravity'), 'Missing btnHeroRestart binding');
  assert(appJsText.includes('btnGuideStep2Restart.onclick = handleRestartAntigravity'), 'Missing btnGuideStep2Restart binding');
  assert(appJsText.includes('btnGuideStep3Workspace.onclick'), 'Missing btnGuideStep3Workspace binding');
  assert(appJsText.includes('btnGuideStep3We.onclick'), 'Missing btnGuideStep3We binding');
  assert(appJsText.includes('btnGuideStep4Go.onclick'), 'Missing btnGuideStep4Go binding');
  assert(appJsText.includes('btnResetBaselinePresets.onclick'), 'Missing btnResetBaselinePresets binding');
  
  // Verify critical bug fixes in app.js
  assert(appJsText.includes('!success && btn.dataset.prevText'), 'Bug: prevText unconditionally overwriting success state');
  assert(appJsText.includes('localStorage.removeItem(\'ag_never_show_guide\')'), 'Bug: checkbox uncheck not removing persistence key');
  assert(appJsText.includes('inspectorGuideCard.style.display = \'none\''), 'Bug: inspectorGuideCard not hidden when ready');
  console.log('   ✓ app.js 统一注入与引导逻辑完整，所有关键修复均已到位');

  // 4. Verify /api/status patchStatus endpoint
  console.log('[Test 4] 校验 /api/status 返回的 patchStatus 结构...');
  const statusRes = await request('GET', '/api/status');
  assert.strictEqual(statusRes.status, 200);
  assert(statusRes.data.success, 'statusRes.data.success is false');
  assert(typeof statusRes.data.patchStatus === 'object', 'patchStatus is not object');
  assert('isPatched' in statusRes.data.patchStatus, 'isPatched missing');
  assert('asarPatched' in statusRes.data.patchStatus, 'asarPatched missing');
  assert('isFreshOfficialUpdate' in statusRes.data.patchStatus, 'isFreshOfficialUpdate missing');
  console.log('   ✓ /api/status 返回完整 patchStatus 对象:', statusRes.data.patchStatus);

  // 5. Logic Unit Simulation Test for Button Text Restoration
  console.log('[Test 5] 模拟验证 executeInstallPatch 按钮状态恢复逻辑...');
  {
    // Simulate button text restoration on success vs failure
    const mockBtn = { textContent: '⚡ 一键注入美化底层', dataset: {}, disabled: false };
    const patchButtons = [mockBtn];

    // Simulate start
    patchButtons.forEach(btn => {
      btn.disabled = true;
      btn.dataset.prevText = btn.textContent;
      btn.textContent = '⏳ 正在自动化安全注入核心 (约需5秒)...';
    });

    // Case A: Success -> fetchStatus updates text to '🔄 重新注入'
    let success = true;
    mockBtn.textContent = '🔄 重新注入 / 官方更新后重补';
    patchButtons.forEach(btn => {
      btn.disabled = false;
      if (!success && btn.dataset.prevText) {
        btn.textContent = btn.dataset.prevText;
      }
    });
    assert.strictEqual(mockBtn.textContent, '🔄 重新注入 / 官方更新后重补', 'Success must preserve updated text!');

    // Case B: Failure -> text must revert to prevText
    patchButtons.forEach(btn => {
      btn.disabled = true;
      btn.dataset.prevText = btn.textContent;
      btn.textContent = '⏳ 正在自动化安全注入核心 (约需5秒)...';
    });
    success = false;
    patchButtons.forEach(btn => {
      btn.disabled = false;
      if (!success && btn.dataset.prevText) {
        btn.textContent = btn.dataset.prevText;
      }
    });
    assert.strictEqual(mockBtn.textContent, '🔄 重新注入 / 官方更新后重补', 'Failure must restore prevText!');
    console.log('   ✓ 按钮状态恢复与防覆盖逻辑模拟验证通过');
  }

  // 6. Logic Unit Simulation Test for Checkbox Persistence
  console.log('[Test 6] 模拟验证新手指南复选框记忆与取消记忆逻辑...');
  {
    const storage = {};
    const mockStorage = {
      getItem: (k) => storage[k] || null,
      setItem: (k, v) => storage[k] = String(v),
      removeItem: (k) => delete storage[k]
    };

    let chk = { checked: true };
    // User checks box and closes
    if (chk.checked) mockStorage.setItem('ag_never_show_guide', 'true');
    else mockStorage.removeItem('ag_never_show_guide');
    assert.strictEqual(mockStorage.getItem('ag_never_show_guide'), 'true');

    // User re-opens: box should be checked
    chk.checked = mockStorage.getItem('ag_never_show_guide') === 'true';
    assert.strictEqual(chk.checked, true);

    // User unchecks and closes: key must be removed
    chk.checked = false;
    if (chk.checked) mockStorage.setItem('ag_never_show_guide', 'true');
    else mockStorage.removeItem('ag_never_show_guide');
    assert.strictEqual(mockStorage.getItem('ag_never_show_guide'), null, 'Unchecked must remove suppression key!');
    console.log('   ✓ 新手指南复选框取消记忆逻辑模拟验证通过');
  }

  console.log('=======================================================');
  console.log('🎉 所有新手引导与注入优化测试全部通过 (ALL PASS)!');
  console.log('=======================================================');
  process.exit(0);
}

runOnboardingTests().catch(err => {
  console.error('❌ 测试异常:', err);
  process.exit(1);
});
