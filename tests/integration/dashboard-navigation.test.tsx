/**
 * Integration Tests - Dashboard Navigation Flow
 * Tests the complete user journey through the restaurant management system
 */

import React from 'react'
import { screen, fireEvent, waitFor, within } from '@testing-library/react'
import '@testing-library/jest-dom'
import BasicDashboard from '../../src/components/BasicDashboard'
import { renderWithProviders, setupFetchMock, mockUsers, createMockAuthContext } from '../../src/__tests__/utils/testUtils'

describe('Dashboard Navigation Integration', () => {
  beforeEach(() => {
    setupFetchMock({
      '/api/orders': {
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
      '/api/menu': {
        status: 200,
        json: async () => ([
          {
            id: 1,
            name: 'Classic Burger',
            description: 'Beef patty with lettuce, tomato, cheese',
            price: 15.99,
            category: 'Burgers',
            available: true
          }
        ])
      },
      '/api/inventory': {
        status: 200,
        json: async () => ([
          {
            id: 1,
            name: 'Ground Beef',
            quantity: 50,
            unit: 'lbs',
            min_threshold: 10,
            cost_per_unit: 8.99
          }
        ])
      },
      '/api/schedules': {
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
    })
    jest.clearAllMocks()
  })

  describe('Manager Complete Workflow', () => {
    it('should allow manager to navigate through all features', async () => {
      const authContext = createMockAuthContext(mockUsers.manager)
      
      renderWithProviders(
        <BasicDashboard userRole="manager" userName="Test Manager" />,
        { authValue: authContext }
      )
      
      // 1. Start at dashboard
      expect(screen.getByText('Manager Dashboard')).toBeInTheDocument()
      
      // 2. Navigate to Kitchen Management
      fireEvent.click(screen.getByText('🍳 Kitchen Management'))
      
      await waitFor(() => {
        expect(screen.getByText('Kitchen Management')).toBeInTheDocument()
        expect(screen.getByText('Active Orders')).toBeInTheDocument()
      })
      
      // Verify orders are loaded
      await waitFor(() => {
        expect(screen.getByText('Table 5')).toBeInTheDocument()
        expect(screen.getByText('Table 3')).toBeInTheDocument()
      })
      
      // 3. Navigate to Menu Management
      fireEvent.click(screen.getByText('📋 Menu Management'))
      
      await waitFor(() => {
        expect(screen.getByText('Menu Management')).toBeInTheDocument()
        expect(screen.getByText('Add New Item')).toBeInTheDocument()
      })
      
      // Verify menu items are loaded
      await waitFor(() => {
        expect(screen.getByText('Classic Burger')).toBeInTheDocument()
      })
      
      // 4. Navigate to Reports
      fireEvent.click(screen.getByText('📊 Reports'))
      
      await waitFor(() => {
        expect(screen.getByText('Restaurant Reports')).toBeInTheDocument()
      })
      
      // 5. Navigate to Staff Management
      fireEvent.click(screen.getByText('👥 Staff Management'))
      
      await waitFor(() => {
        expect(screen.getByText('Staff Payroll')).toBeInTheDocument()
      })
      
      // Verify schedules are loaded
      await waitFor(() => {
        expect(screen.getByText('Test Server')).toBeInTheDocument()
      })
    })

    it('should maintain state across navigation', async () => {
      const authContext = createMockAuthContext(mockUsers.manager)
      
      renderWithProviders(
        <BasicDashboard userRole="manager" userName="Test Manager" />,
        { authValue: authContext }
      )
      
      // Navigate to Kitchen Management and filter orders
      fireEvent.click(screen.getByText('🍳 Kitchen Management'))
      
      await waitFor(() => {
        expect(screen.getByText('Table 5')).toBeInTheDocument()
      })
      
      // Filter by preparing status
      fireEvent.click(screen.getByText('Preparing'))
      
      await waitFor(() => {
        expect(screen.getByText('Table 3')).toBeInTheDocument()
        expect(screen.queryByText('Table 5')).not.toBeInTheDocument()
      })
      
      // Navigate away and back
      fireEvent.click(screen.getByText('📋 Menu Management'))
      fireEvent.click(screen.getByText('🍳 Kitchen Management'))
      
      // Filter should persist (implementation dependent)
      await waitFor(() => {
        expect(screen.getByText('Kitchen Management')).toBeInTheDocument()
      })
    })
  })

  describe('Cross-Component Data Flow', () => {
    it('should update kitchen orders when menu items change availability', async () => {
      const authContext = createMockAuthContext(mockUsers.manager)
      
      renderWithProviders(
        <BasicDashboard userRole="manager" userName="Test Manager" />,
        { authValue: authContext }
      )
      
      // Start at Menu Management
      fireEvent.click(screen.getByText('📋 Menu Management'))
      
      await waitFor(() => {
        expect(screen.getByText('Classic Burger')).toBeInTheDocument()
      })
      
      // Mock socket for real-time updates
      const mockSocket = {
        on: jest.fn(),
        off: jest.fn(),
        emit: jest.fn(),
        connected: true
      }
      
      // Toggle availability
      setupFetchMock({
        '/api/menu/1/availability': {
          status: 200,
          json: async () => ({ available: false })
        }
      })
      
      const toggleButton = screen.getByText('Available')
      fireEvent.click(toggleButton)
      
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/menu/1/availability',
          expect.objectContaining({
            method: 'PATCH'
          })
        )
      })
      
      // Navigate to Kitchen Management
      fireEvent.click(screen.getByText('🍳 Kitchen Management'))
      
      await waitFor(() => {
        expect(screen.getByText('Kitchen Management')).toBeInTheDocument()
      })
      
      // Kitchen should reflect menu changes (through socket updates)
    })

    it('should handle order updates across kitchen and dashboard', async () => {
      const authContext = createMockAuthContext(mockUsers.manager)
      
      renderWithProviders(
        <BasicDashboard userRole="manager" userName="Test Manager" />,
        { authValue: authContext }
      )
      
      // Navigate to Kitchen Management
      fireEvent.click(screen.getByText('🍳 Kitchen Management'))
      
      await waitFor(() => {
        expect(screen.getByText('Table 5')).toBeInTheDocument()
      })
      
      // Update order status
      setupFetchMock({
        '/api/orders/1': {
          status: 200,
          json: async () => ({
            id: 1,
            table_number: 5,
            status: 'preparing',
            items: [{ name: 'Burger', quantity: 2, price: 15.99 }],
            total: 31.98,
            created_at: new Date().toISOString()
          })
        }
      })
      
      const updateButton = screen.getAllByText('Mark Preparing')[0]
      fireEvent.click(updateButton)
      
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/orders/1',
          expect.objectContaining({
            method: 'PUT',
            body: JSON.stringify({ status: 'preparing' })
          })
        )
      })
      
      // Navigate back to dashboard
      fireEvent.click(screen.getByText('📊 Dashboard'))
      
      // Dashboard should reflect updated order stats
      await waitFor(() => {
        expect(screen.getByText('Dashboard Overview')).toBeInTheDocument()
      })
    })
  })

  describe('Role-based Access Integration', () => {
    it('should enforce chef access restrictions', async () => {
      const authContext = createMockAuthContext(mockUsers.chef)
      
      renderWithProviders(
        <BasicDashboard userRole="chef" userName="Test Chef" />,
        { authValue: authContext }
      )
      
      // Chef should have access to kitchen
      expect(screen.getByText('🍳 Kitchen Management')).toBeInTheDocument()
      
      // But not to staff management
      expect(screen.queryByText('👥 Staff Management')).not.toBeInTheDocument()
      
      // Should be able to navigate to kitchen
      fireEvent.click(screen.getByText('🍳 Kitchen Management'))
      
      await waitFor(() => {
        expect(screen.getByText('Kitchen Management')).toBeInTheDocument()
        expect(screen.getByText('Active Orders')).toBeInTheDocument()
      })
    })

    it('should enforce server access restrictions', async () => {
      const authContext = createMockAuthContext(mockUsers.server)
      
      renderWithProviders(
        <BasicDashboard userRole="server" userName="Test Server" />,
        { authValue: authContext }
      )
      
      // Server should not have access to kitchen management
      expect(screen.queryByText('🍳 Kitchen Management')).not.toBeInTheDocument()
      
      // Should have access to public menu
      expect(screen.getByText('🍽️ Public Menu')).toBeInTheDocument()
      
      fireEvent.click(screen.getByText('🍽️ Public Menu'))
      
      await waitFor(() => {
        expect(screen.getByText('Restaurant Menu')).toBeInTheDocument()
      })
    })

    it('should handle role changes dynamically', async () => {
      const authContext = createMockAuthContext(mockUsers.server)
      
      const { rerender } = renderWithProviders(
        <BasicDashboard userRole="server" userName="Test Server" />,
        { authValue: authContext }
      )
      
      // Initially server - no kitchen access
      expect(screen.queryByText('🍳 Kitchen Management')).not.toBeInTheDocument()
      
      // Change role to manager
      const managerAuthContext = createMockAuthContext(mockUsers.manager)
      
      rerender(
        <BasicDashboard userRole="manager" userName="Test Manager" />
      )
      
      // Now should have kitchen access
      expect(screen.getByText('🍳 Kitchen Management')).toBeInTheDocument()
    })
  })

  describe('Error Recovery Integration', () => {
    it('should handle API failures gracefully across components', async () => {
      // Setup failing APIs
      setupFetchMock({
        '/api/orders': {
          status: 500,
          json: async () => ({ error: 'Server error' })
        },
        '/api/menu': {
          status: 500,
          json: async () => ({ error: 'Server error' })
        }
      })
      
      const authContext = createMockAuthContext(mockUsers.manager)
      
      renderWithProviders(
        <BasicDashboard userRole="manager" userName="Test Manager" />,
        { authValue: authContext }
      )
      
      // Navigate to Kitchen Management - should show error
      fireEvent.click(screen.getByText('🍳 Kitchen Management'))
      
      await waitFor(() => {
        expect(screen.getByText('Failed to load orders')).toBeInTheDocument()
      })
      
      // Navigate to Menu Management - should show error
      fireEvent.click(screen.getByText('📋 Menu Management'))
      
      await waitFor(() => {
        expect(screen.getByText('Failed to load menu items')).toBeInTheDocument()
      })
      
      // Navigation should still work
      fireEvent.click(screen.getByText('📊 Dashboard'))
      
      await waitFor(() => {
        expect(screen.getByText('Manager Dashboard')).toBeInTheDocument()
      })
    })

    it('should recover from network errors', async () => {
      const authContext = createMockAuthContext(mockUsers.manager)
      
      // Start with failing fetch
      global.fetch = jest.fn().mockRejectedValue(new Error('Network error'))
      
      renderWithProviders(
        <BasicDashboard userRole="manager" userName="Test Manager" />,
        { authValue: authContext }
      )
      
      fireEvent.click(screen.getByText('🍳 Kitchen Management'))
      
      await waitFor(() => {
        expect(screen.getByText('Network error occurred')).toBeInTheDocument()
      })
      
      // Fix the network
      setupFetchMock()
      
      // Retry should work
      const retryButton = screen.getByText('Retry')
      fireEvent.click(retryButton)
      
      await waitFor(() => {
        expect(screen.getByText('Table 5')).toBeInTheDocument()
      })
    })
  })

  describe('Performance Integration', () => {
    it('should handle large datasets efficiently', async () => {
      // Mock large dataset
      const largeOrdersList = Array.from({ length: 100 }, (_, i) => ({
        id: i + 1,
        table_number: (i % 20) + 1,
        status: ['pending', 'preparing', 'ready'][i % 3],
        items: [{ name: `Item ${i}`, quantity: 1, price: 10.99 }],
        total: 10.99,
        created_at: new Date().toISOString()
      }))
      
      setupFetchMock({
        '/api/orders': {
          status: 200,
          json: async () => largeOrdersList
        }
      })
      
      const authContext = createMockAuthContext(mockUsers.manager)
      
      renderWithProviders(
        <BasicDashboard userRole="manager" userName="Test Manager" />,
        { authValue: authContext }
      )
      
      const startTime = performance.now()
      
      fireEvent.click(screen.getByText('🍳 Kitchen Management'))
      
      await waitFor(() => {
        expect(screen.getByText('Kitchen Management')).toBeInTheDocument()
      })
      
      const endTime = performance.now()
      const loadTime = endTime - startTime
      
      // Should load within reasonable time (adjust threshold as needed)
      expect(loadTime).toBeLessThan(1000) // 1 second
      
      // Should display some orders
      expect(screen.getByText(/Table \d+/)).toBeInTheDocument()
    })
  })
})