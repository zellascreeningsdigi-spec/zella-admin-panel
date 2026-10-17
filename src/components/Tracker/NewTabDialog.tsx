import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { BarChart3, List } from 'lucide-react';
import MultiPick from './MultiPick';
import { TrackerMeta, TrackerTabState, makeTab } from './trackerTypes';

// Open new tracker tabs: cases or analytics, for chosen companies — either
// one tab for all of them together, or a separate tab for each.

interface Props {
  meta: TrackerMeta;
  open: boolean;
  onClose: () => void;
  onCreate: (tabs: TrackerTabState[]) => void;
}

const NewTabDialog: React.FC<Props> = ({ meta, open, onClose, onCreate }) => {
  const [view, setView] = useState<'cases' | 'analytics'>('cases');
  const [customerIds, setCustomerIds] = useState<string[]>([]);
  const [separate, setSeparate] = useState(false);
  const [name, setName] = useState('');

  useEffect(() => {
    if (open) { setView('cases'); setCustomerIds([]); setSeparate(false); setName(''); }
  }, [open]);

  const nameOf = (id: string) => meta.customers.find((c) => c._id === id)?.companyName || 'Company';
  const several = customerIds.length > 1;
  const oneTabName = () => {
    if (name.trim()) return name.trim();
    if (customerIds.length === 0) return view === 'analytics' ? 'Analytics' : 'All companies';
    return customerIds.length === 1 ? nameOf(customerIds[0]) : `${nameOf(customerIds[0])} +${customerIds.length - 1}`;
  };

  const create = () => {
    const tabs = several && separate
      ? customerIds.map((id) => makeTab({ name: nameOf(id), view, filters: { customerIds: [id] } }))
      : [makeTab({ name: oneTabName(), view, filters: customerIds.length ? { customerIds } : {} })];
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
              {several && (
                <div className="mt-2 space-y-1.5 text-sm">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" checked={!separate} onChange={() => setSeparate(false)} />
                    One tab for all {customerIds.length} companies
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" checked={separate} onChange={() => setSeparate(true)} />
                    A separate tab for each company ({customerIds.length} tabs)
                  </label>
                </div>
              )}
            </div>
          )}

          {!(several && separate) && (
            <div>
              <Label className="text-xs text-gray-600">Tab name</Label>
              <Input className="mt-1" value={name} onChange={(e) => setName(e.target.value)} placeholder={oneTabName()} onKeyDown={(e) => { if (e.key === 'Enter') create(); }} />
            </div>
          )}

          <p className="text-xs text-gray-500">Each tab keeps its own filters. You can switch any tab between its cases and its analytics.</p>

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="button" onClick={create}>{several && separate ? `Open ${customerIds.length} tabs` : 'Open tab'}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default NewTabDialog;
