import express from 'express'
import { pool } from '../database/connection.js'
import { requireAuth } from '../middleware/auth.js'
import { requireRole } from '../middleware/rbac.js'

const router = express.Router()

// Get all schedules with optional date filtering
router.get('/', requireAuth, async (req, res) => {
  try {
    const { startDate, endDate, userId, role } = req.query
    
    let query = `
      SELECT 
        s.id,
        s.date,
        s.start_time,
        s.end_time,
        s.role_required,
        s.location,
        s.notes,
        s.created_at,
        s.updated_at,
        us.id as assignment_id,
        us.status as assignment_status,
        us.assigned_at,
        u.id as user_id,
        u.name as user_name,
        u.email as user_email,
        u.role as user_role
      FROM shifts s
      LEFT JOIN user_shifts us ON s.id = us.shift_id
      LEFT JOIN users u ON us.user_id = u.id
      WHERE 1=1
    `
    
    const queryParams = []
    let paramIndex = 1
    
    if (startDate) {
      query += ` AND s.date >= $${paramIndex}`
      queryParams.push(startDate)
      paramIndex++
    }
    
    if (endDate) {
      query += ` AND s.date <= $${paramIndex}`
      queryParams.push(endDate)
      paramIndex++
    }
    
    if (userId) {
      query += ` AND us.user_id = $${paramIndex}`
      queryParams.push(userId)
      paramIndex++
    }
    
    if (role) {
      query += ` AND s.role_required = $${paramIndex}`
      queryParams.push(role)
      paramIndex++
    }
    
    query += ` ORDER BY s.date, s.start_time`
    
    const result = await pool.query(query, queryParams)
    
    // Group shifts by shift_id to handle multiple assignments
    const shiftsMap = new Map()
    
    result.rows.forEach(row => {
      const shiftId = row.id
      
      if (!shiftsMap.has(shiftId)) {
        shiftsMap.set(shiftId, {
          id: row.id,
          date: row.date,
          startTime: row.start_time,
          endTime: row.end_time,
          roleRequired: row.role_required,
          location: row.location,
          notes: row.notes,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
          assignments: []
        })
      }
      
      if (row.assignment_id) {
        shiftsMap.get(shiftId).assignments.push({
          id: row.assignment_id,
          status: row.assignment_status,
          assignedAt: row.assigned_at,
          user: {
            id: row.user_id,
            name: row.user_name,
            email: row.user_email,
            role: row.user_role
          }
        })
      }
    })
    
    const shifts = Array.from(shiftsMap.values())
    res.json(shifts)
    
  } catch (error) {
    console.error('Error fetching schedules:', error)
    res.status(500).json({ error: 'Failed to fetch schedules' })
  }
})

// Create a new shift
router.post('/', requireAuth, requireRole(['manager', 'owner']), async (req, res) => {
  try {
    const { date, startTime, endTime, roleRequired, location, notes } = req.body
    
    if (!date || !startTime || !endTime || !roleRequired) {
      return res.status(400).json({ 
        error: 'Date, start time, end time, and role are required' 
      })
    }
    
    const result = await pool.query(
      `INSERT INTO shifts (date, start_time, end_time, role_required, location, notes)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [date, startTime, endTime, roleRequired, location, notes]
    )
    
    const newShift = {
      id: result.rows[0].id,
      date: result.rows[0].date,
      startTime: result.rows[0].start_time,
      endTime: result.rows[0].end_time,
      roleRequired: result.rows[0].role_required,
      location: result.rows[0].location,
      notes: result.rows[0].notes,
      createdAt: result.rows[0].created_at,
      updatedAt: result.rows[0].updated_at,
      assignments: []
    }
    
    // Emit socket event for real-time updates
    req.app.get('io').emit('new-schedule', newShift)
    
    res.status(201).json(newShift)
    
  } catch (error) {
    console.error('Error creating shift:', error)
    res.status(500).json({ error: 'Failed to create shift' })
  }
})

// Assign user to a shift
router.post('/:shiftId/assign', requireAuth, requireRole(['manager', 'owner']), async (req, res) => {
  try {
    const { shiftId } = req.params
    const { userId } = req.body
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' })
    }
    
    // Check if shift exists
    const shiftResult = await pool.query('SELECT * FROM shifts WHERE id = $1', [shiftId])
    if (shiftResult.rows.length === 0) {
      return res.status(404).json({ error: 'Shift not found' })
    }
    
    // Check if user exists
    const userResult = await pool.query('SELECT * FROM users WHERE id = $1', [userId])
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' })
    }
    
    // Check if user is already assigned to this shift
    const existingAssignment = await pool.query(
      'SELECT * FROM user_shifts WHERE user_id = $1 AND shift_id = $2',
      [userId, shiftId]
    )
    
    if (existingAssignment.rows.length > 0) {
      return res.status(409).json({ error: 'User is already assigned to this shift' })
    }
    
    const assignmentResult = await pool.query(
      `INSERT INTO user_shifts (user_id, shift_id, assigned_by)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [userId, shiftId, req.user.id]
    )
    
    const assignment = {
      id: assignmentResult.rows[0].id,
      status: assignmentResult.rows[0].status,
      assignedAt: assignmentResult.rows[0].assigned_at,
      user: userResult.rows[0]
    }
    
    // Emit socket event for real-time updates
    req.app.get('io').emit('shift-assignment', {
      shiftId: parseInt(shiftId),
      assignment
    })
    
    res.status(201).json(assignment)
    
  } catch (error) {
    console.error('Error assigning user to shift:', error)
    res.status(500).json({ error: 'Failed to assign user to shift' })
  }
})

// Update shift assignment status
router.put('/assignments/:assignmentId/status', requireAuth, async (req, res) => {
  try {
    const { assignmentId } = req.params
    const { status } = req.body
    
    const validStatuses = ['scheduled', 'confirmed', 'completed', 'cancelled', 'no_show']
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ 
        error: 'Invalid status. Must be one of: ' + validStatuses.join(', ') 
      })
    }
    
    // Check if assignment exists and user has permission
    const assignmentQuery = `
      SELECT us.*, s.date, s.start_time, s.end_time, u.name as user_name
      FROM user_shifts us
      JOIN shifts s ON us.shift_id = s.id
      JOIN users u ON us.user_id = u.id
      WHERE us.id = $1
    `
    const assignmentResult = await pool.query(assignmentQuery, [assignmentId])
    
    if (assignmentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Assignment not found' })
    }
    
    const assignment = assignmentResult.rows[0]
    
    // Check permissions: users can only update their own assignments, managers can update any
    if (assignment.user_id !== req.user.id && !['manager', 'owner'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Unauthorized to update this assignment' })
    }
    
    const updateResult = await pool.query(
      'UPDATE user_shifts SET status = $1 WHERE id = $2 RETURNING *',
      [status, assignmentId]
    )
    
    // Emit socket event for real-time updates
    req.app.get('io').emit('shift-status-update', {
      assignmentId: parseInt(assignmentId),
      shiftId: assignment.shift_id,
      userId: assignment.user_id,
      status,
      userName: assignment.user_name
    })
    
    res.json({ 
      id: updateResult.rows[0].id,
      status: updateResult.rows[0].status,
      message: 'Assignment status updated successfully' 
    })
    
  } catch (error) {
    console.error('Error updating assignment status:', error)
    res.status(500).json({ error: 'Failed to update assignment status' })
  }
})

// Get shift swap requests
router.get('/swap-requests', requireAuth, async (req, res) => {
  try {
    const query = `
      SELECT 
        ss.*,
        ru.name as requesting_user_name,
        tu.name as target_user_name,
        s.date,
        s.start_time,
        s.end_time,
        s.role_required
      FROM shift_swaps ss
      JOIN users ru ON ss.requesting_user_id = ru.id
      JOIN users tu ON ss.target_user_id = tu.id
      JOIN shifts s ON ss.shift_id = s.id
      WHERE ss.target_user_id = $1 OR ss.requesting_user_id = $1
      ORDER BY ss.requested_at DESC
    `
    
    const result = await pool.query(query, [req.user.id])
    res.json(result.rows)
    
  } catch (error) {
    console.error('Error fetching swap requests:', error)
    res.status(500).json({ error: 'Failed to fetch swap requests' })
  }
})

// Create shift swap request
router.post('/swap-requests', requireAuth, async (req, res) => {
  try {
    const { targetUserId, shiftId, message } = req.body
    
    if (!targetUserId || !shiftId) {
      return res.status(400).json({ 
        error: 'Target user ID and shift ID are required' 
      })
    }
    
    // Verify the requesting user is assigned to this shift
    const assignmentCheck = await pool.query(
      'SELECT * FROM user_shifts WHERE user_id = $1 AND shift_id = $2',
      [req.user.id, shiftId]
    )
    
    if (assignmentCheck.rows.length === 0) {
      return res.status(400).json({ 
        error: 'You are not assigned to this shift' 
      })
    }
    
    const result = await pool.query(
      `INSERT INTO shift_swaps (requesting_user_id, target_user_id, shift_id, message)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [req.user.id, targetUserId, shiftId, message]
    )
    
    // Emit socket event to notify target user
    req.app.get('io').to(`user_${targetUserId}`).emit('swap-request', {
      id: result.rows[0].id,
      requestingUserId: req.user.id,
      requestingUserName: req.user.name,
      shiftId,
      message
    })
    
    res.status(201).json(result.rows[0])
    
  } catch (error) {
    console.error('Error creating swap request:', error)
    res.status(500).json({ error: 'Failed to create swap request' })
  }
})

// Respond to shift swap request
router.put('/swap-requests/:requestId', requireAuth, async (req, res) => {
  try {
    const { requestId } = req.params
    const { status } = req.body
    
    if (!['approved', 'denied'].includes(status)) {
      return res.status(400).json({ 
        error: 'Status must be either approved or denied' 
      })
    }
    
    // Verify the user is the target of this swap request
    const swapResult = await pool.query(
      'SELECT * FROM shift_swaps WHERE id = $1 AND target_user_id = $2',
      [requestId, req.user.id]
    )
    
    if (swapResult.rows.length === 0) {
      return res.status(404).json({ error: 'Swap request not found or unauthorized' })
    }
    
    const swapRequest = swapResult.rows[0]
    
    // Update swap request status
    await pool.query(
      'UPDATE shift_swaps SET status = $1, responded_at = CURRENT_TIMESTAMP, responded_by = $2 WHERE id = $3',
      [status, req.user.id, requestId]
    )
    
    // If approved, swap the shift assignments
    if (status === 'approved') {
      await pool.query('BEGIN')
      try {
        // Remove original assignment
        await pool.query(
          'DELETE FROM user_shifts WHERE user_id = $1 AND shift_id = $2',
          [swapRequest.requesting_user_id, swapRequest.shift_id]
        )
        
        // Create new assignment for target user
        await pool.query(
          'INSERT INTO user_shifts (user_id, shift_id, assigned_by) VALUES ($1, $2, $3)',
          [req.user.id, swapRequest.shift_id, req.user.id]
        )
        
        await pool.query('COMMIT')
        
        // Emit socket events
        req.app.get('io').emit('shift-swap-completed', {
          requestId: parseInt(requestId),
          shiftId: swapRequest.shift_id,
          originalUserId: swapRequest.requesting_user_id,
          newUserId: req.user.id
        })
        
      } catch (error) {
        await pool.query('ROLLBACK')
        throw error
      }
    }
    
    res.json({ message: `Swap request ${status} successfully` })
    
  } catch (error) {
    console.error('Error responding to swap request:', error)
    res.status(500).json({ error: 'Failed to respond to swap request' })
  }
})

// Get time off requests
router.get('/time-off', requireAuth, async (req, res) => {
  try {
    let query = `
      SELECT 
        tor.*,
        u.name as user_name,
        rb.name as reviewed_by_name
      FROM time_off_requests tor
      JOIN users u ON tor.user_id = u.id
      LEFT JOIN users rb ON tor.reviewed_by = rb.id
    `
    
    const queryParams = []
    
    // Managers can see all requests, users can only see their own
    if (!['manager', 'owner'].includes(req.user.role)) {
      query += ' WHERE tor.user_id = $1'
      queryParams.push(req.user.id)
    }
    
    query += ' ORDER BY tor.requested_at DESC'
    
    const result = await pool.query(query, queryParams)
    res.json(result.rows)
    
  } catch (error) {
    console.error('Error fetching time off requests:', error)
    res.status(500).json({ error: 'Failed to fetch time off requests' })
  }
})

// Create time off request
router.post('/time-off', requireAuth, async (req, res) => {
  try {
    const { startDate, endDate, reason } = req.body
    
    if (!startDate || !endDate) {
      return res.status(400).json({ 
        error: 'Start date and end date are required' 
      })
    }
    
    const result = await pool.query(
      `INSERT INTO time_off_requests (user_id, start_date, end_date, reason)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [req.user.id, startDate, endDate, reason]
    )
    
    // Notify managers
    req.app.get('io').emit('time-off-request', {
      id: result.rows[0].id,
      userId: req.user.id,
      userName: req.user.name,
      startDate,
      endDate,
      reason
    })
    
    res.status(201).json(result.rows[0])
    
  } catch (error) {
    console.error('Error creating time off request:', error)
    res.status(500).json({ error: 'Failed to create time off request' })
  }
})

// Review time off request
router.put('/time-off/:requestId', requireAuth, requireRole(['manager', 'owner']), async (req, res) => {
  try {
    const { requestId } = req.params
    const { status } = req.body
    
    if (!['approved', 'denied'].includes(status)) {
      return res.status(400).json({ 
        error: 'Status must be either approved or denied' 
      })
    }
    
    const result = await pool.query(
      `UPDATE time_off_requests 
       SET status = $1, reviewed_at = CURRENT_TIMESTAMP, reviewed_by = $2 
       WHERE id = $3
       RETURNING *`,
      [status, req.user.id, requestId]
    )
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Time off request not found' })
    }
    
    // Notify the requesting user
    const requestData = result.rows[0]
    req.app.get('io').to(`user_${requestData.user_id}`).emit('time-off-response', {
      requestId: parseInt(requestId),
      status,
      reviewedBy: req.user.name
    })
    
    res.json({ message: `Time off request ${status} successfully` })
    
  } catch (error) {
    console.error('Error reviewing time off request:', error)
    res.status(500).json({ error: 'Failed to review time off request' })
  }
})

export default router
