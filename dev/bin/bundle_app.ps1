# Bundles core, studio assets, and wallpapers into studio\lib\app_bundle.zip
param(
    [string]$BaseDir = (Split-Path -Parent (Split-Path -Parent $PSScriptRoot))
)

$ErrorActionPreference = "Stop"

Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem

$BaseDir = (Resolve-Path $BaseDir).Path

$libDir = Join-Path $BaseDir "studio\lib"
if (-not (Test-Path $libDir)) {
    New-Item -ItemType Directory -Path $libDir -Force | Out-Null
}

$zipPath = Join-Path $libDir "app_bundle.zip"
if (Test-Path $zipPath) {
    Remove-Item $zipPath -Force
}

Write-Host "[INFO] Creating application bundle archive at $zipPath..."

$zip = [System.IO.Compression.ZipFile]::Open($zipPath, [System.IO.Compression.ZipArchiveMode]::Create)
try {
    function Add-FolderToZip($folderPath, $zipPrefix) {
        if (Test-Path $folderPath) {
            $resolved = (Resolve-Path $folderPath).Path
            Get-ChildItem -Path $resolved -Recurse -File | ForEach-Object {
                $rel = $_.FullName.Substring($resolved.Length).TrimStart('\', '/').Replace('\', '/')
                $entryName = $zipPrefix + "/" + $rel
                [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zip, $_.FullName, $entryName, [System.IO.Compression.CompressionLevel]::Optimal) | Out-Null
            }
        }
    }

    # 1. core/
    Add-FolderToZip (Join-Path $BaseDir "core") "core"

    # 2. studio/server.js
    $serverJs = Join-Path $BaseDir "studio\server.js"
    if (Test-Path $serverJs) {
        [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zip, $serverJs, "studio/server.js", [System.IO.Compression.CompressionLevel]::Optimal) | Out-Null
    }

    # 3. studio/app.ico
    $appIco = Join-Path $BaseDir "studio\app.ico"
    if (Test-Path $appIco) {
        [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zip, $appIco, "studio/app.ico", [System.IO.Compression.CompressionLevel]::Optimal) | Out-Null
    }

    # 4. studio/public/
    Add-FolderToZip (Join-Path $BaseDir "studio\public") "studio/public"

    # 5. wallpapers/
    Add-FolderToZip (Join-Path $BaseDir "wallpapers") "wallpapers"
}
finally {
    $zip.Dispose()
}

$fileSize = (Get-Item $zipPath).Length
Write-Host "[SUCCESS] app_bundle.zip created successfully ($([math]::Round($fileSize / 1MB, 2)) MB, $fileSize bytes)"
