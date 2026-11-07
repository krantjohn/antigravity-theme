# 🌸 Antigravity Theme Customizer

<p align="center">
  <img src="dev/assets/previews/theme_preview.jpg" alt="Antigravity Theme Preview" width="920" style="border-radius: 12px; box-shadow: 0 10px 35px rgba(0,0,0,0.25);" />
</p>

<p align="center">
  <a href="README.md"><img src="https://img.shields.io/badge/语言-简体中文-red?style=flat-square" alt="Chinese Documentation"></a>
  <a href="README_EN.md"><img src="https://img.shields.io/badge/Language-English-blue?style=flat-square" alt="English Documentation"></a>
  <a href="https://github.com/krantjohn/antigravity-theme/releases"><img src="https://img.shields.io/badge/Release-v4.0.0-brightgreen?style=flat-square" alt="Release v4.0.0"></a>
  <a href="https://github.com/krantjohn/antigravity-theme/releases/latest/download/AntigravityThemeStudio.exe"><img src="https://img.shields.io/badge/Download-.EXE%20(v4.0.0)-success?style=flat-square&logo=windows" alt="Download EXE"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square" alt="License: MIT"></a>
</p>
<p align="center">
  <img src="https://img.shields.io/badge/Platform-Windows%2010%20%2F%2011%20(x64)-0078D6?style=flat-square&logo=windows" alt="Windows 10/11 x64">
  <a href="https://www.electronjs.org/"><img src="https://img.shields.io/badge/Electron-33+-47848F?logo=electron&logoColor=white&style=flat-square" alt="Electron"></a>
  <a href="https://nodejs.org/"><img src="https://img.shields.io/badge/Node.js-v18+-339933?logo=node.js&logoColor=white&style=flat-square" alt="Node.js"></a>
  <img src="https://img.shields.io/badge/Steam-Wallpaper%20Engine-1b2838?style=flat-square&logo=steam" alt="Steam Wallpaper Engine">
  <img src="https://img.shields.io/badge/Latency-~0.35ms%20Input%20Lag-success?style=flat-square" alt="Keystroke Latency">
  <img src="https://img.shields.io/badge/Startup-%3C600ms%20Cold%20Start-brightgreen?style=flat-square" alt="Startup Speed">
  <a href="https://github.com/krantjohn/antigravity-theme/stargazers"><img src="https://img.shields.io/github/stars/krantjohn/antigravity-theme?style=social" alt="GitHub Stars"></a>
</p>

<p align="center">
  <b>Give your Google Antigravity desktop client a breathtaking modern aesthetic makeover!</b><br>
  A high-performance, full-bleed theme customization and Chinese localization engine crafted specifically for Google Antigravity.<br>
  <i>Featuring 60FPS video wallpaper streaming, Steam Wallpaper Engine direct integration, novel "Liquid Glass" input styling, full Chinese localization, sub-millisecond typing latency, and 1-click factory-grade pristine restoration.</i>
</p>

---

## ✨ Key Features

- 🌸 **60FPS Video Streaming & 4K Still Artwork**: Built-in RFC 7233 microservice (HTTP 206 chunked range streaming) ensuring `100vw × 100vh` zero-distortion true full-bleed canvas with adjustable 0%~100% dark eye-care mask.
- 💎 **Exclusive "Liquid Glass" Input Box**: High-transparency frosted fluid texture with specular rim highlights, keeping background artwork fully visible with crystal clarity.
- 🌐 **Built-in Full Chinese Localization (i18n)**: Seamless 1-click toggle between Simplified Chinese (CN 🇨🇳) and English (EN 🇺🇸), covering deep menus, conversation actions, settings, and status bars with persistence across reboots.
- 🧩 **5-Slot Decoupled Architecture**: Independent controls for main canvas (`left`), input box (`bottom`), settings modal (`settings`), sidebar (`sidebar`), and header (`header`), featuring native dark shielding to permanently eliminate text collision bugs.
- 🎮 **Steam Wallpaper Engine Direct Link**: Automatically indexes subscribed workshop items (AppID `431960`) across all Windows drives, applying MP4/WebM videos and images with 1 click.
- ⚡ **Ultra-Fast Startup & GPU Viewport Sleep**: Client cold startup accelerated to `<600ms`, keystroke latency reduced to `~0.35ms`; hardware video decoding suspends instantly when minimized or hidden to keep GPU usage near 0%.
- 🛡️ **Factory-Grade Security & 100% Reversible**: Automatically creates physical backup `resources/app.asar.orig.bak`, operates 100% locally (ports 8314/8315/8316) without telemetry, and supports 1-click instant factory rollback.

---

## 🚀 Quick Start

### Option 1: Use Theme Studio GUI (Recommended)

1. Download **`AntigravityThemeStudio.exe`** (standalone portable edition) from [GitHub Releases](https://github.com/krantjohn/antigravity-theme/releases).
2. Double-click to launch, browse wallpapers, adjust mask opacities, or toggle languages.
3. Click "Apply Immediately" for a seamless 0.3-second hot-reload!

### Option 2: Interactive CLI Batch Tools (`dev\bin\`)

The repository includes ready-to-use batch helpers in `dev/bin/`:
- **`dev/bin/swap_wallpaper.bat`**: Interactive wallpaper selection menu
- **`dev/bin/preset_manager.bat`**: Save, list, apply, or delete theme presets
- **`dev/bin/一键恢复官方原版.bat`**: Instant toggle back to stock vanilla appearance (preserving user presets)
- **`dev/bin/uninstall_completely.bat`**: Complete uninstallation restoring factory `app.asar`

### Option 3: Command Line One-Liners (CLI)

```powershell
# 1. Scan and apply Steam Wallpaper Engine wallpapers
node core/theme_engine.js --list-we               # List subscribed items
node core/theme_engine.js --list-we miku          # Search by keyword
node core/theme_engine.js --swap-we 1 left        # Apply item #1 to main canvas

# 2. Apply local video or still image
node core/theme_engine.js --swap left "C:\Wallpapers\anime.mp4"
node core/theme_engine.js --status                # Inspect slot configuration

# 3. Preset management & instant switching
node core/theme_engine.js --save-preset "MyPreset" "Silver anime with liquid glass input"
node core/theme_engine.js --list-presets          # List all presets
node core/theme_engine.js --apply-preset "MyPreset" # Apply preset without restart

# 4. Restore vanilla or complete uninstallation
node core/theme_engine.js --restore-original      # Temporarily revert to vanilla
node core/theme_engine.js --uninstall-completely  # Physically restore stock ASAR
```

---

## 🛡️ Rollback & Uninstallation

- **Temporary Vanilla Mode**: Run `dev/bin/一键恢复官方原版.bat` (or click "Restore Vanilla" in Theme Studio) to enjoy stock styling while keeping presets safe for future use.
- **Complete Uninstallation**: Run `dev/bin/uninstall_completely.bat` to physically restore `resources/app.asar.orig.bak` and purge all modifications, returning Antigravity to 100% factory pristine condition.

---

## 📂 Project Structure

```text
antigravity-theme/
├── 📂 core/                       # Core theming engine, streaming service & patch pipeline
│   ├── theme_engine.js            # Theme compiler: CSS generation, 5-slot control, CDP hot reload
│   ├── wallpaper_engine_bridge.js # Multi-drive Steam library scanner & workshop parser
│   ├── media_server.js            # RFC 7233 high-performance HTTP 206 chunked streaming
│   ├── localization_manager.js    # Comprehensive Chinese localization & bilingual switcher
│   ├── auto_patcher.js            # Patch engine: automated ASAR extraction and injection
│   └── preload.js                 # Renderer injection script: GPU sleep, liquid glass, transparency
├── 📂 studio/                     # Theme Studio modern desktop application source
├── 📂 dev/                        # 🛠️ Developer tooling (batch helpers, test suite & assets)
├── AntigravityThemeStudio.exe     # Standalone portable x64 Windows desktop client
├── LICENSE                        # MIT Open Source License
├── README.md                      # Official Documentation (Simplified Chinese)
└── README_EN.md                   # Official Documentation (English)
```

---

## 📜 License & Legal Disclaimer

- This project is open-source under the [MIT License](LICENSE).
- Sample assets bundled within the repository are provided solely for aspect ratio demonstration and functional verification; all copyrights belong to their respective original illustrators and rights holders.
- Users are encouraged to import personal legitimate wallpapers via the built-in **Steam Wallpaper Engine integration** or their local media collections.

⭐️ If this project enhances your Antigravity workflow, don't forget to give this repository a **Star**!
