import React, { useState, useEffect } from 'react';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase';
import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import { Search, Calendar, User, ArrowRight, BookOpen, Tag } from 'lucide-react';

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  coverImage?: string;
  authorName: string;
  tags: string[];
  createdAt: any;
}

export function BlogList() {
  const [blogs, setBlogs] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    document.title = "Resource Center & Blog | Manage My Batch";
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.setAttribute("content", "Expert coaching management tips, study resources, and career guidance for administrators and students.");
    }
    
    const q = query(
      collection(db, 'blogs'),
      where('status', '==', 'published'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const blogData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as BlogPost[];
      setBlogs(blogData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const filteredBlogs = blogs.filter(blog =>
    blog.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    blog.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <div className="bg-indigo-600 py-20 px-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="max-w-7xl mx-auto relative z-10 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center gap-4"
          >
            <span className="px-4 py-1.5 bg-white/20 backdrop-blur-md rounded-full text-[10px] font-black text-white uppercase tracking-widest border border-white/20">
              Knowledge Hub
            </span>
            <h1 className="text-4xl md:text-6xl font-black text-white tracking-tight">Resource Center & Blog</h1>
            <p className="text-indigo-100 text-lg max-w-2xl font-medium">Expert insights, study tips, and guidance for students and coaching center administrators.</p>
          </motion.div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 -mt-10 mb-20">
        {/* Search Bar */}
        <div className="relative mb-12">
          <div className="absolute inset-y-0 left-0 pl-6 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Search articles, tips, or tags..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="block w-full pl-14 pr-6 py-6 bg-white border-none rounded-3xl shadow-xl shadow-indigo-100 focus:ring-4 focus:ring-indigo-500/20 transition-all text-lg font-medium"
          />
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-3xl p-4 space-y-4 animate-pulse">
                <div className="h-48 bg-gray-100 rounded-2xl" />
                <div className="space-y-2">
                  <div className="h-4 bg-gray-100 w-3/4 rounded" />
                  <div className="h-4 bg-gray-100 w-1/2 rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredBlogs.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-200">
            <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-2xl font-black text-gray-900">No Articles Found</h3>
            <p className="text-gray-500 font-medium">Try searching for something else or check back later.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredBlogs.map((blog, index) => (
              <motion.article
                key={blog.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="group flex flex-col bg-white rounded-3xl shadow-sm hover:shadow-2xl hover:-translate-y-2 transition-all border border-gray-100 overflow-hidden"
              >
                <Link to={`/blog/${blog.slug}`} className="relative h-56 overflow-hidden block">
                  {blog.coverImage ? (
                    <img 
                      src={blog.coverImage} 
                      alt={blog.title}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-full h-full bg-indigo-50 flex items-center justify-center text-indigo-300">
                      <BookOpen className="w-12 h-12" />
                    </div>
                  )}
                  <div className="absolute top-4 left-4 flex flex-wrap gap-2">
                    {blog.tags.slice(0, 2).map((tag) => (
                      <span key={tag} className="px-3 py-1 bg-white/90 backdrop-blur text-[9px] font-black uppercase tracking-widest text-indigo-600 rounded-full shadow-sm">
                        {tag}
                      </span>
                    ))}
                  </div>
                </Link>

                <div className="p-8 flex flex-col flex-1">
                  <div className="flex items-center gap-4 mb-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                    <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> {new Date(blog.createdAt?.seconds * 1000).toLocaleDateString()}</span>
                    <span className="flex items-center gap-1.5"><User className="w-3.5 h-3.5" /> {blog.authorName}</span>
                  </div>
                  
                  <Link to={`/blog/${blog.slug}`} className="block group">
                    <h2 className="text-xl font-black text-gray-900 mb-4 group-hover:text-indigo-600 transition-colors line-clamp-2 leading-tight">
                      {blog.title}
                    </h2>
                  </Link>
                  
                  <p className="text-gray-500 text-sm font-medium mb-6 line-clamp-3 leading-relaxed">
                    {blog.excerpt}
                  </p>

                  <div className="mt-auto pt-6 border-t border-gray-50">
                    <Link 
                      to={`/blog/${blog.slug}`}
                      className="flex items-center gap-2 text-sm font-black text-indigo-600 hover:gap-4 transition-all"
                    >
                      Read Full Story <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              </motion.article>
            ))}
          </div>
        )}
      </div>

      {/* Newsletter / CTA */}
      <div className="max-w-7xl mx-auto px-6 pb-20">
        <div className="bg-gray-900 rounded-[3rem] p-12 md:p-20 text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl -translate-y-1/2 -translate-x-1/2" />
          <div className="max-w-2xl mx-auto relative z-10">
            <h2 className="text-3xl md:text-5xl font-black text-white mb-6 tracking-tight italic">Never miss an update from our experts.</h2>
            <p className="text-gray-400 font-medium mb-10">Get the latest study tips and management strategies delivered directly to your inbox every week.</p>
            <div className="flex flex-col sm:flex-row gap-4">
              <input 
                type="email" 
                placeholder="Enter your email address"
                className="flex-1 px-8 py-5 bg-white/10 border border-white/10 rounded-2xl text-white font-medium focus:ring-4 focus:ring-indigo-500/20 transition-all"
              />
              <button className="px-10 py-5 bg-indigo-600 text-white font-black rounded-2xl hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-900/20 uppercase tracking-widest text-sm">
                Subscribe Now
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
