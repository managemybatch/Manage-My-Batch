import React from 'react';
import { Bell, Search, User, Globe, ArrowLeft } from 'lucide-react';
import { db } from '../firebase';
import { collection, query, limit, onSnapshot } from 'firebase/firestore';
import { useAuth } from '../lib/auth';
import { useTranslation } from 'react-i18next';
import { useNavigate, useLocation } from 'react-router-dom';

export function Navbar() {
  const { user } = useAuth();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [hasNotifications, setHasNotifications] = React.useState(false);

  React.useEffect(() => {
    const q = query(collection(db, 'super_notifications'), limit(1));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setHasNotifications(!snapshot.empty);
    });

    return () => unsubscribe();
  }, []);

  const isDashboard = location.pathname === '/dashboard';

  const toggleLanguage = () => {
    const nextLang = i18n?.language === 'en' ? 'bn' : 'en';
    i18n?.changeLanguage(nextLang);
  };

  return (
    <header className="h-16 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 md:px-8 flex items-center justify-between sticky top-0 z-20 transition-colors duration-300">
      <div className="flex items-center gap-3">
        {!isDashboard && (
          <button 
            onClick={() => navigate(-1)}
            className="p-2 -ml-2 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-gray-800 rounded-full transition-all"
            title={t('common.back')}
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
        )}
        
        <div className="flex items-center gap-3 lg:hidden">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center overflow-hidden">
            <img 
              src="https://placehold.co/400x400/4f46e5/white?text=MMB" 
              alt="Logo" 
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          </div>
          <span className="text-sm font-bold text-gray-900 dark:text-white tracking-tight">Manage My Batch</span>
        </div>
      </div>

      <div className="flex-1 max-w-md hidden md:block">
        <div className="relative group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 group-focus-within:text-indigo-500 transition-colors" />
          <input
            type="text"
            placeholder={t('dashboard.search')}
            className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 dark:text-white transition-all"
          />
        </div>
      </div>

      <div className="flex items-center gap-4">
        <button 
          onClick={toggleLanguage}
          className="flex items-center gap-2 px-3 py-1.5 text-sm font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 rounded-xl transition-all border border-indigo-100 dark:border-indigo-900/50"
        >
          <Globe className="w-4 h-4" />
          <span>{i18n?.language === 'en' ? 'বাংলা' : 'English'}</span>
        </button>

        <button 
          onClick={() => navigate('/dashboard')}
          className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-gray-800 rounded-full transition-all relative"
        >
          <Bell className="w-5 h-5" />
          {hasNotifications && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white dark:border-gray-900 shadow-lg animate-bounce">1</span>
          )}
        </button>
        
        <div className="h-8 w-px bg-gray-200 dark:bg-gray-800 mx-2"></div>

        <div className="flex items-center gap-2 pl-2 cursor-pointer group">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-semibold text-gray-900 dark:text-white group-hover:text-indigo-600 transition-colors">{user?.displayName}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {user?.isSuperAdmin ? 'Super Admin' : (user?.role === 'admin' ? t('common.roles.admin') : t('common.roles.teacher'))}
            </p>
          </div>
          <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/40 rounded-full flex items-center justify-center border-2 border-white dark:border-gray-800 shadow-sm overflow-hidden group-hover:border-indigo-200 transition-all">
            {user?.photoURL ? (
              <img src={user.photoURL} alt={user.displayName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            ) : (
              <User className="text-indigo-600 dark:text-indigo-400 w-6 h-6" />
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
