import React, { createContext, useContext, useEffect, useState, ReactNode, useMemo } from 'react';
import { io, Socket } from 'socket.io-client';

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  emit: (event: string, data?: any) => void;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

interface SocketProviderProps {
  children: ReactNode;
}

export const SocketProvider: React.FC<SocketProviderProps> = ({ children }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  useEffect(() => {
    // Initialize socket connection with error handling
    let socketInstance: Socket | null = null;
    
    try {
      socketInstance = io(process.env.REACT_APP_SERVER_URL || 'http://localhost:3001', {
        transports: ['websocket', 'polling'], // Add polling as fallback
        autoConnect: true,
        timeout: 10000, // 10 second timeout
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: 5
      });

      socketInstance.on('connect', () => {
        console.log('Socket connected:', socketInstance?.id);
        setIsConnected(true);
        setConnectionError(null);
      });

      socketInstance.on('disconnect', () => {
        console.log('Socket disconnected');
        setIsConnected(false);
      });

      socketInstance.on('connect_error', (error) => {
        console.error('Socket connection error:', error);
        setIsConnected(false);
        setConnectionError(error.message || 'Connection failed');
      });

      setSocket(socketInstance);
    } catch (error) {
      console.error('Failed to initialize socket:', error);
      setIsConnected(false);
      setConnectionError(error instanceof Error ? error.message : 'Failed to initialize socket');
    }

    return () => {
      if (socketInstance) {
        socketInstance.disconnect();
      }
    };
  }, []);

  const emit = (event: string, data?: any) => {
    if (socket && isConnected) {
      socket.emit(event, data);
    } else {
      console.warn('Socket not connected, cannot emit:', event);
    }
  };

  const value: SocketContextType = useMemo(() => ({
    socket,
    isConnected,
    emit
  }), [socket, isConnected, emit]);

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (context === undefined) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

export { SocketContext };
