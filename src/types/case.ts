export interface DocumentStored {
  docType: string;
  s3Key: string;
  s3Url: string;
  uploadedAt: Date;
  verificationStatus: string;
}

export interface Case {
  _id?: string;
  id: string;
  phpCaseId?: string;
  code: string;
  date: string;
  name: string;
  phone: string;
  appNo: string;
  companyName: string;
  status: 'pending' | 'completed' | 'insufficiency';
  digiLockerStatus?: 'not_initiated' | 'initiated' | 'auth_success' | 'documents_fetched' | 'completed' | 'failed';
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  pin?: string;
  formSubmitDate?: string;
  submittedBy?: string;
  syncStatus?: string;
  lastSyncedAt?: string;
  digiLockerSessions?: string[];
  documentsStored?: DocumentStored[];
  createdAt?: string;
  updatedAt?: string;
}

export interface CaseAction {
  id: string;
  type: 'edit' | 'whatsapp' | 'view' | 'edit_report' | 'delete' | 'digilocker';
  label: string;
  icon: string;
}