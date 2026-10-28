using System;
using System.IO;
using System.Net;
using System.Drawing;
using System.Reflection;
using System.Threading;
using System.Diagnostics;
using System.Windows.Forms;
using System.Runtime.InteropServices;
using System.IO.Compression;
using System.Security.Cryptography;
using Microsoft.Web.WebView2.WinForms;
using Microsoft.Web.WebView2.Core;

[assembly: AssemblyTitle("Antigravity Theme Studio")]
[assembly: AssemblyDescription("Antigravity 实时预览与全景工坊")]
[assembly: AssemblyCompany("krantjohn")]
[assembly: AssemblyProduct("Antigravity Theme Studio")]
[assembly: AssemblyCopyright("Copyright © 2026 krantjohn")]
[assembly: AssemblyVersion("3.1.0.0")]
[assembly: AssemblyFileVersion("3.1.0.0")]

namespace AntigravityThemeStudio
{
    static class Program
    {
        private static Process _nodeProcess;

        [STAThread]
        static void Main()
        {
            // 1. 注册内嵌 DLL 资源解析器 (实现纯单文件 EXE 自包含运行)
            AppDomain.CurrentDomain.AssemblyResolve += new ResolveEventHandler(OnResolveAssembly);

            // 2. 提取原生 WebView2Loader.dll 到专属安全目录
            EnsureNativeLoader();

            // 3. 启动应用主生命周期 (解耦 JIT 避免提前加载 WebView2 程序集)
            RunApp();
        }

        private static Assembly OnResolveAssembly(object sender, ResolveEventArgs args)
        {
            try
            {
                string assemblyName = new AssemblyName(args.Name).Name;
                string resourceName = assemblyName + ".dll";

                using (Stream stream = Assembly.GetExecutingAssembly().GetManifestResourceStream(resourceName))
                {
                    if (stream != null)
                    {
                        byte[] bytes = new byte[stream.Length];
                        stream.Read(bytes, 0, (int)stream.Length);
                        return Assembly.Load(bytes);
                    }
                }
            }
            catch { }
            return null;
        }

        [DllImport("kernel32.dll", CharSet = CharSet.Auto, SetLastError = true)]
        private static extern bool SetDllDirectory(string lpPathName);

        private static void EnsureNativeLoader()
        {
            try
            {
                // 如果当前目录已经有 WebView2Loader.dll 则直接使用
                string localLoader = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "WebView2Loader.dll");
                if (File.Exists(localLoader)) return;

                // 否则从嵌入资源释放到用户的 LocalAppData 目录中
                string cacheDir = Path.Combine(
                    Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
                    "antigravity_studio_host"
                );
                if (!Directory.Exists(cacheDir))
                {
                    Directory.CreateDirectory(cacheDir);
                }

                string targetLoader = Path.Combine(cacheDir, "WebView2Loader.dll");
                if (!File.Exists(targetLoader) || new FileInfo(targetLoader).Length == 0)
                {
                    using (Stream stream = Assembly.GetExecutingAssembly().GetManifestResourceStream("WebView2Loader.dll"))
                    {
                        if (stream != null)
                        {
                            using (FileStream fs = new FileStream(targetLoader, FileMode.Create, FileAccess.Write))
                            {
                                byte[] buffer = new byte[8192];
                                int read;
                                while ((read = stream.Read(buffer, 0, buffer.Length)) > 0)
                                {
                                    fs.Write(buffer, 0, read);
                                }
                            }
                        }
                    }
                }

                if (File.Exists(targetLoader) && new FileInfo(targetLoader).Length > 0)
                {
                    SetDllDirectory(cacheDir);
                }
            }
            catch { }
        }

        private static string EnsureStudioRuntime()
        {
            try
            {
                string runtimeDir = Path.Combine(
                    Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
                    "antigravity_studio_host",
                    "runtime"
                );

                string serverScript = Path.Combine(runtimeDir, "studio", "server.js");
                string hashFile = Path.Combine(runtimeDir, ".bundle_hash");

                using (Stream stream = Assembly.GetExecutingAssembly().GetManifestResourceStream("app_bundle.zip"))
                {
                    if (stream == null) return null;

                    string bundleHash;
                    using (SHA256 sha = SHA256.Create())
                    {
                        byte[] hashBytes = sha.ComputeHash(stream);
                        bundleHash = BitConverter.ToString(hashBytes).Replace("-", "").ToLowerInvariant();
                    }

                    if (stream.CanSeek)
                    {
                        stream.Seek(0, SeekOrigin.Begin);
                    }

                    // 检查本地缓存是否与当前内嵌 bundle 的哈希完全一致
                    if (File.Exists(serverScript) && File.Exists(hashFile))
                    {
                        try
                        {
                            string cachedHash = File.ReadAllText(hashFile).Trim();
                            if (string.Equals(cachedHash, bundleHash, StringComparison.OrdinalIgnoreCase))
                            {
                                return runtimeDir;
                            }
                        }
                        catch { }
                    }

                    // 释放 bundle 到运行时目录
                    if (!Directory.Exists(runtimeDir))
                    {
                        Directory.CreateDirectory(runtimeDir);
                    }

                    bool allExtracted = true;
                    using (ZipArchive archive = new ZipArchive(stream, ZipArchiveMode.Read))
                    {
                        foreach (ZipArchiveEntry entry in archive.Entries)
                        {
                            string relPath = entry.FullName.Replace('/', Path.DirectorySeparatorChar);
                            string destPath = Path.Combine(runtimeDir, relPath);

                            if (string.IsNullOrEmpty(entry.Name) || entry.FullName.EndsWith("/") || entry.FullName.EndsWith("\\"))
                            {
                                if (!Directory.Exists(destPath))
                                {
                                    Directory.CreateDirectory(destPath);
                                }
                                continue;
                            }

                            string destDir = Path.GetDirectoryName(destPath);
                            if (!string.IsNullOrEmpty(destDir) && !Directory.Exists(destDir))
                            {
                                Directory.CreateDirectory(destDir);
                            }

                            if (File.Exists(destPath))
                            {
                                try { File.SetAttributes(destPath, FileAttributes.Normal); } catch { }
                            }

                            try
                            {
                                using (Stream entryStream = entry.Open())
                                using (FileStream fs = new FileStream(destPath, FileMode.Create, FileAccess.Write, FileShare.ReadWrite))
                                {
                                    entryStream.CopyTo(fs);
                                }
                            }
                            catch
                            {
                                allExtracted = false;
                            }
                        }
                    }

                    if (allExtracted)
                    {
                        try
                        {
                            File.WriteAllText(hashFile, bundleHash);
                        }
                        catch { }
                    }

                    if (File.Exists(serverScript))
                    {
                        return runtimeDir;
                    }
                }
            }
            catch { }

            return null;
        }

        private static void RunApp()
        {
            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);

            string appDir = AppDomain.CurrentDomain.BaseDirectory;
            string serverScript = Path.Combine(appDir, "studio", "server.js");

            // 1. 优先检查当前目录或上级目录是否存在 studio/server.js (开发/源码仓库模式)
            if (!File.Exists(serverScript))
            {
                string altServer = Path.Combine(appDir, "..", "studio", "server.js");
                if (File.Exists(altServer))
                {
                    serverScript = Path.GetFullPath(altServer);
                    appDir = Path.GetDirectoryName(Path.GetDirectoryName(serverScript));
                }
            }

            // 2. 若当前目录及上级目录均不存在后台脚本 (单文件独立运行模式)，自动释放内嵌资源到用户运行时目录
            if (!File.Exists(serverScript))
            {
                string runtimeDir = EnsureStudioRuntime();
                if (!string.IsNullOrEmpty(runtimeDir))
                {
                    string runtimeServer = Path.Combine(runtimeDir, "studio", "server.js");
                    if (File.Exists(runtimeServer))
                    {
                        appDir = runtimeDir;
                        serverScript = runtimeServer;
                    }
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

            // 查找 Node.js 运行环境
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

            // 注册退出清理
            AppDomain.CurrentDomain.ProcessExit += new EventHandler((s, e) => CleanupNodeProcess());

            try
            {
                // 启动后台 Node 服务
                ProcessStartInfo nodePsi = new ProcessStartInfo();
                nodePsi.FileName = nodePath;
                nodePsi.Arguments = "\"" + serverScript + "\"";
                nodePsi.WorkingDirectory = appDir;
                nodePsi.CreateNoWindow = true;
                nodePsi.UseShellExecute = false;
                nodePsi.WindowStyle = ProcessWindowStyle.Hidden;

                // 注入 ELECTRON_RUN_AS_NODE 环境变量：若回退使用 Antigravity.exe 作为解释器时以纯 Node 模式执行
                nodePsi.EnvironmentVariables["ELECTRON_RUN_AS_NODE"] = "1";

                _nodeProcess = Process.Start(nodePsi);

                // 绑定到 Windows Job Object，内核级保证宿主关闭时自动销毁子进程
                if (_nodeProcess != null)
                {
                    JobObjectManager.BindProcess(_nodeProcess);
                }

                // 等待本地服务就绪
                WaitForServerReady("http://127.0.0.1:8316/api/status", 3500);

                // 启动 WebView2 原生暗黑窗体
                Application.Run(new StudioForm(appDir));
            }
            catch (Exception ex)
            {
                MessageBox.Show(
                    "启动工作室桌面宿主时发生异常:\n" + ex.Message,
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

        private static readonly object _cleanupLock = new object();

        public static void CleanupNodeProcess()
        {
            lock (_cleanupLock)
            {
                if (_nodeProcess != null && !_nodeProcess.HasExited)
                {
                    try
                    {
                        var req = (HttpWebRequest)WebRequest.Create("http://127.0.0.1:8316/api/shutdown");
                        req.Method = "POST";
                        req.Timeout = 500;
                        using (req.GetResponse()) { }
                    }
                    catch { }

                    try
                    {
                        if (!_nodeProcess.WaitForExit(400))
                        {
                            _nodeProcess.Kill();
                        }
                    }
                    catch { }
                    _nodeProcess = null;
                }
            }
        }

        private static bool WaitForServerReady(string url, int timeoutMs)
        {
            int elapsed = 0;
            int interval = 120;
            while (elapsed < timeoutMs)
            {
                try
                {
                    HttpWebRequest req = (HttpWebRequest)WebRequest.Create(url);
                    req.Timeout = 300;
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
            string localNode = Path.Combine(appDir, "bin", "node.exe");
            if (File.Exists(localNode)) return localNode;

            string[] knownPaths = new string[]
            {
                @"C:\Program Files\nodejs\node.exe",
                @"C:\Program Files (x86)\nodejs\node.exe",
                Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), @"Programs\node\node.exe"),
                Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), @"Programs\nodejs\node.exe"),
                Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData), @"npm\node.exe")
            };

            foreach (string p in knownPaths)
            {
                if (!string.IsNullOrEmpty(p) && File.Exists(p)) return p;
            }

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

            // 自动回退探测 Google Antigravity 原生 Electron 运行时 (支持以 ELECTRON_RUN_AS_NODE 模式作为 Node 执行)
            // 优先探测正在运行的 Antigravity 实例所在路径
            try
            {
                Process[] procs = Process.GetProcessesByName("Antigravity");
                if (procs != null && procs.Length > 0)
                {
                    foreach (var proc in procs)
                    {
                        try
                        {
                            string procPath = proc.MainModule.FileName;
                            if (!string.IsNullOrEmpty(procPath) && File.Exists(procPath))
                            {
                                return procPath;
                            }
                        }
                        catch { }
                    }
                }
            }
            catch { }

            string[] antigravityPaths = new string[]
            {
                Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), @"Programs\antigravity\Antigravity.exe"),
                Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles), @"Antigravity\Antigravity.exe"),
                Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFilesX86), @"Antigravity\Antigravity.exe"),
                Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), @"Programs\Google\Antigravity\Antigravity.exe"),
                Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles), @"Google\Antigravity\Antigravity.exe")
            };

            foreach (string p in antigravityPaths)
            {
                if (!string.IsNullOrEmpty(p) && File.Exists(p)) return p;
            }

            return null;
        }
    }

    public class StudioForm : Form
    {
        private WebView2 _webView;
        private string _appDir;

        public StudioForm(string appDir)
        {
            _appDir = appDir;
            InitializeComponent();
        }

        private void InitializeComponent()
        {
            this.Text = "Antigravity Theme Studio";
            this.StartPosition = FormStartPosition.CenterScreen;
            this.BackColor = Color.FromArgb(8, 10, 16);
            this.ForeColor = Color.White;
            this.KeyPreview = true;

            // 适中舒适尺寸：自适应屏幕居中
            ResetToOptimalSize();
            this.MinimumSize = new Size(1024, 680);

            // 加载图标
            string icoPath = Path.Combine(_appDir, "studio", "app.ico");
            if (File.Exists(icoPath))
            {
                try { this.Icon = new Icon(icoPath); } catch { }
            }
            if (this.Icon == null)
            {
                try { this.Icon = Icon.ExtractAssociatedIcon(Assembly.GetExecutingAssembly().Location); } catch { }
            }

            // 创建并嵌入 WebView2 控件
            _webView = new WebView2();
            _webView.Dock = DockStyle.Fill;
            _webView.DefaultBackgroundColor = Color.FromArgb(8, 10, 16);
            this.Controls.Add(_webView);

            // 监听窗体句柄生成事件与关闭事件
            this.HandleCreated += new EventHandler(StudioForm_HandleCreated);
            this.FormClosing += new FormClosingEventHandler(StudioForm_FormClosing);
            this.KeyDown += new KeyEventHandler(StudioForm_KeyDown);

            // 初始化 WebView2 核心环境
            InitWebViewCore();
        }

        public void ResetToOptimalSize()
        {
            Rectangle screen = Screen.PrimaryScreen.WorkingArea;
            int targetW = screen.Width > 2000 ? 1400 : Math.Min(1366, Math.Max(1200, (int)(screen.Width * 0.75)));
            int targetH = screen.Height > 1100 ? 860 : Math.Min(820, Math.Max(720, (int)(screen.Height * 0.8)));

            this.WindowState = FormWindowState.Normal;
            this.ClientSize = new Size(targetW, targetH);
            this.Location = new Point(
                screen.Left + Math.Max(20, (screen.Width - targetW) / 2),
                screen.Top + Math.Max(20, (screen.Height - targetH) / 2)
            );
        }

        private void StudioForm_KeyDown(object sender, KeyEventArgs e)
        {
            // 原生快捷键处理：F12 开启开发者工具，F5 刷新
            if (e.KeyCode == Keys.F12 && _webView != null && _webView.CoreWebView2 != null)
            {
                _webView.CoreWebView2.OpenDevToolsWindow();
                e.Handled = true;
            }
            else if (e.KeyCode == Keys.F5 && _webView != null && _webView.CoreWebView2 != null)
            {
                _webView.Reload();
                e.Handled = true;
            }
        }

        private void StudioForm_HandleCreated(object sender, EventArgs e)
        {
            EnableImmersiveDarkMode(this.Handle);
        }

        private void StudioForm_FormClosing(object sender, FormClosingEventArgs e)
        {
            Program.CleanupNodeProcess();
        }

        private async void InitWebViewCore()
        {
            try
            {
                string userDataFolder = Path.Combine(
                    Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
                    "antigravity_studio_wv2"
                );

                // 配置 WebView2 高性能 GPU 加速参数与干净环境
                string browserArgs = "--enable-gpu-rasterization --enable-zero-copy --disable-features=msSmartScreenProtection";
                var options = new CoreWebView2EnvironmentOptions(browserArgs);

                var env = await CoreWebView2Environment.CreateAsync(null, userDataFolder, options);
                await _webView.EnsureCoreWebView2Async(env);

                // 优化内置体验
                _webView.CoreWebView2.Settings.IsStatusBarEnabled = false;
                _webView.CoreWebView2.Settings.AreDefaultContextMenusEnabled = true;
                _webView.CoreWebView2.Settings.AreDevToolsEnabled = true;

                // 监听前端 window.close() 事件
                _webView.CoreWebView2.WindowCloseRequested += (s, e) =>
                {
                    this.Close();
                };

                // 监听前端与原生宿主的消息桥接
                _webView.CoreWebView2.WebMessageReceived += (s, e) =>
                {
                    try
                    {
                        string msg = e.TryGetWebMessageAsString();
                        if (msg == "reset-window")
                        {
                            this.Invoke(new Action(() => ResetToOptimalSize()));
                        }
                    }
                    catch { }
                };

                // 导航到 Studio 主页
                _webView.Source = new Uri("http://127.0.0.1:8316");
            }
            catch (Exception ex)
            {
                MessageBox.Show(
                    "WebView2 引擎初始化失败:\n" + ex.Message + "\n\n请确认系统已安装 Microsoft Edge WebView2 运行时。",
                    "Antigravity Theme Studio",
                    MessageBoxButtons.OK,
                    MessageBoxIcon.Error
                );
            }
        }

        private static void EnableImmersiveDarkMode(IntPtr hWnd)
        {
            try
            {
                int darkMode = 1;
                // DWMWA_USE_IMMERSIVE_DARK_MODE (20 on Win11, 19 on Win10 1903+)
                if (DwmSetWindowAttribute(hWnd, 20, ref darkMode, sizeof(int)) != 0)
                {
                    DwmSetWindowAttribute(hWnd, 19, ref darkMode, sizeof(int));
                }
            }
            catch { }
        }

        [DllImport("dwmapi.dll")]
        private static extern int DwmSetWindowAttribute(IntPtr hwnd, int attr, ref int attrValue, int attrSize);
    }

    /// <summary>
    /// Windows Job Object 内核监督器：保证父进程无论何种方式终止，子进程均由内核瞬间关闭
    /// </summary>
    public static class JobObjectManager
    {
        [DllImport("kernel32.dll", CharSet = CharSet.Auto, SetLastError = true)]
        private static extern IntPtr CreateJobObject(IntPtr lpJobAttributes, string lpName);

        [DllImport("kernel32.dll", SetLastError = true)]
        private static extern bool SetInformationJobObject(IntPtr hJob, int JobObjectInfoClass, IntPtr lpJobObjectInfo, uint cbJobObjectInfoLength);

        [DllImport("kernel32.dll", SetLastError = true)]
        private static extern bool AssignProcessToJobObject(IntPtr hJob, IntPtr hProcess);

        [StructLayout(LayoutKind.Sequential)]
        private struct JOBOBJECT_BASIC_LIMIT_INFORMATION
        {
            public Int64 PerProcessUserTimeLimit;
            public Int64 PerJobUserTimeLimit;
            public UInt32 LimitFlags;
            public UIntPtr MinimumWorkingSetSize;
            public UIntPtr MaximumWorkingSetSize;
            public UInt32 ActiveProcessLimit;
            public UIntPtr Affinity;
            public UInt32 PriorityClass;
            public UInt32 SchedulingClass;
        }

        [StructLayout(LayoutKind.Sequential)]
        private struct IO_COUNTERS
        {
            public UInt64 ReadOperationCount;
            public UInt64 WriteOperationCount;
            public UInt64 OtherOperationCount;
            public UInt64 ReadTransferCount;
            public UInt64 WriteTransferCount;
            public UInt64 OtherTransferCount;
        }

        [StructLayout(LayoutKind.Sequential)]
        private struct JOBOBJECT_EXTENDED_LIMIT_INFORMATION
        {
            public JOBOBJECT_BASIC_LIMIT_INFORMATION BasicLimitInformation;
            public IO_COUNTERS IoInfo;
            public UIntPtr ProcessMemoryLimit;
            public UIntPtr JobMemoryLimit;
            public UIntPtr PeakProcessMemoryLimit;
            public UIntPtr PeakJobMemoryLimit;
        }

        private const int JobObjectExtendedLimitInformation = 9;
        private const uint JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE = 0x2000;
        private const uint JOB_OBJECT_LIMIT_BREAKAWAY_OK = 0x00000800;
        private const uint JOB_OBJECT_LIMIT_SILENT_BREAKAWAY_OK = 0x00001000;

        private static IntPtr _jobHandle = IntPtr.Zero;
        private static object _lock = new object();

        public static void BindProcess(Process process)
        {
            if (process == null || process.HasExited) return;

            try
            {
                lock (_lock)
                {
                    if (_jobHandle == IntPtr.Zero)
                    {
                        _jobHandle = CreateJobObject(IntPtr.Zero, null);
                        var info = new JOBOBJECT_EXTENDED_LIMIT_INFORMATION();
                        info.BasicLimitInformation.LimitFlags = JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE | JOB_OBJECT_LIMIT_BREAKAWAY_OK | JOB_OBJECT_LIMIT_SILENT_BREAKAWAY_OK;

                        int length = Marshal.SizeOf(typeof(JOBOBJECT_EXTENDED_LIMIT_INFORMATION));
                        IntPtr extendedInfoPtr = Marshal.AllocHGlobal(length);
                        try
                        {
                            Marshal.StructureToPtr(info, extendedInfoPtr, false);
                            SetInformationJobObject(_jobHandle, JobObjectExtendedLimitInformation, extendedInfoPtr, (uint)length);
                        }
                        finally
                        {
                            Marshal.FreeHGlobal(extendedInfoPtr);
                        }
                    }

                    AssignProcessToJobObject(_jobHandle, process.Handle);
                }
            }
            catch { }
        }
    }
}
