import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../firebase';
import { FileText, Loader2, Award, Calendar, Users, Trophy, ChevronRight, Search, Info, Download } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../../lib/utils';

import { useTranslation } from 'react-i18next';

interface OfflineExam {
  id: string;
  title: string;
  type: 'single' | 'school';
  batchName: string;
  batchId: string;
  date?: string;
  time?: string;
  totalMarks?: number;
  isPublished?: boolean;
  linkedExams?: string[];
  hasSubSections?: boolean;
  subSections?: { name: string; totalMarks: number }[];
  subjects?: {
    name: string;
    totalMarks: number;
    date: string;
    time?: string;
    hasSubSections?: boolean;
    subSections?: { name: string; totalMarks: number }[];
  }[];
  institutionName?: string;
  institutionId?: string;
  studentMarks?: Record<string, Record<string, number>>;
}

interface Student {
  id: string;
  name: string;
  rollNo: string;
  guardianName?: string;
  studentId?: string;
}

export function PublicExamResult() {
  const { t } = useTranslation();
  const { examId } = useParams<{ examId: string }>();
  const [exams, setExams] = useState<OfflineExam[]>([]);
  const [institution, setInstitution] = useState<any>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!examId) return;
      setLoading(true);
      try {
        const examDoc = await getDoc(doc(db, 'offline_exams', examId));
        if (!examDoc.exists()) {
          setError('Result not found');
          return;
        }
        const mainExamData = { id: examDoc.id, ...examDoc.data() } as OfflineExam;
        
        let allExams = [mainExamData];
        if (mainExamData.linkedExams && mainExamData.linkedExams.length > 0) {
          const linkedPromises = mainExamData.linkedExams.map(id => getDoc(doc(db, 'offline_exams', id)));
          const snaps = await Promise.all(linkedPromises);
          snaps.forEach(s => {
            if (s.exists()) {
              allExams.push({ id: s.id, ...s.data() } as any);
            }
          });
        }
        setExams(allExams);

        // Fetch Institution
        if (mainExamData.institutionId) {
          const instDoc = await getDoc(doc(db, 'institutions', mainExamData.institutionId));
          if (instDoc.exists()) {
            setInstitution(instDoc.data());
          }
        }

        const q = query(
          collection(db, 'students'),
          where('batchId', '==', mainExamData.batchId)
        );
        const snapshot = await getDocs(q);
        const studentData = snapshot.docs.map(doc => ({
          id: doc.id,
          name: doc.data().name,
          rollNo: doc.data().rollNo,
          guardianName: doc.data().guardianName,
          studentId: doc.data().studentId
        })) as Student[];
        setStudents(studentData);
      } catch (err) {
        console.error(err);
        setError('Error loading result');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [examId]);

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

  const getRankedResults = () => {
    if (exams.length === 0) return [];
    const results = students.map(student => {
      let totalObtained = 0;
      let totalPossible = 0;

      exams.forEach(exam => {
        const marks = exam.studentMarks?.[student.id] || {};
        let obtained = 0;
        let possible = 0;

        if (exam.type === 'single') {
          if (exam.hasSubSections && exam.subSections) {
            exam.subSections.forEach(ss => {
              obtained += marks[ss.name] || 0;
              possible += ss.totalMarks;
            });
          } else {
            obtained = marks['total'] || 0;
            possible = exam.totalMarks || 100;
          }
        } else {
          exam.subjects?.forEach(s => {
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
        totalObtained += obtained;
        totalPossible += possible;
      });

      return {
        ...student,
        totalObtained,
        totalPossible,
        percentage: totalPossible > 0 ? (totalObtained / totalPossible) * 100 : 0,
        grade: calculateGrade(totalObtained, totalPossible)
      };
    });

    return results.sort((a, b) => b.totalObtained - a.totalObtained).map((r, i) => ({
      ...r,
      rank: i + 1
    }));
  };

  const handleDownloadMarksheet = async (studentResult: any) => {
    const mainExam = exams[0];
    if (!mainExam) return;
    
    setDownloadingId(studentResult.id);
    try {
      const { default: jsPDF } = await import('jspdf');
      const { default: autoTable } = await import('jspdf-autotable');
      
      const doc = new jsPDF();
      const brandColor = institution?.primaryColor || '#4f46e5';

      // Header
      doc.setFillColor(brandColor);
      doc.rect(0, 0, 210, 40, 'F');
      
      doc.setTextColor('#ffffff');
      doc.setFontSize(22);
      doc.setFont('helvetica', 'bold');
      doc.text(institution?.name || mainExam.institutionName || 'Institution Name', 105, 18, { align: 'center' });
      
      doc.setFontSize(14);
      doc.setFont('helvetica', 'normal');
      doc.text(mainExam.title, 105, 28, { align: 'center' });

      // Student Info
      doc.setTextColor('#111827');
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('MARKSHEET / ACADEMIC RECORD', 10, 50);

      doc.setDrawColor('#e5e7eb');
      doc.line(10, 52, 200, 52);

      let currentY = 62;
      const leftCol = 15;
      const rightCol = 110;

      doc.setFontSize(10);
      doc.setTextColor('#6b7280');
      doc.text('Student Name:', leftCol, currentY);
      doc.text('Student ID / ID:', leftCol, currentY + 8);
      doc.text('Roll No:', leftCol, currentY + 16);

      doc.setTextColor('#111827');
      doc.setFont('helvetica', 'bold');
      doc.text(studentResult.name, leftCol + 35, currentY);
      doc.text(studentResult.studentId || studentResult.id, leftCol + 35, currentY + 8);
      doc.text(studentResult.rollNo, leftCol + 35, currentY + 16);

      doc.setFont('helvetica', 'normal');
      doc.setTextColor('#6b7280');
      doc.text('Batch:', rightCol, currentY);
      doc.text('Exam Date:', rightCol, currentY + 8);
      doc.text('Rank:', rightCol, currentY + 16);

      doc.setTextColor('#111827');
      doc.setFont('helvetica', 'bold');
      doc.text(mainExam.batchName, rightCol + 30, currentY);
      doc.text(mainExam.date || 'Multiple', rightCol + 30, currentY + 8);
      doc.text(`${studentResult.rank} / ${students.length}`, rightCol + 30, currentY + 16);

      // Marks Table
      const tableData: any[] = [];
      exams.forEach(exam => {
        const marks = exam.studentMarks?.[studentResult.id] || {};
        if (exam.type === 'single') {
          tableData.push([
            exam.title,
            exam.totalMarks || 100,
            marks['total'] || 0,
            calculateGrade(marks['total'] || 0, exam.totalMarks || 100)
          ]);
        } else {
          exam.subjects?.forEach(sub => {
            tableData.push([
              sub.name,
              sub.totalMarks,
              marks[sub.name] || 0,
              calculateGrade(marks[sub.name] || 0, sub.totalMarks)
            ]);
          });
        }
      });

      autoTable(doc, {
        startY: 90,
        head: [['Subject / Exam Component', 'Total Marks', 'Marks Obtained', 'Grade']],
        body: tableData,
        theme: 'grid',
        headStyles: { fillColor: brandColor },
        styles: { fontSize: 9, cellPadding: 4 },
        columnStyles: {
          1: { halign: 'center' },
          2: { halign: 'center' },
          3: { halign: 'center' }
        }
      });

      // Summary
      const finalY = (doc as any).lastAutoTable.finalY + 15;
      doc.setFillColor('#f9fafb');
      doc.rect(10, finalY, 190, 25, 'F');
      
      doc.setFontSize(11);
      doc.setTextColor('#111827');
      doc.setFont('helvetica', 'bold');
      doc.text(`Total Score: ${studentResult.totalObtained} / ${studentResult.totalPossible}`, 20, finalY + 10);
      doc.text(`Percentage: ${studentResult.percentage.toFixed(2)}%`, 20, finalY + 18);
      
      doc.setFontSize(18);
      doc.text(`FINAL GRADE: ${studentResult.grade}`, 140, finalY + 15);

      // Footer
      doc.setFontSize(8);
      doc.setTextColor('#9ca3af');
      doc.text(`Generated by Manage My Batch on ${new Date().toLocaleDateString()}`, 105, 285, { align: 'center' });

      doc.save(`${studentResult.name}_Marksheet.pdf`);
    } catch (err) {
      console.error(err);
      alert('Failed to generate marksheet');
    } finally {
      setDownloadingId(null);
    }
  };

  const rankedResults = getRankedResults();
  const filteredResults = rankedResults.filter(r => 
    r.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    r.rollNo.includes(searchTerm)
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
      </div>
    );
  }

  if (error || exams.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-white p-8 rounded-3xl shadow-xl border border-gray-100 text-center max-w-md">
          <FileText className="w-16 h-16 text-rose-500 mx-auto mb-4" />
          <h2 className="text-2xl font-black text-gray-900 mb-2">Error</h2>
          <p className="text-gray-500">{error}</p>
        </div>
      </div>
    );
  }

  const mainExam = exams[0];

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="bg-white p-8 rounded-3xl shadow-xl border border-gray-100 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50 rounded-full -translate-y-1/2 translate-x-1/2 opacity-50" />
          
          <div className="relative z-10">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-xl shadow-indigo-200">
                  <Award className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-black text-gray-900 tracking-tight">{mainExam.title}</h1>
                  <p className="text-indigo-600 font-bold">{mainExam.institutionName}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-3">
                <div className="bg-gray-50 px-4 py-2 rounded-xl border border-gray-100 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  <span className="text-sm font-bold text-gray-600">{mainExam.date || 'Multiple Dates'}</span>
                </div>
                <div className="bg-gray-50 px-4 py-2 rounded-xl border border-gray-100 flex items-center gap-2">
                  <Users className="w-4 h-4 text-gray-400" />
                  <span className="text-sm font-bold text-gray-600">{mainExam.batchName}</span>
                </div>
              </div>
            </div>
            {exams.length > 1 && (
              <div className="mt-6 pt-6 border-t border-gray-100 italic text-xs text-gray-400 font-bold uppercase tracking-widest flex items-center gap-2">
                <Info className="w-3 h-3" /> This is a combined result linked with: {exams.slice(1).map(e => e.title).join(', ')}
              </div>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-3xl shadow-lg border border-gray-100 flex items-center gap-4">
            <div className="w-12 h-12 bg-amber-100 rounded-2xl flex items-center justify-center">
              <Trophy className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{t('public.examResult.highestMark')}</p>
              <p className="text-xl font-black text-gray-900">{rankedResults[0]?.totalObtained || 0}</p>
            </div>
          </div>
          <div className="bg-white p-6 rounded-3xl shadow-lg border border-gray-100 flex items-center gap-4">
            <div className="w-12 h-12 bg-indigo-100 rounded-2xl flex items-center justify-center">
              <Users className="w-6 h-6 text-indigo-600" />
            </div>
            <div>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{t('public.examResult.totalStudents')}</p>
              <p className="text-xl font-black text-gray-900">{students.length}</p>
            </div>
          </div>
          <div className="bg-white p-6 rounded-3xl shadow-lg border border-gray-100 flex items-center gap-4">
            <div className="w-12 h-12 bg-emerald-100 rounded-2xl flex items-center justify-center">
              <Award className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{t('public.examResult.passRate')}</p>
              <p className="text-xl font-black text-gray-900">
                {Math.round((rankedResults.filter(r => r.grade !== 'F').length / students.length) * 100)}%
              </p>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5 group-focus-within:text-indigo-500 transition-colors" />
          <input
            type="text"
            placeholder={t('public.examResult.searchPlaceholder')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-6 py-4 bg-white border border-gray-200 rounded-2xl text-sm font-medium focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all shadow-sm"
          />
        </div>

        {/* Results Table */}
        <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/50 border-b border-gray-100">
                  <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">{t('public.examResult.rank')}</th>
                  <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">{t('public.examResult.student')}</th>
                  <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">{t('public.examResult.roll')}</th>
                  <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-widest text-center">{t('public.examResult.marks')}</th>
                  <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-widest text-center">{t('public.examResult.grade')}</th>
                  <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-widest text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredResults.map((result) => (
                  <tr key={result.id} className="hover:bg-gray-50/50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className={cn(
                        "w-8 h-8 rounded-lg flex items-center justify-center font-black text-sm",
                        result.rank === 1 ? "bg-amber-100 text-amber-600" :
                        result.rank === 2 ? "bg-slate-100 text-slate-600" :
                        result.rank === 3 ? "bg-orange-100 text-orange-600" :
                        "text-gray-400"
                      )}>
                        {result.rank}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-bold text-gray-900 group-hover:text-indigo-600 transition-colors">{result.name}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-mono font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg text-xs">
                        {result.rollNo}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="inline-flex flex-col items-center">
                        <span className="text-sm font-black text-gray-900">{result.totalObtained}</span>
                        <span className="text-[10px] font-bold text-gray-400">/{result.totalPossible}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={cn(
                        "px-3 py-1 rounded-lg text-xs font-black",
                        result.grade === 'F' ? "bg-rose-50 text-rose-600" : "bg-emerald-50 text-emerald-600"
                      )}>
                        {result.grade}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleDownloadMarksheet(result)}
                        disabled={downloadingId === result.id}
                        className="p-2 text-gray-400 hover:text-indigo-600 bg-gray-50 hover:bg-indigo-50 rounded-lg transition-all disabled:opacity-50"
                        title="Download Marksheet"
                      >
                        {downloadingId === result.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
