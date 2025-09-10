# Windows Setup Guide for RevManager

This guide provides Windows-specific instructions for setting up and running the RevManager restaurant management system.

## Prerequisites for Windows

### Required Software

1. **Node.js 18 or higher**
   - Download from: https://nodejs.org/
   - Or install with Chocolatey: `choco install nodejs`
   - Or install with winget: `winget install OpenJS.NodeJS`
   - Or install with Scoop: `scoop install nodejs`

2. **PostgreSQL 14 or higher**
   - Download from: https://www.postgresql.org/download/windows/
   - Or install with Chocolatey: `choco install postgresql`
   - Or install with winget: `winget install PostgreSQL.PostgreSQL`

3. **Git for Windows**
   - Download from: https://git-scm.com/download/win
   - Or install with Chocolatey: `choco install git`
   - Or install with winget: `winget install Git.Git`

### Optional Tools

- **Docker Desktop**: For containerized development
  - Download from: https://www.docker.com/products/docker-desktop/
  - Or install with Chocolatey: `choco install docker-desktop`

- **Windows Terminal**: Better terminal experience
  - Install from Microsoft Store or winget: `winget install Microsoft.WindowsTerminal`

## Quick Setup (Windows)

### Option 1: PowerShell Setup (Recommended)

1. **Clone the repository**
   ```powershell
   git clone <repository-url> RevManager
   cd RevManager
   ```

2. **Run the setup script**
   ```powershell
   # Allow script execution (one-time setup)
   Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
   
   # Run setup
   .\setup.ps1
   ```

3. **Configure PostgreSQL**
   ```powershell
   # Start PostgreSQL service
   net start postgresql-x64-14  # Adjust version number as needed
   
   # Create database
   psql -U postgres -c "CREATE DATABASE revmanger;"
   psql -U postgres -d revmanger -f setup_database.sql
   ```

4. **Update environment variables**
   - Edit `server\.env` with your PostgreSQL credentials
   - Update `DB_USER` and `DB_PASSWORD` values

5. **Start development servers**
   ```powershell
   .\start_dev.ps1
   ```

### Option 2: Command Prompt Setup

1. **Clone and setup**
   ```cmd
   git clone <repository-url> RevManager
   cd RevManager
   setup.bat
   ```

2. **Start servers**
   ```cmd
   start_dev.bat
   ```

### Option 3: Manual Setup

1. **Install dependencies**
   ```powershell
   npm install
   cd server
   npm install
   cd ..
   ```

2. **Setup database**
   ```sql
   -- Connect to PostgreSQL as postgres user
   psql -U postgres
   
   -- Create database
   CREATE DATABASE revmanger;
   \c revmanger;
   
   -- Run the setup SQL script
   \i setup_database.sql
   ```

3. **Configure environment**
   ```powershell
   # Copy environment template
   copy .env.example .env
   copy server\.env.example server\.env
   
   # Edit server\.env with your database credentials
   notepad server\.env
   ```

4. **Start servers**
   ```powershell
   # Terminal 1: Backend
   cd server
   npm run dev
   
   # Terminal 2: Frontend (new PowerShell window)
   npm run dev
   ```

## Windows-Specific Configuration

### PostgreSQL Service Management

```powershell
# Start PostgreSQL
net start postgresql-x64-14

# Stop PostgreSQL  
net stop postgresql-x64-14

# Check if PostgreSQL is running
Get-Service -Name postgresql*

# Alternative: Check with pg_isready
pg_isready -h localhost -p 5432
```

### Environment Variables

The system uses cross-env for Windows compatibility. Your package.json scripts automatically handle NODE_ENV settings.

### Firewall Configuration

If you encounter connection issues:

1. **Allow Node.js through Windows Firewall**
   ```powershell
   # Run as Administrator
   New-NetFirewallRule -DisplayName "Node.js" -Direction Inbound -Program "C:\Program Files\nodejs\node.exe" -Action Allow
   ```

2. **Allow ports 3001 and 5173**
   ```powershell
   # Run as Administrator
   New-NetFirewallRule -DisplayName "RevManager Frontend" -Direction Inbound -LocalPort 5173 -Protocol TCP -Action Allow
   New-NetFirewallRule -DisplayName "RevManager Backend" -Direction Inbound -LocalPort 3001 -Protocol TCP -Action Allow
   ```

### Windows Path Issues

If you encounter path-related issues:

1. **Use PowerShell instead of Command Prompt**
2. **Ensure Git is properly installed** with Unix tools in PATH
3. **Use forward slashes** in configuration files when possible

## Development Scripts (Windows)

### PowerShell Scripts (.ps1)

- `.\setup.ps1` - Complete setup with dependency installation
- `.\start_dev.ps1` - Start both frontend and backend servers
- `.\test_realtime.ps1` - Test API endpoints and real-time features
- `.\deploy.ps1` - Deployment automation
- `.\test-docker.ps1` - Run tests in Docker containers
- `.\test_admin_dashboard.ps1` - Test admin dashboard functionality

### Batch Scripts (.bat)

- `setup.bat` - Basic setup (fallback option)
- `start_dev.bat` - Start development servers
- `test_realtime.bat` - Simple API testing

### NPM Scripts

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "build:prod": "cross-env NODE_ENV=production npm run build",
    "test:docker": "powershell -ExecutionPolicy Bypass -File ./test-docker.ps1",
    "test:docker:frontend": "powershell -ExecutionPolicy Bypass -File ./test-docker.ps1 -TestType frontend",
    "test:docker:backend": "powershell -ExecutionPolicy Bypass -File ./test-docker.ps1 -TestType backend"
  }
}
```

## Troubleshooting Windows Issues

### Common Problems

1. **PowerShell Execution Policy Error**
   ```powershell
   Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
   ```

2. **PostgreSQL Connection Issues**
   ```powershell
   # Check if service is running
   Get-Service postgresql*
   
   # Start service if needed
   net start postgresql-x64-14
   
   # Test connection
   psql -U postgres -h localhost -p 5432
   ```

3. **Port Already in Use**
   ```powershell
   # Find process using port
   netstat -ano | findstr :3001
   netstat -ano | findstr :5173
   
   # Kill process by PID
   taskkill /PID <process_id> /F
   ```

4. **Node.js Version Issues**
   ```powershell
   # Check current version
   node --version
   
   # Use nvm-windows to manage versions
   nvm install 18.17.0
   nvm use 18.17.0
   ```

5. **Path Length Limitations**
   - Enable long paths in Windows 10/11:
   ```powershell
   # Run as Administrator
   New-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Control\FileSystem" -Name "LongPathsEnabled" -Value 1 -PropertyType DWORD -Force
   ```

### Performance Optimization

1. **Exclude node_modules from Windows Defender**
   - Add your project folder to Windows Defender exclusions
   - Significantly improves npm install speed

2. **Use PowerShell Core (7.x) for better performance**
   ```powershell
   winget install Microsoft.PowerShell
   ```

3. **Consider WSL2 for Linux-like development**
   ```powershell
   wsl --install
   ```

## Docker on Windows

### Docker Desktop Setup

1. **Install Docker Desktop**
2. **Enable WSL2 backend** (recommended)
3. **Configure resource limits** in Docker Desktop settings

### Running with Docker

```powershell
# Build and run with docker-compose
docker-compose up -d

# Run tests in Docker
.\test-docker.ps1

# View logs
docker-compose logs -f
```

## IDE Recommendations for Windows

### Visual Studio Code (Recommended)
- Excellent TypeScript support
- Integrated terminal
- Git integration
- Extensions: PostgreSQL, Docker, REST Client

### WebStorm
- Powerful JavaScript/TypeScript IDE
- Built-in database tools
- Excellent debugging capabilities

### Sublime Text
- Lightweight alternative
- Good for quick edits

## Additional Windows Resources

- **Chocolatey Package Manager**: https://chocolatey.org/
- **Scoop Package Manager**: https://scoop.sh/
- **Windows Terminal**: https://aka.ms/terminal
- **WSL2 Documentation**: https://docs.microsoft.com/en-us/windows/wsl/
- **Docker Desktop for Windows**: https://docs.docker.com/desktop/windows/

## Support

If you encounter Windows-specific issues:

1. Check this guide for common solutions
2. Ensure all prerequisites are properly installed
3. Try running PowerShell as Administrator
4. Consider using WSL2 for a Linux-like environment
5. Check Windows Event Logs for system-level issues

The RevManager system is fully compatible with Windows and has been tested on Windows 10 and Windows 11.
