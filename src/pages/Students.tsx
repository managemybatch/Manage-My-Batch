import React, { useState, useEffect } from 'react';
import { Plus, Search, Filter, MoreVertical, Mail, Phone, Download, Loader2, Layers, User, MessageSquare, Contact, FileText, CheckCircle2, XCircle, Users, HelpCircle, FileDown } from 'lucide-react';
import { Table, TableRow, TableCell } from '../components/Table';
import { motion } from 'motion/react';
import { cn, formatWhatsAppPhone, formatDate } from '../lib/utils';
import { collection, onSnapshot, query, addDoc, serverTimestamp, deleteDoc, doc, getDoc, writeBatch, where, orderBy, increment } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { useAuth } from '../lib/auth';
import { Modal } from '../components/Modal';
import { ConfirmModal } from '../components/ConfirmModal';
import { GRADES, SECTIONS, SUBSCRIPTION_PLANS, MONTHS } from '../constants';
import { useTranslation } from 'react-i18next';
import { SubscriptionModal } from '../components/SubscriptionModal';

import { useSearchParams, useNavigate } from 'react-router-dom';
import { StudentProfile } from '../components/StudentProfile';

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
  createdAt: any;
}

interface Batch {
  id: string;
  name: string;
  admissionFee: number;
  monthlyFee: number;
  grade: string;
}

export function Students() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [students, setStudents] = useState<Student[]>([]);
  const [applications, setApplications] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'students' | 'applications'>('students');
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [studentToDelete, setStudentToDelete] = useState<string | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [editingStudent, setEditingStudent] = useState<any>(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [successInfo, setSuccessInfo] = useState<{title: string, message: string, whatsappUrl: string} | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showImportHelp, setShowImportHelp] = useState(false);
  const importInputRef = React.useRef<HTMLInputElement>(null);

  const handleDownloadTemplate = () => {
    const headers = ['Name', 'Phone', 'Batch', 'RollNo'];
    const csvContent = headers.join(',') + '\nJohn Doe,017xxxxxxxx,Class 10 - A,101';
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'student_import_template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };
  
  const handleImportCSV = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      const rows = text.split('\n').map(row => row.split(','));
      // Assume Header: Name, Phone, Batch, RollNo, GuardianName, FatherName, MotherName, Address
      // Basic validation
      if (rows.length < 2) {
        alert('Empty or invalid CSV file');
        return;
      }

      const headers = rows[0].map(h => h.trim().toLowerCase());
      const studentRows = rows.slice(1).filter(r => r.length > 1);

      setIsSaving(true);
      const firestoreBatch = writeBatch(db);
      const instId = user.institutionId || user.uid;
      let count = 0;

      for (const row of studentRows) {
        const studentRef = doc(collection(db, 'students'));
        const name = row[headers.indexOf('name')] || row[0];
        const phone = row[headers.indexOf('phone')] || row[1];
        const batchNameStr = row[headers.indexOf('batch')] || row[2];
        const rollNo = row[headers.indexOf('rollno')] || row[3] || '';
        
        const b = batches.find(batch => batch.name.toLowerCase() === batchNameStr?.trim().toLowerCase());

        if (!name || !batchNameStr) continue;

        const studentData = {
          name: name.trim(),
          guardianPhone: phone?.trim() || '',
          batchId: b?.id || '',
          batchName: b?.name || batchNameStr.trim(),
          grade: b?.grade || '',
          rollNo: rollNo.trim(),
          status: 'active',
          joinDate: new Date().toISOString().split('T')[0],
          monthlyFee: b?.monthlyFee || 0,
          admissionFee: b?.admissionFee || 0,
          feeType: 'Full Fee',
          institutionId: instId,
          createdBy: user.uid,
          createdAt: serverTimestamp(),
        };

        firestoreBatch.set(studentRef, studentData);
        
        // Create Paid Fee Records for Import
        const admissionFee = b?.admissionFee || 0;
        const monthlyFee = b?.monthlyFee || 0;
        const now = new Date();
        const currentMonth = MONTHS[now.getMonth()];
        const currentYear = now.getFullYear();

        if (admissionFee > 0) {
          const feeRef = doc(collection(db, 'fees'));
          firestoreBatch.set(feeRef, {
            studentId: studentRef.id,
            studentName: studentData.name,
            amount: admissionFee,
            date: now.toISOString(),
            month: currentMonth,
            year: currentYear,
            status: 'paid',
            type: 'Admission Fee',
            institutionId: instId,
            createdBy: user.uid,
            createdAt: serverTimestamp(),
          });
        }

        if (monthlyFee > 0) {
          const feeRef = doc(collection(db, 'fees'));
          firestoreBatch.set(feeRef, {
            studentId: studentRef.id,
            studentName: studentData.name,
            amount: monthlyFee,
            date: now.toISOString(),
            month: currentMonth,
            year: currentYear,
            status: 'paid',
            type: 'Monthly Fee',
            institutionId: instId,
            createdBy: user.uid,
            createdAt: serverTimestamp(),
          });
        }
        
        if (b?.id) {
          const batchRef = doc(db, 'batches', b.id);
          firestoreBatch.update(batchRef, { studentCount: increment(1) });
        }
        count++;
      }

      try {
        await firestoreBatch.commit();
        alert(`Successfully imported ${count} students`);
      } catch (err) {
        console.error('Import failed', err);
        alert('Failed to import students');
      } finally {
        setIsSaving(false);
        if (importInputRef.current) importInputRef.current.value = '';
      }
    };
    reader.readAsText(file);
  };
  
  const [newStudent, setNewStudent] = useState({
    name: '',
    email: '',
    phone: '',
    guardianPhone: '',
    guardianName: '',
    fatherName: '',
    motherName: '',
    rollNo: '',
    dateOfBirth: '',
    birthCertificateNo: '',
    nidNumber: '',
    address: '',
    photoUrl: '',
    grade: '',
    section: '',
    batchId: '',
    joinDate: new Date().toISOString().split('T')[0],
    monthlyFee: 0,
    admissionFee: 0,
    subjectGroup: 'Science',
    feeType: 'Full Fee',
    isAdmissionFeePaid: true,
    isMonthlyFeePaid: true,
    status: 'active' as const,
    applicationId: null as string | null,
  });

  useEffect(() => {
    if (!user) return;

    // Check for prefill data
    const prefill = searchParams.get('prefill');
    if (prefill) {
      try {
        const data = JSON.parse(decodeURIComponent(prefill));
        setNewStudent(prev => ({
          ...prev,
          ...data,
          photoUrl: data.photoUrl || data.photo || prev.photoUrl
        }));
        setIsAddModalOpen(true);
        // Clear param after use
        setSearchParams({}, { replace: true });
      } catch (e) {
        console.error('Failed to parse prefill data', e);
      }
    }

    const instId = user.institutionId || user.uid;

    // Fetch Batches
    const unsubBatches = onSnapshot(
      query(collection(db, 'batches'), where('institutionId', '==', instId)), 
      (snapshot) => {
        const batchData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Batch[];
        setBatches(batchData);
      }
    );

    // Fetch Students
    const q = query(
      collection(db, 'students'),
      where('institutionId', '==', instId)
    );
    const unsubStudents = onSnapshot(q, (snapshot) => {
      const studentData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Student[];

      // Sort client-side to avoid index requirements
      const sortedData = studentData.sort((a, b) => {
        const dateA = a.createdAt ? (typeof a.createdAt === 'string' ? new Date(a.createdAt).getTime() : (a.createdAt as any).seconds * 1000) : 0;
        const dateB = b.createdAt ? (typeof b.createdAt === 'string' ? new Date(b.createdAt).getTime() : (b.createdAt as any).seconds * 1000) : 0;
        return dateB - dateA;
      });

      setStudents(sortedData);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'students');
    });

    // Fetch Applications
    const qApps = query(
      collection(db, 'applications'),
      where('institutionId', '==', instId)
    );
    const unsubApps = onSnapshot(qApps, (snapshot) => {
      const appData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setApplications(appData.sort((a: any, b: any) => {
        const dateA = a.createdAt ? (typeof a.createdAt === 'string' ? new Date(a.createdAt).getTime() : a.createdAt.seconds * 1000) : 0;
        const dateB = b.createdAt ? (typeof b.createdAt === 'string' ? new Date(b.createdAt).getTime() : b.createdAt.seconds * 1000) : 0;
        return dateB - dateA;
      }));
    });

    return () => {
      unsubBatches();
      unsubStudents();
      unsubApps();
    };
  }, [user, searchParams]);

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || isSaving) return;

    const plan = SUBSCRIPTION_PLANS.find(p => p.id === user.subscriptionPlan) || SUBSCRIPTION_PLANS[0];
    
    // Check total student limit
    if (students.length >= plan.studentLimit) {
      setIsUpgradeModalOpen(true);
      return;
    }

    // Special logic for free plan
    if (user.subscriptionPlan === 'free') {
      const batchStudents = students.filter(s => s.batchId === newStudent.batchId);
      const batchCount = batches.length;
      
      if (batchCount === 1) {
        if (batchStudents.length >= 15) {
          setIsUpgradeModalOpen(true);
          return;
        }
      } else if (batchCount === 2) {
        if (batchStudents.length >= 10) {
          setIsUpgradeModalOpen(true);
          return;
        }
      }
    }

    setIsSaving(true);
    try {
      setError(null);
      console.log('Starting handleAddStudent...', { newStudent, user });
      const selectedBatch = batches.find(b => b.id === newStudent.batchId);
      console.log('Selected batch:', selectedBatch);
      
      const firestoreBatch = writeBatch(db);
      
      const studentRef = doc(collection(db, 'students'));
      const admissionFee = parseFloat(newStudent.admissionFee.toString()) || 0;
      const monthlyFee = parseFloat(newStudent.monthlyFee.toString()) || 0;

      const instId = user.institutionId || user.uid;
      const studentData = {
        ...newStudent,
        institutionId: instId,
        admissionFee,
        monthlyFee,
        batchName: selectedBatch?.name || '',
        grade: selectedBatch?.grade || newStudent.grade,
        createdBy: user.uid,
        createdAt: serverTimestamp(),
      };
      
      console.log('Saving student data:', studentData);
      firestoreBatch.set(studentRef, studentData);

      // Update Batch Student Count
      if (newStudent.batchId) {
        const batchRef = doc(db, 'batches', newStudent.batchId);
        firestoreBatch.update(batchRef, {
          studentCount: increment(1)
        });
      }

      // Create Admission Fee Record
      if (admissionFee > 0 && (newStudent as any).isAdmissionFeePaid) {
        const admissionFeeRef = doc(collection(db, 'fees'));
        const jDate = new Date(newStudent.joinDate);
        firestoreBatch.set(admissionFeeRef, {
          studentId: studentRef.id,
          studentName: newStudent.name,
          amount: admissionFee,
          date: new Date().toISOString(),
          month: MONTHS[jDate.getMonth()],
          year: jDate.getFullYear(),
          status: 'paid', // Collected at admission
          type: 'Admission Fee',
          institutionId: user.institutionId || user.uid,
          createdBy: user.uid,
          createdAt: serverTimestamp(),
        });
      }

      // Create First Monthly Fee Record
      if (monthlyFee > 0 && (newStudent as any).isMonthlyFeePaid) {
        const monthlyFeeRef = doc(collection(db, 'fees'));
        const jDate = new Date(newStudent.joinDate);
        firestoreBatch.set(monthlyFeeRef, {
          studentId: studentRef.id,
          studentName: newStudent.name,
          amount: monthlyFee,
          date: new Date().toISOString(),
          month: MONTHS[jDate.getMonth()],
          year: jDate.getFullYear(),
          status: 'paid', // Collected at admission
          type: 'Monthly Fee',
          institutionId: user.institutionId || user.uid,
          createdBy: user.uid,
          createdAt: serverTimestamp(),
        });
      }

      console.log('Committing batch...');
      await firestoreBatch.commit();
      console.log('Batch committed successfully');

      // Delete Application if exists
      if (newStudent.applicationId) {
        try {
          await deleteDoc(doc(db, 'applications', newStudent.applicationId));
        } catch (err) {
          console.error('Error deleting application:', err);
        }
      }
      
      // Send Admission Message
      const message = t('students.addModal.successMsg', {
        name: newStudent.name,
        aFee: admissionFee,
        mFee: monthlyFee,
        total: admissionFee + monthlyFee
      });
      const encodedMessage = encodeURIComponent(message);
      const cleanPhone = formatWhatsAppPhone(newStudent.guardianPhone);
      const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodedMessage}`;

      setSuccessInfo({
        title: t('common.success', { defaultValue: 'Admission Successful' }),
        message,
        whatsappUrl
      });
      setIsAddModalOpen(false);
      setIsSuccessModalOpen(true);

      setNewStudent({
        name: '',
        email: '',
        phone: '',
        guardianPhone: '',
        guardianName: '',
        fatherName: '',
        motherName: '',
        rollNo: '',
        dateOfBirth: '',
        birthCertificateNo: '',
        nidNumber: '',
        address: '',
        photoUrl: '',
        grade: '',
        section: '',
        batchId: '',
        joinDate: new Date().toISOString().split('T')[0],
        monthlyFee: 0,
        admissionFee: 0,
        subjectGroup: 'Science',
        feeType: 'Full Fee',
        status: 'active',
      });
    } catch (error: any) {
      console.error('Error in handleAddStudent:', error);
      setError(error.message || 'Failed to add student. Please check your connection and try again.');
      handleFirestoreError(error, OperationType.CREATE, 'students');
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !editingStudent) return;

    setIsSaving(true);
    try {
      const selectedBatch = batches.find(b => b.id === editingStudent.batchId);
      const studentRef = doc(db, 'students', editingStudent.id);
      
      await writeBatch(db).set(studentRef, {
        ...editingStudent,
        batchName: selectedBatch?.name || editingStudent.batchName,
        grade: selectedBatch?.grade || editingStudent.grade,
        updatedAt: serverTimestamp(),
      }, { merge: true }).commit();

      setIsEditModalOpen(false);
      setEditingStudent(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `students/${editingStudent.id}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteStudent = async () => {
    if (!studentToDelete) return;
    setIsSaving(true);
    try {
      await deleteDoc(doc(db, 'students', studentToDelete));
      setIsDeleteModalOpen(false);
      setStudentToDelete(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `students/${studentToDelete}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleApproveApplication = (app: any) => {
    const prefillData = {
      name: app.formData?.studentName || app.studentName || '',
      fatherName: app.formData?.fatherName || '',
      motherName: app.formData?.motherName || '',
      guardianPhone: app.formData?.guardianPhone || app.guardianPhone || '',
      address: app.formData?.address || '',
      photoUrl: app.photoUrl || '',
      batchId: app.batchId || '',
      rollNo: '',
      monthlyFee: app.monthlyFee || 0,
      admissionFee: app.admissionFee || 0,
      dateOfBirth: app.formData?.dob || '',
      birthCertificateNo: app.formData?.birthReg || '',
      nidNumber: app.formData?.nid || '',
      joinDate: app.formData?.admissionDate || new Date().toISOString().split('T')[0],
      subjectGroup: app.formData?.subjectGroup || 'Science',
      applicationId: app.id
    };
    
    setNewStudent(prev => ({ ...prev, ...prefillData }));
    setIsAddModalOpen(true);
  };

  const handleDeleteApplication = async (appId: string) => {
    try {
      await deleteDoc(doc(db, 'applications', appId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `applications/${appId}`);
    }
  };

  const filteredStudents = students.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.rollNo.includes(searchTerm);
    
    const batchId = searchParams.get('batch');
    const matchesBatch = batchId ? s.batchId === batchId : true;
    
    return matchesSearch && matchesBatch;
  });

  const filteredApplications = applications.filter(app => {
    const name = app.formData?.fullName || app.studentName || '';
    return name.toLowerCase().includes(searchTerm.toLowerCase()) || 
           app.phone?.includes(searchTerm);
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, isEdit = false) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 500000) { // 500KB limit
        alert('Image size too large. Please choose an image under 500KB.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        if (isEdit) {
          setEditingStudent({ ...editingStudent, photoUrl: reader.result as string });
        } else {
          setNewStudent({ ...newStudent, photoUrl: reader.result as string });
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const openWhatsApp = (phone: string, name: string) => {
    const message = `Hello ${name}, this is from Manage My Batch.`;
    const encodedMessage = encodeURIComponent(message);
    window.open(`https://wa.me/${phone}?text=${encodedMessage}`, '_blank');
  };

  const downloadBatchIDCards = async () => {
    if (filteredStudents.length === 0) return;
    const { jsPDF } = await import('jspdf');
    const pdf = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: [85, 54]
    });

    // Fetch institution info
    const instId = user?.institutionId || user?.uid;
    let institution: any = null;
    if (instId) {
      const instDoc = await getDoc(doc(db, 'institutions', instId));
      if (instDoc.exists()) {
        institution = instDoc.data();
      }
    }

    for (let i = 0; i < filteredStudents.length; i++) {
      const student = filteredStudents[i];
      if (i > 0) pdf.addPage([85, 54], 'landscape');

      // Background Color
      pdf.setFillColor(248, 250, 252); // Stone-50
      pdf.rect(0, 0, 85, 54, 'F');
      
      // Header section
      pdf.setFillColor(5, 150, 105); // Emerald-600
      pdf.rect(0, 0, 85, 12, 'F');
      
      // Institution Name
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'bold');
      pdf.text(institution?.name || 'STUDENT ID CARD', 42.5, 6, { align: 'center' });
      
      if (institution?.logoURL) {
        try {
          pdf.addImage(institution.logoURL, 'JPEG', 5, 2, 8, 8);
        } catch(e) { console.error("Logo add failed", e); }
      }

      // Student Photo
      pdf.setFillColor(255, 255, 255);
      pdf.setDrawColor(226, 232, 240); // Slate-200
      pdf.roundedRect(5, 15, 25, 30, 2, 2, 'FD');
      
      if (student.photoUrl) {
        try {
          pdf.addImage(student.photoUrl, 'JPEG', 6, 16, 23, 28);
        } catch(e) {
          pdf.setTextColor(148, 163, 184);
          pdf.setFontSize(14);
          pdf.text(student.name[0], 17.5, 32, { align: 'center' });
        }
      } else {
        pdf.setTextColor(148, 163, 184);
        pdf.setFontSize(14);
        pdf.text(student.name[0], 17.5, 32, { align: 'center' });
      }

      // Student Info
      pdf.setTextColor(30, 41, 59); // Slate-800
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'bold');
      pdf.text(student.name, 35, 22);
      
      pdf.setFontSize(7);
      pdf.setTextColor(100, 116, 139); // Slate-500
      pdf.setFont('helvetica', 'normal');
      pdf.text(`Roll No: ${student.rollNo}`, 35, 27);
      pdf.text(`Batch: ${student.batchName}`, 35, 31);
      pdf.text(`Phone: ${student.guardianPhone}`, 35, 35);
      
      const expiry = new Date();
      expiry.setFullYear(expiry.getFullYear() + 1);
      pdf.text(`Validity: ${expiry.toLocaleDateString()}`, 35, 42);
      
      // Footer
      pdf.line(35, 45, 80, 45);
      pdf.setFontSize(5);
      pdf.text('Authorized Signature', 57.5, 48, { align: 'center' });
    }
    
    pdf.save(`ID_Cards_${new Date().getTime()}.pdf`);
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">{t('students.title')}</h1>
          <p className="text-gray-500 mt-1">{t('students.subtitle')}</p>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="file"
            ref={importInputRef}
            onChange={handleImportCSV}
            accept=".csv"
            className="hidden"
          />
          <button
            onClick={() => setShowImportHelp(true)}
            className="p-2.5 text-indigo-600 bg-indigo-50 border border-indigo-100 rounded-xl hover:bg-indigo-100 transition-all shadow-sm"
            title="Import Help"
          >
            <HelpCircle className="w-4 h-4" />
          </button>
          <button
            onClick={() => importInputRef.current?.click()}
            disabled={isSaving}
            className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-all shadow-sm"
            title="CSV Format: Name, Phone, Batch, RollNo"
          >
            <Download className="w-4 h-4 rotate-180" /> {t('common.import', { defaultValue: 'Import' })}
          </button>
          <button 
            onClick={downloadBatchIDCards}
            className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-all shadow-sm"
          >
            <Contact className="w-4 h-4" /> ID Cards
          </button>
          <button className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-all shadow-sm">
            <Download className="w-4 h-4" /> {t('students.export')}
          </button>
          <button 
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 transition-all shadow-md shadow-indigo-200"
          >
            <Plus className="w-4 h-4" /> {t('students.addStudent')}
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2 bg-white p-1.5 rounded-2xl border border-gray-100 shadow-sm w-fit">
        <button
          onClick={() => setActiveTab('students')}
          className={cn(
            "px-6 py-2.5 text-sm font-bold rounded-xl transition-all flex items-center gap-2",
            activeTab === 'students' ? "bg-indigo-600 text-white shadow-lg shadow-indigo-100" : "text-gray-500 hover:bg-gray-50"
          )}
        >
          <Users className="w-4 h-4" /> {t('students.allStudents')}
        </button>
        <button
          onClick={() => setActiveTab('applications')}
          className={cn(
            "px-6 py-2.5 text-sm font-bold rounded-xl transition-all flex items-center gap-2",
            activeTab === 'applications' ? "bg-amber-600 text-white shadow-lg shadow-amber-100" : "text-gray-500 hover:bg-gray-50"
          )}
        >
          <FileText className="w-4 h-4" /> {t('students.applications', { defaultValue: 'Applications' })}
          {applications.length > 0 && (
            <span className={cn(
              "px-2 py-0.5 rounded-full text-[10px] font-black",
              activeTab === 'applications' ? "bg-white text-amber-600" : "bg-amber-100 text-amber-600"
            )}>
              {applications.length}
            </span>
          )}
        </button>
      </div>

      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
        <div className="relative w-full md:w-96 group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 group-focus-within:text-indigo-500 transition-colors" />
          <input
            type="text"
            placeholder={t('students.searchPlaceholder')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
          />
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto">
          <button className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition-all">
            <Filter className="w-4 h-4" /> {t('students.filter')}
          </button>
          <select className="flex-1 md:flex-none px-4 py-2.5 text-sm font-medium text-gray-600 border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all">
            <option>{t('students.allGrades')}</option>
            {GRADES.map(g => <option key={g} value={g}>{t(`common.grades.${g}`)}</option>)}
          </select>
        </div>
      </div>

      <Modal 
        isOpen={showImportHelp} 
        onClose={() => setShowImportHelp(false)} 
        title={t('students.importInstructions.title', { defaultValue: 'Import Instructions' })}
        maxWidth="max-w-xl"
      >
        <div className="space-y-6">
          <div className="p-4 bg-indigo-50 rounded-2xl border border-indigo-100 italic text-sm text-indigo-700">
            {t('students.importInstructions.description', { defaultValue: 'Follow this exact format to import students. The first row must be the header.' })}
          </div>
          
          <div className="space-y-3">
            <h4 className="text-sm font-bold text-gray-900">{t('students.importInstructions.requiredColumns', { defaultValue: 'Required Columns (in order):' })}</h4>
            <div className="grid grid-cols-2 gap-3">
              {[
                { name: t('students.addModal.name'), desc: t('students.importInstructions.nameDesc') },
                { name: t('students.addModal.guardianPhone'), desc: t('students.importInstructions.phoneDesc') },
                { name: t('students.addModal.batch'), desc: t('students.importInstructions.batchDesc') },
                { name: t('students.addModal.rollNo'), desc: t('students.importInstructions.rollDesc') }
              ].map((col) => (
                <div key={col.name} className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                  <p className="text-xs font-black text-indigo-600 uppercase tracking-widest">{col.name}</p>
                  <p className="text-[10px] text-gray-500 mt-1">{col.desc}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-gray-900 p-4 rounded-2xl overflow-x-auto border border-gray-800">
            <p className="text-[10px] text-gray-500 uppercase font-black mb-2 tracking-widest">Example CSV Content</p>
            <code className="text-xs text-indigo-300 font-mono whitespace-nowrap">
              Name,Phone,Batch,RollNo<br />
              Abir Hasan,01700000000,Science Batch 1,101<br />
              Samiul Islam,01800000000,Arts Batch A,102
            </code>
          </div>

          <button
            onClick={handleDownloadTemplate}
            className="w-full flex items-center justify-center gap-2 py-4 bg-indigo-600 text-white font-bold rounded-2xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200"
          >
            <FileDown className="w-5 h-5" />
            {t('students.importInstructions.downloadTemplate', { defaultValue: 'Download CSV Template' })}
          </button>
        </div>
      </Modal>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
        </div>
      ) : activeTab === 'students' ? (
        <Table headers={[
          t('students.table.student'),
          t('students.table.whatsapp'),
          t('students.table.batchGrade'),
          t('students.table.rollNo'),
          t('students.table.contact'),
          t('students.table.status'),
          t('students.table.actions')
        ]}>
          {filteredStudents.map((student) => (
            <TableRow key={student.id}>
              <TableCell>
                <div className="flex items-center gap-3">
                  <div 
                    className="cursor-pointer group/avatar relative"
                    onClick={() => {
                      setSelectedStudent(student);
                      setIsProfileModalOpen(true);
                    }}
                  >
                    {student.photoUrl ? (
                      <img 
                        src={student.photoUrl} 
                        alt={student.name} 
                        className="w-10 h-10 rounded-full object-cover border border-gray-100 group-hover/avatar:border-indigo-300 transition-all"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 font-bold text-sm group-hover/avatar:bg-indigo-200 transition-all">
                        {student.name.split(' ').map(n => n[0]).join('')}
                      </div>
                    )}
                  </div>
                  <div>
                    <button 
                      onClick={() => {
                        setSelectedStudent(student);
                        setIsProfileModalOpen(true);
                      }}
                      className="font-bold text-gray-900 hover:text-indigo-600 transition-colors text-left"
                    >
                      {student.name}
                    </button>
                    <p className="text-xs text-gray-500">ID: #{student.id.slice(0, 4)}</p>
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <button 
                  onClick={() => openWhatsApp(student.guardianPhone, student.name)}
                  className="p-2 text-emerald-500 hover:bg-emerald-50 rounded-xl transition-all border border-transparent hover:border-emerald-100 shadow-sm hover:shadow-md"
                  title="Send WhatsApp Message"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.414 0 .004 5.412 0 12.048c0 2.123.554 4.197 1.608 6.037L0 24l6.117-1.605a11.803 11.803 0 005.925 1.577h.005c6.632 0 12.042-5.411 12.046-12.047a11.815 11.815 0 00-3.536-8.451"/>
                  </svg>
                </button>
              </TableCell>
              <TableCell>
                <div className="flex flex-col">
                  <span className="font-medium text-gray-900">{student.batchName || 'No Batch'}</span>
                  <span className="text-xs text-gray-500">{t(`common.grades.${student.grade}`)} • Section {student.section}</span>
                </div>
              </TableCell>
              <TableCell>
                <span className="font-mono font-medium text-indigo-600 bg-indigo-50 px-2 py-1 rounded-md text-xs">
                  {student.rollNo}
                </span>
              </TableCell>
              <TableCell>
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-1.5 text-xs text-gray-500">
                    <Phone className="w-3 h-3" /> {student.guardianPhone}
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <span className={cn(
                  "px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider",
                  student.status === 'active' ? "bg-emerald-50 text-emerald-600" : "bg-gray-100 text-gray-500"
                )}>
                  {student.status}
                </span>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2 relative">
                  <button 
                    onClick={() => navigate('/messages', { state: { recipientType: 'individual', recipientId: student.id, recipientName: student.name } })}
                    className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                    title="Message Student"
                  >
                    <MessageSquare className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => {
                      setSelectedStudent(student);
                      setIsProfileModalOpen(true);
                    }}
                    className="px-3 py-1.5 text-xs font-bold text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-all"
                  >
                    {t('students.table.viewProfile', { defaultValue: 'View Profile' })}
                  </button>
                  <div className="relative">
                    <button 
                      onClick={() => setActiveMenu(activeMenu === student.id ? null : student.id)}
                      className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>
                    {activeMenu === student.id && (
                      <>
                        <div 
                          className="fixed inset-0 z-10" 
                          onClick={() => setActiveMenu(null)}
                        />
                        <div className="absolute right-0 mt-2 w-48 bg-white rounded-2xl shadow-xl border border-gray-100 py-2 z-20 overflow-hidden">
                          <button
                            onClick={() => {
                              setEditingStudent(student);
                              setIsEditModalOpen(true);
                              setActiveMenu(null);
                            }}
                            className="w-full px-4 py-2 text-left text-sm font-bold text-gray-700 hover:bg-indigo-50 hover:text-indigo-600 flex items-center gap-2 transition-colors"
                          >
                            <Plus className="w-4 h-4 rotate-45" /> {t('common.edit', { defaultValue: 'Edit' })}
                          </button>
                          <button
                            onClick={() => {
                              setStudentToDelete(student.id);
                              setIsDeleteModalOpen(true);
                              setActiveMenu(null);
                            }}
                            className="w-full px-4 py-2 text-left text-sm font-bold text-rose-600 hover:bg-rose-50 flex items-center gap-2 transition-colors"
                          >
                            <MoreVertical className="w-4 h-4" /> {t('common.delete', { defaultValue: 'Delete' })}
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </Table>
      ) : (
        <Table headers={[
          t('students.table.student'),
          t('students.table.contact'),
          t('students.table.batchGrade'),
          t('students.table.date'),
          t('students.table.actions')
        ]}>
          {filteredApplications.map((app) => (
            <TableRow key={app.id}>
              <TableCell>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
                    {app.photoUrl ? (
                      <img src={app.photoUrl} alt="App" className="w-full h-full rounded-full object-cover" />
                    ) : (
                      <User className="w-5 h-5 text-amber-600" />
                    )}
                  </div>
                  <div>
                    <p className="font-bold text-gray-900">{app.formData?.fullName || app.studentName}</p>
                    <p className="text-xs text-gray-500">Father: {app.formData?.fatherName || '—'}</p>
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <p className="text-sm font-bold text-gray-900">{app.formData?.guardianPhone || app.guardianPhone}</p>
              </TableCell>
              <TableCell>
                <div className="flex flex-col">
                  <span className="font-medium text-gray-900">{app.batchName || 'No Batch'}</span>
                  <span className="text-xs text-gray-500">{app.grade || '—'}</span>
                </div>
              </TableCell>
              <TableCell>
                <p className="text-xs text-gray-500">
                  {app.createdAt ? (typeof app.createdAt === 'string' ? formatDate(app.createdAt) : formatDate(new Date(app.createdAt.seconds * 1000).toISOString())) : '—'}
                </p>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => handleApproveApplication(app)}
                    className="px-3 py-1.5 bg-emerald-600 text-white text-xs font-bold rounded-lg hover:bg-emerald-700 transition-all flex items-center gap-1"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" /> {t('common.approve', { defaultValue: 'Approve' })}
                  </button>
                  <button 
                    onClick={() => {
                      if (confirm('Are you sure you want to discard this application?')) {
                        handleDeleteApplication(app.id);
                      }
                    }}
                    className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                  >
                    <XCircle className="w-4 h-4" />
                  </button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </Table>
      )}

      <StudentProfile 
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        student={selectedStudent}
        onEdit={(student) => {
          setEditingStudent(student);
          setIsEditModalOpen(true);
          setIsProfileModalOpen(false);
        }}
      />

      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDeleteStudent}
        title={t('students.deleteModal.title', { defaultValue: 'Delete Student' })}
        message={t('students.deleteModal.message', { defaultValue: 'Are you sure you want to delete this student? This action cannot be undone.' })}
        isLoading={isSaving}
      />

      {/* Edit Modal */}
      <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title={t('students.editModal.title', { defaultValue: 'Edit Student' })} maxWidth="max-w-3xl">
        {editingStudent && (
          <form onSubmit={handleUpdateStudent} className="space-y-8">
            {/* Photo Section */}
            <div className="flex flex-col items-center gap-4">
              <div className="relative group">
                <div className="w-24 h-24 bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl flex flex-col items-center justify-center text-gray-400 group-hover:border-indigo-500 group-hover:text-indigo-500 transition-all cursor-pointer overflow-hidden">
                  {editingStudent.photoUrl ? (
                    <img src={editingStudent.photoUrl} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <>
                      <User className="w-8 h-8 mb-1" />
                      <span className="text-[10px] font-bold uppercase tracking-wider">{t('students.addModal.photo')}</span>
                    </>
                  )}
                </div>
                <input 
                  type="file" 
                  accept="image/*"
                  onChange={(e) => handleFileChange(e, true)}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                  title="Click to upload photo"
                />
              </div>
              <div className="text-center space-y-2">
                <div>
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">{t('students.addModal.photo')}</p>
                  <p className="text-[10px] text-gray-400 mt-1">{t('students.addModal.photoDesc')}</p>
                </div>
                <input
                  type="text"
                  placeholder={t('students.addModal.photoPlaceholder')}
                  value={editingStudent.photoUrl?.startsWith('data:') ? '' : editingStudent.photoUrl}
                  onChange={e => setEditingStudent({...editingStudent, photoUrl: e.target.value})}
                  className="w-full max-w-xs px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-[10px] focus:outline-none focus:ring-1 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">{t('students.addModal.name')}*</label>
                <input
                  required
                  type="text"
                  value={editingStudent.name}
                  onChange={e => setEditingStudent({...editingStudent, name: e.target.value})}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">{t('students.addModal.rollNo')}</label>
                <input
                  type="text"
                  value={editingStudent.rollNo}
                  onChange={e => setEditingStudent({...editingStudent, rollNo: e.target.value})}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">{t('students.addModal.dob')}</label>
                <input
                  type="date"
                  value={editingStudent.dateOfBirth}
                  onChange={e => setEditingStudent({...editingStudent, dateOfBirth: e.target.value})}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">{t('students.addModal.birthCert')}</label>
                <input
                  type="text"
                  value={editingStudent.birthCertificateNo}
                  onChange={e => setEditingStudent({...editingStudent, birthCertificateNo: e.target.value})}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">{t('students.addModal.nid')}</label>
                <input
                  type="text"
                  value={editingStudent.nidNumber}
                  onChange={e => setEditingStudent({...editingStudent, nidNumber: e.target.value})}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">{t('students.addModal.fatherName')}</label>
                <input
                  type="text"
                  value={editingStudent.fatherName}
                  onChange={e => setEditingStudent({...editingStudent, fatherName: e.target.value})}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">{t('students.addModal.motherName')}</label>
                <input
                  type="text"
                  value={editingStudent.motherName}
                  onChange={e => setEditingStudent({...editingStudent, motherName: e.target.value})}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">{t('students.addModal.guardianPhone')}*</label>
                <input
                  required
                  type="text"
                  value={editingStudent.guardianPhone}
                  onChange={e => setEditingStudent({...editingStudent, guardianPhone: e.target.value})}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">{t('students.addModal.batch')}*</label>
                <select
                  required
                  value={editingStudent.batchId}
                  onChange={e => {
                    const batch = batches.find(b => b.id === e.target.value);
                    setEditingStudent({
                      ...editingStudent, 
                      batchId: e.target.value,
                      batchName: batch?.name || '',
                      grade: batch?.grade || editingStudent.grade
                    });
                  }}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                >
                  <option value="">Select batch...</option>
                  {batches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">{t('students.addModal.monthlyFee')}</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">৳</span>
                  <input
                    type="number"
                    value={editingStudent.monthlyFee}
                    onChange={e => setEditingStudent({...editingStudent, monthlyFee: parseFloat(e.target.value)})}
                    className="w-full pl-8 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">{t('students.addModal.subjectGroup')}</label>
                <select
                  value={editingStudent.subjectGroup}
                  onChange={e => setEditingStudent({...editingStudent, subjectGroup: e.target.value})}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                >
                  <option value="Science">Science</option>
                  <option value="Commerce">Commerce</option>
                  <option value="Arts">Arts</option>
                  <option value="General">General</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">{t('students.addModal.status', { defaultValue: 'Status' })}</label>
                <select
                  value={editingStudent.status}
                  onChange={e => setEditingStudent({...editingStudent, status: e.target.value as 'active' | 'inactive'})}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">{t('students.addModal.address')}</label>
                <textarea
                  rows={3}
                  value={editingStudent.address}
                  onChange={e => setEditingStudent({...editingStudent, address: e.target.value})}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all resize-none"
                />
              </div>
            </div>

            <div className="flex items-center gap-4 pt-4">
              <button 
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="flex-1 py-4 bg-gray-100 text-gray-600 rounded-2xl font-bold hover:bg-gray-200 transition-all"
              >
                {t('common.cancel')}
              </button>
              <button 
                type="submit" 
                disabled={isSaving}
                className="flex-[2] py-4 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                {t('common.saveChanges', { defaultValue: 'Save Changes' })}
              </button>
            </div>
          </form>
        )}
      </Modal>

      <StudentProfile 
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        student={selectedStudent}
      />

      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title={t('students.addModal.title')} maxWidth="max-w-3xl">
        <form onSubmit={handleAddStudent} className="space-y-8">
          {error && (
            <div className="p-4 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm font-medium">
              {error}
            </div>
          )}
          {/* Photo Section */}
          <div className="flex flex-col items-center gap-4">
            <div className="relative group">
              <div className="w-24 h-24 bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl flex flex-col items-center justify-center text-gray-400 group-hover:border-indigo-500 group-hover:text-indigo-500 transition-all cursor-pointer overflow-hidden">
                {newStudent.photoUrl ? (
                  <img src={newStudent.photoUrl} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                  <>
                    <User className="w-8 h-8 mb-1" />
                    <span className="text-[10px] font-bold uppercase tracking-wider">{t('students.addModal.photo')}</span>
                  </>
                )}
              </div>
              <input 
                type="file" 
                accept="image/*"
                onChange={handleFileChange}
                className="absolute inset-0 opacity-0 cursor-pointer"
                title="Click to upload photo"
              />
            </div>
            <div className="text-center space-y-2">
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">{t('students.addModal.photo')}</p>
                <p className="text-[10px] text-gray-400 mt-1">{t('students.addModal.photoDesc')}</p>
              </div>
              <input
                type="text"
                placeholder={t('students.addModal.photoPlaceholder')}
                value={newStudent.photoUrl?.startsWith('data:') ? '' : newStudent.photoUrl}
                onChange={e => setNewStudent({...newStudent, photoUrl: e.target.value})}
                className="w-full max-w-xs px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-[10px] focus:outline-none focus:ring-1 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">{t('students.addModal.name')}*</label>
              <input
                required
                type="text"
                placeholder="e.g. Rahim Uddin"
                value={newStudent.name}
                onChange={e => setNewStudent({...newStudent, name: e.target.value})}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">{t('students.addModal.rollNo')}</label>
              <input
                type="text"
                placeholder="e.g. 001"
                value={newStudent.rollNo}
                onChange={e => setNewStudent({...newStudent, rollNo: e.target.value})}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">{t('students.addModal.dob')}</label>
              <input
                type="date"
                value={newStudent.dateOfBirth}
                onChange={e => setNewStudent({...newStudent, dateOfBirth: e.target.value})}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">{t('students.addModal.birthCert')}</label>
              <input
                type="text"
                placeholder="e.g. 2005..."
                value={newStudent.birthCertificateNo}
                onChange={e => setNewStudent({...newStudent, birthCertificateNo: e.target.value})}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">{t('students.addModal.nid')}</label>
              <input
                type="text"
                placeholder="e.g. 1234..."
                value={newStudent.nidNumber}
                onChange={e => setNewStudent({...newStudent, nidNumber: e.target.value})}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">{t('students.addModal.fatherName')}</label>
              <input
                type="text"
                placeholder="e.g. Abdul Karim"
                value={newStudent.fatherName}
                onChange={e => setNewStudent({...newStudent, fatherName: e.target.value})}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">{t('students.addModal.motherName')}</label>
              <input
                type="text"
                placeholder="e.g. Fatema Begum"
                value={newStudent.motherName}
                onChange={e => setNewStudent({...newStudent, motherName: e.target.value})}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">{t('students.addModal.guardianPhone')}*</label>
              <input
                required
                type="text"
                placeholder="e.g. 01711-123456"
                value={newStudent.guardianPhone}
                onChange={e => setNewStudent({...newStudent, guardianPhone: e.target.value})}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">{t('students.addModal.joinDate')}*</label>
              <input
                required
                type="date"
                value={newStudent.joinDate}
                onChange={e => setNewStudent({...newStudent, joinDate: e.target.value})}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">{t('students.addModal.batch')}*</label>
              <select
                required
                value={newStudent.batchId}
                onChange={e => {
                  const batch = batches.find(b => b.id === e.target.value);
                  if (batch) {
                    let mFee = batch.monthlyFee || 0;
                    let aFee = batch.admissionFee || 0;
                    
                    if (newStudent.feeType === 'Half Fee') {
                      mFee = mFee / 2;
                      aFee = aFee / 2;
                    } else if (newStudent.feeType === 'Scholarship') {
                      mFee = 0;
                      aFee = 0;
                    }

                    setNewStudent({
                      ...newStudent, 
                      batchId: e.target.value,
                      batchName: batch.name,
                      grade: batch.grade,
                      section: batch.section,
                      monthlyFee: mFee,
                      admissionFee: aFee
                    });
                  } else {
                    setNewStudent({
                      ...newStudent, 
                      batchId: e.target.value,
                      batchName: '',
                      monthlyFee: 0,
                      admissionFee: 0
                    });
                  }
                }}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
              >
                <option value="">Select batch...</option>
                {batches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">{t('students.addModal.admissionFee')}</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">৳</span>
                <input
                  readOnly={newStudent.feeType !== 'Custom'}
                  type="number"
                  value={newStudent.admissionFee}
                  onChange={e => {
                    const val = e.target.value === '' ? 0 : parseFloat(e.target.value);
                    setNewStudent({...newStudent, admissionFee: isNaN(val) ? 0 : val});
                  }}
                  className={cn(
                    "w-full pl-8 pr-4 py-3 border rounded-xl text-sm focus:outline-none transition-all",
                    newStudent.feeType === 'Custom' ? "bg-white border-indigo-500" : "bg-gray-100 border-gray-200 cursor-not-allowed"
                  )}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">{t('students.addModal.monthlyFee')}</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">৳</span>
                <input
                  readOnly={newStudent.feeType !== 'Custom'}
                  type="number"
                  value={newStudent.monthlyFee}
                  onChange={e => {
                    const val = e.target.value === '' ? 0 : parseFloat(e.target.value);
                    setNewStudent({...newStudent, monthlyFee: isNaN(val) ? 0 : val});
                  }}
                  className={cn(
                    "w-full pl-8 pr-4 py-3 border rounded-xl text-sm focus:outline-none transition-all",
                    newStudent.feeType === 'Custom' ? "bg-white border-indigo-500" : "bg-gray-100 border-gray-200 cursor-not-allowed"
                  )}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">{t('students.addModal.subjectGroup')}</label>
              <select
                value={newStudent.subjectGroup}
                onChange={e => setNewStudent({...newStudent, subjectGroup: e.target.value})}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
              >
                <option value="Science">Science</option>
                <option value="Commerce">Commerce</option>
                <option value="Arts">Arts</option>
                <option value="General">General</option>
              </select>
            </div>

            <div className="space-y-4 md:col-span-2 bg-indigo-50/50 p-6 rounded-2xl border border-indigo-100">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">{t('students.addModal.feeType')}</label>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className="flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-xl cursor-pointer hover:border-indigo-500 transition-all">
                  <input
                    type="checkbox"
                    checked={newStudent.isAdmissionFeePaid}
                    onChange={e => setNewStudent({...newStudent, isAdmissionFeePaid: e.target.checked})}
                    className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                  />
                  <span className="text-sm font-medium text-gray-700">{t('students.addModal.skipAdmissionFee')}</span>
                </label>
                <label className="flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-xl cursor-pointer hover:border-indigo-500 transition-all">
                  <input
                    type="checkbox"
                    checked={newStudent.isMonthlyFeePaid}
                    onChange={e => setNewStudent({...newStudent, isMonthlyFeePaid: e.target.checked})}
                    className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                  />
                  <span className="text-sm font-medium text-gray-700">{t('students.addModal.skipMonthlyFee')}</span>
                </label>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {['Full Fee', 'Half Fee', 'Scholarship', 'Custom'].map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => {
                      const selectedBatch = batches.find(b => b.id === newStudent.batchId);
                      let mFee = selectedBatch?.monthlyFee || 0;
                      let aFee = selectedBatch?.admissionFee || 0;

                      if (type === 'Half Fee') {
                        mFee = mFee / 2;
                        aFee = aFee / 2;
                      } else if (type === 'Scholarship') {
                        mFee = 0;
                        aFee = 0;
                      }

                      setNewStudent({
                        ...newStudent, 
                        feeType: type as any,
                        monthlyFee: mFee,
                        admissionFee: aFee
                      });
                    }}
                    className={cn(
                      "py-3 px-4 rounded-xl text-sm font-bold transition-all border",
                      newStudent.feeType === type 
                        ? "bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-200" 
                        : "bg-white text-gray-600 border-gray-100 hover:border-indigo-200"
                    )}
                  >
                    {type === 'Full Fee' && '💰 '}
                    {type === 'Half Fee' && '🌓 '}
                    {type === 'Scholarship' && '🎓 '}
                    {type === 'Custom' && '⚙️ '}
                    {type}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-4 md:col-span-2">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">{t('students.addModal.feeStatus', { defaultValue: 'Fee Payment Status' })}</label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className="flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-100 rounded-2xl cursor-pointer hover:bg-emerald-100 transition-all">
                  <input
                    type="checkbox"
                    checked={newStudent.isAdmissionFeePaid}
                    onChange={e => setNewStudent({...newStudent, isAdmissionFeePaid: e.target.checked})}
                    className="w-5 h-5 rounded border-emerald-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-emerald-900">{t('students.addModal.admissionPaid', { defaultValue: 'Admission Fee Paid' })}</span>
                    <span className="text-[10px] text-emerald-600 font-medium">Auto-records as paid fee</span>
                  </div>
                </label>
                <label className="flex items-center gap-3 p-4 bg-indigo-50 border border-indigo-100 rounded-2xl cursor-pointer hover:bg-indigo-100 transition-all">
                  <input
                    type="checkbox"
                    checked={newStudent.isMonthlyFeePaid}
                    onChange={e => setNewStudent({...newStudent, isMonthlyFeePaid: e.target.checked})}
                    className="w-5 h-5 rounded border-indigo-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-indigo-900">{t('students.addModal.monthlyPaid', { defaultValue: 'Monthly Fee Paid' })}</span>
                    <span className="text-[10px] text-indigo-600 font-medium">For joining month ({MONTHS[new Date(newStudent.joinDate || new Date()).getMonth()]})</span>
                  </div>
                </label>
              </div>
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">{t('students.addModal.address')}</label>
              <textarea
                rows={3}
                placeholder={t('students.addModal.addressPlaceholder')}
                value={newStudent.address}
                onChange={e => setNewStudent({...newStudent, address: e.target.value})}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all resize-none"
              />
            </div>
          </div>

          <div className="flex items-center gap-4 pt-4">
            <button 
              type="button"
              onClick={() => setIsAddModalOpen(false)}
              className="flex-1 py-4 bg-gray-100 text-gray-600 rounded-2xl font-bold hover:bg-gray-200 transition-all"
            >
              {t('common.cancel')}
            </button>
            <button 
              type="submit" 
              disabled={isSaving}
              className="flex-[2] py-4 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
              {t('students.addStudent')}
            </button>
          </div>
        </form>
      </Modal>

      <SubscriptionModal 
        isOpen={isUpgradeModalOpen} 
        onClose={() => setIsUpgradeModalOpen(false)} 
      />
      {/* Success Modal with WhatsApp Action */}
      <ConfirmModal
        isOpen={isSuccessModalOpen}
        onClose={() => setIsSuccessModalOpen(false)}
        onConfirm={() => {
          if (successInfo?.whatsappUrl) {
            window.open(successInfo.whatsappUrl, '_blank');
          }
          setIsSuccessModalOpen(false);
        }}
        title={successInfo?.title || ''}
        message={successInfo?.message || ''}
        variant="info"
        confirmText={t('common.sendWhatsApp', { defaultValue: 'Send WhatsApp' })}
        cancelText={t('common.done', { defaultValue: 'Done' })}
      />
    </div>
  );
}
