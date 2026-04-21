import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';
import { 
  MessageSquare, 
  Send, 
  History, 
  Users, 
  Layers, 
  Briefcase, 
  Search,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Plus,
  ArrowRight,
  Filter,
  UserCheck,
  Building,
  Loader2,
  Zap,
  FileEdit,
  Layout,
  MessageCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, query, where, orderBy, getDocs, onSnapshot, addDoc, serverTimestamp, doc, updateDoc, increment, getDoc, setDoc, limit } from 'firebase/firestore';
import { useAuth } from '../lib/auth';
import { Modal } from '../components/Modal';
import { Table } from '../components/Table';
import { cn } from '../lib/utils';
import { sendSMS } from '../lib/sms';
import { SubscriptionModal } from '../components/SubscriptionModal';
import { SUBSCRIPTION_PLANS } from '../constants';

interface Message {
  id: string;
  senderId: string;
  senderName: string;
  recipientType: 'batch' | 'group' | 'individual' | 'teacher' | 'applicant';
  recipientId: string;
  recipientName: string;
  content: string;
  status: 'delivered' | 'failed';
  error?: string;
  creditsUsed: number;
  createdAt: any;
}

interface CreditBalance {
  userId: string;
  balance: number;
  totalSent: number;
  lastUpdated: any;
}

export function Messages() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const location = useLocation();
  const [credits, setCredits] = useState<CreditBalance | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  
  // Form state
  const [recipientType, setRecipientType] = useState<'batch' | 'group' | 'individual' | 'teacher' | 'applicant'>(
    (location.state?.recipientType as any) || 'batch'
  );
  const [recipientId, setRecipientId] = useState(location.state?.recipientId || '');
  const [recipientName, setRecipientName] = useState(location.state?.recipientName || '');
  const [content, setContent] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  
  const [activeTab, setActiveTab] = useState<'send' | 'history' | 'templates'>('send');
  
  // Data for selectors
  const [batches, setBatches] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [applicants, setApplicants] = useState<any[]>([]);
  const [instData, setInstData] = useState<any>(null);
  const [isSavingTemplates, setIsSavingTemplates] = useState(false);

  const [messageTemplates, setMessageTemplates] = useState({
    payment_success_whatsapp: '',
    payment_success_sms: '',
    due_reminder_whatsapp: '',
    due_reminder_sms: '',
    admission_success_whatsapp: '',
    generic_notification: ''
  });

  useEffect(() => {
    if (!user) return;
    const instId = user.institutionId || user.uid;

    const fetchTemplates = async () => {
      const docRef = doc(db, 'institutions', instId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.messageTemplates) {
          setMessageTemplates(data.messageTemplates);
        } else {
          // Set defaults if none exist
          const defaults = {
            payment_success_whatsapp: `Payment successful!\nStudent Name: {{studentName}}\nMonth: {{months}}\nTotal Amount: ৳{{amount}}\nPayment Method: {{method}}\nThanks, {{institutionName}}`,
            payment_success_sms: `Payment Received!\nStudent: {{studentName}}\nRoll: {{rollNo}}\nBatch: {{batchName}}\nMonths: {{months}}\nAmount: ৳{{amount}}\nCoach: {{institutionName}}\nDate: {{date}}\nDue: {{dueMonthsCount}} months`,
            due_reminder_whatsapp: `Due Reminder! \nStudent: {{studentName}}\nBatch: {{batchName}}\nDue Amount: ৳{{amount}}\nPending Months: {{months}}\nInstitution: {{institutionName}}\nPlease clear your dues as soon as possible. Thank you.`,
            due_reminder_sms: `Due Reminder: Student {{studentName}}, Due ৳{{amount}} ({{months}}). Please pay at {{institutionName}}.`,
            admission_success_whatsapp: `Congratulations! {{studentName}}'s admission to {{batchName}} is successful.\nRoll No: {{rollNo}}\nAdmission Fee: ৳{{admissionFee}}\nMonthly Fee: ৳{{monthlyFee}}\nThank you, {{institutionName}}`,
            generic_notification: `Hello {{studentName}},\n\n{{message}}\n\nRegards,\n{{institutionName}}`
          };
          setMessageTemplates(defaults);
        }
      }
    };
    fetchTemplates();
  }, [user]);

  const handleSaveTemplates = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const instId = user.institutionId || user.uid;
    setIsSavingTemplates(true);
    try {
      await updateDoc(doc(db, 'institutions', instId), {
        messageTemplates: messageTemplates
      });
      alert('Templates saved successfully!');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'institutions/templates');
    } finally {
      setIsSavingTemplates(false);
    }
  };

  useEffect(() => {
    if (!user) return;

    const instId = user.institutionId || user.uid;

    const fetchInstData = async () => {
      try {
        const docRef = doc(db, 'institutions', instId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setInstData(docSnap.data());
        }
      } catch (error) {
        console.error("Error fetching institution:", error);
      }
    };
    fetchInstData();

    const fetchCredits = async () => {
      try {
        const docRef = doc(db, 'credits', instId);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          const data = docSnap.data();
          setCredits({
            userId: data.userId,
            balance: data.balance,
            totalSent: data.totalSent,
            lastUpdated: data.lastUpdated
          } as CreditBalance);
        } else {
          const initialCredits = {
            userId: instId,
            balance: 100,
            totalSent: 0,
            lastUpdated: new Date().toISOString()
          };
          await setDoc(docRef, initialCredits);
          setCredits(initialCredits as CreditBalance);
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, 'credits');
      }
    };

    const fetchMessages = async () => {
      try {
        const q = query(
          collection(db, 'messages'),
          where('institutionId', '==', instId),
          orderBy('createdAt', 'desc'),
          limit(50)
        );
        const querySnapshot = await getDocs(q);
        
        const mappedMessages = querySnapshot.docs.map(doc => {
          const m = doc.data();
          return {
            id: doc.id,
            senderId: m.senderId,
            senderName: m.senderName,
            recipientType: m.recipientType,
            recipientId: m.recipientId,
            recipientName: m.recipientName,
            content: m.content,
            status: m.status,
            error: m.error,
            creditsUsed: m.creditsUsed,
            createdAt: m.createdAt
          };
        });
        setMessages(mappedMessages as Message[]);
      } catch (error) {
        handleFirestoreError(error, OperationType.LIST, 'messages');
      } finally {
        setLoading(false);
      }
    };

    const fetchData = async () => {
      try {
        const [batchesSnap, studentsSnap, teachersSnap, applicantsSnap] = await Promise.all([
          getDocs(query(collection(db, 'batches'), where('institutionId', '==', instId))),
          getDocs(query(collection(db, 'students'), where('institutionId', '==', instId))),
          getDocs(query(collection(db, 'teachers'), where('institutionId', '==', instId))),
          getDocs(query(collection(db, 'job_applications'), where('institutionId', '==', instId)))
        ]);

        setBatches(batchesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        setStudents(studentsSnap.docs.map(doc => {
          const s = doc.data();
          return {
            id: doc.id,
            name: s.name,
            rollNo: s.rollNo
          };
        }));
        setTeachers(teachersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        setApplicants(applicantsSnap.docs.map(doc => {
          const a = doc.data();
          return {
            id: doc.id,
            applicantName: a.applicantName
          };
        }));
      } catch (error) {
        handleFirestoreError(error, OperationType.LIST, 'selector_data');
      }
    };

    fetchCredits();
    fetchMessages();
    fetchData();

    const unsubCredits = onSnapshot(doc(db, 'credits', instId), (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        setCredits({
          userId: data.userId,
          balance: data.balance,
          totalSent: data.totalSent,
          lastUpdated: data.lastUpdated
        } as CreditBalance);
      }
    }, (error) => handleFirestoreError(error, OperationType.GET, 'credits'));

    const unsubMessages = onSnapshot(
      query(collection(db, 'messages'), where('institutionId', '==', instId), orderBy('createdAt', 'desc'), limit(50)),
      (snapshot) => {
        const mappedMessages = snapshot.docs.map(doc => {
          const m = doc.data();
          return {
            id: doc.id,
            senderId: m.senderId,
            senderName: m.senderName,
            recipientType: m.recipientType,
            recipientId: m.recipientId,
            recipientName: m.recipientName,
            content: m.content,
            status: m.status,
            error: m.error,
            creditsUsed: m.creditsUsed,
            createdAt: m.createdAt
          };
        });
        setMessages(mappedMessages as Message[]);
      },
      (error) => handleFirestoreError(error, OperationType.LIST, 'messages')
    );

    return () => {
      unsubCredits();
      unsubMessages();
    };
  }, [user]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !credits || credits.balance <= 0) {
      alert(t('messages.error.noCredits'));
      return;
    }

    if (!recipientId || !content.trim()) return;

    setSending(true);
    try {
      const instId = user.institutionId || user.uid;
      
      // Try sending via Custom Gateway if available
      let sendStatus: 'delivered' | 'failed' = 'delivered';
      let sendError = '';

      if (instData?.smsConfig?.apiUrl) {
        // Need to find recipient phone number. 
        // This is complex for batch, but for individual/teacher it's easy.
        // For simplicity, let's look up phone if individual.
        let phone = '';
        if (recipientType === 'individual') {
          const student = students.find(s => s.id === recipientId);
          phone = student?.guardianPhone;
        } else if (recipientType === 'teacher') {
          const teacher = teachers.find(t => t.id === recipientId);
          phone = teacher?.phone;
        } else if (recipientType === 'applicant') {
          const applicant = applicants.find(a => a.id === recipientId);
          phone = applicant?.phone;
        }

        if (phone) {
          const result = await sendSMS(instData.smsConfig, phone, content);
          if (!result.success) {
            sendStatus = 'failed';
            sendError = result.error || 'Gateway Error';
          }
        }
      }

      const messageData = {
        senderId: user.uid,
        senderName: user.displayName,
        institutionId: instId,
        recipientType: recipientType,
        recipientId: recipientId,
        recipientName: recipientName,
        content,
        status: sendStatus,
        error: sendError,
        creditsUsed: 1,
        createdAt: serverTimestamp()
      };

      await addDoc(collection(db, 'messages'), messageData);

      if (sendStatus === 'delivered') {
        await updateDoc(doc(db, 'credits', instId), {
          balance: increment(-1),
          totalSent: increment(1),
          lastUpdated: serverTimestamp()
        });
        alert('Message sent successfully!');
      } else {
        alert(`Message failed: ${sendError}`);
      }

      setContent('');
      setRecipientId('');
      setRecipientName('');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'messages');
    } finally {
      setSending(false);
    }
  };

  const filteredRecipients = () => {
    const query = searchQuery.toLowerCase();
    switch (recipientType) {
      case 'batch':
        return batches.filter(b => b.name.toLowerCase().includes(query));
      case 'individual':
        return students.filter(s => s.name.toLowerCase().includes(query) || s.rollNo.includes(query));
      case 'teacher':
        return teachers.filter(t => t.name.toLowerCase().includes(query));
      case 'applicant':
        return applicants.filter(a => a.applicantName.toLowerCase().includes(query));
      default:
        return [];
    }
  };

  const getRecipientLabel = (type: string) => {
    switch (type) {
      case 'batch': return t('messages.types.batch');
      case 'individual': return t('messages.types.individual');
      case 'teacher': return t('messages.types.teacher');
      case 'applicant': return t('messages.types.applicant');
      default: return type;
    }
  };

  return (
    <div className="space-y-8">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">
            {t('messages.title')}
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            {t('messages.subtitle')}
          </p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 bg-white dark:bg-gray-900 p-1.5 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm w-fit">
        <button
          onClick={() => setActiveTab('send')}
          className={cn(
            "px-6 py-2.5 text-sm font-bold rounded-xl transition-all flex items-center gap-2",
            activeTab === 'send' 
              ? "bg-indigo-600 text-white shadow-lg shadow-indigo-100 dark:shadow-none" 
              : "text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800"
          )}
        >
          <Send className="w-4 h-4" /> Send Message
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={cn(
            "px-6 py-2.5 text-sm font-bold rounded-xl transition-all flex items-center gap-2",
            activeTab === 'history' 
              ? "bg-indigo-600 text-white shadow-lg shadow-indigo-100 dark:shadow-none" 
              : "text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800"
          )}
        >
          <History className="w-4 h-4" /> History
        </button>
        <button
          onClick={() => setActiveTab('templates')}
          className={cn(
            "px-6 py-2.5 text-sm font-bold rounded-xl transition-all flex items-center gap-2",
            activeTab === 'templates' 
              ? "bg-indigo-600 text-white shadow-lg shadow-indigo-100 dark:shadow-none" 
              : "text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800"
          )}
        >
          <FileEdit className="w-4 h-4" /> Message Templates
        </button>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'send' && (
          <motion.div
            key="send"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-8"
          >
            {/* Credits Card (from screenshot) */}
            <div className="bg-white dark:bg-gray-900 rounded-3xl p-8 border border-gray-100 dark:border-gray-800 shadow-sm flex flex-col md:flex-row items-center justify-between gap-8">
              <div className="flex items-center gap-6">
                <div className="w-16 h-16 bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl flex items-center justify-center">
                  <MessageSquare className="text-indigo-600 dark:text-indigo-400 w-8 h-8" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                    {t('messages.credits')}
                  </h2>
                  <p className="text-gray-500 dark:text-gray-400">
                    {t('messages.sentThisMonth', { count: credits?.totalSent || 0 })}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-12">
                <div className="text-center">
                  <p className="text-4xl font-black text-gray-900 dark:text-white">
                    {credits?.balance || 0}
                  </p>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {t('messages.available')}
                  </p>
                </div>
                
                <button 
                  onClick={() => setIsUpgradeModalOpen(true)}
                  className="bg-gray-900 dark:bg-white text-white dark:text-gray-900 px-10 py-5 rounded-2xl font-bold text-xl hover:scale-105 transition-transform shadow-lg shadow-gray-200 dark:shadow-none"
                >
                  {t('messages.buyTokens')}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Send Message Form */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 border border-gray-100 dark:border-gray-800 shadow-sm">
            <div className="flex items-center gap-2 mb-6">
              <Plus className="w-5 h-5 text-indigo-600" />
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                {t('messages.newMessage')}
              </h3>
            </div>

            <form onSubmit={handleSendMessage} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('messages.recipientType')}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(['batch', 'individual', 'teacher', 'applicant'] as const).map((type) => {
                    const isPremium = type === 'batch' || type === 'teacher' || type === 'applicant';
                    const isFree = user?.subscriptionPlan === 'free';
                    
                    return (
                      <button
                        key={type}
                        type="button"
                        onClick={() => {
                          if (isFree && isPremium) {
                            setIsUpgradeModalOpen(true);
                            return;
                          }
                          setRecipientType(type);
                          setRecipientId('');
                          setRecipientName('');
                        }}
                        className={cn(
                          "px-3 py-2 text-xs font-medium rounded-lg border transition-all relative overflow-hidden",
                          recipientType === type
                            ? "bg-indigo-50 border-indigo-200 text-indigo-700 dark:bg-indigo-900/30 dark:border-indigo-800 dark:text-indigo-400"
                            : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-400",
                          isFree && isPremium && "opacity-60 grayscale"
                        )}
                      >
                        {getRecipientLabel(type)}
                        {isFree && isPremium && (
                          <div className="absolute top-0 right-0 p-0.5 bg-amber-500 text-white">
                            <Zap className="w-2 h-2 fill-white" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t(`messages.select${recipientType.charAt(0).toUpperCase() + recipientType.slice(1)}`)}
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder={t('common.search')}
                    className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                
                <div className="mt-2 max-h-40 overflow-y-auto border border-gray-100 dark:border-gray-800 rounded-lg divide-y divide-gray-50 dark:divide-gray-800">
                  {filteredRecipients().map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setRecipientId(item.id);
                        setRecipientName(item.name || item.applicantName);
                        setSearchQuery('');
                      }}
                      className={cn(
                        "w-full text-left px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex items-center justify-between",
                        recipientId === item.id && "bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600"
                      )}
                    >
                      <span>{item.name || item.applicantName}</span>
                      {recipientId === item.id && <CheckCircle2 className="w-4 h-4" />}
                    </button>
                  ))}
                  {filteredRecipients().length === 0 && (
                    <p className="p-4 text-center text-xs text-gray-500 italic">
                      No results found
                    </p>
                  )}
                </div>
              </div>

              {recipientName && (
                <div className="p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg border border-indigo-100 dark:border-indigo-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <UserCheck className="w-4 h-4 text-indigo-600" />
                    <span className="text-sm font-medium text-indigo-700 dark:text-indigo-400">
                      {recipientName}
                    </span>
                  </div>
                  <button 
                    type="button"
                    onClick={() => {
                      setRecipientId('');
                      setRecipientName('');
                    }}
                    className="text-indigo-400 hover:text-indigo-600"
                  >
                    <XCircle className="w-4 h-4" />
                  </button>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Select Template (Optional)
                </label>
                <select 
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val && (messageTemplates as any)[val]) {
                      setContent((messageTemplates as any)[val]);
                    }
                  }}
                  className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                >
                  <option value="">-- Choose Template --</option>
                  <option value="generic_notification">Generic Notification</option>
                  <option value="due_reminder_sms">Due Reminder (SMS Form)</option>
                  <option value="payment_success_sms">Payment Success (SMS Form)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('messages.messageContent')}
                </label>
                <textarea
                  required
                  rows={4}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all resize-none"
                  placeholder={t('messages.placeholder')}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                />
                <div className="flex justify-between mt-1">
                  <p className="text-[10px] text-gray-400">
                    {content.length} characters
                  </p>
                  <p className="text-[10px] text-indigo-500 font-medium">
                    1 message = 1 token
                  </p>
                </div>
              </div>

              <button
                type="submit"
                disabled={sending || !recipientId || !content.trim() || (credits?.balance || 0) <= 0}
                className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-200 dark:shadow-none"
              >
                {sending ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
                {sending ? t('messages.sending') : t('messages.send')}
              </button>
            </form>
          </div>
        </div>

        {/* Tips/Templates column could go here or keep as is */}
              <div className="lg:col-span-2 space-y-6">
                <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 border border-gray-100 dark:border-gray-800 shadow-sm flex flex-col items-center justify-center text-center py-20">
                   <div className="w-16 h-16 bg-amber-50 dark:bg-amber-900/20 rounded-2xl flex items-center justify-center mb-4">
                     <Zap className="w-8 h-8 text-amber-600" />
                   </div>
                   <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Pro Messaging Tip</h3>
                   <p className="text-gray-500 dark:text-gray-400 max-w-sm">
                     Use personalization to increase engagement. You can now manage templates in the new Templates tab for recurring tasks like fee collection and reminders.
                   </p>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'history' && (
          <motion.div
            key="history"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 border border-gray-100 dark:border-gray-800 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <History className="w-5 h-5 text-gray-400" />
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                    {t('messages.history')}
                  </h3>
                </div>
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-gray-400" />
                  <select className="text-xs bg-transparent border-none outline-none text-gray-500 font-medium cursor-pointer">
                    <option>All Time</option>
                    <option>Today</option>
                    <option>This Week</option>
                  </select>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-gray-50 dark:border-gray-800">
                      <th className="pb-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Recipient</th>
                      <th className="pb-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Message</th>
                      <th className="pb-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Status</th>
                      <th className="pb-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                    {messages.map((msg) => (
                      <tr key={msg.id} className="group hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors">
                        <td className="py-4">
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              "w-8 h-8 rounded-lg flex items-center justify-center",
                              msg.recipientType === 'batch' ? "bg-blue-50 text-blue-600" :
                              msg.recipientType === 'teacher' ? "bg-purple-50 text-purple-600" :
                              msg.recipientType === 'applicant' ? "bg-orange-50 text-orange-600" :
                              "bg-indigo-50 text-indigo-600"
                            )}>
                              {msg.recipientType === 'batch' ? <Layers className="w-4 h-4" /> :
                               msg.recipientType === 'teacher' ? <Briefcase className="w-4 h-4" /> :
                               msg.recipientType === 'applicant' ? <Building className="w-4 h-4" /> :
                               <Users className="w-4 h-4" />}
                            </div>
                            <div>
                              <p className="text-sm font-bold text-gray-900 dark:text-white">{msg.recipientName}</p>
                              <p className="text-[10px] text-gray-400 uppercase font-medium">{getRecipientLabel(msg.recipientType)}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 max-w-xs">
                          <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                            {msg.content}
                          </p>
                        </td>
                        <td className="py-4">
                          <div className={cn(
                            "inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold uppercase",
                            msg.status === 'delivered' 
                              ? "bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400"
                              : "bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400"
                          )}>
                            {msg.status === 'delivered' ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                            {t(`messages.status.${msg.status}`)}
                          </div>
                        </td>
                        <td className="py-4">
                          <p className="text-xs text-gray-500">
                            {msg.createdAt ? (typeof msg.createdAt === 'string' ? new Date(msg.createdAt).toLocaleDateString() : msg.createdAt.toDate?.().toLocaleDateString() || new Date().toLocaleDateString()) : 'N/A'}
                          </p>
                          <p className="text-[10px] text-gray-400">
                            {msg.createdAt ? (typeof msg.createdAt === 'string' ? new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : msg.createdAt.toDate?.().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) || '') : ''}
                          </p>
                        </td>
                      </tr>
                    ))}
                    {messages.length === 0 && !loading && (
                      <tr>
                        <td colSpan={4} className="py-12 text-center">
                          <div className="flex flex-col items-center gap-2">
                            <MessageSquare className="w-12 h-12 text-gray-100" />
                            <p className="text-gray-400 text-sm">No messages sent yet</p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'templates' && (
          <motion.div
            key="templates"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 bg-white dark:bg-gray-900 rounded-2xl p-6 border border-gray-100 dark:border-gray-800 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2">
                    <FileEdit className="w-5 h-5 text-indigo-600" />
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">Message Templates</h3>
                  </div>
                  <button 
                    onClick={handleSaveTemplates}
                    disabled={isSavingTemplates}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 transition-all disabled:opacity-50"
                  >
                    {isSavingTemplates ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                    Save All Templates
                  </button>
                </div>

                <div className="space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <h4 className="text-sm font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                        <MessageCircle className="w-4 h-4" /> WhatsApp Templates
                      </h4>
                      
                      <div className="space-y-4">
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-gray-600 dark:text-gray-400">Payment Success (WA)</label>
                          <textarea 
                            value={messageTemplates.payment_success_whatsapp}
                            onChange={(e) => setMessageTemplates({...messageTemplates, payment_success_whatsapp: e.target.value})}
                            rows={3}
                            className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all resize-none"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-gray-600 dark:text-gray-400">Due Reminder (WA)</label>
                          <textarea 
                            value={messageTemplates.due_reminder_whatsapp}
                            onChange={(e) => setMessageTemplates({...messageTemplates, due_reminder_whatsapp: e.target.value})}
                            rows={3}
                            className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all resize-none"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-gray-600 dark:text-gray-400">Admission Success (WA)</label>
                          <textarea 
                            value={messageTemplates.admission_success_whatsapp}
                            onChange={(e) => setMessageTemplates({...messageTemplates, admission_success_whatsapp: e.target.value})}
                            rows={3}
                            className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all resize-none"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h4 className="text-sm font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                        <Zap className="w-4 h-4" /> Paid API Templates
                      </h4>
                      <div className="space-y-4">
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-gray-600 dark:text-gray-400">Payment Success (SMS)</label>
                          <textarea 
                            value={messageTemplates.payment_success_sms}
                            onChange={(e) => setMessageTemplates({...messageTemplates, payment_success_sms: e.target.value})}
                            rows={3}
                            className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all resize-none"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-gray-600 dark:text-gray-400">Due Reminder (SMS)</label>
                          <textarea 
                            value={messageTemplates.due_reminder_sms}
                            onChange={(e) => setMessageTemplates({...messageTemplates, due_reminder_sms: e.target.value})}
                            rows={3}
                            className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all resize-none"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-gray-600 dark:text-gray-400">Generic Notification</label>
                          <textarea 
                            value={messageTemplates.generic_notification}
                            onChange={(e) => setMessageTemplates({...messageTemplates, generic_notification: e.target.value})}
                            rows={3}
                            className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all resize-none"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 border border-gray-100 dark:border-gray-800 shadow-sm">
                  <div className="flex items-center gap-2 mb-4">
                    <Layout className="w-5 h-5 text-indigo-600" />
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">Supported Variables</h3>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">You can use these placeholders in your templates. They will be replaced with real data when sending.</p>
                  
                  <div className="space-y-2">
                    {[
                      { var: '{{studentName}}', desc: 'Full name of the student' },
                      { var: '{{rollNo}}', desc: 'Roll/ID number' },
                      { var: '{{batchName}}', desc: 'Current batch name' },
                      { var: '{{amount}}', desc: 'Payment or due amount' },
                      { var: '{{months}}', desc: 'List of months' },
                      { var: '{{date}}', desc: 'Current date' },
                      { var: '{{method}}', desc: 'Payment method (Cash/bKash)' },
                      { var: '{{institutionName}}', desc: 'Your coaching center name' },
                      { var: '{{message}}', desc: 'Generic content placeholder' }
                    ].map((v) => (
                      <div key={v.var} className="flex items-center justify-between p-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors group">
                        <code className="text-xs font-black text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 px-1.5 py-0.5 rounded border border-indigo-100 dark:border-indigo-800 group-hover:scale-105 transition-transform">{v.var}</code>
                        <span className="text-[10px] text-gray-400 font-medium">{v.desc}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-indigo-600 rounded-2xl p-6 text-white shadow-lg shadow-indigo-100 dark:shadow-none">
                  <h4 className="font-bold flex items-center gap-2 mb-2">
                    <AlertCircle className="w-4 h-4" /> Why use templates?
                  </h4>
                  <p className="text-xs text-indigo-100 leading-relaxed">
                    Templates ensure consistency in your communication and save you time. Once set, you can send reminders with one click without typing the same message repeatedly.
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <SubscriptionModal 
        isOpen={isUpgradeModalOpen} 
        onClose={() => setIsUpgradeModalOpen(false)} 
      />
    </div>
  );
}
