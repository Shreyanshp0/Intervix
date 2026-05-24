import { Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { getPortalHome, useAuthStore } from '../store/useAuthStore';
import LandingPage from '../pages/LandingPage';
import Login from '../pages/auth/Login';
import Register from '../pages/auth/Register';
import CandidateDashboard from '../pages/dashboard/CandidateDashboard';
import RecruiterDashboard from '../pages/dashboard/RecruiterDashboard';
import CandidateProfilePage from '../pages/candidate/CandidateProfilePage';
import CompanyProfilePage from '../pages/recruiter/CompanyProfilePage';
import CandidatePortalLayout from '../components/layout/CandidatePortalLayout';
import RecruiterPortalLayout from '../components/layout/RecruiterPortalLayout';
import InterviewSetup from '../pages/interviews/InterviewSetup';
import AITextInterview from '../pages/interviews/AITextInterview';
import AIVoiceInterview from '../pages/interviews/AIVoiceInterview';
import LiveVideoInterview from '../pages/interviews/LiveVideoInterview';
import CodingInterview from '../pages/interviews/CodingInterview';
import InterviewReportPage from '../pages/reports/InterviewReportPage';

const FullPageLoader = () => (
  <div className="min-h-screen bg-background flex items-center justify-center">
    <div className="glass-card px-6 py-4 text-sm text-gray-300">Loading workspace...</div>
  </div>
);

const PublicOnlyRoute = () => {
  const { isAuthenticated, user, isBootstrapping } = useAuthStore();

  if (isBootstrapping) {
    return <FullPageLoader />;
  }

  if (isAuthenticated && !user) {
    return <FullPageLoader />;
  }

  if (isAuthenticated && user) {
    return <Navigate to={getPortalHome(user)} replace />;
  }

  return <Outlet />;
};

const RoleProtectedRoute = ({ allowedRoles }) => {
  const { isAuthenticated, user, isBootstrapping } = useAuthStore();

  if (isBootstrapping) {
    return <FullPageLoader />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!user) {
    return <FullPageLoader />;
  }

  if (!allowedRoles.includes(user.role)) {
    return <Navigate to={getPortalHome(user)} replace />;
  }

  return <Outlet />;
};

const PortalIndexRedirect = ({ role }) => {
  const { user } = useAuthStore();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (role === 'recruiter') {
    return <Navigate to={user.onboardingCompleted ? '/recruiter/dashboard' : '/recruiter/company'} replace />;
  }

  return <Navigate to={user.onboardingCompleted ? '/candidate/dashboard' : '/candidate/profile'} replace />;
};

const AppRoutes = () => (
  <Routes>
    <Route path="/" element={<LandingPage />} />

    <Route element={<PublicOnlyRoute />}>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
    </Route>

    <Route element={<RoleProtectedRoute allowedRoles={['candidate', 'admin']} />}>
      <Route path="/candidate" element={<CandidatePortalLayout />}>
        <Route index element={<PortalIndexRedirect role="candidate" />} />
        <Route path="dashboard" element={<CandidateDashboard />} />
        <Route path="profile" element={<CandidateProfilePage />} />
        <Route path="interview/setup" element={<InterviewSetup />} />
        <Route path="interview/text" element={<AITextInterview />} />
        <Route path="interview/voice" element={<AIVoiceInterview />} />
        <Route path="interview/video" element={<LiveVideoInterview />} />
        <Route path="interview/coding" element={<CodingInterview />} />
        <Route path="interview/report/:sessionId" element={<InterviewReportPage />} />
      </Route>
    </Route>

    <Route element={<RoleProtectedRoute allowedRoles={['recruiter', 'admin']} />}>
      <Route path="/recruiter" element={<RecruiterPortalLayout />}>
        <Route index element={<PortalIndexRedirect role="recruiter" />} />
        <Route path="dashboard" element={<RecruiterDashboard />} />
        <Route path="company" element={<CompanyProfilePage />} />
      </Route>
    </Route>

    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>
);

export default AppRoutes;
