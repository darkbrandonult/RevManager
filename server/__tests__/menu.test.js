// Mock database connection first - before any imports
jest.mock('../database/connection.js', () => ({
  pool: {
    query: jest.fn()
  }
}))

// Mock middleware
jest.mock('../middleware/auth.js', () => ({
  requireAuth: (req, res, next) => {
    req.user = { userId: 1, email: 'chef@restaurant.com', role: 'chef' }
    next()
  },
  requireRole: (roles) => (req, res, next) => next(),
  requireMenuManagement: (req, res, next) => next(),
  auditLog: () => (req, res, next) => next()
}))

// Mock socket.io
const mockIo = {
  emit: jest.fn(),
  to: jest.fn(() => ({ emit: jest.fn() }))
}

import request from 'supertest'
import express from 'express'
import menuRoutes from '../routes/menu.js'
import { pool } from '../database/connection.js'

// Get reference to mocked pool
const mockPool = pool

// Create test app
const app = express()
app.use(express.json())
app.use('/api/menu', menuRoutes)

// Attach mock io to app for socket tests
app.locals.io = mockIo

describe('Menu Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('GET /api/menu', () => {
    it('should return menu with availability status', async () => {
      const mockMenuItems = [
        {
          id: 1,
          name: 'Burger',
          price: 15.99,
          category: 'entree',
          available: true,
          ingredients: ['beef', 'bun', 'lettuce']
        },
        {
          id: 2,
          name: 'Pizza',
          price: 18.99,
          category: 'entree', 
          available: false,
          ingredients: ['dough', 'cheese', 'tomato']
        }
      ]

      mockPool.query.mockResolvedValueOnce({
        rows: mockMenuItems
      })

      const response = await request(app)
        .get('/api/menu')

      expect(response.status).toBe(200)
      expect(Array.isArray(response.body)).toBe(true)
      expect(response.body.length).toBeGreaterThan(0)
      expect(response.body[0]).toHaveProperty('id')
      expect(response.body[0]).toHaveProperty('name')
    })

    it('should handle database errors gracefully', async () => {
      mockPool.query.mockRejectedValueOnce(new Error('Database connection failed'))

      const response = await request(app)
        .get('/api/menu')

      expect(response.status).toBe(500)
      expect(response.body).toHaveProperty('error')
    })
  })
})