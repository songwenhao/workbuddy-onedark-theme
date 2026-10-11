# One Dark Pro for WorkBuddy AI — 一键启动器
# 用法: 右键"使用 PowerShell 运行"，或 pwsh -File Start-OneDarkPro.ps1 [-Variant onedark-pro] [-Port 9223] [-Watch]
#
# 行为:
#   1. 若 WorkBuddyAI 已在运行且未开调试端口，提示先用官方退出方式关闭后重试；
#   2. 以 WORKBUDDY_REMOTE_DEBUGGING_PORT=<port>（应用官方支持的开关）启动 WorkBuddyAI；
#   3. 等待 CDP 端口就绪，注入 One Dark Pro 皮肤（零文件修改，退出应用即还原）。
param(
	[string]$Variant = 'onedark-pro',
	[int]$Port = 9223,
	[switch]$Watch
)
$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot  # 脚本就在项目根目录；$PSScriptRoot 即项目根，不能再取父目录
if (-not (Test-Path -LiteralPath (Join-Path $root 'scripts\inject.mjs'))) {
	Write-Error "未找到 scripts\inject.mjs，请从项目根目录运行本脚本（当前脚本位置: $root）"
	exit 1
}
$exe = 'C:\Program Files\WorkBuddyAI\WorkBuddyAI.exe'

if (-not (Test-Path -LiteralPath $exe)) { Write-Error "未找到 WorkBuddyAI: $exe"; exit 1 }

$running = Get-Process -Name 'WorkBuddyAI' -ErrorAction SilentlyContinue
if ($running) {
	try {
		Invoke-WebRequest -Uri "http://127.0.0.1:$Port/json/version" -UseBasicParsing -TimeoutSec 2 | Out-Null
		Write-Host 'WorkBuddyAI 已在运行且调试端口可用，直接注入主题。'
	} catch {
		Write-Host 'WorkBuddyAI 正在运行，但未开启调试端口（普通方式启动的实例不注入）。'
		Write-Host '请从托盘彻底退出 WorkBuddyAI 后重新运行本脚本，或先执行: node scripts/inject.mjs status'
		exit 1
	}
	node (Join-Path $root 'scripts\inject.mjs') apply --variant $Variant --port $Port
} else {
	$args_ = @('launch', '--variant', $Variant, '--port', $Port)
	if ($Watch) { $args_ += '--watch' }
	node (Join-Path $root 'scripts\inject.mjs') @args_
}
