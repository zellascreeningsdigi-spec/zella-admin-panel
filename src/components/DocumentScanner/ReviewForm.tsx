import React, { useMemo, useState } from 'react';
import { Save, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FIELD_GROUPS, FieldKey, ALL_FIELD_KEYS, docTypeLabel } from './fields';
import type { ScanJobSnapshot } from './ScanProgress';

interface ReviewFormProps {
  job: ScanJobSnapshot;
  onCommit: (fields: Record<FieldKey, string | null>, provenance: Record<FieldKey, string | null>) => void;
  committing: boolean;
}

function initialState(job: ScanJobSnapshot): Record<FieldKey, string> {
  const out: Partial<Record<FieldKey, string>> = {};
  const f = job.result?.fields || {};
  for (const k of ALL_FIELD_KEYS) {
    out[k] = (f[k] ?? '') as string;
  }
  return out as Record<FieldKey, string>;
}

const ReviewForm: React.FC<ReviewFormProps> = ({ job, onCommit, committing }) => {
  const [values, setValues] = useState<Record<FieldKey, string>>(() => initialState(job));
  const provenance = job.result?.provenance || {};
  const docUrls = job.docUrls || [];
  const tokenSummary = useMemo(() => {
    const u = job.tokenUsage;
    if (!u || !u.totalTokens) return '';
    return `Tokens: ${u.totalTokens.toLocaleString()} (in ${u.promptTokens.toLocaleString()} + out ${u.completionTokens.toLocaleString()})`;
  }, [job.tokenUsage]);

  const handleChange = (k: FieldKey, v: string) =>
    setValues(prev => ({ ...prev, [k]: v }));

  const handleSubmit = () => {
    const fields: Record<FieldKey, string | null> = {} as any;
    const prov: Record<FieldKey, string | null> = {} as any;
    for (const k of ALL_FIELD_KEYS) {
      const trimmed = (values[k] || '').trim();
      fields[k] = trimmed === '' ? null : trimmed;
      prov[k] = (provenance[k] as any) ?? null;
    }
    onCommit(fields, prov);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6">
      <div className="space-y-6">
        {FIELD_GROUPS.map(group => (
          <section key={group.title} className="bg-white border rounded-lg p-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">{group.title}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-3">
              {group.fields.map(f => {
                const src = provenance[f.key] as string | null | undefined;
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
                      value={values[f.key] || ''}
                      onChange={(e) => handleChange(f.key, e.target.value)}
                      placeholder="—"
                      disabled={committing}
                    />
                  </div>
                );
              })}
            </div>
          </section>
        ))}

        <div className="flex items-center justify-between">
          <div className="text-xs text-gray-500">{tokenSummary}</div>
          <Button onClick={handleSubmit} disabled={committing}>
            <Save className="h-4 w-4 mr-2" />
            {committing ? 'Saving…' : 'Save to Excel'}
          </Button>
        </div>
      </div>

      <aside className="bg-white border rounded-lg p-3 h-fit sticky top-4">
        <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-3">Source documents</h4>
        <div className="space-y-2">
          {docUrls.length === 0 && (
            <div className="text-xs text-gray-500">No previews available.</div>
          )}
          {docUrls.map((d, i) => (
            <a
              key={i}
              href={d.url}
              target="_blank"
              rel="noreferrer"
              className="block border rounded p-2 hover:bg-gray-50"
            >
              {d.mime.startsWith('image/') ? (
                <img src={d.url} alt={d.originalName} className="w-full h-32 object-cover rounded" />
              ) : (
                <div className="h-32 flex items-center justify-center bg-gray-100 rounded text-xs text-gray-500">
                  PDF preview
                </div>
              )}
              <div className="mt-1 flex items-center justify-between text-xs">
                <span className="truncate text-gray-700">{d.originalName}</span>
                <ExternalLink className="h-3 w-3 text-gray-400 flex-shrink-0" />
              </div>
              <div className="text-[10px] text-gray-500">{docTypeLabel(d.docType)}</div>
            </a>
          ))}
        </div>
      </aside>
    </div>
  );
};

export default ReviewForm;
