import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, ChevronRight, ChevronLeft, Mail, Phone, Plus, Trash2 } from 'lucide-react';
import { Stepper, Step } from '@/components/ui/stepper';
import { apiService } from '@/services/api';
import type { BGVFormData, Employment, Reference, Address, GapDetailEntry } from '@/types/documentCollection';

const steps: Step[] = [
  { id: 1, title: 'Personal Info', description: 'Basic Details' },
  { id: 2, title: 'Education', description: 'Academic Details' },
  { id: 3, title: 'Employment', description: 'Work History' },
  { id: 4, title: 'References', description: 'Professional Refs' },
  { id: 5, title: 'Gap Details', description: 'Career Gaps' },
  { id: 6, title: 'LOA', description: 'Authorization' },
  { id: 7, title: 'Documents', description: 'Upload Files' },
];

const emptyEmployment: Employment = {
  companyName: '', periodFrom: '', periodTo: '', designation: '', ctc: '',
  employeeId: '', supervisorName: '', supervisorDesignation: '', supervisorContact: '',
  supervisorEmail: '', hrName: '', hrContact: '', hrEmail: '',
  reasonForLeaving: '', natureOfEmployment: '', typeOfEmployment: ''
};

const emptyReference: Reference = {
  name: '', designation: '', organization: '', relationship: '', contact: '', email: ''
};

const emptyAddress: Address = { address: '', duration: '' };

const buildGapEntries = (employments: Employment[]): GapDetailEntry[] => {
  const entries: GapDetailEntry[] = [];
  const count = employments.length;

  if (count === 0) {
    entries.push({ key: 'educationToCurrent', label: 'Gap between Education and Current', hasGap: '', duration: '', reason: '' });
    return entries;
  }

  // Education to first employment
  const emp1Name = employments[0].companyName || 'Employment 1';
  entries.push({ key: 'educationToEmp1', label: `Gap between Education and ${emp1Name}`, hasGap: '', duration: '', reason: '' });

  // Between each pair of employments
  for (let i = 0; i < count - 1; i++) {
    const fromName = employments[i].companyName || `Employment ${i + 1}`;
    const toName = employments[i + 1].companyName || `Employment ${i + 2}`;
    entries.push({ key: `emp${i + 1}ToEmp${i + 2}`, label: `Gap between ${fromName} and ${toName}`, hasGap: '', duration: '', reason: '' });
  }

  // Last employment to current
  const lastEmpName = employments[count - 1].companyName || `Employment ${count}`;
  entries.push({ key: `emp${count}ToCurrent`, label: `Gap between ${lastEmpName} and Current`, hasGap: '', duration: '', reason: '' });

  return entries;
};

const DocumentCollectionPage = () => {
  const { token } = useParams<{ token: string }>();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [caseData, setCaseData] = useState<any>(null);

  const [formData, setFormData] = useState<BGVFormData>({
    personalInfo: {
      fullName: '', dob: '', nationality: 'Indian', fathersName: '',
      mobile: '', alternateNumber: '',
      addresses: [{ ...emptyAddress }],
      gender: '', email: '', aadhaarNumber: '', panNumber: ''
    },
    education: {
      degree: '', enrollmentNo: '', yearOfPassing: '', universityName: '',
      universityLocation: '', periodOfStudyFrom: '', periodOfStudyTo: '', courseType: ''
    },
    employmentHistory: [{ ...emptyEmployment }],
    references: [{ ...emptyReference }],
    gapDetails: buildGapEntries([{ ...emptyEmployment }]),
    loa: {
      authCheckbox1: false, authCheckbox2: false, authCheckbox3: false,
      title: '', nameInCapitals: '', date: new Date().toISOString().split('T')[0]
    }
  });

  const [documents, setDocuments] = useState<Record<string, File | null>>({
    aadhaar: null, pan: null, degreeMarksheet: null, addressProof: null,
    passport: null, passportDeclaration: null, relievingLetter: null,
    paySlip: null, offerLetter: null, cv: null, signature: null
  });

  useEffect(() => {
    if (token) fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // Sync gap entries whenever employment count or company names change
  useEffect(() => {
    setFormData(prev => {
      const newEntries = buildGapEntries(prev.employmentHistory);
      // Merge: preserve user-entered data by matching on key
      const merged = newEntries.map(entry => {
        const existing = prev.gapDetails.find(g => g.key === entry.key);
        if (existing) {
          return { ...entry, hasGap: existing.hasGap, duration: existing.duration, reason: existing.reason };
        }
        return entry;
      });
      return { ...prev, gapDetails: merged };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.employmentHistory.length, formData.employmentHistory.map(e => e.companyName).join('|')]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await apiService.getDocumentCollectionByToken(token!);
      if (response.success && response.data) {
        setCaseData(response.data);
        // Restore form data with deep merge to preserve pre-initialized defaults for empty arrays
        setFormData(prev => {
          const serverData = response.data.formData;
          const hasServerData = serverData?.personalInfo;

          // Start with pre-filling from admin data
          const personalInfo = {
            ...prev.personalInfo,
            fullName: response.data.name || '',
            mobile: response.data.phone || '',
            email: response.data.email || '',
          };

          // If server has form data, merge it in while preserving defaults for empty arrays
          if (hasServerData) {
            return {
              ...prev,
              ...serverData,
              personalInfo: {
                ...personalInfo,
                ...serverData.personalInfo,
                // Keep admin pre-fill for name/mobile/email if server values are empty
                fullName: serverData.personalInfo?.fullName || personalInfo.fullName,
                mobile: serverData.personalInfo?.mobile || personalInfo.mobile,
                email: serverData.personalInfo?.email || personalInfo.email,
                // Preserve default empty address objects when server returns empty array
                addresses: serverData.personalInfo?.addresses?.length > 0
                  ? serverData.personalInfo.addresses
                  : prev.personalInfo.addresses,
              },
              employmentHistory: serverData.employmentHistory?.length > 0
                ? serverData.employmentHistory
                : prev.employmentHistory,
              references: serverData.references?.length > 0
                ? serverData.references
                : prev.references,
              gapDetails: Array.isArray(serverData.gapDetails) && serverData.gapDetails.length > 0
                ? serverData.gapDetails
                : prev.gapDetails,
              loa: { ...prev.loa, ...serverData.loa },
            };
          }

          return { ...prev, personalInfo };
        });
      } else {
        setError(response.message || 'Invalid or expired link');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  };

  // Generic updaters
  const updatePersonalInfo = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, personalInfo: { ...prev.personalInfo, [field]: value } }));
  };

  const updateAddress = (index: number, field: string, value: string) => {
    setFormData(prev => {
      const addresses = [...prev.personalInfo.addresses];
      addresses[index] = { ...addresses[index], [field]: value };
      return { ...prev, personalInfo: { ...prev.personalInfo, addresses } };
    });
  };

  const addAddress = () => {
    setFormData(prev => ({
      ...prev,
      personalInfo: {
        ...prev.personalInfo,
        addresses: [...prev.personalInfo.addresses, { ...emptyAddress }]
      }
    }));
  };

  const removeAddress = (index: number) => {
    if (formData.personalInfo.addresses.length > 1) {
      setFormData(prev => ({
        ...prev,
        personalInfo: {
          ...prev.personalInfo,
          addresses: prev.personalInfo.addresses.filter((_, i) => i !== index)
        }
      }));
    }
  };

  const updateEducation = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, education: { ...prev.education, [field]: value } }));
  };

  const updateEmployment = (index: number, field: string, value: string) => {
    setFormData(prev => {
      const employmentHistory = [...prev.employmentHistory];
      employmentHistory[index] = { ...employmentHistory[index], [field]: value };
      return { ...prev, employmentHistory };
    });
  };

  const addEmployment = () => {
    if (formData.employmentHistory.length < 3) {
      setFormData(prev => ({ ...prev, employmentHistory: [...prev.employmentHistory, { ...emptyEmployment }] }));
    }
  };

  const removeEmployment = (index: number) => {
    setFormData(prev => ({
      ...prev,
      employmentHistory: prev.employmentHistory.filter((_, i) => i !== index)
    }));
  };

  const updateReference = (index: number, field: string, value: string) => {
    setFormData(prev => {
      const references = [...prev.references];
      references[index] = { ...references[index], [field]: value };
      return { ...prev, references };
    });
  };

  const addReference = () => {
    setFormData(prev => ({
      ...prev,
      references: [...prev.references, { ...emptyReference }]
    }));
  };

  const removeReference = (index: number) => {
    if (formData.references.length > 1) {
      setFormData(prev => ({
        ...prev,
        references: prev.references.filter((_, i) => i !== index)
      }));
    }
  };

  const updateGapDetail = (index: number, field: string, value: string) => {
    setFormData(prev => {
      const gapDetails = [...prev.gapDetails];
      gapDetails[index] = { ...gapDetails[index], [field]: value };
      return { ...prev, gapDetails };
    });
  };

  const updateLoa = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, loa: { ...prev.loa, [field]: value } }));
  };

  const handleFileChange = (docType: string, file: File | null) => {
    setDocuments(prev => ({ ...prev, [docType]: file }));
  };

  const handleNext = () => {
    setCurrentStep(prev => Math.min(prev + 1, 7));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBack = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      // Upload all documents that are selected
      const docTypeMap: Record<string, string> = {
        aadhaar: 'aadhaar', pan: 'pan', degreeMarksheet: 'degree_marksheet',
        addressProof: 'address_proof', passport: 'passport',
        passportDeclaration: 'passport_declaration', relievingLetter: 'relieving_letter',
        paySlip: 'pay_slip', offerLetter: 'offer_letter', cv: 'cv', signature: 'signature'
      };

      const uploadPromises = Object.entries(documents)
        .filter(([, file]) => file !== null)
        .map(([key, file]) =>
          apiService.uploadDocumentCollectionDocument(token!, file!, docTypeMap[key])
        );

      if (uploadPromises.length > 0) {
        await Promise.all(uploadPromises);
      }

      // Submit form data
      const submitResponse = await apiService.submitDocumentCollection(token!, { formData });
      if (!submitResponse.success) {
        throw new Error(submitResponse.message || 'Failed to submit');
      }

      setSubmitted(true);
    } catch (err: any) {
      console.error('Submit error:', err);
      alert(err.message || 'Failed to submit form');
    } finally {
      setSubmitting(false);
    }
  };

  // ---- Render helpers ----
  const renderField = (label: string, id: string, value: string, onChange: (v: string) => void, opts?: { type?: string; required?: boolean; placeholder?: string }) => (
    <div>
      <Label htmlFor={id} className="text-gray-700 font-medium">
        {label} {opts?.required && <span className="text-red-500">*</span>}
      </Label>
      <Input id={id} type={opts?.type || 'text'} value={value} onChange={e => onChange(e.target.value)} placeholder={opts?.placeholder || ''} className="mt-1" />
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-green-50 to-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-brand-green mx-auto mb-4"></div>
          <div className="text-lg text-gray-600">Loading...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-green-50 to-white">
        <Card className="w-full max-w-md shadow-xl">
          <CardContent className="pt-6 text-center">
            <div className="text-red-500 text-5xl mb-4">&#9888;</div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Link Error</h2>
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
            <div className="w-20 h-20 bg-brand-green rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-12 h-12 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Form Submitted Successfully!</h2>
            <p className="text-gray-600 mb-6">
              Thank you for completing your BGV form. We have received your submission and will review it shortly.
            </p>
            <div className="bg-brand-green-50 p-4 rounded-lg border border-brand-green-200">
              <p className="text-sm text-gray-700">A confirmation email will be sent to you shortly.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-green-50 to-white">
      {/* Header */}
      <div className="bg-white shadow-md border-b-4 border-brand-green">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <img src="/logo.jpg" alt="Zella Screenings" className="h-16 object-contain" />
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600 flex items-center justify-end gap-2">
                <Mail className="w-4 h-4" /> start@zellascreenings.com
              </p>
              <p className="text-sm text-gray-600 flex items-center justify-end gap-2 mt-1">
                <Phone className="w-4 h-4" /> +91 8178685006 / +91 9871967859
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">BGV Form & Document Collection</h1>
          <p className="text-gray-600">On behalf of <strong>{caseData?.companyName}</strong></p>
        </div>

        <div className="mb-8">
          <Stepper steps={steps} currentStep={currentStep} />
        </div>

        <Card className="shadow-xl">
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit}>

              {/* ===== STEP 1: Personal Information ===== */}
              {currentStep === 1 && (
                <div className="space-y-6">
                  <div className="flex items-center gap-2 pb-2 border-b-2 border-brand-green">
                    <div className="w-8 h-8 bg-brand-green rounded-full flex items-center justify-center text-white font-bold text-sm">1</div>
                    <h3 className="text-xl font-semibold">Personal Information</h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {renderField('Full Name', 'fullName', formData.personalInfo.fullName, v => updatePersonalInfo('fullName', v), { required: true })}
                    {renderField('Date of Birth', 'dob', formData.personalInfo.dob, v => updatePersonalInfo('dob', v), { type: 'date', required: true })}
                    {renderField('Nationality', 'nationality', formData.personalInfo.nationality, v => updatePersonalInfo('nationality', v))}
                    {renderField("Father's Name", 'fathersName', formData.personalInfo.fathersName, v => updatePersonalInfo('fathersName', v), { required: true })}
                    {renderField('Mobile Number', 'mobile', formData.personalInfo.mobile, v => updatePersonalInfo('mobile', v), { required: true, type: 'tel' })}
                    {renderField('Alternate Number', 'alternateNumber', formData.personalInfo.alternateNumber, v => updatePersonalInfo('alternateNumber', v), { type: 'tel' })}
                    <div>
                      <Label className="text-gray-700 font-medium">Gender <span className="text-red-500">*</span></Label>
                      <select className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md" value={formData.personalInfo.gender} onChange={e => updatePersonalInfo('gender', e.target.value)}>
                        <option value="">Select</option>
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                    {renderField('Email', 'pi-email', formData.personalInfo.email, v => updatePersonalInfo('email', v), { type: 'email', required: true })}
                    {renderField('Aadhaar Number', 'aadhaarNumber', formData.personalInfo.aadhaarNumber, v => updatePersonalInfo('aadhaarNumber', v), { required: true })}
                    {renderField('PAN Number', 'panNumber', formData.personalInfo.panNumber, v => updatePersonalInfo('panNumber', v), { required: true })}
                  </div>

                  <div className="mt-6">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-semibold text-gray-800">Address History</h4>
                      <Button type="button" variant="outline" size="sm" onClick={addAddress}>
                        <Plus className="w-4 h-4 mr-1" /> Add Address
                      </Button>
                    </div>
                    {formData.personalInfo.addresses.map((addr, i) => (
                      <div key={i} className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-3 p-3 bg-gray-50 rounded-lg relative">
                        <div className="md:col-span-3">
                          <Label className="text-sm">Address {i + 1}</Label>
                          <Input value={addr.address} onChange={e => updateAddress(i, 'address', e.target.value)} placeholder="Full address" className="mt-1" />
                        </div>
                        <div className="flex gap-2 items-end">
                          <div className="flex-1">
                            <Label className="text-sm">Duration</Label>
                            <Input value={addr.duration} onChange={e => updateAddress(i, 'duration', e.target.value)} placeholder="e.g. 3 years" className="mt-1" />
                          </div>
                          {formData.personalInfo.addresses.length > 1 && (
                            <Button type="button" variant="ghost" size="sm" onClick={() => removeAddress(i)} className="text-red-500 mb-0.5">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex justify-end pt-4">
                    <Button type="button" onClick={handleNext} className="bg-brand-green hover:bg-brand-green-600 text-white px-8" size="lg">
                      Next <ChevronRight className="ml-2 w-5 h-5" />
                    </Button>
                  </div>
                </div>
              )}

              {/* ===== STEP 2: Education ===== */}
              {currentStep === 2 && (
                <div className="space-y-6">
                  <div className="flex items-center gap-2 pb-2 border-b-2 border-brand-green">
                    <div className="w-8 h-8 bg-brand-green rounded-full flex items-center justify-center text-white font-bold text-sm">2</div>
                    <h3 className="text-xl font-semibold">Education Details</h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {renderField('Degree / Qualification', 'degree', formData.education.degree, v => updateEducation('degree', v), { required: true })}
                    {renderField('Enrollment No.', 'enrollmentNo', formData.education.enrollmentNo, v => updateEducation('enrollmentNo', v))}
                    {renderField('Year of Passing', 'yearOfPassing', formData.education.yearOfPassing, v => updateEducation('yearOfPassing', v), { required: true })}
                    {renderField('University / Board Name', 'universityName', formData.education.universityName, v => updateEducation('universityName', v), { required: true })}
                    {renderField('University Location', 'universityLocation', formData.education.universityLocation, v => updateEducation('universityLocation', v))}
                    {renderField('Period of Study From', 'periodOfStudyFrom', formData.education.periodOfStudyFrom, v => updateEducation('periodOfStudyFrom', v), { type: 'date' })}
                    {renderField('Period of Study To', 'periodOfStudyTo', formData.education.periodOfStudyTo, v => updateEducation('periodOfStudyTo', v), { type: 'date' })}
                    <div>
                      <Label className="text-gray-700 font-medium">Course Type</Label>
                      <select className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md" value={formData.education.courseType} onChange={e => updateEducation('courseType', e.target.value)}>
                        <option value="">Select</option>
                        <option value="regular">Regular</option>
                        <option value="part_time">Part Time</option>
                        <option value="correspondence">Correspondence</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex justify-between pt-4">
                    <Button type="button" onClick={handleBack} variant="outline" size="lg"><ChevronLeft className="mr-2 w-5 h-5" /> Previous</Button>
                    <Button type="button" onClick={handleNext} className="bg-brand-green hover:bg-brand-green-600 text-white px-8" size="lg">Next <ChevronRight className="ml-2 w-5 h-5" /></Button>
                  </div>
                </div>
              )}

              {/* ===== STEP 3: Employment History ===== */}
              {currentStep === 3 && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between pb-2 border-b-2 border-brand-green">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-brand-green rounded-full flex items-center justify-center text-white font-bold text-sm">3</div>
                      <h3 className="text-xl font-semibold">Employment History</h3>
                    </div>
                    {formData.employmentHistory.length < 3 && (
                      <Button type="button" variant="outline" size="sm" onClick={addEmployment}>
                        <Plus className="w-4 h-4 mr-1" /> Add Employment
                      </Button>
                    )}
                  </div>

                  {formData.employmentHistory.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <p className="mb-4">No employment history added. If you are a fresher, you can proceed without adding any employment.</p>
                      <Button type="button" variant="outline" size="sm" onClick={addEmployment}>
                        <Plus className="w-4 h-4 mr-1" /> Add Employment
                      </Button>
                    </div>
                  )}

                  {formData.employmentHistory.map((emp, i) => (
                    <div key={i} className="p-4 border rounded-lg space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="font-semibold text-gray-800">Employment {i + 1}</h4>
                        <Button type="button" variant="ghost" size="sm" onClick={() => removeEmployment(i)} className="text-red-500">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {renderField('Company Name', `emp-${i}-company`, emp.companyName, v => updateEmployment(i, 'companyName', v), { required: true })}
                        {renderField('Designation', `emp-${i}-designation`, emp.designation, v => updateEmployment(i, 'designation', v))}
                        {renderField('Period From', `emp-${i}-from`, emp.periodFrom, v => updateEmployment(i, 'periodFrom', v), { type: 'date' })}
                        {renderField('Period To', `emp-${i}-to`, emp.periodTo, v => updateEmployment(i, 'periodTo', v), { type: 'date' })}
                        {renderField('CTC', `emp-${i}-ctc`, emp.ctc, v => updateEmployment(i, 'ctc', v))}
                        {renderField('Employee ID', `emp-${i}-empId`, emp.employeeId, v => updateEmployment(i, 'employeeId', v))}
                        {renderField('Supervisor Name', `emp-${i}-supName`, emp.supervisorName, v => updateEmployment(i, 'supervisorName', v))}
                        {renderField('Supervisor Designation', `emp-${i}-supDesg`, emp.supervisorDesignation, v => updateEmployment(i, 'supervisorDesignation', v))}
                        {renderField('Supervisor Contact', `emp-${i}-supContact`, emp.supervisorContact, v => updateEmployment(i, 'supervisorContact', v))}
                        {renderField('Supervisor Email', `emp-${i}-supEmail`, emp.supervisorEmail, v => updateEmployment(i, 'supervisorEmail', v), { type: 'email' })}
                        {renderField('HR Name', `emp-${i}-hrName`, emp.hrName, v => updateEmployment(i, 'hrName', v))}
                        {renderField('HR Contact', `emp-${i}-hrContact`, emp.hrContact, v => updateEmployment(i, 'hrContact', v))}
                        {renderField('HR Email', `emp-${i}-hrEmail`, emp.hrEmail, v => updateEmployment(i, 'hrEmail', v), { type: 'email' })}
                        {renderField('Reason for Leaving', `emp-${i}-reason`, emp.reasonForLeaving, v => updateEmployment(i, 'reasonForLeaving', v))}
                        <div>
                          <Label className="text-gray-700 font-medium">Nature of Employment</Label>
                          <select className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md" value={emp.natureOfEmployment} onChange={e => updateEmployment(i, 'natureOfEmployment', e.target.value)}>
                            <option value="">Select</option>
                            <option value="permanent">Permanent</option>
                            <option value="contract">Contract</option>
                            <option value="temporary">Temporary</option>
                            <option value="internship">Internship</option>
                          </select>
                        </div>
                        <div>
                          <Label className="text-gray-700 font-medium">Type of Employment</Label>
                          <select className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md" value={emp.typeOfEmployment} onChange={e => updateEmployment(i, 'typeOfEmployment', e.target.value)}>
                            <option value="">Select</option>
                            <option value="full_time">Full Time</option>
                            <option value="part_time">Part Time</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  ))}

                  <div className="flex justify-between pt-4">
                    <Button type="button" onClick={handleBack} variant="outline" size="lg"><ChevronLeft className="mr-2 w-5 h-5" /> Previous</Button>
                    <Button type="button" onClick={handleNext} className="bg-brand-green hover:bg-brand-green-600 text-white px-8" size="lg">Next <ChevronRight className="ml-2 w-5 h-5" /></Button>
                  </div>
                </div>
              )}

              {/* ===== STEP 4: References ===== */}
              {currentStep === 4 && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between pb-2 border-b-2 border-brand-green">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-brand-green rounded-full flex items-center justify-center text-white font-bold text-sm">4</div>
                      <h3 className="text-xl font-semibold">Professional References</h3>
                    </div>
                    <Button type="button" variant="outline" size="sm" onClick={addReference}>
                      <Plus className="w-4 h-4 mr-1" /> Add Reference
                    </Button>
                  </div>

                  {formData.references.map((ref, i) => (
                    <div key={i} className="p-4 border rounded-lg space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="font-semibold text-gray-800">Reference {i + 1}</h4>
                        {formData.references.length > 1 && (
                          <Button type="button" variant="ghost" size="sm" onClick={() => removeReference(i)} className="text-red-500">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {renderField('Name', `ref-${i}-name`, ref.name, v => updateReference(i, 'name', v), { required: true })}
                        {renderField('Designation', `ref-${i}-designation`, ref.designation, v => updateReference(i, 'designation', v))}
                        {renderField('Organization', `ref-${i}-organization`, ref.organization, v => updateReference(i, 'organization', v))}
                        {renderField('Relationship', `ref-${i}-relationship`, ref.relationship, v => updateReference(i, 'relationship', v))}
                        {renderField('Contact Number', `ref-${i}-contact`, ref.contact, v => updateReference(i, 'contact', v), { type: 'tel', required: true })}
                        {renderField('Email', `ref-${i}-email`, ref.email, v => updateReference(i, 'email', v), { type: 'email' })}
                      </div>
                    </div>
                  ))}

                  <div className="flex justify-between pt-4">
                    <Button type="button" onClick={handleBack} variant="outline" size="lg"><ChevronLeft className="mr-2 w-5 h-5" /> Previous</Button>
                    <Button type="button" onClick={handleNext} className="bg-brand-green hover:bg-brand-green-600 text-white px-8" size="lg">Next <ChevronRight className="ml-2 w-5 h-5" /></Button>
                  </div>
                </div>
              )}

              {/* ===== STEP 5: Gap Details ===== */}
              {currentStep === 5 && (
                <div className="space-y-6">
                  <div className="flex items-center gap-2 pb-2 border-b-2 border-brand-green">
                    <div className="w-8 h-8 bg-brand-green rounded-full flex items-center justify-center text-white font-bold text-sm">5</div>
                    <h3 className="text-xl font-semibold">Gap Period Details</h3>
                  </div>

                  {formData.gapDetails.map((gap, index) => (
                    <div key={gap.key} className="p-4 border rounded-lg space-y-3">
                      <h4 className="font-semibold text-gray-800">{gap.label}</h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <Label className="text-gray-700 font-medium">Any Gap?</Label>
                          <select className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md" value={gap.hasGap} onChange={e => updateGapDetail(index, 'hasGap', e.target.value)}>
                            <option value="">Select</option>
                            <option value="yes">Yes</option>
                            <option value="no">No</option>
                          </select>
                        </div>
                        {gap.hasGap === 'yes' && (
                          <>
                            {renderField('Duration', `gap-${gap.key}-duration`, gap.duration, v => updateGapDetail(index, 'duration', v), { placeholder: 'e.g. 6 months' })}
                            {renderField('Reason', `gap-${gap.key}-reason`, gap.reason, v => updateGapDetail(index, 'reason', v))}
                          </>
                        )}
                      </div>
                    </div>
                  ))}

                  <div className="flex justify-between pt-4">
                    <Button type="button" onClick={handleBack} variant="outline" size="lg"><ChevronLeft className="mr-2 w-5 h-5" /> Previous</Button>
                    <Button type="button" onClick={handleNext} className="bg-brand-green hover:bg-brand-green-600 text-white px-8" size="lg">Next <ChevronRight className="ml-2 w-5 h-5" /></Button>
                  </div>
                </div>
              )}

              {/* ===== STEP 6: LOA ===== */}
              {currentStep === 6 && (
                <div className="space-y-6">
                  <div className="flex items-center gap-2 pb-2 border-b-2 border-brand-green">
                    <div className="w-8 h-8 bg-brand-green rounded-full flex items-center justify-center text-white font-bold text-sm">6</div>
                    <h3 className="text-xl font-semibold">Letter of Authorization</h3>
                  </div>

                  <div className="bg-gray-50 p-6 rounded-lg space-y-4">
                    <div className="space-y-3">
                      <label className="flex items-start gap-3 cursor-pointer">
                        <input type="checkbox" checked={formData.loa.authCheckbox1} onChange={e => updateLoa('authCheckbox1', e.target.checked)} className="mt-1 h-5 w-5" />
                        <span className="text-sm text-gray-700">I hereby authorize Zella Screenings to conduct background verification checks as may be necessary for the purpose of my employment/engagement. I understand that this may include but is not limited to verification of my educational qualifications, employment history, criminal records, and identity.</span>
                      </label>

                      <label className="flex items-start gap-3 cursor-pointer">
                        <input type="checkbox" checked={formData.loa.authCheckbox2} onChange={e => updateLoa('authCheckbox2', e.target.checked)} className="mt-1 h-5 w-5" />
                        <span className="text-sm text-gray-700">I confirm that the information provided by me in this form is true and accurate to the best of my knowledge. I understand that any misrepresentation or omission of facts may result in disqualification from employment or termination of service.</span>
                      </label>

                      <label className="flex items-start gap-3 cursor-pointer">
                        <input type="checkbox" checked={formData.loa.authCheckbox3} onChange={e => updateLoa('authCheckbox3', e.target.checked)} className="mt-1 h-5 w-5" />
                        <span className="text-sm text-gray-700">I authorize the release of any information to Zella Screenings and/or their authorized agents for the purpose of conducting background verification. I release all parties from any liability or claims arising from the investigation.</span>
                      </label>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
                      <div>
                        <Label className="text-gray-700 font-medium">Title <span className="text-red-500">*</span></Label>
                        <select className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md" value={formData.loa.title} onChange={e => updateLoa('title', e.target.value)}>
                          <option value="">Select</option>
                          <option value="Mr">Mr</option>
                          <option value="Ms">Ms</option>
                          <option value="Mrs">Mrs</option>
                        </select>
                      </div>
                      {renderField('Name (IN CAPITALS)', 'nameInCapitals', formData.loa.nameInCapitals, v => updateLoa('nameInCapitals', v), { required: true })}
                      {renderField('Date', 'loa-date', formData.loa.date, v => updateLoa('date', v), { type: 'date', required: true })}
                    </div>
                  </div>

                  <div className="flex justify-between pt-4">
                    <Button type="button" onClick={handleBack} variant="outline" size="lg"><ChevronLeft className="mr-2 w-5 h-5" /> Previous</Button>
                    <Button type="button" onClick={handleNext} className="bg-brand-green hover:bg-brand-green-600 text-white px-8" size="lg"
                      disabled={!formData.loa.authCheckbox1 || !formData.loa.authCheckbox2 || !formData.loa.authCheckbox3}>
                      Next <ChevronRight className="ml-2 w-5 h-5" />
                    </Button>
                  </div>
                  {(!formData.loa.authCheckbox1 || !formData.loa.authCheckbox2 || !formData.loa.authCheckbox3) && (
                    <p className="text-sm text-gray-500 text-right">Please accept all authorization checkboxes to proceed</p>
                  )}
                </div>
              )}

              {/* ===== STEP 7: Document Upload ===== */}
              {currentStep === 7 && (
                <div className="space-y-6">
                  <div className="flex items-center gap-2 pb-2 border-b-2 border-brand-green">
                    <div className="w-8 h-8 bg-brand-green rounded-full flex items-center justify-center text-white font-bold text-sm">7</div>
                    <h3 className="text-xl font-semibold">Document Upload</h3>
                  </div>
                  <p className="text-sm text-gray-600">Upload required documents (max 5MB each, PDF/JPG/PNG)</p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {[
                      { key: 'aadhaar', label: 'Aadhaar Card', required: true },
                      { key: 'pan', label: 'PAN Card', required: true },
                      { key: 'degreeMarksheet', label: 'Degree / Marksheet', required: true },
                      { key: 'addressProof', label: 'Address Proof', required: true },
                      { key: 'passport', label: 'Passport (if available)', required: false },
                      { key: 'passportDeclaration', label: 'Passport Declaration (if no passport)', required: false },
                      { key: 'relievingLetter', label: 'Relieving Letter', required: false },
                      { key: 'paySlip', label: 'Pay Slip (Latest)', required: false },
                      { key: 'offerLetter', label: 'Offer Letter', required: false },
                      { key: 'cv', label: 'CV / Resume', required: false },
                      { key: 'signature', label: 'Signature', required: true },
                    ].map(({ key, label, required }) => (
                      <div key={key} className="border-2 border-dashed border-gray-300 rounded-lg p-4 hover:border-brand-green transition-colors">
                        <Label htmlFor={`doc-${key}`} className="text-gray-700 font-medium">
                          {label} {required && <span className="text-red-500">*</span>}
                        </Label>
                        <input
                          type="file"
                          id={`doc-${key}`}
                          accept=".pdf,.jpg,.jpeg,.png"
                          onChange={e => handleFileChange(key, e.target.files?.[0] || null)}
                          className="mt-2 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-brand-green-50 file:text-brand-green hover:file:bg-brand-green-100"
                        />
                        {documents[key] && (
                          <p className="text-xs text-brand-green font-medium mt-2">&#10003; {documents[key]!.name}</p>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="flex justify-between pt-6">
                    <Button type="button" onClick={handleBack} variant="outline" size="lg" className="border-brand-green text-brand-green hover:bg-brand-green-50">
                      <ChevronLeft className="mr-2 w-5 h-5" /> Previous
                    </Button>
                    <Button type="submit" disabled={submitting} className="bg-brand-green hover:bg-brand-green-600 text-white px-8" size="lg">
                      {submitting ? 'Submitting...' : 'Submit BGV Form'}
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
          <p>Contact us at <a href="mailto:start@zellascreenings.com" className="text-brand-green hover:underline font-medium">start@zellascreenings.com</a></p>
          <p className="mt-1">Phone: +91 8178685006 / +91 9871967859</p>
          <p className="mt-4 text-xs text-gray-400">&copy; {new Date().getFullYear()} Zella Screenings. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
};

export default DocumentCollectionPage;
