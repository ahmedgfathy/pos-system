import Constants from 'expo-constants';
import { Platform } from 'react-native';
const { resolveApiUrl } = require('./apiConfig');

// The web build is served behind nginx, so relative /api URLs are correct there.
// Native apps have no browser origin: derive the development API host from the
// Metro/Expo URL, while still allowing production and tunnel builds to override it.
function getApiUrl() {
  const expoHost =
    Constants.expoConfig?.hostUri ||
    Constants.manifest2?.extra?.expoClient?.hostUri ||
    Constants.manifest?.debuggerHost;

  return resolveApiUrl({
    configuredUrl: process.env.EXPO_PUBLIC_API_URL,
    platform: Platform.OS,
    expoHost,
    windowOrigin: typeof window !== 'undefined' ? window.location.origin : undefined,
  });
}

export const API_URL = getApiUrl();

async function request(path, options = {}) {
  const url = `${API_URL}${path}`;
  const config = {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  };

  let res;
  try {
    res = await fetch(url, config);
  } catch (error) {
    const target = API_URL || '(API URL is not configured)';
    throw new Error(
      `Cannot reach the POS server at ${target}. ` +
      'Make sure the backend is running and the phone is on the same network, ' +
      'or set EXPO_PUBLIC_API_URL to a reachable server URL.'
    );
  }
  let data;
  try {
    data = await res.json();
  } catch (_) {
    data = { error: `Server response error (${res.status})` };
  }

  if (!res.ok) {
    throw new Error(data?.error || `Request failed: ${res.status}`);
  }

  return data;
}

export const api = {
  // Auth
  login: (username, password) =>
    request('/api/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) }),

  // Products
  getProducts: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/api/products${qs ? '?' + qs : ''}`);
  },

  lookupProduct: (code) =>
    request(`/api/products/lookup/${encodeURIComponent(code)}`),

  autoLookupProduct: (code) =>
    request(`/api/products/auto-lookup/${encodeURIComponent(code)}`),

  getProduct: (id) =>
    request(`/api/products/${encodeURIComponent(id)}`),

  createProduct: (product) =>
    request('/api/products', { method: 'POST', body: JSON.stringify(product) }),

  updateProduct: (id, product) =>
    request(`/api/products/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify(product) }),

  deleteProduct: (id) =>
    request(`/api/products/${encodeURIComponent(id)}`, { method: 'DELETE' }),

  // Sales
  createSale: (items, paymentMethod = 'cash') =>
    request('/api/sales', { method: 'POST', body: JSON.stringify({ items, payment_method: paymentMethod }) }),

  getSales: () =>
    request('/api/sales'),

  getSale: (id) =>
    request(`/api/sales/${encodeURIComponent(id)}`),

  // Inventory
  getInventoryTransactions: () =>
    request('/api/inventory/transactions'),

  adjustInventory: (productId, type, quantity, notes) =>
    request('/api/inventory/adjust', { method: 'POST', body: JSON.stringify({ productId, type, quantity, notes }) }),

  // Accounting
  getAccountingEntries: () =>
    request('/api/accounting/entries'),

  getAccountingSummary: () =>
    request('/api/accounting/summary'),

  // Categories
  getCategories: () =>
    request('/api/categories'),
};

export default api;
