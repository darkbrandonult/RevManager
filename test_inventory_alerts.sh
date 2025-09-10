#!/bin/bash

echo "🧪 Testing Inventory Low-Stock Alert System"
echo "==========================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo ""
echo -e "${YELLOW}Setting up test data...${NC}"

# Add test inventory items with different stock levels
psql $DATABASE_URL << EOF
-- Insert test inventory items
INSERT INTO inventory_items (name, description, category, current_stock, par_level, unit) VALUES
('Tomatoes', 'Fresh Roma tomatoes', 'produce', 2, 10, 'lbs'),
('Chicken Breast', 'Organic chicken breast', 'protein', 1, 5, 'lbs'),
('Flour', 'All-purpose flour', 'dry goods', 0, 20, 'lbs'),
('Olive Oil', 'Extra virgin olive oil', 'condiments', 8, 10, 'bottles'),
('Lettuce', 'Iceberg lettuce', 'produce', 15, 12, 'heads')
ON CONFLICT (name) DO UPDATE SET
  current_stock = EXCLUDED.current_stock,
  par_level = EXCLUDED.par_level;

-- Clear any existing notifications
DELETE FROM notifications WHERE type = 'inventory_alert';
EOF

echo -e "${GREEN}✅ Test data inserted${NC}"
echo ""

echo -e "${YELLOW}Testing low stock detection...${NC}"

# Test 1: Check which items should trigger alerts
echo "Items that should trigger alerts (current_stock <= par_level):"
psql $DATABASE_URL -c "SELECT name, current_stock, par_level, unit, 
  ROUND((current_stock / NULLIF(par_level, 0) * 100), 1) as stock_percentage
  FROM inventory_items 
  WHERE current_stock <= par_level AND par_level > 0
  ORDER BY stock_percentage;"

echo ""
echo -e "${YELLOW}Simulating inventory check...${NC}"

# Test the notification creation
curl -X POST http://localhost:3001/api/notifications/inventory/check \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwiZW1haWwiOiJtYW5hZ2VyQGV4YW1wbGUuY29tIiwicm9sZSI6Im1hbmFnZXIiLCJpYXQiOjE3MjUzNzQ0MDAsImV4cCI6MTcyNTQ2MDgwMH0.test" \
  2>/dev/null || echo -e "${RED}❌ Server not running or endpoint not available${NC}"

echo ""
echo -e "${YELLOW}Checking created notifications...${NC}"

# Check what notifications were created
psql $DATABASE_URL -c "SELECT 
  id,
  title,
  severity,
  metadata->>'inventory_item_name' as item_name,
  metadata->>'current_stock' as current_stock,
  metadata->>'par_level' as par_level,
  metadata->>'stock_percentage' as stock_percentage,
  created_at
FROM notifications 
WHERE type = 'inventory_alert' 
ORDER BY created_at DESC 
LIMIT 10;"

echo ""
echo -e "${YELLOW}Testing notification dismissal...${NC}"

# Get first notification ID and test dismissal
NOTIFICATION_ID=$(psql $DATABASE_URL -t -c "SELECT id FROM notifications WHERE type = 'inventory_alert' LIMIT 1;" | xargs)

if [ ! -z "$NOTIFICATION_ID" ]; then
  echo "Dismissing notification ID: $NOTIFICATION_ID"
  curl -X PUT http://localhost:3001/api/notifications/$NOTIFICATION_ID/dismiss \
    -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwiZW1haWwiOiJtYW5hZ2VyQGV4YW1wbGUuY29tIiwicm9sZSI6Im1hbmFnZXIiLCJpYXQiOjE3MjUzNzQ0MDAsImV4cCI6MTcyNTQ2MDgwMH0.test" \
    2>/dev/null || echo -e "${RED}❌ Server not running or endpoint not available${NC}"
else
  echo -e "${RED}❌ No notifications found to dismiss${NC}"
fi

echo ""
echo -e "${YELLOW}Final notification status:${NC}"

psql $DATABASE_URL -c "SELECT 
  COUNT(*) as total_notifications,
  COUNT(*) FILTER (WHERE is_dismissed = false) as active_notifications,
  COUNT(*) FILTER (WHERE severity = 'critical') as critical_count,
  COUNT(*) FILTER (WHERE severity = 'warning') as warning_count
FROM notifications 
WHERE type = 'inventory_alert';"

echo ""
echo -e "${GREEN}🎉 Inventory Alert System Test Complete!${NC}"
echo ""
echo "Expected behavior:"
echo "- Tomatoes (20% of par): Warning alert"
echo "- Chicken Breast (20% of par): Warning alert" 
echo "- Flour (0% of par): Critical alert"
echo "- Olive Oil (80% of par): No alert (above par level)"
echo "- Lettuce (125% of par): No alert (above par level)"
echo ""
echo "Check the server logs to see the inventory monitoring service in action!"
