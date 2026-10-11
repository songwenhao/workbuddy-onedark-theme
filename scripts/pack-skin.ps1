# 生成官方皮肤包（WorkBuddy 个性主题 zip 格式）
# 用法: pwsh -File scripts/pack-skin.ps1  或 npm run package:skin
# 产物: skin-package/workbuddy-onedark-pro-skin.zip（manifest.json + onedark-pro.css）
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$pkgDir = Join-Path $root 'skin-package'

Copy-Item -LiteralPath (Join-Path $root 'skin\onedark-pro.css') -Destination (Join-Path $pkgDir 'onedark-pro.css') -Force
$zip = Join-Path $pkgDir 'workbuddy-onedark-pro-skin.zip'
if (Test-Path -LiteralPath $zip) { Remove-Item -LiteralPath $zip -Force }
Compress-Archive -LiteralPath (Join-Path $pkgDir 'manifest.json'), (Join-Path $pkgDir 'onedark-pro.css') -DestinationPath $zip
Write-Host "wrote $zip"
