import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export const getSocket = (): Socket => {
  if (!socket && typeof window !== 'undefined') {
    const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5001';
    socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
    });

    socket.on('connect', () => {
      console.log('[Socket] Connected to backend real-time server:', socket?.id);
    });

    socket.on('disconnect', () => {
      console.log('[Socket] Disconnected from backend real-time server');
    });
  }

  return socket as Socket;
};
