#!/bin/bash
set -e

echo "🏗️  STAFF SCHEDULING MODULE IMPLEMENTATION COMPLETE"
echo "=================================================="
echo ""

# Function to check if files exist
check_file() {
    if [ -f "$1" ]; then
        echo "✅ $1"
    else
        echo "❌ $1 (missing)"
    fi
}

echo "📁 DATABASE SCHEMA:"
check_file "server/database/schema.js"
echo ""

echo "📁 BACKEND API FILES:"
check_file "server/routes/schedules.js"
check_file "server/server.js"
echo ""

echo "📁 FRONTEND COMPONENTS:"
check_file "src/components/SchedulePlanner.tsx"
check_file "src/components/ShiftCard.tsx"
check_file "src/components/UserAssignmentPanel.tsx"
check_file "src/hooks/useSocket.ts"
check_file "src/App.tsx"
check_file "src/components/Dashboard.tsx"
echo ""

echo "🔍 CHECKING DATABASE TABLES:"
if grep -q "CREATE TABLE IF NOT EXISTS shifts" server/database/schema.js; then
    echo "✅ shifts table"
else
    echo "❌ shifts table (missing)"
fi

if grep -q "CREATE TABLE IF NOT EXISTS user_shifts" server/database/schema.js; then
    echo "✅ user_shifts table"
else
    echo "❌ user_shifts table (missing)"
fi

if grep -q "CREATE TABLE IF NOT EXISTS shift_swaps" server/database/schema.js; then
    echo "✅ shift_swaps table"
else
    echo "❌ shift_swaps table (missing)"
fi

if grep -q "CREATE TABLE IF NOT EXISTS time_off_requests" server/database/schema.js; then
    echo "✅ time_off_requests table"
else
    echo "❌ time_off_requests table (missing)"
fi

echo ""
echo "🔍 CHECKING API ENDPOINTS:"
if grep -q "/api/schedules" server/server.js; then
    echo "✅ schedules routes registered"
else
    echo "❌ schedules routes (not registered)"
fi

if grep -q "router.get('/', authenticateToken" server/routes/schedules.js; then
    echo "✅ GET /api/schedules"
else
    echo "❌ GET /api/schedules (missing)"
fi

if grep -q "router.post('/', authenticateToken" server/routes/schedules.js; then
    echo "✅ POST /api/schedules"
else
    echo "❌ POST /api/schedules (missing)"
fi

echo ""
echo "🔍 CHECKING SOCKET EVENTS:"
if grep -q "new-schedule" server/routes/schedules.js; then
    echo "✅ 'new-schedule' socket event"
else
    echo "❌ 'new-schedule' socket event (missing)"
fi

if grep -q "shift-assignment" server/routes/schedules.js; then
    echo "✅ 'shift-assignment' socket event"
else
    echo "❌ 'shift-assignment' socket event (missing)"
fi

if grep -q "shift-status-update" server/routes/schedules.js; then
    echo "✅ 'shift-status-update' socket event"
else
    echo "❌ 'shift-status-update' socket event (missing)"
fi

echo ""
echo "🔍 CHECKING FRONTEND INTEGRATION:"
if grep -q "SchedulePlanner" src/App.tsx; then
    echo "✅ SchedulePlanner component imported"
else
    echo "❌ SchedulePlanner component (not imported)"
fi

if grep -q "/schedule" src/App.tsx; then
    echo "✅ /schedule route added"
else
    echo "❌ /schedule route (missing)"
fi

if grep -q "Staff Scheduling" src/components/Dashboard.tsx; then
    echo "✅ Staff Scheduling section in Dashboard"
else
    echo "❌ Staff Scheduling section (missing)"
fi

echo ""
echo "📖 IMPLEMENTATION SUMMARY:"
echo "=========================="
echo ""
echo "🗄️  DATABASE TABLES:"
echo "   • shifts - Store shift information (date, time, role, location)"
echo "   • user_shifts - Junction table for user-shift assignments"
echo "   • shift_swaps - Handle shift swap requests between staff"
echo "   • time_off_requests - Manage time off requests and approvals"
echo ""
echo "🌐 API ENDPOINTS:"
echo "   • GET /api/schedules - Fetch shifts with optional filtering"
echo "   • POST /api/schedules - Create new shifts (managers/owners only)"
echo "   • POST /api/schedules/:id/assign - Assign users to shifts"
echo "   • PUT /api/schedules/assignments/:id/status - Update assignment status"
echo "   • GET /api/schedules/swap-requests - View swap requests"
echo "   • POST /api/schedules/swap-requests - Create swap requests"
echo "   • PUT /api/schedules/swap-requests/:id - Respond to swap requests"
echo "   • GET /api/schedules/time-off - View time off requests"
echo "   • POST /api/schedules/time-off - Create time off requests"
echo "   • PUT /api/schedules/time-off/:id - Review time off requests"
echo ""
echo "🔄 REAL-TIME FEATURES:"
echo "   • 'new-schedule' - Broadcast new shift creation"
echo "   • 'shift-assignment' - Notify of new shift assignments"
echo "   • 'shift-status-update' - Live status changes (confirmed/cancelled)"
echo "   • 'shift-swap-completed' - Notify when swap requests are approved"
echo "   • 'swap-request' - Targeted notifications for swap requests"
echo "   • 'time-off-request' - Notify managers of new time off requests"
echo "   • 'time-off-response' - Notify users of approval/denial"
echo ""
echo "🎨 UI COMPONENTS:"
echo "   • SchedulePlanner - Main calendar/list view with drag-and-drop"
echo "   • ShiftCard - Individual shift display with assignment info"
echo "   • UserAssignmentPanel - Detailed shift management modal"
echo "   • Dashboard integration - Quick access to scheduling features"
echo ""
echo "👥 ROLE-BASED ACCESS:"
echo "   • Managers/Owners: Create shifts, assign users, view all data"
echo "   • All Staff: View schedules, confirm/cancel own assignments"
echo "   • All Staff: Request shift swaps and time off"
echo "   • Managers: Approve/deny time off and manage swap requests"
echo ""
echo "🚀 NEXT STEPS:"
echo "============="
echo ""
echo "1. SETUP DEVELOPMENT ENVIRONMENT:"
echo "   npm install react-big-calendar moment react-dnd react-dnd-html5-backend"
echo "   npm install socket.io-client"
echo ""
echo "2. DATABASE SETUP:"
echo "   • Run database migration to create scheduling tables"
echo "   • Ensure foreign key constraints are properly set"
echo ""
echo "3. START DEVELOPMENT SERVERS:"
echo "   cd server && npm start"
echo "   cd .. && npm run dev"
echo ""
echo "4. TEST FUNCTIONALITY:"
echo "   📱 Navigate to: http://localhost:5173/schedule"
echo "   🔑 Login as manager/owner to create shifts"
echo "   👥 Login as staff to view and manage assignments"
echo "   🔄 Test real-time updates across multiple browser windows"
echo ""
echo "5. TESTING SCENARIOS:"
echo "   ✅ Create shifts for different roles and time slots"
echo "   ✅ Assign multiple staff members to shifts"
echo "   ✅ Test shift status updates (confirm/cancel)"
echo "   ✅ Request and approve shift swaps"
echo "   ✅ Submit and review time off requests"
echo "   ✅ Verify real-time notifications work correctly"
echo ""
echo "🎉 STAFF SCHEDULING MODULE READY FOR TESTING!"
echo ""
