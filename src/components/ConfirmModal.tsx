import React from 'react';
import { Modal } from './Modal';
import { AlertCircle, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '../lib/utils';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isLoading?: boolean;
  variant?: 'danger' | 'warning' | 'info';
}

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText,
  cancelText,
  isLoading = false,
  variant = 'danger'
}: ConfirmModalProps) {
  const { t } = useTranslation();

  const buttonColors = {
    danger: 'bg-rose-600 hover:bg-rose-700 shadow-rose-100',
    warning: 'bg-amber-600 hover:bg-amber-700 shadow-amber-100',
    info: 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-100',
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="" maxWidth="max-w-md">
      <div className="text-center space-y-6 py-4">
        <div className={cn(
          "w-16 h-16 mx-auto rounded-2xl flex items-center justify-center border-2",
          variant === 'danger' ? "bg-rose-50 border-rose-100 text-rose-600" :
          variant === 'warning' ? "bg-amber-50 border-amber-100 text-amber-600" :
          "bg-indigo-50 border-indigo-100 text-indigo-600"
        )}>
          <AlertCircle className="w-8 h-8" />
        </div>
        
        <div className="space-y-2">
          <h3 className="text-xl font-black text-gray-900">{title}</h3>
          <p className="text-sm text-gray-500 font-medium leading-relaxed">{message}</p>
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="flex-1 py-3.5 px-4 bg-gray-50 text-gray-600 font-bold rounded-2xl border border-gray-200 hover:bg-gray-100 transition-all disabled:opacity-50"
          >
            {cancelText || t('common.cancel', { defaultValue: 'Cancel' })}
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className={cn(
              "flex-1 py-3.5 px-4 text-white font-bold rounded-2xl transition-all shadow-lg disabled:opacity-50 flex items-center justify-center gap-2",
              buttonColors[variant]
            )}
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : (confirmText || t('common.confirm', { defaultValue: 'Confirm' }))}
          </button>
        </div>
      </div>
    </Modal>
  );
}
