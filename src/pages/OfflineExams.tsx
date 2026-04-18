import React, { useState, useEffect, useRef } from 'react';
import { Plus, Search, Filter, FileText, MoreVertical, Calendar, CheckCircle2, Clock, Loader2, Download, Palette, Layout, Award, Save, Trash2, Edit2, Share2, Copy, ExternalLink, Image as ImageIcon, Sparkles, Star, Trophy } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';
import { collection, onSnapshot, query, addDoc, serverTimestamp, deleteDoc, doc, orderBy, setDoc, where } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { useAuth } from '../lib/auth';
import { Modal } from '../components/Modal';
import { ConfirmModal } from '../components/ConfirmModal';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { useTranslation } from 'react-i18next';

interface OfflineExam {
  id: string;
  type: 'single' | 'school';
  title: string;
  batchId: string;
  batchName?: string;
  date?: string;
  totalMarks?: number;
  subjects?: {
    name: string;
    totalMarks: number;
    date: string;
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
}

interface Batch {
  id: string;
  name: string;
}

export function OfflineExams() {
  const { t } = useTranslation();
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
  const [admitCardStyle, setAdmitCardStyle] = useState<'modern' | 'classic' | 'minimal' | 'professional' | 'vibrant'>('modern');
  const [admitCardColor, setAdmitCardColor] = useState('#4f46e5');
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

  useEffect(() => {
    if (!user) return;
    const instId = user.institutionId || user.uid;
    const unsubInst = onSnapshot(doc(db, 'institutions', instId), (doc) => {
      if (doc.exists()) setInstData(doc.data());
    });
    return () => unsubInst();
  }, [user]);

  const handleDownloadImage = async (ref: React.RefObject<HTMLDivElement | null>, filename: string) => {
    if (!ref.current) return;
    setIsGeneratingPDF(true);
    try {
      const canvas = await html2canvas(ref.current, {
        scale: 3,
        useCORS: true,
        allowTaint: true,
        backgroundColor: null,
      });
      const link = document.createElement('a');
      link.download = `${filename}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
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
      setIsManageModalOpen(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `offline_exams/${selectedExam.id}`);
    } finally {
      setIsSaving(false);
    }
  };
  const scheduleRef = useRef<HTMLDivElement>(null);
  const admitCardsRef = useRef<HTMLDivElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  const [newExam, setNewExam] = useState({
    type: 'single' as const,
    title: '',
    batchId: '',
    date: new Date().toISOString().split('T')[0],
    totalMarks: 100,
    subjects: [{ name: '', totalMarks: 100, date: new Date().toISOString().split('T')[0] }],
    institutionName: '',
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
        totalMarks: 100,
        subjects: [{ name: '', totalMarks: 100, date: new Date().toISOString().split('T')[0] }],
        institutionName: '',
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
      subjects: [...prev.subjects, { name: '', totalMarks: 100, date: new Date().toISOString().split('T')[0] }]
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
    const percentage = (marks / total) * 100;
    if (percentage >= 80) return 'A+';
    if (percentage >= 70) return 'A';
    if (percentage >= 60) return 'A-';
    if (percentage >= 50) return 'B';
    if (percentage >= 40) return 'C';
    if (percentage >= 33) return 'D';
    return 'F';
  };

  const getRankedStudents = () => {
    if (!selectedExam) return [];
    const studentsWithTotals = examStudents.map(student => {
      const marks = studentMarks[student.id] || {};
      let totalObtained = 0;
      let totalPossible = 0;

      if (selectedExam.type === 'single') {
        totalObtained = marks['total'] || 0;
        totalPossible = selectedExam.totalMarks || 100;
      } else {
        selectedExam.subjects?.forEach(s => {
          totalObtained += marks[s.name] || 0;
          totalPossible += s.totalMarks;
        });
      }

      return {
        ...student,
        totalObtained,
        totalPossible,
        percentage: (totalObtained / totalPossible) * 100,
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

      const canvas = await html2canvas(clone, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        windowWidth: 1200,
        logging: false,
      });

      const imgData = canvas.toDataURL('image/png', 1.0);
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      
      const imgWidth = pdfWidth;
      const imgHeight = (canvas.height * pdfWidth) / canvas.width;
      
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

  const downloadAllAdmitCards = async () => {
    if (examStudents.length === 0) return;
    setIsGeneratingPDF(true);
    
    try {
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      
      for (let i = 0; i < examStudents.length; i++) {
        const student = examStudents[i];
        const element = document.getElementById(`admit-card-${student.id}`);
        if (!element) continue;
        
        // Clone and prepare element for screenshot
        const container = document.createElement('div');
        container.style.position = 'fixed';
        container.style.left = '-9999px';
        container.style.top = '0';
        container.style.width = '210mm';
        container.style.backgroundColor = 'white';
        
        const clone = element.cloneNode(true) as HTMLDivElement;
        clone.style.display = 'block';
        clone.style.width = '100%';
        clone.style.transform = 'none';
        
        container.appendChild(clone);
        document.body.appendChild(container);
        
        // Wait for images
        await new Promise(resolve => setTimeout(resolve, 800));
        
        const canvas = await html2canvas(clone, {
          scale: 2,
          useCORS: true,
          allowTaint: true,
          backgroundColor: '#ffffff',
          logging: false,
        });
        
        const imgData = canvas.toDataURL('image/png', 1.0);
        
        // Calculate dimensions to fit nicely on A4
        const margin = 15;
        const imgWidth = pdfWidth - (margin * 2);
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        
        if (i > 0) {
          pdf.addPage();
        }
        
        // Center vertically if it fits
        const yOffset = imgHeight < pdfHeight ? (pdfHeight - imgHeight) / 2 : margin;
        
        pdf.addImage(imgData, 'PNG', margin, yOffset, imgWidth, imgHeight);
        
        document.body.removeChild(container);
      }
      
      pdf.save(`Admit_Cards_${selectedExam?.title.replace(/\s+/g, '_')}.pdf`);
    } catch (error) {
      console.error('PDF Generation Error:', error);
      alert('Error generating all admit cards. Please try individual downloads if this fails.');
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

  const filteredExams = exams.filter(e => {
    const matchesSearch = e.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTab = viewTab === 'active' ? e.status === 'pending' : e.status === 'completed';
    
    // Retention logic: Exams from year N are kept until March 1st of year N+1
    const createdAt = e.createdAt?.toDate ? e.createdAt.toDate() : new Date();
    const createdYear = createdAt.getFullYear();
    const retentionDate = new Date(createdYear + 1, 2, 1); // March 1st of next year
    const isWithinRetention = new Date() < retentionDate;

    return matchesSearch && matchesTab && isWithinRetention;
  });

  const examStudents = selectedExam ? students.filter(s => s.batchId === selectedExam.batchId) : [];

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">{t('offlineExams.title')}</h1>
          <p className="text-gray-500 mt-1">{t('offlineExams.subtitle')}</p>
        </div>
        <button 
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 transition-all shadow-md shadow-indigo-200"
        >
          <Plus className="w-4 h-4" /> {t('offlineExams.createNew')}
        </button>
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
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">{t('offlineExams.modal.institution')}</label>
              <input
                required
                type="text"
                placeholder="e.g. Manage My Batch Academy"
                value={newExam.institutionName}
                onChange={e => setNewExam({...newExam, institutionName: e.target.value})}
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
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
                        onChange={e => handleSubjectChange(index, 'totalMarks', parseInt(e.target.value))}
                        className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
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
                        <MoreVertical className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <button type="submit" className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200">
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
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">{t('offlineExams.modal.institution')}</label>
                <input
                  required
                  type="text"
                  placeholder="e.g. Manage My Batch Academy"
                  value={editingExam.institutionName}
                  onChange={e => setEditingExam({...editingExam, institutionName: e.target.value})}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
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

            <button type="submit" className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200">
              {t('offlineExams.modal.submitUpdate')}
            </button>
          </form>
        )}
      </Modal>

      <Modal isOpen={isManageModalOpen} onClose={() => setIsManageModalOpen(false)} title={`${t('offlineExams.card.manage')}: ${selectedExam?.title}`} maxWidth="max-w-4xl">
        <div className="space-y-6">
          <div className="flex items-center gap-2 p-1 bg-gray-100 rounded-xl">
            {['overview', 'seat-plan', 'admit-cards', 'results'].map((tab) => (
              <button
                key={tab}
                onClick={() => setManageTab(tab as any)}
                className={cn(
                  "flex-1 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all",
                  manageTab === tab ? "bg-white text-indigo-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
                )}
              >
                {t(`offlineExams.manage.tabs.${tab === 'seat-plan' ? 'seatPlan' : tab === 'admit-cards' ? 'admitCards' : tab}`)}
              </button>
            ))}
          </div>

          {manageTab === 'overview' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100">
                <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4">{t('offlineExams.modal.examTitle')}</h4>
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
                    <span className="font-bold text-indigo-600 uppercase">{selectedExam?.status}</span>
                  </div>
                  {selectedExam?.type === 'single' ? (
                    <>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">{t('offlineExams.modal.examDate')}:</span>
                        <span className="font-bold text-gray-900">{selectedExam.date ? new Date(selectedExam.date).toLocaleDateString() : 'N/A'}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">{t('offlineExams.modal.totalMarks')}:</span>
                        <span className="font-bold text-gray-900">{selectedExam.totalMarks}</span>
                      </div>
                    </>
                  ) : (
                    <div className="pt-3 border-t border-gray-200">
                      <span className="text-xs font-bold text-gray-400 uppercase">{t('offlineExams.card.subjects')}</span>
                      <div className="mt-2 space-y-2">
                        {selectedExam?.subjects?.map((s, i) => (
                          <div key={i} className="flex justify-between text-xs">
                            <span className="text-gray-600">{s.name}</span>
                            <span className="font-bold text-gray-900">{s.totalMarks} {t('offlineExams.modal.marks')} ({new Date(s.date).toLocaleDateString()})</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-indigo-50 p-6 rounded-2xl border border-indigo-100">
                <h4 className="text-sm font-bold text-indigo-900 uppercase tracking-wider mb-4">{t('offlineExams.card.manage')}</h4>
                <div className="grid grid-cols-1 gap-3">
                  {selectedExam?.type === 'school' && (
                    <button 
                      onClick={() => generatePDF(scheduleRef, `Exam_Schedule_${selectedExam.title}`)} 
                      disabled={isGeneratingPDF}
                      className="w-full py-3 bg-white text-indigo-600 rounded-xl text-sm font-bold hover:bg-indigo-50 transition-all border border-indigo-100 flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {isGeneratingPDF ? <Loader2 className="w-4 h-4 animate-spin" /> : <Calendar className="w-4 h-4" />}
                      {t('offlineExams.manage.overview.downloadSchedule')}
                    </button>
                  )}
                  <button onClick={() => setManageTab('seat-plan')} className="w-full py-3 bg-white text-indigo-600 rounded-xl text-sm font-bold hover:bg-indigo-50 transition-all border border-indigo-100">{t('offlineExams.manage.seatPlan.title')}</button>
                  <button onClick={() => setManageTab('admit-cards')} className="w-full py-3 bg-white text-indigo-600 rounded-xl text-sm font-bold hover:bg-indigo-50 transition-all border border-indigo-100">{t('offlineExams.manage.admitCards.title')}</button>
                  <button onClick={() => setManageTab('results')} className="w-full py-3 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 transition-all shadow-md shadow-indigo-200">{t('offlineExams.manage.results.title')}</button>
                </div>
              </div>

              {/* PDF Template for Schedule (Off-screen) */}
              <div className="fixed left-[-9999px] top-0 pointer-events-none">
                <div ref={scheduleRef} className="p-8 w-[210mm] min-h-[297mm] relative font-sans" style={{ backgroundColor: '#ffffff' }}>
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
                      <p className="text-lg font-bold uppercase tracking-widest" style={{ color: '#4f46e5' }}>Batch: {selectedExam?.batchName}</p>
                    </div>

                    <div className="flex-grow">
                      <div className="overflow-hidden border-2" style={{ borderColor: '#e0e7ff', borderRadius: '2rem', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }}>
                        <table className="w-full border-collapse">
                          <thead>
                            <tr style={{ backgroundColor: '#4f46e5', color: '#ffffff' }}>
                              <th className="py-6 px-10 text-left font-black uppercase tracking-widest text-[11px]">Subject</th>
                              <th className="py-6 px-10 text-left font-black uppercase tracking-widest text-[11px]">Date</th>
                              <th className="py-6 px-10 text-left font-black uppercase tracking-widest text-[11px]">Time</th>
                              <th className="py-6 px-10 text-center font-black uppercase tracking-widest text-[11px]">Marks</th>
                            </tr>
                          </thead>
                          <tbody>
                            {selectedExam?.type === 'school' ? (
                              selectedExam.subjects?.map((s, i) => (
                                <tr key={i} className="border-b" style={{ backgroundColor: i % 2 === 0 ? '#ffffff' : 'rgba(238, 242, 255, 0.2)', borderColor: '#eef2ff' }}>
                                  <td className="py-6 px-10 font-black text-xl" style={{ color: '#111827' }}>{s.name}</td>
                                  <td className="py-6 px-10 font-bold text-sm" style={{ color: '#374151' }}>{new Date(s.date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</td>
                                  <td className="py-6 px-10 font-medium italic text-sm" style={{ color: '#4b5563' }}>10:00 AM - 01:00 PM</td>
                                  <td className="py-6 px-10 text-center">
                                    <span className="px-5 py-2 rounded-xl font-black text-lg" style={{ backgroundColor: '#e0e7ff', color: '#4338ca' }}>{s.totalMarks}</span>
                                  </td>
                                </tr>
                              ))
                            ) : (
                              <tr style={{ backgroundColor: '#ffffff' }}>
                                <td className="py-6 px-10 font-black text-xl" style={{ color: '#111827' }}>{selectedExam?.title}</td>
                                <td className="py-6 px-10 font-bold text-sm" style={{ color: '#374151' }}>{selectedExam?.date ? new Date(selectedExam.date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : 'N/A'}</td>
                                <td className="py-6 px-10 font-medium italic text-sm" style={{ color: '#4b5563' }}>10:00 AM - 01:00 PM</td>
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
                        <p className="font-black uppercase text-[10px] tracking-widest" style={{ color: '#111827' }}>Principal Signature</p>
                      </div>
                      <div className="text-center">
                        <div className="h-px w-full mb-2" style={{ backgroundColor: '#d1d5db' }}></div>
                        <p className="font-black uppercase text-[10px] tracking-widest" style={{ color: '#111827' }}>Exam Controller</p>
                      </div>
                    </div>

                    <div className="absolute bottom-10 left-0 right-0 text-center">
                      <div className="flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-[0.4em]" style={{ color: '#9ca3af' }}>
                        <span>Powered by</span>
                        <span style={{ color: '#4f46e5' }}>Manage My Batch</span>
                        <span>Management System</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {manageTab === 'seat-plan' && (
            <div className="space-y-6">
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
          )}

          {manageTab === 'admit-cards' && (
            <div className="space-y-6">
              <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-6">
                <div className="flex items-center justify-between">
                  <h4 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    <Palette className="w-5 h-5 text-indigo-600" /> {t('offlineExams.manage.admitCards.title')}
                  </h4>
                  <button 
                    onClick={downloadAllAdmitCards}
                    disabled={isGeneratingPDF}
                    className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 transition-all shadow-md shadow-indigo-200 flex items-center gap-2 disabled:opacity-50"
                  >
                    {isGeneratingPDF ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                    {t('offlineExams.manage.admitCards.downloadAll')}
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                      <Layout className="w-3 h-3" /> {t('offlineExams.manage.admitCards.style')}
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                      {['modern', 'classic', 'minimal', 'professional', 'vibrant'].map((style) => (
                        <button
                          key={style}
                          onClick={() => setAdmitCardStyle(style as any)}
                          className={cn(
                            "py-2 text-[10px] font-black uppercase tracking-widest rounded-lg border transition-all",
                            admitCardStyle === style ? "bg-indigo-50 border-indigo-200 text-indigo-600 shadow-sm" : "bg-white border-gray-100 text-gray-500 hover:border-gray-200"
                          )}
                        >
                          {style}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-3">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                      <Palette className="w-3 h-3" /> {t('offlineExams.manage.admitCards.color')}
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {['#4f46e5', '#059669', '#dc2626', '#d97706', '#7c3aed', '#111827', '#2563eb', '#db2777'].map((color) => (
                        <button
                          key={color}
                          onClick={() => setAdmitCardColor(color)}
                          className={cn(
                            "w-7 h-7 rounded-full border-2 transition-all",
                            admitCardColor === color ? "border-white ring-2 ring-indigo-500 scale-110" : "border-transparent hover:scale-105"
                          )}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* PDF Template for Admit Cards (Off-screen) */}
              <div className="fixed left-[-9999px] top-0 pointer-events-none">
                <div ref={admitCardsRef} className="p-8 w-[210mm] min-h-[297mm] space-y-8 font-sans" style={{ backgroundColor: '#f3f4f6' }}>
                  {examStudents.map((student, idx) => (
                    <div 
                      key={student.id} 
                      id={`admit-card-${student.id}`}
                      className={cn(
                        "w-full h-[140mm] relative overflow-hidden p-10 flex flex-col justify-between",
                        admitCardStyle === 'modern' && "rounded-[3rem] shadow-2xl border-t-[16px]",
                        admitCardStyle === 'classic' && "border-[12px] border-double",
                        admitCardStyle === 'minimal' && "border-b-[20px]",
                        admitCardStyle === 'professional' && "rounded-none border-4",
                        admitCardStyle === 'vibrant' && "rounded-none border-0"
                      )}
                      style={{ 
                        backgroundColor: '#ffffff',
                        borderTopColor: admitCardStyle === 'modern' ? admitCardColor : admitCardColor,
                        borderRightColor: admitCardColor,
                        borderBottomColor: admitCardStyle === 'minimal' ? admitCardColor : admitCardColor,
                        borderLeftColor: admitCardColor,
                        background: admitCardStyle === 'vibrant' ? 'linear-gradient(to bottom right, #ffffff, #f9fafb)' : '#ffffff'
                      }}
                    >
                      {admitCardStyle === 'vibrant' && (
                        <div className="absolute top-0 right-0 rounded-full -mr-32 -mt-32" style={{ backgroundColor: admitCardColor + '10', width: '256px', height: '256px' }}></div>
                      )}
                      {admitCardStyle === 'vibrant' && (
                        <div className="absolute bottom-0 left-0 rounded-full -ml-32 -mb-32" style={{ backgroundColor: admitCardColor + '10', width: '256px', height: '256px' }}></div>
                      )}

                      {/* Background Pattern */}
                      <div className="absolute inset-0 pointer-events-none" style={{ 
                        backgroundImage: admitCardStyle === 'modern' ? `radial-gradient(circle at 2px 2px, ${admitCardColor} 1px, rgba(255, 255, 255, 0) 0)` : 
                                       admitCardStyle === 'classic' ? `linear-gradient(45deg, ${admitCardColor} 1px, rgba(255, 255, 255, 0) 1px)` : 
                                       admitCardStyle === 'vibrant' ? `repeating-linear-gradient(-45deg, rgba(255, 255, 255, 0), rgba(255, 255, 255, 0) 10px, ${admitCardColor} 10px, ${admitCardColor} 11px)` : 'none',
                        backgroundSize: '24px 24px',
                        color: admitCardColor,
                        opacity: 0.03
                      }}></div>

                      {/* Watermark */}
                      <div className="absolute inset-0 flex items-center justify-center rotate-[-25deg] pointer-events-none" style={{ opacity: 0.05 }}>
                        {user?.photoURL ? (
                          <img src={user.photoURL} style={{ width: '256px', height: '256px', objectFit: 'contain', filter: 'grayscale(100%)' }} referrerPolicy="no-referrer" />
                        ) : (
                          <h1 className="text-8xl font-black uppercase tracking-[0.5em]">Manage My Batch</h1>
                        )}
                      </div>

                      <div className="relative z-10">
                        <div className="flex items-center justify-between mb-8">
                          <div className="flex items-center gap-4">
                            {user?.photoURL && <img src={user.photoURL} className="rounded-xl shadow-md" referrerPolicy="no-referrer" style={{ width: '64px', height: '64px' }} />}
                            <div>
                              <h1 className="text-3xl font-black uppercase tracking-tighter leading-none" style={{ color: admitCardColor }}>{selectedExam?.institutionName}</h1>
                              <p className="text-[10px] font-black uppercase tracking-[0.3em] mt-1" style={{ color: '#9ca3af' }}>Official Admit Card</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="px-4 py-1 text-[10px] font-black uppercase tracking-widest rounded-full" style={{ backgroundColor: '#111827', color: '#ffffff' }}>
                              No: {idx + 1001}
                            </div>
                          </div>
                        </div>

                        <div className="flex gap-10">
                          <div className="shrink-0">
                            <div className="border-4 flex items-center justify-center" style={{ 
                              borderColor: admitCardColor + '30', 
                              backgroundColor: '#f9fafb',
                              width: '160px',
                              height: '160px',
                              borderRadius: admitCardStyle === 'modern' ? '2.5rem' : '0',
                              transform: admitCardStyle === 'modern' ? 'rotate(-3deg)' : 'none',
                              overflow: 'hidden',
                              boxShadow: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.05)'
                            }}>
                              {student.photoUrl ? (
                                <img src={student.photoUrl} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                              ) : (
                                <Loader2 className="w-10 h-10 text-gray-200" />
                              )}
                            </div>
                          </div>

                          <div className="flex-1 grid grid-cols-2 gap-x-12 gap-y-6">
                            <div className="col-span-2">
                              <p className="text-[10px] font-black uppercase tracking-widest mb-1" style={{ color: '#9ca3af' }}>Student Name</p>
                              <p className="text-2xl font-black uppercase tracking-tight" style={{ color: '#111827' }}>{student.name}</p>
                            </div>
                            <div>
                              <p className="text-[10px] font-black uppercase tracking-widest mb-1" style={{ color: '#9ca3af' }}>Roll Number</p>
                              <p className="text-xl font-black" style={{ color: admitCardColor }}>{student.rollNo}</p>
                            </div>
                            <div>
                              <p className="text-[10px] font-black uppercase tracking-widest mb-1" style={{ color: '#9ca3af' }}>Batch Group</p>
                              <p className="text-xl font-black" style={{ color: '#111827' }}>{selectedExam?.batchName}</p>
                            </div>
                            <div className="col-span-2">
                              <p className="text-[10px] font-black uppercase tracking-widest mb-1" style={{ color: '#9ca3af' }}>Examination Title</p>
                              <p className="text-lg font-bold uppercase" style={{ color: '#374151' }}>{selectedExam?.title}</p>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="relative z-10 flex items-end justify-between pt-8 border-t" style={{ borderColor: '#f3f4f6' }}>
                        <div className="space-y-4">
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4" style={{ color: '#9ca3af' }} />
                            <p className="text-xs font-bold uppercase tracking-widest" style={{ color: '#6b7280' }}>Reporting Time: 09:30 AM</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4" style={{ color: '#9ca3af' }} />
                            <p className="text-xs font-bold uppercase tracking-widest" style={{ color: '#6b7280' }}>
                              Date: {selectedExam?.type === 'single' ? (selectedExam.date ? new Date(selectedExam.date).toLocaleDateString() : 'N/A') : 'As per Schedule'}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-12">
                          <div className="text-center">
                            <div className="w-32 h-12 border-b-2 mb-1" style={{ borderColor: '#111827' }}></div>
                            <p className="text-[8px] font-black uppercase tracking-widest" style={{ color: '#9ca3af' }}>Candidate Sign</p>
                          </div>
                          <div className="text-center">
                            <div className="w-32 h-12 border-b-2 mb-1" style={{ borderColor: '#111827' }}></div>
                            <p className="text-[8px] font-black uppercase tracking-widest" style={{ color: '#9ca3af' }}>Authorized Sign</p>
                          </div>
                        </div>
                      </div>

                      {/* Bottom Branding */}
                      <div className="absolute bottom-4 left-0 right-0 text-center">
                        <p className="text-[8px] font-black uppercase tracking-[0.6em]" style={{ color: '#d1d5db' }}>Manage My Batch Management System • Official Document</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Preview Grid */}
              <div className="grid grid-cols-1 gap-8 p-4 bg-gray-50 rounded-2xl">
                {examStudents.map((student) => (
                  <div 
                    key={student.id} 
                    className={cn(
                      "p-8 bg-white relative overflow-hidden transition-all group",
                      admitCardStyle === 'modern' && "rounded-3xl border-l-[12px] shadow-lg",
                      admitCardStyle === 'classic' && "border-4 border-double",
                      admitCardStyle === 'minimal' && "border-b-4 border-gray-100 shadow-sm",
                      admitCardStyle === 'professional' && "border-2",
                      admitCardStyle === 'vibrant' && "rounded-none border-0 bg-gradient-to-br from-white to-gray-50 shadow-xl"
                    )}
                    style={{ 
                      borderTopColor: admitCardColor,
                      borderRightColor: admitCardColor,
                      borderBottomColor: admitCardStyle === 'minimal' ? admitCardColor : admitCardColor,
                      borderLeftColor: admitCardStyle === 'modern' ? admitCardColor : admitCardColor
                    }}
                  >
                    {/* Individual Download Button */}
                    <div className="absolute top-4 right-4 z-20 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => {
                          const element = document.getElementById(`admit-card-${student.id}`);
                          if (element) {
                            generatePDF({ current: element } as any, `Admit_Card_${student.rollNo}_${student.name}`);
                          }
                        }}
                        className="p-2 bg-indigo-600 text-white rounded-lg shadow-lg hover:bg-indigo-700 transition-all flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest"
                      >
                        <Download className="w-3 h-3" />
                        Download
                      </button>
                    </div>

                    {admitCardStyle === 'vibrant' && (
                      <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-600/5 rounded-full -mr-16 -mt-16 blur-2xl" style={{ backgroundColor: admitCardColor + '10' }}></div>
                    )}
                    {/* Branding Watermark */}
                    <div className="absolute -bottom-4 -right-4 opacity-[0.05] rotate-[-15deg] pointer-events-none">
                      <h1 className="text-6xl font-black uppercase tracking-tighter">Manage My Batch</h1>
                    </div>

                    <div className="flex items-start justify-between relative z-10">
                      <div className="flex gap-8">
                        <div className={cn(
                          "w-32 h-32 bg-gray-50 border-2 overflow-hidden flex items-center justify-center shrink-0",
                          admitCardStyle === 'modern' ? "rounded-2xl rotate-[-2deg]" : "rounded-none"
                        )} style={{ borderColor: admitCardColor + '20' }}>
                          {student.photoUrl ? (
                            <img src={student.photoUrl} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          ) : (
                            <Loader2 className="w-8 h-8 text-gray-200" />
                          )}
                        </div>
                        <div className="space-y-1">
                          <h5 className="text-2xl font-black uppercase tracking-tighter" style={{ color: admitCardColor }}>
                            {selectedExam?.institutionName}
                          </h5>
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 bg-gray-900 text-white text-[10px] font-bold uppercase tracking-widest rounded">Admit Card</span>
                            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">{selectedExam?.title}</span>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-x-12 gap-y-4 mt-6">
                            <div>
                              <p className="text-[10px] text-gray-400 uppercase font-black tracking-widest">Student Name</p>
                              <p className="text-lg font-bold text-gray-900 leading-none mt-1">{student.name}</p>
                            </div>
                            <div>
                              <p className="text-[10px] text-gray-400 uppercase font-black tracking-widest">Roll Number</p>
                              <p className="text-lg font-bold text-gray-900 leading-none mt-1">{student.rollNo}</p>
                            </div>
                            <div>
                              <p className="text-[10px] text-gray-400 uppercase font-black tracking-widest">Batch Group</p>
                              <p className="text-sm font-bold text-gray-700 leading-none mt-1">{selectedExam?.batchName}</p>
                            </div>
                            <div>
                              <p className="text-[10px] text-gray-400 uppercase font-black tracking-widest">Exam Date</p>
                              <p className="text-sm font-bold text-gray-700 leading-none mt-1">
                                {selectedExam?.type === 'single' ? (selectedExam.date ? new Date(selectedExam.date).toLocaleDateString() : 'N/A') : 'See Schedule'}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="w-24 h-24 bg-gray-50 border-2 border-dashed rounded-xl flex items-center justify-center mb-2" style={{ borderColor: admitCardColor + '40' }}>
                          <Award className="w-8 h-8 opacity-20" style={{ color: admitCardColor }} />
                        </div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Official Seal</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {manageTab === 'results' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h4 className="text-lg font-bold text-gray-900">{t('offlineExams.manage.results.title')}</h4>
                <div className="flex gap-2">
                  <button 
                    onClick={handleSaveResults}
                    className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 transition-all flex items-center gap-2 shadow-md shadow-emerald-100"
                  >
                    <Save className="w-4 h-4" />
                    {t('offlineExams.manage.results.save')}
                  </button>
                  <button 
                    onClick={() => generatePDF(resultsRef, `Result_Sheet_${selectedExam?.title}`)}
                    disabled={isGeneratingPDF}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 transition-all flex items-center gap-2 disabled:opacity-50 shadow-md shadow-indigo-100"
                  >
                    {isGeneratingPDF ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                    {t('offlineExams.manage.overview.downloadSchedule')}
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto bg-white rounded-2xl border border-gray-100 shadow-sm">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      <th className="py-4 px-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Rank</th>
                      <th className="py-4 px-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Roll</th>
                      <th className="py-4 px-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Student Name</th>
                      {selectedExam?.type === 'single' ? (
                        <th className="py-4 px-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Marks (/{selectedExam.totalMarks})</th>
                      ) : (
                        selectedExam?.subjects?.map((s, i) => (
                          <th key={i} className="py-4 px-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">{s.name} (/{s.totalMarks})</th>
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
                          <td className="py-4 px-6">
                            <input 
                              type="number" 
                              value={studentMarks[student.id]?.['total'] || ''}
                              onChange={(e) => handleMarkChange(student.id, 'total', e.target.value)}
                              className="w-24 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/20" 
                              placeholder="0" 
                            />
                          </td>
                        ) : (
                          selectedExam?.subjects?.map((s, i) => (
                            <td key={i} className="py-4 px-6">
                              <input 
                                type="number" 
                                value={studentMarks[student.id]?.[s.name] || ''}
                                onChange={(e) => handleMarkChange(student.id, s.name, e.target.value)}
                                className="w-24 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/20" 
                                placeholder="0" 
                              />
                            </td>
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
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
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
                            <th className="py-6 px-6 text-left font-black uppercase text-[10px] tracking-widest">Rank</th>
                            <th className="py-6 px-6 text-left font-black uppercase text-[10px] tracking-widest">Roll</th>
                            <th className="py-6 px-6 text-left font-black uppercase text-[10px] tracking-widest">Student Name</th>
                            <th className="py-6 px-6 text-center font-black uppercase text-[10px] tracking-widest">Total</th>
                            <th className="py-6 px-6 text-center font-black uppercase text-[10px] tracking-widest">Grade</th>
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
    </div>
  );
}
