// Types and small helpers for the BGV tracker UI.

export interface TrackerField {
  key: string;
  label: string;
  group: string;
  type: 'text' | 'longtext' | 'date' | 'month' | 'number' | 'status' | 'billing' | 'person' | 'colour';
  computed?: boolean;
}

export interface TrackerCheck {
  type: string;
  n?: number;
  status: string;
  variant?: string;
  note?: string;
  /** The company's own name for this check, e.g. "ADDRESS CHECK (CURRENT-2)". */
  label?: string;
  completedDate?: string | null;
}

export interface TrackerCustomField {
  label: string;
  type: 'text' | 'date' | 'number';
}

export interface TrackerCase {
  _id: string;
  customerId: string;
  companyName: string;
  bgvId?: string;
  employeeCode?: string;
  name: string;
  status?: string;
  checks?: TrackerCheck[];
  extras?: Record<string, string>;
  billingStatus?: string;
  billedMonth?: string;
  agingDays?: number | null;
  tatStatus?: string;
  insuffOpen?: boolean;
  insuffDays?: number | null;
  isOpen?: boolean;
  isDraft?: boolean;
  createdByName?: string;
  requiredChecks?: string;
  hasDiscrepancy?: boolean;
  history?: { at: string; byName?: string; action: string; changes: { field: string; from: any; to: any }[] }[];
  /** The company sheet's own wording per column key: t = text in the sheet, v = what it was read as (null = unreadable). */
  sheetValues?: Record<string, { t: string; v: string | null }>;
  [key: string]: any;
}

/** One column of a company's own sheet format, as remembered from its import. */
export interface TrackerLayoutEntry {
  header: string;
  /** Unique within the sheet; looks up the sheet's own wording in sheetValues. */
  key?: string;
  kind: 'field' | 'check' | 'checkAll' | 'checkDate' | 'insuffCycle' | 'client' | 'extra' | 'computed' | 'blank';
  field?: string;
  append?: boolean;
  type?: string;
  n?: number;
  cycle?: number;
  part?: 'raised' | 'cleared';
  label?: string;
  computed?: string;
}

export interface TrackerMeta {
  isClient: boolean;
  canEdit: boolean;
  /** Super-admins: remove cases in bulk (selected, or every case in a tab). */
  canBulkDelete?: boolean;
  /** Super-admins: open, close and rename the tracker tabs everyone sees. */
  canManageTabs?: boolean;
  fields: TrackerField[];
  groups: { key: string; label: string }[];
  statuses: string[];
  closedStatuses: string[];
  checkStatuses: string[];
  checkTypes: { key: string; label: string; code: string }[];
  billingStatuses: string[];
  agingBuckets: { key: string; label: string }[];
  clientVisibleCandidates: string[];
  showChecks: boolean;
  showExtras: boolean;
  customers: {
    _id: string;
    companyName: string;
    trackerTatDays?: number;
    trackerVisibleFields?: string[];
    trackerCustomFields?: TrackerCustomField[];
    hasCustomFormat?: boolean;
    /** Whether the company's logins can open the BGV tracker (staff view only). */
    trackerEnabled?: boolean;
  }[];
  options: { initiators: string[]; allocated: string[]; months: string[]; billedMonths: string[] };
}

export interface TrackerFilters {
  q?: string;
  customerIds?: string[];
  status?: string[];
  open?: '' | 'open' | 'closed';
  tat?: string[];
  aging?: string;
  checkType?: string[];
  checkStatus?: string[];
  insuffOpen?: boolean;
  discrepancy?: boolean;
  initiator?: string[];
  allocatedTo?: string[];
  billing?: '' | 'Pending' | 'Billed';
  initiationMonth?: string[];
  startFrom?: string;
  startTo?: string;
  dueFrom?: string;
  dueTo?: string;
  reportFrom?: string;
  reportTo?: string;
  reportColour?: string[];
  extraKey?: string;
  extraValue?: string;
}

/** Filters as API query params. */
export const toParams = (f: TrackerFilters): Record<string, any> => ({
  ...f,
  insuffOpen: f.insuffOpen ? 'true' : undefined,
  discrepancy: f.discrepancy ? 'true' : undefined,
});

// Fixed month names: newer browsers write September as "Sept", the sheets use "Sep".
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export const fmtDate = (v?: string | null) => {
  if (!v) return '';
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return '';
  return `${String(d.getUTCDate()).padStart(2, '0')} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
};

export const fmtMonth = (v?: string | null) => {
  if (!v || !/^\d{4}-\d{2}$/.test(v)) return v || '';
  const [y, m] = v.split('-').map(Number);
  return `${MONTHS[m - 1]} ${y}`;
};

/** yyyy-mm-dd for <input type="date">. */
export const toInputDate = (v?: string | null) => {
  if (!v) return '';
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10);
};

export const STATUS_STYLE: Record<string, string> = {
  WIP: 'bg-blue-50 text-blue-700 border-blue-200',
  Insuff: 'bg-amber-50 text-amber-800 border-amber-200',
  'Client Suggestion': 'bg-purple-50 text-purple-700 border-purple-200',
  'Report Today': 'bg-teal-50 text-teal-700 border-teal-200',
  Report: 'bg-cyan-50 text-cyan-700 border-cyan-200',
  Completed: 'bg-green-50 text-green-700 border-green-200',
  'On Hold': 'bg-gray-100 text-gray-700 border-gray-200',
  Stopped: 'bg-red-50 text-red-700 border-red-200',
};

export const CHECK_STYLE: Record<string, string> = {
  Pending: 'bg-gray-100 text-gray-600',
  WIP: 'bg-blue-100 text-blue-700',
  Insuff: 'bg-amber-100 text-amber-800',
  Received: 'bg-indigo-100 text-indigo-700',
  Green: 'bg-green-100 text-green-800',
  Amber: 'bg-orange-100 text-orange-800',
  Red: 'bg-red-100 text-red-700',
  'Client Suggestion': 'bg-purple-100 text-purple-700',
  Hold: 'bg-gray-200 text-gray-700',
  'Unable to Verify': 'bg-rose-100 text-rose-700',
  Duplicate: 'bg-slate-200 text-slate-700',
  Stopped: 'bg-slate-200 text-slate-600',
  NA: 'bg-gray-50 text-gray-400',
};

export const TAT_STYLE: Record<string, string> = {
  'In TAT': 'text-green-700',
  'Due soon': 'text-amber-700',
  'Out of TAT': 'text-red-700',
};

export const COLOUR_STYLE: Record<string, string> = {
  Green: 'bg-green-500',
  Amber: 'bg-amber-400',
  Red: 'bg-red-500',
};

/** Tooltip for a check badge: the company's own name and completion date. */
export const checkTitle = (meta: TrackerMeta | null, c: TrackerCheck) => {
  const t = meta?.checkTypes.find((x) => x.key === c.type);
  return [
    c.label || `${t?.label || c.type}${(c.n || 1) > 1 ? ` ${c.n}` : ''}`,
    c.status,
    c.variant,
    c.completedDate ? `completed ${fmtDate(c.completedDate)}` : '',
    c.note,
  ].filter(Boolean).join(' · ');
};

export const checkLabel = (meta: TrackerMeta | null, c: TrackerCheck) => {
  const t = meta?.checkTypes.find((x) => x.key === c.type);
  return `${t?.code || c.type}${(c.n || 1) > 1 ? c.n : ''}`;
};

/** One tab on the tracker page: a view with its own companies, filters and sort. Saved per person. */
export interface TrackerTabState {
  id: string;
  name: string;
  view: 'cases' | 'analytics' | 'drafts';
  filters: TrackerFilters;
  sortBy: string;
  sortDir: 'asc' | 'desc';
  limit: number;
  /** "All companies" and "Drafts" are always there and cannot be closed or renamed. */
  fixed?: boolean;
}

export const newTabId = () => `t${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

export const makeTab = (patch: Partial<TrackerTabState> & { name: string }): TrackerTabState => ({
  id: newTabId(),
  view: 'cases',
  filters: {},
  sortBy: 'startDate',
  sortDir: 'desc',
  limit: 50,
  ...patch,
});

/**
 * Comparison key for company names: two names are the same company name when
 * they match ignoring case, spaces and punctuation (same rule as the server).
 */
// Built at runtime: the build targets ES5, which has no regex `u` flag syntax.
const NOT_LETTER_OR_DIGIT = new RegExp('[^\\p{L}\\p{N}]+', 'gu');
export const companyKey = (name?: string | null) => String(name ?? '').toLowerCase().replace(NOT_LETTER_OR_DIGIT, '');
