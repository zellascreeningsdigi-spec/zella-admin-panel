import React, { useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertCircle, AlertTriangle, CheckCircle2, ChevronDown, ChevronRight, FileSpreadsheet, Loader2, Upload } from 'lucide-react';
import { apiService } from '@/services/api';
import SearchPick from './SearchPick';
import { TrackerMeta } from './trackerTypes';

// Import cases from Excel: upload -> link tabs to companies -> preview -> import.

interface Props {
  meta: TrackerMeta;
  open: boolean;
  onClose: () => void;
  onImported: () => void;
}

type Step = 'upload' | 'link' | 'preview' | 'done';
const BY_CLIENT = '__by_client__';

interface SheetChoice {
  include: boolean;
  target: string; // customerId or BY_CLIENT
  clientMap: Record<string, string>;
}

const ImportDialog: React.FC<Props> = ({ meta, open, onClose, onImported }) => {
  const [step, setStep] = useState<Step>('upload');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<any>(null);
  const [choices, setChoices] = useState<Record<string, SheetChoice>>({});
  const [preview, setPreview] = useState<any>(null);
  const [result, setResult] = useState<any>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const reset = () => {
    setStep('upload'); setError(null); setAnalysis(null); setChoices({}); setPreview(null); setResult(null); setExpanded({});
  };
  const close = () => { if (!busy) { reset(); onClose(); } };

  const companies = meta.customers;
  const companyOptions = useMemo(() => companies.map((co) => ({ value: co._id, label: co.companyName })), [companies]);

  const upload = async (file: File) => {
    setError(null); setBusy(true);
    try {
      const r = await apiService.trackerImportAnalyze(file);
      const a = r.data;
      setAnalysis(a);
      const next: Record<string, SheetChoice> = {};
      for (const s of a.sheets.filter((x: any) => x.usable)) {
        const clientMap: Record<string, string> = {};
        for (const c of s.clients) if (c.match) clientMap[c.name] = c.match.customerId;
        const multi = s.clients.filter((c: any) => c.name).length > 1;
        next[s.name] = {
          include: s.rowCount > 0,
          target: s.suggestedCustomerId || (multi ? BY_CLIENT : ''),
          clientMap,
        };
      }
      setChoices(next);
      setStep('link');
    } catch (e: any) {
      setError(e.message || 'Could not read the file');
    } finally {
      setBusy(false);
    }
  };

  const payload = () => ({
    token: analysis.token,
    sheets: Object.entries(choices)
      .filter(([, c]) => c.include)
      .map(([name, c]) => (c.target === BY_CLIENT ? { name, clientMap: c.clientMap } : { name, customerId: c.target || undefined })),
  });

  const runPreview = async () => {
    setError(null); setBusy(true);
    try {
      const r = await apiService.trackerImportPreview(payload());
      setPreview(r.data);
      setStep('preview');
    } catch (e: any) {
      setError(e.message || 'Preview failed');
    } finally {
      setBusy(false);
    }
  };

  const apply = async () => {
    setError(null); setBusy(true);
    try {
      const r = await apiService.trackerImportApply(payload());
      setResult(r.data);
      setStep('done');
      onImported();
    } catch (e: any) {
      setError(e.message || 'Import failed');
    } finally {
      setBusy(false);
    }
  };

  const setChoice = (name: string, patch: Partial<SheetChoice>) => setChoices((c) => ({ ...c, [name]: { ...c[name], ...patch } }));
  const totals = useMemo(() => (preview?.sheets || []).reduce((t: any, s: any) => ({
    created: t.created + s.created, updated: t.updated + s.updated, unchanged: t.unchanged + s.unchanged, skipped: t.skipped + s.skipped,
  }), { created: 0, updated: 0, unchanged: 0, skipped: 0 }), [preview]);
  const included = Object.values(choices).filter((c) => c.include).length;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && close()}>
      <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><FileSpreadsheet className="w-5 h-5 text-brand-green" /> Import cases from Excel</DialogTitle>
        </DialogHeader>

        <div className="flex gap-2 text-xs text-gray-500 -mt-1">
          {['Upload', 'Link to companies', 'Preview', 'Done'].map((label, i) => (
            <span key={label} className={['upload', 'link', 'preview', 'done'].indexOf(step) >= i ? 'text-brand-green font-medium' : ''}>
              {i + 1}. {label}{i < 3 ? ' ›' : ''}
            </span>
          ))}
        </div>

        {step === 'upload' && (
          <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-lg py-14 cursor-pointer hover:border-brand-green">
            {busy ? <Loader2 className="w-8 h-8 animate-spin text-brand-green" /> : <Upload className="w-8 h-8 text-gray-400" />}
            <span className="text-sm text-gray-700">{busy ? 'Reading the workbook…' : 'Choose the tracker Excel file (.xlsx)'}</span>
            <span className="text-xs text-gray-500">Every tab is read. You choose which tabs to import and which company each belongs to.</span>
            <input type="file" accept=".xlsx,.xls,.xlsm" className="hidden" disabled={busy} onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); e.target.value = ''; }} />
          </label>
        )}

        {step === 'link' && analysis && (
          <div className="space-y-3">
            <p className="text-sm text-gray-600">
              <strong>{analysis.fileName}</strong> — link each tab to a company. Rows whose company is not chosen are skipped.
              Existing cases (same BGV ID and name) are updated; blank cells never erase saved values.
            </p>
            {analysis.sheets.map((s: any) => {
              if (!s.usable) return <p key={s.name} className="text-sm text-gray-400">Tab “{s.name}”: {s.reason}</p>;
              const c = choices[s.name];
              const extras = s.columns.filter((x: any) => x.kind === 'extra');
              const ignored = s.columns.filter((x: any) => x.kind === 'ignore');
              return (
                <div key={s.name} className={`border rounded-lg p-3 space-y-2 ${c.include ? '' : 'opacity-60'}`}>
                  <div className="flex flex-wrap items-center gap-3">
                    <label className="flex items-center gap-2 font-medium text-sm cursor-pointer">
                      <input type="checkbox" checked={c.include} onChange={(e) => setChoice(s.name, { include: e.target.checked })} />
                      {s.name}
                    </label>
                    <span className="text-xs text-gray-500">{s.rowCount} cases{s.warnings ? ` · ${s.warnings} values to check` : ''}</span>
                    <div className="flex items-center gap-2 ml-auto">
                      <span className="text-xs text-gray-500">Company:</span>
                      <SearchPick
                        className="w-72"
                        disabled={!c.include}
                        value={c.target}
                        onChange={(v) => setChoice(s.name, { target: v })}
                        placeholder="Choose a company…"
                        warn={c.include && !c.target}
                        pinned={s.clients.filter((x: any) => x.name).length > 0 ? [{ value: BY_CLIENT, label: 'Use the client name on each row' }] : []}
                        options={companyOptions}
                      />
                    </div>
                  </div>

                  {c.include && c.target === BY_CLIENT && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-1.5 bg-gray-50 rounded-md p-2">
                      {s.clients.filter((x: any) => x.name).map((cl: any) => (
                        <div key={cl.name} className="flex items-center gap-2 text-sm">
                          <span className="flex-1 truncate" title={cl.name}>{cl.name} <span className="text-xs text-gray-400">×{cl.count}</span></span>
                          <SearchPick
                            className="w-56 shrink-0"
                            size="sm"
                            value={c.clientMap[cl.name] || ''}
                            onChange={(v) => setChoice(s.name, { clientMap: { ...c.clientMap, [cl.name]: v } })}
                            warn={!c.clientMap[cl.name]}
                            pinned={[{ value: '', label: 'Skip these rows' }]}
                            options={companyOptions}
                          />
                        </div>
                      ))}
                    </div>
                  )}

                  <button type="button" className="text-xs text-gray-500 flex items-center gap-1" onClick={() => setExpanded((x) => ({ ...x, [s.name]: !x[s.name] }))}>
                    {expanded[s.name] ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                    Columns: {s.columns.length - extras.length - ignored.length} mapped, {extras.length} kept as extra fields, {ignored.length} calculated by the tracker
                  </button>
                  {expanded[s.name] && (
                    <div className="text-xs text-gray-600 grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-0.5 pl-4">
                      {s.columns.map((col: any, i: number) => (
                        <span key={i} className="truncate">
                          {col.header} → <span className={col.kind === 'extra' ? 'text-blue-700' : col.kind === 'ignore' ? 'text-gray-400' : 'text-brand-green'}>
                            {col.kind === 'field' ? meta.fields.find((f) => f.key === col.field)?.label || col.field
                              : col.kind === 'check' || col.kind === 'checkAll' ? `check: ${col.check || 'all'}`
                              : col.kind === 'client' ? 'company'
                              : col.kind === 'extra' ? 'extra field' : 'calculated'}
                          </span>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {step === 'preview' && preview && (
          <div className="space-y-3">
            <div className="grid grid-cols-4 gap-2 text-center">
              {[['New', totals.created, 'text-green-700'], ['Updated', totals.updated, 'text-blue-700'], ['Unchanged', totals.unchanged, 'text-gray-600'], ['Skipped', totals.skipped, 'text-amber-700']].map(([l, n, tone]) => (
                <div key={l as string} className="border rounded-lg p-2"><p className={`text-xl font-semibold ${tone}`}>{n as number}</p><p className="text-xs text-gray-500">{l}</p></div>
              ))}
            </div>
            {preview.sheets.map((s: any) => {
              const rows = s.rows || [];
              const warnRows = rows.filter((r: any) => r.warnings?.length);
              return (
                <div key={s.name} className="border rounded-lg">
                  <button type="button" className="w-full flex items-center gap-2 p-2 text-sm" onClick={() => setExpanded((x) => ({ ...x, [`p:${s.name}`]: !x[`p:${s.name}`] }))}>
                    {expanded[`p:${s.name}`] ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    <strong>{s.name}</strong>
                    <span className="text-xs text-gray-500">{s.created} new · {s.updated} updated · {s.unchanged} unchanged · {s.skipped} skipped{warnRows.length ? ` · ${warnRows.length} with warnings` : ''}</span>
                  </button>
                  {expanded[`p:${s.name}`] && (
                    <div className="max-h-72 overflow-y-auto border-t text-xs">
                      {rows.length === 0 && <p className="p-2 text-gray-400">Nothing to change.</p>}
                      {rows.map((r: any, i: number) => (
                        <div key={i} className="px-3 py-1.5 border-b last:border-0">
                          <span className={`font-medium ${r.action === 'create' ? 'text-green-700' : r.action === 'update' ? 'text-blue-700' : r.action === 'skipped' ? 'text-amber-700' : 'text-gray-600'}`}>
                            {r.action === 'create' ? 'New' : r.action === 'update' ? 'Update' : r.action === 'merged' ? 'Merged' : 'Skip'}
                          </span>{' '}
                          row {r.row} · {r.bgvId || '—'} · {r.name}
                          {r.reason && <span className="text-amber-700"> — {r.reason}</span>}
                          {r.changes?.length > 0 && (
                            <span className="text-gray-500"> — {r.changes.slice(0, 4).map((c: any) => `${meta.fields.find((f) => f.key === c.field)?.label || c.field}: ${c.from ?? '—'} → ${c.to ?? '—'}`).join('; ')}{r.changes.length > 4 ? ` +${r.changes.length - 4} more` : ''}</span>
                          )}
                          {r.warnings?.map((w: string, j: number) => <p key={j} className="text-amber-700 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> {w}</p>)}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {step === 'done' && result && (
          <div className="py-8 text-center space-y-2">
            <CheckCircle2 className="w-10 h-10 text-brand-green mx-auto" />
            <p className="font-medium">Import complete</p>
            <p className="text-sm text-gray-600">{result.totals.created} new · {result.totals.updated} updated · {result.totals.unchanged} unchanged · {result.totals.skipped} skipped</p>
          </div>
        )}

        {error && <p className="text-sm text-red-600 flex items-center gap-1"><AlertCircle className="w-4 h-4" /> {error}</p>}

        <div className="flex justify-between pt-2 border-t">
          <div>
            {step === 'link' && <Button type="button" variant="ghost" onClick={reset} disabled={busy}>Choose another file</Button>}
            {step === 'preview' && <Button type="button" variant="ghost" onClick={() => setStep('link')} disabled={busy}>Back</Button>}
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={close} disabled={busy}>{step === 'done' ? 'Close' : 'Cancel'}</Button>
            {step === 'link' && (
              <Button type="button" onClick={runPreview} disabled={busy || included === 0}>
                {busy ? 'Checking…' : 'Preview changes'}
              </Button>
            )}
            {step === 'preview' && (
              <Button type="button" onClick={apply} disabled={busy || totals.created + totals.updated === 0}>
                {busy ? 'Importing…' : `Import ${totals.created + totals.updated} case${totals.created + totals.updated === 1 ? '' : 's'}`}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ImportDialog;
