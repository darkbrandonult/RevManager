import request from 'supertest'
import express from 'express'
import jwt from 'jsonwebtoken'
import inventoryRoutes from '../../routes/inventory.js'

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
    role: 'manager',
    email: 'manager@example.com'
  }
  next()
}

jest.mock('../../middleware/auth.js', () => mockAuthMiddleware)

// Create test app
const app = express()
app.use(express.json())
app.use('/api/inventory', inventoryRoutes)

describe('Inventory API', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('GET /api/inventory', () => {
    it('should retrieve all inventory items', async () => {
      const mockInventory = [
        {
          id: 1,
          name: 'Tomatoes',
          category: 'vegetables',
          current_stock: 25,
          minimum_stock: 10,
          unit: 'kg',
          cost_per_unit: 3.50,
          supplier: 'Fresh Foods Inc',
          last_updated: new Date()
        },
        {
          id: 2,
          name: 'Ground Beef',
          category: 'meat',
          current_stock: 15,
          minimum_stock: 5,
          unit: 'kg',
          cost_per_unit: 12.99,
          supplier: 'Premium Meats',
          last_updated: new Date()
        }
      ]

      mockPool.query.mockResolvedValueOnce({
        rows: mockInventory
      })

      const response = await request(app)
        .get('/api/inventory')

      expect(response.status).toBe(200)
      expect(response.body).toHaveProperty('inventory')
      expect(response.body.inventory).toHaveLength(2)
      expect(response.body.inventory[0].name).toBe('Tomatoes')
      expect(response.body.inventory[1].name).toBe('Ground Beef')
    })

    it('should filter inventory by category', async () => {
      const mockVegetables = [
        {
          id: 1,
          name: 'Tomatoes',
          category: 'vegetables',
          current_stock: 25,
          minimum_stock: 10,
          unit: 'kg'
        }
      ]

      mockPool.query.mockResolvedValueOnce({
        rows: mockVegetables
      })

      const response = await request(app)
        .get('/api/inventory')
        .query({ category: 'vegetables' })

      expect(response.status).toBe(200)
      expect(response.body.inventory).toHaveLength(1)
      expect(response.body.inventory[0].category).toBe('vegetables')
    })

    it('should filter inventory by low stock', async () => {
      const mockLowStock = [
        {
          id: 2,
          name: 'Ground Beef',
          category: 'meat',
          current_stock: 3,
          minimum_stock: 5,
          unit: 'kg'
        }
      ]

      mockPool.query.mockResolvedValueOnce({
        rows: mockLowStock
      })

      const response = await request(app)
        .get('/api/inventory')
        .query({ low_stock: 'true' })

      expect(response.status).toBe(200)
      expect(response.body.inventory).toHaveLength(1)
      expect(response.body.inventory[0].current_stock).toBeLessThan(
        response.body.inventory[0].minimum_stock
      )
    })
  })

  describe('GET /api/inventory/:id', () => {
    it('should retrieve a specific inventory item', async () => {
      const mockItem = {
        id: 1,
        name: 'Tomatoes',
        category: 'vegetables',
        current_stock: 25,
        minimum_stock: 10,
        unit: 'kg',
        cost_per_unit: 3.50,
        supplier: 'Fresh Foods Inc',
        last_updated: new Date()
      }

      mockPool.query.mockResolvedValueOnce({
        rows: [mockItem]
      })

      const response = await request(app)
        .get('/api/inventory/1')

      expect(response.status).toBe(200)
      expect(response.body).toHaveProperty('item')
      expect(response.body.item.id).toBe(1)
      expect(response.body.item.name).toBe('Tomatoes')
    })

    it('should return 404 for non-existent item', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: []
      })

      const response = await request(app)
        .get('/api/inventory/999')

      expect(response.status).toBe(404)
      expect(response.body).toHaveProperty('error', 'Inventory item not found')
    })
  })

  describe('POST /api/inventory', () => {
    it('should create a new inventory item', async () => {
      const newItem = {
        name: 'Chicken Breast',
        category: 'meat',
        current_stock: 20,
        minimum_stock: 8,
        unit: 'kg',
        cost_per_unit: 8.99,
        supplier: 'Premium Meats'
      }

      const mockCreatedItem = {
        id: 3,
        ...newItem,
        last_updated: new Date()
      }

      mockPool.query.mockResolvedValueOnce({
        rows: [mockCreatedItem]
      })

      const response = await request(app)
        .post('/api/inventory')
        .send(newItem)

      expect(response.status).toBe(201)
      expect(response.body).toHaveProperty('item')
      expect(response.body.item.name).toBe('Chicken Breast')
      expect(response.body.item.id).toBe(3)
      expect(mockIo.emit).toHaveBeenCalledWith('inventory_updated', expect.any(Object))
    })

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/inventory')
        .send({
          name: 'Incomplete Item'
          // Missing required fields
        })

      expect(response.status).toBe(400)
      expect(response.body).toHaveProperty('error')
    })

    it('should validate numeric fields', async () => {
      const response = await request(app)
        .post('/api/inventory')
        .send({
          name: 'Test Item',
          category: 'test',
          current_stock: 'invalid',
          minimum_stock: 5,
          unit: 'kg',
          cost_per_unit: 10.00,
          supplier: 'Test Supplier'
        })

      expect(response.status).toBe(400)
      expect(response.body).toHaveProperty('error')
    })
  })

  describe('PUT /api/inventory/:id', () => {
    it('should update an existing inventory item', async () => {
      const updateData = {
        current_stock: 30,
        minimum_stock: 15,
        cost_per_unit: 4.00
      }

      const mockUpdatedItem = {
        id: 1,
        name: 'Tomatoes',
        category: 'vegetables',
        current_stock: 30,
        minimum_stock: 15,
        unit: 'kg',
        cost_per_unit: 4.00,
        supplier: 'Fresh Foods Inc',
        last_updated: new Date()
      }

      mockPool.query.mockResolvedValueOnce({
        rows: [mockUpdatedItem]
      })

      const response = await request(app)
        .put('/api/inventory/1')
        .send(updateData)

      expect(response.status).toBe(200)
      expect(response.body).toHaveProperty('item')
      expect(response.body.item.current_stock).toBe(30)
      expect(response.body.item.cost_per_unit).toBe(4.00)
      expect(mockIo.emit).toHaveBeenCalledWith('inventory_updated', expect.any(Object))
    })

    it('should return 404 for non-existent item', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: []
      })

      const response = await request(app)
        .put('/api/inventory/999')
        .send({ current_stock: 20 })

      expect(response.status).toBe(404)
      expect(response.body).toHaveProperty('error', 'Inventory item not found')
    })

    it('should trigger low stock alert when updating below minimum', async () => {
      const updateData = {
        current_stock: 3
      }

      const mockUpdatedItem = {
        id: 1,
        name: 'Tomatoes',
        current_stock: 3,
        minimum_stock: 10
      }

      mockPool.query.mockResolvedValueOnce({
        rows: [mockUpdatedItem]
      })

      const response = await request(app)
        .put('/api/inventory/1')
        .send(updateData)

      expect(response.status).toBe(200)
      expect(mockIo.emit).toHaveBeenCalledWith('low_stock_alert', expect.any(Object))
    })
  })

  describe('DELETE /api/inventory/:id', () => {
    it('should delete inventory item (manager/owner only)', async () => {
      mockPool.query.mockResolvedValueOnce({
        rowCount: 1
      })

      const response = await request(app)
        .delete('/api/inventory/1')

      expect(response.status).toBe(200)
      expect(response.body).toHaveProperty('message', 'Inventory item deleted successfully')
      expect(mockIo.emit).toHaveBeenCalledWith('inventory_updated', expect.any(Object))
    })

    it('should return 404 for non-existent item', async () => {
      mockPool.query.mockResolvedValueOnce({
        rowCount: 0
      })

      const response = await request(app)
        .delete('/api/inventory/999')

      expect(response.status).toBe(404)
      expect(response.body).toHaveProperty('error', 'Inventory item not found')
    })

    it('should reject deletion for non-manager roles', async () => {
      const mockAuthMiddlewareServer = (req, res, next) => {
        req.user = {
          id: 2,
          role: 'server',
          email: 'server@example.com'
        }
        next()
      }

      const appWithServer = express()
      appWithServer.use(express.json())
      appWithServer.use('/api/inventory', (req, res, next) => {
        mockAuthMiddlewareServer(req, res, next)
      }, inventoryRoutes)

      const response = await request(appWithServer)
        .delete('/api/inventory/1')

      expect(response.status).toBe(403)
      expect(response.body).toHaveProperty('error', 'Access denied')
    })
  })

  describe('Stock Movements', () => {
    it('should record stock addition', async () => {
      const stockMovement = {
        quantity: 10,
        movement_type: 'addition',
        notes: 'Weekly delivery'
      }

      const mockMovement = {
        id: 1,
        inventory_item_id: 1,
        quantity: 10,
        movement_type: 'addition',
        notes: 'Weekly delivery',
        created_at: new Date(),
        user_id: 1
      }

      mockPool.query.mockResolvedValueOnce({
        rows: [mockMovement]
      })

      const response = await request(app)
        .post('/api/inventory/1/movements')
        .send(stockMovement)

      expect(response.status).toBe(201)
      expect(response.body).toHaveProperty('movement')
      expect(response.body.movement.quantity).toBe(10)
      expect(response.body.movement.movement_type).toBe('addition')
    })

    it('should record stock deduction', async () => {
      const stockMovement = {
        quantity: 5,
        movement_type: 'deduction',
        notes: 'Used for lunch service'
      }

      const mockMovement = {
        id: 2,
        inventory_item_id: 1,
        quantity: 5,
        movement_type: 'deduction',
        notes: 'Used for lunch service',
        created_at: new Date(),
        user_id: 1
      }

      mockPool.query.mockResolvedValueOnce({
        rows: [mockMovement]
      })

      const response = await request(app)
        .post('/api/inventory/1/movements')
        .send(stockMovement)

      expect(response.status).toBe(201)
      expect(response.body).toHaveProperty('movement')
      expect(response.body.movement.movement_type).toBe('deduction')
    })

    it('should retrieve stock movement history', async () => {
      const mockMovements = [
        {
          id: 1,
          quantity: 10,
          movement_type: 'addition',
          notes: 'Weekly delivery',
          created_at: new Date(),
          user_email: 'manager@example.com'
        },
        {
          id: 2,
          quantity: 5,
          movement_type: 'deduction',
          notes: 'Used for lunch service',
          created_at: new Date(),
          user_email: 'chef@example.com'
        }
      ]

      mockPool.query.mockResolvedValueOnce({
        rows: mockMovements
      })

      const response = await request(app)
        .get('/api/inventory/1/movements')

      expect(response.status).toBe(200)
      expect(response.body).toHaveProperty('movements')
      expect(response.body.movements).toHaveLength(2)
      expect(response.body.movements[0].movement_type).toBe('addition')
      expect(response.body.movements[1].movement_type).toBe('deduction')
    })
  })

  describe('Inventory Analytics', () => {
    it('should retrieve low stock items', async () => {
      const mockLowStockItems = [
        {
          id: 2,
          name: 'Ground Beef',
          current_stock: 3,
          minimum_stock: 5,
          stock_difference: -2
        },
        {
          id: 3,
          name: 'Lettuce',
          current_stock: 1,
          minimum_stock: 8,
          stock_difference: -7
        }
      ]

      mockPool.query.mockResolvedValueOnce({
        rows: mockLowStockItems
      })

      const response = await request(app)
        .get('/api/inventory/analytics/low-stock')

      expect(response.status).toBe(200)
      expect(response.body).toHaveProperty('low_stock_items')
      expect(response.body.low_stock_items).toHaveLength(2)
      expect(response.body.low_stock_items[0].stock_difference).toBeLessThan(0)
    })

    it('should retrieve inventory valuation', async () => {
      const mockValuation = [
        {
          total_items: 25,
          total_value: 1250.75,
          categories: [
            { category: 'vegetables', value: 350.25, count: 8 },
            { category: 'meat', value: 675.50, count: 12 },
            { category: 'dairy', value: 225.00, count: 5 }
          ]
        }
      ]

      mockPool.query.mockResolvedValueOnce({
        rows: mockValuation
      })

      const response = await request(app)
        .get('/api/inventory/analytics/valuation')

      expect(response.status).toBe(200)
      expect(response.body).toHaveProperty('valuation')
      expect(response.body.valuation.total_value).toBe(1250.75)
      expect(response.body.valuation.total_items).toBe(25)
    })
  })
})
