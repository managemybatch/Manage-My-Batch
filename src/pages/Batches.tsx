import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Filter, Layers, MoreVertical, Users, Loader2, ChevronDown, ChevronUp, X, Clock, Calendar, CreditCard, BookOpen, MessageSquare, Trash2, XCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { collection, onSnapshot, query, addDoc, serverTimestamp, deleteDoc, doc, orderBy, updateDoc, where } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { useAuth } from '../lib/auth';
import { Modal } from '../components/Modal';
import { ConfirmModal } from '../components/ConfirmModal';
import { GRADES, SECTIONS, SUBSCRIPTION_PLANS } from '../constants';
import { useTranslation } from 'react-i18next';
import { SubscriptionModal } from '../components/SubscriptionModal';

interface Batch {
  id: string;
  name: string;
  description?: string;
  color?: string;
  grade: string;
  section: string;
  batchTime?: string;
  duration?: string;
  subjects?: string[];
  weeklyDays?: string[];
  admissionFee: number;
  monthlyFee: number;
  studentCount?: number;
  createdAt: any;
}

const WEEK_DAYS = [
  { id: 'Sun', label: 'Sun' },
  { id: 'Mon', label: 'Mon' },
  { id: 'Tue', label: 'Tue' },
  { id: 'Wed', label: 'Wed' },
  { id: 'Thu', label: 'Thu' },
  { id: 'Fri', label: 'Fri' },
  { id: 'Sat', label: 'Sat' },
];

const BATCH_COLORS = [
  'bg-indigo-500',
  'bg-emerald-500',
  'bg-amber-500',
  'bg-rose-500',
  'bg-violet-500',
  'bg-sky-500',
  'bg-orange-500',
  'bg-pink-500',
];

export function Batches() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGrade, setSelectedGrade] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [subjectInput, setSubjectInput] = useState('');
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [batchToDelete, setBatchToDelete] = useState<string | null>(null);
  const [batchToDeleteName, setBatchToDeleteName] = useState('');
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [editingBatch, setEditingBatch] = useState<Batch | null>(null);
  const [selectedBatch, setSelectedBatch] = useState<Batch | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleViewDetails = (batch: Batch) => {
    setSelectedBatch(batch);
    setIsDetailModalOpen(true);
  };
  
  const [newBatch, setNewBatch] = useState({
    name: '',
    description: '',
    color: BATCH_COLORS[0],
    grade: 'No class',
    section: SECTIONS[0],
    batchTime: '',
    duration: '',
    subjects: [] as string[],
    weeklyDays: [] as string[],
    admissionFee: 0,
    monthlyFee: 0,
  });

  useEffect(() => {
    if (!user) return;

    const instId = user.institutionId || user.uid;
    const q = query(
      collection(db, 'batches'), 
      where('institutionId', '==', instId)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const batchData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Batch[];

      // Sort client-side to avoid index requirements
      const sortedData = batchData.sort((a, b) => {
        const dateA = a.createdAt ? (typeof a.createdAt === 'string' ? new Date(a.createdAt).getTime() : (a.createdAt as any).seconds * 1000) : 0;
        const dateB = b.createdAt ? (typeof b.createdAt === 'string' ? new Date(b.createdAt).getTime() : (b.createdAt as any).seconds * 1000) : 0;
        return dateB - dateA;
      });

      setBatches(sortedData);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'batches');
    });

    return () => unsubscribe();
  }, [user]);

  const handleAddBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || isSaving) return;

    const plan = SUBSCRIPTION_PLANS.find(p => p.id === user.subscriptionPlan) || SUBSCRIPTION_PLANS[0];
    if (batches.length >= plan.batchLimit) {
      setIsUpgradeModalOpen(true);
      return;
    }

    setIsSaving(true);
    try {
      const instId = user.institutionId || user.uid;
      await addDoc(collection(db, 'batches'), {
        ...newBatch,
        institutionId: instId,
        studentCount: 0,
        createdBy: user.uid,
        createdAt: serverTimestamp(),
      });
      setIsAddModalOpen(false);
      resetForm();
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'batches');
    } finally {
      setIsSaving(false);
    }
  };

  const resetForm = () => {
    setNewBatch({
      name: '',
      description: '',
      color: BATCH_COLORS[0],
      grade: 'No class',
      section: SECTIONS[0],
      batchTime: '',
      duration: '',
      subjects: [],
      weeklyDays: [],
      admissionFee: 0,
      monthlyFee: 0,
    });
    setShowAdvanced(false);
    setSubjectInput('');
  };

  const addSubject = () => {
    if (subjectInput.trim() && !newBatch.subjects.includes(subjectInput.trim())) {
      setNewBatch({
        ...newBatch,
        subjects: [...newBatch.subjects, subjectInput.trim()]
      });
      setSubjectInput('');
    }
  };

  const removeSubject = (subject: string) => {
    setNewBatch({
      ...newBatch,
      subjects: newBatch.subjects.filter(s => s !== subject)
    });
  };

  const toggleDay = (dayId: string) => {
    const currentDays = [...newBatch.weeklyDays];
    if (currentDays.includes(dayId)) {
      setNewBatch({
        ...newBatch,
        weeklyDays: currentDays.filter(d => d !== dayId)
      });
    } else {
      setNewBatch({
        ...newBatch,
        weeklyDays: [...currentDays, dayId]
      });
    }
  };

  const handleDeleteBatch = async (id: string) => {
    // Handled by ConfirmModal now
    setBatchToDelete(id);
    const batch = batches.find(b => b.id === id);
    setBatchToDeleteName(batch?.name || '');
    setIsDeleteModalOpen(true);
    setActiveMenu(null);
  };

  const handleEditBatch = (batch: Batch) => {
    setEditingBatch(batch);
    setNewBatch({
      name: batch.name,
      description: batch.description || '',
      color: batch.color || BATCH_COLORS[0],
      grade: batch.grade,
      section: batch.section,
      batchTime: batch.batchTime || '',
      duration: batch.duration || '',
      subjects: batch.subjects || [],
      weeklyDays: batch.weeklyDays || [],
      admissionFee: batch.admissionFee,
      monthlyFee: batch.monthlyFee,
    });
    setIsEditModalOpen(true);
    setActiveMenu(null);
  };

  const handleUpdateBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !editingBatch || isSaving) return;

    setIsSaving(true);
    try {
      const batchRef = doc(db, 'batches', editingBatch.id);
      const { id, createdAt, ...updateData } = { ...editingBatch, ...newBatch };
      
      await updateDoc(batchRef, {
        ...updateData,
        updatedAt: serverTimestamp(),
      });
      
      setIsEditModalOpen(false);
      setEditingBatch(null);
      resetForm();
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `batches/${editingBatch.id}`);
    } finally {
      setIsSaving(false);
    }
  };

  const filteredBatches = batches.filter(b => {
    const matchesSearch = b.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         b.grade.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesGrade = selectedGrade ? b.grade === selectedGrade : true;
    return matchesSearch && matchesGrade;
  });

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">{t('batches.title')}</h1>
          <p className="text-gray-500 mt-1">{t('batches.subtitle')}</p>
        </div>
        {user?.role !== 'staff' && (
          <button 
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 transition-all shadow-md shadow-indigo-200"
          >
            <Plus className="w-4 h-4" /> {t('batches.createBatch')}
          </button>
        )}
      </div>

      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
        <div className="relative w-full md:w-96 group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 group-focus-within:text-indigo-500 transition-colors" />
          <input
            type="text"
            placeholder={t('batches.searchPlaceholder')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
          />
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto">
          <select 
            value={selectedGrade}
            onChange={(e) => setSelectedGrade(e.target.value)}
            className="flex-1 md:w-48 px-4 py-2.5 text-sm font-bold text-gray-600 border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all font-medium"
          >
            <option value="">{t('batches.allGrades', { defaultValue: 'All Classes' })}</option>
            {GRADES.map(g => (
              <option key={g} value={g}>{t(`common.grades.${g}`)}</option>
            ))}
          </select>
          <button 
            onClick={() => {
              setSearchTerm('');
              setSelectedGrade('');
            }}
            className="p-2.5 text-gray-400 hover:text-rose-600 bg-gray-50 hover:bg-rose-50 border border-gray-200 rounded-xl transition-all shadow-sm"
            title={t('common.clearFilters', { defaultValue: 'Clear Filters' })}
          >
            <XCircle className="w-5 h-5 transition-transform hover:scale-110" />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredBatches.map((batch) => (
            <motion.div
              key={batch.id}
              whileHover={{ y: -4 }}
              className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all duration-300 group"
            >
                <div className="flex items-start justify-between relative">
                  <div className={cn("p-3 rounded-xl text-white border", batch.color || 'bg-indigo-500')}>
                    <Layers className="w-6 h-6" />
                  </div>
                  {user?.role !== 'staff' && (
                    <div className="relative">
                      <button 
                        onClick={() => setActiveMenu(activeMenu === batch.id ? null : batch.id)}
                        className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>
                      
                      <AnimatePresence>
                        {activeMenu === batch.id && (
                          <>
                            <div 
                              className="fixed inset-0 z-10" 
                              onClick={() => setActiveMenu(null)}
                            />
                            <motion.div
                              initial={{ opacity: 0, scale: 0.95, y: -10 }}
                              animate={{ opacity: 1, scale: 1, y: 0 }}
                              exit={{ opacity: 0, scale: 0.95, y: -10 }}
                              className="absolute right-0 mt-2 w-48 bg-white rounded-2xl shadow-xl border border-gray-100 py-2 z-20 overflow-hidden"
                            >
                              <button
                                onClick={() => handleEditBatch(batch)}
                                className="w-full px-4 py-2 text-left text-sm font-bold text-gray-700 hover:bg-indigo-50 hover:text-indigo-600 flex items-center gap-2 transition-colors"
                              >
                                <Plus className="w-4 h-4 rotate-45" /> {t('common.edit', { defaultValue: 'Edit' })}
                              </button>
                              <button
                                onClick={() => handleDeleteBatch(batch.id)}
                                className="w-full px-4 py-2 text-left text-sm font-bold text-rose-600 hover:bg-rose-50 flex items-center gap-2 transition-colors"
                              >
                                <Trash2 className="w-4 h-4" /> {t('common.delete', { defaultValue: 'Delete' })}
                              </button>
                            </motion.div>
                          </>
                        )}
                      </AnimatePresence>
                    </div>
                  )}
                </div>
              
              <div className="mt-4">
                <h3 className="text-xl font-bold text-gray-900 group-hover:text-indigo-600 transition-colors">{batch.name}</h3>
                {batch.description && <p className="text-sm text-gray-500 mt-1 line-clamp-2">{batch.description}</p>}
                
                <div className="flex flex-wrap items-center gap-3 mt-4">
                  <div className="flex items-center gap-1.5 text-xs text-gray-500 bg-gray-50 px-2 py-1 rounded-lg">
                    <Users className="w-3.5 h-3.5" />
                    <span>{batch.studentCount || 0} {t('students.title')}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-gray-500 bg-gray-50 px-2 py-1 rounded-lg">
                    <Layers className="w-3.5 h-3.5" />
                    <span>{t(`common.grades.${batch.grade}`)}</span>
                  </div>
                  {batch.batchTime && (
                    <div className="flex items-center gap-1.5 text-xs text-gray-500 bg-gray-50 px-2 py-1 rounded-lg">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{batch.batchTime}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg">
                    <span>{batch.monthlyFee}৳ / {t('batches.month')}</span>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-6 border-t border-gray-50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => navigate('/messages', { state: { recipientType: 'batch', recipientId: batch.id, recipientName: batch.name } })}
                    className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                    title="Message Batch"
                  >
                    <MessageSquare className="w-4 h-4" />
                  </button>
                  <span className="text-xs text-gray-400">{t('batches.created')} {new Date(batch.createdAt?.seconds * 1000).toLocaleDateString()}</span>
                </div>
                <button 
                  onClick={() => handleViewDetails(batch)}
                  className="text-sm font-bold text-indigo-600 hover:text-indigo-700"
                >
                  {t('batches.viewDetails')}
                </button>
                <button 
                  onClick={() => navigate(`/students?batch=${batch.id}`)}
                  className="text-sm font-bold text-gray-400 hover:text-gray-600 flex items-center gap-1"
                >
                  <Users className="w-3 h-3" />
                  {t('batches.viewStudents', { defaultValue: 'Students' })}
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <Modal 
        isOpen={isDetailModalOpen} 
        onClose={() => setIsDetailModalOpen(false)} 
        title={t('batches.detailModal.title', { defaultValue: 'Batch Details' })}
        maxWidth="max-w-2xl"
      >
        {selectedBatch && (
          <div className="space-y-8">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-2xl font-black text-gray-900 tracking-tight">{selectedBatch.name}</h3>
                <p className="text-gray-500 mt-1 font-medium">{selectedBatch.description}</p>
              </div>
              <div className="px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl font-bold text-sm">
                {selectedBatch.grade}
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
              <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">{t('batches.section')}</p>
                <p className="text-sm font-bold text-gray-900">{selectedBatch.section || 'N/A'}</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">{t('batches.time')}</p>
                <p className="text-sm font-bold text-gray-900">{selectedBatch.batchTime || 'N/A'}</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">{t('batches.duration')}</p>
                <p className="text-sm font-bold text-gray-900">{selectedBatch.duration || '0'} {t('batches.minutes')}</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">{t('batches.monthlyFee')}</p>
                <p className="text-sm font-bold text-indigo-600">৳{selectedBatch.monthlyFee}</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">{t('batches.admissionFee')}</p>
                <p className="text-sm font-bold text-indigo-600">৳{selectedBatch.admissionFee}</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">{t('batches.students')}</p>
                <p className="text-sm font-bold text-gray-900">{selectedBatch.studentCount || 0}</p>
              </div>
            </div>

            {selectedBatch.subjects && selectedBatch.subjects.length > 0 && (
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest">{t('batches.subjects')}</h4>
                <div className="flex flex-wrap gap-2">
                  {selectedBatch.subjects.map((subject, idx) => (
                    <span key={idx} className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-bold text-gray-700">
                      {subject}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {selectedBatch.weeklyDays && selectedBatch.weeklyDays.length > 0 && (
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest">{t('batches.weeklyDays')}</h4>
                <div className="flex flex-wrap gap-2">
                  {selectedBatch.weeklyDays.map((day, idx) => (
                    <span key={idx} className="px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg text-xs font-bold">
                      {day}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-4 pt-4">
              <button
                onClick={() => {
                  setIsDetailModalOpen(false);
                  navigate(`/students?batch=${selectedBatch.id}`);
                }}
                className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 flex items-center justify-center gap-2"
              >
                <Users className="w-5 h-5" />
                {t('batches.viewStudents')}
              </button>
              <button
                onClick={() => {
                  setIsDetailModalOpen(false);
                  handleEditBatch(selectedBatch);
                }}
                className="px-8 py-4 bg-gray-100 text-gray-600 rounded-2xl font-bold hover:bg-gray-200 transition-all"
              >
                {t('common.edit')}
              </button>
            </div>
          </div>
        )}
      </Modal>

      <Modal 
        isOpen={isDetailModalOpen} 
        onClose={() => setIsDetailModalOpen(false)} 
        title={t('batches.detailModal.title', { defaultValue: 'Batch Details' })}
        maxWidth="max-w-2xl"
      >
        {selectedBatch && (
          <div className="space-y-8">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-2xl font-black text-gray-900 tracking-tight">{selectedBatch.name}</h3>
                <p className="text-gray-500 mt-1 font-medium">{selectedBatch.description}</p>
              </div>
              <div className="px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl font-bold text-sm">
                {selectedBatch.grade}
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
              <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">{t('batches.section')}</p>
                <p className="text-sm font-bold text-gray-900">{selectedBatch.section || 'N/A'}</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">{t('batches.time')}</p>
                <p className="text-sm font-bold text-gray-900">{selectedBatch.batchTime || 'N/A'}</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">{t('batches.duration')}</p>
                <p className="text-sm font-bold text-gray-900">{selectedBatch.duration || '0'} {t('batches.minutes')}</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">{t('batches.monthlyFee')}</p>
                <p className="text-sm font-bold text-indigo-600">৳{selectedBatch.monthlyFee}</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">{t('batches.admissionFee')}</p>
                <p className="text-sm font-bold text-indigo-600">৳{selectedBatch.admissionFee}</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">{t('batches.students')}</p>
                <p className="text-sm font-bold text-gray-900">{selectedBatch.studentCount || 0}</p>
              </div>
            </div>

            {selectedBatch.subjects && selectedBatch.subjects.length > 0 && (
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest">{t('batches.subjects')}</h4>
                <div className="flex flex-wrap gap-2">
                  {selectedBatch.subjects.map((subject, idx) => (
                    <span key={idx} className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-bold text-gray-700">
                      {subject}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {selectedBatch.weeklyDays && selectedBatch.weeklyDays.length > 0 && (
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest">{t('batches.weeklyDays')}</h4>
                <div className="flex flex-wrap gap-2">
                  {selectedBatch.weeklyDays.map((day, idx) => (
                    <span key={idx} className="px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg text-xs font-bold">
                      {day}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-4 pt-4">
              <button
                onClick={() => {
                  setIsDetailModalOpen(false);
                  navigate(`/students?batch=${selectedBatch.id}`);
                }}
                className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 flex items-center justify-center gap-2"
              >
                <Users className="w-5 h-5" />
                {t('batches.viewStudents')}
              </button>
              <button
                onClick={() => {
                  setIsDetailModalOpen(false);
                  handleEditBatch(selectedBatch);
                }}
                className="px-8 py-4 bg-gray-100 text-gray-600 rounded-2xl font-bold hover:bg-gray-200 transition-all"
              >
                {t('common.edit')}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Edit Modal */}
      <Modal isOpen={isEditModalOpen} onClose={() => { setIsEditModalOpen(false); resetForm(); }} title={t('batches.editModal.title', { defaultValue: 'Edit Batch' })}>
        <form onSubmit={handleUpdateBatch} className="space-y-6 max-h-[80vh] overflow-y-auto px-1">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700">{t('batches.addModal.name')}</label>
                <input
                  required
                  type="text"
                  placeholder={t('batches.addModal.namePlaceholder')}
                  value={newBatch.name}
                  onChange={e => setNewBatch({...newBatch, name: e.target.value})}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700">{t('batches.addModal.description')}</label>
                <textarea
                  placeholder={t('batches.addModal.descriptionPlaceholder')}
                  value={newBatch.description}
                  onChange={e => setNewBatch({...newBatch, description: e.target.value})}
                  rows={2}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all resize-none"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700">{t('batches.addModal.color')}</label>
                <div className="flex flex-wrap gap-2">
                  {BATCH_COLORS.map(color => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setNewBatch({...newBatch, color})}
                      className={cn(
                        "w-8 h-8 rounded-full transition-all border-2",
                        color,
                        newBatch.color === color ? "border-gray-900 scale-110" : "border-transparent"
                      )}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-indigo-500" />
                    {t('batches.addModal.admissionFee')}
                  </label>
                  <div className="relative">
                    <input
                      required
                      type="number"
                      placeholder="0"
                      value={newBatch.admissionFee}
                      onChange={e => setNewBatch({...newBatch, admissionFee: parseFloat(e.target.value) || 0})}
                      className="w-full pl-4 pr-10 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-bold">৳</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-emerald-500" />
                    {t('batches.addModal.monthlyFee')}
                  </label>
                  <div className="relative">
                    <input
                      required
                      type="number"
                      placeholder="0"
                      value={newBatch.monthlyFee}
                      onChange={e => setNewBatch({...newBatch, monthlyFee: parseFloat(e.target.value) || 0})}
                      className="w-full pl-4 pr-10 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-bold">৳</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700">{t('batches.addModal.class')}</label>
                <select
                  value={newBatch.grade}
                  onChange={e => setNewBatch({...newBatch, grade: e.target.value})}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                >
                  <option value="No class">{t('common.grades.No class')}</option>
                  {GRADES.map(g => <option key={g} value={g}>{t(`common.grades.${g}`)}</option>)}
                </select>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center gap-2 text-sm font-bold text-indigo-600 hover:text-indigo-700 transition-colors"
            >
              {t('batches.addModal.advanced')}
              {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            <AnimatePresence>
              {showAdvanced && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="pt-6 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                          <Clock className="w-4 h-4 text-indigo-500" />
                          {t('batches.addModal.batchTime')}
                        </label>
                        <input
                          type="text"
                          placeholder={t('batches.addModal.batchTimePlaceholder')}
                          value={newBatch.batchTime}
                          onChange={e => setNewBatch({...newBatch, batchTime: e.target.value})}
                          className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-indigo-500" />
                          {t('batches.addModal.duration')}
                        </label>
                        <input
                          type="text"
                          placeholder={t('batches.addModal.durationPlaceholder')}
                          value={newBatch.duration}
                          onChange={e => setNewBatch({...newBatch, duration: e.target.value})}
                          className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                        <BookOpen className="w-4 h-4 text-indigo-500" />
                        {t('batches.addModal.subjects')}
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder={t('batches.addModal.subjectsPlaceholder')}
                          value={subjectInput}
                          onChange={e => setSubjectInput(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addSubject())}
                          className="flex-1 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                        />
                        <button
                          type="button"
                          onClick={addSubject}
                          className="px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-bold text-sm hover:bg-gray-200 transition-all"
                        >
                          {t('batches.addModal.add')}
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {newBatch.subjects.map(subject => (
                          <span key={subject} className="flex items-center gap-1 px-3 py-1 bg-indigo-50 text-indigo-600 rounded-full text-xs font-medium">
                            {subject}
                            <button type="button" onClick={() => removeSubject(subject)} className="hover:text-indigo-800">
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-bold text-gray-700">{t('batches.addModal.weeklyDays')}</label>
                      <div className="flex flex-wrap gap-2">
                        {WEEK_DAYS.map(day => (
                          <button
                            key={day.id}
                            type="button"
                            onClick={() => toggleDay(day.id)}
                            className={cn(
                              "px-4 py-2 rounded-xl text-xs font-bold transition-all border",
                              newBatch.weeklyDays.includes(day.id)
                                ? "bg-indigo-600 text-white border-indigo-600"
                                : "bg-gray-50 text-gray-500 border-gray-200 hover:border-indigo-200"
                            )}
                          >
                            {t(`common.weekDays.${day.id}`)}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="flex gap-4 pt-6 border-t border-gray-100">
            <button
              type="button"
              onClick={() => { setIsEditModalOpen(false); resetForm(); }}
              className="flex-1 py-3.5 bg-gray-100 text-gray-700 rounded-2xl font-bold hover:bg-gray-200 transition-all"
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              className="flex-[2] py-3.5 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200"
            >
              {t('common.saveChanges', { defaultValue: 'Save Changes' })}
            </button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title={t('batches.addModal.title')}>
        <form onSubmit={handleAddBatch} className="space-y-6 max-h-[80vh] overflow-y-auto px-1">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700">{t('batches.addModal.name')}</label>
                <input
                  required
                  type="text"
                  placeholder={t('batches.addModal.namePlaceholder')}
                  value={newBatch.name}
                  onChange={e => setNewBatch({...newBatch, name: e.target.value})}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700">{t('batches.addModal.description')}</label>
                <textarea
                  placeholder={t('batches.addModal.descriptionPlaceholder')}
                  value={newBatch.description}
                  onChange={e => setNewBatch({...newBatch, description: e.target.value})}
                  rows={2}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all resize-none"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700">{t('batches.addModal.color')}</label>
                <div className="flex flex-wrap gap-2">
                  {BATCH_COLORS.map(color => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setNewBatch({...newBatch, color})}
                      className={cn(
                        "w-8 h-8 rounded-full transition-all border-2",
                        color,
                        newBatch.color === color ? "border-gray-900 scale-110" : "border-transparent"
                      )}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-indigo-500" />
                    {t('batches.addModal.admissionFee')}
                  </label>
                  <div className="relative">
                    <input
                      required
                      type="number"
                      placeholder="0"
                      value={newBatch.admissionFee}
                      onChange={e => setNewBatch({...newBatch, admissionFee: parseFloat(e.target.value) || 0})}
                      className="w-full pl-4 pr-10 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-bold">৳</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-emerald-500" />
                    {t('batches.addModal.monthlyFee')}
                  </label>
                  <div className="relative">
                    <input
                      required
                      type="number"
                      placeholder="0"
                      value={newBatch.monthlyFee}
                      onChange={e => setNewBatch({...newBatch, monthlyFee: parseFloat(e.target.value) || 0})}
                      className="w-full pl-4 pr-10 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-bold">৳</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700">{t('batches.addModal.class')}</label>
                <select
                  value={newBatch.grade}
                  onChange={e => setNewBatch({...newBatch, grade: e.target.value})}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                >
                  <option value="No class">{t('common.grades.No class')}</option>
                  {GRADES.map(g => <option key={g} value={g}>{t(`common.grades.${g}`)}</option>)}
                </select>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center gap-2 text-sm font-bold text-indigo-600 hover:text-indigo-700 transition-colors"
            >
              {t('batches.addModal.advanced')}
              {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            <AnimatePresence>
              {showAdvanced && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="pt-6 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                          <Clock className="w-4 h-4 text-indigo-500" />
                          {t('batches.addModal.batchTime')}
                        </label>
                        <input
                          type="text"
                          placeholder={t('batches.addModal.batchTimePlaceholder')}
                          value={newBatch.batchTime}
                          onChange={e => setNewBatch({...newBatch, batchTime: e.target.value})}
                          className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-indigo-500" />
                          {t('batches.addModal.duration')}
                        </label>
                        <input
                          type="text"
                          placeholder={t('batches.addModal.durationPlaceholder')}
                          value={newBatch.duration}
                          onChange={e => setNewBatch({...newBatch, duration: e.target.value})}
                          className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                        <BookOpen className="w-4 h-4 text-indigo-500" />
                        {t('batches.addModal.subjects')}
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder={t('batches.addModal.subjectsPlaceholder')}
                          value={subjectInput}
                          onChange={e => setSubjectInput(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addSubject())}
                          className="flex-1 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                        />
                        <button
                          type="button"
                          onClick={addSubject}
                          className="px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-bold text-sm hover:bg-gray-200 transition-all"
                        >
                          {t('batches.addModal.add')}
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {newBatch.subjects.map(subject => (
                          <span key={subject} className="flex items-center gap-1 px-3 py-1 bg-indigo-50 text-indigo-600 rounded-full text-xs font-medium">
                            {subject}
                            <button type="button" onClick={() => removeSubject(subject)} className="hover:text-indigo-800">
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-bold text-gray-700">{t('batches.addModal.weeklyDays')}</label>
                      <div className="flex flex-wrap gap-2">
                        {WEEK_DAYS.map(day => (
                          <button
                            key={day.id}
                            type="button"
                            onClick={() => toggleDay(day.id)}
                            className={cn(
                              "px-4 py-2 rounded-xl text-xs font-bold transition-all border",
                              newBatch.weeklyDays.includes(day.id)
                                ? "bg-indigo-600 text-white border-indigo-600"
                                : "bg-gray-50 text-gray-500 border-gray-200 hover:border-indigo-200"
                            )}
                          >
                            {t(`common.weekDays.${day.id}`)}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="flex gap-4 pt-6 border-t border-gray-100">
            <button
              type="button"
              onClick={() => setIsAddModalOpen(false)}
              className="flex-1 py-3.5 bg-gray-100 text-gray-700 rounded-2xl font-bold hover:bg-gray-200 transition-all"
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="flex-1 py-3.5 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
              {t('batches.createBatch')}
            </button>
          </div>
        </form>
      </Modal>

      <SubscriptionModal 
        isOpen={isUpgradeModalOpen} 
        onClose={() => setIsUpgradeModalOpen(false)} 
      />
      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={async () => {
          if (!batchToDelete || isSaving) return;
          setIsSaving(true);
          try {
            await deleteDoc(doc(db, 'batches', batchToDelete));
          } catch (error) {
            handleFirestoreError(error, OperationType.DELETE, `batches/${batchToDelete}`);
          } finally {
            setIsSaving(false);
            setIsDeleteModalOpen(false);
            setBatchToDelete(null);
          }
        }}
        title="Delete Batch"
        message={`Are you sure you want to delete ${batchToDeleteName}? All students in this batch will be affected.`}
        variant="danger"
      />
    </div>
  );
}
