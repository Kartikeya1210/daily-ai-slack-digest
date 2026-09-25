@echo off
cd /d "%~dp0"
node src\daily-ai-picks.js
exit /b %errorlevel%
