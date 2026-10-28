// =========================================================================
// 🌸 Antigravity Theme Studio —— 实时预览与全景工坊 (Client Core Logic v3.1)
// =========================================================================

let state = {
  activeTab: 'view-preview',
  activeSlot: 'left',
  slotsConfig: {},      // 客户端当前在线生效配置
  draftConfig: {},      // 工作区草稿配置 (0ms 实时预览隔离层)
  isDirty: false,       // 是否有未应用的草稿变更
  pendingFiles: {},     // 暂存的本地文件对象 (slot -> File)
  blobUrls: {},         // 暂存的本地媒体临时预览地址 (slot -> blob: url)
  presets: [],          // 保存的主题预设列表
  fontPresets: {},      // 字体对比度预设
  slotsMeta: {},        // 各槽位元信息描述
  weList: [],           // Steam Wallpaper Engine 壁纸列表
  weFiltered: [],       // 经过搜索过滤的 WE 壁纸列表
  isCdpOnline: false,
  isMediaOnline: false,
  isAntigravityRunning: false,
  mockSettingsOpen: false,
  
  // v3.1 预览增强状态
  viewMode: 'full',      // 'full' | 'compact' | 'focus'
  isVideoPlaying: true,  // 预览视频播放/暂停
  isAudioMuted: true,    // 预览视频静音
  videoSpeed: 1.0,       // 预览视频倍速
  glassBlur: 16,         // 毛玻璃模糊度 (px)
  glassDarkness: 70,     // 卡片底色暗度 (%)
  isAutoFit: true,       // 全自适应缩放模式 (默认开启，开箱完整铺满视口)
  zoomLevel: 100,        // 当前缩放百分比 (当退出 auto-fit 时为具体百分比)
  patchStatus: null,
  hasBackup: false,
  backupSize: 0,
  isHeroBannerDismissed: localStorage.getItem('ag_hero_banner_dismissed') === 'true',
  hasCheckedGuideAutoOpen: false
};

// DOM Elements Cache
const appNav = document.getElementById('app-nav');
const cdpStatusEl = document.getElementById('cdp-status');
const mediaStatusEl = document.getElementById('media-status');
const slotSelectorEl = document.getElementById('slot-selector');
const inspectorFocusLabel = document.getElementById('inspector-focus-label');
const activeSlotNameEl = document.getElementById('active-slot-name');
const activeSlotFileEl = document.getElementById('active-slot-file');
const activeSlotTypeEl = document.getElementById('active-slot-type');
const typeBadgeEl = document.getElementById('type-badge');
const sliderPosX = document.getElementById('slider-pos-x');
const sliderPosY = document.getElementById('slider-pos-y');
const valPosX = document.getElementById('val-pos-x');
const valPosY = document.getElementById('val-pos-y');
const btnResetSlot = document.getElementById('btn-reset-slot');
const btnRestoreSlotVanilla = document.getElementById('btn-restore-slot-vanilla');
const btnResetPos = document.getElementById('btn-reset-pos');
const btnResetAllPos = document.getElementById('btn-reset-all-pos');
const btnBrowseNative = document.getElementById('btn-browse-native');
const btnOpenWePicker = document.getElementById('btn-open-we-picker');
const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('file-input');

// Glassmorphism & Contrast Controls
const sliderGlassBlur = document.getElementById('slider-glass-blur');
const valGlassBlur = document.getElementById('val-glass-blur');
const sliderGlassDarkness = document.getElementById('slider-glass-darkness');
const valGlassDarkness = document.getElementById('val-glass-darkness');
const btnResetGlass = document.getElementById('btn-reset-glass');

// Typography Controls
const fontPresetsGrid = document.getElementById('font-presets');
const fontColorPicker = document.getElementById('font-color-picker');
const fontHexInput = document.getElementById('font-hex-input');
const btnApplyFont = document.getElementById('btn-apply-font');
const btnResetFont = document.getElementById('btn-reset-font');

// Draft Controls
const draftIndicator = document.getElementById('draft-indicator');
const draftStatusText = document.getElementById('draft-status-text');
const btnCommitDraft = document.getElementById('btn-commit-draft');
const btnDiscardDraft = document.getElementById('btn-discard-draft');
const btnDraftSavePreset = document.getElementById('btn-draft-save-preset');

// Mockup Elements
const agMockup = document.getElementById('ag-mockup');
const dragCoordHud = document.getElementById('drag-coord-hud');
const btnToggleMockSettings = document.getElementById('btn-toggle-mock-settings');
const mockSidebarSettingsBtn = document.getElementById('mock-sidebar-settings-btn');
const mockSettingsOverlay = document.getElementById('mock-settings-overlay');
const btnCloseMockSettings = document.getElementById('btn-close-mock-settings');

// Preview Toolbar Elements
const quickPresetSelect = document.getElementById('quick-preset-select');
const viewModePills = document.getElementById('view-mode-pills');
const btnTogglePlay = document.getElementById('btn-toggle-play');
const playIcon = document.getElementById('play-icon');
const btnToggleAudio = document.getElementById('btn-toggle-audio');
const audioIcon = document.getElementById('audio-icon');
const videoSpeedSelect = document.getElementById('video-speed-select');
const btnPeekVanilla = document.getElementById('btn-peek-vanilla');

// Viewport Auto-fit & Zoom Controls
const mockupViewport = document.getElementById('mockup-viewport');
const mockupScaler = document.getElementById('mockup-scaler');
const btnAutoFit = document.getElementById('btn-auto-fit');
const btnZoomIn = document.getElementById('btn-zoom-in');
const btnZoomOut = document.getElementById('btn-zoom-out');
const btnZoom100 = document.getElementById('btn-zoom-100');
const zoomLevelLabel = document.getElementById('zoom-level-label');

// Presets View Elements
const presetListEl = document.getElementById('preset-list');
const presetSearchInput = document.getElementById('preset-search-input');
const btnResetBaselinePresets = document.getElementById('btn-reset-baseline-presets');
const btnOpenSaveModal = document.getElementById('btn-open-save-modal');
const savePresetModal = document.getElementById('save-preset-modal');
const btnCloseSaveModal = document.getElementById('btn-close-save-modal');
const btnCancelSaveModal = document.getElementById('btn-cancel-save-modal');
const btnConfirmSavePreset = document.getElementById('btn-confirm-save-preset');
const newPresetNameInput = document.getElementById('new-preset-name');

// Steam WE View & Picker Elements
const weBadge = document.getElementById('we-badge');
const weCountBadge = document.getElementById('we-count-badge');
const navWeCount = document.getElementById('nav-we-count');
const weSearchInput = document.getElementById('we-search-input');
const weGrid = document.getElementById('we-grid');
const wePickerModal = document.getElementById('we-picker-modal');
const wePickerCount = document.getElementById('we-picker-count');
const wePickerSearchInput = document.getElementById('we-picker-search-input');
const wePickerGrid = document.getElementById('we-picker-grid');
const btnCloseWePicker = document.getElementById('btn-close-we-picker');
const btnCancelWePicker = document.getElementById('btn-cancel-we-picker');

// Safety Elements
const patchBanner = document.getElementById('patch-banner');
const patchDot = document.getElementById('patch-dot');
const patchText = document.getElementById('patch-text');
const btnInstallPatch = document.getElementById('btn-install-patch');
const btnRestartApp = document.getElementById('btn-restart-app');
const btnRestartAppCard = document.getElementById('btn-restart-app-card');
const btnVanilla = document.getElementById('btn-vanilla');
const btnUninstall = document.getElementById('btn-uninstall');

// Header Additions
const patchStatusPill = document.getElementById('patch-status-pill');
const patchStatusText = document.getElementById('patch-status-text');
const btnOpenGuide = document.getElementById('btn-open-guide');
const navSafetyDot = document.getElementById('nav-safety-dot');

// Inspector Step 1 Card
const inspectorGuideCard = document.getElementById('inspector-guide-card');
const guideCardBadge = document.getElementById('guide-card-badge');
const guideCardTitle = document.getElementById('guide-card-title');
const guideCardDesc = document.getElementById('guide-card-desc');
const btnQuickInject = document.getElementById('btn-quick-inject');
const btnQuickRestart = document.getElementById('btn-quick-restart');

// Workspace Hero Banner
const workspaceHeroBanner = document.getElementById('workspace-hero-banner');
const heroBannerIcon = document.getElementById('hero-banner-icon');
const heroBannerTitle = document.getElementById('hero-banner-title');
const heroBannerSub = document.getElementById('hero-banner-sub');
const btnHeroInject = document.getElementById('btn-hero-inject');
const btnHeroRestart = document.getElementById('btn-hero-restart');
const btnHeroGuide = document.getElementById('btn-hero-guide');
const btnBannerClose = document.getElementById('btn-banner-close');

// Newbie Quick Start Guide Modal
const guideModal = document.getElementById('guide-modal');
const btnCloseGuideModal = document.getElementById('btn-close-guide-modal');
const btnFinishGuide = document.getElementById('btn-finish-guide');
const btnGuideStep1Inject = document.getElementById('btn-guide-step1-inject');
const btnGuideStep2Restart = document.getElementById('btn-guide-step2-restart');
const btnGuideStep3Workspace = document.getElementById('btn-guide-step3-workspace');
const btnGuideStep3We = document.getElementById('btn-guide-step3-we');
const btnGuideStep4Go = document.getElementById('btn-guide-step4-go');
const guideStep1Tag = document.getElementById('guide-step1-tag');
const guideStep2Tag = document.getElementById('guide-step2-tag');
const chkNeverShowGuide = document.getElementById('chk-never-show-guide');

// Utility Elements
const btnShutdown = document.getElementById('btn-shutdown');
const btnReload = document.getElementById('btn-reload');
const toastContainer = document.getElementById('toast-container');

// =========================================================================
// 1. Raycast Spotlight Border Effect
// =========================================================================
function initSpotlightEffect() {
  document.querySelectorAll('.spotlight-card').forEach(card => {
    card.addEventListener('mousemove', e => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      card.style.setProperty('--mouse-x', `${x}px`);
      card.style.setProperty('--mouse-y', `${y}px`);
    });
  });
}

// =========================================================================
// 2. Toast Notifications
// =========================================================================
function showToast(message, duration = 3200) {
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerHTML = `<span>✨</span><span>${message}</span>`;
  toastContainer.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px) scale(0.95)';
    setTimeout(() => toast.remove(), 250);
  }, duration);
}

// =========================================================================
// 3. Tab Navigation Router
// =========================================================================
function initTabs() {
  const tabs = document.querySelectorAll('.nav-tab');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const targetViewId = tab.dataset.tab;
      if (!targetViewId) return;

      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');

      document.querySelectorAll('.view-panel').forEach(panel => {
        panel.classList.remove('active');
      });
      const activePanel = document.getElementById(targetViewId);
      if (activePanel) {
        activePanel.classList.add('active');
      }

      state.activeTab = targetViewId;

      if (targetViewId === 'view-we') {
        if (!state.weList || state.weList.length === 0) {
          fetchWeList();
        } else {
          renderWeGallery();
        }
      } else if (targetViewId === 'view-presets') {
        renderPresetsList();
      } else if (targetViewId === 'view-preview') {
        renderSlotInspector();
        renderMockupPreview();
        if (state.isAutoFit) {
          setTimeout(updateMockupScale, 50);
        }
        document.querySelectorAll('.mockup-window video.mock-media-video.visible').forEach(vid => {
          if (state.isVideoPlaying && vid.paused) {
            vid.play().catch(() => {});
          }
        });
      }
    });
  });
}

function switchTab(viewId) {
  const tabBtn = document.querySelector(`.nav-tab[data-tab="${viewId}"]`);
  if (tabBtn) tabBtn.click();
}

// =========================================================================
// 4. Draft State Management (0ms Isolation & Explicit Commit)
// =========================================================================
function setDraftDirty(dirty) {
  state.isDirty = dirty;
  if (dirty) {
    draftIndicator.className = 'draft-indicator dirty';
    draftStatusText.textContent = '有未应用的实时草稿';
    btnCommitDraft.disabled = false;
    btnDiscardDraft.disabled = false;
  } else {
    draftIndicator.className = 'draft-indicator synced';
    draftStatusText.textContent = '与当前客户端同步';
  }
}

function cleanBlobUrls() {
  for (const [slot, url] of Object.entries(state.blobUrls)) {
    try { URL.revokeObjectURL(url); } catch (_) {}
  }
  state.blobUrls = {};
  state.pendingFiles = {};
}

// =========================================================================
// 5. Fetch Full Status & Sync Data
// =========================================================================
async function fetchStatus() {
  try {
    const res = await fetch('/api/status');
    const data = await res.json();
    if (data.success) {
      state.isCdpOnline = data.isCdpOnline;
      state.isMediaOnline = data.isMediaOnline;
      state.isAntigravityRunning = data.isAntigravityRunning;
      state.slotsConfig = data.slotsConfig || {};
      state.presets = data.presets || [];
      state.fontPresets = data.fontPresets || {};
      state.slotsMeta = data.slotsMeta || {};
      state.patchStatus = data.patchStatus || null;
      state.hasBackup = data.hasBackup;
      state.backupSize = data.backupSize;

      if (!state.isDirty) {
        state.draftConfig = JSON.parse(JSON.stringify(state.slotsConfig));
        setDraftDirty(false);
      }

      renderHeaderStatus(data);
      renderSlotInspector();
      renderFontPresets();
      renderMockupPreview();
      renderPresetsList();
      renderQuickPresetSelect();
      renderWeStatus(data.weCount);
      renderPatchStatus(data.patchStatus, data.hasBackup, data.backupSize);

      // Auto-open Newbie Guide on first launch if unpatched
      if (!state.hasCheckedGuideAutoOpen) {
        state.hasCheckedGuideAutoOpen = true;
        try {
          const neverShow = localStorage.getItem('ag_never_show_guide') === 'true';
          const guideShown = localStorage.getItem('ag_theme_guide_shown') === 'true';
          if (!neverShow && !guideShown && (!data.patchStatus || !data.patchStatus.isPatched)) {
            setTimeout(openGuideModal, 600);
          }
        } catch (_) {}
      }
    }
  } catch (err) {
    console.error('Failed to fetch status:', err);
  }
}

// =========================================================================
// 6. Render Header Status
// =========================================================================
function renderHeaderStatus(data) {
  const cdpDot = cdpStatusEl.querySelector('.status-dot');
  const cdpText = cdpStatusEl.querySelector('.status-text');
  if (data.isCdpOnline) {
    cdpDot.className = 'status-dot online';
    cdpText.textContent = 'CDP 在线';
    cdpStatusEl.title = 'CDP 8314 在线 (0.3s 秒级热重载就绪)';
  } else if (data.isAntigravityRunning) {
    cdpDot.className = 'status-dot warning';
    cdpText.textContent = 'CDP 待重启';
    cdpStatusEl.title = '需完全重启客户端以激活 8314 热重载通道';
  } else {
    cdpDot.className = 'status-dot offline';
    cdpText.textContent = '客户端离线';
    cdpStatusEl.title = 'Antigravity 客户端未启动';
  }

  const mediaDot = mediaStatusEl.querySelector('.status-dot');
  const mediaText = mediaStatusEl.querySelector('.status-text');
  if (data.isMediaOnline) {
    mediaDot.className = 'status-dot online';
    mediaText.textContent = '流媒体 8315';
    mediaStatusEl.title = '动态壁纸本地流媒体加速通道 8315 运行中';
  } else {
    mediaDot.className = 'status-dot offline';
    mediaText.textContent = '流媒体离线';
    mediaStatusEl.title = '动态壁纸本地流媒体加速服务离线';
  }
}

// =========================================================================
// 7. Render Slot Inspector (Left Column)
// =========================================================================
function renderSlotInspector() {
  const slotKey = state.activeSlot;
  const slotData = (state.draftConfig && state.draftConfig[slotKey]) || (state.slotsConfig && state.slotsConfig[slotKey]) || {};
  const meta = state.slotsMeta[slotKey] || {};

  const slotChineseMap = {
    left: '主对话 (左)',
    mid: '活跃终端 (中)',
    right: '独立侧栏 (右)',
    bottom: '提问输入框 (底)',
    settings: '设置弹窗'
  };

  if (inspectorFocusLabel) {
    inspectorFocusLabel.textContent = `正在调节：${slotChineseMap[slotKey] || slotKey}`;
  }

  activeSlotNameEl.textContent = meta.desc || slotKey;
  
  if (slotData.stagedFilePath) {
    activeSlotFileEl.textContent = '✨ [草稿] ' + (slotData.stagedFileName || slotData.stagedFilePath.split(/[\\/]/).pop());
  } else if (slotData.stagedFileName) {
    activeSlotFileEl.textContent = '✨ [草稿] ' + slotData.stagedFileName;
  } else {
    activeSlotFileEl.textContent = slotData.file || '(未配置壁纸)';
  }

  const isVid = slotData.type === 'video' || 
    (slotData.file && slotData.file.match(/\.(mp4|webm|mov)$/i)) || 
    (slotData.stagedFilePath && slotData.stagedFilePath.match(/\.(mp4|webm|mov)$/i)) ||
    (slotData.stagedFileName && slotData.stagedFileName.match(/\.(mp4|webm|mov)$/i));
  const isVanilla = slotData.type === 'none' || slotData.isOriginal || (!slotData.file && !slotData.stagedFilePath && !slotData.stagedFileName);
  if (isVanilla) {
    typeBadgeEl.className = 'badge badge-subtle';
    typeBadgeEl.textContent = '🛡️ 原版纯净 (Vanilla)';
    activeSlotFileEl.textContent = '官方原生深色主题 (无壁纸)';
  } else if (isVid) {
    typeBadgeEl.className = 'badge badge-accent';
    typeBadgeEl.textContent = '🎬 4K/2K 动态视频';
  } else {
    typeBadgeEl.className = 'badge badge-subtle';
    typeBadgeEl.textContent = '🖼️ 静态图像';
  }

  // Parse Position Coordinates
  const posStr = slotData.position || 'center center';
  const coords = parsePositionString(posStr);
  sliderPosX.value = coords.x;
  sliderPosY.value = coords.y;
  valPosX.textContent = `${coords.x}%`;
  valPosY.textContent = `${coords.y}%`;

  // Highlight Active Pill in Selector
  document.querySelectorAll('.slot-pill').forEach(btn => {
    if (btn.dataset.slot === slotKey) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });

  // Update Glassmorphism Sliders
  if (sliderGlassBlur && valGlassBlur) {
    const blurVal = state.draftConfig.glassBlur || state.glassBlur || 16;
    sliderGlassBlur.value = blurVal;
    valGlassBlur.textContent = `${blurVal}px`;
  }
  if (sliderGlassDarkness && valGlassDarkness) {
    const darkVal = state.draftConfig.glassDarkness || state.glassDarkness || 70;
    sliderGlassDarkness.value = darkVal;
    valGlassDarkness.textContent = `${darkVal}%`;
  }
}

function parsePositionString(pos) {
  let x = 50, y = 50;
  if (!pos) return { x, y };
  const parts = pos.trim().split(/\s+/);
  if (parts.length >= 1) x = parseCoord(parts[0], 50);
  if (parts.length >= 2) y = parseCoord(parts[1], 50);
  return { x, y };
}

function parseCoord(val, defaultVal) {
  if (val === 'center') return 50;
  if (val === 'top' || val === 'left') return 0;
  if (val === 'bottom' || val === 'right') return 100;
  const m = val.match(/^(\d+(?:\.\d+)?)%$/);
  if (m) return Math.round(parseFloat(m[1]));
  return defaultVal;
}

// =========================================================================
// 8. 1:1 Antigravity Live Mockup Renderer (Right Column)
// =========================================================================
function renderMockupPreview() {
  if (!agMockup) return;

  const slotsToRender = ['left', 'mid', 'right', 'bottom', 'settings'];

  slotsToRender.forEach(slotKey => {
    const videoEl = document.getElementById(`mock-video-${slotKey}`);
    const imgEl = document.getElementById(`mock-img-${slotKey}`);
    const slotContainer = document.getElementById(`mock-slot-${slotKey}`);
    if (!videoEl || !imgEl) return;

    const slotData = (state.draftConfig && state.draftConfig[slotKey]) || (state.slotsConfig && state.slotsConfig[slotKey]) || {};
    
    let mediaUrl = '';
    let isVideo = false;

    const isSlotVanilla = slotData.type === 'none' || slotData.isOriginal;
    if (isSlotVanilla) {
      mediaUrl = '';
      isVideo = false;
    } else if (state.blobUrls[slotKey]) {
      mediaUrl = state.blobUrls[slotKey];
      const pendingFile = state.pendingFiles[slotKey];
      isVideo = pendingFile ? pendingFile.type.startsWith('video/') : false;
    } else if (slotData.stagedFilePath) {
      mediaUrl = `/api/preview-file?path=${encodeURIComponent(slotData.stagedFilePath)}`;
      isVideo = Boolean(slotData.stagedFilePath.match(/\.(mp4|webm|mov)$/i));
    } else if (slotData.file) {
      mediaUrl = `/api/preview-file?path=${encodeURIComponent(slotData.file)}`;
      isVideo = slotData.type === 'video' || Boolean(slotData.file.match(/\.(mp4|webm|mov)$/i));
    }

    // Apply Position
    const pos = slotData.position || 'center center';
    videoEl.style.objectPosition = pos;
    imgEl.style.objectPosition = pos;

    // Apply Media playback properties
    videoEl.muted = state.isAudioMuted;
    videoEl.playbackRate = state.videoSpeed || 1.0;

    // Apply Media Sources and toggle classes
    if (mediaUrl) {
      if (isVideo) {
        const srcChanged = videoEl.dataset.currentSrc !== mediaUrl;
        if (srcChanged) {
          videoEl.dataset.currentSrc = mediaUrl;
          videoEl.src = mediaUrl;
          videoEl.load();
        }
        videoEl.classList.add('visible');
        imgEl.classList.remove('visible');
        imgEl.removeAttribute('src');
        imgEl.dataset.currentSrc = '';

        if (state.isVideoPlaying) {
          const playPromise = videoEl.play();
          if (playPromise !== undefined) {
            playPromise.catch(() => {
              videoEl.muted = true;
              videoEl.play().catch(() => {});
            });
          }
        } else {
          videoEl.pause();
        }
      } else {
        if (imgEl.dataset.currentSrc !== mediaUrl) {
          imgEl.dataset.currentSrc = mediaUrl;
          imgEl.src = mediaUrl;
        }
        imgEl.classList.add('visible');
        videoEl.classList.remove('visible');
        videoEl.pause();
        videoEl.removeAttribute('src');
        videoEl.dataset.currentSrc = '';
      }
    } else {
      videoEl.classList.remove('visible');
      imgEl.classList.remove('visible');
      videoEl.pause();
      videoEl.removeAttribute('src');
      videoEl.dataset.currentSrc = '';
      imgEl.removeAttribute('src');
      imgEl.dataset.currentSrc = '';
    }

    // Interactive target highlight
    if (slotContainer) {
      slotContainer.classList.toggle('slot-vanilla', Boolean(isSlotVanilla));
      if (slotKey === 'bottom') {
        slotContainer.classList.toggle('has-media', Boolean(mediaUrl));
      }
      if (state.activeSlot === slotKey) {
        slotContainer.classList.add('active-slot-target');
      } else {
        slotContainer.classList.remove('active-slot-target');
      }
    }
  });

  // Apply typography contrast & Rec. 601 dynamic shadows to the mockup
  let fontConf = (state.draftConfig && state.draftConfig.fontColor) || (state.slotsConfig && state.slotsConfig.fontColor) || { primary: '#ffffff' };
  let primaryHex = typeof fontConf === 'string' ? fontConf : (fontConf.primary || '#ffffff');
  
  const lum = calculateLuminance(primaryHex);
  let textShadow = '';
  let terminalColor = primaryHex;
  let terminalShadow = '';

  if (lum < 128) {
    textShadow = '0 0 2px #fff, 0 1px 3px rgba(255, 255, 255, 0.95)';
    terminalColor = '#0f172a';
    terminalShadow = '0 0 2px #fff, 0 1px 2px rgba(255, 255, 255, 0.98)';
  } else {
    textShadow = '0 1px 3px rgba(0, 0, 0, 0.95), 0 0 2px rgba(0, 0, 0, 0.95)';
    terminalColor = '#ffffff';
    terminalShadow = '0 1px 3px rgba(0, 0, 0, 0.95), 0 0 2px rgba(0, 0, 0, 0.95)';
  }

  agMockup.style.setProperty('--mock-font-primary', primaryHex);
  agMockup.style.setProperty('--mock-font-shadow', textShadow);
  agMockup.style.setProperty('--mock-font-terminal', terminalColor);
  agMockup.style.setProperty('--mock-font-terminal-shadow', terminalShadow);

  // Apply Glassmorphism & Darkness CSS variables
  const currentBlur = state.draftConfig.glassBlur || state.glassBlur || 16;
  const currentDarkness = state.draftConfig.glassDarkness || state.glassDarkness || 70;
  agMockup.style.setProperty('--mock-glass-blur', `${currentBlur}px`);
  agMockup.style.setProperty('--mock-glass-darkness', currentDarkness / 100);

  // Update view mode classes on agMockup
  agMockup.classList.toggle('mode-compact', state.viewMode === 'compact');
  ['left', 'mid', 'right', 'bottom', 'settings'].forEach(slot => {
    agMockup.classList.toggle(`mode-focus-${slot}`, state.viewMode === 'focus' && state.activeSlot === slot);
  });
  agMockup.classList.toggle('mode-split', state.rightPaneMode === 'split');
}

function calculateLuminance(hex) {
  if (typeof hex !== 'string') {
    if (hex && typeof hex === 'object' && hex.primary) {
      hex = hex.primary;
    } else {
      return 255;
    }
  }
  let clean = hex.replace('#', '');
  if (clean.length === 3) clean = clean.split('').map(c => c + c).join('');
  if (clean.length < 6) return 255;
  const r = parseInt(clean.substring(0, 2), 16) || 0;
  const g = parseInt(clean.substring(2, 4), 16) || 0;
  const b = parseInt(clean.substring(4, 6), 16) || 0;
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

// =========================================================================
// 9. Interactive Mockup Canvas Slot Switching & Direct Drag-To-Pan
// =========================================================================
let isDragging = false;
let dragSlot = 'left';
let dragStartX = 0;
let dragStartY = 0;
let dragInitX = 50;
let dragInitY = 50;
let dragMoved = false;

function initMockupInteractions() {
  const slotChineseMap = {
    left: '主对话 (左)',
    mid: '活跃终端 (中)',
    right: '独立侧栏 (右)',
    bottom: '提问输入框 (底)',
    settings: '设置弹窗'
  };

  // Direct Canvas Drag-to-Position on mockup elements
  agMockup.addEventListener('mousedown', (e) => {
    // If clicking close button or controls, ignore drag
    if (e.target.closest('.mock-modal-close') || e.target.closest('#mock-sidebar-settings-btn') || e.target.closest('.mock-traffic-lights') || e.target.closest('.mock-win-controls')) {
      return;
    }

    const slotEl = e.target.closest('[data-slot]');
    if (!slotEl) return;

    dragSlot = slotEl.dataset.slot || 'left';
    selectSlot(dragSlot);

    isDragging = true;
    dragMoved = false;
    dragStartX = e.clientX;
    dragStartY = e.clientY;

    const currentPos = (state.draftConfig[dragSlot] && state.draftConfig[dragSlot].position) || '50% 50%';
    const coords = parsePositionString(currentPos);
    dragInitX = coords.x;
    dragInitY = coords.y;
  });

  window.addEventListener('mousemove', (e) => {
    if (!isDragging) return;

    const dx = e.clientX - dragStartX;
    const dy = e.clientY - dragStartY;

    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
      dragMoved = true;
      document.body.classList.add('is-dragging-slot');

      const rect = agMockup.getBoundingClientRect();
      const deltaXPercent = (dx / (rect.width * 0.45)) * 100;
      const deltaYPercent = (dy / (rect.height * 0.45)) * 100;

      const newX = Math.round(Math.max(0, Math.min(100, dragInitX + deltaXPercent)));
      const newY = Math.round(Math.max(0, Math.min(100, dragInitY + deltaYPercent)));

      updateActiveSlotPosition(newX, newY);

      if (dragCoordHud) {
        dragCoordHud.textContent = `🎯 【${slotChineseMap[dragSlot] || dragSlot}】X: ${newX}% · Y: ${newY}%`;
        dragCoordHud.classList.add('visible');
      }
    }
  });

  window.addEventListener('mouseup', () => {
    if (isDragging) {
      isDragging = false;
      document.body.classList.remove('is-dragging-slot');
      if (dragCoordHud) {
        dragCoordHud.classList.remove('visible');
      }
    }
  });

  // Toggle Mock Settings Dialog Overlay
  if (btnToggleMockSettings) {
    btnToggleMockSettings.onclick = () => {
      state.mockSettingsOpen = !state.mockSettingsOpen;
      mockSettingsOverlay.classList.toggle('active', state.mockSettingsOpen);
      if (state.mockSettingsOpen) {
        selectSlot('settings');
      }
    };
  }

  if (mockSidebarSettingsBtn) {
    mockSidebarSettingsBtn.onclick = (e) => {
      e.stopPropagation();
      state.mockSettingsOpen = true;
      mockSettingsOverlay.classList.add('active');
      selectSlot('settings');
    };
  }

  if (btnCloseMockSettings) {
    btnCloseMockSettings.onclick = (e) => {
      e.stopPropagation();
      state.mockSettingsOpen = false;
      mockSettingsOverlay.classList.remove('active');
      selectSlot('left');
    };
  }
}

function setRightPaneMode(paneMode) {
  state.rightPaneMode = paneMode;
  
  // Update toolbar pills
  const rightPanePills = document.getElementById('right-pane-pills');
  if (rightPanePills) {
    rightPanePills.querySelectorAll('.btn-mode-pill').forEach(b => {
      b.classList.toggle('active', b.dataset.pane === paneMode);
    });
  }

  // Update mockup right pane tabs
  const tabSubagents = document.getElementById('tab-pane-subagents');
  const tabTerminal = document.getElementById('tab-pane-terminal');
  const viewSubagents = document.getElementById('mock-slot-right');
  const viewTerminal = document.getElementById('mock-slot-mid');

  const btnToggleAux = document.getElementById('btn-toggle-aux-pane');

  if (paneMode === 'split') {
    if (agMockup) {
      agMockup.classList.remove('aux-closed');
      agMockup.classList.add('mode-split');
    }
    if (btnToggleAux) btnToggleAux.classList.add('active');
    if (tabSubagents) tabSubagents.classList.add('active');
    if (tabTerminal) tabTerminal.classList.add('active');
    if (viewSubagents) viewSubagents.classList.add('active');
    if (viewTerminal) viewTerminal.classList.add('active');
  } else if (paneMode === 'terminal') {
    if (agMockup) {
      agMockup.classList.remove('aux-closed');
      agMockup.classList.remove('mode-split');
    }
    if (btnToggleAux) btnToggleAux.classList.add('active');
    if (tabSubagents) tabSubagents.classList.remove('active');
    if (tabTerminal) tabTerminal.classList.add('active');
    if (viewSubagents) viewSubagents.classList.remove('active');
    if (viewTerminal) viewTerminal.classList.add('active');
  } else {
    // default subagents (right)
    if (agMockup) {
      agMockup.classList.remove('aux-closed');
      agMockup.classList.remove('mode-split');
    }
    if (btnToggleAux) btnToggleAux.classList.add('active');
    if (tabSubagents) tabSubagents.classList.add('active');
    if (tabTerminal) tabTerminal.classList.remove('active');
    if (viewSubagents) viewSubagents.classList.add('active');
    if (viewTerminal) viewTerminal.classList.remove('active');
  }
}

function selectSlot(slotKey) {
  state.activeSlot = slotKey;

  if (slotKey === 'settings') {
    state.mockSettingsOpen = true;
    if (mockSettingsOverlay) mockSettingsOverlay.classList.add('active');
  } else if (state.mockSettingsOpen) {
    state.mockSettingsOpen = false;
    if (mockSettingsOverlay) mockSettingsOverlay.classList.remove('active');
  }

  if (slotKey === 'mid') {
    setRightPaneMode('terminal');
  } else if (slotKey === 'right') {
    setRightPaneMode('subagents');
  }

  renderSlotInspector();
  renderMockupPreview();
}

// =========================================================================
// 10. Preview Stage Toolbar Controls (View Modes, Video, Vanilla Peek, Quick Preset)
// =========================================================================
function initPreviewToolbar() {
  // 1. View Mode Switcher (Full / Compact / Focus)
  if (viewModePills) {
    viewModePills.querySelectorAll('.btn-mode-pill').forEach(btn => {
      btn.onclick = () => {
        viewModePills.querySelectorAll('.btn-mode-pill').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.viewMode = btn.dataset.mode;
        renderMockupPreview();
        showToast(`已切换视窗模式: ${btn.textContent.trim()}`);
      };
    });
  }

  // 1.1 Right Pane View Switcher (Subagents / Terminal / Split)
  const rightPanePills = document.getElementById('right-pane-pills');
  if (rightPanePills) {
    rightPanePills.querySelectorAll('.btn-mode-pill').forEach(btn => {
      btn.onclick = () => {
        const pane = btn.dataset.pane;
        setRightPaneMode(pane);
        if (pane === 'terminal') selectSlot('mid');
        else if (pane === 'subagents') selectSlot('right');
        showToast(`已切换右侧栏视图: ${btn.textContent.trim()}`);
      };
    });
  }

  // 1.2 Right Pane Internal Tabs & Split Button
  const tabSub = document.getElementById('tab-pane-subagents');
  const tabTerm = document.getElementById('tab-pane-terminal');
  const btnSplit = document.getElementById('btn-pane-split');
  if (tabSub) tabSub.onclick = () => { setRightPaneMode('subagents'); selectSlot('right'); };
  if (tabTerm) tabTerm.onclick = () => { setRightPaneMode('terminal'); selectSlot('mid'); };
  if (btnSplit) btnSplit.onclick = () => {
    const nextMode = state.rightPaneMode === 'split' ? 'subagents' : 'split';
    setRightPaneMode(nextMode);
    showToast(nextMode === 'split' ? '已开启分屏双显 (同时展示任务与终端)' : '已恢复单栏显示');
  };

  // 1.3 Header auxiliary pane toggle button
  const btnToggleAux = document.getElementById('btn-toggle-aux-pane');
  if (btnToggleAux && agMockup) {
    btnToggleAux.onclick = () => {
      const isClosed = agMockup.classList.toggle('aux-closed');
      btnToggleAux.classList.toggle('active', !isClosed);
      showToast(isClosed ? '已收起右侧副栏 (主对话更宽阔)' : '已展开右侧副栏');
      updateMockupScale();
    };
  }

  // 1.3.1 Toggle Chat Messages Visibility (Pure Wallpaper Mode)
  const btnToggleChat = document.getElementById('btn-toggle-chat-visibility');
  const btnTogglePureWp = document.getElementById('btn-toggle-pure-wallpaper');

  function setChatVisibility(hide) {
    if (!agMockup) return;
    agMockup.classList.toggle('hide-chat', hide);
    if (btnToggleChat) btnToggleChat.classList.toggle('active', hide);
    if (btnTogglePureWp) {
      btnTogglePureWp.classList.toggle('active', hide);
      btnTogglePureWp.innerHTML = hide
        ? '💬 <span class="pure-wp-text">恢复对话</span>'
        : '🖼️ <span class="pure-wp-text">纯壁纸</span>';
    }
    showToast(hide ? '已开启【纯净壁纸观赏】模式（隐藏对话文字）' : '已恢复对话文字显示');
  }

  if (btnToggleChat) {
    btnToggleChat.onclick = () => {
      setChatVisibility(!agMockup.classList.contains('hide-chat'));
    };
  }
  if (btnTogglePureWp) {
    btnTogglePureWp.onclick = () => {
      setChatVisibility(!agMockup.classList.contains('hide-chat'));
    };
  }

  // 2. Video Play / Pause Toggle
  if (btnTogglePlay && playIcon) {
    btnTogglePlay.onclick = () => {
      state.isVideoPlaying = !state.isVideoPlaying;
      playIcon.textContent = state.isVideoPlaying ? '⏸️' : '▶️';
      agMockup.querySelectorAll('.mock-media-video').forEach(vid => {
        if (state.isVideoPlaying) vid.play().catch(() => {});
        else vid.pause();
      });
      showToast(state.isVideoPlaying ? '已恢复动态壁纸播放' : '已暂停动态壁纸 (方便进行像素级对齐)');
    };
  }

  // 3. Audio Mute / Unmute Toggle (Listen to Wallpaper Engine BGM)
  if (btnToggleAudio && audioIcon) {
    btnToggleAudio.onclick = () => {
      state.isAudioMuted = !state.isAudioMuted;
      audioIcon.textContent = state.isAudioMuted ? '🔇' : '🔊';
      agMockup.querySelectorAll('.mock-media-video').forEach(vid => {
        vid.muted = state.isAudioMuted;
      });
      showToast(state.isAudioMuted ? '动态壁纸音频已静音' : '🔊 动态壁纸音频已开启 (正在试听素材原声音频)');
    };
  }

  // 4. Video Speed Selector
  if (videoSpeedSelect) {
    videoSpeedSelect.onchange = () => {
      state.videoSpeed = parseFloat(videoSpeedSelect.value) || 1.0;
      agMockup.querySelectorAll('.mock-media-video').forEach(vid => {
        vid.playbackRate = state.videoSpeed;
      });
      showToast(`动态壁纸播放倍速已设为 ${state.videoSpeed}x`);
    };
  }

  // 5. "按住对比官方原版" (Hold to Peek Vanilla)
  if (btnPeekVanilla) {
    const startPeek = () => {
      agMockup.classList.add('peek-vanilla');
      btnPeekVanilla.classList.add('active');
    };
    const endPeek = () => {
      agMockup.classList.remove('peek-vanilla');
      btnPeekVanilla.classList.remove('active');
    };

    btnPeekVanilla.addEventListener('mousedown', startPeek);
    btnPeekVanilla.addEventListener('mouseup', endPeek);
    btnPeekVanilla.addEventListener('mouseleave', endPeek);
    btnPeekVanilla.addEventListener('touchstart', startPeek);
    btnPeekVanilla.addEventListener('touchend', endPeek);
  }

  // 6. Quick Preset Dropdown Switcher
  if (quickPresetSelect) {
    quickPresetSelect.onchange = () => {
      const val = quickPresetSelect.value;
      if (!val) return;

      if (val === '__baseline__') {
        state.draftConfig = {
          left: { file: 'left_wallpaper.jpg', type: 'image', position: 'center center' },
          mid: { file: 'mid_wallpaper.jpg', type: 'image', position: 'center 20%' },
          right: { file: 'right_wallpaper.jpg', type: 'image', position: 'center 20%' },
          bottom: { file: 'input_wallpaper.jpg', type: 'image', position: 'center 6%' },
          settings: { file: 'settings_wallpaper.png', type: 'image', position: 'center 65%' },
          fontColor: { primary: '#ffffff' }
        };
        cleanBlobUrls();
        setDraftDirty(true);
        renderSlotInspector();
        renderMockupPreview();
        showToast('已在工作区装配【初版黄金基线】预览！');
      } else if (val === '__vanilla__') {
        state.draftConfig = {
          left: { file: '', type: 'vanilla', position: 'center center' },
          mid: { file: '', type: 'vanilla', position: 'center center' },
          right: { file: '', type: 'vanilla', position: 'center center' },
          bottom: { file: '', type: 'vanilla', position: 'center center' },
          settings: { file: '', type: 'vanilla', position: 'center center' },
          fontColor: { primary: '#ffffff' }
        };
        cleanBlobUrls();
        setDraftDirty(true);
        renderSlotInspector();
        renderMockupPreview();
        showToast('已在工作区装配【官方原版纯净】预览！');
      } else {
        const p = state.presets.find(item => item.name === val);
        if (p && p.slotsConfig) {
          state.draftConfig = JSON.parse(JSON.stringify(p.slotsConfig));
          cleanBlobUrls();
          setDraftDirty(true);
          renderSlotInspector();
          renderMockupPreview();
          showToast(`已在工作区装配预设【${p.name}】预览！`);
        }
      }
    };
  }
}

function renderQuickPresetSelect() {
  if (!quickPresetSelect) return;
  const currentVal = quickPresetSelect.value;
  quickPresetSelect.innerHTML = '<option value="">(快速载入预设方案...)</option>';
  
  quickPresetSelect.innerHTML += '<option value="__baseline__">🌟 初版黄金基线</option>';
  quickPresetSelect.innerHTML += '<option value="__vanilla__">🛡️ 官方原版纯净</option>';

  if (state.presets && state.presets.length > 0) {
    state.presets.forEach(p => {
      const opt = document.createElement('option');
      opt.value = p.name;
      opt.textContent = `📦 ${p.name}`;
      quickPresetSelect.appendChild(opt);
    });
  }

  if (currentVal) quickPresetSelect.value = currentVal;
}

// =========================================================================
// 10.1 Responsive Auto-Fit & Dynamic Zoom System
// =========================================================================
function updateMockupScale() {
  if (!mockupViewport || !mockupScaler || !agMockup) return;
  if (!state.isAutoFit) return;

  const vpW = mockupViewport.clientWidth;
  const vpH = mockupViewport.clientHeight;

  if (!vpW || !vpH) return;

  // Base dimensions: standard 1360 x 780, compact mode 1360 x 520
  const isCompact = agMockup.classList.contains('mode-compact');
  const baseW = 1360;
  const baseH = isCompact ? 520 : 780;

  // 16px total breathing margin (8px on each boundary)
  const availW = Math.max(100, vpW - 16);
  const availH = Math.max(100, vpH - 16);

  const scale = Math.min(availW / baseW, availH / baseH);
  // Clamp scale safely between 0.30 and 1.35
  const fitScale = Math.max(0.30, Math.min(scale, 1.35));

  state.zoomLevel = Math.round(fitScale * 100);

  mockupScaler.style.transform = `scale(${fitScale})`;
  if (zoomLevelLabel) {
    zoomLevelLabel.textContent = `${state.zoomLevel}%`;
  }
  if (btnAutoFit) {
    btnAutoFit.classList.add('active');
  }
}

function setManualScale(zoomPercent) {
  if (!mockupScaler) return;
  state.isAutoFit = false;
  state.zoomLevel = Math.max(30, Math.min(200, zoomPercent));
  const scale = state.zoomLevel / 100;
  mockupScaler.style.transform = `scale(${scale})`;
  if (zoomLevelLabel) {
    zoomLevelLabel.textContent = `${state.zoomLevel}%`;
  }
  if (btnAutoFit) {
    btnAutoFit.classList.remove('active');
  }
}

function initResponsiveAutoFit() {
  if (btnAutoFit) {
    btnAutoFit.onclick = () => {
      state.isAutoFit = true;
      btnAutoFit.classList.add('active');
      updateMockupScale();
      showToast('已开启全自适应缩放 (视口完整铺满)');
    };
  }

  if (btnZoomIn) {
    btnZoomIn.onclick = () => {
      const next = Math.min(200, Math.round(state.zoomLevel / 10) * 10 + 10);
      setManualScale(next);
    };
  }

  if (btnZoomOut) {
    btnZoomOut.onclick = () => {
      const next = Math.max(30, Math.round(state.zoomLevel / 10) * 10 - 10);
      setManualScale(next);
    };
  }

  if (btnZoom100) {
    btnZoom100.onclick = () => {
      setManualScale(100);
      showToast('已还原为 100% 原始尺寸');
    };
  }

  // Inspector Collapse / Expand Controls
  const btnToggleInspector = document.getElementById('btn-toggle-inspector');
  const btnExpandInspector = document.getElementById('btn-expand-inspector');
  const inspectorPanel = document.getElementById('inspector-panel');
  const workspaceContainer = document.querySelector('.workspace-container');

  function setInspectorCollapsed(collapsed) {
    if (workspaceContainer) workspaceContainer.classList.toggle('inspector-collapsed', collapsed);
    if (inspectorPanel) inspectorPanel.classList.toggle('is-collapsed', collapsed);
    setTimeout(updateMockupScale, 80);
    setTimeout(updateMockupScale, 260);
  }

  if (btnToggleInspector) {
    btnToggleInspector.onclick = () => {
      setInspectorCollapsed(true);
      showToast('已收起参数面板 (全景超宽视口)');
    };
  }
  if (btnExpandInspector) {
    btnExpandInspector.onclick = () => {
      setInspectorCollapsed(false);
      showToast('已展开参数面板');
    };
  }

  // Window resize handler
  window.addEventListener('resize', () => {
    if (state.isAutoFit && state.activeTab === 'view-preview') {
      updateMockupScale();
    }
  });

  // ResizeObserver for container changes (e.g. Inspector drawer collapse)
  if (window.ResizeObserver && mockupViewport) {
    const ro = new ResizeObserver(() => {
      if (state.isAutoFit && state.activeTab === 'view-preview') {
        updateMockupScale();
      }
    });
    ro.observe(mockupViewport);
  }

  // Initial scaling triggers
  requestAnimationFrame(updateMockupScale);
  setTimeout(updateMockupScale, 150);
  setTimeout(updateMockupScale, 500);
}

// =========================================================================
// 11. Material File Handling (Native Browse, Drag & Drop, Blob Preview)
// =========================================================================
async function handleNativeBrowse() {
  if (fileInput) {
    fileInput.value = '';
    fileInput.click();
    return;
  }
  try {
    showToast('正在打开本地文件选择器...', 2000);
    const res = await fetch('/api/file/browse', { method: 'POST' });
    const data = await res.json();
    if (data.success && data.filePath) {
      stageSlotFilePath(state.activeSlot, data.filePath);
    }
  } catch (e) {
    showToast('选择文件失败: ' + e.message);
  }
}

function handleBrowserFile(file) {
  if (!file) return;
  const slot = state.activeSlot;
  
  if (state.blobUrls[slot]) {
    try { URL.revokeObjectURL(state.blobUrls[slot]); } catch (_) {}
  }

  const blobUrl = URL.createObjectURL(file);
  state.blobUrls[slot] = blobUrl;
  state.pendingFiles[slot] = file;

  if (!state.draftConfig[slot]) state.draftConfig[slot] = {};
  state.draftConfig[slot].stagedFileName = file.name;
  state.draftConfig[slot].type = file.type.startsWith('video/') ? 'video' : 'image';

  setDraftDirty(true);
  renderSlotInspector();
  renderMockupPreview();
  showToast(`已装载本地素材 [${file.name}] 到工作区预览！在视窗可直接鼠标拖拽对齐`);
}

function stageSlotFilePath(slot, filePath) {
  if (!state.draftConfig[slot]) state.draftConfig[slot] = {};
  state.draftConfig[slot].stagedFilePath = filePath;
  state.draftConfig[slot].stagedFileName = filePath.split(/[\\/]/).pop();
  state.draftConfig[slot].type = filePath.match(/\.(mp4|webm|mov)$/i) ? 'video' : 'image';

  if (state.blobUrls[slot]) {
    try { URL.revokeObjectURL(state.blobUrls[slot]); } catch (_) {}
    delete state.blobUrls[slot];
    delete state.pendingFiles[slot];
  }

  setDraftDirty(true);
  selectSlot(slot);
  showToast(`✨ 已成功装配【${state.draftConfig[slot].stagedFileName}】到【${slot}】槽位并实时预览！`);
}

// =========================================================================
// 12. Steam Wallpaper Engine Quick In-Place Picker Modal
// =========================================================================
function initWeQuickPicker() {
  if (btnOpenWePicker) {
    btnOpenWePicker.onclick = async () => {
      wePickerModal.classList.add('active');
      if (!state.weList || state.weList.length === 0) {
        await fetchWeList();
      }
      renderWePickerGrid();
      if (wePickerSearchInput) {
        wePickerSearchInput.value = '';
        wePickerSearchInput.focus();
      }
    };
  }

  if (btnCloseWePicker) btnCloseWePicker.onclick = () => wePickerModal.classList.remove('active');
  if (btnCancelWePicker) btnCancelWePicker.onclick = () => wePickerModal.classList.remove('active');

  if (wePickerSearchInput) {
    wePickerSearchInput.oninput = () => renderWePickerGrid();
  }
}

function renderWePickerGrid() {
  if (!wePickerGrid) return;
  wePickerGrid.innerHTML = '';

  const filterText = wePickerSearchInput ? wePickerSearchInput.value.trim().toLowerCase() : '';
  const filtered = state.weList.filter(item => {
    if (!filterText) return true;
    return (item.title && item.title.toLowerCase().includes(filterText)) ||
           (item.workshopId && item.workshopId.includes(filterText));
  });

  if (wePickerCount) {
    wePickerCount.textContent = `${filtered.length} 项`;
  }

  if (filtered.length === 0) {
    wePickerGrid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 40px; color: var(--text-dim);">未找到符合条件的壁纸</div>';
    return;
  }

  filtered.slice(0, 80).forEach(item => {
    const card = document.createElement('div');
    card.className = 'we-picker-item';

    const thumbUrl = item.previewPath
      ? `/api/preview-file?path=${encodeURIComponent(item.previewPath)}`
      : `/api/preview-file?path=${encodeURIComponent(item.mediaPath)}`;
    const isVid = item.mediaType === 'video';

    card.innerHTML = `
      <img class="we-picker-thumb" src="${thumbUrl}" alt="" loading="lazy" onerror="this.src='data:image/svg+xml;utf8,<svg xmlns=\\'http://www.w3.org/2000/svg\\' width=\\'100\\' height=\\'60\\' fill=\\'%23111\\'><rect width=\\'100\\' height=\\'60\\'/></svg>'">
      <div class="we-picker-info">
        <div class="we-picker-title" title="${item.title}">${item.title}</div>
        <div class="we-picker-meta">
          <span>${isVid ? '🎬 视频' : '🖼️ 图像'}</span>
          <span>${item.sizeMb || 0} MB</span>
        </div>
      </div>
    `;

    card.onclick = () => {
      stageSlotFilePath(state.activeSlot, item.mediaPath);
      wePickerModal.classList.remove('active');
      showToast(`✨ 已装配壁纸【${item.title}】到【${state.activeSlot}】并在视窗 0ms 实时预览！`);
    };

    wePickerGrid.appendChild(card);
  });
}

// =========================================================================
// 13. Draft Actions (Commit & Discard)
// =========================================================================
async function commitDraftToAntigravity() {
  // Safety check: if user is unpatched, proactively alert and offer one-click injection
  if (state.patchStatus && !state.patchStatus.isPatched) {
    const shouldInject = confirm(
      '⚠️ 检测到 Antigravity 客户端尚未注入美化底层！\n\n' +
      '若不注入底层，官方客户端将无法加载自定义透明毛玻璃与全景壁纸。\n\n' +
      '点击【确定】立即一键注入美化底层，\n点击【取消】则仅保存配置到磁盘。'
    );
    if (shouldInject) {
      await executeInstallPatch();
    }
  }

  btnCommitDraft.disabled = true;
  const originalText = btnCommitDraft.innerHTML;
  btnCommitDraft.innerHTML = `<span>⏳ 正在正式应用并固化...</span>`;
  showToast('🚀 正在将工作区全套方案批量写入 Antigravity 客户端...', 6000);

  try {
    // 1. Upload any pending in-memory browser files first
    for (const [slot, file] of Object.entries(state.pendingFiles)) {
      if (file) {
        showToast(`正在传输槽位 [${slot}] 媒体素材...`, 4000);
        const url = `/api/upload?slot=${encodeURIComponent(slot)}&filename=${encodeURIComponent(file.name)}`;
        const upRes = await fetch(url, {
          method: 'POST',
          body: file,
          headers: { 'Content-Type': 'application/octet-stream' }
        });
        const upData = await upRes.json();
        if (upData.success && upData.filePath) {
          state.draftConfig[slot].stagedFilePath = upData.filePath;
        }
      }
    }

    // 2. Batch commit draft configuration
    const res = await fetch('/api/theme/apply-draft', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        draftConfig: state.draftConfig,
        fontColor: state.draftConfig.fontColor
      })
    });
    const data = await res.json();

    if (data.success) {
      cleanBlobUrls();
      setDraftDirty(false);

      if (state.isCdpOnline) {
        showToast('✨ 全套视觉配置已正式生效！CDP 0.3s 极速热更新完成！', 4000);
      } else if (state.patchStatus && state.patchStatus.isPatched) {
        showToast('✨ 配置已固化！请重启一次 Antigravity 客户端使其生效并激活热更新', 6000);
      } else {
        showToast('⚠️ 配置已保存！但需点击顶部【一键注入底层】并重启客户端方可在应用内显示', 6000);
      }
      await fetchStatus();
    } else {
      showToast('❌ 正式应用失败: ' + (data.error || '未知错误'), 5000);
    }
  } catch (e) {
    showToast('❌ 正式应用失败: ' + e.message, 5000);
  } finally {
    btnCommitDraft.disabled = false;
    btnCommitDraft.innerHTML = originalText;
  }
}

function discardDraftChanges() {
  if (!confirm('确定要放弃当前工作区未保存的预览调节，还原为客户端当前生效配置吗？')) return;
  cleanBlobUrls();
  state.draftConfig = JSON.parse(JSON.stringify(state.slotsConfig || {}));
  setDraftDirty(false);
  renderSlotInspector();
  renderMockupPreview();
  showToast('已放弃未应用的草稿调节，还原为客户端当前配置');
}

// =========================================================================
// 14. Alignment & Position Controls
// =========================================================================
function updateActiveSlotPosition(x, y) {
  const slot = state.activeSlot;
  if (!state.draftConfig[slot]) state.draftConfig[slot] = {};
  state.draftConfig[slot].position = `${x}% ${y}%`;
  
  sliderPosX.value = x;
  sliderPosY.value = y;
  valPosX.textContent = `${x}%`;
  valPosY.textContent = `${y}%`;

  setDraftDirty(true);
  renderMockupPreview();
}

function initPositionControls() {
  sliderPosX.oninput = () => {
    updateActiveSlotPosition(sliderPosX.value, sliderPosY.value);
  };
  sliderPosY.oninput = () => {
    updateActiveSlotPosition(sliderPosX.value, sliderPosY.value);
  };

  btnResetPos.onclick = () => {
    const slot = state.activeSlot;
    const meta = state.slotsMeta[slot] || {};
    const defaultPos = meta.defaultPosition || 'center center';
    const coords = parsePositionString(defaultPos);
    updateActiveSlotPosition(coords.x, coords.y);
    showToast(`槽位 [${slot}] 对齐位置已重置为默认基准`);
  };

  btnResetAllPos.onclick = () => {
    if (!confirm('确定要重置所有 5 个槽位的对齐位置为默认基准值吗？')) return;
    for (const [sKey, meta] of Object.entries(state.slotsMeta)) {
      if (!state.draftConfig[sKey]) state.draftConfig[sKey] = {};
      state.draftConfig[sKey].position = meta.defaultPosition || 'center center';
    }
    const currentCoords = parsePositionString(state.draftConfig[state.activeSlot].position);
    updateActiveSlotPosition(currentCoords.x, currentCoords.y);
    showToast('全部 5 大槽位对齐位置已重置为默认基准');
  };

  if (btnRestoreSlotVanilla) {
    btnRestoreSlotVanilla.onclick = () => {
      const slot = state.activeSlot;
      const meta = state.slotsMeta[slot] || {};

      if (state.blobUrls[slot]) {
        try { URL.revokeObjectURL(state.blobUrls[slot]); } catch (_) {}
        delete state.blobUrls[slot];
        delete state.pendingFiles[slot];
      }
      if (!state.draftConfig[slot]) state.draftConfig[slot] = {};
      state.draftConfig[slot].key = slot;
      state.draftConfig[slot].file = '';
      state.draftConfig[slot].type = 'none';
      state.draftConfig[slot].isOriginal = true;
      delete state.draftConfig[slot].stagedFilePath;
      delete state.draftConfig[slot].stagedFileName;
      delete state.draftConfig[slot].poster;

      setDraftDirty(true);
      renderSlotInspector();
      renderMockupPreview();
      showToast(`🛡️ 已将【${meta.desc || slot}】恢复为官方原版纯净样式（点击上方“应用生效”即可生效）`);
    };
  }

  btnResetSlot.onclick = () => {
    const slot = state.activeSlot;
    const meta = state.slotsMeta[slot] || {};
    if (!confirm(`确定要重置槽位 [${meta.desc || slot}] 的素材为默认官方壁纸吗？`)) return;
    
    if (state.blobUrls[slot]) {
      try { URL.revokeObjectURL(state.blobUrls[slot]); } catch (_) {}
      delete state.blobUrls[slot];
      delete state.pendingFiles[slot];
    }
    if (!state.draftConfig[slot]) state.draftConfig[slot] = {};
    state.draftConfig[slot].file = meta.defaultFile || `${slot}_wallpaper.jpg`;
    state.draftConfig[slot].type = 'image';
    delete state.draftConfig[slot].stagedFilePath;
    delete state.draftConfig[slot].stagedFileName;

    setDraftDirty(true);
    renderSlotInspector();
    renderMockupPreview();
    showToast(`槽位 [${meta.desc || slot}] 素材已重置为默认官方壁纸`);
  };

  // Glassmorphism Sliders
  if (sliderGlassBlur && valGlassBlur) {
    sliderGlassBlur.oninput = () => {
      const val = parseInt(sliderGlassBlur.value, 10);
      valGlassBlur.textContent = `${val}px`;
      state.glassBlur = val;
      if (!state.draftConfig) state.draftConfig = {};
      state.draftConfig.glassBlur = val;
      setDraftDirty(true);
      renderMockupPreview();
    };
  }

  if (sliderGlassDarkness && valGlassDarkness) {
    sliderGlassDarkness.oninput = () => {
      const val = parseInt(sliderGlassDarkness.value, 10);
      valGlassDarkness.textContent = `${val}%`;
      state.glassDarkness = val;
      if (!state.draftConfig) state.draftConfig = {};
      state.draftConfig.glassDarkness = val;
      setDraftDirty(true);
      renderMockupPreview();
    };
  }

  if (btnResetGlass) {
    btnResetGlass.onclick = () => {
      state.glassBlur = 16;
      state.glassDarkness = 70;
      if (sliderGlassBlur) sliderGlassBlur.value = 16;
      if (valGlassBlur) valGlassBlur.textContent = '16px';
      if (sliderGlassDarkness) sliderGlassDarkness.value = 70;
      if (valGlassDarkness) valGlassDarkness.textContent = '70%';
      if (state.draftConfig) {
        state.draftConfig.glassBlur = 16;
        state.draftConfig.glassDarkness = 70;
      }
      setDraftDirty(true);
      renderMockupPreview();
      showToast('毛玻璃与遮罩暗度已重置为默认基准');
    };
  }
}

// =========================================================================
// 15. Typography & High-Contrast Presets
// =========================================================================
function renderFontPresets() {
  fontPresetsGrid.innerHTML = '';
  let currentFontHex = '#ffffff';
  const fontConf = (state.draftConfig && state.draftConfig.fontColor) || (state.slotsConfig && state.slotsConfig.fontColor);
  if (fontConf) {
    if (typeof fontConf === 'string') currentFontHex = fontConf;
    else if (fontConf.primary) currentFontHex = fontConf.primary;
  }

  if (state.fontPresets) {
    for (const [key, preset] of Object.entries(state.fontPresets)) {
      const btn = document.createElement('button');
      btn.className = 'font-preset-btn';
      btn.innerHTML = `
        <span class="font-dot" style="background-color: ${preset.primary};"></span>
        <span>${preset.name.split(' ')[0]}</span>
      `;
      btn.onclick = () => {
        applyDraftFont(preset);
      };
      fontPresetsGrid.appendChild(btn);
    }
  }

  fontColorPicker.value = (typeof currentFontHex === 'string' && currentFontHex.length === 7) ? currentFontHex : '#ffffff';
  fontHexInput.value = currentFontHex;
}

function applyDraftFont(presetOrHex) {
  if (typeof presetOrHex === 'string') {
    state.draftConfig.fontColor = {
      primary: presetOrHex,
      name: '自定义配色'
    };
  } else {
    state.draftConfig.fontColor = presetOrHex;
  }
  setDraftDirty(true);
  renderMockupPreview();
  showToast(`字体配色已更新预览！`);
}

function initFontControls() {
  fontColorPicker.oninput = () => {
    fontHexInput.value = fontColorPicker.value;
    applyDraftFont(fontColorPicker.value);
  };

  fontHexInput.oninput = () => {
    if (fontHexInput.value.startsWith('#') && fontHexInput.value.length === 7) {
      fontColorPicker.value = fontHexInput.value;
      applyDraftFont(fontHexInput.value);
    }
  };

  btnApplyFont.onclick = () => {
    const val = fontHexInput.value.trim();
    if (val) applyDraftFont(val);
  };

  btnResetFont.onclick = () => {
    applyDraftFont('#ffffff');
    fontColorPicker.value = '#ffffff';
    fontHexInput.value = '#ffffff';
    showToast('字体配色已重置为默认纯白高对比 (#ffffff)');
  };
}

// =========================================================================
// 16. Dedicated Presets Management (View 2)
// =========================================================================
function renderPresetsList() {
  if (!presetListEl) return;
  presetListEl.innerHTML = '';

  const filterText = presetSearchInput ? presetSearchInput.value.trim().toLowerCase() : '';

  // 1. Baseline System Preset
  if (!filterText || '初版黄金基线 baseline'.includes(filterText)) {
    const baselineCard = document.createElement('div');
    baselineCard.className = 'preset-card system-preset';
    baselineCard.innerHTML = `
      <div class="preset-header">
        <div class="preset-title-wrap">
          <h4>🌟 初版黄金基线</h4>
          <span class="preset-badge-system">系统基线</span>
        </div>
        <span class="preset-date">官方默认</span>
      </div>
      <div class="preset-meta-tags">
        <span class="preset-tag">💾 完整底图</span>
        <span class="preset-tag">📦 5 槽位</span>
        <span class="preset-tag">🔤 纯白高对比</span>
      </div>
      <div class="preset-slots-preview">
        <span class="slot-pill-tag">主对话: 图像</span>
        <span class="slot-pill-tag">活跃终端: 图像</span>
        <span class="slot-pill-tag">独立侧栏: 图像</span>
        <span class="slot-pill-tag">提问输入: 图像</span>
        <span class="slot-pill-tag">设置弹窗: 图像</span>
      </div>
      <div class="preset-actions-bar">
        <button class="btn btn-secondary btn-sm btn-preview-preset" id="btn-preview-baseline">
          🖥️ 在工作区预览
        </button>
        <button class="btn btn-primary btn-sm btn-apply-preset" id="btn-apply-baseline-preset">
          🚀 立即应用
        </button>
      </div>
    `;

    baselineCard.querySelector('#btn-preview-baseline').onclick = async () => {
      showToast('正在工作区加载【初版黄金基线】预览...');
      try {
        state.draftConfig = {
          left: { file: 'left_wallpaper.jpg', type: 'image', position: 'center center' },
          mid: { file: 'mid_wallpaper.jpg', type: 'image', position: 'center 20%' },
          right: { file: 'right_wallpaper.jpg', type: 'image', position: 'center 20%' },
          bottom: { file: 'input_wallpaper.jpg', type: 'image', position: 'center 6%' },
          settings: { file: 'settings_wallpaper.png', type: 'image', position: 'center 65%' },
          fontColor: { primary: '#ffffff' }
        };
        cleanBlobUrls();
        setDraftDirty(true);
        switchTab('view-preview');
        renderSlotInspector();
        renderMockupPreview();
        showToast('已在工作区装配【初版黄金基线】预览，满意后可点击正式应用！');
      } catch (e) {
        showToast('预览基线失败: ' + e.message);
      }
    };

    baselineCard.querySelector('#btn-apply-baseline-preset').onclick = async () => {
      if (state.patchStatus && !state.patchStatus.isPatched) {
        const shouldInject = confirm(
          '⚠️ 检测到 Antigravity 客户端尚未注入美化底层！\n\n' +
          '若不注入底层，官方客户端将无法加载基线壁纸与动态效果。\n\n' +
          '点击【确定】立即一键注入美化底层，\n点击【取消】仅应用配置到磁盘。'
        );
        if (shouldInject) {
          await executeInstallPatch();
        }
      }
      try {
        showToast('正在应用【初版黄金基线】...', 2500);
        const res = await fetch('/api/theme/baseline', { method: 'POST' });
        const data = await res.json();
        if (data.success) {
          cleanBlobUrls();
          setDraftDirty(false);
          if (state.isCdpOnline) {
            showToast('✨ 已成功应用【初版黄金基线】！0.3s 热重载生效');
          } else if (state.patchStatus && state.patchStatus.isPatched) {
            showToast('✨ 已成功应用【初版黄金基线】！请重启一次客户端使其生效', 6000);
          } else {
            showToast('⚠️ 配置已应用！需点击【一键注入底层】并重启客户端方可在应用内显示', 6000);
          }
          await fetchStatus();
        } else {
          showToast('应用基线失败: ' + (data.error || '未知错误'));
        }
      } catch (e) {
        showToast('应用基线失败: ' + e.message);
      }
    };

    presetListEl.appendChild(baselineCard);
  }

  // 2. Vanilla System Preset
  if (!filterText || '官方原版纯净 vanilla'.includes(filterText)) {
    const vanillaCard = document.createElement('div');
    vanillaCard.className = 'preset-card system-preset';
    vanillaCard.innerHTML = `
      <div class="preset-header">
        <div class="preset-title-wrap">
          <h4>🛡️ 官方原版纯净</h4>
          <span class="preset-badge-system" style="background:rgba(255,255,255,0.08);color:#e2e8f0;border-color:rgba(255,255,255,0.16);">官方出厂</span>
        </div>
        <span class="preset-date">零素材占用</span>
      </div>
      <div class="preset-meta-tags">
        <span class="preset-tag">⚡ 零素材占用</span>
        <span class="preset-tag">🔤 原生极简</span>
      </div>
      <div class="preset-slots-preview">
        <span class="slot-pill-tag">主对话: 无</span>
        <span class="slot-pill-tag">活跃终端: 无</span>
        <span class="slot-pill-tag">提问输入: 无</span>
      </div>
      <div class="preset-actions-bar">
        <button class="btn btn-primary btn-sm btn-apply-preset" id="btn-apply-vanilla-preset">
          🚀 立即应用官方原版
        </button>
      </div>
    `;

    vanillaCard.querySelector('#btn-apply-vanilla-preset').onclick = async () => {
      if (!confirm('确定要切换为官方原版纯净模式吗？\n（当前美化状态将自动暂存为预设快照）')) return;
      try {
        showToast('正在还原官方原版...', 2500);
        const res = await fetch('/api/theme/vanilla', { method: 'POST' });
        const data = await res.json();
        if (data.success) {
          cleanBlobUrls();
          setDraftDirty(false);
          showToast('✨ 已成功切换为官方原版纯净模式！');
          await fetchStatus();
        } else {
          showToast('还原原版失败: ' + (data.error || '未知错误'));
        }
      } catch (e) {
        showToast('还原原版失败: ' + e.message);
      }
    };

    presetListEl.appendChild(vanillaCard);
  }

  // 3. User Saved Presets
  if (state.presets && state.presets.length > 0) {
    state.presets.forEach(p => {
      if (filterText && !p.name.toLowerCase().includes(filterText)) return;

      const userCard = document.createElement('div');
      userCard.className = 'preset-card';

      const slotChineseMap = {
        left: '主对话',
        mid: '活跃终端',
        right: '独立侧栏',
        bottom: '提问输入',
        settings: '设置弹窗'
      };

      const slotTagsHtml = [];
      if (p.slotsConfig) {
        for (const [sKey, sConf] of Object.entries(p.slotsConfig)) {
          if (sKey === 'fontColor' || sKey === 'isOriginal' || !sConf || typeof sConf !== 'object') continue;
          const label = slotChineseMap[sKey] || sKey;
          const isVid = sConf.type === 'video' || (sConf.file && sConf.file.match(/\.(mp4|webm)$/i));
          const typeStr = isVid ? '视频' : '图像';
          slotTagsHtml.push(`<span class="slot-pill-tag ${isVid ? 'video' : ''}">${label}: ${typeStr}</span>`);
        }
      }

      const sizeStr = p.totalSizeFormatted || (p.totalSize ? (p.totalSize / 1024 / 1024).toFixed(1) + ' MB' : '');
      const countStr = `${p.fileCount || (p.files ? p.files.length : '5')} 素材`;
      const fontName = p.slotsConfig?.fontColor?.name?.split(' ')[0] || '纯白';
      const timeStr = p.createdAtFormatted || (p.createdAt ? new Date(p.createdAt).toLocaleDateString() : '');

      userCard.innerHTML = `
        <div class="preset-header">
          <div class="preset-title-wrap">
            <h4>📦 ${p.name}</h4>
            <span class="preset-badge-user">我的预设</span>
          </div>
          <span class="preset-date">${timeStr}</span>
        </div>
        <div class="preset-meta-tags">
          ${sizeStr ? `<span class="preset-tag">💾 ${sizeStr}</span>` : ''}
          <span class="preset-tag">📦 ${countStr}</span>
          <span class="preset-tag">🔤 ${fontName}</span>
        </div>
        <div class="preset-slots-preview">
          ${slotTagsHtml.join('')}
        </div>
        <div class="preset-actions-bar">
          <button class="btn btn-secondary btn-sm btn-preview-user-p" data-name="${p.name}">
            🖥️ 在工作区预览
          </button>
          <button class="btn btn-primary btn-sm btn-apply-preset btn-apply-user-p" data-name="${p.name}">
            🚀 立即应用
          </button>
          <button class="btn btn-danger-ghost btn-sm btn-del-p" data-name="${p.name}">
            🗑️ 删除
          </button>
        </div>
      `;

      userCard.querySelector('.btn-preview-user-p').onclick = () => {
        if (p.slotsConfig) {
          state.draftConfig = JSON.parse(JSON.stringify(p.slotsConfig));
          cleanBlobUrls();
          setDraftDirty(true);
          switchTab('view-preview');
          renderSlotInspector();
          renderMockupPreview();
          showToast(`已在工作区装配预设【${p.name}】预览，满意后可点击正式应用！`);
        }
      };

      userCard.querySelector('.btn-apply-user-p').onclick = () => applyPresetDirectly(p.name);

      userCard.querySelector('.btn-del-p').onclick = async () => {
        if (!confirm(`确定要删除预设【${p.name}】吗？`)) return;
        try {
          const res = await fetch('/api/presets/delete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: p.name })
          });
          const data = await res.json();
          if (data.success) {
            showToast(`预设【${p.name}】已安全删除`);
            await fetchStatus();
          } else {
            showToast('删除失败: ' + (data.error || '未知错误'));
          }
        } catch (e) {
          showToast('删除预设失败: ' + e.message);
        }
      };

      presetListEl.appendChild(userCard);
    });
  }
}

async function applyPresetDirectly(name) {
  if (state.patchStatus && !state.patchStatus.isPatched) {
    const shouldInject = confirm(
      '⚠️ 检测到 Antigravity 客户端尚未注入美化底层！\n\n' +
      '若不注入底层，官方客户端将无法加载预设中的透明毛玻璃与全景壁纸。\n\n' +
      '点击【确定】立即一键注入美化底层，\n点击【取消】仅应用配置到磁盘。'
    );
    if (shouldInject) {
      await executeInstallPatch();
    }
  }

  try {
    showToast(`正在装配并应用预设【${name}】...`, 3000);
    const res = await fetch('/api/presets/apply', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name })
    });
    const data = await res.json();
    if (data.success) {
      cleanBlobUrls();
      setDraftDirty(false);

      if (state.isCdpOnline) {
        showToast(`✨ 预设【${name}】已成功应用并极速热重载生效！`);
      } else if (state.patchStatus && state.patchStatus.isPatched) {
        showToast(`✨ 预设【${name}】配置已固化！请重启一次 Antigravity 客户端使其生效并激活热更新`, 6000);
      } else {
        showToast(`⚠️ 预设【${name}】配置已保存！但需点击顶部【一键注入底层】并重启客户端方可在应用内显示`, 6000);
      }
      await fetchStatus();
    } else {
      showToast('应用预设失败: ' + (data.error || '未知错误'));
    }
  } catch (e) {
    showToast('应用预设失败: ' + e.message);
  }
}

if (presetSearchInput) {
  presetSearchInput.oninput = () => renderPresetsList();
}

// =========================================================================
// 17. Steam Wallpaper Engine Bridge (View 3)
// =========================================================================
function renderWeStatus(count) {
  if (navWeCount) navWeCount.textContent = count || 0;
  if (weCountBadge) weCountBadge.textContent = `${count || 0} 项素材`;
  if (weBadge) {
    if (count > 0) {
      weBadge.textContent = '已连接 Steam';
      weBadge.className = 'badge badge-accent';
    } else {
      weBadge.textContent = '未检测到 Steam WE';
      weBadge.className = 'badge badge-subtle';
    }
  }
}

async function fetchWeList() {
  if (weGrid) {
    weGrid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 40px; color: var(--text-dim);">正在深度扫描 Steam Wallpaper Engine 素材库...</div>';
  }

  try {
    const res = await fetch('/api/we/list');
    const data = await res.json();
    if (data.success) {
      state.weList = data.items || [];
      renderWeStatus(state.weList.length);
      renderWeGallery();
      renderWePickerGrid();
    } else if (weGrid) {
      weGrid.innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: 40px; color: var(--accent-rose);">扫描失败: ${data.error || '未知错误'}</div>`;
    }
  } catch (e) {
    if (weGrid) {
      weGrid.innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: 40px; color: var(--accent-rose);">连接素材库失败: ${e.message}</div>`;
    }
  }
}

function renderWeGallery() {
  if (!weGrid) return;
  weGrid.innerHTML = '';

  const filterText = weSearchInput ? weSearchInput.value.trim().toLowerCase() : '';
  const filtered = state.weList.filter(item => {
    if (!filterText) return true;
    return (item.title && item.title.toLowerCase().includes(filterText)) ||
           (item.workshopId && item.workshopId.includes(filterText));
  });

  if (filtered.length === 0) {
    weGrid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 40px; color: var(--text-dim);">未找到符合搜索条件的创意工坊壁纸</div>';
    return;
  }

  const displayItems = filtered.slice(0, 100);

  displayItems.forEach(item => {
    const card = document.createElement('div');
    card.className = 'we-card';

    const thumbUrl = item.previewPath
      ? `/api/preview-file?path=${encodeURIComponent(item.previewPath)}`
      : `/api/preview-file?path=${encodeURIComponent(item.mediaPath)}`;
    const isVid = item.mediaType === 'video';

    card.innerHTML = `
      <div class="we-thumb-wrap">
        <img class="we-thumb-img" src="${thumbUrl}" alt="" loading="lazy" onerror="this.src='data:image/svg+xml;utf8,<svg xmlns=\\'http://www.w3.org/2000/svg\\' width=\\'100\\' height=\\'60\\' fill=\\'%23111\\'><rect width=\\'100\\' height=\\'60\\'/></svg>'">
        <span class="we-type-tag">${isVid ? '🎬 视频' : '🖼️ 图像'}</span>
        <span class="we-size-tag">${item.sizeMb || 0} MB</span>
      </div>
      <div class="we-content">
        <h4 class="we-title" title="${item.title}">${item.title}</h4>
        <div class="we-actions">
          <button class="btn-we-preview" data-slot="left">
            🖥️ 预览到主底座
          </button>
          <button class="btn btn-secondary btn-sm btn-we-more" title="预览到指定其他槽位">
            更多 ▾
          </button>
        </div>
      </div>
    `;

    card.onclick = () => {
      switchTab('view-preview');
      stageSlotFilePath('left', item.mediaPath);
    };

    card.querySelector('.btn-we-preview').onclick = (e) => {
      e.stopPropagation();
      switchTab('view-preview');
      stageSlotFilePath('left', item.mediaPath);
    };

    card.querySelector('.btn-we-more').onclick = (e) => {
      e.stopPropagation();
      const targetSlot = prompt(`请选择要装配壁纸【${item.title}】的目标槽位：\n1. mid (活跃终端)\n2. bottom (提问输入框)\n3. settings (设置弹窗)\n4. right (独立侧栏)`, 'mid');
      if (targetSlot) {
        let slotKey = targetSlot.trim().toLowerCase();
        if (slotKey === '1' || slotKey === '终端') slotKey = 'mid';
        if (slotKey === '2' || slotKey === '输入框') slotKey = 'bottom';
        if (slotKey === '3' || slotKey === '设置') slotKey = 'settings';
        if (slotKey === '4' || slotKey === '侧栏') slotKey = 'right';

        if (['mid', 'bottom', 'settings', 'right'].includes(slotKey)) {
          switchTab('view-preview');
          stageSlotFilePath(slotKey, item.mediaPath);
        } else {
          alert('未知槽位，请输入 mid, bottom, settings 或 right');
        }
      }
    };

    weGrid.appendChild(card);
  });
}

if (weSearchInput) {
  weSearchInput.oninput = () => renderWeGallery();
}

// =========================================================================
// 18. Core Engine & Safety Center (View 4)
// =========================================================================
let isPatchingInProgress = false;
async function executeInstallPatch() {
  if (isPatchingInProgress) return false;
  isPatchingInProgress = true;

  const patchButtons = [
    document.getElementById('btn-install-patch'),
    document.getElementById('btn-hero-inject'),
    document.getElementById('btn-quick-inject'),
    document.getElementById('btn-guide-step1-inject')
  ].filter(Boolean);

  patchButtons.forEach(btn => {
    btn.disabled = true;
    btn.dataset.prevText = btn.textContent;
    btn.textContent = '⏳ 正在自动化安全注入核心 (约需5秒)...';
  });

  showToast('⚡ 正在安全注入 Antigravity 美化核心底层，请稍候...', 6000);

  let success = false;
  try {
    const res = await fetch('/api/patch/install', { method: 'POST' });
    let data;
    try {
      data = await res.json();
    } catch (_) {
      data = { success: false, error: `服务器返回异常 (HTTP ${res.status})` };
    }
    if (data.success) {
      success = true;
      showToast('✨ 核心注入成功！8314 CDP 与 8315 流媒体双引擎已就绪！', 4000);
      await fetchStatus();
    } else {
      showToast('❌ 注入失败: ' + (data.error || '未知错误'), 5000);
    }
  } catch (e) {
    showToast('❌ 注入失败: ' + e.message, 5000);
  } finally {
    isPatchingInProgress = false;
    patchButtons.forEach(btn => {
      btn.disabled = false;
      // If injection succeeded, fetchStatus() -> renderPatchStatus() already set the correct
      // updated button text (e.g. "🔄 重新注入" or "✓ 底层已就绪")!
      // Only revert to prevText if the operation failed.
      if (!success && btn.dataset.prevText) {
        btn.textContent = btn.dataset.prevText;
      }
    });
  }
  return success;
}

function openGuideModal() {
  if (!guideModal) return;
  if (chkNeverShowGuide) {
    try {
      chkNeverShowGuide.checked = localStorage.getItem('ag_never_show_guide') === 'true';
    } catch (_) {}
  }
  guideModal.classList.add('active');
}

function closeGuideModal() {
  if (!guideModal) return;
  guideModal.classList.remove('active');
  try {
    localStorage.setItem('ag_theme_guide_shown', 'true');
    if (chkNeverShowGuide) {
      if (chkNeverShowGuide.checked) {
        localStorage.setItem('ag_never_show_guide', 'true');
      } else {
        localStorage.removeItem('ag_never_show_guide');
      }
    }
  } catch (_) {}
}

function renderPatchStatus(patchStatus, hasBackup, backupSize) {
  const isPatched = patchStatus && patchStatus.isPatched;
  const isFreshOfficialUpdate = patchStatus && patchStatus.isFreshOfficialUpdate;
  const isCdpOnline = state.isCdpOnline;

  // 1. Tab 4 Safety Center Card
  if (patchBanner && patchText) {
    if (isPatched) {
      patchBanner.style.background = 'rgba(52, 211, 153, 0.08)';
      patchBanner.style.borderColor = 'rgba(52, 211, 153, 0.2)';
      patchBanner.style.color = '#6ee7b7';
      if (patchDot) {
        patchDot.style.background = 'var(--accent-emerald)';
        patchDot.style.boxShadow = '0 0 10px rgba(52, 211, 153, 0.6)';
      }
      const bakStr = hasBackup ? ` (出厂备份: ${backupSize}MB)` : '';
      patchText.textContent = `🟢 核心补丁已就绪 (CDP与流媒体双引擎已激活)${bakStr}`;
      if (btnInstallPatch) {
        btnInstallPatch.textContent = '🔄 重新注入 / 官方更新后重补';
        btnInstallPatch.className = 'btn btn-secondary btn-block';
      }
    } else if (isFreshOfficialUpdate) {
      patchBanner.style.background = 'rgba(234, 179, 8, 0.1)';
      patchBanner.style.borderColor = 'rgba(234, 179, 8, 0.35)';
      patchBanner.style.color = '#fde047';
      if (patchDot) {
        patchDot.style.background = '#eab308';
        patchDot.style.boxShadow = '0 0 10px rgba(234, 179, 8, 0.6)';
      }
      patchText.textContent = '⚡ 检测到 Google 官方刚完成更新！当前为原生未注入状态';
      if (btnInstallPatch) {
        btnInstallPatch.textContent = '⚡ 一键注入美化底层 (自动继承官方新特性)';
        btnInstallPatch.className = 'btn btn-primary btn-block';
      }
    } else {
      patchBanner.style.background = 'rgba(244, 63, 94, 0.08)';
      patchBanner.style.borderColor = 'rgba(244, 63, 94, 0.2)';
      patchBanner.style.color = '#fb7185';
      if (patchDot) {
        patchDot.style.background = 'var(--accent-rose)';
        patchDot.style.boxShadow = '0 0 10px rgba(244, 63, 94, 0.6)';
      }
      patchText.textContent = '⚠️ 当前处于官方原生未注入状态，点击下方一键注入';
      if (btnInstallPatch) {
        btnInstallPatch.textContent = '⚡ 一键注入 / 安装美化底层';
        btnInstallPatch.className = 'btn btn-primary btn-block';
      }
    }
  }

  // 2. Global Header Status Pill & Nav Badge Dot
  if (patchStatusPill) {
    const pDot = patchStatusPill.querySelector('.status-dot');
    if (isPatched) {
      if (pDot) pDot.className = 'status-dot online';
      if (patchStatusText) patchStatusText.textContent = '底层已注入';
      patchStatusPill.title = '核心美化底层已就绪 (CDP 8314 与流媒体 8315 已配置)';
    } else if (isFreshOfficialUpdate) {
      if (pDot) pDot.className = 'status-dot warning';
      if (patchStatusText) patchStatusText.textContent = '官方已更新';
      patchStatusPill.title = '检测到 Google 官方完成更新，底层文件被重置，点击一键重新注入';
    } else {
      if (pDot) pDot.className = 'status-dot offline';
      if (patchStatusText) patchStatusText.textContent = '未注入底层';
      patchStatusPill.title = '⚠️ Antigravity 官方原生文件尚未注入美化内核，点击立即注入';
    }
  }

  if (navSafetyDot) {
    navSafetyDot.style.display = isPatched ? 'none' : 'inline-block';
    if (isFreshOfficialUpdate) {
      navSafetyDot.style.background = '#eab308';
      navSafetyDot.style.boxShadow = '0 0 8px rgba(234, 179, 8, 0.8)';
    } else {
      navSafetyDot.style.background = '#f43f5e';
      navSafetyDot.style.boxShadow = '0 0 8px rgba(244, 63, 94, 0.8)';
    }
  }

  // 3. Left Inspector Step 1 Card
  if (inspectorGuideCard) {
    if (!isPatched) {
      inspectorGuideCard.style.display = 'block';
      inspectorGuideCard.className = 'inspector-guide-card action-needed';
      if (guideCardBadge) {
        guideCardBadge.textContent = '第一步';
        guideCardBadge.className = 'guide-card-badge';
      }
      if (guideCardTitle) guideCardTitle.textContent = '注入美化底层';
      if (guideCardDesc) guideCardDesc.textContent = isFreshOfficialUpdate
        ? '检测到 Google 刚完成更新！点击重新注入以恢复壁纸与热重载。'
        : '首次使用需注入美化底层，方可在 Antigravity 中渲染壁纸与热重载。';
      if (btnQuickInject) {
        btnQuickInject.style.display = 'block';
        btnQuickInject.textContent = isFreshOfficialUpdate ? '⚡ 重新注入美化底层' : '⚡ 一键注入美化底层';
      }
      if (btnQuickRestart) btnQuickRestart.style.display = 'none';
    } else if (!isCdpOnline) {
      inspectorGuideCard.style.display = 'block';
      inspectorGuideCard.className = 'inspector-guide-card action-needed';
      if (guideCardBadge) {
        guideCardBadge.textContent = '第二步';
        guideCardBadge.className = 'guide-card-badge step-2';
      }
      if (guideCardTitle) guideCardTitle.textContent = '重启客户端激活';
      if (guideCardDesc) guideCardDesc.textContent = '底层补丁已注入！需重启 Antigravity 客户端以激活 8314 热重载。';
      if (btnQuickInject) btnQuickInject.style.display = 'none';
      if (btnQuickRestart) btnQuickRestart.style.display = 'block';
    } else {
      // System is completely ready: hide onboarding card to maximize customizer workspace
      inspectorGuideCard.style.display = 'none';
    }
  }

  // 4. Workspace Hero Banner (View 1 Top)
  if (workspaceHeroBanner) {
    if (!isPatched) {
      workspaceHeroBanner.style.display = 'flex';
      workspaceHeroBanner.className = isFreshOfficialUpdate ? 'workspace-hero-banner warning' : 'workspace-hero-banner uninjected';
      if (heroBannerIcon) heroBannerIcon.textContent = isFreshOfficialUpdate ? '🔔' : '⚡';
      if (heroBannerTitle) {
        heroBannerTitle.textContent = isFreshOfficialUpdate
          ? 'Google 官方刚完成版本更新，核心文件被官方重置！'
          : '欢迎使用 Antigravity 主题工坊！第一步：注入美化底层';
      }
      if (heroBannerSub) {
        heroBannerSub.textContent = isFreshOfficialUpdate
          ? '点击右侧一键重新注入，自动继承官方最新特性，并全自动恢复个性化壁纸与热重载。'
          : '当前客户端尚未注入美化扩展。点击右侧按钮一键安全注入，即可开启自定义动态壁纸与极速热重载。';
      }
      if (btnHeroInject) {
        btnHeroInject.style.display = 'inline-flex';
        btnHeroInject.textContent = isFreshOfficialUpdate ? '⚡ 重新注入美化底层' : '⚡ 一键注入美化底层';
      }
      if (btnHeroRestart) btnHeroRestart.style.display = 'none';
      if (btnBannerClose) btnBannerClose.style.display = 'none';
    } else if (!isCdpOnline) {
      workspaceHeroBanner.style.display = 'flex';
      workspaceHeroBanner.className = 'workspace-hero-banner warning';
      if (heroBannerIcon) heroBannerIcon.textContent = '🔄';
      if (heroBannerTitle) heroBannerTitle.textContent = '核心补丁已注入成功！第二步：请重启 Antigravity 客户端';
      if (heroBannerSub) heroBannerSub.textContent = '重启客户端后将全自动激活 8314 免重启极速热重载通道与 8315 流媒体加速引擎。';
      if (btnHeroInject) btnHeroInject.style.display = 'none';
      if (btnHeroRestart) btnHeroRestart.style.display = 'inline-flex';
      if (btnBannerClose) btnBannerClose.style.display = 'none';
    } else {
      if (state.isHeroBannerDismissed) {
        workspaceHeroBanner.style.display = 'none';
      } else {
        workspaceHeroBanner.style.display = 'flex';
        workspaceHeroBanner.className = 'workspace-hero-banner ready';
        if (heroBannerIcon) heroBannerIcon.textContent = '✨';
        if (heroBannerTitle) heroBannerTitle.textContent = '全景美化引擎与 8314 免重启极速热重载已全就绪！';
        if (heroBannerSub) heroBannerSub.textContent = '在左侧挑选壁纸槽位（支持本地图片/MP4/Steam创意工坊），点击【应用生效】立即可见。';
        if (btnHeroInject) btnHeroInject.style.display = 'none';
        if (btnHeroRestart) btnHeroRestart.style.display = 'none';
        if (btnBannerClose) btnBannerClose.style.display = 'inline-flex';
      }
    }
  }

  // 5. Guide Modal Status Badges
  if (guideStep1Tag) {
    if (isPatched) {
      guideStep1Tag.textContent = '🟢 已注入就绪';
      guideStep1Tag.style.color = '#34d399';
    } else if (isFreshOfficialUpdate) {
      guideStep1Tag.textContent = '🟡 官方已更新待重补';
      guideStep1Tag.style.color = '#fde047';
    } else {
      guideStep1Tag.textContent = '🔴 尚未注入';
      guideStep1Tag.style.color = '#fb7185';
    }
  }
  if (btnGuideStep1Inject) {
    btnGuideStep1Inject.textContent = isPatched ? '✓ 底层已就绪 (点击可重补)' : (isFreshOfficialUpdate ? '⚡ 重新注入美化底层' : '⚡ 立即一键注入美化底层');
  }

  if (guideStep2Tag) {
    if (isCdpOnline) {
      guideStep2Tag.textContent = '🟢 CDP 在线 (免重启热重载就绪)';
      guideStep2Tag.style.color = '#34d399';
    } else if (isPatched) {
      guideStep2Tag.textContent = '🟡 补丁已就绪，等待重启激活';
      guideStep2Tag.style.color = '#fde047';
    } else {
      guideStep2Tag.textContent = '⚪ 等待第一步完成';
      guideStep2Tag.style.color = 'var(--text-dim)';
    }
  }
  if (btnGuideStep2Restart) {
    btnGuideStep2Restart.disabled = !isPatched;
  }

  if (typeof updateMockupScale === 'function') {
    setTimeout(updateMockupScale, 50);
  }
}

async function handleRestartAntigravity() {
  if (!confirm('确定要重启 Antigravity 客户端吗？\n（将加载全新注入的底层架构并激活 8314 免重启极速热重载）')) return;
  showToast('⚡ 正在重启 Antigravity 客户端，请稍候...', 5000);
  try {
    const res = await fetch('/api/app/restart', { method: 'POST' });
    const data = await res.json();
    if (data.success) {
      showToast('✨ 重启指令已发送！客户端正在重新启动并连接 8314...', 4000);
      setTimeout(fetchStatus, 2500);
      setTimeout(fetchStatus, 5000);
    } else {
      showToast('❌ 重启失败: ' + (data.error || '未知错误'), 4000);
    }
  } catch (e) {
    showToast('❌ 请求重启失败: ' + e.message, 4000);
  }
}

// =========================================================================
// 19. Event Listeners Setup
// =========================================================================
function setupEventListeners() {
  // Slot Pills in Inspector
  slotSelectorEl.querySelectorAll('.slot-pill').forEach(btn => {
    btn.onclick = () => {
      selectSlot(btn.dataset.slot);
    };
  });

  // Draft Commit & Discard
  btnCommitDraft.onclick = commitDraftToAntigravity;
  btnDiscardDraft.onclick = discardDraftChanges;
  btnDraftSavePreset.onclick = () => {
    savePresetModal.classList.add('active');
    newPresetNameInput.value = '';
    newPresetNameInput.focus();
  };

  // Native Browse
  btnBrowseNative.onclick = (e) => {
    e.stopPropagation();
    handleNativeBrowse();
  };

  // Browser file input
  if (fileInput) {
    fileInput.onchange = () => {
      if (fileInput.files && fileInput.files.length > 0) {
        handleBrowserFile(fileInput.files[0]);
      }
    };
  }

  // Drop zone click triggers file browse
  dropZone.onclick = (e) => {
    if (e.target !== btnBrowseNative && !btnBrowseNative.contains(e.target) &&
        e.target !== btnOpenWePicker && !btnOpenWePicker.contains(e.target) &&
        e.target !== btnResetSlot && !btnResetSlot.contains(e.target)) {
      handleNativeBrowse();
    }
  };

  // Drag and Drop
  dropZone.ondragover = (e) => {
    e.preventDefault();
    dropZone.classList.add('dragover');
  };
  dropZone.ondragleave = () => {
    dropZone.classList.remove('dragover');
  };
  dropZone.ondrop = (e) => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleBrowserFile(e.dataTransfer.files[0]);
    }
  };

  // Save Preset Modal
  btnOpenSaveModal.onclick = () => {
    savePresetModal.classList.add('active');
    newPresetNameInput.value = '';
    newPresetNameInput.focus();
  };
  btnCloseSaveModal.onclick = () => savePresetModal.classList.remove('active');
  btnCancelSaveModal.onclick = () => savePresetModal.classList.remove('active');

  btnConfirmSavePreset.onclick = async () => {
    const name = newPresetNameInput.value.trim();
    if (!name) {
      alert('请输入预设名称！');
      return;
    }
    try {
      showToast(`正在保存预设【${name}】...`, 3000);
      const res = await fetch('/api/presets/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name })
      });
      const data = await res.json();
      if (data.success) {
        showToast(`✨ 预设【${name}】保存成功！`);
        savePresetModal.classList.remove('active');
        await fetchStatus();
      } else {
        alert('保存预设失败: ' + (data.error || '未知错误'));
      }
    } catch (e) {
      alert('保存预设失败: ' + e.message);
    }
  };

  // Reset Baseline in Presets Page
  if (btnResetBaselinePresets) {
    btnResetBaselinePresets.onclick = async () => {
      if (!confirm('确定要恢复为初版黄金基线全套配置吗？\n（包含 5 大槽位壁纸、对齐位置与纯白高对比字体）')) return;
      if (state.patchStatus && !state.patchStatus.isPatched) {
        const shouldInject = confirm(
          '⚠️ 检测到 Antigravity 客户端尚未注入美化底层！\n\n' +
          '若不注入底层，官方客户端将无法加载基线壁纸与动态效果。\n\n' +
          '点击【确定】立即一键注入美化底层，\n点击【取消】仅应用配置到磁盘。'
        );
        if (shouldInject) {
          await executeInstallPatch();
        }
      }
      try {
        showToast('正在应用【初版黄金基线】...', 2500);
        const res = await fetch('/api/theme/baseline', { method: 'POST' });
        const data = await res.json();
        if (data.success) {
          cleanBlobUrls();
          setDraftDirty(false);
          if (state.isCdpOnline) {
            showToast('✨ 已成功恢复为【初版黄金基线】！0.3s 热重载生效');
          } else if (state.patchStatus && state.patchStatus.isPatched) {
            showToast('✨ 已成功恢复为【初版黄金基线】！请重启一次客户端使其生效', 6000);
          } else {
            showToast('⚠️ 配置已应用！需点击【一键注入底层】并重启客户端方可在应用内显示', 6000);
          }
          await fetchStatus();
        } else {
          showToast('恢复基线失败: ' + (data.error || '未知错误'));
        }
      } catch (e) {
        showToast('恢复基线失败: ' + e.message);
      }
    };
  }

  // Patch and Injection Actions (Unified across View 1, View 4, Guide Modal, Header)
  if (btnInstallPatch) btnInstallPatch.onclick = executeInstallPatch;
  if (btnQuickInject) btnQuickInject.onclick = executeInstallPatch;
  if (btnHeroInject) btnHeroInject.onclick = executeInstallPatch;
  if (btnGuideStep1Inject) btnGuideStep1Inject.onclick = executeInstallPatch;

  if (patchStatusPill) {
    patchStatusPill.onclick = () => {
      if (!state.patchStatus || !state.patchStatus.isPatched) {
        const isFresh = state.patchStatus && state.patchStatus.isFreshOfficialUpdate;
        const msg = isFresh
          ? '检测到 Google 官方刚完成更新，底层文件被官方重置！\n\n是否立即一键重新注入美化底层？'
          : '当前 Antigravity 尚未注入美化底层！\n\n注入后可解锁透明毛玻璃、全景壁纸与 0.3s 免重启极速热更。\n\n是否立即一键注入？';
        if (confirm(msg)) {
          executeInstallPatch();
        }
      } else if (!state.isCdpOnline) {
        if (confirm('🟡 核心美化补丁已就绪！\n\n但检测到 CDP 8314 热重载通道尚未连接，需重启一次客户端激活。\n\n是否立即一键重启 Antigravity 客户端？')) {
          handleRestartAntigravity();
        }
      } else {
        showToast('🟢 核心美化底层已就绪：CDP 8314 与流媒体 8315 均在线！');
      }
    };
  }

  // Client Control & Restart
  if (btnRestartApp) btnRestartApp.onclick = handleRestartAntigravity;
  if (btnRestartAppCard) btnRestartAppCard.onclick = handleRestartAntigravity;
  if (btnQuickRestart) btnQuickRestart.onclick = handleRestartAntigravity;
  if (btnHeroRestart) btnHeroRestart.onclick = handleRestartAntigravity;
  if (btnGuideStep2Restart) btnGuideStep2Restart.onclick = handleRestartAntigravity;

  // Newbie Guide Modal & Banners
  if (btnOpenGuide) btnOpenGuide.onclick = openGuideModal;
  if (btnHeroGuide) btnHeroGuide.onclick = openGuideModal;
  if (btnCloseGuideModal) btnCloseGuideModal.onclick = closeGuideModal;
  if (btnFinishGuide) {
    btnFinishGuide.onclick = () => {
      closeGuideModal();
      switchTab('view-preview');
    };
  }
  if (btnGuideStep3Workspace) {
    btnGuideStep3Workspace.onclick = () => {
      closeGuideModal();
      switchTab('view-preview');
    };
  }
  if (btnGuideStep3We) {
    btnGuideStep3We.onclick = () => {
      closeGuideModal();
      switchTab('view-we');
    };
  }
  if (btnGuideStep4Go) {
    btnGuideStep4Go.onclick = () => {
      closeGuideModal();
      switchTab('view-preview');
    };
  }
  if (guideModal) {
    guideModal.onclick = (e) => {
      if (e.target === guideModal) closeGuideModal();
    };
  }
  if (btnBannerClose) {
    btnBannerClose.onclick = () => {
      state.isHeroBannerDismissed = true;
      try { localStorage.setItem('ag_hero_banner_dismissed', 'true'); } catch(_) {}
      if (workspaceHeroBanner) workspaceHeroBanner.style.display = 'none';
      if (typeof updateMockupScale === 'function') updateMockupScale();
    };
  }

  btnVanilla.onclick = async () => {
    if (!confirm('确定要恢复为 Antigravity 官方原版纯净模式吗？\n（当前壁纸将自动保存为快照，稍后随时可一键还原）')) return;
    try {
      showToast('正在还原官方原版...', 2500);
      const res = await fetch('/api/theme/vanilla', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        cleanBlobUrls();
        setDraftDirty(false);
        showToast('已成功恢复官方原版纯净模式！');
        await fetchStatus();
      }
    } catch (e) {
      showToast('恢复原版失败: ' + e.message);
    }
  };

  btnUninstall.onclick = async () => {
    if (!confirm('⚠️ 警告：彻底物理卸载将还原官方出厂 app.asar 并清除所有注入。\n确定要彻底还原吗？')) return;
    try {
      showToast('正在彻底物理卸载...', 3000);
      const res = await fetch('/api/theme/uninstall', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        cleanBlobUrls();
        setDraftDirty(false);
        showToast('✨ 彻底物理卸载成功，出厂原生文件已还原！');
        await fetchStatus();
      }
    } catch (e) {
      showToast('彻底卸载失败: ' + e.message);
    }
  };

  // Reset window placement to optimal 1400x860 centered
  const btnResetWindow = document.getElementById('btn-reset-window');
  if (btnResetWindow) {
    btnResetWindow.onclick = async () => {
      try {
        if (window.chrome && window.chrome.webview && window.chrome.webview.postMessage) {
          window.chrome.webview.postMessage('reset-window');
        } else {
          const screenW = window.screen?.availWidth || 2560;
          const screenH = window.screen?.availHeight || 1392;
          const targetW = 1400;
          const targetH = 860;
          const targetX = Math.max(20, Math.round((screenW - targetW) / 2));
          const targetY = Math.max(20, Math.round((screenH - targetH) / 2));
          window.resizeTo(targetW, targetH);
          window.moveTo(targetX, targetY);
          try {
            await fetch('/api/window/reset', { method: 'POST' });
          } catch (_) {}
        }
      } catch (_) {}
      showToast('窗口已还原至推荐适中尺寸 (1400x860)');
    };
  }

  // Reload Studio page
  if (btnReload) {
    btnReload.onclick = () => {
      showToast('正在刷新工坊界面...');
      setTimeout(() => location.reload(), 200);
    };
  }

  // Shutdown Software (Instant clean exit, zero background footprint)
  btnShutdown.onclick = async () => {
    if (btnShutdown.disabled) return;
    btnShutdown.disabled = true;

    try {
      showToast('正在退出软件并释放所有后台服务...', 800);
      await fetch('/api/shutdown', { method: 'POST' });
    } catch (_) {}

    try {
      window.close();
    } catch (_) {}
  };

  // Window close beacon
  window.addEventListener('beforeunload', () => {
    try {
      navigator.sendBeacon('/api/shutdown');
    } catch (_) {}
  });
}

// =========================================================================
// 20. Bootstrap
// =========================================================================
window.addEventListener('DOMContentLoaded', () => {
  // 杜绝异常全屏：若窗口尺寸接近全屏，自动回缩至舒适适中尺寸 (1400x860)
  try {
    const screenW = window.screen?.availWidth || 2560;
    const screenH = window.screen?.availHeight || 1392;
    if (window.outerWidth > screenW * 0.85 || window.outerHeight > screenH * 0.88) {
      const targetW = 1400;
      const targetH = 860;
      const targetX = Math.max(20, Math.round((screenW - targetW) / 2));
      const targetY = Math.max(20, Math.round((screenH - targetH) / 2));
      window.resizeTo(targetW, targetH);
      window.moveTo(targetX, targetY);
    }
  } catch (_) {}

  initTabs();
  initSpotlightEffect();
  initMockupInteractions();
  initPreviewToolbar();
  initResponsiveAutoFit();
  initPositionControls();
  initFontControls();
  initWeQuickPicker();
  setupEventListeners();

  fetchStatus();

  // Status polling interval (3.5s)
  setInterval(() => {
    if (state.activeTab === 'view-safety') {
      fetchStatus();
    }
  }, 3500);

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      fetchStatus();
    }
  });
});
