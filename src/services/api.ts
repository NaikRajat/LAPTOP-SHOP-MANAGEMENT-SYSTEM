import { Product, PromoCode, Order, RepairTicket, StoreBanner, ContactMessage, User, AppNotification, SalesAnalytics } from '../types.js';
import { firebaseAuth, signInWithCustomTokenReal } from './firebase.js';

const API_BASE = '/api';

export async function getValidAuthToken(forceRefresh = false): Promise<string | null> {
  // 1. If Firebase Auth currentUser is active, retrieve fresh Firebase ID token using getIdToken()
  if (firebaseAuth.currentUser) {
    try {
      const idToken = await firebaseAuth.currentUser.getIdToken(forceRefresh);
      if (idToken) {
        localStorage.setItem('systech_token', idToken);
        return idToken;
      }
    } catch (e) {
      console.warn('[SysTech] getIdToken error:', e);
    }
  }

  // 2. Check localStorage for stored token
  try {
    const token = localStorage.getItem('systech_token');
    if (token && token !== 'undefined' && token !== 'null') {
      // If we have a custom token and currentUser is not initialized, sign in with it to obtain fresh ID token
      if (!firebaseAuth.currentUser) {
        try {
          const { user } = await signInWithCustomTokenReal(token);
          if (user) {
            const freshIdToken = await user.getIdToken(forceRefresh);
            localStorage.setItem('systech_token', freshIdToken);
            return freshIdToken;
          }
        } catch {
          // Token may already be an ID token or server-signed JWT
          return token;
        }
      }
      return token;
    }
  } catch {}

  return null;
}

export async function getAuthHeaderAsync(forceRefresh = false): Promise<Record<string, string>> {
  const token = await getValidAuthToken(forceRefresh);
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function getAuthHeader(): Record<string, string> {
  try {
    const token = localStorage.getItem('systech_token');
    return (token && token !== 'undefined' && token !== 'null') ? { Authorization: `Bearer ${token}` } : {};
  } catch {
    return {};
  }
}

async function parseJsonResponse<T = any>(res: Response): Promise<T> {
  let text = '';
  try {
    text = await res.text();
  } catch (err: any) {
    return { error: err?.message || `Failed to read server response (HTTP ${res.status})` } as any;
  }

  if (!text || text.trim() === '' || text.trim() === 'undefined' || text.trim() === 'null') {
    if (!res.ok) {
      return { error: `Server returned HTTP ${res.status} (${res.statusText || 'Error'})` } as any;
    }
    return {} as any;
  }

  try {
    return JSON.parse(text);
  } catch {
    return { error: text && !text.startsWith('<') ? text : `Server returned HTTP ${res.status} (${res.statusText || 'Error'})` } as any;
  }
}

async function requestJson<T = any>(res: Response, fallbackErrorMsg = 'Request failed'): Promise<T> {
  const data = await parseJsonResponse<T>(res);
  if (!res.ok) {
    const err = (data && typeof data === 'object' && (data as any).error) ? (data as any).error : `${fallbackErrorMsg} (HTTP ${res.status})`;
    throw new Error(err);
  }
  return data;
}

export const api = {
  // Auth
  async checkEmail(email: string): Promise<{ exists: boolean; name?: string; hasPassword?: boolean }> {
    const res = await fetch(`${API_BASE}/auth/check-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
    return parseJsonResponse(res);
  },

  async login(email: string, password: string): Promise<{ token: string; user: User }> {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    return requestJson<{ token: string; user: User }>(res, 'Login failed');
  },

  async register(data: { name: string; email: string; password: string; phone?: string; role?: string }): Promise<{ token: string; user: User }> {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return requestJson<{ token: string; user: User }>(res, 'Registration failed');
  },

  async googleLogin(data: { email: string; name: string; avatar?: string; role?: string }): Promise<{ token: string; user: User }> {
    const res = await fetch(`${API_BASE}/auth/google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return requestJson<{ token: string; user: User }>(res, 'Google login failed');
  },

  async sendVerificationCode(email: string, name?: string, purpose?: 'login' | 'register'): Promise<{
    success: boolean;
    sessionId: string;
    expiresAt: number;
    cooldownSeconds: number;
    message: string;
  }> {
    const res = await fetch(`${API_BASE}/auth/send-code`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, name, purpose })
    });
    const data = await parseJsonResponse(res);
    if (!res.ok) {
      const err = new Error(data.error || 'Failed to send verification code') as any;
      err.cooldownRemaining = data.cooldownRemaining;
      err.status = res.status;
      throw err;
    }
    return data;
  },

  async verifyCode(
    email: string,
    code: string,
    sessionId: string,
    name?: string,
    phone?: string,
    password?: string,
    purpose?: 'login' | 'register'
  ): Promise<{ token: string; user: User }> {
    const res = await fetch(`${API_BASE}/auth/verify-code`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, code, sessionId, name, phone, password, purpose })
    });
    const data = await parseJsonResponse(res);
    if (!res.ok) {
      const err = new Error(data.error || 'Invalid or expired verification code') as any;
      err.attemptsRemaining = data.attemptsRemaining;
      err.maxAttemptsExceeded = data.maxAttemptsExceeded;
      err.expired = data.expired;
      err.status = res.status;
      throw err;
    }
    return data;
  },

  async changePassword(newPassword: string, currentPassword?: string): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`${API_BASE}/auth/change-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader()
      },
      body: JSON.stringify({ newPassword, currentPassword })
    });
    return requestJson<{ success: boolean; message: string }>(res, 'Failed to update password');
  },

  async forgotPassword(email?: string): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`${API_BASE}/auth/forgot-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader()
      },
      body: JSON.stringify({ email })
    });
    return requestJson<{ success: boolean; message: string }>(res, 'Failed to send password reset link');
  },

  async getCurrentUser(): Promise<{ user: User }> {
    const res = await fetch(`${API_BASE}/auth/me`, {
      headers: { ...getAuthHeader() }
    });
    return requestJson<{ user: User }>(res, 'Failed to get current user');
  },

  async updateProfile(data: {
    name?: string;
    email?: string;
    phone?: string;
    address?: string;
    addressLine1?: string;
    addressLine2?: string;
    city?: string;
    state?: string;
    postalCode?: string;
  }): Promise<{ user: User }> {
    const res = await fetch(`${API_BASE}/auth/profile`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader()
      },
      body: JSON.stringify(data)
    });
    return requestJson<{ user: User }>(res, 'Failed to update profile');
  },

  // Products
  async getProducts(params?: { category?: string; condition?: string; search?: string }): Promise<Product[]> {
    const query = new URLSearchParams();
    if (params?.category) query.append('category', params.category);
    if (params?.condition) query.append('condition', params.condition);
    if (params?.search) query.append('search', params.search);

    const res = await fetch(`${API_BASE}/products?${query.toString()}`);
    return requestJson<Product[]>(res, 'Failed to fetch products');
  },

  async getProductById(id: string): Promise<Product> {
    const res = await fetch(`${API_BASE}/products/${id}`);
    return requestJson<Product>(res, 'Failed to fetch product');
  },

  async createProduct(productData: Partial<Product>): Promise<Product> {
    const res = await fetch(`${API_BASE}/products`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader()
      },
      body: JSON.stringify(productData)
    });
    return requestJson<Product>(res, 'Failed to create product');
  },

  async updateProduct(id: string, updates: Partial<Product>): Promise<Product> {
    const res = await fetch(`${API_BASE}/products/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader()
      },
      body: JSON.stringify(updates)
    });
    return requestJson<Product>(res, 'Failed to update product');
  },

  async deleteProduct(id: string): Promise<void> {
    const res = await fetch(`${API_BASE}/products/${id}`, {
      method: 'DELETE',
      headers: { ...getAuthHeader() }
    });
    if (!res.ok) {
      const err = await parseJsonResponse(res);
      throw new Error(err?.error || 'Failed to delete product');
    }
  },

  // Image Upload
  async uploadImage(imageData: string, name?: string): Promise<{ url: string }> {
    const res = await fetch(`${API_BASE}/upload`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader()
      },
      body: JSON.stringify({ image: imageData, name })
    });
    return requestJson<{ url: string }>(res, 'Failed to upload image');
  },

  // Promotions
  async getPromotions(): Promise<PromoCode[]> {
    const res = await fetch(`${API_BASE}/promotions`);
    return requestJson<PromoCode[]>(res, 'Failed to fetch promotions');
  },

  async validatePromoCode(code: string, subtotal: number): Promise<{ valid: boolean; discount: number; promo: PromoCode }> {
    const res = await fetch(`${API_BASE}/promotions/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, subtotal })
    });
    return requestJson<{ valid: boolean; discount: number; promo: PromoCode }>(res, 'Invalid promo code');
  },

  async createPromotion(promoData: Partial<PromoCode>): Promise<PromoCode> {
    const res = await fetch(`${API_BASE}/promotions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader()
      },
      body: JSON.stringify(promoData)
    });
    return requestJson<PromoCode>(res, 'Failed to create promo code');
  },

  async updatePromotion(id: string, updates: Partial<PromoCode>): Promise<PromoCode> {
    const res = await fetch(`${API_BASE}/promotions/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader()
      },
      body: JSON.stringify(updates)
    });
    return requestJson<PromoCode>(res, 'Failed to update promotion');
  },

  async deletePromotion(id: string): Promise<void> {
    const res = await fetch(`${API_BASE}/promotions/${id}`, {
      method: 'DELETE',
      headers: { ...getAuthHeader() }
    });
    if (!res.ok) {
      const err = await parseJsonResponse(res);
      throw new Error(err?.error || 'Failed to delete promotion');
    }
  },

  // Aliases for convenient caller ergonomics
  getPromoCodes() {
    return this.getPromotions();
  },
  createPromoCode(data: Partial<PromoCode>) {
    return this.createPromotion(data);
  },
  updatePromoCode(id: string, updates: Partial<PromoCode>) {
    return this.updatePromotion(id, updates);
  },
  deletePromoCode(id: string) {
    return this.deletePromotion(id);
  },

  // Banners
  async getBanners(): Promise<StoreBanner[]> {
    const res = await fetch(`${API_BASE}/banners`);
    return requestJson<StoreBanner[]>(res, 'Failed to fetch banners');
  },

  async createBanner(bannerData: Partial<StoreBanner>): Promise<StoreBanner> {
    const res = await fetch(`${API_BASE}/banners`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader()
      },
      body: JSON.stringify(bannerData)
    });
    return requestJson<StoreBanner>(res, 'Failed to create banner');
  },

  async deleteBanner(id: string): Promise<void> {
    const res = await fetch(`${API_BASE}/banners/${id}`, {
      method: 'DELETE',
      headers: { ...getAuthHeader() }
    });
    if (!res.ok) {
      const err = await parseJsonResponse(res);
      throw new Error(err?.error || 'Failed to delete banner');
    }
  },

  // Orders
  async getOrders(): Promise<Order[]> {
    const authHeader = await getAuthHeaderAsync();
    const res = await fetch(`${API_BASE}/orders`, {
      headers: {
        ...authHeader
      }
    });
    return requestJson<Order[]>(res, 'Failed to fetch orders');
  },

  async createOrder(orderData: Partial<Order>): Promise<Order> {
    const authHeader = await getAuthHeaderAsync(true);
    const res = await fetch(`${API_BASE}/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeader
      },
      body: JSON.stringify(orderData)
    });
    return requestJson<Order>(res, 'Failed to create order');
  },

  async updateOrderStatus(id: string, status: Order['status']): Promise<Order> {
    const res = await fetch(`${API_BASE}/orders/${id}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader()
      },
      body: JSON.stringify({ status })
    });
    return requestJson<Order>(res, 'Failed to update order status');
  },

  // Repairs
  async getRepairs(): Promise<RepairTicket[]> {
    const res = await fetch(`${API_BASE}/repairs`);
    return requestJson<RepairTicket[]>(res, 'Failed to fetch repairs');
  },

  async lookupRepair(ticketNumber: string): Promise<RepairTicket> {
    const res = await fetch(`${API_BASE}/repairs/lookup/${ticketNumber}`);
    return requestJson<RepairTicket>(res, 'Repair ticket not found');
  },

  async bookRepair(repairData: Partial<RepairTicket>): Promise<RepairTicket> {
    const res = await fetch(`${API_BASE}/repairs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(repairData)
    });
    return requestJson<RepairTicket>(res, 'Failed to book repair');
  },

  async updateRepair(id: string, updates: Partial<RepairTicket>): Promise<RepairTicket> {
    const res = await fetch(`${API_BASE}/repairs/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader()
      },
      body: JSON.stringify(updates)
    });
    return requestJson<RepairTicket>(res, 'Failed to update repair');
  },

  // Repair Aliases
  getRepairTickets() {
    return this.getRepairs();
  },
  getRepairTicket(ticketNumber: string) {
    return this.lookupRepair(ticketNumber);
  },
  createRepairTicket(data: Partial<RepairTicket>) {
    return this.bookRepair(data);
  },
  updateRepairTicket(id: string, updates: Partial<RepairTicket>) {
    return this.updateRepair(id, updates);
  },

  // Messages
  async getMessages(): Promise<ContactMessage[]> {
    const res = await fetch(`${API_BASE}/messages`, {
      headers: { ...getAuthHeader() }
    });
    return requestJson<ContactMessage[]>(res, 'Failed to fetch messages');
  },

  async sendMessage(msgData: Partial<ContactMessage>): Promise<ContactMessage> {
    const res = await fetch(`${API_BASE}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(msgData)
    });
    return requestJson<ContactMessage>(res, 'Failed to send message');
  },

  async markMessageRead(id: string): Promise<void> {
    const res = await fetch(`${API_BASE}/messages/${id}/read`, {
      method: 'PUT',
      headers: { ...getAuthHeader() }
    });
    if (!res.ok) {
      const err = await parseJsonResponse(res);
      throw new Error(err?.error || 'Failed to mark message read');
    }
  },

  // Notifications
  async getNotifications(): Promise<AppNotification[]> {
    try {
      const res = await fetch(`${API_BASE}/notifications`);
      if (!res.ok) return [];
      const data = await parseJsonResponse<AppNotification[]>(res);
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  },

  async markNotificationRead(id: string): Promise<void> {
    try {
      await fetch(`${API_BASE}/notifications/${id}/read`, {
        method: 'PUT'
      });
    } catch {}
  },

  async deleteNotification(id: string): Promise<void> {
    try {
      await fetch(`${API_BASE}/notifications/${id}`, {
        method: 'DELETE'
      });
    } catch {}
  },

  async markAllNotificationsRead(): Promise<void> {
    try {
      await fetch(`${API_BASE}/notifications/read-all`, {
        method: 'PUT'
      });
    } catch {}
  },

  async clearNotifications(): Promise<void> {
    try {
      await fetch(`${API_BASE}/notifications`, {
        method: 'DELETE'
      });
    } catch {}
  },

  // Analytics
  async getAnalytics(): Promise<SalesAnalytics> {
    const res = await fetch(`${API_BASE}/analytics`, {
      headers: { ...getAuthHeader() }
    });
    return requestJson<SalesAnalytics>(res, 'Failed to fetch analytics');
  },

  // Unit Tests
  async runTests(): Promise<{ allPassed: boolean; timestamp: string; results: any[] }> {
    const res = await fetch(`${API_BASE}/test/run`);
    return requestJson<{ allPassed: boolean; timestamp: string; results: any[] }>(res, 'Failed to run system tests');
  },
  runAutomatedTests() {
    return this.runTests();
  }
};
