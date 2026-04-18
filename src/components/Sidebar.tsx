import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  CreditCard, 
  ClipboardCheck, 
  GraduationCap, 
  Settings, 
  LogOut, 
  Layers, 
  FileText, 
  School, 
  Briefcase, 
  MessageSquare, 
  Zap,
  HelpCircle,
  ShieldCheck,
  Building2,
  Bell
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useAuth } from '../lib/auth';
import { useTranslation } from 'react-i18next';
import { SubscriptionModal } from './SubscriptionModal';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';

export function Sidebar() {
  const { logout, user } = useAuth();
  const { t } = useTranslation();
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = React.useState(false);
  const [birthdayCount, setBirthdayCount] = React.useState(0);

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

  interface NavItem {
    icon: any;
    label: string;
    path: string;
    badge?: number | string;
  }

  const regularItems: NavItem[] = [
    { icon: LayoutDashboard, label: t('nav.dashboard'), path: '/' },
    { icon: Layers, label: t('nav.batches'), path: '/batches' },
    { icon: Users, label: t('nav.students'), path: '/students' },
    { icon: ClipboardCheck, label: t('nav.attendance'), path: '/attendance' },
    { icon: GraduationCap, label: t('nav.offlineExams'), path: '/offline-exams' },
    { icon: MessageSquare, label: t('nav.messages'), path: '/messages' },
    { icon: CreditCard, label: t('nav.fees'), path: '/fees' },
    { icon: School, label: t('nav.institution'), path: '/institution' },
    { icon: Briefcase, label: t('nav.teachers'), path: '/teachers' },
    { icon: Zap, label: t('nav.marketing'), path: '/marketing', badge: birthdayCount > 0 ? birthdayCount : undefined },
    { icon: Settings, label: t('nav.settings'), path: '/settings' },
    { icon: HelpCircle, label: t('Help'), path: '/help' },
  ];

  const superAdminItems: NavItem[] = [
    { icon: LayoutDashboard, label: 'Super Admin', path: '/' },
    { icon: Building2, label: 'Institutions', path: '/super-admin/institutions' },
    { icon: MessageSquare, label: 'Support Inbox', path: '/super-admin/support' },
    { icon: HelpCircle, label: 'Manage FAQs', path: '/super-admin/faqs' },
    { icon: Bell, label: 'Notifications', path: '/super-admin/notifications' },
    { icon: ShieldCheck, label: 'System Health', path: '/super-admin/health' },
    { icon: Settings, label: t('nav.settings'), path: '/settings' },
  ];

  const menuItems = user?.isSuperAdmin ? superAdminItems : regularItems;

  return (
    <aside className="hidden lg:flex w-72 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 h-screen flex-col sticky top-0 transition-colors duration-300">
      <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex items-center gap-3">
        <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center overflow-hidden">
          <img 
            src="https://placehold.co/400x400/4f46e5/white?text=MMB" 
            alt="Manage My Batch Logo" 
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
        </div>
        <span className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">Manage My Batch</span>
      </div>
      
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {menuItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 group",
                isActive 
                  ? "bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400 font-medium" 
                  : "text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100"
              )
            }
          >
            <item.icon className={cn("w-5 h-5", "group-hover:scale-110 transition-transform")} />
            <span className="flex-1">{item.label}</span>
            {item.badge && (
              <span className="bg-red-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full min-w-[18px] text-center shadow-lg shadow-red-200 animate-pulse">
                {item.badge}
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-gray-100 dark:border-gray-800 space-y-4">
        <div className="flex items-center justify-between px-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 bg-indigo-100 dark:bg-indigo-900/40 rounded-full flex items-center justify-center border border-gray-200 dark:border-gray-700 overflow-hidden flex-shrink-0">
              {user?.photoURL ? (
                <img src={user.photoURL} alt={user.displayName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <Users className="text-indigo-600 dark:text-indigo-400 w-4 h-4" />
              )}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-gray-900 dark:text-white truncate">{user?.displayName}</p>
            </div>
          </div>
          <button 
            onClick={logout}
            title={t('nav.logout')}
            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>

        {user?.role === 'admin' && !user?.isSuperAdmin && (
          <button
            onClick={() => setIsUpgradeModalOpen(true)}
            className="flex items-center gap-3 px-4 py-2.5 w-full bg-amber-500 hover:bg-amber-600 text-white rounded-xl transition-all duration-200 shadow-lg shadow-amber-100 dark:shadow-none group overflow-hidden relative"
          >
            <Zap className="w-4 h-4 fill-white" />
            <span className="text-sm font-bold">{t('Upgrade Now')}</span>
          </button>
        )}
      </div>

      <SubscriptionModal 
        isOpen={isUpgradeModalOpen} 
        onClose={() => setIsUpgradeModalOpen(false)} 
      />
    </aside>
  );
}
