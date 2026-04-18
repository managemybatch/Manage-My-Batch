import React, { useState, useEffect, useRef } from 'react';
import { 
  Building, Share2, Download, Users, Briefcase, Layers, 
  MapPin, Phone, Mail, Globe, Info, CheckCircle, 
  ExternalLink, Loader2, Plus, Trash2, UserPlus, 
  MessageSquare, Calendar, Newspaper, Megaphone, Send, Edit2,
  Settings, TrendingUp
} from 'lucide-react';
import { useAuth } from '../lib/auth';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { cn, compressImage } from '../lib/utils';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, doc, getDoc, setDoc, updateDoc, query, where, getDocs, onSnapshot, orderBy, limit, addDoc, deleteDoc } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { Modal } from '../components/Modal';
import { ConfirmModal } from '../components/ConfirmModal';
import html2canvas from 'html2canvas';

interface WebsiteSection {
  id: string;
  type: 'hero' | 'stats' | 'about' | 'gallery' | 'news' | 'events' | 'circulars' | 'results' | 'custom_text';
  title?: string;
  content?: string;
  images?: string[];
  active: boolean;
  order: number;
}

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
  slug?: string;
  photoURL?: string;
  logoURL?: string;
  principalName?: string;
  principalTitle?: string;
  principalPhotoURL?: string;
  websiteConfig: {
    metaTitle: string;
    metaDescription: string;
    sections: WebsiteSection[];
  };
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
  const [activeTab, setActiveTab] = useState<'profile' | 'website' | 'admissionForm' | 'applications'>('profile');
  const [newFieldName, setNewFieldName] = useState('');
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [institution, setInstitution] = useState<InstitutionData | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const bioRef = useRef<HTMLDivElement>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [stats, setStats] = useState({ students: 0, teachers: 0, batches: 0 });
  const [exams, setExams] = useState<any[]>([]);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [slugStatus, setSlugStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');
  
  const [notices, setNotices] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [circulars, setCirculars] = useState<any[]>([]);
  
  const [showNoticeModal, setShowNoticeModal] = useState(false);
  const [showEventModal, setShowEventModal] = useState(false);
  const [showCircularModal, setShowCircularModal] = useState(false);
  const [showSectionModal, setShowSectionModal] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [editingSection, setEditingSection] = useState<WebsiteSection | null>(null);

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
          slug: data.slug || '',
          photoURL: data.photoURL || data.photoUrl,
          logoURL: data.logoURL,
          principalName: data.principalName,
          principalTitle: data.principalTitle,
          principalPhotoURL: data.principalPhotoURL,
          websiteConfig: data.websiteConfig || {
            metaTitle: `${data.name} | Official Website`,
            metaDescription: data.description?.substring(0, 160) || `Welcome to ${data.name}.`,
            sections: [
              { id: 'sec_hero', type: 'hero', active: true, order: 0 },
              { id: 'sec_stats', type: 'stats', active: true, order: 1 },
              { id: 'sec_about', type: 'about', active: true, order: 2 },
              { id: 'sec_news', type: 'news', title: 'Latest Notices', active: true, order: 3 },
              { id: 'sec_results', type: 'results', title: 'Exam Results', active: true, order: 4 },
            ]
          },
          admissionForm: data.admissionForm || {
            active: false,
            title: 'Admission Form',
            instructions: 'Please fill out the form below to apply.',
            fields: { studentName: true, guardianPhone: true, address: true }
          }
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
          websiteConfig: {
            metaTitle: `${user.displayName} | Official Profile`,
            metaDescription: `Welcome to the official portal of ${user.displayName}. View news, notices, and exam results.`,
            sections: [
              { id: 'sec_hero', type: 'hero', active: true, order: 0 },
              { id: 'sec_stats', type: 'stats', active: true, order: 1 },
              { id: 'sec_about', type: 'about', active: true, order: 2 },
              { id: 'sec_news', type: 'news', title: 'Latest Notices', active: true, order: 3 },
              { id: 'sec_results', type: 'results', title: 'Exam Results', active: true, order: 4 },
            ]
          },
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
        const [studentsSnap, batchesSnap, teachersSnap, examsSnap] = await Promise.all([
          getDocs(query(collection(db, 'students'), where('institutionId', '==', instId))),
          getDocs(query(collection(db, 'batches'), where('institutionId', '==', instId))),
          getDocs(query(collection(db, 'teachers'), where('institutionId', '==', instId))),
          getDocs(query(collection(db, 'offlineExams'), where('institutionId', '==', instId), orderBy('date', 'desc')))
        ]);

        setStats({
          students: studentsSnap.size,
          batches: batchesSnap.size,
          teachers: teachersSnap.size
        });
        setExams(examsSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (error) {
        handleFirestoreError(error, OperationType.LIST, 'stats');
      }
    };

    fetchStats();

    // Fetch Notices, Events, Circulars
    const unsubNotices = onSnapshot(query(collection(db, 'notices'), where('institutionId', '==', instId), orderBy('createdAt', 'desc')), (s) => {
      setNotices(s.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    const unsubEvents = onSnapshot(query(collection(db, 'events'), where('institutionId', '==', instId), orderBy('createdAt', 'desc')), (s) => {
      setEvents(s.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    const unsubCirculars = onSnapshot(query(collection(db, 'circulars'), where('institutionId', '==', instId), orderBy('createdAt', 'desc')), (s) => {
      setCirculars(s.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    return () => {
      unsubInst();
      unsubApps();
      unsubNotices();
      unsubEvents();
      unsubCirculars();
    };
  }, [user]);

  const handleDeleteItem = async (col: string, id: string) => {
    if (!window.confirm('Are you sure you want to delete this item?')) return;
    try {
      await deleteDoc(doc(db, col, id));
      setToast({ message: 'Item deleted!', type: 'success' });
    } catch (error) {
      setToast({ message: 'Failed to delete!', type: 'error' });
    }
  };

  const handleSaveItem = async (col: string, data: any) => {
    const instId = user?.institutionId || user?.uid;
    if (!instId) return;
    setIsSaving(true);
    try {
      if (editingItem) {
        await updateDoc(doc(db, col, editingItem.id), data);
      } else {
        await addDoc(collection(db, col), {
          ...data,
          institutionId: instId,
          createdAt: new Date().toISOString()
        });
      }
      setToast({ message: 'Saved successfully!', type: 'success' });
      setShowNoticeModal(false);
      setShowEventModal(false);
      setShowCircularModal(false);
      setEditingItem(null);
    } catch (error) {
      setToast({ message: 'Failed to save!', type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  const checkSlugAvailability = async (slug: string) => {
    if (!slug || slug === institution?.slug) {
      setSlugStatus('idle');
      return;
    }
    setSlugStatus('checking');
    try {
      const q = query(collection(db, 'institutions'), where('slug', '==', slug), limit(1));
      const snap = await getDocs(q);
      setSlugStatus(snap.empty ? 'available' : 'taken');
    } catch (error) {
      console.error("Error checking slug:", error);
      setSlugStatus('idle');
    }
  };

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
      slug: formData.get('slug') as string,
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
    const url = institution?.slug 
      ? `${window.location.origin}/i/${institution.slug}`
      : `${window.location.origin}/public/institution/${instId}`;
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
        {(['profile', 'website', 'admissionForm', 'applications'] as const).map((tab) => (
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
            {tab === 'website' ? 'Web Settings' : t(`institution.tabs.${tab}`)}
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
                <div className="space-y-2 hidden">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Custom Link (Slug)</label>
                  <input name="slug" defaultValue={institution?.slug} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all" />
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

        {activeTab === 'website' && (
          <motion.div
            key="website"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-8"
          >
            {/* SEO & URL Settings */}
            <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm space-y-8">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-gray-50">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-100">
                    <Globe className="w-7 h-7" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-gray-900 tracking-tight">Website & SEO</h3>
                    <p className="text-gray-500 font-medium">Manage your public presence and search ranking.</p>
                  </div>
                </div>
                <button 
                  onClick={() => {
                    const instId = user?.institutionId || user?.uid;
                    const url = institution?.slug ? `${window.location.origin}/i/${institution.slug}` : `${window.location.origin}/public/institution/${instId}`;
                    window.open(url, '_blank');
                  }}
                  className="flex items-center gap-2 px-6 py-3 bg-indigo-50 text-indigo-700 font-bold rounded-xl hover:bg-indigo-100 transition-all border border-indigo-100"
                >
                  <ExternalLink className="w-4 h-4" /> Preview Live Site
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Custom Profile URL (Slug)</label>
                    <div className="flex items-center gap-2">
                      <div className="px-4 py-3 bg-gray-100 border border-gray-200 rounded-xl text-sm text-gray-500 font-bold">
                        /i/
                      </div>
                      <input 
                        value={institution?.slug || ''}
                        onChange={(e) => {
                          const val = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '');
                          setInstitution(prev => prev ? { ...prev, slug: val } : null);
                          checkSlugAvailability(val);
                        }}
                        placeholder="coaching-name"
                        className="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all font-bold"
                      />
                    </div>
                    {slugStatus === 'checking' && <p className="text-xs text-gray-400 animate-pulse ml-1">Checking availability...</p>}
                    {slugStatus === 'available' && <p className="text-xs text-emerald-600 font-bold ml-1 flex items-center gap-1"><CheckCircle className="w-3 h-3" /> URL available!</p>}
                    {slugStatus === 'taken' && <p className="text-xs text-rose-500 font-bold ml-1 flex items-center gap-1"><Info className="w-3 h-3" /> This URL is already taken.</p>}
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Meta Title (SEO)</label>
                    <input 
                      value={institution?.websiteConfig.metaTitle || ''}
                      onChange={(e) => setInstitution(prev => prev ? { ...prev, websiteConfig: { ...prev.websiteConfig, metaTitle: e.target.value } } : null)}
                      placeholder="e.g. Best Coaching Center in Dhaka | Sunny Academy"
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none font-medium"
                    />
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Meta Description (SEO)</label>
                    <textarea 
                      value={institution?.websiteConfig.metaDescription || ''}
                      onChange={(e) => setInstitution(prev => prev ? { ...prev, websiteConfig: { ...prev.websiteConfig, metaDescription: e.target.value } } : null)}
                      rows={4}
                      placeholder="Briefly describe your institution for Google search results..."
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none font-medium resize-none"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t border-gray-50 flex justify-end">
                <button 
                  onClick={async () => {
                    const instId = user?.institutionId || user?.uid;
                    if (!instId || !institution) return;
                    setIsSaving(true);
                    try {
                      await updateDoc(doc(db, 'institutions', instId), { 
                        slug: institution.slug,
                        websiteConfig: institution.websiteConfig
                      });
                      setToast({ message: 'Settings Saved!', type: 'success' });
                    } catch (error) {
                      setToast({ message: 'Save failed!', type: 'error' });
                    } finally {
                      setIsSaving(false);
                    }
                  }}
                  disabled={isSaving || slugStatus === 'taken'}
                  className="px-8 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-all shadow-lg shadow-indigo-100"
                >
                  {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Save Site Settings'}
                </button>
              </div>
            </div>

            {/* Landing Page Sections (CMS) */}
            <div className="space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center text-amber-600">
                    <Layers className="w-5 h-5" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900">Landing Page Sections</h3>
                </div>
                <div className="flex items-center gap-2">
                  <select 
                    onChange={(e) => {
                      if (!e.target.value || !institution) return;
                      const type = e.target.value as any;
                      const newSection: WebsiteSection = {
                        id: `sec_${Date.now()}`,
                        type,
                        title: type.charAt(0).toUpperCase() + type.slice(1),
                        active: true,
                        order: institution.websiteConfig.sections.length
                      };
                      setInstitution({
                        ...institution,
                        websiteConfig: {
                          ...institution.websiteConfig,
                          sections: [...institution.websiteConfig.sections, newSection]
                        }
                      });
                      e.target.value = '';
                    }}
                    className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-indigo-500/20 outline-none"
                  >
                    <option value="">+ Add New Section</option>
                    <option value="custom_text">Custom Text/HTML</option>
                    <option value="gallery">Image Gallery</option>
                    <option value="news">News & Notices</option>
                    <option value="events">Events Calendar</option>
                    <option value="circulars">Job Board</option>
                    <option value="results">Results Portal</option>
                    <option value="stats">Statistics Counter</option>
                  </select>
                </div>
              </div>

              <div className="space-y-4">
                {institution?.websiteConfig.sections.sort((a, b) => a.order - b.order).map((section, idx) => (
                  <div key={section.id} className={cn(
                    "bg-white p-6 rounded-3xl border transition-all group",
                    section.active ? "border-gray-100 shadow-sm" : "border-gray-100 opacity-60 bg-gray-50/50"
                  )}>
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div className="flex flex-col gap-1">
                          <button 
                            disabled={idx === 0}
                            onClick={() => {
                              if (!institution) return;
                              const sections = [...institution.websiteConfig.sections];
                              const prevIdx = sections.findIndex(s => s.order === section.order - 1);
                              if (prevIdx !== -1) {
                                sections[idx].order--;
                                sections[prevIdx].order++;
                                setInstitution({ ...institution, websiteConfig: { ...institution.websiteConfig, sections } });
                              }
                            }}
                            className="p-1 hover:bg-gray-100 rounded text-gray-400 disabled:opacity-20"
                          >
                            <Plus className="w-3 h-3 rotate-180" />
                          </button>
                          <button 
                            disabled={idx === (institution?.websiteConfig.sections.length || 0) - 1}
                            onClick={() => {
                              if (!institution) return;
                              const sections = [...institution.websiteConfig.sections];
                              const nextIdx = sections.findIndex(s => s.order === section.order + 1);
                              if (nextIdx !== -1) {
                                sections[idx].order++;
                                sections[nextIdx].order--;
                                setInstitution({ ...institution, websiteConfig: { ...institution.websiteConfig, sections } });
                              }
                            }}
                            className="p-1 hover:bg-gray-100 rounded text-gray-400 disabled:opacity-20"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                        <div className={cn(
                          "w-12 h-12 rounded-2xl flex items-center justify-center",
                          section.type === 'hero' ? 'bg-indigo-100 text-indigo-600' :
                          section.type === 'news' ? 'bg-amber-100 text-amber-600' :
                          section.type === 'results' ? 'bg-emerald-100 text-emerald-600' :
                          'bg-gray-100 text-gray-600'
                        )}>
                          {section.type === 'hero' ? <Building className="w-6 h-6" /> :
                           section.type === 'news' ? <Megaphone className="w-6 h-6" /> :
                           section.type === 'results' ? <CheckCircle className="w-6 h-6" /> :
                           section.type === 'gallery' ? <Info className="w-6 h-6" /> :
                           <Layers className="w-6 h-6" />}
                        </div>
                        <div>
                          <input 
                            value={section.title || ''}
                            onChange={(e) => {
                              const sections = institution.websiteConfig.sections.map(s => s.id === section.id ? { ...s, title: e.target.value } : s);
                              setInstitution({ ...institution, websiteConfig: { ...institution.websiteConfig, sections } });
                            }}
                            className="font-bold text-gray-900 bg-transparent border-none p-0 focus:ring-0 w-full outline-none"
                            placeholder="Section Title"
                          />
                          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{section.type.replace('_', ' ')}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => {
                            const sections = institution.websiteConfig.sections.map(s => s.id === section.id ? { ...s, active: !s.active } : s);
                            setInstitution({ ...institution, websiteConfig: { ...institution.websiteConfig, sections } });
                          }}
                          className={cn(
                            "px-3 py-1.5 rounded-lg text-xs font-bold transition-all border",
                            section.active ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-gray-50 text-gray-400 border-gray-200"
                          )}
                        >
                          {section.active ? 'Active' : 'Hidden'}
                        </button>
                        {section.type === 'custom_text' && (
                          <button 
                            onClick={() => {
                              setEditingSection(section);
                              setShowSectionModal(true);
                            }}
                            className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        )}
                        {section.type === 'results' && (
                          <button 
                            onClick={() => {
                              setEditingSection(section);
                              setShowSectionModal(true);
                            }}
                            className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg"
                          >
                            <Settings className="w-4 h-4" />
                          </button>
                        )}
                        <button 
                          onClick={() => {
                            if (!window.confirm('Delete this section?')) return;
                            const sections = institution.websiteConfig.sections.filter(s => s.id !== section.id);
                            setInstitution({ ...institution, websiteConfig: { ...institution.websiteConfig, sections } });
                          }}
                          className="p-2 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {section.type === 'custom_text' && section.content && (
                      <div className="mt-4 p-4 bg-gray-50 rounded-2xl text-sm text-gray-600 italic line-clamp-2">
                        {section.content}
                      </div>
                    )}
                  </div>
                ))}

                {institution?.websiteConfig.sections.length === 0 && (
                  <div className="text-center py-20 bg-gray-50 rounded-[40px] border-2 border-dashed border-gray-200">
                    <Layers className="w-16 h-16 text-gray-200 mx-auto mb-4" />
                    <p className="text-gray-400 font-bold italic">No sections added to your landing page yet.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Existing Lists for News, Events etc. (Management Areas) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-8 border-t border-gray-100">
                <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center text-amber-600">
                      <Megaphone className="w-5 h-5" />
                    </div>
                    <h4 className="font-bold text-gray-900">Manage News & Notices</h4>
                  </div>
                  <button onClick={() => { setEditingItem(null); setShowNoticeModal(true); }} className="p-2 bg-indigo-50 text-indigo-600 rounded-lg transition-transform hover:scale-110"><Plus className="w-4 h-4" /></button>
                </div>
                <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                  {notices.map(n => (
                    <div key={n.id} className="p-4 bg-gray-50 rounded-2xl border border-gray-100 flex items-center justify-between group hover:bg-white hover:shadow-md transition-all">
                      <div className="min-w-0">
                        <p className="font-bold text-gray-900 truncate">{n.title}</p>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{n.date}</p>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => { setEditingItem(n); setShowNoticeModal(true); }} className="p-2 text-gray-400 hover:text-indigo-600"><Edit2 className="w-4 h-4" /></button>
                        <button onClick={() => handleDeleteItem('notices', n.id)} className="p-2 text-gray-400 hover:text-rose-600"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

               <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center text-indigo-600">
                      <Calendar className="w-5 h-5" />
                    </div>
                    <h4 className="font-bold text-gray-900">Manage Events</h4>
                  </div>
                  <button onClick={() => { setEditingItem(null); setShowEventModal(true); }} className="p-2 bg-indigo-50 text-indigo-600 rounded-lg transition-transform hover:scale-110"><Plus className="w-4 h-4" /></button>
                </div>
                <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                  {events.map(e => (
                    <div key={e.id} className="p-4 bg-gray-50 rounded-2xl border border-gray-100 flex items-center justify-between group hover:bg-white hover:shadow-md transition-all">
                      <div className="min-w-0">
                        <p className="font-bold text-gray-900 truncate">{e.title}</p>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{e.date}</p>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => { setEditingItem(e); setShowEventModal(true); }} className="p-2 text-gray-400 hover:text-indigo-600"><Edit2 className="w-4 h-4" /></button>
                        <button onClick={() => handleDeleteItem('events', e.id)} className="p-2 text-gray-400 hover:text-rose-600"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </div>
                  ))}
                </div>
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

      {/* Notice Modal */}
      <Modal 
        isOpen={showNoticeModal} 
        onClose={() => setShowNoticeModal(false)}
        title={editingItem ? "Edit Notice" : "Add New Notice"}
      >
        <form onSubmit={(e) => {
          e.preventDefault();
          const formData = new FormData(e.currentTarget);
          handleSaveItem('notices', {
            title: formData.get('title'),
            date: formData.get('date'),
            content: formData.get('content'),
            active: true
          });
        }} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Title</label>
            <input name="title" defaultValue={editingItem?.title} required className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500/20" />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Date</label>
            <input name="date" type="date" defaultValue={editingItem?.date || new Date().toISOString().split('T')[0]} required className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500/20" />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Content</label>
            <textarea name="content" defaultValue={editingItem?.content} rows={4} required className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 resize-none" />
          </div>
          <button type="submit" disabled={isSaving} className="w-full py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-all">
            {isSaving ? 'Saving...' : 'Save Notice'}
          </button>
        </form>
      </Modal>

      {/* Event Modal */}
      <Modal 
        isOpen={showEventModal} 
        onClose={() => setShowEventModal(false)}
        title={editingItem ? "Edit Event" : "Add New Event"}
      >
        <form onSubmit={(e) => {
          e.preventDefault();
          const formData = new FormData(e.currentTarget);
          handleSaveItem('events', {
            title: formData.get('title'),
            date: formData.get('date'),
            time: formData.get('time'),
            location: formData.get('location'),
            description: formData.get('description'),
            active: true
          });
        }} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Event Title</label>
            <input name="title" defaultValue={editingItem?.title} required className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500/20" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Date</label>
              <input name="date" type="date" defaultValue={editingItem?.date} required className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500/20" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Time</label>
              <input name="time" type="time" defaultValue={editingItem?.time} required className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500/20" />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Location</label>
            <input name="location" defaultValue={editingItem?.location} required className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500/20" />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Description</label>
            <textarea name="description" defaultValue={editingItem?.description} rows={3} required className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 resize-none" />
          </div>
          <button type="submit" disabled={isSaving} className="w-full py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-all">
            {isSaving ? 'Saving...' : 'Save Event'}
          </button>
        </form>
      </Modal>

      {/* Circular Modal */}
      <Modal 
        isOpen={showCircularModal} 
        onClose={() => setShowCircularModal(false)}
        title={editingItem ? "Edit Job Circular" : "Add New Circular"}
      >
        <form onSubmit={(e) => {
          e.preventDefault();
          const formData = new FormData(e.currentTarget);
          handleSaveItem('circulars', {
            title: formData.get('title'),
            deadline: formData.get('deadline'),
            salaryRange: formData.get('salaryRange'),
            description: formData.get('description'),
            requirements: (formData.get('requirements') as string).split('\n').filter(r => r.trim()),
            vacancies: formData.get('vacancies'),
            education: formData.get('education'),
            experience: formData.get('experience'),
            jobType: formData.get('jobType'),
            active: formData.get('active') === 'on'
          });
        }} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Job Title</label>
              <input name="title" defaultValue={editingItem?.title} required className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500/20" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Job Type</label>
              <select name="jobType" defaultValue={editingItem?.jobType || 'Full Time'} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500/20">
                <option>Full Time</option>
                <option>Part Time</option>
                <option>Contractual</option>
                <option>Remote</option>
              </select>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Deadline</label>
              <input name="deadline" type="date" defaultValue={editingItem?.deadline} required className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500/20" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Salary Range</label>
              <input name="salaryRange" defaultValue={editingItem?.salaryRange} placeholder="e.g. 15k - 20k" className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500/20" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Vacancies</label>
              <input name="vacancies" type="number" defaultValue={editingItem?.vacancies || 1} required className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500/20" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Min Education</label>
              <input name="education" defaultValue={editingItem?.education} placeholder="e.g. Honours/Masters" required className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500/20" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Experience</label>
              <input name="experience" defaultValue={editingItem?.experience} placeholder="e.g. 1-2 years or Fresher" required className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500/20" />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Job Description</label>
            <textarea name="description" defaultValue={editingItem?.description} rows={3} required className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 resize-none" />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Requirements (one per line)</label>
            <textarea name="requirements" defaultValue={editingItem?.requirements?.join('\n')} rows={4} required placeholder="Post Graduate&#10;2 Years Experience..." className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 resize-none" />
          </div>
          <div className="flex items-center gap-2 px-2 py-4">
            <input type="checkbox" name="active" defaultChecked={editingItem ? editingItem.active : true} className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500" />
            <label className="text-sm font-bold text-gray-700">Make this circular active</label>
          </div>
          <button type="submit" disabled={isSaving} className="w-full py-4 bg-indigo-600 text-white font-bold rounded-2xl hover:bg-indigo-700 disabled:opacity-50 transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-100">
            {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
            {editingItem ? 'Update Job Circular' : 'Post Job Circular'}
          </button>
        </form>
      </Modal>
      <Modal 
        isOpen={showSectionModal} 
        onClose={() => setShowSectionModal(false)}
        title={`Configure ${editingSection?.type.replace('_', ' ')} Section`}
      >
        <div className="space-y-6">
          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Section Title</label>
            <input 
              value={editingSection?.title || ''} 
              onChange={(e) => setEditingSection(prev => prev ? { ...prev, title: e.target.value } : null)}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500/20" 
            />
          </div>

          {editingSection?.type === 'custom_text' && (
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Section Content (HTML/Text)</label>
              <textarea 
                value={editingSection?.content || ''} 
                onChange={(e) => setEditingSection(prev => prev ? { ...prev, content: e.target.value } : null)}
                rows={10}
                placeholder="Enter text, tips, or HTML content here..."
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 resize-none font-mono" 
              />
            </div>
          )}

          {editingSection?.type === 'gallery' && (
            <div className="space-y-4">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1 block">Image Gallery</label>
              <div className="grid grid-cols-3 gap-4">
                {(editingSection.images || []).map((img, idx) => (
                  <div key={idx} className="relative aspect-square rounded-xl overflow-hidden group">
                    <img src={img} alt="" className="w-full h-full object-cover" />
                    <button 
                      onClick={() => {
                        const images = editingSection.images?.filter((_, i) => i !== idx);
                        setEditingSection({ ...editingSection, images });
                      }}
                      className="absolute top-1 right-1 p-1.5 bg-rose-600 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
                <label className="aspect-square rounded-xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center gap-2 hover:bg-gray-50 cursor-pointer transition-all">
                  <Plus className="w-6 h-6 text-gray-400" />
                  <span className="text-[10px] font-bold text-gray-400 uppercase">Add Photo</span>
                  <input 
                    type="file" 
                    className="hidden" 
                    accept="image/*"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const base64 = await compressImage(file);
                      const images = [...(editingSection.images || []), base64];
                      setEditingSection({ ...editingSection, images });
                    }} 
                  />
                </label>
              </div>
            </div>
          )}

          {editingSection?.type === 'results' && (
            <div className="space-y-4">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1 block">Quick Result Portal</label>
              <div className="p-4 bg-indigo-50 rounded-2xl border border-indigo-100 italic text-xs text-indigo-700">
                This section automatically lists your published exam results. No manual links needed.
              </div>
              <div className="space-y-2 max-h-[200px] overflow-y-auto">
                {exams.filter(e => e.status === 'published').length === 0 ? (
                  <p className="text-center py-4 text-gray-400 text-xs italic">No published exams found.</p>
                ) : (
                  exams.filter(e => e.status === 'published').map(e => (
                    <div key={e.id} className="flex items-center gap-3 p-3 bg-white rounded-xl border border-gray-100">
                      <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center text-emerald-600">
                        <CheckCircle className="w-4 h-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-gray-900 truncate">{e.title}</p>
                        <p className="text-[10px] text-gray-500">{e.batchName} • {e.date}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          <button 
            onClick={() => {
              if (!institution || !editingSection) return;
              const sections = institution.websiteConfig.sections.map(s => s.id === editingSection.id ? editingSection : s);
              setInstitution({ ...institution, websiteConfig: { ...institution.websiteConfig, sections } });
              setShowSectionModal(false);
            }} 
            className="w-full py-4 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
          >
            Update Section
          </button>
        </div>
      </Modal>

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
        className="w-[800px] p-12"
        style={{ fontFamily: '"Inter", sans-serif', minHeight: '1000px', backgroundColor: '#ffffff', color: '#111827' }}
      >
        <div className="flex items-center gap-8 border-b-4 pb-8" style={{ borderColor: '#4f46e5', marginBottom: '48px' }}>
          <div className="w-32 h-32 rounded-3xl flex items-center justify-center text-4xl font-black shrink-0 overflow-hidden" style={{ backgroundColor: '#eef2ff', color: '#4f46e5' }}>
            {institution.logoURL ? (
              <img src={institution.logoURL} alt="Logo" className="w-full h-full object-contain p-4" crossOrigin="anonymous" referrerPolicy="no-referrer" />
            ) : (
              institution.name.charAt(0)
            )}
          </div>
          <div className="space-y-2">
            <h1 className="text-4xl font-black tracking-tight" style={{ color: '#111827', margin: 0 }}>{institution.name}</h1>
            <p className="font-bold flex items-center gap-2" style={{ color: '#6b7280', margin: 0 }}>
              <MapPin className="w-4 h-4" style={{ stroke: '#6b7280' }} /> {institution.address || 'Address not provided'}
            </p>
            <p className="font-bold uppercase tracking-widest text-xs" style={{ color: '#4f46e5', margin: 0 }}>Established: {institution.established || 'N/A'}</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-6" style={{ marginBottom: '48px' }}>
          {[
            { label: 'Students', value: stats.students, color: '#2563eb' },
            { label: 'Teachers', value: stats.teachers, color: '#059669' },
            { label: 'Batches', value: stats.batches, color: '#d97706' },
          ].map((stat, idx) => (
            <div key={idx} className="p-6 rounded-2xl text-center border" style={{ backgroundColor: '#f9fafb', borderColor: '#f3f4f6' }}>
              <p className="text-[10px] font-black uppercase tracking-widest mb-1" style={{ color: '#9ca3af', margin: 0 }}>{stat.label}</p>
              <h3 className="text-2xl font-black" style={{ color: stat.color, margin: 0 }}>{stat.value}</h3>
            </div>
          ))}
        </div>

        <div className="space-y-8">
          <section className="space-y-4" style={{ marginBottom: '32px' }}>
            <h2 className="text-2xl font-black border-l-4 pl-4 uppercase tracking-tight" style={{ color: '#4f46e5', borderColor: '#4f46e5' }}>About Institution</h2>
            <p className="leading-relaxed text-lg whitespace-pre-wrap" style={{ color: '#4b5563' }}>
              {institution.description || 'No description provided.'}
            </p>
          </section>

          {(institution.vision || institution.goal || institution.target) && (
            <section className="space-y-6 p-8 rounded-3xl border" style={{ backgroundColor: '#f5f7ff', borderColor: '#eef2ff', marginBottom: '32px' }}>
              {institution.vision && (
                <div className="space-y-2" style={{ marginBottom: '24px' }}>
                  <h3 className="text-lg font-black" style={{ color: '#111827' }}>Vision & Mission</h3>
                  <p className="leading-relaxed whitespace-pre-wrap" style={{ color: '#4b5563' }}>{institution.vision}</p>
                </div>
              )}
              {institution.goal && (
                <div className="space-y-2" style={{ marginBottom: '24px' }}>
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
            <section className="space-y-6" style={{ marginBottom: '48px' }}>
              <h2 className="text-2xl font-black border-l-4 pl-4 uppercase tracking-tight" style={{ color: '#4f46e5', borderColor: '#4f46e5' }}>Message from Principal</h2>
              <div className="flex gap-8 items-start">
                {institution.principalPhotoURL && (
                  <div className="w-32 h-32 rounded-2xl overflow-hidden shrink-0 border-4" style={{ borderColor: '#ffffff', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
                    <img src={institution.principalPhotoURL} alt="Principal" className="w-full h-full object-cover" crossOrigin="anonymous" />
                  </div>
                )}
                <div className="space-y-2">
                  <p className="text-xl font-bold" style={{ color: '#111827', margin: 0 }}>{institution.principalName}</p>
                  <p className="font-bold text-xs uppercase tracking-widest" style={{ color: '#4f46e5', margin: 0 }}>{institution.principalTitle || 'Principal'}</p>
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
                    <Phone className="w-5 h-5" style={{ stroke: '#9ca3af' }} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: '#9ca3af', margin: 0 }}>Phone</p>
                    <p className="font-bold" style={{ color: '#111827', margin: 0 }}>{institution.phone || 'N/A'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#f9fafb', color: '#9ca3af' }}>
                    <Mail className="w-5 h-5" style={{ stroke: '#9ca3af' }} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: '#9ca3af', margin: 0 }}>Email</p>
                    <p className="font-bold" style={{ color: '#111827', margin: 0 }}>{institution.email || 'N/A'}</p>
                  </div>
                </div>
              </div>
              <div className="p-6 rounded-2xl border" style={{ backgroundColor: '#f9fafb', borderColor: '#f3f4f6' }}>
                <p className="text-[10px] font-black uppercase tracking-widest mb-1" style={{ color: '#818cf8', margin: 0 }}>Generated by</p>
                <p className="font-black text-xl tracking-tight" style={{ color: '#4f46e5', margin: 0 }}>Manage My Batch</p>
                <p className="text-xs" style={{ color: '#9ca3af', margin: 0 }}>Your education partner</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
