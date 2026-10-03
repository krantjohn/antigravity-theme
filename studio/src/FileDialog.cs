using System;
using System.IO;
using System.Text;
using System.Windows.Forms;

class FileDialogProgram
{
    [STAThread]
    static int Main(string[] args)
    {
        Application.EnableVisualStyles();
        Application.SetCompatibleTextRenderingDefault(false);

        using (OpenFileDialog dialog = new OpenFileDialog())
        {
            dialog.Title = "🌸 选择要作为 Antigravity 壁纸的素材文件";
            dialog.Filter = "媒体与视频文件 (*.mp4;*.webm;*.jpg;*.png;*.webp)|*.mp4;*.webm;*.jpg;*.png;*.webp|视频文件 (*.mp4;*.webm)|*.mp4;*.webm|图像文件 (*.jpg;*.jpeg;*.png;*.webp)|*.jpg;*.jpeg;*.png;*.webp|所有文件 (*.*)|*.*";
            dialog.RestoreDirectory = true;
            dialog.Multiselect = false;

            string initial = Environment.GetFolderPath(Environment.SpecialFolder.MyVideos);
            if (args.Length > 0 && !string.IsNullOrEmpty(args[0]) && Directory.Exists(args[0]))
            {
                initial = args[0];
            }
            if (Directory.Exists(initial))
            {
                dialog.InitialDirectory = initial;
            }

            using (Form dummy = new Form())
            {
                dummy.TopMost = true;
                dummy.StartPosition = FormStartPosition.CenterScreen;
                dummy.Width = 0;
                dummy.Height = 0;
                dummy.ShowInTaskbar = false;
                dummy.FormBorderStyle = FormBorderStyle.None;
                dummy.WindowState = FormWindowState.Minimized;
                dummy.Show();
                dummy.WindowState = FormWindowState.Normal;

                DialogResult result = dialog.ShowDialog(dummy);
                dummy.Close();

                if (result == DialogResult.OK && !string.IsNullOrEmpty(dialog.FileName))
                {
                    Console.OutputEncoding = Encoding.UTF8;
                    Console.Write(dialog.FileName);
                    return 0;
                }
            }
        }
        return 1;
    }
}
