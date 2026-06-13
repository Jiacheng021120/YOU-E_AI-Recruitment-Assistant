@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo.
echo ======================================
echo  YOU鹅 Next.js dev server
echo ======================================
echo.
echo 地址: http://localhost:3030
echo.
echo 这个窗口不要关闭，关闭后网页会停止。
echo.
where npm.cmd >nul 2>nul
if errorlevel 1 (
  echo ERROR: 没找到 npm.cmd。请确认 Node.js 已安装。
  echo.
  pause
  exit /b 1
)
npm.cmd run dev -- --hostname localhost --port 3030
echo.
pause
