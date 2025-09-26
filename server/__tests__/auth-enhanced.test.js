import request from 'supertest'
import express from 'express'
import jwt from 'jsonwebtoken'

// Mock database connection
const mockPool = {
  query: jest.fn()
}

jest.mock('../database/connection.js', () => ({
  pool: mockPool
}))

// Mock middleware
jest.mock('../middleware/auth.js', () => ({
  requireAuth: (req, res, next) => {
    req.user = { userId: 1, email: 'test@example.com', role: 'server' }
    next()
  },
  requireUserManagement: (req, res, next) => next(),
  auditLog: () => (req, res, next) => next()
}))

// Import after mocks
import authRoutes from '../routes/auth.js'

// Create test app
const app = express()
app.use(express.json())
app.use('/api/auth', authRoutes)

describe('Authentication Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('POST /api/auth/login', () => {
    it('should successfully login with demo account', async () => {
      const mockUser = {
        id: 1,
        name: 'Test Chef',
        email: 'chef@restaurant.com',
        role: 'chef',
        is_active: true,
        created_at: new Date(),
        last_login: null
      }

      mockPool.query
        .mockResolvedValueOnce({ rows: [mockUser] }) // User lookup
        .mockResolvedValueOnce({ rows: [] }) // Update last login

      jwt.sign = jest.fn().mockReturnValue('mock-jwt-token')

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'chef@restaurant.com',
          password: 'password'
        })

      expect(response.status).toBe(200)
      expect(response.body).toHaveProperty('user')
      expect(response.body).toHaveProperty('token')
      expect(response.body.user.email).toBe('chef@restaurant.com')
      expect(response.body.user.role).toBe('chef')
      expect(response.body.user).not.toHaveProperty('password_hash')
    })

    it('should fail login with invalid credentials', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] })

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@restaurant.com',
          password: 'password'
        })

      expect(response.status).toBe(401)
      expect(response.body).toHaveProperty('error', 'Invalid credentials')
    })

    it('should fail login with missing credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'chef@restaurant.com'
          // missing password
        })

      expect(response.status).toBe(400)
      expect(response.body).toHaveProperty('error', 'Email and password are required')
    })

    it('should fail login with wrong password for demo account', async () => {
      const mockUser = {
        id: 1,
        name: 'Test Chef',
        email: 'chef@restaurant.com',
        role: 'chef',
        is_active: true
      }

      mockPool.query.mockResolvedValueOnce({ rows: [mockUser] })

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'chef@restaurant.com',
          password: 'wrongpassword'
        })

      expect(response.status).toBe(401)
      expect(response.body).toHaveProperty('error', 'Invalid credentials')
    })
  })

  describe('GET /api/auth/validate', () => {
    it('should validate token and return user data', async () => {
      const mockUser = {
        id: 1,
        name: 'Test Server',
        email: 'server@restaurant.com',
        role: 'server',
        created_at: new Date(),
        last_login: new Date()
      }

      mockPool.query.mockResolvedValueOnce({ rows: [mockUser] })

      const response = await request(app)
        .get('/api/auth/validate')
        .set('Authorization', 'Bearer valid-token')

      expect(response.status).toBe(200)
      expect(response.body).toEqual(mockUser)
    })

    it('should fail validation for inactive user', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] })

      const response = await request(app)
        .get('/api/auth/validate')
        .set('Authorization', 'Bearer valid-token')

      expect(response.status).toBe(401)
      expect(response.body).toHaveProperty('error', 'User not found or inactive')
    })
  })
})