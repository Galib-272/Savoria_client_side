const getApiBaseUrl = (): string => {
  if (typeof window !== 'undefined') {
    // If running in browser and hostname is 127.0.0.1, match host to prevent cross-origin localhost/127.0.0.1 mismatch
    if (window.location.hostname === '127.0.0.1') {
      return 'http://127.0.0.1:5001/api';
    }
  }
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api';
};

const getAuthHeaders = (): Record<string, string> => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('rms_token');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }
  return headers;
};

async function apiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${getApiBaseUrl()}${endpoint}`;
  const headers = {
    ...getAuthHeaders(),
    ...(options.headers || {}),
  };

  let response: Response;
  try {
    response = await fetch(url, {
      ...options,
      headers,
    });
  } catch (err: any) {
    console.error(`Network error requesting ${url}:`, err);
    throw new Error(`Failed to connect to server at ${url}. Please ensure backend is running on port 5001.`);
  }

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(data?.message || `Request failed with status ${response.status}`);
  }

  return data;
}

export const api = {
  // Auth
  async login(credentials: { email: string; password?: string }) {
    const res: any = await apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
    if (res.token && typeof window !== 'undefined') {
      localStorage.setItem('rms_token', res.token);
      localStorage.setItem('rms_user', JSON.stringify(res.user));
    }
    return res;
  },

  async register(data: { name: string; email: string; password?: string; phone?: string; avatar?: string }) {
    const res: any = await apiRequest('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    // Do NOT auto-login upon registration; user must explicitly log in
    return res;
  },

  async googleLogin(credential: string) {
    const res: any = await apiRequest('/auth/google', {
      method: 'POST',
      body: JSON.stringify({ credential }),
    });
    if (res.token && typeof window !== 'undefined') {
      localStorage.setItem('rms_token', res.token);
      localStorage.setItem('rms_user', JSON.stringify(res.user));
    }
    return res;
  },

  async getMe() {
    return apiRequest<any>('/auth/me');
  },

  logout() {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('rms_token');
      localStorage.removeItem('rms_user');
    }
  },

  // Tables & Seats (25 tables T1-T25, 4 seats S1-S4)
  async getTables() {
    const res: any = await apiRequest('/tables');
    return res.data || [];
  },

  async updateTableStatus(id: string, status: string, waiterName?: string, currentOrderId?: string) {
    return apiRequest<any>(`/tables/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status, waiterName, currentOrderId }),
    });
  },

  async updateSeatStatus(tableId: string, seatNumber: string, status: string, customerName?: string) {
    return apiRequest<any>(`/tables/${tableId}/seats/${seatNumber}`, {
      method: 'PUT',
      body: JSON.stringify({ status, customerName }),
    });
  },

  async assignWaiter(tableId: string, waiterName: string, waiterId?: string) {
    return apiRequest<any>(`/tables/${tableId}/assign-waiter`, {
      method: 'PUT',
      body: JSON.stringify({ waiterName, waiterId }),
    });
  },

  // Menu & Categories
  async getCategories() {
    const res: any = await apiRequest('/menu/categories');
    return res.data || [];
  },

  async getMenuItems(params?: Record<string, string>) {
    const queryString = params ? '?' + new URLSearchParams(params).toString() : '';
    const res: any = await apiRequest(`/menu/items${queryString}`);
    return res.data || [];
  },

  async getMenuItemById(id: string) {
    const res: any = await apiRequest(`/menu/items/${id}`);
    return res.data;
  },

  async createMenuItem(data: any) {
    return apiRequest<any>('/menu/items', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateMenuItem(id: string, data: any) {
    return apiRequest<any>(`/menu/items/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async toggleItemAvailability(id: string) {
    return apiRequest<any>(`/menu/items/${id}/availability`, {
      method: 'PATCH',
    });
  },

  async deleteMenuItem(id: string) {
    return apiRequest<any>(`/menu/items/${id}`, {
      method: 'DELETE',
    });
  },

  // Orders
  async getOrders(params?: Record<string, string>) {
    const queryString = params ? '?' + new URLSearchParams(params).toString() : '';
    const res: any = await apiRequest(`/orders${queryString}`);
    return res.data || [];
  },

  async getOrderById(id: string) {
    const res: any = await apiRequest(`/orders/${id}`);
    return res.data;
  },

  async createOrder(data: any) {
    return apiRequest<any>('/orders', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async startPreparingOrder(id: string) {
    return apiRequest<any>(`/orders/${id}/start-preparing`, {
      method: 'PUT',
    });
  },

  async markOrderReady(id: string, targetPanel: 'dine-in' | 'takeaway' | 'delivery') {
    return apiRequest<any>(`/orders/${id}/mark-ready`, {
      method: 'PUT',
      body: JSON.stringify({ targetPanel }),
    });
  },

  async waiterClaimFood(id: string, waiterName?: string) {
    return apiRequest<any>(`/orders/${id}/waiter-claim`, {
      method: 'PUT',
      body: JSON.stringify({ waiterName }),
    });
  },

  async deliveryPickup(id: string, deliveryStaffName?: string) {
    return apiRequest<any>(`/orders/${id}/delivery-pickup`, {
      method: 'PUT',
      body: JSON.stringify({ deliveryStaffName }),
    });
  },

  async deliveryOut(id: string) {
    return apiRequest<any>(`/orders/${id}/delivery-out`, {
      method: 'PUT',
    });
  },

  async deliveryDelivered(id: string) {
    return apiRequest<any>(`/orders/${id}/delivery-delivered`, {
      method: 'PUT',
    });
  },

  async updateOrderStatus(id: string, status: string, notes?: string) {
    return apiRequest<any>(`/orders/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status, notes }),
    });
  },

  // Payments & Stripe
  async createStripeIntent(amount: number, orderId?: string) {
    return apiRequest<any>('/payments/stripe-intent', {
      method: 'POST',
      body: JSON.stringify({ amount, orderId }),
    });
  },

  async processPayment(data: {
    orderId: string;
    amount: number;
    paymentMethod: string;
    splitPayments?: any[];
    notes?: string;
  }) {
    return apiRequest<any>('/payments/process', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async getPayments(params?: Record<string, string>) {
    const queryString = params ? '?' + new URLSearchParams(params).toString() : '';
    const res: any = await apiRequest(`/payments${queryString}`);
    return res.data || [];
  },

  async getReceipt(orderId: string) {
    const res: any = await apiRequest(`/payments/receipt/${orderId}`);
    return res.receipt;
  },

  // Reservations
  async getReservations(params?: Record<string, string>) {
    const queryString = params ? '?' + new URLSearchParams(params).toString() : '';
    const res: any = await apiRequest(`/reservations${queryString}`);
    return res.data || [];
  },

  async createReservation(data: any) {
    return apiRequest<any>('/reservations', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateReservationStatus(id: string, status: string) {
    return apiRequest<any>(`/reservations/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });
  },

  // Inventory
  async getInventory(params?: Record<string, string>) {
    const queryString = params ? '?' + new URLSearchParams(params).toString() : '';
    const res: any = await apiRequest(`/inventory${queryString}`);
    return res.data || [];
  },

  async adjustStock(id: string, changeAmount: number, reason?: string) {
    return apiRequest<any>(`/inventory/${id}/adjust`, {
      method: 'PATCH',
      body: JSON.stringify({ changeAmount, reason }),
    });
  },

  async updateInventoryItem(id: string, data: any) {
    return apiRequest<any>(`/inventory/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  // Staff
  async getStaff() {
    const res: any = await apiRequest('/users/staff');
    return res.data || [];
  },

  async createStaff(data: any) {
    return apiRequest<any>('/users/staff', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateStaff(id: string, data: any) {
    return apiRequest<any>(`/users/staff/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async deleteStaff(id: string) {
    return apiRequest<any>(`/users/staff/${id}`, {
      method: 'DELETE',
    });
  },

  // Suppliers & Purchases
  async getSuppliers() {
    const res: any = await apiRequest('/suppliers');
    return res.data || [];
  },

  async getPurchases() {
    const res: any = await apiRequest('/suppliers/purchases');
    return res.data || [];
  },

  async createPurchase(data: any) {
    return apiRequest<any>('/suppliers/purchases', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Expenses
  async getExpenses() {
    const res: any = await apiRequest('/expenses');
    return res.data || [];
  },

  async createExpense(data: any) {
    return apiRequest<any>('/expenses', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Coupons
  async getCoupons() {
    const res: any = await apiRequest('/coupons');
    return res.data || [];
  },

  async validateCoupon(code: string, orderAmount: number) {
    return apiRequest<any>('/coupons/validate', {
      method: 'POST',
      body: JSON.stringify({ code, orderAmount }),
    });
  },

  // Reviews
  async getReviews() {
    const res: any = await apiRequest('/reviews');
    return res.data || [];
  },

  async createReview(data: any) {
    return apiRequest<any>('/reviews', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Notifications
  async getNotifications() {
    const res: any = await apiRequest('/notifications');
    return res.data || [];
  },

  async markNotificationRead(id: string) {
    return apiRequest<any>(`/notifications/${id}/read`, {
      method: 'PATCH',
    });
  },

  async markAllNotificationsRead() {
    return apiRequest<any>('/notifications/read-all', {
      method: 'PATCH',
    });
  },

  async clearAllNotifications() {
    return apiRequest<any>('/notifications/clear-all', {
      method: 'DELETE',
    });
  },

  // Reports & Analytics
  async getDashboardStats() {
    const res: any = await apiRequest('/reports/dashboard-stats');
    return res.data;
  },

  async getAnalyticsCharts() {
    const res: any = await apiRequest('/reports/charts');
    return res.data;
  },

  // Settings
  async getSettings() {
    const res: any = await apiRequest('/settings');
    return res.data;
  },

  async updateSettings(data: any) {
    return apiRequest<any>('/settings', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  // Audit Logs
  async getAuditLogs(params?: Record<string, string>) {
    const queryString = params ? '?' + new URLSearchParams(params).toString() : '';
    const res: any = await apiRequest(`/audit-logs${queryString}`);
    return res.data || [];
  },
};
