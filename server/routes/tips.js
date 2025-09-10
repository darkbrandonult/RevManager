import express from 'express'
import { pool } from '../database/connection.js'
import { requireAuth } from '../middleware/auth.js'
import { requireRole } from '../middleware/rbac.js'
import { TipPoolService } from '../services/TipPoolService.js'

const router = express.Router()

// Close an order with tip information
router.post('/:id/close', requireAuth, async (req, res) => {
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
    req.app.get('io').emit('order-closed', {
      orderId: parseInt(id),
      tipAmount: tipAmount || 0,
      tipPercentage: calculatedTipPercentage,
      closedBy: req.user.name,
      closedAt: closedOrder.closed_at
    })
    
    res.json({
      message: 'Order closed successfully',
      order: closedOrder
    })
    
  } catch (error) {
    console.error('Error closing order:', error)
    res.status(500).json({ error: 'Failed to close order' })
  }
})

// Get tip pool summary
router.get('/tip-pools', requireAuth, async (req, res) => {
  try {
    const { startDate, endDate, userId } = req.query
    
    // Only allow users to see their own data unless they're managers
    const allowedUserId = ['manager', 'owner'].includes(req.user.role) 
      ? userId 
      : req.user.id
    
    const summary = await TipPoolService.getTipPoolSummary(
      startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      endDate || new Date().toISOString().split('T')[0],
      allowedUserId
    )
    
    res.json(summary)
    
  } catch (error) {
    console.error('Error fetching tip pools:', error)
    res.status(500).json({ error: 'Failed to fetch tip pools' })
  }
})

// Calculate tip pool for a specific date
router.post('/tip-pools/calculate', requireAuth, requireRole(['manager', 'owner']), async (req, res) => {
  try {
    const { shiftDate, distributionRuleId } = req.body
    
    if (!shiftDate || !distributionRuleId) {
      return res.status(400).json({ 
        error: 'Shift date and distribution rule ID are required' 
      })
    }
    
    const result = await TipPoolService.calculateTipPool(
      shiftDate, 
      distributionRuleId, 
      req.user.id
    )
    
    // Emit socket event to notify staff
    req.app.get('io').emit('tip-pool-calculated', {
      shiftDate,
      totalTips: result.summary.totalTips,
      totalStaff: result.summary.totalStaff,
      calculatedBy: req.user.name
    })
    
    res.json(result)
    
  } catch (error) {
    console.error('Error calculating tip pool:', error)
    res.status(500).json({ error: error.message || 'Failed to calculate tip pool' })
  }
})

// Finalize tip pool
router.put('/tip-pools/:id/finalize', requireAuth, requireRole(['manager', 'owner']), async (req, res) => {
  try {
    const { id } = req.params
    
    const result = await TipPoolService.finalizeTipPool(id, req.user.id)
    
    // Get tip pool details for notification
    const tipPoolResult = await pool.query(
      'SELECT * FROM tip_pools WHERE id = $1',
      [id]
    )
    
    if (tipPoolResult.rows.length > 0) {
      const tipPool = tipPoolResult.rows[0]
      
      // Notify all affected staff
      req.app.get('io').emit('tip-pool-finalized', {
        tipPoolId: parseInt(id),
        shiftDate: tipPool.shift_date,
        totalTips: tipPool.total_tips,
        finalizedBy: req.user.name
      })
    }
    
    res.json({ message: 'Tip pool finalized successfully' })
    
  } catch (error) {
    console.error('Error finalizing tip pool:', error)
    res.status(500).json({ error: 'Failed to finalize tip pool' })
  }
})

// Get user's personal tip history
router.get('/my-tips', requireAuth, async (req, res) => {
  try {
    const { startDate, endDate } = req.query
    
    const payouts = await TipPoolService.getUserPayouts(
      req.user.id,
      startDate,
      endDate
    )
    
    // Calculate summary statistics
    const summary = {
      totalPayouts: payouts.length,
      totalAmount: payouts.reduce((sum, payout) => sum + parseFloat(payout.total_amount), 0),
      avgAmount: payouts.length > 0 
        ? payouts.reduce((sum, payout) => sum + parseFloat(payout.total_amount), 0) / payouts.length 
        : 0,
      totalHours: payouts.reduce((sum, payout) => sum + parseFloat(payout.hours_worked || 0), 0),
      avgHourlyTips: 0
    }
    
    if (summary.totalHours > 0) {
      summary.avgHourlyTips = summary.totalAmount / summary.totalHours
    }
    
    res.json({
      payouts,
      summary
    })
    
  } catch (error) {
    console.error('Error fetching user tips:', error)
    res.status(500).json({ error: 'Failed to fetch tip history' })
  }
})

// Get distribution rules
router.get('/distribution-rules', requireAuth, requireRole(['manager', 'owner']), async (req, res) => {
  try {
    const rules = await TipPoolService.getDistributionRules()
    res.json(rules)
  } catch (error) {
    console.error('Error fetching distribution rules:', error)
    res.status(500).json({ error: 'Failed to fetch distribution rules' })
  }
})

// Create distribution rule
router.post('/distribution-rules', requireAuth, requireRole(['manager', 'owner']), async (req, res) => {
  try {
    const { name, description, rules } = req.body
    
    if (!name || !rules) {
      return res.status(400).json({ 
        error: 'Name and rules are required' 
      })
    }
    
    const rule = await TipPoolService.createDistributionRule(
      name,
      description,
      rules,
      req.user.id
    )
    
    res.status(201).json(rule)
    
  } catch (error) {
    console.error('Error creating distribution rule:', error)
    res.status(500).json({ error: 'Failed to create distribution rule' })
  }
})

// Record shift for tip calculation
router.post('/shifts', requireAuth, async (req, res) => {
  try {
    const { startTime, endTime, role, location } = req.body
    
    if (!startTime || !endTime || !role) {
      return res.status(400).json({ 
        error: 'Start time, end time, and role are required' 
      })
    }
    
    // Validate that user can record shifts for their role
    if (req.user.role !== role && !['manager', 'owner'].includes(req.user.role)) {
      return res.status(403).json({ 
        error: 'You can only record shifts for your own role' 
      })
    }
    
    const shift = await TipPoolService.recordShift(
      req.user.id,
      startTime,
      endTime,
      role,
      location
    )
    
    res.status(201).json(shift)
    
  } catch (error) {
    console.error('Error recording shift:', error)
    res.status(500).json({ error: 'Failed to record shift' })
  }
})

// Get pending tip disputes
router.get('/disputes', requireAuth, async (req, res) => {
  try {
    let query = `
      SELECT 
        td.*,
        tpo.total_amount,
        tp.shift_date,
        u.first_name as disputer_name,
        ru.first_name as resolver_name
      FROM tip_disputes td
      JOIN tip_payouts tpo ON td.payout_id = tpo.id
      JOIN tip_pools tp ON tpo.tip_pool_id = tp.id
      JOIN users u ON td.user_id = u.id
      LEFT JOIN users ru ON td.resolved_by = ru.id
    `
    
    const params = []
    
    // Users can only see their own disputes, managers can see all
    if (!['manager', 'owner'].includes(req.user.role)) {
      query += ` WHERE td.user_id = $1`
      params.push(req.user.id)
    }
    
    query += ` ORDER BY td.created_at DESC`
    
    const result = await pool.query(query, params)
    res.json(result.rows)
    
  } catch (error) {
    console.error('Error fetching disputes:', error)
    res.status(500).json({ error: 'Failed to fetch disputes' })
  }
})

// Create tip dispute
router.post('/disputes', requireAuth, async (req, res) => {
  try {
    const { payoutId, reason } = req.body
    
    if (!payoutId || !reason) {
      return res.status(400).json({ 
        error: 'Payout ID and reason are required' 
      })
    }
    
    // Verify the payout belongs to the user
    const payoutCheck = await pool.query(
      'SELECT * FROM tip_payouts WHERE id = $1 AND user_id = $2',
      [payoutId, req.user.id]
    )
    
    if (payoutCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Payout not found or not yours' })
    }
    
    // Check if dispute already exists
    const existingDispute = await pool.query(
      'SELECT * FROM tip_disputes WHERE payout_id = $1 AND user_id = $2',
      [payoutId, req.user.id]
    )
    
    if (existingDispute.rows.length > 0) {
      return res.status(409).json({ error: 'Dispute already exists for this payout' })
    }
    
    const result = await pool.query(`
      INSERT INTO tip_disputes (payout_id, user_id, reason)
      VALUES ($1, $2, $3)
      RETURNING *
    `, [payoutId, req.user.id, reason])
    
    // Notify managers
    req.app.get('io').emit('tip-dispute-created', {
      disputeId: result.rows[0].id,
      payoutId,
      userName: req.user.name,
      reason
    })
    
    res.status(201).json(result.rows[0])
    
  } catch (error) {
    console.error('Error creating dispute:', error)
    res.status(500).json({ error: 'Failed to create dispute' })
  }
})

export default router
