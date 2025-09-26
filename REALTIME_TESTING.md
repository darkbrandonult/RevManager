# Real-Time Menu Synchronization - Test Setup

This document outlines how to test the real-time 86'd list synchronization system that has been implemented.

## Backend Components Implemented ✅

### 1. Inventory Service (`/server/services/inventoryService.js`)
- **Automatic Menu Availability Management**: Checks inventory levels and automatically 86s items when ingredients run low
- **Real-time Socket.io Updates**: Broadcasts menu changes to all connected clients
- **Order Processing Integration**: Updates availability when orders are completed
- **Inventory Restocking**: Automatically restores items when inventory is replenished

### 2. Database Schema Enhancements
- **menu_item_inventory junction table**: Links menu items to required inventory items with quantities
- **Enhanced eighty_six_list table**: Added `is_auto_generated` flag to distinguish automatic vs manual 86ing
- **Audit logging**: Tracks all inventory and menu changes

### 3. API Endpoints
- `GET/POST /api/inventory/menu-relationships`: Manage menu-inventory relationships
- `PUT /api/inventory/update-availability`: Trigger availability updates
- Enhanced inventory and menu routes with automatic availability checking

## Frontend Components Implemented ✅

### 1. Real-Time Hooks (`/src/hooks/useRealTimeMenu.ts`)
- **useRealTimeMenu**: Comprehensive hook for real-time menu updates
- **useRealTimeInventory**: Hook for inventory alerts and low-stock notifications
- **Socket.io Integration**: Listens for 'menu-update' and 'inventory-alert' events

### 2. Enhanced Components
- **PublicMenu**: Updated to show real-time availability with live status indicators
- **LiveDashboard**: Complete dashboard showing real-time statistics and recent changes

## Testing the Real-Time System

### Prerequisites
1. Install Node.js and npm
2. Install dependencies: `npm install` (root) and `cd server && npm install`
3. Set up PostgreSQL database
4. Configure environment variables

### Test Scenarios

#### Scenario 1: Automatic 86ing Due to Low Inventory
```bash
# 1. Start both frontend and backend
npm run dev          # Frontend (port 5173)
npm run server       # Backend (port 3001)

# 2. Set up menu-inventory relationships via API
POST /api/inventory/menu-relationships
{
  "menu_item_id": 1,
  "inventory_item_id": 5,
  "quantity_required": 1.0
}

# 3. Create an order that depletes inventory
POST /api/orders
{
  "items": [{"menu_item_id": 1, "quantity": 5}],
  "customer_name": "Test Order"
}

# 4. Watch real-time updates:
# - Menu item automatically becomes unavailable
# - Socket.io broadcasts 'menu-update' event
# - Frontend instantly updates without refresh
# - Dashboard shows new 86'd item with "🤖 Auto-generated" tag
```

#### Scenario 2: Inventory Replenishment and Restoration
```bash
# 1. Add inventory to restore item
POST /api/inventory
{
  "item_name": "Chicken Breast",
  "quantity": 10
}

# 2. Watch real-time restoration:
# - Item automatically becomes available
# - 86'd entry is removed
# - All clients receive instant update
# - Dashboard shows restoration in recent changes
```

#### Scenario 3: Real-Time Dashboard Monitoring
```bash
# Open multiple browser windows:
# - Window 1: Public menu (localhost:5173)
# - Window 2: Staff dashboard (localhost:5173/dashboard)
# - Window 3: Live dashboard (localhost:5173/dashboard/live)

# Make changes and watch all windows update simultaneously:
# ✅ Menu availability changes propagate instantly
# ✅ 86'd list updates in real-time
# ✅ Statistics update automatically
# ✅ Recent changes timeline shows live activity
```

## Socket.io Events

### Outgoing Events (Server → Client)
```javascript
// Menu item becomes unavailable
socket.emit('menu-update', {
  type: 'item-86ed',
  menuItemId: 1,
  menu: [...],           // Complete updated menu
  eightySixList: [...],  // Updated 86'd list
  timestamp: '2024-01-15T10:30:00Z'
})

// Menu item restored
socket.emit('menu-update', {
  type: 'item-restored',
  menuItemId: 1,
  menu: [...],
  eightySixList: [...],
  timestamp: '2024-01-15T11:00:00Z'
})

// Bulk inventory update
socket.emit('menu-bulk-update', {
  type: 'bulk-update',
  menu: [...],
  eightySixList: [...],
  summary: {
    total: 25,
    available: 20,
    unavailable: 5,
    changed: [...]
  },
  timestamp: '2024-01-15T11:15:00Z'
})

// Inventory alerts
socket.emit('inventory-alert', {
  type: 'low-stock',
  item: 'Chicken Breast',
  currentQuantity: 2,
  minimumQuantity: 5,
  timestamp: '2024-01-15T11:20:00Z'
})
```

## Real-Time Features in Action

### 🔄 Public Menu Experience
- **Live Availability**: Menu shows real-time availability with pulsing indicators
- **Instant Updates**: No page refresh needed - changes appear immediately
- **Visual Feedback**: Unavailable items dim and show reasons
- **Status Indicators**: Green/red dots show current availability

### 📊 Dashboard Experience
- **Live Statistics**: Real-time counts of available/unavailable items
- **Recent Changes**: Timeline showing exactly what changed and when
- **Auto vs Manual**: Clear distinction between automatic and manual 86ing
- **Inventory Alerts**: Immediate notifications for low stock situations

### 🤖 Automatic Intelligence
- **Smart 86ing**: System automatically detects insufficient inventory
- **Order Integration**: Availability updates as orders deplete stock
- **Restoration Logic**: Items automatically become available when restocked
- **Audit Trail**: Complete history of who/what made changes

## Architecture Benefits

### For Customers
- Always see accurate menu availability
- No disappointment from ordering unavailable items
- Real-time information without app downloads

### For Staff
- Immediate visibility into inventory status
- Automatic handling reduces manual work
- Clear alerts for actions needed
- Historical tracking for analysis

### For Management
- Real-time operational oversight
- Automated inventory-menu coordination
- Detailed audit logs for accountability
- Reduced food waste through better tracking

## Next Steps for Full Implementation

1. **Install Dependencies**: Set up Node.js environment
2. **Database Setup**: Create PostgreSQL database with schema
3. **Environment Configuration**: Set up .env files
4. **Menu-Inventory Mapping**: Define relationships between menu items and ingredients
5. **Testing**: Run through all test scenarios above
6. **Production Deployment**: Deploy with proper Socket.io scaling

The foundation is complete - the system is ready for real-world testing and deployment!
