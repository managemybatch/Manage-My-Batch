import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';
import { cn } from '../lib/utils';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  className?: string;
  maxWidth?: string;
  fullScreen?: boolean;
  hideHeader?: boolean;
}

export function Modal({ 
  isOpen, 
  onClose, 
  title, 
  children, 
  className, 
  maxWidth = "max-w-lg", 
  fullScreen = false,
  hideHeader = false
}: ModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100]"
          />
          <motion.div
            initial={fullScreen ? { opacity: 0, scale: 1, y: 0 } : { opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={fullScreen ? { opacity: 0, scale: 1, y: 0 } : { opacity: 0, scale: 0.95, y: 20 }}
            className={cn(
              "fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full bg-white z-[101] overflow-hidden",
              fullScreen ? "h-full max-h-screen rounded-none" : "rounded-3xl shadow-2xl",
              !fullScreen && maxWidth,
              className
            )}
          >
            {!hideHeader && (
              <div className={cn(
                "px-8 py-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50",
                fullScreen && "px-6 py-4"
              )}>
                <h3 className="text-xl font-bold text-gray-900">{title}</h3>
                <button 
                  onClick={onClose}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            )}
            <div className={cn(
              "p-8 overflow-y-auto",
              fullScreen ? (hideHeader ? "h-screen p-0" : "h-[calc(100vh-73px)] p-0") : "max-h-[80vh]"
            )}>
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
