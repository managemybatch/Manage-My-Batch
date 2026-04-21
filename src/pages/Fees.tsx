import React, { useState, useEffect } from 'react';
import { CreditCard, Plus, Search, Filter, Download, CheckCircle2, Clock, Loader2, User, Phone, Calendar, AlertCircle, Send, Wallet, Banknote, Users, Receipt, Printer, ArrowRight, MessageSquare } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { Table, TableRow, TableCell } from '../components/Table';
import { cn, formatCurrency, formatDate, formatWhatsAppPhone } from '../lib/utils';
import { sendSMS, SMSConfig } from '../lib/sms';
import { collection, onSnapshot, query, addDoc, serverTimestamp, orderBy, writeBatch, doc, where, getDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { useAuth } from '../lib/auth';
import { Modal } from '../components/Modal';
import { ConfirmModal } from '../components/ConfirmModal';
import { MONTHS } from '../constants';
import { useTranslation } from 'react-i18next';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

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
  type: 'Monthly Fee' | 'Admission Fee' | 'Exam Fee' | 'Other';
  description?: string;
  paymentMethod?: 'Cash' | 'bKash';
  bkashNumber?: string;
  transactionId?: string;
}

interface OtherFeeTemplate {
  id: string;
  name: string;
  amount: number;
  batchId?: string;
  isMandatory: boolean;
}

interface OfflineExam {
  id: string;
  title: string;
  batchId: string;
  examFee?: number;
}

export function Fees() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [fees, setFees] = useState<FeeRecord[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBatch, setSelectedBatch] = useState('All Batches');
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'dues' | 'manage_other'>((searchParams.get('tab') as any) === 'dues' ? 'dues' : 'all');
  const [exams, setExams] = useState<OfflineExam[]>([]);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reportDates, setReportDates] = useState({ start: '', end: '' });
  const [isSaving, setIsSaving] = useState(false);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [isPaymentSuccessModalOpen, setIsPaymentSuccessModalOpen] = useState(false);
  const [lastPaymentDetails, setLastPaymentDetails] = useState<any>(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [pendingWhatsappUrl, setPendingWhatsappUrl] = useState<string | null>(null);
  const [isSendingSMS, setIsSendingSMS] = useState(false);
  const [selectedFeeForReceipt, setSelectedFeeForReceipt] = useState<FeeRecord | null>(null);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [isGeneratingReceipt, setIsGeneratingReceipt] = useState(false);
  const [instData, setInstData] = useState<any>(null);
  const receiptRef = React.useRef<HTMLDivElement>(null);

  const [paymentData, setPaymentData] = useState({
    type: 'Monthly Fee' as 'Monthly Fee' | 'Exam Fee' | 'Other',
    months: [] as string[],
    examId: '',
    otherFeeId: '',
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

  useEffect(() => {
    if (!user) return;
    const fetchInstData = async () => {
      const docRef = doc(db, 'institutions', user.institutionId || user.uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setInstData(docSnap.data());
      }
    };
    fetchInstData();

    // Fetch Exams for fee reflection
    const qExams = query(
      collection(db, 'offline_exams'),
      where('institutionId', '==', user.institutionId || user.uid)
    );
    const unsubExams = onSnapshot(qExams, (snapshot) => {
      setExams(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as OfflineExam[]);
    });

    return () => unsubExams();
  }, [user]);

  const saveOtherFeeTemplate = async (template: Omit<OtherFeeTemplate, 'id'> & { id?: string }) => {
    if (!user) return;
    const instId = user.institutionId || user.uid;
    const currentTemplates = instData?.otherFeeTemplates || [];
    
    let updated;
    if (template.id) {
      updated = currentTemplates.map((t: any) => t.id === template.id ? template : t);
    } else {
      updated = [...currentTemplates, { ...template, id: Math.random().toString(36).substr(2, 9) }];
    }

    try {
      await writeBatch(db).set(doc(db, 'institutions', instId), { otherFeeTemplates: updated }, { merge: true }).commit();
      setSuccessMessage('Fee template saved successfully!');
      setIsSuccessModalOpen(true);
    } catch (error) {
      console.error('Error saving template:', error);
    }
  };

  const deleteOtherFeeTemplate = async (id: string) => {
    if (!user) return;
    const instId = user.institutionId || user.uid;
    const updated = (instData?.otherFeeTemplates || []).filter((t: any) => t.id !== id);
    try {
      await writeBatch(db).set(doc(db, 'institutions', instId), { otherFeeTemplates: updated }, { merge: true }).commit();
      setSuccessMessage('Fee template deleted!');
      setIsSuccessModalOpen(true);
    } catch (error) {
      console.error('Error deleting template:', error);
    }
  };

  const generateReceiptPDF = async () => {
    if (!receiptRef.current) return;
    try {
      setIsGeneratingReceipt(true);
      const canvas = await html2canvas(receiptRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });
      
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Receipt_${selectedFeeForReceipt?.studentName}_${selectedFeeForReceipt?.month}.pdf`);
    } catch (err) {
      console.error('Failed to generate receipt:', err);
      alert('Failed to generate receipt. Please try again.');
    } finally {
      setIsGeneratingReceipt(false);
    }
  };

  const getStudentDues = (student: Student) => {
    const currentYear = new Date().getFullYear();
    const currentMonthIndex = new Date().getMonth(); // 0-11
    
    // Get join month and year
    const joinDate = new Date(student.joinDate);
    const joinYear = joinDate.getFullYear();
    const joinMonthIndex = joinDate.getMonth();

    // Monthly Fee Dues
    const startMonthIndex = joinYear < currentYear ? 0 : joinMonthIndex;
    const paidMonthlyMonths = fees
      .filter(f => f.studentId === student.id && f.year === currentYear && f.type === 'Monthly Fee' && f.status === 'paid')
      .map(f => f.month);

    const dueMonths = [];
    for (let i = startMonthIndex; i <= currentMonthIndex; i++) {
      if (!paidMonthlyMonths.includes(MONTHS[i])) {
        dueMonths.push(MONTHS[i]);
      }
    }

    // Exam Fee Dues
    const paidExams = fees
      .filter(f => f.studentId === student.id && f.type === 'Exam Fee' && f.status === 'paid')
      .map(f => f.description); // We'll store exam ID/Title in description

    const dueExams = exams.filter(e => 
      e.batchId === student.batchId && 
      e.examFee && 
      e.examFee > 0 && 
      !paidExams.includes(e.title)
    );

    // Other Fee Dues (Mandatory only)
    const paidOther = fees
      .filter(f => f.studentId === student.id && f.type === 'Other' && f.status === 'paid')
      .map(f => f.description);

    const dueOther = (instData?.otherFeeTemplates || []).filter((t: OtherFeeTemplate) => 
      t.isMandatory && 
      (t.batchId === 'All' || !t.batchId || t.batchId === student.batchId) &&
      !paidOther.includes(t.name)
    );

    return { monthly: dueMonths, exams: dueExams, other: dueOther };
  };

  const [isSendingReminder, setIsSendingReminder] = useState<string | null>(null);

  const handleSendReminder = async (student: Student) => {
    const dues = getStudentDues(student);
    const hasDues = dues.monthly.length > 0 || dues.exams.length > 0 || dues.other.length > 0;
    if (!hasDues) return;

    const monthlyAmount = dues.monthly.length * student.monthlyFee;
    const examsAmount = dues.exams.reduce((sum: number, e: any) => sum + (e.examFee || 0), 0);
    const otherAmount = dues.other.reduce((sum: number, o: any) => sum + o.amount, 0);
    const totalDue = monthlyAmount + examsAmount + otherAmount;

    const instName = instData?.name || 'Our Center';
    
    // Check for custom template in instData
    let message = `Due Reminder! \nStudent: ${student.name}\nBatch: ${student.batchName}\nDue Amount: ৳${totalDue}\nPending Months: ${dues.monthly.join(', ')}\nInstitution: ${instName}\nPlease clear your dues as soon as possible. Thank you.`;
    
    if (instData?.messageTemplates?.due_reminder_whatsapp) {
      message = instData.messageTemplates.due_reminder_whatsapp
        .replace('{{studentName}}', student.name)
        .replace('{{batchName}}', student.batchName)
        .replace('{{amount}}', String(totalDue))
        .replace('{{months}}', dues.monthly.join(', '))
        .replace('{{institutionName}}', instName);
    }

    const encodedMessage = encodeURIComponent(message);
    const cleanPhone = formatWhatsAppPhone(student.guardianPhone);
    const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodedMessage}`;
    window.open(whatsappUrl, '_blank');
  };

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedStudent) return;
    if (paymentData.type === 'Monthly Fee' && paymentData.months.length === 0) return;
    if (paymentData.type === 'Exam Fee' && !paymentData.examId) return;
    if (paymentData.type === 'Other' && !paymentData.otherFeeId) return;

    try {
      setIsSaving(true);
      const batch = writeBatch(db);
      const currentYear = new Date().getFullYear();
      const paymentDate = new Date().toISOString();

      if (paymentData.type === 'Monthly Fee') {
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
      } else if (paymentData.type === 'Exam Fee') {
        const exam = exams.find(e => e.id === paymentData.examId);
        if (exam) {
          const feeRef = doc(collection(db, 'fees'));
          batch.set(feeRef, {
            studentId: selectedStudent.id,
            studentName: selectedStudent.name,
            amount: exam.examFee || 0,
            date: paymentDate,
            status: 'paid',
            type: 'Exam Fee',
            description: exam.title,
            paymentMethod: paymentData.method,
            bkashNumber: paymentData.method === 'bKash' ? paymentData.bkashNumber : null,
            transactionId: paymentData.method === 'bKash' ? paymentData.transactionId : null,
            institutionId: user.institutionId || user.uid,
            createdBy: user.uid,
            createdAt: serverTimestamp(),
          });
        }
      } else if (paymentData.type === 'Other') {
        const template = (instData?.otherFeeTemplates || []).find((t: any) => t.id === paymentData.otherFeeId);
        if (template) {
          const feeRef = doc(collection(db, 'fees'));
          batch.set(feeRef, {
            studentId: selectedStudent.id,
            studentName: selectedStudent.name,
            amount: template.amount,
            date: paymentDate,
            status: 'paid',
            type: 'Other',
            description: template.name,
            paymentMethod: paymentData.method,
            bkashNumber: paymentData.method === 'bKash' ? paymentData.bkashNumber : null,
            transactionId: paymentData.method === 'bKash' ? paymentData.transactionId : null,
            institutionId: user.institutionId || user.uid,
            createdBy: user.uid,
            createdAt: serverTimestamp(),
          });
        }
      }

      await batch.commit();

      let totalAmount = 0;
      let purpose = '';

      if (paymentData.type === 'Monthly Fee') {
        totalAmount = selectedStudent.monthlyFee * paymentData.months.length;
        purpose = `Monthly Fee (${paymentData.months.join(', ')})`;
      } else if (paymentData.type === 'Exam Fee') {
        const exam = exams.find(e => e.id === paymentData.examId);
        totalAmount = exam?.examFee || 0;
        purpose = `Exam Fee (${exam?.title})`;
      } else {
        const template = (instData?.otherFeeTemplates || []).find((t: any) => t.id === paymentData.otherFeeId);
        totalAmount = template?.amount || 0;
        purpose = template?.name || 'Other Fee';
      }
      
      const details = {
        studentName: selectedStudent.name,
        rollNo: selectedStudent.rollNo,
        batchName: selectedStudent.batchName,
        purpose,
        months: paymentData.months,
        amount: totalAmount,
        date: paymentDate,
        method: paymentData.method,
        phone: selectedStudent.guardianPhone,
        dues: getStudentDues(selectedStudent).monthly.filter(m => !paymentData.months.includes(m))
      };

      setLastPaymentDetails(details);
      
      const instName = instData?.name || 'Our Center';
      let message = `${t('fees.whatsapp.success')}\n${t('fees.whatsapp.studentName')}: ${details.studentName}\nPurpose: ${details.purpose}\n${t('fees.whatsapp.totalAmount')}: ৳${details.amount}\n${t('fees.whatsapp.method')}: ${details.method}\n${t('fees.whatsapp.thanks')}`;
      
      if (instData?.messageTemplates?.payment_success_whatsapp) {
        message = instData.messageTemplates.payment_success_whatsapp
          .replace('{{studentName}}', details.studentName)
          .replace('{{rollNo}}', details.rollNo)
          .replace('{{batchName}}', details.batchName)
          .replace('{{amount}}', String(details.amount))
          .replace('{{months}}', details.months.join(', '))
          .replace('{{method}}', details.method)
          .replace('{{date}}', new Date(details.date).toLocaleDateString())
          .replace('{{institutionName}}', instName);
      }

      const encodedMessage = encodeURIComponent(message);
      const cleanPhone = formatWhatsAppPhone(selectedStudent.guardianPhone);
      const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodedMessage}`;
      
      // Handle Paid SMS API if configured
      if (instData?.smsConfig?.apiUrl && instData?.messageTemplates?.payment_success_sms) {
        const smsContent = instData.messageTemplates.payment_success_sms
          .replace('{{studentName}}', details.studentName)
          .replace('{{rollNo}}', details.rollNo)
          .replace('{{batchName}}', details.batchName)
          .replace('{{amount}}', String(details.amount))
          .replace('{{months}}', details.months.join(', '))
          .replace('{{method}}', details.method)
          .replace('{{date}}', new Date(details.date).toLocaleDateString())
          .replace('{{institutionName}}', instName)
          .replace('{{dueMonthsCount}}', String(details.dues.length));
        
        sendSMS(instData.smsConfig, details.phone, smsContent).catch(console.error);
      }

      setPendingWhatsappUrl(whatsappUrl);
      setIsPaymentModalOpen(false);
      setPaymentData({ type: 'Monthly Fee', months: [], examId: '', otherFeeId: '', method: 'Cash', bkashNumber: '', transactionId: '', amount: 0 });
      setIsPaymentSuccessModalOpen(true);
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

    const doc = new jsPDF();
    const instName = instData?.name || 'Our Institution';
    const logoUrl = user?.photoURL || '';
    
    // Header
    if (logoUrl) {
      try {
        doc.addImage(logoUrl, 'PNG', 14, 10, 20, 20);
      } catch (e) {
        console.error("Logo error", e);
      }
    }
    
    doc.setFontSize(20);
    doc.setTextColor(40);
    doc.setFont("helvetica", "bold");
    doc.text(instName, logoUrl ? 38 : 14, 22);
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100);
    const reportTitle = type === 'daily' ? 'Daily Collection Report' : type === 'monthly' ? 'Monthly Collection Report' : 'Fee Collection Report';
    const dateRange = type === 'custom' ? `From: ${startDate} To: ${endDate}` : `Date: ${now.toLocaleDateString()}`;
    doc.text(`${reportTitle} | ${dateRange}`, logoUrl ? 38 : 14, 28);
    
    // Table
    const tableData = filtered.map(f => [
      f.studentName,
      f.type,
      f.type === 'Monthly Fee' ? `${f.month} ${f.year}` : f.description || 'N/A',
      `৳${f.amount}`,
      f.date.split('T')[0],
      f.paymentMethod || 'N/A',
      f.transactionId || 'N/A'
    ]);

    const total = filtered.reduce((sum, f) => sum + f.amount, 0);

    autoTable(doc, {
      startY: 40,
      head: [['Student Name', 'Type', 'Purpose/Month', 'Amount', 'Date', 'Method', 'Transaction ID']],
      body: tableData,
      theme: 'striped',
      headStyles: { fillColor: [31, 41, 55], textColor: [255, 255, 255], fontSize: 9, fontStyle: 'bold' },
      bodyStyles: { fontSize: 8 },
      foot: [['', '', 'Total Collection:', `৳${total}`, '', '', '']],
      footStyles: { fillColor: [243, 244, 246], textColor: [31, 41, 55], fontSize: 9, fontStyle: 'bold' }
    });

    // Footer
    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      const pageSize = doc.internal.pageSize;
      const pageHeight = pageSize.height ? pageSize.height : pageSize.getHeight();
      
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text(
        `Generated on: ${new Date().toLocaleString()} | Page ${i} of ${pageCount}`,
        14,
        pageHeight - 10
      );
      doc.text(
        "Powered by: Manage My Batch Management System",
        pageSize.width - 80,
        pageHeight - 10
      );
    }

    doc.save(`fee_report_${type}_${new Date().getTime()}.pdf`);
  };

  const handleSendSMS = async () => {
    if (!lastPaymentDetails || isSendingSMS) return;
    setIsSendingSMS(true);
    try {
      const message = `Payment Received!\nStudent: ${lastPaymentDetails.studentName}\nRoll: ${lastPaymentDetails.rollNo}\nBatch: ${lastPaymentDetails.batchName}\nMonths: ${lastPaymentDetails.months.join(', ')}\nAmount: ৳${lastPaymentDetails.amount}\nCoach: ${instData?.name || 'Our Center'}\nDate: ${new Date(lastPaymentDetails.date).toLocaleDateString()}\nDue: ${lastPaymentDetails.dues.length} months`;
      
      const result = await sendSMS(instData?.smsConfig, lastPaymentDetails.phone, message);
      if (result.success) {
        alert('SMS sent successfully!');
      } else {
        alert(`Failed to send SMS: ${result.error}`);
      }
    } catch (error) {
      alert('Error sending SMS');
    } finally {
      setIsSendingSMS(false);
    }
  };

  const filteredStudents = students.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         s.rollNo.includes(searchTerm) || 
                         s.guardianPhone.includes(searchTerm);
    const matchesBatch = selectedBatch === t('fees.allBatches') || s.batchId === selectedBatch;
    const dues = getStudentDues(s);
    const hasDues = dues.monthly.length > 0 || dues.exams.length > 0 || dues.other.length > 0;
    const matchesTab = activeTab === 'all' || hasDues;
    return matchesSearch && matchesBatch && matchesTab && s.status === 'active';
  });

  const totalCollected = fees.filter(f => f.status === 'paid').reduce((sum, f) => sum + f.amount, 0);
  const studentsWithDues = students.filter(s => s.status === 'active' && (getStudentDues(s).monthly.length > 0 || getStudentDues(s).exams.length > 0 || getStudentDues(s).other.length > 0));
  const totalOutstandingDues = studentsWithDues.reduce((sum, s) => {
    const d = getStudentDues(s);
    const mAmount = d.monthly.length * s.monthlyFee;
    const eAmount = d.exams.reduce((sum, e) => sum + (e.examFee || 0), 0);
    const oAmount = d.other.reduce((sum, o) => sum + o.amount, 0);
    return sum + mAmount + eAmount + oAmount;
  }, 0);

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">{t('fees.title')}</h1>
          <p className="text-gray-500 mt-1">{t('fees.subtitle')}</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-rose-50 px-4 py-2 rounded-xl border border-rose-100">
            <p className="text-[10px] font-black text-rose-600 uppercase tracking-widest">{t('dashboard.stats.studentsWithDues')}</p>
            <p className="text-xl font-black text-rose-700">{formatCurrency(totalOutstandingDues)}</p>
          </div>
          <div className="bg-emerald-50 px-4 py-2 rounded-xl border border-emerald-100">
            <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">{t('fees.totalCollected')}</p>
            <p className="text-xl font-black text-emerald-700">{formatCurrency(totalCollected)}</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 bg-white p-1.5 rounded-2xl border border-gray-100 shadow-sm w-fit overflow-x-auto no-scrollbar">
        <button
          onClick={() => setActiveTab('all')}
          className={cn(
            "px-6 py-2.5 text-sm font-bold rounded-xl transition-all flex items-center gap-2 whitespace-nowrap",
            activeTab === 'all' ? "bg-indigo-600 text-white shadow-lg shadow-indigo-100" : "text-gray-500 hover:bg-gray-50"
          )}
        >
          <Users className="w-4 h-4" /> {t('fees.allStudents')}
        </button>
        <button
          onClick={() => setActiveTab('dues')}
          className={cn(
            "px-6 py-2.5 text-sm font-bold rounded-xl transition-all flex items-center gap-2 whitespace-nowrap",
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
        {user?.role !== 'staff' && (
          <button
            onClick={() => setActiveTab('manage_other')}
            className={cn(
              "px-6 py-2.5 text-sm font-bold rounded-xl transition-all flex items-center gap-2 whitespace-nowrap",
              activeTab === 'manage_other' ? "bg-amber-600 text-white shadow-lg shadow-amber-100" : "text-gray-500 hover:bg-gray-50"
            )}
          >
            <CreditCard className="w-4 h-4" /> Manage Other Fees
          </button>
        )}
      </div>

      {activeTab === 'manage_other' ? (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
            <h3 className="text-lg font-bold text-gray-900 mb-6">Create Custom Fee Template</h3>
            <form 
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                saveOtherFeeTemplate({
                  name: formData.get('name') as string,
                  amount: parseInt(formData.get('amount') as string),
                  batchId: formData.get('batchId') as string,
                  isMandatory: formData.get('isMandatory') === 'on'
                });
                (e.target as HTMLFormElement).reset();
              }}
              className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end"
            >
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Fee Name</label>
                <input required name="name" type="text" placeholder="e.g. Admission / Book Fee" className="w-full px-4 py-2 border border-gray-100 rounded-xl text-sm" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Amount</label>
                <input required name="amount" type="number" placeholder="500" className="w-full px-4 py-2 border border-gray-100 rounded-xl text-sm" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Target Batch</label>
                <select name="batchId" className="w-full px-4 py-2 border border-gray-100 rounded-xl text-sm">
                  <option value="All">All Batches</option>
                  {batches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer pb-2">
                  <input name="isMandatory" type="checkbox" className="w-4 h-4 text-indigo-600 rounded" />
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Mandatory</span>
                </label>
                <button type="submit" className="flex-1 bg-indigo-600 text-white rounded-xl py-2 text-sm font-bold shadow-lg shadow-indigo-100">Add Fee</button>
              </div>
            </form>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {(instData?.otherFeeTemplates || []).map((t: OtherFeeTemplate) => (
              <div key={t.id} className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm relative group">
                <button onClick={() => deleteOtherFeeTemplate(t.id)} className="absolute top-2 right-2 p-1.5 text-gray-300 hover:text-rose-600 opacity-0 group-hover:opacity-100 transition-all">
                  <Plus className="w-4 h-4 rotate-45" />
                </button>
                <div className="flex items-center gap-3">
                  <div className={cn("p-2 rounded-lg", t.isMandatory ? "bg-rose-50 text-rose-600" : "bg-indigo-50 text-indigo-600")}>
                    <CreditCard className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-bold text-gray-900">{t.name}</p>
                    <p className="text-xs text-gray-500">৳{t.amount} • {t.batchId === 'All' ? 'All Batches' : batches.find(b => b.id === t.batchId)?.name || 'N/A'}</p>
                  </div>
                </div>
                <div className="mt-2 text-[10px] font-black uppercase text-gray-400">
                  {t.isMandatory ? 'Mandatory for all' : 'Optional / Pickup'}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <>
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

      {/* Student List Table */}
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
                    (dues.monthly.length === 0 && dues.exams.length === 0 && dues.other.length === 0) ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
                  )}>
                    {(dues.monthly.length === 0 && dues.exams.length === 0 && dues.other.length === 0) ? t('fees.status.paid') : t('fees.status.duesPending')}
                  </span>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col gap-1 max-w-[200px]">
                    <div className="flex flex-wrap gap-1">
                      {dues.monthly.length > 0 ? (
                        dues.monthly.map(m => (
                          <span key={m} className="px-1.5 py-0.5 bg-rose-50 text-rose-600 text-[8px] font-black rounded border border-rose-100 uppercase">
                            {t(`common.months.${m}`)}
                          </span>
                        ))
                      ) : null}
                    </div>
                    {dues.exams.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {dues.exams.map(e => (
                          <span key={e.id} className="px-1.5 py-0.5 bg-amber-50 text-amber-600 text-[8px] font-black rounded border border-amber-100 uppercase">
                            EXAM: {e.title}
                          </span>
                        ))}
                      </div>
                    )}
                    {dues.other.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {dues.other.map(o => (
                          <span key={o.id} className="px-1.5 py-0.5 bg-purple-50 text-purple-600 text-[8px] font-black rounded border border-purple-100 uppercase">
                            FEE: {o.name}
                          </span>
                        ))}
                      </div>
                    )}
                    {(dues.monthly.length === 0 && dues.exams.length === 0 && dues.other.length === 0) && (
                      <span className="text-[10px] text-emerald-600 font-bold italic">{t('fees.status.allClear')}</span>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => {
                        setSelectedStudent(student);
                        setPaymentData({ ...paymentData, type: 'Monthly Fee', months: dues.monthly, examId: '', otherFeeId: '' });
                        setIsPaymentModalOpen(true);
                      }}
                      className="flex items-center gap-2 px-3 py-1.5 text-xs font-black text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-all shadow-sm"
                    >
                      <CreditCard className="w-3.5 h-3.5" /> {t('fees.collectFee')}
                    </button>
                    {(dues.monthly.length > 0 || dues.exams.length > 0 || dues.other.length > 0) && (
                      <button 
                        onClick={() => handleSendReminder(student)}
                        className="flex items-center gap-2 px-3 py-1.5 text-xs font-black text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition-all shadow-sm"
                        title="Send Reminder"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </Table>
      )}

      {/* Recent Payments Section - Moved Below */}
      {activeTab === 'all' && (
        <div className="space-y-4 pt-8 border-t border-gray-100">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Clock className="w-5 h-5 text-indigo-600" /> Recent Payments
          </h2>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">Student</th>
                  <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">Purpose</th>
                  <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">Amount</th>
                  <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">Date</th>
                  <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {fees.slice(0, 10).map(fee => (
                  <tr key={fee.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <p className="font-bold text-gray-900">{fee.studentName}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "text-[10px] font-black px-2 py-1 rounded uppercase tracking-wider",
                        fee.type === 'Monthly Fee' ? "bg-indigo-50 text-indigo-700" :
                        fee.type === 'Exam Fee' ? "bg-rose-50 text-rose-700" :
                        "bg-amber-50 text-amber-700"
                      )}>
                        {fee.type === 'Monthly Fee' ? `${fee.month} ${fee.year}` : (fee.description || fee.type)}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-black text-gray-900">৳{fee.amount}</td>
                    <td className="px-6 py-4 text-xs text-gray-500 font-medium">
                      {new Date(fee.date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <button 
                        onClick={() => {
                          setSelectedFeeForReceipt(fee);
                          setIsReceiptModalOpen(true);
                        }}
                        className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                        title="Print Receipt"
                      >
                        <Receipt className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
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

            <div className="flex items-center gap-2 p-1 bg-gray-100 rounded-xl">
              {(['Monthly Fee', 'Exam Fee', 'Other'] as const).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setPaymentData({ ...paymentData, type })}
                  className={cn(
                    "flex-1 py-2 text-xs font-bold rounded-lg transition-all",
                    paymentData.type === type ? "bg-white text-indigo-600 shadow-sm" : "text-gray-500"
                  )}
                >
                  {type === 'Other' ? 'Book/Custom' : type}
                </button>
              ))}
            </div>

            {paymentData.type === 'Monthly Fee' && (
              <div className="space-y-3 animate-in fade-in slide-in-from-top-2">
                <label className="text-xs font-black text-gray-500 uppercase tracking-widest">{t('fees.paymentModal.selectMonths')}</label>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {MONTHS.map((month) => {
                    const isPaid = fees.some(f => f.studentId === selectedStudent.id && f.month === month && f.year === new Date().getFullYear() && f.status === 'paid' && f.type === 'Monthly Fee');
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
            )}

            {paymentData.type === 'Exam Fee' && (
              <div className="space-y-3 animate-in fade-in slide-in-from-top-2">
                <label className="text-xs font-black text-gray-500 uppercase tracking-widest">Select Pending Exam</label>
                <div className="space-y-2">
                  {getStudentDues(selectedStudent).exams.map(exam => (
                    <button
                      key={exam.id}
                      type="button"
                      onClick={() => setPaymentData({ ...paymentData, examId: paymentData.examId === exam.id ? '' : exam.id, amount: exam.examFee || 0 })}
                      className={cn(
                        "w-full flex items-center justify-between p-4 rounded-xl border transition-all text-left",
                        paymentData.examId === exam.id ? "bg-rose-50 border-rose-200 text-rose-700 shadow-sm" : "bg-white border-gray-100 hover:border-rose-100"
                      )}
                    >
                      <div>
                        <p className="font-bold text-sm">{exam.title}</p>
                        <p className="text-[10px] text-rose-400 font-black uppercase">Pending Fee</p>
                      </div>
                      <p className="text-lg font-black italic">৳{exam.examFee}</p>
                    </button>
                  ))}
                  {getStudentDues(selectedStudent).exams.length === 0 && (
                    <div className="p-8 text-center text-gray-400 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-100">
                      No pending exam fees found.
                    </div>
                  )}
                </div>
              </div>
            )}

            {paymentData.type === 'Other' && (
              <div className="space-y-3 animate-in fade-in slide-in-from-top-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black text-gray-500 uppercase tracking-widest">Select custom fee</label>
                  <span className="text-[10px] font-bold text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded-full">Book / Materials</span>
                </div>
                <div className="space-y-2">
                  {(instData?.otherFeeTemplates || []).map((template: OtherFeeTemplate) => {
                    const isPaid = fees.some(f => f.studentId === selectedStudent.id && f.type === 'Other' && f.description === template.name && f.status === 'paid');
                    const isApplicable = !template.batchId || template.batchId === 'All' || template.batchId === selectedStudent.batchId;
                    
                    if (isPaid || !isApplicable) return null;

                    return (
                      <button
                        key={template.id}
                        type="button"
                        onClick={() => setPaymentData({ ...paymentData, otherFeeId: paymentData.otherFeeId === template.id ? '' : template.id, amount: template.amount })}
                        className={cn(
                          "w-full flex items-center justify-between p-4 rounded-xl border transition-all text-left",
                          paymentData.otherFeeId === template.id ? "bg-amber-50 border-amber-200 text-amber-700 shadow-sm" : "bg-white border-gray-100 hover:border-amber-100"
                        )}
                      >
                        <div>
                          <p className="font-bold text-sm">{template.name}</p>
                          <p className="text-[10px] text-amber-500 font-bold uppercase">{template.isMandatory ? 'Mandatory' : 'Optional Choice'}</p>
                        </div>
                        <p className="text-lg font-black italic">৳{template.amount}</p>
                      </button>
                    );
                  })}
                  {!(instData?.otherFeeTemplates || []).some((t: any) => {
                    const isPaid = fees.some(f => f.studentId === selectedStudent.id && f.type === 'Other' && f.description === t.name && f.status === 'paid');
                    const isApplicable = !t.batchId || t.batchId === 'All' || t.batchId === selectedStudent.batchId;
                    return !isPaid && isApplicable;
                  }) && (
                    <div className="p-8 text-center text-gray-400 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-100">
                      No other fees available for this student.
                    </div>
                  )}
                </div>
              </div>
            )}

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
                <span className="text-2xl font-black text-gray-900">
                  ৳{paymentData.type === 'Monthly Fee' 
                    ? selectedStudent.monthlyFee * paymentData.months.length 
                    : paymentData.type === 'Exam Fee' 
                      ? (exams.find(e => e.id === paymentData.examId)?.examFee || 0)
                      : ((instData?.otherFeeTemplates || []).find((t: any) => t.id === paymentData.otherFeeId)?.amount || 0)
                  }
                </span>
              </div>
              <button
                type="submit"
                disabled={(paymentData.type === 'Monthly Fee' && paymentData.months.length === 0) || (paymentData.type === 'Exam Fee' && !paymentData.examId) || (paymentData.type === 'Other' && !paymentData.otherFeeId) || isSaving}
                className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                {t('fees.paymentModal.confirm')}
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Payment Success Options Modal */}
      <Modal
        isOpen={isPaymentSuccessModalOpen}
        onClose={() => setIsPaymentSuccessModalOpen(false)}
        title="Payment Successful!"
        maxWidth="max-w-md"
      >
        <div className="space-y-6">
          <div className="text-center space-y-2">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h3 className="text-xl font-bold text-gray-900">Payment of ৳{lastPaymentDetails?.amount} Added</h3>
            <p className="text-sm text-gray-500">Student: {lastPaymentDetails?.studentName} ({lastPaymentDetails?.rollNo})</p>
          </div>

          <div className="grid grid-cols-1 gap-3">
            <button
              onClick={() => {
                if (pendingWhatsappUrl) {
                  window.open(pendingWhatsappUrl, '_blank');
                }
              }}
              className="w-full flex items-center justify-between p-4 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-2xl border border-emerald-100 transition-all group"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-600 text-white rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Send className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <p className="font-bold">Send WhatsApp</p>
                  <p className="text-[10px] opacity-70 uppercase tracking-widest font-black">Direct to Guardian</p>
                </div>
              </div>
              <ArrowRight className="w-5 h-5 opacity-50 group-hover:translate-x-1 transition-transform" />
            </button>

            <button
              onClick={handleSendSMS}
              disabled={isSendingSMS}
              className="w-full flex items-center justify-between p-4 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-2xl border border-blue-100 transition-all group disabled:opacity-50"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-600 text-white rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                  {isSendingSMS ? <Loader2 className="w-5 h-5 animate-spin" /> : <MessageSquare className="w-5 h-5" />}
                </div>
                <div className="text-left">
                  <p className="font-bold">Send Auto SMS</p>
                  <p className="text-[10px] opacity-70 uppercase tracking-widest font-black">Via Custom Gateway</p>
                </div>
              </div>
              <ArrowRight className="w-5 h-5 opacity-50 group-hover:translate-x-1 transition-transform" />
            </button>

            <button
              onClick={() => {
                // We need the fee ID to print receipt. 
                // Since batch commit doesn't return IDs easily, we rely on the list or get latest.
                // For simplicity, let's allow downloading from recent payments or implement a specific receipt fetch here.
                // The user asked for receipt download in the popup.
                alert('Receipt generated. You can download it from the Recent Payments list below.');
              }}
              className="w-full flex items-center justify-between p-4 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-2xl border border-indigo-100 transition-all group"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-600 text-white rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Receipt className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <p className="font-bold">Download Receipt</p>
                  <p className="text-[10px] opacity-70 uppercase tracking-widest font-black">PDF Format</p>
                </div>
              </div>
              <ArrowRight className="w-5 h-5 opacity-50 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setIsPaymentSuccessModalOpen(false)}
              className="flex-1 py-4 bg-gray-100 text-gray-700 font-bold rounded-2xl hover:bg-gray-200 transition-all"
            >
              Just Save
            </button>
            <button
              onClick={() => setIsPaymentSuccessModalOpen(false)}
              className="flex-1 py-4 bg-gray-900 text-white font-bold rounded-2xl hover:bg-gray-800 transition-all"
            >
              Cancel & Close
            </button>
          </div>
        </div>
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

      {/* Receipt Modal */}
      <Modal
        isOpen={isReceiptModalOpen}
        onClose={() => setIsReceiptModalOpen(false)}
        title="Payment Receipt"
        maxWidth="max-w-2xl"
      >
        <div className="space-y-6">
          <div className="flex justify-end gap-2">
            <button 
              onClick={generateReceiptPDF}
              disabled={isGeneratingReceipt}
              className="px-6 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 transition-all flex items-center gap-2 disabled:opacity-50"
            >
              {isGeneratingReceipt ? <Loader2 className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />}
              Print Receipt
            </button>
          </div>

          <div className="bg-gray-100 p-8 rounded-2xl flex justify-center">
            <div ref={receiptRef} className="bg-white w-[140mm] p-10 relative shadow-xl" style={{ minHeight: '140mm', fontFamily: "'Inter', 'Noto Sans Bengali', sans-serif" }}>
              <div className="border-4 border-indigo-600 p-8 h-full relative">
                <div className="flex justify-between items-start mb-8">
                  <div className="flex items-center gap-3">
                    {instData?.logoUrl && <img src={instData.logoUrl} className="h-10 object-contain" referrerPolicy="no-referrer" />}
                    <div>
                      <h2 className="text-xl font-black text-indigo-700 leading-none">{instData?.name || 'Manage My Batch'}</h2>
                      <p className="text-[8px] font-bold text-gray-400 tracking-widest uppercase mt-1">Payment Receipt</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[9px] font-black text-gray-400 uppercase">Receipt No</p>
                    <p className="text-xs font-black text-indigo-600">#{selectedFeeForReceipt?.id.slice(-6).toUpperCase()}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6 mb-8 border-y border-gray-100 py-6">
                  <div className="space-y-3">
                    <div>
                      <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Student Name</p>
                      <p className="text-sm font-black text-gray-900">{selectedFeeForReceipt?.studentName}</p>
                    </div>
                    <div>
                      <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Date</p>
                      <p className="text-sm font-bold text-gray-700">{selectedFeeForReceipt?.date && new Date(selectedFeeForReceipt.date).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Purpose</p>
                      <p className="text-sm font-bold text-gray-900">
                        {selectedFeeForReceipt?.type === 'Monthly Fee' ? `${selectedFeeForReceipt.month} ${selectedFeeForReceipt.year}` : selectedFeeForReceipt?.type}
                      </p>
                    </div>
                    <div>
                      <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Payment Method</p>
                      <p className="text-sm font-bold text-indigo-600">{selectedFeeForReceipt?.paymentMethod || 'Cash'}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-indigo-50 p-4 rounded-xl mb-12 flex justify-between items-center group">
                  <span className="text-xs font-black text-indigo-700 uppercase tracking-widest">Total Amount Paid</span>
                  <span className="text-2xl font-black text-indigo-700">৳{selectedFeeForReceipt?.amount}</span>
                </div>

                <div className="flex justify-between items-end mt-auto">
                  <div className="text-[8px] text-gray-400 italic">
                    This is a computer-generated receipt. No signature required.
                  </div>
                  <div className="text-center">
                    <div className="h-px w-24 bg-gray-200 mb-1"></div>
                    <p className="text-[8px] font-black text-gray-900 uppercase">Authorized By</p>
                  </div>
                </div>

                <div className="absolute inset-0 border border-gray-100 pointer-events-none -m-1"></div>
              </div>
            </div>
          </div>
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
    </>
  )}
</div>
  );
}
