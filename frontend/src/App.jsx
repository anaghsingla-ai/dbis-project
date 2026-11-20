import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';

// Layouts
import DashboardLayout from './layouts/DashboardLayout';
import PublicLayout from './layouts/PublicLayout';

// Public Pages
import LandingPage from './pages/public/LandingPage';
import LoginPage from './pages/public/LoginPage';
import UnauthorizedPage from './pages/public/UnauthorizedPage';
import NotFoundPage from './pages/public/NotFoundPage';

// Admin Pages
import AdminOverview from './pages/admin/AdminOverview';
import StudentManagement from './pages/admin/StudentManagement';
import CompanyManagement from './pages/admin/CompanyManagement';
import DriveManagement from './pages/admin/DriveManagement';
import ApplicationManagement from './pages/admin/ApplicationManagement';
import OfferManagement from './pages/admin/OfferManagement';
import PlacementReports from './pages/admin/PlacementReports';
import AuditLogsPage from './pages/admin/AuditLogsPage';

// Student Pages
import StudentOverview from './pages/student/StudentOverview';
import BrowseDrives from './pages/student/BrowseDrives';
import MyApplications from './pages/student/MyApplications';
import StudentRounds from './pages/student/StudentRounds';
import MyOffers from './pages/student/MyOffers';
import StudentProfile from './pages/student/StudentProfile';

// HR Pages
import HrOverview from './pages/hr/HrOverview';
import HrDrives from './pages/hr/HrDrives';
import HrApplicants from './pages/hr/HrApplicants';

// Coordinator Pages
import CoordinatorOverview from './pages/coordinator/CoordinatorOverview';
import CoordinatorStudents from './pages/coordinator/CoordinatorStudents';
import CoordinatorAudit from './pages/coordinator/CoordinatorAudit';

function ProtectedRoute({ children, allowedRoles }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-sm text-slate-400">Verifying session...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <Routes>
            {/* Public Landing & Login */}
            <Route path="/" element={<PublicLayout />}>
              <Route index element={<LandingPage />} />
              <Route path="login" element={<LoginPage />} />
              <Route path="unauthorized" element={<UnauthorizedPage />} />
            </Route>

            {/* Admin Portal */}
            <Route
              path="/admin"
              element={
                <ProtectedRoute allowedRoles={['TPO_ADMIN']}>
                  <DashboardLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<AdminOverview />} />
              <Route path="students" element={<StudentManagement />} />
              <Route path="companies" element={<CompanyManagement />} />
              <Route path="drives" element={<DriveManagement />} />
              <Route path="applications" element={<ApplicationManagement />} />
              <Route path="offers" element={<OfferManagement />} />
              <Route path="reports" element={<PlacementReports />} />
              <Route path="audit-logs" element={<AuditLogsPage />} />
            </Route>

            {/* Student Portal */}
            <Route
              path="/student"
              element={
                <ProtectedRoute allowedRoles={['STUDENT']}>
                  <DashboardLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<StudentOverview />} />
              <Route path="drives" element={<BrowseDrives />} />
              <Route path="applications" element={<MyApplications />} />
              <Route path="rounds" element={<StudentRounds />} />
              <Route path="offers" element={<MyOffers />} />
              <Route path="profile" element={<StudentProfile />} />
            </Route>

            {/* Company HR Portal */}
            <Route
              path="/hr"
              element={
                <ProtectedRoute allowedRoles={['COMPANY_HR']}>
                  <DashboardLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<HrOverview />} />
              <Route path="drives" element={<HrDrives />} />
              <Route path="applicants" element={<HrApplicants />} />
            </Route>

            {/* Department Coordinator Portal */}
            <Route
              path="/coordinator"
              element={
                <ProtectedRoute allowedRoles={['DEPARTMENT_COORDINATOR']}>
                  <DashboardLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<CoordinatorOverview />} />
              <Route path="students" element={<CoordinatorStudents />} />
              <Route path="audit" element={<CoordinatorAudit />} />
            </Route>

            {/* 404 Catch All */}
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}
