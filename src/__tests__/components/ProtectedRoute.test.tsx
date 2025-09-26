import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { ProtectedRoute } from '../../components/ProtectedRoute'

// Mock react-router-dom
jest.mock('react-router-dom', () => ({
  Navigate: ({ to }: { to: string }) => <div>Navigating to {to}</div>,
  useLocation: () => ({ pathname: '/current' })
}))

// Mock the AuthContext
const mockUseAuth = jest.fn()
jest.mock('../../contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth()
}))

const TestComponent = () => <div>Protected Content</div>

describe('ProtectedRoute Component', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should render children when user is authenticated and no specific roles required', () => {
    mockUseAuth.mockReturnValue({
      user: { id: 1, username: 'testuser', role: 'server' },
      isAuthenticated: true,
      hasAnyRole: jest.fn(() => true)
    })

    render(
      <ProtectedRoute>
        <TestComponent />
      </ProtectedRoute>
    )

    expect(screen.getByText('Protected Content')).toBeInTheDocument()
  })

  it('should redirect to login when user is not authenticated', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      isAuthenticated: false,
      hasAnyRole: jest.fn(() => false)
    })

    render(
      <ProtectedRoute>
        <TestComponent />
      </ProtectedRoute>
    )

    expect(screen.getByText('Navigating to /login')).toBeInTheDocument()
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument()
  })

  it('should show access denied when user lacks required roles', () => {
    mockUseAuth.mockReturnValue({
      user: { id: 1, username: 'testuser', role: 'server' },
      isAuthenticated: true,
      hasAnyRole: jest.fn(() => false)
    })

    render(
      <ProtectedRoute requiredRoles={['manager']}>
        <TestComponent />
      </ProtectedRoute>
    )

    expect(screen.getByText('Access Denied')).toBeInTheDocument()
    expect(screen.getByText('You don\'t have permission to access this page.')).toBeInTheDocument()
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument()
  })

  it('should render children when user has required roles', () => {
    mockUseAuth.mockReturnValue({
      user: { id: 1, username: 'testuser', role: 'manager' },
      isAuthenticated: true,
      hasAnyRole: jest.fn(() => true)
    })

    render(
      <ProtectedRoute requiredRoles={['manager']}>
        <TestComponent />
      </ProtectedRoute>
    )

    expect(screen.getByText('Protected Content')).toBeInTheDocument()
  })

  it('should allow unauthenticated access when requireAuth is false', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      isAuthenticated: false,
      hasAnyRole: jest.fn(() => false)
    })

    render(
      <ProtectedRoute requireAuth={false}>
        <TestComponent />
      </ProtectedRoute>
    )

    expect(screen.getByText('Protected Content')).toBeInTheDocument()
  })
})
