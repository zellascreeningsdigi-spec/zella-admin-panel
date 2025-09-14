import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import React, { useState } from 'react';

interface CaseData {
  name: string;
  companyName: string;
  caseId?: string;
  phone?: string;
  address?: string;
  email?: string;
}

interface DigiLockerEmailFormProps {
  onEmailSent?: (data: any) => void;
}

const DigiLockerEmailForm: React.FC<DigiLockerEmailFormProps> = ({ onEmailSent }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<{
    type: 'success' | 'error' | 'info' | null;
    message: string;
  }>({ type: null, message: '' });

  const [caseData, setCaseData] = useState<CaseData>({
    name: '',
    companyName: '',
    caseId: '',
    phone: '',
    address: '',
    email: '',
  });

  const handleInputChange = (field: keyof CaseData, value: string) => {
    setCaseData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSendEmail = async () => {
    setIsLoading(true);
    setStatus({ type: null, message: '' });

    try {
      // Get auth token from localStorage or context
      const token = localStorage.getItem('token');

      if (!token) {
        setStatus({
          type: 'error',
          message: 'Authentication token not found. Please login again.'
        });
        return;
      }

      if (caseData.email == undefined || caseData.email == '') {
        setStatus({
          type: 'error',
          message: 'Invalid Email for this case.'
        });
      }

      const response = await fetch(`${process.env.REACT_APP_API_URL}/digilocker/send-auth-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          userEmail: caseData.email,
          caseData: {
            ...caseData,
            caseId: caseData.caseId || `CASE_${Date.now()}`
          }
        })
      });

      const result = await response.json();

      if (result.success) {
        setStatus({
          type: 'success',
          message: `DigiLocker authorization email sent successfully! Session ID: ${result.data.sessionId}`
        });

        // Reset form
        setCaseData({
          name: '',
          companyName: '',
          caseId: '',
          phone: '',
          address: ''
        });

        // Call callback if provided
        if (onEmailSent) {
          onEmailSent(result.data);
        }
      } else {
        setStatus({
          type: 'error',
          message: result.message || 'Failed to send email'
        });
      }
    } catch (error) {
      setStatus({
        type: 'error',
        message: 'Network error: ' + (error as Error).message
      });
    } finally {
      setIsLoading(false);
    }
  };

  const isFormValid = caseData.name.trim() && caseData.companyName.trim();

  return (
    <Card className="w-full max-w-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          🔐 Send DigiLocker Authorization
        </CardTitle>
        <p className="text-sm text-gray-600">
          Send DigiLocker authorization email to {caseData.email}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">Candidate Name *</Label>
          <Input
            id="name"
            placeholder="Enter candidate name"
            value={caseData.name}
            onChange={(e) => handleInputChange('name', e.target.value)}
            disabled={isLoading}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="companyName">Company Name *</Label>
          <Input
            id="companyName"
            placeholder="Enter company name"
            value={caseData.companyName}
            onChange={(e) => handleInputChange('companyName', e.target.value)}
            disabled={isLoading}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="caseId">Case ID (Optional)</Label>
          <Input
            id="caseId"
            placeholder="Enter case ID or leave blank for auto-generation"
            value={caseData.caseId}
            onChange={(e) => handleInputChange('caseId', e.target.value)}
            disabled={isLoading}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone">Phone (Optional)</Label>
          <Input
            id="phone"
            placeholder="Enter phone number"
            value={caseData.phone}
            onChange={(e) => handleInputChange('phone', e.target.value)}
            disabled={isLoading}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="address">Address (Optional)</Label>
          <Input
            id="address"
            placeholder="Enter address"
            value={caseData.address}
            onChange={(e) => handleInputChange('address', e.target.value)}
            disabled={isLoading}
          />
        </div>

        {status.type && (
          <div className={`p-3 rounded-md text-sm ${status.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' :
            status.type === 'error' ? 'bg-red-50 text-red-700 border border-red-200' :
              'bg-blue-50 text-blue-700 border border-blue-200'
            }`}>
            {status.message}
          </div>
        )}

        <Button
          onClick={handleSendEmail}
          disabled={!isFormValid || isLoading}
          className="w-full"
        >
          {isLoading ? (
            <div className="flex items-center gap-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              Sending Email...
            </div>
          ) : (
            'Send DigiLocker Authorization Email'
          )}
        </Button>

        <div className="text-xs text-gray-500 space-y-1">
          <p>• Email will be sent to: {caseData.email}</p>
          <p>• User will receive DigiLocker authorization URL</p>
          <p>• After authorization, documents will be automatically fetched</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default DigiLockerEmailForm;