# Packages release artifacts into dist/ directory and updates SHA256 in release_notes.md
param(
    [string]$BaseDir = (Split-Path -Parent (Split-Path -Parent $PSScriptRoot))
)

$ErrorActionPreference = "Stop"

Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem

$distDir = Join-Path $BaseDir "dist"
if (-not (Test-Path $distDir)) {
    New-Item -ItemType Directory -Path $distDir -Force | Out-Null
}

$sourceExe = Join-Path $BaseDir "AntigravityThemeStudio.exe"
if (-not (Test-Path $sourceExe)) {
    Write-Error "Cannot find source executable: $sourceExe"
    exit 1
}

$targetExe = Join-Path $distDir "AntigravityThemeStudio.exe"
Copy-Item -Path $sourceExe -Destination $targetExe -Force
Write-Host "[INFO] Copied AntigravityThemeStudio.exe to dist directory."

$zipPath = Join-Path $distDir "AntigravityThemeStudio-v3.1.0-win-x64.zip"
if (Test-Path $zipPath) {
    Remove-Item $zipPath -Force
}

Write-Host "[INFO] Compressing release package to $zipPath..."
$zip = [System.IO.Compression.ZipFile]::Open($zipPath, [System.IO.Compression.ZipArchiveMode]::Create)
try {
    [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zip, $targetExe, "AntigravityThemeStudio.exe", [System.IO.Compression.CompressionLevel]::Optimal) | Out-Null
}
finally {
    $zip.Dispose()
}

# Calculate SHA256 hashes
$exeHash = (Get-FileHash -Path $targetExe -Algorithm SHA256).Hash.ToUpperInvariant()
$zipHash = (Get-FileHash -Path $zipPath -Algorithm SHA256).Hash.ToUpperInvariant()

Write-Host "[INFO] AntigravityThemeStudio.exe SHA256: $exeHash"
Write-Host "[INFO] AntigravityThemeStudio-v3.1.0-win-x64.zip SHA256: $zipHash"

# Update release_notes.md
$releaseNotesPath = Join-Path $distDir "release_notes.md"
if (Test-Path $releaseNotesPath) {
    $content = Get-Content -Path $releaseNotesPath -Raw -Encoding UTF8
    $content = [System.Text.RegularExpressions.Regex]::Replace($content, "[0-9A-Fa-f]{64}\s+AntigravityThemeStudio\.exe", "$exeHash  AntigravityThemeStudio.exe")
    $content = [System.Text.RegularExpressions.Regex]::Replace($content, "[0-9A-Fa-f]{64}\s+AntigravityThemeStudio-v3\.1\.0-win-x64\.zip", "$zipHash  AntigravityThemeStudio-v3.1.0-win-x64.zip")
    Set-Content -Path $releaseNotesPath -Value $content -Encoding UTF8
    Write-Host "[SUCCESS] Updated checksums in dist\release_notes.md"
}
