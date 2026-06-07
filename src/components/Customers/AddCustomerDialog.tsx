import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
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
  allowedIpAddresses: string[];
  sendPasswordExpiryReminders: boolean;
}

const AddCustomerDialog: React.FC<AddCustomerDialogProps> = ({
  isOpen,
  onClose,
  onCustomerAdded,
  editCustomer,
  onCustomerUpdated
}) => {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'super-admin';

  const [formData, setFormData] = useState<CustomerFormData>({
    companyName: '',
    emails: [''],
    documentsRequired: '',
    allowedIpAddresses: [],
    sendPasswordExpiryReminders: false
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof CustomerFormData, string>>>({});

  // Populate form when editCustomer is provided
  useEffect(() => {
    if (editCustomer && isOpen) {
      setFormData({
        companyName: editCustomer.companyName || '',
        emails: editCustomer.emails && editCustomer.emails.length > 0 ? [...editCustomer.emails] : [''],
        documentsRequired: '', // Not editable in edit mode
        allowedIpAddresses: editCustomer.allowedIpAddresses && editCustomer.allowedIpAddresses.length > 0 ? [...editCustomer.allowedIpAddresses] : [],
        sendPasswordExpiryReminders: editCustomer.sendPasswordExpiryReminders ?? false
      });
    } else if (!editCustomer && isOpen) {
      // Reset form for new customer
      setFormData({
        companyName: '',
        emails: [''],
        documentsRequired: '',
        allowedIpAddresses: [],
        sendPasswordExpiryReminders: false
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

  const handleIpChange = (index: number, value: string) => {
    const newIps = [...formData.allowedIpAddresses];
    newIps[index] = value;
    setFormData(prev => ({ ...prev, allowedIpAddresses: newIps }));
  };

  const addIpField = () => {
    setFormData(prev => ({ ...prev, allowedIpAddresses: [...prev.allowedIpAddresses, ''] }));
  };

  const removeIpField = (index: number) => {
    setFormData(prev => ({
      ...prev,
      allowedIpAddresses: prev.allowedIpAddresses.filter((_, i) => i !== index)
    }));
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
      } else if (
        validEmails.some(e => e.trim().toLowerCase() === 'ashish@zellascreenings.com')
      ) {
        // Mirrors the backend guard — keep the user from typing the reserved owner email.
        newErrors.emails = 'ashish@zellascreenings.com is a reserved internal account and cannot be added as a company email.';
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

      const validIps = formData.allowedIpAddresses.filter(ip => ip.trim() !== '');

      const customerData: any = {
        companyName: formData.companyName,
        emails: validEmails,
        allowedIpAddresses: validIps
      };

      // Only super-admin can change this — backend re-enforces.
      // Skip sending the field for non-super-admin so we don't trigger a 403.
      if (isSuperAdmin) {
        customerData.sendPasswordExpiryReminders = formData.sendPasswordExpiryReminders;
      }

      // Only include documentsRequired when creating a new customer
      if (!editCustomer) {
        customerData.documentsRequired = formData.documentsRequired;
      }

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

            {/* Allowed IP Addresses (Optional) */}
            <div className="space-y-2">
              <Label>
                Allowed IP Addresses <span className="text-xs text-gray-400">(Optional)</span>
              </Label>
              <p className="text-xs text-gray-500">
                If set, customer users can only log in from these IP addresses. Leave empty to allow login from any IP.
              </p>
              {formData.allowedIpAddresses.map((ip, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <Input
                    value={ip}
                    onChange={(e) => handleIpChange(index, e.target.value)}
                    placeholder="e.g. 192.168.1.100"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => removeIpField(index)}
                    className="hover:bg-red-50 hover:border-red-200"
                  >
                    <X className="h-4 w-4 text-red-600" />
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addIpField}
              >
                Add IP Address
              </Button>
            </div>

            {/* Documents Required - Only show when creating new customer */}
            {!editCustomer && (
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
                  Enter document names separated by commas. You can manage these later in the Documents section.
                </p>
                {errors.documentsRequired && (
                  <p className="text-sm text-red-500">{errors.documentsRequired}</p>
                )}
              </div>
            )}

            {/* Password expiry reminders — super-admin only */}
            <div className="space-y-2 pt-2 border-t">
              <div className="flex items-start gap-3">
                <Checkbox
                  id="sendPasswordExpiryReminders"
                  checked={formData.sendPasswordExpiryReminders}
                  onCheckedChange={(checked) =>
                    setFormData(prev => ({ ...prev, sendPasswordExpiryReminders: checked === true }))
                  }
                  disabled={!isSuperAdmin}
                  className="mt-1"
                />
                <div className="space-y-1">
                  <Label
                    htmlFor="sendPasswordExpiryReminders"
                    className={!isSuperAdmin ? 'text-gray-400 cursor-not-allowed' : ''}
                  >
                    Send password expiry reminders to this company's users
                    {!isSuperAdmin && (
                      <span className="ml-2 text-[10px] uppercase tracking-wide bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
                        Super-admin only
                      </span>
                    )}
                  </Label>
                  <p className="text-xs text-gray-500">
                    When enabled, this company's users receive email reminders 7 days and 1 day before their password expires. Off by default.
                  </p>
                </div>
              </div>
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
