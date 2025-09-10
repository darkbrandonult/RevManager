import { createContext, useContext, ReactNode } from 'react'
import { Socket } from 'socket.io-client'

interface SocketContextType {
  socket: Socket | null
}

const SocketContext = createContext<SocketContextType | undefined>(undefined)

export const useSocket = () => {
  const context = useContext(SocketContext)
  if (context === undefined) {
    throw new Error('useSocket must be used within a SocketProvider')
  }
  return context
}

interface SocketProviderProps {
  children: ReactNode
  socket: Socket | null
}

export const SocketProvider = ({ children, socket }: SocketProviderProps) => {
  const value = {
    socket,
  }

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>
}
