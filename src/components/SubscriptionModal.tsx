import React from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { 
  X, 
  Check, 
  Mail, 
  Phone, 
  MessageCircle, 
  Zap,
  ArrowRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { SUBSCRIPTION_PLANS, CONTACT_INFO } from '../constants';
import { useAuth } from '../lib/auth';

interface SubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SubscriptionModal({ isOpen, onClose }: SubscriptionModalProps) {
  const { t } = useTranslation();
  const { user } = useAuth();

  const currentPlanId = user?.subscriptionPlan || 'free';

  const modalContent = (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative bg-white rounded-[2.5rem] shadow-[0_50px_100px_rgba(0,0,0,0.3)] w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col border border-white/20"
          >
            {/* Header */}
            <div className="p-8 border-b-2 border-indigo-50 flex items-start justify-between bg-gradient-to-r from-indigo-600 to-blue-600 text-white relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-20 -mt-20 blur-3xl" />
              <div className="relative z-10">
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/20 rounded-full text-[10px] font-black uppercase tracking-[0.2em] mb-3">
                  <Zap className="w-3 h-3 fill-amber-400 text-amber-400" /> Premium Access
                </div>
                <h2 className="text-3xl font-black tracking-tight">{t('Upgrade Your Account')}</h2>
                <p className="text-indigo-100 font-medium">{t('Choose the best plan for your coaching center')}</p>
              </div>
              <button
                onClick={onClose}
                className="relative z-10 p-2.5 bg-white/10 hover:bg-white/20 rounded-2xl transition-all hover:rotate-90"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-10 bg-slate-50/50">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {SUBSCRIPTION_PLANS.map((plan) => (
                  <div
                    key={plan.id}
                    className={`relative flex flex-col p-8 rounded-[2rem] border-2 transition-all duration-300 ${
                      currentPlanId === plan.id
                        ? 'border-indigo-600 bg-white shadow-2xl shadow-indigo-100 ring-4 ring-indigo-50'
                        : 'border-white bg-white/80 hover:border-indigo-200 hover:shadow-xl'
                    }`}
                  >
                    {currentPlanId === plan.id && (
                      <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-indigo-600 text-white text-[10px] font-black px-4 py-1.5 rounded-full uppercase tracking-[0.2em] shadow-lg">
                        {t('Current Plan')}
                      </div>
                    )}

                    <div className="mb-8">
                      <h3 className="text-xl font-black text-gray-900 mb-2">{plan.name}</h3>
                      <div className="flex items-baseline gap-2">
                        <span className="text-4xl font-black text-gray-900 tracking-tighter">{plan.price}</span>
                        <div className="flex flex-col">
                          <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest leading-none">BDT</span>
                          <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest leading-none mt-1">/mo</span>
                        </div>
                      </div>
                    </div>

                    <ul className="flex-1 space-y-4 mb-10">
                      {plan.features.map((feature, idx) => (
                        <li key={idx} className="flex items-start text-sm text-gray-600 font-medium leading-tight">
                          <div className="w-5 h-5 rounded-full bg-green-50 flex items-center justify-center flex-shrink-0 mr-3 mt-0.5">
                            <Check className="w-3 h-3 text-green-600" />
                          </div>
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>

                    {currentPlanId !== plan.id && (
                      <button
                        onClick={() => {}} // Manual process
                        className="w-full py-4 px-6 rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2 bg-indigo-600 text-white hover:bg-indigo-700 shadow-xl shadow-indigo-200"
                      >
                        {t('Select Plan')}
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {/* AI Credits Packages */}
              <div className="mt-16 text-center">
                <h3 className="text-2xl font-black text-gray-900 mb-2">Need Extra AI Credits?</h3>
                <p className="text-gray-500 font-medium mb-8">One-time purchase, credits never expire.</p>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
                  {[
                    { name: 'Micro Pack', credits: '500', price: '100' },
                    { name: 'Standard Pack', credits: '2,000', price: '350' },
                    { name: 'Heavy Pack', credits: '10,000', price: '1,500' }
                  ].map((pkg, idx) => (
                    <div key={idx} className="bg-white p-6 rounded-3xl border-2 border-indigo-50 hover:border-indigo-200 transition-all text-center group">
                      <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 mx-auto mb-4 group-hover:scale-110 transition-transform">
                        <Zap className="w-6 h-6 fill-indigo-600" />
                      </div>
                      <h4 className="font-black text-gray-900 mb-1">{pkg.name}</h4>
                      <p className="text-2xl font-black text-indigo-600 mb-4">{pkg.credits} Credits</p>
                      <div className="text-center py-2 bg-slate-50 rounded-xl font-bold text-gray-900">
                        {pkg.price} BDT
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Contact Section */}
              <div className="mt-16 p-10 rounded-[2.5rem] bg-white border border-gray-100 shadow-sm relative overflow-hidden">
                <div className="absolute bottom-0 right-0 w-64 h-64 bg-indigo-50 rounded-full -mr-32 -mb-32 opacity-50" />
                <div className="relative z-10">
                  <div className="text-center mb-10">
                    <h3 className="text-2xl font-black text-gray-900">{t('How to Upgrade?')}</h3>
                    <p className="text-gray-500 mt-2 font-medium max-w-xl mx-auto">
                      {t('Our payment system is currently manual. Please contact us to upgrade your plan or purchase SMS tokens.')}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    <a
                      href={`mailto:${CONTACT_INFO.email}`}
                      className="flex items-center p-6 bg-slate-50 rounded-[1.5rem] border-2 border-transparent hover:border-indigo-100 hover:bg-white hover:shadow-xl transition-all group"
                    >
                      <div className="p-4 rounded-2xl bg-white text-indigo-600 shadow-sm group-hover:bg-indigo-600 group-hover:text-white transition-all">
                        <Mail className="w-6 h-6" />
                      </div>
                      <div className="ml-5">
                        <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-1">{t('Email Us')}</p>
                        <p className="text-gray-900 font-black text-sm">{CONTACT_INFO.email}</p>
                      </div>
                    </a>

                    <a
                      href={`tel:${CONTACT_INFO.phone}`}
                      className="flex items-center p-6 bg-slate-50 rounded-[1.5rem] border-2 border-transparent hover:border-green-100 hover:bg-white hover:shadow-xl transition-all group"
                    >
                      <div className="p-4 rounded-2xl bg-white text-green-600 shadow-sm group-hover:bg-green-600 group-hover:text-white transition-all">
                        <Phone className="w-6 h-6" />
                      </div>
                      <div className="ml-5">
                        <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-1">{t('Call Us')}</p>
                        <p className="text-gray-900 font-black text-sm">{CONTACT_INFO.phone}</p>
                      </div>
                    </a>

                    <a
                      href={`https://wa.me/${CONTACT_INFO.whatsapp.replace(/\s+/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center p-6 bg-slate-50 rounded-[1.5rem] border-2 border-transparent hover:border-emerald-100 hover:bg-white hover:shadow-xl transition-all group"
                    >
                      <div className="p-4 rounded-2xl bg-white text-emerald-600 shadow-sm group-hover:bg-emerald-600 group-hover:text-white transition-all">
                        <MessageCircle className="w-6 h-6" />
                      </div>
                      <div className="ml-5">
                        <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-1">{t('WhatsApp')}</p>
                        <p className="text-gray-900 font-black text-sm">{CONTACT_INFO.whatsapp}</p>
                      </div>
                    </a>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-8 border-t bg-white flex items-center justify-center gap-3 text-sm text-gray-500 font-medium">
              <div className="w-8 h-8 rounded-xl bg-amber-50 flex items-center justify-center">
                <Zap className="w-4 h-4 text-amber-500 fill-amber-500" />
              </div>
              <span>{t('Your account will be updated within 24 hours after payment confirmation.')}</span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );

  return createPortal(modalContent, document.body);
}
