@echo off
REM RevManger Real-Time Setup Script (Windows Batch)
REM This script sets up the complete real-time restaurant management system

echo 🚀 RevManger Real-Time Setup Starting...
echo =============================================

REM Check for Node.js
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js is not installed!
    echo 📋 Please install Node.js first:
    echo    - Visit: https://nodejs.org/
    echo    - Or use Chocolatey: choco install nodejs
    echo    - Or use winget: winget install OpenJS.NodeJS
    pause
    exit /b 1
)

echo ✅ Node.js found
node --version

echo ✅ npm found
npm --version

REM Install frontend dependencies
echo.
echo 📦 Installing frontend dependencies...
call npm install
if %errorlevel% neq 0 (
    echo ❌ Failed to install frontend dependencies
    pause
    exit /b 1
)

REM Install backend dependencies  
echo.
echo 📦 Installing backend dependencies...
cd server
call npm install
if %errorlevel% neq 0 (
    echo ❌ Failed to install backend dependencies
    pause
    exit /b 1
)
cd ..

REM Check for PostgreSQL
echo.
echo 🐘 Checking PostgreSQL...
psql --version >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ PostgreSQL found
    psql --version
) else (
    echo ❌ PostgreSQL not found!
    echo 📋 Please install PostgreSQL:
    echo    - Download from: https://www.postgresql.org/
    echo    - Or use Chocolatey: choco install postgresql
    echo    - Or use winget: winget install PostgreSQL.PostgreSQL
)

REM Create environment files if they don't exist
echo.
echo ⚙️  Setting up environment files...

if not exist "server\.env" (
    echo 📝 Creating server\.env...
    (
        echo # Database Configuration
        echo DB_HOST=localhost
        echo DB_PORT=5432
        echo DB_NAME=revmanger
        echo DB_USER=your_username
        echo DB_PASSWORD=your_password
        echo.
        echo # Server Configuration
        echo PORT=3001
        echo NODE_ENV=development
        echo.
        echo # JWT Secret ^(change this in production!^)
        echo JWT_SECRET=your-super-secret-jwt-key-change-this
        echo.
        echo # CORS Origin
        echo CORS_ORIGIN=http://localhost:5173
    ) > server\.env
    echo ✅ Created server\.env ^(please update database credentials^)
) else (
    echo ✅ server\.env already exists
)

echo.
echo 🎉 Setup Complete!
echo ==================
echo.
echo 📋 Next Steps:
echo 1. Set up PostgreSQL database:
echo    psql -U postgres -c "CREATE DATABASE revmanger;"
echo    psql -U postgres -d revmanger -f setup_database.sql
echo.
echo 2. Update server\.env with your database credentials
echo.
echo 3. Start the development servers:
echo    start_dev.bat
echo.
echo 4. Test real-time functionality:
echo    test_realtime.bat
echo.
echo 🔗 URLs after startup:
echo    Frontend:       http://localhost:5173
echo    Backend:        http://localhost:3001
echo    Live Dashboard: http://localhost:5173/dashboard/live
echo.
echo Happy coding! 🚀

pause
