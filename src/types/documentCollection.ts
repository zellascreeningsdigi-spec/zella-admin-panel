export interface DocumentUpload {
  docName: string;
  s3Key: string;
  s3Url: string;
  uploadedAt: string;
}

export interface Address {
  address: string;
  duration: string;
}

export interface Employment {
  companyName: string;
  periodFrom: string;
  periodTo: string;
  designation: string;
  ctc: string;
  employeeId: string;
  supervisorName: string;
  supervisorDesignation: string;
  supervisorContact: string;
  supervisorEmail: string;
  hrName: string;
  hrContact: string;
  hrEmail: string;
  reasonForLeaving: string;
  natureOfEmployment: string;
  typeOfEmployment: string;
}

export interface Reference {
  name: string;
  designation: string;
  organization: string;
  relationship: string;
  contact: string;
  email: string;
}

export interface GapDetail {
  hasGap: 'yes' | 'no' | '';
  duration: string;
  reason: string;
}

export interface GapDetailEntry extends GapDetail {
  key: string;
  label: string;
}

export interface PersonalInfo {
  fullName: string;
  dob: string;
  nationality: string;
  fathersName: string;
  mobile: string;
  alternateNumber: string;
  addresses: Address[];
  gender: string;
  email: string;
  aadhaarNumber: string;
  panNumber: string;
}

export interface Education {
  degree: string;
  enrollmentNo: string;
  yearOfPassing: string;
  universityName: string;
  universityLocation: string;
  periodOfStudyFrom: string;
  periodOfStudyTo: string;
  courseType: 'regular' | 'part_time' | 'correspondence' | '';
}

export interface LOA {
  authCheckbox1: boolean;
  authCheckbox2: boolean;
  authCheckbox3: boolean;
  title: 'Mr' | 'Ms' | 'Mrs' | '';
  nameInCapitals: string;
  date: string;
}

export interface BGVFormData {
  personalInfo: PersonalInfo;
  education: Education;
  employmentHistory: Employment[];
  references: Reference[];
  gapDetails: GapDetailEntry[];
  loa: LOA;
}

export interface DocumentCollectionDocuments {
  aadhaar?: DocumentUpload;
  pan?: DocumentUpload;
  degreeMarksheet?: DocumentUpload;
  addressProof?: DocumentUpload;
  passport?: DocumentUpload;
  passportDeclaration?: DocumentUpload;
  relievingLetter?: DocumentUpload;
  paySlip?: DocumentUpload;
  offerLetter?: DocumentUpload;
  cv?: DocumentUpload;
  signature?: DocumentUpload;
}

export interface CustomDocumentsMap {
  [key: string]: DocumentUpload | undefined;
}

export interface GeneratedDocx {
  s3Key: string;
  s3Url: string;
  fileName: string;
  generatedAt: string;
}

import type { BGVFormConfig } from './customer';

export interface DocumentCollection {
  _id?: string;
  code: string;
  name: string;
  phone: string;
  email: string;
  customerId: string;
  companyName: string;
  formConfig?: BGVFormConfig;
  status: 'pending' | 'approved' | 'rejected';
  verificationStatus: 'not_initiated' | 'link_sent' | 'in_progress' | 'completed' | 'expired';
  verificationLink?: string;
  verificationToken?: string;
  expiresAt?: string;
  formData?: BGVFormData;
  documents?: DocumentCollectionDocuments;
  customDocuments?: CustomDocumentsMap;
  generatedDocx?: GeneratedDocx;
  submittedAt?: string;
  ipAddress?: string;
  userAgent?: string;
  adminComments?: string;
  initiatorName?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface DocumentCollectionStats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  linkSent: number;
  completed: number;
  successRate: number;
}

export interface CompanySummary {
  _id: string;
  customerId: string;
  companyName: string;
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  completed: number;
  notInitiated: number;
  lastCreatedAt: string;
}
