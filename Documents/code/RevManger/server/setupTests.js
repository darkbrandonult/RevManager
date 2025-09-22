// Backend Test Setup
// Global test configuration for backend tests

// Mock environment variables
process.env.NODE_ENV = 'test'
process.env.JWT_SECRET = 'test-secret-key'
process.env.DATABASE_URL = 'postgresql://postgres:postgres@localhost:5434/revmanager_test'
process.env.REDIS_URL = 'redis://localhost:6381'

// Mock console methods to reduce noise during tests
global.console = {
  ...console,
  log: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
}

// Global test timeout
jest.setTimeout(10000)

// Global beforeEach
beforeEach(() => {
  jest.clearAllMocks()
})

// Global afterEach
afterEach(() => {
  jest.clearAllTimers()
})
