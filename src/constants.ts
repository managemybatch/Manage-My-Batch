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
  features: string[];
}

export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: 'free',
    name: 'Free',
    price: '৳0',
    studentLimit: 50,
    batchLimit: 3,
    features: [
      'Up to 50 students',
      'Up to 3 batches',
      'Basic student management',
      'Public profile & Admission form'
    ]
  },
  {
    id: 'basic',
    name: 'Basic',
    price: '৳399',
    studentLimit: 150,
    batchLimit: 10,
    features: [
      'Up to 150 students',
      'Up to 10 batches',
      'Premium message token support',
      'Advanced reporting'
    ]
  },
  {
    id: 'standard',
    name: 'Standard',
    price: '৳999',
    studentLimit: 450,
    batchLimit: 30,
    features: [
      'Up to 450 students',
      'Up to 30 batches',
      'Priority support',
      'Full messaging features'
    ]
  },
  {
    id: 'advanced',
    name: 'Advanced',
    price: '৳1999',
    studentLimit: 1000,
    batchLimit: 50,
    features: [
      'Up to 1000 students',
      'Up to 50 batches',
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
