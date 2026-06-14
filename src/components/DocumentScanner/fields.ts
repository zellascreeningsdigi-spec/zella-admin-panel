// Field keys (must match backend openaiService FIELD_KEYS + EMPLOYMENT_FIELD_KEYS exactly).
//
// Flat candidate-level fields (occur at most once per candidate):

export type FlatFieldKey =
  | 'employee_code' | 'name' | 'dob' | 'father_name' | 'email' | 'mobile'
  | 'degree' | 'enrollment_number' | 'university_name' | 'university_state' | 'period_of_study'
  | 'aadhaar_number' | 'aadhaar_address' | 'city' | 'state' | 'pin'
  | 'current_address' | 'permanent_address'
  | 'pan_number' | 'pan_dob' | 'pan_father_name'
  | 'passport_number' | 'passport_surname' | 'passport_given_name' | 'passport_dob'
  | 'passport_place_of_birth' | 'passport_place_of_issue' | 'passport_doi' | 'passport_doe';

// Per-employment-entry keys (repeats per job in fields.employments[]):
export type EmploymentFieldKey =
  | 'company_name' | 'designation' | 'employment_period' | 'employee_id'
  | 'supervisor_name_designation'
  | 'hr_name' | 'hr_contact' | 'hr_email'
  | 'date_of_joining' | 'date_of_exit' | 'reason_for_leaving';

// Union retained for any callers that historically iterated over both layers.
export type FieldKey = FlatFieldKey | EmploymentFieldKey;

export interface FieldDef {
  key: FieldKey;
  label: string;
}

export interface FieldGroup {
  title: string;
  fields: FieldDef[];
}

// Flat-field accordion groups — these are the candidate-level fields shown
// at the top of each candidate card. Employment is rendered separately as a
// repeating "Employment History" section (one sub-card per job).
export const FIELD_GROUPS: FieldGroup[] = [
  {
    title: 'Personal',
    fields: [
      { key: 'employee_code', label: 'Employee Code' },
      { key: 'name', label: 'Name of the Candidate' },
      { key: 'dob', label: 'Date of Birth' },
      { key: 'father_name', label: "Father's Name" },
      { key: 'email', label: 'Email' },
      { key: 'mobile', label: 'Mobile' }
    ]
  },
  {
    title: 'Education',
    fields: [
      { key: 'degree', label: 'Degree / Diploma' },
      { key: 'enrollment_number', label: 'Enrollment Number' },
      { key: 'university_name', label: 'University / Institute Name' },
      { key: 'university_state', label: 'State of University / Institute' },
      { key: 'period_of_study', label: 'Period of Study (YYYY-YYYY)' }
    ]
  },
  {
    title: 'Aadhaar & Address',
    fields: [
      { key: 'aadhaar_number', label: 'Aadhaar Number' },
      { key: 'aadhaar_address', label: 'Aadhaar Address' },
      { key: 'city', label: 'City' },
      { key: 'state', label: 'State' },
      { key: 'pin', label: 'PIN' },
      { key: 'current_address', label: 'Current Address' },
      { key: 'permanent_address', label: 'Permanent Address' }
    ]
  },
  {
    title: 'PAN',
    fields: [
      { key: 'pan_number', label: 'PAN Number' },
      { key: 'pan_dob', label: 'PAN — Date of Birth' },
      { key: 'pan_father_name', label: "PAN — Father's Name" }
    ]
  },
  {
    title: 'Passport',
    fields: [
      { key: 'passport_number', label: 'Passport Number' },
      { key: 'passport_surname', label: 'Surname' },
      { key: 'passport_given_name', label: 'Given Name' },
      { key: 'passport_dob', label: 'Passport — Date of Birth' },
      { key: 'passport_place_of_birth', label: 'Place of Birth' },
      { key: 'passport_place_of_issue', label: 'Place of Issue' },
      { key: 'passport_doi', label: 'Date of Issue (DOI)' },
      { key: 'passport_doe', label: 'Date of Expiry (DOE)' }
    ]
  }
];

// Per-employment-entry fields rendered inside each repeating sub-card.
export const EMPLOYMENT_FIELDS: { key: EmploymentFieldKey; label: string }[] = [
  { key: 'company_name', label: 'Company Name' },
  { key: 'designation', label: 'Designation' },
  { key: 'employment_period', label: 'Employment Period' },
  { key: 'employee_id', label: 'Employee ID' },
  { key: 'supervisor_name_designation', label: 'Supervisor Name & Designation' },
  { key: 'date_of_joining', label: 'Date of Joining' },
  { key: 'date_of_exit', label: 'Date of Exit' },
  { key: 'reason_for_leaving', label: 'Reason for Leaving' },
  { key: 'hr_name', label: 'HR Name' },
  { key: 'hr_contact', label: 'HR Contact Number' },
  { key: 'hr_email', label: 'HR Email' }
];

export const EMPLOYMENT_FIELD_KEYS: EmploymentFieldKey[] = EMPLOYMENT_FIELDS.map(f => f.key);

// Flat candidate-level keys (everything in FIELD_GROUPS).
export const FLAT_FIELD_KEYS: FlatFieldKey[] = FIELD_GROUPS.flatMap(g => g.fields.map(f => f.key as FlatFieldKey));

// Back-compat alias — historically callers iterated this for the editable
// form and the empty-row template. Now equivalent to the flat keys.
export const ALL_FIELD_KEYS: FieldKey[] = FLAT_FIELD_KEYS as FieldKey[];

export const DOC_TYPES: { value: string; label: string }[] = [
  { value: 'bgv_form', label: 'BGV Form' },
  { value: 'aadhaar', label: 'Aadhaar Card' },
  { value: 'pan', label: 'PAN Card' },
  { value: 'passport', label: 'Passport' },
  { value: 'marksheet_10th', label: '10th Marksheet / SSC' },
  { value: 'marksheet_12th', label: '12th Marksheet / HSC' },
  { value: 'degree', label: 'Degree Certificate' },
  { value: 'diploma', label: 'Diploma Certificate' },
  { value: 'experience_letter', label: 'Experience / Relieving Letter' },
  { value: 'offer_letter', label: 'Offer / Appointment Letter' },
  { value: 'other', label: 'Other' }
];

export function docTypeLabel(value: string | null | undefined): string {
  if (!value) return '';
  return DOC_TYPES.find(d => d.value === value)?.label || value;
}
