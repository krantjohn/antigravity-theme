# 🌸 Antigravity Theme Customizer

<p align="center">
  <img src="dev/assets/previews/theme_showcase.gif" alt="Antigravity Theme Live Showcase" width="900" style="border-radius: 12px; box-shadow: 0 10px 35px rgba(0,0,0,0.25);" />
</p>

<p align="center">
  <a href="README_EN.md"><img src="https://img.shields.io/badge/Language-English-blue?style=flat-square" alt="English Documentation"></a>
  <a href="README.md"><img src="https://img.shields.io/badge/语言-简体中文-red?style=flat-square" alt="Chinese Documentation"></a>
  <a href="https://github.com/krantjohn/antigravity-theme/releases"><img src="https://img.shields.io/github/v/release/krantjohn/antigravity-theme?color=brightgreen&label=Release&style=flat-square" alt="GitHub Release"></a>
  <a href="https://github.com/krantjohn/antigravity-theme/releases/latest/download/AntigravityThemeStudio.exe"><img src="https://img.shields.io/badge/Download-.EXE%20(v3.1.0)-success?style=flat-square&logo=windows" alt="Download EXE"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square" alt="License: MIT"></a>
</p>
<p align="center">
  <img src="https://img.shields.io/badge/Platform-Windows%2010%20%2F%2011%20(x64)-0078D6?style=flat-square&logo=windows" alt="Windows 10/11 x64">
  <a href="https://www.electronjs.org/"><img src="https://img.shields.io/badge/Electron-33+-47848F?logo=electron&logoColor=white&style=flat-square" alt="Electron"></a>
  <a href="https://nodejs.org/"><img src="https://img.shields.io/badge/Node.js-v18+-339933?logo=node.js&logoColor=white&style=flat-square" alt="Node.js"></a>
  <img src="https://img.shields.io/badge/Steam-Wallpaper%20Engine-1b2838?style=flat-square&logo=steam" alt="Steam Wallpaper Engine">
  <img src="https://img.shields.io/badge/Tests-31%2F31%20Passing%20(100%25)-brightgreen?style=flat-square&logo=checkmarx" alt="Tests 31/31 Passing">
  <img src="https://img.shields.io/badge/Latency-~0.35ms%20Input%20Lag-success?style=flat-square" alt="Keystroke Latency">
</p>
<p align="center">
  <img src="https://img.shields.io/badge/UI-Dark%20%26%20Light%20Modes-orange?style=flat-square" alt="Dark and Light Theme">
  <img src="https://img.shields.io/badge/i18n-CN%20%2F%20EN%20Bilingual-blueviolet?style=flat-square" alt="i18n Bilingual">
  <a href="https://github.com/krantjohn/antigravity-theme/pulls"><img src="https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat-square" alt="PRs Welcome"></a>
  <a href="https://github.com/krantjohn/antigravity-theme/stargazers"><img src="https://img.shields.io/github/stars/krantjohn/antigravity-theme?style=social" alt="GitHub Stars"></a>
  <a href="https://github.com/krantjohn/antigravity-theme/network/members"><img src="https://img.shields.io/github/forks/krantjohn/antigravity-theme?style=social" alt="GitHub Forks"></a>
</p>

<p align="center">
  <b>Give your Google Antigravity desktop client a breathtaking modern aesthetic makeover!</b><br>
  A high-performance, full-transparency, 5-slot immersive theme engine crafted specifically for Google Antigravity.<br>
  <i>Featuring 60FPS video wallpaper streaming, Steam Wallpaper Engine direct integration, sub-millisecond input response, Dark/Light dual themes, and 1-click factory-grade pristine restoration.</i>
</p>

---

## 🏷️ Repository Tags & Technical Features (Tags & Topics)

`antigravity` `wallpaper-engine` `steam-workshop` `theme-customizer` `electron` `chromium` `webview2` `c-sharp` `hardware-acceleration` `video-streaming` `rfc7233` `dark-mode` `light-mode` `bilingual-i18n` `performance-tuning` `zero-latency` `mit-license`

| Category | Tags | Feature & Architecture Highlights |
| :--- | :--- | :--- |
| **Host Application** | `Google Antigravity` `Electron 33+` `Chromium` | Non-intrusive runtime patch architecture crafted for Google Antigravity |
| **Streaming & Speed** | `RFC 7233` `HTTP 206` `GPU Decoding` `0.35ms Latency` | 60FPS hardware-accelerated video streaming, drag-resize decoupling, ~0.35ms typing latency |
| **Ecosystem** | `Steam` `Wallpaper Engine` `Workshop (AppID 431960)` | Cross-drive auto-detection of subscribed items: video, web/Live2D, and high-res art |
| **GUI Workspace** | `AntigravityThemeStudio.exe` `C# .NET` `WebView2` `Bento UI` | Single-file portable desktop container with 1:1 real-time live mockup preview |
| **Aesthetic Design** | `Dark Theme` `Light Theme` `Adaptive Typography` `5-Slots` | Dark & Light dual theme system, contrast-adaptive font glow engine, 5 independent slots |
| **Safety & Privacy** | `app.asar.orig.bak` `Localhost Only` `100% Reversible` `MIT` | Physical factory backup of stock ASAR, 100% loopback operation without cloud telemetry |

---

## 🌟 Core Features & Design Advantages

Traditional client customization solutions often degrade performance or break upon application updates. Antigravity Theme Customizer provides a rock-solid, production-grade customization framework:

| Dimension | Conventional Customization | 🌸 Antigravity Theme Customizer (v3.1.0) |
| :--- | :--- | :--- |
| **Live Video Streaming** | Static images only; videos freeze the UI | **Built-in RFC 7233 Media Microservice**: HTTP 206 partial content streaming, 60FPS hardware acceleration |
| **Resize & Drag Smoothness**| Window resizing and panel splitter dragging stutter | **Drag & Resize Decoupling**: Decoder contention suspended during dragging, auto-resumes smoothly in 80ms |
| **Typing Latency** | Full-tree DOM MutationObservers cause keystroke lag | **Sub-Millisecond Keystroke Latency**: Precise input node skipping, reducing typing latency to **~0.35ms** |
| **Wallpaper Sourcing** | Manual downloading, cropping, and conversion | **Steam Wallpaper Engine Direct Integration**: Automatic multi-drive scanning of subscribed workshop items |
| **Font Legibility** | Text unreadable over light/vibrant wallpapers | **Adaptive Contrast Font Engine**: 6 built-in anti-glare glow presets or any custom Hex with auto-shadow |
| **Color Schemes** | Monolithic dark mode only | **Dark & Light Dual Themes**: Toggle effortlessly between sleek Dark Geek and clean Light aesthetic |
| **Multi-Zone Isolation** | One background applied everywhere | **5 Independent Wallpaper Slots**: Main Chat, PowerShell Terminal, Conversations Drawer, Input Box, Settings |
| **Configuration Vault** | Easily lose past theme configurations | **Preset Archiver Vault**: Archives configurations + media into standalone presets with 0.3s hot reload |
| **Update Safe & Reversible**| Application updates break theme modifications | **Physical Factory Backup (`app.asar.orig.bak`)**: Complete physical backup with 1-click factory restoration |

---

## 📸 Visual Showcase

### 1. Antigravity Live Client Running (Multi-Panel Synergy & 1:1 Input Card Tracking)
<p align="center">
  <img src="dev/assets/previews/antigravity_live_workbench.png" alt="Antigravity Live Client" width="880" style="border-radius: 12px; box-shadow: 0 10px 35px rgba(0,0,0,0.3);" />
  <br>
  <em>✨ Live 3-Panel Setup: Panoramic AI Chat Wallpaper + Independent PowerShell Terminal Artwork + Floating 1:1 Dynamic Input Bar Video Card</em>
</p>

### 2. Antigravity Theme Studio Modern GUI (Dark & Light Dual Theme System)

| 🌙 Sleek Dark Theme | ☀️ Clean Light Theme |
| :---: | :---: |
| <img src="dev/assets/previews/theme_studio_dark.png" alt="Theme Studio Dark Mode" width="440" style="border-radius: 8px;" /> | <img src="dev/assets/previews/theme_studio_light.png" alt="Theme Studio Light Mode" width="440" style="border-radius: 8px;" /> |
| <b>1:1 Real-time Interactive Mockup · Dark High Contrast</b> | <b>Pure & Elegant Bright Aesthetic · 1-Click Smooth Toggle</b> |

### 3. Steam Workshop Cross-Drive Browser & Preset Vault

| 🎮 Steam Wallpaper Engine Workshop Grid | 🗂️ Presets Vault with 1-Click Instant Switching |
| :---: | :---: |
| <img src="dev/assets/previews/theme_studio_workshop.png" alt="Steam Workshop Grid" width="440" style="border-radius: 8px;" /> | <img src="dev/assets/previews/theme_studio_presets.png" alt="Presets Vault" width="440" style="border-radius: 8px;" /> |
| <b>Auto-scans subscribed wallpapers across all Steam drives</b> | <b>Full configuration & asset archiving with 0.3s hot reload</b> |

---

## 🧩 5-Slot Architecture (Mental Model)

Through precise DOM isolation and CSS penetration, Antigravity is partitioned into 5 independent visual zones:

```text
┌────────────────────────────────────────────────────────────────────────┐
│ [Top Menu] Antigravity   File   View   Window             [— ▢ ✕]      │
├───────────────┬──────────────────────────┬─────────────────────────────┤
│               │                          │                             │
│  [Left Slot]  │       [Mid Slot]         │        [Right Slot]         │
│               │                          │                             │
│  AI Main Chat │   PowerShell Terminal    │    Conversations Drawer     │
│ (Global Base) │   (.terminal.xterm)      │                             │
│               │                          │                             │
├───────────────┴──────────────────────────┴─────────────────────────────┤
│                 [Bottom Slot]: Floating Prompt Input Card              │
└────────────────────────────────────────────────────────────────────────┘
  [Settings Slot]: Settings Dialog Backdrop Illustration
```

| Slot | Identifier | Target Area | Recommended Media | Purpose & Behavior |
| :---: | :---: | :--- | :---: | :--- |
| **`Left`** | `left` | **Global Main Chat** | 1080P/2K/4K Video (.mp4) | Panoramic foundation behind the chat feed, showing through frosted glass |
| **`Mid`** | `mid` | **Active Terminal** | Video / High-Res Art | Dedicated backdrop for PowerShell / Bash coding sessions |
| **`Right`** | `right` | **Conversations Drawer** | Vertical Art / Video | Independent background shown when opening conversation list drawer |
| **`Bottom`**| `bottom` | **Prompt Input Box** | Close-up / GIF / Loop | Card background inside the prompt area, dynamically resizing with input height |
| **`Settings`**|`settings`| **Settings Dialog** | Illustration (.png/.jpg) | Displayed inside the settings dialog |

---

## 🚀 Quick Start

### Prerequisites
- **Operating System**: Windows 10 / 11 (64-bit)
- **Runtime**: [Node.js](https://nodejs.org/) (Recommended LTS v18+)
- **Target Application**: Google [Antigravity](https://antigravity.google/) (compatible with latest release)

---

### Option 1: Using Theme Studio GUI (Strongly Recommended)

#### A. Download Pre-compiled Binary from GitHub Releases (Zero Setup)
1. Visit the **[Releases Page](https://github.com/krantjohn/antigravity-theme/releases)** and download `AntigravityThemeStudio.exe`;
2. Run it directly anywhere to enjoy the 1:1 real-time preview, drag-and-drop wallpaper importing, and instant hot reload.

#### B. Run Directly from Source (Pure Open-Source, Zero Binary Dependency)
If you prefer not running external executables, launch directly from source:
```bash
# 1. Clone repository
git clone https://github.com/krantjohn/antigravity-theme.git
cd antigravity-theme

# 2. Launch Theme Studio GUI
node studio/launcher.js
# Or run shortcut script: dev\bin\start_studio.bat
```
Your default browser will launch `Theme Studio` in clean frameless app mode.

---

### Option 2: Command-Line Interface (CLI Commands)

All operations can be executed via terminal commands with instant **0.3s hot reload** via CDP:

#### 1. Steam Wallpaper Engine Integration
```bash
# List all subscribed Wallpaper Engine items
node core/theme_engine.js --list-we

# Search workshop items by keyword
node core/theme_engine.js --list-we "Anime"

# Apply workshop item by index to the Left slot
node core/theme_engine.js --swap-we 2 left

# Apply workshop item by ID to the Terminal slot
node core/theme_engine.js --swap-we 3164111930 mid
```

#### 2. Local File Swapping (Videos & Images)
```bash
# Set Left slot (Global base) to local video
node core/theme_engine.js --swap "left" "D:\Media\my_wallpaper.mp4"

# Set Mid slot (Terminal) to local static image
node core/theme_engine.js --swap "mid" "D:\Pictures\terminal_art.png"

# Inspect current 5-slot status
node core/theme_engine.js --status
```

#### 3. Adaptive Typography Tuning
```bash
# List built-in high-contrast presets
node core/theme_engine.js --list-font-colors

# Switch to Obsidian Black (ideal for light/white wallpapers)
node core/theme_engine.js --font obsidian-black

# Switch to Pure White, Sakura Pink, or Cyber Cyan
node core/theme_engine.js --font pure-white

# Use custom Hex color with auto-luminance shadow calculation
node core/theme_engine.js --font "#ff79c6"
```

#### 4. Preset Management
```bash
# Save current 5-slot setup as a named preset
node core/theme_engine.js --save-preset "Cyberpunk" "4K Rain City Neon"

# 1-Click apply preset with 0.3s instant hot reload
node core/theme_engine.js --apply-preset "Cyberpunk"

# List all archived presets
node core/theme_engine.js --list-presets
```

---

## ⚙️ Core Architecture & Technical Implementation

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                             Electron Host Process                           │
│  [main.js] Launches CDP 8314 Port ──spawns──> [media_server.js] (Port 8315) │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ HTTP 206 Streaming / CSS Hot Reload
┌──────────────────────────────────────▼──────────────────────────────────────┐
│                            Chromium Renderer Interface                       │
│  [preload.js] 0ms Poster Fallback ──mounts──> <video data-slot="...">       │
│  [IntersectionObserver] Smart Dormancy ──> Pause when hidden (Save GPU/VRAM)│
│  [Drag & Resize Decoupling] Window Decoupling ──> Free DWM during resize    │
│  [MutationObserver Filtering] ───> Skip text input, latency drop to ~0.35ms │
│  [custom_theme.css] Penetration Styles ──> Frosted glass, glow text, Z-Index│
└─────────────────────────────────────────────────────────────────────────────┘
```

1. **RFC 7233 Media Microservice (`core/media_server.js`)**:
   - Listens on `127.0.0.1:8315`, natively supporting HTTP 206 Partial Content byte-range delivery;
   - Equipped with a 200-capacity LRU file path cache and 3-second TTL state cache to eliminate disk I/O bottlenecks;
   - Manages connection keep-alive lifecycles to prevent socket handle leaks during video element swapping.
2. **Window Resize & Splitter Dragging Decoupling**:
   - Eliminates window edge stutter and splitter dragging freezes by decoupling video rendering and UI reflow via `window.__isResizing` and `window.__isDraggingSplit` state locks;
   - Decoder contention is suspended during dragging and smoothly resumes in **80ms** once mouse interaction ceases;
   - Disables iframe pointer events during drag actions to prevent cursor loss or dropped frames.
3. **Sub-Millisecond Keystroke Latency**:
   - Standard injectors observe the entire DOM tree, causing >15ms input lag on every keystroke;
   - Our engine filters out `<input>`, `<textarea>`, `[role="textbox"]`, and `[contenteditable]` elements, reducing typing latency to **~0.35ms** and scroll latency to **~0.048ms**.
4. **Smart GPU Viewport Dormancy**:
   - Decoders pause automatically whenever panels collapse, terminal tabs switch, or the application minimizes, keeping GPU/VRAM footprint near zero.
5. **Controlled Update Shielding (`core/auto_patcher.js`)**:
   - Takes control of `electron-updater` to prevent sudden silent background updates from overwriting themes, while preserving the manual update verification flow in the menu bar.

---

## 🧪 Automated Test Suite (31 Tests Passing)

Antigravity Theme Customizer features a comprehensive 31-point end-to-end regression test suite:

- **Core & Wallpaper Engine Suite** ([`dev/tests/test_suite.js`](dev/tests/test_suite.js)): **17 / 17 PASS**
  - Slot aliases, media server HTTP 206 responsiveness, multi-slot mounting, backward compatibility, single-instance isolation.
- **Steam Wallpaper Engine Suite** ([`dev/tests/test_wallpaper_engine.js`](dev/tests/test_wallpaper_engine.js)): **14 / 14 PASS**
  - Multi-drive scanning, workshop JSON/VDF parsing, web/Live2D fallback handling, index consistency, factory baseline rollback.

```bash
# Run all 31 automated tests
node dev/tests/test_suite.js
node dev/tests/test_wallpaper_engine.js
```

---

## 🛡️ Security Principles & Clean Uninstallation

This project adheres to strict open-source principles:

### 1. Physical Backup & Zero Telemetry
- **Automatic Original Backup**: Before patching, the system creates an untouched physical backup of the original `app.asar` as `app.asar.orig.bak`;
- **100% Localhost Operation**: All media streaming and style rendering run exclusively on loopback address (`127.0.0.1`). **No network telemetry, no proxying, and zero access to your Google account tokens or API traffic**;
- **Fully Auditable**: All patch scripts (`auto_patcher.js`, `theme_engine.js`, `preload.js`) are plain, auditable JavaScript.

### 2. Complete Factory Uninstallation
To restore Antigravity to pristine factory state:
- **CLI Method**:
  ```bash
  node core/theme_engine.js --restore-original
  ```
- **Physical Restore Script**:
  Run **`dev/bin/uninstall_completely.bat`** to replace `app.asar` with `app.asar.orig.bak`, returning Antigravity to 100% untouched stock state.

---

## 📂 Project Structure

```text
antigravity-theme/
├── 📂 core/                       # Core engine and streaming microservices
│   ├── theme_engine.js            # Style compiler, 5-slot controller, CDP hot reload
│   ├── wallpaper_engine_bridge.js # Steam library discovery and VDF/JSON parser
│   ├── media_server.js            # RFC 7233 HTTP Range 206 streaming microservice
│   ├── auto_patcher.js            # ASAR extract/pack and patch injection engine
│   └── preload.js                 # Renderer injection layer (video mounting, dormancy)
├── 📂 studio/                     # Theme Studio visual webapp
│   ├── launcher.js                # Viewport manager & launcher daemon
│   ├── server.js                  # Local HTTP API microservice (port 8316)
│   ├── public/                    # 1:1 Live mockup preview, workshop grid, presets UI, bilingual i18n
│   └── src/                       # Native C# GUI launcher source (AntigravityThemeStudio)
├── 📂 wallpapers/                 # Default template artwork and placeholder assets
├── 📂 dev/                        # 🛠️ Developer utilities and test suites
│   ├── bin/                       # Batch script toolset (install, swap, restore, etc.)
│   ├── scripts/                   # Diagnostic, benchmark, and maintenance tools
│   ├── tests/                     # 31-point regression and E2E test suites
│   ├── docs/                      # Architectural specifications and notes
│   └── assets/                    # Showcase GIF and documentation screenshots
├── AntigravityThemeStudio.exe     # Native x64 single-file executable client
├── LICENSE                        # MIT Open Source License
├── README.md                      # Chinese Documentation (中文文档)
└── README_EN.md                   # English Documentation
```

---

## 💡 Frequently Asked Questions (FAQ)

<details>
<summary><b>Q1: What happens when Google Antigravity releases an official update?</b></summary>
Your wallpapers and saved presets are stored in your user profile directory (<code>~/.gemini/antigravity/</code>) and <b>will never be overwritten by application updates</b>.<br>
After an update, simply run <code>node studio/launcher.js</code> or <code>dev/bin/install.bat</code> once to re-apply the non-intrusive styling layer.
</details>

<details>
<summary><b>Q2: Does video wallpaper streaming cause high CPU/GPU usage?</b></summary>
No. The engine leverages Chromium's underlying D3D11 hardware acceleration combined with our "Smart Viewport Dormancy" and "Drag-Resize Decoupling". When panels collapse, the window is minimized, or borders are being resized, video decoders suspend automatically, keeping GPU and CPU consumption near zero.
</details>

<details>
<summary><b>Q3: What if bright/light wallpapers make text hard to read?</b></summary>
In Theme Studio, select the <code>[Obsidian Black]</code> typography preset (or run <code>node core/theme_engine.js --font obsidian-black</code>). Text will automatically gain an anti-glare high-contrast finish with subtle luminous halos, staying crisp and readable even against pure white backdrops.
</details>

<details>
<summary><b>Q4: How do I completely uninstall and restore factory state?</b></summary>
Run <code>dev/bin/uninstall_completely.bat</code> (or click "Restore Factory Clean Mode" in Theme Studio). The original <code>app.asar.orig.bak</code> physical file will be cleanly restored, bringing Antigravity back to 100% stock official condition.
</details>

---

## 📜 Copyright & Disclaimer

- Distributed under the [MIT License](LICENSE).
- Bundled sample artwork is provided solely for dimension benchmarking and initial demonstration purposes. All original artwork copyrights belong to their respective creators and copyright holders (such as Yostar / NEXON Games).
- Users are encouraged to import their own personalized wallpapers or link directly via the built-in Steam Wallpaper Engine integration.

---

## 🤝 Contributing

Contributions, issues, and pull requests are warmly welcomed!
If this project makes your daily Antigravity development workflow more inspiring and enjoyable, consider leaving a ⭐️ **Star** on GitHub!
