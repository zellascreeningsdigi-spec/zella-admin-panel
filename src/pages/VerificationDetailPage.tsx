import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, MapPin, User, FileText, Home, Phone, Mail, Calendar, AlertCircle, CheckCircle, XCircle, Send, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AddressVerification } from '@/types/addressVerification';
import apiService from '@/services/api';

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
                    <p className="text-base mt-1">{verification.applicantNo || '-'}</p>
                  </div>
                  <div>
                    <Label className="text-gray-600 text-sm font-medium">Full Name</Label>
                    <p className="text-base font-semibold mt-1">{verification.name}</p>
                  </div>
                  <div>
                    <Label className="text-gray-600 text-sm font-medium">Father's Name</Label>
                    <p className="text-base mt-1">{verification.fathersName || '-'}</p>
                  </div>
                  <div>
                    <Label className="text-gray-600 text-sm font-medium">Email Address</Label>
                    <p className="flex items-center gap-2 mt-1">
                      <Mail className="w-4 h-4 text-gray-400" />
                      <span className="text-base">{verification.email}</span>
                    </p>
                  </div>
                  <div>
                    <Label className="text-gray-600 text-sm font-medium">Phone Number</Label>
                    <p className="flex items-center gap-2 mt-1">
                      <Phone className="w-4 h-4 text-gray-400" />
                      <span className="text-base">{verification.phone}</span>
                    </p>
                  </div>
                  <div className="md:col-span-2">
                    <Label className="text-gray-600 text-sm font-medium">Company Name</Label>
                    <p className="text-base mt-1">{verification.companyName}</p>
                  </div>
                  <div className="md:col-span-2">
                    <Label className="text-gray-600 text-sm font-medium">Address</Label>
                    <p className="flex items-start gap-2 mt-1">
                      <Home className="w-4 h-4 text-gray-400 mt-1" />
                      <span className="text-base">{verification.address}</span>
                    </p>
                  </div>
                  <div>
                    <Label className="text-gray-600 text-sm font-medium">City</Label>
                    <p className="text-base mt-1">{verification.city || '-'}</p>
                  </div>
                  <div>
                    <Label className="text-gray-600 text-sm font-medium">State</Label>
                    <p className="text-base mt-1">{verification.state || '-'}</p>
                  </div>
                  <div>
                    <Label className="text-gray-600 text-sm font-medium">PIN Code</Label>
                    <p className="text-base mt-1">{verification.pin || '-'}</p>
                  </div>
                  <div>
                    <Label className="text-gray-600 text-sm font-medium">Address Type</Label>
                    <p className="text-base mt-1 capitalize">{verification.addressType}</p>
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
                        <p className="text-base font-semibold mt-1">{verification.verificationData.contactPersonName || '-'}</p>
                      </div>
                      <div>
                        <Label className="text-gray-600 text-sm font-medium">Relation</Label>
                        <p className="text-base mt-1">{verification.verificationData.contactPersonRelation || '-'}</p>
                      </div>
                      <div>
                        <Label className="text-gray-600 text-sm font-medium">Contact Phone</Label>
                        <p className="text-base mt-1">{verification.verificationData.contactPhoneNo || '-'}</p>
                      </div>
                      <div>
                        <Label className="text-gray-600 text-sm font-medium">Number of Family Members</Label>
                        <p className="text-base mt-1">{verification.verificationData.numberOfFamilyMembers || '-'}</p>
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
                        <p className="text-base font-semibold capitalize mt-1">
                          {verification.verificationData.idProofType?.replace(/_/g, ' ') || '-'}
                        </p>
                      </div>
                      <div>
                        <Label className="text-gray-600 text-sm font-medium">ID Proof Number</Label>
                        <p className="text-base font-mono mt-1">{verification.verificationData.idProofNumber || '-'}</p>
                      </div>
                      <div>
                        <Label className="text-gray-600 text-sm font-medium">Residential Status</Label>
                        <p className="text-base capitalize mt-1">
                          {verification.verificationData.residentialStatus?.replace(/_/g, ' ') || '-'}
                        </p>
                      </div>
                      <div>
                        <Label className="text-gray-600 text-sm font-medium">Period of Stay</Label>
                        <p className="text-base mt-1">{verification.verificationData.periodOfStay || '-'}</p>
                      </div>
                      <div className="md:col-span-2">
                        <Label className="text-gray-600 text-sm font-medium">Landmark</Label>
                        <p className="text-base mt-1">{verification.verificationData.landmark || '-'}</p>
                      </div>
                      <div className="md:col-span-2">
                        <Label className="text-gray-600 text-sm font-medium">Remarks</Label>
                        <p className="text-base mt-1">{verification.verificationData.remarks || '-'}</p>
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

                {/* Document Gallery */}
                <Card>
                  <CardHeader className="bg-orange-50 border-b border-orange-200">
                    <CardTitle className="flex items-center gap-2 text-gray-900">
                      <FileText className="w-5 h-5 text-orange-600" />
                      Uploaded Documents
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {/* ID Proof One */}
                      {verification.verificationData.idProofOne && (
                        <div className="border-2 border-gray-200 rounded-lg overflow-hidden bg-white hover:shadow-lg transition-shadow">
                          <div className="aspect-video bg-gray-100 relative overflow-hidden">
                            {isImage(verification.verificationData.idProofOne.docName) ? (
                              <img
                                src={verification.verificationData.idProofOne.s3Url}
                                alt="ID Proof One"
                                className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform"
                                onClick={() => setSelectedImage(verification.verificationData!.idProofOne!.s3Url)}
                              />
                            ) : isPDF(verification.verificationData.idProofOne.docName) ? (
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
                            <Label className="text-gray-700 font-semibold text-base block mb-2">ID Proof One</Label>
                            <p className="text-sm text-gray-600 truncate mb-2" title={verification.verificationData.idProofOne.docName}>
                              {verification.verificationData.idProofOne.docName}
                            </p>
                            <p className="text-xs text-gray-500 flex items-center gap-1 mb-3">
                              <Calendar className="w-3 h-3" />
                              {new Date(verification.verificationData.idProofOne.uploadedAt).toLocaleDateString()}
                            </p>
                            <a
                              href={verification.verificationData.idProofOne.s3Url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-brand-green hover:underline text-sm font-medium"
                            >
                              View Full Document →
                            </a>
                          </div>
                        </div>
                      )}

                      {/* ID Proof Two */}
                      {verification.verificationData.idProofTwo && (
                        <div className="border-2 border-gray-200 rounded-lg overflow-hidden bg-white hover:shadow-lg transition-shadow">
                          <div className="aspect-video bg-gray-100 relative overflow-hidden">
                            {isImage(verification.verificationData.idProofTwo.docName) ? (
                              <img
                                src={verification.verificationData.idProofTwo.s3Url}
                                alt="ID Proof Two"
                                className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform"
                                onClick={() => setSelectedImage(verification.verificationData!.idProofTwo!.s3Url)}
                              />
                            ) : isPDF(verification.verificationData.idProofTwo.docName) ? (
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
                            <Label className="text-gray-700 font-semibold text-base block mb-2">ID Proof Two</Label>
                            <p className="text-sm text-gray-600 truncate mb-2" title={verification.verificationData.idProofTwo.docName}>
                              {verification.verificationData.idProofTwo.docName}
                            </p>
                            <p className="text-xs text-gray-500 flex items-center gap-1 mb-3">
                              <Calendar className="w-3 h-3" />
                              {new Date(verification.verificationData.idProofTwo.uploadedAt).toLocaleDateString()}
                            </p>
                            <a
                              href={verification.verificationData.idProofTwo.s3Url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-brand-green hover:underline text-sm font-medium"
                            >
                              View Full Document →
                            </a>
                          </div>
                        </div>
                      )}

                      {/* House Image One */}
                      {verification.verificationData.houseImageOne && (
                        <div className="border-2 border-gray-200 rounded-lg overflow-hidden bg-white hover:shadow-lg transition-shadow">
                          <div className="aspect-video bg-gray-100 relative overflow-hidden">
                            {isImage(verification.verificationData.houseImageOne.docName) ? (
                              <img
                                src={verification.verificationData.houseImageOne.s3Url}
                                alt="House One"
                                className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform"
                                onClick={() => setSelectedImage(verification.verificationData!.houseImageOne!.s3Url)}
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <FileText className="w-16 h-16 text-gray-400" />
                              </div>
                            )}
                          </div>
                          <div className="p-4">
                            <Label className="text-gray-700 font-semibold text-base block mb-2">House Image One</Label>
                            <p className="text-sm text-gray-600 truncate mb-2" title={verification.verificationData.houseImageOne.docName}>
                              {verification.verificationData.houseImageOne.docName}
                            </p>
                            <p className="text-xs text-gray-500 flex items-center gap-1 mb-3">
                              <Calendar className="w-3 h-3" />
                              {new Date(verification.verificationData.houseImageOne.uploadedAt).toLocaleDateString()}
                            </p>
                            <a
                              href={verification.verificationData.houseImageOne.s3Url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-brand-green hover:underline text-sm font-medium"
                            >
                              View Full Document →
                            </a>
                          </div>
                        </div>
                      )}

                      {/* House Image Two */}
                      {verification.verificationData.houseImageTwo && (
                        <div className="border-2 border-gray-200 rounded-lg overflow-hidden bg-white hover:shadow-lg transition-shadow">
                          <div className="aspect-video bg-gray-100 relative overflow-hidden">
                            {isImage(verification.verificationData.houseImageTwo.docName) ? (
                              <img
                                src={verification.verificationData.houseImageTwo.s3Url}
                                alt="House Two"
                                className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform"
                                onClick={() => setSelectedImage(verification.verificationData!.houseImageTwo!.s3Url)}
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <FileText className="w-16 h-16 text-gray-400" />
                              </div>
                            )}
                          </div>
                          <div className="p-4">
                            <Label className="text-gray-700 font-semibold text-base block mb-2">House Image Two</Label>
                            <p className="text-sm text-gray-600 truncate mb-2" title={verification.verificationData.houseImageTwo.docName}>
                              {verification.verificationData.houseImageTwo.docName}
                            </p>
                            <p className="text-xs text-gray-500 flex items-center gap-1 mb-3">
                              <Calendar className="w-3 h-3" />
                              {new Date(verification.verificationData.houseImageTwo.uploadedAt).toLocaleDateString()}
                            </p>
                            <a
                              href={verification.verificationData.houseImageTwo.s3Url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-brand-green hover:underline text-sm font-medium"
                            >
                              View Full Document →
                            </a>
                          </div>
                        </div>
                      )}

                      {/* Signature */}
                      {verification.verificationData.signature && (
                        <div className="border-2 border-gray-200 rounded-lg overflow-hidden bg-white hover:shadow-lg transition-shadow">
                          <div className="aspect-video bg-gray-100 relative overflow-hidden">
                            {isImage(verification.verificationData.signature.docName) ? (
                              <img
                                src={verification.verificationData.signature.s3Url}
                                alt="Signature"
                                className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform"
                                onClick={() => setSelectedImage(verification.verificationData!.signature!.s3Url)}
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <FileText className="w-16 h-16 text-gray-400" />
                              </div>
                            )}
                          </div>
                          <div className="p-4">
                            <Label className="text-gray-700 font-semibold text-base block mb-2">Signature</Label>
                            <p className="text-sm text-gray-600 truncate mb-2" title={verification.verificationData.signature.docName}>
                              {verification.verificationData.signature.docName}
                            </p>
                            <p className="text-xs text-gray-500 flex items-center gap-1 mb-3">
                              <Calendar className="w-3 h-3" />
                              {new Date(verification.verificationData.signature.uploadedAt).toLocaleDateString()}
                            </p>
                            <a
                              href={verification.verificationData.signature.s3Url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-brand-green hover:underline text-sm font-medium"
                            >
                              View Full Document →
                            </a>
                          </div>
                        </div>
                      )}

                      {/* Candidate Selfie */}
                      {verification.verificationData.candidateSelfie && (
                        <div className="border-2 border-gray-200 rounded-lg overflow-hidden bg-white hover:shadow-lg transition-shadow">
                          <div className="aspect-video bg-gray-100 relative overflow-hidden">
                            {isImage(verification.verificationData.candidateSelfie.docName) ? (
                              <img
                                src={verification.verificationData.candidateSelfie.s3Url}
                                alt="Candidate Selfie"
                                className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform"
                                onClick={() => setSelectedImage(verification.verificationData!.candidateSelfie!.s3Url)}
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <FileText className="w-16 h-16 text-gray-400" />
                              </div>
                            )}
                          </div>
                          <div className="p-4">
                            <Label className="text-gray-700 font-semibold text-base block mb-2">Candidate Selfie</Label>
                            <p className="text-sm text-gray-600 truncate mb-2" title={verification.verificationData.candidateSelfie.docName}>
                              {verification.verificationData.candidateSelfie.docName}
                            </p>
                            <p className="text-xs text-gray-500 flex items-center gap-1 mb-3">
                              <Calendar className="w-3 h-3" />
                              {new Date(verification.verificationData.candidateSelfie.uploadedAt).toLocaleDateString()}
                            </p>
                            <a
                              href={verification.verificationData.candidateSelfie.s3Url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-brand-green hover:underline text-sm font-medium"
                            >
                              View Full Document →
                            </a>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

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
          </div>

          {/* Right Column - Admin Actions */}
          <div className="lg:col-span-1">
            <Card className="sticky top-24">
              <CardHeader className="bg-brand-green text-white">
                <CardTitle>Admin Actions</CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
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
                    className="mt-2 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-green"
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
                    disabled={updating}
                    className="w-full bg-green-600 hover:bg-green-700 text-white"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    {updating ? 'Updating...' : 'Approve & Complete'}
                  </Button>
                  <Button
                    onClick={handleReject}
                    disabled={updating}
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
