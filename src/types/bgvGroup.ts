import { BGVFormConfig } from './customer';

// A named, reusable BGV config preset scoped to one company.
export interface BgvGroup {
  _id: string;
  customerId: string;
  name: string;
  description?: string;
  config: BGVFormConfig;
  isActive: boolean;
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
  /** Candidates currently assigned to this group. Server-computed on list. */
  candidateCount?: number;
}

// One step whose data would be hidden by a proposed config change.
export interface BgvGroupDataAtRisk {
  step: string;
  label: string;
  /** How many pending candidates have data in this step. */
  candidates: number;
  /** How many entries in total across those candidates. */
  entries: number;
}

// Preview of what saving a config change would do, shown before the save.
export interface BgvGroupImpact {
  /** Candidates on this group who have not yet submitted. */
  pendingCount: number;
  /** Of those, how many have already entered data. */
  startedCount: number;
  dataAtRisk: BgvGroupDataAtRisk[];
}
