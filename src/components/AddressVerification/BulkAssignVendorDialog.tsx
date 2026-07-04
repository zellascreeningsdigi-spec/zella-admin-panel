import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import SearchableSelect from '@/components/ui/searchable-select';
import { INDIAN_CITIES } from '@/data/indianCities';
import { apiService } from '@/services/api';

interface VendorOption {
  _id: string;
  name: string;
  email: string;
  addressVerificationPrice?: number;
  locations?: string[];
}

interface BulkAssignVendorDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  caseIds: string[];
  // Only super-admins may see/set the batch price.
  canSetPrice?: boolean;
}

// Assign a selection of cases to ONE vendor for the whole batch. Super-admins
// may also set a batch price; otherwise it defaults to the vendor's rate.
const BulkAssignVendorDialog = ({ open, onClose, onSuccess, caseIds, canSetPrice = false }: BulkAssignVendorDialogProps) => {
  const [vendors, setVendors] = useState<VendorOption[]>([]);
  const [vendor, setVendor] = useState('');
  const [price, setPrice] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [errors, setErrors] = useState<{ vendor?: string; price?: string }>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setVendor('');
    setPrice('');
    setLocationFilter('');
    setErrors({});
  }, [open]);

  // Refetch vendors whenever the dialog opens or the location filter changes.
  useEffect(() => {
    if (!open) return;
    (async () => {
      try {
        const res = await apiService.getVendors({
          isActive: true,
          limit: 200,
          ...(locationFilter ? { location: locationFilter } : {}),
        });
        if (res.success && res.data) setVendors(res.data.vendors || []);
      } catch (e) {
        console.error('Failed to load vendors:', e);
      }
    })();
  }, [open, locationFilter]);

  const handleVendorChange = (vid: string) => {
    setVendor(vid);
    const v = vendors.find((x) => x._id === vid);
    if (price === '' && v?.addressVerificationPrice != null) {
      setPrice(String(v.addressVerificationPrice));
    }
    if (errors.vendor) setErrors((p) => ({ ...p, vendor: '' }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const next: { vendor?: string; price?: string } = {};
    if (!vendor) next.vendor = 'Vendor is required';
    if (canSetPrice) {
      if (price === '') next.price = 'Price is required';
      else {
        const p = Number(price);
        if (Number.isNaN(p) || p < 0) next.price = 'Price must be a number ≥ 0';
      }
    }
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setSubmitting(true);
    try {
      const res = await apiService.bulkAssignVendor(caseIds, vendor, canSetPrice ? Number(price) : null);
      if (res.success) {
        alert(res.message || 'Cases assigned');
        onSuccess();
      } else {
        alert(res.message || 'Failed to assign');
      }
    } catch (err: any) {
      alert(err.message || 'Failed to assign');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Assign {caseIds.length} case{caseIds.length === 1 ? '' : 's'} to a vendor</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="bulk-vendor-location">Filter Vendors by Location</Label>
            <SearchableSelect
              options={INDIAN_CITIES}
              value={locationFilter}
              onChange={setLocationFilter}
              placeholder="All locations"
              allLabel="All locations"
              searchPlaceholder="Search cities…"
            />
          </div>
          <div>
            <Label htmlFor="bulk-vendor">Vendor <span className="text-red-500">*</span></Label>
            <select
              id="bulk-vendor"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={vendor}
              onChange={(e) => handleVendorChange(e.target.value)}
            >
              <option value="">— Select vendor —</option>
              {vendors.map((v) => (
                <option key={v._id} value={v._id}>{v.name} ({v.email})</option>
              ))}
            </select>
            {errors.vendor && <p className="text-sm text-red-500 mt-1">{errors.vendor}</p>}
          </div>
          {canSetPrice ? (
            <div>
              <Label htmlFor="bulk-price">Price per case (₹) <span className="text-red-500">*</span></Label>
              <Input
                id="bulk-price"
                type="number"
                min={0}
                step="0.01"
                value={price}
                onChange={(e) => { setPrice(e.target.value); if (errors.price) setErrors((p) => ({ ...p, price: '' })); }}
                placeholder="e.g., 250"
              />
              {errors.price && <p className="text-sm text-red-500 mt-1">{errors.price}</p>}
              <p className="text-xs text-gray-400 mt-1">This price applies to every selected case.</p>
            </div>
          ) : (
            <p className="text-xs text-gray-400">Each case uses the vendor's default price.</p>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>Cancel</Button>
            <Button type="submit" disabled={submitting}>{submitting ? 'Assigning...' : 'Assign'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default BulkAssignVendorDialog;
