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
                    ProcessStartInfo browserPsi = new ProcessStartInfo();
                    browserPsi.FileName = browserPath;
                    browserPsi.Arguments = string.Format(
                        "--app={0} --window-size=1280,860 --user-data-dir=\"{1}\" --no-first-run --no-default-browser-check",
                        appUrl,
                        tempProfile
                    );
                    browserPsi.UseShellExecute = false;

                    Process browserProc = Process.Start(browserPsi);
                    DateTime startTime = DateTime.Now;

                    if (browserProc != null)
                    {
                        browserProc.WaitForExit();

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
    }
}
