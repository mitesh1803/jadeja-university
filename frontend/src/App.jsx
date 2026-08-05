import { useState, useEffect, useCallback } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { Sidebar } from './components/Sidebar';
import LoginPage       from './pages/LoginPage';
import CoursesPage     from './pages/CoursesPage';
import AttendancePage  from './pages/AttendancePage';
import AssignmentsPage from './pages/AssignmentsPage';
import ResultsPage     from './pages/ResultsPage';
import UsersPage       from './pages/UsersPage';
import { apiFetch }    from './api';

function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Navigate to="/signin" replace />;
  return children;
}

function AuthenticatedApp() {
  const { user } = useAuth();
  const [view, setView]       = useState('courses');
  const [courses, setCourses] = useState([]);

  const loadCourses = useCallback(async () => {
    try {
      const data = await apiFetch('/courses');
      setCourses(data.courses);
    } catch {
      // silently fail — individual pages will show errors
    }
  }, []);

  useEffect(() => { loadCourses(); }, [loadCourses]);

  return (
    <div className="app-layout">
      <Sidebar activeView={view} onNavigate={setView} />

      <main className="main-content">
        {view === 'courses' && (
          <CoursesPage
            key="courses"
            onNavigateToCourse={() => {
              loadCourses();
              setView('assignments');
            }}
          />
        )}
        {view === 'attendance' && (
          <AttendancePage key="attendance" courses={courses} />
        )}
        {view === 'assignments' && (
          <AssignmentsPage key="assignments" courses={courses} />
        )}
        {view === 'results' && (
          <ResultsPage key="results" courses={courses} />
        )}
        {view === 'users' && user?.role === 'admin' && (
          <UsersPage key="users" />
        )}
      </main>
    </div>
  );
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/signin" element={<LoginPage />} />
      <Route path="/login" element={<Navigate to="/signin" replace />} />
      <Route path="/signup" element={<Navigate to="/signin" replace />} />
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <AuthenticatedApp />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <AppRoutes />
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
