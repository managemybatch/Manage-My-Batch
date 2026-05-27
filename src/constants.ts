export const GRADES = ['Class 1', 'Class 2', 'Class 3', 'Class 4', 'Class 5', 'Class 6', 'Class 7', 'Class 8', 'Class 9', 'Class 10', 'Class 11', 'Class 12'];
export const SECTIONS = ['A', 'B', 'C', 'D'];
export const FEE_TYPES = ['Tuition Fee', 'Exam Fee', 'Admission Fee', 'Library Fee', 'Other'];
export const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export interface SubscriptionPlan {
  id: 'free' | 'basic' | 'standard' | 'advanced';
  name: string;
  price: string;
  studentLimit: number;
  batchLimit: number;
  aiCreditLimit: number;
  features: string[];
}

export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: 'free',
    name: 'Free',
    price: '0',
    studentLimit: 200,
    batchLimit: 3,
    aiCreditLimit: 5,
    features: [
      'Up to 200 students',
      'Up to 3 batches',
      '5 AI Credits (One-time trial)',
      'Basic student management',
      'Public profile & Admission form'
    ]
  },
  {
    id: 'basic',
    name: 'Basic',
    price: '399',
    studentLimit: 200,
    batchLimit: 10,
    aiCreditLimit: 1500,
    features: [
      'Up to 200 students',
      'Up to 10 batches',
      '1,500 AI Credits',
      'Premium message token support',
      'Advanced reporting'
    ]
  },
  {
    id: 'standard',
    name: 'Standard',
    price: '999',
    studentLimit: 500,
    batchLimit: 30,
    aiCreditLimit: 5000,
    features: [
      'Up to 500 students',
      'Up to 30 batches',
      '5,000 AI Credits',
      'Priority support',
      'Full messaging features'
    ]
  },
  {
    id: 'advanced',
    name: 'Advanced',
    price: '1999',
    studentLimit: 1000,
    batchLimit: 50,
    aiCreditLimit: 15000,
    features: [
      'Up to 1000 students',
      'Up to 50 batches',
      '15,000 AI Credits',
      'Dedicated account manager',
      'Custom features'
    ]
  }
];

export const CONTACT_INFO = {
  email: 'managemybatch@gmail.com',
  phone: '01301757000',
  whatsapp: '01301757000',
  message: 'Send us a message through the app'
};

export const CREDIT_COSTS = {
  SMS_PER_SEGMENT: 1,
  AI_MARK_EVALUATION: 2,
  AI_STUDY_ASSISTANT: 5,
  AI_QUESTION_GENERATOR: 10
};
