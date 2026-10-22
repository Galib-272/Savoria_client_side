import { resolveBackendUrl } from './api';
import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;
let socketToken: string | null = null;

const currentToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem('rms_token');
  } catch {
    return null;
  }
};

/**
 * One shared socket per browser tab, authenticated with the signed-in user's token.
 * The SERVER decides which rooms (role + personal) the socket joins, so pages never
 * need to "join" anything themselves. If the signed-in user changes, the socket is
 * re-created so the previous user's notifications can never leak into the new session.
 */
export const getSocket = (): Socket => {
  if (typeof window === 'undefined') return null as unknown as Socket;
  const token = currentToken();

  if (socket && socketToken !== token) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }

  if (!socket) {
    const SOCKET_URL = resolveBackendUrl(process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5001');
    socketToken = token;
    socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
      auth: token ? { token } : {},
    });
  }

  return socket;
};

/** Called on logout / login so the next connection uses the right identity. */
export const resetSocket = (): void => {
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
  }
  socket = null;
  socketToken = null;
};
