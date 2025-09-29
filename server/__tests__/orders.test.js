// Mock database connection first - before any imports
jest.mock('../database/connection.js', () => ({
  pool: {
    query: jest.fn()
  }
}))

// Mock middleware  
jest.mock('../middleware/auth.js', () => ({
  requireAuth: (req, res, next) => {
    req.user = { userId: 1, email: 'server@restaurant.com', role: 'server', fullName: 'Test Server' }
    next()
  },
  requireRole: (roles) => (req, res, next) => next(),
  requireStaff: (req, res, next) => next(),
  requireKitchenStaff: (req, res, next) => next(),
  requireOrderManagement: (req, res, next) => next(),
  auditLog: () => (req, res, next) => next()
}))

import request from 'supertest'
import express from 'express'
import ordersRoutes from '../routes/orders.js'
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
app.use('/api/orders', ordersRoutes)

// Attach mock io to app
app.locals.io = mockIo

describe('Orders API', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('GET /api/orders', () => {
    it('should get all orders for staff', async () => {
      const mockOrders = [
        {
          id: 1,
          table_number: 5,
          status: 'pending',
          total_amount: 45.99,
          created_at: '2024-01-01T12:00:00Z'
        }
      ]

      mockPool.query.mockResolvedValueOnce({
        rows: mockOrders
      })

      const response = await request(app)
        .get('/api/orders')

      expect(response.status).toBe(200)
      expect(Array.isArray(response.body)).toBe(true)
    })

    it('should handle database errors gracefully', async () => {
      mockPool.query.mockRejectedValueOnce(new Error('Database error'))

      const response = await request(app)
        .get('/api/orders')

      expect(response.status).toBe(500)
      expect(response.body).toHaveProperty('error')
    })
  })
})