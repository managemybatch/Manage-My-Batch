import React, { useState, useEffect } from 'react';
import { CreditCard, Plus, Search, Filter, Download, CheckCircle2, Clock, Loader2, User, Phone, Calendar, AlertCircle, Send, Wallet, Banknote, Users } from 'lucide-react';
import { Table, TableRow, TableCell } from '../components/Table';
import { cn, formatCurrency, formatDate, formatWhatsAppPhone } from '../lib/utils';
import { collection, onSnapshot, query, addDoc, serverTimestamp, orderBy, writeBatch, doc, where } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { useAuth } from '../lib/auth';
import { Modal } from '../components/Modal';
import { ConfirmModal } from '../components/ConfirmModal';
import { MONTHS } from '../constants';
import { useTranslation } from 'react-i18next';

interface Student {
  id: string;
  name: string;
  rollNo: string;
  guardianPhone: string;
  batchId: string;
  batchName: string;
  monthlyFee: number;
  joinDate: string;
  status: 'active' | 'inactive';
}

interface Batch {
  id: string;
  name: string;
}

interface FeeRecord {
  id: string;
  studentId: string;
  studentName: string;
  amount: number;
  date: string;
  month: string;
  year: number;
  status: 'paid' | 'pending';
  type: 'Monthly Fee' | 'Admission Fee' | 'Other';
  paymentMethod?: 'Cash' | 'bKash';
  bkashNumber?: string;
  transactionId?: string;
}

export function Fees() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [fees, setFees] = useState<FeeRecord[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBatch, setSelectedBatch] = useState('All Batches');
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'dues'>('all');
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reportDates, setReportDates] = useState({ start: '', end: '' });
  const [isSaving, setIsSaving] = useState(false);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [pendingWhatsappUrl, setPendingWhatsappUrl] = useState<string | null>(null);

  const [paymentData, setPaymentData] = useState({
    months: [] as string[],
    method: 'Cash' as 'Cash' | 'bKash',
    bkashNumber: '',
    transactionId: '',
    amount: 0,
  });

  useEffect(() => {
    if (!user) return;

    const instId = user.institutionId || user.uid;
    // Fetch Fees
    const qFees = query(
      collection(db, 'fees'), 
      where('institutionId', '==', instId)
    );
    const unsubFees = onSnapshot(qFees, (snapshot) => {
      const feeData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as FeeRecord[];

      // Sort client-side to avoid index requirements
      const sortedData = feeData.sort((a, b) => {
        const dateA = a.date ? new Date(a.date).getTime() : 0;
        const dateB = b.date ? new Date(b.date).getTime() : 0;
        return dateB - dateA;
      });

      setFees(sortedData);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'fees');
    });

    // Fetch Students
    const qStudents = query(
      collection(db, 'students'),
      where('institutionId', '==', instId)
    );
    const unsubStudents = onSnapshot(qStudents, (snapshot) => {
      const studentData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Student[];
      setStudents(studentData);
      setLoading(false);
    });

    // Fetch Batches
    const qBatches = query(
      collection(db, 'batches'),
      where('institutionId', '==', instId)
    );
    const unsubBatches = onSnapshot(qBatches, (snapshot) => {
      const batchData = snapshot.docs.map(doc => ({
        id: doc.id,
        name: doc.data().name
      })) as Batch[];
      setBatches(batchData);
    });

    return () => {
      unsubFees();
      unsubStudents();
      unsubBatches();
    };
  }, [user]);

  const getStudentDues = (student: Student) => {
    const currentYear = new Date().getFullYear();
    const currentMonthIndex = new Date().getMonth(); // 0-11
    
    // Get join month and year
    const joinDate = new Date(student.joinDate);
    const joinYear = joinDate.getFullYear();
    const joinMonthIndex = joinDate.getMonth();

    // Academic year starts in January, but we only count from join month if it's the same year
    // If they joined in a previous year, we count from January of the current year
    const startMonthIndex = joinYear < currentYear ? 0 : joinMonthIndex;

    const paidMonths = fees
      .filter(f => f.studentId === student.id && f.year === currentYear && f.type === 'Monthly Fee' && f.status === 'paid')
      .map(f => f.month);

    const dueMonths = [];
    for (let i = startMonthIndex; i <= currentMonthIndex; i++) {
      if (!paidMonths.includes(MONTHS[i])) {
        dueMonths.push(MONTHS[i]);
      }
    }
    return dueMonths;
  };

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedStudent || paymentData.months.length === 0) return;

    try {
      setIsSaving(true);
      const batch = writeBatch(db);
      const currentYear = new Date().getFullYear();
      const paymentDate = new Date().toISOString();

      paymentData.months.forEach(month => {
        const feeRef = doc(collection(db, 'fees'));
        batch.set(feeRef, {
          studentId: selectedStudent.id,
          studentName: selectedStudent.name,
          amount: selectedStudent.monthlyFee,
          month,
          year: currentYear,
          date: paymentDate,
          status: 'paid',
          type: 'Monthly Fee',
          paymentMethod: paymentData.method,
          bkashNumber: paymentData.method === 'bKash' ? paymentData.bkashNumber : null,
          transactionId: paymentData.method === 'bKash' ? paymentData.transactionId : null,
          institutionId: user.institutionId || user.uid,
          createdBy: user.uid,
          createdAt: serverTimestamp(),
        });
      });

      await batch.commit();

      // WhatsApp Message
      const totalAmount = selectedStudent.monthlyFee * paymentData.months.length;
      const message = `${t('fees.whatsapp.success')}\n${t('fees.whatsapp.studentName')}: ${selectedStudent.name}\n${t('fees.whatsapp.month')}: ${paymentData.months.join(', ')}\n${t('fees.whatsapp.totalAmount')}: ৳${totalAmount}\n${t('fees.whatsapp.method')}: ${paymentData.method}\n${t('fees.whatsapp.thanks')}`;
      
      const encodedMessage = encodeURIComponent(message);
      const cleanPhone = formatWhatsAppPhone(selectedStudent.guardianPhone);
      const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodedMessage}`;
      
      setPendingWhatsappUrl(whatsappUrl);
      setIsPaymentModalOpen(false);
      setPaymentData({ months: [], method: 'Cash', bkashNumber: '', transactionId: '', amount: 0 });
      setSuccessMessage(t('common.success', { defaultValue: 'Payment recorded successfully!' }));
      setIsSuccessModalOpen(true);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'fees');
    } finally {
      setIsSaving(false);
    }
  };

  const downloadReport = (type: 'daily' | 'monthly' | 'custom', startDate?: string, endDate?: string) => {
    let filtered = fees.filter(f => f.status === 'paid');
    const now = new Date();
    
    if (type === 'daily') {
      const today = now.toISOString().split('T')[0];
      filtered = filtered.filter(f => f.date.startsWith(today));
    } else if (type === 'monthly') {
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();
      filtered = filtered.filter(f => f.month === MONTHS[currentMonth] && f.year === currentYear);
    } else if (type === 'custom' && startDate && endDate) {
      filtered = filtered.filter(f => f.date >= startDate && f.date <= endDate);
    }

    const csvContent = [
      ['Student Name', 'Month', 'Year', 'Amount', 'Date', 'Method', 'Transaction ID'],
      ...filtered.map(f => [
        f.studentName,
        f.month,
        f.year,
        f.amount,
        f.date.split('T')[0],
        f.paymentMethod || 'N/A',
        f.transactionId || 'N/A'
      ])
    ].map(e => e.join(",")).join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `fee_report_${type}_${new Date().getTime()}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredStudents = students.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         s.rollNo.includes(searchTerm) || 
                         s.guardianPhone.includes(searchTerm);
    const matchesBatch = selectedBatch === t('fees.allBatches') || s.batchId === selectedBatch;
    const dues = getStudentDues(s);
    const matchesTab = activeTab === 'all' || dues.length > 0;
    return matchesSearch && matchesBatch && matchesTab && s.status === 'active';
  });

  const totalCollected = fees.filter(f => f.status === 'paid').reduce((sum, f) => sum + f.amount, 0);
  const studentsWithDues = students.filter(s => getStudentDues(s).length > 0 && s.status === 'active');

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">{t('fees.title')}</h1>
          <p className="text-gray-500 mt-1">{t('fees.subtitle')}</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-emerald-50 px-4 py-2 rounded-xl border border-emerald-100">
            <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">{t('fees.totalCollected')}</p>
            <p className="text-xl font-black text-emerald-700">{formatCurrency(totalCollected)}</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 bg-white p-1.5 rounded-2xl border border-gray-100 shadow-sm w-fit">
        <button
          onClick={() => setActiveTab('all')}
          className={cn(
            "px-6 py-2.5 text-sm font-bold rounded-xl transition-all flex items-center gap-2",
            activeTab === 'all' ? "bg-indigo-600 text-white shadow-lg shadow-indigo-100" : "text-gray-500 hover:bg-gray-50"
          )}
        >
          <Users className="w-4 h-4" /> {t('fees.allStudents')}
        </button>
        <button
          onClick={() => setActiveTab('dues')}
          className={cn(
            "px-6 py-2.5 text-sm font-bold rounded-xl transition-all flex items-center gap-2",
            activeTab === 'dues' ? "bg-rose-600 text-white shadow-lg shadow-rose-100" : "text-gray-500 hover:bg-gray-50"
          )}
        >
          <AlertCircle className="w-4 h-4" /> {t('fees.dueList')}
          {studentsWithDues.length > 0 && (
            <span className={cn(
              "px-2 py-0.5 rounded-full text-[10px] font-black",
              activeTab === 'dues' ? "bg-white text-rose-600" : "bg-rose-100 text-rose-600"
            )}>
              {studentsWithDues.length}
            </span>
          )}
        </button>
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
        <div className="relative w-full md:w-96 group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 group-focus-within:text-indigo-500 transition-colors" />
          <input
            type="text"
            placeholder={t('fees.searchPlaceholder')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
          />
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto">
          <select 
            value={selectedBatch}
            onChange={(e) => setSelectedBatch(e.target.value)}
            className="flex-1 md:flex-none px-4 py-2.5 text-sm font-medium text-gray-600 border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
          >
            <option>{t('fees.allBatches')}</option>
            {batches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
          {user?.role !== 'staff' && (
            <div className="flex items-center gap-1 bg-gray-50 dark:bg-gray-900/50 p-1 rounded-xl border border-gray-200 dark:border-gray-800">
              <button 
                onClick={() => downloadReport('daily')}
                className="px-3 py-1.5 text-[10px] font-black text-gray-600 dark:text-gray-400 hover:bg-white dark:hover:bg-gray-800 hover:text-indigo-600 rounded-lg transition-all"
                title={t('fees.daily')}
              >
                {t('fees.daily')}
              </button>
              <button 
                onClick={() => downloadReport('monthly')}
                className="px-3 py-1.5 text-[10px] font-black text-gray-600 dark:text-gray-400 hover:bg-white dark:hover:bg-gray-800 hover:text-indigo-600 rounded-lg transition-all"
                title={t('fees.monthly')}
              >
                {t('fees.monthly')}
              </button>
              <button 
                onClick={() => setIsReportModalOpen(true)}
                className="px-3 py-1.5 text-[10px] font-black text-gray-600 dark:text-gray-400 hover:bg-white dark:hover:bg-gray-800 hover:text-indigo-600 rounded-lg transition-all"
                title={t('fees.custom')}
              >
                {t('fees.custom')}
              </button>
            </div>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
        </div>
      ) : (
        <Table headers={[
          t('fees.table.studentInfo'),
          t('fees.table.batch'),
          t('fees.table.monthlyFee'),
          t('fees.table.status'),
          t('fees.table.pendingMonths'),
          t('fees.table.actions')
        ]}>
          {filteredStudents.map((student) => {
            const dues = getStudentDues(student);
            return (
              <TableRow key={student.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 font-bold text-sm">
                      {student.name.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div>
                      <p className="font-bold text-gray-900">{student.name}</p>
                      <p className="text-xs text-gray-500">{t('students.rollNo')}: {student.rollNo} • {student.guardianPhone}</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <span className="font-medium text-gray-700">{student.batchName}</span>
                </TableCell>
                <TableCell>
                  <span className="font-black text-gray-900">৳{student.monthlyFee}</span>
                </TableCell>
                <TableCell>
                  <span className={cn(
                    "px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest",
                    dues.length === 0 ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
                  )}>
                    {dues.length === 0 ? t('fees.status.paid') : t('fees.status.duesPending')}
                  </span>
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1 max-w-[200px]">
                    {dues.length > 0 ? (
                      dues.map(m => (
                        <span key={m} className="px-1.5 py-0.5 bg-rose-50 text-rose-600 text-[10px] font-bold rounded border border-rose-100">
                          {t(`common.months.${m}`)}
                        </span>
                      ))
                    ) : (
                      <span className="text-[10px] text-emerald-600 font-bold italic">{t('fees.status.allClear')}</span>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <button 
                    onClick={() => {
                      setSelectedStudent(student);
                      setPaymentData({ ...paymentData, months: dues });
                      setIsPaymentModalOpen(true);
                    }}
                    className="flex items-center gap-2 px-3 py-1.5 text-xs font-black text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-all shadow-sm"
                  >
                    <CreditCard className="w-3.5 h-3.5" /> {t('fees.collectFee')}
                  </button>
                </TableCell>
              </TableRow>
            );
          })}
        </Table>
      )}

      {/* Payment Modal */}
      <Modal 
        isOpen={isPaymentModalOpen} 
        onClose={() => setIsPaymentModalOpen(false)} 
        title={t('fees.paymentModal.title')}
        maxWidth="max-w-xl"
      >
        {selectedStudent && (
          <form onSubmit={handlePayment} className="space-y-6">
            <div className="bg-indigo-50 p-4 rounded-2xl border border-indigo-100 flex items-center gap-4">
              <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-indigo-600 shadow-sm">
                <User className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-black text-indigo-900">{selectedStudent.name}</p>
                <p className="text-xs text-indigo-600 font-medium">{selectedStudent.batchName} • {t('students.rollNo')}: {selectedStudent.rollNo}</p>
              </div>
              <div className="ml-auto text-right">
                <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">{t('fees.table.monthlyFee')}</p>
                <p className="text-lg font-black text-indigo-700">৳{selectedStudent.monthlyFee}</p>
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-xs font-black text-gray-500 uppercase tracking-widest">{t('fees.paymentModal.selectMonths')}</label>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {MONTHS.map((month, idx) => {
                  const isPaid = fees.some(f => f.studentId === selectedStudent.id && f.month === month && f.year === new Date().getFullYear() && f.status === 'paid');
                  const isSelected = paymentData.months.includes(month);
                  
                  return (
                    <button
                      key={month}
                      type="button"
                      disabled={isPaid}
                      onClick={() => {
                        if (isSelected) {
                          setPaymentData({ ...paymentData, months: paymentData.months.filter(m => m !== month) });
                        } else {
                          setPaymentData({ ...paymentData, months: [...paymentData.months, month] });
                        }
                      }}
                      className={cn(
                        "py-2 px-1 rounded-xl text-[10px] font-black transition-all border",
                        isPaid ? "bg-gray-50 text-gray-300 border-gray-100 cursor-not-allowed" :
                        isSelected ? "bg-indigo-600 text-white border-indigo-600 shadow-md" :
                        "bg-white text-gray-600 border-gray-200 hover:border-indigo-300"
                      )}
                    >
                      {t(`common.months.${month}`)}
                      {isPaid && <CheckCircle2 className="w-3 h-3 mx-auto mt-1" />}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-xs font-black text-gray-500 uppercase tracking-widest">{t('fees.paymentModal.paymentMethod')}</label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setPaymentData({ ...paymentData, method: 'Cash' })}
                  className={cn(
                    "flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-black transition-all border",
                    paymentData.method === 'Cash' ? "bg-emerald-50 text-emerald-700 border-emerald-200 shadow-sm" : "bg-white text-gray-500 border-gray-100"
                  )}
                >
                  <Banknote className="w-4 h-4" /> {t('fees.paymentModal.cash')}
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentData({ ...paymentData, method: 'bKash' })}
                  className={cn(
                    "flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-black transition-all border",
                    paymentData.method === 'bKash' ? "bg-pink-50 text-pink-700 border-pink-200 shadow-sm" : "bg-white text-gray-500 border-gray-100"
                  )}
                >
                  <Wallet className="w-4 h-4" /> {t('fees.paymentModal.bkash')}
                </button>
              </div>
            </div>

            {paymentData.method === 'bKash' && (
              <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2">
                <div className="space-y-2">
                  <label className="text-xs font-black text-gray-500 uppercase tracking-widest">{t('fees.paymentModal.bkashNumber')}</label>
                  <input
                    type="text"
                    placeholder="017XXXXXXXX"
                    value={paymentData.bkashNumber}
                    onChange={e => setPaymentData({ ...paymentData, bkashNumber: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-gray-500 uppercase tracking-widest">{t('fees.paymentModal.transactionId')}</label>
                  <input
                    type="text"
                    placeholder="TRX123456"
                    value={paymentData.transactionId}
                    onChange={e => setPaymentData({ ...paymentData, transactionId: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 transition-all"
                  />
                </div>
              </div>
            )}

            <div className="pt-4 border-t border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-bold text-gray-500">{t('fees.paymentModal.totalAmount')}:</span>
                <span className="text-2xl font-black text-gray-900">৳{selectedStudent.monthlyFee * paymentData.months.length}</span>
              </div>
              <button
                type="submit"
                disabled={paymentData.months.length === 0}
                className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <Send className="w-5 h-5" /> {t('fees.paymentModal.confirm')}
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Custom Report Modal */}
      <Modal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        title={t('fees.reportModal.title')}
        maxWidth="max-w-md"
      >
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-black text-gray-500 uppercase tracking-widest">{t('fees.reportModal.startDate')}</label>
              <input
                type="date"
                value={reportDates.start}
                onChange={e => setReportDates({ ...reportDates, start: e.target.value })}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black text-gray-500 uppercase tracking-widest">{t('fees.reportModal.endDate')}</label>
              <input
                type="date"
                value={reportDates.end}
                onChange={e => setReportDates({ ...reportDates, end: e.target.value })}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
              />
            </div>
          </div>
          <button
            onClick={() => {
              if (!reportDates.start || !reportDates.end) {
                setSuccessMessage(t('common.error', { defaultValue: 'Please select both start and end dates' }));
                setIsSuccessModalOpen(true);
                return;
              }
              downloadReport('custom', reportDates.start, reportDates.end);
              setIsReportModalOpen(false);
            }}
            className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 flex items-center justify-center gap-2"
          >
            <Download className="w-5 h-5" /> {t('fees.reportModal.download')}
          </button>
        </div>
      </Modal>

      <ConfirmModal
        isOpen={isSuccessModalOpen}
        onClose={() => {
          setIsSuccessModalOpen(false);
          setPendingWhatsappUrl(null);
        }}
        onConfirm={() => {
          if (pendingWhatsappUrl) {
            window.open(pendingWhatsappUrl, '_blank');
          }
          setIsSuccessModalOpen(false);
          setPendingWhatsappUrl(null);
        }}
        title={t('common.success', { defaultValue: 'Success' })}
        message={successMessage}
        variant="info"
        confirmText={pendingWhatsappUrl ? t('common.sendWhatsApp', { defaultValue: 'Send WhatsApp' }) : t('common.ok', { defaultValue: 'OK' })}
        cancelText={pendingWhatsappUrl ? t('common.done', { defaultValue: 'Done' }) : undefined}
      />
    </div>
  );
}
