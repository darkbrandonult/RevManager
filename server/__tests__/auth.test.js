// Mock database connection first - before any imports
jest.mock('../database/connection.js', () => ({
  pool: {
    query: jest.fn()
  }
}))

// Mock bcrypt
jest.mock('bcryptjs', () => ({
  compare: jest.fn(),
  hash: jest.fn()
}))

// Mock jwt
jest.mock('jsonwebtoken', () => ({
  sign: jest.fn(),
  verify: jest.fn()
}))

import request from 'supertest'
import express from 'express'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import authRoutes from '../routes/auth.js'
import { pool } from '../database/connection.js'

// Get references to mocked modules
const mockPool = pool
const mockJwt = jwt
const mockBcrypt = bcrypt

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
        email: 'demo@restaurant.com',
        password_hash: '$2a$10$abcdefghijklmnopqrstuvwxyz',
        role: 'server',
        full_name: 'Demo Server',
        is_active: true
      }

      mockPool.query.mockResolvedValueOnce({
        rows: [mockUser]
      })

      mockJwt.sign.mockReturnValue('mock-jwt-token')
      mockBcrypt.compare.mockResolvedValue(true)

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'demo@restaurant.com',
          password: 'password123'
        })

      expect(response.status).toBe(200)
      expect(response.body).toHaveProperty('token')
      expect(response.body).toHaveProperty('user')
    })

    it('should fail login with non-existent user', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: []
      })

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'wrongpassword'
        })

      expect(response.status).toBe(401)
      expect(response.body).toHaveProperty('error')
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
  })
})