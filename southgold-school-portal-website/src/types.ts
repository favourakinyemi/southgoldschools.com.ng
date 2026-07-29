export type UserRole = 'SUPER_ADMIN' | 'SCHOOL_ADMIN' | 'TEACHER' | 'PARENT' | 'STUDENT';

export interface AuthUser {
  id: string;
  email: string;
  fullName?: string;
  role: UserRole;
  status: string;
  linkedId?: string | null;
  canChangePassword: boolean;
}

export interface Student {
  id: string;
  admissionNo: string;
  firstName: string;
  lastName: string;
  photo: string;
  gender: 'Male' | 'Female' | 'Other';
  dateOfBirth: string;
  parentId?: string; // FK to parents.id
  parentName: string;
  parentEmail: string;
  parentPhone: string;
  classId: string; // e.g. "Primary 1", "Primary 2"
  arm: string; // e.g. "A", "B"
  status: 'Active' | 'Suspended';
  subjects: string[]; // List of subject IDs assigned
  email?: string; // Student's own email for auth
  userId?: string; // FK to auth.users.id
}

export interface Parent {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address?: string;
  status: 'Active' | 'Inactive' | 'Suspended';
  userId?: string; // FK to auth.users.id
}

export interface Teacher {
  id: string;
  staffId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  department: string;
  status: 'Active' | 'Inactive';
  classesAssigned: {
    classId: string;
    arm: string;
    subjectId: string;
  }[];
  userId?: string; // FK to auth.users.id
  photo?: string;
}

export interface ClassArm {
  classId: string; // e.g., "Primary 1"
  arm: string;     // e.g., "A"
  classTeacherId: string; // Teacher ID
}

export interface Subject {
  id: string; // e.g., "maths"
  name: string; // e.g., "Mathematics"
  code: string; // e.g., "MTH101"
}

export interface AcademicSession {
  id: string;
  name: string; // e.g. "2025/2026"
  isActive: boolean;
  startDate: string;
  endDate: string;
}

export type SchoolTerm = 'First Term' | 'Second Term' | 'Third Term';

export interface ResultRecord {
  id: string;
  studentId: string;
  classId: string;
  arm: string;
  subjectId: string;
  term: SchoolTerm;
  session: string; // academic session name e.g. "2025/2026"
  testScore: number;       // Max 20
  assignmentScore: number; // Max 20
  examScore: number;       // Max 60
  totalScore: number;      // Calculated (test + assignment + exam)
  grade: string;           // Calculated e.g., A, B, C, F
  teacherRemark: string;
  isApproved: boolean;     // Needs Admin review before publication
  status?: string;         // 'DRAFT' | 'SUBMITTED' | 'PUBLISHED'
}

export interface EarlyYearsResultRecord {
  id: string;
  studentId: string;
  classId: string;
  arm: string;
  subjectId: string;
  term: SchoolTerm;
  session: string;
  rating: string;
  isApproved: boolean;
  status: string; // 'DRAFT' | 'SUBMITTED' | 'PUBLISHED'
}

export interface AssessmentItem {
  id: string;
  subjectId: string;
  classId?: string;
  title: string;
  name?: string;
  orderIndex?: number;
}

export interface AttendanceRecord {
  id: string;
  date: string; // YYYY-MM-DD
  entityId: string; // Student ID or Teacher ID
  entityType: 'Student' | 'Staff';
  status: 'Present' | 'Absent' | 'Late';
  remark?: string;
  session: string;
  term: SchoolTerm;
}

export interface SupportTicket {
  id: string;
  senderName: string;
  senderEmail: string;
  senderRole: UserRole;
  subject: string;
  message: string;
  status: 'Open' | 'In Progress' | 'Resolved';
  createdAt: string;
  replies: {
    senderName: string;
    message: string;
    createdAt: string;
  }[];
}

export interface SchoolNotification {
  id: string;
  title: string;
  content: string;
  category: 'Announcement' | 'Academic' | 'Billing' | 'System';
  date: string;
  recipientRole: 'ALL' | UserRole;
}

export interface FeeRecord {
  id: string;
  studentId: string;
  title: string;
  amount: number;
  amountPaid: number;
  dueDate: string;
  status: 'Paid' | 'Partially Paid' | 'Unpaid';
  transactionHistory: {
    amountPaid: number;
    paymentMethod: string;
    date: string;
    receiptNo: string;
  }[];
}

export interface TimetableEntry {
  id: string;
  classId: string;
  arm: string;
  day: 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday';
  time: string; // e.g., "08:30 AM - 09:30 AM"
  subjectId: string;
  teacherId: string;
}

export interface SchoolConfigState {
  currentTerm: SchoolTerm;
  currentSessionId: string;
  resumptionDate: string;
  closingDate: string;
  gradingScale: {
    grade: string;
    minScore: number;
    remark: string;
  }[];
  earlyYearsGradingScale?: {
    grade: string;
    remark: string;
  }[];
  caTestMax?: number;
  caAssignmentMax?: number;
  examMax?: number;
  schoolName?: string;
  schoolAddress?: string;
  schoolEmail?: string;
  schoolPhone?: string;
  logoUrl?: string;
}

export interface SchoolActivity {
  id: string;
  title: string;
  badge: string;
  desc: string;
  imgUrl: string;
  footer: string;
}

