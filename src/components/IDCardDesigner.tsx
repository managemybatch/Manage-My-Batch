import React, { useState, useRef, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import Barcode from 'react-barcode';
import { 
  CreditCard, Copy, Download, Search, Filter, 
  Palette, Layout, Layers, Settings, User, 
  CheckCircle, Plus, Loader2, Sparkles, Monitor,
  Smartphone, FileText, Trash2, Edit2, Code,
  Type, Image as ImageIcon, RotateCcw
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
}

const DEFAULT_CONFIG: DesignerConfig = {
  design: 'modern',
  primaryColor: '#f97316', // Orange from sample
  secondaryColor: '#ffffff',
  textColor: '#1f2937',
  size: 'cr80_p',
  showBack: true,
  showQR: true,
  showBarcode: true,
  customCode: `
<div class="w-full h-full bg-white relative flex flex-col p-4 border-2 border-indigo-600 rounded-lg">
  <div class="flex items-center gap-2 border-b-2 border-indigo-100 pb-2 mb-4">
    <div class="w-10 h-10 bg-indigo-600 rounded flex items-center justify-center text-white font-black text-xl">
      {{INSTITUTION_NAME_INITIAL}}
    </div>
    <div class="flex-1">
      <h1 class="text-indigo-900 font-black text-xs uppercase tracking-tighter">{{INSTITUTION_NAME}}</h1>
      <p class="text-[8px] text-gray-500 font-bold uppercase tracking-widest leading-none">Identity Card</p>
    </div>
  </div>
  
  <div class="flex flex-col items-center text-center">
    <div class="w-20 h-20 bg-gray-100 rounded-full border-2 border-indigo-100 mb-2 overflow-hidden">
      <img src="{{STUDENT_PHOTO}}" class="w-full h-full object-cover" />
    </div>
    <h2 class="text-indigo-900 font-black text-sm">{{STUDENT_NAME}}</h2>
    <p class="text-[10px] text-indigo-500 font-bold mb-4 uppercase tracking-widest">Roll: {{STUDENT_ROLL}}</p>
    
    <div class="w-full space-y-1 text-left">
      <div class="flex justify-between text-[8px] border-b border-gray-50 pb-1">
        <span class="font-bold text-gray-400">BATCH</span>
        <span class="font-black text-gray-900 uppercase">{{STUDENT_BATCH}}</span>
      </div>
      <div class="flex justify-between text-[8px] border-b border-gray-50 pb-1">
        <span class="font-bold text-gray-400">GRADE</span>
        <span class="font-black text-gray-900 uppercase">{{STUDENT_GRADE}}</span>
      </div>
      <div class="flex justify-between text-[8px]">
        <span class="font-bold text-gray-400">PHONE</span>
        <span class="font-black text-gray-900 leading-none">{{STUDENT_PHONE}}</span>
      </div>
    </div>
  </div>
  
  <div class="mt-auto pt-2 flex items-center justify-between border-t border-indigo-50">
     <div class="qr-code"></div>
     <div class="flex flex-col items-end">
        <div class="w-16 h-4 border-b border-indigo-900"></div>
        <p class="text-[6px] text-indigo-900 font-black mt-1 uppercase tracking-tighter">Principal Signature</p>
     </div>
  </div>
</div>
  `,
  customBgUrl: ''
};

export function IDCardDesigner({ students, institution }: IDCardDesignerProps) {
  const [config, setConfig] = useState<DesignerConfig>(() => {
    const saved = localStorage.getItem(`id_designer_config_${institution?.id || 'default'}`);
    return saved ? JSON.parse(saved) : { ...DEFAULT_CONFIG, primaryColor: institution?.primaryColor || DEFAULT_CONFIG.primaryColor };
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBatch, setSelectedBatch] = useState('');
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [previewStudent, setPreviewStudent] = useState<Student | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const backRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    localStorage.setItem(`id_designer_config_${institution?.id || 'default'}`, JSON.stringify(config));
  }, [config, institution?.id]);

  useEffect(() => {
    if (students.length > 0 && !previewStudent) {
      setPreviewStudent(students[0]);
    }
  }, [students]);

  const batches = Array.from(new Set(students.map(s => s.batchName)));

  const filtered = students.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase()) || s.rollNo.includes(searchTerm);
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
    if (!student) return html;
    return html
      .replace(/{{STUDENT_NAME}}/g, student.name)
      .replace(/{{STUDENT_ROLL}}/g, student.rollNo)
      .replace(/{{STUDENT_BATCH}}/g, student.batchName)
      .replace(/{{STUDENT_GRADE}}/g, student.grade || 'N/A')
      .replace(/{{STUDENT_PHONE}}/g, student.guardianPhone)
      .replace(/{{STUDENT_PHOTO}}/g, student.photoUrl || 'https://via.placeholder.com/150')
      .replace(/{{INSTITUTION_NAME}}/g, institution?.name || 'INSTITUTION NAME')
      .replace(/{{INSTITUTION_NAME_INITIAL}}/g, (institution?.name || 'I')[0])
      .replace(/{{INSTITUTION_LOGO}}/g, institution?.logoURL || '');
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
      return (
        <div ref={cardRef} style={cardStyles} className="bg-white group/preview select-none pointer-events-none">
          {/* Wave Background */}
          <div 
            className="absolute top-0 left-0 w-full h-1/2" 
            style={{ 
              backgroundColor: config.primaryColor,
              clipPath: 'polygon(0 0, 100% 0, 100% 60%, 0 85%)'
            }} 
          />
          
          <div className="relative z-10 flex flex-col items-center pt-8 px-4 h-full">
            <div className="flex flex-col items-center gap-2 mb-4">
               {institution?.logoURL ? (
                 <img src={institution.logoURL} className="w-12 h-12 object-contain bg-white rounded-xl p-1 shadow-lg" alt="Logo" />
               ) : (
                 <div className="w-12 h-12 bg-white rounded-xl shadow-lg flex items-center justify-center font-black text-2xl" style={{ color: config.primaryColor }}>
                   {institution?.name?.[0] || 'S'}
                 </div>
               )}
               <h1 className="text-white text-[10px] uppercase font-black tracking-[0.2em] text-center drop-shadow-sm">
                 {institution?.name || 'INSTITUTION NAME'}
               </h1>
            </div>

            <div className="relative">
              <div className="w-32 h-32 rounded-full border-4 border-white shadow-xl overflow-hidden bg-white">
                {student.photoUrl ? (
                  <img src={student.photoUrl} className="w-full h-full object-cover" alt={student.name} />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gray-50">
                    <User className="w-16 h-16 text-gray-200" />
                  </div>
                )}
              </div>
            </div>

            <div className="mt-6 text-center w-full">
               <h2 className="text-xl font-black tracking-tight leading-none uppercase truncate" style={{ color: '#111827' }}>
                 {student.name}
               </h2>
               <div className="inline-block mt-2 px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest text-white" style={{ backgroundColor: config.primaryColor }}>
                 STUDENT
               </div>
            </div>

            <div className="mt-6 w-full space-y-2">
               <div className="flex justify-between items-center text-[10px]">
                 <span className="font-bold text-gray-400 uppercase tracking-widest">ID NO</span>
                 <span className="font-black text-gray-900">#{student.rollNo}</span>
               </div>
               <div className="flex justify-between items-center text-[10px]">
                 <span className="font-bold text-gray-400 uppercase tracking-widest">BATCH</span>
                 <span className="font-black text-gray-900 uppercase">{student.batchName}</span>
               </div>
               <div className="flex justify-between items-center text-[10px]">
                 <span className="font-bold text-gray-400 uppercase tracking-widest">GUARDIAN</span>
                 <span className="font-black text-gray-900 truncate max-w-[120px]">{student.fatherName || 'Not Listed'}</span>
               </div>
            </div>

            <div className="mt-auto w-full pb-6 flex items-end justify-between">
              {config.showQR && (
                <div className="p-1 bg-white rounded-lg border border-gray-100 shadow-sm">
                  <QRCodeSVG value={student.id} size={40} />
                </div>
              )}
              <div className="flex flex-col items-end">
                <div className="w-20 h-5 border-b-2 border-gray-200 relative">
                   {/* Signature Placeholder */}
                </div>
                <p className="text-[6px] font-black text-gray-400 uppercase tracking-widest mt-1">Authority Signature</p>
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (config.design === 'professional') {
      return (
        <div ref={cardRef} style={cardStyles} className="bg-white border flex flex-col">
           <div className="h-6 w-full" style={{ backgroundColor: config.primaryColor }}></div>
           <div className="flex-1 px-4 flex flex-col items-center pt-8">
              <div className="flex items-center gap-3 w-full mb-8">
                 <div className="w-10 h-10 shrink-0">
                    {institution?.logoURL ? (
                      <img src={institution.logoURL} className="w-full h-full object-contain" />
                    ) : (
                      <div className="w-full h-full bg-indigo-50 flex items-center justify-center font-bold text-lg" style={{ color: config.primaryColor }}>{institution?.name?.[0]}</div>
                    )}
                 </div>
                 <div>
                    <h1 className="text-xs font-black uppercase tracking-tighter" style={{ color: config.primaryColor }}>{institution?.name}</h1>
                    <p className="text-[8px] text-gray-400 font-bold tracking-widest leading-none">IDENTITY CARD</p>
                 </div>
              </div>

              <div className="w-full h-48 bg-gray-50 border rounded-2xl overflow-hidden mb-6">
                {student.photoUrl ? (
                  <img src={student.photoUrl} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <User className="w-24 h-24 text-gray-200" />
                  </div>
                )}
              </div>

              <div className="text-center">
                <h2 className="text-lg font-black tracking-tight" style={{ color: config.textColor }}>{student.name}</h2>
                <div className="h-0.5 w-12 mx-auto mt-2 mb-2" style={{ backgroundColor: config.primaryColor }}></div>
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.3em] font-mono leading-none">ID-{student.rollNo}</p>
              </div>

              <div className="mt-8 grid grid-cols-2 gap-x-4 gap-y-3 w-full">
                 <div>
                    <p className="text-[7px] font-black text-gray-400 uppercase tracking-widest">BATCH</p>
                    <p className="text-[10px] font-bold text-gray-900 truncate uppercase mt-0.5 tracking-tight leading-none">{student.batchName}</p>
                 </div>
                 <div>
                    <p className="text-[7px] font-black text-gray-400 uppercase tracking-widest">GRADE</p>
                    <p className="text-[10px] font-bold text-gray-900 truncate uppercase mt-0.5 tracking-tight leading-none">{student.grade || 'General'}</p>
                 </div>
                 <div className="col-span-2">
                    <p className="text-[7px] font-black text-gray-400 uppercase tracking-widest">CONTACT NO</p>
                    <p className="text-[10px] font-bold text-gray-900 mt-0.5 tracking-tight leading-none">{student.guardianPhone}</p>
                 </div>
              </div>

              <div className="mt-auto w-full pb-4 flex flex-col items-center gap-2">
                {config.showBarcode && (
                  <Barcode value={student.rollNo} width={1} height={15} fontSize={6} />
                )}
                <div className="w-full h-px bg-gray-100"></div>
                <p className="text-[6px] text-gray-300 uppercase tracking-widest font-bold">This card is non-transferable</p>
              </div>
           </div>
        </div>
      );
    }

    if (config.design === 'minimal') {
       return (
         <div ref={cardRef} style={cardStyles} className="bg-gray-50 p-6 flex flex-col">
            <div className="w-full flex justify-between items-start">
               <div className="w-12 h-12 bg-white rounded-2xl shadow-sm flex items-center justify-center p-2 border border-gray-100">
                  {institution?.logoURL ? <img src={institution.logoURL} className="w-full h-full object-contain" /> : <div className="font-black text-indigo-600">{institution?.name?.[0]}</div>}
               </div>
               <div className="text-right">
                  <h1 className="text-[8px] font-black uppercase tracking-widest text-gray-400">Validated Card</h1>
                  <p className="text-[6px] font-bold text-emerald-500 mt-0.5">ACTIVE 2026</p>
               </div>
            </div>

            <div className="mt-12 flex flex-col items-center">
               <div className="w-24 h-24 rounded-[32px] overflow-hidden bg-white shadow-2xl shadow-indigo-100/20 mb-6 group/avatar">
                  {student.photoUrl ? <img src={student.photoUrl} className="w-full h-full object-cover translate-y-0 group-hover/avatar:-translate-y-1 transition-transform" /> : <div className="w-full h-full flex items-center justify-center"><User className="text-gray-100 w-12 h-12" /></div>}
               </div>
               <h2 className="text-xl font-black tracking-tighter text-gray-900 text-center">{student.name}</h2>
               <p className="text-[10px] font-bold tracking-[0.4em] uppercase text-gray-400 mt-2">STUDENT</p>
            </div>

            <div className="mt-auto bg-white rounded-3xl p-4 shadow-sm border border-gray-100">
               <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                     <p className="text-[7px] font-black text-gray-400 uppercase tracking-widest">Identification</p>
                     <p className="text-[10px] font-black text-gray-900 uppercase">Roll: {student.rollNo}</p>
                  </div>
                  <div className="text-right space-y-1">
                     <p className="text-[7px] font-black text-gray-400 uppercase tracking-widest">Program</p>
                     <p className="text-[10px] font-black text-gray-900 uppercase truncate leading-none">{student.batchName}</p>
                  </div>
               </div>
            </div>
         </div>
       );
    }

    if (config.design === 'vibrant') {
       return (
         <div ref={cardRef} style={cardStyles} className="bg-white">
            <div className="absolute top-0 left-0 w-full h-[120px]" style={{ background: `linear-gradient(135deg, ${config.primaryColor}, ${config.secondaryColor})` }}>
                <div className="absolute inset-0 opacity-10" style={{ backgroundImage: `radial-gradient(circle at 2px 2px, white 1px, transparent 0)`, backgroundSize: '12px 12px' }}></div>
            </div>
            
            <div className="relative z-10 p-4 flex flex-col h-full items-center">
               <div className="w-full flex items-center justify-between mb-4">
                  <h1 className="text-white text-[9px] font-black uppercase tracking-widest drop-shadow-md truncate max-w-[140px]">{institution?.name}</h1>
                  {institution?.logoURL && <img src={institution.logoURL} className="w-6 h-6 object-contain bg-white/20 backdrop-blur-md rounded p-0.5" />}
               </div>

               <div className="w-28 h-28 rounded-3xl overflow-hidden border-4 border-white shadow-2xl -mt-2 bg-gray-50">
                   {student.photoUrl ? <img src={student.photoUrl} className="w-full h-full object-cover" /> : <User className="w-full h-full text-gray-200" />}
               </div>

               <div className="mt-6 text-center">
                  <h2 className="text-2xl font-black tracking-[ -0.05em] text-gray-900 leading-none">{student.name}</h2>
                  <p className="text-xs font-black uppercase tracking-widest mt-2" style={{ color: config.primaryColor }}>{student.batchName}</p>
               </div>

               <div className="mt-8 grid grid-cols-2 gap-3 w-full">
                  <div className="bg-gray-50 rounded-2xl px-4 py-2 border border-gray-100">
                     <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest leading-none">Roll Number</p>
                     <p className="text-xs font-black text-gray-900 mt-1 uppercase leading-none">{student.rollNo}</p>
                  </div>
                  <div className="bg-gray-50 rounded-2xl px-4 py-2 border border-gray-100">
                     <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest leading-none">Department</p>
                     <p className="text-xs font-black text-gray-900 mt-1 uppercase leading-none truncate tracking-tighter">{student.grade || 'GEN'}</p>
                  </div>
               </div>

               <div className="mt-auto flex items-center justify-center gap-4 py-4 w-full">
                  {config.showBarcode && <Barcode value={student.rollNo} height={20} width={1.2} fontSize={8} />}
               </div>
            </div>
         </div>
       );
    }

    if (config.design === 'classic') {
       return (
         <div ref={cardRef} style={cardStyles} className="bg-white border-2 border-gray-100 box-border flex flex-col">
            <div className="h-[70px] flex items-center justify-center gap-3 border-b-2" style={{ borderColor: config.primaryColor, backgroundColor: '#f9fafb' }}>
               {institution?.logoURL ? <img src={institution.logoURL} className="w-10 h-10 object-contain" /> : null}
               <div className="text-center">
                  <h1 className="text-sm font-black text-gray-900 leading-none uppercase tracking-tighter">{institution?.name}</h1>
                  <p className="text-[8px] font-bold text-gray-500 mt-1 tracking-widest uppercase">Student ID Card</p>
               </div>
            </div>

            <div className="flex-1 p-6 flex items-start gap-4">
               <div className="w-24 h-32 bg-gray-50 border-2 rounded-lg shrink-0 overflow-hidden" style={{ borderColor: '#f3f4f6' }}>
                  {student.photoUrl ? <img src={student.photoUrl} className="w-full h-full object-cover" /> : null}
               </div>
               <div className="flex-1 flex flex-col h-full">
                  <div className="mb-4">
                     <h2 className="text-sm font-black text-gray-900 uppercase tracking-tight">{student.name}</h2>
                     <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mt-1">Roll No: {student.rollNo}</p>
                  </div>

                  <div className="space-y-2">
                     <div className="flex flex-col">
                        <span className="text-[7px] font-black text-gray-300 uppercase tracking-widest">Father's Name</span>
                        <p className="text-[10px] font-bold text-gray-700">{student.fatherName || ' — '}</p>
                     </div>
                     <div className="flex flex-col">
                        <span className="text-[7px] font-black text-gray-300 uppercase tracking-widest">Date of Birth</span>
                        <p className="text-[10px] font-bold text-gray-700">12 June 2008</p>
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
                   <QRCodeSVG value={student.id} size={30} />
                </div>
                <div className="text-center">
                   <div className="w-24 h-4 border-b border-gray-400"></div>
                   <p className="text-[6px] font-black text-gray-400 tracking-widest mt-1 uppercase">Issuer Signature</p>
                </div>
            </div>
         </div>
       );
    }

    if (config.design === 'custom_bg') {
        return (
          <div ref={cardRef} style={{ ...cardStyles, backgroundImage: `url(${config.customBgUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }}>
             {/* Simple Overlay for custom background */}
             <div className="absolute top-[40%] left-1/2 -translate-x-1/2 flex flex-col items-center">
                <div className="w-20 h-24 bg-gray-100/50 rounded overflow-hidden mb-4 backdrop-blur-sm border border-white/30">
                   {student.photoUrl && <img src={student.photoUrl} className="w-full h-full object-cover" />}
                </div>
                <h2 className="text-lg font-black text-center" style={{ color: config.textColor }}>{student.name}</h2>
                <p className="text-xs font-bold text-center" style={{ color: config.textColor }}>ID: {student.rollNo}</p>
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
        style={{ width, height, backgroundColor: '#ffffff', fontFamily: "'Inter', sans-serif", padding: '20px', display: 'flex', flexDirection: 'column' }}
        className="border shadow-sm"
      >
        <div className="flex-1">
          <h3 className="text-[10px] font-black uppercase tracking-widest mb-4" style={{ color: config.primaryColor }}>Terms & Conditions</h3>
          <ul className="space-y-2">
            {[
              'This card is the property of the institution.',
              'If found, please return to the office address.',
              'Damage to the card may require a reissue fee.',
              'Keep away from strong magnetic fields.',
              'This card must be visible while on premises.'
            ].map((term, i) => (
              <li key={i} className="text-[8px] text-gray-500 font-medium flex gap-2">
                <span className="font-black text-gray-300">•</span> {term}
              </li>
            ))}
          </ul>
        </div>
        
        <div className="mt-8 pt-6 border-t border-gray-100 flex flex-col items-center gap-4">
           {config.showBarcode && <Barcode value={previewStudent?.rollNo || '0000'} height={25} width={1.2} fontSize={8} />}
           <div className="text-center">
              <p className="text-[8px] font-black text-gray-900 uppercase mb-1">{institution?.name}</p>
              <p className="text-[7px] text-gray-400 font-medium leading-tight max-w-[180px] mx-auto">{institution?.address || 'Address not provided'}</p>
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
                  { id: 'minimal', icon: Target, iconS: MinimalistIcon },
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
               
               <div className="bg-gray-900 rounded-[3rem] p-12 min-h-[500px] flex flex-col items-center justify-center gap-8 shadow-2xl shadow-gray-100 relative overflow-hidden group">
                  {/* Grid Lines Overlay */}
                  <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'linear-gradient(#4f46e5 1px, transparent 1px), linear-gradient(90deg, #4f46e5 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
                  
                  <motion.div 
                    layout
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="shadow-[0_40px_100px_-20px_rgba(0,0,0,0.5)] relative z-10"
                  >
                    {renderCurrentDesign(previewStudent)}
                  </motion.div>

                  {config.showBack && (
                     <motion.div 
                       initial={{ scale: 0.9, opacity: 0 }}
                       animate={{ scale: 1, opacity: 1 }}
                       className="shadow-[0_40px_100px_-20px_rgba(0,0,0,0.5)] relative z-10"
                     >
                       {renderBackDesign()}
                     </motion.div>
                  )}

                  <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-[8px] font-black text-gray-600 uppercase tracking-[0.4em] opacity-40 group-hover:opacity-100 transition-opacity">
                      3:3 Golden Ratio Template
                  </div>
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
