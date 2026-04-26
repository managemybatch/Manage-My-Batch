import React, { useState, useEffect } from 'react';
import { ClipboardCheck, Search, Filter, CheckCircle2, XCircle, Clock, Loader2, Link as LinkIcon, Users, Save, ChevronRight, ArrowLeft, Copy, ExternalLink, Trash2, Calendar, FileText, Download, MessageCircle, MoreVertical } from 'lucide-react';
import { Table, TableRow, TableCell } from '../components/Table';
import { cn } from '../lib/utils';
import { collection, onSnapshot, query, addDoc, serverTimestamp, where, getDocs, writeBatch, doc, deleteDoc, orderBy } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { useAuth } from '../lib/auth';
import { Modal } from '../components/Modal';
import { ConfirmModal } from '../components/ConfirmModal';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'motion/react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Teacher } from '../types';

interface AttendanceRecord {
  id: string;
  studentId: string;
  studentName: string;
  date: string;
  status: 'present' | 'absent' | 'late';
  delay?: number;
  batchId: string;
}

interface Student {
  id: string;
  name: string;
  rollNo: string;
  batchId: string;
  status?: 'active' | 'inactive';
}

interface Batch {
  id: string;
  name: string;
  studentCount: number;
  classTeacherId?: string;
  classTeacherName?: string;
}

interface AttendanceSubmission {
  id: string;
  batchId: string;
  batchName: string;
  date: string;
  records: Record<string, any>;
  status: 'pending' | 'approved';
  createdAt: any;
}

interface DelayInputProps {
  value: number;
  onSave: (val: number) => void;
}

function DelayInput({ value, onSave }: DelayInputProps) {
  const [localVal, setLocalVal] = useState(value);

  useEffect(() => {
    setLocalVal(value);
  }, [value]);

  return (
    <div className="flex items-center gap-1.5 px-2 py-1 bg-white border border-amber-200 rounded-lg w-fit">
      <span className="text-[10px] font-black text-amber-600 uppercase tracking-widest">Delay:</span>
      <input 
        type="number" 
        value={localVal === 0 ? '' : localVal}
        onChange={(e) => setLocalVal(parseInt(e.target.value) || 0)}
        onBlur={() => onSave(localVal)}
        className="w-12 px-1.5 py-0.5 border border-amber-100 rounded text-xs font-bold text-amber-700 focus:outline-none focus:ring-1 focus:ring-amber-500"
      />
      <span className="text-[10px] font-bold text-amber-500 uppercase">min</span>
    </div>
  );
}

export function Attendance() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [batches, setBatches] = useState<Batch[]>([]);
  const [submissions, setSubmissions] = useState<AttendanceSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  const today = new Date().toISOString().split('T')[0];

  // Manual Attendance State
  const [selectedBatch, setSelectedBatch] = useState<Batch | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [attendance, setAttendance] = useState<Record<string, AttendanceRecord>>({});
  const [markingLoading, setMarkingLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Link State
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  
  // New States
  const [activeTab, setActiveTab] = useState<'batches' | 'reports'>('batches');
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  
  // Reports State
  const [reportBatch, setReportBatch] = useState<string>('all');
  const [reportType, setReportType] = useState<'daily' | 'monthly' | 'custom'>('daily');
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);

  useEffect(() => {
    if (!user) return;
    const instId = user.institutionId || user.uid;

    // Fetch Batches
    const unsubscribeBatches = onSnapshot(
      query(collection(db, 'batches'), where('institutionId', '==', instId)),
      (snapshot) => {
        const batchData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Batch[];
        setBatches(batchData);
        setLoading(false);
      }
    );

    // Fetch Teachers
    const unsubscribeTeachers = onSnapshot(
      query(collection(db, 'teachers'), where('institutionId', '==', instId)),
      (snapshot) => {
        const teacherData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Teacher[];
        setTeachers(teacherData);
      }
    );

    // Fetch Submissions
    const unsubscribeSubmissions = onSnapshot(
      query(
        collection(db, 'attendance_submissions'), 
        where('institutionId', '==', instId),
        where('status', '==', 'pending')
      ),
      (snapshot) => {
        const submissionData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as AttendanceSubmission[];
        setSubmissions(submissionData);
      }
    );

    return () => {
      unsubscribeBatches();
      unsubscribeTeachers();
      unsubscribeSubmissions();
    };
  }, [user]);

  const handleStartManualAttendance = async (batch: Batch) => {
    setSelectedBatch(batch);
    setMarkingLoading(true);
    try {
      const instId = user?.institutionId || user?.uid;
      // Fetch students for this batch
      const q = query(
        collection(db, 'students'),
        where('institutionId', '==', instId),
        where('batchId', '==', batch.id)
      );
      const snapshot = await getDocs(q);
      const studentData = snapshot.docs
        .map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Student[];
      
      setStudents(studentData.filter(s => s.status !== 'inactive'));

      // Fetch today's attendance
      const attQ = query(
        collection(db, 'attendance'),
        where('institutionId', '==', instId),
        where('date', '==', today),
        where('batchId', '==', batch.id)
      );
      const attSnapshot = await getDocs(attQ);
      const attData: Record<string, AttendanceRecord> = {};
      attSnapshot.docs.forEach(doc => {
        const data = doc.data() as AttendanceRecord;
        attData[data.studentId] = { id: doc.id, ...data };
      });
      setAttendance(attData);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'attendance');
    } finally {
      setMarkingLoading(false);
    }
  };

  const handleMarkAttendance = (student: Student, status: 'present' | 'absent' | 'late') => {
    setAttendance(prev => ({
      ...prev,
      [student.id]: {
        id: prev[student.id]?.id || '',
        studentId: student.id,
        studentName: student.name,
        date: today,
        status,
        delay: status === 'late' ? (prev[student.id]?.delay || 5) : undefined,
        batchId: student.batchId,
      }
    }));
  };

  const handleUpdateDelay = (studentId: string, delay: number) => {
    setAttendance(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        delay
      }
    }));
  };

  const handleSaveAttendance = async () => {
    if (!user || !selectedBatch) return;
    setSaving(true);
    try {
      const batch = writeBatch(db);
      const instId = user.institutionId || user.uid;
      
      Object.values(attendance).forEach((record: AttendanceRecord) => {
        if (record.id) {
          const docRef = doc(db, 'attendance', record.id);
          const { id, ...recordData } = record;
          batch.update(docRef, {
            ...recordData,
            updatedAt: serverTimestamp(),
          });
        } else {
          const docRef = doc(collection(db, 'attendance'));
          const { id, ...recordData } = record;
          batch.set(docRef, {
            ...recordData,
            institutionId: instId,
            markedBy: user.uid,
            createdAt: serverTimestamp(),
          });
        }
      });
      
      await batch.commit();
      setSuccessMessage('Attendance saved successfully!');
      setIsSuccessModalOpen(true);
      setSelectedBatch(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'attendance');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateLink = (batch: Batch) => {
    const baseUrl = window.location.origin;
    const token = Math.random().toString(36).substring(7);
    const link = `${baseUrl}/public/attendance/${batch.id}/${token}`;
    setGeneratedLink(link);
    setIsLinkModalOpen(true);
  };

  const handleSendToWhatsApp = (batch: Batch) => {
    const teacher = teachers.find(t => t.id === batch.classTeacherId);
    if (!teacher || !teacher.phone) {
      alert('Teacher phone number not found.');
      return;
    }

    const baseUrl = window.location.origin;
    const token = Math.random().toString(36).substring(7);
    const link = `${baseUrl}/public/attendance/${batch.id}/${token}`;
    
    const message = `Hello ${teacher.name}, here is the attendance link for batch ${batch.name}: ${link}`;
    const whatsappUrl = `https://wa.me/${teacher.phone}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  const downloadPDFReport = async () => {
    if (!user) return;
    setIsGeneratingReport(true);
    try {
      const instId = user.institutionId || user.uid;
      const institutionName = user.institutionName || 'Our Institute';
      
      // Fetch data based on filters
      let attQuery = query(
        collection(db, 'attendance'),
        where('institutionId', '==', instId)
      );

      if (reportBatch !== 'all') {
        attQuery = query(attQuery, where('batchId', '==', reportBatch));
      }

      // Date filtering
      let fetchStart = startDate;
      let fetchEnd = endDate;

      if (reportType === 'daily') {
        fetchEnd = fetchStart;
      } else if (reportType === 'monthly') {
        const date = new Date(startDate);
        const year = date.getFullYear();
        const month = date.getMonth();
        const firstDay = new Date(year, month, 1).toISOString().split('T')[0];
        const lastDay = new Date(year, month + 1, 0).toISOString().split('T')[0];
        fetchStart = firstDay;
        fetchEnd = lastDay;
      }

      attQuery = query(attQuery, where('date', '>=', fetchStart), where('date', '<=', fetchEnd));
      
      const snapshot = await getDocs(attQuery);
      const records = snapshot.docs.map(d => d.data() as AttendanceRecord);

      if (records.length === 0) {
        alert('No attendance records found for the selected criteria.');
        return;
      }

      // Format data for PDF
      // Group by batch, then by student
      const groupedData: Record<string, Record<string, Record<string, string>>> = {}; 
      // batchId -> studentId -> date -> status

      const studentNames: Record<string, string> = {};
      const batchNames: Record<string, string> = {};
      const uniqueDates = Array.from(new Set(records.map(r => r.date))).sort();

      records.forEach(r => {
        if (!groupedData[r.batchId]) groupedData[r.batchId] = {};
        if (!groupedData[r.batchId][r.studentId]) groupedData[r.batchId][r.studentId] = {};
        groupedData[r.batchId][r.studentId][r.date] = r.status.charAt(0).toUpperCase(); // P, A, L
        studentNames[r.studentId] = r.studentName;
        const b = batches.find(bat => bat.id === r.batchId);
        batchNames[r.batchId] = b ? b.name : 'Unknown Batch';
      });

      const doc = new jsPDF('l', 'mm', 'a4'); // Landscape for better table fit
      let firstPage = true;

      Object.entries(groupedData).forEach(([bId, sData], bIdx) => {
        if (!firstPage) doc.addPage();
        firstPage = false;

        // Header
        const logoUrl = user?.photoURL || '';
        if (logoUrl) {
          try {
            doc.addImage(logoUrl, 'PNG', 14, 10, 15, 15);
          } catch (e) {
            console.error("Logo error", e);
          }
        }

        doc.setFontSize(18);
        doc.setTextColor(40);
        doc.setFont("helvetica", "bold");
        doc.text(institutionName, logoUrl ? 32 : 14, 18);
        
        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.setFont("helvetica", "normal");
        doc.text(`Attendance Report: ${batchNames[bId]}`, logoUrl ? 32 : 14, 24);
        doc.text(`Period: ${fetchStart} to ${fetchEnd}`, logoUrl ? 32 : 14, 29);

        // Prep table
        const headers = [['Student', ...uniqueDates]];
        const rows = Object.entries(sData).map(([sId, dates]) => {
          return [
            studentNames[sId],
            ...uniqueDates.map(d => dates[d] || '-')
          ];
        });

        autoTable(doc, {
          startY: 35,
          head: headers,
          body: rows,
          theme: 'grid',
          styles: { halign: 'center', fontSize: 7, textColor: [50, 50, 50] },
          columnStyles: { 0: { halign: 'left', fontStyle: 'bold', minCellWidth: 30 } },
          headStyles: { fillColor: [31, 41, 55], textColor: [255, 255, 255], fontStyle: 'bold' },
          alternateRowStyles: { fillColor: [249, 250, 251] }
        });

        // App Credit
        const pageCount = (doc as any).internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
          doc.setPage(i);
          const pageSize = doc.internal.pageSize;
          const pageHeight = pageSize.height ? pageSize.height : pageSize.getHeight();
          
          doc.setFontSize(7);
          doc.setTextColor(150);
          doc.text(
            `Generated on: ${new Date().toLocaleString()} | Page ${i} of ${pageCount}`,
            14,
            pageHeight - 8
          );
          doc.text(
            "Powered by: Manage My Batch Management System",
            pageSize.width - 70,
            pageHeight - 8
          );
        }
      });

      doc.save(`Attendance_Report_${fetchStart}.pdf`);
    } catch (error) {
      console.error('Error generating report:', error);
      alert('Failed to generate report.');
    } finally {
      setIsGeneratingReport(false);
    }
  };

  const handleApproveSubmission = async (submission: AttendanceSubmission) => {
    if (!user) return;
    setSaving(true);
    try {
      const batch = writeBatch(db);
      const instId = user.institutionId || user.uid;
      
      // Get students for this batch to have their names
      const q = query(collection(db, 'students'), where('batchId', '==', submission.batchId));
      const snapshot = await getDocs(q);
      const studentMap: Record<string, string> = {};
      snapshot.docs.forEach(doc => {
        studentMap[doc.id] = doc.data().name;
      });

      Object.entries(submission.records).forEach(([studentId, record]) => {
        const docRef = doc(collection(db, 'attendance'));
        const status = typeof record === 'string' ? record : record.status;
        const delay = typeof record === 'string' ? undefined : record.delay;

        batch.set(docRef, {
          studentId,
          studentName: studentMap[studentId] || 'Unknown',
          date: submission.date,
          status,
          delay,
          batchId: submission.batchId,
          institutionId: instId,
          markedBy: 'public_link',
          createdAt: serverTimestamp(),
        });
      });

      // Update submission status
      batch.update(doc(db, 'attendance_submissions', submission.id), {
        status: 'approved',
        approvedAt: serverTimestamp(),
        approvedBy: user.uid
      });
      
      await batch.commit();
      setSuccessMessage('Submission approved and attendance recorded!');
      setIsSuccessModalOpen(true);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'attendance');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSubmission = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this submission?')) return;
    try {
      await deleteDoc(doc(db, 'attendance_submissions', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `attendance_submissions/${id}`);
    }
  };

  const filteredBatches = batches.filter(b => 
    b.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (selectedBatch) {
    return (
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <button 
            onClick={() => setSelectedBatch(null)}
            className="flex items-center gap-2 text-gray-500 hover:text-indigo-600 font-bold transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            {t('attendance.back')}
          </button>
          <div className="flex items-center gap-3">
            <div className="bg-white px-4 py-2 rounded-xl border border-gray-100 shadow-sm flex items-center gap-2">
              <span className="text-sm font-bold text-gray-700">{t('attendance.date')}: {today}</span>
            </div>
            <button 
              onClick={handleSaveAttendance}
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2.5 text-sm font-black text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {t('attendance.approve')}
            </button>
          </div>
        </div>

        <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
          <h2 className="text-2xl font-black text-gray-900 tracking-tight mb-1">{selectedBatch.name}</h2>
          <p className="text-gray-500 font-medium">{t('attendance.manualRegisterDesc')}</p>
        </div>

        {markingLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
          </div>
        ) : (
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
            {/* Desktop Table View */}
            <div className="hidden sm:block">
              <Table headers={[
                t('attendance.table.student'),
                t('attendance.table.rollNo'),
                t('attendance.table.status'),
                t('attendance.table.actions')
              ]}>
                {students.map((student) => {
                  const record = attendance[student.id];
                  return (
                    <TableRow key={student.id}>
                      <TableCell>
                        <p className="font-bold text-gray-900 group-hover:text-indigo-600 transition-colors">{student.name}</p>
                      </TableCell>
                      <TableCell>
                        <span className="font-mono font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg text-xs">
                          {student.rollNo}
                        </span>
                      </TableCell>
                      <TableCell>
                        {record ? (
                          <div className={cn(
                            "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider w-fit",
                            record.status === 'present' ? "bg-emerald-50 text-emerald-600" : 
                            record.status === 'absent' ? "bg-rose-50 text-rose-600" : "bg-amber-50 text-amber-600"
                          )}>
                            {record.status === 'present' ? <CheckCircle2 className="w-3 h-3" /> : 
                             record.status === 'absent' ? <XCircle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                            {t(`attendance.status.${record.status}`)}
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400 italic font-medium">{t('attendance.status.notMarked')}</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-2">
                          <div className="flex items-center gap-2">
                            <button 
                              onClick={() => handleMarkAttendance(student, 'present')}
                              className={cn(
                                "p-2.5 rounded-xl border transition-all",
                                record?.status === 'present' ? "bg-emerald-100 border-emerald-100 text-emerald-700 shadow-sm" : "text-gray-300 hover:bg-emerald-50 hover:text-emerald-600"
                              )} 
                              title={t('attendance.status.present')}
                            >
                              <CheckCircle2 className="w-5 h-5" />
                            </button>
                            <button 
                              onClick={() => handleMarkAttendance(student, 'absent')}
                              className={cn(
                                "p-2.5 rounded-xl border transition-all",
                                record?.status === 'absent' ? "bg-rose-100 border-rose-100 text-rose-700 shadow-sm" : "text-gray-300 hover:bg-rose-50 hover:text-rose-600"
                              )} 
                              title={t('attendance.status.absent')}
                            >
                              <XCircle className="w-5 h-5" />
                            </button>
                            <button 
                              onClick={() => handleMarkAttendance(student, 'late')}
                              className={cn(
                                "p-2.5 rounded-xl border transition-all",
                                record?.status === 'late' ? "bg-amber-100 border-amber-100 text-amber-700 shadow-sm" : "text-gray-300 hover:bg-amber-50 hover:text-amber-600"
                              )} 
                              title={t('attendance.status.late')}
                            >
                              <Clock className="w-5 h-5" />
                            </button>
                          </div>
                          {record?.status === 'late' && (
                            <DelayInput 
                              value={record.delay || 5} 
                              onSave={(val) => handleUpdateDelay(student.id, val)} 
                            />
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </Table>
            </div>

            {/* Mobile Card View */}
            <div className="sm:hidden divide-y divide-gray-100">
              {students.map((student) => {
                const record = attendance[student.id];
                return (
                  <div key={student.id} className="p-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-black text-gray-900">{student.name}</p>
                        <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest mt-0.5">Roll: {student.rollNo}</p>
                      </div>
                      {record && (
                        <div className="flex flex-col items-end gap-1">
                          <div className={cn(
                            "flex items-center gap-1 px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider",
                            record.status === 'present' ? "bg-emerald-50 text-emerald-600" : 
                            record.status === 'absent' ? "bg-rose-50 text-rose-600" : "bg-amber-50 text-amber-600"
                          )}>
                            {t(`attendance.status.${record.status}`)}
                          </div>
                          {record.status === 'late' && (
                            <div className="flex items-center gap-1">
                              <input 
                                type="number"
                                value={record.delay || ''}
                                onChange={(e) => handleUpdateDelay(student.id, parseInt(e.target.value) || 0)}
                                className="w-10 px-1 py-0.5 bg-amber-50 border border-amber-200 rounded text-[9px] font-bold text-amber-700 text-center"
                              />
                              <span className="text-[8px] font-bold text-amber-500 uppercase tracking-tighter">min</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <button 
                        onClick={() => handleMarkAttendance(student, 'present')}
                        className={cn(
                          "flex-1 flex items-center justify-center py-3 rounded-xl border transition-all",
                          record?.status === 'present' ? "bg-emerald-600 text-white border-emerald-600 shadow-md" : "bg-white text-emerald-600 border-emerald-100"
                        )}
                      >
                        <CheckCircle2 className="w-5 h-5" />
                      </button>
                      <button 
                        onClick={() => handleMarkAttendance(student, 'absent')}
                        className={cn(
                          "flex-1 flex items-center justify-center py-3 rounded-xl border transition-all",
                          record?.status === 'absent' ? "bg-rose-600 text-white border-rose-600 shadow-md" : "bg-white text-rose-600 border-rose-100"
                        )}
                      >
                        <XCircle className="w-5 h-5" />
                      </button>
                      <button 
                        onClick={() => handleMarkAttendance(student, 'late')}
                        className={cn(
                          "flex-1 flex items-center justify-center py-3 rounded-xl border transition-all",
                          record?.status === 'late' ? "bg-amber-600 text-white border-amber-600 shadow-md" : "bg-white text-amber-600 border-amber-100"
                        )}
                      >
                        <Clock className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-gray-900 tracking-tight">{t('attendance.title')}</h1>
          <p className="text-gray-500 mt-1 font-medium text-lg">{t('attendance.subtitle')}</p>
        </div>
        
        <div className="flex p-1.5 bg-gray-100 rounded-2xl w-fit">
          <button
            onClick={() => setActiveTab('batches')}
            className={cn(
              "flex items-center gap-2 px-6 py-2.5 rounded-xl transition-all font-bold text-sm",
              activeTab === 'batches' 
                ? "bg-white text-indigo-600 shadow-sm" 
                : "text-gray-500 hover:text-gray-700"
            )}
          >
            <Users className="w-4 h-4" />
            {t('common.batches', { defaultValue: 'Batches' })}
          </button>
          <button
            onClick={() => setActiveTab('reports')}
            className={cn(
              "flex items-center gap-2 px-6 py-2.5 rounded-xl transition-all font-bold text-sm",
              activeTab === 'reports' 
                ? "bg-white text-indigo-600 shadow-sm" 
                : "text-gray-500 hover:text-gray-700"
            )}
          >
            <FileText className="w-4 h-4" />
            {t('common.reports', { defaultValue: 'Reports' })}
          </button>
        </div>
      </div>

      {activeTab === 'batches' ? (
        <>
          {submissions.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                <h2 className="text-sm font-black text-gray-400 uppercase tracking-widest">{t('attendance.pendingSubmissions', { count: submissions.length })}</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {submissions.map((sub) => (
                  <motion.div 
                    key={sub.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white p-6 rounded-3xl border border-amber-100 shadow-sm shadow-amber-50 space-y-4"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-black text-gray-900">{sub.batchName}</h3>
                        <p className="text-xs font-bold text-gray-400 flex items-center gap-1 mt-1">
                          <Calendar className="w-3 h-3" />
                          {sub.date}
                        </p>
                      </div>
                      <div className="px-2.5 py-1 bg-amber-50 text-amber-600 rounded-lg text-[10px] font-black uppercase tracking-wider">
                        {t('attendance.pending')}
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-xs font-bold text-gray-500">
                      <div className="flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                        {Object.values(sub.records).filter(s => s === 'present').length}
                      </div>
                      <div className="flex items-center gap-1">
                        <XCircle className="w-3.5 h-3.5 text-rose-500" />
                        {Object.values(sub.records).filter(s => s === 'absent').length}
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-amber-500" />
                        {Object.values(sub.records).filter(s => s === 'late').length}
                      </div>
                    </div>
                    <div className="flex gap-2 pt-2">
                      <button 
                        onClick={() => handleApproveSubmission(sub)}
                        disabled={saving}
                        className="flex-1 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-black hover:bg-indigo-700 transition-all flex items-center justify-center gap-2"
                      >
                        <Save className="w-3.5 h-3.5" /> {t('attendance.approve')}
                      </button>
                      <button 
                        onClick={() => handleDeleteSubmission(sub.id)}
                        className="p-2.5 bg-rose-50 text-rose-600 rounded-xl hover:bg-rose-100 transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-6">
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white p-4 rounded-3xl border border-gray-100 shadow-sm">
              <div className="relative w-full md:w-96 group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 group-focus-within:text-indigo-500 transition-colors" />
                <input
                  type="text"
                  placeholder={t('attendance.searchBatchPlaceholder')}
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredBatches.map((batch) => (
                <motion.div
                  key={batch.id}
                  whileHover={{ y: -4 }}
                  className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm hover:shadow-xl hover:shadow-indigo-500/5 transition-all duration-300 group"
                >
                  <div className="flex items-start justify-between mb-6">
                    <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center group-hover:bg-indigo-600 transition-colors duration-300">
                      <Users className="w-7 h-7 text-indigo-600 group-hover:text-white transition-colors duration-300" />
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <div className="px-3 py-1 bg-gray-50 text-gray-400 rounded-lg text-[10px] font-black uppercase tracking-widest">
                        {batch.studentCount || 0} {t('attendance.students')}
                      </div>
                      {batch.classTeacherName && (
                        <div className="flex items-center gap-1 text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md">
                          <MessageCircle className="w-3 h-3" />
                          <span>{batch.classTeacherName}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <h3 className="text-xl font-black text-gray-900 mb-6 group-hover:text-indigo-600 transition-colors">{batch.name}</h3>

                  <div className="space-y-3">
                    <button 
                      onClick={() => handleStartManualAttendance(batch)}
                      className="w-full py-3.5 bg-indigo-600 text-white rounded-2xl font-black text-sm hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 flex items-center justify-center gap-2"
                    >
                      <ClipboardCheck className="w-4 h-4" /> {t('attendance.manualAttendance')}
                    </button>
                    <div className="grid grid-cols-2 gap-2">
                      <button 
                        onClick={() => handleCreateLink(batch)}
                        className="py-3 bg-white border-2 border-indigo-600 text-indigo-600 rounded-2xl font-black text-sm hover:bg-indigo-50 transition-all flex items-center justify-center gap-2"
                      >
                        <LinkIcon className="w-4 h-4" /> {t('attendance.createLink')}
                      </button>
                      <button 
                        onClick={() => handleSendToWhatsApp(batch)}
                        title={batch.classTeacherName ? `Send to ${batch.classTeacherName}` : 'No teacher assigned'}
                        disabled={!batch.classTeacherId}
                        className={cn(
                          "py-3 rounded-2xl font-black text-sm transition-all flex items-center justify-center gap-2 border-2",
                          batch.classTeacherId 
                            ? "bg-emerald-50 border-emerald-600 text-emerald-600 hover:bg-emerald-100" 
                            : "bg-gray-50 border-gray-200 text-gray-400 cursor-not-allowed"
                        )}
                      >
                        <MessageCircle className="w-4 h-4" /> WhatsApp
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </>
      ) : (
        <div className="space-y-8">
          <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm space-y-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
                <Filter className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-xl font-black text-gray-900 underline decoration-indigo-200 decoration-4 underline-offset-4">{t('attendance.reportFilters', { defaultValue: 'Report Filters' })}</h2>
                <p className="text-sm text-gray-400 font-medium">Configure date range and batch to generate PDF report</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                  <Users className="w-4 h-4 text-indigo-500" />
                  {t('attendance.selectBatch', { defaultValue: 'Select Batch' })}
                </label>
                <select
                  value={reportBatch}
                  onChange={(e) => setReportBatch(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all cursor-pointer"
                >
                  <option value="all">{t('attendance.allBatches', { defaultValue: 'All Batches' })}</option>
                  {batches.map(b => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-indigo-500" />
                  {t('attendance.reportType', { defaultValue: 'Report Type' })}
                </label>
                <div className="flex p-1 bg-gray-50 border border-gray-200 rounded-2xl overflow-hidden">
                  {(['daily', 'monthly', 'custom'] as const).map(type => (
                    <button
                      key={type}
                      onClick={() => setReportType(type)}
                      className={cn(
                        "flex-1 py-2 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all",
                        reportType === type 
                          ? "bg-indigo-600 text-white shadow-sm" 
                          : "text-gray-400 hover:text-gray-600 hover:bg-gray-100/50"
                      )}
                    >
                      {t(`attendance.reportType.${type}`, { defaultValue: type })}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2 lg:col-span-1">
                <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-indigo-500" />
                  {reportType === 'monthly' ? t('common.selectMonth', { defaultValue: 'Month' }) : t('common.startDate', { defaultValue: 'Start Date' })}
                </label>
                <input
                  type={reportType === 'monthly' ? 'month' : 'date'}
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all font-mono"
                />
              </div>

              {reportType === 'custom' && (
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-indigo-500" />
                    {t('common.endDate', { defaultValue: 'End Date' })}
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all font-mono"
                  />
                </div>
              )}
            </div>

            <div className="pt-4 flex justify-end">
              <button
                onClick={downloadPDFReport}
                disabled={isGeneratingReport}
                className="flex items-center gap-3 px-10 py-4 text-base font-black text-white bg-indigo-600 rounded-2xl hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 disabled:opacity-50"
              >
                {isGeneratingReport ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Download className="w-5 h-5" />
                )}
                {t('attendance.downloadPDF', { defaultValue: 'Download PDF Report' })}
              </button>
            </div>
          </div>

          <div className="bg-amber-50 p-6 rounded-3xl border border-amber-100 flex items-start gap-4">
            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm flex-shrink-0">
              <Clock className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <h4 className="text-sm font-black text-amber-900 mb-1">Tips for Reports</h4>
              <p className="text-xs text-amber-700 font-medium leading-relaxed">
                Choose **Daily** to see attendance for a single day. **Monthly** will generate a combined report for the entire selected month. Use **Custom** for any specific date range. All reports will include a student-by-student breakdown with status markers (P=Present, A=Absent, L=Late).
              </p>
            </div>
          </div>
        </div>
      )}

      <Modal 
        isOpen={isLinkModalOpen} 
        onClose={() => setIsLinkModalOpen(false)} 
        title={t('attendance.linkModalTitle')}
        maxWidth="max-w-md"
      >
        <div className="space-y-6">
          <div className="p-6 bg-indigo-50 rounded-3xl border border-indigo-100 flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-200 mb-4">
              <ExternalLink className="w-8 h-8 text-indigo-600" />
            </div>
            <h3 className="text-lg font-black text-gray-900 mb-2">{t('attendance.linkCreated')}</h3>
            <p className="text-sm text-gray-500 font-medium">{t('attendance.linkShareDesc')}</p>
          </div>

          <div className="relative group">
            <input 
              readOnly
              type="text" 
              value={generatedLink || ''}
              className="w-full pl-4 pr-12 py-4 bg-gray-50 border border-gray-200 rounded-2xl text-xs font-mono font-bold text-gray-600 focus:outline-none"
            />
            <button 
              onClick={() => {
                navigator.clipboard.writeText(generatedLink || '');
                alert(t('attendance.linkCopied'));
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
            >
              <Copy className="w-4 h-4" />
            </button>
          </div>

          <div className="bg-amber-50 p-4 rounded-2xl border border-amber-100 flex gap-3">
            <Clock className="w-5 h-5 text-amber-600 flex-shrink-0" />
            <p className="text-xs text-amber-700 font-medium leading-relaxed">
              {t('attendance.linkNotice')}
            </p>
          </div>

          <button 
            onClick={() => setIsLinkModalOpen(false)}
            className="w-full py-4 bg-gray-900 text-white rounded-2xl font-black hover:bg-gray-800 transition-all"
          >
            {t('attendance.close')}
          </button>
        </div>
      </Modal>

      <ConfirmModal
        isOpen={isSuccessModalOpen}
        onClose={() => setIsSuccessModalOpen(false)}
        onConfirm={() => setIsSuccessModalOpen(false)}
        title={t('attendance.successTitle')}
        message={successMessage}
        variant="info"
        confirmText={t('attendance.ok')}
      />
    </div>
  );
}

