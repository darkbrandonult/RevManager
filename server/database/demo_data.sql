-- Insert demo users with hashed passwords
-- Password for all demo accounts: "demo123"
-- Hashed with bcryptjs rounds=10

INSERT INTO users (email, password_hash, first_name, last_name, role, is_active) VALUES
('owner@restaurant.com', '$2a$10$rY3Qj8qG5kN2mF7xP9oZyuJ8KcLsR4vW2hT6nE8dQ1sA3bC5fH7gI', 'John', 'Owner', 'owner', true),
('manager@restaurant.com', '$2a$10$rY3Qj8qG5kN2mF7xP9oZyuJ8KcLsR4vW2hT6nE8dQ1sA3bC5fH7gI', 'Sarah', 'Manager', 'manager', true),
('chef@restaurant.com', '$2a$10$rY3Qj8qG5kN2mF7xP9oZyuJ8KcLsR4vW2hT6nE8dQ1sA3bC5fH7gI', 'Mike', 'Chef', 'chef', true),
('server@restaurant.com', '$2a$10$rY3Qj8qG5kN2mF7xP9oZyuJ8KcLsR4vW2hT6nE8dQ1sA3bC5fH7gI', 'Lisa', 'Server', 'server', true),
('customer@restaurant.com', '$2a$10$rY3Qj8qG5kN2mF7xP9oZyuJ8KcLsR4vW2hT6nE8dQ1sA3bC5fH7gI', 'Guest', 'Customer', 'customer', true)
ON CONFLICT (email) DO NOTHING;

-- Add some sample inventory items
INSERT INTO inventory_items (name, category, current_stock, par_level, unit) VALUES
('Salmon Fillets', 'Protein', 25, 50, 'lbs'),
('Olive Oil', 'Pantry', 8, 15, 'bottles'),
('Tomatoes', 'Produce', 30, 20, 'lbs'),
('Ground Beef', 'Protein', 15, 25, 'lbs'),
('Pasta', 'Pantry', 12, 20, 'boxes')
ON CONFLICT DO NOTHING;

-- Add 86'd items tracking table if not exists
INSERT INTO eight_six_list (menu_item_id, reason, created_by, created_at) VALUES
(2, 'Out of ingredients', 3, NOW())
ON CONFLICT DO NOTHING;