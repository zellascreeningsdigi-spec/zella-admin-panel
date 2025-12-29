import React, { useState, useEffect } from 'react';
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
import { useAuth } from '@/contexts/AuthContext';
import { User, Check, X } from 'lucide-react';

interface UpdateProfileDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

const UpdateProfileDialog: React.FC<UpdateProfileDialogProps> = ({ isOpen, onClose }) => {
  const { user, updateUser } = useAuth();
  const [name, setName] = useState('');
  const [designation, setDesignation] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  useEffect(() => {
    if (isOpen && user) {
      setName(user.name || '');
      setDesignation(user.designation || '');
      setPhone(user.phone || '');
      setResult(null);
    }
  }, [isOpen, user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      setResult({
        success: false,
        message: 'Name is required'
      });
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const response = await apiService.updateProfile(name.trim(), designation.trim(), phone.trim());

      if (response.success) {
        // Update user in context
        if (response.data?.user) {
          updateUser(response.data.user);
        }

        setResult({
          success: true,
          message: 'Profile updated successfully!'
        });

        // Close dialog after 1.5 seconds
        setTimeout(() => {
          onClose();
        }, 1500);
      } else {
        setResult({
          success: false,
          message: response.message || 'Failed to update profile'
        });
      }
    } catch (error) {
      console.error('Profile update error:', error);
      setResult({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to update profile'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <User className="h-5 w-5 mr-2" />
            Update Profile
          </DialogTitle>
          <DialogDescription>
            Update your name, designation, and phone number. These details will be used in reports.
          </DialogDescription>
        </DialogHeader>

        {!result ? (
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="name" className="text-sm font-medium text-gray-700">
                  Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your full name"
                  disabled={loading}
                  className="mt-2"
                  required
                />
              </div>

              <div>
                <Label htmlFor="designation" className="text-sm font-medium text-gray-700">
                  Designation
                </Label>
                <Input
                  id="designation"
                  type="text"
                  value={designation}
                  onChange={(e) => setDesignation(e.target.value)}
                  placeholder="e.g., HR Manager, Team Lead"
                  disabled={loading}
                  className="mt-2"
                />
                <p className="text-xs text-gray-500 mt-1">
                  This will be displayed in email reports sent to companies
                </p>
              </div>

              <div>
                <Label htmlFor="phone" className="text-sm font-medium text-gray-700">
                  Phone Number
                </Label>
                <Input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g., +91 9876543210"
                  disabled={loading}
                  className="mt-2"
                />
                <p className="text-xs text-gray-500 mt-1">
                  This will be displayed in email footers
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading || !name.trim()}>
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Updating...
                  </>
                ) : (
                  <>
                    <User className="h-4 w-4 mr-2" />
                    Update Profile
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        ) : (
          <>
            <div className="py-6">
              <div
                className={`rounded-lg p-6 text-center ${
                  result.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
                }`}
              >
                {result.success ? (
                  <Check className="h-12 w-12 text-green-600 mx-auto mb-3" />
                ) : (
                  <X className="h-12 w-12 text-red-600 mx-auto mb-3" />
                )}
                <h3
                  className={`text-lg font-semibold mb-2 ${
                    result.success ? 'text-green-900' : 'text-red-900'
                  }`}
                >
                  {result.success ? 'Profile Updated!' : 'Update Failed'}
                </h3>
                <p className={`text-sm ${result.success ? 'text-green-800' : 'text-red-800'}`}>
                  {result.message}
                </p>
              </div>
            </div>

            {!result.success && (
              <DialogFooter>
                <Button onClick={handleClose}>Close</Button>
              </DialogFooter>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default UpdateProfileDialog;
