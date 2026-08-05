import { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '../api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Spinner, EmptyState, FormField } from '../components/UI';

export default function AttendancePage({ courses }) {
  const { user } = useAuth();
  const showToast = useToast();
  const isFacultyOrAdmin = ['faculty', 'admin'].includes(user?.role);

  const relevantCourses = user?.role === 'student'
    ? courses.filter((c) => c.isEnrolled)
    : courses;

  const [selectedCourseId, setSelectedCourseId] = useState(relevantCourses[0]?.id ?? '');
  const [data, setData] = useState(null);
  const [roster, setRoster] = useState([]);
  const [loading, setLoading] = useState(false);
  const [attDate, setAttDate] = useState(new Date().toISOString().slice(0, 10));
  const [statuses, setStatuses] = useState({});
  const [saving, setSaving] = useState(false);

  const loadAttendance = useCallback(async (courseId) => {
    if (!courseId) return;
    setLoading(true);
    setData(null);
    try {
      const res = await apiFetch(`/attendance/${courseId}`);
      setData(res);
      if (isFacultyOrAdmin) {
        const courseRes = await apiFetch(`/courses/${courseId}`);
        const r = courseRes.roster || [];
        setRoster(r);
        const init = {};
        r.forEach((s) => { init[s.id] = 'present'; });
        setStatuses(init);
      }
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [isFacultyOrAdmin, showToast]);

  useEffect(() => {
    if (selectedCourseId) loadAttendance(selectedCourseId);
  }, [selectedCourseId, loadAttendance]);

  async function handleSave() {
    if (!attDate) { showToast('Pick a date first.', 'error'); return; }
    const records = Object.entries(statuses).map(([studentId, status]) => ({ studentId, status }));
    setSaving(true);
    try {
      await apiFetch(`/attendance/${selectedCourseId}`, { method: 'POST', body: { date: attDate, records } });
      showToast('Attendance saved!');
      loadAttendance(selectedCourseId);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  }

  if (relevantCourses.length === 0) {
    return (
      <div>
        <div className="page-header">
          <p className="page-eyebrow">Roll Call</p>
          <h1 className="page-title">Attendance</h1>
        </div>
        <div className="page-body">
          <EmptyState icon="📅" title="No courses" message="Enroll in a course to see attendance." />
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <p className="page-eyebrow">Roll Call</p>
        <h1 className="page-title">Attendance</h1>
      </div>
      <div className="page-body">
        {/* Course selector */}
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

        {loading ? <Spinner /> : data && (
          user?.role === 'student' ? (
            <StudentAttendanceView data={data} />
          ) : (
            <FacultyAttendanceView
              data={data}
              roster={roster}
              attDate={attDate}
              setAttDate={setAttDate}
              statuses={statuses}
              setStatuses={setStatuses}
              onSave={handleSave}
              saving={saving}
            />
          )
        )}
      </div>
    </div>
  );
}

function StudentAttendanceView({ data }) {
  const { summary, records } = data;
  return (
    <div>
      <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        <div className="stat-card">
          <div className="num">{summary.percentage}%</div>
          <div className="lbl">Attendance</div>
        </div>
        <div className="stat-card">
          <div className="num">{summary.present}</div>
          <div className="lbl">Present</div>
        </div>
        <div className="stat-card">
          <div className="num">{summary.total}</div>
          <div className="lbl">Sessions</div>
        </div>
      </div>

      <div className="card">
        <div className="section-header"><h2>Session Log</h2></div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Date</th><th>Status</th></tr>
            </thead>
            <tbody>
              {records.length > 0 ? records.map((r) => (
                <tr key={r.id}>
                  <td>{r.date}</td>
                  <td>
                    <span className={`badge ${r.status === 'present' ? 'badge-green' : 'badge-red'}`}>
                      {r.status}
                    </span>
                  </td>
                </tr>
              )) : (
                <tr><td colSpan={2} style={{ color: 'var(--text-muted)' }}>No sessions recorded yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function FacultyAttendanceView({ data, roster, attDate, setAttDate, statuses, setStatuses, onSave, saving }) {
  const { summary } = data;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Mark attendance */}
      <div className="card">
        <div className="section-header"><h2>Mark Attendance</h2></div>
        <div className="course-select-wrap" style={{ maxWidth: 220 }}>
          <FormField label="Session Date">
            <input type="date" id="att-date" value={attDate} onChange={(e) => setAttDate(e.target.value)} />
          </FormField>
        </div>
        <div className="divider" />
        {roster.length > 0 ? (
          <>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr><th>Student</th><th>Status</th></tr>
                </thead>
                <tbody>
                  {roster.map((s) => (
                    <tr key={s.id} data-student={s.id}>
                      <td>{s.name}</td>
                      <td>
                        <div className="att-toggle">
                          <button
                            type="button"
                            className={`${statuses[s.id] === 'present' ? 'active present' : ''}`}
                            onClick={() => setStatuses({ ...statuses, [s.id]: 'present' })}
                          >Present</button>
                          <button
                            type="button"
                            className={`${statuses[s.id] === 'absent' ? 'active absent' : ''}`}
                            onClick={() => setStatuses({ ...statuses, [s.id]: 'absent' })}
                          >Absent</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={onSave} disabled={saving} id="save-attendance">
              {saving ? 'Saving…' : 'Save Attendance'}
            </button>
          </>
        ) : (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>No students enrolled yet.</p>
        )}
      </div>

      {/* Summary */}
      <div className="card">
        <div className="section-header"><h2>Attendance Summary</h2></div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Student</th><th>Present</th><th>Total</th><th>%</th></tr>
            </thead>
            <tbody>
              {summary && summary.length > 0 ? summary.map((s) => (
                <tr key={s.studentId}>
                  <td>{s.name}</td>
                  <td>{s.present}</td>
                  <td>{s.total}</td>
                  <td>
                    <span className={`badge ${s.percentage >= 75 ? 'badge-green' : 'badge-red'}`}>
                      {s.percentage}%
                    </span>
                  </td>
                </tr>
              )) : (
                <tr><td colSpan={4} style={{ color: 'var(--text-muted)' }}>No attendance recorded yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
