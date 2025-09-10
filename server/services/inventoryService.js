import { pool } from '../database/connection.js'

/**
 * Check if a menu item has sufficient inventory to be available
 * @param {number} menuItemId - The menu item to check
 * @returns {Promise<{isAvailable: boolean, missingItems: Array}>}
 */
export const checkMenuItemAvailability = async (menuItemId) => {
  try {
    const result = await pool.query(`
      SELECT 
        mi.inventory_item_id,
        mi.quantity_required,
        ii.name as inventory_name,
        ii.current_stock,
        ii.unit,
        (ii.current_stock >= mi.quantity_required) as has_sufficient_stock
      FROM menu_item_inventory mi
      JOIN inventory_items ii ON mi.inventory_item_id = ii.id
      WHERE mi.menu_item_id = $1
    `, [menuItemId])

    const inventoryRequirements = result.rows
    
    if (inventoryRequirements.length === 0) {
      // No inventory requirements means always available
      return { isAvailable: true, missingItems: [] }
    }

    const missingItems = inventoryRequirements.filter(item => !item.has_sufficient_stock)
    const isAvailable = missingItems.length === 0

    return {
      isAvailable,
      missingItems: missingItems.map(item => ({
        name: item.inventory_name,
        required: item.quantity_required,
        available: item.current_stock,
        unit: item.unit
      }))
    }
  } catch (error) {
    console.error('Error checking menu item availability:', error)
    return { isAvailable: false, missingItems: [] }
  }
}

/**
 * Update menu item availability and manage 86 list automatically
 * @param {number} menuItemId - The menu item to update
 * @param {Object} io - Socket.io instance for real-time updates
 * @param {number} userId - User ID for audit logging (optional)
 * @returns {Promise<boolean>} - Whether the item is available
 */
export const updateMenuItemAvailability = async (menuItemId, io = null, userId = null) => {
  const client = await pool.connect()
  
  try {
    await client.query('BEGIN')

    // Check availability
    const availabilityCheck = await checkMenuItemAvailability(menuItemId)
    const { isAvailable, missingItems } = availabilityCheck

    // Get current menu item info
    const menuItemResult = await client.query(
      'SELECT id, name, is_available FROM menu_items WHERE id = $1',
      [menuItemId]
    )

    if (menuItemResult.rows.length === 0) {
      await client.query('ROLLBACK')
      return false
    }

    const menuItem = menuItemResult.rows[0]
    const currentlyAvailable = menuItem.is_available

    // Update menu item availability
    await client.query(
      'UPDATE menu_items SET is_available = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [isAvailable, menuItemId]
    )

    // Manage 86 list
    if (!isAvailable && currentlyAvailable) {
      // Item became unavailable - add to 86 list
      const reason = `Auto-86'd: Insufficient inventory - ${missingItems.map(item => 
        `${item.name} (need ${item.required} ${item.unit}, have ${item.available})`
      ).join(', ')}`

      // Remove any existing manual 86 entries
      await client.query(
        'UPDATE eighty_six_list SET removed_at = CURRENT_TIMESTAMP WHERE menu_item_id = $1 AND removed_at IS NULL',
        [menuItemId]
      )

      // Add new auto-generated 86 entry
      await client.query(`
        INSERT INTO eighty_six_list (menu_item_id, reason, created_by, is_auto_generated)
        VALUES ($1, $2, $3, true)
      `, [menuItemId, reason, userId])

      console.log(`🚫 AUTO-86: ${menuItem.name} - ${reason}`)

    } else if (isAvailable && !currentlyAvailable) {
      // Item became available - remove from 86 list
      await client.query(
        'UPDATE eighty_six_list SET removed_at = CURRENT_TIMESTAMP WHERE menu_item_id = $1 AND removed_at IS NULL AND is_auto_generated = true',
        [menuItemId]
      )

      console.log(`✅ AUTO-RESTORE: ${menuItem.name} - Inventory replenished`)
    }

    await client.query('COMMIT')

    // Emit real-time updates
    if (io && (isAvailable !== currentlyAvailable)) {
      const updatedMenuItem = await getMenuItemWithAvailability(menuItemId)
      const current86List = await getCurrent86List()

      // Broadcast to all connected clients
      io.emit('menu-update', {
        type: isAvailable ? 'item-restored' : 'item-86ed',
        menuItem: updatedMenuItem,
        eightySixList: current86List,
        timestamp: new Date().toISOString()
      })

      // Send specific alerts to staff
      io.to('role-chef').to('role-manager').to('role-owner').emit('inventory-alert', {
        type: isAvailable ? 'item-restored' : 'item-86ed',
        menuItem: updatedMenuItem,
        reason: missingItems.length > 0 ? `Insufficient inventory: ${missingItems.map(i => i.name).join(', ')}` : 'Inventory replenished',
        timestamp: new Date().toISOString()
      })
    }

    return isAvailable

  } catch (error) {
    await client.query('ROLLBACK')
    console.error('Error updating menu item availability:', error)
    return false
  } finally {
    client.release()
  }
}

/**
 * Update availability for all menu items
 * @param {Object} io - Socket.io instance for real-time updates
 * @param {number} userId - User ID for audit logging (optional)
 * @returns {Promise<Object>} - Summary of changes
 */
export const updateAllMenuItemAvailability = async (io = null, userId = null) => {
  try {
    const menuItemsResult = await pool.query('SELECT id, name FROM menu_items')
    const menuItems = menuItemsResult.rows

    const results = {
      total: menuItems.length,
      available: 0,
      unavailable: 0,
      changed: []
    }

    for (const item of menuItems) {
      const wasAvailable = await pool.query(
        'SELECT is_available FROM menu_items WHERE id = $1',
        [item.id]
      )
      const previouslyAvailable = wasAvailable.rows[0]?.is_available

      const isNowAvailable = await updateMenuItemAvailability(item.id, null, userId)
      
      if (isNowAvailable) {
        results.available++
      } else {
        results.unavailable++
      }

      if (previouslyAvailable !== isNowAvailable) {
        results.changed.push({
          id: item.id,
          name: item.name,
          previouslyAvailable,
          nowAvailable: isNowAvailable
        })
      }
    }

    // Emit bulk update if there were changes
    if (io && results.changed.length > 0) {
      const updatedMenu = await getFullMenuWithAvailability()
      const current86List = await getCurrent86List()

      io.emit('menu-bulk-update', {
        menu: updatedMenu,
        eightySixList: current86List,
        summary: results,
        timestamp: new Date().toISOString()
      })
    }

    console.log(`📊 BULK AVAILABILITY UPDATE: ${results.changed.length} items changed, ${results.available} available, ${results.unavailable} unavailable`)

    return results

  } catch (error) {
    console.error('Error updating all menu item availability:', error)
    return { total: 0, available: 0, unavailable: 0, changed: [] }
  }
}

/**
 * Process order completion and update inventory/availability
 * @param {number} orderId - The completed order ID
 * @param {Object} io - Socket.io instance for real-time updates
 * @returns {Promise<boolean>} - Whether processing was successful
 */
export const processOrderCompletion = async (orderId, io = null) => {
  const client = await pool.connect()
  
  try {
    await client.query('BEGIN')

    // Get order details
    const orderResult = await client.query(
      'SELECT items FROM orders WHERE id = $1',
      [orderId]
    )

    if (orderResult.rows.length === 0) {
      await client.query('ROLLBACK')
      return false
    }

    const orderItems = JSON.parse(orderResult.rows[0].items)
    const affectedMenuItems = new Set()

    // Deduct inventory for each order item
    for (const orderItem of orderItems) {
      const menuItemId = orderItem.id
      const quantity = orderItem.quantity || 1

      affectedMenuItems.add(menuItemId)

      // Get inventory requirements for this menu item
      const inventoryResult = await client.query(`
        SELECT inventory_item_id, quantity_required
        FROM menu_item_inventory
        WHERE menu_item_id = $1
      `, [menuItemId])

      // Deduct inventory
      for (const inv of inventoryResult.rows) {
        const totalRequired = inv.quantity_required * quantity

        await client.query(`
          UPDATE inventory_items 
          SET current_stock = GREATEST(0, current_stock - $1), updated_at = CURRENT_TIMESTAMP
          WHERE id = $2
        `, [totalRequired, inv.inventory_item_id])

        // Log inventory change
        console.log(`📦 INVENTORY DEDUCT: Item ${inv.inventory_item_id} reduced by ${totalRequired}`)
      }
    }

    await client.query('COMMIT')

    // Update availability for all affected menu items
    for (const menuItemId of affectedMenuItems) {
      await updateMenuItemAvailability(menuItemId, io, null)
    }

    console.log(`✅ ORDER PROCESSED: Order ${orderId} completed, inventory updated`)
    return true

  } catch (error) {
    await client.query('ROLLBACK')
    console.error('Error processing order completion:', error)
    return false
  } finally {
    client.release()
  }
}

/**
 * Process inventory addition and update availability
 * @param {number} inventoryItemId - The inventory item that was restocked
 * @param {Object} io - Socket.io instance for real-time updates
 * @returns {Promise<boolean>} - Whether processing was successful
 */
export const processInventoryAddition = async (inventoryItemId, io = null) => {
  try {
    // Find all menu items that use this inventory item
    const affectedMenuItemsResult = await pool.query(`
      SELECT DISTINCT menu_item_id
      FROM menu_item_inventory
      WHERE inventory_item_id = $1
    `, [inventoryItemId])

    const affectedMenuItems = affectedMenuItemsResult.rows.map(row => row.menu_item_id)

    // Update availability for all affected menu items
    for (const menuItemId of affectedMenuItems) {
      await updateMenuItemAvailability(menuItemId, io, null)
    }

    console.log(`📦 INVENTORY RESTOCKED: Updated availability for ${affectedMenuItems.length} menu items`)
    return true

  } catch (error) {
    console.error('Error processing inventory addition:', error)
    return false
  }
}

/**
 * Helper functions for getting menu and 86 list data
 */
export const getMenuItemWithAvailability = async (menuItemId) => {
  const result = await pool.query(`
    SELECT 
      m.*,
      CASE 
        WHEN e.id IS NOT NULL AND e.removed_at IS NULL THEN false
        ELSE m.is_available
      END as effective_availability,
      e.reason as eighty_six_reason,
      e.is_auto_generated
    FROM menu_items m
    LEFT JOIN eighty_six_list e ON m.id = e.menu_item_id AND e.removed_at IS NULL
    WHERE m.id = $1
  `, [menuItemId])

  return result.rows[0] || null
}

export const getFullMenuWithAvailability = async () => {
  const result = await pool.query(`
    SELECT 
      m.*,
      CASE 
        WHEN e.id IS NOT NULL AND e.removed_at IS NULL THEN false
        ELSE m.is_available
      END as effective_availability,
      e.reason as eighty_six_reason,
      e.is_auto_generated
    FROM menu_items m
    LEFT JOIN eighty_six_list e ON m.id = e.menu_item_id AND e.removed_at IS NULL
    ORDER BY m.category, m.name
  `)

  return result.rows
}

export const getCurrent86List = async () => {
  const result = await pool.query(`
    SELECT 
      e.id as eighty_six_id,
      m.id as menu_item_id,
      m.name,
      m.category,
      e.reason,
      e.is_auto_generated,
      e.created_at,
      u.first_name as created_by_name
    FROM eighty_six_list e
    JOIN menu_items m ON e.menu_item_id = m.id
    LEFT JOIN users u ON e.created_by = u.id
    WHERE e.removed_at IS NULL
    ORDER BY e.created_at DESC
  `)

  return result.rows
}
