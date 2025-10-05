import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import 'bootstrap/dist/css/bootstrap.min.css';
import './styles/App.css';
import CustomNavbar from './components/Shared/Navbar';
import Login from './components/Auth/Login';
import Dashboard from './components/Dashboard/Dashboard';
import PrivateRoute from './components/Shared/PrivateRoute';
import PatientsPage from './components/Dashboard/PatientsPage'; 
import NursesPage from './components/Dashboard/NursesPage';
import ApprovalPage from './components/Dashboard/ApprovalPage';
import AttendancePage from './components/Dashboard/AttendancePage';
import AdminManagement from './components/Dashboard/AdminManagement';
import AppointmentSlotTrackerPage from './components/Dashboard/AppointmentSlotTrackerPage';
import { AuthProvider } from './context/AuthContext';
import ConnectionLost from './components/Shared/ConnectionLost';
import api from './services/api';
import ForgotPassword from './components/Auth/ForgotPassword';

function AppContent() {
  const location = useLocation();
  const isLoginPage = location.pathname === '/login';
  const isForgotPasswordPage = location.pathname === '/forgot-password';

  const [isConnected, setIsConnected] = React.useState(true);

  // Check browser online/offline
  React.useEffect(() => {
    const handleOnline = () => setIsConnected(true);
    const handleOffline = () => setIsConnected(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Periodically ping backend
  React.useEffect(() => {
    let intervalId;
    const pingServer = async () => {
      try {
        await api.get('/machines'); // Use a public endpoint
        setIsConnected(true);
      } catch {
        setIsConnected(false);
      }
    };
    pingServer();
    intervalId = setInterval(pingServer, 10000); // every 10s
    return () => clearInterval(intervalId);
  }, []);

  return (
    <>
      {!isConnected ? (
        <ConnectionLost />
      ) : (
        <>
          {/* Hide navbar on login and forgot password pages */}
          {!(isLoginPage || isForgotPasswordPage) && <CustomNavbar />}
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route element={<PrivateRoute />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/patients" element={<PatientsPage />} />
              <Route path="/nurse" element={<NursesPage />} />
              <Route path="/approval" element={<ApprovalPage />} />
              <Route path="/attendance" element={<AttendancePage />} />
              <Route path="/admin-management" element={<AdminManagement />} />
              <Route path="/appointment-slots" element={<AppointmentSlotTrackerPage />} />
            </Route>
            <Route path="*" element={<Navigate to="/login" />} />
          </Routes>
        </>
      )}
    </>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppContent />
      </Router>
    </AuthProvider>
  );
}

export default App;