import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import VendorAgreementGate from '@/components/Vendors/VendorAgreementGate';
import Dashboard from '@/pages/Dashboard';
import DigiLockerCallback from '@/pages/DigiLockerCallback';
import Login from '@/pages/Login';
import { Navigate, Route, BrowserRouter as Router, Routes } from 'react-router-dom';
import DocumentPage from './pages/DocumentPage';
import AddressVerificationPage from './pages/AddressVerificationPage';
import VerificationDetailPage from './pages/VerificationDetailPage';
import VendorCaseDetailPage from './pages/VendorCaseDetailPage';
import ReportViewPage from './pages/ReportViewPage';
import DocumentCollectionPage from './pages/DocumentCollectionPage';
import DocumentCollectionDetailPage from './pages/DocumentCollectionDetailPage';
import DocumentCollectionDocumentsPage from './pages/DocumentCollectionDocumentsPage';
import PasswordExpiryBanner from './components/PasswordExpiryBanner';

// Gate vendor / vendor-member users behind the mandatory agreement signing.
// Non-vendor roles (and logged-out users) pass straight through.
function VendorGuard({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const isVendor = user?.role === 'vendor' || user?.role === 'vendor-member';
  if (!isVendor) return <>{children}</>;
  return <VendorAgreementGate>{children}</VendorAgreementGate>;
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <PasswordExpiryBanner />
          <Routes>
            <Route path="/login" element={<Login />} />

            <Route path="/dashboard" element={<VendorGuard><Dashboard /></VendorGuard>} />

            <Route path="/digilocker" element={<DigiLockerCallback />} />

            <Route path="/documents" element={<DocumentPage />} />

            <Route path="/verification/address/:token" element={<AddressVerificationPage />} />

            <Route path="/address-verifications/:id/report" element={<ReportViewPage />} />

            <Route path="/address-verifications/:id" element={<VerificationDetailPage />} />

            <Route path="/vendor/cases/:id" element={<VendorGuard><VendorCaseDetailPage /></VendorGuard>} />

            <Route path="/verification/documents/:token" element={<DocumentCollectionPage />} />

            <Route path="/document-collections/:id/documents" element={<DocumentCollectionDocumentsPage />} />

            <Route path="/document-collections/:id" element={<DocumentCollectionDetailPage />} />

            <Route path="/" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
