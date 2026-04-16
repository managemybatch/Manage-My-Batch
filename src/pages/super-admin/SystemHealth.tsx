import React from 'react';
import { 
  ShieldCheck, 
  Activity, 
  Database, 
  Lock, 
  Server, 
  Globe, 
  CheckCircle2, 
  AlertCircle,
  Cpu,
  HardDrive,
  Network
} from 'lucide-react';
import { motion } from 'motion/react';
import { useTranslation } from 'react-i18next';

export function SystemHealth() {
  const { t } = useTranslation();

  const services = [
    { name: 'Database (Firestore)', status: 'healthy', latency: '45ms', icon: Database },
    { name: 'Authentication', status: 'healthy', latency: '120ms', icon: Lock },
    { name: 'Storage', status: 'healthy', latency: '85ms', icon: HardDrive },
    { name: 'API Gateway', status: 'healthy', latency: '32ms', icon: Server },
    { name: 'CDN', status: 'healthy', latency: '12ms', icon: Globe },
  ];

  const metrics = [
    { label: 'CPU Usage', value: '12%', icon: Cpu, color: 'indigo' },
    { label: 'Memory Usage', value: '45%', icon: Activity, color: 'emerald' },
    { label: 'Network Load', value: '2.4 GB/s', icon: Network, color: 'amber' },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">System Health</h1>
        <p className="text-gray-500 dark:text-gray-400">Real-time status of all system components.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {metrics.map((metric, idx) => (
          <div key={idx} className="bg-white dark:bg-gray-900 p-6 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className={`p-3 rounded-2xl bg-${metric.color}-50 text-${metric.color}-600`}>
                <metric.icon className="w-6 h-6" />
              </div>
              <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Optimal
              </span>
            </div>
            <p className="text-2xl font-black text-gray-900 dark:text-white mb-1">{metric.value}</p>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{metric.label}</p>
          </div>
        ))}
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 overflow-hidden shadow-sm">
        <div className="p-6 border-b border-gray-100 dark:border-gray-800">
          <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-indigo-600" /> Service Status
          </h3>
        </div>
        <div className="divide-y divide-gray-100 dark:divide-gray-800">
          {services.map((service, idx) => (
            <div key={idx} className="p-6 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-gray-50 dark:bg-gray-800 rounded-xl flex items-center justify-center text-gray-400">
                  <service.icon className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-900 dark:text-white">{service.name}</p>
                  <p className="text-[10px] text-gray-500 font-medium uppercase tracking-widest">Latency: {service.latency}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full uppercase tracking-widest">
                  Healthy
                </span>
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-indigo-600 rounded-3xl p-8 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <h3 className="text-2xl font-black mb-2 tracking-tight">Everything is running smoothly</h3>
            <p className="text-indigo-100 max-w-md">Our automated systems are monitoring all services 24/7. No issues detected in the last 30 days.</p>
          </div>
          <button className="px-8 py-4 bg-white text-indigo-600 rounded-2xl font-bold hover:bg-indigo-50 transition-all shadow-xl shadow-indigo-900/20">
            View Incident Log
          </button>
        </div>
      </div>
    </div>
  );
}
