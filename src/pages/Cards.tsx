import React, { useState, useEffect, useRef } from 'react';
import { 
  IdCard, 
  Search, 
  Filter, 
  Download, 
  Printer, 
  Plus, 
  Settings as SettingsIcon, 
  CheckCircle2, 
  Loader2, 
  User, 
  GraduationCap, 
  Award, 
  FileText,
  BadgeCheck,
  Palmtree,
  Star,
  ChevronRight,
  Monitor,
  Layout,
  Palette,
  Undo,
  School,
  ClipboardCheck,
  Users,
  Shield,
  QrCode
} from 'lucide-react';
import { collection, onSnapshot, query, where, getDoc, doc, setDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { useAuth } from '../lib/auth';
import { cn } from '../lib/utils';
import { useTranslation } from 'react-i18next';
import { toPng } from 'html-to-image';
import jsPDF from 'jspdf';
import { motion, AnimatePresence } from 'motion/react';

interface Student {
  id: string;
  name: string;
  rollNo: string;
  batchId: string;
  batchName: string;
  guardianPhone: string;
  photoURL?: string;
  gender?: string;
  bloodGroup?: string;
  dob?: string;
  examId?: string;
  fatherName?: string;
  motherName?: string;
  guardianName?: string;
}

interface Batch {
  id: string;
  name: string;
}

interface CardTemplate {
  id: string;
  name: string;
  type: 'id_card' | 'admit_card' | 'certificate' | 'testimonial';
  thumbnail: string;
}

const CERTIFICATE_TEMPLATES: CardTemplate[] = [
  { id: 'luxury_gold', name: 'লাক্সারি গোল্ড (Luxury Gold)', type: 'certificate', thumbnail: '#' },
  { id: 'geometric_pro', name: 'জিওমেট্রিক প্রো (Geometric Pro)', type: 'certificate', thumbnail: '#' },
  { id: 'appreciation_navy', name: 'অ্যাপ্রিসিয়েশন নেভি (Appreciation Navy)', type: 'certificate', thumbnail: '#' },
  { id: 'vintage_scroll', name: 'ভিন্টেজ ক্লাসিক (Vintage Scroll)', type: 'certificate', thumbnail: '#' },
  { id: 'elite_dark', name: 'এলিট ডার্ক (Elite Dark)', type: 'certificate', thumbnail: '#' },
  { id: 'modern_minimal', name: 'মডার্ন মিনিমাল (Modern Minimal)', type: 'certificate', thumbnail: '#' },
  { id: 'academic_blue', name: 'একাডেমিক ব্লু (Academic Blue)', type: 'certificate', thumbnail: '#' },
  { id: 'bn_royal_border', name: 'রয়েল বর্ডার (BN Royal)', type: 'certificate', thumbnail: '#' },
  { id: 'bn_floral_classic', name: 'ফ্লোরাল ক্লাসিক (BN Floral)', type: 'certificate', thumbnail: '#' },
  { id: 'bn_geometrical_art', name: 'জিওমেট্রিকাল আর্ট (BN Art)', type: 'certificate', thumbnail: '#' },
  { id: 'bn_traditional_v1', name: 'ঐতিহ্যবাহী বর্ডার ১', type: 'certificate', thumbnail: '#' },
  { id: 'bn_traditional_v2', name: 'ঐতিহ্যবাহী বর্ডার ২', type: 'certificate', thumbnail: '#' },
  { id: 'bn_traditional_v3', name: 'ঐতিহ্যবাহী বর্ডার ৩', type: 'certificate', thumbnail: '#' }
];

const TESTIMONIAL_TEMPLATES: CardTemplate[] = [
  { id: 'standard', name: 'স্ট্যান্ডার্ড ফর্মাল (Standard)', type: 'testimonial', thumbnail: '#' },
  { id: 'elegant', name: 'এলিগেন্ট স্ক্রিপ্ট (Elegant)', type: 'testimonial', thumbnail: '#' },
  { id: 'bn_traditional_gold', name: 'চিরাচরিত প্রশংসাপত্র (BN Gold)', type: 'testimonial', thumbnail: '#' },
  { id: 'bn_classic_blue', name: 'ক্লাসিক প্রশংসাপত্র (BN Blue)', type: 'testimonial', thumbnail: '#' },
  { id: 'bn_ornate_floral', name: 'অরনেট ফ্লোরাল (BN Floral)', type: 'testimonial', thumbnail: '#' }
];

const ID_CARD_TEMPLATES: CardTemplate[] = [
  { id: 'vertical_pro', name: 'ভার্টিকাল প্রফেশনাল (Vertical)', type: 'id_card', thumbnail: '#' },
  { id: 'horizontal_minimal', name: 'হরিজন্টাল মিনিমাল (Horizontal)', type: 'id_card', thumbnail: '#' },
  { id: 'vibrant_waves', name: 'ভাইব্রেন্ট ওয়েভস (Blue/Gold)', type: 'id_card', thumbnail: '#' },
  { id: 'orange_pulse', name: 'অরেঞ্জ পালস (Orange/Grey)', type: 'id_card', thumbnail: '#' },
  { id: 'modern_accent', name: 'মডার্ন অ্যাকসেন্ট (Navy/Yellow)', type: 'id_card', thumbnail: '#' },
  { id: 'purple_flow', name: 'পার্পল ফ্লো (Purple Wavy)', type: 'id_card', thumbnail: '#' },
  { id: 'elite_dark_id', name: 'এলিট ডার্ক আইডি (Elite Dark)', type: 'id_card', thumbnail: '#' },
  { id: 'minimalist_edge', name: 'মিনিমালিস্ট এজ (Minimalist)', type: 'id_card', thumbnail: '#' },
  { id: 'futuristic_glass', name: 'ফিউচারিস্টিক গ্লাস (Glassmorphism)', type: 'id_card', thumbnail: '#' },
  { id: 'eco_green', name: 'ইকো গ্রিন (Eco Nature)', type: 'id_card', thumbnail: '#' },
  { id: 'holographic_neon', name: 'হলো গ্রাফিক নিয়ন (Neon Tech)', type: 'id_card', thumbnail: '#' },
  { id: 'sky_gradient', name: 'স্কাই গ্রেডিয়েন্ট (Sky Gradient)', type: 'id_card', thumbnail: '#' },
  { id: 'brutalist_mono', name: 'ব্রুলালিস্ট মনো (Brutalist Mono)', type: 'id_card', thumbnail: '#' },
  { id: 'soft_geometric', name: 'সফট জিওমেট্রিক (Soft Geometric)', type: 'id_card', thumbnail: '#' }
];

const ADMIT_CARD_TEMPLATES: CardTemplate[] = [
  { id: 'standard', name: 'স্ট্যান্ডার্ড অ্যাডমিট (Standard)', type: 'admit_card', thumbnail: '#' },
  { id: 'compact', name: 'কম্প্যাক্ট অ্যাডমিট (Compact)', type: 'admit_card', thumbnail: '#' }
];

export function Cards() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'id_card' | 'admit_card' | 'certificate' | 'testimonial' | 'settings'>('id_card');
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState<Student[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBatch, setSelectedBatch] = useState('All');
  const [selectedExam, setSelectedExam] = useState('Annual Examination 2024');
  const [exams, setExams] = useState<any[]>([]);
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [selectedExamId, setSelectedExamId] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [instData, setInstData] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [activeSettingsType, setActiveSettingsType] = useState<'id_card' | 'admit_card' | 'certificate' | 'testimonial'>('id_card');
  const [showBackSide, setShowBackSide] = useState(false);
  
  const [settings, setSettings] = useState({
    certificateTemplate: 'elite_dark',
    testimonialTemplate: 'standard',
    idCardTemplate: 'vibrant_waves',
    admitCardTemplate: 'standard',
    primaryColor: '#4f46e5',
    secondaryColor: '#f59e0b',
    headerTextColor: '#ffffff',
    instNameSize: '24px',
    signatureUrl: '',
    sealUrl: '',
    signatoryName: '',
    signatoryTitle: 'Principal',
    customCertificateText: 'For outstanding academic excellence and remarkable performance in the academic year',
    examName: 'Annual Examination 2024',
    resultLabel: 'GPA',
    session: '2023-24',
    issueDate: new Date().toLocaleDateString('en-US'),
    cardExpiry: 'DEC-2026',
    cardInstructions: '1. This card is non-transferable.\n2. Loss of card must be reported immediately.\n3. Always wear this card within institution premises.\n4. If found, please return to the office.',
  });

  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;
    const instId = user.institutionId || user.uid;

    const unsubStudents = onSnapshot(query(collection(db, 'students'), where('institutionId', '==', instId)), (snap) => {
      setStudents(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Student[]);
      setLoading(false);
    });

    const unsubBatches = onSnapshot(query(collection(db, 'batches'), where('institutionId', '==', instId)), (snap) => {
      setBatches(snap.docs.map(doc => ({ id: doc.id, name: doc.data().name })) as Batch[]);
    });

    getDoc(doc(db, 'institutions', instId)).then(snap => {
      if (snap.exists()) {
        const data = snap.data();
        setInstData(data);
        if (data.cardSettings) {
          setSettings(prev => ({ ...prev, ...data.cardSettings }));
        }
      }
    });

    const unsubExams = onSnapshot(query(collection(db, 'offline_exams'), where('institutionId', '==', instId)), (snap) => {
      setExams(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => {
      unsubStudents();
      unsubBatches();
      unsubExams();
    };
  }, [user]);

  useEffect(() => {
    if (activeTab === 'admit_card' && !selectedExamId && exams.length > 0) {
      setSelectedExamId(exams[0].id);
      const firstExam = exams[0];
      setSettings(prev => ({ ...prev, examName: firstExam.title }));
    }
  }, [activeTab, exams, selectedExamId]);

  const handleSaveSettings = async () => {
    if (!user) return;
    setSaving(true);
    const instId = user.institutionId || user.uid;
    try {
      await setDoc(doc(db, 'institutions', instId), {
        cardSettings: settings
      }, { merge: true });
      alert('সফলভাবে ডিজাইন কনফিগারেশন সেভ করা হয়েছে!');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'institutions/settings');
    } finally {
      setSaving(false);
    }
  };

  const sampleStudent: Student = {
    id: 'sample',
    name: 'Mahim Ahmed',
    rollNo: '001',
    batchId: 'sample',
    batchName: 'Class 5 Boys M',
    guardianPhone: '01XXXXXXXXX',
    photoURL: '',
    bloodGroup: 'A+',
  };

  const filteredStudents = students.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase()) || s.rollNo.includes(searchTerm);
    const matchesBatch = selectedBatch === 'All' || s.batchId === selectedBatch;
    
    // If an exam is selected in Admit Card tab, filter students by that exam's batch
    if (activeTab === 'admit_card' && selectedExamId) {
      const exam = exams.find(e => e.id === selectedExamId);
      if (exam && exam.batchId) {
        return matchesSearch && s.batchId === exam.batchId;
      }
    }
    
    return matchesSearch && matchesBatch;
  });

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedStudents(filteredStudents.map(s => s.id));
    } else {
      setSelectedStudents([]);
    }
  };

  const toggleStudentSelection = (id: string) => {
    setSelectedStudents(prev => 
      prev.includes(id) ? prev.filter(sid => sid !== id) : [...prev, id]
    );
  };

  const downloadCard = async (studentId: string, name: string) => {
    const element = document.getElementById(`print-card-${studentId}`);
    if (!element) return;

    try {
      setIsGenerating(true);
      const dataUrl = await toPng(element, { 
        pixelRatio: 4, 
        backgroundColor: '#ffffff',
        style: { transform: 'scale(1)', transformOrigin: 'top left' }
      });
      
      const pdf = new jsPDF({
        orientation: activeTab === 'certificate' || activeTab === 'testimonial' ? 'landscape' : 'portrait',
        unit: 'mm',
        format: activeTab === 'id_card' ? [54, 86] : 'a4'
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      
      pdf.addImage(dataUrl, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`${activeTab}_${name}.pdf`);
    } catch (error) {
      console.error('Generation failed:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  // Certificate Renderers
  const renderCertificate = (student: Student) => {
    const templateId = settings.certificateTemplate;
    const primary = settings.primaryColor || '#0f172a';
    const secondary = settings.secondaryColor || '#f59e0b';
    
    if (templateId === 'modern_minimal') {
      return (
        <div id={`print-card-${student.id}`} className="relative w-[1123px] h-[794px] bg-white overflow-hidden font-sans p-16 flex flex-col items-center justify-center text-slate-900">
           <div className="absolute top-0 left-0 w-64 h-64 bg-slate-100 rounded-br-full -ml-16 -mt-16"></div>
           <div className="absolute bottom-0 right-0 w-64 h-64 bg-slate-100 rounded-tl-full -mr-16 -mb-16"></div>
           
           <div className="relative z-10 text-center flex flex-col items-center w-full border-2 border-slate-200 p-20 rounded-[4rem]">
              <div className="mb-10">
                 <h1 className="text-6xl font-black text-slate-900 uppercase tracking-tighter">CERTIFICATE</h1>
                 <p className="text-lg font-bold text-slate-400 uppercase tracking-[0.4em] mt-2">OF EXCELLENCE</p>
              </div>
              
              <p className="text-xl text-slate-500 mb-6">This honor is awarded to</p>
              <h2 className="text-7xl font-black text-indigo-600 mb-8">{student.name}</h2>
              
              <div className="flex items-center gap-10 mb-8 text-indigo-900/40 text-xs font-black uppercase tracking-widest">
                 <span>Exam: {settings.examName}</span>
                 <div className="h-4 w-px bg-indigo-100"></div>
                 <span>{settings.resultLabel}: {settings.session}</span>
              </div>

              <p className="text-lg text-slate-600 max-w-2xl leading-relaxed mb-16">
                 {settings.customCertificateText || "For demonstrating outstanding commitment and achievement in the academic field. Your hard work and perseverance serve as an inspiration to others."}
              </p>

              <div className="flex justify-between w-full mt-10 px-10">
                 <div className="text-center">
                    <p className="text-xl font-bold border-b-2 border-slate-900 pb-2 mb-2 px-8 min-w-[200px]">{settings.signatoryName || "Authorized"}</p>
                    <p className="text-xs font-black text-slate-400 uppercase">SIGNATURE</p>
                 </div>
                 <div className="text-center">
                    <p className="text-xl font-bold border-b-2 border-slate-900 pb-2 mb-2 px-8 min-w-[200px]">{new Date().toLocaleDateString('bn-BD')}</p>
                    <p className="text-xs font-black text-slate-400 uppercase">DATE</p>
                 </div>
              </div>
           </div>
        </div>
      );
    }

    if (templateId === 'elite_dark') {
      return (
        <div id={`print-card-${student.id}`} className="relative w-[1123px] h-[794px] bg-slate-950 overflow-hidden font-serif p-0 flex flex-col items-center justify-center text-white border-[20px] border-slate-900">
           {/* Gold Ornaments */}
           <div className="absolute top-0 left-0 w-full h-full opacity-10 bg-[radial-gradient(#f59e0b_1px,transparent_1px)] [background-size:40px_40px]"></div>
           <div className="absolute top-10 left-10 w-40 h-40 border-t-4 border-l-4 border-amber-500/30 rounded-tl-3xl"></div>
           <div className="absolute bottom-10 right-10 w-40 h-40 border-b-4 border-r-4 border-amber-500/30 rounded-br-3xl"></div>
           
           <div className="relative z-10 text-center flex flex-col items-center w-full px-20">
              <div className="mb-12">
                 <h1 className="text-8xl font-bold text-amber-500 tracking-widest uppercase italic">CERTIFICATE</h1>
                 <div className="flex items-center justify-center gap-6 mt-4">
                    <div className="h-0.5 w-16 bg-amber-500/50"></div>
                    <p className="text-xl font-medium tracking-[0.8em] text-white/50 uppercase">PRESTIGIOUS AWARD</p>
                    <div className="h-0.5 w-16 bg-amber-500/50"></div>
                 </div>
              </div>
              
              <p className="text-2xl text-white/40 mb-8 italic">This marks preeminent recognition of</p>
              <h2 className="text-8xl font-bold text-white mb-6 underline decoration-amber-500/20 underline-offset-[20px] max-w-full truncate">{student.name}</h2>
              
              <div className="flex items-center justify-center gap-10 mb-12 text-amber-500/40 text-xs font-black uppercase tracking-[0.3em] bg-white/5 py-2 px-10 rounded-full border border-white/5">
                 <span>{settings.examName}</span>
                 <div className="h-2 w-2 bg-amber-500 rounded-full animate-pulse"></div>
                 <span>SESSION: {settings.session}</span>
                 <div className="h-2 w-2 bg-amber-500 rounded-full animate-pulse"></div>
                 <span>{settings.resultLabel}: ACHIEVED</span>
              </div>

              <p className="text-xl text-white/60 max-w-3xl leading-loose font-light mb-16 px-10 italic">
                 {settings.customCertificateText || "For your elite-tier performance and peerless contribution to our institution. Your excellence sets a new benchmark for everyone in this academic year."}
              </p>

              <div className="flex justify-between w-full px-20">
                 <div className="text-center flex flex-col items-center">
                    <div className="h-16 flex items-end mb-4">
                       {settings.signatureUrl && <img src={settings.signatureUrl} className="h-12 object-contain" />}
                    </div>
                    <div className="w-56 h-0.5 bg-amber-500/30 mb-2"></div>
                    <p className="text-xs font-black uppercase tracking-widest text-amber-500">{settings.signatoryName || "DIRECTOR"}</p>
                 </div>
                 
                 <div className="w-32 h-32 flex items-center justify-center bg-transparent border-2 border-amber-500/20 rounded-full relative">
                    <div className="absolute inset-2 border border-amber-500/10 rounded-full animate-spin-slow"></div>
                    <Award className="w-12 h-12 text-amber-500 opacity-80" />
                 </div>

                 <div className="text-center flex flex-col items-center">
                    <div className="h-16 flex items-end mb-4">
                       <p className="text-2xl font-bold font-mono text-white/30">{new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                    </div>
                    <div className="w-56 h-0.5 bg-amber-500/30 mb-2"></div>
                    <p className="text-xs font-black uppercase tracking-widest text-white/30">DATE OF ISSUE</p>
                 </div>
              </div>
           </div>
        </div>
      );
    }

    if (templateId === 'academic_blue') {
      return (
        <div id={`print-card-${student.id}`} className="relative w-[1123px] h-[794px] bg-sky-50 overflow-hidden font-serif p-10 flex flex-col items-center justify-center text-slate-900 border-[12px] border-double border-indigo-900">
           <div className="absolute top-0 right-0 w-full h-[30%] bg-indigo-900 transform -skew-y-3 origin-top-right -mt-20"></div>
           <div className="absolute bottom-0 left-0 w-full h-[15%] bg-indigo-800 transform -skew-y-2 origin-bottom-left -mb-10"></div>
           
           <div className="relative z-10 bg-white w-[90%] h-[85%] shadow-2xl flex flex-col items-center justify-center p-20 border border-slate-200">
              <School className="w-16 h-16 text-indigo-900 mb-6" />
              <h1 className="text-6xl font-bold text-indigo-950 mb-1 tracking-tight">Academic Completion</h1>
              <p className="text-xl font-bold text-indigo-600/60 uppercase tracking-[0.3em] mb-12">Official Certificate</p>
              
              <p className="text-lg text-slate-400 mb-6">In recognition of the successful completion by</p>
              <h2 className="text-7xl font-bold text-slate-900 mb-6 border-b-2 border-indigo-900/10 px-12 pb-2 max-w-full truncate">{student.name}</h2>
              
              <div className="mb-10 text-indigo-900/60 font-bold bg-indigo-50 px-6 py-2 rounded-xl border border-indigo-100/50">
                 {settings.examName} • {settings.resultLabel}: {settings.session}
              </div>

              <p className="text-lg text-slate-500 text-center leading-relaxed font-sans max-w-2xl mb-16">
                 {settings.customCertificateText || "For successfully fulfilling all academic requirements and demonstrating superior knowledge in the chosen field of study. We take pride in your achievements."}
              </p>

              <div className="flex justify-around w-full mt-4">
                 <div className="text-center">
                    <p className="text-lg font-bold text-indigo-950 mb-1">{settings.signatoryName || "Academic Dean"}</p>
                    <div className="w-48 h-px bg-slate-300 mb-2"></div>
                    <p className="text-[10px] font-black text-slate-400 uppercase">Board Chairman</p>
                 </div>
                 <div className="text-center">
                    <p className="text-lg font-bold text-indigo-950 mb-1">{new Date().toLocaleDateString('bn-BD')}</p>
                    <div className="w-48 h-px bg-slate-300 mb-2"></div>
                    <p className="text-[10px] font-black text-slate-400 uppercase">Issued Date</p>
                 </div>
              </div>
           </div>
        </div>
      );
    }

    if (templateId === 'luxury_gold') {
      return (
        <div id={`print-card-${student.id}`} className="relative w-[1123px] h-[794px] bg-white overflow-hidden font-serif p-10 flex flex-col items-center justify-center text-slate-900 border-[16px] border-slate-800">
          {/* Top/Bottom Dark Bars with Gold Accents */}
          <div className="absolute top-0 left-0 right-0 h-40 bg-slate-800">
             <div className="absolute bottom-0 left-0 right-0 h-2 bg-amber-500"></div>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-40 bg-slate-800">
             <div className="absolute top-0 left-0 right-0 h-2 bg-amber-500"></div>
             {/* Wave accents at bottom */}
             <div className="absolute bottom-0 left-0 w-1/2 h-32 bg-amber-500 opacity-20" style={{ clipPath: 'polygon(0 100%, 100% 100%, 0 0)' }}></div>
             <div className="absolute bottom-0 right-0 w-1/2 h-32 bg-amber-600 opacity-20" style={{ clipPath: 'polygon(100% 100%, 100% 0, 0 100%)' }}></div>
          </div>

          <div className="relative z-10 flex flex-col items-center text-center">
            {/* Badge */}
            <div className="absolute -top-48 right-0 w-24 h-24 bg-amber-500 rounded-full border-4 border-white shadow-xl flex flex-col items-center justify-center text-white">
              <Star className="w-6 h-6 fill-white" />
              <p className="text-[8px] font-black uppercase">Best Award</p>
            </div>

            <div className="mb-12">
               <h1 className="text-7xl font-bold tracking-widest text-slate-800 uppercase mb-2">CERTIFICATE</h1>
               <div className="flex items-center justify-center gap-4">
                  <div className="h-1 w-16 bg-amber-500"></div>
                  <p className="text-xl font-bold tracking-[0.5em] text-amber-600 uppercase">OF ACHIEVEMENT</p>
                  <div className="h-1 w-16 bg-amber-500"></div>
               </div>
            </div>
            
            <p className="text-2xl italic font-serif text-slate-500 mb-8 lowercase">This certificate is proudly presented to</p>
            <h2 className="text-6xl font-bold text-slate-900 mb-6 border-b-4 border-amber-500/30 px-16 pb-4 max-w-full truncate" style={{ fontFamily: 'serif' }}>{student.name}</h2>
            
            <div className="flex items-center justify-center gap-8 mb-10 text-slate-400 font-bold tracking-widest text-xs uppercase bg-slate-50 py-2 px-8 rounded-full border border-slate-100">
               <span>EXAM: {settings.examName}</span>
               <div className="w-1.5 h-1.5 bg-amber-500 rounded-full"></div>
               <span>{settings.resultLabel}: {settings.session}</span>
            </div>

            <div className="max-w-2xl text-center text-lg text-slate-600 leading-relaxed font-sans mb-16 italic">
              {settings.customCertificateText || "For outstanding academic excellence and remarkable performance throughout the academic year. We commend your dedication and success."}
            </div>

            {/* Signatures */}
            <div className="flex justify-between w-full gap-40 mt-10">
              <div className="text-center">
                 <div className="w-64 border-b-2 border-slate-800 mb-2"></div>
                 <p className="text-sm font-bold uppercase tracking-widest">{settings.signatoryName || 'Principal'}</p>
                 <p className="text-[10px] uppercase text-amber-600 font-bold">Principal</p>
              </div>
              <div className="text-center">
                 <div className="text-xl font-black italic mb-2 text-slate-400">{new Date().toLocaleDateString('bn-BD')}</div>
                 <div className="w-64 border-b-2 border-slate-800 mb-2"></div>
                 <p className="text-sm font-bold uppercase tracking-widest text-slate-400">Date</p>
              </div>
            </div>
          </div>
        </div>
      );
    }
    
    if (templateId === 'geometric_pro') {
      return (
        <div id={`print-card-${student.id}`} className="relative w-[1123px] h-[794px] bg-white overflow-hidden font-sans p-10 flex flex-col items-center justify-center text-slate-800 border-[20px] border-slate-100">
          {/* Geometric Shapes */}
          <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-indigo-900" style={{ clipPath: 'polygon(100% 0, 0 0, 100% 100%)' }}></div>
          <div className="absolute top-0 right-0 w-[420px] h-[420px] bg-amber-400/20" style={{ clipPath: 'polygon(100% 0, 20% 0, 100% 80%)' }}></div>
          <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-indigo-900" style={{ clipPath: 'polygon(0 100%, 0 0, 100% 100%)' }}></div>
          <div className="absolute bottom-0 left-0 w-[420px] h-[420px] bg-amber-400/20" style={{ clipPath: 'polygon(0 100%, 0 20%, 80% 100%)' }}></div>
          
          <div className="relative z-10 text-center flex flex-col items-center w-full px-20">
            <h1 className="text-8xl font-black tracking-tight mb-2 text-indigo-900">CERTIFICATE</h1>
            <h3 className="text-3xl font-bold tracking-[0.4em] uppercase mb-16 text-amber-500">OF ACHIEVEMENT</h3>
            
            <p className="text-xl text-slate-400 mb-8 font-medium">This certificate is proudly presented to</p>
            <h2 className="text-7xl font-black mb-8 capitalize text-slate-900 max-w-full truncate">{student.name}</h2>
            
            <div className="flex items-center justify-center gap-6 mb-12 text-slate-500 font-black text-[10px] uppercase tracking-[0.3em]">
               <div className="bg-slate-100 py-1 px-4 rounded">{settings.examName}</div>
               <ChevronRight className="w-4 h-4 text-amber-500" />
               <div className="bg-slate-100 py-1 px-4 rounded">{settings.resultLabel}: {settings.session}</div>
            </div>

            <div className="w-full h-px bg-slate-200 mb-12"></div>
            
            <p className="text-xl text-slate-500 leading-relaxed italic max-w-3xl mb-16">
               {settings.customCertificateText || "For continuous effort and exceptional performance shown in the program. This award acknowledges your contributions to our educational community."}
            </p>

            <div className="flex justify-between w-full mt-10">
              <div className="text-left">
                <div className="w-56 h-px bg-indigo-900 mb-2"></div>
                <p className="font-bold text-indigo-900">SIGNATURE</p>
              </div>
              
              {/* Seal */}
              <div className="w-24 h-24 bg-indigo-900 rounded-full border-4 border-amber-400 flex items-center justify-center shadow-xl">
                 <BadgeCheck className="w-12 h-12 text-amber-400" />
              </div>

              <div className="text-right">
                <div className="w-56 h-px bg-indigo-900 mb-2"></div>
                <p className="font-bold text-indigo-900">SIGNATURE</p>
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (templateId === 'appreciation_navy') {
      return (
        <div id={`print-card-${student.id}`} className="relative w-[1123px] h-[794px] bg-white overflow-hidden font-sans p-20 flex flex-col items-center border-[20px] border-indigo-950">
          <div className="absolute top-0 left-0 right-0 h-48 bg-indigo-950" style={{ clipPath: 'polygon(0 0, 100% 0, 85% 100%, 15% 100%)' }}></div>
          <div className="absolute top-4 left-1/2 -translate-x-1/2 w-32 h-32 bg-white rounded-full flex items-center justify-center border-4 border-amber-500 shadow-2xl z-20">
             <Award className="w-16 h-16 text-indigo-950" />
          </div>

          <div className="mt-32 text-center flex flex-col items-center">
             <h1 className="text-7xl font-bold text-indigo-950 tracking-tight mb-2">CERTIFICATE</h1>
             <h4 className="text-2xl font-bold tracking-[0.3em] text-amber-600 uppercase mb-20">OF APPRECIATION</h4>
             
             <p className="text-xl font-bold text-slate-400 uppercase tracking-widest mb-8">Proudly Presented To</p>
             <h2 className="text-8xl font-serif text-indigo-900 mb-8 drop-shadow-sm italic max-w-full truncate">{student.name}</h2>
             
             <div className="flex items-center justify-center gap-6 mb-12 text-amber-600 font-black text-xs tracking-widest uppercase border-y border-amber-50 py-2">
                <span>BATCH: {student.batchName}</span>
                <span className="text-indigo-200">|</span>
                <span>{settings.examName}</span>
                <span className="text-indigo-200">|</span>
                <span>{settings.resultLabel}: {settings.session}</span>
             </div>

             <p className="text-lg text-slate-600 max-w-3xl leading-loose font-medium mb-16">
               {settings.customCertificateText || "In grateful recognition of your outstanding dedication and excellence. Your commitment to growth and learning is truly commendable."}
             </p>
          </div>

          <div className="w-full flex justify-between items-end mt-12 px-20">
             <div className="text-center w-64 border-t-2 border-indigo-950 pt-3">
                <p className="text-sm font-black text-indigo-950">DATE</p>
             </div>
             <div className="text-center w-64 border-t-2 border-indigo-950 pt-3">
                <p className="text-sm font-black text-indigo-950">SIGNATURE</p>
             </div>
          </div>
          
          <div className="absolute bottom-10 left-0 right-0 flex items-center justify-center">
             <div className="h-1 w-1/3 bg-amber-500 rounded-full opacity-20"></div>
          </div>
        </div>
      );
    }

    if (templateId === 'vintage_scroll') {
      return (
        <div id={`print-card-${student.id}`} className="relative w-[1123px] h-[794px] bg-[#fdfcf0] overflow-hidden font-serif p-10 flex flex-col items-center justify-center text-slate-900">
           {/* Elaborate Border */}
           <div className="absolute inset-10 border-[12px] border-amber-800/20"></div>
           <div className="absolute inset-12 border-2 border-amber-800/40"></div>
           
           {/* Corner flourishes would normally be SVGs, using Lucide placeholders or CSS */}
           <div className="absolute top-8 left-8 w-24 h-24 border-t-4 border-l-4 border-amber-700/30 rounded-tl-full"></div>
           <div className="absolute top-8 right-8 w-24 h-24 border-t-4 border-r-4 border-amber-700/30 rounded-tr-full"></div>
           <div className="absolute bottom-8 left-8 w-24 h-24 border-b-4 border-l-4 border-amber-700/30 rounded-bl-full"></div>
           <div className="absolute bottom-8 right-8 w-24 h-24 border-b-4 border-r-4 border-amber-700/30 rounded-br-full"></div>
           
           <div className="relative z-10 text-center flex flex-col items-center w-full px-40">
              <h1 className="text-7xl text-amber-900 mb-4" style={{ fontFamily: 'Garamond, serif' }}>Certificate Of Achievement</h1>
              <div className="w-32 h-px bg-amber-800/40 mb-12"></div>
              
              <p className="text-2xl text-slate-500 mb-8 italic">PROUDLY PRESENTED TO</p>
              <h2 className="text-8xl font-bold text-slate-800 mb-12 tracking-tight max-w-full truncate" style={{ fontFamily: 'Georgia, serif' }}>{student.name}</h2>
              
              <p className="text-xl text-slate-600 max-w-4xl leading-relaxed italic border-y py-8 border-amber-800/10">
                 {settings.customCertificateText || "This document certifies that the individual named above has successfully completed all requirements of the academic program with distinction and honor."}
              </p>

              <div className="flex justify-between w-full mt-24">
                 <div className="text-center">
                    <p className="text-lg font-bold text-amber-900 border-b border-amber-800/20 pb-2 mb-2 italic">
                       {settings.examName} - {settings.resultLabel}: {settings.session}
                    </p>
                    <p className="text-lg font-bold text-amber-900 border-b border-amber-800/20 pb-2 mb-2">{settings.issueDate}</p>
                    <p className="text-xs font-black uppercase tracking-tighter">DATE & SESSION</p>
                 </div>
                 
                 <div className="w-20 h-20 border-4 border-amber-700/20 rounded-full flex items-center justify-center rotate-12">
                    <p className="text-[10px] font-black leading-tight text-amber-900 px-2 opacity-40 uppercase">CERTIFIED OFFICIAL</p>
                 </div>

                 <div className="text-center">
                    <p className="text-lg font-bold text-amber-900 border-b border-amber-800/20 pb-2 mb-2">SIGNATURE</p>
                    <p className="text-xs font-black uppercase tracking-tighter">OFFICIAL SEAL</p>
                 </div>
              </div>
           </div>
        </div>
      );
    }

    if (templateId === 'bn_royal_border') {
      return (
        <div id={`print-card-${student.id}`} className="relative w-[1123px] h-[794px] bg-[#fffaf0] overflow-hidden font-sans p-10 flex flex-col items-center justify-center text-slate-900">
           {/* ROYAL ORNATE BORDER */}
           <div className="absolute inset-0 border-[40px] border-amber-900/10"></div>
           <div className="absolute inset-8 border-[6px] border-amber-600/30"></div>
           <div className="absolute inset-12 border-2 border-amber-600/10"></div>
           
           <div className="absolute top-0 left-0 w-48 h-48 border-t-[12px] border-l-[12px] border-amber-600 z-20" style={{ clipPath: 'polygon(0 0, 100% 0, 100% 20%, 20% 20%, 20% 100%, 0 100%)' }}></div>
           <div className="absolute top-0 right-0 w-48 h-48 border-t-[12px] border-r-[12px] border-amber-600 z-20" style={{ clipPath: 'polygon(0 0, 100% 0, 100% 100%, 80% 100%, 80% 20%, 0 20%)' }}></div>
           <div className="absolute bottom-0 left-0 w-48 h-48 border-b-[12px] border-l-[12px] border-amber-600 z-20" style={{ clipPath: 'polygon(0 0, 20% 0, 20% 80%, 100% 80%, 100% 100%, 0 100%)' }}></div>
           <div className="absolute bottom-0 right-0 w-48 h-48 border-b-[12px] border-r-[12px] border-amber-600 z-20" style={{ clipPath: 'polygon(80% 0, 100% 0, 100% 100%, 0 100%, 0 80%, 80% 80%)' }}></div>
           
           <div className="relative z-10 w-full h-full p-20 flex flex-col items-center">
              <div className="mb-12 text-center">
                 <div className="flex items-center justify-center gap-10 mb-6">
                    <div className="w-1 h-20 bg-amber-600/20"></div>
                    <div>
                       <h1 className="text-6xl font-black text-amber-800 tracking-tighter italic uppercase">{instData?.name || 'NAME OF INSTITUTION'}</h1>
                       <p className="text-xl font-bold text-slate-500 uppercase tracking-[0.4em]">{instData?.address || 'DHAKA, BANGLADESH'}</p>
                    </div>
                    <div className="w-1 h-20 bg-amber-600/20"></div>
                 </div>
                 
                 <div className="relative inline-block mt-4">
                    <div className="absolute -inset-8 bg-amber-600 opacity-5 blur-2xl rounded-full"></div>
                    <h2 className="text-7xl font-black text-slate-900 uppercase relative z-10">CERTIFICATE</h2>
                    <p className="text-2xl font-bold text-amber-600 tracking-[0.6em] relative z-10">OF COMPLETION</p>
                 </div>
              </div>
              
              <div className="flex-1 text-center w-full max-w-4xl pt-10">
                 <p className="text-2xl italic font-serif text-slate-400 mb-6">This prestigious honor is conferred upon</p>
                 <h3 className="text-8xl font-black text-emerald-800 mb-10 border-b-4 border-amber-600/20 pb-4 inline-block px-20 max-w-full truncate">{student.name}</h3>
                 
                 <div className="text-xl text-slate-600 leading-relaxed font-sans mt-10">
                    {settings.customCertificateText || "For achieving outstanding academic excellence and showing unparalleled commitment to our values. This certificate recognizes your hard work, perseverance and triumphant spirit throughout the term."}
                 </div>
              </div>

              <div className="w-full flex justify-between items-end mt-16 px-10">
                 <div className="text-center">
                    <div className="w-56 h-px bg-slate-300 mb-2"></div>
                    <p className="text-sm font-black text-slate-400 uppercase tracking-widest">{new Date().toLocaleDateString('bn-BD')}</p>
                    <p className="text-[10px] font-bold text-amber-600">DATE OF ISSUE</p>
                 </div>
                 
                 <div className="w-24 h-24 border-4 border-double border-amber-600/30 rounded-full flex items-center justify-center bg-white shadow-xl">
                    <Shield className="w-12 h-12 text-amber-600" />
                 </div>

                 <div className="text-center">
                    {settings.signatureUrl && <img src={settings.signatureUrl} className="h-16 mx-auto mb-2 opacity-90" />}
                    <div className="w-56 h-px bg-slate-300 mb-2"></div>
                    <p className="text-sm font-black text-amber-800 uppercase tracking-widest">{settings.signatoryName || 'PRINCIPAL'}</p>
                    <p className="text-[10px] font-bold text-slate-400">AUTHORIZED SIGNATURE</p>
                 </div>
              </div>
           </div>
        </div>
      );
    }

    if (templateId === 'bn_floral_classic') {
       return (
        <div id={`print-card-${student.id}`} className="relative w-[1123px] h-[794px] bg-[#fffaf5] overflow-hidden font-serif p-0 flex flex-col items-center justify-center text-slate-900 border-[30px] border-emerald-900/5">
           <div className="absolute inset-4 border-[2px] border-emerald-800/20"></div>
           
           {/* Floral Ornaments at corners */}
           <div className="absolute top-4 left-4 w-60 h-60 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/floral-paper.png')]"></div>
           <div className="absolute top-4 right-4 w-60 h-60 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/floral-paper.png')] rotate-90"></div>
           <div className="absolute bottom-4 left-4 w-60 h-60 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/floral-paper.png')] -rotate-90"></div>
           <div className="absolute bottom-4 right-4 w-60 h-60 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/floral-paper.png')] rotate-180"></div>

           <div className="relative z-10 w-full h-full p-24 flex flex-col items-center">
              <div className="mb-12 text-center">
                 <h1 className="text-6xl font-bold text-emerald-950 mb-2">{instData?.name || 'প্রতিষ্ঠানের নাম'}</h1>
                 <p className="text-lg font-black text-slate-400 uppercase tracking-[0.6em]">{instData?.address || 'ঠিকানা, বাংলাদেশ'}</p>
                 <div className="w-48 h-px bg-emerald-800/20 mx-auto mt-6"></div>
              </div>
              
              <div className="mb-10 text-center">
                 <h2 className="text-6xl font-serif font-black text-emerald-900 italic tracking-tight">সনদপত্র</h2>
                 <p className="text-lg font-bold text-emerald-600 uppercase tracking-widest mt-2 border-y border-emerald-100 py-1 inline-block">গৌরবময় কৃতিত্ব</p>
              </div>

              <div className="flex-1 text-center w-full space-y-6">
                 <p className="text-xl text-slate-500 italic">অত্যন্ত আনন্দের সাথে এ সনদ প্রদান করা হচ্ছে</p>
                 <h3 className="text-7xl font-black text-slate-950 pb-2 border-b-2 border-emerald-800/10 inline-block px-16 max-w-full truncate">{student.name}</h3>
                 
                 <div className="flex items-center justify-center gap-10 text-emerald-800 font-bold bg-emerald-50/50 py-2 rounded-2xl border border-emerald-100/50 max-w-xl mx-auto px-10">
                    <span>{settings.examName}</span>
                    <Award className="w-5 h-5 text-emerald-600" />
                    <span>{settings.resultLabel}: {settings.session}</span>
                 </div>

                 <p className="text-xl text-slate-600 max-w-3xl mx-auto leading-relaxed px-10 font-sans">
                    {settings.customCertificateText || "যিনি স্বীয় মেধা ও অক্লান্ত পরিশ্রমের মাধ্যমে অত্র শিক্ষাবর্ষে গৌরবোজ্জ্বল ফলাফল অর্জন করেছেন। আমরা তার উত্তরোত্তর সাফল্য ও সমৃদ্ধি কামনা করি।"}
                 </p>
              </div>

              <div className="w-full flex justify-between items-end mt-12 px-16">
                 <div className="text-center">
                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">প্রদান কালিন তারিখ</p>
                    <p className="text-lg font-black text-emerald-950">{settings.issueDate}</p>
                 </div>
                 
                 <div className="w-32 h-32 relative flex items-center justify-center">
                    <div className="absolute inset-0 border-4 border-emerald-600/10 rounded-full border-dashed animate-spin-slow"></div>
                    <BadgeCheck className="w-16 h-16 text-emerald-600 opacity-60" />
                 </div>

                 <div className="text-center">
                    {settings.signatureUrl && <img src={settings.signatureUrl} className="h-10 object-contain mx-auto mb-2" />}
                    <div className="w-56 h-px bg-slate-200 mb-2"></div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{settings.signatoryTitle || 'প্রধান শিক্ষক'}</p>
                    <p className="text-xs font-bold text-slate-950 mt-1">{settings.signatoryName || 'অনুমোদিত স্বাক্ষর'}</p>
                 </div>
              </div>
           </div>
        </div>
       );
    }

    if (templateId === 'bn_geometrical_art') {
       return (
        <div id={`print-card-${student.id}`} className="relative w-[1123px] h-[794px] bg-[#0f172a] overflow-hidden font-sans p-12 flex flex-col items-center justify-center text-white border-[24px] border-slate-900">
           {/* MODERN DARK GEOMETRIC BORDER */}
           <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-indigo-500/10 rotate-45 transform translate-x-1/2 -translate-y-1/2"></div>
           <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-indigo-500/10 rotate-45 transform -translate-x-1/2 translate-y-1/2"></div>
           
           <div className="relative z-10 w-full h-full border border-indigo-500/20 p-20 flex flex-col items-center">
              <div className="flex w-full justify-between items-start mb-16">
                 <div>
                    <h1 className="text-2xl font-black text-indigo-400 tracking-widest uppercase">ID: CERT-2024-{student.rollNo}</h1>
                    <div className="w-16 h-1.5 bg-indigo-500 mt-2"></div>
                 </div>
                 <div className="text-right">
                    <h2 className="text-4xl font-black text-white italic uppercase tracking-tighter">{instData?.name || 'DARK MODE ACADEMY'}</h2>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-[0.4em]">{instData?.address || 'NIGHT CITY, BGD'}</p>
                 </div>
              </div>

              <div className="text-center flex-1">
                 <h3 className="text-8xl font-black text-white tracking-widest uppercase mb-4 italic" style={{ WebkitTextStroke: '1px rgba(255,255,255,0.2)' }}>CERTIFICATE</h3>
                 <p className="text-xl font-bold text-indigo-400 tracking-[1em] mb-4">OF MERIT</p>
                 
                 <div className="flex items-center justify-center gap-6 mb-12 text-indigo-300 font-bold bg-indigo-900/40 py-2 px-8 rounded-full border border-indigo-500/20">
                    <span>{settings.examName}</span>
                    <div className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse"></div>
                    <span>{settings.resultLabel}: {settings.session}</span>
                 </div>

                 <p className="text-2xl text-slate-400 mb-8">This honor is bestowed upon</p>
                 <h4 className="text-9xl font-black text-white mb-20 tracking-tighter drop-shadow-[0_0_30px_rgba(99,102,241,0.3)] max-w-full truncate">{student.name}</h4>
              </div>

              <div className="w-full flex justify-between items-end">
                 <div className="flex gap-4">
                    <div className="w-3 bg-indigo-500 h-20"></div>
                    <div>
                       <p className="text-xl font-black text-white uppercase italic">{settings.signatoryName || 'THE DIRECTOR'}</p>
                       <p className="text-sm font-bold text-slate-500 tracking-widest">AUTHENTIC SIGNATURE</p>
                       <div className="h-px w-64 bg-slate-800 mt-4"></div>
                    </div>
                 </div>
                 
                 <div className="w-32 h-32 flex items-center justify-center p-2 border-2 border-indigo-500/30 rounded-lg transform rotate-6 scale-90">
                    <QrCode className="w-20 h-20 text-indigo-500/40" />
                 </div>
              </div>
           </div>
        </div>
       );
    }

    if (templateId === 'bn_traditional_v1') {
      return (
        <div id={`print-card-${student.id}`} className="relative w-[1123px] h-[794px] bg-[#fffdf5] overflow-hidden font-serif p-0 flex flex-col items-center justify-center text-slate-900 border-[24px] border-amber-900/10">
           <div className="absolute inset-2 border-[2px] border-amber-800/40"></div>
           <div className="absolute inset-4 border-[1px] border-amber-800/20"></div>
           
           <div className="absolute top-0 left-0 w-64 h-64 border-t-[30px] border-l-[30px] border-amber-700/80 rounded-tl-3xl z-20" style={{ clipPath: 'polygon(0 0, 100% 0, 80% 10%, 10% 10%, 10% 80%, 0 100%)' }}></div>
           <div className="absolute top-0 right-0 w-64 h-64 border-t-[30px] border-r-[30px] border-amber-700/80 rounded-tr-3xl z-20" style={{ clipPath: 'polygon(0 0, 100% 0, 100% 100%, 90% 80%, 90% 10%, 0 10%)' }}></div>
           <div className="absolute bottom-0 left-0 w-64 h-64 border-b-[30px] border-l-[30px] border-amber-700/80 rounded-bl-3xl z-20" style={{ clipPath: 'polygon(0 0, 10% 20%, 10% 90%, 80% 90%, 100% 100%, 0 100%)' }}></div>
           <div className="absolute bottom-0 right-0 w-64 h-64 border-b-[30px] border-r-[30px] border-amber-700/80 rounded-br-3xl z-20" style={{ clipPath: 'polygon(90% 20%, 100% 0, 100% 100%, 0 100%, 20% 90%, 90% 90%)' }}></div>

           <div className="relative z-10 w-full h-full p-12 flex flex-col items-center border-[8px] border-double border-amber-600/30 m-2">
              <div className="mb-6 text-center w-full">
                 <h1 className="text-4xl font-black text-amber-900 mb-1 uppercase tracking-tight">{instData?.name || 'প্রতিষ্ঠানের নাম'}</h1>
                 <p className="text-lg font-bold text-slate-500 uppercase tracking-[0.3em]">{instData?.address || 'ঠিকানা, বাংলাদেশ'}</p>
                 <div className="w-1/3 h-px bg-amber-600/30 mx-auto mt-4"></div>
              </div>
              
              <div className="text-center mb-6">
                 <h2 className="text-6xl font-bold text-slate-800 tracking-widest uppercase italic">সার্টিফিকেট</h2>
                 <p className="text-lg font-black text-amber-600 tracking-[0.4em] uppercase border-y border-amber-100 py-1 inline-block">সাফল্যের স্বীকৃতি</p>
              </div>

              <div className="flex-1 text-center w-full max-w-4xl pt-2">
                 <p className="text-lg italic text-slate-400 mb-3">গর্বের সাথে প্রদান করা হচ্ছে</p>
                 <h3 className="text-6xl font-bold text-slate-900 mb-4 border-b-2 border-amber-600/40 pb-1 inline-block px-12 max-w-full truncate">{student.name}</h3>
                 
                 <div className="grid grid-cols-2 gap-6 max-w-xl mx-auto mb-6 bg-amber-50 shadow-sm p-4 rounded-2xl border border-amber-100/50">
                    <div className="text-left border-r border-amber-200 pr-6">
                       <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">রোল নম্বর</p>
                       <p className="text-lg font-black text-slate-900 whitespace-nowrap">{student.rollNo}</p>
                    </div>
                    <div className="text-left">
                       <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">ব্যাচ</p>
                       <p className="text-lg font-black text-slate-900 whitespace-nowrap">{student.batchName}</p>
                    </div>
                 </div>

                 <div className="text-base text-slate-600 leading-relaxed max-w-2xl mx-auto mb-6">
                    {settings.customCertificateText || "যিনি সফলতার সাথে তার শিক্ষাবর্ষ সম্পন্ন করেছেন এবং একাডেমিকভাবে চমৎকার ফলাফল অর্জন করেছেন।"}
                 </div>

                 <div className="bg-amber-100 py-3 px-8 rounded-full border border-amber-200 inline-flex items-center gap-4 shadow-sm">
                    <span className="text-xs font-black text-amber-800 uppercase tracking-widest">{settings.examName}</span>
                    <div className="h-3 w-px bg-amber-400"></div>
                    <span className="text-xs font-black text-slate-600 uppercase tracking-widest">{settings.resultLabel}: {settings.session}</span>
                 </div>
              </div>

              <div className="w-full flex justify-between items-end mt-12 px-10">
                 <div className="text-center">
                    <div className="w-48 h-px bg-slate-300 mb-2"></div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">প্রদানের তারিখ</p>
                    <p className="text-xs font-bold text-slate-900 mt-1">{settings.issueDate}</p>
                 </div>
                 
                 <div className="w-28 h-28 relative flex items-center justify-center">
                    <div className="absolute inset-0 border-4 border-amber-600/20 rounded-full rotate-45 border-dashed"></div>
                    <div className="absolute inset-2 border-2 border-amber-600/40 rounded-full"></div>
                    <Award className="w-12 h-12 text-amber-600 opacity-60" />
                 </div>

                 <div className="text-center">
                    {settings.signatureUrl && <img src={settings.signatureUrl} className="h-10 object-contain mx-auto mb-2" />}
                    <div className="w-48 h-px bg-slate-300 mb-2"></div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{settings.signatoryTitle || 'অধ্যাপক / পরিচালক'}</p>
                    <p className="text-xs font-bold text-slate-900 mt-1">{settings.signatoryName}</p>
                 </div>
              </div>
           </div>
        </div>
      );
    }

    if (templateId === 'bn_traditional_v2') {
      return (
        <div id={`print-card-${student.id}`} className="relative w-[1123px] h-[794px] bg-white overflow-hidden font-serif p-10 flex flex-col items-center justify-center text-slate-900 border-[2px] border-emerald-800/10">
           <div className="absolute inset-4 border-[1px] border-emerald-800/20 m-4"></div>
           
           {[0, 100].map(x => [0, 100].map(y => (
              <div key={`${x}-${y}`} className="absolute w-48 h-48 opacity-10 bg-[radial-gradient(circle_at_center,emerald-600_1px,transparent_1px)] [background-size:20px_20px]" style={{ left: `${x}%`, top: `${y}%`, transform: `translate(-${x}%, -${y}%)` }}></div>
           )))}

           <div className="relative z-10 w-full h-full p-20 flex flex-col items-center border-[20px] border-emerald-900/5 bg-white/80 backdrop-blur-sm shadow-inner">
              <div className="text-center mb-10">
                 <h1 className="text-6xl font-bold text-emerald-900 drop-shadow-sm mb-2">{instData?.name || 'প্রতিষ্ঠানের নাম'}</h1>
                 <p className="text-lg font-black text-slate-400 uppercase tracking-[0.5em]">{instData?.address || 'ঢাকা, বাংলাদেশ'}</p>
              </div>

              <div className="mb-14 text-center">
                 <div className="flex items-center justify-center gap-6 mb-4">
                    <div className="h-px w-24 bg-emerald-600/30"></div>
                    <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center border border-emerald-200">
                       <Award className="w-6 h-6 text-emerald-700" />
                    </div>
                    <div className="h-px w-24 bg-emerald-600/30"></div>
                 </div>
                 <h2 className="text-7xl font-serif font-black text-slate-800 italic uppercase">সনদপত্র</h2>
                 <p className="text-xl font-bold text-emerald-600 uppercase tracking-[0.4em]">প্রতিভার স্বীকৃতি</p>
              </div>

              <div className="flex-1 text-center w-full space-y-8">
                 <p className="text-2xl text-slate-500 font-medium">এই মর্মে প্রত্যায়ন করা যাচ্ছে যে,</p>
                 <h3 className="text-8xl font-black text-slate-900 underline underline-offset-[16px] decoration-emerald-800/20 max-w-full truncate">{student.name}</h3>
                 
                 <div className="text-2xl text-slate-600 max-w-4xl mx-auto leading-relaxed italic border-x-4 border-emerald-800/10 px-10 py-4 mb-10">
                    {settings.customCertificateText || "যিনি অত্র প্রতিষ্ঠানের বার্ষিক পরীক্ষা ২০২৪-এ কৃতিত্বের সাথে উত্তীর্ণ হয়ে মেধা তালিকায় নিজের স্থান সুনিশ্চিত করেছেন।"}
                 </div>

                 <div className="flex justify-center gap-16 pt-6">
                    <div className="text-center bg-white shadow-sm border border-emerald-100 p-6 rounded-3xl min-w-[240px]">
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">পরীক্ষার নাম</p>
                       <p className="text-lg font-black text-emerald-900">{settings.examName}</p>
                    </div>
                    <div className="text-center bg-white shadow-sm border border-emerald-100 p-6 rounded-3xl min-w-[240px]">
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{settings.resultLabel} / সেশন</p>
                       <p className="text-lg font-black text-emerald-900">{settings.session}</p>
                    </div>
                 </div>
              </div>

              <div className="w-full flex justify-between items-end mt-16 px-16">
                 <div className="text-center">
                    <div className="w-56 h-px bg-slate-200 mb-2"></div>
                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest">তারিখ: {settings.issueDate}</p>
                 </div>
                 <div className="text-center">
                    {settings.signatureUrl && <img src={settings.signatureUrl} className="h-10 object-contain mx-auto mb-2" />}
                    <div className="w-56 h-px bg-slate-200 mb-2"></div>
                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest">{settings.signatoryTitle || 'প্রধান শিক্ষক / পরিচালক'}</p>
                    <p className="text-sm font-bold text-slate-900 whitespace-nowrap">{settings.signatoryName}</p>
                 </div>
              </div>
           </div>
        </div>
      );
    }

    if (templateId === 'bn_traditional_v3') {
      return (
        <div id={`print-card-${student.id}`} className="relative w-[1123px] h-[794px] bg-[#f9f9f9] overflow-hidden font-sans p-0 flex flex-col items-center justify-center text-slate-900 border-[30px] border-indigo-900">
           <div className="absolute inset-2 border-[4px] border-amber-400"></div>
           <div className="absolute inset-6 border-[1px] border-amber-400/30"></div>
           
           <div className="absolute top-0 left-10 w-2 h-full bg-amber-400/20"></div>
           <div className="absolute top-0 right-10 w-2 h-full bg-amber-400/20"></div>

           <div className="relative z-10 w-full h-full p-24 flex flex-col items-center bg-white m-8 shadow-inner overflow-hidden">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.03]">
                 <School className="w-[600px] h-[600px] text-indigo-900" />
              </div>

              <div className="relative z-20 flex flex-col items-center w-full">
                 <div className="mb-10 text-center">
                    <h1 className="text-6xl font-black text-indigo-950 uppercase tracking-tighter mb-1">{instData?.name || 'প্রতিষ্ঠানের নাম'}</h1>
                    <p className="text-sm font-bold text-indigo-500 uppercase tracking-[0.6em] border-y border-indigo-100 py-1">{instData?.address || 'ঠিকানা, বাংলাদেশ'}</p>
                 </div>
                 
                 <div className="mb-12 flex flex-col items-center">
                    <div className="w-24 h-24 bg-amber-400 rounded-2xl rotate-45 flex items-center justify-center shadow-xl mb-4 p-2">
                       <div className="w-full h-full bg-indigo-950 rounded-lg flex items-center justify-center -rotate-45">
                          <Award className="w-10 h-10 text-amber-400" />
                       </div>
                    </div>
                    <h2 className="text-7xl font-black text-indigo-950 uppercase tracking-tight">CERTIFICATE</h2>
                    <p className="text-xl font-bold text-indigo-500 uppercase tracking-[0.4em] leading-none">সাফল্যের স্বীকৃতি পত্র</p>
                 </div>

                 <div className="flex-1 text-center w-full space-y-6">
                    <p className="text-xl font-medium text-slate-400 uppercase tracking-widest">দয়া করে গ্রহণ করুন</p>
                    <h3 className="text-8xl font-black text-indigo-900 mb-8 border-b-[8px] border-amber-400/20 pb-4 inline-block px-24">{student.name}</h3>
                    
                    <p className="text-2xl text-slate-600 max-w-4xl mx-auto leading-relaxed px-10 mb-10">
                       {settings.customCertificateText || "তার অসামান্য মেধা এবং কঠোর পরিশ্রমের স্বীকৃতিস্বরূপ এই সনদপত্র প্রদান করা হলো। আপনার ভবিষ্যৎ উত্তরোত্তর উজ্জ্বল হোক।"}
                    </p>

                    <div className="mt-10 flex items-center justify-center gap-20">
                       <div className="text-left bg-indigo-50 p-4 rounded-2xl min-w-[200px] border border-indigo-100">
                          <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1 font-mono">পরীক্ষা / সেশন</p>
                          <p className="text-2xl font-black text-indigo-950">{settings.examName}</p>
                       </div>
                       <div className="h-16 w-px bg-slate-100"></div>
                       <div className="text-left bg-amber-50 p-4 rounded-2xl min-w-[200px] border border-amber-100">
                          <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest mb-1 font-mono">{settings.resultLabel}</p>
                          <p className="text-2xl font-black text-indigo-950">{settings.session}</p>
                       </div>
                    </div>
                 </div>

                 <div className="w-full flex justify-between items-end mt-20 px-10">
                    <div className="text-center">
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">ইস্যু করার তারিখ</p>
                       <p className="text-lg font-black text-indigo-900 border-b-2 border-indigo-50 pb-1">{settings.issueDate}</p>
                    </div>
                    
                    <div className="text-center">
                       {settings.signatureUrl && <img src={settings.signatureUrl} className="h-12 object-contain mx-auto mb-2" />}
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">{settings.signatoryTitle || 'অধ্যাপক / পরিচালক'}</p>
                       <p className="text-lg font-black text-indigo-900 border-b-2 border-indigo-50 pb-1 whitespace-nowrap">{settings.signatoryName || 'অনুমোদিত স্বাক্ষর'}</p>
                    </div>
                 </div>
              </div>
           </div>
        </div>
      );
    }
    
    return <div className="p-10 bg-red-100 text-red-600 font-bold rounded-xl border-4 border-red-200">সার্টিফিকেট টেমপ্লেট পাওয়া যায়নি ({templateId})</div>;
  };

  const renderAdmitCard = (student: Student) => {
    const primary = settings.primaryColor || '#0f172a';
    const secondary = settings.secondaryColor || '#f59e0b';

    return (
      <div id={`print-card-${student.id}`} className="w-[800px] h-[550px] bg-white border-2 p-8 font-sans relative overflow-hidden flex flex-col" style={{ borderColor: primary }}>
        {/* Border Design */}
        <div className="absolute inset-2 border pointer-events-none opacity-20" style={{ borderColor: primary }}></div>
        
        {/* Header */}
        <div className="flex items-center gap-6 mb-8 border-b-4 pb-6" style={{ borderBottomColor: primary }}>
           <div className="w-24 h-24 bg-slate-50 border border-slate-200 flex items-center justify-center p-2">
              {instData?.logoUrl ? <img src={instData.logoUrl} className="max-w-full max-h-full" /> : <IdCard className="text-slate-300 w-12 h-12" />}
           </div>
           <div className="flex-1">
              <h1 className="text-3xl font-black uppercase tracking-tighter truncate max-w-[500px]" style={{ color: primary }}>{instData?.name || 'INSTITUTION NAME'}</h1>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">{instData?.address || 'ADDRESS LOCATION'}</p>
              <div className="inline-block text-white px-4 py-1 mt-2 text-sm font-black tracking-[0.2em] transform -skew-x-12 uppercase" style={{ background: primary }}>
                 ADMIT CARD : {settings.examName || `EXAMINATION ${new Date().getFullYear()}`}
              </div>
           </div>
           <div className="w-32 h-40 bg-slate-50 border-2 border-slate-200 flex items-center justify-center">
              {student.photoURL ? (
                <img src={student.photoURL} className="w-full h-full object-cover" />
              ) : (
                <div className="text-center text-slate-300">
                   <User className="w-10 h-10 mx-auto mb-1" />
                   <p className="text-[8px] font-bold uppercase">AFFIX PHOTO</p>
                </div>
              )}
           </div>
        </div>

        {/* Content */}
        <div className="flex-1 grid grid-cols-2 gap-x-12 gap-y-6 px-4">
           {[
             { label: 'Student Name', value: student.name },
             { label: 'Roll Number', value: student.rollNo },
             { label: 'Batch/Class', value: student.batchName },
             { label: 'Guardian Phone', value: student.guardianPhone },
             { label: 'Gender', value: student.gender || 'N/A' },
             { label: 'Blood Group', value: student.bloodGroup || 'N/A' },
           ].map((item, idx) => (
             <div key={idx} className="flex flex-col border-b border-slate-100 pb-1">
               <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">{item.label}</span>
               <span className="text-sm font-black text-slate-800 uppercase truncate">{item.value}</span>
             </div>
           ))}
        </div>

        {/* Instructions */}
        <div className="mt-6 bg-slate-50 p-4 rounded-xl border border-slate-100">
           <h4 className="text-[10px] font-black text-slate-900 uppercase tracking-widest mb-2 flex items-center gap-2">
              <ClipboardCheck className="w-3 h-3" style={{ color: primary }} /> Instructions for Candidate
           </h4>
           <div className="grid grid-cols-2 gap-2 text-[8px] font-bold text-slate-500 uppercase leading-tight">
              <p>• Must carry this card to enter examination hall</p>
              <p>• Arrive 30 minutes before commencement</p>
              <p>• No electronic devices or loose papers allowed</p>
              <p>• Misconduct will lead to instant disqualification</p>
           </div>
        </div>

        {/* Signatures */}
        <div className="mt-8 flex justify-between items-end border-t border-slate-200 pt-4">
           <div className="text-center">
              <div className="w-32 h-px mb-1" style={{ background: primary }}></div>
              <p className="text-[9px] font-black text-slate-900 uppercase">Student's Sign</p>
           </div>
           <div className="text-center">
              {settings.signatureUrl && <img src={settings.signatureUrl} className="h-6 mx-auto mb-1" />}
              <div className="w-32 h-px mb-1" style={{ background: primary }}></div>
              <p className="text-[9px] font-black text-slate-900 uppercase">Controller of Exams</p>
           </div>
        </div>
      </div>
    );
  };

  // Testimonial Renderer
  const renderTestimonial = (student: Student) => {
    const primary = settings.primaryColor || '#4f46e5';
    const secondary = settings.secondaryColor || '#f59e0b';
    const templateId = settings.testimonialTemplate;

    const bn_text = {
      serial: 'ক্রমিক নং-',
      date: 'তারিখঃ',
      certify: 'এই মর্মে প্রশংসাপত্র প্রদান করা যাচ্ছে যে,',
      name: 'নামঃ',
      father: 'পিতাঃ',
      mother: 'মাতাঃ',
      village: 'গ্রামঃ',
      post: 'ডাকঘরঃ',
      upazila: 'উপজেলা/থানাঃ',
      district: 'জেলাঃ',
      session: 'সেশন/বর্ষঃ',
      conduct: 'আমার জানামতে সে এ প্রতিষ্ঠানে অধ্যয়নকালে রাষ্ট্র ও সমাজ বিরোধী কোন কার্যকলাপে অংশ গ্রহণ করেনি। সে উত্তম চরিত্রের অধিকারী।',
      wishes: 'আমি তাহার সার্বিক মঙ্গল কামনা করি।',
      teacher: 'শ্রেণি শিক্ষকের স্বাক্ষর',
      principal: 'প্রধান শিক্ষক',
      address: 'স্থাপিত : ২০১৩ ইং'
    };

    if (templateId === 'bn_traditional_gold') {
      return (
        <div id={`print-card-${student.id}`} className="w-[1123px] h-[794px] bg-[#fdfcf5] p-6 relative font-sans text-slate-800 overflow-hidden shadow-2xl flex flex-col items-center">
           {/* Intricate Border - Simulated with SVG pattern */}
           <div className="absolute inset-4 border-[16px] border-double border-amber-600/30"></div>
           <div className="absolute inset-8 border-2 border-amber-600/20"></div>
           <div className="absolute top-0 left-0 w-48 h-48 bg-[radial-gradient(circle_at_20%_20%,#b45309_1px,transparent_1px)] bg-[length:10px_10px] opacity-10"></div>
           
           <div className="relative z-10 w-full h-full border border-amber-600/10 p-12 flex flex-col">
              <div className="flex justify-between items-start mb-6">
                 <div className="w-24 h-24 border-2 border-amber-600 rounded-full p-1 flex items-center justify-center bg-white shadow-inner">
                    {instData?.logoUrl ? <img src={instData.logoUrl} className="w-full h-full object-contain" /> : <School className="w-12 h-12 text-amber-600" />}
                 </div>
                 <div className="flex-1 text-center px-10">
                    <p className="text-sm font-bold text-amber-700 tracking-widest uppercase mb-1">গণপ্রজাতন্ত্রী বাংলাদেশ সরকার</p>
                    <h1 className="text-5xl font-black text-green-700 leading-tight mb-1">{instData?.name || 'জহুরা জালাল কিন্ডারগার্টেন স্কুল'}</h1>
                    <p className="text-xl font-bold text-slate-600 mb-2">{instData?.address || 'দুর্গাপুর, নেত্রকোণা'}</p>
                    <div className="inline-block bg-amber-600 text-white px-10 py-2 rounded-full text-2xl font-black tracking-widest shadow-lg">
                       প্রশংসাপত্র
                    </div>
                 </div>
                 <div className="text-right">
                    <BadgeCheck className="w-16 h-16 text-amber-600/30" />
                 </div>
              </div>

              <div className="flex justify-between text-lg font-bold text-slate-900 mb-10 border-b border-amber-100 pb-2">
                 <span>{bn_text.serial} .............................</span>
                 <span>{bn_text.date} .............................</span>
              </div>

              <div className="flex-1 text-2xl leading-[2.5] text-slate-800 text-justify space-y-6">
                 <p className="indent-12">
                    {bn_text.certify} <span className="font-black border-b-2 border-dotted border-slate-400 px-4 min-w-[200px] inline-block text-center">{student.name}</span>,
                    {bn_text.father} <span className="border-b-2 border-dotted border-slate-400 px-4 min-w-[200px] inline-block">...............................</span>,
                    {bn_text.mother} <span className="border-b-2 border-dotted border-slate-400 px-4 min-w-[200px] inline-block">...............................</span>।
                 </p>
                 <p>
                    সে <span className="font-black border-b-2 border-dotted border-slate-400 px-4 min-w-[100px] inline-block text-center">{student.batchName}</span> এর নিয়মিত শিক্ষার্থী ছিল। বিগত <span className="border-b-2 border-dotted border-slate-400 px-4 min-w-[100px] inline-block">................</span> সালের সমাপনী পরীক্ষায় অংশ গ্রহণ করে জিপিএ <span className="border-b-2 border-dotted border-slate-400 px-4 min-w-[80px] inline-block">................</span> পেয়ে উত্তীর্ণ হয়েছে। তাহার বোর্ড পরীক্ষার রেজিনং <span className="border-b-2 border-dotted border-slate-400 px-4 min-w-[150px] inline-block">................</span> এবং সেশন <span className="border-b-2 border-dotted border-slate-400 px-4 min-w-[120px] inline-block">................</span>।
                 </p>
                 <p>
                    {bn_text.conduct}
                 </p>
                 <p className="font-black text-amber-700 italic">
                    {bn_text.wishes}
                 </p>
              </div>

              <div className="mt-auto flex justify-between items-end pt-10 border-t-2 border-amber-50 md:px-10">
                 <div className="text-center">
                    <div className="w-48 h-px bg-slate-300 mb-1"></div>
                    <p className="text-lg font-black text-slate-400">{bn_text.teacher}</p>
                 </div>
                 <div className="text-center relative">
                    {settings.signatureUrl && <img src={settings.signatureUrl} className="h-12 mx-auto absolute -top-12 left-1/2 -translate-x-1/2" />}
                    <div className="w-48 h-px bg-slate-300 mb-1"></div>
                    <p className="text-lg font-black text-amber-700">{bn_text.principal}</p>
                 </div>
              </div>
           </div>
        </div>
      );
    }

    if (templateId === 'bn_classic_blue') {
      return (
        <div id={`print-card-${student.id}`} className="w-[1123px] h-[794px] bg-white p-4 relative font-sans text-slate-800 overflow-hidden shadow-2xl flex flex-col items-center">
           {/* Banknote style border */}
           <div className="absolute inset-0 border-[24px] border-indigo-900 shadow-inner"></div>
           <div className="absolute inset-4 border-[2px] border-white/40"></div>
           <div className="absolute top-0 left-0 w-24 h-24 border-t-[8px] border-l-[8px] border-amber-400 z-20"></div>
           <div className="absolute top-0 right-0 w-24 h-24 border-t-[8px] border-r-[8px] border-amber-400 z-20"></div>
           <div className="absolute bottom-0 left-0 w-24 h-24 border-b-[8px] border-l-[8px] border-amber-400 z-20"></div>
           <div className="absolute bottom-0 right-0 w-24 h-24 border-b-[8px] border-r-[8px] border-amber-400 z-20"></div>
           
           <div className="relative z-10 w-full h-full bg-white/95 backdrop-blur-sm border-[4px] border-double border-indigo-100 p-16 flex flex-col">
              <div className="text-center mb-10">
                 <p className="text-lg font-bold text-indigo-700 tracking-[0.4em] uppercase mb-1">OFFICIAL TESTIMONIAL</p>
                 <h1 className="text-6xl font-black text-indigo-950 mb-2 leading-none uppercase tracking-tighter">{instData?.name || 'NEXUS ACADEMY'}</h1>
                 <p className="text-lg font-black text-slate-400 uppercase tracking-widest">{instData?.address || 'DHAKA, BANGLADESH'}</p>
                 
                 <div className="mt-8 flex items-center justify-center">
                    <div className="h-[2px] w-32 bg-indigo-900/20"></div>
                    <div className="mx-8 px-12 py-3 bg-indigo-900 text-white rounded-lg text-4xl font-black tracking-[0.2em] shadow-xl rotate-[-1deg]">
                       প্রশংসাপত্র
                    </div>
                    <div className="h-[2px] w-32 bg-indigo-900/20"></div>
                 </div>
              </div>

              <div className="flex-1 text-2xl leading-[2.6] text-slate-900 text-justify px-20 relative">
                 <div className="absolute inset-0 flex items-center justify-center opacity-5 pointer-events-none">
                    <Award className="w-[400px] h-[400px] text-indigo-900" />
                 </div>
                 <p className="indent-20">
                    {bn_text.certify} <span className="font-black text-indigo-950 border-b-2 border-indigo-200 px-6">{student.name}</span>,
                    পিতা- <span className="font-bold">.........................................</span>,
                    মাতা- <span className="font-bold">.........................................</span>।
                 </p>
                 <p>
                    সে এই শিক্ষা প্রতিষ্ঠান হতে বিগত <span className="font-black">................</span> সালে <span className="font-black text-indigo-600">{student.batchName}</span> এর একজন মেধাবী শিক্ষার্থী ছিল। তাহার চরিত্র অত্যন্ত মাধুর্যপূর্ণ এবং সে সদালাপী। তাহার বোর্ড পরীক্ষার রেজিনং <span className="font-bold">................</span> এবং সেশন <span className="font-bold">................</span>।
                 </p>
                 <p>
                    পরিশেষে আমি তাহার উজ্জ্বল ভবিষ্যৎ ও উত্তরোত্তর সমৃদ্ধি কামনা করি।
                 </p>
              </div>

              <div className="mt-12 flex justify-between items-end px-20">
                 <div className="text-center">
                    <div className="w-64 h-px bg-slate-200 mb-2"></div>
                    <p className="text-lg font-black text-slate-300 uppercase italic">Verification Seal</p>
                 </div>
                 <div className="text-center">
                    {settings.signatureUrl && <img src={settings.signatureUrl} className="h-16 mx-auto mb-2 drop-shadow-md" />}
                    <div className="w-64 h-[3px] bg-indigo-900 mb-2"></div>
                    <p className="text-xl font-black text-indigo-950 uppercase">{bn_text.principal}</p>
                 </div>
              </div>
           </div>
        </div>
      );
    }

    if (templateId === 'bn_ornate_floral') {
       return (
        <div id={`print-card-${student.id}`} className="w-[1123px] h-[794px] bg-[#fffcf0] p-10 relative font-sans text-slate-800 overflow-hidden shadow-2xl flex flex-col items-center">
           {/* Floral Border - Using multiple relative divs to create decorative corners */}
           <div className="absolute inset-0 border-[32px] border-emerald-900/10 scale-95 opacity-50"></div>
           <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-700/5 rounded-full blur-3xl -mr-32 -mt-32"></div>
           <div className="absolute bottom-0 left-0 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl -ml-32 -mb-32"></div>
           
           <div className="relative z-10 w-full h-full border-[10px] border-double border-emerald-900/20 p-16 flex flex-col rounded-[2rem] bg-white/50 backdrop-blur-sm">
              <div className="flex justify-between items-start mb-12">
                 <div className="text-left w-64">
                    <p className="text-sm font-black text-emerald-800 uppercase tracking-widest border-l-4 border-emerald-600 pl-4">{bn_text.serial} 00{student.rollNo}</p>
                    <p className="text-xs font-bold text-slate-400 mt-1 pl-5">Valid Document ID</p>
                 </div>
                 
                 <div className="flex-1 text-center">
                    <div className="inline-flex items-center gap-4 mb-4">
                       <div className="w-16 h-px bg-emerald-200"></div>
                       <Award className="w-10 h-10 text-emerald-600" />
                       <div className="w-16 h-px bg-emerald-200"></div>
                    </div>
                    <h1 className="text-5xl font-black text-emerald-900 tracking-tighter mb-1 leading-none italic uppercase">{instData?.name || 'AL-HIKMAH ACADEMY'}</h1>
                    <p className="text-lg font-black text-emerald-600/60 tracking-[0.3em] uppercase">{instData?.address || 'MAIN ROAD, DHAKA'}</p>
                 </div>

                 <div className="text-right w-64">
                    <p className="text-sm font-black text-emerald-800 uppercase tracking-widest border-r-4 border-emerald-600 pr-4">{bn_text.date} {new Date().toLocaleDateString('bn-BD')}</p>
                 </div>
              </div>

              <div className="text-center mb-16">
                 <div className="relative inline-block">
                    <div className="absolute -inset-10 bg-emerald-600/5 rounded-full blur-2xl"></div>
                    <h2 className="text-7xl font-black text-slate-900 relative z-10 tracking-widest underline decoration-emerald-100 underline-offset-[20px]">প্রশংসাপত্র</h2>
                 </div>
              </div>

              <div className="flex-1 text-3xl leading-[2.2] text-slate-800 text-justify px-10">
                 <p className="indent-24">
                    এই মর্মে অত্যন্ত আনন্দের সাথে প্রশংসাপত্র প্রদান করা যাচ্ছে যে, <span className="font-black text-emerald-900 underline decoration-amber-500/20 decoration-4 shadow-sm px-4">{student.name}</span>,
                    পিতা- <span className="font-bold italic">......................................</span>,
                    মাতা- <span className="font-bold italic">......................................</span>। 
                 </p>
                 <p className="mt-8">
                    সে একজন চরিত্রবান ও নিষ্ঠাবান শিক্ষার্থী। আমি তাহার সকল প্রকার সফলতা কামনা করি এবং আশা করি সে জাতির উন্নয়নে ভূমিকা পালন করিবে।
                 </p>
              </div>

              <div className="mt-auto flex justify-between items-end pb-4">
                 <div className="text-center group">
                    <p className="text-xl font-black text-emerald-900 mb-8 underline decoration-double decoration-indigo-100">{bn_text.teacher}</p>
                    <div className="w-56 h-px bg-emerald-100 mb-1 group-hover:w-full transition-all"></div>
                 </div>
                 
                 <div className="w-32 h-32 flex items-center justify-center p-2 border-4 border-double border-emerald-900/10 rounded-full relative overflow-hidden">
                    <div className="absolute inset-0 bg-emerald-900/5 rotate-45 transform scale-150"></div>
                    <BadgeCheck className="w-16 h-16 text-emerald-600 opacity-20" />
                 </div>

                 <div className="text-center group">
                    {settings.signatureUrl && <img src={settings.signatureUrl} className="h-16 mx-auto mb-2 opacity-80" />}
                    <p className="text-xl font-black text-emerald-900 mb-1">{bn_text.principal}</p>
                    <div className="w-56 h-2 bg-emerald-900 rounded-full mb-1"></div>
                 </div>
              </div>
           </div>
        </div>
       );
    }
    
    return (
      <div id={`print-card-${student.id}`} className="w-[1123px] h-[794px] bg-white p-20 font-serif border-[12px] flex flex-col justify-between items-center text-slate-800" style={{ borderColor: primary }}>
        {/* Artistic Corner Ornaments */}
        <div className="absolute top-4 left-4 w-12 h-12 border-t-4 border-l-4 opacity-30" style={{ borderColor: primary }}></div>
        <div className="absolute top-4 right-4 w-12 h-12 border-t-4 border-r-4 opacity-30" style={{ borderColor: primary }}></div>
        <div className="absolute bottom-4 left-4 w-12 h-12 border-b-4 border-l-4 opacity-30" style={{ borderColor: primary }}></div>
        <div className="absolute bottom-4 right-4 w-12 h-12 border-b-4 border-r-4 opacity-30" style={{ borderColor: primary }}></div>

        <div className="text-center w-full relative z-10">
          <div className="flex items-center justify-center gap-6 mb-8">
             <div className="w-20 h-20 bg-slate-50 border p-2 rounded-xl" style={{ borderColor: `${primary}20` }}>
                {instData?.logoUrl ? <img src={instData.logoUrl} className="w-full h-full object-contain" /> : <School className="w-12 h-12 opacity-10" />}
             </div>
             <div>
                <h1 className="text-4xl font-black mb-1 uppercase tracking-tighter" style={{ color: primary }}>{instData?.name || 'প্রতিষ্ঠানের নাম'}</h1>
                <p className="text-sm font-bold uppercase tracking-[0.3em] opacity-60">{instData?.address || 'ঠিকানা, শহর, দেশ'}</p>
             </div>
          </div>
          <h2 className="text-5xl font-black italic underline underline-offset-8 mt-12 mb-16" style={{ textDecorationColor: `${secondary}40`, color: primary }}>প্রশংসাপত্র</h2>
        </div>

        <div className="text-2xl leading-loose text-justify w-full px-12 relative z-10">
          <p>
            এই মর্মে প্রত্যয়ন করা যাচ্ছে যে, <span className="font-black" style={{ color: primary }}>{student.name}</span>, 
            রোল নম্বর- <span className="font-bold underline" style={{ textDecorationColor: secondary }}>{student.rollNo}</span>, এই প্রতিষ্ঠানের 
            <span className="font-bold"> {student.batchName}</span> এর একজন নিয়মিত শিক্ষার্থী ছিল। আমাদের প্রশাসনিক রেকর্ড অনুযায়ী, সে একজন চরিত্রবান ও নিষ্ঠাবান শিক্ষার্থী। 
          </p>
          <p className="mt-8">
            আমি তাহার উজ্জ্বল ভবিষ্যৎ ও সর্বাঙ্গীন সফলতা কামনা করি।
          </p>
        </div>

        <div className="w-full flex justify-between items-end mt-20 px-12 relative z-10">
           <div className="text-center">
             <p className="font-bold text-slate-500 border-t-2 pt-2 px-8" style={{ borderTopColor: `${primary}20` }}>তারিখ: {new Date().toLocaleDateString('bn-BD')}</p>
           </div>
           <div className="text-center">
             {settings.signatureUrl && <img src={settings.signatureUrl} className="h-10 mx-auto mb-2" />}
             <p className="font-black border-t-2 pt-2 px-8 uppercase" style={{ borderTopColor: primary, color: primary }}>{settings.signatoryTitle || 'প্রধান শিক্ষক'}</p>
             <p className="text-[10px] font-bold text-slate-400 -mt-1">{settings.signatoryName}</p>
           </div>
        </div>
      </div>
    );
  };

  // ID Card Renderer (Standard size 54x86mm)
  const renderIDCard = (student: Student) => {
    const primary = settings.primaryColor || '#4f46e5';
    const secondary = settings.secondaryColor || '#f59e0b';
    const templateId = settings.idCardTemplate;

    const renderBackSide = () => {
      return (
        <div id={`print-card-back-${student.id}`} className="w-[325px] h-[516px] bg-white rounded-2xl overflow-hidden shadow-2xl relative font-sans border border-slate-200 mx-auto flex flex-col p-6">
            <div className="flex-1 flex flex-col">
              <div className="flex items-center gap-3 mb-6">
                 {instData?.logoUrl && <img src={instData.logoUrl} className="w-8 h-8 object-contain" />}
                 <div>
                    <h4 className="text-[10px] font-black tracking-tight leading-tight uppercase leading-none">{instData?.name || 'প্রতিষ্ঠানের নাম'}</h4>
                    <p className="text-[6px] font-bold text-slate-400 uppercase tracking-widest">{instData?.address?.substring(0, 30) || 'অফিসিয়াল পরিচয়পত্র'}</p>
                 </div>
              </div>

              <div className="mb-6">
                 <h5 className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-2 border-b-2 border-indigo-50 pb-1">নির্দেশনাবলী ও শর্তাবলী</h5>
                 <div className="space-y-1.5">
                    {settings.cardInstructions.split('\n').map((line, idx) => (
                       <p key={idx} className="text-[8px] font-medium text-slate-500 leading-tight flex gap-2">
                          <span className="shrink-0">{idx + 1}.</span>
                          <span>{line}</span>
                       </p>
                    ))}
                 </div>
              </div>

              <div className="flex justify-between items-center mt-auto">
                 <div className="w-20 h-20 bg-slate-50 rounded-lg flex items-center justify-center p-1 border border-slate-100">
                    <QrCode className="w-12 h-12 text-slate-800" />
                 </div>
                 <div className="text-right">
                    <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest mb-1 leading-none">জরুরী যোগাযোগ</p>
                    <p className="text-[10px] font-black text-slate-900 leading-none">{instData?.phone || '০১৭XXXXXXXX'}</p>
                 </div>
              </div>
           </div>

           <div className="mt-8 pt-4 border-t border-slate-100 flex justify-between items-end">
              <div className="text-center">
                 <div className="w-20 h-px bg-slate-200 mb-1"></div>
                 <p className="text-[7px] font-black text-slate-400 uppercase tracking-tighter">শিক্ষার্থীর স্বাক্ষর</p>
              </div>
              <div className="text-center">
                 {settings.signatureUrl && <img src={settings.signatureUrl} className="h-6 mx-auto mb-1 object-contain" />}
                 <div className="w-20 h-px bg-slate-200 mb-1"></div>
                 <p className="text-[7px] font-black text-slate-400 uppercase tracking-tighter">কর্তৃপক্ষের স্বাক্ষর</p>
              </div>
           </div>
           <div className="absolute bottom-0 left-0 right-0 h-1" style={{ background: primary }}></div>
        </div>
      );
    };

    if (showBackSide) {
      return renderBackSide();
    }

    if (templateId === 'vibrant_waves') {
       return (
        <div id={`print-card-${student.id}`} className="w-[325px] h-[516px] bg-sky-50 rounded-2xl overflow-hidden shadow-2xl relative font-sans border border-white mx-auto flex flex-col">
           {/* Top Wave Section */}
           <div className="h-44 relative bg-slate-900 flex flex-col items-center justify-center p-6 text-white overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16"></div>
              <div className="absolute -bottom-8 -left-8 w-40 h-40 bg-indigo-500/10 rounded-full"></div>
              
              <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center mb-2">
                 <div className="w-4 h-4 bg-amber-400 rounded-full"></div>
              </div>
              <h1 className="text-sm font-black uppercase tracking-widest text-center px-4 leading-tight">{instData?.name || 'NAME OF SCHOOL/UNIVERSITY'}</h1>
              <p className="text-[8px] font-bold text-amber-400 uppercase tracking-widest mt-1 opacity-80">Text Slogan here</p>
           </div>

           {/* Photo Frame - Hexagon Design */}
           <div className="relative flex flex-col items-center -mt-16 z-20">
              <div className="w-32 h-32 bg-amber-400 p-1.5" style={{ clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)' }}>
                 <div className="w-full h-full bg-white flex items-center justify-center overflow-hidden" style={{ clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)' }}>
                    {student.photoURL ? (
                      <img src={student.photoURL} alt={student.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-slate-900 flex items-center justify-center">
                         <User className="w-12 h-12 text-white/20" />
                      </div>
                    )}
                 </div>
              </div>
              <div className="mt-4 text-center px-6">
                 <h2 className="text-xl font-black text-slate-900 tracking-tight leading-none mb-1 uppercase">{student.name}</h2>
                 <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">TEXT YOUR MAJOR / CLASS HERE</p>
              </div>
           </div>

           {/* Details Section */}
           <div className="mt-6 px-10 space-y-2">
              {[
                { label: 'ID No', value: student.rollNo },
                { label: 'Course', value: student.batchName },
                { label: 'Phone', value: student.guardianPhone },
                { label: 'Email', value: 'student@email.com' }
              ].map((item, idx) => (
                <div key={idx} className="flex items-center justify-between text-[9px] font-bold">
                   <span className="text-slate-400 uppercase min-w-[50px]">{item.label}</span>
                   <span className="text-slate-400 whitespace-nowrap">:</span>
                   <span className="flex-1 text-slate-900 ml-4 truncate text-right uppercase tracking-wider">{item.value}</span>
                </div>
              ))}
           </div>

           {/* Footer Barcode */}
           <div className="mt-auto px-10 pb-8 flex flex-col items-center gap-2">
              <div className="w-full h-6 bg-slate-900 flex gap-0.5 items-center justify-center px-4 overflow-hidden">
                 {/* Simulated Barcode */}
                 {Array.from({ length: 40 }).map((_, i) => (
                    <div key={i} className={cn("h-full bg-white", i % 3 === 0 ? "w-1" : i % 5 === 0 ? "w-[1.5px]" : "w-[0.5px]")}></div>
                 ))}
              </div>
           </div>
        </div>
       );
    }

    if (templateId === 'orange_pulse') {
       return (
        <div id={`print-card-${student.id}`} className="w-[325px] h-[516px] bg-white rounded-2xl overflow-hidden shadow-2xl relative font-sans mx-auto flex flex-col">
           {/* Header with curves */}
           <div className="h-44 relative bg-orange-500 overflow-hidden flex flex-col p-8 pt-10">
              <div className="absolute top-0 right-0 w-48 h-48 bg-slate-900 transform rotate-45 translate-x-12 -translate-y-24 rounded-3xl"></div>
              <div className="absolute top-0 right-0 w-52 h-52 border-4 border-slate-900 transform rotate-45 translate-x-20 -translate-y-20 rounded-3xl opacity-20"></div>
              
              <div className="relative z-10 flex flex-col items-end">
                 <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center mb-2">
                    <GraduationCap className="w-6 h-6 text-orange-500" />
                 </div>
                 <h1 className="text-[10px] font-black text-white uppercase text-right tracking-[0.2em] leading-tight">আইডি কার্ড</h1>
              </div>
           </div>

           {/* User Photo */}
           <div className="relative flex flex-col items-center -mt-20 z-20">
              <div className="relative">
                 <div className="w-36 h-36 rounded-full bg-orange-500 p-2 shadow-2xl">
                    <div className="w-full h-full rounded-full bg-slate-100 overflow-hidden border-2 border-white flex items-center justify-center">
                      {student.photoURL ? (
                        <img src={student.photoURL} alt={student.name} className="w-full h-full object-cover" />
                      ) : (
                        <User className="w-16 h-16 text-slate-300" />
                      )}
                    </div>
                 </div>
              </div>
           </div>

           {/* Info */}
           <div className="mt-6 text-center px-6">
              <h2 className="text-2xl font-black text-slate-900 tracking-tighter leading-none mb-1 uppercase italic">{student.name}</h2>
              <p className="text-[10px] font-black text-orange-500 uppercase tracking-widest mb-8">শিক্ষা বর্ষ ২০২৪-২৫</p>
              
              <div className="space-y-4 px-4 text-left">
                 {[
                   { label: 'রোল নম্বর', value: student.rollNo },
                   { label: 'শ্রেণি/ব্যাচ', value: student.batchName },
                   { label: 'জন্ম তারিখ', value: student.dob || '০১/০১/২০০X' }
                 ].map((item, idx) => (
                    <div key={idx} className="flex items-center gap-4 border-b border-slate-100 pb-1.5">
                       <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest min-w-[80px]">{item.label} :</span>
                       <span className="text-[10px] font-black text-slate-800 uppercase italic">{item.value || 'N/A'}</span>
                    </div>
                 ))}
              </div>
           </div>

           {/* Footer Wave */}
           <div className="mt-auto relative h-20 overflow-hidden">
              <div className="absolute inset-x-0 bottom-0 h-16 bg-slate-900" style={{ clipPath: 'polygon(0 40%, 100% 0, 100% 100%, 0 100%)' }}></div>
              <div className="absolute inset-x-0 bottom-0 h-12 bg-orange-500" style={{ clipPath: 'polygon(0 60%, 100% 20%, 100% 100%, 0 100%)' }}></div>
              <div className="absolute bottom-4 left-6 z-20">
                 <div className="w-12 h-12 bg-white p-1 rounded-sm shadow-md">
                    <QrCode className="w-full h-full text-slate-900 p-0.5" />
                 </div>
              </div>
           </div>
        </div>
       );
    }

    if (templateId === 'modern_accent') {
       return (
        <div id={`print-card-${student.id}`} className="w-[325px] h-[516px] bg-white rounded-2xl overflow-hidden shadow-2xl relative font-sans mx-auto flex flex-col">
           {/* Dark Header */}
           <div className="h-48 bg-slate-950 p-8 flex flex-col items-center text-center relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 rounded-full -mr-32 -mt-32"></div>
              <p className="text-[8px] font-black text-amber-500 tracking-[0.4em] uppercase mb-1">BRAND NAME</p>
              <p className="text-[6px] font-bold text-white/40 tracking-[0.2em] uppercase">TAGLINE HERE</p>
              
              <div className="mt-6 w-32 h-32 rounded-full border-[6px] border-amber-500 p-1 relative z-20">
                 <div className="w-full h-full rounded-full bg-slate-200 overflow-hidden flex items-center justify-center">
                    {student.photoURL ? (
                       <img src={student.photoURL} alt={student.name} className="w-full h-full object-cover" />
                    ) : (
                       <p className="text-[10px] font-black text-slate-400 uppercase text-center px-4">YOUR PICTURE HERE</p>
                    )}
                 </div>
              </div>
           </div>

           {/* Middle Curve */}
           <div className="h-10 bg-slate-950 relative overflow-hidden">
              <div className="absolute top-0 inset-x-0 h-20 bg-white rounded-t-[100%] shadow-[-20px_-20px_0_0_rgb(2,6,23)]"></div>
              <div className="absolute top-0 inset-x-0 h-10 border-t-4 border-amber-500 rounded-t-[100%] opacity-50"></div>
           </div>

           {/* User Data */}
           <div className="mt-2 text-center px-6 mb-4">
              <h2 className="text-2xl font-black text-slate-900 tracking-tighter leading-none mb-1 uppercase">{student.name}</h2>
              <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">GRAPHICS DESIGNER</p>
           </div>

           <div className="px-10 space-y-2 mb-4">
              {[
                { label: 'ID NO', value: student.rollNo },
                { label: 'MOBILE', value: student.guardianPhone },
                { label: 'EMAIL', value: 'demo@email.com' },
                { label: 'BLOOD GROUP', value: student.bloodGroup || 'A+' },
                { label: 'ADDRESS', value: 'ANYWHERE, ANYCITY' },
                { label: 'WEBSITE', value: 'WWW.DEMOWEB.COM' }
              ].map((item, idx) => (
                <div key={idx} className="flex gap-4 text-[8px] font-bold leading-tight">
                   <span className="text-slate-400 uppercase min-w-[70px]">{item.label}:</span>
                   <span className="text-slate-900 uppercase truncate">{item.value}</span>
                </div>
              ))}
           </div>

           {/* Footer Barcode Box */}
           <div className="mt-auto flex flex-col items-center">
              <div className="w-2/3 h-10 bg-slate-100 flex items-center justify-center px-4 mb-4 border border-slate-200 grayscale opacity-80">
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">BAR CODE HERE</p>
              </div>
           </div>

           <div className="h-10 relative overflow-hidden bg-white">
              <div className="absolute bottom-0 inset-x-0 h-10 bg-slate-950 rounded-b-[100%]"></div>
              <div className="absolute bottom-0 inset-x-0 h-4 border-b-4 border-amber-500 rounded-b-[100%]"></div>
           </div>
        </div>
       );
    }

    if (templateId === 'purple_flow') {
       return (
        <div id={`print-card-${student.id}`} className="w-[325px] h-[516px] bg-white rounded-2xl overflow-hidden shadow-2xl relative font-sans mx-auto flex flex-col border-[8px] border-slate-100">
           {/* Purple Header */}
           <div className="h-48 bg-fuchsia-600 p-6 flex flex-col items-center relative overflow-hidden">
              <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full"></div>
              <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-slate-900/10 rounded-full"></div>
              
              <div className="flex items-center gap-3 relative z-10 w-full mb-4">
                 <div className="w-10 h-10 bg-white p-2 rounded-xl flex items-center justify-center shadow-lg transform -rotate-12 transition-transform">
                    <div className="w-full h-full border-2 border-fuchsia-600 rounded-md"></div>
                 </div>
                 <div className="flex-1">
                    <h1 className="text-xs font-black text-white uppercase leading-none mb-1 tracking-tighter">SCHOOL NAME</h1>
                    <p className="text-[7px] font-bold text-white/60 uppercase tracking-widest">Tagline Goes Here</p>
                 </div>
              </div>

              <div className="w-24 h-24 rounded-full bg-white p-1 shadow-2xl relative z-10">
                 <div className="w-full h-full rounded-full bg-slate-50 overflow-hidden flex items-center justify-center relative">
                    {student.photoURL ? (
                       <img src={student.photoURL} alt={student.name} className="w-full h-full object-cover" />
                    ) : (
                       <div className="w-full h-full bg-slate-100 flex items-center justify-center"><User className="w-8 h-8 text-slate-300" /></div>
                    )}
                 </div>
              </div>
           </div>

           {/* Wavy Divider */}
           <div className="h-8 bg-fuchsia-600 overflow-hidden relative">
              <div className="absolute bottom-0 inset-x-0 h-16 bg-white rounded-t-[50%]"></div>
           </div>

           {/* Data Grid */}
           <div className="flex-1 px-8 py-4 space-y-2.5">
              {[
                { label: 'Reg No', value: ':123456' },
                { label: 'Student ID', value: `: ${student.rollNo}` },
                { label: 'Student Name', value: `: ${student.name}` },
                { label: 'Father/Guardian', value: ': Name Here' },
                { label: 'Class', value: `: ${student.batchName}` },
                { label: 'Emergency Call', value: ': 123-456-7890' }
              ].map((item, idx) => (
                <div key={idx} className="flex text-[8px] font-black leading-tight border-b border-fuchsia-50 pb-1">
                   <span className="text-slate-400 uppercase min-w-[90px]">{item.label}</span>
                   <span className="text-slate-900 uppercase truncate">{item.value}</span>
                </div>
              ))}
           </div>

           {/* Purple Footer */}
           <div className="h-16 relative overflow-hidden">
              <div className="absolute inset-0 bg-fuchsia-600" style={{ clipPath: 'polygon(0 60%, 100% 0, 100% 100%, 0 100%)' }}></div>
              <div className="absolute bottom-0 right-0 w-32 h-16 bg-slate-900/10" style={{ clipPath: 'polygon(100% 100%, 100% 0, 0 100%)' }}></div>
           </div>
        </div>
       );
    }

    if (templateId === 'elite_dark_id') {
      return (
        <div id={`print-card-${student.id}`} className="w-[325px] h-[516px] bg-slate-950 rounded-2xl overflow-hidden shadow-2xl relative font-sans border-[12px] border-slate-900 mx-auto flex flex-col text-white">
           <div className="h-32 bg-gradient-to-br from-slate-900 to-slate-950 p-6 flex flex-col items-center justify-center border-b border-amber-500/20">
              <div className="w-10 h-10 border-2 border-amber-500 rounded-lg flex items-center justify-center mb-1">
                 <Shield className="w-6 h-6 text-amber-500" />
              </div>
              <h1 className="text-[10px] font-black text-amber-500 uppercase tracking-[0.3em]">{instData?.name || 'PRESTIGE ACADEMY'}</h1>
           </div>

           <div className="flex flex-col items-center mt-[-40px] z-10 px-8">
              <div className="w-28 h-28 bg-slate-950 p-1 rounded-2xl shadow-[0_0_20px_rgba(245,158,11,0.2)]">
                 <div className="w-full h-full rounded-xl bg-slate-900 overflow-hidden flex items-center justify-center border border-amber-500/30">
                    {student.photoURL ? <img src={student.photoURL} className="w-full h-full object-cover" /> : <User className="w-12 h-12 text-slate-800" />}
                 </div>
              </div>
              <div className="mt-4 text-center">
                 <h2 className="text-xl font-bold tracking-tight mb-0.5">{student.name}</h2>
                 <p className="text-[9px] font-black text-amber-500 uppercase tracking-widest">{student.batchName}</p>
              </div>
           </div>

           <div className="mt-8 px-10 space-y-4">
              {[
                { label: 'IDENTIFICATION ID', value: student.rollNo },
                { label: 'BLOOD GROUP', value: student.bloodGroup || 'A+' },
                { label: 'EXPIRES ON', value: settings.cardExpiry }
              ].map((item, idx) => (
                <div key={idx} className="flex flex-col gap-1">
                   <span className="text-[7px] font-black text-white/30 uppercase tracking-[0.2em]">{item.label}</span>
                   <span className="text-[10px] font-bold text-white tracking-widest">{item.value}</span>
                </div>
              ))}
           </div>

           <div className="mt-auto px-10 pb-8 flex justify-between items-end">
              <div className="w-12 h-12 bg-white/5 rounded-lg flex items-center justify-center p-1.5 border border-white/10">
                 <QrCode className="w-full h-full text-white/40" />
              </div>
              <div className="text-right">
                 {settings.signatureUrl && <img src={settings.signatureUrl} className="h-5 ml-auto mb-1 brightness-0 invert opacity-40" />}
                 <div className="w-20 h-px bg-amber-500/20 ml-auto mb-1"></div>
                 <p className="text-[7px] font-black text-white/20 uppercase tracking-widest">REGISTRAR OFFICE</p>
              </div>
           </div>
        </div>
      );
    }

    if (templateId === 'minimalist_edge') {
      return (
        <div id={`print-card-${student.id}`} className="w-[325px] h-[516px] bg-white rounded-2xl overflow-hidden shadow-2xl relative font-sans border-t-[10px] border-indigo-600 mx-auto flex flex-col">
           <div className="p-8">
              <div className="flex justify-between items-start mb-12">
                 <div className="flex items-center gap-2">
                    <div className="w-5 h-5 bg-indigo-600 rounded-sm"></div>
                    <span className="text-[10px] font-black uppercase tracking-tighter text-slate-900">{instData?.name || 'CORE EDUCATION'}</span>
                 </div>
                 <div className="text-[8px] font-black text-slate-300 uppercase tracking-widest">ID: {student.rollNo}</div>
              </div>

              <div className="w-full aspect-[4/5] bg-slate-100 rounded-sm overflow-hidden mb-8 relative">
                 {student.photoURL ? <img src={student.photoURL} className="w-full h-full object-cover grayscale active:grayscale-0 transition-all" /> : <div className="w-full h-full flex items-center justify-center"><User className="w-16 h-16 text-slate-200" /></div>}
                 <div className="absolute inset-0 border-[10px] border-white/20 pointer-events-none"></div>
              </div>

              <div className="space-y-1">
                 <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter leading-none">{student.name}</h2>
                 <p className="text-xs font-bold text-indigo-600 uppercase tracking-widest">{student.batchName}</p>
              </div>
           </div>

           <div className="mt-auto px-8 pb-10 flex items-center justify-between">
              <div className="space-y-4">
                 <div>
                    <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Contact</p>
                    <p className="text-[10px] font-black text-slate-900">{student.guardianPhone}</p>
                 </div>
                 <div>
                    <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Validity</p>
                    <p className="text-[10px] font-black text-slate-900">{settings.cardExpiry}</p>
                 </div>
              </div>
              <div className="w-px h-16 bg-slate-100 mx-2"></div>
              <div className="flex-1 pl-4 flex flex-col items-center">
                 <div className="w-full h-4 bg-slate-950 mb-2 flex items-center justify-center gap-0.5 px-2">
                   {Array.from({ length: 20 }).map((_, i) => <div key={i} className={cn("h-full bg-white", i % 4 === 0 ? "w-0.5" : "w-[0.25px]")}></div>)}
                 </div>
                 <p className="text-[6px] font-black text-slate-400 uppercase tracking-widest text-center italic">IDENTITY VERIFIED</p>
              </div>
           </div>
        </div>
      );
    }
    
    if (templateId === 'futuristic_glass') {
      return (
        <div id={`print-card-${student.id}`} className="w-[325px] h-[516px] bg-slate-900 rounded-2xl overflow-hidden shadow-2xl relative font-sans mx-auto flex flex-col p-6 text-white border border-slate-800">
           {/* Abstract Background */}
           <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-600/20 rounded-full blur-[80px] -mr-32 -mt-32"></div>
           <div className="absolute bottom-0 left-0 w-64 h-64 bg-fuchsia-600/10 rounded-full blur-[80px] -ml-32 -mb-32"></div>
           
           <div className="relative z-10 flex flex-col h-full">
              <div className="flex items-center justify-between mb-8">
                 <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-gradient-to-tr from-indigo-500 to-fuchsia-500 rounded-lg flex items-center justify-center p-1">
                       <Palmtree className="w-full h-full text-white" />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-tighter">{instData?.name || 'NEXUS SYSTEM'}</span>
                 </div>
                 <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full shadow-[0_0_8px_rgba(16,185,129,1)]"></div>
              </div>

              <div className="relative w-40 h-40 mx-auto mb-8">
                 <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500 to-fuchsia-500 rounded-3xl blur-xl opacity-20"></div>
                 <div className="relative w-full h-full rounded-3xl bg-white/5 backdrop-blur-xl border border-white/10 overflow-hidden p-1.5">
                    <div className="w-full h-full rounded-2xl bg-slate-800 overflow-hidden flex items-center justify-center">
                       {student.photoURL ? <img src={student.photoURL} className="w-full h-full object-cover" /> : <User className="w-12 h-12 text-slate-700" />}
                    </div>
                 </div>
              </div>

              <div className="text-center mb-8">
                 <h2 className="text-2xl font-black tracking-tight leading-none mb-1 text-transparent bg-clip-text bg-gradient-to-r from-white to-white/60">{student.name}</h2>
                 <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-[0.3em]">ACADEMIC IDENTITY</p>
              </div>

              <div className="space-y-4 bg-white/5 backdrop-blur-md rounded-2xl p-4 border border-white/5">
                 {[
                   { label: 'Register ID', value: student.rollNo },
                   { label: 'Department', value: student.batchName },
                   { label: 'Cellular', value: student.guardianPhone }
                 ].map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center text-[9px] font-bold">
                       <span className="text-white/40 uppercase">{item.label}</span>
                       <span className="text-white font-mono">{item.value}</span>
                    </div>
                 ))}
              </div>

              <div className="mt-auto pt-4 flex justify-between items-center border-t border-white/5">
                 <div className="flex gap-0.5">
                    {Array.from({ length: 15 }).map((_, i) => (
                       <div key={i} className={cn("w-[2px] bg-indigo-500/40", i % 4 === 0 ? "h-4" : "h-2")}></div>
                    ))}
                 </div>
                 <BadgeCheck className="w-6 h-6 text-indigo-500 opacity-50" />
              </div>
           </div>
        </div>
      );
    }

    if (templateId === 'eco_green') {
       return (
        <div id={`print-card-${student.id}`} className="w-[325px] h-[516px] bg-[#f0f9f1] rounded-2xl overflow-hidden shadow-2xl relative font-sans mx-auto flex flex-col border-[6px] border-emerald-900/5">
           {/* NATURE / ECO HEADER */}
           <div className="h-44 bg-emerald-800 p-6 flex flex-col items-center relative overflow-hidden">
              <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-600 rounded-full opacity-20 -mr-16 -mt-16"></div>
              <div className="absolute bottom-0 left-0 w-32 h-32 bg-emerald-900 rounded-full opacity-30 -ml-16 -mb-16"></div>
              <div className="absolute top-10 left-10 w-2 h-2 bg-emerald-400 rounded-full animate-pulse opacity-40"></div>
              
              <div className="flex flex-col items-center relative z-10 w-full">
                 <div className="w-12 h-12 bg-white/10 rounded-xl backdrop-blur-md flex items-center justify-center mb-3">
                    <School className="w-7 h-7 text-emerald-100" />
                 </div>
                 <h1 className="text-[10px] font-black text-white uppercase tracking-[0.4em] text-center">{instData?.name || 'ECO GREEN ACADEMY'}</h1>
                 <p className="text-[6px] font-bold text-emerald-300 uppercase tracking-widest mt-1">Nurturing Minds, Protecting Nature</p>
              </div>
           </div>

           <div className="flex flex-col items-center -mt-16 z-20 px-8">
              <div className="w-32 h-32 bg-white p-1 rounded-3xl shadow-xl rotate-3 transform hover:rotate-0 transition-all duration-300">
                 <div className="w-full h-full rounded-2xl bg-emerald-100 overflow-hidden flex items-center justify-center border-4 border-emerald-50">
                    {student.photoURL ? <img src={student.photoURL} className="w-full h-full object-cover" /> : <User className="w-16 h-16 text-emerald-300" />}
                 </div>
              </div>
              <div className="mt-4 text-center">
                 <h2 className="text-2xl font-black text-emerald-950 tracking-tighter leading-none mb-1 uppercase italic">{student.name}</h2>
                 <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest px-3 py-1 bg-emerald-100/50 rounded-full inline-block">MEMBER IDENTITY</p>
              </div>
           </div>

           <div className="mt-6 flex-1 px-8 space-y-4">
              {[
                { label: 'REGISTER NO', value: student.rollNo },
                { label: 'GRADE LEVEL', value: student.batchName },
                { label: 'DATE OF ISSUE', value: new Date().getFullYear() },
                { label: 'VALID UNTIL', value: settings.cardExpiry }
              ].map((item, idx) => (
                <div key={idx} className="flex justify-between items-center text-[9px] font-black border-b border-emerald-900/5 pb-1">
                   <span className="text-emerald-800/40 uppercase tracking-widest mb-1">{item.label}</span>
                   <span className="text-emerald-900 uppercase italic bg-white px-2 py-0.5 rounded shadow-[inset_0_0_4px_rgba(0,0,0,0.05)]">{item.value}</span>
                </div>
              ))}
           </div>

           <div className="h-16 relative mt-auto px-8 flex items-center justify-between border-t border-emerald-900/5">
              <div className="flex flex-col">
                 <span className="text-[7px] font-black text-emerald-800/30 uppercase tracking-widest">Digital Auth</span>
                 <QrCode className="w-8 h-8 text-emerald-800 opacity-20" />
              </div>
              <div className="text-right">
                 {settings.signatureUrl && <img src={settings.signatureUrl} className="h-8 ml-auto opacity-70 grayscale mb-1" />}
                 <p className="text-[8px] font-extrabold text-emerald-950 uppercase tracking-tighter border-t border-emerald-900/10 pt-1 tracking-[0.2em]">{settings.signatoryTitle || 'VERIFIER'}</p>
              </div>
           </div>
        </div>
       );
    }

    if (templateId === 'holographic_neon') {
       return (
        <div id={`print-card-${student.id}`} className="w-[325px] h-[516px] bg-slate-950 rounded-[2.5rem] overflow-hidden shadow-2xl relative font-sans mx-auto flex flex-col border-[2px] border-indigo-500/20">
           {/* NEON / FUTURISTIC ELEMENTS */}
           <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(99,102,241,0.2)_0%,transparent_50%)]"></div>
           <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-[radial-gradient(circle_at_50%_100%,rgba(168,85,247,0.1)_0%,transparent_50%)]"></div>
           
           <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-3xl"></div>
           
           <div className="p-8 pb-4 relative z-10 flex flex-col items-center">
              <div className="w-full flex justify-between items-center mb-6">
                 <div className="w-8 h-8 rounded-lg bg-indigo-600 p-1.5 shadow-[0_0_15px_rgba(79,70,229,0.5)]">
                    <div className="w-full h-full border border-white opacity-40"></div>
                 </div>
                 <div className="px-3 py-1 bg-white/5 border border-white/10 rounded-full backdrop-blur-md">
                    <span className="text-[8px] font-black text-indigo-400 tracking-widest uppercase">ID SYSTEM VR.02</span>
                 </div>
              </div>

              <div className="relative group">
                 <div className="absolute -inset-2 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-full blur opacity-40 group-hover:opacity-75 transition duration-1000 animate-tilt"></div>
                 <div className="relative w-32 h-32 rounded-full border-2 border-white/10 p-1 bg-slate-900 overflow-hidden flex items-center justify-center">
                    {student.photoURL ? <img src={student.photoURL} className="w-full h-full object-cover" /> : <User className="w-16 h-16 text-slate-800" />}
                 </div>
              </div>
           </div>

           <div className="mt-2 text-center px-8 relative z-10 mb-6">
              <h2 className="text-3xl font-black text-white tracking-widest leading-none mb-2 uppercase drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]">{student.name}</h2>
              <p className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.4em] mb-8 bg-indigo-500/10 inline-block px-4 py-1 rounded-full border border-indigo-500/20">{student.batchName}</p>
              
              <div className="grid grid-cols-2 gap-4 text-left">
                 {[
                   { label: 'Access Code', value: student.rollNo },
                   { label: 'Secure Hash', value: '78XZ-90' },
                   { label: 'Blood Group', value: student.bloodGroup || 'A+' },
                   { label: 'Exp Limit', value: settings.cardExpiry }
                 ].map((item, idx) => (
                    <div key={idx} className="bg-white/5 border border-white/5 p-3 rounded-2xl backdrop-blur-sm">
                       <p className="text-[7px] font-bold text-slate-500 uppercase tracking-widest mb-1">{item.label}</p>
                       <p className="text-[10px] font-black text-white uppercase font-mono tracking-tighter">{item.value}</p>
                    </div>
                 ))}
              </div>
           </div>

           <div className="mt-auto p-8 relative overflow-hidden">
              <div className="absolute inset-0 bg-indigo-600/5 border-t border-white/10"></div>
              <div className="flex justify-between items-end relative z-10">
                 <div className="text-left flex flex-col">
                    <span className="text-[10px] font-black text-white italic tracking-tighter mb-1 uppercase">{instData?.name || 'NEON TECH'}</span>
                    <span className="text-[7px] font-bold text-slate-500 uppercase tracking-widest">Academic Node</span>
                 </div>
                 <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center border border-white/20">
                    <QrCode className="w-6 h-6 text-indigo-400 opacity-60" />
                 </div>
              </div>
           </div>
        </div>
       );
    }
    
    if (templateId === 'sky_gradient') {
      return (
        <div id={`print-card-${student.id}`} className="w-[325px] h-[516px] bg-gradient-to-br from-sky-400 to-indigo-600 rounded-[2.5rem] overflow-hidden shadow-2xl relative font-sans mx-auto flex flex-col p-1 text-white">
           <div className="absolute inset-0 bg-white/10 backdrop-blur-3xl m-2 rounded-[2rem] border border-white/20"></div>
           
           <div className="relative z-10 flex flex-col h-full p-6">
              <div className="flex justify-between items-start mb-6">
                 <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center p-2 backdrop-blur-md">
                    {instData?.logoUrl ? <img src={instData.logoUrl} className="w-full h-full object-contain" /> : <School className="w-full h-full" />}
                 </div>
                 <div className="text-right">
                    <h1 className="text-[10px] font-black uppercase tracking-tighter max-w-[120px] leading-tight">{instData?.name || 'CLOUD ACADEMY'}</h1>
                    <p className="text-[6px] font-bold text-white/60 tracking-widest mt-1">ESTD 2024</p>
                 </div>
              </div>

              <div className="relative w-36 h-36 mx-auto mb-6 p-1 bg-white/20 rounded-full backdrop-blur-xl">
                 <div className="w-full h-full rounded-full bg-slate-100 overflow-hidden border-2 border-white/40">
                    {student.photoURL ? <img src={student.photoURL} className="w-full h-full object-cover" /> : <User className="w-16 h-16 text-slate-300" />}
                 </div>
              </div>

              <div className="text-center mb-6">
                 <h2 className="text-2xl font-black tracking-tight mb-0.5">{student.name}</h2>
                 <p className="text-[9px] font-black text-sky-200 uppercase tracking-[0.3em]">{student.batchName}</p>
              </div>

              <div className="bg-black/20 backdrop-blur-md rounded-2xl p-4 border border-white/5 space-y-3">
                 {[
                   { label: 'Student Roll', value: student.rollNo },
                   { label: 'Blood Group', value: student.bloodGroup || 'A+' },
                   { label: 'Contact', value: student.guardianPhone }
                 ].map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center text-[9px]">
                       <span className="text-white/40 font-bold uppercase">{item.label}</span>
                       <span className="text-white font-black">{item.value}</span>
                    </div>
                 ))}
              </div>

              <div className="mt-auto pt-4 flex justify-center">
                 <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
                    <div className="w-1/3 h-full bg-sky-200"></div>
                 </div>
              </div>
           </div>
        </div>
      );
    }

    if (templateId === 'brutalist_mono') {
      return (
        <div id={`print-card-${student.id}`} className="w-[325px] h-[516px] bg-white border-[6px] border-black overflow-hidden shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] relative font-mono mx-auto flex flex-col p-4 text-black">
           <div className="border-2 border-black p-4 h-full flex flex-col">
              <div className="flex justify-between items-start mb-6">
                 <div className="bg-black text-white px-2 py-1 text-[10px] font-black uppercase">
                    {instData?.name || 'MONO ACADEMY'}
                 </div>
                 <div className="text-[12px] font-black border-2 border-black px-1">ID-{student.rollNo}</div>
              </div>

              <div className="w-40 h-40 border-4 border-black mx-auto mb-6 relative">
                 <div className="absolute -inset-1 bg-black translate-x-2 translate-y-2 -z-10"></div>
                 <div className="w-full h-full bg-white overflow-hidden flex items-center justify-center grayscale contrast-125">
                    {student.photoURL ? <img src={student.photoURL} className="w-full h-full object-cover" /> : <User className="w-20 h-20" />}
                 </div>
              </div>

              <div className="border-t-4 border-black pt-4 mb-4">
                 <h2 className="text-xl font-black uppercase leading-none break-all">{student.name}</h2>
                 <p className="text-xs font-black bg-black text-white inline-block px-2 mt-2">{student.batchName}</p>
              </div>

              <div className="space-y-1">
                 <div className="flex justify-between text-[10px] font-bold border-b border-black/10">
                    <span>PHONE</span>
                    <span>{student.guardianPhone}</span>
                 </div>
                 <div className="flex justify-between text-[10px] font-bold border-b border-black/10">
                    <span>BLOOD</span>
                    <span>{student.bloodGroup || 'A+'}</span>
                 </div>
                 <div className="flex justify-between text-[10px] font-bold">
                    <span>EXPIRY</span>
                    <span>{settings.cardExpiry}</span>
                 </div>
              </div>

              <div className="mt-auto pt-6 flex justify-between items-end">
                 <QrCode className="w-12 h-12" />
                 <div className="text-right">
                    <p className="text-[10px] font-black border-2 border-black px-2 uppercase">Official</p>
                 </div>
              </div>
           </div>
        </div>
      );
    }

    if (templateId === 'soft_geometric') {
      return (
        <div id={`print-card-${student.id}`} className="w-[325px] h-[516px] bg-indigo-50/50 rounded-3xl overflow-hidden shadow-2xl relative font-sans mx-auto flex flex-col border border-white">
           <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl -mr-20 -mt-20"></div>
           <div className="absolute bottom-0 left-0 w-64 h-64 bg-fuchsia-500/10 rounded-full blur-3xl -ml-20 -mb-20"></div>
           
           <div className="p-8 pb-4 relative z-10 flex flex-col items-center">
              <div className="text-center mb-8">
                 <h1 className="text-[10px] font-black text-indigo-900 uppercase tracking-[0.3em]">{instData?.name || 'SOFT GEOMETRIC'}</h1>
              </div>

              <div className="relative mb-8">
                 <div className="w-32 h-32 rounded-3xl bg-white shadow-xl p-1.5 flex items-center justify-center">
                    <div className="w-full h-full rounded-2xl bg-indigo-100 overflow-hidden flex items-center justify-center">
                       {student.photoURL ? <img src={student.photoURL} className="w-full h-full object-cover" /> : <User className="w-16 h-16 text-indigo-300" />}
                    </div>
                 </div>
                 <div className="absolute -bottom-4 -right-4 w-12 h-12 bg-white rounded-2xl shadow-lg flex items-center justify-center border border-indigo-50 transform rotate-12">
                    <Award className="w-6 h-6 text-indigo-600" />
                 </div>
              </div>

              <div className="text-center w-full">
                 <h2 className="text-2xl font-black text-slate-800 tracking-tight leading-none mb-1">{student.name}</h2>
                 <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{student.batchName}</p>
                 
                 <div className="mt-8 space-y-2">
                    <div className="p-3 bg-white rounded-2xl shadow-sm border border-indigo-50 text-left">
                       <p className="text-[7px] font-black text-slate-300 uppercase tracking-widest mb-1">ID Number</p>
                       <p className="text-xs font-black text-slate-700">{student.rollNo}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                       <div className="p-3 bg-white rounded-2xl shadow-sm border border-indigo-50 text-left">
                          <p className="text-[7px] font-black text-slate-300 uppercase tracking-widest mb-1">Blood</p>
                          <p className="text-xs font-black text-slate-700">{student.bloodGroup || 'A+'}</p>
                       </div>
                       <div className="p-3 bg-white rounded-2xl shadow-sm border border-indigo-50 text-left">
                          <p className="text-[7px] font-black text-slate-300 uppercase tracking-widest mb-1">Valid</p>
                          <p className="text-xs font-black text-slate-700">{settings.cardExpiry}</p>
                       </div>
                    </div>
                 </div>
              </div>
           </div>

           <div className="mt-auto px-8 pb-10 flex items-center justify-between relative z-10">
              <div className="flex flex-col">
                 <h3 className="text-[8px] font-black text-indigo-900/40 uppercase tracking-widest">{instData?.address?.substring(0, 20)}</h3>
              </div>
              <div className="text-right">
                 {settings.signatureUrl && <img src={settings.signatureUrl} className="h-6 ml-auto mb-1 opacity-70" />}
                 <div className="w-16 h-px bg-indigo-900/10 ml-auto whitespace-nowrap"></div>
                 <p className="text-[7px] font-black text-slate-300 uppercase">Authorized</p>
              </div>
           </div>
        </div>
      );
    }

    // Default Vertical Professional
    return (
      <div id={`print-card-${student.id}`} className="w-[325px] h-[516px] bg-white rounded-2xl overflow-hidden shadow-2xl relative font-sans border border-slate-200 mx-auto">
         {/* Top Branding */}
         <div className="h-28 relative overflow-hidden flex flex-col items-center justify-center text-white" style={{ background: primary }}>
            <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -mr-10 -mt-10"></div>
            <div className="absolute bottom-0 left-0 w-16 h-16 bg-white/10 rounded-full -ml-8 -mb-8"></div>
            <h3 className="text-lg font-black tracking-tight leading-tight px-4 text-center">{instData?.name || 'প্রতিষ্ঠানের নাম'}</h3>
            <p className="text-[8px] font-black uppercase tracking-widest opacity-80">স্টুডেন্ট আইডি কার্ড</p>
         </div>

         <div className="flex flex-col items-center -mt-12 relative z-10">
            <div className="w-32 h-32 bg-white rounded-2xl shadow-xl p-1 border-2 border-white">
              <div className="w-full h-full bg-slate-100 rounded-xl overflow-hidden flex items-center justify-center">
                 {student.photoURL ? (
                    <img src={student.photoURL} alt={student.name} className="w-full h-full object-cover" />
                 ) : (
                    <User className="w-16 h-16 text-slate-300" />
                 )}
              </div>
            </div>
            
            <div className="mt-4 text-center px-6">
               <h2 className="text-xl font-black text-slate-900 tracking-tight leading-none mb-1 text-center">{student.name}</h2>
               <p className="text-[10px] font-black uppercase tracking-widest text-center" style={{ color: primary }}>{student.batchName}</p>
            </div>
         </div>

         <div className="mt-6 px-8 space-y-3 font-bold">
            <div className="flex justify-between border-b border-slate-50 pb-1">
               <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">রোল নম্বর</span>
               <span className="text-[10px] font-black text-slate-900 text-right">{student.rollNo}</span>
            </div>
            <div className="flex justify-between border-b border-slate-50 pb-1">
               <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">রক্তের গ্রুপ</span>
               <span className="text-[10px] font-black text-right" style={{ color: secondary }}>{student.bloodGroup || 'N/A'}</span>
            </div>
            <div className="flex justify-between border-b border-slate-50 pb-1">
               <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">মোবাইল</span>
               <span className="text-[10px] font-black text-slate-900 text-right">{student.guardianPhone}</span>
            </div>
            <div className="flex justify-between border-b border-slate-50 pb-1">
               <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">মেয়াদ</span>
               <span className="text-[10px] font-black text-slate-900 text-right">{settings.cardExpiry || 'DEC-2026'}</span>
            </div>
         </div>

         <div className="absolute bottom-6 left-0 right-0 px-8 flex justify-center">
            <div className="text-center">
               {settings.signatureUrl ? (
                 <img src={settings.signatureUrl} className="h-8 object-contain mb-1 mx-auto" />
               ) : (
                 <div className="h-4"></div>
               )}
               <div className="w-32 h-px bg-slate-200 mb-1 mx-auto"></div>
               <p className="text-[8px] font-black text-slate-400 uppercase text-center">{settings.signatoryTitle || 'অনুমোদিত স্বাক্ষর'}</p>
            </div>
         </div>

         <div className="absolute bottom-0 left-0 right-0 h-1.5" style={{ background: `linear-gradient(to right, ${primary}, ${secondary}, ${primary})` }}></div>
      </div>
    );
  };

  return (
    <div className="space-y-8 pb-20">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight flex items-center gap-3">
            <IdCard className="w-8 h-8 text-indigo-600" /> কার্ড ম্যানেজমেন্ট
          </h1>
          <p className="text-gray-500 mt-1 font-medium italic">আইডি কার্ড, প্রবেশপত্র এবং সার্টিফিকেট ডিজাইন ও তৈরি করুন।</p>
        </div>
        
        <div className="flex items-center gap-3 bg-white p-2 rounded-2xl border border-gray-100 shadow-sm overflow-x-auto no-scrollbar">
           {(['id_card', 'admit_card', 'certificate', 'testimonial', 'settings'] as const).map(tab => (
             <button
               key={tab}
               onClick={() => setActiveTab(tab)}
               className={cn(
                 "px-6 py-2.5 rounded-xl text-sm font-black transition-all flex items-center gap-2 whitespace-nowrap capitalize",
                 activeTab === tab ? "bg-indigo-600 text-white shadow-lg shadow-indigo-100" : "text-gray-400 hover:bg-gray-50"
               )}
             >
               {tab === 'id_card' && <><IdCard className="w-4 h-4" /> আইডি কার্ড</>}
               {tab === 'admit_card' && <><Layout className="w-4 h-4" /> প্রবেশপত্র</>}
               {tab === 'certificate' && <><Award className="w-4 h-4" /> সার্টিফিকেট</>}
               {tab === 'testimonial' && <><FileText className="w-4 h-4" /> প্রশংসাপত্র</>}
               {tab === 'settings' && <><SettingsIcon className="w-4 h-4" /> সেটিংস</>}
             </button>
           ))}
        </div>
      </div>

      {activeTab === 'settings' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in fade-in slide-in-from-bottom-5">
           {/* Customization Panel */}
           <div className="lg:col-span-5 bg-white p-8 rounded-3xl border border-gray-100 shadow-xl space-y-8 flex flex-col h-[750px]">
              <div className="flex items-center justify-between">
                <div>
                   <h3 className="text-xl font-black text-gray-900 flex items-center gap-2">
                       <Palette className="w-5 h-5 text-indigo-600" /> ডিজাইন স্টুডিও
                   </h3>
                   <p className="text-[10px] text-gray-400 font-black uppercase mt-1 tracking-widest">প্রাতিষ্ঠানিক টেমপ্লেট</p>
                </div>
                {saving ? (
                   <Loader2 className="w-6 h-6 text-indigo-600 animate-spin" />
                ) : (
                   <button 
                     onClick={handleSaveSettings}
                     className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-[10px] font-black shadow-lg hover:bg-indigo-700 transition-all flex items-center gap-2 uppercase tracking-widest"
                   >
                      <BadgeCheck className="w-4 h-4" /> ডিজাইন সেভ করুন
                   </button>
                )}
              </div>
              
              {/* Card Type Selector in Settings */}
              <div className="flex bg-gray-50 p-1.5 rounded-2xl border border-gray-100">
                 {([['id_card', 'আইডি কার্ড'], ['admit_card', 'প্রবেশপত্র'], ['certificate', 'সার্টিফিকেট'], ['testimonial', 'প্রশংসাপত্র']] as const).map(([type, label]) => (
                    <button
                      key={type}
                      onClick={() => setActiveSettingsType(type as any)}
                      className={cn(
                        "flex-1 py-2 text-[9px] font-black rounded-xl transition-all uppercase tracking-widest",
                        activeSettingsType === type ? "bg-white text-indigo-600 shadow-sm border border-indigo-50" : "text-gray-400 hover:text-gray-600"
                      )}
                    >
                       {label}
                    </button>
                 ))}
              </div>

              <div className="flex-1 overflow-y-auto pr-2 space-y-8 custom-scrollbar">
                 {/* Common Primary Styles */}
                 <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-3">
                       <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">থিম প্রাইমারি কালার</label>
                       <div className="flex items-center gap-3">
                          <input 
                            type="color" 
                            value={settings.primaryColor}
                            onChange={e => setSettings({ ...settings, primaryColor: e.target.value })}
                            className="w-10 h-10 rounded-lg cursor-pointer bg-transparent border-none"
                          />
                          <input 
                            type="text" 
                            value={settings.primaryColor}
                            onChange={e => setSettings({ ...settings, primaryColor: e.target.value })}
                            className="flex-1 px-3 py-2 bg-gray-50 border border-gray-100 rounded-lg text-xs font-bold font-mono"
                          />
                       </div>
                    </div>
                    <div className="space-y-3">
                       <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">থিম অ্যাকসেন্ট কালার</label>
                       <div className="flex items-center gap-3">
                          <input 
                            type="color" 
                            value={settings.secondaryColor}
                            onChange={e => setSettings({ ...settings, secondaryColor: e.target.value })}
                            className="w-10 h-10 rounded-lg cursor-pointer bg-transparent border-none"
                          />
                          <input 
                            type="text" 
                            value={settings.secondaryColor}
                            onChange={e => setSettings({ ...settings, secondaryColor: e.target.value })}
                            className="flex-1 px-3 py-2 bg-gray-50 border border-gray-100 rounded-lg text-xs font-bold font-mono"
                          />
                       </div>
                    </div>
                 </div>

                 {/* Template Specifics */}
                 <div className="space-y-6 pt-6 border-t border-gray-50">
                    {activeSettingsType === 'certificate' && (
                       <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                          <div className="space-y-2">
                             <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">সার্টিফিকেট লেআউট</label>
                             <div className="grid grid-cols-2 gap-3">
                                {CERTIFICATE_TEMPLATES.map(t => (
                                   <button
                                     key={t.id}
                                     onClick={() => setSettings({ ...settings, certificateTemplate: t.id })}
                                     className={cn(
                                       "p-4 rounded-xl border-2 transition-all text-left group",
                                       settings.certificateTemplate === t.id ? "bg-indigo-50 border-indigo-600 shadow-sm" : "bg-white border-gray-100 hover:border-indigo-100"
                                     )}
                                   >
                                      <p className={cn("text-xs font-black uppercase tracking-tight", settings.certificateTemplate === t.id ? "text-indigo-900" : "text-gray-400 group-hover:text-indigo-400")}>{t.name}</p>
                                   </button>
                                ))}
                             </div>
                          </div>
                          <div className="space-y-4">
                            <div className="space-y-2">
                               <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">অ্যাচিভমেন্ট স্টেটমেন্ট</label>
                               <textarea 
                                  value={settings.customCertificateText}
                                  onChange={e => setSettings({ ...settings, customCertificateText: e.target.value })}
                                  className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm font-bold focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none h-24 resize-none leading-relaxed"
                                  placeholder="For outstanding achievement..."
                               />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                               <div className="space-y-2">
                                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">পরীক্ষার নাম</label>
                                  <input 
                                     type="text" 
                                     value={settings.examName}
                                     onChange={e => setSettings({ ...settings, examName: e.target.value })}
                                     className="w-full px-3 py-2 bg-gray-50 border border-gray-100 rounded-lg text-xs font-bold"
                                     placeholder="বার্ষিক পরীক্ষা ২০২৪"
                                  />
                               </div>
                               <div className="space-y-2">
                                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">ফলাফল লেবেল (GPA/Score)</label>
                                  <input 
                                     type="text" 
                                     value={settings.resultLabel}
                                     onChange={e => setSettings({ ...settings, resultLabel: e.target.value })}
                                     className="w-full px-3 py-2 bg-gray-50 border border-gray-100 rounded-lg text-xs font-bold"
                                  />
                               </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                               <div className="space-y-2">
                                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">সেশন</label>
                                  <input 
                                     type="text" 
                                     value={settings.session}
                                     onChange={e => setSettings({ ...settings, session: e.target.value })}
                                     className="w-full px-3 py-2 bg-gray-50 border border-gray-100 rounded-lg text-xs font-bold"
                                  />
                               </div>
                               <div className="space-y-2">
                                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">প্রদানের তারিখ</label>
                                  <input 
                                     type="text" 
                                     value={settings.issueDate}
                                     onChange={e => setSettings({ ...settings, issueDate: e.target.value })}
                                     className="w-full px-3 py-2 bg-gray-50 border border-gray-100 rounded-lg text-xs font-bold"
                                  />
                               </div>
                            </div>
                          </div>
                       </div>
                    )}

                    {activeSettingsType === 'id_card' && (
                       <div className="space-y-6 animate-in fade-in slide-in-from-top-2">
                          <div className="space-y-2">
                             <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">আইডি কার্ড ফরম্যাট</label>
                             <div className="grid grid-cols-2 gap-3">
                                {ID_CARD_TEMPLATES.map(t => (
                                   <button
                                     key={t.id}
                                     onClick={() => setSettings({ ...settings, idCardTemplate: t.id })}
                                     className={cn(
                                       "p-2 rounded-xl border-2 transition-all text-left flex items-center justify-between group",
                                       settings.idCardTemplate === t.id ? "bg-indigo-50 border-indigo-600 shadow-sm" : "bg-white border-gray-100 hover:border-indigo-100"
                                     )}
                                   >
                                      <p className={cn("text-[9px] font-black uppercase", settings.idCardTemplate === t.id ? "text-indigo-900" : "text-gray-400 group-hover:text-indigo-400")}>{t.name}</p>
                                      <div className={cn("w-3 h-3 rounded-full border-2 flex items-center justify-center", settings.idCardTemplate === t.id ? "bg-indigo-600 border-indigo-600" : "border-gray-200")}>
                                         {settings.idCardTemplate === t.id && <div className="w-1 h-1 bg-white rounded-full"></div>}
                                      </div>
                                   </button>
                                ))}
                             </div>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                               <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">মেয়াদ উত্তীর্ণের তারিখ</label>
                               <input 
                                  type="text" 
                                  value={settings.cardExpiry}
                                  onChange={e => setSettings({ ...settings, cardExpiry: e.target.value })}
                                  className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm font-black text-indigo-600 uppercase"
                               />
                            </div>
                            <div className="space-y-2">
                               <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">সাইড নির্বাচন (প্রিভিউ)</label>
                               <div className="flex bg-gray-100 p-1 rounded-xl">
                                  <button 
                                    onClick={() => setShowBackSide(false)}
                                    className={cn("flex-1 py-2 text-[9px] font-black rounded-lg uppercase tracking-widest", !showBackSide ? "bg-white shadow-sm text-indigo-600" : "text-gray-400")}
                                  >
                                    সামনে
                                  </button>
                                  <button 
                                    onClick={() => setShowBackSide(true)}
                                    className={cn("flex-1 py-2 text-[9px] font-black rounded-lg uppercase tracking-widest", showBackSide ? "bg-white shadow-sm text-indigo-600" : "text-gray-400")}
                                  >
                                    পেছনে
                                  </button>
                               </div>
                            </div>
                          </div>
                          <div className="space-y-2">
                             <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">পেছনের নির্দেশনাবলী</label>
                             <textarea 
                                value={settings.cardInstructions}
                                onChange={e => setSettings({ ...settings, cardInstructions: e.target.value })}
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm font-bold min-h-[120px] resize-none"
                                placeholder="আইডি কার্ডের পেছনের নির্দেশনাবলী লিখুন..."
                             />
                          </div>
                       </div>
                    )}

                    {activeSettingsType === 'admit_card' && (
                       <div className="space-y-6 animate-in fade-in slide-in-from-top-2">
                          <div className="space-y-2">
                             <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">প্রবেশপত্র টেমপ্লেট</label>
                             <div className="grid grid-cols-1 gap-3">
                                {ADMIT_CARD_TEMPLATES.map(t => (
                                   <button
                                     key={t.id}
                                     onClick={() => setSettings({ ...settings, admitCardTemplate: t.id })}
                                     className={cn(
                                       "p-4 rounded-xl border-2 transition-all text-left flex items-center justify-between group",
                                       settings.admitCardTemplate === t.id ? "bg-indigo-50 border-indigo-600 shadow-sm" : "bg-white border-gray-100 hover:border-indigo-100"
                                     )}
                                   >
                                      <p className={cn("text-xs font-black uppercase", settings.admitCardTemplate === t.id ? "text-indigo-900" : "text-gray-400 group-hover:text-indigo-400")}>{t.name}</p>
                                      <div className={cn("w-4 h-4 rounded-full border-2 flex items-center justify-center", settings.admitCardTemplate === t.id ? "bg-indigo-600 border-indigo-600" : "border-gray-200")}>
                                         {settings.admitCardTemplate === t.id && <div className="w-1.5 h-1.5 bg-white rounded-full"></div>}
                                      </div>
                                   </button>
                                ))}
                             </div>
                          </div>
                       </div>
                    )}

                    {activeSettingsType === 'testimonial' && (
                       <div className="space-y-6 animate-in fade-in slide-in-from-top-2">
                          <div className="space-y-2">
                             <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">প্রশংসাপত্র ডিজাইন</label>
                             <div className="grid grid-cols-1 gap-3">
                                {TESTIMONIAL_TEMPLATES.map(t => (
                                   <button
                                     key={t.id}
                                     onClick={() => setSettings({ ...settings, testimonialTemplate: t.id })}
                                     className={cn(
                                       "p-4 rounded-xl border-2 transition-all text-left flex items-center justify-between group",
                                       settings.testimonialTemplate === t.id ? "bg-indigo-50 border-indigo-600 shadow-sm" : "bg-white border-gray-100 hover:border-indigo-100"
                                     )}
                                   >
                                      <p className={cn("text-xs font-black uppercase", settings.testimonialTemplate === t.id ? "text-indigo-900" : "text-gray-400 group-hover:text-indigo-400")}>{t.name}</p>
                                      <div className={cn("w-4 h-4 rounded-full border-2 flex items-center justify-center", settings.testimonialTemplate === t.id ? "bg-indigo-600 border-indigo-600" : "border-gray-200")}>
                                         {settings.testimonialTemplate === t.id && <div className="w-1.5 h-1.5 bg-white rounded-full"></div>}
                                      </div>
                                   </button>
                                ))}
                             </div>
                          </div>
                       </div>
                    )}

                    {/* Common Signatory Settings */}
                    <div className="space-y-4 pt-6 border-t border-gray-50">
                       <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">স্বাক্ষরকারীর তথ্য</h4>
                       <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                             <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">পূর্ণ নাম</label>
                             <input 
                                type="text" 
                                value={settings.signatoryName}
                                onChange={e => setSettings({ ...settings, signatoryName: e.target.value })}
                                className="w-full px-3 py-2.5 bg-gray-50 border border-gray-100 rounded-lg text-xs font-bold"
                             />
                          </div>
                          <div className="space-y-2">
                             <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">পদবী / টাইটেল</label>
                             <input 
                                type="text" 
                                value={settings.signatoryTitle}
                                onChange={e => setSettings({ ...settings, signatoryTitle: e.target.value })}
                                className="w-full px-3 py-2.5 bg-gray-50 border border-gray-100 rounded-lg text-xs font-bold"
                             />
                          </div>
                       </div>
                    </div>
                 </div>
              </div>

              <div className="pt-6 border-t border-gray-100">
                 <button 
                   onClick={() => {
                     setSettings({
                       certificateTemplate: 'luxury_gold',
                       testimonialTemplate: 'standard',
                       idCardTemplate: 'vertical_pro',
                       admitCardTemplate: 'standard',
                       primaryColor: '#4f46e5',
                       secondaryColor: '#f59e0b',
                       headerTextColor: '#ffffff',
                       instNameSize: '24px',
                       signatureUrl: '',
                       sealUrl: '',
                       signatoryName: '',
                       signatoryTitle: 'Principal',
                       customCertificateText: 'For outstanding academic excellence and remarkable performance in the academic year',
                       examName: 'Annual Examination 2024',
                       resultLabel: 'GPA',
                       session: '2023-24',
                       issueDate: new Date().toLocaleDateString('en-US'),
                       cardExpiry: 'DEC-2026',
                       cardInstructions: 'This card is non-transferable.\nIf found, please return to school office.\nCardholder is responsible for loss.'
                     });
                   }}
                   className="w-full py-4 bg-gray-50 text-gray-400 rounded-2xl font-black hover:bg-gray-100 hover:text-gray-600 transition-all text-[10px] uppercase tracking-[0.2em] border border-dashed border-gray-200"
                 >
                    ডিফল্ট সেটিংস রিসেট করুন
                 </button>
              </div>
           </div>

           {/* Live Design Preview */}
           <div className="lg:col-span-7 flex flex-col gap-6 animate-in fade-in slide-in-from-right-8 duration-700">
              <div className="bg-slate-900 px-6 py-4 rounded-3xl text-white flex items-center justify-between shadow-2xl overflow-hidden relative">
                 <div className="absolute top-0 right-0 w-64 h-full bg-gradient-to-l from-indigo-500/10 to-transparent"></div>
                 <div className="flex items-center gap-4 relative z-10">
                    <div className="p-2 bg-indigo-500/20 rounded-lg">
                       <Monitor className="w-5 h-5 text-indigo-400" />
                    </div>
                    <div>
                       <span className="text-xs font-black tracking-[0.2em] uppercase block">ডিজাইন প্রিভিউ</span>
                       <span className="text-[10px] font-medium text-slate-500 italic">সরাসরি প্রিভিউ দেখুন</span>
                    </div>
                 </div>
                 <div className="flex items-center gap-3 bg-slate-800/50 px-4 py-2 rounded-xl border border-slate-700/50 relative z-10">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.5)]"></div>
                    <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest whitespace-nowrap">লাইভ সিঙ্ক চালু</span>
                 </div>
              </div>

              <div className="flex-1 bg-gray-50 rounded-[60px] border-4 border-dashed border-gray-200 flex items-center justify-center relative overflow-hidden min-h-[600px] p-20">
                 <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:20px_20px] opacity-50"></div>
                 
                 <div className="transform scale-[0.6] origin-center transition-all duration-700 ease-out hover:scale-[0.62] active:scale-[0.58] cursor-crosshair">
                    <div className="bg-white rounded-3xl overflow-hidden shadow-[0_50px_100px_-20px_rgba(0,0,0,0.3),0_0_0_1px_rgba(0,0,0,0.05)] ring-1 ring-black/5">
                       {(activeSettingsType === 'id_card') && renderIDCard(sampleStudent)}
                       {(activeSettingsType === 'certificate') && renderCertificate(sampleStudent)}
                       {(activeSettingsType === 'testimonial') && renderTestimonial(sampleStudent)}
                       {(activeSettingsType === 'admit_card') && renderAdmitCard(sampleStudent)}
                    </div>
                 </div>
                 
                 {/* Display Labels */}
                 <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5">
                    <div className="px-4 py-1.5 bg-white/80 backdrop-blur-md rounded-full shadow-sm border border-white/20 flex items-center gap-2">
                       <BadgeCheck className="w-3.5 h-3.5 text-indigo-500" />
                       <span className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">স্কেল ভিউ: ৬০%</span>
                    </div>
                    <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest italic">সেভ করা ডিজাইন ডাউনলোডের সময় কার্যকর হবে</p>
                 </div>
              </div>
           </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 h-full">
          {/* Left Panel: Selection */}
          <div className="xl:col-span-4 space-y-6 animate-in fade-in slide-in-from-left-5">
            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-xl space-y-6 sticky top-24">
               <div className="space-y-4">
                  <h3 className="text-lg font-black text-gray-900 flex items-center gap-2">
                     <Users className="w-5 h-5 text-indigo-600" /> ছাত্র-ছাত্রী নির্বাচন করুন
                  </h3>
                  
                  <div className="relative group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 group-focus-within:text-indigo-500 transition-colors" />
                    <input
                      type="text"
                      placeholder="নাম বা রোল দিয়ে খুঁজুন..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-sm font-bold focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none"
                    />
                  </div>

                  <select 
                    value={selectedBatch}
                    onChange={(e) => setSelectedBatch(e.target.value)}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-sm font-bold"
                  >
                    <option value="All">সব ব্যাচ</option>
                    {batches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>

                  {activeTab === 'admit_card' && (
                    <div className="space-y-2 animate-in slide-in-from-top-2">
                       <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest pl-1">পরীক্ষা নির্বাচন করুন</label>
                       <select 
                         value={selectedExamId}
                         onChange={(e) => {
                            setSelectedExamId(e.target.value);
                            const exam = exams.find(ex => ex.id === e.target.value);
                            if (exam) {
                              setSettings(prev => ({ ...prev, examName: exam.title }));
                            }
                         }}
                         className="w-full px-4 py-2.5 bg-indigo-50 border border-indigo-100 rounded-xl text-sm font-bold focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none text-indigo-900"
                       >
                         <option value="">পরীক্ষা সিলেক্ট করুন...</option>
                         {exams.map(exam => (
                           <option key={exam.id} value={exam.id}>{exam.title}</option>
                         ))}
                       </select>
                    </div>
                  )}
               </div>

               <div className="max-h-[400px] overflow-y-auto pr-2 space-y-1 no-scrollbar border-t border-gray-50 pt-4">
                  <label className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-xl transition-all cursor-pointer bg-white group">
                    <input 
                      type="checkbox" 
                      onChange={handleSelectAll}
                      checked={selectedStudents.length === filteredStudents.length && filteredStudents.length > 0}
                      className="w-5 h-5 rounded-lg border-gray-200 text-indigo-600 focus:ring-indigo-500" 
                    />
                    <span className="text-sm font-black text-gray-700">সবাইকে সিলেক্ট করুন {filteredStudents.length > 0 && `(${filteredStudents.length})`}</span>
                  </label>

                  {filteredStudents.map(student => (
                    <label 
                      key={student.id} 
                      className={cn(
                        "flex items-center gap-3 p-3 rounded-xl transition-all cursor-pointer border group",
                        selectedStudents.includes(student.id) ? "bg-indigo-50 border-indigo-200" : "bg-white border-transparent hover:bg-gray-50"
                      )}
                    >
                      <input 
                        type="checkbox" 
                        checked={selectedStudents.includes(student.id)}
                        onChange={() => toggleStudentSelection(student.id)}
                        className="w-5 h-5 rounded-lg border-gray-200 text-indigo-600 focus:ring-indigo-500" 
                      />
                      <div className="flex-1 min-w-0">
                        <p className={cn("text-sm font-bold truncate", selectedStudents.includes(student.id) ? "text-indigo-900" : "text-gray-900 whitespace-nowrap")}>{student.name}</p>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter">{student.rollNo} • {student.batchName}</p>
                      </div>
                    </label>
                  ))}
               </div>

               <div className="pt-4 space-y-3">
                  <button 
                    disabled={selectedStudents.length === 0 || isGenerating}
                    onClick={() => {
                        alert(`${selectedStudents.length} জন ছাত্র-ছাত্রীর জন্য একসাথে জেনারেশন শুরু হচ্ছে। এটি একটি সমন্বিত PDF বা একাধিক ফাইল ডাউনলোড করবে।`);
                    }}
                    className="w-full py-4 bg-gray-900 text-white rounded-2xl font-black shadow-xl hover:bg-black transition-all flex items-center justify-center gap-2 group disabled:opacity-50"
                  >
                    <Download className="w-5 h-5 group-hover:translate-y-0.5 transition-transform" /> একসাথে ডাউনলোড করুন 
                  </button>
                  <p className="text-[10px] text-gray-400 text-center font-bold italic">ছাত্র-ছাত্রী সিলেক্ট করুন এবং "একসাথে ডাউনলোড করুন" এ ক্লিক করুন।</p>
               </div>
            </div>
          </div>

          {/* Right Panel: Preview Area */}
          <div className="xl:col-span-8 flex flex-col items-center">
             <div className="w-full flex items-center justify-between mb-6 bg-white p-4 rounded-3xl border border-gray-100 shadow-sm overflow-x-auto no-scrollbar scroll-smooth">
                <div className="flex items-center gap-3">
                   <Monitor className="w-5 h-5 text-gray-400" />
                   <h2 className="text-xl font-black text-gray-900 tracking-tight">লাইভ প্রিভিউ</h2>
                   {selectedStudents.length > 0 && (
                     <span className="bg-indigo-100 text-indigo-600 px-3 py-1 rounded-full text-xs font-black">
                       {selectedStudents.length} জন নির্বাচিত
                     </span>
                   )}
                </div>
                
                {selectedStudents.length > 0 && (
                   <div className="flex items-center gap-2">
                      <button 
                        onClick={() => setSelectedStudents([])}
                        className="p-2 text-gray-400 hover:text-rose-600 transition-colors"
                      >
                         <Undo className="w-5 h-5" />
                      </button>
                      <button 
                         onClick={() => {
                           const s = students.find(sid => sid.id === selectedStudents[0]);
                           if (s) downloadCard(s.id, s.name);
                         }}
                         disabled={isGenerating}
                         className="px-6 py-2 bg-emerald-600 text-white rounded-xl text-xs font-black shadow-lg shadow-emerald-100 hover:bg-emerald-700 transition-all flex items-center gap-2"
                      >
                         {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />}
                         প্রিন্ট প্রিভিউ
                      </button>
                   </div>
                )}
             </div>

             <div className="w-full flex-1 flex flex-col items-center justify-center min-h-[600px] bg-gray-100/50 rounded-[40px] border-4 border-dashed border-gray-200 relative overflow-hidden group">
                <AnimatePresence mode="wait">
                  {selectedStudents.length > 0 ? (
                    <div className="p-10 w-full flex flex-col items-center gap-20 overflow-y-auto max-h-[800px] no-scrollbar py-20 animate-in zoom-in-95 duration-500">
                      {selectedStudents.map(studentId => {
                         const student = students.find(s => s.id === studentId);
                         if (!student) return null;
                         return (
                           <div key={studentId} className="flex flex-col items-center gap-4 group/card">
                             <div className="bg-white rounded-3xl shadow-2xl p-2 border-4 border-white transform transition-all group-hover/card:scale-[1.01]">
                                {activeTab === 'id_card' && renderIDCard(student)}
                                {activeTab === 'certificate' && renderCertificate(student)}
                                {activeTab === 'testimonial' && renderTestimonial(student)}
                                {activeTab === 'admit_card' && renderAdmitCard(student)}
                             </div>
                             <div className="flex items-center gap-2 opacity-0 group-hover/card:opacity-100 transition-all translate-y-2 group-hover/card:translate-y-0">
                               <span className="text-[10px] font-black bg-white px-3 py-1 rounded-full shadow-sm text-gray-500 border border-gray-100">
                                 ফাইল: {activeTab.toUpperCase()}_{student.name.toUpperCase()}
                               </span>
                               <button 
                                 onClick={() => downloadCard(student.id, student.name)}
                                 className="p-2 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 shadow-xl"
                               >
                                 <Download className="w-4 h-4" />
                               </button>
                             </div>
                           </div>
                         );
                      })}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center text-center space-y-4 px-10 animate-in fade-in duration-700">
                       <div className="w-24 h-24 bg-white rounded-[2rem] shadow-xl flex items-center justify-center mb-4 group-hover:rotate-12 transition-transform">
                          <Layout className="w-12 h-12 text-gray-300" />
                       </div>
                       <h3 className="text-2xl font-black text-gray-900 tracking-tight">তৈরি করতে প্রস্তুত?</h3>
                       <p className="text-gray-400 max-w-sm font-medium">কার্ড বা সার্টিফিকেট প্রিভিউ দেখতে বাম প্যানেল থেকে এক বা একাধিক ছাত্র-ছাত্রী সিলেক্ট করুন।</p>
                       <div className="flex items-center gap-2 mt-8">
                          <BadgeCheck className="w-5 h-5 text-emerald-500" />
                          <span className="text-xs font-bold text-gray-400 uppercase tracking-widest leading-none">অটো-সিঙ্ক স্টুডেন্ট ডাটা</span>
                       </div>
                    </div>
                  )}
                </AnimatePresence>

                {/* Decorative Elements */}
                <div className="absolute top-0 left-0 w-32 h-32 bg-indigo-600/5 rounded-br-[100px] -z-10"></div>
                <div className="absolute bottom-0 right-0 w-48 h-48 bg-amber-500/5 rounded-tl-[200px] -z-10"></div>
             </div>
          </div>
        </div>
      )}
    </div>
  );
}
