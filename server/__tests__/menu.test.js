import request from 'supertest'
import express from 'express'

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
    req.user = { userId: 1, email: 'chef@restaurant.com', role: 'chef' }
    next()
  },
  requireRole: (roles) => (req, res, next) => {
    if (roles.includes(req.user?.role)) {
      next()
    } else {
      res.status(403).json({ error: 'Insufficient permissions' })
    }
  }
}))

// Mock socket.io
const mockIo = {
  emit: jest.fn(),
  to: jest.fn(() => ({ emit: jest.fn() }))
}

// Import after mocks
import menuRoutes from '../routes/menu.js'

// Create test app
const app = express()
app.use(express.json())
app.use((req, res, next) => {
  req.io = mockIo
  next()
})
app.use('/api/menu', menuRoutes)

describe('Menu Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('GET /api/menu', () => {
    it('should return menu with availability status', async () => {
      const mockMenuItems = [
        {
          id: 1,
          name: 'Grilled Salmon',
          description: 'Fresh Atlantic salmon with herbs',
          price: 24.99,
          category: 'Main Courses',
          is_available: true
        },
        {
          id: 2,
          name: 'Pasta Primavera',
          description: 'Seasonal vegetables with penne pasta',
          price: 18.99,
          category: 'Main Courses',
          is_available: false
        }
      ]

      mockPool.query
        .mockResolvedValueOnce({ rows: mockMenuItems })
        .mockResolvedValueOnce({ rows: [{ menu_item_id: 2 }] })

      const response = await request(app).get('/api/menu')

      expect(response.status).toBe(200)
      expect(response.body).toHaveProperty('menu')
      expect(response.body).toHaveProperty('eightySixList')
      expect(response.body.menu).toHaveLength(2)
      expect(response.body.eightySixList).toEqual([2])
    })

    it('should handle database errors gracefully', async () => {
      mockPool.query.mockRejectedValueOnce(new Error('Database connection failed'))

      const response = await request(app).get('/api/menu')

      expect(response.status).toBe(500)
      expect(response.body).toHaveProperty('error', 'Internal server error')
    })
  })

  describe('PUT /api/menu/:id/86', () => {
    it('should successfully 86 a menu item', async () => {
      const mockMenuItem = {
        id: 1,
        name: 'Grilled Salmon',
        is_available: true
      }

      const updatedMenu = [
        { ...mockMenuItem, is_available: false }
      ]

      mockPool.query
        .mockResolvedValueOnce({ rows: [mockMenuItem] }) // Get item
        .mockResolvedValueOnce({ rows: [] }) // Update item
        .mockResolvedValueOnce({ rows: [] }) // Add to 86 list
        .mockResolvedValueOnce({ rows: updatedMenu }) // Get updated menu
        .mockResolvedValueOnce({ rows: [{ menu_item_id: 1 }] }) // Get 86 list

      const response = await request(app)
        .put('/api/menu/1/86')
        .send({
          is_86d: true,
          reason: 'Kitchen ran out of salmon'
        })

      expect(response.status).toBe(200)
      expect(response.body).toHaveProperty('menu')
      expect(response.body).toHaveProperty('eightySixList')
      expect(mockIo.emit).toHaveBeenCalledWith('menu-update', expect.any(Object))
    })

    it('should handle non-existent menu item', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] })

      const response = await request(app)
        .put('/api/menu/999/86')
        .send({
          is_86d: true,
          reason: 'Test'
        })

      expect(response.status).toBe(404)
      expect(response.body).toHaveProperty('error', 'Menu item not found')
    })
  })
})

describe('Real-time Menu Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should broadcast menu updates to all connected clients', async () => {
    const mockMenuItem = {
      id: 1,
      name: 'Grilled Salmon',
      is_available: true
    }

    mockPool.query
      .mockResolvedValueOnce({ rows: [mockMenuItem] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [mockMenuItem] })
      .mockResolvedValueOnce({ rows: [] })

    const response = await request(app)
      .put('/api/menu/1/86')
      .send({
        is_86d: true,
        reason: 'Out of stock'
      })

    expect(response.status).toBe(200)
    expect(mockIo.emit).toHaveBeenCalledWith('menu-update', expect.objectContaining({
      type: 'item-86ed',
      menu: expect.any(Array),
      eightySixList: expect.any(Array)
    }))
  })
})