import { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '../api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Spinner, Modal, FormField } from '../components/UI';

const GRADE_OPTIONS = ['A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'D', 'F'];

export default function ResultsPage({ courses }) {
  const { user } = useAuth();
  const showToast = useToast();
  const isStudent = user?.role === 'student';
  const isFacultyOrAdmin = ['faculty', 'admin'].includes(user?.role);

  const [selectedCourseId, setSelectedCourseId] = useState(courses[0]?.id ?? '');
  const [results, setResults] = useState([]);
  const [gpa, setGpa] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showEnterResult, setShowEnterResult] = useState(false);
  const [roster, setRoster] = useState([]);
  const [form, setForm] = useState({ studentId: '', marks: '', grade: 'A' });
  const [saving, setSaving] = useState(false);

  const loadResults = useCallback(async (courseId) => {
    if (!courseId && !isStudent) return;
    setLoading(true);
    try {
      if (isStudent) {
        const data = await apiFetch('/results/me');
        setResults(data.results);
        setGpa(data.gpa);
      } else {
        const data = await apiFetch(`/results/course/${courseId}`);
        setResults(data.results);
      }
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [isStudent, showToast]);

  useEffect(() => {
    loadResults(selectedCourseId);
  }, [selectedCourseId, loadResults]);

  async function openEnterResult() {
    try {
      const data = await apiFetch(`/courses/${selectedCourseId}`);
      setRoster(data.roster || []);
      setForm({ studentId: data.roster?.[0]?.id ?? '', marks: '', grade: 'A' });
      setShowEnterResult(true);
    } catch (err) {
      showToast(err.message, 'error');
    }
  }

  async function handleSaveResult(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await apiFetch(`/results/course/${selectedCourseId}`, {
        method: 'POST',
        body: { studentId: form.studentId, marks: Number(form.marks), grade: form.grade },
      });
      showToast('Result saved!');
      setShowEnterResult(false);
      loadResults(selectedCourseId);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="page-header">
        <div className="page-header-row">
          <div>
            <p className="page-eyebrow">Transcript</p>
            <h1 className="page-title">Results</h1>
          </div>
          {isFacultyOrAdmin && courses.length > 0 && (
            <div className="page-actions">
              <button className="btn btn-primary" onClick={openEnterResult} id="new-result-btn">
                + Enter Result
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="page-body">
        {/* Course selector for faculty */}
        {!isStudent && courses.length > 0 && (
          <div className="course-select-wrap">
            <FormField label="Course">
              <select
                id="course-select"
                value={selectedCourseId}
                onChange={(e) => setSelectedCourseId(e.target.value)}
              >
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>{c.code} — {c.title}</option>
                ))}
              </select>
            </FormField>
          </div>
        )}

        {loading ? <Spinner /> : (
          isStudent ? (
            <StudentResultsView results={results} gpa={gpa} />
          ) : (
            <FacultyResultsView results={results} />
          )
        )}
      </div>

      {/* Enter Result Modal */}
      {showEnterResult && (
        <Modal title="Enter Result" onClose={() => setShowEnterResult(false)}>
          <form onSubmit={handleSaveResult} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <FormField label="Student">
              <select
                id="f-student"
                value={form.studentId}
                onChange={(e) => setForm({ ...form, studentId: e.target.value })}
              >
                {roster.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </FormField>
            <FormField label="Marks (0–100)">
              <input
                type="number" min="0" max="100"
                id="f-marks"
                value={form.marks}
                onChange={(e) => setForm({ ...form, marks: e.target.value })}
                placeholder="0–100"
              />
            </FormField>
            <FormField label="Letter Grade">
              <select
                id="f-grade"
                value={form.grade}
                onChange={(e) => setForm({ ...form, grade: e.target.value })}
              >
                {GRADE_OPTIONS.map((g) => <option key={g} value={g}>{g}</option>)}
              </select>
            </FormField>
            <button type="submit" className="btn btn-primary" disabled={saving} id="f-submit">
              {saving ? 'Saving…' : 'Save Result'}
            </button>
          </form>
        </Modal>
      )}
    </div>
  );
}

function StudentResultsView({ results, gpa }) {
  return (
    <div>
      <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)', maxWidth: 360 }}>
        <div className="stat-card">
          <div className="num" style={{ fontFamily: 'Fraunces, serif' }}>{gpa ?? '—'}</div>
          <div className="lbl">GPA</div>
        </div>
        <div className="stat-card">
          <div className="num">{results.length}</div>
          <div className="lbl">Courses Graded</div>
        </div>
      </div>

      <div className="card">
        <div className="section-header"><h2>Transcript</h2></div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Course</th><th>Marks</th><th>Grade</th></tr>
            </thead>
            <tbody>
              {results.length > 0 ? results.map((r) => (
                <tr key={r.id}>
                  <td>{r.courseCode} — {r.courseTitle}</td>
                  <td>{r.marks}</td>
                  <td><div className="grade-seal">{r.grade}</div></td>
                </tr>
              )) : (
                <tr><td colSpan={3} style={{ color: 'var(--text-muted)' }}>No results posted yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function FacultyResultsView({ results }) {
  return (
    <div className="card">
      <div className="section-header"><h2>Gradebook</h2></div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr><th>Student</th><th>Marks</th><th>Grade</th></tr>
          </thead>
          <tbody>
            {results.length > 0 ? results.map((r) => (
              <tr key={r.id}>
                <td>{r.studentName}</td>
                <td>{r.marks}</td>
                <td><div className="grade-seal">{r.grade}</div></td>
              </tr>
            )) : (
              <tr><td colSpan={3} style={{ color: 'var(--text-muted)' }}>No results entered yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
