import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { menuItems as allMenuItems, MenuItem } from '../data/menuData'

const SimplePublicMenu = () => {
  const [loading, setLoading] = useState(true)
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [activeMenuType, setActiveMenuType] = useState('regular')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Load the comprehensive menu data
    console.log('🔍 Loading menu items:', allMenuItems.length, 'items')
    setMenuItems(allMenuItems)
    
    // Check for active menu type from localStorage (set by Menu Management)
    const savedActiveMenu = localStorage.getItem('activePublicMenu') || 'regular'
    console.log('📱 Active menu type:', savedActiveMenu)
    setActiveMenuType(savedActiveMenu)
    
    // Listen for changes to active menu type
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'activePublicMenu' && e.newValue) {
        console.log('🔄 Menu type changed to:', e.newValue)
        setActiveMenuType(e.newValue)
      }
    }
    
    window.addEventListener('storage', handleStorageChange)
    
    setLoading(false)
    
    return () => {
      window.removeEventListener('storage', handleStorageChange)
    }
  }, [])

  // Filter items based on active menu type and availability
  const displayedItems = menuItems.filter(item => 
    item.menu_type === activeMenuType && item.is_available && item.effective_availability
  )

  console.log('🍽️ Menu filtering:', {
    totalItems: menuItems.length,
    activeMenuType,
    displayedItems: displayedItems.length,
    regularItems: menuItems.filter(item => item.menu_type === 'regular').length,
    nightItems: menuItems.filter(item => item.menu_type === 'night').length,
    holidayItems: menuItems.filter(item => item.menu_type === 'holiday').length,
  })

  // Group items by category
  const categories = [...new Set(displayedItems.map(item => item.category))]

  const getItemsByCategory = (category: string) => {
    return displayedItems.filter(item => item.category === category)
  }

  const stats = {
    totalItems: menuItems.filter(item => item.menu_type === activeMenuType).length,
    availableItems: displayedItems.length
  }
          const data = await response.json()
          if (Array.isArray(data) && data.length > 0) {
            setMenuItems(data)
            console.log('✅ Loaded real menu data from API')
          } else {
            throw new Error('Invalid menu data received')
          }
        } else {
          throw new Error(`API returned ${response.status}: ${response.statusText}`)
        }
      } catch (error) {
        console.warn('⚠️ Could not fetch menu data, using static menu:', error)
        setError('Using offline menu data')
        setMenuItems(getStaticMenu())
      } finally {
        setLoading(false)
      }
    }

    fetchMenu()
  }, [])

  const formatPrice = (price: number | string): string => {
    const numPrice = typeof price === 'string' ? parseFloat(price) : price
    return isNaN(numPrice) ? '0.00' : numPrice.toFixed(2)
  }

  const categories = [...new Set(menuItems.map(item => item.category))]

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex justify-center items-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <div className="text-xl text-gray-600">Loading menu...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation Header */}
      <nav className="bg-white shadow-lg border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Link to="/" className="text-2xl font-bold text-gray-900 hover:text-blue-600 transition-colors">
                🍽️ RevManager
              </Link>
            </div>
            <div className="flex items-center space-x-4">
              <Link 
                to="/menu" 
                className="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium transition-colors"
              >
                Menu
              </Link>
              <Link 
                to="/login" 
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors shadow-md"
              >
                Staff Login
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Error Banner */}
      {error && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-yellow-700">
                  <strong>Notice:</strong> {error}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        <header className="text-center mb-12">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">Restaurant Menu</h1>
          <p className="text-xl text-gray-600 mb-2">Fresh ingredients, exceptional taste</p>
          <p className="text-sm text-gray-500">
            Staff members can <Link to="/login" className="text-blue-600 hover:underline font-medium">login here</Link> to access the management system
          </p>
        </header>

        {/* Menu Stats */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-blue-600">{menuItems.length}</div>
              <div className="text-sm text-gray-600">Total Items</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600">{categories.length}</div>
              <div className="text-sm text-gray-600">Categories</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-purple-600">
                {menuItems.filter(item => item.is_available !== false && item.effective_availability !== false).length}
              </div>
              <div className="text-sm text-gray-600">Available Now</div>
            </div>
          </div>
        </div>

        {/* Menu Categories */}
        {categories.map(category => {
          const categoryItems = menuItems.filter(item => item.category === category)
          const availableCount = categoryItems.filter(item => item.is_available !== false && item.effective_availability !== false).length
          
          return (
            <section key={category} className="mb-12">
              <h2 className="text-3xl font-semibold text-gray-800 mb-6 capitalize border-b-2 border-blue-500 pb-3 flex justify-between items-center">
                <span className="flex items-center">
                  {category === 'Appetizers' && '🥗'}
                  {category === 'Main Courses' && '🍽️'}
                  {category === 'Salads' && '🥬'}
                  {category === 'Desserts' && '🍰'}
                  <span className="ml-2">{category}</span>
                </span>
                <span className="text-lg font-normal text-gray-500">
                  {availableCount} of {categoryItems.length} available
                </span>
              </h2>
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {categoryItems.map((item) => {
                  const isAvailable = item.is_available !== false && item.effective_availability !== false
                  
                  return (
                    <div
                      key={item.id}
                      className={`bg-white rounded-lg shadow-md p-6 border transition-all duration-300 transform hover:scale-105 ${
                        !isAvailable
                          ? 'opacity-60 border-red-300 bg-red-50'
                          : 'border-gray-200 hover:shadow-xl hover:border-blue-300'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-3">
                        <h3 className="text-xl font-semibold text-gray-900">{item.name}</h3>
                        <span className="text-xl font-bold text-green-600">
                          ${formatPrice(item.price)}
                        </span>
                      </div>
                      <p className="text-gray-600 mb-4 leading-relaxed">{item.description}</p>
                      
                      <div className="flex justify-between items-center">
                        <div className="flex items-center">
                          <span className={`inline-block w-3 h-3 rounded-full mr-2 ${isAvailable ? 'bg-green-500' : 'bg-red-500'}`}></span>
                          <span className={`text-sm font-medium ${isAvailable ? 'text-green-600' : 'text-red-600'}`}>
                            {isAvailable ? 'Available' : 'Currently Unavailable'}
                          </span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </section>
          )
        })}

        {/* Footer */}
        <footer className="mt-20 bg-white rounded-lg shadow-lg p-8 text-center">
          <h3 className="text-2xl font-bold text-gray-900 mb-4">RevManager Restaurant Management</h3>
          <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
            Complete restaurant management solution for orders, inventory, scheduling, and staff coordination. 
            Access powerful tools to streamline your restaurant operations.
          </p>
          <div className="space-x-4 mb-6">
            <Link 
              to="/login" 
              className="inline-block bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-medium transition-colors shadow-md"
            >
              🔐 Staff Login
            </Link>
          </div>
          <div className="text-sm text-gray-500 space-y-1">
            <p>🎯 Order Management • 📦 Inventory Tracking • 📅 Staff Scheduling • 💰 Tip Management</p>
            <p>Real-time updates • Kitchen dashboard • Analytics & reporting</p>
          </div>
        </footer>
      </div>
    </div>
  )
}

export default SimplePublicMenu
