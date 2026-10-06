// =========================================================================
// 🌸 Antigravity Theme Studio —— Desktop App Launcher
// Zero Background Footprint, Seamless Native Edge / Chrome App Mode
// =========================================================================

const { spawn, exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

// 1. Start Studio HTTP Backend
const { server, PORT } = require('./server');

// 2. Locate Best Browser Runner (Edge or Chrome in borderless App Mode)
function findBrowser() {
  const candidates = [
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    path.join(process.env.LOCALAPPDATA || '', 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
    path.join(process.env.LOCALAPPDATA || '', 'Google', 'Chrome', 'Application', 'chrome.exe')
  ];

  for (const c of candidates) {
    if (c && fs.existsSync(c)) {
      return c;
    }
  }
  return null;
}

const browserExe = findBrowser();
const appUrl = `http://127.0.0.1:${PORT}`;

console.log('=======================================================');
console.log('   🌸 Antigravity Theme Studio 极简桌面工坊');
console.log('   🚀 正在调起独立原生应用窗口...');
console.log('   💡 用完即关，零后台常驻，零性能消耗！');
console.log('=======================================================');

if (browserExe) {
  // Use dedicated temporary profile directory for clean isolated app window
  const profileDir = path.join(os.tmpdir(), 'antigravity_studio_profile');
  
  // 智能计算屏幕适中尺寸 (大屏 1400x860，常规屏 1366x820)
  const targetW = 1400;
  const targetH = 860;
  let targetX = 580;
  let targetY = 260;

  // 启动前强制重置 Chrome/Edge 记忆的 app_window_placement 与全屏尺寸
  try {
    const prefPath = path.join(profileDir, 'Default', 'Preferences');
    if (fs.existsSync(prefPath)) {
      const prefs = JSON.parse(fs.readFileSync(prefPath, 'utf8'));
      if (!prefs.browser) prefs.browser = {};

      let workW = 2560;
      let workH = 1392;
      try {
        const existingApp = prefs.browser.app_window_placement?.['127']?.['0']?.['0']?.['1_/'];
        if (existingApp && existingApp.work_area_right) {
          workW = existingApp.work_area_right;
          workH = existingApp.work_area_bottom;
        }
      } catch (_) {}

      targetX = Math.max(20, Math.round((workW - targetW) / 2));
      targetY = Math.max(20, Math.round((workH - targetH) / 2));

      delete prefs.browser.window_placement;
      prefs.browser.app_window_placement = {
        '127': {
          '0': {
            '0': {
              '1_/': {
                bottom: targetY + targetH,
                left: targetX,
                maximized: false,
                right: targetX + targetW,
                top: targetY,
                work_area_bottom: workH,
                work_area_left: 0,
                work_area_right: workW,
                work_area_top: 0
              }
            }
          }
        }
      };

      fs.writeFileSync(prefPath, JSON.stringify(prefs, null, 2));
    }
  } catch (_) {}

  const child = spawn(browserExe, [
    `--app=${appUrl}`,
    `--window-size=${targetW},${targetH}`,
    `--window-position=${targetX},${targetY}`,
    `--user-data-dir=${profileDir}`,
    '--no-first-run',
    '--no-default-browser-check'
  ], {
    detached: false,
    stdio: 'ignore'
  });

  // Windows 系统级锁定：后台执行窗口校准，剥离系统边框并切除 Chromium 自绘顶栏
  if (process.platform === 'win32') {
    setTimeout(() => {
      const psLines = [
        'Add-Type -TypeDefinition @"',
        '  using System;',
        '  using System.Runtime.InteropServices;',
        '  using System.Text;',
        '  public class Win32 {',
        '    [DllImport("user32.dll")] public static extern bool SetWindowPos(IntPtr hWnd, IntPtr hWndInsertAfter, int X, int Y, int cx, int cy, uint uFlags);',
        '    [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);',
        '    [DllImport("user32.dll")] public static extern int GetWindowLong(IntPtr hWnd, int nIndex);',
        '    [DllImport("user32.dll")] public static extern int SetWindowLong(IntPtr hWnd, int nIndex, int dwNewLong);',
        '    [DllImport("user32.dll", SetLastError=true, CharSet=CharSet.Auto)] public static extern int GetWindowText(IntPtr hWnd, StringBuilder lpString, int nMaxCount);',
        '    [DllImport("user32.dll", SetLastError=true, CharSet=CharSet.Auto)] public static extern int GetClassName(IntPtr hWnd, StringBuilder lpString, int nMaxCount);',
        '    [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint lpdwProcessId);',
        '    [DllImport("user32.dll")] public static extern bool EnumWindows(EnumWindowsProc lpEnumFunc, IntPtr lParam);',
        '    [DllImport("user32.dll")] public static extern int SetWindowRgn(IntPtr hWnd, IntPtr hRgn, bool bRedraw);',
        '    [DllImport("gdi32.dll")] public static extern IntPtr CreateRectRgn(int nLeftRect, int nTopRect, int nRightRect, int nBottomRect);',
        '    [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr hWnd);',
        '    [DllImport("user32.dll")] public static extern IntPtr GetWindow(IntPtr hWnd, uint uCmd);',
        '    [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr hWnd, out RECT lpRect);',
        '    public struct RECT { public int Left, Top, Right, Bottom; }',
        '    public delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);',
        '  }',
        '"@',
        '$targetHwnd = [IntPtr]::Zero',
        'for ($i = 0; $i -lt 40; $i++) {',
        '  $found = $false',
        '  [Win32]::EnumWindows([Win32+EnumWindowsProc]{',
        '    param($hWnd, $lParam)',
        '    $sbClass = New-Object System.Text.StringBuilder 256',
        '    [Win32]::GetClassName($hWnd, $sbClass, 256) | Out-Null',
        '    $cls = $sbClass.ToString()',
        '    if ($cls -ne "Chrome_WidgetWin_1") { return $true }',
        '    if (![Win32]::IsWindowVisible($hWnd)) { return $true }',
        '    if ([Win32]::GetWindow($hWnd, 4) -ne [IntPtr]::Zero) { return $true }',
        '    $pId = 0',
        '    [Win32]::GetWindowThreadProcessId($hWnd, [ref]$pId) | Out-Null',
        '    $pName = ""',
        '    try { $pName = (Get-Process -Id $pId -ErrorAction SilentlyContinue).ProcessName.ToLower() } catch {}',
        '    if ($pName -like "*antigravity*") { return $true }',
        '    if ($pName -ne "msedge" -and $pName -ne "chrome") { return $true }',
        '    $rc = New-Object Win32+RECT',
        '    [Win32]::GetWindowRect($hWnd, [ref]$rc) | Out-Null',
        '    if (($rc.Right - $rc.Left) -lt 600 -or ($rc.Bottom - $rc.Top) -lt 400) { return $true }',
        '    $sb = New-Object System.Text.StringBuilder 256',
        '    [Win32]::GetWindowText($hWnd, $sb, 256) | Out-Null',
        '    $title = $sb.ToString()',
        `    $isMatch = ($pId -eq ${child.pid}) -or ($title -like "*Theme Studio*" -or $title -like "*8316*" -or $title -like "*127.0.0.1*" -or $title -like "*localhost*")`,
        '    if ($isMatch) {',
        '      [Win32]::ShowWindow($hWnd, 9) | Out-Null',
        '      $style = [Win32]::GetWindowLong($hWnd, -16)',
        '      [Win32]::SetWindowLong($hWnd, -16, $style -band (-bnot 0x00CF0000)) | Out-Null',
        `      $finalH = ${targetH} + 34`,
        `      $finalY = [Math]::Max(0, ${targetY} - 34)`,
        `      [Win32]::SetWindowPos($hWnd, [IntPtr]::Zero, ${targetX}, $finalY, ${targetW}, $finalH, 0x0064) | Out-Null`,
        `      $hRgn = [Win32]::CreateRectRgn(0, 34, ${targetW}, $finalH)`,
        '      [Win32]::SetWindowRgn($hWnd, $hRgn, $true) | Out-Null',
        '      $script:targetHwnd = $hWnd',
        '      $script:found = $true',
        `      try { Invoke-RestMethod -Uri "http://127.0.0.1:${PORT}/api/window/register-hwnd?hwnd=$($hWnd.ToInt64())" -Method Post -TimeoutSec 1 } catch {}`,
        '      return $false',
        '    }',
        '    return $true',
        '  }, [IntPtr]::Zero) | Out-Null',
        '  if ($found) {',
        '    foreach ($d in @(250, 600, 1500)) {',
        '      Start-Sleep -Milliseconds $d',
        '      if ($targetHwnd -ne [IntPtr]::Zero) {',
        `        $finalH = ${targetH} + 34`,
        `        $finalY = [Math]::Max(0, ${targetY} - 34)`,
        `        [Win32]::SetWindowPos($targetHwnd, [IntPtr]::Zero, ${targetX}, $finalY, ${targetW}, $finalH, 0x0064) | Out-Null`,
        `        $hRgn = [Win32]::CreateRectRgn(0, 34, ${targetW}, $finalH)`,
        '        [Win32]::SetWindowRgn($targetHwnd, $hRgn, $true) | Out-Null',
        '      }',
        '    }',
        '    break',
        '  }',
        '  Start-Sleep -Milliseconds 120',
        '}'
      ];
      const script = psLines.join("\r\n");
      const b64 = Buffer.from(script, 'utf16le').toString('base64');
      exec(`powershell -NoProfile -Sta -EncodedCommand ${b64}`, () => {});
    }, 250);
  }

  child.on('error', (err) => {
    console.error('[Studio] 启动应用窗口失败:', err.message);
  });

  child.on('exit', () => {
    console.log('[Studio] 桌面窗口已关闭，正在释放全部后台服务...');
    try { server.close(); } catch (_) {}
    process.exit(0);
  });

  process.on('exit', () => {
    try { child.kill(); } catch (_) {}
  });
} else {
  console.log('未检测到 Edge/Chrome 独立桌面环境，正在使用系统默认浏览器打开...');
  const startCmd = process.platform === 'win32' ? `start "" "${appUrl}"` : `open "${appUrl}"`;
  exec(startCmd);
}
