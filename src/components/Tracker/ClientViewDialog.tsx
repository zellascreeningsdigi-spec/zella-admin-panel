import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { apiService } from '@/services/api';
import { TrackerMeta } from './trackerTypes';

// Per-company tracker settings: default TAT, and which fields that company's
// login can see. Nothing ticked = they see everything.

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
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    if (!open) return;
    setMessage(null);
    setCustomerId(initialCustomerId || meta.customers[0]?._id || '');
  }, [open, initialCustomerId, meta.customers]);

  useEffect(() => {
    const c = meta.customers.find((x) => x._id === customerId);
    setTat(c?.trackerTatDays || 15);
    setVisible(c?.trackerVisibleFields || []);
  }, [customerId, meta.customers]);

  const labelFor = (key: string) => SPECIAL_LABELS[key] || meta.fields.find((f) => f.key === key)?.label || key;
  const groups = meta.groups.map((g) => ({
    ...g,
    keys: meta.clientVisibleCandidates.filter((k) => meta.fields.find((f) => f.key === k)?.group === g.key),
  })).filter((g) => g.keys.length);
  const special = meta.clientVisibleCandidates.filter((k) => SPECIAL_LABELS[k]);

  const save = async () => {
    setBusy(true); setMessage(null);
    try {
      await apiService.saveTrackerSettings(customerId, { trackerTatDays: tat, trackerVisibleFields: visible });
      setMessage({ ok: true, text: 'Saved' });
      onSaved();
    } catch (e: any) {
      setMessage({ ok: false, text: e.message || 'Could not save' });
    } finally {
      setBusy(false);
    }
  };

  const toggle = (k: string) => setVisible(visible.includes(k) ? visible.filter((x) => x !== k) : [...visible, k]);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !busy && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Company tracker settings</DialogTitle></DialogHeader>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-2">
            <p className="text-xs text-gray-500 mb-1">Company</p>
            <select value={customerId} onChange={(e) => setCustomerId(e.target.value)} className="h-9 w-full px-2 border border-gray-300 rounded-md text-sm bg-white">
              {meta.customers.map((c) => <option key={c._id} value={c._id}>{c.companyName}</option>)}
            </select>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">Default TAT (days)</p>
            <input type="number" min={1} max={365} value={tat} onChange={(e) => setTat(Number(e.target.value) || 15)} className="h-9 w-full px-2 border border-gray-300 rounded-md text-sm" />
          </div>
        </div>
        <p className="text-xs text-gray-500 -mt-2">Due date = start date + TAT, unless a case has its own due date or TAT.</p>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">What this company’s login can see</p>
            <div className="text-xs space-x-3">
              <button type="button" className="text-brand-green" onClick={() => setVisible([...meta.clientVisibleCandidates])}>Tick all</button>
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
