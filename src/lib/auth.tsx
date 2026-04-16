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
  dismissedNotifications?: string[];
}

interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  loginWithEmail: (email: string, pass: string) => Promise<void>;
  signup: (email: string, pass: string, institutionName: string) => Promise<void>;
  createStaffAccount: (email: string, pass: string) => Promise<string>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    testConnection();
    let unsubscribeDoc: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Listen for user profile changes in Firestore
        unsubscribeDoc = onSnapshot(doc(db, 'users', firebaseUser.uid), async (userDoc) => {
          try {
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
                // The next snapshot will have the updated data
                return;
              }

              // Check for subscription expiry
              if (userData.role === 'admin' && userData.subscriptionPlan !== 'free' && userData.subscriptionExpiry) {
                const expiryDate = new Date(userData.subscriptionExpiry);
                if (expiryDate < new Date()) {
                  // Revert to free
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
              // We don't set loading to false here; we wait for the next snapshot
              // which will have the document we just created.
            }
          } catch (err) {
            console.error("Error processing user profile:", err);
            setLoading(false);
          }
        }, (error) => {
          console.error("Firestore profile snapshot error:", error);
          setLoading(false);
        });
      } else {
        if (unsubscribeDoc) unsubscribeDoc();
        setUser(null);
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeDoc) unsubscribeDoc();
    };
  }, []);

  const loginWithEmail = async (email: string, pass: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, pass);
    } catch (error) {
      console.error("Email login failed:", error);
      throw error;
    }
  };

  const signup = async (email: string, pass: string, institutionName: string) => {
    try {
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
    } catch (error) {
      console.error("Signup failed:", error);
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
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, loginWithEmail, signup, createStaffAccount, logout }}>
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
