import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertCircle, CheckCircle2, Plus, Trash2 } from 'lucide-react';
import { apiService } from '@/services/api';
import SearchPick from './SearchPick';
import { TrackerCustomField, TrackerMeta } from './trackerTypes';

// Per-company tracker settings: whether its logins can open the tracker at
// all, default TAT, the company's own fields, its remembered Excel format,
// and which fields its login can see (nothing ticked = everything). The
// tracker can also be turned on or off for every company at once.

interface Props {
  meta: TrackerMeta;
  open: boolean;
  initialCustomerId?: string;
  onClose: () => void;
  onSaved: () => void;
}

const SPECIAL_LABELS: Record<string, string> = { checks: 'Checks and their statuses', extras: 'Extra (client-specific) fields' };

const ClientViewDialog: React.FC<Props> = ({ meta, open, initialCustomerId, onClose, onSaved }) => {
  const [customerId, setCustomerId] = useState('');
  const [tat, setTat] = useState(15);
  const [visible, setVisible] = useState<string[]>([]);
  const [fields, setFields] = useState<TrackerCustomField[]>([]);
  const [newField, setNewField] = useState<TrackerCustomField>({ label: '', type: 'text' });
  const [resetLayout, setResetLayout] = useState(false);
  const [enabled, setEnabled] = useState(true);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  // Reset only when the dialog opens. Saving reloads meta.customers, which must
  // keep the chosen company and the "saved" message on screen.
  useEffect(() => {
    if (!open) return;
    setMessage(null);
    setCustomerId(initialCustomerId || meta.customers[0]?._id || '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialCustomerId]);

  useEffect(() => {
    const c = meta.customers.find((x) => x._id === customerId);
    setTat(c?.trackerTatDays || 15);
    setVisible(c?.trackerVisibleFields || []);
    setFields(c?.trackerCustomFields || []);
    setNewField({ label: '', type: 'text' });
    setResetLayout(false);
    setEnabled(c?.trackerEnabled !== false);
  }, [customerId, meta.customers]);
  const company = meta.customers.find((x) => x._id === customerId);

  const labelFor = (key: string) => SPECIAL_LABELS[key] || meta.fields.find((f) => f.key === key)?.label || key.replace(/^extra:/, '');
  const groups = meta.groups.map((g) => ({
    ...g,
    keys: meta.clientVisibleCandidates.filter((k) => meta.fields.find((f) => f.key === k)?.group === g.key),
  })).filter((g) => g.keys.length);
  // With its own fields listed one by one, "all extra fields" is only for the rest.
  const special = meta.clientVisibleCandidates.filter((k) => SPECIAL_LABELS[k]);

  const save = async () => {
    setBusy(true); setMessage(null);
    try {
      const labels = new Set(fields.map((f) => `extra:${f.label}`));
      const r: any = await apiService.saveTrackerSettings(customerId, {
        trackerTatDays: tat,
        trackerCustomFields: fields,
        // Drop visibility ticks of fields that were removed.
        trackerVisibleFields: visible.filter((k) => !k.startsWith('extra:') || labels.has(k)),
        ...(resetLayout ? { resetLayout: true } : {}),
        trackerEnabled: enabled,
      });
      setMessage({ ok: true, text: r.message || 'Saved' });
      onSaved();
    } catch (e: any) {
      setMessage({ ok: false, text: e.message || 'Could not save' });
    } finally {
      setBusy(false);
    }
  };

  const shownCount = meta.customers.filter((c) => c.trackerEnabled !== false).length;
  const setForAll = async (on: boolean) => {
    if (!window.confirm(`${on ? 'Show' : 'Hide'} the BGV tracker for all ${meta.customers.length} companies? Their logins ${on ? 'will see' : 'will no longer see'} it.`)) return;
    setBulkBusy(true); setMessage(null);
    try {
      const r: any = await apiService.setTrackerAccessForAll(on);
      setMessage({ ok: true, text: r.message || 'Saved' });
      onSaved();
    } catch (e: any) {
      setMessage({ ok: false, text: e.message || 'Could not change it for all companies' });
    } finally {
      setBulkBusy(false);
    }
  };

  const toggle = (k: string) => setVisible(visible.includes(k) ? visible.filter((x) => x !== k) : [...visible, k]);
  const addField = () => {
    const label = newField.label.replace(/[.$]/g, '_').trim();
    if (!label) return;
    if (fields.some((f) => f.label.toLowerCase() === label.toLowerCase())) {
      setMessage({ ok: false, text: `"${label}" is already a field of this company` });
      return;
    }
    setFields([...fields, { ...newField, label }]);
    setNewField({ label: '', type: 'text' });
    setMessage(null);
  };
  const fieldKeys = fields.map((f) => `extra:${f.label}`);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !busy && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Company tracker settings</DialogTitle></DialogHeader>

        <div className="flex flex-wrap items-center gap-2 rounded-md border bg-gray-50 p-2.5 text-sm">
          <span className="flex-1 min-w-[220px] text-gray-700">
            <strong>All companies:</strong> the BGV tracker is shown to {shownCount} of {meta.customers.length} companies’ logins
          </span>
          <Button type="button" size="sm" variant="outline" className="h-8 bg-white" disabled={bulkBusy || shownCount === meta.customers.length} onClick={() => setForAll(true)}>Show to all</Button>
          <Button type="button" size="sm" variant="outline" className="h-8 bg-white text-red-600 border-red-200" disabled={bulkBusy || shownCount === 0} onClick={() => setForAll(false)}>Hide from all</Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-2">
            <p className="text-xs text-gray-500 mb-1">Company</p>
            <SearchPick
              value={customerId}
              onChange={setCustomerId}
              placeholder="Choose a company…"
              options={meta.customers.map((c) => ({ value: c._id, label: c.companyName }))}
            />
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">Default TAT (days)</p>
            <input type="number" min={1} max={365} value={tat} onChange={(e) => setTat(Number(e.target.value) || 15)} className="h-9 w-full px-2 border border-gray-300 rounded-md text-sm" />
          </div>
        </div>
        <p className="text-xs text-gray-500 -mt-2">
          Due date = start date + TAT, unless a case has its own due date or TAT. Saving moves the due date of every case that follows the company TAT.
        </p>

        <label className={`flex items-start gap-2 rounded-md border p-2.5 cursor-pointer ${enabled ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-gray-50'}`}>
          <input type="checkbox" className="mt-1" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
          <span className="text-sm">
            <strong>Show the BGV tracker to {company?.companyName || 'this company'}’s logins</strong>
            <span className="block text-xs text-gray-600">
              {enabled
                ? 'They see their own cases (read-only), limited to the fields ticked below.'
                : 'Hidden: the BGV Tracker menu does not appear for them and they cannot open it.'}
            </span>
          </span>
        </label>

        <div className="space-y-2">
          <p className="text-sm font-medium">This company’s own fields</p>
          <p className="text-xs text-gray-500">
            Columns only this company uses (Cost Center, Ticket ID…). They appear on its cases, in the table and in its export.
            Importing a tab for this company adds new ones automatically.
          </p>
          {fields.length > 0 && (
            <div className="space-y-1.5">
              {fields.map((f, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    value={f.label}
                    onChange={(e) => setFields(fields.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))}
                    className="h-8 flex-1 px-2 border border-gray-300 rounded-md text-sm"
                    title="Renaming only changes the name; values already saved under the old name stay under it"
                  />
                  <select value={f.type} onChange={(e) => setFields(fields.map((x, j) => (j === i ? { ...x, type: e.target.value as TrackerCustomField['type'] } : x)))} className="h-8 px-2 border border-gray-300 rounded-md text-sm bg-white">
                    <option value="text">Text</option>
                    <option value="date">Date</option>
                    <option value="number">Number</option>
                  </select>
                  <button type="button" className="p-1 text-gray-400 hover:text-red-600" title="Remove field (saved values are kept on the cases)" onClick={() => setFields(fields.filter((_, j) => j !== i))}>
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="flex items-center gap-2">
            <input
              value={newField.label}
              onChange={(e) => setNewField({ ...newField, label: e.target.value })}
              onKeyDown={(e) => { if (e.key === 'Enter') addField(); }}
              placeholder="New field name"
              className="h-8 flex-1 px-2 border border-gray-300 rounded-md text-sm"
            />
            <select value={newField.type} onChange={(e) => setNewField({ ...newField, type: e.target.value as TrackerCustomField['type'] })} className="h-8 px-2 border border-gray-300 rounded-md text-sm bg-white">
              <option value="text">Text</option>
              <option value="date">Date</option>
              <option value="number">Number</option>
            </select>
            <Button type="button" variant="outline" size="sm" className="h-8" onClick={addField} disabled={!newField.label.trim()}>
              <Plus className="w-4 h-4 mr-1" /> Add
            </Button>
          </div>
          {company?.hasCustomFormat && (
            <label className="flex items-start gap-2 text-xs text-gray-700 cursor-pointer bg-gray-50 rounded-md p-2">
              <input type="checkbox" className="mt-0.5" checked={resetLayout} onChange={(e) => setResetLayout(e.target.checked)} />
              <span>
                This company’s Excel export uses its own column format (remembered from an import).
                Tick to go back to the standard tracker columns.
              </span>
            </label>
          )}
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">What this company’s login can see</p>
            <div className="text-xs space-x-3">
              <button type="button" className="text-brand-green" onClick={() => setVisible([...meta.clientVisibleCandidates, ...fieldKeys])}>Tick all</button>
              <button type="button" className="text-gray-500" onClick={() => setVisible([])}>Clear (show everything)</button>
            </div>
          </div>
          <p className={`text-xs ${visible.length ? 'text-gray-600' : 'text-green-700'}`}>
            {visible.length
              ? `Only the ${visible.length} ticked field(s) are shown, plus BGV ID and candidate name.`
              : 'Nothing ticked: the company sees every field.'}
          </p>
          {groups.map((g) => (
            <div key={g.key}>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">{g.label}</p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-1">
                {g.keys.map((k) => (
                  <label key={k} className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="checkbox" checked={visible.includes(k)} onChange={() => toggle(k)} /> {labelFor(k)}
                  </label>
                ))}
              </div>
            </div>
          ))}
          {fields.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">{company?.companyName} fields</p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-1">
                {fieldKeys.map((k) => (
                  <label key={k} className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="checkbox" checked={visible.includes(k) || visible.includes('extras')} disabled={visible.includes('extras')} onChange={() => toggle(k)} /> {labelFor(k)}
                  </label>
                ))}
              </div>
            </div>
          )}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">Other</p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1">
              {special.map((k) => (
                <label key={k} className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={visible.includes(k)} onChange={() => toggle(k)} /> {labelFor(k)}
                </label>
              ))}
            </div>
          </div>
        </div>

        {message && (
          <p className={`text-sm flex items-center gap-1 ${message.ok ? 'text-green-700' : 'text-red-600'}`}>
            {message.ok ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />} {message.text}
          </p>
        )}
        <div className="flex justify-end gap-2 pt-2 border-t">
          <Button type="button" variant="outline" onClick={onClose} disabled={busy}>Close</Button>
          <Button type="button" onClick={save} disabled={busy || !customerId}>{busy ? 'Saving…' : 'Save settings'}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ClientViewDialog;
