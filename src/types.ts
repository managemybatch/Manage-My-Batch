export interface Student {
  id: string;
  name: string;
  email: string;
  phone: string;
  grade: string;
  section: string;
  rollNo: string;
  batchId: string;
  admissionDate: string;
  status: 'active' | 'inactive';
  dob?: string;
  photoUrl?: string;
  monthlyFee: number;
  batchName?: string;
  guardianPhone?: string;
  schoolName?: string;
}

export interface Teacher {
  id: string;
  name: string;
  email: string;
  phone: string;
  subject: string;
  salary: number;
  paymentStatus: 'paid' | 'unpaid';
  joinDate: string;
  photoURL?: string;
}

export interface Batch {
  id: string;
  name: string;
  description?: string;
  color?: string;
  grade: string;
  section: string;
  batchTime?: string;
  duration?: string;
  subjects?: string[];
  weeklyDays?: string[];
  admissionFee: number;
  monthlyFee: number;
  studentCount: number;
  createdAt: any;
  institutionId: string;
  classTeacherId?: string;
  classTeacherName?: string;
  websitePassword?: string;
}

export interface FeeRecord {
  id: string;
  studentId: string;
  studentName: string;
  amount: number;
  date: string;
  month: string;
  year: number;
  status: 'paid' | 'pending';
  type: 'Monthly Fee' | 'Exam Fee' | 'Other Fee';
  method: string;
  transactionId?: string;
  description?: string;
}

export interface Attendance {
  id: string;
  studentId: string;
  studentName: string;
  date: string;
  status: 'present' | 'absent' | 'late';
  delay?: number;
  batchId: string;
  institutionId: string;
}
