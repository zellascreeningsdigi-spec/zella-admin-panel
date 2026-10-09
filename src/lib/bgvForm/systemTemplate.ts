// @ts-nocheck
// ---------------------------------------------------------------------------
// GENERATED MIRROR — DO NOT EDIT DIRECTLY.
//
// Source of truth: Zella-Screenings-backend/services/bgvForm/systemTemplate.js
// Copied verbatim because the admin panel and backend are separate packages.
// Typed wrappers live in src/lib/bgvForm/types.ts.
//
// After changing the backend module, re-sync with:
//   node Zella-Screenings-backend/scripts/syncBgvValidators.js
// ---------------------------------------------------------------------------
/* eslint-disable */

// The shipped default BGV form, expressed as a template.
//
// This is today's hardcoded form (DocumentCollectionPage.tsx before the form
// builder) translated field by field: same labels, same asterisks, same
// validation as validateBGVFormData in services/bgvFieldValidators.js. Every
// company and group that has never opened the form builder is served this
// template with their old step/document toggles applied
// (see legacyTemplateFromFormConfig in templateEngine.js), so a change here
// changes the form for EVERY such candidate. The parity test
// (scripts/bgvFormBuilderParityTest.js) fails if validation drifts from the
// legacy validator.
//
// Mirrored to the admin panel by scripts/syncBgvValidators.js — edit here only.
//
// Field properties:
//   id            unique across the template, never changes once created
//   path          where the answer is stored. Top level: relative to formData.
//                 Inside a repeater: relative to the row.
//   required      enforced by validation (client and server)
//   requiredFrom  ISO date: `required` only applies to candidates created on
//                 or after it. Records created earlier are grandfathered.
//   displayRequired  show the asterisk even when not enforced (legacy fields
//                 that always displayed one)
//   protected     on a rule: only a super-admin may remove it
//   locked        the field cannot be hidden or deleted (only relabelled)
//   clientOnly    `required` is enforced by the candidate page only, never by
//                 the server -- the original form gated the authorization
//                 ticks in the browser, and API clients that submit without
//                 them must keep working
//   hideRequiredMark  required, but shown without the * (the original gap
//                 fields were unmarked)
//   reportLabel   label in the generated DOCX report. Unset = the report's
//                 own fixed wording.

// When the education period / course type and employment detail fields became
// mandatory. Mirrors EDUCATION_PERIOD_REQUIRED_FROM in bgvFieldValidators.js.
export const LEGACY_REQUIRED_FROM = '2026-08-26T00:00:00.000Z';

const LOA_TEXT_1 = 'I hereby authorize Zella Screenings to conduct background verification checks as may be necessary for the purpose of my employment/engagement. I understand that this may include but is not limited to verification of my educational qualifications, employment history, criminal records, and identity.';
const LOA_TEXT_2 = 'I confirm that the information provided by me in this form is true and accurate to the best of my knowledge. I understand that any misrepresentation or omission of facts may result in disqualification from employment or termination of service.';
const LOA_TEXT_3 = 'I authorize the release of any information to Zella Screenings and/or their authorized agents for the purpose of conducting background verification. I release all parties from any liability or claims arising from the investigation.';

const meaningful = (opts) => ({ rule: 'meaningfulText', ...(opts ? { value: opts } : {}) });

export const SYSTEM_STEPS = () => [
  {
    id: 'personalInfo',
    title: 'Personal Info',
    description: 'Basic Details',
    heading: 'Personal Information',
    checklistLabel: 'Personal Information & Address History',
    builtIn: true,
    locked: true,
    fields: [
      { id: 'personalInfo.fullName', path: 'personalInfo.fullName', type: 'text', label: 'Full Name', required: true, locked: true, builtIn: true, validations: [meaningful()] },
      { id: 'personalInfo.dob', path: 'personalInfo.dob', type: 'date', label: 'Date of Birth', displayRequired: true, builtIn: true, validations: [] },
      { id: 'personalInfo.nationality', path: 'personalInfo.nationality', type: 'text', label: 'Nationality', defaultValue: 'Indian', builtIn: true, validations: [] },
      { id: 'personalInfo.fathersName', path: 'personalInfo.fathersName', type: 'text', label: "Father's Name", displayRequired: true, builtIn: true, validations: [meaningful()] },
      { id: 'personalInfo.mobile', path: 'personalInfo.mobile', type: 'phone', label: 'Mobile Number', required: true, builtIn: true, validations: [{ rule: 'mobile', protected: true }] },
      { id: 'personalInfo.alternateNumber', path: 'personalInfo.alternateNumber', type: 'phone', label: 'Alternate Number', builtIn: true, validations: [{ rule: 'mobile' }] },
      {
        id: 'personalInfo.gender', path: 'personalInfo.gender', type: 'dropdown', label: 'Gender', displayRequired: true, builtIn: true, validations: [],
        options: [{ value: 'male', label: 'Male' }, { value: 'female', label: 'Female' }, { value: 'other', label: 'Other' }]
      },
      { id: 'personalInfo.email', path: 'personalInfo.email', type: 'email', label: 'Email', required: true, builtIn: true, validations: [{ rule: 'email', protected: true }] },
      { id: 'personalInfo.aadhaarNumber', path: 'personalInfo.aadhaarNumber', type: 'text', label: 'Aadhaar Number', required: true, builtIn: true, validations: [{ rule: 'aadhaar', protected: true }] },
      { id: 'personalInfo.panNumber', path: 'personalInfo.panNumber', type: 'text', label: 'PAN Number', required: true, builtIn: true, validations: [{ rule: 'pan', protected: true }] },
      {
        id: 'personalInfo.addresses',
        path: 'personalInfo.addresses',
        type: 'repeater',
        widget: 'addressHistory',
        label: 'Address History',
        itemLabel: 'Address',
        addLabel: 'Add Address',
        minItems: 1,
        initialItems: 1,
        skipBlankRows: true,
        builtIn: true,
        width: 'full',
        validations: [],
        itemFields: [
          { id: 'address.address', path: 'address', type: 'text', label: 'Address', placeholder: 'Full address', builtIn: true, validations: [meaningful({ minLength: 10 })] },
          {
            id: 'address.addressType', path: 'addressType', type: 'dropdown', label: 'Address Type', builtIn: true, validations: [],
            options: [{ value: 'current', label: 'Current' }, { value: 'permanent', label: 'Permanent' }, { value: 'other', label: 'Other' }]
          },
          { id: 'address.durationYears', path: 'durationYears', type: 'number', label: 'Years', builtIn: true, validations: [{ rule: 'min', value: 0, message: 'Enter the duration of stay' }] },
          { id: 'address.durationMonths', path: 'durationMonths', type: 'number', label: 'Months', builtIn: true, validations: [{ rule: 'min', value: 0, message: 'Enter the duration of stay' }, { rule: 'max', value: 11, message: 'Enter the duration of stay' }] }
        ]
      }
    ]
  },
  {
    id: 'education',
    title: 'Education',
    description: 'Academic Details',
    heading: 'Education Details',
    checklistLabel: 'Education Details',
    builtIn: true,
    fields: [
      { id: 'education.degree', path: 'education.degree', type: 'text', label: 'Degree / Qualification', required: true, builtIn: true, validations: [meaningful()] },
      { id: 'education.enrollmentNo', path: 'education.enrollmentNo', type: 'text', label: 'Enrollment No.', builtIn: true, validations: [meaningful({ allowCode: true })] },
      { id: 'education.yearOfPassing', path: 'education.yearOfPassing', type: 'text', label: 'Year of Passing', required: true, builtIn: true, validations: [{ rule: 'year' }] },
      { id: 'education.universityName', path: 'education.universityName', type: 'text', label: 'University / Board Name', required: true, builtIn: true, validations: [meaningful()] },
      { id: 'education.universityLocation', path: 'education.universityLocation', type: 'text', label: 'University Location', builtIn: true, validations: [meaningful()] },
      { id: 'education.periodOfStudyFrom', path: 'education.periodOfStudyFrom', type: 'month', label: 'Period of Study From', required: true, requiredFrom: LEGACY_REQUIRED_FROM, displayRequired: true, builtIn: true, validations: [] },
      { id: 'education.periodOfStudyTo', path: 'education.periodOfStudyTo', type: 'month', label: 'Period of Study To', required: true, requiredFrom: LEGACY_REQUIRED_FROM, displayRequired: true, builtIn: true, validations: [{ rule: 'dateAfter', value: 'education.periodOfStudyFrom' }] },
      {
        id: 'education.courseType', path: 'education.courseType', type: 'dropdown', label: 'Course Type', required: true, requiredFrom: LEGACY_REQUIRED_FROM, displayRequired: true, builtIn: true, validations: [],
        options: [{ value: 'regular', label: 'Regular' }, { value: 'part_time', label: 'Part Time' }, { value: 'correspondence', label: 'Correspondence' }]
      }
    ]
  },
  {
    id: 'employment',
    title: 'Employment',
    description: 'Work History',
    heading: 'Employment History',
    checklistLabel: 'Employment History',
    builtIn: true,
    fields: [
      {
        id: 'employmentHistory',
        path: 'employmentHistory',
        type: 'repeater',
        widget: 'cards',
        label: 'Employment History',
        itemLabel: 'Employment',
        addLabel: 'Add Employment',
        emptyText: 'No employment history added. If you are a fresher, you can proceed without adding any employment.',
        minItems: 0,
        maxItems: 10,
        initialItems: 1,
        skipBlankRows: true,
        builtIn: true,
        width: 'full',
        validations: [],
        itemFields: [
          { id: 'employment.companyName', path: 'companyName', type: 'text', label: 'Company Name', displayRequired: true, builtIn: true, validations: [meaningful()] },
          { id: 'employment.designation', path: 'designation', type: 'text', label: 'Designation', builtIn: true, validations: [meaningful()] },
          { id: 'employment.periodFrom', path: 'periodFrom', type: 'month', label: 'Period From', required: true, requiredFrom: LEGACY_REQUIRED_FROM, displayRequired: true, builtIn: true, validations: [] },
          { id: 'employment.periodTo', path: 'periodTo', type: 'month', label: 'Period To', required: true, requiredFrom: LEGACY_REQUIRED_FROM, displayRequired: true, builtIn: true, validations: [{ rule: 'dateAfter', value: 'employment.periodFrom' }] },
          { id: 'employment.ctc', path: 'ctc', type: 'text', label: 'CTC', required: true, requiredFrom: LEGACY_REQUIRED_FROM, displayRequired: true, builtIn: true, validations: [{ rule: 'ctc' }] },
          { id: 'employment.employeeId', path: 'employeeId', type: 'text', label: 'Employee ID', required: true, requiredFrom: LEGACY_REQUIRED_FROM, displayRequired: true, builtIn: true, validations: [meaningful({ allowCode: true })] },
          { id: 'employment.supervisorName', path: 'supervisorName', type: 'text', label: 'Supervisor Name', builtIn: true, validations: [meaningful()] },
          { id: 'employment.supervisorDesignation', path: 'supervisorDesignation', type: 'text', label: 'Supervisor Designation', builtIn: true, validations: [] },
          { id: 'employment.supervisorContact', path: 'supervisorContact', type: 'phone', label: 'Supervisor Contact', builtIn: true, validations: [{ rule: 'mobile' }] },
          { id: 'employment.supervisorEmail', path: 'supervisorEmail', type: 'email', label: 'Supervisor Email', builtIn: true, validations: [{ rule: 'email' }] },
          // The HR block is stored verbatim with no format check -- see the
          // product decision recorded in bgvFieldValidators.js.
          { id: 'employment.hrName', path: 'hrName', type: 'text', label: 'HR Name', builtIn: true, validations: [] },
          { id: 'employment.hrContact', path: 'hrContact', type: 'text', label: 'HR Contact', builtIn: true, validations: [] },
          { id: 'employment.hrEmail', path: 'hrEmail', type: 'text', label: 'HR Email', builtIn: true, validations: [] },
          { id: 'employment.reasonForLeaving', path: 'reasonForLeaving', type: 'text', label: 'Reason for Leaving', builtIn: true, validations: [] },
          {
            id: 'employment.natureOfEmployment', path: 'natureOfEmployment', type: 'dropdown', label: 'Nature of Employment', builtIn: true, validations: [],
            options: [{ value: 'permanent', label: 'Permanent' }, { value: 'contract', label: 'Contract' }, { value: 'temporary', label: 'Temporary' }, { value: 'internship', label: 'Internship' }]
          },
          {
            id: 'employment.typeOfEmployment', path: 'typeOfEmployment', type: 'dropdown', label: 'Type of Employment', builtIn: true, validations: [],
            options: [{ value: 'full_time', label: 'Full Time' }, { value: 'part_time', label: 'Part Time' }]
          }
        ]
      }
    ]
  },
  {
    id: 'references',
    title: 'References',
    description: 'Professional Refs',
    heading: 'Professional References',
    checklistLabel: 'Professional References',
    builtIn: true,
    fields: [
      {
        id: 'references',
        path: 'references',
        type: 'repeater',
        widget: 'cards',
        label: 'Professional References',
        itemLabel: 'Reference',
        addLabel: 'Add Reference',
        minItems: 1,
        initialItems: 1,
        skipBlankRows: true,
        builtIn: true,
        width: 'full',
        validations: [],
        itemFields: [
          { id: 'reference.name', path: 'name', type: 'text', label: 'Name', displayRequired: true, builtIn: true, validations: [meaningful()] },
          { id: 'reference.designation', path: 'designation', type: 'text', label: 'Designation', builtIn: true, validations: [meaningful()] },
          { id: 'reference.organization', path: 'organization', type: 'text', label: 'Organization', builtIn: true, validations: [meaningful()] },
          { id: 'reference.relationship', path: 'relationship', type: 'text', label: 'Relationship', builtIn: true, validations: [meaningful()] },
          { id: 'reference.contact', path: 'contact', type: 'phone', label: 'Contact Number', displayRequired: true, builtIn: true, validations: [{ rule: 'mobile' }] },
          { id: 'reference.email', path: 'email', type: 'email', label: 'Email', builtIn: true, validations: [{ rule: 'email' }] }
        ]
      }
    ]
  },
  {
    id: 'gapDetails',
    title: 'Gap Details',
    description: 'Career Gaps',
    heading: 'Gap Period Details',
    checklistLabel: 'Gap Period Details',
    builtIn: true,
    // Gaps are derived from employment periods; without employment there is
    // nothing to compute them from.
    dependsOnStep: 'employment',
    fields: [
      {
        id: 'gapDetails',
        path: 'gapDetails',
        type: 'repeater',
        widget: 'gapDetails',
        label: 'Gap Period Details',
        skipBlankRows: true,
        builtIn: true,
        width: 'full',
        validations: [],
        itemFields: [
          {
            id: 'gap.hasGap', path: 'hasGap', type: 'dropdown', label: 'Any Gap?', builtIn: true, validations: [],
            options: [{ value: 'yes', label: 'Yes' }, { value: 'no', label: 'No' }]
          },
          { id: 'gap.duration', path: 'duration', type: 'text', label: 'Duration', placeholder: 'e.g. 6 months', required: true, hideRequiredMark: true, builtIn: true, showIf: { field: 'gap.hasGap', equals: 'yes' }, validations: [meaningful({ allowCode: true })] },
          { id: 'gap.reason', path: 'reason', type: 'text', label: 'Reason', required: true, hideRequiredMark: true, builtIn: true, showIf: { field: 'gap.hasGap', equals: 'yes' }, validations: [{ rule: 'meaningfulText', value: { minLength: 10 }, message: 'Enter a meaningful reason (at least 10 characters)' }] }
        ]
      }
    ]
  },
  {
    id: 'loa',
    title: 'LOA',
    description: 'Authorization',
    heading: 'Letter of Authorization',
    checklistLabel: 'Letter of Authorization',
    builtIn: true,
    locked: true,
    fields: [
      { id: 'loa.authCheckbox1', path: 'loa.authCheckbox1', type: 'consent', label: LOA_TEXT_1, required: true, requiredMessage: 'Please accept all authorization checkboxes to proceed', clientOnly: true, locked: true, builtIn: true, width: 'full', validations: [] },
      { id: 'loa.authCheckbox2', path: 'loa.authCheckbox2', type: 'consent', label: LOA_TEXT_2, required: true, requiredMessage: 'Please accept all authorization checkboxes to proceed', clientOnly: true, locked: true, builtIn: true, width: 'full', validations: [] },
      { id: 'loa.authCheckbox3', path: 'loa.authCheckbox3', type: 'consent', label: LOA_TEXT_3, required: true, requiredMessage: 'Please accept all authorization checkboxes to proceed', clientOnly: true, locked: true, builtIn: true, width: 'full', validations: [] },
      {
        id: 'loa.title', path: 'loa.title', type: 'dropdown', label: 'Title', displayRequired: true, builtIn: true, width: 'third', validations: [],
        options: [{ value: 'Mr', label: 'Mr' }, { value: 'Ms', label: 'Ms' }, { value: 'Mrs', label: 'Mrs' }]
      },
      { id: 'loa.nameInCapitals', path: 'loa.nameInCapitals', type: 'text', label: 'Name (IN CAPITALS)', displayRequired: true, builtIn: true, width: 'third', validations: [] },
      { id: 'loa.date', path: 'loa.date', type: 'date', label: 'Date', displayRequired: true, defaultValue: '$today', builtIn: true, width: 'third', validations: [] }
    ]
  },
  {
    id: 'documents',
    type: 'documents',
    title: 'Documents',
    description: 'Upload Files',
    heading: 'Document Upload',
    helpText: 'Upload all documents (max 5MB each, PDF/JPG/PNG). Documents are uploaded immediately when selected.',
    builtIn: true,
    locked: true,
    fields: []
  }
];

// Built-in document slots. `key` is the storage key under `documents`;
// `uploadKey` is the docType the upload endpoint expects.
export const SYSTEM_DOCUMENTS = () => [
  { id: 'aadhaar', key: 'aadhaar', uploadKey: 'aadhaar', label: 'Aadhaar Card', checklistLabel: 'Aadhaar Card', required: true, builtIn: true },
  { id: 'pan', key: 'pan', uploadKey: 'pan', label: 'PAN Card', checklistLabel: 'PAN Card', required: true, builtIn: true },
  { id: 'degreeMarksheet', key: 'degreeMarksheet', uploadKey: 'degree_marksheet', label: 'Degree / Marksheet', checklistLabel: 'Degree / Marksheet', required: true, builtIn: true },
  { id: 'addressProof', key: 'addressProof', uploadKey: 'address_proof', label: 'Address Proof', checklistLabel: 'Address Proof', required: true, builtIn: true },
  { id: 'passport', key: 'passport', uploadKey: 'passport', label: 'Passport (if available)', checklistLabel: 'Passport', required: true, builtIn: true },
  { id: 'passportDeclaration', key: 'passportDeclaration', uploadKey: 'passport_declaration', label: 'Passport Declaration (if no passport)', checklistLabel: 'Passport Declaration', required: true, builtIn: true },
  { id: 'cv', key: 'cv', uploadKey: 'cv', label: 'CV / Resume', checklistLabel: 'CV / Resume', required: true, builtIn: true },
  { id: 'signature', key: 'signature', uploadKey: 'signature', label: 'Signature', checklistLabel: 'Signature', required: true, builtIn: true },
  {
    // One card per employment entry; at least one of the three is required.
    // Stored in customDocuments as `<key>_emp_<index>`.
    id: 'employmentProofs',
    type: 'perEmployment',
    label: 'Documents',
    helpText: 'Upload at least one: Relieving Letter, Offer Letter, or Pay Slip',
    required: true,
    builtIn: true,
    dependsOnStep: 'employment',
    subDocs: [
      { key: 'relievingLetter', label: 'Relieving Letter' },
      { key: 'offerLetter', label: 'Offer Letter' },
      { key: 'paySlip', label: 'Pay Slip' }
    ]
  }
];

export const BUILT_IN_DOCUMENT_IDS = [
  'aadhaar', 'pan', 'degreeMarksheet', 'addressProof',
  'passport', 'passportDeclaration', 'cv', 'signature'
];

export const OPTIONAL_STEP_IDS = ['education', 'employment', 'references', 'gapDetails'];

export const systemTemplate = () => ({
  schemaVersion: 1,
  steps: SYSTEM_STEPS(),
  documents: SYSTEM_DOCUMENTS()
});

export default systemTemplate;
