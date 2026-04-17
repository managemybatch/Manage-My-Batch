import React, { useState, useEffect } from 'react';
import { db, handleFirestoreError, OperationType } from '../../firebase';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { useParams } from 'react-router-dom';
import { Building, MapPin, Phone, Mail, Globe, Users, Briefcase, Layers, CheckCircle, Loader2, GraduationCap, Calendar, Download } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../../lib/utils';

export function InstitutionProfile() {
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [institution, setInstitution] = useState<any>(null);
  const [stats, setStats] = useState({ students: 0, teachers: 0, batches: 0 });

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
    if (!institution) return;
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF();
    const instName = institution.name || 'Institution';
    
    // Header
    doc.setFontSize(22);
    doc.setTextColor(79, 70, 229); // Indigo
    doc.text(instName, 105, 20, { align: 'center' });
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Established: ${institution.established || 'N/A'}`, 105, 28, { align: 'center' });
    
    // Line
    doc.setDrawColor(200);
    doc.line(20, 35, 190, 35);
    
    // Content
    doc.setFontSize(12);
    doc.setTextColor(0);
    doc.setFont('helvetica', 'bold');
    doc.text('Contact Details', 20, 45);
    doc.setFont('helvetica', 'normal');
    doc.text(`Phone: ${institution.phone || 'N/A'}`, 25, 52);
    doc.text(`Email: ${institution.email || 'N/A'}`, 25, 59);
    doc.text(`Address: ${institution.address || 'N/A'}`, 25, 66);
    
    doc.setFont('helvetica', 'bold');
    doc.text('About Institution', 20, 80);
    doc.setFont('helvetica', 'normal');
    const descLines = doc.splitTextToSize(institution.description || 'No description provided.', 160);
    doc.text(descLines, 25, 87);
    
    let y = 87 + (descLines.length * 7);
    
    if (institution.vision) {
      doc.setFont('helvetica', 'bold');
      doc.text('Vision', 20, y + 10);
      doc.setFont('helvetica', 'normal');
      const visionLines = doc.splitTextToSize(institution.vision, 160);
      doc.text(visionLines, 25, y + 17);
      y = y + 17 + (visionLines.length * 7);
    }
    
    if (institution.principalName) {
      doc.setFont('helvetica', 'bold');
      doc.text('Principal Information', 20, y + 10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Name: ${institution.principalName}`, 25, y + 17);
      doc.text(`Title: ${institution.principalTitle || 'Principal'}`, 25, y + 24);
    }
    
    doc.save(`${instName.replace(/\s+/g, '_')}_Profile.pdf`);
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
                className="w-full py-4 bg-indigo-600 text-white font-bold rounded-2xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 flex items-center justify-center gap-2"
              >
                <Download className="w-5 h-5" /> Download Bio
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
    </div>
  );
}
