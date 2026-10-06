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

        [DllImport("user32.dll")]
        static extern bool IsWindowVisible(IntPtr hWnd);

        [DllImport("user32.dll")]
        static extern IntPtr GetWindow(IntPtr hWnd, uint uCmd);

        delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);

        [StructLayout(LayoutKind.Sequential)]
        struct RECT { public int Left, Top, Right, Bottom; }

        const int GWL_STYLE = -16;
        const int WS_CAPTION = 0x00C00000;
        const int WS_THICKFRAME = 0x00040000;
        const int WS_POPUP = unchecked((int)0x80000000);
        const uint GW_OWNER = 4;
        const uint WM_CLOSE = 0x0010;
        const int SW_HIDE = 0;

        static void Main(string[] args)
        {
            IntPtr targetHwnd = IntPtr.Zero;

            long h;
            if (args.Length > 0 && long.TryParse(args[0], out h) && h != 0)
            {
                targetHwnd = new IntPtr(h);
            }
            else
            {
                // Robust search specifically for the real Theme Studio Chromium window
                for (int r = 0; r < 30; r++)
                {
                    EnumWindows((hWnd, lParam) =>
                    {
                        StringBuilder sbClass = new StringBuilder(256);
                        GetClassName(hWnd, sbClass, 256);
                        string cls = sbClass.ToString();
                        if (cls != "Chrome_WidgetWin_1") return true;

                        if (!IsWindowVisible(hWnd)) return true;

                        uint pid = 0;
                        GetWindowThreadProcessId(hWnd, out pid);
                        if (pid == 0) return true;

                        string procName = "";
                        try
                        {
                            Process proc = Process.GetProcessById((int)pid);
                            procName = proc.ProcessName.ToLower();
                        }
                        catch { }

                        // ABSOLUTE SAFETY GUARD: NEVER touch Google Antigravity!
                        if (procName.Contains("antigravity")) return true;
                        if (procName != "msedge" && procName != "chrome") return true;

                        // Filter out popups, tooltips, and owned bubble windows
                        IntPtr owner = GetWindow(hWnd, GW_OWNER);
                        if (owner != IntPtr.Zero) return true;

                        int style = GetWindowLong(hWnd, GWL_STYLE);
                        if ((style & WS_POPUP) != 0 && (style & WS_CAPTION) == 0) return true;

                        RECT rc;
                        GetWindowRect(hWnd, out rc);
                        int w = rc.Right - rc.Left;
                        int ht = rc.Bottom - rc.Top;
                        if (w < 600 || ht < 400) return true;

                        StringBuilder sb = new StringBuilder(256);
                        GetWindowText(hWnd, sb, 256);
                        string title = sb.ToString();

                        if (title.Contains("Theme Studio") || title.Contains("8316") || title.Contains("127.0.0.1") || title.Contains("localhost"))
                        {
                            targetHwnd = hWnd;
                            return false;
                        }
                        return true;
                    }, IntPtr.Zero);

                    if (targetHwnd != IntPtr.Zero) break;
                    Thread.Sleep(25);
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

            int origW = rc.Right - rc.Left;
            int origH = rc.Bottom - rc.Top;

            if (origW <= 0 || origH <= 0) return;

            // Pure Region CRT Collapse:
            // The top 34px contains the clipped Chromium bar, the visible window starts at Y = 34
            int visibleH = origH > 34 ? origH - 34 : origH;
            int centerY = 34 + visibleH / 2;
            int centerX = origW / 2;

            uint pid = 0;
            try { GetWindowThreadProcessId(hWnd, out pid); } catch { }

            // Phase 1: Rapid vertical collapse into 2px horizontal scanline (~180ms, 18 frames)
            // By shrinking the clipping region, anything outside is 100% transparent to the Windows desktop!
            int steps1 = 18;
            int delay1 = 10;
            for (int i = 1; i <= steps1; i++)
            {
                double p = (double)i / steps1;
                // Ease in-out cubic
                double ease = p < 0.5 ? 4 * p * p * p : 1 - Math.Pow(-2 * p + 2, 3) / 2;

                int curH = Math.Max(2, (int)(visibleH * (1.0 - ease)));
                int top = centerY - curH / 2;
                int bottom = centerY + curH / 2;

                IntPtr hRgn = CreateRectRgn(0, top, origW, bottom);
                SetWindowRgn(hWnd, hRgn, true);

                Thread.Sleep(delay1);
            }

            // Phase 2: Rapid horizontal collapse into central spark (~140ms, 14 frames)
            int steps2 = 14;
            int delay2 = 10;
            for (int i = 1; i <= steps2; i++)
            {
                double p = (double)i / steps2;
                double ease = p * p;

                int curW = Math.Max(2, (int)(origW * (1.0 - ease)));
                int left = centerX - curW / 2;
                int right = centerX + curW / 2;

                IntPtr hRgn = CreateRectRgn(left, centerY - 1, right, centerY + 1);
                SetWindowRgn(hWnd, hRgn, true);

                Thread.Sleep(delay2);
            }

            // Phase 3: Hide and close immediately
            try { ShowWindow(hWnd, SW_HIDE); } catch { }
            try { PostMessage(hWnd, WM_CLOSE, IntPtr.Zero, IntPtr.Zero); } catch { }

            // Cleanly terminate the specific browser process to prevent background lingering
            try
            {
                Thread.Sleep(40);
                if (pid != 0)
                {
                    Process p = Process.GetProcessById((int)pid);
                    if (!p.ProcessName.ToLower().Contains("antigravity") && !p.HasExited)
                    {
                        p.Kill();
                    }
                }
            }
            catch { }
        }
    }
}
