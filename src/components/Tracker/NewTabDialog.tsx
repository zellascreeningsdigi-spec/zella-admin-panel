import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { BarChart3, List } from 'lucide-react';
import MultiPick from './MultiPick';
import { TrackerFilters, TrackerMeta, TrackerTabState, makeTab } from './trackerTypes';

// Open new tracker tabs: cases or analytics, for any mix of companies and
// checks (and optionally check statuses) — all in one tab, or a tab per
// company, per check, or per company and check.

interface Props {
  meta: TrackerMeta;
  open: boolean;
  onClose: () => void;
  onCreate: (tabs: TrackerTabState[]) => void;
}

type Split = 'one' | 'company' | 'check' | 'both';
// Leaves room for the fixed tabs within the server's limit.
const MAX_NEW_TABS = 50;

const NewTabDialog: React.FC<Props> = ({ meta, open, onClose, onCreate }) => {
  const [view, setView] = useState<'cases' | 'analytics'>('cases');
  const [customerIds, setCustomerIds] = useState<string[]>([]);
  const [checkTypes, setCheckTypes] = useState<string[]>([]);
  const [checkStatuses, setCheckStatuses] = useState<string[]>([]);
  const [split, setSplit] = useState<Split>('one');
  const [name, setName] = useState('');

  useEffect(() => {
    if (open) { setView('cases'); setCustomerIds([]); setCheckTypes([]); setCheckStatuses([]); setSplit('one'); setName(''); }
  }, [open]);

  const companyName = (id: string) => meta.customers.find((c) => c._id === id)?.companyName || 'Company';
  const checkName = (key: string) => meta.checkTypes.find((c) => c.key === key)?.label || key;
  const several = (list: string[], label: (v: string) => string) =>
    list.length === 1 ? label(list[0]) : `${label(list[0])} +${list.length - 1}`;
  const autoName = (ids: string[], checks: string[]) => {
    const parts = [
      ids.length ? several(ids, companyName) : '',
      checks.length ? several(checks, checkName) : '',
      checkStatuses.length ? several(checkStatuses, (s) => s) : '',
    ].filter(Boolean);
    if (parts.length) return parts.join(' · ');
    return view === 'analytics' ? 'Analytics' : 'All companies';
  };
  const filtersFor = (ids: string[], checks: string[]): TrackerFilters => ({
    ...(ids.length ? { customerIds: ids } : {}),
    ...(checks.length ? { checkType: checks } : {}),
    ...(checkStatuses.length ? { checkStatus: checkStatuses } : {}),
  });

  // What each way of splitting would open.
  const groups = (s: Split): { ids: string[]; checks: string[] }[] => {
    const byCompany = customerIds.length ? customerIds.map((id) => [id]) : [[]];
    const byCheck = checkTypes.length ? checkTypes.map((k) => [k]) : [[]];
    switch (s) {
      case 'company': return byCompany.map((ids) => ({ ids, checks: checkTypes }));
      case 'check': return byCheck.map((checks) => ({ ids: customerIds, checks }));
      case 'both': return byCompany.flatMap((ids) => byCheck.map((checks) => ({ ids, checks })));
      default: return [{ ids: customerIds, checks: checkTypes }];
    }
  };
  const splits: { key: Split; label: string; show: boolean }[] = [
    { key: 'one', label: 'One tab for all of them', show: true },
    { key: 'company', label: `A tab for each company (${customerIds.length})`, show: customerIds.length > 1 },
    { key: 'check', label: `A tab for each check (${checkTypes.length})`, show: checkTypes.length > 1 },
    { key: 'both', label: `A tab for each company and check (${customerIds.length * checkTypes.length})`, show: customerIds.length > 1 && checkTypes.length > 1 },
  ];
  // A split that no longer applies (a company or check was unticked) falls back to one tab.
  const activeSplit: Split = splits.find((s) => s.key === split)?.show ? split : 'one';
  const planned = groups(activeSplit);
  const tooMany = planned.length > MAX_NEW_TABS;

  const create = () => {
    if (tooMany) return;
    const tabs = planned.map((g) => makeTab({
      name: planned.length === 1 && name.trim() ? name.trim() : autoName(g.ids, g.checks),
      view,
      filters: filtersFor(g.ids, g.checks),
    }));
    onCreate(tabs);
    onClose();
  };

  const choice = (active: boolean) => `flex-1 flex items-center justify-center gap-1.5 h-9 rounded-md border text-sm ${active ? 'border-brand-green bg-brand-green-50 text-brand-green font-medium' : 'border-gray-300 text-gray-700'}`;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>New tab</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div>
            <Label className="text-xs text-gray-600">Show</Label>
            <div className="flex gap-2 mt-1">
              <button type="button" className={choice(view === 'cases')} onClick={() => setView('cases')}><List className="w-4 h-4" /> Cases</button>
              <button type="button" className={choice(view === 'analytics')} onClick={() => setView('analytics')}><BarChart3 className="w-4 h-4" /> Analytics</button>
            </div>
          </div>

          {!meta.isClient && (
            <div>
              <Label className="text-xs text-gray-600">Companies</Label>
              <MultiPick
                label="All companies"
                className="w-full mt-1"
                options={meta.customers.map((c) => ({ value: c._id, label: c.companyName }))}
                selected={customerIds}
                onChange={setCustomerIds}
              />
            </div>
          )}

          {meta.showChecks && (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs text-gray-600">Checks</Label>
                <MultiPick
                  label="Any check"
                  className="w-full mt-1"
                  options={meta.checkTypes.map((c) => ({ value: c.key, label: c.label }))}
                  selected={checkTypes}
                  onChange={setCheckTypes}
                />
              </div>
              <div>
                <Label className="text-xs text-gray-600">Check status</Label>
                <MultiPick
                  label="Any status"
                  className="w-full mt-1"
                  options={meta.checkStatuses.filter((s) => s !== 'NA').map((s) => ({ value: s, label: s }))}
                  selected={checkStatuses}
                  onChange={setCheckStatuses}
                />
              </div>
              {(checkTypes.length > 0 || checkStatuses.length > 0) && (
                <p className="col-span-2 text-xs text-gray-500">
                  Cases that have {checkTypes.length ? `a ${checkTypes.map(checkName).join(' / ')} check` : 'a check'}
                  {checkStatuses.length ? ` that is ${checkStatuses.join(' / ')}` : ''}. Checks marked NA do not count.
                </p>
              )}
            </div>
          )}

          {splits.filter((s) => s.show).length > 1 && (
            <div className="space-y-1.5 text-sm">
              <Label className="text-xs text-gray-600">Open as</Label>
              {splits.filter((s) => s.show).map((s) => (
                <label key={s.key} className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" checked={activeSplit === s.key} onChange={() => setSplit(s.key)} />
                  {s.label}
                </label>
              ))}
            </div>
          )}

          {planned.length === 1 ? (
            <div>
              <Label className="text-xs text-gray-600">Tab name</Label>
              <Input className="mt-1" value={name} onChange={(e) => setName(e.target.value)} placeholder={autoName(planned[0].ids, planned[0].checks)} onKeyDown={(e) => { if (e.key === 'Enter') create(); }} />
            </div>
          ) : (
            <p className={`text-xs ${tooMany ? 'text-red-600' : 'text-gray-500'}`}>
              {tooMany
                ? `That would open ${planned.length} tabs — at most ${MAX_NEW_TABS} at a time. Choose fewer companies or checks.`
                : `Opens ${planned.length} tabs, e.g. "${autoName(planned[0].ids, planned[0].checks)}".`}
            </p>
          )}

          <p className="text-xs text-gray-500">Each tab keeps its own filters. You can switch any tab between its cases and its analytics.</p>

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="button" onClick={create} disabled={tooMany}>{planned.length > 1 ? `Open ${planned.length} tabs` : 'Open tab'}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default NewTabDialog;
