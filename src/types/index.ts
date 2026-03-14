export type UserRole = "student" | "advisor" | "hod" | "warden" | "gatekeeper";

export type OutpassStatus =
  | "pending_advisor"
  | "pending_hod"
  | "pending_warden"
  | "approved"
  | "rejected"
  | "expired";

export interface Student {
  id: string;
  name: string;
  email: string;
  registerNo: string;
  department: string;
  section: string;
  roomNo: string;
  year: number;
  semester: number;
  category: "H" | "D"; // H=Hosteller, D=Day Scholar
  isBlacklisted?: boolean;
  blacklistReason?: string;
  blacklistUntil?: string; // ISO datetime — auto-expires after 1 week
  photoURL?: string;
}

export interface Staff {
  id: string;
  name: string;
  email: string;
  designation: "Advisor" | "HOD" | "Warden";
  department: string;
  section?: string;
  photoURL?: string;
}

export interface Gatekeeper {
  id: string;
  name: string;
  phone: string;
  password: string; // hashed in real scenario
}

export interface OutpassForm {
  id: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  registerNo: string;
  department: string;
  section: string;
  semester: number;
  year: number;
  roomNo: string;
  purpose: string;
  outDate: string; // ISO date string
  inDate: string;
  timeOut: string; // "HH:mm"
  timeIn: string;
  status: OutpassStatus;
  advisorId?: string;
  advisorName?: string;
  hodId?: string;
  hodName?: string;
  wardenId?: string;
  wardenName?: string;
  advisorAction?: "approved" | "rejected";
  advisorRemark?: string;
  advisorActionAt?: string;
  hodAction?: "approved" | "rejected";
  hodRemark?: string;
  hodActionAt?: string;
  wardenAction?: "approved" | "rejected";
  wardenRemark?: string;
  wardenActionAt?: string;
  qrCode?: string;
  scannedOut?: boolean;
  scannedOutAt?: string;
  scannedIn?: boolean;
  scannedInAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Announcement {
  id: string;
  title: string;
  message: string;
  staffId: string;
  staffName: string;
  staffDesignation: string;
  createdAt: string;
  targetDepartment?: string; // undefined = all
}

export interface AuthUser {
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  role: UserRole;
  profileData: Student | Staff | Gatekeeper;
}
