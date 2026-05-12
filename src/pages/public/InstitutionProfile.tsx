import React, { useState, useEffect, useRef } from 'react';
import { db, handleFirestoreError, OperationType } from '../../firebase';
import { doc, getDoc, collection, query, where, getDocs, limit, orderBy, getCountFromServer, onSnapshot } from 'firebase/firestore';
import { useParams, useNavigate } from 'react-router-dom';
import { Building, MapPin, Phone, Mail, Globe, Users, Briefcase, Layers, CheckCircle, Loader2, GraduationCap, Calendar, Download, Megaphone, Newspaper, ArrowRight, Clock, Info, FileText, TrendingUp, Star, HelpCircle, Facebook, Youtube, Linkedin, User, Key, ChevronRight, AlertCircle, X, BookOpen, MessageSquare, Search, Filter, Sparkles, Target, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';
import { toPng } from 'html-to-image';

export function InstitutionProfile() {
  const { id, slug } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [institution, setInstitution] = useState<any>(null);
  const [stats, setStats] = useState({ students: 0, teachers: 0, batches: 0 });
  const [notices, setNotices] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [circulars, setCirculars] = useState<any[]>([]);
  const [exams, setExams] = useState<any[]>([]);
  const [batches, setBatches] = useState<any[]>([]);
  const [selectedBatch, setSelectedBatch] = useState<any>(null);
  const [batchUpdates, setBatchUpdates] = useState<any[]>([]);
  const [isBatchPortalOpen, setIsBatchPortalOpen] = useState(false);
  const [batchPassword, setBatchPassword] = useState('');
  const [isBatchAuthorized, setIsBatchAuthorized] = useState(false);
  const [passwordError, setPasswordError] = useState(false);
  const [loadingUpdates, setLoadingUpdates] = useState(false);
  const [students, setStudents] = useState<any[]>([]);
  const [searchingStudents, setSearchingStudents] = useState(false);
  const [studentSearchTerm, setStudentSearchTerm] = useState('');
  const [studentFilterBatch, setStudentFilterBatch] = useState('');
  const [studentFilterGrade, setStudentFilterGrade] = useState('');
  const [studentZoneTab, setStudentZoneTab] = useState<'batches' | 'directory'>('batches');
  const bioRef = useRef<HTMLDivElement>(null);
  const primaryColor = institution?.websiteConfig?.themeColor || '#4f46e5';
  const primaryColorLight = primaryColor + '15';

  useEffect(() => {
    async function fetchData() {
      if (!id && !slug) return;
      
      try {
        let instData: any = null;
        let instId = id;

        if (slug) {
          const q = query(collection(db, 'institutions'), where('slug', '==', slug), limit(1));
          const snap = await getDocs(q);
          if (!snap.empty) {
            instData = { id: snap.docs[0].id, ...snap.docs[0].data() };
            instId = instData.id;
          }
        } else if (id) {
          const instDoc = await getDoc(doc(db, 'institutions', id));
          if (instDoc.exists()) {
            instData = { id: instDoc.id, ...instDoc.data() };
          }
        }

        if (!instData) {
          setLoading(false);
          return;
        }
        
        setInstitution(instData);

        // SEO Update
        if (instData.websiteConfig) {
          document.title = instData.websiteConfig.metaTitle || `${instData.name} | Official Website`;
          const metaDesc = document.querySelector('meta[name="description"]');
          if (metaDesc) {
            metaDesc.setAttribute('content', instData.websiteConfig.metaDescription || '');
          } else {
            const meta = document.createElement('meta');
            meta.name = "description";
            meta.content = instData.websiteConfig.metaDescription || '';
            document.head.appendChild(meta);
          }
        }
        
        // Fetch stats & Content
        const results = await Promise.allSettled([
          getCountFromServer(query(collection(db, 'students'), where('institutionId', '==', instId))),
          getCountFromServer(query(collection(db, 'teachers'), where('institutionId', '==', instId))),
          getCountFromServer(query(collection(db, 'batches'), where('institutionId', '==', instId))),
          getDocs(query(collection(db, 'notices'), where('institutionId', '==', instId), where('active', '==', true), orderBy('createdAt', 'desc'), limit(5))),
          getDocs(query(collection(db, 'events'), where('institutionId', '==', instId), where('active', '==', true), limit(5))),
          getDocs(query(collection(db, 'circulars'), where('institutionId', '==', instId), where('published', '!=', false), limit(5))),
          getDocs(query(collection(db, 'offline_exams'), where('institutionId', '==', instId), where('isPublished', '==', true), orderBy('date', 'desc'), limit(10))),
          getDocs(query(collection(db, 'students'), where('institutionId', '==', instId), limit(20)))
        ]);

        const [studentsCount, teachersCount, batchesCount, noticesSnap, eventsSnap, circularsSnap, examsSnap, initialStudentsSnap] = results.map(r => r.status === 'fulfilled' ? r.value : null);

        setStats({
          students: (studentsCount as any)?.data()?.count || 0,
          teachers: (teachersCount as any)?.data()?.count || 0,
          batches: (batchesCount as any)?.data()?.count || 0
        });

        if (noticesSnap && 'docs' in (noticesSnap as any)) {
          setNotices((noticesSnap as any).docs.map((d: any) => ({ id: d.id, ...d.data() })));
        }

        if (initialStudentsSnap && 'docs' in (initialStudentsSnap as any)) {
          setStudents((initialStudentsSnap as any).docs.map((d: any) => ({ id: d.id, ...d.data() })));
        }

        if (eventsSnap && 'docs' in (eventsSnap as any)) {
          const fetchedEvents = (eventsSnap as any).docs
            .map((d: any) => ({ id: d.id, ...d.data() }))
            .sort((a: any, b: any) => new Date(a.date || 0).getTime() - new Date(b.date || 0).getTime())
            .slice(0, 5);
          setEvents(fetchedEvents);
        }

        if (circularsSnap && 'docs' in (circularsSnap as any)) {
          const fetchedCirculars = (circularsSnap as any).docs
            .map((d: any) => ({ id: d.id, ...d.data() }))
            .filter((c: any) => c.active !== false)
            .sort((a: any, b: any) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
          setCirculars(fetchedCirculars);
        }

        if (examsSnap && 'docs' in (examsSnap as any)) {
          setExams((examsSnap as any).docs.map((d: any) => ({ id: d.id, ...d.data() })));
        }

        // Fetch Batches for Portal (Real-time)
        const unsubBatches = onSnapshot(
          query(collection(db, 'batches'), where('institutionId', '==', instId)),
          (snap) => {
            const fetchedBatches = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            setBatches(fetchedBatches);
            
            // Re-sync stats for batches
            setStats(prev => ({ ...prev, batches: snap.size }));
            
            // If the portal is open and the selected batch was updated, update it
            if (selectedBatch) {
              const updatedBatch = fetchedBatches.find(b => b.id === selectedBatch.id);
              if (updatedBatch) {
                setSelectedBatch(updatedBatch);
              }
            }
          },
          (err) => {
            console.error("Batches sync error:", err);
          }
        );

        return () => unsubBatches();
      } catch (err) {
        handleFirestoreError(err, OperationType.GET, 'institutions');
      } finally {
        setLoading(false);
      }
    }
    const cleanup = fetchData();
    return () => {
      cleanup.then(unsub => unsub && (unsub as any)());
    };
  }, [id, slug]);

  const scrollToSection = (e: React.MouseEvent, sectionIdOrType: string) => {
    e.preventDefault();
    let el = document.getElementById(sectionIdOrType);
    
    // Fallback if ID doesn't match (e.g. if it was passed 'sec_batch_portal' but ID is actually something else)
    if (!el && sectionIdOrType === 'sec_batch_portal') {
      const portalSection = document.querySelector('[data-section-type="batch_portal"]');
      if (portalSection) el = portalSection as HTMLElement;
    }

    if (el) {
      const navHeight = 80; // Approximate height of sticky nav
      const elementPosition = el.getBoundingClientRect().top + window.scrollY;
      const offsetPosition = elementPosition - navHeight;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
    }
  };

  const fetchStudents = async () => {
    if (!institution) return;
    setSearchingStudents(true);
    try {
      let q = query(collection(db, 'students'), where('institutionId', '==', institution.id));
      
      if (studentFilterBatch) {
        q = query(q, where('batchId', '==', studentFilterBatch));
      }
      
      if (studentFilterGrade) {
        q = query(q, where('grade', '==', studentFilterGrade));
      }

      // Note: Client-side search for name/rollNumber if needed, or structured queries
      const snap = await getDocs(q);
      let fetchedStudents = snap.docs.map(d => ({ id: d.id, ...d.data() }));

      if (studentSearchTerm) {
        const lowerTerm = studentSearchTerm.toLowerCase();
        fetchedStudents = fetchedStudents.filter((s: any) => 
          s.name?.toLowerCase().includes(lowerTerm) || 
          s.rollNumber?.toString().includes(lowerTerm)
        );
      }

      setStudents(fetchedStudents);
    } catch (err) {
      console.error(err);
    } finally {
      setSearchingStudents(false);
    }
  };

  useEffect(() => {
    if (studentZoneTab === 'directory') {
      fetchStudents();
    }
  }, [studentSearchTerm, studentFilterBatch, studentFilterGrade, studentZoneTab]);

  const downloadBio = async () => {
    if (!institution || !bioRef.current || downloading) return;
    
    setDownloading(true);
    try {
      const { jsPDF } = await import('jspdf');
      
      // Wait a bit for images and styles to settle
      await new Promise(r => setTimeout(r, 500));

      const dataUrl = await toPng(bioRef.current, {
        pixelRatio: 2,
        cacheBust: true,
        backgroundColor: '#ffffff'
      });
      
      const pdf = new jsPDF('p', 'mm', 'a4');
      
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      
      const margin = 10;
      const imgWidth = pageWidth - (margin * 2);
      const imgProps = pdf.getImageProperties(dataUrl);
      const imgHeight = (imgProps.height * imgWidth) / imgProps.width;
      
      let heightLeft = imgHeight;
      let position = margin;

      pdf.addImage(dataUrl, 'PNG', margin, position, imgWidth, imgHeight);
      heightLeft -= (pageHeight - margin * 2);

      while (heightLeft >= 0) {
        pdf.addPage();
        position = heightLeft - imgHeight + margin;
        pdf.addImage(dataUrl, 'PNG', margin, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      const safeName = institution.name ? institution.name.substring(0, 30).split(' ').join('_') : 'Institution';
      pdf.save(`${safeName}_Bio.pdf`);
    } catch (error: any) {
      console.error('Error generating PDF:', error);
      alert(`Failed to generate PDF: ${error.message || 'Check connection'}`);
    } finally {
      setDownloading(false);
    }
  };

  const handleSelectBatch = async (batch: any) => {
    setSelectedBatch(batch);
    setBatchPassword('');
    setIsBatchAuthorized(false);
    setPasswordError(false);
    
    // Check if already authorized in session
    if (sessionStorage.getItem(`batch_auth_${batch.id}`) === 'true' || !batch.websitePassword) {
      setIsBatchAuthorized(true);
      fetchBatchUpdates(batch.id);
    }
    
    setIsBatchPortalOpen(true);
  };

  const fetchBatchUpdates = (batchId: string) => {
    setLoadingUpdates(true);
    const q = query(
      collection(db, 'batch_content'),
      where('batchId', '==', batchId),
      orderBy('createdAt', 'desc')
    );

    return getDocs(q).then((snap) => {
      setBatchUpdates(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoadingUpdates(false);
    }).catch(err => {
      console.error(err);
      setLoadingUpdates(false);
    });
  };

  const handleBatchLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedBatch?.websitePassword && batchPassword.trim() === selectedBatch.websitePassword.trim()) {
      setIsBatchAuthorized(true);
      setPasswordError(false);
      sessionStorage.setItem(`batch_auth_${selectedBatch.id}`, 'true');
      fetchBatchUpdates(selectedBatch.id);
    } else {
      setPasswordError(true);
      setTimeout(() => setPasswordError(false), 2000);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-12 h-12 text-indigo-600 animate-spin" />
      </div>
    );
  }

  if (!institution) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center space-y-4">
          <Building className="w-16 h-16 text-gray-300 mx-auto" />
          <h1 className="text-2xl font-bold text-gray-900">Institution Not Found</h1>
          <p className="text-gray-500">The institution you are looking for does not exist or has been removed.</p>
        </div>
      </div>
    );
  }

  const renderSection = (section: any) => {
    if (!section.active) return null;

    switch (section.type) {
      case 'hero':
        return (
          <div key={section.id} className="relative overflow-hidden rounded-[3rem] bg-indigo-600 text-white shadow-2xl">
            {/* Animated Background Elements */}
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-white/10 rounded-full blur-[100px] -mr-64 -mt-64 animate-pulse pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-indigo-400/20 rounded-full blur-[100px] -ml-64 -mb-64 pointer-events-none" />
            
            {/* Top Bar (Optional) */}
            {institution.websiteConfig?.topBar && (
              <div className="relative z-30 bg-black/10 backdrop-blur-md px-8 py-3 flex flex-wrap items-center justify-between gap-4 border-b border-white/5 text-[10px] font-black uppercase tracking-[0.2em] text-white/80">
                <div className="flex items-center gap-8">
                  {institution.websiteConfig.topBar.phone && (
                    <a href={`tel:${institution.websiteConfig.topBar.phone}`} className="flex items-center gap-2 hover:text-white transition-colors">
                      <Phone className="w-3.5 h-3.5 text-indigo-300" /> {institution.websiteConfig.topBar.phone}
                    </a>
                  )}
                  {institution.websiteConfig.topBar.email && (
                    <a href={`mailto:${institution.websiteConfig.topBar.email}`} className="flex items-center gap-2 hover:text-white transition-colors">
                      <Mail className="w-3.5 h-3.5 text-indigo-300" /> {institution.websiteConfig.topBar.email}
                    </a>
                  )}
                </div>
                {institution.websiteConfig.socialLinks && (
                  <div className="flex items-center gap-6">
                    {institution.websiteConfig.socialLinks.facebook && <a href={institution.websiteConfig.socialLinks.facebook} target="_blank" rel="noreferrer" className="hover:text-white">Facebook</a>}
                    {institution.websiteConfig.socialLinks.whatsapp && <a href={`https://wa.me/${institution.websiteConfig.socialLinks.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noreferrer" className="hover:text-white">WhatsApp</a>}
                  </div>
                )}
              </div>
            )}

            <div className="relative z-10 px-8 py-16 md:px-16 md:py-24 flex flex-col lg:flex-row items-center gap-16">
              <div className="flex-1 space-y-10 text-center lg:text-left">
                <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3">
                   <span className="px-5 py-2 bg-white/10 backdrop-blur-xl border border-white/10 rounded-full text-[10px] font-black uppercase tracking-[0.3em] text-white">
                      Education • Excellence • Growth
                   </span>
                   <span className="px-5 py-2 bg-emerald-500/20 backdrop-blur-xl border border-emerald-500/20 rounded-full text-[10px] font-black uppercase tracking-[0.3em] text-emerald-300 flex items-center gap-2">
                      <CheckCircle className="w-3.5 h-3.5" /> Verified Center
                   </span>
                </div>

                <div className="space-y-6">
                  <motion.h1 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-5xl md:text-8xl font-black tracking-tighter leading-[0.9] text-white"
                  >
                    {institution.name}
                  </motion.h1>
                  <p className="text-xl md:text-2xl text-indigo-100/80 font-medium max-w-2xl mx-auto lg:mx-0 leading-relaxed">
                    {section.subtitle || "Nurturing talent through innovative teaching and a structured curriculum designed for success."}
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
                   {institution.admissionForm?.active && (
                     <button 
                       onClick={() => navigate(`/public/admission/${institution.id}`)}
                       className="w-full sm:w-auto px-10 py-5 bg-white text-indigo-600 rounded-[2rem] font-black text-xl hover:scale-105 transition-transform shadow-2xl flex items-center justify-center gap-3 active:scale-95"
                     >
                       Enroll Now <ArrowRight className="w-6 h-6" />
                     </button>
                   )}
                   <button 
                     onClick={(e) => scrollToSection(e, 'sec_batch_portal')}
                     className="w-full sm:w-auto px-10 py-5 bg-indigo-500/30 text-white rounded-[2rem] font-black text-xl hover:bg-white/10 transition-all border border-white/10 flex items-center justify-center gap-3 active:scale-95"
                   >
                     Student Zone
                   </button>
                </div>

                <div className="flex flex-wrap items-center justify-center lg:justify-start gap-8 pt-4">
                  <div className="space-y-1">
                    <p className="text-3xl font-black text-white leading-none">{stats.students}+</p>
                    <p className="text-[10px] font-black text-indigo-300 uppercase tracking-widest">Active Students</p>
                  </div>
                  <div className="w-px h-10 bg-white/10 hidden sm:block" />
                  <div className="space-y-1">
                    <p className="text-3xl font-black text-white leading-none">{stats.batches}</p>
                    <p className="text-[10px] font-black text-indigo-300 uppercase tracking-widest">Ongoing Batches</p>
                  </div>
                  <div className="w-px h-10 bg-white/10 hidden sm:block" />
                  <div className="space-y-1">
                    <p className="text-3xl font-black text-white leading-none">{stats.teachers || 12}+</p>
                    <p className="text-[10px] font-black text-indigo-300 uppercase tracking-widest">Expert Teachers</p>
                  </div>
                </div>
              </div>

              <div className="relative shrink-0 hidden lg:block group">
                 <div className="w-80 h-80 md:w-[400px] md:h-[400px] rounded-[5rem] overflow-hidden rotate-3 group-hover:rotate-0 transition-all duration-700 ring-[24px] ring-white/5 shadow-2xl bg-white/20 backdrop-blur-3xl">
                    {institution.logoURL ? (
                      <img src={institution.logoURL} alt="Logo" className="w-full h-full object-contain p-12 drop-shadow-2xl" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[15rem] font-black text-white/10 uppercase">
                        {institution.name.charAt(0)}
                      </div>
                    )}
                 </div>
                 {/* Floating Badges */}
                 <motion.div 
                   animate={{ y: [0, -10, 0] }}
                   transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                   className="absolute -top-6 -right-6 bg-white p-5 rounded-3xl shadow-2xl border border-gray-100 flex items-center gap-4"
                 >
                    <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600">
                       <CheckCircle className="w-7 h-7" />
                    </div>
                    <div>
                       <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Status</p>
                       <p className="text-gray-900 font-black text-sm">Verified Center</p>
                    </div>
                 </motion.div>

                 <motion.div 
                   animate={{ y: [0, 10, 0] }}
                   transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                   className="absolute -bottom-6 -left-6 bg-gray-900 p-5 rounded-3xl shadow-2xl border border-white/5 flex items-center gap-4"
                 >
                    <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white">
                       <TrendingUp className="w-7 h-7" />
                    </div>
                    <div>
                       <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Growth</p>
                       <p className="text-white font-black text-sm">Top Rated 2026</p>
                    </div>
                 </motion.div>
              </div>
            </div>
          </div>
        );

      case 'stats':
        return (
          <div key={section.id} className="max-w-6xl mx-auto px-6 -mt-16 mb-16 relative z-30">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
              {[
                { label: 'Students', value: stats.students + (institution.established ? 50 : 20), icon: Users, color: 'text-indigo-600', bg: 'bg-indigo-50' },
                { label: 'Teachers', value: Math.max(12, stats.teachers || 0), icon: Briefcase, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                { label: 'Batches', value: stats.batches, icon: Layers, color: 'text-amber-600', bg: 'bg-amber-50' },
                { label: 'Success Rate', value: '98%', icon: Sparkles, color: 'text-purple-600', bg: 'bg-purple-50' },
              ].map((stat, idx) => (
                <motion.div 
                  key={idx}
                  initial={{ opacity: 0, scale: 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: idx * 0.1 }}
                  className="bg-white/70 backdrop-blur-xl p-6 md:p-8 rounded-[2.5rem] shadow-xl shadow-gray-200/40 border border-white flex flex-col items-center text-center gap-4 transition-transform hover:-translate-y-2"
                >
                  <div className={cn("w-16 h-16 rounded-2xl flex items-center justify-center shadow-inner", stat.bg, stat.color)}>
                    <stat.icon className="w-8 h-8" />
                  </div>
                  <div>
                    <h3 className="text-4xl font-black text-gray-900 tracking-tighter">{stat.value}</h3>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mt-1">{stat.label}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        );

      case 'about':
        return (
          <section key={section.id} className="relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50 rounded-full blur-[100px] -mr-32 -mt-32 opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
               <div className="space-y-8">
                  <div className="space-y-4">
                    <span className="px-4 py-1.5 bg-indigo-50 text-indigo-600 rounded-full text-[10px] font-black uppercase tracking-widest border border-indigo-100">Our Story</span>
                    <h2 className="text-4xl md:text-5xl font-black text-gray-900 tracking-tight leading-tight">
                      {section.title || 'Why Choose Our Institution?'}
                    </h2>
                  </div>
                  <p className="text-xl text-gray-500 leading-relaxed font-medium">
                    {institution.description || 'Dedicated to providing a world-class education that empowers students to reach their full potential through innovation, discipline, and expert guidance.'}
                  </p>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="flex gap-4">
                       <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shrink-0 shadow-lg shadow-indigo-100">
                          <Target className="w-5 h-5" />
                       </div>
                       <div>
                          <h4 className="font-black text-gray-900">Our Mission</h4>
                          <p className="text-xs text-gray-500 font-medium leading-relaxed">{institution.vision?.slice(0, 100) || 'To redefine learning with technology.'}</p>
                       </div>
                    </div>
                    <div className="flex gap-4">
                       <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center text-white shrink-0 shadow-lg shadow-emerald-100">
                          <Zap className="w-5 h-5" />
                       </div>
                       <div>
                          <h4 className="font-black text-gray-900">Our Goal</h4>
                          <p className="text-xs text-gray-500 font-medium leading-relaxed">{institution.goal?.slice(0, 100) || 'Success for every student.'}</p>
                       </div>
                    </div>
                  </div>
               </div>

               <div className="relative">
                  <div className="aspect-[4/3] rounded-[3rem] bg-indigo-50 border-8 border-white shadow-2xl relative overflow-hidden group/img">
                     <img 
                       src="https://images.unsplash.com/photo-1523050335392-9bef867a493b?auto=format&fit=crop&q=80&w=800" 
                       alt="About" 
                       className="w-full h-full object-cover grayscale opacity-50 group-hover/img:grayscale-0 group-hover/img:opacity-100 transition-all duration-700" 
                     />
                     <div className="absolute inset-0 bg-gradient-to-t from-indigo-900/60 to-transparent" />
                     <div className="absolute bottom-8 left-8 right-8">
                        <div className="bg-white/20 backdrop-blur-md p-6 rounded-3xl border border-white/20">
                           <p className="text-white font-black text-lg">"Education is the most powerful weapon which you can use to change the world."</p>
                        </div>
                     </div>
                  </div>
                  {/* Decorative Elements */}
                  <div className="absolute -top-6 -right-6 w-24 h-24 bg-amber-400 rounded-full blur-xl opacity-20" />
                  <div className="absolute -bottom-6 -left-6 w-32 h-32 bg-indigo-600 rounded-full blur-2xl opacity-10" />
               </div>
            </div>
          </section>
        );

      case 'principal':
        return (institution.principalName || institution.principalPhotoURL) && (
          <section key={section.id} className="bg-gray-900 rounded-[3rem] overflow-hidden shadow-2xl relative">
            <div className="absolute top-0 right-0 w-64 h-64 bg-brand/10 rounded-full -mr-32 -mt-32 blur-3xl" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-500/10 rounded-full -ml-32 -mb-32 blur-3xl" />
            
            <div className="relative p-8 md:p-12 flex flex-col md:flex-row items-center gap-12">
               <div className="shrink-0 w-48 h-48 md:w-64 md:h-64 rounded-[3rem] overflow-hidden ring-8 ring-white/5 shadow-2xl bg-gray-800">
                  {institution.principalPhotoURL ? (
                    <img src={institution.principalPhotoURL} alt="Principal" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                       <User className="w-24 h-24 text-gray-700" />
                    </div>
                  )}
               </div>
               <div className="flex-1 space-y-6 text-center md:text-left">
                  <div className="space-y-1">
                    <h2 className="text-3xl font-black text-white">{section.title || "Principal's Message"}</h2>
                    <p className="text-brand font-black uppercase tracking-[0.2em] text-xs">Excellence in Leadership</p>
                  </div>
                  
                  <blockquote className="text-gray-400 text-lg md:text-xl font-medium leading-relaxed italic border-l-4 border-brand-light/20 pl-6 py-2">
                    "{institution.principalMessage || institution.vision || "We believe in nurturing young minds for a brighter future. Our goal is to provide quality education and foster a culture of excellence in everything we do."}"
                  </blockquote>

                  <div className="pt-4">
                     <h4 className="text-xl font-black text-white leading-none">{institution.principalName || "Principal Name"}</h4>
                     <p className="text-gray-500 font-bold mt-1">{institution.principalTitle || "Head of Institution"}</p>
                  </div>
               </div>
            </div>
          </section>
        );

      case 'gallery':
        return (section.images || []).length > 0 && (
          <section key={section.id} className="space-y-12">
            <div className="text-center space-y-4">
               <span className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.3em]">Portfolio</span>
               <h2 className="text-4xl md:text-5xl font-black text-gray-900 tracking-tight">Life at {institution.name}</h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {(section.images || []).map((img: string, idx: number) => (
                <motion.div 
                  key={idx}
                  initial={{ opacity: 0, scale: 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: idx * 0.1 }}
                  className={cn(
                    "relative group rounded-[2.5rem] overflow-hidden shadow-xl shadow-gray-200 transition-all hover:shadow-2xl active:scale-95",
                    idx === 0 || idx === 3 ? "md:aspect-[3/4]" : "md:aspect-square"
                  )}
                >
                  <img 
                    src={img} 
                    alt={`Gallery ${idx}`} 
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-indigo-600/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                </motion.div>
              ))}
            </div>
          </section>
        );

      case 'news':
        return notices.length > 0 && (
          <section key={section.id} className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm space-y-6">
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Megaphone className="w-6 h-6 text-amber-500" /> {section.title || 'Latest Notices'}
            </h2>
            <div className="space-y-4">
              {notices.map(notice => (
                <div key={notice.id} className="p-5 bg-gray-50 rounded-2xl border border-gray-100 space-y-2 hover:bg-white hover:shadow-md transition-all cursor-default group">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-gray-900 group-hover:text-amber-600 transition-colors">{notice.title}</h4>
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{notice.date}</span>
                  </div>
                  <p className="text-sm text-gray-500 leading-relaxed line-clamp-3">{notice.content}</p>
                </div>
              ))}
            </div>
          </section>
        );

      case 'results':
        const displayExams = (section.images || []).length > 0 
          ? exams.filter(e => section.images?.includes(e.id))
          : exams;

        return displayExams.length > 0 && (
          <section key={section.id} className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm space-y-6">
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <CheckCircle className="w-6 h-6 text-emerald-500" /> {section.title || 'Exam Results'}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {displayExams.map(exam => (
                <button 
                  key={exam.id}
                  onClick={() => navigate(`/public/exam-result/${exam.id}`)}
                  className="p-5 bg-brand text-white rounded-[24px] text-left hover:shadow-xl hover:-translate-y-1 transition-all space-y-4 group opacity-90 hover:opacity-100"
                >
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                      <FileText className="w-5 h-5 text-white" />
                    </div>
                    <ArrowRight className="w-5 h-5 opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all text-white/50" />
                  </div>
                  <div>
                    <h4 className="font-bold text-lg leading-tight line-clamp-2">{exam.title}</h4>
                    <p className="text-xs text-white/80 font-medium tracking-wide mt-2">{exam.batchName} • {exam.date}</p>
                  </div>
                </button>
              ))}
            </div>
          </section>
        );

      case 'circulars':
        return circulars.length > 0 && (
          <section key={section.id} className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm space-y-6">
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Briefcase className="w-6 h-6 text-emerald-500" /> {section.title || 'Career Opportunities'}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {circulars.map(circular => (
                <div key={circular.id} className="p-6 bg-emerald-50 rounded-3xl border border-emerald-100 space-y-4 hover:shadow-lg transition-all group">
                  <div>
                    <h4 className="font-bold text-gray-900 text-lg">{circular.title}</h4>
                    <div className="flex items-center gap-2 text-[10px] font-black text-emerald-600 uppercase tracking-widest mt-1">
                      <Clock className="w-3 h-3" /> Deadline: {circular.deadline}
                    </div>
                  </div>
                  <button 
                    onClick={() => navigate(`/public/circular/${circular.id}`)}
                    className="w-full py-3 bg-white text-emerald-600 font-bold text-sm rounded-xl hover:bg-emerald-600 hover:text-white transition-all border border-emerald-200 flex items-center justify-center gap-2"
                  >
                    View Details <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </section>
        );

      case 'custom_text':
        return section.content && (
          <section key={section.id} className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm space-y-4">
            {section.title && <h2 className="text-2xl font-bold text-gray-900">{section.title}</h2>}
            <div 
              className="text-gray-600 leading-relaxed whitespace-pre-wrap prose prose-indigo max-w-none"
              dangerouslySetInnerHTML={{ __html: section.content }}
            />
          </section>
        );

      case 'events':
        return events.length > 0 && (
          <section key={section.id} className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm space-y-6">
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Calendar className="w-6 h-6 text-brand" /> {section.title || 'Timeline & Events'}
            </h2>
            <div className="space-y-6">
              {events.map(event => (
                <div key={event.id} className="flex gap-4 group">
                  <div className="w-16 h-16 bg-gray-50 rounded-2xl flex flex-col items-center justify-center shrink-0 border border-gray-100 group-hover:bg-brand group-hover:text-white transition-colors">
                    <span className="text-[10px] font-black uppercase tracking-widest leading-none mb-1">
                      {new Date(event.date).toLocaleDateString('en-US', { month: 'short' })}
                    </span>
                    <span className="text-2xl font-black leading-none">
                      {new Date(event.date).getDate()}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1 pt-1">
                    <h5 className="font-bold text-gray-900 text-lg group-hover:text-brand transition-colors">{event.title}</h5>
                    <div className="flex flex-wrap items-center gap-4 mt-2">
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {event.time || 'All Day'}
                      </p>
                      <p className="text-[10px] font-black text-brand uppercase tracking-widest flex items-center gap-1">
                        <MapPin className="w-3 h-3" /> {event.location || 'Institution Premises'}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        );

      case 'testimonials':
        return (section.testimonials || []).length > 0 && (
          <section key={section.id} className="bg-indigo-50/50 p-8 rounded-3xl border border-indigo-100 space-y-8">
            <div className="text-center space-y-2">
              <h2 className="text-3xl font-black text-indigo-900">{section.title || 'Success Stories'}</h2>
              <p className="text-indigo-600 font-medium">What our students and parents say about us</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {(section.testimonials || []).map((t: any, idx: number) => (
                <div key={idx} className="bg-white p-6 rounded-2xl border border-indigo-100 shadow-sm space-y-4">
                  <div className="flex text-amber-400">
                    {[...Array(5)].map((_, i) => <Star key={i} className="w-4 h-4 fill-current" />)}
                  </div>
                  <p className="text-gray-600 italic text-sm leading-relaxed">"{t.content}"</p>
                  <div className="flex items-center gap-3 pt-2">
                    <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 font-bold uppercase">
                      {t.author.charAt(0)}
                    </div>
                    <div>
                      <p className="font-bold text-gray-900 text-sm">{t.author}</p>
                      <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">{t.role || 'Student'}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        );

      case 'faq':
        return (section.faqs || []).length > 0 && (
          <section key={section.id} id={section.id} className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm space-y-6">
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <HelpCircle className="w-6 h-6 text-indigo-600" /> {section.title || 'Frequently Asked Questions'}
            </h2>
            <div className="space-y-4">
              {(section.faqs || []).map((faq: any, idx: number) => (
                <div key={idx} className="p-4 bg-gray-50 rounded-2xl border border-gray-100 space-y-2">
                  <h4 className="font-bold text-gray-900">{faq.question}</h4>
                  <p className="text-sm text-gray-600 leading-relaxed">{faq.answer}</p>
                </div>
              ))}
            </div>
          </section>
        );

      case 'batch_portal':
        return (
          <section 
            key={section.id} 
            id={section.id} 
            data-section-type="batch_portal"
            className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm space-y-8"
          >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <h2 className="text-2xl font-black text-gray-900 flex items-center gap-2">
                  <Globe className="w-6 h-6 text-brand" /> {section.title || 'Student Zone'}
                </h2>
                <p className="text-sm text-gray-500 font-medium">Daily homework, progress and study materials</p>
              </div>
              
              <div className="flex items-center p-1 bg-gray-100 rounded-xl">
                <button 
                  onClick={() => { setStudentZoneTab('batches'); setIsBatchPortalOpen(false); }}
                  className={cn(
                    "px-4 py-2 text-xs font-black uppercase tracking-wider rounded-lg transition-all",
                    studentZoneTab === 'batches' ? "bg-white text-brand shadow-sm" : "text-gray-500 hover:text-gray-700"
                  )}
                >
                  Batches
                </button>
                <button 
                  onClick={() => setStudentZoneTab('directory')}
                  className={cn(
                    "px-4 py-2 text-xs font-black uppercase tracking-wider rounded-lg transition-all",
                    studentZoneTab === 'directory' ? "bg-white text-brand shadow-sm" : "text-gray-500 hover:text-gray-700"
                  )}
                >
                  Directory
                </button>
              </div>
            </div>

            {studentZoneTab === 'batches' ? (
              <>
                <div className="flex items-center gap-2 text-brand font-black text-[10px] uppercase tracking-widest bg-brand/5 px-4 py-2 rounded-full w-fit">
                  <Users className="w-3 h-3" /> {batches.length} Active Batches
                </div>

                {batches.length === 0 ? (
                  <div className="text-center py-12 bg-gray-50 rounded-3xl border border-dashed border-gray-200">
                    <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <h3 className="font-bold text-gray-900">No Batches Found</h3>
                    <p className="text-sm text-gray-500">Wait for the institution to add batches.</p>
                  </div>
                ) : !isBatchPortalOpen ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {batches.map((batch) => (
                      <button
                        key={batch.id}
                        onClick={() => handleSelectBatch(batch)}
                        className="p-6 bg-gray-50 rounded-[28px] text-left border border-gray-100 hover:border-brand hover:bg-white hover:shadow-xl transition-all group"
                      >
                        <div className="flex items-center justify-between mb-4">
                          <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-brand shadow-sm group-hover:bg-brand group-hover:text-white transition-all">
                            <Layers className="w-6 h-6" />
                          </div>
                          <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-brand group-hover:translate-x-1 transition-all" />
                        </div>
                        <div className="space-y-1">
                          <h4 className="font-black text-gray-900 line-clamp-1">{batch.name}</h4>
                          <p className="text-xs text-gray-400 font-bold uppercase tracking-widest leading-none">{batch.grade}</p>
                        </div>
                        <div className="mt-4 flex items-center gap-2">
                          <span className="text-[10px] font-black text-brand bg-brand/5 px-2 py-0.5 rounded-lg border border-brand/10">Access Portal</span>
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="bg-gray-50/50 rounded-[2.5rem] border border-gray-100 space-y-6 overflow-hidden">
                    <div className="bg-white px-8 py-4 border-b border-gray-100 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <button onClick={() => setIsBatchPortalOpen(false)} className="p-2 hover:bg-gray-100 rounded-lg text-gray-500">
                          <ArrowRight className="w-4 h-4 rotate-180" />
                        </button>
                        <div>
                          <h4 className="font-black text-gray-900 leading-none">{selectedBatch?.name}</h4>
                          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">Batch Content</p>
                        </div>
                      </div>
                      <button onClick={() => setIsBatchPortalOpen(false)} className="p-2 hover:bg-rose-50 rounded-lg text-gray-400 hover:text-rose-500">
                        <X className="w-5 h-5" />
                      </button>
                    </div>

                    <div className="p-8 pt-2">
                      {!isBatchAuthorized ? (
                        <div className="max-w-md mx-auto py-10 text-center space-y-6">
                          <div className="w-20 h-20 bg-indigo-50 rounded-3xl flex items-center justify-center mx-auto text-brand">
                            <Key className="w-10 h-10" />
                          </div>
                          <div>
                            <h5 className="text-xl font-black text-gray-900">Protected Content</h5>
                            <p className="text-gray-500 text-sm mt-1">Enter the batch password to view updates.</p>
                          </div>
                          <form onSubmit={handleBatchLogin} className="space-y-4">
                            <input 
                              type="password"
                              value={batchPassword}
                              onChange={(e) => setBatchPassword(e.target.value)}
                              placeholder="Batch Password"
                              className={cn(
                                "w-full px-4 py-4 bg-white border border-gray-200 rounded-2xl text-lg font-bold tracking-widest text-center focus:ring-4 focus:ring-brand/10 outline-none transition-all",
                                passwordError && "border-rose-500 animate-shake"
                              )}
                              autoFocus
                            />
                            <button 
                              type="submit"
                              className="w-full py-4 bg-brand text-white rounded-2xl font-black text-lg hover:bg-brand/90 shadow-xl shadow-brand/20"
                            >
                              Unlock Portal
                            </button>
                          </form>
                        </div>
                      ) : (
                        <div className="space-y-6">
                          {loadingUpdates ? (
                            <div className="flex justify-center py-20">
                              <Loader2 className="w-10 h-10 text-brand animate-spin" />
                            </div>
                          ) : batchUpdates.length > 0 ? (
                            batchUpdates.map((update, idx) => (
                              <motion.div
                                key={update.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.05 }}
                                className="bg-white p-6 rounded-[2rem] border border-gray-50 shadow-sm relative overflow-hidden flex flex-col md:flex-row gap-6"
                              >
                                <div className={cn(
                                  "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0",
                                  update.contentType === 'homework' ? "bg-amber-50 text-amber-600" :
                                  update.contentType === 'progress' ? "bg-emerald-50 text-emerald-600" :
                                  update.contentType === 'material' ? "bg-blue-50 text-blue-600" :
                                  "bg-rose-50 text-rose-600"
                                )}>
                                  {update.contentType === 'homework' ? <FileText className="w-6 h-6" /> : 
                                   update.contentType === 'progress' ? <CheckCircle className="w-6 h-6" /> :
                                   update.contentType === 'material' ? <BookOpen className="w-6 h-6" /> :
                                   <MessageSquare className="w-6 h-6" />}
                                </div>
                                <div className="flex-1 space-y-4">
                                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                                    <div>
                                      <div className="flex items-center gap-2 mb-1">
                                        <span className={cn(
                                          "text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-lg",
                                          update.contentType === 'homework' ? "bg-amber-100 text-amber-700" :
                                          update.contentType === 'progress' ? "bg-emerald-100 text-emerald-700" :
                                          update.contentType === 'material' ? "bg-blue-100 text-blue-700" :
                                          "bg-rose-100 text-rose-700"
                                        )}>
                                          {update.contentType}
                                        </span>
                                        <span className="text-xs text-gray-400 font-bold flex items-center gap-1">
                                          <Calendar className="w-3 h-3" />
                                          {update.publishDate}
                                        </span>
                                      </div>
                                      <h5 className="text-lg font-black text-gray-900 tracking-tight">{update.title}</h5>
                                    </div>
                                  </div>
                                  <p className="text-gray-600 text-sm whitespace-pre-wrap">{update.description}</p>
                                  {update.attachments && update.attachments.length > 0 && (
                                    <div className="flex flex-wrap gap-2 pt-2">
                                      {update.attachments.map((link: string, i: number) => (
                                        <a key={i} href={link} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 border border-gray-100 rounded-lg text-[10px] font-bold text-brand hover:bg-brand hover:text-white transition-all">
                                          <Globe className="w-3 h-3" /> Resource {i+1}
                                        </a>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </motion.div>
                            ))
                          ) : (
                            <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-100">
                              <AlertCircle className="w-12 h-12 text-gray-200 mx-auto mb-4" />
                              <h6 className="font-black text-gray-900">No updates yet</h6>
                              <p className="text-gray-400 text-sm">Check back later for homework and documents.</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="md:col-span-2 relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input 
                      type="text"
                      value={studentSearchTerm}
                      onChange={(e) => setStudentSearchTerm(e.target.value)}
                      placeholder="Search by name or roll number..."
                      className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-medium focus:ring-4 focus:ring-brand/10 outline-none transition-all"
                    />
                  </div>
                  <div className="relative">
                    <Filter className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <select 
                      value={studentFilterBatch}
                      onChange={(e) => setStudentFilterBatch(e.target.value)}
                      className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-medium focus:ring-4 focus:ring-brand/10 outline-none appearance-none"
                    >
                      <option value="">All Batches</option>
                      {batches.map(b => (
                        <option key={b.id} value={b.id}>{b.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="relative">
                    <Filter className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <select 
                      value={studentFilterGrade}
                      onChange={(e) => setStudentFilterGrade(e.target.value)}
                      className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-medium focus:ring-4 focus:ring-brand/10 outline-none appearance-none"
                    >
                      <option value="">All Grades</option>
                      {Array.from(new Set(batches.map(b => b.grade))).map(g => (
                        <option key={g} value={g}>{g}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="bg-white rounded-3xl border border-gray-100 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="bg-gray-50 text-left">
                          <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Roll</th>
                          <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Student Name</th>
                          <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Batch/Grade</th>
                          <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Attendance</th>
                          <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Fees</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {searchingStudents ? (
                          <tr>
                            <td colSpan={5} className="py-20 text-center">
                              <Loader2 className="w-8 h-8 text-brand animate-spin mx-auto" />
                              <p className="text-xs text-gray-400 font-bold mt-4 uppercase">Searching Students...</p>
                            </td>
                          </tr>
                        ) : students.length > 0 ? (
                          students.map((student) => (
                            <tr key={student.id} className="hover:bg-gray-50/50 transition-colors">
                              <td className="px-6 py-4">
                                <span className="font-black text-gray-400 text-xs">#{student.rollNumber || '00'}</span>
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-3">
                                  <div className="w-9 h-9 bg-brand/10 text-brand rounded-xl flex items-center justify-center font-black text-xs">
                                    {student.name?.charAt(0)}
                                  </div>
                                  <div>
                                    <p className="font-black text-gray-900 text-sm leading-none">{student.name}</p>
                                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1.5">{student.phone || 'No Phone'}</p>
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <p className="font-bold text-gray-600 text-xs">{student.batchName || 'No Batch'}</p>
                                <p className="text-[10px] text-brand font-black uppercase tracking-widest mt-1">{student.grade}</p>
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-1.5 p-1 bg-emerald-50 text-emerald-600 rounded-lg w-fit">
                                  <CheckCircle className="w-3 h-3" />
                                  <span className="text-[10px] font-black uppercase tracking-widest">Regular</span>
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-1.5 p-1 bg-blue-50 text-blue-600 rounded-lg w-fit">
                                  <TrendingUp className="w-3 h-3" />
                                  <span className="text-[10px] font-black uppercase tracking-widest">Cleared</span>
                                </div>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={5} className="py-20 text-center">
                              <AlertCircle className="w-12 h-12 text-gray-200 mx-auto mb-4" />
                              <h6 className="font-black text-gray-900">No Students Found</h6>
                              <p className="text-gray-400 text-sm">Try adjusting your search or filters.</p>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </section>
        );

      default:
        return null;
    }
  };

  const defaultSections = [
    { id: 'sec_hero', type: 'hero', active: true, order: 0 },
    { id: 'sec_stats', type: 'stats', active: true, order: 1 },
    { id: 'sec_batch_portal', type: 'batch_portal', title: 'Student Zone', active: true, order: 1.5 },
    { id: 'sec_principal', type: 'principal', active: true, order: 2 },
    { id: 'sec_about', type: 'about', active: true, order: 3 },
    { id: 'sec_news', type: 'news', title: 'Latest Notices', active: notices.length > 0, order: 4 },
    { id: 'sec_results', type: 'results', title: 'Exam Results', active: exams.length > 0, order: 5 },
    { id: 'sec_events', type: 'events', title: 'Timeline & Events', active: events.length > 0, order: 6 },
    { id: 'sec_circulars', type: 'circulars', title: 'Career Opportunities', active: circulars.length > 0, order: 7 },
    { id: 'sec_faq', type: 'faq', title: 'Frequently Asked Questions', active: false, order: 8 },
  ];

  const sections = institution.websiteConfig?.sections?.sort((a: any, b: any) => a.order - b.order) || defaultSections;
  
  // Ensure that if it's not custom, we at least show existing content
  // Also ensure Student Zone is always present even in custom configs unless explicitly disabled
  let finalSections = institution.websiteConfig?.sections?.length ? sections : defaultSections.filter(s => s.active || ['hero', 'stats', 'about', 'principal', 'batch_portal'].includes(s.type));

  if (institution.websiteConfig?.sections?.length) {
    const hasBatchPortal = sections.some((s: any) => s.type === 'batch_portal');
    if (!hasBatchPortal) {
      finalSections = [...sections, defaultSections.find(s => s.type === 'batch_portal')!];
    }
  }

  return (
    <div className="min-h-screen bg-gray-50/50" style={{ '--brand-primary': primaryColor } as React.CSSProperties}>
      <style>{`
        .bg-brand { background-color: var(--brand-primary) !important; }
        .text-brand { color: var(--brand-primary) !important; }
        .border-brand { border-color: var(--brand-primary) !important; }
        .ring-brand { --tw-ring-color: var(--brand-primary) !important; }
      `}</style>

      {/* Floating Admission CTA (Mobile & Desktop) */}
      {institution.admissionForm?.active && (
        <motion.div 
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed bottom-6 right-6 z-50 md:bottom-10 md:right-10"
        >
          <button 
            onClick={() => navigate(`/public/admission/${institution.id}`)}
            className="flex items-center gap-3 bg-indigo-600 text-white px-6 py-4 rounded-full font-black shadow-2xl shadow-indigo-200 hover:scale-110 transition-transform group active:scale-95"
          >
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center group-hover:rotate-12 transition-transform">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div className="text-left">
              <p className="text-[10px] uppercase tracking-widest opacity-80 leading-none mb-1">New Batch Opening</p>
              <p className="text-sm">Apply for Admission</p>
            </div>
          </button>
        </motion.div>
      )}

      {/* Top Header / Nav */}
      <nav className="fixed top-0 inset-x-0 z-40 bg-white/80 backdrop-blur-xl border-b border-gray-100 py-4 px-6 md:px-12 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-black overflow-hidden shadow-lg shadow-indigo-200">
            {institution.logoURL ? (
              <img src={institution.logoURL} alt="Logo" className="w-full h-full object-contain p-1.5 bg-white" referrerPolicy="no-referrer" />
            ) : (
              institution.name.charAt(0)
            )}
          </div>
          <span className="font-black text-gray-900 tracking-tighter text-xl hidden sm:block">{institution.name}</span>
          <span className="font-black text-gray-900 tracking-tighter text-lg sm:hidden truncate max-w-[120px]">{institution.name}</span>
        </div>
        <div className="flex items-center gap-4">
           {institution.websiteConfig?.topBar?.phone && (
             <a href={`tel:${institution.websiteConfig.topBar.phone}`} className="hidden lg:flex items-center gap-2 text-xs font-black text-gray-500 hover:text-indigo-600 transition-colors uppercase tracking-widest">
               <Phone className="w-3.5 h-3.5" /> {institution.websiteConfig.topBar.phone}
             </a>
           )}
           <button 
             onClick={(e) => scrollToSection(e, 'sec_batch_portal')}
             className="px-6 py-2.5 bg-gray-900 text-white rounded-2xl text-xs font-black hover:scale-105 transition-transform active:scale-95 shadow-lg shadow-gray-200"
           >
             Student Zone
           </button>
        </div>
      </nav>

      {/* Spacing for fixed nav */}
      <div className="h-20" />

      {/* Dynamic Sections */}
      <div className="max-w-6xl mx-auto px-4 md:px-12 py-8 space-y-24 pb-24">
        {finalSections.filter((s: any) => s.active).map(section => (
          <motion.div 
            key={section.id} 
            id={section.id}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className={cn(
              section.type === 'hero' ? "" : "bg-white p-8 md:p-12 rounded-[3.5rem] border border-gray-100 shadow-sm"
            )}
          >
            {renderSection(section)}
          </motion.div>
        ))}
      
        {/* Contact Footer Card */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-8">
           <div className="lg:col-span-2 bg-gray-900 text-white p-12 rounded-[3.5rem] relative overflow-hidden shadow-2xl">
              <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-600/20 rounded-full blur-3xl -mr-32 -mt-32" />
              <div className="relative z-10 space-y-8">
                 <div className="space-y-4">
                    <h2 className="text-4xl md:text-5xl font-black tracking-tight">{institution.name}</h2>
                    <p className="text-gray-400 text-lg max-w-xl">
                       We are committed to providing a transformative educational experience. Visit us or reach out today.
                    </p>
                 </div>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
                    <div className="space-y-2">
                       <p className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] mb-1">Campus Address</p>
                       <div className="flex gap-3">
                          <MapPin className="w-5 h-5 text-indigo-400 shrink-0" />
                          <p className="text-sm font-medium text-gray-300 leading-relaxed">{institution.address || 'Address not provided'}</p>
                       </div>
                    </div>
                    <div className="space-y-2">
                       <p className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] mb-1">Contact Email</p>
                       <div className="flex gap-3">
                          <Mail className="w-5 h-5 text-indigo-400 shrink-0" />
                          <p className="text-sm font-medium text-gray-300">{institution.email || 'Email not provided'}</p>
                       </div>
                    </div>
                 </div>
              </div>
           </div>

           <div className="bg-indigo-600 p-12 rounded-[3.5rem] text-white space-y-8 shadow-2xl relative overflow-hidden">
              <div className="absolute inset-0 bg-white/5 opacity-20 pointer-events-none">
                 <svg width="100%" height="100%">
                   <pattern id="pattern-footer" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
                     <circle cx="10" cy="10" r="0.5" fill="currentColor" />
                   </pattern>
                   <rect width="100%" height="100%" fill="url(#pattern-footer)" />
                 </svg>
              </div>
              <div className="relative space-y-6">
                 <h3 className="text-3xl font-black italic leading-tight">Ready to join our next Batch?</h3>
                 <p className="text-indigo-100 font-medium">
                    Limited seats available for the upcoming session. Secure your position today.
                 </p>
                 <button 
                   onClick={() => navigate(`/public/admission/${institution.id}`)}
                   className="w-full py-5 bg-white text-indigo-600 rounded-3xl font-black text-lg hover:scale-105 transition-transform shadow-xl active:scale-95 flex items-center justify-center gap-3"
                 >
                    Apply Now <ChevronRight className="w-5 h-5" />
                 </button>
              </div>
           </div>
        </section>

        {/* Global Footer */}
        <footer className="text-center space-y-6 pt-12 border-t border-gray-100">
           <div className="flex items-center justify-center gap-3">
              <div className="w-8 h-8 bg-gray-900 rounded-lg flex items-center justify-center text-white">
                 <TrendingUp className="w-5 h-5" />
              </div>
              <span className="font-black text-xl text-gray-900 tracking-tighter">Manage My Batch</span>
           </div>
           <p className="text-gray-400 text-xs font-medium max-w-sm mx-auto">
              The only platform you need to grow your coaching center and manage your students professionally.
           </p>
           <p className="text-[10px] font-black text-gray-300 uppercase tracking-[0.3em]">
              Powered by AI Technology
           </p>
        </footer>
      </div>

      <HiddenBioTemplate institution={institution} stats={stats} bioRef={bioRef} />
    </div>
  );
}

function HiddenBioTemplate({ institution, stats, bioRef }: { institution: any, stats: any, bioRef: React.RefObject<HTMLDivElement> }) {
  return (
    <div className="fixed top-0 left-0 -z-[100] opacity-0 pointer-events-none overflow-hidden" style={{ width: '800px' }}>
      <div 
        ref={bioRef}
        className="w-[800px] p-12"
        style={{ fontFamily: '"Inter", sans-serif', minHeight: '1000px', backgroundColor: '#ffffff', color: '#111827' }}
      >
        <div className="flex items-center gap-8 border-b-4 pb-8" style={{ borderColor: institution?.primaryColor || '#4f46e5', marginBottom: '48px' }}>
          <div className="w-32 h-32 rounded-3xl flex items-center justify-center text-4xl font-black shrink-0 overflow-hidden" style={{ backgroundColor: '#f3f4f6', color: institution?.primaryColor || '#4f46e5' }}>
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
            <p className="font-bold uppercase tracking-widest text-xs" style={{ color: institution?.primaryColor || '#4f46e5', margin: 0 }}>Established: {institution.established || 'N/A'}</p>
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
