import express from 'express'
import { pool } from '../database/connection.js'
import { 
  requireAuth,
  requireInventoryAccess,
  requireKitchenStaff,
  requireManagement,
  auditLog
} from '../middleware/auth.js'
import { 
  updateMenuItemAvailability,
  updateAllMenuItemAvailability,
  processInventoryAddition
} from '../services/inventoryService.js'

const router = express.Router()

// Get all inventory items (requires authentication)
router.get('/', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        id,
        name,
        description,
        category,
        current_stock,
        par_level,
        unit,
        CASE 
          WHEN current_stock <= par_level THEN true
          ELSE false
        END as is_low_stock,
        created_at,
        updated_at
      FROM inventory_items
      ORDER BY category, name
    `)

    res.json(result.rows)
  } catch (error) {
    console.error('Error fetching inventory:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Get low stock items (kitchen staff and management)
router.get('/low-stock', requireKitchenStaff, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        id,
        name,
        description,
        category,
        current_stock,
        par_level,
        unit
      FROM inventory_items
      WHERE current_stock <= par_level
      ORDER BY (current_stock - par_level) ASC
    `)

    res.json(result.rows)
  } catch (error) {
    console.error('Error fetching low stock items:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Update inventory item stock (chef, manager, or owner only)
router.put('/:itemId/stock', requireInventoryAccess, auditLog('UPDATE_INVENTORY_STOCK'), async (req, res) => {
  try {
    const { itemId } = req.params
    const { currentStock } = req.body

    if (currentStock === undefined || currentStock < 0) {
      return res.status(400).json({ error: 'Valid current stock amount required' })
    }

    const result = await pool.query(`
      UPDATE inventory_items 
      SET current_stock = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING id, name, current_stock, par_level
    `, [currentStock, itemId])

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Inventory item not found' })
    }

    const updatedItem = result.rows[0]
    
    // Check if item is now low stock
    if (updatedItem.current_stock <= updatedItem.par_level) {
      // In a real app, this would trigger a socket.io event
      console.log(`LOW STOCK ALERT: ${updatedItem.name} is below par level`)
    }

    // Update menu item availability for items that use this inventory
    const io = req.app.get('io') // Get socket.io instance from app
    await processInventoryAddition(itemId, io)

    res.json({
      message: 'Stock updated successfully',
      item: updatedItem
    })

  } catch (error) {
    console.error('Error updating inventory stock:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Update par level for inventory item (management only)
router.put('/:itemId/par-level', requireManagement, auditLog('UPDATE_PAR_LEVEL'), async (req, res) => {
  try {
    const { itemId } = req.params
    const { parLevel } = req.body

    if (parLevel === undefined || parLevel < 0) {
      return res.status(400).json({ error: 'Valid par level required' })
    }

    const result = await pool.query(`
      UPDATE inventory_items 
      SET par_level = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING id, name, current_stock, par_level
    `, [parLevel, itemId])

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Inventory item not found' })
    }

    res.json({
      message: 'Par level updated successfully',
      item: result.rows[0]
    })

  } catch (error) {
    console.error('Error updating par level:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Add new inventory item (management only)
router.post('/', requireManagement, auditLog('CREATE_INVENTORY_ITEM'), async (req, res) => {
  try {
    const { name, description, category, currentStock, parLevel, unit } = req.body

    if (!name || !category || currentStock === undefined || parLevel === undefined) {
      return res.status(400).json({ error: 'Name, category, current stock, and par level are required' })
    }

    const result = await pool.query(`
      INSERT INTO inventory_items (name, description, category, current_stock, par_level, unit)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [name, description, category, currentStock, parLevel, unit || 'each'])

    res.status(201).json({
      message: 'Inventory item created successfully',
      item: result.rows[0]
    })

    // Update menu availability after adding new inventory item
    const io = req.app.get('io')
    await processInventoryAddition(result.rows[0].id, io)

  } catch (error) {
    console.error('Error creating inventory item:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Get inventory by category (requires authentication)
router.get('/category/:category', requireAuth, async (req, res) => {
  try {
    const { category } = req.params
    
    const result = await pool.query(`
      SELECT 
        id,
        name,
        description,
        category,
        current_stock,
        par_level,
        unit,
        CASE 
          WHEN current_stock <= par_level THEN true
          ELSE false
        END as is_low_stock
      FROM inventory_items
      WHERE category = $1
      ORDER BY name
    `, [category])

    res.json(result.rows)
  } catch (error) {
    console.error('Error fetching inventory by category:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Get menu item inventory relationships
router.get('/menu-relationships', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        mi.id,
        mi.menu_item_id,
        mi.inventory_item_id,
        mi.quantity_required,
        m.name as menu_item_name,
        m.category as menu_category,
        ii.name as inventory_item_name,
        ii.unit,
        ii.current_stock
      FROM menu_item_inventory mi
      JOIN menu_items m ON mi.menu_item_id = m.id
      JOIN inventory_items ii ON mi.inventory_item_id = ii.id
      ORDER BY m.category, m.name, ii.name
    `)

    res.json(result.rows)
  } catch (error) {
    console.error('Error fetching menu relationships:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Add menu item inventory relationship (management only)
router.post('/menu-relationships', requireManagement, auditLog('CREATE_MENU_INVENTORY_RELATIONSHIP'), async (req, res) => {
  try {
    const { menuItemId, inventoryItemId, quantityRequired } = req.body

    if (!menuItemId || !inventoryItemId || !quantityRequired) {
      return res.status(400).json({ error: 'Menu item ID, inventory item ID, and quantity required are required' })
    }

    const result = await pool.query(`
      INSERT INTO menu_item_inventory (menu_item_id, inventory_item_id, quantity_required)
      VALUES ($1, $2, $3)
      RETURNING *
    `, [menuItemId, inventoryItemId, quantityRequired])

    // Update menu item availability
    const io = req.app.get('io')
    await updateMenuItemAvailability(menuItemId, io, req.user.id)

    res.status(201).json({
      message: 'Menu item inventory relationship created successfully',
      relationship: result.rows[0]
    })

  } catch (error) {
    if (error.code === '23505') { // Unique constraint violation
      return res.status(409).json({ error: 'Relationship already exists' })
    }
    console.error('Error creating menu inventory relationship:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Update menu item inventory relationship (management only)
router.put('/menu-relationships/:id', requireManagement, auditLog('UPDATE_MENU_INVENTORY_RELATIONSHIP'), async (req, res) => {
  try {
    const { id } = req.params
    const { quantityRequired } = req.body

    if (!quantityRequired || quantityRequired <= 0) {
      return res.status(400).json({ error: 'Valid quantity required' })
    }

    const result = await pool.query(`
      UPDATE menu_item_inventory 
      SET quantity_required = $1
      WHERE id = $2
      RETURNING *
    `, [quantityRequired, id])

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Relationship not found' })
    }

    // Update menu item availability
    const io = req.app.get('io')
    await updateMenuItemAvailability(result.rows[0].menu_item_id, io, req.user.id)

    res.json({
      message: 'Relationship updated successfully',
      relationship: result.rows[0]
    })

  } catch (error) {
    console.error('Error updating menu inventory relationship:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Delete menu item inventory relationship (management only)
router.delete('/menu-relationships/:id', requireManagement, auditLog('DELETE_MENU_INVENTORY_RELATIONSHIP'), async (req, res) => {
  try {
    const { id } = req.params

    const result = await pool.query(`
      DELETE FROM menu_item_inventory 
      WHERE id = $1
      RETURNING menu_item_id
    `, [id])

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Relationship not found' })
    }

    // Update menu item availability
    const io = req.app.get('io')
    await updateMenuItemAvailability(result.rows[0].menu_item_id, io, req.user.id)

    res.json({ message: 'Relationship deleted successfully' })

  } catch (error) {
    console.error('Error deleting menu inventory relationship:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Force update all menu item availability (management only)
router.post('/update-availability', requireManagement, auditLog('FORCE_UPDATE_MENU_AVAILABILITY'), async (req, res) => {
  try {
    const io = req.app.get('io')
    const results = await updateAllMenuItemAvailability(io, req.user.id)

    res.json({
      message: 'Menu availability updated successfully',
      results
    })

  } catch (error) {
    console.error('Error updating menu availability:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router
