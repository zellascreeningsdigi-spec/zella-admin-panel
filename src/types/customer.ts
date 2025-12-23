export interface CustomerDocument {
  _id: string;
  name: string;
  originalName: string;
  s3Key: string;
  s3Url?: string;
  fileSize?: number;
  mimeType?: string;
  uploadedBy?: {
    _id: string;
    name: string;
    email: string;
  };
  uploadedAt: string;
}

export interface Customer {
  _id?: string;
  id?: string;
  companyName: string;
  emails: string[];
  documentsRequired?: string[];
  documents?: CustomerDocument[];
  createdAt?: string;
  updatedAt?: string;
  lastReportSent?: string;
}
