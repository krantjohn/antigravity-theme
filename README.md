# 🌸 Antigravity Theme Customizer

<p align="center">
  <img src="assets/previews/mika_theme_overview.png" alt="Antigravity Theme Preview" width="880" style="border-radius: 10px; box-shadow: 0 8px 30px rgba(0,0,0,0.12);" />
</p>

<p align="center">
  <a href="https://nodejs.org/"><img src="https://img.shields.io/badge/Node.js-v16+-339933?logo=node.js&logoColor=white" alt="Node.js"></a>
  <a href="https://www.electronjs.org/"><img src="https://img.shields.io/badge/Electron-Desktop-47848F?logo=electron&logoColor=white" alt="Electron"></a>
  <a href="https://github.com/krantjohn/antigravity-theme/blob/main/LICENSE"><img src="https://img.shields.io/badge/License-MIT-blue.svg" alt="License: MIT"></a>
  <a href="https://github.com/krantjohn/antigravity-theme"><img src="https://img.shields.io/badge/Platform-Windows-0078D6?logo=windows&logoColor=white" alt="Platform: Windows"></a>
  <a href="https://github.com/krantjohn/antigravity-theme/stargazers"><img src="https://img.shields.io/github/stars/krantjohn/antigravity-theme?style=social" alt="GitHub Stars"></a>
</p>

<p align="center">
  <b>让你的 Google Antigravity 客户端焕然一新！</b><br>
  为 Antigravity 打造的高性能、全通透、5 槽位独立壁纸二次元专属主题引擎。
</p>

---

## ✨ 核心特色 (Features)

- 🎮 **Steam Wallpaper Engine 创意工坊原生级深度联动**：
  - 自动扫描并识别本地 Steam 安装库（支持多盘符跨磁盘 SteamLibrary 库检索与 VDF 解析）。
  - 自动穿透并读取 Wallpaper Engine（Steam AppID 431960）已订阅下载的创意工坊壁纸。
  - 解析 `project.json`，智能提取视频文件（MP4 / WebM）、场景动态图与高清预览图。
  - 支持交互式菜单浏览、关键词模糊搜索、工坊 ID / 序号直达，一键无缝装配到任意 Antigravity 槽位！
- 🎬 **动态视频与静态壁纸全兼容**：
  - 全面支持 **MP4 / WebM / OGG / MOV** 动态视频壁纸，自动循环静音播放、GPU 硬件加速解码、CPU 零额外负担。
  - 完美保留原生静态壁纸（JPG / PNG / GIF / WebP / SVG），随时自由混搭（例如：左侧主背景用动态视频，终端用静态壁纸）。
- 🎨 **5 大独立壁纸槽位**：
  - **`左`（全局主对话）**：全景贯通底座，贯穿整个客户端窗口底层。
  - **`中`（活跃终端面板）**：终端区域独立背景，沉浸式写代码。
  - **`右`（独立抽屉面板）**：右侧侧栏独立画卷，多栏无缝协同。
  - **`下`（底部输入框）**：提问输入框精美画中画插图。
  - **`设置`（设置弹窗）**：设置窗口专属插画背景。
- 🎨 **全界面自定义字体颜色与自适应抗炫光轮廓 (Font Color Customizer)**：
  - 彻底解决“更换不同明暗/高对比壁纸后，应用内文字看不清”的痛点！
  - 内置 6 套高对比发光轮廓预设：`纯白高对比 (pure-white)`、`暗夜曜黑 (obsidian-black)`、`樱花粉 (sakura-pink)`、`赛博青 (cyber-cyan)`、`暖金 (golden-sand)`、`翡翠绿 (emerald-green)`。
  - 支持直接输入任意 Hex 颜色值（如 `#ffffff`, `#1a1a2e`, `#ff69b4`）。
  - 自动基于感知亮度计算轮廓：亮色文字配深邃投影，暗色文字配白芒微光边缘，无论壁纸多亮多暗，字迹均清晰通透。
  - 全面覆盖主对话区、Markdown 输出、输入框、侧边栏、终端与设置弹窗。
- 💖 **圣园未花同款柔光粉边界**：
  - 采用精确调配的柔和樱粉发色（`rgba(249, 168, 212)`），配以多层羽化弥散流光阴影，拒绝粗暴嵌套，通透纯净。
- 💎 **通透毛玻璃磨砂（Glassmorphism）**：
  - 深度穿透全窗口，消除多余嵌套边框，消灭全局外层烦人滚动条，全界面丝滑通透。
- ⚡ **0.3 秒极速热重载 (Hot-Reload)**：
  - 基于 Chromium CDP 协议与 Electron 原生 `webContents.insertCSS`，换壁纸无需重启软件，毫秒级实时刷新。
- 🛡️ **100% 本地安全，0 封号风险**：
  - 纯本地客户端 CSS 与 Electron 前端渲染外壳定制，**绝不触碰任何网络请求、API 接口与鉴权 Token**，对 Google 服务器完全透明合规。
- 🔄 **官方更新一键自愈**：
  - 当 Antigravity 软件官方更新覆盖核心文件后，双击脚本即可一秒重新注入适配。

---

## 📸 效果展示 (Showcase)

| 圣园未花全景柔光粉主题 (默认预设) | 玛奇玛手势支配主题 (自定义换图演示) | 三面板独立壁纸联动 (左中右协同工作流) |
| :---: | :---: | :---: |
| <img src="assets/previews/mika_theme_overview.png" width="280" /> | <img src="assets/previews/makima_wallpaper_demo.png" width="280" /> | <img src="assets/previews/multi_panel_flow_demo.png" width="280" /> |

<p align="center">
  <img src="assets/previews/multi_panel_flow_demo.png" alt="多面板独立壁纸协同工作流" width="880" style="border-radius: 10px; box-shadow: 0 8px 30px rgba(0,0,0,0.12);" />
  <br>
  <em>✨ 三面板独立壁纸联动实战：左侧 AI 主对话区（玛奇玛全景） + 中间 PowerShell 终端（未花立绘） + 右侧会话抽屉（未花半身像）</em>
</p>

---

## 🚀 快速开始 (Quick Start)

### 前置要求
- Windows 10 / 11 操作系统
- 已安装 [Node.js](https://nodejs.org/) (建议 v16 及以上版本)
- 已安装 Google [Antigravity](https://antigravity.google/) 客户端

### 一键安装步骤

1. **克隆或下载本仓库**：
   ```bash
   git clone https://github.com/krantjohn/antigravity-theme.git
   cd antigravity-theme
   ```

2. **运行一键安装**：
   - 直接双击运行项目根目录下的 **`bin/install.bat`**。
   - 脚本会自动执行：
     1. 编译全套主题样式表并同步预设壁纸；
     2. 自动定位解包 Antigravity 核心文件并注入原生加载器；
     3. 固化核心并重启 Antigravity。

3. **安装完成**：
   - Antigravity 重新拉起后，你将立刻看到全套华丽的二次元美化效果！

---

## 🖼️ 自由更换壁纸 (Custom Wallpapers)

本主题引擎支持 **5 大槽位独立随心换**。你随时可以用你喜欢的任意**动态视频 (MP4 / WebM)** 或**静态图片 (JPG / PNG / GIF / WebP)** 替换任意面板！

### 方法 1：双击脚本交互式管理与更换（最简单）
- 双击运行 **`bin/swap_wallpaper.bat`**：
  - 选项 [1]：更换本地壁纸（拖入图片或视频文件即可）；
  - 选项 [2]：浏览 Steam Wallpaper Engine 已订阅壁纸库；
  - 选项 [3]：搜索 Steam Wallpaper Engine 壁纸；
  - 选项 [4]：自定义字体颜色与预设（解决亮/暗壁纸字迹不清问题）；
  - 选项 [5]：查看当前各槽位与字体状态。
- 或直接双击运行 **`bin/wallpaper_engine.bat`**：
  - 专属 Wallpaper Engine 工坊选择器，快速按序号或工坊 ID 将壁纸应用到指定的 Antigravity 槽位！

### 方法 2：命令行指令快速更换

#### 1. Steam Wallpaper Engine 创意工坊壁纸（一键检索与应用）
```bash
# 浏览已扫描到的 Wallpaper Engine 创意工坊壁纸列表
node core/theme_engine.js --list-we

# 搜索包含关键词的 Wallpaper Engine 壁纸
node core/theme_engine.js --list-we "碧蓝"

# 根据列表序号或创意工坊 ID，一键应用到指定槽位（例如应用第 2 项到左侧主对话底图）
node core/theme_engine.js --swap-we 2 左

# 使用创意工坊 ID 直接应用（例如将 3164111930 应用到中间终端）
node core/theme_engine.js --swap-we 3164111930 中
```

#### 2. 本地文件直接更换
```bash
# 更换【全局主对话背景】为动态视频 (MP4)
node core/theme_engine.js --swap "左" "D:\你的动态壁纸.mp4"

# 更换【全局主对话背景】为静态图片 (JPG/PNG)
node core/theme_engine.js --swap "左" "D:\你的壁纸.jpg"

# 更换【终端区域面板】(中槽位 - 支持动态视频或静态图片)
node core/theme_engine.js --swap "中" "D:\你的终端壁纸.mp4"

# 更换【右侧抽屉面板】(右槽位)
node core/theme_engine.js --swap "右" "D:\你的侧栏壁纸.jpg"

# 更换【底部输入框插画】(下槽位)
node core/theme_engine.js --swap "下" "D:\你的输入框壁纸.png"

# 更换【设置面板插画】(设置槽位)
node core/theme_engine.js --swap "设置" "D:\你的设置壁纸.png"

# 查看当前 5 大槽位壁纸类型与当前字体颜色
node core/theme_engine.js --status
```

#### 3. 自定义字体颜色与高对比抗眩光预设
```bash
# 查看所有可用字体预设与当前生效状态 (支持 --list-font-colors, --fonts, fonts)
node core/theme_engine.js --list-font-colors
bin\swap_wallpaper.bat fonts

# 使用预设名称或序号切换字体 (1-6，支持 --font 或直接 font)
node core/theme_engine.js --set-font-color obsidian-black   # 曜黑+白辉光 (适合超亮/纯白壁纸)
node core/theme_engine.js --font sakura-pink                # 樱花粉
bin\swap_wallpaper.bat font 1                               # 切换为纯白高对比 (默认)

# 使用任意自定义 Hex 颜色值 (支持 3/4/6/8 位 Hex，带不带 # 均可，自动计算感知亮度与轮廓发光)
node core/theme_engine.js --font "#ff69b4"
node core/theme_engine.js --font "1a1a2e"
bin\swap_wallpaper.bat font "#00e5ff"
```

#### 4. 壁纸预设保存、归档与一键切换 (Wallpaper Presets)

你可以随时将当前 5 大槽位的壁纸、物理视频/图片文件、显示坐标、海报以及字体配色**保存为独立的预设**。预设会将所有关联素材完整归档，即使源文件被删除或移动也能永久独立一键还原！

```bash
# 保存当前壁纸全套配置与素材为新预设 (名称可为中文或英文)
node core/theme_engine.js --save-preset "赛博朋克" "4K霓虹雨夜动态预设"
bin\preset_manager.bat save "二次元纯白"

# 查看所有已保存的预设列表与素材大小 (支持 --presets / --list-presets)
node core/theme_engine.js --list-presets
bin\preset_manager.bat list

# 查看指定预设的详细槽位与归档素材清单 (支持预设名或序号)
node core/theme_engine.js --show-preset 1
node core/theme_engine.js --show-preset "赛博朋克"

# 一键应用指定预设 (0.3 秒无缝热重载生效，支持序号或名称)
node core/theme_engine.js --apply-preset 1
node core/theme_engine.js --apply-preset "赛博朋克"
bin\preset_manager.bat apply 1

# 删除不需要的预设
node core/theme_engine.js --delete-preset "测试预设"
bin\preset_manager.bat del "测试预设"
```

你也可以直接运行 **`bin/preset_manager.bat`** 或在 **`bin/swap_wallpaper.bat`** 中选择 `[6] 预设管理中心` 进入全图形中文交互菜单！

---

## 🔄 遇到 Antigravity 软件官方更新怎么办？

由于 Antigravity 会定期从云端自动下载新版本并覆盖核心包 `app.asar`，更新后美化可能会暂时恢复为官方原版。

> **请不用担心！你的壁纸素材和样式完全不会丢失！**

**恢复方法：**
只需再次双击运行一次 **`bin/install.bat`**，它会自动解包你刚刚下载的最新官方核心、重新打上补丁并固化，10 秒内恢复全部美化！

---

## 🛡️ 安全性与合规保障 (Security & No-Ban Guarantee)

很多同学担心修改客户端会导致封号，这里从技术原理说明为什么**绝对安全、0 风险**：

1. **纯前端样式层定制**：所有壁纸、磨砂模糊度、边框流光均通过本地 CSS 引擎渲染，类似在浏览器安装主题扩展。
2. **零协议触碰**：未修改任何与 Google AI 服务器交互的通讯协议、网络请求、模型参数或认证 Token。
3. **服务端完全不可见**：Google 服务器只接收对话文本/代码请求，本地窗口使用了什么壁纸和颜色，服务器无法检测也不会关心。

---

## 📂 仓库目录结构

```text
antigravity-theme/
├── bin/
│   ├── install.bat             # 一键自动安装与底层永久固化启动器
│   ├── preset_manager.bat      # 壁纸预设管理中心 (一键保存当前全套配置/归档/一键切换)
│   ├── swap_wallpaper.bat      # 交互式一键更换壁纸工具 (本地/工坊双支持，集成预设菜单)
│   ├── wallpaper_engine.bat    # Steam Wallpaper Engine 创意工坊壁纸专属选择器
│   └── restore_baseline.bat    # 一键还原回初版官方基线工具
├── core/
│   ├── theme_engine.js         # 核心主题编译器：CSS生成、5槽位管理、CDP热重载
│   ├── wallpaper_engine_bridge.js # Steam 库与 Wallpaper Engine 创意工坊跨盘符资产桥接
│   ├── media_server.js         # 本地流媒体服务：HTTP 206 Range 支持、硬件加速推流
│   ├── auto_patcher.js         # 核心补丁生成器：解包asar、注入preload/utils/main
│   └── patch_core.js           # 固化替换工具：解除占用、安全替换核心、唤醒进程
├── tests/
│   ├── test_suite.js           # 13 项全功能深度端到端自动化测试套件
│   ├── test_wallpaper_engine.js# Steam Wallpaper Engine 模块 14 项专业测试
│   └── test_media_server.js    # 流媒体服务器与 HTTP 206 单元测试
├── wallpapers/                 # 5 槽位默认预设素材 (蓝途圣园未花/普拉娜/妃咲等)
│   ├── left_wallpaper.jpg
│   ├── mid_wallpaper.jpg
│   ├── right_wallpaper.jpg
│   ├── input_wallpaper.jpg
│   └── settings_wallpaper.png
├── assets/
│   └── previews/               # README 图文演示预览素材
├── LICENSE                     # MIT 开源协议
└── README.md                   # 项目使用手册
```

---

## 💡 常见问题 (FAQ)

<details>
<summary><b>Q1: 运行脚本报 "找不到指定的路径" 或权限不足？</b></summary>
请右键选择“以管理员身份运行”终端或脚本，并确认 Antigravity 客户端已安装在默认的 <code>%LOCALAPPDATA%\Programs\antigravity</code> 路径下。
</details>

<details>
<summary><b>Q2: 更换壁纸后没有实时刷新？</b></summary>
确保 Antigravity 正在运行。如未实时更新，可在客户端中按快捷键 <code>Ctrl + R</code> 或 <code>F5</code> 强制刷新页面即可。
</details>

<details>
<summary><b>Q3: 如何彻底卸载并恢复为官方原版？</b></summary>
直接双击运行 <code>bin/restore_baseline.bat</code>，或重装 Antigravity 官方客户端即可无痕复原。
</details>

---

## 🤝 贡献与反馈 (Contributing)

欢迎提交 Issue 和 Pull Request！如果你调配出了更惊艳的流光色调或动漫主题配置，非常欢迎分享给社区！

- ⭐️ 如果这个项目让你的 Antigravity 赏心悦目，欢迎点一个 **Star** 支持作者！

---

## 📜 开源许可 (License)

本项目基于 [MIT License](LICENSE) 协议开源。
所附带壁纸素材版权归原画师及蔚蓝档案 (Blue Archive) / 对应 IP 官方所有，仅供个人学习与审美交流使用。
