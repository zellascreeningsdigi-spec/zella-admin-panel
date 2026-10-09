// Candidate form state derived from a template: empty rows, initial values,
// merging saved progress back in, and the gap rows derived from employment.
//
// Ported from the hardcoded DocumentCollectionPage so a template-driven form
// starts, restores and saves exactly like the old one did.

import {
  FormTemplate,
  TemplateField,
  clone,
  getPath,
  setPath,
  walkFields,
  rootFieldList,
} from './types';

export type FormValues = Record<string, any>;

export interface GapEntry {
  key: string;
  label: string;
  hasGap: string;
  duration: string;
  reason: string;
  [k: string]: any;
}

const todayIso = () => new Date().toISOString().split('T')[0];

/** The empty value a field starts with. */
export const emptyValueFor = (field: TemplateField): any => {
  if (field.defaultValue !== undefined) {
    return field.defaultValue === '$today' ? todayIso() : field.defaultValue;
  }
  switch (field.type) {
    case 'number': return null;
    case 'checkbox':
    case 'consent': return false;
    case 'multiselect': return [];
    case 'repeater': return [];
    default: return '';
  }
};

/** A fresh row for a repeating section. */
export const emptyRow = (repeater: TemplateField): FormValues => {
  const row: FormValues = {};
  for (const item of repeater.itemFields || []) {
    if (item.type === 'info' || item.type === 'file') continue;
    setPath(row, item.path, emptyValueFor(item));
  }
  // The legacy address row carried the free-text duration too.
  if (repeater.widget === 'addressHistory') row.duration = '';
  return row;
};

/**
 * Gap rows derived from the employment list: education → first employer,
 * between each pair, last employer → now. Unchanged from the original form.
 */
export const buildGapEntries = (employments: FormValues[]): GapEntry[] => {
  const entries: GapEntry[] = [];
  const count = employments.length;

  if (count === 0) {
    entries.push({ key: 'educationToCurrent', label: 'Gap between Education and Current', hasGap: '', duration: '', reason: '' });
    return entries;
  }

  const emp1Name = employments[0].companyName || 'Employment 1';
  entries.push({ key: 'educationToEmp1', label: `Gap between Education and ${emp1Name}`, hasGap: '', duration: '', reason: '' });

  for (let i = 0; i < count - 1; i++) {
    const fromName = employments[i].companyName || `Employment ${i + 1}`;
    const toName = employments[i + 1].companyName || `Employment ${i + 2}`;
    entries.push({ key: `emp${i + 1}ToEmp${i + 2}`, label: `Gap between ${fromName} and ${toName}`, hasGap: '', duration: '', reason: '' });
  }

  const lastEmpName = employments[count - 1].companyName || `Employment ${count}`;
  entries.push({ key: `emp${count}ToCurrent`, label: `Gap between ${lastEmpName} and Current`, hasGap: '', duration: '', reason: '' });

  return entries;
};

/** Keep what the candidate already answered when the gap rows are rebuilt. */
export const mergeGapEntries = (fresh: GapEntry[], existing: GapEntry[] = []): GapEntry[] =>
  fresh.map((entry) => {
    const prev = existing.find((g) => g.key === entry.key);
    return prev ? { ...prev, key: entry.key, label: entry.label } : entry;
  });

const findWidget = (template: FormTemplate, widget: string): TemplateField | null =>
  rootFieldList(template).find((f) => f.widget === widget) || null;

/** The form a candidate starts with, before any saved progress. */
export const initialFormValues = (template: FormTemplate): FormValues => {
  const values: FormValues = {};
  for (const field of rootFieldList(template)) {
    if (field.type === 'info' || field.type === 'file') continue;
    if (field.type === 'repeater') {
      if (field.widget === 'gapDetails') continue; // derived below
      const n = field.initialItems ?? field.minItems ?? 0;
      setPath(values, field.path, Array.from({ length: n }, () => emptyRow(field)));
    } else {
      setPath(values, field.path, emptyValueFor(field));
    }
  }
  const gap = findWidget(template, 'gapDetails');
  if (gap) setPath(values, gap.path, buildGapEntries(getPath(values, 'employmentHistory') || []));
  return values;
};

// Period fields moved from <input type="date"> to type="month". A month input
// renders nothing for a full "YYYY-MM-DD" value, so a candidate reopening a
// saved form would see their dates vanish — and be blocked, since these
// fields are required. Truncate stored day-precision values to "YYYY-MM".
const toMonthValue = (v: unknown): string => {
  if (typeof v !== 'string') return '';
  const m = v.match(/^(\d{4}-\d{2})/);
  return m ? m[1] : '';
};

const isPlainObject = (v: unknown): v is FormValues =>
  !!v && typeof v === 'object' && !Array.isArray(v);

/**
 * Merge saved progress over the initial values, the way the original form did:
 *   - saved values win, including blanks;
 *   - an empty saved list keeps the pre-seeded empty row;
 *   - name / mobile / email fall back to what the admin entered;
 *   - month fields are truncated to YYYY-MM;
 *   - sections the template no longer shows are kept untouched, so saving
 *     never deletes what a candidate entered earlier.
 */
export const mergeSavedProgress = (
  template: FormTemplate,
  initial: FormValues,
  saved: FormValues | null | undefined,
  prefill: { name?: string; phone?: string; email?: string }
): FormValues => {
  const out = clone(initial);

  if (isPlainObject(saved)) {
    for (const [section, value] of Object.entries(saved)) {
      if (Array.isArray(value)) {
        if (value.length > 0) out[section] = clone(value);
      } else if (isPlainObject(value)) {
        out[section] = { ...(out[section] || {}), ...clone(value) };
      } else if (value !== undefined) {
        out[section] = value;
      }
    }
    // Lists nested one level down (personalInfo.addresses, custom repeaters).
    for (const field of rootFieldList(template)) {
      if (field.type !== 'repeater' || !field.path.includes('.')) continue;
      const savedRows = getPath(saved, field.path);
      if (!Array.isArray(savedRows) || savedRows.length === 0) {
        setPath(out, field.path, clone(getPath(initial, field.path)) ?? []);
      }
    }
  }

  // Admin pre-fill for the identity fields when the candidate has not typed one.
  const prefer = (path: string, fallback?: string) => {
    if (!getPath(out, path) && fallback) setPath(out, path, fallback);
  };
  prefer('personalInfo.fullName', prefill.name);
  prefer('personalInfo.mobile', prefill.phone);
  prefer('personalInfo.email', prefill.email);

  // Month fields, top level and inside rows.
  walkFields(template, (field, { parent }) => {
    if (field.type !== 'month') return;
    if (parent) {
      const rows = getPath(out, parent.path);
      if (Array.isArray(rows)) rows.forEach((row) => row && setPath(row, field.path, toMonthValue(getPath(row, field.path))));
    } else {
      const v = getPath(out, field.path);
      if (v !== undefined) setPath(out, field.path, toMonthValue(v));
    }
  });

  return out;
};

/** Number input → stored value. Built-in counters keep the old clamp-to-zero. */
export const parseNumberInput = (field: TemplateField, raw: string): number | null => {
  if (raw === '') return null;
  if (field.builtIn) return Math.max(0, parseInt(raw, 10) || 0);
  const n = Number(raw);
  return Number.isNaN(n) ? null : n;
};
