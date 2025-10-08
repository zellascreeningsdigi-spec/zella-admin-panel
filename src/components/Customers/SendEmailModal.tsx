import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { apiService } from '@/services/api';
import { Customer } from '@/types/customer';
import { Check, Mail, X } from 'lucide-react';
import React, { useEffect, useState } from 'react';

interface SendEmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: Customer;
}

const SendEmailModal: React.FC<SendEmailModalProps> = ({ isOpen, onClose, customer }) => {
  const [selectedEmails, setSelectedEmails] = useState<string[]>([]);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
    details?: any;
  } | null>(null);

  useEffect(() => {
    if (isOpen) {
      // Reset state when modal opens
      setSelectedEmails([]);
      setResult(null);
    }
  }, [isOpen]);

  const handleToggleEmail = (email: string) => {
    setSelectedEmails((prev) =>
      prev.includes(email) ? prev.filter((e) => e !== email) : [...prev, email]
    );
  };

  const handleSelectAll = () => {
    if (selectedEmails.length === customer.emails.length) {
      setSelectedEmails([]);
    } else {
      setSelectedEmails([...customer.emails]);
    }
  };

  const handleSendEmails = async () => {
    if (selectedEmails.length === 0) {
      return;
    }

    setSending(true);
    setResult(null);

    try {
      const response = await apiService.sendCustomerLoginEmails(customer._id!, selectedEmails);

      if (response.success) {
        setResult({
          success: true,
          message: response.message || 'Emails sent successfully!',
          details: response.data
        });
      } else {
        setResult({
          success: false,
          message: response.message || 'Failed to send emails'
        });
      }
    } catch (error) {
      console.error('Error sending emails:', error);
      setResult({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to send emails. Please try again.'
      });
    } finally {
      setSending(false);
    }
  };

  const handleClose = () => {
    if (!sending) {
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Mail className="h-5 w-5 mr-2" />
            Send Login Credentials Email
          </DialogTitle>
          <DialogDescription>
            Select email addresses to send login instructions and document upload details to.
          </DialogDescription>
        </DialogHeader>

        {!result ? (
          <>
            <div className="py-4">
              <div className="mb-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-medium text-gray-700">
                    Select Recipients ({selectedEmails.length} of {customer.emails.length})
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSelectAll}
                    disabled={sending}
                  >
                    {selectedEmails.length === customer.emails.length ? 'Deselect All' : 'Select All'}
                  </Button>
                </div>

                <div className="space-y-2 max-h-64 overflow-y-auto border rounded-lg p-3">
                  {customer.emails.map((email, index) => (
                    <div
                      key={index}
                      className="flex items-center space-x-3 p-2 rounded hover:bg-gray-50 cursor-pointer"
                      onClick={() => handleToggleEmail(email)}
                    >
                      <Checkbox
                        checked={selectedEmails.includes(email)}
                        onCheckedChange={() => handleToggleEmail(email)}
                        disabled={sending}
                      />
                      <label className="flex-1 text-sm cursor-pointer">{email}</label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-2">
                <p className="text-sm font-medium text-blue-900">Email will include:</p>
                <ul className="text-xs text-blue-800 space-y-1 ml-4 list-disc">
                  <li>Login URL: <strong>https://callback.zellascreenings.com</strong></li>
                  <li>Password: <strong>Customer@12345</strong></li>
                  <li>List of required documents</li>
                  <li>Step-by-step upload instructions</li>
                </ul>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={handleClose} disabled={sending}>
                Cancel
              </Button>
              <Button
                onClick={handleSendEmails}
                disabled={selectedEmails.length === 0 || sending}
              >
                {sending ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Sending...
                  </>
                ) : (
                  <>
                    <Mail className="h-4 w-4 mr-2" />
                    Send to {selectedEmails.length} {selectedEmails.length === 1 ? 'Recipient' : 'Recipients'}
                  </>
                )}
              </Button>
            </DialogFooter>
          </>
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
                  {result.success ? 'Emails Sent Successfully!' : 'Error Sending Emails'}
                </h3>
                <p className={`text-sm ${result.success ? 'text-green-800' : 'text-red-800'}`}>
                  {result.message}
                </p>

                {result.success && result.details && (
                  <div className="mt-4 text-sm text-green-700">
                    <p>✓ {result.details.successCount} email(s) sent successfully</p>
                    {result.details.failureCount > 0 && (
                      <p className="text-red-700">✗ {result.details.failureCount} email(s) failed</p>
                    )}
                  </div>
                )}
              </div>
            </div>

            <DialogFooter>
              <Button onClick={handleClose}>Close</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default SendEmailModal;
