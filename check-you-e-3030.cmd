@echo off
chcp 65001 >nul
echo.
echo ======================================
echo  YOU-e localhost:3030 checker
echo ======================================
echo.
echo 正在检查 http://localhost:3030/health
powershell -NoProfile -ExecutionPolicy Bypass -Command "try { $r=Invoke-WebRequest -Uri 'http://localhost:3030/health' -UseBasicParsing -TimeoutSec 3; Write-Host ('localhost health: ' + $r.Content) } catch { Write-Host ('localhost failed: ' + $_.Exception.Message) }"
echo.
echo 正在检查 http://127.0.0.1:3030/health
powershell -NoProfile -ExecutionPolicy Bypass -Command "try { $r=Invoke-WebRequest -Uri 'http://127.0.0.1:3030/health' -UseBasicParsing -TimeoutSec 3; Write-Host ('127.0.0.1 health: ' + $r.Content) } catch { Write-Host ('127.0.0.1 failed: ' + $_.Exception.Message) }"
echo.
echo 如果这里显示 failed，说明 server 没有运行。请先双击 start-you-e-3030.cmd，并保持那个黑色窗口打开。
echo.
pause
