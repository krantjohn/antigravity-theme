# 🌸 Antigravity Theme Customizer

<p align="center">
  <img src="dev/assets/previews/theme_showcase.gif" alt="Antigravity Theme Live Showcase" width="900" style="border-radius: 12px; box-shadow: 0 10px 35px rgba(0,0,0,0.25);" />
</p>

<p align="center">
  <a href="README_EN.md"><img src="https://img.shields.io/badge/Language-English-blue?style=flat-square" alt="English Documentation"></a>
  <a href="README.md"><img src="https://img.shields.io/badge/语言-简体中文-red?style=flat-square" alt="中文文档"></a>
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
  <b>让你的 Google Antigravity 客户端焕然一新！</b><br>
  专为 Google Antigravity 打造的高性能、全透光、5 槽位独立沉浸式主题引擎。<br>
  <i>支持 60FPS 动态流媒体壁纸、Steam Wallpaper Engine 创意工坊跨盘直连、亚毫秒输入低延迟、暗色/亮色双主题与一键出厂级彻底还原。</i>
</p>

---

## 🏷️ 仓库标签与技术栈特性 (Tags & Topics)

`antigravity` `wallpaper-engine` `steam-workshop` `theme-customizer` `electron` `chromium` `webview2` `c-sharp` `hardware-acceleration` `video-streaming` `rfc7233` `dark-mode` `light-mode` `bilingual-i18n` `performance-tuning` `zero-latency` `mit-license`

| 分类 | 标签 (Tags) | 技术与特性说明 |
| :--- | :--- | :--- |
| **核心宿主** | `Google Antigravity` `Electron 33+` `Chromium` | 专为 Google Antigravity 打造，无侵入式底层注入架构 |
| **流媒体与性能** | `RFC 7233` `HTTP 206` `GPU Decoding` `0.35ms Latency` | 60FPS 动态流媒体回放，窗口缩放拖拽解耦，按键输入亚毫秒响应 |
| **生态联动** | `Steam` `Wallpaper Engine` `Workshop (AppID 431960)` | 自动跨盘检索已订阅壁纸，支持视频、动图与立绘一键装配 |
| **可视化界面** | `AntigravityThemeStudio.exe` `C# .NET` `WebView2` `Bento UI` | 单文件绿色免安装桌面客户端，1:1 动态实时拟真预览 |
| **设计美学** | `Dark Theme` `Light Theme` `Adaptive Typography` `5-Slots` | 暗色/亮色双主题，全界面发光轮廓抗眩光字体，5 槽位独立隔离 |
| **可靠性与安全** | `app.asar.orig.bak` `Localhost Only` `100% Reversible` `MIT` | 原生物理级出厂备份，纯本地运行零外链遥测，出厂级彻底还原 |

---

## 🌟 核心特性与设计优势

传统的官方客户端界面结构单调，缺少个性化美学表达。Antigravity Theme Customizer 提供了一整套完整、轻量且可控的现代化美化方案：

| 维度 | 传统美化方式 | 🌸 本主题引擎解决方案 (v3.1.0) |
| :--- | :--- | :--- |
| **动态视频流媒体** | 仅支持静态图片，视频易导致客户端卡顿 | **内置 RFC 7233 流媒体微服务**：HTTP 206 毫秒级分块流式传输，60FPS 丝滑硬件加速回放 |
| **拖拽缩放流畅度** | 拖动窗口边缘或内部面板分栏时画面卡顿撕裂 | **窗口缩放与拖拽性能解耦**：拖动期间暂停解码争抢，80ms 自愈恢复，彻底消除卡顿 |
| **打字输入延迟** | 页面 DOM 变动监听器反复触发重算，打字卡手 | **亚毫秒极速打字响应**：MutationObserver 精确过滤输入节点，打字延迟降至 **~0.35ms** |
| **素材获取与联动** | 手动寻找壁纸、裁剪分辨率与转换格式 | **Steam Wallpaper Engine 跨盘直连**：自动扫描创意工坊订阅库，一键装配到指定槽位 |
| **字迹辨识与抗眩光** | 浅色/高对比壁纸下文字泛白，看不清代码 | **全界面自适应字体引擎**：内置 6 套发光轮廓预设或任意 Hex，自动计算对比度微光描边 |
| **主题色彩风格** | 仅支持固定深色模式，界面审美单一 | **暗色 (Dark) / 亮色 (Light) 双主题体系**：支持暗黑极客与明亮清爽双模式，一键平滑切换 |
| **多区域独立布局** | 全局千篇一律一张图，终端和对话互相干扰 | **5 大独立壁纸槽位**：主对话底图、PowerShell 终端、会话抽屉、输入框、设置弹窗分区独立配置 |
| **全套配置预设化** | 更换壁纸易丢失历史调配好的素材 | **独立预设保险库**：全套配置 + 素材全量实体归档，一键 0.3 秒无缝热重载切换 |
| **升级覆盖与备份保护**| 官方推送更新后所有美化直接报废 | **官方核心物理备份 (`app.asar.orig.bak`)**：安全隔离原版，支持一键出厂级彻底还原 |

---

## 📸 视觉效果实测 (Visual Showcase)

### 1. Antigravity 客户端实机实测（多面板协同 + 提问栏 1:1 动态响应）
<p align="center">
  <img src="dev/assets/previews/antigravity_live_workbench.png" alt="Antigravity 客户端实机渲染" width="880" style="border-radius: 12px; box-shadow: 0 10px 35px rgba(0,0,0,0.3);" />
  <br>
  <em>✨ 实机三面板独立壁纸实测：AI 对话全景底图 + PowerShell 终端独立壁纸 + 底部提问输入栏 1:1 精确跟随动态壁纸卡片</em>
</p>

### 2. Antigravity Theme Studio 现代化可视化工作台（暗色 / 亮色双主题系统）

| 🌙 暗色极客主题 (Dark Theme) | ☀️ 优雅亮色主题 (Light Theme) |
| :---: | :---: |
| <img src="dev/assets/previews/theme_studio_dark.png" alt="Theme Studio 暗色模式" width="440" style="border-radius: 8px;" /> | <img src="dev/assets/previews/theme_studio_light.png" alt="Theme Studio 亮色模式" width="440" style="border-radius: 8px;" /> |
| <b>1:1 实时拟真动态装配 · 暗色高对比</b> | <b>纯净明亮模式 · 一键平滑切换</b> |

### 3. Steam 创意工坊海量素材跨盘直连 & 预设保险库

| 🎮 Steam Wallpaper Engine 跨盘直连网格 | 🗂️ 预设保险库一键备份与秒切 |
| :---: | :---: |
| <img src="dev/assets/previews/theme_studio_workshop.png" alt="Steam 创意工坊直连网格" width="440" style="border-radius: 8px;" /> | <img src="dev/assets/previews/theme_studio_presets.png" alt="预设保险库" width="440" style="border-radius: 8px;" /> |
| <b>自动跨所有磁盘扫描工坊已订阅壁纸，一键直装</b> | <b>配置与素材全量实体归档，0.3s 极速热重载</b> |

---

## 🧩 五大独立壁纸槽位设计体系 (Mental Model)

本引擎通过精密的 DOM 隔离与 CSS 选择器穿透，将 Antigravity 划分为 5 个完全独立的视觉槽位，彼此互不渗透：

```text
┌────────────────────────────────────────────────────────────────────────┐
│ [Top Menu] Antigravity   File   View   Window             [— ▢ ✕]      │
├───────────────┬──────────────────────────┬─────────────────────────────┤
│               │                          │                             │
│   【左】槽位   │        【中】槽位         │          【右】槽位          │
│               │                          │                             │
│  AI 主对话区   │   PowerShell 终端面板    │       右侧会话抽屉侧栏       │
│  (全局贯穿底图) │   (.terminal.xterm)      │     (Conversations Drawer)  │
│               │                          │                             │
├───────────────┴──────────────────────────┴─────────────────────────────┤
│                 【下】槽位: 底部提问输入框卡片 (Prompt Card)             │
└────────────────────────────────────────────────────────────────────────┘
  【设置】槽位: 设置弹窗独立插画 (Settings Modal Backdrop)
```

| 槽位代号 | 英文标识 | 对应界面区域 | 推荐素材类型 | 视觉设计与交互职责 |
| :---: | :---: | :--- | :---: | :--- |
| **`左`** | `left` | **全局主对话背景** | 1080P/2K/4K 动态视频 (MP4) | 贯通整个应用的底层基底，透出对话气泡与全局磨砂玻璃层 |
| **`中`** | `mid` | **活跃终端面板** | 动态视频 / 高清原画 | 专属 PowerShell / Bash 终端界面，写代码与跑测试时沉浸式专享 |
| **`右`** | `right` | **独立会话抽屉** | 竖版立绘 / 场景动态图 | 点击侧边栏展开会话列表（Conversations）抽屉时独立呈现，不污染总览面板 |
| **`下`** | `bottom` | **提问输入框** | 动漫局部特写 / GIF / 微动态 | 底部聊天提问框内部卡片背景，伴随每一次灵感输入，1:1 精确跟随输入内容高度伸缩 |
| **`设置`** | `settings`| **设置弹窗** | 专属插画 (PNG/JPG) | 点击左下角 Settings 弹出的设置面板背景，典雅美观 |

---

## 🚀 快速上手 (Quick Start)

### 前置要求
- **操作系统**：Windows 10 / 11 (64-bit)
- **运行环境**：已安装 [Node.js](https://nodejs.org/) (推荐 LTS v18+)
- **客户端**：已安装 Google [Antigravity](https://antigravity.google/) (已完全适配最新版)

---

### 方式 1：使用 Theme Studio 可视化工作台（强烈推荐）

#### 方案 A：从 GitHub Releases 下载预编译客户端（免配置绿色版）
1. 前往 **[Releases 页面](https://github.com/krantjohn/antigravity-theme/releases)** 下载最新的 `AntigravityThemeStudio.exe`；
2. 放置到项目根目录或任意目录直接双击打开，即可体验 1:1 实时拟真预览、工坊壁纸拖拽与一键热重载。

#### 方案 B：直接通过源码启动（纯开源、零二进制依赖）
如果你希望不运行任何外部 `.exe`，推荐直接以纯源码方式启动：
```bash
# 1. 克隆代码仓库
git clone https://github.com/krantjohn/antigravity-theme.git
cd antigravity-theme

# 2. 启动可视化工作台服务
node studio/launcher.js
# 或运行快捷批处理：dev\bin\start_studio.bat
```
浏览器将自动以极简无边框应用模式唤起 `Theme Studio` 控制台。

---

### 方式 2：使用 CLI 批处理菜单

双击运行 **`dev/bin/swap_wallpaper.bat`**，控制台提供直观的全中文菜单：

```text
=====================================================
   🌸 Antigravity Theme Customizer —— 壁纸与预设管理
=====================================================
  [1] 更换本地壁纸 (拖入 MP4 视频或 JPG/PNG 图片)
  [2] 浏览 Steam Wallpaper Engine 创意工坊已订阅壁纸
  [3] 搜索 Steam Wallpaper Engine 壁纸并一键装配
  [4] 自定义全界面字体颜色 (内置 6 套自适应抗眩光预设)
  [5] 查看当前 5 大槽位壁纸状态与字体配置
  [6] 🗂️ 进入预设管理中心 (保存当前全套配置 / 一键秒切预设)
  [0] 退出
=====================================================
```

---

### 方式 3：命令行一键指令 (CLI Commands)

所有操作均支持直接在终端中以一条命令极速执行，并通过 CDP 触发 **0.3 秒无感热重载**（无需重启应用）：

#### 1. Steam Wallpaper Engine 创意工坊壁纸（跨盘直连）
```bash
# 扫描并列出所有已订阅的 Wallpaper Engine 壁纸
node core/theme_engine.js --list-we

# 关键词搜索工坊壁纸
node core/theme_engine.js --list-we "碧蓝"

# 按序号一键应用到指定槽位 (例如将序号 2 应用到全局底图)
node core/theme_engine.js --swap-we 2 左

# 用工坊 ID 直接应用到中间终端面板
node core/theme_engine.js --swap-we 3164111930 中
```

#### 2. 本地文件直接更换 (支持视频与图片)
```bash
# 将【左槽位 (全局主背景)】更换为任意本地动态视频
node core/theme_engine.js --swap "左" "D:\Media\my_wallpaper.mp4"

# 将【中槽位 (终端背景)】更换为本地静态壁纸
node core/theme_engine.js --swap "中" "D:\Pictures\terminal_bg.png"

# 查看当前 5 大槽位及字体颜色状态
node core/theme_engine.js --status
```

#### 3. 自定义全界面字体颜色 (告别反光与看不清)
```bash
# 查看所有内置高对比字体预设
node core/theme_engine.js --list-font-colors

# 切换为暗夜曜黑 (适合纯白/超亮动漫壁纸，曜黑字体搭配白辉光描边，不刺眼)
node core/theme_engine.js --font obsidian-black

# 切换为纯白高对比 / 樱花粉 / 赛博青
node core/theme_engine.js --font pure-white

# 输入任意 Hex 颜色值 (自动感知明暗亮度，并生成微米级发光阴影)
node core/theme_engine.js --font "#ff79c6"
```

#### 4. 预设归档与一键秒级切换 (Preset Manager)
```bash
# 保存当前完整壁纸与配色为命名预设
node core/theme_engine.js --save-preset "赛博朋克风" "4K雨夜霓虹多视频协同"

# 0.3 秒一键切换并激活指定预设 (所有素材自动恢复，免重启生效)
node core/theme_engine.js --apply-preset "赛博朋克风"

# 列出所有已归档预设
node core/theme_engine.js --list-presets
```

---

## ⚙️ 核心架构与技术实现 (Architecture Deep Dive)

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                             Electron 宿主主进程                              │
│  [main.js] 开启 CDP 8314 调试端口 ──启动──> [media_server.js] 本地流媒体服务 (8315)  │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ HTTP 206 视频流 / CSS 热加载
┌──────────────────────────────────────▼──────────────────────────────────────┐
│                            Chromium 渲染进程界面                             │
│  [preload.js] 注入 0ms 占位底图 ──挂载──> <video data-slot="left/mid/right"> │
│  [IntersectionObserver] 智能休眠 ──探测──> 可视即播 / 隐藏即停 (GPU 节能)     │
│  [Drag & Resize Decoupling] 窗口解耦 ──> 缩放期间停止解码，80ms 自愈恢复     │
│  [MutationObserver Filtering] ───> 精确跳过输入框/终端打字，延迟仅 0.35ms    │
│  [custom_theme.css] 穿透注入 ───────> 磨砂玻璃、自适应字体发光、菜单栏 Z-Index │
└─────────────────────────────────────────────────────────────────────────────┘
```

1. **RFC 7233 规范流媒体微服务 (`core/media_server.js`)**：
   - 监听本地端口 `8315`，原生支持 HTTP 206 Partial Content 分块传输；
   - 引入容量为 200 的 LRU 文件定位缓存与 3 秒 TTL 的状态缓存，消除分块请求重复读取磁盘的 I/O 阻塞；
   - 智能绑定连接生命周期（`keepAliveTimeout`），杜绝 Electron 多次创建 video 标签时的句柄泄漏。
2. **窗口缩放与拖拽性能解耦 (`core/preload.js` / `core/theme_engine.js`)**：
   - 彻底解决窗口边缘缩放与分栏拖动时的撕裂与卡顿：在拖拽过程中自动设置全局解耦标记 `window.__isResizing` 与 `window.__isDraggingSplit`，挂起视频对系统桌面窗口管理器（DWM）和 GPU 合成队列的高频竞争；
   - 鼠标松开或缩放静止后 **80ms 自动快速平滑恢复** 原速解码回放；
   - 缩放期间对页面内嵌入的 Webview/Iframe 自动设置 `pointer-events: none`，并在鼠标离开或失去焦点时自愈，彻底杜绝鼠标穿透导致的拖拽卡手或丢帧。
3. **亚毫秒打字响应与 MutationObserver 精准过滤**：
   - 传统美化工具会频繁监听页面全部 DOM 变动导致打字高延迟（>15ms）；
   - 本引擎扩展了精准的节点过滤，自动跳过 `<input>`、`<textarea>`、`[role="textbox"]` 以及 `[contenteditable]` 等所有输入节点，**按键延迟降低至 ~0.35ms**，滚动响应低至 **~0.048ms**。
4. **GPU 智能解码休眠机制**：
   - 当辅助面板折叠、终端切换为其他标签页或客户端最小化时，**自动调用 `.pause()` 暂停解码**；当用户重新展开该区域时，**即时调用 `.play()` 无感恢复播放**，显存与 CPU 占用几乎归零。
5. **受控更新拦截保护 (`core/auto_patcher.js`)**：
   - 接管官方 `electron-updater` 配置，将后台无感静默下载与强行重启安装切换为受控模式，防止用户精心调配的主题被静默覆盖，同时保留标题栏手动确认更新通道。

---

## 🧪 自动化测试套件与性能验证 (Test Suite)

本引擎内置 31 项严格的端到端自动化测试，覆盖所有核心功能与性能边界：

- **基础与动态壁纸测试集**（[`dev/tests/test_suite.js`](dev/tests/test_suite.js)）：**17 / 17 全部 PASS**
  - 槽位别名、流媒体 8315 响应、多槽位视频挂载与无缝循环、向后兼容性、单例隔离与无泄漏。
- **Steam Wallpaper Engine 专项测试集**（[`dev/tests/test_wallpaper_engine.js`](dev/tests/test_wallpaper_engine.js)）：**14 / 14 全部 PASS**
  - 跨盘扫描、工坊 JSON/VDF 解析、Web/Live2D 回退动图处理、序号一致性、出厂级黄金基线还原。

```bash
# 运行全部 31 项自动化测试
node dev/tests/test_suite.js
node dev/tests/test_wallpaper_engine.js
```

---

## 🛡️ 安全原理与完整还原指南 (Security & Uninstallation)

本项目遵循开源透明原则，清晰公开所有技术实现，并提供完整还原方案：

### 1. 物理备份与无损运行
- **自动原生备份**：在首次注入补丁前，系统会自动将官方原始 `app.asar` 完整备份至 `app.asar.orig.bak`；
- **100% 纯本地运行**：所有流媒体服务与样式编译均在本地回环地址（`127.0.0.1`）进行，**不监听、不拦截、不修改、不转发**任何与 Google 服务器交互的 API 数据或账号 Token；
- **纯开源透明**：仓库不包含不可审计的闭源依赖，所有核心注入逻辑（`auto_patcher.js`, `theme_engine.js`, `preload.js`）均完全开源。

### 2. 一键出厂级完整卸载
如果你需要彻底卸载美化并恢复为官方原版，支持两种途径：
- **命令行方式**：
  ```bash
  node core/theme_engine.js --restore-original
  ```
- **物理还原脚本**：
  双击运行 **`dev/bin/uninstall_completely.bat`**，脚本将自动还原 `app.asar.orig.bak` 物理文件，清理所有临时缓存，应用瞬间恢复为 100% 官方原生未修改状态。

---

## 📂 仓库目录全貌 (Project Structure)

```text
antigravity-theme/
├── 📂 core/                       # 底层美化引擎与流媒体微服务核心
│   ├── theme_engine.js            # 核心主题编译器：CSS 生成、5 槽位控制、CDP 0.3s 热重载
│   ├── wallpaper_engine_bridge.js # Steam 跨盘符库自动发现与创意工坊 VDF/JSON 资产解析
│   ├── media_server.js            # 高性能流媒体微服务：HTTP Range 206 分块、LRU 缓存
│   ├── auto_patcher.js            # 核心补丁引擎：自动化解包 asar、注入主进程/渲染进程
│   └── preload.js                 # 核心渲染进程注入层 (视频动态挂载、GPU休眠、无感透明化)
├── 📂 studio/                     # 主题工作室可视化平台
│   ├── launcher.js                # 智能视口启动器守护脚本
│   ├── server.js                  # 本地 HTTP API 微服务 (端口 8316)
│   ├── public/                    # 前端资产 (1:1 动态实时拟真预览、Steam工坊网格、预设库、中英双语)
│   └── src/                       # 原生 Windows C# 桌面启动器源码 (AntigravityThemeStudio)
├── 📂 wallpapers/                 # 默认预设壁纸素材 (开箱即用的尺寸规范与占位模板)
├── 📂 dev/                        # 🛠️ 开发者工具与测试套件
│   ├── bin/                       # 常用 CLI 批处理工具箱 (install, swap, restore 等)
│   ├── scripts/                   # 维护构建、UI 自动化实测与诊断探针工具集
│   ├── tests/                     # 31 项端到端严苛回归测试套件与快照归档
│   ├── docs/                      # 核心架构与技术设计文档
│   └── assets/                    # 文档预览素材与演示动图
├── AntigravityThemeStudio.exe     # 原生 x64 单文件免安装可视化客户端
├── LICENSE                        # MIT 开源授权协议
├── README.md                      # 项目官方使用手册 (中文)
└── README_EN.md                   # Project Documentation (English)
```

---

## 💡 常见问题 (FAQ)

<details>
<summary><b>Q1: 遇到 Antigravity 官方发布版本更新怎么办？</b></summary>
你的壁纸素材与保存的预设保存在独立的用户目录（<code>~/.gemini/antigravity/</code>）中，<b>绝不会因客户端更新而丢失</b>。<br>
在客户端升级后，只需运行一次 <code>node studio/launcher.js</code> 或 <code>dev/bin/install.bat</code>，引擎会自动针对新版本重新注入样式与防静默覆盖保护。
</details>

<details>
<summary><b>Q2: 使用动态视频壁纸会导致电脑发热或占用显卡吗？</b></summary>
不会。本引擎采用 Chromium 底层 D3D11 硬件加速，并独家配备了“GPU 可视性休眠引擎”与“窗口拖拽缩放解耦”：当终端收起、会话列表收起或窗口缩放拖动时，不可见视频会自动暂停解码，显存与 CPU 占用几乎归零。
</details>

<details>
<summary><b>Q3: 更换了很亮的浅色壁纸，界面文字看不太清怎么办？</b></summary>
在 Theme Studio 中选择 <code>[暗夜曜黑 (obsidian-black)]</code> 配色（或运行 <code>node core/theme_engine.js --font obsidian-black</code>），文字将自动切换为高对比深色并附带柔和白辉光微轮廓，即使在超亮纯白背景上依然清晰锐利。
</details>

<details>
<summary><b>Q4: 如何一键恢复为官方原版或彻底卸载？</b></summary>
运行 <code>dev/bin/uninstall_completely.bat</code>（或在 Theme Studio 中点击「恢复出厂纯净模式」），系统会自动还原 <code>app.asar.orig.bak</code> 原生物理核心并清空自定义样式表，应用回归 100% 官方纯正体验。
</details>

---

## 📜 版权声明与素材合规 (Copyright & Disclaimer)

- 本仓库遵循 [MIT License](LICENSE) 开源协议。
- 仓库内附带的默认示例素材仅作为开箱即用时的尺寸规范与渲染功能测试用途，其版权归属于原画师及对应作品官方（如 Yostar / NEXON Games）。
- 强烈推荐并鼓励用户通过内置的 **Steam Wallpaper Engine 联动工具** 或本地私有素材库导入个人喜爱的合法壁纸。

---

## 🤝 参与贡献 (Contributing)

欢迎提交 Issue 和 Pull Request！如果你调试出了好看的流光渐变、定制预设或发现了新的兼容性优化点，欢迎与社区一同分享！

⭐️ 如果这个项目让你的 Antigravity 赏心悦目，欢迎给本仓库点一个 **Star** 支持作者！
