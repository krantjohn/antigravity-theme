#  Antigravity Theme Customizer

<p align="center">
  <img src="dev/assets/previews/theme_preview.jpg" alt="Antigravity Theme Preview" width="920" style="border-radius: 12px; box-shadow: 0 10px 35px rgba(0,0,0,0.25);" />
</p>

<p align="center">
  <a href="README.md"><img src="https://img.shields.io/badge/语言-简体中文-red?style=flat-square" alt="中文文档"></a>
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
  <b>让你的 Google Antigravity 客户端焕然一新！</b><br>
  专为 Google Antigravity 打造的高性能、全景沉浸式主题美化与中文汉化引擎。<br>
  <i>支持 60FPS 动态流媒体壁纸、Steam Wallpaper Engine 跨盘直连、全新高透“液态玻璃”输入框、全量中文汉化、亚毫秒极速打字响应与一键物理出厂级还原。</i>
</p>

---

##  核心特性

-  **60FPS 动态视频流媒体与 4K 超清原画**：内置高性能 RFC 7233 微服务（HTTP 206 分块串流），实现 `100vw × 100vh` 原生零畸变全景满幅铺满，支持 0%~100% 自由滑动的深色护眼遮罩。
-  **独创“液态玻璃”（Liquid Glass）输入框**：高透光微磨砂流体质感与高折射镜面边缘光感高光，通透高级，背景人物完全可见，不遮挡任何画面。
-  **内嵌全量中文汉化引擎 (i18n)**：一键中英双语切换，全面覆盖深层菜单、会话选项、设置弹窗与状态栏信息，状态持久化保存，重启自动生效。
-  **5 大独立美化槽位**：主背景 (`left`)、输入框 (`bottom`)、设置弹窗 (`settings`)、侧边栏 (`sidebar`)、顶栏 (`header`) 独立分层控制；支持一键恢复官方原生纯净暗色，彻底杜绝透明字体重合 bug。
-  **Steam Wallpaper Engine 跨盘直连**：自动遍历 Windows 全磁盘，秒级识别已订阅的创意工坊壁纸（AppID `431960`），MP4/WebM 视频与各类图片一键直接套用。
-  **极速冷启动与 GPU 视口感知休眠**：客户端冷启动提速至 `<600ms`，按键输入延迟低至 `~0.35ms`；窗口最小化或被遮挡时毫秒级自动暂停解码，显存与 CPU 占用几乎归零。
-  **出厂级物理备份与 100% 可逆**：自动生成 `app.asar.orig.bak` 物理备份，纯本地沙箱运行（端口 8314/8315/8316），零外网数据遥测，支持一键秒级彻底还原官方原生。

---

##  快速上手

### 方式 1：使用可视化桌面工作台（强烈推荐）

1. 从 [Releases 最新发布页面](https://github.com/krantjohn/antigravity-theme/releases) 下载 **`AntigravityThemeStudio.exe`**（单文件免安装绿色版）。
2. 双击打开，直接在界面中浏览壁纸、选择工坊素材、微调遮罩透明度或切换中英文。
3. 点击「立即应用」，0.3 秒内通过底层热重载实时生效！

### 方式 2：使用快捷批处理工具（`dev\bin\`）

仓库在 `dev/bin/` 目录下提供了免配环境的轻量交互式工具箱：
- **`dev/bin/swap_wallpaper.bat`**：交互式更换壁纸（支持本地文件与工坊搜索）
- **`dev/bin/preset_manager.bat`**：预设方案保存、列出、恢复与导出
- **`dev/bin/一键恢复官方原版.bat`**：一键切换回纯净出厂模式（保留个人预设）
- **`dev/bin/uninstall_completely.bat`**：彻底卸载注入补丁，物理恢复官方原生 `app.asar`

### 方式 3：命令行常用指令 (CLI)

```powershell
# 1. 扫描与应用 Steam Wallpaper Engine 创意工坊壁纸
node core/theme_engine.js --list-we               # 列出所有已订阅壁纸
node core/theme_engine.js --list-we miku          # 按关键词搜索
node core/theme_engine.js --swap-we 1 left        # 按序号应用到全局背景

# 2. 更换本地视频或图片壁纸
node core/theme_engine.js --swap left "C:\Wallpapers\anime.mp4"
node core/theme_engine.js --status                # 查看当前各槽位状态

# 3. 预设归档与秒级切换
node core/theme_engine.js --save-preset "我的预设" "银发壁纸搭配液态玻璃输入框"
node core/theme_engine.js --list-presets          # 查看所有预设
node core/theme_engine.js --apply-preset "我的预设" # 一键免重启切换

# 4. 恢复官方原版或彻底卸载
node core/theme_engine.js --restore-original      # 临时切换回纯净原版
node core/theme_engine.js --uninstall-completely  # 物理彻底卸载并还原 asar
```

---

##  卸载与还原指南

- **临时切换回纯净模式**：双击运行 `dev/bin/一键恢复官方原版.bat`（或在工作台中点击「恢复纯净原版」），即可在保留个人预设的同时恢复纯净外观。
- **彻底卸载**：双击运行 `dev/bin/uninstall_completely.bat`，系统将物理还原 `resources/app.asar.orig.bak` 出厂文件并清理所有注入，100% 恢复官方初始状态。

---

##  核心项目结构

```text
antigravity-theme/
├── 📂 core/                       # 核心美化引擎、流媒体服务与补丁注入体系
│   ├── theme_engine.js            # 主题编译器：CSS 生成、5 槽位控制与 CDP 热重载
│   ├── wallpaper_engine_bridge.js # Steam 跨盘符库自动发现与创意工坊解析
│   ├── media_server.js            # RFC 7233 高性能 HTTP 206 分块流媒体服务
│   ├── localization_manager.js    # 全量中文汉化与中英双语切换引擎
│   ├── auto_patcher.js            # 补丁引擎：自动化解包 asar 与注入
│   └── preload.js                 # 渲染进程注入脚本：GPU 休眠、液态玻璃、无感透明
├── 📂 studio/                     # Theme Studio 现代化可视化工作台源码
├── 📂 dev/                        # 🛠️ 开发者工具箱 (bin 批处理、测试套件与资产)
├── AntigravityThemeStudio.exe     # 原生 x64 单文件免安装可视化桌面客户端
├── LICENSE                        # MIT 开源授权协议
├── README.md                      # 项目官方使用手册 (简体中文)
└── README_EN.md                   # Project Documentation (English)
```

---

##  版权声明与开源协议

- 本项目遵循 [MIT License](LICENSE) 开源协议。
- 仓库内附带的默认示例素材仅用于尺寸规范与功能测试，版权归属于原画师及对应作品官方。
- 推荐使用内置的 **Steam Wallpaper Engine 联动** 或个人私有素材库导入合法壁纸。

⭐️ 如果这个项目让你的 Antigravity 赏心悦目，欢迎给本仓库点一个 **Star** 支持作者！
