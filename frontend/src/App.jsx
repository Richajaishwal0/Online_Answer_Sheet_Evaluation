import { Navigate, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import FacultyLayout from './components/FacultyLayout';
import StudentLayout from './components/StudentLayout';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import FacultyLoginPage from './pages/FacultyLoginPage';
import DashboardPage from './pages/DashboardPage';
import FacultyDashboardPage from './pages/FacultyDashboardPage';
import ExamsPage from './pages/ExamsPage';
import ImportPage from './pages/ImportPage';
import UnlockPage from './pages/UnlockPage';
import AuditLogsPage from './pages/AuditLogsPage';
import ReportsPage from './pages/ReportsPage';
import FacultyAssignmentsPage from './pages/FacultyAssignmentsPage';
import FacultyEvaluationPage from './pages/FacultyEvaluationPage';
import TeachersPage from './pages/TeachersPage';
import StudentLoginPage from './pages/StudentLoginPage';
import StudentDashboardPage from './pages/StudentDashboardPage';
import StudentReportPage from './pages/StudentReportPage';
import StudentPasswordPage from './pages/StudentPasswordPage';

function ProtectedRoute({ children }) {
  const token = localStorage.getItem('adminToken');
  return token ? children : <Navigate to="/login" replace />;
}

function FacultyProtectedRoute({ children }) {
  const token = localStorage.getItem('facultyToken');
  return token ? children : <Navigate to="/faculty/login" replace />;
}

function StudentProtectedRoute({ children }) {
  const token = localStorage.getItem('studentToken');
  return token ? children : <Navigate to="/student/login" replace />;
}

function App() {
  return (
    <Routes>
      {/* Public Landing Page */}
      <Route path="/" element={<LandingPage />} />

      {/* Authentication Portals */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/faculty/login" element={<FacultyLoginPage />} />
      <Route path="/student/login" element={<StudentLoginPage />} />


      {/* Examination Cell Admin Portal */}
      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/admin" element={<Navigate to="/dashboard" replace />} />
        <Route path="/exams" element={<ExamsPage />} />
        <Route path="/import" element={<ImportPage />} />
        <Route path="/teachers" element={<TeachersPage />} />
        <Route path="/unlock" element={<UnlockPage />} />
        <Route path="/audit-logs" element={<AuditLogsPage />} />
        <Route path="/reports" element={<ReportsPage />} />
      </Route>

      {/* Faculty Evaluator Portal */}
      <Route
        path="/faculty"
        element={
          <FacultyProtectedRoute>
            <FacultyLayout />
          </FacultyProtectedRoute>
        }
      >
        <Route index element={<FacultyDashboardPage />} />
        <Route path="dashboard" element={<FacultyDashboardPage />} />
        <Route path="assignments" element={<FacultyAssignmentsPage />} />
        <Route path="evaluate/:sheetId" element={<FacultyEvaluationPage />} />
      </Route>

      {/* Student Portal */}
      <Route
        path="/student"
        element={
          <StudentProtectedRoute>
            <StudentLayout />
          </StudentProtectedRoute>
        }
      >
        <Route index element={<StudentDashboardPage />} />
        <Route path="dashboard" element={<StudentDashboardPage />} />
        <Route path="report/:sheetId" element={<StudentReportPage />} />
        <Route path="password" element={<StudentPasswordPage />} />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;


