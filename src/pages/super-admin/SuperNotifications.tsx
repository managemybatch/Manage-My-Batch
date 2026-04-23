import React, { useState, useEffect } from 'react';
import { db, handleFirestoreError, OperationType } from '../../firebase';
import { collection, query, orderBy, limit, onSnapshot, addDoc, deleteDoc, doc } from 'firebase/firestore';
import { useAuth } from '../../lib/auth';
import { 
  Bell, 
  Send, 
  Trash2, 
  Info, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle,
  Clock
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Toast, ToastType } from '../../components/Toast';
import { ConfirmModal } from '../../components/ConfirmModal';

export function SuperNotifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: ToastType; isVisible: boolean }>({
    message: '',
    type: 'success',
    isVisible: false
  });
  const [confirmDelete, setConfirmDelete] = useState<{ isOpen: boolean; id: string | null }>({
    isOpen: false,
    id: null
  });
  const [newNotif, setNewNotif] = useState({
    title: '',
    message: '',
    type: 'info' as 'info' | 'warning' | 'success' | 'error',
    scheduledAt: ''
  });

  useEffect(() => {
    setLoading(true);
    const q = query(
      collection(db, 'super_notifications'),
      orderBy('createdAt', 'desc'),
      limit(20)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setNotifications(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'super_notifications');
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNotif.title || !newNotif.message || isSending) return;

    setIsSending(true);
    try {
      await addDoc(collection(db, 'super_notifications'), {
        ...newNotif,
        scheduledAt: newNotif.scheduledAt || new Date().toISOString(),
        createdAt: new Date().toISOString(),
        createdBy: user?.uid,
        createdByName: user?.displayName
      });
      
      setNewNotif({ title: '', message: '', type: 'info', scheduledAt: '' });
      setToast({
        message: "Notification broadcasted successfully",
        type: 'success',
        isVisible: true
      });
    } catch (error: any) {
      handleFirestoreError(error, OperationType.WRITE, 'super_notifications');
      setToast({
        message: error.message || "Error sending notification",
        type: 'error',
        isVisible: true
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete.id) return;
    try {
      await deleteDoc(doc(db, 'super_notifications', confirmDelete.id));
      
      setToast({
        message: "Notification deleted successfully",
        type: 'success',
        isVisible: true
      });
      setConfirmDelete({ isOpen: false, id: null });
    } catch (error: any) {
      handleFirestoreError(error, OperationType.DELETE, 'super_notifications');
      setToast({
        message: error.message || "Error deleting notification",
        type: 'error',
        isVisible: true
      });
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">System Notifications</h1>
        <p className="text-gray-500 dark:text-gray-400">Send global announcements to all coaching owners.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-gray-900 p-6 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm sticky top-24">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
              <Send className="w-5 h-5 text-indigo-600" /> New Announcement
            </h3>
            <form onSubmit={handleSend} className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Title</label>
                <input 
                  type="text"
                  required
                  value={newNotif.title}
                  onChange={(e) => setNewNotif({ ...newNotif, title: e.target.value })}
                  placeholder="e.g. System Maintenance"
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border-none rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Type</label>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest px-1">Type</label>
                    <select
                      value={newNotif.type}
                      onChange={(e) => setNewNotif({ ...newNotif, type: e.target.value as any })}
                      className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border-none rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-xs"
                    >
                      <option value="info">Info</option>
                      <option value="success">Feature</option>
                      <option value="warning">Alert</option>
                      <option value="error">Critical</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest px-1 flex items-center gap-1.5 leading-none">
                      <Clock className="w-3 h-3" /> Schedule
                    </label>
                    <input
                      type="datetime-local"
                      value={newNotif.scheduledAt}
                      onChange={(e) => setNewNotif({ ...newNotif, scheduledAt: e.target.value })}
                      className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border-none rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-[11px]"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Message</label>
                <textarea 
                  required
                  rows={4}
                  value={newNotif.message}
                  onChange={(e) => setNewNotif({ ...newNotif, message: e.target.value })}
                  placeholder="Type your message here..."
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border-none rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                />
              </div>

              <button 
                type="submit"
                disabled={isSending}
                className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 dark:shadow-none flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isSending ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Send className="w-5 h-5" />}
                Broadcast Message
              </button>
            </form>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-4">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Clock className="w-5 h-5 text-gray-400" /> Recent Broadcasts
          </h3>
          <div className="space-y-4">
            {loading ? (
              <div className="py-12 text-center">
                <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
              </div>
            ) : notifications.length === 0 ? (
              <div className="bg-white dark:bg-gray-900 p-12 rounded-3xl border border-dashed border-gray-200 dark:border-gray-800 text-center text-gray-500">
                No notifications sent yet.
              </div>
            ) : notifications.map((notif) => (
              <motion.div 
                key={notif.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-white dark:bg-gray-900 p-6 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm group relative"
              >
                <div className="flex items-start gap-4">
                  <div className={`p-3 rounded-2xl flex-shrink-0 ${
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
                  <div className="flex-1 min-w-0 pr-10">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h4 className="font-bold text-gray-900 dark:text-white">{notif.title}</h4>
                      {notif.scheduledAt && new Date(notif.scheduledAt) > new Date() && (
                        <span className="px-2 py-0.5 bg-amber-100 text-amber-600 rounded-full text-[9px] font-black uppercase tracking-widest animate-pulse flex items-center gap-1">
                          <Clock className="w-2.5 h-2.5" /> Scheduled: {new Date(notif.scheduledAt).toLocaleString()}
                        </span>
                      )}
                      <span className="text-[10px] text-gray-400 font-medium">
                        (Created: {new Date(notif.createdAt).toLocaleString()})
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                      {notif.message}
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => setConfirmDelete({ isOpen: true, id: notif.id })}
                  className="absolute top-6 right-6 p-2 text-gray-300 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      <ConfirmModal 
        isOpen={confirmDelete.isOpen}
        onClose={() => setConfirmDelete({ isOpen: false, id: null })}
        onConfirm={handleDelete}
        title="Delete Notification"
        message="Are you sure you want to delete this notification? This will not remove it from users who have already seen it, but it will stop showing for others."
        confirmText="Delete Notification"
        variant="danger"
      />

      <Toast 
        message={toast.message}
        type={toast.type}
        isVisible={toast.isVisible}
        onClose={() => setToast({ ...toast, isVisible: false })}
      />
    </div>
  );
}
