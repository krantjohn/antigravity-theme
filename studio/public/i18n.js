/**
 * Antigravity Theme Studio - Internationalization (i18n) Module
 * Supports seamless runtime switching between Simplified Chinese (zh) and English (en).
 */

const I18N = {
  zh: {
    // Brand & Header
    "app.title": "Antigravity Theme Studio —— 实时预览与全景工坊",
    "app.name": "Antigravity Theme Studio",
    "nav.preview": "实时装配预览",
    "nav.presets": "预设保险库",
    "nav.we": "Steam 创意工坊",
    "nav.safety": "底层与安全",
    "nav.safety_not_injected": "尚未注入美化底层",

    // Header Actions
    "header.switch_theme": "切换暗色 / 亮色主题",
    "header.theme_dark": "暗色",
    "header.theme_light": "亮色",
    "header.switch_lang": "切换语言 (中文 / English)",
    "header.lang_btn_text": "EN",
    "header.patch_pill_title": "核心美化底层注入状态 (点击查看或一键注入)",
    "header.patch_status_loading": "底层状态...",
    "header.cdp_title": "CDP 8314 热重载通道",
    "header.cdp_detecting": "正在探测 CDP...",
    "header.cdp_online": "CDP 8314 在线",
    "header.cdp_restarting": "CDP 待重启",
    "header.cdp_offline": "客户端离线",
    "header.media_title": "动态壁纸本地流媒体加速通道",
    "header.media_online": "流媒体 8315",
    "header.media_offline": "流媒体离线",
    "header.guide": "新手指南",
    "header.guide_title": "新手快速上手指南与工作流程说明",
    "header.restart": "重启",
    "header.restart_title": "一键重启 Antigravity 客户端以激活 8314 热重载或装载最新补丁",
    "header.reset_window": "还原",
    "header.reset_window_title": "一键还原至推荐适中窗口大小 (1400x860，居中平铺)",
    "header.reload": "刷新",
    "header.reload_title": "刷新工坊配置与状态",
    "header.exit": "退出",
    "header.exit_title": "退出软件 (完全关闭后台服务与视窗)",

    // Inspector Panel
    "inspector.expand_title": "展开参数调节侧栏",
    "inspector.collapse_title": "收起参数调节面板以获得更大全景预览视口",
    "inspector.step1_badge": "第一步",
    "inspector.step1_title": "注入美化底层",
    "inspector.step1_desc": "首次使用需一键注入美化内核，方可在 Antigravity 中渲染壁纸与激活热重载。",
    "inspector.quick_inject": "⚡ 一键注入美化底层",
    "inspector.quick_restart": "🔄 一键重启客户端",
    "inspector.synced": "已同步",
    "inspector.unsaved": "有未应用的实时草稿",
    "inspector.apply": "应用生效",
    "inspector.apply_title": "将当前实时预览的全部槽位壁纸、位置对齐与字体正式应用至 Antigravity",
    "inspector.discard": "还原",
    "inspector.discard_title": "放弃当前未应用的预览调节，还原为客户端当前生效配置",
    "inspector.save_preset": "💾 存为预设",
    "inspector.save_preset_title": "将当前实时预览的方案另存为新预设",

    // Slots
    "slots.tag": "SLOTS",
    "slots.left": "主对话",
    "slots.mid": "活跃终端",
    "slots.right": "独立侧栏",
    "slots.bottom": "提问框",
    "slots.settings": "设置",
    "slots.left_full": "主对话 (左)",
    "slots.mid_full": "活跃终端 (中)",
    "slots.right_full": "独立侧栏 (右)",
    "slots.bottom_full": "提问输入框 (底)",
    "slots.settings_full": "设置弹窗 (设置)",

    // Slot Inspector Details
    "inspector.slot_target": "槽位目标",
    "inspector.current_asset": "当前素材",
    "inspector.asset_type": "素材类型",
    "inspector.fetching": "正在获取...",
    "inspector.type_video": "动态视频",
    "inspector.type_image": "静态图像",
    "inspector.type_vanilla": "官方原版纯净",
    "inspector.type_none": "(未配置壁纸)",
    "inspector.target_left_desc": "AI主对话界面 / 全局底图",
    "inspector.target_mid_desc": "活跃终端面板 (mid)",
    "inspector.target_right_desc": "会话侧抽屉 (right)",
    "inspector.target_bottom_desc": "提问输入框背景 (bottom)",
    "inspector.target_settings_desc": "设置弹窗专属插画 (settings)",

    // Material Drop Zone
    "dropzone.title": "拖拽素材到此处",
    "dropzone.local": "本地文件",
    "dropzone.local_title": "从本地磁盘挑选图片或视频素材",
    "dropzone.we": "🎮 创意工坊",
    "dropzone.we_title": "免切页面，直接在工作区挑选本地 Steam 创意工坊壁纸",
    "dropzone.vanilla": "🛡️ 恢复原版",
    "dropzone.vanilla_title": "将当前槽位的壁纸清除，恢复为 Antigravity 官方原生纯净深色主题模样",
    "dropzone.reset": "↺ 重置槽位",
    "dropzone.reset_title": "重置当前槽位壁纸",

    // Alignment & Position
    "pos.tag": "ALIGNMENT & POSITION",
    "pos.reset_pos": "重置当前对齐",
    "pos.reset_pos_title": "重置当前槽位对齐位置",
    "pos.reset_all_pos": "重置全部",
    "pos.reset_all_pos_title": "重置全部槽位对齐位置",
    "pos.label_x": "水平位置 (X轴对齐)",
    "pos.label_y": "垂直位置 (Y轴对齐)",

    // Mockup Canvas & Stage
    "stage.tag": "1:1 LIVE SIMULATION",
    "stage.title": "Antigravity 界面仿真视窗",
    "stage.mock_settings_btn": "⚙️ 预览设置弹窗",
    "stage.mock_settings_btn_title": "打开/收起设置弹窗外观仿真",
    "stage.hero_title_need_inject": "请先注入美化底层",
    "stage.hero_sub_need_inject": "点击一键注入以开启自定义壁纸与极速热重载。",
    "stage.hero_title_updated": "检测到 Google 刚完成更新！",
    "stage.hero_sub_updated": "底层文件被官方重置，点击一键重新注入以自动恢复。",
    "stage.hero_title_ready_restart": "核心补丁已就绪！",
    "stage.hero_sub_ready_restart": "需重启客户端一次以激活免重启 8314 热重载通道。",
    "stage.hero_inject_btn": "⚡ 一键注入",
    "stage.hero_restart_btn": "🔄 重启客户端",
    "stage.hero_guide_btn": "💡 快速指引",
    "stage.toggle_chat": "隐藏/显示对话文字 (纯净壁纸观赏)",
    "stage.toggle_aux": "展开/收起右侧副栏",
    "mock.user_text": "你好，请优化界面",
    "mock.ai_text": "界面与主题已就绪，实时对齐生效。",
    "mock.input_placeholder": "Ask anything, @ to mention, / for workflows...",

    // Preset Vault
    "presets.tag": "PRESET VAULT",
    "presets.title": "💾 预设保险库",
    "presets.desc": "管理、存储并一键装配您的全套视觉配置预设（包含 5 大槽位壁纸、对齐坐标与专属字体配色）。",
    "presets.save_new": "+ 另存当前为新预设",
    "presets.search_placeholder": "🔍 快速过滤预设名称...",
    "presets.apply_btn": "🚀 立即应用",
    "presets.preview_btn": "🖥️ 在工作区预览",
    "presets.delete_btn": "🗑️ 删除",
    "presets.slot_count": "{count} 槽位",
    "presets.file_count": "{count} 素材",
    "presets.empty": "暂无预设，点击右上角【另存当前为新预设】将当前搭配永久留存！",
    "presets.no_match": "未找到符合过滤条件的预设",

    // Steam Workshop View
    "we.tag": "WALLPAPER ENGINE BRIDGE",
    "we.title": "🎮 Steam 创意工坊素材库",
    "we.desc": "直接读取您本地 Steam 安装的 Wallpaper Engine 创意工坊壁纸，一键载入工作区预览或装配至指定槽位。",
    "we.search_placeholder": "🔍 搜索创意工坊壁纸标题或 ID...",
    "we.detecting": "检测中...",
    "we.count_badge": "{count} 项素材",
    "we.btn_apply": "装配到当前槽位",
    "we.btn_more": "预览到指定其他槽位",
    "we.not_found": "未检测到 Steam WE",
    "we.no_match": "未找到符合搜索条件的创意工坊壁纸",
    "we.scanning": "正在深度扫描 Steam Wallpaper Engine 素材库...",
    "we.scan_failed": "扫描失败: {error}",
    "we.connected": "已连接 Steam",
    "we.refresh": "刷新检测",
    "we.refresh_title": "重新扫描并检测 Steam Wallpaper Engine 素材库",
    "we.refreshing": "正在检测...",
    "we.empty_title": "未检测到 Wallpaper Engine 壁纸库",
    "we.empty_desc": "请确认本地 Steam 已启动，且 Wallpaper Engine (AppID: 431960) 已下载或订阅壁纸。",
    "we.empty_btn_refresh": "🔄 立即刷新检测",

    // Safety & Core View
    "safety.tag": "CORE ENGINE & SAFETY",
    "safety.title": "🛡️ 底层核心与安全维护中心",
    "safety.desc": "检测 Antigravity 官方原生文件注入状态、CDP 通信与流媒体健康度，支持出厂还原与一键重启。",
    "safety.step1_tag": "STEP 1 · PATCH STATUS",
    "safety.step1_title": "① 核心注入环境 (必选第一步)",
    "safety.step1_btn": "⚡ 一键注入 / 安装美化底层",
    "safety.step2_tag": "STEP 2 · CLIENT CONTROL",
    "safety.step2_title": "② 客户端控制与重启 (第二步)",
    "safety.step2_desc": "当官方更新后或底层补丁注入后，点击一键全自动重启客户端，激活 8314 热重载通道。",
    "safety.step2_btn": "🔄 一键重启 Antigravity 客户端",
    "safety.vanilla_tag": "SAFETY · VANILLA RESTORE",
    "safety.vanilla_title": "官方原版纯净模式 (安全出厂备用)",
    "safety.vanilla_desc": "一键恢复 Google 官方原生界面风格（当前壁纸自动保存为快照预设，稍后随时可还原）。",
    "safety.vanilla_btn": "一键恢复官方原版纯净模式",
    "safety.uninstall_tag": "PHYSICAL UNINSTALL",
    "safety.uninstall_title": "出厂物理卸载",
    "safety.uninstall_desc": "完全还原官方出厂 app.asar 镜像，彻底移除所有注入模块，完全恢复出厂状态。",
    "safety.uninstall_btn": "彻底物理卸载出厂还原",

    // Modals
    "modal.save_preset_title": "💾 保存当前配置为新预设",
    "modal.preset_name_label": "预设名称",
    "modal.preset_name_placeholder": "输入预设名称 (如：守岸人、赛博朋克)",
    "modal.cancel": "取消",
    "modal.confirm_save": "确定保存",
    "modal.we_picker_title": "🎮 创意工坊素材快速装配",
    "modal.we_picker_search": "🔍 快速过滤壁纸标题或工坊ID...",
    "modal.we_picker_hint": "💡 点击任意壁纸即可直接装配到当前选中的槽位，并在视窗 0ms 实时预览",
    "modal.we_refresh": "刷新检测",
    "modal.we_refresh_title": "重新扫描检测素材库",
    "modal.close": "关闭",

    // Guide Modal
    "guide.title": "💡 Antigravity Theme Studio 快速上手指南",
    "guide.badge": "30秒掌握操作流程",
    "guide.step1_h4": "⚡ 第一步：注入美化底层",
    "guide.step1_p": "点击一键安全注入美化内核，自动备份官方出厂文件，随时可出厂还原。",
    "guide.step1_btn": "⚡ 立即注入",
    "guide.step2_h4": "🔄 第二步：重启客户端",
    "guide.step2_p": "注入后重启 Antigravity 客户端加载内核，右上角显示【CDP 在线】即可免重启热重载。",
    "guide.step2_btn": "🔄 一键重启",
    "guide.step3_h4": "🎨 第三步：挑选壁纸与微调",
    "guide.step3_p": "拖拽本地图片/视频或挑选 Steam 创意工坊壁纸，支持微调各槽位对齐与毛玻璃。",
    "guide.step3_workspace": "🖥️ 工作区",
    "guide.step3_we": "🎮 创意工坊",
    "guide.step4_h4": "🚀 第四步：点击【应用生效】",
    "guide.step4_p": "微调完毕后点击【应用生效】，新壁纸与布局秒级免重启推送到客户端。",
    "guide.step4_btn": "🚀 开始体验",
    "guide.never_show": "下次启动不再自动弹出",
    "guide.finish_btn": "开始体验工坊",

    // Toasts & Messages
    "toast.lang_switched": "已切换至【简体中文】",
    "toast.theme_switched": "已切换至【{mode}】主题模式",
    "toast.theme_dark": "暗色极客",
    "toast.theme_light": "亮色清爽",
    "toast.exit_msg": "正在退出软件并释放所有后台服务...",
    "toast.refresh_msg": "正在刷新工坊界面...",
    "toast.window_reset": "窗口已还原至推荐适中尺寸 (1400x860)",
    "toast.reset_all_pos": "全部 5 大槽位对齐位置已重置为默认基准",
    "toast.reset_slot_pos": "槽位 [{slot}] 对齐位置已重置为默认基准",
    "toast.apply_success": "✨ 全套视觉配置已正式生效！CDP 0.3s 极速热更新完成！",
    "toast.apply_need_restart": "✨ 配置已固化！请重启一次 Antigravity 客户端使其生效并激活热更新",
    "toast.apply_vanilla_success": "✨ 已成功切换为官方原版纯净模式！",
    "toast.apply_failed": "❌ 正式应用失败: {error}",
    "toast.injecting": "⏳ 正在自动化安全注入核心 (约需5秒)...",
    "toast.inject_success": "✨ 核心注入成功！8314 CDP 与 8315 流媒体双引擎已就绪！",
    "toast.inject_failed": "❌ 注入失败: {error}",
    "toast.restarting": "⚡ 正在重启 Antigravity 客户端，请稍候...",
    "toast.restart_success": "✨ 重启指令已发送！客户端正在重新启动并连接 8314...",
    "toast.restart_failed": "❌ 请求重启失败: {error}",
    "toast.uninstalling": "正在彻底物理卸载...",
    "toast.uninstall_success": "✨ 彻底物理卸载成功，出厂原生文件已还原！",
    "toast.uninstall_failed": "彻底卸载失败: {error}",
    "toast.save_preset_enter_name": "请输入预设名称！",
    "toast.save_preset_saving": "正在保存预设【{name}】...",
    "toast.save_preset_success": "✨ 预设【{name}】保存成功！",
    "toast.save_preset_failed": "保存预设失败: {error}",
    "toast.delete_preset_success": "预设【{name}】已安全删除",
    "toast.delete_preset_failed": "删除预设失败: {error}",
    "toast.apply_preset_applying": "正在装配并应用预设【{name}】...",
    "toast.apply_preset_success": "✨ 预设【{name}】已成功应用并极速热重载生效！",
    "toast.we_equipped": "✨ 已装配壁纸【{title}】到【{slot}】并在视窗 0ms 实时预览！",
    "toast.we_refresh_success": "✓ 刷新检测完成，共发现 {count} 项素材！",
    "toast.we_refresh_empty": "⚠️ 未检测到 Wallpaper Engine 创意工坊壁纸，请确认 Steam 已安装并订阅壁纸",
    "toast.slot_vanilla_restored": "🛡️ 已将【{slot}】恢复为官方原版纯净样式（点击上方“应用生效”即可生效）",
    "toast.slot_reset_default": "槽位 [{slot}] 素材已重置为默认官方壁纸",
    "confirm.delete_preset": "确定要删除预设【{name}】吗？",
    "confirm.restart_app": "确定要重启 Antigravity 客户端吗？\n（将加载全新注入的底层架构并激活 8314 免重启极速热重载）",
    "confirm.vanilla": "确定要恢复为 Antigravity 官方原版纯净模式吗？\n（当前壁纸将自动保存为快照，稍后随时可一键还原）",
    "confirm.uninstall": "⚠️ 警告：彻底物理卸载将还原官方出厂 app.asar 并清除所有注入。\n确定要彻底还原吗？",
    "confirm.discard_draft": "确定要放弃当前工作区未保存的预览调节，还原为客户端当前生效配置吗？",
    "confirm.reset_all_pos": "确定要重置所有 5 个槽位的对齐位置为默认基准值吗？",
    "confirm.inject_before_apply": "⚠️ 检测到 Antigravity 客户端尚未注入美化底层！\n\n若不注入底层，官方客户端将无法加载预设中的透明毛玻璃与全景壁纸。\n\n点击【确定】立即一键注入美化底层，\n点击【取消】则仅保存配置到磁盘。"
  },

  en: {
    // Brand & Header
    "app.title": "Antigravity Theme Studio — Live Preview & Panorama Workshop",
    "app.name": "Antigravity Theme Studio",
    "nav.preview": "Live Preview",
    "nav.presets": "Preset Vault",
    "nav.we": "Steam Workshop",
    "nav.safety": "Core & Safety",
    "nav.safety_not_injected": "Core patch not injected yet",

    // Header Actions
    "header.switch_theme": "Toggle Dark / Light Theme",
    "header.theme_dark": "Dark",
    "header.theme_light": "Light",
    "header.switch_lang": "Switch Language (English / 中文)",
    "header.lang_btn_text": "中文",
    "header.patch_pill_title": "Core engine patch status (Click to inspect or inject)",
    "header.patch_status_loading": "Core status...",
    "header.cdp_title": "CDP 8314 Hot Reload Channel",
    "header.cdp_detecting": "Detecting CDP...",
    "header.cdp_online": "CDP 8314 Online",
    "header.cdp_restarting": "CDP Needs Restart",
    "header.cdp_offline": "Client Offline",
    "header.media_title": "Live Wallpaper Local Media Stream Channel",
    "header.media_online": "Media Stream 8315",
    "header.media_offline": "Media Offline",
    "header.guide": "Quick Guide",
    "header.guide_title": "Quick start guide & workflow overview",
    "header.restart": "Restart",
    "header.restart_title": "Restart Antigravity client to activate 8314 hot reload",
    "header.reset_window": "Reset",
    "header.reset_window_title": "Reset window to optimal size (1400x860, centered)",
    "header.reload": "Reload",
    "header.reload_title": "Reload studio configuration & status",
    "header.exit": "Exit",
    "header.exit_title": "Exit application (Stop background services and close window)",

    // Inspector Panel
    "inspector.expand_title": "Expand inspector panel",
    "inspector.collapse_title": "Collapse inspector panel for wider preview",
    "inspector.step1_badge": "Step 1",
    "inspector.step1_title": "Inject Core Patch",
    "inspector.step1_desc": "Inject core patch first to enable custom wallpapers and hot reload in Antigravity.",
    "inspector.quick_inject": "⚡ Inject Core Patch",
    "inspector.quick_restart": "🔄 Restart Client",
    "inspector.synced": "Synced",
    "inspector.unsaved": "Unsaved Draft",
    "inspector.apply": "Apply Changes",
    "inspector.apply_title": "Apply all previewed wallpapers, alignments and styles to Antigravity",
    "inspector.discard": "Discard",
    "inspector.discard_title": "Discard unapplied preview changes and restore live settings",
    "inspector.save_preset": "💾 Save Preset",
    "inspector.save_preset_title": "Save current preview configuration as a preset",

    // Slots
    "slots.tag": "SLOTS",
    "slots.left": "Main Chat",
    "slots.mid": "Terminal",
    "slots.right": "Drawer",
    "slots.bottom": "Input Box",
    "slots.settings": "Settings",
    "slots.left_full": "Main Chat (Left)",
    "slots.mid_full": "Active Terminal (Mid)",
    "slots.right_full": "Side Drawer (Right)",
    "slots.bottom_full": "Input Box (Bottom)",
    "slots.settings_full": "Settings Modal",

    // Slot Inspector Details
    "inspector.slot_target": "Slot Target",
    "inspector.current_asset": "Current Asset",
    "inspector.asset_type": "Asset Type",
    "inspector.fetching": "Fetching...",
    "inspector.type_video": "Live Video",
    "inspector.type_image": "Static Image",
    "inspector.type_vanilla": "Official Vanilla",
    "inspector.type_none": "(No wallpaper)",
    "inspector.target_left_desc": "AI Main Chat / Global Background",
    "inspector.target_mid_desc": "Active Terminal Panel (mid)",
    "inspector.target_right_desc": "Conversations Drawer (right)",
    "inspector.target_bottom_desc": "Input Box Card (bottom)",
    "inspector.target_settings_desc": "Settings Dialog Art (settings)",

    // Material Drop Zone
    "dropzone.title": "Drag & drop asset here",
    "dropzone.local": "Local File",
    "dropzone.local_title": "Browse image or video from local disk",
    "dropzone.we": "🎮 Workshop",
    "dropzone.we_title": "Select local Steam Workshop wallpapers right here",
    "dropzone.vanilla": "🛡️ Vanilla",
    "dropzone.vanilla_title": "Clear current slot wallpaper and restore official vanilla dark theme",
    "dropzone.reset": "↺ Reset Slot",
    "dropzone.reset_title": "Reset wallpaper for current slot",

    // Alignment & Position
    "pos.tag": "ALIGNMENT & POSITION",
    "pos.reset_pos": "Reset Alignment",
    "pos.reset_pos_title": "Reset alignment for current slot",
    "pos.reset_all_pos": "Reset All",
    "pos.reset_all_pos_title": "Reset alignment for all slots",
    "pos.label_x": "Horizontal Alignment (X-Axis)",
    "pos.label_y": "Vertical Alignment (Y-Axis)",

    // Mockup Canvas & Stage
    "stage.tag": "1:1 LIVE SIMULATION",
    "stage.title": "Antigravity Live Simulation",
    "stage.mock_settings_btn": "⚙️ Preview Settings",
    "stage.mock_settings_btn_title": "Toggle settings dialog appearance simulation",
    "stage.hero_title_need_inject": "Core patch required",
    "stage.hero_sub_need_inject": "Click inject to enable custom wallpapers and instant hot reload.",
    "stage.hero_title_updated": "Google Update Detected!",
    "stage.hero_sub_updated": "Core files were reset by Google update. Click to re-inject and restore automatically.",
    "stage.hero_title_ready_restart": "Core Patch Ready!",
    "stage.hero_sub_ready_restart": "Please restart client once to activate the 8314 hot reload channel.",
    "stage.hero_inject_btn": "⚡ Inject Now",
    "stage.hero_restart_btn": "🔄 Restart Client",
    "stage.hero_guide_btn": "💡 Quick Guide",
    "stage.toggle_chat": "Toggle chat visibility (Pure wallpaper mode)",
    "stage.toggle_aux": "Toggle auxiliary sidebar",
    "mock.user_text": "Hello, please optimize the interface",
    "mock.ai_text": "Interface and theme ready. Live alignment active.",
    "mock.input_placeholder": "Ask anything, @ to mention, / for workflows...",

    // Preset Vault
    "presets.tag": "PRESET VAULT",
    "presets.title": "💾 Preset Vault",
    "presets.desc": "Manage, store, and apply complete visual presets (including all 5 slot wallpapers, alignments, and styling).",
    "presets.save_new": "+ Save Current as Preset",
    "presets.search_placeholder": "🔍 Filter preset names...",
    "presets.apply_btn": "🚀 Apply Now",
    "presets.preview_btn": "🖥️ Preview in Studio",
    "presets.delete_btn": "🗑️ Delete",
    "presets.slot_count": "{count} Slots",
    "presets.file_count": "{count} Assets",
    "presets.empty": "No presets found. Click '+ Save Current as Preset' to keep your favorite setup!",
    "presets.no_match": "No presets match your search query",

    // Steam Workshop View
    "we.tag": "WALLPAPER ENGINE BRIDGE",
    "we.title": "🎮 Steam Workshop Library",
    "we.desc": "Directly loads your subscribed Steam Wallpaper Engine wallpapers. Preview or equip to slots in one click.",
    "we.search_placeholder": "🔍 Search workshop title or ID...",
    "we.detecting": "Detecting...",
    "we.count_badge": "{count} Assets",
    "we.btn_apply": "Equip to Current Slot",
    "we.btn_more": "Equip to Other Slots...",
    "we.not_found": "Steam WE Not Found",
    "we.no_match": "No workshop wallpapers matched your query",
    "we.scanning": "Deep scanning Steam Wallpaper Engine library...",
    "we.scan_failed": "Scan failed: {error}",
    "we.connected": "Steam Connected",
    "we.refresh": "Refresh & Scan",
    "we.refresh_title": "Rescan and detect Steam Wallpaper Engine library",
    "we.refreshing": "Scanning...",
    "we.empty_title": "Wallpaper Engine Library Not Detected",
    "we.empty_desc": "Please ensure Steam is running and Wallpaper Engine (AppID: 431960) has downloaded or subscribed wallpapers.",
    "we.empty_btn_refresh": "🔄 Rescan & Detect Now",

    // Safety & Core View
    "safety.tag": "CORE ENGINE & SAFETY",
    "safety.title": "🛡️ Core Engine & Safety Center",
    "safety.desc": "Inspect Antigravity core injection, CDP communication, and streaming health. Supports factory reset and restart.",
    "safety.step1_tag": "STEP 1 · PATCH STATUS",
    "safety.step1_title": "① Core Patch Status (Required Step 1)",
    "safety.step1_btn": "⚡ Inject / Install Core Patch",
    "safety.step2_tag": "STEP 2 · CLIENT CONTROL",
    "safety.step2_title": "② Client Control & Restart (Step 2)",
    "safety.step2_desc": "After core patch is injected or updated, restart Antigravity to activate the 8314 hot reload channel.",
    "safety.step2_btn": "🔄 Restart Antigravity Client",
    "safety.vanilla_tag": "SAFETY · VANILLA RESTORE",
    "safety.vanilla_title": "Official Vanilla Mode (Safe Fallback)",
    "safety.vanilla_desc": "One-click restore to Google official vanilla interface (current theme is saved as a snapshot preset).",
    "safety.vanilla_btn": "Restore Official Vanilla Mode",
    "safety.uninstall_tag": "PHYSICAL UNINSTALL",
    "safety.uninstall_title": "Factory Physical Uninstall",
    "safety.uninstall_desc": "Completely restore original app.asar backup, remove all injected modules, and return to factory state.",
    "safety.uninstall_btn": "Completely Uninstall & Factory Reset",

    // Modals
    "modal.save_preset_title": "💾 Save Configuration as Preset",
    "modal.preset_name_label": "Preset Name",
    "modal.preset_name_placeholder": "Enter preset name (e.g. Shorekeeper, Cyberpunk)",
    "modal.cancel": "Cancel",
    "modal.confirm_save": "Save Preset",
    "modal.we_picker_title": "🎮 Workshop Asset Quick Equip",
    "modal.we_picker_search": "🔍 Filter wallpaper title or workshop ID...",
    "modal.we_picker_hint": "💡 Click any wallpaper to equip to current slot with 0ms live preview",
    "modal.we_refresh": "Refresh",
    "modal.we_refresh_title": "Rescan & detect wallpapers",
    "modal.close": "Close",

    // Guide Modal
    "guide.title": "💡 Antigravity Theme Studio Quick Start Guide",
    "guide.badge": "Master in 30 Seconds",
    "guide.step1_h4": "⚡ Step 1: Inject Core Patch",
    "guide.step1_p": "Safely inject the core engine. Official files are backed up automatically and can be restored anytime.",
    "guide.step1_btn": "⚡ Inject Now",
    "guide.step2_h4": "🔄 Step 2: Restart Client",
    "guide.step2_p": "Restart Antigravity to load the kernel. Once 'CDP Online' shows, 0.3s hot reload is ready.",
    "guide.step2_btn": "🔄 Restart Now",
    "guide.step3_h4": "🎨 Step 3: Choose Wallpapers & Adjust",
    "guide.step3_p": "Drag local images/videos or pick Steam Workshop items. Fine-tune alignment for each slot.",
    "guide.step3_workspace": "🖥️ Studio",
    "guide.step3_we": "🎮 Workshop",
    "guide.step4_h4": "🚀 Step 4: Click 'Apply Changes'",
    "guide.step4_p": "Once finished, click 'Apply Changes' to push new wallpapers to Antigravity without restarting.",
    "guide.step4_btn": "🚀 Get Started",
    "guide.never_show": "Do not show again on startup",
    "guide.finish_btn": "Enter Studio",

    // Toasts & Messages
    "toast.lang_switched": "Switched to 【English】",
    "toast.theme_switched": "Switched to 【{mode}】 Mode",
    "toast.theme_dark": "Dark Geek",
    "toast.theme_light": "Crisp Light",
    "toast.exit_msg": "Exiting studio and stopping background services...",
    "toast.refresh_msg": "Refreshing studio...",
    "toast.window_reset": "Window resized to optimal size (1400x860)",
    "toast.reset_all_pos": "All 5 slot alignments have been reset to default",
    "toast.reset_slot_pos": "Alignment for slot [{slot}] reset to default",
    "toast.apply_success": "✨ Visual theme applied successfully! CDP 0.3s hot reload complete!",
    "toast.apply_need_restart": "✨ Configuration saved! Please restart Antigravity once to activate.",
    "toast.apply_vanilla_success": "✨ Successfully restored official vanilla mode!",
    "toast.apply_failed": "❌ Apply failed: {error}",
    "toast.injecting": "⏳ Safely injecting core patch (approx. 5 seconds)...",
    "toast.inject_success": "✨ Core injected successfully! 8314 CDP & 8315 Media engines are online!",
    "toast.inject_failed": "❌ Injection failed: {error}",
    "toast.restarting": "⚡ Restarting Antigravity client, please wait...",
    "toast.restart_success": "✨ Restart command sent! Client is restarting and connecting 8314...",
    "toast.restart_failed": "❌ Failed to request restart: {error}",
    "toast.uninstalling": "Completely uninstalling...",
    "toast.uninstall_success": "✨ Factory reset completed successfully! Original files restored.",
    "toast.uninstall_failed": "Factory reset failed: {error}",
    "toast.save_preset_enter_name": "Please enter a preset name!",
    "toast.save_preset_saving": "Saving preset 【{name}】...",
    "toast.save_preset_success": "✨ Preset 【{name}】 saved successfully!",
    "toast.save_preset_failed": "Failed to save preset: {error}",
    "toast.delete_preset_success": "Preset 【{name}】 deleted successfully.",
    "toast.delete_preset_failed": "Failed to delete preset: {error}",
    "toast.apply_preset_applying": "Equipping and applying preset 【{name}】...",
    "toast.apply_preset_success": "✨ Preset 【{name}】 applied and live reloaded!",
    "toast.we_equipped": "✨ Equipped wallpaper 【{title}】 to 【{slot}】 with 0ms live preview!",
    "toast.we_refresh_success": "✓ Scan complete, found {count} wallpapers!",
    "toast.we_refresh_empty": "⚠️ No Wallpaper Engine wallpapers detected. Please ensure Steam is running with subscribed items",
    "toast.slot_vanilla_restored": "🛡️ Slot 【{slot}】 restored to official vanilla (click 'Apply Changes' above to take effect)",
    "toast.slot_reset_default": "Slot [{slot}] asset reset to official default",
    "confirm.delete_preset": "Are you sure you want to delete preset 【{name}】?",
    "confirm.restart_app": "Are you sure you want to restart Antigravity client?\n(Will load newly injected architecture and activate 8314 hot reload)",
    "confirm.vanilla": "Are you sure you want to restore official vanilla mode?\n(Current theme will be automatically saved as a snapshot preset)",
    "confirm.uninstall": "⚠️ Warning: Factory physical uninstall will restore original app.asar and remove all patches.\nAre you sure you want to proceed?",
    "confirm.discard_draft": "Are you sure you want to discard unsaved preview changes and restore live settings?",
    "confirm.reset_all_pos": "Are you sure you want to reset all 5 slot alignments to default values?",
    "confirm.inject_before_apply": "⚠️ Antigravity client core patch is not injected yet!\n\nWithout core patch, the client cannot load custom frosted glass and panorama wallpapers.\n\nClick [OK] to inject core patch now,\nClick [Cancel] to only save configuration to disk."
  }
};

let currentLang = 'zh';

function getLanguage() {
  return currentLang;
}

function t(key, params = {}) {
  const dict = I18N[currentLang] || I18N.zh;
  let str = dict[key] || I18N.zh[key] || key;
  if (params && typeof params === 'object') {
    Object.keys(params).forEach(p => {
      str = str.replace(new RegExp(`\\{${p}\\}`, 'g'), params[p]);
    });
  }
  return str;
}

function applyLanguage(lang) {
  if (lang !== 'zh' && lang !== 'en') lang = 'zh';
  currentLang = lang;
  try {
    localStorage.setItem('ag_studio_lang', lang);
  } catch (_) {}

  document.documentElement.setAttribute('data-lang', lang);
  document.documentElement.lang = lang === 'en' ? 'en' : 'zh-CN';
  document.title = t('app.title');

  // Update language button text
  const langTextEl = document.getElementById('lang-toggle-text');
  if (langTextEl) {
    langTextEl.textContent = lang === 'zh' ? 'EN' : '中文';
  }
  const langBtnEl = document.getElementById('btn-lang-toggle');
  if (langBtnEl) {
    langBtnEl.title = t('header.switch_lang');
  }

  // Update theme toggle text
  const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
  const themeText = document.getElementById('theme-toggle-text');
  if (themeText) {
    themeText.textContent = currentTheme === 'light' ? t('header.theme_light') : t('header.theme_dark');
  }
  const themeBtn = document.getElementById('btn-theme-toggle');
  if (themeBtn) {
    themeBtn.title = t('header.switch_theme');
  }

  // Update all [data-i18n]
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (key) {
      el.textContent = t(key);
    }
  });

  // Update all [data-i18n-html]
  document.querySelectorAll('[data-i18n-html]').forEach(el => {
    const key = el.getAttribute('data-i18n-html');
    if (key) {
      el.innerHTML = t(key);
    }
  });

  // Update all [data-i18n-title]
  document.querySelectorAll('[data-i18n-title]').forEach(el => {
    const key = el.getAttribute('data-i18n-title');
    if (key) {
      el.title = t(key);
    }
  });

  // Update all [data-i18n-placeholder]
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const key = el.getAttribute('data-i18n-placeholder');
    if (key) {
      el.placeholder = t(key);
    }
  });

  // Dispatch global event for app.js to re-render dynamic contents
  document.dispatchEvent(new CustomEvent('languagechange', { detail: { lang } }));
}

function initI18n() {
  let savedLang = 'zh';
  try {
    savedLang = localStorage.getItem('ag_studio_lang') || 'zh';
  } catch (_) {}

  applyLanguage(savedLang);

  const btnLangToggle = document.getElementById('btn-lang-toggle');
  if (btnLangToggle && !btnLangToggle.dataset.langBound) {
    btnLangToggle.dataset.langBound = 'true';
    btnLangToggle.addEventListener('click', (e) => {
      e.preventDefault();
      const nextLang = currentLang === 'zh' ? 'en' : 'zh';
      applyLanguage(nextLang);
      if (typeof showToast === 'function') {
        showToast(t('toast.lang_switched'));
      }
    });
  }
}

// Immediate pre-execution
if (typeof window !== 'undefined') {
  window.I18N = I18N;
  window.t = t;
  window.getLanguage = getLanguage;
  window.applyLanguage = applyLanguage;
  window.initI18n = initI18n;

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initI18n);
    } else {
      initI18n();
    }
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { I18N, t, getLanguage, applyLanguage, initI18n };
}
