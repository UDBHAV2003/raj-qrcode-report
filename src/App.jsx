import { useEffect } from 'react';
import { initKeyboardNavigation } from './utils/keyboardNavigation';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { PatientProvider } from './context/PatientContext'
import ProtectedRoute from './components/ProtectedRoute'
import { useTheme } from './hooks/useTheme'

import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import PatientEntry from './pages/PatientEntry'
import TestResults from './pages/TestResults'
import Report from './pages/Report'
// Public report page opened by scanning the QR code on a printed report —
// deliberately NOT wrapped in ProtectedRoute, since the patient/relative
// scanning it won't be logged in.
import Reportview from './components/Reportview'

export default function App() {
  useTheme(); // applies the persisted light/dark theme to <html> on load

  useEffect(() => {
    initKeyboardNavigation();
  }, []);

  return (
    <AuthProvider>
      <PatientProvider>
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/patients/new"
              element={
                <ProtectedRoute>
                  <PatientEntry />
                </ProtectedRoute>
              }
            />
            <Route
              path="/patients/:id/results"
              element={
                <ProtectedRoute>
                  <TestResults />
                </ProtectedRoute>
              }
            />
            <Route
              path="/patients/:id/report"
              element={
                <ProtectedRoute>
                  <Report />
                </ProtectedRoute>
              }
            />
            {/* Public — opened when someone scans the QR code on a report */}
            <Route path="/report/:id" element={<Reportview />} />
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </BrowserRouter>
      </PatientProvider>
    </AuthProvider>
  );
}