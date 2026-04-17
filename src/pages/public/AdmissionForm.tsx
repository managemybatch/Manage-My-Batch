import React, { useState, useEffect } from 'react';
import { db, handleFirestoreError, OperationType } from '../../firebase';
import { doc, getDoc, collection, addDoc } from 'firebase/firestore';
import { useParams } from 'react-router-dom';
import { Building, CheckCircle, Loader2, Send, Info, User, Phone, Mail, GraduationCap, Calendar } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';

export function AdmissionForm() {
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [institution, setInstitution] = useState<any>(null);
  const [batches, setBatches] = useState<any[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      if (!id) return;
      try {
        const instDoc = await getDoc(doc(db, 'institutions', id));
        if (instDoc.exists()) {
          setInstitution({ id: instDoc.id, ...instDoc.data() });
        }

        // Fetch batches for this institution
        const { getDocs, query, where, collection } = await import('firebase/firestore');
        const batchesSnap = await getDocs(query(collection(db, 'batches'), where('institutionId', '==', id)));
        setBatches(batchesSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (err) {
        handleFirestoreError(err, OperationType.GET, 'institutions');
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [id]);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 1024 * 1024) { // 1MB limit for base64
        alert('Photo size should be less than 1MB');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!id) return;
    setSubmitting(true);
    const formData = new FormData(e.currentTarget);
    const data: any = {};
    formData.forEach((value, key) => {
      data[key] = value;
    });

    try {
      await addDoc(collection(db, 'applications'), {
        institutionId: id,
        studentName: data['studentName'] || 'N/A',
        guardianPhone: data['guardianPhone'] || 'N/A',
        grade: batches.find(b => b.id === data['batch'])?.grade || batches.find(b => b.id === data['batch'])?.name || 'N/A',
        batchId: data['batch'],
        status: 'pending',
        photoUrl: photoPreview,
        formData: {
          ...data,
          photoUrl: photoPreview
        },
        createdAt: new Date().toISOString()
      });
      
      setSubmitted(true);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'applications');
      alert('Failed to submit application. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-12 h-12 text-indigo-600 animate-spin" />
      </div>
    );
  }

  if (!institution || !institution.admissionForm.active) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-6">
        <div className="max-w-md w-full text-center space-y-6 bg-white p-12 rounded-3xl border border-gray-100 shadow-xl shadow-indigo-100/50">
          <div className="w-20 h-20 bg-rose-50 rounded-3xl flex items-center justify-center text-rose-500 mx-auto">
            <Info className="w-10 h-10" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-gray-900">ভর্তি বন্ধ আছে</h1>
            <p className="text-gray-500">{institution?.name || 'এই প্রতিষ্ঠানের'} ভর্তি ফরমটি বর্তমানে নিষ্ক্রিয় আছে।</p>
          </div>
          <button 
            onClick={() => window.location.href = `/public/institution/${id}`}
            className="w-full py-3 bg-gray-900 text-white font-bold rounded-xl hover:bg-gray-800 transition-all"
          >
            প্রতিষ্ঠানের প্রোফাইল দেখুন
          </button>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-6">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full text-center space-y-6 bg-white p-12 rounded-3xl border border-gray-100 shadow-xl shadow-indigo-100/50"
        >
          <div className="w-20 h-20 bg-emerald-50 rounded-3xl flex items-center justify-center text-emerald-500 mx-auto">
            <CheckCircle className="w-10 h-10" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-gray-900">আবেদন সফল হয়েছে!</h1>
            <p className="text-gray-500">{institution.name}-এ আবেদনের জন্য ধন্যবাদ। আমরা আপনার আবেদনটি যাচাই করে শীঘ্রই যোগাযোগ করব।</p>
          </div>
          <button 
            onClick={() => window.location.href = `/public/institution/${id}`}
            className="w-full py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-all"
          >
            প্রতিষ্ঠানের প্রোফাইলে ফিরে যান
          </button>
        </motion.div>
      </div>
    );
  }

  const ADMISSION_FIELDS = [
    { key: 'studentName', label: 'ছাত্রের নাম*', required: true, icon: User, placeholder: 'শিক্ষার্থীর নাম লিখুন' },
    { key: 'dob', label: 'জন্ম তারিখ*', required: true, icon: Calendar, placeholder: 'দিন/মাস/বছর', type: 'date' },
    { key: 'birthReg', label: 'জন্ম নিবন্ধন নম্বর*', required: true, icon: Info, placeholder: 'জন্ম নিবন্ধন নম্বর লিখুন' },
    { key: 'nid', label: 'এনআইডি নম্বর', required: false, icon: Info, placeholder: 'এনআইডি নম্বর লিখুন' },
    { key: 'fatherName', label: 'পিতার নাম', required: false, icon: User, placeholder: 'পিতার নাম লিখুন' },
    { key: 'motherName', label: 'মাতার নাম', required: false, icon: User, placeholder: 'মাতার নাম লিখুন' },
    { key: 'guardianPhone', label: 'ফোন*', required: true, icon: Phone, placeholder: 'ফোন নম্বর লিখুন' },
    { key: 'admissionDate', label: 'ভর্তির তারিখ*', required: true, icon: Calendar, placeholder: 'ভর্তির তারিখ', type: 'date' },
    { key: 'batch', label: 'ব্যাচ*', required: true, icon: GraduationCap, placeholder: 'ব্যাচের নাম লিখুন' },
    { key: 'subjectGroup', label: 'বিষয় গ্রুপ', required: false, icon: GraduationCap, placeholder: 'যেমন: বিজ্ঞান/মানবিক' },
    { key: 'address', label: 'বিস্তারিত ঠিকানা', required: false, icon: Building, placeholder: 'বর্তমান ঠিকানা লিখুন', textarea: true },
  ];

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-6">
      <div className="max-w-2xl mx-auto space-y-8">
        <div className="text-center space-y-4">
          <div className="w-20 h-20 bg-white rounded-2xl flex items-center justify-center text-white text-2xl font-black mx-auto shadow-lg shadow-indigo-100 overflow-hidden ring-4 ring-indigo-50">
            {institution.logoURL ? (
              <img src={institution.logoURL} alt="Logo" className="w-full h-full object-contain p-2" referrerPolicy="no-referrer" />
            ) : (
              <div className="w-full h-full bg-indigo-600 flex items-center justify-center">
                {institution.name.charAt(0)}
              </div>
            )}
          </div>
          <div>
            <h1 className="text-3xl font-black text-gray-900 tracking-tight">{institution.admissionForm.title}</h1>
            <p className="text-indigo-600 font-bold uppercase tracking-widest text-xs mt-1">{institution.name}</p>
          </div>
          <div className="bg-indigo-50 p-4 rounded-2xl border border-indigo-100 text-indigo-700 text-sm leading-relaxed">
            {institution.admissionForm.instructions || 'অনুগ্রহ করে নিচের ফর্মটি সঠিক তথ্য দিয়ে পূরণ করুন।'}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="bg-white p-8 md:p-12 rounded-3xl border border-gray-100 shadow-xl shadow-indigo-100/50 space-y-8">
          {/* Photo Upload Section */}
          <div className="flex flex-col items-center gap-4 pb-4 border-b border-gray-100">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">ছাত্রের ছবি (ঐচ্ছিক)</label>
            <div className="relative group">
              <div className="w-32 h-32 bg-gray-50 border-2 border-dashed border-gray-200 rounded-3xl flex flex-col items-center justify-center text-gray-400 group-hover:border-indigo-500 group-hover:text-indigo-500 transition-all cursor-pointer overflow-hidden">
                {photoPreview ? (
                  <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                  <>
                    <User className="w-8 h-8 mb-1" />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-center px-2">ছবি আপলোড করুন</span>
                  </>
                )}
              </div>
              <input 
                type="file" 
                accept="image/*"
                onChange={handlePhotoChange}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
            </div>
            <p className="text-[10px] text-gray-400">সর্বোচ্চ ১ মেগাবাইট</p>
          </div>

          <div className="grid grid-cols-1 gap-6">
            {ADMISSION_FIELDS.map((field) => {
              const isVisible = institution.admissionForm.fields?.[field.key] !== false;
              if (!isVisible) return null;

              return (
                <div key={field.key} className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">{field.label}</label>
                  <div className="relative">
                    {!field.textarea && <field.icon className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />}
                    {field.textarea ? (
                      <textarea
                        name={field.key}
                        required={field.required}
                        placeholder={field.placeholder}
                        rows={3}
                        className="w-full px-4 py-4 bg-gray-50 border border-gray-200 rounded-2xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all resize-none"
                      />
                    ) : field.key === 'batch' ? (
                      <select
                        name="batch"
                        required={field.required}
                        className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-200 rounded-2xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all appearance-none"
                      >
                        <option value="">ব্যাচ নির্বাচন করুন...</option>
                        {batches.map(b => (
                          <option key={b.id} value={b.id}>{b.name} ({b.grade})</option>
                        ))}
                      </select>
                    ) : (
                      <input
                        name={field.key}
                        type={field.type || 'text'}
                        required={field.required}
                        placeholder={field.placeholder}
                        className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-200 rounded-2xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                      />
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <button 
            type="submit" 
            disabled={submitting}
            className="w-full py-4 bg-indigo-600 text-white font-bold rounded-2xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
            {submitting ? 'জমাদান করা হচ্ছে...' : 'আবেদন জমা দিন'}
          </button>
        </form>

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
