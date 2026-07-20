import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { apiService } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import { FileText, CheckCircle } from 'lucide-react';

interface AgreementSection {
  heading: string | null;
  body: string;
}

interface VendorAgreementGateProps {
  // Rendered once the vendor has signed the current agreement version.
  children: React.ReactNode;
}

// Full-screen mandatory gate: vendor / vendor-member users must read and e-sign
// the Third-Party Vendor Agreement before they can use the platform. Fetches the
// agreement + current signing status; renders children only once signed.
const VendorAgreementGate = ({ children }: VendorAgreementGateProps) => {
  const { logout } = useAuth();
  const [loading, setLoading] = useState(true);
  const [signed, setSigned] = useState(false);
  const [title, setTitle] = useState('Third-Party Vendor Agreement');
  const [sections, setSections] = useState<AgreementSection[]>([]);
  const [vendorName, setVendorName] = useState('');
  const [typedName, setTypedName] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await apiService.getVendorAgreement();
        if (!active) return;
        if (res.success && res.data) {
          setTitle(res.data.title);
          setSections(res.data.sections || []);
          setVendorName(res.data.vendorName || '');
          setSigned(!!res.data.status?.signed);
        } else {
          setError(res.message || 'Failed to load the agreement.');
        }
      } catch (e: any) {
        if (active) setError(e.message || 'Failed to load the agreement.');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, []);

  const handleSign = async () => {
    if (!typedName.trim() || !agreed) return;
    setSubmitting(true);
    setError('');
    try {
      const res = await apiService.signVendorAgreement(typedName.trim());
      if (res.success) {
        setSigned(true);
      } else {
        setError(res.message || 'Could not sign the agreement.');
      }
    } catch (e: any) {
      setError(e.message || 'Could not sign the agreement.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  // Signed → let the vendor into the app.
  if (signed) return <>{children}</>;

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
          <div className="bg-blue-50 border-b border-blue-200 px-6 py-4 flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-600" />
            <h1 className="text-lg font-bold text-gray-900">{title}</h1>
          </div>

          <div className="px-6 py-4">
            <p className="text-sm text-gray-600 mb-4">
              You must read and sign this agreement before you can use the Zella Screenings vendor
              platform.
            </p>

            {/* Agreement body */}
            <div className="max-h-[45vh] overflow-y-auto border rounded-md p-4 bg-gray-50 space-y-4 text-sm text-gray-800">
              {sections.map((s, idx) => (
                <div key={idx}>
                  {s.heading && <div className="font-semibold text-gray-900 mb-1">{s.heading}</div>}
                  <p className="leading-relaxed whitespace-pre-line">{s.body}</p>
                </div>
              ))}
            </div>

            {/* Signature */}
            <div className="mt-5 space-y-4">
              <label className="flex items-start gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                />
                <span>
                  I confirm that I am authorized to sign on behalf of the Vendor
                  {vendorName ? ` (${vendorName})` : ''}, that I have read and understood this
                  Agreement, and that I agree to be bound by all of its terms.
                </span>
              </label>

              <div>
                <label htmlFor="signed-name" className="block text-sm font-medium text-gray-700 mb-1">
                  Type your full name to sign <span className="text-red-500">*</span>
                </label>
                <Input
                  id="signed-name"
                  value={typedName}
                  onChange={(e) => setTypedName(e.target.value)}
                  placeholder="Your full name"
                  disabled={submitting}
                />
              </div>

              {error && <p className="text-sm text-red-600">{error}</p>}

              <div className="flex flex-col sm:flex-row sm:justify-end gap-2 pt-2">
                <Button variant="outline" onClick={logout} disabled={submitting}>
                  Log out
                </Button>
                <Button
                  onClick={handleSign}
                  disabled={submitting || !typedName.trim() || !agreed}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  {submitting ? 'Signing…' : 'Agree & Sign'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VendorAgreementGate;
