import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import { db } from '../../firebase';
import { motion } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import { Calendar, User, ArrowLeft, Share2, Tag, ChevronRight, Clock, BookOpen, Twitter, Facebook, Link as LinkIcon } from 'lucide-react';

interface BlogPostType {
  id: string;
  title: string;
  slug: string;
  content: string;
  excerpt: string;
  coverImage?: string;
  metaTitle?: string;
  metaDescription?: string;
  authorName: string;
  tags: string[];
  createdAt: any;
}

export function BlogPost() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [blog, setBlog] = useState<BlogPostType | null>(null);
  const [loading, setLoading] = useState(true);
  const [relatedPosts, setRelatedPosts] = useState<BlogPostType[]>([]);

  useEffect(() => {
    if (!slug) return;

    const fetchBlog = async () => {
      try {
        const q = query(
          collection(db, 'blogs'),
          where('slug', '==', slug),
          where('status', '==', 'published'),
          limit(1)
        );
        const snapshot = await getDocs(q);
        
        if (snapshot.empty) {
          setLoading(false);
          return;
        }

        const data = {
          id: snapshot.docs[0].id,
          ...snapshot.docs[0].data()
        } as BlogPostType;
        
        setBlog(data);
        
        // Update SEO metadata
        document.title = data.metaTitle || data.title + " | রিসোর্স সেন্টার";
        
        const setMeta = (name: string, content: string, isProperty = false) => {
          const attr = isProperty ? 'property' : 'name';
          let element = document.querySelector(`meta[${attr}="${name}"]`);
          if (!element) {
            element = document.createElement('meta');
            element.setAttribute(attr, name);
            document.head.appendChild(element);
          }
          element.setAttribute('content', content);
        };

        setMeta('description', data.metaDescription || data.excerpt);
        setMeta('og:title', data.title, true);
        setMeta('og:description', data.metaDescription || data.excerpt, true);
        if (data.coverImage) setMeta('og:image', data.coverImage, true);
        setMeta('og:type', 'article', true);
        setMeta('twitter:card', 'summary_large_image');

        // Add Schema.org JSON-LD for rich indexing
        const schema = {
          "@context": "https://schema.org",
          "@type": "BlogPosting",
          "headline": data.title,
          "description": data.metaDescription || data.excerpt,
          "image": data.coverImage,
          "author": {
            "@type": "Person",
            "name": data.authorName
          },
          "datePublished": new Date(data.createdAt?.seconds * 1000).toISOString(),
          "mainEntityOfPage": {
            "@type": "WebPage",
            "@id": window.location.href
          }
        };

        const scriptId = 'blog-jsonld';
        let script = document.getElementById(scriptId) as HTMLScriptElement;
        if (!script) {
          script = document.createElement('script');
          script.id = scriptId;
          script.type = 'application/ld+json';
          document.head.appendChild(script);
        }
        script.text = JSON.stringify(schema);

        // Fetch related posts (simple logic: same tags or just latest)
        const relatedQ = query(
          collection(db, 'blogs'),
          where('status', '==', 'published'),
          where('slug', '!=', slug),
          limit(3)
        );
        const relatedSnapshot = await getDocs(relatedQ);
        setRelatedPosts(relatedSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as BlogPostType[]);
        
      } catch (error) {
        console.error("Error fetching blog:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchBlog();
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center gap-4">
        <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-500 font-bold uppercase tracking-widest text-xs">জ্ঞান লোড হচ্ছে...</p>
      </div>
    );
  }

  if (!blog) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 text-center">
        <BookOpen className="w-20 h-20 text-gray-200 mb-6" />
        <h1 className="text-4xl font-black text-gray-900 mb-2 tracking-tight">নিবন্ধটি পাওয়া যায়নি</h1>
        <p className="text-gray-500 font-medium mb-8">আপনি যে ব্লগ পোস্টটি খুঁজছেন সেটি সরানো বা মুছে ফেলা হতে পারে।</p>
        <Link to="/blog" className="px-8 py-4 bg-indigo-600 text-white font-black rounded-2xl hover:bg-indigo-700 transition-all uppercase tracking-widest text-sm shadow-xl shadow-indigo-100">
          রিসোর্স সেন্টারে ফিরে যান
        </Link>
      </div>
    );
  }

  const shareUrl = window.location.href;

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation Breadcrumb */}
      <div className="bg-gray-50 border-b border-gray-100 py-4 px-6 sticky top-0 z-50 backdrop-blur-md bg-white/80">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link to="/blog" className="flex items-center gap-2 text-gray-500 hover:text-indigo-600 transition-colors text-sm font-black uppercase tracking-widest">
            <ArrowLeft className="w-4 h-4" /> ব্লগে ফিরে যান
          </Link>
          <div className="hidden md:flex items-center gap-3">
             <button onClick={() => window.open(`https://twitter.com/intent/tweet?url=${shareUrl}`, '_blank')} className="p-2 text-gray-400 hover:text-[#1DA1F2] transition-colors"><Twitter className="w-4 h-4" /></button>
             <button onClick={() => window.open(`https://www.facebook.com/sharer/sharer.php?u=${shareUrl}`, '_blank')} className="p-2 text-gray-400 hover:text-[#4267B2] transition-colors"><Facebook className="w-4 h-4" /></button>
             <button onClick={() => { navigator.clipboard.writeText(shareUrl); alert('লিঙ্ক কপি করা হয়েছে!'); }} className="p-2 text-gray-400 hover:text-indigo-600 transition-colors"><LinkIcon className="w-4 h-4" /></button>
          </div>
        </div>
      </div>

      <article className="max-w-4xl mx-auto px-6 py-12 md:py-20">
        {/* Header */}
        <header className="mb-12 text-center">
          <div className="flex justify-center gap-2 mb-6">
            {blog.tags.map(tag => (
              <span key={tag} className="px-4 py-1.5 bg-indigo-50 text-indigo-600 text-[10px] font-black uppercase tracking-widest rounded-full">
                {tag}
              </span>
            ))}
          </div>
          <h1 className="text-4xl md:text-6xl font-black text-gray-900 mb-8 tracking-tight leading-[1.1] italic">
            {blog.title}
          </h1>
          <div className="flex flex-wrap items-center justify-center gap-6 text-sm font-bold text-gray-500 uppercase tracking-widest">
            <div className="flex items-center gap-2 bg-gray-50 px-4 py-2 rounded-xl">
              <User className="w-4 h-4 text-indigo-600" />
              <span>{blog.authorName}</span>
            </div>
            <div className="flex items-center gap-2 bg-gray-50 px-4 py-2 rounded-xl">
              <Calendar className="w-4 h-4 text-indigo-600" />
              <span>{new Date(blog.createdAt?.seconds * 1000).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}</span>
            </div>
            <div className="flex items-center gap-2 bg-gray-50 px-4 py-2 rounded-xl">
              <Clock className="w-4 h-4 text-indigo-600" />
              <span>৫ মিনিট পড়ার সময়</span>
            </div>
          </div>
        </header>

        {/* Cover Image */}
        {blog.coverImage && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mb-16 rounded-[2.5rem] overflow-hidden shadow-2xl shadow-indigo-100 border-8 border-gray-50"
          >
            <img 
              src={blog.coverImage} 
              alt={blog.title}
              className="w-full aspect-[21/9] object-cover"
              referrerPolicy="no-referrer"
            />
          </motion.div>
        )}

        {/* Content */}
        <div className="prose prose-indigo prose-lg md:prose-xl max-w-none prose-headings:font-black prose-headings:tracking-tight prose-p:text-gray-600 prose-p:leading-relaxed prose-p:font-medium prose-img:rounded-[2rem] prose-blockquote:border-l-4 prose-blockquote:border-indigo-600 prose-blockquote:italic prose-a:text-indigo-600 prose-a:font-bold prose-code:text-indigo-600 prose-pre:bg-gray-900 prose-pre:rounded-2xl">
          <ReactMarkdown>{blog.content}</ReactMarkdown>
        </div>

        {/* Tags Footer */}
        <div className="mt-20 pt-10 border-t border-gray-100">
          <div className="flex flex-wrap gap-3">
            <span className="text-sm font-black text-gray-400 uppercase tracking-widest self-center mr-2">ট্যাগ:</span>
            {blog.tags.map(tag => (
              <span key={tag} className="flex items-center gap-1.5 px-4 py-2 bg-gray-50 text-gray-700 text-xs font-bold rounded-xl border border-transparent hover:border-indigo-200 transition-all cursor-default">
                <Tag className="w-3 h-3 text-indigo-500" /> {tag}
              </span>
            ))}
          </div>
        </div>

        {/* Share Section */}
        <div className="mt-12 p-8 bg-indigo-600 rounded-[2rem] text-white flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl shadow-indigo-100">
           <div className="text-center md:text-left">
              <h3 className="text-xl font-black mb-1 italic">এটি কি আপনার উপকারে এসেছে?</h3>
              <p className="text-indigo-100 font-medium text-sm">আপনার सहকর্মী শিক্ষক এবং শিক্ষার্থীদের সাথে এই সংস্থানটি শেয়ার করুন।</p>
           </div>
           <div className="flex items-center gap-4">
              <button onClick={() => window.open(`https://twitter.com/intent/tweet?url=${shareUrl}`, '_blank')} className="p-4 bg-white/10 hover:bg-white/20 rounded-2xl transition-all"><Twitter className="w-5 h-5" /></button>
              <button onClick={() => window.open(`https://www.facebook.com/sharer/sharer.php?u=${shareUrl}`, '_blank')} className="p-4 bg-white/10 hover:bg-white/20 rounded-2xl transition-all"><Facebook className="w-5 h-5" /></button>
              <button onClick={() => { navigator.clipboard.writeText(shareUrl); alert('লিঙ্ক কপি করা হয়েছে!'); }} className="px-6 py-4 bg-white text-indigo-600 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-gray-50 transition-all flex items-center gap-2">
                 <LinkIcon className="w-4 h-4" /> লিঙ্ক কপি করুন
              </button>
           </div>
        </div>
      </article>

      {/* Related Posts */}
      {relatedPosts.length > 0 && (
        <section className="bg-gray-50 py-20 px-6">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-black text-gray-900 mb-10 tracking-tight italic">প্রস্তাবিত পাঠ</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {relatedPosts.map(post => (
                <Link key={post.id} to={`/blog/${post.slug}`} className="group bg-white p-6 rounded-3xl shadow-sm hover:shadow-xl transition-all border border-transparent hover:border-indigo-100 flex gap-6 items-center">
                   {post.coverImage && (
                     <img src={post.coverImage} className="w-20 h-20 rounded-2xl object-cover shrink-0" referrerPolicy="no-referrer" />
                   )}
                   <div>
                      <h4 className="font-black text-gray-900 group-hover:text-indigo-600 transition-colors line-clamp-2 leading-tight mb-2">{post.title}</h4>
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                        {new Date(post.createdAt?.seconds * 1000).toLocaleDateString()}
                      </p>
                   </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Back to Blog Button */}
      <div className="py-20 text-center">
         <Link to="/blog" className="inline-flex items-center gap-2 text-indigo-600 font-black uppercase tracking-widest hover:gap-4 transition-all">
            সব রিসোর্স দেখুন <ChevronRight className="w-5 h-5" />
         </Link>
      </div>
    </div>
  );
}
