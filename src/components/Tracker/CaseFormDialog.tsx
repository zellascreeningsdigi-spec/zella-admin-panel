import React, { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertCircle, Loader2, Plus, Trash2 } from 'lucide-react';
import { apiService } from '@/services/api';
import SearchPick from './SearchPick';
import {
  TrackerCase,
  TrackerCheck,
  TrackerField,
  TrackerMeta,
  CHECK_STYLE,
  TAT_STYLE,
  fmtDate,
  toInputDate,
} from './trackerTypes';

// Add or edit one tracker case. Read-only for company logins.

interface Props {
  meta: TrackerMeta;
  open: boolean;
  caseId?: string | null;
  defaultCustomerId?: string;
  /** Pre-fill a new case (Duplicate). */
  initial?: Partial<TrackerCase> | null;
  onClose: () => void;
  onSaved: (c: TrackerCase) => void;
}

type Tab = 'details' | 'checks' | 'extras' | 'history';

const blank = (customerId?: string): Partial<TrackerCase> => ({
  customerId: customerId || '',
  status: 'WIP',
  billingStatus: 'Pending',
  checks: [],
  extras: {},
  startDate: new Date().toISOString().slice(0, 10),
});

const CaseFormDialog: React.FC<Props> = ({ meta, open, caseId, defaultCustomerId, initial, onClose, onSaved }) => {
  const [tab, setTab] = useState<Tab>('details');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<Partial<TrackerCase>>(blank(defaultCustomerId));
  const [original, setOriginal] = useState<TrackerCase | null>(null);
  const [newExtra, setNewExtra] = useState({ key: '', value: '' });
  const readOnly = !meta.canEdit;

  useEffect(() => {
    if (!open) return;
    setTab('details');
    setError(null);
    if (!caseId) {
      setOriginal(null);
      if (initial) {
        // Duplicate: same company and details, but a fresh case.
        const { _id, history, createdAt, updatedAt, agingDays, tatStatus, insuffOpen, insuffDays, isOpen, requiredChecks, hasDiscrepancy, ...rest } = initial as any;
        setForm({ ...rest, bgvId: '', employeeCode: '', name: '', endDate: null, checks: (rest.checks || []).map((c: TrackerCheck) => ({ ...c, status: 'Pending', note: '' })) });
      } else {
        setForm(blank(defaultCustomerId || (meta.customers.length === 1 ? meta.customers[0]._id : '')));
      }
      return;
    }
    setLoading(true);
    apiService.getTrackerCase(caseId)
      .then((r) => {
        const c = r.data as TrackerCase;
        setOriginal(c);
        setForm({ ...c, checks: c.checks || [], extras: c.extras || {} });
      })
      .catch((e) => setError(e.message || 'Could not load the case'))
      .finally(() => setLoading(false));
  }, [open, caseId, meta, defaultCustomerId, initial]);

  const set = (key: string, value: any) => setForm((f) => ({ ...f, [key]: value }));
  const fieldsByGroup = useMemo(() => {
    const out: Record<string, TrackerField[]> = {};
    for (const f of meta.fields) {
      if (f.computed) continue;
      (out[f.group] = out[f.group] || []).push(f);
    }
    return out;
  }, [meta]);

  const editingDraft = !!original?.isDraft;

  /**
   * mode: 'draft'   save as / keep as a draft (nothing required but one detail)
   *       'publish' add to the tracker (company + name required)
   *       'save'    save changes to a case already in the tracker
   */
  const save = async (mode: 'draft' | 'publish' | 'save') => {
    setError(null);
    if (mode !== 'draft') {
      if (!form.customerId) { setError('Choose a company'); return; }
      if (!String(form.name || '').trim()) { setError('Candidate name is required'); return; }
    }
    const payload: any = {};
    for (const f of meta.fields) {
      if (f.computed || f.key === 'billing') continue;
      if (f.key in form) payload[f.key] = form[f.key] ?? '';
    }
    payload.billingStatus = form.billingStatus || 'Pending';
    payload.billedMonth = form.billingStatus === 'Billed' ? (form.billedMonth || '') : '';
    payload.checks = (form.checks || []).map((c) => ({ type: c.type, status: c.status, variant: c.variant || '', note: c.note || '' }));
    payload.extras = form.extras || {};
    payload.customerId = form.customerId || undefined;
    if (mode === 'draft' && !caseId) payload.isDraft = true;
    if (mode === 'publish') payload.isDraft = false;
    // A new start date / TAT moves the due date unless it was edited by hand.
    if (original) {
      const moved = toInputDate(form.startDate) !== toInputDate(original.startDate) || (form.tatDays ?? null) !== (original.tatDays ?? null);
      if (moved && toInputDate(form.endDate) === toInputDate(original.endDate)) delete payload.endDate;
    } else if (!form.endDate) {
      delete payload.endDate;
    }
    try {
      setSaving(true);
      const r = caseId ? await apiService.updateTrackerCase(caseId, payload) : await apiService.createTrackerCase(payload);
      onSaved(r.data as TrackerCase);
      onClose();
    } catch (e: any) {
      setError(e?.data?.errors?.join('; ') || e.message || 'Could not save');
    } finally {
      setSaving(false);
    }
  };

  const renderInput = (f: TrackerField) => {
    const v = form[f.key];
    const cls = 'mt-1 h-9 text-sm';
    if (f.type === 'status') {
      return (
        <select disabled={readOnly} className="mt-1 h-9 w-full px-2 border border-gray-300 rounded-md text-sm bg-white" value={v || 'WIP'} onChange={(e) => set(f.key, e.target.value)}>
          {meta.statuses.map((s) => <option key={s}>{s}</option>)}
        </select>
      );
    }
    if (f.type === 'billing') {
      return (
        <div className="mt-1 flex gap-2">
          <select disabled={readOnly} className="h-9 px-2 border border-gray-300 rounded-md text-sm bg-white" value={form.billingStatus || 'Pending'} onChange={(e) => set('billingStatus', e.target.value)}>
            {meta.billingStatuses.map((s) => <option key={s}>{s}</option>)}
          </select>
          {form.billingStatus === 'Billed' && (
            <input disabled={readOnly} type="month" className="h-9 px-2 border border-gray-300 rounded-md text-sm flex-1" value={form.billedMonth || ''} onChange={(e) => set('billedMonth', e.target.value)} />
          )}
        </div>
      );
    }
    if (f.type === 'longtext') {
      return <textarea disabled={readOnly} rows={2} className="mt-1 w-full px-2 py-1.5 border border-gray-300 rounded-md text-sm" value={v || ''} onChange={(e) => set(f.key, e.target.value)} />;
    }
    if (f.type === 'date') return <Input disabled={readOnly} type="date" className={cls} value={toInputDate(v)} onChange={(e) => set(f.key, e.target.value || null)} />;
    if (f.type === 'month') return <Input disabled={readOnly} type="month" className={cls} value={v || ''} onChange={(e) => set(f.key, e.target.value)} />;
    if (f.type === 'number') return <Input disabled={readOnly} type="number" min={0} className={cls} value={v ?? ''} onChange={(e) => set(f.key, e.target.value === '' ? null : Number(e.target.value))} />;
    if (f.type === 'person') {
      const list = f.key === 'initiatorName' ? meta.options.initiators : meta.options.allocated;
      return (
        <>
          <Input disabled={readOnly} list={`dl-${f.key}`} className={cls} value={v || ''} onChange={(e) => set(f.key, e.target.value)} />
          <datalist id={`dl-${f.key}`}>{list.map((p) => <option key={p} value={p} />)}</datalist>
        </>
      );
    }
    return <Input disabled={readOnly} className={cls} value={v || ''} onChange={(e) => set(f.key, e.target.value)} />;
  };

  // ---- checks ----
  const checks = form.checks || [];
  const setChecks = (next: TrackerCheck[]) => set('checks', next);
  const addCheck = (type: string) => setChecks([...checks, { type, status: 'Pending', variant: '', note: '' }]);

  const extras = form.extras || {};
  const tabBtn = (t: Tab, label: string, count?: number) => (
    <button
      type="button"
      onClick={() => setTab(t)}
      className={`px-3 py-2 text-sm border-b-2 -mb-px ${tab === t ? 'border-brand-green text-brand-green font-medium' : 'border-transparent text-gray-500 hover:text-gray-800'}`}
    >
      {label}{count ? <span className="ml-1 text-xs text-gray-400">({count})</span> : null}
    </button>
  );

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !saving && onClose()}>
      <DialogContent className="max-w-5xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {caseId ? (readOnly ? 'Case details' : editingDraft ? 'Draft case' : 'Edit case') : 'Add case'}
            {editingDraft && <span className="ml-2 align-middle text-[11px] font-medium px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">DRAFT</span>}
            {original && <span className="ml-2 text-sm font-normal text-gray-500">{original.bgvId || ''} · {original.companyName}</span>}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="py-10 text-center text-gray-500"><Loader2 className="w-5 h-5 animate-spin mx-auto" /></div>
        ) : (
          <div className="space-y-4">
            {editingDraft && (
              <p className="text-xs text-amber-800 bg-amber-50 rounded-md p-2">
                This case is a draft{original?.createdByName ? ` started by ${original.createdByName}` : ''}. It is not in the tracker,
                analytics or exports yet. Fill in what you have and save, or add it to the tracker once the company and name are in.
              </p>
            )}
            {original && !editingDraft && (
              <div className="flex flex-wrap gap-4 text-sm bg-gray-50 rounded-md p-3">
                <span>Aging: <strong>{original.agingDays ?? '—'}{original.agingDays != null ? ' days' : ''}</strong></span>
                {original.tatStatus && <span>TAT: <strong className={TAT_STYLE[original.tatStatus] || ''}>{original.tatStatus}</strong></span>}
                {original.endDate && <span>Due: <strong>{fmtDate(original.endDate)}</strong></span>}
                {original.insuffOpen && <span className="text-amber-700">Insufficiency open {original.insuffDays} days</span>}
                {original.requiredChecks && <span>Checks: <strong>{original.requiredChecks}</strong></span>}
              </div>
            )}

            <div className="flex border-b">
              {tabBtn('details', 'Details')}
              {meta.showChecks && tabBtn('checks', 'Checks', checks.length)}
              {meta.showExtras && tabBtn('extras', 'Extra fields', Object.keys(extras).length)}
              {original?.history && tabBtn('history', 'History', original.history.length)}
            </div>

            {tab === 'details' && (
              <div className="space-y-5">
                {!meta.isClient && (
                  <div className="max-w-md">
                    <Label className="text-xs text-gray-600">Company <span className="text-red-500">*</span></Label>
                    <SearchPick
                      className="mt-1"
                      disabled={readOnly}
                      value={form.customerId || ''}
                      onChange={(v) => set('customerId', v)}
                      placeholder="Choose a company…"
                      options={meta.customers.map((c) => ({ value: c._id, label: c.companyName }))}
                    />
                  </div>
                )}
                {meta.groups.filter((g) => fieldsByGroup[g.key]?.length).map((g) => (
                  <div key={g.key}>
                    <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">{g.label}</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {fieldsByGroup[g.key].map((f) => (
                        <div key={f.key} className={f.type === 'longtext' ? 'sm:col-span-2 lg:col-span-3' : ''}>
                          <Label className="text-xs text-gray-600">
                            {f.label}{f.key === 'name' && <span className="text-red-500"> *</span>}
                          </Label>
                          {renderInput(f)}
                          {f.key === 'endDate' && !readOnly && <p className="text-[11px] text-gray-400 mt-0.5">Leave empty to use start date + TAT</p>}
                          {f.key === 'initiationMonth' && !readOnly && <p className="text-[11px] text-gray-400 mt-0.5">Leave empty to use the cycle of the start date</p>}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {tab === 'checks' && (
              <div className="space-y-3">
                {checks.length === 0 && <p className="text-sm text-gray-500">No checks yet.</p>}
                {checks.map((c, i) => (
                  <div key={i} className="grid grid-cols-12 gap-2 items-center">
                    <select disabled={readOnly} className="col-span-3 h-9 px-2 border border-gray-300 rounded-md text-sm bg-white" value={c.type} onChange={(e) => setChecks(checks.map((x, j) => (j === i ? { ...x, type: e.target.value } : x)))}>
                      {meta.checkTypes.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
                    </select>
                    <select disabled={readOnly} className={`col-span-2 h-9 px-2 border border-gray-300 rounded-md text-sm ${CHECK_STYLE[c.status] || 'bg-white'}`} value={c.status} onChange={(e) => setChecks(checks.map((x, j) => (j === i ? { ...x, status: e.target.value } : x)))}>
                      {meta.checkStatuses.map((s) => <option key={s}>{s}</option>)}
                    </select>
                    {c.type === 'address' ? (
                      <select disabled={readOnly} className="col-span-2 h-9 px-2 border border-gray-300 rounded-md text-sm bg-white" value={c.variant || ''} onChange={(e) => setChecks(checks.map((x, j) => (j === i ? { ...x, variant: e.target.value } : x)))}>
                        <option value="">Type…</option>
                        <option value="physical">Physical</option>
                        <option value="digital">Digital</option>
                      </select>
                    ) : <span className="col-span-2" />}
                    <Input disabled={readOnly} className="col-span-4 h-9 text-sm" placeholder="Note" value={c.note || ''} onChange={(e) => setChecks(checks.map((x, j) => (j === i ? { ...x, note: e.target.value } : x)))} />
                    {!readOnly && (
                      <button type="button" className="col-span-1 p-1 text-gray-400 hover:text-red-600" onClick={() => setChecks(checks.filter((_, j) => j !== i))} title="Remove check">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
                {!readOnly && (
                  <div className="flex flex-wrap gap-1.5 pt-2">
                    {meta.checkTypes.map((t) => (
                      <Button key={t.key} type="button" variant="outline" size="sm" className="h-7 text-xs" onClick={() => addCheck(t.key)}>
                        <Plus className="w-3 h-3 mr-1" /> {t.label}
                      </Button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {tab === 'extras' && (
              <div className="space-y-2">
                <p className="text-xs text-gray-500">Client-specific information (Invoice no, Ticket ID, Vendor…).</p>
                {Object.entries(extras).map(([k, v]) => (
                  <div key={k} className="grid grid-cols-12 gap-2 items-center">
                    <span className="col-span-4 text-sm text-gray-700 truncate" title={k}>{k}</span>
                    <Input disabled={readOnly} className="col-span-7 h-9 text-sm" value={v} onChange={(e) => set('extras', { ...extras, [k]: e.target.value })} />
                    {!readOnly && (
                      <button type="button" className="col-span-1 p-1 text-gray-400 hover:text-red-600" onClick={() => { const n = { ...extras }; delete n[k]; set('extras', n); }} title="Remove">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
                {!readOnly && (
                  <div className="grid grid-cols-12 gap-2 items-center pt-2">
                    <Input className="col-span-4 h-9 text-sm" placeholder="Field name" value={newExtra.key} onChange={(e) => setNewExtra({ ...newExtra, key: e.target.value })} />
                    <Input className="col-span-7 h-9 text-sm" placeholder="Value" value={newExtra.value} onChange={(e) => setNewExtra({ ...newExtra, value: e.target.value })} />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="col-span-1 h-9"
                      disabled={!newExtra.key.trim()}
                      onClick={() => { set('extras', { ...extras, [newExtra.key.trim()]: newExtra.value }); setNewExtra({ key: '', value: '' }); }}
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </div>
            )}

            {tab === 'history' && original?.history && (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {[...original.history].reverse().map((h, i) => (
                  <div key={i} className="text-sm border rounded-md p-2">
                    <p className="text-gray-800">
                      <strong className="capitalize">{h.action}</strong> by {h.byName || 'someone'} · <span className="text-gray-500">{new Date(h.at).toLocaleString('en-IN')}</span>
                    </p>
                    {h.changes?.length > 0 && (
                      <ul className="mt-1 text-xs text-gray-600 space-y-0.5">
                        {h.changes.slice(0, 20).map((c, j) => (
                          <li key={j}><span className="font-medium">{meta.fields.find((f) => f.key === c.field)?.label || c.field}</span>: {String(c.from ?? '—')} → {String(c.to ?? '—')}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            )}

            {error && (
              <p className="text-sm text-red-600 flex items-center gap-1"><AlertCircle className="w-4 h-4" /> {error}</p>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button type="button" variant="outline" onClick={onClose} disabled={saving}>{readOnly ? 'Close' : 'Cancel'}</Button>
              {!readOnly && (!caseId || editingDraft) && (
                <Button type="button" variant="outline" onClick={() => save('draft')} disabled={saving}>
                  {saving ? 'Saving…' : editingDraft ? 'Save draft' : 'Save as draft'}
                </Button>
              )}
              {!readOnly && (
                <Button type="button" onClick={() => save(caseId && !editingDraft ? 'save' : 'publish')} disabled={saving}>
                  {saving ? 'Saving…' : !caseId ? 'Add case' : editingDraft ? 'Add to tracker' : 'Save changes'}
                </Button>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default CaseFormDialog;
