import React from 'react'
import { render, screen, act, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AuthProvider, useAuth } from '../../contexts/AuthContext'

// Mock fetch
const mockFetch = jest.fn()
global.fetch = mockFetch

// Helper to create proper fetch response mock
const createMockResponse = (data: any, status: number = 200) => 
  Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(data),
  } as Response)

// Mock users data
const mockUsers = {
  owner: { id: 1, email: 'owner@test.com', firstName: 'Owner', lastName: 'User', role: 'owner' as const },
  manager: { id: 2, email: 'manager@test.com', firstName: 'John', lastName: 'Doe', role: 'manager' as const },
  chef: { id: 3, email: 'chef@test.com', firstName: 'Chef', lastName: 'Cook', role: 'chef' as const },
  server: { id: 4, email: 'server@test.com', firstName: 'Test', lastName: 'Server', role: 'server' as const },
  customer: { id: 5, email: 'customer@test.com', firstName: 'Customer', lastName: 'User', role: 'customer' as const }
}

import React from 'react'
import { renderHook, act } from '@testing-library/react'
import '@testing-library/jest-dom'
import { AuthProvider, useAuth } from '../../contexts/AuthContext'
import { setupLocalStorageMock, mockUsers } from '../utils/testUtils'

// Mock fetch for login/logout operations
const mockFetch = jest.fn()
global.fetch = mockFetch

describe('AuthContext', () => {
  beforeEach(() => {
    setupLocalStorageMock()
    mockFetch.mockClear()
    jest.clearAllMocks()
  })

  describe('AuthProvider', () => {
    it('should provide authentication context', () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <AuthProvider>{children}</AuthProvider>
      )

      const { result } = renderHook(() => useAuth(), { wrapper })

      expect(result.current).toHaveProperty('user')
      expect(result.current).toHaveProperty('login')
      expect(result.current).toHaveProperty('logout')
      expect(result.current).toHaveProperty('loading')
      expect(result.current).toHaveProperty('error')
    })

    it('should initialize with stored user if token exists', () => {
      setupLocalStorageMock({
        token: 'valid-jwt-token',
        user: JSON.stringify(mockUsers.manager)
      })

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <AuthProvider>{children}</AuthProvider>
      )

      const { result } = renderHook(() => useAuth(), { wrapper })

      expect(result.current.user).toEqual(mockUsers.manager)
      expect(result.current.loading).toBe(false)
    })

    it('should initialize with no user if no token exists', () => {
      setupLocalStorageMock({})

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <AuthProvider>{children}</AuthProvider>
      )

      const { result } = renderHook(() => useAuth(), { wrapper })

      expect(result.current.user).toBeNull()
      expect(result.current.loading).toBe(false)
    })
  })

  describe('Login functionality', () => {
    it('should login user successfully', async () => {
      const mockResponse = {
        status: 200,
        json: async () => ({
          token: 'new-jwt-token',
          user: mockUsers.manager
        })
      }
      
      mockFetch.mockResolvedValue(mockResponse)

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <AuthProvider>{children}</AuthProvider>
      )

      const { result } = renderHook(() => useAuth(), { wrapper })

      await act(async () => {
        await result.current.login('manager@test.com', 'password123')
      })

      expect(result.current.user).toEqual(mockUsers.manager)
      expect(result.current.error).toBeNull()
      expect(localStorage.setItem).toHaveBeenCalledWith('token', 'new-jwt-token')
      expect(localStorage.setItem).toHaveBeenCalledWith('user', JSON.stringify(mockUsers.manager))
    })

    it('should handle login failure', async () => {
      const mockResponse = {
        status: 401,
        json: async () => ({
          error: 'Invalid credentials'
        })
      }
      
      mockFetch.mockResolvedValue(mockResponse)

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <AuthProvider>{children}</AuthProvider>
      )

      const { result } = renderHook(() => useAuth(), { wrapper })

      await act(async () => {
        await result.current.login('wrong@email.com', 'wrongpassword')
      })

      expect(result.current.user).toBeNull()
      expect(result.current.error).toBe('Invalid credentials')
      expect(localStorage.setItem).not.toHaveBeenCalled()
    })

    it('should handle network errors during login', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'))

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <AuthProvider>{children}</AuthProvider>
      )

      const { result } = renderHook(() => useAuth(), { wrapper })

      await act(async () => {
        await result.current.login('test@email.com', 'password')
      })

      expect(result.current.user).toBeNull()
      expect(result.current.error).toBe('Network error occurred')
    })

    it('should set loading state during login', async () => {
      let resolvePromise: (value: any) => void
      const mockPromise = new Promise((resolve) => {
        resolvePromise = resolve
      })
      
      mockFetch.mockReturnValue(mockPromise)

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <AuthProvider>{children}</AuthProvider>
      )

      const { result } = renderHook(() => useAuth(), { wrapper })

      // Start login
      act(() => {
        result.current.login('test@email.com', 'password')
      })

      // Should be loading
      expect(result.current.loading).toBe(true)

      // Resolve the promise
      await act(async () => {
        resolvePromise!({
          status: 200,
          json: async () => ({ token: 'token', user: mockUsers.manager })
        })
      })

      // Should no longer be loading
      expect(result.current.loading).toBe(false)
    })
  })

  describe('Logout functionality', () => {
    it('should logout user successfully', () => {
      setupLocalStorageMock({
        token: 'existing-token',
        user: JSON.stringify(mockUsers.manager)
      })

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <AuthProvider>{children}</AuthProvider>
      )

      const { result } = renderHook(() => useAuth(), { wrapper })

      // Initially should have user
      expect(result.current.user).toEqual(mockUsers.manager)

      act(() => {
        result.current.logout()
      })

      expect(result.current.user).toBeNull()
      expect(localStorage.removeItem).toHaveBeenCalledWith('token')
      expect(localStorage.removeItem).toHaveBeenCalledWith('user')
    })

    it('should handle logout when no user is logged in', () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <AuthProvider>{children}</AuthProvider>
      )

      const { result } = renderHook(() => useAuth(), { wrapper })

      act(() => {
        result.current.logout()
      })

      expect(result.current.user).toBeNull()
      expect(localStorage.removeItem).toHaveBeenCalledWith('token')
      expect(localStorage.removeItem).toHaveBeenCalledWith('user')
    })
  })

  describe('Role-based access', () => {
    it('should provide user role information', () => {
      setupLocalStorageMock({
        token: 'valid-token',
        user: JSON.stringify(mockUsers.manager)
      })

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <AuthProvider>{children}</AuthProvider>
      )

      const { result } = renderHook(() => useAuth(), { wrapper })

      expect(result.current.user?.role).toBe('manager')
    })

    it('should handle different user roles', () => {
      const roles = ['manager', 'chef', 'server', 'owner']

      roles.forEach(role => {
        setupLocalStorageMock({
          token: 'valid-token',
          user: JSON.stringify({ ...mockUsers.manager, role })
        })

        const wrapper = ({ children }: { children: React.ReactNode }) => (
          <AuthProvider>{children}</AuthProvider>
        )

        const { result } = renderHook(() => useAuth(), { wrapper })

        expect(result.current.user?.role).toBe(role)
      })
    })
  })
})

describe('AuthContext', () => {
  beforeEach(() => {
    localStorage.clear()
    mockFetch.mockClear()
  })

  it('should start with no authenticated user', () => {
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )

    expect(screen.getByTestId('auth-status')).toHaveTextContent('not-authenticated')
    expect(screen.getByTestId('user-role')).toHaveTextContent('no-role')
    expect(screen.getByTestId('user-name')).toHaveTextContent('no-user')
  })

  it('should restore user from valid token', async () => {
    localStorage.setItem('token', 'valid-token')
    // Mock profile validation that returns manager user
    mockFetch.mockResolvedValueOnce(createMockResponse({
      user: mockUsers.manager
    }))
    
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('auth-status')).toHaveTextContent('authenticated')
      expect(screen.getByTestId('user-role')).toHaveTextContent('manager')
      expect(screen.getByTestId('user-name')).toHaveTextContent('John Doe')
    })
  })
})
