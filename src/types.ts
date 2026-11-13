export type ProductCondition = 'brand_new' | 'refurbished';
export type ProductCategory = 'laptops' | 'accessories' | 'cctv' | 'custom_pc';

export interface ProductSpecs {
  cpu?: string;
  ram?: string;
  storage?: string;
  display?: string;
  gpu?: string;
  battery?: string;
  os?: string;
  ports?: string;
  warranty?: string;
  tagline?: string;
}

export interface Product {
  id: string;
  title: string;
  brand: string;
  sku: string;
  condition: ProductCondition;
  category: ProductCategory;
  price: number;
  originalPrice?: number;
  stock: number;
  image: string;
  rating: number;
  reviewsCount: number;
  specs: ProductSpecs;
  description?: string;
  featured?: boolean;
  active: boolean;
  createdAt: string;
}

export interface CartAddon {
  id: string;
  name: string;
  price: number;
  included?: boolean;
}

export interface CartItem {
  product: Product;
  quantity: number;
  extendedCare?: boolean; // +6,499 for 2 yrs
  dataMigration?: boolean; // Complimentary Free
}

export interface PromoCode {
  id: string;
  code: string;
  description: string;
  discountType: 'flat' | 'percentage';
  discountValue: number;
  minOrder: number;
  expiresAt: string;
  active: boolean;
  usageCount: number;
}

export type OrderStatus = 'pending' | 'processing' | 'ready_for_pickup' | 'dispatched' | 'delivered' | 'cancelled';
export type FulfillmentType = 'pickup' | 'courier';

export interface OrderItem {
  productId: string;
  title: string;
  sku: string;
  price: number;
  quantity: number;
  image: string;
  extendedCare?: boolean;
  dataMigration?: boolean;
}

export interface Order {
  id: string;
  orderNumber: string;
  userId?: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  address?: string;
  city?: string;
  pincode?: string;
  fulfillment: FulfillmentType;
  items: OrderItem[];
  subtotal: number;
  protectionFee: number;
  deliveryFee: number;
  tax: number;
  discount: number;
  promoCodeUsed?: string;
  total: number;
  paymentMethod: 'store_pickup_cash' | 'upi_online';
  paymentStatus: 'pending' | 'paid' | 'pay_at_store';
  status: OrderStatus;
  createdAt: string;
}

export type RepairStatus = 'received' | 'diagnosing' | 'in_progress' | 'testing' | 'ready' | 'completed' | 'delivered' | 'in_diagnosis' | 'awaiting_parts' | 'bench_testing';

export interface RepairTicket {
  id: string;
  ticketNumber: string;
  userId?: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  deviceType?: string;
  brandModel?: string;
  deviceModel?: string;
  issueCategory?: 'screen' | 'battery' | 'speed' | 'motherboard' | 'os' | 'thermal' | 'other';
  issueDescription?: string;
  issueDetails?: string;
  estimatedCost: number;
  status: RepairStatus;
  technicianNotes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface StoreBanner {
  id: string;
  title: string;
  subtitle: string;
  image: string;
  linkText: string;
  linkUrl: string;
  badge: string;
  active: boolean;
  position: 'top_strip' | 'hero_slider' | 'promo_card';
}

export interface ContactMessage {
  id: string;
  name: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
  createdAt: string;
  read: boolean;
  replied?: boolean;
}

export interface User {
  id: string | number;
  name: string;
  email: string;
  role: 'admin' | 'customer' | 'OWNER' | 'ADMIN' | 'CUSTOMER';
  avatar?: string;
  phone?: string;
  address?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  createdAt?: string;
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: 'order' | 'repair' | 'promo' | 'system' | 'stock';
  read: boolean;
  timestamp: string;
  link?: string;
}

export interface SalesAnalytics {
  totalRevenue: number;
  totalOrders: number;
  activeRepairs: number;
  lowStockCount: number;
  recentSales: { date: string; revenue: number; orders: number }[];
  categoryBreakdown: { category: string; count: number; value: number }[];
  topSellingProducts: { id: string; title: string; count: number; revenue: number }[];
}
