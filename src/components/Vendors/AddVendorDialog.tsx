import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import MultiSelectCombobox from '@/components/ui/multi-select-combobox';
import { INDIAN_STATES } from '@/data/indianCities';
import { apiService } from '@/services/api';

interface Vendor {
  _id?: string;
  name?: string;
  email?: string;
  companyName?: string;
  phone?: string;
  description?: string;
  gstin?: string;
  addressVerificationPrice?: number;
  isActive?: boolean;
  type?: 'independent' | 'company';
  locations?: string[];
}

interface AddVendorDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editVendor?: Vendor | null;
}

interface FormData {
  name: string;
  email: string;
  companyName: string;
  phone: string;
  description: string;
  gstin: string;
  addressVerificationPrice: string;
  type: 'independent' | 'company';
}

interface FormErrors {
  [key: string]: string;
}

const emptyForm: FormData = {
  name: '',
  email: '',
  companyName: '',
  phone: '',
  description: '',
  gstin: '',
  addressVerificationPrice: '',
  type: 'independent',
};

const AddVendorDialog = ({ open, onClose, onSuccess, editVendor }: AddVendorDialogProps) => {
  const [formData, setFormData] = useState<FormData>(emptyForm);
  const [locations, setLocations] = useState<string[]>([]);
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (open && editVendor) {
      setFormData({
        name: editVendor.name || '',
        email: editVendor.email || '',
        companyName: editVendor.companyName || '',
        phone: editVendor.phone || '',
        description: editVendor.description || '',
        gstin: editVendor.gstin || '',
        addressVerificationPrice:
          editVendor.addressVerificationPrice != null
            ? String(editVendor.addressVerificationPrice)
            : '',
        type: editVendor.type || 'independent',
      });
      setLocations(editVendor.locations || []);
      setErrors({});
    } else if (open && !editVendor) {
      setFormData(emptyForm);
      setLocations([]);
      setErrors({});
    }
  }, [open, editVendor]);

  const handleChange = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: '' }));
  };

  const validate = (): boolean => {
    const next: FormErrors = {};
    if (!formData.name.trim()) next.name = 'Vendor name is required';
    if (!formData.email.trim()) next.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      next.email = 'Invalid email format';
    }
    if (formData.phone.trim() && !/^\d{10}$/.test(formData.phone.replace(/\D/g, ''))) {
      next.phone = 'Phone must be 10 digits';
    }
    if (formData.addressVerificationPrice === '') {
      next.addressVerificationPrice = 'Price is required';
    } else {
      const price = Number(formData.addressVerificationPrice);
      if (Number.isNaN(price) || price < 0) {
        next.addressVerificationPrice = 'Price must be a number ≥ 0';
      }
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      const payload = {
        name: formData.name.trim(),
        email: formData.email.trim(),
        companyName: formData.companyName.trim(),
        phone: formData.phone.trim(),
        description: formData.description.trim(),
        gstin: formData.gstin.trim(),
        addressVerificationPrice: Number(formData.addressVerificationPrice),
        type: formData.type,
        locations,
      };

      const response = editVendor?._id
        ? await apiService.updateVendor(editVendor._id, payload)
        : await apiService.createVendor(payload);

      if (response.success) {
        alert(
          editVendor
            ? 'Vendor updated successfully!'
            : (response.message || 'Vendor created successfully!')
        );
        onSuccess();
      } else {
        alert(response.message || 'Failed to save vendor');
      }
    } catch (error: any) {
      console.error('Vendor submit error:', error);
      alert(error.message || 'Failed to save vendor');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editVendor ? 'Edit Vendor' : 'Add Vendor'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="vendor-name">
              Vendor Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="vendor-name"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              placeholder="e.g., ABC Field Services"
            />
            {errors.name && <p className="text-sm text-red-500 mt-1">{errors.name}</p>}
          </div>

          <div>
            <Label htmlFor="vendor-type">
              Vendor Type <span className="text-red-500">*</span>
            </Label>
            <select
              id="vendor-type"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={formData.type}
              onChange={(e) => handleChange('type', e.target.value as FormData['type'])}
            >
              <option value="independent">Independent (works alone)</option>
              <option value="company">Company (can add team members)</option>
            </select>
            <p className="text-xs text-gray-400 mt-1">
              Company vendors can add their own team members and assign cases to them.
            </p>
          </div>

          <div>
            <Label htmlFor="vendor-email">
              Email <span className="text-red-500">*</span>
            </Label>
            <Input
              id="vendor-email"
              type="email"
              value={formData.email}
              onChange={(e) => handleChange('email', e.target.value)}
              placeholder="vendor@example.com"
              disabled={!!editVendor}
            />
            {editVendor && (
              <p className="text-xs text-gray-400 mt-1">
                Email changes also update the vendor's login account.
              </p>
            )}
            {errors.email && <p className="text-sm text-red-500 mt-1">{errors.email}</p>}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="vendor-company">Company Name</Label>
              <Input
                id="vendor-company"
                value={formData.companyName}
                onChange={(e) => handleChange('companyName', e.target.value)}
                placeholder="e.g., ABC Pvt Ltd"
              />
            </div>
            <div>
              <Label htmlFor="vendor-phone">Phone Number</Label>
              <Input
                id="vendor-phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
                placeholder="10-digit mobile"
              />
              {errors.phone && <p className="text-sm text-red-500 mt-1">{errors.phone}</p>}
            </div>
          </div>

          <div>
            <Label htmlFor="vendor-locations">Locations (states operated in)</Label>
            <MultiSelectCombobox
              options={INDIAN_STATES}
              selected={locations}
              onChange={setLocations}
              placeholder="Select states…"
              searchPlaceholder="Search states…"
            />
            <p className="text-xs text-gray-400 mt-1">
              Used to filter vendors by location when assigning cases.
            </p>
          </div>

          <div>
            <Label htmlFor="vendor-description">Description</Label>
            <textarea
              id="vendor-description"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={2}
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              placeholder="Optional notes about this vendor"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="vendor-gstin">GSTIN</Label>
              <Input
                id="vendor-gstin"
                value={formData.gstin}
                onChange={(e) => handleChange('gstin', e.target.value.toUpperCase())}
                placeholder="Optional"
                maxLength={15}
              />
            </div>

            <div>
              <Label htmlFor="vendor-price">
                Price / Case (₹) <span className="text-red-500">*</span>
              </Label>
              <Input
                id="vendor-price"
                type="number"
                min={0}
                step="0.01"
                value={formData.addressVerificationPrice}
                onChange={(e) => handleChange('addressVerificationPrice', e.target.value)}
                placeholder="e.g., 250"
              />
              {errors.addressVerificationPrice && (
                <p className="text-sm text-red-500 mt-1">{errors.addressVerificationPrice}</p>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : editVendor ? 'Update' : 'Create'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddVendorDialog;
