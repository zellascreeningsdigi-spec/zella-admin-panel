import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Camera, Upload, Trash2, MapPin, CheckCircle, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { apiService } from '@/services/api';
import { VendorCheck, buildVendorChecks } from '@/lib/vendorCheckRows';

type GeoStatus =
  | 'idle' | 'requesting' | 'granted' | 'denied_soft' | 'denied_hard'
  | 'timeout' | 'unavailable' | 'insecure_context' | 'unsupported';

const VendorCaseDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [verification, setVerification] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [checks, setChecks] = useState<VendorCheck[]>([]);
  const [verifierComment, setVerifierComment] = useState('');
  const [verifierName, setVerifierName] = useState('');
  const [verifierContact, setVerifierContact] = useState('');
  const [verifiedBy, setVerifiedBy] = useState('');

  const [geoStatus, setGeoStatus] = useState<GeoStatus>('idle');
  const [coords, setCoords] = useState<{ latitude?: number; longitude?: number }>({});
  const photoInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);

  // Geolocation state machine — reused from the candidate AddressVerificationPage.
  const captureGeolocation = useCallback(async () => {
    if (typeof window !== 'undefined' && window.isSecureContext === false) {
      setGeoStatus('insecure_context');
      return;
    }
    if (!('geolocation' in navigator)) {
      setGeoStatus('unsupported');
      return;
    }
    if (navigator.permissions && typeof navigator.permissions.query === 'function') {
      try {
        const perm = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
        if (perm.state === 'denied') {
          setGeoStatus('denied_hard');
          return;
        }
      } catch {
        /* older Safari throws — fall through */
      }
    }
    setGeoStatus('requesting');
    const tryGet = (highAccuracy: boolean, timeout: number) =>
      new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: highAccuracy,
          timeout,
          maximumAge: highAccuracy ? 0 : 60_000,
        });
      });
    const apply = (pos: GeolocationPosition) => {
      setCoords({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
      setGeoStatus('granted');
    };
    try {
      apply(await tryGet(true, 25_000));
    } catch (e1: any) {
      if (e1?.code === 1) { setGeoStatus('denied_soft'); return; }
      try {
        apply(await tryGet(false, 15_000));
      } catch (e2: any) {
        if (e2?.code === 1) setGeoStatus('denied_soft');
        else if (e2?.code === 2) setGeoStatus('unavailable');
        else setGeoStatus('timeout');
      }
    }
  }, []);

  const fetchVerification = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await apiService.getAddressVerificationById(id);
      if (res.success && res.data) {
        const v = res.data;
        setVerification(v);
        const vw = v.vendorWork || {};
        setChecks(
          Array.isArray(vw.checks) && vw.checks.length > 0
            ? vw.checks.map((c: any) => ({
                key: c.key, label: c.label, profileValue: c.profileValue || '',
                entityStatus: c.entityStatus || 'na', disputeReason: c.disputeReason || '',
              }))
            : buildVendorChecks(v)
        );
        setVerifierComment(vw.verifierComment || '');
        setVerifierName(vw.verifierName || '');
        setVerifierContact(vw.verifierContact || '');
        setVerifiedBy(vw.verifiedBy || '');
      } else {
        alert('Case not found or access denied');
        navigate('/dashboard');
      }
    } catch (error: any) {
      console.error('Fetch case error:', error);
      alert(error.message || 'Failed to load case');
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => {
    fetchVerification();
    captureGeolocation();
  }, [fetchVerification, captureGeolocation]);

  const alreadyFinalized =
    verification?.vendorWork?.status === 'verified' || verification?.vendorWork?.status === 'disputed';
  // Case has been finalized by an admin (final decision) — lock everything.
  const adminFinalized = verification?.verificationStatus === 'completed';
  const readOnly = adminFinalized;

  const setRowStatus = (key: string, entityStatus: VendorCheck['entityStatus']) => {
    setChecks((prev) =>
      prev.map((c) =>
        c.key === key
          ? { ...c, entityStatus, disputeReason: entityStatus === 'disputed' ? c.disputeReason : '' }
          : c
      )
    );
  };
  const setRowReason = (key: string, disputeReason: string) => {
    setChecks((prev) => prev.map((c) => (c.key === key ? { ...c, disputeReason } : c)));
  };
  const setRowProfile = (key: string, profileValue: string) => {
    setChecks((prev) => prev.map((c) => (c.key === key ? { ...c, profileValue } : c)));
  };

  const handlePhotoSelected = async (file: File | null) => {
    if (!file || !id) return;
    setUploading(true);
    try {
      const res = await apiService.uploadVendorPhoto(id, file, coords);
      if (res.success) {
        await fetchVerification();
        // Refresh location for the next photo.
        captureGeolocation();
      } else {
        alert(res.message || 'Upload failed');
      }
    } catch (error: any) {
      alert(error.message || 'Failed to upload photo');
    } finally {
      setUploading(false);
      if (photoInputRef.current) photoInputRef.current.value = '';
    }
  };

  const handleDocSelected = async (file: File | null) => {
    if (!file || !id) return;
    setUploading(true);
    try {
      const res = await apiService.uploadVendorDocument(id, file);
      if (res.success) await fetchVerification();
      else alert(res.message || 'Upload failed');
    } catch (error: any) {
      alert(error.message || 'Failed to upload document');
    } finally {
      setUploading(false);
      if (docInputRef.current) docInputRef.current.value = '';
    }
  };

  const deletePhoto = async (photoId: string) => {
    if (!id || !window.confirm('Delete this photo?')) return;
    try {
      await apiService.deleteVendorPhoto(id, photoId);
      fetchVerification();
    } catch (error: any) {
      alert(error.message || 'Failed to delete photo');
    }
  };

  const deleteDoc = async (docId: string) => {
    if (!id || !window.confirm('Delete this document?')) return;
    try {
      await apiService.deleteVendorDocument(id, docId);
      fetchVerification();
    } catch (error: any) {
      alert(error.message || 'Failed to delete document');
    }
  };

  const buildPayload = (status: 'in_progress' | 'verified' | 'disputed') => ({
    checks,
    verifierComment,
    verifierName,
    verifierContact,
    verifiedBy,
    status,
  });

  const saveProgress = async () => {
    if (!id) return;
    setSaving(true);
    try {
      const res = await apiService.saveVendorWork(id, buildPayload('in_progress'));
      if (res.success) alert('Progress saved');
      else alert(res.message || 'Failed to save');
    } catch (error: any) {
      alert(error.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const submit = async (outcome: 'verified' | 'disputed') => {
    if (!id) return;
    // Require a reason on any disputed row.
    const missingReason = checks.find((c) => c.entityStatus === 'disputed' && !c.disputeReason.trim());
    if (missingReason) {
      alert(`Please add a dispute reason for "${missingReason.label}".`);
      return;
    }
    if (outcome === 'verified' && checks.some((c) => c.entityStatus === 'disputed')) {
      if (!window.confirm('Some rows are marked disputed. Submit as Verified anyway?')) return;
    }
    if (!window.confirm(`Submit this case as ${outcome}? Admins will be notified for final review.`)) return;

    setSaving(true);
    try {
      const res = await apiService.saveVendorWork(id, buildPayload(outcome));
      if (res.success) {
        alert(res.message || 'Submitted');
        fetchVerification();
      } else {
        alert(res.message || 'Failed to submit');
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }
  if (!verification) return null;

  const photos = verification.vendorWork?.photos || [];
  const documents = verification.vendorWork?.documents || [];

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={() => navigate('/dashboard', { state: { activeTab: 'my-cases' } })}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to My Cases
          </Button>
          <div className="text-sm font-mono text-gray-500">{verification.code}</div>
        </div>

        {readOnly && (
          <div className="bg-blue-50 border border-blue-200 rounded-md p-3 text-sm text-blue-800">
            This case has been finalized by an admin and is now read-only.
          </div>
        )}
        {alreadyFinalized && !readOnly && (
          <div className="bg-amber-50 border border-amber-200 rounded-md p-3 text-sm text-amber-800">
            You have submitted this case (<strong>{verification.vendorWork.status}</strong>) for admin review.
            You can still update it until an admin finalizes it.
          </div>
        )}

        {/* Case info (read-only) */}
        <div className="bg-white rounded-lg border p-4 sm:p-5">
          <h2 className="text-lg font-bold mb-4">Case Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            <div><span className="text-gray-500">Candidate:</span> <span className="font-medium">{verification.name}</span></div>
            <div><span className="text-gray-500">Phone:</span> {verification.phone}</div>
            <div><span className="text-gray-500">Company:</span> {verification.companyName}</div>
            <div><span className="text-gray-500">Father's Name:</span> {verification.fathersName || '-'}</div>
            <div className="md:col-span-2"><span className="text-gray-500">Address:</span> {verification.address}</div>
            {verification.city && <div><span className="text-gray-500">City:</span> {verification.city}</div>}
            {verification.state && <div><span className="text-gray-500">State:</span> {verification.state}</div>}
            {verification.pin && <div><span className="text-gray-500">PIN:</span> {verification.pin}</div>}
          </div>
        </div>

        {/* Address Check */}
        <div className="bg-white rounded-lg border p-4 sm:p-5">
          <h2 className="text-lg font-bold mb-4">Address Check</h2>

          {/* Desktop / tablet: table */}
          <div className="overflow-x-auto hidden sm:block">
            <table className="w-full border text-sm">
              <thead>
                <tr className="bg-gray-100 text-left">
                  <th className="p-2 border w-1/4">Details</th>
                  <th className="p-2 border">Profile Provided Information</th>
                  <th className="p-2 border">Entity Provided Information</th>
                </tr>
              </thead>
              <tbody>
                {checks.map((c) => (
                  <tr key={c.key} className="align-top">
                    <td className="p-2 border font-medium bg-gray-50">{c.label}</td>
                    <td className="p-2 border">
                      <Input
                        value={c.profileValue}
                        onChange={(e) => setRowProfile(c.key, e.target.value)}
                        disabled={readOnly}
                        className="h-9"
                      />
                    </td>
                    <td className="p-2 border">
                      <div className="flex gap-1 mb-1">
                        <button
                          type="button"
                          disabled={readOnly}
                          onClick={() => setRowStatus(c.key, 'verified')}
                          className={`px-3 py-1.5 rounded text-xs font-medium border ${
                            c.entityStatus === 'verified'
                              ? 'bg-green-600 text-white border-green-600'
                              : 'bg-white text-gray-600 border-gray-300'
                          }`}
                        >
                          Verified
                        </button>
                        <button
                          type="button"
                          disabled={readOnly}
                          onClick={() => setRowStatus(c.key, 'disputed')}
                          className={`px-3 py-1.5 rounded text-xs font-medium border ${
                            c.entityStatus === 'disputed'
                              ? 'bg-red-600 text-white border-red-600'
                              : 'bg-white text-gray-600 border-gray-300'
                          }`}
                        >
                          Disputed
                        </button>
                      </div>
                      {c.entityStatus === 'disputed' && (
                        <Input
                          value={c.disputeReason}
                          onChange={(e) => setRowReason(c.key, e.target.value)}
                          disabled={readOnly}
                          placeholder="Dispute reason (required)"
                          className="h-9"
                        />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile: stacked cards, one per check row */}
          <div className="sm:hidden space-y-3">
            {checks.map((c) => (
              <div key={c.key} className="border rounded-md p-3 space-y-2">
                <div className="font-medium text-sm">{c.label}</div>
                <div>
                  <label className="text-xs text-gray-500">Profile Provided</label>
                  <Input
                    value={c.profileValue}
                    onChange={(e) => setRowProfile(c.key, e.target.value)}
                    disabled={readOnly}
                    className="h-10 mt-1"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={readOnly}
                    onClick={() => setRowStatus(c.key, 'verified')}
                    className={`flex-1 px-3 py-2 rounded text-sm font-medium border ${
                      c.entityStatus === 'verified'
                        ? 'bg-green-600 text-white border-green-600'
                        : 'bg-white text-gray-600 border-gray-300'
                    }`}
                  >
                    Verified
                  </button>
                  <button
                    type="button"
                    disabled={readOnly}
                    onClick={() => setRowStatus(c.key, 'disputed')}
                    className={`flex-1 px-3 py-2 rounded text-sm font-medium border ${
                      c.entityStatus === 'disputed'
                        ? 'bg-red-600 text-white border-red-600'
                        : 'bg-white text-gray-600 border-gray-300'
                    }`}
                  >
                    Disputed
                  </button>
                </div>
                {c.entityStatus === 'disputed' && (
                  <Input
                    value={c.disputeReason}
                    onChange={(e) => setRowReason(c.key, e.target.value)}
                    disabled={readOnly}
                    placeholder="Dispute reason (required)"
                    className="h-10"
                  />
                )}
              </div>
            ))}
          </div>

          {/* Verifier fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5">
            <div className="md:col-span-2">
              <Label htmlFor="verifierComment">Verifier's Comment</Label>
              <textarea
                id="verifierComment"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={2}
                value={verifierComment}
                onChange={(e) => setVerifierComment(e.target.value)}
                disabled={readOnly}
                placeholder="e.g., Referee stated subject is staying at given address since 1 year"
              />
            </div>
            <div>
              <Label htmlFor="verifierName">Verifier's Name</Label>
              <Input id="verifierName" value={verifierName} onChange={(e) => setVerifierName(e.target.value)} disabled={readOnly} placeholder="e.g., Mr. Umesh Pandit" />
            </div>
            <div>
              <Label htmlFor="verifierContact">Verifier's Contact</Label>
              <Input id="verifierContact" value={verifierContact} onChange={(e) => setVerifierContact(e.target.value)} disabled={readOnly} placeholder="Phone / details" />
            </div>
            <div>
              <Label htmlFor="verifiedBy">Verified By</Label>
              <Input id="verifiedBy" value={verifiedBy} onChange={(e) => setVerifiedBy(e.target.value)} disabled={readOnly} placeholder="e.g., Security Guard" />
            </div>
          </div>
        </div>

        {/* Geo-stamped photos */}
        <div className="bg-white rounded-lg border p-4 sm:p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold">Field Photos</h2>
            <div className="text-xs">
              {geoStatus === 'granted' && coords.latitude !== undefined ? (
                <span className="text-green-600 flex items-center">
                  <MapPin className="w-3 h-3 mr-1" />
                  {coords.latitude.toFixed(5)}, {coords.longitude!.toFixed(5)}
                </span>
              ) : (
                <button type="button" onClick={captureGeolocation} className="text-blue-600 underline">
                  {geoStatus === 'requesting' ? 'Getting location…' : 'Enable location'}
                </button>
              )}
            </div>
          </div>
          {geoStatus !== 'granted' && (
            <p className="text-xs text-amber-600 mb-3">
              Location not captured yet — photos will be saved without GPS. Tap "Enable location" and allow access.
            </p>
          )}

          {!readOnly && (
            <div className="flex gap-2 mb-4">
              <input
                ref={photoInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => handlePhotoSelected(e.target.files?.[0] || null)}
              />
              <Button type="button" variant="outline" disabled={uploading} onClick={() => photoInputRef.current?.click()}>
                <Camera className="w-4 h-4 mr-2" /> {uploading ? 'Uploading…' : 'Take / Add Photo'}
              </Button>
            </div>
          )}

          {photos.length === 0 ? (
            <p className="text-sm text-gray-400">No photos yet.</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {photos.map((p: any) => (
                <div key={p._id} className="border rounded-md overflow-hidden">
                  <a href={p.s3Url} target="_blank" rel="noreferrer">
                    <img src={p.s3Url} alt={p.docName} className="w-full h-32 object-cover" />
                  </a>
                  <div className="p-2 text-xs text-gray-600">
                    {p.latitude !== undefined && p.latitude !== null ? (
                      <a
                        className="text-blue-600 flex items-center"
                        href={`https://maps.google.com/?q=${p.latitude},${p.longitude}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <MapPin className="w-3 h-3 mr-1" />
                        {Number(p.latitude).toFixed(4)}, {Number(p.longitude).toFixed(4)}
                      </a>
                    ) : (
                      <span className="text-gray-400">No GPS</span>
                    )}
                    {!readOnly && (
                      <button onClick={() => deletePhoto(p._id)} className="text-red-500 mt-1 flex items-center">
                        <Trash2 className="w-3 h-3 mr-1" /> Delete
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Optional documents */}
        <div className="bg-white rounded-lg border p-4 sm:p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold">Supporting Documents (optional)</h2>
            {!readOnly && (
              <>
                <input
                  ref={docInputRef}
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  className="hidden"
                  onChange={(e) => handleDocSelected(e.target.files?.[0] || null)}
                />
                <Button type="button" variant="outline" size="sm" disabled={uploading} onClick={() => docInputRef.current?.click()}>
                  <Upload className="w-4 h-4 mr-2" /> Attach
                </Button>
              </>
            )}
          </div>
          {documents.length === 0 ? (
            <p className="text-sm text-gray-400">No documents attached.</p>
          ) : (
            <ul className="space-y-2">
              {documents.map((d: any) => (
                <li key={d._id} className="flex items-center justify-between text-sm border rounded-md p-2">
                  <a href={d.s3Url} target="_blank" rel="noreferrer" className="text-blue-600 truncate">{d.docName}</a>
                  {!readOnly && (
                    <button onClick={() => deleteDoc(d._id)} className="text-red-500">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Actions */}
        {!readOnly && (
          <div className="flex flex-col sm:flex-row sm:justify-end gap-2 sticky bottom-0 bg-gray-50 py-3 border-t border-gray-200 -mx-4 sm:mx-0 px-4 sm:px-0">
            <Button variant="outline" className="w-full sm:w-auto" onClick={saveProgress} disabled={saving}>
              Save Progress
            </Button>
            <Button
              className="w-full sm:w-auto bg-red-600 hover:bg-red-700"
              onClick={() => submit('disputed')}
              disabled={saving}
            >
              <AlertTriangle className="w-4 h-4 mr-2" /> Mark Disputed
            </Button>
            <Button
              className="w-full sm:w-auto bg-green-600 hover:bg-green-700"
              onClick={() => submit('verified')}
              disabled={saving}
            >
              <CheckCircle className="w-4 h-4 mr-2" /> Mark Verified
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default VendorCaseDetailPage;
