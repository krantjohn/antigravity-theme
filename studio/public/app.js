// =========================================================================
// 🌸 Antigravity Theme Studio —— Raycast / Linear Bento Grid Client Logic
// =========================================================================

let state = {
  activeSlot: 'left',
  slotsConfig: {},
  presets: [],
  fontPresets: {},
  slotsMeta: {},
  isCdpOnline: false,
  isMediaOnline: false,
  isAntigravityRunning: false
};

// DOM Elements
const cdpStatusEl = document.getElementById('cdp-status');
const mediaStatusEl = document.getElementById('media-status');
const slotSelectorEl = document.getElementById('slot-selector');
const activeSlotNameEl = document.getElementById('active-slot-name');
const activeSlotFileEl = document.getElementById('active-slot-file');
const activeSlotTypeEl = document.getElementById('active-slot-type');
const typeBadgeEl = document.getElementById('type-badge');
const sliderPosX = document.getElementById('slider-pos-x');
const sliderPosY = document.getElementById('slider-pos-y');
const valPosX = document.getElementById('val-pos-x');
const valPosY = document.getElementById('val-pos-y');
const btnApplySlot = document.getElementById('btn-apply-slot');
const btnResetBaseline = document.getElementById('btn-reset-baseline');
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
const previewText = document.getElementById('preview-text');
const presetListEl = document.getElementById('preset-list');
const btnOpenSaveModal = document.getElementById('btn-open-save-modal');
const savePresetModal = document.getElementById('save-preset-modal');
const btnCloseSaveModal = document.getElementById('btn-close-save-modal');
const btnCancelSaveModal = document.getElementById('btn-cancel-save-modal');
const btnConfirmSavePreset = document.getElementById('btn-confirm-save-preset');
const newPresetNameInput = document.getElementById('new-preset-name');
const btnVanilla = document.getElementById('btn-vanilla');
const btnUninstall = document.getElementById('btn-uninstall');
const btnShutdown = document.getElementById('btn-shutdown');
const btnReload = document.getElementById('btn-reload');
const toastContainer = document.getElementById('toast-container');
const weBadge = document.getElementById('we-badge');
const weCount = document.getElementById('we-count');
const patchBadge = document.getElementById('patch-badge');
const patchBanner = document.getElementById('patch-banner');
const patchDot = document.getElementById('patch-dot');
const patchText = document.getElementById('patch-text');
const btnInstallPatch = document.getElementById('btn-install-patch');

// 1. Raycast Spotlight Border Effect
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

// 2. Toast Notification
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

// 3. Fetch Full State
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

      try { renderHeaderStatus(data); } catch(e) { console.error('Error in renderHeaderStatus:', e); }
      try { renderSlotView(); } catch(e) { console.error('Error in renderSlotView:', e); }
      try { renderFontPresets(); } catch(e) { console.error('Error in renderFontPresets:', e); }
      try { renderPresetsList(); } catch(e) { console.error('Error in renderPresetsList:', e); }
      try { renderWeStatus(data.weCount); } catch(e) { console.error('Error in renderWeStatus:', e); }
      try { renderPatchStatus(data.patchStatus, data.hasBackup, data.backupSize); } catch(e) { console.error('Error in renderPatchStatus:', e); }
    }
  } catch (err) {
    console.error('Failed to fetch status:', err);
  }
}

// 4. Render Header Status
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

// 5. Render Slot View
function renderSlotView() {
  const slotKey = state.activeSlot;
  const slotData = state.slotsConfig[slotKey] || {};
  const meta = state.slotsMeta[slotKey] || {};

  activeSlotNameEl.textContent = meta.desc || slotKey;
  activeSlotFileEl.textContent = slotData.file || '(未配置壁纸)';

  if (slotData.type === 'video') {
    typeBadgeEl.className = 'badge badge-accent';
    typeBadgeEl.textContent = '🎬 4K/2K 动态视频';
  } else if (slotData.type === 'image') {
    typeBadgeEl.className = 'badge badge-subtle';
    typeBadgeEl.textContent = '🖼️ 静态图像';
  } else {
    typeBadgeEl.className = 'badge badge-subtle';
    typeBadgeEl.textContent = '无壁纸 (Vanilla)';
  }

  // Parse position
  const posStr = slotData.position || 'center center';
  const coords = parsePositionString(posStr);
  sliderPosX.value = coords.x;
  sliderPosY.value = coords.y;
  valPosX.textContent = `${coords.x}%`;
  valPosY.textContent = `${coords.y}%`;
}

function parsePositionString(pos) {
  let x = 50, y = 50;
  if (!pos) return { x, y };
  const parts = pos.trim().split(/\s+/);
  if (parts.length >= 1) {
    x = parseCoord(parts[0], 50);
  }
  if (parts.length >= 2) {
    y = parseCoord(parts[1], 50);
  }
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

// 6. Render Font Presets
function renderFontPresets() {
  fontPresetsGrid.innerHTML = '';
  let currentFontHex = '#ffffff';
  if (state.slotsConfig && state.slotsConfig.fontColor) {
    if (typeof state.slotsConfig.fontColor === 'string') {
      currentFontHex = state.slotsConfig.fontColor;
    } else if (state.slotsConfig.fontColor.primary) {
      currentFontHex = state.slotsConfig.fontColor.primary;
    }
  }

  if (state.fontPresets) {
    for (const [key, preset] of Object.entries(state.fontPresets)) {
      const btn = document.createElement('button');
      btn.className = 'font-preset-btn';
      btn.innerHTML = `
        <span class="font-dot" style="background-color: ${preset.primary};"></span>
        <span>${preset.name.split(' ')[0]}</span>
      `;
      btn.onclick = async () => {
        await applyFontColor(preset.primary);
      };
      fontPresetsGrid.appendChild(btn);
    }
  }

  fontColorPicker.value = (typeof currentFontHex === 'string' && currentFontHex.length === 7) ? currentFontHex : '#ffffff';
  fontHexInput.value = currentFontHex;
  updateFontPreview(currentFontHex);
}

function updateRec601Visualizer(hex) {
  let colorStr = '#ffffff';
  if (typeof hex === 'string') {
    colorStr = hex;
  } else if (hex && typeof hex === 'object' && hex.primary) {
    colorStr = hex.primary;
  }
  previewText.style.color = colorStr;
  const lum = calculateLuminance(colorStr);
  if (lum < 128) {
    previewText.style.textShadow = '0 0 2px #fff, 0 1px 3px rgba(255,255,255,0.95)';
  } else {
    previewText.style.textShadow = '0 1px 3px rgba(0,0,0,0.95), 0 0 2px rgba(0,0,0,0.8)';
  }
}
const updateFontPreview = updateRec601Visualizer;

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

async function applyFontColor(color) {
  try {
    const res = await fetch('/api/set-font', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ color })
    });
    const data = await res.json();
    if (data.success) {
      showToast(`字体配色已更新为 ${color}，并实时生效`);
      await fetchStatus();
    }
  } catch (err) {
    showToast('更新字体色失败: ' + err.message);
  }
}

// 7. Render Presets List
function renderPresetsList() {
  presetListEl.innerHTML = '';

  // 1. System Preset: Baseline V1 (初版黄金基线全套)
  const baselineCard = document.createElement('div');
  baselineCard.className = 'preset-card system-preset';
  baselineCard.innerHTML = `
    <div class="preset-header">
      <div class="preset-title-wrap">
        <h4>🌟 初版黄金基线</h4>
        <span class="preset-badge-system">系统预设</span>
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
      <span class="slot-pill-tag">右侧抽屉: 图像</span>
      <span class="slot-pill-tag">提问输入: 图像</span>
      <span class="slot-pill-tag">设置弹窗: 图像</span>
    </div>
    <div class="preset-actions-bar">
      <button class="btn btn-sm btn-apply-preset" id="btn-apply-baseline-preset">
        🚀 立即应用预设
      </button>
    </div>
  `;
  baselineCard.querySelector('#btn-apply-baseline-preset').onclick = async () => {
    try {
      showToast('正在应用【初版黄金基线】...', 2500);
      const res = await fetch('/api/theme/baseline', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
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

  // 2. System Preset: Vanilla (官方原版纯净模式)
  const vanillaCard = document.createElement('div');
  vanillaCard.className = 'preset-card system-preset';
  vanillaCard.innerHTML = `
    <div class="preset-header">
      <div class="preset-title-wrap">
        <h4>🛡️ 官方原版纯净</h4>
        <span class="preset-badge-system" style="background:rgba(255,255,255,0.08);color:#e2e8f0;border-color:rgba(255,255,255,0.16);">官方出厂</span>
      </div>
      <span class="preset-date">无壁纸</span>
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
      <button class="btn btn-sm btn-apply-preset" id="btn-apply-vanilla-preset">
        🚀 立即应用预设
      </button>
    </div>
  `;
  vanillaCard.querySelector('#btn-apply-vanilla-preset').onclick = async () => {
    if (!confirm('确定要切换为官方原版纯净模式吗？\n（当前美化状态将自动暂存）')) return;
    try {
      showToast('正在还原官方原版...', 2500);
      const res = await fetch('/api/theme/vanilla', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
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

  // 3. User Custom Presets
  if (state.presets && state.presets.length > 0) {
    state.presets.forEach(p => {
      const userCard = document.createElement('div');
      userCard.className = 'preset-card';

      const slotChineseMap = {
        left: '主对话',
        mid: '活跃终端',
        right: '右侧抽屉',
        bottom: '提问输入',
        settings: '设置弹窗'
      };
      const slotTagsHtml = [];
      if (p.slotsConfig) {
        for (const [sKey, sConf] of Object.entries(p.slotsConfig)) {
          if (sKey === 'fontColor' || sKey === 'isOriginal' || !sConf || typeof sConf !== 'object') continue;
          const label = slotChineseMap[sKey] || sKey;
          const isVid = sConf.type === 'video';
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
          <button class="btn btn-sm btn-apply-preset btn-apply-user-p" data-name="${p.name}">
            🚀 立即应用预设
          </button>
          <button class="btn btn-danger-ghost btn-sm btn-del-p" data-name="${p.name}">
            🗑️ 删除
          </button>
        </div>
      `;

      userCard.querySelector('.btn-apply-user-p').onclick = () => applyPreset(p.name);
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

async function applyPreset(name) {
  try {
    showToast(`正在装配并应用预设【${name}】...`, 3000);
    const res = await fetch('/api/presets/apply', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name })
    });
    const data = await res.json();
    if (data.success) {
      if (state.isCdpOnline) {
        showToast(`✨ 预设【${name}】已成功应用并极速热重载生效！`);
      } else if (state.isAntigravityRunning) {
        showToast(`✨ 预设【${name}】配置已固化！请完全重启一次 Antigravity 客户端使其生效（重启后将激活 0.3s 免重启热重载）`, 7000);
      } else {
        showToast(`✨ 预设【${name}】已成功应用！启动 Antigravity 即可显示`);
      }
      await fetchStatus();
    } else {
      alert('应用预设失败: ' + (data.error || '未知错误'));
    }
  } catch (e) {
    alert('应用预设失败: ' + e.message);
  }
}

// 8. Render Wallpaper Engine Status
function renderWeStatus(count) {
  if (count > 0) {
    weBadge.textContent = '已连接';
    weBadge.className = 'badge badge-accent';
    weCount.textContent = count;
  } else {
    weBadge.textContent = '未安装 Steam';
    weBadge.className = 'badge badge-subtle';
    weCount.textContent = '0';
  }
}

// 9. Render Core Patch & Backup Status
function renderPatchStatus(patchStatus, hasBackup, backupSize) {
  if (!patchBanner || !patchText) return;
  const isPatched = patchStatus && patchStatus.isPatched;
  const isFreshOfficialUpdate = patchStatus && patchStatus.isFreshOfficialUpdate;

  if (isPatched) {
    if (patchBadge) {
      patchBadge.className = 'badge badge-accent';
      patchBadge.textContent = '🟢 核心已注入';
    }
    patchBanner.style.background = 'rgba(52, 211, 153, 0.08)';
    patchBanner.style.borderColor = 'rgba(52, 211, 153, 0.2)';
    patchBanner.style.color = '#6ee7b7';
    if (patchDot) {
      patchDot.style.background = 'var(--accent-emerald)';
      patchDot.style.boxShadow = '0 0 10px rgba(52, 211, 153, 0.6)';
    }
    const bakStr = hasBackup ? ` (官方备份: ${backupSize}MB)` : '';
    patchText.textContent = `🟢 核心补丁已就绪 (CDP与流媒体双引擎已激活)${bakStr}`;
    if (btnInstallPatch) {
      btnInstallPatch.textContent = '🔄 重新注入 / 官方更新后重补';
      btnInstallPatch.className = 'btn btn-secondary btn-block';
    }
  } else if (isFreshOfficialUpdate) {
    if (patchBadge) {
      patchBadge.className = 'badge badge-danger';
      patchBadge.textContent = '⚡ 官方已更新';
    }
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
    if (patchBadge) {
      patchBadge.className = 'badge badge-subtle';
      patchBadge.textContent = '⚪ 官方原生';
    }
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

// 10. Event Listeners
function setupEvents() {
  // Slot Pills
  slotSelectorEl.querySelectorAll('.slot-pill').forEach(btn => {
    btn.onclick = () => {
      slotSelectorEl.querySelectorAll('.slot-pill').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.activeSlot = btn.dataset.slot;
      renderSlotView();
    };
  });

  // Position sliders
  sliderPosX.oninput = () => {
    valPosX.textContent = `${sliderPosX.value}%`;
  };
  sliderPosY.oninput = () => {
    valPosY.textContent = `${sliderPosY.value}%`;
  };

  btnApplySlot.onclick = async () => {
    const slot = state.activeSlot;
    const x = `${sliderPosX.value}%`;
    const y = `${sliderPosY.value}%`;
    try {
      const res = await fetch('/api/set-pos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slot, x, y })
      });
      const data = await res.json();
      if (data.success) {
        showToast(`槽位 [${slot}] 位置已更新为 ${x} ${y}`);
        await fetchStatus();
      }
    } catch (e) {
      showToast('更新对齐坐标失败: ' + e.message);
    }
  };

  // Reset Actions across all beautification areas
  if (btnResetBaseline) {
    btnResetBaseline.onclick = async () => {
      if (!confirm('确定要将全部 5 大核心槽位和字体恢复为初始黄金基线吗？\n（将加载初版完整壁纸矩阵与纯白高对比字体）')) return;
      try {
        showToast('正在恢复初版黄金基线...', 3000);
        const res = await fetch('/api/theme/baseline', { method: 'POST' });
        const data = await res.json();
        if (data.success) {
          showToast('✨ 已成功恢复为初版黄金基线！0.3s 热重载生效');
          await fetchStatus();
        } else {
          showToast('恢复基线失败: ' + (data.error || '未知错误'));
        }
      } catch (e) {
        showToast('恢复基线失败: ' + e.message);
      }
    };
  }

  if (btnResetSlot) {
    btnResetSlot.onclick = async () => {
      const slot = state.activeSlot;
      const meta = state.slotsMeta[slot] || {};
      const slotName = meta.desc || slot;
      if (!confirm(`确定要将当前槽位 [${slotName}] 恢复为初始默认壁纸吗？`)) return;
      try {
        showToast(`正在重置槽位 [${slot}] 的壁纸...`, 3000);
        const res = await fetch('/api/slots/reset-slot', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ slot })
        });
        const data = await res.json();
        if (data.success) {
          showToast(`✨ 槽位 [${slotName}] 壁纸已恢复为初始默认值，热重载已生效！`);
          await fetchStatus();
        } else {
          showToast('恢复默认壁纸失败: ' + (data.error || '未知错误'));
        }
      } catch (e) {
        showToast('恢复默认壁纸失败: ' + e.message);
      }
    };
  }

  if (btnResetPos) {
    btnResetPos.onclick = async () => {
      const slot = state.activeSlot;
      try {
        const res = await fetch('/api/slots/reset-pos', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ slot })
        });
        const data = await res.json();
        if (data.success) {
          showToast(`✨ 槽位 [${slot}] 对齐位置已重置为默认值！`);
          await fetchStatus();
        } else {
          showToast('重置位置失败: ' + (data.error || '未知错误'));
        }
      } catch (e) {
        showToast('重置位置失败: ' + e.message);
      }
    };
  }

  if (btnResetAllPos) {
    btnResetAllPos.onclick = async () => {
      if (!confirm('确定要将所有 5 个槽位的对齐位置重置为默认基准值吗？')) return;
      try {
        const res = await fetch('/api/slots/reset-pos', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ slot: 'all' })
        });
        const data = await res.json();
        if (data.success) {
          showToast('✨ 全部 5 大槽位对齐位置已重置为默认值！');
          await fetchStatus();
        } else {
          showToast('重置位置失败: ' + (data.error || '未知错误'));
        }
      } catch (e) {
        showToast('重置位置失败: ' + e.message);
      }
    };
  }

  if (btnResetFont) {
    btnResetFont.onclick = async () => {
      try {
        const res = await fetch('/api/font/reset', { method: 'POST' });
        const data = await res.json();
        if (data.success) {
          showToast('✨ 字体配色已重置为默认纯白高对比 (#ffffff)！');
          await fetchStatus();
        } else {
          showToast('重置字体失败: ' + (data.error || '未知错误'));
        }
      } catch (e) {
        showToast('重置字体失败: ' + e.message);
      }
    };
  }

  // Browse Native File Dialog
  btnBrowseNative.onclick = (e) => {
    e.stopPropagation();
    browseSlotFile();
  };

  // Native file input listener
  if (fileInput) {
    fileInput.onchange = async () => {
      if (fileInput.files && fileInput.files.length > 0) {
        await uploadSlotWallpaper(fileInput.files[0]);
      }
    };
  }

  // Drop zone click triggers file browse
  dropZone.onclick = (e) => {
    if (e.target !== btnBrowseNative && !btnBrowseNative.contains(e.target)) {
      browseSlotFile();
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
  dropZone.ondrop = async (e) => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      await uploadSlotWallpaper(file);
    }
  };

  // Font color picker and apply
  fontColorPicker.oninput = () => {
    fontHexInput.value = fontColorPicker.value;
    updateFontPreview(fontColorPicker.value);
  };
  fontHexInput.oninput = () => {
    if (fontHexInput.value.startsWith('#') && fontHexInput.value.length === 7) {
      fontColorPicker.value = fontHexInput.value;
      updateFontPreview(fontHexInput.value);
    }
  };
  btnApplyFont.onclick = () => {
    const val = fontHexInput.value.trim();
    if (val) applyFontColor(val);
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
        const msg = (e.message && e.message.includes('fetch'))
          ? '控制台服务未连接，请先双击运行桌面「AntigravityThemeStudio.exe」或根目录「一键注入美化补丁.bat」'
          : e.message;
        showToast('❌ 注入失败: ' + msg, 5000);
      } finally {
        btnInstallPatch.disabled = false;
        btnInstallPatch.textContent = originalText;
      }
    };
  }

  btnVanilla.onclick = async () => {
    if (!confirm('确定要恢复为 Antigravity 官方原版纯净模式吗？\n（当前壁纸将自动保存为快照，稍后随时可一键还原）')) return;
    try {
      showToast('正在还原官方原版...', 2500);
      const res = await fetch('/api/theme/vanilla', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        showToast('已成功恢复官方原版纯净模式！');
        await fetchStatus();
      }
    } catch (e) {
      showToast('恢复原版失败: ' + e.message);
    }
  };

  btnUninstall.onclick = async () => {
    if (!confirm('⚠️ 警告：彻底物理卸载将物理还原官方原版 app.asar 并清除所有注入。\n确定要彻底还原吗？')) return;
    try {
      showToast('正在彻底物理卸载...', 3000);
      const res = await fetch('/api/theme/uninstall', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
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

  // Window close beacon to ensure background process is killed cleanly
  window.addEventListener('beforeunload', () => {
    try {
      navigator.sendBeacon('/api/shutdown');
    } catch (_) {}
  });
}

async function browseSlotFile() {
  if (fileInput) {
    fileInput.click();
    return;
  }
  try {
    showToast('正在打开文件选择器...', 2000);
    const res = await fetch('/api/file/browse', { method: 'POST' });
    const data = await res.json();
    if (data.success && data.filePath) {
      await swapSlotWallpaper(data.filePath);
    }
  } catch (e) {
    showToast('打开文件对话框失败: ' + e.message);
  }
}

async function uploadSlotWallpaper(file) {
  const slot = state.activeSlot;
  const sizeMb = (file.size / 1024 / 1024).toFixed(1);
  showToast(`正在装配槽位 [${slot}]: ${file.name} (${sizeMb} MB)...`, 5000);
  try {
    const url = `/api/upload?slot=${encodeURIComponent(slot)}&filename=${encodeURIComponent(file.name)}`;
    const res = await fetch(url, {
      method: 'POST',
      body: file,
      headers: { 'Content-Type': 'application/octet-stream' }
    });
    const data = await res.json();
    if (data.success) {
      if (state.isCdpOnline) {
        showToast(`✨ 槽位 [${slot}] 壁纸更换完成，已通过 CDP 0.3s 极速热重载生效！`);
      } else if (state.isAntigravityRunning) {
        showToast(`✨ 槽位 [${slot}] 壁纸配置已固化！请完全重启一次 Antigravity 客户端使其生效并激活热重载`, 6000);
      } else {
        showToast(`✨ 槽位 [${slot}] 壁纸更换完成！启动 Antigravity 即可看到效果`);
      }
      await fetchStatus();
    } else {
      showToast('更换失败: ' + (data.error || '未知错误'));
    }
  } catch (e) {
    showToast('更换壁纸失败: ' + e.message);
  }
  if (fileInput) fileInput.value = '';
}

async function swapSlotWallpaper(filePath) {
  const slot = state.activeSlot;
  showToast(`正在装配槽位 [${slot}] 并处理 FastStart 优化...`, 4000);
  try {
    const res = await fetch('/api/swap', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slot, filePath })
    });
    const data = await res.json();
    if (data.success) {
      if (state.isCdpOnline) {
        showToast(`✨ 槽位 [${slot}] 壁纸更换完成，已通过 CDP 0.3s 极速热重载生效！`);
      } else if (state.isAntigravityRunning) {
        showToast(`✨ 槽位 [${slot}] 壁纸配置已固化！请完全重启一次 Antigravity 客户端使其生效并激活热重载`, 6000);
      } else {
        showToast(`✨ 槽位 [${slot}] 壁纸更换完成！启动 Antigravity 即可看到效果`);
      }
      await fetchStatus();
    } else {
      showToast('更换失败: ' + (data.error || '未知错误'));
    }
  } catch (e) {
    showToast('更换壁纸失败: ' + e.message);
  }
}

// Bootstrap
window.addEventListener('DOMContentLoaded', () => {
  initSpotlightEffect();
  setupEvents();
  fetchStatus();
  // Poll every 3.5s for live status updates
  setInterval(fetchStatus, 3500);

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      fetchStatus();
    }
  });
});
