import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../firebase';
import { FileText, Loader2, Award, Calendar, Users, Trophy, ChevronRight, Search } from 'lucide-react';
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
  totalMarks?: number;
  subjects?: {
    name: string;
    totalMarks: number;
    date: string;
  }[];
  institutionName?: string;
  studentMarks?: Record<string, Record<string, number>>;
}

interface Student {
  id: string;
  name: string;
  rollNo: string;
}

export function PublicExamResult() {
  const { t } = useTranslation();
  const { examId } = useParams<{ examId: string }>();
  const [exam, setExam] = useState<OfflineExam | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

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
        const examData = { id: examDoc.id, ...examDoc.data() } as OfflineExam;
        setExam(examData);

        const q = query(
          collection(db, 'students'),
          where('batchId', '==', examData.batchId)
        );
        const snapshot = await getDocs(q);
        const studentData = snapshot.docs.map(doc => ({
          id: doc.id,
          name: doc.data().name,
          rollNo: doc.data().rollNo
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
    if (!exam) return [];
    const results = students.map(student => {
      const marks = exam.studentMarks?.[student.id] || {};
      let totalObtained = 0;
      let totalPossible = 0;

      if (exam.type === 'single') {
        totalObtained = marks['total'] || 0;
        totalPossible = exam.totalMarks || 100;
      } else {
        exam.subjects?.forEach(s => {
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

    return results.sort((a, b) => b.totalObtained - a.totalObtained).map((r, i) => ({
      ...r,
      rank: i + 1
    }));
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

  if (error || !exam) {
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
                  <h1 className="text-3xl font-black text-gray-900 tracking-tight">{exam.title}</h1>
                  <p className="text-indigo-600 font-bold">{exam.institutionName}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-3">
                <div className="bg-gray-50 px-4 py-2 rounded-xl border border-gray-100 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  <span className="text-sm font-bold text-gray-600">{exam.date || 'Multiple Dates'}</span>
                </div>
                <div className="bg-gray-50 px-4 py-2 rounded-xl border border-gray-100 flex items-center gap-2">
                  <Users className="w-4 h-4 text-gray-400" />
                  <span className="text-sm font-bold text-gray-600">{exam.batchName}</span>
                </div>
              </div>
            </div>
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
