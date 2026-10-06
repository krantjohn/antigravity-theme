using System;
using System.Diagnostics;
using System.Runtime.InteropServices;
using System.Text;
using System.Threading;

namespace AntigravityThemeStudio
{
    class CrtAnimator
    {
        [DllImport("user32.dll")]
        static extern bool EnumWindows(EnumWindowsProc lpEnumFunc, IntPtr lParam);

        [DllImport("user32.dll", SetLastError = true, CharSet = CharSet.Auto)]
        static extern int GetWindowText(IntPtr hWnd, StringBuilder lpString, int nMaxCount);

        [DllImport("user32.dll", SetLastError = true, CharSet = CharSet.Auto)]
        static extern int GetClassName(IntPtr hWnd, StringBuilder lpString, int nMaxCount);

        [DllImport("user32.dll", SetLastError = true)]
        static extern bool SetWindowPos(IntPtr hWnd, IntPtr hWndInsertAfter, int X, int Y, int cx, int cy, uint uFlags);

        [DllImport("user32.dll")]
        static extern int GetWindowLong(IntPtr hWnd, int nIndex);

        [DllImport("user32.dll")]
        static extern int SetWindowLong(IntPtr hWnd, int nIndex, int dwNewLong);

        [DllImport("user32.dll")]
        static extern bool SetLayeredWindowAttributes(IntPtr hWnd, uint crKey, byte bAlpha, uint dwFlags);

        [DllImport("user32.dll")]
        static extern bool GetWindowRect(IntPtr hWnd, out RECT lpRect);

        [DllImport("user32.dll")]
        static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);

        [DllImport("user32.dll")]
        static extern bool PostMessage(IntPtr hWnd, uint Msg, IntPtr wParam, IntPtr lParam);

        [DllImport("user32.dll")]
        static extern int SetWindowRgn(IntPtr hWnd, IntPtr hRgn, bool bRedraw);

        [DllImport("gdi32.dll")]
        static extern IntPtr CreateRectRgn(int nLeftRect, int nTopRect, int nRightRect, int nBottomRect);

        [DllImport("user32.dll")]
        static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint lpdwProcessId);

        delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);

        [StructLayout(LayoutKind.Sequential)]
        struct RECT { public int Left, Top, Right, Bottom; }

        const int GWL_STYLE = -16;
        const int GWL_EXSTYLE = -20;
        const int WS_CAPTION = 0x00C00000;
        const int WS_THICKFRAME = 0x00040000;
        const int WS_EX_LAYERED = 0x00080000;
        const int LWA_ALPHA = 0x00000002;

        const uint SWP_NOZORDER = 0x0004;
        const uint SWP_FRAMECHANGED = 0x0020;
        const uint WM_CLOSE = 0x0010;
        const int SW_HIDE = 0;

        static void Main(string[] args)
        {
            IntPtr targetHwnd = IntPtr.Zero;

            long h;
            if (args.Length > 0 && long.TryParse(args[0], out h))
            {
                targetHwnd = new IntPtr(h);
            }
            else
            {
                // Search specifically for the Theme Studio Chromium window
                for (int r = 0; r < 15; r++)
                {
                    EnumWindows((hWnd, lParam) =>
                    {
                        StringBuilder sbClass = new StringBuilder(256);
                        GetClassName(hWnd, sbClass, 256);
                        string cls = sbClass.ToString();

                        StringBuilder sb = new StringBuilder(256);
                        GetWindowText(hWnd, sb, 256);
                        string title = sb.ToString();

                        if (cls == "Chrome_WidgetWin_1" && (title.Contains("Antigravity") || title.Contains("127.0.0.1") || title.Contains("localhost")))
                        {
                            targetHwnd = hWnd;
                            return false;
                        }
                        return true;
                    }, IntPtr.Zero);

                    if (targetHwnd != IntPtr.Zero) break;
                    Thread.Sleep(30);
                }
            }

            if (targetHwnd != IntPtr.Zero)
            {
                CollapseWindow(targetHwnd);
            }
        }

        public static void CollapseWindow(IntPtr hWnd)
        {
            RECT rc;
            if (!GetWindowRect(hWnd, out rc)) return;

            int origX = rc.Left;
            int origY = rc.Top;
            int origW = rc.Right - rc.Left;
            int origH = rc.Bottom - rc.Top;

            if (origW <= 0 || origH <= 0) return;

            int centerY = origY + origH / 2;
            int centerX = origX + origW / 2;

            uint pid = 0;
            try { GetWindowThreadProcessId(hWnd, out pid); } catch { }

            try
            {
                // Ensure borderless style
                int style = GetWindowLong(hWnd, GWL_STYLE);
                SetWindowLong(hWnd, GWL_STYLE, style & ~WS_CAPTION & ~WS_THICKFRAME);
                int exStyle = GetWindowLong(hWnd, GWL_EXSTYLE);
                SetWindowLong(hWnd, GWL_EXSTYLE, exStyle | WS_EX_LAYERED);
                SetWindowPos(hWnd, IntPtr.Zero, origX, origY, origW, origH, SWP_NOZORDER | SWP_FRAMECHANGED);
            }
            catch { }

            // Phase 1: Rapid vertical collapse into 3px horizontal scanline (~200ms)
            int steps1 = 18;
            int delay1 = 11;
            for (int i = 1; i <= steps1; i++)
            {
                double p = (double)i / steps1;
                // Ease in-out cubic
                double ease = p < 0.5 ? 4 * p * p * p : 1 - Math.Pow(-2 * p + 2, 3) / 2;

                int curH = Math.Max(3, (int)(origH * (1.0 - ease)));
                int curY = centerY - curH / 2;

                SetWindowPos(hWnd, IntPtr.Zero, origX, curY, origW, curH, SWP_NOZORDER);

                // Keep clipping any top Chromium chrome during collapse
                try
                {
                    int topClip = Math.Min(34, Math.Max(0, curH - 3));
                    IntPtr hRgn = CreateRectRgn(0, topClip, origW, curH);
                    SetWindowRgn(hWnd, hRgn, true);
                }
                catch { }

                Thread.Sleep(delay1);
            }

            // Phase 2: Rapid horizontal collapse into central spark & fade to black (~160ms)
            int steps2 = 16;
            int delay2 = 10;
            for (int i = 1; i <= steps2; i++)
            {
                double p = (double)i / steps2;
                double ease = p * p;

                int curW = Math.Max(3, (int)(origW * (1.0 - ease)));
                int curX = centerX - curW / 2;
                byte alpha = (byte)Math.Max(0, (int)(255 * (1.0 - ease)));

                SetWindowPos(hWnd, IntPtr.Zero, curX, centerY - 1, curW, 3, SWP_NOZORDER);
                try { SetLayeredWindowAttributes(hWnd, 0, alpha, LWA_ALPHA); } catch { }
                Thread.Sleep(delay2);
            }

            // Phase 3: Hide and close immediately
            try { ShowWindow(hWnd, SW_HIDE); } catch { }
            try { PostMessage(hWnd, WM_CLOSE, IntPtr.Zero, IntPtr.Zero); } catch { }

            // Cleanly terminate the specific browser process to prevent background lingering
            try
            {
                Thread.Sleep(50);
                if (pid != 0)
                {
                    Process p = Process.GetProcessById((int)pid);
                    if (!p.HasExited)
                    {
                        p.Kill();
                    }
                }
            }
            catch { }
        }
    }
}
