/**
 * Simple test to verify Jest and testing infrastructure is working
 */

describe('Testing Infrastructure', () => {
  it('should run basic test correctly', () => {
    expect(1 + 1).toBe(2)
  })

  it('should have access to DOM methods', () => {
    expect(document).toBeDefined()
    expect(window).toBeDefined()
  })

  it('should have mocked fetch available', () => {
    expect(global.fetch).toBeDefined()
    expect(typeof global.fetch).toBe('function')
  })

  it('should have localStorage mock available', () => {
    expect(localStorage).toBeDefined()
    expect(localStorage.getItem).toBeDefined()
    expect(localStorage.setItem).toBeDefined()
  })
})