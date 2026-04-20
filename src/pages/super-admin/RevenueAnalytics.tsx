import React from 'react';
import { 
  TrendingUp, 
  Activity, 
  Users, 
  Zap, 
  ArrowUpRight, 
  ArrowDownRight, 
  BarChart3, 
  PieChart as PieChartIcon,
  Filter,
  Download,
  Calendar
} from 'lucide-react';
import { motion } from 'motion/react';
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
import { useTranslation } from 'react-i18next';
import { formatCurrency } from '../../lib/utils';
import { db } from '../../firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

export function RevenueAnalytics() {
  const { t } = useTranslation();

  const [revenueStats, setRevenueStats] = React.useState({
    totalRevenue: 0,
    activeSubs: 0,
    avgRevenue: 0,
  });
  const [plans, setPlans] = React.useState([
    { name: 'Basic', value: 0, color: '#4f46e5' },
    { name: 'Standard', value: 0, color: '#10b981' },
    { name: 'Advanced', value: 0, color: '#f59e0b' },
    { name: 'Free', value: 0, color: '#9ca3af' },
  ]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    async function fetchStats() {
      try {
        const q = query(collection(db, 'users'), where('role', '==', 'admin'));
        const snap = await getDocs(q);
        const users = snap.docs.map(d => d.data());
        
        const basic = users.filter(u => u.subscriptionPlan === 'basic').length;
        const standard = users.filter(u => u.subscriptionPlan === 'standard').length;
        const advanced = users.filter(u => u.subscriptionPlan === 'advanced').length;
        const free = users.filter(u => !u.subscriptionPlan || u.subscriptionPlan === 'free').length;
        
        const activeSubs = basic + standard + advanced;
        const totalRevenue = (basic * 1500) + (standard * 3000) + (advanced * 5000); // Example monthly prices
        const avgRev = activeSubs > 0 ? totalRevenue / activeSubs : 0;
        
        setRevenueStats({
          totalRevenue,
          activeSubs,
          avgRevenue: avgRev
        });
        
        setPlans([
          { name: 'Basic', value: basic, color: '#4f46e5' },
          { name: 'Standard', value: standard, color: '#10b981' },
          { name: 'Advanced', value: advanced, color: '#f59e0b' },
          { name: 'Free', value: free, color: '#9ca3af' },
        ]);
      } catch (error) {
        console.error("Error fetching revenue stats:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, []);

  const revenueData = [
    { month: 'Jan', revenue: revenueStats.totalRevenue * 0.7 },
    { month: 'Feb', revenue: revenueStats.totalRevenue * 0.8 },
    { month: 'Mar', revenue: revenueStats.totalRevenue * 0.9 },
    { month: 'Apr', revenue: revenueStats.totalRevenue },
  ];

  const stats = [
    { label: 'Total Revenue', value: formatCurrency(revenueStats.totalRevenue), change: '+12%', icon: TrendingUp, color: 'emerald' },
    { label: 'Active Subscriptions', value: revenueStats.activeSubs.toString(), change: '+5%', icon: Zap, color: 'indigo' },
    { label: 'Avg. Revenue/User', value: formatCurrency(revenueStats.avgRevenue), change: '+2%', icon: Activity, color: 'amber' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">Revenue Analytics</h1>
          <p className="text-gray-500 dark:text-gray-400">Track subscriptions, revenue, and growth metrics.</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl text-gray-600 dark:text-gray-400 font-bold hover:bg-gray-50 transition-all">
            <Filter className="w-4 h-4" /> Filter
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 dark:shadow-none">
            <Download className="w-4 h-4" /> Export
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {stats.map((stat, idx) => (
          <div key={idx} className="bg-white dark:bg-gray-900 p-6 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className={`p-3 rounded-2xl bg-${stat.color}-50 text-${stat.color}-600`}>
                <stat.icon className="w-6 h-6" />
              </div>
              <span className={`text-[10px] font-bold px-2 py-1 rounded-lg flex items-center gap-1 ${
                stat.change.startsWith('+') ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'
              }`}>
                {stat.change.startsWith('+') ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                {stat.change}
              </span>
            </div>
            <p className="text-2xl font-black text-gray-900 dark:text-white mb-1">{stat.value}</p>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white dark:bg-gray-900 p-6 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-indigo-600" /> Revenue Growth
            </h3>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gray-400" />
              <span className="text-xs font-bold text-gray-500">Last 6 Months</span>
            </div>
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueData}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis 
                  dataKey="month" 
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
                <Area 
                  type="monotone" 
                  dataKey="revenue" 
                  stroke="#4f46e5" 
                  strokeWidth={3}
                  fillOpacity={1} 
                  fill="url(#colorRevenue)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-900 p-6 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm">
          <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2 mb-6">
            <PieChartIcon className="w-4 h-4 text-indigo-600" /> Subscription Mix
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={plans}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {plans.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-3 mt-6">
            {plans.map((plan, idx) => (
              <div key={idx} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: plan.color }} />
                  <span className="text-xs font-bold text-gray-600 dark:text-gray-400">{plan.name}</span>
                </div>
                <span className="text-xs font-black text-gray-900 dark:text-white">{plan.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
