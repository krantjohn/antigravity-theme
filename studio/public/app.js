// =========================================================================
// 🌸 Antigravity Theme Studio —— 实时预览与全景工坊 (Client Core Logic)
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
  mockSettingsOpen: false
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
const btnResetPos = document.getElementById('btn-reset-pos');
const btnResetAllPos = document.getElementById('btn-reset-all-pos');
const btnBrowseNative = document.getElementById('btn-browse-native');
const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('file-input');
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
const btnToggleMockSettings = document.getElementById('btn-toggle-mock-settings');
const mockSidebarSettingsBtn = document.getElementById('mock-sidebar-settings-btn');
const mockSettingsOverlay = document.getElementById('mock-settings-overlay');
const btnCloseMockSettings = document.getElementById('btn-close-mock-settings');

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

// Steam WE Elements
const weBadge = document.getElementById('we-badge');
const weCountBadge = document.getElementById('we-count-badge');
const navWeCount = document.getElementById('nav-we-count');
const weSearchInput = document.getElementById('we-search-input');
const weGrid = document.getElementById('we-grid');

// Safety Elements
const patchBanner = document.getElementById('patch-banner');
const patchDot = document.getElementById('patch-dot');
const patchText = document.getElementById('patch-text');
const btnInstallPatch = document.getElementById('btn-install-patch');
const btnRestartApp = document.getElementById('btn-restart-app');
const btnRestartAppCard = document.getElementById('btn-restart-app-card');
const btnVanilla = document.getElementById('btn-vanilla');
const btnUninstall = document.getElementById('btn-uninstall');

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

      // Update Nav Buttons
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');

      // Update Panels
      document.querySelectorAll('.view-panel').forEach(panel => {
        panel.classList.remove('active');
      });
      const activePanel = document.getElementById(targetViewId);
      if (activePanel) {
        activePanel.classList.add('active');
      }

      state.activeTab = targetViewId;

      // Trigger lazy tab logic
      if (targetViewId === 'view-we') {
        if (!state.weList || state.weList.length === 0) {
          fetchWeList();
        } else {
          renderWeGallery();
        }
      } else if (targetViewId === 'view-presets') {
        renderPresetsList();
      } else if (targetViewId === 'view-preview') {
        renderMockupPreview();
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

      // If user has not dirtied the draft, initialize draftConfig from live config
      if (!state.isDirty) {
        state.draftConfig = JSON.parse(JSON.stringify(state.slotsConfig));
        setDraftDirty(false);
      }

      renderHeaderStatus(data);
      renderSlotInspector();
      renderFontPresets();
      renderMockupPreview();
      renderPresetsList();
      renderWeStatus(data.weCount);
      renderPatchStatus(data.patchStatus, data.hasBackup, data.backupSize);
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
    cdpText.textContent = 'CDP 8314 在线 (0.3s 热重载就绪)';
  } else if (data.isAntigravityRunning) {
    cdpDot.className = 'status-dot warning';
    cdpText.textContent = '需完全重启客户端以激活 8314 热重载';
  } else {
    cdpDot.className = 'status-dot offline';
    cdpText.textContent = 'Antigravity 未启动';
  }

  const mediaDot = mediaStatusEl.querySelector('.status-dot');
  const mediaText = mediaStatusEl.querySelector('.status-text');
  if (data.isMediaOnline) {
    mediaDot.className = 'status-dot online';
    mediaText.textContent = '流媒体 8315 运行中';
  } else {
    mediaDot.className = 'status-dot offline';
    mediaText.textContent = '流媒体 8315 离线';
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
  } else {
    activeSlotFileEl.textContent = slotData.file || '(未配置壁纸)';
  }

  const isVid = slotData.type === 'video' || (slotData.file && slotData.file.match(/\.(mp4|webm|mov)$/i)) || (slotData.stagedFilePath && slotData.stagedFilePath.match(/\.(mp4|webm|mov)$/i));
  if (isVid) {
    typeBadgeEl.className = 'badge badge-accent';
    typeBadgeEl.textContent = '🎬 4K/2K 动态视频';
  } else if (slotData.file || slotData.stagedFilePath) {
    typeBadgeEl.className = 'badge badge-subtle';
    typeBadgeEl.textContent = '🖼️ 静态图像';
  } else {
    typeBadgeEl.className = 'badge badge-subtle';
    typeBadgeEl.textContent = '无壁纸 (Vanilla)';
  }

  // Parse Position Coordinates
  const posStr = slotData.position || 'center center';
  const coords = parsePositionString(posStr);
  sliderPosX.value = coords.x;
  sliderPosY.value = coords.y;
  valPosX.textContent = `${coords.x}%`;
  valPosY.textContent = `${coords.y}%`;

  // Highlight active 3x3 alignment button
  document.querySelectorAll('.btn-align-cell').forEach(btn => {
    const alignStr = btn.dataset.align;
    if (alignStr === `${coords.x}% ${coords.y}%`) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });

  // Highlight Active Pill in Selector
  document.querySelectorAll('.slot-pill').forEach(btn => {
    if (btn.dataset.slot === slotKey) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });
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

  const slotsToRender = ['left', 'mid', 'bottom', 'settings'];

  slotsToRender.forEach(slotKey => {
    const videoEl = document.getElementById(`mock-video-${slotKey}`);
    const imgEl = document.getElementById(`mock-img-${slotKey}`);
    const slotContainer = document.getElementById(`mock-slot-${slotKey}`);
    if (!videoEl || !imgEl) return;

    const slotData = (state.draftConfig && state.draftConfig[slotKey]) || (state.slotsConfig && state.slotsConfig[slotKey]) || {};
    
    // Determine media source URL and media type
    let mediaUrl = '';
    let isVideo = false;

    if (state.blobUrls[slotKey]) {
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

    // Apply Media Sources and toggle classes
    if (mediaUrl) {
      if (isVideo) {
        if (videoEl.dataset.currentSrc !== mediaUrl) {
          videoEl.dataset.currentSrc = mediaUrl;
          videoEl.src = mediaUrl;
          videoEl.play().catch(() => {});
        }
        videoEl.classList.add('visible');
        imgEl.classList.remove('visible');
        imgEl.removeAttribute('src');
      } else {
        if (imgEl.src !== mediaUrl) {
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
    }

    // Interactive target highlight
    if (slotContainer) {
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
    // Dark font -> white glow stroke
    textShadow = '0 0 2px #fff, 0 1px 3px rgba(255, 255, 255, 0.95)';
    terminalColor = '#0f172a';
    terminalShadow = '0 0 2px #fff, 0 1px 2px rgba(255, 255, 255, 0.98)';
  } else {
    // Light font -> deep dark drop shadow
    textShadow = '0 1px 3px rgba(0, 0, 0, 0.95), 0 0 2px rgba(0, 0, 0, 0.95)';
    terminalColor = '#ffffff';
    terminalShadow = '0 1px 3px rgba(0, 0, 0, 0.95), 0 0 2px rgba(0, 0, 0, 0.95)';
  }

  agMockup.style.setProperty('--mock-font-primary', primaryHex);
  agMockup.style.setProperty('--mock-font-shadow', textShadow);
  agMockup.style.setProperty('--mock-font-terminal', terminalColor);
  agMockup.style.setProperty('--mock-font-terminal-shadow', terminalShadow);
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
// 9. Interactive Mockup Canvas Slot Switching
// =========================================================================
function initMockupInteractions() {
  // Click on mock sidebar, chat pane, or left background focuses 'left'
  const leftTargets = document.querySelectorAll('[data-slot="left"]');
  leftTargets.forEach(el => {
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      selectSlot('left');
    });
  });

  // Click on terminal focuses 'mid'
  const midTargets = document.querySelectorAll('[data-slot="mid"]');
  midTargets.forEach(el => {
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      selectSlot('mid');
    });
  });

  // Click on input box focuses 'bottom'
  const bottomTargets = document.querySelectorAll('[data-slot="bottom"]');
  bottomTargets.forEach(el => {
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      selectSlot('bottom');
    });
  });

  // Click on settings modal focuses 'settings'
  const settingsTargets = document.querySelectorAll('[data-slot="settings"]');
  settingsTargets.forEach(el => {
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      selectSlot('settings');
    });
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

function selectSlot(slotKey) {
  state.activeSlot = slotKey;
  renderSlotInspector();
  renderMockupPreview();
}

// =========================================================================
// 10. Material File Handling (Native Browse, Drag & Drop, Blob Preview)
// =========================================================================
async function handleNativeBrowse() {
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
  
  // Revoke previous blob url if exists
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
  showToast(`已装载本地素材 [${file.name}] 到工作区预览！满意后可点击正式应用`);
}

function stageSlotFilePath(slot, filePath) {
  if (!state.draftConfig[slot]) state.draftConfig[slot] = {};
  state.draftConfig[slot].stagedFilePath = filePath;
  state.draftConfig[slot].stagedFileName = filePath.split(/[\\/]/).pop();
  state.draftConfig[slot].type = filePath.match(/\.(mp4|webm|mov)$/i) ? 'video' : 'image';

  // Clear any conflicting blob
  if (state.blobUrls[slot]) {
    try { URL.revokeObjectURL(state.blobUrls[slot]); } catch (_) {}
    delete state.blobUrls[slot];
    delete state.pendingFiles[slot];
  }

  setDraftDirty(true);
  renderSlotInspector();
  renderMockupPreview();
  showToast(`已在工作区装载素材预览，点击上方「正式应用」即可生效！`);
}

// =========================================================================
// 11. Draft Actions (Commit & Discard)
// =========================================================================
async function commitDraftToAntigravity() {
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
      } else if (state.isAntigravityRunning) {
        showToast('✨ 配置已固化！请重启一次 Antigravity 客户端使其生效并激活热更新', 6000);
      } else {
        showToast('✨ 全套视觉配置已正式固化！下次启动 Antigravity 即可看到效果', 4000);
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
// 12. Alignment & Position Controls
// =========================================================================
function updateActiveSlotPosition(x, y) {
  const slot = state.activeSlot;
  if (!state.draftConfig[slot]) state.draftConfig[slot] = {};
  state.draftConfig[slot].position = `${x}% ${y}%`;
  
  sliderPosX.value = x;
  sliderPosY.value = y;
  valPosX.textContent = `${x}%`;
  valPosY.textContent = `${y}%`;

  document.querySelectorAll('.btn-align-cell').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.align === `${x}% ${y}%`);
  });

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

  document.querySelectorAll('.btn-align-cell').forEach(btn => {
    btn.onclick = () => {
      const alignStr = btn.dataset.align;
      if (!alignStr) return;
      const [xStr, yStr] = alignStr.split(' ');
      const x = parseInt(xStr, 10);
      const y = parseInt(yStr, 10);
      updateActiveSlotPosition(x, y);
    };
  });

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
}

// =========================================================================
// 13. Typography & High-Contrast Presets
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
// 14. Dedicated Presets Management (View 2)
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
        const res = await fetch('/api/status');
        const data = await res.json();
        // Fallback to baseline files
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
      try {
        showToast('正在应用【初版黄金基线】...', 2500);
        const res = await fetch('/api/theme/baseline', { method: 'POST' });
        const data = await res.json();
        if (data.success) {
          cleanBlobUrls();
          setDraftDirty(false);
          showToast('✨ 已成功应用【初版黄金基线】！0.3s 热重载生效');
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

      // Preview preset in workspace
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

      // Direct apply preset
      userCard.querySelector('.btn-apply-user-p').onclick = () => applyPresetDirectly(p.name);

      // Delete preset
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
      } else if (state.isAntigravityRunning) {
        showToast(`✨ 预设【${name}】配置已固化！重启 Antigravity 客户端即可激活`, 6000);
      } else {
        showToast(`✨ 预设【${name}】已成功应用！启动 Antigravity 即可显示`);
      }
      await fetchStatus();
    } else {
      showToast('应用预设失败: ' + (data.error || '未知错误'));
    }
  } catch (e) {
    showToast('应用预设失败: ' + e.message);
  }
}

// Preset Filter listener
if (presetSearchInput) {
  presetSearchInput.oninput = () => renderPresetsList();
}

// =========================================================================
// 15. Steam Wallpaper Engine Bridge (View 3)
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
  if (!weGrid) return;
  weGrid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 40px; color: var(--text-dim);">正在深度扫描 Steam Wallpaper Engine 素材库...</div>';

  try {
    const res = await fetch('/api/we/list');
    const data = await res.json();
    if (data.success) {
      state.weList = data.items || [];
      renderWeStatus(state.weList.length);
      renderWeGallery();
    } else {
      weGrid.innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: 40px; color: var(--accent-rose);">扫描失败: ${data.error || '未知错误'}</div>`;
    }
  } catch (e) {
    weGrid.innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: 40px; color: var(--accent-rose);">连接素材库失败: ${e.message}</div>`;
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

  // Render top 100 items to avoid DOM lag
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

    // Preview to left slot
    card.querySelector('.btn-we-preview').onclick = () => {
      stageSlotFilePath('left', item.mediaPath);
      switchTab('view-preview');
    };

    // More slots dropdown menu
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
          stageSlotFilePath(slotKey, item.mediaPath);
          selectSlot(slotKey);
          switchTab('view-preview');
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
// 16. Core Engine & Safety Center (View 4)
// =========================================================================
function renderPatchStatus(patchStatus, hasBackup, backupSize) {
  if (!patchBanner || !patchText) return;
  const isPatched = patchStatus && patchStatus.isPatched;
  const isFreshOfficialUpdate = patchStatus && patchStatus.isFreshOfficialUpdate;

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
// 17. Event Listeners Setup
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
    if (e.target !== btnBrowseNative && !btnBrowseNative.contains(e.target)) {
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

  // Safety Center Actions
  if (btnInstallPatch) {
    btnInstallPatch.onclick = async () => {
      btnInstallPatch.disabled = true;
      const originalText = btnInstallPatch.textContent;
      btnInstallPatch.textContent = '⏳ 正在自动化安全注入核心 (约需5秒)...';
      showToast('⚡ 正在注入 Antigravity 美化核心底层，请稍候...', 6000);
      try {
        const res = await fetch('/api/patch/install', { method: 'POST' });
        const data = await res.json();
        if (data.success) {
          showToast('✨ 核心注入成功！8314 CDP 与 8315 流媒体双引擎已就绪！', 4000);
          await fetchStatus();
        } else {
          showToast('❌ 注入失败: ' + (data.error || '未知错误'), 4000);
        }
      } catch (e) {
        showToast('❌ 注入失败: ' + e.message, 5000);
      } finally {
        btnInstallPatch.disabled = false;
        btnInstallPatch.textContent = originalText;
      }
    };
  }

  if (btnRestartApp) btnRestartApp.onclick = handleRestartAntigravity;
  if (btnRestartAppCard) btnRestartAppCard.onclick = handleRestartAntigravity;

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

  // Reload Studio page
  if (btnReload) {
    btnReload.onclick = () => {
      showToast('正在刷新工坊界面...');
      setTimeout(() => location.reload(), 200);
    };
  }

  // Shutdown Software (Zero background footprint)
  btnShutdown.onclick = async () => {
    try {
      showToast('正在完全关闭软件并释放所有后台进程...');
      await fetch('/api/shutdown', { method: 'POST' });
      setTimeout(() => {
        window.close();
      }, 500);
    } catch (e) {
      window.close();
    }
  };

  // Window close beacon
  window.addEventListener('beforeunload', () => {
    try {
      navigator.sendBeacon('/api/shutdown');
    } catch (_) {}
  });
}

// =========================================================================
// 18. Bootstrap
// =========================================================================
window.addEventListener('DOMContentLoaded', () => {
  initTabs();
  initSpotlightEffect();
  initMockupInteractions();
  initPositionControls();
  initFontControls();
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
