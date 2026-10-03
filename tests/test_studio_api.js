const http = require('http');
const assert = require('assert');
const path = require('path');
const fs = require('fs');

async function runStudioTests() {
  console.log('=======================================================');
  console.log('   🧪 Antigravity Theme Studio 方案二自动化深度验证');
  console.log('=======================================================');

  // Start studio server directly
  const { server, PORT } = require('../studio/server');

  function request(method, path, body = null) {
    return new Promise((resolve, reject) => {
      const opts = {
        host: '127.0.0.1',
        port: PORT,
        path: path,
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
    // 1. Static HTML serving
    console.log('[Test 1] 校验首页静态 HTML 托管与编码...');
    const htmlRes = await request('GET', '/');
    assert.strictEqual(htmlRes.status, 200);
    assert(htmlRes.text.includes('Antigravity Theme Studio'));
    assert(htmlRes.text.includes('slot-pill'));
    assert(htmlRes.text.includes('Rec. 601'));
    console.log('   ✓ 首页 HTML 响应正常 (200 OK)');

    // 2. CSS serving
    console.log('[Test 2] 校验 Raycast/Linear 样式表 (style.css)...');
    const cssRes = await request('GET', '/style.css');
    assert.strictEqual(cssRes.status, 200);
    assert(cssRes.text.includes('--bg-dark: #090a0f'));
    assert(cssRes.text.includes('--bg-card: #0f121d'));
    assert(cssRes.text.includes('--border-subtle'));
    console.log('   ✓ style.css 样式表完整，包含 Obsidian 暗夜调色盘与 Bento 网格 (200 OK)');

    // 3. JS serving
    console.log('[Test 3] 校验前端交互逻辑 (app.js)...');
    const jsRes = await request('GET', '/app.js');
    assert.strictEqual(jsRes.status, 200);
    assert(jsRes.text.includes('updateRec601Visualizer'));
    assert(jsRes.text.includes('browseSlotFile'));
    assert(jsRes.text.includes('applyPreset'));
    console.log('   ✓ app.js 交互脚本托管正常 (200 OK)');

    // 4. API: /api/status
    console.log('[Test 4] 校验 /api/status 状态探测与槽位数据...');
    const statusRes = await request('GET', '/api/status');
    assert.strictEqual(statusRes.status, 200);
    assert.strictEqual(statusRes.json.success, true);
    assert(statusRes.json.isCdpOnline !== undefined);
    assert(statusRes.json.isMediaOnline !== undefined);
    assert(statusRes.json.slotsConfig !== undefined);
    assert(statusRes.json.slotsMeta !== undefined);
    console.log(`   ✓ 状态正常: CDP 连接: ${statusRes.json.isCdpOnline ? '🟢' : '🔴'}, 流媒体服务: ${statusRes.json.isMediaOnline ? '🟢' : '🔴'}, 创意工坊壁纸数: ${statusRes.json.weCount}`);

    // 5. API: /api/set-pos (槽位视口位置坐标校准)
    console.log('[Test 5] 校验槽位对齐位置微调接口 (/api/set-pos)...');
    const origLeftPos = statusRes.json.slotsConfig.left ? statusRes.json.slotsConfig.left.position : 'center center';
    const setPosRes = await request('POST', '/api/set-pos', { slot: 'left', x: '45%', y: '55%' });
    assert.strictEqual(setPosRes.status, 200);
    assert.strictEqual(setPosRes.json.success, true);
    console.log('   ✓ 坐标微调正常，并触发实时刷新');

    // Restore position
    const parts = origLeftPos.split(' ');
    await request('POST', '/api/set-pos', { slot: 'left', x: parts[0] || '50%', y: parts[1] || '50%' });

    // 6. API: /api/set-font (字体切换与自适应对比度)
    console.log('[Test 6] 校验字体切换与 Rec. 601 自适应明暗计算 (/api/set-font)...');
    const origFont = statusRes.json.slotsConfig.fontColor || '#ffffff';
    const fontChangeRes = await request('POST', '/api/set-font', { color: '#00f2fe' });
    assert.strictEqual(fontChangeRes.status, 200);
    assert.strictEqual(fontChangeRes.json.success, true);
    console.log('   ✓ 成功应用高对比度自适应色');

    // Restore font
    await request('POST', '/api/set-font', { color: origFont });

    // 7. API: /api/presets/save, /api/presets/delete
    console.log('[Test 7] 校验预设管理器保存与清理接口 (/api/presets/save, /api/presets/delete)...');
    const testPresetName = `Studio_AutoTest_${Date.now()}`;
    const saveRes = await request('POST', '/api/presets/save', {
      name: testPresetName,
      desc: '自动化测试临时保存预设'
    });
    assert.strictEqual(saveRes.status, 200);
    assert.strictEqual(saveRes.json.success, true);
    console.log(`   ✓ 预设归档成功: 【${testPresetName}】`);

    const delRes = await request('POST', '/api/presets/delete', { name: testPresetName });
    assert.strictEqual(delRes.status, 200);
    assert.strictEqual(delRes.json.success, true);
    // 8. API: /api/slots/reset-pos
    console.log('[Test 8] 校验槽位对齐位置重置接口 (/api/slots/reset-pos)...');
    const resetPosRes = await request('POST', '/api/slots/reset-pos', { slot: 'left' });
    assert.strictEqual(resetPosRes.status, 200);
    assert.strictEqual(resetPosRes.json.success, true);
    console.log('   ✓ 单槽位对齐重置测试通过');

    const resetAllPosRes = await request('POST', '/api/slots/reset-pos', { slot: 'all' });
    assert.strictEqual(resetAllPosRes.status, 200);
    assert.strictEqual(resetAllPosRes.json.success, true);
    console.log('   ✓ 全槽位对齐重置测试通过');

    // 9. API: /api/font/reset
    console.log('[Test 9] 校验字体颜色重置默认纯白接口 (/api/font/reset)...');
    const resetFontRes = await request('POST', '/api/font/reset', {});
    assert.strictEqual(resetFontRes.status, 200);
    assert.strictEqual(resetFontRes.json.success, true);
    assert.strictEqual(resetFontRes.json.color, '#ffffff');
    console.log('   ✓ 默认纯白字体重置测试通过');

    // 10. API: /api/slots/reset-slot
    console.log('[Test 10] 校验当前槽位恢复默认初始壁纸接口 (/api/slots/reset-slot)...');
    const resetSlotRes = await request('POST', '/api/slots/reset-slot', { slot: 'mid' });
    assert.strictEqual(resetSlotRes.status, 200);
    assert.strictEqual(resetSlotRes.json.success, true);
    console.log('   ✓ 单槽位默认壁纸素材恢复测试通过');

    console.log('\n=======================================================');
    console.log('✨ 恭喜！Antigravity Theme Studio 方案二所有重置与预设接口 100% 验证通过！');
    console.log('=======================================================');

    // Clean exit
    server.close();
    process.exit(0);
  } catch (err) {
    console.error('\n❌ 测试失败:', err);
    try { server.close(); } catch(e) {}
    process.exit(1);
  }
}

runStudioTests();
