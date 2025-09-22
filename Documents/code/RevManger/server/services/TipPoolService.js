import { pool } from '../database/connection.js'

export class TipPoolService {
  
  /**
   * Calculate and distribute tips for a specific date
   * @param {Date} shiftDate - The date to calculate tips for
   * @param {number} distributionRuleId - The ID of the distribution rule to use
   * @param {number} calculatedBy - The user ID performing the calculation
   */
  static async calculateTipPool(shiftDate, distributionRuleId, calculatedBy) {
    const client = await pool.connect()
    
    try {
      await client.query('BEGIN')
      
      // Get the distribution rule
      const ruleResult = await client.query(
        'SELECT * FROM tip_distribution_rules WHERE id = $1 AND is_active = true',
        [distributionRuleId]
      )
      
      if (ruleResult.rows.length === 0) {
        throw new Error('Distribution rule not found or inactive')
      }
      
      const distributionRule = ruleResult.rows[0]
      
      // Get all closed orders for the date
      const ordersResult = await client.query(`
        SELECT 
          o.*,
          u.role as server_role,
          u.first_name,
          u.last_name
        FROM orders o
        LEFT JOIN users u ON o.server_id = u.id
        WHERE DATE(o.closed_at) = $1 
        AND o.status = 'closed'
        AND o.tip_amount > 0
      `, [shiftDate])
      
      const orders = ordersResult.rows
      const totalTips = orders.reduce((sum, order) => sum + parseFloat(order.tip_amount), 0)
      const totalOrders = orders.length
      
      if (totalTips === 0) {
        throw new Error('No tips found for the specified date')
      }
      
      // Get all shifts for the date
      const shiftsResult = await client.query(`
        SELECT 
          s.*,
          u.role,
          u.first_name,
          u.last_name,
          EXTRACT(EPOCH FROM (s.end_time - s.start_time)) / 3600 as calculated_hours
        FROM shifts s
        JOIN users u ON s.user_id = u.id
        WHERE DATE(s.start_time) = $1 
        AND s.status = 'completed'
        AND s.end_time IS NOT NULL
      `, [shiftDate])
      
      const shifts = shiftsResult.rows
      
      if (shifts.length === 0) {
        throw new Error('No completed shifts found for the specified date')
      }
      
      // Create or update tip pool record
      const tipPoolResult = await client.query(`
        INSERT INTO tip_pools (shift_date, total_tips, total_orders, distribution_rule_id, status, calculated_at)
        VALUES ($1, $2, $3, $4, 'calculated', CURRENT_TIMESTAMP)
        ON CONFLICT (shift_date) 
        DO UPDATE SET 
          total_tips = $2,
          total_orders = $3,
          distribution_rule_id = $4,
          status = 'calculated',
          calculated_at = CURRENT_TIMESTAMP
        RETURNING *
      `, [shiftDate, totalTips, totalOrders, distributionRuleId])
      
      const tipPool = tipPoolResult.rows[0]
      
      // Calculate distribution based on rules
      const payouts = await this.calculatePayouts(shifts, totalTips, distributionRule.rules)
      
      // Delete existing payouts for this tip pool
      await client.query('DELETE FROM tip_payouts WHERE tip_pool_id = $1', [tipPool.id])
      
      // Insert new payouts
      for (const payout of payouts) {
        await client.query(`
          INSERT INTO tip_payouts (
            tip_pool_id, user_id, shift_id, base_amount, bonus_amount, 
            total_amount, hours_worked, role, percentage_share, 
            calculation_details, status
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'pending')
        `, [
          tipPool.id,
          payout.userId,
          payout.shiftId,
          payout.baseAmount,
          payout.bonusAmount || 0,
          payout.totalAmount,
          payout.hoursWorked,
          payout.role,
          payout.percentageShare,
          JSON.stringify(payout.calculationDetails)
        ])
      }
      
      await client.query('COMMIT')
      
      return {
        tipPool,
        payouts,
        summary: {
          totalTips,
          totalOrders,
          totalStaff: shifts.length,
          distributionRule: distributionRule.name
        }
      }
      
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
  }
  
  /**
   * Calculate individual payouts based on distribution rules
   */
  static async calculatePayouts(shifts, totalTips, distributionRules) {
    const payouts = []
    
    // Group shifts by role
    const shiftsByRole = shifts.reduce((acc, shift) => {
      if (!acc[shift.role]) {
        acc[shift.role] = []
      }
      acc[shift.role].push(shift)
      return acc
    }, {})
    
    // Calculate total hours by role
    const totalHoursByRole = Object.entries(shiftsByRole).reduce((acc, [role, roleShifts]) => {
      acc[role] = roleShifts.reduce((sum, shift) => sum + parseFloat(shift.calculated_hours), 0)
      return acc
    }, {})
    
    const totalHours = Object.values(totalHoursByRole).reduce((sum, hours) => sum + hours, 0)
    
    // Apply distribution rules
    for (const [role, roleShifts] of Object.entries(shiftsByRole)) {
      const roleRule = distributionRules.roles?.[role] || distributionRules.default || { method: 'equal', multiplier: 1 }
      const roleHours = totalHoursByRole[role]
      
      let roleAllocation = 0
      
      // Calculate role allocation based on method
      switch (roleRule.method) {
        case 'percentage':
          roleAllocation = totalTips * (roleRule.percentage / 100)
          break
        case 'hours_weighted':
          roleAllocation = totalTips * (roleHours / totalHours) * roleRule.multiplier
          break
        case 'equal':
          roleAllocation = (totalTips / Object.keys(shiftsByRole).length) * roleRule.multiplier
          break
        default:
          roleAllocation = totalTips * (roleHours / totalHours)
      }
      
      // Distribute role allocation among individual staff
      for (const shift of roleShifts) {
        const hoursWorked = parseFloat(shift.calculated_hours)
        
        let individualShare = 0
        if (roleRule.individualMethod === 'equal') {
          individualShare = roleAllocation / roleShifts.length
        } else {
          // Default to hours-based distribution within role
          individualShare = roleAllocation * (hoursWorked / roleHours)
        }
        
        const percentageShare = totalTips > 0 ? (individualShare / totalTips) * 100 : 0
        
        payouts.push({
          userId: shift.user_id,
          shiftId: shift.id,
          baseAmount: individualShare,
          bonusAmount: 0, // Can be added for performance bonuses
          totalAmount: individualShare,
          hoursWorked,
          role: shift.role,
          percentageShare,
          calculationDetails: {
            method: roleRule.method,
            roleAllocation,
            roleHours,
            totalHours,
            multiplier: roleRule.multiplier,
            individualMethod: roleRule.individualMethod || 'hours_based'
          }
        })
      }
    }
    
    return payouts
  }
  
  /**
   * Finalize tip distribution (mark as distributed)
   */
  static async finalizeTipPool(tipPoolId, finalizedBy) {
    const client = await pool.connect()
    
    try {
      await client.query('BEGIN')
      
      // Update tip pool status
      await client.query(`
        UPDATE tip_pools 
        SET status = 'finalized', distributed_at = CURRENT_TIMESTAMP, finalized_by = $1
        WHERE id = $2
      `, [finalizedBy, tipPoolId])
      
      // Update all payouts to approved
      await client.query(`
        UPDATE tip_payouts 
        SET status = 'approved'
        WHERE tip_pool_id = $1 AND status = 'pending'
      `, [tipPoolId])
      
      await client.query('COMMIT')
      
      return { success: true }
      
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
  }
  
  /**
   * Get tip pool summary for a date range
   */
  static async getTipPoolSummary(startDate, endDate, userId = null) {
    let query = `
      SELECT 
        tp.*,
        tdr.name as rule_name,
        tdr.description as rule_description,
        COUNT(tpo.id) as payout_count,
        SUM(tpo.total_amount) as total_distributed,
        fu.first_name as finalized_by_name
      FROM tip_pools tp
      LEFT JOIN tip_distribution_rules tdr ON tp.distribution_rule_id = tdr.id
      LEFT JOIN tip_payouts tpo ON tp.id = tpo.tip_pool_id
      LEFT JOIN users fu ON tp.finalized_by = fu.id
      WHERE tp.shift_date BETWEEN $1 AND $2
    `
    
    const params = [startDate, endDate]
    
    if (userId) {
      query += ` AND EXISTS (
        SELECT 1 FROM tip_payouts 
        WHERE tip_pool_id = tp.id AND user_id = $3
      )`
      params.push(userId)
    }
    
    query += `
      GROUP BY tp.id, tdr.name, tdr.description, fu.first_name
      ORDER BY tp.shift_date DESC
    `
    
    const result = await pool.query(query, params)
    return result.rows
  }
  
  /**
   * Get individual user payouts
   */
  static async getUserPayouts(userId, startDate = null, endDate = null) {
    let query = `
      SELECT 
        tpo.*,
        tp.shift_date,
        tp.total_tips as pool_total,
        tp.total_orders,
        tp.status as pool_status,
        s.start_time,
        s.end_time,
        tdr.name as rule_name
      FROM tip_payouts tpo
      JOIN tip_pools tp ON tpo.tip_pool_id = tp.id
      LEFT JOIN shifts s ON tpo.shift_id = s.id
      LEFT JOIN tip_distribution_rules tdr ON tp.distribution_rule_id = tdr.id
      WHERE tpo.user_id = $1
    `
    
    const params = [userId]
    
    if (startDate && endDate) {
      query += ` AND tp.shift_date BETWEEN $2 AND $3`
      params.push(startDate, endDate)
    }
    
    query += ` ORDER BY tp.shift_date DESC`
    
    const result = await pool.query(query, params)
    return result.rows
  }
  
  /**
   * Create or update distribution rule
   */
  static async createDistributionRule(name, description, rules, createdBy) {
    const result = await pool.query(`
      INSERT INTO tip_distribution_rules (name, description, rules, created_by)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `, [name, description, JSON.stringify(rules), createdBy])
    
    return result.rows[0]
  }
  
  /**
   * Get all distribution rules
   */
  static async getDistributionRules() {
    const result = await pool.query(`
      SELECT 
        tdr.*,
        u.first_name as created_by_name
      FROM tip_distribution_rules tdr
      LEFT JOIN users u ON tdr.created_by = u.id
      WHERE tdr.is_active = true
      ORDER BY tdr.created_at DESC
    `)
    
    return result.rows
  }
  
  /**
   * Record a shift for tip calculation
   */
  static async recordShift(userId, startTime, endTime, role, location = 'main') {
    const hoursWorked = (new Date(endTime) - new Date(startTime)) / (1000 * 60 * 60)
    
    const result = await pool.query(`
      INSERT INTO shifts (user_id, start_time, end_time, role, location, hours_worked, status)
      VALUES ($1, $2, $3, $4, $5, $6, 'completed')
      RETURNING *
    `, [userId, startTime, endTime, role, location, hoursWorked])
    
    return result.rows[0]
  }
}
