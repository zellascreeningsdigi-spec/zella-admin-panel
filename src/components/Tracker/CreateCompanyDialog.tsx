import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertCircle, Info } from 'lucide-react';
import { apiService } from '@/services/api';

// Create a company on the platform without leaving the tracker. Only the
// company is created — no logins. Logins are created when the company is
// sent its login email from Datahub, as for every company.

export interface CreatedCompany {
  _id: string;
  companyName: string;
}

interface Props {
  open: boolean;
  initialName: string;
  existingNames: string[];
  onClose: () => void;
  onCreated: (company: CreatedCompany) => void;
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const CreateCompanyDialog: React.FC<Props> = ({ open, initialName, existingNames, onClose, onCreated }) => {
  const [name, setName] = useState('');
  const [emails, setEmails] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) { setName(initialName); setEmails(''); setError(null); }
  }, [open, initialName]);

  const create = async () => {
    setError(null);
    const companyName = name.trim();
    const list = emails.split(/[\s,;]+/).map((e) => e.trim()).filter(Boolean);
    if (!companyName) { setError('Enter the company name'); return; }
    if (existingNames.some((n) => n.trim().toLowerCase() === companyName.toLowerCase())) {
      setError(`"${companyName}" already exists — pick it from the list instead`);
      return;
    }
    if (list.length === 0) { setError('Add at least one email for the company'); return; }
    const bad = list.filter((e) => !EMAIL.test(e));
    if (bad.length) { setError(`Not a valid email: ${bad.join(', ')}`); return; }
    try {
      setBusy(true);
      const r: any = await apiService.createTrackerCompany({ companyName, emails: list });
      const c = r.data;
      if (!c?._id) throw new Error(r.message || 'Could not create the company');
      onCreated({ _id: c._id, companyName: c.companyName });
      onClose();
    } catch (e: any) {
      setError(e.message || 'Could not create the company');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !busy && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Create new company</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-xs text-gray-600">Company name <span className="text-red-500">*</span></Label>
            <Input className="mt-1" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
          </div>
          <div>
            <Label className="text-xs text-gray-600">Company email(s) <span className="text-red-500">*</span></Label>
            <Input
              className="mt-1"
              value={emails}
              onChange={(e) => setEmails(e.target.value)}
              placeholder="hr@company.com, spoc@company.com"
              onKeyDown={(e) => { if (e.key === 'Enter') create(); }}
            />
          </div>
          <p className="text-xs text-gray-600 bg-gray-50 rounded-md p-2 flex gap-1.5">
            <Info className="w-3.5 h-3.5 shrink-0 mt-0.5 text-gray-400" />
            <span>
              Only the company is created — no logins and no emails. When you are ready, send the login email from
              Datahub; the logins are created then.
            </span>
          </p>
          {error && <p className="text-sm text-red-600 flex items-center gap-1"><AlertCircle className="w-4 h-4" /> {error}</p>}
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" onClick={onClose} disabled={busy}>Cancel</Button>
            <Button type="button" onClick={create} disabled={busy}>{busy ? 'Creating…' : 'Create company'}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CreateCompanyDialog;
