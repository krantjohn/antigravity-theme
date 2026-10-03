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
  isMediaOnline: false
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
const btnBrowseNative = document.getElementById('btn-browse-native');
const dropZone = document.getElementById('drop-zone');
const fontPresetsGrid = document.getElementById('font-presets');
const fontColorPicker = document.getElementById('font-color-picker');
const fontHexInput = document.getElementById('font-hex-input');
const btnApplyFont = document.getElementById('btn-apply-font');
const previewText = document.getElementById('preview-text');
const presetListEl = document.getElementById('preset-list');
const btnOpenSaveModal = document.getElementById('btn-open-save-modal');
const savePresetModal = document.getElementById('save-preset-modal');
const btnCloseSaveModal = document.getElementById('btn-close-save-modal');
const btnCancelSaveModal = document.getElementById('btn-cancel-save-modal');
const btnConfirmSavePreset = document.getElementById('btn-confirm-save-preset');
const newPresetNameInput = document.getElementById('new-preset-name');
const newPresetDescInput = document.getElementById('new-preset-desc');
const btnVanilla = document.getElementById('btn-vanilla');
const btnUninstall = document.getElementById('btn-uninstall');
const btnShutdown = document.getElementById('btn-shutdown');
const toastContainer = document.getElementById('toast-container');
const weBadge = document.getElementById('we-badge');
const weCount = document.getElementById('we-count');
const backupBanner = document.getElementById('backup-banner');
const backupText = document.getElementById('backup-text');

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
      state.slotsConfig = data.slotsConfig || {};
      state.presets = data.presets || [];
      state.fontPresets = data.fontPresets || {};
      state.slotsMeta = data.slotsMeta || {};

      renderHeaderStatus(data);
      renderSlotView();
      renderFontPresets();
      renderPresetsList();
      renderWeStatus(data.weCount);
      renderBackupStatus(data.hasBackup, data.backupSize);
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
  const currentFont = state.slotsConfig.fontColor || '#ffffff';

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

  fontColorPicker.value = currentFont.length === 7 ? currentFont : '#ffffff';
  fontHexInput.value = currentFont;
  updateFontPreview(currentFont);
}

function updateRec601Visualizer(hex) {
  previewText.style.color = hex;
  const lum = calculateLuminance(hex);
  if (lum < 128) {
    previewText.style.textShadow = '0 0 2px #fff, 0 1px 3px rgba(255,255,255,0.95)';
  } else {
    previewText.style.textShadow = '0 1px 3px rgba(0,0,0,0.95), 0 0 2px rgba(0,0,0,0.8)';
  }
}
const updateFontPreview = updateRec601Visualizer;

function calculateLuminance(hex) {
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
  if (!state.presets || state.presets.length === 0) {
    presetListEl.innerHTML = '<div style="color:var(--text-dim);font-size:12px;padding:8px 0;">暂无已保存预设</div>';
    return;
  }

  state.presets.forEach(p => {
    const item = document.createElement('div');
    item.className = 'preset-item';
    item.innerHTML = `
      <div class="preset-info">
        <h4>${p.name}</h4>
        <div class="preset-meta">${p.filesCount || 0} 个素材 · ${(p.totalSizeMb || 0)} MB · ${p.desc || '独立预设'}</div>
      </div>
      <div class="preset-actions">
        <button class="btn btn-primary btn-sm btn-apply-p" data-name="${p.name}">应用</button>
        <button class="btn btn-danger-ghost btn-sm btn-del-p" data-name="${p.name}">删除</button>
      </div>
    `;

    item.querySelector('.btn-apply-p').onclick = () => applyPreset(p.name);

    item.querySelector('.btn-del-p').onclick = async () => {
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
        }
      } catch (e) {
        showToast('删除预设失败: ' + e.message);
      }
    };

    presetListEl.appendChild(item);
  });
}

async function applyPreset(name) {
  try {
    const res = await fetch('/api/presets/apply', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name })
    });
    const data = await res.json();
    if (data.success) {
      showToast(`已成功换装并应用预设: 【${name}】`);
      await fetchStatus();
    }
  } catch (e) {
    showToast('应用预设失败: ' + e.message);
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

// 9. Render Backup Status
function renderBackupStatus(hasBackup, size) {
  if (hasBackup) {
    backupBanner.style.background = 'rgba(52, 211, 153, 0.08)';
    backupBanner.style.borderColor = 'rgba(52, 211, 153, 0.2)';
    backupBanner.style.color = '#6ee7b7';
    backupText.textContent = `官方原版物理备份已在列 (${size} MB 出厂保护)`;
  } else {
    backupBanner.style.background = 'rgba(244, 63, 94, 0.08)';
    backupBanner.style.borderColor = 'rgba(244, 63, 94, 0.2)';
    backupBanner.style.color = '#fb7185';
    backupText.textContent = '未找到官方原版备份镜像';
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

  // Browse Native File Dialog
  btnBrowseNative.onclick = browseSlotFile;

  // Drop zone click triggers file browse
  dropZone.onclick = (e) => {
    if (e.target !== btnBrowseNative && !btnBrowseNative.contains(e.target)) {
      btnBrowseNative.click();
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
      // In Chromium / Electron or if path property is available
      if (file.path) {
        await swapSlotWallpaper(file.path);
      } else {
        showToast('提示：请使用“浏览本地文件”按钮精准指定文件路径。');
      }
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
    newPresetDescInput.value = '';
    newPresetNameInput.focus();
  };
  btnCloseSaveModal.onclick = () => savePresetModal.classList.remove('active');
  btnCancelSaveModal.onclick = () => savePresetModal.classList.remove('active');
  btnConfirmSavePreset.onclick = async () => {
    const name = newPresetNameInput.value.trim();
    const desc = newPresetDescInput.value.trim();
    if (!name) {
      alert('请输入预设名称！');
      return;
    }
    try {
      const res = await fetch('/api/presets/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, desc })
      });
      const data = await res.json();
      if (data.success) {
        showToast(`预设【${name}】保存并归档成功！`);
        savePresetModal.classList.remove('active');
        await fetchStatus();
      }
    } catch (e) {
      showToast('保存预设失败: ' + e.message);
    }
  };

  // Safety Center Actions
  btnVanilla.onclick = async () => {
    if (!confirm('确定要恢复为 Antigravity 官方原版纯净模式吗？\n（当前壁纸将自动保存为快照，稍后随时可一键还原）')) return;
    try {
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
}

async function browseSlotFile() {
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
      showToast(`✨ 槽位 [${slot}] 壁纸更换完成，已通过 CDP 0.3s 极速热重载生效！`);
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
});
