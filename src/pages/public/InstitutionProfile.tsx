import React, { useState, useEffect, useRef } from 'react';
import { db, handleFirestoreError, OperationType } from '../../firebase';
import { doc, getDoc, collection, query, where, getDocs, limit, orderBy } from 'firebase/firestore';
import { useParams, useNavigate } from 'react-router-dom';
import { Building, MapPin, Phone, Mail, Globe, Users, Briefcase, Layers, CheckCircle, Loader2, GraduationCap, Calendar, Download, Megaphone, Newspaper, ArrowRight, Clock, Info, FileText, TrendingUp } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';
import html2canvas from 'html2canvas';

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
  const bioRef = useRef<HTMLDivElement>(null);

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
        const [studentsSnap, teachersSnap, batchesSnap, noticesSnap, eventsSnap, circularsSnap, examsSnap] = await Promise.all([
          getDocs(query(collection(db, 'students'), where('institutionId', '==', instId))),
          getDocs(query(collection(db, 'teachers'), where('institutionId', '==', instId))),
          getDocs(query(collection(db, 'batches'), where('institutionId', '==', instId))),
          getDocs(query(collection(db, 'notices'), where('institutionId', '==', instId), where('active', '==', true), orderBy('createdAt', 'desc'), limit(5))),
          getDocs(query(collection(db, 'events'), where('institutionId', '==', instId), where('active', '==', true), orderBy('createdAt', 'desc'), limit(5))),
          getDocs(query(collection(db, 'circulars'), where('institutionId', '==', instId), where('active', '==', true), orderBy('createdAt', 'desc'), limit(5))),
          getDocs(query(collection(db, 'offline_exams'), where('institutionId', '==', instId), where('status', '==', 'published'), orderBy('date', 'desc'), limit(6)))
        ]);

        setStats({
          students: studentsSnap.size,
          teachers: teachersSnap.size,
          batches: batchesSnap.size
        });
        setNotices(noticesSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        setEvents(eventsSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        setCirculars(circularsSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        setExams(examsSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (err) {
        handleFirestoreError(err, OperationType.GET, 'institutions');
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [id, slug]);

  const downloadBio = async () => {
    if (!institution || !bioRef.current || downloading) return;
    
    setDownloading(true);
    try {
      const { jsPDF } = await import('jspdf');
      
      // Wait a bit for images and styles to settle
      await new Promise(r => setTimeout(r, 500));

      const canvas = await html2canvas(bioRef.current, {
        scale: 1.5,
        useCORS: true,
        logging: true,
        backgroundColor: '#ffffff',
        width: 800,
        height: bioRef.current.scrollHeight
      });
      
      if (!canvas || canvas.width === 0) {
        throw new Error('Canvas generation failed');
      }

      const imgData = canvas.toDataURL('image/jpeg', 0.8);
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
      alert(`Failed to generate PDF: ${error.message || 'Check connection'}`);
    } finally {
      setDownloading(false);
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
          <div key={section.id} className="bg-brand text-white pt-20 pb-40 px-6">
            <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center gap-8">
              <div className="w-32 h-32 bg-white/20 rounded-3xl flex items-center justify-center text-5xl font-black ring-8 ring-white/10 overflow-hidden">
                {institution.logoURL ? (
                  <img src={institution.logoURL} alt="Logo" className="w-full h-full object-contain p-4" referrerPolicy="no-referrer" />
                ) : (
                  institution.name.charAt(0)
                )}
              </div>
              <div className="text-center md:text-left space-y-2">
                <div className="flex items-center justify-center md:justify-start gap-2">
                  <span className="px-3 py-1 bg-white/20 text-xs font-bold uppercase tracking-widest rounded-full">Coaching Center</span>
                  <span className="px-3 py-1 bg-emerald-500 text-xs font-bold uppercase tracking-widest rounded-full flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" /> Verified
                  </span>
                </div>
                <h1 className="text-4xl md:text-5xl font-black tracking-tight">{institution.name}</h1>
                <p className="text-white/80 flex items-center justify-center md:justify-start gap-2">
                  <MapPin className="w-4 h-4" /> {institution.address || 'Address not provided'}
                </p>
              </div>
            </div>
          </div>
        );

      case 'stats':
        return (
          <div key={section.id} className="max-w-5xl mx-auto px-6 -mt-20 mb-12">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                { label: 'Students', value: stats.students, icon: Users, color: 'bg-blue-500' },
                { label: 'Teachers', value: stats.teachers, icon: Briefcase, color: 'bg-emerald-500' },
                { label: 'Batches', value: stats.batches, icon: Layers, color: 'bg-amber-500' },
              ].map((stat, idx) => (
                <motion.div 
                  key={idx}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  className="bg-white p-6 rounded-3xl shadow-xl shadow-indigo-100/50 border border-gray-100 flex items-center gap-6"
                >
                  <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center text-white", stat.color)}>
                    <stat.icon className="w-7 h-7" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">{stat.label}</p>
                    <h3 className="text-2xl font-black text-gray-900">{stat.value}</h3>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        );

      case 'about':
        return (
          <section key={section.id} className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm space-y-4">
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <GraduationCap className="w-6 h-6 text-brand" /> {section.title || 'About Institution'}
            </h2>
            <p className="text-gray-600 leading-relaxed whitespace-pre-wrap">
              {institution.description || 'No description provided.'}
            </p>
            {(institution.vision || institution.goal || institution.target) && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6">
                {institution.vision && (
                  <div className="p-4 bg-indigo-50 rounded-2xl border border-indigo-100">
                    <h5 className="font-bold text-indigo-900 text-sm mb-1 uppercase tracking-wider">Vision</h5>
                    <p className="text-xs text-indigo-700 leading-relaxed">{institution.vision}</p>
                  </div>
                )}
                {institution.goal && (
                  <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                    <h5 className="font-bold text-emerald-900 text-sm mb-1 uppercase tracking-wider">Goal</h5>
                    <p className="text-xs text-emerald-700 leading-relaxed">{institution.goal}</p>
                  </div>
                )}
                {institution.target && (
                  <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100">
                    <h5 className="font-bold text-amber-900 text-sm mb-1 uppercase tracking-wider">Target</h5>
                    <p className="text-xs text-amber-700 leading-relaxed">{institution.target}</p>
                  </div>
                )}
              </div>
            )}
          </section>
        );

      case 'gallery':
        return (section.images || []).length > 0 && (
          <section key={section.id} className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm space-y-6">
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Info className="w-6 h-6 text-indigo-600" /> {section.title || 'Photo Gallery'}
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {(section.images || []).map((img: string, idx: number) => (
                <motion.div 
                  key={idx}
                  whileHover={{ scale: 1.05 }}
                  className="aspect-square rounded-2xl overflow-hidden shadow-md ring-4 ring-gray-50 bg-gray-100"
                >
                  <img src={img} alt={`Gallery ${idx}`} className="w-full h-full object-cover" />
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
        return exams.length > 0 && (
          <section key={section.id} className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm space-y-6">
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <CheckCircle className="w-6 h-6 text-emerald-500" /> {section.title || 'Exam Results'}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {exams.map(exam => (
                <button 
                  key={exam.id}
                  onClick={() => navigate(`/public/exam/${exam.id}`)}
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
          <section key={section.id} className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm space-y-6">
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

      default:
        return null;
    }
  };

  const sections = institution.websiteConfig?.sections?.sort((a: any, b: any) => a.order - b.order) || [
    { id: 'sec_hero', type: 'hero', active: true, order: 0 },
    { id: 'sec_stats', type: 'stats', active: true, order: 1 },
    { id: 'sec_about', type: 'about', active: true, order: 2 },
    { id: 'sec_news', type: 'news', active: true, order: 3 },
    { id: 'sec_results', type: 'results', active: true, order: 4 },
  ];

  const primaryColor = institution?.primaryColor || '#4f46e5';

  return (
    <div className="min-h-screen bg-gray-100/50 py-4 sm:py-10 px-0 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto bg-white sm:rounded-[2.5rem] shadow-2xl shadow-gray-200/50 overflow-hidden border border-gray-100 flex flex-col min-h-[90vh]" style={{ '--brand-primary': primaryColor } as React.CSSProperties}>
        <style>{`
          .bg-brand { background-color: var(--brand-primary) !important; }
          .text-brand { color: var(--brand-primary) !important; }
          .border-brand { border-color: var(--brand-primary) !important; }
          .ring-brand { --tw-ring-color: var(--brand-primary) !important; }
          .from-brand { --tw-gradient-from: var(--brand-primary) var(--tw-gradient-from-position); --tw-gradient-to: rgb(0 0 0 / 0) var(--tw-gradient-to-position); --tw-gradient-stops: var(--tw-gradient-from), var(--tw-gradient-to); }
        `}</style>

        {/* Floating Navigation */}
        <nav className="bg-white/80 backdrop-blur-md sticky top-0 z-50 px-8 py-5 border-b border-gray-50 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-brand rounded-2xl flex items-center justify-center text-white shadow-lg shadow-brand/20 overflow-hidden uppercase">
              {institution.logoURL ? (
                <img src={institution.logoURL} alt="Logo" className="w-full h-full object-contain p-1.5" />
              ) : institution.name.charAt(0)}
            </div>
            <div>
              <span className="font-black text-2xl tracking-tighter text-gray-900 block leading-none">{institution.name}</span>
              <span className="text-[10px] font-black text-brand uppercase tracking-[0.2em] mt-1 block">OFFICIAL PROFILE</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={downloadBio}
              disabled={downloading}
              className="hidden sm:flex items-center gap-2 px-6 py-2.5 bg-gray-900 text-white rounded-xl text-sm font-bold hover:bg-gray-800 transition-all disabled:opacity-50"
            >
              {downloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              {downloading ? 'Preparing...' : 'Download Bio'}
            </button>
          </div>
        </nav>
        
        {/* Dynamic Sections */}
        <div className="space-y-12 flex-grow">
        {sections.filter((s: any) => s.active).map(section => (
          <div key={section.id} className={cn(
            section.type === 'hero' ? "" : "max-w-5xl mx-auto px-6"
          )}>
            {renderSection(section)}
          </div>
        ))}
      </div>

      {/* Persistent Footer and Contact Card */}
      <div className="max-w-5xl mx-auto px-6 mt-12 grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          {institution.principalName && !sections.find(s => s.type === 'about') && (
            <div className="bg-white p-8 rounded-[40px] border border-gray-100 shadow-sm">
                <div className="flex flex-col md:flex-row gap-8 items-start">
                  {institution.principalPhotoURL && (
                    <div className="w-32 h-32 rounded-3xl overflow-hidden shrink-0 shadow-lg ring-8 ring-indigo-50">
                      <img src={institution.principalPhotoURL} alt="Principal" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    </div>
                  )}
                  <div className="space-y-2">
                    <p className="text-2xl font-black text-gray-900">{institution.principalName}</p>
                    <p className="text-brand font-bold text-xs uppercase tracking-widest">{institution.principalTitle || 'Principal'}</p>
                    <p className="text-gray-500 italic leading-relaxed text-lg pt-4 line-clamp-4">
                      "Welcome to our institution. We are committed to providing the highest quality education and fostering a nurturing environment for all our students."
                    </p>
                  </div>
                </div>
            </div>
          )}
        </div>

        <div className="space-y-6">
           <div className="bg-white p-8 rounded-[40px] border border-gray-100 shadow-sm space-y-8">
              <h3 className="text-xl font-bold text-gray-900 border-b pb-4">Contact Information</h3>
              <div className="space-y-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 border border-indigo-100">
                    <Phone className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Phone</p>
                    <p className="font-bold text-gray-900 text-lg">{institution.phone || 'N/A'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600 border border-emerald-100">
                    <Mail className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Email</p>
                    <p className="font-bold text-gray-900 break-all">{institution.email || 'N/A'}</p>
                  </div>
                </div>
              </div>
              <button 
                onClick={downloadBio}
                disabled={downloading}
                className="w-full py-4 bg-gray-900 text-white font-bold rounded-2xl hover:bg-black disabled:opacity-50 transition-all shadow-xl shadow-gray-200 flex items-center justify-center gap-2"
              >
                {downloading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
                Download Institution Bio
              </button>
          </div>

          {institution.admissionForm?.active && (
            <div className="bg-indigo-600 p-8 rounded-[40px] text-white space-y-6 relative overflow-hidden group">
              <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-700" />
              <div className="relative space-y-4">
                <h3 className="text-2xl font-black italic">Admissions Open!</h3>
                <p className="text-indigo-100 text-sm leading-relaxed font-medium">
                  Be a part of our community. Join our batches and start your journey towards success.
                </p>
                <button 
                  onClick={() => navigate(`/public/admission/${institution.id}`)}
                  className="w-full py-4 bg-white text-indigo-600 font-black rounded-2xl hover:bg-yellow-400 hover:text-white transition-all shadow-lg"
                >
                  Apply Online Now
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

        <div className="px-6 py-12 border-t border-gray-100 mt-auto bg-gray-50/50">
          <div className="flex flex-col items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center overflow-hidden">
                <TrendingUp className="w-5 h-5 text-white" />
              </div>
              <span className="font-black text-gray-900 tracking-tighter text-xl">Manage My Batch</span>
            </div>
            <p className="text-center text-gray-400 text-xs font-medium max-w-sm">
              Everything you need to manage your coaching center efficiently.
            </p>
            <div className="flex items-center gap-6 mt-4">
              <p className="text-[10px] font-black text-gray-300 uppercase tracking-[0.2em] italic">Secure</p>
              <p className="text-[10px] font-black text-gray-300 uppercase tracking-[0.2em] italic">Reliable</p>
              <p className="text-[10px] font-black text-gray-300 uppercase tracking-[0.2em] italic">Professional</p>
            </div>
          </div>
        </div>
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
