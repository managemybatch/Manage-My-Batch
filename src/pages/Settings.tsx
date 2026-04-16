import React, { useState, useEffect } from 'react';
import { User, Bell, Shield, Globe, Palette, LogOut, Mail, Phone, MapPin, Building, Loader2, CheckCircle, Moon, Sun, Monitor, UserPlus, Trash2, ShieldAlert, XCircle, AlertCircle } from 'lucide-react';
import { useAuth } from '../lib/auth';
import { useTheme } from '../lib/theme';
import { cn } from '../lib/utils';
import { useTranslation } from 'react-i18next';
import { collection, query, where, onSnapshot, doc, deleteDoc, setDoc, getDocs, writeBatch } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signOut, signInWithEmailAndPassword } from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';
import { Modal } from '../components/Modal';
import { ConfirmModal } from '../components/ConfirmModal';
import { motion, AnimatePresence } from 'motion/react';

type SettingsTab = 'profile' | 'notifications' | 'security' | 'language' | 'appearance' | 'staff';

export function Settings() {
  const { user, logout, loading } = useAuth();
  const { theme, setTheme } = useTheme();
  const { t, i18n } = useTranslation();
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile');
  const [staffList, setStaffList] = useState<any[]>([]);
  const [isAddStaffModalOpen, setIsAddStaffModalOpen] = useState(false);
  const [staffLoading, setStaffLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [profileData, setProfileData] = useState({
    displayName: user?.displayName || '',
    phone: user?.phone || '',
    institution: user?.institution || '',
    photoURL: user?.photoURL || '',
  });
  const [newStaff, setNewStaff] = useState({
    name: '',
    email: '',
    password: '',
  });

  useEffect(() => {
    if (user) {
      setProfileData({
        displayName: user.displayName || '',
        phone: user.phone || '',
        institution: user.institution || '',
        photoURL: user.photoURL || '',
      });
    }
  }, [user]);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 500000) {
        setToast({ message: 'Image size too large. Please choose an image under 500KB.', type: 'error' });
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfileData(prev => ({ ...prev, photoURL: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    setIsSaving(true);
    try {
      await setDoc(doc(db, 'users', user.uid), {
        ...profileData,
        updatedAt: new Date().toISOString(),
      }, { merge: true });
      setToast({ message: 'Profile updated successfully!', type: 'success' });
    } catch (error) {
      console.error('Error updating profile:', error);
      setToast({ message: 'Failed to update profile.', type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    if (user?.role !== 'admin' || user?.isSuperAdmin) return;

    const q = query(
      collection(db, 'users'), 
      where('role', '==', 'staff'),
      where('institutionId', '==', user.uid)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setStaffList(snapshot.docs.map(doc => ({ ...doc.data(), uid: doc.id })));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'users');
    });

    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Pre-check if email already exists in the local staff list
    const adminEmail = import.meta.env.VITE_ADMIN_EMAIL || 'pallistoreinfo@gmail.com';
    if (newStaff.email.toLowerCase() === adminEmail.toLowerCase()) {
      setToast({ message: "This email is your administrator account. You cannot add yourself as a staff member.", type: 'error' });
      return;
    }

    if (staffList.some(s => s.email.toLowerCase() === newStaff.email.toLowerCase())) {
      setToast({ message: "This email is already registered as a staff member.", type: 'error' });
      return;
    }

    setStaffLoading(true);

    let secondaryApp;
    try {
      // 1. Thorough check for existing user in Firestore (Case-Insensitive)
      const usersRef = collection(db, 'users');
      const normalizedEmail = newStaff.email.toLowerCase();
      
      // Fetch all users to perform a reliable case-insensitive check
      // (This is safe for the users collection as it typically contains a manageable number of staff/teachers)
      let allUsersSnap;
      try {
        allUsersSnap = await getDocs(usersRef);
      } catch (err) {
        handleFirestoreError(err, OperationType.LIST, 'users');
        throw err;
      }
      
      const existingUserDoc = allUsersSnap.docs.find(d => 
        d.data().email?.toLowerCase() === normalizedEmail
      );

      if (existingUserDoc) {
        const existingUserData = existingUserDoc.data();
        
        if (existingUserData.role === 'staff') {
          setToast({ message: "This email is already registered as a staff member.", type: 'error' });
          setStaffLoading(false);
          return;
        }

        // If user exists but is not staff, update their role
        setToast({ message: `An account with this email already exists as a ${existingUserData.role}. Please contact support if you need to change their role.`, type: 'error' });
        setStaffLoading(false);
        return;
      }

      // 2. If not in Firestore, try to create in Auth
      const secondaryAppName = `secondary-app-${Date.now()}`;
      secondaryApp = initializeApp(firebaseConfig, secondaryAppName);
      const secondaryAuth = getAuth(secondaryApp);

      try {
        const userCredential = await createUserWithEmailAndPassword(secondaryAuth, normalizedEmail, newStaff.password);
        const uid = userCredential.user.uid;

        try {
          await setDoc(doc(db, 'users', uid), {
            uid,
            email: normalizedEmail,
            displayName: newStaff.name,
            photoURL: '',
            role: 'staff',
            institutionId: user.uid,
            createdAt: new Date().toISOString(),
          });
        } catch (err) {
          handleFirestoreError(err, OperationType.CREATE, `users/${uid}`);
          throw err;
        }

        await signOut(secondaryAuth);
        await deleteApp(secondaryApp);

        setIsAddStaffModalOpen(false);
        setNewStaff({ name: '', email: '', password: '' });
        setToast({ message: 'Staff account created successfully!', type: 'success' });
      } catch (authError: any) {
        if (authError.code === 'auth/email-already-in-use') {
          // Try to sign in with the provided password to get the UID (Auto-Link)
          try {
            const userCredential = await signInWithEmailAndPassword(secondaryAuth, normalizedEmail, newStaff.password);
            const uid = userCredential.user.uid;
            
            await setDoc(doc(db, 'users', uid), {
              uid,
              email: normalizedEmail,
              displayName: newStaff.name,
              photoURL: '',
              role: 'staff',
              institutionId: user.uid,
              createdAt: new Date().toISOString(),
            });
            
            await signOut(secondaryAuth);
            await deleteApp(secondaryApp);
            
            setIsAddStaffModalOpen(false);
            setNewStaff({ name: '', email: '', password: '' });
            setToast({ message: 'Existing account linked and updated to staff successfully!', type: 'success' });
          } catch (signInError: any) {
            // If sign-in fails, it means the account exists but with a different password or provider
            setToast({ 
              message: "This email is already in our login system with a different password. Please ask the user to log in once with their existing password, or use a different email.", 
              type: 'error' 
            });
            if (secondaryApp) await deleteApp(secondaryApp);
          }
        } else {
          throw authError;
        }
      }
    } catch (error: any) {
      console.error("Error creating staff:", error);
      let message = error.message || "Failed to create staff account.";
      if (error.code === 'auth/operation-not-allowed') {
        message = "Email/Password login is not enabled in your Firebase Console. If you just enabled it, please wait a minute and refresh the page. Also, ensure you enabled it in the correct Firebase project: " + firebaseConfig.projectId;
      } else if (error.code === 'auth/email-already-in-use') {
        message = "This email address is already in use by another account (possibly a teacher or admin). If they are not in the staff list, they may have a different role.";
      } else if (error.code === 'auth/weak-password') {
        message = "The password is too weak. Please use at least 6 characters.";
      } else if (error.code === 'auth/invalid-email') {
        message = "The email address is not valid. Please check the format.";
      }
      setToast({ message, type: 'error' });
      if (secondaryApp) await deleteApp(secondaryApp);
    } finally {
      setStaffLoading(false);
    }
  };

  const [isDeleteStaffModalOpen, setIsDeleteStaffModalOpen] = useState(false);
  const [staffToDelete, setStaffToDelete] = useState<string | null>(null);

  const handleDeleteStaff = async () => {
    if (!staffToDelete) return;
    
    try {
      await deleteDoc(doc(db, 'users', staffToDelete));
      setToast({ message: 'Staff account deleted successfully!', type: 'success' });
      setIsDeleteStaffModalOpen(false);
      setStaffToDelete(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `users/${staffToDelete}`);
      setToast({ message: 'Failed to delete staff account.', type: 'error' });
    }
  };

  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetConfirmText, setResetConfirmText] = useState('');

  const handleResetData = async () => {
    if (resetConfirmText !== 'RESET') {
      setToast({ message: 'Please type RESET to confirm.', type: 'error' });
      return;
    }

    setResetLoading(true);
    try {
      const collectionsToClear = [
        'students',
        'batches',
        'fees',
        'exams',
        'attendance',
        'quiz_results',
        'messages',
        'notifications'
      ];

      for (const collName of collectionsToClear) {
        const q = query(collection(db, collName), where('institutionId', '==', user.uid));
        const snapshot = await getDocs(q);
        
        // Firestore batches are limited to 500 operations
        const chunks = [];
        for (let i = 0; i < snapshot.docs.length; i += 500) {
          chunks.push(snapshot.docs.slice(i, i + 500));
        }

        for (const chunk of chunks) {
          const batch = writeBatch(db);
          chunk.forEach((doc) => {
            batch.delete(doc.ref);
          });
          await batch.commit();
        }
      }

      setToast({ message: 'All data has been reset successfully.', type: 'success' });
      setIsResetModalOpen(false);
      setResetConfirmText('');
    } catch (error) {
      console.error('Error resetting data:', error);
      setToast({ message: 'Failed to reset data. Please try again.', type: 'error' });
    } finally {
      setResetLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
      </div>
    );
  }

  if (!user) return null;

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 transition-colors duration-300">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">{t('settings.title')}</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">{t('settings.subtitle')}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-1 space-y-2">
          {[
            { id: 'profile', icon: User, label: t('settings.tabs.profile') },
            { id: 'notifications', icon: Bell, label: t('settings.tabs.notifications') },
            { id: 'security', icon: Shield, label: t('settings.tabs.security') },
            { id: 'language', icon: Globe, label: t('settings.tabs.language') },
            { id: 'appearance', icon: Palette, label: t('settings.tabs.appearance') },
            { id: 'staff', icon: UserPlus, label: t('settings.tabs.staff'), adminOnly: true, hideForSuperAdmin: true },
          ].filter(tab => (!tab.adminOnly || user?.role === 'admin') && (!tab.hideForSuperAdmin || !user?.isSuperAdmin)).map((tab) => (
            <button 
              key={tab.id}
              onClick={() => setActiveTab(tab.id as SettingsTab)}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 text-sm transition-all rounded-xl",
                activeTab === tab.id 
                  ? "font-bold text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20" 
                  : "font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
              )}
            >
              <tab.icon className="w-4 h-4" /> {tab.label}
            </button>
          ))}
          <div className="pt-4 mt-4 border-t border-gray-100 dark:border-gray-800">
            <button 
              onClick={logout}
              className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-xl transition-all"
            >
              <LogOut className="w-4 h-4" /> {t('nav.logout')}
            </button>
          </div>
        </div>

        <div className="md:col-span-2 space-y-6">
          {activeTab === 'profile' && (
            <div className="bg-white dark:bg-gray-900 p-8 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm transition-colors duration-300">
              <div className="flex items-center gap-6 mb-8">
                <div className="relative group">
                  <img 
                    src={profileData.photoURL || "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80"} 
                    alt="Profile" 
                    className="w-24 h-24 rounded-2xl object-cover ring-4 ring-gray-50 dark:ring-gray-800"
                    referrerPolicy="no-referrer"
                  />
                  <label className="absolute inset-0 flex items-center justify-center bg-black/40 text-white opacity-0 group-hover:opacity-100 rounded-2xl transition-all text-xs font-bold cursor-pointer">
                    {t('settings.profile.changePhoto')}
                    <input type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
                  </label>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">{profileData.displayName}</h3>
                  <p className="text-sm text-indigo-600 dark:text-indigo-400 font-bold uppercase tracking-wider mt-1">
                    {user.isSuperAdmin ? 'System Administrator' : user.role}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="px-2 py-0.5 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 text-[10px] font-black uppercase tracking-widest rounded-md border border-emerald-100 dark:border-emerald-900/50">{t('settings.profile.verified')}</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider ml-1">{t('settings.profile.fullName')}</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input 
                      type="text" 
                      value={profileData.displayName}
                      onChange={e => setProfileData(prev => ({ ...prev, displayName: e.target.value }))}
                      className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider ml-1">{t('settings.profile.email')}</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input 
                      type="email" 
                      defaultValue={user.email}
                      disabled
                      className="w-full pl-10 pr-4 py-3 bg-gray-100 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-500 dark:text-gray-400 cursor-not-allowed"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider ml-1">{t('settings.profile.phone')}</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input 
                      type="tel" 
                      placeholder="+880 1XXX XXXXXX"
                      value={profileData.phone}
                      onChange={e => setProfileData(prev => ({ ...prev, phone: e.target.value }))}
                      className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider ml-1">{t('settings.profile.institution')}</label>
                  <div className="relative">
                    <Building className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input 
                      type="text" 
                      value={profileData.institution || (user.isSuperAdmin ? "System Administration" : "Manage My Batch Academy")}
                      onChange={e => setProfileData(prev => ({ ...prev, institution: e.target.value }))}
                      disabled={user.isSuperAdmin}
                      className={cn(
                        "w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all",
                        user.isSuperAdmin && "bg-gray-100 dark:bg-gray-800/50 cursor-not-allowed text-gray-500"
                      )}
                    />
                  </div>
                </div>
              </div>

              <div className="mt-8 pt-8 border-t border-gray-100 dark:border-gray-800 flex justify-end gap-3">
                <button 
                  onClick={() => setProfileData({
                    displayName: user.displayName || '',
                    phone: user.phone || '',
                    institution: user.institution || '',
                    photoURL: user.photoURL || '',
                  })}
                  className="px-6 py-2.5 text-sm font-bold text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-xl transition-all"
                >
                  {t('settings.profile.cancel')}
                </button>
                <button 
                  onClick={handleSaveProfile}
                  disabled={isSaving}
                  className="px-6 py-2.5 text-sm font-bold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 disabled:opacity-50 flex items-center gap-2"
                >
                  {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                  {t('settings.profile.save')}
                </button>
              </div>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="bg-white dark:bg-gray-900 p-8 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm space-y-6 transition-colors duration-300">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">Notification Preferences</h3>
              <div className="space-y-4">
                {[
                  { id: 'email_reports', label: 'Email Reports', desc: 'Receive weekly performance summaries' },
                  { id: 'sms_alerts', label: 'SMS Alerts', desc: 'Get notified about critical attendance issues' },
                  { id: 'fee_reminders', label: 'Fee Reminders', desc: 'Automated reminders for pending payments' },
                  { id: 'exam_updates', label: 'Exam Updates', desc: 'Notifications when results are published' },
                ].map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
                    <div>
                      <p className="text-sm font-bold text-gray-900 dark:text-white">{item.label}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{item.desc}</p>
                    </div>
                    <div className="w-12 h-6 bg-indigo-600 rounded-full relative cursor-pointer">
                      <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full shadow-sm" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="bg-white dark:bg-gray-900 p-8 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm space-y-6 transition-colors duration-300">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">Security & Privacy</h3>
              <div className="space-y-6">
                <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl border border-indigo-100 dark:border-indigo-900/50 flex items-start gap-4">
                  <Shield className="w-5 h-5 text-indigo-600 dark:text-indigo-400 mt-1" />
                  <div>
                    <p className="text-sm font-bold text-indigo-900 dark:text-indigo-100">Two-Factor Authentication</p>
                    <p className="text-xs text-indigo-700/70 dark:text-indigo-300/70 mt-1">Add an extra layer of security to your account by requiring more than just a password to log in.</p>
                    <button className="mt-3 px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-lg hover:bg-indigo-700 transition-all">Enable 2FA</button>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 border border-gray-100 dark:border-gray-800 rounded-xl">
                    <div>
                      <p className="text-sm font-bold text-gray-900 dark:text-white">Session Management</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">You are currently logged in on 2 devices</p>
                    </div>
                    <button className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline">View All</button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'language' && (
            <div className="bg-white dark:bg-gray-900 p-8 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm space-y-6 transition-colors duration-300">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">Language & Region</h3>
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider ml-1">Interface Language</label>
                  <div className="grid grid-cols-2 gap-4">
                    <button 
                      onClick={() => changeLanguage('en')}
                      className={cn(
                        "flex items-center justify-between p-4 border rounded-xl transition-all",
                        i18n.language === 'en' ? "border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 font-bold text-indigo-600 dark:text-indigo-400" : "border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400"
                      )}
                    >
                      <span>English</span>
                      {i18n.language === 'en' && <CheckCircle className="w-4 h-4" />}
                    </button>
                    <button 
                      onClick={() => changeLanguage('bn')}
                      className={cn(
                        "flex items-center justify-between p-4 border rounded-xl transition-all",
                        i18n.language === 'bn' ? "border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 font-bold text-indigo-600 dark:text-indigo-400" : "border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400"
                      )}
                    >
                      <span>বাংলা (Bengali)</span>
                      {i18n.language === 'bn' && <CheckCircle className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider ml-1">Time Zone</label>
                  <select className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm dark:text-white focus:ring-2 focus:ring-indigo-500/20 outline-none">
                    <option>(GMT+06:00) Dhaka, Bangladesh</option>
                    <option>(GMT+00:00) UTC</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'appearance' && (
            <div className="bg-white dark:bg-gray-900 p-8 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm space-y-6 transition-colors duration-300">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">Appearance</h3>
              <div className="grid grid-cols-3 gap-4">
                {[
                  { id: 'light', icon: Sun, label: 'Light' },
                  { id: 'dark', icon: Moon, label: 'Dark' },
                  { id: 'system', icon: Monitor, label: 'System' },
                ].map((t) => (
                  <button 
                    key={t.id}
                    onClick={() => setTheme(t.id as any)}
                    className={cn(
                      "flex flex-col items-center gap-3 p-6 border rounded-2xl transition-all",
                      theme === t.id ? "border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 font-bold" : "border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400"
                    )}
                  >
                    <t.icon className="w-6 h-6" />
                    <span className="text-xs">{t.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'staff' && user?.role === 'admin' && (
            <div className="bg-white dark:bg-gray-900 p-8 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm space-y-6 transition-colors duration-300">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">{t('settings.tabs.staff')}</h3>
                <button 
                  onClick={() => setIsAddStaffModalOpen(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200"
                >
                  <UserPlus className="w-4 h-4" /> Add Employee
                </button>
              </div>

              <div className="grid grid-cols-1 gap-4">
                {staffList.length === 0 ? (
                  <div className="text-center py-12 bg-gray-50 dark:bg-gray-900/50 rounded-3xl border-2 border-dashed border-gray-200 dark:border-gray-800">
                    <UserPlus className="w-12 h-12 text-gray-300 dark:text-gray-700 mx-auto mb-4" />
                    <p className="text-gray-500 dark:text-gray-400 font-medium">No staff members added yet.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {staffList.map((staff) => (
                      <div key={staff.uid} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900/50 rounded-2xl border border-gray-100 dark:border-gray-800 group hover:bg-white dark:hover:bg-gray-800 hover:shadow-md transition-all">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold">
                            {staff.displayName?.[0] || 'S'}
                          </div>
                          <div>
                            <h4 className="text-sm font-bold text-gray-900 dark:text-white">{staff.displayName}</h4>
                            <p className="text-xs text-gray-500 dark:text-gray-400">{staff.email}</p>
                          </div>
                        </div>
                        <button 
                          onClick={() => {
                            setStaffToDelete(staff.uid);
                            setIsDeleteStaffModalOpen(true);
                          }}
                          className="p-2 text-gray-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-all sm:opacity-0 sm:group-hover:opacity-100"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="p-4 bg-amber-50 dark:bg-amber-900/10 rounded-2xl border border-amber-100 dark:border-amber-900/20 flex items-start gap-3">
                <ShieldAlert className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-bold text-amber-900 dark:text-amber-200">Staff Restrictions</h4>
                  <p className="text-xs text-amber-700 dark:text-amber-400 mt-1 leading-relaxed">
                    Staff accounts can enroll students and collect fees but cannot download reports, delete accounts, or change fee structures.
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="bg-rose-50 dark:bg-rose-900/10 p-6 rounded-2xl border border-rose-100 dark:border-rose-900/30 transition-colors duration-300">
            <h4 className="text-sm font-bold text-rose-900 dark:text-rose-400 mb-2">{t('settings.dangerZone.title')}</h4>
            <p className="text-xs text-rose-700 dark:text-rose-300/70 mb-4 leading-relaxed">
              {t('settings.dangerZone.description')}
            </p>
            <div className="flex flex-wrap gap-3">
              <button 
                disabled={user?.role === 'staff'}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 rounded-lg hover:bg-rose-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {t('settings.dangerZone.delete')}
              </button>
              <button 
                onClick={() => setIsResetModalOpen(true)}
                disabled={user?.role === 'staff'}
                className="px-4 py-2 text-xs font-bold text-rose-600 bg-white border border-rose-200 rounded-lg hover:bg-rose-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Reset All Data
              </button>
            </div>
          </div>
        </div>
      </div>

      <Modal isOpen={isResetModalOpen} onClose={() => setIsResetModalOpen(false)} title="Reset All Data">
        <div className="space-y-6">
          <div className="p-4 bg-rose-50 dark:bg-rose-900/20 border border-rose-100 dark:border-rose-800 rounded-2xl flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-rose-600 dark:text-rose-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-rose-900 dark:text-rose-100">Warning: This action is irreversible!</p>
              <p className="text-xs text-rose-700 dark:text-rose-300/70 mt-1">
                This will permanently delete all students, batches, fees, exams, and other records associated with your institution. 
                Your account and staff accounts will remain active.
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-700 dark:text-gray-300">Type <span className="text-rose-600">RESET</span> to confirm</label>
            <input
              type="text"
              placeholder="RESET"
              value={resetConfirmText}
              onChange={e => setResetConfirmText(e.target.value)}
              className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all dark:text-white"
            />
          </div>

          <div className="flex gap-4 pt-6 border-t border-gray-100 dark:border-gray-800">
            <button
              onClick={() => setIsResetModalOpen(false)}
              className="flex-1 py-3.5 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-2xl font-bold hover:bg-gray-200 dark:hover:bg-gray-700 transition-all"
            >
              Cancel
            </button>
            <button
              onClick={handleResetData}
              disabled={resetLoading || resetConfirmText !== 'RESET'}
              className="flex-1 py-3.5 bg-rose-600 text-white rounded-2xl font-bold hover:bg-rose-700 transition-all shadow-lg shadow-rose-200 disabled:opacity-50"
            >
              {resetLoading ? 'Resetting...' : 'Reset Data'}
            </button>
          </div>
        </div>
      </Modal>
      <Modal isOpen={isAddStaffModalOpen} onClose={() => setIsAddStaffModalOpen(false)} title="Add New Employee">
        <form onSubmit={handleAddStaff} className="space-y-6">
          {toast && toast.type === 'error' && (
            <div className="p-4 bg-rose-50 dark:bg-rose-900/20 border border-rose-100 dark:border-rose-800 rounded-2xl flex items-start gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
              <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm font-medium text-rose-700 dark:text-rose-300 leading-relaxed">{toast.message}</p>
            </div>
          )}
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700 dark:text-gray-300">Full Name</label>
              <input
                required
                type="text"
                placeholder="Manager Name"
                value={newStaff.name}
                onChange={e => setNewStaff({...newStaff, name: e.target.value})}
                className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all dark:text-white"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700 dark:text-gray-300">Email Address</label>
              <input
                required
                type="email"
                placeholder="staff@institution.com"
                value={newStaff.email}
                onChange={e => setNewStaff({...newStaff, email: e.target.value})}
                className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all dark:text-white"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700 dark:text-gray-300">Password</label>
              <input
                required
                type="password"
                placeholder="••••••••"
                value={newStaff.password}
                onChange={e => setNewStaff({...newStaff, password: e.target.value})}
                className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all dark:text-white"
              />
            </div>
          </div>

          <div className="flex gap-4 pt-6 border-t border-gray-100 dark:border-gray-800">
            <button
              type="button"
              onClick={() => setIsAddStaffModalOpen(false)}
              className="flex-1 py-3.5 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-2xl font-bold hover:bg-gray-200 dark:hover:bg-gray-700 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={staffLoading}
              className="flex-1 py-3.5 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 disabled:opacity-50"
            >
              {staffLoading ? 'Creating...' : 'Create Account'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmModal
        isOpen={isDeleteStaffModalOpen}
        onClose={() => {
          setIsDeleteStaffModalOpen(false);
          setStaffToDelete(null);
        }}
        onConfirm={handleDeleteStaff}
        title="Delete Staff Account"
        message="Are you sure you want to delete this staff account? This action cannot be undone."
        variant="danger"
        confirmText="Delete"
      />

      {/* Global Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className={cn(
              "fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-3 px-6 py-4 rounded-2xl shadow-2xl border transition-all",
              toast.type === 'success' 
                ? "bg-emerald-500 text-white border-emerald-400" 
                : "bg-rose-600 text-white border-rose-500"
            )}
          >
            {toast.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
            <span className="font-bold text-sm tracking-tight">{toast.message}</span>
            <button 
              onClick={() => setToast(null)}
              className="ml-4 p-1 hover:bg-white/20 rounded-lg transition-all"
            >
              <XCircle className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
