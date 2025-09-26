import request from 'supertest'
import express from 'express'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import authRoutes from '../routes/auth.js'

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

// Create test app
const app = express()
app.use(express.json())
app.use('/api/auth', authRoutes)

describe('Authentication API', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('POST /api/auth/login', () => {
    it('should successfully login with valid credentials', async () => {
      const mockUser = {
        id: 1,
        email: 'test@example.com',
        first_name: 'Test',
        last_name: 'User',
        role: 'server',
        is_active: true,
        password_hash: 'hashed_password'
      }

      mockPool.query.mockResolvedValueOnce({
        rows: [mockUser]
      })

      jwt.sign.mockReturnValue('mock-jwt-token')

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password123'
        })

      expect(response.status).toBe(200)
      expect(response.body).toHaveProperty('token', 'mock-jwt-token')
      expect(response.body).toHaveProperty('user')
      expect(response.body.user).not.toHaveProperty('password_hash')
      expect(response.body.user.email).toBe('test@example.com')
      expect(response.body.user.role).toBe('server')
    })

    it('should fail login with missing email', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          password: 'password123'
        })

      expect(response.status).toBe(400)
      expect(response.body).toHaveProperty('error', 'Email and password are required')
    })

    it('should fail login with missing password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com'
        })

      expect(response.status).toBe(400)
      expect(response.body).toHaveProperty('error', 'Email and password are required')
    })

    it('should fail login with non-existent user', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: []
      })

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'password123'
        })

      expect(response.status).toBe(401)
      expect(response.body).toHaveProperty('error', 'Invalid credentials')
    })

    it('should fail login with inactive user', async () => {
      const mockUser = {
        id: 1,
        email: 'inactive@example.com',
        is_active: false
      }

      mockPool.query.mockResolvedValueOnce({
        rows: []
      })

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'inactive@example.com',
          password: 'password123'
        })

      expect(response.status).toBe(401)
      expect(response.body).toHaveProperty('error', 'Invalid credentials')
    })

    it('should handle database errors gracefully', async () => {
      mockPool.query.mockRejectedValueOnce(new Error('Database connection failed'))

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password123'
        })

      expect(response.status).toBe(500)
      expect(response.body).toHaveProperty('error', 'Internal server error')
    })
  })

  describe('GET /api/auth/profile', () => {
    it('should return user profile with valid token', async () => {
      const mockUser = {
        id: 1,
        email: 'test@example.com',
        first_name: 'Test',
        last_name: 'User',
        role: 'server',
        is_active: true
      }

      jwt.verify.mockReturnValue({ userId: 1 })
      mockPool.query.mockResolvedValueOnce({
        rows: [mockUser]
      })

      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', 'Bearer valid-token')

      expect(response.status).toBe(200)
      expect(response.body).toHaveProperty('user')
      expect(response.body.user.email).toBe('test@example.com')
    })

    it('should fail with missing authorization header', async () => {
      const response = await request(app)
        .get('/api/auth/profile')

      expect(response.status).toBe(401)
      expect(response.body).toHaveProperty('error', 'Access denied. No token provided.')
    })

    it('should fail with invalid token', async () => {
      jwt.verify.mockImplementation(() => {
        throw new Error('Invalid token')
      })

      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', 'Bearer invalid-token')

      expect(response.status).toBe(401)
      expect(response.body).toHaveProperty('error', 'Invalid token.')
    })

    it('should fail with malformed authorization header', async () => {
      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', 'InvalidFormat')

      expect(response.status).toBe(401)
      expect(response.body).toHaveProperty('error', 'Access denied. No token provided.')
    })
  })

  describe('POST /api/auth/logout', () => {
    it('should successfully logout with valid token', async () => {
      jwt.verify.mockReturnValue({ userId: 1 })

      const response = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', 'Bearer valid-token')

      expect(response.status).toBe(200)
      expect(response.body).toHaveProperty('message', 'Logged out successfully')
    })

    it('should handle logout without token gracefully', async () => {
      const response = await request(app)
        .post('/api/auth/logout')

      expect(response.status).toBe(401)
      expect(response.body).toHaveProperty('error', 'Access denied. No token provided.')
    })
  })

  describe('POST /api/auth/register', () => {
    it('should register new user with valid data', async () => {
      const newUser = {
        email: 'newuser@example.com',
        password: 'password123',
        firstName: 'New',
        lastName: 'User',
        role: 'server'
      }

      // Mock check for existing user
      mockPool.query.mockResolvedValueOnce({
        rows: []
      })

      // Mock user creation
      const createdUser = {
        id: 2,
        email: newUser.email,
        first_name: newUser.firstName,
        last_name: newUser.lastName,
        role: newUser.role,
        is_active: true
      }

      mockPool.query.mockResolvedValueOnce({
        rows: [createdUser]
      })

      jwt.sign.mockReturnValue('new-user-token')

      const response = await request(app)
        .post('/api/auth/register')
        .send(newUser)

      expect(response.status).toBe(201)
      expect(response.body).toHaveProperty('token', 'new-user-token')
      expect(response.body).toHaveProperty('user')
      expect(response.body.user.email).toBe(newUser.email)
    })

    it('should fail registration with existing email', async () => {
      const existingUser = {
        id: 1,
        email: 'existing@example.com'
      }

      mockPool.query.mockResolvedValueOnce({
        rows: [existingUser]
      })

      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'existing@example.com',
          password: 'password123',
          firstName: 'Test',
          lastName: 'User',
          role: 'server'
        })

      expect(response.status).toBe(400)
      expect(response.body).toHaveProperty('error', 'User already exists')
    })

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@example.com'
          // Missing required fields
        })

      expect(response.status).toBe(400)
      expect(response.body).toHaveProperty('error')
    })

    it('should validate email format', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'invalid-email',
          password: 'password123',
          firstName: 'Test',
          lastName: 'User',
          role: 'server'
        })

      expect(response.status).toBe(400)
      expect(response.body).toHaveProperty('error')
    })
  })

  describe('Password Reset', () => {
    it('should initiate password reset for valid email', async () => {
      const mockUser = {
        id: 1,
        email: 'test@example.com'
      }

      mockPool.query.mockResolvedValueOnce({
        rows: [mockUser]
      })

      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send({
          email: 'test@example.com'
        })

      expect(response.status).toBe(200)
      expect(response.body).toHaveProperty('message', 'Password reset email sent')
    })

    it('should handle forgot password for non-existent email', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: []
      })

      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send({
          email: 'nonexistent@example.com'
        })

      // Should return success for security reasons (don't reveal if email exists)
      expect(response.status).toBe(200)
      expect(response.body).toHaveProperty('message', 'Password reset email sent')
    })
  })
})
