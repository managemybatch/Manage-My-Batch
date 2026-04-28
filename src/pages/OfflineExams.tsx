import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Filter, FileText, MoreVertical, Calendar, CheckCircle2, Clock, Loader2, Download, Palette, Layout, Award, Save, Trash2, Edit2, Share2, Copy, ExternalLink, Image as ImageIcon, Sparkles, Star, Trophy, BoxIcon, Globe, MessageSquare } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';
import { collection, onSnapshot, query, addDoc, serverTimestamp, deleteDoc, doc, orderBy, setDoc, where, getDoc, updateDoc, increment } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { useAuth } from '../lib/auth';
import { Modal } from '../components/Modal';
import { ConfirmModal } from '../components/ConfirmModal';
import jsPDF from 'jspdf';
import { toPng } from 'html-to-image';
import { useTranslation } from 'react-i18next';
import { AdmitCardDesigner } from '../components/AdmitCardDesigner';
import { sendSMS } from '../lib/sms';

interface OfflineExam {
  id: string;
  type: 'single' | 'school';
  title: string;
  batchId: string;
  batchName?: string;
  date?: string;
  time?: string; // Total time for single exam
  totalMarks?: number;
  hasSubSections?: boolean;
  isPublished?: boolean;
  linkedExams?: string[];
  examFee?: number;
  subSections?: {
    name: string;
    totalMarks: number;
  }[];
  subjects?: {
    name: string;
    totalMarks: number;
    date: string;
    time?: string;
    hasSubSections?: boolean;
    subSections?: {
      name: string;
      totalMarks: number;
    }[];
  }[];
  status: 'pending' | 'completed';
  institutionName?: string;
  studentMarks?: Record<string, Record<string, number>>;
  createdAt: any;
}

interface Student {
  id: string;
  name: string;
  rollNo: string;
  photoUrl?: string;
  batchId: string;
  phone?: string;
  guardianPhone?: string;
}

interface Batch {
  id: string;
  name: string;
}

export function OfflineExams() {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const [exams, setExams] = useState<OfflineExam[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingExam, setEditingExam] = useState<OfflineExam | null>(null);
  const [selectedExam, setSelectedExam] = useState<OfflineExam | null>(null);
  const [isManageModalOpen, setIsManageModalOpen] = useState(false);
  const [manageTab, setManageTab] = useState<'overview' | 'seat-plan' | 'admit-cards' | 'results'>('overview');
  const [studentMarks, setStudentMarks] = useState<Record<string, Record<string, number>>>({});
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [viewTab, setViewTab] = useState<'active' | 'archive'>('active');
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [examToDelete, setExamToDelete] = useState<string | null>(null);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [shareLink, setShareLink] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const [isSuccessStoryModalOpen, setIsSuccessStoryModalOpen] = useState(false);
  const successStoryRef = useRef<HTMLDivElement>(null);
  const [selectedStudentForStory, setSelectedStudentForStory] = useState<any>(null);
  const [instData, setInstData] = useState<any>(null);
  const [selectedStudentForResult, setSelectedStudentForResult] = useState<any>(null);
  const markSheetRef = useRef<HTMLDivElement>(null);
  const [isMarkSheetModalOpen, setIsMarkSheetModalOpen] = useState(false);
  const [isSendingSMS, setIsSendingSMS] = useState(false);
  const [creditsBalance, setCreditsBalance] = useState<number>(0);

  const [isCombinedModalOpen, setIsCombinedModalOpen] = useState(false);
  const [combinedBatchId, setCombinedBatchId] = useState('');
  const [selectedExamsForCombined, setSelectedExamsForCombined] = useState<string[]>([]);
  const [combinedExamTitle, setCombinedExamTitle] = useState('');

  useEffect(() => {
    if (!user) return;
    const instId = user.institutionId || user.uid;
    const unsubInst = onSnapshot(doc(db, 'institutions', instId), (doc) => {
      if (doc.exists()) setInstData(doc.data());
    });

    const unsubCredits = onSnapshot(doc(db, 'credits', instId), (doc) => {
      if (doc.exists()) {
        setCreditsBalance(doc.data().balance || 0);
      }
    });

    return () => {
      unsubInst();
      unsubCredits();
    };
  }, [user]);

  const handleSendResultSMS = async (student: any, rankedInfo: any, sendToStudentOnly = false) => {
    if (!user || !instData || !selectedExam) return;
    if (creditsBalance <= 0) {
      alert("Insufficient SMS credits. Please buy more tokens.");
      return;
    }
    
    setIsSendingSMS(true);
    const instId = user.institutionId || user.uid;
    
    try {
      const message = `Result: ${selectedExam.title}\nStudent: ${student.name}\nRoll: ${student.rollNo}\nMarks: ${rankedInfo.totalObtained}/${rankedInfo.totalPossible}\nGrade: ${rankedInfo.grade}\nRank: ${rankedInfo.rank}\nInstitution: ${instData.name}`;
      
      const phonesToSend: string[] = [];
      if (sendToStudentOnly && student.phone) {
        phonesToSend.push(student.phone);
      } else {
        if (student.guardianPhone) phonesToSend.push(student.guardianPhone);
        if (student.phone) phonesToSend.push(student.phone);
      }

      if (phonesToSend.length === 0) {
        alert("No phone numbers found for this student.");
        setIsSendingSMS(false);
        return;
      }

      let sentCount = 0;
      for (const phone of phonesToSend) {
        const result = await sendSMS(instData.smsConfig, phone, message);
        if (result.success) {
          sentCount++;
          await addDoc(collection(db, 'messages'), {
            institutionId: instId,
            senderId: user.uid,
            senderName: user.displayName || 'Admin',
            recipientType: 'individual',
            recipientId: student.id,
            recipientName: student.name,
            content: message,
            status: 'delivered',
            creditsUsed: 1,
            createdAt: serverTimestamp(),
            sentTo: phone
          });
        }
      }
      
      if (sentCount > 0) {
        await updateDoc(doc(db, 'credits', instId), {
          balance: increment(-sentCount),
          totalSent: increment(sentCount),
          lastUpdated: serverTimestamp()
        });

        setSuccessMessage(`Result SMS sent to ${sentCount} recipient(s)!`);
        setIsSuccessModalOpen(true);
      } else {
        alert(`Failed to send SMS.`);
      }
    } catch (error) {
      console.error("SMS Send Error:", error);
      alert("An error occurred while sending the message.");
    } finally {
      setIsSendingSMS(false);
    }
  };

  const handleSendAllResultsSMS = async () => {
    const rankedStudents = getRankedStudents();
    if (!rankedStudents.length) return;
    if (!confirm(`Are you sure you want to send results via SMS to all ${rankedStudents.length} students? This will use your SMS credits.`)) return;
    
    if (creditsBalance < rankedStudents.length) {
      alert(`Insufficient credits. You need at least ${rankedStudents.length} credits but have ${creditsBalance}.`);
      return;
    }

    setIsSendingSMS(true);
    let totalSent = 0;
    const instId = user.institutionId || user.uid;

    try {
      for (const rankedInfo of rankedStudents) {
        const student = students.find(s => s.id === rankedInfo.id);
        if (!student) continue;

        const message = `Result: ${selectedExam?.title}\nStudent: ${student.name}\nRoll: ${student.rollNo}\nMarks: ${rankedInfo.totalObtained}/${rankedInfo.totalPossible}\nGrade: ${rankedInfo.grade}\nRank: ${rankedInfo.rank}\nInstitution: ${instData?.name}`;
        
        // In bulk, we default to guardian phone to save credits unless it's missing
        const phone = student.guardianPhone || student.phone;
        if (!phone) continue;

        const result = await sendSMS(instData?.smsConfig, phone, message);
        if (result.success) {
          totalSent++;
          await addDoc(collection(db, 'messages'), {
            institutionId: instId,
            senderId: user?.uid,
            senderName: user?.displayName || 'Admin',
            recipientType: 'individual',
            recipientId: student.id,
            recipientName: student.name,
            content: message,
            status: 'delivered',
            creditsUsed: 1,
            createdAt: serverTimestamp(),
            sentTo: phone
          });
        }
      }

      if (totalSent > 0) {
        await updateDoc(doc(db, 'credits', instId), {
          balance: increment(-totalSent),
          totalSent: increment(totalSent),
          lastUpdated: serverTimestamp()
        });
        setSuccessMessage(`Bulk Results SMS sent to ${totalSent} students!`);
        setIsSuccessModalOpen(true);
      }
    } catch (error) {
      console.error("Bulk SMS Error:", error);
    } finally {
      setIsSendingSMS(false);
    }
  };

  const handleDownloadImage = async (ref: React.RefObject<HTMLDivElement | null>, filename: string) => {
    if (!ref.current) return;
    setIsGeneratingPDF(true);
    try {
      const dataUrl = await toPng(ref.current, {
        pixelRatio: 3,
        cacheBust: true,
        backgroundColor: '#ffffff',
      });
      const link = document.createElement('a');
      link.download = `${filename}.png`;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Image Generation Error:', error);
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const handleSaveResults = async () => {
    if (!selectedExam) return;
    setIsSaving(true);
    try {
      await setDoc(doc(db, 'offline_exams', selectedExam.id), {
        studentMarks: studentMarks,
        status: 'completed',
        updatedAt: serverTimestamp()
      }, { merge: true });
      setSuccessMessage(t('offlineExams.manage.results.success', { defaultValue: 'Results saved successfully!' }));
      setIsSuccessModalOpen(true);
      // Removed setIsManageModalOpen(false) to allow further actions like publishing
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `offline_exams/${selectedExam.id}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateCombinedResult = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !combinedBatchId || selectedExamsForCombined.length < 2 || !combinedExamTitle) {
      alert('Please select at least 2 exams and provide a title.');
      return;
    }
    
    setIsSaving(true);
    try {
      const batch = batches.find(b => b.id === combinedBatchId);
      const newCombinedExam = {
        title: combinedExamTitle,
        type: 'school',
        batchId: combinedBatchId,
        batchName: batch?.name || '',
        status: 'completed',
        isPublished: true,
        linkedExams: selectedExamsForCombined,
        createdAt: serverTimestamp(),
        institutionId: user.institutionId || user.uid,
        institutionName: instData?.name || ''
      };
      
      await addDoc(collection(db, 'offline_exams'), newCombinedExam);
      setIsCombinedModalOpen(false);
      setCombinedBatchId('');
      setSelectedExamsForCombined([]);
      setCombinedExamTitle('');
      setSuccessMessage('Combined result prepared and published successfully!');
      setIsSuccessModalOpen(true);
    } catch (error) {
      console.error('Error creating combined result:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleTogglePublish = async () => {
    if (!selectedExam) return;
    setIsSaving(true);
    const newPublishStatus = !selectedExam.isPublished;
    try {
      await setDoc(doc(db, 'offline_exams', selectedExam.id), {
        isPublished: newPublishStatus,
        updatedAt: serverTimestamp()
      }, { merge: true });
      
      setSelectedExam(prev => prev ? { ...prev, isPublished: newPublishStatus } : null);
      setSuccessMessage(newPublishStatus ? "Result published on website!" : "Result removed from website!");
      setIsSuccessModalOpen(true);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `offline_exams/${selectedExam.id}`);
    } finally {
      setIsSaving(false);
    }
  };
  const scheduleRef = useRef<HTMLDivElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  const [newExam, setNewExam] = useState({
    type: 'single' as const,
    title: '',
    batchId: '',
    date: new Date().toISOString().split('T')[0],
    time: '10:00 AM',
    totalMarks: 100,
    examFee: 0,
    hasSubSections: false,
    subSections: [{ name: '', totalMarks: 50 }],
    subjects: [{ name: '', totalMarks: 100, date: new Date().toISOString().split('T')[0], time: '10:00 AM', hasSubSections: false, subSections: [{ name: '', totalMarks: 50 }] }],
    institutionName: '',
    linkedExams: [] as string[],
  });

  useEffect(() => {
    if (!user) return;

    const instId = user.institutionId || user.uid;

    // Fetch batches for the dropdown
    const unsubscribeBatches = onSnapshot(
      query(collection(db, 'batches'), where('institutionId', '==', instId)), 
      (snapshot) => {
        const batchData = snapshot.docs.map(doc => ({
          id: doc.id,
          name: doc.data().name
        })) as Batch[];
        setBatches(batchData);
        if (batchData.length > 0 && !newExam.batchId) {
          setNewExam(prev => ({ ...prev, batchId: batchData[0].id }));
        }
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'batches');
      }
    );

    // Fetch exams
    const q = query(
      collection(db, 'offline_exams'), 
      where('institutionId', '==', instId)
    );
    const unsubscribeExams = onSnapshot(q, (snapshot) => {
      const examData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as OfflineExam[];

      // Sort client-side to avoid index requirements
      const sortedData = examData.sort((a, b) => {
        const dateA = a.createdAt ? (typeof a.createdAt === 'string' ? new Date(a.createdAt).getTime() : (a.createdAt as any).seconds * 1000) : 0;
        const dateB = b.createdAt ? (typeof b.createdAt === 'string' ? new Date(b.createdAt).getTime() : (b.createdAt as any).seconds * 1000) : 0;
        return dateB - dateA;
      });

      setExams(sortedData);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'offline_exams');
    });

    // Fetch students for seat plan and admit cards
    const unsubscribeStudents = onSnapshot(
      query(collection(db, 'students'), where('institutionId', '==', instId)), 
      (snapshot) => {
        const studentData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Student[];
        setStudents(studentData);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'students');
      }
    );

    return () => {
      unsubscribeBatches();
      unsubscribeExams();
      unsubscribeStudents();
    };
  }, [user]);

  const handleAddExam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const instId = user.institutionId || user.uid;
    const selectedBatch = batches.find(b => b.id === newExam.batchId);

    try {
      await addDoc(collection(db, 'offline_exams'), {
        ...newExam,
        institutionName: instData?.name || newExam.institutionName,
        institutionId: instId,
        batchName: selectedBatch?.name || '',
        status: 'pending',
        createdBy: user.uid,
        createdAt: serverTimestamp(),
      });
      setIsAddModalOpen(false);
      setNewExam({
        type: 'single',
        title: '',
        batchId: batches[0]?.id || '',
        date: new Date().toISOString().split('T')[0],
        time: '10:00 AM',
        totalMarks: 100,
        examFee: 0,
        hasSubSections: false,
        subSections: [{ name: '', totalMarks: 50 }],
        subjects: [{ name: '', totalMarks: 100, date: new Date().toISOString().split('T')[0], time: '10:00 AM', hasSubSections: false, subSections: [{ name: '', totalMarks: 50 }] }],
        institutionName: '',
        linkedExams: [],
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'offline_exams');
    }
  };

  const handleEditExam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !editingExam) return;

    const selectedBatch = batches.find(b => b.id === editingExam.batchId);

    try {
      const { id, ...examData } = editingExam;
      await setDoc(doc(db, 'offline_exams', id), {
        ...examData,
        batchName: selectedBatch?.name || '',
        updatedAt: serverTimestamp(),
      }, { merge: true });
      setIsEditModalOpen(false);
      setEditingExam(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `offline_exams/${editingExam.id}`);
    }
  };

  const handleDeleteExam = async () => {
    if (!examToDelete) return;
    setIsSaving(true);
    try {
      await deleteDoc(doc(db, 'offline_exams', examToDelete));
      setSuccessMessage(t('offlineExams.deleteModal.success', { defaultValue: 'Exam deleted successfully!' }));
      setIsSuccessModalOpen(true);
      setIsDeleteModalOpen(false);
      setExamToDelete(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `offline_exams/${examToDelete}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddSubject = () => {
    setNewExam(prev => ({
      ...prev,
      subjects: [...prev.subjects, { name: '', totalMarks: 100, date: new Date().toISOString().split('T')[0], time: '10:00 AM', hasSubSections: false, subSections: [{ name: '', totalMarks: 50 }] }]
    }));
  };

  const handleRemoveSubject = (index: number) => {
    setNewExam(prev => ({
      ...prev,
      subjects: prev.subjects.filter((_, i) => i !== index)
    }));
  };

  const handleSubjectChange = (index: number, field: string, value: any) => {
    const updatedSubjects = [...newExam.subjects];
    updatedSubjects[index] = { ...updatedSubjects[index], [field]: value };
    
    // Auto-update totalMarks if sub-sections changed
    if (field === 'subSections' || field === 'hasSubSections') {
      if (updatedSubjects[index].hasSubSections) {
        updatedSubjects[index].totalMarks = updatedSubjects[index].subSections?.reduce((sum, s) => sum + s.totalMarks, 0) || 0;
      }
    }
    
    setNewExam(prev => ({ ...prev, subjects: updatedSubjects }));
  };

  const handleShare = (exam: OfflineExam) => {
    const baseUrl = window.location.origin;
    const link = `${baseUrl}/public/exam-result/${exam.id}`;
    setShareLink(link);
    setSelectedExam(exam);
    setIsShareModalOpen(true);
  };

  const calculateGrade = (marks: number, total: number) => {
    if (total === 0) return 'N/A';
    const percentage = (marks / total) * 100;
    if (percentage >= 80) return 'A+';
    if (percentage >= 70) return 'A';
    if (percentage >= 60) return 'A-';
    if (percentage >= 50) return 'B';
    if (percentage >= 40) return 'C';
    if (percentage >= 33) return 'D';
    return 'F';
  };

  const getRankedStudents = (examOverride?: OfflineExam) => {
    const targetExam = examOverride || selectedExam;
    if (!targetExam) return [];
    
    // Check for linked exams for combined result
    const linkedExamsData = targetExam.linkedExams ? exams.filter(e => targetExam.linkedExams?.includes(e.id)) : [];

    const studentsWithTotals = (targetExam.batchId ? students.filter(s => s.batchId === targetExam.batchId) : []).map(student => {
      // Calculate current exam marks
      const marks = targetExam.studentMarks?.[student.id] || {};
      let totalObtained = 0;
      let totalPossible = 0;

      const processExam = (exam: OfflineExam, mks: any) => {
        let obtained = 0;
        let possible = 0;
        if (exam.type === 'single') {
          if (exam.hasSubSections && exam.subSections) {
            exam.subSections.forEach(ss => {
              obtained += mks[ss.name] || 0;
              possible += ss.totalMarks;
            });
          } else {
            obtained = mks['total'] || 0;
            possible = exam.totalMarks || 100;
          }
        } else {
          exam.subjects?.forEach(s => {
            if (s.hasSubSections && s.subSections) {
              s.subSections.forEach(ss => {
                obtained += mks[`${s.name}_${ss.name}`] || 0;
              });
            } else {
              obtained += mks[s.name] || 0;
            }
            possible += s.totalMarks;
          });
        }
        return { obtained, possible };
      };

      const current = processExam(targetExam, marks);
      totalObtained = current.obtained;
      totalPossible = current.possible;

      // Add linked exams marks
      linkedExamsData.forEach(le => {
        const leMarks = le.studentMarks?.[student.id] || {};
        const leRes = processExam(le, leMarks);
        totalObtained += leRes.obtained;
        totalPossible += leRes.possible;
      });

      return {
        ...student,
        totalObtained,
        totalPossible,
        percentage: totalPossible > 0 ? (totalObtained / totalPossible) * 100 : 0,
        grade: calculateGrade(totalObtained, totalPossible)
      };
    });

    return studentsWithTotals.sort((a, b) => b.totalObtained - a.totalObtained).map((s, i) => ({
      ...s,
      rank: i + 1
    }));
  };

  const generatePDF = async (ref: React.RefObject<HTMLDivElement | null>, filename: string) => {
    if (!ref.current) return;
    setIsGeneratingPDF(true);
    
    try {
      const originalRef = ref.current;
      const container = document.createElement('div');
      container.style.position = 'fixed';
      container.style.left = '-9999px';
      container.style.top = '0';
      container.style.width = '210mm'; // A4 width
      container.style.backgroundColor = 'white';
      container.style.zIndex = '9999';
      
      const clone = originalRef.cloneNode(true) as HTMLDivElement;
      clone.style.display = 'block';
      clone.style.width = '100%';
      clone.style.transform = 'none';
      clone.style.position = 'relative';
      clone.style.left = '0';
      clone.style.top = '0';
      
      container.appendChild(clone);
      document.body.appendChild(container);

      // Wait for images and fonts
      await new Promise(resolve => setTimeout(resolve, 1500));

      const imgData = await toPng(clone, {
        pixelRatio: 2,
        cacheBust: true,
        backgroundColor: '#ffffff',
      });

      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      
      const imgProps = pdf.getImageProperties(imgData);
      const imgWidth = pdfWidth;
      const imgHeight = (imgProps.height * pdfWidth) / imgProps.width;
      
      let heightLeft = imgHeight;
      let position = 0;

      // Add first page
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pdfHeight;

      // Add subsequent pages if content is longer than one page
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pdfHeight;
      }

      pdf.save(`${filename.replace(/\s+/g, '_')}.pdf`);
      
      document.body.removeChild(container);
    } catch (error) {
      console.error('PDF Generation Error:', error);
      alert('Error generating PDF. Please check console for details.');
    } finally {
      setIsGeneratingPDF(false);
    }
  };


  const handleMarkChange = (studentId: string, subjectName: string, value: string) => {
    const marks = parseInt(value) || 0;
    setStudentMarks(prev => ({
      ...prev,
      [studentId]: {
        ...(prev[studentId] || {}),
        [subjectName]: marks
      }
    }));
  };

  const filteredExams = React.useMemo(() => exams.filter(e => {
    const matchesSearch = e.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTab = viewTab === 'active' ? e.status === 'pending' : e.status === 'completed';
    
    // Retention logic: Exams from year N are kept until March 1st of year N+1
    const createdAt = e.createdAt?.toDate ? e.createdAt.toDate() : new Date();
    const createdYear = createdAt.getFullYear();
    const retentionDate = new Date(createdYear + 1, 2, 1); // March 1st of next year
    const isWithinRetention = new Date() < retentionDate;

    return matchesSearch && matchesTab && isWithinRetention;
  }), [exams, searchTerm, viewTab]);

  const examStudents = selectedExam ? students.filter(s => s.batchId === selectedExam.batchId) : [];

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">{t('offlineExams.title')}</h1>
          <p className="text-gray-500 mt-1">{t('offlineExams.subtitle')}</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => setIsCombinedModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-indigo-600 bg-indigo-50 rounded-xl hover:bg-indigo-100 transition-all"
          >
            <Trophy className="w-4 h-4" /> Combined Result
          </button>
          <button 
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 transition-all shadow-md shadow-indigo-200"
          >
            <Plus className="w-4 h-4" /> {t('offlineExams.createNew')}
          </button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
        <div className="flex items-center gap-2 bg-gray-50 p-1 rounded-xl border border-gray-100">
          <button
            onClick={() => setViewTab('active')}
            className={cn(
              "px-4 py-2 text-sm font-medium rounded-lg transition-all",
              viewTab === 'active' ? "bg-white text-indigo-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
            )}
          >
            {t('offlineExams.tabs.active')}
          </button>
          <button
            onClick={() => setViewTab('archive')}
            className={cn(
              "px-4 py-2 text-sm font-medium rounded-lg transition-all",
              viewTab === 'archive' ? "bg-white text-indigo-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
            )}
          >
            {t('offlineExams.tabs.archive')}
          </button>
        </div>
        <div className="relative w-full md:w-96 group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 group-focus-within:text-indigo-500 transition-colors" />
          <input
            type="text"
            placeholder={t('offlineExams.searchPlaceholder')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredExams.map((exam) => (
            <motion.div
              key={exam.id}
              whileHover={{ y: -4 }}
              className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all duration-300 group cursor-pointer relative"
              onClick={() => {
                setSelectedExam(exam);
                setStudentMarks(exam.studentMarks || {});
                setIsManageModalOpen(true);
                setManageTab('overview');
              }}
            >
              <div className="flex items-start justify-between">
                <div className={cn(
                  "p-3 rounded-xl border",
                  exam.type === 'school' ? "bg-purple-50 text-purple-600 border-purple-100" : "bg-amber-50 text-amber-600 border-amber-100"
                )}>
                  <FileText className="w-6 h-6" />
                </div>
                <div className="relative">
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveMenu(activeMenu === exam.id ? null : exam.id);
                    }}
                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg transition-all"
                  >
                    <MoreVertical className="w-4 h-4" />
                  </button>

                  {activeMenu === exam.id && (
                    <div className="absolute right-0 mt-2 w-36 bg-white rounded-xl shadow-xl border border-gray-100 py-2 z-20 overflow-hidden">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleShare(exam);
                          setActiveMenu(null);
                        }}
                        className="w-full px-4 py-2 text-left text-xs font-bold text-indigo-600 hover:bg-indigo-50 transition-colors flex items-center gap-2"
                      >
                        <Share2 className="w-3.5 h-3.5" /> {t('offlineExams.card.share', { defaultValue: 'Share Results' })}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingExam(exam);
                          setIsEditModalOpen(true);
                          setActiveMenu(null);
                        }}
                        className="w-full px-4 py-2 text-left text-xs font-bold text-gray-600 hover:bg-indigo-50 hover:text-indigo-600 transition-colors flex items-center gap-2"
                      >
                        <Palette className="w-3.5 h-3.5" /> {t('offlineExams.card.edit')}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setExamToDelete(exam.id);
                          setIsDeleteModalOpen(true);
                          setActiveMenu(null);
                        }}
                        className="w-full px-4 py-2 text-left text-xs font-bold text-rose-600 hover:bg-rose-50 transition-colors flex items-center gap-2"
                      >
                        <Plus className="w-3.5 h-3.5 rotate-45" /> {t('offlineExams.card.delete')}
                      </button>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="mt-4">
                <div className="flex items-center gap-2 mb-1">
                  <span className={cn(
                    "px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider",
                    exam.type === 'school' ? "bg-purple-100 text-purple-700" : "bg-amber-100 text-amber-700"
                  )}>
                    {t(`offlineExams.card.${exam.type}`)}
                  </span>
                </div>
                <h3 className="text-xl font-bold text-gray-900 group-hover:text-indigo-600 transition-colors">{exam.title}</h3>
                <div className="flex flex-col gap-2 mt-3">
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Calendar className="w-4 h-4" />
                    <span>{exam.type === 'single' ? new Date(exam.date!).toLocaleDateString() : `${exam.subjects?.length} ${t('offlineExams.card.subjects')}`}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{exam.batchName}</span>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-6 border-t border-gray-50 flex items-center justify-between">
                <span className={cn(
                  "px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                  exam.status === 'completed' ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"
                )}>
                  {exam.status}
                </span>
                <button className="text-sm font-bold text-indigo-600 hover:text-indigo-700">{t('offlineExams.card.manage')}</button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title={t('offlineExams.modal.createTitle')} maxWidth="max-w-2xl">
        <form onSubmit={handleAddExam} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">{t('offlineExams.modal.type')}</label>
              <select
                value={newExam.type}
                onChange={e => setNewExam({...newExam, type: e.target.value as any})}
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
              >
                <option value="single">{t('offlineExams.modal.types.single')}</option>
                <option value="school">{t('offlineExams.modal.types.school')}</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input 
              type="checkbox" 
              id="newExamHasSubSections" 
              checked={newExam.hasSubSections} 
              onChange={e => setNewExam(prev => ({ ...prev, hasSubSections: e.target.checked }))}
              className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
            />
            <label htmlFor="newExamHasSubSections" className="text-sm font-medium text-gray-700">
              Enable Sub-sections (e.g., MCQ, CQ, Viva)
            </label>
          </div>

          {newExam.hasSubSections && newExam.type === 'single' && (
            <div className="space-y-3 bg-indigo-50/50 p-4 rounded-xl border border-indigo-100">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-indigo-700 uppercase tracking-widest">Sub-sections</span>
                <button 
                  type="button" 
                  onClick={() => setNewExam(prev => ({ ...prev, subSections: [...prev.subSections, { name: '', totalMarks: 0 }] }))}
                  className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" /> Add Part
                </button>
              </div>
              {newExam.subSections.map((ss, idx) => (
                <div key={idx} className="flex gap-2">
                  <input 
                    type="text" 
                    placeholder="Part Name" 
                    value={ss.name} 
                    onChange={e => {
                      const updated = [...newExam.subSections];
                      updated[idx].name = e.target.value;
                      setNewExam({...newExam, subSections: updated});
                    }}
                    className="flex-1 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs"
                    required
                  />
                  <input 
                    type="number" 
                    placeholder="Marks" 
                    value={ss.totalMarks || ''} 
                    onChange={e => {
                      const updated = [...newExam.subSections];
                      updated[idx].totalMarks = parseInt(e.target.value) || 0;
                      const total = updated.reduce((sum, s) => sum + s.totalMarks, 0);
                      setNewExam({...newExam, subSections: updated, totalMarks: total});
                    }}
                    className="w-20 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs"
                    required
                  />
                  <button 
                    type="button" 
                    onClick={() => {
                      const updated = newExam.subSections.filter((_, i) => i !== idx);
                      const total = updated.reduce((sum, s) => sum + s.totalMarks, 0);
                      setNewExam({...newExam, subSections: updated, totalMarks: total});
                    }}
                    className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg"
                  >
                    <Plus className="w-4 h-4 rotate-45" />
                  </button>
                </div>
              ))}
            </div>
          )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">{t('offlineExams.modal.examTitle')}</label>
                <input
                  required
                  type="text"
                  placeholder={newExam.type === 'single' ? "e.g. Math Final" : "e.g. First Term Exam"}
                  value={newExam.title}
                  onChange={e => setNewExam({...newExam, title: e.target.value})}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Exam Fee (Optional)</label>
                <input
                  type="number"
                  placeholder="৳0.00"
                  value={newExam.examFee || ''}
                  onChange={e => setNewExam({...newExam, examFee: parseInt(e.target.value) || 0})}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-bold text-indigo-600"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">{t('offlineExams.modal.selectBatch')}</label>
                <select
                  required
                  value={newExam.batchId}
                  onChange={e => setNewExam({...newExam, batchId: e.target.value})}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                >
                  <option value="">{t('offlineExams.modal.selectBatch')}</option>
                  {batches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>
            </div>

          {newExam.type === 'single' ? (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">{t('offlineExams.modal.examDate')}</label>
                <input
                  required
                  type="date"
                  value={newExam.date}
                  onChange={e => setNewExam({...newExam, date: e.target.value})}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Exam Time</label>
                <input
                  required
                  type="text"
                  placeholder="e.g. 10:00 AM"
                  value={newExam.time || ''}
                  onChange={e => setNewExam({...newExam, time: e.target.value})}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">{t('offlineExams.modal.totalMarks')}</label>
                <input
                  required
                  type="number"
                  value={newExam.totalMarks}
                  onChange={e => setNewExam({...newExam, totalMarks: parseInt(e.target.value)})}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">{t('offlineExams.modal.subjectsAndMarks')}</label>
                <button 
                  type="button"
                  onClick={handleAddSubject}
                  className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" /> {t('offlineExams.modal.addSubject')}
                </button>
              </div>
              <div className="space-y-3">
                {newExam.subjects.map((subject, index) => (
                  <div key={index} className="grid grid-cols-12 gap-3 items-end bg-gray-50 p-3 rounded-xl border border-gray-100">
                    <div className="col-span-5 space-y-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase">{t('offlineExams.modal.subjectName')}</label>
                      <input
                        required
                        type="text"
                        placeholder="Math"
                        value={subject.name}
                        onChange={e => handleSubjectChange(index, 'name', e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                      />
                    </div>
                    <div className="col-span-3 space-y-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase">{t('offlineExams.modal.marks')}</label>
                      <input
                        required
                        type="number"
                        value={subject.totalMarks}
                        readOnly={subject.hasSubSections}
                        onChange={e => handleSubjectChange(index, 'totalMarks', parseInt(e.target.value))}
                        className={cn(
                          "w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20",
                          subject.hasSubSections && "bg-gray-100 cursor-not-allowed"
                        )}
                      />
                    </div>
                    <div className="col-span-3 space-y-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase">{t('offlineExams.modal.date')}</label>
                      <input
                        required
                        type="date"
                        value={subject.date}
                        onChange={e => handleSubjectChange(index, 'date', e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                      />
                    </div>
                    <div className="col-span-1 flex justify-center">
                      <button 
                        type="button"
                        onClick={() => handleRemoveSubject(index)}
                        className="p-2 text-gray-400 hover:text-rose-600 transition-colors"
                        disabled={newExam.subjects.length === 1}
                      >
                        <Plus className="w-4 h-4 rotate-45" />
                      </button>
                    </div>

                    <div className="col-span-12 mt-2 pt-2 border-t border-gray-100 flex flex-wrap gap-4 items-center">
                      <div className="flex-1 min-w-[150px] space-y-1">
                        <label className="text-[10px] font-bold text-gray-400 uppercase">Exam Time</label>
                        <input
                          type="text"
                          placeholder="10:00 AM"
                          value={subject.time || ''}
                          onChange={e => handleSubjectChange(index, 'time', e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                        />
                      </div>
                      <label className="flex items-center gap-2 cursor-pointer pt-4">
                        <input 
                          type="checkbox" 
                          checked={subject.hasSubSections} 
                          onChange={e => handleSubjectChange(index, 'hasSubSections', e.target.checked)}
                          className="w-3 h-3 rounded text-indigo-600 focus:ring-indigo-500"
                        />
                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Has Parts (MCQ/CQ)</span>
                      </label>
                      {subject.hasSubSections && (
                        <button 
                          type="button" 
                          onClick={() => {
                            const ss = [...(subject.subSections || []), { name: '', totalMarks: 0 }];
                            handleSubjectChange(index, 'subSections', ss);
                          }}
                          className="text-[10px] font-bold text-indigo-600 hover:text-indigo-700 underline pt-4"
                        >
                          + Add Part
                        </button>
                      )}
                    </div>
                      
                      {subject.hasSubSections && (
                        <div className="mt-2 space-y-2 grid grid-cols-2 gap-2">
                          {(subject.subSections || []).map((ss, ssIdx) => (
                            <div key={ssIdx} className="flex gap-2 p-2 bg-white rounded border border-gray-200 shadow-sm relative group/part">
                              <input 
                                type="text" 
                                placeholder="Part Name" 
                                value={ss.name} 
                                onChange={e => {
                                  const updated = [...(subject.subSections || [])];
                                  updated[ssIdx].name = e.target.value;
                                  handleSubjectChange(index, 'subSections', updated);
                                }}
                                className="flex-1 px-2 py-1 text-[10px] border border-gray-100 rounded"
                                required
                              />
                              <input 
                                type="number" 
                                placeholder="Marks" 
                                value={ss.totalMarks || ''} 
                                onChange={e => {
                                  const updated = [...(subject.subSections || [])];
                                  updated[ssIdx].totalMarks = parseInt(e.target.value) || 0;
                                  handleSubjectChange(index, 'subSections', updated);
                                }}
                                className="w-12 px-2 py-1 text-[10px] border border-gray-100 rounded"
                                required
                              />
                              <button 
                                type="button" 
                                onClick={() => {
                                  const updated = (subject.subSections || []).filter((_, i) => i !== ssIdx);
                                  handleSubjectChange(index, 'subSections', updated);
                                }}
                                className="p-1 text-rose-500 hover:bg-rose-50 rounded hidden group-hover/part:block absolute -right-1 -top-1 bg-white border border-rose-100"
                              >
                                <Plus className="w-3 h-3 rotate-45" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                ))}
              </div>
            </div>
          )}

          <button 
            type="submit" 
            disabled={isSaving}
            className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
            {t('offlineExams.modal.submitCreate')}
          </button>
        </form>
      </Modal>

      <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title={t('offlineExams.modal.editTitle')} maxWidth="max-w-2xl">
        {editingExam && (
          <form onSubmit={handleEditExam} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">{t('offlineExams.modal.type')}</label>
                <select
                  value={editingExam.type}
                  onChange={e => setEditingExam({...editingExam, type: e.target.value as any})}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                >
                  <option value="single">{t('offlineExams.modal.types.single')}</option>
                  <option value="school">{t('offlineExams.modal.types.school')}</option>
                </select>
              </div>
              {/* Institution Name removed as it is pulled from profile */}
            </div>

            <div className="flex items-center gap-2">
              <input 
                type="checkbox" 
                id="editExamHasSubSections" 
                checked={editingExam.hasSubSections} 
                onChange={e => setEditingExam(prev => prev ? ({ ...prev, hasSubSections: e.target.checked, subSections: prev.subSections || [{ name: '', totalMarks: 0 }] }) : null)}
                className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              <label htmlFor="editExamHasSubSections" className="text-sm font-medium text-gray-700">
                Enable Sub-sections (e.g., MCQ, CQ, Viva)
              </label>
            </div>

            {editingExam.hasSubSections && editingExam.type === 'single' && (
              <div className="space-y-3 bg-indigo-50/50 p-4 rounded-xl border border-indigo-100">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-indigo-700 uppercase tracking-widest">Sub-sections</span>
                  <button 
                    type="button" 
                    onClick={() => setEditingExam(prev => prev ? ({ ...prev, subSections: [...(prev.subSections || []), { name: '', totalMarks: 0 }] }) : null)}
                    className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" /> Add Part
                  </button>
                </div>
                {(editingExam.subSections || []).map((ss, idx) => (
                  <div key={idx} className="flex gap-2">
                    <input 
                      type="text" 
                      placeholder="Part Name" 
                      value={ss.name} 
                      onChange={e => {
                        const updated = [...(editingExam.subSections || [])];
                        updated[idx].name = e.target.value;
                        setEditingExam({...editingExam, subSections: updated});
                      }}
                      className="flex-1 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs"
                      required
                    />
                    <input 
                      type="number" 
                      placeholder="Marks" 
                      value={ss.totalMarks || ''} 
                      onChange={e => {
                        const updated = [...(editingExam.subSections || [])];
                        updated[idx].totalMarks = parseInt(e.target.value) || 0;
                        const total = updated.reduce((sum, s) => sum + s.totalMarks, 0);
                        setEditingExam({...editingExam, subSections: updated, totalMarks: total});
                      }}
                      className="w-20 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs"
                      required
                    />
                    <button 
                      type="button" 
                      onClick={() => {
                        const updated = (editingExam.subSections || []).filter((_, i) => i !== idx);
                        const total = updated.reduce((sum, s) => sum + s.totalMarks, 0);
                        setEditingExam({...editingExam, subSections: updated, totalMarks: total});
                      }}
                      className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg"
                    >
                      <Plus className="w-4 h-4 rotate-45" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">{t('offlineExams.modal.examTitle')}</label>
                <input
                  required
                  type="text"
                  placeholder={editingExam.type === 'single' ? "e.g. Math Final" : "e.g. First Term Exam"}
                  value={editingExam.title}
                  onChange={e => setEditingExam({...editingExam, title: e.target.value})}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Exam Fee (Optional)</label>
                <input
                  type="number"
                  placeholder="৳0.00"
                  value={editingExam.examFee || ''}
                  onChange={e => setEditingExam({...editingExam, examFee: parseInt(e.target.value) || 0})}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-bold text-indigo-600"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">{t('offlineExams.modal.selectBatch')}</label>
                <select
                  required
                  value={editingExam.batchId}
                  onChange={e => setEditingExam({...editingExam, batchId: e.target.value})}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                >
                  <option value="">{t('offlineExams.modal.selectBatch')}</option>
                  {batches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>
            </div>

            {editingExam.type === 'single' ? (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">{t('offlineExams.modal.examDate')}</label>
                  <input
                    required
                    type="date"
                    value={editingExam.date}
                    onChange={e => setEditingExam({...editingExam, date: e.target.value})}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">{t('offlineExams.modal.totalMarks')}</label>
                  <input
                    required
                    type="number"
                    value={editingExam.totalMarks}
                    onChange={e => setEditingExam({...editingExam, totalMarks: parseInt(e.target.value)})}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">{t('offlineExams.modal.subjectsAndMarks')}</label>
                  <button 
                    type="button"
                    onClick={() => setEditingExam({...editingExam, subjects: [...(editingExam.subjects || []), { name: '', totalMarks: 100, date: new Date().toISOString().split('T')[0] }]})}
                    className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" /> {t('offlineExams.modal.addSubject')}
                  </button>
                </div>
                <div className="space-y-3">
                  {editingExam.subjects?.map((subject, index) => (
                    <div key={index} className="grid grid-cols-12 gap-3 items-end bg-gray-50 p-3 rounded-xl border border-gray-100">
                      <div className="col-span-5 space-y-1">
                        <label className="text-[10px] font-bold text-gray-400 uppercase">{t('offlineExams.modal.subjectName')}</label>
                        <input
                          required
                          type="text"
                          value={subject.name}
                          onChange={e => {
                            const newSubjects = [...(editingExam.subjects || [])];
                            newSubjects[index].name = e.target.value;
                            setEditingExam({...editingExam, subjects: newSubjects});
                          }}
                          className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                        />
                      </div>
                      <div className="col-span-3 space-y-1">
                        <label className="text-[10px] font-bold text-gray-400 uppercase">{t('offlineExams.modal.marks')}</label>
                        <input
                          required
                          type="number"
                          value={subject.totalMarks}
                          onChange={e => {
                            const newSubjects = [...(editingExam.subjects || [])];
                            newSubjects[index].totalMarks = parseInt(e.target.value);
                            setEditingExam({...editingExam, subjects: newSubjects});
                          }}
                          className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                        />
                      </div>
                      <div className="col-span-3 space-y-1">
                        <label className="text-[10px] font-bold text-gray-400 uppercase">{t('offlineExams.modal.date')}</label>
                        <input
                          required
                          type="date"
                          value={subject.date}
                          onChange={e => {
                            const newSubjects = [...(editingExam.subjects || [])];
                            newSubjects[index].date = e.target.value;
                            setEditingExam({...editingExam, subjects: newSubjects});
                          }}
                          className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                        />
                      </div>
                      <div className="col-span-1 flex justify-center">
                        <button 
                          type="button"
                          onClick={() => {
                            const newSubjects = editingExam.subjects?.filter((_, i) => i !== index);
                            setEditingExam({...editingExam, subjects: newSubjects});
                          }}
                          className="p-2 text-gray-400 hover:text-rose-600 transition-colors"
                        >
                          <Plus className="w-4 h-4 rotate-45" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-2 border-t border-gray-100 pt-6">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-2">Combine with other exams (for Final Result)</label>
              <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto p-3 bg-gray-50 rounded-xl border border-gray-100">
                {exams.filter(e => e.batchId === editingExam.batchId && e.id !== editingExam.id).map(exam => (
                  <label key={exam.id} className="flex items-center gap-2 p-2 bg-white rounded-lg border border-gray-100 cursor-pointer hover:border-indigo-200 transition-colors">
                    <input 
                      type="checkbox"
                      checked={editingExam.linkedExams?.includes(exam.id)}
                      onChange={e => {
                        const current = editingExam.linkedExams || [];
                        const updated = e.target.checked 
                          ? [...current, exam.id]
                          : current.filter(id => id !== exam.id);
                        setEditingExam({...editingExam, linkedExams: updated});
                      }}
                      className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="text-xs font-medium text-gray-700 truncate">{exam.title}</span>
                  </label>
                ))}
                {exams.filter(e => e.batchId === editingExam.batchId && e.id !== editingExam.id).length === 0 && (
                  <p className="text-[10px] text-gray-400 italic col-span-2 text-center py-2">No other exams found for this batch.</p>
                )}
              </div>
            </div>

            <button type="submit" className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200">
              {t('offlineExams.modal.submitUpdate')}
            </button>
          </form>
        )}
      </Modal>

      <Modal 
        isOpen={isManageModalOpen} 
        onClose={() => setIsManageModalOpen(false)} 
        title={`${t('offlineExams.card.manage')}: ${selectedExam?.title}`} 
        maxWidth={manageTab === 'overview' || manageTab === 'results' ? "max-w-4xl" : "max-w-7xl"}
        fullScreen={manageTab === 'admit-cards' || manageTab === 'seat-plan'}
        hideHeader={manageTab === 'admit-cards'}
      >
        <div className={cn("flex flex-col h-full", (manageTab === 'admit-cards' || manageTab === 'seat-plan') ? "p-0 space-y-0" : "p-6 space-y-6")}>
          <div className={cn("flex items-center gap-2 p-1 bg-gray-100 rounded-xl overflow-x-auto no-scrollbar shrink-0", (manageTab === 'admit-cards' || manageTab === 'seat-plan') && "m-4")}>
            {['overview', 'seat-plan', 'admit-cards', 'results'].map((tab) => (
              <button
                key={tab}
                onClick={() => setManageTab(tab as any)}
                className={cn(
                  "min-w-fit flex-1 py-2 px-4 text-[10px] md:text-xs font-bold uppercase tracking-wider rounded-lg transition-all whitespace-nowrap",
                  manageTab === tab ? "bg-white text-indigo-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
                )}
              >
                {t(`offlineExams.manage.tabs.${tab === 'seat-plan' ? 'seatPlan' : tab === 'admit-cards' ? 'admitCards' : tab}`)}
              </button>
            ))}
          </div>

          {manageTab === 'overview' && (
            <div className="flex-1 overflow-y-auto space-y-6 scrollbar-hide pr-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wider">{t('offlineExams.modal.examTitle')}</h4>
                  <div className="flex items-center gap-2">
                    {selectedExam?.isPublished ? (
                      <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[10px] font-bold rounded-full flex items-center gap-1">
                        <Globe className="w-3 h-3" /> Published
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 bg-gray-100 text-gray-500 text-[10px] font-bold rounded-full">Draft</span>
                    )}
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">{t('offlineExams.modal.type')}:</span>
                    <span className="font-bold text-gray-900 uppercase">{selectedExam?.type}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">{t('offlineExams.modal.selectBatch')}:</span>
                    <span className="font-bold text-gray-900">{selectedExam?.batchName}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">{t('offlineExams.table.status')}:</span>
                    <span className="font-bold text-indigo-600 uppercase">{selectedExam ? t(`offlineExams.status.${selectedExam.status}`) : ''}</span>
                  </div>
                  {selectedExam?.type === 'single' ? (
                    <>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">{t('offlineExams.modal.examDate')}:</span>
                        <span className="font-bold text-gray-900">{selectedExam.date ? new Date(selectedExam.date).toLocaleDateString() : 'N/A'}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500 text-[10px] uppercase font-bold tracking-widest">Time:</span>
                        <span className="font-bold text-gray-900">{selectedExam.time || '10:00 AM'}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">{t('offlineExams.modal.totalMarks')}:</span>
                        <span className="font-bold text-gray-900">{selectedExam.totalMarks}</span>
                      </div>
                      {selectedExam.examFee ? (
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">Exam Fee:</span>
                          <span className="font-black text-rose-600">৳{selectedExam.examFee}</span>
                        </div>
                      ) : null}
                    </>
                  ) : (
                    <div className="pt-3 border-t border-gray-200">
                      <span className="text-xs font-bold text-gray-400 uppercase">{t('offlineExams.card.subjects')}</span>
                      <div className="mt-2 space-y-2">
                        {selectedExam?.subjects?.map((s, i) => (
                          <div key={i} className="flex flex-col gap-1 pb-2 border-b border-gray-50 last:border-0">
                            <div className="flex justify-between text-xs">
                              <span className="font-bold text-gray-900">{s.name}</span>
                              <span className="font-bold text-indigo-600">{s.totalMarks} {t('offlineExams.modal.marks')}</span>
                            </div>
                            <div className="flex justify-between text-[10px] text-gray-500">
                              <span>{new Date(s.date).toLocaleDateString()}</span>
                              <span className="italic font-medium">{s.time || '10:00 AM'}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {selectedExam?.linkedExams && selectedExam.linkedExams.length > 0 && (
                    <div className="pt-3 border-t border-gray-200">
                      <span className="text-xs font-bold text-indigo-600 uppercase tracking-widest">Combined with:</span>
                      <div className="mt-2 flex flex-wrap gap-1">
                        {exams.filter(e => selectedExam.linkedExams?.includes(e.id)).map(e => (
                          <span key={e.id} className="px-2 py-0.5 bg-indigo-50 text-indigo-700 text-[9px] font-bold rounded border border-indigo-100">
                            {e.title}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-indigo-50 p-6 rounded-2xl border border-indigo-100">
                <h4 className="text-sm font-bold text-indigo-900 uppercase tracking-wider mb-4">{t('offlineExams.card.manage')}</h4>
                <div className="grid grid-cols-1 gap-3">
                  <button 
                    onClick={() => generatePDF(scheduleRef, `Exam_Schedule_${selectedExam?.title}`)} 
                    disabled={isGeneratingPDF}
                    className="w-full py-3 bg-white text-indigo-600 rounded-xl text-sm font-bold hover:bg-indigo-50 transition-all border border-indigo-100 flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isGeneratingPDF ? <Loader2 className="w-4 h-4 animate-spin" /> : <Calendar className="w-4 h-4" />}
                    {t('offlineExams.manage.overview.downloadSchedule')}
                  </button>
                  <button onClick={() => setManageTab('seat-plan')} className="w-full py-3 bg-white text-indigo-600 rounded-xl text-sm font-bold hover:bg-indigo-50 transition-all border border-indigo-100">{t('offlineExams.manage.seatPlan.title')}</button>
                  <button onClick={() => setManageTab('admit-cards')} className="w-full py-3 bg-white text-indigo-600 rounded-xl text-sm font-bold hover:bg-indigo-50 transition-all border border-indigo-100">{t('offlineExams.manage.admitCards.title')}</button>
                  <button onClick={() => setManageTab('results')} className="w-full py-3 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 transition-all shadow-md shadow-indigo-200">{t('offlineExams.manage.results.title')}</button>
                </div>
              </div>

              {/* PDF Template for Schedule (Off-screen) */}
              <div className="fixed left-[-9999px] top-0 pointer-events-none">
                <div ref={scheduleRef} className="p-8 w-[210mm] min-h-[297mm] relative" style={{ backgroundColor: '#ffffff', fontFamily: "'Inter', 'Noto Sans Bengali', sans-serif" }}>
                  {/* Background Pattern */}
                  <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#4f46e5 1px, rgba(255, 255, 255, 0) 0)', backgroundSize: '32px 32px', opacity: 0.02 }}></div>
                  
                  <div className="border-[12px] border-double p-8 h-full relative z-10 flex flex-col" style={{ borderColor: '#4f46e5', backgroundColor: 'rgba(255, 255, 255, 0.95)', minHeight: '281mm', borderRadius: '2.5rem' }}>
                    <div className="text-center mb-10">
                      <div className="flex items-center justify-center gap-6 mb-8">
                        {user?.photoURL && <img src={user.photoURL} className="border-4" referrerPolicy="no-referrer" style={{ width: '80px', height: '80px', borderRadius: '1rem', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)', borderColor: '#ffffff' }} />}
                        <div className="text-left">
                          <h1 className="text-4xl font-black uppercase tracking-tighter leading-none" style={{ color: '#4f46e5' }}>{selectedExam?.institutionName}</h1>
                          <p className="font-black uppercase tracking-[0.4em] text-[8px] mt-2" style={{ color: '#9ca3af' }}>Official Examination Schedule</p>
                        </div>
                      </div>
                      <div className="h-1 w-32 mx-auto mb-8 rounded-full" style={{ backgroundColor: '#4f46e5' }}></div>
                      <h2 className="text-3xl font-black uppercase tracking-[0.15em] mb-3" style={{ color: '#111827' }}>{selectedExam?.title}</h2>
                      <p className="text-lg font-bold uppercase tracking-widest" style={{ color: '#4f46e5' }}>ব্যাচ: {selectedExam?.batchName}</p>
                    </div>

                    <div className="flex-grow">
                      <div className="overflow-hidden border-2" style={{ borderColor: '#e0e7ff', borderRadius: '2rem', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }}>
                        <table className="w-full border-collapse">
                          <thead>
                            <tr style={{ backgroundColor: '#4f46e5', color: '#ffffff' }}>
                              <th className="py-6 px-10 text-left font-black uppercase tracking-widest text-[11px]">{t('offlineExams.modal.subjectName')}</th>
                              <th className="py-6 px-10 text-left font-black uppercase tracking-widest text-[11px]">{t('offlineExams.modal.date')}</th>
                              <th className="py-6 px-10 text-left font-black uppercase tracking-widest text-[11px]">সময়</th>
                              <th className="py-6 px-10 text-center font-black uppercase tracking-widest text-[11px]">{t('offlineExams.modal.marks')}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {selectedExam?.type === 'school' ? (
                              selectedExam.subjects?.map((s, i) => (
                                <tr key={i} className="border-b" style={{ backgroundColor: i % 2 === 0 ? '#ffffff' : 'rgba(238, 242, 255, 0.2)', borderColor: '#eef2ff' }}>
                                  <td className="py-6 px-10 font-black text-xl" style={{ color: '#111827' }}>{s.name}</td>
                                  <td className="py-6 px-10 font-bold text-sm" style={{ color: '#374151' }}>{new Date(s.date).toLocaleDateString('bn-BD', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</td>
                                  <td className="py-6 px-10 font-medium italic text-sm" style={{ color: '#4b5563' }}>{s.time || '10:00 AM'}</td>
                                  <td className="py-6 px-10 text-center">
                                    <span className="px-5 py-2 rounded-xl font-black text-lg" style={{ backgroundColor: '#e0e7ff', color: '#4338ca' }}>{s.totalMarks}</span>
                                  </td>
                                </tr>
                              ))
                            ) : (
                              <tr style={{ backgroundColor: '#ffffff' }}>
                                <td className="py-6 px-10 font-black text-xl" style={{ color: '#111827' }}>{selectedExam?.title}</td>
                                <td className="py-6 px-10 font-bold text-sm" style={{ color: '#374151' }}>{selectedExam?.date ? new Date(selectedExam.date).toLocaleDateString('bn-BD', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : 'N/A'}</td>
                                <td className="py-6 px-10 font-medium italic text-sm" style={{ color: '#4b5563' }}>{selectedExam?.time || '10:00 AM'}</td>
                                <td className="py-6 px-10 text-center">
                                  <span className="px-5 py-2 rounded-xl font-black text-lg" style={{ backgroundColor: '#e0e7ff', color: '#4338ca' }}>{selectedExam?.totalMarks}</span>
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    <div className="mt-10 grid grid-cols-2 gap-20 px-12 pb-20">
                      <div className="text-center">
                        <div className="h-px w-full mb-2" style={{ backgroundColor: '#d1d5db' }}></div>
                        <p className="font-black uppercase text-[10px] tracking-widest" style={{ color: '#111827' }}>অধ্যক্ষের স্বাক্ষর</p>
                      </div>
                      <div className="text-center">
                        <div className="h-px w-full mb-2" style={{ backgroundColor: '#d1d5db' }}></div>
                        <p className="font-black uppercase text-[10px] tracking-widest" style={{ color: '#111827' }}>পরীক্ষা নিয়ন্ত্রক</p>
                      </div>
                    </div>

                    <div className="absolute bottom-10 left-0 right-0 text-center">
                      <div className="flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-[0.4em]" style={{ color: '#9ca3af' }}>
                        <span>Powered by</span>
                        <span style={{ color: '#4f46e5' }}>Manage My Batch</span>
                        <span>ম্যানেজমেন্ট সিস্টেম</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          )}

          {manageTab === 'seat-plan' && (
            <div className="flex-1 overflow-hidden">
              <div className="h-full space-y-6 overflow-y-auto p-4">
              <div className="flex items-center justify-between">
                <h4 className="text-lg font-bold text-gray-900">{t('offlineExams.manage.seatPlan.title')} - {selectedExam?.batchName}</h4>
                <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 transition-all">{t('offlineExams.manage.seatPlan.download')}</button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {examStudents.map((student) => (
                  <div key={student.id} className="p-4 bg-white border-2 border-dashed border-gray-200 rounded-xl text-center">
                    <p className="text-xs font-bold text-indigo-600 uppercase mb-1">{t('attendance.table.rollNo')}: {student.rollNo}</p>
                    <p className="text-sm font-bold text-gray-900 truncate">{student.name}</p>
                    <p className="text-[10px] text-gray-400 mt-1">{selectedExam?.title}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
          )}

          {manageTab === 'admit-cards' && (
            <div className="flex-1 overflow-hidden">
              <AdmitCardDesigner 
              students={examStudents.map(s => ({
                id: s.id,
                name: s.name,
                rollNo: s.rollNo,
                photoUrl: s.photoUrl,
                batchName: selectedExam?.batchName,
                studentId: s.rollNo
              }))}
              exam={selectedExam}
              institution={instData}
              onClose={() => setManageTab('overview')}
            />
          </div>
          )}

          {manageTab === 'results' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <h4 className="text-lg font-bold text-gray-900">{t('offlineExams.manage.results.title')}</h4>
                <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                  <button 
                    onClick={handleTogglePublish}
                    disabled={isSaving}
                    className={cn(
                      "flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-md disabled:opacity-50",
                      selectedExam?.isPublished 
                        ? "bg-amber-600 text-white hover:bg-amber-700 shadow-amber-100" 
                        : "bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-100"
                    )}
                  >
                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Globe className="w-4 h-4" />}
                    {selectedExam?.isPublished ? "Unpublish from Website" : "Publish on Website"}
                  </button>
                  <button 
                    onClick={handleSaveResults}
                    disabled={isSaving}
                    className="flex-1 sm:flex-none px-4 py-2 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 transition-all flex items-center justify-center gap-2 shadow-md shadow-emerald-100 disabled:opacity-50"
                  >
                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    {t('offlineExams.manage.results.save')}
                  </button>
                  <button 
                    onClick={() => generatePDF(resultsRef, `Result_Sheet_${selectedExam?.title}`)}
                    disabled={isGeneratingPDF}
                    className="flex-1 sm:flex-none px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-md shadow-indigo-100"
                  >
                    {isGeneratingPDF ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                    Download Overall Sheet
                  </button>
                  <button 
                    onClick={handleSendAllResultsSMS}
                    disabled={isSendingSMS}
                    className="flex-1 sm:flex-none px-4 py-2 bg-rose-600 text-white rounded-lg text-xs font-bold hover:bg-rose-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-md shadow-rose-100"
                  >
                    {isSendingSMS ? <Loader2 className="w-4 h-4 animate-spin" /> : <MessageSquare className="w-4 h-4" />}
                    SMS ALL Results
                  </button>
                </div>
              </div>

              {selectedExam?.linkedExams && selectedExam.linkedExams.length > 0 && (
                <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-2xl flex items-center gap-3">
                  <Award className="w-5 h-5 text-indigo-600" />
                  <p className="text-xs text-indigo-800 font-medium tracking-tight">
                    This is a <span className="font-bold">Combined Result</span> including: 
                    <span className="font-bold italic ml-1">
                      {exams.filter(e => selectedExam.linkedExams?.includes(e.id)).map(e => e.title).join(', ')}
                    </span>
                  </p>
                </div>
              )}

              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                {/* Desktop Table */}
                <div className="hidden lg:block overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-100">
                        <th className="py-4 px-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Rank</th>
                        <th className="py-4 px-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Roll</th>
                        <th className="py-4 px-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Student Name</th>
                        {selectedExam?.type === 'single' ? (
                          selectedExam.hasSubSections ? (
                            selectedExam.subSections?.map((ss, idx) => (
                              <th key={idx} className="py-4 px-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">{ss.name} (/{ss.totalMarks})</th>
                            ))
                          ) : (
                            <th className="py-4 px-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Marks (/{selectedExam.totalMarks})</th>
                          )
                        ) : (
                          selectedExam?.subjects?.map((s, i) => (
                            s.hasSubSections ? (
                              s.subSections?.map((ss, idx) => (
                                <th key={`${i}-${idx}`} className="py-4 px-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">{s.name} - {ss.name} (/{ss.totalMarks})</th>
                              ))
                            ) : (
                              <th key={i} className="py-4 px-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">{s.name} (/{s.totalMarks})</th>
                            )
                          ))
                        )}
                        <th className="py-4 px-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Total</th>
                        <th className="py-4 px-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Grade</th>
                        <th className="py-4 px-6 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {getRankedStudents().map((student) => (
                        <tr key={student.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                          <td className="py-4 px-6">
                            <span className={cn(
                              "w-6 h-6 flex items-center justify-center rounded-full text-[10px] font-black",
                              student.rank === 1 ? "bg-amber-100 text-amber-700" : 
                              student.rank === 2 ? "bg-slate-100 text-slate-700" :
                              student.rank === 3 ? "bg-orange-100 text-orange-700" : "bg-gray-100 text-gray-500"
                            )}>
                              {student.rank}
                            </span>
                          </td>
                          <td className="py-4 px-6 text-sm font-mono text-indigo-600 font-bold">{student.rollNo}</td>
                          <td className="py-4 px-6 text-sm font-bold text-gray-900">{student.name}</td>
                          {selectedExam?.type === 'single' ? (
                            selectedExam.hasSubSections ? (
                              selectedExam.subSections?.map((ss, idx) => (
                                <td key={idx} className="py-4 px-6">
                                  <input 
                                    type="number" 
                                    value={studentMarks[student.id]?.[ss.name] || ''}
                                    onChange={(e) => handleMarkChange(student.id, ss.name, e.target.value)}
                                    className="w-20 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/20" 
                                    placeholder="0" 
                                  />
                                </td>
                              ))
                            ) : (
                              <td className="py-4 px-6">
                                <input 
                                  type="number" 
                                  value={studentMarks[student.id]?.['total'] || ''}
                                  onChange={(e) => handleMarkChange(student.id, 'total', e.target.value)}
                                  className="w-24 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/20" 
                                  placeholder="0" 
                                />
                              </td>
                            )
                          ) : (
                            selectedExam?.subjects?.map((s, i) => (
                              s.hasSubSections ? (
                                s.subSections?.map((ss, idx) => (
                                  <td key={`${i}-${idx}`} className="py-4 px-6">
                                    <input 
                                      type="number" 
                                      value={studentMarks[student.id]?.[`${s.name}_${ss.name}`] || ''}
                                      onChange={(e) => handleMarkChange(student.id, `${s.name}_${ss.name}`, e.target.value)}
                                      className="w-20 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/20" 
                                      placeholder="0" 
                                    />
                                  </td>
                                ))
                              ) : (
                                <td key={i} className="py-4 px-6">
                                  <input 
                                    type="number" 
                                    value={studentMarks[student.id]?.[s.name] || ''}
                                    onChange={(e) => handleMarkChange(student.id, s.name, e.target.value)}
                                    className="w-24 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/20" 
                                    placeholder="0" 
                                  />
                                </td>
                              )
                            ))
                          )}
                          <td className="py-4 px-6 text-sm font-black text-indigo-600">{student.totalObtained}</td>
                          <td className="py-4 px-6">
                            <span className={cn(
                              "px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest",
                              student.grade === 'A+' ? "bg-emerald-100 text-emerald-700" :
                              student.grade === 'F' ? "bg-rose-100 text-rose-700" : "bg-indigo-100 text-indigo-700"
                            )}>
                              {student.grade}
                            </span>
                          </td>
                          <td className="py-4 px-6 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() => {
                                  setSelectedStudentForStory(student);
                                  setIsSuccessStoryModalOpen(true);
                                }}
                                className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                                title="Generate Success Story Image"
                              >
                                <ImageIcon className="w-5 h-5" />
                              </button>
                              <button
                                onClick={() => {
                                  setSelectedStudentForResult(student);
                                  setIsMarkSheetModalOpen(true);
                                }}
                                className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"
                                title="Download Marksheet"
                              >
                                <Award className="w-5 h-5" />
                              </button>
                              <button
                                onClick={() => alert(i18n?.language === 'bn' ? 'শীঘ্রই আসছে (Coming Soon)' : 'Coming Soon')}
                                className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-all"
                                title="এআই খাতা মূল্যায়ন (AI Paper Analysis)"
                              >
                                <Sparkles className="w-5 h-5" />
                              </button>
                              <button
                                onClick={() => {
                                  const rankedInfo = getRankedStudents().find(s => s.id === student.id);
                                  if (rankedInfo) handleSendResultSMS(student, rankedInfo);
                                }}
                                disabled={isSendingSMS}
                                className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all disabled:opacity-50"
                                title="Send Result SMS"
                              >
                                {isSendingSMS ? <Loader2 className="w-5 h-5 animate-spin" /> : <MessageSquare className="w-5 h-5" />}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Results Cards */}
                <div className="lg:hidden divide-y divide-gray-100">
                  {getRankedStudents().map((student) => (
                    <div key={student.id} className="p-4 space-y-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <span className={cn(
                            "w-8 h-8 flex items-center justify-center rounded-full text-xs font-black shrink-0",
                            student.rank === 1 ? "bg-amber-100 text-amber-700" : 
                            student.rank === 2 ? "bg-slate-100 text-slate-700" :
                            student.rank === 3 ? "bg-orange-100 text-orange-700" : "bg-gray-100 text-gray-500"
                          )}>
                            {student.rank}
                          </span>
                          <div>
                            <p className="font-black text-gray-900 leading-tight">{student.name}</p>
                            <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest mt-0.5">Roll: {student.rollNo}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-black text-indigo-600">{student.totalObtained}</p>
                          <span className={cn(
                            "px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest block mt-1",
                            student.grade === 'A+' ? "bg-emerald-100 text-emerald-700" :
                            student.grade === 'F' ? "bg-rose-100 text-rose-700" : "bg-indigo-100 text-indigo-700"
                          )}>
                            {student.grade}
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        {selectedExam?.type === 'single' ? (
                          selectedExam.hasSubSections ? (
                            selectedExam.subSections?.map((ss, idx) => (
                              <div key={idx} className="space-y-1">
                                <label className="text-[10px] font-bold text-gray-400 uppercase">{ss.name} (/{ss.totalMarks})</label>
                                <input 
                                  type="number" 
                                  value={studentMarks[student.id]?.[ss.name] || ''}
                                  onChange={(e) => handleMarkChange(student.id, ss.name, e.target.value)}
                                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold" 
                                  placeholder="0" 
                                />
                              </div>
                            ))
                          ) : (
                            <div className="col-span-2 space-y-1">
                              <label className="text-[10px] font-bold text-gray-400 uppercase">Marks (/{selectedExam.totalMarks})</label>
                              <input 
                                type="number" 
                                value={studentMarks[student.id]?.['total'] || ''}
                                onChange={(e) => handleMarkChange(student.id, 'total', e.target.value)}
                                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold" 
                                placeholder="0" 
                              />
                            </div>
                          )
                        ) : (
                          selectedExam?.subjects?.map((s, i) => (
                            s.hasSubSections ? (
                              s.subSections?.map((ss, idx) => (
                                <div key={`${i}-${idx}`} className="space-y-1">
                                  <label className="text-[10px] font-bold text-gray-400 uppercase">{s.name} - {ss.name}</label>
                                  <input 
                                    type="number" 
                                    value={studentMarks[student.id]?.[`${s.name}_${ss.name}`] || ''}
                                    onChange={(e) => handleMarkChange(student.id, `${s.name}_${ss.name}`, e.target.value)}
                                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold" 
                                    placeholder="0" 
                                  />
                                </div>
                              ))
                            ) : (
                              <div key={i} className="space-y-1">
                                <label className="text-[10px] font-bold text-gray-400 uppercase">{s.name} (/{s.totalMarks})</label>
                                <input 
                                  type="number" 
                                  value={studentMarks[student.id]?.[s.name] || ''}
                                  onChange={(e) => handleMarkChange(student.id, s.name, e.target.value)}
                                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold" 
                                  placeholder="0" 
                                />
                              </div>
                            )
                          ))
                        )}
                      </div>

                      <div className="flex gap-2 pt-2">
                        <button
                          onClick={() => {
                            setSelectedStudentForStory(student);
                            setIsSuccessStoryModalOpen(true);
                          }}
                          className="flex-1 py-2.5 bg-indigo-50 text-indigo-600 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2"
                        >
                          <ImageIcon className="w-3.5 h-3.5" /> Success Story
                        </button>
                        {selectedExam?.type === 'school' && (
                          <button
                            onClick={() => {
                              setSelectedStudentForResult(student);
                              setIsMarkSheetModalOpen(true);
                            }}
                            className="flex-1 py-1.5 bg-emerald-50 text-emerald-600 rounded-lg text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-2"
                          >
                            <Award className="w-3 h-3" /> Marksheet
                          </button>
                        )}
                        <button
                          onClick={() => alert(i18n?.language === 'bn' ? 'শীঘ্রই আসছে (Coming Soon)' : 'Coming Soon')}
                          className="flex-1 py-1.5 bg-purple-50 text-purple-600 rounded-lg text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-2"
                        >
                          <Sparkles className="w-3 h-3" /> AI Analyze
                        </button>
                        <button
                          onClick={() => {
                            const rankedInfo = getRankedStudents().find(s => s.id === student.id);
                            if (rankedInfo) handleSendResultSMS(student, rankedInfo);
                          }}
                          disabled={isSendingSMS}
                          className="flex-1 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-indigo-100 disabled:opacity-50"
                        >
                          {isSendingSMS ? <Loader2 className="w-3 h-3 animate-spin" /> : <MessageSquare className="w-3 h-3" />}
                          SMS Result
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* PDF Template for Results (Off-screen) */}
              <div className="fixed left-[-9999px] top-0 pointer-events-none">
                <div ref={resultsRef} className="p-12 w-[210mm] min-h-[297mm] relative font-sans" style={{ backgroundColor: '#ffffff' }}>
                  {/* Background Pattern */}
                  <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: 'linear-gradient(45deg, #4f46e5 1px, rgba(255, 255, 255, 0) 1px)', backgroundSize: '40px 40px', opacity: 0.02 }}></div>
                  
                  {/* Watermark */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none rotate-[-45deg]" style={{ opacity: 0.04 }}>
                    {user?.photoURL ? (
                      <img src={user.photoURL} className="grayscale" style={{ width: '384px', height: '384px', objectFit: 'contain' }} referrerPolicy="no-referrer" />
                    ) : (
                      <h1 className="text-9xl font-black uppercase tracking-[0.5em]">Manage My Batch</h1>
                    )}
                  </div>

                  <div className="border-8 border-double p-10 h-full relative z-10" style={{ borderColor: '#4f46e5', backgroundColor: 'rgba(255, 255, 255, 0.9)' }}>
                    <div className="text-center mb-12">
                      <div className="flex items-center justify-center gap-6 mb-8">
                        {user?.photoURL && <img src={user.photoURL} className="border-4" referrerPolicy="no-referrer" style={{ width: '96px', height: '96px', borderRadius: '1.5rem', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)', borderColor: '#ffffff' }} />}
                        <div className="text-left">
                          <h1 className="text-5xl font-black uppercase tracking-tighter leading-none" style={{ color: '#4f46e5' }}>{selectedExam?.institutionName}</h1>
                          <p className="font-black uppercase tracking-[0.4em] text-[10px] mt-3" style={{ color: '#9ca3af' }}>Official Academic Performance Record</p>
                        </div>
                      </div>
                      <div className="h-2 w-64 mx-auto mb-10" style={{ background: 'linear-gradient(to right, rgba(255, 255, 255, 0), #4f46e5, rgba(255, 255, 255, 0))' }}></div>
                      <h2 className="text-4xl font-black uppercase tracking-[0.2em] mb-3" style={{ color: '#111827' }}>Result Sheet</h2>
                      <p className="text-2xl font-black uppercase tracking-widest" style={{ color: '#4f46e5' }}>{selectedExam?.title}</p>
                      <div className="flex items-center justify-center gap-12 mt-6 text-xs font-black uppercase tracking-[0.3em]" style={{ color: '#6b7280' }}>
                        <span>Batch: {selectedExam?.batchName}</span>
                        <span>Date: {new Date().toLocaleDateString()}</span>
                      </div>
                    </div>

                    <div className="overflow-hidden border-2" style={{ borderColor: '#e0e7ff', borderRadius: '2rem', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }}>
                      <table className="w-full border-collapse">
                        <thead>
                          <tr style={{ backgroundColor: '#4f46e5', color: '#ffffff' }}>
                            <th className="py-6 px-6 text-left font-black uppercase text-[10px] tracking-widest">র‍্যাঙ্ক</th>
                            <th className="py-6 px-6 text-left font-black uppercase text-[10px] tracking-widest">রোল</th>
                            <th className="py-6 px-6 text-left font-black uppercase text-[10px] tracking-widest">শিক্ষার্থীর নাম</th>
                            <th className="py-6 px-6 text-center font-black uppercase text-[10px] tracking-widest">মোট নম্বর</th>
                            <th className="py-6 px-6 text-center font-black uppercase text-[10px] tracking-widest">গ্রেড</th>
                          </tr>
                        </thead>
                        <tbody>
                          {getRankedStudents().map((student, i) => (
                            <tr key={student.id} className="border-b" style={{ backgroundColor: i % 2 === 0 ? '#ffffff' : 'rgba(238, 242, 255, 0.2)', borderColor: '#eef2ff' }}>
                              <td className="py-6 px-6 font-black text-lg" style={{ color: '#4f46e5' }}>#{student.rank}</td>
                              <td className="py-6 px-6 font-bold" style={{ color: '#4b5563' }}>{student.rollNo}</td>
                              <td className="py-6 px-6 font-black text-lg" style={{ color: '#111827' }}>{student.name}</td>
                              <td className="py-6 px-6 text-center">
                                <span className="px-4 py-1 rounded-full font-black text-lg" style={{ backgroundColor: '#e0e7ff', color: '#4338ca' }}>{student.totalObtained}</span>
                              </td>
                              <td className="py-6 px-6 text-center">
                                <span className="px-4 py-1 rounded-full font-black text-lg" style={{ 
                                  backgroundColor: student.grade === 'A+' ? '#d1fae5' : student.grade === 'F' ? '#fee2e2' : '#e0e7ff',
                                  color: student.grade === 'A+' ? '#047857' : student.grade === 'F' ? '#be123c' : '#4338ca'
                                }}>
                                  {student.grade}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="mt-32 grid grid-cols-3 gap-16 px-8">
                      <div className="text-center">
                        <div className="h-0.5 w-full mb-2" style={{ backgroundColor: '#111827' }}></div>
                        <p className="font-black uppercase text-[10px] tracking-widest" style={{ color: '#111827' }}>Class Teacher</p>
                      </div>
                      <div className="text-center">
                        <div className="h-0.5 w-full mb-2" style={{ backgroundColor: '#111827' }}></div>
                        <p className="font-black uppercase text-[10px] tracking-widest" style={{ color: '#111827' }}>Exam Controller</p>
                      </div>
                      <div className="text-center">
                        <div className="h-0.5 w-full mb-2" style={{ backgroundColor: '#111827' }}></div>
                        <p className="font-black uppercase text-[10px] tracking-widest" style={{ color: '#111827' }}>Principal</p>
                      </div>
                    </div>

                    <div className="absolute bottom-8 left-0 right-0 text-center">
                      <p className="text-[10px] font-black uppercase tracking-[0.6em]" style={{ color: '#9ca3af' }}>Manage My Batch Management System • Official Academic Document</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </Modal>
      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDeleteExam}
        title={t('offlineExams.deleteModal.title', { defaultValue: 'Delete Exam' })}
        message={t('offlineExams.deleteModal.message', { defaultValue: 'Are you sure you want to delete this exam? This action cannot be undone.' })}
        isLoading={isSaving}
      />

      <ConfirmModal
        isOpen={isSuccessModalOpen}
        onClose={() => setIsSuccessModalOpen(false)}
        onConfirm={() => setIsSuccessModalOpen(false)}
        title={t('common.success', { defaultValue: 'Success' })}
        message={successMessage}
        variant="info"
        confirmText={t('common.ok', { defaultValue: 'OK' })}
      />

      {/* Individual Marksheet PDF Modal */}
      <Modal 
        isOpen={isMarkSheetModalOpen} 
        onClose={() => setIsMarkSheetModalOpen(false)} 
        title={`Marksheet: ${selectedStudentForResult?.name}`}
        maxWidth="max-w-4xl"
      >
        <div className="space-y-6">
          <div className="flex justify-end gap-2">
            <button 
              onClick={() => generatePDF(markSheetRef, `Marksheet_${selectedStudentForResult?.rollNo}_${selectedStudentForResult?.name}`)}
              disabled={isGeneratingPDF}
              className="px-6 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 transition-all flex items-center gap-2 disabled:opacity-50"
            >
              {isGeneratingPDF ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              Download Marksheet
            </button>
          </div>

          <div className="bg-gray-100 p-8 rounded-2xl overflow-auto flex justify-center">
            <div ref={markSheetRef} className="bg-white p-12 w-[210mm] relative shadow-xl" style={{ minHeight: '297mm', fontFamily: "'Inter', 'Noto Sans Bengali', sans-serif" }}>
              <div className="border-[12px] border-double p-10 h-full relative z-10" style={{ borderColor: '#4f46e5', minHeight: '281mm' }}>
                <div className="text-center mb-12">
                   <div className="flex items-center justify-center gap-6 mb-8">
                    {user?.photoURL && <img src={user.photoURL} className="border-4" referrerPolicy="no-referrer" style={{ width: '80px', height: '80px', borderRadius: '1rem', borderColor: '#4f46e5' }} />}
                    <div className="text-left">
                      <h1 className="text-4xl font-black uppercase tracking-tighter" style={{ color: '#4f46e5' }}>{selectedExam?.institutionName}</h1>
                      <p className="font-bold uppercase tracking-[0.2em] text-[10px] mt-1" style={{ color: '#6b7280' }}>Progress Report Card</p>
                    </div>
                  </div>
                  <h2 className="text-2xl font-black uppercase mb-2" style={{ color: '#111827' }}>Marksheet</h2>
                  <p className="text-lg font-bold text-indigo-600 uppercase tracking-widest">{selectedExam?.title}</p>
                </div>

                <div className="grid grid-cols-2 gap-8 mb-10 pb-8 border-b-2 border-dashed border-gray-100">
                  <div className="space-y-4">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Student Name</p>
                      <p className="text-xl font-black text-gray-900">{selectedStudentForResult?.name}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Batch Group</p>
                      <p className="text-lg font-bold text-gray-700">{selectedExam?.batchName}</p>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Roll Number</p>
                      <p className="text-xl font-black text-indigo-600 font-mono">{selectedStudentForResult?.rollNo}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Issue Date</p>
                      <p className="text-lg font-bold text-gray-700">{new Date().toLocaleDateString()}</p>
                    </div>
                  </div>
                </div>

                    <div className="overflow-hidden border-2 rounded-[2rem]" style={{ borderColor: '#eef2ff' }}>
                      <table className="w-full border-collapse">
                        <thead>
                          <tr style={{ backgroundColor: '#4f46e5', color: '#ffffff' }}>
                            <th className="py-5 px-8 text-left font-black uppercase tracking-widest text-[10px]">Subject / Exam Name</th>
                            <th className="py-5 px-8 text-center font-black uppercase tracking-widest text-[10px]">Full Marks</th>
                            <th className="py-5 px-8 text-center font-black uppercase tracking-widest text-[10px]">Marks Obtained</th>
                            <th className="py-5 px-8 text-center font-black uppercase tracking-widest text-[10px]">Grade</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedExam?.linkedExams ? (
                            // For Combined Results
                            exams
                              .filter(e => selectedExam.linkedExams?.includes(e.id))
                              .map((le, idx) => {
                                const marks = le.studentMarks?.[selectedStudentForResult?.id] || {};
                                let obtained = 0;
                                let possible = 0;
                                
                                if (le.type === 'single') {
                                  if (le.hasSubSections && le.subSections) {
                                    le.subSections.forEach(ss => {
                                      obtained += marks[ss.name] || 0;
                                      possible += ss.totalMarks;
                                    });
                                  } else {
                                    obtained = marks['total'] || 0;
                                    possible = le.totalMarks || 100;
                                  }
                                } else {
                                  le.subjects?.forEach(s => {
                                    if (s.hasSubSections && s.subSections) {
                                      s.subSections.forEach(ss => {
                                        obtained += marks[`${s.name}_${ss.name}`] || 0;
                                      });
                                    } else {
                                      obtained += marks[s.name] || 0;
                                    }
                                    possible += s.totalMarks;
                                  });
                                }
                                
                                const grade = calculateGrade(obtained, possible);
                                return (
                                  <tr key={idx} className="border-b" style={{ borderColor: '#f8fafc', backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f8fafc' }}>
                                    <td className="py-5 px-8 font-bold text-gray-900">{le.title}</td>
                                    <td className="py-5 px-8 text-center font-bold text-gray-600">{possible}</td>
                                    <td className="py-5 px-8 text-center font-black text-indigo-600">{obtained}</td>
                                    <td className="py-5 px-8 text-center">
                                      <span className="font-black text-indigo-700">{grade}</span>
                                    </td>
                                  </tr>
                                );
                              })
                          ) : (
                            // For Normal Exams
                            selectedExam?.subjects?.map((s, idx) => {
                              const marks = studentMarks[selectedStudentForResult?.id] || {};
                              let obtained = 0;
                              if (s.hasSubSections && s.subSections) {
                                s.subSections.forEach(ss => {
                                  obtained += marks[`${s.name}_${ss.name}`] || 0;
                                });
                              } else {
                                obtained = marks[s.name] || 0;
                              }
                              const grade = calculateGrade(obtained, s.totalMarks);
                              
                              return (
                                <tr key={idx} className="border-b" style={{ borderColor: '#f8fafc', backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f8fafc' }}>
                                  <td className="py-5 px-8">
                                    <p className="font-bold text-gray-900">{s.name}</p>
                                    {s.hasSubSections && s.subSections && (
                                      <div className="mt-1 flex gap-2">
                                        {s.subSections.map((ss, ssIdx) => (
                                          <span key={ssIdx} className="text-[9px] font-medium text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded leading-none">
                                            {ss.name}: {marks[`${s.name}_${ss.name}`] || 0}/{ss.totalMarks}
                                          </span>
                                        ))}
                                      </div>
                                    )}
                                  </td>
                                  <td className="py-5 px-8 text-center font-bold text-gray-600">{s.totalMarks}</td>
                                  <td className="py-5 px-8 text-center font-black text-indigo-600">{obtained}</td>
                                  <td className="py-5 px-8 text-center">
                                    <span className="font-black text-indigo-700">{grade}</span>
                                  </td>
                                </tr>
                              );
                            })
                          )}
                          <tr className="bg-indigo-600 text-white">
                            <td className="py-6 px-8 font-black uppercase tracking-[0.2em] text-xs">Final Result</td>
                            <td className="py-6 px-8 text-center font-black text-lg">{getRankedStudents().find(s => s.id === selectedStudentForResult?.id)?.totalPossible}</td>
                            <td className="py-6 px-8 text-center font-black text-lg">{getRankedStudents().find(s => s.id === selectedStudentForResult?.id)?.totalObtained}</td>
                            <td className="py-6 px-8 text-center font-black text-lg">{getRankedStudents().find(s => s.id === selectedStudentForResult?.id)?.grade}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                <div className="mt-12 grid grid-cols-2 gap-20 px-10 pb-20">
                    <div className="text-center">
                      <div className="h-px w-full mb-2 bg-gray-200"></div>
                      <p className="font-black uppercase text-[10px] tracking-widest text-gray-900">Guardian Sign</p>
                    </div>
                    <div className="text-center">
                      <div className="h-px w-full mb-2 bg-gray-200"></div>
                      <p className="font-black uppercase text-[10px] tracking-widest text-gray-900">Principal Sign</p>
                    </div>
                </div>

                <div className="absolute bottom-8 left-0 right-0 text-center">
                   <p className="text-[8px] font-black uppercase tracking-[0.4em] text-gray-300">Generated by Manage My Batch Management System</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Modal>

      {/* Share Modal */}
      <Modal 
        isOpen={isShareModalOpen} 
        onClose={() => setIsShareModalOpen(false)} 
        title="রেজাল্ট লিঙ্ক শেয়ার করুন"
        maxWidth="max-w-md"
      >
        <div className="space-y-6">
          <div className="p-6 bg-indigo-50 rounded-3xl border border-indigo-100 flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-200 mb-4">
              <Share2 className="w-8 h-8 text-indigo-600" />
            </div>
            <h3 className="text-lg font-black text-gray-900 mb-2">রেজাল্ট লিঙ্ক তৈরি!</h3>
            <p className="text-sm text-gray-500 font-medium">এই লিঙ্কটি কপি করে শিক্ষার্থী বা অভিভাবকদের সাথে শেয়ার করুন।</p>
          </div>

          <div className="relative group">
            <input 
              readOnly
              type="text" 
              value={shareLink}
              className="w-full pl-4 pr-12 py-4 bg-gray-50 border border-gray-200 rounded-2xl text-xs font-mono font-bold text-gray-600 focus:outline-none"
            />
            <button 
              onClick={() => {
                navigator.clipboard.writeText(shareLink);
                alert('Link copied to clipboard!');
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
            >
              <Copy className="w-4 h-4" />
            </button>
          </div>

          <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100 flex gap-3">
            <Award className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            <p className="text-xs text-emerald-700 font-medium leading-relaxed">
              এই লিঙ্কে সবাই র‍্যাঙ্ক অনুযায়ী রেজাল্ট দেখতে পারবে। কোনো পাসওয়ার্ডের প্রয়োজন নেই।
            </p>
          </div>

          <button 
            onClick={() => setIsShareModalOpen(false)}
            className="w-full py-4 bg-gray-900 text-white rounded-2xl font-black hover:bg-gray-800 transition-all"
          >
            বন্ধ করুন
          </button>
        </div>
      </Modal>
      <Modal isOpen={isSuccessStoryModalOpen} onClose={() => setIsSuccessStoryModalOpen(false)} title="Success Story Image Generator" maxWidth="max-w-4xl">
        <div className="flex flex-col lg:flex-row gap-8 py-4">
          <div className="lg:w-1/3 space-y-6">
            <div className="p-4 bg-indigo-50 rounded-2xl border border-indigo-100">
               <p className="text-sm text-indigo-700 leading-relaxed font-medium">
                Tip: Share this on WhatsApp Status or Facebook. Branded images build high trust with other parents!
               </p>
            </div>
            <button 
              onClick={() => handleDownloadImage(successStoryRef, `Success_Story_${selectedStudentForStory?.name}`)}
              disabled={isGeneratingPDF}
              className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-indigo-700 disabled:opacity-50"
            >
              {isGeneratingPDF ? <Loader2 className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
              {t('marketing.social.download')}
            </button>
          </div>

          <div className="lg:w-2/3 flex justify-center bg-gray-50 p-8 rounded-3xl border-2 border-dashed border-gray-200 overflow-hidden">
            <div 
              ref={successStoryRef}
              className="w-[1080px] h-[1080px] bg-white relative overflow-hidden flex flex-col items-center justify-center p-12 text-center"
              style={{ backgroundColor: instData?.primaryColor || '#4f46e5' }}
            >
              {/* Decorative elements */}
              <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full -mr-32 -mt-32 blur-3xl" />
              <div className="absolute bottom-0 left-0 w-96 h-96 bg-white/10 rounded-full -ml-32 -mb-32 blur-3xl" />
              
              <div className="bg-white/95 backdrop-blur-md rounded-[60px] p-16 flex flex-col items-center w-full h-full shadow-2xl relative z-10 border border-white/20">
                <div className="flex items-center justify-between w-full mb-12">
                   {instData?.logoUrl && <img src={instData.logoUrl} className="h-16 object-contain" referrerPolicy="no-referrer" />}
                   <div className="text-right">
                     <h2 className="text-lg font-black text-gray-900 leading-none uppercase tracking-tight">{instData?.name}</h2>
                     <p className="text-xs text-indigo-600 font-bold tracking-widest uppercase mt-1">Excellence in Education</p>
                   </div>
                </div>

                <div className="relative mb-12">
                   <div className="absolute -inset-4 bg-indigo-500/20 rounded-full blur-xl animate-pulse" />
                   <img 
                    src={selectedStudentForStory?.photoUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${selectedStudentForStory?.name}`} 
                    className="w-64 h-64 rounded-full object-cover border-8 border-white shadow-2xl relative z-10"
                    referrerPolicy="no-referrer"
                   />
                   <div className="absolute -bottom-4 -right-4 w-20 h-20 bg-amber-400 rounded-full flex items-center justify-center text-white shadow-xl z-20 border-4 border-white">
                      <Trophy className="w-10 h-10" />
                   </div>
                </div>

                <div className="space-y-4 mb-12">
                   <h1 className="text-6xl font-black text-gray-900 tracking-tighter uppercase italic italic-style-heading">SUCCESS STORY</h1>
                   <div className="h-1.5 w-32 bg-indigo-600 mx-auto rounded-full" />
                </div>

                <div className="space-y-4 flex-1 flex flex-col justify-center">
                   <p className="text-4xl font-black text-indigo-600 uppercase tracking-[0.1em]">{selectedStudentForStory?.name}</p>
                   <p className="text-2xl text-gray-500 font-bold uppercase tracking-widest">{selectedExam?.title}</p>
                   
                   <div className="flex items-center gap-12 mt-8">
                      <div className="text-center">
                         <p className="text-5xl font-black text-gray-900 tracking-tighter italic">
                           {getRankedStudents().find(s => s.id === selectedStudentForStory?.id)?.percentage.toFixed(1)}%
                         </p>
                         <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">Score</p>
                      </div>
                      <div className="w-px h-16 bg-gray-200" />
                      <div className="text-center">
                         <p className="text-5xl font-black text-gray-900 tracking-tighter italic">
                           #{getRankedStudents().find(s => s.id === selectedStudentForStory?.id)?.rank}
                         </p>
                         <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">Class Rank</p>
                      </div>
                   </div>
                </div>

                <div className="mt-12 flex items-center justify-between w-full border-t border-gray-100 pt-8">
                   <div className="flex items-center gap-3">
                      <Sparkles className="w-6 h-6 text-indigo-400" />
                      <p className="text-sm font-bold text-gray-400">Join the Batch of Success today!</p>
                   </div>
                   <p className="text-xl font-black text-gray-900 italic tracking-tighter">Manage My Batch</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Modal>

      {/* Combined Result Modal */}
      <Modal 
        isOpen={isCombinedModalOpen} 
        onClose={() => setIsCombinedModalOpen(false)} 
        title="Prepare Combined Result"
        maxWidth="max-w-2xl"
      >
        <form onSubmit={handleCreateCombinedResult} className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Select Batch</label>
              <select
                required
                value={combinedBatchId}
                onChange={e => {
                  setCombinedBatchId(e.target.value);
                  setSelectedExamsForCombined([]);
                }}
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-bold"
              >
                <option value="">Select a batch</option>
                {batches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>

            {combinedBatchId && (
              <>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Combined Result Title</label>
                  <input
                    required
                    type="text"
                    placeholder="e.g. Final Combined Result 2026"
                    value={combinedExamTitle}
                    onChange={e => setCombinedExamTitle(e.target.value)}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-bold"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Select Exams to Combine (Select at least 2)</label>
                  <div className="grid grid-cols-1 gap-2 max-h-60 overflow-y-auto p-1">
                    {exams
                      .filter(e => e.batchId === combinedBatchId && e.status === 'completed' && !e.linkedExams)
                      .map(exam => (
                        <label 
                          key={exam.id} 
                          className={cn(
                            "flex items-center justify-between p-4 rounded-xl border-2 transition-all cursor-pointer",
                            selectedExamsForCombined.includes(exam.id) 
                              ? "bg-indigo-50 border-indigo-500" 
                              : "bg-white border-gray-100 hover:border-gray-200"
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <input 
                              type="checkbox"
                              className="hidden"
                              checked={selectedExamsForCombined.includes(exam.id)}
                              onChange={() => {
                                if (selectedExamsForCombined.includes(exam.id)) {
                                  setSelectedExamsForCombined(prev => prev.filter(id => id !== exam.id));
                                } else {
                                  setSelectedExamsForCombined(prev => [...prev, exam.id]);
                                }
                              }}
                            />
                            <div className={cn(
                              "w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all",
                              selectedExamsForCombined.includes(exam.id) ? "bg-indigo-600 border-indigo-600" : "border-gray-300"
                            )}>
                              {selectedExamsForCombined.includes(exam.id) && <Plus className="w-3.5 h-3.5 text-white" />}
                            </div>
                            <div>
                                <p className="font-bold text-gray-900">{exam.title}</p>
                                <p className="text-[10px] text-gray-400 font-bold uppercase">{t(`offlineExams.card.${exam.type}`)} • {exam.subjects?.length || 0} Subjects</p>
                            </div>
                          </div>
                        </label>
                      ))}
                  </div>
                </div>
              </>
            )}
          </div>

          <button 
            type="submit" 
            disabled={isSaving || selectedExamsForCombined.length < 2 || !combinedExamTitle}
            className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
            Prepare & Publish Combined Result
          </button>
        </form>
      </Modal>
    </div>
  );
}
