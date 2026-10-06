using System;
using System.IO;
using System.Net;
using System.Threading;
using System.Diagnostics;
using System.Windows.Forms;

namespace AntigravityThemeStudio
{
    static class Program
    {
        private static Process _nodeProcess;
        private static IntPtr _studioHwnd = IntPtr.Zero;

        [STAThread]
        static void Main()
        {
            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);

            string appDir = AppDomain.CurrentDomain.BaseDirectory;
            string serverScript = Path.Combine(appDir, "studio", "server.js");

            if (!File.Exists(serverScript))
            {
                // In case exe is in bin/ or another subdirectory
                string altServer = Path.Combine(appDir, "..", "studio", "server.js");
                if (File.Exists(altServer))
                {
                    serverScript = Path.GetFullPath(altServer);
                    appDir = Path.GetDirectoryName(Path.GetDirectoryName(serverScript));
                }
            }

            if (!File.Exists(serverScript))
            {
                MessageBox.Show(
                    "未能找到工作室后台脚本: " + serverScript,
                    "Antigravity Theme Studio",
                    MessageBoxButtons.OK,
                    MessageBoxIcon.Error
                );
                return;
            }

            // 1. 查找 Node.js 路径
            string nodePath = FindNodeExecutable(appDir);
            if (string.IsNullOrEmpty(nodePath) || !File.Exists(nodePath))
            {
                DialogResult dr = MessageBox.Show(
                    "未检测到 Node.js 运行环境。\n\nAntigravity Theme Studio 依赖 Node.js 执行壁纸渲染与 CDP 通信。\n是否前往官网下载安装 Node.js？",
                    "Antigravity Theme Studio 运行环境提示",
                    MessageBoxButtons.YesNo,
                    MessageBoxIcon.Warning
                );
                if (dr == DialogResult.Yes)
                {
                    try { Process.Start("https://nodejs.org/"); } catch { }
                }
                return;
            }

            // 2. 查找 Edge / Chrome 独立应用桌面运行器
            string browserPath = FindBrowserExecutable();

            // 3. 注册退出清理钩子 (确保无论何种退出均释放 Node 进程)
            AppDomain.CurrentDomain.ProcessExit += (s, e) => CleanupNodeProcess();

            try
            {
                // 4. 以完全无黑窗方式启动本地后台服务器
                ProcessStartInfo nodePsi = new ProcessStartInfo();
                nodePsi.FileName = nodePath;
                nodePsi.Arguments = "\"" + serverScript + "\"";
                nodePsi.WorkingDirectory = appDir;
                nodePsi.CreateNoWindow = true;
                nodePsi.UseShellExecute = false;
                nodePsi.WindowStyle = ProcessWindowStyle.Hidden;

                _nodeProcess = Process.Start(nodePsi);

                // 5. 等待本地服务就绪 (最长等待 3 秒)
                bool isReady = WaitForServerReady("http://127.0.0.1:8316/api/status", 3000);

                string appUrl = "http://127.0.0.1:8316";

                // 6. 调起桌面窗口
                if (!string.IsNullOrEmpty(browserPath) && File.Exists(browserPath))
                {
                    string tempProfile = Path.Combine(Path.GetTempPath(), "antigravity_studio_profile");

                    int screenW = Screen.PrimaryScreen.WorkingArea.Width;
                    int screenH = Screen.PrimaryScreen.WorkingArea.Height;
                    int screenX = Screen.PrimaryScreen.WorkingArea.Left;
                    int screenY = Screen.PrimaryScreen.WorkingArea.Top;

                    // 计算适中舒适的居中窗口尺寸 (大屏 1400x860，常规屏 1366x820)
                    int targetW = screenW > 2000 ? 1400 : Math.Min(1366, Math.Max(1200, (int)(screenW * 0.72)));
                    int targetH = screenH > 1100 ? 860 : Math.Min(820, Math.Max(720, (int)(screenH * 0.78)));
                    int targetX = screenX + Math.Max(20, (screenW - targetW) / 2);
                    int targetY = screenY + Math.Max(20, (screenH - targetH) / 2);

                    // 启动前强制重置 Chrome/Edge 记忆的窗口状态与全屏尺寸
                    SanitizeChromePreferences(tempProfile, screenX, screenY, screenW, screenH, targetX, targetY, targetW, targetH);

                    ProcessStartInfo browserPsi = new ProcessStartInfo();
                    browserPsi.FileName = browserPath;
                    browserPsi.Arguments = string.Format(
                        "--app={0} --window-size={1},{2} --window-position={3},{4} --user-data-dir=\"{5}\" --no-first-run --no-default-browser-check",
                        appUrl,
                        targetW,
                        targetH,
                        targetX,
                        targetY,
                        tempProfile
                    );
                    browserPsi.UseShellExecute = false;

                    Process browserProc = Process.Start(browserPsi);
                    DateTime startTime = DateTime.Now;

                    // 后台线程使用 Windows 原生 Win32 API 强制锁定窗口大小和位置 (防止浏览器内核抢占全屏)
                    EnforceOptimalWindowSize(targetX, targetY, targetW, targetH);

                    // 后台线程监听: 若用户在前端通过 CRT 息屏点击 [✕ 关闭软件]，Node 进程先行释放，则同步关闭浏览器窗口
                    ThreadPool.QueueUserWorkItem((s) =>
                    {
                        if (_nodeProcess != null)
                        {
                            try
                            {
                                _nodeProcess.WaitForExit();
                                if (browserProc != null && !browserProc.HasExited)
                                {
                                    browserProc.CloseMainWindow();
                                    if (!browserProc.WaitForExit(400))
                                    {
                                        browserProc.Kill();
                                    }
                                }
                            }
                            catch { }
                        }
                    });

                    if (browserProc != null)
                    {
                        browserProc.WaitForExit();

                        // 退出后再次清理 Chrome 可能写回的大窗口数据，确保下次启动依然纯净
                        SanitizeChromePreferences(tempProfile, screenX, screenY, screenW, screenH, targetX, targetY, targetW, targetH);

                        // 如果窗口运行时间大于 2 秒后退出，说明是用户主动关闭了窗口
                        if ((DateTime.Now - startTime).TotalSeconds >= 2.0)
                        {
                            CleanupNodeProcess();
                            return;
                        }
                    }
                }
                else
                {
                    // 降级使用系统默认浏览器
                    try { Process.Start(appUrl); } catch { }
                }

                // 7. 若浏览器托管进程提早脱钩，则等待 nodeProcess 退出 (例如用户在前端点了 [✕ 退出软件])
                if (_nodeProcess != null && !_nodeProcess.HasExited)
                {
                    _nodeProcess.WaitForExit();
                }
            }
            catch (Exception ex)
            {
                MessageBox.Show(
                    "启动工作室时发生异常:\n" + ex.Message,
                    "Antigravity Theme Studio",
                    MessageBoxButtons.OK,
                    MessageBoxIcon.Error
                );
            }
            finally
            {
                CleanupNodeProcess();
            }
        }

        private static void CleanupNodeProcess()
        {
            if (_nodeProcess != null && !_nodeProcess.HasExited)
            {
                try
                {
                    // 尝试优雅关闭
                    var req = (HttpWebRequest)WebRequest.Create("http://127.0.0.1:8316/api/shutdown");
                    req.Method = "POST";
                    req.Timeout = 500;
                    using (req.GetResponse()) { }
                }
                catch { }

                try
                {
                    if (!_nodeProcess.WaitForExit(500))
                    {
                        _nodeProcess.Kill();
                    }
                }
                catch { }
            }
        }

        private static bool WaitForServerReady(string url, int timeoutMs)
        {
            int elapsed = 0;
            int interval = 150;
            while (elapsed < timeoutMs)
            {
                try
                {
                    HttpWebRequest req = (HttpWebRequest)WebRequest.Create(url);
                    req.Timeout = 400;
                    using (HttpWebResponse resp = (HttpWebResponse)req.GetResponse())
                    {
                        if (resp.StatusCode == HttpStatusCode.OK)
                        {
                            return true;
                        }
                    }
                }
                catch { }

                Thread.Sleep(interval);
                elapsed += interval;
            }
            return false;
        }

        private static string FindNodeExecutable(string appDir)
        {
            // 1. 检查应用目录内
            string localNode = Path.Combine(appDir, "bin", "node.exe");
            if (File.Exists(localNode)) return localNode;

            // 2. 检查常见安装位置
            string[] knownPaths = new string[]
            {
                @"D:\720721\nodejs\node.exe",
                @"C:\Program Files\nodejs\node.exe",
                @"C:\Program Files (x86)\nodejs\node.exe",
                Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), @"Programs\node\node.exe"),
                Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData), @"npm\node.exe")
            };

            foreach (string p in knownPaths)
            {
                if (!string.IsNullOrEmpty(p) && File.Exists(p)) return p;
            }

            // 3. 检查系统 PATH 环境变量
            string pathEnv = Environment.GetEnvironmentVariable("PATH");
            if (!string.IsNullOrEmpty(pathEnv))
            {
                string[] dirs = pathEnv.Split(';');
                foreach (string d in dirs)
                {
                    string trimmed = d.Trim().Trim('"');
                    if (!string.IsNullOrEmpty(trimmed))
                    {
                        try
                        {
                            string candidate = Path.Combine(trimmed, "node.exe");
                            if (File.Exists(candidate)) return candidate;
                        }
                        catch { }
                    }
                }
            }

            return null;
        }

        private static string FindBrowserExecutable()
        {
            string[] knownPaths = new string[]
            {
                @"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
                @"C:\Program Files\Microsoft\Edge\Application\msedge.exe",
                @"C:\Program Files\Google\Chrome\Application\chrome.exe",
                @"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
                Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), @"Microsoft\Edge\Application\msedge.exe"),
                Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), @"Google\Chrome\Application\chrome.exe")
            };

            foreach (string p in knownPaths)
            {
                if (!string.IsNullOrEmpty(p) && File.Exists(p)) return p;
            }

            return null;
        }

        private static void SanitizeChromePreferences(string tempProfile, int screenX, int screenY, int screenW, int screenH, int targetX, int targetY, int targetW, int targetH)
        {
            try
            {
                string prefPath = Path.Combine(tempProfile, "Default", "Preferences");
                if (!File.Exists(prefPath)) return;

                string json = File.ReadAllText(prefPath);

                // 强制关闭 maximized 标志
                json = json.Replace("\"maximized\":true", "\"maximized\":false");

                // 构造标准化居中的 app_window_placement 数据结构
                string targetPlacement = string.Format(
                    "\"app_window_placement\":{{\"127\":{{\"0\":{{\"0\":{{\"1_/\":{{\"bottom\":{0},\"left\":{1},\"maximized\":false,\"right\":{2},\"top\":{3},\"work_area_bottom\":{4},\"work_area_left\":{5},\"work_area_right\":{6},\"work_area_top\":{7}}}}}}}}}",
                    targetY + targetH,
                    targetX,
                    targetX + targetW,
                    targetY,
                    screenY + screenH,
                    screenX,
                    screenX + screenW,
                    screenY
                );

                // 移除或覆写历史可能残留的大窗口/全屏 app_window_placement
                json = System.Text.RegularExpressions.Regex.Replace(
                    json,
                    "\"app_window_placement\"\\s*:\\s*\\{[^}]*(\\{[^}]*(\\{[^}]*(\\{[^}]*\\})*\\})*\\})*\\}",
                    targetPlacement
                );

                // 清理常规 window_placement
                json = System.Text.RegularExpressions.Regex.Replace(
                    json,
                    "\"window_placement\"\\s*:\\s*\\{[^}]*\\}",
                    "\"window_placement\":{\"bottom\":" + (targetY + targetH) + ",\"left\":" + targetX + ",\"maximized\":false,\"right\":" + (targetX + targetW) + ",\"top\":" + targetY + "}"
                );

                File.WriteAllText(prefPath, json);
            }
            catch { }
        }

        private static void EnforceOptimalWindowSize(int targetX, int targetY, int targetW, int targetH)
        {
            ThreadPool.QueueUserWorkItem((state) =>
            {
                // 轮询最多 6 秒，确保 Chromium 渲染器就绪后即刻锁定
                for (int i = 0; i < 60; i++)
                {
                    Thread.Sleep(100);
                    bool found = false;
                    EnumWindows((hWnd, lParam) =>
                    {
                        System.Text.StringBuilder sbClass = new System.Text.StringBuilder(256);
                        GetClassName(hWnd, sbClass, 256);
                        string cls = sbClass.ToString();

                        System.Text.StringBuilder sb = new System.Text.StringBuilder(256);
                        GetWindowText(hWnd, sb, 256);
                        string title = sb.ToString();

                        if (cls == "Chrome_WidgetWin_1" && (title.Contains("Antigravity") || title.Contains("127.0.0.1") || title.Contains("localhost")))
                        {
                            _studioHwnd = hWnd;
                            ShowWindow(hWnd, SW_RESTORE);

                            // 剥离系统原生标题栏样式
                            int style = GetWindowLong(hWnd, GWL_STYLE);
                            SetWindowLong(hWnd, GWL_STYLE, style & ~WS_CAPTION & ~WS_THICKFRAME);

                            // 视窗顶部向上位移 34px，高度延伸 34px，并通过 SetWindowRgn 物理切除 Chromium 自绘顶栏
                            int finalH = targetH + 34;
                            int finalY = Math.Max(0, targetY - 34);
                            SetWindowPos(hWnd, IntPtr.Zero, targetX, finalY, targetW, finalH, SWP_NOZORDER | SWP_FRAMECHANGED | SWP_SHOWWINDOW);

                            IntPtr hRgn = CreateRectRgn(0, 34, targetW, finalH);
                            SetWindowRgn(hWnd, hRgn, true);

                            found = true;
                            return false;
                        }
                        return true;
                    }, IntPtr.Zero);

                    if (found) break;
                }
            });
        }

        [System.Runtime.InteropServices.DllImport("user32.dll", SetLastError = true)]
        private static extern bool SetWindowPos(IntPtr hWnd, IntPtr hWndInsertAfter, int X, int Y, int cx, int cy, uint uFlags);

        [System.Runtime.InteropServices.DllImport("user32.dll")]
        private static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);

        [System.Runtime.InteropServices.DllImport("user32.dll", SetLastError = true, CharSet = System.Runtime.InteropServices.CharSet.Auto)]
        private static extern int GetWindowText(IntPtr hWnd, System.Text.StringBuilder lpString, int nMaxCount);

        [System.Runtime.InteropServices.DllImport("user32.dll", SetLastError = true, CharSet = System.Runtime.InteropServices.CharSet.Auto)]
        private static extern int GetClassName(IntPtr hWnd, System.Text.StringBuilder lpString, int nMaxCount);

        [System.Runtime.InteropServices.DllImport("user32.dll")]
        private static extern bool EnumWindows(EnumWindowsProc lpEnumFunc, IntPtr lParam);

        [System.Runtime.InteropServices.DllImport("user32.dll")]
        private static extern int GetWindowLong(IntPtr hWnd, int nIndex);

        [System.Runtime.InteropServices.DllImport("user32.dll")]
        private static extern int SetWindowLong(IntPtr hWnd, int nIndex, int dwNewLong);

        [System.Runtime.InteropServices.DllImport("user32.dll")]
        private static extern bool SetLayeredWindowAttributes(IntPtr hWnd, uint crKey, byte bAlpha, uint dwFlags);

        [System.Runtime.InteropServices.DllImport("user32.dll")]
        private static extern bool GetWindowRect(IntPtr hWnd, out RECT lpRect);

        [System.Runtime.InteropServices.DllImport("user32.dll")]
        private static extern int SetWindowRgn(IntPtr hWnd, IntPtr hRgn, bool bRedraw);

        [System.Runtime.InteropServices.DllImport("gdi32.dll")]
        private static extern IntPtr CreateRectRgn(int nLeftRect, int nTopRect, int nRightRect, int nBottomRect);

        [System.Runtime.InteropServices.StructLayout(System.Runtime.InteropServices.LayoutKind.Sequential)]
        private struct RECT { public int Left, Top, Right, Bottom; }

        private delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);

        private const uint SWP_NOZORDER = 0x0004;
        private const uint SWP_SHOWWINDOW = 0x0040;
        private const uint SWP_FRAMECHANGED = 0x0020;
        private const int SW_RESTORE = 9;
        private const int GWL_STYLE = -16;
        private const int GWL_EXSTYLE = -20;
        private const int WS_CAPTION = 0x00C00000;
        private const int WS_THICKFRAME = 0x00040000;
        private const int WS_EX_LAYERED = 0x00080000;
        private const int LWA_ALPHA = 0x00000002;
    }
}
