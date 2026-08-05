import { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '../api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Spinner, EmptyState, Modal, FormField } from '../components/UI';

const GRADE_OPTIONS = ['A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'D', 'F'];

export default function AssignmentsPage({ courses }) {
  const { user } = useAuth();
  const showToast = useToast();
  const isFacultyOrAdmin = ['faculty', 'admin'].includes(user?.role);

  const relevantCourses = user?.role === 'student'
    ? courses.filter((c) => c.isEnrolled)
    : courses;

  const [selectedCourseId, setSelectedCourseId] = useState(relevantCourses[0]?.id ?? '');
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(false);

  // Modals
  const [showNewAssignment, setShowNewAssignment]   = useState(false);
  const [showSubmissions, setShowSubmissions]        = useState(null); // assignment object
  const [newForm, setNewForm] = useState({ title: '', description: '', dueDate: '' });
  const [saving, setSaving] = useState(false);

  const loadAssignments = useCallback(async (courseId) => {
    if (!courseId) return;
    setLoading(true);
    try {
      const data = await apiFetch(`/assignments/course/${courseId}`);
      setAssignments(data.assignments);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    if (selectedCourseId) loadAssignments(selectedCourseId);
  }, [selectedCourseId, loadAssignments]);

  async function handleCreateAssignment(e) {
    e.preventDefault();
    if (!newForm.title || !newForm.dueDate) { showToast('Title and due date are required.', 'error'); return; }
    setSaving(true);
    try {
      await apiFetch(`/assignments/course/${selectedCourseId}`, { method: 'POST', body: newForm });
      showToast('Assignment created!');
      setShowNewAssignment(false);
      setNewForm({ title: '', description: '', dueDate: '' });
      loadAssignments(selectedCourseId);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  }

  if (relevantCourses.length === 0) {
    return (
      <div>
        <div className="page-header"><p className="page-eyebrow">Coursework</p><h1 className="page-title">Assignments</h1></div>
        <div className="page-body">
          <EmptyState icon="📝" title="No courses" message="Enroll in a course to see assignments." />
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <div className="page-header-row">
          <div>
            <p className="page-eyebrow">Coursework</p>
            <h1 className="page-title">Assignments</h1>
          </div>
          {isFacultyOrAdmin && (
            <div className="page-actions">
              <button className="btn btn-primary" onClick={() => setShowNewAssignment(true)} id="new-assignment-btn">
                + New Assignment
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="page-body">
        <div className="course-select-wrap">
          <FormField label="Course">
            <select
              id="course-select"
              value={selectedCourseId}
              onChange={(e) => setSelectedCourseId(e.target.value)}
            >
              {relevantCourses.map((c) => (
                <option key={c.id} value={c.id}>{c.code} — {c.title}</option>
              ))}
            </select>
          </FormField>
        </div>

        {loading ? <Spinner /> : assignments.length === 0 ? (
          <EmptyState icon="📄" title="No assignments yet" message="Nothing has been posted for this course." />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {assignments.map((a) => (
              user?.role === 'student'
                ? <StudentAssignmentCard key={a.id} assignment={a} courseId={selectedCourseId} onRefresh={() => loadAssignments(selectedCourseId)} />
                : <FacultyAssignmentCard key={a.id} assignment={a} onViewSubmissions={() => setShowSubmissions(a)} />
            ))}
          </div>
        )}
      </div>

      {/* New Assignment Modal */}
      {showNewAssignment && (
        <Modal title="New Assignment" onClose={() => setShowNewAssignment(false)}>
          <form onSubmit={handleCreateAssignment} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <FormField label="Title">
              <input id="f-title" value={newForm.title} onChange={(e) => setNewForm({ ...newForm, title: e.target.value })} placeholder="e.g. Midterm Essay" />
            </FormField>
            <FormField label="Description">
              <textarea id="f-desc" value={newForm.description} onChange={(e) => setNewForm({ ...newForm, description: e.target.value })} placeholder="Instructions for students…" />
            </FormField>
            <FormField label="Due Date">
              <input type="date" id="f-due" value={newForm.dueDate} onChange={(e) => setNewForm({ ...newForm, dueDate: e.target.value })} />
            </FormField>
            <button type="submit" className="btn btn-primary" disabled={saving} id="f-submit">
              {saving ? 'Creating…' : 'Create Assignment'}
            </button>
          </form>
        </Modal>
      )}

      {/* Submissions Modal */}
      {showSubmissions && (
        <SubmissionsModal
          assignment={showSubmissions}
          courseId={selectedCourseId}
          onClose={() => { setShowSubmissions(null); loadAssignments(selectedCourseId); }}
        />
      )}
    </div>
  );
}

function StudentAssignmentCard({ assignment: a, courseId, onRefresh }) {
  const showToast = useToast();
  const [content, setContent] = useState(a.mySubmission?.content ?? '');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    if (!content.trim()) { showToast('Write a submission before sending.', 'error'); return; }
    setSubmitting(true);
    try {
      await apiFetch(`/assignments/${a.id}/submit`, { method: 'POST', body: { content } });
      showToast('Submission sent!');
      onRefresh();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  }

  const sub = a.mySubmission;
  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 12 }}>
        <div>
          <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>{a.title}</h3>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: 4 }}>Due {a.dueDate}</p>
        </div>
        {sub && sub.grade !== null && sub.grade !== undefined
          ? <div className="grade-seal">{sub.grade}</div>
          : sub ? <span className="badge badge-yellow">Awaiting grade</span> : null}
      </div>
      {a.description && <p style={{ fontSize: '0.875rem', color: 'var(--text-soft)', marginBottom: 16 }}>{a.description}</p>}
      <div className="divider" />
      <FormField label={sub ? 'Update your submission' : 'Your submission'}>
        <textarea
          id={`content-${a.id}`}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Write or paste your submission text…"
        />
      </FormField>
      {sub?.feedback && (
        <p style={{ fontSize: '0.8125rem', color: 'var(--text-soft)', marginTop: 8 }}>
          <strong>Feedback:</strong> {sub.feedback}
        </p>
      )}
      <button
        className="btn btn-primary btn-sm"
        style={{ marginTop: 12, alignSelf: 'flex-start' }}
        onClick={handleSubmit}
        disabled={submitting}
        id={`submit-${a.id}`}
      >
        {submitting ? 'Sending…' : sub ? 'Update Submission' : 'Submit'}
      </button>
    </div>
  );
}

function FacultyAssignmentCard({ assignment: a, onViewSubmissions }) {
  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 8 }}>
        <div>
          <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>{a.title}</h3>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: 4 }}>Due {a.dueDate}</p>
        </div>
        <span className="badge badge-purple">{a.submissionCount} submitted</span>
      </div>
      {a.description && <p style={{ fontSize: '0.875rem', color: 'var(--text-soft)', marginBottom: 16 }}>{a.description}</p>}
      <div className="divider" />
      <button className="btn btn-secondary btn-sm" onClick={onViewSubmissions} id={`submissions-${a.id}`}>
        View Submissions
      </button>
    </div>
  );
}

function SubmissionsModal({ assignment, courseId, onClose }) {
  const showToast = useToast();
  const [submissions, setSubmissions] = useState([]);
  const [grades, setGrades] = useState({});
  const [feedbacks, setFeedbacks] = useState({});
  const [saving, setSaving] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch(`/assignments/course/${courseId}`)
      .then((data) => {
        const full = data.assignments.find((a) => a.id === assignment.id);
        const subs = full?.submissions ?? [];
        setSubmissions(subs);
        const g = {}, f = {};
        subs.forEach((s) => { g[s.id] = s.grade ?? ''; f[s.id] = s.feedback ?? ''; });
        setGrades(g);
        setFeedbacks(f);
      })
      .catch((err) => showToast(err.message, 'error'))
      .finally(() => setLoading(false));
  }, [assignment.id, courseId, showToast]);

  async function handleGrade(s) {
    if (grades[s.id] === '') { showToast('Enter a grade first.', 'error'); return; }
    setSaving({ ...saving, [s.id]: true });
    try {
      await apiFetch(`/assignments/submissions/${s.id}/grade`, {
        method: 'POST',
        body: { grade: Number(grades[s.id]), feedback: feedbacks[s.id] },
      });
      showToast(`Grade saved for ${s.studentName}.`);
      onClose();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSaving({ ...saving, [s.id]: false });
    }
  }

  return (
    <Modal title={`${assignment.title} — Submissions`} onClose={onClose}>
      {loading ? <Spinner /> : submissions.length === 0 ? (
        <EmptyState icon="📭" title="No submissions yet" message="Nobody has submitted this assignment." />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {submissions.map((s) => (
            <div key={s.id} style={{ borderTop: '1px solid var(--border)', paddingTop: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <div>
                  <p style={{ fontWeight: 600, fontSize: '0.875rem' }}>{s.studentName}</p>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    {new Date(s.submittedAt).toLocaleString()}
                  </p>
                </div>
                {s.grade !== null && s.grade !== undefined && <div className="grade-seal">{s.grade}</div>}
              </div>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-soft)', whiteSpace: 'pre-wrap', marginBottom: 12 }}>{s.content}</p>
              <FormField label="Grade (0–100)">
                <input
                  type="number"
                  min="0" max="100"
                  id={`grade-${s.id}`}
                  value={grades[s.id] ?? ''}
                  onChange={(e) => setGrades({ ...grades, [s.id]: e.target.value })}
                  placeholder="0–100"
                />
              </FormField>
              <div style={{ marginTop: 10 }}>
                <FormField label="Feedback">
                  <textarea
                    id={`feedback-${s.id}`}
                    value={feedbacks[s.id] ?? ''}
                    onChange={(e) => setFeedbacks({ ...feedbacks, [s.id]: e.target.value })}
                    placeholder="Optional feedback…"
                  />
                </FormField>
              </div>
              <button
                className="btn btn-secondary btn-sm"
                style={{ marginTop: 10 }}
                onClick={() => handleGrade(s)}
                disabled={saving[s.id]}
                data-submission={s.id}
                id={`grade-save-${s.id}`}
              >
                {saving[s.id] ? 'Saving…' : 'Save Grade'}
              </button>
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}
