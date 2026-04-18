export interface Student {
  id: string;
  name: string;
  email: string;
  phone: string;
  grade: string;
  section: string;
  rollNo: string;
  admissionDate: string;
  status: 'active' | 'inactive';
  dob?: string;
  photoUrl?: string;
}

export interface FeeRecord {
  id: string;
  studentId: string;
  amount: number;
  date: string;
  month: string;
  year: number;
  status: 'paid' | 'pending';
  type: 'tuition' | 'exam' | 'other';
}

export interface Attendance {
  id: string;
  studentId: string;
  date: string;
  status: 'present' | 'absent' | 'late';
}
