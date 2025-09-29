import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import SimpleKitchen from '../../components/SimpleKitchen'
import { renderWithProviders, mockUsers, setupFetchMock, mockApiResponses } from '../utils/testUtils'

describe('SimpleKitchen Component', () => {
  beforeEach(() => {
    setupFetchMock()
    jest.clearAllMocks()
  })

  describe('Initial Rendering', () => {
    it('should render kitchen management interface', () => {
      renderWithProviders(<SimpleKitchen />)
      
      expect(screen.getByText('Kitchen Management')).toBeInTheDocument()
      expect(screen.getByText('Active Orders')).toBeInTheDocument()
      expect(screen.getByText('Inventory Status')).toBeInTheDocument()
    })

    it('should render filter buttons', () => {
      renderWithProviders(<SimpleKitchen />)
      
      expect(screen.getByText('All Orders')).toBeInTheDocument()
      expect(screen.getByText('Pending')).toBeInTheDocument()
      expect(screen.getByText('Preparing')).toBeInTheDocument()
      expect(screen.getByText('Ready')).toBeInTheDocument()
    })
  })

  describe('Order Management', () => {
    it('should load and display orders on mount', async () => {
      renderWithProviders(<SimpleKitchen />)
      
      await waitFor(() => {
        expect(screen.getByText('Table 5')).toBeInTheDocument()
        expect(screen.getByText('Table 3')).toBeInTheDocument()
      })
    })

    it('should filter orders by status', async () => {
      renderWithProviders(<SimpleKitchen />)
      
      await waitFor(() => {
        expect(screen.getByText('Table 5')).toBeInTheDocument()
      })
      
      // Filter by preparing status
      fireEvent.click(screen.getByText('Preparing'))
      
      await waitFor(() => {
        expect(screen.getByText('Table 3')).toBeInTheDocument()
        expect(screen.queryByText('Table 5')).not.toBeInTheDocument()
      })
    })

    it('should update order status', async () => {
      renderWithProviders(<SimpleKitchen />)
      
      await waitFor(() => {
        expect(screen.getByText('Table 5')).toBeInTheDocument()
      })
      
      // Find and click update status button
      const updateButtons = screen.getAllByText('Mark Preparing')
      fireEvent.click(updateButtons[0])
      
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/orders/1',
          expect.objectContaining({
            method: 'PUT',
            body: JSON.stringify({ status: 'preparing' })
          })
        )
      })
    })

    it('should handle order status progression', async () => {
      renderWithProviders(<SimpleKitchen />)
      
      await waitFor(() => {
        expect(screen.getByText('Table 3')).toBeInTheDocument()
      })
      
      // Order with 'preparing' status should show 'Mark Ready' button
      const readyButtons = screen.getAllByText('Mark Ready')
      expect(readyButtons.length).toBeGreaterThan(0)
      
      fireEvent.click(readyButtons[0])
      
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/orders/2',
          expect.objectContaining({
            method: 'PUT',
            body: JSON.stringify({ status: 'ready' })
          })
        )
      })
    })
  })

  describe('Inventory Integration', () => {
    it('should load and display inventory items', async () => {
      renderWithProviders(<SimpleKitchen />)
      
      await waitFor(() => {
        expect(screen.getByText('Ground Beef')).toBeInTheDocument()
        expect(screen.getByText('Mozzarella Cheese')).toBeInTheDocument()
      })
    })

    it('should show low stock warnings', async () => {
      // Mock inventory with low stock
      setupFetchMock({
        '/api/inventory': {
          status: 200,
          json: async () => ([
            {
              id: 1,
              name: 'Ground Beef',
              quantity: 5, // Below min_threshold of 10
              unit: 'lbs',
              min_threshold: 10,
              cost_per_unit: 8.99
            }
          ])
        }
      })
      
      renderWithProviders(<SimpleKitchen />)
      
      await waitFor(() => {
        expect(screen.getByText('⚠️')).toBeInTheDocument() // Low stock warning icon
      })
    })
  })

  describe('Real-time Updates', () => {
    it('should listen for socket events on mount', () => {
      const mockSocket = {
        on: jest.fn(),
        off: jest.fn(),
        emit: jest.fn(),
        connected: true
      }
      
      renderWithProviders(<SimpleKitchen />, {
        socketValue: { socket: mockSocket, connected: true, error: null }
      })
      
      expect(mockSocket.on).toHaveBeenCalledWith('orderUpdate', expect.any(Function))
      expect(mockSocket.on).toHaveBeenCalledWith('inventoryUpdate', expect.any(Function))
    })

    it('should clean up socket listeners on unmount', () => {
      const mockSocket = {
        on: jest.fn(),
        off: jest.fn(),
        emit: jest.fn(),
        connected: true
      }
      
      const { unmount } = renderWithProviders(<SimpleKitchen />, {
        socketValue: { socket: mockSocket, connected: true, error: null }
      })
      
      unmount()
      
      expect(mockSocket.off).toHaveBeenCalledWith('orderUpdate')
      expect(mockSocket.off).toHaveBeenCalledWith('inventoryUpdate')
    })

    it('should update orders when receiving socket events', async () => {
      const mockSocket = {
        on: jest.fn(),
        off: jest.fn(),
        emit: jest.fn(),
        connected: true
      }
      
      renderWithProviders(<SimpleKitchen />, {
        socketValue: { socket: mockSocket, connected: true, error: null }
      })
      
      // Get the orderUpdate callback
      const orderUpdateCallback = mockSocket.on.mock.calls.find(
        call => call[0] === 'orderUpdate'
      )[1]
      
      // Simulate receiving an order update
      const updatedOrder = {
        id: 1,
        table_number: 5,
        status: 'ready',
        items: [{ name: 'Burger', quantity: 2, price: 15.99 }],
        total: 31.98,
        created_at: new Date().toISOString()
      }
      
      orderUpdateCallback(updatedOrder)
      
      await waitFor(() => {
        // Component should reflect the updated order status
        expect(screen.getByText('Mark Complete')).toBeInTheDocument()
      })
    })
  })

  describe('Error Handling', () => {
    it('should handle API errors gracefully', async () => {
      setupFetchMock({
        '/api/orders': mockApiResponses.orders.error
      })
      
      renderWithProviders(<SimpleKitchen />)
      
      await waitFor(() => {
        expect(screen.getByText('Failed to load orders')).toBeInTheDocument()
      })
    })

    it('should handle network errors', async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error('Network error'))
      
      renderWithProviders(<SimpleKitchen />)
      
      await waitFor(() => {
        expect(screen.getByText('Network error occurred')).toBeInTheDocument()
      })
    })

    it('should handle missing socket connection', () => {
      renderWithProviders(<SimpleKitchen />, {
        socketValue: { socket: null, connected: false, error: 'Connection failed' }
      })
      
      expect(screen.getByText('Real-time updates unavailable')).toBeInTheDocument()
    })
  })

  describe('Performance', () => {
    it('should debounce status updates', async () => {
      renderWithProviders(<SimpleKitchen />)
      
      await waitFor(() => {
        expect(screen.getByText('Table 5')).toBeInTheDocument()
      })
      
      const updateButton = screen.getAllByText('Mark Preparing')[0]
      
      // Rapid clicks should be debounced
      fireEvent.click(updateButton)
      fireEvent.click(updateButton)
      fireEvent.click(updateButton)
      
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledTimes(3) // Initial load calls + 1 update
      })
    })
  })

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      renderWithProviders(<SimpleKitchen />)
      
      expect(screen.getByRole('main')).toBeInTheDocument()
      expect(screen.getByLabelText(/filter orders/i)).toBeInTheDocument()
    })

    it('should support keyboard navigation', async () => {
      renderWithProviders(<SimpleKitchen />)
      
      await waitFor(() => {
        expect(screen.getByText('Table 5')).toBeInTheDocument()
      })
      
      const firstButton = screen.getAllByText('Mark Preparing')[0]
      firstButton.focus()
      
      expect(document.activeElement).toBe(firstButton)
      
      // Simulate Enter key press
      fireEvent.keyDown(firstButton, { key: 'Enter', code: 'Enter' })
      
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/orders/1',
          expect.objectContaining({
            method: 'PUT'
          })
        )
      })
    })
  })
})