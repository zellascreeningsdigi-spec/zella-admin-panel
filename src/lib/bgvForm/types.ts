// Typed surface over the mirrored form-builder engine (templateEngine.ts and
// systemTemplate.ts are generated copies of the backend modules and are not
// type-checked). Import from here, not from the generated files.

import * as engine from './templateEngine';
import * as system from './systemTemplate';

export type FieldType =
  | 'text' | 'textarea' | 'number' | 'email' | 'phone' | 'date' | 'month'
  | 'dropdown' | 'radio' | 'checkbox' | 'multiselect' | 'consent' | 'file' | 'info' | 'repeater';

export interface TemplateRule {
  rule: string;
  value?: any;
  message?: string;
  protected?: boolean;
}

export interface TemplateOption {
  value: string;
  label: string;
}

export interface TemplateField {
  id: string;
  path: string;
  type: FieldType;
  label: string;
  placeholder?: string;
  helpText?: string;
  reportLabel?: string;
  required?: boolean;
  requiredFrom?: string;
  requiredMessage?: string;
  displayRequired?: boolean;
  /** Required, but shown without the * (original gap fields). */
  hideRequiredMark?: boolean;
  hidden?: boolean;
  builtIn?: boolean;
  locked?: boolean;
  width?: 'full' | 'half' | 'third';
  options?: TemplateOption[];
  validations?: TemplateRule[];
  showIf?: { field: string; equals: any };
  defaultValue?: any;
  relaxedByGuard?: boolean;
  /** `required` enforced by the candidate page only (standard LOA ticks). */
  clientOnly?: boolean;
  // repeater
  widget?: 'addressHistory' | 'cards' | 'gapDetails';
  itemLabel?: string;
  addLabel?: string;
  emptyText?: string;
  minItems?: number;
  maxItems?: number;
  initialItems?: number;
  minFilled?: number;
  minFilledMessage?: string;
  skipBlankRows?: boolean;
  itemFields?: TemplateField[];
}

export interface TemplateStep {
  id: string;
  type?: 'documents';
  title: string;
  description?: string;
  heading?: string;
  checklistLabel?: string;
  helpText?: string;
  builtIn?: boolean;
  locked?: boolean;
  hidden?: boolean;
  dependsOnStep?: string;
  fields: TemplateField[];
}

export interface TemplateSubDoc {
  key: string;
  label: string;
  hidden?: boolean;
}

export interface TemplateDocument {
  id: string;
  key?: string;
  uploadKey?: string;
  type?: 'perEmployment';
  label: string;
  checklistLabel?: string;
  helpText?: string;
  required?: boolean;
  builtIn?: boolean;
  custom?: boolean;
  hidden?: boolean;
  dependsOnStep?: string;
  subDocs?: TemplateSubDoc[];
  relaxedByGuard?: boolean;
}

export interface FormTemplate {
  schemaVersion?: number;
  steps: TemplateStep[];
  documents: TemplateDocument[];
}

export interface TemplateVersionSummary {
  _id: string;
  version: number;
  note?: string;
  createdAt: string;
  restoredFrom?: string | null;
  createdBy?: { name?: string; email?: string } | null;
}

export interface CurrentForm {
  definition: FormTemplate;
  versionId: string | null;
  version: number | null;
  source: string;
}

export interface RuleCatalogEntry {
  label: string;
  valueType: 'number' | 'pattern' | 'field' | null;
}

export interface TemplateImpact {
  pendingCount: number;
  liveCount: number;
  pinnedCount: number;
  startedCount: number;
  notStartedCount: number;
  pinnedNotStartedCount: number;
  dataHiddenCount: number;
  diff: {
    newlyRequired: { id: string; label: string }[];
    removed: { id: string; label: string }[];
    added: { id: string; label: string }[];
    stepsRemoved: string[];
  };
}

export interface OrphanedAnswer {
  path: string;
  label: string;
  value: unknown;
}

type Values = Record<string, any>;

export const clone = engine.clone as <T>(value: T) => T;
export const getPath = engine.getPath as (obj: any, path: string) => any;
export const setPath = engine.setPath as (obj: any, path: string, value: any) => any;
export const hasContent = engine.hasContent as (value: unknown) => boolean;
export const isStepVisible = engine.isStepVisible as (t: FormTemplate, step: TemplateStep | null) => boolean;
export const visibleSteps = engine.visibleSteps as (t: FormTemplate) => TemplateStep[];
export const documentsVisible = engine.documentsVisible as (t: FormTemplate) => TemplateDocument[];
export const isFieldShown = engine.isFieldShown as (
  field: TemplateField, scopeValues: Values, scopeFields: TemplateField[], rootValues: Values, rootFields: TemplateField[]
) => boolean;
export const rootFieldList = engine.rootFieldList as (t: FormTemplate) => TemplateField[];
export const validateAgainstTemplate = engine.validateAgainstTemplate as (
  formData: Values, t: FormTemplate, opts?: { includeClientOnly?: boolean }
) => Record<string, string>;
export const stepIdForErrorPath = engine.stepIdForErrorPath as (t: FormTemplate, path: string) => string | null;
export const legacyTemplateFromFormConfig = engine.legacyTemplateFromFormConfig as (config: any) => FormTemplate;
export const prepareForCandidate = engine.prepareForCandidate as (t: FormTemplate, opts?: { createdAt?: string | Date }) => FormTemplate;
export const validateTemplateDefinition = engine.validateTemplateDefinition as (
  t: FormTemplate, opts?: { allowProtectedRemoval?: boolean }
) => { ok: true; value: FormTemplate } | { ok: false; errors: string[] };
export const buildRequirementListFromTemplate = engine.buildRequirementListFromTemplate as (t: FormTemplate) => { items: string[]; documents: string[] };
export const walkFields = engine.walkFields as (
  t: FormTemplate, fn: (field: TemplateField, ctx: { step: TemplateStep; parent: TemplateField | null }) => void
) => void;
export const isSafeRegex = engine.isSafeRegex as (source: string) => boolean;
export const newFieldId = engine.newFieldId as () => string;
export const newStepId = engine.newStepId as () => string;
export const newDocumentId = engine.newDocumentId as () => string;
export const RULES = engine.RULES as Record<string, { label: string; valueType?: string }>;

export const systemTemplate = system.systemTemplate as () => FormTemplate;
export const LEGACY_REQUIRED_FROM = system.LEGACY_REQUIRED_FROM as string;
