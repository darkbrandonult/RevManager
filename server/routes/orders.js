import express from 'express'
import { pool } from '../database/connection.js'
import { 
  requireAuth,
  requireStaff,
  requireOrderManagement,
  requireKitchenStaff,
  auditLog
} from '../middleware/auth.js'
import { processOrderCompletion } from '../services/inventoryService.js'

const router = express.Router()

// Get order statistics (public for demo)
router.get('/stats', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        COUNT(*) as total_orders,
        COUNT(*) FILTER (WHERE status = 'pending') as pending,
        COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress,
        COUNT(*) FILTER (WHERE status = 'completed') as completed,
        COALESCE(SUM(total_amount) FILTER (WHERE status = 'completed'), 0) as revenue
      FROM orders
      WHERE created_at >= CURRENT_DATE
    `)
    
    const stats = result.rows[0]
    
    res.json({
      totalOrders: parseInt(stats.total_orders) || 0,
      pending: parseInt(stats.pending) || 0,
      inProgress: parseInt(stats.in_progress) || 0,
      completed: parseInt(stats.completed) || 0,
      revenue: parseFloat(stats.revenue) || 0
    })
    
  } catch (error) {
    console.error('Error fetching order stats:', error)
    // Return demo data if database fails
    res.json({
      totalOrders: 23,
      pending: 5,
      inProgress: 8,
      completed: 10,
      revenue: 1250.50
    })
  }
})

// Get all orders (staff only)
router.get('/', requireStaff, async (req, res) => {
  try {
    const { status } = req.query
    
    let query = `
      SELECT 
        o.id,
        o.customer_id,
        o.customer_name,
        o.table_number,
        o.status,
        o.total_amount,
        o.notes,
        o.created_at,
        o.updated_at,
        u.first_name as customer_first_name,
        u.last_name as customer_last_name,
        COALESCE(
          JSON_AGG(
            JSON_BUILD_OBJECT(
              'id', oi.id,
              'menu_item_id', oi.menu_item_id,
              'menu_item_name', oi.menu_item_name,
              'quantity', oi.quantity,
              'price', oi.price,
              'special_instructions', oi.special_instructions
            )
          ) FILTER (WHERE oi.id IS NOT NULL), 
          '[]'::json
        ) as items
      FROM orders o
      LEFT JOIN users u ON o.customer_id = u.id
      LEFT JOIN order_items oi ON o.id = oi.order_id
    `
    
    const params = []
    
    if (status) {
      query += ' WHERE o.status = $1'
      params.push(status)
    }
    
    query += ' GROUP BY o.id, u.first_name, u.last_name ORDER BY o.created_at DESC'
    
    const result = await pool.query(query, params)
    res.json(result.rows)
    
  } catch (error) {
    console.error('Error fetching orders:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Get orders for the kitchen (kitchen staff and management)
router.get('/kitchen', requireKitchenStaff, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        o.id,
        o.customer_name,
        o.status,
        o.total_amount,
        o.created_at,
        o.updated_at,
        o.created_by,
        o.estimated_completion,
        u.first_name as created_by_name,
        COALESCE(
          JSON_AGG(
            JSON_BUILD_OBJECT(
              'id', oi.id,
              'menu_item_id', oi.menu_item_id,
              'menu_item_name', mi.name,
              'quantity', oi.quantity,
              'price', oi.price,
              'notes', oi.notes
            ) ORDER BY oi.id
          ) FILTER (WHERE oi.id IS NOT NULL),
          '[]'::json
        ) as items
      FROM orders o
      LEFT JOIN users u ON o.created_by = u.id
      LEFT JOIN order_items oi ON o.id = oi.order_id
      LEFT JOIN menu_items mi ON oi.menu_item_id = mi.id
      WHERE o.status IN ('pending', 'preparing', 'ready')
      GROUP BY o.id, u.first_name
      ORDER BY 
        CASE 
          WHEN o.status = 'pending' THEN 1
          WHEN o.status = 'preparing' THEN 2
          WHEN o.status = 'ready' THEN 3
        END,
        o.created_at ASC
    `)

    res.json(result.rows)
  } catch (error) {
    console.error('Error fetching kitchen orders:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Get kitchen summary statistics
router.get('/kitchen/summary', requireKitchenStaff, async (req, res) => {
  try {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    const result = await pool.query(`
      SELECT 
        COUNT(CASE WHEN status = 'pending' THEN 1 END)::int as pending,
        COUNT(CASE WHEN status = 'preparing' THEN 1 END)::int as preparing,
        COUNT(CASE WHEN status = 'ready' THEN 1 END)::int as ready,
        COUNT(CASE WHEN status = 'completed' AND created_at >= $1 THEN 1 END)::int as completed_today,
        COALESCE(SUM(CASE WHEN status = 'completed' AND created_at >= $1 THEN total_amount END), 0) as total_revenue_today
      FROM orders
      WHERE created_at >= $1 OR status IN ('pending', 'preparing', 'ready')
    `, [today])

    res.json(result.rows[0])
  } catch (error) {
    console.error('Error fetching kitchen summary:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Create new order (authenticated users only)
router.post('/', requireAuth, auditLog('CREATE_ORDER'), async (req, res) => {
  try {
    const { customer_name, items, notes, total_amount } = req.body
    const userId = req.user.id

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Order must contain at least one item' })
    }

    if (!total_amount || total_amount <= 0) {
      return res.status(400).json({ error: 'Valid total amount required' })
    }

    if (!customer_name || customer_name.trim() === '') {
      return res.status(400).json({ error: 'Customer name is required' })
    }

    // Start transaction
    const client = await pool.connect()
    
    try {
      await client.query('BEGIN')

      // Create the order
      const orderResult = await client.query(`
        INSERT INTO orders (customer_name, status, total_amount)
        VALUES ($1, 'pending', $2)
        RETURNING *
      `, [customer_name.trim(), total_amount])

      const newOrder = orderResult.rows[0]

      // Create order items
      const orderItems = []
      for (const item of items) {
        const { menu_item_id, quantity, price, notes: itemNotes } = item
        
        if (!menu_item_id || !quantity || quantity <= 0 || !price) {
          throw new Error('Invalid item data')
        }

        // Get menu item name
        const menuItemResult = await client.query(`
          SELECT name FROM menu_items WHERE id = $1
        `, [menu_item_id])

        if (menuItemResult.rows.length === 0) {
          throw new Error(`Menu item with id ${menu_item_id} not found`)
        }

        const menuItemName = menuItemResult.rows[0].name

        const itemResult = await client.query(`
          INSERT INTO order_items (order_id, menu_item_id, menu_item_name, quantity, price, special_instructions)
          VALUES ($1, $2, $3, $4, $5, $6)
          RETURNING *
        `, [newOrder.id, menu_item_id, menuItemName, quantity, price, itemNotes])

        orderItems.push(itemResult.rows[0])
      }

      await client.query('COMMIT')

      // Get complete order data with menu item names for socket broadcast
      const completeOrderResult = await pool.query(`
        SELECT 
          o.id,
          o.customer_name,
          o.status,
          o.total_amount,
          o.created_at,
          o.updated_at,
          COALESCE(
            JSON_AGG(
              JSON_BUILD_OBJECT(
                'id', oi.id,
                'menu_item_id', oi.menu_item_id,
                'menu_item_name', mi.name,
                'quantity', oi.quantity,
                'price', oi.price,
                'notes', oi.special_instructions
              ) ORDER BY oi.id
            ) FILTER (WHERE oi.id IS NOT NULL),
            '[]'::json
          ) as items
        FROM orders o
        LEFT JOIN order_items oi ON o.id = oi.order_id
        LEFT JOIN menu_items mi ON oi.menu_item_id = mi.id
        WHERE o.id = $1
        GROUP BY o.id
      `, [newOrder.id])

      const completeOrder = completeOrderResult.rows[0]

      res.status(201).json({
        message: 'Order created successfully',
        order: completeOrder
      })

      // Emit real-time event to kitchen
      const io = req.app.get('io')
      if (io) {
        console.log('🍳 BROADCASTING NEW ORDER to kitchen:', completeOrder.id)
        io.emit('new-order', completeOrder)
      }

    } catch (err) {
      await client.query('ROLLBACK')
      throw err
    } finally {
      client.release()
    }

  } catch (error) {
    console.error('Error creating order:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Update order status (staff with order management privileges)
router.put('/:orderId/status', requireOrderManagement, auditLog('UPDATE_ORDER_STATUS'), async (req, res) => {
  try {
    const { orderId } = req.params
    const { status, estimated_completion } = req.body
    const userId = req.user.id

    const validStatuses = ['pending', 'preparing', 'ready', 'completed', 'cancelled']
    
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ 
        error: 'Invalid status',
        validStatuses 
      })
    }

    // Build update query dynamically
    let updateQuery = 'UPDATE orders SET status = $1, updated_at = CURRENT_TIMESTAMP'
    let queryParams = [status]
    let paramCount = 1

    if (estimated_completion) {
      paramCount++
      updateQuery += `, estimated_completion = $${paramCount}`
      queryParams.push(estimated_completion)
    }

    paramCount++
    updateQuery += ` WHERE id = $${paramCount} RETURNING *`
    queryParams.push(orderId)

    const result = await pool.query(updateQuery, queryParams)

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' })
    }

    const updatedOrder = result.rows[0]

    // Get complete order data for socket broadcast
    const completeOrderResult = await pool.query(`
      SELECT 
        o.id,
        o.customer_name,
        o.status,
        o.total_amount,
        o.created_at,
        o.updated_at,
        o.created_by,
        o.estimated_completion,
        u.first_name as created_by_name,
        COALESCE(
          JSON_AGG(
            JSON_BUILD_OBJECT(
              'id', oi.id,
              'menu_item_id', oi.menu_item_id,
              'menu_item_name', mi.name,
              'quantity', oi.quantity,
              'price', oi.price,
              'notes', oi.notes
            ) ORDER BY oi.id
          ) FILTER (WHERE oi.id IS NOT NULL),
          '[]'::json
        ) as items
      FROM orders o
      LEFT JOIN users u ON o.created_by = u.id
      LEFT JOIN order_items oi ON o.id = oi.order_id
      LEFT JOIN menu_items mi ON oi.menu_item_id = mi.id
      WHERE o.id = $1
      GROUP BY o.id, u.first_name
    `, [orderId])

    const completeOrder = completeOrderResult.rows[0]

    res.json({
      message: 'Order status updated successfully',
      order: completeOrder
    })

    // Emit real-time status update
    const io = req.app.get('io')
    if (io) {
      const updateData = {
        orderId: parseInt(orderId),
        status,
        updatedBy: userId,
        updatedByName: req.user.first_name || 'Staff',
        timestamp: new Date().toISOString(),
        estimatedCompletion: estimated_completion
      }
      
      console.log(`📱 BROADCASTING ORDER STATUS UPDATE:`, updateData)
      io.emit('order-status-update', updateData)
    }

    // Process inventory deduction if order is completed
    if (status === 'completed') {
      await processOrderCompletion(orderId, req.app.get('io'))
    }

  } catch (error) {
    console.error('Error updating order status:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Get single order by ID (authenticated users only)
router.get('/:orderId', requireAuth, async (req, res) => {
  try {
    const { orderId } = req.params
    
    const result = await pool.query(`
      SELECT 
        o.id,
        o.customer_id,
        o.customer_name,
        o.table_number,
        o.status,
        o.total_amount,
        o.notes,
        o.created_at,
        o.updated_at,
        u.first_name as customer_first_name,
        u.last_name as customer_last_name,
        u.email as customer_email,
        COALESCE(
          JSON_AGG(
            JSON_BUILD_OBJECT(
              'id', oi.id,
              'menu_item_id', oi.menu_item_id,
              'menu_item_name', oi.menu_item_name,
              'quantity', oi.quantity,
              'price', oi.price,
              'special_instructions', oi.special_instructions
            )
          ) FILTER (WHERE oi.id IS NOT NULL), 
          '[]'::json
        ) as items
      FROM orders o
      LEFT JOIN users u ON o.customer_id = u.id
      LEFT JOIN order_items oi ON o.id = oi.order_id
      WHERE o.id = $1
      GROUP BY o.id, u.first_name, u.last_name, u.email
    `, [orderId])

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' })
    }

    res.json(result.rows[0])
    
  } catch (error) {
    console.error('Error fetching order:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Delete/cancel order (staff with order management privileges)
router.delete('/:orderId', requireOrderManagement, auditLog('CANCEL_ORDER'), async (req, res) => {
  try {
    const { orderId } = req.params
    const { reason } = req.body
    
    const result = await pool.query(`
      UPDATE orders 
      SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND status IN ('pending', 'preparing')
      RETURNING *
    `, [orderId])

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found or cannot be cancelled' })
    }

    res.json({ message: 'Order cancelled successfully' })

    // Emit real-time cancellation event
    const io = req.app.get('io')
    if (io) {
      console.log(`❌ BROADCASTING ORDER CANCELLATION:`, orderId)
      io.emit('order-cancelled', {
        orderId: parseInt(orderId),
        reason: reason || 'Cancelled by staff',
        timestamp: new Date().toISOString()
      })
    }
    
  } catch (error) {
    console.error('Error cancelling order:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Close an order with tip information
router.post('/:id/close', requireStaff, async (req, res) => {
  try {
    const { id } = req.params
    const { 
      tipAmount, 
      tipPercentage, 
      paymentMethod, 
      serverId 
    } = req.body
    
    // Validate tip amount
    if (tipAmount < 0) {
      return res.status(400).json({ error: 'Tip amount cannot be negative' })
    }
    
    // Check if order exists and can be closed
    const orderCheck = await pool.query(
      'SELECT * FROM orders WHERE id = $1',
      [id]
    )
    
    if (orderCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' })
    }
    
    const order = orderCheck.rows[0]
    
    if (order.status === 'closed') {
      return res.status(400).json({ error: 'Order is already closed' })
    }
    
    if (!['completed', 'ready'].includes(order.status)) {
      return res.status(400).json({ error: 'Order must be completed before closing' })
    }
    
    // Verify server authorization
    const isServer = req.user.role === 'server'
    const isManager = ['manager', 'owner'].includes(req.user.role)
    const isAssignedServer = serverId ? serverId === req.user.id : order.created_by === req.user.id
    
    if (!isManager && !isServer) {
      return res.status(403).json({ error: 'Only servers and managers can close orders' })
    }
    
    if (isServer && !isAssignedServer && !isManager) {
      return res.status(403).json({ error: 'You can only close orders you are assigned to' })
    }
    
    // Calculate tip percentage if not provided
    let calculatedTipPercentage = tipPercentage
    if (!calculatedTipPercentage && tipAmount > 0) {
      calculatedTipPercentage = (tipAmount / order.total_amount) * 100
    }
    
    // Update order with tip information
    const result = await pool.query(`
      UPDATE orders 
      SET 
        status = 'closed',
        tip_amount = $1,
        tip_percentage = $2,
        payment_method = $3,
        server_id = $4,
        closed_by = $5,
        closed_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $6
      RETURNING *
    `, [
      tipAmount || 0,
      calculatedTipPercentage,
      paymentMethod,
      serverId || req.user.id,
      req.user.id,
      id
    ])
    
    const closedOrder = result.rows[0]
    
    // Emit socket event for real-time updates
    const io = req.app.get('io')
    if (io) {
      console.log(`💰 BROADCASTING ORDER CLOSURE:`, id)
      io.emit('order-closed', {
        orderId: parseInt(id),
        tipAmount: tipAmount || 0,
        tipPercentage: calculatedTipPercentage,
        closedBy: req.user.firstName + ' ' + req.user.lastName,
        closedAt: closedOrder.closed_at
      })
    }
    
    res.json({
      message: 'Order closed successfully',
      order: closedOrder
    })
    
  } catch (error) {
    console.error('Error closing order:', error)
    res.status(500).json({ error: 'Failed to close order' })
  }
})

export default router
