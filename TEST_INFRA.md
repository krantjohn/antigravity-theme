# Antigravity Theme Engine — Test Infrastructure Guide (`TEST_INFRA.md`)

## 1. Overview & Architecture

The **Antigravity Theme Engine Test Infrastructure** provides automated end-to-end (E2E), integration, and unit verification for the Pure 3-Target Theme Engine. It validates that customization conforms strictly to the 3 designated wallpaper targets (`left`, `bottom`, `settings`), enforces 100% transparent inheritance for intermediate containers (`mid`, `right`), purges non-wallpaper styling artifacts, and guarantees zero-diff restoration to vanilla Antigravity.

```
       +-------------------------------------------------------------+
       |                  dev/tests/run_all.js                       |
       |                   Master Test Runner                        |
       +-----------------------------+-------------------------------+
                                     |
             +-----------------------+-----------------------+
             |                                               |
+------------v--------------------+            +-------------v---------------------+
| Modernized Unit & Integration   |            | 4-Tier E2E Specification Suites   |
|   • test_slot_vanilla.js        |            |   • tier1_feature_coverage.js     |
|   • test_seamless_swap.js       |            |   • tier2_boundary_corner.js      |
|   • test_studio_api.js          |            |   • tier3_combinations.js         |
|   • test_studio_v3.js           |            |   • tier4_real_world.js           |
|   • test_wallpaper_engine.js    |            +-----------------------------------+
|   • test_suite.js (17 Phases)   |
+---------------------------------+
             |                                               |
             +-----------------------+-----------------------+
                                     |
             +-----------------------v-----------------------+
             |            dev/tests/e2e/e2e_helper.js        |
             |       Session Isolation & Shared Primitives   |
             +-----------------------+-----------------------+
                                     |
       +-----------------------------+-------------------------------+
       |                             |                               |
+------v--------+             +------v--------+             +--------v------+
| Chromium CDP  |             | Media Server  |             | Studio REST   |
| Port: 8314    |             | Port: 8315    |             | Port: 8316    |
| (Live DOM)    |             | (HTTP 206)    |             | (Fastify)     |
+---------------+             +---------------+             +---------------+
```

---

## 2. Environment Ports & Communication Channels

| Port | Service | Purpose | Protocol / Endpoints |
|---|---|---|---|
| **8314** | `Antigravity.exe` Chromium DevTools Protocol | Real-time DOM inspection, CSS injection validation, style property verification | HTTP `/json` target discovery, WebSocket `ws://127.0.0.1:8314/devtools/page/...` |
| **8315** | Antigravity Media Server | Local asset serving for wallpaper videos and high-res images | HTTP 1.1 / 206 Partial Content (Range requests) |
| **8316** | Antigravity Studio Server | Web interface & REST API for live theme preview and drafting | HTTP REST (`/api/status`, `/api/slots`, `/api/draft/*`, `/api/assets`) |

> **Critical Safety Constraint**: Under no circumstances should test runs kill or terminate `Antigravity.exe` or disrupt ports 8314 and 8315.

---

## 3. Directory Layout & Test Suite Hierarchy

```
antigravity-theme/
├── dev/
│   └── tests/
│       ├── run_all.js                  # Master test runner orchestrating all 10 suites
│       ├── test_slot_vanilla.js        # Vanilla mode & per-slot restore verification
│       ├── test_seamless_swap.js       # Atomic zero-flicker wallpaper transition
│       ├── test_studio_api.js          # Studio REST API endpoints & payload contracts
│       ├── test_studio_v3.js           # Studio Bento UI & preview state validation
│       ├── test_wallpaper_engine.js    # Wallpaper Engine project & WE bridge tests
│       ├── test_suite.js               # 17-Phase Master Integration Suite
│       └── e2e/
│           ├── e2e_helper.js           # Shared test harness (CDP, isolation, HTTP)
│           ├── tier1_feature_coverage.test.js  # Feature Coverage (F1–F5, 26 tests)
│           ├── tier2_boundary_corner.test.js   # Corner & Stress Cases (T2.1–T2.20, 20 tests)
│           ├── tier3_combinations.test.js      # Matrix & Combinations (T3.1–T3.13, 13 tests)
│           └── tier4_real_world.test.js        # User Lifecycle & Live CDP (T4.1–T4.5, 5 tests)
```

---

## 4. Test Harness Primitives (`dev/tests/e2e/e2e_helper.js`)

The E2E helper guarantees isolation, deterministic cleanup, and robust error recovery:

- **`createSessionBackup()`**: Captures a snapshot of `slots.json` and active CSS state prior to execution. Provides `.restore()` in a `try...finally` block to guarantee the user's workspace returns to exact pre-test state.
- **`evalCdp(expression)`**: Evaluates JavaScript expressions directly inside the Antigravity main window via Chromium DevTools Protocol (`Runtime.evaluate` with `returnByValue: true`).
- **`sendCdpCommand(method, params)`**: Sends low-level CDP commands (e.g., `CSS.getComputedStyleForNode`, `Emulation.setDeviceMetricsOverride`).
- **`httpRequest(url, options)`**: Promise-based HTTP client for verifying REST endpoints and streaming headers (`Accept-Ranges`, `Content-Range`, `Content-Length`).
- **`startTestStudio(port)`**: Ephemerally spawns the Studio server on an isolated test port and shuts it down cleanly when tests complete.

---

## 5. Execution Instructions

### Running the Entire Suite
To run all 10 test suites (Unit, Integration, and Tiers 1–4):
```powershell
cd C:\Users\Administrator\antigravity-theme
node dev/tests/run_all.js
```

### Running Individual Test Suites
```powershell
# Tier 1: Feature Coverage (26 tests)
node dev/tests/e2e/tier1_feature_coverage.test.js

# Tier 2: Boundary & Corner Cases (20 tests)
node dev/tests/e2e/tier2_boundary_corner.test.js

# Tier 3: Cross-Feature Combinations (13 tests)
node dev/tests/e2e/tier3_combinations.test.js

# Tier 4: Real-World Scenarios (5 tests)
node dev/tests/e2e/tier4_real_world.test.js

# 17-Phase Master Integration Suite
node dev/tests/test_suite.js

# Slot Vanilla Restore
node dev/tests/test_slot_vanilla.js

# Studio REST API
node dev/tests/test_studio_api.js
```

---

## 6. Verification Criteria & Assertion Policies

1. **Target Slot Exclusivity**:
   - Only `left`, `bottom`, and `settings` are recognized as configurable wallpaper targets.
   - Any legacy keys (`mid`, `right`, `terminal`, `drawer`) are automatically normalized or rejected.
2. **Transparency Guarantee**:
   - Terminal and auxiliary chat containers (`mid`, `right`) have `background: transparent !important` applied in injected CSS.
   - Live CDP computed style audits verify effective transparency in the rendered view.
3. **Non-Wallpaper Purge**:
   - Font preset rules, font color modifications, and pink accent overrides (`244, 114, 182`) are completely purged from generated CSS.
4. **Zero-Diff Vanilla Mode**:
   - Calling `restoreVanilla()` resets `slots.json` to `{ isOriginal: true, slots: { left: { type: 'none' }, bottom: { type: 'none' }, settings: { type: 'none' } } }`.
   - Injected custom styles are wiped clean (`css === ''`), leaving original Antigravity styles 100% untouched.
