import { io } from 'socket.io-client';

// Connect to current origin or fallback to port 5000 in dev
const SOCKET_URL = window.location.port === '5173' ? 'http://localhost:5000' : '/';

export const socket = io(SOCKET_URL, {
  autoConnect: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 1000,
});

export default socket;

