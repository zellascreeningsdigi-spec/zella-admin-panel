import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { apiService } from '@/services/api';
import { Edit, Shield, ShieldCheck, Eye, EyeOff } from 'lucide-react';
import React, { useState, useEffect } from 'react';

interface User {
  _id: string;
  name: string;
  designation: string;
  phone?: string;
  email: string;
  role: 'admin' | 'super-admin' | 'customer' | 'operator' | 'viewer';
  isActive: boolean;
}

interface EditUserDialogProps {
  isOpen: boolean;
  user: User | null;
  onClose: () => void;
  onSuccess: () => void;
}

const EditUserDialog: React.FC<EditUserDialogProps> = ({ isOpen, user, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    name: '',
    designation: '',
    phone: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'admin' as 'admin' | 'super-admin' | 'customer' | 'operator' | 'viewer',
    isActive: true
  });
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    if (isOpen && user) {
      setFormData({
        name: user.name || '',
        designation: user.designation || '',
        phone: user.phone || '',
        email: user.email || '',
        password: '',
        confirmPassword: '',
        role: user.role,
        isActive: user.isActive
      });
      setErrors({});
      setResult(null);
      setShowPassword(false);
    }
  }, [isOpen, user]);

  const validateForm = (): boolean => {
    const newErrors: { [key: string]: string } = {};

    // Name validation
    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    // Email validation
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }

    // Password validation (only if password is being changed)
    if (formData.password) {
      if (formData.password.length < 6) {
        newErrors.password = 'Password must be at least 6 characters';
      }
      if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = 'Passwords do not match';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user || !validateForm()) {
      return;
    }

    setSubmitting(true);
    setResult(null);

    try {
      const updates: any = {
        name: formData.name.trim(),
        designation: formData.designation.trim(),
        phone: formData.phone.trim(),
        email: formData.email.trim(),
        role: formData.role,
        isActive: formData.isActive
      };

      // Only include password if it's being changed
      if (formData.password) {
        updates.password = formData.password;
      }

      const response = await apiService.updateAdminUser(user._id, updates);

      if (response.success) {
        setResult({
          success: true,
          message: 'User updated successfully!'
        });

        // Call onSuccess after a short delay to show the success message
        setTimeout(() => {
          onSuccess();
          setResult(null);
        }, 1500);
      }
    } catch (error) {
      console.error('Error updating user:', error);
      setResult({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to update user'
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!submitting) {
      setErrors({});
      setResult(null);
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Edit className="h-5 w-5 mr-2" />
            Edit User
          </DialogTitle>
          <DialogDescription>
            Update user details including name, email, password, and role
          </DialogDescription>
        </DialogHeader>

        {!result ? (
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              {/* Name */}
              <div>
                <Label htmlFor="name">
                  Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Enter full name"
                  disabled={submitting}
                  className={errors.name ? 'border-red-500' : ''}
                />
                {errors.name && <p className="text-sm text-red-500 mt-1">{errors.name}</p>}
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
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="user@zellascreenings.com"
                  disabled={submitting}
                  className={errors.email ? 'border-red-500' : ''}
                />
                {errors.email && <p className="text-sm text-red-500 mt-1">{errors.email}</p>}
              </div>

              {/* Designation */}
              <div>
                <Label htmlFor="designation">Designation</Label>
                <Input
                  id="designation"
                  value={formData.designation}
                  onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                  placeholder="e.g., Senior Executive Analyst"
                  disabled={submitting}
                />
              </div>

              {/* Phone */}
              <div>
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="e.g., +91 9876543210"
                  disabled={submitting}
                />
              </div>

              {/* Password */}
              <div>
                <Label htmlFor="password">
                  New Password <span className="text-xs text-gray-500">(leave blank to keep current)</span>
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="Minimum 6 characters"
                    disabled={submitting}
                    className={errors.password ? 'border-red-500' : ''}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.password && <p className="text-sm text-red-500 mt-1">{errors.password}</p>}
              </div>

              {/* Confirm Password */}
              {formData.password && (
                <div>
                  <Label htmlFor="confirmPassword">
                    Confirm New Password <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="confirmPassword"
                    type={showPassword ? 'text' : 'password'}
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    placeholder="Re-enter new password"
                    disabled={submitting}
                    className={errors.confirmPassword ? 'border-red-500' : ''}
                  />
                  {errors.confirmPassword && (
                    <p className="text-sm text-red-500 mt-1">{errors.confirmPassword}</p>
                  )}
                </div>
              )}

              {/* Role */}
              <div>
                <Label>
                  Role <span className="text-red-500">*</span>
                </Label>
                {user?.role === 'admin' || user?.role === 'super-admin' ? (
                  <div className="grid grid-cols-2 gap-3 mt-2">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, role: 'admin' })}
                      disabled={submitting}
                      className={`p-4 border-2 rounded-lg flex flex-col items-center justify-center transition-all ${
                        formData.role === 'admin'
                          ? 'border-blue-600 bg-blue-50'
                          : 'border-gray-300 hover:border-blue-400'
                      } ${submitting ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                    >
                      <Shield className="h-6 w-6 text-blue-600 mb-2" />
                      <span className="font-medium text-sm">Admin</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, role: 'super-admin' })}
                      disabled={submitting}
                      className={`p-4 border-2 rounded-lg flex flex-col items-center justify-center transition-all ${
                        formData.role === 'super-admin'
                          ? 'border-purple-600 bg-purple-50'
                          : 'border-gray-300 hover:border-purple-400'
                      } ${submitting ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                    >
                      <ShieldCheck className="h-6 w-6 text-purple-600 mb-2" />
                      <span className="font-medium text-sm">Super Admin</span>
                    </button>
                  </div>
                ) : (
                  <div className="mt-2 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                    <span className="text-sm text-gray-700 font-medium capitalize">
                      {formData.role.replace('-', ' ')}
                    </span>
                    <p className="text-xs text-gray-500 mt-1">
                      Role cannot be changed for {formData.role} users
                    </p>
                  </div>
                )}
              </div>

              {/* Active Status */}
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  disabled={submitting}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <Label htmlFor="isActive" className="cursor-pointer">
                  Active User
                </Label>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleClose} disabled={submitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Updating...
                  </>
                ) : (
                  <>
                    <Edit className="h-4 w-4 mr-2" />
                    Update User
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        ) : (
          <div className="py-6">
            <div
              className={`rounded-lg p-6 text-center ${
                result.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
              }`}
            >
              <div
                className={`h-12 w-12 rounded-full mx-auto mb-4 flex items-center justify-center ${
                  result.success ? 'bg-green-100' : 'bg-red-100'
                }`}
              >
                {result.success ? (
                  <Edit className="h-6 w-6 text-green-600" />
                ) : (
                  <span className="text-red-600 text-2xl">✕</span>
                )}
              </div>
              <h3
                className={`text-lg font-semibold mb-2 ${
                  result.success ? 'text-green-900' : 'text-red-900'
                }`}
              >
                {result.success ? 'Success!' : 'Error'}
              </h3>
              <p className={result.success ? 'text-green-800' : 'text-red-800'}>
                {result.message}
              </p>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default EditUserDialog;
