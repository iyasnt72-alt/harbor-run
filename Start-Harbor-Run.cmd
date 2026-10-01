@echo off
setlocal
cd /d "%~dp0"
set "HARBOR_NODE=node"
where node >nul 2>nul
if errorlevel 1 set "HARBOR_NODE=%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
if not exist "node_modules\ws\package.json" (
 echo First install Node.js 22 or newer, then run npm install in this folder.
 pause
 exit /b 1
)
echo Open http://localhost:3000 in your browser. Keep this window open.
"%HARBOR_NODE%" server.mjs
pause
