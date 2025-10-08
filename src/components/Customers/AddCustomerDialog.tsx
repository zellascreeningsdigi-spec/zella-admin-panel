import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { apiService } from '@/services/api';
import { Customer } from '@/types/customer';
import { X } from 'lucide-react';
import React, { useEffect, useState } from 'react';

interface AddCustomerDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onCustomerAdded: () => void;
  editCustomer?: Customer | null;
  onCustomerUpdated?: () => void;
}

interface CustomerFormData {
  companyName: string;
  emails: string[];
  documentsRequired: string;
}

const AddCustomerDialog: React.FC<AddCustomerDialogProps> = ({
  isOpen,
  onClose,
  onCustomerAdded,
  editCustomer,
  onCustomerUpdated
}) => {
  const [formData, setFormData] = useState<CustomerFormData>({
    companyName: '',
    emails: [''],
    documentsRequired: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<{ companyName?: string; emails?: string; documentsRequired?: string }>({});

  // Populate form when editCustomer is provided
  useEffect(() => {
    if (editCustomer && isOpen) {
      setFormData({
        companyName: editCustomer.companyName || '',
        emails: editCustomer.emails && editCustomer.emails.length > 0 ? [...editCustomer.emails] : [''],
        documentsRequired: editCustomer.documentsRequired ? editCustomer.documentsRequired.join(', ') : ''
      });
    } else if (!editCustomer && isOpen) {
      // Reset form for new customer
      setFormData({
        companyName: '',
        emails: [''],
        documentsRequired: ''
      });
    }
    setErrors({});
  }, [editCustomer, isOpen]);

  const handleInputChange = (field: keyof CustomerFormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: undefined
      }));
    }
  };

  const handleEmailChange = (index: number, value: string) => {
    const newEmails = [...formData.emails];
    newEmails[index] = value;
    setFormData(prev => ({
      ...prev,
      emails: newEmails
    }));

    // Clear error when user starts typing
    if (errors.emails) {
      setErrors(prev => ({
        ...prev,
        emails: undefined
      }));
    }
  };

  const addEmailField = () => {
    setFormData(prev => ({
      ...prev,
      emails: [...prev.emails, '']
    }));
  };

  const removeEmailField = (index: number) => {
    if (formData.emails.length > 1) {
      const newEmails = formData.emails.filter((_, i) => i !== index);
      setFormData(prev => ({
        ...prev,
        emails: newEmails
      }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: { companyName?: string; emails?: string } = {};

    // Validate company name
    if (!formData.companyName.trim()) {
      newErrors.companyName = 'Company name is required';
    }

    // Validate emails
    const validEmails = formData.emails.filter(email => email.trim() !== '');
    if (validEmails.length === 0) {
      newErrors.emails = 'At least one email is required';
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const invalidEmails = validEmails.filter(email => !emailRegex.test(email));
      if (invalidEmails.length > 0) {
        newErrors.emails = 'All emails must be valid';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      // Filter out empty emails
      const validEmails = formData.emails.filter(email => email.trim() !== '');

      const customerData = {
        companyName: formData.companyName,
        emails: validEmails,
        documentsRequired: formData.documentsRequired
      };

      let response;
      if (editCustomer) {
        response = await apiService.updateCustomer(editCustomer._id!, customerData);
      } else {
        response = await apiService.createCustomer(customerData);
      }

      if (response.success) {
        if (editCustomer) {
          onCustomerUpdated?.();
        } else {
          onCustomerAdded();
        }
        onClose();
      } else {
        throw new Error(response.message || 'Failed to save customer');
      }
    } catch (error) {
      console.error('Error saving customer:', error);
      alert(`Error saving customer: ${error instanceof Error ? error.message : 'Please try again.'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editCustomer ? 'Edit Customer' : 'Add New Customer'}</DialogTitle>
          <DialogDescription>
            {editCustomer ? 'Update customer information' : 'Enter customer information to create a new customer'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            {/* Company Name */}
            <div className="space-y-2">
              <Label htmlFor="companyName">
                Company Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="companyName"
                value={formData.companyName}
                onChange={(e) => handleInputChange('companyName', e.target.value)}
                placeholder="Enter company name"
              />
              {errors.companyName && (
                <p className="text-sm text-red-500">{errors.companyName}</p>
              )}
            </div>

            {/* Emails */}
            <div className="space-y-2">
              <Label>
                Emails <span className="text-red-500">*</span>
              </Label>
              {formData.emails.map((email, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <Input
                    value={email}
                    onChange={(e) => handleEmailChange(index, e.target.value)}
                    placeholder="Enter email address"
                    type="email"
                  />
                  {formData.emails.length > 1 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removeEmailField(index)}
                      className="hover:bg-red-50 hover:border-red-200"
                    >
                      <X className="h-4 w-4 text-red-600" />
                    </Button>
                  )}
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addEmailField}
              >
                Add Another Email
              </Button>
              {errors.emails && (
                <p className="text-sm text-red-500">{errors.emails}</p>
              )}
            </div>

            {/* Documents Required */}
            <div className="space-y-2">
              <Label htmlFor="documentsRequired">
                Documents Required
              </Label>
              <Input
                id="documentsRequired"
                value={formData.documentsRequired}
                onChange={(e) => handleInputChange('documentsRequired', e.target.value)}
                placeholder="e.g., Aadhaar Card, PAN Card, Passport (comma-separated)"
              />
              <p className="text-xs text-gray-500">
                Enter document names separated by commas. These will be shown to customers for upload.
              </p>
              {errors.documentsRequired && (
                <p className="text-sm text-red-500">{errors.documentsRequired}</p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (editCustomer ? 'Updating...' : 'Adding...') : (editCustomer ? 'Update Customer' : 'Add Customer')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddCustomerDialog;
