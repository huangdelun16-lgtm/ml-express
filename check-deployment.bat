@echo off
echo 🚀 检查Netlify部署状态
echo ================================
echo.

echo 📅 当前时间: %date% %time%
echo.

echo 🔗 检查网站连接...
echo.

powershell -Command "try { $response = Invoke-WebRequest -Uri 'https://ml-express.netlify.app' -UseBasicParsing -TimeoutSec 10; if ($response.StatusCode -eq 200) { Write-Host '✅ 网站连接正常' -ForegroundColor Green } else { Write-Host '❌ 网站连接异常' -ForegroundColor Red } } catch { Write-Host '❌ 无法连接到网站' -ForegroundColor Red }"
echo.

echo 🔗 检查管理后台连接...
echo.

powershell -Command "try { $response = Invoke-WebRequest -Uri 'https://ml-express.netlify.app/admin' -UseBasicParsing -TimeoutSec 10; if ($response.StatusCode -eq 200) { Write-Host '✅ 管理后台连接正常' -ForegroundColor Green } else { Write-Host '❌ 管理后台连接异常' -ForegroundColor Red } } catch { Write-Host '❌ 无法连接到管理后台' -ForegroundColor Red }"
echo.

echo 📋 部署状态摘要:
echo =================
echo ✅ 代码已推送到GitHub
echo ⏳ Netlify自动部署已触发
echo 🔄 部署构建中（通常需要3-5分钟）
echo.
echo 📖 详细部署信息请查看: NETLIFY-DEPLOYMENT-STATUS.md
echo.
echo 🔍 实时状态请访问: https://app.netlify.com/sites/ml-express/deploys
echo.
pause