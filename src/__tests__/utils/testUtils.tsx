// Test utilities and mocks for comprehensive testing
import React from 'react'
import { render, RenderOptions } from '@testing-library/react'
import { AuthContext } from '../../contexts/AuthContext'
import { SocketContext } from '../../contexts/SocketContext'

// Mock user data
export const mockUsers = {
  manager: {
    userId: 1,
    email: 'manager@restaurant.com',
    role: 'manager',
    name: 'Test Manager',
    token: 'mock-manager-token'
  },
  chef: {
    userId: 2,
    email: 'chef@restaurant.com',
    role: 'chef',
    name: 'Test Chef',
    token: 'mock-chef-token'
  },
  server: {
    userId: 3,
    email: 'server@restaurant.com',
    role: 'server',
    name: 'Test Server',
    token: 'mock-server-token'
  },
  owner: {
    userId: 4,
    email: 'owner@restaurant.com',
    role: 'owner',
    name: 'Test Owner',
    token: 'mock-owner-token'
  }
}

// Mock socket instance
export const mockSocket = {
  on: jest.fn(),
  off: jest.fn(),
  emit: jest.fn(),
  connect: jest.fn(),
  disconnect: jest.fn(),
  connected: true,
  id: 'mock-socket-id'
}

// Mock auth context values
export const createMockAuthContext = (user = mockUsers.manager) => ({
  user,
  login: jest.fn(),
  logout: jest.fn(),
  loading: false,
  error: null
})

// Mock socket context values
export const createMockSocketContext = (socket = mockSocket) => ({
  socket,
  connected: true,
  error: null
})

// Custom render function with providers
interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  authValue?: any
  socketValue?: any
}

export const renderWithProviders = (
  ui: React.ReactElement,
  {
    authValue = createMockAuthContext(),
    socketValue = createMockSocketContext(),
    ...renderOptions
  }: CustomRenderOptions = {}
) => {
  const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <AuthContext.Provider value={authValue}>
      <SocketContext.Provider value={socketValue}>
        {children}
      </SocketContext.Provider>
    </AuthContext.Provider>
  )

  return render(ui, { wrapper: Wrapper, ...renderOptions })
}

// Mock API responses
export const mockApiResponses = {
  orders: {
    success: {
      status: 200,
      json: async () => ([
        {
          id: 1,
          table_number: 5,
          status: 'pending',
          items: [{ name: 'Burger', quantity: 2, price: 15.99 }],
          total: 31.98,
          created_at: new Date().toISOString()
        },
        {
          id: 2,
          table_number: 3,
          status: 'preparing',
          items: [{ name: 'Pizza', quantity: 1, price: 18.99 }],
          total: 18.99,
          created_at: new Date().toISOString()
        }
      ])
    },
    error: {
      status: 500,
      json: async () => ({ error: 'Failed to fetch orders' })
    }
  },
  menu: {
    success: {
      status: 200,
      json: async () => ([
        {
          id: 1,
          name: 'Classic Burger',
          description: 'Beef patty with lettuce, tomato, cheese',
          price: 15.99,
          category: 'Burgers',
          available: true
        },
        {
          id: 2,
          name: 'Margherita Pizza',
          description: 'Fresh mozzarella, tomatoes, basil',
          price: 18.99,
          category: 'Pizza',
          available: true
        }
      ])
    }
  },
  inventory: {
    success: {
      status: 200,
      json: async () => ([
        {
          id: 1,
          name: 'Ground Beef',
          quantity: 50,
          unit: 'lbs',
          min_threshold: 10,
          cost_per_unit: 8.99
        },
        {
          id: 2,
          name: 'Mozzarella Cheese',
          quantity: 25,
          unit: 'lbs',
          min_threshold: 5,
          cost_per_unit: 6.50
        }
      ])
    }
  },
  schedules: {
    success: {
      status: 200,
      json: async () => ([
        {
          id: 1,
          user_id: 3,
          user_name: 'Test Server',
          shift_date: new Date().toISOString().split('T')[0],
          start_time: '09:00',
          end_time: '17:00',
          role: 'server'
        }
      ])
    }
  }
}

// Setup fetch mock with default responses
export const setupFetchMock = (responses: Record<string, any> = {}) => {
  const defaultResponses: Record<string, any> = {
    '/api/orders': mockApiResponses.orders.success,
    '/api/menu': mockApiResponses.menu.success,
    '/api/inventory': mockApiResponses.inventory.success,
    '/api/schedules': mockApiResponses.schedules.success,
    ...responses
  }

  global.fetch = jest.fn((input: RequestInfo | URL) => {
    const url = typeof input === 'string' ? input : input.toString()
    const response = defaultResponses[url] || { status: 404, json: async () => ({ error: 'Not found' }) }
    return Promise.resolve(response as Response)
  }) as jest.Mock
}

// Mock localStorage with preset values
export const setupLocalStorageMock = (initialValues: Record<string, string> = {}) => {
  const store: Record<string, string> = {
    token: 'mock-jwt-token',
    user: JSON.stringify(mockUsers.manager),
    ...initialValues
  }

  Object.defineProperty(window, 'localStorage', {
    value: {
      getItem: jest.fn((key: string) => store[key] || null),
      setItem: jest.fn((key: string, value: string) => { store[key] = value }),
      removeItem: jest.fn((key: string) => { delete store[key] }),
      clear: jest.fn(() => Object.keys(store).forEach(key => delete store[key]))
    },
    writable: true
  })
}

// Helper to wait for async operations
export const waitForAsyncOperations = () => 
  new Promise(resolve => setTimeout(resolve, 0))

// Mock performance.now for animations
export const mockPerformanceNow = () => {
  let now = 0
  global.performance.now = jest.fn(() => {
    now += 16.67 // ~60fps
    return now
  })
}

// Cleanup function for tests
export const cleanup = () => {
  jest.clearAllMocks()
  localStorage.clear()
  sessionStorage.clear()
}