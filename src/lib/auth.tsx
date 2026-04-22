/// <reference types="vite/client" />
import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  onAuthStateChanged, 
  signOut, 
  User as FirebaseUser,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  getAuth
} from 'firebase/auth';
import { initializeApp, deleteApp } from 'firebase/app';
import { doc, getDoc, setDoc, updateDoc, onSnapshot } from 'firebase/firestore';
import { auth, db, testConnection, firebaseConfig } from '../firebase';

interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  role: 'admin' | 'teacher' | 'staff' | 'super_admin';
  isSuperAdmin?: boolean;
  institution?: string;
  institutionId?: string;
  subscriptionPlan?: 'free' | 'basic' | 'standard' | 'advanced';
  subscriptionExpiry?: string;
  lastLogin?: string;
  dismissedNotifications?: string[];
}

interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  authError: string | null;
  loginWithEmail: (email: string, pass: string) => Promise<void>;
  signup: (email: string, pass: string, institutionName: string) => Promise<void>;
  createStaffAccount: (email: string, pass: string) => Promise<string>;
  logout: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    testConnection();
    let unsubscribeDoc: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Listen for user profile changes in Firestore
        unsubscribeDoc = onSnapshot(doc(db, 'users', firebaseUser.uid), async (userDoc) => {
          try {
            setAuthError(null);
            if (userDoc.exists()) {
              let userData = userDoc.data() as UserProfile;
              
              // Ensure Super Admin status is synced
              const superAdminEmails = [
                'managemybatch@gmail.com',
                'pallistoreinfo@gmail.com',
                'admin@managemybatch.com'
              ];
              const userEmail = firebaseUser.email?.toLowerCase() || '';
              const shouldBeSuperAdmin = superAdminEmails.includes(userEmail);
              
              if (shouldBeSuperAdmin && !userData.isSuperAdmin) {
                await updateDoc(doc(db, 'users', firebaseUser.uid), { isSuperAdmin: true, role: 'super_admin' });
                return;
              }

              // Update last login (once per 24 hours to avoid excessive writes)
              const today = new Date().toISOString().split('T')[0];
              if (userData.lastLogin !== today) {
                await updateDoc(doc(db, 'users', firebaseUser.uid), { lastLogin: today });
              }

              // Check for subscription expiry with 5-day grace period
              if (userData.role === 'admin' && userData.subscriptionPlan !== 'free' && userData.subscriptionExpiry) {
                const expiryDate = new Date(userData.subscriptionExpiry);
                const gracePeriodExpiry = new Date(expiryDate);
                gracePeriodExpiry.setDate(gracePeriodExpiry.getDate() + 5);
                
                if (gracePeriodExpiry < new Date()) {
                  await updateDoc(doc(db, 'users', firebaseUser.uid), { subscriptionPlan: 'free' });
                  return;
                }
              }
              
              setUser(userData);
              setLoading(false);
            } else {
              // Create new profile
              const superAdminEmails = [
                'managemybatch@gmail.com',
                'pallistoreinfo@gmail.com',
                'admin@managemybatch.com'
              ];
              const userEmail = firebaseUser.email?.toLowerCase() || '';
              const isSuperAdmin = superAdminEmails.includes(userEmail);
              
              const newProfile: UserProfile = {
                uid: firebaseUser.uid,
                email: userEmail,
                displayName: firebaseUser.displayName || '',
                photoURL: firebaseUser.photoURL || '',
                role: isSuperAdmin ? 'super_admin' : 'admin',
                isSuperAdmin,
                institutionId: firebaseUser.uid,
                subscriptionPlan: 'free',
                dismissedNotifications: []
              };
              await setDoc(doc(db, 'users', firebaseUser.uid), newProfile);
            }
          } catch (err) {
            console.error("Error processing user profile:", err);
            setLoading(false);
          }
        }, (error) => {
          console.error("Firestore profile snapshot error:", error);
          if (error.message.includes('Quota exceeded') || error.message.includes('quota')) {
            setAuthError("Firebase Quota Limit Reached. Your database has hit its daily free read limit. Please wait until tomorrow for it to reset, or upgrade your Firebase plan.");
          } else {
            setAuthError(error.message);
          }
          setLoading(false);
        });
      } else {
        if (unsubscribeDoc) unsubscribeDoc();
        setUser(null);
        setLoading(false);
        setAuthError(null);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeDoc) unsubscribeDoc();
    };
  }, []);

  const loginWithEmail = async (email: string, pass: string) => {
    try {
      setAuthError(null);
      await signInWithEmailAndPassword(auth, email, pass);
    } catch (error: any) {
      console.error("Email login failed:", error);
      setAuthError(error.message);
      throw error;
    }
  };

  const signup = async (email: string, pass: string, institutionName: string) => {
    try {
      setAuthError(null);
      const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
      const firebaseUser = userCredential.user;
      
      const newProfile: UserProfile = {
        uid: firebaseUser.uid,
        email: email.toLowerCase(),
        displayName: institutionName,
        photoURL: '',
        role: 'admin',
        institution: institutionName,
        institutionId: firebaseUser.uid,
        subscriptionPlan: 'free',
        dismissedNotifications: []
      };
      
      await setDoc(doc(db, 'users', firebaseUser.uid), newProfile);
    } catch (error: any) {
      console.error("Signup failed:", error);
      setAuthError(error.message);
      throw error;
    }
  };

  const createStaffAccount = async (email: string, pass: string) => {
    // We use a secondary app instance to create the user without signing out the current admin
    const secondaryApp = initializeApp(firebaseConfig, 'Secondary');
    const secondaryAuth = getAuth(secondaryApp);
    try {
      const userCredential = await createUserWithEmailAndPassword(secondaryAuth, email, pass);
      const uid = userCredential.user.uid;
      await signOut(secondaryAuth);
      await deleteApp(secondaryApp);
      return uid;
    } catch (error) {
      await deleteApp(secondaryApp);
      console.error("Staff account creation failed:", error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      setAuthError(null);
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const clearError = () => setAuthError(null);

  return (
    <AuthContext.Provider value={{ user, loading, authError, loginWithEmail, signup, createStaffAccount, logout, clearError }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
