import axios from 'axios';
import { storage, STORAGE_KEYS } from '../utils/storage';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Get storeId from storage
const getStoreId = () => {
  const storeInfo = storage.get(STORAGE_KEYS.STORE_INFO);
  return storeInfo?.id || null;
};

// Client API
export const clientAPI = {
  // Stores
  getStores: () => api.get('/client/stores'),
  
  // Categories
  getCategories: () => api.get('/client/categories'),
  
  // Products
  getProductsByStore: (storeId) => api.get(`/client/stores/${storeId}/products`),
  searchProducts: (params) => {
    const storeId = getStoreId();
    return api.get('/client/products/search', {
      params: {
        ...params,
        storeId: storeId || params.storeId,
      },
    });
  },
  
  // Orders
  createOrder: (data) => api.post('/client/orders', data),
  getUserOrders: (userId) => api.get(`/client/users/${userId}/orders`),
  getOrderById: (id) => api.get(`/client/orders/${id}`),
  
  // Users
  createOrGetUser: (data) => api.post('/client/users', data),
  getUserByTelegramId: (telegramId) => api.get(`/client/users/telegram/${telegramId}`),
};

export default api;
