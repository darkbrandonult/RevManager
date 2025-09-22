import { useState, useEffect } from 'react'
import { menuItems as allMenuItems, MenuItem } from '../data/menuData'

const PublicMenu = () => {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [loading, setLoading] = useState(true)
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

  const getAvailableByCategory = (category: string) => {
    return displayedItems.filter(item => item.category === category && item.is_available && item.effective_availability)
  }

  const isItemAvailable = (itemId: number) => {
    const item = menuItems.find(item => item.id === itemId)
    return item ? item.is_available && item.effective_availability : false
  }

  const getItemEightySixReason = (itemId: number) => {
    const item = menuItems.find(item => item.id === itemId)
    return item?.eighty_six_reason || null
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
        const availableItems = getAvailableByCategory(category)
        
        return (
          <section key={category} className="mb-12">
            <h2 className="text-2xl font-semibold text-gray-800 mb-6 capitalize border-b-2 border-primary-500 pb-2 flex justify-between items-center">
              <span>{category}</span>
              <span className="text-sm font-normal text-gray-500">
                {availableItems.length} of {categoryItems.length} available
              </span>
            </h2>
            <div className="grid gap-6 md:grid-cols-2">
              {categoryItems.map((item) => {
                const isAvailable = isItemAvailable(item.id)
                const eightySixReason = getItemEightySixReason(item.id)
                
                return (
                  <div
                    key={item.id}
                    className={`bg-white rounded-lg shadow-md p-6 border transition-all duration-300 ${
                      !isAvailable
                        ? 'opacity-50 border-red-300 bg-red-50'
                        : 'border-gray-200 hover:shadow-lg'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="text-xl font-semibold text-gray-900">{item.name}</h3>
                      <span className="text-lg font-bold text-primary-600">${item.price}</span>
                    </div>
                    <p className="text-gray-600 mb-3">{item.description}</p>
                    
                    {!isAvailable && (
                      <div className="text-red-600 font-semibold flex items-center gap-2">
                        <span className="inline-block w-2 h-2 bg-red-500 rounded-full"></span>
                        <span>Currently Unavailable</span>
                        {eightySixReason && (
                          <span className="text-sm font-normal text-red-500">
                            ({eightySixReason})
                          </span>
                        )}
                      </div>
                    )}
                    
                    {isAvailable && (
                      <div className="text-green-600 font-semibold flex items-center gap-2">
                        <span className="inline-block w-2 h-2 bg-green-500 rounded-full"></span>
                        <span>Available Now</span>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </section>
        )
      })}

      <footer className="text-center mt-12 pt-8 border-t border-gray-200">
        <a
          href="/login"
          className="inline-block bg-primary-600 text-white px-6 py-2 rounded-lg hover:bg-primary-700 transition-colors"
        >
          Staff Login
        </a>
      </footer>
    </div>
  )
}

export default PublicMenu
