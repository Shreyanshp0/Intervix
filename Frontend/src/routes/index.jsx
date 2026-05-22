import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import DashboardLayout from '../components/layout/DashboardLayout';
import LandingPage from '../pages/LandingPage';
import Login from '../pages/auth/Login';
import Register from '../pages/auth/Register';
import CandidateDashboard from '../pages/dashboard/CandidateDashboard';
import RecruiterDashboard from '../pages/dashboard/RecruiterDashboard';
import AnalyticsPage from '../pages/reports/AnalyticsPage';
import InterviewSetup from '../pages/interviews/InterviewSetup';
import AITextInterview from '../pages/interviews/AITextInterview';
import AIVoiceInterview from '../pages/interviews/AIVoiceInterview';
import LiveVideoInterview from '../pages/interviews/LiveVideoInterview';
import CodingInterview from '../pages/interviews/CodingInterview';
import InterviewReportPage from '../pages/reports/InterviewReportPage';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { isAuthenticated, user } = useAuthStore();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user?.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

const AppRoutes = () => (
  <Routes>
    <Route path="/" element={<LandingPage />} />
    <Route path="/login" element={<Login />} />
    <Route path="/register" element={<Register />} />

    <Route element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
      <Route path="/dashboard" element={<CandidateDashboard />} />
      <Route path="/recruiter" element={<ProtectedRoute allowedRoles={['recruiter', 'admin']}><RecruiterDashboard /></ProtectedRoute>} />
      <Route path="/analytics" element={<AnalyticsPage />} />
      <Route path="/interview/report/:sessionId" element={<InterviewReportPage />} />
    </Route>

    <Route path="/interview/setup" element={<ProtectedRoute><InterviewSetup /></ProtectedRoute>} />
    <Route path="/interview/text" element={<ProtectedRoute><AITextInterview /></ProtectedRoute>} />
    <Route path="/interview/voice" element={<ProtectedRoute><AIVoiceInterview /></ProtectedRoute>} />
    <Route path="/interview/video" element={<ProtectedRoute><LiveVideoInterview /></ProtectedRoute>} />
    <Route path="/interview/coding" element={<ProtectedRoute><CodingInterview /></ProtectedRoute>} />

    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>
);

export default AppRoutes;
