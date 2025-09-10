@echo off
REM Test the real-time functionality
REM Windows Batch script

echo 🧪 Testing Real-Time Menu Synchronization...
echo ============================================

set BASE_URL=http://localhost:3001

echo 1. Testing menu endpoint...
curl -s "%BASE_URL%/api/menu" >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ Menu endpoint accessible
    curl -s "%BASE_URL%/api/menu" | findstr /C:"name"
) else (
    echo ❌ Backend not running or menu endpoint not accessible
)

echo.
echo 2. Testing inventory endpoint...
curl -s "%BASE_URL%/api/inventory" >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ Inventory endpoint accessible
    curl -s "%BASE_URL%/api/inventory" | findstr /C:"name"
) else (
    echo ❌ Backend not running or inventory endpoint not accessible
)

echo.
echo 🔄 To test real-time features:
echo 1. Run: start_dev.bat
echo 2. Open multiple browser windows to http://localhost:5173
echo 3. Make inventory changes and watch live updates
echo 4. Check the dashboard at http://localhost:5173/dashboard/live

pause
