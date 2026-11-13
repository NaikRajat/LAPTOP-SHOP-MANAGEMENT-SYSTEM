import { adminDb, adminAuth, adminBucket, FieldValue } from '../src/lib/firebase-admin.ts';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import Razorpay from 'razorpay';
import { validateEmail, validateIndianMobile, validateStrongPassword, sanitizeMobileDigits } from './validation.ts';

// Initialize Razorpay client if credentials exist in env
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

export const firestoreService = {
  // ==========================================
  // 1. Users & Authentication (Firestore /users/{uid})
  // ==========================================
  async getUserByEmail(email: string) {
    const clean = email.toLowerCase().trim();
    const snapshot = await adminDb.collection('users').where('email', '==', clean).limit(1).get();
    if (snapshot.empty) return null;
    const doc = snapshot.docs[0];
    return { id: doc.id, uid: doc.id, ...doc.data() } as any;
  },

  async getUserById(id: string | number) {
    const idStr = String(id);
    const docRef = adminDb.collection('users').doc(idStr);
    const snap = await docRef.get();
    if (snap.exists) {
      return { id: snap.id, uid: snap.id, ...snap.data() } as any;
    }
    // Fallback: search by legacy postgres numeric ID
    const numId = Number(id);
    if (!isNaN(numId)) {
      const qSnap = await adminDb.collection('users').where('postgresId', '==', numId).limit(1).get();
      if (!qSnap.empty) {
        const d = qSnap.docs[0];
        return { id: d.id, uid: d.id, ...d.data() } as any;
      }
    }
    return null;
  },

  async getUserByUid(uid: string) {
    return this.getUserById(uid);
  },

  async updateUserProfile(userId: string | number, data: {
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
    const user = await this.getUserById(userId);
    if (!user) throw new Error('User not found');

    const updatePayload: Record<string, any> = {
      updatedAt: new Date().toISOString()
    };
    if (data.name !== undefined) updatePayload.name = data.name.trim();
    if (data.phone !== undefined) {
      const cleanPhone = data.phone.trim();
      if (cleanPhone) {
        const phoneVal = validateIndianMobile(cleanPhone);
        if (!phoneVal.valid) {
          throw new Error(phoneVal.error || 'Please enter a valid 10-digit mobile number.');
        }
        updatePayload.phone = sanitizeMobileDigits(cleanPhone);
      } else {
        updatePayload.phone = '';
      }
    }
    if (data.addressLine1 !== undefined) updatePayload.addressLine1 = data.addressLine1.trim();
    if (data.addressLine2 !== undefined) updatePayload.addressLine2 = data.addressLine2.trim();
    if (data.city !== undefined) updatePayload.city = data.city.trim();
    if (data.state !== undefined) updatePayload.state = data.state.trim();
    if (data.postalCode !== undefined) updatePayload.postalCode = data.postalCode.trim();

    if (data.address !== undefined && data.address.trim()) {
      updatePayload.address = data.address.trim();
    } else {
      const parts = [
        updatePayload.addressLine1 || user.addressLine1 || '',
        updatePayload.addressLine2 || user.addressLine2 || '',
        updatePayload.city || user.city || '',
        (updatePayload.state || user.state)
          ? `${updatePayload.state || user.state} ${updatePayload.postalCode || user.postalCode || ''}`.trim()
          : (updatePayload.postalCode || user.postalCode || '')
      ].filter(Boolean);
      if (parts.length) {
        updatePayload.address = parts.join(', ');
      }
    }

    // Email synchronization with Firebase Auth if changed
    if (data.email !== undefined && data.email.trim() && data.email.trim().toLowerCase() !== user.email) {
      const emailVal = validateEmail(data.email);
      if (!emailVal.valid) {
        throw new Error(emailVal.error || 'Please enter a valid email address.');
      }
      const newEmail = data.email.trim().toLowerCase();
      try {
        await adminAuth.updateUser(user.uid || String(user.id), { email: newEmail });
        updatePayload.email = newEmail;
      } catch (authErr: any) {
        console.warn('Firebase Auth email sync notice:', authErr.message);
      }
    }

    const docRef = adminDb.collection('users').doc(user.uid || String(user.id));
    await docRef.set(updatePayload, { merge: true });

    const updatedSnap = await docRef.get();
    return { id: updatedSnap.id, uid: updatedSnap.id, ...updatedSnap.data() };
  },

  async registerUser(data: { name: string; email: string; password?: string; phone?: string; role?: string }) {
    const emailVal = validateEmail(data.email);
    if (!emailVal.valid) {
      throw new Error(emailVal.error || 'Please enter a valid email address.');
    }
    const cleanEmail = data.email.toLowerCase().trim();

    let cleanPhone = '';
    if (data.phone) {
      const phoneVal = validateIndianMobile(data.phone);
      if (!phoneVal.valid) {
        throw new Error(phoneVal.error || 'Please enter a valid 10-digit mobile number.');
      }
      cleanPhone = sanitizeMobileDigits(data.phone);
    }

    if (data.password) {
      const passVal = validateStrongPassword(data.password);
      if (!passVal.valid) {
        throw new Error(passVal.error || 'Password must meet all complexity requirements.');
      }
    }

    const existing = await this.getUserByEmail(cleanEmail);
    if (existing) {
      throw new Error('An account with this email already exists');
    }

    const isOwner = cleanEmail === 'rajatnaik0541@gmail.com';
    const isAdmin = cleanEmail === 'admin@systech.com' || isOwner;
    const role = isOwner ? 'OWNER' : (isAdmin ? 'ADMIN' : 'CUSTOMER');

    // 1. Create or get user in Firebase Authentication
    let firebaseUser;
    try {
      firebaseUser = await adminAuth.getUserByEmail(cleanEmail);
    } catch {
      firebaseUser = await adminAuth.createUser({
        email: cleanEmail,
        password: data.password || crypto.randomBytes(16).toString('hex'),
        displayName: data.name.trim(),
        phoneNumber: cleanPhone && cleanPhone.length === 10 ? `+91${cleanPhone}` : undefined
      });
    }

    // 2. Set Firebase Custom Claims (OWNER / ADMIN / CUSTOMER)
    await adminAuth.setCustomUserClaims(firebaseUser.uid, { role });

    // 3. Bcrypt password hash for secure authentication verification
    let passwordHash: string | undefined;
    if (data.password) {
      passwordHash = await bcrypt.hash(data.password, 10);
    }

    // 4. Save profile document to Firestore /users/{uid} (ZERO PLAINTEXT PASSWORDS)
    const profileData: Record<string, any> = {
      uid: firebaseUser.uid,
      id: firebaseUser.uid,
      email: cleanEmail,
      name: data.name.trim(),
      phone: cleanPhone,
      role,
      isVerified: firebaseUser.emailVerified || false,
      avatarUrl: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(data.name)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    if (passwordHash) {
      profileData.passwordHash = passwordHash;
    }

    await adminDb.collection('users').doc(firebaseUser.uid).set(profileData, { merge: true });

    return profileData;
  },


  async verifyPassword(email: string, plainPassword: string) {
    const user = await this.getUserByEmail(email);
    if (!user) return null;
    if (user.passwordHash) {
      const isValid = await bcrypt.compare(plainPassword, user.passwordHash);
      if (isValid) return user;
    }
    // Check known seeded administrative and customer credentials
    const clean = email.toLowerCase().trim();
    if (clean === 'admin@systech.com' && plainPassword === 'admin123') {
      return user;
    }
    if (clean === 'customer@systech.com' && plainPassword === 'customer123') {
      return user;
    }
    return null;
  },

  async invalidateSession(_token: string) {
    return { success: true };
  },


  // ==========================================
  // 2. Email OTP in Firestore (/verification_sessions)
  // ==========================================
  async sendOtpEmail(email: string, name?: string, purpose: 'login' | 'register' = 'login') {
    const emailVal = validateEmail(email);
    if (!emailVal.valid) {
      return {
        error: emailVal.error || 'Please enter a valid email address.',
        status: 400
      };
    }
    const cleanEmail = email.toLowerCase().trim();

    // 1. Verify user exists or allow sign-in/sign-up flow
    const existingUser = await this.getUserByEmail(cleanEmail);
    if (purpose === 'register') {
      if (existingUser) {
        return {
          error: 'An account with this email already exists. Please sign in.',
          status: 409
        };
      }
    } else {
      if (!existingUser) {
        return {
          error: 'No account found with this email. Please sign up to create an account.',
          status: 404
        };
      }
    }

    // 2. Check 60-second cooldown in Firestore
    const sixtySecAgo = new Date(Date.now() - 60 * 1000).toISOString();
    const recentSnap = await adminDb.collection('verification_sessions')
      .where('email', '==', cleanEmail)
      .where('createdAt', '>', sixtySecAgo)
      .orderBy('createdAt', 'desc')
      .limit(1)
      .get();

    if (!recentSnap.empty) {
      const recent = recentSnap.docs[0].data();
      const elapsed = Math.floor((Date.now() - new Date(recent.createdAt).getTime()) / 1000);
      const remaining = Math.max(1, 60 - elapsed);
      return {
        error: `Please wait ${remaining}s before requesting a new verification code.`,
        cooldownRemaining: remaining,
        status: 429
      };
    }

    // 3. Check hourly rate limit (max 6)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const hourlySnap = await adminDb.collection('verification_sessions')
      .where('email', '==', cleanEmail)
      .where('createdAt', '>', oneHourAgo)
      .get();

    if (hourlySnap.size >= 6) {
      return {
        error: 'Too many verification requests for this email. Please wait an hour or sign in with Google.',
        status: 429
      };
    }

    // 4. Invalidate prior active sessions
    const oldSessions = await adminDb.collection('verification_sessions')
      .where('email', '==', cleanEmail)
      .get();
    const batch = adminDb.batch();
    oldSessions.docs.forEach(doc => batch.delete(doc.ref));
    await batch.commit();

    // 5. Generate cryptographically secure 6-digit code
    const rawOtp = crypto.randomInt(100000, 1000000).toString();
    const otpHash = await bcrypt.hash(rawOtp, 10);
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString(); // 5 minutes
    const sessionId = `vses_${crypto.randomUUID()}`;

    const sessionData = {
      id: sessionId,
      email: cleanEmail,
      otpHash,
      purpose,
      attempts: 0,
      maxAttempts: 5,
      expiresAt,
      deliveryStatus: 'pending',
      createdAt: new Date().toISOString()
    };

    await adminDb.collection('verification_sessions').doc(sessionId).set(sessionData);
    console.log(`[SysTech Auth] OTP stored successfully in Firestore. Session: ${sessionId} (Purpose: ${purpose})`);

    // 6. Deliver email via SMTP
    const transporter = getEmailTransporter();
    if (!transporter) {
      console.warn('[SysTech Auth] SMTP configuration missing: transporter could not be initialized.');
      await adminDb.collection('verification_sessions').doc(sessionId).update({
        deliveryStatus: 'failed',
        deliveryError: 'SMTP_NOT_CONFIGURED'
      }).catch(() => {});

      return {
        error: 'Unable to send verification code right now. Please try again.',
        status: 503,
        sessionId
      };
    }

    try {
      const userEmail = process.env.SMTP_USER || '';
      let sender = process.env.SMTP_FROM || 'SysTech Computer Solutions';
      if (!sender.includes('@')) {
        sender = `"${sender.replace(/"/g, '')}" <${userEmail}>`;
      }

      const subject = purpose === 'register'
        ? `${rawOtp} is your SysTech registration verification code`
        : `${rawOtp} is your SysTech verification code`;

      const sendResult = await transporter.sendMail({
        from: sender,
        to: cleanEmail,
        subject,
        text: `Your SysTech verification code is ${rawOtp}. Valid for 5 minutes.`,
        html: `<p>Your SysTech verification code is <b>${rawOtp}</b>. Valid for 5 minutes.</p>`
      });

      console.log(`[SysTech Auth] Email accepted by Gmail. Message ID: ${sendResult.messageId} | Response: ${sendResult.response}`);
      
      await adminDb.collection('verification_sessions').doc(sessionId).update({
        deliveryStatus: 'delivered',
        messageId: sendResult.messageId
      }).catch(() => {});
    } catch (mailErr: any) {
      const safeErrorCode = mailErr.code || (mailErr.responseCode ? `SMTP_${mailErr.responseCode}` : 'SMTP_SEND_FAILED');
      const safeErrorMessage = mailErr.response || mailErr.message || 'SMTP delivery rejected';
      
      console.error(`[SysTech Auth] SMTP authentication failed (${safeErrorCode}): ${safeErrorMessage}`);

      await adminDb.collection('verification_sessions').doc(sessionId).update({
        deliveryStatus: 'failed',
        deliveryError: safeErrorCode
      }).catch(() => {});

      return {
        error: 'Unable to send verification code right now. Please try again.',
        status: 502,
        sessionId,
        smtpError: safeErrorCode
      };
    }

    return {
      success: true,
      sessionId,
      expiresAt: new Date(expiresAt).getTime(),
      cooldownSeconds: 60,
      message: 'Verification code sent to your email.'
    };
  },

  async verifyOtpCode(
    sessionId: string,
    email: string,
    code: string,
    name?: string,
    phone?: string,
    password?: string,
    purpose: 'login' | 'register' = 'login'
  ) {
    const emailVal = validateEmail(email);
    if (!emailVal.valid) {
      return { error: emailVal.error || 'Please enter a valid email address.', status: 400 };
    }
    const cleanEmail = email.toLowerCase().trim();
    const sessionRef = adminDb.collection('verification_sessions').doc(sessionId);
    const snap = await sessionRef.get();

    if (!snap.exists) {
      return { error: 'Verification session not found or already used', status: 404 };
    }

    const session = snap.data()!;

    if (session.email !== cleanEmail) {
      return { error: 'Invalid verification session', status: 400 };
    }

    if (new Date() > new Date(session.expiresAt)) {
      await sessionRef.delete();
      return { error: 'Verification code has expired. Please request a new one.', expired: true, status: 400 };
    }

    if (session.attempts >= session.maxAttempts) {
      await sessionRef.delete();
      return { error: 'Maximum verification attempts exceeded. Please request a new code.', maxAttemptsExceeded: true, status: 429 };
    }

    const isMatch = await bcrypt.compare(code, session.otpHash);
    if (!isMatch) {
      const newAttempts = session.attempts + 1;
      await sessionRef.update({ attempts: newAttempts });
      return {
        error: `Incorrect verification code. ${session.maxAttempts - newAttempts} attempts remaining.`,
        attemptsRemaining: session.maxAttempts - newAttempts,
        status: 400
      };
    }

    // Success: Delete single-use verification session
    await sessionRef.delete();

    // If registration flow: Complete user registration now that email is verified via OTP
    const effectivePurpose = purpose === 'register' || session.purpose === 'register' ? 'register' : 'login';
    if (effectivePurpose === 'register') {
      if (!password) {
        return { error: 'Password is required to complete registration.', status: 400 };
      }
      const passVal = validateStrongPassword(password);
      if (!passVal.valid) {
        return { error: passVal.error || 'Password must meet all complexity requirements.', status: 400 };
      }
      if (phone) {
        const phoneVal = validateIndianMobile(phone);
        if (!phoneVal.valid) {
          return { error: phoneVal.error || 'Please enter a valid 10-digit mobile number.', status: 400 };
        }
      }

      const profile = await this.registerUser({
        name: name || cleanEmail.split('@')[0],
        email: cleanEmail,
        password,
        phone,
        role: 'customer'
      });

      const customToken = await adminAuth.createCustomToken(profile.uid, { role: profile.role });
      return { user: profile, customToken };
    }

    // Login flow: Retrieve or create Firebase User
    let fbUser;
    try {
      fbUser = await adminAuth.getUserByEmail(cleanEmail);
    } catch {
      fbUser = await adminAuth.createUser({
        email: cleanEmail,
        displayName: name || cleanEmail.split('@')[0],
        emailVerified: true
      });
    }

    // Determine and enforce role via Custom Claims
    const isOwner = cleanEmail === 'rajatnaik0541@gmail.com';
    const isAdmin = cleanEmail === 'admin@systech.com' || isOwner;
    const role = isOwner ? 'OWNER' : (isAdmin ? 'ADMIN' : 'CUSTOMER');
    await adminAuth.setCustomUserClaims(fbUser.uid, { role });

    // Ensure Firestore profile document exists
    let profile = await this.getUserById(fbUser.uid);
    if (!profile) {
      profile = {
        uid: fbUser.uid,
        id: fbUser.uid,
        email: cleanEmail,
        name: name || fbUser.displayName || cleanEmail.split('@')[0],
        role,
        isVerified: true,
        avatarUrl: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name || cleanEmail)}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      await adminDb.collection('users').doc(fbUser.uid).set(profile, { merge: true });
    }

    // Mint genuine Firebase Custom Token for the client to authenticate with Firebase Auth
    const customToken = await adminAuth.createCustomToken(fbUser.uid, { role });

    return { user: profile, customToken };
  },

  async changeUserPassword(uid: string, newPassword: string) {
    const passVal = validateStrongPassword(newPassword);
    if (!passVal.valid) {
      throw new Error(passVal.error || 'Password must meet all complexity requirements.');
    }

    // 1. Update in Firebase Authentication
    await adminAuth.updateUser(uid, { password: newPassword });

    // 2. Hash and update in Firestore (zero plaintext passwords)
    const passwordHash = await bcrypt.hash(newPassword, 10);
    await adminDb.collection('users').doc(uid).set({
      passwordHash,
      updatedAt: new Date().toISOString()
    }, { merge: true });

    return { success: true, message: 'Password updated successfully.' };
  },

  async generatePasswordResetLink(email: string) {
    const emailVal = validateEmail(email);
    if (!emailVal.valid) {
      throw new Error(emailVal.error || 'Please enter a valid email address.');
    }
    const cleanEmail = email.toLowerCase().trim();
    const user = await this.getUserByEmail(cleanEmail);
    if (!user) {
      throw new Error('No user account found with this email address.');
    }

    // Generate standard Firebase password reset link
    const resetLink = await adminAuth.generatePasswordResetLink(cleanEmail);

    // Send email via configured SMTP transporter if available
    const transporter = getEmailTransporter();
    if (transporter) {
      try {
        const userEmail = process.env.SMTP_USER || '';
        let sender = process.env.SMTP_FROM || 'SysTech Computer Solutions';
        if (!sender.includes('@')) {
          sender = `"${sender.replace(/"/g, '')}" <${userEmail}>`;
        }
        await transporter.sendMail({
          from: sender,
          to: cleanEmail,
          subject: 'Reset your SysTech account password',
          text: `Hello ${user.name || 'Customer'},\n\nFollow this secure link to reset your SysTech account password:\n${resetLink}\n\nThis link is valid for 1 hour. If you did not request this, please ignore this email.`,
          html: `<p>Hello <b>${user.name || 'Customer'}</b>,</p><p>You requested to reset your password for SysTech Computer Solutions. Click the link below to choose a new password:</p><p><a href="${resetLink}" style="display:inline-block;padding:10px 20px;background:#0891b2;color:#ffffff;text-decoration:none;border-radius:8px;font-weight:bold;">Reset Password</a></p><p style="color:#666;font-size:12px;">Link: ${resetLink}</p><p style="color:#888;font-size:11px;">This link is valid for 1 hour. If you did not request this, you can safely ignore this email.</p>`
        });
      } catch (mailErr: any) {
        console.warn('SMTP password reset email warning:', mailErr.message);
      }
    }

    return { success: true, resetLink };
  },


  async getSmtpDiagnostics() {
    const host = process.env.SMTP_HOST || 'smtp.gmail.com';
    const port = Number(process.env.SMTP_PORT) || 587;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS ? process.env.SMTP_PASS.replace(/\s+/g, '') : '';
    const hasConfig = !!(user && pass);

    if (!hasConfig) {
      return {
        configuration: 'missing',
        connection: 'failed',
        authentication: 'failed',
        message: 'SMTP credentials not configured.'
      };
    }

    const transporter = getEmailTransporter();
    if (!transporter) {
      return {
        configuration: 'present',
        connection: 'failed',
        authentication: 'failed',
        message: 'Could not initialize Nodemailer transport.'
      };
    }

    try {
      await transporter.verify();
      return {
        configuration: 'present',
        connection: 'successful',
        authentication: 'successful',
        messageSend: 'ready',
        message: 'Gmail SMTP connection verified successfully.'
      };
    } catch (err: any) {
      return {
        configuration: 'present',
        connection: 'failed',
        authentication: 'failed',
        message: err.message || 'SMTP verification failed.'
      };
    }
  },

  // ==========================================
  // 3. Products & Inventory (/products/{productId})
  // ==========================================
  async getProducts(params?: { category?: string; condition?: string; search?: string }) {
    const snapshot = await adminDb.collection('products').get();
    let list = snapshot.docs.map(doc => {
      const d = doc.data();
      return {
        id: doc.id,
        title: d.title || '',
        brand: d.brand || 'SysTech',
        model: d.model || '',
        sku: d.sku || '',
        category: d.categoryId || 'laptops',
        price: Number(d.price) || 0,
        originalPrice: Number(d.originalPrice) || Number(d.price) || 0,
        condition: d.condition === 'new' ? 'brand_new' : 'refurbished',
        warranty: d.warranty || '1 Year SysTech Guarantee',
        rating: Number(d.rating || '4.8'),
        reviewsCount: Number(d.reviewCount || d.reviewsCount || 0),
        featured: Boolean(d.featured),
        description: d.description || '',
        image: d.image || '',
        images: d.images || [d.image].filter(Boolean),
        stock: Number(d.stock ?? 5),
        specs: d.specs || d.specifications || {}
      };
    });

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
    const docRef = adminDb.collection('products').doc(id);
    const snap = await docRef.get();
    if (!snap.exists) {
      // Fallback search by slug or SKU
      const slugSnap = await adminDb.collection('products').where('slug', '==', id).limit(1).get();
      if (!slugSnap.empty) {
        const d = slugSnap.docs[0].data();
        return {
          id: slugSnap.docs[0].id,
          title: d.title,
          brand: d.brand,
          model: d.model,
          sku: d.sku,
          category: d.categoryId || 'laptops',
          price: Number(d.price),
          originalPrice: Number(d.originalPrice) || Number(d.price),
          condition: d.condition === 'new' ? 'brand_new' : 'refurbished',
          warranty: d.warranty,
          rating: Number(d.rating || '4.8'),
          reviewsCount: Number(d.reviewCount || 0),
          featured: Boolean(d.featured),
          description: d.description || '',
          image: d.image,
          images: d.images || [d.image].filter(Boolean),
          stock: Number(d.stock ?? 5),
          specs: d.specs || d.specifications || {}
        };
      }
      return null;
    }

    const d = snap.data()!;
    return {
      id: snap.id,
      title: d.title,
      brand: d.brand,
      model: d.model,
      sku: d.sku,
      category: d.categoryId || 'laptops',
      price: Number(d.price),
      originalPrice: Number(d.originalPrice) || Number(d.price),
      condition: d.condition === 'new' ? 'brand_new' : 'refurbished',
      warranty: d.warranty,
      rating: Number(d.rating || '4.8'),
      reviewsCount: Number(d.reviewCount || 0),
      featured: Boolean(d.featured),
      description: d.description || '',
      image: d.image,
      images: d.images || [d.image].filter(Boolean),
      stock: Number(d.stock ?? 5),
      specs: d.specs || d.specifications || {}
    };
  },

  async createProduct(data: any) {
    const id = data.id || `prod_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const condition = data.condition === 'brand_new' ? 'new' : 'refurbished';

    const productDoc = {
      id,
      slug: id,
      title: data.title,
      brand: data.brand || 'SysTech',
      model: data.model || '',
      sku: (data.sku || `SYS-${Date.now().toString().slice(-4)}`).toUpperCase(),
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
      images: data.images || (data.image ? [data.image] : []),
      stock: Number(data.stock ?? 5),
      reservedStock: 0,
      lowStockThreshold: 2,
      specs: data.specs || {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await adminDb.collection('products').doc(id).set(productDoc);
    return this.getProductById(id);
  },

  async updateProduct(id: string, updates: any) {
    const docRef = adminDb.collection('products').doc(id);
    const snap = await docRef.get();
    if (!snap.exists) return null;

    const updatePayload: Record<string, any> = {
      updatedAt: new Date().toISOString()
    };
    if (updates.title !== undefined) updatePayload.title = updates.title;
    if (updates.brand !== undefined) updatePayload.brand = updates.brand;
    if (updates.sku !== undefined) updatePayload.sku = updates.sku.toUpperCase();
    if (updates.price !== undefined) updatePayload.price = Number(updates.price);
    if (updates.originalPrice !== undefined) updatePayload.originalPrice = Number(updates.originalPrice);
    if (updates.category !== undefined) updatePayload.categoryId = updates.category;
    if (updates.condition !== undefined) updatePayload.condition = updates.condition === 'brand_new' ? 'new' : 'refurbished';
    if (updates.image !== undefined) {
      updatePayload.image = updates.image;
      updatePayload.images = [updates.image];
    }
    if (updates.description !== undefined) updatePayload.description = updates.description;
    if (updates.featured !== undefined) updatePayload.featured = Boolean(updates.featured);
    if (updates.specs !== undefined) updatePayload.specs = updates.specs;
    if (updates.stock !== undefined) updatePayload.stock = Number(updates.stock);

    await docRef.update(updatePayload);
    return this.getProductById(id);
  },

  async deleteProduct(id: string) {
    await adminDb.collection('products').doc(id).delete();
    return true;
  },

  // ==========================================
  // 4. Coupons & Promotions (/coupons/{code})
  // ==========================================
  async getCoupons() {
    const snapshot = await adminDb.collection('coupons').get();
    return snapshot.docs.map(doc => {
      const c = doc.data();
      return {
        id: doc.id,
        code: c.code || doc.id,
        description: c.description || '',
        discountType: 'percentage',
        discountValue: Number(c.discountPercent) || 5,
        minOrder: Number(c.minSpend) || 0,
        maxDiscount: Number(c.maxDiscount) || 3000,
        active: Boolean(c.isActive),
        expiresAt: c.expiresAt || '2026-12-31'
      };
    });
  },

  async validateCoupon(code: string, subtotal: number) {
    const cleanCode = code.toUpperCase().trim();
    const docRef = adminDb.collection('coupons').doc(cleanCode);
    const snap = await docRef.get();

    if (!snap.exists) {
      return { valid: false, error: 'Invalid promo code' };
    }

    const c = snap.data()!;
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

    let calculatedDiscount = Math.round((subtotal * (Number(c.discountPercent) || 5)) / 100);
    if (c.maxDiscount && calculatedDiscount > Number(c.maxDiscount)) {
      calculatedDiscount = Number(c.maxDiscount);
    }

    return {
      valid: true,
      code: c.code || cleanCode,
      discount: calculatedDiscount,
      promo: {
        id: docRef.id,
        code: c.code || cleanCode,
        description: c.description,
        discountType: 'percentage',
        discountValue: Number(c.discountPercent) || 5,
        minOrder: Number(c.minSpend) || 0,
        maxDiscount: Number(c.maxDiscount) || 3000,
        active: Boolean(c.isActive)
      }
    };
  },

  async createCoupon(data: any) {
    const cleanCode = data.code.toUpperCase().trim();
    const couponDoc = {
      code: cleanCode,
      description: data.description || 'Special Store Discount',
      discountPercent: Number(data.discountValue) || 5,
      maxDiscount: Number(data.maxDiscount) || 3000,
      minSpend: Number(data.minOrder) || 0,
      isActive: true,
      expiresAt: data.expiresAt || '2026-12-31',
      usedCount: 0,
      createdAt: new Date().toISOString()
    };

    await adminDb.collection('coupons').doc(cleanCode).set(couponDoc);
    return {
      id: cleanCode,
      code: cleanCode,
      description: couponDoc.description,
      discountType: 'percentage',
      discountValue: couponDoc.discountPercent,
      minOrder: couponDoc.minSpend,
      active: true
    };
  },

  async deleteCoupon(id: string | number) {
    await adminDb.collection('coupons').doc(String(id).toUpperCase()).delete();
    return true;
  },

  // ==========================================
  // 5. Cart (Firestore /carts/{userId})
  // ==========================================
  async getOrCreateCart(userId?: string | number, sessionId?: string) {
    const cartKey = userId ? `user_${userId}` : `ses_${sessionId || 'guest'}`;
    const cartRef = adminDb.collection('carts').doc(cartKey);
    const snap = await cartRef.get();

    if (snap.exists) {
      return { id: snap.id, ...snap.data() } as any;
    }

    const newCart = {
      id: cartKey,
      userId: userId || null,
      sessionId: sessionId || null,
      items: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await cartRef.set(newCart);
    return newCart;
  },

  async getCartWithItems(cartId: string, userId?: string | number) {
    const cartRef = adminDb.collection('carts').doc(cartId);
    const snap = await cartRef.get();
    if (!snap.exists) return null;

    const cart = snap.data()!;
    if (cart.userId && userId && String(cart.userId) !== String(userId)) {
      throw new Error('Unauthorized: Cannot access another customer cart');
    }

    const items = cart.items || [];
    let subtotal = 0;

    const formattedItems = await Promise.all(items.map(async (item: any) => {
      const prod = await this.getProductById(item.productId);
      const price = prod ? prod.price : item.price || 0;
      const itemSubtotal = price * item.quantity;
      subtotal += itemSubtotal;
      return {
        id: item.productId,
        productId: item.productId,
        title: prod?.title || item.title || 'Product',
        sku: prod?.sku || item.sku || '',
        price,
        originalPrice: prod?.originalPrice || price,
        image: prod?.image || item.image || '',
        quantity: item.quantity,
        stock: prod?.stock ?? 0,
        extendedCare: Boolean(item.extendedCare),
        dataMigration: Boolean(item.dataMigration),
        itemTotal: itemSubtotal
      };
    }));

    const protectionFee = formattedItems.some(i => i.extendedCare) ? 1499 : 0;
    const total = subtotal + protectionFee;

    return {
      id: cartId,
      userId: cart.userId,
      items: formattedItems,
      subtotal,
      protectionFee,
      total,
      itemCount: formattedItems.reduce((acc: number, i: any) => acc + i.quantity, 0)
    };
  },

  async addToCart(cartId: string, productId: string, quantity: number, options?: { extendedCare?: boolean; dataMigration?: boolean }) {
    const cartRef = adminDb.collection('carts').doc(cartId);
    const prod = await this.getProductById(productId);
    if (!prod) throw new Error('Product not found in catalog');

    await adminDb.runTransaction(async (tx) => {
      const snap = await tx.get(cartRef);
      const items: any[] = snap.exists ? (snap.data()?.items || []) : [];
      const idx = items.findIndex((i: any) => i.productId === productId);

      if (idx > -1) {
        items[idx].quantity += quantity;
        if (options?.extendedCare !== undefined) items[idx].extendedCare = options.extendedCare;
        if (options?.dataMigration !== undefined) items[idx].dataMigration = options.dataMigration;
      } else {
        items.push({
          productId,
          quantity,
          extendedCare: Boolean(options?.extendedCare),
          dataMigration: Boolean(options?.dataMigration)
        });
      }

      tx.set(cartRef, { items, updatedAt: new Date().toISOString() }, { merge: true });
    });

    return this.getCartWithItems(cartId);
  },

  async updateCartItem(cartId: string, itemId: string | number, quantity: number) {
    const cartRef = adminDb.collection('carts').doc(cartId);
    await adminDb.runTransaction(async (tx) => {
      const snap = await tx.get(cartRef);
      if (!snap.exists) throw new Error('Cart not found');
      let items: any[] = snap.data()?.items || [];
      if (quantity <= 0) {
        items = items.filter((i: any) => i.productId !== String(itemId));
      } else {
        const item = items.find((i: any) => i.productId === String(itemId));
        if (item) item.quantity = quantity;
      }
      tx.update(cartRef, { items, updatedAt: new Date().toISOString() });
    });
    return this.getCartWithItems(cartId);
  },

  async removeCartItem(cartId: string, itemId: string | number) {
    return this.updateCartItem(cartId, itemId, 0);
  },

  async clearCart(cartId: string) {
    const cartRef = adminDb.collection('carts').doc(cartId);
    await cartRef.set({ items: [], updatedAt: new Date().toISOString() }, { merge: true });
    return this.getCartWithItems(cartId);
  },

  // ==========================================
  // 6. Orders & Atomic Transactions (/orders/{orderId})
  // ==========================================
  async createOrder(data: {
    userId?: string | number;
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

    // Atomic Firestore ACID transaction: Reads all documents first, then performs atomic commits
    return await adminDb.runTransaction(async (transaction) => {
      let serverSubtotal = 0;
      const verifiedItems: any[] = [];
      const fetchedProducts: { ref: any; snap: any; item: any }[] = [];

      // 1. ALL READS: Fetch products
      for (const item of data.items) {
        const prodRef = adminDb.collection('products').doc(item.productId);
        const prodSnap = await transaction.get(prodRef);

        if (!prodSnap.exists) {
          throw new Error(`Product ${item.productId} not found in catalog`);
        }

        const prod = prodSnap.data()!;
        const currentStock = Number(prod.stock ?? 0);

        if (currentStock < item.quantity) {
          throw new Error(`Insufficient stock for "${prod.title}". Only ${currentStock} remaining.`);
        }

        fetchedProducts.push({ ref: prodRef, snap: prodSnap, item });

        const itemTotal = Number(prod.price) * item.quantity;
        serverSubtotal += itemTotal;

        verifiedItems.push({
          productId: prodSnap.id,
          title: prod.title,
          sku: prod.sku,
          price: Number(prod.price),
          image: prod.image || '',
          quantity: item.quantity,
          extendedCare: Boolean(item.extendedCare),
          dataMigration: Boolean(item.dataMigration)
        });
      }

      // 2. ALL READS: Fetch promo coupon if provided
      let discount = 0;
      let promoRef: any = null;
      let cleanPromo = '';
      let promoSnap: any = null;

      if (data.promoCodeUsed) {
        cleanPromo = data.promoCodeUsed.toUpperCase().trim();
        promoRef = adminDb.collection('coupons').doc(cleanPromo);
        promoSnap = await transaction.get(promoRef);

        if (promoSnap.exists && promoSnap.data()?.isActive) {
          const c = promoSnap.data()!;
          if (serverSubtotal >= (Number(c.minSpend) || 0)) {
            discount = Math.round((serverSubtotal * (Number(c.discountPercent) || 5)) / 100);
            if (c.maxDiscount && discount > Number(c.maxDiscount)) {
              discount = Number(c.maxDiscount);
            }
          }
        }
      }

      // 3. ALL READS COMPLETED: Calculate Totals
      const protectionFee = verifiedItems.some(i => i.extendedCare) ? 1499 : 0;
      const deliveryFee = data.fulfillment === 'courier_express' ? 499 : 0;
      const tax = 0;
      const total = Math.max(0, serverSubtotal + protectionFee + deliveryFee + tax - discount);
      const isStoreCash = (data.paymentMethod === 'store_pickup_cash');

      // 4. ALL WRITES: Decrement product inventory
      for (const fp of fetchedProducts) {
        transaction.update(fp.ref, {
          stock: FieldValue.increment(-fp.item.quantity),
          updatedAt: new Date().toISOString()
        });
      }

      // 5. ALL WRITES: Record promo usage if valid
      if (promoRef && promoSnap && promoSnap.exists && discount > 0) {
        transaction.update(promoRef, {
          usedCount: FieldValue.increment(1)
        });

        const usageRef = adminDb.collection('coupon_usages').doc();
        transaction.set(usageRef, {
          couponId: cleanPromo,
          userId: data.userId || null,
          orderId,
          discountAmount: discount,
          usedAt: new Date().toISOString()
        });
      }

      // Construct formatted delivery address snapshot
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


      const orderPayload = {
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
        paymentMethod: data.paymentMethod === 'upi_online' ? 'upi_online' : 'store_pickup_cash',
        items: verifiedItems,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const orderRef = adminDb.collection('orders').doc(orderId);
      transaction.set(orderRef, orderPayload);

      // Create initial payment record
      const paymentRef = adminDb.collection('payments').doc(`pay_${crypto.randomUUID()}`);
      transaction.set(paymentRef, {
        id: paymentRef.id,
        orderId,
        amount: total,
        currency: 'INR',
        method: data.paymentMethod || 'store_pickup_cash',
        status: 'pending',
        createdAt: new Date().toISOString()
      });

      // Update user profile address in Firestore if logged in
      if (data.userId) {
        const userRef = adminDb.collection('users').doc(String(data.userId));
        transaction.set(userRef, {
          name: data.customerName.trim(),
          phone: data.customerPhone.trim(),
          address: deliveryAddress,
          addressLine1: data.addressLine1?.trim() || '',
          addressLine2: data.addressLine2?.trim() || '',
          city: (data.city || 'Kumta').trim(),
          state: (data.state || 'Karnataka').trim(),
          postalCode: (data.postalCode || data.pincode || '581343').trim(),
          updatedAt: new Date().toISOString()
        }, { merge: true });
      }

      return orderPayload;
    });
  },

  async getOrders(params?: { userId?: string | number; role?: string }) {
    let query: any = adminDb.collection('orders').orderBy('createdAt', 'desc');

    if (params?.role === 'CUSTOMER' && params.userId) {
      query = adminDb.collection('orders').where('userId', '==', params.userId).orderBy('createdAt', 'desc');
    }

    const snap = await query.get();
    return snap.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));
  },

  async updateOrderStatus(id: string, status: string) {
    let orderRef = adminDb.collection('orders').doc(id);
    let snap = await orderRef.get();

    if (!snap.exists) {
      const qSnap = await adminDb.collection('orders').where('orderNumber', '==', id).limit(1).get();
      if (qSnap.empty) return null;
      orderRef = qSnap.docs[0].ref;
    }

    await orderRef.update({
      status,
      updatedAt: new Date().toISOString()
    });

    const updated = await orderRef.get();
    return { id: updated.id, ...updated.data() };
  },

  async getOrderById(orderId: string, userId?: string | number, role?: string) {
    let orderRef = adminDb.collection('orders').doc(orderId);
    let snap = await orderRef.get();

    if (!snap.exists) {
      const qSnap = await adminDb.collection('orders').where('orderNumber', '==', orderId).limit(1).get();
      if (qSnap.empty) return null;
      snap = qSnap.docs[0];
    }

    const order = snap.data()!;
    if (role !== 'ADMIN' && role !== 'OWNER') {
      if (order.userId && userId && String(order.userId) !== String(userId)) {
        throw new Error('Unauthorized: You cannot access another customer order');
      }
    }

    return { id: snap.id, ...order };
  },

  // ==========================================
  // 7. Razorpay Payments Integration
  // ==========================================
  async createRazorpayOrder(orderId: string) {
    const order = await this.getOrderById(orderId);
    if (!order) throw new Error('Order not found');

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
        console.error('Razorpay SDK notice, using order ID:', err.message);
      }
    }

    await adminDb.collection('payment_attempts').add({
      orderId,
      razorpayOrderId,
      amount: order.total,
      status: 'initiated',
      createdAt: new Date().toISOString()
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
    // 1. Replay prevention check in Firestore
    const existing = await adminDb.collection('payments')
      .where('razorpayPaymentId', '==', data.razorpayPaymentId)
      .where('status', '==', 'successful')
      .limit(1)
      .get();

    if (!existing.empty) {
      throw new Error('Duplicate payment verification: This payment has already been processed');
    }

    const order = await this.getOrderById(data.orderId);
    if (!order) throw new Error('Order not found for payment verification');

    if (order.paymentStatus === 'paid') {
      return { success: true, message: 'Order is already marked as paid' };
    }

    // 2. Cryptographic signature check
    const secret = process.env.RAZORPAY_KEY_SECRET;
    let isValid = true;
    if (secret && data.razorpaySignature) {
      const generated = crypto.createHmac('sha256', secret)
        .update(`${data.razorpayOrderId}|${data.razorpayPaymentId}`)
        .digest('hex');
      isValid = generated === data.razorpaySignature;
    }

    if (!isValid) {
      throw new Error('Razorpay signature verification failed');
    }

    // 3. Commit payment to Firestore
    const orderRef = adminDb.collection('orders').doc(data.orderId);
    await orderRef.update({
      paymentStatus: 'paid',
      status: 'confirmed',
      updatedAt: new Date().toISOString()
    });

    const paymentId = data.razorpayPaymentId || `pay_${crypto.randomUUID()}`;
    await adminDb.collection('payments').doc(paymentId).set({
      id: paymentId,
      orderId: data.orderId,
      amount: order.total,
      currency: 'INR',
      method: 'razorpay',
      status: 'successful',
      razorpayOrderId: data.razorpayOrderId,
      razorpayPaymentId: data.razorpayPaymentId,
      razorpaySignature: data.razorpaySignature || null,
      verifiedAt: new Date().toISOString(),
      createdAt: new Date().toISOString()
    });

    return { success: true, message: 'Payment verified and committed to database' };
  },

  // ==========================================
  // 8. Repairs & Status Tracking (/repairs/{ticketId})
  // ==========================================
  async getRepairs(params?: { userId?: string | number; role?: string }) {
    let query: any = adminDb.collection('repairs').orderBy('createdAt', 'desc');

    if (params?.role === 'CUSTOMER' && params.userId) {
      query = adminDb.collection('repairs').where('userId', '==', params.userId).orderBy('createdAt', 'desc');
    }

    const snap = await query.get();
    return snap.docs.map((doc: any) => {
      const r = doc.data();
      return {
        id: doc.id,
        ticketNumber: r.ticketNumber,
        customerName: r.customerName,
        customerPhone: r.customerPhone,
        deviceModel: r.deviceModel,
        issueCategory: r.deviceType || 'laptop',
        issueDetails: r.issueDescription,
        estimatedCost: r.estimatedCost || 0,
        status: r.status,
        technicianNotes: r.technicianNotes || '',
        createdAt: r.createdAt
      };
    });
  },

  async getRepairByTicket(ticketNumber: string) {
    const clean = ticketNumber.trim().toUpperCase();
    const snap = await adminDb.collection('repairs')
      .where('ticketNumber', '==', clean)
      .limit(1)
      .get();

    if (snap.empty) {
      const docSnap = await adminDb.collection('repairs').doc(ticketNumber).get();
      if (!docSnap.exists) return null;
      const r = docSnap.data()!;
      return { id: docSnap.id, ...r };
    }

    const r = snap.docs[0].data();
    return {
      id: snap.docs[0].id,
      ticketNumber: r.ticketNumber,
      customerName: r.customerName,
      customerPhone: r.customerPhone,
      deviceModel: r.deviceModel,
      issueCategory: r.deviceType || 'laptop',
      issueDetails: r.issueDescription,
      estimatedCost: r.estimatedCost || 0,
      status: r.status,
      technicianNotes: r.technicianNotes || '',
      createdAt: r.createdAt,
      history: (r.history || []).map((h: any) => ({
        stage: h.newStatus,
        note: h.note,
        date: h.createdAt
      }))
    };
  },

  async createRepairTicket(data: any) {
    const id = `rep_${crypto.randomUUID()}`;
    const ticketNumber = `SYS-REP-${Math.floor(1000 + Math.random() * 9000)}`;

    const repairDoc = {
      id,
      ticketNumber,
      customerName: data.customerName.trim(),
      customerPhone: data.customerPhone.trim(),
      deviceType: data.deviceType || 'Laptop',
      deviceBrand: data.deviceModel?.split(' ')[0] || 'Generic',
      deviceModel: data.deviceModel?.trim() || 'Showroom Device',
      issueDescription: data.issueDetails || data.issueCategory || 'General Service Checkup',
      estimatedCost: Number(data.estimatedCost) || 1200,
      technicianNotes: data.technicianNotes || 'Device logged at Kumta counter bench.',
      status: 'diagnosing',
      history: [
        {
          previousStatus: null,
          newStatus: 'diagnosing',
          note: 'Device logged into Kumta queue. Free initial bench check pending.',
          updatedBy: 'Technician Staff',
          createdAt: new Date().toISOString()
        }
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await adminDb.collection('repairs').doc(id).set(repairDoc);

    return {
      id,
      ticketNumber,
      customerName: repairDoc.customerName,
      customerPhone: repairDoc.customerPhone,
      deviceModel: repairDoc.deviceModel,
      issueCategory: repairDoc.deviceType,
      issueDetails: repairDoc.issueDescription,
      estimatedCost: repairDoc.estimatedCost,
      status: repairDoc.status,
      technicianNotes: repairDoc.technicianNotes,
      createdAt: repairDoc.createdAt
    };
  },

  async updateRepairTicket(id: string, updates: any) {
    let repairRef = adminDb.collection('repairs').doc(id);
    let snap = await repairRef.get();

    if (!snap.exists) {
      const qSnap = await adminDb.collection('repairs').where('ticketNumber', '==', id.toUpperCase()).limit(1).get();
      if (qSnap.empty) return null;
      repairRef = qSnap.docs[0].ref;
      snap = qSnap.docs[0];
    }

    const current = snap.data()!;
    const oldStatus = current.status;
    const newStatus = updates.status || oldStatus;
    const history = current.history || [];

    if (newStatus !== oldStatus) {
      history.push({
        previousStatus: oldStatus,
        newStatus,
        note: updates.technicianNotes || `Status updated to ${newStatus}`,
        updatedBy: 'Technician Staff',
        createdAt: new Date().toISOString()
      });
    }

    await repairRef.update({
      status: newStatus,
      technicianNotes: updates.technicianNotes !== undefined ? updates.technicianNotes : current.technicianNotes,
      estimatedCost: updates.estimatedCost !== undefined ? Number(updates.estimatedCost) : current.estimatedCost,
      history,
      updatedAt: new Date().toISOString()
    });

    return this.getRepairByTicket(current.ticketNumber);
  },

  // ==========================================
  // 9. Inquiries & Notifications
  // ==========================================
  async getInquiries() {
    const snap = await adminDb.collection('contact_inquiries').orderBy('createdAt', 'desc').get();
    return snap.docs.map(doc => {
      const d = doc.data();
      return {
        id: doc.id,
        name: d.name,
        email: d.email,
        phone: d.phone,
        subject: d.subject,
        message: d.message,
        read: d.status === 'resolved',
        createdAt: d.createdAt
      };
    });
  },

  async createInquiry(data: any) {
    const docRef = adminDb.collection('contact_inquiries').doc();
    const payload = {
      name: data.name.trim(),
      email: data.email.trim().toLowerCase(),
      phone: data.phone?.trim() || '',
      subject: data.subject?.trim() || 'Store Inquiry',
      message: data.message.trim(),
      status: 'unread',
      createdAt: new Date().toISOString()
    };
    await docRef.set(payload);
    return { id: docRef.id, ...payload, read: false };
  },

  async markInquiryRead(id: string | number) {
    await adminDb.collection('contact_inquiries').doc(String(id)).update({ status: 'resolved' });
    return true;
  },

  async getNotifications() {
    const snap = await adminDb.collection('notifications').orderBy('createdAt', 'desc').get();
    return snap.docs.map(doc => {
      const d = doc.data();
      return {
        id: doc.id,
        title: d.title,
        message: d.message,
        type: d.type || 'order',
        read: Boolean(d.isRead),
        createdAt: d.createdAt
      };
    });
  },

  async markNotificationRead(id: string | number) {
    await adminDb.collection('notifications').doc(String(id)).update({ isRead: true });
    return true;
  },

  async markAllNotificationsRead() {
    const snap = await adminDb.collection('notifications').where('isRead', '==', false).get();
    const batch = adminDb.batch();
    snap.docs.forEach(doc => batch.update(doc.ref, { isRead: true }));
    await batch.commit();
    return true;
  },

  async deleteNotification(id: string | number) {
    await adminDb.collection('notifications').doc(String(id)).delete();
    return true;
  },

  async clearNotifications() {
    const snap = await adminDb.collection('notifications').get();
    const batch = adminDb.batch();
    snap.docs.forEach(doc => batch.delete(doc.ref));
    await batch.commit();
    return true;
  },

  // ==========================================
  // 10. Live Store Analytics
  // ==========================================
  async getLiveAnalytics() {
    const ordersSnap = await adminDb.collection('orders').get();
    let totalRevenue = 0;
    ordersSnap.docs.forEach(doc => {
      const o = doc.data();
      totalRevenue += Number(o.total || 0);
    });

    const prodsSnap = await adminDb.collection('products').get();
    let lowStockCount = 0;
    prodsSnap.docs.forEach(doc => {
      const p = doc.data();
      if (Number(p.stock ?? 5) <= Number(p.lowStockThreshold ?? 2)) {
        lowStockCount++;
      }
    });

    const repairsSnap = await adminDb.collection('repairs')
      .where('status', '!=', 'delivered')
      .get();

    return {
      totalRevenue,
      ordersCount: ordersSnap.size,
      catalogItems: prodsSnap.size,
      activeRepairs: repairsSnap.size,
      lowStockAlerts: lowStockCount
    };
  },

  // ==========================================
  // 11. Image Upload to Firebase Cloud Storage
  // ==========================================
  async uploadImage(imageData: string, name?: string): Promise<{ url: string; name: string }> {
    if (!imageData) throw new Error('Image data is required');

    // 1. Validation: Max 5MB
    if (typeof imageData === 'string' && imageData.length > 7 * 1024 * 1024) {
      throw new Error('Image exceeds maximum size limit of 5MB');
    }

    let buffer: Buffer;
    let mimeType = 'image/jpeg';
    let ext = 'jpg';

    if (imageData.startsWith('data:')) {
      const match = imageData.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
      if (!match) throw new Error('Invalid base64 image data');
      mimeType = match[1];
      if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(mimeType)) {
        throw new Error('Invalid image format. Supported formats: JPEG, PNG, WEBP, GIF.');
      }
      ext = mimeType.split('/')[1] === 'jpeg' ? 'jpg' : mimeType.split('/')[1];
      buffer = Buffer.from(match[2], 'base64');
    } else if (imageData.startsWith('http://') || imageData.startsWith('https://')) {
      // Remote image URL passed directly
      return { url: imageData, name: name || 'product-image.jpg' };
    } else {
      buffer = Buffer.from(imageData, 'base64');
    }

    // 2. Safe file name & path in Firebase Storage
    const safeName = (name || 'product')
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .toLowerCase();
    const destination = `products/${Date.now()}_${safeName.endsWith(`.${ext}`) ? safeName : `${safeName}.${ext}`}`;

    const file = adminBucket.file(destination);
    await file.save(buffer, {
      metadata: {
        contentType: mimeType,
        metadata: { uploadedBy: 'SystechAdmin' }
      }
    });

    // Make public for product catalog CDN serving per storage.rules
    await file.makePublic().catch(() => {});
    const publicUrl = `https://storage.googleapis.com/${adminBucket.name}/${destination}`;

    return { url: publicUrl, name: safeName };
  }
};
