using System;
using System.IO;
using System.Text;
using System.Runtime.InteropServices;
using System.Windows.Forms;

class FileDialogProgram
{
    [DllImport("user32.dll")]
    private static extern bool SetProcessDPIAware();

    [DllImport("user32.dll")]
    private static extern IntPtr GetForegroundWindow();

    private class WindowWrapper : IWin32Window
    {
        private readonly IntPtr _hwnd;
        public WindowWrapper(IntPtr handle) { _hwnd = handle; }
        public IntPtr Handle { get { return _hwnd; } }
    }

    [STAThread]
    static int Main(string[] args)
    {
        // 1. 启用系统级高清 DPI 感知 (彻底解决窗口发糊问题，文字与图标极致锐利)
        try { SetProcessDPIAware(); } catch { }

        Application.EnableVisualStyles();
        Application.SetCompatibleTextRenderingDefault(false);

        using (OpenFileDialog dialog = new OpenFileDialog())
        {
            dialog.Title = "🌸 选择要作为 Antigravity 壁纸的素材文件";
            dialog.Filter = "媒体与视频文件 (*.mp4;*.webm;*.jpg;*.png;*.webp)|*.mp4;*.webm;*.jpg;*.png;*.webp|视频文件 (*.mp4;*.webm)|*.mp4;*.webm|图像文件 (*.jpg;*.jpeg;*.png;*.webp)|*.jpg;*.jpeg;*.png;*.webp|所有文件 (*.*)|*.*";
            dialog.Multiselect = false;
            dialog.RestoreDirectory = false; // 允许 Windows 维持用户上次浏览的目录

            // 2. 目录记忆逻辑 (持久化记忆用户上次选择壁纸的文件夹)
            string lastDir = null;
            if (args.Length > 0 && !string.IsNullOrEmpty(args[0]) && Directory.Exists(args[0]))
            {
                lastDir = args[0];
            }
            else
            {
                string memoryFile = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "..", "studio", ".last_browse_dir.txt");
                if (File.Exists(memoryFile))
                {
                    try
                    {
                        string saved = File.ReadAllText(memoryFile, Encoding.UTF8).Trim();
                        if (Directory.Exists(saved)) lastDir = saved;
                    }
                    catch { }
                }
            }

            if (!string.IsNullOrEmpty(lastDir) && Directory.Exists(lastDir))
            {
                dialog.InitialDirectory = lastDir;
            }

            // 3. 将对话框无缝依附于当前顶层窗口，绝不创建任何白色背景虚拟窗体
            IntPtr fg = GetForegroundWindow();
            IWin32Window owner = fg != IntPtr.Zero ? new WindowWrapper(fg) : null;

            DialogResult result = owner != null ? dialog.ShowDialog(owner) : dialog.ShowDialog();

            if (result == DialogResult.OK && !string.IsNullOrEmpty(dialog.FileName))
            {
                // 保存本次访问目录与选定文件 (双通道返回机制)
                try
                {
                    string chosenDir = Path.GetDirectoryName(dialog.FileName);
                    string memoryFile = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "..", "studio", ".last_browse_dir.txt");
                    File.WriteAllText(memoryFile, chosenDir, Encoding.UTF8);

                    string resultFile = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "..", "studio", ".selected_file.txt");
                    File.WriteAllText(resultFile, dialog.FileName, Encoding.UTF8);
                }
                catch { }

                try
                {
                    Console.OutputEncoding = Encoding.UTF8;
                    Console.Write(dialog.FileName);
                }
                catch { }
                return 0;
            }
        }
        return 1;
    }
}
