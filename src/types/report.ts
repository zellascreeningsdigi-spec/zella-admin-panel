export interface ReportDocument {
  _id: string;
  name: string;
  originalName: string;
  s3Key: string;
  s3Url?: string;
  fileSize: number;
  mimeType: string;
  uploadedBy: {
    _id: string;
    name: string;
    email: string;
  };
  uploadedAt: string;
}

export interface RequestedEmail {
  email: string;
  status: 'sent' | 'failed';
  sentAt: string;
  error?: string;
}

export interface Report {
  _id: string;
  reportType: string;
  description: string;
  customerId: {
    _id: string;
    companyName: string;
    emails: string[];
  };
  companyName: string;
  requestedEmails: RequestedEmail[];
  requestedBy: {
    _id: string;
    name: string;
    email: string;
    designation?: string;
  };
  dueDate?: string;
  status: 'pending' | 'in-progress' | 'submitted' | 'reviewed' | 'rejected';
  documents: ReportDocument[];
  submittedAt?: string;
  submittedBy?: {
    _id: string;
    name: string;
    email: string;
  };
  reviewedAt?: string;
  reviewedBy?: {
    _id: string;
    name: string;
    email: string;
  };
  reviewNotes?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  originalAttachment?: {
    fileName: string;
    fileSize: number;
    s3Key: string;
    s3Url?: string;
    rowCount: number;
    uploadedAt: string;
  };
  additionalAttachment?: {
    fileName: string;
    fileSize: number;
    s3Key: string;
    s3Url?: string;
    mimeType: string;
    uploadedAt: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface ReportFormData {
  reportType: string;
  description: string;
  customerId: string;
  emails: string[];
  dueDate?: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
}

export const REPORT_STATUS_COLORS = {
  pending: 'bg-yellow-100 text-yellow-800',
  'in-progress': 'bg-blue-100 text-blue-800',
  submitted: 'bg-green-100 text-green-800',
  reviewed: 'bg-purple-100 text-purple-800',
  rejected: 'bg-red-100 text-red-800',
};

export const PRIORITY_COLORS = {
  low: 'bg-gray-100 text-gray-800',
  medium: 'bg-blue-100 text-blue-800',
  high: 'bg-orange-100 text-orange-800',
  urgent: 'bg-red-100 text-red-800',
};
