@echo off
echo Starting AGV platform demo...
echo.
cd /d "C:\Users\ASUS\Documents\AI coding\AGV service platform-APP"
start http://localhost:5000
npx next dev -p 5000
pause