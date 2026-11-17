// API client utility for Atelier Taher
import { API_BASE } from './config';


export function getAuthToken() {
  return localStorage.getItem('atelier_token');
}

export function setAuthToken(token) {
  if (token) {
    localStorage.setItem('atelier_token', token);
  } else {
    localStorage.removeItem('atelier_token');
  }
}

export async function apiRequest(endpoint, options = {}) {
  const token = getAuthToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || `خطأ في الطلب: ${response.status}`);
  }

  return data;
}

// Authentication API
export const authApi = {
  login: (credentials) => apiRequest('/auth/login', {
    method: 'POST',
    body: JSON.stringify(credentials),
  }),
  getMe: () => apiRequest('/auth/me'),
  getDemoAccounts: () => apiRequest('/auth/demo-accounts'),
};

// Patterns API
export const patternsApi = {
  getAll: (params = {}) => {
    const query = new URLSearchParams();
    if (params.search) query.append('search', params.search);
    if (params.category) query.append('category', params.category);
    if (params.low_stock) query.append('low_stock', 'true');
    if (params.limit !== undefined) query.append('limit', params.limit);
    if (params.skip !== undefined) query.append('skip', params.skip);
    const queryString = query.toString() ? `?${query.toString()}` : '';
    return apiRequest(`/patterns${queryString}`);
  },
  getCategories: () => apiRequest('/patterns/categories'),
  getById: (id) => apiRequest(`/patterns/${id}`),
  create: (data) => apiRequest('/patterns', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  update: (id, data) => apiRequest(`/patterns/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  delete: (id) => apiRequest(`/patterns/${id}`, {
    method: 'DELETE',
  }),
  produce: (pattern_id, quantity = 1, notes = '') => apiRequest('/patterns/produce', {
    method: 'POST',
    body: JSON.stringify({ pattern_id, quantity, notes }),
  }),
  producePart: (pattern_id, part_id, complete_all = false, notes = '') => apiRequest('/patterns/produce-part', {
    method: 'POST',
    body: JSON.stringify({ pattern_id, part_id, complete_all, notes }),
  }),
  getMyProgress: () => apiRequest('/patterns/my-progress'),
  undoProduce: (logId) => apiRequest('/patterns/undo-produce', {
    method: 'POST',
    body: JSON.stringify({ logId }),
  }),
  deductOrder: (pattern_id, quantity = 1, client_name = '', notes = '') => apiRequest('/patterns/deduct-order', {
    method: 'POST',
    body: JSON.stringify({ pattern_id, quantity, client_name, notes }),
  }),
  bulkOperation: (action, pattern_ids, value = null) => apiRequest('/patterns/bulk', {
    method: 'POST',
    body: JSON.stringify({ action, pattern_ids, value }),
  }),
};

// Logs & Stats API
export const logsApi = {
  getLogs: (params = {}) => {
    const query = new URLSearchParams();
    if (params.action_type) query.append('action_type', params.action_type);
    if (params.search) query.append('search', params.search);
    if (params.pattern_id) query.append('pattern_id', params.pattern_id);
    if (params.today) query.append('today', 'true');
    if (params.include_undone) query.append('include_undone', 'true');
    if (params.limit) query.append('limit', params.limit);
    const queryString = query.toString() ? `?${query.toString()}` : '';
    return apiRequest(`/logs${queryString}`);
  },
  deleteLog: (logId) => apiRequest(`/logs/${logId}`, {
    method: 'DELETE',
  }),
  bulkDeleteLogs: (logIds) => apiRequest('/logs/bulk-delete', {
    method: 'POST',
    body: JSON.stringify({ logIds }),
  }),
  getStats: () => apiRequest('/logs/stats'),
  getDailyProduction: (date, workerId) => {
    const query = new URLSearchParams();
    if (date) query.append('date', date);
    if (workerId && workerId !== 'all') query.append('worker_id', workerId);
    const queryString = query.toString() ? `?${query.toString()}` : '';
    return apiRequest(`/logs/daily-production${queryString}`);
  },
  getMyTodayLogs: () => apiRequest('/logs/my-today'),
};

// Workers API
export const workersApi = {
  getAll: () => apiRequest('/workers'),
  create: (data) => apiRequest('/workers', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  update: (id, data) => apiRequest(`/workers/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  delete: (id) => apiRequest(`/workers/${id}`, {
    method: 'DELETE',
  }),
};

// Categories API (Gestion dynamique des catégories)
export const categoriesApi = {
  getAll: () => apiRequest('/categories'),
  create: (name) => apiRequest('/categories', {
    method: 'POST',
    body: JSON.stringify({ name }),
  }),
  delete: (id, reassignTo = 'Autre') => {
    const query = reassignTo ? `?reassignTo=${encodeURIComponent(reassignTo)}` : '';
    return apiRequest(`/categories/${id}${query}`, {
      method: 'DELETE',
    });
  },
};

