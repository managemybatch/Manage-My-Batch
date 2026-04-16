import React from 'react';
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

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="p-6 border-b flex items-center justify-between bg-indigo-600 text-white">
              <div>
                <h2 className="text-2xl font-bold">{t('Upgrade Your Account')}</h2>
                <p className="text-indigo-100">{t('Choose the best plan for your coaching center')}</p>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-white/10 rounded-full transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-8">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {SUBSCRIPTION_PLANS.map((plan) => (
                  <div
                    key={plan.id}
                    className={`relative flex flex-col p-6 rounded-2xl border-2 transition-all ${
                      currentPlanId === plan.id
                        ? 'border-indigo-600 bg-indigo-50/50'
                        : 'border-gray-100 hover:border-indigo-200'
                    }`}
                  >
                    {currentPlanId === plan.id && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-indigo-600 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                        {t('Current Plan')}
                      </div>
                    )}

                    <div className="mb-4">
                      <h3 className="text-lg font-bold text-gray-900">{plan.name}</h3>
                      <div className="mt-2 flex items-baseline">
                        <span className="text-3xl font-extrabold text-gray-900">{plan.price}</span>
                        <span className="ml-1 text-gray-500">/month</span>
                      </div>
                    </div>

                    <ul className="flex-1 space-y-3 mb-8">
                      {plan.features.map((feature, idx) => (
                        <li key={idx} className="flex items-start text-sm text-gray-600">
                          <Check className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>

                    {currentPlanId !== plan.id && (
                      <button
                        onClick={() => {}} // Manual process
                        className="w-full py-3 px-4 rounded-xl font-bold transition-all flex items-center justify-center gap-2 bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-200"
                      >
                        {t('Select Plan')}
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {/* Contact Section */}
              <div className="mt-12 p-8 rounded-2xl bg-gray-50 border border-gray-100">
                <div className="text-center mb-8">
                  <h3 className="text-xl font-bold text-gray-900">{t('How to Upgrade?')}</h3>
                  <p className="text-gray-600 mt-2">
                    {t('Our payment system is currently manual. Please contact us to upgrade your plan or purchase SMS tokens.')}
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  <a
                    href={`mailto:${CONTACT_INFO.email}`}
                    className="flex items-center p-4 bg-white rounded-xl border border-gray-200 hover:border-indigo-300 hover:shadow-md transition-all group"
                  >
                    <div className="p-3 rounded-lg bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                      <Mail className="w-6 h-6" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm text-gray-500 font-medium">{t('Email Us')}</p>
                      <p className="text-gray-900 font-bold">{CONTACT_INFO.email}</p>
                    </div>
                  </a>

                  <a
                    href={`tel:${CONTACT_INFO.phone}`}
                    className="flex items-center p-4 bg-white rounded-xl border border-gray-200 hover:border-indigo-300 hover:shadow-md transition-all group"
                  >
                    <div className="p-3 rounded-lg bg-green-50 text-green-600 group-hover:bg-green-600 group-hover:text-white transition-colors">
                      <Phone className="w-6 h-6" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm text-gray-500 font-medium">{t('Call Us')}</p>
                      <p className="text-gray-900 font-bold">{CONTACT_INFO.phone}</p>
                    </div>
                  </a>

                  <a
                    href={`https://wa.me/${CONTACT_INFO.whatsapp.replace(/\s+/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center p-4 bg-white rounded-xl border border-gray-200 hover:border-indigo-300 hover:shadow-md transition-all group"
                  >
                    <div className="p-3 rounded-lg bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                      <MessageCircle className="w-6 h-6" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm text-gray-500 font-medium">{t('WhatsApp')}</p>
                      <p className="text-gray-900 font-bold">{CONTACT_INFO.whatsapp}</p>
                    </div>
                  </a>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 border-t bg-gray-50 flex items-center justify-center gap-2 text-sm text-gray-500">
              <Zap className="w-4 h-4 text-amber-500" />
              <span>{t('Your account will be updated within 24 hours after payment confirmation.')}</span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
