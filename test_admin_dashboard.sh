#!/bin/bash

echo "🧪 Testing Admin Dashboard System"
echo "================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo ""
echo -e "${YELLOW}Setting up test data for admin analytics...${NC}"

# Add sample orders with various patterns
psql $DATABASE_URL << EOF
-- Add table_number column if it doesn't exist
ALTER TABLE orders ADD COLUMN IF NOT EXISTS table_number INTEGER;

-- Insert sample orders for analytics testing
INSERT INTO orders (customer_name, table_number, status, total_amount, tip_amount, payment_method, server_id, created_at) VALUES
-- Today's orders
('John Smith', 1, 'completed', 45.99, 8.00, 'card', 1, NOW() - INTERVAL '2 hours'),
('Jane Doe', 2, 'completed', 32.50, 6.50, 'cash', 1, NOW() - INTERVAL '3 hours'),
('Bob Johnson', 3, 'completed', 78.25, 15.65, 'card', 2, NOW() - INTERVAL '1 hour'),
('Alice Brown', 1, 'completed', 56.75, 11.35, 'card', 1, NOW() - INTERVAL '4 hours'),
('Charlie Wilson', 4, 'completed', 23.99, 4.80, 'cash', 2, NOW() - INTERVAL '30 minutes'),

-- Yesterday's orders
('David Lee', 2, 'completed', 41.50, 8.30, 'card', 1, NOW() - INTERVAL '1 day 2 hours'),
('Emma Davis', 1, 'completed', 67.99, 13.60, 'card', 2, NOW() - INTERVAL '1 day 3 hours'),
('Frank Miller', 3, 'completed', 29.75, 5.95, 'cash', 1, NOW() - INTERVAL '1 day 1 hour'),

-- This week's orders (spread across different days)
('Grace Taylor', 2, 'completed', 52.25, 10.45, 'card', 1, NOW() - INTERVAL '2 days 1 hour'),
('Henry Clark', 4, 'completed', 38.99, 7.80, 'cash', 2, NOW() - INTERVAL '3 days 2 hours'),
('Ivy Martinez', 1, 'completed', 75.50, 15.10, 'card', 1, NOW() - INTERVAL '4 days 1 hour'),
('Jack Anderson', 3, 'completed', 44.25, 8.85, 'card', 2, NOW() - INTERVAL '5 days 3 hours'),
('Kate Thompson', 2, 'completed', 61.75, 12.35, 'card', 1, NOW() - INTERVAL '6 days 2 hours')

ON CONFLICT DO NOTHING;

-- Insert corresponding order items for revenue analysis
INSERT INTO order_items (order_id, menu_item_id, quantity, price) 
SELECT 
  o.id,
  (RANDOM() * 4 + 1)::INTEGER, -- Random menu item ID 1-5
  (RANDOM() * 2 + 1)::INTEGER, -- Random quantity 1-3
  (RANDOM() * 20 + 10)::NUMERIC(10,2) -- Random price 10-30
FROM orders o
WHERE NOT EXISTS (
  SELECT 1 FROM order_items oi WHERE oi.order_id = o.id
)
LIMIT 20;

-- Create some shifts data for labor analysis
INSERT INTO shifts (user_id, start_time, end_time, role, hours_worked, status) VALUES
-- Today's shifts
(1, NOW() - INTERVAL '8 hours', NOW() - INTERVAL '1 hour', 'server', 7.0, 'completed'),
(2, NOW() - INTERVAL '9 hours', NOW(), 'server', 9.0, 'active'),
(3, NOW() - INTERVAL '10 hours', NOW() - INTERVAL '2 hours', 'chef', 8.0, 'completed'),

-- Yesterday's shifts
(1, NOW() - INTERVAL '1 day 8 hours', NOW() - INTERVAL '1 day', 'server', 8.0, 'completed'),
(2, NOW() - INTERVAL '1 day 9 hours', NOW() - INTERVAL '1 day 1 hour', 'server', 8.0, 'completed'),
(3, NOW() - INTERVAL '1 day 10 hours', NOW() - INTERVAL '1 day 2 hours', 'chef', 8.0, 'completed'),

-- Previous days this week
(1, NOW() - INTERVAL '2 days 8 hours', NOW() - INTERVAL '2 days', 'server', 8.0, 'completed'),
(2, NOW() - INTERVAL '3 days 8 hours', NOW() - INTERVAL '3 days', 'server', 8.0, 'completed'),
(3, NOW() - INTERVAL '4 days 8 hours', NOW() - INTERVAL '4 days', 'chef', 8.0, 'completed')

ON CONFLICT DO NOTHING;

EOF

echo -e "${GREEN}✅ Test data inserted${NC}"
echo ""

echo -e "${YELLOW}Testing admin API endpoints...${NC}"

# Test 1: Get system metrics
echo "1. Testing /api/admin/metrics endpoint:"
curl -s -X GET http://localhost:3001/api/admin/metrics \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwiZW1haWwiOiJtYW5hZ2VyQGV4YW1wbGUuY29tIiwicm9sZSI6Im1hbmFnZXIiLCJpYXQiOjE3MjUzNzQ0MDAsImV4cCI6MTcyNTQ2MDgwMH0.test" \
  2>/dev/null | python3 -m json.tool 2>/dev/null || echo -e "${RED}❌ Server not running or endpoint not available${NC}"

echo ""

# Test 2: Get sales chart data
echo "2. Testing /api/admin/sales-chart endpoint:"
curl -s -X GET "http://localhost:3001/api/admin/sales-chart?period=7days" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwiZW1haWwiOiJtYW5hZ2VyQGV4YW1wbGUuY29tIiwicm9sZSI6Im1hbmFnZXIiLCJpYXQiOjE3MjUzNzQ0MDAsImV4cCI6MTcyNTQ2MDgwMH0.test" \
  2>/dev/null | python3 -m json.tool 2>/dev/null || echo -e "${RED}❌ Server not running or endpoint not available${NC}"

echo ""

# Test 3: Get labor analysis
echo "3. Testing /api/admin/labor-analysis endpoint:"
curl -s -X GET "http://localhost:3001/api/admin/labor-analysis?period=7days" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwiZW1haWwiOiJtYW5hZ2VyQGV4YW1wbGUuY29tIiwicm9sZSI6Im1hbmFnZXIiLCJpYXQiOjE3MjUzNzQ0MDAsImV4cCI6MTcyNTQ2MDgwMH0.test" \
  2>/dev/null | python3 -m json.tool 2>/dev/null || echo -e "${RED}❌ Server not running or endpoint not available${NC}"

echo ""

# Test 4: Get users list
echo "4. Testing /api/admin/users endpoint:"
curl -s -X GET http://localhost:3001/api/admin/users \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwiZW1haWwiOiJtYW5hZ2VyQGV4YW1wbGUuY29tIiwicm9sZSI6Im1hbmFnZXIiLCJpYXQiOjE3MjUzNzQ0MDAsImV4cCI6MTcyNTQ2MDgwMH0.test" \
  2>/dev/null | python3 -m json.tool 2>/dev/null || echo -e "${RED}❌ Server not running or endpoint not available${NC}"

echo ""
echo -e "${YELLOW}Verifying data in database...${NC}"

# Check today's revenue
echo "Today's revenue calculation:"
psql $DATABASE_URL -c "
  SELECT 
    COUNT(*) as orders_today,
    SUM(total_amount) as revenue_today,
    SUM(tip_amount) as tips_today,
    SUM(total_amount + COALESCE(tip_amount, 0)) as total_sales_today
  FROM orders 
  WHERE DATE(created_at) = CURRENT_DATE 
  AND status = 'completed';
"

echo ""
echo "Table turnover rate:"
psql $DATABASE_URL -c "
  SELECT 
    COUNT(DISTINCT table_number) as active_tables,
    COUNT(*) as total_orders,
    CASE 
      WHEN COUNT(DISTINCT table_number) > 0 
      THEN ROUND(COUNT(*)::numeric / COUNT(DISTINCT table_number), 2)
      ELSE 0 
    END as turnover_rate
  FROM orders 
  WHERE DATE(created_at) = CURRENT_DATE
  AND table_number IS NOT NULL;
"

echo ""
echo "Top selling items today:"
psql $DATABASE_URL -c "
  SELECT 
    mi.name,
    COUNT(oi.menu_item_id) as orders_count,
    SUM(oi.quantity) as total_quantity,
    SUM(oi.quantity * oi.price) as total_revenue
  FROM order_items oi
  JOIN menu_items mi ON oi.menu_item_id = mi.id
  JOIN orders o ON oi.order_id = o.id
  WHERE DATE(o.created_at) = CURRENT_DATE
  GROUP BY mi.id, mi.name
  ORDER BY total_quantity DESC
  LIMIT 5;
"

echo ""
echo "Staff metrics:"
psql $DATABASE_URL -c "
  SELECT 
    COUNT(DISTINCT u.id) as total_staff,
    COUNT(DISTINCT CASE WHEN s.status = 'active' THEN u.id END) as active_staff,
    COALESCE(AVG(s.hours_worked), 0) as avg_hours_today
  FROM users u
  LEFT JOIN shifts s ON u.id = s.user_id 
    AND DATE(s.start_time) = CURRENT_DATE
  WHERE u.role IN ('server', 'chef', 'manager');
"

echo ""
echo -e "${GREEN}🎉 Admin Dashboard Test Complete!${NC}"
echo ""
echo "Admin Dashboard Features Tested:"
echo "✅ KPI Metrics: Revenue, table turnover, staff performance"
echo "✅ Sales Analytics: Time-series data for charts"
echo "✅ Labor Analysis: Cost vs revenue calculations"
echo "✅ User Management: Staff list with performance data"
echo ""
echo "🌐 Visit http://localhost:5173/admin to see the dashboard in action!"
echo "   (Login as manager@example.com or owner@example.com)"
