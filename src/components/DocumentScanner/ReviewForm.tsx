import React, { useMemo, useState } from 'react';
import { Save, ExternalLink, ChevronDown, ChevronRight, AlertTriangle, Eye, EyeOff, Trash2, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FIELD_GROUPS, FieldKey, ALL_FIELD_KEYS, docTypeLabel } from './fields';
import type { ScanJobSnapshot } from './ScanProgress';

interface CandidateState {
  index: number;
  fields: Record<FieldKey, string>;
  provenance: Record<string, string | null>;
  error: string | null;
  expanded: boolean;
  skipped: boolean;
  deleted: boolean;
}

export interface ReviewedCandidate {
  fields: Record<FieldKey, string | null>;
  provenance: Record<FieldKey, string | null>;
  sourceCandidateIndex: number;
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
        ? [{ index: 0, fields: result.fields, provenance: result.provenance, error: null }]
        : []);

  return sourceCandidates.map((c, i) => {
    const fields: Record<FieldKey, string> = {} as any;
    const f = (c.fields || {}) as Record<string, string | null>;
    for (const k of ALL_FIELD_KEYS) {
      fields[k] = (f[k] ?? '') as string;
    }
    return {
      index: c.index ?? i,
      fields,
      provenance: (c.provenance || {}) as Record<string, string | null>,
      error: c.error || null,
      // Expand the first non-errored candidate by default.
      expanded: i === 0,
      skipped: false,
      deleted: false
    };
  });
}

function countFilled(fields: Record<FieldKey, string>): number {
  let n = 0;
  for (const k of ALL_FIELD_KEYS) {
    if ((fields[k] || '').trim() !== '') n++;
  }
  return n;
}

function candidateDisplayName(fields: Record<FieldKey, string>, index: number): string {
  const name = fields['name'];
  return name && name.trim() ? name.trim() : `Candidate ${index + 1}`;
}

const ReviewForm: React.FC<ReviewFormProps> = ({ job, onCommit, committing }) => {
  const [candidates, setCandidates] = useState<CandidateState[]>(() => buildInitialState(job));

  const docUrls = job.docUrls || [];

  const tokenSummary = useMemo(() => {
    const u = job.tokenUsage;
    if (!u || !u.totalTokens) return '';
    return `Tokens: ${u.totalTokens.toLocaleString()} (in ${u.promptTokens.toLocaleString()} + out ${u.completionTokens.toLocaleString()})`;
  }, [job.tokenUsage]);

  const visible = candidates.filter(c => !c.deleted);
  const committable = visible.filter(c => !c.skipped && !c.error);

  const updateField = (cIdx: number, k: FieldKey, v: string) => {
    setCandidates(prev => prev.map((c, i) =>
      i === cIdx ? { ...c, fields: { ...c.fields, [k]: v } } : c
    ));
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

  const expandAll = () => setCandidates(prev => prev.map(c => ({ ...c, expanded: true })));
  const collapseAll = () => setCandidates(prev => prev.map(c => ({ ...c, expanded: false })));

  const handleSubmit = () => {
    if (committable.length === 0) return;
    const payload: ReviewedCandidate[] = committable.map(c => {
      const fields: Record<FieldKey, string | null> = {} as any;
      const prov: Record<FieldKey, string | null> = {} as any;
      for (const k of ALL_FIELD_KEYS) {
        const trimmed = (c.fields[k] || '').trim();
        fields[k] = trimmed === '' ? null : trimmed;
        prov[k] = (c.provenance[k] as any) ?? null;
      }
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
          const filledCount = countFilled(c.fields);
          const name = candidateDisplayName(c.fields, c.index);
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
                <div className="border-t p-4 grid grid-cols-1 lg:grid-cols-[1fr_240px] gap-6">
                  <div className="space-y-4">
                    {c.error ? (
                      <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded p-3">
                        OpenAI extraction failed for this candidate. The source docs are still available below. You can remove this card or rescan from scratch.
                      </div>
                    ) : (
                      FIELD_GROUPS.map(group => (
                        <div key={group.title} className="space-y-2">
                          <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">{group.title}</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-3">
                            {group.fields.map(f => {
                              const src = c.provenance[f.key] as string | null | undefined;
                              return (
                                <div key={f.key} className="space-y-1">
                                  <div className="flex items-center justify-between">
                                    <label className="text-xs font-medium text-gray-700">{f.label}</label>
                                    {src && (
                                      <span className="text-[10px] uppercase tracking-wide bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded">
                                        from: {docTypeLabel(src)}
                                      </span>
                                    )}
                                  </div>
                                  <Input
                                    value={c.fields[f.key] || ''}
                                    onChange={(e) => updateField(cIdx, f.key, e.target.value)}
                                    placeholder="—"
                                    disabled={committing || c.skipped}
                                  />
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))
                    )}
                  </div>

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
                </div>
              )}
            </section>
          );
        })}
      </div>

      <div className="flex items-center justify-between bg-white border rounded-lg p-3 sticky bottom-2 shadow-sm">
        <div className="text-xs text-gray-500">{tokenSummary}</div>
        <Button onClick={handleSubmit} disabled={committing || committable.length === 0}>
          <Save className="h-4 w-4 mr-2" />
          {committing
            ? `Saving ${committable.length}…`
            : `Save ${committable.length} to Excel`}
        </Button>
      </div>
    </div>
  );
};

export default ReviewForm;
