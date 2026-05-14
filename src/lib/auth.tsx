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
  teacherId?: string;
  institution?: string;
  institutionId?: string;
  subscriptionPlan?: 'free' | 'basic' | 'standard' | 'advanced';
  subscriptionExpiry?: string;
  lastLogin?: string;
  dismissedNotifications?: string[];
  phone?: string;
  institutionName?: string;
  monthlySmsSent?: number;
  aiCredits?: number;
  hasReceivedInitialCredits?: boolean;
  isPromoUser?: boolean;
  isNewUser?: boolean;
  status?: string;
  isBlacklisted?: boolean;
}

interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  authError: string | null;
  loginWithEmail: (email: string, pass: string) => Promise<void>;
  signup: (email: string, pass: string, institutionName: string, phone: string) => Promise<void>;
  createStaffAccount: (email: string, pass: string) => Promise<string>;
  logout: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const SUPER_ADMIN_EMAILS = [
  'managemybatch@gmail.com'
];

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    testConnection();
    let unsubscribeDoc: (() => void) | null = null;
    
    // Safety timeout to prevent infinite loading if Firebase initialization hangs
    const loadingTimeout = setTimeout(() => {
      if (loading) {
        console.warn("Auth initialization timed out after 10 seconds. Forcing loading to false.");
        setLoading(false);
      }
    }, 10000);

    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      clearTimeout(loadingTimeout);
      if (firebaseUser) {
        // Listen for user profile changes in Firestore
        unsubscribeDoc = onSnapshot(doc(db, 'users', firebaseUser.uid), async (userDoc) => {
          try {
            setAuthError(null);
            if (userDoc.exists()) {
              let userData = userDoc.data() as UserProfile;
              
              // Check for deleted/blacklisted status
              if (userData.status === 'deleted' || userData.isBlacklisted) {
                await signOut(auth);
                setUser(null);
                setLoading(false);
                return;
              }

              // DATA SYNC: Ensure displayName/institution mismatch is fixed
              // If displayName is missing or is just an email, but institution name exists, fix it
              let currentName = userData.displayName;
              let currentPhone = userData.phone;
              let needsUpdate = false;

              // Check institution doc for missing info
              if (userData.role === 'admin' || userData.role === 'super_admin') {
                try {
                  const instDoc = await getDoc(doc(db, 'institutions', firebaseUser.uid));
                  if (instDoc.exists()) {
                    const instData = instDoc.data();
                    if ((!currentName || currentName.includes('@')) && instData.name) {
                      currentName = instData.name;
                      needsUpdate = true;
                    }
                    if (!currentPhone && instData.phone) {
                      currentPhone = instData.phone;
                      needsUpdate = true;
                    }

                    // Update local userData object for immediate use
                    userData.displayName = currentName;
                    userData.phone = currentPhone;

                    // Sync back to Firestore if we found missing data
                    if (needsUpdate) {
                      await updateDoc(doc(db, 'users', firebaseUser.uid), {
                        displayName: currentName,
                        phone: currentPhone,
                        institution: currentName
                      });
                    }
                  } else {
                    // Force create institution doc if missing
                    await setDoc(doc(db, 'institutions', firebaseUser.uid), {
                      id: firebaseUser.uid,
                      name: currentName || firebaseUser.displayName || '',
                      phone: currentPhone || '',
                      email: userData.email,
                      subscriptionPlan: userData.subscriptionPlan || 'basic',
                      subscriptionExpiry: userData.subscriptionExpiry || null,
                      createdAt: userData.lastLogin || new Date().toISOString()
                    }, { merge: true });
                  }
                } catch (e) {
                  console.error("Silent error syncing institution doc:", e);
                }
              }

              const hasCleanName = currentName && !currentName.includes('@');
              const potentialName = userData.institution || userData.institutionName;
              
              if ((!hasCleanName) && potentialName) {
                await updateDoc(doc(db, 'users', firebaseUser.uid), { 
                  displayName: potentialName,
                  institution: potentialName // sync legacy field if needed
                });
                userData.displayName = potentialName;
              }
              
              // Ensure Super Admin status is synced
              const userEmail = firebaseUser.email?.toLowerCase() || '';
              const shouldBeSuperAdmin = SUPER_ADMIN_EMAILS.includes(userEmail);
              
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
              // NO DOC EXISTS.
              // Check if we are in the middle of a signup (within last 30 seconds)
              const isRecentSignup = firebaseUser.metadata.creationTime && 
                (new Date().getTime() - new Date(firebaseUser.metadata.creationTime).getTime() < 30000);

              if (isRecentSignup) {
                // Wait for the signup function to finish creating the doc
                // If it takes more than 10 seconds, we'll proceed to fallback below
                const now = new Date().getTime();
                const creation = new Date(firebaseUser.metadata.creationTime).getTime();
                if (now - creation < 10000) {
                   console.log("AuthProvider: Recent signup detected, waiting for profile doc...");
                   return; 
                }
              }

              const userEmail = firebaseUser.email?.toLowerCase() || '';
              
              // NEW: Try to recover signup info from sessionStorage if we're creating a fallback
              let signupInfo = { name: '', phone: '' };
              try {
                const stored = sessionStorage.getItem(`signup_info_${firebaseUser.uid}`);
                if (stored) signupInfo = JSON.parse(stored);
              } catch (e) {
                console.error("Error reading signup info from session:", e);
              }

              // Only create a fallback profile if it's absolutely missing and not a recent signup
              console.log("AuthProvider: Creating fallback profile for existing user with missing doc. Recovery info:", signupInfo);
              
              const isSuperAdmin = SUPER_ADMIN_EMAILS.includes(userEmail);
              
              const expiryDate = new Date();
              expiryDate.setMonth(expiryDate.getMonth() + 3);

              const newProfile: UserProfile = {
                uid: firebaseUser.uid,
                email: userEmail,
                displayName: signupInfo.name || firebaseUser.displayName || '',
                photoURL: firebaseUser.photoURL || '',
                role: isSuperAdmin ? 'super_admin' : 'admin',
                isSuperAdmin,
                institutionId: firebaseUser.uid,
                subscriptionPlan: 'basic',
                subscriptionExpiry: expiryDate.toISOString(),
                aiCredits: 1500,
                hasReceivedInitialCredits: true,
                dismissedNotifications: [],
                isNewUser: true,
                institution: signupInfo.name || firebaseUser.displayName || '',
                phone: signupInfo.phone || ''
              };
              
              // Create all docs atomically
              await Promise.all([
                setDoc(doc(db, 'users', firebaseUser.uid), newProfile),
                setDoc(doc(db, 'institutions', firebaseUser.uid), {
                  id: firebaseUser.uid,
                  name: signupInfo.name || firebaseUser.displayName || '',
                  displayName: signupInfo.name || firebaseUser.displayName || '',
                  email: userEmail,
                  phone: signupInfo.phone || '',
                  subscriptionPlan: 'basic',
                  subscriptionExpiry: expiryDate.toISOString(),
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString()
                }),
                setDoc(doc(db, 'credits', firebaseUser.uid), {
                  userId: firebaseUser.uid,
                  balance: 0,
                  aiBalance: 1500,
                  totalSent: 0,
                  lastUpdated: new Date().toISOString()
                })
              ]);

              // Cleanup session storage
              sessionStorage.removeItem(`signup_info_${firebaseUser.uid}`);
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

  const signup = async (email: string, pass: string, institutionName: string, phone: string) => {
    try {
      setAuthError(null);
      const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
      const firebaseUser = userCredential.user;
      
      // Store signup info in session storage as a backup for the observer
      // This is crucial if the following Firestore writes fail or are delayed.
      try {
        sessionStorage.setItem(`signup_info_${firebaseUser.uid}`, JSON.stringify({
          name: institutionName,
          phone: phone
        }));
      } catch (e) {
        console.warn("Could not save signup info to session storage", e);
      }

      const expiryDate = new Date();
      expiryDate.setMonth(expiryDate.getMonth() + 3);

      const normalizedEmail = email.toLowerCase();

      // First create users doc with all info
      const newProfile: UserProfile = {
        uid: firebaseUser.uid,
        email: normalizedEmail,
        displayName: institutionName,
        photoURL: '',
        role: 'admin',
        institution: institutionName,
        institutionId: firebaseUser.uid,
        subscriptionPlan: 'basic',
        subscriptionExpiry: expiryDate.toISOString(),
        isPromoUser: true,
        isNewUser: false, // Set to false because we already have the info from signup form
        aiCredits: 1500,
        hasReceivedInitialCredits: true,
        dismissedNotifications: [],
        phone: phone
      };
      
      // Use setDoc for everything at once to prevent race conditions
      // This MUST be done before we resolve, but also before the observer kicks in
      const p1 = setDoc(doc(db, 'users', firebaseUser.uid), newProfile);
      const p2 = setDoc(doc(db, 'institutions', firebaseUser.uid), {
        id: firebaseUser.uid,
        name: institutionName,
        displayName: institutionName,
        phone: phone,
        email: normalizedEmail,
        subscriptionPlan: 'basic',
        subscriptionExpiry: expiryDate.toISOString(),
        admissionForm: {
          active: true,
          title: 'Admission Form',
          instructions: 'Please fill out the form carefully.',
          fields: {
            studentName: true,
            dob: true,
            birthReg: true,
            nid: false,
            fatherName: true,
            motherName: true,
            guardianPhone: true,
            studentPhone: false,
            admissionDate: true,
            batch: true,
            subjectGroup: false,
            schoolName: false,
            address: true
          }
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      const p3 = setDoc(doc(db, 'credits', firebaseUser.uid), {
        userId: firebaseUser.uid,
        balance: 0,
        aiBalance: 1500,
        totalSent: 0,
        lastUpdated: new Date().toISOString()
      });

      await Promise.all([p1, p2, p3]);
      
      // Successful write, can remove session storage (though AuthProvider will also clean up)
      sessionStorage.removeItem(`signup_info_${firebaseUser.uid}`);

      console.log("Signup profiles created successfully for:", firebaseUser.uid);
    } catch (error: any) {
      console.error("Signup process failed:", error);
      // If Auth succeeded but profiles failed, we have a broken state.
      // The observer in AuthProvider will eventually try to fix it,
      // but we throw here to let the UI know.
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
