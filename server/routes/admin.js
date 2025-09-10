import express from 'express'
import { pool } from '../database/connection.js'
import { requireAuth, requireRoles } from '../middleware/auth.js'
import bcrypt from 'bcryptjs'

const router = express.Router()

// Middleware to ensure only owners and managers can access admin routes
router.use(requireAuth)
router.use(requireRoles(['owner', 'manager']))

// Get overall system metrics and KPIs
router.get('/metrics', async (req, res) => {
  try {
    const { date } = req.query
    const targetDate = date ? new Date(date) : new Date()
    const todayStart = new Date(targetDate.setHours(0, 0, 0, 0))
    const todayEnd = new Date(targetDate.setHours(23, 59, 59, 999))
    const weekStart = new Date(todayStart.getTime() - 6 * 24 * 60 * 60 * 1000)

    // Today's revenue from tips and orders
    const revenueQuery = `
      WITH today_revenue AS (
        SELECT 
          COALESCE(SUM(CASE 
            WHEN o.created_at >= $1 AND o.created_at <= $2 
            THEN (o.total_amount + COALESCE(o.tip_amount, 0))
            ELSE 0 
          END), 0) as today_total,
          COALESCE(SUM(CASE 
            WHEN o.created_at >= $3 AND o.created_at < $1 
            THEN (o.total_amount + COALESCE(o.tip_amount, 0))
            ELSE 0 
          END), 0) as week_total
        FROM orders o
        WHERE o.status = 'completed'
      )
      SELECT 
        today_total,
        week_total,
        CASE 
          WHEN week_total > 0 
          THEN ROUND(((today_total - (week_total / 7)) / (week_total / 7)) * 100, 2)
          ELSE 0 
        END as revenue_change_percent
      FROM today_revenue
    `

    const { rows: revenueData } = await pool.query(revenueQuery, [todayStart, todayEnd, weekStart])

    // Table turnover rate (orders per table today)
    const turnoverQuery = `
      SELECT 
        COUNT(DISTINCT table_number) as active_tables,
        COUNT(*) as total_orders,
        CASE 
          WHEN COUNT(DISTINCT table_number) > 0 
          THEN ROUND(COUNT(*)::numeric / COUNT(DISTINCT table_number), 2)
          ELSE 0 
        END as turnover_rate
      FROM orders 
      WHERE created_at >= $1 AND created_at <= $2
      AND table_number IS NOT NULL
    `

    const { rows: turnoverData } = await pool.query(turnoverQuery, [todayStart, todayEnd])

    // Top selling menu items today
    const topItemsQuery = `
      SELECT 
        mi.name,
        mi.price,
        COUNT(oi.menu_item_id) as orders_count,
        SUM(oi.quantity) as total_quantity,
        SUM(oi.quantity * mi.price) as total_revenue
      FROM order_items oi
      JOIN menu_items mi ON oi.menu_item_id = mi.id
      JOIN orders o ON oi.order_id = o.id
      WHERE o.created_at >= $1 AND o.created_at <= $2
      GROUP BY mi.id, mi.name, mi.price
      ORDER BY total_quantity DESC
      LIMIT 5
    `

    const { rows: topItems } = await pool.query(topItemsQuery, [todayStart, todayEnd])

    // Staff performance metrics
    const staffMetricsQuery = `
      SELECT 
        COUNT(DISTINCT u.id) as total_staff,
        COUNT(DISTINCT CASE WHEN s.status = 'active' THEN u.id END) as active_staff,
        COALESCE(AVG(s.hours_worked), 0) as avg_hours_today,
        COALESCE(SUM(tp.amount), 0) as total_tips_today
      FROM users u
      LEFT JOIN shifts s ON u.id = s.user_id 
        AND s.start_time >= $1 AND s.start_time <= $2
      LEFT JOIN tip_payouts tp ON u.id = tp.user_id 
        AND tp.payout_date >= $1 AND tp.payout_date <= $2
      WHERE u.role IN ('server', 'chef', 'manager')
    `

    const { rows: staffData } = await pool.query(staffMetricsQuery, [todayStart, todayEnd])

    // Inventory alerts count
    const inventoryAlertsQuery = `
      SELECT 
        COUNT(*) as total_alerts,
        COUNT(*) FILTER (WHERE severity = 'critical') as critical_alerts,
        COUNT(*) FILTER (WHERE severity = 'warning') as warning_alerts
      FROM notifications 
      WHERE type = 'inventory_alert' 
      AND is_dismissed = false
      AND (expires_at IS NULL OR expires_at > NOW())
    `

    const { rows: alertsData } = await pool.query(inventoryAlertsQuery)

    res.json({
      revenue: {
        today: parseFloat(revenueData[0].today_total) || 0,
        weekTotal: parseFloat(revenueData[0].week_total) || 0,
        changePercent: parseFloat(revenueData[0].revenue_change_percent) || 0
      },
      tableTurnover: {
        activeTables: parseInt(turnoverData[0].active_tables) || 0,
        totalOrders: parseInt(turnoverData[0].total_orders) || 0,
        turnoverRate: parseFloat(turnoverData[0].turnover_rate) || 0
      },
      topItems: topItems.map(item => ({
        name: item.name,
        price: parseFloat(item.price),
        ordersCount: parseInt(item.orders_count),
        totalQuantity: parseInt(item.total_quantity),
        totalRevenue: parseFloat(item.total_revenue)
      })),
      staff: {
        totalStaff: parseInt(staffData[0].total_staff) || 0,
        activeStaff: parseInt(staffData[0].active_staff) || 0,
        avgHours: parseFloat(staffData[0].avg_hours_today) || 0,
        totalTips: parseFloat(staffData[0].total_tips_today) || 0
      },
      alerts: {
        totalAlerts: parseInt(alertsData[0].total_alerts) || 0,
        criticalAlerts: parseInt(alertsData[0].critical_alerts) || 0,
        warningAlerts: parseInt(alertsData[0].warning_alerts) || 0
      }
    })
  } catch (error) {
    console.error('Error fetching admin metrics:', error)
    res.status(500).json({ error: 'Failed to fetch metrics' })
  }
})

// Get sales data over time for charts
router.get('/sales-chart', async (req, res) => {
  try {
    const { period = '7days' } = req.query
    let interval, dateFormat, startDate

    switch (period) {
      case '24hours':
        interval = '1 hour'
        dateFormat = 'HH24:00'
        startDate = new Date(Date.now() - 24 * 60 * 60 * 1000)
        break
      case '7days':
        interval = '1 day'
        dateFormat = 'YYYY-MM-DD'
        startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        break
      case '30days':
        interval = '1 day'
        dateFormat = 'YYYY-MM-DD'
        startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        break
      default:
        interval = '1 day'
        dateFormat = 'YYYY-MM-DD'
        startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    }

    const salesQuery = `
      WITH time_series AS (
        SELECT generate_series(
          date_trunc('${period === '24hours' ? 'hour' : 'day'}', $1::timestamp),
          date_trunc('${period === '24hours' ? 'hour' : 'day'}', NOW()),
          '${interval}'::interval
        ) AS period_start
      ),
      sales_data AS (
        SELECT 
          date_trunc('${period === '24hours' ? 'hour' : 'day'}', o.created_at) as period_start,
          COUNT(*) as orders_count,
          COALESCE(SUM(o.total_amount), 0) as revenue,
          COALESCE(SUM(o.tip_amount), 0) as tips,
          COALESCE(SUM(o.total_amount + COALESCE(o.tip_amount, 0)), 0) as total_sales
        FROM orders o
        WHERE o.created_at >= $1
        AND o.status = 'completed'
        GROUP BY period_start
      )
      SELECT 
        to_char(ts.period_start, '${dateFormat}') as period,
        ts.period_start,
        COALESCE(sd.orders_count, 0) as orders_count,
        COALESCE(sd.revenue, 0) as revenue,
        COALESCE(sd.tips, 0) as tips,
        COALESCE(sd.total_sales, 0) as total_sales
      FROM time_series ts
      LEFT JOIN sales_data sd ON ts.period_start = sd.period_start
      ORDER BY ts.period_start
    `

    const { rows } = await pool.query(salesQuery, [startDate])

    res.json(rows.map(row => ({
      period: row.period,
      timestamp: row.period_start,
      ordersCount: parseInt(row.orders_count),
      revenue: parseFloat(row.revenue),
      tips: parseFloat(row.tips),
      totalSales: parseFloat(row.total_sales)
    })))
  } catch (error) {
    console.error('Error fetching sales chart data:', error)
    res.status(500).json({ error: 'Failed to fetch sales data' })
  }
})

// Get labor cost vs revenue data
router.get('/labor-analysis', async (req, res) => {
  try {
    const { period = '7days' } = req.query
    const startDate = period === '24hours' 
      ? new Date(Date.now() - 24 * 60 * 60 * 1000)
      : period === '30days'
      ? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

    const laborQuery = `
      WITH daily_data AS (
        SELECT 
          date_trunc('day', s.start_time) as day,
          SUM(COALESCE(s.hours_worked, 0)) as total_hours,
          -- Assume $15/hour average wage for calculation
          SUM(COALESCE(s.hours_worked, 0)) * 15 as estimated_labor_cost
        FROM shifts s
        WHERE s.start_time >= $1
        GROUP BY date_trunc('day', s.start_time)
      ),
      revenue_data AS (
        SELECT 
          date_trunc('day', o.created_at) as day,
          SUM(o.total_amount + COALESCE(o.tip_amount, 0)) as total_revenue
        FROM orders o
        WHERE o.created_at >= $1
        AND o.status = 'completed'
        GROUP BY date_trunc('day', o.created_at)
      )
      SELECT 
        to_char(COALESCE(ld.day, rd.day), 'YYYY-MM-DD') as date,
        COALESCE(ld.total_hours, 0) as total_hours,
        COALESCE(ld.estimated_labor_cost, 0) as labor_cost,
        COALESCE(rd.total_revenue, 0) as revenue,
        CASE 
          WHEN COALESCE(rd.total_revenue, 0) > 0 
          THEN ROUND((COALESCE(ld.estimated_labor_cost, 0) / rd.total_revenue) * 100, 2)
          ELSE 0 
        END as labor_cost_percentage
      FROM daily_data ld
      FULL OUTER JOIN revenue_data rd ON ld.day = rd.day
      ORDER BY COALESCE(ld.day, rd.day)
    `

    const { rows } = await pool.query(laborQuery, [startDate])

    res.json(rows.map(row => ({
      date: row.date,
      totalHours: parseFloat(row.total_hours),
      laborCost: parseFloat(row.labor_cost),
      revenue: parseFloat(row.revenue),
      laborCostPercentage: parseFloat(row.labor_cost_percentage)
    })))
  } catch (error) {
    console.error('Error fetching labor analysis:', error)
    res.status(500).json({ error: 'Failed to fetch labor analysis' })
  }
})

// Get all users for management
router.get('/users', async (req, res) => {
  try {
    const query = `
      SELECT 
        u.id,
        u.email,
        u.first_name,
        u.last_name,
        u.role,
        u.is_active,
        u.created_at,
        COUNT(s.id) as total_shifts,
        MAX(s.start_time) as last_shift,
        COALESCE(SUM(tp.amount), 0) as total_tips_earned
      FROM users u
      LEFT JOIN shifts s ON u.id = s.user_id
      LEFT JOIN tip_payouts tp ON u.id = tp.user_id
      WHERE u.role != 'customer'
      GROUP BY u.id, u.email, u.first_name, u.last_name, u.role, u.is_active, u.created_at
      ORDER BY u.created_at DESC
    `

    const { rows } = await pool.query(query)

    res.json(rows.map(user => ({
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      role: user.role,
      isActive: user.is_active,
      createdAt: user.created_at,
      totalShifts: parseInt(user.total_shifts),
      lastShift: user.last_shift,
      totalTipsEarned: parseFloat(user.total_tips_earned)
    })))
  } catch (error) {
    console.error('Error fetching users:', error)
    res.status(500).json({ error: 'Failed to fetch users' })
  }
})

// Create new user
router.post('/users', async (req, res) => {
  try {
    const { email, password, firstName, lastName, role } = req.body

    // Validate required fields
    if (!email || !password || !firstName || !lastName || !role) {
      return res.status(400).json({ error: 'All fields are required' })
    }

    // Validate role
    const validRoles = ['server', 'chef', 'manager', 'owner']
    if (!validRoles.includes(role)) {
      return res.status(400).json({ error: 'Invalid role' })
    }

    // Check if user already exists
    const existingUser = await pool.query('SELECT id FROM users WHERE email = $1', [email])
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'User with this email already exists' })
    }

    // Hash password
    const saltRounds = 10
    const hashedPassword = await bcrypt.hash(password, saltRounds)

    // Create user
    const query = `
      INSERT INTO users (email, password_hash, first_name, last_name, role)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, email, first_name, last_name, role, is_active, created_at
    `

    const { rows } = await pool.query(query, [email, hashedPassword, firstName, lastName, role])

    // Emit socket event for real-time update
    if (req.io) {
      req.io.emit('user-created', {
        user: rows[0],
        createdBy: {
          id: req.user.id,
          name: `${req.user.first_name} ${req.user.last_name}`
        }
      })
    }

    res.status(201).json({
      message: 'User created successfully',
      user: {
        id: rows[0].id,
        email: rows[0].email,
        firstName: rows[0].first_name,
        lastName: rows[0].last_name,
        role: rows[0].role,
        isActive: rows[0].is_active,
        createdAt: rows[0].created_at
      }
    })
  } catch (error) {
    console.error('Error creating user:', error)
    res.status(500).json({ error: 'Failed to create user' })
  }
})

// Update user
router.put('/users/:id', async (req, res) => {
  try {
    const userId = req.params.id
    const { email, firstName, lastName, role, isActive, newPassword } = req.body

    // Validate role if provided
    if (role) {
      const validRoles = ['server', 'chef', 'manager', 'owner']
      if (!validRoles.includes(role)) {
        return res.status(400).json({ error: 'Invalid role' })
      }
    }

    // Build update query dynamically
    const updates = []
    const values = []
    let paramCount = 1

    if (email !== undefined) {
      updates.push(`email = $${paramCount}`)
      values.push(email)
      paramCount++
    }

    if (firstName !== undefined) {
      updates.push(`first_name = $${paramCount}`)
      values.push(firstName)
      paramCount++
    }

    if (lastName !== undefined) {
      updates.push(`last_name = $${paramCount}`)
      values.push(lastName)
      paramCount++
    }

    if (role !== undefined) {
      updates.push(`role = $${paramCount}`)
      values.push(role)
      paramCount++
    }

    if (isActive !== undefined) {
      updates.push(`is_active = $${paramCount}`)
      values.push(isActive)
      paramCount++
    }

    if (newPassword) {
      const hashedPassword = await bcrypt.hash(newPassword, 10)
      updates.push(`password_hash = $${paramCount}`)
      values.push(hashedPassword)
      paramCount++
    }

    updates.push(`updated_at = NOW()`)
    values.push(userId)

    const query = `
      UPDATE users 
      SET ${updates.join(', ')}
      WHERE id = $${paramCount}
      RETURNING id, email, first_name, last_name, role, is_active, updated_at
    `

    const { rows } = await pool.query(query, values)

    if (rows.length === 0) {
      return res.status(404).json({ error: 'User not found' })
    }

    // Emit socket event for real-time update
    if (req.io) {
      req.io.emit('user-updated', {
        user: rows[0],
        updatedBy: {
          id: req.user.id,
          name: `${req.user.first_name} ${req.user.last_name}`
        }
      })
    }

    res.json({
      message: 'User updated successfully',
      user: {
        id: rows[0].id,
        email: rows[0].email,
        firstName: rows[0].first_name,
        lastName: rows[0].last_name,
        role: rows[0].role,
        isActive: rows[0].is_active,
        updatedAt: rows[0].updated_at
      }
    })
  } catch (error) {
    console.error('Error updating user:', error)
    res.status(500).json({ error: 'Failed to update user' })
  }
})

// Delete user (soft delete by setting inactive)
router.delete('/users/:id', async (req, res) => {
  try {
    const userId = req.params.id

    // Prevent deleting yourself
    if (parseInt(userId) === req.user.id) {
      return res.status(400).json({ error: 'Cannot delete your own account' })
    }

    const query = `
      UPDATE users 
      SET is_active = false, updated_at = NOW()
      WHERE id = $1
      RETURNING id, email, first_name, last_name
    `

    const { rows } = await pool.query(query, [userId])

    if (rows.length === 0) {
      return res.status(404).json({ error: 'User not found' })
    }

    // Emit socket event for real-time update
    if (req.io) {
      req.io.emit('user-deleted', {
        userId: parseInt(userId),
        deletedBy: {
          id: req.user.id,
          name: `${req.user.first_name} ${req.user.last_name}`
        }
      })
    }

    res.json({
      message: 'User deactivated successfully',
      user: rows[0]
    })
  } catch (error) {
    console.error('Error deleting user:', error)
    res.status(500).json({ error: 'Failed to delete user' })
  }
})

export default router
