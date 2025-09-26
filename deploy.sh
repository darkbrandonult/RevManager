#!/bin/bash

# RevManager Deployment Script
# This script helps automate the deployment process

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
FRONTEND_DIR="client"
BACKEND_DIR="server"
BUILD_DIR="dist"

# Functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check if Node.js is installed
    if ! command -v node &> /dev/null; then
        log_error "Node.js is not installed. Please install Node.js 18 or higher."
        exit 1
    fi
    
    # Check Node.js version
    NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt 18 ]; then
        log_error "Node.js version 18 or higher is required. Current version: $(node -v)"
        exit 1
    fi
    
    # Check if npm is installed
    if ! command -v npm &> /dev/null; then
        log_error "npm is not installed."
        exit 1
    fi
    
    log_success "Prerequisites check passed"
}

install_dependencies() {
    log_info "Installing dependencies..."
    
    # Install frontend dependencies
    log_info "Installing frontend dependencies..."
    cd $FRONTEND_DIR
    npm ci
    cd ..
    
    # Install backend dependencies
    log_info "Installing backend dependencies..."
    cd $BACKEND_DIR
    npm ci
    cd ..
    
    log_success "Dependencies installed"
}

run_tests() {
    log_info "Running tests..."
    
    # Run frontend tests
    log_info "Running frontend tests..."
    cd $FRONTEND_DIR
    npm run test:ci
    cd ..
    
    # Run backend tests
    log_info "Running backend tests..."
    cd $BACKEND_DIR
    npm run test:ci
    cd ..
    
    log_success "All tests passed"
}

build_frontend() {
    log_info "Building frontend for production..."
    cd $FRONTEND_DIR
    
    # Check if .env.production exists
    if [ ! -f ".env.production" ]; then
        log_warning ".env.production not found. Using default environment variables."
        log_warning "Make sure to set VITE_API_URL and VITE_SOCKET_URL for production."
    fi
    
    npm run build
    cd ..
    log_success "Frontend build completed"
}

validate_build() {
    log_info "Validating build..."
    
    # Check if build directory exists
    if [ ! -d "$FRONTEND_DIR/$BUILD_DIR" ]; then
        log_error "Build directory not found. Build may have failed."
        exit 1
    fi
    
    # Check if index.html exists
    if [ ! -f "$FRONTEND_DIR/$BUILD_DIR/index.html" ]; then
        log_error "index.html not found in build directory."
        exit 1
    fi
    
    # Check build size
    BUILD_SIZE=$(du -sh "$FRONTEND_DIR/$BUILD_DIR" | cut -f1)
    log_info "Build size: $BUILD_SIZE"
    
    log_success "Build validation passed"
}

deploy_to_netlify() {
    log_info "Deploying to Netlify..."
    
    # Check if Netlify CLI is installed
    if ! command -v netlify &> /dev/null; then
        log_warning "Netlify CLI not found. Installing..."
        npm install -g netlify-cli
    fi
    
    cd $FRONTEND_DIR
    netlify deploy --prod --dir=$BUILD_DIR
    cd ..
    
    log_success "Deployed to Netlify"
}

deploy_to_vercel() {
    log_info "Deploying to Vercel..."
    
    # Check if Vercel CLI is installed
    if ! command -v vercel &> /dev/null; then
        log_warning "Vercel CLI not found. Installing..."
        npm install -g vercel
    fi
    
    cd $FRONTEND_DIR
    vercel --prod
    cd ..
    
    log_success "Deployed to Vercel"
}

deploy_backend_railway() {
    log_info "Deploying backend to Railway..."
    
    # Check if Railway CLI is installed
    if ! command -v railway &> /dev/null; then
        log_error "Railway CLI not found. Please install: npm install -g @railway/cli"
        exit 1
    fi
    
    cd $BACKEND_DIR
    railway up
    cd ..
    
    log_success "Backend deployed to Railway"
}

docker_build() {
    log_info "Building Docker images..."
    
    # Build backend image
    docker build -t revmanager-backend ./server
    
    # Build frontend image  
    docker build -t revmanager-frontend ./client
    
    log_success "Docker images built"
}

docker_deploy() {
    log_info "Deploying with Docker Compose..."
    
    # Check if .env.production exists
    if [ ! -f ".env.production" ]; then
        log_error ".env.production not found. Please create environment file."
        exit 1
    fi
    
    # Deploy with docker-compose
    docker-compose -f docker-compose.prod.yml up -d
    
    log_success "Deployed with Docker Compose"
}

show_help() {
    echo "RevManager Deployment Script"
    echo ""
    echo "Usage: $0 [COMMAND]"
    echo ""
    echo "Commands:"
    echo "  check          Check prerequisites"
    echo "  install        Install dependencies"
    echo "  test           Run all tests"
    echo "  build          Build frontend for production"
    echo "  validate       Validate build output"
    echo "  netlify        Deploy frontend to Netlify"
    echo "  vercel         Deploy frontend to Vercel"
    echo "  railway        Deploy backend to Railway"
    echo "  docker-build   Build Docker images"
    echo "  docker-deploy  Deploy with Docker Compose"
    echo "  full-deploy    Run complete deployment (check, install, test, build, validate)"
    echo "  help           Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 full-deploy    # Complete deployment workflow"
    echo "  $0 netlify        # Deploy to Netlify"
    echo "  $0 railway        # Deploy backend to Railway"
}

# Main script logic
case "${1:-help}" in
    "check")
        check_prerequisites
        ;;
    "install")
        check_prerequisites
        install_dependencies
        ;;
    "test")
        check_prerequisites
        install_dependencies
        run_tests
        ;;
    "build")
        check_prerequisites
        install_dependencies
        build_frontend
        ;;
    "validate")
        validate_build
        ;;
    "netlify")
        check_prerequisites
        install_dependencies
        run_tests
        build_frontend
        validate_build
        deploy_to_netlify
        ;;
    "vercel")
        check_prerequisites
        install_dependencies
        run_tests
        build_frontend
        validate_build
        deploy_to_vercel
        ;;
    "railway")
        deploy_backend_railway
        ;;
    "docker-build")
        docker_build
        ;;
    "docker-deploy")
        docker_deploy
        ;;
    "full-deploy")
        check_prerequisites
        install_dependencies
        run_tests
        build_frontend
        validate_build
        log_success "Full deployment workflow completed successfully!"
        log_info "Next steps:"
        log_info "1. Deploy frontend: ./deploy.sh netlify or ./deploy.sh vercel"
        log_info "2. Deploy backend: ./deploy.sh railway"
        ;;
    "help"|*)
        show_help
        ;;
esac
