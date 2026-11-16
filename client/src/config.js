/**
 * Configuration centralisée de l'application Atelier Taher
 * Centralized Application Configuration
 *
 * لتعديل رابط الباك إند:
 * 1. إذا كان الباك إند مرفوعاً على Vercel أو Render (مثل https://atelier-taher-server.vercel.app):
 *    ضع الرابط في VITE_API_URL داخل ملف .env
 * 2. في بيئة التطوير المحلي (Local Development):
 *    اترك VITE_API_URL فارغاً، وسيتم استخدام البروكسي (Proxy) الداخلي لـ Vite تلقائياً وبأمان
 *    بدون مشاكل CORS أو رفض الاتصال (Connection Refused).
 */

const envUrl = (import.meta.env.VITE_API_URL || '').trim();

// إذا تم تحديد رابط خارجي (سحابي أو سيرفر مخصص)
export const BACKEND_URL = envUrl;

// في التطوير المحلي بدون رابط خارجي، نستخدم /api المباشر عبر بروكسي Vite
export const API_BASE = BACKEND_URL
  ? `${BACKEND_URL.replace(/\/+$/, '')}/api`
  : '/api';

export default {
  BACKEND_URL,
  API_BASE,
};
