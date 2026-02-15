import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, ChevronRight, ChevronLeft, Mail, Phone } from 'lucide-react';
import { Stepper, Step } from '@/components/ui/stepper';
import { apiService } from '@/services/api';

interface CaseData {
  code: string;
  applicantNo: string;
  name: string;
  fathersName: string;
  phone: string;
  formSubmitDate: string;
  presentAddress: string;
}

const steps: Step[] = [
  { id: 1, title: 'Personal Information', description: 'Contact & Address Details' },
  { id: 2, title: 'Document Upload', description: 'Upload Required Documents' },
];

const AddressVerificationPage = () => {
  const { token } = useParams<{ token: string }>();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [caseData, setCaseData] = useState<CaseData | null>(null);
  const [geolocationStatus, setGeolocationStatus] = useState<'not_requested' | 'requesting' | 'granted' | 'denied' | 'error'>('not_requested');

  const [formData, setFormData] = useState({
    // Contact Information
    contactPersonName: '',
    contactPersonRelation: '',
    numberOfFamilyMembers: '',
    contactPhoneNo: '',

    // ID Proof
    idProofType: '' as 'aadhaar' | 'pan' | 'voter_id' | 'passport' | 'driving_license' | 'other' | '',
    idProofNumber: '',

    // Address Details
    periodOfStay: '',
    differentAddress: '',
    residentialStatus: '' as 'owned' | 'rented' | 'company_provided' | 'pg' | 'other' | '',
    landmark: '',
    remarks: '',

    // Geolocation (will be captured automatically)
    latitude: undefined as number | undefined,
    longitude: undefined as number | undefined,
  });

  const [documents, setDocuments] = useState({
    idProofOne: null as File | null,
    idProofTwo: null as File | null,
    houseImageOne: null as File | null,
    houseImageTwo: null as File | null,
    signature: null as File | null,
    selfie: null as File | null,
  });

  useEffect(() => {
    if (token) {
      fetchVerificationData();
      captureGeolocation();
    }
  }, [token]);

  const fetchVerificationData = async () => {
    try {
      setLoading(true);
      const response = await apiService.getVerificationByToken(token!);

      if (response.success && response.data) {
        setCaseData(response.data);
      } else {
        setError(response.message || 'Invalid or expired verification link');
      }
    } catch (error: any) {
      console.error('Fetch error:', error);
      setError(error.message || 'Failed to load verification details');
    } finally {
      setLoading(false);
    }
  };

  const captureGeolocation = async () => {
    if (!navigator.geolocation) {
      setGeolocationStatus('error');
      return;
    }

    setGeolocationStatus('requesting');

    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          resolve,
          reject,
          { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
      });

      setFormData(prev => ({
        ...prev,
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      }));
      setGeolocationStatus('granted');
    } catch (geoError: any) {
      console.error('Geolocation error:', geoError);

      if (geoError.code === 1) {
        setGeolocationStatus('denied'); // User denied permission
      } else {
        setGeolocationStatus('error'); // Other error
      }
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleFileChange = (field: keyof typeof documents, file: File | null) => {
    setDocuments(prev => ({ ...prev, [field]: file }));
  };

  // Real-time validation for Step 1
  const isStep1Valid =
    formData.contactPersonName.trim() !== '' &&
    formData.contactPersonRelation.trim() !== '' &&
    formData.idProofType !== '' &&
    formData.residentialStatus !== '' &&
    geolocationStatus === 'granted';

  const validateStep1 = (): boolean => {
    if (!formData.contactPersonName.trim()) {
      alert('Contact Person Name is required');
      return false;
    }
    if (!formData.contactPersonRelation.trim()) {
      alert('Contact Person Relation is required');
      return false;
    }
    if (!formData.idProofType) {
      alert('ID Proof Type is required');
      return false;
    }
    if (!formData.residentialStatus) {
      alert('Residential Status is required');
      return false;
    }
    if (geolocationStatus !== 'granted') {
      alert('Please enable location access to proceed');
      return false;
    }
    return true;
  };

  const validateStep2 = (): boolean => {
    if (!documents.idProofOne) {
      alert('ID Proof One is required');
      return false;
    }
    if (!documents.idProofTwo) {
      alert('ID Proof Two is required');
      return false;
    }
    if (!documents.houseImageOne) {
      alert('House Image One is required');
      return false;
    }
    if (!documents.houseImageTwo) {
      alert('House Image Two is required');
      return false;
    }
    if (!documents.signature) {
      alert('Signature is required');
      return false;
    }
    if (!documents.selfie) {
      alert('Selfie (Candidate Image) is required');
      return false;
    }
    return true;
  };

  const handleNext = () => {
    if (currentStep === 1 && validateStep1()) {
      setCurrentStep(2);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateStep2()) return;

    setSubmitting(true);

    try {
      // 1. Upload all documents first
      const uploadPromises = [
        apiService.uploadVerificationDocument(token!, documents.idProofOne!, 'id_proof_one'),
        apiService.uploadVerificationDocument(token!, documents.idProofTwo!, 'id_proof_two'),
        apiService.uploadVerificationDocument(token!, documents.houseImageOne!, 'house_image_one'),
        apiService.uploadVerificationDocument(token!, documents.houseImageTwo!, 'house_image_two'),
        apiService.uploadVerificationDocument(token!, documents.signature!, 'signature'),
        apiService.uploadVerificationDocument(token!, documents.selfie!, 'selfie'),
      ];

      await Promise.all(uploadPromises);

      // 2. Submit form data
      const submitData = {
        contactPersonName: formData.contactPersonName,
        contactPersonRelation: formData.contactPersonRelation,
        numberOfFamilyMembers: formData.numberOfFamilyMembers ? parseInt(formData.numberOfFamilyMembers) : undefined,
        contactPhoneNo: formData.contactPhoneNo,
        idProofType: formData.idProofType as 'aadhaar' | 'pan' | 'voter_id' | 'passport' | 'driving_license' | 'other',
        idProofNumber: formData.idProofNumber,
        periodOfStay: formData.periodOfStay,
        differentAddress: formData.differentAddress,
        residentialStatus: formData.residentialStatus as 'owned' | 'rented' | 'company_provided' | 'pg' | 'other',
        landmark: formData.landmark,
        remarks: formData.remarks,
        latitude: formData.latitude,
        longitude: formData.longitude,
      };

      const submitResponse = await apiService.submitVerification(token!, submitData);

      if (!submitResponse.success) {
        throw new Error(submitResponse.message || 'Failed to submit verification');
      }

      setSubmitted(true);
    } catch (error: any) {
      console.error('Submit error:', error);
      alert(error.message || 'Failed to submit verification');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-green-50 to-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-brand-green mx-auto mb-4"></div>
          <div className="text-lg text-gray-600">Loading verification details...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-green-50 to-white">
        <Card className="w-full max-w-md shadow-xl">
          <CardContent className="pt-6 text-center">
            <div className="text-red-500 text-5xl mb-4">⚠️</div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Verification Link Error</h2>
            <p className="text-gray-600">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-green-50 to-white">
        <Card className="w-full max-w-md shadow-xl">
          <CardContent className="pt-6 text-center">
            <div className="mb-6">
              <div className="w-20 h-20 bg-brand-green rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-12 h-12 text-white" />
              </div>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Verification Submitted Successfully!</h2>
            <p className="text-gray-600 mb-6">
              Thank you for completing your address verification. We have received your submission and will review it shortly.
            </p>
            <div className="bg-brand-green-50 p-4 rounded-lg border border-brand-green-200">
              <p className="text-sm text-gray-700">
                A confirmation email will be sent to you shortly.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-green-50 to-white">
      {/* Professional Header */}
      <div className="bg-white shadow-md border-b-4 border-brand-green">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <img src="/logo.jpg" alt="Zella Screenings" className="h-16 object-contain" />
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600 flex items-center justify-end gap-2">
                <Mail className="w-4 h-4" />
                start@zellascreenings.com
              </p>
              <p className="text-sm text-gray-600 flex items-center justify-end gap-2 mt-1">
                <Phone className="w-4 h-4" />
                +91 8178685006 / +91 9871967859
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Title */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Address Verification</h1>
          <p className="text-gray-600">Complete your background verification process</p>
        </div>

        {/* Stepper */}
        <div className="mb-8">
          <Stepper steps={steps} currentStep={currentStep} />
        </div>

        {/* Pre-filled Case Data Card */}
        <Card className="mb-6 shadow-lg border-l-4 border-brand-green">
          <CardHeader className="bg-gradient-to-r from-brand-green-50 to-white">
            <CardTitle className="text-brand-green">Candidate Information</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label className="text-gray-600 text-sm font-semibold">Code</Label>
                <div className="mt-1 p-3 bg-gray-50 rounded-lg border border-gray-200 font-medium">{caseData?.code}</div>
              </div>
              <div>
                <Label className="text-gray-600 text-sm font-semibold">Applicant Name</Label>
                <div className="mt-1 p-3 bg-gray-50 rounded-lg border border-gray-200 font-medium">{caseData?.name}</div>
              </div>
              <div>
                <Label className="text-gray-600 text-sm font-semibold">Applicant No</Label>
                <div className="mt-1 p-3 bg-gray-50 rounded-lg border border-gray-200 font-medium">{caseData?.applicantNo}</div>
              </div>
              <div>
                <Label className="text-gray-600 text-sm font-semibold">Father's Name</Label>
                <div className="mt-1 p-3 bg-gray-50 rounded-lg border border-gray-200 font-medium">{caseData?.fathersName || 'N/A'}</div>
              </div>
              <div>
                <Label className="text-gray-600 text-sm font-semibold">Mobile No</Label>
                <div className="mt-1 p-3 bg-gray-50 rounded-lg border border-gray-200 font-medium">{caseData?.phone}</div>
              </div>
              <div>
                <Label className="text-gray-600 text-sm font-semibold">Date</Label>
                <div className="mt-1 p-3 bg-gray-50 rounded-lg border border-gray-200 font-medium">
                  {caseData?.formSubmitDate ? new Date(caseData.formSubmitDate).toLocaleDateString() : 'N/A'}
                </div>
              </div>
              <div className="md:col-span-3">
                <Label className="text-gray-600 text-sm font-semibold">Present Address</Label>
                <div className="mt-1 p-3 bg-gray-50 rounded-lg border border-gray-200 font-medium">{caseData?.presentAddress}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Form Card */}
        <Card className="shadow-xl">
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit}>
              {/* Step 1: Personal Information */}
              {currentStep === 1 && (
                <div className="space-y-8">
                  {/* Contact Information */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 pb-2 border-b-2 border-brand-green">
                      <div className="w-8 h-8 bg-brand-green rounded-full flex items-center justify-center text-white font-bold">1</div>
                      <h3 className="text-xl font-semibold text-gray-900">Contact Information</h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="contactPersonName" className="text-gray-700 font-medium">
                          Contact Person Name <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="contactPersonName"
                          value={formData.contactPersonName}
                          onChange={(e) => handleInputChange('contactPersonName', e.target.value)}
                          placeholder="Enter contact person name"
                          className="mt-1"
                          required
                        />
                      </div>

                      <div>
                        <Label htmlFor="contactPersonRelation" className="text-gray-700 font-medium">
                          Contact Person Relation <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="contactPersonRelation"
                          value={formData.contactPersonRelation}
                          onChange={(e) => handleInputChange('contactPersonRelation', e.target.value)}
                          placeholder="e.g., Father, Mother, Spouse"
                          className="mt-1"
                          required
                        />
                      </div>

                      <div>
                        <Label htmlFor="numberOfFamilyMembers" className="text-gray-700 font-medium">No of Family Members</Label>
                        <Input
                          id="numberOfFamilyMembers"
                          type="number"
                          min="1"
                          value={formData.numberOfFamilyMembers}
                          onChange={(e) => handleInputChange('numberOfFamilyMembers', e.target.value)}
                          placeholder="Enter number"
                          className="mt-1"
                        />
                      </div>

                      <div>
                        <Label htmlFor="contactPhoneNo" className="text-gray-700 font-medium">Contact Person Phone No</Label>
                        <Input
                          id="contactPhoneNo"
                          type="tel"
                          value={formData.contactPhoneNo}
                          onChange={(e) => handleInputChange('contactPhoneNo', e.target.value)}
                          placeholder="Enter 10-digit mobile number"
                          className="mt-1"
                        />
                      </div>
                    </div>
                  </div>

                  {/* ID Proof */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 pb-2 border-b-2 border-brand-green">
                      <div className="w-8 h-8 bg-brand-green rounded-full flex items-center justify-center text-white font-bold">2</div>
                      <h3 className="text-xl font-semibold text-gray-900">ID Proof</h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="idProofType" className="text-gray-700 font-medium">
                          ID Proof Type <span className="text-red-500">*</span>
                        </Label>
                        <select
                          id="idProofType"
                          value={formData.idProofType}
                          onChange={(e) => handleInputChange('idProofType', e.target.value)}
                          className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-green"
                          required
                        >
                          <option value="">Select ID Proof Type</option>
                          <option value="aadhaar">Aadhaar Card</option>
                          <option value="pan">PAN Card</option>
                          <option value="voter_id">Voter ID</option>
                          <option value="passport">Passport</option>
                          <option value="driving_license">Driving License</option>
                          <option value="other">Other</option>
                        </select>
                      </div>

                      <div>
                        <Label htmlFor="idProofNumber" className="text-gray-700 font-medium">ID Proof Number</Label>
                        <Input
                          id="idProofNumber"
                          value={formData.idProofNumber}
                          onChange={(e) => handleInputChange('idProofNumber', e.target.value)}
                          placeholder="Enter ID proof number"
                          className="mt-1"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Address Details */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 pb-2 border-b-2 border-brand-green">
                      <div className="w-8 h-8 bg-brand-green rounded-full flex items-center justify-center text-white font-bold">3</div>
                      <h3 className="text-xl font-semibold text-gray-900">Address Details</h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="periodOfStay" className="text-gray-700 font-medium">Period of Stay</Label>
                        <Input
                          id="periodOfStay"
                          value={formData.periodOfStay}
                          onChange={(e) => handleInputChange('periodOfStay', e.target.value)}
                          placeholder="e.g., 2 years"
                          className="mt-1"
                        />
                      </div>

                      <div>
                        <Label htmlFor="differentAddress" className="text-gray-700 font-medium">If different address</Label>
                        <Input
                          id="differentAddress"
                          value={formData.differentAddress}
                          onChange={(e) => handleInputChange('differentAddress', e.target.value)}
                          placeholder="Enter different address if applicable"
                          className="mt-1"
                        />
                      </div>

                      <div>
                        <Label htmlFor="residentialStatus" className="text-gray-700 font-medium">
                          Residential Status <span className="text-red-500">*</span>
                        </Label>
                        <select
                          id="residentialStatus"
                          value={formData.residentialStatus}
                          onChange={(e) => handleInputChange('residentialStatus', e.target.value)}
                          className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-green"
                          required
                        >
                          <option value="">Select Residential Status</option>
                          <option value="owned">Owned</option>
                          <option value="rented">Rented</option>
                          <option value="company_provided">Company Provided</option>
                          <option value="pg">PG/Hostel</option>
                          <option value="other">Other</option>
                        </select>
                      </div>

                      <div>
                        <Label htmlFor="landmark" className="text-gray-700 font-medium">Landmark</Label>
                        <Input
                          id="landmark"
                          value={formData.landmark}
                          onChange={(e) => handleInputChange('landmark', e.target.value)}
                          placeholder="Enter nearby landmark"
                          className="mt-1"
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="remarks" className="text-gray-700 font-medium">Remarks</Label>
                      <textarea
                        id="remarks"
                        className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-green"
                        rows={3}
                        value={formData.remarks}
                        onChange={(e) => handleInputChange('remarks', e.target.value)}
                        placeholder="Any additional remarks"
                      />
                    </div>
                  </div>

                  {/* Geolocation Status */}
                  <div>
                    {geolocationStatus === 'granted' && formData.latitude !== undefined && formData.longitude !== undefined && (
                      <div className="bg-brand-green-50 p-4 rounded-lg border-2 border-brand-green-200">
                        <p className="text-sm text-brand-green-800 font-medium flex items-center gap-2">
                          <CheckCircle className="w-5 h-5" />
                          Location captured: Latitude {formData.latitude.toFixed(6)}, Longitude {formData.longitude.toFixed(6)}
                        </p>
                      </div>
                    )}

                    {geolocationStatus === 'requesting' && (
                      <div className="bg-blue-50 p-4 rounded-lg border-2 border-blue-200">
                        <p className="text-sm text-blue-800 font-medium">
                          Requesting location permission...
                        </p>
                      </div>
                    )}

                    {(geolocationStatus === 'denied' || geolocationStatus === 'error') && (
                      <div className="bg-yellow-50 p-6 rounded-lg border-2 border-yellow-300">
                        <div className="flex items-start gap-3">
                          <div className="text-yellow-600 text-2xl">📍</div>
                          <div className="flex-1">
                            <h4 className="text-yellow-900 font-semibold mb-2">Location Access Required</h4>
                            <p className="text-sm text-yellow-800 mb-3">
                              {geolocationStatus === 'denied'
                                ? 'You have denied location access. We need your location to verify your address for security purposes.'
                                : 'Unable to access your location. Please ensure location services are enabled in your browser.'}
                            </p>
                            <Button
                              type="button"
                              onClick={captureGeolocation}
                              className="bg-yellow-600 hover:bg-yellow-700 text-white"
                              size="sm"
                            >
                              Enable Location Access
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}

                    {geolocationStatus === 'not_requested' && (
                      <div className="bg-blue-50 p-4 rounded-lg border-2 border-blue-200">
                        <p className="text-sm text-blue-800 font-medium">
                          Waiting for location permission...
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Navigation */}
                  <div className="flex justify-end pt-6">
                    <Button
                      type="button"
                      onClick={handleNext}
                      disabled={!isStep1Valid}
                      className="bg-brand-green hover:bg-brand-green-600 text-white px-8 disabled:opacity-50 disabled:cursor-not-allowed"
                      size="lg"
                    >
                      Next Step <ChevronRight className="ml-2 w-5 h-5" />
                    </Button>
                  </div>
                  {!isStep1Valid && (
                    <p className="text-sm text-gray-500 text-right mt-2">
                      Please complete all required fields and enable location access to proceed
                    </p>
                  )}
                </div>
              )}

              {/* Step 2: Document Upload */}
              {currentStep === 2 && (
                <div className="space-y-8">
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 pb-2 border-b-2 border-brand-green">
                      <div className="w-8 h-8 bg-brand-green rounded-full flex items-center justify-center text-white font-bold">4</div>
                      <h3 className="text-xl font-semibold text-gray-900">Document Uploads</h3>
                    </div>
                    <p className="text-sm text-gray-600">All documents are required (max 5MB each, PDF/JPG/PNG only)</p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* ID Proof One */}
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 hover:border-brand-green transition-colors">
                        <Label htmlFor="idProofOne" className="text-gray-700 font-medium">
                          ID Proof One <span className="text-red-500">*</span>
                        </Label>
                        <input
                          type="file"
                          id="idProofOne"
                          accept=".pdf,.jpg,.jpeg,.png"
                          onChange={(e) => handleFileChange('idProofOne', e.target.files?.[0] || null)}
                          className="mt-2 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-brand-green-50 file:text-brand-green hover:file:bg-brand-green-100"
                          required
                        />
                        {documents.idProofOne && (
                          <p className="text-xs text-brand-green font-medium mt-2">✓ {documents.idProofOne.name}</p>
                        )}
                      </div>

                      {/* ID Proof Two */}
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 hover:border-brand-green transition-colors">
                        <Label htmlFor="idProofTwo" className="text-gray-700 font-medium">
                          ID Proof Two <span className="text-red-500">*</span>
                        </Label>
                        <input
                          type="file"
                          id="idProofTwo"
                          accept=".pdf,.jpg,.jpeg,.png"
                          onChange={(e) => handleFileChange('idProofTwo', e.target.files?.[0] || null)}
                          className="mt-2 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-brand-green-50 file:text-brand-green hover:file:bg-brand-green-100"
                          required
                        />
                        {documents.idProofTwo && (
                          <p className="text-xs text-brand-green font-medium mt-2">✓ {documents.idProofTwo.name}</p>
                        )}
                      </div>

                      {/* House Image One */}
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 hover:border-brand-green transition-colors">
                        <Label htmlFor="houseImageOne" className="text-gray-700 font-medium">
                          House Image One <span className="text-red-500">*</span>
                        </Label>
                        <input
                          type="file"
                          id="houseImageOne"
                          accept=".pdf,.jpg,.jpeg,.png"
                          onChange={(e) => handleFileChange('houseImageOne', e.target.files?.[0] || null)}
                          className="mt-2 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-brand-green-50 file:text-brand-green hover:file:bg-brand-green-100"
                          required
                        />
                        {documents.houseImageOne && (
                          <p className="text-xs text-brand-green font-medium mt-2">✓ {documents.houseImageOne.name}</p>
                        )}
                      </div>

                      {/* House Image Two */}
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 hover:border-brand-green transition-colors">
                        <Label htmlFor="houseImageTwo" className="text-gray-700 font-medium">
                          House Image Two <span className="text-red-500">*</span>
                        </Label>
                        <input
                          type="file"
                          id="houseImageTwo"
                          accept=".pdf,.jpg,.jpeg,.png"
                          onChange={(e) => handleFileChange('houseImageTwo', e.target.files?.[0] || null)}
                          className="mt-2 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-brand-green-50 file:text-brand-green hover:file:bg-brand-green-100"
                          required
                        />
                        {documents.houseImageTwo && (
                          <p className="text-xs text-brand-green font-medium mt-2">✓ {documents.houseImageTwo.name}</p>
                        )}
                      </div>

                      {/* Signature */}
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 hover:border-brand-green transition-colors">
                        <Label htmlFor="signature" className="text-gray-700 font-medium">
                          Signature <span className="text-red-500">*</span>
                        </Label>
                        <input
                          type="file"
                          id="signature"
                          accept=".pdf,.jpg,.jpeg,.png"
                          onChange={(e) => handleFileChange('signature', e.target.files?.[0] || null)}
                          className="mt-2 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-brand-green-50 file:text-brand-green hover:file:bg-brand-green-100"
                          required
                        />
                        {documents.signature && (
                          <p className="text-xs text-brand-green font-medium mt-2">✓ {documents.signature.name}</p>
                        )}
                      </div>

                      {/* Selfie */}
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 hover:border-brand-green transition-colors">
                        <Label htmlFor="selfie" className="text-gray-700 font-medium">
                          Selfie (Candidate Image) <span className="text-red-500">*</span>
                        </Label>
                        <input
                          type="file"
                          id="selfie"
                          accept=".jpg,.jpeg,.png"
                          onChange={(e) => handleFileChange('selfie', e.target.files?.[0] || null)}
                          className="mt-2 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-brand-green-50 file:text-brand-green hover:file:bg-brand-green-100"
                          required
                        />
                        {documents.selfie && (
                          <p className="text-xs text-brand-green font-medium mt-2">✓ {documents.selfie.name}</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Navigation */}
                  <div className="flex justify-between pt-6">
                    <Button
                      type="button"
                      onClick={handleBack}
                      variant="outline"
                      size="lg"
                      className="border-brand-green text-brand-green hover:bg-brand-green-50"
                    >
                      <ChevronLeft className="mr-2 w-5 h-5" /> Previous Step
                    </Button>
                    <Button
                      type="submit"
                      disabled={submitting}
                      className="bg-brand-green hover:bg-brand-green-600 text-white px-8"
                      size="lg"
                    >
                      {submitting ? 'Submitting...' : 'Submit Verification'}
                    </Button>
                  </div>
                </div>
              )}
            </form>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center mt-8 text-sm text-gray-500 bg-white p-6 rounded-lg shadow">
          <p className="font-medium text-gray-700 mb-2">Need Help?</p>
          <p>
            Contact us at{' '}
            <a href="mailto:start@zellascreenings.com" className="text-brand-green hover:underline font-medium">
              start@zellascreenings.com
            </a>
          </p>
          <p className="mt-1">Phone: +91 8178685006 / +91 9871967859</p>
          <p className="mt-4 text-xs text-gray-400">
            © {new Date().getFullYear()} Zella Screenings. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
};

export default AddressVerificationPage;
