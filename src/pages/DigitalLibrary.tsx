import React from 'react';
import { Book, ExternalLink, GraduationCap, Search, Library, Bookmark } from 'lucide-react';
import { motion } from 'motion/react';
import { useTranslation } from 'react-i18next';

interface ClassBooks {
  id: string;
  nameEn: string;
  nameBn: string;
  url: string;
  icon: any;
  color: string;
}

const PRIMARY_LINK = 'https://nctb.gov.bd/pages/static-pages/695b9b7cc4774958d7b70a12';
const SECONDARY_LINK = 'https://nctb.gov.bd/pages/static-pages/695b98afc4774958d7b7044c';

const CLASSES: ClassBooks[] = [
  { id: '1', nameEn: 'Class 1', nameBn: 'প্রথম শ্রেণী', url: PRIMARY_LINK, icon: GraduationCap, color: 'bg-rose-50 text-rose-600' },
  { id: '2', nameEn: 'Class 2', nameBn: 'দ্বিতীয় শ্রেণী', url: PRIMARY_LINK, icon: GraduationCap, color: 'bg-pink-50 text-pink-600' },
  { id: '3', nameEn: 'Class 3', nameBn: 'তৃতীয় শ্রেণী', url: PRIMARY_LINK, icon: GraduationCap, color: 'bg-fuchsia-50 text-fuchsia-600' },
  { id: '4', nameEn: 'Class 4', nameBn: 'চতুর্থ শ্রেণী', url: PRIMARY_LINK, icon: GraduationCap, color: 'bg-purple-50 text-purple-600' },
  { id: '5', nameEn: 'Class 5', nameBn: 'পঞ্চম শ্রেণী', url: PRIMARY_LINK, icon: GraduationCap, color: 'bg-indigo-50 text-indigo-600' },
  { id: '6', nameEn: 'Class 6', nameBn: 'ষষ্ঠ শ্রেণী', url: SECONDARY_LINK, icon: GraduationCap, color: 'bg-blue-50 text-blue-600' },
  { id: '7', nameEn: 'Class 7', nameBn: 'সপ্তম শ্রেণী', url: SECONDARY_LINK, icon: GraduationCap, color: 'bg-sky-50 text-sky-600' },
  { id: '8', nameEn: 'Class 8', nameBn: 'অষ্টম শ্রেণী', url: SECONDARY_LINK, icon: GraduationCap, color: 'bg-cyan-50 text-cyan-600' },
  { id: '9-10', nameEn: 'Class 9 & 10', nameBn: 'নবম ও দশম শ্রেণী', url: SECONDARY_LINK, icon: GraduationCap, color: 'bg-emerald-50 text-emerald-600' },
  { id: '11-12', nameEn: 'Class 11 & 12 (HSC)', nameBn: 'একাদশ ও দ্বাদশ শ্রেণী (HSC)', url: SECONDARY_LINK, icon: GraduationCap, color: 'bg-lime-50 text-lime-600' },
];

export function DigitalLibrary() {
  const { t, i18n } = useTranslation();
  const [searchTerm, setSearchTerm] = React.useState('');

  const filteredClasses = CLASSES.filter(c => 
    c.nameEn.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.nameBn.includes(searchTerm)
  );

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05
      }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <div className="space-y-8 pb-20">
      {/* Header Section */}
      <div className="bg-indigo-600 -mx-4 md:-mx-8 -mt-8 p-8 md:p-12 text-white relative overflow-hidden mb-12">
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-white/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
        
        <div className="max-w-5xl mx-auto relative z-10">
          <div className="flex flex-col md:flex-row items-center gap-8">
            <div className="w-24 h-24 bg-white/20 backdrop-blur-xl rounded-3xl flex items-center justify-center shadow-2xl border border-white/20">
              <Library className="w-12 h-12 text-white" />
            </div>
            <div className="text-center md:text-left">
              <h1 className="text-4xl md:text-5xl font-black tracking-tight mb-4 italic">
                {i18n.language === 'en' ? 'Digital Textbook Library' : 'ডিজিটাল পাঠ্যপুস্তক লাইব্রেরি'}
              </h1>
              <p className="text-indigo-100 text-lg font-medium max-w-2xl">
                {i18n.language === 'en' 
                  ? 'Access all official NCTB textbooks for the 2026 academic year directly from the government servers.' 
                  : '২০২৬ শিক্ষাবর্ষের সকল সরকারি এনসিটিবি পাঠ্যপুস্তক সরাসরি সরকারি সার্ভার থেকে দেখুন।'}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto space-y-10">
        {/* Search and Quick Filters */}
        <div className="flex flex-col md:flex-row gap-6 items-center justify-between">
          <div className="relative w-full md:w-96 group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-600 transition-colors w-5 h-5" />
            <input 
              type="text"
              placeholder={i18n.language === 'en' ? 'Search by class...' : 'শ্রেণী দিয়ে খুঁজুন...'}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-6 py-4 bg-white dark:bg-gray-900 border-none rounded-2xl shadow-xl shadow-indigo-100/50 dark:shadow-none focus:ring-4 focus:ring-indigo-500/10 transition-all font-medium text-gray-900 dark:text-white"
            />
          </div>
          
          <div className="flex bg-white dark:bg-gray-900 p-1.5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800">
            <button className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-black uppercase tracking-widest">
              2026 Batch
            </button>
            <button className="px-6 py-2.5 text-gray-500 hover:text-indigo-600 rounded-xl text-xs font-black uppercase tracking-widest transition-colors">
              Old Version
            </button>
          </div>
        </div>

        {/* Featured Resource Card */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-gradient-to-br from-indigo-900 to-indigo-800 rounded-[2.5rem] p-8 md:p-12 text-white relative overflow-hidden shadow-2xl shadow-indigo-200"
        >
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl -mr-32 -mt-32" />
          <div className="relative z-10 flex flex-col md:flex-row items-center gap-10">
            <div className="w-full md:w-1/3 aspect-[3/4] bg-white/10 backdrop-blur-md rounded-3xl border border-white/20 flex flex-col items-center justify-center p-8 text-center gap-4 group">
               <div className="w-20 h-20 bg-indigo-500 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                  <Bookmark className="w-10 h-10 text-white" />
               </div>
               <div>
                  <h3 className="text-xl font-black mb-1 italic">NCTB 2026</h3>
                  <p className="text-indigo-200 text-sm font-medium">Official Portal</p>
               </div>
            </div>
            <div className="md:flex-1 text-center md:text-left">
              <span className="px-4 py-1.5 bg-indigo-500/30 rounded-full text-[10px] font-black uppercase tracking-widest mb-6 inline-block border border-white/10">
                Primary Resource
              </span>
              <h2 className="text-3xl md:text-4xl font-black mb-6 tracking-tight leading-tight">
                {i18n.language === 'en' 
                  ? 'Access All 2026 Academic Textbooks Instantly' 
                  : '২০২৬ শিক্ষাবর্ষের সকল পাঠ্যপুস্তক একসাথে'}
              </h2>
              <p className="text-indigo-100 mb-10 text-lg font-medium opacity-90 leading-relaxed">
                {i18n.language === 'en'
                  ? 'We have linked the direct government repository to provide you with high-quality PDF versions of all subjects.'
                  : 'আমরা সরাসরি সরকারি রিপোজিটরি যুক্ত করেছি যাতে আপনি সব বিষয়ের হাই-কোয়ালিটি পিডিএফ ভার্সন পেতে পারেন।'}
              </p>
              <a 
                href={SECONDARY_LINK}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-3 px-10 py-5 bg-white text-indigo-600 rounded-2xl font-black uppercase tracking-widest text-sm hover:translate-x-2 transition-all shadow-xl shadow-indigo-900/20 group"
              >
                {i18n.language === 'en' ? 'Open Official Portal' : 'অফিসিয়াল পোর্টাল খুলুন'}
                <ExternalLink className="w-5 h-5 group-hover:rotate-12 transition-transform" />
              </a>
            </div>
          </div>
        </motion.div>

        {/* Classes Grid */}
        <section>
          <div className="flex items-center gap-4 mb-8">
            <h2 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight italic">
              {i18n.language === 'en' ? 'Browse by Class' : 'শ্রেণী ভিত্তিক অনুসন্ধান'}
            </h2>
            <div className="h-px flex-1 bg-gray-100 dark:bg-gray-800" />
          </div>

          <motion.div 
            variants={container}
            initial="hidden"
            animate="show"
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
          >
            {filteredClasses.map((cls) => (
              <motion.a
                key={cls.id}
                variants={item}
                href={cls.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group p-8 bg-white dark:bg-gray-900 rounded-[2.5rem] border-2 border-gray-50 dark:border-gray-800 shadow-sm hover:shadow-2xl hover:border-indigo-100 dark:hover:border-indigo-900/30 transition-all flex flex-col items-center text-center gap-6"
              >
                <div className={`w-20 h-20 ${cls.color} rounded-3xl flex items-center justify-center transition-transform group-hover:scale-110 group-hover:rotate-3`}>
                  <cls.icon className="w-10 h-10" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-gray-900 dark:text-white mb-2 group-hover:text-indigo-600 transition-colors">
                    {i18n.language === 'en' ? cls.nameEn : cls.nameBn}
                  </h3>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                    {i18n.language === 'en' ? 'Download PDF' : 'পিডিএফ ডাউনলোড'}
                  </p>
                </div>
                <div className="w-12 h-12 bg-gray-50 dark:bg-gray-800 rounded-2xl flex items-center justify-center text-gray-400 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                  <ExternalLink className="w-5 h-5" />
                </div>
              </motion.a>
            ))}
          </motion.div>
        </section>

        {/* Info Box */}
        <div className="bg-amber-50 border-2 border-amber-100 rounded-3xl p-8 flex gap-6 items-start">
           <div className="w-12 h-12 bg-amber-100 rounded-2xl flex items-center justify-center text-amber-600 flex-shrink-0">
              <Search className="w-6 h-6" />
           </div>
           <div>
              <h4 className="text-lg font-black text-amber-900 mb-2 italic">
                {i18n.language === 'en' ? 'Looking for Specific Subjects?' : 'নির্দিষ্ট বিষয় খুঁজছেন?'}
              </h4>
              <p className="text-amber-800 font-medium">
                {i18n.language === 'en' 
                  ? 'All textbooks are published online by NCTB. If a direct link is broken, please visit the official NCTB website directly for the latest mirrors.'
                  : 'সকল পাঠ্যপুস্তক এনসিটিবি দ্বারা অনলাইনে প্রকাশিত হয়। যদি কোনো লিঙ্ক কাজ না করে, সর্বশেষ সংবাদের জন্য সরাসরি এনসিটিবি ওয়েবসাইট ভিজিট করুন।'}
              </p>
           </div>
        </div>
      </div>
    </div>
  );
}
