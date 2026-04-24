import React, { useState, useEffect } from 'react';
import { auth, db, handleFirestoreError, OperationType } from '../../firebase';
import { sendPasswordResetEmail } from 'firebase/auth';
import { collection, query, where, getDocs, updateDoc, doc, setDoc, getDoc, limit, count, deleteDoc, getCountFromServer } from 'firebase/firestore';
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
  Trash2,
  Trash,
  Users,
  Layers,
  Briefcase,
  Mail,
  TrendingUp,
  AlertTriangle,
  Activity,
  ArrowLeft,
  ShieldCheck,
  Eye,
  Archive,
  UserCheck,
  MoreHorizontal,
  Clock,
  CreditCard
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../../lib/auth';
import { cn, formatDate } from '../../lib/utils';
import { Toast, ToastType } from '../../components/Toast';
import { Table, TableRow, TableCell } from '../../components/Table';
import { Modal } from '../../components/Modal';
import { ConfirmModal } from '../../components/ConfirmModal';

export function ManageInstitutions() {
  const { t } = useTranslation();
  const { createStaffAccount } = useAuth();
  const [institutions, setInstitutions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [view, setView] = useState<'list' | 'details'>('list');
  const [activeTab, setActiveTab] = useState<'overview' | 'students' | 'batches' | 'config' | 'fees' | 'teachers'>('overview');
  const [selectedInst, setSelectedInst] = useState<any | null>(null);
  const [instData, setInstData] = useState<{ students: any[], batches: any[], teachers: any[], fees: any[] }>({ 
    students: [], 
    batches: [], 
    teachers: [], 
    fees: [] 
  });
  const [loadingInstData, setLoadingInstData] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [instToDelete, setInstToDelete] = useState<string | null>(null);
  const [filterExpiry, setFilterExpiry] = useState<'all' | 'next5' | 'today' | 'ended' | 'inactive'>('all');
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
      const usersQuery = query(
        collection(db, 'users'), 
        where('role', '==', 'admin'),
        orderBy('createdAt', 'desc'),
        limit(50)
      );
      const usersSnapshot = await getDocs(usersQuery);
      const users = usersSnapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data(),
        // Initialize placeholders for lazy data
        studentCount: null,
        batchCount: null,
        smsBalance: 0,
        activityScore: 0
      }));

      setInstitutions(users);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'users');
    } finally {
      setLoading(false);
    }
  };

  const fetchInstStats = async (instId: string) => {
    try {
      const [studentsCount, batchesCount, creditsDoc] = await Promise.all([
        getCountFromServer(query(collection(db, 'students'), where('institutionId', '==', instId))),
        getCountFromServer(query(collection(db, 'batches'), where('institutionId', '==', instId))),
        getDoc(doc(db, 'credits', instId))
      ]);

      const studentCount = studentsCount.data().count;
      const batchCount = batchesCount.data().count;
      const smsBalance = creditsDoc.exists() ? creditsDoc.data().balance || 0 : 0;
      const activityScore = Math.min(100, (studentCount * 2) + (batchCount * 5));

      setInstitutions(prev => prev.map(inst => 
        inst.id === instId 
          ? { ...inst, studentCount, batchCount, smsBalance, activityScore } 
          : inst
      ));
    } catch (err) {
      console.error("Error fetching stats:", err);
    }
  };

  const fetchInstDetails = async (inst: any) => {
    setSelectedInst(inst);
    setView('details');
    setActiveTab('overview');
    // Clear old data
    setInstData({ students: [], batches: [], teachers: [], fees: [] });
  };

  useEffect(() => {
    if (view === 'details' && selectedInst?.id) {
      loadTabData();
    }
  }, [selectedInst?.id, activeTab, view]);

  const loadTabData = async () => {
    if (!selectedInst?.id) return;
    setLoadingInstData(true);
    try {
      if (activeTab === 'overview') {
        // Just get basic stats for overview if needed
        const [studentsCount, batchesCount, creditsDoc] = await Promise.all([
          getCountFromServer(query(collection(db, 'students'), where('institutionId', '==', selectedInst.id))),
          getCountFromServer(query(collection(db, 'batches'), where('institutionId', '==', selectedInst.id))),
          getDoc(doc(db, 'credits', selectedInst.id))
        ]);
        setSelectedInst((prev: any) => ({
          ...prev,
          studentCount: studentsCount.data().count,
          batchCount: batchesCount.data().count,
          smsBalance: creditsDoc.exists() ? creditsDoc.data().balance || 0 : 0
        }));
      } else if (activeTab === 'students') {
        const snap = await getDocs(query(collection(db, 'students'), where('institutionId', '==', selectedInst.id), limit(200)));
        setInstData(prev => ({ ...prev, students: snap.docs.map(d => ({ id: d.id, ...d.data() })) }));
      } else if (activeTab === 'batches') {
        const snap = await getDocs(query(collection(db, 'batches'), where('institutionId', '==', selectedInst.id)));
        setInstData(prev => ({ ...prev, batches: snap.docs.map(d => ({ id: d.id, ...d.data() })) }));
      } else if (activeTab === 'teachers') {
        const snap = await getDocs(query(collection(db, 'teachers'), where('institutionId', '==', selectedInst.id)));
        setInstData(prev => ({ ...prev, teachers: snap.docs.map(d => ({ id: d.id, ...d.data() })) }));
      } else if (activeTab === 'fees') {
        const snap = await getDocs(query(collection(db, 'fees'), where('institutionId', '==', selectedInst.id), orderBy('date', 'desc'), limit(100)));
        const fees = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        const totalRevenue = fees.filter((f: any) => f.status === 'paid').reduce((sum: number, f: any) => sum + (f.amount || 0), 0);
        setSelectedInst((prev: any) => ({ ...prev, totalRevenue }));
        setInstData(prev => ({ ...prev, fees }));
      }
    } catch (error) {
      console.error("Error loading tab data:", error);
    } finally {
      setLoadingInstData(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInst) return;

    try {
      // Update user profile
      await updateDoc(doc(db, 'users', selectedInst.id), {
        subscriptionPlan: selectedInst.subscriptionPlan,
        subscriptionExpiry: selectedInst.subscriptionExpiry || null,
        superAdminNote: selectedInst.superAdminNote || '',
        isVerified: selectedInst.isVerified || false
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

  const handleDeleteInstitution = async () => {
    if (!instToDelete) return;
    try {
      setLoading(true);
      
      // Collections to clean up
      const collectionsToClean = [
        'students',
        'batches',
        'fees',
        'teachers',
        'offline_exams',
        'attendance',
        'institutions'
      ];

      // Delete associated data in batches (approximate client-side cleanup)
      for (const coll of collectionsToClean) {
        const q = query(collection(db, coll), where('institutionId', '==', instToDelete), limit(100));
        const snapshot = await getDocs(q);
        const deletePromises = snapshot.docs.map(d => deleteDoc(d.ref));
        await Promise.all(deletePromises);
      }

      await deleteDoc(doc(db, 'users', instToDelete));
      await deleteDoc(doc(db, 'credits', instToDelete));
      
      setToast({
        message: "Institution and basic linked data deleted successfully",
        type: 'success',
        isVisible: true
      });
      setIsDeleteModalOpen(false);
      setInstToDelete(null);
      fetchInstitutions();
    } catch (error: any) {
      console.error("Error deleting institution:", error);
      setToast({
        message: "Error deleting institution. Some data might remain.",
        type: 'error',
        isVisible: true
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredInstitutions = institutions.filter(inst => {
    const matchesSearch = inst.displayName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         inst.email?.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (!matchesSearch) return false;

    if (filterExpiry === 'all') return true;

    const expiryDate = inst.subscriptionExpiry ? new Date(inst.subscriptionExpiry) : null;
    if (!expiryDate) return filterExpiry === 'ended' && inst.subscriptionPlan && inst.subscriptionPlan !== 'free'; // Consider no date as ended if on paid plan? Generally let's be strict.
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const exp = new Date(expiryDate);
    exp.setHours(0, 0, 0, 0);

    const diffDays = Math.ceil((exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (filterExpiry === 'today') return diffDays === 0;
    if (filterExpiry === 'next5') return diffDays > 0 && diffDays <= 5;
    if (filterExpiry === 'ended') return diffDays < 0 && diffDays >= -5;

    if (filterExpiry === 'inactive') {
      if (!inst.lastLogin) return true; // Never logged in?
      const lastLogin = new Date(inst.lastLogin);
      const diffTime = Math.abs(today.getTime() - lastLogin.getTime());
      const diffInDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffInDays >= 30;
    }

    return true;
  });

  const DetailRow = ({ label, value, icon: Icon }: { label: string, value: any, icon?: any }) => (
    <div className="flex items-center justify-between py-3 border-b border-gray-50 dark:border-gray-800 last:border-0 hover:bg-gray-50/50 dark:hover:bg-gray-800/50 px-2 rounded-lg transition-colors group">
      <div className="flex items-center gap-2">
        {Icon && <Icon className="w-3.5 h-3.5 text-gray-400 group-hover:text-indigo-500 transition-colors" />}
        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{label}</span>
      </div>
      <span className="text-sm font-bold text-gray-900 dark:text-white truncate max-w-[240px]">{value || '—'}</span>
    </div>
  );

  if (view === 'details' && selectedInst) {
    return (
      <div className="space-y-6">
        {/* Back Button and Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setView('list')}
              className="p-3 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-gray-800 transition-all shadow-sm"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">{selectedInst.displayName}</h1>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs font-medium text-gray-500">{selectedInst.email}</span>
                <span className="w-1 h-1 rounded-full bg-gray-300" />
                <span className="text-xs font-bold text-indigo-600 uppercase tracking-widest">{selectedInst.subscriptionPlan || 'Free'} Plan</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsEditModalOpen(true)}
              className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 dark:shadow-none"
            >
              <ShieldCheck className="w-4 h-4" /> Management
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[
            { label: 'Activity Score', value: `${selectedInst.activityScore}%`, icon: TrendingUp, color: 'indigo' },
            { label: 'Total Revenue', value: `৳${selectedInst.totalRevenue?.toLocaleString() || 0}`, icon: CreditCard, color: 'emerald' },
            { label: 'Total Students', value: selectedInst.studentCount, icon: Users, color: 'emerald' },
            { label: 'Total Batches', value: selectedInst.batchCount, icon: Layers, color: 'amber' },
            { label: 'SMS Balance', value: selectedInst.smsBalance, icon: MessageSquare, color: 'purple' },
          ].map((stat, i) => (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              key={stat.label}
              className="bg-white dark:bg-gray-900 p-4 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm relative overflow-hidden group"
            >
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest relative z-10">{stat.label}</p>
              <div className="flex items-baseline gap-2 relative z-10 mt-1">
                <h3 className="text-2xl font-black text-gray-900 dark:text-white">{stat.value}</h3>
              </div>
              <div className={cn(
                "absolute -right-2 -bottom-2 w-16 h-16 opacity-5 dark:opacity-10 transition-all group-hover:scale-110 rotate-12",
                stat.color === 'indigo' ? "text-indigo-600" :
                stat.color === 'emerald' ? "text-emerald-600" :
                stat.color === 'amber' ? "text-amber-600" : "text-purple-600"
              )}>
                <stat.icon className="w-full h-full" />
              </div>
            </motion.div>
          ))}
        </div>

        {/* Tabs */}
        <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden min-h-[500px]">
          <div className="flex items-center border-b border-gray-50 dark:border-gray-800 px-6 overflow-x-auto scrollbar-hide">
            {[
              { id: 'overview', label: 'Overview', icon: Eye },
              { id: 'students', label: 'Students', icon: Users },
              { id: 'batches', label: 'Batches', icon: Layers },
              { id: 'teachers', label: 'Faculty', icon: Briefcase },
              { id: 'fees', label: 'Revenue', icon: CreditCard },
              { id: 'config', label: 'Configuration', icon: ShieldCheck },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={cn(
                  "flex items-center gap-2 py-5 px-4 text-[10px] font-bold tracking-widest transition-all relative border-b-2 whitespace-nowrap uppercase",
                  activeTab === tab.id ? "text-indigo-600 border-indigo-600" : "text-gray-400 border-transparent hover:text-gray-600"
                )}
              >
                <tab.icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            ))}
          </div>

          <div className="p-6">
            <AnimatePresence mode="wait">
              {activeTab === 'overview' && (
                <motion.div
                  key="overview"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  className="grid grid-cols-1 md:grid-cols-2 gap-8"
                >
                  <div className="space-y-6">
                    <div>
                      <h4 className="text-sm font-black text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                        <Activity className="w-4 h-4 text-indigo-500" /> Account Information
                      </h4>
                      <div className="bg-gray-50/50 dark:bg-gray-800/30 p-2 rounded-2xl border border-gray-100 dark:border-gray-800">
                        <DetailRow label="Display Name" value={selectedInst.displayName} icon={UserCheck} />
                        <DetailRow label="Primary Email" value={selectedInst.email} icon={Mail} />
                        <DetailRow label="Institution User ID" value={selectedInst.id} icon={Archive} />
                        <DetailRow label="Registration Date" value={selectedInst.createdAt ? formatDate(selectedInst.createdAt) : 'N/A'} icon={Calendar} />
                        <DetailRow label="Subscription Plan" value={selectedInst.subscriptionPlan || 'Free'} icon={Zap} />
                        <DetailRow label="Plan Expiry" value={selectedInst.subscriptionExpiry ? formatDate(selectedInst.subscriptionExpiry) : 'No Expiry'} icon={Clock} />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div>
                      <h4 className="text-sm font-black text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                        <Activity className="w-4 h-4 text-emerald-500" /> Resource Statistics
                      </h4>
                      <div className="bg-gray-50/50 dark:bg-gray-800/30 p-2 rounded-2xl border border-gray-100 dark:border-gray-800">
                        <DetailRow label="Total Students" value={selectedInst.studentCount} icon={Users} />
                        <DetailRow label="Active Batches" value={selectedInst.batchCount} icon={Layers} />
                        <DetailRow label="Faculty/Teachers" value={selectedInst.teacherCount} icon={Briefcase} />
                        <DetailRow label="SMS Tokens Balance" value={selectedInst.smsBalance} icon={MessageSquare} />
                        <DetailRow label="System Status" value={selectedInst.status || 'Active'} icon={Activity} />
                        <DetailRow label="Last Activity" value="Today" icon={Clock} />
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {activeTab === 'students' && (
                <motion.div
                  key="students"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="space-y-4"
                >
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-tight">Active Students ({instData.students.length})</h4>
                    <div className="text-xs text-gray-500 italic">Showing live data for this coaching center</div>
                  </div>
                  
                  {loadingInstData ? (
                    <div className="py-20 flex justify-center"><div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div></div>
                  ) : instData.students.length > 0 ? (
                    <Table headers={['Student', 'Roll No', 'Batch', 'Join Date', 'Guardian Contact']}>
                      {instData.students.map((student) => (
                        <TableRow key={student.id} className="cursor-default">
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center text-indigo-600 font-bold text-xs uppercase">
                                {student.name ? student.name.charAt(0) : 'S'}
                              </div>
                              <div>
                                <p className="font-bold text-gray-900 dark:text-white">{student.name}</p>
                                <p className="text-[10px] text-gray-500 uppercase tracking-widest">{student.grade}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="font-mono text-xs">{student.rollNo || 'N/A'}</TableCell>
                          <TableCell className="text-xs font-semibold">{student.batchName || 'No Batch'}</TableCell>
                          <TableCell className="text-xs">{student.joinDate ? formatDate(student.joinDate) : '—'}</TableCell>
                          <TableCell className="text-xs font-bold text-indigo-600">{student.guardianPhone || '—'}</TableCell>
                        </TableRow>
                      ))}
                    </Table>
                  ) : (
                    <div className="py-20 text-center bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700">
                      <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                      <p className="text-gray-500 font-medium">No students enrolled yet</p>
                    </div>
                  )}
                </motion.div>
              )}

              {activeTab === 'teachers' && (
                <motion.div
                  key="teachers"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="space-y-4"
                >
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-tight">Faculty Members ({instData.teachers.length})</h4>
                  </div>
                  {loadingInstData ? (
                    <div className="py-20 flex justify-center"><div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div></div>
                  ) : instData.teachers.length > 0 ? (
                    <Table headers={['Teacher', 'Phone', 'Subject', 'Status']}>
                      {instData.teachers.map((t) => (
                        <TableRow key={t.id} className="cursor-default">
                          <TableCell className="font-bold">{t.name}</TableCell>
                          <TableCell>{t.phone}</TableCell>
                          <TableCell className="text-xs">{t.subject || 'N/A'}</TableCell>
                          <TableCell>
                            <span className={cn(
                              "px-2 py-0.5 rounded-full text-[10px] uppercase font-bold",
                              t.status === 'active' ? "bg-emerald-50 text-emerald-600" : "bg-gray-100 text-gray-400"
                            )}>
                              {t.status}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </Table>
                  ) : (
                    <div className="py-20 text-center bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700">
                      <Briefcase className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                      <p className="text-gray-500 font-medium">No teachers added yet</p>
                    </div>
                  )}
                </motion.div>
              )}

              {activeTab === 'fees' && (
                <motion.div
                  key="fees"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="space-y-4"
                >
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-tight">Recent Collections ({instData.fees.length})</h4>
                    <div className="text-sm font-bold text-emerald-600">Total: ৳{selectedInst.totalRevenue?.toLocaleString()}</div>
                  </div>
                  {loadingInstData ? (
                    <div className="py-20 flex justify-center"><div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div></div>
                  ) : instData.fees.length > 0 ? (
                    <Table headers={['Student', 'Type', 'Amount', 'Month', 'Date']}>
                      {instData.fees.slice(0, 50).map((f) => (
                        <TableRow key={f.id} className="cursor-default">
                          <TableCell className="font-bold">{f.studentName}</TableCell>
                          <TableCell className="text-xs">{f.type}</TableCell>
                          <TableCell className="font-black">৳{f.amount}</TableCell>
                          <TableCell className="text-xs">{f.month} {f.year}</TableCell>
                          <TableCell className="text-xs text-gray-500">{f.date ? new Date(f.date).toLocaleDateString() : 'N/A'}</TableCell>
                        </TableRow>
                      ))}
                    </Table>
                  ) : (
                    <div className="py-20 text-center bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700">
                      <CreditCard className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                      <p className="text-gray-500 font-medium">No fee records found</p>
                    </div>
                  )}
                </motion.div>
              )}
              {activeTab === 'batches' && (
                <motion.div
                  key="batches"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="space-y-4"
                >
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-tight">Active Batches ({instData.batches.length})</h4>
                  </div>
                  
                  {loadingInstData ? (
                    <div className="py-20 flex justify-center"><div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div></div>
                  ) : instData.batches.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {instData.batches.map((batch) => (
                        <div key={batch.id} className="bg-gray-50/50 dark:bg-gray-800/30 p-4 rounded-2xl border border-gray-100 dark:border-gray-800 hover:border-indigo-200 transition-all">
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <h5 className="font-bold text-gray-900 dark:text-white">{batch.name}</h5>
                              <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest">{batch.grade} • {batch.section || 'N/A'}</p>
                            </div>
                            <div className="px-2 py-1 bg-white dark:bg-gray-900 rounded-lg border border-gray-100 dark:border-gray-800 text-[10px] font-black text-gray-900 dark:text-white">
                              {batch.studentCount || 0} Students
                            </div>
                          </div>
                          <div className="space-y-2">
                             <div className="flex items-center justify-between text-[10px]">
                               <span className="text-gray-400 font-bold uppercase tracking-widest">Time</span>
                               <span className="text-gray-700 dark:text-gray-300 font-semibold">{batch.startTime} - {batch.endTime}</span>
                             </div>
                             <div className="flex items-center justify-between text-[10px]">
                               <span className="text-gray-400 font-bold uppercase tracking-widest">Monthly Fee</span>
                               <span className="text-emerald-600 font-black">{batch.monthlyFee} BDT</span>
                             </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-20 text-center bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700">
                      <Layers className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                      <p className="text-gray-500 font-medium">No batches created yet</p>
                    </div>
                  )}
                </motion.div>
              )}

              {activeTab === 'config' && (
                <motion.div
                  key="config"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  className="max-w-xl mx-auto py-4"
                >
                  <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-2xl border border-amber-100 dark:border-amber-800 mb-8">
                     <div className="flex items-center gap-3 text-amber-800 dark:text-amber-400 mb-2">
                       <AlertTriangle className="w-5 h-5" />
                       <h5 className="font-bold uppercase tracking-tight text-xs">Super Admin Controls</h5>
                     </div>
                     <p className="text-xs text-amber-700 dark:text-amber-500 leading-relaxed">
                       Changes made here will directly affect the institution's service access. Use these controls to manage subscriptions and account limits.
                     </p>
                  </div>
                  
                  <form onSubmit={handleUpdate} className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-2">Subscription Plan</label>
                      <select 
                        value={selectedInst.subscriptionPlan || 'free'}
                        onChange={(e) => setSelectedInst({ ...selectedInst, subscriptionPlan: e.target.value })}
                        className="w-full px-5 py-4 bg-gray-50 dark:bg-gray-800 border-2 border-transparent rounded-2xl focus:border-indigo-500 focus:bg-white dark:focus:bg-gray-900 outline-none transition-all font-bold text-gray-900 dark:text-white"
                      >
                        <option value="free">Free Plan</option>
                        <option value="basic">Basic Plan (৳399)</option>
                        <option value="standard">Standard Plan (৳999)</option>
                        <option value="advanced">Advanced Plan (৳1999)</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-2">Plan Expiry Date</label>
                      <input 
                        type="date"
                        value={selectedInst.subscriptionExpiry?.split('T')[0] || ''}
                        onChange={(e) => setSelectedInst({ ...selectedInst, subscriptionExpiry: e.target.value ? new Date(e.target.value).toISOString() : null })}
                        className="w-full px-5 py-4 bg-gray-50 dark:bg-gray-800 border-2 border-transparent rounded-2xl focus:border-indigo-500 focus:bg-white dark:focus:bg-gray-900 outline-none transition-all font-bold text-gray-900 dark:text-white"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-2">SMS Token Balance</label>
                      <div className="relative">
                        <MessageSquare className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                        <input 
                          type="number"
                          value={selectedInst.smsBalance}
                          onChange={(e) => setSelectedInst({ ...selectedInst, smsBalance: e.target.value })}
                          className="w-full pl-12 pr-5 py-4 bg-gray-50 dark:bg-gray-800 border-2 border-transparent rounded-2xl focus:border-indigo-500 focus:bg-white dark:focus:bg-gray-900 outline-none transition-all font-bold text-gray-900 dark:text-white"
                        />
                      </div>
                    </div>

                    <div className="space-y-4 pt-4 border-t border-gray-100 dark:border-gray-800">
                      <div className="flex items-center justify-between p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl border border-indigo-100 dark:border-indigo-800/50">
                        <div className="flex items-center gap-3">
                          <ShieldCheck className={cn("w-6 h-6", selectedInst.isVerified ? "text-indigo-600" : "text-gray-400")} />
                          <div>
                            <p className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-tight">Super Admin Status</p>
                            <p className="text-[10px] text-gray-500 font-medium italic">Mark as verified institution</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setSelectedInst({ ...selectedInst, isVerified: !selectedInst.isVerified })}
                          className={cn(
                            "px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all",
                            selectedInst.isVerified 
                              ? "bg-indigo-600 text-white shadow-md" 
                              : "bg-gray-200 dark:bg-gray-700 text-gray-500 hover:bg-gray-300"
                          )}
                        >
                          {selectedInst.isVerified ? 'Verified' : 'Unverified'}
                        </button>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-2">Internal Notes (Private)</label>
                        <textarea 
                          value={selectedInst.superAdminNote || ''}
                          onChange={(e) => setSelectedInst({ ...selectedInst, superAdminNote: e.target.value })}
                          placeholder="Add private notes about this institution..."
                          className="w-full px-5 py-4 bg-gray-50 dark:bg-gray-800 border-2 border-transparent rounded-2xl focus:border-indigo-500 focus:bg-white dark:focus:bg-gray-900 outline-none transition-all font-medium text-sm text-gray-900 dark:text-white resize-none"
                          rows={3}
                        />
                      </div>
                    </div>

                    <div className="p-5 bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl border border-indigo-100 dark:border-indigo-800 space-y-3">
                      <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-400 uppercase tracking-widest text-[10px] font-black">
                        <Activity className="w-4 h-4" /> Account Tools
                      </div>
                      <button 
                        type="button"
                        onClick={async () => {
                          try {
                            await sendPasswordResetEmail(auth, selectedInst.email);
                            setToast({ message: "Reset email sent to " + selectedInst.email, type: 'success', isVisible: true });
                          } catch (err: any) {
                            setToast({ message: "Error: " + err.message, type: 'error', isVisible: true });
                          }
                        }}
                        className="w-full py-3 bg-white dark:bg-gray-800 text-indigo-600 dark:text-indigo-400 rounded-xl text-xs font-bold hover:bg-gray-50 transition-all border border-indigo-100 dark:border-indigo-700 flex items-center justify-center gap-2"
                      >
                        <Mail className="w-4 h-4" /> Send Password Reset Link
                      </button>
                    </div>

                    <button 
                      type="submit"
                      className="w-full py-5 bg-indigo-600 text-white rounded-3xl font-black text-lg hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 dark:shadow-none mt-4"
                    >
                      Update Account Settings
                    </button>
                  </form>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    );
  }

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
        
        <div className="flex items-center bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-1 gap-1">
          {[
            { id: 'all', label: 'All' },
            { id: 'next5', label: 'Ends in 5d' },
            { id: 'today', label: 'Ends Today' },
            { id: 'ended', label: 'Ended (5d)' },
            { id: 'inactive', label: 'Inactive (30d)' }
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setFilterExpiry(f.id as any)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap",
                filterExpiry === f.id 
                  ? "bg-indigo-600 text-white shadow-sm" 
                  : "text-gray-500 hover:text-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>

        <button 
          onClick={() => fetchInstitutions()}
          className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl text-gray-600 dark:text-gray-400 font-bold hover:bg-gray-50 transition-all"
        >
          <Activity className="w-4 h-4" /> Refresh
        </button>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50 dark:bg-gray-800/50">
                <th className="px-6 py-4 text-[11px] font-black text-gray-400 uppercase tracking-widest leading-none">Institution</th>
                <th className="px-6 py-4 text-[11px] font-black text-gray-400 uppercase tracking-widest leading-none text-center">Summary</th>
                <th className="px-6 py-4 text-[11px] font-black text-gray-400 uppercase tracking-widest leading-none">Activity</th>
                <th className="px-6 py-4 text-[11px] font-black text-gray-400 uppercase tracking-widest leading-none">Subscription</th>
                <th className="px-6 py-4 text-[11px] font-black text-gray-400 uppercase tracking-widest leading-none">SMS</th>
                <th className="px-6 py-4 text-[11px] font-black text-gray-400 uppercase tracking-widest leading-none">Last Active</th>
                <th className="px-6 py-4 text-[11px] font-black text-gray-400 uppercase tracking-widest leading-none">Actions</th>
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
                      <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/40 rounded-xl flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold shrink-0 relative">
                        {inst.displayName?.charAt(0)}
                        {inst.isVerified && (
                          <div className="absolute -top-1 -right-1 bg-white dark:bg-gray-900 rounded-full p-0.5 shadow-sm">
                            <ShieldCheck className="w-3.5 h-3.5 text-indigo-600 fill-indigo-50" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={() => fetchInstDetails(inst)}
                            className="text-sm font-bold text-gray-900 dark:text-white hover:text-indigo-600 transition-colors text-left truncate"
                          >
                            {inst.displayName}
                          </button>
                          {inst.superAdminNote && (
                            <div className="group relative">
                              <Info className="w-3 h-3 text-amber-500 cursor-help" />
                              <div className="absolute left-0 bottom-full mb-2 w-48 p-2 bg-gray-900 text-white text-[10px] rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-all z-20">
                                {inst.superAdminNote}
                              </div>
                            </div>
                          )}
                        </div>
                        <p className="text-xs text-gray-400 truncate">{inst.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-center gap-4">
                      {inst.studentCount === null ? (
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            fetchInstStats(inst.id);
                          }}
                          className="px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-500 rounded-lg text-[10px] font-bold uppercase transition-all"
                        >
                          Load Stats
                        </button>
                      ) : (
                        <>
                          <div className="text-center" title="Students">
                            <p className="text-xs font-black text-gray-900 dark:text-white">{inst.studentCount || 0}</p>
                            <Users className="w-3 h-3 text-gray-400 mx-auto mt-0.5" />
                          </div>
                          <div className="text-center" title="Batches">
                            <p className="text-xs font-black text-gray-900 dark:text-white">{inst.batchCount || 0}</p>
                            <Layers className="w-3 h-3 text-gray-400 mx-auto mt-0.5" />
                          </div>
                        </>
                      )}
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
                      <Zap className="w-4 h-4 text-emerald-500 fill-emerald-50" />
                      <span className="text-sm font-bold text-gray-900 dark:text-white">{inst.smsBalance}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-1">
                      <span className={cn(
                        "text-[10px] font-bold",
                        inst.lastLogin ? "text-gray-900 dark:text-gray-100" : "text-gray-400 italic"
                      )}>
                        {inst.lastLogin ? formatDate(inst.lastLogin) : 'Never'}
                      </span>
                      {inst.lastLogin && (
                        <span className="text-[9px] text-gray-400 font-medium">
                          {Math.max(0, Math.ceil((new Date().getTime() - new Date(inst.lastLogin).getTime()) / (1000 * 60 * 60 * 24)))} days ago
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => fetchInstDetails(inst)}
                        className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-gray-800 rounded-lg transition-all"
                        title="View Details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => {
                          setSelectedInst(inst);
                          setIsEditModalOpen(true);
                        }}
                        className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-gray-800 rounded-lg transition-all"
                        title="Edit Settings"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => {
                          setInstToDelete(inst.id);
                          setIsDeleteModalOpen(true);
                        }}
                        className="p-2 text-gray-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-all"
                        title="Delete Institution"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
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

      <AnimatePresence>
        {isDeleteModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white dark:bg-gray-900 rounded-[2.5rem] w-full max-w-md overflow-hidden shadow-2xl p-8 border-4 border-rose-100 dark:border-rose-900/30"
            >
              <div className="flex flex-col items-center text-center gap-4 mb-8">
                <div className="w-20 h-20 bg-rose-50 dark:bg-rose-900/20 rounded-3xl flex items-center justify-center text-rose-600">
                  <AlertTriangle className="w-10 h-10 animate-bounce" />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-gray-900 dark:text-white">Critical Confirmation</h3>
                  <p className="text-gray-500 dark:text-gray-400 mt-2 font-medium">
                    You are about to delete an entire institution and all its students, batches, and records. This is permanent.
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <p className="text-xs font-black text-gray-400 uppercase tracking-widest text-center">
                  To confirm, type the word <span className="text-rose-600">DELETE</span> below
                </p>
                <input 
                  type="text"
                  placeholder="Type DELETE to proceed"
                  className="w-full px-6 py-4 bg-gray-50 dark:bg-gray-800 border-2 border-transparent focus:border-rose-500 rounded-2xl outline-none text-center font-black text-rose-600 uppercase tracking-widest transition-all"
                  onChange={(e) => {
                    if (e.target.value === 'DELETE') {
                      // We can just keep it in state or use a local variable
                    }
                  }}
                  id="confirm-delete-input"
                />
              </div>

              <div className="flex gap-3 mt-8">
                <button 
                  onClick={() => setIsDeleteModalOpen(false)}
                  className="flex-1 py-4 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-2xl font-bold hover:bg-gray-200 transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={() => {
                    const input = document.getElementById('confirm-delete-input') as HTMLInputElement;
                    if (input?.value === 'DELETE') {
                      handleDeleteInstitution();
                    } else {
                      setToast({ message: "Please type DELETE correctly", type: 'error', isVisible: true });
                    }
                  }}
                  disabled={loading}
                  className="flex-1 py-4 bg-rose-600 text-white rounded-2xl font-black hover:bg-rose-700 transition-all shadow-lg shadow-rose-100 dark:shadow-none flex items-center justify-center gap-2"
                >
                  {loading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Trash2 className="w-5 h-5" />}
                  Confirm Delete
                </button>
              </div>
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
