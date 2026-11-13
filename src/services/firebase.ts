import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  signInWithCustomToken,
  createUserWithEmailAndPassword,
  sendEmailVerification,
  signOut,
  onAuthStateChanged,
  updateProfile,
  User as FirebaseUser
} from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase
export const firebaseApp = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const firebaseAuth = getAuth(firebaseApp);
export const firestoreDb = getFirestore(
  firebaseApp,
  firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId !== '(default)'
    ? firebaseConfig.firestoreDatabaseId
    : undefined
);

// Configure Google Provider
export const googleAuthProvider = new GoogleAuthProvider();
googleAuthProvider.setCustomParameters({
  prompt: 'select_account'
});

// Test connection on startup per Firebase Skill
async function testConnection() {
  try {
    await getDocFromServer(doc(firestoreDb, 'test', 'connection'));
  } catch (error: any) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('[Firebase] Client is offline or database initializing.');
    }
  }
}
testConnection();

// Sync user document in Firestore
export async function syncUserToFirestore(
  user: FirebaseUser,
  additionalInfo?: { role?: 'admin' | 'customer'; name?: string; phone?: string }
) {
  try {
    const userRef = doc(firestoreDb, 'users', user.uid);
    const existingSnap = await getDoc(userRef);

    const email = user.email || '';
    const isAdmin =
      email.toLowerCase() === 'admin@systech.com' ||
      email.toLowerCase() === 'rajatnaik0541@gmail.com' ||
      additionalInfo?.role === 'admin';

    const role = existingSnap.exists()
      ? existingSnap.data()?.role || (isAdmin ? 'admin' : 'customer')
      : (isAdmin ? 'admin' : 'customer');

    const profileData = {
      id: user.uid,
      email: user.email || '',
      name: additionalInfo?.name || user.displayName || user.email?.split('@')[0] || 'User',
      role,
      avatar: user.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(user.displayName || user.email || 'User')}`,
      emailVerified: user.emailVerified,
      phone: additionalInfo?.phone || user.phoneNumber || '',
      updatedAt: new Date().toISOString()
    };

    await setDoc(userRef, profileData, { merge: true });
    return profileData;
  } catch (err) {
    console.error('[Firebase] Failed to sync user to Firestore:', err);
    return null;
  }
}

// Real Google Sign-In with popup
export async function signInWithGoogleReal() {
  const result = await signInWithPopup(firebaseAuth, googleAuthProvider);
  const user = result.user;
  const profile = await syncUserToFirestore(user);
  return { user, profile };
}

// Real Email + Password Registration with real Firebase Email Verification
export async function registerWithEmailAndPasswordReal(email: string, pass: string, name: string, phone?: string) {
  const userCred = await createUserWithEmailAndPassword(firebaseAuth, email, pass);
  if (name) {
    await updateProfile(userCred.user, { displayName: name });
  }
  // Send real Firebase email verification
  try {
    await sendEmailVerification(userCred.user);
  } catch (e) {
    console.warn('[Firebase] Email verification send notice:', e);
  }

  const profile = await syncUserToFirestore(userCred.user, { name, phone });
  return { user: userCred.user, profile };
}

// Real Email + Password Sign In
export async function signInWithEmailAndPasswordReal(email: string, pass: string) {
  const userCred = await signInWithEmailAndPassword(firebaseAuth, email, pass);
  const profile = await syncUserToFirestore(userCred.user);
  return { user: userCred.user, profile };
}

// Real Sign Out
export async function signOutReal() {
  await signOut(firebaseAuth);
}

// Send Real Firebase Email Verification to current user
export async function sendEmailVerificationReal() {
  if (firebaseAuth.currentUser) {
    await sendEmailVerification(firebaseAuth.currentUser);
    return true;
  }
  return false;
}

// Sign In with Firebase Custom Token
export async function signInWithCustomTokenReal(token: string) {
  const userCred = await signInWithCustomToken(firebaseAuth, token);
  const profile = await syncUserToFirestore(userCred.user);
  return { user: userCred.user, profile };
}
