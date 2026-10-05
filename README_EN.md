# 🌸 Antigravity Theme Customizer

<p align="center">
  <img src="dev/assets/previews/theme_showcase.gif" alt="Antigravity Theme Live Showcase" width="880" style="border-radius: 12px; box-shadow: 0 10px 35px rgba(0,0,0,0.25);" />
</p>

<p align="center">
  <a href="README_EN.md"><img src="https://img.shields.io/badge/Language-English-blue?style=flat-square" alt="English Documentation"></a>
  <a href="README.md"><img src="https://img.shields.io/badge/语言-简体中文-red?style=flat-square" alt="Chinese Documentation"></a>
  <a href="https://github.com/krantjohn/antigravity-theme/releases"><img src="https://img.shields.io/github/v/release/krantjohn/antigravity-theme?color=brightgreen&label=Release&style=flat-square" alt="GitHub Release"></a>
  <a href="https://nodejs.org/"><img src="https://img.shields.io/badge/Node.js-v16+-339933?logo=node.js&logoColor=white&style=flat-square" alt="Node.js"></a>
  <a href="https://www.electronjs.org/"><img src="https://img.shields.io/badge/Electron-33+-47848F?logo=electron&logoColor=white&style=flat-square" alt="Electron"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square" alt="License: MIT"></a>
  <a href="https://github.com/krantjohn/antigravity-theme/stargazers"><img src="https://img.shields.io/github/stars/krantjohn/antigravity-theme?style=social" alt="GitHub Stars"></a>
</p>

<p align="center">
  <b>Give your Google Antigravity desktop client a stunning anime aesthetic makeover!</b><br>
  A high-performance, full-transparency, 5-slot immersive theme engine designed for Google Antigravity.<br>
  <i>Features 60FPS video wallpaper streaming, Steam Wallpaper Engine direct integration, adaptive anti-glare typography, and 1-click preset switching.</i>
</p>

---

## 🌟 Core Features & Highlights

The default official client interface is plain and monochromatic. Antigravity Theme Customizer provides a complete, lightweight, and non-intrusive customization solution:

| Feature | Conventional Methods | 🌸 Antigravity Theme Customizer |
| :--- | :--- | :--- |
| **Live Video Wallpapers** | Static images only; videos freeze the UI | **Built-in RFC 7233 Media Microservice**: HTTP 206 chunked streaming, butter-smooth 60FPS playback |
| **GPU & Memory Management** | Decodes full-time in background; high VRAM usage | **Smart Viewport Dormancy**: Decoders pause automatically when panels collapse or window is minimized |
| **Wallpaper Sourcing** | Manual searching, cropping, and format conversion | **Steam Wallpaper Engine Direct Integration**: Automatically scans subscribed items across drives |
| **Font Legibility** | Text unreadable over light/vibrant wallpapers | **Adaptive Contrast Font Engine**: 6 built-in anti-glare glow presets or any custom Hex color with auto-shadow |
| **Independent Multi-Zone** | One image for everything; panels conflict | **5 Independent Wallpaper Slots**: Main Chat, PowerShell Terminal, Conversations Drawer, Input Box, Settings |
| **Preset Management** | Easy to lose track of previous asset configurations | **Full Asset Preset Archiver**: Archives configurations + media into standalone presets with 0.3s hot reload |
| **Update Safe & Reversible**| Updates wipe theme modifications completely | **Physical Factory Backup (`app.asar.orig.bak`)**: Complete physical safety with 1-click factory restoration |

---

## 📸 Visual Showcase

| Soft Sakura Pink (Default) | Makima Gesture Dark (Custom) | Three-Panel Multi-Tasking Workflow |
| :---: | :---: | :---: |
| <img src="dev/assets/previews/mika_theme_overview.png" width="280" /> | <img src="dev/assets/previews/makima_wallpaper_demo.png" width="280" /> | <img src="dev/assets/previews/multi_panel_flow_demo.png" width="280" /> |

<p align="center">
  <img src="dev/assets/previews/multi_panel_flow_demo.png" alt="Multi-Panel Workflow Showcase" width="880" style="border-radius: 12px; box-shadow: 0 10px 35px rgba(0,0,0,0.15);" />
  <br>
  <em>✨ Real Multi-Panel Synergy: Left AI Conversation (Panoramic Base) + Center PowerShell (Dedicated Terminal Wallpaper) + Right Drawer (Independent Sidebar Artwork)</em>
</p>

---

## 🧩 5-Slot Architecture (Mental Model)

Through precise DOM isolation and CSS injection, Antigravity is partitioned into 5 independent visual slots:

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

| Slot | Identifier | UI Target | Recommended Media | Purpose |
| :---: | :---: | :--- | :---: | :--- |
| **`Left`** | `left` | **Global Main Chat** | 1080P/2K/4K Video (.mp4) | Panoramic transparent base behind the conversation feed |
| **`Mid`** | `mid` | **Active Terminal** | Video / High-Res Art | Dedicated backdrop for PowerShell / Bash coding sessions |
| **`Right`** | `right` | **Conversations Drawer** | Vertical Portrait / Scene | Independent background shown when opening conversation list |
| **`Bottom`**| `bottom` | **Prompt Input Box** | Anime close-up / Subtle Loop| Background card inside the prompt text area |
| **`Settings`**|`settings`| **Settings Dialog** | Illustration (.png/.jpg) | Displayed when opening Settings dialog |

---

## 🚀 Quick Start

### Prerequisites
- **Operating System**: Windows 10 / 11 (64-bit)
- **Runtime**: [Node.js](https://nodejs.org/) (Recommended LTS v18+)
- **Target Application**: Google [Antigravity](https://antigravity.google/) (compatible with latest release)

---

### Option 1: Using Theme Studio GUI (Recommended)

#### A. Download Pre-compiled Binary from GitHub Releases
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

### Option 2: Command-Line Interface (CLI)

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
│   ├── public/                    # 1:1 Live mockup preview, workshop grid, presets UI
│   └── src/                       # Native C# GUI launcher source (AntigravityThemeStudio)
├── 📂 wallpapers/                 # Default template artwork and placeholder assets
├── 📂 dev/                        # 🛠️ Developer utilities and test suites
│   ├── bin/                       # Batch script toolset (install, swap, restore, etc.)
│   ├── scripts/                   # Diagnostic, benchmark, and maintenance tools
│   ├── tests/                     # 17-point regression and E2E test suites
│   ├── docs/                      # Architectural specifications and notes
│   └── assets/                    # Showcase GIF and documentation screenshots
├── LICENSE                        # MIT Open Source License
├── README.md                      # Documentation (Chinese)
└── README_EN.md                   # Documentation (English)
```

---

## 📜 Copyright & Disclaimer

- Distributed under the [MIT License](LICENSE).
- Bundled sample artwork is provided solely for dimension benchmarking and initial demonstration purposes. All original artwork copyrights belong to their respective creators and copyright holders (such as Yostar / NEXON Games).
- Users are encouraged to import their own personalized wallpapers or link directly via the built-in Steam Wallpaper Engine integration.

---

## 🤝 Contributing

Contributions, feedback, and pull requests are warmly welcomed!
If this project makes your daily coding experience more enjoyable, consider leaving a ⭐️ **Star** on GitHub!
