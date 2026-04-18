import React, { useState, useEffect } from 'react';
import { Briefcase, Plus, Search, Filter, Download, Calendar, CheckCircle, Clock, Share2, ExternalLink, Loader2, Trash2, Edit2, UserPlus, Mail, Phone, MapPin, ChevronDown, MessageSquare, CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import { useAuth } from '../lib/auth';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { cn } from '../lib/utils';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, query, where, orderBy, getDocs, onSnapshot, addDoc, serverTimestamp, doc, updateDoc, deleteDoc, setDoc } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { Modal } from '../components/Modal';
import { ConfirmModal } from '../components/ConfirmModal';

interface Teacher {
  id: string;
  name: string;
  email: string;
  phone: string;
  subject: string;
  salary: number;
  paymentStatus: 'paid' | 'unpaid';
  joinDate: string;
  photoURL?: string;
}

interface Schedule {
  id: string;
  teacherId: string;
  teacherName: string;
  batchId: string;
  batchName: string;
  day: string;
  time: string;
  subject: string;
}

interface Circular {
  id: string;
  title: string;
  description: string;
  requirements: string[];
  salaryRange: string;
  deadline: string;
  active: boolean;
  institutionId: string;
}

interface JobApplication {
  id: string;
  circularId: string;
  applicantName: string;
  phone: string;
  email: string;
  age?: string;
  address?: string;
  photoUrl?: string;
  resumeUrl?: string;
  status: 'pending' | 'shortlisted' | 'rejected';
  formData: any;
  createdAt: any;
  aiScore?: number;
  aiFeedback?: string;
}

export function Teachers() {
  const { user, createStaffAccount } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'list' | 'schedules' | 'hiring'>('list');
  const [loading, setLoading] = useState(true);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [circulars, setCirculars] = useState<Circular[]>([]);
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showApplicationsModal, setShowApplicationsModal] = useState(false);
  const [selectedCircular, setSelectedCircular] = useState<Circular | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedApplication, setSelectedApplication] = useState<JobApplication | null>(null);
  const [showCopyToast, setShowCopyToast] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);
  const [scheduleSort, setScheduleSort] = useState<{ field: keyof Schedule, direction: 'asc' | 'desc' } | null>(null);
  const [batches, setBatches] = useState<{id: string, name: string}[]>([]);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [teacherToDelete, setTeacherToDelete] = useState<Teacher | null>(null);
  const [isCircularDeleteModalOpen, setIsCircularDeleteModalOpen] = useState(false);
  const [circularToDelete, setCircularToDelete] = useState<Circular | null>(null);

  useEffect(() => {
    if (!user?.uid) return;

    const instId = user.institutionId || user.uid;

    const fetchTeachers = async () => {
      try {
        const q = query(collection(db, 'teachers'), where('institutionId', '==', instId));
        const querySnapshot = await getDocs(q);
        
        const mappedTeachers = querySnapshot.docs.map(doc => {
          const t = doc.data();
          return {
            id: doc.id,
            name: t.name,
            email: t.email,
            phone: t.phone,
            subject: t.subject,
            salary: t.salary,
            paymentStatus: t.paymentStatus,
            joinDate: t.joinDate,
            photoURL: t.photoUrl
          };
        });
        setTeachers(mappedTeachers as Teacher[]);
      } catch (error) {
        handleFirestoreError(error, OperationType.LIST, 'teachers');
      } finally {
        setLoading(false);
      }
    };

    const fetchSchedules = async () => {
      try {
        const q = query(collection(db, 'schedules'), where('institutionId', '==', instId));
        const querySnapshot = await getDocs(q);
        
        const mappedSchedules = querySnapshot.docs.map(doc => {
          const s = doc.data();
          return {
            id: doc.id,
            teacherId: s.teacherId,
            teacherName: s.teacherName,
            batchId: s.batchId,
            batchName: s.batchName,
            day: s.day,
            time: s.time,
            subject: s.subject
          };
        });
        setSchedules(mappedSchedules as Schedule[]);
      } catch (error) {
        handleFirestoreError(error, OperationType.LIST, 'schedules');
      }
    };

    const fetchCirculars = async () => {
      try {
        const q = query(collection(db, 'circulars'), where('institutionId', '==', instId));
        const querySnapshot = await getDocs(q);
        
        const mappedCirculars = querySnapshot.docs.map(doc => {
          const c = doc.data();
          return {
            id: doc.id,
            title: c.title,
            description: c.description,
            requirements: c.requirements,
            salaryRange: c.salaryRange,
            deadline: c.deadline,
            active: c.active,
            institutionId: c.institutionId
          };
        });
        setCirculars(mappedCirculars as Circular[]);
      } catch (error) {
        handleFirestoreError(error, OperationType.LIST, 'circulars');
      }
    };

    const fetchApplications = async () => {
      try {
        const q = query(collection(db, 'job_applications'), where('institutionId', '==', instId));
        const querySnapshot = await getDocs(q);
        
        const mappedApps = querySnapshot.docs.map(doc => {
          const a = doc.data();
          return {
            id: doc.id,
            circularId: a.circularId,
            applicantName: a.applicantName,
            phone: a.phone,
            email: a.email,
            age: a.age,
            address: a.address,
            photoUrl: a.photoUrl,
            resumeUrl: a.resumeUrl,
            status: a.status,
            formData: a.formData,
            createdAt: a.createdAt,
            aiScore: a.aiScore,
            aiFeedback: a.aiFeedback
          };
        });
        setApplications(mappedApps as JobApplication[]);
      } catch (error) {
        handleFirestoreError(error, OperationType.LIST, 'job_applications');
      }
    };

    const fetchBatches = async () => {
      try {
        const q = query(collection(db, 'batches'), where('institutionId', '==', instId));
        const querySnapshot = await getDocs(q);
        setBatches(querySnapshot.docs.map(doc => ({ id: doc.id, name: doc.data().name })));
      } catch (error) {
        handleFirestoreError(error, OperationType.LIST, 'batches');
      }
    };

    fetchTeachers();
    fetchSchedules();
    fetchCirculars();
    fetchApplications();
    fetchBatches();

    const unsubTeachers = onSnapshot(query(collection(db, 'teachers'), where('institutionId', '==', instId)), (snapshot) => {
      const mappedTeachers = snapshot.docs.map(doc => {
        const t = doc.data();
        return {
          id: doc.id,
          name: t.name,
          email: t.email,
          phone: t.phone,
          subject: t.subject,
          salary: t.salary,
          paymentStatus: t.paymentStatus,
          joinDate: t.joinDate,
          photoURL: t.photoUrl
        };
      });
      setTeachers(mappedTeachers as Teacher[]);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'teachers'));

    const unsubSchedules = onSnapshot(query(collection(db, 'schedules'), where('institutionId', '==', instId)), (snapshot) => {
      const mappedSchedules = snapshot.docs.map(doc => {
        const s = doc.data();
        return {
          id: doc.id,
          teacherId: s.teacherId,
          teacherName: s.teacherName,
          batchId: s.batchId,
          batchName: s.batchName,
          day: s.day,
          time: s.time,
          subject: s.subject
        };
      });
      setSchedules(mappedSchedules as Schedule[]);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'schedules'));

    const unsubCirculars = onSnapshot(query(collection(db, 'circulars'), where('institutionId', '==', instId)), (snapshot) => {
      const mappedCirculars = snapshot.docs.map(doc => {
        const c = doc.data();
        return {
          id: doc.id,
          title: c.title,
          description: c.description,
          requirements: c.requirements,
          salaryRange: c.salaryRange,
          deadline: c.deadline,
          active: c.active,
          institutionId: c.institutionId
        };
      });
      setCirculars(mappedCirculars as Circular[]);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'circulars'));

    const unsubApps = onSnapshot(query(collection(db, 'job_applications'), where('institutionId', '==', instId)), (snapshot) => {
      const mappedApps = snapshot.docs.map(doc => {
        const a = doc.data();
        return {
          id: doc.id,
          circularId: a.circularId,
          applicantName: a.applicantName,
          phone: a.phone,
          email: a.email,
          age: a.age,
          address: a.address,
          photoUrl: a.photoUrl,
          resumeUrl: a.resumeUrl,
          status: a.status,
          formData: a.formData,
          createdAt: a.createdAt,
          aiScore: a.aiScore,
          aiFeedback: a.aiFeedback
        };
      });
      setApplications(mappedApps as JobApplication[]);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'job_applications'));

    const unsubBatches = onSnapshot(query(collection(db, 'batches'), where('institutionId', '==', instId)), (snapshot) => {
      setBatches(snapshot.docs.map(doc => ({ id: doc.id, name: doc.data().name })));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'batches'));

    return () => {
      unsubTeachers();
      unsubSchedules();
      unsubCirculars();
      unsubApps();
      unsubBatches();
    };
  }, [user]);

  const handleAddTeacher = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isSaving) return;
    setIsSaving(true);
    
    const form = e.currentTarget;
    const formData = new FormData(form);
    const name = formData.get('name') as string;
    const email = formData.get('email') as string;
    const phone = formData.get('phone') as string;
    const subject = formData.get('subject') as string;
    const salary = Number(formData.get('salary'));
    const password = formData.get('password') as string;
    
    try {
      const instId = user.institutionId || user.uid;
      if (editingTeacher) {
        await updateDoc(doc(db, 'teachers', editingTeacher.id), {
          name,
          email,
          phone,
          subject,
          salary,
        });
        setEditingTeacher(null);
      } else {
        // 1. Create Auth account for the teacher
        if (!password) {
          setToast({ message: "Password is required for new staff accounts.", type: 'error' });
          setIsSaving(false);
          return;
        }
        
        const uid = await createStaffAccount(email, password);
        
        // 2. Create User Profile in Firestore
        await setDoc(doc(db, 'users', uid), {
          id: uid,
          email,
          displayName: name,
          role: 'teacher',
          institutionId: instId,
          createdAt: serverTimestamp()
        });

        // 3. Add to Teachers collection
        await setDoc(doc(db, 'teachers', uid), {
          uid, // Link to the auth user
          name,
          email,
          phone,
          subject,
          salary,
          paymentStatus: 'unpaid',
          joinDate: new Date().toISOString().split('T')[0],
          institutionId: instId,
          createdAt: serverTimestamp()
        });
      }
      if (form) form.reset();
      setToast({ message: editingTeacher ? 'Teacher updated successfully!' : 'Teacher added successfully!', type: 'success' });
    } catch (error: any) {
      handleFirestoreError(error, OperationType.WRITE, 'teachers');
      setToast({ message: error.message || 'Failed to add teacher.', type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddSchedule = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    const teacherId = formData.get('teacherId') as string;
    const batchId = formData.get('batchId') as string;
    const teacher = teachers.find(t => t.id === teacherId);
    const batch = batches.find(b => b.id === batchId);

    try {
      const instId = user.institutionId || user.uid;
      await addDoc(collection(db, 'schedules'), {
        teacherId: teacherId,
        teacherName: teacher?.name || 'Unknown',
        batchId: batchId,
        batchName: batch?.name || 'Unknown',
        day: formData.get('day'),
        time: formData.get('time'),
        subject: formData.get('subject'),
        institutionId: instId,
        createdAt: serverTimestamp()
      });

      const stay = (e.nativeEvent as any).submitter?.getAttribute('data-stay') === 'true';
      if (!stay) {
        setShowScheduleModal(false);
        if (form) form.reset();
      } else {
        // Reset only subject and time for quick entry
        const subjectInput = form.querySelector('input[name="subject"]') as HTMLInputElement;
        const timeInput = form.querySelector('input[name="time"]') as HTMLInputElement;
        if (subjectInput) subjectInput.value = '';
        if (timeInput) timeInput.value = '';
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'schedules');
    }
  };

  const handleTogglePayment = async (teacher: Teacher) => {
    try {
      await updateDoc(doc(db, 'teachers', teacher.id), {
        paymentStatus: teacher.paymentStatus === 'paid' ? 'unpaid' : 'paid'
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'teachers');
    }
  };

  const handleCreateCircular = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user?.uid || isSaving) return;
    setIsSaving(true);
    
    const form = e.currentTarget;
    const formData = new FormData(form);
    const instId = user.institutionId || user.uid;
    try {
      await addDoc(collection(db, 'circulars'), {
        title: formData.get('title'),
        description: formData.get('description'),
        salaryRange: formData.get('salaryRange'),
        deadline: formData.get('deadline'),
        requirements: (formData.get('requirements') as string).split('\n').filter(r => r.trim()),
        vacancies: formData.get('vacancies'),
        education: formData.get('education'),
        experience: formData.get('experience'),
        jobType: formData.get('jobType'),
        active: true,
        institutionId: instId,
        createdAt: serverTimestamp()
      });
      
      if (form) form.reset();
      setToast({ message: 'Circular posted successfully!', type: 'success' });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'circulars');
    } finally {
      setIsSaving(false);
    }
  };

  const shareCircular = (circularId: string) => {
    const url = `${window.location.origin}/public/circular/${circularId}`;
    navigator.clipboard.writeText(url);
    setShowCopyToast(true);
    setTimeout(() => setShowCopyToast(false), 3000);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
      </div>
    );
  }

  const filteredTeachers = teachers.filter(t => 
    t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.subject.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">{t('teachers.title')}</h1>
          <p className="text-gray-500 mt-1">{t('teachers.subtitle')}</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-4 py-2.5 bg-indigo-50 text-indigo-700 font-bold rounded-xl hover:bg-indigo-100 transition-all">
            <Download className="w-4 h-4" /> {t('teachers.schedules.download')}
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2 p-1 bg-gray-100 rounded-2xl w-fit">
        {(['list', 'schedules', 'hiring'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "px-6 py-2.5 text-sm font-bold rounded-xl transition-all",
              activeTab === tab 
                ? "bg-white text-indigo-600 shadow-sm" 
                : "text-gray-500 hover:text-gray-700"
            )}
          >
            {t(`teachers.tabs.${tab}`)}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'list' && (
          <motion.div
            key="list"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-6">
                <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input 
                      type="text" 
                      placeholder="Search teachers..." 
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <button className="p-2.5 text-gray-500 hover:bg-gray-50 rounded-xl border border-gray-200 transition-all">
                      <Filter className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredTeachers.map((teacher) => (
                    <div key={teacher.id} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-all group">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-indigo-100 rounded-2xl flex items-center justify-center text-indigo-600 font-black text-xl">
                            {teacher.name.charAt(0)}
                          </div>
                          <div>
                            <h4 className="font-bold text-gray-900">{teacher.name}</h4>
                            <p className="text-xs text-indigo-600 font-bold uppercase tracking-wider">{teacher.subject}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                          <button 
                            onClick={() => navigate('/messages', { state: { recipientType: 'teacher', recipientId: teacher.id, recipientName: teacher.name } })}
                            className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg"
                            title="Message Teacher"
                          >
                            <MessageSquare className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => setEditingTeacher(teacher)}
                            className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => {
                              setTeacherToDelete(teacher);
                              setIsDeleteModalOpen(true);
                            }}
                            className="p-2 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      
                      <div className="space-y-3 pt-4 border-t border-gray-50">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-500">{t('teachers.list.salary')}</span>
                          <span className="font-bold text-gray-900">৳{teacher.salary}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">{t('teachers.list.paymentStatus')}</span>
                          <button 
                            onClick={() => handleTogglePayment(teacher)}
                            className={cn(
                              "px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-full transition-all",
                              teacher.paymentStatus === 'paid' 
                                ? "bg-emerald-50 text-emerald-600 border border-emerald-100" 
                                : "bg-rose-50 text-rose-600 border border-rose-100"
                            )}
                          >
                            {teacher.paymentStatus}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-6">
              <form 
                key={editingTeacher?.id || 'new'}
                onSubmit={handleAddTeacher} 
                className="bg-white dark:bg-gray-900 p-6 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm space-y-4 transition-colors duration-300"
              >
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <UserPlus className="w-5 h-5 text-indigo-600" /> {editingTeacher ? t('common.edit') : t('teachers.list.addTeacher')}
                  </h3>
                  <div className="space-y-3">
                    <input name="name" required defaultValue={editingTeacher?.name} placeholder="Full Name" className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm dark:text-white outline-none focus:ring-2 focus:ring-indigo-500/20" />
                    <input name="email" type="email" required defaultValue={editingTeacher?.email} placeholder="Email Address" className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm dark:text-white outline-none focus:ring-2 focus:ring-indigo-500/20" />
                    {!editingTeacher && (
                      <input name="password" type="password" required placeholder="Login Password" className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm dark:text-white outline-none focus:ring-2 focus:ring-indigo-500/20" />
                    )}
                    <input name="phone" required defaultValue={editingTeacher?.phone} placeholder="Phone Number" className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm dark:text-white outline-none focus:ring-2 focus:ring-indigo-500/20" />
                    <input name="subject" required defaultValue={editingTeacher?.subject} placeholder="Subject (e.g. Physics)" className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm dark:text-white outline-none focus:ring-2 focus:ring-indigo-500/20" />
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold">৳</span>
                      <input name="salary" type="number" required defaultValue={editingTeacher?.salary} placeholder="Monthly Salary" className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm dark:text-white outline-none focus:ring-2 focus:ring-indigo-500/20" />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {editingTeacher && (
                      <button 
                        type="button"
                        onClick={() => setEditingTeacher(null)}
                        className="flex-1 py-3 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 font-bold rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-all"
                      >
                        {t('common.cancel')}
                      </button>
                    )}
                    <button 
                      type="submit" 
                      disabled={isSaving}
                      className="flex-[2] py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                      {editingTeacher ? t('common.save') : t('common.add')}
                    </button>
                  </div>
                </form>

                <div className="bg-indigo-600 p-6 rounded-3xl text-white space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center font-bold text-xl">
                      ৳
                    </div>
                    <span className="text-xs font-bold bg-white/20 px-2 py-1 rounded-lg uppercase tracking-widest">Monthly Budget</span>
                  </div>
                  <div>
                    <p className="text-indigo-100 text-xs font-bold uppercase tracking-widest">Total Salaries</p>
                    <h3 className="text-3xl font-black mt-1">৳{teachers.reduce((acc, t) => acc + t.salary, 0).toLocaleString()}</h3>
                  </div>
                  <div className="pt-4 border-t border-white/10 flex items-center justify-between text-xs">
                    <span className="text-indigo-100">Paid: ৳{teachers.filter(t => t.paymentStatus === 'paid').reduce((acc, t) => acc + t.salary, 0).toLocaleString()}</span>
                    <span className="text-indigo-100">Pending: ৳{teachers.filter(t => t.paymentStatus === 'unpaid').reduce((acc, t) => acc + t.salary, 0).toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'schedules' && (
          <motion.div
            key="schedules"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                <h3 className="text-xl font-bold text-gray-900">{t('teachers.schedules.title')}</h3>
                <button 
                  onClick={() => setShowScheduleModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-lg hover:bg-indigo-700 transition-all"
                >
                  <Plus className="w-3 h-3" /> {t('teachers.schedules.addSchedule')}
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-gray-50 dark:bg-gray-800">
                    <tr>
                      {[
                        { id: 'teacherName', label: 'Teacher' },
                        { id: 'batchName', label: 'Batch' },
                        { id: 'day', label: 'Day' },
                        { id: 'time', label: 'Time' },
                        { id: 'subject', label: 'Subject' }
                      ].map((col) => (
                        <th 
                          key={col.id}
                          onClick={() => {
                            setScheduleSort(prev => ({
                              field: col.id as keyof Schedule,
                              direction: prev?.field === col.id && prev.direction === 'asc' ? 'desc' : 'asc'
                            }));
                          }}
                          className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:text-indigo-600 transition-colors"
                        >
                          <div className="flex items-center gap-2">
                            {col.label}
                            {scheduleSort?.field === col.id && (
                              <ChevronDown className={cn("w-3 h-3 transition-transform", scheduleSort.direction === 'desc' ? "" : "rotate-180")} />
                            )}
                          </div>
                        </th>
                      ))}
                      <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {schedules.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">No schedules set yet.</td>
                      </tr>
                    ) : (
                      [...schedules].sort((a, b) => {
                        if (!scheduleSort) return 0;
                        const aVal = a[scheduleSort.field] || '';
                        const bVal = b[scheduleSort.field] || '';
                        if (aVal < bVal) return scheduleSort.direction === 'asc' ? -1 : 1;
                        if (aVal > bVal) return scheduleSort.direction === 'asc' ? 1 : -1;
                        return 0;
                      }).map((schedule) => (
                        <tr key={schedule.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                          <td className="px-6 py-4 font-bold text-gray-900 dark:text-white">{schedule.teacherName}</td>
                          <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">{schedule.batchName}</td>
                          <td className="px-6 py-4">
                            <span className="px-2 py-1 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 text-xs font-bold rounded-md uppercase">
                              {schedule.day}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2">
                            <Clock className="w-3 h-3 text-gray-400" /> {schedule.time}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">{schedule.subject}</td>
                          <td className="px-6 py-4 text-right">
                            <button 
                              onClick={async () => {
                                if (window.confirm('Are you sure you want to delete this schedule?')) {
                                  try {
                                    await deleteDoc(doc(db, 'schedules', schedule.id));
                                    setToast({ message: 'Schedule deleted', type: 'success' });
                                  } catch (error) {
                                    handleFirestoreError(error, OperationType.DELETE, 'schedules');
                                  }
                                }
                              }}
                              className="p-2 text-gray-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-all"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <AnimatePresence>
              {showScheduleModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl"
                  >
                    <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-indigo-600 text-white">
                      <div>
                        <h3 className="text-xl font-bold">Create Class Routine</h3>
                        <p className="text-indigo-100 text-[10px] uppercase tracking-widest font-bold mt-1">Add teacher schedule entries</p>
                      </div>
                      <button onClick={() => setShowScheduleModal(false)} className="p-2 hover:bg-white/10 rounded-xl transition-all">
                        <Plus className="w-6 h-6 rotate-45" />
                      </button>
                    </div>
                    <form onSubmit={handleAddSchedule} className="p-8 space-y-5">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">1. Select Teacher</label>
                        <select name="teacherId" required className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all">
                          <option value="">Choose a teacher...</option>
                          {teachers.map(t => (
                            <option key={t.id} value={t.id}>{t.name} ({t.subject})</option>
                          ))}
                        </select>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">2. Select Day</label>
                          <select name="day" required className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all">
                            {['Saturday', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].map(d => (
                              <option key={d} value={d}>{d}</option>
                            ))}
                          </select>
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">3. Select Batch</label>
                          <select name="batchId" required className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all">
                            <option value="">Choose batch...</option>
                            {batches.map(b => (
                              <option key={b.id} value={b.id}>{b.name}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">4. Class/Subject</label>
                          <input name="subject" type="text" placeholder="e.g. Physics 1st" required className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all" />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">5. Time</label>
                          <input name="time" type="time" required className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all" />
                        </div>
                      </div>

                      <div className="pt-4 flex gap-3">
                        <button 
                          type="submit" 
                          data-stay="true"
                          className="flex-1 py-3.5 bg-indigo-50 text-indigo-600 font-bold rounded-2xl hover:bg-indigo-100 transition-all text-xs"
                        >
                          Add & Continue
                        </button>
                        <button 
                          type="submit" 
                          data-stay="false"
                          className="flex-[1.5] py-3.5 bg-indigo-600 text-white font-bold rounded-2xl hover:bg-indigo-700 transition-all text-xs shadow-lg shadow-indigo-100"
                        >
                          Save & Close
                        </button>
                      </div>
                      <p className="text-[10px] text-gray-400 text-center italic">
                        Tip: Use "Add & Continue" to quickly add multiple classes for the same day.
                      </p>
                    </form>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>
          </motion.div>
        )}

        {activeTab === 'hiring' && (
          <motion.div
            key="hiring"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-8"
          >
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                <h3 className="text-xl font-bold text-gray-900 mb-6">{t('teachers.hiring.circulars')}</h3>
                <div className="space-y-4">
                  {circulars.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">No active job circulars.</div>
                  ) : (
                    circulars.map((circular) => (
                      <div key={circular.id} className="p-6 bg-gray-50 border border-gray-100 rounded-2xl group">
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="text-lg font-bold text-gray-900">{circular.title}</h4>
                            <div className="flex items-center gap-4 mt-2 text-xs text-gray-500 font-bold uppercase tracking-wider">
                              <span className="flex items-center gap-1">৳ {circular.salaryRange}</span>
                              <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> Deadline: {circular.deadline}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button 
                              onClick={() => shareCircular(circular.id)}
                              className="p-2 bg-white text-indigo-600 border border-indigo-100 rounded-xl hover:bg-indigo-50 transition-all"
                            >
                              <Share2 className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={async () => {
                                if (window.confirm('Are you sure you want to delete this circular?')) {
                                  try {
                                    await deleteDoc(doc(db, 'circulars', circular.id));
                                    setToast({ message: 'Circular deleted', type: 'success' });
                                  } catch (error) {
                                    handleFirestoreError(error, OperationType.DELETE, 'circulars');
                                  }
                                }
                              }}
                              className="p-2 bg-white text-rose-600 border border-rose-100 rounded-xl hover:bg-rose-50 transition-all"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                        <div className="mt-4 flex flex-wrap gap-2">
                          {circular.requirements.map((req, idx) => (
                            <span key={idx} className="px-2 py-1 bg-white border border-gray-200 text-gray-600 text-[10px] font-bold rounded-md">
                              {req}
                            </span>
                          ))}
                        </div>
                        <div className="mt-6 pt-4 border-t border-gray-200 flex items-center justify-between">
                          <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" /> Active & Receiving Applications
                          </span>
                          <div className="flex items-center gap-4">
                            <span className="text-xs font-bold text-gray-500 bg-gray-100 px-2 py-1 rounded-lg">
                              {applications.filter(app => app.circularId === circular.id).length} Applications
                            </span>
                            <button 
                              onClick={() => {
                                setSelectedCircular(circular);
                                setShowApplicationsModal(true);
                              }}
                              className="px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-xl hover:bg-indigo-700 transition-all flex items-center gap-2 shadow-lg shadow-indigo-100"
                            >
                              Manage Applications <ExternalLink className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <form onSubmit={handleCreateCircular} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4">
                <div className="flex items-center gap-3 text-indigo-900 mb-2">
                  <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center">
                    <Briefcase className="w-5 h-5 text-indigo-600" />
                  </div>
                  <h3 className="font-black text-lg">{t('teachers.hiring.createCircular')}</h3>
                </div>
                
                <div className="grid grid-cols-1 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Position Name</label>
                    <input name="title" type="text" placeholder="e.g. Senior Math Teacher" required className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 shadow-sm" />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Job Type</label>
                      <select name="jobType" className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 shadow-sm font-bold text-gray-700">
                        <option>Full Time</option>
                        <option>Part Time</option>
                        <option>Contractual</option>
                        <option>Remote</option>
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">{t('teachers.hiring.vacancies')}</label>
                      <input name="vacancies" type="number" placeholder="1" required className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 shadow-sm" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">{t('teachers.hiring.salaryRange')}</label>
                      <input name="salaryRange" type="text" placeholder="e.g. 15k - 20k" className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 shadow-sm" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">{t('teachers.hiring.deadline')}</label>
                      <input name="deadline" type="date" required className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 shadow-sm" />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">{t('teachers.hiring.education')}</label>
                      <input name="education" type="text" placeholder="e.g. Honours/Masters/NTRCA" required className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 shadow-sm" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">{t('teachers.hiring.experience')}</label>
                      <input name="experience" type="text" placeholder="e.g. 2 Years" required className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 shadow-sm" />
                    </div>
                  </div>

                  <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 mb-2">
                    <div className="flex gap-3">
                      <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-[11px] font-bold text-blue-900 leading-tight">Public Form Features</p>
                        <p className="text-[10px] text-blue-700 mt-1">The application form will automatically include photo upload, resume attachment, and up to 5 additional document slots for applicants.</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">{t('teachers.hiring.description')}</label>
                    <textarea name="description" rows={3} placeholder="Describe the role..." required className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 shadow-sm resize-none" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Requirements (one per line)</label>
                    <textarea name="requirements" rows={3} placeholder="Requirement 1&#10;Requirement 2..." className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 shadow-sm resize-none" />
                  </div>
                </div>
                <button type="submit" disabled={isSaving} className="w-full py-4 bg-indigo-600 text-white font-bold rounded-2xl hover:bg-indigo-700 disabled:opacity-50 transition-all shadow-lg shadow-indigo-100 flex items-center justify-center gap-2">
                  {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                  {t('teachers.hiring.createCircular')}
                </button>
              </form>

              <div className="bg-amber-50 p-6 rounded-3xl border border-amber-100 space-y-4">
                <div className="w-12 h-12 bg-amber-600 rounded-2xl flex items-center justify-center text-white">
                  <Share2 className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-bold text-amber-900">Hire Faster</h4>
                  <p className="text-amber-700/70 text-sm mt-1">Share your job circulars directly on Facebook, LinkedIn or WhatsApp.</p>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showCopyToast && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-gray-900 text-white px-6 py-3 rounded-2xl shadow-2xl z-[100] flex items-center gap-3 border border-white/10 backdrop-blur-xl"
          >
            <div className="w-8 h-8 bg-emerald-500 rounded-xl flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-sm">Circular link copied to clipboard!</span>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showApplicationsModal && selectedCircular && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col"
            >
              <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-indigo-600 text-white">
                <div>
                  <h3 className="text-xl font-bold">Applications for {selectedCircular.title}</h3>
                  <p className="text-indigo-100 text-xs mt-1">{applications.filter(app => app.circularId === selectedCircular.id).length} total applications received</p>
                </div>
                <div className="flex items-center gap-3">
                  <button onClick={() => setShowApplicationsModal(false)} className="p-2 hover:bg-white/10 rounded-xl transition-all">
                    <Plus className="w-6 h-6 rotate-45" />
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-6">
                <div className="space-y-4">
                  {applications.filter(app => app.circularId === selectedCircular.id).length === 0 ? (
                    <div className="text-center py-20 text-gray-500">No applications received yet.</div>
                  ) : (
                    applications
                      .filter(app => app.circularId === selectedCircular.id)
                      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                      .map((app) => (
                        <div key={app.id} className="p-6 bg-gray-50 border border-gray-100 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-6 hover:border-indigo-200 transition-all group">
                          <div className="flex items-center gap-4">
                            <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center text-indigo-600 font-black text-xl shadow-sm overflow-hidden border border-gray-100">
                              {app.photoUrl ? (
                                <img src={app.photoUrl} alt={app.applicantName} className="w-full h-full object-cover" />
                              ) : (
                                app.applicantName.charAt(0)
                              )}
                            </div>
                            <div>
                              <button 
                                onClick={() => setSelectedApplication(app)}
                                className="font-bold text-gray-900 hover:text-indigo-600 transition-colors text-left"
                              >
                                {app.applicantName}
                              </button>
                              <div className="flex items-center gap-4 mt-1 text-xs text-gray-500 font-bold">
                                <span className="flex items-center gap-1"><Mail className="w-3 h-3" /> {app.email}</span>
                                <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {app.phone}</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <button 
                              onClick={() => navigate('/messages', { state: { recipientType: 'applicant', recipientId: app.id, recipientName: app.applicantName } })}
                              className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                              title="Message Applicant"
                            >
                              <MessageSquare className="w-4 h-4" />
                            </button>
                            {app.resumeUrl && (
                              <a 
                                href={app.resumeUrl} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="p-2.5 text-gray-400 hover:text-indigo-600 hover:bg-white rounded-xl transition-all border border-transparent hover:border-indigo-100"
                              >
                                <ExternalLink className="w-5 h-5" />
                              </a>
                            )}
                            <select 
                              value={app.status}
                              onChange={async (e) => {
                                try {
                                  await updateDoc(doc(db, 'job_applications', app.id), {
                                    status: e.target.value
                                  });
                                } catch (error) {
                                  handleFirestoreError(error, OperationType.WRITE, 'job_applications');
                                }
                              }}
                              className={cn(
                                "px-4 py-2 text-xs font-black uppercase tracking-widest rounded-xl border outline-none transition-all",
                                app.status === 'shortlisted' ? "bg-emerald-50 text-emerald-600 border-emerald-100" :
                                app.status === 'rejected' ? "bg-rose-50 text-rose-600 border-rose-100" :
                                "bg-white text-gray-600 border-gray-200"
                              )}
                            >
                              <option value="pending">Pending</option>
                              <option value="shortlisted">Shortlisted</option>
                              <option value="rejected">Rejected</option>
                            </select>
                          </div>
                        </div>
                      ))
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedApplication && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col"
            >
              <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-indigo-600 text-white">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center overflow-hidden">
                    {selectedApplication.photoUrl ? (
                      <img src={selectedApplication.photoUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <UserPlus className="w-6 h-6" />
                    )}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">{selectedApplication.applicantName}</h3>
                    <p className="text-indigo-100 text-xs">Application Details</p>
                  </div>
                </div>
                <button onClick={() => setSelectedApplication(null)} className="p-2 hover:bg-white/10 rounded-xl transition-all">
                  <Plus className="w-6 h-6 rotate-45" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-6">
                    <div>
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Personal Information</label>
                      <div className="space-y-4">
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 bg-gray-50 rounded-lg flex items-center justify-center flex-shrink-0">
                            <Mail className="w-4 h-4 text-gray-400" />
                          </div>
                          <div>
                            <p className="text-[10px] font-bold text-gray-400 uppercase">Email</p>
                            <p className="text-sm font-bold text-gray-900">{selectedApplication.email}</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 bg-gray-50 rounded-lg flex items-center justify-center flex-shrink-0">
                            <Phone className="w-4 h-4 text-gray-400" />
                          </div>
                          <div>
                            <p className="text-[10px] font-bold text-gray-400 uppercase">Phone</p>
                            <p className="text-sm font-bold text-gray-900">{selectedApplication.phone}</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 bg-gray-50 rounded-lg flex items-center justify-center flex-shrink-0">
                            <Calendar className="w-4 h-4 text-gray-400" />
                          </div>
                          <div>
                            <p className="text-[10px] font-bold text-gray-400 uppercase">Age</p>
                            <p className="text-sm font-bold text-gray-900">{selectedApplication.age || 'N/A'}</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 bg-gray-50 rounded-lg flex items-center justify-center flex-shrink-0">
                            <MapPin className="w-4 h-4 text-gray-400" />
                          </div>
                          <div>
                            <p className="text-[10px] font-bold text-gray-400 uppercase">Address</p>
                            <p className="text-sm font-bold text-gray-900">{selectedApplication.address || 'N/A'}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-6">
                    <div>
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Other Details</label>
                      <div className="bg-gray-50 rounded-2xl p-4 space-y-4">
                        {Object.entries(selectedApplication.formData || {}).map(([key, value]) => {
                          if (['Full Name', 'Email', 'Phone', 'Age', 'Address', 'photoUrl'].includes(key)) return null;
                          return (
                            <div key={key}>
                              <p className="text-[10px] font-bold text-gray-400 uppercase">{key}</p>
                              <p className="text-sm font-bold text-gray-900">{String(value)}</p>
                            </div>
                          );
                        })}
                        {selectedApplication.resumeUrl && (
                          <div className="pt-4 border-t border-gray-200">
                            <a 
                              href={selectedApplication.resumeUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center justify-center gap-2 w-full py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
                            >
                              <Download className="w-4 h-4" /> View Resume
                            </a>
                          </div>
                        )}
                        {selectedApplication.attachments && selectedApplication.attachments.length > 0 && (
                          <div className="pt-4 border-t border-gray-200 space-y-3">
                            <p className="text-[10px] font-bold text-gray-400 uppercase">Uploaded Files</p>
                            <div className="grid grid-cols-1 gap-2">
                              {selectedApplication.attachments.map((file: any, index: number) => (
                                <button
                                  key={index}
                                  onClick={() => {
                                    const win = window.open();
                                    win?.document.write(`<img src="${file.data}" style="max-width: 100%; height: auto;" />`);
                                  }}
                                  className="flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-xl hover:border-indigo-300 hover:bg-indigo-50 transition-all text-left"
                                >
                                  <div className="w-10 h-10 bg-indigo-50 rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0">
                                    {file.data.startsWith('data:image') ? (
                                      <img src={file.data} className="w-full h-full object-cover" />
                                    ) : (
                                      <Info className="w-5 h-5 text-indigo-500" />
                                    )}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs font-bold text-gray-900 truncate">{file.name}</p>
                                    <p className="text-[10px] text-gray-500">Click to view</p>
                                  </div>
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-gray-900 text-white px-6 py-3 rounded-2xl shadow-2xl z-[100] flex items-center gap-3 border border-white/10 backdrop-blur-xl"
          >
            <div className={cn(
              "w-8 h-8 rounded-xl flex items-center justify-center",
              toast.type === 'success' ? "bg-emerald-500" : "bg-rose-500"
            )}>
              {toast.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-white" /> : <AlertCircle className="w-5 h-5 text-white" />}
            </div>
            <span className="font-bold text-sm">{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={async () => {
          if (!teacherToDelete) return;
          try {
            await deleteDoc(doc(db, 'teachers', teacherToDelete.id));
            setToast({ message: 'Teacher deleted successfully', type: 'success' });
          } catch (error) {
            handleFirestoreError(error, OperationType.DELETE, 'teachers');
          } finally {
            setIsDeleteModalOpen(false);
            setTeacherToDelete(null);
          }
        }}
        title="Delete Teacher"
        message={`Are you sure you want to delete ${teacherToDelete?.name}? This action cannot be undone.`}
        variant="danger"
      />
    </div>
  );
}
