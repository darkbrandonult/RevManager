import { pool } from './connection.js'

const createTables = async () => {
  try {
    // Users table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        first_name VARCHAR(100) NOT NULL,
        last_name VARCHAR(100) NOT NULL,
        role VARCHAR(20) NOT NULL CHECK (role IN ('owner', 'manager', 'chef', 'server', 'customer')),
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)

    // Menu items table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS menu_items (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        price NUMERIC(10, 2) NOT NULL,
        category VARCHAR(100) NOT NULL,
        is_available BOOLEAN DEFAULT true,
        image_url VARCHAR(500),
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
        current_stock NUMERIC(10, 2) NOT NULL DEFAULT 0,
        par_level NUMERIC(10, 2) NOT NULL DEFAULT 0,
        unit VARCHAR(50) NOT NULL DEFAULT 'each',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)

    // Orders table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'preparing', 'ready', 'completed', 'cancelled')),
        total_amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
        items JSONB NOT NULL DEFAULT '[]',
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)

    // 86 list (unavailable items) table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS eighty_six_list (
        id SERIAL PRIMARY KEY,
        menu_item_id INTEGER REFERENCES menu_items(id) ON DELETE CASCADE,
        reason TEXT,
        created_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        removed_at TIMESTAMP NULL
      )
    `)

    // Staff messages table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS staff_messages (
        id SERIAL PRIMARY KEY,
        sender_id INTEGER REFERENCES users(id),
        message TEXT NOT NULL,
        target_roles TEXT[] DEFAULT ARRAY['manager', 'chef', 'server'],
        is_urgent BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)

    console.log('Database tables created successfully')

    // Insert sample data
    await insertSampleData()

  } catch (error) {
    console.error('Error creating tables:', error)
    throw error
  }
}

const insertSampleData = async () => {
  try {
    // Insert sample users
    const userResult = await pool.query(`
      INSERT INTO users (email, password_hash, first_name, last_name, role) 
      VALUES 
        ('owner@restaurant.com', '$2b$10$K7L/8Y3QTQW/qQW8Y3QTQW', 'John', 'Owner', 'owner'),
        ('manager@restaurant.com', '$2b$10$K7L/8Y3QTQW/qQW8Y3QTQW', 'Jane', 'Manager', 'manager'),
        ('chef@restaurant.com', '$2b$10$K7L/8Y3QTQW/qQW8Y3QTQW', 'Mike', 'Chef', 'chef'),
        ('server@restaurant.com', '$2b$10$K7L/8Y3QTQW/qQW8Y3QTQW', 'Sarah', 'Server', 'server')
      ON CONFLICT (email) DO NOTHING
    `)

    // Insert sample menu items
    await pool.query(`
      INSERT INTO menu_items (name, description, price, category) 
      VALUES 
        ('Classic Burger', 'Beef patty with lettuce, tomato, and cheese', 12.99, 'mains'),
        ('Grilled Salmon', 'Fresh Atlantic salmon with herbs', 18.99, 'mains'),
        ('Caesar Salad', 'Romaine lettuce with caesar dressing', 9.99, 'starters'),
        ('Chicken Wings', 'Buffalo wings with celery and blue cheese', 11.99, 'starters'),
        ('Chocolate Cake', 'Rich chocolate cake with vanilla ice cream', 7.99, 'desserts'),
        ('Craft Beer', 'Local IPA on tap', 5.99, 'drinks'),
        ('House Wine', 'Cabernet Sauvignon by the glass', 8.99, 'drinks')
      ON CONFLICT DO NOTHING
    `)

    // Insert sample inventory items
    await pool.query(`
      INSERT INTO inventory_items (name, description, category, current_stock, par_level, unit) 
      VALUES 
        ('Ground Beef', 'Fresh ground beef for burgers', 'proteins', 50, 25, 'lbs'),
        ('Salmon Fillets', 'Fresh Atlantic salmon', 'proteins', 20, 10, 'pieces'),
        ('Romaine Lettuce', 'Fresh romaine heads', 'produce', 30, 15, 'heads'),
        ('Tomatoes', 'Fresh tomatoes', 'produce', 25, 12, 'lbs'),
        ('Cheese Slices', 'American cheese', 'dairy', 100, 50, 'slices'),
        ('Burger Buns', 'Fresh sesame buns', 'bread', 80, 40, 'pieces'),
        ('Chicken Wings', 'Fresh chicken wings', 'proteins', 35, 20, 'lbs')
      ON CONFLICT DO NOTHING
    `)

    console.log('Sample data inserted successfully')

  } catch (error) {
    console.error('Error inserting sample data:', error)
    throw error
  }
}

// Run the setup
createTables()
  .then(() => {
    console.log('Database setup completed')
    process.exit(0)
  })
  .catch((error) => {
    console.error('Database setup failed:', error)
    process.exit(1)
  })
