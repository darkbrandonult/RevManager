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

const TestComponent = () => {
  const auth = useAuth()
  
  return (
    <div>
      <div data-testid="auth-status">
        {auth.isAuthenticated ? 'authenticated' : 'not-authenticated'}
      </div>
      <div data-testid="user-role">
        {auth.user?.role || 'no-role'}
      </div>
      <div data-testid="user-name">
        {auth.user ? `${auth.user.firstName} ${auth.user.lastName}` : 'no-user'}
      </div>
    </div>
  )
}

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
