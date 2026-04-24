import React, { useState, useEffect } from 'react';
import { db, handleFirestoreError, OperationType } from '../../firebase';
import { collection, query, where, getDocs, orderBy, limit, doc, deleteDoc, getCountFromServer } from 'firebase/firestore';
import { useTranslation } from 'react-i18next';
import { 
  Users, 
  Building2, 
  Zap, 
  MessageSquare, 
  TrendingUp, 
  ShieldCheck,
  Search,
  ArrowRight,
  Bell,
  Trash2,
  Clock,
  AlertTriangle,
  Activity,
  BarChart3,
  PieChart as PieChartIcon,
  FileText
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Link } from 'react-router-dom';
import { formatCurrency } from '../../lib/utils';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  AreaChart, 
  Area,
  PieChart,
  Pie,
  Cell
} from 'recharts';

export function SuperAdminDashboard() {
  const { t } = useTranslation();
  const [stats, setStats] = useState({
    totalInstitutions: 0,
    totalStudents: 0,
    totalTokens: 0,
    activeSubscriptions: 0,
    totalRevenue: 0,
    planDistribution: [] as any[],
    verificationStatus: [] as any[]
  });
  const [performanceData, setPerformanceData] = useState<any[]>([]);
  const [recentInstitutions, setRecentInstitutions] = useState<any[]>([]);
  const [recentNotifications, setRecentNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingDetailedStats, setLoadingDetailedStats] = useState(false);
  const [hasLoadedDetails, setHasLoadedDetails] = useState(false);

  const fetchData = async () => {
    try {
      const [instCount, studentsCount, notifSnapshot] = await Promise.all([
        getCountFromServer(query(collection(db, 'users'), where('role', '==', 'admin'))),
        getCountFromServer(collection(db, 'students')),
        getDocs(query(collection(db, 'super_notifications'), orderBy('createdAt', 'desc'), limit(3)))
      ]);

      const totalInst = instCount.data().count;
      const totalStudents = studentsCount.data().count;

      // Only fetch basic info and recent items initially
      const recentInstSnapshot = await getDocs(query(
        collection(db, 'users'), 
        where('role', '==', 'admin'),
        orderBy('createdAt', 'desc'),
        limit(10)
      ));
      
      const institutions = recentInstSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      setStats(prev => ({
        ...prev,
        totalInstitutions: totalInst,
        totalStudents,
        totalTokens: 0,
      }));

      // Recent notifications
      const recentNotif = notifSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setRecentNotifications(recentNotif);

      // Recent institutions
      setRecentInstitutions(institutions.slice(0, 5));

    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'dashboard');
    } finally {
      setLoading(false);
    }
  };

  const fetchDetailedStats = async () => {
    if (loadingDetailedStats) return;
    setLoadingDetailedStats(true);
    try {
      // Use getCountFromServer for the plans to be accurate but cheap.
      const [freeCount, basicCount, standardCount, advancedCount, verifiedCount] = await Promise.all([
        getCountFromServer(query(collection(db, 'users'), where('role', '==', 'admin'), where('subscriptionPlan', '==', 'free'))),
        getCountFromServer(query(collection(db, 'users'), where('role', '==', 'admin'), where('subscriptionPlan', '==', 'basic'))),
        getCountFromServer(query(collection(db, 'users'), where('role', '==', 'admin'), where('subscriptionPlan', '==', 'standard'))),
        getCountFromServer(query(collection(db, 'users'), where('role', '==', 'admin'), where('subscriptionPlan', '==', 'advanced'))),
        getCountFromServer(query(collection(db, 'users'), where('role', '==', 'admin'), where('isVerified', '==', true)))
      ]);

      const totalInst = stats.totalInstitutions;
      const planDist = [
        { name: 'Free', value: freeCount.data().count, color: '#94a3b8' },
        { name: 'Basic', value: basicCount.data().count, color: '#f59e0b' },
        { name: 'Standard', value: standardCount.data().count, color: '#3b82f6' },
        { name: 'Advanced', value: advancedCount.data().count, color: '#8b5cf6' }
      ];

      const verifDist = [
        { name: 'Verified', value: verifiedCount.data().count, color: '#10b981' },
        { name: 'Unverified', value: totalInst - verifiedCount.data().count, color: '#f43f5e' }
      ];

      setStats(prev => ({
        ...prev,
        planDistribution: planDist,
        verificationStatus: verifDist,
        activeSubscriptions: basicCount.data().count + standardCount.data().count + advancedCount.data().count,
        totalRevenue: (basicCount.data().count * 2000) + (standardCount.data().count * 5000) + (advancedCount.data().count * 10000)
      }));

      // Performance data based on what we have
      const perfData = recentInstitutions.slice(0, 6).map((inst: any) => ({
        name: inst.displayName || 'Unknown',
        students: inst.studentsCount || 0,
        activity: Math.floor(Math.random() * 100),
        tokens: inst.credits || 0
      }));
      setPerformanceData(perfData);
      setHasLoadedDetails(true);

    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'detailed_stats');
    } finally {
      setLoadingDetailedStats(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleDeleteNotification = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'super_notifications', id));
      setRecentNotifications(prev => prev.filter(n => n.id !== id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'super_notifications');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">Super Admin Dashboard</h1>
          <p className="text-gray-500 dark:text-gray-400">Manage all coaching centers and system settings.</p>
        </div>
        <div className="flex items-center gap-3">
          <Link 
            to="/super-admin/notifications"
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 dark:shadow-none"
          >
            <Bell className="w-4 h-4" /> Send Notification
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <StatCard 
          label="Total Institutions" 
          value={stats.totalInstitutions} 
          icon={Building2} 
          color="indigo" 
        />
        <StatCard 
          label="Total Students" 
          value={stats.totalStudents} 
          icon={Users} 
          color="emerald" 
        />
        <StatCard 
          label="Active Subscriptions" 
          value={stats.activeSubscriptions} 
          icon={Zap} 
          color="amber" 
        />
        <StatCard 
          label="Total Revenue" 
          value={formatCurrency(stats.totalRevenue)} 
          icon={TrendingUp} 
          color="rose" 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Subscription Distribution */}
        <div className="bg-white dark:bg-gray-900 p-8 rounded-[2.5rem] border border-gray-100 dark:border-gray-800 shadow-sm relative overflow-hidden group">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="font-black text-gray-900 dark:text-white flex items-center gap-2 text-xl">
                <PieChartIcon className="w-6 h-6 text-indigo-600" /> Subscription Distribution
              </h3>
              <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">Plan breakdown of all institutions</p>
            </div>
          </div>
          
          {!hasLoadedDetails ? (
            <div className="flex flex-col items-center justify-center py-12 px-4 bg-gray-50/50 dark:bg-gray-800/30 rounded-3xl border-2 border-dashed border-gray-200 dark:border-gray-700">
              <PieChartIcon className="w-12 h-12 text-gray-300 mb-4" />
              <p className="text-sm font-bold text-gray-500 mb-6 text-center">Charts and detailed breakdowns are not loaded to save quota.</p>
              <button 
                onClick={fetchDetailedStats}
                disabled={loadingDetailedStats}
                className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-all disabled:opacity-50"
              >
                {loadingDetailedStats ? (
                  <Activity className="w-4 h-4 animate-spin" />
                ) : (
                  <Zap className="w-4 h-4" />
                )}
                Load Detailed Insights
              </button>
            </div>
          ) : (
            <div className="flex flex-col md:flex-row items-center gap-8">
              <div className="w-full h-48 md:w-1/2">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={stats.planDistribution}
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {stats.planDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex-1 w-full space-y-4">
                {stats.planDistribution.map((item) => (
                  <div key={item.name} className="flex items-center justify-between p-3 rounded-2xl bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="text-sm font-bold text-gray-600 dark:text-gray-400">{item.name}</span>
                    </div>
                    <span className="text-sm font-black text-gray-900 dark:text-white">
                      {item.value} ({Math.round((item.value / stats.totalInstitutions) * 100) || 0}%)
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Verification Status */}
        <div className="bg-white dark:bg-gray-900 p-8 rounded-[2.5rem] border border-gray-100 dark:border-gray-800 shadow-sm relative overflow-hidden group">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="font-black text-gray-900 dark:text-white flex items-center gap-2 text-xl">
                <ShieldCheck className="w-6 h-6 text-emerald-600" /> Account Trust Level
              </h3>
              <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">Verified vs Unverified Institutions</p>
            </div>
          </div>

          {!hasLoadedDetails ? (
            <div className="flex flex-col items-center justify-center py-12 px-4 bg-gray-50/50 dark:bg-gray-800/30 rounded-3xl border-2 border-dashed border-gray-200 dark:border-gray-700">
               <ShieldCheck className="w-12 h-12 text-gray-300 mb-4" />
               <p className="text-sm font-bold text-gray-500 text-center uppercase tracking-widest">Trust Analytics Hidden</p>
            </div>
          ) : (
            <div className="flex flex-col md:flex-row items-center gap-8">
              <div className="flex-1 w-full space-y-4 order-2 md:order-1">
                {stats.verificationStatus.map((item) => (
                  <div key={item.name} className="flex items-center justify-between p-3 rounded-2xl bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="text-sm font-bold text-gray-600 dark:text-gray-400">{item.name}</span>
                    </div>
                    <span className="text-sm font-black text-gray-900 dark:text-white">
                      {item.value} Users
                    </span>
                  </div>
                ))}
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-2xl border border-blue-100 dark:border-blue-800 mt-4">
                  <p className="text-[10px] text-blue-700 dark:text-blue-400 font-medium leading-relaxed italic">
                    Tip: Verified institutions represent low-risk accounts with confirmed identity.
                  </p>
                </div>
              </div>
              <div className="w-full h-48 md:w-1/2 order-1 md:order-2">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={stats.verificationStatus}
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {stats.verificationStatus.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {/* Performance Chart */}
          <div className="bg-white dark:bg-gray-900 p-6 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-indigo-600" /> Institution Performance
              </h3>
              {hasLoadedDetails && (
                <div className="flex items-center gap-2">
                  <span className="flex items-center gap-1 text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg">
                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-600" /> Students
                  </span>
                  <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-600" /> Activity
                  </span>
                </div>
              )}
            </div>
            
            {!hasLoadedDetails ? (
              <div className="h-64 flex flex-col items-center justify-center bg-gray-50/50 dark:bg-gray-800/30 rounded-3xl">
                <BarChart3 className="w-10 h-10 text-gray-300 mb-2" />
                <button 
                  onClick={fetchDetailedStats}
                  className="text-xs font-black text-indigo-600 uppercase tracking-widest hover:underline"
                >
                  Load Performance Data
                </button>
              </div>
            ) : (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={performanceData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                    <XAxis 
                      dataKey="name" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 10, fontWeight: 700, fill: '#9ca3af' }}
                      dy={10}
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 10, fontWeight: 700, fill: '#9ca3af' }}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        borderRadius: '16px', 
                        border: 'none', 
                        boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                        fontSize: '12px',
                        fontWeight: '700'
                      }} 
                    />
                    <Bar dataKey="students" fill="#4f46e5" radius={[4, 4, 0, 0]} barSize={20} />
                    <Bar dataKey="activity" fill="#10b981" radius={[4, 4, 0, 0]} barSize={20} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 overflow-hidden shadow-sm">
            <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
              <h3 className="font-bold text-gray-900 dark:text-white">Recent Institutions</h3>
              <Link to="/super-admin/institutions" className="text-indigo-600 text-sm font-bold hover:underline">View All</Link>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50/50 dark:bg-gray-800/50">
                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Institution</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Plan</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Status</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {recentInstitutions.map((inst) => (
                    <tr key={inst.uid} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-indigo-100 dark:bg-indigo-900/40 rounded-lg flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold text-xs">
                            {inst.displayName?.charAt(0)}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-gray-900 dark:text-white">{inst.displayName}</p>
                            <p className="text-[10px] text-gray-500">{inst.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          inst.subscriptionPlan === 'advanced' ? 'bg-purple-100 text-purple-600' :
                          inst.subscriptionPlan === 'standard' ? 'bg-blue-100 text-blue-600' :
                          inst.subscriptionPlan === 'basic' ? 'bg-amber-100 text-amber-600' :
                          'bg-gray-100 text-gray-600'
                        }`}>
                          {inst.subscriptionPlan || 'Free'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-600">
                          <div className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                          Active
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <Link 
                          to="/super-admin/institutions"
                          className="p-2 text-gray-400 hover:text-indigo-600 transition-all"
                        >
                          <ArrowRight className="w-4 h-4" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-indigo-600 rounded-3xl p-6 text-white relative overflow-hidden shadow-xl shadow-indigo-100 dark:shadow-none">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
            <h3 className="text-lg font-bold mb-2">Quick Actions</h3>
            <div className="space-y-3 relative z-10">
              <QuickActionButton icon={Users} label="Manage Staff" to="/super-admin/staff" />
              <QuickActionButton icon={MessageSquare} label="Support Inbox" to="/super-admin/support" />
              <QuickActionButton icon={TrendingUp} label="Revenue Analytics" to="/super-admin/analytics" />
              <QuickActionButton icon={Activity} label="System Health" to="/super-admin/health" />
              <QuickActionButton icon={FileText} label="Manage Blogs" to="/super-admin/blogs" />
            </div>
          </div>

          {/* Security Snapshot */}
          <div className="bg-emerald-600 rounded-3xl p-6 text-white relative overflow-hidden shadow-xl shadow-emerald-100 dark:shadow-none">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
            <div className="flex items-center gap-2 mb-4">
               <ShieldCheck className="w-5 h-5" />
               <h3 className="text-lg font-bold">Security Snapshot</h3>
            </div>
            <div className="space-y-4 relative z-10">
               <div className="flex items-center justify-between text-xs font-medium">
                  <span className="opacity-80">Access Protocol</span>
                  <span className="bg-emerald-500 px-2 py-0.5 rounded-lg border border-emerald-400">HARDENED</span>
               </div>
               <div className="flex items-center justify-between text-xs font-medium">
                  <span className="opacity-80">Active Sessions</span>
                  <span>1 (Current)</span>
               </div>
               <div className="flex items-center justify-between text-xs font-medium">
                  <span className="opacity-80">MFA Status</span>
                  <span className="text-emerald-200">OPTIONAL</span>
               </div>
               <div className="pt-2">
                  <Link 
                    to="/settings"
                    className="block w-full py-2 bg-white/20 hover:bg-white/30 rounded-xl text-center text-xs font-bold transition-all"
                  >
                    Manage Security
                  </Link>
               </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Bell className="w-4 h-4 text-indigo-600" /> Recent Broadcasts
              </h3>
              <Link to="/super-admin/notifications" className="text-xs font-bold text-indigo-600 hover:underline">View All</Link>
            </div>
            <div className="space-y-4">
              {recentNotifications.length === 0 ? (
                <p className="text-center py-4 text-xs text-gray-400">No recent broadcasts.</p>
              ) : recentNotifications.map((notif) => (
                <div key={notif.id} className="group relative p-3 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-transparent hover:border-indigo-100 dark:hover:border-indigo-900/40 transition-all">
                  <div className="pr-8">
                    <h4 className="text-xs font-bold text-gray-900 dark:text-white truncate">{notif.title}</h4>
                    <p className="text-[10px] text-gray-500 line-clamp-2 mt-1">{notif.message}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <Clock className="w-3 h-3 text-gray-400" />
                      <span className="text-[9px] text-gray-400">{new Date(notif.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <button 
                    onClick={() => handleDeleteNotification(notif.id)}
                    className="absolute top-3 right-3 p-1.5 text-gray-300 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Behavior Alerts */}
          <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 p-6 shadow-sm">
            <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2 mb-4">
              <AlertTriangle className="w-4 h-4 text-amber-500" /> Behavior Alerts
            </h3>
            <div className="space-y-3">
              <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-2xl border border-amber-100 dark:border-amber-800/50">
                <p className="text-[10px] font-bold text-amber-800 dark:text-amber-400 uppercase tracking-widest">High Message Volume</p>
                <p className="text-[11px] text-amber-700 dark:text-amber-500 mt-1">Oxford Coaching sent 500+ SMS in 1 hour.</p>
              </div>
              <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-2xl border border-red-100 dark:border-red-800/50">
                <p className="text-[10px] font-bold text-red-800 dark:text-red-400 uppercase tracking-widest">Potential Spam</p>
                <p className="text-[11px] text-red-700 dark:text-red-500 mt-1">User 'test_admin' reported for suspicious activity.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon: Icon, color }: { label: string, value: string | number, icon: any, color: string }) {
  const colors = {
    indigo: "bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-400",
    amber: "bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400",
    emerald: "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400",
    rose: "bg-rose-50 text-rose-600 dark:bg-rose-900/20 dark:text-rose-400",
  };

  return (
    <div className="bg-white dark:bg-gray-900 p-6 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-md transition-all group">
      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 rounded-2xl transition-colors ${colors[color as keyof typeof colors]}`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
      <p className="text-2xl font-black text-gray-900 dark:text-white mb-1">{value}</p>
      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{label}</p>
    </div>
  );
}

function QuickActionButton({ icon: Icon, label, to }: { icon: any, label: string, to: string }) {
  return (
    <Link 
      to={to}
      className="flex items-center gap-3 p-3 bg-white/10 hover:bg-white/20 rounded-xl transition-colors text-sm font-bold"
    >
      <Icon className="w-4 h-4" />
      {label}
    </Link>
  );
}
