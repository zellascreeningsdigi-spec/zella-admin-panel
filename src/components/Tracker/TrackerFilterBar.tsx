import React, { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import MultiPick from './MultiPick';
import { TrackerFilters, TrackerMeta, fmtMonth } from './trackerTypes';

// Filters for the tracker. The common ones are always visible; the rest sit
// under "More filters". The same filters drive the table, analytics and export.

interface Props {
  meta: TrackerMeta;
  filters: TrackerFilters;
  onChange: (f: TrackerFilters) => void;
}

const countActive = (f: TrackerFilters) =>
  Object.entries(f).filter(([, v]) => (Array.isArray(v) ? v.length > 0 : v !== undefined && v !== '' && v !== false)).length;

const DateRange: React.FC<{ label: string; from?: string; to?: string; onChange: (from?: string, to?: string) => void }> = ({ label, from, to, onChange }) => (
  <div>
    <p className="text-xs text-gray-500 mb-1">{label}</p>
    <div className="flex items-center gap-1">
      <input type="date" value={from || ''} onChange={(e) => onChange(e.target.value || undefined, to)} className="h-9 px-2 border border-gray-300 rounded-md text-sm w-full" />
      <span className="text-gray-400 text-xs">to</span>
      <input type="date" value={to || ''} onChange={(e) => onChange(from, e.target.value || undefined)} className="h-9 px-2 border border-gray-300 rounded-md text-sm w-full" />
    </div>
  </div>
);

const TrackerFilterBar: React.FC<Props> = ({ meta, filters, onChange }) => {
  const [q, setQ] = useState(filters.q || '');
  const [more, setMore] = useState(false);
  const set = (patch: Partial<TrackerFilters>) => onChange({ ...filters, ...patch });

  // Search as you type, without a request per keystroke.
  useEffect(() => {
    const t = setTimeout(() => { if ((filters.q || '') !== q) set({ q: q || undefined }); }, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);
  useEffect(() => { setQ(filters.q || ''); }, [filters.q]);

  const active = countActive(filters);
  const selectBase = 'h-9 px-2 border border-gray-300 rounded-md text-sm bg-white';
  const select = `${selectBase} w-full`;
  const opt = (arr: string[]) => arr.map((v) => ({ value: v, label: v }));
  // Own fields of the companies in view, for "field contains…".
  const fieldsFor = (ids: string[]) => Array.from(new Set(
    (meta.isClient ? meta.customers : meta.customers.filter((c) => ids.includes(c._id)))
      .flatMap((c) => (c.trackerCustomFields || []).map((f) => f.label)),
  ));
  const companyFields = fieldsFor(filters.customerIds || []);
  const [extraValue, setExtraValue] = useState(filters.extraValue || '');
  useEffect(() => { setExtraValue(filters.extraValue || ''); }, [filters.extraValue]);
  useEffect(() => {
    const t = setTimeout(() => { if ((filters.extraValue || '') !== extraValue) set({ extraValue: extraValue || undefined }); }, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [extraValue]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, BGV ID, employee code, PAN, phone…" className="pl-9 h-9" />
        </div>
        {!meta.isClient && (
          <MultiPick
            label="Company"
            className="w-48"
            options={meta.customers.map((c) => ({ value: c._id, label: c.companyName }))}
            selected={filters.customerIds || []}
            onChange={(customerIds) => set({
              customerIds,
              // A field filter of a company no longer in view goes with it.
              ...(filters.extraKey && !fieldsFor(customerIds).includes(filters.extraKey) ? { extraKey: undefined, extraValue: undefined } : {}),
            })}
          />
        )}
        <MultiPick label="Status" className="w-40" options={opt(meta.statuses)} selected={filters.status || []} onChange={(status) => set({ status })} />
        <select className={`${selectBase} w-36`} value={filters.open || ''} onChange={(e) => set({ open: e.target.value as TrackerFilters['open'] })}>
          <option value="">Open + closed</option>
          <option value="open">Open only</option>
          <option value="closed">Closed only</option>
        </select>
        <MultiPick label="TAT" className="w-36" options={opt(['In TAT', 'Due soon', 'Out of TAT'])} selected={filters.tat || []} onChange={(tat) => set({ tat })} />
        <Button type="button" variant="outline" size="sm" className="h-9" onClick={() => setMore((v) => !v)}>
          <SlidersHorizontal className="w-4 h-4 mr-1" /> More filters
        </Button>
        {active > 0 && (
          <Button type="button" variant="ghost" size="sm" className="h-9 text-gray-600" onClick={() => { setQ(''); onChange({}); }}>
            <X className="w-4 h-4 mr-1" /> Clear ({active})
          </Button>
        )}
      </div>

      {more && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 p-3 rounded-lg border bg-gray-50">
          {meta.showChecks && (
            <>
              <div>
                <p className="text-xs text-gray-500 mb-1">Check type</p>
                <MultiPick label="Any check" options={meta.checkTypes.map((c) => ({ value: c.key, label: c.label }))} selected={filters.checkType || []} onChange={(checkType) => set({ checkType })} />
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Check status</p>
                <MultiPick label="Any status" options={opt(meta.checkStatuses)} selected={filters.checkStatus || []} onChange={(checkStatus) => set({ checkStatus })} />
              </div>
            </>
          )}
          <div>
            <p className="text-xs text-gray-500 mb-1">Aging (open cases)</p>
            <select className={select} value={filters.aging || ''} onChange={(e) => set({ aging: e.target.value || undefined })}>
              <option value="">Any age</option>
              {meta.agingBuckets.map((b) => <option key={b.key} value={b.key}>{b.label}</option>)}
            </select>
          </div>
          <div className="flex flex-col justify-end gap-1.5 text-sm">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={!!filters.insuffOpen} onChange={(e) => set({ insuffOpen: e.target.checked || undefined })} /> Insufficiency open
            </label>
            {meta.showChecks && (
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={!!filters.discrepancy} onChange={(e) => set({ discrepancy: e.target.checked || undefined })} /> Has Red / Amber check
              </label>
            )}
          </div>
          {!meta.isClient && (
            <>
              <div>
                <p className="text-xs text-gray-500 mb-1">Initiator</p>
                <MultiPick label="Anyone" options={opt(meta.options.initiators)} selected={filters.initiator || []} onChange={(initiator) => set({ initiator })} />
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Allocated to</p>
                <MultiPick label="Anyone" options={opt(meta.options.allocated)} selected={filters.allocatedTo || []} onChange={(allocatedTo) => set({ allocatedTo })} />
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Billing</p>
                <select className={select} value={filters.billing || ''} onChange={(e) => set({ billing: e.target.value as TrackerFilters['billing'] })}>
                  <option value="">Any</option>
                  <option value="Pending">Pending</option>
                  <option value="Billed">Billed</option>
                </select>
              </div>
            </>
          )}
          {meta.fields.some((f) => f.key === 'reportColour') && (
            <div>
              <p className="text-xs text-gray-500 mb-1">Final report colour</p>
              <MultiPick label="Any colour" options={opt(['Green', 'Amber', 'Red'])} selected={filters.reportColour || []} onChange={(reportColour) => set({ reportColour })} />
            </div>
          )}
          {companyFields.length > 0 && (
            <div>
              <p className="text-xs text-gray-500 mb-1">Company field</p>
              <div className="flex gap-1">
                <select className={`${selectBase} w-1/2`} value={filters.extraKey || ''} onChange={(e) => set({ extraKey: e.target.value || undefined, ...(e.target.value ? {} : { extraValue: undefined }) })}>
                  <option value="">Choose…</option>
                  {companyFields.map((f) => <option key={f} value={f}>{f}</option>)}
                </select>
                <input
                  disabled={!filters.extraKey}
                  value={extraValue}
                  onChange={(e) => setExtraValue(e.target.value)}
                  placeholder={filters.extraKey ? 'contains… (empty = filled)' : ''}
                  className="h-9 w-1/2 px-2 border border-gray-300 rounded-md text-sm"
                />
              </div>
            </div>
          )}
          <div>
            <p className="text-xs text-gray-500 mb-1">Initiation month</p>
            <MultiPick label="Any month" options={meta.options.months.map((m) => ({ value: m, label: fmtMonth(m) }))} selected={filters.initiationMonth || []} onChange={(initiationMonth) => set({ initiationMonth })} />
          </div>
          <DateRange label="Start date" from={filters.startFrom} to={filters.startTo} onChange={(startFrom, startTo) => set({ startFrom, startTo })} />
          <DateRange label="Due date" from={filters.dueFrom} to={filters.dueTo} onChange={(dueFrom, dueTo) => set({ dueFrom, dueTo })} />
          <DateRange label="Report date" from={filters.reportFrom} to={filters.reportTo} onChange={(reportFrom, reportTo) => set({ reportFrom, reportTo })} />
        </div>
      )}
    </div>
  );
};

export default TrackerFilterBar;
