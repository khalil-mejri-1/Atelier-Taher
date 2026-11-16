import { io } from 'socket.io-client';
import { BACKEND_URL } from './config';

// Connect to backend URL or fallback to current origin
const SOCKET_URL = BACKEND_URL || (typeof window !== 'undefined' && window.location.port === '5173' ? 'http://localhost:5000' : '/');

export const socket = io(SOCKET_URL, {
  autoConnect: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 1000,
  transports: ['polling', 'websocket'],
});

export default socket;

