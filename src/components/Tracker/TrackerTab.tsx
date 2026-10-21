import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { BarChart3, CheckCircle2, Download, FileSpreadsheet, FilePen, List, Loader2, Plus, Settings2, Trash2, X } from 'lucide-react';
import { apiService } from '@/services/api';
import TrackerFilterBar from './TrackerFilterBar';
import TrackerTable from './TrackerTable';
import TrackerAnalytics from './TrackerAnalytics';
import CaseFormDialog from './CaseFormDialog';
import ImportDialog from './ImportDialog';
import ExportDialog from './ExportDialog';
import ClientViewDialog from './ClientViewDialog';
import CreateCompanyDialog, { CreatedCompany } from './CreateCompanyDialog';
import NewTabDialog from './NewTabDialog';
import BulkDeleteDialog from './BulkDeleteDialog';
import { TrackerCase, TrackerFilters, TrackerLayoutEntry, TrackerMeta, TrackerTabState, makeTab, toParams } from './trackerTypes';

// BGV tracker: the team's tracker workbook, in the software.
// Staff add / edit / remove cases (inline or in the form), import tabs of the
// workbook, export per company, and see analytics. Company logins see their
// own cases read-only, limited to the fields their company is set to show.
//
// Like the workbook, the page has tabs: each tab is cases or analytics for
// its own companies and filters. Tabs are saved per person on the server.

const ALL_TAB = 'all';
const DRAFTS_TAB = 'drafts';
const LEGACY_FILTER_KEY = 'tracker-filters';

/** The person's saved tabs, with the fixed tabs always present (Drafts only for editors). */
const withFixedTabs = (saved: TrackerTabState[], canEdit: boolean): TrackerTabState[] => {
  const own = saved.filter((t) => !t.fixed && t.id !== ALL_TAB && t.id !== DRAFTS_TAB);
  const all = saved.find((t) => t.id === ALL_TAB);
  const drafts = saved.find((t) => t.id === DRAFTS_TAB);
  let legacy: TrackerFilters = {};
  try { legacy = JSON.parse(sessionStorage.getItem(LEGACY_FILTER_KEY) || '{}'); } catch { /* ignore */ }
  return [
    { ...makeTab({ name: 'All companies', filters: legacy }), ...all, id: ALL_TAB, name: 'All companies', fixed: true, view: all?.view === 'analytics' ? 'analytics' : 'cases' },
    ...(canEdit ? [{ ...makeTab({ name: 'Drafts' }), ...drafts, id: DRAFTS_TAB, name: 'Drafts', fixed: true, view: 'drafts' as const }] : []),
    ...own.map((t) => ({ ...t, view: t.view === 'analytics' ? 'analytics' as const : 'cases' as const })),
  ];
};

const TrackerTab: React.FC = () => {
  const [meta, setMeta] = useState<TrackerMeta | null>(null);
  const [metaError, setMetaError] = useState<string | null>(null);
  const [tabs, setTabs] = useState<TrackerTabState[] | null>(null);
  const [activeId, setActiveId] = useState(ALL_TAB);
  const [pages, setPages] = useState<Record<string, number>>({});
  const [newTabOpen, setNewTabOpen] = useState(false);
  const [renaming, setRenaming] = useState<{ id: string; name: string } | null>(null);
  const [draftCount, setDraftCount] = useState(0);
  const [mineOnly, setMineOnly] = useState(false);
  const [rows, setRows] = useState<TrackerCase[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [analytics, setAnalytics] = useState<any>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [selected, setSelectedIds] = useState<string[]>([]);
  // Every case matching the tab's filters is selected (not just the ticked rows). Super-admins only.
  const [allMatching, setAllMatching] = useState(false);
  const setSelected = (ids: string[]) => { setSelectedIds(ids); setAllMatching(false); };
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [notice, setNotice] = useState<{ text: string; undo?: () => void; error?: boolean } | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [formCaseId, setFormCaseId] = useState<string | null>(null);
  const [formInitial, setFormInitial] = useState<Partial<TrackerCase> | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [bulk, setBulk] = useState({ status: '', allocatedTo: '', billedMonth: '' });
  // "Create new company" from any company picker: the caller awaits the new id.
  const [createCompany, setCreateCompany] = useState<{ name: string; resolve: (id: string | null) => void } | null>(null);
  const requestCreateCompany = (name: string) =>
    new Promise<string | null>((resolve) => setCreateCompany({ name, resolve }));
  const companyCreated = (c: CreatedCompany) => {
    setMeta((m) => (m ? {
      ...m,
      customers: [...m.customers, { _id: c._id, companyName: c.companyName, trackerTatDays: 15, trackerVisibleFields: [] }]
        .sort((a, b) => a.companyName.localeCompare(b.companyName)),
    } : m));
    flash(`Company "${c.companyName}" created — send them the login email from Datahub when ready`);
    createCompany?.resolve(c._id);
    setCreateCompany(null);
  };

  const flash = (text: string, extra: { undo?: () => void; error?: boolean } = {}) => {
    setNotice({ text, ...extra });
    window.setTimeout(() => setNotice((n) => (n?.text === text ? null : n)), extra.undo ? 8000 : 4000);
  };

  const loadMeta = useCallback(async () => {
    try {
      const r = await apiService.getTrackerMeta();
      setMeta(r.data);
    } catch (e: any) {
      setMetaError(e.message || 'Could not load the tracker');
    }
  }, []);
  useEffect(() => { loadMeta(); }, [loadMeta]);

  // ---- tabs ----
  const canEdit = !!meta?.canEdit;
  const metaLoaded = !!meta;
  useEffect(() => {
    if (!metaLoaded) return;
    let cancelled = false;
    (async () => {
      let saved: TrackerTabState[] = [];
      let savedActive = ALL_TAB;
      try {
        const r = await apiService.getTrackerTabs();
        saved = r.data?.tabs || [];
        savedActive = r.data?.activeId || ALL_TAB;
      } catch { /* start with the default tabs */ }
      if (cancelled) return;
      const list = withFixedTabs(saved, canEdit);
      setTabs(list);
      setActiveId(list.some((t) => t.id === savedActive) ? savedActive : ALL_TAB);
    })();
    return () => { cancelled = true; };
  }, [metaLoaded, canEdit]);

  // Save the tabs (debounced) whenever they change.
  const saveTimer = useRef<number | undefined>(undefined);
  useEffect(() => {
    if (!tabs) return;
    window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => {
      apiService.saveTrackerTabs({ tabs, activeId }).catch(() => { /* tabs are a convenience */ });
    }, 700);
    return () => window.clearTimeout(saveTimer.current);
  }, [tabs, activeId]);

  const tab = tabs?.find((t) => t.id === activeId) || tabs?.[0] || null;
  const view = tab?.view || 'cases';
  const tabFilters = tab?.filters;
  const filters = useMemo(() => tabFilters || {}, [tabFilters]);
  const sortBy = tab?.sortBy || 'startDate';
  const sortDir = tab?.sortDir || 'desc';
  const limit = tab?.limit || 50;
  const page = pages[tab?.id || ''] || 1;
  const setPage = (p: number) => tab && setPages((x) => ({ ...x, [tab.id]: p }));
  const updateTab = (id: string, patch: Partial<TrackerTabState>) =>
    setTabs((list) => list && list.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  const setView = (v: TrackerTabState['view']) => tab && updateTab(tab.id, { view: v });

  const switchTab = (id: string) => {
    if (id === activeId) return;
    setActiveId(id); setSelected([]); setRenaming(null); setRows([]); setTotal(0); setAnalytics(null);
  };
  const openTabs = (created: TrackerTabState[]) => {
    if (!created.length) return;
    setTabs((list) => (list ? [...list, ...created] : list));
    switchTab(created[0].id);
  };
  const closeTab = (id: string) => {
    if (!tabs) return;
    const i = tabs.findIndex((t) => t.id === id);
    const next = tabs.filter((t) => t.id !== id);
    setTabs(next);
    if (id === activeId) switchTab((next[i - 1] || next[0]).id);
  };
  const finishRename = () => {
    if (renaming?.name.trim()) updateTab(renaming.id, { name: renaming.name.trim().slice(0, 80) });
    setRenaming(null);
  };
  /** After an import: a tab per imported sheet, unless the same tab is already open. */
  const openImportedTabs = (sheets: { name: string; customerIds: string[] }[]) => {
    if (!tabs) return;
    const same = (a: string[] = [], b: string[] = []) => a.length === b.length && a.every((x) => b.includes(x));
    const created: TrackerTabState[] = [];
    let first: string | null = null;
    for (const s of sheets) {
      const existing = tabs.find((t) => !t.fixed && t.name === s.name && same(t.filters.customerIds, s.customerIds));
      if (existing) { first = first || existing.id; continue; }
      const t = makeTab({ name: s.name, filters: { customerIds: s.customerIds } });
      created.push(t);
      first = first || t.id;
    }
    if (created.length) setTabs((list) => (list ? [...list, ...created] : list));
    if (first) switchTab(first);
  };

  const tabsReady = !!tabs;

  // The company's own columns, when the tab shows exactly one company that has a remembered format.
  const [layouts, setLayouts] = useState<Record<string, { companyName: string; columns: TrackerLayoutEntry[] } | null>>({});
  const layoutCompany = meta?.isClient
    ? meta.customers[0]?._id
    : (filters.customerIds?.length === 1 && meta?.customers.find((c) => c._id === filters.customerIds![0])?.hasCustomFormat ? filters.customerIds[0] : undefined);
  useEffect(() => {
    if (!layoutCompany || layoutCompany in layouts) return;
    let cancelled = false;
    apiService.getTrackerLayout(layoutCompany)
      .then((r) => { if (!cancelled) setLayouts((m) => ({ ...m, [layoutCompany]: r.data?.layout ? { companyName: r.data.companyName, columns: r.data.layout } : null })); })
      .catch(() => { if (!cancelled) setLayouts((m) => ({ ...m, [layoutCompany]: null })); });
    return () => { cancelled = true; };
  }, [layoutCompany, layouts]);
  // The filters of the case list as sent to the server (also used to remove every matching case).
  const listParams = useMemo(() => ({
    ...toParams(filters),
    ...(view === 'drafts' ? { draft: 'only', mine: mineOnly ? 'true' : undefined } : {}),
  }), [filters, view, mineOnly]);
  const loadCases = useCallback(async () => {
    if (!meta || !tabsReady) return;
    setLoading(true);
    try {
      const r = await apiService.getTrackerCases({ ...listParams, page, limit, sortBy: view === 'drafts' ? 'updatedAt' : sortBy, sortDir: view === 'drafts' ? 'desc' : sortDir });
      setRows(r.data.rows);
      setTotal(r.data.total);
    } catch (e: any) {
      flash(e.message || 'Could not load cases', { error: true });
    } finally {
      setLoading(false);
    }
  }, [meta, tabsReady, listParams, page, limit, sortBy, sortDir, view]);

  const loadDraftCount = useCallback(async () => {
    if (!meta || !meta.canEdit) return;
    try {
      const r = await apiService.getTrackerCases({ draft: 'only', limit: 1 });
      setDraftCount(r.data.total);
    } catch { /* the count is a convenience */ }
  }, [meta]);
  useEffect(() => { loadDraftCount(); }, [loadDraftCount]);

  const loadAnalytics = useCallback(async () => {
    if (!meta || !tabsReady) return;
    setAnalyticsLoading(true);
    try {
      const r = await apiService.getTrackerAnalytics(toParams(filters));
      setAnalytics(r.data);
    } catch (e: any) {
      flash(e.message || 'Could not load analytics', { error: true });
    } finally {
      setAnalyticsLoading(false);
    }
  }, [meta, tabsReady, filters]);

  useEffect(() => { if (view === 'cases' || view === 'drafts') loadCases(); }, [view, loadCases]);
  useEffect(() => { if (view === 'analytics') loadAnalytics(); }, [view, loadAnalytics]);

  const changeFilters = (f: TrackerFilters) => { if (tab) updateTab(tab.id, { filters: f }); setPage(1); setSelected([]); };
  const companiesCreated = (list: CreatedCompany[]) => {
    setMeta((m) => {
      if (!m) return m;
      const known = new Set(m.customers.map((c) => c._id));
      const add = list.filter((c) => !known.has(c._id)).map((c) => ({ _id: c._id, companyName: c.companyName, trackerTatDays: 15, trackerVisibleFields: [], trackerCustomFields: [] }));
      return add.length ? { ...m, customers: [...m.customers, ...add].sort((a, b) => a.companyName.localeCompare(b.companyName)) } : m;
    });
  };
  // A re-import can change a company's format, so its columns are fetched again.
  const refreshAll = () => { setLayouts({}); loadCases(); loadMeta(); loadDraftCount(); if (view === 'analytics') loadAnalytics(); };

  // ---- row actions ----
  const openCase = (c: TrackerCase) => { setFormInitial(null); setFormCaseId(c._id); setFormOpen(true); };
  const addCase = () => { setFormInitial(null); setFormCaseId(null); setFormOpen(true); };
  const duplicateCase = (c: TrackerCase) => { setFormCaseId(null); setFormInitial(c); setFormOpen(true); };

  const inlineSave = async (c: TrackerCase, patch: Record<string, any>) => {
    try {
      const r = await apiService.updateTrackerCase(c._id, patch);
      setRows((list) => list.map((x) => (x._id === c._id ? { ...x, ...r.data } : x)));
    } catch (e: any) {
      flash(e.message || 'Could not save', { error: true });
    }
  };

  const deleteCase = async (c: TrackerCase) => {
    if (!window.confirm(c.isDraft ? `Remove this draft${c.name ? ` (${c.name})` : ''}?` : `Remove the case of ${c.name}${c.bgvId ? ` (${c.bgvId})` : ''}?`)) return;
    try {
      await apiService.deleteTrackerCase(c._id);
      setRows((list) => list.filter((x) => x._id !== c._id));
      setTotal((t) => t - 1);
      if (c.isDraft) setDraftCount((n) => Math.max(0, n - 1));
      flash(`Removed ${c.name || 'draft'}`, {
        undo: async () => {
          await apiService.restoreTrackerCase(c._id);
          setNotice(null);
          loadCases();
          loadDraftCount();
        },
      });
    } catch (e: any) {
      flash(e.message || 'Could not remove', { error: true });
    }
  };

  const runBulkDelete = async () => {
    const count = allMatching ? total : selected.length;
    setDeleting(true);
    try {
      const r = await apiService.bulkTrackerCases(allMatching
        ? { action: 'delete', all: true, filters: listParams, expectedCount: count }
        : { action: 'delete', ids: selected });
      const batch = r.data?.deleteBatch;
      setConfirmDelete(false);
      setSelected([]);
      loadCases();
      loadDraftCount();
      flash(r.message || 'Removed', batch ? {
        undo: async () => {
          try {
            const u = await apiService.restoreTrackerBatch(batch);
            flash(u.message || 'Restored');
            loadCases();
            loadDraftCount();
          } catch (e: any) {
            flash(e.message || 'Could not restore', { error: true });
          }
        },
      } : {});
    } catch (e: any) {
      setConfirmDelete(false);
      flash(e.message || 'Could not remove the cases', { error: true });
    } finally {
      setDeleting(false);
    }
  };

  const runBulk = async (action: 'update', values?: Record<string, any>) => {
    try {
      const r = await apiService.bulkTrackerCases({ ids: selected, action, values });
      flash(r.message || 'Done');
      setSelected([]);
      setBulk({ status: '', allocatedTo: '', billedMonth: '' });
      loadCases();
    } catch (e: any) {
      flash(e.message || 'Bulk change failed', { error: true });
    }
  };

  if (metaError) return <div className="p-6 text-red-600">{metaError}</div>;
  if (!meta || !tabs || !tab) return <div className="p-10 text-center text-gray-400"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold">BGV Tracker</h2>
          <p className="text-gray-500 text-sm">
            {meta.isClient ? `Background verification status for ${meta.customers[0]?.companyName}` : 'Every case, every company — add, update, import and export'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {view !== 'drafts' && (
            <div className="flex rounded-md border overflow-hidden" title="Switch this tab between its cases and its analytics">
              <button type="button" onClick={() => setView('cases')} className={`px-3 h-9 text-sm flex items-center gap-1 ${view === 'cases' ? 'bg-brand-green text-white' : 'bg-white text-gray-700'}`}><List className="w-4 h-4" /> Cases</button>
              <button type="button" onClick={() => setView('analytics')} className={`px-3 h-9 text-sm flex items-center gap-1 border-l ${view === 'analytics' ? 'bg-brand-green text-white' : 'bg-white text-gray-700'}`}><BarChart3 className="w-4 h-4" /> Analytics</button>
            </div>
          )}
          <Button type="button" variant="outline" onClick={() => setExportOpen(true)}><Download className="w-4 h-4 mr-1" /> Export</Button>
          {meta.canEdit && (
            <>
              <Button type="button" variant="outline" onClick={() => setImportOpen(true)}><FileSpreadsheet className="w-4 h-4 mr-1" /> Import</Button>
              <Button type="button" variant="outline" onClick={() => setSettingsOpen(true)} title="Company TAT and what each company can see"><Settings2 className="w-4 h-4 mr-1" /> Company settings</Button>
              <Button type="button" onClick={addCase}><Plus className="w-4 h-4 mr-1" /> Add case</Button>
            </>
          )}
        </div>
      </div>

      <div className="flex items-end gap-1 border-b border-gray-200 overflow-x-auto">
        {tabs.map((t) => {
          const active = t.id === tab.id;
          const Icon = t.view === 'drafts' ? FilePen : t.view === 'analytics' ? BarChart3 : List;
          return (
            <div
              key={t.id}
              role="tab"
              aria-selected={active}
              onClick={() => !active && switchTab(t.id)}
              onDoubleClick={() => !t.fixed && setRenaming({ id: t.id, name: t.name })}
              title={t.fixed ? t.name : `${t.name} — double-click to rename`}
              className={`group shrink-0 flex items-center gap-1.5 pl-3 pr-2 h-9 rounded-t-md border border-b-0 text-sm cursor-pointer select-none ${active ? 'bg-white text-brand-green font-medium border-gray-200 -mb-px' : 'bg-gray-50 text-gray-600 border-transparent hover:bg-gray-100'}`}
            >
              <Icon className="w-3.5 h-3.5 shrink-0" />
              {renaming?.id === t.id ? (
                <input
                  autoFocus
                  value={renaming.name}
                  onChange={(e) => setRenaming({ id: t.id, name: e.target.value })}
                  onBlur={finishRename}
                  onKeyDown={(e) => { if (e.key === 'Enter') finishRename(); if (e.key === 'Escape') setRenaming(null); }}
                  className="h-6 w-36 px-1 border border-gray-300 rounded text-sm text-gray-800"
                />
              ) : (
                <span className="max-w-[180px] truncate">{t.name}</span>
              )}
              {t.id === DRAFTS_TAB && draftCount > 0 && <span className="text-[11px] px-1.5 rounded-full bg-amber-100 text-amber-800">{draftCount}</span>}
              {!t.fixed && (
                <button
                  type="button"
                  aria-label={`Close ${t.name}`}
                  onClick={(e) => { e.stopPropagation(); closeTab(t.id); }}
                  className={`rounded p-0.5 text-gray-400 hover:text-gray-700 hover:bg-gray-200 ${active ? '' : 'opacity-0 group-hover:opacity-100'}`}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          );
        })}
        <button type="button" onClick={() => setNewTabOpen(true)} title="New tab" className="shrink-0 h-8 w-8 mb-0.5 flex items-center justify-center rounded-md text-gray-500 hover:bg-gray-100 hover:text-brand-green">
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {notice && (
        <div className={`flex items-center justify-between gap-3 rounded-md border p-2.5 text-sm ${notice.error ? 'border-red-300 bg-red-50 text-red-700' : 'border-green-300 bg-green-50 text-green-800'}`}>
          <span className="flex items-center gap-2">{!notice.error && <CheckCircle2 className="w-4 h-4" />} {notice.text}</span>
          <span className="flex items-center gap-2">
            {notice.undo && <Button type="button" size="sm" variant="outline" className="h-7" onClick={notice.undo}>Undo</Button>}
            <button type="button" onClick={() => setNotice(null)}><X className="w-4 h-4" /></button>
          </span>
        </div>
      )}

      <TrackerFilterBar key={tab.id} meta={meta} filters={filters} onChange={changeFilters} />

      {view === 'drafts' && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-amber-200 bg-amber-50 p-2.5 text-sm text-amber-900">
          <span>Drafts are half-filled cases saved for later. They are not in the case list, analytics or exports until added to the tracker.</span>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={mineOnly} onChange={(e) => { setMineOnly(e.target.checked); setPage(1); }} /> Only my drafts
          </label>
        </div>
      )}

      {(view === 'cases' || view === 'drafts') && meta.canEdit && selected.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-md border border-brand-green bg-brand-green-50 p-2 text-sm">
          <strong>{allMatching ? `All ${total.toLocaleString('en-IN')} cases in this tab selected` : `${selected.length} selected`}</strong>
          {meta.canBulkDelete && !allMatching && total > selected.length && rows.length > 0 && rows.every((r) => selected.includes(r._id)) && (
            <button type="button" className="text-brand-green underline" onClick={() => setAllMatching(true)}>
              Select all {total.toLocaleString('en-IN')} cases in this tab
            </button>
          )}
          {!allMatching && <>
          <select value={bulk.status} onChange={(e) => setBulk({ ...bulk, status: e.target.value })} className="h-8 px-2 border border-gray-300 rounded text-sm bg-white">
            <option value="">Set status…</option>
            {meta.statuses.map((s) => <option key={s}>{s}</option>)}
          </select>
          <Button type="button" size="sm" className="h-8" disabled={!bulk.status} onClick={() => runBulk('update', { status: bulk.status })}>Apply</Button>
          <span className="w-px h-6 bg-gray-300" />
          <input list="bulk-allocated" value={bulk.allocatedTo} onChange={(e) => setBulk({ ...bulk, allocatedTo: e.target.value })} placeholder="Assign to…" className="h-8 px-2 border border-gray-300 rounded text-sm w-36" />
          <datalist id="bulk-allocated">{meta.options.allocated.map((p) => <option key={p} value={p} />)}</datalist>
          <Button type="button" size="sm" className="h-8" disabled={!bulk.allocatedTo.trim()} onClick={() => runBulk('update', { allocatedTo: bulk.allocatedTo.trim() })}>Assign</Button>
          <span className="w-px h-6 bg-gray-300" />
          <input type="month" value={bulk.billedMonth} onChange={(e) => setBulk({ ...bulk, billedMonth: e.target.value })} className="h-8 px-2 border border-gray-300 rounded text-sm" />
          <Button type="button" size="sm" className="h-8" disabled={!bulk.billedMonth} onClick={() => runBulk('update', { billingStatus: 'Billed', billedMonth: bulk.billedMonth })}>Mark billed</Button>
          </>}
          {meta.canBulkDelete && <>
            <span className="w-px h-6 bg-gray-300" />
            <Button type="button" size="sm" variant="outline" className="h-8 text-red-600 border-red-200" onClick={() => setConfirmDelete(true)}><Trash2 className="w-3.5 h-3.5 mr-1" /> Remove {allMatching ? 'all' : ''}</Button>
          </>}
          <button type="button" className="ml-auto text-gray-500 text-xs" onClick={() => setSelected([])}>Clear selection</button>
        </div>
      )}

      {view !== 'analytics' ? (
        <TrackerTable
          meta={meta}
          layout={layoutCompany ? layouts[layoutCompany] : null}
          customerIds={filters.customerIds}
          rows={rows}
          loading={loading}
          total={total}
          page={page}
          limit={limit}
          sortBy={sortBy}
          sortDir={sortDir}
          selected={selected}
          onSelect={setSelected}
          onSort={(field) => { updateTab(tab.id, field === sortBy ? { sortDir: sortDir === 'asc' ? 'desc' : 'asc' } : { sortBy: field, sortDir: 'desc' }); setPage(1); }}
          onPage={setPage}
          onLimit={(n) => { updateTab(tab.id, { limit: n }); setPage(1); }}
          onOpen={openCase}
          onDuplicate={duplicateCase}
          onDelete={deleteCase}
          onInlineSave={inlineSave}
        />
      ) : (
        <TrackerAnalytics
          meta={meta}
          title={tab.name}
          data={analytics}
          loading={analyticsLoading}
          onDrill={(patch) => { changeFilters({ ...filters, ...patch }); setView('cases'); }}
        />
      )}

      <CaseFormDialog
        meta={meta}
        open={formOpen}
        caseId={formCaseId}
        initial={formInitial}
        defaultCustomerId={filters.customerIds?.length === 1 ? filters.customerIds[0] : undefined}
        onCreateCompany={requestCreateCompany}
        onClose={() => setFormOpen(false)}
        onSaved={(c) => {
          flash(c.isDraft ? `Draft saved${c.name ? `: ${c.name}` : ''}` : formCaseId ? `Saved ${c.name}` : `Added ${c.name}`);
          refreshAll();
        }}
      />
      {meta.canEdit && (
        <ImportDialog
          meta={meta}
          open={importOpen}
          onClose={() => setImportOpen(false)}
          onImported={(sheets) => { refreshAll(); if (sheets?.length) openImportedTabs(sheets); }}
          onCreateCompany={requestCreateCompany}
          onCompaniesCreated={companiesCreated}
        />
      )}
      <NewTabDialog meta={meta} open={newTabOpen} onClose={() => setNewTabOpen(false)} onCreate={openTabs} />
      {meta.canBulkDelete && (
        <BulkDeleteDialog
          open={confirmDelete}
          count={allMatching ? total : selected.length}
          scopeLabel={allMatching ? `in the tab "${tab.name}"` : 'you selected'}
          busy={deleting}
          onClose={() => setConfirmDelete(false)}
          onConfirm={runBulkDelete}
        />
      )}
      {meta.canEdit && (
        <CreateCompanyDialog
          open={!!createCompany}
          initialName={createCompany?.name || ''}
          existingNames={meta.customers.map((c) => c.companyName)}
          onClose={() => { createCompany?.resolve(null); setCreateCompany(null); }}
          onCreated={companyCreated}
        />
      )}
      <ExportDialog meta={meta} open={exportOpen} filters={filters} onClose={() => setExportOpen(false)} />
      {meta.canEdit && (
        <ClientViewDialog
          meta={meta}
          open={settingsOpen}
          initialCustomerId={filters.customerIds?.length === 1 ? filters.customerIds[0] : undefined}
          onClose={() => setSettingsOpen(false)}
          onSaved={loadMeta}
        />
      )}
    </div>
  );
};

export default TrackerTab;
