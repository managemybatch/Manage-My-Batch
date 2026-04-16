import React, { useState, useEffect } from 'react';
import { Plus, Search, Filter, MoreVertical, Mail, Phone, Download, Loader2, Layers, User, MessageSquare } from 'lucide-react';
import { Table, TableRow, TableCell } from '../components/Table';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';
import { collection, onSnapshot, query, addDoc, serverTimestamp, deleteDoc, doc, writeBatch, where, orderBy, increment } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { useAuth } from '../lib/auth';
import { Modal } from '../components/Modal';
import { ConfirmModal } from '../components/ConfirmModal';
import { GRADES, SECTIONS, SUBSCRIPTION_PLANS } from '../constants';
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
  const [isSaving, setIsSaving] = useState(false);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
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
    status: 'active' as const,
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

    return () => {
      unsubBatches();
      unsubStudents();
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
      if (admissionFee > 0) {
        const admissionFeeRef = doc(collection(db, 'fees'));
        firestoreBatch.set(admissionFeeRef, {
          studentId: studentRef.id,
          studentName: newStudent.name,
          amount: admissionFee,
          date: new Date().toISOString(),
          month: new Date().toLocaleString('default', { month: 'long' }),
          year: new Date().getFullYear(),
          status: 'paid', // Collected at admission
          type: 'Admission Fee',
          institutionId: user.institutionId || user.uid,
          createdBy: user.uid,
          createdAt: serverTimestamp(),
        });
      }

      // Create First Monthly Fee Record
      if (monthlyFee > 0) {
        const monthlyFeeRef = doc(collection(db, 'fees'));
        firestoreBatch.set(monthlyFeeRef, {
          studentId: studentRef.id,
          studentName: newStudent.name,
          amount: monthlyFee,
          date: new Date().toISOString(),
          month: new Date().toLocaleString('default', { month: 'long' }),
          year: new Date().getFullYear(),
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
      
      // Send Admission Message
      const message = t('students.addModal.successMsg', {
        name: newStudent.name,
        aFee: admissionFee,
        mFee: monthlyFee,
        total: admissionFee + monthlyFee
      });
      const encodedMessage = encodeURIComponent(message);
      try {
        const cleanPhone = newStudent.guardianPhone.replace(/[^0-9]/g, '');
        window.open(`https://wa.me/${cleanPhone}?text=${encodedMessage}`, '_blank');
      } catch (e) {
        console.error('Failed to open WhatsApp', e);
      }

      setIsAddModalOpen(false);
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

  const filteredStudents = students.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.rollNo.includes(searchTerm);
    
    const batchId = searchParams.get('batch');
    const matchesBatch = batchId ? s.batchId === batchId : true;
    
    return matchesSearch && matchesBatch;
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

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">{t('students.title')}</h1>
          <p className="text-gray-500 mt-1">{t('students.subtitle')}</p>
        </div>
        <div className="flex items-center gap-3">
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

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
        </div>
      ) : (
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
                  <div className="flex items-center gap-1.5 text-xs text-gray-500">
                    <Mail className="w-3 h-3" /> {student.email || 'N/A'}
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

            <div className="space-y-2 md:col-span-2">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">{t('students.addModal.feeType')}</label>
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
                        feeType: type,
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
    </div>
  );
}
