// @ts-nocheck
// ---------------------------------------------------------------------------
// GENERATED MIRROR — DO NOT EDIT DIRECTLY.
//
// Source of truth: Zella-Screenings-backend/services/bgvForm/templateEngine.js
// Copied verbatim because the admin panel and backend are separate packages.
// Typed wrappers live in src/lib/bgvForm/types.ts.
//
// After changing the backend module, re-sync with:
//   node Zella-Screenings-backend/scripts/syncBgvValidators.js
// ---------------------------------------------------------------------------
/* eslint-disable */

// BGV form template engine — pure functions, no I/O.
//
// A template describes the whole candidate form: ordered steps, each holding
// ordered fields, plus the document slots. Everything that needs to know what
// the form looks like — the candidate page, server-side validation, the email
// checklist, the DOCX report, the admin views — reads a template through this
// module, so the rules cannot drift between them.
//
// Mirrored to the admin panel by scripts/syncBgvValidators.js — edit here only.

import {
  MESSAGES,
  isMeaningfulText,
  isValidMobile,
  isValidEmail,
  isValidAadhaar,
  isValidPan,
  isValidYear,
  isValidCtc,
  isAfter
} from '../bgvValidators';
import {
  systemTemplate,
  BUILT_IN_DOCUMENT_IDS,
  OPTIONAL_STEP_IDS
} from './systemTemplate';

export const TEMPLATE_SCHEMA_VERSION = 1;

// ---------------------------------------------------------------------------
// Small utilities
// ---------------------------------------------------------------------------

export const clone = (value) => (value === undefined ? undefined : JSON.parse(JSON.stringify(value)));

const str = (v) => (typeof v === 'string' ? v.trim() : '');

/** Read a dotted path ("a.b.0.c") from an object. */
export function getPath(obj, path) {
  if (!obj || !path) return undefined;
  let cur = obj;
  for (const part of String(path).split('.')) {
    if (cur === null || cur === undefined) return undefined;
    cur = cur[part];
  }
  return cur;
}

/** Write a dotted path, creating intermediate objects (or arrays for numeric keys). */
export function setPath(obj, path, value) {
  const parts = String(path).split('.');
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const key = parts[i];
    if (cur[key] === null || cur[key] === undefined || typeof cur[key] !== 'object') {
      cur[key] = /^\d+$/.test(parts[i + 1]) ? [] : {};
    }
    cur = cur[key];
  }
  cur[parts[parts.length - 1]] = value;
  return obj;
}

/** A value the candidate has actually entered something into. */
export function hasContent(value) {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string') return value.trim() !== '';
  if (typeof value === 'number') return !Number.isNaN(value);
  if (typeof value === 'boolean') return value;
  if (Array.isArray(value)) return value.some(hasContent);
  if (typeof value === 'object') return Object.values(value).some(hasContent);
  return false;
}

/** Empty for the purpose of a `required` check. */
export function isEmptyValue(value, field) {
  if (field && (field.type === 'consent' || field.type === 'checkbox')) return value !== true;
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === 'number') return Number.isNaN(value);
  if (value === null || value === undefined) return true;
  return str(value) === '';
}

const randomSuffix = (len) => {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let out = '';
  for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
};

/** New ids for things an admin adds. Ids are never reused or renamed. */
export const newFieldId = () => `cf_${randomSuffix(10)}`;
export const newStepId = () => `cs_${randomSuffix(10)}`;
export const newDocumentId = () => `cd_${randomSuffix(10)}`;

// ---------------------------------------------------------------------------
// Walking a template
// ---------------------------------------------------------------------------

/** Call fn(field, { step, parent }) for every field, including repeater items. */
export function walkFields(template, fn) {
  for (const step of template?.steps || []) {
    for (const field of step.fields || []) {
      fn(field, { step, parent: null });
      for (const item of field.itemFields || []) {
        fn(item, { step, parent: field });
      }
    }
  }
}

export function findField(template, id) {
  let found = null;
  walkFields(template, (field, ctx) => {
    if (!found && field.id === id) found = { field, ...ctx };
  });
  return found;
}

export function findStep(template, id) {
  return (template?.steps || []).find((s) => s.id === id) || null;
}

/** A step is shown when it is not hidden and the step it depends on is shown. */
export function isStepVisible(template, step, seen = new Set()) {
  if (!step || step.hidden) return false;
  if (step.dependsOnStep) {
    if (seen.has(step.id)) return false;
    seen.add(step.id);
    return isStepVisible(template, findStep(template, step.dependsOnStep), seen);
  }
  return true;
}

export function documentsVisible(template) {
  return (template?.documents || []).filter((doc) => {
    if (doc.hidden) return false;
    if (doc.dependsOnStep) return isStepVisible(template, findStep(template, doc.dependsOnStep));
    return true;
  });
}

/**
 * The steps the candidate walks through, in order. The documents step is
 * dropped when there is nothing to upload on it.
 */
export function visibleSteps(template) {
  const docs = documentsVisible(template);
  return (template?.steps || []).filter((step) => {
    if (!isStepVisible(template, step)) return false;
    if (step.type === 'documents') {
      return docs.length > 0 || (step.fields || []).some((f) => !f.hidden);
    }
    return true;
  });
}

/** Evaluate a field's showIf against the values in scope (a row, or the whole form). */
export function isFieldShown(field, scopeValues, scopeFields, rootValues, rootFields) {
  if (!field || field.hidden) return false;
  const cond = field.showIf;
  if (!cond || !cond.field) return true;

  const target = (scopeFields || []).find((f) => f.id === cond.field)
    ? { fields: scopeFields, values: scopeValues }
    : { fields: rootFields, values: rootValues };
  const targetField = (target.fields || []).find((f) => f.id === cond.field);
  if (!targetField) return true; // dangling reference: fail open, never hide input
  const value = getPath(target.values, targetField.path);

  if (Array.isArray(value)) return value.includes(cond.equals);
  if (typeof cond.equals === 'boolean') return (value === true) === cond.equals;
  return String(value ?? '') === String(cond.equals ?? '');
}

/** Every top-level field of the template (all steps), for root-scope lookups. */
export function rootFieldList(template) {
  const out = [];
  for (const step of template?.steps || []) {
    for (const field of step.fields || []) out.push(field);
  }
  return out;
}

// ---------------------------------------------------------------------------
// Rules
// ---------------------------------------------------------------------------

const textError = (value) =>
  /^[\d\s+()-]+$/.test(str(value)) ? MESSAGES.numericInTextField : MESSAGES.text;

const toNumber = (v) => {
  if (typeof v === 'number') return v;
  const s = str(v);
  if (s === '') return NaN;
  return Number(s);
};

const todayIso = () => new Date().toISOString().slice(0, 10);

/**
 * The rule catalog. `check` returns true when the value passes. Rules only run
 * on non-empty values; emptiness is the job of `required`.
 */
export const RULES = {
  meaningfulText: {
    label: 'Meaningful text (blocks gibberish)',
    check: (v, opts) => isMeaningfulText(v, opts || {}),
    message: (v) => textError(v)
  },
  mobile: { label: 'Indian mobile number', check: (v) => isValidMobile(v), message: () => MESSAGES.mobile },
  email: { label: 'Email address', check: (v) => isValidEmail(v), message: () => MESSAGES.email },
  aadhaar: { label: 'Aadhaar number (12 digits)', check: (v) => isValidAadhaar(v), message: () => MESSAGES.aadhaar },
  pan: { label: 'PAN (ABCDE1234F)', check: (v) => isValidPan(v), message: () => MESSAGES.pan },
  year: { label: 'Year (4 digits)', check: (v) => isValidYear(v), message: () => MESSAGES.year },
  ctc: { label: 'Numbers only (CTC / amount)', check: (v) => isValidCtc(v), message: () => MESSAGES.ctc },
  minLength: {
    label: 'Minimum length',
    valueType: 'number',
    check: (v, n) => str(String(v)).length >= Number(n),
    message: (v, n) => `Enter at least ${n} characters`
  },
  maxLength: {
    label: 'Maximum length',
    valueType: 'number',
    check: (v, n) => str(String(v)).length <= Number(n),
    message: (v, n) => `Enter at most ${n} characters`
  },
  min: {
    label: 'Minimum value',
    valueType: 'number',
    check: (v, n) => { const x = toNumber(v); return !Number.isNaN(x) && x >= Number(n); },
    message: (v, n) => `Enter a value of at least ${n}`
  },
  max: {
    label: 'Maximum value',
    valueType: 'number',
    check: (v, n) => { const x = toNumber(v); return !Number.isNaN(x) && x <= Number(n); },
    message: (v, n) => `Enter a value of at most ${n}`
  },
  integer: {
    label: 'Whole number',
    check: (v) => Number.isInteger(toNumber(v)),
    message: () => 'Enter a whole number'
  },
  pattern: {
    label: 'Custom pattern (regular expression)',
    valueType: 'pattern',
    check: (v, source) => {
      const re = compilePattern(source);
      // A pattern that no longer compiles must never block a candidate.
      return !re || re.test(str(String(v)));
    },
    message: () => MESSAGES.text
  },
  dateNotFuture: {
    label: 'Date not in the future',
    check: (v) => {
      const s = str(v);
      if (!s) return true;
      return s.slice(0, s.length >= 10 ? 10 : 7) <= todayIso().slice(0, s.length >= 10 ? 10 : 7);
    },
    message: () => 'Date cannot be in the future'
  },
  dateAfter: {
    label: 'Date after another field',
    valueType: 'field',
    // Resolved specially in validate(): needs the other field's value.
    check: () => true,
    message: () => MESSAGES.periodOrder
  },
  oneOf: {
    label: 'One of the listed options',
    check: (v, _opts, field) => {
      const allowed = (field?.options || []).map((o) => String(o.value));
      if (Array.isArray(v)) return v.every((x) => allowed.includes(String(x)));
      return allowed.includes(String(v));
    },
    message: () => 'Select one of the listed options'
  }
};

export const RULE_NAMES = Object.keys(RULES);

const patternCache = new Map();

/** Compile an admin-supplied pattern. Returns null when it is invalid or unsafe. */
export function compilePattern(source) {
  if (typeof source !== 'string' || source.length === 0 || source.length > 200) return null;
  if (patternCache.has(source)) return patternCache.get(source);
  let re = null;
  try {
    if (isSafeRegex(source)) re = new RegExp(source);
  } catch {
    re = null;
  }
  patternCache.set(source, re);
  return re;
}

/**
 * Reject patterns that can backtrack catastrophically. A regex runs on every
 * keystroke in the browser and on submit on the server, so an admin-supplied
 * `(a+)+` must not be able to hang either.
 *
 * Conservative: rejects any quantified group that itself contains a
 * quantifier or an alternation (star height > 1, the classic ReDoS shape), and
 * backreferences. Legitimate validation patterns almost never need either.
 */
export function isSafeRegex(source) {
  if (typeof source !== 'string') return false;
  if (/\\[1-9]/.test(source)) return false;

  const stack = [];
  let escaped = false;
  let inClass = false;
  for (let i = 0; i < source.length; i++) {
    const c = source[i];
    if (escaped) { escaped = false; continue; }
    if (c === '\\') { escaped = true; continue; }
    if (inClass) { if (c === ']') inClass = false; continue; }
    if (c === '[') { inClass = true; continue; }
    if (c === '(') { stack.push({ quantified: false, alternation: false }); continue; }
    if (c === '|' && stack.length) { stack[stack.length - 1].alternation = true; continue; }
    if (c === ')') {
      const group = stack.pop();
      if (!group) return false;
      const next = source[i + 1];
      // '?' repeats nothing, so an optional group is safe.
      const groupQuantified = next === '*' || next === '+' || next === '{';
      if (groupQuantified && (group.quantified || group.alternation)) return false;
      if (stack.length && (group.quantified || groupQuantified)) stack[stack.length - 1].quantified = true;
      continue;
    }
    if ((c === '*' || c === '+' || c === '{') && stack.length) {
      stack[stack.length - 1].quantified = true;
    }
  }
  return stack.length === 0;
}

// ---------------------------------------------------------------------------
// Per-candidate preparation and the in-flight guard
// ---------------------------------------------------------------------------

/**
 * Turn a stored template into the one a particular candidate is judged by:
 * `requiredFrom` is resolved against the candidate's creation date, so records
 * created before a field became mandatory are grandfathered.
 */
export function prepareForCandidate(template, { createdAt } = {}) {
  const out = clone(template) || { steps: [], documents: [] };
  const created = createdAt ? new Date(createdAt) : null;
  const createdOk = created && !Number.isNaN(created.getTime());

  walkFields(out, (field) => {
    if (field.requiredFrom) {
      const from = new Date(field.requiredFrom);
      const applies = createdOk && !Number.isNaN(from.getTime()) && created >= from;
      if (field.required && !applies) field.required = false;
      delete field.requiredFrom;
    }
  });
  return out;
}

const ruleKey = (r) => JSON.stringify([r.rule, r.value ?? null]);

/**
 * A candidate who started under `baseline` must never be blocked by something
 * that changed after they started. In `effective`:
 *   - a field or document that is required now but was absent, hidden or
 *     optional in the baseline is served as optional;
 *   - a validation rule the field did not have in the baseline is dropped.
 * Each relaxed item is flagged `relaxedByGuard` so the UI can explain it.
 *
 * Both templates must already be prepared for the same candidate.
 */
export function applyInFlightGuard(effective, baseline) {
  if (!baseline) return effective;
  const out = clone(effective);

  const baseFields = new Map();
  walkFields(baseline, (field, { step, parent }) => {
    const visible = isStepVisible(baseline, step) && !field.hidden && !(parent && parent.hidden);
    baseFields.set(field.id, { field, visible });
  });

  walkFields(out, (field) => {
    const base = baseFields.get(field.id);
    if (field.required && (!base || !base.visible || !base.field.required)) {
      field.required = false;
      field.relaxedByGuard = true;
    }
    if (Array.isArray(field.validations) && field.validations.length) {
      const known = new Set((base?.field?.validations || []).map(ruleKey));
      const kept = field.validations.filter((r) => known.has(ruleKey(r)));
      if (kept.length !== field.validations.length) {
        field.validations = kept;
        field.relaxedByGuard = true;
      }
    }
  });

  const baseDocs = new Map(documentsVisible(baseline).map((d) => [d.id, d]));
  for (const doc of out.documents || []) {
    const base = baseDocs.get(doc.id);
    if (doc.required && (!base || !base.required)) {
      doc.required = false;
      doc.relaxedByGuard = true;
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

const VALUE_TYPES_WITHOUT_DATA = new Set(['info', 'file']);

function checkValue(value, field, errPath, set, siblings, opts) {
  if (isEmptyValue(value, field)) {
    if (field.required && (!field.clientOnly || opts.includeClientOnly)) {
      set(errPath, field.requiredMessage || MESSAGES.required);
    }
    return;
  }
  for (const rule of field.validations || []) {
    const def = RULES[rule.rule];
    if (!def) continue; // unknown rule from a newer build: ignore, never block
    let ok;
    if (rule.rule === 'dateAfter') {
      const other = siblings(rule.value);
      ok = isAfter(value, other);
    } else {
      ok = def.check(value, rule.value, field);
    }
    if (!ok) {
      set(errPath, rule.message || def.message(value, rule.value));
      return;
    }
  }
}

/**
 * Validate candidate form data against a prepared template.
 *
 * Mirrors the legacy validateBGVFormData semantics:
 *   - only visible steps and fields are checked;
 *   - format rules run only on non-empty values;
 *   - repeater rows that are wholly blank are skipped (`skipBlankRows`);
 *   - the first failure per path wins.
 *
 * @param {{ includeClientOnly?: boolean }} [opts] the candidate page passes
 *   includeClientOnly so browser-only requirements (the standard LOA ticks)
 *   are enforced there; the server leaves them out, exactly as before.
 * @returns {Record<string, string>} error path -> message (empty when valid)
 */
export function validateAgainstTemplate(formData = {}, template, opts = {}) {
  const errors = {};
  const set = (path, msg) => {
    if (!errors[path]) errors[path] = msg;
  };
  const data = formData || {};
  const rootFields = rootFieldList(template);

  const rootLookup = (id) => {
    const f = rootFields.find((x) => x.id === id);
    return f ? getPath(data, f.path) : undefined;
  };

  for (const step of template?.steps || []) {
    if (!isStepVisible(template, step)) continue;

    for (const field of step.fields || []) {
      if (VALUE_TYPES_WITHOUT_DATA.has(field.type)) continue;
      if (!isFieldShown(field, data, rootFields, data, rootFields)) continue;

      if (field.type !== 'repeater') {
        checkValue(getPath(data, field.path), field, field.path, set, rootLookup, opts);
        continue;
      }

      const rows = Array.isArray(getPath(data, field.path)) ? getPath(data, field.path) : [];
      const filledRows = rows.filter((row) => hasContent(row));
      if (field.minFilled && filledRows.length < Number(field.minFilled)) {
        set(field.path, field.minFilledMessage || `Add at least ${field.minFilled} ${String(field.itemLabel || 'entr').toLowerCase()}${Number(field.minFilled) === 1 ? '' : 's'}`);
      }

      rows.forEach((row, i) => {
        if (field.skipBlankRows && !hasContent(row)) return;
        const items = field.itemFields || [];
        const rowLookup = (id) => {
          const f = items.find((x) => x.id === id);
          return f ? getPath(row, f.path) : rootLookup(id);
        };
        for (const item of items) {
          if (VALUE_TYPES_WITHOUT_DATA.has(item.type)) continue;
          if (!isFieldShown(item, row, items, data, rootFields)) continue;
          checkValue(getPath(row, item.path), item, `${field.path}.${i}.${item.path}`, set, rowLookup, opts);
        }
      });
    }
  }

  return errors;
}

/** The step an error path belongs to, so the UI can send the candidate there. */
export function stepIdForErrorPath(template, errPath) {
  for (const step of template?.steps || []) {
    for (const field of step.fields || []) {
      if (errPath === field.path || errPath.startsWith(`${field.path}.`)) return step.id;
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Legacy toggle configs <-> templates
// ---------------------------------------------------------------------------

const plain = (v) => (v && typeof v.toObject === 'function' ? v.toObject() : v);

/**
 * Build the template equivalent of an old toggle config
 * ({ steps, documentTypes, customDocumentTypes }). Missing keys mean "on",
 * exactly as the legacy form treated them.
 */
export function legacyTemplateFromFormConfig(formConfig) {
  const config = plain(formConfig) || {};
  const steps = plain(config.steps) || {};
  const documentTypes = plain(config.documentTypes) || {};
  const custom = Array.isArray(config.customDocumentTypes) ? config.customDocumentTypes.map(plain) : [];

  const tpl = systemTemplate();
  for (const step of tpl.steps) {
    if (OPTIONAL_STEP_IDS.includes(step.id) && steps[step.id] === false) step.hidden = true;
  }
  for (const doc of tpl.documents) {
    if (BUILT_IN_DOCUMENT_IDS.includes(doc.id) && documentTypes[doc.id] === false) doc.hidden = true;
  }
  for (const ct of custom) {
    if (!ct || !ct.key) continue;
    tpl.documents.push({
      id: String(ct.key),
      key: String(ct.key),
      uploadKey: String(ct.key),
      label: String(ct.label || ct.key),
      checklistLabel: String(ct.label || ct.key),
      required: true,
      custom: true,
      hidden: ct.enabled === false
    });
  }
  return tpl;
}

/**
 * The old toggle-config shape of a template. Written alongside every template
 * save so code that still reads `formConfig` (and a rollback to the previous
 * build) sees the closest equivalent of the template's form.
 */
export function toggleConfigFromTemplate(template) {
  const stepOn = (id) => {
    const step = findStep(template, id);
    return !!step && isStepVisible(template, step);
  };
  const docs = template?.documents || [];
  const docOn = (id) => {
    const doc = docs.find((d) => d.id === id);
    return !!doc && !doc.hidden;
  };

  const customDocumentTypes = docs
    .filter((d) => d.custom)
    .map((d) => ({ key: d.key, label: d.label, enabled: !d.hidden }));

  // Custom file fields are stored in customDocuments too; listing them lets
  // the admin documents page show their slots.
  walkFields(template, (field, { parent }) => {
    if (field.type === 'file' && !parent && !customDocumentTypes.some((c) => c.key === field.id)) {
      customDocumentTypes.push({ key: field.id, label: field.label, enabled: !field.hidden });
    }
  });

  return {
    steps: {
      education: stepOn('education'),
      employment: stepOn('employment'),
      references: stepOn('references'),
      gapDetails: stepOn('gapDetails')
    },
    documentTypes: Object.fromEntries(BUILT_IN_DOCUMENT_IDS.map((id) => [id, docOn(id)])),
    customDocumentTypes
  };
}

/**
 * Apply an old toggle config onto an existing template: show/hide the optional
 * steps and built-in documents, and sync custom document types. Used when an
 * older client still saves toggles for a company or group that already has
 * form-builder versions, so the two never disagree.
 */
export function applyToggleConfig(template, formConfig) {
  const out = clone(template);
  const config = plain(formConfig) || {};
  const steps = plain(config.steps) || {};
  const documentTypes = plain(config.documentTypes) || {};
  for (const step of out.steps || []) {
    if (OPTIONAL_STEP_IDS.includes(step.id) && steps[step.id] !== undefined) step.hidden = steps[step.id] === false;
  }
  for (const doc of out.documents || []) {
    if (BUILT_IN_DOCUMENT_IDS.includes(doc.id) && documentTypes[doc.id] !== undefined) doc.hidden = documentTypes[doc.id] === false;
  }
  if (Array.isArray(config.customDocumentTypes)) {
    const incoming = new Map(config.customDocumentTypes.map(plain).filter((c) => c && c.key).map((c) => [String(c.key), c]));
    for (const doc of out.documents || []) {
      if (!doc.custom) continue;
      const match = incoming.get(doc.id);
      if (match) {
        doc.label = String(match.label || doc.label);
        doc.hidden = match.enabled === false;
        incoming.delete(doc.id);
      } else {
        doc.hidden = true; // removed by the old editor: hide, never delete
      }
    }
    for (const ct of incoming.values()) {
      out.documents.push({
        id: String(ct.key), key: String(ct.key), uploadKey: String(ct.key),
        label: String(ct.label || ct.key), checklistLabel: String(ct.label || ct.key),
        required: true, custom: true, hidden: ct.enabled === false
      });
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Email checklist
// ---------------------------------------------------------------------------

/** The "You will need to provide" list for the invitation email. */
export function buildRequirementListFromTemplate(template) {
  const items = [];
  for (const step of visibleSteps(template)) {
    if (step.type === 'documents') continue;
    items.push(step.checklistLabel || step.heading || step.title);
  }
  const documents = documentsVisible(template)
    .filter((d) => d.type !== 'perEmployment')
    .map((d) => d.checklistLabel || d.label);
  if (documents.length > 0) items.push(`Supporting Documents (${documents.join(', ')})`);
  return { items, documents };
}

// ---------------------------------------------------------------------------
// Uploads
// ---------------------------------------------------------------------------

/**
 * Resolve an upload docType against a template. Only slots visible on the
 * candidate's form are accepted.
 * @returns {{ valid: boolean, isCustom: boolean, fieldName: string|null }}
 */
export function resolveUploadKey(template, docType) {
  if (!docType || typeof docType !== 'string') return { valid: false, isCustom: false, fieldName: null };
  // Only documents the candidate can actually see on their form.
  for (const doc of documentsVisible(template)) {
    if (doc.type === 'perEmployment') {
      const keys = (doc.subDocs || []).map((s) => s.key).join('|');
      if (keys && new RegExp(`^(${keys})_emp_\\d{1,2}$`).test(docType)) {
        return { valid: true, isCustom: true, fieldName: docType };
      }
      continue;
    }
    if (doc.uploadKey === docType || (!doc.builtIn && doc.key === docType)) {
      return doc.builtIn && !doc.custom
        ? { valid: true, isCustom: false, fieldName: doc.key }
        : { valid: true, isCustom: true, fieldName: doc.key };
    }
  }
  let fileField = null;
  walkFields(template, (field, { step, parent }) => {
    if (!parent && field.type === 'file' && field.id === docType && !field.hidden && isStepVisible(template, step)) fileField = field;
  });
  if (fileField) return { valid: true, isCustom: true, fieldName: fileField.id };
  return { valid: false, isCustom: false, fieldName: null };
}

// ---------------------------------------------------------------------------
// Custom answer storage
// ---------------------------------------------------------------------------

const MAX_TEXT = 5000;
const MAX_LIST = 100;

const cleanScalar = (value) => {
  if (value === null || value === undefined) return value;
  if (typeof value === 'string') return value.slice(0, MAX_TEXT);
  if (typeof value === 'number' || typeof value === 'boolean') return value;
  if (Array.isArray(value)) {
    return value.slice(0, MAX_LIST).filter((v) => ['string', 'number', 'boolean'].includes(typeof v))
      .map((v) => (typeof v === 'string' ? v.slice(0, MAX_TEXT) : v));
  }
  return undefined; // objects are not a scalar answer
};

const customIdsOf = (fields) =>
  (fields || []).filter((f) => typeof f.path === 'string' && f.path.startsWith('custom.')).map((f) => f);

function cleanCustomObject(incoming, fields, existing) {
  const out = {};
  // Answers to fields that are no longer on the form are kept, never deleted.
  const known = new Set(fields.map((f) => f.path.slice('custom.'.length)));
  if (existing && typeof existing === 'object') {
    for (const [key, value] of Object.entries(existing)) {
      if (!known.has(key)) out[key] = value;
    }
  }
  if (!incoming || typeof incoming !== 'object') return out;

  for (const field of fields) {
    const key = field.path.slice('custom.'.length);
    if (!(key in incoming)) {
      if (existing && key in existing) out[key] = existing[key];
      continue;
    }
    if (field.type === 'repeater') {
      const rows = Array.isArray(incoming[key]) ? incoming[key] : [];
      const max = Math.min(Number(field.maxItems) || 50, 50);
      const itemFields = customIdsOf(field.itemFields);
      out[key] = rows.slice(0, max).map((row) => {
        const custom = cleanCustomObject(row?.custom, itemFields, null);
        return { custom };
      });
      continue;
    }
    const cleaned = cleanScalar(incoming[key]);
    if (cleaned !== undefined) out[key] = cleaned;
  }
  return out;
}

/**
 * Restrict the candidate-supplied `custom` answers to fields that exist on
 * their form, cap their size, and carry over stored answers for fields that
 * have since been removed. Built-in sections are left to the Mongoose schema,
 * which already discards unknown keys.
 *
 * @param {object} formData   incoming (client) form data — not mutated
 * @param {object} template   the candidate's effective template
 * @param {object} [existing] the stored form data, for carry-over
 */
export function sanitizeCustomAnswers(formData, template, existing) {
  if (!formData || typeof formData !== 'object') return formData;
  const out = { ...formData };

  const topLevel = customIdsOf(rootFieldList(template));
  out.custom = cleanCustomObject(formData.custom, topLevel, existing?.custom);

  // Custom fields added inside built-in repeaters (employment rows etc.)
  for (const field of rootFieldList(template)) {
    if (field.type !== 'repeater' || String(field.path).startsWith('custom.')) continue;
    const itemCustom = customIdsOf(field.itemFields);
    const rows = getPath(formData, field.path);
    if (!Array.isArray(rows)) continue;
    const storedRows = getPath(existing, field.path) || [];
    const cleanedRows = rows.map((row, i) => {
      if (!row || typeof row !== 'object') return row;
      const custom = cleanCustomObject(row.custom, itemCustom, storedRows[i]?.custom);
      const next = { ...row };
      if (Object.keys(custom).length) next.custom = custom;
      else delete next.custom;
      return next;
    });
    setPath(out, field.path, cleanedRows);
  }
  return out;
}

/**
 * Stored answers that are not on the template any more (a removed custom
 * field, a hidden built-in field). Shown to admins so nothing silently
 * disappears from view.
 *
 * @param {Record<string,string>} [knownLabels] id -> label from older versions
 * @returns {{ path: string, label: string, value: unknown }[]}
 */
export function findOrphanedAnswers(formData, template, knownLabels = {}) {
  const out = [];
  if (!formData) return out;
  const shown = new Set();
  walkFields(template, (field, { step, parent }) => {
    if (!isStepVisible(template, step) || field.hidden || (parent && parent.hidden)) return;
    shown.add(parent ? `${parent.path}[].${field.path}` : field.path);
  });

  // Hidden built-in fields still holding data.
  const system = systemTemplate();
  walkFields(system, (field, { parent }) => {
    if (field.type === 'repeater' || field.type === 'consent') return;
    if (parent) {
      if (shown.has(`${parent.path}[].${field.path}`)) return;
      const rows = getPath(formData, parent.path);
      if (!Array.isArray(rows)) return;
      rows.forEach((row, i) => {
        const value = getPath(row, field.path);
        if (hasContent(value)) out.push({ path: `${parent.path}.${i}.${field.path}`, label: `${parent.itemLabel || parent.label} ${i + 1} — ${field.label}`, value });
      });
    } else {
      if (shown.has(field.path)) return;
      const value = getPath(formData, field.path);
      if (hasContent(value)) out.push({ path: field.path, label: field.label, value });
    }
  });

  // Custom answers whose field is gone.
  const custom = formData.custom && typeof formData.custom === 'object' ? formData.custom : {};
  for (const [key, value] of Object.entries(custom)) {
    if (shown.has(`custom.${key}`) || !hasContent(value)) continue;
    out.push({ path: `custom.${key}`, label: knownLabels[key] || key, value });
  }
  return out;
}

// ---------------------------------------------------------------------------
// Template definition validation (builder saves)
// ---------------------------------------------------------------------------

export const FIELD_TYPES = [
  'text', 'textarea', 'number', 'email', 'phone', 'date', 'month',
  'dropdown', 'radio', 'checkbox', 'multiselect', 'consent', 'file', 'info', 'repeater'
];
const OPTION_TYPES = new Set(['dropdown', 'radio', 'multiselect']);
const WIDTHS = new Set(['full', 'half', 'third']);

const FIELD_PROPS = [
  'id', 'path', 'type', 'label', 'placeholder', 'helpText', 'reportLabel', 'required',
  'requiredFrom', 'requiredMessage', 'displayRequired', 'hideRequiredMark', 'clientOnly', 'hidden', 'builtIn', 'locked',
  'width', 'options', 'validations', 'showIf', 'defaultValue', 'widget', 'itemLabel',
  'addLabel', 'emptyText', 'minItems', 'maxItems', 'initialItems', 'minFilled',
  'minFilledMessage', 'skipBlankRows', 'itemFields'
];
const STEP_PROPS = [
  'id', 'type', 'title', 'description', 'heading', 'checklistLabel', 'helpText',
  'builtIn', 'locked', 'hidden', 'dependsOnStep', 'fields'
];
const DOC_PROPS = [
  'id', 'key', 'uploadKey', 'type', 'label', 'checklistLabel', 'helpText', 'required',
  'builtIn', 'custom', 'hidden', 'dependsOnStep', 'subDocs'
];

const pick = (obj, keys) => {
  const out = {};
  for (const k of keys) if (obj[k] !== undefined) out[k] = obj[k];
  return out;
};

const isNonEmptyString = (v, max) => typeof v === 'string' && v.trim() !== '' && v.length <= max;

/**
 * Check and normalise a template an admin wants to save. Built-in items are
 * compared with the system template so that their identity (id, storage path,
 * type) cannot be altered — only their presentation and rules.
 *
 * @param {object} definition { steps, documents }
 * @param {{ allowProtectedRemoval?: boolean }} [opts]
 * @returns {{ ok: true, value: object } | { ok: false, errors: string[] }}
 */
export function validateTemplateDefinition(definition, opts = {}) {
  const errors = [];
  const err = (m) => { if (errors.length < 50) errors.push(m); };
  const system = systemTemplate();
  const sysFields = new Map();
  walkFields(system, (f, { parent }) => sysFields.set(f.id, { field: f, parentId: parent?.id || null }));
  const sysSteps = new Map(system.steps.map((s) => [s.id, s]));
  const sysDocs = new Map(system.documents.map((d) => [d.id, d]));

  if (!definition || typeof definition !== 'object') return { ok: false, errors: ['Template is required'] };
  const stepsIn = Array.isArray(definition.steps) ? definition.steps : [];
  const docsIn = Array.isArray(definition.documents) ? definition.documents : [];
  if (stepsIn.length === 0) err('The form needs at least one step');
  if (stepsIn.length > 30) err('A form can have at most 30 steps');
  if (docsIn.length > 60) err('A form can have at most 60 documents');

  const seenStepIds = new Set();
  const seenFieldIds = new Set();
  const seenPaths = new Set();

  const normaliseRules = (field, where) => {
    const rules = Array.isArray(field.validations) ? field.validations : [];
    const out = [];
    for (const r of rules) {
      if (!r || !RULES[r.rule]) { err(`${where}: unknown validation "${r?.rule}"`); continue; }
      const rule = { rule: r.rule };
      if (r.value !== undefined && r.value !== null && r.value !== '') rule.value = r.value;
      if (isNonEmptyString(r.message, 300)) rule.message = r.message.trim();
      if (r.protected) rule.protected = true;
      const def = RULES[r.rule];
      if (def.valueType === 'number' && (rule.value === undefined || Number.isNaN(Number(rule.value)))) {
        err(`${where}: "${def.label}" needs a number`);
      }
      if (def.valueType === 'number' && rule.value !== undefined) rule.value = Number(rule.value);
      if (def.valueType === 'pattern') {
        if (typeof rule.value !== 'string' || rule.value.length === 0) err(`${where}: the pattern is empty`);
        else if (rule.value.length > 200) err(`${where}: the pattern is longer than 200 characters`);
        else {
          try { new RegExp(rule.value); } catch { err(`${where}: the pattern is not a valid regular expression`); }
          if (!isSafeRegex(rule.value)) err(`${where}: the pattern could make the form freeze (nested repetition). Simplify it.`);
        }
      }
      if (def.valueType === 'field' && typeof rule.value !== 'string') err(`${where}: choose the field to compare with`);
      if (rule.rule === 'meaningfulText' && rule.value !== undefined) {
        const v = rule.value || {};
        rule.value = {};
        if (v.minLength !== undefined && !Number.isNaN(Number(v.minLength))) rule.value.minLength = Number(v.minLength);
        if (v.allowCode) rule.value.allowCode = true;
        if (Object.keys(rule.value).length === 0) delete rule.value;
      }
      out.push(rule);
    }

    // Protected rules on built-in fields may only be removed by a super-admin.
    const sys = sysFields.get(field.id)?.field;
    if (sys && !opts.allowProtectedRemoval) {
      for (const pr of (sys.validations || []).filter((r) => r.protected)) {
        if (!out.some((r) => r.rule === pr.rule)) {
          err(`${where}: the "${RULES[pr.rule].label}" check is protected — only a super-admin can remove it`);
        }
      }
    }
    // Keep the protected marker authoritative from the system template.
    if (sys) {
      const protectedRules = new Set((sys.validations || []).filter((r) => r.protected).map((r) => r.rule));
      for (const r of out) {
        if (protectedRules.has(r.rule)) r.protected = true;
        else delete r.protected;
      }
    } else {
      for (const r of out) delete r.protected;
    }
    return out;
  };

  const normaliseField = (f, where, parentField) => {
    if (!f || typeof f !== 'object') { err(`${where}: invalid field`); return null; }
    const field = pick(f, FIELD_PROPS);
    const label = field.label || field.id || 'field';
    const fw = `${where} › "${String(label).slice(0, 40)}"`;

    if (!isNonEmptyString(field.id, 80)) { err(`${fw}: missing id`); return null; }
    if (seenFieldIds.has(field.id)) err(`${fw}: duplicate field id ${field.id}`);
    seenFieldIds.add(field.id);

    if (!FIELD_TYPES.includes(field.type)) err(`${fw}: unknown field type "${field.type}"`);
    const maxLabel = field.type === 'consent' || field.type === 'info' ? 3000 : 300;
    if (!isNonEmptyString(field.label, maxLabel)) err(`${fw}: label is required (max ${maxLabel} characters)`);

    const sys = sysFields.get(field.id);
    if (sys) {
      field.builtIn = true;
      if (field.path !== sys.field.path) err(`${fw}: a built-in field's storage cannot change`);
      if (field.type !== sys.field.type) err(`${fw}: a built-in field's type cannot change`);
      if ((parentField?.id || null) !== sys.parentId) err(`${fw}: a built-in field cannot be moved out of its section`);
      if (sys.field.locked) {
        field.locked = true;
        if (field.hidden) err(`${fw}: this field is required for the report and cannot be removed`);
      } else {
        delete field.locked;
      }
      if (sys.field.requiredFrom && field.requiredFrom === undefined) field.requiredFrom = sys.field.requiredFrom;
      if (sys.field.widget) field.widget = sys.field.widget;
      // The LOA consents must stay required.
      if (sys.field.type === 'consent' && sys.field.locked) field.required = true;
      if (sys.field.clientOnly) field.clientOnly = true; else delete field.clientOnly;
    } else {
      delete field.builtIn;
      delete field.locked;
      delete field.widget;
      delete field.requiredFrom;
      delete field.clientOnly;
      if (!/^cf_[a-z0-9]{4,24}$/.test(field.id)) err(`${fw}: invalid custom field id`);
      // Gap rows are rebuilt from the employment list; they cannot hold extra answers.
      if (parentField?.widget === 'gapDetails') err(`${fw}: fields cannot be added to the gap details rows`);
      if (field.path !== `custom.${field.id}`) field.path = `custom.${field.id}`;
    }

    if (seenPaths.has(`${parentField?.id || ''}|${field.path}`)) err(`${fw}: two fields store to the same place`);
    seenPaths.add(`${parentField?.id || ''}|${field.path}`);

    if (field.width !== undefined && !WIDTHS.has(field.width)) delete field.width;
    for (const k of ['placeholder', 'helpText', 'reportLabel', 'requiredMessage', 'addLabel', 'itemLabel', 'emptyText', 'minFilledMessage']) {
      if (field[k] !== undefined) {
        if (typeof field[k] !== 'string' || field[k].length > 1000) err(`${fw}: ${k} is too long`);
        else if (field[k].trim() === '') delete field[k];
      }
    }
    for (const k of ['required', 'displayRequired', 'hidden', 'skipBlankRows']) {
      if (field[k] !== undefined) field[k] = !!field[k];
    }

    if (OPTION_TYPES.has(field.type)) {
      const options = Array.isArray(field.options) ? field.options : [];
      if (options.length === 0) err(`${fw}: add at least one option`);
      if (options.length > 200) err(`${fw}: at most 200 options`);
      const values = new Set();
      field.options = options.map((o) => {
        const value = String(o?.value ?? '').trim();
        const optLabel = String(o?.label ?? value).trim();
        if (!value) err(`${fw}: every option needs a value`);
        if (values.has(value)) err(`${fw}: duplicate option "${value}"`);
        values.add(value);
        return { value, label: optLabel || value };
      });
    } else if (field.type !== 'dropdown') {
      delete field.options;
    }

    if (field.showIf !== undefined) {
      if (!field.showIf || !isNonEmptyString(field.showIf.field, 80)) delete field.showIf;
      else field.showIf = { field: field.showIf.field, equals: field.showIf.equals };
    }

    field.validations = normaliseRules(field, fw);

    if (field.type === 'repeater') {
      if (parentField) err(`${fw}: a repeating section cannot contain another repeating section`);
      const items = Array.isArray(field.itemFields) ? field.itemFields : [];
      if (items.length === 0) err(`${fw}: add at least one field to the repeating section`);
      if (items.length > 60) err(`${fw}: at most 60 fields per repeating section`);
      field.itemFields = items.map((it) => normaliseField(it, fw, field)).filter(Boolean);
      for (const k of ['minItems', 'maxItems', 'initialItems', 'minFilled']) {
        if (field[k] !== undefined && field[k] !== null && field[k] !== '') {
          const n = Number(field[k]);
          if (!Number.isInteger(n) || n < 0 || n > 50) err(`${fw}: ${k} must be a whole number between 0 and 50`);
          else field[k] = n;
        } else delete field[k];
      }
      if (field.maxItems !== undefined && field.minItems !== undefined && field.maxItems < field.minItems) {
        err(`${fw}: maximum entries cannot be less than minimum`);
      }
      if (!sys) field.skipBlankRows = true;
    } else {
      delete field.itemFields;
      for (const k of ['minItems', 'maxItems', 'initialItems', 'minFilled', 'minFilledMessage', 'itemLabel', 'addLabel', 'emptyText', 'skipBlankRows']) delete field[k];
    }

    if (field.type === 'file' && parentField) err(`${fw}: file uploads cannot be inside a repeating section`);
    // Re-pick so property order is stable: saving a saved template is a no-op.
    return pick(field, FIELD_PROPS);
  };

  const steps = [];
  for (const s of stepsIn) {
    if (!s || typeof s !== 'object') { err('Invalid step'); continue; }
    const step = pick(s, STEP_PROPS);
    const where = `Step "${String(step.title || step.id || '').slice(0, 40)}"`;
    if (!isNonEmptyString(step.id, 80)) { err(`${where}: missing id`); continue; }
    if (seenStepIds.has(step.id)) err(`${where}: duplicate step id`);
    seenStepIds.add(step.id);
    if (!isNonEmptyString(step.title, 60)) err(`${where}: a short title is required (max 60 characters)`);
    for (const k of ['description', 'heading', 'checklistLabel', 'helpText']) {
      if (step[k] !== undefined && (typeof step[k] !== 'string' || step[k].length > 1000)) err(`${where}: ${k} is too long`);
    }

    const sys = sysSteps.get(step.id);
    if (sys) {
      step.builtIn = true;
      if (sys.locked) {
        step.locked = true;
        if (step.hidden) err(`${where}: this step cannot be removed`);
      } else delete step.locked;
      if (sys.type) step.type = sys.type; else delete step.type;
      if (sys.dependsOnStep) step.dependsOnStep = sys.dependsOnStep; else delete step.dependsOnStep;
    } else {
      delete step.builtIn;
      delete step.locked;
      delete step.type;
      delete step.dependsOnStep;
      if (!/^cs_[a-z0-9]{4,24}$/.test(step.id)) err(`${where}: invalid custom step id`);
    }
    step.hidden = !!step.hidden;
    const fieldsIn = Array.isArray(step.fields) ? step.fields : [];
    if (fieldsIn.length > 100) err(`${where}: at most 100 fields per step`);
    step.fields = fieldsIn.map((f) => normaliseField(f, where, null)).filter(Boolean);
    if (step.type === 'documents' && step.fields.length) {
      // The documents step holds document slots, not fields.
      step.fields = [];
    }
    steps.push(pick(step, STEP_PROPS));
  }

  // Every built-in step and field must still be present (hide, don't delete):
  // hidden built-ins keep the stored answers addressable.
  for (const id of sysSteps.keys()) {
    if (!seenStepIds.has(id)) err(`Built-in step "${sysSteps.get(id).title}" is missing — hide it instead of deleting it`);
  }
  for (const [id, { field }] of sysFields) {
    if (!seenFieldIds.has(id)) err(`Built-in field "${field.label.slice(0, 40)}" is missing — hide it instead of deleting it`);
  }

  // showIf references must point at a real field.
  const all = new Set(seenFieldIds);
  const tmp = { steps };
  walkFields(tmp, (field) => {
    if (field.showIf && (!all.has(field.showIf.field) || field.showIf.field === field.id)) {
      err(`"${field.label?.slice(0, 40)}": "show only if" refers to a field that does not exist`);
    }
    for (const r of field.validations || []) {
      if (r.rule === 'dateAfter' && !all.has(r.value)) err(`"${field.label?.slice(0, 40)}": "date after" refers to a field that does not exist`);
    }
  });

  const documents = [];
  const seenDocIds = new Set();
  for (const d of docsIn) {
    if (!d || typeof d !== 'object') { err('Invalid document'); continue; }
    const doc = pick(d, DOC_PROPS);
    const where = `Document "${String(doc.label || doc.id || '').slice(0, 40)}"`;
    if (!isNonEmptyString(doc.id, 60)) { err(`${where}: missing id`); continue; }
    if (seenDocIds.has(doc.id)) err(`${where}: duplicate document`);
    seenDocIds.add(doc.id);
    if (!isNonEmptyString(doc.label, 200)) err(`${where}: a label is required`);
    doc.required = doc.required !== false;
    doc.hidden = !!doc.hidden;

    const sys = sysDocs.get(doc.id);
    if (sys) {
      doc.builtIn = true;
      delete doc.custom;
      doc.key = sys.key;
      doc.uploadKey = sys.uploadKey;
      if (sys.type) doc.type = sys.type; else delete doc.type;
      if (sys.dependsOnStep) doc.dependsOnStep = sys.dependsOnStep;
      if (sys.subDocs) {
        const byKey = new Map((Array.isArray(d.subDocs) ? d.subDocs : []).map((x) => [x?.key, x]));
        doc.subDocs = sys.subDocs.map((x) => ({
          key: x.key,
          label: isNonEmptyString(byKey.get(x.key)?.label, 100) ? byKey.get(x.key).label.trim() : x.label,
          ...(byKey.get(x.key)?.hidden ? { hidden: true } : {})
        }));
        if (doc.subDocs.every((x) => x.hidden)) err(`${where}: keep at least one document type, or hide the whole card`);
      }
    } else {
      delete doc.builtIn;
      delete doc.type;
      delete doc.dependsOnStep;
      delete doc.subDocs;
      doc.custom = true;
      // Legacy custom document keys were camelCase labels; new ones are cd_*.
      if (!/^[A-Za-z][A-Za-z0-9_]{0,59}$/.test(doc.id)) err(`${where}: invalid document id`);
      if (BUILT_IN_DOCUMENT_IDS.includes(doc.id) || /_emp_\d+$/.test(doc.id) || seenFieldIds.has(doc.id)) {
        err(`${where}: this id is reserved`);
      }
      doc.key = doc.id;
      doc.uploadKey = doc.id;
    }
    for (const k of ['checklistLabel', 'helpText']) {
      if (doc[k] !== undefined && (typeof doc[k] !== 'string' || doc[k].length > 1000)) err(`${where}: ${k} is too long`);
    }
    documents.push(pick(doc, DOC_PROPS));
  }
  for (const id of sysDocs.keys()) {
    if (!seenDocIds.has(id)) err(`Built-in document "${sysDocs.get(id).label}" is missing — hide it instead of deleting it`);
  }

  if (errors.length) return { ok: false, errors };
  return { ok: true, value: { schemaVersion: TEMPLATE_SCHEMA_VERSION, steps, documents } };
}

// ---------------------------------------------------------------------------
// Change summaries (shown before a save)
// ---------------------------------------------------------------------------

/**
 * What changes between two templates, in terms an admin cares about.
 * @returns {{ newlyRequired: {id,label}[], removed: {id,label}[], added: {id,label}[], stepsRemoved: string[] }}
 */
export function summariseTemplateDiff(current, proposed) {
  const index = (tpl) => {
    const map = new Map();
    walkFields(tpl, (field, { step, parent }) => {
      const visible = isStepVisible(tpl, step) && !field.hidden && !(parent && parent.hidden);
      map.set(field.id, { field, visible });
    });
    return map;
  };
  const a = index(current);
  const b = index(proposed);
  const newlyRequired = [];
  const removed = [];
  const added = [];
  for (const [id, { field, visible }] of b) {
    const before = a.get(id);
    if (visible && (field.required || field.requiredFrom) && (!before || !before.visible || !(before.field.required || before.field.requiredFrom))) {
      newlyRequired.push({ id, label: field.label });
    }
    if (visible && (!before || !before.visible)) added.push({ id, label: field.label });
  }
  for (const [id, { field, visible }] of a) {
    const after = b.get(id);
    if (visible && (!after || !after.visible)) removed.push({ id, label: field.label });
  }
  const stepsRemoved = (current?.steps || [])
    .filter((s) => isStepVisible(current, s))
    .filter((s) => { const n = findStep(proposed, s.id); return !n || !isStepVisible(proposed, n); })
    .map((s) => s.title);
  return { newlyRequired, removed, added, stepsRemoved };
}

const templateEngine = {
  clone,
  getPath,
  setPath,
  hasContent,
  isEmptyValue,
  walkFields,
  findField,
  findStep,
  isStepVisible,
  visibleSteps,
  documentsVisible,
  isFieldShown,
  rootFieldList,
  RULES,
  RULE_NAMES,
  FIELD_TYPES,
  compilePattern,
  isSafeRegex,
  prepareForCandidate,
  applyInFlightGuard,
  validateAgainstTemplate,
  stepIdForErrorPath,
  legacyTemplateFromFormConfig,
  toggleConfigFromTemplate,
  applyToggleConfig,
  buildRequirementListFromTemplate,
  resolveUploadKey,
  sanitizeCustomAnswers,
  findOrphanedAnswers,
  validateTemplateDefinition,
  summariseTemplateDiff,
  newFieldId,
  newStepId,
  newDocumentId
};

export default templateEngine;
