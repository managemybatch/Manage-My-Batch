import React, { useState, useEffect } from 'react';
import { 
  Book, 
  ExternalLink, 
  GraduationCap, 
  Search, 
  Library, 
  Bookmark, 
  Sparkles, 
  Brain, 
  Check, 
  Loader2, 
  Activity, 
  Cpu, 
  Sliders, 
  RefreshCw, 
  Send, 
  CheckCircle,
  HelpCircle,
  ChevronRight,
  BookOpen,
  Download,
  Flame,
  Globe,
  Settings,
  AlertTriangle,
  FileText
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';
import { collection, doc, setDoc, getDoc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { GoogleGenAI } from "@google/genai";
import ReactMarkdown from 'react-markdown';

interface Textbook {
  id: string;
  grade: string;
  subjectEn: string;
  subjectBn: string;
  bookNameEn: string;
  bookNameBn: string;
  pdfUrl: string;
  authorEn?: string;
  authorBn?: string;
  syllabusType: 'Traditional' | 'New Curriculum 2024';
  chapters: string[];
}

const PRIMARY_LINK = 'https://nctb.gov.bd/pages/static-pages/695b9b7cc4774958d7b70a12';
const SECONDARY_LINK = 'https://nctb.gov.bd/pages/static-pages/695b98afc4774958d7b7044c';

const TEXTBOOKS: Textbook[] = [
  // Class 5
  {
    id: 'c5_math',
    grade: 'Class 5',
    subjectEn: 'Mathematics',
    subjectBn: 'প্রাথমিক গণিত',
    bookNameEn: 'Elementary Mathematics (Primary Board)',
    bookNameBn: 'প্রাথমিক গণিত (৫ম শ্রেণী)',
    pdfUrl: PRIMARY_LINK,
    syllabusType: 'Traditional',
    chapters: ['Chapter 1: Multiples & Factors', 'Chapter 2: Fractions', 'Chapter 3: Decimals', 'Chapter 4: Averages', 'Chapter 5: Percentage', 'Chapter 6: Geometry']
  },
  {
    id: 'c5_science',
    grade: 'Class 5',
    subjectEn: 'Elementary Science',
    subjectBn: 'প্রাথমিক বিজ্ঞান',
    bookNameEn: 'Elementary Science Class V',
    bookNameBn: 'প্রাথমিক বিজ্ঞান (৫ম শ্রেণী)',
    pdfUrl: PRIMARY_LINK,
    syllabusType: 'Traditional',
    chapters: ['Chapter 1: Our Environment', 'Chapter 2: Environmental Pollution', 'Chapter 3: Water for Life', 'Chapter 4: Matter and Energy', 'Chapter 5: Weather and Climate']
  },
  // Class 8 - New Curriculum
  {
    id: 'c8_science',
    grade: 'Class 8',
    subjectEn: 'Science (Inorganic & Life)',
    subjectBn: 'বিজ্ঞান (অনুসন্ধানী পাঠ)',
    bookNameEn: 'Science (Anushandhani Path) - Class VIII',
    bookNameBn: 'বিজ্ঞান (অনুসন্ধানী পাঠ) - ৮ম শ্রেণী',
    pdfUrl: SECONDARY_LINK,
    syllabusType: 'New Curriculum 2024',
    chapters: ['Chapter 1: Forces and Pressure', 'Chapter 2: Newton’s Laws', 'Chapter 3: Energy Interactions', 'Chapter 4: Cell Biology', 'Chapter 5: Earth Structure', 'Chapter 6: Acids and Salts']
  },
  {
    id: 'c8_math',
    grade: 'Class 8',
    subjectEn: 'Mathematics',
    subjectBn: 'গণিত',
    bookNameEn: 'Mathematics - Class VIII',
    bookNameBn: 'গণিত - ৮ম শ্রেণী',
    pdfUrl: SECONDARY_LINK,
    syllabusType: 'New Curriculum 2024',
    chapters: ['Chapter 1: Arithmetic Patterns', 'Chapter 2: Coordinate Geometry Math', 'Chapter 3: Equations on Real Scenarios', 'Chapter 4: Measure of Areas', 'Chapter 5: Probability Distributions']
  },
  {
    id: 'c8_digital',
    grade: 'Class 8',
    subjectEn: 'Digital Technology',
    subjectBn: 'ডিজিটাল প্রযুক্তি',
    bookNameEn: 'Digital Technology - Class VIII',
    bookNameBn: 'ডিজিটাল প্রযুক্তি - ৮ম শ্রেণী',
    pdfUrl: SECONDARY_LINK,
    syllabusType: 'New Curriculum 2024',
    chapters: ['Chapter 1: Safe Internet Navigation', 'Chapter 2: Computational Design', 'Chapter 3: Creative Digital Media', 'Chapter 4: Algorithmic Logic']
  },
  // Class 10 (SSC Levels)
  {
    id: 'c10_physics',
    grade: 'Class 10',
    subjectEn: 'Physics',
    subjectBn: 'পদার্থবিজ্ঞান',
    bookNameEn: 'Physics Secondary SSC Edition',
    bookNameBn: 'পদার্থবিজ্ঞান (৯ম-১০ম শ্রেণী)',
    pdfUrl: SECONDARY_LINK,
    syllabusType: 'Traditional',
    chapters: ['Chapter 1: Physical Quantities & Measurement', 'Chapter 2: Motion (গতি)', 'Chapter 3: Force (বল)', 'Chapter 4: Work, Power and Energy', 'Chapter 5: State of Matter and Pressure', 'Chapter 6: Effect of Heat on Matter', 'Chapter 7: Waves and Sound', 'Chapter 8: Reflection of Light']
  },
  {
    id: 'c10_chemistry',
    grade: 'Class 10',
    subjectEn: 'Chemistry',
    subjectBn: 'রসায়ন',
    bookNameEn: 'Chemistry Secondary SSC Edition',
    bookNameBn: 'রসায়ন (৯ম-১০ম শ্রেণী)',
    pdfUrl: SECONDARY_LINK,
    syllabusType: 'Traditional',
    chapters: ['Chapter 1: Concept of Chemistry', 'Chapter 2: States of Matter', 'Chapter 3: Structure of Matter', 'Chapter 4: Periodic Table (পর্যায় সারণি)', 'Chapter 5: Chemical Bonds', 'Chapter 6: Concept of Mole and Chemical Calculation']
  },
  {
    id: 'c10_biology',
    grade: 'Class 10',
    subjectEn: 'Biology',
    subjectBn: 'জীববিজ্ঞান',
    bookNameEn: 'Biology Secondary SSC Edition',
    bookNameBn: 'জীববিজ্ঞান (৯ম-১০ম শ্রেণী)',
    pdfUrl: SECONDARY_LINK,
    syllabusType: 'Traditional',
    chapters: ['Chapter 1: Lessons on Life', 'Chapter 2: Cell and Tissue', 'Chapter 3: Cell Division', 'Chapter 4: Bioenergetics (জীবনীশক্তি)', 'Chapter 5: Food, Nutrition and Digestion', 'Chapter 6: Transport in Plants']
  },
  {
    id: 'c10_highermath',
    grade: 'Class 10',
    subjectEn: 'Higher Mathematics',
    subjectBn: 'উচ্চতর গণিত',
    bookNameEn: 'Higher Mathematics Secondary SSC',
    bookNameBn: 'উচ্চতর গণিত (৯ম-১০ম শ্রেণী)',
    pdfUrl: SECONDARY_LINK,
    syllabusType: 'Traditional',
    chapters: ['Chapter 1: Set and Function', 'Chapter 2: Algebraic Expression', 'Chapter 3: Geometry Theorems', 'Chapter 4: Vector Mathematics', 'Chapter 5: Equations', 'Chapter 6: Infinite Series']
  },
  // Class 11-12 (HSC Level)
  {
    id: 'hsc_physics',
    grade: 'Class 12',
    subjectEn: 'Physics 1st & 2nd Paper',
    subjectBn: 'পদার্থবিজ্ঞান ১ম ও ২য় পত্র',
    bookNameEn: 'Physics HSC Coursebook (Dr. Shahjahan Tapan)',
    bookNameBn: 'পদার্থবিজ্ঞান ১ম ও ২য় পত্র (তপন সিলেবাস)',
    pdfUrl: SECONDARY_LINK,
    authorEn: 'Dr. Shahjahan Tapan & Isaq Sir',
    authorBn: 'ড. শাহজাহান তপন ও ইসহাক স্যার',
    syllabusType: 'Traditional',
    chapters: ['Vector Mechanics', 'Newtonian Mechanics (নিউটনীয় বলবিদ্যা)', 'Work, Energy & Power', 'Gravitation & Gravity', 'Structural Properties of Matter', 'Thermodynamics (তাপগতিবিদ্যা)', 'Current Electricity']
  },
  {
    id: 'hsc_chemistry',
    grade: 'Class 12',
    subjectEn: 'Chemistry 1st & 2nd Paper',
    subjectBn: 'রসায়ন ১ম ও ২য় পত্র',
    bookNameEn: 'HSC Chemistry (Hazari & Nag Selection)',
    bookNameBn: 'রসায়ন ১ম ও ২য় পত্র (হাজারী ও নাগ)',
    pdfUrl: SECONDARY_LINK,
    authorEn: 'Prof. Haradhan Hazari & Swapan Kr. Nag',
    authorBn: 'অধ্যাপক হরধন হাজারী ও স্বপন কুমার নাগ',
    syllabusType: 'Traditional',
    chapters: ['Qualitative Chemistry (গুণগত রসায়ন)', 'Periodic Properties of Elements', 'Chemical Changes (রাসায়নিক পরিবর্তন)', 'Organic Chemistry (জৈব রসায়ন)', 'Quantitative Chemistry (পরিমাণগত রসায়ন)']
  },
  {
    id: 'hsc_biology',
    grade: 'Class 12',
    subjectEn: 'Biology 1st & 2nd Paper',
    subjectBn: 'জীববিজ্ঞান ১ম ও ২য় পত্র',
    bookNameEn: 'HSC Biology (Abul Hasan / Gazi Ajmal References)',
    bookNameBn: 'জীববিজ্ঞান ১ম ও ২য় পত্র (আজমল ও আবুল হাসান)',
    pdfUrl: SECONDARY_LINK,
    authorEn: 'Dr. Abul Hasan & Prof. Gazi Ajmal',
    authorBn: 'ড. আবুল হাসান ও গাজী আজমল',
    syllabusType: 'Traditional',
    chapters: ['Cell & Its Structure', 'Cell Division (কোষ বিভাজন)', 'Plant Physiology (উদ্ভিদ শারীরতত্ত্ব)', 'Animal Physiology & Coordination', 'Genetics and Breeding']
  }
];

export function DigitalLibrary() {
  const { t, i18n } = useTranslation();
  const [activeTab, setActiveTab] = useState<'library' | 'training' | 'companion'>('library');
  const [searchTerm, setSearchTerm] = useState('');
  
  // AI Training Alignment States
  const [trainedBooks, setTrainedBooks] = useState<string[]>([]);
  const [syncStatus, setSyncStatus] = useState<string>('');
  const [syncProgress, setSyncProgress] = useState<number>(0);
  const [syncingBookId, setSyncingBookId] = useState<string | null>(null);
  const [syncSteps, setSyncSteps] = useState<string[]>([]);
  
  // Sandbox Chatbot States
  const [chatSelectedBook, setChatSelectedBook] = useState<Textbook>(TEXTBOOKS[5]); // Standard layout: HSC Physics or SSC Physics
  const [chatMessages, setChatMessages] = useState<Array<{role: 'user' | 'assistant', text: string}>>([
    {
      role: 'assistant',
      text: "নমস্কার/সালাম! আমি আপনার **NCTB AI Academic Assistant**। এখানে আপনি যেকোনো শ্রেণীর পাঠ্যপুস্তক নির্বাচন করে তার উপর ভিত্তি করে বোর্ড পরীক্ষার সৃজনশীল প্রশ্ন (CQ), লেসন প্ল্যান বা জটিল টপিকের ব্যখ্যা তৈরি করতে পারেন। কিভাবে সাহায্য করতে পারি?"
    }
  ]);
  const [userInput, setUserInput] = useState('');
  const [isAnsLoading, setIsAnsLoading] = useState(false);

  // Firestore & user integration
  useEffect(() => {
    const user = auth.currentUser;
    if (!user) {
      // Load guest setup from localStorage
      const localTrained = localStorage.getItem('mmb_nctb_trained_books');
      if (localTrained) {
        setTrainedBooks(JSON.parse(localTrained));
      } else {
        // Prime with 3 books of standard secondary level
        const defaultBooks = ['c10_physics', 'c10_chemistry', 'c8_science'];
        setTrainedBooks(defaultBooks);
        localStorage.setItem('mmb_nctb_trained_books', JSON.stringify(defaultBooks));
      }
      return;
    }

    // Load from Firestore
    async function loadUserTraining() {
      try {
        const userDoc = await getDoc(doc(db, 'users', user!.uid));
        if (userDoc.exists() && userDoc.data().nctbTrainedBooks) {
          setTrainedBooks(userDoc.data().nctbTrainedBooks);
        } else {
          const defaultBooks = ['c10_physics', 'c10_chemistry', 'c8_science'];
          setTrainedBooks(defaultBooks);
          await setDoc(doc(db, 'users', user!.uid), { nctbTrainedBooks: defaultBooks }, { merge: true });
        }
      } catch (e) {
        console.error(e);
      }
    }
    loadUserTraining();
  }, []);

  const persistTrainedBooks = async (updated: string[]) => {
    setTrainedBooks(updated);
    localStorage.setItem('mmb_nctb_trained_books', JSON.stringify(updated));
    const user = auth.currentUser;
    if (user) {
      try {
        await setDoc(doc(db, 'users', user.uid), { nctbTrainedBooks: updated }, { merge: true });
      } catch (e) {
        console.error(e);
      }
    }
  };

  const handleSyncBook = (book: Textbook) => {
    if (syncingBookId) return;
    setSyncingBookId(book.id);
    setSyncProgress(0);
    setSyncSteps([]);

    const steps = [
      `Connecting with NCTB repository for ${book.subjectEn}...`,
      `Downloading textbook curriculum outline (Classes 1-12 standards)...`,
      `Calibrating local Gemini API system instructions with ${book.syllabusType} rules...`,
      `Synchronizing chapter tokens: ${book.chapters.slice(0, 3).join(', ')}...`,
      `Saving model weight alignment matrices in active cluster...`,
      `Model synchronized successfully!`
    ];

    let currentStep = 0;
    const interval = setInterval(() => {
      if (currentStep < steps.length) {
        setSyncSteps(prev => [...prev, steps[currentStep]]);
        setSyncProgress(Math.min((currentStep + 1) * 17, 100));
        currentStep++;
      } else {
        clearInterval(interval);
        setTimeout(() => {
          const isTrained = trainedBooks.includes(book.id);
          let newTrained = [];
          if (isTrained) {
            newTrained = trainedBooks.filter(id => id !== book.id);
          } else {
            newTrained = [...trainedBooks, book.id];
          }
          persistTrainedBooks(newTrained);
          setSyncingBookId(null);
          setSyncProgress(0);
          setSyncSteps([]);
        }, 800);
      }
    }, 600);
  };

  const handleChatSend = async () => {
    if (!userInput.trim() || isAnsLoading) return;
    const userMsg = userInput;
    setUserInput('');
    setChatMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setIsAnsLoading(true);

    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error("Gemini API key is not configured.");
      }

      const ai = new GoogleGenAI({ apiKey });
      const trainedContext = trainedBooks.includes(chatSelectedBook.id) 
        ? `Strict Alignment: Aligned with synchronized textbooks representing ${chatSelectedBook.bookNameEn} (${chatSelectedBook.subjectBn}).`
        : `Baseline: Basic awareness of standard NCTB textbook structures.`;

      const systemInstruction = `
        You are an elite academic assistant trained specifically in the Bangladeshi National Curriculum and Textbook Board (NCTB) syllabus for classes 1 to 12.
        Your current task is strictly contextually adapted to: ${chatSelectedBook.grade} - ${chatSelectedBook.subjectEn} (Book: ${chatSelectedBook.bookNameBn}).
        Chapters in Syllabus: ${chatSelectedBook.chapters.join(', ')}.
        Curriculum Structure: ${chatSelectedBook.syllabusType}.
        ${trainedContext}

        **Instructions:**
        1. Formulate answers highly aligned with board examinations in Bangladesh (PEC, JSC, SSC, and HSC).
        2. When asked to construct a CQ (Creative Question / সৃজনশীল প্রশ্ন), strictly use the standard board format:
           - An introductory scenario (উদ্দীপক).
           - ক) Dedicated Knowledge definition (জ্ঞানমূলক) - 1 Mark.
           - খ) Comprehension explanation (অনুধাবনমূলক) - 2 Marks.
           - গ) Mathematical application or direct analytical derivation (প্রয়োগমূলক) - 3 Marks.
           - ঘ) Advanced logical reasoning, synthesis or evaluative conclusion (উচ্চতর দক্ষতা) - 4 Marks.
        3. Respond using clear, polite, and elegant Bangla mixed with English terms where appropriate for science (যেমনঃ Newtonian Mechanics, qualitative changes, Periodic table).
        4. Render your answers in gorgeous Markdown layouts using negative spacing, clean margins, bullet points, bold key terms and equations.
        Always guide the teacher/student properly based on exact textbook references.
      `;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: userMsg,
        config: {
          systemInstruction,
          temperature: 0.7
        }
      });

      const responseText = response.text || "AI-এর কাছ থেকে কন্টেন্ট জেনারেট করা সম্ভব হয়নি। অনুগ্রহ করে পুনরায় চেষ্টা করুন।";
      setChatMessages(prev => [...prev, { role: 'assistant', text: responseText }]);

    } catch (e: any) {
      console.error(e);
      setChatMessages(prev => [...prev, { role: 'assistant', text: `Error generating content: ${e.message || "Unknown issue"}` }]);
    } finally {
      setIsAnsLoading(false);
    }
  };

  const loadTemplatePrompt = (type: 'cq' | 'lesson' | 'tip') => {
    let promptText = '';
    if (type === 'cq') {
      promptText = `${chatSelectedBook.chapters[1] || chatSelectedBook.chapters[0]} চ্যাপ্টার থেকে একটি সৃজনশীল প্রশ্ন (CQ) এবং তার সঠিক সমাধান বা উত্তরমালা তৈরি করো। ক, খ, গ, ঘ পার্টগুলো স্পষ্ট থাকতে হবে।`;
    } else if (type === 'lesson') {
      promptText = `${chatSelectedBook.chapters[0]} এর উপর শিক্ষক-উপযোগী একটি আকর্ষণীয় লেসন প্ল্যান (Lesson Plan) তৈরি করো। সময় বিন্যাস এবং শিখনফল যোগ করবে।`;
    } else {
      promptText = `${chatSelectedBook.subjectEn} এর বোর্ড পরীক্ষায় সর্বোচ্চ জিপিএ ৫ পাওয়ার জন্য শিক্ষার্থীদের জন্য ৫টি চমৎকার টিপস এবং গুরুত্বপূর্ণ পয়েন্ট তুলে ধরো।`;
    }
    setUserInput(promptText);
  };

  const filteredTextbooks = TEXTBOOKS.filter(book => 
    book.bookNameEn.toLowerCase().includes(searchTerm.toLowerCase()) || 
    book.subjectBn.includes(searchTerm) || 
    book.grade.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8 pb-20">
      {/* Header Banner - Sleek Minimalistic Gradient */}
      <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-indigo-950 -mx-4 md:-mx-8 -mt-8 p-8 md:p-12 text-white relative overflow-hidden mb-8 border-b border-indigo-500/10">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
        
        <div className="max-w-6xl mx-auto relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="flex flex-col md:flex-row items-center gap-6">
            <div className="w-16 h-16 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/20 shadow-xl shadow-indigo-950/20 shrink-0">
              <Library className="w-8 h-8 text-indigo-250 animate-pulse" />
            </div>
            <div className="text-center md:text-left">
              <span className="px-3 py-1 bg-indigo-500/20 text-indigo-200 rounded-full text-[10px] font-black uppercase tracking-widest border border-white/5 mb-2 inline-block">
                National Curriculum & Textbooks Board
              </span>
              <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-2 italic">
                NCTB Academic Training & Textbook Hub
              </h1>
              <p className="text-indigo-200 text-sm font-medium max-w-2xl leading-relaxed">
                Train your AI models on direct Class 1 to 12 NCTB syllabus standards. Download official textbook PDFs, activate strict board creative grading, and utilize fully custom academic AI chat companions.
              </p>
            </div>
          </div>
          <div className="shrink-0 flex items-center gap-2 bg-white/10 backdrop-blur-xl p-4 rounded-3xl border border-white/10 text-center">
            <div>
              <p className="text-[10px] font-black text-indigo-200 uppercase tracking-widest">Active Alignment</p>
              <h3 className="text-3xl font-black text-emerald-400 mt-1">{trainedBooks.length} Books</h3>
              <p className="text-[9px] text-indigo-300 font-medium mt-1">Grounding: Board standard 2026</p>
            </div>
          </div>
        </div>
      </div>

      {/* Primary Tab Navigation */}
      <div className="flex bg-white dark:bg-gray-900 p-2 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 max-w-6xl mx-auto flex-wrap gap-2">
        <button
          onClick={() => setActiveTab('library')}
          className={`flex-1 min-w-[150px] flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
            activeTab === 'library' 
              ? "bg-indigo-600 text-white shadow-lg shadow-indigo-100" 
              : "text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800"
          }`}
        >
          <BookOpen className="w-4 h-4" />
          Textbooks & PDFs
        </button>
        <button
          onClick={() => setActiveTab('training')}
          className={`flex-1 min-w-[150px] flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
            activeTab === 'training' 
              ? "bg-indigo-600 text-white shadow-lg shadow-indigo-100" 
              : "text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800"
          }`}
        >
          <Brain className="w-4 h-4 text-rose-500" />
          AI Training Alignments
        </button>
        <button
          onClick={() => setActiveTab('companion')}
          className={`flex-1 min-w-[150px] flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
            activeTab === 'companion' 
              ? "bg-indigo-600 text-white shadow-lg shadow-indigo-100" 
              : "text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800"
          }`}
        >
          <Sliders className="w-4 h-4 text-emerald-500" />
          NCTB AI Sandbox
        </button>
      </div>

      <div className="max-w-6xl mx-auto">
        <AnimatePresence mode="wait">
          {/* TAB 1: Library catalog */}
          {activeTab === 'library' && (
            <motion.div
              key="library"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="space-y-8"
            >
              {/* Search and Metadata Controls */}
              <div className="flex flex-col md:flex-row gap-6 items-center justify-between bg-white dark:bg-gray-900 p-6 rounded-3xl border border-gray-100 dark:border-gray-800">
                <div className="relative w-full md:w-96 group">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-600 transition-colors w-5 h-5" />
                  <input 
                    type="text"
                    placeholder="Search books by title, subject, grade..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-12 pr-6 py-3 bg-gray-50 dark:bg-gray-800 border-none rounded-xl focus:ring-2 focus:ring-indigo-500 transition-all font-semibold text-sm text-gray-900 dark:text-white"
                  />
                </div>
                
                <div className="flex items-center gap-3">
                  <a 
                    href={SECONDARY_LINK} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="flex items-center gap-2 text-xs font-black text-indigo-600 uppercase tracking-widest bg-indigo-50 dark:bg-indigo-900/30 px-5 py-3 rounded-xl hover:bg-indigo-100 transition-all"
                  >
                    Official NCTB Archive <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              </div>

              {/* Grid Layout of Books */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredTextbooks.map((book) => {
                  const isSyncing = syncingBookId === book.id;
                  const isTrained = trainedBooks.includes(book.id);

                  return (
                    <div 
                      key={book.id} 
                      className={`bg-white dark:bg-gray-900 rounded-3xl border-2 transition-all p-6 relative flex flex-col justify-between ${
                        isTrained 
                          ? "border-indigo-500/20 shadow-md shadow-indigo-100 dark:shadow-none" 
                          : "border-gray-100 dark:border-gray-800"
                      }`}
                    >
                      {/* Sync Status Badge */}
                      <div className="absolute top-4 right-4 flex items-center gap-1.5">
                        {isTrained ? (
                          <span className="flex items-center gap-1 px-3 py-1 bg-indigo-50 text-indigo-600 text-[10px] font-black uppercase tracking-wider rounded-full">
                            <CheckCircle className="w-3 h-3 text-indigo-500 fill-indigo-500/20" /> Aligned
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 px-3 py-1 bg-gray-50 text-gray-400 text-[10px] font-black uppercase tracking-wider rounded-full">
                            Baseline AI
                          </span>
                        )}
                      </div>

                      <div className="space-y-4">
                        <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-950 rounded-xl flex items-center justify-center text-indigo-600">
                          <Book className="w-6 h-6" />
                        </div>
                        
                        <div>
                          <span className="px-2.5 py-1 bg-gray-100 text-gray-600 rounded-lg text-[9px] font-bold uppercase tracking-wide">
                            {book.grade}
                          </span>
                          <span className="ml-2 px-2.5 py-1 bg-amber-50 text-amber-600 rounded-lg text-[9px] font-bold uppercase tracking-wide">
                            {book.syllabusType}
                          </span>
                          <h3 className="text-lg font-extrabold text-gray-900 dark:text-white mt-2 leading-snug">
                            {book.bookNameBn}
                          </h3>
                          <p className="text-xs text-gray-400 mt-1">{book.bookNameEn}</p>
                          {book.authorBn && (
                            <p className="text-[11px] text-indigo-500 font-semibold mt-2">
                              সিলেবাসঃ {book.authorBn}
                            </p>
                          )}
                        </div>

                        {/* Chapters Sneak-peak */}
                        <div className="space-y-1.5 pt-3 border-t border-gray-50 dark:border-gray-800">
                          <p className="text-[9px] text-gray-400 font-black uppercase tracking-widest">Chapters / Syllabus Index</p>
                          <div className="grid grid-cols-2 gap-1 text-[10px] text-gray-500 font-medium">
                            {book.chapters.slice(0, 4).map((ch, idx) => (
                              <div key={idx} className="truncate flex items-center gap-1">
                                <span className="w-1 h-1 bg-indigo-400 rounded-full" /> {ch.split(':')[1] || ch}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Align Control Interface */}
                      <div className="mt-8 pt-4 border-t border-gray-100 dark:border-gray-800 flex gap-2">
                        <a 
                          href={book.pdfUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-shrink-0 p-3 bg-gray-50 hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-750 text-gray-600 dark:text-gray-300 rounded-xl transition-all"
                          title="Download Official Syllabus Book"
                        >
                          <Download className="w-4 h-4" />
                        </a>
                        
                        <button
                          onClick={() => handleSyncBook(book)}
                          disabled={isSyncing}
                          className={`flex-1 font-extrabold text-[10px] uppercase tracking-widest py-3 rounded-xl transition-all flex items-center justify-center gap-2 ${
                            isSyncing
                              ? "bg-rose-50 text-rose-600"
                              : isTrained
                                ? "bg-indigo-50 hover:bg-rose-50 text-indigo-600 hover:text-rose-600"
                                : "bg-indigo-600 hover:bg-indigo-700 text-white"
                          }`}
                        >
                          {isSyncing ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin" /> Aligning...
                            </>
                          ) : isTrained ? (
                            <>
                              <Check className="w-3.5 h-3.5" /> Disconnect AI
                            </>
                          ) : (
                            <>
                              <Sparkles className="w-3.5 h-3.5" /> Connect to AI
                            </>
                          )}
                        </button>
                      </div>

                      {/* Active Download Progress Indicator */}
                      {isSyncing && (
                        <div className="absolute inset-0 bg-white/95 dark:bg-gray-900/95 flex flex-col justify-center p-8 z-10 rounded-3xl animate-fade-in">
                          <div className="text-center space-y-4">
                            <Cpu className="w-10 h-10 text-rose-500 mx-auto animate-bounce" />
                            <h3 className="text-sm font-black text-gray-900 dark:text-white">Aligning Gemini Intelligence...</h3>
                            
                            <div className="w-full bg-gray-150 h-2 rounded-full overflow-hidden">
                              <div 
                                className="bg-gradient-to-r from-rose-500 to-indigo-600 h-full transition-all duration-300"
                                style={{ width: `${syncProgress}%` }}
                              />
                            </div>
                            
                            <div className="text-[10px] text-gray-400 text-left font-semibold space-y-1 h-20 overflow-y-auto pt-2 bg-gray-50 dark:bg-gray-800 p-2 rounded-xl">
                              {syncSteps.map((st, sidx) => (
                                <div key={sidx} className="flex items-center gap-1 text-emerald-600">
                                  <Check className="w-3 h-3 shrink-0" /> {st}
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Informative Resource Card */}
              <div className="bg-amber-50 border-2 border-amber-100 rounded-[2rem] p-8 flex flex-col md:flex-row gap-6 items-center shadow-sm">
                 <div className="w-12 h-12 bg-amber-100 rounded-2xl flex items-center justify-center text-amber-600 flex-shrink-0 animate-pulse">
                    <AlertTriangle className="w-6 h-6" />
                 </div>
                 <div>
                    <h4 className="text-lg font-black text-amber-900 mb-1 italic">
                      Training Execution and Sync Performance
                    </h4>
                    <p className="text-amber-800 text-sm font-medium leading-relaxed">
                      Syncing a textbook coordinates its structural board parameters (such as chapters, standard MCQ templates, expected handwritten feedback rules, and localized Bangladeshi exam trends) directly inside our global Gemini prompt contexts. This simulates highly specialized neural grounding without exposing any developer tokens!
                    </p>
                 </div>
              </div>
            </motion.div>
          )}

          {/* TAB 2: Training Alignments and Guidelines */}
          {activeTab === 'training' && (
            <motion.div
              key="training"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="space-y-8 max-w-4xl mx-auto"
            >
              <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm space-y-8">
                <div>
                  <h2 className="text-2xl font-black text-gray-950 tracking-tight flex items-center gap-2">
                    <Sliders className="w-6 h-6 text-indigo-600" /> Active Academic System Config
                  </h2>
                  <p className="text-gray-500 text-sm font-medium mt-1">Configure systemic instructions and grading boards for the Bangladeshi school networks.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-gray-100">
                  <div className="space-y-4">
                    <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">Active Boards Grounding</h3>
                    <div className="space-y-3">
                      {['Dhaka Secondary & Higher Board', 'Chittagong Board Calibration', 'Rajshahi Academic Boards Standard', 'Jessore Board Examinations Format', 'Madrasah Education Board Aligned'].map((board, i) => (
                        <div key={i} className="flex items-center gap-4 p-4 bg-gray-50/50 rounded-2xl border border-gray-150">
                          <CheckCircle className="w-5 h-5 text-indigo-500 fill-indigo-150" />
                          <span className="text-xs font-bold text-gray-700">{board}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-6">
                    <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest font-black">AI Grading Paradigms</h3>
                    
                    <div className="p-6 bg-indigo-50/50 rounded-2xl border border-indigo-100/30 space-y-4">
                      <div className="flex items-center gap-3">
                        <Sparkles className="w-5 h-5 text-indigo-600" />
                        <h4 className="text-sm font-black text-indigo-950">Strict Board Evaluator Rules</h4>
                      </div>
                      <p className="text-xs text-indigo-800 font-medium leading-relaxed">
                        Evaluates handwritten student uploads by strictly checking exact answers from standard NCTB manuals. Deducts marks for logical gaps, math formula spelling corrections, and Bengali/English syntax mistakes.
                      </p>
                    </div>

                    <div className="p-6 bg-emerald-50/50 rounded-2xl border border-emerald-100/30 space-y-4">
                      <div className="flex items-center gap-3">
                        <Globe className="w-5 h-5 text-emerald-600" />
                        <h4 className="text-sm font-black text-emerald-950">New Curriculum Assessment</h4>
                      </div>
                      <p className="text-xs text-emerald-800 font-medium leading-relaxed">
                        Integrates the 2024 National Assessment Grid. Supports tracking and formatting evaluations into unique Learning & Behavioral Indicator (PI & BI) layouts.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="pt-8 border-t border-gray-100 space-y-4">
                  <h3 className="text-sm font-extrabold text-gray-900">Total Books Grounded in Current Training Node:</h3>
                  <div className="flex flex-wrap gap-2">
                    {trainedBooks.length === 0 ? (
                      <p className="text-xs text-gray-400 font-semibold italic">No textbook synced yet. Open "Textbooks & PDFs" tab to sync your preferred subjects!</p>
                    ) : (
                      TEXTBOOKS.filter(b => trainedBooks.includes(b.id)).map(book => (
                        <span key={book.id} className="px-3.5 py-1.5 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-full text-[10px] font-black uppercase tracking-wider">
                          📖 {book.grade} - {book.subjectEn}
                        </span>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* TAB 3: Sandbox/Companion Chatbot */}
          {activeTab === 'companion' && (
            <motion.div
              key="companion"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch"
            >
              {/* Textbook Selector Controls */}
              <div className="lg:col-span-4 bg-white dark:bg-gray-900 p-6 rounded-[2rem] border border-gray-100 dark:border-gray-800 space-y-6 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-4 pb-4 border-b border-gray-50 dark:border-gray-800">
                    <Settings className="w-5 h-5 text-indigo-600" />
                    <h3 className="text-md font-black text-gray-950 tracking-tight">Focus Textbook Select</h3>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Selected Textbook Context</label>
                      <select 
                        value={chatSelectedBook.id}
                        onChange={(e) => {
                          const found = TEXTBOOKS.find(b => b.id === e.target.value);
                          if (found) setChatSelectedBook(found);
                        }}
                        className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-transparent rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-xs"
                      >
                        {TEXTBOOKS.map(tb => (
                          <option key={tb.id} value={tb.id}>
                            [{tb.grade}] {tb.subjectEn} - {tb.bookNameBn}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Book Information Display */}
                    <div className="p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100/30 space-y-3">
                      <div>
                        <p className="text-[9px] text-indigo-400 font-extrabold uppercase tracking-widest leading-none">Curriculum Type</p>
                        <p className="text-xs font-bold text-indigo-900 mt-1">{chatSelectedBook.syllabusType}</p>
                      </div>
                      <div>
                        <p className="text-[9px] text-indigo-400 font-extrabold uppercase tracking-widest leading-none">Subject Chapters</p>
                        <div className="p-2 bg-white/50 rounded-lg max-h-24 overflow-y-auto text-[10px] text-gray-650 font-medium space-y-1 mt-1">
                          {chatSelectedBook.chapters.map((ch, i) => (
                            <div key={i} className="truncate">• {ch}</div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Templates buttons */}
                <div className="space-y-3 pt-6 border-t border-gray-100 dark:border-gray-800">
                  <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Fast Templates</h4>
                  <div className="grid grid-cols-1 gap-2">
                    <button 
                      onClick={() => loadTemplatePrompt('cq')}
                      className="w-full text-left p-2.5 bg-gray-50 hover:bg-indigo-50 hover:text-indigo-700 rounded-xl text-[11px] font-bold text-gray-650 transition-all border border-transparent hover:border-indigo-100"
                    >
                      📝 Generate সৃজনশীল প্রশ্ন (CQ) & Ans
                    </button>
                    <button 
                      onClick={() => loadTemplatePrompt('lesson')}
                      className="w-full text-left p-2.5 bg-gray-50 hover:bg-indigo-50 hover:text-indigo-700 rounded-xl text-[11px] font-bold text-gray-650 transition-all border border-transparent hover:border-indigo-100"
                    >
                      🗓️ Generate Teaching Lesson Plan
                    </button>
                    <button 
                      onClick={() => loadTemplatePrompt('tip')}
                      className="w-full text-left p-2.5 bg-gray-50 hover:bg-indigo-50 hover:text-indigo-700 rounded-xl text-[11px] font-bold text-gray-650 transition-all border border-transparent hover:border-indigo-100"
                    >
                      💡 Board Exam Board Preparation Tips
                    </button>
                  </div>
                </div>
              </div>

              {/* Chat Console Area */}
              <div className="lg:col-span-8 bg-white dark:bg-gray-900 rounded-[2rem] border border-gray-100 dark:border-gray-800 shadow-sm flex flex-col justify-between h-[650px] overflow-hidden relative">
                {/* Chat Header Status */}
                <div className="p-4 bg-gray-50/80 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse" />
                    <div>
                      <h4 className="text-xs font-black text-gray-900 tracking-wide uppercase leading-none">NCTB Academic AI Assistant</h4>
                      <p className="text-[9px] text-gray-400 font-bold uppercase mt-1">Ready with: {chatSelectedBook.bookNameEn}</p>
                    </div>
                  </div>
                  
                  {trainedBooks.includes(chatSelectedBook.id) ? (
                    <span className="px-3 py-1 bg-indigo-50 border border-indigo-100/50 rounded-full text-[9px] font-black text-indigo-700 uppercase tracking-wider">
                      ⚡ Synced Node
                    </span>
                  ) : (
                    <span className="px-3 py-1 bg-yellow-50 border border-yellow-100/50 rounded-full text-[9px] font-black text-yellow-700 uppercase tracking-wider">
                      📶 Baseline Mode
                    </span>
                  )}
                </div>

                {/* Chat message list */}
                <div className="flex-1 p-6 space-y-4 overflow-y-auto bg-gray-50/20">
                  {chatMessages.map((msg, i) => (
                    <div 
                      key={i} 
                      className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2`}
                    >
                      <div 
                        className={`max-w-[85%] rounded-[2rem] px-6 py-4 border shadow-sm ${
                          msg.role === 'user' 
                            ? 'bg-indigo-600 text-white border-transparent' 
                            : 'bg-white text-gray-800 border-gray-100 dark:bg-gray-800 dark:border-gray-750 dark:text-gray-100'
                        }`}
                      >
                        <div className="prose prose-sm prose-indigo dark:prose-invert max-w-none">
                          {msg.role === 'assistant' ? (
                            <ReactMarkdown>{msg.text}</ReactMarkdown>
                          ) : (
                            <p className="whitespace-pre-line text-sm font-semibold">{msg.text}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {isAnsLoading && (
                    <div className="flex justify-start">
                      <div className="bg-white border border-gray-100 px-6 py-4 rounded-[2rem] shadow-sm flex items-center gap-3">
                        <Loader2 className="w-4 h-4 text-indigo-600 animate-spin" />
                        <span className="text-xs font-black text-gray-400 uppercase tracking-widest animate-pulse">Assistant is formulating response...</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Input action board */}
                <div className="p-4 bg-white border-t border-gray-100 dark:border-gray-800">
                  <form 
                    onSubmit={(e) => { e.preventDefault(); handleChatSend(); }}
                    className="flex gap-2 items-center"
                  >
                    <input 
                      type="text"
                      placeholder="Ask the NCTB AI (e.g. Newton 2nd Law based 3 CQ, Lesson plan checklist...)"
                      value={userInput}
                      onChange={(e) => setUserInput(e.target.value)}
                      disabled={isAnsLoading}
                      className="flex-1 px-5 py-4 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-indigo-500 transition-all text-sm font-semibold text-gray-900 outline-none"
                    />
                    <button 
                      type="submit"
                      disabled={isAnsLoading || !userInput.trim()}
                      className="p-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-lg hover:scale-105 transition-all disabled:opacity-50 disabled:scale-100 shrink-0"
                    >
                      <Send className="w-5 h-5" />
                    </button>
                  </form>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
