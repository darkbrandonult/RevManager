import { useState, useEffect } from 'react'

interface Order {
  id: number
  table: string
  items: string[]
  status: 'pending' | 'preparing' | 'ready' | 'served'
  time: string
  customer?: string
  special_instructions?: string
  priority: 'normal' | 'high' | 'urgent'
}

interface InventoryItem {
  id: number
  name: string
  category: 'protein' | 'vegetables' | 'dairy' | 'grains' | 'spices' | 'beverages' | 'other'
  current_stock: number
  unit: string
  min_threshold: number
  max_capacity: number
  cost_per_unit: number
  supplier: string
  last_updated: string
  status: 'in_stock' | 'low_stock' | 'out_of_stock'
}

interface KitchenNote {
  id: number
  author: string
  message: string
  type: 'info' | 'warning' | 'urgent' | 'maintenance'
  timestamp: string
  resolved: boolean
}

const SimpleKitchen = () => {
  const [orders, setOrders] = useState<Order[]>([])
  const [inventory, setInventory] = useState<InventoryItem[]>([])
  const [notes, setNotes] = useState<KitchenNote[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState<'orders' | 'inventory' | 'notes'>('orders')
  
  // Modal states
  const [showInventoryModal, setShowInventoryModal] = useState(false)
  const [showNoteModal, setShowNoteModal] = useState(false)
  const [editingInventory, setEditingInventory] = useState<InventoryItem | null>(null)
  
  // Form states
  const [inventoryForm, setInventoryForm] = useState({
    name: '',
    category: 'other' as InventoryItem['category'],
    current_stock: 0,
    unit: '',
    min_threshold: 0,
    max_capacity: 0,
    cost_per_unit: 0,
    supplier: ''
  })

  const [noteForm, setNoteForm] = useState({
    message: '',
    type: 'info' as KitchenNote['type']
  })

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      
      // Demo data - in real app, fetch from API
      setOrders([
        {
          id: 1,
          table: 'Table 5',
          items: ['Grilled Salmon', 'Caesar Salad', 'Garlic Bread'],
          status: 'preparing',
          time: '12:30 PM',
          customer: 'John Smith',
          special_instructions: 'No onions on salad',
          priority: 'normal'
        },
        {
          id: 2,
          table: 'Table 12',
          items: ['Ribeye Steak - Medium Rare', 'Mashed Potatoes', 'Asparagus'],
          status: 'pending',
          time: '12:45 PM',
          customer: 'Sarah Johnson',
          priority: 'high'
        },
        {
          id: 3,
          table: 'Take-out #105',
          items: ['Chicken Alfredo', 'Side Salad', 'Breadsticks'],
          status: 'ready',
          time: '1:00 PM',
          customer: 'Mike Wilson',
          priority: 'urgent'
        },
        {
          id: 4,
          table: 'Table 8',
          items: ['Fish Tacos (2)', 'Chips & Guac', 'Lime Rice'],
          status: 'pending',
          time: '1:15 PM',
          customer: 'Lisa Brown',
          special_instructions: 'Extra spicy',
          priority: 'normal'
        }
      ])

      setInventory([
        {
          id: 1,
          name: 'Fresh Salmon',
          category: 'protein',
          current_stock: 8,
          unit: 'lbs',
          min_threshold: 5,
          max_capacity: 20,
          cost_per_unit: 18.50,
          supplier: 'Ocean Fresh Seafood',
          last_updated: '2025-09-04T08:00:00',
          status: 'in_stock'
        },
        {
          id: 2,
          name: 'Ribeye Steaks',
          category: 'protein',
          current_stock: 3,
          unit: 'pieces',
          min_threshold: 5,
          max_capacity: 15,
          cost_per_unit: 28.00,
          supplier: 'Premium Meats Co',
          last_updated: '2025-09-04T08:00:00',
          status: 'low_stock'
        },
        {
          id: 3,
          name: 'Mixed Greens',
          category: 'vegetables',
          current_stock: 12,
          unit: 'bags',
          min_threshold: 8,
          max_capacity: 25,
          cost_per_unit: 3.50,
          supplier: 'Fresh Farm Produce',
          last_updated: '2025-09-04T08:00:00',
          status: 'in_stock'
        },
        {
          id: 4,
          name: 'Heavy Cream',
          category: 'dairy',
          current_stock: 0,
          unit: 'quarts',
          min_threshold: 4,
          max_capacity: 12,
          cost_per_unit: 4.25,
          supplier: 'Local Dairy Farm',
          last_updated: '2025-09-03T16:00:00',
          status: 'out_of_stock'
        },
        {
          id: 5,
          name: 'Olive Oil',
          category: 'other',
          current_stock: 6,
          unit: 'bottles',
          min_threshold: 3,
          max_capacity: 10,
          cost_per_unit: 12.00,
          supplier: 'Mediterranean Imports',
          last_updated: '2025-09-04T08:00:00',
          status: 'in_stock'
        },
        {
          id: 6,
          name: 'Parmesan Cheese',
          category: 'dairy',
          current_stock: 2,
          unit: 'wheels',
          min_threshold: 3,
          max_capacity: 8,
          cost_per_unit: 45.00,
          supplier: 'Italian Cheese Co',
          last_updated: '2025-09-04T08:00:00',
          status: 'low_stock'
        }
      ])

      setNotes([
        {
          id: 1,
          author: 'Chef Maria',
          message: 'Oven #2 temperature running 25°F low - maintenance scheduled for tomorrow',
          type: 'maintenance',
          timestamp: '2025-09-04T09:30:00',
          resolved: false
        },
        {
          id: 2,
          author: 'Line Cook Tom',
          message: 'Running low on ribeye steaks - need to reorder today',
          type: 'warning',
          timestamp: '2025-09-04T11:15:00',
          resolved: false
        },
        {
          id: 3,
          author: 'Prep Cook Lisa',
          message: 'Fresh herbs for garnish prepped and ready in walk-in cooler',
          type: 'info',
          timestamp: '2025-09-04T07:45:00',
          resolved: true
        },
        {
          id: 4,
          author: 'Kitchen Manager',
          message: 'New safety protocol: All staff must wear cut-resistant gloves when using mandoline',
          type: 'urgent',
          timestamp: '2025-09-04T06:00:00',
          resolved: false
        }
      ])

    } catch (err) {
      setError('Failed to load kitchen data')
    } finally {
      setLoading(false)
    }
  }

  const updateOrderStatus = (orderId: number, newStatus: Order['status']) => {
    setOrders(prev => prev.map(order => 
      order.id === orderId ? { ...order, status: newStatus } : order
    ))
  }

  const openInventoryModal = (item?: InventoryItem) => {
    if (item) {
      setEditingInventory(item)
      setInventoryForm({
        name: item.name,
        category: item.category,
        current_stock: item.current_stock,
        unit: item.unit,
        min_threshold: item.min_threshold,
        max_capacity: item.max_capacity,
        cost_per_unit: item.cost_per_unit,
        supplier: item.supplier
      })
    } else {
      setEditingInventory(null)
      setInventoryForm({
        name: '',
        category: 'other',
        current_stock: 0,
        unit: '',
        min_threshold: 0,
        max_capacity: 0,
        cost_per_unit: 0,
        supplier: ''
      })
    }
    setShowInventoryModal(true)
  }

  const saveInventoryItem = () => {
    const getStatus = (current: number, min: number): InventoryItem['status'] => {
      if (current === 0) return 'out_of_stock'
      if (current <= min) return 'low_stock'
      return 'in_stock'
    }

    if (editingInventory) {
      setInventory(prev => prev.map(item => 
        item.id === editingInventory.id 
          ? { 
              ...item, 
              ...inventoryForm, 
              status: getStatus(inventoryForm.current_stock, inventoryForm.min_threshold),
              last_updated: new Date().toISOString()
            }
          : item
      ))
    } else {
      const newItem: InventoryItem = {
        id: Date.now(),
        ...inventoryForm,
        status: getStatus(inventoryForm.current_stock, inventoryForm.min_threshold),
        last_updated: new Date().toISOString()
      }
      setInventory(prev => [...prev, newItem])
    }
    setShowInventoryModal(false)
  }

  const deleteInventoryItem = (itemId: number) => {
    if (window.confirm('Are you sure you want to remove this inventory item?')) {
      setInventory(prev => prev.filter(item => item.id !== itemId))
    }
  }

  const addNote = () => {
    const newNote: KitchenNote = {
      id: Date.now(),
      author: 'Kitchen Staff',
      message: noteForm.message,
      type: noteForm.type,
      timestamp: new Date().toISOString(),
      resolved: false
    }
    setNotes(prev => [newNote, ...prev])
    setNoteForm({ message: '', type: 'info' })
    setShowNoteModal(false)
  }

  const toggleNoteResolved = (noteId: number) => {
    setNotes(prev => prev.map(note => 
      note.id === noteId ? { ...note, resolved: !note.resolved } : note
    ))
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'preparing': return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'ready': return 'bg-green-100 text-green-800 border-green-200'
      case 'served': return 'bg-gray-100 text-gray-800 border-gray-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'border-l-4 border-l-red-500'
      case 'high': return 'border-l-4 border-l-orange-500'
      default: return 'border-l-4 border-l-gray-300'
    }
  }

  const getInventoryStatusColor = (status: string) => {
    switch (status) {
      case 'in_stock': return 'bg-green-100 text-green-800'
      case 'low_stock': return 'bg-yellow-100 text-yellow-800'
      case 'out_of_stock': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getNoteTypeColor = (type: string) => {
    switch (type) {
      case 'urgent': return 'bg-red-100 text-red-800 border-red-200'
      case 'warning': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'maintenance': return 'bg-purple-100 text-purple-800 border-purple-200'
      default: return 'bg-blue-100 text-blue-800 border-blue-200'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading kitchen dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
            {error}
          </div>
        )}

        {/* Header */}
        <div className="mb-8 flex flex-col lg:flex-row lg:justify-between lg:items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">🍳 Kitchen Management</h1>
            <p className="mt-2 text-gray-600">
              Manage orders, inventory, and kitchen communications
            </p>
          </div>
          <div className="mt-4 lg:mt-0 flex gap-3">
            <button
              onClick={() => openInventoryModal()}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
            >
              + Add Inventory
            </button>
            <button
              onClick={() => setShowNoteModal(true)}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
            >
              + Add Note
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="mb-8">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              {[
                { key: 'orders', label: '📋 Orders', count: orders.filter(o => o.status !== 'served').length },
                { key: 'inventory', label: '📦 Inventory', count: inventory.filter(i => i.status === 'low_stock' || i.status === 'out_of_stock').length },
                { key: 'notes', label: '📝 Notes', count: notes.filter(n => !n.resolved).length }
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key as any)}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab.key
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {tab.label}
                  {tab.count > 0 && (
                    <span className="ml-2 bg-red-100 text-red-600 py-0.5 px-2 rounded-full text-xs">
                      {tab.count}
                    </span>
                  )}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Orders Tab */}
        {activeTab === 'orders' && (
          <div className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {orders.filter(order => order.status !== 'served').map((order) => (
                <div key={order.id} className={`bg-white rounded-lg shadow-sm border border-gray-200 p-6 ${getPriorityColor(order.priority)}`}>
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{order.table}</h3>
                      <p className="text-sm text-gray-600">{order.customer}</p>
                      <p className="text-sm text-gray-500">Ordered at {order.time}</p>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(order.status)}`}>
                      {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                    </span>
                  </div>
                  
                  <div className="mb-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Items:</h4>
                    <ul className="text-sm text-gray-600 space-y-1">
                      {order.items.map((item, index) => (
                        <li key={index}>• {item}</li>
                      ))}
                    </ul>
                  </div>

                  {order.special_instructions && (
                    <div className="mb-4 p-2 bg-yellow-50 border border-yellow-200 rounded">
                      <p className="text-sm text-yellow-800">
                        <strong>Special Instructions:</strong> {order.special_instructions}
                      </p>
                    </div>
                  )}

                  <div className="flex gap-2">
                    {order.status === 'pending' && (
                      <button
                        onClick={() => updateOrderStatus(order.id, 'preparing')}
                        className="flex-1 bg-blue-600 text-white px-3 py-2 rounded-md text-sm font-medium hover:bg-blue-700 transition-colors"
                      >
                        Start Preparing
                      </button>
                    )}
                    {order.status === 'preparing' && (
                      <>
                        <button
                          onClick={() => updateOrderStatus(order.id, 'pending')}
                          className="flex-1 bg-yellow-600 text-white px-3 py-2 rounded-md text-sm font-medium hover:bg-yellow-700 transition-colors"
                        >
                          ← Back to Pending
                        </button>
                        <button
                          onClick={() => updateOrderStatus(order.id, 'ready')}
                          className="flex-1 bg-green-600 text-white px-3 py-2 rounded-md text-sm font-medium hover:bg-green-700 transition-colors"
                        >
                          Mark Ready
                        </button>
                      </>
                    )}
                    {order.status === 'ready' && (
                      <>
                        <button
                          onClick={() => updateOrderStatus(order.id, 'preparing')}
                          className="flex-1 bg-blue-600 text-white px-3 py-2 rounded-md text-sm font-medium hover:bg-blue-700 transition-colors"
                        >
                          ← Back to Preparing
                        </button>
                        <button
                          onClick={() => updateOrderStatus(order.id, 'served')}
                          className="flex-1 bg-gray-600 text-white px-3 py-2 rounded-md text-sm font-medium hover:bg-gray-700 transition-colors"
                        >
                          Mark Served
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Served Orders Section */}
            {orders.filter(order => order.status === 'served').length > 0 && (
              <div className="mt-8">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">✅ Recently Served Orders</h2>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {orders.filter(order => order.status === 'served').map((order) => (
                    <div key={order.id} className="bg-gray-50 rounded-lg shadow-sm border border-gray-200 p-4 opacity-75">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h3 className="text-md font-semibold text-gray-700">{order.table}</h3>
                          <p className="text-sm text-gray-500">{order.customer}</p>
                        </div>
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                          Served
                        </span>
                      </div>
                      
                      <div className="mb-3">
                        <ul className="text-sm text-gray-600 space-y-1">
                          {order.items.slice(0, 2).map((item, index) => (
                            <li key={index}>• {item}</li>
                          ))}
                          {order.items.length > 2 && (
                            <li className="text-gray-500">+ {order.items.length - 2} more items</li>
                          )}
                        </ul>
                      </div>

                      <button
                        onClick={() => updateOrderStatus(order.id, 'ready')}
                        className="w-full bg-green-600 text-white px-3 py-2 rounded-md text-sm font-medium hover:bg-green-700 transition-colors"
                      >
                        ← Undo: Back to Ready
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Inventory Tab */}
        {activeTab === 'inventory' && (
          <div className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {inventory.map((item) => (
                <div key={item.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{item.name}</h3>
                      <p className="text-sm text-gray-600 capitalize">{item.category}</p>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getInventoryStatusColor(item.status)}`}>
                      {item.status.replace('_', ' ').charAt(0).toUpperCase() + item.status.replace('_', ' ').slice(1)}
                    </span>
                  </div>
                  
                  <div className="space-y-2 text-sm text-gray-600">
                    <div className="flex justify-between">
                      <span>Current Stock:</span>
                      <span className="font-medium">{item.current_stock} {item.unit}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Min Threshold:</span>
                      <span className="font-medium">{item.min_threshold} {item.unit}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Cost per Unit:</span>
                      <span className="font-medium">${item.cost_per_unit.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Supplier:</span>
                      <span className="font-medium">{item.supplier}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Last Updated:</span>
                      <span className="font-medium">
                        {new Date(item.last_updated).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 flex gap-2">
                    <button
                      onClick={() => openInventoryModal(item)}
                      className="flex-1 bg-blue-50 text-blue-600 px-3 py-2 rounded-md text-sm font-medium hover:bg-blue-100 transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => deleteInventoryItem(item.id)}
                      className="flex-1 bg-red-50 text-red-600 px-3 py-2 rounded-md text-sm font-medium hover:bg-red-100 transition-colors"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Notes Tab */}
        {activeTab === 'notes' && (
          <div className="space-y-6">
            <div className="space-y-4">
              {notes.map((note) => (
                <div key={note.id} className={`bg-white rounded-lg shadow-sm border p-6 ${note.resolved ? 'opacity-60' : ''}`}>
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getNoteTypeColor(note.type)}`}>
                        {note.type.charAt(0).toUpperCase() + note.type.slice(1)}
                      </span>
                      <span className="text-sm font-medium text-gray-900">{note.author}</span>
                      <span className="text-sm text-gray-500">
                        {new Date(note.timestamp).toLocaleString()}
                      </span>
                    </div>
                    <button
                      onClick={() => toggleNoteResolved(note.id)}
                      className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                        note.resolved
                          ? 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          : 'bg-green-100 text-green-600 hover:bg-green-200'
                      }`}
                    >
                      {note.resolved ? 'Reopen' : 'Resolve'}
                    </button>
                  </div>
                  
                  <p className="text-gray-700">{note.message}</p>
                  
                  {note.resolved && (
                    <div className="mt-3 text-sm text-green-600 font-medium">
                      ✓ Resolved
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Inventory Modal */}
      {showInventoryModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {editingInventory ? 'Edit Inventory Item' : 'Add New Inventory Item'}
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Item Name</label>
                  <input
                    type="text"
                    value={inventoryForm.name}
                    onChange={(e) => setInventoryForm({...inventoryForm, name: e.target.value})}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Category</label>
                    <select
                      value={inventoryForm.category}
                      onChange={(e) => setInventoryForm({...inventoryForm, category: e.target.value as InventoryItem['category']})}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="protein">Protein</option>
                      <option value="vegetables">Vegetables</option>
                      <option value="dairy">Dairy</option>
                      <option value="grains">Grains</option>
                      <option value="spices">Spices</option>
                      <option value="beverages">Beverages</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Unit</label>
                    <input
                      type="text"
                      value={inventoryForm.unit}
                      onChange={(e) => setInventoryForm({...inventoryForm, unit: e.target.value})}
                      placeholder="lbs, pieces, bottles..."
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Current Stock</label>
                    <input
                      type="number"
                      value={inventoryForm.current_stock}
                      onChange={(e) => setInventoryForm({...inventoryForm, current_stock: parseInt(e.target.value)})}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Min Threshold</label>
                    <input
                      type="number"
                      value={inventoryForm.min_threshold}
                      onChange={(e) => setInventoryForm({...inventoryForm, min_threshold: parseInt(e.target.value)})}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Max Capacity</label>
                    <input
                      type="number"
                      value={inventoryForm.max_capacity}
                      onChange={(e) => setInventoryForm({...inventoryForm, max_capacity: parseInt(e.target.value)})}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Cost per Unit</label>
                    <input
                      type="number"
                      step="0.01"
                      value={inventoryForm.cost_per_unit}
                      onChange={(e) => setInventoryForm({...inventoryForm, cost_per_unit: parseFloat(e.target.value)})}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Supplier</label>
                    <input
                      type="text"
                      value={inventoryForm.supplier}
                      onChange={(e) => setInventoryForm({...inventoryForm, supplier: e.target.value})}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => setShowInventoryModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={saveInventoryItem}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Note Modal */}
      {showNoteModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Add Kitchen Note</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Type</label>
                  <select
                    value={noteForm.type}
                    onChange={(e) => setNoteForm({...noteForm, type: e.target.value as KitchenNote['type']})}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="info">Info</option>
                    <option value="warning">Warning</option>
                    <option value="urgent">Urgent</option>
                    <option value="maintenance">Maintenance</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Message</label>
                  <textarea
                    value={noteForm.message}
                    onChange={(e) => setNoteForm({...noteForm, message: e.target.value})}
                    rows={4}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter your kitchen note..."
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => setShowNoteModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={addNote}
                  className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-md transition-colors"
                >
                  Add Note
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default SimpleKitchen
