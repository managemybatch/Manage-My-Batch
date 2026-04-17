import React, { useState, useEffect, useRef } from 'react';
import { db, handleFirestoreError, OperationType } from '../../firebase';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { useParams } from 'react-router-dom';
import { Building, MapPin, Phone, Mail, Globe, Users, Briefcase, Layers, CheckCircle, Loader2, GraduationCap, Calendar, Download } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../../lib/utils';
import html2canvas from 'html2canvas';

export function InstitutionProfile() {
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [institution, setInstitution] = useState<any>(null);
  const [stats, setStats] = useState({ students: 0, teachers: 0, batches: 0 });
  const bioRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function fetchData() {
      if (!id) return;
      
      try {
        const instDoc = await getDoc(doc(db, 'institutions', id));
        if (!instDoc.exists()) {
          setLoading(false);
          return;
        }
        
        const instData = { id: instDoc.id, ...instDoc.data() } as any;
        setInstitution(instData);
        
        // Fetch stats
        const [studentsSnapshot, teachersSnapshot, batchesSnapshot] = await Promise.all([
          getDocs(query(collection(db, 'students'), where('institutionId', '==', id))),
          getDocs(query(collection(db, 'teachers'), where('institutionId', '==', id))),
          getDocs(query(collection(db, 'batches'), where('institutionId', '==', id)))
        ]);

        setStats({
          students: studentsSnapshot.size,
          teachers: teachersSnapshot.size,
          batches: batchesSnapshot.size
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.GET, 'institutions');
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [id]);

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

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Hero Section */}
      <div className="bg-indigo-600 text-white pt-20 pb-40 px-6">
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
            <p className="text-indigo-100 flex items-center justify-center md:justify-start gap-2">
              <MapPin className="w-4 h-4" /> {institution.address || 'Address not provided'}
            </p>
          </div>
        </div>
      </div>

      {/* Stats & Content */}
      <div className="max-w-5xl mx-auto px-6 -mt-20">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <section className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm space-y-4">
              <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <GraduationCap className="w-6 h-6 text-indigo-600" /> About Institution
              </h2>
              <p className="text-gray-600 leading-relaxed whitespace-pre-wrap">
                {institution.description || 'No description provided.'}
              </p>
            </section>

            {(institution.vision || institution.goal || institution.target) && (
              <section className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm space-y-6">
                {institution.vision && (
                  <div className="space-y-2">
                    <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                      <Calendar className="w-5 h-5 text-indigo-600" /> Vision & Mission
                    </h3>
                    <p className="text-gray-600 leading-relaxed whitespace-pre-wrap pl-7">
                      {institution.vision}
                    </p>
                  </div>
                )}
                {institution.goal && (
                  <div className="space-y-2">
                    <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-indigo-600" /> Our Goal
                    </h3>
                    <p className="text-gray-600 leading-relaxed whitespace-pre-wrap pl-7">
                      {institution.goal}
                    </p>
                  </div>
                )}
                {institution.target && (
                  <div className="space-y-2">
                    <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                      <Layers className="w-5 h-5 text-indigo-600" /> Our Target
                    </h3>
                    <p className="text-gray-600 leading-relaxed whitespace-pre-wrap pl-7">
                      {institution.target}
                    </p>
                  </div>
                )}
              </section>
            )}

            {institution.principalName && (
              <section className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm space-y-6">
                <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                  <Users className="w-6 h-6 text-indigo-600" /> Message from Principal
                </h2>
                <div className="flex flex-col md:flex-row gap-6 items-start">
                  {institution.principalPhotoURL && (
                    <div className="w-32 h-32 rounded-2xl overflow-hidden shrink-0 shadow-lg ring-4 ring-indigo-50">
                      <img src={institution.principalPhotoURL} alt="Principal" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    </div>
                  )}
                  <div className="space-y-2">
                    <p className="text-xl font-bold text-gray-900">{institution.principalName}</p>
                    <p className="text-indigo-600 font-bold text-xs uppercase tracking-widest">{institution.principalTitle || 'Principal'}</p>
                    <p className="text-gray-600 italic leading-relaxed">
                      "Welcome to our institution. We are committed to providing the highest quality education and fostering a nurturing environment for all our students."
                    </p>
                  </div>
                </div>
              </section>
            )}
          </div>

          <div className="space-y-6">
            <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm space-y-6">
              <h3 className="text-xl font-bold text-gray-900">Contact Information</h3>
              <div className="space-y-4">
                <div className="flex items-center gap-3 text-gray-600">
                  <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center text-gray-400">
                    <Phone className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Phone</p>
                    <p className="font-bold text-gray-900">{institution.phone || 'N/A'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-gray-600">
                  <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center text-gray-400">
                    <Mail className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Email</p>
                    <p className="font-bold text-gray-900">{institution.email || 'N/A'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-gray-600">
                  <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center text-gray-400">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Established</p>
                    <p className="font-bold text-gray-900">{institution.established || 'N/A'}</p>
                  </div>
                </div>
              </div>
              <button 
                onClick={downloadBio}
                disabled={downloading}
                className="w-full py-4 bg-indigo-600 text-white font-bold rounded-2xl hover:bg-indigo-700 disabled:opacity-50 transition-all shadow-lg shadow-indigo-100 flex items-center justify-center gap-2"
              >
                {downloading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Download className="w-5 h-5" />
                )}
                {downloading ? 'Generating...' : 'Download Bio'}
              </button>
            </div>

            <div className="bg-emerald-600 p-8 rounded-3xl text-white space-y-4">
              <h3 className="text-xl font-bold">Admissions Open!</h3>
              <p className="text-emerald-50 text-sm leading-relaxed">
                We are currently accepting new students for the upcoming session. Apply online today!
              </p>
              <button 
                onClick={() => window.location.href = `/public/admission/${id}`}
                className="w-full py-4 bg-white text-emerald-600 font-bold rounded-2xl hover:bg-emerald-50 transition-all shadow-lg shadow-emerald-900/20"
              >
                Apply Now
              </button>
            </div>
          </div>
        </div>
      </div>
      <div className="max-w-5xl mx-auto px-6 mt-12 pb-12">
        <div className="flex flex-col items-center gap-2">
          <div className="w-6 h-6 bg-indigo-600 rounded-lg flex items-center justify-center overflow-hidden">
            <img 
              src="https://placehold.co/400x400/4f46e5/white?text=MMB" 
              alt="MMB Logo" 
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          </div>
          <p className="text-center text-gray-400 text-xs">
            Powered by <span className="font-bold text-indigo-600">Manage My Batch</span> • সুরক্ষিত ও নির্ভরযোগ্য
          </p>
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
        className="w-[800px] p-12 bg-white space-y-12 text-gray-900 border"
        style={{ fontFamily: '"Inter", sans-serif', minHeight: '1000px' }}
      >
        <div className="flex items-center gap-8 border-b-4 border-indigo-600 pb-8">
          <div className="w-32 h-32 bg-indigo-50 rounded-3xl flex items-center justify-center text-4xl font-black text-indigo-600 shrink-0 overflow-hidden">
            {institution.logoURL ? (
              <img src={institution.logoURL} alt="Logo" className="w-full h-full object-contain p-4" crossOrigin="anonymous" referrerPolicy="no-referrer" />
            ) : (
              institution.name.charAt(0)
            )}
          </div>
          <div className="space-y-2">
            <h1 className="text-4xl font-black tracking-tight text-gray-900">{institution.name}</h1>
            <p className="text-gray-500 font-bold flex items-center gap-2">
              <MapPin className="w-4 h-4" /> {institution.address || 'Address not provided'}
            </p>
            <p className="text-indigo-600 font-bold uppercase tracking-widest text-xs">Established: {institution.established || 'N/A'}</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-6">
          {[
            { label: 'Students', value: stats.students, color: 'text-blue-600' },
            { label: 'Teachers', value: stats.teachers, color: 'text-emerald-600' },
            { label: 'Batches', value: stats.batches, color: 'text-amber-600' },
          ].map((stat, idx) => (
            <div key={idx} className="bg-gray-50 p-6 rounded-2xl text-center border border-gray-100">
              <p className="text-[10px] font-black text-gray-400 border uppercase tracking-widest mb-1">{stat.label}</p>
              <h3 className={cn("text-2xl font-black", stat.color)}>{stat.value}</h3>
            </div>
          ))}
        </div>

        <div className="space-y-8">
          <section className="space-y-4">
            <h2 className="text-2xl font-black text-indigo-600 border-l-4 border-indigo-600 pl-4 uppercase tracking-tight">About Institution</h2>
            <p className="text-gray-600 leading-relaxed text-lg whitespace-pre-wrap">
              {institution.description || 'No description provided.'}
            </p>
          </section>

          {(institution.vision || institution.goal || institution.target) && (
            <section className="space-y-6 bg-indigo-50/50 p-8 rounded-3xl border border-indigo-100">
              {institution.vision && (
                <div className="space-y-2">
                  <h3 className="text-lg font-black text-gray-900">Vision & Mission</h3>
                  <p className="text-gray-600 leading-relaxed whitespace-pre-wrap">{institution.vision}</p>
                </div>
              )}
              {institution.goal && (
                <div className="space-y-2">
                  <h3 className="text-lg font-black text-gray-900">Our Goal</h3>
                  <p className="text-gray-600 leading-relaxed whitespace-pre-wrap">{institution.goal}</p>
                </div>
              )}
              {institution.target && (
                <div className="space-y-2">
                  <h3 className="text-lg font-black text-gray-900">Our Target</h3>
                  <p className="text-gray-600 leading-relaxed whitespace-pre-wrap">{institution.target}</p>
                </div>
              )}
            </section>
          )}

          {institution.principalName && (
            <section className="space-y-6">
              <h2 className="text-2xl font-black text-indigo-600 border-l-4 border-indigo-600 pl-4 uppercase tracking-tight">Message from Principal</h2>
              <div className="flex gap-8 items-start">
                {institution.principalPhotoURL && (
                  <div className="w-32 h-32 rounded-2xl overflow-hidden shrink-0 shadow-lg border-4 border-white ring-1 ring-gray-100">
                    <img src={institution.principalPhotoURL} alt="Principal" className="w-full h-full object-cover" crossOrigin="anonymous" />
                  </div>
                )}
                <div className="space-y-2">
                  <p className="text-xl font-bold text-gray-900">{institution.principalName}</p>
                  <p className="text-indigo-600 font-bold text-xs uppercase tracking-widest">{institution.principalTitle || 'Principal'}</p>
                  <p className="text-gray-600 italic leading-relaxed text-lg">
                    "Welcome to our institution. We are committed to providing the highest quality education and fostering a nurturing environment for all our students."
                  </p>
                </div>
              </div>
            </section>
          )}

          <div className="pt-8 border-t border-gray-100">
            <h3 className="text-lg font-black text-gray-900 mb-4">Contact Information</h3>
            <div className="grid grid-cols-2 gap-8">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center text-gray-400">
                    <Phone className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Phone</p>
                    <p className="font-bold text-gray-900">{institution.phone || 'N/A'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center text-gray-400">
                    <Mail className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Email</p>
                    <p className="font-bold text-gray-900">{institution.email || 'N/A'}</p>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100">
                <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">Generated by</p>
                <p className="font-black text-indigo-600 text-xl tracking-tight">Manage My Batch</p>
                <p className="text-xs text-gray-400">Your education partner</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
