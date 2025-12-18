@echo off
echo Starting ZetaFrog frontend...
echo.
echo Make sure you have:
echo 1. MetaMask or another wallet installed
echo 2. Environment variables configured in .env file
echo.

cd /d "%~dp0frontend"

echo Installing dependencies...
call npm install

echo.
echo Starting development server...
echo The app will be available at: http://localhost:5173
echo.
call npm run dev

pause