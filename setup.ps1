# RevManger Real-Time Setup Script (Windows PowerShell)
# This script sets up the complete real-time restaurant management system

param(
    [switch]$Help
)

if ($Help) {
    Write-Host "RevManger Setup Script for Windows"
    Write-Host "Usage: .\setup.ps1"
    Write-Host ""
    Write-Host "This script will:"
    Write-Host "  - Check prerequisites (Node.js, PostgreSQL)"
    Write-Host "  - Install frontend and backend dependencies"
    Write-Host "  - Create environment files"
    Write-Host "  - Generate database setup scripts"
    Write-Host "  - Create startup scripts for development"
    return
}

Write-Host "🚀 RevManger Real-Time Setup Starting..." -ForegroundColor Blue
Write-Host "============================================="

# Error handling
$ErrorActionPreference = "Stop"

try {
    # Check for Node.js
    Write-Host "✅ Checking for Node.js..." -ForegroundColor Green
    $nodeVersion = node --version 2>$null
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Node.js is not installed!" -ForegroundColor Red
        Write-Host "📋 Please install Node.js first:" -ForegroundColor Yellow
        Write-Host "   - Visit: https://nodejs.org/" -ForegroundColor Yellow
        Write-Host "   - Or use Chocolatey: choco install nodejs" -ForegroundColor Yellow
        exit 1
    }

    Write-Host "✅ Node.js found: $nodeVersion" -ForegroundColor Green

    $npmVersion = npm --version 2>$null
    Write-Host "✅ npm found: v$npmVersion" -ForegroundColor Green

    # Install frontend dependencies
    Write-Host ""
    Write-Host "📦 Installing frontend dependencies..." -ForegroundColor Blue
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Failed to install frontend dependencies" -ForegroundColor Red
        exit 1
    }

    # Install backend dependencies  
    Write-Host ""
    Write-Host "📦 Installing backend dependencies..." -ForegroundColor Blue
    Set-Location server
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Failed to install backend dependencies" -ForegroundColor Red
        exit 1
    }
    Set-Location ..

    # Check for PostgreSQL
    Write-Host ""
    Write-Host "🐘 Checking PostgreSQL..." -ForegroundColor Blue
    $pgVersion = psql --version 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ PostgreSQL found: $pgVersion" -ForegroundColor Green
    } else {
        Write-Host "❌ PostgreSQL not found!" -ForegroundColor Red
        Write-Host "📋 Please install PostgreSQL:" -ForegroundColor Yellow
        Write-Host "   - Download from: https://www.postgresql.org/" -ForegroundColor Yellow
        Write-Host "   - Or use Chocolatey: choco install postgresql" -ForegroundColor Yellow
        Write-Host "   - Or use Scoop: scoop install postgresql" -ForegroundColor Yellow
    }

    # Create environment files if they don't exist
    Write-Host ""
    Write-Host "⚙️  Setting up environment files..." -ForegroundColor Blue

    if (-not (Test-Path "server\.env")) {
        Write-Host "📝 Creating server\.env..." -ForegroundColor Yellow
        @"
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=revmanger
DB_USER=your_username
DB_PASSWORD=your_password

# Server Configuration
PORT=3001
NODE_ENV=development

# JWT Secret (change this in production!)
JWT_SECRET=your-super-secret-jwt-key-change-this

# CORS Origin
CORS_ORIGIN=http://localhost:5173
"@ | Out-File -FilePath "server\.env" -Encoding utf8
        Write-Host "✅ Created server\.env (please update database credentials)" -ForegroundColor Green
    } else {
        Write-Host "✅ server\.env already exists" -ForegroundColor Green
    }

    # Setup database schema script
    Write-Host ""
    Write-Host "📊 Creating database setup script..." -ForegroundColor Blue
    @"
-- RevManger Database Setup Script
-- Run this script to create the database and tables

-- Create database (run this as postgres user)
-- CREATE DATABASE revmanger;
-- \c revmanger;

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('customer', 'server', 'chef', 'manager', 'owner')),
    email VARCHAR(100),
    first_name VARCHAR(50),
    last_name VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Menu items table
CREATE TABLE IF NOT EXISTS menu_items (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    category VARCHAR(50) NOT NULL,
    is_available BOOLEAN DEFAULT true,
    image_url VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Inventory items table
CREATE TABLE IF NOT EXISTS inventory_items (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    category VARCHAR(50),
    unit VARCHAR(20) NOT NULL,
    quantity DECIMAL(10,3) NOT NULL DEFAULT 0,
    minimum_quantity DECIMAL(10,3) DEFAULT 0,
    cost_per_unit DECIMAL(10,2),
    supplier VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Junction table linking menu items to required inventory
CREATE TABLE IF NOT EXISTS menu_item_inventory (
    id SERIAL PRIMARY KEY,
    menu_item_id INTEGER REFERENCES menu_items(id) ON DELETE CASCADE,
    inventory_item_id INTEGER REFERENCES inventory_items(id) ON DELETE CASCADE,
    quantity_required DECIMAL(10,3) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(menu_item_id, inventory_item_id)
);

-- 86'd items list
CREATE TABLE IF NOT EXISTS eighty_six_list (
    id SERIAL PRIMARY KEY,
    menu_item_id INTEGER REFERENCES menu_items(id) ON DELETE CASCADE,
    reason TEXT,
    is_auto_generated BOOLEAN DEFAULT false,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Orders table
CREATE TABLE IF NOT EXISTS orders (
    id SERIAL PRIMARY KEY,
    customer_name VARCHAR(100),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'preparing', 'ready', 'completed', 'cancelled')),
    total_amount DECIMAL(10,2),
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Order items table
CREATE TABLE IF NOT EXISTS order_items (
    id SERIAL PRIMARY KEY,
    order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
    menu_item_id INTEGER REFERENCES menu_items(id),
    quantity INTEGER NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    notes TEXT
);

-- Audit log table
CREATE TABLE IF NOT EXISTS audit_log (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    action VARCHAR(50) NOT NULL,
    table_name VARCHAR(50),
    record_id INTEGER,
    old_values JSONB,
    new_values JSONB,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Sample data
INSERT INTO users (username, password_hash, role, first_name, last_name) VALUES
('admin', '$2b$10$example_hash_change_this', 'owner', 'Admin', 'User'),
('chef1', '$2b$10$example_hash_change_this', 'chef', 'Head', 'Chef'),
('server1', '$2b$10$example_hash_change_this', 'server', 'Jane', 'Server')
ON CONFLICT (username) DO NOTHING;

INSERT INTO menu_items (name, description, price, category) VALUES
('Grilled Chicken Breast', 'Tender grilled chicken breast with herbs', 18.99, 'entrees'),
('Caesar Salad', 'Fresh romaine with parmesan and croutons', 12.99, 'salads'),
('Fish Tacos', 'Fresh fish with slaw and lime crema', 16.99, 'entrees'),
('Chocolate Cake', 'Rich chocolate cake with ganache', 8.99, 'desserts')
ON CONFLICT DO NOTHING;

INSERT INTO inventory_items (name, category, unit, quantity, minimum_quantity) VALUES
('Chicken Breast', 'proteins', 'lbs', 50, 10),
('Romaine Lettuce', 'vegetables', 'heads', 20, 5),
('White Fish', 'proteins', 'lbs', 15, 3),
('Chocolate', 'baking', 'lbs', 5, 2),
('Flour', 'baking', 'lbs', 25, 5)
ON CONFLICT DO NOTHING;

-- Link menu items to inventory requirements
INSERT INTO menu_item_inventory (menu_item_id, inventory_item_id, quantity_required) VALUES
(1, 1, 0.5),  -- Chicken dish needs 0.5 lbs chicken
(2, 2, 1.0),  -- Caesar salad needs 1 head lettuce  
(3, 3, 0.33), -- Fish tacos need 1/3 lb fish
(4, 4, 0.25), -- Chocolate cake needs 0.25 lbs chocolate
(4, 5, 0.5)   -- Chocolate cake needs 0.5 lbs flour
ON CONFLICT DO NOTHING;

COMMENT ON TABLE menu_item_inventory IS 'Links menu items to required inventory items with quantities';
COMMENT ON COLUMN eighty_six_list.is_auto_generated IS 'True if item was automatically 86d due to inventory, false if manually 86d';
"@ | Out-File -FilePath "setup_database.sql" -Encoding utf8

    Write-Host "✅ Created setup_database.sql" -ForegroundColor Green

    # Create startup scripts
    Write-Host ""
    Write-Host "🔧 Creating startup scripts..." -ForegroundColor Blue

    @"
# Start development servers for RevManger
# Windows PowerShell script

Write-Host "🚀 Starting RevManger Development Servers..." -ForegroundColor Blue

# Check if PostgreSQL is running
try {
    `$pgStatus = pg_isready -h localhost -p 5432 2>`$null
    if (`$LASTEXITCODE -ne 0) {
        Write-Host "❌ PostgreSQL is not running!" -ForegroundColor Red
        Write-Host "Start it with: net start postgresql-x64-14 (or your version)" -ForegroundColor Yellow
        Write-Host "Or start PostgreSQL service from Services.msc" -ForegroundColor Yellow
        exit 1
    }
} catch {
    Write-Host "❌ Cannot check PostgreSQL status. Make sure it's installed and running." -ForegroundColor Red
    exit 1
}

# Start backend server in background
Write-Host "🔧 Starting backend server (port 3001)..." -ForegroundColor Green
Set-Location server
Start-Process powershell -ArgumentList "-NoProfile", "-Command", "npm run dev" -WindowStyle Minimized
Set-Location ..

# Wait a moment for backend to start
Start-Sleep -Seconds 3

# Start frontend server
Write-Host "🎨 Starting frontend server (port 5173)..." -ForegroundColor Green
Write-Host ""
Write-Host "✅ Both servers starting!" -ForegroundColor Green
Write-Host "📱 Frontend: http://localhost:5173" -ForegroundColor Cyan
Write-Host "🔧 Backend:  http://localhost:3001" -ForegroundColor Cyan
Write-Host "📊 API Docs: http://localhost:3001/api" -ForegroundColor Cyan
Write-Host ""
Write-Host "Press Ctrl+C to stop the frontend server" -ForegroundColor Yellow

npm run dev
"@ | Out-File -FilePath "start_dev.ps1" -Encoding utf8

    Write-Host "✅ Created start_dev.ps1" -ForegroundColor Green

    @"
# Test the real-time functionality
# Windows PowerShell script

Write-Host "🧪 Testing Real-Time Menu Synchronization..." -ForegroundColor Blue
Write-Host "============================================"

`$baseUrl = "http://localhost:3001"

Write-Host "1. Testing menu endpoint..." -ForegroundColor Yellow
try {
    `$response = Invoke-WebRequest -Uri "`$baseUrl/api/menu" -UseBasicParsing -TimeoutSec 5
    Write-Host "✅ Menu endpoint accessible" -ForegroundColor Green
    `$json = `$response.Content | ConvertFrom-Json
    Write-Host "Found `$(`$json.Length) menu items" -ForegroundColor Cyan
} catch {
    Write-Host "❌ Backend not running or menu endpoint not accessible" -ForegroundColor Red
}

Write-Host ""
Write-Host "2. Testing inventory endpoint..." -ForegroundColor Yellow
try {
    `$response = Invoke-WebRequest -Uri "`$baseUrl/api/inventory" -UseBasicParsing -TimeoutSec 5
    Write-Host "✅ Inventory endpoint accessible" -ForegroundColor Green
    `$json = `$response.Content | ConvertFrom-Json
    Write-Host "Found `$(`$json.Length) inventory items" -ForegroundColor Cyan
} catch {
    Write-Host "❌ Backend not running or inventory endpoint not accessible" -ForegroundColor Red
}

Write-Host ""
Write-Host "🔄 To test real-time features:" -ForegroundColor Blue
Write-Host "1. Run: .\start_dev.ps1" -ForegroundColor White
Write-Host "2. Open multiple browser windows to http://localhost:5173" -ForegroundColor White
Write-Host "3. Make inventory changes and watch live updates" -ForegroundColor White
Write-Host "4. Check the dashboard at http://localhost:5173/dashboard/live" -ForegroundColor White
"@ | Out-File -FilePath "test_realtime.ps1" -Encoding utf8

    Write-Host "✅ Created test_realtime.ps1" -ForegroundColor Green

    # Final instructions
    Write-Host ""
    Write-Host "🎉 Setup Complete!" -ForegroundColor Green
    Write-Host "=================="
    Write-Host ""
    Write-Host "📋 Next Steps:" -ForegroundColor Blue
    Write-Host "1. Set up PostgreSQL database:" -ForegroundColor White
    Write-Host "   psql -U postgres -c `"CREATE DATABASE revmanger;`"" -ForegroundColor Cyan
    Write-Host "   psql -U postgres -d revmanger -f setup_database.sql" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "2. Update server\.env with your database credentials" -ForegroundColor White
    Write-Host ""
    Write-Host "3. Start the development servers:" -ForegroundColor White
    Write-Host "   .\start_dev.ps1" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "4. Test real-time functionality:" -ForegroundColor White
    Write-Host "   .\test_realtime.ps1" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "🔗 URLs after startup:" -ForegroundColor Blue
    Write-Host "   Frontend:       http://localhost:5173" -ForegroundColor Cyan
    Write-Host "   Backend:        http://localhost:3001" -ForegroundColor Cyan
    Write-Host "   Live Dashboard: http://localhost:5173/dashboard/live" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "📖 See REALTIME_TESTING.md for detailed testing scenarios" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Happy coding! 🚀" -ForegroundColor Green

} catch {
    Write-Host "❌ Setup failed: $_" -ForegroundColor Red
    Write-Host "Please check the error above and try again." -ForegroundColor Yellow
    exit 1
}
