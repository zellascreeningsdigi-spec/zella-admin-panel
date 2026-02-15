import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { apiService } from '@/services/api';
import { AddressVerification } from '@/types/addressVerification';

interface AddAddressVerificationDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editVerification?: AddressVerification | null;
}

interface FormData {
  code: string;
  applicantNo: string;
  date: string;
  name: string;
  fathersName: string;
  initiatorName: string;
  phone: string;
  companyName: string;
  email: string;
  address: string;
  presentAddress: string;
  city: string;
  state: string;
  pin: string;
  landmark: string;
  addressType: 'current' | 'permanent' | 'office';
  verificationMethod: 'self' | 'physical' | 'document';
}

interface FormErrors {
  [key: string]: string;
}

const AddAddressVerificationDialog = ({
  open,
  onClose,
  onSuccess,
  editVerification,
}: AddAddressVerificationDialogProps) => {
  const [formData, setFormData] = useState<FormData>({
    code: '',
    applicantNo: '',
    date: new Date().toISOString().split('T')[0],
    name: '',
    fathersName: '',
    initiatorName: '',
    phone: '',
    companyName: '',
    email: '',
    address: '',
    presentAddress: '',
    city: '',
    state: '',
    pin: '',
    landmark: '',
    addressType: 'current',
    verificationMethod: 'self',
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (editVerification && open) {
      setFormData({
        code: editVerification.code || '',
        applicantNo: editVerification.applicantNo || '',
        date: editVerification.formSubmitDate
          ? new Date(editVerification.formSubmitDate).toISOString().split('T')[0]
          : new Date().toISOString().split('T')[0],
        name: editVerification.name || '',
        fathersName: editVerification.fathersName || '',
        initiatorName: editVerification.initiatorName || '',
        phone: editVerification.phone || '',
        companyName: editVerification.companyName || '',
        email: editVerification.email || '',
        address: editVerification.address || '',
        presentAddress: editVerification.presentAddress || '',
        city: editVerification.city || '',
        state: editVerification.state || '',
        pin: editVerification.pin || '',
        landmark: editVerification.landmark || '',
        addressType: editVerification.addressType || 'current',
        verificationMethod: editVerification.verificationMethod || 'self',
      });
    } else if (!editVerification && open) {
      setFormData({
        code: '',
        applicantNo: '',
        date: new Date().toISOString().split('T')[0],
        name: '',
        fathersName: '',
        initiatorName: '',
        phone: '',
        companyName: '',
        email: '',
        address: '',
        presentAddress: '',
        city: '',
        state: '',
        pin: '',
        landmark: '',
        addressType: 'current',
        verificationMethod: 'self',
      });
      setErrors({});
    }
  }, [editVerification, open]);

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.code.trim()) newErrors.code = 'Code is required';
    if (!formData.date) newErrors.date = 'Date is required';
    if (!formData.name.trim()) newErrors.name = 'Candidate name is required';
    if (!formData.phone.trim()) newErrors.phone = 'Phone is required';
    else if (!/^\d{10}$/.test(formData.phone.replace(/\D/g, ''))) {
      newErrors.phone = 'Phone must be 10 digits';
    }
    if (!formData.companyName.trim()) newErrors.companyName = 'Company name is required';
    if (!formData.email.trim()) newErrors.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }
    if (!formData.address.trim()) newErrors.address = 'Address is required';

    if (formData.pin && !/^\d{6}$/.test(formData.pin.replace(/\D/g, ''))) {
      newErrors.pin = 'PIN code must be 6 digits';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsSubmitting(true);

    try {
      const submitData = {
        ...formData,
        formSubmitDate: new Date(formData.date).toISOString(),
      };

      let response;
      if (editVerification?._id) {
        response = await apiService.updateAddressVerification(editVerification._id, submitData);
      } else {
        response = await apiService.createAddressVerification(submitData);
      }

      if (response.success) {
        alert(
          editVerification
            ? 'Verification updated successfully!'
            : 'Verification created successfully!'
        );
        onSuccess();
      } else {
        alert(response.message || 'Failed to save verification');
      }
    } catch (error: any) {
      console.error('Submit error:', error);
      alert(error.message || 'Failed to save verification');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editVerification ? 'Edit Address Verification' : 'Add Address Verification'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {/* Code */}
            <div>
              <Label htmlFor="code">
                Code (BGVID) <span className="text-red-500">*</span>
              </Label>
              <Input
                id="code"
                value={formData.code}
                onChange={(e) => handleInputChange('code', e.target.value)}
                placeholder="e.g., AV001"
              />
              {errors.code && <p className="text-sm text-red-500 mt-1">{errors.code}</p>}
            </div>

            {/* Date */}
            <div>
              <Label htmlFor="date">
                Date <span className="text-red-500">*</span>
              </Label>
              <Input
                id="date"
                type="date"
                value={formData.date}
                onChange={(e) => handleInputChange('date', e.target.value)}
              />
              {errors.date && <p className="text-sm text-red-500 mt-1">{errors.date}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Applicant No */}
            <div>
              <Label htmlFor="applicantNo">Applicant No</Label>
              <Input
                id="applicantNo"
                value={formData.applicantNo}
                onChange={(e) => handleInputChange('applicantNo', e.target.value)}
                placeholder="e.g., ART-BGV-026"
              />
            </div>

            {/* Fathers Name */}
            <div>
              <Label htmlFor="fathersName">Father's Name</Label>
              <Input
                id="fathersName"
                value={formData.fathersName}
                onChange={(e) => handleInputChange('fathersName', e.target.value)}
                placeholder="Father's name"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Candidate Name */}
            <div>
              <Label htmlFor="name">
                Candidate Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="Full name"
              />
              {errors.name && <p className="text-sm text-red-500 mt-1">{errors.name}</p>}
            </div>

            {/* Initiator Name */}
            <div>
              <Label htmlFor="initiatorName">Initiator Name</Label>
              <Input
                id="initiatorName"
                value={formData.initiatorName}
                onChange={(e) => handleInputChange('initiatorName', e.target.value)}
                placeholder="Optional"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Phone */}
            <div>
              <Label htmlFor="phone">
                Phone <span className="text-red-500">*</span>
              </Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                placeholder="10-digit mobile"
              />
              {errors.phone && <p className="text-sm text-red-500 mt-1">{errors.phone}</p>}
            </div>

            {/* Email */}
            <div>
              <Label htmlFor="email">
                Email <span className="text-red-500">*</span>
              </Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                placeholder="candidate@example.com"
              />
              {errors.email && <p className="text-sm text-red-500 mt-1">{errors.email}</p>}
            </div>
          </div>

          {/* Company Name */}
          <div>
            <Label htmlFor="companyName">
              Company Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="companyName"
              value={formData.companyName}
              onChange={(e) => handleInputChange('companyName', e.target.value)}
              placeholder="Organization name"
            />
            {errors.companyName && (
              <p className="text-sm text-red-500 mt-1">{errors.companyName}</p>
            )}
          </div>

          {/* Address */}
          <div>
            <Label htmlFor="address">
              Address <span className="text-red-500">*</span>
            </Label>
            <textarea
              id="address"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
              value={formData.address}
              onChange={(e) => handleInputChange('address', e.target.value)}
              placeholder="Full address"
            />
            {errors.address && <p className="text-sm text-red-500 mt-1">{errors.address}</p>}
          </div>

          {/* Present Address */}
          <div>
            <Label htmlFor="presentAddress">Present Address</Label>
            <textarea
              id="presentAddress"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
              value={formData.presentAddress}
              onChange={(e) => handleInputChange('presentAddress', e.target.value)}
              placeholder="Current residential address (optional)"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* City */}
            <div>
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                value={formData.city}
                onChange={(e) => handleInputChange('city', e.target.value)}
                placeholder="City"
              />
            </div>

            {/* State */}
            <div>
              <Label htmlFor="state">State</Label>
              <Input
                id="state"
                value={formData.state}
                onChange={(e) => handleInputChange('state', e.target.value)}
                placeholder="State"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* PIN Code */}
            <div>
              <Label htmlFor="pin">PIN Code</Label>
              <Input
                id="pin"
                value={formData.pin}
                onChange={(e) => handleInputChange('pin', e.target.value)}
                placeholder="6-digit PIN"
                maxLength={6}
              />
              {errors.pin && <p className="text-sm text-red-500 mt-1">{errors.pin}</p>}
            </div>

            {/* Landmark */}
            <div>
              <Label htmlFor="landmark">Landmark</Label>
              <Input
                id="landmark"
                value={formData.landmark}
                onChange={(e) => handleInputChange('landmark', e.target.value)}
                placeholder="Optional"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Address Type */}
            <div>
              <Label htmlFor="addressType">Address Type</Label>
              <select
                id="addressType"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={formData.addressType}
                onChange={(e) =>
                  handleInputChange('addressType', e.target.value as FormData['addressType'])
                }
              >
                <option value="current">Current Address</option>
                <option value="permanent">Permanent Address</option>
                <option value="office">Office Address</option>
              </select>
            </div>

            {/* Verification Method */}
            <div>
              <Label htmlFor="verificationMethod">Verification Method</Label>
              <select
                id="verificationMethod"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={formData.verificationMethod}
                onChange={(e) =>
                  handleInputChange(
                    'verificationMethod',
                    e.target.value as FormData['verificationMethod']
                  )
                }
              >
                <option value="self">Self Verification</option>
                <option value="physical">Physical Verification</option>
                <option value="document">Document Verification</option>
              </select>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : editVerification ? 'Update' : 'Create'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddAddressVerificationDialog;
