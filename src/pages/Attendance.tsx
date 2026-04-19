import React, { useState, useEffect } from 'react';
import { ClipboardCheck, Search, Filter, CheckCircle2, XCircle, Clock, Loader2, Link as LinkIcon, Users, Save, ChevronRight, ArrowLeft, Copy, ExternalLink, Trash2, Calendar } from 'lucide-react';
import { Table, TableRow, TableCell } from '../components/Table';
import { cn } from '../lib/utils';
import { collection, onSnapshot, query, addDoc, serverTimestamp, where, getDocs, writeBatch, doc, deleteDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { useAuth } from '../lib/auth';
import { Modal } from '../components/Modal';
import { ConfirmModal } from '../components/ConfirmModal';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'motion/react';

interface AttendanceRecord {
  id: string;
  studentId: string;
  studentName: string;
  date: string;
  status: 'present' | 'absent' | 'late';
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
}

interface AttendanceSubmission {
  id: string;
  batchId: string;
  batchName: string;
  date: string;
  records: Record<string, 'present' | 'absent' | 'late'>;
  status: 'pending' | 'approved';
  createdAt: any;
}

export function Attendance() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [batches, setBatches] = useState<Batch[]>([]);
  const [submissions, setSubmissions] = useState<AttendanceSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
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

  const today = new Date().toISOString().split('T')[0];

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
        batchId: student.batchId,
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

      Object.entries(submission.records).forEach(([studentId, status]) => {
        const docRef = doc(collection(db, 'attendance'));
        batch.set(docRef, {
          studentId,
          studentName: studentMap[studentId] || 'Unknown',
          date: submission.date,
          status,
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
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={() => handleMarkAttendance(student, 'present')}
                            className={cn(
                              "p-2.5 rounded-xl transition-all",
                              record?.status === 'present' ? "bg-emerald-100 text-emerald-700 shadow-sm" : "text-gray-300 hover:bg-emerald-50 hover:text-emerald-600"
                            )} 
                            title={t('attendance.status.present')}
                          >
                            <CheckCircle2 className="w-5 h-5" />
                          </button>
                          <button 
                            onClick={() => handleMarkAttendance(student, 'absent')}
                            className={cn(
                              "p-2.5 rounded-xl transition-all",
                              record?.status === 'absent' ? "bg-rose-100 text-rose-700 shadow-sm" : "text-gray-300 hover:bg-rose-50 hover:text-rose-600"
                            )} 
                            title={t('attendance.status.absent')}
                          >
                            <XCircle className="w-5 h-5" />
                          </button>
                          <button 
                            onClick={() => handleMarkAttendance(student, 'late')}
                            className={cn(
                              "p-2.5 rounded-xl transition-all",
                              record?.status === 'late' ? "bg-amber-100 text-amber-700 shadow-sm" : "text-gray-300 hover:bg-amber-50 hover:text-amber-600"
                            )} 
                            title={t('attendance.status.late')}
                          >
                            <Clock className="w-5 h-5" />
                          </button>
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
                        <div className={cn(
                          "flex items-center gap-1 px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider",
                          record.status === 'present' ? "bg-emerald-50 text-emerald-600" : 
                          record.status === 'absent' ? "bg-rose-50 text-rose-600" : "bg-amber-50 text-amber-600"
                        )}>
                          {t(`attendance.status.${record.status}`)}
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">{t('attendance.title')}</h1>
          <p className="text-gray-500 mt-1 font-medium">{t('attendance.subtitle')}</p>
        </div>
      </div>

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
                <div className="px-3 py-1 bg-gray-50 text-gray-400 rounded-lg text-[10px] font-black uppercase tracking-widest">
                  {batch.studentCount || 0} {t('attendance.students')}
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
                <button 
                  onClick={() => handleCreateLink(batch)}
                  className="w-full py-3.5 bg-white border-2 border-indigo-600 text-indigo-600 rounded-2xl font-black text-sm hover:bg-indigo-50 transition-all flex items-center justify-center gap-2"
                >
                  <LinkIcon className="w-4 h-4" /> {t('attendance.createLink')}
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

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

