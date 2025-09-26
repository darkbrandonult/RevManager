# RevManger - Real-Time Restaurant Management PWA

A comprehensive Progressive Web Application for restaurant management with **real-time 86'd list synchronization** and automatic inventory-based menu availability management.

## 🚀 Key Features

### 🔄 Real-Time Synchronization
- **Live Menu Updates**: Menu availability changes instantly across all devices
- **Automatic 86ing**: Items automatically become unavailable when inventory runs low
- **Socket.io Integration**: Real-time updates without page refreshes
- **Multi-Device Sync**: Changes on one device appear immediately on all others

### 🤖 Intelligent Automation
- **Inventory-Menu Integration**: Menu items linked to required ingredients
- **Auto-Restoration**: Items automatically become available when restocked
- **Smart Order Processing**: Inventory updates automatically as orders are completed
- **Predictive Alerts**: Low stock warnings before items need to be 86'd

### 👥 Role-Based Access Control
- **Customer**: View live menu with real-time availability
- **Server**: Access live menu, order management, basic inventory viewing
- **Chef**: Full kitchen management, inventory updates, 86 list control
- **Manager**: All chef permissions plus menu management and reports
- **Owner**: Complete system access with audit logs and analytics

### 📱 Progressive Web App
- **No App Store Required**: Runs in any modern browser
- **Mobile Optimized**: Touch-friendly interface for tablets and phones
- **Offline Capable**: Critical functions work without internet
- **Push Notifications**: Real-time alerts for inventory and orders

### 📊 Advanced Management Systems
- **Staff Scheduling**: Smart shift planning with availability management
- **Digital Tip Pooling**: Automated tip calculation and distribution
- **Low-Stock Alerts**: Real-time inventory monitoring with notifications
- **Notification Center**: Centralized alert system with role-based delivery
- **Admin Dashboard**: Comprehensive analytics with KPIs, charts, and user management

## Database Schema

### Core Models

1. **Users**: All system users (staff and customers)
2. **Menu Items**: Products sold to customers
3. **Inventory Items**: Raw materials and stock management
4. **Orders**: Customer orders with real-time status tracking
5. **86 List**: Temporarily unavailable menu items
6. **Staff Messages**: Team communication

## 🏗️ Architecture

### Frontend (React PWA)
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite with PWA plugin
- **Styling**: CSS modules with responsive design
- **State Management**: React Context API
- **Real-time**: Socket.io-client for live updates
- **Testing**: Jest + React Testing Library (70%+ coverage)

### Backend (Node.js API)
- **Runtime**: Node.js with Express
- **Database**: PostgreSQL with connection pooling
- **Authentication**: JWT-based with role permissions
- **Real-time**: Socket.io for live synchronization
- **Security**: Rate limiting, CORS, input validation
- **Testing**: Supertest + Jest (70%+ coverage)

### Infrastructure
- **Containerization**: Docker with multi-stage builds
- **Deployment**: Multiple platform support (Railway, Netlify, Vercel, Render)
- **Monitoring**: Health checks and error logging
- **Environment**: Separate dev/staging/production configs

## 🚀 Quick Deploy

### Option 1: Automated Script
```bash
# Clone and deploy
git clone https://github.com/yourusername/revmanager.git
cd revmanager
./deploy.sh full-deploy
./deploy.sh netlify    # Deploy frontend
./deploy.sh railway    # Deploy backend
```

### Option 2: Docker Deployment
```bash
# Production deployment with Docker
docker-compose -f docker-compose.prod.yml up -d
```

### Option 3: Platform-Specific
- **Frontend**: [Netlify](https://netlify.com), [Vercel](https://vercel.com)
- **Backend**: [Railway](https://railway.app), [Render](https://render.com)
- **Database**: [Supabase](https://supabase.com), [Railway PostgreSQL](https://railway.app)

📖 **[Complete Deployment Guide](./docs/DEPLOYMENT.md)**

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- PostgreSQL (v12 or higher)
- npm or yarn

## 🏗️ Architecture

### Frontend (React + TypeScript + Vite)
- **Real-Time Hooks**: `useRealTimeMenu()` and `useRealTimeInventory()`
- **Live Components**: PublicMenu with instant availability updates
- **Socket Integration**: Seamless WebSocket communication
- **PWA Features**: Service workers, manifest, offline support

### Backend (Node.js + Express + Socket.io)
- **Inventory Service**: Automatic menu availability management
- **Inventory Monitor**: Background service for low-stock alerts
- **Real-Time Events**: Socket.io broadcasting for instant updates
- **Notification System**: Centralized alert management with role targeting
- **RBAC Middleware**: Comprehensive role-based security
- **API Routes**: RESTful endpoints with real-time integration

### Database (PostgreSQL)
- **Junction Tables**: Menu-inventory relationships with quantities
- **Audit Logging**: Complete change tracking for accountability
- **Smart Schema**: Optimized for real-time updates and queries

## 🔧 Quick Start

### 1. Run Setup Script
```bash
./setup.sh
```
This will:
- Check dependencies (Node.js, PostgreSQL)
- Install all packages
- Create environment files
- Generate database schema
- Create startup scripts

### 2. Setup Database
```bash
# Create database
psql -U postgres -c 'CREATE DATABASE revmanger;'

# Run schema setup
psql -U postgres -d revmanger -f setup_database.sql
```

### 3. Configure Environment
Edit `server/.env` with your database credentials:
```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=revmanger
DB_USER=your_username
DB_PASSWORD=your_password
```

### 4. Start Development Servers
```bash
./start_dev.sh
```

This starts both frontend (port 5173) and backend (port 3001).

## 🧪 Testing Real-Time Features

### Test Scenario 1: Automatic 86ing
1. Open multiple browser windows to `http://localhost:5173`
2. Create a menu-inventory relationship via API
3. Create orders that deplete inventory
4. Watch items automatically become unavailable in real-time
5. See live updates across all browser windows

### Test Scenario 2: Live Dashboard
1. Open live dashboard: `http://localhost:5173/dashboard/live`
2. Monitor real-time statistics and recent changes
3. Watch automatic vs manual 86'd items
4. See inventory alerts as they happen

### Test Scenario 3: Multi-User Sync
1. Open public menu on multiple devices
2. Have staff make inventory changes
3. Observe instant synchronization across all devices
4. No refresh needed - changes appear immediately

### Test Scenario 4: Inventory Alert System
1. Run the inventory alert test: `./test_inventory_alerts.sh`
2. Set inventory items below their par levels
3. Watch low-stock notifications appear in real-time
4. Test notification dismissal by authorized roles
5. Verify automatic alert generation every 5 minutes

### Test Scenario 5: Admin Dashboard Analytics
1. Run the admin dashboard test: `./test_admin_dashboard.sh`
2. Login as manager or owner to access `/admin`
3. View real-time KPIs and interactive charts
4. Test user management and role assignment
5. Verify analytics data matches database calculations

## 📊 Real-Time Events

### Socket.io Event Types
```javascript
// Item automatically 86'd due to low inventory
'menu-update': {
  type: 'item-86ed',
  menuItemId: 1,
  menu: [...],           // Updated menu array
  eightySixList: [...],  // Updated 86 list
  timestamp: '2024-01-15T10:30:00Z'
}

// Item restored when inventory replenished
'menu-update': {
  type: 'item-restored',
  menuItemId: 1,
  menu: [...],
  eightySixList: [...],
  timestamp: '2024-01-15T11:00:00Z'
}

// Bulk inventory update
'menu-bulk-update': {
  type: 'bulk-update',
  menu: [...],
  eightySixList: [...],
  summary: { total: 25, available: 20, changed: [...] }
}

// Inventory alerts
'inventory-alert': {
  notification: {
    id: 123,
    type: 'inventory_alert',
    title: 'Low Stock Alert: Chicken Breast',
    message: 'Chicken Breast is running low. Current stock: 2 lbs, Par level: 5 lbs',
    severity: 'warning',
    metadata: {
      inventory_item_id: 45,
      current_stock: 2,
      par_level: 5,
      stock_percentage: 40
    }
  },
  item: {
    id: 45,
    name: 'Chicken Breast',
    current_stock: 2,
    par_level: 5,
    unit: 'lbs',
    category: 'protein'
  }
}

// Notification dismissed
'notification-dismissed': {
  notificationId: 123,
  dismissedBy: {
    id: 1,
    name: 'John Manager'
  },
  timestamp: '2024-01-15T11:00:00Z'
}
```

## 🔄 Real-Time Workflow

### Customer Experience
1. **Opens Menu**: Sees live availability with status indicators
2. **Real-Time Updates**: Menu changes instantly as inventory depletes
3. **Visual Feedback**: Unavailable items clearly marked with reasons
4. **No Refresh Needed**: Socket.io provides seamless updates

### Staff Experience  
1. **Inventory Management**: Updates inventory through interface
2. **Automatic Propagation**: Changes instantly reflected on customer menus
3. **Smart Alerts**: Notifications for low stock before items are 86'd
4. **Audit Trail**: Complete history of who made what changes

### System Intelligence
1. **Order Processing**: Automatically deducts inventory when orders complete
2. **Availability Checking**: Continuously monitors if menu items can be made
3. **Auto 86ing**: Removes items from availability when insufficient ingredients
4. **Auto Restoration**: Brings items back when inventory is replenished

## 📱 Device Support

### Public Menu (Customers)
- **Mobile Browsers**: Optimized touch interface
- **Tablet Display**: Perfect for restaurant displays
- **Desktop**: Full-featured experience
- **PWA Install**: Add to home screen capability

### Staff Interface
- **Kitchen Tablets**: Real-time order and inventory management
- **Server Phones**: Quick menu checks and order updates
- **Manager Desktop**: Complete analytics and reporting
- **Multi-Device**: Same account across multiple devices

## 🔐 Security Features

### Authentication & Authorization
- **JWT Tokens**: Secure stateless authentication
- **Role Hierarchy**: Graduated permissions (customer → server → chef → manager → owner)
- **Route Protection**: API endpoints secured by role requirements
- **Session Management**: Automatic token refresh and logout

### Audit & Compliance
- **Complete Logging**: All changes tracked with user, timestamp, and details
- **Real-Time Monitoring**: Live view of all system activity
- **Historical Reports**: Detailed analytics for management review
- **Data Integrity**: Comprehensive validation and error handling

## 🚀 Production Deployment

### Environment Setup
- Configure production database credentials
- Set strong JWT secrets
- Enable HTTPS for secure WebSocket connections
- Configure CORS for production domains

### Scaling Considerations
- **Socket.io Clustering**: Use Redis adapter for multi-server deployments
- **Database Optimization**: Indexes on frequently queried columns
- **CDN Integration**: Static asset delivery for global performance
- **Load Balancing**: Sticky sessions for WebSocket connections

## 📖 API Documentation

### Menu Endpoints
- `GET /api/menu` - Get all menu items with real-time availability
- `GET /api/menu/86-list` - Get current 86'd items list
- `POST /api/menu/86` - Manually 86 an item
- `DELETE /api/menu/86/:id` - Remove item from 86 list

### Inventory Endpoints
- `GET /api/inventory` - Get all inventory items
- `POST /api/inventory` - Add/update inventory
- `POST /api/inventory/menu-relationships` - Link menu items to inventory
- `PUT /api/inventory/update-availability` - Trigger availability check

### Real-Time Endpoints
- `WebSocket /socket.io/` - Real-time event connection
- Events: `menu-update`, `menu-bulk-update`, `inventory-alert`

## 🤝 Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Test real-time functionality thoroughly
4. Commit changes: `git commit -m 'Add amazing feature'`
5. Push to branch: `git push origin feature/amazing-feature`
6. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

### Documentation
- **Setup Guide**: See `REALTIME_TESTING.md` for detailed testing scenarios
- **API Reference**: Complete endpoint documentation in `/docs`
- **Troubleshooting**: Common issues and solutions

### Getting Help
- **Issues**: Report bugs and feature requests on GitHub
- **Discussions**: Ask questions in GitHub Discussions
- **Documentation**: Comprehensive guides in `/docs` folder

---

**Built with ❤️ for the restaurant industry** - Real-time coordination for better service, reduced waste, and improved customer experience.

After running the database setup, you can log in with these demo accounts:

- **Owner**: owner@restaurant.com (any password)
- **Manager**: manager@restaurant.com (any password)
- **Chef**: chef@restaurant.com (any password)
- **Server**: server@restaurant.com (any password)

## Project Structure

```
RevManager/
├── src/                          # React frontend source
│   ├── components/               # React components
│   ├── contexts/                 # React context providers
│   └── main.tsx                  # Application entry point
├── server/                       # Backend API server
│   ├── database/                 # Database connection and setup
│   ├── routes/                   # API routes
│   └── server.js                 # Express server entry point
├── public/                       # Static assets
├── vite.config.ts               # Vite configuration
├── tailwind.config.js           # Tailwind CSS configuration
└── package.json                 # Frontend dependencies
```

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - Create new staff account

### Menu Management
- `GET /api/menu` - Get all menu items
- `GET /api/menu/86-list` - Get 86'd items
- `POST /api/menu/86/:itemId` - Add item to 86 list
- `DELETE /api/menu/86/:itemId` - Remove item from 86 list

### Inventory Management
- `GET /api/inventory` - Get all inventory items
- `GET /api/inventory/low-stock` - Get low stock alerts
- `PUT /api/inventory/:itemId/stock` - Update stock levels
- `PUT /api/inventory/:itemId/par-level` - Update par levels

### Order Management
- `GET /api/orders` - Get all orders
- `GET /api/orders/kitchen` - Get kitchen order queue
- `POST /api/orders` - Create new order
- `PUT /api/orders/:orderId/status` - Update order status

## Real-Time Events

The application uses Socket.io for real-time features:

- **86 List Updates**: Broadcast to all clients when items are 86'd/restored
- **Inventory Alerts**: Notify managers and chefs of low stock
- **New Orders**: Alert kitchen staff of incoming orders
- **Staff Messages**: Team communication system

## Development Features

### Progressive Web App (PWA)
- Offline functionality
- App-like experience
- Push notifications ready
- Installable on mobile devices

### Role-Based UI
- Dynamic interface based on user role
- Secure role-based access control
- Customized dashboards per role

### Real-Time Updates
- Live order tracking
- Instant 86 list updates
- Stock level alerts
- Team messaging

## Next Steps

This foundation provides:

1. ✅ Complete frontend and backend structure
2. ✅ Database schema with sample data
3. ✅ Authentication system
4. ✅ Role-based access control
5. ✅ Real-time communication setup
6. ✅ Core API endpoints
7. ✅ PWA configuration

### Recommended Development Priorities

1. **Enhanced UI Components**: Build detailed interfaces for each role
2. **Real-Time Integration**: Connect Socket.io events to UI updates
3. **Order Management**: Complete order flow from creation to completion
4. **Inventory Automation**: Auto-update stock based on orders
5. **Reporting Dashboard**: Analytics and business intelligence
6. **Mobile Optimization**: Responsive design improvements
7. **Push Notifications**: Alert system for critical updates

## Security Notes

- Passwords in demo data are placeholder hashes
- JWT secret should be changed in production
- Add proper input validation and sanitization
- Implement rate limiting for API endpoints
- Add HTTPS in production deployment

## Contributing

1. Follow the established code structure
2. Add appropriate error handling
3. Include JSDoc comments for functions
4. Test real-time functionality across multiple browser tabs
5. Ensure mobile responsiveness

## License

This project is built for restaurant management purposes. Modify and distribute as needed for your restaurant operations.
