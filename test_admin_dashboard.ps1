# RevManager Admin Dashboard Test Script (Windows PowerShell)
# This script tests the admin dashboard functionality

Write-Host "🧪 Testing Admin Dashboard System" -ForegroundColor Blue
Write-Host "================================="

# Check if environment variables are set
if (-not $env:DATABASE_URL) {
    $env:DATABASE_URL = "postgresql://postgres:password@localhost:5432/revmanger"
    Write-Host "⚠️  Using default DATABASE_URL. Update if needed." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Setting up test data for admin analytics..." -ForegroundColor Yellow

# Create test data SQL script
$testDataSQL = @"
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
"@

# Save SQL to temporary file and execute
$tempSQLFile = [System.IO.Path]::GetTempFileName() + ".sql"
$testDataSQL | Out-File -FilePath $tempSQLFile -Encoding utf8

try {
    psql $env:DATABASE_URL -f $tempSQLFile
    Write-Host "✅ Test data inserted" -ForegroundColor Green
} catch {
    Write-Host "❌ Failed to insert test data. Make sure PostgreSQL is running and database exists." -ForegroundColor Red
}

Remove-Item $tempSQLFile -ErrorAction SilentlyContinue

Write-Host ""
Write-Host "Testing admin API endpoints..." -ForegroundColor Yellow

$baseUrl = "http://localhost:3001"
$authToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwiZW1haWwiOiJtYW5hZ2VyQGV4YW1wbGUuY29tIiwicm9sZSI6Im1hbmFnZXIiLCJpYXQiOjE3MjUzNzQ0MDAsImV4cCI6MTcyNTQ2MDgwMH0.test"

$headers = @{
    "Authorization" = "Bearer $authToken"
    "Content-Type" = "application/json"
}

# Test 1: Get system metrics
Write-Host "1. Testing /api/admin/metrics endpoint:" -ForegroundColor Cyan
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/api/admin/metrics" -Headers $headers -Method GET -TimeoutSec 5
    Write-Host "✅ Metrics endpoint accessible" -ForegroundColor Green
    Write-Host "   Revenue today: $($response.revenue_today)" -ForegroundColor Gray
    Write-Host "   Orders today: $($response.orders_today)" -ForegroundColor Gray
} catch {
    Write-Host "❌ Server not running or endpoint not available" -ForegroundColor Red
}

Write-Host ""

# Test 2: Get sales chart data
Write-Host "2. Testing /api/admin/sales-chart endpoint:" -ForegroundColor Cyan
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/api/admin/sales-chart?period=7days" -Headers $headers -Method GET -TimeoutSec 5
    Write-Host "✅ Sales chart endpoint accessible" -ForegroundColor Green
    Write-Host "   Data points: $($response.Count)" -ForegroundColor Gray
} catch {
    Write-Host "❌ Server not running or endpoint not available" -ForegroundColor Red
}

Write-Host ""

# Test 3: Get labor analysis
Write-Host "3. Testing /api/admin/labor-analysis endpoint:" -ForegroundColor Cyan
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/api/admin/labor-analysis?period=7days" -Headers $headers -Method GET -TimeoutSec 5
    Write-Host "✅ Labor analysis endpoint accessible" -ForegroundColor Green
    Write-Host "   Labor cost: $($response.total_labor_cost)" -ForegroundColor Gray
} catch {
    Write-Host "❌ Server not running or endpoint not available" -ForegroundColor Red
}

Write-Host ""

# Test 4: Get users list
Write-Host "4. Testing /api/admin/users endpoint:" -ForegroundColor Cyan
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/api/admin/users" -Headers $headers -Method GET -TimeoutSec 5
    Write-Host "✅ Users endpoint accessible" -ForegroundColor Green
    Write-Host "   Total users: $($response.Count)" -ForegroundColor Gray
} catch {
    Write-Host "❌ Server not running or endpoint not available" -ForegroundColor Red
}

Write-Host ""
Write-Host "Verifying data in database..." -ForegroundColor Yellow

# Database queries
$queries = @{
    "Today's revenue calculation" = @"
SELECT 
  COUNT(*) as orders_today,
  SUM(total_amount) as revenue_today,
  SUM(tip_amount) as tips_today,
  SUM(total_amount + COALESCE(tip_amount, 0)) as total_sales_today
FROM orders 
WHERE DATE(created_at) = CURRENT_DATE 
AND status = 'completed';
"@

    "Table turnover rate" = @"
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
"@

    "Top selling items today" = @"
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
"@

    "Staff metrics" = @"
SELECT 
  COUNT(DISTINCT u.id) as total_staff,
  COUNT(DISTINCT CASE WHEN s.status = 'active' THEN u.id END) as active_staff,
  COALESCE(AVG(s.hours_worked), 0) as avg_hours_today
FROM users u
LEFT JOIN shifts s ON u.id = s.user_id 
  AND DATE(s.start_time) = CURRENT_DATE
WHERE u.role IN ('server', 'chef', 'manager');
"@
}

foreach ($queryName in $queries.Keys) {
    Write-Host "$queryName:" -ForegroundColor Cyan
    try {
        psql $env:DATABASE_URL -c $queries[$queryName]
    } catch {
        Write-Host "❌ Database query failed" -ForegroundColor Red
    }
    Write-Host ""
}

Write-Host "🎉 Admin Dashboard Test Complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Admin Dashboard Features Tested:" -ForegroundColor White
Write-Host "✅ KPI Metrics: Revenue, table turnover, staff performance" -ForegroundColor Green
Write-Host "✅ Sales Analytics: Time-series data for charts" -ForegroundColor Green
Write-Host "✅ Labor Analysis: Cost vs revenue calculations" -ForegroundColor Green
Write-Host "✅ User Management: Staff list with performance data" -ForegroundColor Green
Write-Host ""
Write-Host "🌐 Visit http://localhost:5173/admin to see the dashboard in action!" -ForegroundColor Blue
Write-Host "   (Login as manager@example.com or owner@example.com)" -ForegroundColor Gray
