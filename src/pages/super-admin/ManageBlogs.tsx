import React, { useState, useEffect } from 'react';
import { Plus, Search, Filter, MoreVertical, FileText, CheckCircle2, XCircle, Loader2, Image as ImageIcon, Globe, Share2, Tag, Calendar, User, Eye, Edit, Trash2, Bold, Italic, List, ListOrdered, Heading1, Heading2, Heading3, Link as LinkIcon, Quote, Code } from 'lucide-react';
import { Table, TableRow, TableCell } from '../../components/Table';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';
import { collection, onSnapshot, query, addDoc, updateDoc, serverTimestamp, deleteDoc, doc, where, orderBy, limit } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../firebase';
import { useAuth } from '../../lib/auth';
import { Modal } from '../../components/Modal';
import { ConfirmModal } from '../../components/ConfirmModal';

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  content: string;
  excerpt: string;
  coverImage?: string;
  metaTitle?: string;
  metaDescription?: string;
  status: 'draft' | 'published';
  authorId: string;
  authorName: string;
  tags: string[];
  createdAt: any;
  updatedAt: any;
}

export function ManageBlogs() {
  const { user } = useAuth();
  const [blogs, setBlogs] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [blogToDelete, setBlogToDelete] = useState<string | null>(null);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    slug: '',
    content: '',
    excerpt: '',
    coverImage: '',
    metaTitle: '',
    metaDescription: '',
    status: 'draft' as 'draft' | 'published',
    tags: ''
  });

  const [editingBlog, setEditingBlog] = useState<BlogPost | null>(null);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  const insertMarkdown = (prefix: string, suffix: string = '') => {
    if (!textareaRef.current) return;
    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const before = text.substring(0, start);
    const selection = text.substring(start, end);
    const after = text.substring(end);

    const newText = before + prefix + selection + suffix + after;
    setFormData(prev => ({ ...prev, content: newText }));
    
    // Reset focus and selection
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, end + prefix.length);
    }, 0);
  };

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'blogs'),
      orderBy('createdAt', 'desc'),
      limit(50)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const blogData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as BlogPost[];
      setBlogs(blogData);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'blogs');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const title = e.target.value;
    setFormData(prev => ({
      ...prev,
      title,
      slug: prev.slug === generateSlug(prev.title) ? generateSlug(title) : prev.slug,
      metaTitle: prev.metaTitle === prev.title ? title : prev.metaTitle
    }));
  };

  const handleAddBlog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || isSaving) return;

    setIsSaving(true);
    try {
      const blogData = {
        ...formData,
        tags: formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag !== ''),
        authorId: user.uid,
        authorName: user.displayName || 'Admin',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      await addDoc(collection(db, 'blogs'), blogData);
      setIsAddModalOpen(false);
      resetForm();
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'blogs');
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditBlog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !editingBlog || isSaving) return;

    setIsSaving(true);
    try {
      const blogData = {
        ...formData,
        tags: formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag !== ''),
        updatedAt: serverTimestamp()
      };

      await updateDoc(doc(db, 'blogs', editingBlog.id), blogData);
      setIsEditModalOpen(false);
      resetForm();
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `blogs/${editingBlog.id}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteBlog = async () => {
    if (!blogToDelete || isSaving) return;

    setIsSaving(true);
    try {
      await deleteDoc(doc(db, 'blogs', blogToDelete));
      setIsDeleteModalOpen(false);
      setBlogToDelete(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `blogs/${blogToDelete}`);
    } finally {
      setIsSaving(false);
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      slug: '',
      content: '',
      excerpt: '',
      coverImage: '',
      metaTitle: '',
      metaDescription: '',
      status: 'draft',
      tags: ''
    });
    setEditingBlog(null);
  };

  const filteredBlogs = blogs.filter(blog =>
    blog.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    blog.slug.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">Blog Management</h1>
          <p className="text-gray-500 mt-1 font-medium text-sm">Create and optimize articles for your platform.</p>
        </div>
        <button 
          onClick={() => {
            resetForm();
            setIsAddModalOpen(true);
          }}
          className="flex items-center justify-center gap-2 px-6 py-3.5 text-sm font-black text-white bg-indigo-600 rounded-2xl hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-200 uppercase tracking-widest"
        >
          <Plus className="w-5 h-5" />
          Create New Post
        </button>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1 group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-indigo-500 transition-colors" />
          <input 
            type="text"
            placeholder="Search by title or slug..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-4 bg-white border border-gray-100 rounded-2xl text-sm font-medium focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all shadow-sm"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
        </div>
      ) : (
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
          <Table headers={['Post Info', 'Author', 'Status', 'SEO Info', 'Actions']}>
            {filteredBlogs.map((blog) => (
              <TableRow key={blog.id}>
                <TableCell>
                  <div className="flex items-center gap-4">
                    {blog.coverImage ? (
                      <img src={blog.coverImage} className="w-12 h-12 rounded-xl object-cover border border-gray-100" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="w-12 h-12 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400">
                        <ImageIcon className="w-6 h-6" />
                      </div>
                    )}
                    <div>
                      <h4 className="font-bold text-gray-900 group-hover:text-indigo-600 transition-colors">{blog.title}</h4>
                      <p className="text-xs text-gray-500 font-mono">/{blog.slug}</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold text-xs">
                      {blog.authorName.charAt(0)}
                    </div>
                    <span className="text-sm font-medium text-gray-700">{blog.authorName}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <span className={cn(
                    "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest",
                    blog.status === 'published' ? "bg-emerald-50 text-emerald-600" : "bg-orange-50 text-orange-600"
                  )}>
                    {blog.status}
                  </span>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-1.5 text-xs text-gray-500">
                      <Globe className="w-3 h-3" /> {blog.metaTitle ? "Title Set" : "No Meta Title"}
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-gray-500">
                      <Tag className="w-3 h-3" /> {blog.tags.length} Tags
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => {
                        setEditingBlog(blog);
                        setFormData({
                          title: blog.title,
                          slug: blog.slug,
                          content: blog.content,
                          excerpt: blog.excerpt,
                          coverImage: blog.coverImage || '',
                          metaTitle: blog.metaTitle || '',
                          metaDescription: blog.metaDescription || '',
                          status: blog.status,
                          tags: blog.tags.join(', ')
                        });
                        setIsEditModalOpen(true);
                      }}
                      className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                      title="Edit Post"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => {
                        setBlogToDelete(blog.id);
                        setIsDeleteModalOpen(true);
                      }}
                      className="p-2 text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                      title="Delete Post"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </Table>
        </div>
      )}

      {/* Add Blog Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Create New Blog Post"
        maxWidth="max-w-4xl"
      >
        <form onSubmit={handleAddBlog} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="text-xs font-black text-gray-500 uppercase tracking-widest mb-1 block">Title</label>
                <input 
                  type="text" required
                  value={formData.title}
                  onChange={handleTitleChange}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm font-medium focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all"
                  placeholder="The Future of Coaching Centers..."
                />
              </div>
              <div>
                <label className="text-xs font-black text-gray-500 uppercase tracking-widest mb-1 block">Slug (URL)</label>
                <input 
                  type="text" required
                  value={formData.slug}
                  onChange={(e) => setFormData({...formData, slug: e.target.value})}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm font-mono focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-medium"
                  placeholder="future-of-coaching"
                />
              </div>
              <div>
                <label className="text-xs font-black text-gray-500 uppercase tracking-widest mb-1 block">Cover Image URL</label>
                <input 
                  type="url"
                  value={formData.coverImage}
                  onChange={(e) => setFormData({...formData, coverImage: e.target.value})}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm font-medium focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all"
                  placeholder="https://images.unsplash.com/..."
                />
              </div>
              <div>
                <label className="text-xs font-black text-gray-500 uppercase tracking-widest mb-1 block">Tags (comma separated)</label>
                <input 
                  type="text"
                  value={formData.tags}
                  onChange={(e) => setFormData({...formData, tags: e.target.value})}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm font-medium focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all"
                  placeholder="Coaching, Education, Technology"
                />
              </div>
              <div>
                <label className="text-xs font-black text-gray-500 uppercase tracking-widest mb-1 block">Excerpt (Summary)</label>
                <textarea 
                  rows={3} required
                  value={formData.excerpt}
                  onChange={(e) => setFormData({...formData, excerpt: e.target.value})}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm font-medium focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all"
                  placeholder="A short summary for search results and cards..."
                />
              </div>
            </div>

            <div className="space-y-4 p-6 bg-indigo-50/50 rounded-3xl border border-indigo-100">
              <div className="flex items-center gap-2 mb-2 text-indigo-600">
                <Globe className="w-5 h-5" />
                <h3 className="font-black text-sm uppercase tracking-widest">SEO Optimization</h3>
              </div>
              <div>
                <label className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1 block">Meta Title</label>
                <input 
                  type="text"
                  value={formData.metaTitle}
                  onChange={(e) => setFormData({...formData, metaTitle: e.target.value})}
                  className="w-full px-4 py-3 bg-white border border-indigo-100 rounded-xl text-sm font-medium focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all shadow-sm"
                  placeholder="Best Meta Title for SEO"
                />
              </div>
              <div>
                <label className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1 block">Meta Description</label>
                <textarea 
                  rows={4}
                  value={formData.metaDescription}
                  onChange={(e) => setFormData({...formData, metaDescription: e.target.value})}
                  className="w-full px-4 py-3 bg-white border border-indigo-100 rounded-xl text-sm font-medium focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all shadow-sm"
                  placeholder="Compelling meta description for Google results..."
                />
              </div>
              <div>
                <label className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1 block">Publishing Status</label>
                <select 
                  value={formData.status}
                  onChange={(e) => setFormData({...formData, status: e.target.value as 'draft' | 'published'})}
                  className="w-full px-4 py-3 bg-white border border-indigo-100 rounded-xl text-sm font-bold text-gray-700 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all shadow-sm"
                >
                  <option value="draft">Draft (Private)</option>
                  <option value="published">Published (Public)</option>
                </select>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-black text-gray-500 uppercase tracking-widest block">Content (Editor)</label>
              <div className="flex items-center gap-1 bg-white border border-gray-100 rounded-xl p-1 shadow-sm">
                <button type="button" onClick={() => insertMarkdown('# ', '')} className="p-1.5 hover:bg-indigo-50 text-gray-600 hover:text-indigo-600 rounded-lg transition-colors" title="Heading 1"><Heading1 className="w-4 h-4" /></button>
                <button type="button" onClick={() => insertMarkdown('## ', '')} className="p-1.5 hover:bg-indigo-50 text-gray-600 hover:text-indigo-600 rounded-lg transition-colors" title="Heading 2"><Heading2 className="w-4 h-4" /></button>
                <button type="button" onClick={() => insertMarkdown('### ', '')} className="p-1.5 hover:bg-indigo-50 text-gray-600 hover:text-indigo-600 rounded-lg transition-colors" title="Heading 3"><Heading3 className="w-4 h-4" /></button>
                <div className="w-px h-4 bg-gray-100 mx-1" />
                <button type="button" onClick={() => insertMarkdown('**', '**')} className="p-1.5 hover:bg-indigo-50 text-gray-600 hover:text-indigo-600 rounded-lg transition-colors" title="Bold"><Bold className="w-4 h-4" /></button>
                <button type="button" onClick={() => insertMarkdown('*', '*')} className="p-1.5 hover:bg-indigo-50 text-gray-600 hover:text-indigo-600 rounded-lg transition-colors" title="Italic"><Italic className="w-4 h-4" /></button>
                <button type="button" onClick={() => insertMarkdown('\n- ', '')} className="p-1.5 hover:bg-indigo-50 text-gray-600 hover:text-indigo-600 rounded-lg transition-colors" title="Bullet List"><List className="w-4 h-4" /></button>
                <button type="button" onClick={() => insertMarkdown('\n1. ', '')} className="p-1.5 hover:bg-indigo-50 text-gray-600 hover:text-indigo-600 rounded-lg transition-colors" title="Numbered List"><ListOrdered className="w-4 h-4" /></button>
                <div className="w-px h-4 bg-gray-100 mx-1" />
                <button type="button" onClick={() => insertMarkdown('[', '](url)')} className="p-1.5 hover:bg-indigo-50 text-gray-600 hover:text-indigo-600 rounded-lg transition-colors" title="Link"><LinkIcon className="w-4 h-4" /></button>
                <button type="button" onClick={() => insertMarkdown('\n> ', '')} className="p-1.5 hover:bg-indigo-50 text-gray-600 hover:text-indigo-600 rounded-lg transition-colors" title="Quote"><Quote className="w-4 h-4" /></button>
                <button type="button" onClick={() => insertMarkdown('`', '`')} className="p-1.5 hover:bg-indigo-50 text-gray-600 hover:text-indigo-600 rounded-lg transition-colors" title="Code"><Code className="w-4 h-4" /></button>
              </div>
            </div>
            <textarea 
              ref={textareaRef}
              rows={15} required
              value={formData.content}
              onChange={(e) => setFormData({...formData, content: e.target.value})}
              className="w-full px-6 py-5 bg-gray-50 border border-gray-100 rounded-3xl text-sm font-medium focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-mono leading-relaxed"
              placeholder="# Heading 1\n\nYour article content starts here..."
            />
          </div>

          <div className="flex gap-4 pt-4 border-t border-gray-100">
            <button 
              type="button" 
              onClick={() => setIsAddModalOpen(false)}
              className="flex-1 py-4 text-sm font-bold text-gray-500 bg-gray-50 rounded-2xl hover:bg-gray-100 transition-all"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={isSaving}
              className="flex-[2] py-4 text-sm font-black text-white bg-indigo-600 rounded-2xl hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-200 uppercase tracking-widest disabled:opacity-50"
            >
              {isSaving ? "Saving..." : "Create Blog Post"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Blog Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit Blog Post"
        maxWidth="max-w-4xl"
      >
        <form onSubmit={handleEditBlog} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="text-xs font-black text-gray-500 uppercase tracking-widest mb-1 block">Title</label>
                <input 
                  type="text" required
                  value={formData.title}
                  onChange={handleTitleChange}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm font-medium focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all"
                />
              </div>
              <div>
                <label className="text-xs font-black text-gray-500 uppercase tracking-widest mb-1 block">Slug (URL)</label>
                <input 
                  type="text" required
                  value={formData.slug}
                  onChange={(e) => setFormData({...formData, slug: e.target.value})}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm font-mono focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-medium"
                />
              </div>
              <div>
                <label className="text-xs font-black text-gray-500 uppercase tracking-widest mb-1 block">Cover Image URL</label>
                <input 
                  type="url"
                  value={formData.coverImage}
                  onChange={(e) => setFormData({...formData, coverImage: e.target.value})}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm font-medium focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all"
                />
              </div>
              <div>
                <label className="text-xs font-black text-gray-500 uppercase tracking-widest mb-1 block">Tags (comma separated)</label>
                <input 
                  type="text"
                  value={formData.tags}
                  onChange={(e) => setFormData({...formData, tags: e.target.value})}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm font-medium focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all"
                />
              </div>
              <div>
                <label className="text-xs font-black text-gray-500 uppercase tracking-widest mb-1 block">Excerpt (Summary)</label>
                <textarea 
                  rows={3} required
                  value={formData.excerpt}
                  onChange={(e) => setFormData({...formData, excerpt: e.target.value})}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm font-medium focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all"
                />
              </div>
            </div>

            <div className="space-y-4 p-6 bg-indigo-50/50 rounded-3xl border border-indigo-100">
              <div className="flex items-center gap-2 mb-2 text-indigo-600">
                <Globe className="w-5 h-5" />
                <h3 className="font-black text-sm uppercase tracking-widest">SEO Optimization</h3>
              </div>
              <div>
                <label className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1 block">Meta Title</label>
                <input 
                  type="text"
                  value={formData.metaTitle}
                  onChange={(e) => setFormData({...formData, metaTitle: e.target.value})}
                  className="w-full px-4 py-3 bg-white border border-indigo-100 rounded-xl text-sm font-medium focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all shadow-sm"
                />
              </div>
              <div>
                <label className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1 block">Meta Description</label>
                <textarea 
                  rows={4}
                  value={formData.metaDescription}
                  onChange={(e) => setFormData({...formData, metaDescription: e.target.value})}
                  className="w-full px-4 py-3 bg-white border border-indigo-100 rounded-xl text-sm font-medium focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all shadow-sm"
                />
              </div>
              <div>
                <label className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1 block">Publishing Status</label>
                <select 
                  value={formData.status}
                  onChange={(e) => setFormData({...formData, status: e.target.value as 'draft' | 'published'})}
                  className="w-full px-4 py-3 bg-white border border-indigo-100 rounded-xl text-sm font-bold text-gray-700 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all shadow-sm"
                >
                  <option value="draft">Draft (Private)</option>
                  <option value="published">Published (Public)</option>
                </select>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-black text-gray-500 uppercase tracking-widest block">Content (Editor)</label>
              <div className="flex items-center gap-1 bg-white border border-gray-100 rounded-xl p-1 shadow-sm">
                <button type="button" onClick={() => insertMarkdown('# ', '')} className="p-1.5 hover:bg-indigo-50 text-gray-600 hover:text-indigo-600 rounded-lg transition-colors" title="Heading 1"><Heading1 className="w-4 h-4" /></button>
                <button type="button" onClick={() => insertMarkdown('## ', '')} className="p-1.5 hover:bg-indigo-50 text-gray-600 hover:text-indigo-600 rounded-lg transition-colors" title="Heading 2"><Heading2 className="w-4 h-4" /></button>
                <button type="button" onClick={() => insertMarkdown('### ', '')} className="p-1.5 hover:bg-indigo-50 text-gray-600 hover:text-indigo-600 rounded-lg transition-colors" title="Heading 3"><Heading3 className="w-4 h-4" /></button>
                <div className="w-px h-4 bg-gray-100 mx-1" />
                <button type="button" onClick={() => insertMarkdown('**', '**')} className="p-1.5 hover:bg-indigo-50 text-gray-600 hover:text-indigo-600 rounded-lg transition-colors" title="Bold"><Bold className="w-4 h-4" /></button>
                <button type="button" onClick={() => insertMarkdown('*', '*')} className="p-1.5 hover:bg-indigo-50 text-gray-600 hover:text-indigo-600 rounded-lg transition-colors" title="Italic"><Italic className="w-4 h-4" /></button>
                <button type="button" onClick={() => insertMarkdown('\n- ', '')} className="p-1.5 hover:bg-indigo-50 text-gray-600 hover:text-indigo-600 rounded-lg transition-colors" title="Bullet List"><List className="w-4 h-4" /></button>
                <button type="button" onClick={() => insertMarkdown('\n1. ', '')} className="p-1.5 hover:bg-indigo-50 text-gray-600 hover:text-indigo-600 rounded-lg transition-colors" title="Numbered List"><ListOrdered className="w-4 h-4" /></button>
                <div className="w-px h-4 bg-gray-100 mx-1" />
                <button type="button" onClick={() => insertMarkdown('[', '](url)')} className="p-1.5 hover:bg-indigo-50 text-gray-600 hover:text-indigo-600 rounded-lg transition-colors" title="Link"><LinkIcon className="w-4 h-4" /></button>
                <button type="button" onClick={() => insertMarkdown('\n> ', '')} className="p-1.5 hover:bg-indigo-50 text-gray-600 hover:text-indigo-600 rounded-lg transition-colors" title="Quote"><Quote className="w-4 h-4" /></button>
                <button type="button" onClick={() => insertMarkdown('`', '`')} className="p-1.5 hover:bg-indigo-50 text-gray-600 hover:text-indigo-600 rounded-lg transition-colors" title="Code"><Code className="w-4 h-4" /></button>
              </div>
            </div>
            <textarea 
              ref={textareaRef}
              rows={15} required
              value={formData.content}
              onChange={(e) => setFormData({...formData, content: e.target.value})}
              className="w-full px-6 py-5 bg-gray-50 border border-gray-100 rounded-3xl text-sm font-medium focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-mono leading-relaxed"
            />
          </div>

          <div className="flex gap-4 pt-4 border-t border-gray-100">
            <button 
              type="button" 
              onClick={() => setIsEditModalOpen(false)}
              className="flex-1 py-4 text-sm font-bold text-gray-500 bg-gray-50 rounded-2xl hover:bg-gray-100 transition-all"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={isSaving}
              className="flex-[2] py-4 text-sm font-black text-white bg-indigo-600 rounded-2xl hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-200 uppercase tracking-widest disabled:opacity-50"
            >
              {isSaving ? "Saving..." : "Update Blog Post"}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmModal 
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDeleteBlog}
        title="Delete Blog Post"
        message="Are you sure you want to delete this blog post? This action cannot be undone."
      />
    </div>
  );
}
