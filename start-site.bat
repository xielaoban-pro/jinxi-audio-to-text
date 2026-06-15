@echo off
setlocal
cd /d "%~dp0"
title 今夕在线音频转文本工具

set "PORT=8003"

where node >nul 2>nul
if not %errorlevel%==0 (
  echo Node.js was not found in PATH.
  echo Install Node.js first, then run this bat again.
  pause
  goto end
)

start "" http://localhost:%PORT%/
echo Starting local server with Node.js on port %PORT%...
node server.js %PORT%

:end
endlocal
