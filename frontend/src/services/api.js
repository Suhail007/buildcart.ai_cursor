import axios from 'axios';
import toast from 'react-hot-toast';

// Create axios instance
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:3001/api',
  timeout: 10000,
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (refreshToken) {
          const response = await axios.post(
            `${process.env.REACT_APP_API_URL || 'http://localhost:3001/api'}/auth/refresh`,
            { refreshToken }
          );

          const { accessToken } = response.data.data.tokens;
          localStorage.setItem('accessToken', accessToken);
          
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          return api(originalRequest);
        }
      } catch (refreshError) {
        // Refresh token failed, redirect to login
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  // Register user
  register: (userData) => api.post('/auth/register', userData),
  
  // Login user
  login: (credentials) => api.post('/auth/login', credentials),
  
  // Logout user
  logout: () => api.post('/auth/logout'),
  
  // Get current user
  getMe: () => api.get('/auth/me'),
  
  // Forgot password
  forgotPassword: (data) => api.post('/auth/forgot-password', data),
  
  // Reset password
  resetPassword: (data) => api.post('/auth/reset-password', data),
  
  // Verify email
  verifyEmail: (data) => api.post('/auth/verify-email', data),
  
  // Refresh token
  refreshToken: (data) => api.post('/auth/refresh', data),
  
  // Change password
  changePassword: (data) => api.post('/auth/change-password', data),
  
  // Update profile
  updateProfile: (data) => api.put('/auth/profile', data),
  
  // Delete account
  deleteAccount: (data) => api.delete('/auth/account', { data }),
};

// Stores API
export const storesAPI = {
  // Get all stores
  getStores: (params) => api.get('/stores', { params }),
  
  // Get single store
  getStore: (id) => api.get(`/stores/${id}`),
  
  // Create store
  createStore: (data) => api.post('/stores', data),
  
  // Update store
  updateStore: (id, data) => api.put(`/stores/${id}`, data),
  
  // Delete store
  deleteStore: (id) => api.delete(`/stores/${id}`),
  
  // Duplicate store
  duplicateStore: (id) => api.post(`/stores/${id}/duplicate`),
  
  // Update store theme
  updateTheme: (id, data) => api.put(`/stores/${id}/theme`, data),
  
  // Get store analytics
  getAnalytics: (id, params) => api.get(`/stores/${id}/analytics`, { params }),
};

// Products API
export const productsAPI = {
  // Get products for store
  getProducts: (storeId, params) => api.get(`/stores/${storeId}/products`, { params }),
  
  // Get single product
  getProduct: (id) => api.get(`/products/${id}`),
  
  // Create product
  createProduct: (storeId, data) => api.post(`/stores/${storeId}/products`, data),
  
  // Update product
  updateProduct: (id, data) => api.put(`/products/${id}`, data),
  
  // Delete product
  deleteProduct: (id) => api.delete(`/products/${id}`),
  
  // Bulk import products
  bulkImport: (storeId, formData) => api.post(`/stores/${storeId}/products/bulk-import`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  
  // Bulk update products
  bulkUpdate: (data) => api.post('/products/bulk-update', data),
  
  // Upload product images
  uploadImages: (id, formData) => api.post(`/products/${id}/images`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  
  // Delete product image
  deleteImage: (id, imageId) => api.delete(`/products/${id}/images/${imageId}`),
};

// Orders API
export const ordersAPI = {
  // Get orders for store
  getOrders: (storeId, params) => api.get(`/stores/${storeId}/orders`, { params }),
  
  // Get single order
  getOrder: (id) => api.get(`/orders/${id}`),
  
  // Create order
  createOrder: (storeId, data) => api.post(`/stores/${storeId}/orders`, data),
  
  // Update order status
  updateStatus: (id, data) => api.put(`/orders/${id}/status`, data),
  
  // Fulfill order
  fulfillOrder: (id, data) => api.post(`/orders/${id}/fulfill`, data),
  
  // Refund order
  refundOrder: (id, data) => api.post(`/orders/${id}/refund`, data),
  
  // Cancel order
  cancelOrder: (id, data) => api.post(`/orders/${id}/cancel`, data),
};

// Customers API
export const customersAPI = {
  // Get customers for store
  getCustomers: (storeId, params) => api.get(`/stores/${storeId}/customers`, { params }),
  
  // Get single customer
  getCustomer: (id) => api.get(`/customers/${id}`),
  
  // Create customer
  createCustomer: (storeId, data) => api.post(`/stores/${storeId}/customers`, data),
  
  // Update customer
  updateCustomer: (id, data) => api.put(`/customers/${id}`, data),
  
  // Get customer orders
  getCustomerOrders: (id) => api.get(`/customers/${id}/orders`),
  
  // Add customer note
  addNote: (id, data) => api.post(`/customers/${id}/notes`, data),
  
  // Bulk import customers
  bulkImport: (storeId, formData) => api.post(`/stores/${storeId}/customers/bulk-import`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
};

// Analytics API
export const analyticsAPI = {
  // Get store overview
  getOverview: (storeId, params) => api.get(`/stores/${storeId}/analytics/overview`, { params }),
  
  // Get revenue analytics
  getRevenue: (storeId, params) => api.get(`/stores/${storeId}/analytics/revenue`, { params }),
  
  // Get product analytics
  getProducts: (storeId, params) => api.get(`/stores/${storeId}/analytics/products`, { params }),
  
  // Get customer analytics
  getCustomers: (storeId, params) => api.get(`/stores/${storeId}/analytics/customers`, { params }),
  
  // Get conversion analytics
  getConversion: (storeId, params) => api.get(`/stores/${storeId}/analytics/conversion`, { params }),
  
  // Get traffic analytics
  getTraffic: (storeId, params) => api.get(`/stores/${storeId}/analytics/traffic`, { params }),
  
  // Track event
  trackEvent: (data) => api.post('/analytics/track-event', data),
};

// Deployment API
export const deploymentAPI = {
  // Deploy store
  deployStore: (storeId, data) => api.post(`/deployment/stores/${storeId}/deploy`, data),
  
  // Get deployment status
  getStatus: (deploymentId) => api.get(`/deployment/deployments/${deploymentId}`),
  
  // Get deployment logs
  getLogs: (deploymentId) => api.get(`/deployment/deployments/${deploymentId}/logs`),
  
  // Get store deployments
  getStoreDeployments: (storeId, params) => api.get(`/deployment/stores/${storeId}/deployments`, { params }),
  
  // Rollback deployment
  rollback: (storeId, data) => api.post(`/deployment/stores/${storeId}/rollback`, data),
  
  // Setup custom domain
  setupDomain: (storeId, data) => api.post(`/deployment/stores/${storeId}/domain`, data),
  
  // Enable SSL
  enableSSL: (storeId, data) => api.post(`/deployment/stores/${storeId}/ssl`, data),
  
  // Get deployment analytics
  getAnalytics: (storeId, params) => api.get(`/deployment/stores/${storeId}/deployment-analytics`, { params }),
  
  // Delete deployment
  deleteDeployment: (deploymentId) => api.delete(`/deployment/deployments/${deploymentId}`),
  
  // Get deployment config
  getConfig: (storeId) => api.get(`/deployment/stores/${storeId}/deployment-config`),
};

// AI API
export const aiAPI = {
  // Generate store
  generateStore: (data) => api.post('/ai/generate-store', data),
  
  // Generate products
  generateProducts: (data) => api.post('/ai/generate-products', data),
  
  // Generate content
  generateContent: (data) => api.post('/ai/generate-content', data),
  
  // Optimize store
  optimizeStore: (data) => api.post('/ai/optimize-store', data),
  
  // Chat with AI
  chat: (data) => api.post('/ai/chat', data),
};

// Modules API
export const modulesAPI = {
  // Get all modules
  getModules: (params) => api.get('/modules', { params }),
  
  // Get single module
  getModule: (id) => api.get(`/modules/${id}`),
  
  // Install module
  installModule: (storeId, moduleId, data) => api.post(`/stores/${storeId}/modules/${moduleId}/install`, data),
  
  // Uninstall module
  uninstallModule: (storeId, moduleId) => api.delete(`/stores/${storeId}/modules/${moduleId}`),
  
  // Update module config
  updateConfig: (storeId, moduleId, data) => api.put(`/stores/${storeId}/modules/${moduleId}/config`, data),
  
  // Get store modules
  getStoreModules: (storeId) => api.get(`/stores/${storeId}/modules`),
};

// Billing API
export const billingAPI = {
  // Get subscription
  getSubscription: () => api.get('/billing/subscription'),
  
  // Create subscription
  createSubscription: (data) => api.post('/billing/subscription', data),
  
  // Update subscription
  updateSubscription: (data) => api.put('/billing/subscription', data),
  
  // Cancel subscription
  cancelSubscription: () => api.delete('/billing/subscription'),
  
  // Get invoices
  getInvoices: (params) => api.get('/billing/invoices', { params }),
  
  // Get usage
  getUsage: () => api.get('/billing/usage'),
  
  // Update payment method
  updatePaymentMethod: (data) => api.post('/billing/payment-method', data),
};

// Error handler
export const handleAPIError = (error) => {
  const message = error.response?.data?.error?.message || error.message || 'An error occurred';
  toast.error(message);
  return message;
};

export default api; 