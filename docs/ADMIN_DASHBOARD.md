# Admin Dashboard

## Overview

The Admin Dashboard is a comprehensive analytics and management interface exclusive to owners and managers. It provides real-time KPIs, interactive charts, and complete user management capabilities for restaurant operations.

## Features

### 📊 Key Performance Indicators (KPIs)

#### Revenue Metrics
- **Today's Revenue**: Total sales including tips with percentage change vs daily average
- **Revenue Breakdown**: Separate tracking of base revenue and tips
- **Performance Indicators**: Visual change indicators with trend arrows

#### Operational Metrics
- **Table Turnover Rate**: Orders per table ratio for efficiency analysis
- **Active vs Total Tables**: Real-time table utilization tracking
- **Staff Performance**: Active staff count, average hours, and tip distribution

#### Alert Summary
- **Critical Alerts**: Inventory and operational alerts requiring immediate attention
- **Warning Counts**: System notifications by severity level
- **Alert Distribution**: Breakdown of alert types and priorities

### 📈 Interactive Analytics

#### Sales Over Time Charts
- **Multiple Time Periods**: 24 hours, 7 days, or 30 days view
- **Revenue Breakdown**: Area charts showing revenue, tips, and total sales
- **Order Volume**: Visual representation of order patterns and peaks
- **Real-time Updates**: Automatic refresh when new orders are completed

#### Labor Cost Analysis
- **Cost vs Revenue**: Dual-axis charts comparing labor costs to revenue
- **Labor Cost Percentage**: Trend analysis of labor efficiency
- **Hours Tracking**: Visual representation of total staff hours worked
- **Performance Ratios**: Key metrics for operational efficiency

#### Top Selling Items
- **Daily Rankings**: Most popular menu items by quantity sold
- **Revenue Impact**: Total revenue contribution per item
- **Order Frequency**: Number of times each item was ordered
- **Performance Metrics**: Sales data with pricing information

### 👥 User Management System

#### Staff Overview
- **Complete User List**: All staff members with role and status information
- **Performance Metrics**: Shift count, tips earned, and activity tracking
- **Role Management**: Easy role assignment and modification
- **Status Control**: Activate/deactivate user accounts

#### User Creation & Editing
- **New User Registration**: Complete user creation with email validation
- **Role Assignment**: Granular role control (server, chef, manager, owner)
- **Password Management**: Secure password creation and updates
- **Profile Management**: Full name and contact information editing

## System Architecture

### Backend API Endpoints

#### Admin Metrics (`/api/admin/metrics`)
```javascript
GET /api/admin/metrics
// Returns comprehensive KPI data
{
  revenue: {
    today: number,
    weekTotal: number,
    changePercent: number
  },
  tableTurnover: {
    activeTables: number,
    totalOrders: number,
    turnoverRate: number
  },
  topItems: [...],
  staff: {...},
  alerts: {...}
}
```

#### Sales Analytics (`/api/admin/sales-chart`)
```javascript
GET /api/admin/sales-chart?period=7days
// Returns time-series sales data
[
  {
    period: "2024-01-15",
    ordersCount: 45,
    revenue: 1250.50,
    tips: 225.00,
    totalSales: 1475.50
  },
  ...
]
```

#### Labor Analysis (`/api/admin/labor-analysis`)
```javascript
GET /api/admin/labor-analysis?period=7days
// Returns labor cost vs revenue data
[
  {
    date: "2024-01-15",
    totalHours: 64.5,
    laborCost: 967.50,
    revenue: 1475.50,
    laborCostPercentage: 65.6
  },
  ...
]
```

#### User Management (`/api/admin/users`)
```javascript
GET    /api/admin/users        // List all staff
POST   /api/admin/users        // Create new user
PUT    /api/admin/users/:id    // Update user
DELETE /api/admin/users/:id    // Deactivate user
```

### Frontend Components

#### AdminDashboard.tsx
- **Tabbed Interface**: Overview, Analytics, and User Management tabs
- **Responsive Design**: Mobile-friendly charts and tables
- **Real-time Updates**: Socket.io integration for live data
- **Interactive Charts**: Using Recharts library for rich visualizations

#### Chart Components
- **LineChart**: Sales trends over time
- **AreaChart**: Revenue breakdown with stacked areas
- **BarChart**: Labor cost analysis with dual axes
- **PieChart**: Ready for category breakdowns (future enhancement)

## Data Calculations

### Revenue Metrics
```sql
-- Today's revenue with percentage change
WITH today_revenue AS (
  SELECT SUM(total_amount + COALESCE(tip_amount, 0)) as today_total
  FROM orders 
  WHERE DATE(created_at) = CURRENT_DATE 
  AND status = 'completed'
),
week_revenue AS (
  SELECT AVG(daily_total) as daily_avg
  FROM (
    SELECT SUM(total_amount + COALESCE(tip_amount, 0)) as daily_total
    FROM orders 
    WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
    AND status = 'completed'
    GROUP BY DATE(created_at)
  ) daily_sales
)
SELECT 
  today_total,
  ROUND(((today_total - daily_avg) / daily_avg) * 100, 2) as change_percent
FROM today_revenue, week_revenue
```

### Table Turnover Rate
```sql
-- Orders per table calculation
SELECT 
  COUNT(DISTINCT table_number) as active_tables,
  COUNT(*) as total_orders,
  ROUND(COUNT(*)::numeric / COUNT(DISTINCT table_number), 2) as turnover_rate
FROM orders 
WHERE DATE(created_at) = CURRENT_DATE
AND table_number IS NOT NULL
```

### Labor Cost Analysis
```sql
-- Estimated labor cost vs revenue
SELECT 
  SUM(hours_worked) * 15 as estimated_labor_cost, -- $15/hour average
  (SELECT SUM(total_amount) FROM orders WHERE DATE(created_at) = CURRENT_DATE) as revenue,
  ROUND((SUM(hours_worked) * 15 / revenue) * 100, 2) as labor_cost_percentage
FROM shifts 
WHERE DATE(start_time) = CURRENT_DATE
```

## Security & Permissions

### Access Control
- **Owner & Manager Only**: Exclusive access to admin dashboard
- **Role Verification**: Server-side authorization on all endpoints
- **Self-Protection**: Users cannot delete their own accounts
- **Audit Trail**: All user management actions logged with timestamps

### Data Protection
- **Password Hashing**: Secure bcrypt hashing for new passwords
- **Token Authentication**: JWT-based authentication for all requests
- **Input Validation**: Comprehensive validation on all user inputs
- **SQL Injection Prevention**: Parameterized queries throughout

## Real-time Features

### Socket.io Integration
- **Live KPI Updates**: Metrics refresh when orders are completed
- **User Management Events**: Real-time updates when users are created/modified
- **Chart Data Refresh**: Automatic chart updates without page reload
- **Notification Integration**: Alert counts update in real-time

### Event Handling
```javascript
// Real-time event listeners
socket.on('order-completed', handleOrderUpdate)
socket.on('user-created', handleUserUpdate)
socket.on('user-updated', handleUserUpdate)
socket.on('user-deleted', handleUserUpdate)
```

## Performance Optimization

### Database Efficiency
- **Optimized Queries**: Efficient aggregation queries for large datasets
- **Date Indexing**: Proper indexing on timestamp columns for fast filtering
- **Calculated Fields**: Pre-calculated metrics to reduce computation
- **Connection Pooling**: Efficient database connection management

### Frontend Optimization
- **Lazy Loading**: Charts load only when tabs are activated
- **Data Caching**: Minimal API calls with intelligent refresh triggers
- **Responsive Charts**: Efficient rendering with ResponsiveContainer
- **State Management**: Optimized React state updates

## Usage Guide

### Accessing the Dashboard
1. Login as a user with 'manager' or 'owner' role
2. Navigate to `/admin` or click "Admin Dashboard" from main dashboard
3. Use tab navigation to switch between views

### Overview Tab
- View today's key metrics at a glance
- Monitor top-selling items and revenue trends
- Check staff performance and alert summaries
- Quick access to critical operational data

### Analytics Tab
- Select time period (24 hours, 7 days, 30 days)
- Analyze sales trends with interactive charts
- Compare labor costs to revenue over time
- Identify peak hours and performance patterns

### Users Tab
- View all staff members with performance metrics
- Create new user accounts with role assignment
- Edit existing user information and roles
- Deactivate users while preserving historical data

## Testing

### Test Script
Run the comprehensive test script:
```bash
./test_admin_dashboard.sh
```

This script:
1. Creates sample orders and shifts data
2. Tests all API endpoints with authentication
3. Verifies database calculations
4. Shows expected output for each metric

### Manual Testing Scenarios

#### KPI Verification
1. Create test orders with various amounts and tips
2. Assign orders to different tables and servers
3. Complete orders and verify revenue calculations
4. Check table turnover rate accuracy

#### Chart Functionality
1. Generate orders across different time periods
2. Verify chart data matches database calculations
3. Test different time period selections
4. Ensure real-time updates work correctly

#### User Management
1. Create new users with different roles
2. Test role-based access restrictions
3. Verify user editing and deactivation
4. Check audit trail and activity tracking

## Integration Points

### Existing Systems
- **Order Management**: Pulls completed order data for revenue metrics
- **Staff Scheduling**: Uses shift data for labor cost analysis
- **Inventory Alerts**: Displays alert counts and critical notifications
- **User Authentication**: Leverages existing JWT and RBAC systems

### Real-time Data Sources
- **Live Orders**: Real-time order completion updates KPIs
- **Staff Activity**: Active shift tracking for current metrics
- **Inventory Status**: Low-stock alerts feed into dashboard summary
- **User Actions**: Live user management updates across all sessions

## Future Enhancements

### Advanced Analytics
- **Predictive Analytics**: Forecast sales and staffing needs
- **Customer Analytics**: Track customer behavior and preferences
- **Profit Margin Analysis**: Detailed cost breakdown by menu item
- **Seasonal Trends**: Year-over-year comparison and trends

### Enhanced Visualizations
- **Geographic Data**: Location-based analytics for multi-location restaurants
- **Heatmaps**: Peak hour and table utilization heatmaps
- **Comparison Charts**: Side-by-side period comparisons
- **Export Functionality**: PDF and Excel report generation

### Management Features
- **Goal Setting**: Revenue and performance targets
- **Automated Reports**: Scheduled email reports for owners
- **Mobile Dashboard**: Dedicated mobile interface for managers
- **Integration APIs**: Connect with POS systems and accounting software

## Troubleshooting

### Common Issues

#### No Data Showing
- Verify user has 'manager' or 'owner' role
- Check that orders exist with 'completed' status
- Ensure shifts have been recorded for labor analysis
- Confirm date ranges include relevant data

#### Chart Loading Issues
- Check browser console for JavaScript errors
- Verify recharts library is properly installed
- Ensure API endpoints are responding correctly
- Check network tab for failed requests

#### Permission Errors
- Verify JWT token is valid and not expired
- Check user role in database matches requirements
- Ensure authorization headers are being sent
- Confirm server-side role checking is working

### Debug Commands

```sql
-- Check recent orders for revenue calculation
SELECT * FROM orders 
WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
ORDER BY created_at DESC;

-- Verify staff shifts for labor analysis
SELECT u.first_name, u.last_name, s.* 
FROM shifts s
JOIN users u ON s.user_id = u.id
WHERE s.start_time >= CURRENT_DATE - INTERVAL '7 days';

-- Check user roles and permissions
SELECT id, email, first_name, last_name, role, is_active 
FROM users 
WHERE role IN ('manager', 'owner');
```

The Admin Dashboard provides restaurant owners and managers with comprehensive insights into their operations, enabling data-driven decisions and efficient staff management through an intuitive, real-time interface.
