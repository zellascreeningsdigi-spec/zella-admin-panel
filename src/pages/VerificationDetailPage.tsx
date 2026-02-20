import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, MapPin, User, FileText, Home, Phone, Mail, Calendar, AlertCircle, CheckCircle, XCircle, Send, MessageCircle, Pencil, Save, X, Upload, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AddressVerification } from '@/types/addressVerification';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import apiService from '@/services/api';

const idProofTypeOptions = [
  { value: 'aadhaar', label: 'Aadhaar' },
  { value: 'pan', label: 'PAN' },
  { value: 'voter_id', label: 'Voter ID' },
  { value: 'passport', label: 'Passport' },
  { value: 'driving_license', label: 'Driving License' },
  { value: 'other', label: 'Other' },
];
const residentialStatusOptions = [
  { value: 'owned', label: 'Owned' },
  { value: 'rented', label: 'Rented' },
  { value: 'company_provided', label: 'Company Provided' },
  { value: 'pg', label: 'PG' },
  { value: 'other', label: 'Other' },
];
const addressTypeOptions = [
  { value: 'current', label: 'Current' },
  { value: 'permanent', label: 'Permanent' },
  { value: 'office', label: 'Office' },
];

const DOCUMENT_SLOTS = [
  { docType: 'id_proof_one', fieldName: 'idProofOne', label: 'ID Proof One' },
  { docType: 'id_proof_two', fieldName: 'idProofTwo', label: 'ID Proof Two' },
  { docType: 'house_image_one', fieldName: 'houseImageOne', label: 'House Image One' },
  { docType: 'house_image_two', fieldName: 'houseImageTwo', label: 'House Image Two' },
  { docType: 'signature', fieldName: 'signature', label: 'Signature' },
  { docType: 'selfie', fieldName: 'candidateSelfie', label: 'Candidate Selfie' },
];

const VerificationDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [verification, setVerification] = useState<AddressVerification | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  // Form state for status updates
  const [status, setStatus] = useState<string>('');
  const [verificationStatus, setVerificationStatus] = useState<string>('');
  const [verifierComments, setVerifierComments] = useState<string>('');

  // Inline edit mode state
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const [editForm, setEditForm] = useState({
    name: '', fathersName: '', phone: '', email: '',
    companyName: '', applicantNo: '', address: '', presentAddress: '',
    city: '', state: '', pin: '', landmark: '',
    addressType: 'current' as 'current' | 'permanent' | 'office',
  });

  const [editVerificationData, setEditVerificationData] = useState({
    contactPersonName: '',
    contactPersonRelation: '',
    numberOfFamilyMembers: '' as string | number,
    contactPhoneNo: '',
    idProofType: '' as string,
    idProofNumber: '',
    periodOfStay: '',
    differentAddress: '',
    residentialStatus: '' as string,
    landmark: '',
    remarks: '',
    candidateComments: '',
  });

  const [editErrors, setEditErrors] = useState<Record<string, string>>({});

  // Document management state
  const [uploadingDoc, setUploadingDoc] = useState<string | null>(null);
  const [deletingDoc, setDeletingDoc] = useState<string | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [docToDelete, setDocToDelete] = useState<{ docType: string; label: string } | null>(null);
  const [activeUploadDocType, setActiveUploadDocType] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (id) {
      fetchVerification();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const fetchVerification = async () => {
    if (!id) return;

    setLoading(true);
    try {
      const response = await apiService.getAddressVerificationById(id);
      if (response.success && response.data) {
        setVerification(response.data);
        setStatus(response.data.status);
        setVerificationStatus(response.data.verificationStatus);
        setVerifierComments(response.data.verificationData?.verifierComments || '');
      } else {
        throw new Error('Verification not found');
      }
    } catch (error) {
      console.error('Failed to fetch verification:', error);
      alert('Failed to load verification details');
      navigate('/dashboard', { state: { activeTab: 'address-verification' } });
    } finally {
      setLoading(false);
    }
  };

  const handleStartEditing = () => {
    if (!verification) return;
    setEditForm({
      name: verification.name || '',
      fathersName: verification.fathersName || '',
      phone: verification.phone || '',
      email: verification.email || '',
      companyName: verification.companyName || '',
      applicantNo: verification.applicantNo || '',
      address: verification.address || '',
      presentAddress: verification.presentAddress || '',
      city: verification.city || '',
      state: verification.state || '',
      pin: verification.pin || '',
      landmark: verification.landmark || '',
      addressType: verification.addressType || 'current',
    });
    const vd = verification.verificationData;
    setEditVerificationData({
      contactPersonName: vd?.contactPersonName || '',
      contactPersonRelation: vd?.contactPersonRelation || '',
      numberOfFamilyMembers: vd?.numberOfFamilyMembers ?? '',
      contactPhoneNo: vd?.contactPhoneNo || '',
      idProofType: vd?.idProofType || '',
      idProofNumber: vd?.idProofNumber || '',
      periodOfStay: vd?.periodOfStay || '',
      differentAddress: vd?.differentAddress || '',
      residentialStatus: vd?.residentialStatus || '',
      landmark: vd?.landmark || '',
      remarks: vd?.remarks || '',
      candidateComments: vd?.candidateComments || '',
    });
    setEditErrors({});
    setIsEditing(true);
  };

  const handleCancelEditing = () => {
    setIsEditing(false);
    setEditErrors({});
  };

  const handleEditFormChange = (field: string, value: string) => {
    setEditForm(prev => ({ ...prev, [field]: value }));
    setEditErrors(prev => {
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const handleEditVdChange = (field: string, value: string | number) => {
    setEditVerificationData(prev => ({ ...prev, [field]: value }));
    setEditErrors(prev => {
      const next = { ...prev };
      delete next[`vd_${field}`];
      return next;
    });
  };

  const validateEditForm = (): boolean => {
    const errors: Record<string, string> = {};
    if (!editForm.name.trim()) errors.name = 'Name is required';
    if (!editForm.phone.trim()) errors.phone = 'Phone is required';
    else if (!/^\d{10}$/.test(editForm.phone.replace(/\D/g, '')))
      errors.phone = 'Phone must be 10 digits';
    if (!editForm.email.trim()) errors.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(editForm.email))
      errors.email = 'Invalid email format';
    if (!editForm.companyName.trim()) errors.companyName = 'Company name is required';
    if (!editForm.address.trim()) errors.address = 'Address is required';
    if (editForm.pin && !/^\d{6}$/.test(editForm.pin))
      errors.pin = 'PIN must be 6 digits';
    setEditErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSaveEdits = async () => {
    if (!id || !verification) return;
    if (!validateEditForm()) return;

    setSaving(true);
    try {
      const payload = {
        ...editForm,
        verificationData: {
          ...verification.verificationData,
          ...editVerificationData,
          numberOfFamilyMembers: editVerificationData.numberOfFamilyMembers === ''
            ? undefined
            : Number(editVerificationData.numberOfFamilyMembers),
        },
      };

      const response = await apiService.updateAddressVerification(id, payload);
      if (response.success) {
        setIsEditing(false);
        await fetchVerification();
      } else {
        throw new Error(response.message || 'Update failed');
      }
    } catch (error: any) {
      console.error('Save edits error:', error);
      alert(error.message || 'Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateStatus = async (shouldRedirect = false, statusOverride?: string, verificationStatusOverride?: string) => {
    if (!id) return;

    setUpdating(true);
    try {
      const updateData = {
        status: statusOverride ?? status,
        verificationStatus: verificationStatusOverride ?? verificationStatus,
        verificationData: {
          ...verification?.verificationData,
          verifierComments,
          verifiedAt: new Date().toISOString(),
        },
      };

      const response = await apiService.updateAddressVerification(id, updateData);
      if (response.success) {
        alert('Verification updated successfully');
        if (shouldRedirect) {
          navigate('/dashboard', { state: { activeTab: 'address-verification' } });
        } else {
          fetchVerification();
        }
      } else {
        throw new Error(response.message || 'Update failed');
      }
    } catch (error: any) {
      console.error('Update error:', error);
      alert(error.message || 'Failed to update verification');
    } finally {
      setUpdating(false);
    }
  };

  const handleApprove = async () => {
    setStatus('verified');
    setVerificationStatus('completed');
    await handleUpdateStatus(true, 'verified', 'completed');
  };

  const handleReject = async () => {
    // Validate that admin has entered comments
    if (!verifierComments || verifierComments.trim() === '') {
      alert('Please add comments explaining the reason for rejection before proceeding. This will help the candidate understand what needs to be corrected.');
      return;
    }

    if (!window.confirm('Are you sure you want to reject this verification? The candidate will receive an email with your comments and a new verification link.')) return;
    setStatus('failed');
    setVerificationStatus('completed');
    await handleUpdateStatus(true, 'failed', 'completed');
  };

  const handleSendLink = async () => {
    if (!id || !verification) return;

    if (!window.confirm(`Send verification link to ${verification.email}?`)) {
      return;
    }

    try {
      const response = await apiService.sendVerificationLink(id);
      if (response.success) {
        alert('Verification link sent successfully!');
        fetchVerification();
      }
    } catch (error) {
      console.error('Send link error:', error);
      alert('Failed to send verification link');
    }
  };

  const handleSendWhatsApp = () => {
    if (!verification) return;

    // Get the verification link from the verification object
    const verificationLink = verification.verificationLink || '';

    // Format phone number - remove any non-digit characters and ensure it has country code
    let phoneNumber = verification.phone.replace(/\D/g, '');

    // If phone doesn't start with country code, assume India (+91)
    if (!phoneNumber.startsWith('91') && phoneNumber.length === 10) {
      phoneNumber = '91' + phoneNumber;
    }

    // Create the WhatsApp message
    const message = `Dear ${verification.name},

Greetings from Zella Screenings!

We are conducting a background verification on behalf of *${verification.companyName}*. As part of this process, we need you to verify your address details.

*Address to Verify:*
${verification.address}

Please click the link below to complete your address verification:
${verificationLink}

*Instructions:*
1. Click the verification link
2. Confirm if the address is correct
3. Upload required proof documents
4. Submit the verification form

⏰ *Important:* This verification link will expire in 30 days.

If you have any questions, please contact us:
📧 Email: start@zellascreenings.com
📞 Phone: +91 8178685006 / +91 9871967859

Best regards,
*Team Zella Screenings*
SECURE | AUTHENTICATE`;

    // Encode the message for URL
    const encodedMessage = encodeURIComponent(message);

    // Create WhatsApp Web URL
    const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodedMessage}`;

    // Open WhatsApp in new tab
    window.open(whatsappUrl, '_blank');
  };

  const triggerFileUpload = (docType: string) => {
    setActiveUploadDocType(docType);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeUploadDocType) return;
    await handleUploadDocument(file, activeUploadDocType);
    setActiveUploadDocType(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleUploadDocument = async (file: File, docType: string) => {
    if (!id) return;
    setUploadingDoc(docType);
    try {
      const response = await apiService.adminUploadVerificationDocument(id, file, docType);
      if (response.success) {
        await fetchVerification();
      } else {
        throw new Error(response.message || 'Upload failed');
      }
    } catch (error: any) {
      console.error('Upload document error:', error);
      alert(error.message || 'Failed to upload document');
    } finally {
      setUploadingDoc(null);
    }
  };

  const handleDeleteDocument = (docType: string, label: string) => {
    setDocToDelete({ docType, label });
    setDeleteConfirmOpen(true);
  };

  const confirmDeleteDocument = async () => {
    if (!id || !docToDelete) return;
    setDeletingDoc(docToDelete.docType);
    try {
      const response = await apiService.adminDeleteVerificationDocument(id, docToDelete.docType);
      if (response.success) {
        await fetchVerification();
      } else {
        throw new Error(response.message || 'Delete failed');
      }
    } catch (error: any) {
      console.error('Delete document error:', error);
      alert(error.message || 'Failed to delete document');
    } finally {
      setDeletingDoc(null);
      setDocToDelete(null);
    }
  };

  const isImage = (filename: string) => /\.(jpg|jpeg|png)$/i.test(filename);
  const isPDF = (filename: string) => /\.pdf$/i.test(filename);

  const hasSubmitted = verification && (
    verification.verificationStatus === 'in_progress' ||
    verification.verificationStatus === 'completed'
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-brand-green border-t-transparent"></div>
          <p className="mt-4 text-gray-600">Loading verification details...</p>
        </div>
      </div>
    );
  }

  if (!verification) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 mx-auto mb-4 text-gray-400" />
          <p className="text-xl text-gray-600">Verification not found</p>
          <Button onClick={() => navigate('/dashboard', { state: { activeTab: 'address-verification' } })} className="mt-4">
            Back to Address Verification
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-md border-b-4 border-brand-green sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                onClick={() => navigate('/dashboard', { state: { activeTab: 'address-verification' } })}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="w-5 h-5" />
                Back
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Verification Report</h1>
                <p className="text-sm text-gray-500 font-mono">{verification.code}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {verification.verificationLink && (
                <Button
                  onClick={handleSendWhatsApp}
                  className="bg-green-600 hover:bg-green-700 text-white"
                  size="sm"
                >
                  <MessageCircle className="w-4 h-4 mr-2" />
                  WhatsApp
                </Button>
              )}
              {!isEditing ? (
                <Button
                  onClick={handleStartEditing}
                  variant="outline"
                  size="sm"
                >
                  <Pencil className="w-4 h-4 mr-2" />
                  Edit
                </Button>
              ) : (
                <>
                  <Button
                    onClick={handleCancelEditing}
                    variant="outline"
                    size="sm"
                    disabled={saving}
                  >
                    <X className="w-4 h-4 mr-2" />
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSaveEdits}
                    size="sm"
                    disabled={saving}
                    className="bg-brand-green hover:bg-green-700 text-white"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {saving ? 'Saving...' : 'Save Changes'}
                  </Button>
                </>
              )}
              <span
                className={`px-4 py-2 rounded-full text-sm font-medium ${
                  verification.status === 'verified'
                    ? 'bg-green-100 text-green-800'
                    : verification.status === 'failed'
                    ? 'bg-red-100 text-red-800'
                    : verification.status === 'insufficiency'
                    ? 'bg-orange-100 text-orange-800'
                    : 'bg-yellow-100 text-yellow-800'
                }`}
              >
                {verification.status}
              </span>
              <span
                className={`px-4 py-2 rounded-full text-sm font-medium ${
                  verification.verificationStatus === 'completed'
                    ? 'bg-blue-100 text-blue-800'
                    : verification.verificationStatus === 'in_progress'
                    ? 'bg-purple-100 text-purple-800'
                    : 'bg-gray-100 text-gray-800'
                }`}
              >
                {verification.verificationStatus.replace(/_/g, ' ')}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Candidate Not Submitted Alert */}
        {!hasSubmitted && (
          <Card className="mb-6 border-2 border-yellow-300 bg-yellow-50">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <AlertCircle className="w-8 h-8 text-yellow-600 flex-shrink-0 mt-1" />
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-yellow-900 mb-2">
                    Candidate Has Not Submitted Verification Yet
                  </h3>
                  <p className="text-yellow-800 mb-4">
                    The verification link has {verification.verificationStatus === 'link_sent' ? 'been sent' : 'not been sent'} to the candidate.
                    They need to submit their verification information and documents.
                  </p>
                  <div className="flex gap-3">
                    <Button
                      onClick={handleSendLink}
                      className="bg-yellow-600 hover:bg-yellow-700 text-white"
                    >
                      <Send className="w-4 h-4 mr-2" />
                      {verification.verificationStatus === 'link_sent' ? 'Resend Verification Link' : 'Send Verification Link'}
                    </Button>
                    <Button
                      onClick={handleSendWhatsApp}
                      className="bg-green-600 hover:bg-green-700 text-white"
                      title="Send via WhatsApp"
                    >
                      <MessageCircle className="w-4 h-4 mr-2" />
                      Send via WhatsApp
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Candidate Basic Information */}
            <Card>
              <CardHeader className="bg-gray-50 border-b border-gray-200">
                <CardTitle className="flex items-center gap-2 text-gray-900">
                  <User className="w-5 h-5 text-brand-green" />
                  Candidate Information
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label className="text-gray-600 text-sm font-medium">Code</Label>
                    <p className="font-mono text-base mt-1">{verification.code}</p>
                  </div>
                  <div>
                    <Label className="text-gray-600 text-sm font-medium">Applicant No</Label>
                    {isEditing ? (
                      <Input className="mt-1" value={editForm.applicantNo} onChange={e => handleEditFormChange('applicantNo', e.target.value)} />
                    ) : (
                      <p className="text-base mt-1">{verification.applicantNo || '-'}</p>
                    )}
                  </div>
                  <div>
                    <Label className="text-gray-600 text-sm font-medium">Full Name</Label>
                    {isEditing ? (
                      <>
                        <Input className="mt-1" value={editForm.name} onChange={e => handleEditFormChange('name', e.target.value)} />
                        {editErrors.name && <p className="text-red-500 text-xs mt-1">{editErrors.name}</p>}
                      </>
                    ) : (
                      <p className="text-base font-semibold mt-1">{verification.name}</p>
                    )}
                  </div>
                  <div>
                    <Label className="text-gray-600 text-sm font-medium">Father's Name</Label>
                    {isEditing ? (
                      <Input className="mt-1" value={editForm.fathersName} onChange={e => handleEditFormChange('fathersName', e.target.value)} />
                    ) : (
                      <p className="text-base mt-1">{verification.fathersName || '-'}</p>
                    )}
                  </div>
                  <div>
                    <Label className="text-gray-600 text-sm font-medium">Email Address</Label>
                    {isEditing ? (
                      <>
                        <Input className="mt-1" type="email" value={editForm.email} onChange={e => handleEditFormChange('email', e.target.value)} />
                        {editErrors.email && <p className="text-red-500 text-xs mt-1">{editErrors.email}</p>}
                      </>
                    ) : (
                      <p className="flex items-center gap-2 mt-1">
                        <Mail className="w-4 h-4 text-gray-400" />
                        <span className="text-base">{verification.email}</span>
                      </p>
                    )}
                  </div>
                  <div>
                    <Label className="text-gray-600 text-sm font-medium">Phone Number</Label>
                    {isEditing ? (
                      <>
                        <Input className="mt-1" type="tel" value={editForm.phone} onChange={e => handleEditFormChange('phone', e.target.value)} />
                        {editErrors.phone && <p className="text-red-500 text-xs mt-1">{editErrors.phone}</p>}
                      </>
                    ) : (
                      <p className="flex items-center gap-2 mt-1">
                        <Phone className="w-4 h-4 text-gray-400" />
                        <span className="text-base">{verification.phone}</span>
                      </p>
                    )}
                  </div>
                  <div className="md:col-span-2">
                    <Label className="text-gray-600 text-sm font-medium">Company Name</Label>
                    {isEditing ? (
                      <>
                        <Input className="mt-1" value={editForm.companyName} onChange={e => handleEditFormChange('companyName', e.target.value)} />
                        {editErrors.companyName && <p className="text-red-500 text-xs mt-1">{editErrors.companyName}</p>}
                      </>
                    ) : (
                      <p className="text-base mt-1">{verification.companyName}</p>
                    )}
                  </div>
                  <div className="md:col-span-2">
                    <Label className="text-gray-600 text-sm font-medium">Address</Label>
                    {isEditing ? (
                      <>
                        <textarea className="mt-1 w-full px-3 py-2 text-sm border border-input rounded-md bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" rows={2} value={editForm.address} onChange={e => handleEditFormChange('address', e.target.value)} />
                        {editErrors.address && <p className="text-red-500 text-xs mt-1">{editErrors.address}</p>}
                      </>
                    ) : (
                      <p className="flex items-start gap-2 mt-1">
                        <Home className="w-4 h-4 text-gray-400 mt-1" />
                        <span className="text-base">{verification.address}</span>
                      </p>
                    )}
                  </div>
                  {(isEditing || verification.presentAddress) && (
                    <div className="md:col-span-2">
                      <Label className="text-gray-600 text-sm font-medium">Present Address</Label>
                      {isEditing ? (
                        <textarea className="mt-1 w-full px-3 py-2 text-sm border border-input rounded-md bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" rows={2} value={editForm.presentAddress} onChange={e => handleEditFormChange('presentAddress', e.target.value)} />
                      ) : (
                        <p className="text-base mt-1">{verification.presentAddress || '-'}</p>
                      )}
                    </div>
                  )}
                  <div>
                    <Label className="text-gray-600 text-sm font-medium">City</Label>
                    {isEditing ? (
                      <Input className="mt-1" value={editForm.city} onChange={e => handleEditFormChange('city', e.target.value)} />
                    ) : (
                      <p className="text-base mt-1">{verification.city || '-'}</p>
                    )}
                  </div>
                  <div>
                    <Label className="text-gray-600 text-sm font-medium">State</Label>
                    {isEditing ? (
                      <Input className="mt-1" value={editForm.state} onChange={e => handleEditFormChange('state', e.target.value)} />
                    ) : (
                      <p className="text-base mt-1">{verification.state || '-'}</p>
                    )}
                  </div>
                  <div>
                    <Label className="text-gray-600 text-sm font-medium">PIN Code</Label>
                    {isEditing ? (
                      <>
                        <Input className="mt-1" maxLength={6} value={editForm.pin} onChange={e => handleEditFormChange('pin', e.target.value)} />
                        {editErrors.pin && <p className="text-red-500 text-xs mt-1">{editErrors.pin}</p>}
                      </>
                    ) : (
                      <p className="text-base mt-1">{verification.pin || '-'}</p>
                    )}
                  </div>
                  <div>
                    <Label className="text-gray-600 text-sm font-medium">Landmark</Label>
                    {isEditing ? (
                      <Input className="mt-1" value={editForm.landmark} onChange={e => handleEditFormChange('landmark', e.target.value)} />
                    ) : (
                      <p className="text-base mt-1">{verification.landmark || '-'}</p>
                    )}
                  </div>
                  <div>
                    <Label className="text-gray-600 text-sm font-medium">Address Type</Label>
                    {isEditing ? (
                      <select className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" value={editForm.addressType} onChange={e => handleEditFormChange('addressType', e.target.value)}>
                        {addressTypeOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                    ) : (
                      <p className="text-base mt-1 capitalize">{verification.addressType}</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Submitted Verification Data - Only show if submitted */}
            {hasSubmitted && verification.verificationData && (
              <>
                {/* Contact Person Information */}
                <Card>
                  <CardHeader className="bg-blue-50 border-b border-blue-200">
                    <CardTitle className="flex items-center gap-2 text-gray-900">
                      <User className="w-5 h-5 text-blue-600" />
                      Contact Person Details
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <Label className="text-gray-600 text-sm font-medium">Contact Person Name</Label>
                        {isEditing ? (
                          <Input className="mt-1" value={editVerificationData.contactPersonName} onChange={e => handleEditVdChange('contactPersonName', e.target.value)} />
                        ) : (
                          <p className="text-base font-semibold mt-1">{verification.verificationData.contactPersonName || '-'}</p>
                        )}
                      </div>
                      <div>
                        <Label className="text-gray-600 text-sm font-medium">Relation</Label>
                        {isEditing ? (
                          <Input className="mt-1" value={editVerificationData.contactPersonRelation} onChange={e => handleEditVdChange('contactPersonRelation', e.target.value)} />
                        ) : (
                          <p className="text-base mt-1">{verification.verificationData.contactPersonRelation || '-'}</p>
                        )}
                      </div>
                      <div>
                        <Label className="text-gray-600 text-sm font-medium">Contact Phone</Label>
                        {isEditing ? (
                          <Input className="mt-1" type="tel" value={editVerificationData.contactPhoneNo} onChange={e => handleEditVdChange('contactPhoneNo', e.target.value)} />
                        ) : (
                          <p className="text-base mt-1">{verification.verificationData.contactPhoneNo || '-'}</p>
                        )}
                      </div>
                      <div>
                        <Label className="text-gray-600 text-sm font-medium">Number of Family Members</Label>
                        {isEditing ? (
                          <Input className="mt-1" type="number" min={0} value={editVerificationData.numberOfFamilyMembers} onChange={e => handleEditVdChange('numberOfFamilyMembers', e.target.value)} />
                        ) : (
                          <p className="text-base mt-1">{verification.verificationData.numberOfFamilyMembers || '-'}</p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* ID Proof & Address Details */}
                <Card>
                  <CardHeader className="bg-green-50 border-b border-green-200">
                    <CardTitle className="flex items-center gap-2 text-gray-900">
                      <FileText className="w-5 h-5 text-green-600" />
                      ID Proof & Address Details
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <Label className="text-gray-600 text-sm font-medium">ID Proof Type</Label>
                        {isEditing ? (
                          <select className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" value={editVerificationData.idProofType} onChange={e => handleEditVdChange('idProofType', e.target.value)}>
                            <option value="">Select...</option>
                            {idProofTypeOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                          </select>
                        ) : (
                          <p className="text-base font-semibold capitalize mt-1">
                            {verification.verificationData.idProofType?.replace(/_/g, ' ') || '-'}
                          </p>
                        )}
                      </div>
                      <div>
                        <Label className="text-gray-600 text-sm font-medium">ID Proof Number</Label>
                        {isEditing ? (
                          <Input className="mt-1" value={editVerificationData.idProofNumber} onChange={e => handleEditVdChange('idProofNumber', e.target.value)} />
                        ) : (
                          <p className="text-base font-mono mt-1">{verification.verificationData.idProofNumber || '-'}</p>
                        )}
                      </div>
                      <div>
                        <Label className="text-gray-600 text-sm font-medium">Residential Status</Label>
                        {isEditing ? (
                          <select className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" value={editVerificationData.residentialStatus} onChange={e => handleEditVdChange('residentialStatus', e.target.value)}>
                            <option value="">Select...</option>
                            {residentialStatusOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                          </select>
                        ) : (
                          <p className="text-base capitalize mt-1">
                            {verification.verificationData.residentialStatus?.replace(/_/g, ' ') || '-'}
                          </p>
                        )}
                      </div>
                      <div>
                        <Label className="text-gray-600 text-sm font-medium">Period of Stay</Label>
                        {isEditing ? (
                          <Input className="mt-1" value={editVerificationData.periodOfStay} onChange={e => handleEditVdChange('periodOfStay', e.target.value)} />
                        ) : (
                          <p className="text-base mt-1">{verification.verificationData.periodOfStay || '-'}</p>
                        )}
                      </div>
                      <div className="md:col-span-2">
                        <Label className="text-gray-600 text-sm font-medium">Landmark</Label>
                        {isEditing ? (
                          <Input className="mt-1" value={editVerificationData.landmark} onChange={e => handleEditVdChange('landmark', e.target.value)} />
                        ) : (
                          <p className="text-base mt-1">{verification.verificationData.landmark || '-'}</p>
                        )}
                      </div>
                      <div className="md:col-span-2">
                        <Label className="text-gray-600 text-sm font-medium">Remarks</Label>
                        {isEditing ? (
                          <textarea className="mt-1 w-full px-3 py-2 text-sm border border-input rounded-md bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" rows={3} value={editVerificationData.remarks} onChange={e => handleEditVdChange('remarks', e.target.value)} />
                        ) : (
                          <p className="text-base mt-1">{verification.verificationData.remarks || '-'}</p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Geolocation */}
                {(verification.verificationData.latitude || verification.verificationData.longitude) && (
                  <Card>
                    <CardHeader className="bg-purple-50 border-b border-purple-200">
                      <CardTitle className="flex items-center gap-2 text-gray-900">
                        <MapPin className="w-5 h-5 text-purple-600" />
                        Geolocation Data
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <Label className="text-gray-600 text-sm font-medium">Latitude</Label>
                          <p className="text-base font-mono mt-1">{verification.verificationData.latitude}</p>
                        </div>
                        <div>
                          <Label className="text-gray-600 text-sm font-medium">Longitude</Label>
                          <p className="text-base font-mono mt-1">{verification.verificationData.longitude}</p>
                        </div>
                        {verification.verificationData.gpsAddress && (
                          <div className="md:col-span-2">
                            <Label className="text-gray-600 text-sm font-medium">GPS Address</Label>
                            <p className="text-base mt-1">{verification.verificationData.gpsAddress}</p>
                          </div>
                        )}
                        <div className="md:col-span-2">
                          <a
                            href={`https://www.google.com/maps?q=${verification.verificationData.latitude},${verification.verificationData.longitude}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 text-brand-green hover:underline text-base"
                          >
                            <MapPin className="w-5 h-5" />
                            View Location on Google Maps
                          </a>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Submission Metadata */}
                <Card>
                  <CardHeader className="bg-gray-100 border-b border-gray-200">
                    <CardTitle className="text-gray-900">Submission Information</CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {verification.verificationData.submittedAt && (
                        <div>
                          <Label className="text-gray-600 text-sm font-medium">Submitted At</Label>
                          <p className="text-base mt-1">{new Date(verification.verificationData.submittedAt).toLocaleString()}</p>
                        </div>
                      )}
                      {verification.verificationData.ipAddress && (
                        <div>
                          <Label className="text-gray-600 text-sm font-medium">IP Address</Label>
                          <p className="text-base font-mono mt-1">{verification.verificationData.ipAddress}</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </>
            )}

            {/* Document Gallery - Always visible (independent of submission status) */}
            <Card>
              <CardHeader className="bg-orange-50 border-b border-orange-200">
                <CardTitle className="flex items-center gap-2 text-gray-900">
                  <FileText className="w-5 h-5 text-orange-600" />
                  Uploaded Documents
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileInputChange}
                  accept="image/jpeg,image/png,image/jpg,application/pdf"
                  className="hidden"
                />
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {DOCUMENT_SLOTS.map((slot) => {
                    const doc = verification.verificationData?.[slot.fieldName as keyof typeof verification.verificationData] as any;
                    const isUploading = uploadingDoc === slot.docType;
                    const isDeleting = deletingDoc === slot.docType;

                    if (doc && doc.docName) {
                      return (
                        <div key={slot.docType} className="border-2 border-gray-200 rounded-lg overflow-hidden bg-white hover:shadow-lg transition-shadow">
                          <div className="aspect-video bg-gray-100 relative overflow-hidden">
                            {isImage(doc.docName) ? (
                              <img
                                src={doc.s3Url}
                                alt={slot.label}
                                className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform"
                                onClick={() => setSelectedImage(doc.s3Url)}
                              />
                            ) : isPDF(doc.docName) ? (
                              <div className="w-full h-full flex items-center justify-center">
                                <FileText className="w-16 h-16 text-red-500" />
                              </div>
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <FileText className="w-16 h-16 text-gray-400" />
                              </div>
                            )}
                          </div>
                          <div className="p-4">
                            <div className="flex items-center justify-between mb-2">
                              <Label className="text-gray-700 font-semibold text-base">{slot.label}</Label>
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => triggerFileUpload(slot.docType)}
                                  disabled={isUploading || isDeleting}
                                  className="p-1.5 text-gray-500 hover:text-brand-green hover:bg-green-50 rounded-md transition-colors disabled:opacity-50"
                                  title="Replace document"
                                >
                                  {isUploading ? (
                                    <div className="w-4 h-4 border-2 border-brand-green border-t-transparent rounded-full animate-spin" />
                                  ) : (
                                    <Upload className="w-4 h-4" />
                                  )}
                                </button>
                                <button
                                  onClick={() => handleDeleteDocument(slot.docType, slot.label)}
                                  disabled={isUploading || isDeleting}
                                  className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors disabled:opacity-50"
                                  title="Delete document"
                                >
                                  {isDeleting ? (
                                    <div className="w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
                                  ) : (
                                    <Trash2 className="w-4 h-4" />
                                  )}
                                </button>
                              </div>
                            </div>
                            <p className="text-sm text-gray-600 truncate mb-2" title={doc.docName}>
                              {doc.docName}
                            </p>
                            <p className="text-xs text-gray-500 flex items-center gap-1 mb-3">
                              <Calendar className="w-3 h-3" />
                              {new Date(doc.uploadedAt).toLocaleDateString()}
                            </p>
                            <a
                              href={doc.s3Url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-brand-green hover:underline text-sm font-medium"
                            >
                              View Full Document →
                            </a>
                          </div>
                        </div>
                      );
                    }

                    // Empty slot - show upload placeholder
                    return (
                      <div
                        key={slot.docType}
                        className="border-2 border-dashed border-gray-300 rounded-lg overflow-hidden bg-gray-50 hover:border-brand-green hover:bg-green-50/30 transition-colors"
                      >
                        <div className="aspect-video flex flex-col items-center justify-center p-6">
                          <Upload className="w-10 h-10 text-gray-400 mb-3" />
                          <Label className="text-gray-600 font-semibold text-base mb-2">{slot.label}</Label>
                          <p className="text-sm text-gray-400 mb-4">No document uploaded</p>
                          <Button
                            onClick={() => triggerFileUpload(slot.docType)}
                            disabled={isUploading}
                            variant="outline"
                            size="sm"
                            className="gap-2"
                          >
                            {isUploading ? (
                              <>
                                <div className="w-4 h-4 border-2 border-brand-green border-t-transparent rounded-full animate-spin" />
                                Uploading...
                              </>
                            ) : (
                              <>
                                <Upload className="w-4 h-4" />
                                Upload
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Admin Actions */}
          <div className="lg:col-span-1">
            <Card className="sticky top-24">
              <CardHeader className="bg-brand-green text-white">
                <CardTitle>Admin Actions</CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                {isEditing && (
                  <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-3 flex items-start gap-2">
                    <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-yellow-800">Editing in progress. Save or cancel before taking other actions.</p>
                  </div>
                )}
                {/* Current Status Display (Read-Only) */}
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 space-y-3">
                  <div>
                    <Label className="text-gray-600 text-sm font-medium">Current Status</Label>
                    <div className="mt-2">
                      <span
                        className={`inline-block px-4 py-2 rounded-full text-sm font-semibold ${
                          status === 'verified'
                            ? 'bg-green-100 text-green-800'
                            : status === 'failed'
                            ? 'bg-red-100 text-red-800'
                            : status === 'insufficiency'
                            ? 'bg-orange-100 text-orange-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}
                      >
                        {status.charAt(0).toUpperCase() + status.slice(1)}
                      </span>
                    </div>
                  </div>
                  <div>
                    <Label className="text-gray-600 text-sm font-medium">Workflow Status</Label>
                    <div className="mt-2">
                      <span
                        className={`inline-block px-4 py-2 rounded-full text-sm font-semibold ${
                          verificationStatus === 'completed'
                            ? 'bg-blue-100 text-blue-800'
                            : verificationStatus === 'in_progress'
                            ? 'bg-purple-100 text-purple-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {verificationStatus.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </span>
                    </div>
                  </div>
                </div>

                <div>
                  <Label htmlFor="verifierComments" className="text-gray-700 font-medium">
                    Verifier Comments
                  </Label>
                  <textarea
                    id="verifierComments"
                    value={verifierComments}
                    onChange={(e) => setVerifierComments(e.target.value)}
                    rows={5}
                    disabled={isEditing}
                    className="mt-2 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-green disabled:opacity-50 disabled:cursor-not-allowed"
                    placeholder="Add your comments here..."
                  />
                </div>

                {/* Quick Actions for Communication */}
                {!hasSubmitted && verification.verificationLink && (
                  <div className="pb-4 border-b border-gray-200">
                    <Label className="text-gray-700 font-medium mb-2 block">Quick Actions</Label>
                    <Button
                      onClick={handleSendWhatsApp}
                      className="w-full bg-green-600 hover:bg-green-700 text-white mb-2"
                    >
                      <MessageCircle className="w-4 h-4 mr-2" />
                      Send via WhatsApp
                    </Button>
                    <p className="text-xs text-gray-500 mt-1">Opens WhatsApp with preset message</p>
                  </div>
                )}

                <div className="space-y-3 pt-4 border-t border-gray-200">
                  <p className="text-sm text-gray-600 mb-3">
                    Use the buttons below to approve or reject this verification. Status will be automatically set based on your action.
                  </p>
                  <Button
                    onClick={handleApprove}
                    disabled={updating || isEditing}
                    className="w-full bg-green-600 hover:bg-green-700 text-white"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    {updating ? 'Updating...' : 'Approve & Complete'}
                  </Button>
                  <Button
                    onClick={handleReject}
                    disabled={updating || isEditing}
                    variant="destructive"
                    className="w-full"
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    Reject
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <ConfirmationDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        onConfirm={confirmDeleteDocument}
        title="Delete Document"
        description={`Are you sure you want to delete "${docToDelete?.label}"? This will permanently remove the file. This cannot be undone.`}
        confirmText="Delete"
        destructive={true}
      />

      {/* Image Lightbox */}
      {selectedImage && (
        <div
          className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedImage(null)}
        >
          <button
            onClick={() => setSelectedImage(null)}
            className="absolute top-4 right-4 text-white text-4xl hover:text-gray-300"
          >
            ×
          </button>
          <img
            src={selectedImage}
            alt="Full size"
            className="max-w-full max-h-full object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
};

export default VerificationDetailPage;
