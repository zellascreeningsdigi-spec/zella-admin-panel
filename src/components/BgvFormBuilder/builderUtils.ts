import {
  FieldType,
  FormTemplate,
  TemplateDocument,
  TemplateField,
  TemplateStep,
  clone,
  isStepVisible,
  newDocumentId,
  newFieldId,
  newStepId,
} from '@/lib/bgvForm/types';

// Pure helpers for editing a draft template in the form builder. Every helper
// returns a new template; nothing mutates the draft in place.

export const FIELD_TYPE_OPTIONS: { type: FieldType; label: string; hint: string }[] = [
  { type: 'text', label: 'Short text', hint: 'A single line of text' },
  { type: 'textarea', label: 'Long text', hint: 'Several lines of text' },
  { type: 'number', label: 'Number', hint: 'Digits only' },
  { type: 'email', label: 'Email', hint: 'An email address' },
  { type: 'phone', label: 'Phone', hint: 'A phone number' },
  { type: 'date', label: 'Date', hint: 'Day, month and year' },
  { type: 'month', label: 'Month', hint: 'Month and year' },
  { type: 'dropdown', label: 'Dropdown', hint: 'Pick one from a list' },
  { type: 'radio', label: 'Choice buttons', hint: 'Pick one, all options visible' },
  { type: 'multiselect', label: 'Multiple choice', hint: 'Pick any number from a list' },
  { type: 'checkbox', label: 'Yes / no checkbox', hint: 'A single tick box' },
  { type: 'consent', label: 'Declaration', hint: 'A statement the candidate must accept' },
  { type: 'file', label: 'File upload', hint: 'A document or photo' },
  { type: 'info', label: 'Instructions', hint: 'Text shown to the candidate, no answer' },
  { type: 'repeater', label: 'Repeating section', hint: 'A group of fields the candidate can add several times' },
];

export const fieldTypeLabel = (type: FieldType) =>
  FIELD_TYPE_OPTIONS.find((o) => o.type === type)?.label || type;

const OPTION_TYPES: FieldType[] = ['dropdown', 'radio', 'multiselect'];
export const hasOptions = (type: FieldType) => OPTION_TYPES.includes(type);

/** A new custom field of the given type, with sensible defaults. */
export const createField = (type: FieldType, inRepeater = false): TemplateField => {
  const id = newFieldId();
  const field: TemplateField = {
    id,
    path: `custom.${id}`,
    type,
    label: type === 'info' ? 'Instructions for the candidate'
      : type === 'consent' ? 'I confirm that ...'
      : type === 'repeater' ? 'New section'
      : 'New question',
    required: false,
    validations: [],
  };
  if (hasOptions(type)) {
    field.options = [
      { value: 'option_1', label: 'Option 1' },
      { value: 'option_2', label: 'Option 2' },
    ];
  }
  if (type === 'consent') field.required = true;
  if (type === 'repeater' && !inRepeater) {
    field.itemLabel = 'Entry';
    field.addLabel = 'Add entry';
    field.minItems = 0;
    field.initialItems = 1;
    field.maxItems = 10;
    field.skipBlankRows = true;
    const first = createField('text', true);
    first.label = 'Name';
    field.itemFields = [first];
  }
  return field;
};

export const createStep = (): TemplateStep => ({
  id: newStepId(),
  title: 'New step',
  heading: 'New step',
  description: '',
  fields: [],
});

export const createDocument = (): TemplateDocument => {
  const id = newDocumentId();
  return { id, key: id, uploadKey: id, label: 'New document', required: true, custom: true };
};

export const move = <T,>(list: T[], index: number, delta: number): T[] => {
  const target = index + delta;
  if (target < 0 || target >= list.length) return list;
  const next = list.slice();
  const [item] = next.splice(index, 1);
  next.splice(target, 0, item);
  return next;
};

/** Where a field lives in the draft. */
export interface FieldRef {
  stepId: string;
  fieldId: string;
  /** Set when the field is inside a repeating section. */
  parentId?: string;
}

export const findFieldRef = (t: FormTemplate, ref: FieldRef | null): TemplateField | null => {
  if (!ref) return null;
  const step = t.steps.find((s) => s.id === ref.stepId);
  if (!step) return null;
  if (ref.parentId) {
    const parent = step.fields.find((f) => f.id === ref.parentId);
    return parent?.itemFields?.find((f) => f.id === ref.fieldId) || null;
  }
  return step.fields.find((f) => f.id === ref.fieldId) || null;
};

/** Replace the list that holds a field (step fields or a repeater's items). */
export const updateFieldList = (
  t: FormTemplate,
  stepId: string,
  parentId: string | undefined,
  fn: (fields: TemplateField[]) => TemplateField[]
): FormTemplate => {
  const next = clone(t);
  const step = next.steps.find((s) => s.id === stepId);
  if (!step) return t;
  if (parentId) {
    const parent = step.fields.find((f) => f.id === parentId);
    if (!parent) return t;
    parent.itemFields = fn(parent.itemFields || []);
  } else {
    step.fields = fn(step.fields);
  }
  return next;
};

export const updateField = (t: FormTemplate, ref: FieldRef, patch: Partial<TemplateField>): FormTemplate =>
  updateFieldList(t, ref.stepId, ref.parentId, (fields) =>
    fields.map((f) => (f.id === ref.fieldId ? { ...f, ...patch } : f)));

export const updateStep = (t: FormTemplate, stepId: string, patch: Partial<TemplateStep>): FormTemplate => {
  const next = clone(t);
  next.steps = next.steps.map((s) => (s.id === stepId ? { ...s, ...patch } : s));
  return next;
};

/** Every field an admin could reference (for "show only if" and "date after"). */
export const referencableFields = (t: FormTemplate, scope: { stepId: string; parentId?: string }) => {
  const out: { id: string; label: string; field: TemplateField }[] = [];
  for (const step of t.steps) {
    for (const f of step.fields) {
      if (f.type !== 'repeater' && f.type !== 'info' && f.type !== 'file') {
        out.push({ id: f.id, label: `${step.title} › ${f.label}`, field: f });
      }
      if (scope.parentId && f.id === scope.parentId) {
        for (const it of f.itemFields || []) {
          if (it.type !== 'info' && it.type !== 'file') out.push({ id: it.id, label: `${f.label} › ${it.label}`, field: it });
        }
      }
    }
  }
  return out;
};

/** Is the step with this id shown to candidates (not hidden, dependency shown)? */
export const findStepVisible = (t: FormTemplate, stepId: string): boolean =>
  isStepVisible(t, t.steps.find((s) => s.id === stepId) || null);

export const shortLabel = (s: string, n = 60) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

/** Stable JSON for "has the draft changed?" checks. */
export const fingerprint = (t: FormTemplate | null) => JSON.stringify(t);
