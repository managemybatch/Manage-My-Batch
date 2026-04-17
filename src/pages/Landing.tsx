import * as React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Users, 
  CreditCard, 
  Calendar, 
  ClipboardCheck, 
  MessageSquare, 
  ShieldCheck, 
  BarChart3, 
  Smartphone,
  CheckCircle2,
  ArrowRight,
  Menu,
  X,
  Star,
  Quote,
  Clock,
  AlertTriangle
} from 'lucide-react';
import { cn } from '../lib/utils';
import { SUBSCRIPTION_PLANS } from '../constants';

const features = [
  {
    title: 'শিক্ষা প্রতিষ্ঠান ম্যানেজমেন্ট সিস্টেম',
    description: 'স্কুল, মাদ্রাসা ও কোচিং সেন্টারের ছাত্রদের ভর্তি, ডিজিটাল প্রোফাইল এবং একাডেমিক তথ্য সহজে পরিচালনা করুন।',
    icon: Users,
    color: 'text-blue-600',
    bgColor: 'bg-blue-100'
  },
  {
    title: 'অটোমেটেড ফি কালেকশন ও রসিদ',
    description: 'স্কুলের মাসিক বেতন, মাদ্রাসার ফাণ্ড এবং কোচিংয়ের ফি ট্র্যাক করুন। অটোমেটেড পেমেন্ট রসিদ জেনারেট করুন।',
    icon: CreditCard,
    color: 'text-green-600',
    bgColor: 'bg-green-100'
  },
  {
    title: 'স্মার্ট ডিজিটাল উপস্থিতি',
    description: 'ছাত্রদের প্রতিদিনের উপস্থিতি গ্রহণ এবং অনুপস্থিত থাকলে অভিভাবকদের ফোনে অটোমেটেড SMS পাঠানোর আধুনিক সিস্টেম।',
    icon: ClipboardCheck,
    color: 'text-purple-600',
    bgColor: 'bg-purple-100'
  },
  {
    title: 'পরীক্ষার ফলাফল ও মার্কশিট',
    description: 'সহজে পরীক্ষার মার্কস এন্ট্রি করুন এবং অটোমেটিক প্রগতি রিপোর্ট কার্ড বা ডিজিটাল মার্কশিট তৈরি করুন।',
    icon: BarChart3,
    color: 'text-orange-600',
    bgColor: 'bg-orange-100'
  },
  {
    title: 'SMS ও জরুরি নোটিফিকেশন',
    description: 'ভর্তি, ফি, উপস্থিতি ও পরীক্ষার নোটিশ অভিভাবকদের পাঠান অটোমেটেড SMS-এর মাধ্যমে।',
    icon: MessageSquare,
    color: 'text-pink-600',
    bgColor: 'bg-pink-100'
  },
  {
    title: 'অনলাইন ভর্তি ফরম ও ব্যাচ',
    description: 'প্রতিষ্ঠানটির জন্য কাস্টমাইজড অনলাইন ভর্তি ফরম এবং শৃঙ্খলার সাথে ক্লাস ও ব্যাচ ম্যানেজমেন্ট করুন।',
    icon: Calendar,
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-100'
  }
];

const reviews = [
  {
    name: 'মাওলানা আব্দুল্লাহ',
    role: 'মুহতামিম, আল-হেরা মাদ্রাসা',
    content: 'এই সফটওয়্যারটি আমাদের মাদ্রাসার ফি কালেকশন এবং ছাত্রদের তথ্য সংরক্ষণে বৈপ্লবিক পরিবর্তন এনেছে। খুবই সহজ এবং কার্যকর।',
    rating: 5
  },
  {
    name: 'ফারহানা আক্তার',
    role: 'প্রধান শিক্ষক, আইডিয়াল একাডেমি',
    content: 'ছাত্রদের উপস্থিতি এবং পরীক্ষার রেজাল্ট অভিভাবকদের জানানো এখন মাত্র এক ক্লিকের ব্যাপার। স্কুলের জন্য এটি সেরা ম্যানেজমেন্ট সিস্টেম।',
    rating: 5
  },
  {
    name: 'কামরুল হাসান',
    role: 'পরিচালক, সাকসেস কোচিং',
    content: 'খুবই সহজ ইন্টারফেস। আমাদের স্টাফরা খুব দ্রুত এটি ব্যবহার করা শিখে গেছে। কোচিং ম্যানেজমেন্টের জন্য সেরা ডিজিটাল সমাধান।',
    rating: 5
  }
];

export function Landing() {
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-white font-sans">
      {/* Sticky Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/')}>
              <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
                <Users className="text-white w-6 h-6" />
              </div>
              <span className="text-xl font-black text-gray-900 tracking-tight">Manage My Batch</span>
            </div>

            {/* Desktop Menu */}
            <nav className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-gray-600 hover:text-blue-600 font-medium transition-colors">বৈশিষ্ট্যসমূহ</a>
              <a href="#about" className="text-gray-600 hover:text-blue-600 font-medium transition-colors">আমাদের সম্পর্কে</a>
              <a href="#reviews" className="text-gray-600 hover:text-blue-600 font-medium transition-colors">মতামত</a>
              <Link to="/login" className="text-gray-600 hover:text-blue-600 font-medium transition-colors">সাহায্য</Link>
              <div className="flex items-center gap-4 border-l border-gray-100 pl-8">
                <Link 
                  to="/login"
                  className="text-gray-900 font-semibold hover:text-blue-600 transition-colors cursor-pointer"
                >
                  লগইন
                </Link>
                <Link 
                  to="/signup"
                  className="bg-blue-600 text-white px-6 py-2.5 rounded-full font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 cursor-pointer"
                >
                  রেজিস্ট্রেশন
                </Link>
              </div>
            </nav>

            {/* Mobile Menu Button */}
            <button 
              className="md:hidden p-2 text-gray-600"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? <X /> : <Menu />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden bg-white border-b border-gray-100 p-4 space-y-4">
            <a href="#features" className="block text-gray-600 font-medium" onClick={() => setIsMenuOpen(false)}>বৈশিষ্ট্যসমূহ</a>
            <a href="#about" className="block text-gray-600 font-medium" onClick={() => setIsMenuOpen(false)}>আমাদের সম্পর্কে</a>
            <a href="#reviews" className="block text-gray-600 font-medium" onClick={() => setIsMenuOpen(false)}>মতামত</a>
            <Link to="/login" className="block text-gray-600 font-medium" onClick={() => setIsMenuOpen(false)}>সাহায্য</Link>
            <div className="pt-4 flex flex-col gap-3">
              <Link 
                to="/login"
                onClick={() => setIsMenuOpen(false)}
                className="text-center py-3 font-semibold text-gray-900 border border-gray-200 rounded-xl cursor-pointer"
              >
                লগইন
              </Link>
              <Link 
                to="/signup"
                onClick={() => setIsMenuOpen(false)}
                className="text-center py-3 font-bold text-white bg-blue-600 rounded-xl shadow-lg shadow-blue-200 cursor-pointer"
              >
                রেজিস্ট্রেশন
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 bg-gradient-to-b from-blue-50 to-white relative">
        <div className="max-w-7xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-700 px-4 py-2 rounded-full text-sm font-bold mb-8">
            <ShieldCheck className="w-4 h-4" />
            স্কুল, মাদ্রাসা ও কোচিং ম্যানেজমেন্টের আধুনিক সমাধান
          </div>
          <h1 className="text-4xl md:text-6xl font-black text-gray-900 mb-6 leading-tight">
            সেরা স্কুল, মাদ্রাসা ও কোচিং সেন্টার <br />
            <span className="text-blue-600">ম্যানেজমেন্ট সফটওয়্যার</span>
          </h1>
          <p className="text-lg md:text-xl text-gray-600 mb-10 max-w-3xl mx-auto leading-relaxed">
            আপনার শিক্ষা প্রতিষ্ঠানকে করুন স্মার্ট ও ডিজিটাল। অনলাইন ভর্তি, ফি ম্যানেজমেন্ট, অটোমেটেড SMS, ডিজিটাল এটেনডেন্স এবং পরীক্ষার রেজাল্ট - সবই পাবেন এক প্ল্যাটফর্মে। 
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 relative z-20">
            <Link 
              to="/signup"
              className="w-full sm:w-auto bg-blue-600 text-white px-10 py-4 rounded-full text-lg font-black hover:bg-blue-700 transition-all shadow-xl shadow-blue-200 flex items-center justify-center gap-2 group cursor-pointer"
            >
              এখনই শুরু করুন
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
          
            <div className="mt-16 relative">
            <div className="absolute inset-0 bg-blue-600/5 blur-3xl rounded-full transform -translate-y-1/2"></div>
            <img 
              src="https://d3ob0s3rxbjyep.cloudfront.net/content/Sheikh_Khalifa_Bin_Zayed_Bangladeshi_Islamia_School_Abu_Dhabi_B_31_03_3d646f0b35_2a025387ad_e943a37811.jpg" 
              alt="Sheikh Khalifa Bin Zayed Bangladeshi Islamia School" 
              className="relative rounded-2xl shadow-2xl border border-gray-100 mx-auto max-w-5xl w-full object-cover h-[300px] md:h-[500px]"
              referrerPolicy="no-referrer"
            />
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-12 border-y border-gray-100 bg-white">
        <div className="max-w-7xl mx-auto px-4 grid grid-cols-2 md:grid-cols-4 gap-8">
          <div className="text-center">
            <div className="text-3xl font-black text-blue-600 mb-1">৫০০+</div>
            <div className="text-sm text-gray-500 font-medium">সন্তুষ্ট প্রতিষ্ঠান</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-black text-blue-600 mb-1">৫০,০০০+</div>
            <div className="text-sm text-gray-500 font-medium">নিবন্ধিত ছাত্র</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-black text-blue-600 mb-1">৯৯.৯%</div>
            <div className="text-sm text-gray-500 font-medium">সিস্টেম আপটাইম</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-black text-blue-600 mb-1">২৪/৭</div>
            <div className="text-sm text-gray-500 font-medium">কাস্টমার সাপোর্ট</div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 px-4 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-black text-gray-900 mb-4">সেরা শিক্ষা প্রতিষ্ঠান ম্যানেজমেন্ট ফিচার</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">স্কুল, মাদ্রাসা বা কোচিং সেন্টারের দৈনন্দিন কাজগুলোকে সহজ করতে আমরা নিয়ে এসেছি সব আধুনিক ডিজিটাল ফিচার।</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div key={index} className="bg-white p-8 rounded-2xl border border-gray-100 hover:border-blue-200 transition-all hover:shadow-xl group">
                <div className={cn("w-14 h-14 rounded-xl flex items-center justify-center mb-6 transition-transform group-hover:scale-110", feature.bgColor)}>
                  <feature.icon className={cn("w-7 h-7", feature.color)} />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">{feature.title}</h3>
                <p className="text-gray-600 leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Problem/Solution Section */}
      <section id="about" className="py-24 px-4 bg-white overflow-hidden">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col lg:flex-row items-center gap-16">
            <div className="flex-1">
              <h2 className="text-3xl md:text-4xl font-black text-gray-900 mb-8 leading-tight">
                কেন আপনার শিক্ষা প্রতিষ্ঠানের জন্য <br />
                <span className="text-blue-600">আমাদের ম্যানেজমেন্ট সফটওয়্যার প্রয়োজন?</span>
              </h2>
              <div className="space-y-6">
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-6 h-6 bg-green-100 rounded-full flex items-center justify-center mt-1">
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900 mb-1">কাগজ কলমের ঝামেলা মুক্তি</h4>
                    <p className="text-gray-600">সব তথ্য ডিজিটালভাবে সংরক্ষিত থাকে, তাই হারিয়ে যাওয়ার ভয় নেই।</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-6 h-6 bg-green-100 rounded-full flex items-center justify-center mt-1">
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900 mb-1">স্বচ্ছ ফি ম্যানেজমেন্ট</h4>
                    <p className="text-gray-600">কার কত টাকা বকেয়া আছে তা এক পলকেই দেখে নিন এবং SMS পাঠান।</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-6 h-6 bg-green-100 rounded-full flex items-center justify-center mt-1">
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900 mb-1">অভিভাবকদের সাথে নিবিড় যোগাযোগ</h4>
                    <p className="text-gray-600">উপস্থিতি এবং রেজাল্ট সরাসরি অভিভাবকদের ফোনে পৌঁছে যায়।</p>
                  </div>
                </div>
              </div>
              <div className="mt-10">
                <Link to="/login" className="inline-flex items-center gap-2 text-blue-600 font-bold hover:gap-3 transition-all">
                  বিস্তারিত জানতে আমাদের সাথে যোগাযোগ করুন
                  <ArrowRight className="w-5 h-5" />
                </Link>
              </div>
            </div>
            <div className="flex-1 relative">
              <div className="absolute -right-20 -top-20 w-64 h-64 bg-blue-600/10 rounded-full blur-3xl"></div>
              <div className="absolute -left-20 -bottom-20 w-64 h-64 bg-purple-600/10 rounded-full blur-3xl"></div>
              <img 
                src="https://bangladesh.chevron.com/-/media/bangladesh/community/images/01-education-hero.jpg?la=en&h=433&w=800&hash=033DA2301BA897593EFF9A0002F4A4F7" 
                alt="Bangladeshi School Students" 
                className="relative rounded-2xl shadow-2xl z-10"
                referrerPolicy="no-referrer"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-24 px-4 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-black text-gray-900 mb-4 tracking-tight">সহজ এবং স্বচ্ছ প্রাইসিং</h2>
            <p className="text-gray-500 max-w-2xl mx-auto font-medium">আপনার প্রতিষ্ঠানের প্রয়োজন অনুযায়ী সেরা প্ল্যানটি বেছে নিন। কোনো লুকানো চার্জ নেই।</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
            {SUBSCRIPTION_PLANS.map((plan) => (
              <div 
                key={plan.id} 
                className={cn(
                  "bg-white p-8 rounded-[2rem] border relative transition-all duration-300 hover:shadow-2xl hover:-translate-y-2",
                  plan.id === 'standard' ? "border-blue-500 shadow-xl shadow-blue-100" : "border-gray-100 shadow-sm"
                )}
              >
                {plan.id === 'standard' && (
                  <div className="absolute top-0 right-10 -translate-y-1/2 bg-blue-600 text-white px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg">
                    Popular
                  </div>
                )}
                <div className="mb-8">
                  <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight mb-2">{plan.name}</h3>
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-black text-gray-900">{plan.price}</span>
                    <span className="text-gray-500 font-bold">/মাস</span>
                  </div>
                </div>

                <ul className="space-y-4 mb-10">
                  <li className="flex items-center gap-3 text-sm font-medium text-gray-600">
                    <CheckCircle2 className="w-5 h-5 text-blue-600 flex-shrink-0" />
                    <span>সর্বোচ্চ {plan.studentLimit} জন ছাত্র</span>
                  </li>
                  <li className="flex items-center gap-3 text-sm font-medium text-gray-600">
                    <CheckCircle2 className="w-5 h-5 text-blue-600 flex-shrink-0" />
                    <span>সর্বোচ্চ {plan.batchLimit} টি ব্যাচ</span>
                  </li>
                  <li className="flex items-center gap-3 text-sm font-medium text-gray-600">
                    <CheckCircle2 className="w-5 h-5 text-blue-600 flex-shrink-0" />
                    <span>আনলিমিটেড এটেনডেন্স ও রেজাল্ট</span>
                  </li>
                  <li className="flex items-center gap-3 text-sm font-medium text-gray-600">
                    <CheckCircle2 className="w-5 h-5 text-blue-600 flex-shrink-0" />
                    <span>প্রিমিয়াম সাপোর্ট ও এসএমএস টোকেন সুবিধা</span>
                  </li>
                </ul>

                <Link 
                  to="/signup"
                  className={cn(
                    "w-full py-4 rounded-2xl font-black text-sm transition-all text-center block",
                    plan.id === 'standard' 
                      ? "bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-200" 
                      : "bg-gray-50 text-gray-900 hover:bg-gray-100 border border-gray-200"
                  )}
                >
                  শুরু করুন
                </Link>
              </div>
            ))}
          </div>

          {/* Benefits Grid */}
          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-2xl border border-blue-50 border-t-4 border-t-blue-500 shadow-sm">
              <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center mb-4">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h4 className="font-black text-gray-900 mb-2">কোনো অগ্রিম চার্জ নেই</h4>
              <p className="text-sm text-gray-500 leading-relaxed">আমাদের সেবায় কোনো ইন্সটলমেন্ট ফি বা হিডেন চার্জ নেই। আপনি শুধুমাত্র মাসের সাবস্ক্রিপশন ফি দিয়েই সেবাটি ব্যবহার করতে পারবেন।</p>
            </div>
            <div className="bg-white p-6 rounded-2xl border border-amber-50 border-t-4 border-t-amber-500 shadow-sm">
              <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center mb-4">
                <Clock className="w-6 h-6" />
              </div>
              <h4 className="font-black text-gray-900 mb-2">৫ দিনের গ্রেস পিরিয়ড</h4>
              <p className="text-sm text-gray-500 leading-relaxed">প্ল্যান শেষ হওয়ার পর আপনার কোনো জরুরি কাজ যাতে না থামে, সেজন্য আমরা ৫ দিন অতিরিক্ত ব্যবহারের সুবিধা দেই।</p>
            </div>
            <div className="bg-white p-6 rounded-2xl border border-rose-50 border-t-4 border-t-rose-500 shadow-sm">
              <div className="w-10 h-10 bg-rose-50 text-rose-600 rounded-xl flex items-center justify-center mb-4">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h4 className="font-black text-gray-900 mb-2">ডাটা ডিলিট পলিসি</h4>
              <p className="text-sm text-gray-500 leading-relaxed">যদি কোনো প্রতিষ্ঠান টানা ৩০ দিন সফটওয়্যারটি ব্যবহার না করে (অ্যাকাউন্ট নিষ্ক্রিয় থাকে), তবে নিরাপত্তার খাতিরে ডাটা স্থায়ীভাবে মুছে ফেলা হবে।</p>
            </div>
          </div>
        </div>
      </section>

      {/* Reviews Section */}
      <section id="reviews" className="py-24 px-4 bg-blue-600">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-black text-white mb-4">আমাদের গ্রাহকরা যা বলছেন</h2>
            <p className="text-blue-100 max-w-2xl mx-auto">সারা দেশের শত শত স্কুল, মাদ্রাসা এবং কোচিং সেন্টার আমাদের ওপর আস্থা রেখেছে।</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {reviews.map((review, index) => (
              <div key={index} className="bg-white/10 backdrop-blur-lg p-8 rounded-2xl border border-white/20 text-white">
                <div className="flex gap-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className={cn("w-4 h-4", i < review.rating ? "text-yellow-400 fill-yellow-400" : "text-white/30")} />
                  ))}
                </div>
                <Quote className="w-10 h-10 text-white/20 mb-4" />
                <p className="text-lg mb-6 leading-relaxed italic">"{review.content}"</p>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center font-bold text-xl">
                    {review.name[0]}
                  </div>
                  <div>
                    <div className="font-bold">{review.name}</div>
                    <div className="text-sm text-blue-200">{review.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-4 bg-white">
        <div className="max-w-5xl mx-auto bg-gray-900 rounded-[2rem] p-8 md:p-16 text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/20 rounded-full blur-3xl -mr-32 -mt-32"></div>
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-600/20 rounded-full blur-3xl -ml-32 -mb-32"></div>
          
          <h2 className="text-3xl md:text-5xl font-black text-white mb-6 relative z-10">
            আজই আপনার শিক্ষা প্রতিষ্ঠানকে <br />
            <span className="text-blue-500">ডিজিটাল করুন</span>
          </h2>
          <p className="text-gray-400 text-lg mb-10 max-w-2xl mx-auto relative z-10">
            কোনো ক্রেডিট কার্ড ছাড়াই রেজিস্ট্রেশন করুন এবং স্কুল, মাদ্রাসা বা কোচিং ম্যানেজমেন্টের সব ফিচার ব্যবহার করে দেখুন। 
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 relative z-10">
            <Link 
              to="/signup"
              className="w-full sm:w-auto bg-blue-600 text-white px-10 py-4 rounded-full text-lg font-black hover:bg-blue-700 transition-all shadow-xl shadow-blue-500/20 cursor-pointer"
            >
              ফ্রি ট্রায়াল শুরু করুন
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-50 pt-20 pb-10 border-t border-gray-100">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-12 mb-16">
            <div className="col-span-2">
              <div className="flex items-center gap-2 mb-6">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                  <Users className="text-white w-5 h-5" />
                </div>
                <span className="text-xl font-black text-gray-900 tracking-tight">Manage My Batch</span>
              </div>
              <p className="text-gray-500 max-w-sm leading-relaxed">
                বাংলাদেশের সেরা স্কুল, মাদ্রাসা ও কোচিং ম্যানেজমেন্ট সফটওয়্যার। আমরা শিক্ষা প্রতিষ্ঠানগুলোকে ডিজিটাল করতে এবং অভিভাবকদের সাথে নিবিড় যোগাযোগ স্থাপনে কাজ করি।
              </p>
            </div>
            <div>
              <h4 className="font-bold text-gray-900 mb-6">লিঙ্কসমূহ</h4>
              <ul className="space-y-4 text-gray-500">
                <li><a href="#features" className="hover:text-blue-600 transition-colors">বৈশিষ্ট্যসমূহ</a></li>
                <li><a href="#about" className="hover:text-blue-600 transition-colors">আমাদের সম্পর্কে</a></li>
                <li><a href="#reviews" className="hover:text-blue-600 transition-colors">মতামত</a></li>
                <li><Link to="/login" className="hover:text-blue-600 transition-colors">প্রাইসিং</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-gray-900 mb-6">যোগাযোগ</h4>
              <ul className="space-y-4 text-gray-500">
                <li>ইমেইল: managemybatch@gmail.com</li>
                <li>ফোন: ০১৩০১-৭৫৭০০০</li>
                <li>ঢাকা, বাংলাদেশ</li>
              </ul>
              <div className="flex gap-4 mt-6">
                <a href="https://www.facebook.com/profile.php?id=61575426041014" target="_blank" rel="noopener noreferrer" className="w-8 h-8 bg-blue-600 text-white rounded-lg flex items-center justify-center hover:bg-blue-700 transition-colors">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                </a>
                <a href="https://www.youtube.com/@ManageMyBatch" target="_blank" rel="noopener noreferrer" className="w-8 h-8 bg-red-600 text-white rounded-lg flex items-center justify-center hover:bg-red-700 transition-colors">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.377.505 9.377.505s7.505 0 9.377-.505a3.017 3.017 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
                </a>
                <a href="https://wa.me/8801301757000" target="_blank" rel="noopener noreferrer" className="w-8 h-8 bg-emerald-500 text-white rounded-lg flex items-center justify-center hover:bg-emerald-600 transition-colors">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                </a>
              </div>
            </div>
          </div>
          <div className="pt-8 border-t border-gray-200 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-gray-500">
            <p>© ২০২৬ Manage My Batch. সর্বস্বত্ব সংরক্ষিত।</p>
            <div className="flex gap-8">
              <a href="#" className="hover:text-blue-600 transition-colors">প্রাইভেসি পলিসি</a>
              <a href="#" className="hover:text-blue-600 transition-colors">টার্মস অফ সার্ভিস</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
