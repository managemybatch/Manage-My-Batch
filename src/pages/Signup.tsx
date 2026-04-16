import React from 'react';
import { GraduationCap, Sparkles, UserPlus, ShieldCheck, Zap, Globe } from 'lucide-react';
import { motion } from 'motion/react';
import { useAuth } from '../lib/auth';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';

export function Signup() {
  const { signup } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [institutionName, setInstitutionName] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!institutionName.trim()) {
      setError('প্রতিষ্ঠানের নাম দিন।');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await signup(email, password, institutionName);
      navigate('/');
    } catch (err: any) {
      console.error("Signup error:", err);
      if (err.code === 'auth/email-already-in-use') {
        setError('এই ইমেলটি ইতিমধ্যে ব্যবহৃত হচ্ছে।');
      } else if (err.code === 'auth/weak-password') {
        setError('পাসওয়ার্ডটি অন্তত ৬ অক্ষরের হতে হবে।');
      } else if (err.code === 'auth/invalid-email') {
        setError('ইমেল ঠিকানাটি সঠিক নয়।');
      } else {
        setError('অ্যাকাউন্ট তৈরি করতে ব্যর্থ হয়েছে। আবার চেষ্টা করুন।');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col lg:flex-row">
      {/* Left Side: Branding & Features */}
      <div className="lg:w-1/2 bg-indigo-600 p-12 flex flex-col justify-between relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 opacity-50" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-indigo-700 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2 opacity-50" />
        
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-xl shadow-indigo-900/20 overflow-hidden">
            <img 
              src="https://placehold.co/400x400/4f46e5/white?text=MMB" 
              alt="Manage My Batch Logo" 
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          </div>
          <span className="text-2xl font-black text-white tracking-tight">Manage My Batch</span>
        </div>

        <div className="relative z-10 max-w-md">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <h1 className="text-4xl font-black text-white leading-tight tracking-tight mb-8">
              আজই আপনার প্রতিষ্ঠানের জন্য <span className="text-indigo-200">ডিজিটাল যাত্রা শুরু করুন।</span>
            </h1>
            
            <div className="space-y-8">
              <div className="bg-white/10 backdrop-blur-md p-6 rounded-3xl border border-white/20">
                <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <Zap className="w-5 h-5 text-indigo-200" />
                  কেন আমাদের বেছে নেবেন?
                </h3>
                <ul className="space-y-3 text-indigo-100 font-medium">
                  <li className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-300 mt-2 flex-shrink-0" />
                    সম্পূর্ণ বাংলা ইন্টারফেস।
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-300 mt-2 flex-shrink-0" />
                    সহজ এবং ইউজার-ফ্রেন্ডলি ডিজাইন।
                  </li>
                </ul>
              </div>
            </div>
          </motion.div>
        </div>

        <div className="relative z-10 text-indigo-200 text-sm font-medium">
          © ২০২৬ Manage My Batch. সর্বস্বত্ব সংরক্ষিত।
        </div>
      </div>

      {/* Right Side: Form */}
      <div className="lg:w-1/2 flex flex-col items-center justify-center p-12 bg-gray-50">
        <div className="w-full max-w-md space-y-10">
          <div className="text-center">
            <h2 className="text-4xl font-black text-gray-900 tracking-tight mb-3">
              নতুন অ্যাকাউন্ট তৈরি করুন
            </h2>
            <p className="text-gray-500 font-medium">
              আপনার প্রতিষ্ঠানের তথ্য দিয়ে শুরু করুন।
            </p>
          </div>

          <div className="bg-white p-10 rounded-3xl shadow-xl shadow-gray-200/50 border border-gray-100 space-y-8">
            {error && (
              <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-center gap-3 text-rose-600 text-sm font-bold animate-shake">
                <ShieldCheck className="w-5 h-5 flex-shrink-0" />
                <p>{error}</p>
              </div>
            )}

            <form onSubmit={handleSignup} className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">প্রতিষ্ঠানের নাম</label>
                  <input 
                    required
                    type="text" 
                    placeholder="যেমন: আইডিয়াল কোচিং সেন্টার"
                    value={institutionName}
                    onChange={(e) => setInstitutionName(e.target.value)}
                    className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">আপনার ইমেল</label>
                  <input 
                    required
                    type="email" 
                    placeholder="email@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">পাসওয়ার্ড</label>
                  <input 
                    required
                    type="password" 
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                  />
                </div>
              </div>

              <button 
                type="submit"
                disabled={loading}
                className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 disabled:opacity-50"
              >
                {loading ? 'অ্যাকাউন্ট তৈরি হচ্ছে...' : 'অ্যাকাউন্ট তৈরি করুন'}
              </button>
            </form>

            <div className="text-center space-y-4">
              <p className="text-sm text-gray-500 font-medium">
                ইতিমধ্যে অ্যাকাউন্ট আছে? 
                <Link 
                  to="/login"
                  className="text-indigo-600 font-bold hover:underline ml-1"
                >
                  লগইন করুন
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
