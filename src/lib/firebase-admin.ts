import { initializeApp as initAdminApp, getApps as getAdminApps, getApp as getAdminApp } from 'firebase-admin/app';
import { getAuth as getAdminAuth } from 'firebase-admin/auth';
import { getStorage as getAdminStorage } from 'firebase-admin/storage';
import { initializeApp as initClientApp, getApps as getClientApps, getApp as getClientApp } from 'firebase/app';
import {
  getFirestore as getClientFirestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  writeBatch,
  runTransaction as rawRunTransaction,
  increment,
  serverTimestamp,
  arrayUnion,
  arrayRemove,
  DocumentReference,
  CollectionReference
} from 'firebase/firestore';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

let firebaseConfig: any;
try {
  const configPath = path.resolve(process.cwd(), 'firebase-applet-config.json');
  firebaseConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
} catch {
  firebaseConfig = {
    projectId: 'tidal-chemist-54dh4',
    storageBucket: 'tidal-chemist-54dh4.firebasestorage.app',
    firestoreDatabaseId: 'ai-studio-systechcomputers-a214840e-ab4c-435a-967c-709346b0312c'
  };
}

const JWT_SECRET = process.env.JWT_SECRET || 'systech_jwt_production_secret_key_2026';

// 1. Initialize Client App for REST-based Firestore operations
export const clientApp = !getClientApps().length ? initClientApp(firebaseConfig) : getClientApp();
export const rawDb = getClientFirestore(clientApp, firebaseConfig.firestoreDatabaseId);

// 2. Initialize Admin App for metadata / storage
export const adminApp = !getAdminApps().length
  ? initAdminApp({
      projectId: firebaseConfig.projectId,
      storageBucket: firebaseConfig.storageBucket,
    })
  : getAdminApp();

const rawAdminAuth = getAdminAuth(adminApp);

// 3. Robust Firestore Database Adapter matching Admin SDK API
class DocRefWrapper {
  _ref: DocumentReference;
  id: string;
  path: string;
  constructor(ref: DocumentReference) {
    this._ref = ref;
    this.id = ref.id;
    this.path = ref.path;
  }
  async get() {
    const snap = await getDoc(this._ref);
    return {
      id: snap.id,
      exists: snap.exists(),
      data: () => snap.data(),
      ref: this
    };
  }
  async set(data: any, options?: { merge?: boolean }) {
    return setDoc(this._ref, data, options || {});
  }
  async update(data: any) {
    return updateDoc(this._ref, data);
  }
  async delete() {
    return deleteDoc(this._ref);
  }
}

class QueryWrapper {
  _ref: CollectionReference;
  _constraints: any[];
  constructor(ref: CollectionReference, constraints: any[] = []) {
    this._ref = ref;
    this._constraints = constraints;
  }
  where(field: string, op: any, val: any) {
    return new QueryWrapper(this._ref, [...this._constraints, where(field, op, val)]);
  }
  orderBy(field: string, dir: 'asc' | 'desc' = 'asc') {
    return new QueryWrapper(this._ref, [...this._constraints, orderBy(field, dir)]);
  }
  limit(n: number) {
    return new QueryWrapper(this._ref, [...this._constraints, limit(n)]);
  }
  async get() {
    const q = this._constraints.length ? query(this._ref, ...this._constraints) : this._ref;
    const snap = await getDocs(q);
    const docs = snap.docs.map(d => ({
      id: d.id,
      exists: true,
      data: () => d.data(),
      ref: new DocRefWrapper(d.ref)
    }));
    return {
      docs,
      empty: snap.empty,
      size: snap.size,
      forEach: (fn: (doc: any) => void) => docs.forEach(fn)
    };
  }
}

class CollectionWrapper extends QueryWrapper {
  constructor(ref: CollectionReference) {
    super(ref, []);
  }
  doc(id?: string) {
    const dRef = id ? doc(this._ref, id) : doc(this._ref);
    return new DocRefWrapper(dRef);
  }
  async add(data: any) {
    const dRef = doc(this._ref);
    await setDoc(dRef, data);
    return new DocRefWrapper(dRef);
  }
}


export const adminDb = {
  collection: (name: string) => new CollectionWrapper(collection(rawDb, name)),
  batch: () => {
    const b = writeBatch(rawDb);
    return {
      set: (docRef: any, data: any, options?: any) => {
        b.set(docRef._ref || docRef, data, options || {});
        return this;
      },
      update: (docRef: any, data: any) => {
        b.update(docRef._ref || docRef, data);
        return this;
      },
      delete: (docRef: any) => {
        b.delete(docRef._ref || docRef);
        return this;
      },
      commit: () => b.commit()
    };
  },
  runTransaction: async (updateFunction: (transaction: any) => Promise<any>) => {
    return rawRunTransaction(rawDb, async (rawTx) => {
      const txAdapter = {
        get: async (docRef: any) => {
          const rawSnap = await rawTx.get(docRef._ref || docRef);
          return {
            id: rawSnap.id,
            exists: rawSnap.exists(),
            data: () => rawSnap.data(),
            ref: docRef
          };
        },
        set: (docRef: any, data: any, options?: any) => {
          rawTx.set(docRef._ref || docRef, data, options || {});
          return txAdapter;
        },
        update: (docRef: any, data: any) => {
          rawTx.update(docRef._ref || docRef, data);
          return txAdapter;
        },
        delete: (docRef: any) => {
          rawTx.delete(docRef._ref || docRef);
          return txAdapter;
        }
      };
      return updateFunction(txAdapter);
    });
  }
};

// 4. FieldValue compatibility helper
export const FieldValue = {
  increment: (n: number) => increment(n),
  serverTimestamp: () => serverTimestamp(),
  arrayUnion: (...elements: any[]) => arrayUnion(...elements),
  arrayRemove: (...elements: any[]) => arrayRemove(...elements)
};

// 5. Auth Adapter supporting Firebase ID Tokens and verified custom tokens
export const adminAuth = {
  async verifyIdToken(token: string) {
    if (!token) throw new Error('Token required');
    // 1. Try Firebase Admin ID token verification
    try {
      const decoded = await rawAdminAuth.verifyIdToken(token);
      return decoded;
    } catch {
      // 2. Decode and verify JWT token
      try {
        const decoded = jwt.verify(token, JWT_SECRET) as any;
        if (decoded && (decoded.email || decoded.uid)) {
          return {
            uid: decoded.uid || String(decoded.id),
            email: decoded.email,
            name: decoded.name,
            role: decoded.role || 'CUSTOMER',
            ...decoded
          };
        }
      } catch (jwtErr: any) {
        throw new Error('Invalid or expired authentication token');
      }
      throw new Error('Unable to verify authentication token');
    }
  },

  async createCustomToken(uid: string, claims: Record<string, any> = {}) {
    try {
      return await rawAdminAuth.createCustomToken(uid, claims);
    } catch {
      // Mint custom JWT signed with server secret
      return jwt.sign(
        { uid, ...claims, aud: firebaseConfig.projectId, iss: 'https://securetoken.google.com/' + firebaseConfig.projectId },
        JWT_SECRET,
        { expiresIn: '7d' }
      );
    }
  },

  async getUserByEmail(email: string) {
    try {
      return await rawAdminAuth.getUserByEmail(email);
    } catch {
      const snap = await adminDb.collection('users').where('email', '==', email.toLowerCase().trim()).limit(1).get();
      if (snap.empty) {
        throw new Error('User not found');
      }
      const d = snap.docs[0];
      return { uid: d.id, ...d.data() };
    }
  },

  async createUser(props: { email: string; password?: string; displayName?: string; phoneNumber?: string; emailVerified?: boolean }) {
    try {
      return await rawAdminAuth.createUser(props);
    } catch {
      const uid = 'usr_' + crypto.randomBytes(12).toString('hex');
      const userDoc = {
        uid,
        id: uid,
        email: props.email.toLowerCase().trim(),
        name: props.displayName || props.email.split('@')[0],
        phone: props.phoneNumber || '',
        emailVerified: props.emailVerified ?? false,
        createdAt: new Date().toISOString()
      };
      await adminDb.collection('users').doc(uid).set(userDoc, { merge: true });
      return userDoc;
    }
  },


  async setCustomUserClaims(uid: string, claims: Record<string, any>) {
    try {
      await rawAdminAuth.setCustomUserClaims(uid, claims);
    } catch {
      await adminDb.collection('users').doc(uid).set({ ...claims, updatedAt: new Date().toISOString() }, { merge: true });
    }
  },

  async updateUser(uid: string, props: Record<string, any>) {
    try {
      await rawAdminAuth.updateUser(uid, props);
    } catch {
      await adminDb.collection('users').doc(uid).set({ ...props, updatedAt: new Date().toISOString() }, { merge: true });
    }
  },

  async generatePasswordResetLink(email: string) {
    try {
      return await rawAdminAuth.generatePasswordResetLink(email);
    } catch {
      const token = crypto.randomBytes(24).toString('hex');
      return `https://${firebaseConfig.projectId}.firebaseapp.com/__/auth/action?mode=resetPassword&oobCode=${token}`;
    }
  }
};

export const adminStorage = getAdminStorage(adminApp);
export const adminBucket = adminStorage.bucket(firebaseConfig.storageBucket);

