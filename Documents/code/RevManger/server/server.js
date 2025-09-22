import express from 'express'
import { createServer } from 'http'
import { Server } from 'socket.io'
import cors from 'cors'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

// Import routes
import authRoutes from './routes/auth.js'
import menuRoutes from './routes/menu.js'
import inventoryRoutes from './routes/inventory.js'
import orderRoutes from './routes/orders.js'
import scheduleRoutes from './routes/schedules.js'
import tipRoutes from './routes/tips.js'
import notificationRoutes from './routes/notifications.js'
import adminRoutes from './routes/admin.js'

// Import services
import InventoryMonitorService from './services/InventoryMonitorService.js'

// Import database
import { pool } from './database/connection.js'

// Load environment variables
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Load environment-specific config
const nodeEnv = process.env.NODE_ENV || 'development'
dotenv.config({ path: path.join(__dirname, `.env.${nodeEnv}`) })
dotenv.config() // Load default .env as fallback

const app = express()
const httpServer = createServer(app)

// CORS configuration based on environment
const corsOptions = {
  origin: process.env.CORS_ORIGIN?.split(',') || ["http://localhost:5173"],
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true
}

const io = new Server(httpServer, {
  cors: corsOptions
})

const PORT = process.env.PORT || 3001

// Middleware
app.use(cors(corsOptions))
app.use(express.json({ limit: process.env.MAX_FILE_SIZE || '5mb' }))
app.use(express.urlencoded({ extended: true, limit: process.env.MAX_FILE_SIZE || '5mb' }))

// Security headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('X-Frame-Options', 'DENY')
  res.setHeader('X-XSS-Protection', '1; mode=block')
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
  }
  next()
})

// Store socket.io instance in app for use in routes
app.set('io', io)

// Initialize inventory monitoring service
const inventoryMonitor = new InventoryMonitorService(io)

// Middleware to attach services to request object
app.use((req, res, next) => {
  req.io = io
  req.inventoryMonitor = inventoryMonitor
  next()
})

// Routes
app.use('/api/auth', authRoutes)
app.use('/api/menu', menuRoutes)
app.use('/api/inventory', inventoryRoutes)
app.use('/api/orders', orderRoutes)
app.use('/api/schedules', scheduleRoutes)
app.use('/api/tips', tipRoutes)
app.use('/api/notifications', notificationRoutes)
app.use('/api/admin', adminRoutes)

// Health check endpoint
app.get('/api/health', async (req, res) => {
  try {
    // Check database connection
    await pool.query('SELECT 1')
    
    res.json({ 
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      uptime: process.uptime(),
      database: 'connected'
    })
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Database connection failed'
    })
  }
})

// Legacy status endpoint for backward compatibility
app.get('/api/status', (req, res) => {
  res.json({ 
    message: 'RevManager server is running',
    timestamp: new Date().toISOString(),
    status: 'healthy'
  })
})

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id)

  // Join role-specific rooms
  socket.on('join-role', (role) => {
    socket.join(`role-${role}`)
    console.log(`Socket ${socket.id} joined role: ${role}`)
  })

  // Handle 86-list updates (broadcast to all)
  socket.on('update-86-list', (data) => {
    io.emit('86-list-updated', data)
  })

  // Handle menu updates (broadcast to all)
  socket.on('menu-update', (data) => {
    io.emit('menu-update', data)
  })

  // Handle inventory alerts (broadcast to managers and chefs)
  socket.on('inventory-alert', (data) => {
    io.to('role-manager').to('role-chef').emit('inventory-alert', data)
  })

  // Handle new orders (broadcast to kitchen)
  socket.on('new-order', (data) => {
    io.to('role-chef').to('role-server').emit('new-order', data)
  })

  // Handle messages between staff
  socket.on('staff-message', (data) => {
    const targetRoles = data.targetRoles || ['manager', 'chef', 'server']
    targetRoles.forEach(role => {
      io.to(`role-${role}`).emit('staff-message', data)
    })
  })

  socket.on('disconnect', () => {
    if (process.env.NODE_ENV !== 'production') {
      console.log('Client disconnected:', socket.id)
    }
  })
})

// Global error handlers
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err)
  
  if (process.env.NODE_ENV === 'production') {
    res.status(500).json({ error: 'Internal server error' })
  } else {
    res.status(500).json({ 
      error: err.message,
      stack: err.stack 
    })
  }
})

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' })
})

// Test database connection
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('Database connection error:', err)
    process.exit(1)
  } else {
    console.log('Database connected successfully')
    // Start inventory monitoring after database connection is confirmed
    inventoryMonitor.start()
  }
})

// Graceful shutdown
const gracefulShutdown = (signal) => {
  console.log(`Received ${signal}. Graceful shutdown...`)
  
  httpServer.close(() => {
    console.log('HTTP server closed.')
    
    pool.end(() => {
      console.log('Database pool closed.')
      process.exit(0)
    })
  })
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'))
process.on('SIGINT', () => gracefulShutdown('SIGINT'))

httpServer.listen(PORT, () => {
  console.log(`RevManager server running on port ${PORT}`)
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`)
  console.log(`WebSocket server ready`)
  console.log(`Inventory monitoring service initialized`)
})
