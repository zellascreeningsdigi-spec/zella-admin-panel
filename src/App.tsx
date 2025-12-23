import { AuthProvider } from '@/contexts/AuthContext';
import Dashboard from '@/pages/Dashboard';
import DigiLockerCallback from '@/pages/DigiLockerCallback';
import Login from '@/pages/Login';
import { Navigate, Route, BrowserRouter as Router, Routes } from 'react-router-dom';
import DocumentPage from './pages/DocumentPage';
import ManageUsersPage from './components/Users/ManageUsersPage';

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <Routes>
            <Route path="/login" element={<Login />} />

            <Route path="/dashboard" element={<Dashboard />} />

            <Route path="/digilocker" element={<DigiLockerCallback />} />

            <Route path="/documents" element={<DocumentPage />} />

            <Route path="/manage-users" element={<ManageUsersPage />} />

            <Route path="/" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
