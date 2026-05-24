const API_URL = '/api';

const handleResponse = async (response: Response) => {
  const contentType = response.headers.get("content-type");
  if (!response.ok) {
    let errorData;
    if (contentType && contentType.includes("application/json")) {
      errorData = await response.json();
    } else {
      errorData = { message: await response.text() };
    }
    throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
  }
  if (contentType && contentType.includes("application/json")) {
    return response.json();
  }
  // If not JSON but OK, could be text
  return response.text();
};

const getAuthHeaders = () => {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  try {
    const stored = localStorage.getItem('pos_user');
    if (stored && stored !== 'undefined') {
      const user = JSON.parse(stored);
      if (user?.id) {
        headers['Authorization'] = `Bearer ${user.id}:${user.sessionVersion || user.session_version}`;
      }
    }
  } catch (e) {
    console.warn("Failed to parse auth headers", e);
  }
  return headers;
};

const post = async (url: string, data: any) => handleResponse(await fetch(url, {
  method: 'POST',
  headers: getAuthHeaders(),
  body: JSON.stringify(data)
}));

const put = async (url: string, data: any) => handleResponse(await fetch(url, {
  method: 'PUT',
  headers: getAuthHeaders(),
  body: JSON.stringify(data)
}));

const get = async (url: string) => handleResponse(await fetch(url, {
  method: 'GET',
  headers: getAuthHeaders()
}));

const del = async (url: string) => handleResponse(await fetch(url, { 
  method: 'DELETE',
  headers: getAuthHeaders()
}));

export const api = {
  // Auth
  login: async (username, password) => post(`${API_URL}/auth/login`, { username, password }),
  verifySession: async (userId, sessionVersion) => post(`${API_URL}/auth/verify`, { userId, sessionVersion }),
  logoutAllDevices: async (userId) => post(`${API_URL}/auth/logout-all`, { userId }),

  // Products
  getProducts: async () => get(`${API_URL}/products`),
  addProduct: async (product) => post(`${API_URL}/products`, product),
  updateProduct: async (id, product) => put(`${API_URL}/products/${id}`, product),
  adjustStock: async (id, data) => post(`${API_URL}/products/${id}/adjust`, data),
  deleteProduct: async (id) => del(`${API_URL}/products/${id}`),

  // Categories
  getCategories: async () => get(`${API_URL}/categories`),
  addCategory: async (name) => post(`${API_URL}/categories`, { name }),
  deleteCategory: async (id) => del(`${API_URL}/categories/${id}`),

  // Customers
  getCustomers: async () => get(`${API_URL}/customers`),
  addCustomer: async (customer) => post(`${API_URL}/customers`, customer),
  updateCustomer: async (id, customer) => put(`${API_URL}/customers/${id}`, customer),

  // Users
  getUsers: async () => get(`${API_URL}/users`),
  register: async (username, password, role, permissions) => post(`${API_URL}/auth/register`, { username, password, role, permissions }),
  updateUser: async (id, data) => put(`${API_URL}/users/${id}`, data),
  deleteUser: async (id) => del(`${API_URL}/users/${id}`),

  // Debt/Payments
  getPayments: async () => get(`${API_URL}/payments`),
  addPayment: async (customerId, paymentData) => post(`${API_URL}/customers/${customerId}/payment`, paymentData),
  addCharge: async (customerId, amount, description) => post(`${API_URL}/customers/${customerId}/charge`, { amount, description }),
  getCustomerHistory: async (customerId) => get(`${API_URL}/customers/${customerId}/history`),
  returnProduct: async (customerId, returnData) => post(`${API_URL}/customers/${customerId}/return`, returnData),
  
  // Suppliers
  getSuppliers: async () => get(`${API_URL}/suppliers`),
  addSupplier: async (supplier) => post(`${API_URL}/suppliers`, supplier),
  updateSupplier: async (id, supplier) => put(`${API_URL}/suppliers/${id}`, supplier),
  addSupplierPayment: async (supplierId, paymentData) => post(`${API_URL}/suppliers/${supplierId}/payment`, paymentData),
  addSupplierCharge: async (supplierId, amount, description) => post(`${API_URL}/suppliers/${supplierId}/charge`, { amount, description }),
  getSupplierHistory: async (supplierId) => get(`${API_URL}/suppliers/${supplierId}/history`),

  // Sales
  getSales: async () => get(`${API_URL}/sales`),
  getSaleItems: async (id) => get(`${API_URL}/sales/${id}/items`),
  getChecks: async () => get(`${API_URL}/checks`),
  createSale: async (sale) => post(`${API_URL}/sales`, sale),

  // Stats
  getStats: async () => get(`${API_URL}/stats`),

  // Activity Logs
  getActivityLogs: async () => get(`${API_URL}/activity`),
  
  // Google Drive Backup
  getGoogleAuthUrl: async () => get(`${API_URL}/auth/google/url`),
  getGoogleDriveStatus: async () => get(`${API_URL}/backup/drive/status`),
  backupToGoogleDrive: async () => post(`${API_URL}/backup/drive/upload`, {}),
  sendBackupEmail: async () => post(`${API_URL}/backup/email/send`, {}),

  // Communications
  sendEmail: async (data) => post(`${API_URL}/send-email`, data),
  sendWhatsApp: async (data) => post(`${API_URL}/send-whatsapp`, data),
  
  // Backup
  getBackup: async () => get(`${API_URL}/backup`),
  getLatestBackup: async () => get(`${API_URL}/backup/latest`),
  exportBackup: async () => get(`${API_URL}/backup/export`),
  importBackup: async (data: any) => post(`${API_URL}/backup/import`, { data }),
  
  // Notifications
  getNotifications: async () => get(`${API_URL}/notifications`),
  markNotificationRead: async (id) => post(`${API_URL}/notifications/${id}/read`, {}),
  
  // Settings
  getSettings: async () => get(`${API_URL}/settings`),
  updateSettings: async (settings) => post(`${API_URL}/settings`, settings)
};
