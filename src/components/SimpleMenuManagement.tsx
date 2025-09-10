import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { menuItems as allMenuItems, MenuItem } from '../data/menuData'

interface Category {
  id: number
  name: string
  display_order: number
}

interface MenuType {
  id: number
  name: string
  description: string
  active: boolean
}

const SimpleMenuManagement = () => {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [menuTypes, setMenuTypes] = useState<MenuType[]>([])
  const [activePublicMenu, setActivePublicMenu] = useState('regular')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [selectedMenuType, setSelectedMenuType] = useState('regular')
  
  // Modal states
  const [showItemModal, setShowItemModal] = useState(false)
  const [showCategoryModal, setShowCategoryModal] = useState(false)
  const [showMenuTypeModal, setShowMenuTypeModal] = useState(false)
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [editingMenuType, setEditingMenuType] = useState<MenuType | null>(null)

  // Form states
  const [itemForm, setItemForm] = useState({
    name: '',
    description: '',
    price: '',
    category: '',
    menu_type: 'regular'
  })
  const [categoryForm, setCategoryForm] = useState({
    name: '',
    display_order: 0
  })
  const [menuTypeForm, setMenuTypeForm] = useState({
    name: '',
    description: '',
    active: true
  })

  useEffect(() => {
    fetchData()
  }, [selectedMenuType])

  const fetchData = async () => {
    try {
      setLoading(true)
      
      // Load shared menu data
      setMenuItems(allMenuItems)

      setCategories([
        { id: 1, name: 'Appetizers', display_order: 1 },
        { id: 2, name: 'Salads', display_order: 2 },
        { id: 3, name: 'Main Courses', display_order: 3 },
        { id: 4, name: 'Burgers & Sandwiches', display_order: 4 },
        { id: 5, name: 'Pizza', display_order: 5 },
        { id: 6, name: 'Kids Menu', display_order: 6 },
        { id: 7, name: 'Nightly Specials', display_order: 7 },
        { id: 8, name: 'Desserts', display_order: 8 },
        { id: 9, name: 'Beverages', display_order: 9 },
        { id: 10, name: 'Combo Deals', display_order: 10 },
        { id: 11, name: 'Specials', display_order: 11 }
      ])

      setMenuTypes([
        { id: 1, name: 'regular', description: 'Regular dining menu', active: true },
        { id: 2, name: 'night', description: 'Late night menu (10PM - 2AM)', active: true },
        { id: 3, name: 'holiday', description: 'Special holiday menu', active: false }
      ])

    } catch (err) {
      setError('Failed to load menu data')
    } finally {
      setLoading(false)
    }
  }

  const filteredItems = menuItems.filter(item => {
    const categoryMatch = selectedCategory === 'all' || item.category === selectedCategory
    const menuTypeMatch = item.menu_type === selectedMenuType
    return categoryMatch && menuTypeMatch
  })

  const openItemModal = (item?: MenuItem) => {
    if (item) {
      setEditingItem(item)
      setItemForm({
        name: item.name,
        description: item.description,
        price: item.price,
        category: item.category,
        menu_type: item.menu_type || 'regular'
      })
    } else {
      setEditingItem(null)
      setItemForm({
        name: '',
        description: '',
        price: '',
        category: categories[0]?.name || '',
        menu_type: selectedMenuType
      })
    }
    setShowItemModal(true)
  }

  const saveItem = () => {
    if (editingItem) {
      // Update existing item
      setMenuItems(prev => prev.map(item => 
        item.id === editingItem.id 
          ? { ...item, ...itemForm, price: itemForm.price }
          : item
      ))
    } else {
      // Add new item
      const newItem: MenuItem = {
        id: Date.now(),
        ...itemForm,
        is_available: true,
        effective_availability: true
      }
      setMenuItems(prev => [...prev, newItem])
    }
    setShowItemModal(false)
  }

  const deleteItem = (itemId: number) => {
    if (window.confirm('Are you sure you want to delete this item?')) {
      setMenuItems(prev => prev.filter(item => item.id !== itemId))
    }
  }

  const openCategoryModal = (category?: Category) => {
    if (category) {
      setEditingCategory(category)
      setCategoryForm({
        name: category.name,
        display_order: category.display_order
      })
    } else {
      setEditingCategory(null)
      setCategoryForm({
        name: '',
        display_order: categories.length + 1
      })
    }
    setShowCategoryModal(true)
  }

  const saveCategory = () => {
    if (editingCategory) {
      setCategories(prev => prev.map(cat => 
        cat.id === editingCategory.id 
          ? { ...cat, ...categoryForm }
          : cat
      ))
    } else {
      const newCategory: Category = {
        id: Date.now(),
        ...categoryForm
      }
      setCategories(prev => [...prev, newCategory])
    }
    setShowCategoryModal(false)
  }

  const deleteCategory = (categoryId: number) => {
    if (window.confirm('Are you sure you want to delete this category? Items in this category will need to be reassigned.')) {
      setCategories(prev => prev.filter(cat => cat.id !== categoryId))
    }
  }

  const openMenuTypeModal = (menuType?: MenuType) => {
    if (menuType) {
      setEditingMenuType(menuType)
      setMenuTypeForm({
        name: menuType.name,
        description: menuType.description,
        active: menuType.active
      })
    } else {
      setEditingMenuType(null)
      setMenuTypeForm({
        name: '',
        description: '',
        active: true
      })
    }
    setShowMenuTypeModal(true)
  }

  const saveMenuType = () => {
    if (editingMenuType) {
      setMenuTypes(prev => prev.map(type => 
        type.id === editingMenuType.id 
          ? { ...type, ...menuTypeForm }
          : type
      ))
    } else {
      const newMenuType: MenuType = {
        id: Date.now(),
        ...menuTypeForm
      }
      setMenuTypes(prev => [...prev, newMenuType])
    }
    setShowMenuTypeModal(false)
  }

  const deleteMenuType = (menuTypeId: number) => {
    if (window.confirm('Are you sure you want to delete this menu type? All items in this menu will be moved to regular menu.')) {
      setMenuTypes(prev => prev.filter(type => type.id !== menuTypeId))
    }
  }

  const switchPublicMenu = (menuType: string) => {
    const menuName = menuType.charAt(0).toUpperCase() + menuType.slice(1)
    const confirmMessage = `Switch public menu to ${menuName} menu?\n\nThis will change what customers see on the public website immediately.`
    
    if (window.confirm(confirmMessage)) {
      setActivePublicMenu(menuType)
      
      // Save to localStorage so PublicMenu component can sync
      localStorage.setItem('activePublicMenu', menuType)
      
      // Trigger storage event for other tabs/windows
      window.dispatchEvent(new StorageEvent('storage', {
        key: 'activePublicMenu',
        newValue: menuType,
        oldValue: localStorage.getItem('activePublicMenu')
      }))
      
      // Create a more sophisticated notification
      const notification = document.createElement('div')
      notification.className = 'fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 transition-all duration-300'
      notification.innerHTML = `
        <div class="flex items-center">
          <svg class="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
          </svg>
          Public menu switched to: <strong>${menuName}</strong>
        </div>
      `
      document.body.appendChild(notification)
      
      setTimeout(() => {
        notification.style.opacity = '0'
        setTimeout(() => document.body.removeChild(notification), 300)
      }, 3000)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading menu management...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Link to="/dashboard" className="text-2xl font-bold text-gray-900 hover:text-blue-600 transition-colors">
                🍽️ RevManager
              </Link>
              <span className="ml-4 px-3 py-1 bg-green-100 text-green-800 text-sm rounded-full">
                Advanced Menu Management
              </span>
            </div>
            <div className="flex items-center space-x-4">
              <Link 
                to="/dashboard" 
                className="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium"
              >
                ← Back to Dashboard
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
            {error}
          </div>
        )}

        {/* Header with Action Buttons */}
        <div className="mb-8 flex flex-col lg:flex-row lg:justify-between lg:items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">📋 Advanced Menu Management</h1>
            <p className="mt-2 text-gray-600">
              Manage items, categories, and menu types
            </p>
          </div>
          <div className="mt-4 lg:mt-0 flex gap-3">
            <button
              onClick={() => openItemModal()}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
            >
              + Add Item
            </button>
            <button
              onClick={() => openCategoryModal()}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
            >
              + Add Category
            </button>
            <button
              onClick={() => openMenuTypeModal()}
              className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
            >
              + Add Menu Type
            </button>
          </div>
        </div>

        {/* Public Menu Switcher */}
        <div className="mb-6 bg-gradient-to-r from-yellow-50 to-orange-50 border-2 border-yellow-200 rounded-lg p-6 shadow-sm">
          <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center">
            <div className="mb-4 lg:mb-0">
              <h3 className="text-xl font-bold text-gray-900 flex items-center">
                🌐 Public Menu Control Center
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                Choose which menu customers see on your public website
              </p>
              <div className="mt-2 flex items-center">
                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse mr-2"></div>
                <span className="text-sm text-gray-700">
                  Currently Live: <span className="font-bold text-yellow-700">{activePublicMenu.toUpperCase()}</span> menu
                </span>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              {menuTypes.filter(type => type.active).map(menuType => {
                const isActive = activePublicMenu === menuType.name
                const itemCount = menuItems.filter(item => item.menu_type === menuType.name && item.is_available).length
                
                return (
                  <button
                    key={menuType.id}
                    onClick={() => switchPublicMenu(menuType.name)}
                    className={`px-6 py-3 rounded-lg text-sm font-medium transition-all duration-200 border-2 ${
                      isActive
                        ? 'bg-yellow-600 text-white border-yellow-600 shadow-lg transform scale-105'
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 hover:border-gray-400'
                    }`}
                  >
                    <div className="flex flex-col items-center">
                      <div className="flex items-center mb-1">
                        {menuType.name === 'regular' && '🍽️'}
                        {menuType.name === 'night' && '🌙'}
                        {menuType.name === 'holiday' && '🎉'}
                        <span className="ml-1 font-semibold">
                          {menuType.name.charAt(0).toUpperCase() + menuType.name.slice(1)}
                        </span>
                        {isActive && <span className="ml-2 text-xs">● LIVE</span>}
                      </div>
                      <div className="text-xs opacity-75">
                        {itemCount} items available
                      </div>
                    </div>
                  </button>
                )
              })}
              <div className="flex items-center ml-4 text-xs text-gray-500 border-l pl-4">
                <div>
                  <div className="font-medium">Quick Switch</div>
                  <div>Changes instantly</div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Additional Info */}
          <div className="mt-4 pt-4 border-t border-yellow-200">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="flex items-center text-gray-600">
                <svg className="w-4 h-4 mr-2 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"></path>
                </svg>
                Changes take effect immediately
              </div>
              <div className="flex items-center text-gray-600">
                <svg className="w-4 h-4 mr-2 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"></path>
                </svg>
                All customers see selected menu
              </div>
              <div className="flex items-center text-gray-600">
                <svg className="w-4 h-4 mr-2 text-purple-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd"></path>
                </svg>
                Can switch anytime
              </div>
            </div>
          </div>
        </div>

        {/* Menu Type Selector */}
        <div className="mb-6">
          <h3 className="text-lg font-medium text-gray-900 mb-3">Select Menu Type:</h3>
          <div className="flex flex-wrap gap-2">
            {menuTypes.map((menuType) => (
              <button
                key={menuType.id}
                onClick={() => setSelectedMenuType(menuType.name)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  selectedMenuType === menuType.name
                    ? 'bg-purple-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
                }`}
              >
                {menuType.name.charAt(0).toUpperCase() + menuType.name.slice(1)} Menu
                {!menuType.active && <span className="ml-1 text-xs">(Inactive)</span>}
              </button>
            ))}
          </div>
        </div>

        {/* Category Filter */}
        <div className="mb-6">
          <h3 className="text-lg font-medium text-gray-900 mb-3">Filter by Category:</h3>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedCategory === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
              }`}
            >
              All Items
            </button>
            {categories.sort((a, b) => a.display_order - b.display_order).map((category) => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.name)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  selectedCategory === category.name
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
                }`}
              >
                {category.name}
              </button>
            ))}
          </div>
        </div>

        {/* Menu Items Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {filteredItems.map((item) => (
            <div 
              key={item.id} 
              className={`bg-white rounded-lg shadow-lg p-6 border-l-4 ${
                item.effective_availability 
                  ? 'border-l-green-400' 
                  : 'border-l-red-400'
              }`}
            >
              {/* Item Header */}
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">
                    {item.name}
                  </h3>
                  <p className="text-sm text-gray-600 mb-2">
                    {item.description}
                  </p>
                  <span className="inline-block px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full">
                    {item.category}
                  </span>
                </div>
                <div className="text-right ml-4">
                  <p className="text-xl font-bold text-gray-900">
                    ${parseFloat(item.price).toFixed(2)}
                  </p>
                </div>
              </div>

              {/* Availability Status */}
              <div className="mb-4">
                <div className={`flex items-center px-3 py-2 rounded-md ${
                  item.effective_availability 
                    ? 'bg-green-50 text-green-800' 
                    : 'bg-red-50 text-red-800'
                }`}>
                  <span className="text-sm font-medium">
                    {item.effective_availability ? '✅ Available' : '❌ Unavailable'}
                  </span>
                </div>
                {item.eighty_six_reason && (
                  <p className="text-xs text-red-600 mt-2">
                    Reason: {item.eighty_six_reason}
                  </p>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <button
                  onClick={() => openItemModal(item)}
                  className="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium transition-colors"
                >
                  Edit
                </button>
                <button
                  onClick={() => deleteItem(item.id)}
                  className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md text-sm font-medium transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>

        {filteredItems.length === 0 && (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🍽️</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No items found</h3>
            <p className="text-gray-600">No menu items match the selected filters.</p>
          </div>
        )}

        {/* Menu Types Management */}
        <div className="mb-8">
          <h3 className="text-xl font-semibold text-gray-900 mb-4">Manage Menu Types</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {menuTypes.map((menuType) => (
              <div key={menuType.id} className="bg-white p-4 rounded-lg shadow border">
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-medium text-gray-900">{menuType.name.charAt(0).toUpperCase() + menuType.name.slice(1)}</h4>
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    menuType.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {menuType.active ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mb-3">{menuType.description}</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => openMenuTypeModal(menuType)}
                    className="flex-1 text-xs px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => deleteMenuType(menuType.id)}
                    className="text-xs px-2 py-1 bg-red-600 hover:bg-red-700 text-white rounded transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Categories Management */}
        <div className="mb-8">
          <h3 className="text-xl font-semibold text-gray-900 mb-4">Manage Categories</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {categories.sort((a, b) => a.display_order - b.display_order).map((category) => (
              <div key={category.id} className="bg-white p-4 rounded-lg shadow border">
                <div className="flex justify-between items-center mb-2">
                  <h4 className="font-medium text-gray-900">{category.name}</h4>
                  <span className="text-xs text-gray-500">Order: {category.display_order}</span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => openCategoryModal(category)}
                    className="flex-1 text-xs px-2 py-1 bg-green-600 hover:bg-green-700 text-white rounded transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => deleteCategory(category.id)}
                    className="text-xs px-2 py-1 bg-red-600 hover:bg-red-700 text-white rounded transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-lg shadow border">
            <div className="flex items-center">
              <div className="text-2xl">📊</div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Items</p>
                <p className="text-2xl font-bold text-gray-900">{menuItems.filter(item => item.menu_type === selectedMenuType).length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow border">
            <div className="flex items-center">
              <div className="text-2xl">✅</div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Available</p>
                <p className="text-2xl font-bold text-green-600">
                  {menuItems.filter(item => item.menu_type === selectedMenuType && item.effective_availability).length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow border">
            <div className="flex items-center">
              <div className="text-2xl">📂</div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Categories</p>
                <p className="text-2xl font-bold text-blue-600">{categories.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow border">
            <div className="flex items-center">
              <div className="text-2xl">🍽️</div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Menu Types</p>
                <p className="text-2xl font-bold text-purple-600">{menuTypes.length}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Item Modal */}
      {showItemModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {editingItem ? 'Edit Menu Item' : 'Add New Menu Item'}
            </h3>
            <div className="space-y-4">
              <input
                type="text"
                placeholder="Item Name"
                value={itemForm.name}
                onChange={(e) => setItemForm({...itemForm, name: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <textarea
                placeholder="Description"
                value={itemForm.description}
                onChange={(e) => setItemForm({...itemForm, description: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
              />
              <input
                type="number"
                step="0.01"
                placeholder="Price"
                value={itemForm.price}
                onChange={(e) => setItemForm({...itemForm, price: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <select
                value={itemForm.category}
                onChange={(e) => setItemForm({...itemForm, category: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {categories.map((category) => (
                  <option key={category.id} value={category.name}>{category.name}</option>
                ))}
              </select>
              <select
                value={itemForm.menu_type}
                onChange={(e) => setItemForm({...itemForm, menu_type: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {menuTypes.map((menuType) => (
                  <option key={menuType.id} value={menuType.name}>{menuType.name.charAt(0).toUpperCase() + menuType.name.slice(1)}</option>
                ))}
              </select>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={saveItem}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-medium transition-colors"
              >
                {editingItem ? 'Update' : 'Add'} Item
              </button>
              <button
                onClick={() => setShowItemModal(false)}
                className="px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-700 rounded-md font-medium transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Category Modal */}
      {showCategoryModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {editingCategory ? 'Edit Category' : 'Add New Category'}
            </h3>
            <div className="space-y-4">
              <input
                type="text"
                placeholder="Category Name"
                value={categoryForm.name}
                onChange={(e) => setCategoryForm({...categoryForm, name: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="number"
                placeholder="Display Order"
                value={categoryForm.display_order}
                onChange={(e) => setCategoryForm({...categoryForm, display_order: parseInt(e.target.value)})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={saveCategory}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md font-medium transition-colors"
              >
                {editingCategory ? 'Update' : 'Add'} Category
              </button>
              <button
                onClick={() => setShowCategoryModal(false)}
                className="px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-700 rounded-md font-medium transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Menu Type Modal */}
      {showMenuTypeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {editingMenuType ? 'Edit Menu Type' : 'Add New Menu Type'}
            </h3>
            <div className="space-y-4">
              <input
                type="text"
                placeholder="Menu Type Name (e.g., 'brunch', 'dinner')"
                value={menuTypeForm.name}
                onChange={(e) => setMenuTypeForm({...menuTypeForm, name: e.target.value.toLowerCase()})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <textarea
                placeholder="Description"
                value={menuTypeForm.description}
                onChange={(e) => setMenuTypeForm({...menuTypeForm, description: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
              />
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={menuTypeForm.active}
                  onChange={(e) => setMenuTypeForm({...menuTypeForm, active: e.target.checked})}
                  className="mr-2"
                />
                <span className="text-sm text-gray-700">Active (available for ordering)</span>
              </label>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={saveMenuType}
                className="flex-1 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-md font-medium transition-colors"
              >
                {editingMenuType ? 'Update' : 'Add'} Menu Type
              </button>
              <button
                onClick={() => setShowMenuTypeModal(false)}
                className="px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-700 rounded-md font-medium transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default SimpleMenuManagement
