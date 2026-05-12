import React, { useState, useEffect } from 'react';
import { db, handleFirestoreError, OperationType, auth } from '../firebase';
import { useAuth } from '../lib/auth';
import { useTranslation } from 'react-i18next';
import { collection, query, where, getDocs, addDoc, doc, serverTimestamp, orderBy, getDoc, updateDoc, onSnapshot, setDoc, increment } from 'firebase/firestore';
import { Sparkles, Library, FileText, Calendar, Search, Loader2, Download, Trash2, Send, Wand2, Info, ChevronRight, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { GRADES, CREDIT_COSTS } from '../constants';
import { GoogleGenAI, Type } from "@google/genai";
import ReactMarkdown from 'react-markdown';
import { jsPDF } from 'jspdf';

interface StudySheet {
  id: string;
  title: string;
  type: 'sheet' | 'plan';
  grade: string;
  subject: string;
  topic: string;
  content: string;
  createdAt: any;
}

interface KnowledgeSource {
  id: string;
  title: string;
  grade: string;
  subject: string;
  contentSummary: string;
}

import { CreditPricingModal } from '../components/CreditPricingModal';

export function AiStudyAssistant() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'generator' | 'library'>('generator');
  const [loading, setLoading] = useState(false);
  const [sheets, setSheets] = useState<StudySheet[]>([]);
  const [knowledgeSources, setKnowledgeSources] = useState<KnowledgeSource[]>([]);
  const [aiBalance, setAiBalance] = useState<number>(0);
  const [instId, setInstId] = useState<string>('');

  // Generator State
  const [selectedClass, setSelectedClass] = useState(GRADES[0]);
  const [selectedSubject, setSelectedSubject] = useState('');
  const [topic, setTopic] = useState('');
  const [type, setType] = useState<'sheet' | 'plan'>('sheet');
  const [language, setLanguage] = useState<'English' | 'Bangla'>('English');
  const [tone, setTone] = useState<'Simple' | 'Standard' | 'Academic'>('Standard');
  const [length, setLength] = useState<'Short' | 'Standard' | 'Detailed'>('Standard');
  const [includeDiagrams, setIncludeDiagrams] = useState(false);
  const [customInstructions, setCustomInstructions] = useState('');
  const [generatedContent, setGeneratedContent] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [showPricing, setShowPricing] = useState(false);

  useEffect(() => {
    if (!user) return;

    const institutionId = user.role === 'admin' ? user.uid : user.institutionId;
    setInstId(institutionId || '');

    if (institutionId) {
      const creditRef = doc(db, 'credits', institutionId);
      const unsub = onSnapshot(creditRef, (snap) => {
        if (snap.exists()) {
          setAiBalance(snap.data().aiBalance || 0);
        } else {
          // New institution: Setup initial 5 trial credits
          setDoc(creditRef, { 
            aiBalance: 5, 
            totalSpent: 0, 
            lastUpdated: serverTimestamp(),
            userId: institutionId
          }, { merge: true });
          setAiBalance(5);
        }
      });
      return () => unsub();
    }
  }, [user]);

  useEffect(() => {
    async function fetchKnowledge() {
      const qK = query(collection(db, 'system_knowledge'), where('isActive', '==', true));
      const snapK = await getDocs(qK);
      setKnowledgeSources(snapK.docs.map(d => ({ id: d.id, ...d.data() })) as KnowledgeSource[]);
    }
    fetchKnowledge();
  }, []);

  useEffect(() => {
    if (!instId || activeTab !== 'library') return;

    const q = query(
      collection(db, 'study_sheets'),
      where('institutionId', '==', instId),
      orderBy('createdAt', 'desc')
    );

    const unsub = onSnapshot(q, (snap) => {
      setSheets(snap.docs.map(d => ({ id: d.id, ...d.data() })) as StudySheet[]);
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'study_sheets'));

    return () => unsub();
  }, [instId, activeTab]);

  const handleGenerate = async () => {
    if (!topic || !selectedSubject) {
      alert('Please enter a subject and topic');
      return;
    }

    if (aiBalance < CREDIT_COSTS.AI_STUDY_ASSISTANT) {
      alert('Insufficient AI Credits');
      return;
    }

    setIsGenerating(true);
    setGeneratedContent('');

    try {
      // Find relevant knowledge
      const source = knowledgeSources.find(s => s.grade === selectedClass && s.subject.toLowerCase() === selectedSubject.toLowerCase());
      
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const prompt = `
        You are an expert ${selectedSubject} teacher for ${selectedClass}. 
        Your task is to generate a high-quality ${type === 'sheet' ? 'STUDY SHEET' : 'LESSON PLAN'} for the topic: "${topic}".
        
        LANGUAGE: ${language}
        TONE/DIFFICULTY: ${tone} (Make it appropriate for this level)
        LENGTH: ${length} (${length === 'Detailed' ? 'Generate at least 3 pages worth of content' : length === 'Short' ? 'Keep it concise and punchy' : 'Standard comprehensive length'})
        
        ${includeDiagrams ? 'IMPORTANT: Include [DIAGRAM PLACEHOLDER: Description of what should be drawn here] at relevant points.' : ''}
        ${customInstructions ? `TEACHER'S CUSTOM INSTRUCTIONS: ${customInstructions}` : ''}
        
        ${source ? `STRICT CONTEXT (Use this as your source of truth): ${source.contentSummary}` : 'Use standard academic curriculum facts.'}
        
        REQUIREMENTS:
        1. Context: Standard curriculum (NCTB Bangladesh for Bangla context or Global standards for English).
        2. Format: Use clean Markdown formatting with headers, tables, and lists.
        3. Content for STUDY SHEET: 
           - ${language === 'Bangla' ? 'টপিকের সারসংক্ষেপ' : 'Executive Summary of the topic'}
           - ${language === 'Bangla' ? 'প্রয়োজনীয় সূত্র বা তথ্যাদি' : 'Key formulas/info'}
           - ${language === 'Bangla' ? '৫টি গুরুত্বপূর্ণ সৃজনশীল প্রশ্ন' : '5 key conceptual questions'}
           - ${language === 'Bangla' ? '৫টি গুরুত্বপূর্ণ জ্ঞানমূলক প্রশ্ন' : '5 key knowledge-based questions'}
           - One "Pro-Tip" section.
        4. Content for LESSON PLAN: Learning objectives, time breakdown, and specific pedagogical steps.
        5. Tone: ${tone}. MUST be 100% accurate. 
        
        OUTPUT ONLY THE MARKDOWN CONTENT.
      `;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
      });

      const result = response.text || 'Failed to generate content.';
      setGeneratedContent(result);

      // Deduct Credits and Save
      await updateDoc(doc(db, 'credits', instId), {
        aiBalance: increment(-CREDIT_COSTS.AI_STUDY_ASSISTANT),
        totalSpent: increment(CREDIT_COSTS.AI_STUDY_ASSISTANT),
        lastUpdated: serverTimestamp()
      });

      await addDoc(collection(db, 'study_sheets'), {
        institutionId: instId,
        teacherId: auth.currentUser?.uid,
        title: `${type === 'sheet' ? (language === 'Bangla' ? 'স্টাডি শীট' : 'Study Sheet') : (language === 'Bangla' ? 'লেসন প্ল্যান' : 'Lesson Plan')}: ${topic}`,
        type,
        class: selectedClass,
        subject: selectedSubject,
        topic,
        content: result,
        creditUsed: CREDIT_COSTS.AI_STUDY_ASSISTANT,
        createdAt: serverTimestamp()
      });

    } catch (error) {
      console.error('Generation error:', error);
      alert('Failed to generate study sheet. Please check your internet and credits.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleExportPDF = (sheet: StudySheet) => {
    const doc = new jsPDF();
    doc.setFontSize(20);
    doc.text(sheet.title, 20, 20);
    doc.setFontSize(12);
    doc.text(`${sheet.grade} | ${sheet.subject} | ${sheet.topic}`, 20, 30);
    doc.line(20, 35, 190, 35);
    
    // Simple markdown parsing to text (very basic for now)
    const textLines = sheet.content.replace(/[#*`]/g, '').split('\n');
    let y = 45;
    textLines.forEach(line => {
      if (y > 280) {
        doc.addPage();
        y = 20;
      }
      doc.text(line, 20, y);
      y += 7;
    });
    
    doc.save(`${sheet.grade}_${sheet.topic}.pdf`);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Header with Title and Credits */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
             <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-100">
               <Sparkles className="w-6 h-6" />
             </div>
             <h1 className="text-4xl font-black text-gray-900 tracking-tight">AI Study Assistant</h1>
          </div>
          <p className="text-gray-500 font-medium">Generate professional study sheets and lesson plans in seconds.</p>
        </div>

        <div className="flex items-center gap-4 bg-white p-2 rounded-3xl border border-gray-100 shadow-sm pr-6">
           <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-600 font-black">
              {aiBalance}
           </div>
           <div>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">AI Credits Balance</p>
              <button 
                onClick={() => setShowPricing(true)}
                className="text-xs font-bold text-indigo-600 hover:underline"
              >
                Buy More Credits
              </button>
           </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 p-1 bg-gray-100 rounded-2xl w-fit">
        <button
          onClick={() => setActiveTab('generator')}
          className={cn(
            "flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold transition-all text-sm",
            activeTab === 'generator' ? "bg-white text-indigo-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
          )}
        >
          <Wand2 className="w-4 h-4" /> Generator
        </button>
        <button
          onClick={() => setActiveTab('library')}
          className={cn(
            "flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold transition-all text-sm",
            activeTab === 'library' ? "bg-white text-indigo-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
          )}
        >
          <Library className="w-4 h-4" /> My Library
        </button>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'generator' ? (
          <motion.div
            key="generator"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-8"
          >
            {/* Left: Configuration */}
            <div className="lg:col-span-1 space-y-6">
               <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-6">
                  <h3 className="text-xl font-black text-gray-900 tracking-tight flex items-center gap-2">
                    <Info className="w-5 h-5 text-indigo-600" /> Settings
                  </h3>
                  
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Grade Level</label>
                      <select 
                        value={selectedClass}
                        onChange={(e) => setSelectedClass(e.target.value)}
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-sm"
                      >
                        {GRADES.map(g => <option key={g} value={g}>{g}</option>)}
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Subject</label>
                      <input 
                        type="text"
                        placeholder="e.g. Physics"
                        value={selectedSubject}
                        onChange={(e) => setSelectedSubject(e.target.value)}
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-sm"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Chapter or Topic</label>
                      <input 
                        type="text"
                        placeholder="e.g. Gravitation"
                        value={topic}
                        onChange={(e) => setTopic(e.target.value)}
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-sm"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Output Language</label>
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

                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 text-indigo-600">Advanced Customization</label>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <label className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter">Tone</label>
                            <select 
                              value={tone}
                              onChange={(e) => setTone(e.target.value as any)}
                              className="w-full px-3 py-2 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-[11px]"
                            >
                              <option value="Simple">Easy (Child friendly)</option>
                              <option value="Standard">Standard Academic</option>
                              <option value="Academic">Advanced/Detailed</option>
                            </select>
                          </div>
                          <div className="space-y-1">
                            <label className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter">Length</label>
                            <select 
                              value={length}
                              onChange={(e) => setLength(e.target.value as any)}
                              className="w-full px-3 py-2 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-[11px]"
                            >
                              <option value="Short">Concise (1 Page)</option>
                              <option value="Standard">Medium (2 Pages)</option>
                              <option value="Detailed">Long (3+ Pages)</option>
                            </select>
                          </div>
                        </div>
                      </div>

                      <label className="flex items-center gap-2 p-3 bg-gray-50 rounded-2xl border border-gray-100 cursor-pointer hover:bg-gray-100 transition-colors">
                        <input 
                          type="checkbox"
                          checked={includeDiagrams}
                          onChange={(e) => setIncludeDiagrams(e.target.checked)}
                          className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                        />
                        <span className="text-xs font-bold text-gray-700">Suggest Diagram/Image points</span>
                      </label>

                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Additional Instructions</label>
                        <textarea 
                          placeholder="e.g. Focus more on algebraic proofs..."
                          value={customInstructions}
                          onChange={(e) => setCustomInstructions(e.target.value)}
                          rows={2}
                          className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-medium text-xs resize-none"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Generation Type</label>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => setType('sheet')}
                          className={cn(
                            "flex-1 p-4 rounded-2xl border-2 font-bold transition-all flex flex-col items-center gap-2",
                            type === 'sheet' ? "bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-100" : "bg-gray-50 border-gray-100 text-gray-500"
                          )}
                        >
                          <FileText className="w-6 h-6" />
                          <span className="text-xs">Study Sheet</span>
                        </button>
                        <button 
                          onClick={() => setType('plan')}
                          className={cn(
                            "flex-1 p-4 rounded-2xl border-2 font-bold transition-all flex flex-col items-center gap-2",
                            type === 'plan' ? "bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-100" : "bg-gray-50 border-gray-100 text-gray-500"
                          )}
                        >
                          <Calendar className="w-6 h-6" />
                          <span className="text-xs">Lesson Plan</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={handleGenerate}
                    disabled={isGenerating || !topic || !selectedSubject}
                    className="w-full py-4 bg-indigo-600 text-white rounded-[1.5rem] font-black shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-95 disabled:opacity-50 disabled:scale-100 flex items-center justify-center gap-3 group"
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="w-6 h-6 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-6 h-6 group-hover:rotate-12 transition-transform" />
                        Generate Now
                      </>
                    )}
                  </button>

                  <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100">
                    <p className="text-[10px] font-black text-amber-800 uppercase tracking-widest flex items-center gap-2 mb-2">
                      <AlertTriangle className="w-4 h-4" /> Tip
                    </p>
                    <p className="text-xs text-amber-900/70 font-medium leading-relaxed">
                      AI uses the knowledge base updated by super admins for verified textbook content.
                    </p>
                  </div>
               </div>
            </div>

            {/* Right: Output */}
            <div className="lg:col-span-2 space-y-6">
               <div className="bg-white min-h-[600px] p-8 md:p-12 rounded-[3.5rem] border border-gray-100 shadow-sm relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-amber-500" />
                  
                  {isGenerating ? (
                    <div className="h-[500px] flex flex-col items-center justify-center text-center space-y-6">
                       <div className="w-24 h-24 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin shadow-2xl shadow-indigo-100" />
                       <div className="space-y-2">
                          <h3 className="text-2xl font-black text-gray-900 tracking-tight italic">AI is crafting your material...</h3>
                          <p className="text-gray-500 font-medium">Compiling knowledge from textbooks and generating sheets.</p>
                       </div>
                    </div>
                  ) : generatedContent ? (
                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                       <div className="flex items-center justify-between">
                          <span className="px-4 py-1.5 bg-indigo-50 text-indigo-600 rounded-full text-[10px] font-black uppercase tracking-widest border border-indigo-100">AI Generated Preview</span>
                          <div className="flex items-center gap-2">
                             <button
                               onClick={() => handleExportPDF({ id: 'temp', title: `${type === 'sheet' ? 'Study Sheet' : 'Lesson Plan'}: ${topic}`, grade: selectedClass, subject: selectedSubject, topic, type, content: generatedContent, createdAt: null })}
                               className="p-3 bg-gray-50 text-gray-600 rounded-xl hover:bg-gray-100 transition-all active:scale-90"
                               title="Download PDF"
                             >
                                <Download className="w-5 h-5" />
                             </button>
                             <button
                               onClick={() => setGeneratedContent('')}
                               className="p-3 bg-gray-50 text-gray-600 rounded-xl hover:bg-rose-50 hover:text-rose-600 transition-all active:scale-90"
                               title="Clear"
                             >
                                <Trash2 className="w-5 h-5" />
                             </button>
                          </div>
                       </div>

                       <div className="prose prose-indigo max-w-none prose-p:text-gray-600 prose-headings:text-gray-900 prose-headings:font-black prose-headings:tracking-tight prose-strong:text-indigo-900 prose-ul:list-disc">
                          <ReactMarkdown>{generatedContent}</ReactMarkdown>
                       </div>
                    </div>
                  ) : (
                    <div className="h-[500px] flex flex-col items-center justify-center text-center space-y-6 opacity-40">
                       <div className="w-32 h-32 bg-gray-50 rounded-[2.5rem] flex items-center justify-center text-gray-300">
                          <Wand2 className="w-16 h-16" />
                       </div>
                       <div className="space-y-2 max-w-xs">
                          <h3 className="text-xl font-black text-gray-900">Ready to Create</h3>
                          <p className="text-sm font-medium text-gray-500">Configure your material on the left and click generate to start the magic.</p>
                       </div>
                    </div>
                  )}
               </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="library"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {sheets.length === 0 ? (
              <div className="col-span-full py-20 text-center bg-white rounded-[3rem] border border-gray-100 shadow-sm opacity-50">
                 <Library className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                 <h3 className="text-xl font-black text-gray-900">Your Library is Empty</h3>
                 <p className="text-gray-500 font-medium">Start generating sheets to see them here.</p>
              </div>
            ) : (
              sheets.map((sheet) => (
                <motion.div
                  key={sheet.id}
                  whileHover={{ y: -5 }}
                  className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm space-y-4 group transition-all hover:shadow-xl hover:shadow-indigo-50"
                >
                  <div className="flex items-start justify-between">
                     <div className={cn(
                       "w-12 h-12 rounded-2xl flex items-center justify-center",
                       sheet.type === 'sheet' ? "bg-indigo-50 text-indigo-600" : "bg-purple-50 text-purple-600"
                     )}>
                        {sheet.type === 'sheet' ? <FileText className="w-6 h-6" /> : <Calendar className="w-6 h-6" />}
                     </div>
                     <button
                       onClick={() => handleExportPDF(sheet)}
                       className="p-3 bg-gray-50 text-gray-400 rounded-xl hover:bg-indigo-50 hover:text-indigo-600 transition-all opacity-0 group-hover:opacity-100"
                     >
                        <Download className="w-5 h-5" />
                     </button>
                  </div>
                  <div>
                    <h4 className="font-black text-gray-900 text-lg leading-tight line-clamp-1">{sheet.title}</h4>
                    <div className="flex items-center gap-2 mt-1">
                       <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{sheet.grade}</span>
                       <span className="w-1 h-1 bg-gray-300 rounded-full" />
                       <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">{sheet.subject}</span>
                    </div>
                  </div>
                  <div className="pt-4 border-t border-gray-50 flex items-center justify-between">
                    <p className="text-[10px] text-gray-400 font-medium">
                      {sheet.createdAt?.toDate().toLocaleDateString()}
                    </p>
                    <button 
                      onClick={() => {
                        setGeneratedContent(sheet.content);
                        setTopic(sheet.topic);
                        setSelectedSubject(sheet.subject);
                        setSelectedClass(sheet.grade);
                        setType(sheet.type);
                        setActiveTab('generator');
                      }}
                      className="text-[10px] font-black text-indigo-600 uppercase tracking-widest flex items-center gap-1 hover:gap-2 transition-all"
                    >
                      View Details <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                </motion.div>
              ))
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <CreditPricingModal 
        isOpen={showPricing} 
        onClose={() => setShowPricing(false)} 
      />
    </div>
  );
}
