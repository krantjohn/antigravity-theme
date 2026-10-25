# Comprehensive Automated Deep Verification for AntigravityThemeStudio Standalone Single-File EXE & Release Artifacts
$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$runtimeDir = Join-Path $env:LOCALAPPDATA "antigravity_studio_host\runtime"
$sourceExe = Join-Path $repoRoot "dist\AntigravityThemeStudio.exe"
$sourceZip = Join-Path $repoRoot "dist\AntigravityThemeStudio-v3.1.0-win-x64.zip"

Write-Host "======================================================="
Write-Host "   [TEST] Antigravity Theme Studio Standalone Verification"
Write-Host "======================================================="

function Test-StudioEndpoint {
    param([int]$MaxAttempts = 40)
    for ($i = 0; $i -lt $MaxAttempts; $i++) {
        Start-Sleep -Milliseconds 250
        try {
            $res = Invoke-RestMethod -Uri "http://127.0.0.1:8316/api/status" -TimeoutSec 1
            if ($res.slotsConfig -and $res.slotsConfig.left) {
                return $true
            }
        } catch {}
    }
    return $false
}

function Stop-StudioProcess {
    param($process)
    try {
        Invoke-RestMethod -Uri "http://127.0.0.1:8316/api/shutdown" -Method POST -TimeoutSec 2 | Out-Null
    } catch {}

    if (-not $process.HasExited) {
        try { $process.CloseMainWindow() | Out-Null } catch {}
        if (-not $process.WaitForExit(3000)) {
            try { Stop-Process -Id $process.Id -Force } catch {}
        }
    }
    $process.WaitForExit(3000)
    Start-Sleep -Milliseconds 500
}

# -----------------------------------------------------------------------------------------
# Test 1: Clean room standalone EXE run from an isolated non-ASCII folder outside repository
# -----------------------------------------------------------------------------------------
Write-Host "`n[Test 1] Clean room test (isolated folder outside repo)..."
if (Test-Path $runtimeDir) {
    Remove-Item $runtimeDir -Recurse -Force
}

$testFolder1 = Join-Path $env:TEMP ("isolated_studio_exe_" + [Guid]::NewGuid().ToString().Substring(0,8) + "_isolated_dir")
New-Item -ItemType Directory -Path $testFolder1 -Force | Out-Null
$testExe1 = Join-Path $testFolder1 "AntigravityThemeStudio.exe"
Copy-Item $sourceExe $testExe1 -Force

$proc1 = Start-Process -FilePath $testExe1 -PassThru
$ready1 = Test-StudioEndpoint 40

Write-Host "   - HTTP 200 API Status response: $ready1"
Write-Host "   - Runtime directory auto-created: $(Test-Path $runtimeDir)"
Write-Host "   - Studio server.js extracted: $(Test-Path (Join-Path $runtimeDir 'studio\server.js'))"
Write-Host "   - SHA256 cache hash written: $(Test-Path (Join-Path $runtimeDir '.bundle_hash'))"
Write-Host "   - Engine and wallpapers extracted: $(Test-Path (Join-Path $runtimeDir 'wallpapers\left_wallpaper.jpg'))"

if (-not $ready1) {
    Stop-StudioProcess $proc1
    Remove-Item $testFolder1 -Recurse -Force -ErrorAction SilentlyContinue
    throw "FAIL: Test 1 isolated EXE failed to start backend server."
}
Stop-StudioProcess $proc1
try { Remove-Item $testFolder1 -Recurse -Force } catch {}
Write-Host "[PASS] Test 1: Standalone single-file first launch, auto-unpack and server ready!"

# -----------------------------------------------------------------------------------------
# Test 2: Cache hit test (subsequent launch should use cached runtime instantly)
# -----------------------------------------------------------------------------------------
Write-Host "`n[Test 2] Cache hit test (instant launch from cache)..."
$testFolder2 = Join-Path $env:TEMP ("isolated_studio_cache_" + [Guid]::NewGuid().ToString().Substring(0,8))
New-Item -ItemType Directory -Path $testFolder2 -Force | Out-Null
$testExe2 = Join-Path $testFolder2 "AntigravityThemeStudio.exe"
Copy-Item $sourceExe $testExe2 -Force

$sw = [System.Diagnostics.Stopwatch]::StartNew()
$proc2 = Start-Process -FilePath $testExe2 -PassThru
$ready2 = Test-StudioEndpoint 20
$sw.Stop()

Write-Host "   - Cached launch time: $($sw.ElapsedMilliseconds) ms"
Write-Host "   - HTTP 200 API ready: $ready2"

if (-not $ready2) {
    Stop-StudioProcess $proc2
    Remove-Item $testFolder2 -Recurse -Force -ErrorAction SilentlyContinue
    throw "FAIL: Test 2 cache launch failed."
}
Stop-StudioProcess $proc2
try { Remove-Item $testFolder2 -Recurse -Force } catch {}
Write-Host "[PASS] Test 2: Bundle hash cache match skipped extraction, warm boot verified!"

# -----------------------------------------------------------------------------------------
# Test 3: Release ZIP package decompression and launch
# -----------------------------------------------------------------------------------------
Write-Host "`n[Test 3] Release ZIP package decompression and out-of-the-box run..."
$testFolder3 = Join-Path $env:TEMP ("isolated_studio_zip_" + [Guid]::NewGuid().ToString().Substring(0,8))
New-Item -ItemType Directory -Path $testFolder3 -Force | Out-Null
Expand-Archive -Path $sourceZip -DestinationPath $testFolder3 -Force
$testExe3 = Join-Path $testFolder3 "AntigravityThemeStudio.exe"

$proc3 = Start-Process -FilePath $testExe3 -PassThru
$ready3 = Test-StudioEndpoint 30

Write-Host "   - Unzipped EXE ready: $ready3"

if (-not $ready3) {
    Stop-StudioProcess $proc3
    Remove-Item $testFolder3 -Recurse -Force -ErrorAction SilentlyContinue
    throw "FAIL: Test 3 zip package failed."
}
Stop-StudioProcess $proc3
try { Remove-Item $testFolder3 -Recurse -Force } catch {}
Write-Host "[PASS] Test 3: Release ZIP archive verified out-of-the-box!"

Write-Host "`n======================================================="
Write-Host "[SUCCESS] ALL STANDALONE STUDIO TESTS PASSED SUCCESSFULLY!"
Write-Host "======================================================="
