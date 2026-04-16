import React, { useState, useEffect } from 'react';
import { auth, db, handleFirestoreError, OperationType } from '../../firebase';
import { sendPasswordResetEmail } from 'firebase/auth';
import { collection, query, where, getDocs, updateDoc, doc, setDoc, getDoc, limit, count } from 'firebase/firestore';
import { useTranslation } from 'react-i18next';
import { 
  Search, 
  Filter, 
  MoreVertical, 
  Zap, 
  MessageSquare, 
  Calendar,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Edit2,
  Plus,
  Users,
  Layers,
  Briefcase,
  Mail,
  TrendingUp,
  AlertTriangle,
  Activity
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../../lib/auth';
import { cn } from '../../lib/utils';
import { Toast, ToastType } from '../../components/Toast';

export function ManageInstitutions() {
  const { t } = useTranslation();
  const { createStaffAccount } = useAuth();
  const [institutions, setInstitutions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedInst, setSelectedInst] = useState<any | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: ToastType; isVisible: boolean }>({
    message: '',
    type: 'success',
    isVisible: false
  });
  const [newInst, setNewInst] = useState({
    name: '',
    email: '',
    password: '',
    plan: 'free',
    tokens: 100
  });

  useEffect(() => {
    fetchInstitutions();
  }, []);

  const fetchInstitutions = async () => {
    setLoading(true);
    try {
      const usersQuery = query(collection(db, 'users'), where('role', '==', 'admin'));
      const usersSnapshot = await getDocs(usersQuery);
      const users = usersSnapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() }));

      const insts = await Promise.all(users.map(async (user: any) => {
        try {
          // Get credits
          const creditDoc = await getDoc(doc(db, 'credits', user.uid));
          const creditData = creditDoc.exists() ? creditDoc.data() : null;
          
          // Get counts
          const [studentsSnapshot, batchesSnapshot, teachersSnapshot] = await Promise.all([
            getDocs(query(collection(db, 'students'), where('institutionId', '==', user.uid))),
            getDocs(query(collection(db, 'batches'), where('institutionId', '==', user.uid))),
            getDocs(query(collection(db, 'teachers'), where('institutionId', '==', user.uid)))
          ]);

          const studentCount = studentsSnapshot.size;
          const batchCount = batchesSnapshot.size;
          const teacherCount = teachersSnapshot.size;

          // Calculate activity score (simulated based on counts)
          const activityScore = Math.min(100, (studentCount * 2) + (batchCount * 5) + (teacherCount * 10));
          const behavior = activityScore > 80 ? 'Excellent' : activityScore > 40 ? 'Normal' : 'Low Activity';

          return { 
            id: user.uid, 
            ...user, 
            smsBalance: creditData?.balance || 0,
            studentCount,
            batchCount,
            teacherCount,
            activityScore,
            behavior
          };
        } catch (err) {
          console.error(`Error fetching data for ${user.uid}:`, err);
          return { id: user.uid, ...user, smsBalance: 0, studentCount: 0, batchCount: 0, teacherCount: 0, activityScore: 0, behavior: 'Unknown' };
        }
      }));
      setInstitutions(insts);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'users');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInst) return;

    try {
      // Update user profile
      await updateDoc(doc(db, 'users', selectedInst.id), {
        subscriptionPlan: selectedInst.subscriptionPlan,
        subscriptionExpiry: selectedInst.subscriptionExpiry || null
      });

      // Update credits
      await setDoc(doc(db, 'credits', selectedInst.id), {
        userId: selectedInst.id,
        balance: Number(selectedInst.smsBalance),
        lastUpdated: new Date().toISOString()
      }, { merge: true });

      setIsEditModalOpen(false);
      setToast({
        message: "Institution updated successfully",
        type: 'success',
        isVisible: true
      });
      fetchInstitutions();
    } catch (error: any) {
      handleFirestoreError(error, OperationType.WRITE, 'users');
      setToast({
        message: error.message || "Error updating institution",
        type: 'error',
        isVisible: true
      });
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // 1. Create Auth account
      const uid = await createStaffAccount(newInst.email, newInst.password);

      // 2. Create User Profile
      await setDoc(doc(db, 'users', uid), {
        uid,
        email: newInst.email,
        displayName: newInst.name,
        role: 'admin',
        institutionId: uid,
        subscriptionPlan: newInst.plan,
        createdAt: new Date().toISOString()
      });

      // 3. Create Credits
      await setDoc(doc(db, 'credits', uid), {
        userId: uid,
        balance: Number(newInst.tokens),
        lastUpdated: new Date().toISOString()
      });

      setIsCreateModalOpen(false);
      setNewInst({ name: '', email: '', password: '', plan: 'free', tokens: 100 });
      setToast({
        message: "Institution created successfully",
        type: 'success',
        isVisible: true
      });
      fetchInstitutions();
    } catch (error: any) {
      console.error("Error creating institution:", error);
      setToast({
        message: error.message || "Error creating institution",
        type: 'error',
        isVisible: true
      });
    }
  };

  const filteredInstitutions = institutions.filter(inst => 
    inst.displayName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    inst.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">Manage Institutions</h1>
          <p className="text-gray-500 dark:text-gray-400">Manage subscriptions, tokens, and account status.</p>
        </div>
        <button 
          onClick={() => setIsCreateModalOpen(true)}
          className="flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 dark:shadow-none"
        >
          <Plus className="w-5 h-5" /> Create Institution
        </button>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input 
            type="text"
            placeholder="Search by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
          />
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl text-gray-600 dark:text-gray-400 font-bold hover:bg-gray-50 transition-all">
          <Filter className="w-4 h-4" /> Filter
        </button>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50 dark:bg-gray-800/50">
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Institution</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center">Resources</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Performance</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Plan & Expiry</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">SMS Tokens</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
                  </td>
                </tr>
              ) : filteredInstitutions.map((inst) => (
                <tr key={inst.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/40 rounded-xl flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold">
                        {inst.displayName?.charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-gray-900 dark:text-white">{inst.displayName}</p>
                        <p className="text-xs text-gray-500">{inst.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-center gap-4">
                      <div className="text-center" title="Students">
                        <p className="text-xs font-black text-gray-900 dark:text-white">{inst.studentCount || 0}</p>
                        <Users className="w-3 h-3 text-gray-400 mx-auto mt-0.5" />
                      </div>
                      <div className="text-center" title="Batches">
                        <p className="text-xs font-black text-gray-900 dark:text-white">{inst.batchCount || 0}</p>
                        <Layers className="w-3 h-3 text-gray-400 mx-auto mt-0.5" />
                      </div>
                      <div className="text-center" title="Teachers">
                        <p className="text-xs font-black text-gray-900 dark:text-white">{inst.teacherCount || 0}</p>
                        <Briefcase className="w-3 h-3 text-gray-400 mx-auto mt-0.5" />
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-gray-400">
                        <span>Activity</span>
                        <span className="text-indigo-600">{inst.activityScore}%</span>
                      </div>
                      <div className="w-24 h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${inst.activityScore}%` }}
                          className={cn(
                            "h-full rounded-full",
                            inst.activityScore > 80 ? "bg-emerald-500" :
                            inst.activityScore > 40 ? "bg-indigo-500" : "bg-amber-500"
                          )}
                        />
                      </div>
                      <p className={cn(
                        "text-[9px] font-bold uppercase tracking-widest",
                        inst.behavior === 'Excellent' ? "text-emerald-600" :
                        inst.behavior === 'Normal' ? "text-indigo-600" : "text-amber-600"
                      )}>
                        {inst.behavior}
                      </p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="space-y-1">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        inst.subscriptionPlan === 'advanced' ? 'bg-purple-100 text-purple-600' :
                        inst.subscriptionPlan === 'standard' ? 'bg-blue-100 text-blue-600' :
                        inst.subscriptionPlan === 'basic' ? 'bg-amber-100 text-amber-600' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {inst.subscriptionPlan || 'Free'}
                      </span>
                      {inst.subscriptionExpiry && (
                        <p className="text-[10px] text-gray-400 flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(inst.subscriptionExpiry).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="w-4 h-4 text-emerald-500" />
                      <span className="text-sm font-bold text-gray-900 dark:text-white">{inst.smsBalance}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <button 
                      onClick={() => {
                        setSelectedInst(inst);
                        setIsEditModalOpen(true);
                      }}
                      className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-gray-800 rounded-lg transition-all"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <AnimatePresence>
        {isCreateModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-gray-900 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl my-auto max-h-[90vh] flex flex-col"
            >
              <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between shrink-0">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">Create New Institution</h3>
                <button onClick={() => setIsCreateModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                  <XCircle className="w-6 h-6" />
                </button>
              </div>
              <form onSubmit={handleCreate} className="p-6 space-y-4 overflow-y-auto">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Institution Name</label>
                  <input 
                    required
                    type="text"
                    value={newInst.name}
                    onChange={(e) => setNewInst({ ...newInst, name: e.target.value })}
                    placeholder="e.g. Oxford Coaching"
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border-none rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Email Address</label>
                  <input 
                    required
                    type="email"
                    value={newInst.email}
                    onChange={(e) => setNewInst({ ...newInst, email: e.target.value })}
                    placeholder="owner@example.com"
                    className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border-none rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Password</label>
                  <input 
                    required
                    type="password"
                    value={newInst.password}
                    onChange={(e) => setNewInst({ ...newInst, password: e.target.value })}
                    placeholder="••••••••"
                    className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border-none rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Initial Plan</label>
                    <select 
                      value={newInst.plan}
                      onChange={(e) => setNewInst({ ...newInst, plan: e.target.value })}
                      className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border-none rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                    >
                      <option value="free">Free</option>
                      <option value="basic">Basic</option>
                      <option value="standard">Standard</option>
                      <option value="advanced">Advanced</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Initial Tokens</label>
                    <input 
                      type="number"
                      value={newInst.tokens}
                      onChange={(e) => setNewInst({ ...newInst, tokens: Number(e.target.value) })}
                      className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border-none rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>
                </div>
                <button 
                  type="submit"
                  className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 dark:shadow-none mt-4"
                >
                  Create Account
                </button>
              </form>
            </motion.div>
          </div>
        )}

        {isEditModalOpen && selectedInst && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-gray-900 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl my-auto max-h-[90vh] flex flex-col"
            >
              <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between shrink-0">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">Edit Institution</h3>
                <button onClick={() => setIsEditModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                  <XCircle className="w-6 h-6" />
                </button>
              </div>
              <form onSubmit={handleUpdate} className="p-6 space-y-6 overflow-y-auto">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Subscription Plan</label>
                  <select 
                    value={selectedInst.subscriptionPlan || 'free'}
                    onChange={(e) => setSelectedInst({ ...selectedInst, subscriptionPlan: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border-none rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                  >
                    <option value="free">Free</option>
                    <option value="basic">Basic</option>
                    <option value="standard">Standard</option>
                    <option value="advanced">Advanced</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Expiry Date</label>
                  <input 
                    type="date"
                    value={selectedInst.subscriptionExpiry?.split('T')[0] || ''}
                    onChange={(e) => setSelectedInst({ ...selectedInst, subscriptionExpiry: e.target.value ? new Date(e.target.value).toISOString() : null })}
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border-none rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">SMS Token Balance</label>
                  <input 
                    type="number"
                    value={selectedInst.smsBalance}
                    onChange={(e) => setSelectedInst({ ...selectedInst, smsBalance: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border-none rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>

                <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-2xl border border-amber-100 dark:border-amber-800 space-y-3">
                  <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
                    <Mail className="w-4 h-4" />
                    <span className="text-xs font-bold uppercase tracking-wider">Account Recovery</span>
                  </div>
                  <p className="text-[10px] text-amber-600 dark:text-amber-500">
                    If the owner forgot their password, you can trigger a reset email.
                  </p>
                  <button 
                    type="button"
                    onClick={async () => {
                      try {
                        await sendPasswordResetEmail(auth, selectedInst.email);
                        setToast({
                          message: "Reset email sent to " + selectedInst.email,
                          type: 'success',
                          isVisible: true
                        });
                      } catch (err: any) {
                        console.error("Error sending reset email:", err);
                        setToast({
                          message: "Error: " + err.message,
                          type: 'error',
                          isVisible: true
                        });
                      }
                    }}
                    className="w-full py-2 bg-white dark:bg-gray-800 text-amber-600 dark:text-amber-400 rounded-lg text-xs font-bold hover:bg-amber-100 transition-all border border-amber-200 dark:border-amber-800"
                  >
                    Send Password Reset Email
                  </button>
                </div>

                <button 
                  type="submit"
                  className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 dark:shadow-none"
                >
                  Save Changes
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <Toast 
        message={toast.message}
        type={toast.type}
        isVisible={toast.isVisible}
        onClose={() => setToast({ ...toast, isVisible: false })}
      />
    </div>
  );
}
