@echo off
chcp 65001 >nul
setlocal
set "APP_DIR=%~dp0"
set "URL=http://localhost:3030"
cd /d "%APP_DIR%"

echo.
echo 正在启动 YOU鹅 Next.js dev server...
echo.

start "YOU鹅 dev server - 不要关闭" cmd /k call "%APP_DIR%启动-YOU鹅-dev-server.cmd"

echo 等待服务启动: %URL%
for /l %%i in (1,1,45) do (
  powershell -NoProfile -ExecutionPolicy Bypass -Command "try { $r = Invoke-WebRequest -Uri '%URL%' -UseBasicParsing -TimeoutSec 1; if ($r.StatusCode -eq 200) { exit 0 } else { exit 1 } } catch { exit 1 }" >nul 2>nul
  if not errorlevel 1 (
    start "" "%URL%"
    echo 已打开 %URL%
    pause
    exit /b 0
  )
  timeout /t 1 /nobreak >nul
)

echo 45 秒内没有等到服务响应。请查看另一个黑色窗口里的 Next.js 输出。
pause
exit /b 1
