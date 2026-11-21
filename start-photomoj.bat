@echo off
setlocal
title PhotoMoj
cd /d "%~dp0"

set PORT=3000

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js was not found. Install the LTS version from https://nodejs.org and run this again.
  pause
  exit /b 1
)

echo Checking packages. This is quick unless something new was added.
call npm install
if errorlevel 1 goto fail

echo Building PhotoMoj...
call npm run build
if errorlevel 1 goto fail

echo.
echo PhotoMoj is starting at http://localhost:%PORT%
echo Keep this window open. Close it to stop PhotoMoj.
echo.

rem Open the browser after a short wait so the server is ready.
start "" /b cmd /c "timeout /t 2 /nobreak >nul && start http://localhost:%PORT%"

node server\index.js
if errorlevel 1 goto fail
goto end

:fail
echo.
echo Something went wrong. Read the messages above.
echo If the address is already in use, close any other PhotoMoj window and try again.
pause
exit /b 1

:end
endlocal
