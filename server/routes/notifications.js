import express from 'express'
import { pool } from '../database/connection.js'
import { requireAuth, requireRoles } from '../middleware/auth.js'

const router = express.Router()

// Get all active notifications for current user's role
router.get('/', requireAuth, async (req, res) => {
  try {
    const userRole = req.user.role
    
    const query = `
      SELECT 
        id,
        type,
        title,
        message,
        severity,
        target_roles,
        metadata,
        is_dismissed,
        dismissed_by,
        dismissed_at,
        expires_at,
        created_at
      FROM notifications 
      WHERE (
        $1 = ANY(target_roles) OR 
        'all' = ANY(target_roles)
      )
      AND is_dismissed = false
      AND (expires_at IS NULL OR expires_at > NOW())
      ORDER BY 
        CASE severity 
          WHEN 'critical' THEN 1 
          WHEN 'warning' THEN 2 
          WHEN 'info' THEN 3 
        END,
        created_at DESC
    `
    
    const { rows } = await pool.query(query, [userRole])
    
    // Add user details for dismissed notifications
    for (let notification of rows) {
      if (notification.dismissed_by) {
        const userQuery = `
          SELECT first_name, last_name 
          FROM users 
          WHERE id = $1
        `
        const { rows: userRows } = await pool.query(userQuery, [notification.dismissed_by])
        if (userRows.length > 0) {
          notification.dismissed_by_name = `${userRows[0].first_name} ${userRows[0].last_name}`
        }
      }
    }
    
    res.json(rows)
  } catch (error) {
    console.error('Error fetching notifications:', error)
    res.status(500).json({ error: 'Failed to fetch notifications' })
  }
})

// Get notification counts by severity
router.get('/counts', requireAuth, async (req, res) => {
  try {
    const userRole = req.user.role
    
    const query = `
      SELECT 
        severity,
        COUNT(*) as count
      FROM notifications 
      WHERE (
        $1 = ANY(target_roles) OR 
        'all' = ANY(target_roles)
      )
      AND is_dismissed = false
      AND (expires_at IS NULL OR expires_at > NOW())
      GROUP BY severity
    `
    
    const { rows } = await pool.query(query, [userRole])
    
    const counts = {
      critical: 0,
      warning: 0,
      info: 0,
      total: 0
    }
    
    rows.forEach(row => {
      counts[row.severity] = parseInt(row.count)
      counts.total += parseInt(row.count)
    })
    
    res.json(counts)
  } catch (error) {
    console.error('Error fetching notification counts:', error)
    res.status(500).json({ error: 'Failed to fetch notification counts' })
  }
})

// Dismiss a notification (managers, chefs, owners only)
router.put('/:id/dismiss', requireAuth, requireRoles(['manager', 'chef', 'owner']), async (req, res) => {
  try {
    const notificationId = req.params.id
    const userId = req.user.id
    
    const query = `
      UPDATE notifications 
      SET 
        is_dismissed = true,
        dismissed_by = $1,
        dismissed_at = NOW()
      WHERE id = $2
      RETURNING *
    `
    
    const { rows } = await pool.query(query, [userId, notificationId])
    
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Notification not found' })
    }
    
    // Emit socket event for real-time update
    if (req.io) {
      req.io.emit('notification-dismissed', {
        notificationId: parseInt(notificationId),
        dismissedBy: {
          id: userId,
          name: `${req.user.first_name} ${req.user.last_name}`
        },
        timestamp: new Date().toISOString()
      })
    }
    
    res.json({ 
      message: 'Notification dismissed successfully',
      notification: rows[0]
    })
  } catch (error) {
    console.error('Error dismissing notification:', error)
    res.status(500).json({ error: 'Failed to dismiss notification' })
  }
})

// Dismiss all notifications for current user's role
router.put('/dismiss-all', requireAuth, requireRoles(['manager', 'chef', 'owner']), async (req, res) => {
  try {
    const userRole = req.user.role
    const userId = req.user.id
    
    const query = `
      UPDATE notifications 
      SET 
        is_dismissed = true,
        dismissed_by = $1,
        dismissed_at = NOW()
      WHERE (
        $2 = ANY(target_roles) OR 
        'all' = ANY(target_roles)
      )
      AND is_dismissed = false
      AND (expires_at IS NULL OR expires_at > NOW())
      RETURNING id
    `
    
    const { rows } = await pool.query(query, [userId, userRole])
    
    // Emit socket event for real-time update
    if (req.io) {
      req.io.emit('notifications-dismissed-all', {
        dismissedCount: rows.length,
        dismissedBy: {
          id: userId,
          name: `${req.user.first_name} ${req.user.last_name}`
        },
        timestamp: new Date().toISOString()
      })
    }
    
    res.json({ 
      message: `${rows.length} notifications dismissed successfully`,
      dismissedCount: rows.length
    })
  } catch (error) {
    console.error('Error dismissing all notifications:', error)
    res.status(500).json({ error: 'Failed to dismiss notifications' })
  }
})

// Create a manual notification (managers and owners only)
router.post('/', requireAuth, requireRoles(['manager', 'owner']), async (req, res) => {
  try {
    const { type, title, message, severity, target_roles, metadata, expires_hours } = req.body
    
    // Validate required fields
    if (!type || !title || !message) {
      return res.status(400).json({ error: 'Type, title, and message are required' })
    }
    
    // Set expiration time if provided
    let expires_at = null
    if (expires_hours && expires_hours > 0) {
      expires_at = new Date(Date.now() + expires_hours * 60 * 60 * 1000)
    }
    
    const query = `
      INSERT INTO notifications 
      (type, title, message, severity, target_roles, metadata, expires_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `
    
    const { rows } = await pool.query(query, [
      type || 'general',
      title,
      message,
      severity || 'info',
      target_roles || ['manager'],
      JSON.stringify(metadata || {}),
      expires_at
    ])
    
    // Emit socket event for real-time delivery
    if (req.io) {
      req.io.emit('notification-created', {
        notification: rows[0],
        createdBy: {
          id: req.user.id,
          name: `${req.user.first_name} ${req.user.last_name}`
        }
      })
    }
    
    res.status(201).json({
      message: 'Notification created successfully',
      notification: rows[0]
    })
  } catch (error) {
    console.error('Error creating notification:', error)
    res.status(500).json({ error: 'Failed to create notification' })
  }
})

// Get inventory-specific alerts
router.get('/inventory', requireAuth, async (req, res) => {
  try {
    const userRole = req.user.role
    
    const query = `
      SELECT 
        n.*,
        i.name as item_name,
        i.current_stock,
        i.par_level,
        i.unit,
        i.category
      FROM notifications n
      LEFT JOIN inventory_items i ON (n.metadata->>'inventory_item_id')::integer = i.id
      WHERE n.type = 'inventory_alert'
      AND (
        $1 = ANY(n.target_roles) OR 
        'all' = ANY(n.target_roles)
      )
      AND n.is_dismissed = false
      AND (n.expires_at IS NULL OR n.expires_at > NOW())
      ORDER BY n.severity DESC, n.created_at DESC
    `
    
    const { rows } = await pool.query(query, [userRole])
    
    res.json(rows)
  } catch (error) {
    console.error('Error fetching inventory notifications:', error)
    res.status(500).json({ error: 'Failed to fetch inventory notifications' })
  }
})

// Manually trigger inventory check (managers only)
router.post('/inventory/check', requireAuth, requireRoles(['manager', 'owner']), async (req, res) => {
  try {
    // Trigger manual inventory check
    if (req.inventoryMonitor) {
      await req.inventoryMonitor.triggerManualCheck()
    }
    
    res.json({ 
      message: 'Inventory check triggered successfully',
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Error triggering inventory check:', error)
    res.status(500).json({ error: 'Failed to trigger inventory check' })
  }
})

export default router
