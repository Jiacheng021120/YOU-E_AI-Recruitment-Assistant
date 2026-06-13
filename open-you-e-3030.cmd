@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo.
echo Starting YOU-e server in a new window...
start "YOU-e server - keep open" cmd /k call "%~dp0start-you-e-3030.cmd"
echo.
echo Waiting for http://localhost:3030 ...
for /l %%i in (1,1,30) do (
  powershell -NoProfile -ExecutionPolicy Bypass -Command "try { $r=Invoke-WebRequest -Uri 'http://localhost:3030/health' -UseBasicParsing -TimeoutSec 1; if ($r.Content -eq 'ok') { exit 0 } else { exit 1 } } catch { exit 1 }" >nul 2>nul
  if not errorlevel 1 (
    start "" "http://localhost:3030"
    echo Opened http://localhost:3030
    pause
    exit /b 0
  )
  timeout /t 1 /nobreak >nul
)
echo.
echo Server did not respond in 30 seconds.
echo Look at the other black window and send me what it says.
pause
exit /b 1
