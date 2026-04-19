import React from 'react';
import { GraduationCap, Sparkles, LogIn, ShieldCheck, Zap, Globe } from 'lucide-react';
import { motion } from 'motion/react';
import { useAuth } from '../lib/auth';
import { useTranslation, Trans } from 'react-i18next';
import { Link } from 'react-router-dom';

export function Login() {
  const { loginWithEmail } = useAuth();
  const { t } = useTranslation();
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await loginWithEmail(email, password);
    } catch (err: any) {
      console.error("Login error:", err);
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
        setError('ভুল ইমেল বা পাসওয়ার্ড। আবার চেষ্টা করুন।');
      } else if (err.code === 'auth/operation-not-allowed') {
        setError('ইমেল/পাসওয়ার্ড লগইন সচল নয়।');
      } else if (err.code === 'auth/invalid-email') {
        setError('ইমেল ঠিকানাটি সঠিক নয়।');
      } else if (err.code === 'auth/user-disabled') {
        setError('এই অ্যাকাউন্টটি নিষ্ক্রিয় করা হয়েছে।');
      } else {
        setError('লগইন ব্যর্থ হয়েছে। আবার চেষ্টা করুন।');
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
              আপনার কোচিং বা শিক্ষা প্রতিষ্ঠান পরিচালনা করুন <span className="text-indigo-200">সহজ এবং স্মার্ট উপায়ে।</span>
            </h1>
            
            <div className="space-y-8">
              <div className="bg-white/10 backdrop-blur-md p-6 rounded-3xl border border-white/20">
                <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <Zap className="w-5 h-5 text-indigo-200" />
                  সহজ ব্যবস্থাপনা:
                </h3>
                <ul className="space-y-3 text-indigo-100 font-medium">
                  <li className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-300 mt-2 flex-shrink-0" />
                    শিক্ষার্থী এবং ব্যাচ ম্যানেজমেন্ট।
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-300 mt-2 flex-shrink-0" />
                    ফি এবং উপস্থিতি ট্র্যাকিং।
                  </li>
                </ul>
              </div>

              <div className="bg-indigo-500/30 backdrop-blur-md p-6 rounded-3xl border border-white/10">
                <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-indigo-200" />
                  অ্যাডভান্সড ফিচার:
                </h3>
                <ul className="space-y-3 text-indigo-100 font-medium">
                  <li className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-300 mt-2 flex-shrink-0" />
                    অটোমেটেড মেসেজিং এবং রিপোর্ট।
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-300 mt-2 flex-shrink-0" />
                    অফলাইন এক্সাম এবং রেজাল্ট ম্যানেজমেন্ট।
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
              স্বাগতম ফিরে এসেছেন
            </h2>
            <p className="text-gray-500 font-medium">
              আপনার ড্যাশবোর্ডে প্রবেশ করতে লগইন করুন।
            </p>
          </div>

          <div className="bg-white p-10 rounded-3xl shadow-xl shadow-gray-200/50 border border-gray-100 space-y-8">
            {error && (
              <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-center gap-3 text-rose-600 text-sm font-bold animate-shake">
                <ShieldCheck className="w-5 h-5 flex-shrink-0" />
                <p>{error}</p>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-6">
              <div className="space-y-4">
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
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">পাসওয়ার্ড</label>
                    <a 
                      href="https://wa.me/8801301757000" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-xs font-bold text-indigo-600 hover:underline"
                    >
                      পাসওয়ার্ড ভুলে গেছেন?
                    </a>
                  </div>
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
                {loading ? 'লগইন হচ্ছে...' : 'লগইন করুন'}
              </button>
            </form>

            <div className="text-center space-y-4">
              <p className="text-sm text-gray-500 font-medium">
                অ্যাকাউন্ট নেই? 
                <Link 
                  to="/signup"
                  className="text-indigo-600 font-bold hover:underline ml-1"
                >
                  বিনা মূল্যে শুরু করুন
                </Link>
              </p>
              <div className="pt-4 border-t border-gray-100">
                <div className="bg-indigo-50 p-4 rounded-2xl flex items-start gap-3 text-left">
                  <ShieldCheck className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-bold text-indigo-900 uppercase tracking-widest leading-none">Staff & Teacher Access</p>
                    <p className="text-[10px] text-indigo-700/70 mt-1 font-medium leading-relaxed">
                      Are you a staff member or teacher? Use your institution-assigned email and password in the form above to log in.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
