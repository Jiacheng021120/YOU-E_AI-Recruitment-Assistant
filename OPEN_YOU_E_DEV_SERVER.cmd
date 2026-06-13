@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo.
echo ======================================
echo  OPEN YOU-e DEV SERVER
echo ======================================
echo.
echo 当前目录:
echo %cd%
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo ERROR: 未找到 Node.js，无法启动 dev server。
  echo.
  pause
  exit /b 1
)

if not exist "out\index.html" (
  echo 未找到 out\index.html，正在生成静态产物...
  call npm.cmd run build
  if errorlevel 1 (
    echo.
    echo ERROR: 构建失败，请把上面的错误发给我。
    echo.
    pause
    exit /b 1
  )
)

echo.
echo 正在启动服务，会自动寻找可用端口并打开浏览器...
echo 如果 3030 被占用，会自动尝试 3031、3032...
echo.
node you-e-dev-server.js
echo.
pause
