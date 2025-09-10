# Inventory Low-Stock Alert System

## Overview

The Inventory Low-Stock Alert System is a comprehensive real-time monitoring solution that automatically detects when inventory items fall to or below their par levels and sends notifications to appropriate staff members.

## Features

### 🔄 Automated Monitoring
- **Background Service**: Continuously monitors inventory levels every 5 minutes
- **Smart Detection**: Identifies items where `current_stock <= par_level`
- **Duplicate Prevention**: Prevents spam by checking for recent alerts (1-hour cooldown)
- **Severity Calculation**: Automatically determines alert severity based on stock percentage

### 📊 Alert Severity Levels
- **Critical** (🚨): Stock ≤ 25% of par level
- **Warning** (⚠️): Stock ≤ 50% of par level  
- **Info** (ℹ️): Stock > 50% but ≤ 100% of par level

### 🎯 Role-Based Targeting
- **Default Recipients**: Managers, Chefs, Owners
- **Customizable**: Can be configured per notification type
- **Real-time Delivery**: Instant notifications via Socket.io

### 💾 Persistent Storage
- **Database Tracking**: All notifications stored in `notifications` table
- **Metadata Rich**: Includes item details, stock levels, and percentages
- **Audit Trail**: Tracks who dismissed notifications and when

## System Components

### Backend Services

#### 1. InventoryMonitorService.js
```javascript
// Key methods:
- start()                    // Begin monitoring
- stop()                     // Stop monitoring  
- checkLowStock()           // Manual stock check
- processLowStockItem()     // Handle individual alerts
- updateCheckInterval()     // Modify check frequency
```

#### 2. Notifications API (/api/notifications)
```javascript
// Endpoints:
GET    /                    // Get user's notifications
GET    /counts             // Get notification counts by severity
PUT    /:id/dismiss        // Dismiss specific notification
PUT    /dismiss-all        // Dismiss all notifications
POST   /                   // Create manual notification
GET    /inventory          // Get inventory-specific alerts
POST   /inventory/check    // Trigger manual inventory check
```

### Frontend Components

#### 1. NotificationCenter.tsx
- **Real-time Updates**: Socket.io integration for live notifications
- **Role-based Display**: Shows only relevant notifications
- **Dismissal Controls**: For authorized roles (manager, chef, owner)
- **Filtering Options**: By type, severity, and dismissed status
- **Interactive UI**: Bell icon with notification count badge

#### 2. Dashboard Integration
- **Header Placement**: Prominent notification bell in dashboard header
- **Visual Indicators**: Color-coded severity levels
- **Quick Actions**: Dismiss individual or all notifications

### Database Schema

#### notifications Table
```sql
CREATE TABLE notifications (
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
);
```

## Configuration

### Check Interval
The monitoring service checks every **5 minutes** by default. This can be modified:

```javascript
// Update to check every 10 minutes
inventoryMonitor.updateCheckInterval(10)
```

### Alert Cooldown
Duplicate alerts are prevented for **1 hour** after the initial alert. This prevents notification spam for the same item.

### Target Roles
Default notification recipients can be customized in the service:

```javascript
target_roles: ['manager', 'chef', 'owner']
```

## Real-time Features

### Socket.io Events

#### Emitted Events
- `inventory-alert`: New low stock alert
- `inventory-summary`: Summary of all low stock items
- `notification-dismissed`: When notification is dismissed
- `notifications-dismissed-all`: When all notifications dismissed

#### Event Payload Example
```json
{
  "notification": {
    "id": 123,
    "type": "inventory_alert",
    "title": "Low Stock Alert: Tomatoes",
    "message": "Tomatoes is running low. Current stock: 2 lbs, Par level: 10 lbs",
    "severity": "warning",
    "metadata": {
      "inventory_item_id": 45,
      "current_stock": 2,
      "par_level": 10,
      "stock_percentage": 20
    }
  },
  "item": {
    "id": 45,
    "name": "Tomatoes",
    "current_stock": 2,
    "par_level": 10,
    "unit": "lbs",
    "category": "produce"
  }
}
```

## Usage Examples

### Start Monitoring (Server)
```javascript
import InventoryMonitorService from './services/InventoryMonitorService.js'

const inventoryMonitor = new InventoryMonitorService(io)
inventoryMonitor.start()
```

### Manual Check (API)
```bash
curl -X POST http://localhost:3001/api/notifications/inventory/check \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Dismiss Notification (Frontend)
```javascript
const dismissNotification = async (notificationId) => {
  const response = await fetch(`/api/notifications/${notificationId}/dismiss`, {
    method: 'PUT',
    headers: { 'Authorization': `Bearer ${token}` }
  })
}
```

## Testing

### Test Script
Run the included test script to verify the system:

```bash
./test_inventory_alerts.sh
```

This script:
1. Creates test inventory items with various stock levels
2. Triggers manual inventory check
3. Verifies notifications are created correctly
4. Tests notification dismissal
5. Shows final system status

### Manual Testing
1. Set inventory items with `current_stock <= par_level`
2. Wait 5 minutes or trigger manual check
3. Check notifications appear in dashboard
4. Verify real-time updates via Socket.io
5. Test dismissal functionality

## Security & Permissions

### Access Control
- **View Notifications**: All authenticated users (filtered by role)
- **Dismiss Notifications**: Manager, Chef, Owner roles only
- **Create Manual Notifications**: Manager, Owner roles only
- **Trigger Manual Checks**: Manager, Owner roles only

### Data Protection
- Users only see notifications targeted to their role
- Notification metadata includes item details for context
- Audit trail tracks all dismissal actions

## Performance Considerations

### Optimization Features
- **Duplicate Prevention**: 1-hour cooldown prevents spam
- **Batch Processing**: Efficient database queries
- **Smart Expiration**: Notifications auto-expire after 24 hours
- **Targeted Delivery**: Role-based notification delivery

### Monitoring
- Server logs all monitoring activities
- Database queries optimized for performance
- Real-time events minimize polling

## Troubleshooting

### Common Issues

1. **No Alerts Generated**
   - Check if items have `par_level > 0`
   - Verify `current_stock <= par_level`
   - Check server logs for errors

2. **Notifications Not Appearing**
   - Verify user role matches `target_roles`
   - Check Socket.io connection
   - Confirm notifications not expired

3. **Cannot Dismiss Notifications**
   - Verify user has required role (manager/chef/owner)
   - Check authentication token validity
   - Ensure notification exists and not already dismissed

### Debug Commands

```sql
-- Check low stock items
SELECT name, current_stock, par_level, 
  ROUND((current_stock / NULLIF(par_level, 0) * 100), 1) as percentage
FROM inventory_items 
WHERE current_stock <= par_level AND par_level > 0;

-- Check recent notifications
SELECT * FROM notifications 
WHERE type = 'inventory_alert' 
ORDER BY created_at DESC LIMIT 10;

-- Check notification counts by severity
SELECT severity, COUNT(*) 
FROM notifications 
WHERE type = 'inventory_alert' AND is_dismissed = false 
GROUP BY severity;
```

## Future Enhancements

- **Email Notifications**: Add email alerts for critical items
- **SMS Integration**: Text message alerts for urgent situations
- **Predictive Analytics**: Forecast when items will reach low stock
- **Supplier Integration**: Automatic reorder suggestions
- **Mobile Push Notifications**: Native mobile app alerts
- **Custom Thresholds**: Per-item custom alert levels

## Integration Notes

The inventory alert system integrates seamlessly with:
- **Existing Inventory Management**: Uses current `inventory_items` table
- **User Authentication**: Leverages existing JWT auth system
- **Role-based Access Control**: Uses existing RBAC middleware
- **Real-time Features**: Built on existing Socket.io infrastructure
- **Dashboard UI**: Integrated into existing dashboard components
