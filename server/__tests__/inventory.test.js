// Mock database connection first - before any imports
jest.mock('../database/connection.js', () => ({
  pool: {
    query: jest.fn(),
    connect: jest.fn()
  }
}))

// Mock middleware
jest.mock('../middleware/auth.js', () => ({
  requireAuth: (req, res, next) => {
    req.user = { userId: 1, email: 'manager@restaurant.com', role: 'manager' }
    next()
  },
  requireRole: (roles) => (req, res, next) => next(),
  requireKitchenStaff: (req, res, next) => next(),
  requireManagement: (req, res, next) => next(),
  requireInventoryAccess: (req, res, next) => next(),
  auditLog: () => (req, res, next) => next()
}))

import request from 'supertest'
import express from 'express'
import inventoryRoutes from '../routes/inventory.js'
import { pool } from '../database/connection.js'

// Get reference to mocked pool
const mockPool = pool

// Mock Socket.io
const mockIo = {
  emit: jest.fn()
}

// Create test app
const app = express()
app.use(express.json())
app.use('/api/inventory', inventoryRoutes)

// Attach mock io to app
app.locals.io = mockIo

describe('Inventory API', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('GET /api/inventory', () => {
    it('should return inventory items', async () => {
      const mockItems = [
        {
          id: 1,
          name: 'Tomatoes',
          category: 'vegetables',
          quantity: 50,
          unit: 'lbs',
          low_stock_threshold: 10
        }
      ]

      mockPool.query.mockResolvedValueOnce({
        rows: mockItems
      })

      const response = await request(app)
        .get('/api/inventory')

      expect(response.status).toBe(200)
      expect(Array.isArray(response.body)).toBe(true)
    })

    it('should handle database errors gracefully', async () => {
      mockPool.query.mockRejectedValueOnce(new Error('Database error'))

      const response = await request(app)
        .get('/api/inventory')

      expect(response.status).toBe(500)
      expect(response.body).toHaveProperty('error')
    })
  })

  describe('GET /api/inventory/low-stock', () => {
    it('should return low stock items', async () => {
      const mockLowStockItems = [
        {
          id: 1,
          name: 'Flour',
          quantity: 2,
          low_stock_threshold: 10
        }
      ]

      mockPool.query.mockResolvedValueOnce({
        rows: mockLowStockItems
      })

      const response = await request(app)
        .get('/api/inventory/low-stock')

      expect(response.status).toBe(200)
      expect(Array.isArray(response.body)).toBe(true)
    })
  })
})