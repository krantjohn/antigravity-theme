[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

$baseDir = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$libDir = Join-Path $baseDir "studio\lib"
$zipPath = Join-Path $libDir "wv2.zip"
$extractDir = Join-Path $libDir "extract"
$nugetUrl = "https://www.nuget.org/api/v2/package/Microsoft.Web.WebView2/1.0.2903.40"

if (-not (Test-Path $libDir)) {
    New-Item -ItemType Directory -Path $libDir -Force | Out-Null
}

$coreDll = Join-Path $libDir "Microsoft.Web.WebView2.Core.dll"
$wfDll = Join-Path $libDir "Microsoft.Web.WebView2.WinForms.dll"
$loaderDll = Join-Path $libDir "WebView2Loader.dll"

if ((Test-Path $coreDll) -and (Test-Path $wfDll) -and (Test-Path $loaderDll)) {
    Write-Host "[INFO] WebView2 assemblies already present in studio\lib."
    exit 0
}

Write-Host "[INFO] Downloading Microsoft.Web.WebView2 from nuget.org..."
Invoke-WebRequest -Uri $nugetUrl -OutFile $zipPath -UseBasicParsing

Write-Host "[INFO] Extracting required assemblies..."
Expand-Archive -Path $zipPath -DestinationPath $extractDir -Force

Copy-Item -Path (Join-Path $extractDir "lib\net462\Microsoft.Web.WebView2.Core.dll") -Destination $coreDll -Force
Copy-Item -Path (Join-Path $extractDir "lib\net462\Microsoft.Web.WebView2.WinForms.dll") -Destination $wfDll -Force
Copy-Item -Path (Join-Path $extractDir "runtimes\win-x64\native\WebView2Loader.dll") -Destination $loaderDll -Force

Remove-Item -Path $zipPath -Force -ErrorAction SilentlyContinue
Remove-Item -Path $extractDir -Recurse -Force -ErrorAction SilentlyContinue

Write-Host "[SUCCESS] WebView2 assemblies installed to studio\lib successfully!"
