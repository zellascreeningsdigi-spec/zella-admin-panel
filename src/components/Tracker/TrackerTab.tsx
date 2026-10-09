import React, { useCallback, useEffect, useState } from 'react';
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
import { TrackerCase, TrackerFilters, TrackerMeta, toParams } from './trackerTypes';

// BGV tracker: the team's tracker workbook, in the software.
// Staff add / edit / remove cases (inline or in the form), import tabs of the
// workbook, export per company, and see analytics. Company logins see their
// own cases read-only, limited to the fields their company is set to show.

const FILTER_KEY = 'tracker-filters';
const loadFilters = (): TrackerFilters => {
  try { return JSON.parse(sessionStorage.getItem(FILTER_KEY) || '{}'); } catch { return {}; }
};

const TrackerTab: React.FC = () => {
  const [meta, setMeta] = useState<TrackerMeta | null>(null);
  const [metaError, setMetaError] = useState<string | null>(null);
  const [view, setView] = useState<'cases' | 'drafts' | 'analytics'>('cases');
  const [draftCount, setDraftCount] = useState(0);
  const [mineOnly, setMineOnly] = useState(false);
  const [filters, setFilters] = useState<TrackerFilters>(loadFilters);
  const [rows, setRows] = useState<TrackerCase[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);
  const [sortBy, setSortBy] = useState('startDate');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [loading, setLoading] = useState(false);
  const [analytics, setAnalytics] = useState<any>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
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

  useEffect(() => {
    try { sessionStorage.setItem(FILTER_KEY, JSON.stringify(filters)); } catch { /* ignore */ }
  }, [filters]);

  const loadCases = useCallback(async () => {
    if (!meta) return;
    setLoading(true);
    try {
      const drafts = view === 'drafts' ? { draft: 'only', mine: mineOnly ? 'true' : undefined } : {};
      const r = await apiService.getTrackerCases({ ...toParams(filters), ...drafts, page, limit, sortBy: view === 'drafts' ? 'updatedAt' : sortBy, sortDir: view === 'drafts' ? 'desc' : sortDir });
      setRows(r.data.rows);
      setTotal(r.data.total);
    } catch (e: any) {
      flash(e.message || 'Could not load cases', { error: true });
    } finally {
      setLoading(false);
    }
  }, [meta, filters, page, limit, sortBy, sortDir, view, mineOnly]);

  const loadDraftCount = useCallback(async () => {
    if (!meta || !meta.canEdit) return;
    try {
      const r = await apiService.getTrackerCases({ draft: 'only', limit: 1 });
      setDraftCount(r.data.total);
    } catch { /* the count is a convenience */ }
  }, [meta]);
  useEffect(() => { loadDraftCount(); }, [loadDraftCount]);

  const loadAnalytics = useCallback(async () => {
    if (!meta) return;
    setAnalyticsLoading(true);
    try {
      const r = await apiService.getTrackerAnalytics(toParams(filters));
      setAnalytics(r.data);
    } catch (e: any) {
      flash(e.message || 'Could not load analytics', { error: true });
    } finally {
      setAnalyticsLoading(false);
    }
  }, [meta, filters]);

  useEffect(() => { if (view === 'cases' || view === 'drafts') loadCases(); }, [view, loadCases]);
  useEffect(() => { if (view === 'analytics') loadAnalytics(); }, [view, loadAnalytics]);

  const changeFilters = (f: TrackerFilters) => { setFilters(f); setPage(1); setSelected([]); };
  const refreshAll = () => { loadCases(); loadMeta(); loadDraftCount(); if (view === 'analytics') loadAnalytics(); };

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

  const runBulk = async (action: 'update' | 'delete', values?: Record<string, any>) => {
    if (action === 'delete' && !window.confirm(`Remove ${selected.length} case(s)?`)) return;
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
  if (!meta) return <div className="p-10 text-center text-gray-400"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></div>;

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
          <div className="flex rounded-md border overflow-hidden">
            <button type="button" onClick={() => setView('cases')} className={`px-3 h-9 text-sm flex items-center gap-1 ${view === 'cases' ? 'bg-brand-green text-white' : 'bg-white text-gray-700'}`}><List className="w-4 h-4" /> Cases</button>
            {meta.canEdit && (
              <button type="button" onClick={() => { setView('drafts'); setPage(1); setSelected([]); }} className={`px-3 h-9 text-sm flex items-center gap-1 border-l ${view === 'drafts' ? 'bg-brand-green text-white' : 'bg-white text-gray-700'}`}>
                <FilePen className="w-4 h-4" /> Drafts
                {draftCount > 0 && <span className={`ml-0.5 text-[11px] px-1.5 rounded-full ${view === 'drafts' ? 'bg-white/25' : 'bg-amber-100 text-amber-800'}`}>{draftCount}</span>}
              </button>
            )}
            <button type="button" onClick={() => setView('analytics')} className={`px-3 h-9 text-sm flex items-center gap-1 border-l ${view === 'analytics' ? 'bg-brand-green text-white' : 'bg-white text-gray-700'}`}><BarChart3 className="w-4 h-4" /> Analytics</button>
          </div>
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

      {notice && (
        <div className={`flex items-center justify-between gap-3 rounded-md border p-2.5 text-sm ${notice.error ? 'border-red-300 bg-red-50 text-red-700' : 'border-green-300 bg-green-50 text-green-800'}`}>
          <span className="flex items-center gap-2">{!notice.error && <CheckCircle2 className="w-4 h-4" />} {notice.text}</span>
          <span className="flex items-center gap-2">
            {notice.undo && <Button type="button" size="sm" variant="outline" className="h-7" onClick={notice.undo}>Undo</Button>}
            <button type="button" onClick={() => setNotice(null)}><X className="w-4 h-4" /></button>
          </span>
        </div>
      )}

      <TrackerFilterBar meta={meta} filters={filters} onChange={changeFilters} />

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
          <strong>{selected.length} selected</strong>
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
          <span className="w-px h-6 bg-gray-300" />
          <Button type="button" size="sm" variant="outline" className="h-8 text-red-600 border-red-200" onClick={() => runBulk('delete')}><Trash2 className="w-3.5 h-3.5 mr-1" /> Remove</Button>
          <button type="button" className="ml-auto text-gray-500 text-xs" onClick={() => setSelected([])}>Clear selection</button>
        </div>
      )}

      {view !== 'analytics' ? (
        <TrackerTable
          meta={meta}
          rows={rows}
          loading={loading}
          total={total}
          page={page}
          limit={limit}
          sortBy={sortBy}
          sortDir={sortDir}
          selected={selected}
          onSelect={setSelected}
          onSort={(field) => { if (field === sortBy) setSortDir(sortDir === 'asc' ? 'desc' : 'asc'); else { setSortBy(field); setSortDir('desc'); } setPage(1); }}
          onPage={setPage}
          onLimit={(n) => { setLimit(n); setPage(1); }}
          onOpen={openCase}
          onDuplicate={duplicateCase}
          onDelete={deleteCase}
          onInlineSave={inlineSave}
        />
      ) : (
        <TrackerAnalytics
          meta={meta}
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
      {meta.canEdit && <ImportDialog meta={meta} open={importOpen} onClose={() => setImportOpen(false)} onImported={refreshAll} onCreateCompany={requestCreateCompany} />}
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
