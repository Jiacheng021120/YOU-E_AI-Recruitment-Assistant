@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo.
echo 正在启动「YOU鹅」Next.js 项目...
echo.
echo 如果浏览器没有自动打开，请手动访问:
echo http://localhost:3030
echo.
npm.cmd run dev -- --hostname localhost --port 3030
pause
