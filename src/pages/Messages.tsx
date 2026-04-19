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
  Zap
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
  
  // Data for selectors
  const [batches, setBatches] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [applicants, setApplicants] = useState<any[]>([]);
  const [instData, setInstData] = useState<any>(null);

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

        {/* Message History */}
        <div className="lg:col-span-2 space-y-6">
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
                          {msg.createdAt ? new Date(msg.createdAt).toLocaleDateString() : 'N/A'}
                        </p>
                        <p className="text-[10px] text-gray-400">
                          {msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
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
        </div>
      </div>

      <SubscriptionModal 
        isOpen={isUpgradeModalOpen} 
        onClose={() => setIsUpgradeModalOpen(false)} 
      />
    </div>
  );
}

// Mock CreditCard icon since it wasn't imported
function CreditCard(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect width="20" height="14" x="2" y="5" rx="2" />
      <line x1="2" x2="22" y1="10" y2="10" />
    </svg>
  );
}
