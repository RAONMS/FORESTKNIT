import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { isSupabaseConfigured, supabaseConfigError } from './lib/supabase';

// Layout & Pages
import MainLayout from './components/MainLayout';
import LoginPage from './pages/LoginPage';
import Dashboard from './pages/Dashboard';
import Students from './pages/Students';
import Classes from './pages/Classes';
import Schedule from './pages/Schedule';
import AttendanceKiosk from './pages/AttendanceKiosk';

const ProtectedRoute = ({ children }) => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return children;
};

const LoginRoute = () => {
  const { user } = useAuth();
  return user ? <Navigate to="/" replace /> : <LoginPage />;
};

const ConfigErrorScreen = () => (
  <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: '24px' }}>
    <div className="card" style={{ maxWidth: '680px', width: '100%' }}>
      <h1 style={{ fontSize: '1.6rem', marginBottom: '12px' }}>Deployment Configuration Required</h1>
      <p className="muted" style={{ marginBottom: '14px' }}>
        This build is missing Supabase environment variables, so the app cannot initialize.
      </p>
      <p style={{ fontFamily: 'monospace', fontSize: '0.9rem', background: 'rgba(24,33,29,0.04)', padding: '10px 12px', borderRadius: '12px' }}>
        {supabaseConfigError}
      </p>
      <p className="muted" style={{ marginTop: '14px' }}>
        Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in Cloudflare Pages Environment Variables, then redeploy.
      </p>
    </div>
  </div>
);

function App() {
  if (!isSupabaseConfigured) {
    return <ConfigErrorScreen />;
  }

  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public Login */}
          <Route path="/login" element={<LoginRoute />} />

          {/* Attendance Kiosk (Public access, hides menu) */}
          <Route path="/attendance" element={<AttendanceKiosk />} />

          {/* Protected Routes */}
          <Route path="/" element={
            <ProtectedRoute>
              <MainLayout />
            </ProtectedRoute>
          }>
            <Route index element={<Dashboard />} />
            <Route path="students" element={<Students />} />
            <Route path="schedule" element={<Schedule />} />
            <Route path="classes" element={<Classes />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
