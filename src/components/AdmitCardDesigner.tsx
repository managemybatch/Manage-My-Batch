import React, { useState, useRef, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { 
  Palette, Layout, Layers, Settings, User, 
  CheckCircle, Plus, Loader2, Sparkles, Monitor,
  Smartphone, FileText, Trash2, Edit2, Code,
  Type, Image as ImageIcon, RotateCcw, ShieldCheck,
  Download, Printer, ChevronRight, ChevronLeft,
  BookOpen, Clock, Calendar, CheckSquare, XCircle, AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { useTranslation } from 'react-i18next';

interface Student {
  id: string;
  name: string;
  rollNo: string;
  photoUrl?: string;
  batchName?: string;
  grade?: string;
  studentId?: string;
}

interface AdmitCardDesignerProps {
  students: Student[];
  exam: any;
  institution: any;
  onClose?: () => void;
}

type CardDesign = 'modern' | 'classic' | 'islamic' | 'professional' | 'vibrant';

interface DesignerConfig {
  design: CardDesign;
  primaryColor: string;
  secondaryColor: string;
  textColor: string;
  institutionNameColor: string;
  showBack: boolean;
  showPhoto: boolean;
  showQR: boolean;
  examTitle: string;
  examSubtitle: string;
  reportingTime: string;
  examDate: string;
  rules: string;
  nbNote: string;
  authSign1: string;
  authSign2: string;
  authSign3: string;
  labelName: string;
  labelRoll: string;
  labelId: string;
  labelClass: string;
  labelSection: string;
  labelBatch: string;
  labelSession: string;
  institutionNameOverride: string;
}

const DEFAULT_RULES = [
  '1. Candidates must bring this Admit Card to every examination session.',
  '2. Candidates should be present at the examination hall 15 minutes before the start.',
  '3. No candidate will be allowed to enter the hall after 30 minutes of the start.',
  '4. Use of mobile phones, calculators, or any electronic devices is strictly prohibited.',
  '5. Candidates must use only black or blue ballpoint pens for writing.',
  '6. Any form of misconduct will lead to immediate cancellation of the candidate\'s exam.',
  '7. Check your seat number and sit accordingly.',
  '8. Maintain silence inside the examination hall.',
  '9. Hand over the answer sheet to the invigilator before leaving the hall.',
  '10. Admit Card must be kept in good condition.'
].join('\n');

const DEFAULT_CONFIG: DesignerConfig = {
  design: 'modern',
  primaryColor: '#4f46e5',
  secondaryColor: '#f3f4f6',
  textColor: '#111827',
  institutionNameColor: '#4f46e5',
  showBack: true,
  showPhoto: true,
  showQR: true,
  examTitle: '',
  examSubtitle: 'Official Admit Card',
  reportingTime: '09:30 AM',
  examDate: '',
  rules: DEFAULT_RULES,
  nbNote: 'N.B: This Admit Card must be carried in the exam hall. Without this card no one will be allowed to sit for the exam.',
  authSign1: 'Candidate Signature',
  authSign2: 'Class Teacher',
  authSign3: 'Principal',
  labelName: 'Student Name',
  labelRoll: 'Roll No',
  labelId: 'Student ID',
  labelClass: 'Class',
  labelSection: 'Section',
  labelBatch: 'Batch/Group',
  labelSession: 'Session',
  institutionNameOverride: '',
};

export function AdmitCardDesigner({ students, exam, institution, onClose }: AdmitCardDesignerProps) {
  const { t } = useTranslation();
  const [config, setConfig] = useState<DesignerConfig>(() => {
    const saved = localStorage.getItem(`admit_designer_config_${institution?.id || 'default'}`);
    if (saved) {
      return { 
        ...DEFAULT_CONFIG, 
        ...JSON.parse(saved),
        examTitle: DEFAULT_CONFIG.examTitle || exam?.title || 'ANNUAL EXAMINATION',
        examDate: DEFAULT_CONFIG.examDate || (exam?.date ? new Date(exam.date).toLocaleDateString() : 'As per Schedule')
      };
    }
    return { 
      ...DEFAULT_CONFIG, 
      examTitle: exam?.title || 'ANNUAL EXAMINATION',
      examDate: exam?.date ? new Date(exam.date).toLocaleDateString() : 'As per Schedule',
      primaryColor: institution?.primaryColor || DEFAULT_CONFIG.primaryColor
    };
  });

  const [activeTab, setActiveTab] = useState<'design' | 'content' | 'rules'>('design');
  const [previewStudentIdx, setPreviewStudentIdx] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showBackPreview, setShowBackPreview] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    localStorage.setItem(`admit_designer_config_${institution?.id || 'default'}`, JSON.stringify(config));
  }, [config, institution?.id]);

  const previewStudent = students[previewStudentIdx] || students[0];

  const handleDownloadPDF = async () => {
    if (!printRef.current || isGenerating) return;
    setIsGenerating(true);

    try {
      const pdf = new jsPDF('p', 'mm', 'a4');
      const cardsPerPage = 2; // Front and Back usually or 2 students
      
      // For simplicity, we'll render each student's card (front & back)
      for (let i = 0; i < students.length; i++) {
        if (i > 0) pdf.addPage();
        
        // Render Front
        const frontId = `admit-front-${students[i].id}`;
        const frontEl = document.getElementById(frontId);
        if (frontEl) {
          const canvas = await html2canvas(frontEl, { scale: 2, useCORS: true });
          const imgData = canvas.toDataURL('image/png');
          pdf.addImage(imgData, 'PNG', 10, 10, 190, 130);
        }

        // Render Back if enabled
        if (config.showBack) {
          const backId = `admit-back-${students[i].id}`;
          const backEl = document.getElementById(backId);
          if (backEl) {
            const canvas = await html2canvas(backEl, { scale: 2, useCORS: true });
            const imgData = canvas.toDataURL('image/png');
            pdf.addImage(imgData, 'PNG', 10, 150, 190, 130);
          }
        }
      }
      
      pdf.save(`Admit_Cards_${exam?.title || 'Exam'}.pdf`);
    } catch (error) {
      console.error('PDF Generation Error:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const CardFront = ({ student, className }: { student: Student, className?: string }) => {
    const cardRef = useRef<HTMLDivElement>(null);
    const instName = config.institutionNameOverride || institution?.name || 'INSTITUTION NAME';

    return (
      <div 
        id={`admit-front-${student.id}`}
        className={cn(
          "w-full h-[130mm] bg-white border relative overflow-hidden flex flex-col p-8 transition-all print:border-0",
          config.design === 'modern' && "rounded-[2rem] border-t-[12px]",
          config.design === 'classic' && "border-[10px] border-double",
          config.design === 'islamic' && "border-[15px] border-double",
          config.design === 'professional' && "border-2",
          config.design === 'vibrant' && "border-0 shadow-xl",
          className
        )}
        style={{ 
          borderColor: config.primaryColor,
          borderTopColor: config.primaryColor 
        }}
      >
        {/* Background Decorative patterns */}
        <div className="absolute inset-0 pointer-events-none opacity-[0.03]" style={{ 
          backgroundImage: config.design === 'classic' ? `radial-gradient(circle at 1px 1px, ${config.primaryColor} 1px, transparent 0)` : 'none',
          backgroundSize: '20px 20px'
        }}></div>

        {/* Header */}
        <div className="relative z-10 flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            {institution?.logoURL && (
              <img src={institution.logoURL} className="w-16 h-16 object-contain rounded-lg shadow-sm" referrerPolicy="no-referrer" />
            )}
            <div>
              <h1 className="text-2xl font-black uppercase tracking-tight" style={{ color: config.institutionNameColor }}>{instName}</h1>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.3em]">{institution?.address || 'Official Examination Center'}</p>
            </div>
          </div>
          <div className="text-right">
            <div className="inline-block px-3 py-1 bg-gray-900 text-white text-[9px] font-black uppercase tracking-widest rounded-full mb-1">
              ADMIT CARD
            </div>
            {config.showQR && (
              <div className="flex justify-end mt-1">
                <QRCodeSVG value={student.id} size={30} />
              </div>
            )}
          </div>
        </div>

        {/* Watermark Logo */}
        {institution?.logoURL && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.04]">
            <img src={institution.logoURL} className="w-64 h-64 grayscale object-contain rotate-[-15deg]" />
          </div>
        )}

        {/* Exam Title */}
        <div className="relative z-10 text-center mb-6 py-2 border-y border-dashed border-gray-100">
          <h2 className="text-xl font-black text-gray-800 uppercase tracking-wide">{config.examTitle}</h2>
          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em]">{config.examSubtitle}</p>
        </div>

        {/* Content Body */}
        <div className="relative z-10 flex-1 flex gap-8">
          {/* Info Side */}
          <div className="flex-1 grid grid-cols-2 gap-y-4 gap-x-6">
            <div className="col-span-2 border-b pb-1 border-gray-50">
              <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">{config.labelName}</p>
              <p className="text-lg font-black text-gray-900 uppercase truncate">{student.name}</p>
            </div>
            
            <div>
              <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">{config.labelRoll}</p>
              <p className="text-base font-black text-indigo-600">{student.rollNo}</p>
            </div>
            <div>
              <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">{config.labelId}</p>
              <p className="text-base font-black text-gray-900">{student.studentId || student.rollNo}</p>
            </div>

            <div>
              <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">{config.labelClass}</p>
              <p className="text-sm font-bold text-gray-700">{student.grade || 'N/A'}</p>
            </div>
            <div>
              <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">{config.labelBatch}</p>
              <p className="text-sm font-bold text-gray-700">{student.batchName || 'N/A'}</p>
            </div>

            <div className="mt-2 col-span-2 grid grid-cols-2 gap-4">
               <div className="flex items-center gap-2 text-[9px] font-bold text-gray-500 uppercase">
                  <Clock className="w-3.5 h-3.5 text-gray-400" />
                  Time: {config.reportingTime}
               </div>
               <div className="flex items-center gap-2 text-[9px] font-bold text-gray-500 uppercase">
                  <Calendar className="w-3.5 h-3.5 text-gray-400" />
                  Date: {config.examDate}
               </div>
            </div>
          </div>

          {/* Photo Side */}
          {config.showPhoto && (
            <div className="shrink-0 flex flex-col items-center">
               <div className={cn(
                 "w-36 h-36 border-4 flex items-center justify-center bg-gray-50 overflow-hidden shadow-inner",
                 config.design === 'modern' ? "rounded-[2rem]" : "rounded-none"
               )} style={{ borderColor: config.primaryColor + '20' }}>
                 {student.photoUrl ? (
                   <img src={student.photoUrl} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                 ) : (
                   <User className="w-16 h-16 text-gray-200" />
                 )}
               </div>
               <p className="text-[7px] font-bold text-gray-300 uppercase tracking-[0.3em] mt-2">PHOTO BOX</p>
            </div>
          )}
        </div>

        {/* Footer / Signs */}
        <div className="relative z-10 mt-auto">
          <div className="grid grid-cols-3 gap-8 mb-4">
             <div className="text-center pt-2 border-t border-gray-900 border-opacity-20">
                <p className="text-[8px] font-black uppercase tracking-tighter text-gray-400">{config.authSign1}</p>
             </div>
             <div className="text-center pt-2 border-t border-gray-900 border-opacity-20">
                <p className="text-[8px] font-black uppercase tracking-tighter text-gray-400">{config.authSign2}</p>
             </div>
             <div className="text-center pt-2 border-t border-gray-900 border-opacity-20">
                <p className="text-[8px] font-black uppercase tracking-tighter text-gray-400">{config.authSign3}</p>
             </div>
          </div>
          <div className="bg-gray-50 p-2 rounded-lg border border-gray-100">
             <p className="text-[8px] text-gray-500 font-medium leading-tight">
               <strong className="text-rose-500 mr-1">N.B:</strong> {config.nbNote}
             </p>
          </div>
        </div>

        {/* Bottom Branding Bar */}
        <div className="absolute bottom-0 left-0 right-0 h-1" style={{ backgroundColor: config.primaryColor }}></div>
      </div>
    );
  };

  const CardBack = ({ student, className }: { student: Student, className?: string }) => {
    const instName = config.institutionNameOverride || institution?.name || 'INSTITUTION NAME';
    return (
      <div 
        id={`admit-back-${student.id}`}
        className={cn(
          "w-full h-[130mm] bg-white border relative overflow-hidden flex flex-col p-8 transition-all print:border-0",
          config.design === 'modern' && "rounded-[2rem]",
          config.design === 'classic' && "border-[10px] border-double",
          config.design === 'islamic' && "border-[15px] border-double",
          config.design === 'professional' && "border-2",
          config.design === 'vibrant' && "border-0 shadow-xl",
          className
        )}
        style={{ borderColor: config.primaryColor }}
      >
        {/* Header Back */}
        <div className="text-center mb-6">
           <h3 className="text-sm font-black uppercase tracking-[0.3em]" style={{ color: config.primaryColor }}>Rules & Regulations</h3>
           <div className="mt-1 h-0.5 w-16 mx-auto rounded-full" style={{ backgroundColor: config.primaryColor }}></div>
        </div>

        <div className="relative z-10 flex-1 bg-gray-50/50 rounded-2xl p-6 border border-gray-100">
          <div className="space-y-3">
             {config.rules.split('\n').map((rule, idx) => (
                <p key={idx} className="text-[10px] text-gray-600 font-bold leading-relaxed flex items-start gap-2">
                   <div className="w-1 h-1 rounded-full bg-gray-300 mt-1.5 shrink-0" />
                   {rule}
                </p>
             ))}
          </div>
        </div>

        <div className="mt-6 flex items-center justify-between italic text-[8px] text-gray-400 font-medium">
           <p>{instName} System Document • {new Date().getFullYear()}</p>
           <p>Printed on: {new Date().toLocaleDateString()}</p>
        </div>

        {/* Decorative corner */}
        <div className="absolute top-0 right-0 w-24 h-24 rotate-45 translate-x-12 -translate-y-12 opacity-5 pointer-events-none" style={{ backgroundColor: config.primaryColor }}></div>
        <div className="absolute bottom-0 left-0 w-24 h-24 rotate-45 -translate-x-12 translate-y-12 opacity-5 pointer-events-none" style={{ backgroundColor: config.primaryColor }}></div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col lg:flex-row bg-gray-900/40 backdrop-blur-sm overflow-hidden">
      {/* Sidebar - Options */}
      <motion.div 
        initial={{ x: -100, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        className="w-full lg:w-96 bg-white border-r h-full flex flex-col shadow-2xl relative z-20"
      >
        <div className="p-4 lg:p-6 border-b flex items-center justify-between bg-indigo-600">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 rounded-xl">
               <ShieldCheck className="w-6 h-6 text-white" />
            </div>
            <div>
               <h2 className="text-lg font-black text-white leading-none capitalize">{activeTab} Details</h2>
               <p className="text-[10px] font-bold text-white/60 tracking-widest uppercase mt-1">Admit Card Designer</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 text-white rounded-xl transition-all">
            <XCircle className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 lg:px-6 py-6 lg:py-8 space-y-6 lg:space-y-8 scrollbar-hide">
          {/* Design Mode Tabs */}
          <div className="flex p-1 bg-gray-100 rounded-xl">
             {['design', 'content', 'rules'].map(tab => (
                <button
                   key={tab}
                   onClick={() => setActiveTab(tab as any)}
                   className={cn(
                      "flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all",
                      activeTab === tab ? "bg-white text-indigo-600 shadow-sm" : "text-gray-500 hover:text-gray-900"
                   )}
                >
                   {tab}
                </button>
             ))}
          </div>

          <AnimatePresence mode="wait">
             {activeTab === 'design' && (
                <motion.div
                   key="tab-design"
                   initial={{ opacity: 0, y: 10 }}
                   animate={{ opacity: 1, y: 0 }}
                   exit={{ opacity: 0, y: -10 }}
                   className="space-y-6 lg:space-y-8"
                >
                   {/* Layout Selection */}
                   <div className="space-y-4">
                      <label className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] flex items-center gap-2">
                         <Layout className="w-3.5 h-3.5" /> Template Layout
                      </label>
                      <div className="grid grid-cols-2 gap-3">
                         {(['modern', 'classic', 'islamic', 'professional', 'vibrant'] as CardDesign[]).map(d => (
                            <button
                               key={d}
                               onClick={() => setConfig({...config, design: d})}
                               className={cn(
                                  "py-3 px-4 rounded-2xl border-2 text-xs font-bold capitalize transition-all",
                                  config.design === d ? "bg-indigo-50 border-indigo-600 text-indigo-600" : "bg-white border-gray-100 text-gray-500 hover:border-indigo-100"
                               )}
                            >
                               {d}
                            </button>
                         ))}
                      </div>
                   </div>

                   {/* Color Customization */}
                   <div className="space-y-4">
                      <label className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] flex items-center gap-2">
                         <Palette className="w-3.5 h-3.5" /> Brand Identity
                      </label>
                      <div className="space-y-4">
                         <div>
                            <p className="text-[10px] font-bold text-gray-400 uppercase mb-2">Primary Color</p>
                            <div className="flex flex-wrap gap-2">
                               {['#4f46e5', '#f97316', '#059669', '#dc2626', '#111827', '#7c3aed', '#db2777'].map(color => (
                                  <button
                                     key={color}
                                     onClick={() => setConfig({...config, primaryColor: color})}
                                     className={cn(
                                        "w-8 h-8 rounded-full border-2 transition-all",
                                        config.primaryColor === color ? "border-indigo-600 ring-2 ring-indigo-100 scale-110" : "border-transparent"
                                     )}
                                     style={{ backgroundColor: color }}
                                  />
                               ))}
                               <div className="relative">
                                  <input 
                                     type="color" 
                                     value={config.primaryColor}
                                     onChange={(e) => setConfig({...config, primaryColor: e.target.value})}
                                     className="w-8 h-8 rounded-full cursor-pointer border-2 border-gray-100" 
                                  />
                                </div>
                            </div>
                         </div>
                         <div>
                            <p className="text-[10px] font-bold text-gray-400 uppercase mb-2">Inst. Name Color</p>
                            <div className="flex flex-wrap gap-2">
                               {['#111827', '#4f46e5', '#374151', '#059669'].map(color => (
                                  <button
                                     key={color}
                                     onClick={() => setConfig({...config, institutionNameColor: color})}
                                     className={cn(
                                        "w-8 h-8 rounded-full border-2 transition-all",
                                        config.institutionNameColor === color ? "border-indigo-600 ring-2 ring-indigo-100 scale-110" : "border-transparent"
                                     )}
                                     style={{ backgroundColor: color }}
                                  />
                               ))}
                            </div>
                         </div>
                      </div>
                   </div>

                   {/* Toggle Options */}
                   <div className="space-y-4">
                      <label className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] flex items-center gap-2">
                         <Layers className="w-3.5 h-3.5" /> Component Toggles
                      </label>
                      <div className="space-y-2 p-4 bg-gray-50 rounded-2xl">
                         <ToggleOption 
                            label="Show Back Side (Rules)" 
                            value={config.showBack} 
                            onChange={() => setConfig({...config, showBack: !config.showBack})} 
                         />
                         <ToggleOption 
                            label="Show Student Photo" 
                            value={config.showPhoto} 
                            onChange={() => setConfig({...config, showPhoto: !config.showPhoto})} 
                         />
                         <ToggleOption 
                            label="Show QR Security Code" 
                            value={config.showQR} 
                            onChange={() => setConfig({...config, showQR: !config.showQR})} 
                         />
                      </div>
                   </div>
                </motion.div>
             )}

             {activeTab === 'content' && (
                <motion.div
                   key="tab-content"
                   initial={{ opacity: 0, y: 10 }}
                   animate={{ opacity: 1, y: 0 }}
                   exit={{ opacity: 0, y: -10 }}
                   className="space-y-6"
                >
                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Exam Title</label>
                      <input 
                         type="text" 
                         value={config.examTitle}
                         onChange={(e) => setConfig({...config, examTitle: e.target.value.toUpperCase()})}
                         className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-100"
                      />
                   </div>
                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Subtitle Text</label>
                      <input 
                         type="text" 
                         value={config.examSubtitle}
                         onChange={(e) => setConfig({...config, examSubtitle: e.target.value})}
                         className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-100"
                      />
                   </div>
                   <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                         <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Ref/Date</label>
                         <input 
                            type="text" 
                            value={config.examDate}
                            onChange={(e) => setConfig({...config, examDate: e.target.value})}
                            className="w-full px-3 py-2 bg-gray-50 border border-gray-100 rounded-xl text-xs font-bold focus:outline-none"
                         />
                      </div>
                      <div className="space-y-2">
                         <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Report Time</label>
                         <input 
                            type="text" 
                            value={config.reportingTime}
                            onChange={(e) => setConfig({...config, reportingTime: e.target.value})}
                            className="w-full px-3 py-2 bg-gray-50 border border-gray-100 rounded-xl text-xs font-bold focus:outline-none"
                         />
                      </div>
                   </div>
                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">NB Note</label>
                      <textarea 
                         value={config.nbNote}
                         onChange={(e) => setConfig({...config, nbNote: e.target.value})}
                         rows={2}
                         className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-100 resize-none"
                      />
                   </div>
                   <div className="space-y-4 pt-4 border-t">
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Signature Titles</p>
                      <div className="space-y-3">
                         <input 
                            type="text" 
                            placeholder="Sign 1 (Left)"
                            value={config.authSign1}
                            onChange={(e) => setConfig({...config, authSign1: e.target.value})}
                            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-xs font-bold"
                         />
                         <input 
                            type="text" 
                            placeholder="Sign 2 (Middle)"
                            value={config.authSign2}
                            onChange={(e) => setConfig({...config, authSign2: e.target.value})}
                            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-xs font-bold"
                         />
                         <input 
                            type="text" 
                            placeholder="Sign 3 (Right)"
                            value={config.authSign3}
                            onChange={(e) => setConfig({...config, authSign3: e.target.value})}
                            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-xs font-bold"
                         />
                      </div>
                   </div>
                </motion.div>
             )}

             {activeTab === 'rules' && (
                <motion.div
                   key="tab-rules"
                   initial={{ opacity: 0, y: 10 }}
                   animate={{ opacity: 1, y: 0 }}
                   exit={{ opacity: 0, y: -10 }}
                   className="space-y-4"
                >
                   <div className="p-4 bg-indigo-50 text-indigo-600 rounded-2xl flex gap-3 text-[10px] font-medium">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      Lines entered here will appear as a bulleted list on the back side.
                   </div>
                   <textarea
                      value={config.rules}
                      onChange={(e) => setConfig({...config, rules: e.target.value})}
                      rows={12}
                      className="w-full px-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-xs font-bold leading-relaxed focus:outline-none focus:ring-2 focus:ring-indigo-100 scrollbar-hide"
                      placeholder="Enter each rule in a new line..."
                   />
                </motion.div>
             )}
          </AnimatePresence>
        </div>

        <div className="p-4 lg:p-6 border-t bg-gray-50">
          <button
            onClick={handleDownloadPDF}
            disabled={isGenerating || students.length === 0}
            className="w-full py-3 lg:py-4 bg-indigo-600 text-white rounded-2xl font-black shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all flex items-center justify-center gap-3 disabled:opacity-50 text-sm lg:text-base"
          >
            {isGenerating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
            Generate {students.length} Cards
          </button>
        </div>
      </motion.div>

      {/* Preview Area */}
      <div className="flex-1 overflow-y-auto bg-gray-100/50 flex flex-col items-center">
         <div className="w-full max-w-5xl px-4 lg:px-12 py-8 lg:py-12 space-y-6 lg:space-y-8">
            {/* Preview Controls */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
               <h3 className="text-xl lg:text-2xl font-black text-gray-900 tracking-tight">Interactive Preview</h3>
               <div className="flex items-center gap-4 bg-white p-2 rounded-2xl shadow-sm border border-gray-100 w-fit">
                  <button 
                    onClick={() => setShowBackPreview(false)}
                    className={cn(
                      "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                      !showBackPreview ? "bg-indigo-600 text-white shadow-md shadow-indigo-100" : "text-gray-400 hover:text-gray-600"
                    )}
                  >
                     Front Side
                  </button>
                  <button 
                    onClick={() => setShowBackPreview(true)}
                    className={cn(
                      "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                      showBackPreview ? "bg-indigo-600 text-white shadow-md shadow-indigo-100" : "text-gray-400 hover:text-gray-600"
                    )}
                  >
                     Back Side
                  </button>
               </div>
            </div>

            {/* Scale Adjuster (for visibility) */}
            <div className="flex justify-center relative bg-white rounded-[2.5rem] p-8 lg:p-12 border border-gray-100 shadow-xl overflow-hidden min-h-[400px]">
               <div className="hidden lg:flex absolute top-4 left-4 items-center gap-2 p-3 bg-gray-50 rounded-2xl border border-gray-100 z-10">
                  <Monitor className="w-4 h-4 text-gray-400" />
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Full Quality Preview</span>
               </div>

               <div className="scale-[0.6] sm:scale-[0.8] md:scale-[0.9] lg:scale-[1.0] xl:scale-[1.1] origin-top transition-transform duration-500 flex flex-col items-center">
                  {showBackPreview ? (
                    <CardBack student={previewStudent} />
                  ) : (
                    <CardFront student={previewStudent} />
                  )}
               </div>

               {/* Navigation Buttons */}
               <div className="absolute top-1/2 -translate-y-1/2 left-4 lg:left-8 z-10">
                  <button 
                    onClick={() => setPreviewStudentIdx(prev => Math.max(0, prev - 1))}
                    disabled={previewStudentIdx === 0}
                    className="p-3 lg:p-4 bg-white text-indigo-600 rounded-full shadow-2xl hover:scale-110 active:scale-95 transition-all disabled:opacity-30 border border-gray-100"
                  >
                    <ChevronLeft className="w-5 lg:w-6 h-5 lg:h-6" />
                  </button>
               </div>
               <div className="absolute top-1/2 -translate-y-1/2 right-4 lg:right-8 z-10">
                  <button 
                    onClick={() => setPreviewStudentIdx(prev => Math.min(students.length - 1, prev + 1))}
                    disabled={previewStudentIdx === students.length - 1}
                    className="p-3 lg:p-4 bg-white text-indigo-600 rounded-full shadow-2xl hover:scale-110 active:scale-95 transition-all disabled:opacity-30 border border-gray-100"
                  >
                    <ChevronRight className="w-5 lg:w-6 h-5 lg:h-6" />
                  </button>
               </div>
            </div>

            <div className="text-center bg-white/50 backdrop-blur-sm p-4 rounded-2xl border border-white">
               <p className="text-xs lg:text-sm font-bold text-gray-500 uppercase tracking-widest">
                  Previewing Student: {previewStudentIdx + 1} of {students.length}
               </p>
               <p className="text-[10px] text-gray-400 font-medium mt-1">
                  Standard Resolution: 130mm x 190mm • Print Output will be High Quality (2x Scale)
               </p>
            </div>
         </div>

         {/* Off-screen actual printing area */}
         <div className="fixed left-[-9999px] top-0 pointer-events-none p-10 bg-white" ref={printRef}>
            {students.map((student) => (
               <React.Fragment key={student.id}>
                  <CardFront student={student} className="mb-20" />
                  {config.showBack && <CardBack student={student} className="mb-20" />}
               </React.Fragment>
            ))}
         </div>
      </div>
    </div>
  );
};

const ToggleOption = ({ label, value, onChange }: { label: string, value: boolean, onChange: () => void }) => (
  <div className="flex items-center justify-between py-1">
    <span className="text-[10px] font-bold text-gray-500 uppercase">{label}</span>
    <button 
      onClick={onChange}
      className={cn("w-10 h-5 rounded-full relative transition-colors duration-300", value ? "bg-indigo-600" : "bg-gray-300")}
    >
        <div className={cn("absolute top-1 w-3 h-3 bg-white rounded-full transition-all duration-300", value ? "left-6" : "left-1")}></div>
    </button>
  </div>
);
