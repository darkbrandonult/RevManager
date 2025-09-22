import request from 'supertest'
import express from 'express'
import jwt from 'jsonwebtoken'
import orderRoutes from '../../routes/orders.js'

// Mock database connection
const mockPool = {
  query: jest.fn(),
  connect: jest.fn()
}
jest.mock('../../database/connection.js', () => ({
  pool: mockPool
}))

// Mock Socket.io
const mockIo = {
  emit: jest.fn()
}
jest.mock('socket.io', () => ({
  Server: jest.fn(() => mockIo)
}))

// Mock authentication middleware
const mockAuthMiddleware = (req, res, next) => {
  req.user = {
    id: 1,
    role: 'server',
    email: 'test@example.com'
  }
  next()
}

jest.mock('../../middleware/auth.js', () => mockAuthMiddleware)

// Create test app
const app = express()
app.use(express.json())
app.use('/api/orders', orderRoutes)

describe('Orders API', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('POST /api/orders', () => {
    it('should create a new order successfully', async () => {
      const orderData = {
        items: [
          {
            menu_item_id: 1,
            quantity: 2,
            special_instructions: 'No onions'
          },
          {
            menu_item_id: 2,
            quantity: 1,
            special_instructions: ''
          }
        ],
        table_number: 5,
        customer_name: 'John Doe'
      }

      const mockOrder = {
        id: 1,
        user_id: 1,
        table_number: 5,
        customer_name: 'John Doe',
        status: 'pending',
        total_amount: 25.99,
        created_at: new Date()
      }

      const mockOrderItems = [
        {
          id: 1,
          order_id: 1,
          menu_item_id: 1,
          quantity: 2,
          price: 12.99,
          special_instructions: 'No onions'
        },
        {
          id: 2,
          order_id: 1,
          menu_item_id: 2,
          quantity: 1,
          price: 12.99,
          special_instructions: ''
        }
      ]

      // Mock order creation
      mockPool.query
        .mockResolvedValueOnce({ rows: [mockOrder] }) // Create order
        .mockResolvedValueOnce({ rows: mockOrderItems }) // Create order items

      const response = await request(app)
        .post('/api/orders')
        .send(orderData)

      expect(response.status).toBe(201)
      expect(response.body).toHaveProperty('order')
      expect(response.body.order.id).toBe(1)
      expect(response.body.order.table_number).toBe(5)
      expect(response.body.order.status).toBe('pending')
      expect(mockIo.emit).toHaveBeenCalledWith('new_order', expect.any(Object))
    })

    it('should fail with missing required fields', async () => {
      const response = await request(app)
        .post('/api/orders')
        .send({
          items: []
        })

      expect(response.status).toBe(400)
      expect(response.body).toHaveProperty('error')
    })

    it('should fail with empty items array', async () => {
      const response = await request(app)
        .post('/api/orders')
        .send({
          items: [],
          table_number: 5,
          customer_name: 'John Doe'
        })

      expect(response.status).toBe(400)
      expect(response.body).toHaveProperty('error', 'Order must contain at least one item')
    })

    it('should handle database errors gracefully', async () => {
      mockPool.query.mockRejectedValueOnce(new Error('Database error'))

      const response = await request(app)
        .post('/api/orders')
        .send({
          items: [{ menu_item_id: 1, quantity: 1 }],
          table_number: 5,
          customer_name: 'John Doe'
        })

      expect(response.status).toBe(500)
      expect(response.body).toHaveProperty('error', 'Internal server error')
    })
  })

  describe('GET /api/orders', () => {
    it('should retrieve all orders with pagination', async () => {
      const mockOrders = [
        {
          id: 1,
          table_number: 5,
          customer_name: 'John Doe',
          status: 'pending',
          created_at: new Date()
        },
        {
          id: 2,
          table_number: 3,
          customer_name: 'Jane Smith',
          status: 'completed',
          created_at: new Date()
        }
      ]

      mockPool.query.mockResolvedValueOnce({
        rows: mockOrders
      })

      const response = await request(app)
        .get('/api/orders')
        .query({ page: 1, limit: 10 })

      expect(response.status).toBe(200)
      expect(response.body).toHaveProperty('orders')
      expect(response.body.orders).toHaveLength(2)
      expect(response.body.orders[0].id).toBe(1)
    })

    it('should filter orders by status', async () => {
      const mockPendingOrders = [
        {
          id: 1,
          table_number: 5,
          customer_name: 'John Doe',
          status: 'pending',
          created_at: new Date()
        }
      ]

      mockPool.query.mockResolvedValueOnce({
        rows: mockPendingOrders
      })

      const response = await request(app)
        .get('/api/orders')
        .query({ status: 'pending' })

      expect(response.status).toBe(200)
      expect(response.body.orders).toHaveLength(1)
      expect(response.body.orders[0].status).toBe('pending')
    })

    it('should filter orders by date range', async () => {
      const mockOrders = [
        {
          id: 1,
          table_number: 5,
          customer_name: 'John Doe',
          status: 'completed',
          created_at: new Date('2024-01-15')
        }
      ]

      mockPool.query.mockResolvedValueOnce({
        rows: mockOrders
      })

      const response = await request(app)
        .get('/api/orders')
        .query({
          start_date: '2024-01-01',
          end_date: '2024-01-31'
        })

      expect(response.status).toBe(200)
      expect(response.body.orders).toHaveLength(1)
    })
  })

  describe('GET /api/orders/:id', () => {
    it('should retrieve a specific order with items', async () => {
      const mockOrder = {
        id: 1,
        table_number: 5,
        customer_name: 'John Doe',
        status: 'pending',
        total_amount: 25.99,
        created_at: new Date()
      }

      const mockOrderItems = [
        {
          id: 1,
          menu_item_id: 1,
          quantity: 2,
          price: 12.99,
          special_instructions: 'No onions',
          menu_item_name: 'Burger'
        }
      ]

      mockPool.query
        .mockResolvedValueOnce({ rows: [mockOrder] })
        .mockResolvedValueOnce({ rows: mockOrderItems })

      const response = await request(app)
        .get('/api/orders/1')

      expect(response.status).toBe(200)
      expect(response.body).toHaveProperty('order')
      expect(response.body.order.id).toBe(1)
      expect(response.body.order).toHaveProperty('items')
      expect(response.body.order.items).toHaveLength(1)
    })

    it('should return 404 for non-existent order', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] })

      const response = await request(app)
        .get('/api/orders/999')

      expect(response.status).toBe(404)
      expect(response.body).toHaveProperty('error', 'Order not found')
    })
  })

  describe('PUT /api/orders/:id/status', () => {
    it('should update order status successfully', async () => {
      const mockOrder = {
        id: 1,
        status: 'in_progress',
        updated_at: new Date()
      }

      mockPool.query.mockResolvedValueOnce({ rows: [mockOrder] })

      const response = await request(app)
        .put('/api/orders/1/status')
        .send({ status: 'in_progress' })

      expect(response.status).toBe(200)
      expect(response.body.order.status).toBe('in_progress')
      expect(mockIo.emit).toHaveBeenCalledWith('order_status_updated', expect.any(Object))
    })

    it('should validate status values', async () => {
      const response = await request(app)
        .put('/api/orders/1/status')
        .send({ status: 'invalid_status' })

      expect(response.status).toBe(400)
      expect(response.body).toHaveProperty('error')
    })

    it('should return 404 for non-existent order', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] })

      const response = await request(app)
        .put('/api/orders/999/status')
        .send({ status: 'completed' })

      expect(response.status).toBe(404)
      expect(response.body).toHaveProperty('error', 'Order not found')
    })
  })

  describe('DELETE /api/orders/:id', () => {
    it('should delete order successfully (owner/manager only)', async () => {
      // Mock user with owner role
      const mockAuthMiddlewareOwner = (req, res, next) => {
        req.user = {
          id: 1,
          role: 'owner',
          email: 'owner@example.com'
        }
        next()
      }

      const appWithOwner = express()
      appWithOwner.use(express.json())
      appWithOwner.use('/api/orders', (req, res, next) => {
        mockAuthMiddlewareOwner(req, res, next)
      }, orderRoutes)

      mockPool.query.mockResolvedValueOnce({ rowCount: 1 })

      const response = await request(appWithOwner)
        .delete('/api/orders/1')

      expect(response.status).toBe(200)
      expect(response.body).toHaveProperty('message', 'Order deleted successfully')
    })

    it('should reject deletion for non-owner/manager roles', async () => {
      const response = await request(app)
        .delete('/api/orders/1')

      expect(response.status).toBe(403)
      expect(response.body).toHaveProperty('error', 'Access denied')
    })
  })

  describe('Order Analytics', () => {
    it('should retrieve daily sales analytics', async () => {
      const mockAnalytics = [
        {
          date: '2024-01-15',
          total_orders: 25,
          total_revenue: 750.50,
          avg_order_value: 30.02
        }
      ]

      mockPool.query.mockResolvedValueOnce({
        rows: mockAnalytics
      })

      const response = await request(app)
        .get('/api/orders/analytics/daily')
        .query({
          start_date: '2024-01-01',
          end_date: '2024-01-31'
        })

      expect(response.status).toBe(200)
      expect(response.body).toHaveProperty('analytics')
      expect(response.body.analytics).toHaveLength(1)
      expect(response.body.analytics[0].total_orders).toBe(25)
    })

    it('should retrieve popular items analytics', async () => {
      const mockPopularItems = [
        {
          menu_item_id: 1,
          menu_item_name: 'Burger',
          total_quantity: 50,
          total_revenue: 649.50
        },
        {
          menu_item_id: 2,
          menu_item_name: 'Pizza',
          total_quantity: 35,
          total_revenue: 525.00
        }
      ]

      mockPool.query.mockResolvedValueOnce({
        rows: mockPopularItems
      })

      const response = await request(app)
        .get('/api/orders/analytics/popular-items')
        .query({
          start_date: '2024-01-01',
          end_date: '2024-01-31'
        })

      expect(response.status).toBe(200)
      expect(response.body).toHaveProperty('popular_items')
      expect(response.body.popular_items).toHaveLength(2)
      expect(response.body.popular_items[0].menu_item_name).toBe('Burger')
    })
  })
})
