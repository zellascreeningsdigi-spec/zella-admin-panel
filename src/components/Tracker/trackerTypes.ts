// Types and small helpers for the BGV tracker UI.

export interface TrackerField {
  key: string;
  label: string;
  group: string;
  type: 'text' | 'longtext' | 'date' | 'month' | 'number' | 'status' | 'billing' | 'person';
  computed?: boolean;
}

export interface TrackerCheck {
  type: string;
  n?: number;
  status: string;
  variant?: string;
  note?: string;
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
  [key: string]: any;
}

export interface TrackerMeta {
  isClient: boolean;
  canEdit: boolean;
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
  customers: { _id: string; companyName: string; trackerTatDays?: number; trackerVisibleFields?: string[] }[];
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
}

/** Filters as API query params. */
export const toParams = (f: TrackerFilters): Record<string, any> => ({
  ...f,
  insuffOpen: f.insuffOpen ? 'true' : undefined,
  discrepancy: f.discrepancy ? 'true' : undefined,
});

export const fmtDate = (v?: string | null) => {
  if (!v) return '';
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' });
};

export const fmtMonth = (v?: string | null) => {
  if (!v || !/^\d{4}-\d{2}$/.test(v)) return v || '';
  const [y, m] = v.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString('en-GB', { month: 'short', year: 'numeric', timeZone: 'UTC' });
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
};

export const TAT_STYLE: Record<string, string> = {
  'In TAT': 'text-green-700',
  'Due soon': 'text-amber-700',
  'Out of TAT': 'text-red-700',
};

export const checkLabel = (meta: TrackerMeta | null, c: TrackerCheck) => {
  const t = meta?.checkTypes.find((x) => x.key === c.type);
  return `${t?.code || c.type}${(c.n || 1) > 1 ? c.n : ''}`;
};
