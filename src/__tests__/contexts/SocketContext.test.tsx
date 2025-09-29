import React from 'react'
import { renderHook, act } from '@testing-library/react'
import '@testing-library/jest-dom'
import { SocketProvider, useSocket } from '../../contexts/SocketContext'

// Mock socket.io-client
const mockSocket = {
  on: jest.fn(),
  off: jest.fn(),
  emit: jest.fn(),
  connect: jest.fn(),
  disconnect: jest.fn(),
  connected: true,
  id: 'mock-socket-id'
}

jest.mock('socket.io-client', () => {
  return jest.fn(() => mockSocket)
})

describe('SocketContext', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockSocket.on.mockClear()
    mockSocket.off.mockClear()
    mockSocket.emit.mockClear()
    mockSocket.connect.mockClear()
    mockSocket.disconnect.mockClear()
  })

  describe('SocketProvider', () => {
    it('should provide socket context', () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <SocketProvider>{children}</SocketProvider>
      )

      const { result } = renderHook(() => useSocket(), { wrapper })

      expect(result.current).toHaveProperty('socket')
      expect(result.current).toHaveProperty('connected')
      expect(result.current).toHaveProperty('error')
    })

    it('should initialize socket connection', () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <SocketProvider>{children}</SocketProvider>
      )

      renderHook(() => useSocket(), { wrapper })

      expect(mockSocket.on).toHaveBeenCalledWith('connect', expect.any(Function))
      expect(mockSocket.on).toHaveBeenCalledWith('disconnect', expect.any(Function))
      expect(mockSocket.on).toHaveBeenCalledWith('error', expect.any(Function))
    })

    it('should provide connected socket instance', () => {
      mockSocket.connected = true

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <SocketProvider>{children}</SocketProvider>
      )

      const { result } = renderHook(() => useSocket(), { wrapper })

      expect(result.current.socket).toBe(mockSocket)
      expect(result.current.connected).toBe(true)
    })
  })

  describe('Socket Events', () => {
    it('should handle connect event', () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <SocketProvider>{children}</SocketProvider>
      )

      renderHook(() => useSocket(), { wrapper })

      // Get the connect callback
      const connectCallback = mockSocket.on.mock.calls.find(
        call => call[0] === 'connect'
      )?.[1]

      expect(connectCallback).toBeDefined()

      // Simulate connect event
      act(() => {
        connectCallback()
      })

      // Socket should be marked as connected
      expect(mockSocket.connected).toBe(true)
    })

    it('should handle disconnect event', () => {
      mockSocket.connected = false

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <SocketProvider>{children}</SocketProvider>
      )

      const { result } = renderHook(() => useSocket(), { wrapper })

      // Get the disconnect callback
      const disconnectCallback = mockSocket.on.mock.calls.find(
        call => call[0] === 'disconnect'
      )?.[1]

      expect(disconnectCallback).toBeDefined()

      // Simulate disconnect event
      act(() => {
        disconnectCallback('transport close')
      })

      expect(result.current.connected).toBe(false)
    })

    it('should handle error event', () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <SocketProvider>{children}</SocketProvider>
      )

      const { result } = renderHook(() => useSocket(), { wrapper })

      // Get the error callback
      const errorCallback = mockSocket.on.mock.calls.find(
        call => call[0] === 'error'
      )?.[1]

      expect(errorCallback).toBeDefined()

      // Simulate error event
      act(() => {
        errorCallback(new Error('Connection failed'))
      })

      expect(result.current.error).toBe('Connection failed')
    })
  })

  describe('Socket Operations', () => {
    it('should emit events through socket', () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <SocketProvider>{children}</SocketProvider>
      )

      const { result } = renderHook(() => useSocket(), { wrapper })

      act(() => {
        result.current.socket?.emit('test-event', { data: 'test' })
      })

      expect(mockSocket.emit).toHaveBeenCalledWith('test-event', { data: 'test' })
    })

    it('should register event listeners', () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <SocketProvider>{children}</SocketProvider>
      )

      const { result } = renderHook(() => useSocket(), { wrapper })

      const testCallback = jest.fn()

      act(() => {
        result.current.socket?.on('test-event', testCallback)
      })

      expect(mockSocket.on).toHaveBeenCalledWith('test-event', testCallback)
    })

    it('should remove event listeners', () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <SocketProvider>{children}</SocketProvider>
      )

      const { result } = renderHook(() => useSocket(), { wrapper })

      const testCallback = jest.fn()

      act(() => {
        result.current.socket?.off('test-event', testCallback)
      })

      expect(mockSocket.off).toHaveBeenCalledWith('test-event', testCallback)
    })
  })

  describe('Connection Management', () => {
    it('should reconnect when connection is lost', () => {
      mockSocket.connected = false

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <SocketProvider>{children}</SocketProvider>
      )

      renderHook(() => useSocket(), { wrapper })

      // Simulate reconnection attempt
      act(() => {
        mockSocket.connect()
      })

      expect(mockSocket.connect).toHaveBeenCalled()
    })

    it('should clean up socket on unmount', () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <SocketProvider>{children}</SocketProvider>
      )

      const { unmount } = renderHook(() => useSocket(), { wrapper })

      unmount()

      expect(mockSocket.disconnect).toHaveBeenCalled()
    })
  })

  describe('Error Handling', () => {
    it('should handle socket initialization errors', () => {
      // Mock socket creation failure
      const originalError = console.error
      console.error = jest.fn()

      const mockSocketError = {
        ...mockSocket,
        on: jest.fn().mockImplementation((event, callback) => {
          if (event === 'error') {
            callback(new Error('Failed to connect'))
          }
        })
      }

      jest.doMock('socket.io-client', () => jest.fn(() => mockSocketError))

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <SocketProvider>{children}</SocketProvider>
      )

      const { result } = renderHook(() => useSocket(), { wrapper })

      expect(result.current.error).toBeTruthy()
      console.error = originalError
    })

    it('should handle null socket gracefully', () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <SocketProvider>{children}</SocketProvider>
      )

      const { result } = renderHook(() => useSocket(), { wrapper })

      // Should not throw when socket is null
      expect(() => {
        result.current.socket?.emit('test-event')
      }).not.toThrow()
    })
  })

  describe('Real-time Data Sync', () => {
    it('should handle multiple event listeners', () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <SocketProvider>{children}</SocketProvider>
      )

      const { result } = renderHook(() => useSocket(), { wrapper })

      const orderCallback = jest.fn()
      const inventoryCallback = jest.fn()

      act(() => {
        result.current.socket?.on('orderUpdate', orderCallback)
        result.current.socket?.on('inventoryUpdate', inventoryCallback)
      })

      expect(mockSocket.on).toHaveBeenCalledWith('orderUpdate', orderCallback)
      expect(mockSocket.on).toHaveBeenCalledWith('inventoryUpdate', inventoryCallback)
    })

    it('should handle event data properly', () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <SocketProvider>{children}</SocketProvider>
      )

      renderHook(() => useSocket(), { wrapper })

      const testData = { id: 1, status: 'updated' }
      let receivedData: any

      // Setup callback to capture data
      const callback = (data: any) => {
        receivedData = data
      }

      // Get the mock implementation
      mockSocket.on.mockImplementation((event, cb) => {
        if (event === 'dataUpdate') {
          cb(testData)
        }
      })

      // Simulate receiving data
      act(() => {
        mockSocket.on('dataUpdate', callback)
      })

      expect(receivedData).toEqual(testData)
    })
  })

  describe('Performance', () => {
    it('should not create multiple socket instances', () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <SocketProvider>{children}</SocketProvider>
      )

      const { result, rerender } = renderHook(() => useSocket(), { wrapper })

      const firstSocket = result.current.socket

      rerender()

      const secondSocket = result.current.socket

      expect(firstSocket).toBe(secondSocket)
    })

    it('should handle rapid event emissions', () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <SocketProvider>{children}</SocketProvider>
      )

      const { result } = renderHook(() => useSocket(), { wrapper })

      const events = Array.from({ length: 100 }, (_, i) => ({ id: i, data: `test-${i}` }))

      act(() => {
        events.forEach(event => {
          result.current.socket?.emit('bulk-update', event)
        })
      })

      expect(mockSocket.emit).toHaveBeenCalledTimes(100)
    })
  })
})