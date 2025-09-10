import express from 'express'
import { pool } from '../database/connection.js'
import { 
  requireAuth,
  requireMenuManagement,
  auditLog
} from '../middleware/auth.js'
import { 
  getFullMenuWithAvailability,
  getCurrent86List,
  updateMenuItemAvailability
} from '../services/inventoryService.js'

const router = express.Router()

// Get all menu items (public endpoint)
router.get('/', async (req, res) => {
  try {
    const menuItems = await getFullMenuWithAvailability()
    res.json(menuItems)
  } catch (error) {
    console.error('Error fetching menu items:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Get menu items by category
router.get('/category/:category', async (req, res) => {
  try {
    const { category } = req.params
    
    const result = await pool.query(`
      SELECT 
        m.id,
        m.name,
        m.description,
        m.price,
        m.category,
        m.is_available,
        m.image_url,
        CASE 
          WHEN e.id IS NOT NULL AND e.removed_at IS NULL THEN false
          ELSE m.is_available
        END as is_available
      FROM menu_items m
      LEFT JOIN eighty_six_list e ON m.id = e.menu_item_id AND e.removed_at IS NULL
      WHERE m.category = $1
      ORDER BY m.name
    `, [category])

    res.json(result.rows)
  } catch (error) {
    console.error('Error fetching menu items by category:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Get 86'd items (requires authentication for detailed view)
router.get('/86-list', requireAuth, async (req, res) => {
  try {
    const eightySixList = await getCurrent86List()
    res.json(eightySixList)
  } catch (error) {
    console.error('Error fetching 86 list:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Add item to 86 list (chef, manager, or owner only)
router.post('/86/:itemId', requireMenuManagement, auditLog('ADD_TO_86_LIST'), async (req, res) => {
  try {
    const { itemId } = req.params
    const { reason } = req.body
    const createdBy = req.user.id // Use authenticated user ID

    // Check if item exists
    const menuItem = await pool.query(
      'SELECT id FROM menu_items WHERE id = $1',
      [itemId]
    )

    if (menuItem.rows.length === 0) {
      return res.status(404).json({ error: 'Menu item not found' })
    }

    // Check if item is already 86'd
    const existing86 = await pool.query(
      'SELECT id FROM eighty_six_list WHERE menu_item_id = $1 AND removed_at IS NULL',
      [itemId]
    )

    if (existing86.rows.length > 0) {
      return res.status(409).json({ error: 'Item is already 86\'d' })
    }

    // Add to 86 list
    const result = await pool.query(`
      INSERT INTO eighty_six_list (menu_item_id, reason, created_by)
      VALUES ($1, $2, $3)
      RETURNING id, created_at
    `, [itemId, reason || 'Out of stock', createdBy])

    res.status(201).json({
      message: 'Item added to 86 list',
      eightySixId: result.rows[0].id
    })

    // Emit real-time update
    const io = req.app.get('io')
    if (io) {
      const updatedMenu = await getFullMenuWithAvailability()
      const current86List = await getCurrent86List()

      io.emit('menu-update', {
        type: 'item-86ed',
        menuItemId: itemId,
        menu: updatedMenu,
        eightySixList: current86List,
        timestamp: new Date().toISOString()
      })
    }

  } catch (error) {
    console.error('Error adding item to 86 list:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Remove item from 86 list (chef, manager, or owner only)
router.delete('/86/:itemId', requireMenuManagement, auditLog('REMOVE_FROM_86_LIST'), async (req, res) => {
  try {
    const { itemId } = req.params

    const result = await pool.query(`
      UPDATE eighty_six_list 
      SET removed_at = CURRENT_TIMESTAMP
      WHERE menu_item_id = $1 AND removed_at IS NULL
      RETURNING id
    `, [itemId])

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Item not found in 86 list' })
    }

    res.json({ message: 'Item removed from 86 list' })

    // Emit real-time update
    const io = req.app.get('io')
    if (io) {
      const updatedMenu = await getFullMenuWithAvailability()
      const current86List = await getCurrent86List()

      io.emit('menu-update', {
        type: 'item-restored',
        menuItemId: itemId,
        menu: updatedMenu,
        eightySixList: current86List,
        timestamp: new Date().toISOString()
      })
    }

  } catch (error) {
    console.error('Error removing item from 86 list:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router
