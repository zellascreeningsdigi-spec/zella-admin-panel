import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { apiService } from '@/services/api';
import { Case } from '@/types/case';
import React, { useEffect, useState } from 'react';

interface AddCaseDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onCaseAdded: () => void;
    editCase?: Case | null;
    onCaseUpdated?: () => void;
}

interface CaseFormData {
    code: string;
    date: string;
    name: string;
    initiatorName: string;
    phone: string;
    companyName: string;
    email: string;
    address: string;
    city: string;
    state: string;
    pin: string;
}

const AddCaseDialog: React.FC<AddCaseDialogProps> = ({
    isOpen,
    onClose,
    onCaseAdded,
    editCase,
    onCaseUpdated
}) => {
    const [formData, setFormData] = useState<CaseFormData>({
        code: '',
        date: '',
        name: '',
        initiatorName: '',
        phone: '',
        companyName: '',
        email: '',
        address: '',
        city: '',
        state: '',
        pin: ''
    });

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errors, setErrors] = useState<Partial<CaseFormData>>({});

    // Populate form when editCase is provided
    useEffect(() => {
        if (editCase && isOpen) {
            setFormData({
                code: editCase.code || '',
                date: editCase.date || '',
                name: editCase.name || '',
                initiatorName: (editCase as any).initiatorName || '',
                phone: editCase.phone || '',
                companyName: editCase.companyName || '',
                email: editCase.email || '',
                address: editCase.address || '',
                city: editCase.city || '',
                state: editCase.state || '',
                pin: editCase.pin || ''
            });
        } else if (!editCase && isOpen) {
            // Reset form for new case
            setFormData({
                code: '',
                date: '',
                name: '',
                initiatorName: '',
                phone: '',
                companyName: '',
                email: '',
                address: '',
                city: '',
                state: '',
                pin: ''
            });
        }
        setErrors({});
    }, [editCase, isOpen]);

    const handleInputChange = (field: keyof CaseFormData, value: string) => {
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

    const validateForm = (): boolean => {
        const newErrors: Partial<CaseFormData> = {};

        // Required fields validation
        if (!formData.code.trim()) {
            newErrors.code = 'BGVID is required';
        }
        if (!formData.date.trim()) {
            newErrors.date = 'Date is required';
        }
        if (!formData.name.trim()) {
            newErrors.name = 'Candidate Name is required';
        }
        if (!formData.phone.trim()) {
            newErrors.phone = 'Phone is required';
        }
        if (!formData.companyName.trim()) {
            newErrors.companyName = 'Company Name is required';
        }
        if (!formData.email.trim()) {
            newErrors.email = 'Email is required';
        }

        // Email validation (if provided)
        if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
            newErrors.email = 'Please enter a valid email address';
        }

        // Phone validation
        if (formData.phone && !/^[0-9]{10}$/.test(formData.phone.replace(/\D/g, ''))) {
            newErrors.phone = 'Please enter a valid 10-digit phone number';
        }

        // PIN validation (if provided)
        if (formData.pin && !/^[0-9]{6}$/.test(formData.pin)) {
            newErrors.pin = 'Please enter a valid 6-digit PIN code';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validateForm()) {
            return;
        }

        try {
            setIsSubmitting(true);

            // Prepare case data for API
            const caseData: Partial<Case> = {
                code: formData.code.trim(),
                date: formData.date,
                name: formData.name.trim(),
                ...(formData.initiatorName && { initiatorName: formData.initiatorName.trim() }),
                phone: formData.phone.trim(),
                companyName: formData.companyName.trim(),
                ...(formData.email && { email: formData.email.trim() }),
                ...(formData.address && { address: formData.address.trim() }),
                ...(formData.city && { city: formData.city.trim() }),
                ...(formData.state && { state: formData.state.trim() }),
                ...(formData.pin && { pin: formData.pin.trim() })
            };

            let response;
            if (editCase) {
                // Update existing case
                response = await apiService.updateCase(editCase.id, caseData);
            } else {
                // Create new case
                caseData.status = 'pending';
                caseData.digiLockerStatus = 'not_initiated';
                response = await apiService.createCase(caseData);
            }

            if (response.success) {
                // Reset form
                setFormData({
                    code: '',
                    date: '',
                    name: '',
                    initiatorName: '',
                    phone: '',
                    companyName: '',
                    email: '',
                    address: '',
                    city: '',
                    state: '',
                    pin: ''
                });
                setErrors({});

                // Close dialog and refresh cases list
                onClose();
                if (editCase && onCaseUpdated) {
                    onCaseUpdated();
                } else {
                    onCaseAdded();
                }

                alert(editCase ? 'Case updated successfully!' : 'Case added successfully!');
            } else {
                throw new Error(response.message || `Failed to ${editCase ? 'update' : 'create'} case`);
            }
        } catch (error) {
            console.error(`Error ${editCase ? 'updating' : 'creating'} case:`, error);
            alert(`Error ${editCase ? 'updating' : 'creating'} case: ${error instanceof Error ? error.message : 'Please try again.'}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleClose = () => {
        if (!isSubmitting) {
            setFormData({
                code: '',
                date: '',
                name: '',
                initiatorName: '',
                phone: '',
                companyName: '',
                email: '',
                address: '',
                city: '',
                state: '',
                pin: ''
            });
            setErrors({});
            onClose();
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={handleClose}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{editCase ? 'Edit Case' : 'Add New Case'}</DialogTitle>
                    <DialogDescription>
                        {editCase ? 'Update the case details below.' : 'Fill in the case details below.'} Fields marked with * are required.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Code - Required */}
                        <div className="space-y-2">
                            <Label htmlFor="code">
                                BGVID <span className="text-red-500">*</span>
                            </Label>
                            <Input
                                id="code"
                                type="text"
                                value={formData.code}
                                onChange={(e) => handleInputChange('code', e.target.value)}
                                placeholder="Enter BGVID"
                                className={errors.code ? 'border-red-500' : ''}
                            />
                            {errors.code && (
                                <p className="text-sm text-red-500">{errors.code}</p>
                            )}
                        </div>

                        {/* Date - Required */}
                        <div className="space-y-2">
                            <Label htmlFor="date">
                                Date <span className="text-red-500">*</span>
                            </Label>
                            <Input
                                id="date"
                                type="date"
                                value={formData.date}
                                onChange={(e) => handleInputChange('date', e.target.value)}
                                className={errors.date ? 'border-red-500' : ''}
                            />
                            {errors.date && (
                                <p className="text-sm text-red-500">{errors.date}</p>
                            )}
                        </div>

                        {/* Candidate Name - Required */}
                        <div className="space-y-2">
                            <Label htmlFor="name">
                                Candidate Name <span className="text-red-500">*</span>
                            </Label>
                            <Input
                                id="name"
                                type="text"
                                value={formData.name}
                                onChange={(e) => handleInputChange('name', e.target.value)}
                                placeholder="Enter Candidate Name"
                                className={errors.name ? 'border-red-500' : ''}
                            />
                            {errors.name && (
                                <p className="text-sm text-red-500">{errors.name}</p>
                            )}
                        </div>

                        {/* Initiator Name - Optional */}
                        <div className="space-y-2">
                            <Label htmlFor="initiatorName">
                                Initiator Name
                            </Label>
                            <Input
                                id="initiatorName"
                                type="text"
                                value={formData.initiatorName}
                                onChange={(e) => handleInputChange('initiatorName', e.target.value)}
                                placeholder="Enter Initiator Name"
                            />
                        </div>

                        {/* Phone - Required */}
                        <div className="space-y-2">
                            <Label htmlFor="phone">
                                Phone <span className="text-red-500">*</span>
                            </Label>
                            <Input
                                id="phone"
                                type="tel"
                                value={formData.phone}
                                onChange={(e) => handleInputChange('phone', e.target.value)}
                                placeholder="Enter 10-digit phone number"
                                className={errors.phone ? 'border-red-500' : ''}
                            />
                            {errors.phone && (
                                <p className="text-sm text-red-500">{errors.phone}</p>
                            )}
                        </div>

                        {/* Company Name - Required */}
                        <div className="space-y-2">
                            <Label htmlFor="companyName">
                                Company Name <span className="text-red-500">*</span>
                            </Label>
                            <Input
                                id="companyName"
                                type="text"
                                value={formData.companyName}
                                onChange={(e) => handleInputChange('companyName', e.target.value)}
                                placeholder="Enter company name"
                                className={errors.companyName ? 'border-red-500' : ''}
                            />
                            {errors.companyName && (
                                <p className="text-sm text-red-500">{errors.companyName}</p>
                            )}
                        </div>

                        {/* Email - Required */}
                        <div className="space-y-2">
                            <Label htmlFor="email">Email <span className="text-red-500">*</span></Label>
                            <Input
                                id="email"
                                type="email"
                                value={formData.email}
                                onChange={(e) => handleInputChange('email', e.target.value)}
                                placeholder="Enter email address"
                                className={errors.email ? 'border-red-500' : ''}
                            />
                            {errors.email && (
                                <p className="text-sm text-red-500">{errors.email}</p>
                            )}
                        </div>

                        {/* Address - Optional */}
                        <div className="space-y-2">
                            <Label htmlFor="address">Address</Label>
                            <Input
                                id="address"
                                type="text"
                                value={formData.address}
                                onChange={(e) => handleInputChange('address', e.target.value)}
                                placeholder="Enter address"
                            />
                        </div>

                        {/* City - Optional */}
                        <div className="space-y-2">
                            <Label htmlFor="city">City</Label>
                            <Input
                                id="city"
                                type="text"
                                value={formData.city}
                                onChange={(e) => handleInputChange('city', e.target.value)}
                                placeholder="Enter city"
                            />
                        </div>

                        {/* State - Optional */}
                        <div className="space-y-2">
                            <Label htmlFor="state">State</Label>
                            <Input
                                id="state"
                                type="text"
                                value={formData.state}
                                onChange={(e) => handleInputChange('state', e.target.value)}
                                placeholder="Enter state"
                            />
                        </div>

                        {/* PIN - Optional */}
                        <div className="space-y-2">
                            <Label htmlFor="pin">PIN Code</Label>
                            <Input
                                id="pin"
                                type="text"
                                value={formData.pin}
                                onChange={(e) => handleInputChange('pin', e.target.value)}
                                placeholder="Enter 6-digit PIN code"
                                className={errors.pin ? 'border-red-500' : ''}
                            />
                            {errors.pin && (
                                <p className="text-sm text-red-500">{errors.pin}</p>
                            )}
                        </div>
                    </div>

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={handleClose}
                            disabled={isSubmitting}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? (editCase ? 'Updating...' : 'Saving...') : (editCase ? 'Update Case' : 'Save Case')}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
};

export default AddCaseDialog;
