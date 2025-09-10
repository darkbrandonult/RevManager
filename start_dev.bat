@echo off
REM Start development servers for RevManger
REM Windows Batch script

echo 🚀 Starting RevManger Development Servers...

REM Check if PostgreSQL is running (simple check)
echo 🔍 Checking if PostgreSQL is accessible...
pg_isready -h localhost -p 5432 >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ PostgreSQL is not running or not accessible!
    echo 💡 Try starting PostgreSQL:
    echo    - Check Windows Services ^(services.msc^)
    echo    - Look for PostgreSQL service and start it
    echo    - Or run: net start postgresql-x64-XX ^(replace XX with version^)
    pause
    exit /b 1
)

echo ✅ PostgreSQL is accessible

REM Start backend server in new window
echo 🔧 Starting backend server ^(port 3001^)...
start "RevManger Backend" cmd /k "cd server && npm run dev"

REM Wait a moment for backend to start
timeout /t 3 /nobreak >nul

REM Start frontend server in current window
echo 🎨 Starting frontend server ^(port 5173^)...
echo.
echo ✅ Both servers starting!
echo 📱 Frontend: http://localhost:5173
echo 🔧 Backend:  http://localhost:3001  
echo 📊 API Docs: http://localhost:3001/api
echo.
echo Press Ctrl+C to stop the frontend server
echo ^(Backend runs in separate window^)

npm run dev
