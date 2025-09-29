import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import BasicDashboard from '../../components/BasicDashboard'
import { renderWithProviders, mockUsers, setupFetchMock } from '../utils/testUtils'

describe('BasicDashboard Component', () => {
  beforeEach(() => {
    setupFetchMock()
    jest.clearAllMocks()
  })

  describe('Role-based Tab Rendering', () => {
    it('should render manager tabs correctly', () => {
      renderWithProviders(
        <BasicDashboard userRole="manager" userName="Test Manager" />
      )
      
      expect(screen.getByText('📊 Dashboard')).toBeInTheDocument()
      expect(screen.getByText('🍽️ Public Menu')).toBeInTheDocument()
      expect(screen.getByText('🍳 Kitchen Management')).toBeInTheDocument()
      expect(screen.getByText('📋 Menu Management')).toBeInTheDocument()
      expect(screen.getByText('📊 Reports')).toBeInTheDocument()
      expect(screen.getByText('👥 Staff Management')).toBeInTheDocument()
    })

    it('should render chef tabs correctly', () => {
      renderWithProviders(
        <BasicDashboard userRole="chef" userName="Test Chef" />
      )
      
      expect(screen.getByText('📊 Dashboard')).toBeInTheDocument()
      expect(screen.getByText('🍽️ Public Menu')).toBeInTheDocument()
      expect(screen.getByText('🍳 Kitchen Management')).toBeInTheDocument()
      expect(screen.queryByText('👥 Staff Management')).not.toBeInTheDocument()
    })

    it('should render server tabs correctly', () => {
      renderWithProviders(
        <BasicDashboard userRole="server" userName="Test Server" />
      )
      
      expect(screen.getByText('📊 Dashboard')).toBeInTheDocument()
      expect(screen.getByText('🍽️ Public Menu')).toBeInTheDocument()
      expect(screen.queryByText('🍳 Kitchen Management')).not.toBeInTheDocument()
      expect(screen.queryByText('👥 Staff Management')).not.toBeInTheDocument()
    })

    it('should render owner tabs correctly', () => {
      renderWithProviders(
        <BasicDashboard userRole="owner" userName="Test Owner" />
      )
      
      expect(screen.getByText('📊 Dashboard')).toBeInTheDocument()
      expect(screen.getByText('🍽️ Public Menu')).toBeInTheDocument()
      expect(screen.getByText('🍳 Kitchen Management')).toBeInTheDocument()
      expect(screen.getByText('📋 Menu Management')).toBeInTheDocument()
      expect(screen.getByText('📊 Reports')).toBeInTheDocument()
      expect(screen.getByText('👥 Staff Management')).toBeInTheDocument()
    })
  })

  describe('Tab Navigation', () => {
    it('should start with dashboard tab active', () => {
      renderWithProviders(
        <BasicDashboard userRole="manager" userName="Test Manager" />
      )
      
      const dashboardTab = screen.getByText('📊 Dashboard')
      expect(dashboardTab).toHaveClass('bg-blue-100', 'text-blue-700')
    })

    it('should switch tabs when clicked', async () => {
      renderWithProviders(
        <BasicDashboard userRole="manager" userName="Test Manager" />
      )
      
      const kitchenTab = screen.getByText('🍳 Kitchen Management')
      fireEvent.click(kitchenTab)
      
      await waitFor(() => {
        expect(kitchenTab).toHaveClass('bg-blue-100', 'text-blue-700')
      })
    })

    it('should render correct content for each tab', async () => {
      renderWithProviders(
        <BasicDashboard userRole="manager" userName="Test Manager" />
      )
      
      // Test menu management tab
      const menuTab = screen.getByText('📋 Menu Management')
      fireEvent.click(menuTab)
      
      await waitFor(() => {
        expect(screen.getByText('Menu Management')).toBeInTheDocument()
      })
      
      // Test reports tab
      const reportsTab = screen.getByText('📊 Reports')
      fireEvent.click(reportsTab)
      
      await waitFor(() => {
        expect(screen.getByText('Restaurant Reports')).toBeInTheDocument()
      })
    })
  })

  describe('User Information Display', () => {
    it('should display user name and role', () => {
      renderWithProviders(
        <BasicDashboard userRole="manager" userName="John Doe" />
      )
      
      expect(screen.getByText(/Welcome, John Doe/)).toBeInTheDocument()
      expect(screen.getByText(/Manager Dashboard/)).toBeInTheDocument()
    })

    it('should handle different user roles in header', () => {
      const roles = [
        { role: 'chef', expected: 'Chef Dashboard' },
        { role: 'server', expected: 'Server Dashboard' },
        { role: 'owner', expected: 'Owner Dashboard' }
      ]

      roles.forEach(({ role, expected }) => {
        const { unmount } = renderWithProviders(
          <BasicDashboard userRole={role} userName="Test User" />
        )
        
        expect(screen.getByText(expected)).toBeInTheDocument()
        unmount()
      })
    })
  })

  describe('Navigation Callbacks', () => {
    it('should pass navigation callbacks to child components', async () => {
      renderWithProviders(
        <BasicDashboard userRole="manager" userName="Test Manager" />
      )
      
      // Click on a navigation button in SimpleDashboard
      const viewOrdersButton = screen.getByText('View Orders')
      fireEvent.click(viewOrdersButton)
      
      await waitFor(() => {
        expect(screen.getByText('🍳 Kitchen Management')).toHaveClass('bg-blue-100', 'text-blue-700')
      })
    })

    it('should handle navigation from different components', async () => {
      renderWithProviders(
        <BasicDashboard userRole="manager" userName="Test Manager" />
      )
      
      // Navigate to menu management
      const manageMenuButton = screen.getByText('Manage Menu')
      fireEvent.click(manageMenuButton)
      
      await waitFor(() => {
        expect(screen.getByText('📋 Menu Management')).toHaveClass('bg-blue-100', 'text-blue-700')
      })
    })
  })

  describe('Error Handling', () => {
    it('should handle invalid user roles gracefully', () => {
      renderWithProviders(
        <BasicDashboard userRole="invalid" userName="Test User" />
      )
      
      // Should render basic tabs at minimum
      expect(screen.getByText('📊 Dashboard')).toBeInTheDocument()
      expect(screen.getByText('🍽️ Public Menu')).toBeInTheDocument()
    })

    it('should handle empty user name', () => {
      renderWithProviders(
        <BasicDashboard userRole="manager" userName="" />
      )
      
      expect(screen.getByText(/Welcome,/)).toBeInTheDocument()
    })
  })

  describe('Responsive Design', () => {
    it('should handle mobile viewport', () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 480
      })
      
      renderWithProviders(
        <BasicDashboard userRole="manager" userName="Test Manager" />
      )
      
      // Tabs should still be rendered
      expect(screen.getByText('📊 Dashboard')).toBeInTheDocument()
      expect(screen.getByText('🍳 Kitchen Management')).toBeInTheDocument()
    })
  })
})