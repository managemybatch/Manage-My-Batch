import React, { useState, useEffect } from 'react';
import { db, handleFirestoreError, OperationType } from '../../firebase';
import { collection, query, getDocs, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, orderBy } from 'firebase/firestore';
import { Book, Plus, Search, Trash2, Edit2, CheckCircle2, XCircle, Loader2, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';
import { GRADES } from '../../constants';

interface SystemKnowledge {
  id: string;
  title: string;
  grade: string;
  subject: string;
  contentSummary: string;
  isActive: boolean;
  updatedAt: any;
}

export function ManageKnowledge() {
  const [knowledgeList, setKnowledgeList] = useState<SystemKnowledge[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingKnowledge, setEditingKnowledge] = useState<SystemKnowledge | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    grade: GRADES[0],
    subject: '',
    contentSummary: '',
    isActive: true
  });

  useEffect(() => {
    fetchKnowledge();
  }, []);

  async function fetchKnowledge() {
    try {
      const q = query(collection(db, 'system_knowledge'), orderBy('updatedAt', 'desc'));
      const snap = await getDocs(q);
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as SystemKnowledge[];
      setKnowledgeList(data);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'system_knowledge');
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSaving(true);
    try {
      const data = {
        ...formData,
        updatedAt: serverTimestamp()
      };

      if (editingKnowledge) {
        await updateDoc(doc(db, 'system_knowledge', editingKnowledge.id), data);
      } else {
        await addDoc(collection(db, 'system_knowledge'), data);
      }
      
      setIsModalOpen(false);
      setEditingKnowledge(null);
      setFormData({ title: '', grade: GRADES[0], subject: '', contentSummary: '', isActive: true });
      fetchKnowledge();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'system_knowledge');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this knowledge base?')) return;
    try {
      await deleteDoc(doc(db, 'system_knowledge', id));
      fetchKnowledge();
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'system_knowledge');
    }
  }

  const filteredKnowledge = knowledgeList.filter(k => 
    k.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    k.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
    k.grade.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">AI Knowledge Base</h1>
          <p className="text-gray-500 font-medium">Manage the training data for study sheet generation</p>
        </div>
        <button
          onClick={() => {
            setEditingKnowledge(null);
            setFormData({ title: '', grade: GRADES[0], subject: '', contentSummary: '', isActive: true });
            setIsModalOpen(true);
          }}
          className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-2xl font-bold shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-95"
        >
          <Plus className="w-5 h-5" /> Add New Material
        </button>
      </div>

      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-6 border-bottom border-gray-100 flex flex-col md:flex-row gap-4 items-center justify-between bg-gray-50/50">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by title, subject or class..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none text-sm font-medium"
            />
          </div>
          <div className="flex items-center gap-2 text-xs font-black text-gray-400 uppercase tracking-widest">
            <Info className="w-4 h-4" />
            {filteredKnowledge.length} Resources Active
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50/50">
                <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Material</th>
                <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Class & Subject</th>
                <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Content Status</th>
                <th className="px-6 py-4 text-right text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-gray-500 font-medium">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-indigo-600" />
                    Loading knowledge base...
                  </td>
                </tr>
              ) : filteredKnowledge.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-gray-500 font-medium">
                    No resources found. Add your first knowledge source.
                  </td>
                </tr>
              ) : (
                filteredKnowledge.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50/50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 shrink-0">
                          <Book className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="font-bold text-gray-900 leading-none">{item.title}</p>
                          <p className="text-xs text-gray-500 mt-1">Last updated: {item.updatedAt?.toDate().toLocaleDateString()}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-lg text-[10px] font-bold uppercase">{item.grade}</span>
                        <span className="px-2 py-1 bg-amber-50 text-amber-600 rounded-lg text-[10px] font-bold uppercase tracking-wide">{item.subject}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {item.isActive ? (
                          <span className="flex items-center gap-1 text-emerald-600 text-xs font-bold">
                            <CheckCircle2 className="w-4 h-4" /> Active
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-gray-400 text-xs font-bold">
                            <XCircle className="w-4 h-4" /> Disabled
                          </span>
                        )}
                        <span className="text-[10px] text-gray-400 font-medium">
                          ({item.contentSummary.length} chars)
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => {
                            setEditingKnowledge(item);
                            setFormData({
                              title: item.title,
                              grade: item.grade,
                              subject: item.subject,
                              contentSummary: item.contentSummary,
                              isActive: item.isActive
                            });
                            setIsModalOpen(true);
                          }}
                          className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="p-2 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl bg-white rounded-[2rem] shadow-2xl overflow-hidden"
            >
              <div className="p-8">
                <h2 className="text-2xl font-black text-gray-900 tracking-tight mb-6">
                  {editingKnowledge ? 'Edit Knowledge Base' : 'Add New Knowledge Base'}
                </h2>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Context Title</label>
                      <input
                        type="text"
                        required
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        placeholder="e.g. NCERT Physics Class 9"
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-medium"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Subject Name</label>
                      <input
                        type="text"
                        required
                        value={formData.subject}
                        onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                        placeholder="e.g. Physics"
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-medium"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Grade Level</label>
                    <div className="flex flex-wrap gap-2">
                      {GRADES.map((g) => (
                        <button
                          key={g}
                          type="button"
                          onClick={() => setFormData({ ...formData, grade: g })}
                          className={cn(
                            "px-4 py-2 rounded-xl text-xs font-bold transition-all border",
                            formData.grade === g
                              ? "bg-indigo-600 text-white border-indigo-600"
                              : "bg-gray-50 text-gray-500 border-gray-100 hover:border-indigo-200"
                          )}
                        >
                          {g}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Content Summary / Knowledge Text (Max 1MB)</label>
                    <textarea
                      required
                      rows={8}
                      value={formData.contentSummary}
                      onChange={(e) => setFormData({ ...formData, contentSummary: e.target.value })}
                      placeholder="Paste textbook summary, key chapters, or specific content... Note: Please don't paste entire books here, just the core content summaries to save space and for better AI responses."
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-medium resize-none text-sm leading-relaxed"
                    />
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                        Note: This text acts as the "source of truth" for the AI.
                      </p>
                      <p className={cn(
                        "text-[10px] font-bold uppercase",
                        formData.contentSummary.length > 500000 ? "text-rose-500" : "text-gray-400"
                       )}>
                        {Math.round(formData.contentSummary.length / 1024)} KB / 1024 KB
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 bg-gray-50 p-4 rounded-2xl border border-gray-100">
                    <input
                      type="checkbox"
                      id="isActive"
                      checked={formData.isActive}
                      onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                      className="w-5 h-5 rounded-lg border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <label htmlFor="isActive" className="text-sm font-bold text-gray-700">Active and available for selection</label>
                  </div>

                  <div className="flex gap-4 pt-4">
                    <button
                      type="button"
                      onClick={() => setIsModalOpen(false)}
                      className="flex-1 px-8 py-4 bg-gray-100 text-gray-600 rounded-[1.5rem] font-bold hover:bg-gray-200 transition-all active:scale-95"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSaving}
                      className="flex-1 px-8 py-4 bg-indigo-600 text-white rounded-[1.5rem] font-black shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-95 disabled:opacity-50 disabled:scale-100 flex items-center justify-center gap-2"
                    >
                      {isSaving && <Loader2 className="w-5 h-5 animate-spin" />}
                      {editingKnowledge ? 'Update Material' : 'Save Material'}
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
