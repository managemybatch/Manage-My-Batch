import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronRight, X, Sparkles, ArrowRight } from 'lucide-react';
import { cn } from '../lib/utils';
import { useAuth } from '../lib/auth';

interface Step {
  id: string;
  targetId: string;
  title: string;
  content: string;
  position: 'right' | 'left' | 'top' | 'bottom';
}

const steps: Step[] = [
  {
    id: 'welcome',
    targetId: 'tutorial-sidebar-dashboard',
    title: 'স্বাগতম! 🎉',
    content: 'ড্যাশবোর্ড - এখানে আপনি আপনার প্রতিষ্ঠানের সব তথ্য এক নজরে দেখতে পারবেন।',
    position: 'right',
  },
  {
    id: 'batches',
    targetId: 'tutorial-sidebar-batches',
    title: 'ব্যাচ ম্যানেজমেন্ট 📚',
    content: 'এখান থেকে নতুন ব্যাচ তৈরি করুন এবং আপনার ক্লাসগুলো সুন্দরভাবে সাজান।',
    position: 'right',
  },
  {
    id: 'students',
    targetId: 'tutorial-sidebar-students',
    title: 'ছাত্রছাত্রীদের তালিকা 👥',
    content: 'আপনার সব ছাত্রের প্রোফাইল, তথ্য এবং প্রগ্রেস এখানে ম্যানেজ করুন।',
    position: 'right',
  },
  {
    id: 'attendance',
    targetId: 'tutorial-sidebar-attendance',
    title: 'সহজ হাজিরা 📝',
    content: 'খুব সহজেই ছাত্রছাত্রীদের প্রতিদিনের হাজিরা নিশ্চিত করুন এবং রিপোর্ট দেখুন।',
    position: 'right',
  },
  {
    id: 'cards',
    targetId: 'tutorial-sidebar-cards',
    title: 'আইডি কার্ড ও সার্টিফিকেট 🎓',
    content: 'এখান থেকেই সেরা ডিজাইনের আকর্ষণীয় আইডি কার্ড ও প্রশংসাপত্র তৈরি করুন।',
    position: 'right',
  },
  {
    id: 'help',
    targetId: 'tutorial-sidebar-help',
    title: 'সার্বক্ষণিক সহায়তা 💡',
    content: 'কোনো সমস্যা হলে বা বুঝতে অসুবিধা হলে সরাসরি আমাদের সাহায্য নিন।',
    position: 'right',
  },
];

export function OnboardingTutorial() {
  const { user, setHasSeenOnboarding } = useAuth();
  const [currentStepIndex, setCurrentStepIndex] = useState(-1);
  const [isVisible, setIsVisible] = useState(false);
  const [boxPosition, setBoxPosition] = useState({ top: 0, left: 0 });

  useEffect(() => {
    if (user && user.hasSeenOnboarding === false) {
      const checkAndStart = () => {
        // Don't start if welcome modal or any other major modal is visible
        const modal = document.querySelector('[role="dialog"]');
        if (modal) {
          setTimeout(checkAndStart, 1000);
          return;
        }

        setIsVisible(true);
        setCurrentStepIndex(0);
      };

      const timer = setTimeout(checkAndStart, 3000);
      return () => clearTimeout(timer);
    }
  }, [user]);

  useEffect(() => {
    if (currentStepIndex >= 0 && currentStepIndex < steps.length) {
      const targetElement = document.getElementById(steps[currentStepIndex].targetId);
      if (targetElement) {
        const rect = targetElement.getBoundingClientRect();
        const step = steps[currentStepIndex];

        let top = rect.top + rect.height / 2;
        let left = rect.right + 20;

        if (step.position === 'bottom') {
          top = rect.bottom + 10;
          left = rect.left + rect.width / 2;
        }

        setBoxPosition({ top, left });
        targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        targetElement.classList.add('ring-4', 'ring-indigo-500', 'ring-offset-2', 'z-[100]', 'relative');
      }
    }

    return () => {
      // Cleanup rings from all possible targets
      steps.forEach(s => {
        const el = document.getElementById(s.targetId);
        if (el) el.classList.remove('ring-4', 'ring-indigo-500', 'ring-offset-2', 'z-[100]', 'relative');
      });
    };
  }, [currentStepIndex]);

  const handleNext = () => {
    if (currentStepIndex < steps.length - 1) {
      setCurrentStepIndex(prev => prev + 1);
    } else {
      completeTutorial();
    }
  };

  const completeTutorial = () => {
    setIsVisible(false);
    setCurrentStepIndex(-1);
    setHasSeenOnboarding();
  };

  if (!isVisible || currentStepIndex === -1) return null;

  const currentStep = steps[currentStepIndex];

  return (
    <div className="fixed inset-0 z-[9999] pointer-events-none overflow-hidden">
      {/* Backdrop with hole */}
      <div className="absolute inset-0 bg-black/40 pointer-events-auto" onClick={completeTutorial} />

      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep.id}
          initial={{ opacity: 0, scale: 0.9, x: -20 }}
          animate={{ opacity: 1, scale: 1, x: 0 }}
          exit={{ opacity: 0, scale: 0.9, x: 20 }}
          style={{ 
            top: boxPosition.top, 
            left: boxPosition.left,
            transform: 'translateY(-50%)'
          }}
          className="absolute pointer-events-auto w-72 md:w-80"
        >
          {/* Pointer/Arrow */}
          <div className="absolute left-[-10px] top-1/2 -translate-y-1/2 w-4 h-4 bg-white rotate-45" />

          <div className="bg-white rounded-3xl shadow-2xl p-6 border border-indigo-100 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-50 rounded-full blur-3xl -mr-12 -mt-12 opacity-50" />
            
            <div className="relative z-10">
              <div className="flex justify-between items-start mb-4">
                <div className="w-10 h-10 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-100">
                  <Sparkles className="w-5 h-5 animate-pulse" />
                </div>
                <button 
                  onClick={completeTutorial}
                  className="p-1 hover:bg-gray-100 rounded-lg transition-colors text-gray-400"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <h3 className="text-lg font-black text-gray-900 tracking-tight mb-2">
                {currentStep.title}
              </h3>
              <p className="text-sm text-gray-500 font-medium leading-relaxed mb-6">
                {currentStep.content}
              </p>

              <div className="flex items-center justify-between">
                <div className="flex gap-1">
                  {steps.map((_, idx) => (
                    <div 
                      key={idx}
                      className={cn(
                        "h-1 rounded-full transition-all duration-300",
                        idx === currentStepIndex ? "w-4 bg-indigo-600" : "w-1 bg-gray-200"
                      )}
                    />
                  ))}
                </div>
                
                <button
                  onClick={handleNext}
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 active:scale-95"
                >
                  {currentStepIndex === steps.length - 1 ? 'শুরু করুন' : 'পরবর্তী'}
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* SVG Mask for highlighting the element - Complex to implement perfectly without react-joyride, 
          but adding basic ring highlight via CSS class in useEffect which is more robust for simple needs */}
    </div>
  );
}
