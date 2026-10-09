import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertCircle, Download } from 'lucide-react';
import { apiService } from '@/services/api';
import { TrackerFilters, TrackerMeta, toParams } from './trackerTypes';

// Export one Excel file for the companies you pick: an "All Cases" sheet plus
// one sheet per company. Optionally restricted to the current filters.

interface Props {
  meta: TrackerMeta;
  open: boolean;
  filters: TrackerFilters;
  onClose: () => void;
}

const ExportDialog: React.FC<Props> = ({ meta, open, filters, onClose }) => {
  const [selected, setSelected] = useState<string[]>([]);
  const [useFilters, setUseFilters] = useState(true);
  const [separate, setSeparate] = useState(true);
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) { setSelected(filters.customerIds || []); setError(null); setQuery(''); }
  }, [open, filters.customerIds]);

  const otherFilters = Object.entries(filters).filter(([k, v]) => k !== 'customerIds' && (Array.isArray(v) ? v.length : v)).length;
  const shown = meta.customers.filter((c) => !query || c.companyName.toLowerCase().includes(query.toLowerCase()));

  const download = async () => {
    setError(null); setBusy(true);
    try {
      const base = useFilters ? toParams(filters) : {};
      await apiService.downloadTrackerExport({ ...base, customerIds: selected, separateSheets: separate ? undefined : 'false' });
      onClose();
    } catch (e: any) {
      setError(e.message || 'Export failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !busy && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Export to Excel</DialogTitle></DialogHeader>

        {!meta.isClient && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Companies</p>
              <div className="text-xs space-x-3">
                <button type="button" className="text-brand-green" onClick={() => setSelected(meta.customers.map((c) => c._id))}>Select all</button>
                <button type="button" className="text-gray-500" onClick={() => setSelected([])}>None (= all companies)</button>
              </div>
            </div>
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search companies…" className="w-full h-8 px-2 border border-gray-300 rounded text-sm" />
            <div className="max-h-56 overflow-y-auto border rounded-md p-1">
              {shown.map((c) => (
                <label key={c._id} className="flex items-center gap-2 px-2 py-1 text-sm cursor-pointer hover:bg-gray-50 rounded">
                  <input type="checkbox" checked={selected.includes(c._id)} onChange={(e) => setSelected(e.target.checked ? [...selected, c._id] : selected.filter((x) => x !== c._id))} />
                  {c.companyName}
                </label>
              ))}
            </div>
            <p className="text-xs text-gray-500">{selected.length ? `${selected.length} compan${selected.length === 1 ? 'y' : 'ies'} selected` : 'No company selected — every company is exported'}</p>
          </div>
        )}

        <div className="space-y-2 text-sm">
          <label className="flex items-start gap-2 cursor-pointer">
            <input type="checkbox" className="mt-0.5" checked={useFilters} onChange={(e) => setUseFilters(e.target.checked)} />
            <span>Only cases matching the current filters{otherFilters ? ` (${otherFilters} active)` : ' (none active)'}</span>
          </label>
          {!meta.isClient && (
            <label className="flex items-start gap-2 cursor-pointer">
              <input type="checkbox" className="mt-0.5" checked={separate} onChange={(e) => setSeparate(e.target.checked)} />
              <span>One sheet per company, plus an “All Cases” sheet</span>
            </label>
          )}
        </div>

        {error && <p className="text-sm text-red-600 flex items-center gap-1"><AlertCircle className="w-4 h-4" /> {error}</p>}

        <div className="flex justify-end gap-2 pt-2 border-t">
          <Button type="button" variant="outline" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button type="button" onClick={download} disabled={busy}><Download className="w-4 h-4 mr-1" /> {busy ? 'Preparing…' : 'Download Excel'}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ExportDialog;
