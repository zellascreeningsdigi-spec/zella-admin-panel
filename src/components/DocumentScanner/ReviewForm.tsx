import React, { useEffect, useMemo, useState } from 'react';
import { Save, ExternalLink, ChevronDown, ChevronRight, AlertTriangle, Eye, EyeOff, Trash2, ShieldAlert, Columns2, X, Plus, Briefcase } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  FIELD_GROUPS,
  EMPLOYMENT_FIELDS,
  EMPLOYMENT_FIELD_KEYS,
  FlatFieldKey,
  EmploymentFieldKey,
  ALL_FIELD_KEYS,
  docTypeLabel
} from './fields';
import type { ScanJobSnapshot } from './ScanProgress';
import SourceDocViewer from './SourceDocViewer';
import ExcelRowPreview from './ExcelRowPreview';
import apiService from '@/services/api';

interface EmploymentState {
  fields: Record<EmploymentFieldKey, string>;
  provenance: Record<string, string | null>;
  confidence: Record<string, 'high' | 'low'>;
  expanded: boolean;
  deleted: boolean;
}

interface CandidateState {
  index: number;
  fields: Record<FlatFieldKey, string>;
  provenance: Record<string, string | null>;
  confidence: Record<string, 'high' | 'low'>;
  /** Per-job employment entries — repeats in fields.employments[] on the backend. */
  employments: EmploymentState[];
  error: string | null;
  expanded: boolean;
  skipped: boolean;
  deleted: boolean;
  /** When true, the card body shows the editable fields on the left and the
   *  source document viewer on the right (50/50). When false, the legacy
   *  layout with a small thumbnail rail. */
  compareOpen: boolean;
}

export interface ReviewedCandidate {
  fields: Record<string, string | null> & {
    employments?: Array<Record<string, string | null>>;
  };
  provenance: Record<string, string | null> & {
    employments?: Array<Record<string, string | null>>;
  };
  sourceCandidateIndex: number;
}

function emptyEmploymentFields(): Record<EmploymentFieldKey, string> {
  const out: Record<EmploymentFieldKey, string> = {} as any;
  for (const k of EMPLOYMENT_FIELD_KEYS) out[k] = '';
  return out;
}

interface ReviewFormProps {
  job: ScanJobSnapshot;
  onCommit: (candidates: ReviewedCandidate[]) => void;
  committing: boolean;
}

function buildInitialState(job: ScanJobSnapshot): CandidateState[] {
  const result = job.result;
  // Multi-candidate jobs populate result.candidates. Single-candidate
  // (legacy) jobs only have result.fields/provenance — wrap as one candidate
  // so this component renders the same way for both shapes.
  const sourceCandidates = result?.candidates && result.candidates.length > 0
    ? result.candidates
    : (result?.fields
        ? [{ index: 0, fields: result.fields, provenance: result.provenance, confidence: {}, error: null }]
        : []);

  return sourceCandidates.map((c: any, i: number) => {
    const fields: Record<FlatFieldKey, string> = {} as any;
    const f = (c.fields || {}) as Record<string, any>;
    for (const k of ALL_FIELD_KEYS) {
      fields[k as FlatFieldKey] = (f[k] ?? '') as string;
    }

    // Build the per-employment state from the backend's fields.employments[].
    // Two back-compat paths:
    //   1. Modern shape: f.employments is an array → one EmploymentState per entry.
    //   2. Legacy shape (pre multi-employment): individual employment keys
    //      live flat on `f` (company_name, designation, ...). If ANY of them
    //      is non-empty, synthesise one EmploymentState. If all empty, no
    //      employment entries.
    const employments: EmploymentState[] = [];
    const provenance = (c.provenance || {}) as Record<string, any>;
    const confidence = (c.confidence || {}) as Record<string, any>;
    const employmentsProvenance: any[] = Array.isArray(provenance.employments) ? provenance.employments : [];
    const employmentsConfidence: any[] = Array.isArray(confidence.employments) ? confidence.employments : [];

    if (Array.isArray(f.employments) && f.employments.length > 0) {
      f.employments.forEach((entry: any, eIdx: number) => {
        const eFields: Record<EmploymentFieldKey, string> = emptyEmploymentFields();
        for (const k of EMPLOYMENT_FIELD_KEYS) {
          eFields[k] = (entry?.[k] ?? '') as string;
        }
        employments.push({
          fields: eFields,
          provenance: (employmentsProvenance[eIdx] || {}) as Record<string, string | null>,
          confidence: (employmentsConfidence[eIdx] || {}) as Record<string, 'high' | 'low'>,
          expanded: eIdx === 0,
          deleted: false
        });
      });
    } else {
      // Legacy back-compat: look for the 11 employment keys at the top level.
      const legacyHasAny = EMPLOYMENT_FIELD_KEYS.some(k => {
        const v = f[k];
        return v !== null && v !== undefined && String(v).trim() !== '';
      });
      if (legacyHasAny) {
        const eFields: Record<EmploymentFieldKey, string> = emptyEmploymentFields();
        const eProv: Record<string, string | null> = {};
        const eConf: Record<string, 'high' | 'low'> = {};
        for (const k of EMPLOYMENT_FIELD_KEYS) {
          eFields[k] = (f[k] ?? '') as string;
          if (provenance[k]) eProv[k] = provenance[k];
          if (confidence[k] === 'low' || confidence[k] === 'high') eConf[k] = confidence[k];
        }
        employments.push({
          fields: eFields,
          provenance: eProv,
          confidence: eConf,
          expanded: true,
          deleted: false
        });
      }
    }

    return {
      index: c.index ?? i,
      fields,
      provenance: provenance as Record<string, string | null>,
      confidence: confidence as Record<string, 'high' | 'low'>,
      employments,
      error: c.error || null,
      // Expand the first non-errored candidate by default.
      expanded: i === 0,
      skipped: false,
      deleted: false,
      compareOpen: false
    };
  });
}

// Human-readable explanations for the red ! chips on low-confidence fields.
const CONFIDENCE_HINT: Record<string, string> = {
  aadhaar_number: 'Failed Aadhaar checksum validation (Verhoeff). Verify against the source document.',
  pan_number: 'Does not match the PAN format (5 letters + 4 digits + 1 letter).',
  mobile: 'Not a valid 10-digit Indian mobile number (must start with 6/7/8/9).',
  hr_contact: 'Not a valid 10-digit Indian mobile number (must start with 6/7/8/9).',
  pin: 'Not a 6-digit PIN code.',
  dob: 'Could not parse as a date. Expected DD/MM/YYYY or similar.',
  pan_dob: 'Could not parse as a date.',
  passport_dob: 'Could not parse as a date.',
  passport_doi: 'Could not parse as a date.',
  passport_doe: 'Could not parse as a date.',
  date_of_joining: 'Could not parse as a date.',
  date_of_exit: 'Could not parse as a date.'
};

function countFilled(c: CandidateState): number {
  let n = 0;
  for (const k of ALL_FIELD_KEYS) {
    if ((c.fields[k as FlatFieldKey] || '').trim() !== '') n++;
  }
  // Count any non-empty employment field across non-deleted entries.
  for (const e of c.employments) {
    if (e.deleted) continue;
    for (const k of EMPLOYMENT_FIELD_KEYS) {
      if ((e.fields[k] || '').trim() !== '') n++;
    }
  }
  return n;
}

function candidateDisplayName(fields: Record<FlatFieldKey, string>, index: number): string {
  const name = fields['name'];
  return name && name.trim() ? name.trim() : `Candidate ${index + 1}`;
}

const ReviewForm: React.FC<ReviewFormProps> = ({ job, onCommit, committing }) => {
  const [candidates, setCandidates] = useState<CandidateState[]>(() => buildInitialState(job));
  const [excelHeaders, setExcelHeaders] = useState<string[] | null>(null);
  const [fieldKeyToColumn, setFieldKeyToColumn] = useState<Record<string, number> | null>(null);

  // Fetch the backend's authoritative Excel column layout once on mount so
  // the live preview table renders rows in exactly the order the .xlsx will
  // be written. Failure is non-blocking — Save still works without it.
  useEffect(() => {
    let cancelled = false;
    apiService.getScannerExcelHeaders()
      .then(res => {
        if (cancelled) return;
        if (res.success && res.data) {
          setExcelHeaders(res.data.headers);
          setFieldKeyToColumn(res.data.fieldKeyToColumn);
        }
      })
      .catch(err => console.warn('Could not load Excel headers for preview:', err?.message || err));
    return () => { cancelled = true; };
  }, []);

  const docUrls = job.docUrls || [];

  const tokenSummary = useMemo(() => {
    const u = job.tokenUsage;
    if (!u || !u.totalTokens) return '';
    return `Tokens: ${u.totalTokens.toLocaleString()} (in ${u.promptTokens.toLocaleString()} + out ${u.completionTokens.toLocaleString()})`;
  }, [job.tokenUsage]);

  const visible = candidates.filter(c => !c.deleted);
  const committable = visible.filter(c => !c.skipped && !c.error);

  // One candidate with N employments → N rows in the Excel. Used for the
  // save-button label so the count is truthful.
  const committableRowCount = committable.reduce((n, c) => {
    const liveEmps = c.employments.filter(e => !e.deleted);
    return n + Math.max(liveEmps.length, 1);
  }, 0);

  const updateField = (cIdx: number, k: FlatFieldKey, v: string) => {
    setCandidates(prev => prev.map((c, i) =>
      i === cIdx ? { ...c, fields: { ...c.fields, [k]: v } } : c
    ));
  };

  const updateEmploymentField = (cIdx: number, eIdx: number, k: EmploymentFieldKey, v: string) => {
    setCandidates(prev => prev.map((c, i) => {
      if (i !== cIdx) return c;
      return {
        ...c,
        employments: c.employments.map((e, ei) =>
          ei === eIdx ? { ...e, fields: { ...e.fields, [k]: v } } : e
        )
      };
    }));
  };

  const toggleEmploymentExpanded = (cIdx: number, eIdx: number) => {
    setCandidates(prev => prev.map((c, i) => {
      if (i !== cIdx) return c;
      return {
        ...c,
        employments: c.employments.map((e, ei) =>
          ei === eIdx ? { ...e, expanded: !e.expanded } : e
        )
      };
    }));
  };

  const deleteEmployment = (cIdx: number, eIdx: number) => {
    setCandidates(prev => prev.map((c, i) => {
      if (i !== cIdx) return c;
      return {
        ...c,
        employments: c.employments.map((e, ei) =>
          ei === eIdx ? { ...e, deleted: true } : e
        )
      };
    }));
  };

  const addEmployment = (cIdx: number) => {
    setCandidates(prev => prev.map((c, i) => {
      if (i !== cIdx) return c;
      const nextEntry: EmploymentState = {
        fields: emptyEmploymentFields(),
        provenance: {},
        confidence: {},
        expanded: true,
        deleted: false
      };
      return { ...c, employments: [...c.employments, nextEntry] };
    }));
  };

  const toggleExpanded = (cIdx: number) => {
    setCandidates(prev => prev.map((c, i) => i === cIdx ? { ...c, expanded: !c.expanded } : c));
  };

  const toggleSkipped = (cIdx: number) => {
    setCandidates(prev => prev.map((c, i) => i === cIdx ? { ...c, skipped: !c.skipped } : c));
  };

  const deleteCandidate = (cIdx: number) => {
    setCandidates(prev => prev.map((c, i) => i === cIdx ? { ...c, deleted: true } : c));
  };

  const toggleCompare = (cIdx: number) => {
    setCandidates(prev => prev.map((c, i) =>
      // Opening compare also auto-expands the card so the right pane has room.
      i === cIdx ? { ...c, compareOpen: !c.compareOpen, expanded: !c.compareOpen ? true : c.expanded } : c
    ));
  };

  const expandAll = () => setCandidates(prev => prev.map(c => ({ ...c, expanded: true })));
  const collapseAll = () => setCandidates(prev => prev.map(c => ({ ...c, expanded: false })));

  const handleSubmit = () => {
    if (committable.length === 0) return;
    const payload: ReviewedCandidate[] = committable.map(c => {
      const fields: Record<string, any> = {};
      const prov: Record<string, any> = {};
      for (const k of ALL_FIELD_KEYS) {
        const trimmed = (c.fields[k as FlatFieldKey] || '').trim();
        fields[k] = trimmed === '' ? null : trimmed;
        prov[k] = (c.provenance[k] as any) ?? null;
      }
      // Employments array — drop deleted entries; trim each field.
      const liveEmployments = c.employments.filter(e => !e.deleted);
      fields.employments = liveEmployments.map(e => {
        const entry: Record<string, string | null> = {};
        for (const k of EMPLOYMENT_FIELD_KEYS) {
          const trimmed = (e.fields[k] || '').trim();
          entry[k] = trimmed === '' ? null : trimmed;
        }
        return entry;
      });
      prov.employments = liveEmployments.map(e => {
        const entry: Record<string, string | null> = {};
        for (const k of EMPLOYMENT_FIELD_KEYS) {
          entry[k] = (e.provenance[k] as any) ?? null;
        }
        return entry;
      });
      return { fields, provenance: prov, sourceCandidateIndex: c.index };
    });
    onCommit(payload);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between bg-white border rounded-lg p-3">
        <div className="text-sm text-gray-700">
          <span className="font-semibold">{visible.length}</span> candidate{visible.length === 1 ? '' : 's'} scanned
          {visible.length !== committable.length && (
            <span className="text-gray-500"> · {committable.length} will be saved</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={expandAll} disabled={committing}>
            Expand all
          </Button>
          <Button variant="outline" size="sm" onClick={collapseAll} disabled={committing}>
            Collapse all
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        {candidates.map((c, cIdx) => {
          if (c.deleted) return null;
          const cardDocs = docUrls.filter(d => (d.candidateIndex ?? 0) === c.index);
          const filledCount = countFilled(c);
          const name = candidateDisplayName(c.fields, c.index);
          const liveEmployments = c.employments.filter(e => !e.deleted);
          return (
            <section
              key={c.index}
              className={`bg-white border rounded-lg ${c.skipped ? 'opacity-60' : ''} ${c.error ? 'border-red-300' : ''}`}
            >
              <header className="flex items-center gap-3 p-3 cursor-pointer" onClick={() => toggleExpanded(cIdx)}>
                <Button
                  variant="ghost"
                  size="sm"
                  className="p-1 h-7 w-7"
                  onClick={(e) => { e.stopPropagation(); toggleExpanded(cIdx); }}
                  aria-label={c.expanded ? 'Collapse' : 'Expand'}
                >
                  {c.expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </Button>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-gray-900 truncate">
                    {name}
                    <span className="ml-2 text-xs font-normal text-gray-500">
                      Candidate {c.index + 1}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500">
                    {c.error
                      ? <span className="text-red-600 flex items-center gap-1"><AlertTriangle className="h-3 w-3" />Extraction failed: {c.error}</span>
                      : <>{filledCount} field{filledCount === 1 ? '' : 's'} extracted · {cardDocs.length} source doc{cardDocs.length === 1 ? '' : 's'}</>
                    }
                  </div>
                </div>
                <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                  <Button
                    variant={c.compareOpen ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => toggleCompare(cIdx)}
                    disabled={committing}
                    title={c.compareOpen ? 'Hide source preview' : 'Compare side-by-side with source'}
                  >
                    {c.compareOpen ? <X className="h-4 w-4 mr-1" /> : <Columns2 className="h-4 w-4 mr-1" />}
                    {c.compareOpen ? 'Close compare' : 'Compare'}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toggleSkipped(cIdx)}
                    disabled={committing || !!c.error}
                    title={c.skipped ? 'Include this candidate' : 'Skip this candidate'}
                  >
                    {c.skipped
                      ? <EyeOff className="h-4 w-4 mr-1" />
                      : <Eye className="h-4 w-4 mr-1" />}
                    {c.skipped ? 'Skipped' : 'Skip'}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => deleteCandidate(cIdx)}
                    disabled={committing}
                    title="Remove from review"
                    className="hover:bg-red-50 hover:border-red-200"
                  >
                    <Trash2 className="h-4 w-4 text-red-600" />
                  </Button>
                </div>
              </header>

              {c.expanded && (
                <div className={`border-t p-4 grid gap-6 ${c.compareOpen ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1 lg:grid-cols-[1fr_240px]'}`}>
                  <div className="space-y-4">
                    {c.error ? (
                      <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded p-3">
                        OpenAI extraction failed for this candidate. The source docs are still available below. You can remove this card or rescan from scratch.
                      </div>
                    ) : (
                      <>
                        {FIELD_GROUPS.map(group => (
                          <div key={group.title} className="space-y-2">
                            <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">{group.title}</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-3">
                              {group.fields.map(f => {
                                const fk = f.key as FlatFieldKey;
                                const src = c.provenance[fk] as string | null | undefined;
                                const conf = c.confidence?.[fk];
                                const lowConfidence = conf === 'low';
                                return (
                                  <div key={fk} className="space-y-1">
                                    <div className="flex items-center justify-between gap-2">
                                      <label className="text-xs font-medium text-gray-700">{f.label}</label>
                                      <div className="flex items-center gap-1">
                                        {lowConfidence && (
                                          <span
                                            className="text-[10px] uppercase tracking-wide bg-red-50 text-red-700 border border-red-200 px-1.5 py-0.5 rounded cursor-help"
                                            title={CONFIDENCE_HINT[fk] || 'Validation flagged this field — please verify.'}
                                          >
                                            ! check
                                          </span>
                                        )}
                                        {src && (
                                          <span className="text-[10px] uppercase tracking-wide bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded">
                                            from: {docTypeLabel(src)}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                    <Input
                                      value={c.fields[fk] || ''}
                                      onChange={(e) => updateField(cIdx, fk, e.target.value)}
                                      placeholder="—"
                                      disabled={committing || c.skipped}
                                      className={lowConfidence ? 'border-red-300 focus-visible:ring-red-300' : undefined}
                                    />
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ))}

                        {/* Employment History — one repeating sub-card per job. */}
                        <div className="space-y-2 pt-2 border-t">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Briefcase className="h-4 w-4 text-gray-600" />
                              <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
                                Employment History
                              </h4>
                              <span className="text-[10px] bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded">
                                {liveEmployments.length} {liveEmployments.length === 1 ? 'job' : 'jobs'}
                              </span>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => addEmployment(cIdx)}
                              disabled={committing || c.skipped}
                            >
                              <Plus className="h-3.5 w-3.5 mr-1" /> Add employment
                            </Button>
                          </div>

                          {liveEmployments.length === 0 && (
                            <div className="text-xs text-gray-500 italic border border-dashed rounded p-3 text-center">
                              No employment history extracted. Click "Add employment" if the candidate has work history not picked up from the source documents.
                            </div>
                          )}

                          {c.employments.map((emp, eIdx) => {
                            if (emp.deleted) return null;
                            const liveIdx = c.employments
                              .slice(0, eIdx)
                              .filter(e => !e.deleted).length; // visible 0-based index
                            const empName = emp.fields.company_name?.trim() || `Employment ${liveIdx + 1}`;
                            return (
                              <div
                                key={eIdx}
                                className="border rounded-md bg-gray-50/50"
                              >
                                <div className="flex items-center gap-2 px-3 py-2">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="p-1 h-6 w-6"
                                    onClick={() => toggleEmploymentExpanded(cIdx, eIdx)}
                                    aria-label={emp.expanded ? 'Collapse' : 'Expand'}
                                  >
                                    {emp.expanded
                                      ? <ChevronDown className="h-3.5 w-3.5" />
                                      : <ChevronRight className="h-3.5 w-3.5" />}
                                  </Button>
                                  <div className="flex-1 min-w-0">
                                    <div className="text-xs font-semibold text-gray-900 truncate">
                                      {empName}
                                      <span className="ml-2 text-[10px] font-normal text-gray-500">
                                        #{liveIdx + 1}
                                      </span>
                                    </div>
                                    <div className="text-[11px] text-gray-500 truncate">
                                      {emp.fields.designation || 'Designation —'} · {emp.fields.employment_period || 'Period —'}
                                    </div>
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => deleteEmployment(cIdx, eIdx)}
                                    disabled={committing}
                                    title="Remove this employment entry"
                                    className="h-7 w-7 p-0 hover:bg-red-50"
                                  >
                                    <Trash2 className="h-3.5 w-3.5 text-red-600" />
                                  </Button>
                                </div>
                                {emp.expanded && (
                                  <div className="border-t bg-white p-3 grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-3">
                                    {EMPLOYMENT_FIELDS.map(f => {
                                      const src = emp.provenance[f.key] as string | null | undefined;
                                      const conf = emp.confidence?.[f.key];
                                      const lowConfidence = conf === 'low';
                                      return (
                                        <div key={f.key} className="space-y-1">
                                          <div className="flex items-center justify-between gap-2">
                                            <label className="text-xs font-medium text-gray-700">{f.label}</label>
                                            <div className="flex items-center gap-1">
                                              {lowConfidence && (
                                                <span
                                                  className="text-[10px] uppercase tracking-wide bg-red-50 text-red-700 border border-red-200 px-1.5 py-0.5 rounded cursor-help"
                                                  title={CONFIDENCE_HINT[f.key] || 'Validation flagged this field — please verify.'}
                                                >
                                                  ! check
                                                </span>
                                              )}
                                              {src && (
                                                <span className="text-[10px] uppercase tracking-wide bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded">
                                                  from: {docTypeLabel(src)}
                                                </span>
                                              )}
                                            </div>
                                          </div>
                                          <Input
                                            value={emp.fields[f.key] || ''}
                                            onChange={(e) => updateEmploymentField(cIdx, eIdx, f.key, e.target.value)}
                                            placeholder="—"
                                            disabled={committing || c.skipped}
                                            className={lowConfidence ? 'border-red-300 focus-visible:ring-red-300' : undefined}
                                          />
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </>
                    )}
                  </div>

                  {c.compareOpen ? (
                    <SourceDocViewer docs={cardDocs} sticky />
                  ) : (
                    <aside className="space-y-2">
                      <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Source documents</h4>
                      {cardDocs.length === 0 && (
                        <div className="text-xs text-gray-500">No previews available.</div>
                      )}
                      {cardDocs.map((d, i) => {
                        const lowQuality = d.quality && d.quality.warnings && d.quality.warnings.length > 0;
                        return (
                          <a
                            key={i}
                            href={d.url}
                            target="_blank"
                            rel="noreferrer"
                            className="block border rounded p-2 hover:bg-gray-50"
                          >
                            {d.mime.startsWith('image/') ? (
                              <img src={d.url} alt={d.originalName} className="w-full h-24 object-cover rounded" />
                            ) : (
                              <div className="h-24 flex items-center justify-center bg-gray-100 rounded text-xs text-gray-500">
                                PDF preview
                              </div>
                            )}
                            <div className="mt-1 flex items-center justify-between text-xs">
                              <span className="truncate text-gray-700">{d.originalName}</span>
                              <ExternalLink className="h-3 w-3 text-gray-400 flex-shrink-0" />
                            </div>
                            <div className="flex items-center justify-between text-[10px] text-gray-500">
                              <span>{docTypeLabel(d.docType)}</span>
                              {lowQuality && (
                                <span
                                  className="inline-flex items-center gap-1 bg-yellow-50 text-yellow-800 border border-yellow-200 rounded px-1.5 py-0.5"
                                  title={`Quality ${d.quality!.score}/100 — ${d.quality!.warnings.join(', ')}`}
                                >
                                  <ShieldAlert className="h-3 w-3" />
                                  low quality
                                </span>
                              )}
                            </div>
                          </a>
                        );
                      })}
                    </aside>
                  )}
                </div>
              )}
            </section>
          );
        })}
      </div>

      <ExcelRowPreview
        candidates={committable.map(c => ({
          index: c.index,
          fields: c.fields,
          employments: c.employments
            .filter(e => !e.deleted)
            .map(e => ({ fields: e.fields }))
        }))}
        headers={excelHeaders}
        fieldKeyToColumn={fieldKeyToColumn}
      />

      <div className="flex items-center justify-between bg-white border rounded-lg p-3 sticky bottom-2 shadow-sm">
        <div className="text-xs text-gray-500">{tokenSummary}</div>
        <Button onClick={handleSubmit} disabled={committing || committable.length === 0}>
          <Save className="h-4 w-4 mr-2" />
          {committing
            ? `Saving ${committableRowCount} row${committableRowCount === 1 ? '' : 's'}…`
            : `Save ${committableRowCount} row${committableRowCount === 1 ? '' : 's'} to Excel`}
        </Button>
      </div>
    </div>
  );
};

export default ReviewForm;
