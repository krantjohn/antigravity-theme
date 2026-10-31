# In-App Wallpaper Engine Library Refresh & Detection Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an in-app feature to trigger instant re-scanning and detection of the Steam Wallpaper Engine wallpaper library, both from the Steam Workshop view and the in-place slot quick picker modal, bypassing in-memory cache and updating the UI live with visual feedback and toast notifications.

**Architecture:**
1. Backend & Bridge: Extend `studio/server.js` (`GET /api/we/list?refresh=true` and `POST /api/we/refresh`) and `core/theme_engine.js` (`listWallpaperEngineWallpapers`) to forward `{ refresh: true }` down to `core/wallpaper_engine_bridge.js` (`scanWorkshopWallpapers`), bypassing the 60s TTL cache and re-enumerating Steam library folders.
2. Frontend & UI: Add refresh buttons with SVG reload icons and spinning animation to View 3 header (`#btn-refresh-we`), the empty state card, and the Quick Picker modal header (`#btn-refresh-we-picker`).
3. Internationalization & Feedback: Integrate full bilingual strings (`zh` / `en`) in `studio/public/i18n.js` and display clear toast notifications showing detected counts or helpful setup prompts when empty.

**Tech Stack:** Node.js, Express-less lightweight HTTP server, Vanilla ES6 JavaScript, HTML5/CSS3, C# WebView2 container packaging.

**Spec:** User request to "增加一个应用内刷新检测wallpaper壁纸库的功能" with confirmed dual-scenario UI placement (View 3 + Quick Picker modal) and backend cache-busting.

## Global Constraints
- Zero breaking changes to existing 5-slot wallpaper architecture or live hot-reload mechanism.
- Must support both Chinese and English seamlessly (`data-i18n` and `i18n.js`).
- Visual style must match the existing Dark / Light cyberpunk aesthetic and existing buttons.
- Build single-file executable `AntigravityThemeStudio.exe` successfully via `dev\bin\build_exe.bat`.

## Review Focus
- Cache invalidation: Calling refresh must immediately detect newly added or deleted folders in Steam workshop directory without restarting the app.
- Loading state: Buttons must indicate loading (spinning icon + disabled + loading text) so users cannot spam duplicate scan processes.
- Modal synchronization: Refreshing from inside the picker modal must update both the modal grid and the main workshop view count without closing the modal.
- Empty state: When 0 items are detected, a friendly card with an inline refresh button must be shown instead of a broken layout.
- Error handling: Non-existent Steam directory or file permission issues must return informative error messages rather than crashing the HTTP server.

---

### Task 1: Backend API & Theme Engine Refresh Support

**Files:**
- Modify: `core/theme_engine.js`
- Modify: `studio/server.js`
- Test: `dev/tests/test_we_refresh_api.js`

- [ ] **Step 1: Write the failing API test in `dev/tests/test_we_refresh_api.js`**
  Verify that `GET /api/we/list?refresh=true` and `POST /api/we/refresh` exist, return status 200, return `{ success: true, count: number, items: array }`, and bypass the cache.

- [ ] **Step 2: Run the test to ensure it fails on unpatched endpoints**
  `node dev/tests/test_we_refresh_api.js`

- [ ] **Step 3: Update `core/theme_engine.js`**
  Modify `listWallpaperEngineWallpapers` to accept options object `{ search, limit, refresh }` or positional args, passing `refresh` to `scanWorkshopWallpapers({ search, refresh })`.

- [ ] **Step 4: Update `studio/server.js`**
  - In `GET /api/we/list`: Parse `parsedUrl.searchParams.get('refresh') === 'true'`.
  - Add `POST /api/we/refresh`: Calls `themeEngine.scanWorkshopWallpapers({ refresh: true })` and returns JSON.

- [ ] **Step 5: Run `node dev/tests/test_we_refresh_api.js` to ensure tests pass**

- [ ] **Step 6: Commit backend changes**
  `git add core/theme_engine.js studio/server.js dev/tests/test_we_refresh_api.js && git commit -m "feat(api): add refresh parameter and endpoint for wallpaper engine bridge"`

---

### Task 2: Frontend UI, Loading Animations, and Bilingual Localization

**Files:**
- Modify: `studio/public/index.html`
- Modify: `studio/public/style.css`
- Modify: `studio/public/app.js`
- Modify: `studio/public/i18n.js`

- [ ] **Step 1: Update `studio/public/i18n.js`**
  Add zh and en keys:
  - `we.refresh`: "刷新检测" / "Refresh & Scan"
  - `we.refresh_title`: "重新扫描并检测 Steam Wallpaper Engine 素材库" / "Rescan and detect Steam Wallpaper Engine library"
  - `we.refreshing`: "正在检测..." / "Scanning..."
  - `we.refresh_success`: "✓ 刷新检测完成，共发现 {count} 项素材" / "✓ Scan complete, found {count} wallpapers"
  - `we.refresh_empty`: "⚠️ 未检测到 Wallpaper Engine 创意工坊壁纸，请确认 Steam 已安装并订阅壁纸" / "⚠️ No wallpapers detected, please ensure Steam is running with subscribed items"
  - `modal.we_refresh`: "刷新检测" / "Refresh"
  - `modal.we_refresh_title`: "重新扫描检测素材库" / "Rescan & detect wallpapers"

- [ ] **Step 2: Update `studio/public/index.html`**
  - In `#view-we .page-header-actions`: Add `#btn-refresh-we` button with SVG reload icon and text.
  - In `#we-picker-modal .modal-title-wrap`: Add `#btn-refresh-we-picker` button next to `#we-picker-count`.

- [ ] **Step 3: Update `studio/public/style.css`**
  Add styles for `#btn-refresh-we`, `#btn-refresh-we-picker`, `.spin` rotation animation, and loading state styling.

- [ ] **Step 4: Update `studio/public/app.js`**
  - Extend `fetchWeList(forceRefresh = false)` to handle refresh query, toggle `.spin` animation on both buttons, update button disabled state, and trigger toasts.
  - Bind `onclick` on `#btn-refresh-we` and `#btn-refresh-we-picker`.
  - In `renderWeGallery()`, if `state.weList.length === 0`, render an action card containing a `#btn-we-empty-refresh` button.

- [ ] **Step 5: Verify via automated browser/CDP test or script**
  Test clicking the refresh buttons and verify DOM elements, loading state transitions, and toast appearance.

- [ ] **Step 6: Commit frontend changes**
  `git add studio/public/index.html studio/public/style.css studio/public/app.js studio/public/i18n.js && git commit -m "feat(ui): add in-app refresh & detect buttons with animations and i18n"`

---

### Task 3: Packaging, End-to-End Verification, and Documentation

**Files:**
- Modify: `README.md` & `README_EN.md` (if applicable)
- Verify: `AntigravityThemeStudio.exe` (compile via `dev\bin\build_exe.bat --no-pause`)

- [ ] **Step 1: Run full test suite**
  - `node dev/tests/test_we_refresh_api.js`
  - `node dev/tests/test_wallpaper_engine.js`
  - `node dev/tests/test_suite.js`

- [ ] **Step 2: Rebuild Studio executable**
  Run `cmd /c "cd /d C:\Users\Administrator\antigravity-theme && dev\bin\build_exe.bat --no-pause"`

- [ ] **Step 3: Commit release artifacts & push**
  `git commit -am "chore: rebuild studio executable with wallpaper engine refresh detection"`
  `git push origin main`
