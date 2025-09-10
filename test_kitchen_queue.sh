#!/bin/bash

# Kitchen Order Queue Testing Script
# Tests the real-time functionality of the kitchen order system

set -e

BASE_URL="http://localhost:3001"
FRONTEND_URL="http://localhost:5173"

echo "🍳 Kitchen Order Queue Testing"
echo "=============================="

# Check if servers are running
echo ""
echo "🔍 Checking server status..."

if ! curl -s "$BASE_URL/api/health" > /dev/null 2>&1; then
    echo "❌ Backend server not running at $BASE_URL"
    echo "   Start with: cd server && npm run dev"
    exit 1
fi

if ! curl -s "$FRONTEND_URL" > /dev/null 2>&1; then
    echo "❌ Frontend server not running at $FRONTEND_URL"
    echo "   Start with: npm run dev"
    exit 1
fi

echo "✅ Backend server running at $BASE_URL"
echo "✅ Frontend server running at $FRONTEND_URL"

# Test kitchen endpoints
echo ""
echo "🧪 Testing Kitchen API Endpoints..."

echo "1. Testing kitchen orders endpoint..."
curl -s "$BASE_URL/api/orders/kitchen" -H "Authorization: Bearer test-token" | jq '.[0:2]' 2>/dev/null || echo "   ⚠️  No orders or authentication required"

echo ""
echo "2. Testing kitchen summary endpoint..."
curl -s "$BASE_URL/api/orders/kitchen/summary" -H "Authorization: Bearer test-token" | jq . 2>/dev/null || echo "   ⚠️  Summary unavailable or authentication required"

echo ""
echo "3. Testing menu endpoint..."
curl -s "$BASE_URL/api/menu" | jq '.[0:2]' 2>/dev/null || echo "   ⚠️  Menu endpoint unavailable"

# Instructions for manual testing
echo ""
echo "🎯 Manual Testing Instructions:"
echo "==============================="
echo ""
echo "1. KITCHEN QUEUE TESTING:"
echo "   📱 Open: $FRONTEND_URL/kitchen/queue"
echo "   🔑 Login as: chef, cook, manager, or owner"
echo "   ✅ Verify: Three columns (Pending, Preparing, Ready)"
echo "   ✅ Test: Status update buttons work"
echo "   ✅ Check: Real-time updates without refresh"
echo ""
echo "2. KITCHEN DASHBOARD TESTING:"
echo "   📱 Open: $FRONTEND_URL/kitchen/dashboard"
echo "   ✅ Verify: Summary statistics display"
echo "   ✅ Check: Real-time activity feed"
echo "   ✅ Test: Quick action buttons"
echo ""
echo "3. REAL-TIME SYNCHRONIZATION:"
echo "   📱 Open multiple browser windows:"
echo "      - Window 1: $FRONTEND_URL/kitchen/queue"
echo "      - Window 2: $FRONTEND_URL/kitchen/dashboard" 
echo "      - Window 3: $FRONTEND_URL (public menu)"
echo "   ✅ Create new order via API"
echo "   ✅ Update order status in kitchen queue"
echo "   ✅ Verify instant updates in all windows"
echo ""
echo "4. API TESTING (with authentication):"
echo ""
echo "   Create New Order:"
echo "   curl -X POST $BASE_URL/api/orders \\"
echo "     -H 'Content-Type: application/json' \\"
echo "     -H 'Authorization: Bearer YOUR_JWT_TOKEN' \\"
echo "     -d '{"
echo "       \"customer_name\": \"Test Customer\","
echo "       \"total_amount\": 25.50,"
echo "       \"items\": ["
echo "         {\"menu_item_id\": 1, \"quantity\": 2, \"price\": 12.75}"
echo "       ]"
echo "     }'"
echo ""
echo "   Update Order Status:"
echo "   curl -X PUT $BASE_URL/api/orders/ORDER_ID/status \\"
echo "     -H 'Content-Type: application/json' \\"
echo "     -H 'Authorization: Bearer YOUR_JWT_TOKEN' \\"
echo "     -d '{\"status\": \"preparing\", \"estimated_completion\": \"2024-01-15T15:30:00Z\"}'"
echo ""
echo "5. SOCKET.IO EVENTS TO WATCH:"
echo "   🔊 'new-order' - New order created"
echo "   🔊 'order-status-update' - Status changed"  
echo "   🔊 'order-cancelled' - Order cancelled"
echo ""
echo "📋 Test Checklist:"
echo "=================="
echo "□ Kitchen queue displays orders correctly"
echo "□ Status update buttons work and show loading states"
echo "□ Real-time updates appear without page refresh"
echo "□ Multi-window synchronization works"
echo "□ Priority indicators show for old orders"
echo "□ Estimated completion times are tracked"
echo "□ Kitchen dashboard shows live statistics"
echo "□ Activity feed updates in real-time"
echo "□ Socket.io events broadcast correctly"
echo "□ Order creation triggers 'new-order' event"
echo "□ Status updates trigger 'order-status-update' event"
echo "□ Order cancellation triggers 'order-cancelled' event"
echo ""
echo "🚀 For full testing, ensure:"
echo "   1. PostgreSQL database is running"
echo "   2. Users with 'chef'/'cook' roles exist"
echo "   3. Menu items are populated in database"
echo "   4. JWT authentication is configured"
echo ""
echo "Happy testing! 🎉"
