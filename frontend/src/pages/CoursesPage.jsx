import { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '../api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Spinner, EmptyState, Modal, FormField } from '../components/UI';

export default function CoursesPage({ onNavigateToCourse }) {
  const { user } = useAuth();
  const showToast = useToast();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ code: '', title: '', description: '' });
  const [saving, setSaving] = useState(false);

  const isFacultyOrAdmin = ['faculty', 'admin'].includes(user?.role);

  const loadCourses = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch('/courses');
      setCourses(data.courses);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => { loadCourses(); }, [loadCourses]);

  async function handleEnroll(courseId, code, e) {
    e.stopPropagation();
    try {
      await apiFetch(`/courses/${courseId}/enroll`, { method: 'POST', body: {} });
      showToast(`Enrolled in ${code}!`);
      loadCourses();
    } catch (err) {
      showToast(err.message, 'error');
    }
  }

  async function handleCreate(e) {
    e.preventDefault();
    if (!form.code || !form.title) { showToast('Code and title are required.', 'error'); return; }
    setSaving(true);
    try {
      await apiFetch('/courses', { method: 'POST', body: form });
      showToast(`Course ${form.code} created!`);
      setShowModal(false);
      setForm({ code: '', title: '', description: '' });
      loadCourses();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <Spinner />;

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div className="page-header-row">
          <div>
            <p className="page-eyebrow">Catalog</p>
            <h1 className="page-title">Courses</h1>
          </div>
          {isFacultyOrAdmin && (
            <div className="page-actions">
              <button
                className="btn btn-primary"
                onClick={() => setShowModal(true)}
                id="new-course-btn"
              >
                + New Course
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="page-body">
        {courses.length === 0 ? (
          <EmptyState
            icon="📚"
            title="No courses yet"
            message={isFacultyOrAdmin ? 'Create your first course to get started.' : 'No courses are available right now.'}
          />
        ) : (
          <div className="course-card-grid">
            {courses.map((c) => (
              <div
                key={c.id}
                className="course-card"
                id={`course-${c.id}`}
                onClick={() => onNavigateToCourse && onNavigateToCourse(c.id)}
              >
                <div className="course-card-header">
                  <span className="course-code">{c.code}</span>
                  {user?.role === 'student' ? (
                    <span className={`badge ${c.isEnrolled ? 'badge-green' : 'badge-gray'}`}>
                      {c.isEnrolled ? '✓ Enrolled' : 'Open'}
                    </span>
                  ) : (
                    <span className="badge badge-purple">{c.enrolledCount} enrolled</span>
                  )}
                </div>
                <div className="course-title">{c.title}</div>
                <div className="course-faculty">{c.facultyName}</div>
                {c.description && <div className="course-desc">{c.description}</div>}
                {user?.role === 'student' && !c.isEnrolled && (
                  <button
                    className="btn btn-primary btn-sm"
                    style={{ marginTop: '4px', alignSelf: 'flex-start' }}
                    onClick={(e) => handleEnroll(c.id, c.code, e)}
                    id={`enroll-${c.id}`}
                  >
                    Enroll
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* New Course Modal */}
      {showModal && (
        <Modal title="New Course" onClose={() => setShowModal(false)}>
          <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <FormField label="Course Code">
              <input
                id="f-code"
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value })}
                placeholder="e.g. CS401"
              />
            </FormField>
            <FormField label="Title">
              <input
                id="f-title"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="e.g. Operating Systems"
              />
            </FormField>
            <FormField label="Description">
              <textarea
                id="f-desc"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="What this course covers…"
              />
            </FormField>
            <button type="submit" className="btn btn-primary" disabled={saving} id="f-submit">
              {saving ? 'Creating…' : 'Create Course'}
            </button>
          </form>
        </Modal>
      )}
    </div>
  );
}
