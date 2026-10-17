import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AlertTriangle } from 'lucide-react';

// Confirm a bulk removal (super-admins only) by typing the number of cases.

interface Props {
  open: boolean;
  count: number;
  /** e.g. 'in the tab "DBL"' or 'selected' */
  scopeLabel: string;
  busy: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

const BulkDeleteDialog: React.FC<Props> = ({ open, count, scopeLabel, busy, onClose, onConfirm }) => {
  const [typed, setTyped] = useState('');
  useEffect(() => { if (open) setTyped(''); }, [open]);
  const ok = typed.replace(/[,\s]/g, '') === String(count);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !busy && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-700"><AlertTriangle className="w-5 h-5" /> Remove {count.toLocaleString('en-IN')} cases?</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 text-sm">
          <p>
            Every case {scopeLabel} — <strong>{count.toLocaleString('en-IN')}</strong> — is removed from the tracker, analytics and exports.
            You can undo it straight after from the message that appears.
          </p>
          <div>
            <p className="text-xs text-gray-600 mb-1">Type <strong>{count}</strong> to confirm</p>
            <Input autoFocus value={typed} onChange={(e) => setTyped(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && ok && !busy) onConfirm(); }} />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" onClick={onClose} disabled={busy}>Cancel</Button>
            <Button type="button" className="bg-red-600 hover:bg-red-700 text-white" disabled={!ok || busy} onClick={onConfirm}>
              {busy ? 'Removing…' : `Remove ${count.toLocaleString('en-IN')} cases`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BulkDeleteDialog;
