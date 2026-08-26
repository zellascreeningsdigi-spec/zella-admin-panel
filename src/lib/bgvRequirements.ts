import { BGVFormConfig } from '@/types/customer';

// Labels must match BGVFormConfigEditor and the backend's documentCollectionService
// so the message reads the same as the form the candidate actually sees.
const STEP_LABELS: { key: keyof BGVFormConfig['steps']; label: string }[] = [
  { key: 'education', label: 'Education Details' },
  { key: 'employment', label: 'Employment History' },
  { key: 'references', label: 'Professional References' },
  { key: 'gapDetails', label: 'Gap Period Details' },
];

const DOC_TYPE_LABELS: { key: keyof BGVFormConfig['documentTypes']; label: string }[] = [
  { key: 'aadhaar', label: 'Aadhaar Card' },
  { key: 'pan', label: 'PAN Card' },
  { key: 'degreeMarksheet', label: 'Degree / Marksheet' },
  { key: 'addressProof', label: 'Address Proof' },
  { key: 'passport', label: 'Passport' },
  { key: 'passportDeclaration', label: 'Passport Declaration' },
  { key: 'cv', label: 'CV / Resume' },
  { key: 'signature', label: 'Signature' },
];

// A step/document is included unless it was explicitly turned off, so older
// collections saved without a formConfig still get the full checklist.
const isEnabled = (value?: boolean) => value !== false;

/**
 * Build the "You will need to provide" checklist from the checks selected for
 * this candidate. Returns the numbered sections and the enabled document labels.
 */
export function buildRequirementList(formConfig?: BGVFormConfig): {
  items: string[];
  documents: string[];
} {
  const steps = (formConfig?.steps ?? {}) as Partial<BGVFormConfig['steps']>;
  const documentTypes = (formConfig?.documentTypes ?? {}) as Partial<BGVFormConfig['documentTypes']>;
  const customDocumentTypes = formConfig?.customDocumentTypes ?? [];

  // Personal info and the Letter of Authorization are always collected.
  const items: string[] = ['Personal Information & Address History'];

  for (const { key, label } of STEP_LABELS) {
    if (isEnabled(steps[key])) items.push(label);
  }

  items.push('Letter of Authorization');

  const documents = [
    ...DOC_TYPE_LABELS.filter(d => isEnabled(documentTypes[d.key])).map(d => d.label),
    ...customDocumentTypes.filter(d => isEnabled(d?.enabled) && d?.label).map(d => d.label),
  ];

  if (documents.length > 0) {
    items.push(`Supporting Documents (${documents.join(', ')})`);
  }

  return { items, documents };
}
