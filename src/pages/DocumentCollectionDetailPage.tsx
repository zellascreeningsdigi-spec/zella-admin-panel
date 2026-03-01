import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, User, FileText, Briefcase, GraduationCap, Users, Clock, ShieldCheck, Download, RefreshCw, CheckCircle, XCircle, AlertCircle, Send, MessageCircle, Archive } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DocumentCollection } from '@/types/documentCollection';
import apiService from '@/services/api';

const DocumentCollectionDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const companyContext = {
    selectedCompanyId: location.state?.selectedCompanyId,
    selectedCompanyName: location.state?.selectedCompanyName,
  };
  const [collection, setCollection] = useState<DocumentCollection | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [generatingDocx, setGeneratingDocx] = useState(false);
  const [adminComments, setAdminComments] = useState('');
  const [downloadingAll, setDownloadingAll] = useState(false);

  useEffect(() => {
    if (id) fetchCollection();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const fetchCollection = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const response = await apiService.getDocumentCollectionById(id);
      if (response.success && response.data) {
        setCollection(response.data);
        setAdminComments(response.data.adminComments || '');
      } else {
        throw new Error('Not found');
      }
    } catch (error) {
      console.error('Failed to fetch:', error);
      alert('Failed to load document collection');
      navigate('/dashboard', { state: { activeTab: 'document-collection', selectedCompanyId: companyContext.selectedCompanyId || collection?.customerId, selectedCompanyName: companyContext.selectedCompanyName || collection?.companyName } });
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!id) return;
    setUpdating(true);
    try {
      const response = await apiService.updateDocumentCollection(id, {
        status: 'approved',
        adminComments
      });
      if (response.success) {
        alert('Approved successfully');
        navigate('/dashboard', { state: { activeTab: 'document-collection', selectedCompanyId: companyContext.selectedCompanyId || collection?.customerId, selectedCompanyName: companyContext.selectedCompanyName || collection?.companyName } });
      }
    } catch (error: any) {
      alert(error.message || 'Failed to approve');
    } finally {
      setUpdating(false);
    }
  };

  const handleReject = async () => {
    if (!id) return;
    if (!adminComments.trim()) {
      alert('Please add comments explaining the reason for rejection.');
      return;
    }
    if (!window.confirm('Are you sure you want to reject? The candidate will receive a new link.')) return;
    setUpdating(true);
    try {
      const response = await apiService.updateDocumentCollection(id, {
        status: 'rejected',
        adminComments
      });
      if (response.success) {
        alert('Rejected. Candidate has been notified with a new link.');
        navigate('/dashboard', { state: { activeTab: 'document-collection', selectedCompanyId: companyContext.selectedCompanyId || collection?.customerId, selectedCompanyName: companyContext.selectedCompanyName || collection?.companyName } });
      }
    } catch (error: any) {
      alert(error.message || 'Failed to reject');
    } finally {
      setUpdating(false);
    }
  };

  const handleSendLink = async () => {
    if (!id || !collection) return;
    if (!window.confirm(`Send BGV form link to ${collection.email}?`)) return;
    try {
      const response = await apiService.sendDocumentCollectionLink(id);
      if (response.success) {
        alert('Link sent successfully!');
        fetchCollection();
      }
    } catch (error) {
      alert('Failed to send link');
    }
  };

  const handleSendWhatsApp = () => {
    if (!collection) return;
    const verificationLink = collection.verificationLink || '';
    let phoneNumber = collection.phone.replace(/\D/g, '');
    if (!phoneNumber.startsWith('91') && phoneNumber.length === 10) phoneNumber = '91' + phoneNumber;
    const message = encodeURIComponent(`Dear ${collection.name},\n\nPlease complete your BGV form for ${collection.companyName}:\n${verificationLink}\n\nTeam Zella Screenings`);
    window.open(`https://wa.me/${phoneNumber}?text=${message}`, '_blank');
  };

  const handleGenerateDocx = async () => {
    if (!id) return;
    setGeneratingDocx(true);
    try {
      const response = await apiService.generateDocumentCollectionDocx(id);
      if (response.success) {
        alert('DOCX generated successfully!');
        fetchCollection();
      }
    } catch (error: any) {
      alert(error.message || 'Failed to generate DOCX');
    } finally {
      setGeneratingDocx(false);
    }
  };

  const handleDownloadAll = async () => {
    if (!id) return;
    setDownloadingAll(true);
    try {
      await apiService.downloadAllDocumentCollectionDocuments(id);
    } catch (error: any) {
      alert(error.message || 'Failed to download documents');
    } finally {
      setDownloadingAll(false);
    }
  };

  const handleDownloadDocx = async () => {
    if (!id) return;
    try {
      const response = await apiService.downloadDocumentCollectionDocx(id);
      if (response.success && response.data) {
        window.open(response.data.downloadUrl, '_blank');
      }
    } catch (error) {
      alert('Failed to download DOCX');
    }
  };

  const InfoRow = ({ label, value }: { label: string; value?: string }) => (
    <div>
      <Label className="text-gray-600 text-sm font-medium">{label}</Label>
      <p className="text-base mt-1">{value || '-'}</p>
    </div>
  );

  const hasSubmitted = collection && (collection.verificationStatus === 'completed' || collection.verificationStatus === 'in_progress');

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-brand-green border-t-transparent"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!collection) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 mx-auto mb-4 text-gray-400" />
          <p className="text-xl text-gray-600">Not found</p>
          <Button onClick={() => navigate('/dashboard', { state: { activeTab: 'document-collection', selectedCompanyId: companyContext.selectedCompanyId, selectedCompanyName: companyContext.selectedCompanyName } })} className="mt-4">Back</Button>
        </div>
      </div>
    );
  }

  const fd = collection.formData;
  const config = collection.formConfig;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-md border-b-4 border-brand-green sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" onClick={() => navigate('/dashboard', { state: { activeTab: 'document-collection', selectedCompanyId: companyContext.selectedCompanyId || collection?.customerId, selectedCompanyName: companyContext.selectedCompanyName || collection?.companyName } })} className="flex items-center gap-2">
                <ArrowLeft className="w-5 h-5" /> Back
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Document Collection Detail</h1>
                <p className="text-sm text-gray-500 font-mono">{collection.code}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className={`px-4 py-2 rounded-full text-sm font-medium ${
                collection.status === 'approved' ? 'bg-green-100 text-green-800' :
                collection.status === 'rejected' ? 'bg-red-100 text-red-800' :
                'bg-yellow-100 text-yellow-800'
              }`}>{collection.status}</span>
              <span className={`px-4 py-2 rounded-full text-sm font-medium ${
                collection.verificationStatus === 'completed' ? 'bg-blue-100 text-blue-800' :
                collection.verificationStatus === 'link_sent' ? 'bg-purple-100 text-purple-800' :
                'bg-gray-100 text-gray-800'
              }`}>{collection.verificationStatus.replace(/_/g, ' ')}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Not submitted alert */}
        {!hasSubmitted && (
          <Card className="mb-6 border-2 border-yellow-300 bg-yellow-50">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <AlertCircle className="w-8 h-8 text-yellow-600 flex-shrink-0 mt-1" />
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-yellow-900 mb-2">Candidate Has Not Submitted Yet</h3>
                  <p className="text-yellow-800 mb-4">
                    The link has {collection.verificationStatus === 'link_sent' ? 'been sent' : 'not been sent'}.
                  </p>
                  <div className="flex gap-3">
                    <Button onClick={handleSendLink} className="bg-yellow-600 hover:bg-yellow-700 text-white">
                      <Send className="w-4 h-4 mr-2" /> {collection.verificationStatus === 'link_sent' ? 'Resend Link' : 'Send Link'}
                    </Button>
                    {collection.verificationLink && (
                      <Button onClick={handleSendWhatsApp} className="bg-green-600 hover:bg-green-700 text-white">
                        <MessageCircle className="w-4 h-4 mr-2" /> WhatsApp
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Candidate Info */}
            <Card>
              <CardHeader className="bg-gray-50 border-b">
                <CardTitle className="flex items-center gap-2"><User className="w-5 h-5 text-brand-green" /> Candidate Information</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <InfoRow label="Code" value={collection.code} />
                  <InfoRow label="Name" value={collection.name} />
                  <InfoRow label="Phone" value={collection.phone} />
                  <InfoRow label="Email" value={collection.email} />
                  <InfoRow label="Company" value={collection.companyName} />
                  <InfoRow label="Created" value={collection.createdAt ? new Date(collection.createdAt).toLocaleString('en-IN') : '-'} />
                </div>
              </CardContent>
            </Card>

            {/* Form Data - Only show if submitted */}
            {hasSubmitted && fd && (
              <>
                {/* Personal Info */}
                <Card>
                  <CardHeader className="bg-blue-50 border-b border-blue-200">
                    <CardTitle className="flex items-center gap-2"><User className="w-5 h-5 text-blue-600" /> Personal Information</CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <InfoRow label="Full Name" value={fd.personalInfo?.fullName} />
                      <InfoRow label="Date of Birth" value={fd.personalInfo?.dob} />
                      <InfoRow label="Nationality" value={fd.personalInfo?.nationality} />
                      <InfoRow label="Father's Name" value={fd.personalInfo?.fathersName} />
                      <InfoRow label="Mobile" value={fd.personalInfo?.mobile} />
                      <InfoRow label="Alternate Number" value={fd.personalInfo?.alternateNumber} />
                      <InfoRow label="Gender" value={fd.personalInfo?.gender} />
                      <InfoRow label="Email" value={fd.personalInfo?.email} />
                      <InfoRow label="Aadhaar Number" value={fd.personalInfo?.aadhaarNumber} />
                      <InfoRow label="PAN Number" value={fd.personalInfo?.panNumber} />
                    </div>
                    {fd.personalInfo?.addresses && fd.personalInfo.addresses.length > 0 && (
                      <div className="mt-4">
                        <Label className="text-gray-600 text-sm font-medium">Addresses</Label>
                        {fd.personalInfo.addresses.map((addr, i) => (
                          addr.address && (
                            <div key={i} className="mt-2 p-3 bg-gray-50 rounded-lg">
                              <p className="text-sm"><strong>Address {i + 1}:</strong> {addr.address}</p>
                              {addr.duration && <p className="text-sm text-gray-500">Duration: {addr.duration}</p>}
                            </div>
                          )
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Education */}
                {config?.steps?.education !== false && (
                <Card>
                  <CardHeader className="bg-green-50 border-b border-green-200">
                    <CardTitle className="flex items-center gap-2"><GraduationCap className="w-5 h-5 text-green-600" /> Education</CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <InfoRow label="Degree" value={fd.education?.degree} />
                      <InfoRow label="Enrollment No." value={fd.education?.enrollmentNo} />
                      <InfoRow label="Year of Passing" value={fd.education?.yearOfPassing} />
                      <InfoRow label="University" value={fd.education?.universityName} />
                      <InfoRow label="Location" value={fd.education?.universityLocation} />
                      <InfoRow label="Period of Study" value={`${fd.education?.periodOfStudyFrom || ''} - ${fd.education?.periodOfStudyTo || ''}`} />
                      <InfoRow label="Course Type" value={fd.education?.courseType?.replace(/_/g, ' ')} />
                    </div>
                  </CardContent>
                </Card>
                )}

                {/* Employment History */}
                {config?.steps?.employment !== false && fd.employmentHistory && fd.employmentHistory.length > 0 && (
                  <Card>
                    <CardHeader className="bg-purple-50 border-b border-purple-200">
                      <CardTitle className="flex items-center gap-2"><Briefcase className="w-5 h-5 text-purple-600" /> Employment History</CardTitle>
                    </CardHeader>
                    <CardContent className="p-6 space-y-6">
                      {fd.employmentHistory.map((emp, i) => (
                        <div key={i} className="p-4 border rounded-lg">
                          <h4 className="font-semibold text-gray-800 mb-3">Employment {i + 1}: {emp.companyName || 'N/A'}</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <InfoRow label="Designation" value={emp.designation} />
                            <InfoRow label="Period" value={`${emp.periodFrom || ''} - ${emp.periodTo || ''}`} />
                            <InfoRow label="CTC" value={emp.ctc} />
                            <InfoRow label="Employee ID" value={emp.employeeId} />
                            <InfoRow label="Supervisor" value={emp.supervisorName} />
                            <InfoRow label="Supervisor Contact" value={emp.supervisorContact} />
                            <InfoRow label="HR Name" value={emp.hrName} />
                            <InfoRow label="HR Contact" value={emp.hrContact} />
                            <InfoRow label="Reason for Leaving" value={emp.reasonForLeaving} />
                            <InfoRow label="Nature" value={emp.natureOfEmployment} />
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}

                {/* References */}
                {config?.steps?.references !== false && fd.references && fd.references.length > 0 && (
                  <Card>
                    <CardHeader className="bg-orange-50 border-b border-orange-200">
                      <CardTitle className="flex items-center gap-2"><Users className="w-5 h-5 text-orange-600" /> References</CardTitle>
                    </CardHeader>
                    <CardContent className="p-6 space-y-4">
                      {fd.references.map((ref, i) => (
                        ref.name && (
                          <div key={i} className="p-4 border rounded-lg">
                            <h4 className="font-semibold text-gray-800 mb-2">Reference {i + 1}</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <InfoRow label="Name" value={ref.name} />
                              <InfoRow label="Designation" value={ref.designation} />
                              <InfoRow label="Organization" value={ref.organization} />
                              <InfoRow label="Relationship" value={ref.relationship} />
                              <InfoRow label="Contact" value={ref.contact} />
                              <InfoRow label="Email" value={ref.email} />
                            </div>
                          </div>
                        )
                      ))}
                    </CardContent>
                  </Card>
                )}

                {/* Gap Details */}
                {config?.steps?.gapDetails !== false && fd.gapDetails && Array.isArray(fd.gapDetails) && fd.gapDetails.length > 0 && (
                  <Card>
                    <CardHeader className="bg-yellow-50 border-b border-yellow-200">
                      <CardTitle className="flex items-center gap-2"><Clock className="w-5 h-5 text-yellow-600" /> Gap Details</CardTitle>
                    </CardHeader>
                    <CardContent className="p-6">
                      <div className="space-y-3">
                        {fd.gapDetails.map((gap: any) => {
                          if (!gap || !gap.hasGap) return null;
                          return (
                            <div key={gap.key} className="p-3 bg-gray-50 rounded-lg">
                              <p className="font-medium">{gap.label}: <span className={gap.hasGap === 'yes' ? 'text-yellow-700' : 'text-green-700'}>{gap.hasGap === 'yes' ? 'Yes' : 'No'}</span></p>
                              {gap.hasGap === 'yes' && (
                                <>
                                  {gap.duration && <p className="text-sm text-gray-600">Duration: {gap.duration}</p>}
                                  {gap.reason && <p className="text-sm text-gray-600">Reason: {gap.reason}</p>}
                                </>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* LOA */}
                {fd.loa && (
                  <Card>
                    <CardHeader className="bg-indigo-50 border-b border-indigo-200">
                      <CardTitle className="flex items-center gap-2"><ShieldCheck className="w-5 h-5 text-indigo-600" /> Letter of Authorization</CardTitle>
                    </CardHeader>
                    <CardContent className="p-6">
                      <div className="space-y-2 mb-4">
                        <p className="text-sm"><span className={fd.loa.authCheckbox1 ? 'text-green-600' : 'text-red-500'}>{fd.loa.authCheckbox1 ? '&#10003;' : '&#10007;'}</span> Authorization to conduct background checks</p>
                        <p className="text-sm"><span className={fd.loa.authCheckbox2 ? 'text-green-600' : 'text-red-500'}>{fd.loa.authCheckbox2 ? '&#10003;' : '&#10007;'}</span> Information accuracy confirmation</p>
                        <p className="text-sm"><span className={fd.loa.authCheckbox3 ? 'text-green-600' : 'text-red-500'}>{fd.loa.authCheckbox3 ? '&#10003;' : '&#10007;'}</span> Release of information authorization</p>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <InfoRow label="Title" value={fd.loa.title} />
                        <InfoRow label="Name (Capitals)" value={fd.loa.nameInCapitals} />
                        <InfoRow label="Date" value={fd.loa.date} />
                      </div>
                    </CardContent>
                  </Card>
                )}

              </>
            )}

            {/* View Documents */}
            <Card
              className="cursor-pointer hover:shadow-lg transition-shadow border-2 border-teal-200 hover:border-teal-400"
              onClick={() => navigate(`/document-collections/${id}/documents`, { state: companyContext })}
            >
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FileText className="w-6 h-6 text-teal-600" />
                    <div>
                      <h3 className="font-semibold text-gray-900">Uploaded Documents</h3>
                      <p className="text-sm text-gray-500">View, upload, and manage all documents</p>
                    </div>
                  </div>
                  <ArrowLeft className="w-5 h-5 text-gray-400 rotate-180" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Admin Actions */}
          <div className="lg:col-span-1">
            <div className="space-y-6 sticky top-24">
              {/* Admin Actions */}
              <Card>
                <CardHeader className="bg-brand-green text-white">
                  <CardTitle>Admin Actions</CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  <div>
                    <Label className="text-gray-700 font-medium">Admin Comments</Label>
                    <textarea
                      value={adminComments}
                      onChange={e => setAdminComments(e.target.value)}
                      rows={5}
                      className="mt-2 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-green"
                      placeholder="Add your comments here..."
                    />
                  </div>

                  <div className="space-y-3 pt-4 border-t">
                    <Button onClick={handleApprove} disabled={updating} className="w-full bg-green-600 hover:bg-green-700 text-white">
                      <CheckCircle className="w-4 h-4 mr-2" /> {updating ? 'Updating...' : 'Approve'}
                    </Button>
                    <Button onClick={handleReject} disabled={updating} variant="destructive" className="w-full">
                      <XCircle className="w-4 h-4 mr-2" /> Reject
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Generated DOCX */}
              <Card>
                <CardHeader className="bg-gray-50 border-b">
                  <CardTitle className="flex items-center gap-2"><FileText className="w-5 h-5 text-purple-600" /> Generated BGV Form</CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  {collection.generatedDocx?.s3Key ? (
                    <div>
                      <p className="text-sm text-gray-600 mb-1">File: <strong>{collection.generatedDocx.fileName}</strong></p>
                      <p className="text-sm text-gray-500 mb-3">Generated: {collection.generatedDocx.generatedAt ? new Date(collection.generatedDocx.generatedAt).toLocaleString('en-IN') : '-'}</p>
                      <div className="flex gap-2">
                        <Button onClick={handleDownloadDocx} variant="outline" size="sm" className="flex-1">
                          <Download className="w-4 h-4 mr-2" /> Download
                        </Button>
                        <Button onClick={handleGenerateDocx} disabled={generatingDocx} variant="outline" size="sm" className="flex-1">
                          <RefreshCw className={`w-4 h-4 mr-2 ${generatingDocx ? 'animate-spin' : ''}`} /> Regenerate
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center">
                      <p className="text-sm text-gray-500 mb-3">No DOCX generated yet</p>
                      <Button onClick={handleGenerateDocx} disabled={generatingDocx || !hasSubmitted} className="w-full">
                        <RefreshCw className={`w-4 h-4 mr-2 ${generatingDocx ? 'animate-spin' : ''}`} />
                        {generatingDocx ? 'Generating...' : 'Generate DOCX'}
                      </Button>
                      {!hasSubmitted && (
                        <p className="text-xs text-gray-400 mt-2">DOCX can only be generated after candidate submits</p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Download All Documents */}
              <Card>
                <CardContent className="p-4">
                  <Button
                    onClick={handleDownloadAll}
                    disabled={downloadingAll}
                    variant="outline"
                    className="w-full gap-2"
                  >
                    {downloadingAll ? (
                      <div className="w-4 h-4 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Archive className="w-4 h-4" />
                    )}
                    {downloadingAll ? 'Downloading...' : 'Download All Documents'}
                  </Button>
                </CardContent>
              </Card>

              {/* Submission Info */}
              {collection.submittedAt && (
                <Card>
                  <CardHeader className="bg-gray-50 border-b">
                    <CardTitle>Submission Info</CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="space-y-3">
                      <InfoRow label="Submitted At" value={new Date(collection.submittedAt).toLocaleString('en-IN')} />
                      {collection.ipAddress && <InfoRow label="IP Address" value={collection.ipAddress} />}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </div>

    </div>
  );
};

export default DocumentCollectionDetailPage;
