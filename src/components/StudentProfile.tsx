import React, { useState, useEffect } from 'react';
import { Modal } from './Modal';
import { cn, formatCurrency, formatDate } from '../lib/utils';
import { Edit2, Phone, Mail, MapPin, Calendar, CreditCard, User, Shield, Briefcase, MessageSquare, Loader2, ClipboardCheck, GraduationCap, TrendingUp, AlertCircle, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, query, where, orderBy, getDocs, onSnapshot } from 'firebase/firestore';
import { useAuth } from '../lib/auth';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';

interface FeeRecord {
  id: string;
  studentId: string;
  studentName: string;
  amount: number;
  month: string;
  year: number;
  date: string;
  status: 'paid' | 'pending';
  type: 'Monthly Fee' | 'Admission Fee';
  paymentMethod?: string;
  bkashNumber?: string;
  transactionId?: string;
  institutionId: string;
  createdBy: string;
  createdAt: any;
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

interface Student {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  guardianPhone: string;
  guardianName?: string;
  fatherName?: string;
  motherName?: string;
  rollNo: string;
  dateOfBirth?: string;
  birthCertificateNo?: string;
  nidNumber?: string;
  address?: string;
  photoUrl?: string;
  grade?: string;
  section?: string;
  batchId: string;
  batchName: string;
  joinDate: string;
  monthlyFee: number;
  subjectGroup?: string;
  feeType?: string;
  status: 'active' | 'inactive';
}

interface StudentProfileProps {
  isOpen: boolean;
  onClose: () => void;
  student: Student | null;
  onEdit?: (student: Student) => void;
}

export function StudentProfile({ isOpen, onClose, student, onEdit }: StudentProfileProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'payments' | 'attendance' | 'exams' | 'contact'>('overview');
  const [paymentHistory, setPaymentHistory] = useState<any[]>([]);
  const [attendanceHistory, setAttendanceHistory] = useState<any[]>([]);
  const [examResults, setExamResults] = useState<any[]>([]);
  const [loadingStats, setLoadingStats] = useState(false);
  const [dueMonths, setDueMonths] = useState<string[]>([]);

  useEffect(() => {
    if (!student || !isOpen) return;

    setLoadingStats(true);
    const instId = user.institutionId || user.uid;

    const fetchFees = async () => {
      try {
        const q = query(
          collection(db, 'fees'),
          where('studentId', '==', student.id),
          orderBy('createdAt', 'desc')
        );
        const querySnapshot = await getDocs(q);
        const history = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as FeeRecord[];
        setPaymentHistory(history);

        // Calculate Dues
        const currentYear = new Date().getFullYear();
        const currentMonthIndex = new Date().getMonth();
        const joinDate = new Date(student.joinDate);
        const joinYear = joinDate.getFullYear();
        const joinMonthIndex = joinDate.getMonth();
        const startMonthIndex = joinYear < currentYear ? 0 : joinMonthIndex;

        const paidMonths = history
          .filter(f => f.year === currentYear && f.type === 'Monthly Fee' && f.status === 'paid')
          .map(f => f.month);

        const dues = [];
        for (let i = startMonthIndex; i <= currentMonthIndex; i++) {
          if (!paidMonths.includes(MONTHS[i])) {
            dues.push(MONTHS[i]);
          }
        }
        setDueMonths(dues);
      } catch (error) {
        console.error("Error fetching fees:", error);
      }
    };

    const fetchAttendance = async () => {
      try {
        const q = query(
          collection(db, 'attendance'),
          where('institutionId', '==', instId),
          where('studentId', '==', student.id),
          orderBy('date', 'desc')
        );
        const querySnapshot = await getDocs(q);
        setAttendanceHistory(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch (error) {
        console.error("Error fetching attendance:", error);
      }
    };

    const fetchExams = async () => {
      try {
        const q = query(
          collection(db, 'offline_exams'),
          where('batchId', '==', student.batchId),
          orderBy('createdAt', 'desc')
        );
        const querySnapshot = await getDocs(q);
        
        const results = querySnapshot.docs.map((doc) => {
          const exam = doc.data();
          const studentMarks = exam.studentMarks?.[student.id];
          const attended = !!studentMarks;
          
          let totalObtained = 0;
          let subjectsResults: any[] = [];
          
          if (attended) {
            Object.entries(studentMarks).forEach(([subject, marks]: [string, any]) => {
              totalObtained += Number(marks);
              subjectsResults.push({ name: subject, marks });
            });
          }

          return {
            id: doc.id,
            ...exam,
            attended,
            totalObtained,
            subjectsResults
          };
        });

        setExamResults(results);
      } catch (error) {
        console.error("Error fetching exams:", error);
      } finally {
        setLoadingStats(false);
      }
    };

    fetchFees();
    fetchAttendance();
    fetchExams();

    const unsubFees = onSnapshot(
      query(collection(db, 'fees'), where('studentId', '==', student.id), orderBy('createdAt', 'desc')),
      (snapshot) => {
        const history = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as FeeRecord[];
        setPaymentHistory(history);
      }
    );

    const unsubAtt = onSnapshot(
      query(collection(db, 'attendance'), where('institutionId', '==', instId), where('studentId', '==', student.id), orderBy('date', 'desc')),
      (snapshot) => {
        setAttendanceHistory(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      }
    );

    const unsubExams = onSnapshot(
      query(collection(db, 'offline_exams'), where('batchId', '==', student.batchId), orderBy('createdAt', 'desc')),
      (snapshot) => {
        const results = snapshot.docs.map((doc) => {
          const exam = doc.data();
          const studentMarks = exam.studentMarks?.[student.id];
          const attended = !!studentMarks;
          
          let totalObtained = 0;
          let subjectsResults: any[] = [];
          
          if (attended) {
            Object.entries(studentMarks).forEach(([subject, marks]: [string, any]) => {
              totalObtained += Number(marks);
              subjectsResults.push({ name: subject, marks });
            });
          }

          return {
            id: doc.id,
            ...exam,
            attended,
            totalObtained,
            subjectsResults
          };
        });
        setExamResults(results);
      }
    );

    return () => {
      unsubFees();
      unsubAtt();
      unsubExams();
    };
  }, [student, isOpen]);

  if (!student) return null;

  const totalPaid = paymentHistory.reduce((sum, p) => sum + (p.amount || 0), 0);
  const monthsPaid = paymentHistory.filter(p => p.type === 'Monthly Fee').length;

  // Attendance Stats
  const totalDays = attendanceHistory.length;
  const presentDays = attendanceHistory.filter(a => a.status === 'present').length;
  const attendanceRatio = totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 0;

  // Exam Stats
  const examsAttended = examResults.filter(e => e.attended).length;
  const examsSkipped = examResults.filter(e => !e.attended && e.status === 'completed').length;

  const tabs = [
    { id: 'overview', label: t('studentProfile.tabs.overview'), icon: User },
    { id: 'attendance', label: t('Attendance'), icon: ClipboardCheck },
    { id: 'exams', label: t('Exams'), icon: GraduationCap },
    { id: 'payments', label: t('studentProfile.tabs.payments'), icon: CreditCard },
    { id: 'contact', label: t('studentProfile.tabs.contact'), icon: Phone },
  ];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="" maxWidth="max-w-2xl">
      <div className="-mt-6 -mx-6 overflow-hidden rounded-t-2xl">
        {/* Header Section */}
        <div className="bg-emerald-600 p-8 text-white relative">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-6">
              <div className="w-24 h-24 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center border-2 border-white/30 overflow-hidden shadow-xl">
                {student.photoUrl ? (
                  <img 
                    src={student.photoUrl} 
                    alt={student.name} 
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <span className="text-4xl font-bold">{student.name[0]}</span>
                )}
              </div>
              <div className="space-y-1">
                <h2 className="text-3xl font-bold tracking-tight">{student.name}</h2>
                <p className="text-emerald-100 font-medium">{t('studentProfile.info.rollNo')} #{student.rollNo} • {student.batchName}</p>
                <div className="flex items-center gap-2 mt-2">
                  <span className="w-3 h-3 rounded-full bg-yellow-400 border-2 border-white shadow-sm" />
                  <span className="px-2 py-0.5 bg-white/20 backdrop-blur-sm rounded-full text-[10px] font-bold uppercase tracking-wider border border-white/20">
                    {student.feeType || 'Full Fee'}
                  </span>
                </div>
              </div>
            </div>
            <button 
              onClick={() => onEdit?.(student)}
              className="p-2 bg-white/10 hover:bg-white/20 rounded-xl transition-all border border-white/10 shadow-lg"
            >
              <Edit2 className="w-5 h-5" />
            </button>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-8">
            <div className="bg-black/10 backdrop-blur-md p-3 rounded-2xl border border-white/10 relative overflow-hidden group">
              <p className="text-[9px] font-bold text-emerald-200 uppercase tracking-widest relative z-10">{t('Attendance')}</p>
              <p className="text-lg font-bold mt-1 relative z-10">
                {loadingStats ? <Loader2 className="w-4 h-4 animate-spin" /> : `${attendanceRatio}%`}
              </p>
              <div className="absolute -right-2 -bottom-2 w-10 h-10 text-white/5 group-hover:text-white/10 transition-all rotate-12">
                <ClipboardCheck className="w-full h-full" />
              </div>
            </div>
            <div className="bg-black/10 backdrop-blur-md p-3 rounded-2xl border border-white/10 relative overflow-hidden group">
              <p className="text-[9px] font-bold text-emerald-200 uppercase tracking-widest relative z-10">{t('Exams')}</p>
              <p className="text-lg font-bold mt-1 relative z-10">
                {loadingStats ? <Loader2 className="w-4 h-4 animate-spin" /> : `${examsAttended}/${examResults.length}`}
              </p>
              <div className="absolute -right-2 -bottom-2 w-10 h-10 text-white/5 group-hover:text-white/10 transition-all rotate-12">
                <GraduationCap className="w-full h-full" />
              </div>
            </div>
            <div className="bg-black/10 backdrop-blur-md p-3 rounded-2xl border border-white/10 relative overflow-hidden group">
              <p className="text-[9px] font-bold text-emerald-200 uppercase tracking-widest relative z-10">{t('studentProfile.stats.totalPaid')}</p>
              <p className="text-lg font-bold mt-1 relative z-10">
                {loadingStats ? <Loader2 className="w-4 h-4 animate-spin" /> : formatCurrency(totalPaid)}
              </p>
              <div className="absolute -right-2 -bottom-2 w-10 h-10 text-white/5 group-hover:text-white/10 transition-all rotate-12">
                <CreditCard className="w-full h-full" />
              </div>
            </div>
            <div className="bg-black/10 backdrop-blur-md p-3 rounded-2xl border border-white/10 relative overflow-hidden group">
              <p className="text-[9px] font-bold text-emerald-200 uppercase tracking-widest relative z-10">{t('studentProfile.stats.monthlyFee')}</p>
              <p className="text-lg font-bold mt-1 relative z-10">{formatCurrency(student.monthlyFee)}</p>
              <div className="absolute -right-2 -bottom-2 w-10 h-10 text-white/5 group-hover:text-white/10 transition-all rotate-12">
                <Shield className="w-full h-full" />
              </div>
            </div>
          </div>
        </div>

        {/* Tabs Navigation */}
        <div className="bg-white border-b border-gray-100 px-4 overflow-x-auto scrollbar-hide">
          <div className="flex items-center gap-4 min-w-max">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={cn(
                  "flex items-center gap-2 py-4 px-2 text-[10px] font-bold tracking-widest transition-all relative whitespace-nowrap uppercase",
                  activeTab === tab.id ? "text-emerald-600" : "text-gray-400 hover:text-gray-600"
                )}
              >
                <tab.icon className="w-3.5 h-3.5" />
                {tab.label}
                {activeTab === tab.id && (
                  <motion.div 
                    layoutId="activeTab"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-600 rounded-full"
                  />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Content Area */}
        <div className="p-6 bg-gray-50/50 min-h-[400px]">
          <AnimatePresence mode="wait">
            {activeTab === 'overview' && (
              <motion.div
                key="overview"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                {/* Performance Summary */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{t('Attendance Trend')}</h4>
                      <TrendingUp className="w-4 h-4 text-emerald-500" />
                    </div>
                    <div className="flex items-end gap-1 h-24">
                      {attendanceHistory.slice(0, 7).reverse().map((record, idx) => (
                        <div 
                          key={idx}
                          className={cn(
                            "flex-1 rounded-t-lg transition-all",
                            record.status === 'present' ? "bg-emerald-500 h-full" :
                            record.status === 'late' ? "bg-amber-500 h-2/3" : "bg-red-500 h-1/4"
                          )}
                          title={`${formatDate(record.date)}: ${record.status}`}
                        />
                      ))}
                      {attendanceHistory.length === 0 && (
                        <div className="w-full h-full flex items-center justify-center text-[10px] text-gray-400 italic">
                          No data
                        </div>
                      )}
                    </div>
                    <div className="flex justify-between text-[8px] font-bold text-gray-400 uppercase tracking-tighter">
                      <span>{t('Older')}</span>
                      <span>{t('Recent')}</span>
                    </div>
                  </div>

                  <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{t('Exam Performance')}</h4>
                      <GraduationCap className="w-4 h-4 text-indigo-500" />
                    </div>
                    <div className="h-24">
                      {examResults.filter(e => e.attended).length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={examResults.filter(e => e.attended).slice(0, 5).reverse()}>
                            <Bar dataKey="totalObtained" radius={[4, 4, 0, 0]}>
                              {examResults.filter(e => e.attended).slice(0, 5).reverse().map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.totalObtained / (entry.totalMarks || 100) >= 0.8 ? '#10b981' : '#6366f1'} />
                              ))}
                            </Bar>
                            <Tooltip 
                              content={({ active, payload }) => {
                                if (active && payload && payload.length) {
                                  return (
                                    <div className="bg-white p-2 border border-gray-100 rounded-lg shadow-xl text-[10px] font-bold">
                                      <p className="text-gray-900">{payload[0].payload.title}</p>
                                      <p className="text-indigo-600">{payload[0].value} Marks</p>
                                    </div>
                                  );
                                }
                                return null;
                              }}
                            />
                          </BarChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[10px] text-gray-400 italic">
                          No exam data
                        </div>
                      )}
                    </div>
                    <div className="flex justify-between text-[8px] font-bold text-gray-400 uppercase tracking-tighter">
                      <span>{t('Prev')}</span>
                      <span>{t('Latest')}</span>
                    </div>
                  </div>
                </div>

                {/* Financial Status */}
                <div className={cn(
                  "p-4 rounded-2xl border flex items-center justify-between",
                  dueMonths.length > 0 
                    ? "bg-rose-50 border-rose-100 text-rose-700" 
                    : "bg-emerald-50 border-emerald-100 text-emerald-700"
                )}>
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center shadow-sm",
                      dueMonths.length > 0 ? "bg-rose-100 text-rose-600" : "bg-emerald-100 text-emerald-600"
                    )}>
                      <CreditCard className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest opacity-70">{t('Financial Status')}</p>
                      <p className="text-sm font-bold">
                        {dueMonths.length > 0 
                          ? `${dueMonths.length} ${t('Months Due')}: ${dueMonths.join(', ')}`
                          : t('All Fees Paid')}
                      </p>
                    </div>
                  </div>
                  {dueMonths.length > 0 && (
                    <AlertCircle className="w-5 h-5 animate-pulse" />
                  )}
                </div>

                <div className="space-y-1">
                  <DetailRow label={t('studentProfile.info.fatherName')} value={student.fatherName} />
                  <DetailRow label={t('studentProfile.info.motherName')} value={student.motherName} />
                  <DetailRow label={t('studentProfile.info.dob')} value={student.dateOfBirth ? formatDate(student.dateOfBirth) : '—'} />
                  <DetailRow label={t('studentProfile.info.birthCert')} value={student.birthCertificateNo} />
                  <DetailRow label={t('studentProfile.info.nid')} value={student.nidNumber} />
                  <DetailRow label={t('studentProfile.info.section')} value={student.section} />
                  <DetailRow label={t('studentProfile.info.joinDate')} value={student.joinDate ? formatDate(student.joinDate) : '—'} />
                  <DetailRow label={t('studentProfile.info.address')} value={student.address} />
                </div>
              </motion.div>
            )}

            {activeTab === 'attendance' && (
              <motion.div
                key="attendance"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm text-center">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">{t('Present')}</p>
                    <p className="text-xl font-black text-emerald-600">{presentDays}</p>
                  </div>
                  <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm text-center">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">{t('Absent')}</p>
                    <p className="text-xl font-black text-red-600">{attendanceHistory.filter(a => a.status === 'absent').length}</p>
                  </div>
                  <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm text-center">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">{t('Late')}</p>
                    <p className="text-xl font-black text-amber-600">{attendanceHistory.filter(a => a.status === 'late').length}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest px-1">{t('Recent Attendance')}</h4>
                  {attendanceHistory.length > 0 ? (
                    attendanceHistory.slice(0, 10).map((record) => (
                      <div key={record.id} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "w-8 h-8 rounded-lg flex items-center justify-center",
                            record.status === 'present' ? "bg-emerald-50 text-emerald-600" :
                            record.status === 'absent' ? "bg-red-50 text-red-600" : "bg-amber-50 text-amber-600"
                          )}>
                            {record.status === 'present' ? <CheckCircle2 className="w-4 h-4" /> :
                             record.status === 'absent' ? <XCircle className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                          </div>
                          <span className="text-sm font-bold text-gray-900">{formatDate(record.date)}</span>
                        </div>
                        <span className={cn(
                          "text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-widest",
                          record.status === 'present' ? "bg-emerald-50 text-emerald-600" :
                          record.status === 'absent' ? "bg-red-50 text-red-600" : "bg-amber-50 text-amber-600"
                        )}>
                          {record.status}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-12 text-gray-400">
                      <ClipboardCheck className="w-12 h-12 mx-auto mb-4 opacity-20" />
                      <p className="text-xs font-bold uppercase tracking-widest">{t('No attendance records found')}</p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {activeTab === 'exams' && (
              <motion.div
                key="exams"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-4"
              >
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-3">
                    <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{t('Attended')}</p>
                      <p className="text-lg font-black text-gray-900">{examsAttended}</p>
                    </div>
                  </div>
                  <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-3">
                    <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center text-red-600">
                      <AlertCircle className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{t('Skipped')}</p>
                      <p className="text-lg font-black text-gray-900">{examsSkipped}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  {examResults.length > 0 ? (
                    examResults.map((exam) => (
                      <div key={exam.id} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm space-y-3 group hover:border-indigo-200 transition-all">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              "w-10 h-10 rounded-xl flex items-center justify-center",
                              exam.attended ? "bg-indigo-50 text-indigo-600" : "bg-gray-50 text-gray-400"
                            )}>
                              <GraduationCap className="w-5 h-5" />
                            </div>
                            <div>
                              <p className="text-sm font-bold text-gray-900">{exam.title}</p>
                              <p className="text-[10px] text-gray-500 font-medium uppercase tracking-wider">
                                {exam.date ? formatDate(exam.date) : '—'}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            {exam.attended ? (
                              <>
                                <p className="text-sm font-black text-indigo-600">{exam.totalObtained} / {exam.totalMarks || 100}</p>
                                <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full uppercase tracking-widest">
                                  {Math.round((exam.totalObtained / (exam.totalMarks || 100)) * 100)}%
                                </span>
                              </>
                            ) : (
                              <span className="text-[10px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full uppercase tracking-widest">
                                {exam.status === 'completed' ? t('Skipped') : t('Upcoming')}
                              </span>
                            )}
                          </div>
                        </div>
                        
                        {exam.attended && exam.subjectsResults.length > 0 && (
                          <div className="pt-3 border-t border-gray-50 grid grid-cols-2 gap-2">
                            {exam.subjectsResults.map((sub: any, idx: number) => (
                              <div key={idx} className="flex items-center justify-between text-[10px] bg-gray-50/50 p-2 rounded-lg">
                                <span className="text-gray-500 font-bold uppercase tracking-wider">{sub.name}</span>
                                <span className="text-gray-900 font-black">{sub.marks}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-12 text-gray-400">
                      <GraduationCap className="w-12 h-12 mx-auto mb-4 opacity-20" />
                      <p className="text-xs font-bold uppercase tracking-widest">{t('No exam results found')}</p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {activeTab === 'contact' && (
              <motion.div
                key="contact"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-4"
              >
                <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
                      <Phone className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{t('studentProfile.info.guardianPhone')}</p>
                      <p className="font-bold text-gray-900">{student.guardianPhone}</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => window.open(`https://wa.me/${student.guardianPhone}`, '_blank')}
                    className="p-2 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-100 transition-all"
                  >
                    <MessageSquare className="w-5 h-5" />
                  </button>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
                  <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
                    <Mail className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{t('common.email', { defaultValue: 'Email Address' })}</p>
                    <p className="font-bold text-gray-900">{student.email || '—'}</p>
                  </div>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
                  <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{t('studentProfile.info.address')}</p>
                    <p className="font-bold text-gray-900">{student.address || '—'}</p>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'payments' && (
              <motion.div
                key="payments"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-3"
              >
                {paymentHistory.length > 0 ? (
                  paymentHistory.map((payment) => (
                    <div key={payment.id} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between group hover:border-indigo-200 transition-all">
                      <div className="flex items-center gap-4">
                        <div className={cn(
                          "w-10 h-10 rounded-xl flex items-center justify-center",
                          payment.type === 'Admission Fee' ? "bg-amber-50 text-amber-600" : "bg-emerald-50 text-emerald-600"
                        )}>
                          <CreditCard className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-gray-900">{payment.type}</p>
                          <p className="text-[10px] text-gray-500 font-medium uppercase tracking-wider">
                            {payment.month} {payment.year} • {payment.date ? formatDate(payment.date) : '—'}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-black text-gray-900">{formatCurrency(payment.amount)}</p>
                        <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full uppercase tracking-widest">
                          {payment.status}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                    <CreditCard className="w-12 h-12 mb-4 opacity-20" />
                    <p className="font-bold uppercase tracking-widest text-xs">{t('fees.noHistory', { defaultValue: 'No payment history found' })}</p>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </Modal>
  );
}

function DetailRow({ label, value }: { label: string, value?: string | number }) {
  return (
    <div className="flex items-center justify-between py-4 border-b border-gray-100 last:border-0">
      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{label}</span>
      <span className="font-bold text-gray-900">{value || '—'}</span>
    </div>
  );
}
