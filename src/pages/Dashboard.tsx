import React, { useState, useEffect } from 'react';
import { 
  Users, 
  CreditCard, 
  ClipboardCheck, 
  GraduationCap, 
  ArrowUpRight, 
  Calendar, 
  Loader2, 
  Plus, 
  Layers, 
  FileText, 
  AlertCircle,
  MessageSquare,
  ChevronRight,
  Search,
  Zap,
  Bell,
  Info,
  AlertTriangle,
  CheckCircle2,
  XCircle
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { cn, formatCurrency } from '../lib/utils';
import { collection, getDocs, query, where, orderBy, limit, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { useAuth } from '../lib/auth';
import { useTranslation, Trans } from 'react-i18next';
import { SubscriptionModal } from '../components/SubscriptionModal';
import { SUBSCRIPTION_PLANS } from '../constants';
import { AnimatePresence } from 'motion/react';

export function Dashboard() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [systemNotifications, setSystemNotifications] = useState<any[]>([]);
  const [smsBalance, setSmsBalance] = useState(0);

  useEffect(() => {
    if (!user) return;

    // Listen for system notifications
    const q = query(collection(db, 'super_notifications'), limit(10));
    const unsubscribe = onSnapshot(q, (snap) => {
      const notifs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      
      // Sort client-side
      const sortedNotifs = notifs.sort((a: any, b: any) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA;
      });

      // Filter out dismissed notifications
      const dismissed = user.dismissedNotifications || [];
      setSystemNotifications(sortedNotifs.filter(n => !dismissed.includes(n.id)));
    }, (error) => {
      console.error("Error fetching system notifications:", error);
    });

    // Listen for SMS tokens
    const instId = user.institutionId || user.uid;
    const unsubCredits = onSnapshot(doc(db, 'credits', instId), (doc) => {
      if (doc.exists()) {
        setSmsBalance(doc.data().balance || 0);
      }
    });

    return () => {
      unsubscribe();
      unsubCredits();
    };
  }, [user]);

  const dismissNotification = async (id: string) => {
    if (!user) return;
    try {
      const userRef = doc(db, 'users', user.uid);
      const currentDismissed = user.dismissedNotifications || [];
      await updateDoc(userRef, {
        dismissedNotifications: [...currentDismissed, id]
      });
    } catch (error) {
      console.error("Error dismissing notification:", error);
    }
  };
  const [stats, setStats] = useState({
    students: 0,
    batches: 0,
    offlineExams: 0,
    pendingResults: 0,
    attendanceRate: 0,
    totalCollected: 0,
  });
  const [loading, setLoading] = useState(true);
  const [recentExams, setRecentExams] = useState<any[]>([]);
  const [recentAttendance, setRecentAttendance] = useState<any[]>([]);
  const [studentsWithDues, setStudentsWithDues] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [fees, setFees] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (!user) return;

    const instId = user.institutionId || user.uid;

    // Fetch all fees
    const qFees = query(
      collection(db, 'fees'),
      where('institutionId', '==', instId)
    );
    const unsubFees = onSnapshot(qFees, (snapshot) => {
      const feeData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setFees(feeData);
      
      const totalCollected = feeData
        .filter((f: any) => f.status === 'paid')
        .reduce((acc, f: any) => acc + (f.amount || 0), 0);
      
      setStats(prev => ({ ...prev, totalCollected }));
    });

    // Fetch all students
    const qStudents = query(
      collection(db, 'students'),
      where('institutionId', '==', instId)
    );
    const unsubStudents = onSnapshot(qStudents, (snapshot) => {
      const studentData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setStudents(studentData);
      setStats(prev => ({ ...prev, students: studentData.length }));
    });

    const qBatches = query(
      collection(db, 'batches'),
      where('institutionId', '==', instId)
    );
    const unsubBatches = onSnapshot(qBatches, (snapshot) => {
      setStats(prev => ({ ...prev, batches: snapshot.size }));
    });

    const qExams = query(
      collection(db, 'offline_exams'),
      where('institutionId', '==', instId)
    );
    const unsubExams = onSnapshot(qExams, (snapshot) => {
      setStats(prev => ({ ...prev, offlineExams: snapshot.size }));
      const pending = snapshot.docs.filter(doc => doc.data().status === 'pending').length;
      setStats(prev => ({ ...prev, pendingResults: pending }));
      
      const recent = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .sort((a: any, b: any) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))
        .slice(0, 5);
      setRecentExams(recent);
    });

    const qAttendance = query(
      collection(db, 'attendance'),
      where('institutionId', '==', instId)
    );
    const unsubAttendance = onSnapshot(qAttendance, (snapshot) => {
      if (snapshot.size > 0) {
        const present = snapshot.docs.filter(doc => doc.data().status === 'present').length;
        const rate = Math.round((present / snapshot.size) * 100);
        setStats(prev => ({ ...prev, attendanceRate: rate }));
      }
      
      const recent = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 5);
      setRecentAttendance(recent);
    });

    setLoading(false);

    return () => {
      unsubFees();
      unsubStudents();
      unsubBatches();
      unsubExams();
      unsubAttendance();
    };
  }, [user]);

  // Calculate dues whenever students or fees change
  useEffect(() => {
    const currentYear = new Date().getFullYear();
    const currentMonthIndex = new Date().getMonth();
    const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    const withDues = students.filter((student: any) => {
      if (student.status !== 'active') return false;
      const paidMonths = fees
        .filter((f: any) => f.studentId === student.id && f.year === currentYear && f.type === 'Monthly Fee' && f.status === 'paid')
        .map((f: any) => f.month);

      for (let i = 0; i <= currentMonthIndex; i++) {
        if (!paidMonths.includes(MONTHS[i])) return true;
      }
      return false;
    });
    setStudentsWithDues(withDues);
  }, [students, fees]);

  const filteredExams = recentExams.filter(exam => 
    exam.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredAttendance = recentAttendance.filter(record => 
    (record.studentName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (record.grade || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12">
      {/* Header & Search */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">
            {t('dashboard.title')}, {user?.displayName?.split(' ')[0] || 'Admin'} 👋
          </h1>
          <p className="text-gray-500 font-medium mt-1">Here's what's happening in your school today.</p>
        </div>
        <div className="relative w-full md:w-96 group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 group-focus-within:text-indigo-500 transition-colors" />
          <input
            type="text"
            placeholder={t('dashboard.search')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-sm"
          />
        </div>
      </div>

      {/* Due List Red Notice */}
      {studentsWithDues.length > 0 && (
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-rose-50 border-2 border-rose-200 rounded-3xl p-6 flex flex-col md:flex-row items-center justify-between gap-6 shadow-sm"
        >
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-rose-100 rounded-2xl flex items-center justify-center text-rose-600 animate-pulse">
              <AlertCircle className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-xl font-black text-rose-900">{t('dashboard.dueNotice')}</h2>
              <p className="text-rose-600 font-medium text-sm">
                <Trans i18nKey="dashboard.dueNoticeDesc" count={studentsWithDues.length}>
                  Currently <span className="font-black underline">{{count: studentsWithDues.length}} students</span> have monthly fees due. Take action quickly.
                </Trans>
              </p>
            </div>
          </div>
          <Link 
            to="/fees"
            className="px-8 py-3 bg-rose-600 text-white rounded-xl font-black hover:bg-rose-700 transition-all shadow-lg shadow-rose-200 flex items-center gap-2"
          >
            {t('dashboard.viewDueList')} <ChevronRight className="w-4 h-4" />
          </Link>
        </motion.div>
      )}

      {/* System Notifications */}
      <AnimatePresence>
        {systemNotifications.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2 px-2">
              <Bell className="w-4 h-4" /> {t('common.notifications')}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {systemNotifications.map((notif) => (
                <motion.div 
                  key={notif.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white dark:bg-gray-900 p-4 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm flex gap-3 group relative overflow-hidden"
                >
                  <div className={`p-2 rounded-xl flex-shrink-0 h-fit ${
                    notif.type === 'info' ? 'bg-blue-50 text-blue-600' :
                    notif.type === 'warning' ? 'bg-amber-50 text-amber-600' :
                    notif.type === 'success' ? 'bg-emerald-50 text-emerald-600' :
                    'bg-rose-50 text-rose-600'
                  }`}>
                    {notif.type === 'info' && <Info className="w-4 h-4" />}
                    {notif.type === 'warning' && <AlertTriangle className="w-4 h-4" />}
                    {notif.type === 'success' && <CheckCircle2 className="w-4 h-4" />}
                    {notif.type === 'error' && <XCircle className="w-4 h-4" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="text-sm font-bold text-gray-900 dark:text-white truncate pr-4">{notif.title}</h4>
                      <button 
                        onClick={() => dismissNotification(notif.id)}
                        className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                        title="Dismiss"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 mt-1">{notif.message}</p>
                    <p className="text-[10px] text-gray-400 mt-2">{new Date(notif.createdAt).toLocaleDateString()}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* Batch Creation & Upgrade Prompt */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-indigo-600 rounded-2xl p-4 md:p-6 text-white relative overflow-hidden shadow-lg shadow-indigo-100"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 opacity-50" />
          <div className="relative z-10 flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-white/20 backdrop-blur-md rounded-lg flex items-center justify-center flex-shrink-0">
                <Plus className="w-4 h-4" />
              </div>
              <h2 className="text-base font-bold leading-tight">{t('dashboard.startBatchTitle')}</h2>
            </div>
            <p className="text-indigo-100 text-xs opacity-90 line-clamp-1">
              {t('dashboard.startBatchDesc')}
            </p>
            <Link 
              to="/batches"
              className="w-fit px-4 py-2 bg-white text-indigo-600 rounded-lg font-bold hover:bg-indigo-50 transition-all shadow-md flex items-center gap-2 text-xs"
            >
              <Plus className="w-3 h-3" /> {t('dashboard.createBatch')}
            </Link>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl p-4 md:p-6 text-white relative overflow-hidden shadow-lg shadow-amber-100"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 opacity-50" />
          <div className="relative z-10 flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-white/20 backdrop-blur-md rounded-lg flex items-center justify-center flex-shrink-0">
                <Zap className="w-4 h-4 fill-white" />
              </div>
              <h2 className="text-base font-bold leading-tight">{t('Upgrade to Premium')}</h2>
            </div>
            <p className="text-amber-50 text-xs opacity-90 line-clamp-1">
              {t('Unlock limits & premium features.')}
            </p>
            <button 
              onClick={() => setIsUpgradeModalOpen(true)}
              className="w-fit px-4 py-2 bg-white text-amber-600 rounded-lg font-bold hover:bg-amber-50 transition-all shadow-md flex items-center gap-2 text-xs"
            >
              <Zap className="w-3 h-3 fill-amber-600" /> {t('Upgrade Now')}
            </button>
          </div>
        </motion.div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-3 md:gap-4">
        <StatItem label={t('dashboard.stats.totalStudents')} value={stats.students} icon={Users} color="indigo" to="/students" />
        <StatItem label={t('dashboard.stats.batches')} value={stats.batches} icon={Layers} color="emerald" to="/batches" />
        <StatItem label={t('dashboard.stats.offlineExams')} value={stats.offlineExams} icon={FileText} color="amber" to="/offline-exams" />
        <StatItem label={t('dashboard.stats.pendingResults')} value={stats.pendingResults} icon={AlertCircle} color="rose" to="/offline-exams" />
        <StatItem label={t('dashboard.stats.attendanceRate')} value={`${stats.attendanceRate}%`} icon={ClipboardCheck} color="indigo" to="/attendance" />
        <StatItem label={t('dashboard.stats.totalCollected')} value={formatCurrency(stats.totalCollected)} icon={CreditCard} color="emerald" to="/fees" />
        <StatItem label={t('dashboard.stats.studentsWithDues')} value={studentsWithDues.length} icon={AlertCircle} color="rose" to="/fees" />
      </div>

      {/* Plan Usage Section */}
      <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600">
              <Zap className="w-6 h-6 fill-indigo-600" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900">{t('Subscription Plan')}</h3>
              <p className="text-sm text-gray-500 font-medium">
                {t('Current Plan')}: <span className="text-indigo-600 font-bold uppercase">{user?.subscriptionPlan || 'Free'}</span>
              </p>
            </div>
          </div>
          <button 
            onClick={() => setIsUpgradeModalOpen(true)}
            className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 flex items-center gap-2"
          >
            <Zap className="w-4 h-4 fill-white" /> {t('Upgrade Plan')}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Student Limit */}
          <div className="space-y-3">
            <div className="flex justify-between items-end">
              <div>
                <p className="text-sm font-bold text-gray-900">{t('Student Limit')}</p>
                <p className="text-xs text-gray-500 font-medium">{stats.students} / {SUBSCRIPTION_PLANS.find(p => p.id === user?.subscriptionPlan)?.studentLimit || 15} {t('Students')}</p>
              </div>
              <p className="text-sm font-black text-indigo-600">
                {Math.round((stats.students / (SUBSCRIPTION_PLANS.find(p => p.id === user?.subscriptionPlan)?.studentLimit || 15)) * 100)}%
              </p>
            </div>
            <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(100, (stats.students / (SUBSCRIPTION_PLANS.find(p => p.id === user?.subscriptionPlan)?.studentLimit || 15)) * 100)}%` }}
                className={cn(
                  "h-full transition-all duration-1000",
                  (stats.students / (SUBSCRIPTION_PLANS.find(p => p.id === user?.subscriptionPlan)?.studentLimit || 15)) > 0.9 ? "bg-rose-500" : "bg-indigo-600"
                )}
              />
            </div>
          </div>

          {/* Batch Limit */}
          <div className="space-y-3">
            <div className="flex justify-between items-end">
              <div>
                <p className="text-sm font-bold text-gray-900">{t('Batch Limit')}</p>
                <p className="text-xs text-gray-500 font-medium">{stats.batches} / {SUBSCRIPTION_PLANS.find(p => p.id === user?.subscriptionPlan)?.batchLimit || 2} {t('Batches')}</p>
              </div>
              <p className="text-sm font-black text-emerald-600">
                {Math.round((stats.batches / (SUBSCRIPTION_PLANS.find(p => p.id === user?.subscriptionPlan)?.batchLimit || 2)) * 100)}%
              </p>
            </div>
            <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(100, (stats.batches / (SUBSCRIPTION_PLANS.find(p => p.id === user?.subscriptionPlan)?.batchLimit || 2)) * 100)}%` }}
                className={cn(
                  "h-full transition-all duration-1000",
                  (stats.batches / (SUBSCRIPTION_PLANS.find(p => p.id === user?.subscriptionPlan)?.batchLimit || 2)) > 0.9 ? "bg-rose-500" : "bg-emerald-600"
                )}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <QuickAction 
          title={t('dashboard.quickActions.takeAttendance')} 
          description={t('dashboard.quickActions.takeAttendanceDesc')} 
          icon={ClipboardCheck} 
          to="/attendance" 
          color="bg-emerald-50 text-emerald-600"
        />
        <QuickAction 
          title={t('dashboard.quickActions.offlineExams')} 
          description={t('dashboard.quickActions.offlineExamsDesc')} 
          icon={FileText} 
          to="/offline-exams" 
          color="bg-amber-50 text-amber-600"
        />
        <QuickAction 
          title={t('dashboard.quickActions.feeManagement')} 
          description={t('dashboard.quickActions.feeManagementDesc')} 
          icon={CreditCard} 
          to="/fees" 
          color="bg-rose-50 text-rose-600"
        />
        <QuickAction 
          title={t('dashboard.quickActions.students')} 
          description={t('dashboard.quickActions.studentsDesc')} 
          icon={Users} 
          to="/students" 
          color="bg-indigo-50 text-indigo-600"
        />
      </div>

      {/* Recent Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Offline Exams */}
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-50 flex items-center justify-between">
            <h3 className="font-bold text-gray-900">{t('dashboard.recentExams')}</h3>
            <Link to="/offline-exams" className="text-sm font-bold text-indigo-600 hover:text-indigo-700">{t('dashboard.viewAll')}</Link>
          </div>
          {filteredExams.length > 0 ? (
            <div className="divide-y divide-gray-50">
              {filteredExams.map((exam) => (
                <div key={exam.id} className="p-4 hover:bg-gray-50 transition-colors flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-900">{exam.title}</p>
                      <p className="text-xs text-gray-500">{new Date(exam.date).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <span className={cn(
                    "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider",
                    exam.status === 'completed' ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"
                  )}>
                    {exam.status}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-12 flex flex-col items-center justify-center text-center space-y-4">
              <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center text-gray-300">
                <FileText className="w-8 h-8" />
              </div>
              <p className="text-gray-500 text-sm font-medium">{t('dashboard.noExams')}</p>
              <Link 
                to="/offline-exams"
                className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
              >
                {t('common.add')}
              </Link>
            </div>
          )}
        </div>

        {/* Recent Attendance */}
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-50 flex items-center justify-between">
            <h3 className="font-bold text-gray-900">{t('dashboard.recentAttendance')}</h3>
            <Link to="/attendance" className="text-sm font-bold text-indigo-600 hover:text-indigo-700">{t('dashboard.viewAll')}</Link>
          </div>
          {filteredAttendance.length > 0 ? (
            <div className="divide-y divide-gray-50">
              {filteredAttendance.map((record) => (
                <div key={record.id} className="p-4 hover:bg-gray-50 transition-colors flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
                      <ClipboardCheck className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-900">{record.studentName || 'Student'}</p>
                      <p className="text-xs text-gray-500">{new Date(record.date).toLocaleDateString()} • {record.grade}</p>
                    </div>
                  </div>
                  <span className={cn(
                    "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider",
                    record.status === 'present' ? "bg-emerald-50 text-emerald-600" : record.status === 'absent' ? "bg-rose-50 text-rose-600" : "bg-amber-50 text-amber-600"
                  )}>
                    {record.status}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-12 flex flex-col items-center justify-center text-center space-y-4">
              <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center text-gray-300">
                <ClipboardCheck className="w-8 h-8" />
              </div>
              <p className="text-gray-500 text-sm font-medium">{t('dashboard.noAttendance')}</p>
              <Link 
                to="/attendance"
                className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
              >
                {t('dashboard.quickActions.takeAttendance')}
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* SMS Tokens Widget */}
      <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600">
            <MessageSquare className="w-6 h-6" />
          </div>
          <div>
            <h4 className="font-bold text-gray-900">{t('dashboard.smsTokens')}</h4>
            <p className="text-xs text-gray-500">{t('dashboard.sentThisMonth', { count: user?.monthlySmsSent || 0 })}</p>
          </div>
        </div>
        <div className="flex items-center gap-8">
          <div className="text-center">
            <p className="text-2xl font-black text-gray-900">{smsBalance}</p>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{t('dashboard.available')}</p>
          </div>
          <button 
            onClick={() => setIsUpgradeModalOpen(true)}
            className="px-6 py-2.5 bg-gray-900 text-white rounded-xl font-bold text-sm hover:bg-gray-800 transition-all"
          >
            {t('dashboard.buyTokens')}
          </button>
        </div>
      </div>

      <SubscriptionModal 
        isOpen={isUpgradeModalOpen} 
        onClose={() => setIsUpgradeModalOpen(false)} 
      />
    </div>
  );
}

function StatItem({ label, value, icon: Icon, color, to }: { label: string, value: string | number, icon: any, color: string, to: string }) {
  const colors = {
    indigo: "bg-indigo-50 text-indigo-600 border-indigo-100 group-hover:bg-indigo-600 group-hover:text-white",
    emerald: "bg-emerald-50 text-emerald-600 border-emerald-100 group-hover:bg-emerald-600 group-hover:text-white",
    amber: "bg-amber-50 text-amber-600 border-amber-100 group-hover:bg-amber-600 group-hover:text-white",
    rose: "bg-rose-50 text-rose-600 border-rose-100 group-hover:bg-rose-600 group-hover:text-white",
  };

  return (
    <Link to={to} className="group">
      <div className="bg-white p-3 md:p-5 rounded-2xl md:rounded-3xl border border-gray-100 shadow-sm group-hover:shadow-xl group-hover:shadow-indigo-100/50 group-hover:border-indigo-200 transition-all duration-300 flex flex-col items-center text-center space-y-2 md:space-y-3">
        <div className={cn("w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl flex items-center justify-center transition-all duration-300", colors[color as keyof typeof colors])}>
          <Icon className="w-5 h-5 md:w-6 md:h-6" />
        </div>
        <div>
          <p className="text-[8px] md:text-[10px] font-black text-gray-400 uppercase tracking-widest mb-0.5 md:mb-1">{label}</p>
          <p className="text-lg md:text-2xl font-black text-gray-900 group-hover:text-indigo-600 transition-colors">{value}</p>
        </div>
      </div>
    </Link>
  );
}

function QuickAction({ title, description, icon: Icon, to, color }: { title: string, description: string, icon: any, to: string, color: string }) {
  return (
    <Link to={to} className="group">
      <div className="bg-white p-4 md:p-6 rounded-2xl md:rounded-3xl border border-gray-100 shadow-sm group-hover:shadow-md group-hover:border-indigo-100 transition-all flex flex-col items-center text-center space-y-3 md:space-y-4">
        <div className={cn("w-12 h-12 md:w-14 md:h-14 rounded-xl md:rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110", color)}>
          <Icon className="w-6 h-6 md:w-7 md:h-7" />
        </div>
        <div>
          <h4 className="text-sm md:text-base font-bold text-gray-900 group-hover:text-indigo-600 transition-colors">{title}</h4>
          <p className="text-[10px] md:text-xs text-gray-500 mt-1">{description}</p>
        </div>
        <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-indigo-400 transition-colors hidden md:block" />
      </div>
    </Link>
  );
}
