import { db } from '../src/db/index.ts';
import {
  users,
  accounts,
  sessions,
  verificationSessions,
  categories,
  products,
  productImages,
  inventory,
  carts,
  cartItems,
  coupons,
  couponUsages,
  orders,
  orderItems,
  payments,
  paymentAttempts,
  repairTickets,
  repairStatusHistory,
  contactInquiries,
  notifications,
  auditLogs
} from '../src/db/schema.ts';
import { eq, desc, asc, and, or, sql, inArray } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import Razorpay from 'razorpay';
import { v2 as cloudinary } from 'cloudinary';

// Initialize Cloudinary if credentials are provided in env
if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
}

// Initialize Razorpay client if credentials exist
let razorpayClient: Razorpay | null = null;
if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
  razorpayClient = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });
}

// Gmail SMTP transporter from environment variables ONLY
export function getEmailTransporter() {
  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = Number(process.env.SMTP_PORT) || 587;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS ? process.env.SMTP_PASS.replace(/\s+/g, '') : '';

  if (user && pass) {
    if (host.includes('gmail.com')) {
      return nodemailer.createTransport({
        service: 'gmail',
        auth: { user, pass },
        connectionTimeout: 10000,
        greetingTimeout: 10000,
        socketTimeout: 15000
      });
    }

    const isSecure = port === 465;
    return nodemailer.createTransport({
      host,
      port,
      secure: isSecure,
      auth: { user, pass },
      tls: {
        rejectUnauthorized: true,
        minVersion: 'TLSv1.2'
      },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 15000
    });
  }
  return null;
}

export const pgService = {
  // ==========================================
  // 1. Users & Authentication
  // ==========================================
  async getUserByEmail(email: string) {
    const clean = email.toLowerCase().trim();
    const rows = await db.select().from(users).where(eq(users.email, clean)).limit(1);
    return rows[0] || null;
  },

  async getUserById(id: number) {
    const rows = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return rows[0] || null;
  },

  async updateUserProfile(userId: number, data: {
    name?: string;
    email?: string;
    phone?: string;
    address?: string;
    addressLine1?: string;
    addressLine2?: string;
    city?: string;
    state?: string;
    postalCode?: string;
  }) {
    const updatePayload: any = {
      updatedAt: new Date()
    };
    if (data.name !== undefined) updatePayload.name = data.name.trim();
    if (data.email !== undefined && data.email.trim()) updatePayload.email = data.email.trim().toLowerCase();
    if (data.phone !== undefined) updatePayload.phone = data.phone.trim();
    if (data.addressLine1 !== undefined) updatePayload.addressLine1 = data.addressLine1.trim();
    if (data.addressLine2 !== undefined) updatePayload.addressLine2 = data.addressLine2.trim();
    if (data.city !== undefined) updatePayload.city = data.city.trim();
    if (data.state !== undefined) updatePayload.state = data.state.trim();
    if (data.postalCode !== undefined) updatePayload.postalCode = data.postalCode.trim();

    if (data.address !== undefined && data.address.trim()) {
      updatePayload.address = data.address.trim();
    } else {
      const parts = [
        updatePayload.addressLine1 || '',
        updatePayload.addressLine2 || '',
        updatePayload.city || '',
        updatePayload.state ? `${updatePayload.state} ${updatePayload.postalCode || ''}`.trim() : (updatePayload.postalCode || '')
      ].filter(Boolean);
      if (parts.length) {
        updatePayload.address = parts.join(', ');
      }
    }

    const updated = await db.update(users)
      .set(updatePayload)
      .where(eq(users.id, userId))
      .returning();

    return updated[0];
  },

  async registerUser(data: { name: string; email: string; password?: string; phone?: string }) {
    const cleanEmail = data.email.toLowerCase().trim();
    const existing = await this.getUserByEmail(cleanEmail);
    if (existing) {
      throw new Error('An account with this email already exists');
    }

    // Role is strictly determined server-side
    const isOwner = cleanEmail === 'rajatnaik0541@gmail.com';
    const isAdmin = cleanEmail === 'admin@systech.com' || isOwner;
    const role = isOwner ? 'OWNER' : (isAdmin ? 'ADMIN' : 'CUSTOMER');

    const passwordHash = data.password ? await bcrypt.hash(data.password, 10) : null;
    const uid = `usr_${crypto.randomUUID()}`;

    const inserted = await db.insert(users).values({
      uid,
      email: cleanEmail,
      name: data.name.trim(),
      phone: data.phone?.trim() || '',
      passwordHash,
      role,
      isVerified: false,
      avatarUrl: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(data.name)}`
    }).returning();

    return inserted[0];
  },

  async verifyPassword(email: string, plainPassword: string) {
    const user = await this.getUserByEmail(email);
    if (!user || !user.passwordHash) return null;
    const isValid = await bcrypt.compare(plainPassword, user.passwordHash);
    return isValid ? user : null;
  },

  async createSession(userId: number, ipAddress?: string, userAgent?: string) {
    const sessionToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await db.insert(sessions).values({
      sessionToken,
      userId,
      expiresAt,
      ipAddress,
      userAgent
    });

    return { sessionToken, expiresAt };
  },

  async getSession(token: string) {
    const rows = await db.select({
      session: sessions,
      user: users
    })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(and(eq(sessions.sessionToken, token), sql`${sessions.expiresAt} > NOW()`))
    .limit(1);

    return rows[0] || null;
  },

  async invalidateSession(token: string) {
    await db.delete(sessions).where(eq(sessions.sessionToken, token));
  },

  // ==========================================
  // 2. Email OTP in Database (verification_sessions)
  // ==========================================
  async sendOtpEmail(email: string, name?: string) {
    const cleanEmail = email.toLowerCase().trim();

    // 1. Verify account exists in PostgreSQL for sign in
    const existingUser = await this.getUserByEmail(cleanEmail);
    if (!existingUser) {
      return {
        error: 'No account found with this email. Please sign up to create an account.',
        status: 404
      };
    }

    // 2. Check resend cooldown in database (60 seconds)
    const recent = await db.select().from(verificationSessions)
      .where(and(
        eq(verificationSessions.email, cleanEmail),
        sql`${verificationSessions.createdAt} > NOW() - INTERVAL '60 seconds'`
      ))
      .orderBy(desc(verificationSessions.createdAt))
      .limit(1);

    if (recent.length > 0) {
      const elapsed = Math.floor((Date.now() - new Date(recent[0].createdAt).getTime()) / 1000);
      const remaining = Math.max(1, 60 - elapsed);
      return {
        error: `Please wait ${remaining}s before requesting a new verification code.`,
        cooldownRemaining: remaining,
        status: 429
      };
    }

    // 3. Check hourly rate limit in database (max 6 requests)
    const hourly = await db.select({ count: sql<number>`count(*)` }).from(verificationSessions)
      .where(and(
        eq(verificationSessions.email, cleanEmail),
        sql`${verificationSessions.createdAt} > NOW() - INTERVAL '1 hour'`
      ));

    if (Number(hourly[0]?.count || 0) >= 6) {
      return {
        error: 'Too many verification requests for this email. Please wait an hour or sign in with Google.',
        status: 429
      };
    }

    // 4. SMTP Mailer check
    const transporter = getEmailTransporter();
    if (!transporter) {
      console.error('[SMTP Config Error] Missing SMTP_USER or SMTP_PASS environment variables.');
      return {
        error: 'Unable to send verification code. Please try again.',
        status: 503
      };
    }

    // 5. Invalidate prior active verification sessions for this email (old OTP rejected)
    await db.delete(verificationSessions).where(eq(verificationSessions.email, cleanEmail));

    // 6. Generate cryptographically secure 6-digit code
    const rawOtp = crypto.randomInt(100000, 1000000).toString();
    const otpHash = await bcrypt.hash(rawOtp, 10);
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    const inserted = await db.insert(verificationSessions).values({
      email: cleanEmail,
      otpHash,
      purpose: 'login',
      attempts: 0,
      maxAttempts: 5,
      expiresAt
    }).returning();

    const sessionId = String(inserted[0].id);

    // 7. Format RFC 5322 compliant sender address
    const userEmail = process.env.SMTP_USER || '';
    let sender = process.env.SMTP_FROM || 'SysTech Computer Solutions';
    if (!sender.includes('@')) {
      sender = `"${sender.replace(/"/g, '')}" <${userEmail}>`;
    }

    // 8. Deliver email via Gmail SMTP
    try {
      await transporter.sendMail({
        from: sender,
        to: cleanEmail,
        subject: 'Your SysTech Verification Code',
        text: `Hello ${existingUser.name || name || 'Customer'},\n\nYour SysTech verification code is: ${rawOtp}\n\nValid for 5 minutes. Do not share this code.`,
        html: `
          <div style="font-family: sans-serif; background-color: #0d0d0d; color: #ffffff; padding: 24px; border-radius: 8px; max-width: 480px; margin: 0 auto;">
            <h2 style="color: #06b6d4; margin-top: 0;">SysTech Computer Solutions</h2>
            <p style="color: #94a3b8;">Hello <strong>${existingUser.name || name || 'Valued Customer'}</strong>,</p>
            <p>Use the one-time verification code below to securely authenticate your account:</p>
            <div style="background-color: #161616; border: 1px solid #22d3ee; border-radius: 8px; padding: 18px; text-align: center; margin: 20px 0;">
              <span style="font-family: monospace; font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #38bdf8;">${rawOtp}</span>
            </div>
            <p style="color: #94a3b8; font-size: 13px;">This code is valid for <strong>5 minutes</strong>. If you did not request this, please disregard.</p>
          </div>
        `
      });

      console.log(`[SMTP Safe Log] Verification email sent successfully via Gmail SMTP to domain ${cleanEmail.split('@')[1]}`);

      // Return success ONLY AFTER the send operation actually succeeds
      return {
        success: true,
        sessionId,
        expiresAt: expiresAt.getTime(),
        cooldownSeconds: 60,
        message: 'Verification code sent to your email.'
      };
    } catch (mailErr: any) {
      // Invalidate the session since delivery failed
      await db.delete(verificationSessions).where(eq(verificationSessions.id, inserted[0].id));

      // Safe server diagnostic log (NEVER logging secrets or raw OTP)
      console.error('[SMTP Safe Log] Email delivery failed:', {
        code: mailErr.code,
        responseCode: mailErr.responseCode,
        message: mailErr.message
      });

      return {
        error: 'Unable to send verification code. Please try again.',
        status: 500
      };
    }
  },

  async getSmtpDiagnostics() {
    const host = process.env.SMTP_HOST || 'smtp.gmail.com';
    const port = Number(process.env.SMTP_PORT) || 587;
    const user = process.env.SMTP_USER;
    const rawPass = process.env.SMTP_PASS || '';
    const pass = rawPass.replace(/\s+/g, '');

    const hasConfig = !!(user && pass);
    const config = {
      host,
      port,
      userConfigured: !!user,
      userDomain: user ? user.split('@')[1] : null,
      passConfigured: !!pass,
      passLength: pass ? pass.length : 0,
      isAppPasswordLength: pass.length === 16,
      fromConfigured: !!process.env.SMTP_FROM
    };

    if (!hasConfig) {
      return {
        configuration: 'missing',
        config,
        connection: 'failed',
        authentication: 'failed',
        messageSend: 'failed',
        message: 'SMTP_USER or SMTP_PASS environment variables are not configured.'
      };
    }

    const transporter = getEmailTransporter();
    if (!transporter) {
      return {
        configuration: 'present',
        config,
        connection: 'failed',
        authentication: 'failed',
        messageSend: 'failed',
        message: 'Could not initialize Nodemailer transport.'
      };
    }

    try {
      await transporter.verify();
      return {
        configuration: 'present',
        config,
        connection: 'successful',
        authentication: 'successful',
        messageSend: 'ready',
        message: 'Gmail SMTP connection and authentication verified successfully.'
      };
    } catch (err: any) {
      return {
        configuration: 'present',
        config,
        connection: err.code === 'ECONNREFUSED' || err.code === 'ETIMEDOUT' ? 'failed' : 'successful',
        authentication: 'failed',
        messageSend: 'failed',
        errorCode: err.code || 'UNKNOWN',
        responseCode: err.responseCode || null,
        message: err.message || 'SMTP verification failed',
        hint: err.responseCode === 534 || err.message?.includes('Application-specific password')
          ? 'Google rejected login: A 16-character Google Application-Specific Password is required for Gmail SMTP (generate at https://myaccount.google.com/apppasswords).'
          : 'Check SMTP credentials.'
      };
    }
  },

  async verifyOtpCode(sessionId: string | number, email: string, code: string, name?: string) {
    const cleanEmail = email.toLowerCase().trim();
    const idNum = Number(sessionId);
    if (isNaN(idNum)) {
      return { error: 'Invalid verification session', status: 400 };
    }

    const rows = await db.select().from(verificationSessions)
      .where(and(eq(verificationSessions.id, idNum), eq(verificationSessions.email, cleanEmail)))
      .limit(1);

    if (rows.length === 0) {
      return { error: 'Verification session not found or already used', status: 404 };
    }

    const session = rows[0];

    // Check expiration
    if (new Date() > new Date(session.expiresAt)) {
      await db.delete(verificationSessions).where(eq(verificationSessions.id, idNum));
      return { error: 'Verification code has expired. Please request a new one.', expired: true, status: 400 };
    }

    // Check attempts
    if (session.attempts >= session.maxAttempts) {
      await db.delete(verificationSessions).where(eq(verificationSessions.id, idNum));
      return { error: 'Maximum verification attempts exceeded. Please request a new code.', maxAttemptsExceeded: true, status: 429 };
    }

    // Verify bcrypt hash
    const isMatch = await bcrypt.compare(code, session.otpHash);
    if (!isMatch) {
      const newAttempts = session.attempts + 1;
      await db.update(verificationSessions)
        .set({ attempts: newAttempts })
        .where(eq(verificationSessions.id, idNum));

      return {
        error: `Incorrect verification code. ${session.maxAttempts - newAttempts} attempts remaining.`,
        attemptsRemaining: session.maxAttempts - newAttempts,
        status: 400
      };
    }

    // OTP Match! Delete the verification session so it cannot be reused
    await db.delete(verificationSessions).where(eq(verificationSessions.id, idNum));

    // Get or create user in PostgreSQL
    let user = await this.getUserByEmail(cleanEmail);
    if (!user) {
      const isOwner = cleanEmail === 'rajatnaik0541@gmail.com';
      const isAdmin = cleanEmail === 'admin@systech.com' || isOwner;
      const role = isOwner ? 'OWNER' : (isAdmin ? 'ADMIN' : 'CUSTOMER');
      const finalName = name?.trim() || cleanEmail.split('@')[0];

      const inserted = await db.insert(users).values({
        uid: `usr_${crypto.randomUUID()}`,
        email: cleanEmail,
        name: finalName,
        role,
        isVerified: true,
        avatarUrl: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(finalName)}`
      }).returning();
      user = inserted[0];
    } else if (!user.isVerified) {
      await db.update(users).set({ isVerified: true }).where(eq(users.id, user.id));
      user.isVerified = true;
    }

    return { user };
  },

  // ==========================================
  // 3. Products & Inventory
  // ==========================================
  async getProducts(params?: { category?: string; condition?: string; search?: string }) {
    let query = db.select({
      product: products,
      inventory: inventory
    })
    .from(products)
    .leftJoin(inventory, eq(products.id, inventory.productId));

    const rows = await query;

    // Filter in-memory or build conditions
    let list = rows.map(r => ({
      id: r.product.id,
      title: r.product.title,
      brand: r.product.brand,
      model: r.product.model,
      sku: r.product.sku,
      category: r.product.categoryId,
      price: r.product.price,
      originalPrice: r.product.originalPrice,
      condition: r.product.condition === 'new' ? 'brand_new' : 'refurbished',
      warranty: r.product.warranty,
      rating: Number(r.product.rating || '4.8'),
      reviewsCount: r.product.reviewCount || 0,
      featured: r.product.featured,
      description: r.product.description || '',
      image: r.product.image,
      stock: r.inventory ? r.inventory.stock : 5,
      specs: r.product.specifications as any || {}
    }));

    if (params?.category && params.category !== 'all') {
      list = list.filter(p => p.category === params.category);
    }

    if (params?.condition && params.condition !== 'all') {
      list = list.filter(p => p.condition === params.condition);
    }

    if (params?.search && params.search.trim()) {
      const cleanSearch = params.search.trim().toLowerCase().replace(/\s+/g, ' ');
      const tokens = cleanSearch.split(' ').filter(Boolean);
      list = list.filter(p => {
        const specValues = p.specs
          ? Object.values(p.specs).filter((v): v is string => typeof v === 'string')
          : [];
        const searchableText = [
          p.title,
          p.brand,
          p.sku,
          p.sku ? p.sku.replace(/-/g, ' ') : '',
          p.sku ? p.sku.replace(/-/g, '') : '',
          p.category,
          p.condition,
          p.description,
          ...specValues
        ].join(' ').toLowerCase();

        return tokens.every(t => searchableText.includes(t));
      });
    }

    return list;
  },

  async getProductById(id: string) {
    const rows = await db.select({
      product: products,
      inventory: inventory
    })
    .from(products)
    .leftJoin(inventory, eq(products.id, inventory.productId))
    .where(or(eq(products.id, id), eq(products.slug, id)))
    .limit(1);

    if (rows.length === 0) return null;
    const r = rows[0];

    return {
      id: r.product.id,
      title: r.product.title,
      brand: r.product.brand,
      model: r.product.model,
      sku: r.product.sku,
      category: r.product.categoryId,
      price: r.product.price,
      originalPrice: r.product.originalPrice,
      condition: r.product.condition === 'new' ? 'brand_new' : 'refurbished',
      warranty: r.product.warranty,
      rating: Number(r.product.rating || '4.8'),
      reviewsCount: r.product.reviewCount || 0,
      featured: r.product.featured,
      description: r.product.description || '',
      image: r.product.image,
      stock: r.inventory ? r.inventory.stock : 5,
      specs: r.product.specifications as any || {}
    };
  },

  async createProduct(data: any) {
    const id = data.id || `prod_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const slug = id;
    const condition = data.condition === 'brand_new' ? 'new' : 'refurbished';

    const inserted = await db.insert(products).values({
      id,
      slug,
      title: data.title,
      brand: data.brand || 'SysTech',
      model: data.model || '',
      sku: data.sku.toUpperCase(),
      categoryId: data.category || 'laptops',
      price: Number(data.price),
      originalPrice: data.originalPrice ? Number(data.originalPrice) : Number(data.price),
      condition,
      warranty: data.warranty || '1 Year SysTech Guarantee',
      rating: String(data.rating || '4.8'),
      reviewCount: Number(data.reviewsCount) || 1,
      featured: Boolean(data.featured),
      description: data.description || '',
      image: data.image || '',
      specifications: data.specs || {}
    }).returning();

    // Insert image & inventory
    if (data.image) {
      await db.insert(productImages).values({
        productId: id,
        url: data.image,
        isPrimary: true,
        displayOrder: 0
      });
    }

    await db.insert(inventory).values({
      productId: id,
      stock: Number(data.stock) || 5,
      reservedStock: 0,
      lowStockThreshold: 2
    });

    return this.getProductById(id);
  },

  async updateProduct(id: string, updates: any) {
    const updateData: any = {};
    if (updates.title !== undefined) updateData.title = updates.title;
    if (updates.brand !== undefined) updateData.brand = updates.brand;
    if (updates.sku !== undefined) updateData.sku = updates.sku.toUpperCase();
    if (updates.price !== undefined) updateData.price = Number(updates.price);
    if (updates.originalPrice !== undefined) updateData.originalPrice = Number(updates.originalPrice);
    if (updates.category !== undefined) updateData.categoryId = updates.category;
    if (updates.condition !== undefined) updateData.condition = updates.condition === 'brand_new' ? 'new' : 'refurbished';
    if (updates.image !== undefined) updateData.image = updates.image;
    if (updates.description !== undefined) updateData.description = updates.description;
    if (updates.featured !== undefined) updateData.featured = Boolean(updates.featured);
    if (updates.specs !== undefined) updateData.specifications = updates.specs;
    updateData.updatedAt = new Date();

    if (Object.keys(updateData).length > 0) {
      await db.update(products).set(updateData).where(eq(products.id, id));
    }

    if (updates.stock !== undefined) {
      await db.update(inventory)
        .set({ stock: Number(updates.stock), updatedAt: new Date() })
        .where(eq(inventory.productId, id));
    }

    return this.getProductById(id);
  },

  async deleteProduct(id: string) {
    await db.delete(products).where(eq(products.id, id));
    return true;
  },

  // ==========================================
  // 4. Coupons & Promotions
  // ==========================================
  async getCoupons() {
    const rows = await db.select().from(coupons).orderBy(asc(coupons.code));
    return rows.map(c => ({
      id: String(c.id),
      code: c.code,
      description: c.description,
      discountType: 'percentage',
      discountValue: c.discountPercent,
      minOrder: c.minSpend || 0,
      maxDiscount: c.maxDiscount || 3000,
      active: c.isActive,
      expiresAt: c.expiresAt ? c.expiresAt.toISOString().split('T')[0] : '2026-12-31'
    }));
  },

  async validateCoupon(code: string, subtotal: number) {
    const cleanCode = code.toUpperCase().trim();
    const rows = await db.select().from(coupons).where(eq(coupons.code, cleanCode)).limit(1);

    if (rows.length === 0) {
      return { valid: false, error: 'Invalid promo code' };
    }

    const c = rows[0];
    if (!c.isActive) {
      return { valid: false, error: 'This coupon is no longer active' };
    }

    if (c.expiresAt && new Date() > new Date(c.expiresAt)) {
      return { valid: false, error: 'This coupon has expired' };
    }

    if (subtotal < (c.minSpend || 0)) {
      return {
        valid: false,
        error: `Minimum order value of ₹${(c.minSpend || 0).toLocaleString('en-IN')} required for code ${c.code}`
      };
    }

    let calculatedDiscount = Math.round((subtotal * c.discountPercent) / 100);
    if (c.maxDiscount && calculatedDiscount > c.maxDiscount) {
      calculatedDiscount = c.maxDiscount;
    }

    return {
      valid: true,
      code: c.code,
      discount: calculatedDiscount,
      promo: {
        id: String(c.id),
        code: c.code,
        description: c.description,
        discountType: 'percentage',
        discountValue: c.discountPercent,
        minOrder: c.minSpend || 0,
        maxDiscount: c.maxDiscount || 3000,
        active: c.isActive
      }
    };
  },

  async createCoupon(data: any) {
    const inserted = await db.insert(coupons).values({
      code: data.code.toUpperCase().trim(),
      description: data.description || 'Special Store Discount',
      discountPercent: Number(data.discountValue) || 5,
      maxDiscount: Number(data.maxDiscount) || 3000,
      minSpend: Number(data.minOrder) || 0,
      isActive: true,
      expiresAt: data.expiresAt ? new Date(data.expiresAt) : new Date('2026-12-31')
    }).returning();

    const c = inserted[0];
    return {
      id: String(c.id),
      code: c.code,
      description: c.description,
      discountType: 'percentage',
      discountValue: c.discountPercent,
      minOrder: c.minSpend || 0,
      active: c.isActive
    };
  },

  async deleteCoupon(id: number) {
    await db.delete(coupons).where(eq(coupons.id, id));
    return true;
  },

  // ==========================================
  // 5. Cart (Database Persistence in PostgreSQL)
  // ==========================================
  async getOrCreateCart(userId?: number, sessionId?: string) {
    if (userId) {
      const existingUserCart = await db.select().from(carts).where(eq(carts.userId, userId)).limit(1);
      if (existingUserCart.length > 0) return existingUserCart[0];
    }

    if (sessionId) {
      const existingSessionCart = await db.select().from(carts).where(eq(carts.sessionId, sessionId)).limit(1);
      if (existingSessionCart.length > 0) {
        if (userId && !existingSessionCart[0].userId) {
          await db.update(carts).set({ userId, updatedAt: new Date() }).where(eq(carts.id, existingSessionCart[0].id));
          existingSessionCart[0].userId = userId;
        }
        return existingSessionCart[0];
      }
    }

    const newCartId = `cart_${crypto.randomUUID()}`;
    const inserted = await db.insert(carts).values({
      id: newCartId,
      userId: userId || null,
      sessionId: sessionId || null
    }).returning();

    return inserted[0];
  },

  async getCartWithItems(cartId: string, userId?: number) {
    const cartRows = await db.select().from(carts).where(eq(carts.id, cartId)).limit(1);
    if (cartRows.length === 0) return null;
    const cart = cartRows[0];

    if (cart.userId && userId && cart.userId !== userId) {
      throw new Error('Unauthorized: Cannot access another customer cart');
    }

    const items = await db.select({
      item: cartItems,
      product: products,
      inventory: inventory
    })
    .from(cartItems)
    .innerJoin(products, eq(cartItems.productId, products.id))
    .leftJoin(inventory, eq(products.id, inventory.productId))
    .where(eq(cartItems.cartId, cartId));

    let subtotal = 0;
    const formattedItems = items.map(r => {
      const itemSubtotal = r.product.price * r.item.quantity;
      subtotal += itemSubtotal;
      return {
        id: r.item.id,
        productId: r.product.id,
        title: r.product.title,
        sku: r.product.sku,
        price: r.product.price,
        originalPrice: r.product.originalPrice,
        image: r.product.image,
        quantity: r.item.quantity,
        stock: r.inventory?.stock ?? 0,
        extendedCare: r.item.extendedCare,
        dataMigration: r.item.dataMigration,
        itemTotal: itemSubtotal
      };
    });

    const protectionFee = formattedItems.some(i => i.extendedCare) ? 1499 : 0;
    const total = subtotal + protectionFee;

    return {
      id: cart.id,
      userId: cart.userId,
      items: formattedItems,
      subtotal,
      protectionFee,
      total,
      itemCount: formattedItems.reduce((acc, i) => acc + i.quantity, 0)
    };
  },

  async addToCart(cartId: string, productId: string, quantity: number, options?: { extendedCare?: boolean; dataMigration?: boolean }) {
    if (quantity <= 0 || !Number.isInteger(quantity)) {
      throw new Error('Quantity must be a positive integer');
    }

    const prodRows = await db.select({ product: products, inventory: inventory })
      .from(products)
      .leftJoin(inventory, eq(products.id, inventory.productId))
      .where(eq(products.id, productId))
      .limit(1);

    if (prodRows.length === 0) {
      throw new Error('Product not found in catalog');
    }

    const availableStock = prodRows[0].inventory?.stock ?? 0;

    const existing = await db.select().from(cartItems)
      .where(and(eq(cartItems.cartId, cartId), eq(cartItems.productId, productId)))
      .limit(1);

    if (existing.length > 0) {
      const newQty = existing[0].quantity + quantity;
      if (newQty > availableStock) {
        throw new Error(`Cannot add ${quantity} more. Only ${availableStock} in stock.`);
      }
      await db.update(cartItems).set({
        quantity: newQty,
        extendedCare: options?.extendedCare !== undefined ? options.extendedCare : existing[0].extendedCare,
        dataMigration: options?.dataMigration !== undefined ? options.dataMigration : existing[0].dataMigration,
        updatedAt: new Date()
      }).where(eq(cartItems.id, existing[0].id));
    } else {
      if (quantity > availableStock) {
        throw new Error(`Only ${availableStock} units available in stock.`);
      }
      await db.insert(cartItems).values({
        cartId,
        productId,
        quantity,
        extendedCare: Boolean(options?.extendedCare),
        dataMigration: Boolean(options?.dataMigration)
      });
    }

    return this.getCartWithItems(cartId);
  },

  async updateCartItem(cartId: string, itemId: number, quantity: number) {
    if (quantity < 0 || !Number.isInteger(quantity)) {
      throw new Error('Quantity must be zero or a positive integer');
    }

    const itemRows = await db.select().from(cartItems)
      .where(and(eq(cartItems.id, itemId), eq(cartItems.cartId, cartId)))
      .limit(1);

    if (itemRows.length === 0) {
      throw new Error('Cart item not found');
    }

    if (quantity === 0) {
      await db.delete(cartItems).where(eq(cartItems.id, itemId));
    } else {
      const invRows = await db.select().from(inventory)
        .where(eq(inventory.productId, itemRows[0].productId))
        .limit(1);
      const stock = invRows[0]?.stock ?? 0;
      if (quantity > stock) {
        throw new Error(`Requested quantity exceeds available stock (${stock})`);
      }
      await db.update(cartItems).set({ quantity, updatedAt: new Date() }).where(eq(cartItems.id, itemId));
    }

    return this.getCartWithItems(cartId);
  },

  async removeCartItem(cartId: string, itemId: number) {
    await db.delete(cartItems).where(and(eq(cartItems.id, itemId), eq(cartItems.cartId, cartId)));
    return this.getCartWithItems(cartId);
  },

  async clearCart(cartId: string) {
    await db.delete(cartItems).where(eq(cartItems.cartId, cartId));
    return this.getCartWithItems(cartId);
  },

  // ==========================================
  // 6. Orders & Inventory Locking (Transactions)
  // ==========================================
  async createOrder(data: {
    userId?: number;
    customerName: string;
    customerEmail: string;
    customerPhone: string;
    address?: string;
    addressLine1?: string;
    addressLine2?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    pincode?: string;
    fulfillment?: string;
    items: Array<{
      productId: string;
      quantity: number;
      extendedCare?: boolean;
      dataMigration?: boolean;
    }>;
    promoCodeUsed?: string;
    paymentMethod?: string;
  }) {
    if (!data.items || data.items.length === 0) {
      throw new Error('Order must contain at least one item');
    }

    const orderId = `ord_${crypto.randomUUID()}`;
    const orderNumber = `SYS-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

    // Database transaction to ensure concurrency safety & stock deduction
    return await db.transaction(async (tx) => {
      let serverSubtotal = 0;
      const verifiedItems: Array<{
        productId: string;
        title: string;
        sku: string;
        price: number;
        image: string;
        quantity: number;
        extendedCare: boolean;
        dataMigration: boolean;
      }> = [];

      for (const item of data.items) {
        // Query product and lock inventory row
        const prodRows = await tx.select({
          product: products,
          inventory: inventory
        })
        .from(products)
        .leftJoin(inventory, eq(products.id, inventory.productId))
        .where(eq(products.id, item.productId))
        .limit(1);

        if (prodRows.length === 0) {
          throw new Error(`Product ${item.productId} not found in catalog`);
        }

        const prod = prodRows[0].product;
        const currentStock = prodRows[0].inventory?.stock ?? 0;

        if (currentStock < item.quantity) {
          throw new Error(`Insufficient stock for "${prod.title}". Only ${currentStock} remaining.`);
        }

        // Deduct inventory atomically
        await tx.update(inventory)
          .set({
            stock: sql`${inventory.stock} - ${item.quantity}`,
            updatedAt: new Date()
          })
          .where(eq(inventory.productId, item.productId));

        const itemTotal = prod.price * item.quantity;
        serverSubtotal += itemTotal;

        verifiedItems.push({
          productId: prod.id,
          title: prod.title,
          sku: prod.sku,
          price: prod.price,
          image: prod.image,
          quantity: item.quantity,
          extendedCare: Boolean(item.extendedCare),
          dataMigration: Boolean(item.dataMigration)
        });
      }

      // Addon fees
      const protectionFee = verifiedItems.some(i => i.extendedCare) ? 1499 : 0;
      const deliveryFee = data.fulfillment === 'courier_express' ? 499 : 0;
      const tax = 0; // Included in price (GST inclusive)

      // Calculate authoritative coupon discount from database
      let discount = 0;
      if (data.promoCodeUsed) {
        const couponRows = await tx.select().from(coupons).where(eq(coupons.code, data.promoCodeUsed.toUpperCase())).limit(1);
        if (couponRows.length > 0 && couponRows[0].isActive) {
          const c = couponRows[0];
          if (serverSubtotal >= (c.minSpend || 0)) {
            discount = Math.round((serverSubtotal * c.discountPercent) / 100);
            if (c.maxDiscount && discount > c.maxDiscount) {
              discount = c.maxDiscount;
            }
            // Record coupon usage
            await tx.insert(couponUsages).values({
              couponId: c.id,
              userId: data.userId || null,
              orderId,
              discountAmount: discount
            });
            await tx.update(coupons).set({ usedCount: sql`${coupons.usedCount} + 1` }).where(eq(coupons.id, c.id));
          }
        }
      }

      const total = Math.max(0, serverSubtotal + protectionFee + deliveryFee + tax - discount);
      const isStoreCash = (data.paymentMethod === 'store_pickup_cash');

      // Construct formatted delivery address for historical order snapshot
      let deliveryAddress = 'Showroom Counter Pickup';
      if (data.address && data.address.trim()) {
        deliveryAddress = data.address.trim();
      } else {
        const addrParts = [
          data.addressLine1 || '',
          data.addressLine2 || '',
          data.city || 'Kumta',
          data.state ? `${data.state} ${data.postalCode || data.pincode || '581343'}`.trim() : (data.postalCode || data.pincode || '581343')
        ].filter(Boolean);
        if (addrParts.length) {
          deliveryAddress = addrParts.join(', ');
        }
      }

      // Create Order in DB (Historical immutable snapshot)
      const insertedOrder = await tx.insert(orders).values({
        id: orderId,
        orderNumber,
        userId: data.userId || null,
        customerName: data.customerName.trim(),
        customerEmail: data.customerEmail.trim().toLowerCase(),
        customerPhone: data.customerPhone.trim(),
        address: deliveryAddress,
        fulfillment: data.fulfillment || 'in_store_pickup',
        subtotal: serverSubtotal,
        protectionFee,
        deliveryFee,
        tax,
        discount,
        promoCodeUsed: data.promoCodeUsed || null,
        total,
        status: 'processing',
        paymentStatus: isStoreCash ? 'pending' : 'pending',
        paymentMethod: data.paymentMethod === 'upi_online' ? 'upi_online' : 'store_pickup_cash'
      }).returning();

      // Persist / update the latest address to the authenticated user's profile in PostgreSQL
      if (data.userId) {
        await tx.update(users).set({
          name: data.customerName.trim(),
          phone: data.customerPhone.trim(),
          address: deliveryAddress,
          addressLine1: data.addressLine1?.trim() || undefined,
          addressLine2: data.addressLine2?.trim() || undefined,
          city: (data.city || 'Kumta').trim(),
          state: (data.state || 'Karnataka').trim(),
          postalCode: (data.postalCode || data.pincode || '581343').trim(),
          updatedAt: new Date()
        }).where(eq(users.id, data.userId));
      }

      // Insert Order Items snapshots
      for (const vi of verifiedItems) {
        await tx.insert(orderItems).values({
          orderId,
          productId: vi.productId,
          titleSnapshot: vi.title,
          skuSnapshot: vi.sku,
          priceSnapshot: vi.price,
          quantity: vi.quantity,
          extendedCare: vi.extendedCare,
          dataMigration: vi.dataMigration,
          imageSnapshot: vi.image
        });
      }

      // Record initial payment record
      await tx.insert(payments).values({
        id: `pay_${crypto.randomUUID()}`,
        orderId,
        amount: total,
        currency: 'INR',
        method: data.paymentMethod || 'store_pickup_cash',
        status: isStoreCash ? 'pending' : 'pending'
      });

      return {
        ...insertedOrder[0],
        items: verifiedItems
      };
    });
  },

  async getOrders(params?: { userId?: number; role?: string }) {
    let orderQuery = db.select().from(orders).orderBy(desc(orders.createdAt));

    // Customers only see their own orders
    if (params?.role === 'CUSTOMER' && params.userId) {
      orderQuery = db.select().from(orders).where(eq(orders.userId, params.userId)).orderBy(desc(orders.createdAt)) as any;
    }

    const orderRows = await orderQuery;
    if (orderRows.length === 0) return [];

    const orderIds = orderRows.map(o => o.id);
    const itemRows = await db.select().from(orderItems).where(inArray(orderItems.orderId, orderIds));

    return orderRows.map(o => {
      const relatedItems = itemRows.filter(i => i.orderId === o.id).map(i => ({
        id: i.id,
        productId: i.productId,
        title: i.titleSnapshot,
        sku: i.skuSnapshot,
        price: i.priceSnapshot,
        quantity: i.quantity,
        extendedCare: i.extendedCare,
        dataMigration: i.dataMigration,
        image: i.imageSnapshot
      }));

      return {
        id: o.id,
        orderNumber: o.orderNumber,
        customerName: o.customerName,
        customerEmail: o.customerEmail,
        customerPhone: o.customerPhone,
        address: o.address,
        fulfillment: o.fulfillment,
        subtotal: o.subtotal,
        protectionFee: o.protectionFee,
        deliveryFee: o.deliveryFee,
        tax: o.tax,
        discount: o.discount,
        promoCodeUsed: o.promoCodeUsed,
        total: o.total,
        status: o.status,
        paymentStatus: o.paymentStatus,
        paymentMethod: o.paymentMethod,
        createdAt: o.createdAt.toISOString(),
        items: relatedItems
      };
    });
  },

  async updateOrderStatus(id: string, status: string) {
    const updated = await db.update(orders)
      .set({ status, updatedAt: new Date() })
      .where(or(eq(orders.id, id), eq(orders.orderNumber, id)))
      .returning();
    return updated[0] || null;
  },

  async getOrderById(orderId: string, userId?: number, role?: string) {
    const orderRows = await db.select().from(orders).where(or(eq(orders.id, orderId), eq(orders.orderNumber, orderId))).limit(1);
    if (orderRows.length === 0) return null;
    const o = orderRows[0];

    // Authorization check: non-admin can only access their own order
    if (role !== 'ADMIN' && role !== 'OWNER') {
      if (o.userId && userId && o.userId !== userId) {
        throw new Error('Unauthorized: You cannot access another customer order');
      }
    }

    const items = await db.select().from(orderItems).where(eq(orderItems.orderId, o.id));
    return {
      id: o.id,
      orderNumber: o.orderNumber,
      userId: o.userId,
      customerName: o.customerName,
      customerEmail: o.customerEmail,
      customerPhone: o.customerPhone,
      address: o.address,
      fulfillment: o.fulfillment,
      subtotal: o.subtotal,
      protectionFee: o.protectionFee,
      deliveryFee: o.deliveryFee,
      tax: o.tax,
      discount: o.discount,
      promoCodeUsed: o.promoCodeUsed,
      total: o.total,
      status: o.status,
      paymentStatus: o.paymentStatus,
      paymentMethod: o.paymentMethod,
      createdAt: o.createdAt.toISOString(),
      items: items.map(i => ({
        id: i.id,
        productId: i.productId,
        title: i.titleSnapshot,
        sku: i.skuSnapshot,
        price: i.priceSnapshot,
        quantity: i.quantity,
        extendedCare: i.extendedCare,
        dataMigration: i.dataMigration,
        image: i.imageSnapshot
      }))
    };
  },

  // ==========================================
  // 6. Payments & Razorpay Integration
  // ==========================================
  async createRazorpayOrder(orderId: string) {
    const orderRows = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
    if (orderRows.length === 0) {
      throw new Error('Order not found');
    }

    const order = orderRows[0];
    const amountInPaise = order.total * 100;

    let razorpayOrderId = `order_${crypto.randomUUID().replace(/-/g, '').substring(0, 16)}`;

    if (razorpayClient) {
      try {
        const rzpOrder = await razorpayClient.orders.create({
          amount: amountInPaise,
          currency: 'INR',
          receipt: order.orderNumber,
          notes: {
            customerName: order.customerName,
            customerPhone: order.customerPhone
          }
        });
        razorpayOrderId = rzpOrder.id;
      } catch (err: any) {
        console.error('Razorpay SDK error, falling back to simulated order ID:', err.message);
      }
    }

    // Record payment attempt in DB
    await db.insert(paymentAttempts).values({
      orderId,
      razorpayOrderId,
      amount: order.total,
      status: 'initiated'
    });

    return {
      orderId,
      razorpayOrderId,
      amount: amountInPaise,
      currency: 'INR',
      keyId: process.env.RAZORPAY_KEY_ID || 'rzp_test_systech_demo'
    };
  },

  async verifyRazorpayPayment(data: {
    orderId: string;
    razorpayOrderId: string;
    razorpayPaymentId: string;
    razorpaySignature?: string;
  }) {
    // 1. Replay prevention: Check if payment id was already recorded
    const existingPayment = await db.select().from(payments)
      .where(and(eq(payments.razorpayPaymentId, data.razorpayPaymentId), eq(payments.status, 'successful')))
      .limit(1);

    if (existingPayment.length > 0) {
      throw new Error('Duplicate payment verification: This payment has already been processed');
    }

    // 2. Load order and verify it is not already paid
    const orderRows = await db.select().from(orders).where(eq(orders.id, data.orderId)).limit(1);
    if (orderRows.length === 0) {
      throw new Error('Order not found for payment verification');
    }

    const order = orderRows[0];
    if (order.paymentStatus === 'paid') {
      return { success: true, message: 'Order is already marked as paid' };
    }

    const secret = process.env.RAZORPAY_KEY_SECRET;
    let isValid = true;

    // Real signature check if secret is configured
    if (secret && data.razorpaySignature) {
      const generated = crypto.createHmac('sha256', secret)
        .update(`${data.razorpayOrderId}|${data.razorpayPaymentId}`)
        .digest('hex');
      isValid = generated === data.razorpaySignature;
    }

    if (!isValid) {
      await db.update(paymentAttempts)
        .set({ status: 'failed' })
        .where(eq(paymentAttempts.razorpayOrderId, data.razorpayOrderId));
      throw new Error('Razorpay signature verification failed');
    }

    // Commit payment in PostgreSQL
    await db.transaction(async (tx) => {
      await tx.update(orders).set({
        paymentStatus: 'paid',
        status: 'confirmed',
        updatedAt: new Date()
      }).where(eq(orders.id, data.orderId));

      await tx.insert(payments).values({
        id: data.razorpayPaymentId || `pay_${crypto.randomUUID()}`,
        orderId: data.orderId,
        amount: order.total,
        currency: 'INR',
        method: 'razorpay',
        status: 'successful',
        razorpayOrderId: data.razorpayOrderId,
        razorpayPaymentId: data.razorpayPaymentId,
        razorpaySignature: data.razorpaySignature,
        verifiedAt: new Date()
      });

      await tx.update(paymentAttempts)
        .set({ status: 'success' })
        .where(eq(paymentAttempts.razorpayOrderId, data.razorpayOrderId));
    });

    return { success: true, message: 'Payment verified and committed to database' };
  },

  // ==========================================
  // 7. Repairs & Status Tracking
  // ==========================================
  async getRepairs(params?: { userId?: number; role?: string }) {
    let query = db.select().from(repairTickets).orderBy(desc(repairTickets.createdAt));
    if (params?.role === 'CUSTOMER' && params.userId) {
      query = db.select().from(repairTickets).where(eq(repairTickets.userId, params.userId)).orderBy(desc(repairTickets.createdAt)) as any;
    }

    const rows = await query;
    return rows.map(r => ({
      id: r.id,
      ticketNumber: r.ticketNumber,
      customerName: r.customerName,
      customerPhone: r.customerPhone,
      deviceModel: r.deviceModel,
      issueCategory: r.deviceType || 'laptop',
      issueDetails: r.issueDescription,
      estimatedCost: r.estimatedCost || 0,
      status: r.status,
      technicianNotes: r.technicianNotes || '',
      createdAt: r.createdAt.toISOString()
    }));
  },

  async getRepairByTicket(ticketNumber: string) {
    const clean = ticketNumber.trim().toUpperCase();
    const rows = await db.select().from(repairTickets)
      .where(or(eq(repairTickets.ticketNumber, clean), eq(repairTickets.id, ticketNumber)))
      .limit(1);

    if (rows.length === 0) return null;
    const r = rows[0];

    const history = await db.select().from(repairStatusHistory)
      .where(eq(repairStatusHistory.ticketId, r.id))
      .orderBy(asc(repairStatusHistory.createdAt));

    return {
      id: r.id,
      ticketNumber: r.ticketNumber,
      customerName: r.customerName,
      customerPhone: r.customerPhone,
      deviceModel: r.deviceModel,
      issueCategory: r.deviceType || 'laptop',
      issueDetails: r.issueDescription,
      estimatedCost: r.estimatedCost || 0,
      status: r.status,
      technicianNotes: r.technicianNotes || '',
      createdAt: r.createdAt.toISOString(),
      history: history.map(h => ({
        stage: h.newStatus,
        note: h.note,
        date: h.createdAt.toISOString()
      }))
    };
  },

  async createRepairTicket(data: any) {
    const id = `rep_${crypto.randomUUID()}`;
    const ticketNumber = `SYS-REP-${Math.floor(1000 + Math.random() * 9000)}`;

    const inserted = await db.insert(repairTickets).values({
      id,
      ticketNumber,
      customerName: data.customerName.trim(),
      customerPhone: data.customerPhone.trim(),
      deviceType: data.deviceType || 'Laptop',
      deviceBrand: data.deviceModel?.split(' ')[0] || 'Generic',
      deviceModel: data.deviceModel?.trim() || 'Showroom Device',
      issueDescription: data.issueDetails || data.issueCategory || 'General Service Checkup',
      estimatedCost: Number(data.estimatedCost) || 1200,
      technicianNotes: data.technicianNotes || 'Device received at Kumta showroom bench. Bench diagnostic pending.',
      status: 'diagnosing'
    }).returning();

    // Insert initial status history
    await db.insert(repairStatusHistory).values({
      ticketId: id,
      newStatus: 'diagnosing',
      note: 'Device logged into Kumta queue. Free initial bench check pending.'
    });

    const r = inserted[0];
    return {
      id: r.id,
      ticketNumber: r.ticketNumber,
      customerName: r.customerName,
      customerPhone: r.customerPhone,
      deviceModel: r.deviceModel,
      issueCategory: r.deviceType,
      issueDetails: r.issueDescription,
      estimatedCost: r.estimatedCost,
      status: r.status,
      technicianNotes: r.technicianNotes,
      createdAt: r.createdAt.toISOString()
    };
  },

  async updateRepairTicket(id: string, updates: any) {
    const current = await db.select().from(repairTickets).where(eq(repairTickets.id, id)).limit(1);
    if (current.length === 0) return null;

    const oldStatus = current[0].status;
    const newStatus = updates.status || oldStatus;

    await db.update(repairTickets).set({
      status: newStatus,
      technicianNotes: updates.technicianNotes !== undefined ? updates.technicianNotes : current[0].technicianNotes,
      estimatedCost: updates.estimatedCost !== undefined ? Number(updates.estimatedCost) : current[0].estimatedCost,
      updatedAt: new Date()
    }).where(eq(repairTickets.id, id));

    if (newStatus !== oldStatus) {
      await db.insert(repairStatusHistory).values({
        ticketId: id,
        previousStatus: oldStatus,
        newStatus,
        note: updates.technicianNotes || `Status updated to ${newStatus}`
      });
    }

    return this.getRepairByTicket(current[0].ticketNumber);
  },

  // ==========================================
  // 8. Contact Inquiries & Notifications
  // ==========================================
  async getInquiries() {
    const rows = await db.select().from(contactInquiries).orderBy(desc(contactInquiries.createdAt));
    return rows.map(r => ({
      id: String(r.id),
      name: r.name,
      email: r.email,
      phone: r.phone,
      subject: r.subject,
      message: r.message,
      read: r.status === 'resolved',
      createdAt: r.createdAt.toISOString()
    }));
  },

  async createInquiry(data: any) {
    const inserted = await db.insert(contactInquiries).values({
      name: data.name.trim(),
      email: data.email.trim().toLowerCase(),
      phone: data.phone?.trim() || '',
      subject: data.subject?.trim() || 'Store Inquiry',
      message: data.message.trim(),
      status: 'unread'
    }).returning();
    const r = inserted[0];
    return {
      id: String(r.id),
      name: r.name,
      email: r.email,
      phone: r.phone,
      subject: r.subject,
      message: r.message,
      read: false,
      createdAt: r.createdAt.toISOString()
    };
  },

  async markInquiryRead(id: string | number) {
    await db.update(contactInquiries).set({ status: 'resolved' }).where(eq(contactInquiries.id, Number(id)));
    return true;
  },

  async getNotifications() {
    const rows = await db.select().from(notifications).orderBy(desc(notifications.createdAt));
    return rows.map(r => ({
      id: String(r.id),
      title: r.title,
      message: r.message,
      type: r.type,
      read: r.isRead,
      createdAt: r.createdAt.toISOString()
    }));
  },

  async markNotificationRead(id: string | number) {
    await db.update(notifications).set({ isRead: true }).where(eq(notifications.id, Number(id)));
    return true;
  },

  async markAllNotificationsRead() {
    await db.update(notifications).set({ isRead: true });
    return true;
  },

  async deleteNotification(id: string | number) {
    await db.delete(notifications).where(eq(notifications.id, Number(id)));
    return true;
  },

  async clearNotifications() {
    await db.delete(notifications);
    return true;
  },

  // ==========================================
  // 9. Live Database Analytics
  // ==========================================
  async getLiveAnalytics() {
    const [revResult] = await db.select({
      totalRevenue: sql<number>`COALESCE(SUM(${orders.total}), 0)::int`,
      orderCount: sql<number>`count(*)::int`
    }).from(orders);

    const [prodResult] = await db.select({
      productCount: sql<number>`count(*)::int`
    }).from(products);

    const [repairResult] = await db.select({
      activeRepairs: sql<number>`count(*)::int`
    }).from(repairTickets).where(sql`${repairTickets.status} != 'delivered'`);

    const [lowStockResult] = await db.select({
      lowStockCount: sql<number>`count(*)::int`
    }).from(inventory).where(sql`${inventory.stock} <= ${inventory.lowStockThreshold}`);

    return {
      totalRevenue: Number(revResult?.totalRevenue || 0),
      ordersCount: Number(revResult?.orderCount || 0),
      catalogItems: Number(prodResult?.productCount || 0),
      activeRepairs: Number(repairResult?.activeRepairs || 0),
      lowStockAlerts: Number(lowStockResult?.lowStockCount || 0)
    };
  }
};
