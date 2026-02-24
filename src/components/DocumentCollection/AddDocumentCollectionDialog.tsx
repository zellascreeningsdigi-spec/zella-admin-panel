import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { apiService } from '@/services/api';
import { DocumentCollection } from '@/types/documentCollection';

interface AddDocumentCollectionDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editCollection?: DocumentCollection | null;
  preselectedCustomerId?: string;
  preselectedCompanyName?: string;
}

interface FormData {
  code: string;
  name: string;
  phone: string;
  email: string;
  customerId: string;
  companyName: string;
}

interface FormErrors {
  [key: string]: string;
}

const AddDocumentCollectionDialog = ({
  open,
  onClose,
  onSuccess,
  editCollection,
  preselectedCustomerId,
  preselectedCompanyName,
}: AddDocumentCollectionDialogProps) => {
  const [formData, setFormData] = useState<FormData>({
    code: '',
    name: '',
    phone: '',
    email: '',
    customerId: '',
    companyName: '',
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [customers, setCustomers] = useState<any[]>([]);
  const [loadingCustomers, setLoadingCustomers] = useState(false);

  useEffect(() => {
    if (open) {
      fetchCustomers();
    }
  }, [open]);

  useEffect(() => {
    if (editCollection && open) {
      setFormData({
        code: editCollection.code || '',
        name: editCollection.name || '',
        phone: editCollection.phone || '',
        email: editCollection.email || '',
        customerId: editCollection.customerId || '',
        companyName: editCollection.companyName || '',
      });
    } else if (!editCollection && open) {
      setFormData({
        code: '',
        name: '',
        phone: '',
        email: '',
        customerId: preselectedCustomerId || '',
        companyName: preselectedCompanyName || '',
      });
      setErrors({});
    }
  }, [editCollection, open, preselectedCustomerId, preselectedCompanyName]);

  const fetchCustomers = async () => {
    try {
      setLoadingCustomers(true);
      const response = await apiService.getCustomers({ limit: 200 });
      if (response.success && response.data) {
        setCustomers(response.data.customers || []);
      }
    } catch (error) {
      console.error('Failed to fetch customers:', error);
    } finally {
      setLoadingCustomers(false);
    }
  };

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  const handleCustomerChange = (customerId: string) => {
    const customer = customers.find((c) => c._id === customerId);
    setFormData((prev) => ({
      ...prev,
      customerId,
      companyName: customer ? customer.companyName : '',
    }));
    if (errors.customerId) {
      setErrors((prev) => ({ ...prev, customerId: '' }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.code.trim()) newErrors.code = 'Code is required';
    if (!formData.name.trim()) newErrors.name = 'Candidate name is required';
    if (!formData.phone.trim()) newErrors.phone = 'Phone is required';
    else if (!/^\d{10}$/.test(formData.phone.replace(/\D/g, ''))) {
      newErrors.phone = 'Phone must be 10 digits';
    }
    if (!formData.email.trim()) newErrors.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }
    if (!formData.customerId) newErrors.customerId = 'Company is required';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsSubmitting(true);

    try {
      let response;
      if (editCollection?._id) {
        response = await apiService.updateDocumentCollection(editCollection._id, formData);
      } else {
        response = await apiService.createDocumentCollection(formData);
      }

      if (response.success) {
        alert(
          editCollection
            ? 'Document collection updated successfully!'
            : 'Document collection created successfully!'
        );
        onSuccess();
      } else {
        alert(response.message || 'Failed to save');
      }
    } catch (error: any) {
      console.error('Submit error:', error);
      alert(error.message || 'Failed to save');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editCollection ? 'Edit Document Collection' : 'Add Document Collection'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="dc-code">
              Code <span className="text-red-500">*</span>
            </Label>
            <Input
              id="dc-code"
              value={formData.code}
              onChange={(e) => handleInputChange('code', e.target.value)}
              placeholder="e.g., DC001"
            />
            {errors.code && <p className="text-sm text-red-500 mt-1">{errors.code}</p>}
          </div>

          <div>
            <Label htmlFor="dc-name">
              Candidate Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="dc-name"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              placeholder="Full name"
            />
            {errors.name && <p className="text-sm text-red-500 mt-1">{errors.name}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="dc-phone">
                Phone <span className="text-red-500">*</span>
              </Label>
              <Input
                id="dc-phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                placeholder="10-digit mobile"
              />
              {errors.phone && <p className="text-sm text-red-500 mt-1">{errors.phone}</p>}
            </div>

            <div>
              <Label htmlFor="dc-email">
                Email <span className="text-red-500">*</span>
              </Label>
              <Input
                id="dc-email"
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                placeholder="candidate@example.com"
              />
              {errors.email && <p className="text-sm text-red-500 mt-1">{errors.email}</p>}
            </div>
          </div>

          <div>
            <Label htmlFor="dc-company">
              Company <span className="text-red-500">*</span>
            </Label>
            {preselectedCustomerId && !editCollection ? (
              <div className="w-full px-3 py-2 border border-gray-200 rounded-md bg-gray-50 text-gray-700">
                {preselectedCompanyName}
              </div>
            ) : (
              <select
                id="dc-company"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={formData.customerId}
                onChange={(e) => handleCustomerChange(e.target.value)}
                disabled={loadingCustomers}
              >
                <option value="">{loadingCustomers ? 'Loading companies...' : 'Select a company'}</option>
                {customers.map((customer) => (
                  <option key={customer._id} value={customer._id}>
                    {customer.companyName}
                  </option>
                ))}
              </select>
            )}
            {errors.customerId && (
              <p className="text-sm text-red-500 mt-1">{errors.customerId}</p>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : editCollection ? 'Update' : 'Create'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddDocumentCollectionDialog;
