import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { 
  Plus, Search, Filter, Download, Share2, Award, 
  QrCode, Users, Star, Layout, Palette, Image as ImageIcon,
  CheckCircle2, Loader2, Sparkles, TrendingUp, Trophy,
  Briefcase, GraduationCap, ShieldCheck, Zap, BoxIcon,
  Cake, Gift, Phone, Mail
} from 'lucide-react';
import { collection, onSnapshot, query, where, doc, getDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { useAuth } from '../lib/auth';
import { Modal } from '../components/Modal';
import { cn } from '../lib/utils';
import { QRCodeSVG } from 'qrcode.react';
import html2canvas from 'html2canvas';

interface InstitutionData {
  name: string;
  logoUrl?: string;
  primaryColor?: string;
  address?: string;
  phone?: string;
  principalName?: string;
  principalPhotoUrl?: string;
}

interface OfflineExam {
  id: string;
  title: string;
  batchName?: string;
  totalMarks?: number;
  subjects?: { name: string; totalMarks: number }[];
  studentMarks?: Record<string, Record<string, number>>;
  type: 'single' | 'school';
}

interface Student {
  id: string;
  name: string;
  rollNo: string;
  photoUrl?: string;
  batchId: string;
  dob?: string;
}

export function Marketing() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [instData, setInstData] = useState<InstitutionData | null>(null);
  const [exams, setExams] = useState<OfflineExam[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  
  const [isQRModalOpen, setIsQRModalOpen] = useState(false);
  const [isLeaderboardModalOpen, setIsLeaderboardModalOpen] = useState(false);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [isBirthdayModalOpen, setIsBirthdayModalOpen] = useState(false);
  const [isBadgeModalOpen, setIsBadgeModalOpen] = useState(false);
  
  const [selectedExamId, setSelectedExamId] = useState<string>('');
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [successStoryText, setSuccessStoryText] = useState('Brilliant Performance!');
  const [birthdayMessage, setBirthdayMessage] = useState('Wishing you a day filled with happiness and a year filled with joy. Happy Birthday!');
  const [selectedBadge, setSelectedBadge] = useState('Attendance King');
  
  const [posterColor, setPosterColor] = useState('#4f46e5');
  const [isGenerating, setIsGenerating] = useState(false);
  const [birthdayToday, setBirthdayToday] = useState<Student[]>([]);

  const qrRef = useRef<HTMLDivElement>(null);
  const leaderboardRef = useRef<HTMLDivElement>(null);
  const successStoryRef = useRef<HTMLDivElement>(null);
  const birthdayCardRef = useRef<HTMLDivElement>(null);
  const badgeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;
    const instId = user.institutionId || user.uid;

    const unsubInst = onSnapshot(doc(db, 'institutions', instId), (doc) => {
      if (doc.exists()) {
        const data = doc.data() as InstitutionData;
        setInstData(data);
        if (data.primaryColor) setPosterColor(data.primaryColor);
      }
    });

    const unsubExams = onSnapshot(
      query(collection(db, 'offline_exams'), where('institutionId', '==', instId)),
      (snapshot) => {
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as OfflineExam[];
        setExams(data.filter(e => e.studentMarks));
        setLoading(false);
      }
    );

    const unsubStudents = onSnapshot(
      query(collection(db, 'students'), where('institutionId', '==', instId)),
      (snapshot) => {
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Student[];
        setStudents(data);

        // Detect birthdays
        const today = new Date();
        const m = today.getMonth() + 1;
        const d = today.getDate();
        const bdays = data.filter(s => {
          if (!s.dob) return false;
          const dob = new Date(s.dob);
          return (dob.getMonth() + 1) === m && dob.getDate() === d;
        });
        setBirthdayToday(bdays);
      }
    );

    return () => {
      unsubInst();
      unsubExams();
      unsubStudents();
    };
  }, [user]);

  const handleDownload = async (ref: React.RefObject<HTMLDivElement | null>, filename: string) => {
    if (!ref.current) return;
    setIsGenerating(true);
    try {
      const canvas = await html2canvas(ref.current, {
        scale: 2, // High resolution but avoids memory crashes
        useCORS: true,
        allowTaint: true,
        backgroundColor: null,
        width: 1080,
        height: 1080
      });
      const link = document.createElement('a');
      link.download = `${filename}.png`;
      link.href = canvas.toDataURL('image/png');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Generation Tool Error:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleShare = async (ref: React.RefObject<HTMLDivElement | null>, title: string) => {
    if (!ref.current || !navigator.share) {
      alert('Sharing is not supported on this browser. Please download and share manually.');
      return;
    }
    
    setIsGenerating(true);
    try {
      const canvas = await html2canvas(ref.current, { scale: 2, useCORS: true, width: 1080, height: 1080 });
      const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'));
      if (!blob) return;

      const file = new File([blob], `${title}.png`, { type: 'image/png' });
      await navigator.share({
        title: title,
        files: [file]
      });
    } catch (error) {
      console.error('Sharing Error:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const getLeaderboardData = () => {
    const exam = exams.find(e => e.id === selectedExamId);
    if (!exam || !exam.studentMarks) return [];

    const results = Object.entries(exam.studentMarks).map(([studentId, marks]) => {
      const student = students.find(s => s.id === studentId);
      let totalObtained = 0;
      let totalPossible = 0;

      if (exam.type === 'single') {
        totalObtained = marks['total'] || 0;
        totalPossible = exam.totalMarks || 100;
      } else {
        exam.subjects?.forEach(s => {
          totalObtained += marks[s.name] || 0;
          totalPossible += s.totalMarks;
        });
      }

      return {
        id: studentId,
        name: student?.name || 'Unknown',
        photoUrl: student?.photoUrl,
        rollNo: student?.rollNo,
        score: totalObtained,
        percentage: (totalObtained / totalPossible) * 100
      };
    });

    return results.sort((a, b) => b.score - a.score).slice(0, 5);
  };

  const publicUrl = `https://ais-pre-ds7hprbiuy2m2j7657lbun-813092330471.asia-southeast1.run.app/public/institution/${user?.institutionId || user?.uid}`;
  const admissionUrl = `https://ais-pre-ds7hprbiuy2m2j7657lbun-813092330471.asia-southeast1.run.app/public/admission/${user?.institutionId || user?.uid}`;

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">{t('marketing.title')}</h1>
          <p className="text-gray-500 mt-1">{t('marketing.subtitle')}</p>
        </div>
      </div>

      {birthdayToday.length > 0 && (
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-pink-500 to-rose-600 p-1 rounded-3xl shadow-xl shadow-pink-100"
        >
          <div className="bg-white/10 backdrop-blur-sm p-6 rounded-[22px] flex flex-col md:flex-row items-center justify-between gap-6 text-white">
            <div className="flex items-center gap-5">
              <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center animate-bounce">
                <Cake className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-2xl font-black italic tracking-tight">{birthdayToday.length} Birthdays Today! 🎂</h3>
                <p className="text-pink-50 font-medium">Celebrate your students and share branded birthday cards on social media.</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {birthdayToday.map(s => (
                <button
                  key={s.id}
                  onClick={() => {
                    setSelectedStudentId(s.id);
                    setIsBirthdayModalOpen(true);
                  }}
                  className="px-5 py-2.5 bg-white text-pink-600 rounded-xl font-bold text-sm hover:scale-105 transition-all shadow-lg"
                >
                  Create for {s.name.split(' ')[0]}
                </button>
              ))}
            </div>
          </div>
        </motion.div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* QR Poster Card */}
        <motion.div 
          whileHover={{ y: -4 }}
          className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm hover:shadow-xl transition-all group overflow-hidden relative"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-full -mr-16 -mt-16 group-hover:bg-indigo-100 transition-colors" />
          <QrCode className="w-12 h-12 text-indigo-600 mb-6 relative" />
          <h2 className="text-2xl font-bold text-gray-900 relative">{t('marketing.qrPoster.title')}</h2>
          <p className="text-gray-500 mt-2 relative">{t('marketing.qrPoster.desc')}</p>
          
          <button 
            onClick={() => setIsQRModalOpen(true)}
            className="mt-8 w-full py-4 bg-gray-900 text-white rounded-2xl font-bold hover:bg-black transition-all flex items-center justify-center gap-2 group"
          >
            {t('marketing.qrPoster.generate')}
            <Sparkles className="w-5 h-5 text-indigo-400 group-hover:animate-pulse" />
          </button>
        </motion.div>

        {/* Leaderboard Card */}
        <motion.div 
          whileHover={{ y: -4 }}
          className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm hover:shadow-xl transition-all group overflow-hidden relative"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-50 rounded-full -mr-16 -mt-16 group-hover:bg-amber-100 transition-colors" />
          <Trophy className="w-12 h-12 text-amber-600 mb-6 relative" />
          <h2 className="text-2xl font-bold text-gray-900 relative">{t('marketing.leaderboard.title')}</h2>
          <p className="text-gray-500 mt-2 relative">{t('marketing.leaderboard.desc')}</p>
          
          <button 
            onClick={() => setIsLeaderboardModalOpen(true)}
            className="mt-8 w-full py-4 bg-gray-900 text-white rounded-2xl font-bold hover:bg-black transition-all flex items-center justify-center gap-2 group"
          >
            {t('marketing.leaderboard.generate')}
            <Award className="w-5 h-5 text-amber-400 group-hover:animate-pulse" />
          </button>
        </motion.div>

        {/* Success Story Card */}
        <motion.div 
          whileHover={{ y: -4 }}
          className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm hover:shadow-xl transition-all group overflow-hidden relative"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50 rounded-full -mr-16 -mt-16 group-hover:bg-emerald-100 transition-colors" />
          <Star className="w-12 h-12 text-emerald-600 mb-6 relative" />
          <h2 className="text-2xl font-bold text-gray-900 relative">{t('marketing.successStory.title')}</h2>
          <p className="text-gray-500 mt-2 relative">{t('marketing.successStory.desc')}</p>
          
          <button 
            onClick={() => setIsSuccessModalOpen(true)}
            className="mt-8 w-full py-4 bg-gray-900 text-white rounded-2xl font-bold hover:bg-black transition-all flex items-center justify-center gap-2 group"
          >
            {t('marketing.successStory.generate')}
            <Sparkles className="w-5 h-5 text-emerald-400 group-hover:animate-pulse" />
          </button>
        </motion.div>

        {/* Birthday Card Card */}
        <motion.div 
          whileHover={{ y: -4 }}
          className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm hover:shadow-xl transition-all group overflow-hidden relative"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-pink-50 rounded-full -mr-16 -mt-16 group-hover:bg-pink-100 transition-colors" />
          <GraduationCap className="w-12 h-12 text-pink-600 mb-6 relative" />
          <h2 className="text-2xl font-bold text-gray-900 relative">{t('marketing.birthday.title')}</h2>
          <p className="text-gray-500 mt-2 relative">{t('marketing.birthday.desc')}</p>
          
          <button 
            onClick={() => setIsBirthdayModalOpen(true)}
            className="mt-8 w-full py-4 bg-gray-900 text-white rounded-2xl font-bold hover:bg-black transition-all flex items-center justify-center gap-2 group"
          >
            {t('marketing.birthday.generate')}
            <Palette className="w-5 h-5 text-pink-400 group-hover:animate-pulse" />
          </button>
        </motion.div>

        {/* Badges Card */}
        <motion.div 
          whileHover={{ y: -4 }}
          className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm hover:shadow-xl transition-all group overflow-hidden relative"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-full -mr-16 -mt-16 group-hover:bg-blue-100 transition-colors" />
          <Award className="w-12 h-12 text-blue-600 mb-6 relative" />
          <h2 className="text-2xl font-bold text-gray-900 relative">{t('marketing.badges.title')}</h2>
          <p className="text-gray-500 mt-2 relative">{t('marketing.badges.desc')}</p>
          
          <button 
            onClick={() => setIsBadgeModalOpen(true)}
            className="mt-8 w-full py-4 bg-gray-900 text-white rounded-2xl font-bold hover:bg-black transition-all flex items-center justify-center gap-2 group"
          >
            {t('marketing.badges.generate')}
            <TrendingUp className="w-5 h-5 text-blue-400 group-hover:animate-pulse" />
          </button>
        </motion.div>
      </div>

      {/* QR Poster Modal */}
      <Modal isOpen={isQRModalOpen} onClose={() => setIsQRModalOpen(false)} title="Generate QR Poster" maxWidth="max-w-5xl">
        <div className="flex flex-col lg:flex-row gap-8 py-4">
          <div className="lg:w-1/3 space-y-6">
            <div className="space-y-3">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Poster Color</label>
              <div className="flex flex-wrap gap-3">
                {['#4f46e5', '#0891b2', '#059669', '#d97706', '#be185d', '#111827'].map(c => (
                  <button
                    key={c}
                    onClick={() => setPosterColor(c)}
                    className={cn(
                      "w-10 h-10 rounded-full border-4 transition-all",
                      posterColor === c ? "border-white ring-2 ring-gray-900 scale-110" : "border-transparent opacity-60 hover:opacity-100"
                    )}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
            
            <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100">
               <p className="text-sm text-blue-700 leading-relaxed font-medium">
                Tip: Place this poster near your enrollment desk. Parents can scan to enroll their kids directly or check for existing fee statuses.
               </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button 
                onClick={() => handleDownload(qrRef, 'QR_Poster')}
                disabled={isGenerating}
                className="flex-1 py-4 bg-gray-900 text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-gray-800 disabled:opacity-50"
              >
                {isGenerating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
                {t('marketing.social.download')}
              </button>
              <button 
                onClick={() => handleShare(qrRef, 'QR Poster')}
                disabled={isGenerating}
                className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-indigo-700 disabled:opacity-50"
              >
                <Share2 className="w-5 h-5" />
                {t('Share')}
              </button>
            </div>
          </div>

          <div className="lg:w-2/3 flex justify-center bg-gray-50 p-8 rounded-[40px] border-2 border-dashed border-gray-200 overflow-hidden min-h-[600px] items-center">
            <div className="relative origin-center scale-[0.4] md:scale-[0.5] lg:scale-[0.6] xl:scale-[0.7] flex-shrink-0">
              <div className="bg-white p-3 shadow-2xl rounded-[40px]">
                <div 
                  ref={qrRef}
                  className="w-[1080px] h-[1080px] bg-white relative overflow-hidden flex flex-col items-center p-12"
                  style={{ backgroundColor: posterColor }}
                >
                  <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 10px 10px, white 1px, transparent 0)', backgroundSize: '40px 40px' }} />
                  
                  <div className="w-full h-full bg-white/95 backdrop-blur rounded-[60px] p-8 flex flex-col items-center justify-between relative z-10 shadow-xl border border-white/20">
                      <div className="flex flex-col items-center gap-4 w-full text-center">
                      {instData?.logoUrl && (
                        <img src={instData.logoUrl} className="h-28 object-contain" referrerPolicy="no-referrer" />
                      )}
                      <div className="space-y-1 max-w-[900px]">
                        <h1 className="text-5xl font-black text-gray-900 tracking-tight leading-tight uppercase line-clamp-2">
                          {instData?.name || 'Your Coaching Name'}
                        </h1>
                        <p className="text-xl text-gray-400 font-bold line-clamp-1 italic tracking-wide">
                          {instData?.address || 'Your Address Here'}
                        </p>
                      </div>
                    </div>

                    <div className="flex-1 flex items-center justify-center w-full px-8 gap-16">
                      <div className="flex flex-col items-center gap-4 group">
                        <div className="p-4 bg-white rounded-[40px] shadow-2xl border-8 transform group-hover:scale-105 transition-transform" style={{ borderColor: posterColor }}>
                          <QRCodeSVG value={admissionUrl} size={240} level="H" includeMargin={true} />
                        </div>
                        <div className="text-center space-y-1">
                           <p className="text-4xl font-black text-gray-900">অনলাইন ভর্তি</p>
                           <p className="text-xl text-gray-400 font-bold uppercase tracking-[0.2em] mt-1">Enroll Now</p>
                        </div>
                      </div>

                      <div className="flex flex-col items-center gap-4 group">
                        <div className="p-4 bg-white rounded-[40px] shadow-2xl border-8 transform group-hover:scale-105 transition-transform" style={{ borderColor: posterColor }}>
                          <QRCodeSVG value={publicUrl} size={240} level="H" includeMargin={true} />
                        </div>
                        <div className="text-center space-y-1">
                           <p className="text-4xl font-black text-gray-900">ফি ও তথ্যাদি</p>
                           <p className="text-xl text-gray-400 font-bold uppercase tracking-[0.2em] mt-1">Fees & Info</p>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between w-full border-t border-gray-100 pt-8 mt-4 px-4">
                       <div className="flex items-center gap-3 px-8 py-3 bg-gray-50 rounded-[25px] border border-gray-100 italic">
                          <Phone className="w-6 h-6 text-gray-400" />
                          <p className="text-2xl text-gray-600 font-black tracking-tight">{instData?.phone || 'Contact Number'}</p>
                       </div>
                       <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest italic leading-none">Powered by</p>
                            <p className="text-xl font-black text-indigo-600 tracking-tighter leading-none mt-1.5">Manage My Batch</p>
                          </div>
                          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-200">
                             <TrendingUp className="w-6 h-6" />
                          </div>
                       </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Modal>

      {/* Leaderboard Modal */}
      <Modal isOpen={isLeaderboardModalOpen} onClose={() => setIsLeaderboardModalOpen(false)} title="Generate Leaderboard Poster" maxWidth="max-w-5xl">
        <div className="flex flex-col lg:flex-row gap-8 py-4">
          <div className="lg:w-1/3 space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Select Exam</label>
              <select 
                value={selectedExamId}
                onChange={e => setSelectedExamId(e.target.value)}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20"
              >
                <option value="">Select an exam...</option>
                {exams.map(e => <option key={e.id} value={e.id}>{e.title} ({e.batchName})</option>)}
              </select>
            </div>

            <div className="space-y-3">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Accent Color</label>
              <div className="flex flex-wrap gap-3">
                {['#d97706', '#be123c', '#4338ca', '#15803d', '#111827'].map(c => (
                  <button
                    key={c}
                    onClick={() => setPosterColor(c)}
                    className={cn(
                      "w-10 h-10 rounded-full border-4 transition-all",
                      posterColor === c ? "border-white ring-2 ring-gray-900 scale-110" : "border-transparent opacity-60 hover:opacity-100"
                    )}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button 
                onClick={() => handleDownload(leaderboardRef, `Leaderboard_${selectedExamId}`)}
                disabled={isGenerating || !selectedExamId}
                className="flex-1 py-4 bg-gray-900 text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-gray-800 disabled:opacity-50"
              >
                {isGenerating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
                {t('marketing.social.download')}
              </button>
              <button 
                onClick={() => handleShare(leaderboardRef, 'Leaderboard')}
                disabled={isGenerating || !selectedExamId}
                className="flex-1 py-4 bg-amber-600 text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-amber-700 disabled:opacity-50"
              >
                <Share2 className="w-5 h-5" />
                {t('Share')}
              </button>
            </div>
          </div>

          <div className="lg:w-2/3 flex justify-center bg-gray-50 p-8 rounded-[40px] border-2 border-dashed border-gray-200 overflow-hidden min-h-[600px] items-center">
            {selectedExamId ? (
              <div className="relative origin-center scale-[0.4] md:scale-[0.5] lg:scale-[0.6] flex-shrink-0">
                <div className="bg-white p-3 shadow-2xl rounded-[40px]">
                  <div 
                    ref={leaderboardRef}
                    className="w-[1080px] h-[1080px] bg-white relative overflow-hidden flex flex-col p-8"
                    style={{ backgroundColor: posterColor }}
                  >
                    {/* Visual Elements */}
                    <div className="absolute top-0 right-0 w-80 h-80 bg-white/20 rounded-full blur-3xl -mr-40 -mt-40 animate-pulse" />
                    <div className="absolute bottom-0 left-0 w-80 h-80 bg-white/20 rounded-full blur-3xl -ml-40 -mb-40 animate-pulse" />
                    
                    <div className="bg-white/95 backdrop-blur rounded-[60px] p-10 flex flex-col h-full shadow-2xl border border-white/30">
                      <div className="flex items-center justify-between mb-8">
                         {instData?.logoUrl && <img src={instData.logoUrl} className="h-16 object-contain" referrerPolicy="no-referrer" />}
                         <div className="text-right">
                           <h2 className="text-xl font-black text-gray-900 tracking-tight leading-none uppercase">{instData?.name}</h2>
                           <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">Top Performer Hall of Fame</p>
                         </div>
                      </div>

                      <div className="text-center mb-8 space-y-2">
                        <div className="inline-flex items-center gap-2 px-5 py-2 bg-amber-100 text-amber-700 rounded-full mb-2">
                           <Award className="w-5 h-5" />
                           <span className="text-sm font-black uppercase tracking-[0.2em]">Champions of {exams.find(e => e.id === selectedExamId)?.title}</span>
                        </div>
                        <h1 className="text-6xl font-black text-gray-900 tracking-tighter italic uppercase">HALL OF FAME</h1>
                        <div className="h-1.5 w-32 bg-amber-400 mx-auto rounded-full" />
                      </div>

                      <div className="flex-1 flex flex-col gap-4 justify-center">
                        {getLeaderboardData().map((student, idx) => (
                          <div 
                            key={student.id} 
                            className={cn(
                              "flex items-center gap-6 p-5 rounded-[32px] border-2 transition-all relative overflow-hidden",
                              idx === 0 ? "bg-amber-50 border-amber-200 scale-105 shadow-xl" : "bg-gray-50 border-transparent"
                            )}
                          >
                             {idx === 0 && <div className="absolute top-0 right-0 px-4 py-1.5 bg-amber-400 text-white rounded-bl-2xl font-black text-sm uppercase italic tracking-widest">RANK #1</div>}
                             <div className="text-3xl font-black text-gray-300 w-10 text-center italic">{idx + 1}</div>
                             <div className="relative">
                                <div className="w-20 h-20 rounded-full overflow-hidden border-4 border-white shadow-lg bg-gray-100">
                                   <img 
                                     src={student.photoUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${student.name}`} 
                                     className="w-full h-full object-cover"
                                     referrerPolicy="no-referrer"
                                   />
                                </div>
                                {idx < 3 && (
                                   <div className={cn(
                                     "absolute -bottom-1 -right-1 w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold shadow-lg border-2 border-white",
                                     idx === 0 ? "bg-amber-400" : idx === 1 ? "bg-gray-400" : "bg-orange-400"
                                   )}>
                                     <Star className="w-4 h-4 fill-current" />
                                   </div>
                                )}
                             </div>
                             <div className="flex-1">
                                <h3 className="text-3xl font-black text-gray-900 uppercase tracking-tighter line-clamp-1">{student.name}</h3>
                                <p className="text-sm text-gray-400 font-bold uppercase tracking-wider">Roll: #{student.rollNo}</p>
                             </div>
                             <div className="text-right">
                               <div className="text-4xl font-black text-gray-900 italic tracking-tighter leading-none">{student.score.toFixed(0)}</div>
                               <div className="text-[10px] font-bold text-gray-400 uppercase mt-1 tracking-widest">Score</div>
                             </div>
                          </div>
                        ))}
                      </div>

                      <div className="mt-8 flex items-center justify-between border-t border-gray-100 pt-8">
                         <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-200">
                               <TrendingUp className="w-6 h-6" />
                            </div>
                            <div className="text-right">
                              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest italic leading-none text-left">Proudly Powered by</p>
                              <p className="text-lg font-black text-indigo-600 tracking-tighter leading-none mt-1">Manage My Batch</p>
                            </div>
                         </div>
                         <div className="flex items-center gap-4">
                            <div className="text-right">
                               <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none">Online Portal</p>
                               <p className="text-xs font-bold text-indigo-600 mt-1 uppercase">Scan to Enroll</p>
                            </div>
                            <div className="p-1 bg-white rounded-lg border border-gray-100 shadow-sm">
                              <QRCodeSVG value={admissionUrl} size={64} />
                            </div>
                         </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center text-center py-20 px-8">
                <ImageIcon className="w-20 h-20 text-gray-100 mb-6" />
                <h3 className="text-xl font-bold text-gray-400 tracking-tight">Select an exam to preview the Poster</h3>
                <p className="text-gray-400 max-w-xs mt-2 text-sm font-medium">We'll automatically fetch the top 5 students from the selected exam results.</p>
              </div>
            )}
          </div>
        </div>
      </Modal>

      {/* Success Story Modal */}
      <Modal isOpen={isSuccessModalOpen} onClose={() => setIsSuccessModalOpen(false)} title={t('marketing.successStory.title')} maxWidth="max-w-5xl">
        <div className="flex flex-col lg:flex-row gap-8 py-4">
          <div className="lg:w-1/3 space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">{t('marketing.successStory.selectStudent')}</label>
              <select 
                value={selectedStudentId}
                onChange={e => setSelectedStudentId(e.target.value)}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              >
                <option value="">Select a student...</option>
                {students.map(s => <option key={s.id} value={s.id}>{s.name} ({s.rollNo})</option>)}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Achievement Message</label>
              <input 
                type="text"
                value={successStoryText}
                onChange={e => setSuccessStoryText(e.target.value)}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                placeholder="e.g. Brilliant Performance!"
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button 
                onClick={() => handleDownload(successStoryRef, `Success_${selectedStudentId}`)}
                disabled={isGenerating || !selectedStudentId}
                className="flex-1 py-4 bg-emerald-600 text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-emerald-700 disabled:opacity-50"
              >
                {isGenerating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
                {t('marketing.social.download')}
              </button>
              <button 
                onClick={() => handleShare(successStoryRef, 'Success Story')}
                disabled={isGenerating || !selectedStudentId}
                className="flex-1 py-4 bg-emerald-800 text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-emerald-900 disabled:opacity-50"
              >
                <Share2 className="w-5 h-5" />
                {t('Share')}
              </button>
            </div>
          </div>

          <div className="lg:w-2/3 flex justify-center bg-gray-50 p-8 rounded-[40px] border-2 border-dashed border-gray-200 overflow-hidden min-h-[600px] items-center text-center">
            {selectedStudentId ? (
              <div className="relative origin-center scale-[0.4] md:scale-[0.5] lg:scale-[0.6] flex-shrink-0">
                <div className="bg-white p-3 shadow-2xl rounded-[40px]">
                  <div 
                    ref={successStoryRef}
                    className="w-[1080px] h-[1080px] bg-white relative overflow-hidden flex flex-col p-12 items-center justify-center text-center"
                  >
                    <div className="absolute inset-0 bg-emerald-600" />
                    <div className="absolute inset-4 bg-white rounded-[40px] shadow-2xl flex flex-col items-center p-16 overflow-hidden">
                      <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-50 rounded-full -mr-32 -mt-32" />
                      <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-50 rounded-full -ml-32 -mb-32" />

                      {instData?.logoUrl && <img src={instData.logoUrl} className="h-24 object-contain mb-8 relative z-10" referrerPolicy="no-referrer" />}
                      
                      <div className="relative z-10 mb-8">
                        <div className="w-64 h-64 rounded-full border-8 border-emerald-100 p-2 shadow-xl bg-white overflow-hidden">
                          <img 
                            src={students.find(s => s.id === selectedStudentId)?.photoUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${students.find(s => s.id === selectedStudentId)?.name}`} 
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                        <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 bg-emerald-600 text-white px-8 py-2 rounded-full font-black text-2xl shadow-lg">
                          CONGRATS!
                        </div>
                      </div>

                      <h1 className="text-7xl font-black text-gray-900 tracking-tighter mb-4 relative z-10 uppercase leading-none">
                        {students.find(s => s.id === selectedStudentId)?.name}
                      </h1>
                      
                      <div className="h-2 w-32 bg-emerald-600 rounded-full mb-10" />
                      
                      <p className="text-5xl font-black text-emerald-600 italic tracking-tight mb-16 relative z-10 leading-[1.1] max-w-[800px]">
                        "{successStoryText}"
                      </p>

                      <div className="mt-auto flex flex-col items-center gap-8 relative z-10 w-full px-4">
                        <div className="h-px w-full bg-gray-100" />
                        <div className="flex items-center justify-between w-full text-left">
                          <div>
                            <p className="text-3xl font-black text-gray-900 uppercase tracking-tighter leading-none">{instData?.name}</p>
                            <p className="text-sm font-bold text-gray-400 mt-2">{instData?.address}</p>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest italic leading-none">Manage My Batch</p>
                              <p className="text-2xl font-black text-indigo-600 tracking-tighter leading-none mt-2">Marketing Partner</p>
                            </div>
                            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-200">
                               <TrendingUp className="w-6 h-6" />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center text-center py-20">
                <ImageIcon className="w-16 h-16 text-gray-200 mb-4" />
                <p className="text-gray-400 font-medium">Select a student to preview success story</p>
              </div>
            )}
          </div>
        </div>
      </Modal>

      {/* Birthday Modal */}
      <Modal isOpen={isBirthdayModalOpen} onClose={() => setIsBirthdayModalOpen(false)} title={t('marketing.birthday.title')} maxWidth="max-w-5xl">
        <div className="flex flex-col lg:flex-row gap-8 py-4">
          <div className="lg:w-1/3 space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Select Birthday Star</label>
              <select 
                value={selectedStudentId}
                onChange={e => setSelectedStudentId(e.target.value)}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-pink-500/20"
              >
                <option value="">Select a student...</option>
                {students.map(s => <option key={s.id} value={s.id}>{s.name} ({s.rollNo})</option>)}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Birthday Message</label>
              <textarea 
                rows={4}
                value={birthdayMessage}
                onChange={e => setBirthdayMessage(e.target.value)}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-pink-500/20 resize-none"
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button 
                onClick={() => handleDownload(birthdayCardRef, `Birthday_${selectedStudentId}`)}
                disabled={isGenerating || !selectedStudentId}
                className="flex-1 py-4 bg-pink-600 text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-pink-700 disabled:opacity-50"
              >
                {isGenerating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
                {t('marketing.social.download')}
              </button>
              <button 
                onClick={() => handleShare(birthdayCardRef, 'Birthday Wish')}
                disabled={isGenerating || !selectedStudentId}
                className="flex-1 py-4 bg-rose-500 text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-rose-600 disabled:opacity-50"
              >
                <Share2 className="w-5 h-5" />
                {t('Share')}
              </button>
            </div>
          </div>

          <div className="lg:w-2/3 flex justify-center bg-gray-50 p-8 rounded-[40px] border-2 border-dashed border-gray-200 overflow-hidden min-h-[600px] items-center text-center">
            {selectedStudentId ? (
              <div className="relative origin-center scale-[0.35] md:scale-[0.45] lg:scale-[0.55] flex-shrink-0">
                <div className="bg-white p-3 shadow-2xl rounded-[40px]">
                  <div 
                    ref={birthdayCardRef}
                    className="w-[1080px] h-[1080px] bg-white relative overflow-hidden flex flex-col p-12 items-center justify-center text-center"
                  >
                    <div className="absolute inset-0 bg-pink-500" />
                    <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 20px 20px, white 2px, transparent 0)', backgroundSize: '60px 60px' }} />
                    
                    <div className="absolute inset-4 bg-white rounded-[40px] shadow-2xl flex flex-col items-center p-16 overflow-hidden">
                      <div className="absolute top-0 right-0 w-80 h-80 bg-pink-50 rounded-full -mr-40 -mt-40" />
                      <div className="absolute bottom-0 left-0 w-80 h-80 bg-pink-50 rounded-full -ml-40 -mb-40" />

                      <Sparkles className="w-16 h-16 text-pink-500 mb-6 animate-bounce" />
                      
                      <h1 className="text-7xl font-black text-pink-600 tracking-tighter mb-8 uppercase italic">Happy Birthday!</h1>

                      <div className="relative mb-12">
                        <div className="w-72 h-72 rounded-[60px] border-8 border-pink-100 p-2 shadow-2xl bg-white rotate-3 overflow-hidden">
                          <img 
                            src={students.find(s => s.id === selectedStudentId)?.photoUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${students.find(s => s.id === selectedStudentId)?.name}`} 
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                        <div className="absolute -top-6 -right-6 w-20 h-20 bg-amber-400 rounded-full flex items-center justify-center shadow-lg -rotate-12 border-4 border-white">
                          <Star className="w-10 h-10 text-white fill-current" />
                        </div>
                      </div>

                      <h2 className="text-6xl font-black text-gray-900 mb-6 uppercase tracking-tight">
                        {students.find(s => s.id === selectedStudentId)?.name}
                      </h2>
                      
                      <p className="text-4xl text-gray-500 font-bold max-w-2xl leading-relaxed mb-12">
                        {birthdayMessage}
                      </p>

                      <div className="mt-auto flex flex-col items-center gap-8 relative z-10 w-full">
                        <div className="h-px w-full bg-gray-100" />
                        <div className="flex items-center justify-between w-full px-4">
                          <div className="flex items-center gap-4">
                            {instData?.logoUrl && <img src={instData.logoUrl} className="h-16 object-contain" referrerPolicy="no-referrer" />}
                            <div className="text-left">
                              <p className="text-2xl font-black text-gray-900 uppercase tracking-tighter leading-none">{instData?.name}</p>
                              <p className="text-sm font-bold text-pink-500 uppercase tracking-widest mt-1">Birthday Wishes</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest italic leading-none">Powered by</p>
                              <p className="text-2xl font-black text-indigo-600 tracking-tighter leading-none mt-2">Manage My Batch</p>
                            </div>
                            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-200">
                               <TrendingUp className="w-6 h-6" />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center text-center py-20">
                <ImageIcon className="w-16 h-16 text-gray-200 mb-4" />
                <p className="text-gray-400 font-medium">Select a student to preview birthday card</p>
              </div>
            )}
          </div>
        </div>
      </Modal>

      {/* Badges Modal */}
      <Modal isOpen={isBadgeModalOpen} onClose={() => setIsBadgeModalOpen(false)} title={t('marketing.badges.title')} maxWidth="max-w-5xl">
        <div className="flex flex-col lg:flex-row gap-8 py-4">
          <div className="lg:w-1/3 space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Select Student</label>
              <select 
                value={selectedStudentId}
                onChange={e => setSelectedStudentId(e.target.value)}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="">Select a student...</option>
                {students.map(s => <option key={s.id} value={s.id}>{s.name} ({s.rollNo})</option>)}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Select Badge</label>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { id: 'Attendance King', icon: CheckCircle2, color: 'text-blue-600', bg: 'bg-blue-50' },
                  { id: 'Math Master', icon: Sparkles, color: 'text-purple-600', bg: 'bg-purple-50' },
                  { id: 'Top Scorer', icon: Trophy, color: 'text-amber-600', bg: 'bg-amber-50' },
                  { id: 'Most Disciplined', icon: ShieldCheck, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                  { id: 'Rapid Learner', icon: Zap, color: 'text-orange-600', bg: 'bg-orange-50' },
                  { id: 'Future Leader', icon: Users, color: 'text-indigo-600', bg: 'bg-indigo-50' }
                ].map(badge => (
                  <button
                    key={badge.id}
                    onClick={() => setSelectedBadge(badge.id)}
                    className={cn(
                      "flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all",
                      selectedBadge === badge.id ? "bg-white border-blue-600 shadow-md scale-105" : "bg-gray-50 border-transparent opacity-60 hover:opacity-100"
                    )}
                  >
                    <badge.icon className={cn("w-8 h-8", badge.color)} />
                    <span className="text-[10px] font-bold text-gray-900 uppercase text-center">{badge.id}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button 
                onClick={() => handleDownload(badgeRef, `Badge_${selectedBadge}_${selectedStudentId}`)}
                disabled={isGenerating || !selectedStudentId}
                className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-blue-700 disabled:opacity-50"
              >
                {isGenerating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
                {t('marketing.social.download')}
              </button>
              <button 
                onClick={() => handleShare(badgeRef, 'Achievement Badge')}
                disabled={isGenerating || !selectedStudentId}
                className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-indigo-700 disabled:opacity-50"
              >
                <Share2 className="w-5 h-5" />
                {t('Share')}
              </button>
            </div>
          </div>

          <div className="lg:w-2/3 flex justify-center bg-gray-50 p-8 rounded-[40px] border-2 border-dashed border-gray-200 overflow-hidden min-h-[600px] items-center text-center">
            {selectedStudentId ? (
              <div className="relative origin-center scale-[0.4] md:scale-[0.5] lg:scale-[0.6] flex-shrink-0">
                <div className="bg-white p-3 shadow-2xl rounded-[40px]">
                  <div 
                    ref={badgeRef}
                    className="w-[1080px] h-[1080px] bg-white relative overflow-hidden flex flex-col p-12 items-center justify-center text-center"
                  >
                    <div className="absolute inset-0 bg-blue-600" />
                    <div className="absolute inset-4 bg-white rounded-[40px] shadow-2xl flex flex-col items-center p-16 animate-in fade-in zoom-in duration-500">
                      <div className="absolute top-0 right-0 w-80 h-80 bg-blue-50 rounded-full -mr-40 -mt-40" />
                      <div className="absolute bottom-0 left-0 w-80 h-80 bg-blue-50 rounded-full -ml-40 -mb-40" />

                      <div className="w-48 h-48 bg-blue-50 rounded-full flex items-center justify-center mb-10 relative z-10 border-4 border-blue-200 shadow-inner">
                        {(() => {
                           const iconMap: Record<string, any> = {
                              'Attendance King': CheckCircle2,
                              'Math Master': Sparkles,
                              'Top Scorer': Trophy,
                              'Most Disciplined': ShieldCheck,
                              'Rapid Learner': Zap,
                              'Future Leader': Users
                            };
                            const Icon = iconMap[selectedBadge] || Award;
                          return <Icon className="w-24 h-24 text-blue-600" />;
                        })()}
                      </div>
                      
                      <h1 className="text-4xl font-bold text-blue-600 uppercase tracking-[0.3em] mb-4 relative z-10">Achievement Unlocked</h1>
                      <h2 className="text-7xl font-black text-gray-900 mb-10 uppercase tracking-tighter relative z-10 line-clamp-1">{selectedBadge}</h2>

                      <div className="relative mb-12">
                        <div className="w-64 h-64 rounded-full border-8 border-blue-100 p-2 shadow-xl bg-white overflow-hidden">
                          <img 
                            src={students.find(s => s.id === selectedStudentId)?.photoUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${students.find(s => s.id === selectedStudentId)?.name}`} 
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                        <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 bg-blue-600 text-white px-8 py-2 rounded-full font-black text-2xl shadow-lg border-4 border-white">
                          HONORED!
                        </div>
                      </div>

                      <h3 className="text-5xl font-black text-gray-900 mb-4 uppercase tracking-tight">
                        {students.find(s => s.id === selectedStudentId)?.name}
                      </h3>
                      <p className="text-2xl text-gray-400 font-bold uppercase tracking-widest mb-12">Excellence in Performance</p>

                      <div className="mt-auto flex flex-col items-center gap-8 relative z-10 w-full px-4">
                        <div className="h-px w-full bg-gray-100" />
                        <div className="flex items-center justify-between w-full text-left">
                          <div className="flex items-center gap-4">
                            {instData?.logoUrl && <img src={instData.logoUrl} className="h-16 object-contain" referrerPolicy="no-referrer" />}
                            <div>
                                <p className="text-3xl font-black text-gray-900 uppercase tracking-tighter leading-none">{instData?.name}</p>
                                <p className="text-sm font-bold text-gray-400 mt-2">{instData?.address}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest italic leading-none text-left">Partnered with</p>
                              <p className="text-2xl font-black text-indigo-600 tracking-tighter leading-none mt-2">Manage My Batch</p>
                            </div>
                            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-200">
                               <TrendingUp className="w-6 h-6" />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center text-center py-20 px-8">
                <ImageIcon className="w-20 h-20 text-gray-200 mb-6" />
                <h3 className="text-xl font-bold text-gray-400 tracking-tight">Select a student to preview Achievement Badge</h3>
                <p className="text-gray-400 max-w-xs mt-2 text-sm font-medium">Honor students with digital achievement badges.</p>
              </div>
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
}
