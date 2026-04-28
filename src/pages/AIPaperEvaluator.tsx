import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { 
  CheckCircle2, 
  Plus, 
  Search, 
  FileText, 
  Image as ImageIcon, 
  Sparkles, 
  Loader2, 
  Save, 
  Trash2, 
  AlertCircle,
  ArrowRight,
  User,
  History,
  X,
  Camera,
  Check,
  ChevronRight,
  BrainCircuit,
  MessageSquare,
  Award,
  Settings
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { collection, onSnapshot, query, addDoc, serverTimestamp, deleteDoc, doc, updateDoc, where, getDocs, getDoc, setDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { useAuth } from '../lib/auth';
import { Modal } from '../components/Modal';
import { ConfirmModal } from '../components/ConfirmModal';
import { useTranslation } from 'react-i18next';
import { QuestionDefinition, AIEvaluationResult, evaluatePaper } from '../lib/gemini';

interface OfflineExam {
  id: string;
  title: string;
  batchId: string;
  institutionId: string;
  batchName?: string;
  totalMarks?: number;
  date?: string;
}

interface ExamAIConfig {
  id: string;
  examId: string;
  questions: QuestionDefinition[];
}

interface AIEvaluation {
  id: string;
  studentId: string;
  studentName: string;
  status: 'pending' | 'reviewed' | 'finalized';
  analysis: AIEvaluationResult;
  images: string[];
  createdAt: any;
}

export function AIPaperEvaluator() {
  const { user } = useAuth();
  const location = useLocation();
  const [exams, setExams] = useState<OfflineExam[]>([]);
  const [selectedExam, setSelectedExam] = useState<OfflineExam | null>(null);
  const [config, setConfig] = useState<ExamAIConfig | null>(null);
  const [evaluations, setEvaluations] = useState<AIEvaluation[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'exams' | 'config' | 'evaluator' | 'history'>('exams');
  
  const [error, setError] = useState<string | null>(null);
  const [isSavingConfig, setIsSavingConfig] = useState(false);
  
  // Modals
  const [isQuestionModalOpen, setIsQuestionModalOpen] = useState(false);
  const [isEvaluationModalOpen, setIsEvaluationModalOpen] = useState(false);
  
  // New Evaluation State
  const [evaluationStep, setEvaluationStep] = useState<1 | 2 | 3>(1); // 1: Select Student, 2: Upload, 3: AI Result
  const [students, setStudents] = useState<any[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [aiResult, setAiResult] = useState<AIEvaluationResult | null>(null);

  useEffect(() => {
    if (!user) return;
    const instId = user.institutionId || user.uid;

    const q = query(collection(db, 'offline_exams'), where('institutionId', '==', instId));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const examData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as OfflineExam));
      setExams(examData);
      
      // Auto-select exam from state
      if (location.state?.examId && !selectedExam) {
        const initialExam = examData.find(e => e.id === location.state.examId);
        if (initialExam) {
          setSelectedExam(initialExam);
          setActiveTab('config');
        }
      }
      
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user, location.state, selectedExam]);

  useEffect(() => {
    if (!user || !selectedExam) {
      setConfig(null);
      setEvaluations([]);
      return;
    }

    // Subscribe to config
    const instId = user.institutionId || user.uid;
    const configQuery = query(
      collection(db, 'exam_ai_config'), 
      where('examId', '==', selectedExam.id),
      where('institutionId', '==', instId)
    );
    const unsubConfig = onSnapshot(configQuery, (snapshot) => {
      console.log("Config snapshot received", { empty: snapshot.empty });
      if (!snapshot.empty) {
        setConfig({ id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as ExamAIConfig);
      } else {
        setConfig(null);
      }
    }, (err) => {
      console.error("Error watching config:", err);
      if (err.message.includes('permission')) {
        setError("AI কনফিগারেশন অ্যাক্সেস করতে সমস্যা হচ্ছে। অনুগ্রহ করে আপনার পারমিশন চেক করুন।");
      }
    });

    // Subscribe to history
    const historyQuery = query(
      collection(db, 'ai_evaluations'), 
      where('examId', '==', selectedExam.id),
      where('institutionId', '==', instId)
    );
    const unsubHistory = onSnapshot(historyQuery, (snapshot) => {
      console.log("Evaluations snapshot received", { count: snapshot.size });
      setEvaluations(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AIEvaluation)));
    }, (err) => {
      console.error("Error watching history:", err);
      if (err.message.includes('permission')) {
        setError("মূল্যায়ন হিস্টোরি লোড করতে সমস্যা হচ্ছে।");
      }
    });

    return () => {
      unsubConfig();
      unsubHistory();
    };
  }, [selectedExam]);

  const handleCreateConfig = async () => {
    console.log("handleCreateConfig triggered", { selectedExam, user });
    if (!selectedExam || !user) {
      console.warn("Missing selectedExam or user", { selectedExam, user });
      return;
    }
    
    setError(null);
    setIsSavingConfig(true);
    const instId = user.institutionId || user.uid;
    
    const newConfig = {
      examId: selectedExam.id,
      institutionId: selectedExam.institutionId || instId,
      questions: [
        { id: '1', number: '1', text: '', maxMarks: 10, expectedAnswer: '', gradingRubric: 'বানান ভুল করলে ১ নাম্বার কাটতে হবে।' }
      ],
      updatedAt: serverTimestamp()
    };

    console.log("Creating new config in Firestore...", newConfig);

    try {
      console.log("Attempting addDoc to exam_ai_config...");
      const docRef = await addDoc(collection(db, 'exam_ai_config'), newConfig);
      console.log("Config created successfully with ID:", docRef.id);
      setActiveTab('config');
    } catch (e: any) {
      console.error("CRITICAL: Error creating config:", e);
      setError(e.message || "Failed to create configuration");
      handleFirestoreError(e, OperationType.WRITE, 'exam_ai_config');
    } finally {
      setIsSavingConfig(false);
    }
  };

  const handleUpdateConfig = async (updatedQuestions: QuestionDefinition[]) => {
    if (!config) return;
    try {
      await updateDoc(doc(db, 'exam_ai_config', config.id), {
        questions: updatedQuestions,
        updatedAt: serverTimestamp()
      });
      setConfig({ ...config, questions: updatedQuestions });
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, 'exam_ai_config');
    }
  };

  const startEvaluation = async () => {
    if (!selectedExam) return;
    setEvaluationStep(1);
    setIsEvaluationModalOpen(true);
    setUploadedImages([]);
    setAiResult(null);
    setSelectedStudent(null);

    // Fetch students for the batch
    const q = query(collection(db, 'students'), where('batchId', '==', selectedExam.batchId));
    const snapshot = await getDocs(q);
    setStudents(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setUploadedImages(prev => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const runAIEvaluation = async () => {
    if (!config || uploadedImages.length === 0) return;
    setIsEvaluating(true);
    try {
      const result = await evaluatePaper(uploadedImages, config.questions);
      setAiResult(result);
      setEvaluationStep(3);
    } catch (error: any) {
      alert(error.message || "AI Evaluation failed");
    } finally {
      setIsEvaluating(false);
    }
  };

  const finalizeEvaluation = async () => {
    if (!selectedExam || !selectedStudent || !aiResult || !user) return;
    const instId = user.institutionId || user.uid;

    try {
      // Save AI Evaluation Record
      await addDoc(collection(db, 'ai_evaluations'), {
        examId: selectedExam.id,
        studentId: selectedStudent.id,
        studentName: selectedStudent.name,
        institutionId: instId,
        images: uploadedImages,
        status: 'reviewed', // Since user is reviewing now
        analysis: aiResult,
        evaluatedBy: user.uid,
        createdAt: serverTimestamp()
      });

      // Update the main exam marks sheet (optional but recommended for integration)
      const examRef = doc(db, 'offline_exams', selectedExam.id);
      const examDoc = await getDoc(examRef);
      if (examDoc.exists()) {
        const currentMarks = examDoc.data().studentMarks || {};
        const studentMarks = currentMarks[selectedStudent.id] || {};
        
        // We assume this matches the total obtained
        studentMarks['Total'] = aiResult.totalMarks;
        
        await updateDoc(examRef, {
          [`studentMarks.${selectedStudent.id}`]: studentMarks
        });
      }

      setIsEvaluationModalOpen(false);
      setActiveTab('history');
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, 'ai_evaluations');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl shadow-lg shadow-indigo-100">
            <BrainCircuit className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight">এআই খাতা মূল্যায়ন (AI Evaluator)</h1>
            <p className="text-gray-500 font-medium text-sm">Artificial Intelligence-ভিত্তিক স্বয়ংক্রিয় খাতা মূল্যায়ন সিস্টেম</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Left Side: Exam List */}
        <div className="lg:col-span-1 space-y-4">
          <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-2 px-2">
            <FileText className="w-4 h-4" /> অফলাইন পরীক্ষা সমুহ
          </h3>
          <div className="space-y-2">
            {exams.length === 0 ? (
              <div className="p-8 text-center bg-white rounded-2xl border-2 border-dashed border-gray-100">
                <p className="text-sm text-gray-400 font-medium font-bengali">অফলাইন পরীক্ষা পাওয়া যায়নি</p>
              </div>
            ) : (
              exams.map(exam => (
                <button
                  key={exam.id}
                  onClick={() => setSelectedExam(exam)}
                  className={cn(
                    "w-full text-left p-4 rounded-2xl transition-all border font-bengali",
                    selectedExam?.id === exam.id 
                      ? "bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-100" 
                      : "bg-white border-gray-100 text-gray-900 hover:border-indigo-100 hover:bg-indigo-50/30"
                  )}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className={cn(
                      "px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest",
                      selectedExam?.id === exam.id ? "bg-white/20 text-white" : "bg-indigo-100 text-indigo-700"
                    )}>{exam.batchName || 'Batch'}</span>
                  </div>
                  <h4 className="font-bold truncate">{exam.title}</h4>
                  <p className={cn("text-[10px] mt-1 flex items-center gap-1", selectedExam?.id === exam.id ? "text-indigo-100" : "text-gray-400")}>
                    <CheckCircle2 className="w-3 h-3" /> {exam.totalMarks} Marks
                  </p>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Right Side: Evaluation Workspace */}
        <div className="lg:col-span-3">
          {!selectedExam ? (
            <div className="h-[60vh] flex flex-col items-center justify-center bg-white border border-gray-100 rounded-3xl p-12 text-center">
              <div className="p-6 bg-gray-50 rounded-full mb-6">
                <ArrowRight className="w-12 h-12 text-gray-300" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 font-bengali mb-2">অনুগ্রহ করে একটি পরীক্ষা সিলেক্ট করুন</h2>
              <p className="text-gray-500 max-w-sm font-medium text-sm">সিলেক্ট করা পরীক্ষার খাতা আপনি AI-এর মাধ্যমে মূল্যায়ন করতে পারবেন।</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Tabs */}
              <div className="flex bg-white p-1.5 rounded-2xl border border-gray-100 shadow-sm overflow-x-auto scrollbar-hide">
                <button
                  onClick={() => setActiveTab('config')}
                  className={cn(
                    "flex-1 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 whitespace-nowrap",
                    activeTab === 'config' ? "bg-indigo-600 text-white shadow-md shadow-indigo-100" : "text-gray-500 hover:bg-gray-50"
                  )}
                >
                  <Settings className="w-4 h-4" /> ১. প্রশ্ন সেটআপ
                </button>
                <button
                  onClick={() => setActiveTab('evaluator')}
                  className={cn(
                    "flex-1 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 whitespace-nowrap",
                    activeTab === 'evaluator' ? "bg-indigo-600 text-white shadow-md shadow-indigo-100" : "text-gray-500 hover:bg-gray-50"
                  )}
                >
                  <Sparkles className="w-4 h-4" /> ২. খাতা মূল্যায়ন 
                </button>
                <button
                  onClick={() => setActiveTab('history')}
                  className={cn(
                    "flex-1 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 whitespace-nowrap",
                    activeTab === 'history' ? "bg-indigo-600 text-white shadow-md shadow-indigo-100" : "text-gray-500 hover:bg-gray-50"
                  )}
                >
                  <History className="w-4 h-4" /> ৩. হিস্টোরি
                </button>
              </div>

              {/* Tab Content */}
              <AnimatePresence mode="wait">
                {activeTab === 'config' && (
                  <motion.div
                    key="config"
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    className="bg-white rounded-3xl border border-gray-100 shadow-sm p-8"
                  >
                    {!config ? (
                      <div className="text-center py-12">
                        <div className="p-5 bg-indigo-50 text-indigo-600 rounded-full w-fit mx-auto mb-6">
                          <Settings className="w-8 h-8" />
                        </div>
                        <h2 className="text-lg font-bold text-gray-900 font-bengali mb-4">এই পরীক্ষার জন্য এআই কনফিগারেশন সেটআপ করা নেই</h2>
                        
                        {error && (
                          <div id="config-error-message" className="mb-6 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 text-red-600 text-sm font-medium animate-in fade-in slide-in-from-top-2">
                            <AlertCircle className="w-5 h-5 flex-shrink-0" />
                            <p>{error}</p>
                          </div>
                        )}

                        <button
                          id="btn-create-ai-config"
                          onClick={handleCreateConfig}
                          disabled={isSavingConfig}
                          className="px-6 py-3 bg-indigo-600 text-white rounded-2xl text-sm font-bold flex items-center gap-2 mx-auto hover:bg-indigo-700 transition-all font-bengali disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isSavingConfig ? (
                            <>
                              <Loader2 className="w-5 h-5 animate-spin" />
                              প্রসেসিং...
                            </>
                          ) : (
                            <>
                              <Plus className="w-5 h-5" /> কনফিগারেশন শুরু করুন
                            </>
                          )}
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-8">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="text-lg font-bold text-gray-900 font-bengali">প্রশ্ন ও মূল্যায়ন নীতিমালা</h3>
                            <p className="text-gray-500 text-xs font-medium">প্রতিটি প্রশ্নের জন্য সঠিক উত্তর এবং মূল্যায়ন নীতিমালা লিখুন।</p>
                          </div>
                          <button
                            onClick={() => {
                              const newQuestions = [...config.questions, {
                                id: Math.random().toString(36).substr(2, 9),
                                number: (config.questions.length + 1).toString(),
                                text: '',
                                maxMarks: 5,
                                expectedAnswer: '',
                                gradingRubric: 'বানান বা তথ্যে ভুল করলে নাম্বার কাটুন।'
                              }];
                              handleUpdateConfig(newQuestions);
                            }}
                            className="p-2 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-100 transition-all"
                          >
                            <Plus className="w-5 h-5" />
                          </button>
                        </div>

                        <div className="space-y-4">
                          {config.questions.map((q, idx) => (
                            <div key={q.id} className="p-6 bg-gray-50 rounded-2xl border border-gray-100 space-y-4">
                              <div className="flex items-center justify-between gap-4">
                                <div className="flex items-center gap-3 flex-1">
                                  <div className="w-8 h-8 bg-white border border-gray-200 rounded-lg flex items-center justify-center font-bold text-gray-500 text-xs">
                                    {q.number}
                                  </div>
                                  <input
                                    type="text"
                                    placeholder="প্রশ্নটি লিখুন..."
                                    value={q.text}
                                    onChange={(e) => {
                                      const newQs = [...config.questions];
                                      newQs[idx].text = e.target.value;
                                      handleUpdateConfig(newQs);
                                    }}
                                    className="flex-1 bg-white border-0 focus:ring-2 focus:ring-indigo-600 rounded-lg px-4 py-2 text-sm font-bold font-bengali transition-all"
                                  />
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Max Marks</span>
                                  <input
                                    type="number"
                                    value={q.maxMarks}
                                    onChange={(e) => {
                                      const newQs = [...config.questions];
                                      newQs[idx].maxMarks = Number(e.target.value);
                                      handleUpdateConfig(newQs);
                                    }}
                                    className="w-16 bg-white border-0 focus:ring-2 focus:ring-indigo-600 rounded-lg px-3 py-2 text-sm font-black text-center"
                                  />
                                </div>
                                <button
                                  onClick={() => {
                                    const newQs = config.questions.filter((_, i) => i !== idx);
                                    handleUpdateConfig(newQs);
                                  }}
                                  className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block">আদর্শ উত্তর (Expected Answer)</label>
                                  <textarea
                                    value={q.expectedAnswer}
                                    onChange={(e) => {
                                      const newQs = [...config.questions];
                                      newQs[idx].expectedAnswer = e.target.value;
                                      handleUpdateConfig(newQs);
                                    }}
                                    className="w-full bg-white border-0 focus:ring-2 focus:ring-indigo-600 rounded-xl px-4 py-3 text-xs font-semibold font-bengali resize-none h-24"
                                    placeholder="শিক্ষার্থীর কাছ থেকে আপনি যে উত্তরটি আশা করছেন তা লিখুন..."
                                  />
                                </div>
                                <div>
                                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block">মূল্যায়ন নীতিমালা (Rubric)</label>
                                  <textarea
                                    value={q.gradingRubric}
                                    onChange={(e) => {
                                      const newQs = [...config.questions];
                                      newQs[idx].gradingRubric = e.target.value;
                                      handleUpdateConfig(newQs);
                                    }}
                                    className="w-full bg-white border-0 focus:ring-2 focus:ring-emerald-600 rounded-xl px-4 py-3 text-xs font-semibold font-bengali resize-none h-24"
                                    placeholder="কি কি কারণে নাম্বার কাটা যাবে? (যেমন: বানান ভুল, তথ্যের অভাব...)"
                                  />
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </motion.div>
                )}

                {activeTab === 'evaluator' && (
                  <motion.div
                    key="evaluator"
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    className="space-y-6"
                  >
                    {!config ? (
                      <div className="bg-amber-50 border border-amber-200 p-6 rounded-2xl flex gap-4 text-amber-700">
                        <AlertCircle className="w-6 h-6 shrink-0" />
                        <div>
                          <p className="font-bold text-sm font-bengali">প্রশ্ন সেটআপ কম্পলিট করা নেই!</p>
                          <p className="text-xs font-medium opacity-90 mt-1">প্রথমে "প্রশ্ন সেটআপ" ট্যাব থেকে আপনার পরীক্ষার প্রশ্ন এবং মূল্যায়ন নীতিমালা লিখে ফেলুন।</p>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-indigo-600 p-12 rounded-[2.5rem] text-center text-white relative overflow-hidden shadow-2xl shadow-indigo-200">
                         <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10" />
                         <div className="relative z-10 flex flex-col items-center">
                            <div className="p-6 bg-white/10 rounded-full mb-8 backdrop-blur-xl">
                              <BrainCircuit className="w-16 h-16 text-white" />
                            </div>
                            <h2 className="text-3xl font-black mb-4 tracking-tight font-bengali">মূল্যায়ন শুরু করুন</h2>
                            <p className="max-w-md mx-auto text-indigo-100 font-medium mb-12 font-bengali">
                              আপনার শিক্ষার্থীর পরীক্ষার খাতা ছবি বা স্ক্যান কপি আপলোড করুন। AI স্বয়ংক্রিয়ভাবে খাতা মূল্যায়ন করে আপনাকে পূর্ণাঙ্গ রিপোর্ট দিবে।
                            </p>
                            <button
                              onClick={startEvaluation}
                              className="px-10 py-5 bg-white text-indigo-600 rounded-2xl font-black text-lg shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center gap-3 font-bengali"
                            >
                              <Sparkles className="w-6 h-6" /> খাতা স্ক্যান করুন
                            </button>
                         </div>
                      </div>
                    )}
                  </motion.div>
                )}

                {activeTab === 'history' && (
                  <motion.div
                    key="history"
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    className="space-y-4"
                  >
                    {evaluations.length === 0 ? (
                      <div className="bg-white p-12 rounded-3xl border border-gray-100 text-center">
                        <div className="p-4 bg-gray-50 text-gray-300 w-fit mx-auto rounded-full mb-4">
                          <History className="w-8 h-8" />
                        </div>
                        <p className="text-gray-400 font-bold font-bengali">পূর্বের কোনো মূল্যায়ন রিপোর্ট পাওয়া যায়নি</p>
                      </div>
                    ) : (
                      evaluations.sort((a, b) => b.createdAt?.seconds - a.createdAt?.seconds).map(evaluation => (
                        <div key={evaluation.id} className="bg-white p-6 rounded-2xl border border-gray-100 flex items-center justify-between group hover:border-indigo-100 transition-all">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
                              <User className="w-6 h-6" />
                            </div>
                            <div>
                               <h4 className="font-bold text-gray-900 font-bengali">{evaluation.studentName}</h4>
                               <div className="flex items-center gap-3 mt-0.5">
                                 <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest bg-emerald-50 px-2 py-0.5 rounded-lg">
                                   Score: {evaluation.analysis.totalMarks}
                                 </span>
                                 <span className="text-[10px] font-medium text-gray-400">
                                   {evaluation.createdAt?.toDate().toLocaleDateString()}
                                 </span>
                               </div>
                            </div>
                          </div>
                          <button
                            onClick={() => {
                              setAiResult(evaluation.analysis);
                              setSelectedStudent({ name: evaluation.studentName });
                              setEvaluationStep(3);
                              setIsEvaluationModalOpen(true);
                              setUploadedImages(evaluation.images);
                            }}
                            className="p-3 bg-gray-50 text-gray-400 rounded-xl hover:bg-indigo-600 hover:text-white transition-all"
                          >
                             <ChevronRight className="w-5 h-5" />
                          </button>
                        </div>
                      ))
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>

      {/* Main Evaluator Modal */}
      <Modal
        isOpen={isEvaluationModalOpen}
        onClose={() => setIsEvaluationModalOpen(false)}
        title="এআই মূল্যায়ন গেটওয়ে"
        maxWidth="4xl"
      >
        <div className="space-y-8 p-4">
           {/* Step Indicator */}
           <div className="flex items-center justify-center gap-12 relative">
             <div className="absolute top-1/2 left-1/4 right-1/4 h-1 bg-gray-100 -translate-y-1/2 z-0" />
             {[1, 2, 3].map(s => (
               <div 
                key={s}
                className={cn(
                  "relative z-10 w-10 h-10 rounded-full flex items-center justify-center font-black transition-all",
                  evaluationStep >= s ? "bg-indigo-600 text-white shadow-lg shadow-indigo-100" : "bg-white border-2 border-gray-100 text-gray-300"
                )}
               >
                 {evaluationStep > s ? <Check className="w-5 h-5" /> : s}
                 <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[9px] font-black uppercase tracking-widest text-gray-400 whitespace-nowrap">
                   {s === 1 ? 'Student' : s === 2 ? 'Upload' : 'Report'}
                 </span>
               </div>
             ))}
           </div>

           <div className="min-h-[400px]">
             {evaluationStep === 1 && (
               <div className="space-y-6 animate-in slide-in-from-right-4 duration-300 capitalize">
                 <h3 className="text-center text-lg font-bold text-gray-900 font-bengali mb-8">শিক্ষার্থী সিলেক্ট করুন</h3>
                 <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                   {students.map(s => (
                     <button
                       key={s.id}
                       onClick={() => setSelectedStudent(s)}
                       className={cn(
                         "p-4 rounded-2xl border text-left transition-all",
                         selectedStudent?.id === s.id 
                          ? "bg-indigo-600 border-indigo-600 text-white shadow-xl shadow-indigo-100" 
                          : "bg-white border-gray-100 text-gray-900 hover:bg-indigo-50"
                       )}
                     >
                        <p className="font-bold truncate">{s.name}</p>
                        <p className={cn("text-[10px] font-medium opacity-70", selectedStudent?.id === s.id ? "" : "text-gray-400")}>Roll: {s.rollNo}</p>
                     </button>
                   ))}
                 </div>
                 <div className="flex justify-center mt-12">
                   <button
                     disabled={!selectedStudent}
                     onClick={() => setEvaluationStep(2)}
                     className="px-10 py-4 bg-indigo-600 text-white rounded-2xl font-bold flex items-center gap-2 disabled:opacity-50 shadow-lg shadow-indigo-200"
                   >
                     পরবর্তী ধাপ <ArrowRight className="w-5 h-5" />
                   </button>
                 </div>
               </div>
             )}

             {evaluationStep === 2 && (
               <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                 <div className="text-center space-y-4">
                    <h3 className="text-lg font-bold text-gray-900 font-bengali">খাতা আপলোড করুন</h3>
                    <p className="text-sm text-gray-500 font-medium">শিক্ষার্থীর খাতার পাতাগুলো ক্রমানুসারে ছবি তুলে আপলোড করুন।</p>
                 </div>

                 <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                   {uploadedImages.map((img, idx) => (
                     <div key={idx} className="aspect-[3/4] rounded-2xl bg-gray-100 relative group overflow-hidden border border-gray-100">
                       <img src={img} className="w-full h-full object-cover" />
                       <button
                         onClick={() => setUploadedImages(prev => prev.filter((_, i) => i !== idx))}
                         className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-all shadow-lg"
                       >
                         <Trash2 className="w-3 h-3" />
                       </button>
                       <div className="absolute top-2 left-2 px-2 py-0.5 bg-black/50 text-white text-[9px] font-bold rounded-md">Page {idx + 1}</div>
                     </div>
                   ))}
                   <label className="aspect-[3/4] rounded-2xl border-2 border-dashed border-indigo-100 bg-indigo-50/20 flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-indigo-50/50 transition-all">
                     <Camera className="w-8 h-8 text-indigo-400" />
                     <span className="text-[10px] font-black text-indigo-700 uppercase tracking-widest text-center">Add Page</span>
                     <input type="file" multiple accept="image/*" className="hidden" onChange={handleImageUpload} />
                   </label>
                 </div>

                 <div className="flex justify-between items-center mt-12">
                   <button onClick={() => setEvaluationStep(1)} className="px-6 py-3 text-gray-500 font-bold font-bengali">পিছনে যান</button>
                   <button
                     disabled={uploadedImages.length === 0 || isEvaluating}
                     onClick={runAIEvaluation}
                     className="px-10 py-4 bg-emerald-600 text-white rounded-2xl font-bold flex items-center gap-3 shadow-lg shadow-emerald-100 disabled:opacity-50"
                   >
                     {isEvaluating ? (
                       <>
                         <Loader2 className="w-5 h-5 animate-spin" />
                         <span className="font-bengali">AI খাতা যাচাই করছে...</span>
                       </>
                     ) : (
                       <>
                         <Sparkles className="w-5 h-5" />
                         <span className="font-bengali">মূল্যায়ন সম্পন্ন করুন</span>
                       </>
                     )}
                   </button>
                 </div>
               </div>
             )}

             {evaluationStep === 3 && aiResult && (
               <div className="space-y-8 animate-in zoom-in-95 duration-500">
                 {/* AI Success Banner */}
                 <div className="bg-emerald-600 p-8 rounded-[2.5rem] relative overflow-hidden text-white">
                    <div className="absolute top-0 right-0 p-12 -mr-12 -mt-12 bg-white/10 rounded-full blur-3xl" />
                    <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
                       <div className="w-24 h-24 bg-white/20 rounded-3xl flex items-center justify-center backdrop-blur-xl border border-white/30">
                          <Award className="w-12 h-12 text-white" />
                       </div>
                       <div className="flex-1 text-center md:text-left">
                          <p className="text-emerald-100 text-sm font-black uppercase tracking-[0.2em] mb-1">EVALUATION COMPLETE</p>
                          <h2 className="text-4xl font-black">{selectedStudent?.name}</h2>
                          <div className="flex flex-wrap justify-center md:justify-start gap-4 mt-4">
                             <div className="px-6 py-2 bg-white text-emerald-700 rounded-full font-black text-2xl shadow-xl">
                               {aiResult.totalMarks} / {config?.questions.reduce((acc, q) => acc + q.maxMarks, 0)}
                             </div>
                             <div className="px-4 py-2 bg-white/10 border border-white/20 rounded-full text-xs font-bold backdrop-blur-md">
                               Status: Ready for Review
                             </div>
                          </div>
                       </div>
                    </div>
                 </div>

                 {/* Questions Analysis */}
                 <div className="space-y-4">
                   <h3 className="text-sm font-black text-gray-400 uppercase tracking-[0.3em] px-2 flex items-center gap-2">
                     <BrainCircuit className="w-4 h-4" /> প্রশ্নের বিশ্লেষণ (Question Analysis)
                   </h3>
                   <div className="space-y-4">
                     {aiResult.questionWise.map((result, idx) => (
                       <div key={idx} className="bg-white rounded-3xl border border-gray-100 p-6 space-y-4 hover:border-indigo-100 transition-all">
                         <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <div className="w-8 h-8 rounded-lg bg-gray-900 text-white flex items-center justify-center font-black text-xs">
                                {result.questionNumber}
                              </div>
                              <h4 className="font-bold text-gray-900 font-bengali">
                                {config?.questions.find(q => q.number === result.questionNumber)?.text || 'প্রশ্ন ' + result.questionNumber}
                              </h4>
                            </div>
                            <div className="px-4 py-1.5 bg-indigo-50 text-indigo-700 rounded-full font-black text-sm">
                              {result.marksObtained} Marks
                            </div>
                         </div>

                         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="bg-amber-50/50 p-4 rounded-2xl border border-amber-100/50">
                               <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest mb-1.5 flex items-center gap-2">
                                 <AlertCircle className="w-3 h-3" /> ভুলসমূহ (Mistakes identified)
                               </p>
                               <p className="text-sm font-medium text-amber-900 font-bengali leading-relaxed">{result.mistakes}</p>
                            </div>
                            <div className="bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100/50">
                               <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1.5 flex items-center gap-2">
                                 <CheckCircle2 className="w-3 h-3" /> উন্নয়নের উপায় (How to improve)
                               </p>
                               <p className="text-sm font-medium text-emerald-900 font-bengali leading-relaxed">{result.corrections}</p>
                            </div>
                         </div>
                       </div>
                     ))}
                   </div>
                 </div>

                 {/* Overall Feedback */}
                 <div className="bg-gray-900 p-8 rounded-[2.5rem] text-white">
                    <p className="text-indigo-400 text-[10px] font-black uppercase tracking-[0.3em] mb-4 flex items-center gap-2">
                      <MessageSquare className="w-4 h-4" /> এআই টিউটর মতামত (AI Feedback)
                    </p>
                    <p className="text-lg font-bold font-bengali leading-relaxed italic">"{aiResult.feedback}"</p>
                 </div>

                 {/* Final Actions */}
                 <div className="flex flex-col md:flex-row gap-4 items-center justify-between pt-8 border-t border-gray-100">
                    <button onClick={() => setEvaluationStep(2)} className="text-gray-400 font-bold font-bengali text-sm hover:text-gray-900 transition-colors">ভুল হয়েছে? পুনরায় স্ক্যান করুন</button>
                    <div className="flex gap-4 w-full md:w-auto">
                       <button
                         onClick={() => setIsEvaluationModalOpen(false)}
                         className="flex-1 md:flex-none px-10 py-5 bg-gray-100 text-gray-500 rounded-3xl font-black text-sm uppercase tracking-widest hover:bg-gray-200 transition-all font-bengali"
                       >
                         ক্যানসেল
                       </button>
                       <button
                         onClick={finalizeEvaluation}
                         className="flex-1 md:flex-none px-10 py-5 bg-indigo-600 text-white rounded-3xl font-black text-sm uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 font-bengali"
                       >
                         রিপোর্ট সেভ করুন
                       </button>
                    </div>
                 </div>
               </div>
             )}
           </div>
        </div>
      </Modal>
    </div>
  );
}
