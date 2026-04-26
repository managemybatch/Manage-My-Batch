import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { collection, query, where, getDocs, addDoc, serverTimestamp, doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { CheckCircle2, XCircle, Clock, Loader2, Save, Users, Calendar } from 'lucide-react';
import { cn } from '../../lib/utils';
import { motion } from 'motion/react';

import { useTranslation } from 'react-i18next';

interface Student {
  id: string;
  name: string;
  rollNo: string;
}

interface Batch {
  id: string;
  name: string;
  institutionId: string;
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
    <div className="flex items-center gap-2 mt-1 px-4 py-2 bg-amber-50 rounded-2xl border border-amber-200">
      <span className="text-[10px] font-black text-amber-600 uppercase tracking-widest">Delay:</span>
      <input 
        type="number" 
        value={localVal === 0 ? '' : localVal}
        onChange={(e) => setLocalVal(parseInt(e.target.value) || 0)}
        onBlur={() => onSave(localVal)}
        className="w-16 px-2 py-1 bg-white border border-amber-300 rounded-xl text-center text-sm font-bold text-amber-700 outline-none focus:ring-2 focus:ring-amber-500/20"
        placeholder="Min"
      />
      <span className="text-[10px] font-bold text-amber-500 uppercase">Minutes</span>
    </div>
  );
}

export function PublicAttendance() {
  const { t } = useTranslation();
  const { batchId, token } = useParams<{ batchId: string; token: string }>();
  const [batch, setBatch] = useState<Batch | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [attendance, setAttendance] = useState<Record<string, { status: 'present' | 'absent' | 'late', delay?: number }>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    const fetchData = async () => {
      if (!batchId) return;
      setLoading(true);
      try {
        // Fetch batch details
        const batchDoc = await getDoc(doc(db, 'batches', batchId));
        if (!batchDoc.exists()) {
          setError('Batch not found');
          return;
        }
        const batchData = { id: batchDoc.id, ...batchDoc.data() } as Batch;
        setBatch(batchData);

        // Fetch students
        const q = query(
          collection(db, 'students'),
          where('batchId', '==', batchId)
        );
        const snapshot = await getDocs(q);
        const studentData = snapshot.docs.map(doc => ({
          id: doc.id,
          name: doc.data().name,
          rollNo: doc.data().rollNo
        })) as Student[];
        setStudents(studentData);

        // Initialize attendance with 'present' by default
        const initialAttendance: Record<string, { status: 'present' | 'absent' | 'late', delay?: number }> = {};
        studentData.forEach(s => {
          initialAttendance[s.id] = { status: 'present' };
        });
        setAttendance(initialAttendance);
      } catch (err) {
        console.error(err);
        setError('Error loading data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [batchId]);

  const handleMark = (studentId: string, status: 'present' | 'absent' | 'late') => {
    setAttendance(prev => ({ 
      ...prev, 
      [studentId]: { 
        status, 
        delay: status === 'late' ? (prev[studentId]?.delay || 5) : undefined 
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

  const handleSubmit = async () => {
    if (!batch) return;
    setSaving(true);
    try {
      await addDoc(collection(db, 'attendance_submissions'), {
        batchId: batch.id,
        batchName: batch.name,
        institutionId: batch.institutionId,
        date: today,
        records: attendance,
        status: 'pending',
        createdAt: serverTimestamp()
      });
      setSubmitted(true);
    } catch (err) {
      console.error(err);
      setError('Error saving attendance');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-white p-8 rounded-3xl shadow-xl border border-gray-100 text-center max-w-md">
          <XCircle className="w-16 h-16 text-rose-500 mx-auto mb-4" />
          <h2 className="text-2xl font-black text-gray-900 mb-2">Error</h2>
          <p className="text-gray-500">{error}</p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white p-10 rounded-3xl shadow-xl border border-gray-100 text-center max-w-md"
        >
          <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-10 h-10 text-emerald-600" />
          </div>
          <h2 className="text-3xl font-black text-gray-900 mb-2">{t('public.attendance.thanks')}</h2>
          <p className="text-gray-500 font-medium">{t('public.attendance.successMsg')}</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-3xl mx-auto space-y-8">
        <div className="bg-white p-8 rounded-3xl shadow-xl border border-gray-100 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-full -translate-y-1/2 translate-x-1/2" />
          
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-200">
                <Users className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-black text-gray-900 tracking-tight">{batch?.name}</h1>
                <p className="text-gray-500 text-sm font-bold flex items-center gap-1.5">
                  <Calendar className="w-4 h-4" />
                  {t('public.attendance.date')}: {today}
                </p>
              </div>
            </div>
            <p className="text-gray-500 text-sm font-medium">{t('public.attendance.instruction')}</p>
          </div>
        </div>

        <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/50 border-b border-gray-100">
                  <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">{t('public.attendance.student')}</th>
                  <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">{t('public.attendance.roll')}</th>
                  <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-widest text-center">{t('public.attendance.status')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {students.map((student) => (
                  <tr key={student.id} className="hover:bg-gray-50/50 transition-colors group">
                    <td className="px-6 py-4">
                      <p className="font-bold text-gray-900 group-hover:text-indigo-600 transition-colors">{student.name}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-mono font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg text-xs">
                        {student.rollNo}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col items-center gap-2">
                        <div className="flex items-center justify-center gap-3">
                          <button 
                            onClick={() => handleMark(student.id, 'present')}
                            className={cn(
                              "p-2.5 rounded-xl transition-all border-2",
                              attendance[student.id]?.status === 'present' 
                                ? "bg-emerald-50 border-emerald-500 text-emerald-600 shadow-md shadow-emerald-100" 
                                : "border-transparent text-gray-300 hover:bg-emerald-50 hover:text-emerald-400"
                            )}
                            title="Present"
                          >
                            <CheckCircle2 className="w-6 h-6" />
                          </button>
                          <button 
                            onClick={() => handleMark(student.id, 'absent')}
                            className={cn(
                              "p-2.5 rounded-xl transition-all border-2",
                              attendance[student.id]?.status === 'absent' 
                                ? "bg-rose-50 border-rose-500 text-rose-600 shadow-md shadow-rose-100" 
                                : "border-transparent text-gray-300 hover:bg-rose-50 hover:text-rose-400"
                            )}
                            title="Absent"
                          >
                            <XCircle className="w-6 h-6" />
                          </button>
                          <button 
                            onClick={() => handleMark(student.id, 'late')}
                            className={cn(
                              "p-2.5 rounded-xl transition-all border-2",
                              attendance[student.id]?.status === 'late' 
                                ? "bg-amber-50 border-amber-500 text-amber-600 shadow-md shadow-amber-100" 
                                : "border-transparent text-gray-300 hover:bg-amber-50 hover:text-amber-400"
                            )}
                            title="Late"
                          >
                            <Clock className="w-6 h-6" />
                          </button>
                        </div>
                        {attendance[student.id]?.status === 'late' && (
                          <DelayInput 
                            value={attendance[student.id]?.delay || 5} 
                            onSave={(val) => handleUpdateDelay(student.id, val)} 
                          />
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <button 
          onClick={handleSubmit}
          disabled={saving || students.length === 0}
          className="w-full py-5 bg-indigo-600 text-white rounded-3xl font-black text-lg hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-200 flex items-center justify-center gap-3 disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-6 h-6 animate-spin" /> : <Save className="w-6 h-6" />}
          {t('public.attendance.save')}
        </button>
      </div>
    </div>
  );
}
