import { io } from 'socket.io-client';
import { BACKEND_URL } from './config';

// تحديد مسار السوكيت: الرابط السحابي إذا وُجد، أو نفس الدومين الحالي عبر بروكسي Vite
const SOCKET_URL = BACKEND_URL || (typeof window !== 'undefined' ? window.location.origin : '/');

export const socket = io(SOCKET_URL, {
  autoConnect: true,
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 2000,
  reconnectionDelayMax: 10000,
  timeout: 7000,
  transports: ['websocket', 'polling'],
});

// معالجة هادئة لأخطاء الاتصال لتجنب إغراق شاشة المتصفح بالأخطاء
socket.on('connect_error', (error) => {
  // يظل تطبيق REST API يعمل بشكل سليم حتى في حال تعذر اتصال السوكيت اللحظي
  if (import.meta.env.DEV) {
    console.debug('[Socket.io] En attente de connexion temps réel...');
  }
});

export default socket;
