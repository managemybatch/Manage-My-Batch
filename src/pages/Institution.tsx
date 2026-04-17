import React, { useState, useEffect, useRef } from 'react';
import { Building, Share2, Download, Users, Briefcase, Layers, MapPin, Phone, Mail, Globe, Info, CheckCircle, ExternalLink, Loader2, Plus, Trash2, UserPlus, MessageSquare } from 'lucide-react';
import { useAuth } from '../lib/auth';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { cn, compressImage } from '../lib/utils';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, doc, getDoc, setDoc, updateDoc, query, where, getDocs, onSnapshot, orderBy, limit } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { Modal } from '../components/Modal';
import { ConfirmModal } from '../components/ConfirmModal';
import html2canvas from 'html2canvas';

interface InstitutionData {
  name: string;
  established: string;
  address: string;
  phone: string;
  email: string;
  description: string;
  vision: string;
  goal?: string;
  target?: string;
  photoURL?: string;
  logoURL?: string;
  principalName?: string;
  principalTitle?: string;
  principalPhotoURL?: string;
  admissionForm: {
    active: boolean;
    title: string;
    instructions: string;
    fields: Record<string, boolean>;
  };
}

interface Application {
  id: string;
  studentName: string;
  guardianPhone: string;
  email: string;
  grade: string;
  status: 'pending' | 'admitted' | 'rejected';
  createdAt: any;
  formData: any;
}

export function Institution() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'profile' | 'admissionForm' | 'applications'>('profile');
  const [newFieldName, setNewFieldName] = useState('');
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [institution, setInstitution] = useState<InstitutionData | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const bioRef = useRef<HTMLDivElement>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [stats, setStats] = useState({ students: 0, teachers: 0, batches: 0 });
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  useEffect(() => {
    if (!user?.uid) return;

    const instId = user.institutionId || user.uid;

    const unsubInst = onSnapshot(doc(db, 'institutions', instId), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setInstitution({
          name: data.name,
          established: data.established,
          address: data.address,
          phone: data.phone,
          email: data.email,
          description: data.description,
          vision: data.vision,
          goal: data.goal,
          target: data.target,
          photoURL: data.photoURL || data.photoUrl,
          logoURL: data.logoURL,
          principalName: data.principalName,
          principalTitle: data.principalTitle,
          principalPhotoURL: data.principalPhotoURL,
          admissionForm: data.admissionForm
        } as InstitutionData);
      } else {
        // Initialize default data if not exists
        const defaultData: InstitutionData = {
          name: user.displayName || '',
          established: '',
          address: '',
          phone: '',
          email: user.email || '',
          description: '',
          vision: '',
          goal: '',
          target: '',
          admissionForm: {
            active: false,
            title: 'Admission Form',
            instructions: 'Please fill out the form below to apply.',
            fields: {
              studentName: true,
              dob: true,
              birthReg: true,
              nid: false,
              fatherName: true,
              motherName: true,
              guardianPhone: true,
              admissionDate: true,
              batch: true,
              subjectGroup: false,
              address: true
            }
          }
        };
        setDoc(doc(db, 'institutions', instId), {
          ...defaultData,
          id: instId,
          createdAt: new Date().toISOString()
        });
      }
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `institutions/${instId}`);
      setLoading(false);
    });

    const unsubApps = onSnapshot(
      query(collection(db, 'applications'), where('institutionId', '==', instId), orderBy('createdAt', 'desc')),
      (snapshot) => {
        const mappedApps = snapshot.docs.map(doc => {
          const a = doc.data();
          return {
            id: doc.id,
            studentName: a.studentName,
            guardianPhone: a.guardianPhone,
            email: a.email,
            grade: a.grade,
            status: a.status,
            createdAt: a.createdAt,
            formData: a.formData
          };
        });
        setApplications(mappedApps as Application[]);
      },
      (error) => handleFirestoreError(error, OperationType.LIST, 'applications')
    );

    const fetchStats = async () => {
      try {
        const [studentsSnap, batchesSnap, teachersSnap] = await Promise.all([
          getDocs(query(collection(db, 'students'), where('institutionId', '==', instId))),
          getDocs(query(collection(db, 'batches'), where('institutionId', '==', instId))),
          getDocs(query(collection(db, 'teachers'), where('institutionId', '==', instId)))
        ]);

        setStats({
          students: studentsSnap.size,
          batches: batchesSnap.size,
          teachers: teachersSnap.size
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.LIST, 'stats');
      }
    };

    fetchStats();

    return () => {
      unsubInst();
      unsubApps();
    };
  }, [user]);

  const handleSaveProfile = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user?.uid || !institution || isSaving) return;
    
    setIsSaving(true);
    const instId = user.institutionId || user.uid;
    const formData = new FormData(e.currentTarget);
    const updatedData: any = {
      name: formData.get('name') as string,
      established: formData.get('established') as string,
      address: formData.get('address') as string,
      phone: formData.get('phone') as string,
      email: formData.get('email') as string,
      description: formData.get('description') as string,
      vision: formData.get('vision') as string,
      goal: formData.get('goal') as string,
      target: formData.get('target') as string,
      principalName: formData.get('principalName') as string,
      principalTitle: formData.get('principalTitle') as string,
      logoURL: institution.logoURL || '',
      principalPhotoURL: institution.principalPhotoURL || '',
      photoURL: institution.photoURL || '',
    };
    try {
      await updateDoc(doc(db, 'institutions', instId), updatedData);
      setToast({ message: 'Profile updated successfully!', type: 'success' });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'institutions');
      setToast({ message: 'Failed to update profile.', type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const compressed = await compressImage(file, 400, 0.7); // Smaller for logo
        setInstitution(prev => prev ? { ...prev, logoURL: compressed } : null);
      } catch (error) {
        console.error("Error compressing logo:", error);
        alert('Failed to process image.');
      }
    }
  };

  const handlePrincipalPhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const compressed = await compressImage(file, 600, 0.7);
        setInstitution(prev => prev ? { ...prev, principalPhotoURL: compressed } : null);
      } catch (error) {
        console.error("Error compressing photo:", error);
        alert('Failed to process image.');
      }
    }
  };

  const handleInstitutionPhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const compressed = await compressImage(file, 1000, 0.7);
        setInstitution(prev => prev ? { ...prev, photoURL: compressed } : null);
      } catch (error) {
        console.error("Error compressing photo:", error);
        alert('Failed to process image.');
      }
    }
  };

  const handleToggleField = async (fieldKey: string) => {
    if (!user?.uid || !institution) return;
    const instId = user.institutionId || user.uid;
    const updatedFields = {
      ...institution.admissionForm.fields,
      [fieldKey]: !institution.admissionForm.fields[fieldKey]
    };
    try {
      await updateDoc(doc(db, 'institutions', instId), {
        admissionForm: {
          ...institution.admissionForm,
          fields: updatedFields
        }
      });
    } catch (error) {
      console.error("Error toggling field:", error);
    }
  };

  const ADMISSION_FIELDS = [
    { key: 'studentName', label: 'ছাত্রের নাম*', required: true },
    { key: 'dob', label: 'জন্ম তারিখ*', required: true },
    { key: 'birthReg', label: 'জন্ম নিবন্ধন নম্বর*', required: true },
    { key: 'nid', label: 'এনআইডি নম্বর', required: false },
    { key: 'fatherName', label: 'পিতার নাম', required: false },
    { key: 'motherName', label: 'মাতার নাম', required: false },
    { key: 'guardianPhone', label: 'ফোন*', required: true },
    { key: 'admissionDate', label: 'ভর্তির তারিখ*', required: true },
    { key: 'batch', label: 'ব্যাচ*', required: true },
    { key: 'subjectGroup', label: 'বিষয় গ্রুপ', required: false },
    { key: 'address', label: 'বিস্তারিত ঠিকানা', required: false },
  ];

  const handleToggleAdmission = async () => {
    if (!user?.uid || !institution) return;
    const instId = user.institutionId || user.uid;
    try {
      await updateDoc(doc(db, 'institutions', instId), {
        admissionForm: {
          ...institution.admissionForm,
          active: !institution.admissionForm.active
        }
      });
    } catch (error) {
      console.error("Error toggling admission form:", error);
    }
  };

  const handleAdmit = (app: Application) => {
    const prefillData = {
      name: app.studentName,
      guardianPhone: app.guardianPhone,
      email: app.email,
      grade: app.grade,
      photoUrl: (app as any).photoUrl || (app.formData as any)?.photoUrl || (app.formData as any)?.photo,
      ...app.formData
    };
    const encodedData = encodeURIComponent(JSON.stringify(prefillData));
    navigate(`/students?prefill=${encodedData}`);
  };

  const shareProfile = () => {
    const instId = user?.institutionId || user?.uid;
    const url = `${window.location.origin}/public/institution/${instId}`;
    navigator.clipboard.writeText(url);
    setToast({ message: 'Profile link copied to clipboard!', type: 'success' });
  };

  const shareAdmission = () => {
    const instId = user?.institutionId || user?.uid;
    const url = `${window.location.origin}/public/admission/${instId}`;
    navigator.clipboard.writeText(url);
    setToast({ message: 'Admission link copied to clipboard!', type: 'success' });
  };

  const downloadBio = async () => {
    if (!institution || !bioRef.current || downloading) return;
    
    setDownloading(true);
    try {
      const { jsPDF } = await import('jspdf');
      
      // Wait a bit for images and styles to settle
      await new Promise(r => setTimeout(r, 500));

      const canvas = await html2canvas(bioRef.current, {
        scale: 1.5, // Reduced scale for better compatibility
        useCORS: true,
        logging: true, // Internal debug
        backgroundColor: '#ffffff',
        width: 800,
        height: bioRef.current.scrollHeight
      });
      
      if (!canvas || canvas.width === 0) {
        throw new Error('Canvas generation failed');
      }

      const imgData = canvas.toDataURL('image/jpeg', 0.8); // Jpeg is often more robust
      const pdf = new jsPDF('p', 'mm', 'a4');
      
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      
      const margin = 10;
      const imgWidth = pageWidth - (margin * 2);
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      let heightLeft = imgHeight;
      let position = margin;

      pdf.addImage(imgData, 'JPEG', margin, position, imgWidth, imgHeight);
      heightLeft -= (pageHeight - margin * 2);

      while (heightLeft >= 0) {
        pdf.addPage();
        position = heightLeft - imgHeight + margin;
        pdf.addImage(imgData, 'JPEG', margin, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      const safeName = institution.name ? institution.name.substring(0, 30).split(' ').join('_') : 'Institution';
      pdf.save(`${safeName}_Bio.pdf`);
    } catch (error: any) {
      console.error('Error generating PDF:', error);
      setToast({ message: `Failed to generate PDF: ${error.message || 'Check connection'}`, type: 'error' });
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">{t('institution.title')}</h1>
          <p className="text-gray-500 mt-1">{t('institution.subtitle')}</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={shareProfile}
            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-50 text-indigo-700 font-bold rounded-xl hover:bg-indigo-100 transition-all"
          >
            <Share2 className="w-4 h-4" /> {t('institution.profile.shareLink')}
          </button>
          <button 
            onClick={downloadBio}
            disabled={downloading}
            className="flex items-center gap-2 px-4 py-2.5 bg-gray-900 text-white font-bold rounded-xl hover:bg-gray-800 disabled:opacity-50 transition-all shadow-lg shadow-gray-200"
          >
            {downloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            {downloading ? 'Generating...' : t('institution.profile.downloadBio')}
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2 p-1 bg-gray-100 rounded-2xl w-fit">
        {(['profile', 'admissionForm', 'applications'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "px-6 py-2.5 text-sm font-bold rounded-xl transition-all",
              activeTab === tab 
                ? "bg-white text-indigo-600 shadow-sm" 
                : "text-gray-500 hover:text-gray-700"
            )}
          >
            {t(`institution.tabs.${tab}`)}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'profile' && (
          <motion.div
            key="profile"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-8"
          >
            <div className="lg:col-span-2 space-y-8">
              <form onSubmit={handleSaveProfile} className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pb-8 border-b border-gray-100 mb-8">
                  <div className="space-y-4 text-center">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block">Logo</label>
                    <div className="relative group mx-auto w-24 h-24">
                      <div className="w-full h-full bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl flex flex-col items-center justify-center text-gray-400 group-hover:border-indigo-500 transition-all cursor-pointer overflow-hidden">
                        {institution?.logoURL ? (
                          <img src={institution.logoURL} alt="Logo" className="w-full h-full object-contain p-2" />
                        ) : (
                          <Building className="w-8 h-8 opacity-20" />
                        )}
                      </div>
                      <input type="file" accept="image/*" onChange={handleLogoChange} className="absolute inset-0 opacity-0 cursor-pointer" />
                    </div>
                  </div>

                  <div className="space-y-4 text-center">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block">Principal Photo</label>
                    <div className="relative group mx-auto w-24 h-24">
                      <div className="w-full h-full bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl flex flex-col items-center justify-center text-gray-400 group-hover:border-indigo-500 transition-all cursor-pointer overflow-hidden">
                        {institution?.principalPhotoURL ? (
                          <img src={institution.principalPhotoURL} alt="Principal" className="w-full h-full object-cover" />
                        ) : (
                          <Users className="w-8 h-8 opacity-20" />
                        )}
                      </div>
                      <input type="file" accept="image/*" onChange={handlePrincipalPhotoChange} className="absolute inset-0 opacity-0 cursor-pointer" />
                    </div>
                  </div>

                  <div className="space-y-4 text-center">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block">Institution Profile Photo</label>
                    <div className="relative group mx-auto w-full h-24 max-w-[200px]">
                      <div className="w-full h-full bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl flex flex-col items-center justify-center text-gray-400 group-hover:border-indigo-500 transition-all cursor-pointer overflow-hidden">
                        {institution?.photoURL ? (
                          <img src={institution.photoURL} alt="Institution" className="w-full h-full object-cover" />
                        ) : (
                          <Building className="w-8 h-8 opacity-20" />
                        )}
                      </div>
                      <input type="file" accept="image/*" onChange={handleInstitutionPhotoChange} className="absolute inset-0 opacity-0 cursor-pointer" />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">{t('institution.profile.info.name')}</label>
                    <input name="name" defaultValue={institution?.name} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Principal Name</label>
                    <input name="principalName" defaultValue={institution?.principalName} placeholder="Full Name" className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Principal Title</label>
                    <input name="principalTitle" defaultValue={institution?.principalTitle} placeholder="e.g. Principal / Director" className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">{t('institution.profile.established')}</label>
                    <input name="established" defaultValue={institution?.established} placeholder="e.g. 2015" className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">{t('institution.profile.info.phone')}</label>
                    <input name="phone" defaultValue={institution?.phone} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">{t('institution.profile.info.email')}</label>
                    <input name="email" defaultValue={institution?.email} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all" />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Goal</label>
                    <input name="goal" defaultValue={institution?.goal} placeholder="e.g. Provide quality education" className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Target</label>
                    <input name="target" defaultValue={institution?.target} placeholder="e.g. 1000+ Students" className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all" />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">{t('institution.profile.info.address')}</label>
                  <textarea name="address" defaultValue={institution?.address} rows={2} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all resize-none" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">{t('institution.profile.info.description')}</label>
                  <textarea name="description" defaultValue={institution?.description} rows={4} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all resize-none" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">{t('institution.profile.info.vision')}</label>
                  <textarea name="vision" defaultValue={institution?.vision} rows={3} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all resize-none" />
                </div>
                <div className="flex justify-end">
                  <button 
                    type="submit" 
                    disabled={isSaving}
                    className="px-8 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-indigo-200 flex items-center gap-2"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        {t('common.saving')}...
                      </>
                    ) : (
                      t('common.save')
                    )}
                  </button>
                </div>
              </form>
            </div>

            <div className="space-y-6">
              <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-6">
                <h3 className="text-lg font-bold text-gray-900">{t('institution.profile.title')} Stats</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-indigo-50 rounded-2xl">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white">
                        <Users className="w-5 h-5" />
                      </div>
                      <span className="text-sm font-bold text-gray-700">{t('institution.profile.stats.students')}</span>
                    </div>
                    <span className="text-xl font-black text-indigo-600">{stats.students}</span>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-emerald-50 rounded-2xl">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center text-white">
                        <Briefcase className="w-5 h-5" />
                      </div>
                      <span className="text-sm font-bold text-gray-700">{t('institution.profile.stats.teachers')}</span>
                    </div>
                    <span className="text-xl font-black text-emerald-600">{stats.teachers}</span>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-amber-50 rounded-2xl">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-amber-600 rounded-xl flex items-center justify-center text-white">
                        <Layers className="w-5 h-5" />
                      </div>
                      <span className="text-sm font-bold text-gray-700">{t('institution.profile.stats.batches')}</span>
                    </div>
                    <span className="text-xl font-black text-amber-600">{stats.batches}</span>
                  </div>
                </div>
              </div>

              <div className="bg-indigo-600 p-6 rounded-3xl text-white space-y-4">
                <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
                  <Globe className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-bold text-lg">Public Portfolio</h4>
                  <p className="text-indigo-100 text-sm mt-1">Your institution profile is live and shareable with parents and students.</p>
                </div>
                <button 
                  onClick={() => {
                    const instId = user?.institutionId || user?.uid;
                    window.open(`/public/institution/${instId}`, '_blank');
                  }}
                  className="w-full py-3 bg-white text-indigo-600 font-bold rounded-xl hover:bg-indigo-50 transition-all flex items-center justify-center gap-2"
                >
                  <ExternalLink className="w-4 h-4" /> View Public Profile
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'admissionForm' && (
          <motion.div
            key="admission"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-8"
          >
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm space-y-8">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">{t('institution.admission.title')}</h3>
                    <p className="text-sm text-gray-500 mt-1">Customize your online admission form.</p>
                  </div>
                  <button 
                    onClick={handleToggleAdmission}
                    className={cn(
                      "px-6 py-2.5 rounded-xl font-bold transition-all flex items-center gap-2",
                      institution?.admissionForm.active 
                        ? "bg-emerald-50 text-emerald-600 border border-emerald-100" 
                        : "bg-gray-100 text-gray-500 border border-gray-200"
                    )}
                  >
                    {institution?.admissionForm.active ? <CheckCircle className="w-4 h-4" /> : null}
                    {institution?.admissionForm.active ? 'Form Active' : 'Form Inactive'}
                  </button>
                </div>

                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">{t('institution.admission.formTitle')}</label>
                    <input 
                      defaultValue={institution?.admissionForm.title}
                    onBlur={async (e) => {
                        const instId = user?.institutionId || user?.uid;
                        if (!instId) return;
                        try {
                          await updateDoc(doc(db, 'institutions', instId), {
                            admissionForm: {
                              ...institution.admissionForm,
                              title: e.target.value
                            }
                          });
                        } catch (error) {
                          console.error("Error updating title:", error);
                        }
                      }}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all" 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">{t('institution.admission.instructions')}</label>
                    <textarea 
                      defaultValue={institution?.admissionForm.instructions}
                      onBlur={async (e) => {
                        const instId = user?.institutionId || user?.uid;
                        if (!instId) return;
                        try {
                          await updateDoc(doc(db, 'institutions', instId), {
                            admissionForm: {
                              ...institution.admissionForm,
                              instructions: e.target.value
                            }
                          });
                        } catch (error) {
                          console.error("Error updating instructions:", error);
                        }
                      }}
                      rows={3} 
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all resize-none" 
                    />
                  </div>
                  
                  <div className="space-y-4">
                    <div className="flex items-center justify-between gap-4">
                      <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Form Fields Visibility</label>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {ADMISSION_FIELDS.map((field) => (
                        <div 
                          key={field.key} 
                          onClick={() => handleToggleField(field.key)}
                          className={cn(
                            "flex items-center justify-between p-4 rounded-2xl border transition-all cursor-pointer",
                            institution?.admissionForm.fields[field.key]
                              ? "bg-indigo-50 border-indigo-100 ring-1 ring-indigo-100"
                              : "bg-gray-50 border-gray-200 opacity-60 hover:opacity-100"
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              "w-5 h-5 rounded-md border flex items-center justify-center transition-all",
                              institution?.admissionForm.fields[field.key]
                                ? "bg-indigo-600 border-indigo-600 text-white"
                                : "bg-white border-gray-300"
                            )}>
                              {institution?.admissionForm.fields[field.key] && <CheckCircle className="w-3 h-3" />}
                            </div>
                            <span className={cn(
                              "text-sm font-bold",
                              institution?.admissionForm.fields[field.key] ? "text-indigo-900" : "text-gray-500"
                            )}>{field.label}</span>
                          </div>
                          {field.required && (
                            <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400">Required</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-indigo-50 p-6 rounded-3xl border border-indigo-100 space-y-4">
                <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white">
                  <Share2 className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-bold text-indigo-900">Share Admission Form</h4>
                  <p className="text-indigo-700/70 text-sm mt-1">Copy this link and share it on social media or your website.</p>
                </div>
                <div className="flex items-center gap-2 p-2 bg-white border border-indigo-200 rounded-xl">
                  <input 
                    readOnly 
                    value={`${window.location.origin}/public/admission/${user?.institutionId || user?.uid}`}
                    className="flex-1 bg-transparent border-none text-xs text-gray-500 focus:ring-0 outline-none truncate"
                  />
                  <button 
                    onClick={shareAdmission}
                    className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                  >
                    <Share2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                <h4 className="font-bold text-gray-900 mb-4">Application Summary</h4>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">Total Received</span>
                    <span className="text-sm font-bold text-gray-900">{applications.length}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">Pending Review</span>
                    <span className="text-sm font-bold text-amber-600">{applications.filter(a => a.status === 'pending').length}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">Admitted</span>
                    <span className="text-sm font-bold text-emerald-600">{applications.filter(a => a.status === 'admitted').length}</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'applications' && (
          <motion.div
            key="applications"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden"
          >
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-xl font-bold text-gray-900">{t('institution.applications.title')}</h3>
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 bg-indigo-50 text-indigo-600 text-xs font-bold rounded-full">
                  {applications.filter(a => a.status === 'pending').length} New
                </span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Applicant</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Contact</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Grade</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {applications.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                        {t('institution.applications.noApplications')}
                      </td>
                    </tr>
                  ) : (
                    applications.map((app) => (
                      <tr key={app.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="font-bold text-gray-900">{app.studentName}</div>
                          <div className="text-xs text-gray-500">{app.email}</div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">{app.guardianPhone}</td>
                        <td className="px-6 py-4">
                          <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded-md">
                            {app.grade}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {app.createdAt ? new Date(app.createdAt).toLocaleDateString() : 'N/A'}
                        </td>
                        <td className="px-6 py-4">
                          <span className={cn(
                            "px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-full",
                            app.status === 'pending' ? "bg-amber-50 text-amber-600" :
                            app.status === 'admitted' ? "bg-emerald-50 text-emerald-600" :
                            "bg-rose-50 text-rose-600"
                          )}>
                            {app.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button 
                              onClick={() => navigate('/messages', { state: { recipientType: 'applicant', recipientId: app.id, recipientName: app.studentName } })}
                              className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                              title="Message Applicant"
                            >
                              <MessageSquare className="w-4 h-4" />
                            </button>
                            <button className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all">
                              <Info className="w-4 h-4" />
                            </button>
                            {app.status === 'pending' && (
                              <button 
                                onClick={() => handleAdmit(app)}
                                className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 text-white text-xs font-bold rounded-lg hover:bg-indigo-700 transition-all shadow-md shadow-indigo-100"
                              >
                                <UserPlus className="w-3 h-3" /> {t('institution.applications.admit')}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-gray-900 text-white px-6 py-3 rounded-2xl shadow-2xl z-[100] flex items-center gap-3 border border-white/10 backdrop-blur-xl"
          >
            <div className={cn(
              "w-8 h-8 rounded-xl flex items-center justify-center",
              toast.type === 'success' ? "bg-emerald-500" : "bg-rose-500"
            )}>
              {toast.type === 'success' ? <CheckCircle className="w-5 h-5 text-white" /> : <Info className="w-5 h-5 text-white" />}
            </div>
            <span className="font-bold text-sm">{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>
      <HiddenBioTemplate institution={institution} stats={stats} bioRef={bioRef} />
    </div>
  );
}

function HiddenBioTemplate({ institution, stats, bioRef }: { institution: any, stats: any, bioRef: React.RefObject<HTMLDivElement> }) {
  if (!institution) return null;
  return (
    <div className="fixed top-0 left-0 -z-[100] opacity-0 pointer-events-none overflow-hidden" style={{ width: '800px' }}>
      <div 
        ref={bioRef}
        className="w-[800px] p-12 bg-white space-y-12"
        style={{ fontFamily: '"Inter", sans-serif', minHeight: '1000px', color: '#111827' }}
      >
        <div className="flex items-center gap-8 border-b-4 pb-8" style={{ borderColor: '#4f46e5' }}>
          <div className="w-32 h-32 rounded-3xl flex items-center justify-center text-4xl font-black shrink-0 overflow-hidden" style={{ backgroundColor: '#eef2ff', color: '#4f46e5' }}>
            {institution.logoURL ? (
              <img src={institution.logoURL} alt="Logo" className="w-full h-full object-contain p-4" crossOrigin="anonymous" referrerPolicy="no-referrer" />
            ) : (
              institution.name.charAt(0)
            )}
          </div>
          <div className="space-y-2">
            <h1 className="text-4xl font-black tracking-tight" style={{ color: '#111827' }}>{institution.name}</h1>
            <p className="font-bold flex items-center gap-2" style={{ color: '#6b7280' }}>
              <MapPin className="w-4 h-4" /> {institution.address || 'Address not provided'}
            </p>
            <p className="font-bold uppercase tracking-widest text-xs" style={{ color: '#4f46e5' }}>Established: {institution.established || 'N/A'}</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-6">
          {[
            { label: 'Students', value: stats.students, color: '#2563eb' },
            { label: 'Teachers', value: stats.teachers, color: '#059669' },
            { label: 'Batches', value: stats.batches, color: '#d97706' },
          ].map((stat, idx) => (
            <div key={idx} className="p-6 rounded-2xl text-center border" style={{ backgroundColor: '#f9fafb', borderColor: '#f3f4f6' }}>
              <p className="text-[10px] font-black border uppercase tracking-widest mb-1" style={{ color: '#9ca3af' }}>{stat.label}</p>
              <h3 className="text-2xl font-black" style={{ color: stat.color }}>{stat.value}</h3>
            </div>
          ))}
        </div>

        <div className="space-y-8">
          <section className="space-y-4">
            <h2 className="text-2xl font-black border-l-4 pl-4 uppercase tracking-tight" style={{ color: '#4f46e5', borderColor: '#4f46e5' }}>About Institution</h2>
            <p className="leading-relaxed text-lg whitespace-pre-wrap" style={{ color: '#4b5563' }}>
              {institution.description || 'No description provided.'}
            </p>
          </section>

          {(institution.vision || institution.goal || institution.target) && (
            <section className="space-y-6 p-8 rounded-3xl border" style={{ backgroundColor: '#f5f7ff', borderColor: '#eef2ff' }}>
              {institution.vision && (
                <div className="space-y-2">
                  <h3 className="text-lg font-black" style={{ color: '#111827' }}>Vision & Mission</h3>
                  <p className="leading-relaxed whitespace-pre-wrap" style={{ color: '#4b5563' }}>{institution.vision}</p>
                </div>
              )}
              {institution.goal && (
                <div className="space-y-2">
                  <h3 className="text-lg font-black" style={{ color: '#111827' }}>Our Goal</h3>
                  <p className="leading-relaxed whitespace-pre-wrap" style={{ color: '#4b5563' }}>{institution.goal}</p>
                </div>
              )}
              {institution.target && (
                <div className="space-y-2">
                  <h3 className="text-lg font-black" style={{ color: '#111827' }}>Our Target</h3>
                  <p className="leading-relaxed whitespace-pre-wrap" style={{ color: '#4b5563' }}>{institution.target}</p>
                </div>
              )}
            </section>
          )}

          {institution.principalName && (
            <section className="space-y-6">
              <h2 className="text-2xl font-black border-l-4 pl-4 uppercase tracking-tight" style={{ color: '#4f46e5', borderColor: '#4f46e5' }}>Message from Principal</h2>
              <div className="flex gap-8 items-start">
                {institution.principalPhotoURL && (
                  <div className="w-32 h-32 rounded-2xl overflow-hidden shrink-0 shadow-lg border-4 border-white ring-1 ring-gray-100">
                    <img src={institution.principalPhotoURL} alt="Principal" className="w-full h-full object-cover" crossOrigin="anonymous" />
                  </div>
                )}
                <div className="space-y-2">
                  <p className="text-xl font-bold" style={{ color: '#111827' }}>{institution.principalName}</p>
                  <p className="font-bold text-xs uppercase tracking-widest" style={{ color: '#4f46e5' }}>{institution.principalTitle || 'Principal'}</p>
                  <p className="italic leading-relaxed text-lg" style={{ color: '#4b5563' }}>
                    "Welcome to our institution. We are committed to providing the highest quality education and fostering a nurturing environment for all our students."
                  </p>
                </div>
              </div>
            </section>
          )}

          <div className="pt-8 border-t" style={{ borderColor: '#f3f4f6' }}>
            <h3 className="text-lg font-black mb-4" style={{ color: '#111827' }}>Contact Information</h3>
            <div className="grid grid-cols-2 gap-8">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#f9fafb', color: '#9ca3af' }}>
                    <Phone className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: '#9ca3af' }}>Phone</p>
                    <p className="font-bold" style={{ color: '#111827' }}>{institution.phone || 'N/A'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#f9fafb', color: '#9ca3af' }}>
                    <Mail className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: '#9ca3af' }}>Email</p>
                    <p className="font-bold" style={{ color: '#111827' }}>{institution.email || 'N/A'}</p>
                  </div>
                </div>
              </div>
              <div className="p-6 rounded-2xl border" style={{ backgroundColor: '#f9fafb', borderColor: '#f3f4f6' }}>
                <p className="text-[10px] font-black uppercase tracking-widest mb-1" style={{ color: '#818cf8' }}>Generated by</p>
                <p className="font-black text-xl tracking-tight" style={{ color: '#4f46e5' }}>Manage My Batch</p>
                <p className="text-xs" style={{ color: '#9ca3af' }}>Your education partner</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
