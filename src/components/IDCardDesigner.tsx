import React, { useState, useRef, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import Barcode from 'react-barcode';
import { 
  CreditCard, Copy, Download, Search, Filter, 
  Palette, Layout, Layers, Settings, User, 
  CheckCircle, Plus, Loader2, Sparkles, Monitor,
  Smartphone, FileText, Trash2, Edit2, Code,
  Type, Image as ImageIcon, RotateCcw, ShieldCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

interface Student {
  id: string;
  name: string;
  rollNo: string;
  photoUrl?: string;
  batchName: string;
  grade?: string;
  address?: string;
  guardianPhone: string;
  fatherName?: string;
}

interface IDCardDesignerProps {
  students: Student[];
  institution: any;
  onClose?: () => void;
}

type CardDesign = 'modern' | 'professional' | 'minimal' | 'classic' | 'vibrant' | 'custom_code' | 'custom_bg';

interface DesignerConfig {
  design: CardDesign;
  primaryColor: string;
  size: 'cr80_p' | 'cr80_l';
  showBack: boolean;
  showQR: boolean;
  showBarcode: boolean;
  customCode: string;
  customBgUrl: string;
  textColor: string;
  secondaryColor: string;
  expiryDate: string;
  expiryLabel: string;
  institutionNameColor: string;
  footerTextColor: string;
  terms: string;
  institutionNameOverride: string;
  labelId: string;
  labelRoll: string;
  labelBatch: string;
  labelPhone: string;
  labelDesignation: string;
}

const DEFAULT_TERMS = [
  'This card is the property of the institution.',
  'If found, please return to the office address.',
  'Damage to the card may require a reissue fee.',
  'Keep away from strong magnetic fields.',
  'This card must be visible while on premises.'
].join('\n');

const DEFAULT_CONFIG: DesignerConfig = {
  design: 'modern',
  primaryColor: '#f97316',
  secondaryColor: '#ffffff',
  textColor: '#1f2937',
  size: 'cr80_p',
  showBack: true,
  showQR: true,
  showBarcode: true,
  customCode: ``,
  customBgUrl: '',
  expiryDate: 'Dec 2026',
  expiryLabel: 'Valid Thru',
  institutionNameColor: '#ffffff',
  footerTextColor: '#9ca3af',
  terms: DEFAULT_TERMS,
  institutionNameOverride: '',
  labelId: 'ID NO',
  labelRoll: 'ROLL',
  labelBatch: 'BATCH',
  labelPhone: 'PHONE',
  labelDesignation: 'STUDENT',
};

export function IDCardDesigner({ students, institution }: IDCardDesignerProps) {
  const [config, setConfig] = useState<DesignerConfig>(() => {
    try {
      const saved = localStorage.getItem(`id_designer_config_${institution?.id || 'default'}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        // Merge with DEFAULT_CONFIG to ensure new properties are present
        return { ...DEFAULT_CONFIG, ...parsed, primaryColor: parsed.primaryColor || institution?.primaryColor || DEFAULT_CONFIG.primaryColor };
      }
    } catch (e) {
      console.error('Error loading ID designer config:', e);
    }
    return { ...DEFAULT_CONFIG, primaryColor: institution?.primaryColor || DEFAULT_CONFIG.primaryColor };
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBatch, setSelectedBatch] = useState('');
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [previewStudent, setPreviewStudent] = useState<Student | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const backRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (institution?.id) {
      localStorage.setItem(`id_designer_config_${institution.id}`, JSON.stringify(config));
    }
  }, [config, institution?.id]);

  useEffect(() => {
    if (students.length > 0 && !previewStudent) {
      setPreviewStudent(students[0]);
    }
  }, [students, previewStudent]);

  const batches = Array.from(new Set(students.map(s => s.batchName))).filter(Boolean);

  const filtered = students.filter(s => {
    const name = s.name || '';
    const roll = String(s.rollNo || '');
    const matchesSearch = name.toLowerCase().includes(searchTerm.toLowerCase()) || roll.includes(searchTerm);
    const matchesBatch = selectedBatch ? s.batchName === selectedBatch : true;
    return matchesSearch && matchesBatch;
  });

  const toggleAll = () => {
    if (selectedStudents.length === filtered.length) {
      setSelectedStudents([]);
    } else {
      setSelectedStudents(filtered.map(s => s.id));
    }
  };

  const handleDownloadPDF = async () => {
    if (selectedStudents.length === 0) {
      alert('Please select at least one student.');
      return;
    }

    setIsGenerating(true);
    try {
      const pdf = new jsPDF({
        orientation: config.size === 'cr80_p' ? 'portrait' : 'landscape',
        unit: 'mm',
        format: config.size === 'cr80_p' ? [54, 85.6] : [85.6, 54]
      });

      const studentsToPrint = students.filter(s => selectedStudents.includes(s.id));

      for (let i = 0; i < studentsToPrint.length; i++) {
        const student = studentsToPrint[i];
        setPreviewStudent(student);
        
        // Wait for state update and re-render
        await new Promise(r => setTimeout(r, 100));

        if (i > 0) pdf.addPage();

        // Capture Front
        if (cardRef.current) {
          const canvas = await html2canvas(cardRef.current, { scale: 3, useCORS: true });
          const imgData = canvas.toDataURL('image/png');
          const width = config.size === 'cr80_p' ? 54 : 85.6;
          const height = config.size === 'cr80_p' ? 85.6 : 54;
          pdf.addImage(imgData, 'PNG', 0, 0, width, height);
        }

        // Capture Back if enabled
        if (config.showBack && backRef.current) {
          pdf.addPage();
          const canvasBack = await html2canvas(backRef.current, { scale: 3, useCORS: true });
          const imgDataBack = canvasBack.toDataURL('image/png');
          const width = config.size === 'cr80_p' ? 54 : 85.6;
          const height = config.size === 'cr80_p' ? 85.6 : 54;
          pdf.addImage(imgDataBack, 'PNG', 0, 0, width, height);
        }
      }

      pdf.save(`ID_Cards_${new Date().getTime()}.pdf`);
    } catch (err) {
      console.error(err);
      alert('Failed to generate PDF. Check console for details.');
    } finally {
      setIsGenerating(false);
    }
  };

  const replacePlaceholders = (html: string, student: Student | null) => {
    if (!student || !html) return html || '';
    return html
      .replace(/{{STUDENT_NAME}}/g, student.name || '')
      .replace(/{{STUDENT_ROLL}}/g, String(student.rollNo || ''))
      .replace(/{{STUDENT_BATCH}}/g, student.batchName || '')
      .replace(/{{STUDENT_GRADE}}/g, student.grade || 'N/A')
      .replace(/{{STUDENT_PHONE}}/g, student.guardianPhone || '')
      .replace(/{{STUDENT_PHOTO}}/g, student.photoUrl || 'https://via.placeholder.com/150')
      .replace(/{{INSTITUTION_NAME}}/g, config.institutionNameOverride || institution?.name || 'INSTITUTION NAME')
      .replace(/{{INSTITUTION_NAME_INITIAL}}/g, (config.institutionNameOverride || institution?.name || 'I')[0])
      .replace(/{{INSTITUTION_LOGO}}/g, institution?.logoURL || '')
      .replace(/{{EXPIRY}}/g, config.expiryDate || '');
  };

  const renderCurrentDesign = (student: Student | null) => {
    if (!student) return null;

    const width = config.size === 'cr80_p' ? '216px' : '342.4px';
    const height = config.size === 'cr80_p' ? '342.4px' : '216px';

    const cardStyles = {
      width,
      height,
      backgroundColor: '#ffffff',
      fontFamily: "'Inter', sans-serif",
      position: 'relative' as const,
      overflow: 'hidden',
      color: config.textColor
    };

    if (config.design === 'custom_code') {
      return (
        <div 
          ref={cardRef} 
          style={cardStyles}
          dangerouslySetInnerHTML={{ __html: replacePlaceholders(config.customCode, student) }}
        />
      );
    }

    if (config.design === 'modern') {
      const instName = config.institutionNameOverride || institution?.name || 'INSTITUTION NAME';
      return (
        <div ref={cardRef} style={cardStyles} className="bg-white group/preview select-none pointer-events-none">
          {/* Wave Background */}
          <div 
            className="absolute top-0 left-0 w-full h-1/2" 
            style={{ 
              backgroundColor: config.primaryColor,
              clipPath: config.size === 'cr80_p' ? 'polygon(0 0, 100% 0, 100% 60%, 0 85%)' : 'polygon(0 0, 100% 0, 100% 70%, 0 95%)'
            }} 
          />
          
          <div className={cn(
            "relative z-10 flex px-4 h-full",
            config.size === 'cr80_p' ? "flex-col items-center pt-8" : "flex-row items-center justify-between py-6 gap-6"
          )}>
            <div className={cn(
              "flex flex-col items-center gap-2",
              config.size === 'cr80_p' ? "mb-4" : "mb-0 shrink-0 w-1/3"
            )}>
               {institution?.logoURL ? (
                 <img src={institution.logoURL} className="w-12 h-12 object-contain bg-white rounded-xl p-1 shadow-lg" alt="Logo" referrerPolicy="no-referrer" />
               ) : (
                 <div className="w-12 h-12 bg-white rounded-xl shadow-lg flex items-center justify-center font-black text-2xl" style={{ color: config.primaryColor }}>
                   {instName[0]}
                 </div>
               )}
               <h1 className={cn(
                 "uppercase font-black tracking-[0.2em] text-center drop-shadow-sm transition-colors",
                 config.size === 'cr80_p' ? "text-[10px]" : "text-[8px]"
               )} style={{ color: config.institutionNameColor }}>
                 {instName}
               </h1>
            </div>

            <div className={cn(
               "flex flex-col items-center",
               config.size === 'cr80_p' ? "mt-0" : "flex-1 min-w-0 pr-4"
            )}>
              <div className={cn(
                "relative border-4 border-white shadow-xl overflow-hidden bg-white shrink-0",
                config.size === 'cr80_p' ? "w-32 h-32 rounded-full" : "w-28 h-28 rounded-2xl"
              )}>
                {student.photoUrl ? (
                  <img src={student.photoUrl} className="w-full h-full object-cover" alt={student.name} referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gray-50">
                    <User className="w-16 h-16 text-gray-200" />
                  </div>
                )}
              </div>
              
              <div className={cn(
                "w-full",
                config.size === 'cr80_p' ? "mt-6 text-center" : "mt-4 text-left"
              )}>
                <h2 className="text-lg font-black tracking-tight leading-none uppercase truncate text-balance" style={{ color: '#111827' }}>
                  {student.name}
                </h2>
                <div className="inline-block mt-1 px-3 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest text-white whitespace-nowrap" style={{ backgroundColor: config.primaryColor }}>
                  {config.labelDesignation}
                </div>
              </div>

              <div className="mt-4 w-full space-y-1">
                 <div className="flex justify-between items-center text-[9px]">
                   <span className="font-bold text-gray-400 uppercase tracking-widest whitespace-nowrap">{config.labelId}</span>
                   <span className="font-black text-gray-900 truncate ml-2">#{student.rollNo}</span>
                 </div>
                 <div className="flex justify-between items-center text-[9px]">
                   <span className="font-bold text-gray-400 uppercase tracking-widest whitespace-nowrap">{config.labelBatch}</span>
                   <span className="font-black text-gray-900 uppercase truncate ml-2">{student.batchName}</span>
                 </div>
                 <div className="flex justify-between items-center text-[9px]">
                   <span className="font-bold text-gray-400 uppercase tracking-widest whitespace-nowrap">{config.expiryLabel}</span>
                   <span className="font-black text-gray-900 truncate ml-2">{config.expiryDate}</span>
                 </div>
              </div>
            </div>

            <div className={cn(
              "absolute w-full px-6 flex items-end justify-between pointer-events-none",
              config.size === 'cr80_p' ? "bottom-6 left-0" : "bottom-4 left-0"
            )}>
              {config.showQR && (
                <div className="p-1 bg-white rounded-lg border border-gray-100 shadow-sm shrink-0">
                  <QRCodeSVG value={student.id} size={config.size === 'cr80_p' ? 40 : 35} />
                </div>
              )}
              <div className="flex flex-col items-end shrink-0">
                <div className="w-16 h-4 border-b-2 border-gray-200 relative" />
                <p className="text-[5px] font-black text-gray-400 uppercase tracking-widest mt-1">Authorized Sign</p>
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (config.design === 'professional') {
      const instName = config.institutionNameOverride || institution?.name || 'INSTITUTION NAME';
      return (
        <div ref={cardRef} style={cardStyles} className="bg-white border-2 border-gray-100 box-border overflow-hidden select-none pointer-events-none flex flex-col">
           <div className="h-20 flex items-center px-6 gap-4" style={{ backgroundColor: config.primaryColor }}>
              {institution?.logoURL ? (
                <img src={institution.logoURL} className="w-12 h-12 object-contain bg-white rounded-lg p-1 shadow-sm" alt="Logo" referrerPolicy="no-referrer" />
              ) : (
                <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center font-black text-xl" style={{ color: config.primaryColor }}>
                  {instName[0]}
                </div>
              )}
              <div className="flex-1 min-w-0">
                 <h1 className="text-sm font-black tracking-tight leading-tight uppercase truncate" style={{ color: config.institutionNameColor }}>
                   {instName}
                 </h1>
                 <p className="text-[10px] font-bold opacity-80 uppercase tracking-widest text-white">Student ID Card</p>
              </div>
           </div>

           <div className="p-6 flex flex-col items-center">
              <div className="w-28 h-28 rounded-2xl border-4 border-gray-50 shadow-md overflow-hidden bg-white mb-6">
                 {student.photoUrl ? (
                   <img src={student.photoUrl} className="w-full h-full object-cover" alt={student.name} referrerPolicy="no-referrer" />
                 ) : (
                   <div className="w-full h-full flex items-center justify-center bg-gray-50">
                     <User className="w-12 h-12 text-gray-200" />
                   </div>
                 )}
              </div>

              <div className="text-center mb-6 w-full px-2">
                 <h2 className="text-xl font-black tracking-tight text-gray-900 leading-none uppercase truncate">{student.name}</h2>
                 <p className="text-[10px] font-bold text-gray-400 mt-2 uppercase tracking-[0.2em]">{student.batchName}</p>
              </div>

              <div className="w-full space-y-3 bg-gray-50 p-4 rounded-xl border border-gray-100">
                 <div className="flex justify-between items-center text-[10px]">
                    <span className="font-bold text-gray-400 uppercase tracking-widest">Roll No</span>
                    <span className="font-black text-gray-900 font-mono">#{student.rollNo}</span>
                 </div>
                 <div className="flex justify-between items-center text-[10px]">
                    <span className="font-bold text-gray-400 uppercase tracking-widest">Phone</span>
                    <span className="font-black text-gray-900 font-mono">{student.guardianPhone}</span>
                 </div>
                 <div className="flex justify-between items-center text-[10px]">
                    <span className="font-bold text-gray-400 uppercase tracking-widest">{config.expiryLabel}</span>
                    <span className="font-black text-gray-900 font-mono">{config.expiryDate}</span>
                 </div>
              </div>
           </div>
           
           <div className="mt-auto px-6 py-4 flex items-center justify-between border-t border-gray-50">
              {config.showQR && <QRCodeSVG value={student.id} size={35} />}
              <div className="text-right">
                 <div className="w-20 h-4 border-b border-gray-300"></div>
                 <p className="text-[6px] font-black text-gray-400 uppercase tracking-widest mt-1">Authorized Signature</p>
              </div>
           </div>
        </div>
      );
    }

    if (config.design === 'minimal') {
      const instName = config.institutionNameOverride || institution?.name || 'INSTITUTION NAME';
      return (
        <div ref={cardRef} style={cardStyles} className="bg-white border-2 border-gray-50 box-border overflow-hidden p-6 flex flex-col select-none pointer-events-none">
           <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 rounded-full flex items-center justify-center font-black text-white text-lg" style={{ backgroundColor: config.primaryColor }}>
                 {instName[0]}
              </div>
              <div className="min-w-0">
                 <h1 className="text-[10px] font-black uppercase tracking-[0.1em] truncate" style={{ color: config.institutionNameColor === '#ffffff' ? '#111827' : config.institutionNameColor }}>{instName}</h1>
                 <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">EST. 2024</p>
              </div>
           </div>

           <div className="flex flex-col items-center flex-1">
              <div className="w-32 h-32 rounded-full overflow-hidden mb-6 border-4 border-gray-50 bg-white ring-4 ring-gray-50/50">
                 {student.photoUrl ? (
                   <img src={student.photoUrl} className="w-full h-full object-cover" alt={student.name} referrerPolicy="no-referrer" />
                 ) : (
                   <div className="w-full h-full flex items-center justify-center bg-gray-50">
                     <User className="w-16 h-16 text-gray-200" />
                   </div>
                 )}
              </div>
              <h2 className="text-lg font-black tracking-tight text-gray-900 leading-none uppercase text-center mb-1">{student.name}</h2>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] mb-8" style={{ color: config.primaryColor }}>{student.batchName}</p>

              <div className="w-full grid grid-cols-2 gap-4 border-t border-b border-gray-50 py-4">
                 <div className="text-center">
                    <p className="text-[7px] font-bold text-gray-400 uppercase tracking-widest mb-1">ID NUMBER</p>
                    <p className="text-[10px] font-black text-gray-900">#{student.rollNo}</p>
                 </div>
                 <div className="text-center">
                    <p className="text-[7px] font-bold text-gray-400 uppercase tracking-widest mb-1">PROGRAM</p>
                    <p className="text-[10px] font-black text-gray-900 uppercase">{student.grade || 'GRAD'}</p>
                 </div>
                 <div className="text-center">
                    <p className="text-[7px] font-bold text-gray-400 uppercase tracking-widest mb-1">{config.expiryLabel}</p>
                    <p className="text-[10px] font-black text-gray-900">{config.expiryDate}</p>
                 </div>
                 <div className="text-center">
                    <p className="text-[7px] font-bold text-gray-400 uppercase tracking-widest mb-1">CONTACT</p>
                    <p className="text-[10px] font-black text-gray-900">{student.guardianPhone?.slice(-5)}***</p>
                 </div>
              </div>
           </div>

           <div className="mt-8 flex justify-center">
              {config.showQR && <QRCodeSVG value={student.id} size={30} />}
           </div>
        </div>
      );
    }

    if (config.design === 'vibrant') {
      const instName = config.institutionNameOverride || institution?.name || 'INSTITUTION NAME';
      return (
        <div ref={cardRef} style={cardStyles} className="bg-white box-border overflow-hidden flex flex-col select-none pointer-events-none">
           <div className="h-1/3 relative" style={{ backgroundColor: config.primaryColor }}>
              <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '10px 10px' }}></div>
              <div className="absolute -bottom-16 left-1/2 -translate-x-1/2">
                 <div className="w-32 h-32 rounded-3xl rotate-45 border-4 border-white shadow-xl overflow-hidden bg-white group-hover:rotate-0 transition-transform duration-500">
                    <div className="-rotate-45 group-hover:rotate-0 transition-transform duration-500 w-full h-full scale-125">
                       {student.photoUrl ? (
                         <img src={student.photoUrl} className="w-full h-full object-cover" alt={student.name} referrerPolicy="no-referrer" />
                       ) : (
                         <div className="w-full h-full flex items-center justify-center bg-gray-50">
                           <User className="w-16 h-16 text-gray-200" />
                         </div>
                       )}
                    </div>
                 </div>
              </div>
           </div>

           <div className="flex-1 flex flex-col items-center pt-20 px-6">
              <div className="text-center mb-8 relative">
                 <div className="absolute -top-12 left-1/2 -translate-x-1/2 scale-150 opacity-5 font-black text-4xl select-none uppercase truncate max-w-full" style={{ color: config.primaryColor }}>
                   {instName}
                 </div>
                 <h2 className="text-2xl font-black text-gray-900 truncate max-w-[200px] uppercase leading-none">{student.name}</h2>
                 <p className="text-[10px] font-bold uppercase tracking-[0.3em] mt-3" style={{ color: config.primaryColor }}>{student.batchName}</p>
              </div>

              <div className="w-full grid grid-cols-3 gap-2">
                 <div className="bg-gray-50 p-2 rounded-xl text-center">
                    <p className="text-[7px] font-black text-gray-300 uppercase tracking-widest mb-1">ROLL</p>
                    <p className="text-[10px] font-black text-gray-900">#{student.rollNo}</p>
                 </div>
                 <div className="bg-gray-50 p-2 rounded-xl text-center">
                    <p className="text-[7px] font-black text-gray-300 uppercase tracking-widest mb-1">{config.expiryLabel}</p>
                    <p className="text-[10px] font-black text-gray-900 uppercase truncate">{config.expiryDate}</p>
                 </div>
                 <div className="bg-gray-50 p-2 rounded-xl text-center">
                    <p className="text-[7px] font-black text-gray-300 uppercase tracking-widest mb-1">GRADE</p>
                    <p className="text-[10px] font-black text-gray-900 uppercase">{student.grade || 'A'}</p>
                 </div>
              </div>

              <div className="mt-auto w-full py-6 flex items-center justify-between border-t border-gray-50">
                 <div className="flex items-center gap-2">
                    {config.showQR && <QRCodeSVG value={student.id} size={30} />}
                    <div className="min-w-0">
                       <p className="text-[8px] font-black uppercase truncate tracking-tighter" style={{ color: config.institutionNameColor === '#ffffff' ? '#111827' : config.institutionNameColor }}>{instName}</p>
                       <p className="text-[6px] font-bold text-gray-400 uppercase tracking-widest">Authorized Member</p>
                    </div>
                 </div>
              </div>
           </div>
        </div>
      );
    }

    if (config.design === 'classic') {
      const instName = config.institutionNameOverride || institution?.name || 'INSTITUTION NAME';
      return (
        <div ref={cardRef} style={cardStyles} className="bg-white border-2 border-gray-100 box-border flex flex-col select-none pointer-events-none overflow-hidden">
           <div className="h-[70px] flex items-center justify-center gap-3 border-b-2" style={{ borderColor: config.primaryColor, backgroundColor: '#f9fafb' }}>
              {institution?.logoURL ? (
                <img src={institution.logoURL} className="w-10 h-10 object-contain" alt="Logo" referrerPolicy="no-referrer" />
              ) : null}
              <div className="text-center min-w-0 px-2">
                 <h1 className="text-sm font-black leading-none uppercase tracking-tighter truncate" style={{ color: config.institutionNameColor === '#ffffff' ? '#111827' : config.institutionNameColor }}>{instName}</h1>
                 <p className="text-[8px] font-bold text-gray-500 mt-1 tracking-widest uppercase">Student ID Card</p>
              </div>
           </div>

           <div className="flex-1 p-6 flex items-start gap-4">
              <div className="w-24 h-32 bg-gray-50 border-2 rounded-lg shrink-0 overflow-hidden" style={{ borderColor: '#f3f4f6' }}>
                 {student.photoUrl ? (
                   <img src={student.photoUrl} className="w-full h-full object-cover" alt={student.name} referrerPolicy="no-referrer" />
                 ) : (
                   <div className="w-full h-full flex items-center justify-center bg-gray-50">
                     <User className="w-12 h-12 text-gray-200" />
                   </div>
                 )}
              </div>
              <div className="flex-1 flex flex-col min-w-0 h-full">
                 <div className="mb-4 min-w-0">
                    <h2 className="text-sm font-black text-gray-900 uppercase tracking-tight truncate">{student.name}</h2>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mt-1">Roll No: {student.rollNo}</p>
                 </div>

                 <div className="space-y-2">
                    <div className="flex flex-col">
                       <span className="text-[7px] font-black text-gray-300 uppercase tracking-widest">Father's Name</span>
                       <p className="text-[10px] font-bold text-gray-700 truncate">{student.fatherName || ' — '}</p>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                       <div className="flex flex-col flex-1">
                          <span className="text-[7px] font-black text-gray-300 uppercase tracking-widest">Batch</span>
                          <p className="text-[10px] font-bold text-gray-700 truncate">{student.batchName}</p>
                       </div>
                       <div className="flex flex-col shrink-0">
                          <span className="text-[7px] font-black text-gray-300 uppercase tracking-widest">Grade</span>
                          <p className="text-[10px] font-bold text-gray-700">{student.grade || 'A'}</p>
                       </div>
                    </div>
                    <div className="flex flex-col">
                       <span className="text-[7px] font-black text-gray-300 uppercase tracking-widest">Contact No</span>
                       <p className="text-[10px] font-bold text-gray-700">{student.guardianPhone}</p>
                    </div>
                 </div>
              </div>
           </div>

           <div className="h-[60px] bg-gray-50 border-t flex items-center justify-between px-6">
               <div className="qr-code">
                  {config.showQR && <QRCodeSVG value={student.id} size={30} />}
               </div>
               <div className="text-center">
                  <div className="w-24 h-4 border-b border-gray-400"></div>
                  <p className="text-[6px] font-bold text-gray-400 uppercase tracking-widest mt-1">Principal Signature</p>
               </div>
           </div>
        </div>
      );
    }

    if (config.design === 'custom_bg') {
        const instName = config.institutionNameOverride || institution?.name || 'INSTITUTION NAME';
        return (
          <div ref={cardRef} style={{ ...cardStyles, backgroundImage: `url(${config.customBgUrl})`, backgroundSize: 'cover', backgroundPosition: 'center', position: 'relative' }} className="flex flex-col select-none pointer-events-none">
             {/* Dynamic fields placed over custom background with better contrast options */}
             <div className={cn(
               "absolute inset-0 p-8 flex flex-col items-center",
               config.size === 'cr80_l' ? "justify-center" : "pt-12"
             )}>
                <div className="w-28 h-32 bg-gray-100/20 rounded shadow-inner overflow-hidden mb-4 border border-white/30 backdrop-blur-[2px]">
                   {student.photoUrl ? (
                     <img src={student.photoUrl} className="w-full h-full object-cover" alt={student.name} referrerPolicy="no-referrer" />
                   ) : (
                     <div className="w-full h-full flex items-center justify-center bg-gray-50/50">
                        <User className="w-12 h-12 text-gray-300" />
                     </div>
                   )}
                </div>
                
                <h2 className="text-xl font-black text-center leading-tight w-full truncate drop-shadow-sm" style={{ color: config.textColor }}>{student.name}</h2>
                
                <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 mt-2">
                   <p className="text-xs font-black drop-shadow-sm font-mono" style={{ color: config.textColor }}>ROLL: {student.rollNo}</p>
                   {student.batchName && <p className="text-xs font-black uppercase drop-shadow-sm" style={{ color: config.textColor }}>{student.batchName}</p>}
                </div>

                <div className="mt-4 flex flex-col items-center gap-1">
                   <p className="text-[10px] font-bold uppercase tracking-widest drop-shadow-sm opacity-90" style={{ color: config.textColor }}>{instName}</p>
                   <p className="text-[8px] font-black uppercase tracking-widest opacity-60" style={{ color: config.textColor }}>{config.expiryLabel}: {config.expiryDate}</p>
                </div>

                <div className="mt-auto pt-4 flex items-center justify-between w-full">
                   <div className="opacity-70 mix-blend-multiply">
                      {config.showQR && <QRCodeSVG value={student.id} size={35} />}
                   </div>
                   {institution?.logoURL && (
                     <img src={institution.logoURL} className="w-8 h-8 object-contain opacity-50 mix-blend-multiply" alt="Logo" />
                   )}
                </div>
             </div>
          </div>
        );
    }
  };

  const renderBackDesign = () => {
    const width = config.size === 'cr80_p' ? '216px' : '342.4px';
    const height = config.size === 'cr80_p' ? '342.4px' : '216px';
    return (
      <div 
        ref={backRef} 
        style={{ 
          width, 
          height, 
          backgroundColor: '#ffffff', 
          fontFamily: "'Inter', sans-serif", 
          padding: '16px', 
          display: 'flex', 
          flexDirection: 'column',
          position: 'relative',
          overflow: 'hidden'
        }}
        className="border shadow-sm select-none pointer-events-none"
      >
        <div className="flex-1 overflow-hidden">
          <h3 className="text-[10px] font-black uppercase tracking-widest mb-3" style={{ color: config.primaryColor }}>Terms & Conditions</h3>
          <ul className="space-y-1.5">
            {(config.terms || '').split('\n').filter(t => t.trim()).map((term, i) => (
              <li key={i} className="text-[8px] text-gray-500 font-medium flex gap-2 leading-tight">
                <span className="font-black text-gray-300 shrink-0">•</span> 
                <span className="break-words line-clamp-2">{term}</span>
              </li>
            ))}
          </ul>
        </div>
        
        <div className="mt-auto pt-4 border-t border-gray-100 flex flex-col items-center gap-3">
           {config.showBarcode && <Barcode value={previewStudent?.rollNo || '0000'} height={20} width={1} fontSize={6} margin={2} />}
           <div className="text-center w-full px-2">
              <p className="text-[8px] font-black uppercase mb-0.5 truncate" style={{ color: config.primaryColor }}>
                {config.institutionNameOverride || institution?.name || 'INSTITUTION NAME'}
              </p>
              <p className="text-[7px] font-medium leading-tight line-clamp-2 max-w-full" style={{ color: config.footerTextColor }}>
                {institution?.address || 'Address not provided'}
              </p>
           </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col lg:flex-row gap-8 min-h-[80vh]">
      {/* Sidebar Controls */}
      <div className="w-full lg:w-80 shrink-0 space-y-6">
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-6">
          <div className="flex items-center gap-2">
            <Palette className="w-5 h-5 text-indigo-600" />
            <h3 className="text-lg font-black text-gray-900 uppercase tracking-tighter">Appearance</h3>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] px-1">Structure</label>
              <div className="grid grid-cols-2 gap-2">
                <button 
                   onClick={() => setConfig({...config, size: 'cr80_p'})}
                   className={cn(
                    "p-3 rounded-2xl border-2 transition-all flex flex-col items-center gap-2",
                    config.size === 'cr80_p' ? "bg-indigo-50 border-indigo-600" : "bg-gray-50 border-gray-100 opacity-60 hover:opacity-100"
                   )}
                >
                  <Monitor className="w-5 h-5" />
                  <span className="text-[10px] font-black uppercase tracking-wider">Vertical</span>
                </button>
                <button 
                   onClick={() => setConfig({...config, size: 'cr80_l'})}
                   className={cn(
                    "p-3 rounded-2xl border-2 transition-all flex flex-col items-center gap-2",
                    config.size === 'cr80_l' ? "bg-indigo-50 border-indigo-600" : "bg-gray-50 border-gray-100 opacity-60 hover:opacity-100"
                   )}
                >
                  <Smartphone className="w-5 h-5 rotate-90" />
                  <span className="text-[10px] font-black uppercase tracking-wider">Horizontal</span>
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] px-1">Design Preset</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'modern', icon: Sparkles, label: 'Modern'},
                  { id: 'professional', icon: Layout, label: 'Pro'},
                  { id: 'minimal', icon: ShieldCheck, label: 'Minimal' },
                  { id: 'vibrant', icon: FileText, label: 'Vibrant' },
                  { id: 'classic', icon: Layers, label: 'Classic' },
                  { id: 'custom_code', icon: Code, label: 'Custom' },
                  { id: 'custom_bg', icon: ImageIcon, label: 'Background' }
                ].map(d => {
                  const Icon = d.icon || Monitor;
                  return (
                    <button 
                      key={d.id}
                      onClick={() => setConfig({...config, design: d.id as CardDesign})}
                      className={cn(
                        "p-3 rounded-2xl border-2 transition-all flex flex-col items-center gap-2",
                        config.design === d.id ? "bg-indigo-50 border-indigo-600" : "bg-gray-50 border-gray-100 opacity-70 hover:opacity-100"
                      )}
                    >
                      <Icon className="w-4 h-4" />
                      <span className="text-[10px] font-black uppercase tracking-wider">{d.label || d.id}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] px-1">Brand Colors</label>
              <div className="flex items-center gap-3">
                 <div className="flex-1 space-y-1">
                    <p className="text-[8px] font-bold text-gray-400 uppercase">Primary</p>
                    <div className="flex items-center gap-2">
                      <input 
                        type="color" 
                        value={config.primaryColor}
                        onChange={e => setConfig({...config, primaryColor: e.target.value})}
                        className="w-8 h-8 rounded-lg cursor-pointer border-0 p-0 overflow-hidden"
                      />
                      <input 
                        type="text" 
                        value={config.primaryColor}
                        onChange={e => setConfig({...config, primaryColor: e.target.value})}
                        className="flex-1 bg-gray-50 border-gray-100 rounded-lg px-2 py-1 text-[10px] font-mono uppercase font-bold outline-none focus:ring-1 focus:ring-indigo-200"
                      />
                    </div>
                 </div>
                 <div className="flex-1 space-y-1">
                    <p className="text-[8px] font-bold text-gray-400 uppercase">Text</p>
                    <div className="flex items-center gap-2">
                      <input 
                        type="color" 
                        value={config.textColor}
                        onChange={e => setConfig({...config, textColor: e.target.value})}
                        className="w-8 h-8 rounded-lg cursor-pointer border-0 p-0 overflow-hidden"
                      />
                      <input 
                        type="text" 
                        value={config.textColor}
                        onChange={e => setConfig({...config, textColor: e.target.value})}
                        className="flex-1 bg-gray-50 border-gray-100 rounded-lg px-2 py-1 text-[10px] font-mono uppercase font-bold outline-none focus:ring-1 focus:ring-indigo-200"
                      />
                    </div>
                 </div>
              </div>
            </div>

            {config.design === 'custom_code' && (
              <div className="animate-in fade-in slide-in-from-top-4">
                 <label className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.2em] px-1 flex items-center justify-between">
                    HTML Template
                    <button onClick={() => setConfig({...config, customCode: DEFAULT_CONFIG.customCode})} className="flex items-center gap-1 hover:text-indigo-800 transition-colors">
                       <RotateCcw className="w-3 h-3" /> Reset
                    </button>
                 </label>
                 <textarea 
                    value={config.customCode}
                    onChange={e => setConfig({...config, customCode: e.target.value})}
                    className="w-full h-64 mt-2 p-3 bg-gray-900 text-indigo-300 font-mono text-[10px] leading-tight rounded-2xl border border-gray-800 focus:ring-2 focus:ring-indigo-500/20 outline-none scrollbar-thin scrollbar-thumb-gray-800"
                    placeholder="Enter HTML/Tailwind code..."
                 />
                 <div className="mt-2 p-3 bg-indigo-50 rounded-xl space-y-1">
                    <p className="text-[8px] text-indigo-700 font-bold uppercase tracking-widest">Available Variables</p>
                    <code className="text-[7px] text-indigo-500 font-black block">
                       {`{{STUDENT_NAME}}, {{STUDENT_ROLL}}, {{STUDENT_BATCH}}, {{STUDENT_GRADE}}, {{STUDENT_PHOTO}}, {{INSTITUTION_NAME}}, {{INSTITUTION_LOGO}}`}
                    </code>
                 </div>
              </div>
            )}

            {config.design === 'custom_bg' && (
               <div className="animate-in fade-in slide-in-from-top-4 space-y-3">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] px-1">Background Image URL</label>
                  <input 
                     type="text" 
                     value={config.customBgUrl}
                     onChange={e => setConfig({...config, customBgUrl: e.target.value})}
                     className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-xs outline-none focus:ring-1 focus:ring-indigo-200"
                     placeholder="https://example.com/id-bg.png"
                  />
                  <div className="p-3 bg-indigo-50 rounded-xl">
                      <p className="text-[8px] text-indigo-700 leading-normal font-medium italic">
                         Provide a URL of a pre-designed ID card with blank variable spaces.
                      </p>
                  </div>
               </div>
            )}

            <div className="space-y-4 pt-4 border-t border-gray-50 animate-in fade-in slide-in-from-top-4">
              <div className="flex items-center gap-2">
                <Type className="w-4 h-4 text-indigo-600" />
                <h3 className="text-xs font-black text-gray-900 uppercase tracking-widest">Text Content & Labels</h3>
              </div>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] px-1">Coaching Name</label>
                  <input 
                    type="text" 
                    value={config.institutionNameOverride}
                    onChange={e => setConfig({...config, institutionNameOverride: e.target.value})}
                    placeholder={institution?.name}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-xs font-bold outline-none focus:ring-1 focus:ring-indigo-200"
                  />
                  <div className="flex items-center gap-2">
                    <input 
                      type="color" 
                      value={config.institutionNameColor}
                      onChange={e => setConfig({...config, institutionNameColor: e.target.value})}
                      className="w-8 h-8 rounded-lg cursor-pointer border-0 p-0 overflow-hidden"
                    />
                    <span className="text-[10px] font-bold text-gray-400">Name Color</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] px-1">ID Label</label>
                    <input 
                      type="text" 
                      value={config.labelId}
                      onChange={e => setConfig({...config, labelId: e.target.value})}
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-xs outline-none focus:ring-1 focus:ring-indigo-200"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] px-1">Roll Label</label>
                    <input 
                      type="text" 
                      value={config.labelRoll}
                      onChange={e => setConfig({...config, labelRoll: e.target.value})}
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-xs outline-none focus:ring-1 focus:ring-indigo-200"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] px-1">Batch Label</label>
                    <input 
                      type="text" 
                      value={config.labelBatch}
                      onChange={e => setConfig({...config, labelBatch: e.target.value})}
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-xs outline-none focus:ring-1 focus:ring-indigo-200"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] px-1">Designation</label>
                    <input 
                      type="text" 
                      value={config.labelDesignation}
                      onChange={e => setConfig({...config, labelDesignation: e.target.value})}
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-xs outline-none focus:ring-1 focus:ring-indigo-200"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] px-1">Expiry Label</label>
                    <input 
                      type="text" 
                      value={config.expiryLabel}
                      onChange={e => setConfig({...config, expiryLabel: e.target.value})}
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-xs outline-none focus:ring-1 focus:ring-indigo-200"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] px-1">Expiry date</label>
                    <input 
                      type="text" 
                      value={config.expiryDate}
                      onChange={e => setConfig({...config, expiryDate: e.target.value})}
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-xs outline-none focus:ring-1 focus:ring-indigo-200"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                   <div className="flex items-center justify-between px-1">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Terms & Conditions</label>
                      <button onClick={() => setConfig({...config, terms: DEFAULT_TERMS})} className="text-[9px] font-black text-indigo-500 hover:text-indigo-700 transition-colors uppercase tracking-widest">Reset</button>
                   </div>
                   <textarea 
                     value={config.terms}
                     onChange={e => setConfig({...config, terms: e.target.value})}
                     rows={4}
                     className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-xs outline-none focus:ring-1 focus:ring-indigo-200 resize-none font-medium leading-relaxed"
                   />
                </div>

                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-2xl border border-gray-100">
                  <input 
                    type="color" 
                    value={config.footerTextColor}
                    onChange={e => setConfig({...config, footerTextColor: e.target.value})}
                    className="w-8 h-8 rounded-lg cursor-pointer border-0 p-0 overflow-hidden"
                  />
                  <span className="text-xs font-black text-gray-500 uppercase tracking-widest">Footer Text Color</span>
                </div>
              </div>
            </div>

            <div className="pt-4 space-y-3">
               {[
                 { id: 'showBack', label: 'Back Side' },
                 { id: 'showQR', label: 'QR Code' },
                 { id: 'showBarcode', label: 'Barcode' }
               ].map(opt => (
                 <label key={opt.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-2xl cursor-pointer hover:bg-gray-100 transition-all border border-transparent hover:border-gray-200 group">
                    <span className="text-xs font-black uppercase text-gray-500 tracking-wider group-hover:text-indigo-600 transition-colors">{opt.label}</span>
                    <input 
                       type="checkbox" 
                       checked={(config as any)[opt.id]}
                       onChange={e => setConfig({...config, [opt.id]: e.target.checked})}
                       className="w-5 h-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                 </label>
               ))}
            </div>
          </div>
        </div>

        <button 
           onClick={handleDownloadPDF}
           disabled={isGenerating || selectedStudents.length === 0}
           className="w-full py-5 bg-gray-900 text-white rounded-[2.5rem] font-black uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-black transition-all shadow-2xl shadow-gray-200 disabled:opacity-50 disabled:grayscale"
        >
          {isGenerating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
          Generate {selectedStudents.length} {selectedStudents.length === 1 ? 'Card' : 'Cards'}
        </button>
      </div>

      {/* Main Designer Area */}
      <div className="flex-1 space-y-8">
         <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
            {/* Live Preview */}
            <div className="space-y-4 sticky top-8">
               <div className="flex items-center justify-between px-2">
                  <div className="flex items-center gap-2">
                     <Monitor className="w-4 h-4 text-emerald-500" />
                     <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest leading-none pt-1">Live Proof</h3>
                  </div>
                  <div className="flex items-center gap-4">
                     <span className="text-[10px] font-bold text-gray-400"># Previewing {previewStudent?.name}</span>
                  </div>
               </div>
               
               <div className="bg-gray-900 backdrop-blur-xl rounded-[3rem] p-6 sm:p-16 min-h-[500px] lg:min-h-[600px] flex flex-col items-center justify-center gap-12 shadow-2xl relative overflow-visible group border border-white/5">
                  <div className="absolute inset-0 opacity-[0.03] pointer-events-none rounded-[3rem]" style={{ backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
                  
                  <div className="space-y-6 w-full flex flex-col items-center">
                    <span className="text-[10px] font-black text-gray-600 uppercase tracking-[0.4em] mb-4">Front Profile</span>
                    <motion.div 
                      layout
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ 
                        opacity: 1 
                      }}
                      className={cn(
                        "shadow-[0_50px_100px_-30px_rgba(0,0,0,0.7)] relative z-10 shrink-0 transition-all duration-700",
                        "scale-[0.55] sm:scale-[0.8] md:scale-[0.9] lg:scale-[1.0] xl:scale-[1.1]",
                        config.size === 'cr80_l' && "scale-[0.5] sm:scale-[0.7] md:scale-[0.8] lg:scale-[0.9] xl:scale-[1.0]"
                      )}
                    >
                      {renderCurrentDesign(previewStudent)}
                    </motion.div>
                  </div>

                  {config.showBack && (
                    <div className="space-y-6 w-full flex flex-col items-center pt-8 border-t border-white/5">
                      <span className="text-[10px] font-black text-gray-600 uppercase tracking-[0.4em] mb-4">Back Profile</span>
                      <motion.div 
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ 
                          opacity: 1 
                        }}
                        className={cn(
                          "shadow-[0_50px_100px_-30px_rgba(0,0,0,0.7)] relative z-10 shrink-0 transition-all duration-700",
                          "scale-[0.55] sm:scale-[0.8] md:scale-[0.9] lg:scale-[1.0] xl:scale-[1.1]",
                          config.size === 'cr80_l' && "scale-[0.5] sm:scale-[0.7] md:scale-[0.8] lg:scale-[0.9] xl:scale-[1.0]"
                        )}
                      >
                        {renderBackDesign()}
                      </motion.div>
                    </div>
                  )}
               </div>
            </div>

            {/* Selection Panel */}
            <div className="bg-white p-8 rounded-[3rem] border border-gray-100 shadow-sm flex flex-col h-full min-h-[700px]">
               <div className="space-y-6 flex-1 flex flex-col">
                  <div className="flex items-center justify-between">
                     <h3 className="text-xl font-black text-gray-900 uppercase tracking-tighter">Selection Panel</h3>
                     <span className="px-3 py-1 bg-gray-100 rounded-full text-[10px] font-black text-gray-500 uppercase tracking-widest">{selectedStudents.length} Selected</span>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3">
                     <div className="relative flex-1 group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 group-focus-within:text-indigo-600 transition-colors" />
                        <input 
                           type="text" 
                           placeholder="Search Student..."
                           value={searchTerm}
                           onChange={e => setSearchTerm(e.target.value)}
                           className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none"
                        />
                     </div>
                     <select 
                        value={selectedBatch}
                        onChange={e => setSelectedBatch(e.target.value)}
                        className="px-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none"
                     >
                        <option value="">All Batches</option>
                        {batches.map(b => <option key={b} value={b}>{b}</option>)}
                     </select>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-gray-50">
                     <button 
                        onClick={toggleAll}
                        className="text-[10px] font-black uppercase tracking-widest text-indigo-600 hover:text-indigo-800 transition-colors"
                     >
                        {selectedStudents.length === filtered.length ? 'Deselect All' : 'Select All Filtered'}
                     </button>
                     <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{filtered.length} results</p>
                  </div>

                  <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                     <div className="grid grid-cols-1 gap-2 py-4">
                        {filtered.map(s => {
                           const isSelected = selectedStudents.includes(s.id);
                           const isCurrentPreview = previewStudent?.id === s.id;
                           return (
                              <div 
                                 key={s.id}
                                 className={cn(
                                    "p-4 rounded-3xl border transition-all flex items-center justify-between group cursor-pointer",
                                    isSelected ? "bg-indigo-50 border-indigo-200 shadow-sm" : "bg-white border-transparent hover:bg-gray-50"
                                 )}
                                 onClick={() => {
                                    if (isSelected) {
                                       setSelectedStudents(prev => prev.filter(id => id !== s.id));
                                    } else {
                                       setSelectedStudents(prev => [...prev, s.id]);
                                    }
                                 }}
                              >
                                 <div className="flex items-center gap-4">
                                    <div className="relative">
                                       <div className="w-12 h-12 rounded-2xl overflow-hidden bg-gray-100 flex items-center justify-center text-gray-400 group-hover:scale-110 transition-transform">
                                          {s.photoUrl ? <img src={s.photoUrl} className="w-full h-full object-cover" /> : <User className="w-6 h-6" />}
                                       </div>
                                       {isCurrentPreview && (
                                          <div className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-white flex items-center justify-center">
                                             <Monitor className="w-2 h-2 text-white" />
                                          </div>
                                       )}
                                    </div>
                                    <div>
                                       <p className="text-sm font-black text-gray-900 leading-none">{s.name}</p>
                                       <p className="text-[10px] font-bold text-gray-400 mt-1 uppercase tracking-widest leading-none">ID: {s.rollNo} • {s.batchName}</p>
                                    </div>
                                 </div>
                                 <div className="flex items-center gap-3">
                                    <button 
                                       onClick={(e) => {
                                          e.stopPropagation();
                                          setPreviewStudent(s);
                                       }}
                                       className={cn(
                                          "p-2 rounded-xl transition-all",
                                          isCurrentPreview ? "bg-emerald-500 text-white shadow-lg" : "text-gray-400 hover:bg-white hover:shadow-md"
                                       )}
                                       title="Preview this card"
                                    >
                                       <Monitor className="w-4 h-4" />
                                    </button>
                                    <div className={cn(
                                       "w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all",
                                       isSelected ? "bg-indigo-600 border-indigo-600 text-white" : "border-gray-200 group-hover:border-indigo-300"
                                    )}>
                                       {isSelected && <CheckCircle className="w-4 h-4" />}
                                    </div>
                                 </div>
                              </div>
                           );
                        })}
                     </div>
                  </div>
               </div>
            </div>
         </div>
      </div>
    </div>
  );
}

function Target({ className }: { className?: string }) {
   return <div className={cn(className, "w-4 h-4 rounded-full border-2 border-indigo-600 flex items-center justify-center")}><div className="w-1.5 h-1.5 bg-indigo-600 rounded-full animate-pulse"></div></div>;
}

function MinimalistIcon({ className }: { className?: string }) {
    return (
        <div className={cn(className, "relative w-4 h-4 flex items-center justify-center")}>
            <div className="absolute inset-0 border border-gray-400 rounded-sm"></div>
            <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
        </div>
    );
}
