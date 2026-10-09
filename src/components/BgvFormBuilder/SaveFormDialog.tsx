import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertTriangle, Loader2 } from 'lucide-react';
import type { TemplateImpact } from '@/lib/bgvForm/types';

// Confirm a save: what it changes, who it reaches, and what to do about
// candidates already holding a link.

export interface SaveOptions {
  note: string;
  applyToNotStarted: boolean;
  reissueStarted: boolean;
}

interface SaveFormDialogProps {
  open: boolean;
  ownerType: 'company' | 'group';
  impact: TemplateImpact | null;
  saving: boolean;
  onCancel: () => void;
  onConfirm: (options: SaveOptions) => void;
}

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

const SaveFormDialog: React.FC<SaveFormDialogProps> = ({ open, ownerType, impact, saving, onCancel, onConfirm }) => {
  const [note, setNote] = useState('');
  const [applyToNotStarted, setApplyToNotStarted] = useState(false);
  const [reissueStarted, setReissueStarted] = useState(false);

  const diff = impact?.diff;
  const hasDiff = !!diff && (diff.added.length || diff.removed.length || diff.newlyRequired.length || diff.stepsRemoved.length);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !saving && onCancel()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Save this form?</DialogTitle>
        </DialogHeader>

        {!impact ? (
          <p className="text-sm text-gray-500 flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Checking who this affects…</p>
        ) : (
          <div className="space-y-4 text-sm">
            <p className="text-gray-700">
              New candidates {ownerType === 'company' ? 'of this company' : 'in this group'} get this form. Candidates who have already submitted are never affected.
            </p>

            {hasDiff ? (
              <ul className="text-xs text-gray-600 list-disc pl-4 space-y-0.5">
                {diff!.stepsRemoved.length > 0 && <li>Steps removed: {diff!.stepsRemoved.join(', ')}</li>}
                {diff!.added.length > 0 && <li>{plural(diff!.added.length, 'field')} added</li>}
                {diff!.removed.length > 0 && <li>{plural(diff!.removed.length, 'field')} removed or hidden</li>}
                {diff!.newlyRequired.length > 0 && <li>Now required: {diff!.newlyRequired.slice(0, 6).map((f) => f.label.slice(0, 40)).join(', ')}{diff!.newlyRequired.length > 6 ? '…' : ''}</li>}
              </ul>
            ) : (
              <p className="text-xs text-gray-500">Wording or layout changes only.</p>
            )}

            {impact.pendingCount > 0 && (
              <div className="rounded-md border border-gray-200 p-3 space-y-2">
                <p className="font-medium text-gray-800">{plural(impact.pendingCount, 'candidate')} with an open link</p>
                {impact.liveCount > 0 && (
                  <p className="text-xs text-gray-600">
                    {plural(impact.liveCount, 'candidate')} in groups using this form will see the change straight away.
                    Anything newly required stays optional for those who already started, so nobody is blocked.
                  </p>
                )}
                {impact.pinnedCount > 0 && (
                  <p className="text-xs text-gray-600">
                    {plural(impact.pinnedCount, 'candidate')} keep the form they were sent, unless you choose below.
                  </p>
                )}
                {impact.dataHiddenCount > 0 && (
                  <p className="text-xs text-amber-700 flex items-start gap-1">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    {plural(impact.dataHiddenCount, 'candidate')} entered answers this change removes from the form. The answers are kept and stay visible to admins.
                  </p>
                )}

                {impact.notStartedCount > 0 && (
                  <label className="flex items-start gap-2 cursor-pointer pt-1">
                    <input type="checkbox" className="mt-0.5 h-4 w-4" checked={applyToNotStarted} onChange={(e) => setApplyToNotStarted(e.target.checked)} />
                    <span>
                      Move the {plural(impact.notStartedCount, 'candidate')} who haven’t started yet to this form
                      <span className="block text-[11px] text-gray-500">Their link stays the same. Nothing is lost.</span>
                    </span>
                  </label>
                )}
                {impact.startedCount > 0 && (
                  <label className="flex items-start gap-2 cursor-pointer">
                    <input type="checkbox" className="mt-0.5 h-4 w-4" checked={reissueStarted} onChange={(e) => setReissueStarted(e.target.checked)} />
                    <span>
                      Send a new link to the {plural(impact.startedCount, 'candidate')} who already started
                      <span className="block text-[11px] text-amber-700">
                        Their old link stops working and they fill the new form from the beginning. What they entered is archived, not deleted.
                      </span>
                    </span>
                  </label>
                )}
              </div>
            )}

            <div>
              <Label className="text-xs text-gray-600">What changed? (shown in version history)</Label>
              <Input className="mt-1 h-8 text-sm" maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Added blood group for site staff" />
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="outline" onClick={onCancel} disabled={saving}>Keep editing</Button>
              <Button
                type="button"
                onClick={() => onConfirm({ note, applyToNotStarted, reissueStarted })}
                disabled={saving}
                className={reissueStarted ? 'bg-amber-600 hover:bg-amber-700' : ''}
              >
                {saving ? 'Saving…' : reissueStarted ? 'Save and send new links' : 'Save form'}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default SaveFormDialog;
