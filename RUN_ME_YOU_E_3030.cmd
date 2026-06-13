@echo off
chcp 65001 >nul
cd /d "%~dp0"
set PORT=3030
set LOG=%~dp0you-e-server.log

echo ====================================== > "%LOG%"
echo YOU-e server launcher >> "%LOG%"
echo Time: %date% %time% >> "%LOG%"
echo Folder: %cd% >> "%LOG%"
echo ====================================== >> "%LOG%"

echo.
echo ======================================
echo  YOU鹅 3030 启动器
echo ======================================
echo.
echo 当前目录:
echo %cd%
echo.
echo 日志文件:
echo %LOG%
echo.

echo [1/5] 检查 Node.js...
where node >> "%LOG%" 2>&1
where node
if errorlevel 1 (
  echo.
  echo ERROR: 没找到 node。dev server 无法启动。
  echo ERROR: node not found >> "%LOG%"
  echo.
  echo 你可以改用 out\index.html 或安装 Node.js。
  pause
  exit /b 1
)
node -v
node -v >> "%LOG%" 2>&1
echo.

echo [2/5] 检查必要文件...
if not exist "server-out-3030.js" (
  echo ERROR: 找不到 server-out-3030.js
  echo ERROR: server-out-3030.js missing >> "%LOG%"
  pause
  exit /b 1
)
if not exist "out\index.html" (
  echo out\index.html 不存在，开始构建...
  echo out\index.html missing, building... >> "%LOG%"
  call npm.cmd run build >> "%LOG%" 2>&1
  if errorlevel 1 (
    echo.
    echo ERROR: 构建失败。请把 you-e-server.log 发给我。
    pause
    exit /b 1
  )
)
echo OK: 文件齐全
echo.

echo [3/5] 检查 3030 端口...
netstat -ano | findstr ":3030" >> "%LOG%" 2>&1
netstat -ano | findstr ":3030"
if errorlevel 1 (
  echo OK: 当前未发现 3030 占用
) else (
  echo.
  echo ERROR: 3030 已被占用。
  echo 请先关闭之前打开的 Next/npm/node 黑色窗口，或者在任务管理器里结束 node.exe。
  echo 然后重新双击本脚本。
  echo.
  echo 如果你不确定哪个占用，请把上面的 netstat 输出截图给我。
  echo ERROR: port 3030 is occupied >> "%LOG%"
  pause
  exit /b 1
)
echo.

echo [4/5] 即将启动服务...
echo.
echo 成功后请打开:
echo http://localhost:3030
echo.
echo 或者:
echo http://127.0.0.1:3030
echo.
echo 重要：这个黑色窗口不要关闭。关闭后网页一定打不开。
echo.
echo [server starting] >> "%LOG%"

echo [5/5] 服务输出如下:
echo --------------------------------------
node server-out-3030.js

echo --------------------------------------
echo 服务已停止。上面如果有报错，请截图或发送 you-e-server.log。
echo [server stopped] >> "%LOG%"
pause
