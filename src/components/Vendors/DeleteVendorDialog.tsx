import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { apiService } from '@/services/api';
import { Vendor } from './VendorsTable';

interface DeleteVendorDialogProps {
  open: boolean;
  vendor: Vendor | null;
  onClose: () => void;
  onSuccess: () => void;
}

// Irreversible: deletes the vendor doc + all of its logins (vendor-admin and
// vendor-members). Cases previously assigned to this vendor are KEPT — only
// unlinked — so their vendorWork history stays intact. Requires typing the
// vendor's exact name to reduce accidental clicks on a destructive action.
const DeleteVendorDialog = ({ open, vendor, onClose, onSuccess }: DeleteVendorDialogProps) => {
  const [confirmText, setConfirmText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) setConfirmText('');
  }, [open]);

  if (!vendor) return null;

  const isConfirmed = confirmText.trim() === vendor.name;

  const handleDelete = async () => {
    if (!isConfirmed) return;
    setSubmitting(true);
    try {
      const response = await apiService.permanentlyDeleteVendor(vendor._id);
      if (response.success) {
        alert(response.message || 'Vendor permanently deleted');
        onSuccess();
      } else {
        alert(response.message || 'Failed to delete vendor');
      }
    } catch (error: any) {
      console.error('Permanent vendor delete error:', error);
      alert(error.message || 'Failed to delete vendor');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-red-600">Permanently Delete Vendor</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-gray-700">
            This will permanently delete <strong>{vendor.name}</strong> and{' '}
            {vendor.type === 'company' ? 'all of its team logins' : 'its login'}. This cannot be undone.
          </p>
          <p className="text-sm text-gray-500">
            Cases previously assigned to this vendor will be kept, with all their field-verification
            history intact — they will just no longer show this vendor as assigned.
          </p>
          <div>
            <Label htmlFor="delete-confirm">
              Type <strong>{vendor.name}</strong> to confirm
            </Label>
            <Input
              id="delete-confirm"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder={vendor.name}
              autoFocus
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
              Cancel
            </Button>
            <Button
              type="button"
              disabled={!isConfirmed || submitting}
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700 text-white disabled:opacity-50"
            >
              {submitting ? 'Deleting...' : 'Delete Permanently'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DeleteVendorDialog;
