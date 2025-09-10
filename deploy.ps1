# RevManager Deployment Script (Windows PowerShell)
# This script helps automate the deployment process

param(
    [string]$Command = "help",
    [switch]$Verbose,
    [switch]$NoCoverage
)

# Configuration
$FrontendDir = "client"
$BackendDir = "server"
$BuildDir = "dist"

# Error handling
$ErrorActionPreference = "Stop"

# Functions
function Write-Info {
    param([string]$Message)
    Write-Host "[INFO] $Message" -ForegroundColor Blue
}

function Write-Success {
    param([string]$Message)
    Write-Host "[SUCCESS] $Message" -ForegroundColor Green
}

function Write-Warning {
    param([string]$Message)
    Write-Host "[WARNING] $Message" -ForegroundColor Yellow
}

function Write-Error {
    param([string]$Message)
    Write-Host "[ERROR] $Message" -ForegroundColor Red
}

function Test-Prerequisites {
    Write-Info "Checking prerequisites..."
    
    # Check if Node.js is installed
    try {
        $nodeVersion = node --version
        $nodeVersionNum = $nodeVersion.Substring(1).Split('.')[0]
        if ([int]$nodeVersionNum -lt 18) {
            Write-Error "Node.js version 18 or higher is required. Current version: $nodeVersion"
            exit 1
        }
    } catch {
        Write-Error "Node.js is not installed. Please install Node.js 18 or higher."
        exit 1
    }
    
    # Check if npm is installed
    try {
        $npmVersion = npm --version
    } catch {
        Write-Error "npm is not installed."
        exit 1
    }
    
    Write-Success "Prerequisites check passed"
}

function Install-Dependencies {
    Write-Info "Installing dependencies..."
    
    # Install frontend dependencies
    Write-Info "Installing frontend dependencies..."
    if (Test-Path $FrontendDir) {
        Set-Location $FrontendDir
        npm ci
        Set-Location ..
    }
    
    # Install backend dependencies
    Write-Info "Installing backend dependencies..."
    if (Test-Path $BackendDir) {
        Set-Location $BackendDir
        npm ci
        Set-Location ..
    }
    
    Write-Success "Dependencies installed"
}

function Invoke-Tests {
    Write-Info "Running tests..."
    
    # Run frontend tests
    if (Test-Path $FrontendDir) {
        Write-Info "Running frontend tests..."
        Set-Location $FrontendDir
        npm run test:ci
        Set-Location ..
    }
    
    # Run backend tests
    if (Test-Path $BackendDir) {
        Write-Info "Running backend tests..."
        Set-Location $BackendDir
        npm run test:ci
        Set-Location ..
    }
    
    Write-Success "All tests passed"
}

function Build-Frontend {
    Write-Info "Building frontend for production..."
    
    if (Test-Path $FrontendDir) {
        Set-Location $FrontendDir
        
        # Check if .env.production exists
        if (-not (Test-Path ".env.production")) {
            Write-Warning ".env.production not found. Using default environment variables."
            Write-Warning "Make sure to set VITE_API_URL and VITE_SOCKET_URL for production."
        }
        
        npm run build
        Set-Location ..
    }
    
    Write-Success "Frontend build completed"
}

function Test-Build {
    Write-Info "Validating build..."
    
    # Check if build directory exists
    $buildPath = Join-Path $FrontendDir $BuildDir
    if (-not (Test-Path $buildPath)) {
        Write-Error "Build directory not found. Build may have failed."
        exit 1
    }
    
    # Check if index.html exists
    $indexPath = Join-Path $buildPath "index.html"
    if (-not (Test-Path $indexPath)) {
        Write-Error "index.html not found in build directory."
        exit 1
    }
    
    # Check build size
    $buildSize = (Get-ChildItem $buildPath -Recurse | Measure-Object -Property Length -Sum).Sum / 1MB
    Write-Info "Build size: $([math]::Round($buildSize, 2)) MB"
    
    Write-Success "Build validation passed"
}

function Deploy-ToNetlify {
    Write-Info "Deploying to Netlify..."
    
    # Check if Netlify CLI is installed
    try {
        $netlifyVersion = netlify --version
    } catch {
        Write-Warning "Netlify CLI not found. Installing..."
        npm install -g netlify-cli
    }
    
    if (Test-Path $FrontendDir) {
        Set-Location $FrontendDir
        netlify deploy --prod --dir=$BuildDir
        Set-Location ..
    }
    
    Write-Success "Deployed to Netlify"
}

function Deploy-ToVercel {
    Write-Info "Deploying to Vercel..."
    
    # Check if Vercel CLI is installed
    try {
        $vercelVersion = vercel --version
    } catch {
        Write-Warning "Vercel CLI not found. Installing..."
        npm install -g vercel
    }
    
    if (Test-Path $FrontendDir) {
        Set-Location $FrontendDir
        vercel --prod
        Set-Location ..
    }
    
    Write-Success "Deployed to Vercel"
}

function Deploy-BackendRailway {
    Write-Info "Deploying backend to Railway..."
    
    # Check if Railway CLI is installed
    try {
        $railwayVersion = railway version
    } catch {
        Write-Error "Railway CLI not found. Please install: npm install -g @railway/cli"
        exit 1
    }
    
    if (Test-Path $BackendDir) {
        Set-Location $BackendDir
        railway up
        Set-Location ..
    }
    
    Write-Success "Backend deployed to Railway"
}

function Build-DockerImages {
    Write-Info "Building Docker images..."
    
    # Build backend image
    if (Test-Path $BackendDir) {
        docker build -t revmanager-backend ./$BackendDir
    }
    
    # Build frontend image  
    if (Test-Path $FrontendDir) {
        docker build -t revmanager-frontend ./$FrontendDir
    }
    
    Write-Success "Docker images built"
}

function Deploy-Docker {
    Write-Info "Deploying with Docker Compose..."
    
    # Check if .env.production exists
    if (-not (Test-Path ".env.production")) {
        Write-Error ".env.production not found. Please create environment file."
        exit 1
    }
    
    # Deploy with docker-compose
    docker-compose -f docker-compose.prod.yml up -d
    
    Write-Success "Deployed with Docker Compose"
}

function Show-Help {
    Write-Host "RevManager Deployment Script (Windows)" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Usage: .\deploy.ps1 [COMMAND] [OPTIONS]" -ForegroundColor White
    Write-Host ""
    Write-Host "Commands:" -ForegroundColor Yellow
    Write-Host "  check          Check prerequisites"
    Write-Host "  install        Install dependencies"
    Write-Host "  test           Run all tests"
    Write-Host "  build          Build frontend for production"
    Write-Host "  validate       Validate build output"
    Write-Host "  netlify        Deploy frontend to Netlify"
    Write-Host "  vercel         Deploy frontend to Vercel"
    Write-Host "  railway        Deploy backend to Railway"
    Write-Host "  docker-build   Build Docker images"
    Write-Host "  docker-deploy  Deploy with Docker Compose"
    Write-Host "  full-deploy    Run complete deployment (check, install, test, build, validate)"
    Write-Host "  help           Show this help message"
    Write-Host ""
    Write-Host "Options:" -ForegroundColor Yellow
    Write-Host "  -Verbose       Enable verbose output"
    Write-Host "  -NoCoverage    Disable coverage reporting"
    Write-Host ""
    Write-Host "Examples:" -ForegroundColor Green
    Write-Host "  .\deploy.ps1 full-deploy    # Complete deployment workflow"
    Write-Host "  .\deploy.ps1 netlify        # Deploy to Netlify"
    Write-Host "  .\deploy.ps1 railway        # Deploy backend to Railway"
}

# Main script logic
try {
    switch ($Command.ToLower()) {
        "check" {
            Test-Prerequisites
        }
        "install" {
            Test-Prerequisites
            Install-Dependencies
        }
        "test" {
            Test-Prerequisites
            Install-Dependencies
            Invoke-Tests
        }
        "build" {
            Test-Prerequisites
            Install-Dependencies
            Build-Frontend
        }
        "validate" {
            Test-Build
        }
        "netlify" {
            Test-Prerequisites
            Install-Dependencies
            Invoke-Tests
            Build-Frontend
            Test-Build
            Deploy-ToNetlify
        }
        "vercel" {
            Test-Prerequisites
            Install-Dependencies
            Invoke-Tests
            Build-Frontend
            Test-Build
            Deploy-ToVercel
        }
        "railway" {
            Deploy-BackendRailway
        }
        "docker-build" {
            Build-DockerImages
        }
        "docker-deploy" {
            Deploy-Docker
        }
        "full-deploy" {
            Test-Prerequisites
            Install-Dependencies
            Invoke-Tests
            Build-Frontend
            Test-Build
            Write-Success "Full deployment workflow completed successfully!"
            Write-Info "Next steps:"
            Write-Info "1. Deploy frontend: .\deploy.ps1 netlify or .\deploy.ps1 vercel"
            Write-Info "2. Deploy backend: .\deploy.ps1 railway"
        }
        default {
            Show-Help
        }
    }
} catch {
    Write-Error "Deployment failed: $_"
    Write-Warning "Please check the error above and try again."
    exit 1
}
