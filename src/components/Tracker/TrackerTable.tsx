import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowDown, ArrowUp, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Columns3, Copy, Loader2, Pencil, Trash2 } from 'lucide-react';
import {
  TrackerCase,
  TrackerMeta,
  STATUS_STYLE,
  CHECK_STYLE,
  COLOUR_STYLE,
  TAT_STYLE,
  TrackerCustomField,
  TrackerCheck,
  TrackerLayoutEntry,
  checkLabel,
  checkTitle,
  fmtDate,
  fmtMonth,
} from './trackerTypes';

// The tracker table: every row can be edited inline (status, allocated to,
// billing), opened, duplicated or removed. Columns are chosen and ordered by
// the user (drag a header, or the arrows in Columns), remembered per browser.
// For one company with its own sheet format, the table can instead show that
// company's columns: its exact headers, in its order, with its own wording.

export interface TableProps {
  meta: TrackerMeta;
  rows: TrackerCase[];
  /** Companies the table is filtered to: their own fields are shown as columns. */
  customerIds?: string[];
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
  /** The company's own columns, when exactly one company with a remembered format is in view. */
  layout?: { companyName: string; columns: TrackerLayoutEntry[] } | null;
}

interface Column {
  key: string;
  label: string;
  sortKey?: string;
  render: (c: TrackerCase, index: number) => React.ReactNode;
  width?: string;
  extra?: boolean;
}

const DEFAULT_COLUMNS = ['bgvId', 'name', 'companyName', 'status', 'checks', 'startDate', 'endDate', 'agingDays', 'tatStatus', 'insuffRemark', 'allocatedTo', 'billing'];
const CLIENT_DEFAULT = ['bgvId', 'name', 'status', 'checks', 'startDate', 'endDate', 'agingDays', 'tatStatus', 'insuffRemark', 'reportDate'];
const STORAGE_KEY = (client: boolean) => `tracker-columns:${client ? 'client' : 'staff'}`;
const HIDDEN_KEY = 'tracker-hidden-company-fields';

const COMPANY_VIEW_KEY = 'tracker-company-columns';
// Room kept under the table box for the page controls (rows per page, paging) and the page padding.
const BELOW_TABLE = 84;
// Header cells stay at the top of the table box while its rows scroll under them.
const HEAD_CELL = 'sticky top-0 z-10 bg-gray-50 shadow-[inset_0_-1px_0_rgb(229,231,235)]';
const DAY = 86400000;
const daysBetween = (from?: string | null, to?: string | Date | null) =>
  from ? Math.max(0, Math.floor((new Date(to || Date.now()).getTime() - new Date(from).getTime()) / DAY)) : null;

/** The sheet's own text for a cell while the value is still what was read from it (same rule as the export). */
const sheetText = (c: TrackerCase, e: TrackerLayoutEntry, current: React.ReactNode, currentText: string): React.ReactNode => {
  const sv = e.key ? c.sheetValues?.[e.key] : undefined;
  if (!sv) return current;
  if (sv.v == null) return currentText === '' ? sv.t : current;
  return currentText.toLowerCase() === String(sv.v).toLowerCase() ? sv.t : current;
};

/** A check as the company writes it: the original cell ("Green-500") while it still holds, else the status. */
const checkText = (k?: TrackerCheck) => {
  if (!k) return '';
  const note = k.note || '';
  return note && note.toLowerCase().startsWith((k.status || '').toLowerCase()) ? note : k.status;
};

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
  // Company fields the user switched off; every other field of the shown company appears by itself.
  const [hiddenFields, setHiddenFields] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem(HIDDEN_KEY) || '[]'); } catch { return []; }
  });
  const [pickerOpen, setPickerOpen] = useState(false);
  const [companyView, setCompanyView] = useState<boolean>(() => {
    try { return localStorage.getItem(COMPANY_VIEW_KEY) !== 'off'; } catch { return true; }
  });
  useEffect(() => {
    try { localStorage.setItem(COMPANY_VIEW_KEY, companyView ? 'on' : 'off'); } catch { /* ignore */ }
  }, [companyView]);
  const [savingId, setSavingId] = useState<string | null>(null);
  const pickerRef = useRef<HTMLDivElement>(null);
  // The table scrolls inside its own box (both ways), so its header can stay
  // in view and its horizontal scrollbar is always on screen.
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScroll, setCanScroll] = useState({ left: false, right: false });
  const measureScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const left = el.scrollLeft > 2;
    const right = el.scrollLeft + el.clientWidth < el.scrollWidth - 2;
    setCanScroll((s) => (s.left === left && s.right === right ? s : { left, right }));
  };
  const scrollColumns = (dir: 1 | -1) => {
    const el = scrollRef.current;
    if (el) el.scrollBy({ left: dir * Math.max(200, el.clientWidth * 0.7), behavior: 'smooth' });
  };
  // The box ends at the bottom of the screen (above the page controls), so
  // its horizontal scrollbar is visible without scrolling the page. What sits
  // above it (filters, notices, the selection bar) changes, so it is measured
  // after every render; a small box falls back to scrolling the page.
  const [boxHeight, setBoxHeight] = useState<number | null>(null);
  const fitBox = () => {
    const el = scrollRef.current;
    if (!el) return;
    const scroller = el.closest('main');
    const topAtRest = el.getBoundingClientRect().top + (scroller?.scrollTop || 0);
    const next = Math.max(320, Math.floor(window.innerHeight - topAtRest - BELOW_TABLE));
    setBoxHeight((h) => (h !== null && Math.abs(h - next) < 4 ? h : next));
  };
  useLayoutEffect(fitBox);
  useEffect(() => {
    window.addEventListener('resize', fitBox);
    return () => window.removeEventListener('resize', fitBox);
  }, []);
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    measureScroll();
    const ro = new ResizeObserver(measureScroll);
    ro.observe(el);
    if (el.firstElementChild) ro.observe(el.firstElementChild);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY(meta.isClient), JSON.stringify(visible)); } catch { /* ignore */ }
  }, [visible, meta.isClient]);
  useEffect(() => {
    try { localStorage.setItem(HIDDEN_KEY, JSON.stringify(hiddenFields)); } catch { /* ignore */ }
  }, [hiddenFields]);

  // Own fields of the companies in view (the filtered ones, or a company login's own).
  const companyFields: TrackerCustomField[] = useMemo(() => {
    const ids = meta.isClient ? meta.customers.map((c) => c._id) : (p.customerIds || []);
    const out = new Map<string, TrackerCustomField>();
    for (const id of ids) {
      for (const f of meta.customers.find((c) => c._id === id)?.trackerCustomFields || []) if (!out.has(f.label)) out.set(f.label, f);
    }
    return Array.from(out.values());
  }, [meta, p.customerIds]);
  const fieldType = useMemo(() => {
    const m = new Map<string, string>();
    meta.customers.forEach((c) => (c.trackerCustomFields || []).forEach((f) => m.set(f.label, f.type)));
    return m;
  }, [meta]);
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
    if (!meta.isClient) add({ key: 'companyName', label: 'Company', sortKey: 'companyName', render: (c) => <span className="whitespace-nowrap">{c.companyName || <span className="text-gray-400 italic">Not chosen</span>}</span> });
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
          if (f.key === 'name') {
            return (
              <span className="font-medium text-gray-900 whitespace-nowrap">
                {v || <span className="text-gray-400 italic font-normal">No name yet</span>}
                {c.isDraft && <span className="ml-1.5 text-[10px] font-semibold px-1 py-0.5 rounded bg-amber-100 text-amber-800 align-middle">DRAFT</span>}
              </span>
            );
          }
          if (f.key === 'bgvId') return <span className="font-mono text-xs whitespace-nowrap">{v}</span>;
          if (f.type === 'colour') {
            return v ? <span className="inline-flex items-center gap-1 text-xs"><span className={`w-2.5 h-2.5 rounded-full ${COLOUR_STYLE[v] || ''}`} />{v}</span> : '';
          }
          return v ?? '';
        },
      });
    }
    if (meta.showChecks) {
      add({
        key: 'checks', label: 'Checks',
        render: (c) => (
          <div className="flex flex-wrap gap-1 min-w-[150px] max-w-[260px]">
            {(c.checks || []).filter((k) => k.status !== 'NA').map((k, i) => (
              <span key={i} title={checkTitle(meta, k)} className={`px-1.5 py-0.5 rounded text-[11px] font-medium ${CHECK_STYLE[k.status] || 'bg-gray-100'}`}>
                {checkLabel(meta, k)}
              </span>
            ))}
          </div>
        ),
      });
    }
    // The company's own fields first (in its order), then any other extra values on these rows.
    const keys: string[] = companyFields.map((f) => f.label);
    const seen = new Set(keys);
    const rest = new Set<string>();
    rows.forEach((r) => Object.keys(r.extras || {}).forEach((k) => { if (!seen.has(k)) rest.add(k); }));
    keys.push(...Array.from(rest).sort());
    keys.forEach((k) => add({
      key: `extra:${k}`,
      label: k,
      extra: true,
      render: (c) => {
        const v = (c.extras || {})[k];
        return <span className="text-xs whitespace-nowrap">{fieldType.get(k) === 'date' ? fmtDate(v) || v : v}</span>;
      },
    }));
    return cols;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meta, rows, canEdit, companyFields, fieldType]);

  // The company's own columns: exact headers, in its order, with its own wording.
  const layoutColumns: Column[] | null = useMemo(() => {
    if (!p.layout?.columns?.length) return null;
    const standard = new Map(allColumns.map((c) => [c.key, c]));
    const checkOf = (c: TrackerCase, e: TrackerLayoutEntry) => (c.checks || []).find((k) => k.type === e.type && (k.n || 1) === (e.n || 1));
    const text = (v: React.ReactNode) => <span className="text-xs whitespace-nowrap">{v}</span>;
    return p.layout.columns.map((e, i): Column => {
      const key = `layout:${i}`;
      const label = e.header;
      switch (e.kind) {
        case 'client':
          return { key, label, render: (c) => text(c.companyName) };
        case 'field': {
          const std = e.field ? standard.get(e.field === 'billing' ? 'billing' : e.field) : undefined;
          const f = meta.fields.find((x) => x.key === e.field);
          return {
            key, label, sortKey: std?.sortKey,
            render: (c, idx) => {
              if (!f) return '';
              // A second column of a field: its own text from the sheet.
              if (e.append) return text(sheetText(c, e, '', ''));
              const raw = c[f.key];
              const shownText = f.type === 'date' ? fmtDate(raw) : f.type === 'month' ? fmtMonth(raw) : String(raw ?? '');
              // Inline-editable fields keep their editor; everything else shows the company's wording.
              if (std && ['status', 'allocatedTo', 'billing'].includes(f.key) && canEdit) {
                const sheet = sheetText(c, e, null, shownText);
                return sheet === null ? std.render(c, idx) : <span title={`Tracker value: ${shownText}`}>{std.render(c, idx)}<span className="block text-[10px] text-gray-500">{sheet}</span></span>;
              }
              return text(sheetText(c, e, std ? std.render(c, idx) : shownText, shownText));
            },
          };
        }
        case 'check':
          return {
            key, label,
            render: (c) => {
              const k = checkOf(c, e);
              if (!k) return '';
              return <span title={checkTitle(meta, k)} className={`px-1.5 py-0.5 rounded text-[11px] font-medium whitespace-nowrap ${CHECK_STYLE[k.status] || 'bg-gray-100'}`}>{checkText(k)}</span>;
            },
          };
        case 'checkAll':
          return { key, label, render: (c) => text((c.checks || []).filter((k) => k.type === e.type).map(checkText).join(' / ')) };
        case 'checkDate':
          return {
            key, label,
            render: (c) => {
              const k = checkOf(c, e);
              const d = k?.status === 'NA' ? '' : fmtDate(k?.completedDate);
              return text(sheetText(c, e, d, d));
            },
          };
        case 'insuffCycle':
          return { key, label, render: (c) => text(fmtDate((c.insuffCycles || [])[(e.cycle || 1) - 1]?.[e.part || 'raised'])) };
        case 'extra':
          return {
            key, label,
            render: (c) => {
              const v = (c.extras || {})[e.label || ''];
              return text(fieldType.get(e.label || '') === 'date' ? fmtDate(v) || v : v);
            },
          };
        case 'computed': {
          // Worked out by the tracker; the sheet's text where it has nothing to work from.
          const value = (c: TrackerCase, idx: number): string => {
            switch (e.computed) {
              case 'serial': return String((p.page - 1) * p.limit + idx + 1);
              case 'tatStatus': return c.tatStatus === 'In TAT' ? 'Within TAT' : (c.tatStatus || '');
              case 'agingDays': return String(c.agingDays ?? '');
              case 'insuffDays': return String(c.insuffDays ?? '');
              case 'daysDelay': return c.endDate ? String(daysBetween(c.endDate, c.reportDate) ?? '') : '';
              case 'checkAging': {
                const k = checkOf(c, e);
                if (k?.status === 'NA') return 'NA';
                return k && c.startDate ? String(daysBetween(c.startDate, k.completedDate) ?? '') : '';
              }
              default: return '';
            }
          };
          return {
            key, label,
            render: (c, idx) => {
              const v = value(c, idx);
              const shown = sheetText(c, e, v, v);
              return e.computed === 'tatStatus' && shown === v
                ? <span className={`text-xs whitespace-nowrap ${TAT_STYLE[c.tatStatus || ''] || ''}`}>{v}</span>
                : text(shown);
            },
          };
        }
        default:
          // Columns the tracker has no use for: kept as the sheet had them.
          return { key, label, render: (c) => text(sheetText(c, e, '', '')) };
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p.layout, allColumns, meta, fieldType, p.page, p.limit, canEdit]);
  const showingCompany = !!layoutColumns && companyView;

  // Chosen columns, plus the shown company's own fields unless switched off.
  const autoKeys = companyFields.map((f) => `extra:${f.label}`).filter((k) => !visible.includes(k) && !hiddenFields.includes(k));
  const shownKeys = [...visible, ...autoKeys];
  const columns = showingCompany ? layoutColumns! : shownKeys.map((k) => allColumns.find((c) => c.key === k)).filter(Boolean) as Column[];
  const toggleColumn = (key: string, on: boolean) => {
    setVisible(on ? [...visible, key] : visible.filter((k) => k !== key));
    if (key.startsWith('extra:')) setHiddenFields(on ? hiddenFields.filter((k) => k !== key) : Array.from(new Set([...hiddenFields, key])));
  };

  // ---- column order ----
  const shownColumnKeys = columns.map((c) => c.key);
  /** Put the shown columns in a new order; chosen columns not in view right now keep their place at the end. */
  const setOrder = (order: string[]) => setVisible([...order, ...visible.filter((k) => !order.includes(k))]);
  const moveColumn = (key: string, to: number) => {
    const order = shownColumnKeys.filter((k) => k !== key);
    order.splice(Math.max(0, Math.min(to, order.length)), 0, key);
    setOrder(order);
  };
  const [dragKey, setDragKey] = useState<string | null>(null);
  const [dropKey, setDropKey] = useState<string | null>(null);
  const dropOn = (target: string) => {
    if (!dragKey || dragKey === target) return;
    // Takes the target's place: dropped on a column to its right it lands after
    // it, to its left before it (moveColumn removes it from its old place first).
    moveColumn(dragKey, shownColumnKeys.indexOf(target));
  };
  const hiddenColumns = allColumns.filter((c) => !shownColumnKeys.includes(c.key));
  const allIds = rows.map((r) => r._id);
  const allChecked = allIds.length > 0 && allIds.every((id) => p.selected.includes(id));
  const pages = Math.max(1, Math.ceil(p.total / p.limit));

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm text-gray-600">
        <span>{p.total.toLocaleString('en-IN')} case{p.total === 1 ? '' : 's'}</span>
        <div className="flex items-center gap-2">
        {(canScroll.left || canScroll.right) && (
          <div className="flex rounded-md border overflow-hidden" title="Scroll the columns (or Shift + mouse wheel)">
            <button type="button" aria-label="Scroll columns left" disabled={!canScroll.left} onClick={() => scrollColumns(-1)} className="h-8 w-8 flex items-center justify-center bg-white text-gray-700 hover:bg-gray-100 disabled:text-gray-300 disabled:hover:bg-white">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button type="button" aria-label="Scroll columns right" disabled={!canScroll.right} onClick={() => scrollColumns(1)} className="h-8 w-8 flex items-center justify-center bg-white text-gray-700 hover:bg-gray-100 disabled:text-gray-300 disabled:hover:bg-white border-l">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
        {layoutColumns && (
          <div className="flex rounded-md border overflow-hidden text-sm" title="Show this company's own columns, exactly as in its sheet">
            <button type="button" onClick={() => setCompanyView(true)} className={`px-2.5 h-8 ${showingCompany ? 'bg-brand-green text-white' : 'bg-white text-gray-700'}`}>{p.layout!.companyName} columns</button>
            <button type="button" onClick={() => setCompanyView(false)} className={`px-2.5 h-8 border-l ${!showingCompany ? 'bg-brand-green text-white' : 'bg-white text-gray-700'}`}>Tracker columns</button>
          </div>
        )}
        <div ref={pickerRef} className={`relative ${showingCompany ? 'hidden' : ''}`}>
          <Button type="button" variant="outline" size="sm" onClick={() => setPickerOpen((v) => !v)}>
            <Columns3 className="w-4 h-4 mr-1" /> Columns
          </Button>
          {pickerOpen && (
            <div className="absolute right-0 z-30 mt-1 w-72 max-h-96 overflow-y-auto rounded-md border bg-white shadow-lg p-2">
              <div className="flex justify-between px-1 pb-2 border-b mb-1 text-xs">
                <button type="button" className="text-brand-green" onClick={() => { setVisible(allColumns.map((c) => c.key)); setHiddenFields([]); }}>Show all</button>
                <button type="button" className="text-gray-500" onClick={() => { setVisible(meta.isClient ? CLIENT_DEFAULT : DEFAULT_COLUMNS); setHiddenFields([]); }}>Reset</button>
              </div>
              <p className="px-1 pb-1 text-[11px] font-semibold uppercase tracking-wide text-gray-400">Shown, in order</p>
              <p className="px-1 pb-1 text-[11px] text-gray-500">Use the arrows, or drag a column header in the table.</p>
              {columns.map((c, i) => (
                <div key={c.key} className="flex items-center gap-1 px-1 py-0.5 text-sm hover:bg-gray-50 rounded">
                  <label className="flex flex-1 min-w-0 items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked onChange={(e) => toggleColumn(c.key, e.target.checked)} />
                    <span className="truncate">{c.label}</span>
                  </label>
                  <button type="button" aria-label={`Move ${c.label} left`} disabled={i === 0} onClick={() => moveColumn(c.key, i - 1)} className="p-0.5 rounded text-gray-500 hover:bg-gray-200 disabled:text-gray-300 disabled:hover:bg-transparent"><ChevronUp className="w-3.5 h-3.5" /></button>
                  <button type="button" aria-label={`Move ${c.label} right`} disabled={i === columns.length - 1} onClick={() => moveColumn(c.key, i + 1)} className="p-0.5 rounded text-gray-500 hover:bg-gray-200 disabled:text-gray-300 disabled:hover:bg-transparent"><ChevronDown className="w-3.5 h-3.5" /></button>
                </div>
              ))}
              {hiddenColumns.length > 0 && (
                <p className="px-1 pt-2 pb-1 text-[11px] font-semibold uppercase tracking-wide text-gray-400 border-t mt-1">Hidden</p>
              )}
              {hiddenColumns.map((c) => (
                <label key={c.key} className="flex items-center gap-2 px-1 py-1 text-sm cursor-pointer hover:bg-gray-50 rounded">
                  <input type="checkbox" checked={false} onChange={(e) => toggleColumn(c.key, e.target.checked)} />
                  {c.label}{c.extra && <span className="text-[10px] text-gray-400">company field</span>}
                </label>
              ))}
            </div>
          )}
        </div>
        </div>
      </div>

      <div ref={scrollRef} onScroll={measureScroll} style={{ maxHeight: boxHeight ?? undefined }} className="tracker-scroll overflow-auto border rounded-lg bg-white">
        <table className="min-w-full text-sm">
          <thead>
            <tr>
              {canEdit && (
                <th className={`${HEAD_CELL} w-8 px-2 py-2`}>
                  <input type="checkbox" checked={allChecked} onChange={(e) => p.onSelect(e.target.checked ? Array.from(new Set([...p.selected, ...allIds])) : p.selected.filter((id) => !allIds.includes(id)))} />
                </th>
              )}
              {columns.map((c) => (
                <th
                  key={c.key}
                  // Drag a header onto another to move the column (not in the company's own column view).
                  draggable={!showingCompany}
                  onDragStart={(e) => { setDragKey(c.key); e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', c.key); }}
                  onDragOver={(e) => { if (dragKey && dragKey !== c.key) { e.preventDefault(); setDropKey(c.key); } }}
                  onDragLeave={() => setDropKey((k) => (k === c.key ? null : k))}
                  onDrop={(e) => { e.preventDefault(); dropOn(c.key); setDragKey(null); setDropKey(null); }}
                  onDragEnd={() => { setDragKey(null); setDropKey(null); }}
                  title={showingCompany ? undefined : 'Drag to move this column'}
                  className={`${HEAD_CELL} px-2 py-2 text-left text-xs font-semibold text-gray-600 whitespace-nowrap ${showingCompany ? '' : 'cursor-grab'} ${dragKey === c.key ? 'opacity-50' : ''} ${dropKey === c.key ? '!bg-brand-green-50 outline outline-2 -outline-offset-2 outline-brand-green' : ''}`}
                >
                  {c.sortKey ? (
                    <button type="button" className="flex items-center gap-1 hover:text-gray-900" onClick={() => p.onSort(c.sortKey!)}>
                      {c.label}
                      {p.sortBy === c.sortKey && (p.sortDir === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />)}
                    </button>
                  ) : c.label}
                </th>
              ))}
              <th className={`${HEAD_CELL} px-2 py-2 text-right text-xs font-semibold text-gray-600`}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {p.loading && rows.length === 0 && (
              <tr><td colSpan={columns.length + 2} className="py-10 text-center text-gray-400"><Loader2 className="w-5 h-5 animate-spin mx-auto" /></td></tr>
            )}
            {!p.loading && rows.length === 0 && (
              <tr><td colSpan={columns.length + 2} className="py-10 text-center text-gray-500">No cases match these filters.</td></tr>
            )}
            {rows.map((c, i) => (
              <tr key={c._id} onClick={() => p.onOpen(c)} className={`border-b last:border-b-0 hover:bg-gray-50 cursor-pointer ${p.selected.includes(c._id) ? 'bg-brand-green-50' : ''} ${p.loading ? 'opacity-60' : ''}`}>
                {canEdit && (
                  <td className="px-2 py-1.5" onClick={(e) => e.stopPropagation()}>
                    <input type="checkbox" checked={p.selected.includes(c._id)} onChange={(e) => p.onSelect(e.target.checked ? [...p.selected, c._id] : p.selected.filter((id) => id !== c._id))} />
                  </td>
                )}
                {columns.map((col) => <td key={col.key} className="px-2 py-1.5 align-middle">{col.render(c, i)}</td>)}
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
