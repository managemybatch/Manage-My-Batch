import React, { useState, useEffect } from 'react';
import { db, handleFirestoreError, OperationType } from '../../firebase';
import { collection, query, where, getDocs, orderBy, limit, doc, deleteDoc } from 'firebase/firestore';
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
  PieChart as PieChartIcon
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
    totalRevenue: 0
  });
  const [performanceData, setPerformanceData] = useState<any[]>([]);
  const [recentInstitutions, setRecentInstitutions] = useState<any[]>([]);
  const [recentNotifications, setRecentNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const [instSnapshot, studentsSnapshot, creditsSnapshot, notifSnapshot] = await Promise.all([
        getDocs(collection(db, 'users')),
        getDocs(collection(db, 'students')),
        getDocs(collection(db, 'credits')),
        getDocs(query(collection(db, 'super_notifications'), orderBy('createdAt', 'desc'), limit(3)))
      ]);

      const allUsers = instSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const institutions = allUsers.filter((u: any) => u.role === 'admin' || u.role === 'super_admin');
      const activeSubs = institutions.filter((inst: any) => inst.subscriptionPlan && inst.subscriptionPlan !== 'free').length;
      const totalTokens = creditsSnapshot.docs.reduce((acc, doc) => acc + (doc.data().balance || 0), 0);
      const totalStudents = studentsSnapshot.size;

      setStats({
        totalInstitutions: institutions.length,
        totalStudents,
        totalTokens,
        activeSubscriptions: activeSubs,
        totalRevenue: activeSubs * 5000 
      });

      // Performance data for charts
      const perfData = institutions.slice(0, 6).map((inst: any) => ({
        name: inst.displayName || 'Unknown',
        students: 0,
        activity: 0,
        tokens: 0
      }));
      setPerformanceData(perfData);

      // Recent institutions
      setRecentInstitutions(institutions.slice(0, 5));

      // Recent notifications
      const recentNotif = notifSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setRecentNotifications(recentNotif);

    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'dashboard');
    } finally {
      setLoading(false);
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {/* Performance Chart */}
          <div className="bg-white dark:bg-gray-900 p-6 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-indigo-600" /> Institution Performance
              </h3>
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1 text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg">
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-600" /> Students
                </span>
                <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-600" /> Activity
                </span>
              </div>
            </div>
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
