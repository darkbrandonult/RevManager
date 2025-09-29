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

describe('Authentication Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('POST /api/auth/login', () => {
    it('should successfully login with demo account', async () => {
      const mockUser = {
        id: 1,
        email: 'demo@restaurant.com',
        password_hash: '$2a$10$abcdefghijklmnopqrstuvwxyz',
        role: 'server',
        full_name: 'Demo Server',
        is_active: true
      }

      mockPool.query
        .mockResolvedValueOnce({ rows: [mockUser] }) // User lookup
        .mockResolvedValueOnce({ rows: [] }) // Update last login

      mockJwt.sign.mockReturnValue('demo-jwt-token')
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

    it('should fail login with invalid credentials', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] })

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'invalid@example.com',
          password: 'wrongpassword'
        })

      expect(response.status).toBe(401)
      expect(response.body).toHaveProperty('error')
    })
  })
})