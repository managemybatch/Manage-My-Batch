import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Mail, 
  Phone, 
  Youtube, 
  Facebook, 
  MessageCircle, 
  ChevronDown, 
  ChevronUp,
  HelpCircle,
  ExternalLink,
  Loader2,
  BookOpen,
  FileText
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';

interface FAQ {
  id: string;
  question: string;
  answer: string;
  order: number;
  category?: string;
}

export function Help() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const q = query(collection(db, 'system_faqs'), orderBy('order', 'asc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        setFaqs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FAQ)));
      } else {
        // Fallback to translated defaults if table is empty
        const defaultFaqs = [
          { id: '1', question: t('help.faqs.q1'), answer: t('help.faqs.a1'), order: 0 },
          { id: '2', question: t('help.faqs.q2'), answer: t('help.faqs.a2'), order: 1 },
          { id: '3', question: t('help.faqs.q3'), answer: t('help.faqs.a3'), order: 2 },
          { id: '4', question: t('help.faqs.q4'), answer: t('help.faqs.a4'), order: 3 },
          { id: '5', question: t('help.faqs.q5'), answer: t('help.faqs.a5'), order: 4 }
        ];
        setFaqs(defaultFaqs);
      }
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'system_faqs');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [t]);

  const filteredFaqs = faqs.filter(faq => 
    faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
    faq.answer.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const contactInfo = [
    { icon: MessageCircle, label: "WhatsApp", value: "01301757000", color: "bg-emerald-500", link: "https://wa.me/8801301757000" },
    { icon: Mail, label: "Email", value: "managemybatch@gmail.com", color: "bg-indigo-500", link: "mailto:managemybatch@gmail.com" },
    { icon: Youtube, label: "YouTube", value: "Tutorial Channel", color: "bg-red-500", link: "https://www.youtube.com/@ManageMyBatch" },
    { icon: Facebook, label: "Facebook", value: "Official Page", color: "bg-blue-600", link: "https://www.facebook.com/profile.php?id=61575426041014" },
    { icon: BookOpen, label: t('common.resources', { defaultValue: 'রিসোর্স' }), value: t('common.knowledgeHub', { defaultValue: 'জ্ঞান কেন্দ্র' }), color: "bg-indigo-600", link: "/blog", isInternal: true },
    { icon: FileText, label: "ডকুমেন্টেশন", value: "কিভাবে ব্যবহার করবেন?", color: "bg-amber-500", link: "https://docs.google.com/document/d/1lc9cOIxt5PhfOI7F_RGsnAt9xju5xFbrDYQheQOkmMk/edit?usp=sharing", isInternal: false },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-12 pb-12">
      <div className="text-center space-y-4">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-100 dark:bg-indigo-900/40 rounded-3xl text-indigo-600 dark:text-indigo-400 mb-4">
          <HelpCircle className="w-8 h-8" />
        </div>
        <h1 className="text-4xl font-black text-gray-900 dark:text-white tracking-tight">{t('help.title')}</h1>
        <p className="text-gray-500 dark:text-gray-400 max-w-xl mx-auto">
          {t('help.subtitle')}
        </p>
      </div>

      <div className="relative max-w-2xl mx-auto">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
        <input 
          type="text"
          placeholder={t('help.searchPlaceholder')}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-12 pr-4 py-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-6">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            {t('help.faqTitle')}
          </h3>
          <div className="space-y-3">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                <Loader2 className="w-8 h-8 animate-spin mb-2" />
                <p className="text-sm">Loading FAQs...</p>
              </div>
            ) : filteredFaqs.map((faq, index) => (
              <div 
                key={faq.id}
                className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl overflow-hidden shadow-sm"
              >
                <button 
                  onClick={() => setOpenFaq(openFaq === index ? null : index)}
                  className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors"
                >
                  <span className="font-bold text-gray-900 dark:text-white text-sm">{faq.question}</span>
                  {openFaq === index ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                </button>
                <AnimatePresence>
                  {openFaq === index && (
                    <motion.div 
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="px-6 pb-4"
                    >
                      <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                        {faq.answer}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
            {filteredFaqs.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                {t('help.noResults', { query: searchQuery })}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            {t('help.contactTitle')}
          </h3>
          <div className="grid grid-cols-1 gap-4">
            {contactInfo.map((info, index) => {
              const Content = (
                <>
                  <div className={`w-12 h-12 ${info.color} rounded-xl flex items-center justify-center text-white shadow-lg shadow-gray-100 dark:shadow-none transition-transform group-hover:scale-110`}>
                    <info.icon className="w-6 h-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">{info.label}</p>
                    <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{info.value}</p>
                  </div>
                  <ExternalLink className="w-4 h-4 text-gray-300 group-hover:text-indigo-500 transition-colors" />
                </>
              );

              const className = "flex items-center gap-4 p-4 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl shadow-sm hover:shadow-md hover:border-indigo-200 dark:hover:border-indigo-800 transition-all group w-full text-left";

              if ('isInternal' in info && info.isInternal) {
                return (
                  <button 
                    key={index}
                    onClick={() => navigate(info.link)}
                    className={className}
                  >
                    {Content}
                  </button>
                );
              }

              return (
                <a 
                  key={index}
                  href={info.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={className}
                >
                  {Content}
                </a>
              );
            })}
          </div>

          <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-3xl p-6 text-white relative overflow-hidden shadow-xl shadow-indigo-100 dark:shadow-none">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
            <h4 className="text-lg font-bold mb-2">{t('help.instantHelp')}</h4>
            <p className="text-indigo-100 text-xs mb-4 opacity-90">
              {t('help.instantHelpDesc')}
            </p>
            <button 
              onClick={() => navigate('/support')}
              className="w-full py-3 bg-white text-indigo-600 rounded-xl font-bold hover:bg-indigo-50 transition-all shadow-lg flex items-center justify-center gap-2"
            >
              <MessageCircle className="w-5 h-5" /> {t('help.startChat')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
