@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo.
echo ======================================
echo  YOU-e static dev server
echo ======================================
echo.
echo Step 1: checking files...
if not exist "out\index.html" (
  echo out\index.html not found. Building static output now...
  call npm.cmd run build
  if errorlevel 1 (
    echo.
    echo Build failed. Please send me the error shown above.
    pause
    exit /b 1
  )
)
echo.
echo Step 2: starting server at http://localhost:3030
echo Keep this black window open.
echo.
netstat -ano | findstr ":3030" >nul
if not errorlevel 1 (
  echo ERROR: 3030 is already occupied.
  echo Please close old node/npm/Next windows first, then run this script again.
  echo.
  pause
  exit /b 1
)
node server-out-3030.js
echo.
pause
