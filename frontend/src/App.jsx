import { useState, useEffect, useCallback } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { Sidebar, NAV_ITEMS } from './components/Sidebar';
import LoginPage      from './pages/LoginPage';
import CoursesPage    from './pages/CoursesPage';
import AttendancePage from './pages/AttendancePage';
import AssignmentsPage from './pages/AssignmentsPage';
import ResultsPage    from './pages/ResultsPage';
import UsersPage      from './pages/UsersPage';
import { apiFetch }   from './api';

function AppShell() {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) return <LoginPage />;
  return <AuthenticatedApp />;
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

  const meta = NAV_ITEMS.find((n) => n.id === view);

  return (
    <div className="app-layout">
      <Sidebar activeView={view} onNavigate={setView} />

      <main className="main-content">
        {view === 'courses' && (
          <CoursesPage
            key="courses"
            onNavigateToCourse={(courseId) => {
              // Re-fetch and navigate to assignments pre-selecting this course
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
        {view === 'users' && (
          <UsersPage key="users" />
        )}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <AppShell />
      </ToastProvider>
    </AuthProvider>
  );
}
