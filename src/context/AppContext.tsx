import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Product, CartItem, PromoCode, AppNotification, FulfillmentType } from '../types.js';
import { api } from '../services/api.js';
import {
  signInWithGoogleReal,
  signOutReal,
  signInWithCustomTokenReal,
  firebaseAuth
} from '../services/firebase.js';
import { onAuthStateChanged } from 'firebase/auth';

interface ToastState {
  title: string;
  message: string;
  type: 'success' | 'error' | 'info';
  visible: boolean;
}

interface AppContextType {
  // Auth
  user: User | null;
  token: string | null;
  isAdmin: boolean;
  login: (email: string, pass: string) => Promise<void>;
  register: (data: any) => Promise<void>;
  googleLogin: (name?: string, email?: string, role?: 'admin' | 'customer') => Promise<void>;
  sendVerificationCode: (email: string, name?: string, purpose?: 'login' | 'register') => Promise<{
    success: boolean;
    sessionId: string;
    expiresAt: number;
    cooldownSeconds: number;
    message: string;
  }>;
  verifyCodeAndLogin: (
    email: string,
    code: string,
    sessionId: string,
    name?: string,
    phone?: string,
    password?: string,
    purpose?: 'login' | 'register'
  ) => Promise<void>;
  updateProfile: (data: Partial<User>) => Promise<void>;
  logout: () => void;

  // Cart
  cart: CartItem[];
  addToCart: (product: Product, options?: { extendedCare?: boolean; dataMigration?: boolean }) => void;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  toggleCartAddon: (productId: string, addon: 'extendedCare' | 'dataMigration') => void;
  appliedPromo: { code: string; discount: number; promo: PromoCode } | null;
  applyPromo: (code: string) => Promise<boolean>;
  removePromo: () => void;
  clearCart: () => void;
  fulfillment: FulfillmentType;
  setFulfillment: (mode: FulfillmentType) => void;
  cartSubtotal: number;
  protectionFee: number;
  deliveryFee: number;
  estimatedTax: number;
  cartTotal: number;
  totalSavings: number;
  cartCount: number;

  // Modals & Navigation
  currentView: 'store' | 'admin';
  setCurrentView: (view: 'store' | 'admin') => void;
  activeAdminTab: 'dashboard' | 'products' | 'promotions' | 'banners' | 'orders' | 'repairs' | 'messages' | 'tests';
  setActiveAdminTab: (tab: any) => void;
  specsModalProduct: Product | null;
  setSpecsModalProduct: (prod: Product | null) => void;
  isCartOpen: boolean;
  setIsCartOpen: (open: boolean) => void;
  isAuthOpen: boolean;
  setIsAuthOpen: (open: boolean) => void;
  authInitialTab: 'login' | 'register';
  openAuthModal: (tab?: 'login' | 'register') => void;
  isUserProfileOpen: boolean;
  setIsUserProfileOpen: (open: boolean) => void;
  isCctvSurveyModalOpen: boolean;
  setIsCctvSurveyModalOpen: (open: boolean) => void;
  isCustomPcModalOpen: boolean;
  setIsCustomPcModalOpen: (open: boolean) => void;
  isRepairModalOpen: boolean;
  setIsRepairModalOpen: (open: boolean) => void;
  isRepairTrackerOpen: boolean;
  setIsRepairTrackerOpen: (open: boolean) => void;
  isNotificationsOpen: boolean;
  setIsNotificationsOpen: (open: boolean) => void;

  // Filter & Search
  selectedCategory: string;
  setSelectedCategory: (cat: string) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;

  // Dark Mode
  darkMode: boolean;
  toggleDarkMode: () => void;

  // Notifications
  notifications: AppNotification[];
  unreadNotifsCount: number;
  refreshNotifications: () => void;
  markNotifAsRead: (id: string) => void;
  markAllNotifsAsRead: () => void;
  deleteNotification: (id: string) => Promise<void>;
  clearAllNotifications: () => Promise<void>;

  // Toast
  toast: ToastState;
  showToast: (title: string, message: string, type?: 'success' | 'error' | 'info') => void;
  hideToast: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Auth state with safe storage parsing
  const [user, setUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem('systech_user');
      if (!saved || saved === 'undefined' || saved === 'null' || saved.trim() === '') {
        return null;
      }
      return JSON.parse(saved);
    } catch (e) {
      console.warn('Failed to parse saved user from localStorage:', e);
      try { localStorage.removeItem('systech_user'); } catch {}
      return null;
    }
  });

  const [token, setToken] = useState<string | null>(() => {
    try {
      const saved = localStorage.getItem('systech_token');
      if (!saved || saved === 'undefined' || saved === 'null' || saved.trim() === '') {
        return null;
      }
      return saved;
    } catch {
      return null;
    }
  });

  // Default seed cart matches screenshot initially!
  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem('systech_cart');
      if (saved && saved !== 'undefined' && saved !== 'null' && saved.trim() !== '') {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Failed to parse saved cart from localStorage:', e);
      try { localStorage.removeItem('systech_cart'); } catch {}
    }
    // Default 2 units from screenshot (ThinkPad X1 + MacBook Pro 16)
    return [
      {
        product: {
          id: 'prod-thinkpad-x1',
          title: 'Lenovo ThinkPad X1 Carbon Gen 11',
          brand: 'Lenovo',
          sku: 'NX-THINK-X1G11',
          condition: 'refurbished',
          category: 'laptops',
          price: 74999,
          originalPrice: 135000,
          stock: 1,
          image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAFae43APyV18GCX-dXReo3_LGOl-LsRl0d2tHjQi4P287FuIMYf8rrwPzlrYdVI2L3aVRBiyG8xg-dTa0X-gpotN6hzQFBgXB3tNXnGicGJrEziZBb833nab4W2RA2xsEuBoyUF5ZHVxJ7LzmI4XHCp2X1tzbH-ZXjLnuPHRGC0rpOT_jefm8ht74wPtXJ1DnVb_Z0QZUBopWwZftWZtCQKFxV3-_U2qkBBtR8k7LwyUHEEB_vcKsc7w',
          rating: 4.9,
          reviewsCount: 38,
          active: true,
          createdAt: new Date().toISOString(),
          description: 'Intel Core i7-1365U • 32GB LPDDR5 • 1TB NVMe Gen4 SSD • 14" 2.8K OLED (400 nits)',
          specs: {
            cpu: 'Intel Core i7-1365U vPro (10-Core up to 5.2GHz)',
            ram: '32GB LPDDR5 6400MHz',
            storage: '1TB High-Speed NVMe Gen4 SSD',
            display: '14" 2.8K (2880x1800) OLED 90Hz HDR 400 nits',
            gpu: 'Intel Iris Xe Graphics',
            battery: '98% Battery Health',
            os: 'Win 11 Pro Clean',
            warranty: '1-Yr SysTech Certified Store Warranty & 40-Point Diagnostic Check (₹9,999 value, Included Free)'
          }
        },
        quantity: 1,
        extendedCare: true, // +₹6,499
        dataMigration: false
      },
      {
        product: {
          id: 'prod-macbook-pro-16',
          title: 'Apple MacBook Pro 16" (Space Black)',
          brand: 'Apple',
          sku: 'NX-APL-MBP16-M3M',
          condition: 'brand_new',
          category: 'laptops',
          price: 289900,
          originalPrice: 315000,
          stock: 2,
          image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCtwDot8JG-1nBrR5XzB6bZoHY7JaH655hC1QwtLhZeo2tNdw-09qFeY5zSHf8CkKke2VNwA987JAQ9S-Sq5NAEDCs7da63i9nCLJ__u8StX1X3H_RPWVTL6bWf9efKBQW8SO03rBZHVEjS89G7feiQfLzpTOM0NgPV9jBUmsyDOfjOVgLIquddrr9oQBQOflnk_sEkkbLRVSAxqbjpl6amA42xpa9FLvCp-TpGbqRgbZ4hhPmn-bzeaA',
          rating: 5.0,
          reviewsCount: 42,
          active: true,
          createdAt: new Date().toISOString(),
          description: 'Apple M3 Max (16-Core CPU, 40-Core GPU) • 48GB Unified Memory • 1TB SSD • 16.2" Liquid Retina XDR',
          specs: {
            cpu: 'Apple M3 Max 16-Core',
            ram: '48GB Unified',
            storage: '1TB SSD',
            display: '16.2" Liquid Retina XDR',
            gpu: 'Apple 40C GPU',
            warranty: 'Full AppleCare Eligibility + SysTech White Glove Onboarding & Unboxing Assistance'
          }
        },
        quantity: 1,
        extendedCare: false,
        dataMigration: true
      }
    ];
  });

  const [appliedPromo, setAppliedPromo] = useState<{ code: string; discount: number; promo: PromoCode } | null>(() => {
    // Default SYSTECH applied promo from screenshot (-₹8,000)
    return {
      code: 'SYSTECH',
      discount: 8000,
      promo: {
        id: 'promo-systech',
        code: 'SYSTECH',
        description: 'Store Grand Discount for Laptop Purchases',
        discountType: 'flat',
        discountValue: 8000,
        minOrder: 50000,
        expiresAt: '2026-12-31',
        active: true,
        usageCount: 14
      }
    };
  });

  const [fulfillment, setFulfillment] = useState<FulfillmentType>('pickup');

  // Modals & Navigation
  const [currentView, setCurrentView] = useState<'store' | 'admin'>('store');
  const [activeAdminTab, setActiveAdminTab] = useState<'dashboard' | 'products' | 'promotions' | 'banners' | 'orders' | 'repairs' | 'messages' | 'tests'>('dashboard');
  const [specsModalProduct, setSpecsModalProduct] = useState<Product | null>(null);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [authInitialTab, setAuthInitialTab] = useState<'login' | 'register'>('login');
  const [isUserProfileOpen, setIsUserProfileOpen] = useState(false);
  const [isCctvSurveyModalOpen, setIsCctvSurveyModalOpen] = useState(false);
  const [isCustomPcModalOpen, setIsCustomPcModalOpen] = useState(false);
  const [isRepairModalOpen, setIsRepairModalOpen] = useState(false);
  const [isRepairTrackerOpen, setIsRepairTrackerOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

  // Category and Search Filtering
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const openAuthModal = (tab: 'login' | 'register' = 'login') => {
    setAuthInitialTab(tab);
    setIsAuthOpen(true);
  };

  // Dark Mode - default to user preference or light/dark
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('systech_theme');
    if (saved) return saved === 'dark';
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });

  // Notifications
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  // Toast
  const [toast, setToast] = useState<ToastState>({
    title: '',
    message: '',
    type: 'info',
    visible: false
  });

  // Save cart to local storage safely
  useEffect(() => {
    try {
      if (Array.isArray(cart)) {
        localStorage.setItem('systech_cart', JSON.stringify(cart));
      }
    } catch (e) {
      console.warn('Failed to save cart to localStorage:', e);
    }
  }, [cart]);

  // Handle dark mode class and color scheme
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      document.documentElement.style.colorScheme = 'dark';
      localStorage.setItem('systech_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.style.colorScheme = 'light';
      localStorage.setItem('systech_theme', 'light');
    }
  }, [darkMode]);

  const toggleDarkMode = () => setDarkMode(prev => !prev);

  const showToast = (title: string, message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ title, message, type, visible: true });
    setTimeout(() => {
      setToast(prev => ({ ...prev, visible: false }));
    }, 4000);
  };

  const hideToast = () => setToast(prev => ({ ...prev, visible: false }));

  // Refresh notifications
  const refreshNotifications = async () => {
    try {
      const data = await api.getNotifications();
      setNotifications(data);
    } catch (e) {
      // quiet fallback
    }
  };

  useEffect(() => {
    refreshNotifications();
    const interval = setInterval(refreshNotifications, 15000);
    return () => clearInterval(interval);
  }, []);

  // Synchronize with Firebase Auth session state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(firebaseAuth, async (fbUser) => {
      if (fbUser) {
        try {
          const idToken = await fbUser.getIdToken();
          setToken(idToken);
          localStorage.setItem('systech_token', idToken);
        } catch (tokErr) {
          console.warn('[Firebase] ID token retrieval notice:', tokErr);
        }

        const email = fbUser.email || '';
        const isAdmin =
          email.toLowerCase() === 'admin@systech.com' ||
          email.toLowerCase() === 'rajatnaik0541@gmail.com';

        const realUser: User = {
          id: fbUser.uid,
          email,
          name: fbUser.displayName || email.split('@')[0] || 'User',
          role: isAdmin ? 'admin' : 'customer',
          avatar: fbUser.photoURL || undefined
        };
        setUser(prev => prev || realUser);
      }
    });
    return () => unsubscribe();
  }, []);

  const markNotifAsRead = async (id: string) => {
    try {
      await api.markNotificationRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    } catch (e) {}
  };

  const markAllNotifsAsRead = async () => {
    try {
      await api.markAllNotificationsRead();
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch (e) {}
  };

  const deleteNotification = async (id: string) => {
    try {
      await api.deleteNotification(id);
    } catch (e) {}
    setNotifications(prev => prev.filter(n => n.id !== id));
    showToast('Notification Dismissed', 'Notification removed', 'info');
  };

  const clearAllNotifications = async () => {
    try {
      await api.clearNotifications();
    } catch (e) {}
    setNotifications([]);
    showToast('Notifications Cleared', 'All notifications have been removed', 'info');
  };

  const unreadNotifsCount = notifications.filter(n => !n.read).length;

  // Safe auth state persistence helper
  const persistAuth = async (newUser: User | null, newToken: string | null) => {
    setUser(newUser);
    setToken(newToken);
    try {
      if (newToken && typeof newToken === 'string' && newToken !== 'undefined' && newToken !== 'null') {
        localStorage.setItem('systech_token', newToken);
        if (!firebaseAuth.currentUser) {
          try {
            await signInWithCustomTokenReal(newToken);
            const freshIdToken = await firebaseAuth.currentUser?.getIdToken();
            if (freshIdToken) {
              setToken(freshIdToken);
              localStorage.setItem('systech_token', freshIdToken);
            }
          } catch (tokErr) {
            console.warn('[Firebase] signInWithCustomToken notice:', tokErr);
          }
        }
      } else {
        localStorage.removeItem('systech_token');
      }
      if (newUser && typeof newUser === 'object' && newUser.id) {
        localStorage.setItem('systech_user', JSON.stringify(newUser));
      } else {
        localStorage.removeItem('systech_user');
      }
    } catch (e) {
      console.warn('Failed to persist auth state:', e);
    }
  };

  const isUserAdmin = (u: any): boolean => {
    if (!u || !u.role) return false;
    const r = String(u.role).toLowerCase();
    return r === 'admin' || r === 'owner';
  };

  const isAdmin = isUserAdmin(user);

  // Sync initial URL pathname on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (window.location.pathname === '/admin') {
        if (isAdmin) {
          setCurrentView('admin');
        } else {
          setCurrentView('store');
          window.history.replaceState(null, '', '/');
        }
      }
    }
  }, [isAdmin]);

  // Guard currentView: If non-admin attempts to view admin panel, force store view & strip URL
  useEffect(() => {
    if (currentView === 'admin') {
      if (!isAdmin) {
        setCurrentView('store');
        if (typeof window !== 'undefined') {
          window.history.replaceState(null, '', '/');
        }
      } else {
        if (typeof window !== 'undefined' && window.location.pathname !== '/admin') {
          window.history.replaceState(null, '', '/admin');
        }
      }
    } else if (currentView === 'store') {
      if (typeof window !== 'undefined' && window.location.pathname === '/admin') {
        window.history.replaceState(null, '', '/');
      }
    }
  }, [currentView, isAdmin]);

  // Auth methods
  const login = async (email: string, pass: string) => {
    const res = await api.login(email, pass);
    if (!res || !res.user) {
      throw new Error('Invalid response from login server');
    }
    persistAuth(res.user, res.token);
    setIsAuthOpen(false);
    if (isUserAdmin(res.user)) {
      setCurrentView('admin');
    } else {
      setCurrentView('store');
    }
    showToast('Signed In', `Welcome back, ${res.user.name}!`, 'success');
  };

  const register = async (data: any) => {
    const res = await api.register(data);
    if (!res || !res.user) {
      throw new Error('Invalid response from registration server');
    }
    persistAuth(res.user, res.token);
    setIsAuthOpen(false);
    if (isUserAdmin(res.user)) {
      setCurrentView('admin');
    } else {
      setCurrentView('store');
    }
    showToast('Account Created', `Welcome to SysTech, ${res.user.name}!`, 'success');
  };

  const googleLogin = async (fallbackName?: string, fallbackEmail?: string, fallbackRole?: 'admin' | 'customer') => {
    try {
      // 1. Authenticate with real Firebase Google Auth Popup
      const { user: fbUser } = await signInWithGoogleReal();
      const realEmail = fbUser.email || fallbackEmail || 'user@gmail.com';
      const realName = fbUser.displayName || fallbackName || realEmail.split('@')[0];

      // 2. Synchronize with our backend token
      const res = await api.googleLogin({
        name: realName,
        email: realEmail,
        avatar: fbUser.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(realName)}`
      });

      const finalUser: User = {
        id: fbUser.uid || res?.user?.id || 'usr-google',
        email: realEmail,
        name: realName,
        role: res?.user?.role || 'customer',
        avatar: fbUser.photoURL || res?.user?.avatar
      };

      persistAuth(res?.user || finalUser, res?.token || null);
      setIsAuthOpen(false);
      if (isUserAdmin(res?.user || finalUser)) {
        setCurrentView('admin');
      } else {
        setCurrentView('store');
      }
      showToast('Google Authenticated', `Signed in securely as ${finalUser.name}`, 'success');
    } catch (error: any) {
      console.warn('[SysTech] Google Sign-In attempt:', error);
      // If fallback parameters were passed
      if (fallbackEmail) {
        const res = await api.googleLogin({
          name: fallbackName || 'Google User',
          email: fallbackEmail,
          avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(fallbackName || 'User')}`
        });
        if (res && res.user) {
          persistAuth(res.user, res.token);
          setIsAuthOpen(false);
          if (isUserAdmin(res.user)) {
            setCurrentView('admin');
          } else {
            setCurrentView('store');
          }
          showToast('Signed In', `Signed in as ${res.user.name}`, 'success');
        }
        return;
      }

      if (error?.code === 'auth/popup-blocked') {
        throw new Error('Sign-In popup was blocked by your browser. Please allow popups or use email verification.');
      } else if (error?.code === 'auth/popup-closed-by-user') {
        throw new Error('Google Sign-In popup was closed.');
      } else if (error?.code === 'auth/cancelled-popup-request') {
        throw new Error('Google Sign-In was cancelled.');
      }
      throw error;
    }
  };

  const sendVerificationCode = async (email: string, name?: string, purpose?: 'login' | 'register') => {
    return await api.sendVerificationCode(email, name, purpose);
  };

  const verifyCodeAndLogin = async (
    email: string,
    code: string,
    sessionId: string,
    name?: string,
    phone?: string,
    password?: string,
    purpose?: 'login' | 'register'
  ) => {
    const res = await api.verifyCode(email, code, sessionId, name, phone, password, purpose);
    if (!res || !res.user) {
      throw new Error('Invalid verification response from server');
    }
    persistAuth(res.user, res.token);
    setIsAuthOpen(false);
    if (isUserAdmin(res.user)) {
      setCurrentView('admin');
    } else {
      setCurrentView('store');
    }
    showToast('Email Verified & Signed In', `Welcome, ${res.user.name}!`, 'success');
  };

  const updateProfile = async (data: Partial<User>) => {
    const res = await api.updateProfile(data as any);
    if (res && res.user) {
      persistAuth(res.user, token);
      showToast('Profile Updated', 'Your profile and address have been saved successfully.', 'success');
    }
  };

  const logout = async () => {
    try {
      await signOutReal();
    } catch (e) {
      console.warn('[Firebase] Sign out error:', e);
    }
    persistAuth(null, null);
    setCurrentView('store');
    showToast('Logged Out', 'You have been logged out securely.', 'info');
  };

  // Cart operations - Pure, strictly immutable to ensure exact +1 increments
  const addToCart = (product: Product, options?: { extendedCare?: boolean; dataMigration?: boolean }) => {
    setCart(prev => {
      const existingIndex = prev.findIndex(item => item.product.id === product.id);
      if (existingIndex > -1) {
        return prev.map((item, idx) =>
          idx === existingIndex ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [
        ...prev,
        {
          product,
          quantity: 1,
          extendedCare: options?.extendedCare ?? false,
          dataMigration: options?.dataMigration ?? true
        }
      ];
    });
    showToast('Added to Cart', `${product.title} reserved for checkout.`, 'success');
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(i => i.product.id !== productId));
    showToast('Item Removed', 'Item removed from your cart.', 'info');
  };

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    setCart(prev => prev.map(item => item.product.id === productId ? { ...item, quantity } : item));
  };

  const toggleCartAddon = (productId: string, addon: 'extendedCare' | 'dataMigration') => {
    setCart(prev => prev.map(item => {
      if (item.product.id === productId) {
        return { ...item, [addon]: !item[addon] };
      }
      return item;
    }));
  };

  const applyPromo = async (code: string): Promise<boolean> => {
    try {
      const res = await api.validatePromoCode(code, cartSubtotal);
      if (res.valid) {
        setAppliedPromo(res);
        showToast('Promo Code Applied', `Discount of ₹${res.discount.toLocaleString('en-IN')} applied!`, 'success');
        return true;
      }
      return false;
    } catch (e: any) {
      showToast('Invalid Coupon', e.message || 'Could not apply promo code', 'error');
      return false;
    }
  };

  const removePromo = () => {
    setAppliedPromo(null);
    showToast('Promo Removed', 'Discount coupon removed.', 'info');
  };

  const clearCart = () => {
    setCart([]);
    setAppliedPromo(null);
  };

  // Pricing math matching screenshot
  const cartSubtotal = cart.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
  const protectionFee = cart.reduce((sum, item) => sum + (item.extendedCare ? 6499 * item.quantity : 0), 0);
  const deliveryFee = fulfillment === 'courier' ? (cartSubtotal > 50000 ? 0 : 250) : 0;
  const discount = appliedPromo ? appliedPromo.discount : 0;
  // Estimated 18% GST (on hardware + protection - discount)
  const taxableAmount = Math.max(0, cartSubtotal + protectionFee - discount);
  const estimatedTax = Math.round(taxableAmount * 0.18);
  const cartTotal = Math.max(0, cartSubtotal + protectionFee + deliveryFee + estimatedTax - discount);

  // Calculate market savings
  const originalSubtotal = cart.reduce((sum, item) => {
    const orig = item.product.originalPrice || item.product.price;
    return sum + (orig * item.quantity);
  }, 0);
  const totalSavings = (originalSubtotal - cartSubtotal) + discount;

  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <AppContext.Provider
      value={{
        user,
        token,
        isAdmin,
        login,
        register,
        googleLogin,
        sendVerificationCode,
        verifyCodeAndLogin,
        updateProfile,
        logout,

        cart,
        addToCart,
        removeFromCart,
        updateQuantity,
        toggleCartAddon,
        appliedPromo,
        applyPromo,
        removePromo,
        clearCart,
        fulfillment,
        setFulfillment,
        cartSubtotal,
        protectionFee,
        deliveryFee,
        estimatedTax,
        cartTotal,
        totalSavings,
        cartCount,

        currentView,
        setCurrentView,
        activeAdminTab,
        setActiveAdminTab,
        specsModalProduct,
        setSpecsModalProduct,
        isCartOpen,
        setIsCartOpen,
        isAuthOpen,
        setIsAuthOpen,
        authInitialTab,
        openAuthModal,
        isUserProfileOpen,
        setIsUserProfileOpen,
        isCctvSurveyModalOpen,
        setIsCctvSurveyModalOpen,
        isCustomPcModalOpen,
        setIsCustomPcModalOpen,
        isRepairModalOpen,
        setIsRepairModalOpen,
        isRepairTrackerOpen,
        setIsRepairTrackerOpen,
        isNotificationsOpen,
        setIsNotificationsOpen,

        selectedCategory,
        setSelectedCategory,
        searchQuery,
        setSearchQuery,

        darkMode,
        toggleDarkMode,

        notifications,
        unreadNotifsCount,
        refreshNotifications,
        markNotifAsRead,
        markAllNotifsAsRead,
        deleteNotification,
        clearAllNotifications,

        toast,
        showToast,
        hideToast
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
