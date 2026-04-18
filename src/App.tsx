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

function ComingSoon() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8">
      <div className="w-20 h-20 bg-indigo-100 dark:bg-indigo-900/40 rounded-3xl flex items-center justify-center mb-6">
        <Zap className="w-10 h-10 text-indigo-600 dark:text-indigo-400 animate-pulse" />
      </div>
      <h2 className="text-3xl font-black text-gray-900 dark:text-white mb-2 tracking-tight">Coming Soon</h2>
      <p className="text-gray-500 dark:text-gray-400 max-w-md">
        We're working hard to bring you this feature. Stay tuned for updates!
      </p>
    </div>
  );
}

function ScrollToTop() {
  const { pathname } = useLocation();
  React.useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

function PrivateRoute({ children }: { children: React.ReactNode }) {
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

  return <Layout>{children}</Layout>;
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

      {/* Super Admin Routes */}
      <Route path="/super-admin" element={<PrivateRoute><SuperAdminDashboard /></PrivateRoute>} />
      <Route path="/super-admin/institutions" element={<PrivateRoute><ManageInstitutions /></PrivateRoute>} />
      <Route path="/super-admin/notifications" element={<PrivateRoute><SuperNotifications /></PrivateRoute>} />
      <Route path="/super-admin/support" element={<PrivateRoute><SupportInbox /></PrivateRoute>} />
      <Route path="/super-admin/faqs" element={<PrivateRoute><ManageFaqs /></PrivateRoute>} />
      <Route path="/super-admin/staff" element={<PrivateRoute><ManageStaff /></PrivateRoute>} />
      <Route path="/super-admin/analytics" element={<PrivateRoute><RevenueAnalytics /></PrivateRoute>} />
      <Route path="/super-admin/health" element={<PrivateRoute><SystemHealth /></PrivateRoute>} />

      {/* Private Routes */}
      <Route path="/" element={
        loading ? (
          <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : user ? (
          <Layout>{user.isSuperAdmin ? <SuperAdminDashboard /> : <Dashboard />}</Layout>
        ) : (
          <Landing />
        )
      } />
      <Route path="/students" element={<PrivateRoute><Students /></PrivateRoute>} />
      <Route path="/batches" element={<PrivateRoute><Batches /></PrivateRoute>} />
      <Route path="/fees" element={<PrivateRoute><Fees /></PrivateRoute>} />
      <Route path="/attendance" element={<PrivateRoute><Attendance /></PrivateRoute>} />
      <Route path="/offline-exams" element={<PrivateRoute><OfflineExams /></PrivateRoute>} />
      <Route path="/messages" element={<PrivateRoute><Messages /></PrivateRoute>} />
      <Route path="/institution" element={<PrivateRoute><Institution /></PrivateRoute>} />
      <Route path="/teachers" element={<PrivateRoute><Teachers /></PrivateRoute>} />
      <Route path="/marketing" element={<PrivateRoute><Marketing /></PrivateRoute>} />
      <Route path="/settings" element={<PrivateRoute><Settings /></PrivateRoute>} />
      <Route path="/help" element={<PrivateRoute><Help /></PrivateRoute>} />
      <Route path="/support" element={<PrivateRoute><SupportChat /></PrivateRoute>} />
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
