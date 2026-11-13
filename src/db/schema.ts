import { relations } from 'drizzle-orm';
import {
  pgTable,
  serial,
  text,
  integer,
  boolean,
  timestamp,
  jsonb,
  numeric
} from 'drizzle-orm/pg-core';

// ==========================================
// 1. Users & Authentication
// ==========================================
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(), // Firebase UID or internal unique UUID
  email: text('email').notNull().unique(),
  name: text('name').notNull().default(''),
  phone: text('phone').default(''),
  passwordHash: text('password_hash'),
  role: text('role').notNull().default('CUSTOMER'), // 'CUSTOMER' | 'ADMIN' | 'OWNER'
  isVerified: boolean('is_verified').notNull().default(false),
  avatarUrl: text('avatar_url'),
  address: text('address').default(''),
  addressLine1: text('address_line1').default(''),
  addressLine2: text('address_line2').default(''),
  city: text('city').default(''),
  state: text('state').default(''),
  postalCode: text('postal_code').default(''),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const accounts = pgTable('accounts', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  provider: text('provider').notNull(), // 'google' | 'email_otp' | 'credentials'
  providerAccountId: text('provider_account_id').notNull(),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const sessions = pgTable('sessions', {
  id: serial('id').primaryKey(),
  sessionToken: text('session_token').notNull().unique(),
  userId: integer('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const verificationSessions = pgTable('verification_sessions', {
  id: serial('id').primaryKey(),
  email: text('email').notNull(),
  phone: text('phone'),
  otpHash: text('otp_hash').notNull(),
  purpose: text('purpose').notNull().default('login'), // 'login' | 'register' | 'checkout'
  attempts: integer('attempts').notNull().default(0),
  maxAttempts: integer('max_attempts').notNull().default(5),
  expiresAt: timestamp('expires_at').notNull(),
  verifiedAt: timestamp('verified_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ==========================================
// 2. Categories, Products & Inventory
// ==========================================
export const categories = pgTable('categories', {
  id: text('id').primaryKey(), // 'refurbished-laptops', 'brand-new-laptops', etc.
  name: text('name').notNull(),
  description: text('description').default(''),
  icon: text('icon').default('Laptop'),
  displayOrder: integer('display_order').default(0),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const products = pgTable('products', {
  id: text('id').primaryKey(), // e.g. 'prod_t480_01'
  slug: text('slug').notNull().unique(),
  title: text('title').notNull(),
  brand: text('brand').notNull(),
  model: text('model').notNull().default(''),
  sku: text('sku').notNull().unique(),
  categoryId: text('category_id').references(() => categories.id).notNull(),
  price: integer('price').notNull(), // stored in INR
  originalPrice: integer('original_price'),
  condition: text('condition').notNull().default('refurbished'), // 'new' | 'refurbished'
  warranty: text('warranty').notNull().default('1 Year SysTech Guarantee'),
  rating: numeric('rating', { precision: 3, scale: 1 }).default('4.8'),
  reviewCount: integer('review_count').default(0),
  featured: boolean('featured').notNull().default(false),
  description: text('description').default(''),
  image: text('image').notNull(),
  specifications: jsonb('specifications').notNull().default({}),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const productImages = pgTable('product_images', {
  id: serial('id').primaryKey(),
  productId: text('product_id').references(() => products.id, { onDelete: 'cascade' }).notNull(),
  url: text('url').notNull(),
  isPrimary: boolean('is_primary').notNull().default(false),
  displayOrder: integer('display_order').notNull().default(0),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const inventory = pgTable('inventory', {
  id: serial('id').primaryKey(),
  productId: text('product_id').references(() => products.id, { onDelete: 'cascade' }).notNull().unique(),
  stock: integer('stock').notNull().default(10),
  reservedStock: integer('reserved_stock').notNull().default(0),
  lowStockThreshold: integer('low_stock_threshold').notNull().default(2),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// ==========================================
// 3. Carts & Cart Items
// ==========================================
export const carts = pgTable('carts', {
  id: text('id').primaryKey(), // uuid
  userId: integer('user_id').references(() => users.id, { onDelete: 'cascade' }),
  sessionId: text('session_id'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const cartItems = pgTable('cart_items', {
  id: serial('id').primaryKey(),
  cartId: text('cart_id').references(() => carts.id, { onDelete: 'cascade' }).notNull(),
  productId: text('product_id').references(() => products.id, { onDelete: 'cascade' }).notNull(),
  quantity: integer('quantity').notNull().default(1),
  extendedCare: boolean('extended_care').notNull().default(false),
  dataMigration: boolean('data_migration').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// ==========================================
// 4. Coupons & Coupon Usages
// ==========================================
export const coupons = pgTable('coupons', {
  id: serial('id').primaryKey(),
  code: text('code').notNull().unique(),
  description: text('description').default(''),
  discountPercent: integer('discount_percent').notNull(), // e.g. 5 for 5%
  maxDiscount: integer('max_discount').default(3000), // max cap in INR
  minSpend: integer('min_spend').default(0),
  isActive: boolean('is_active').notNull().default(true),
  expiresAt: timestamp('expires_at'),
  maxUses: integer('max_uses').default(1000),
  usedCount: integer('used_count').notNull().default(0),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const couponUsages = pgTable('coupon_usages', {
  id: serial('id').primaryKey(),
  couponId: integer('coupon_id').references(() => coupons.id).notNull(),
  userId: integer('user_id').references(() => users.id),
  orderId: text('order_id').notNull(),
  discountAmount: integer('discount_amount').notNull(),
  usedAt: timestamp('used_at').defaultNow().notNull(),
});

// ==========================================
// 5. Orders & Order Items
// ==========================================
export const orders = pgTable('orders', {
  id: text('id').primaryKey(), // uuid
  orderNumber: text('order_number').notNull().unique(), // 'SYS-2026-XXXX'
  userId: integer('user_id').references(() => users.id),
  customerName: text('customer_name').notNull(),
  customerEmail: text('customer_email').notNull(),
  customerPhone: text('customer_phone').notNull(),
  address: text('address').default(''),
  fulfillment: text('fulfillment').notNull().default('in_store_pickup'), // 'in_store_pickup' | 'courier_express'
  subtotal: integer('subtotal').notNull(),
  protectionFee: integer('protection_fee').notNull().default(0),
  deliveryFee: integer('delivery_fee').notNull().default(0),
  tax: integer('tax').notNull().default(0),
  discount: integer('discount').notNull().default(0),
  promoCodeUsed: text('promo_code_used'),
  total: integer('total').notNull(),
  status: text('status').notNull().default('processing'), // 'pending' | 'processing' | 'confirmed' | 'ready_for_pickup' | 'completed' | 'cancelled'
  paymentStatus: text('payment_status').notNull().default('pending'), // 'pending' | 'paid' | 'failed' | 'refunded'
  paymentMethod: text('payment_method').notNull().default('store_pickup_cash'), // 'store_pickup_cash' | 'cod' | 'razorpay' | 'upi_online'
  notes: text('notes').default(''),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const orderItems = pgTable('order_items', {
  id: serial('id').primaryKey(),
  orderId: text('order_id').references(() => orders.id, { onDelete: 'cascade' }).notNull(),
  productId: text('product_id').references(() => products.id).notNull(),
  titleSnapshot: text('title_snapshot').notNull(),
  skuSnapshot: text('sku_snapshot').notNull(),
  priceSnapshot: integer('price_snapshot').notNull(),
  quantity: integer('quantity').notNull().default(1),
  extendedCare: boolean('extended_care').notNull().default(false),
  dataMigration: boolean('data_migration').notNull().default(false),
  imageSnapshot: text('image_snapshot').default(''),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ==========================================
// 6. Payments & Attempts
// ==========================================
export const payments = pgTable('payments', {
  id: text('id').primaryKey(), // e.g. 'pay_...' or razorpay_payment_id
  orderId: text('order_id').references(() => orders.id, { onDelete: 'cascade' }).notNull(),
  amount: integer('amount').notNull(), // INR
  currency: text('currency').notNull().default('INR'),
  method: text('method').notNull(), // 'razorpay' | 'store_pickup_cash' | 'cod' | 'upi'
  status: text('status').notNull().default('pending'), // 'pending' | 'successful' | 'failed' | 'refunded'
  razorpayOrderId: text('razorpay_order_id'),
  razorpayPaymentId: text('razorpay_payment_id'),
  razorpaySignature: text('razorpay_signature'),
  transactionRef: text('transaction_ref'),
  verifiedAt: timestamp('verified_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const paymentAttempts = pgTable('payment_attempts', {
  id: serial('id').primaryKey(),
  orderId: text('order_id').references(() => orders.id).notNull(),
  razorpayOrderId: text('razorpay_order_id'),
  amount: integer('amount').notNull(),
  status: text('status').notNull(), // 'initiated' | 'success' | 'failed'
  rawResponse: jsonb('raw_response'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ==========================================
// 7. Repair Lab Tickets & History
// ==========================================
export const repairTickets = pgTable('repair_tickets', {
  id: text('id').primaryKey(), // 'rep_...'
  ticketNumber: text('ticket_number').notNull().unique(), // 'SYS-REP-8821'
  userId: integer('user_id').references(() => users.id),
  customerName: text('customer_name').notNull(),
  customerPhone: text('customer_phone').notNull(),
  customerEmail: text('customer_email').default(''),
  deviceType: text('device_type').notNull(), // 'Laptop' | 'Desktop' | 'MacBook' | 'All-in-One'
  deviceBrand: text('device_brand').notNull(),
  deviceModel: text('device_model').notNull().default(''),
  issueDescription: text('issue_description').notNull(),
  urgency: text('urgency').notNull().default('standard'), // 'standard' | 'priority' | 'urgent'
  status: text('status').notNull().default('diagnosing'), // 'diagnosing' | 'parts_order' | 'in_repair' | 'quality_check' | 'ready' | 'delivered'
  estimatedCost: integer('estimated_cost').default(0),
  advancePaid: integer('advance_paid').default(0),
  technicianNotes: text('technician_notes').default(''),
  pickupOrDropoff: text('pickup_or_dropoff').notNull().default('dropoff'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const repairStatusHistory = pgTable('repair_status_history', {
  id: serial('id').primaryKey(),
  ticketId: text('ticket_id').references(() => repairTickets.id, { onDelete: 'cascade' }).notNull(),
  previousStatus: text('previous_status'),
  newStatus: text('new_status').notNull(),
  note: text('note').default(''),
  updatedBy: text('updated_by').default('Technician Staff'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ==========================================
// 8. Contact Inquiries, Notifications & Audit Logs
// ==========================================
export const contactInquiries = pgTable('contact_inquiries', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull(),
  phone: text('phone').default(''),
  subject: text('subject').notNull(),
  message: text('message').notNull(),
  status: text('status').notNull().default('unread'), // 'unread' | 'responded' | 'resolved'
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const notifications = pgTable('notifications', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  message: text('message').notNull(),
  type: text('type').notNull().default('order'), // 'order' | 'repair' | 'security' | 'promo'
  isRead: boolean('is_read').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const auditLogs = pgTable('audit_logs', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id),
  action: text('action').notNull(), // 'USER_LOGIN' | 'ORDER_CREATED' | 'PRICE_UPDATED' etc.
  entityType: text('entity_type').notNull(),
  entityId: text('entity_id'),
  details: jsonb('details'),
  ipAddress: text('ip_address'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ==========================================
// Relations
// ==========================================
export const usersRelations = relations(users, ({ many, one }) => ({
  accounts: many(accounts),
  sessions: many(sessions),
  orders: many(orders),
  repairTickets: many(repairTickets),
  cart: one(carts, {
    fields: [users.id],
    references: [carts.userId],
  }),
}));

export const categoriesRelations = relations(categories, ({ many }) => ({
  products: many(products),
}));

export const productsRelations = relations(products, ({ one, many }) => ({
  category: one(categories, {
    fields: [products.categoryId],
    references: [categories.id],
  }),
  images: many(productImages),
  inventory: one(inventory, {
    fields: [products.id],
    references: [inventory.productId],
  }),
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
  user: one(users, {
    fields: [orders.userId],
    references: [users.id],
  }),
  items: many(orderItems),
  payments: many(payments),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, {
    fields: [orderItems.orderId],
    references: [orders.id],
  }),
  product: one(products, {
    fields: [orderItems.productId],
    references: [products.id],
  }),
}));

export const repairTicketsRelations = relations(repairTickets, ({ one, many }) => ({
  user: one(users, {
    fields: [repairTickets.userId],
    references: [users.id],
  }),
  history: many(repairStatusHistory),
}));
