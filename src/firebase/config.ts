import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';

/**
 * Firebase Client Configuration
 * Derived cleanly from Vite environment variables.
 */
const getEnvVar = (key: string, fallback: string = ''): string => {
  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[key]) {
    return import.meta.env[key];
  }
  if (typeof process !== 'undefined' && process.env && process.env[key]) {
    return process.env[key] as string;
  }
  return fallback;
};

const firebaseConfig = {
  apiKey: getEnvVar('VITE_FIREBASE_API_KEY', 'AIzaSyDHnBLP4ucEHUJveO5fOr0glrjqRGKOxAI'),
  authDomain: getEnvVar('VITE_FIREBASE_AUTH_DOMAIN', 'finguard-ai-prototype.firebaseapp.com'),
  projectId: getEnvVar('VITE_FIREBASE_PROJECT_ID', 'finguard-ai-prototype'),
  storageBucket: getEnvVar('VITE_FIREBASE_STORAGE_BUCKET', 'finguard-ai-prototype.firebasestorage.app'),
  messagingSenderId: getEnvVar('VITE_FIREBASE_MESSAGING_SENDER_ID', '222304542392'),
  appId: getEnvVar('VITE_FIREBASE_APP_ID', '1:222304542392:web:96683b7fd14c9f8f269e4d'),
};

// Guard: verify project ID alignment with project specification
if (firebaseConfig.projectId !== 'finguard-ai-prototype') {
  console.warn(
    `[FinGuard AI] Warning: Expected project ID 'finguard-ai-prototype', received '${firebaseConfig.projectId}'`
  );
}

// Single initialization pattern to prevent duplicate app errors
const app: FirebaseApp = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const auth: Auth = getAuth(app);
const db: Firestore = getFirestore(app);

export { app, auth, db, firebaseConfig };
