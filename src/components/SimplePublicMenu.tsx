import { useState, useEffect } from 'react'
import { menuItems as allMenuItems, MenuItem } from '../data/menuData'

const SimplePublicMenu = () => {
  const [loading, setLoading] = useState(true)
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [activeMenuType, setActiveMenuType] = useState('regular')

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

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-xl text-gray-600">Loading menu...</div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <header className="text-center mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">Restaurant Menu</h1>
        <p className="text-lg text-gray-600">Fresh ingredients, exceptional taste</p>
        
        {/* Real-time status indicator */}
        <div className="mt-4 flex justify-center items-center gap-4 text-sm text-gray-500">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span>Live Menu</span>
          </div>
          <div>{stats.availableItems} of {stats.totalItems} items available</div>
          <div>Updated {new Date().toLocaleTimeString()}</div>
        </div>
      </header>

      {/* Current Menu Type Indicator */}
      <div className="text-center mb-6">
        <div className="inline-flex items-center px-4 py-2 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
          {activeMenuType === 'regular' && '🍽️ Regular Menu Currently Displayed'}
          {activeMenuType === 'night' && '🌙 Night Menu Currently Displayed'}
          {activeMenuType === 'holiday' && '🎉 Holiday Menu Currently Displayed'}
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Menu automatically updates based on time and availability
        </p>
      </div>

      {categories.map((category) => {
        const categoryItems = getItemsByCategory(category)
        
        return (
          <section key={category} className="mb-12">
            <h2 className="text-2xl font-semibold text-gray-800 mb-6 capitalize border-b-2 border-blue-500 pb-2 flex justify-between items-center">
              <span>{category}</span>
              <span className="text-sm font-normal text-gray-500">
                {categoryItems.length} items available
              </span>
            </h2>
            <div className="grid gap-6 md:grid-cols-2">
              {categoryItems.map((item) => (
                <div
                  key={item.id}
                  className="bg-white rounded-lg shadow-md p-6 border border-gray-200 hover:shadow-lg transition-all duration-300"
                >
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-xl font-semibold text-gray-900">{item.name}</h3>
                    <span className="text-lg font-bold text-blue-600">${item.price}</span>
                  </div>
                  <p className="text-gray-600 mb-3">{item.description}</p>
                  
                  {/* Additional item details */}
                  {item.dietary && (
                    <div className="mb-2">
                      <span className="inline-block bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
                        {item.dietary}
                      </span>
                    </div>
                  )}
                  
                  {item.spice_level && (
                    <div className="mb-2">
                      <span className="text-sm text-orange-600">
                        🌶️ {item.spice_level}
                      </span>
                    </div>
                  )}
                  
                  {item.addons && item.addons.length > 0 && (
                    <div className="mb-2">
                      <span className="text-sm text-gray-500 font-medium">Add-ons available:</span>
                      <div className="text-xs text-gray-500 mt-1">
                        {item.addons.slice(0, 3).join(', ')}
                        {item.addons.length > 3 && '...'}
                      </div>
                    </div>
                  )}
                  
                  {item.kids_drink && (
                    <div className="mb-2">
                      <span className="text-sm text-purple-600">
                        🥤 {item.kids_drink}
                      </span>
                    </div>
                  )}
                  
                  {item.special_day && (
                    <div className="mb-2">
                      <span className="inline-block bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full">
                        {item.special_day}
                      </span>
                    </div>
                  )}
                  
                  {item.combo_includes && (
                    <div className="mb-2">
                      <span className="text-sm text-blue-600">
                        📦 Includes: {item.combo_includes}
                      </span>
                    </div>
                  )}
                  
                  {item.time_restriction && (
                    <div className="mb-2">
                      <span className="text-sm text-red-600">
                        ⏰ {item.time_restriction}
                      </span>
                    </div>
                  )}
                  
                  <div className="text-green-600 font-semibold flex items-center gap-2 mt-3">
                    <span className="inline-block w-2 h-2 bg-green-500 rounded-full"></span>
                    <span>Available Now</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )
      })}

            {/* Footer */}
      <footer className="bg-gray-800 text-white py-12">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <p className="text-gray-400">
            Staff Dashboard available through main navigation
          </p>
        </div>
      </footer>
    </div>
  )
}

export default SimplePublicMenu
