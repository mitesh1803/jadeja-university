import { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '../api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Spinner, EmptyState, Modal, FormField } from '../components/UI';

export default function UsersPage() {
  const { user } = useAuth();
  const showToast = useToast();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'student',
  });

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch('/users');
      setUsers(data.users);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  async function handleCreate(e) {
    e.preventDefault();
    if (!form.name || !form.email || !form.password || !form.role) {
      showToast('All fields are required.', 'error');
      return;
    }
    setSaving(true);
    try {
      await apiFetch('/users', { method: 'POST', body: form });
      showToast(`User ${form.name} created successfully!`);
      setShowModal(false);
      setForm({ name: '', email: '', password: '', role: 'student' });
      loadUsers();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  }

  if (user?.role !== 'admin') {
    return (
      <div>
        <div className="page-header">
          <p className="page-eyebrow">Administration</p>
          <h1 className="page-title">Users</h1>
        </div>
        <div className="page-body">
          <EmptyState icon="🔒" title="Access Denied" message="Only administrators can manage users." />
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <div className="page-header-row">
          <div>
            <p className="page-eyebrow">Administration</p>
            <h1 className="page-title">Users</h1>
          </div>
          <div className="page-actions">
            <button
              className="btn btn-primary"
              onClick={() => setShowModal(true)}
              id="new-user-btn"
            >
              + Add Student / Teacher
            </button>
          </div>
        </div>
      </div>

      <div className="page-body">
        {loading ? (
          <Spinner />
        ) : users.length === 0 ? (
          <EmptyState icon="👥" title="No users found" message="Add a student or teacher to get started." />
        ) : (
          <div className="card">
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id}>
                      <td style={{ fontWeight: 500 }}>{u.name}</td>
                      <td>{u.email}</td>
                      <td>
                        <span className={`badge ${
                          u.role === 'admin' ? 'badge-red' :
                          u.role === 'faculty' ? 'badge-yellow' : 'badge-green'
                        }`}>
                          {u.role}
                        </span>
                      </td>
                      <td style={{ color: 'var(--text-muted)' }}>
                        {new Date(u.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {showModal && (
        <Modal title="Add Student or Teacher" onClose={() => setShowModal(false)}>
          <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <FormField label="Full Name">
              <input
                id="f-name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. John Doe"
                required
              />
            </FormField>
            <FormField label="Email">
              <input
                id="f-email"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="e.g. john@university.edu"
                required
              />
            </FormField>
            <FormField label="Password">
              <input
                id="f-password"
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="At least 6 characters"
                minLength={6}
                required
              />
            </FormField>
            <FormField label="Role">
              <select
                id="f-role"
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
              >
                <option value="student">Student</option>
                <option value="faculty">Teacher (Faculty)</option>
              </select>
            </FormField>
            <button type="submit" className="btn btn-primary" disabled={saving} id="f-submit">
              {saving ? 'Creating…' : 'Create Account'}
            </button>
          </form>
        </Modal>
      )}
    </div>
  );
}
