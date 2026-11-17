import { io } from 'socket.io-client';
import { BACKEND_URL } from './config';

// تحديد ما إذا كان السيرفر مستضافاً على Vercel
// خوادم Vercel Serverless لا تدعم اتصالات WebSocket المستمرة وتغلقها بعد كل طلب
export const isVercelServer = Boolean(BACKEND_URL && BACKEND_URL.includes('vercel.app'));

// تحديد مسار السوكيت: الرابط السحابي إذا وُجد، أو نفس الدومين الحالي عبر بروكسي Vite
const SOCKET_URL = BACKEND_URL || (typeof window !== 'undefined' ? window.location.origin : '/');

// إذا كان السيرفر على Vercel، لا نقوم بتشغيل الاتصال التلقائي عبر WebSocket لتجنب أخطاء wss:// المرفوضة في الكونسول
export const socket = io(SOCKET_URL, {
  autoConnect: !isVercelServer,
  reconnection: !isVercelServer,
  reconnectionAttempts: 3,
  reconnectionDelay: 2000,
  reconnectionDelayMax: 10000,
  timeout: 5000,
  transports: ['websocket', 'polling'],
});

// معالجة هادئة لأخطاء الاتصال لتجنب إغراق شاشة المتصفح بالأخطاء
socket.on('connect_error', (error) => {
  if (import.meta.env.DEV && !isVercelServer) {
    console.debug('[Socket.io] En attente de connexion temps réel...');
  }
});

export default socket;
