import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { db, handleFirestoreError, OperationType } from '../../firebase';
import { doc, getDoc, collection, addDoc } from 'firebase/firestore';
import { Briefcase, CheckCircle, Loader2, Send, Info, User, Phone, Mail, Calendar, MapPin, Building, GraduationCap, Globe, Camera, Home, Hash, Clock, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Attachment {
  name: string;
  data: string;
}

export function JobCircular() {
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [circular, setCircular] = useState<any>(null);
  const [institution, setInstitution] = useState<any>(null);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [attachments, setAttachments] = useState<Attachment[]>([]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach((file: File) => {
      if (file.size > 500000) { // 500KB limit
        alert(`File ${file.name} is too large. Max 500KB.`);
        return;
      }
      if (attachments.length >= 5) {
        alert('Max 5 files allowed.');
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        setAttachments(prev => [...prev, { name: file.name, data: reader.result as string }]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  useEffect(() => {
    async function fetchData() {
      if (!id) return;
      try {
        const circularDoc = await getDoc(doc(db, 'circulars', id));
        if (!circularDoc.exists()) return;
        
        const circularData = { id: circularDoc.id, ...circularDoc.data() } as any;
        setCircular(circularData);
        
        const instDoc = await getDoc(doc(db, 'institutions', circularData.institutionId));
        if (instDoc.exists()) {
          setInstitution({ id: instDoc.id, ...instDoc.data() });
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, 'circulars');
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [id]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!id || !circular) return;
    setSubmitting(true);
    const formData = new FormData(e.currentTarget);
    const data: any = {};
    formData.forEach((value, key) => {
      data[key] = value;
    });

    try {
      await addDoc(collection(db, 'job_applications'), {
        circularId: id,
        institutionId: circular.institutionId,
        applicantName: data['Full Name'],
        phone: data['Phone'],
        email: data['Email'],
        age: data['Age'],
        address: data['Address'],
        attachments: attachments,
        photoUrl: attachments.find(a => a.name.match(/\.(jpg|jpeg|png|webp)$/i))?.data || null,
        resumeUrl: data['Resume URL'] || null,
        status: 'pending',
        formData: data,
        createdAt: new Date().toISOString()
      });
      
      setSubmitted(true);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'job_applications');
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

  if (!circular || !circular.active) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-6">
        <div className="max-w-md w-full text-center space-y-6 bg-white p-12 rounded-3xl border border-gray-100 shadow-xl shadow-indigo-100/50">
          <div className="w-20 h-20 bg-rose-50 rounded-3xl flex items-center justify-center text-rose-500 mx-auto">
            <Info className="w-10 h-10" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-gray-900">সার্কুলারটি বন্ধ হয়ে গেছে</h1>
            <p className="text-gray-500">এই চাকরির সার্কুলারটি এখন আর সক্রিয় নেই বা সরিয়ে ফেলা হয়েছে।</p>
          </div>
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
            <p className="text-gray-500">{institution?.name || 'আমাদের টিমে'} যোগদানের আগ্রহের জন্য ধন্যবাদ। আমরা আপনার আবেদনটি যাচাই করে শীঘ্রই যোগাযোগ করব।</p>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-6">
      <div className="max-w-4xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-white p-8 md:p-12 rounded-3xl border border-gray-100 shadow-xl shadow-indigo-100/50 space-y-8">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 bg-indigo-50 text-indigo-600 text-xs font-bold uppercase tracking-widest rounded-full">চাকরির সার্কুলার</span>
                <span className="px-3 py-1 bg-emerald-50 text-emerald-600 text-xs font-bold uppercase tracking-widest rounded-full">{circular.jobType || 'ফুল টাইম'}</span>
              </div>
              <h1 className="text-3xl md:text-4xl font-black text-gray-900 tracking-tight">{circular.title}</h1>
              <div className="flex flex-wrap gap-4 text-sm text-gray-500 font-bold uppercase tracking-widest">
                <span className="flex items-center gap-1.5"><Building className="w-4 h-4" /> {institution?.name}</span>
                <span className="flex items-center gap-1.5"><MapPin className="w-4 h-4" /> {institution?.address}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 p-6 bg-gray-50/50 rounded-2xl border border-gray-100">
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">বেতন পরিসীমা</p>
                <p className="text-indigo-600 font-bold flex items-center gap-1">৳ {circular.salaryRange || 'আলোচনা সাপেক্ষে'}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">শূন্যপদ</p>
                <p className="text-gray-900 font-bold flex items-center gap-1"><User className="w-3 h-3 text-gray-400" /> {circular.vacancies || '১'} জন</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">চাকরির ধরন</p>
                <p className="text-gray-900 font-bold flex items-center gap-1"><Clock className="w-3 h-3 text-gray-400" /> {circular.jobType || 'ফুল টাইম'}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">শেষ সময়</p>
                <p className="text-rose-600 font-bold flex items-center gap-1"><Calendar className="w-3 h-3" /> {circular.deadline}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-6 border-t border-gray-100">
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <GraduationCap className="w-5 h-5 text-indigo-600" /> শিক্ষাগত যোগ্যতা
                </h3>
                <div className="p-4 bg-white border border-gray-100 rounded-xl">
                  <span className="text-gray-700 font-medium text-sm">{circular.education || 'উল্লেখ নেই'}</span>
                </div>
              </div>
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <Briefcase className="w-5 h-5 text-indigo-600" /> অভিজ্ঞতা
                </h3>
                <div className="p-4 bg-white border border-gray-100 rounded-xl">
                  <span className="text-gray-700 font-medium text-sm">{circular.experience || 'উল্লেখ নেই'}</span>
                </div>
              </div>
            </div>

            <div className="space-y-4 pt-8 border-t border-gray-100">
              <h3 className="text-xl font-bold text-gray-900">কাজের বিবরণ</h3>
              <p className="text-gray-600 leading-relaxed whitespace-pre-wrap">{circular.description}</p>
            </div>

            <div className="space-y-4 pt-8 border-t border-gray-100">
              <h3 className="text-xl font-bold text-gray-900">যোগ্যতাসমূহ</h3>
              <ul className="space-y-3">
                {circular.requirements.map((req: string, idx: number) => (
                  <li key={idx} className="flex items-start gap-3 text-gray-600">
                    <div className="w-5 h-5 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <CheckCircle className="w-3 h-3" />
                    </div>
                    <span>{req}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-xl shadow-indigo-100/50 space-y-6">
            <div className="space-y-2">
              <h3 className="text-xl font-bold text-gray-900">আবেদন করুন</h3>
              <p className="text-xs text-gray-500 bg-indigo-50 p-3 rounded-xl border border-indigo-100">
                নির্দেশনা: অনুগ্রহ করে নিচের ফর্মটি সঠিক তথ্য দিয়ে পূরণ করুন। আপনার শিক্ষাগত যোগ্যতা এবং অভিজ্ঞতার বিস্তারিত তথ্য প্রদান করুন।
              </p>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-3">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">প্রয়োজনীয় নথিপত্র (ছবি, সিভি, সনদপত্র)</label>
                <div className="grid grid-cols-1 gap-3">
                  <label className="w-full flex flex-col items-center justify-center py-6 px-4 bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl cursor-pointer hover:border-indigo-400 hover:bg-indigo-50/30 transition-all group">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <div className="w-10 h-10 bg-white shadow-sm rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Plus className="w-5 h-5 text-indigo-600" />
                      </div>
                      <p className="text-xs font-bold text-gray-600">ক্লিক করে ফাইল সিলেক্ট করুন বা ড্র্যাগ করুন</p>
                      <p className="text-[10px] text-gray-400">সর্বোচ্চ ৫টি ফাইল (প্রতিটি ৫০০ কেবি)</p>
                    </div>
                    <input 
                      type="file" 
                      multiple
                      accept="image/*,.pdf,.doc,.docx" 
                      onChange={handleFileChange}
                      className="hidden" 
                    />
                  </label>

                  <div className="flex flex-wrap gap-2">
                    {attachments.map((file, idx) => (
                      <div key={idx} className="flex items-center gap-2 px-3 py-2 bg-indigo-50 text-indigo-700 rounded-lg text-xs font-bold border border-indigo-100 group">
                        <div className="w-4 h-4 overflow-hidden rounded">
                          {file.data.startsWith('data:image') ? <img src={file.data} className="w-full h-full object-cover" /> : <Info className="w-4 h-4" />}
                        </div>
                        <span className="truncate max-w-[100px]">{file.name}</span>
                        <button type="button" onClick={() => removeAttachment(idx)} className="hover:text-rose-500">
                          <Plus className="w-4 h-4 rotate-45" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">পূর্ণ নাম</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input name="Full Name" required className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">জন্ম তারিখ</label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input name="Birth Date" type="date" required className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none" />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">লিঙ্গ</label>
                  <select name="Gender" required className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none appearance-none">
                    <option value="">সিলেক্ট করুন</option>
                    <option value="Male">পুরুষ</option>
                    <option value="Female">মহিলা</option>
                    <option value="Other">অন্যান্য</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">বয়স</label>
                  <div className="relative">
                    <Hash className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input name="Age" type="number" required className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none" />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">প্রত্যাশিত বেতন</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-bold">৳</span>
                    <input name="Expected Salary" type="number" required placeholder="যেমন: ১৫০০০" className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none" />
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">ফোন নম্বর</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input name="Phone" required className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none" />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">ইমেইল</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input name="Email" type="email" required className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none" />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">বর্তমান ঠিকানা</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input name="Address" required className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none" />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">শিক্ষাগত যোগ্যতা (সর্বশেষ ডিগ্রি)</label>
                <div className="relative">
                  <GraduationCap className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input name="Education" required placeholder="যেমন: বিএসসি ইন ফিজিক্স" className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none" />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">শিক্ষা প্রতিষ্ঠান</label>
                <div className="relative">
                  <Building className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input name="Institution" required placeholder="বিশ্ববিদ্যালয়/কলেজের নাম" className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none" />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">বর্তমান পেশা / কি নিয়ে পড়ছেন</label>
                <div className="relative">
                  <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input name="Current Status" required placeholder="যেমন: এমএসসি রানিং / শিক্ষকতা" className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none" />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">পূর্ব অভিজ্ঞতা (যদি থাকে)</label>
                <textarea name="Experience" rows={2} placeholder="আপনার পূর্ব অভিজ্ঞতা সম্পর্কে লিখুন..." className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none resize-none" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">রিজিউম লিঙ্ক (ঐচ্ছিক)</label>
                <div className="relative">
                  <Globe className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input name="Resume URL" placeholder="গুগল ড্রাইভ বা অন্য কোনো লিঙ্ক" className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none" />
                </div>
              </div>
              <button 
                type="submit" 
                disabled={submitting}
                className="w-full py-4 bg-indigo-600 text-white font-bold rounded-2xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                {submitting ? 'জমাদান করা হচ্ছে...' : 'আবেদন পাঠান'}
              </button>
            </form>
          </div>

          <div className="bg-indigo-600 p-8 rounded-3xl text-white space-y-4">
            <h3 className="text-xl font-bold">{institution?.name} সম্পর্কে</h3>
            <div className="space-y-3 text-indigo-100 text-sm">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4" /> {institution?.address || 'ঠিকানা দেওয়া হয়নি'}
              </div>
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4" /> {institution?.email}
              </div>
            </div>
            <button 
              onClick={() => window.location.href = `/public/institution/${circular.institutionId}`}
              className="w-full py-3 bg-white/20 text-white font-bold rounded-xl hover:bg-white/30 transition-all border border-white/20"
            >
              প্রতিষ্ঠানের প্রোফাইল দেখুন
            </button>
          </div>
        </div>
      </div>
      <div className="max-w-4xl mx-auto px-6 mt-12 pb-12">
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
            ধন্যবাদ, <span className="font-bold text-indigo-600">Manage My Batch</span>.
          </p>
        </div>
      </div>
    </div>
  );
}
