import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowDown, ArrowUp, Columns3, Copy, Loader2, Pencil, Trash2 } from 'lucide-react';
import {
  TrackerCase,
  TrackerMeta,
  STATUS_STYLE,
  CHECK_STYLE,
  TAT_STYLE,
  checkLabel,
  fmtDate,
  fmtMonth,
} from './trackerTypes';

// The tracker table: every row can be edited inline (status, allocated to,
// billing), opened, duplicated or removed. Columns are chosen by the user.

export interface TableProps {
  meta: TrackerMeta;
  rows: TrackerCase[];
  loading: boolean;
  total: number;
  page: number;
  limit: number;
  sortBy: string;
  sortDir: 'asc' | 'desc';
  selected: string[];
  onSelect: (ids: string[]) => void;
  onSort: (field: string) => void;
  onPage: (page: number) => void;
  onLimit: (limit: number) => void;
  onOpen: (c: TrackerCase) => void;
  onDuplicate: (c: TrackerCase) => void;
  onDelete: (c: TrackerCase) => void;
  onInlineSave: (c: TrackerCase, patch: Record<string, any>) => Promise<void>;
}

interface Column {
  key: string;
  label: string;
  sortKey?: string;
  render: (c: TrackerCase) => React.ReactNode;
  width?: string;
}

const DEFAULT_COLUMNS = ['bgvId', 'name', 'companyName', 'status', 'checks', 'startDate', 'endDate', 'agingDays', 'tatStatus', 'insuffRemark', 'allocatedTo', 'billing'];
const CLIENT_DEFAULT = ['bgvId', 'name', 'status', 'checks', 'startDate', 'endDate', 'agingDays', 'tatStatus', 'insuffRemark', 'reportDate'];
const STORAGE_KEY = (client: boolean) => `tracker-columns:${client ? 'client' : 'staff'}`;

const loadColumns = (client: boolean): string[] | null => {
  try { const v = localStorage.getItem(STORAGE_KEY(client)); return v ? JSON.parse(v) : null; } catch { return null; }
};

/** Inline text input that saves on blur / Enter. */
const InlineText: React.FC<{ value: string; options?: string[]; onSave: (v: string) => void; disabled?: boolean }> = ({ value, options, onSave, disabled }) => {
  const [v, setV] = useState(value || '');
  useEffect(() => setV(value || ''), [value]);
  const id = useRef(`dl-${Math.random().toString(36).slice(2)}`).current;
  return (
    <>
      <input
        disabled={disabled}
        value={v}
        list={options ? id : undefined}
        onChange={(e) => setV(e.target.value)}
        onBlur={() => { if (v !== (value || '')) onSave(v); }}
        onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
        className="w-full min-w-[90px] h-7 px-1.5 border border-transparent hover:border-gray-300 focus:border-brand-green rounded text-sm bg-transparent"
      />
      {options && <datalist id={id}>{options.map((o) => <option key={o} value={o} />)}</datalist>}
    </>
  );
};

const TrackerTable: React.FC<TableProps> = (p) => {
  const { meta, rows } = p;
  const [visible, setVisible] = useState<string[]>(() => loadColumns(meta.isClient) || (meta.isClient ? CLIENT_DEFAULT : DEFAULT_COLUMNS));
  const [pickerOpen, setPickerOpen] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY(meta.isClient), JSON.stringify(visible)); } catch { /* ignore */ }
  }, [visible, meta.isClient]);
  useEffect(() => {
    const close = (e: MouseEvent) => { if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) setPickerOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const inline = async (c: TrackerCase, patch: Record<string, any>) => {
    setSavingId(c._id);
    try { await p.onInlineSave(c, patch); } finally { setSavingId(null); }
  };
  const canEdit = meta.canEdit;

  const allColumns: Column[] = useMemo(() => {
    const cols: Column[] = [];
    const add = (col: Column) => cols.push(col);
    if (!meta.isClient) add({ key: 'companyName', label: 'Company', sortKey: 'companyName', render: (c) => <span className="whitespace-nowrap">{c.companyName}</span> });
    for (const f of meta.fields) {
      if (f.key === 'status') {
        add({
          key: 'status', label: 'Status', sortKey: 'status',
          render: (c) => canEdit ? (
            <select
              value={c.status}
              onClick={(e) => e.stopPropagation()}
              onChange={(e) => inline(c, { status: e.target.value })}
              className={`h-7 px-1.5 rounded border text-xs font-medium ${STATUS_STYLE[c.status || ''] || 'bg-white'}`}
            >
              {meta.statuses.map((s) => <option key={s}>{s}</option>)}
            </select>
          ) : <span className={`inline-block px-2 py-0.5 rounded border text-xs font-medium ${STATUS_STYLE[c.status || ''] || ''}`}>{c.status}</span>,
        });
        continue;
      }
      if (f.key === 'billing') {
        add({
          key: 'billing', label: 'Billing',
          render: (c) => canEdit ? (
            <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
              <select value={c.billingStatus || 'Pending'} onChange={(e) => inline(c, { billingStatus: e.target.value, ...(e.target.value === 'Pending' ? { billedMonth: '' } : {}) })} className="h-7 px-1 rounded border border-gray-200 text-xs bg-white">
                {meta.billingStatuses.map((s) => <option key={s}>{s}</option>)}
              </select>
              {c.billingStatus === 'Billed' && (
                <input type="month" value={c.billedMonth || ''} onChange={(e) => inline(c, { billedMonth: e.target.value })} className="h-7 px-1 rounded border border-gray-200 text-xs w-32" />
              )}
            </div>
          ) : <span className="text-xs">{c.billingStatus === 'Billed' ? `Billed ${fmtMonth(c.billedMonth)}` : c.billingStatus}</span>,
        });
        continue;
      }
      if (f.key === 'allocatedTo' || f.key === 'initiatorName') {
        add({
          key: f.key, label: f.label,
          render: (c) => canEdit
            ? <div onClick={(e) => e.stopPropagation()}><InlineText value={c[f.key]} options={f.key === 'allocatedTo' ? meta.options.allocated : meta.options.initiators} onSave={(v) => inline(c, { [f.key]: v })} /></div>
            : c[f.key],
        });
        continue;
      }
      if (f.key === 'tatStatus') {
        add({ key: 'tatStatus', label: 'TAT', render: (c) => <span className={`text-xs font-medium whitespace-nowrap ${TAT_STYLE[c.tatStatus || ''] || ''}`}>{c.tatStatus}</span> });
        continue;
      }
      if (f.key === 'agingDays') {
        add({ key: 'agingDays', label: 'Aging', sortKey: 'agingDays', render: (c) => (c.agingDays != null ? <span className={c.isOpen && c.agingDays > 30 ? 'text-red-700 font-medium' : ''}>{c.agingDays}d</span> : '') });
        continue;
      }
      if (f.key === 'insuffRemark') {
        add({
          key: 'insuffRemark', label: 'Insufficiency',
          render: (c) => c.insuffRemark ? (
            <div className="max-w-[260px]">
              <p className="truncate text-xs" title={c.insuffRemark}>{c.insuffRemark}</p>
              {c.insuffOpen && <p className="text-[11px] text-amber-700">Open {c.insuffDays}d</p>}
            </div>
          ) : '',
        });
        continue;
      }
      const sortable = ['startDate', 'endDate', 'reportDate', 'name', 'bgvId', 'initiationMonth', 'insuffRaiseDate'].includes(f.key);
      add({
        key: f.key,
        label: f.key === 'endDate' ? 'Due' : f.label,
        sortKey: sortable ? f.key : undefined,
        render: (c) => {
          const v = c[f.key];
          if (f.type === 'date') return <span className="whitespace-nowrap">{fmtDate(v)}</span>;
          if (f.type === 'month') return <span className="whitespace-nowrap">{fmtMonth(v)}</span>;
          if (f.type === 'longtext') return <p className="max-w-[260px] truncate text-xs" title={v}>{v}</p>;
          if (f.key === 'name') return <span className="font-medium text-gray-900 whitespace-nowrap">{v}</span>;
          if (f.key === 'bgvId') return <span className="font-mono text-xs whitespace-nowrap">{v}</span>;
          return v ?? '';
        },
      });
    }
    if (meta.showChecks) {
      add({
        key: 'checks', label: 'Checks',
        render: (c) => (
          <div className="flex flex-wrap gap-1 min-w-[150px] max-w-[260px]">
            {(c.checks || []).map((k, i) => (
              <span key={i} title={`${meta.checkTypes.find((t) => t.key === k.type)?.label}: ${k.status}${k.note ? ` — ${k.note}` : ''}`} className={`px-1.5 py-0.5 rounded text-[11px] font-medium ${CHECK_STYLE[k.status] || 'bg-gray-100'}`}>
                {checkLabel(meta, k)}
              </span>
            ))}
          </div>
        ),
      });
    }
    if (meta.showExtras) {
      const keys = new Set<string>();
      rows.forEach((r) => Object.keys(r.extras || {}).forEach((k) => keys.add(k)));
      Array.from(keys).sort().forEach((k) => add({ key: `extra:${k}`, label: k, render: (c) => <span className="text-xs">{(c.extras || {})[k]}</span> }));
    }
    return cols;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meta, rows, canEdit]);

  const columns = visible.map((k) => allColumns.find((c) => c.key === k)).filter(Boolean) as Column[];
  const allIds = rows.map((r) => r._id);
  const allChecked = allIds.length > 0 && allIds.every((id) => p.selected.includes(id));
  const pages = Math.max(1, Math.ceil(p.total / p.limit));

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm text-gray-600">
        <span>{p.total.toLocaleString('en-IN')} case{p.total === 1 ? '' : 's'}</span>
        <div ref={pickerRef} className="relative">
          <Button type="button" variant="outline" size="sm" onClick={() => setPickerOpen((v) => !v)}>
            <Columns3 className="w-4 h-4 mr-1" /> Columns
          </Button>
          {pickerOpen && (
            <div className="absolute right-0 z-30 mt-1 w-72 max-h-96 overflow-y-auto rounded-md border bg-white shadow-lg p-2">
              <div className="flex justify-between px-1 pb-2 border-b mb-1 text-xs">
                <button type="button" className="text-brand-green" onClick={() => setVisible(allColumns.map((c) => c.key))}>Show all</button>
                <button type="button" className="text-gray-500" onClick={() => setVisible(meta.isClient ? CLIENT_DEFAULT : DEFAULT_COLUMNS)}>Reset</button>
              </div>
              {allColumns.map((c) => (
                <label key={c.key} className="flex items-center gap-2 px-1 py-1 text-sm cursor-pointer hover:bg-gray-50 rounded">
                  <input
                    type="checkbox"
                    checked={visible.includes(c.key)}
                    onChange={(e) => setVisible(e.target.checked ? [...visible, c.key] : visible.filter((k) => k !== c.key))}
                  />
                  {c.label}
                </label>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="overflow-x-auto border rounded-lg bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              {canEdit && (
                <th className="w-8 px-2 py-2">
                  <input type="checkbox" checked={allChecked} onChange={(e) => p.onSelect(e.target.checked ? Array.from(new Set([...p.selected, ...allIds])) : p.selected.filter((id) => !allIds.includes(id)))} />
                </th>
              )}
              {columns.map((c) => (
                <th key={c.key} className="px-2 py-2 text-left text-xs font-semibold text-gray-600 whitespace-nowrap">
                  {c.sortKey ? (
                    <button type="button" className="flex items-center gap-1 hover:text-gray-900" onClick={() => p.onSort(c.sortKey!)}>
                      {c.label}
                      {p.sortBy === c.sortKey && (p.sortDir === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />)}
                    </button>
                  ) : c.label}
                </th>
              ))}
              <th className="px-2 py-2 text-right text-xs font-semibold text-gray-600">Actions</th>
            </tr>
          </thead>
          <tbody>
            {p.loading && rows.length === 0 && (
              <tr><td colSpan={columns.length + 2} className="py-10 text-center text-gray-400"><Loader2 className="w-5 h-5 animate-spin mx-auto" /></td></tr>
            )}
            {!p.loading && rows.length === 0 && (
              <tr><td colSpan={columns.length + 2} className="py-10 text-center text-gray-500">No cases match these filters.</td></tr>
            )}
            {rows.map((c) => (
              <tr key={c._id} onClick={() => p.onOpen(c)} className={`border-b last:border-b-0 hover:bg-gray-50 cursor-pointer ${p.selected.includes(c._id) ? 'bg-brand-green-50' : ''} ${p.loading ? 'opacity-60' : ''}`}>
                {canEdit && (
                  <td className="px-2 py-1.5" onClick={(e) => e.stopPropagation()}>
                    <input type="checkbox" checked={p.selected.includes(c._id)} onChange={(e) => p.onSelect(e.target.checked ? [...p.selected, c._id] : p.selected.filter((id) => id !== c._id))} />
                  </td>
                )}
                {columns.map((col) => <td key={col.key} className="px-2 py-1.5 align-middle">{col.render(c)}</td>)}
                <td className="px-2 py-1.5 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                  {savingId === c._id && <Loader2 className="w-3.5 h-3.5 animate-spin inline mr-1 text-gray-400" />}
                  <button type="button" className="p-1 text-gray-400 hover:text-brand-green" title={canEdit ? 'Edit' : 'View'} onClick={() => p.onOpen(c)}><Pencil className="w-4 h-4" /></button>
                  {canEdit && (
                    <>
                      <button type="button" className="p-1 text-gray-400 hover:text-blue-600" title="Duplicate as a new case" onClick={() => p.onDuplicate(c)}><Copy className="w-4 h-4" /></button>
                      <button type="button" className="p-1 text-gray-400 hover:text-red-600" title="Remove" onClick={() => p.onDelete(c)}><Trash2 className="w-4 h-4" /></button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2 text-gray-600">
          Rows per page
          <select value={p.limit} onChange={(e) => p.onLimit(Number(e.target.value))} className="h-8 px-1 border border-gray-300 rounded text-sm bg-white">
            {[25, 50, 100, 200].map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" size="sm" disabled={p.page <= 1} onClick={() => p.onPage(p.page - 1)}>Previous</Button>
          <span className="text-gray-600">Page {p.page} of {pages}</span>
          <Button type="button" variant="outline" size="sm" disabled={p.page >= pages} onClick={() => p.onPage(p.page + 1)}>Next</Button>
        </div>
      </div>
    </div>
  );
};

export default TrackerTable;
