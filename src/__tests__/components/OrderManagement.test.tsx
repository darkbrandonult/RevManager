import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import OrderManagement from '../../components/OrderManagement'

const mockSocket = {
  on: jest.fn(),
  off: jest.fn(),
  emit: jest.fn()
}

// Mock the useSocket hook
jest.mock('../../hooks/useSocket', () => ({
  useSocket: () => mockSocket
}))

// Mock the AuthContext
const mockUseAuth = jest.fn()
jest.mock('../../contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth()
}))

// Mock fetch
const mockFetch = jest.fn()
global.fetch = mockFetch

const mockOrders = [
  {
    id: 1,
    table_number: 5,
    customer_name: 'John Doe',
    status: 'pending',
    total_amount: 25.50,
    created_at: '2024-01-20T10:30:00Z',
    items: [
      {
        id: 1,
        menu_item_name: 'Caesar Salad',
        quantity: 1,
        price: 12.50,
        special_instructions: 'No croutons'
      }
    ]
  },
  {
    id: 2,
    table_number: 3,
    customer_name: 'Jane Smith',
    status: 'in_progress',
    total_amount: 18.75,
    created_at: '2024-01-20T11:00:00Z',
    items: []
  }
]

const renderOrderManagement = (userRole = 'server') => {
  mockUseAuth.mockReturnValue({
    user: { id: 1, username: 'testuser', role: userRole }
  })
  
  return render(<OrderManagement />)
}

describe('OrderManagement Component', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockFetch.mockClear()
    mockSocket.on.mockClear()
    mockSocket.off.mockClear()
    mockSocket.emit.mockClear()
    
    // Default mock for orders fetch
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ orders: mockOrders })
    })
  })

  describe('Basic Rendering', () => {
    it('should render loading state initially', () => {
      renderOrderManagement()
      expect(screen.getByText('Loading orders...')).toBeInTheDocument()
    })

    it('should render order management after loading', async () => {
      renderOrderManagement()
      
      await waitFor(() => {
        expect(screen.getByText('Order Management')).toBeInTheDocument()
        expect(screen.getByText('Create New Order')).toBeInTheDocument()
      })
    })

    it('should render orders after loading', async () => {
      renderOrderManagement()
      
      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument()
        expect(screen.getByText('Jane Smith')).toBeInTheDocument()
      })
    })
  })

  describe('Order Status Updates', () => {
    it('should show appropriate action buttons', async () => {
      renderOrderManagement()
      
      await waitFor(() => {
        expect(screen.getByText('Mark In Progress')).toBeInTheDocument()
        expect(screen.getByText('Mark Completed')).toBeInTheDocument()
      })
    })
  })

  describe('Search and Filtering', () => {
    it('should filter orders by customer name', async () => {
      renderOrderManagement()
      
      await waitFor(() => {
        const searchInput = screen.getByPlaceholderText('Search by customer name...')
        fireEvent.change(searchInput, { target: { value: 'John' } })
      })

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument()
        expect(screen.queryByText('Jane Smith')).not.toBeInTheDocument()
      })
    })
  })

  describe('Permission-based Features', () => {
    it('should show manager features for manager role', async () => {
      renderOrderManagement('manager')
      
      await waitFor(() => {
        expect(screen.getByText('Order Analytics')).toBeInTheDocument()
      })
    })

    it('should hide manager features for server role', async () => {
      renderOrderManagement('server')
      
      await waitFor(() => {
        expect(screen.queryByText('Order Analytics')).not.toBeInTheDocument()
      })
    })
  })

  describe('Error Handling', () => {
    it('should show error message when fetch fails', async () => {
      mockFetch.mockRejectedValue(new Error('Failed to fetch'))
      
      renderOrderManagement()

      await waitFor(() => {
        expect(screen.getByText('Error loading orders')).toBeInTheDocument()
      })
    })
  })
})
