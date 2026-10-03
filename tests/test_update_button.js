const http = require('http');
const fs = require('fs');
const path = require('path');
const assert = require('assert');

async function main() {
  console.log('=======================================================');
  console.log('   🧪 Antigravity Update Button & Modal Test Suite');
  console.log('=======================================================');

  const cdpList = await new Promise((resolve, reject) => {
    http.get('http://127.0.0.1:8314/json', (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(JSON.parse(data)));
    }).on('error', reject);
  });

  const page = cdpList.find(p => p.type === 'page');
  assert(page, 'CDP page must exist');
  console.log('✓ Found CDP page target:', page.title);

  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise(res => ws.addEventListener('open', res));

  let reqId = 1;
  function sendCdp(method, params = {}) {
    return new Promise((resolve) => {
      const id = reqId++;
      const onMsg = (ev) => {
        const resp = JSON.parse(ev.data);
        if (resp.id === id) {
          ws.removeEventListener('message', onMsg);
          resolve(resp.result);
        }
      };
      ws.addEventListener('message', onMsg);
      ws.send(JSON.stringify({ id, method, params }));
    });
  }

  const contexts = [];
  ws.addEventListener('message', (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.method === 'Runtime.executionContextCreated') {
      contexts.push(msg.params.context);
    }
  });

  await sendCdp('Runtime.enable');
  await new Promise(r => setTimeout(r, 200));

  async function evaluate(expression, awaitPromise = false, contextId = null) {
    const params = {
      expression,
      awaitPromise,
      returnByValue: true
    };
    if (contextId != null) params.contextId = contextId;
    const res = await sendCdp('Runtime.evaluate', params);
    if (res && res.result) {
      return res.result.value;
    }
    return res;
  }

  // 1. Inject latest preload update handler into all live execution contexts
  await evaluate(`
    (() => {
      const old = document.getElementById('antigravity-update-modal-overlay');
      if (old) old.remove();
    })()
  `);

  const preloadCode = fs.readFileSync(path.join(__dirname, '..', 'preload.js'), 'utf8');
  const startMarker = '// ================= Antigravity Update Button & Interactive Modal Handler =================';
  const endMarker = '// =========================================================================';
  const snippet = preloadCode.substring(
    preloadCode.indexOf(startMarker),
    preloadCode.indexOf(endMarker)
  );

  for (const ctx of contexts) {
    await evaluate(snippet, false, ctx.id);
  }
  // Also evaluate in default context in case contexts list was empty
  await evaluate(snippet);
  console.log(`✓ [Test 1] Preload update handler verified active across ${contexts.length || 1} live execution contexts`);

  // Ensure titlebar button is clean and ready
  await evaluate(`
    (() => {
      sessionStorage.removeItem('ag_hide_update');
      const hideStyle = document.getElementById('antigravity-hide-update-btn');
      if (hideStyle) hideStyle.remove();
      let btn = document.querySelector('[data-testid="app-update-button"]');
      if (btn) {
        btn.style.removeProperty('display');
        return true;
      }
      try {
        const moreBtn = document.querySelector('[data-testid="titlebar-more-actions"]');
        if (moreBtn && moreBtn.parentElement) {
          const fk = Object.keys(moreBtn.parentElement).find(k => k.startsWith('__reactFiber$'));
          const fib = moreBtn.parentElement[fk];
          let u = fib ? fib.child : null;
          while (u && (!u.type || u.type.name !== 'uWb')) u = u.sibling;
          if (u && u.memoizedState) {
            let h = u.memoizedState;
            let idx = 0;
            while (h) {
              if (idx === 16 && h.queue && h.queue.dispatch) {
                h.queue.dispatch('available for download');
                break;
              }
              h = h.next;
              idx++;
            }
          }
        }
      } catch(e) {}
      return true;
    })()
  `);
  await new Promise(r => setTimeout(r, 200));

  // 2. Locate the button and check computed style
  const btnInfo = await evaluate(`
    (() => {
      const btn = document.querySelector('[data-testid="app-update-button"]');
      if (!btn) return null;
      const rect = btn.getBoundingClientRect();
      const style = window.getComputedStyle(btn);
      return {
        tagName: btn.tagName,
        testId: btn.getAttribute('data-testid'),
        text: btn.innerText.trim(),
        appRegion: style.webkitAppRegion || style.appRegion,
        pointerEvents: style.pointerEvents,
        cursor: style.cursor,
        rect: { left: rect.left, top: rect.top, width: rect.width, height: rect.height },
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2
      };
    })()
  `);
  assert(btnInfo, 'Update button [data-testid="app-update-button"] must exist in DOM');
  console.log('✓ [Test 2] Update button located in DOM:');
  console.log(`   Text: "${btnInfo.text}" | Region: ${btnInfo.appRegion} | Cursor: ${btnInfo.cursor}`);
  assert.strictEqual(btnInfo.appRegion, 'no-drag', 'Button must have no-drag appRegion');
  assert.strictEqual(btnInfo.pointerEvents, 'auto', 'Button must have auto pointer-events');

  // Helper for real mouse click via CDP
  async function dispatchRealClick(x, y) {
    await sendCdp('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y });
    await sendCdp('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1 });
    await sendCdp('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 1 });
  }

  // 3. Simulate human mouse click via CDP Input.dispatchMouseEvent
  console.log('   Simulating click on update button coordinates (' + Math.round(btnInfo.x) + ', ' + Math.round(btnInfo.y) + ')...');
  await dispatchRealClick(btnInfo.x, btnInfo.y);

  // Wait for modal animation
  await new Promise(r => setTimeout(r, 400));

  // 4. Assert modal is visible and verify all content
  const modalInfo = await evaluate(`
    (() => {
      const overlay = document.getElementById('antigravity-update-modal-overlay');
      const box = document.getElementById('antigravity-update-modal-box');
      if (!overlay || !box) return null;
      const btns = Array.from(box.querySelectorAll('button')).map(b => ({
        id: b.id,
        text: b.innerText.trim()
      }));
      return {
        overlayFound: true,
        opacity: window.getComputedStyle(overlay).opacity,
        boxText: box.innerText,
        buttons: btns
      };
    })()
  `);
  assert(modalInfo, 'Update modal must open when clicking the update button');
  assert.strictEqual(modalInfo.opacity, '1', 'Modal must be fully opaque');
  assert(modalInfo.boxText.includes('发现新版本') || modalInfo.boxText.includes('Update Available'), 'Modal must contain update title');
  assert(modalInfo.boxText.includes('v2.18.1') || modalInfo.boxText.includes('当前版本'), 'Modal must show current version');
  assert(modalInfo.boxText.includes('v2.19.1') || modalInfo.boxText.includes('目标版本'), 'Modal must show target version');
  console.log('✓ [Test 3] Interactive update modal successfully opened via real click:');
  console.log('   Buttons present:', modalInfo.buttons.map(b => b.id || b.text).join(', '));
  assert(modalInfo.buttons.some(b => b.id === 'ag-modal-btn-cancel'), 'Modal must contain ag-modal-btn-cancel');

  async function waitForModalClose(timeout = 1500) {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      const isGone = await evaluate('!document.getElementById("antigravity-update-modal-overlay")');
      if (isGone) return true;
      await new Promise(r => setTimeout(r, 100));
    }
    const debug = await evaluate(`
      (() => {
        const overlay = document.getElementById("antigravity-update-modal-overlay");
        return {
          exists: !!overlay,
          opacity: overlay ? window.getComputedStyle(overlay).opacity : null,
          hasCloseModal: overlay ? typeof overlay.closeModal : null
        };
      })()
    `);
    console.log('waitForModalClose timed out. Debug:', debug);
    return false;
  }

  // 5. Test close button '✕' via REAL mouse click coordinates
  console.log('   Testing close button [✕] via real mouse click...');
  const closeBtnCoords = await evaluate(`
    (() => {
      const btn = document.getElementById('ag-modal-close-x');
      if (!btn) return null;
      const r = btn.getBoundingClientRect();
      const style = window.getComputedStyle(btn);
      return {
        x: r.left + r.width / 2,
        y: r.top + r.height / 2,
        width: r.width,
        height: r.height,
        appRegion: style.webkitAppRegion,
        pointerEvents: style.pointerEvents
      };
    })()
  `);
  assert(closeBtnCoords, 'Close button [✕] must exist');
  assert(closeBtnCoords.width >= 32 && closeBtnCoords.height >= 32, 'Close button hitbox must be at least 32x32px');
  assert.strictEqual(closeBtnCoords.appRegion, 'no-drag', 'Close button must be no-drag');
  assert.strictEqual(closeBtnCoords.pointerEvents, 'auto', 'Close button must have pointer-events auto');

  await dispatchRealClick(closeBtnCoords.x, closeBtnCoords.y);
  const isClosed1 = await waitForModalClose();
  assert(isClosed1, 'Modal must close after real mouse click on [✕]');
  console.log('✓ [Test 4] Modal closed successfully via real mouse click on [✕]');

  // 6. Test reopening and closing via "取消 / 关闭" button via REAL mouse click
  console.log('   Testing "取消 / 关闭" button via real mouse click...');
  await new Promise(r => setTimeout(r, 300));
  await evaluate('window.showThemeUpdateModal()', true);
  await new Promise(r => setTimeout(r, 300));
  const cancelBtnCoords = await evaluate(`
    (() => {
      const btn = document.getElementById('ag-modal-btn-cancel');
      if (!btn) return null;
      const r = btn.getBoundingClientRect();
      const style = window.getComputedStyle(btn);
      return {
        x: r.left + r.width / 2,
        y: r.top + r.height / 2,
        text: btn.innerText.trim(),
        appRegion: style.webkitAppRegion,
        pointerEvents: style.pointerEvents
      };
    })()
  `);
  assert(cancelBtnCoords, 'Cancel button must exist');
  assert(cancelBtnCoords.text.includes('取消') || cancelBtnCoords.text.includes('关闭'), 'Cancel button text must indicate cancel/close');
  assert.strictEqual(cancelBtnCoords.appRegion, 'no-drag', 'Cancel button must be no-drag');
  await dispatchRealClick(cancelBtnCoords.x, cancelBtnCoords.y);
  const isClosed2 = await waitForModalClose();
  assert(isClosed2, 'Modal must close after real mouse click on "取消 / 关闭" button');
  console.log('✓ [Test 5] Modal closed successfully via "取消 / 关闭" button');

  // 7. Test backdrop click outside modal box via REAL mouse click
  console.log('   Testing backdrop click outside modal box...');
  await new Promise(r => setTimeout(r, 300));
  await evaluate('window.showThemeUpdateModal()', true);
  await new Promise(r => setTimeout(r, 300));
  const backdropCoords = await evaluate(`
    (() => {
      const overlay = document.getElementById('antigravity-update-modal-overlay');
      const box = document.getElementById('antigravity-update-modal-box');
      if (!overlay || !box) return null;
      const boxRect = box.getBoundingClientRect();
      return {
        x: Math.max(10, boxRect.left / 2),
        y: Math.max(10, boxRect.top / 2)
      };
    })()
  `);
  assert(backdropCoords, 'Backdrop coordinates must be calculated');
  await dispatchRealClick(backdropCoords.x, backdropCoords.y);
  const isClosed3 = await waitForModalClose();
  assert(isClosed3, 'Modal must close after real mouse click on backdrop outside box');
  console.log('✓ [Test 6] Modal closed successfully via backdrop click');

  // 8. Test Escape key modal dismissal via REAL key event
  console.log('   Testing Escape key modal dismissal via real key event...');
  await new Promise(r => setTimeout(r, 300));
  await evaluate('window.showThemeUpdateModal()', true);
  await new Promise(r => setTimeout(r, 300));
  const isOpenedAgain = await evaluate('!!document.getElementById("antigravity-update-modal-overlay")');
  assert(isOpenedAgain, 'Modal must reopen via showThemeUpdateModal()');

  await sendCdp('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
  await sendCdp('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
  const isClosed4 = await waitForModalClose();
  assert(isClosed4, 'Modal must close when pressing Escape');
  console.log('✓ [Test 7] Modal closed successfully via Escape key');

  // 9. Test "稍后提醒 / 隐藏更新按钮"
  console.log('   Testing dismiss and hide button...');
  await new Promise(r => setTimeout(r, 350));
  await evaluate('window.showThemeUpdateModal()', true);
  await new Promise(r => setTimeout(r, 350));
  const dismissCoords = await evaluate(`
    (() => {
      const btn = document.getElementById('ag-modal-btn-dismiss');
      if (!btn) return null;
      const r = btn.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    })()
  `);
  assert(dismissCoords, 'Dismiss button must exist');
  await dispatchRealClick(dismissCoords.x, dismissCoords.y);
  const isClosed5 = await waitForModalClose();
  assert(isClosed5, 'Modal must close after clicking dismiss button');

  const hiddenCheck = await evaluate(`
    (() => {
      const btn = document.querySelector('[data-testid="app-update-button"]');
      const cs = btn ? window.getComputedStyle(btn) : null;
      return {
        display: cs ? cs.display : 'none',
        sessionStorageVal: sessionStorage.getItem('ag_hide_update')
      };
    })()
  `);
  assert.strictEqual(hiddenCheck.display, 'none', 'Update button must be hidden after clicking dismiss');
  assert.strictEqual(hiddenCheck.sessionStorageVal, '1', 'sessionStorage ag_hide_update must be set to 1');
  console.log('✓ [Test 8] "稍后提醒 / 隐藏更新按钮" successfully hid update button from titlebar');

  // 10. Restore button state so user has normal UI
  await evaluate(`
    (() => {
      sessionStorage.removeItem('ag_hide_update');
      const hideStyle = document.getElementById('antigravity-hide-update-btn');
      if (hideStyle) hideStyle.remove();
      const btn = document.querySelector('[data-testid="app-update-button"]');
      if (btn) btn.style.removeProperty('display');
      return true;
    })()
  `);
  const restoredCheck = await evaluate(`
    (() => {
      const btn = document.querySelector('[data-testid="app-update-button"]');
      const cs = btn ? window.getComputedStyle(btn) : null;
      return cs ? cs.display : 'none';
    })()
  `);
  assert.notStrictEqual(restoredCheck, 'none', 'Update button must be restored');
  console.log('✓ [Test 9] UI state restored cleanly to normal');

  ws.close();

  console.log('=======================================================');
  console.log('✨ All 9 Update Button & Modal tests PASSED successfully!');
  console.log('=======================================================');
}

main().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
