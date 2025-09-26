import express from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { pool } from '../database/connection.js'
import { requireAuth, requireUserManagement, auditLog } from '../middleware/auth.js'

const router = express.Router()

// Login endpoint
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' })
    }

    // Find user by email
    const userResult = await pool.query(
      'SELECT * FROM users WHERE email = $1 AND is_active = true',
      [email]
    )

    if (userResult.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' })
    }

    const user = userResult.rows[0]

    // Check password - support demo accounts with simple passwords
    let isValidPassword = false
    
    // Demo accounts for testing (use 'password' for all demo accounts)
    const demoAccounts = [
      'owner@restaurant.com',
      'manager@restaurant.com', 
      'chef@restaurant.com',
      'server@restaurant.com',
      'customer@restaurant.com'
    ]
    
    if (demoAccounts.includes(email) && password === 'password') {
      isValidPassword = true
    } else if (user.password_hash) {
      isValidPassword = await bcrypt.compare(password, user.password_hash)
    }

    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' })
    }

    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: user.id, 
        email: user.email, 
        role: user.role 
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    )

    // Return user data (without password hash)
    const { password_hash, ...userWithoutPassword } = user
    
    // Update last login timestamp
    await pool.query(
      'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1',
      [user.id]
    )

    res.json({ 
      user: userWithoutPassword,
      token 
    })

  } catch (error) {
    console.error('Login error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Token validation endpoint
router.get('/validate', requireAuth, async (req, res) => {
  try {
    // Get fresh user data
    const userResult = await pool.query(
      'SELECT id, name, email, role, created_at, last_login FROM users WHERE id = $1 AND is_active = true',
      [req.user.userId]
    )

    if (userResult.rows.length === 0) {
      return res.status(401).json({ error: 'User not found or inactive' })
    }

    const user = userResult.rows[0]
    res.json(user)
  } catch (error) {
    console.error('Token validation error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Register endpoint (for creating new staff accounts - management only)
router.post('/register', requireUserManagement, auditLog('CREATE_USER'), async (req, res) => {
  try {
    const { email, password, firstName, lastName, role } = req.body

    if (!email || !password || !firstName || !lastName || !role) {
      return res.status(400).json({ error: 'All fields are required' })
    }

    // Check if user already exists
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    )

    if (existingUser.rows.length > 0) {
      return res.status(409).json({ error: 'User already exists' })
    }

    // Hash password
    const saltRounds = 10
    const passwordHash = await bcrypt.hash(password, saltRounds)

    // Create new user
    const newUser = await pool.query(
      `INSERT INTO users (email, password_hash, first_name, last_name, role) 
       VALUES ($1, $2, $3, $4, $5) 
       RETURNING id, email, first_name, last_name, role`,
      [email, passwordHash, firstName, lastName, role]
    )

    const user = newUser.rows[0]

    res.status(201).json({
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role
      }
    })

  } catch (error) {
    console.error('Registration error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Get current user profile
router.get('/profile', requireAuth, async (req, res) => {
  try {
    res.json({
      user: req.user
    })
  } catch (error) {
    console.error('Profile error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Update user profile (users can update their own profile)
router.put('/profile', requireAuth, async (req, res) => {
  try {
    const { firstName, lastName } = req.body
    const userId = req.user.id

    if (!firstName || !lastName) {
      return res.status(400).json({ error: 'First name and last name are required' })
    }

    const result = await pool.query(
      `UPDATE users 
       SET first_name = $1, last_name = $2, updated_at = CURRENT_TIMESTAMP
       WHERE id = $3 
       RETURNING id, email, first_name, last_name, role`,
      [firstName, lastName, userId]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' })
    }

    const user = result.rows[0]
    
    res.json({
      message: 'Profile updated successfully',
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role
      }
    })

  } catch (error) {
    console.error('Profile update error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Change password
router.put('/change-password', requireAuth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body
    const userId = req.user.id

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current password and new password are required' })
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters long' })
    }

    // Get current password hash
    const userResult = await pool.query(
      'SELECT password_hash FROM users WHERE id = $1',
      [userId]
    )

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' })
    }

    // For demo purposes, skip password verification
    // In production: const isValidPassword = await bcrypt.compare(currentPassword, userResult.rows[0].password_hash)

    // Hash new password
    const saltRounds = 10
    const newPasswordHash = await bcrypt.hash(newPassword, saltRounds)

    // Update password
    await pool.query(
      'UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [newPasswordHash, userId]
    )

    res.json({ message: 'Password changed successfully' })

  } catch (error) {
    console.error('Password change error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Logout (client-side token removal, but we can log it)
router.post('/logout', requireAuth, auditLog('USER_LOGOUT'), async (req, res) => {
  try {
    // In a more sophisticated system, you might maintain a token blacklist
    res.json({ message: 'Logged out successfully' })
  } catch (error) {
    console.error('Logout error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router
