import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  onAuthStateChanged,
  signInAnonymously as fbSignInAnonymously,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  signOut as fbSignOut,
  User,
} from 'firebase/auth';
import { auth } from '../firebase/config';
import { AuthUser } from '../types';

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  error: string | null;
  signInAnonymously: () => Promise<void>;
  signInWithEmail: (email: string, pass: string) => Promise<void>;
  signUpWithEmail: (email: string, pass: string, name?: string) => Promise<void>;
  signOut: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function mapFirebaseUser(user: User): AuthUser {
  return {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName || (user.isAnonymous ? 'Demo Investigator (Guest)' : user.email?.split('@')[0] || 'Investigator'),
    isAnonymous: user.isAnonymous,
  };
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      auth,
      (fbUser) => {
        if (fbUser) {
          setUser(mapFirebaseUser(fbUser));
        } else {
          setUser(null);
        }
        setLoading(false);
      },
      (err) => {
        console.error('[FinGuard Auth] Listener error:', err);
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const signInAnonymously = async () => {
    try {
      setLoading(true);
      setError(null);
      await fbSignInAnonymously(auth);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to authenticate anonymously';
      setError(msg);
      setLoading(false);
      throw err;
    }
  };

  const signInWithEmail = async (email: string, pass: string) => {
    try {
      setLoading(true);
      setError(null);
      await signInWithEmailAndPassword(auth, email, pass);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Invalid credentials';
      setError(msg);
      setLoading(false);
      throw err;
    }
  };

  const signUpWithEmail = async (email: string, pass: string, name?: string) => {
    try {
      setLoading(true);
      setError(null);
      const res = await createUserWithEmailAndPassword(auth, email, pass);
      if (name && res.user) {
        await updateProfile(res.user, { displayName: name });
        setUser((prev) => (prev ? { ...prev, displayName: name } : null));
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create investigator account';
      setError(msg);
      setLoading(false);
      throw err;
    }
  };

  const signOut = async () => {
    try {
      setLoading(true);
      await fbSignOut(auth);
      setUser(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to sign out';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const clearError = () => setError(null);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        error,
        signInAnonymously,
        signInWithEmail,
        signUpWithEmail,
        signOut,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
