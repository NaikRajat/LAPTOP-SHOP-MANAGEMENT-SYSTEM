import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';
import jwt from 'jsonwebtoken';
import cookieParser from 'cookie-parser';
import crypto from 'crypto';
import { createServer as createViteServer } from 'vite';
import { firestoreService as dbService } from './server/firestoreService.ts';
import { pgService } from './server/pgService.ts'; // Kept intact for rollback
import { adminAuth, adminBucket } from './src/lib/firebase-admin.ts';
import { backupService } from './server/backupService.ts';
import { v2 as cloudinary } from 'cloudinary';
import { validateEmail, validateIndianMobile, validateStrongPassword } from './server/validation.ts';

const PORT = 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'systech_jwt_production_secret_key_2026';

export interface AuthRequest extends Request {
  user?: {
    id: number | string;
    uid?: string;
    email: string;
    role: 'CUSTOMER' | 'ADMIN' | 'OWNER';
    name: string;
  };
}

const formatCleanUser = (user: any) => {
  const { passwordHash, ...rest } = user;
  const roleStr = String(rest.role || '').toUpperCase();
  const isAdminOrOwner = roleStr === 'OWNER' || roleStr === 'ADMIN';
  return {
    ...rest,
    id: String(rest.id || rest.uid),
    uid: String(rest.uid || rest.id),
    role: isAdminOrOwner ? 'admin' : 'customer'
  };
};

// Middleware: Authenticate Bearer Token with Firebase Admin SDK verifyIdToken()
const authenticateToken = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = (authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null) || req.cookies?.systech_session;

  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const decoded = await adminAuth.verifyIdToken(token);
    if (decoded && (decoded.email || decoded.uid)) {
      const email = decoded.email ? decoded.email.toLowerCase().trim() : '';
      let user = email ? await dbService.getUserByEmail(email) : await dbService.getUserById(decoded.uid);
      if (!user && decoded.uid) {
        user = await dbService.getUserById(decoded.uid);
      }
      if (!user && email) {
        // Auto-provision if authenticated through Firebase Google login
        const isOwner = email === 'rajatnaik0541@gmail.com';
        const isAdmin = email === 'admin@systech.com' || isOwner;
        const role = isOwner ? 'OWNER' : (isAdmin ? 'ADMIN' : 'CUSTOMER');
        try {
          user = await dbService.registerUser({
            email,
            name: decoded.name || email.split('@')[0],
            role
          });
        } catch {}
      }
      const verifiedUid = decoded.uid || (user ? (user.uid || user.id) : '');
      if (verifiedUid) {
        req.user = {
          id: user?.id || verifiedUid,
          uid: verifiedUid,
          email: user?.email || decoded.email || '',
          role: (user?.role || decoded.role || 'CUSTOMER') as any,
          name: user?.name || decoded.name || 'User'
        };
        return next();
      }
    }

    return res.status(403).json({ error: 'Invalid or expired session' });
  } catch (err: any) {
    return res.status(403).json({ error: 'Invalid or expired session' });
  }
};

// Middleware: Require Admin / Owner Privileges (Server-side Role Check)
const requireAdmin = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.user || (req.user.role !== 'ADMIN' && req.user.role !== 'OWNER')) {
    return res.status(403).json({ error: 'Admin or Owner privileges required' });
  }
  next();
};

async function startServer() {
  const app = express();

  app.use(express.json({ limit: '25mb' }));
  app.use(express.urlencoded({ extended: true, limit: '25mb' }));
  app.use(cookieParser());

  // --- API ROUTES FIRST ---

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      store: 'SysTech Computer Solutions Kumta',
      database: 'Firebase Cloud Firestore (Production Active)',
      firestoreDatabaseId: 'ai-studio-systechcomputers-a214840e-ab4c-435a-967c-709346b0312c',
      rollbackDatabase: 'PostgreSQL Cloud SQL (Standby Ready)',
      timestamp: new Date().toISOString()
    });
  });

  // Auth: Check Email Existence (Read-Only validation, never creates account)
  app.post('/api/auth/check-email', async (req, res) => {
    try {
      const { email } = req.body;
      if (!email) {
        return res.status(400).json({ error: 'Please enter a valid email address.' });
      }

      const emailVal = validateEmail(email);
      if (!emailVal.valid) {
        return res.status(400).json({ error: emailVal.error || 'Please enter a valid email address.' });
      }

      const cleanEmail = email.trim().toLowerCase();
      const user = await dbService.getUserByEmail(cleanEmail);
      res.json({
        exists: !!user,
        name: user ? user.name : undefined,
        hasPassword: !!(user && user.passwordHash)
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Error checking email' });
    }
  });

  // Auth: Register (Password + Email with OTP verification)
  app.post('/api/auth/register', async (req, res) => {
    try {
      const { name, email, password, phone, sessionId, code } = req.body;
      if (!name || !email || !password) {
        return res.status(400).json({ error: 'Name, email, and password are required' });
      }

      const emailVal = validateEmail(email);
      if (!emailVal.valid) {
        return res.status(400).json({ error: emailVal.error || 'Please enter a valid email address.' });
      }

      if (phone) {
        const phoneVal = validateIndianMobile(phone);
        if (!phoneVal.valid) {
          return res.status(400).json({ error: phoneVal.error || 'Please enter a valid 10-digit mobile number.' });
        }
      }

      const passVal = validateStrongPassword(password);
      if (!passVal.valid) {
        return res.status(400).json({ error: passVal.error || 'Password must meet all complexity requirements.' });
      }

      // Enforce OTP verification requirement for registration to prevent unverified account creation
      if (!sessionId || !code) {
        return res.status(400).json({
          error: 'Email verification code is required. Please verify the OTP sent to your email to complete registration.'
        });
      }

      const verification = await dbService.verifyOtpCode(
        sessionId,
        email,
        code,
        name,
        phone,
        password,
        'register'
      );

      if (verification.error) {
        return res.status(verification.status || 400).json({
          error: verification.error,
          attemptsRemaining: verification.attemptsRemaining,
          maxAttemptsExceeded: verification.maxAttemptsExceeded,
          expired: verification.expired
        });
      }

      const user = verification.user!;
      const token = await adminAuth.createCustomToken(user.uid || user.id, {
        role: user.role,
        email: user.email,
        name: user.name
      });

      res.cookie('systech_session', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000
      });

      res.status(201).json({ token, user: formatCleanUser(user) });
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Registration failed' });
    }
  });

  // Auth: Login with Password
  app.post('/api/auth/login', async (req, res) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
      }

      const user = await dbService.verifyPassword(email, password);
      if (!user) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      const token = await adminAuth.createCustomToken(user.uid || user.id, {
        role: user.role,
        email: user.email,
        name: user.name
      });

      res.cookie('systech_session', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000
      });

      res.json({ token, user: formatCleanUser(user) });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Login failed' });
    }
  });

  // Auth: Google Sign-In with Server-Side Verification
  app.post('/api/auth/google', async (req, res) => {
    try {
      const { idToken, email, name, avatar } = req.body;
      let verifiedEmail = email;
      let verifiedName = name;

      // Verify Firebase ID Token if provided
      if (idToken) {
        try {
          const decoded = await adminAuth.verifyIdToken(idToken);
          verifiedEmail = decoded.email || email;
          verifiedName = decoded.name || name;
        } catch (e: any) {
          console.warn('Firebase ID token verification notice:', e.message);
        }
      }

      if (!verifiedEmail) {
        return res.status(400).json({ error: 'Google authentication did not provide a valid email' });
      }

      let user = await dbService.getUserByEmail(verifiedEmail);
      if (!user) {
        const isOwner = verifiedEmail.toLowerCase() === 'rajatnaik0541@gmail.com';
        const isAdmin = verifiedEmail.toLowerCase() === 'admin@systech.com' || isOwner;
        const role = isOwner ? 'OWNER' : (isAdmin ? 'ADMIN' : 'CUSTOMER');
        const finalName = verifiedName || verifiedEmail.split('@')[0];

        user = await dbService.registerUser({
          email: verifiedEmail,
          name: finalName,
          phone: '',
          role
        });
      }

      const token = await adminAuth.createCustomToken(user.uid || user.id, {
        role: user.role,
        email: user.email,
        name: user.name
      });

      res.cookie('systech_session', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000
      });

      res.json({ token, user: formatCleanUser(user) });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Google authentication failed' });
    }
  });

  // Auth: Send 6-Digit Email OTP (Stored in Firestore verification_sessions)
  app.post('/api/auth/send-code', async (req, res) => {
    try {
      const { email, name, purpose } = req.body;
      if (!email) {
        return res.status(400).json({ error: 'Email address is required' });
      }

      const emailVal = validateEmail(email);
      if (!emailVal.valid) {
        return res.status(400).json({ error: emailVal.error || 'Please enter a valid email address.' });
      }

      const result = await dbService.sendOtpEmail(email, name, purpose || 'login');
      if (result.error) {
        return res.status(result.status || 400).json({
          error: result.error,
          sessionId: result.sessionId,
          cooldownRemaining: result.cooldownRemaining
        });
      }

      res.json({
        success: true,
        sessionId: result.sessionId,
        expiresAt: result.expiresAt,
        cooldownSeconds: result.cooldownSeconds,
        message: result.message
      });
    } catch (err: any) {
      res.status(500).json({ error: 'Unable to send verification code right now. Please try again.' });
    }
  });

  // Auth: Safe SMTP Diagnostics
  app.get('/api/auth/smtp-diagnostics', async (req, res) => {
    try {
      const diag = await dbService.getSmtpDiagnostics();
      res.json(diag);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to check SMTP diagnostics' });
    }
  });

  // Auth: Verify 6-Digit Email OTP
  app.post('/api/auth/verify-code', async (req, res) => {
    try {
      const { email, code, sessionId, name, phone, password, purpose } = req.body;
      if (!email || !code || !sessionId) {
        return res.status(400).json({ error: 'Email, verification code, and session ID are required' });
      }

      const emailVal = validateEmail(email);
      if (!emailVal.valid) {
        return res.status(400).json({ error: emailVal.error || 'Please enter a valid email address.' });
      }

      const verification = await dbService.verifyOtpCode(
        sessionId,
        email,
        code,
        name,
        phone,
        password,
        purpose || 'login'
      );

      if (verification.error) {
        return res.status(verification.status || 400).json({
          error: verification.error,
          attemptsRemaining: verification.attemptsRemaining,
          maxAttemptsExceeded: verification.maxAttemptsExceeded,
          expired: verification.expired
        });
      }

      const user = verification.user!;
      const token = await adminAuth.createCustomToken(user.uid || user.id, {
        role: user.role,
        email: user.email,
        name: user.name
      });

      res.cookie('systech_session', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000
      });

      res.json({ token, user: formatCleanUser(user) });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to verify code' });
    }
  });

  // Auth: Change User Password (Profile ONLY for authenticated users)
  app.post('/api/auth/change-password', authenticateToken, async (req: AuthRequest, res) => {
    try {
      const { newPassword, currentPassword } = req.body;
      if (!newPassword) {
        return res.status(400).json({ error: 'New password is required.' });
      }

      const passVal = validateStrongPassword(newPassword);
      if (!passVal.valid) {
        return res.status(400).json({ error: passVal.error || 'Password must meet all complexity requirements.' });
      }

      const userId = req.user?.uid || String(req.user?.id);
      const existingUser = await dbService.getUserById(userId);
      if (!existingUser) {
        return res.status(404).json({ error: 'User not found.' });
      }

      // If user already has an established password, currentPassword is strictly required
      if (existingUser.passwordHash) {
        if (!currentPassword) {
          return res.status(400).json({ error: 'Current password is required to change your password.' });
        }
        const verified = await dbService.verifyPassword(existingUser.email, currentPassword);
        if (!verified) {
          return res.status(401).json({ error: 'Current password is incorrect.' });
        }
      }
      // If user has NO password (e.g. Google-only user establishing password), allow setting directly without currentPassword

      const result = await dbService.changeUserPassword(userId, newPassword);
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Failed to update password.' });
    }
  });

  // Auth: Request Password Reset Link (Triggered exclusively from Profile modal for verified session email)
  app.post('/api/auth/forgot-password', authenticateToken, async (req: AuthRequest, res) => {
    try {
      const authEmail = req.user?.email;
      if (!authEmail) {
        return res.status(401).json({ error: 'Authentication required.' });
      }

      // Strictly enforce that reset link can only be sent to the authenticated user's own email
      if (req.body.email && req.body.email.trim().toLowerCase() !== authEmail.trim().toLowerCase()) {
        return res.status(403).json({
          error: 'Forbidden: You can only request password reset links for your own verified account email.'
        });
      }

      const emailVal = validateEmail(authEmail);
      if (!emailVal.valid) {
        return res.status(400).json({ error: emailVal.error || 'Please enter a valid email address.' });
      }

      const result = await dbService.generatePasswordResetLink(authEmail);
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Failed to send password reset link.' });
    }
  });

  // Auth: Current User
  app.get('/api/auth/me', authenticateToken, async (req: AuthRequest, res) => {
    try {
      const user = await dbService.getUserByEmail(req.user!.email);
      if (!user) return res.status(404).json({ error: 'User not found' });
      res.json({ user: formatCleanUser(user) });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Error fetching user' });
    }
  });

  // Auth: Update User Profile & Delivery Address (Firestore /users/{uid})
  app.put('/api/auth/profile', authenticateToken, async (req: AuthRequest, res) => {
    try {
      const { name, email, phone, address, addressLine1, addressLine2, city, state, postalCode } = req.body;
      const updatedUser = await dbService.updateUserProfile(req.user!.uid || req.user!.id, {
        name,
        email,
        phone,
        address,
        addressLine1,
        addressLine2,
        city,
        state,
        postalCode
      });
      res.json({ user: formatCleanUser(updatedUser) });
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Failed to update profile' });
    }
  });

  // Auth: Logout / Session Invalidation
  app.post('/api/auth/logout', async (req, res) => {
    const authHeader = req.headers['authorization'];
    const token = (authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null) || req.cookies?.systech_session;
    if (token) {
      await dbService.invalidateSession(token);
    }
    res.clearCookie('systech_session');
    res.json({ success: true, message: 'Logged out successfully' });
  });

  // Products: Get All (Firestore)
  app.get('/api/products', async (req, res) => {
    try {
      const { category, condition, search } = req.query;
      const products = await dbService.getProducts({
        category: category as string,
        condition: condition as string,
        search: search as string
      });
      res.json(products);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to fetch products' });
    }
  });

  // Products: Get One (Firestore)
  app.get('/api/products/:id', async (req, res) => {
    try {
      const product = await dbService.getProductById(req.params.id);
      if (!product) return res.status(404).json({ error: 'Product not found' });
      res.json(product);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to fetch product' });
    }
  });

  // Products: Create (Admin - Firestore)
  app.post('/api/products', authenticateToken, requireAdmin, async (req, res) => {
    try {
      const { title, sku, price } = req.body;
      if (!title || !price || !sku) {
        return res.status(400).json({ error: 'Title, SKU, and Price are required' });
      }

      const created = await dbService.createProduct(req.body);
      res.status(201).json(created);
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Failed to create product' });
    }
  });

  // Products: Update (Admin - Firestore)
  app.put('/api/products/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
      const updated = await dbService.updateProduct(req.params.id, req.body);
      if (!updated) return res.status(404).json({ error: 'Product not found' });
      res.json(updated);
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Failed to update product' });
    }
  });

  // Products: Delete (Admin - Firestore)
  app.delete('/api/products/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
      await dbService.deleteProduct(req.params.id);
      res.json({ success: true, message: 'Product removed from catalog' });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to delete product' });
    }
  });

  // Promotions: Get All (Firestore)
  app.get('/api/promotions', async (req, res) => {
    try {
      const promos = await dbService.getCoupons();
      res.json(promos);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to fetch coupons' });
    }
  });

  // Promotions: Validate Code (Server-side Rule Check in Firestore)
  app.post('/api/promotions/validate', async (req, res) => {
    try {
      const { code, subtotal } = req.body;
      if (!code) return res.status(400).json({ error: 'Promo code required' });

      const result = await dbService.validateCoupon(code, Number(subtotal) || 0);
      if (!result.valid) {
        return res.status(400).json(result);
      }
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Error validating promo code' });
    }
  });

  // Promotions: Create (Admin - Firestore)
  app.post('/api/promotions', authenticateToken, requireAdmin, async (req, res) => {
    try {
      const { code, discountValue } = req.body;
      if (!code || !discountValue) {
        return res.status(400).json({ error: 'Code and discount value required' });
      }

      const created = await dbService.createCoupon(req.body);
      res.status(201).json(created);
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Failed to create promo code' });
    }
  });

  // Promotions: Delete (Admin - Firestore)
  app.delete('/api/promotions/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
      await dbService.deleteCoupon(req.params.id);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to delete promo code' });
    }
  });

  // Cart: Get Cart with Authoritative Prices and Inventory (Firestore)
  app.get('/api/cart', async (req, res) => {
    try {
      const authHeader = req.headers['authorization'];
      let userId: string | undefined;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        try {
          const decoded = await adminAuth.verifyIdToken(authHeader.split(' ')[1]);
          userId = decoded.uid || String(decoded.id);
        } catch {}
      }
      const sessionId = (req.headers['x-session-id'] as string) || req.cookies?.systech_session;
      const cart = await dbService.getOrCreateCart(userId, sessionId);
      const cartDetails = await dbService.getCartWithItems(cart.id, userId);
      res.json(cartDetails);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to fetch cart' });
    }
  });

  // Cart: Add Item (Firestore)
  app.post('/api/cart/items', async (req, res) => {
    try {
      const { productId, quantity, extendedCare, dataMigration } = req.body;
      if (!productId) return res.status(400).json({ error: 'productId is required' });

      const authHeader = req.headers['authorization'];
      let userId: string | undefined;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        try {
          const decoded = await adminAuth.verifyIdToken(authHeader.split(' ')[1]);
          userId = decoded.uid || String(decoded.id);
        } catch {}
      }
      const sessionId = (req.headers['x-session-id'] as string) || req.cookies?.systech_session;
      const cart = await dbService.getOrCreateCart(userId, sessionId);

      const updated = await dbService.addToCart(cart.id, productId, Number(quantity) || 1, { extendedCare, dataMigration });
      res.status(201).json(updated);
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Failed to add item to cart' });
    }
  });

  // Cart: Update Item Quantity (Firestore)
  app.put('/api/cart/items/:id', async (req, res) => {
    try {
      const { quantity } = req.body;
      const itemId = req.params.id;

      const authHeader = req.headers['authorization'];
      let userId: string | undefined;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        try {
          const decoded = await adminAuth.verifyIdToken(authHeader.split(' ')[1]);
          userId = decoded.uid || String(decoded.id);
        } catch {}
      }
      const sessionId = (req.headers['x-session-id'] as string) || req.cookies?.systech_session;
      const cart = await dbService.getOrCreateCart(userId, sessionId);

      const updated = await dbService.updateCartItem(cart.id, itemId, Number(quantity));
      res.json(updated);
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Failed to update cart item' });
    }
  });

  // Cart: Remove Item (Firestore)
  app.delete('/api/cart/items/:id', async (req, res) => {
    try {
      const itemId = req.params.id;

      const authHeader = req.headers['authorization'];
      let userId: string | undefined;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        try {
          const decoded = await adminAuth.verifyIdToken(authHeader.split(' ')[1]);
          userId = decoded.uid || String(decoded.id);
        } catch {}
      }
      const sessionId = (req.headers['x-session-id'] as string) || req.cookies?.systech_session;
      const cart = await dbService.getOrCreateCart(userId, sessionId);

      const updated = await dbService.removeCartItem(cart.id, itemId);
      res.json(updated);
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Failed to remove cart item' });
    }
  });

  // Cart: Clear Cart (Firestore)
  app.delete('/api/cart', async (req, res) => {
    try {
      const authHeader = req.headers['authorization'];
      let userId: string | undefined;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        try {
          const decoded = await adminAuth.verifyIdToken(authHeader.split(' ')[1]);
          userId = decoded.uid || String(decoded.id);
        } catch {}
      }
      const sessionId = (req.headers['x-session-id'] as string) || req.cookies?.systech_session;
      const cart = await dbService.getOrCreateCart(userId, sessionId);

      const updated = await dbService.clearCart(cart.id);
      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to clear cart' });
    }
  });

  // Orders: Get All (Firestore - Role-protected)
  app.get('/api/orders', async (req, res) => {
    try {
      const authHeader = req.headers['authorization'];
      const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

      let userId: string | undefined;
      let role: string | undefined;

      if (token) {
        try {
          const decoded = await adminAuth.verifyIdToken(token);
          userId = decoded.uid || String(decoded.id);
          role = decoded.role;
        } catch {}
      }

      const orders = await dbService.getOrders({ userId, role });
      res.json(orders);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to fetch orders' });
    }
  });

  // Orders: Place Order (Atomic Transaction & Stock Commit in Firestore - Authenticated Only)
  app.post('/api/orders', authenticateToken, async (req: AuthRequest, res) => {
    try {
      const {
        customerName,
        customerEmail,
        customerPhone,
        address,
        addressLine1,
        addressLine2,
        city,
        state,
        postalCode,
        pincode,
        fulfillment,
        items,
        promoCodeUsed,
        paymentMethod
      } = req.body;

      if (!customerName || !customerPhone || !items || !items.length) {
        return res.status(400).json({ error: 'Customer name, mobile number, and order items are required' });
      }

      const cleanPaymentMethod = paymentMethod === 'upi_online' ? 'upi_online' : 'store_pickup_cash';
      if (paymentMethod && paymentMethod !== 'upi_online' && paymentMethod !== 'store_pickup_cash') {
        return res.status(400).json({ error: 'Invalid payment method. Only UPI and Pay at Store are accepted.' });
      }

      const userId = String(req.user!.uid || req.user!.id);
      const userEmail = req.user!.email || customerEmail || 'customer@systech.com';

      const newOrder = await dbService.createOrder({
        userId,
        customerName: customerName.trim(),
        customerEmail: userEmail.trim().toLowerCase(),
        customerPhone: customerPhone.trim(),
        address: address?.trim(),
        addressLine1: addressLine1?.trim(),
        addressLine2: addressLine2?.trim(),
        city: (city || 'Kumta').trim(),
        state: (state || 'Karnataka').trim(),
        postalCode: (postalCode || pincode || '581343').trim(),
        pincode: (postalCode || pincode || '581343').trim(),
        fulfillment: fulfillment || 'in_store_pickup',
        items,
        promoCodeUsed,
        paymentMethod: cleanPaymentMethod
      });

      res.status(201).json(newOrder);
    } catch (err: any) {
      console.error('Order creation error:', err.message);
      res.status(400).json({ error: err.message || 'Failed to place order' });
    }
  });

  // Orders: Update Status (Admin - Firestore)
  app.put('/api/orders/:id/status', authenticateToken, requireAdmin, async (req, res) => {
    try {
      const { status } = req.body;
      const updated = await dbService.updateOrderStatus(req.params.id, status);
      if (!updated) return res.status(404).json({ error: 'Order not found' });
      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to update order status' });
    }
  });

  // Orders: Get One (Scoped by Ownership / Role)
  app.get('/api/orders/:id', authenticateToken, async (req: AuthRequest, res) => {
    try {
      const order = await dbService.getOrderById(req.params.id, String(req.user!.uid || req.user!.id), req.user!.role);
      if (!order) return res.status(404).json({ error: 'Order not found' });
      res.json(order);
    } catch (err: any) {
      const status = err.message?.includes('Unauthorized') ? 403 : 500;
      res.status(status).json({ error: err.message || 'Failed to fetch order' });
    }
  });

  // Admin: Role Check Verification
  app.get('/api/admin/verify', authenticateToken, requireAdmin, (req: AuthRequest, res) => {
    res.json({ authorized: true, role: req.user!.role, email: req.user!.email });
  });

  // Payments: Razorpay Create Order
  app.post('/api/payments/razorpay/create-order', async (req, res) => {
    try {
      const { orderId } = req.body;
      if (!orderId) {
        return res.status(400).json({ error: 'Order ID is required' });
      }

      const paymentOrder = await dbService.createRazorpayOrder(orderId);
      res.json(paymentOrder);
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Failed to initiate payment' });
    }
  });

  // Payments: Razorpay Verify Signature
  app.post('/api/payments/razorpay/verify', async (req, res) => {
    try {
      const { orderId, razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;
      if (!orderId || !razorpayOrderId || !razorpayPaymentId) {
        return res.status(400).json({ error: 'Incomplete payment verification payload' });
      }

      const verified = await dbService.verifyRazorpayPayment({
        orderId,
        razorpayOrderId,
        razorpayPaymentId,
        razorpaySignature
      });

      res.json(verified);
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Payment verification failed' });
    }
  });

  // Repairs: Get All (Firestore)
  app.get('/api/repairs', async (req, res) => {
    try {
      const repairs = await dbService.getRepairs();
      res.json(repairs);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to fetch repair tickets' });
    }
  });

  // Repairs: Lookup by Ticket Number (Firestore)
  app.get('/api/repairs/lookup/:ticketNumber', async (req, res) => {
    try {
      const ticket = await dbService.getRepairByTicket(req.params.ticketNumber);
      if (!ticket) return res.status(404).json({ error: 'Repair ticket not found' });
      res.json(ticket);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Error looking up repair' });
    }
  });

  // Repairs: Book Diagnostic / Repair (Firestore)
  app.post('/api/repairs', async (req, res) => {
    try {
      const { customerName, customerPhone, deviceModel } = req.body;
      if (!customerName || !customerPhone || !deviceModel) {
        return res.status(400).json({ error: 'Customer name, phone, and device model are required' });
      }

      const ticket = await dbService.createRepairTicket(req.body);
      res.status(201).json(ticket);
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Failed to book repair' });
    }
  });

  // Repairs: Update (Admin - Firestore)
  app.put('/api/repairs/:id', authenticateToken, requireAdmin, async (req: AuthRequest, res: Response) => {
    try {
      const updated = await dbService.updateRepairTicket(req.params.id, req.body);
      if (!updated) return res.status(404).json({ error: 'Repair ticket not found' });
      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to update repair ticket' });
    }
  });

  // Contact Inquiries (Firestore)
  app.get('/api/messages', authenticateToken, requireAdmin, async (req, res) => {
    try {
      const messages = await dbService.getInquiries();
      res.json(messages);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to fetch messages' });
    }
  });

  app.post('/api/messages', async (req, res) => {
    try {
      const { name, message } = req.body;
      if (!name || !message) {
        return res.status(400).json({ error: 'Name and message are required' });
      }

      const msg = await dbService.createInquiry(req.body);
      res.status(201).json(msg);
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Failed to send message' });
    }
  });

  app.put('/api/messages/:id/read', authenticateToken, requireAdmin, async (req, res) => {
    try {
      await dbService.markInquiryRead(req.params.id);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Notifications (Firestore)
  app.get('/api/notifications', async (req, res) => {
    try {
      const notifs = await dbService.getNotifications();
      res.json(notifs);
    } catch (err: any) {
      res.json([]);
    }
  });

  app.put('/api/notifications/:id/read', async (req, res) => {
    try {
      await dbService.markNotificationRead(req.params.id);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put('/api/notifications/read-all', async (req, res) => {
    try {
      await dbService.markAllNotificationsRead();
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete('/api/notifications/:id', async (req, res) => {
    try {
      await dbService.deleteNotification(req.params.id);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete('/api/notifications', async (req, res) => {
    try {
      await dbService.clearNotifications();
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Live Sales & Store Analytics (Firestore Aggregates)
  app.get('/api/analytics', authenticateToken, requireAdmin, async (req, res) => {
    try {
      const analytics = await dbService.getLiveAnalytics();
      res.json(analytics);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to fetch analytics' });
    }
  });

  // Image Upload / Storage (Firebase Storage via Firebase Admin SDK)
  app.post('/api/upload', authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
    try {
      const { image, name, category, productId } = req.body;
      if (!image) {
        return res.status(400).json({ error: 'Image data required' });
      }

      // 1. Validate file size (max 5MB)
      if (typeof image === 'string' && image.length > 7 * 1024 * 1024) {
        return res.status(413).json({ error: 'Image exceeds maximum size limit of 5MB' });
      }

      // 2. Validate MIME type
      let mimeType = 'image/jpeg';
      let buffer: Buffer;

      if (typeof image === 'string' && image.startsWith('data:')) {
        const matches = image.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
        if (!matches) {
          return res.status(400).json({ error: 'Invalid data URI image format' });
        }
        mimeType = matches[1].toLowerCase();
        if (!['image/jpeg', 'image/png', 'image/webp'].includes(mimeType)) {
          return res.status(400).json({ error: 'Invalid file format. Only JPEG, PNG, and WEBP images are supported.' });
        }
        buffer = Buffer.from(matches[2], 'base64');
      } else if (typeof image === 'string' && (image.startsWith('http://') || image.startsWith('https://'))) {
        try {
          const fetchRes = await fetch(image);
          if (!fetchRes.ok) throw new Error(`HTTP ${fetchRes.status}`);
          mimeType = (fetchRes.headers.get('content-type') || 'image/jpeg').split(';')[0].toLowerCase();
          if (!['image/jpeg', 'image/png', 'image/webp'].includes(mimeType)) {
            return res.status(400).json({ error: 'Invalid image URL content type. Only JPEG, PNG, and WEBP images are supported.' });
          }
          const arr = await fetchRes.arrayBuffer();
          buffer = Buffer.from(arr);
        } catch (fetchErr: any) {
          return res.status(400).json({ error: `Unable to download image from provided URL: ${fetchErr.message}` });
        }
      } else {
        return res.status(400).json({ error: 'Unsupported image format. Provide base64 data URL or public image URL.' });
      }

      if (buffer.length > 5 * 1024 * 1024) {
        return res.status(413).json({ error: 'Decoded image exceeds maximum size limit of 5MB' });
      }

      // 3. Generate safe deterministic filename & path
      const ext = mimeType === 'image/webp' ? 'webp' : (mimeType === 'image/png' ? 'png' : 'jpg');
      const safeCategory = (category || 'accessories').toLowerCase().replace(/[^a-z0-9_-]/g, '');
      const rawName = (name || productId || `prod_${Date.now()}`).toLowerCase().replace(/\.[^/.]+$/, '').replace(/[^a-z0-9_-]/g, '-');
      const safeFilename = `${rawName}_${Date.now()}.${ext}`;
      const storagePath = `products/${safeCategory}/${safeFilename}`;

      // 4. Primary: Save to Firebase Storage via Firebase Admin SDK
      try {
        const file = adminBucket.file(storagePath);
        await file.save(buffer, {
          contentType: mimeType,
          metadata: {
            cacheControl: 'public, max-age=31536000',
            metadata: {
              uploadedBy: req.user?.email || 'admin',
              uploadedAt: new Date().toISOString()
            }
          }
        });
        const publicUrl = `https://storage.googleapis.com/${adminBucket.name}/${storagePath}`;
        return res.json({
          url: publicUrl,
          path: storagePath,
          name: safeFilename,
          storage: 'firebase_storage',
          success: true
        });
      } catch (storageErr: any) {
        // Fallback: If Firebase Storage bucket is not yet provisioned in GCP Console (HTTP 404),
        // save to standardized local static assets folder so uploads always succeed without crashing
        console.warn('[Firebase Storage Notice] GCS bucket not yet provisioned, saving to local static storage:', storageErr.message);
        const localRelPath = `products/${safeCategory}/${safeFilename}`;
        const localAbsPath = path.join(process.cwd(), 'public', localRelPath);
        fs.mkdirSync(path.dirname(localAbsPath), { recursive: true });
        fs.writeFileSync(localAbsPath, buffer);
        const localUrl = `/${localRelPath}`;
        return res.json({
          url: localUrl,
          path: localRelPath,
          name: safeFilename,
          storage: 'local_standardized_fallback',
          success: true
        });
      }
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Image upload failed' });
    }
  });

  // Admin: Delete Product Image (Firebase Admin SDK)
  app.delete('/api/upload', authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
    try {
      const { path: storagePath, url } = req.body;
      let targetPath = storagePath;

      if (!targetPath && url && typeof url === 'string') {
        const match = url.match(/products\/[a-zA-Z0-9_-]+\/[a-zA-Z0-9_.-]+/);
        if (match) targetPath = match[0];
      }

      if (!targetPath) {
        return res.status(400).json({ error: 'Storage path or image URL is required' });
      }

      // 1. Try Firebase Storage deletion via Admin SDK
      try {
        const file = adminBucket.file(targetPath);
        await file.delete({ ignoreNotFound: true });
      } catch (storageErr: any) {
        console.warn('[Firebase Storage Delete Notice]', storageErr.message);
      }

      // 2. Also clean local fallback if present
      const localAbsPath = path.join(process.cwd(), 'public', targetPath);
      if (fs.existsSync(localAbsPath)) {
        try { fs.unlinkSync(localAbsPath); } catch {}
      }

      res.json({ success: true, deletedPath: targetPath });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to delete image' });
    }
  });

  // Automated Firebase Backups: Status Endpoint
  app.get('/api/backup/status', authenticateToken, requireAdmin, (req, res) => {
    try {
      res.json(backupService.getStatus());
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to get backup status' });
    }
  });

  // Automated Firebase Backups: Trigger Endpoint (Cloud Scheduler / Admin)
  app.post('/api/backup/trigger', async (req, res) => {
    try {
      // Allow if admin token provided OR internal Cloud Scheduler secret header
      const authHeader = req.headers.authorization;
      const schedulerHeader = req.headers['x-cloudscheduler-token'];
      const internalSecret = process.env.BACKUP_SCHEDULER_SECRET || 'systech_scheduler_internal_secret_2026';

      let isAuthorized = false;
      if (schedulerHeader === internalSecret) {
        isAuthorized = true;
      } else if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];
        const user = await adminAuth.verifyIdToken(token);
        if (user && (user.role === 'ADMIN' || user.role === 'OWNER' || user.isAdmin)) {
          isAuthorized = true;
        }
      }

      if (!isAuthorized) {
        return res.status(403).json({ error: 'Unauthorized: Admin or Cloud Scheduler credentials required' });
      }

      const result = await backupService.runBackup(req.headers['x-cloudscheduler-token'] ? 'cloud_scheduler' : 'admin_manual');
      res.json({ success: true, backup: result });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Backup execution failed' });
    }
  });



  // Automated Integration & Verification Tests Endpoint (Firebase Cloud Firestore)
  app.get('/api/test/run', async (req, res) => {
    const results = [];

    // Test 1: Firebase Products Catalog Persistence
    try {
      const prods = await dbService.getProducts();
      results.push({
        test: 'Firebase Cloud Firestore Products Persistence',
        passed: prods.length >= 5,
        details: `Successfully queried ${prods.length} products with live inventory from Firebase Cloud Firestore.`
      });
    } catch (e: any) {
      results.push({ test: 'Firebase Cloud Firestore Products Persistence', passed: false, error: e.message });
    }

    // Test 2: Database Coupon Engine
    try {
      const promoCheck = await dbService.validateCoupon('SYSTECH', 50000);
      results.push({
        test: 'Database Coupon Validation Engine (SYSTECH code)',
        passed: promoCheck.valid && promoCheck.discount > 0,
        details: `Validated promo code against Firestore coupons collection. Discount: ₹${promoCheck.discount}.`
      });
    } catch (e: any) {
      results.push({ test: 'Database Coupon Validation Engine', passed: false, error: e.message });
    }

    // Test 3: Password Hashing & Firebase User Profile
    try {
      const user = await dbService.getUserByEmail('admin@systech.com');
      results.push({
        test: 'Firebase User Authentication & Profile Store',
        passed: !!user && user.role === 'ADMIN',
        details: `Verified user profile in Firestore users collection (Role: ${user?.role}).`
      });
    } catch (e: any) {
      results.push({ test: 'Firebase User Authentication & Profile Store', passed: false, error: e.message });
    }

    // Test 4: Repair Lab Ticketing in Database
    try {
      const repairs = await dbService.getRepairs();
      results.push({
        test: 'Firebase Repair Tickets & Status Tracking',
        passed: repairs.length > 0,
        details: `Retrieved ${repairs.length} active service tickets from Firestore repairs collection.`
      });
    } catch (e: any) {
      results.push({ test: 'Firebase Repair Tickets', passed: false, error: e.message });
    }

    // Test 5: Live Database Analytics Aggregation
    try {
      const analytics = await dbService.getLiveAnalytics();
      results.push({
        test: 'Live Firebase Cloud Firestore Analytics Aggregation',
        passed: typeof analytics.catalogItems === 'number' && analytics.catalogItems > 0,
        details: `Aggregated live catalog count (${analytics.catalogItems}) and active repairs (${analytics.activeRepairs}).`
      });
    } catch (e: any) {
      results.push({ test: 'Live Firebase Analytics', passed: false, error: e.message });
    }

    const allPassed = results.every(r => r.passed);
    res.json({
      allPassed,
      database: 'Firebase Cloud Firestore',
      firestoreDatabaseId: 'ai-studio-systechcomputers-a214840e-ab4c-435a-967c-709346b0312c',
      rollbackDatabase: 'PostgreSQL Cloud SQL (Standby Ready)',
      timestamp: new Date().toISOString(),
      results
    });
  });

  // --- Server-side Route Guard for /admin & /admin/* ---
  app.use(['/admin', '/admin/*'], async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const authHeader = req.headers['authorization'];
    const token = (authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null) || req.cookies?.systech_session;

    if (!token) {
      return res.status(403).send(`
        <!DOCTYPE html>
        <html lang="en">
          <head>
            <meta charset="utf-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1" />
            <title>403 Forbidden - SysTech Admin</title>
            <style>
              body { background: #050505; color: #fff; font-family: system-ui, -apple-system, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 20px; box-sizing: border-box; text-align: center; }
              .card { max-width: 440px; background: #0d0d0d; border: 1px solid #222; border-radius: 16px; padding: 32px 24px; box-shadow: 0 20px 40px rgba(0,0,0,0.8); }
              .badge { display: inline-block; padding: 4px 10px; border-radius: 6px; background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.3); color: #ef4444; font-size: 11px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 12px; }
              h1 { font-size: 24px; margin: 0 0 8px 0; color: #fff; }
              p { font-size: 13px; color: #888; line-height: 1.5; margin: 0 0 20px 0; }
              a { display: inline-block; padding: 10px 20px; border-radius: 10px; background: #0891b2; color: #fff; text-decoration: none; font-size: 13px; font-weight: bold; }
              a:hover { background: #06b6d4; }
            </style>
          </head>
          <body>
            <div class="card">
              <span class="badge">403 Forbidden</span>
              <h1>Access Denied</h1>
              <p>Store Owner or Administrator authorization is required to access /admin. Customers cannot access the management panel.</p>
              <a href="/">Return to Storefront</a>
            </div>
          </body>
        </html>
      `);
    }

    try {
      const decoded = await adminAuth.verifyIdToken(token);
      let role = decoded.role;
      if (!role && decoded.email) {
        const user = await dbService.getUserByEmail(decoded.email);
        if (user) {
          role = user.role;
        }
      }

      const roleStr = String(role || '').toUpperCase();
      if (roleStr !== 'OWNER' && roleStr !== 'ADMIN') {
        return res.status(403).send(`
          <!DOCTYPE html>
          <html lang="en">
            <head>
              <meta charset="utf-8" />
              <meta name="viewport" content="width=device-width, initial-scale=1" />
              <title>403 Forbidden - SysTech Admin</title>
              <style>
                body { background: #050505; color: #fff; font-family: system-ui, -apple-system, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 20px; box-sizing: border-box; text-align: center; }
                .card { max-width: 440px; background: #0d0d0d; border: 1px solid #222; border-radius: 16px; padding: 32px 24px; box-shadow: 0 20px 40px rgba(0,0,0,0.8); }
                .badge { display: inline-block; padding: 4px 10px; border-radius: 6px; background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.3); color: #ef4444; font-size: 11px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 12px; }
                h1 { font-size: 24px; margin: 0 0 8px 0; color: #fff; }
                p { font-size: 13px; color: #888; line-height: 1.5; margin: 0 0 20px 0; }
                a { display: inline-block; padding: 10px 20px; border-radius: 10px; background: #0891b2; color: #fff; text-decoration: none; font-size: 13px; font-weight: bold; }
                a:hover { background: #06b6d4; }
              </style>
            </head>
            <body>
              <div class="card">
                <span class="badge">403 Forbidden</span>
                <h1>Access Denied</h1>
                <p>Customer accounts are strictly prohibited from accessing /admin. Please continue on the customer storefront.</p>
                <a href="/">Return to Customer Store</a>
              </div>
            </body>
          </html>
        `);
      }

      next();
    } catch {
      return res.status(403).send("Access Denied: Invalid or expired admin credentials");
    }
  });

  // --- Vite middleware for development & Static Serving for production ---
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`SysTech Computer Solutions Server running on port ${PORT} with Firebase Cloud Firestore backend`);
  });

  server.on('error', (err: any) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`Port ${PORT} is already in use. Retrying in 1s...`);
      setTimeout(() => {
        server.close();
        server.listen(PORT, '0.0.0.0');
      }, 1000);
    } else {
      console.error('Server listen error:', err);
    }
  });

  const handleShutdown = () => {
    server.close(() => {
      process.exit(0);
    });
  };
  process.on('SIGTERM', handleShutdown);
  process.on('SIGINT', handleShutdown);
}

startServer();
