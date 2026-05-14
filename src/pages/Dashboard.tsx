import React, { useState, useEffect, useRef } from 'react';
import { 
  Users, 
  CreditCard, 
  ClipboardCheck, 
  GraduationCap, 
  ArrowUpRight, 
  Calendar, 
  Loader2, 
  Plus, 
  Layers, 
  FileText, 
  AlertCircle,
  MessageSquare,
  ChevronRight,
  Search,
  Zap,
  Bell,
  Info,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Gift,
  Download,
  Image as ImageIcon,
  Sparkles,
  Cake,
  BoxIcon,
  Flag,
  HelpCircle
} from 'lucide-react';
import { BANGLADESH_HOLIDAYS_2026, getUpcomingHolidays, getHolidayForDate } from '../data/holidays';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { cn, formatCurrency, formatDate } from '../lib/utils';
import { collection, getDocs, query, where, orderBy, limit, onSnapshot, doc, updateDoc, setDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { useAuth } from '../lib/auth';
import { useTranslation, Trans } from 'react-i18next';
import { SubscriptionModal } from '../components/SubscriptionModal';
import { CreditPricingModal } from '../components/CreditPricingModal';
import { Modal } from '../components/Modal';
import { 
  GRADES, 
  SUBSCRIPTION_PLANS, 
  MONTHS 
} from '../constants';
import { AnimatePresence } from 'motion/react';

import { toPng } from 'html-to-image';

export function Dashboard() {
  const { user } = useAuth();
  const { t, i18n } = useTranslation();
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [isBirthdayModalOpen, setIsBirthdayModalOpen] = useState(false);
  const birthdayRef = useRef<HTMLDivElement>(null);
  const [selectedStudentForBirthday, setSelectedStudentForBirthday] = useState<any>(null);
  const [instData, setInstData] = useState<any>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [systemNotifications, setSystemNotifications] = useState<any[]>([]);
  const [expiryNotification, setExpiryNotification] = useState<any | null>(null);
  const [selectedNotification, setSelectedNotification] = useState<any | null>(null);
  const [aiBalance, setAiBalance] = useState(0);
  const [holidayNotification, setHolidayNotification] = useState<any | null>(null);
  const [showPricing, setShowPricing] = useState(false);
  const [isWelcomeModalOpen, setIsWelcomeModalOpen] = useState(false);
  const hasEverClosedModal = useRef(false);

  const [welcomeForm, setWelcomeForm] = useState({
    name: user?.displayName || '',
    phone: user?.phone || ''
  });
  const [welcomeLoading, setWelcomeLoading] = useState(false);
  const [welcomeError, setWelcomeError] = useState<string | null>(null);

  useEffect(() => {
    if (hasEverClosedModal.current) return;
    
    // Explicitly check for invalid or email-looking names
    const hasIncompleteName = !user?.displayName || user.displayName.includes('@') || user.displayName === 'Unnamed Institution';
    const hasIncompletePhone = !user?.phone || user.phone === 'Not Provided';
    const needsOnboarding = user?.isNewUser || (user && (hasIncompleteName || hasIncompletePhone));
    
    if (needsOnboarding) {
      setIsWelcomeModalOpen(true);
      setWelcomeForm({
        name: hasIncompleteName ? '' : (user?.displayName || ''),
        phone: hasIncompletePhone ? '' : (user?.phone || '')
      });
    } else {
      setIsWelcomeModalOpen(false);
    }
  }, [user?.uid, user?.displayName, user?.phone, user?.isNewUser]);

  const handleWelcomeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    const name = welcomeForm.name.trim();
    const phone = welcomeForm.phone.trim();

    if (!name || !phone) {
      setWelcomeError("সবগুলো ঘর পূরণ করুন।");
      return;
    }

    if (phone.length < 11) {
      setWelcomeError("সঠিক ফোন নম্বর দিন।");
      return;
    }

    setWelcomeLoading(true);
    setWelcomeError(null);
    
    // Safety timeout to prevent infinite loading if Firebase hangs
    const timeout = setTimeout(() => {
      if (welcomeLoading) {
        setWelcomeLoading(false);
        setWelcomeError("নেটওয়ার্ক সমস্যার কারণে দেরি হচ্ছে। আবার চেষ্টা করুন।");
      }
    }, 15000);

    try {
      // Update everything we can find to ensure name sticks
      const userUpdate = updateDoc(doc(db, 'users', user.uid), {
        displayName: name,
        phone: phone,
        institution: name,
        institutionName: name,
        isNewUser: false
      });
      
      const instUpdate = setDoc(doc(db, 'institutions', user.uid), {
        id: user.uid,
        name: name,
        displayName: name,
        phone: phone,
        email: user.email,
        admissionForm: {
          active: true,
          title: "Student Admission Form",
          instructions: 'Please fill out the form carefully.',
          fields: {
            studentName: true,
            dob: true,
            birthReg: true,
            nid: false,
            fatherName: true,
            motherName: true,
            guardianPhone: true,
            studentPhone: false,
            admissionDate: true,
            batch: true,
            subjectGroup: false,
            schoolName: false,
            address: true
          }
        },
        updatedAt: new Date().toISOString()
      }, { merge: true });

      await Promise.all([userUpdate, instUpdate]);
      clearTimeout(timeout);

      // Successfully saved! Now close.
      hasEverClosedModal.current = true;
      setIsWelcomeModalOpen(false);
    } catch (err: any) {
      clearTimeout(timeout);
      console.error("Error updating welcome info:", err);
      if (err.message?.includes('permission-denied')) {
        setWelcomeError("অনুমতি নেই। অনুগ্রহ করে আবার লগইন করুন।");
      } else {
        setWelcomeError(err.message || "সংরক্ষণে ব্যর্থ হয়েছে। আবার চেষ্টা করুন।");
      }
    } finally {
      setWelcomeLoading(false);
    }
  };

  const closeWelcomeModal = async () => {
    // Only allow closing if they have a real name and phone set in state/form
    if (welcomeForm.name.trim() && welcomeForm.phone.trim()) {
      hasEverClosedModal.current = true;
      setIsWelcomeModalOpen(false);
      if (user) {
        try {
          await updateDoc(doc(db, 'users', user.uid), { isNewUser: false });
        } catch (err) {
          console.error("Error clearing isNewUser flag:", err);
        }
      }
    } else {
      setWelcomeError("অনুগ্রহ করে আপনার তথ্য দিন। এটি ছাড়া আপনি এগিয়ে যেতে পারবেন না।");
    }
  };

  useEffect(() => {
    if (!user) return;

    // Listen for system notifications
    const q = query(collection(db, 'super_notifications'), limit(10));
    const instId = user.institutionId || user.uid;

    const unsubInst = onSnapshot(doc(db, 'institutions', instId), (doc) => {
      if (doc.exists()) setInstData(doc.data());
    }, (error) => handleFirestoreError(error, OperationType.GET, `institutions/${instId}`));

    const unsubscribe = onSnapshot(q, (snap) => {
      const notifs = snap.docs.map(d => ({ id: d.id, ...d.data() })) as any[];
      
      // Sort client-side
      const sortedNotifs = notifs.sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA;
      });

      // Filter out dismissed and scheduled-for-later notifications
      const now = new Date();
      const dismissed = user.dismissedNotifications || [];
      const visibleNotifs = sortedNotifs.filter(n => {
        const isDismissed = dismissed.includes(n.id);
        const scheduledDate = n.scheduledAt ? new Date(n.scheduledAt) : new Date(n.createdAt);
        const isReady = scheduledDate <= now;
        return !isDismissed && isReady;
      });

      setSystemNotifications(visibleNotifs);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'super_notifications');
    });

    // Listen for AI credits
    const unsubCredits = onSnapshot(doc(db, 'credits', instId), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setAiBalance(data.aiBalance || 0);
      } else if (user) {
        // Safety net: initialize credits doc if it doesn't exist
        const initialCredits = {
          userId: instId,
          balance: 0,
          aiBalance: 5,
          totalSent: 0,
          lastUpdated: new Date().toISOString()
        };
        setDoc(doc(db, 'credits', instId), initialCredits, { merge: true });
        setAiBalance(initialCredits.aiBalance);
      }
    }, (error) => handleFirestoreError(error, OperationType.GET, 'credits'));

    return () => {
      unsubscribe();
      unsubCredits();
      unsubInst();
    };
  }, [user]);

  // Handle Plan Expiry Auto-Notifications
  useEffect(() => {
    if (!user || user.subscriptionPlan === 'free' || !user.subscriptionExpiry) {
      setExpiryNotification(null);
      return;
    }

    const expiryDate = new Date(user.subscriptionExpiry);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    expiryDate.setHours(0, 0, 0, 0);

    const diffDays = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 3) {
      setExpiryNotification({
        id: 'auto-expiry-3',
        type: 'warning',
        title: t('dashboard.planExpiry.endingSoonTitle'),
        message: t('dashboard.planExpiry.endingSoonDesc', { days: 3 }),
        createdAt: new Date().toISOString()
      });
    } else if (diffDays === 0) {
      setExpiryNotification({
        id: 'auto-expiry-0',
        type: 'error',
        title: t('dashboard.planExpiry.endsTodayTitle'),
        message: t('dashboard.planExpiry.endsTodayDesc'),
        createdAt: new Date().toISOString()
      });
    } else if (diffDays < 0 && diffDays >= -5) {
      setExpiryNotification({
        id: `auto-expiry-past-${Math.abs(diffDays)}`,
        type: 'error',
        title: t('dashboard.planExpiry.expiredTitle'),
        message: t('dashboard.planExpiry.expiredDesc', { days: Math.abs(diffDays) }),
        createdAt: new Date().toISOString()
      });
    } else {
      setExpiryNotification(null);
    }
  }, [user]);

  // Handle Holiday Notifications
  useEffect(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    const holiday = getHolidayForDate(tomorrow);
    if (holiday) {
      setHolidayNotification({
        id: `holiday-${holiday.date}`,
        type: 'info',
        title: i18n?.language === 'en' ? 'Upcoming Government Holiday' : 'আসন্ন সরকারি ছুটি',
        message: i18n?.language === 'en' 
          ? `Tomorrow is ${holiday.name}. This is a gazetted holiday in Bangladesh.`
          : `আগামীকাল ${holiday.nameBn}। এটি বাংলাদেশের একটি সরকারি সাধারণ ছুটি।`,
        isHoliday: true,
        holidayName: i18n?.language === 'en' ? holiday.name : holiday.nameBn
      });
    }
  }, [i18n?.language]);

  const dismissNotification = async (id: string) => {
    if (!user) return;
    try {
      const userRef = doc(db, 'users', user.uid);
      const currentDismissed = user.dismissedNotifications || [];
      await updateDoc(userRef, {
        dismissedNotifications: [...currentDismissed, id]
      });
    } catch (error) {
      console.error("Error dismissing notification:", error);
    }
  };
  const [stats, setStats] = useState({
    students: 0,
    batches: 0,
    offlineExams: 0,
    pendingResults: 0,
    attendanceRate: 0,
    totalCollected: 0,
  });
  const [studentsWithDues, setStudentsWithDues] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [fees, setFees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [recentExams, setRecentExams] = useState<any[]>([]);
  const [recentAttendance, setRecentAttendance] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [actionItems, setActionItems] = useState<any[]>([]);
  const [isActionCenterLoading, setIsActionCenterLoading] = useState(true);

  // Daily Action Center Logic
  useEffect(() => {
    if (!user || students.length === 0) return;

    const calculateActions = async () => {
      setIsActionCenterLoading(true);
      const items: any[] = [];
      const instId = user.institutionId || user.uid;

      // 1. Birthday Actions
      const birthdays = getTodayBirthdays();
      birthdays.forEach(s => {
        items.push({
          id: `bday-${s.id}`,
          type: 'birthday',
          priority: 'medium',
          title: `It's ${s.name.split(' ')[0]}'s Birthday! 🎂`,
          desc: "Send a greeting card to make them feel special.",
          actionLabel: "Generate Card",
          onClick: () => {
             setSelectedStudentForBirthday(s);
             setIsBirthdayModalOpen(true);
          },
          icon: Cake,
          color: 'purple'
        });
      });

      // 2. Due Actions (Priority: High)
      if (studentsWithDues.length > 0) {
        items.push({
          id: 'dues-summary',
          type: 'dues',
          priority: 'high',
          title: `${studentsWithDues.length} Students have Dues 💸`,
          desc: "Send fee reminders to maintain your cash flow.",
          actionLabel: "View Dues",
          to: "/fees?tab=dues",
          icon: CreditCard,
          color: 'rose'
        });
      }

      // 3. Consecutive Absence Action (Experimental/Smart)
      // We'll look for students absent in their last 2-3 attendance records
      try {
        const qAtt = query(
          collection(db, 'attendance'),
          where('institutionId', '==', instId),
          orderBy('date', 'desc'),
          limit(students.length * 3) // Check last 3 records for each student approx
        );
        const attSnap = await getDocs(qAtt);
        const attRecords = attSnap.docs.map(d => d.data());
        
        // Group by student
        const studentAbsences: Record<string, number> = {};
        const studentLatestDate: Record<string, string> = {};

        attRecords.forEach((rec: any) => {
          if (!studentAbsences[rec.studentId]) studentAbsences[rec.studentId] = 0;
          
          // Only count consecutive absences from most recent
          if (rec.status === 'absent') {
             // If we haven't hit a 'present' yet for this student
             if (studentAbsences[rec.studentId] >= 0) {
                studentAbsences[rec.studentId]++;
             }
          } else {
             // Hit a 'present', stop counting
             studentAbsences[rec.studentId] = -1; 
          }
        });

        const chronicAbsentees = Object.entries(studentAbsences)
          .filter(([_, count]) => count >= 2)
          .map(([id, _]) => students.find(s => s.id === id))
          .filter(Boolean);

        if (chronicAbsentees.length > 0) {
          items.push({
            id: 'absent-alert',
            type: 'absence',
            priority: 'high',
            title: `${chronicAbsentees.length} Chronic Absentees ⚠️`,
            desc: "These students missed multiple classes. Call parents to prevent dropout.",
            actionLabel: "Check Attendance",
            to: "/attendance",
            icon: AlertTriangle,
            color: 'amber'
          });
        }
      } catch (err) {
        console.error("Error calculating chronic absences:", err);
      }

      // 4. No Batches Action
      if (stats.batches === 0) {
        items.push({
          id: 'setup-batches',
          type: 'setup',
          priority: 'high',
          title: "Create your first Batch",
          desc: "You need to set up a batch to start taking attendance.",
          actionLabel: "Get Started",
          to: "/batches",
          icon: Layers,
          color: 'indigo'
        });
      }

      setActionItems(items);
      setIsActionCenterLoading(false);
    };

    calculateActions();
  }, [user, students, studentsWithDues, stats.batches]);

  const currentPlan = SUBSCRIPTION_PLANS.find(p => p.id === user?.subscriptionPlan) || SUBSCRIPTION_PLANS[0];

  useEffect(() => {
    if (!user) return;

    const instId = user.institutionId || user.uid;

    if (process.env.NODE_ENV !== 'production') {
      console.log("[Dashboard] Initializing for Institution:", instId);
      console.log("[Dashboard] User Role:", user.role);
    }

    // Fetch all fees
    let qFees = query(
      collection(db, 'fees'),
      where('institutionId', '==', instId)
    );
    
    // If teacher, they shouldn't see all fees, but for stats calculation we might need to hide it anyway
    const unsubFees = onSnapshot(qFees, (snapshot) => {
      if (user.role === 'teacher') {
        setStats(prev => ({ ...prev, totalCollected: 0 }));
        return;
      }
      const feeData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setFees(feeData);
      
      const totalCollected = feeData
        .filter((f: any) => f.status === 'paid')
        .reduce((acc, f: any) => acc + (f.amount || 0), 0);
      
      setStats(prev => ({ ...prev, totalCollected }));
    });

    // Fetch batches first to get assigned IDs for teachers
    const qBatches = query(
      collection(db, 'batches'),
      where('institutionId', '==', instId)
    );
    
    const unsubBatches = onSnapshot(qBatches, (snapshot) => {
      let batchData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      let assignedBatchIds: string[] = [];
      
      if (user.role === 'teacher' && user.teacherId) {
        batchData = batchData.filter((b: any) => b.classTeacherId === user.teacherId);
        assignedBatchIds = batchData.map(b => b.id);
      }
      
      setStats(prev => ({ ...prev, batches: batchData.length }));

      // Now fetch students and filter if teacher
      const qStudents = query(
        collection(db, 'students'),
        where('institutionId', '==', instId)
      );
      
      const unsubStudents = onSnapshot(qStudents, (s) => {
        let studentData = s.docs.map(d => ({ id: d.id, ...d.data() }));
        if (user.role === 'teacher') {
          studentData = studentData.filter((st: any) => assignedBatchIds.includes(st.batchId));
        }
        setStudents(studentData);
        setStats(prev => ({ ...prev, students: studentData.length }));
      }, (error) => handleFirestoreError(error, OperationType.LIST, 'students'));

      // Fetch exams and filter if teacher
      const qExams = query(
        collection(db, 'offline_exams'),
        where('institutionId', '==', instId)
      );
      const unsubExams = onSnapshot(qExams, (snap) => {
        let examData = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        if (user.role === 'teacher') {
          examData = examData.filter((e: any) => assignedBatchIds.includes(e.batchId));
        }
        
        setStats(prev => ({ ...prev, offlineExams: examData.length }));
        const pending = examData.filter((e: any) => e.status === 'pending').length;
        setStats(prev => ({ ...prev, pendingResults: pending }));
        
        const recent = examData
          .sort((a: any, b: any) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))
          .slice(0, 5);
        setRecentExams(recent);
      }, (error) => handleFirestoreError(error, OperationType.LIST, 'offline_exams'));

      // Fetch attendance and filter if teacher
      const qAttendance = query(
        collection(db, 'attendance'),
        where('institutionId', '==', instId)
      );
      const unsubAttendance = onSnapshot(qAttendance, (snap) => {
        let attData = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        if (user.role === 'teacher') {
          attData = attData.filter((a: any) => assignedBatchIds.includes(a.batchId));
        }
        
        if (attData.length > 0) {
          const present = attData.filter((a: any) => a.status === 'present').length;
          const rate = Math.round((present / attData.length) * 100);
          setStats(prev => ({ ...prev, attendanceRate: rate }));
        } else {
          setStats(prev => ({ ...prev, attendanceRate: 0 }));
        }
        
        const recent = attData
          .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())
          .slice(0, 5);
        setRecentAttendance(recent);
      }, (error) => handleFirestoreError(error, OperationType.LIST, 'attendance'));

      return () => {
        unsubStudents();
        unsubExams();
        unsubAttendance();
      };
    });

    setLoading(false);

    return () => {
      unsubFees();
      unsubBatches();
    };
  }, [user]);

  // Calculate dues whenever students or fees change
  useEffect(() => {
    const currentYear = new Date().getFullYear();
    const currentMonthIndex = new Date().getMonth();

    const withDues = students.filter((student: any) => {
      if (student.status !== 'active') return false;
      
      // Get join month and year
      const joinDate = new Date(student.joinDate || Date.now());
      const joinYear = joinDate.getFullYear();
      const joinMonthIndex = joinDate.getMonth();

      // Academic year starts in January, but we only count from join month if it's the same year
      // If they joined in a previous year, we count from January of the current year
      const startMonthIndex = joinYear < currentYear ? 0 : joinMonthIndex;

      const paidMonths = fees
        .filter((f: any) => f.studentId === student.id && f.year === currentYear && f.type === 'Monthly Fee' && f.status === 'paid')
        .map((f: any) => f.month);

      for (let i = startMonthIndex; i <= currentMonthIndex; i++) {
        if (!paidMonths.includes(MONTHS[i])) return true;
      }
      return false;
    });
    setStudentsWithDues(withDues);
  }, [students, fees]);

  const getTodayBirthdays = () => {
    const today = new Date();
    const currentMonth = today.getMonth() + 1;
    const currentDate = today.getDate();

    return students.filter(s => {
      if (!s.dob) return false;
      const dob = new Date(s.dob);
      return (dob.getMonth() + 1) === currentMonth && dob.getDate() === currentDate;
    });
  };

  const handleDownloadBirthdayCard = async () => {
    if (!birthdayRef.current) return;
    setIsGenerating(true);
    try {
      const dataUrl = await toPng(birthdayRef.current, {
        pixelRatio: 3,
        cacheBust: true,
        backgroundColor: '#ffffff',
      });
      const link = document.createElement('a');
      link.download = `Birthday_Card_${selectedStudentForBirthday?.name}.png`;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Birthday Card Error:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const filteredExams = recentExams.filter(exam => 
    exam.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredAttendance = recentAttendance.filter(record => 
    (record.studentName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (record.grade || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12">
      {/* Campaign Welcome Banner */}
      {user?.isPromoUser && (
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-indigo-50 border-2 border-indigo-200 rounded-3xl p-6 flex flex-col md:flex-row items-center justify-between gap-6 shadow-sm mb-6"
        >
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-200">
              <Gift className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-xl font-black text-indigo-900">Welcome to Launch Campaign! 🚀</h2>
              <p className="text-indigo-600 font-medium text-sm">
                You currently have <span className="font-black text-indigo-700">3 Months FREE</span> access to Standard features. 
                Manage your institution with ease and grow without limits.
              </p>
            </div>
          </div>
          <div className="text-right">
             <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest leading-none mb-1">Your Trial Ends On</p>
             <p className="text-lg font-black text-indigo-600 leading-none">
                {user.subscriptionExpiry ? formatDate(user.subscriptionExpiry) : '—'}
             </p>
          </div>
        </motion.div>
      )}

      {/* Header & Search */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">
            {t('dashboard.title')}, {user?.displayName?.split(' ')[0] || 'Admin'} 👋
          </h1>
          <p className="text-gray-500 font-medium mt-1">Here's what's happening in your school today.</p>
        </div>
        <div className="relative w-full md:w-96 group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 group-focus-within:text-indigo-500 transition-colors" />
          <input
            type="text"
            placeholder={t('dashboard.search')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-sm"
          />
        </div>
      </div>

      {/* Daily Action Center (AI Assistant) */}
      {actionItems.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between px-2">
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-500" /> {t('Daily Action Center')}
            </h3>
            <span className="text-[10px] font-black bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full uppercase">AI Powered</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {actionItems.map((item) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                  "relative group overflow-hidden p-6 rounded-[2.5rem] border-2 transition-all hover:shadow-xl",
                  item.color === 'purple' ? "bg-purple-50 border-purple-100 hover:border-purple-200" :
                  item.color === 'rose' ? "bg-rose-50 border-rose-100 hover:border-rose-200" :
                  item.color === 'amber' ? "bg-amber-50 border-amber-100 hover:border-amber-200" :
                  "bg-indigo-50 border-indigo-100 hover:border-indigo-200"
                )}
              >
                <div className="relative z-10 flex flex-col h-full gap-4">
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg",
                      item.color === 'purple' ? "bg-purple-600 text-white shadow-purple-200" :
                      item.color === 'rose' ? "bg-rose-600 text-white shadow-rose-200" :
                      item.color === 'amber' ? "bg-amber-600 text-white shadow-amber-200" :
                      "bg-indigo-600 text-white shadow-indigo-200"
                    )}>
                      <item.icon className="w-6 h-6" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className={cn(
                        "font-black text-lg leading-tight",
                        item.color === 'purple' ? "text-purple-900" :
                        item.color === 'rose' ? "text-rose-900" :
                        item.color === 'amber' ? "text-amber-900" :
                        "text-indigo-900"
                      )}>{item.title}</h4>
                      <p className={cn(
                        "text-xs font-medium mt-0.5",
                        item.color === 'purple' ? "text-purple-600" :
                        item.color === 'rose' ? "text-rose-600" :
                        item.color === 'amber' ? "text-amber-600" :
                        "text-indigo-600"
                      )}>{item.desc}</p>
                    </div>
                  </div>

                  <div className="mt-auto flex items-center justify-between">
                    {item.to ? (
                      <Link
                        to={item.to}
                        className={cn(
                          "px-6 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center gap-2",
                          item.color === 'purple' ? "bg-purple-600 text-white hover:bg-purple-700" :
                          item.color === 'rose' ? "bg-rose-600 text-white hover:bg-rose-700" :
                          item.color === 'amber' ? "bg-amber-600 text-white hover:bg-amber-700" :
                          "bg-indigo-600 text-white hover:bg-indigo-700"
                        )}
                      >
                        {item.actionLabel} <ChevronRight className="w-3 h-3" />
                      </Link>
                    ) : (
                      <button
                        onClick={item.onClick}
                        className={cn(
                          "px-6 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center gap-2",
                          item.color === 'purple' ? "bg-purple-600 text-white hover:bg-purple-700" :
                          item.color === 'rose' ? "bg-rose-600 text-white hover:bg-rose-700" :
                          item.color === 'amber' ? "bg-amber-600 text-white hover:bg-amber-700" :
                          "bg-indigo-600 text-white hover:bg-indigo-700"
                        )}
                      >
                        {item.actionLabel} <ChevronRight className="w-3 h-3" />
                      </button>
                    )}
                    {item.priority === 'high' && (
                      <span className="flex items-center gap-1 text-[10px] font-black text-rose-500 uppercase tracking-widest animate-pulse">
                        <AlertCircle className="w-3 h-3" /> High Priority
                      </span>
                    )}
                  </div>
                </div>

                {/* Decorative Pattern */}
                <div className="absolute -right-4 -bottom-4 opacity-5 pointer-events-none">
                  <item.icon className="w-24 h-24 rotate-12" />
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* System Notifications */}
      <AnimatePresence>
        {(systemNotifications.length > 0 || (user?.role === 'admin' && (expiryNotification || holidayNotification))) && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2 px-2">
              <Bell className="w-4 h-4" /> {t('common.notifications')}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {holidayNotification && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-emerald-600 p-6 rounded-3xl border border-emerald-500 shadow-xl shadow-emerald-200 text-white flex gap-4 relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl -mr-16 -mt-16" />
                  <div className="p-3 rounded-2xl bg-white/20 h-fit">
                    <Flag className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-lg font-black text-white truncate">{holidayNotification.title}</h4>
                    <p className="text-sm text-emerald-50 opacity-90 line-clamp-3 mt-1 font-medium">{holidayNotification.message}</p>
                    <div className="mt-4 flex items-center gap-2">
                      <span className="px-3 py-1 bg-white/20 rounded-full text-[10px] font-black uppercase tracking-widest">
                        {holidayNotification.holidayName}
                      </span>
                    </div>
                  </div>
                  <button 
                    onClick={() => setHolidayNotification(null)}
                    className="absolute top-4 right-4 p-1 hover:bg-white/10 rounded-lg transition-all"
                  >
                    <XCircle className="w-5 h-5 text-white/50" />
                  </button>
                </motion.div>
              )}
              {expiryNotification && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-rose-600 p-6 rounded-3xl border border-rose-500 shadow-xl shadow-rose-200 text-white flex gap-4 relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl -mr-16 -mt-16" />
                  <div className="p-3 rounded-2xl bg-white/20 h-fit">
                    <AlertTriangle className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-lg font-black text-white truncate">{expiryNotification.title}</h4>
                    <p className="text-sm text-rose-50 opacity-90 line-clamp-3 mt-1 font-medium">{expiryNotification.message}</p>
                    <button 
                      onClick={() => setIsUpgradeModalOpen(true)}
                      className="mt-4 text-xs font-black uppercase tracking-widest bg-white text-rose-600 px-6 py-2 rounded-xl hover:bg-rose-50 transition-all shadow-md active:scale-95"
                    >
                      Renew Now
                    </button>
                  </div>
                </motion.div>
              )}
              {systemNotifications.map((notif) => (
                <motion.div 
                  key={notif.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white dark:bg-gray-900 p-6 rounded-3xl border-2 border-gray-100 dark:border-gray-800 shadow-md flex gap-4 group relative overflow-hidden transition-all hover:border-indigo-100 dark:hover:border-indigo-900/50"
                >
                  <div className={`p-3 rounded-2xl flex-shrink-0 h-fit ${
                    notif.type === 'info' ? 'bg-blue-50 text-blue-600' :
                    notif.type === 'warning' ? 'bg-amber-50 text-amber-600' :
                    notif.type === 'success' ? 'bg-emerald-50 text-emerald-600' :
                    'bg-rose-50 text-rose-600'
                  }`}>
                    {notif.type === 'info' && <Info className="w-6 h-6" />}
                    {notif.type === 'warning' && <AlertTriangle className="w-6 h-6" />}
                    {notif.type === 'success' && <CheckCircle2 className="w-6 h-6" />}
                    {notif.type === 'error' && <XCircle className="w-6 h-6" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4">
                      <h4 className="text-base font-black text-gray-900 dark:text-white line-clamp-1">{notif.title}</h4>
                      <button 
                        onClick={() => dismissNotification(notif.id)}
                        className="p-1.5 text-gray-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-all"
                        title="Dismiss"
                      >
                        <XCircle className="w-5 h-5" />
                      </button>
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 mt-2 font-medium leading-relaxed">
                      {notif.message}
                    </p>
                    <button 
                      onClick={() => setSelectedNotification(notif)}
                      className="mt-4 text-[10px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5 hover:gap-2 transition-all"
                    >
                      {i18n?.language === 'en' ? 'Read Full Message' : 'বিস্তারিত দেখুন'} <ChevronRight className="w-3 h-3" />
                    </button>
                    <p className="text-[10px] text-gray-400 mt-2">{new Date(notif.createdAt).toLocaleDateString()}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* Getting Started Checklist (Only for new users/empty data) */}
      {stats.students === 0 && stats.batches === 0 && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-[2.5rem] p-8 border border-gray-100 shadow-xl shadow-gray-100/50"
        >
          <div className="flex items-center gap-4 mb-8">
            <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-gray-900 tracking-tight">Getting Started</h2>
              <p className="text-gray-500 font-medium text-sm italic">Complete these simple steps to see your dashboard come to life.</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <ChecklistCard 
              step="1" 
              title="Add Institution" 
              desc="Enter your coaching details and upload logo."
              to="/institution"
              done={!!instData?.name}
            />
            <ChecklistCard 
              step="2" 
              title="Create Batch" 
              desc="Set up your first batch/class schedule."
              to="/batches"
              done={stats.batches > 0}
            />
            <ChecklistCard 
              step="3" 
              title="Add Student" 
              desc="Register your first student to the batch."
              to="/students"
              done={stats.students > 0}
            />
            <ChecklistCard 
              step="4" 
              title="Fee & Attendance" 
              desc="Start managing records and track growth."
              to="/attendance"
              done={stats.totalCollected > 0 || stats.attendanceRate > 0}
            />
          </div>
        </motion.div>
      )}

      {/* Batch Creation & Upgrade Prompt */}
      {user?.role === 'admin' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-indigo-600 rounded-2xl p-4 md:p-6 text-white relative overflow-hidden shadow-lg shadow-indigo-100"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 opacity-50" />
            <div className="relative z-10 flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-white/20 backdrop-blur-md rounded-lg flex items-center justify-center flex-shrink-0">
                  <Plus className="w-4 h-4" />
                </div>
                <h2 className="text-base font-bold leading-tight">{t('dashboard.startBatchTitle')}</h2>
              </div>
              <p className="text-indigo-100 text-xs opacity-90 line-clamp-1">
                {t('dashboard.startBatchDesc')}
              </p>
              <Link 
                to="/batches"
                className="w-fit px-4 py-2 bg-white text-indigo-600 rounded-lg font-bold hover:bg-indigo-50 transition-all shadow-md flex items-center gap-2 text-xs"
              >
                <Plus className="w-3 h-3" /> {t('dashboard.createBatch')}
              </Link>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl p-4 md:p-6 text-white relative overflow-hidden shadow-lg shadow-amber-100"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 opacity-50" />
            <div className="relative z-10 flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-white/20 backdrop-blur-md rounded-lg flex items-center justify-center flex-shrink-0">
                  <Zap className="w-4 h-4 fill-white" />
                </div>
                <h2 className="text-base font-bold leading-tight">{t('Upgrade to Premium')}</h2>
              </div>
              <p className="text-amber-50 text-xs opacity-90 line-clamp-1">
                {t('Unlock limits & premium features.')}
              </p>
              <button 
                onClick={() => setIsUpgradeModalOpen(true)}
                className="w-fit px-4 py-2 bg-white text-amber-600 rounded-lg font-bold hover:bg-amber-50 transition-all shadow-md flex items-center gap-2 text-xs"
              >
                <Zap className="w-3 h-3 fill-amber-600" /> {t('Upgrade Now')}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-3 md:gap-4">
        <StatItem label={t('dashboard.stats.totalStudents')} value={stats.students} icon={Users} color="indigo" to="/students" />
        <StatItem label={t('dashboard.stats.batches')} value={stats.batches} icon={Layers} color="emerald" to="/batches" />
        <StatItem label={t('dashboard.stats.offlineExams')} value={stats.offlineExams} icon={FileText} color="amber" to="/offline-exams" />
        <StatItem label={t('dashboard.stats.pendingResults')} value={stats.pendingResults} icon={AlertCircle} color="rose" to="/offline-exams" />
        <StatItem label={t('dashboard.stats.attendanceRate')} value={`${stats.attendanceRate}%`} icon={ClipboardCheck} color="indigo" to="/attendance" />
        {user?.role === 'admin' && (
          <>
            <StatItem label={t('dashboard.stats.totalCollected')} value={formatCurrency(stats.totalCollected)} icon={CreditCard} color="emerald" to="/fees" />
            <StatItem label="AI Credits" value={aiBalance} icon={Sparkles} color="purple" to="/offline-exams" />
          </>
        )}
      </div>

      {/* Plan Usage Section */}
      {user?.role === 'admin' && (
        <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600">
                <Zap className="w-6 h-6 fill-indigo-600" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">{t('Subscription Plan')}</h3>
                <p className="text-sm text-gray-500 font-medium">
                  {t('Current Plan')}: <span className="text-indigo-600 font-bold uppercase">{user?.subscriptionPlan || 'Free'}</span>
                </p>
              </div>
            </div>
            <button 
              onClick={() => setIsUpgradeModalOpen(true)}
              className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 flex items-center gap-2"
            >
              <Zap className="w-4 h-4 fill-white" /> {t('Upgrade Plan')}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Student Limit */}
            <div className="space-y-3">
              <div className="flex justify-between items-end">
                <div>
                  <p className="text-sm font-bold text-gray-900">{t('Student Limit')}</p>
                  <p className="text-xs text-gray-500 font-medium">{stats.students} / {currentPlan.studentLimit} {t('Students')}</p>
                </div>
                <p className="text-sm font-black text-indigo-600">
                  {Math.round((stats.students / currentPlan.studentLimit) * 100)}%
                </p>
              </div>
              <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(100, (stats.students / currentPlan.studentLimit) * 100)}%` }}
                  className={cn(
                    "h-full transition-all duration-1000",
                    (stats.students / currentPlan.studentLimit) > 0.9 ? "bg-rose-500" : "bg-indigo-600"
                  )}
                />
              </div>
            </div>

            {/* AI Credits Limit */}
            <div className="space-y-3">
              <div className="flex justify-between items-end">
                <div>
                  <p className="text-sm font-bold text-gray-900">{t('AI Credits Usage')}</p>
                  <p className="text-xs text-gray-500 font-medium">{aiBalance} {t('Credits Remaining')}</p>
                </div>
                <div className="text-right flex flex-col items-end gap-1">
                   <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">{t('Limit')}: {currentPlan.aiCreditLimit}</p>
                   <button 
                     onClick={() => setShowPricing(true)}
                     className="text-[10px] font-black text-indigo-600 uppercase tracking-widest hover:underline"
                   >
                     Top-up
                   </button>
                </div>
              </div>
              <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(100, (aiBalance / currentPlan.aiCreditLimit) * 100)}%` }}
                  className={cn(
                    "h-full transition-all duration-1000 bg-purple-600"
                  )}
                />
              </div>
            </div>

            {/* Batch Limit */}
            <div className="space-y-3">
              <div className="flex justify-between items-end">
                <div>
                  <p className="text-sm font-bold text-gray-900">{t('Batch Limit')}</p>
                  <p className="text-xs text-gray-500 font-medium">{stats.batches} / {currentPlan.batchLimit} {t('Batches')}</p>
                </div>
                <p className="text-sm font-black text-emerald-600">
                  {Math.round((stats.batches / currentPlan.batchLimit) * 100)}%
                </p>
              </div>
              <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(100, (stats.batches / currentPlan.batchLimit) * 100)}%` }}
                  className={cn(
                    "h-full transition-all duration-1000",
                    (stats.batches / currentPlan.batchLimit) > 0.9 ? "bg-rose-500" : "bg-emerald-600"
                  )}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <QuickAction 
          title={t('dashboard.quickActions.takeAttendance')} 
          description={t('dashboard.quickActions.takeAttendanceDesc')} 
          icon={ClipboardCheck} 
          to="/attendance" 
          color="bg-emerald-50 text-emerald-600"
        />
        <QuickAction 
          title={t('dashboard.quickActions.offlineExams')} 
          description={t('dashboard.quickActions.offlineExamsDesc')} 
          icon={FileText} 
          to="/offline-exams" 
          color="bg-amber-50 text-amber-600"
        />
        {user?.role === 'admin' && (
          <QuickAction 
            title={t('dashboard.quickActions.feeManagement')} 
            description={t('dashboard.quickActions.feeManagementDesc')} 
            icon={CreditCard} 
            to="/fees" 
            color="bg-rose-50 text-rose-600"
          />
        )}
        <QuickAction 
          title={t('dashboard.quickActions.students')} 
          description={t('dashboard.quickActions.studentsDesc')} 
          icon={Users} 
          to="/students" 
          color="bg-indigo-50 text-indigo-600"
        />
      </div>

      {/* Government Holidays Section */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden mb-8">
        <div className="p-6 border-b border-gray-50 flex items-center justify-between bg-emerald-50/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center">
              <Flag className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900">{i18n?.language === 'en' ? 'Upcoming Government Holidays' : 'আসন্ন সরকারি ছুটির তালিকা'}</h3>
              <p className="text-xs text-gray-500 font-medium">Gazetted holidays of Bangladesh (2026)</p>
            </div>
          </div>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {getUpcomingHolidays(6).map((holiday) => (
              <div key={holiday.date} className="flex items-center gap-4 p-4 rounded-2xl border border-gray-50 hover:bg-gray-50 transition-all group">
                <div className="w-12 h-12 rounded-xl bg-gray-50 flex flex-col items-center justify-center border border-gray-100 group-hover:bg-white transition-colors">
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-tighter">
                    {new Date(holiday.date).toLocaleDateString('en-US', { month: 'short' })}
                  </span>
                  <span className="text-lg font-black text-gray-900 leading-none">
                    {new Date(holiday.date).getDate()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-gray-900 truncate">
                    {i18n?.language === 'en' ? holiday.name : holiday.nameBn}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-bold uppercase tracking-wider ${
                      holiday.type === 'Public' ? 'bg-blue-50 text-blue-600' : 'bg-emerald-50 text-emerald-600'
                    }`}>
                      {holiday.type}
                    </span>
                    <span className="text-[10px] text-gray-400 font-medium">
                      {new Date(holiday.date).toLocaleDateString('en-US', { weekday: 'long' })}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Offline Exams */}
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-50 flex items-center justify-between">
            <h3 className="font-bold text-gray-900">{t('dashboard.recentExams')}</h3>
            <Link to="/offline-exams" className="text-sm font-bold text-indigo-600 hover:text-indigo-700">{t('dashboard.viewAll')}</Link>
          </div>
          {filteredExams.length > 0 ? (
            <div className="divide-y divide-gray-50">
              {filteredExams.map((exam) => (
                <div key={exam.id} className="p-4 hover:bg-gray-50 transition-colors flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-900">{exam.title}</p>
                      <p className="text-xs text-gray-500">{new Date(exam.date).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <span className={cn(
                    "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider",
                    exam.status === 'completed' ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"
                  )}>
                    {exam.status}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-12 flex flex-col items-center justify-center text-center space-y-4">
              <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center text-gray-300">
                <FileText className="w-8 h-8" />
              </div>
              <p className="text-gray-500 text-sm font-medium">{t('dashboard.noExams')}</p>
              <Link 
                to="/offline-exams"
                className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
              >
                {t('common.add')}
              </Link>
            </div>
          )}
        </div>

        {/* Recent Attendance */}
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-50 flex items-center justify-between">
            <h3 className="font-bold text-gray-900">{t('dashboard.recentAttendance')}</h3>
            <Link to="/attendance" className="text-sm font-bold text-indigo-600 hover:text-indigo-700">{t('dashboard.viewAll')}</Link>
          </div>
          {filteredAttendance.length > 0 ? (
            <div className="divide-y divide-gray-50">
              {filteredAttendance.map((record) => (
                <div key={record.id} className="p-4 hover:bg-gray-50 transition-colors flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
                      <ClipboardCheck className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-900">{record.studentName || 'Student'}</p>
                      <p className="text-xs text-gray-500">{new Date(record.date).toLocaleDateString()} • {record.grade}</p>
                    </div>
                  </div>
                  <span className={cn(
                    "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider",
                    record.status === 'present' ? "bg-emerald-50 text-emerald-600" : record.status === 'absent' ? "bg-rose-50 text-rose-600" : "bg-amber-50 text-amber-600"
                  )}>
                    {record.status}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-12 flex flex-col items-center justify-center text-center space-y-4">
              <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center text-gray-300">
                <ClipboardCheck className="w-8 h-8" />
              </div>
              <p className="text-gray-500 text-sm font-medium">{t('dashboard.noAttendance')}</p>
              <Link 
                to="/attendance"
                className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
              >
                {t('dashboard.quickActions.takeAttendance')}
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Quick Action Banner */}
      <div className="bg-white p-8 rounded-[3rem] border border-gray-100 dark:border-gray-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-8">
        <div className="flex items-center gap-6">
          <div className="w-16 h-16 bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl flex items-center justify-center text-emerald-600">
            <HelpCircle className="w-8 h-8" />
          </div>
          <div>
            <h4 className="text-2xl font-bold text-gray-900 dark:text-white">Need Support?</h4>
            <p className="text-gray-500 dark:text-gray-400">Join our community or chat with us for any help with the app.</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <Link 
            to="/help"
            className="px-8 py-4 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-2xl font-bold hover:scale-105 transition-transform"
          >
            Get Help
          </Link>
        </div>
      </div>

      <SubscriptionModal 
        isOpen={isUpgradeModalOpen} 
        onClose={() => setIsUpgradeModalOpen(false)} 
      />

      <CreditPricingModal 
        isOpen={showPricing} 
        onClose={() => setShowPricing(false)} 
      />

      {/* Welcome Modal */}
      <Modal
        isOpen={isWelcomeModalOpen}
        onClose={closeWelcomeModal}
        title="স্বাগতম! 🎉"
        maxWidth="max-w-md"
      >
        <div className="space-y-6">
          <div className="text-center space-y-4">
            <div className="flex justify-center">
              <div className="w-16 h-16 bg-indigo-100 rounded-3xl flex items-center justify-center text-indigo-600 shadow-lg shadow-indigo-100">
                <Sparkles className="w-8 h-8" />
              </div>
            </div>
            
            <div className="space-y-2">
              <h3 className="text-2xl font-black text-gray-900">আপনার প্রতিষ্ঠানের তথ্য দিন</h3>
              <p className="text-gray-500 font-medium text-sm">
                সঠিক নাম এবং ফোন নম্বর দিন যাতে আমরা আপনার সেবা নিশ্চিত করতে পারি।
              </p>
            </div>
          </div>

          <form onSubmit={handleWelcomeSubmit} className="space-y-4">
            {welcomeError && (
              <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl flex items-center gap-2 text-rose-600 text-xs font-bold animate-shake">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <p>{welcomeError}</p>
              </div>
            )}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">প্রতিষ্ঠানের নাম</label>
              <input 
                required
                type="text"
                placeholder="যেমন: আইডিয়াল কোচিং সেন্টার"
                value={welcomeForm.name}
                onChange={(e) => setWelcomeForm({ ...welcomeForm, name: e.target.value })}
                className="w-full px-5 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-bold"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">ফোন নম্বর</label>
              <input 
                required
                type="tel"
                placeholder="০১xxxxxxxxx"
                value={welcomeForm.phone}
                onChange={(e) => setWelcomeForm({ ...welcomeForm, phone: e.target.value })}
                className="w-full px-5 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-bold"
              />
            </div>

            <div className="p-4 bg-emerald-50 rounded-2xl flex items-start gap-3 border border-emerald-100 mt-2">
              <Gift className="w-5 h-5 text-emerald-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs text-emerald-900 font-bold">লঞ্চ অফার সচল আছে!</p>
                <p className="text-[10px] text-emerald-700 font-medium leading-relaxed">
                  তথ্য পূরণ করলেই ৩ মাসের ফ্রি প্রিমিয়াম এক্সেস এবং ২০০ জন ছাত্র লিমিট পাবেন।
                </p>
              </div>
            </div>

            <button
              type="submit"
              disabled={welcomeLoading || !welcomeForm.name.trim() || !welcomeForm.phone.trim()}
              className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 flex items-center justify-center gap-2 mt-4 disabled:opacity-50"
            >
              {welcomeLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>চলুন শুরু করি <ArrowUpRight className="w-4 h-4" /></>}
            </button>
          </form>
        </div>
      </Modal>

      {/* Notification Detail Modal */}
      <Modal
        isOpen={!!selectedNotification}
        onClose={() => setSelectedNotification(null)}
        title={selectedNotification?.title || t('common.notifications')}
        maxWidth="max-w-2xl"
      >
        <div className="space-y-6">
          <div className={cn(
            "p-8 rounded-[2rem] flex flex-col items-center justify-center text-center gap-4",
            selectedNotification?.type === 'info' ? 'bg-blue-50 text-blue-600' :
            selectedNotification?.type === 'warning' ? 'bg-amber-50 text-amber-600' :
            selectedNotification?.type === 'success' ? 'bg-emerald-50 text-emerald-600' :
            'bg-rose-50 text-rose-600'
          )}>
            <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center shadow-sm">
              {selectedNotification?.type === 'info' && <Info className="w-10 h-10" />}
              {selectedNotification?.type === 'warning' && <AlertTriangle className="w-10 h-10" />}
              {selectedNotification?.type === 'success' && <CheckCircle2 className="w-10 h-10" />}
              {selectedNotification?.type === 'error' && <XCircle className="w-10 h-10" />}
            </div>
            <div>
              <h3 className="text-2xl font-black text-gray-900">{selectedNotification?.title}</h3>
              <p className="text-xs font-bold uppercase tracking-widest opacity-60 mt-2">
                {selectedNotification?.createdAt ? new Date(selectedNotification.createdAt).toLocaleDateString(i18n?.language === 'bn' ? 'bn-BD' : 'en-US', { day: 'numeric', month: 'long', year: 'numeric' }) : ''}
              </p>
            </div>
          </div>

          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-[2rem] p-8 border border-gray-100 dark:border-gray-700">
            <p className="text-lg text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap font-medium">
              {selectedNotification?.message}
            </p>
          </div>

          <button
            onClick={() => setSelectedNotification(null)}
            className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 dark:shadow-none flex items-center justify-center gap-2 active:scale-[0.98]"
          >
             {t('common.done')}
          </button>
        </div>
      </Modal>

      <Modal isOpen={isBirthdayModalOpen} onClose={() => setIsBirthdayModalOpen(false)} title="Birthday Card Generator" maxWidth="max-w-4xl">
        <div className="flex flex-col lg:flex-row gap-8 py-4">
          <div className="lg:w-1/3 space-y-6">
            <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100">
               <p className="text-sm text-amber-700 leading-relaxed font-medium">
                 Tip: Send this card to the parents on WhatsApp. They will likely share it on their status, giving your coaching center free exposure!
               </p>
            </div>
            <button 
              onClick={handleDownloadBirthdayCard}
              disabled={isGenerating}
              className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-indigo-700 disabled:opacity-50"
            >
              {isGenerating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
              {t('marketing.social.download')}
            </button>
          </div>

          <div className="lg:w-2/3 flex justify-center bg-gray-50 p-8 rounded-3xl border-2 border-dashed border-gray-200 overflow-hidden">
            <div 
              ref={birthdayRef}
              className="w-[1080px] h-[1080px] bg-white relative overflow-hidden flex flex-col items-center justify-center p-12 text-center"
              style={{ backgroundColor: instData?.primaryColor || '#4f46e5' }}
            >
              <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 10px 10px, white 2px, transparent 0)', backgroundSize: '40px 40px' }} />
              
              <div className="bg-white/95 backdrop-blur-md rounded-[80px] p-20 flex flex-col items-center w-full h-full shadow-2xl relative z-10 border border-white/30">
                <div className="flex items-center justify-between w-full mb-16">
                   {instData?.logoUrl && <img src={instData.logoUrl} className="h-20 object-contain" referrerPolicy="no-referrer" />}
                   <div className="text-right">
                     <h2 className="text-2xl font-black text-gray-900 leading-none uppercase tracking-tight">{instData?.name}</h2>
                     <p className="text-sm text-gray-500 font-bold uppercase tracking-widest mt-1">Nurturing Excellence</p>
                   </div>
                </div>

                <div className="relative mb-16">
                   <div className="absolute -inset-8 bg-amber-400/30 rounded-full blur-2xl animate-pulse" />
                   <img 
                    src={selectedStudentForBirthday?.photoUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${selectedStudentForBirthday?.name}`} 
                    className="w-72 h-72 rounded-full object-cover border-[10px] border-white shadow-2xl relative z-10"
                    referrerPolicy="no-referrer"
                   />
                   <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-rose-500 rounded-full flex items-center justify-center text-white shadow-xl z-20 border-4 border-white">
                      <Gift className="w-12 h-12" />
                   </div>
                </div>

                <div className="space-y-6 flex-1 flex flex-col justify-center">
                   <h1 className="text-7xl font-black text-gray-900 tracking-tighter uppercase leading-none italic">HAPPY BIRTHDAY</h1>
                   <div className="h-2 w-48 bg-amber-400 mx-auto rounded-full" />
                   <p className="text-5xl font-black text-indigo-600 uppercase tracking-tight mt-4">{selectedStudentForBirthday?.name}</p>
                   <p className="text-2xl text-gray-400 font-bold uppercase tracking-widest mt-2">{t('Wishing you a year full of success and joy!')}</p>
                </div>

                <div className="mt-16 flex items-center justify-between w-full border-t border-gray-100 pt-10">
                   <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest italic leading-none">Powered by</p>
                        <p className="text-xl font-black text-indigo-600 tracking-tighter leading-none mt-1">Manage My Batch</p>
                      </div>
                      <BoxIcon className="w-8 h-8 text-indigo-600" />
                   </div>
                   <div className="flex items-center gap-4 text-right">
                      <Sparkles className="w-8 h-8 text-amber-400" />
                      <div>
                        <p className="text-sm font-black text-gray-900 leading-tight uppercase">Special Day!</p>
                        <p className="text-[10px] font-bold text-gray-400 font-mono italic">A Proud Student</p>
                      </div>
                   </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function StatItem({ label, value, icon: Icon, color, to }: { label: string, value: string | number, icon: any, color: string, to: string }) {
  const colors = {
    indigo: "bg-indigo-50 text-indigo-600 border-indigo-100 group-hover:bg-indigo-600 group-hover:text-white",
    emerald: "bg-emerald-50 text-emerald-600 border-emerald-100 group-hover:bg-emerald-600 group-hover:text-white",
    amber: "bg-amber-50 text-amber-600 border-amber-100 group-hover:bg-amber-600 group-hover:text-white",
    rose: "bg-rose-50 text-rose-600 border-rose-100 group-hover:bg-rose-600 group-hover:text-white",
  };

  return (
    <Link to={to} className="group">
      <div className="bg-white p-3 md:p-5 rounded-2xl md:rounded-3xl border border-gray-100 shadow-sm group-hover:shadow-xl group-hover:shadow-indigo-100/50 group-hover:border-indigo-200 transition-all duration-300 flex flex-col items-center text-center space-y-2 md:space-y-3">
        <div className={cn("w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl flex items-center justify-center transition-all duration-300", colors[color as keyof typeof colors])}>
          <Icon className="w-5 h-5 md:w-6 md:h-6" />
        </div>
        <div>
          <p className="text-[8px] md:text-[10px] font-black text-gray-400 uppercase tracking-widest mb-0.5 md:mb-1">{label}</p>
          <p className="text-lg md:text-2xl font-black text-gray-900 group-hover:text-indigo-600 transition-colors">{value}</p>
        </div>
      </div>
    </Link>
  );
}

function QuickAction({ title, description, icon: Icon, to, color }: { title: string, description: string, icon: any, to: string, color: string }) {
  return (
    <Link to={to} className="group">
      <div className="bg-white p-4 md:p-6 rounded-2xl md:rounded-3xl border border-gray-100 shadow-sm group-hover:shadow-md group-hover:border-indigo-100 transition-all flex flex-col items-center text-center space-y-3 md:space-y-4">
        <div className={cn("w-12 h-12 md:w-14 md:h-14 rounded-xl md:rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110", color)}>
          <Icon className="w-6 h-6 md:w-7 md:h-7" />
        </div>
        <div>
          <h4 className="text-sm md:text-base font-bold text-gray-900 group-hover:text-indigo-600 transition-colors">{title}</h4>
          <p className="text-[10px] md:text-xs text-gray-500 mt-1">{description}</p>
        </div>
        <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-indigo-400 transition-colors hidden md:block" />
      </div>
    </Link>
  );
}

function ChecklistCard({ step, title, desc, to, done }: { step: string, title: string, desc: string, to: string, done: boolean }) {
  const { t } = useTranslation();
  return (
    <Link to={to} className={cn(
      "p-5 rounded-3xl border-2 transition-all group",
      done ? "bg-emerald-50 border-emerald-100 opacity-75" : "bg-gray-50 border-transparent hover:border-indigo-200 hover:bg-white"
    )}>
      <div className="flex items-center justify-between mb-3">
        <span className={cn(
          "w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black tracking-widest",
          done ? "bg-emerald-500 text-white" : "bg-gray-200 text-gray-500 group-hover:bg-indigo-600 group-hover:text-white"
        )}>
          {done ? <CheckCircle2 className="w-4 h-4" /> : step}
        </span>
        {done && <span className="text-[10px] font-black text-emerald-600 uppercase">{t('common.done')}</span>}
      </div>
      <h4 className={cn("font-black text-sm", done ? "text-emerald-900" : "text-gray-900")}>{title}</h4>
      <p className="text-[10px] text-gray-500 mt-1 font-medium leading-relaxed">{desc}</p>
    </Link>
  );
}
