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
      const selectedBatch = batches.find(b => b.id === data['batch']);
      await addDoc(collection(db, 'applications'), {
        institutionId: id,
        studentName: data['studentName'] || 'N/A',
        guardianPhone: data['guardianPhone'] || 'N/A',
        studentPhone: data['studentPhone'] || '',
        grade: selectedBatch?.grade || selectedBatch?.name || 'N/A',
        batchId: data['batch'],
        batchName: selectedBatch?.name || '',
        monthlyFee: selectedBatch?.monthlyFee || 0,
        admissionFee: selectedBatch?.admissionFee || 0,
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
    { key: 'guardianPhone', label: 'অভিভাবকের ফোন নম্বর*', required: true, icon: Phone, placeholder: 'অভিভাবকের ফোন নম্বর লিখুন' },
    { key: 'studentPhone', label: 'ছাত্রের ফোন নম্বর', required: false, icon: Phone, placeholder: 'ছাত্রের ফোন নম্বর লিখুন (ঐচ্ছিক)' },
    { key: 'admissionDate', label: 'ভর্তির তারিখ*', required: true, icon: Calendar, placeholder: 'ভর্তির তারিখ', type: 'date' },
    { key: 'batch', label: 'ব্যাচ*', required: true, icon: GraduationCap, placeholder: 'ব্যাচের নাম লিখুন' },
    { key: 'subjectGroup', label: 'বিষয় গ্রুপ', required: false, icon: GraduationCap, placeholder: 'যেমন: বিজ্ঞান/মানবিক' },
    { key: 'schoolName', label: 'পূর্ববর্তী প্রতিষ্ঠান (স্কুল/কলেজ)', required: false, icon: Building, placeholder: 'পূর্ববর্তী প্রতিষ্ঠানের নাম লিখুন' },
    { key: 'address', label: 'বিস্তারিত ঠিকানা', required: false, icon: Building, placeholder: 'বর্তমান ঠিকানা লিখুন', textarea: true },
  ];

  return (
    <div className="min-h-screen bg-gray-50/50 py-12 px-6">
      <div className="max-w-3xl mx-auto space-y-12">
        <div className="text-center space-y-6">
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-24 h-24 bg-white rounded-[2rem] flex items-center justify-center text-4xl font-black mx-auto shadow-2xl shadow-indigo-100/50 overflow-hidden ring-8 ring-white"
          >
            {institution.logoURL ? (
              <img src={institution.logoURL} alt="Logo" className="w-full h-full object-contain p-2" referrerPolicy="no-referrer" />
            ) : (
              <div className="w-full h-full bg-indigo-600 text-white flex items-center justify-center">
                {institution.name.charAt(0)}
              </div>
            )}
          </motion.div>
          <div className="space-y-2">
            <h1 className="text-4xl md:text-5xl font-black text-gray-900 tracking-tight leading-none">{institution.admissionForm.title}</h1>
            <p className="text-indigo-600 font-black uppercase tracking-[0.3em] text-xs leading-none">{institution.name}</p>
          </div>
          <div className="bg-indigo-50/50 backdrop-blur-sm p-6 rounded-[2rem] border border-indigo-100 text-indigo-700 text-sm leading-relaxed max-w-xl mx-auto font-medium">
            {institution.admissionForm.instructions || 'অনুগ্রহ করে নিচের ফর্মটি সঠিক তথ্য দিয়ে পূরণ করুন।'}
          </div>
        </div>

        <motion.div
           initial={{ opacity: 0, y: 20 }}
           animate={{ opacity: 1, y: 0 }}
           className="bg-white p-8 md:p-16 rounded-[3.5rem] border border-gray-100 shadow-2xl shadow-indigo-100/30"
        >
          <form onSubmit={handleSubmit} className="space-y-10">
            {/* Photo Upload Section */}
            <div className="flex flex-col items-center gap-6 pb-10 border-b border-gray-50">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Student Photograph</span>
              <div className="relative group">
                <div className="w-40 h-40 bg-gray-50 border-2 border-dashed border-gray-200 rounded-[2.5rem] flex flex-col items-center justify-center text-gray-400 group-hover:border-indigo-500 group-hover:text-indigo-500 transition-all cursor-pointer overflow-hidden ring-8 ring-gray-50/50 group-hover:ring-indigo-50 transition-all">
                  {photoPreview ? (
                    <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <>
                      <User className="w-10 h-10 mb-2 opacity-20" />
                      <span className="text-[10px] font-black uppercase tracking-wider text-center px-4 leading-tight">Upload Image</span>
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
              <p className="text-[10px] text-gray-400 font-medium italic">Max size: 1MB. (Optional)</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-10">
              {ADMISSION_FIELDS.map((field) => {
                const isVisible = institution.admissionForm.fields?.[field.key] !== false;
                if (!isVisible) return null;

                return (
                  <div key={field.key} className={cn("space-y-3", field.textarea ? "md:col-span-2" : "")}>
                    <label className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">
                      <field.icon className="w-3.5 h-3.5" /> {field.label}
                    </label>
                    <div className="relative group">
                      {!field.textarea && <field.icon className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-300 w-5 h-5 group-focus-within:text-indigo-500 transition-colors" />}
                      
                      {field.key === 'batch' ? (
                        <select
                          name="batch"
                          required={field.required}
                          className="w-full pl-14 pr-6 py-4 bg-gray-50/50 border border-gray-100 rounded-2xl text-sm font-bold text-gray-900 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all appearance-none"
                        >
                          <option value="">Select a Batch</option>
                          {batches.filter(b => b.active !== false).map((batch) => (
                            <option key={batch.id} value={batch.id}>
                              {batch.name} {batch.grade ? `(${batch.grade})` : ''}
                            </option>
                          ))}
                        </select>
                      ) : field.textarea ? (
                        <textarea
                          name={field.key}
                          required={field.required}
                          placeholder={field.placeholder}
                          rows={4}
                          className="w-full px-6 py-4 bg-gray-50/50 border border-gray-100 rounded-2xl text-sm font-medium text-gray-900 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all placeholder:text-gray-300 resize-none"
                        />
                      ) : (
                        <input
                          name={field.key}
                          type={field.type || 'text'}
                          required={field.required}
                          placeholder={field.placeholder}
                          className="w-full pl-14 pr-6 py-4 bg-gray-50/50 border border-gray-100 rounded-2xl text-sm font-bold text-gray-900 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all placeholder:text-gray-300"
                        />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="pt-10">
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-6 bg-indigo-600 text-white rounded-3xl font-black text-xl hover:bg-indigo-700 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-2xl shadow-indigo-200 disabled:opacity-50 disabled:hover:scale-100 flex items-center justify-center gap-3"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-6 h-6 animate-spin" /> Submitting...
                  </>
                ) : (
                  <>
                    Submit Application <Send className="w-6 h-6" />
                  </>
                )}
              </button>
            </div>
          </form>
        </motion.div>

        <footer className="text-center space-y-6 pt-12">
           <div className="flex items-center justify-center gap-3">
              <div className="w-8 h-8 bg-gray-900 rounded-lg flex items-center justify-center text-white">
                 <Building className="w-5 h-5" />
              </div>
              <span className="font-black text-xl text-gray-900 tracking-tighter">Manage My Batch</span>
           </div>
           <p className="text-gray-400 text-[10px] font-black uppercase tracking-[0.3em]">
              Safe • Reliable • Professional
           </p>
        </footer>
      </div>
    </div>
  );
}
