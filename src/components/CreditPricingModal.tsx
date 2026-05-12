import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, X } from 'lucide-react';

interface CreditPricingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CreditPricingModal({ isOpen, onClose }: CreditPricingModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-lg bg-white rounded-[3rem] shadow-2xl overflow-hidden p-8"
          >
            <button 
              onClick={onClose}
              className="absolute top-6 right-6 p-2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>

            <div className="text-center space-y-4 mb-8">
              <div className="w-16 h-16 bg-amber-50 rounded-3xl flex items-center justify-center text-amber-600 mx-auto shadow-inner">
                <Sparkles className="w-8 h-8" />
              </div>
              <h2 className="text-3xl font-black text-gray-900 tracking-tight">Purchase AI Credits</h2>
              <p className="text-gray-500 font-medium">Get more generations for your coaching center.</p>
            </div>

            <div className="space-y-3">
              <div className="p-4 rounded-2xl border-2 border-gray-100 flex items-center justify-between group hover:border-indigo-600 transition-all">
                 <div>
                    <p className="font-black text-gray-900">Trial Pack</p>
                    <p className="text-xs text-gray-500">20 Generations</p>
                 </div>
                 <div className="text-right">
                    <p className="font-black text-indigo-600">৳ 500</p>
                 </div>
              </div>
              <div className="p-4 rounded-2xl border-2 border-indigo-600 bg-indigo-50/50 flex items-center justify-between relative">
                 <div className="absolute -top-3 right-4 bg-indigo-600 text-white text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest">Best Value</div>
                 <div>
                    <p className="font-black text-indigo-900">Growth Pack</p>
                    <p className="text-xs text-indigo-600">100 Generations</p>
                 </div>
                 <div className="text-right">
                    <p className="font-black text-indigo-600">৳ 2,000</p>
                 </div>
              </div>
              <div className="p-4 rounded-2xl border-2 border-gray-100 flex items-center justify-between group hover:border-indigo-600 transition-all">
                 <div>
                    <p className="font-black text-gray-900">Large Coaching Pack</p>
                    <p className="text-xs text-gray-500">500 Generations</p>
                 </div>
                 <div className="text-right">
                    <p className="font-black text-indigo-600">৳ 8,000</p>
                 </div>
              </div>
            </div>

            <div className="mt-8 space-y-4">
               <button 
                 onClick={() => window.location.href = `https://wa.me/8801301757000?text=I%20want%20to%20buy%20AI%20Credits%20for%20my%20batch%20manager%20app`}
                 className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all flex items-center justify-center gap-2"
               >
                  Contact Support to Recharge
               </button>
               <button 
                 onClick={onClose}
                 className="w-full py-2 text-gray-400 font-bold text-sm hover:text-gray-600"
               >
                  Maybe later
               </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
