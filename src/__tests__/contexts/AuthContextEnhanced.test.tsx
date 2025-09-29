import React from 'react'
import { renderHook, act } from '@testing-library/react'
import '@testing-library/jest-dom'
import { AuthProvider, useAuth } from '../../contexts/AuthContext'
import { setupLocalStorageMock, mockUsers } from '../utils/testUtils'

// Mock fetch for login/logout operations
const mockFetch = jest.fn()
global.fetch = mockFetch

describe('AuthContext Enhanced', () => {
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
    })

    it('should initialize with no user if no token exists', () => {
      setupLocalStorageMock({})

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <AuthProvider>{children}</AuthProvider>
      )

      const { result } = renderHook(() => useAuth(), { wrapper })

      expect(result.current.user).toBeNull()
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
      expect(localStorage.setItem).not.toHaveBeenCalled()
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
  })
})