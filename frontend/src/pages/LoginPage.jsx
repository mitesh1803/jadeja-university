import { useState } from 'react';
import { apiFetch } from '../api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

const DEMO_ACCOUNTS = [
  { label: 'Student · Amara',     email: 'student1@university.edu', password: 'student123' },
  { label: 'Faculty · Dr. Cross', email: 'faculty1@university.edu', password: 'faculty123' },
  { label: 'Admin · Priya',       email: 'admin@university.edu',    password: 'admin123'  },
];

export default function LoginPage() {
  const { login } = useAuth();
  const showToast = useToast();
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await apiFetch('/auth/login', {
        method: 'POST',
        body: { email, password },
      });
      login(data.token, data.user);
      showToast(`Welcome back, ${data.user.name}!`);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function fillDemo(acc) {
    setEmail(acc.email);
    setPassword(acc.password);
    setError('');
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo-wrap">
          <div className="login-logo">J</div>
        </div>
        <h1 className="login-title">Jadeja University</h1>
        <p className="login-subtitle">Smart Portal — sign in to continue</p>

        <form className="login-form" onSubmit={handleSubmit} id="login-form">
          <div className="form-field">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@university.edu"
              required
              autoComplete="username"
            />
          </div>

          <div className="form-field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              autoComplete="current-password"
            />
          </div>

          <p className="login-error" role="alert">{error}</p>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
            id="login-submit"
          >
            {loading ? 'Signing in…' : 'Sign in →'}
          </button>
        </form>

        <div className="demo-accounts">
          <p className="demo-label">Quick access — demo accounts</p>
          <div className="demo-chips">
            {DEMO_ACCOUNTS.map((acc) => (
              <button
                key={acc.email}
                type="button"
                className="demo-chip"
                onClick={() => fillDemo(acc)}
                id={`demo-${acc.email.split('@')[0]}`}
              >
                {acc.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
