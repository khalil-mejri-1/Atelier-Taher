/**
 * Configuration centralisée de l'application Atelier Taher
 * Centralized Application Configuration
 *
 * لتعديل رابط الباك إند:
 * 1. يمكنك تعيين الرابط مباشرة في DEFAULT_BACKEND_URL بالأسفل (مثل 'https://votre-serveur.vercel.app')
 * 2. أو إضافة متغير VITE_API_URL في ملف .env أو في لوحة تحكم Vercel
 */

// ضع رابط الباك إند هنا إذا أردت تحديده يدوياً في الكود مباشرة
const DEFAULT_BACKEND_URL = '';

export const BACKEND_URL =
  import.meta.env.VITE_API_URL ||
  DEFAULT_BACKEND_URL ||
  (typeof window !== 'undefined' && window.location.port === '5173'
    ? 'http://localhost:5000'
    : '');

export const API_BASE = BACKEND_URL ? `${BACKEND_URL.replace(/\/+$/, '')}/api` : '/api';

export default {
  BACKEND_URL,
  API_BASE,
};

