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

export interface CustomDocumentType {
  key: string;
  label: string;
  enabled: boolean;
}

export interface BGVFormConfig {
  steps: {
    education: boolean;
    employment: boolean;
    references: boolean;
    gapDetails: boolean;
  };
  documentTypes: {
    aadhaar: boolean;
    pan: boolean;
    degreeMarksheet: boolean;
    addressProof: boolean;
    passport: boolean;
    passportDeclaration: boolean;
    relievingLetter: boolean;
    paySlip: boolean;
    offerLetter: boolean;
    cv: boolean;
    signature: boolean;
  };
  customDocumentTypes?: CustomDocumentType[];
}

export const DEFAULT_BGV_FORM_CONFIG: BGVFormConfig = {
  steps: {
    education: true,
    employment: true,
    references: true,
    gapDetails: true,
  },
  documentTypes: {
    aadhaar: true,
    pan: true,
    degreeMarksheet: true,
    addressProof: true,
    passport: true,
    passportDeclaration: true,
    relievingLetter: true,
    paySlip: true,
    offerLetter: true,
    cv: true,
    signature: true,
  },
  customDocumentTypes: [],
};

export interface Customer {
  _id?: string;
  id?: string;
  companyName: string;
  emails: string[];
  documentsRequired?: string[];
  documents?: CustomerDocument[];
  bgvFormConfig?: BGVFormConfig;
  createdAt?: string;
  updatedAt?: string;
  lastReportSent?: string;
}
