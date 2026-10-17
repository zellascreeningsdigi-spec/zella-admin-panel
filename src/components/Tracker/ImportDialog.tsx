import React, { useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertCircle, AlertTriangle, Building2, CheckCircle2, ChevronDown, ChevronRight, FileSpreadsheet, Loader2, Upload } from 'lucide-react';
import { apiService } from '@/services/api';
import SearchPick from './SearchPick';
import { CreatedCompany } from './CreateCompanyDialog';
import { TrackerMeta, companyKey } from './trackerTypes';

// Import cases from Excel: upload -> link tabs to companies -> preview -> import.
//
// A client name is linked once for the whole file: choosing (or creating) the
// company for "Dilip Buildcon Ltd" links every row with that name, in every
// tab. Names that are already a company, or were linked before, are linked
// automatically; names that are not yet companies can all be created at once.

interface Props {
  meta: TrackerMeta;
  open: boolean;
  onClose: () => void;
  /** After the import; `sheets` = the imported tabs to open in the tracker (when asked for). */
  onImported: (sheets?: { name: string; customerIds: string[] }[]) => void;
  /** Open "Create new company" with a suggested name; resolves to the new company id. */
  onCreateCompany: (suggestedName: string) => Promise<string | null>;
  /** Companies created here in one go (so the pickers know them). */
  onCompaniesCreated: (companies: CreatedCompany[]) => void;
}

type Step = 'upload' | 'link' | 'preview' | 'done';
const BY_CLIENT = '__by_client__';

interface SheetChoice {
  include: boolean;
  target: string; // customerId or BY_CLIENT
  /** Remember the tab's columns as the company's own format. */
  saveFormat: boolean;
}

/** The one name a tab goes by: its only client name, or its tab name when rows name no client. Null when rows name several clients. */
const sheetName = (s: any): string | null => {
  const named = (s.clients || []).filter((c: any) => c.name);
  if (named.length === 1) return named[0].name;
  return named.length === 0 ? s.name : null;
};

const ImportDialog: React.FC<Props> = ({ meta, open, onClose, onImported, onCreateCompany, onCompaniesCreated }) => {
  const [step, setStep] = useState<Step>('upload');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<any>(null);
  const [choices, setChoices] = useState<Record<string, SheetChoice>>({});
  // Client name (companyKey) -> company id for the whole file. '' = skip those rows; missing = not chosen yet.
  const [nameMap, setNameMap] = useState<Record<string, string>>({});
  // Names linked by a close (not exact) match: shown as "check this".
  const [suggested, setSuggested] = useState<Record<string, boolean>>({});
  const [openAsTabs, setOpenAsTabs] = useState(true);
  const [missingOpen, setMissingOpen] = useState(false);
  const [unticked, setUnticked] = useState<Record<string, boolean>>({});
  const [preview, setPreview] = useState<any>(null);
  const [result, setResult] = useState<any>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const reset = () => {
    setStep('upload'); setError(null); setAnalysis(null); setChoices({}); setNameMap({}); setSuggested({});
    setMissingOpen(false); setUnticked({}); setPreview(null); setResult(null); setExpanded({});
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
      const names: Record<string, string> = {};
      const close: Record<string, boolean> = {};
      for (const s of a.sheets.filter((x: any) => x.usable)) {
        for (const c of s.clients) {
          const key = companyKey(c.name);
          if (!key || !c.match || key in names) continue;
          names[key] = c.match.customerId;
          if (!c.match.exact) close[key] = true;
        }
        const multi = s.clients.filter((c: any) => c.name).length > 1;
        next[s.name] = {
          // A tab with no cases but its own columns is a format: still worth importing.
          include: s.rowCount > 0 || (s.companyFields || []).length > 0,
          target: s.suggestedCustomerId || (multi ? BY_CLIENT : ''),
          saveFormat: true,
        };
      }
      setChoices(next);
      setNameMap(names);
      setSuggested(close);
      setStep('link');
    } catch (e: any) {
      setError(e.message || 'Could not read the file');
    } finally {
      setBusy(false);
    }
  };

  const usableSheets: any[] = useMemo(() => (analysis?.sheets || []).filter((s: any) => s.usable), [analysis]);
  const clientMapFor = (s: any) => {
    const map: Record<string, string> = {};
    for (const c of s.clients) if (c.name && nameMap[companyKey(c.name)]) map[c.name] = nameMap[companyKey(c.name)];
    return map;
  };
  const payload = () => ({
    token: analysis.token,
    sheets: usableSheets
      .filter((s) => choices[s.name]?.include)
      .map((s) => {
        const c = choices[s.name];
        return c.target === BY_CLIENT
          ? { name: s.name, clientMap: clientMapFor(s) }
          : { name: s.name, customerId: c.target || undefined, saveFormat: c.saveFormat };
      }),
  });
  /** The companies each imported tab ended up with (to open it as a tracker tab). */
  const importedTabs = () => usableSheets
    .filter((s) => choices[s.name]?.include)
    .map((s) => {
      const c = choices[s.name];
      const ids = c.target === BY_CLIENT ? Object.values(clientMapFor(s)) : c.target ? [c.target] : [];
      return { name: s.name, customerIds: Array.from(new Set(ids)) };
    })
    .filter((t) => t.customerIds.length > 0);

  /**
   * Link a name to a company everywhere in the file: rows with that client
   * name in every tab, and every tab that goes by that name as a whole.
   */
  const linkName = (name: string, id: string) => {
    const key = companyKey(name);
    if (!key) return;
    setNameMap((m) => ({ ...m, [key]: id }));
    setSuggested((x) => ({ ...x, [key]: false }));
    setChoices((all) => {
      const out = { ...all };
      for (const s of usableSheets) {
        const own = sheetName(s);
        if (own && companyKey(own) === key && out[s.name]?.target !== BY_CLIENT) out[s.name] = { ...out[s.name], target: id };
      }
      return out;
    });
  };
  const setTarget = (s: any, v: string) => {
    const own = sheetName(s);
    if (v && v !== BY_CLIENT && own) linkName(own, v);
    else setChoice(s.name, { target: v });
  };

  // Names in the included tabs that are not linked to any company yet.
  const missing = useMemo(() => {
    const out = new Map<string, string>();
    for (const s of usableSheets) {
      const c = choices[s.name];
      if (!c?.include || (c.target && c.target !== BY_CLIENT)) continue;
      const own = sheetName(s);
      const candidates = c.target === BY_CLIENT || !own ? s.clients.filter((x: any) => x.name).map((x: any) => x.name) : [own];
      for (const n of candidates) {
        const key = companyKey(n);
        if (key && !(key in nameMap) && !out.has(key)) out.set(key, String(n).trim());
      }
    }
    return Array.from(out.entries()).map(([key, name]) => ({ key, name }));
  }, [usableSheets, choices, nameMap]);
  const toCreate = missing.filter((m) => !unticked[m.key]);

  const createMissing = async () => {
    setError(null); setBusy(true);
    try {
      const r = await apiService.createTrackerCompanies(toCreate.map((m) => m.name));
      const results: { name: string; company: CreatedCompany }[] = r.data?.results || [];
      onCompaniesCreated(results.map((x) => x.company));
      const ids: Record<string, string> = {};
      for (const x of results) ids[companyKey(x.name)] = x.company._id;
      setNameMap((m) => ({ ...m, ...ids }));
      setChoices((all) => {
        const out = { ...all };
        for (const s of usableSheets) {
          const c = out[s.name];
          if (!c?.include || (c.target && c.target !== BY_CLIENT)) continue;
          const own = sheetName(s);
          if (own && c.target !== BY_CLIENT && ids[companyKey(own)]) out[s.name] = { ...c, target: ids[companyKey(own)] };
          else if (!own && !c.target) out[s.name] = { ...c, target: BY_CLIENT };
        }
        return out;
      });
      setMissingOpen(false);
    } catch (e: any) {
      setError(e.message || 'Could not create the companies');
    } finally {
      setBusy(false);
    }
  };

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
      onImported(openAsTabs ? importedTabs() : undefined);
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
  const companyChanges = (preview?.sheets || []).filter((s: any) => s.newFields?.length || s.saveFormat);
  const caseCount = totals.created + totals.updated;
  const knownFields = (customerId: string) => new Set(
    (companies.find((co) => co._id === customerId)?.trackerCustomFields || []).map((f) => f.label.toLowerCase()),
  );
  const columnLabel = (col: any) => {
    switch (col.kind) {
      case 'field': return meta.fields.find((f) => f.key === col.field)?.label || col.field;
      case 'check': return `check: ${col.check}`;
      case 'checkAll': return 'check: all';
      case 'checkDate': return `completion date of ${col.check}`;
      case 'insuffCycle': return `insufficiency ${col.cycle}`;
      case 'client': return 'company';
      case 'extra': return `company field${col.valueType && col.valueType !== 'text' ? ` (${col.valueType})` : ''}`;
      default: return 'calculated';
    }
  };

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
              A client name is linked once for the whole file — every row with that name, in every tab, goes to the same company.
            </p>
            {missing.length > 0 && (
              <div className="border border-brand-green/40 bg-brand-green-50 rounded-lg p-2.5 text-sm space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Building2 className="w-4 h-4 text-brand-green shrink-0" />
                  <span className="flex-1 min-w-[200px]">
                    <strong>{missing.length}</strong> name{missing.length === 1 ? '' : 's'} in this file {missing.length === 1 ? 'is' : 'are'} not a company yet
                    {!missingOpen && <>: {missing.slice(0, 4).map((m) => m.name).join(', ')}{missing.length > 4 ? ` +${missing.length - 4} more` : ''}</>}
                  </span>
                  <button type="button" className="text-xs text-gray-600 underline" onClick={() => setMissingOpen((o) => !o)}>{missingOpen ? 'Hide list' : 'Choose which'}</button>
                  <Button type="button" size="sm" className="h-8" disabled={busy || toCreate.length === 0} onClick={createMissing}>
                    {busy ? 'Creating…' : `Create ${toCreate.length} compan${toCreate.length === 1 ? 'y' : 'ies'} with these names`}
                  </Button>
                </div>
                {missingOpen && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-1 pl-6 max-h-48 overflow-y-auto">
                    {missing.map((m) => (
                      <label key={m.key} className="flex items-center gap-2 cursor-pointer truncate">
                        <input type="checkbox" checked={!unticked[m.key]} onChange={(e) => setUnticked((u) => ({ ...u, [m.key]: !e.target.checked }))} />
                        <span className="truncate" title={m.name}>{m.name}</span>
                      </label>
                    ))}
                  </div>
                )}
                <p className="text-xs text-gray-600 pl-6">Each company is created with exactly that name (no email, no logins) and linked to every row with the name.</p>
              </div>
            )}
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
                    <span className="text-xs text-gray-500">
                      {s.rowCount ? `${s.rowCount} cases` : 'No cases — column format only'}{s.warnings ? ` · ${s.warnings} values to check` : ''}
                    </span>
                    <div className="flex items-center gap-2 ml-auto">
                      <span className="text-xs text-gray-500">Company:</span>
                      <SearchPick
                        className="w-72"
                        disabled={!c.include}
                        value={c.target}
                        onChange={(v) => setTarget(s, v)}
                        placeholder="Choose a company…"
                        warn={c.include && !c.target}
                        pinned={s.clients.filter((x: any) => x.name).length > 0 ? [{ value: BY_CLIENT, label: 'Use the client name on each row' }] : []}
                        options={companyOptions}
                        onCreate={async (q) => {
                          const id = await onCreateCompany(q || sheetName(s) || s.name);
                          if (id) setTarget(s, id);
                        }}
                      />
                    </div>
                  </div>

                  {(s.notes || []).map((n: string) => (
                    <p key={n} className="text-xs text-amber-700 flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5 shrink-0" /> {n}</p>
                  ))}

                  {c.include && c.target === BY_CLIENT && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-1.5 bg-gray-50 rounded-md p-2">
                      {s.clients.filter((x: any) => x.name).map((cl: any) => {
                        const key = companyKey(cl.name);
                        return (
                          <div key={cl.name} className="flex items-center gap-2 text-sm">
                            <span className="flex-1 truncate" title={cl.name}>
                              {cl.name} <span className="text-xs text-gray-400">×{cl.count}</span>
                              {suggested[key] && nameMap[key] && <span className="ml-1 text-[11px] text-amber-700" title="Linked by a similar name — check it is the right company">check</span>}
                            </span>
                            <SearchPick
                              className="w-56 shrink-0"
                              size="sm"
                              value={nameMap[key] || ''}
                              onChange={(v) => linkName(cl.name, v)}
                              warn={!(key in nameMap)}
                              pinned={[{ value: '', label: 'Skip these rows' }]}
                              options={companyOptions}
                              onCreate={async (q) => {
                                const id = await onCreateCompany(q || cl.name);
                                if (id) linkName(cl.name, id);
                              }}
                            />
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {c.include && c.target && c.target !== BY_CLIENT && (() => {
                    const known = knownFields(c.target);
                    const fresh = (s.companyFields || []).filter((f: any) => !known.has(f.label.toLowerCase()));
                    const companyName = companies.find((co) => co._id === c.target)?.companyName || 'this company';
                    return (
                      <div className="bg-blue-50/60 rounded-md p-2 text-xs space-y-1.5">
                        {fresh.length > 0 ? (
                          <p className="text-blue-900">
                            <strong>{fresh.length} new field{fresh.length === 1 ? '' : 's'}</strong> for {companyName}:{' '}
                            {fresh.map((f: any) => f.label).join(', ')}
                          </p>
                        ) : (s.companyFields || []).length > 0 ? (
                          <p className="text-gray-600">{companyName} already has all {s.companyFields.length} of this tab’s own fields.</p>
                        ) : null}
                        <label className="flex items-start gap-2 cursor-pointer text-gray-700">
                          <input type="checkbox" className="mt-0.5" checked={c.saveFormat} onChange={(e) => setChoice(s.name, { saveFormat: e.target.checked })} />
                          <span>Remember this tab’s columns as {companyName}’s format — its Excel export comes back in the same columns and order</span>
                        </label>
                      </div>
                    );
                  })()}

                  <button type="button" className="text-xs text-gray-500 flex items-center gap-1" onClick={() => setExpanded((x) => ({ ...x, [s.name]: !x[s.name] }))}>
                    {expanded[s.name] ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                    Columns: {s.columns.length - extras.length - ignored.length} mapped, {extras.length} company field{extras.length === 1 ? '' : 's'}, {ignored.length} calculated by the tracker
                  </button>
                  {expanded[s.name] && (
                    <div className="text-xs text-gray-600 grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-0.5 pl-4">
                      {s.columns.map((col: any, i: number) => (
                        <span key={i} className="truncate">
                          {col.header} → <span className={col.kind === 'extra' ? 'text-blue-700' : col.kind === 'ignore' ? 'text-gray-400' : 'text-brand-green'}>
                            {columnLabel(col)}
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
            {companyChanges.length > 0 && (
              <div className="border border-blue-200 bg-blue-50/60 rounded-lg p-2 text-sm space-y-1">
                {companyChanges.map((s: any) => (
                  <p key={s.name} className="text-blue-900">
                    <strong>{s.companyName}</strong>:{' '}
                    {[
                      s.newFields?.length ? `adds ${s.newFields.length} field${s.newFields.length === 1 ? '' : 's'} (${s.newFields.map((f: any) => f.label).join(', ')})` : '',
                      s.saveFormat ? `remembers the “${s.name}” columns as its format` : '',
                    ].filter(Boolean).join(' and ')}
                  </p>
                ))}
              </div>
            )}
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
            {(result.fieldsAdded > 0 || result.formatsSaved > 0) && (
              <p className="text-sm text-blue-800">
                {[
                  result.fieldsAdded ? `${result.fieldsAdded} company field${result.fieldsAdded === 1 ? '' : 's'} added` : '',
                  result.formatsSaved ? `${result.formatsSaved} company format${result.formatsSaved === 1 ? '' : 's'} saved` : '',
                ].filter(Boolean).join(' · ')}
              </p>
            )}
          </div>
        )}

        {error && <p className="text-sm text-red-600 flex items-center gap-1"><AlertCircle className="w-4 h-4" /> {error}</p>}

        <div className="flex justify-between pt-2 border-t">
          <div className="flex items-center gap-3">
            {step === 'link' && <Button type="button" variant="ghost" onClick={reset} disabled={busy}>Choose another file</Button>}
            {step === 'preview' && <Button type="button" variant="ghost" onClick={() => setStep('link')} disabled={busy}>Back</Button>}
            {(step === 'link' || step === 'preview') && (
              <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <input type="checkbox" checked={openAsTabs} onChange={(e) => setOpenAsTabs(e.target.checked)} />
                Open each imported tab as a tracker tab
              </label>
            )}
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={close} disabled={busy}>{step === 'done' ? 'Close' : 'Cancel'}</Button>
            {step === 'link' && (
              <Button type="button" onClick={runPreview} disabled={busy || included === 0}>
                {busy ? 'Checking…' : 'Preview changes'}
              </Button>
            )}
            {step === 'preview' && (
              <Button type="button" onClick={apply} disabled={busy || (caseCount === 0 && companyChanges.length === 0)}>
                {busy ? 'Importing…'
                  : caseCount > 0 ? `Import ${caseCount} case${caseCount === 1 ? '' : 's'}`
                  : 'Save company fields & format'}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ImportDialog;
