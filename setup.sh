#!/bin/bash

# RevManger Real-Time Setup Script
# This script sets up the complete real-time restaurant management system

set -e  # Exit on any error

echo "🚀 RevManger Real-Time Setup Starting..."
echo "============================================="

# Check for Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed!"
    echo "📋 Please install Node.js first:"
    echo "   - Visit: https://nodejs.org/"
    echo "   - Or use Homebrew: brew install node"
    exit 1
fi

echo "✅ Node.js found: $(node --version)"
echo "✅ npm found: $(npm --version)"

# Install frontend dependencies
echo ""
echo "📦 Installing frontend dependencies..."
npm install

# Install backend dependencies  
echo ""
echo "📦 Installing backend dependencies..."
cd server
npm install
cd ..

# Check for PostgreSQL
echo ""
echo "🐘 Checking PostgreSQL..."
if command -v psql &> /dev/null; then
    echo "✅ PostgreSQL found"
else
    echo "❌ PostgreSQL not found!"
    echo "📋 Please install PostgreSQL:"
    echo "   - Homebrew: brew install postgresql"
    echo "   - Or download from: https://www.postgresql.org/"
fi

# Create environment files if they don't exist
echo ""
echo "⚙️  Setting up environment files..."

if [ ! -f "server/.env" ]; then
    echo "📝 Creating server/.env..."
    cat > server/.env << EOF
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
EOF
    echo "✅ Created server/.env (please update database credentials)"
else
    echo "✅ server/.env already exists"
fi

# Setup database schema script
echo ""
echo "📊 Creating database setup script..."
cat > setup_database.sql << EOF
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
('admin', '\$2b\$10\$example_hash_change_this', 'owner', 'Admin', 'User'),
('chef1', '\$2b\$10\$example_hash_change_this', 'chef', 'Head', 'Chef'),
('server1', '\$2b\$10\$example_hash_change_this', 'server', 'Jane', 'Server')
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

EOF

echo "✅ Created setup_database.sql"

# Create startup scripts
echo ""
echo "🔧 Creating startup scripts..."

cat > start_dev.sh << 'EOF'
#!/bin/bash
# Start development servers

echo "🚀 Starting RevManger Development Servers..."

# Check if database is running
if ! pg_isready -h localhost -p 5432 &> /dev/null; then
    echo "❌ PostgreSQL is not running!"
    echo "Start it with: brew services start postgresql"
    exit 1
fi

# Start backend server in background
echo "🔧 Starting backend server (port 3001)..."
cd server
npm run dev &
BACKEND_PID=$!
cd ..

# Wait a moment for backend to start
sleep 3

# Start frontend server
echo "🎨 Starting frontend server (port 5173)..."
npm run dev &
FRONTEND_PID=$!

echo ""
echo "✅ Both servers started!"
echo "📱 Frontend: http://localhost:5173"
echo "🔧 Backend:  http://localhost:3001"
echo "📊 API Docs: http://localhost:3001/api"
echo ""
echo "Press Ctrl+C to stop both servers"

# Wait for user interrupt
trap "echo ''; echo '🛑 Stopping servers...'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" INT
wait
EOF

chmod +x start_dev.sh
echo "✅ Created start_dev.sh"

cat > test_realtime.sh << 'EOF'
#!/bin/bash
# Test the real-time functionality

echo "🧪 Testing Real-Time Menu Synchronization..."
echo "============================================"

BASE_URL="http://localhost:3001"

echo "1. Testing menu endpoint..."
curl -s "$BASE_URL/api/menu" | jq '.[0:2]' || echo "❌ Backend not running"

echo ""
echo "2. Testing inventory endpoint..."
curl -s "$BASE_URL/api/inventory" | jq '.[0:2]' || echo "❌ Backend not running"

echo ""
echo "🔄 To test real-time features:"
echo "1. Run: ./start_dev.sh"
echo "2. Open multiple browser windows to http://localhost:5173"
echo "3. Make inventory changes and watch live updates"
echo "4. Check the dashboard at http://localhost:5173/dashboard/live"

EOF

chmod +x test_realtime.sh
echo "✅ Created test_realtime.sh"

# Final instructions
echo ""
echo "🎉 Setup Complete!"
echo "=================="
echo ""
echo "📋 Next Steps:"
echo "1. Set up PostgreSQL database:"
echo "   psql -U postgres -c 'CREATE DATABASE revmanger;'"
echo "   psql -U postgres -d revmanger -f setup_database.sql"
echo ""
echo "2. Update server/.env with your database credentials"
echo ""
echo "3. Start the development servers:"
echo "   ./start_dev.sh"
echo ""
echo "4. Test real-time functionality:"
echo "   ./test_realtime.sh"
echo ""
echo "🔗 URLs after startup:"
echo "   Frontend:    http://localhost:5173"
echo "   Backend:     http://localhost:3001"
echo "   Live Dashboard: http://localhost:5173/dashboard/live"
echo ""
echo "📖 See REALTIME_TESTING.md for detailed testing scenarios"
echo ""
echo "Happy coding! 🚀"
