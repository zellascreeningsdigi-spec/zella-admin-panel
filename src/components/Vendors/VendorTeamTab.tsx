import { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { apiService } from '@/services/api';

interface Member {
  _id: string;
  name: string;
  email: string;
  isActive: boolean;
  lastLogin?: string;
}

// Team management for a company vendor-admin. Independent vendors never see this
// (the sidebar item is hidden), but we also guard here on the vendor's type.
const VendorTeamTab = () => {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [vendorType, setVendorType] = useState<string>('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ name: '', email: '' });
  const [errors, setErrors] = useState<{ name?: string; email?: string }>({});
  const [submitting, setSubmitting] = useState(false);

  const fetchMembers = useCallback(async () => {
    try {
      setLoading(true);
      const [membersRes, vendorRes] = await Promise.all([
        apiService.getVendorMembers(),
        apiService.getMyVendor(),
      ]);
      if (membersRes.success && membersRes.data) setMembers(membersRes.data.members || []);
      if (vendorRes.success && vendorRes.data) setVendorType(vendorRes.data.vendor?.type || '');
    } catch (error) {
      console.error('Failed to load team:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const next: { name?: string; email?: string } = {};
    if (!form.name.trim()) next.name = 'Name is required';
    if (!form.email.trim()) next.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) next.email = 'Invalid email';
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setSubmitting(true);
    try {
      const res = await apiService.addVendorMember({ name: form.name.trim(), email: form.email.trim() });
      if (res.success) {
        alert(res.message || 'Team member added');
        setForm({ name: '', email: '' });
        setDialogOpen(false);
        fetchMembers();
      } else {
        alert(res.message || 'Failed to add member');
      }
    } catch (error: any) {
      alert(error.message || 'Failed to add member');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeactivate = async (member: Member) => {
    if (!window.confirm(`Deactivate ${member.name}? Their login will be disabled.`)) return;
    try {
      const res = await apiService.deleteVendorMember(member._id);
      if (res.success) fetchMembers();
      else alert(res.message || 'Failed to deactivate');
    } catch (error: any) {
      alert(error.message || 'Failed to deactivate');
    }
  };

  if (!loading && vendorType && vendorType !== 'company') {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        Team management is only available for company vendors.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold">Team</h2>
          <p className="text-sm sm:text-base text-gray-500">
            Add team members. Each gets a login with a default password and is asked to reset it on
            first sign-in. You can then assign cases to them.
          </p>
        </div>
        <Button className="w-full sm:w-auto" onClick={() => setDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Member
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64 text-gray-500">Loading team...</div>
      ) : members.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed border-gray-300 rounded-lg">
          <div className="text-lg font-medium text-gray-500">No team members yet</div>
          <div className="text-sm text-gray-400 mt-2">Click "Add Member" to create one</div>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="rounded-md border hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map((m) => (
                  <TableRow key={m._id}>
                    <TableCell className="font-medium">{m.name}</TableCell>
                    <TableCell>{m.email}</TableCell>
                    <TableCell>
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          m.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {m.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </TableCell>
                    <TableCell>
                      {m.isActive && (
                        <Button variant="ghost" size="sm" onClick={() => handleDeactivate(m)} title="Deactivate">
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {members.map((m) => (
              <div key={m._id} className="border rounded-md p-3 space-y-2 bg-white">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-medium">{m.name}</div>
                    <div className="text-sm text-gray-500 break-all">{m.email}</div>
                  </div>
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
                      m.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {m.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
                {m.isActive && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full text-red-600"
                    onClick={() => handleDeactivate(m)}
                  >
                    <Trash2 className="w-4 h-4 mr-2" /> Deactivate
                  </Button>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Team Member</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAdd} className="space-y-4">
            <div>
              <Label htmlFor="member-name">Name <span className="text-red-500">*</span></Label>
              <Input
                id="member-name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Member name"
              />
              {errors.name && <p className="text-sm text-red-500 mt-1">{errors.name}</p>}
            </div>
            <div>
              <Label htmlFor="member-email">Email <span className="text-red-500">*</span></Label>
              <Input
                id="member-email"
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="member@example.com"
              />
              {errors.email && <p className="text-sm text-red-500 mt-1">{errors.email}</p>}
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} disabled={submitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Adding...' : 'Add Member'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default VendorTeamTab;
