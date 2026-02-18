export interface AddressVerification {
  _id?: string;
  code: string;
  applicantNo?: string;
  name: string;
  fathersName?: string;
  initiatorName?: string;
  phone: string;
  email: string;
  companyName: string;
  address: string;
  presentAddress?: string;
  city?: string;
  state?: string;
  pin?: string;
  landmark?: string;
  addressType: 'current' | 'permanent' | 'office';
  status: 'pending' | 'verified' | 'failed' | 'insufficiency';
  verificationStatus: 'not_initiated' | 'link_sent' | 'in_progress' | 'completed' | 'expired';
  verificationMethod: 'self' | 'physical' | 'document';
  verificationLink?: string;
  verificationToken?: string;
  verificationData?: VerificationData;
  expiresAt?: string;
  formSubmitDate?: string;
  submittedBy?: string;
  lastSyncedAt?: string;
  syncStatus?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface DocumentUpload {
  docName: string;
  s3Key: string;
  s3Url: string;
  uploadedAt: string;
}

export interface VerificationData {
  submittedAt?: string;
  ipAddress?: string;
  userAgent?: string;

  // Contact Information
  contactPersonName?: string;
  contactPersonRelation?: string;
  numberOfFamilyMembers?: number;
  contactPhoneNo?: string;

  // ID Proof
  idProofType?: 'aadhaar' | 'pan' | 'voter_id' | 'passport' | 'driving_license' | 'other';
  idProofNumber?: string;

  // Address Details
  periodOfStay?: string;
  differentAddress?: string;
  residentialStatus?: 'owned' | 'rented' | 'company_provided' | 'pg' | 'other';
  landmark?: string;
  remarks?: string;

  // Geolocation
  latitude?: number;
  longitude?: number;
  gpsAddress?: string;

  // Document Uploads (6 specific documents)
  idProofOne?: DocumentUpload;
  idProofTwo?: DocumentUpload;
  houseImageOne?: DocumentUpload;
  houseImageTwo?: DocumentUpload;
  signature?: DocumentUpload;
  candidateSelfie?: DocumentUpload;

  // Legacy fields
  addressConfirmed?: boolean;
  correctedAddress?: string;
  candidateComments?: string;
  verifierComments?: string;
  verifiedBy?: string;
  verifiedAt?: string;
}

export interface ProofDocument {
  docType: 'utility_bill' | 'aadhaar' | 'rent_agreement' | 'property_tax' | 'other';
  docName: string;
  s3Key: string;
  s3Url: string;
  uploadedAt: string;
}

export interface AddressVerificationStats {
  total: number;
  pending: number;
  verified: number;
  failed: number;
  linkSent: number;
  expired: number;
  successRate: number;
}
