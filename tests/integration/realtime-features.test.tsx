/**
 * Integration Tests - Real-time Features
 * Tests Socket.io integration and real-time updates across components
 */

import React from 'react'
import { screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import BasicDashboard from '../../src/components/BasicDashboard'
import { renderWithProviders, setupFetchMock, mockUsers, createMockAuthContext, createMockSocketContext } from '../../src/__tests__/utils/testUtils'

describe('Real-time Features Integration', () => {
  let mockSocket: any

  beforeEach(() => {
    mockSocket = {
      on: jest.fn(),
      off: jest.fn(),
      emit: jest.fn(),
      connected: true,
      id: 'test-socket-id'
    }
    
    setupFetchMock()
    jest.clearAllMocks()
  })

  describe('Socket Connection Integration', () => {
    it('should establish socket connection on mount', () => {
      const socketContext = createMockSocketContext(mockSocket)
      const authContext = createMockAuthContext(mockUsers.manager)
      
      renderWithProviders(
        <BasicDashboard userRole="manager" userName="Test Manager" />,
        { authValue: authContext, socketValue: socketContext }
      )
      
      // Navigate to kitchen to trigger socket listeners
      fireEvent.click(screen.getByText('🍳 Kitchen Management'))
      
      expect(mockSocket.on).toHaveBeenCalledWith('orderUpdate', expect.any(Function))
      expect(mockSocket.on).toHaveBeenCalledWith('inventoryUpdate', expect.any(Function))
    })

    it('should handle socket disconnection gracefully', async () => {
      const disconnectedSocket = {
        ...mockSocket,
        connected: false
      }
      
      const socketContext = createMockSocketContext(disconnectedSocket)
      const authContext = createMockAuthContext(mockUsers.manager)
      
      renderWithProviders(
        <BasicDashboard userRole="manager" userName="Test Manager" />,
        { authValue: authContext, socketValue: socketContext }
      )
      
      fireEvent.click(screen.getByText('🍳 Kitchen Management'))
      
      await waitFor(() => {
        expect(screen.getByText('Real-time updates unavailable')).toBeInTheDocument()
      })
    })

    it('should reconnect socket automatically', async () => {
      const socketContext = createMockSocketContext(mockSocket)
      const authContext = createMockAuthContext(mockUsers.manager)
      
      const { rerender } = renderWithProviders(
        <BasicDashboard userRole="manager" userName="Test Manager" />,
        { authValue: authContext, socketValue: socketContext }
      )
      
      fireEvent.click(screen.getByText('🍳 Kitchen Management'))
      
      // Simulate disconnection
      const disconnectedContext = createMockSocketContext({
        ...mockSocket,
        connected: false
      })
      
      rerender(<BasicDashboard userRole="manager" userName="Test Manager" />)
      
      await waitFor(() => {
        expect(screen.getByText('Real-time updates unavailable')).toBeInTheDocument()
      })
      
      // Simulate reconnection
      const reconnectedContext = createMockSocketContext(mockSocket)
      
      rerender(<BasicDashboard userRole="manager" userName="Test Manager" />)
      
      await waitFor(() => {
        expect(screen.queryByText('Real-time updates unavailable')).not.toBeInTheDocument()
      })
    })
  })

  describe('Real-time Order Updates', () => {
    it('should update kitchen display when orders change', async () => {
      const socketContext = createMockSocketContext(mockSocket)
      const authContext = createMockAuthContext(mockUsers.manager)
      
      renderWithProviders(
        <BasicDashboard userRole="manager" userName="Test Manager" />,
        { authValue: authContext, socketValue: socketContext }
      )
      
      fireEvent.click(screen.getByText('🍳 Kitchen Management'))
      
      await waitFor(() => {
        expect(screen.getByText('Table 5')).toBeInTheDocument()
      })
      
      // Get the orderUpdate callback
      const orderUpdateCallback = mockSocket.on.mock.calls.find(
        call => call[0] === 'orderUpdate'
      )?.[1]
      
      expect(orderUpdateCallback).toBeDefined()
      
      // Simulate new order from socket
      const newOrder = {
        id: 3,
        table_number: 7,
        status: 'pending',
        items: [{ name: 'New Dish', quantity: 1, price: 12.99 }],
        total: 12.99,
        created_at: new Date().toISOString()
      }
      
      orderUpdateCallback(newOrder)
      
      await waitFor(() => {
        expect(screen.getByText('Table 7')).toBeInTheDocument()
      })
    })

    it('should update order status in real-time', async () => {
      const socketContext = createMockSocketContext(mockSocket)
      const authContext = createMockAuthContext(mockUsers.manager)
      
      renderWithProviders(
        <BasicDashboard userRole="manager" userName="Test Manager" />,
        { authValue: authContext, socketValue: socketContext }
      )
      
      fireEvent.click(screen.getByText('🍳 Kitchen Management'))
      
      await waitFor(() => {
        expect(screen.getByText('Table 5')).toBeInTheDocument()
      })
      
      const orderUpdateCallback = mockSocket.on.mock.calls.find(
        call => call[0] === 'orderUpdate'
      )?.[1]
      
      // Simulate order status update
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
        expect(screen.getByText('Mark Complete')).toBeInTheDocument()
      })
    })

    it('should broadcast order updates to multiple components', async () => {
      const socketContext = createMockSocketContext(mockSocket)
      const authContext = createMockAuthContext(mockUsers.manager)
      
      renderWithProviders(
        <BasicDashboard userRole="manager" userName="Test Manager" />,
        { authValue: authContext, socketValue: socketContext }
      )
      
      // Start at dashboard
      await waitFor(() => {
        expect(screen.getByText('Dashboard Overview')).toBeInTheDocument()
      })
      
      // Navigate to kitchen
      fireEvent.click(screen.getByText('🍳 Kitchen Management'))
      
      await waitFor(() => {
        expect(screen.getByText('Kitchen Management')).toBeInTheDocument()
      })
      
      const orderUpdateCallback = mockSocket.on.mock.calls.find(
        call => call[0] === 'orderUpdate'
      )?.[1]
      
      // Navigate back to dashboard
      fireEvent.click(screen.getByText('📊 Dashboard'))
      
      // Simulate order update
      const updatedOrder = {
        id: 1,
        table_number: 5,
        status: 'completed',
        items: [{ name: 'Burger', quantity: 2, price: 15.99 }],
        total: 31.98,
        created_at: new Date().toISOString()
      }
      
      orderUpdateCallback(updatedOrder)
      
      // Dashboard should reflect the update
      await waitFor(() => {
        expect(screen.getByText('Dashboard Overview')).toBeInTheDocument()
      })
    })
  })

  describe('Real-time Inventory Updates', () => {
    it('should update inventory displays in real-time', async () => {
      const socketContext = createMockSocketContext(mockSocket)
      const authContext = createMockAuthContext(mockUsers.manager)
      
      renderWithProviders(
        <BasicDashboard userRole="manager" userName="Test Manager" />,
        { authValue: authContext, socketValue: socketContext }
      )
      
      fireEvent.click(screen.getByText('🍳 Kitchen Management'))
      
      await waitFor(() => {
        expect(screen.getByText('Ground Beef')).toBeInTheDocument()
      })
      
      const inventoryUpdateCallback = mockSocket.on.mock.calls.find(
        call => call[0] === 'inventoryUpdate'
      )?.[1]
      
      expect(inventoryUpdateCallback).toBeDefined()
      
      // Simulate low stock update
      const updatedInventory = {
        id: 1,
        name: 'Ground Beef',
        quantity: 3, // Below threshold
        unit: 'lbs',
        min_threshold: 10,
        cost_per_unit: 8.99
      }
      
      inventoryUpdateCallback(updatedInventory)
      
      await waitFor(() => {
        expect(screen.getByText('⚠️')).toBeInTheDocument() // Low stock warning
      })
    })

    it('should trigger alerts for critical inventory levels', async () => {
      const socketContext = createMockSocketContext(mockSocket)
      const authContext = createMockAuthContext(mockUsers.manager)
      
      renderWithProviders(
        <BasicDashboard userRole="manager" userName="Test Manager" />,
        { authValue: authContext, socketValue: socketContext }
      )
      
      fireEvent.click(screen.getByText('🍳 Kitchen Management'))
      
      const inventoryUpdateCallback = mockSocket.on.mock.calls.find(
        call => call[0] === 'inventoryUpdate'
      )?.[1]
      
      // Simulate critical stock level
      const criticalInventory = {
        id: 1,
        name: 'Ground Beef',
        quantity: 0,
        unit: 'lbs',
        min_threshold: 10,
        cost_per_unit: 8.99
      }
      
      inventoryUpdateCallback(criticalInventory)
      
      await waitFor(() => {
        expect(screen.getByText('🚨')).toBeInTheDocument() // Critical alert
      })
    })
  })

  describe('Real-time Menu Updates', () => {
    it('should update menu availability across all views', async () => {
      const socketContext = createMockSocketContext(mockSocket)
      const authContext = createMockAuthContext(mockUsers.manager)
      
      renderWithProviders(
        <BasicDashboard userRole="manager" userName="Test Manager" />,
        { authValue: authContext, socketValue: socketContext }
      )
      
      // Start at menu management
      fireEvent.click(screen.getByText('📋 Menu Management'))
      
      await waitFor(() => {
        expect(screen.getByText('Classic Burger')).toBeInTheDocument()
      })
      
      // Simulate menu update from another user
      mockSocket.emit('menuUpdate', {
        id: 1,
        name: 'Classic Burger',
        available: false
      })
      
      // Navigate to public menu
      fireEvent.click(screen.getByText('🍽️ Public Menu'))
      
      await waitFor(() => {
        // Item should show as unavailable
        expect(screen.getByText('Unavailable')).toBeInTheDocument()
      })
    })
  })

  describe('Multi-user Scenarios', () => {
    it('should handle concurrent updates from multiple users', async () => {
      const socketContext = createMockSocketContext(mockSocket)
      const authContext = createMockAuthContext(mockUsers.manager)
      
      renderWithProviders(
        <BasicDashboard userRole="manager" userName="Test Manager" />,
        { authValue: authContext, socketValue: socketContext }
      )
      
      fireEvent.click(screen.getByText('🍳 Kitchen Management'))
      
      await waitFor(() => {
        expect(screen.getByText('Table 5')).toBeInTheDocument()
      })
      
      const orderUpdateCallback = mockSocket.on.mock.calls.find(
        call => call[0] === 'orderUpdate'
      )?.[1]
      
      // Simulate rapid updates from different users
      const updates = [
        {
          id: 1,
          table_number: 5,
          status: 'preparing',
          updated_by: 'chef1'
        },
        {
          id: 1,
          table_number: 5,
          status: 'ready',
          updated_by: 'chef2'
        },
        {
          id: 1,
          table_number: 5,
          status: 'completed',
          updated_by: 'server1'
        }
      ]
      
      // Send updates in sequence
      updates.forEach((update, index) => {
        setTimeout(() => {
          orderUpdateCallback(update)
        }, index * 100)
      })
      
      // Final state should reflect last update
      await waitFor(() => {
        expect(screen.getByText('Completed')).toBeInTheDocument()
      }, { timeout: 1000 })
    })

    it('should resolve conflicts in concurrent edits', async () => {
      const socketContext = createMockSocketContext(mockSocket)
      const authContext = createMockAuthContext(mockUsers.manager)
      
      renderWithProviders(
        <BasicDashboard userRole="manager" userName="Test Manager" />,
        { authValue: authContext, socketValue: socketContext }
      )
      
      fireEvent.click(screen.getByText('📋 Menu Management'))
      
      await waitFor(() => {
        expect(screen.getByText('Classic Burger')).toBeInTheDocument()
      })
      
      // Simulate conflict resolution for menu item edit
      mockSocket.emit('menuConflict', {
        id: 1,
        type: 'edit_conflict',
        message: 'Another user is editing this item'
      })
      
      await waitFor(() => {
        expect(screen.getByText('Item is being edited by another user')).toBeInTheDocument()
      })
    })
  })

  describe('Performance with Real-time Updates', () => {
    it('should throttle frequent socket updates', async () => {
      const socketContext = createMockSocketContext(mockSocket)
      const authContext = createMockAuthContext(mockUsers.manager)
      
      renderWithProviders(
        <BasicDashboard userRole="manager" userName="Test Manager" />,
        { authValue: authContext, socketValue: socketContext }
      )
      
      fireEvent.click(screen.getByText('🍳 Kitchen Management'))
      
      const orderUpdateCallback = mockSocket.on.mock.calls.find(
        call => call[0] === 'orderUpdate'
      )?.[1]
      
      // Simulate rapid-fire updates
      const rapidUpdates = Array.from({ length: 10 }, (_, i) => ({
        id: 1,
        table_number: 5,
        status: 'preparing',
        quantity: i + 1,
        timestamp: Date.now() + i
      }))
      
      const startTime = performance.now()
      
      rapidUpdates.forEach(update => {
        orderUpdateCallback(update)
      })
      
      const endTime = performance.now()
      
      // Should handle updates efficiently
      expect(endTime - startTime).toBeLessThan(100) // 100ms threshold
    })

    it('should maintain performance with many concurrent connections', async () => {
      const socketContext = createMockSocketContext(mockSocket)
      const authContext = createMockAuthContext(mockUsers.manager)
      
      renderWithProviders(
        <BasicDashboard userRole="manager" userName="Test Manager" />,
        { authValue: authContext, socketValue: socketContext }
      )
      
      // Simulate large number of socket events
      const eventHandlers = mockSocket.on.mock.calls
      
      expect(eventHandlers.length).toBeGreaterThan(0)
      
      // Should not exceed reasonable number of listeners
      expect(eventHandlers.length).toBeLessThan(20)
    })
  })

  describe('Error Handling in Real-time Updates', () => {
    it('should handle malformed socket data gracefully', async () => {
      const socketContext = createMockSocketContext(mockSocket)
      const authContext = createMockAuthContext(mockUsers.manager)
      
      renderWithProviders(
        <BasicDashboard userRole="manager" userName="Test Manager" />,
        { authValue: authContext, socketValue: socketContext }
      )
      
      fireEvent.click(screen.getByText('🍳 Kitchen Management'))
      
      const orderUpdateCallback = mockSocket.on.mock.calls.find(
        call => call[0] === 'orderUpdate'
      )?.[1]
      
      // Send malformed data
      orderUpdateCallback(null)
      orderUpdateCallback(undefined)
      orderUpdateCallback({ invalid: 'data' })
      
      // Component should remain stable
      await waitFor(() => {
        expect(screen.getByText('Kitchen Management')).toBeInTheDocument()
      })
    })

    it('should recover from socket errors', async () => {
      const socketContext = createMockSocketContext({
        ...mockSocket,
        connected: false,
        error: 'Connection lost'
      })
      const authContext = createMockAuthContext(mockUsers.manager)
      
      renderWithProviders(
        <BasicDashboard userRole="manager" userName="Test Manager" />,
        { authValue: authContext, socketValue: socketContext }
      )
      
      fireEvent.click(screen.getByText('🍳 Kitchen Management'))
      
      await waitFor(() => {
        expect(screen.getByText('Real-time updates unavailable')).toBeInTheDocument()
      })
      
      // Component should still function without real-time updates
      expect(screen.getByText('Kitchen Management')).toBeInTheDocument()
      expect(screen.getByText('Active Orders')).toBeInTheDocument()
    })
  })
})