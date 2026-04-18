import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  ClipboardCheck, 
  Layers, 
  CreditCard, 
  MoreHorizontal, 
  X,
  GraduationCap,
  Building2,
  UserSquare2,
  MessageSquare,
  Settings,
  LogOut,
  Bell,
  ShieldCheck,
  TrendingUp,
  HelpCircle,
  Zap
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../lib/auth';
import { motion, AnimatePresence } from 'motion/react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';

export function BottomNav() {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const [birthdayCount, setBirthdayCount] = useState(0);
  const location = useLocation();

  React.useEffect(() => {
    if (!user) return;
    const instId = user.institutionId || user.uid;
    const q = query(collection(db, 'students'), where('institutionId', '==', instId));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const today = new Date();
      const m = today.getMonth() + 1;
      const d = today.getDate();
      
      const count = snapshot.docs.filter(doc => {
        const student = doc.data();
        if (!student.dob) return false;
        const dob = new Date(student.dob);
        return (dob.getMonth() + 1) === m && dob.getDate() === d;
      }).length;
      
      setBirthdayCount(count);
    });

    return () => unsubscribe();
  }, [user]);

  const navItems = user?.isSuperAdmin ? [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/super-admin' },
    { icon: Building2, label: 'Institutions', path: '/super-admin/institutions' },
    { icon: Bell, label: 'Broadcast', path: '/super-admin/notifications' },
    { icon: MessageSquare, label: 'Support', path: '/super-admin/support' },
  ] : [
    { icon: LayoutDashboard, label: t('nav.dashboard'), path: '/' },
    { icon: Layers, label: t('nav.batches'), path: '/batches' },
    { icon: Users, label: t('nav.students'), path: '/students' },
    { icon: ClipboardCheck, label: t('nav.attendance'), path: '/attendance' },
    { icon: CreditCard, label: t('nav.fees'), path: '/fees' },
  ];

  const moreItems = user?.isSuperAdmin ? [
    { icon: HelpCircle, label: 'Manage FAQs', path: '/super-admin/faqs' },
    { icon: Settings, label: t('nav.settings'), path: '/settings' },
    { icon: ShieldCheck, label: 'System Health', path: '/super-admin/health' },
  ] : [
    { icon: GraduationCap, label: t('nav.offlineExams'), path: '/offline-exams' },
    { icon: Building2, label: t('nav.institution'), path: '/institution' },
    { icon: UserSquare2, label: t('nav.teachers'), path: '/teachers' },
    { icon: MessageSquare, label: t('nav.messages'), path: '/messages' },
    { icon: HelpCircle, label: t('Help'), path: '/help' },
    { icon: Settings, label: t('nav.settings'), path: '/settings' },
  ];

  return (
    <>
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 z-50 px-2 pb-safe">
        <div className="flex items-center justify-around h-16">
          {navItems.slice(0, 4).map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                cn(
                  "flex flex-col items-center justify-center gap-1 flex-1 min-w-0 transition-colors duration-200",
                  isActive 
                    ? "text-indigo-600 dark:text-indigo-400" 
                    : "text-gray-500 dark:text-gray-400"
                )
              }
            >
              <item.icon className="w-5 h-5" />
              <span className="text-[10px] font-bold uppercase tracking-tighter truncate w-full text-center px-1">
                {item.label}
              </span>
            </NavLink>
          ))}
          
          <button
            onClick={() => setIsMoreMenuOpen(true)}
            className={cn(
              "flex flex-col items-center justify-center gap-1 flex-1 min-w-0 transition-colors duration-200 relative",
              isMoreMenuOpen 
                ? "text-indigo-600 dark:text-indigo-400" 
                : "text-gray-500 dark:text-gray-400"
            )}
          >
            <MoreHorizontal className="w-5 h-5" />
            <span className="text-[10px] font-bold uppercase tracking-tighter truncate w-full text-center px-1">
              {t('common.more') || 'More'}
            </span>
            {birthdayCount > 0 && (
              <span className="absolute top-2 right-4 bg-red-500 text-white text-[8px] font-black w-4 h-4 rounded-full flex items-center justify-center animate-pulse">
                {birthdayCount}
              </span>
            )}
          </button>
        </div>
      </nav>

      <AnimatePresence>
        {isMoreMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: '100%' }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-0 z-[60] bg-white dark:bg-gray-900 lg:hidden overflow-y-auto"
          >
            <div className="p-6 pb-24">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center overflow-hidden">
                    <img 
                      src="https://placehold.co/400x400/4f46e5/white?text=MMB" 
                      alt="Logo" 
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <span className="text-lg font-bold text-gray-900 dark:text-white">Manage My Batch</span>
                </div>
                <button 
                  onClick={() => setIsMoreMenuOpen(false)}
                  className="p-2 bg-gray-100 dark:bg-gray-800 rounded-full text-gray-500"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Include the items that were hidden from bottom nav */}
                {!user?.isSuperAdmin && (
                  <NavLink
                    to="/fees"
                    onClick={() => setIsMoreMenuOpen(false)}
                    className={cn(
                      "flex flex-col items-center gap-3 p-4 rounded-2xl border transition-all",
                      location.pathname === '/fees'
                        ? "bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400"
                        : "bg-gray-50 dark:bg-gray-800/50 border-gray-100 dark:border-gray-800 text-gray-600 dark:text-gray-400"
                    )}
                  >
                    <CreditCard className="w-6 h-6" />
                    <span className="text-sm font-bold">{t('nav.fees')}</span>
                  </NavLink>
                )}

                {moreItems.map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={() => setIsMoreMenuOpen(false)}
                    className={cn(
                      "flex flex-col items-center gap-3 p-4 rounded-2xl border transition-all relative",
                      location.pathname === item.path
                        ? "bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400"
                        : "bg-gray-50 dark:bg-gray-800/50 border-gray-100 dark:border-gray-800 text-gray-600 dark:text-gray-400"
                    )}
                  >
                    <item.icon className="w-6 h-6" />
                    <span className="text-sm font-bold">{item.label}</span>
                    {item.path === '/marketing' && birthdayCount > 0 && (
                      <span className="absolute top-2 right-2 bg-red-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full animate-pulse shadow-lg">
                        {birthdayCount} Birthdays
                      </span>
                    )}
                  </NavLink>
                ))}
                
                {!user?.isSuperAdmin && (
                  <NavLink
                    to="/marketing"
                    onClick={() => setIsMoreMenuOpen(false)}
                    className={cn(
                      "flex flex-col items-center gap-3 p-4 rounded-2xl border transition-all relative",
                      location.pathname === '/marketing'
                        ? "bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400"
                        : "bg-gray-50 dark:bg-gray-800/50 border-gray-100 dark:border-gray-800 text-gray-600 dark:text-gray-400"
                    )}
                  >
                    <Zap className="w-6 h-6" />
                    <span className="text-sm font-bold">{t('nav.marketing')}</span>
                    {birthdayCount > 0 && (
                      <span className="absolute top-3 right-3 bg-red-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full animate-pulse shadow-lg">
                        {birthdayCount}
                      </span>
                    )}
                  </NavLink>
                )}
              </div>

              <div className="mt-8 pt-8 border-t border-gray-100 dark:border-gray-800">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/40 rounded-full flex items-center justify-center border border-gray-200 dark:border-gray-700 overflow-hidden">
                    {user?.photoURL ? (
                      <img src={user.photoURL} alt={user.displayName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <UserSquare2 className="text-indigo-600 dark:text-indigo-400 w-6 h-6" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-base font-bold text-gray-900 dark:text-white truncate">{user?.displayName}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{user?.email}</p>
                  </div>
                </div>

                <button 
                  onClick={() => {
                    setIsMoreMenuOpen(false);
                    logout();
                  }}
                  className="flex items-center justify-center gap-3 w-full p-4 bg-red-50 dark:bg-red-900/10 text-red-600 dark:text-red-400 rounded-2xl font-bold transition-colors"
                >
                  <LogOut className="w-5 h-5" />
                  {t('nav.logout')}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
