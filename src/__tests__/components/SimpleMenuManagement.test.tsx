import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import SimpleMenuManagement from '../../components/SimpleMenuManagement'
import { renderWithProviders, setupFetchMock, mockApiResponses } from '../utils/testUtils'

describe('SimpleMenuManagement Component', () => {
  beforeEach(() => {
    setupFetchMock()
    jest.clearAllMocks()
  })

  describe('Initial Rendering', () => {
    it('should render menu management interface', () => {
      renderWithProviders(<SimpleMenuManagement />)
      
      expect(screen.getByText('Menu Management')).toBeInTheDocument()
      expect(screen.getByText('Add New Item')).toBeInTheDocument()
    })

    it('should render category filter buttons', () => {
      renderWithProviders(<SimpleMenuManagement />)
      
      expect(screen.getByText('All Categories')).toBeInTheDocument()
      expect(screen.getByText('Burgers')).toBeInTheDocument()
      expect(screen.getByText('Pizza')).toBeInTheDocument()
      expect(screen.getByText('Appetizers')).toBeInTheDocument()
    })
  })

  describe('Menu Items Loading', () => {
    it('should load and display menu items on mount', async () => {
      renderWithProviders(<SimpleMenuManagement />)
      
      await waitFor(() => {
        expect(screen.getByText('Classic Burger')).toBeInTheDocument()
        expect(screen.getByText('Margherita Pizza')).toBeInTheDocument()
      })
    })

    it('should display item details correctly', async () => {
      renderWithProviders(<SimpleMenuManagement />)
      
      await waitFor(() => {
        expect(screen.getByText('$15.99')).toBeInTheDocument()
        expect(screen.getByText('Beef patty with lettuce, tomato, cheese')).toBeInTheDocument()
      })
    })

    it('should show availability status', async () => {
      renderWithProviders(<SimpleMenuManagement />)
      
      await waitFor(() => {
        expect(screen.getAllByText('Available').length).toBeGreaterThan(0)
      })
    })
  })

  describe('Category Filtering', () => {
    it('should filter items by category', async () => {
      renderWithProviders(<SimpleMenuManagement />)
      
      await waitFor(() => {
        expect(screen.getByText('Classic Burger')).toBeInTheDocument()
        expect(screen.getByText('Margherita Pizza')).toBeInTheDocument()
      })
      
      // Filter by Burgers category
      fireEvent.click(screen.getByText('Burgers'))
      
      await waitFor(() => {
        expect(screen.getByText('Classic Burger')).toBeInTheDocument()
        expect(screen.queryByText('Margherita Pizza')).not.toBeInTheDocument()
      })
    })

    it('should show all items when "All Categories" is selected', async () => {
      renderWithProviders(<SimpleMenuManagement />)
      
      await waitFor(() => {
        expect(screen.getByText('Classic Burger')).toBeInTheDocument()
      })
      
      // Filter by category first
      fireEvent.click(screen.getByText('Burgers'))
      
      await waitFor(() => {
        expect(screen.queryByText('Margherita Pizza')).not.toBeInTheDocument()
      })
      
      // Then show all
      fireEvent.click(screen.getByText('All Categories'))
      
      await waitFor(() => {
        expect(screen.getByText('Classic Burger')).toBeInTheDocument()
        expect(screen.getByText('Margherita Pizza')).toBeInTheDocument()
      })
    })
  })

  describe('Add New Item', () => {
    it('should open add item modal when button is clicked', () => {
      renderWithProviders(<SimpleMenuManagement />)
      
      fireEvent.click(screen.getByText('Add New Item'))
      
      expect(screen.getByText('Add Menu Item')).toBeInTheDocument()
      expect(screen.getByLabelText('Name')).toBeInTheDocument()
      expect(screen.getByLabelText('Description')).toBeInTheDocument()
      expect(screen.getByLabelText('Price')).toBeInTheDocument()
      expect(screen.getByLabelText('Category')).toBeInTheDocument()
    })

    it('should validate form inputs', async () => {
      renderWithProviders(<SimpleMenuManagement />)
      
      fireEvent.click(screen.getByText('Add New Item'))
      fireEvent.click(screen.getByText('Save Item'))
      
      await waitFor(() => {
        expect(screen.getByText('Name is required')).toBeInTheDocument()
        expect(screen.getByText('Price is required')).toBeInTheDocument()
      })
    })

    it('should submit new item successfully', async () => {
      setupFetchMock({
        '/api/menu': {
          status: 201,
          json: async () => ({
            id: 3,
            name: 'New Burger',
            description: 'Delicious new burger',
            price: 16.99,
            category: 'Burgers',
            available: true
          })
        }
      })
      
      renderWithProviders(<SimpleMenuManagement />)
      
      fireEvent.click(screen.getByText('Add New Item'))
      
      // Fill form
      fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'New Burger' } })
      fireEvent.change(screen.getByLabelText('Description'), { target: { value: 'Delicious new burger' } })
      fireEvent.change(screen.getByLabelText('Price'), { target: { value: '16.99' } })
      fireEvent.change(screen.getByLabelText('Category'), { target: { value: 'Burgers' } })
      
      fireEvent.click(screen.getByText('Save Item'))
      
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/menu', expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            name: 'New Burger',
            description: 'Delicious new burger',
            price: 16.99,
            category: 'Burgers',
            available: true
          })
        }))
      })
    })
  })

  describe('Edit Item', () => {
    it('should open edit modal when edit button is clicked', async () => {
      renderWithProviders(<SimpleMenuManagement />)
      
      await waitFor(() => {
        expect(screen.getByText('Classic Burger')).toBeInTheDocument()
      })
      
      const editButtons = screen.getAllByText('Edit')
      fireEvent.click(editButtons[0])
      
      expect(screen.getByText('Edit Menu Item')).toBeInTheDocument()
      expect(screen.getByDisplayValue('Classic Burger')).toBeInTheDocument()
    })

    it('should update item successfully', async () => {
      setupFetchMock({
        '/api/menu/1': {
          status: 200,
          json: async () => ({
            id: 1,
            name: 'Updated Burger',
            description: 'Updated description',
            price: 17.99,
            category: 'Burgers',
            available: true
          })
        }
      })
      
      renderWithProviders(<SimpleMenuManagement />)
      
      await waitFor(() => {
        expect(screen.getByText('Classic Burger')).toBeInTheDocument()
      })
      
      const editButtons = screen.getAllByText('Edit')
      fireEvent.click(editButtons[0])
      
      // Update form
      fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Updated Burger' } })
      fireEvent.change(screen.getByLabelText('Price'), { target: { value: '17.99' } })
      
      fireEvent.click(screen.getByText('Update Item'))
      
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/menu/1', expect.objectContaining({
          method: 'PUT'
        }))
      })
    })
  })

  describe('Delete Item', () => {
    it('should show confirmation modal when delete is clicked', async () => {
      renderWithProviders(<SimpleMenuManagement />)
      
      await waitFor(() => {
        expect(screen.getByText('Classic Burger')).toBeInTheDocument()
      })
      
      const deleteButtons = screen.getAllByText('Delete')
      fireEvent.click(deleteButtons[0])
      
      expect(screen.getByText('Confirm Delete')).toBeInTheDocument()
      expect(screen.getByText('Are you sure you want to delete "Classic Burger"?')).toBeInTheDocument()
    })

    it('should delete item when confirmed', async () => {
      setupFetchMock({
        '/api/menu/1': {
          status: 200,
          json: async () => ({ message: 'Item deleted successfully' })
        }
      })
      
      renderWithProviders(<SimpleMenuManagement />)
      
      await waitFor(() => {
        expect(screen.getByText('Classic Burger')).toBeInTheDocument()
      })
      
      const deleteButtons = screen.getAllByText('Delete')
      fireEvent.click(deleteButtons[0])
      fireEvent.click(screen.getByText('Yes, Delete'))
      
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/menu/1', expect.objectContaining({
          method: 'DELETE'
        }))
      })
    })
  })

  describe('Availability Toggle', () => {
    it('should toggle item availability', async () => {
      setupFetchMock({
        '/api/menu/1/availability': {
          status: 200,
          json: async () => ({ available: false })
        }
      })
      
      renderWithProviders(<SimpleMenuManagement />)
      
      await waitFor(() => {
        expect(screen.getByText('Classic Burger')).toBeInTheDocument()
      })
      
      const toggleButtons = screen.getAllByText('Available')
      fireEvent.click(toggleButtons[0])
      
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/menu/1/availability', expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify({ available: false })
        }))
      })
    })
  })

  describe('Search Functionality', () => {
    it('should filter items by search term', async () => {
      renderWithProviders(<SimpleMenuManagement />)
      
      await waitFor(() => {
        expect(screen.getByText('Classic Burger')).toBeInTheDocument()
        expect(screen.getByText('Margherita Pizza')).toBeInTheDocument()
      })
      
      const searchInput = screen.getByPlaceholderText('Search menu items...')
      fireEvent.change(searchInput, { target: { value: 'burger' } })
      
      await waitFor(() => {
        expect(screen.getByText('Classic Burger')).toBeInTheDocument()
        expect(screen.queryByText('Margherita Pizza')).not.toBeInTheDocument()
      })
    })

    it('should search in item descriptions', async () => {
      renderWithProviders(<SimpleMenuManagement />)
      
      await waitFor(() => {
        expect(screen.getByText('Classic Burger')).toBeInTheDocument()
      })
      
      const searchInput = screen.getByPlaceholderText('Search menu items...')
      fireEvent.change(searchInput, { target: { value: 'mozzarella' } })
      
      await waitFor(() => {
        expect(screen.queryByText('Classic Burger')).not.toBeInTheDocument()
        expect(screen.getByText('Margherita Pizza')).toBeInTheDocument()
      })
    })
  })

  describe('Error Handling', () => {
    it('should handle API errors when loading items', async () => {
      setupFetchMock({
        '/api/menu': mockApiResponses.orders.error
      })
      
      renderWithProviders(<SimpleMenuManagement />)
      
      await waitFor(() => {
        expect(screen.getByText('Failed to load menu items')).toBeInTheDocument()
      })
    })

    it('should handle form submission errors', async () => {
      setupFetchMock({
        '/api/menu': {
          status: 400,
          json: async () => ({ error: 'Invalid item data' })
        }
      })
      
      renderWithProviders(<SimpleMenuManagement />)
      
      fireEvent.click(screen.getByText('Add New Item'))
      
      fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Test Item' } })
      fireEvent.change(screen.getByLabelText('Price'), { target: { value: '10.99' } })
      
      fireEvent.click(screen.getByText('Save Item'))
      
      await waitFor(() => {
        expect(screen.getByText('Invalid item data')).toBeInTheDocument()
      })
    })
  })

  describe('Responsive Design', () => {
    it('should adapt to mobile viewport', () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 480
      })
      
      renderWithProviders(<SimpleMenuManagement />)
      
      expect(screen.getByText('Menu Management')).toBeInTheDocument()
      expect(screen.getByText('Add New Item')).toBeInTheDocument()
    })
  })
})