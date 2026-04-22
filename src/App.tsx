import * as React from 'react';
import { Component, ErrorInfo, ReactNode } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Zap } from 'lucide-react';
import { Dashboard } from './pages/Dashboard';
import { Students } from './pages/Students';
import { Fees } from './pages/Fees';
import { Attendance } from './pages/Attendance';
import { Batches } from './pages/Batches';
import { OfflineExams } from './pages/OfflineExams';
import { Messages } from './pages/Messages';
import { Settings } from './pages/Settings';
import { Institution } from './pages/Institution';
import { Teachers } from './pages/Teachers';
import { Marketing } from './pages/Marketing';
import { SuperAdminDashboard } from './pages/super-admin/SuperAdminDashboard';
import { ManageInstitutions } from './pages/super-admin/ManageInstitutions';
import { SuperNotifications } from './pages/super-admin/SuperNotifications';
import { SupportInbox } from './pages/super-admin/SupportInbox';
import { ManageFaqs } from './pages/super-admin/ManageFaqs';
import { ManageStaff } from './pages/super-admin/ManageStaff';
import { RevenueAnalytics } from './pages/super-admin/RevenueAnalytics';
import { SystemHealth } from './pages/super-admin/SystemHealth';
import { SupportChat } from './pages/SupportChat';
import { Help } from './pages/Help';
import { InstitutionProfile } from './pages/public/InstitutionProfile';
import { AdmissionForm } from './pages/public/AdmissionForm';
import { JobCircular } from './pages/public/JobCircular';
import { PublicAttendance } from './pages/public/PublicAttendance';
import { PublicExamResult } from './pages/public/PublicExamResult';
import { Login } from './pages/Login';
import { Signup } from './pages/Signup';
import { Landing } from './pages/Landing';
import { AuthProvider, useAuth } from './lib/auth';
import { ThemeProvider } from './lib/theme';
import { ErrorBoundary } from './components/ErrorBoundary';

function ScrollToTop() {
  const { pathname } = useLocation();
  React.useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

function AuthenticatedLayout() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" />;
  }

  return <Layout />;
}

function AppRoutes() {
  const { user, loading } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" /> : <Login />} />
      <Route path="/signup" element={user ? <Navigate to="/" /> : <Signup />} />
      
      {/* Public Routes */}
      <Route path="/i/:slug" element={<InstitutionProfile />} />
      <Route path="/public/institution/:id" element={<InstitutionProfile />} />
      <Route path="/public/admission/:id" element={<AdmissionForm />} />
      <Route path="/public/circular/:id" element={<JobCircular />} />
      <Route path="/public/attendance/:batchId/:token" element={<PublicAttendance />} />
      <Route path="/public/exam-result/:examId" element={<PublicExamResult />} />

      {/* Persistent Authenticated Layout */}
      <Route element={<AuthenticatedLayout />}>
        <Route path="/" element={user?.isSuperAdmin ? <SuperAdminDashboard /> : <Dashboard />} />
        <Route path="/students" element={<Students />} />
        <Route path="/batches" element={<Batches />} />
        <Route path="/fees" element={<Fees />} />
        <Route path="/attendance" element={<Attendance />} />
        <Route path="/offline-exams" element={<OfflineExams />} />
        <Route path="/messages" element={<Messages />} />
        <Route path="/institution" element={<Institution />} />
        <Route path="/teachers" element={<Teachers />} />
        <Route path="/marketing" element={<Marketing />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/help" element={<Help />} />
        <Route path="/support" element={<SupportChat />} />

        {/* Super Admin Restricted Routes */}
        <Route path="/super-admin" element={<SuperAdminDashboard />} />
        <Route path="/super-admin/institutions" element={<ManageInstitutions />} />
        <Route path="/super-admin/notifications" element={<SuperNotifications />} />
        <Route path="/super-admin/support" element={<SupportInbox />} />
        <Route path="/super-admin/faqs" element={<ManageFaqs />} />
        <Route path="/super-admin/staff" element={<ManageStaff />} />
        <Route path="/super-admin/analytics" element={<RevenueAnalytics />} />
        <Route path="/super-admin/health" element={<SystemHealth />} />
      </Route>

      {/* Fallback for Landing */}
      <Route path="*" element={!loading && !user ? <Landing /> : <Navigate to="/" />} />
    </Routes>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AuthProvider>
          <Router>
            <ScrollToTop />
            <AppRoutes />
          </Router>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
