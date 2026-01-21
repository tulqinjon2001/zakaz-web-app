import axios from "axios";
import { storage, STORAGE_KEYS } from "../utils/storage";

const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  "https://zakaz-backend-zij1.onrender.com/api";

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 30000, // 30 seconds timeout (increased for order creation)
});

// Log API URL (always log in production for debugging)
console.log("🔗 API Base URL:", API_BASE_URL);

// Request interceptor for debugging
api.interceptors.request.use(
  (config) => {
    console.log(`📤 API Request: ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    console.error("❌ API Request Error:", error);
    return Promise.reject(error);
  },
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => {
    console.log(`✅ API Response: ${response.config.method?.toUpperCase()} ${response.config.url} - ${response.status}`);
    return response;
  },
  (error) => {
    // Always log errors in production for debugging
    console.error("❌ API Response Error:", {
      message: error.message,
      url: error.config?.url,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      baseURL: error.config?.baseURL,
    });
    
    // Show user-friendly error messages
    if (error.code === 'ECONNABORTED') {
      console.error("⏱️ Request timeout - server may be slow or unresponsive");
    } else if (error.code === 'ERR_NETWORK') {
      console.error("🌐 Network error - check internet connection or server status");
    } else if (error.response?.status === 404) {
      console.error("🔍 Endpoint not found - check API URL configuration");
    } else if (error.response?.status >= 500) {
      console.error("🔥 Server error - backend may be down or experiencing issues");
    }
    
    return Promise.reject(error);
  },
);

// Get storeId from storage
const getStoreId = () => {
  const storeInfo = storage.get(STORAGE_KEYS.STORE_INFO);
  return storeInfo?.id || null;
};

// Client API
export const clientAPI = {
  // Stores
  getStores: () => api.get("/client/stores"),

  // Categories
  getCategories: () => api.get("/client/categories"),

  // Products
  getProductsByStore: (storeId) =>
    api.get(`/client/stores/${storeId}/products`),
  searchProducts: (params) => {
    const storeId = getStoreId();
    return api.get("/client/products/search", {
      params: {
        ...params,
        storeId: storeId || params.storeId,
      },
    });
  },

  // Orders
  createOrder: (data) => api.post("/client/orders", data, { timeout: 30000 }), // 30 seconds for order creation
  getUserOrders: (userId) => api.get(`/client/users/${userId}/orders`),
  getOrderById: (id) => api.get(`/client/orders/${id}`),

  // Users
  createOrGetUser: (data) => api.post("/client/users", data),
  getUserByTelegramId: (telegramId) =>
    api.get(`/client/users/telegram/${telegramId}`),
};

export default api;
