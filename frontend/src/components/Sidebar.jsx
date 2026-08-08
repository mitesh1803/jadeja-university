import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const NAV_ITEMS = [
  { id: 'courses',     label: 'Courses',     icon: '📚', eyebrow: 'Catalog' },
  { id: 'attendance',  label: 'Attendance',  icon: '📅', eyebrow: 'Roll Call' },
  { id: 'assignments', label: 'Assignments', icon: '📝', eyebrow: 'Coursework' },
  { id: 'results',     label: 'Results',     icon: '🏆', eyebrow: 'Transcript' },
  { id: 'users',       label: 'Users',       icon: '👥', eyebrow: 'Administration', adminOnly: true },
];

export function Sidebar({ activeView, onNavigate }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const initials = user?.name
    ?.split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() ?? '?';

  function handleSignOut() {
    logout();
    navigate('/signin', { replace: true });
  }

  return (
    <aside className="sidebar">
      {/* Brand */}
      <div className="sidebar-brand">
        <div className="sidebar-logo">J</div>
        <span className="sidebar-brand-name">Jadeja Uni</span>
      </div>

      {/* Nav */}
      <nav className="sidebar-nav">
        {NAV_ITEMS.map((item) => {
          if (item.adminOnly && user?.role !== 'admin') return null;
          return (
            <div
              key={item.id}
              className={`nav-item ${activeView === item.id ? 'active' : ''}`}
              onClick={() => onNavigate(item.id)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && onNavigate(item.id)}
              id={`nav-${item.id}`}
            >
              <span className="nav-icon">{item.icon}</span>
              <span>{item.label}</span>
            </div>
          );
        })}
      </nav>

      {/* User Footer */}
      <div className="sidebar-footer">
        <div className="user-info">
          <div className="user-avatar">{initials}</div>
          <div>
            <div className="user-name">{user?.name}</div>
            <div className="user-role">{user?.role}</div>
          </div>
        </div>
        <button className="logout-btn" onClick={handleSignOut} id="logout-btn">
          ↩ Sign out
        </button>
      </div>
    </aside>
  );
}

export { NAV_ITEMS };
