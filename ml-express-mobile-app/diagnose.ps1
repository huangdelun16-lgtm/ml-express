# ML Express 移动应用诊断脚本

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  ML Express 移动应用诊断" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 检查当前目录
Write-Host "1. 检查当前目录..." -ForegroundColor Yellow
$currentDir = Get-Location
Write-Host "   当前目录: $currentDir" -ForegroundColor Green
Write-Host ""

# 检查 package.json 是否存在
Write-Host "2. 检查 package.json..." -ForegroundColor Yellow
if (Test-Path "package.json") {
    Write-Host "   ✓ package.json 存在" -ForegroundColor Green
} else {
    Write-Host "   ✗ package.json 不存在！" -ForegroundColor Red
    exit 1
}
Write-Host ""

# 检查 node_modules
Write-Host "3. 检查 node_modules..." -ForegroundColor Yellow
if (Test-Path "node_modules") {
    Write-Host "   ✓ node_modules 存在" -ForegroundColor Green
} else {
    Write-Host "   ✗ node_modules 不存在，正在安装依赖..." -ForegroundColor Yellow
    npm install
}
Write-Host ""

# 检查 expo 是否安装
Write-Host "4. 检查 Expo CLI..." -ForegroundColor Yellow
$expoVersion = npm list expo 2>$null | Select-String "expo@"
if ($expoVersion) {
    Write-Host "   ✓ Expo 已安装: $expoVersion" -ForegroundColor Green
} else {
    Write-Host "   ✗ Expo 未安装！" -ForegroundColor Red
}
Write-Host ""

# 检查端口占用
Write-Host "5. 检查端口 19000, 19001, 19002..." -ForegroundColor Yellow
$ports = @(19000, 19001, 19002)
foreach ($port in $ports) {
    $connection = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
    if ($connection) {
        Write-Host "   ⚠ 端口 $port 被占用 (PID: $($connection.OwningProcess))" -ForegroundColor Yellow
    } else {
        Write-Host "   ✓ 端口 $port 可用" -ForegroundColor Green
    }
}
Write-Host ""

# 检查 Node.js 进程
Write-Host "6. 检查运行中的 Node.js 进程..." -ForegroundColor Yellow
$nodeProcesses = Get-Process node -ErrorAction SilentlyContinue
if ($nodeProcesses) {
    Write-Host "   找到 $($nodeProcesses.Count) 个 Node.js 进程:" -ForegroundColor Yellow
    foreach ($proc in $nodeProcesses) {
        Write-Host "   - PID: $($proc.Id), CPU: $($proc.CPU)s" -ForegroundColor Gray
    }
} else {
    Write-Host "   ✓ 没有运行中的 Node.js 进程" -ForegroundColor Green
}
Write-Host ""

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  诊断完成！" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "按回车键启动应用..." -ForegroundColor Yellow
Read-Host

Write-Host "正在启动 Expo..." -ForegroundColor Cyan
npx expo start


