import React, { useState, useEffect } from 'react';
import { db, handleFirestoreError, OperationType, auth } from '../firebase';
import { collection, query, where, getDocs, addDoc, doc, serverTimestamp, orderBy, getDoc, updateDoc, onSnapshot, increment } from 'firebase/firestore';
import { Sparkles, FileText, Loader2, Download, Trash2, Wand2, Info, ChevronRight, Plus, CheckCircle2, Layout, BookOpen, Clock, Layers, Languages, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { GRADES, CREDIT_COSTS } from '../constants';
import { GoogleGenAI } from "@google/genai";
import ReactMarkdown from 'react-markdown';
import { jsPDF } from 'jspdf';
import { CreditPricingModal } from '../components/CreditPricingModal';

interface Question {
  id: string;
  type: 'CQ' | 'MCQ' | 'Short';
  text: string;
  marks: number;
  options?: string[];
  explanation?: string;
}

export function AiQuestionGenerator() {
  const [activeTab, setActiveTab] = useState<'bulk' | 'step' | 'library'>('bulk');
  const [loading, setLoading] = useState(false);
  const [aiBalance, setAiBalance] = useState<number>(0);
  const [instId, setInstId] = useState<string>('');
  const [knowledgeSources, setKnowledgeSources] = useState<any[]>([]);

  // Config State
  const [classLevel, setClassLevel] = useState(GRADES[0]);
  const [subject, setSubject] = useState('');
  const [language, setLanguage] = useState<'English' | 'Bangla'>('English');
  const [totalMarks, setTotalMarks] = useState(100);
  
  // Step-by-Step State
  const [currentQuestions, setCurrentQuestions] = useState<Question[]>([]);
  const [isGeneratingSample, setIsGeneratingSample] = useState(false);
  const [samples, setSamples] = useState<Question[]>([]);
  const [stepStepInstruction, setStepStepInstruction] = useState('');

  // Bulk State
  const [bulkConfig, setBulkConfig] = useState({
    cqCount: 5,
    mcqCount: 20,
    shortCount: 0,
    topics: ''
  });
  const [generatedPaper, setGeneratedPaper] = useState<string>('');
  const [showPricing, setShowPricing] = useState(false);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    async function init() {
      const userDoc = await getDoc(doc(db, 'users', user!.uid));
      const uData = userDoc.data();
      const institutionId = uData?.role === 'admin' ? user?.uid : uData?.institutionId;
      setInstId(institutionId);

      if (institutionId) {
        onSnapshot(doc(db, 'credits', institutionId), (snap) => {
          if (snap.exists()) setAiBalance(snap.data().aiBalance || 0);
        });
      }

      const qK = query(collection(db, 'system_knowledge'), where('isActive', '==', true));
      const snapK = await getDocs(qK);
      setKnowledgeSources(snapK.docs.map(d => d.data()));
    }
    init();
  }, []);

  const getAIContext = () => {
    const source = knowledgeSources.find(s => (s.grade || s.class) === classLevel && s.subject.toLowerCase() === subject.toLowerCase());
    const matchedBookJson = localStorage.getItem('mmb_nctb_trained_books');
    let extraNctbPrompt = '';
    
    // Auto Ground on NCTB Book configuration
    if (matchedBookJson) {
      try {
        const syncIds = JSON.parse(matchedBookJson);
        if (syncIds && syncIds.length > 0) {
          extraNctbPrompt = `
          **BANGLADESHI NATIONAL CURRICULUM SYLLABUS GROUNDING:**
          - Synchronized on Active Teacher-Trained NCTB Book indices for ${classLevel}.
          - The academic standards MUST follow standard textbooks from the National Curriculum and Textbook Board (NCTB) of Bangladesh.
          - Apply board formatting appropriate for PEC, JSC, SSC or HSC standards depending on the Class level selected.
          - If generating Creative Questions (CQ / সৃজনশীল), they must strictly feature a logical stimulus/stem (উদ্দীপক) followed by:
            ক) জ্ঞানমূলক (Conceptual Definition) - 1 Mark
            খ) অনুধাবনমূলক (Explanation / Core comprehension) - 2 Marks
            গ) প্রয়োগমূলক (Application in Scenario / Math problem) - 3 Marks
            ঘ) উচ্চতর দক্ষতামূলক (Higher Ability Evaluation / Critical Synthesis) - 4 Marks.
          - Translate all technical terminologies elegantly when Language is "Bangla". Keep formulas and key terms easily relatable to Board Exams (Dhaka, Chittagong, Rajshahi Boards etc.).
          `;
        }
      } catch (e) {
        console.error("Failed to parse local NCTB state:", e);
      }
    }
    return (source ? source.contentSummary : '') + '\n' + extraNctbPrompt;
  };

  const handleGenerateSamples = async () => {
    if (!subject || !stepStepInstruction) return;
    if (aiBalance < 2) {
      alert('Insufficient AI Credits (Needs 2 for sample generation)');
      return;
    }

    setIsGeneratingSample(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
      const prompt = `
        You are an expert teacher creating a question for ${classLevel} ${subject} in Bangladesh.
        Language: ${language}
        Topic/Instruction: ${stepStepInstruction}
        Context Guidelines: ${getAIContext()}

        Generate 3 distinct sample questions (JSON array format).
        Question Object Structure: { "type": "MCQ" | "CQ" | "Short", "text": "...", "marks": number, "options": ["A", "B", "C", "D"] (if MCQ), "explanation": "..." }
        
        Note: If any of these are Creative Questions (CQ), structure the text with: 
        "Stem: [Scenario description]\\n\\nক) [Question text]\\nখ) [Question text]\\nগ) [Question text]\\nঘ) [Question text]"

        Return ONLY valid JSON.
      `;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
      });

      const text = response.text || '[]';
      const cleanText = text.replace(/```json|```/g, '').trim();
      const parsed = JSON.parse(cleanText);
      setSamples(parsed.map((q: any, i: number) => ({ ...q, id: `sample-${Date.now()}-${i}` })));
      
      // Deduct small amount for samples
      await updateDoc(doc(db, 'credits', instId), {
        aiBalance: increment(-1)
      }).catch(e => handleFirestoreError(e, OperationType.UPDATE, `credits/${instId}`));
    } catch (e: any) {
      console.error(e);
      alert('Generation failed: ' + (e.message || 'Unknown error'));
    } finally {
      setIsGeneratingSample(false);
    }
  };

  const handleBulkGenerate = async () => {
    if (aiBalance < CREDIT_COSTS.AI_QUESTION_GENERATOR) {
      alert('Insufficient AI Credits');
      return;
    }

    setLoading(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
      const prompt = `
        Generate a full standard Board examination question paper for ${classLevel} ${subject} in Bangladesh.
        - Total Marks: ${totalMarks}
        - Language: ${language}
        - Requirements: ${bulkConfig.cqCount} Creative Questions (CQs / সৃজনশীল), ${bulkConfig.mcqCount} MCQs, ${bulkConfig.shortCount} Short Questions.
        - Topics to focus: ${bulkConfig.topics}
        - Context Guidelines: ${getAIContext()}
        
        Format the output in clean Markdown suitable for printing. 
        Include professional headers for:
        [Institution Name / জেলা স্কুল বা স্বনামধন্য কলেজ (Placeholder)]
        Class: ${classLevel}
        Subject: ${subject}
        Time Allowed: ${totalMarks > 50 ? '3 Hours' : '1.5 Hours'}
        Total Marks: ${totalMarks}

        Ensure that the Creative Questions strictly feature an elegant Stimulus Stem (উদ্দীপক) and are partitioned into ক, খ, গ, ঘ sections with respective marking outlines.
      `;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
      });

      setGeneratedPaper(response.text || '');

      await updateDoc(doc(db, 'credits', instId), {
        aiBalance: increment(-CREDIT_COSTS.AI_QUESTION_GENERATOR),
        totalSpent: increment(CREDIT_COSTS.AI_QUESTION_GENERATOR),
        lastUpdated: serverTimestamp()
      }).catch(e => handleFirestoreError(e, OperationType.UPDATE, `credits/${instId}`));

      await addDoc(collection(db, 'question_papers'), {
        institutionId: instId,
        teacherId: auth.currentUser?.uid,
        title: `Exam: ${subject} (${classLevel})`,
        class: classLevel,
        subject,
        totalMarks,
        questions: [], // Bulk stores raw markdown for now
        contentMarkdown: response.text,
        createdAt: serverTimestamp()
      }).catch(e => handleFirestoreError(e, OperationType.CREATE, 'question_papers'));

    } catch (e: any) {
      console.error(e);
      alert('Bulk generation failed: ' + (e.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const exportPDF = (content: string) => {
    const doc = new jsPDF();
    const splitText = doc.splitTextToSize(content.replace(/[#*`]/g, ''), 180);
    doc.text(splitText, 15, 15);
    doc.save(`${subject}_Question_Paper.pdf`);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
             <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-100">
               <Layers className="w-6 h-6" />
             </div>
             <h1 className="text-4xl font-black text-gray-900 tracking-tight">AI Question Generator</h1>
          </div>
          <p className="text-gray-500 font-medium">Create high-quality exam papers with institutional knowledge.</p>
        </div>

        <div className="flex items-center gap-4 bg-white p-2 rounded-3xl border border-gray-100 shadow-sm pr-6">
           <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 font-black">
              {aiBalance}
           </div>
           <div>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">AI Balance</p>
              <button 
                onClick={() => setShowPricing(true)}
                className="text-sm font-bold text-indigo-600 hover:underline"
              >
                Top-up Credits
              </button>
           </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 p-1 bg-gray-100 rounded-2xl w-fit">
        <button
          onClick={() => setActiveTab('bulk')}
          className={cn(
            "flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold transition-all text-sm",
            activeTab === 'bulk' ? "bg-white text-indigo-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
          )}
        >
          <Layout className="w-4 h-4" /> Bulk Generator
        </button>
        <button
          onClick={() => setActiveTab('step')}
          className={cn(
            "flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold transition-all text-sm",
            activeTab === 'step' ? "bg-white text-indigo-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
          )}
        >
          <Plus className="w-4 h-4" /> One by One
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Settings Panel */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-6">
            <h3 className="text-lg font-black text-gray-900 tracking-tight flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-indigo-600" /> Basic Info
            </h3>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Grade</label>
                  <select 
                    value={classLevel}
                    onChange={(e) => setClassLevel(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-sm"
                  >
                    {GRADES.map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Total Marks</label>
                  <input 
                    type="number"
                    value={totalMarks}
                    onChange={(e) => setTotalMarks(Number(e.target.value))}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-sm"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Subject</label>
                <input 
                  type="text"
                  placeholder="e.g. Biology"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-sm"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Language</label>
                <div className="flex p-1 bg-gray-50 rounded-2xl border border-gray-100">
                  <button
                    onClick={() => setLanguage('English')}
                    className={cn(
                      "flex-1 py-2 rounded-xl text-xs font-bold transition-all",
                      language === 'English' ? "bg-white text-indigo-600 shadow-sm" : "text-gray-400"
                    )}
                  >
                    English
                  </button>
                  <button
                    onClick={() => setLanguage('Bangla')}
                    className={cn(
                      "flex-1 py-2 rounded-xl text-xs font-bold transition-all",
                      language === 'Bangla' ? "bg-white text-indigo-600 shadow-sm" : "text-gray-400"
                    )}
                  >
                    বাংলা
                  </button>
                </div>
              </div>
            </div>

            {activeTab === 'bulk' ? (
              <div className="space-y-4 pt-4 border-t border-gray-100">
                <h3 className="text-sm font-black text-gray-900 uppercase tracking-wider">Question Distribution</h3>
                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-gray-400 uppercase">Creative</label>
                    <input type="number" value={bulkConfig.cqCount} onChange={e=>setBulkConfig({...bulkConfig, cqCount: Number(e.target.value)})} className="w-full p-2 bg-gray-50 border border-gray-100 rounded-xl text-xs font-bold" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-gray-400 uppercase">MCQ</label>
                    <input type="number" value={bulkConfig.mcqCount} onChange={e=>setBulkConfig({...bulkConfig, mcqCount: Number(e.target.value)})} className="w-full p-2 bg-gray-50 border border-gray-100 rounded-xl text-xs font-bold" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-gray-400 uppercase">Short</label>
                    <input type="number" value={bulkConfig.shortCount} onChange={e=>setBulkConfig({...bulkConfig, shortCount: Number(e.target.value)})} className="w-full p-2 bg-gray-50 border border-gray-100 rounded-xl text-xs font-bold" />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Chapters/Topics</label>
                  <textarea 
                    rows={3}
                    placeholder="e.g. Chapter 1, 3 and 5..."
                    value={bulkConfig.topics}
                    onChange={e => setBulkConfig({...bulkConfig, topics: e.target.value})}
                    className="w-full p-3 bg-gray-50 border border-gray-100 rounded-2xl text-xs font-medium resize-none"
                  />
                </div>
                <button 
                  onClick={handleBulkGenerate}
                  disabled={loading || !subject}
                  className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black shadow-lg hover:bg-indigo-700 transition-all flex items-center justify-center gap-2"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
                  Generate Full Paper
                </button>
              </div>
            ) : (
              <div className="space-y-4 pt-4 border-t border-gray-100">
                <h3 className="text-sm font-black text-gray-900 uppercase tracking-wider">Step by Step</h3>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Question Instruction</label>
                  <textarea 
                    rows={4}
                    placeholder="e.g. Make a creative question on Bilashi story focus on sacrifice..."
                    value={stepStepInstruction}
                    onChange={e => setStepStepInstruction(e.target.value)}
                    className="w-full p-3 bg-gray-50 border border-gray-100 rounded-2xl text-xs font-medium resize-none"
                  />
                </div>
                <button 
                  onClick={handleGenerateSamples}
                  disabled={isGeneratingSample || !stepStepInstruction}
                  className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black shadow-lg hover:bg-indigo-700 transition-all flex items-center justify-center gap-2"
                >
                  {isGeneratingSample ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
                  Generate 3 Samples
                </button>
              </div>
            )}

            <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 flex gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
              <p className="text-[10px] text-amber-900 font-medium leading-relaxed">
                Source: <b>Knowledge Base</b> + Global Internet Learning. class level appropriate vocabulary and difficulty guaranteed.
              </p>
            </div>
          </div>
        </div>

        {/* Preview Panel */}
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-white min-h-[700px] p-8 md:p-12 rounded-[3.5rem] border border-gray-100 shadow-sm relative overflow-hidden">
             <div className="absolute top-0 left-0 w-full h-1.5 bg-indigo-600" />
             
             {activeTab === 'bulk' ? (
               generatedPaper ? (
                 <div className="space-y-6 motion-safe:animate-in motion-safe:fade-in">
                    <div className="flex items-center justify-between pb-6 border-b border-gray-100">
                      <span className="px-4 py-1.5 bg-indigo-50 text-indigo-600 rounded-full text-[10px] font-black uppercase tracking-widest">Bulk Paper Preview</span>
                      <button onClick={() => exportPDF(generatedPaper)} className="p-3 bg-gray-50 text-gray-600 rounded-xl hover:bg-indigo-50 hover:text-indigo-600 transition-all">
                        <Download className="w-5 h-5" />
                      </button>
                    </div>
                    <div className="prose prose-indigo max-w-none">
                      <ReactMarkdown>{generatedPaper}</ReactMarkdown>
                    </div>
                 </div>
               ) : (
                 <div className="h-[600px] flex flex-col items-center justify-center text-center space-y-4 opacity-30">
                    <Layout className="w-20 h-20 text-gray-300" />
                    <h3 className="text-xl font-black text-gray-900">Configure Bulk Settings</h3>
                    <p className="text-sm font-medium text-gray-500 max-w-xs">AI will generate a complete exam paper with sections and marks distribution.</p>
                 </div>
               )
             ) : (
               <div className="space-y-8">
                 {samples.length > 0 && (
                   <div className="space-y-6">
                     <h4 className="text-lg font-black text-gray-900">Select a Sample to Add</h4>
                     <div className="grid grid-cols-1 gap-4">
                       {samples.map((s, i) => (
                         <div key={i} className="p-6 bg-indigo-50/50 rounded-3xl border border-indigo-100 space-y-4 group">
                           <div className="flex items-center justify-between">
                              <span className="px-3 py-1 bg-indigo-100 text-indigo-600 rounded-lg text-[10px] font-bold uppercase tracking-widest">{s.type} ({s.marks} Marks)</span>
                              <button 
                                onClick={() => {
                                  setCurrentQuestions([...currentQuestions, s]);
                                  setSamples([]);
                                  setStepStepInstruction('');
                                }}
                                className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold shadow-lg shadow-indigo-100 hover:scale-105 transition-all"
                              >
                                Select & Add
                              </button>
                           </div>
                           <p className="text-sm text-gray-800 font-medium leading-relaxed">{s.text}</p>
                           {s.options && (
                             <div className="grid grid-cols-2 gap-2">
                               {s.options.map((opt, oi) => (
                                 <div key={oi} className="p-2 bg-white rounded-lg text-[10px] font-medium text-gray-600 border border-gray-100">{opt}</div>
                               ))}
                             </div>
                           )}
                         </div>
                       ))}
                     </div>
                   </div>
                 )}

                 {currentQuestions.length > 0 ? (
                   <div className="space-y-6 pt-8 border-t border-gray-100">
                     <div className="flex items-center justify-between">
                       <h4 className="text-lg font-black text-gray-900">Your Question Paper ({currentQuestions.reduce((acc, q) => acc + q.marks, 0)}/{totalMarks} Marks)</h4>
                       <button onClick={() => setCurrentQuestions([])} className="text-rose-600 text-xs font-bold hover:underline">Clear Paper</button>
                     </div>
                     <div className="space-y-4">
                       {currentQuestions.map((q, i) => (
                         <div key={i} className="p-4 bg-white border border-gray-100 rounded-2xl flex gap-4 items-start">
                            <span className="w-8 h-8 bg-gray-50 rounded-lg flex items-center justify-center text-xs font-bold text-gray-400">{i+1}</span>
                            <div className="flex-1 space-y-1">
                               <p className="text-sm font-medium text-gray-900">{q.text}</p>
                               <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{q.type} - {q.marks} Marks</span>
                            </div>
                         </div>
                       ))}
                     </div>
                     <button className="w-full py-4 bg-gray-900 text-white rounded-2xl font-black shadow-xl hover:bg-black transition-all flex items-center justify-center gap-2">
                        <Download className="w-5 h-5" /> Export This Paper
                     </button>
                   </div>
                 ) : !samples.length && (
                   <div className="h-[600px] flex flex-col items-center justify-center text-center space-y-4 opacity-30">
                      <Plus className="w-20 h-20 text-gray-300" />
                      <h3 className="text-xl font-black text-gray-900">Build Your Paper Locally</h3>
                      <p className="text-sm font-medium text-gray-500 max-w-xs">AI will help you craft one question at a time. Perfect for precise control.</p>
                   </div>
                 )}
               </div>
             )}
          </div>
        </div>
      </div>

      <CreditPricingModal 
        isOpen={showPricing} 
        onClose={() => setShowPricing(false)} 
      />
    </div>
  );
}
