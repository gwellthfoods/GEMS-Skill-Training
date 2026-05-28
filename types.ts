export interface PRDraftReview {
  score: number; // Score out of 10
  feedback: string[]; // Array of feedback points
}

export interface Participant {
  id: string;
  photo: string; // base64 string
  qrCode: string; // base64 string of QR code PNG
  name: string;
  address1: string;
  address2: string;
  city: string;
  pinCode: string;
  nativeAddress: string;
  mobile: string;
  alternateMobile: string;
  email: string;
  parentName: string;
  collegeName: string;
  semesterYear: string;
  course: string;
  referredBy: string;
  hobbies: string;
  goals: string;
  other: string;
  programEnrolled: string;
  startDate: string;
  endDate: string;
  targetAudience: string;
  preferredLanguage: 'English' | 'Hindi';
  prDraft: string;
  prDraftReview: PRDraftReview;
  status: 'Active' | 'Completed' | 'Dropped' | 'Checked-In';
}

export type AppView = 'registration' | 'success' | 'adminLogin' | 'adminDashboard';