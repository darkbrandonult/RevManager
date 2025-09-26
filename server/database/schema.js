import { pool } from './connection.js'

const createTables = async () => {
  try {
    console.log('Creating database tables...')

    // Users table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        first_name VARCHAR(100) NOT NULL,
        last_name VARCHAR(100) NOT NULL,
        role VARCHAR(20) NOT NULL CHECK (role IN ('customer', 'server', 'chef', 'manager', 'owner')),
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)

    // Menu items table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS menu_items (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        price NUMERIC(10,2) NOT NULL,
        category VARCHAR(100) NOT NULL,
        is_available BOOLEAN DEFAULT true,
        image_url TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)

    // Inventory items table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS inventory_items (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        category VARCHAR(100) NOT NULL,
        current_stock NUMERIC(10,2) NOT NULL DEFAULT 0,
        par_level NUMERIC(10,2) NOT NULL DEFAULT 0,
        unit VARCHAR(50) DEFAULT 'each',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)

    // Orders table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id SERIAL PRIMARY KEY,
        customer_name VARCHAR(255) NOT NULL,
        table_number INTEGER,
        status VARCHAR(20) NOT NULL DEFAULT 'pending' 
          CHECK (status IN ('pending', 'preparing', 'ready', 'completed', 'cancelled', 'closed')),
        total_amount NUMERIC(10,2) NOT NULL,
        tip_amount NUMERIC(10,2) DEFAULT 0,
        tip_percentage NUMERIC(5,2),
        payment_method VARCHAR(50),
        server_id INTEGER REFERENCES users(id),
        created_by INTEGER REFERENCES users(id),
        closed_by INTEGER REFERENCES users(id),
        closed_at TIMESTAMP,
        estimated_completion TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)

    // Order items table (individual items within an order)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS order_items (
        id SERIAL PRIMARY KEY,
        order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
        menu_item_id INTEGER REFERENCES menu_items(id),
        quantity INTEGER NOT NULL DEFAULT 1,
        price NUMERIC(10,2) NOT NULL,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)

    // 86 list table (items temporarily unavailable)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS eighty_six_list (
        id SERIAL PRIMARY KEY,
        menu_item_id INTEGER REFERENCES menu_items(id) ON DELETE CASCADE,
        reason TEXT,
        created_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        removed_at TIMESTAMP,
        is_auto_generated BOOLEAN DEFAULT false,
        UNIQUE(menu_item_id) WHERE removed_at IS NULL
      )
    `)

    // Menu item inventory junction table (links menu items to required inventory)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS menu_item_inventory (
        id SERIAL PRIMARY KEY,
        menu_item_id INTEGER REFERENCES menu_items(id) ON DELETE CASCADE,
        inventory_item_id INTEGER REFERENCES inventory_items(id) ON DELETE CASCADE,
        quantity_required NUMERIC(10,2) NOT NULL DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(menu_item_id, inventory_item_id)
      )
    `)

    // Staff messages table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS staff_messages (
        id SERIAL PRIMARY KEY,
        from_user_id INTEGER REFERENCES users(id),
        to_user_id INTEGER,
        message TEXT NOT NULL,
        is_broadcast BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        read_at TIMESTAMP
      )
    `)

    // Shifts table for scheduling
    await pool.query(`
      CREATE TABLE IF NOT EXISTS shifts (
        id SERIAL PRIMARY KEY,
        date DATE NOT NULL,
        start_time TIME NOT NULL,
        end_time TIME NOT NULL,
        role_required VARCHAR(50) NOT NULL,
        location VARCHAR(100) DEFAULT 'main',
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)

    // User shift assignments table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_shifts (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        shift_id INTEGER REFERENCES shifts(id) ON DELETE CASCADE,
        status VARCHAR(20) DEFAULT 'scheduled' 
          CHECK (status IN ('scheduled', 'confirmed', 'completed', 'cancelled', 'no_show')),
        assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        assigned_by INTEGER REFERENCES users(id),
        UNIQUE(user_id, shift_id)
      )
    `)

    // Shift swap requests table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS shift_swaps (
        id SERIAL PRIMARY KEY,
        requesting_user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        target_user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        shift_id INTEGER REFERENCES shifts(id) ON DELETE CASCADE,
        status VARCHAR(20) DEFAULT 'pending' 
          CHECK (status IN ('pending', 'approved', 'denied', 'cancelled')),
        message TEXT,
        requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        responded_at TIMESTAMP,
        responded_by INTEGER REFERENCES users(id)
      )
    `)

    // Time off requests table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS time_off_requests (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        reason TEXT,
        status VARCHAR(20) DEFAULT 'pending' 
          CHECK (status IN ('pending', 'approved', 'denied')),
        requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        reviewed_at TIMESTAMP,
        reviewed_by INTEGER REFERENCES users(id)
      )
    `)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_shifts (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        shift_id INTEGER REFERENCES shifts(id) ON DELETE CASCADE,
        status VARCHAR(20) DEFAULT 'assigned' 
          CHECK (status IN ('assigned', 'confirmed', 'declined', 'completed', 'no_show')),
        assigned_by INTEGER REFERENCES users(id),
        assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        responded_at TIMESTAMP,
        notes TEXT,
        UNIQUE(user_id, shift_id)
      )
    `)

    // Shift swap requests table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS shift_swaps (
        id SERIAL PRIMARY KEY,
        requesting_user_id INTEGER REFERENCES users(id),
        target_user_id INTEGER REFERENCES users(id),
        requesting_shift_id INTEGER REFERENCES shifts(id),
        target_shift_id INTEGER REFERENCES shifts(id),
        status VARCHAR(20) DEFAULT 'pending'
          CHECK (status IN ('pending', 'approved', 'declined', 'cancelled')),
        reason TEXT,
        approved_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)

    // Time off requests table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS time_off_requests (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        reason TEXT,
        status VARCHAR(20) DEFAULT 'pending'
          CHECK (status IN ('pending', 'approved', 'denied')),
        approved_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT valid_time_off_dates CHECK (start_date <= end_date)
      )
    `)

    // Audit logs table for security tracking
    await pool.query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        action VARCHAR(100) NOT NULL,
        endpoint VARCHAR(255),
        method VARCHAR(10),
        ip_address INET,
        user_agent TEXT,
        request_data JSONB,
        response_status INTEGER,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)

    // User sessions table for token management
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_sessions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        token_hash VARCHAR(255) NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        ip_address INET,
        user_agent TEXT
      )
    `)

    // Notifications table for system alerts
    await pool.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id SERIAL PRIMARY KEY,
        type VARCHAR(50) NOT NULL CHECK (type IN ('inventory_alert', 'tip_alert', 'schedule_alert', 'general')),
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        severity VARCHAR(20) DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'critical')),
        target_roles TEXT[] DEFAULT ARRAY['manager'],
        metadata JSONB,
        is_dismissed BOOLEAN DEFAULT false,
        dismissed_by INTEGER REFERENCES users(id),
        dismissed_at TIMESTAMP,
        expires_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)

    // Tip pooling and tracking tables
    await pool.query(`
      CREATE TABLE IF NOT EXISTS tip_distribution_rules (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        is_active BOOLEAN DEFAULT true,
        rules JSONB NOT NULL,
        created_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)

    await pool.query(`
      CREATE TABLE IF NOT EXISTS shifts (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        start_time TIMESTAMP NOT NULL,
        end_time TIMESTAMP,
        role VARCHAR(50) NOT NULL,
        location VARCHAR(100) DEFAULT 'main',
        hours_worked NUMERIC(8,2),
        status VARCHAR(20) DEFAULT 'active' 
          CHECK (status IN ('active', 'completed', 'cancelled')),
        tip_pool_calculated BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)

    await pool.query(`
      CREATE TABLE IF NOT EXISTS tip_pools (
        id SERIAL PRIMARY KEY,
        shift_date DATE NOT NULL,
        total_tips NUMERIC(10,2) NOT NULL DEFAULT 0,
        total_orders INTEGER DEFAULT 0,
        distribution_rule_id INTEGER REFERENCES tip_distribution_rules(id),
        status VARCHAR(20) DEFAULT 'pending' 
          CHECK (status IN ('pending', 'calculated', 'distributed', 'finalized')),
        calculated_at TIMESTAMP,
        distributed_at TIMESTAMP,
        finalized_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(shift_date)
      )
    `)

    await pool.query(`
      CREATE TABLE IF NOT EXISTS tip_payouts (
        id SERIAL PRIMARY KEY,
        tip_pool_id INTEGER REFERENCES tip_pools(id) ON DELETE CASCADE,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        shift_id INTEGER REFERENCES shifts(id),
        base_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
        bonus_amount NUMERIC(10,2) DEFAULT 0,
        total_amount NUMERIC(10,2) NOT NULL,
        hours_worked NUMERIC(8,2),
        role VARCHAR(50) NOT NULL,
        percentage_share NUMERIC(5,2),
        calculation_details JSONB,
        status VARCHAR(20) DEFAULT 'pending' 
          CHECK (status IN ('pending', 'approved', 'paid', 'disputed')),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        paid_at TIMESTAMP
      )
    `)

    await pool.query(`
      CREATE TABLE IF NOT EXISTS tip_disputes (
        id SERIAL PRIMARY KEY,
        payout_id INTEGER REFERENCES tip_payouts(id) ON DELETE CASCADE,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        reason TEXT NOT NULL,
        status VARCHAR(20) DEFAULT 'pending' 
          CHECK (status IN ('pending', 'investigating', 'resolved', 'rejected')),
        resolution TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        resolved_at TIMESTAMP,
        resolved_by INTEGER REFERENCES users(id)
      )
    `)

    // Create indexes for better performance
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`)
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_users_role ON users(role)`)
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_menu_items_category ON menu_items(category)`)
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_inventory_category ON inventory_items(category)`)
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status)`)
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id)`)
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at)`)
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_86_list_menu_item ON eighty_six_list(menu_item_id)`)
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_86_list_auto_generated ON eighty_six_list(is_auto_generated)`)
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_menu_item_inventory_menu ON menu_item_inventory(menu_item_id)`)
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_menu_item_inventory_item ON menu_item_inventory(inventory_item_id)`)
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_staff_messages_to_user ON staff_messages(to_user_id)`)
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id)`)
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp)`)
    
    // Tip tracking indexes
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_orders_server_id ON orders(server_id)`)
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_orders_closed_at ON orders(closed_at)`)
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_orders_tip_amount ON orders(tip_amount)`)
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_shifts_user_id ON shifts(user_id)`)
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_shifts_start_time ON shifts(start_time)`)
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_tip_pools_shift_date ON tip_pools(shift_date)`)
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_tip_payouts_user_id ON tip_payouts(user_id)`)
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_tip_payouts_tip_pool_id ON tip_payouts(tip_pool_id)`)

    console.log('Tables created successfully!')
    
  } catch (error) {
    console.error('Error creating tables:', error)
    throw error
  }
}

const insertSampleData = async () => {
  try {
    console.log('Inserting sample data...')

    // Sample users
    await pool.query(`
      INSERT INTO users (email, password_hash, first_name, last_name, role) VALUES
      ('owner@restaurant.com', '$2b$10$placeholder', 'John', 'Owner', 'owner'),
      ('manager@restaurant.com', '$2b$10$placeholder', 'Jane', 'Manager', 'manager'),
      ('chef@restaurant.com', '$2b$10$placeholder', 'Mike', 'Chef', 'chef'),
      ('server@restaurant.com', '$2b$10$placeholder', 'Sarah', 'Server', 'server'),
      ('customer@example.com', '$2b$10$placeholder', 'Bob', 'Customer', 'customer')
      ON CONFLICT (email) DO NOTHING
    `)

    // Sample menu items
    await pool.query(`
      INSERT INTO menu_items (name, description, price, category) VALUES
      ('Classic Burger', 'Beef patty with lettuce, tomato, and special sauce', 12.99, 'mains'),
      ('Caesar Salad', 'Fresh romaine with caesar dressing and croutons', 8.99, 'starters'),
      ('Grilled Salmon', 'Atlantic salmon with lemon herb butter', 18.99, 'mains'),
      ('Chocolate Cake', 'Rich chocolate layer cake with vanilla ice cream', 6.99, 'desserts'),
      ('Craft Beer', 'Local brewery selection', 4.99, 'drinks'),
      ('House Wine', 'Red or white wine by the glass', 7.99, 'drinks')
      ON CONFLICT DO NOTHING
    `)

    // Sample inventory items
    await pool.query(`
      INSERT INTO inventory_items (name, description, category, current_stock, par_level, unit) VALUES
      ('Ground Beef', 'Fresh ground beef for burgers', 'proteins', 25, 10, 'lbs'),
      ('Romaine Lettuce', 'Fresh romaine hearts', 'produce', 12, 5, 'heads'),
      ('Salmon Fillets', 'Fresh Atlantic salmon', 'proteins', 8, 3, 'pieces'),
      ('Chocolate', 'Dark chocolate for desserts', 'dry_goods', 5, 2, 'lbs'),
      ('Beer Bottles', 'Craft beer inventory', 'beverages', 48, 12, 'bottles'),
      ('Wine Bottles', 'House wine selection', 'beverages', 24, 6, 'bottles')
      ON CONFLICT DO NOTHING
    `)

    // Sample orders
    await pool.query(`
      INSERT INTO orders (user_id, status, total_amount, items, notes) VALUES
      (5, 'preparing', 25.98, '[{"id": 1, "name": "Classic Burger", "quantity": 2, "price": 12.99}]', 'No onions please'),
      (5, 'pending', 8.99, '[{"id": 2, "name": "Caesar Salad", "quantity": 1, "price": 8.99}]', '')
      ON CONFLICT DO NOTHING
    `)

    // Sample menu item inventory relationships
    await pool.query(`
      INSERT INTO menu_item_inventory (menu_item_id, inventory_item_id, quantity_required) VALUES
      (1, 1, 0.25),  -- Classic Burger uses 0.25 lbs Ground Beef
      (1, 2, 0.1),   -- Classic Burger uses 0.1 heads Romaine Lettuce
      (2, 2, 0.5),   -- Caesar Salad uses 0.5 heads Romaine Lettuce
      (3, 3, 1),     -- Grilled Salmon uses 1 piece Salmon Fillet
      (4, 4, 0.1),   -- Chocolate Cake uses 0.1 lbs Chocolate
      (5, 5, 1),     -- Craft Beer uses 1 bottle Beer
      (6, 6, 1)      -- House Wine uses 1 bottle Wine
      ON CONFLICT DO NOTHING
    `)

    console.log('Sample data inserted successfully!')
    
  } catch (error) {
    console.error('Error inserting sample data:', error)
    throw error
  }
}

const setupDatabase = async () => {
  try {
    await createTables()
    await insertSampleData()
    console.log('Database setup completed successfully!')
    process.exit(0)
  } catch (error) {
    console.error('Database setup failed:', error)
    process.exit(1)
  }
}

// Run setup if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  setupDatabase()
}

export { createTables, insertSampleData, setupDatabase }
