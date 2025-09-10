import { pool } from '../database/connection.js'

class InventoryMonitorService {
  constructor(io) {
    this.io = io
    this.checkInterval = 5 * 60 * 1000 // Check every 5 minutes
    this.isRunning = false
  }

  start() {
    if (this.isRunning) {
      console.log('📦 Inventory monitor already running')
      return
    }

    console.log('📦 Starting inventory low-stock monitoring...')
    this.isRunning = true
    
    // Run initial check
    this.checkLowStock()
    
    // Set up periodic checking
    this.intervalId = setInterval(() => {
      this.checkLowStock()
    }, this.checkInterval)
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }
    this.isRunning = false
    console.log('📦 Inventory monitoring stopped')
  }

  async checkLowStock() {
    try {
      console.log('📦 Checking for low stock items...')
      
      // Get all inventory items where current stock is at or below par level
      const lowStockQuery = `
        SELECT 
          id,
          name,
          description,
          category,
          current_stock,
          par_level,
          unit,
          updated_at
        FROM inventory_items 
        WHERE current_stock <= par_level 
        AND par_level > 0
        ORDER BY (current_stock / NULLIF(par_level, 0)) ASC
      `
      
      const { rows: lowStockItems } = await pool.query(lowStockQuery)
      
      if (lowStockItems.length === 0) {
        console.log('📦 No low stock items found')
        return
      }

      console.log(`📦 Found ${lowStockItems.length} low stock items`)

      // Process each low stock item
      for (const item of lowStockItems) {
        await this.processLowStockItem(item)
      }

      // Emit summary alert
      this.io.emit('inventory-summary', {
        totalLowStockItems: lowStockItems.length,
        timestamp: new Date().toISOString()
      })

    } catch (error) {
      console.error('❌ Error checking low stock:', error)
    }
  }

  async processLowStockItem(item) {
    try {
      // Check if we already have a recent alert for this item (within last hour)
      const existingAlertQuery = `
        SELECT id FROM notifications 
        WHERE type = 'inventory_alert' 
        AND metadata->>'inventory_item_id' = $1
        AND is_dismissed = false
        AND created_at > NOW() - INTERVAL '1 hour'
      `
      
      const { rows: existingAlerts } = await pool.query(existingAlertQuery, [item.id.toString()])
      
      if (existingAlerts.length > 0) {
        console.log(`📦 Recent alert already exists for ${item.name}`)
        return
      }

      // Calculate stock percentage
      const stockPercentage = item.par_level > 0 ? (item.current_stock / item.par_level) * 100 : 0
      
      // Determine severity based on stock level
      let severity = 'warning'
      if (stockPercentage <= 25) {
        severity = 'critical'
      } else if (stockPercentage <= 50) {
        severity = 'warning'
      }

      // Create notification
      const notification = {
        type: 'inventory_alert',
        title: `Low Stock Alert: ${item.name}`,
        message: `${item.name} is running low. Current stock: ${item.current_stock} ${item.unit}, Par level: ${item.par_level} ${item.unit}`,
        severity,
        target_roles: ['manager', 'chef', 'owner'],
        metadata: {
          inventory_item_id: item.id,
          inventory_item_name: item.name,
          current_stock: item.current_stock,
          par_level: item.par_level,
          unit: item.unit,
          category: item.category,
          stock_percentage: Math.round(stockPercentage),
          last_updated: item.updated_at
        },
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000) // Expire in 24 hours
      }

      // Insert notification into database
      const insertQuery = `
        INSERT INTO notifications 
        (type, title, message, severity, target_roles, metadata, expires_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `
      
      const { rows: [createdNotification] } = await pool.query(insertQuery, [
        notification.type,
        notification.title,
        notification.message,
        notification.severity,
        notification.target_roles,
        JSON.stringify(notification.metadata),
        notification.expires_at
      ])

      // Emit real-time socket event
      this.io.emit('inventory-alert', {
        notification: createdNotification,
        item: {
          id: item.id,
          name: item.name,
          current_stock: item.current_stock,
          par_level: item.par_level,
          unit: item.unit,
          category: item.category,
          stock_percentage: Math.round(stockPercentage)
        }
      })

      console.log(`📦 Low stock alert created for ${item.name} (${stockPercentage.toFixed(1)}% of par level)`)

    } catch (error) {
      console.error(`❌ Error processing low stock item ${item.name}:`, error)
    }
  }

  // Method to manually trigger a stock check (for testing or manual refresh)
  async triggerManualCheck() {
    console.log('📦 Manual inventory check triggered')
    await this.checkLowStock()
  }

  // Get current monitoring status
  getStatus() {
    return {
      isRunning: this.isRunning,
      checkInterval: this.checkInterval,
      lastCheck: this.lastCheckTime || null
    }
  }

  // Update check interval (in minutes)
  updateCheckInterval(minutes) {
    if (minutes < 1) {
      throw new Error('Check interval must be at least 1 minute')
    }
    
    this.checkInterval = minutes * 60 * 1000
    
    // Restart monitoring with new interval
    if (this.isRunning) {
      this.stop()
      this.start()
    }
    
    console.log(`📦 Inventory check interval updated to ${minutes} minutes`)
  }
}

export default InventoryMonitorService
