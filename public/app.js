const API = '/api/v1';

const state = {
  token: localStorage.getItem('meridian_token') || null,
  user: JSON.parse(localStorage.getItem('meridian_user') || 'null'),
  view: 'courses',
  courses: [],
  selectedCourseId: {}, // per-view selected course id
};

const NAV = [
  { id: 'courses', label: 'Courses' },
  { id: 'attendance', label: 'Attendance' },
  { id: 'assignments', label: 'Assignments' },
  { id: 'results', label: 'Results' },
];

const GRADE_OPTIONS = ['A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'D', 'F'];

// ---------- API helper ----------

async function api(path, options = {}) {
  const res = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(state.token ? { Authorization: `Bearer ${state.token}` } : {}),
      ...(options.headers || {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Something went wrong.');
  return data;
}

// ---------- Auth ----------

const loginScreen = document.getElementById('login-screen');
const appShell = document.getElementById('app-shell');
const loginForm = document.getElementById('login-form');
const loginError = document.getElementById('login-error');

document.querySelectorAll('.chip').forEach((chip) => {
  chip.addEventListener('click', () => {
    document.getElementById('email').value = chip.dataset.email;
    document.getElementById('password').value = chip.dataset.password;
  });
});

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  loginError.textContent = '';
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  try {
    const data = await api('/auth/login', { method: 'POST', body: { email, password } });
    state.token = data.token;
    state.user = data.user;
    localStorage.setItem('meridian_token', data.token);
    localStorage.setItem('meridian_user', JSON.stringify(data.user));
    enterApp();
  } catch (err) {
    loginError.textContent = err.message;
  }
});

document.getElementById('logout-btn').addEventListener('click', () => {
  state.token = null;
  state.user = null;
  localStorage.removeItem('meridian_token');
  localStorage.removeItem('meridian_user');
  appShell.classList.add('hidden');
  loginScreen.classList.remove('hidden');
  loginForm.reset();
});

function enterApp() {
  loginScreen.classList.add('hidden');
  appShell.classList.remove('hidden');
  document.getElementById('user-name').textContent = state.user.name;
  document.getElementById('user-role').textContent = state.user.role;
  renderNav();
  setView('courses');
}

function renderNav() {
  const nav = document.getElementById('rail-nav');
  nav.innerHTML = '';
  NAV.forEach((item) => {
    const btn = document.createElement('button');
    btn.textContent = item.label;
    btn.className = item.id === state.view ? 'active' : '';
    btn.addEventListener('click', () => setView(item.id));
    nav.appendChild(btn);
  });
}

// ---------- View router ----------

const VIEW_META = {
  courses: { eyebrow: 'Catalog', title: 'Courses' },
  attendance: { eyebrow: 'Roll Call', title: 'Attendance' },
  assignments: { eyebrow: 'Coursework', title: 'Assignments' },
  results: { eyebrow: 'Transcript', title: 'Results' },
};

async function setView(view) {
  state.view = view;
  renderNav();
  document.getElementById('view-eyebrow').textContent = VIEW_META[view].eyebrow;
  document.getElementById('view-title').textContent = VIEW_META[view].title;
  document.getElementById('view-actions').innerHTML = '';
  clearBanner();
  const root = document.getElementById('view-root');
  root.innerHTML = '<p style="color:var(--cream-text-soft); font-size:13.5px;">Loading…</p>';

  try {
    if (!state.courses.length || view === 'courses') {
      const data = await api('/courses');
      state.courses = data.courses;
    }
    if (view === 'courses') return renderCourses();
    if (view === 'attendance') return renderAttendance();
    if (view === 'assignments') return renderAssignments();
    if (view === 'results') return renderResults();
  } catch (err) {
    root.innerHTML = `<div class="empty-state"><h3>Couldn't load this view</h3><p>${escapeHtml(err.message)}</p></div>`;
  }
}

function showBanner(message, isError = false) {
  const banner = document.getElementById('banner');
  banner.textContent = message;
  banner.className = `banner ${isError ? 'error' : ''}`;
  banner.classList.remove('hidden');
  setTimeout(clearBanner, 4000);
}

function clearBanner() {
  const banner = document.getElementById('banner');
  banner.classList.add('hidden');
}

// ---------- Courses view ----------

function renderCourses() {
  const root = document.getElementById('view-root');
  const isFacultyOrAdmin = ['faculty', 'admin'].includes(state.user.role);

  if (isFacultyOrAdmin) {
    document.getElementById('view-actions').innerHTML = `<button class="btn btn--primary" id="new-course-btn">+ New course</button>`;
    document.getElementById('new-course-btn').addEventListener('click', openNewCourseModal);
  }

  if (!state.courses.length) {
    root.innerHTML = `<div class="empty-state"><h3>No courses yet</h3><p>${isFacultyOrAdmin ? 'Create your first course to get started.' : 'Check back once your department publishes the catalog.'}</p></div>`;
    return;
  }

  root.innerHTML = `<div class="grid">${state.courses.map(courseCardHtml).join('')}</div>`;

  state.courses.forEach((c) => {
    const card = document.getElementById(`course-${c.id}`);
    card.addEventListener('click', (e) => {
      if (e.target.closest('.enroll-btn')) return;
      state.selectedCourseId.attendance = c.id;
      state.selectedCourseId.assignments = c.id;
      state.selectedCourseId.results = c.id;
      setView(state.user.role === 'student' && !c.isEnrolled ? 'courses' : 'assignments');
    });
    const enrollBtn = card.querySelector('.enroll-btn');
    if (enrollBtn) {
      enrollBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        try {
          await api(`/courses/${c.id}/enroll`, { method: 'POST', body: {} });
          showBanner(`Enrolled in ${c.code}.`);
          state.courses = [];
          setView('courses');
        } catch (err) {
          showBanner(err.message, true);
        }
      });
    }
  });
}

function courseCardHtml(c) {
  const showEnroll = state.user.role === 'student' && !c.isEnrolled;
  return `
    <article class="paper course-card" id="course-${c.id}">
      <div class="course-card__top">
        <span class="code-tag">${escapeHtml(c.code)}</span>
        ${state.user.role === 'student'
          ? `<span class="pill ${c.isEnrolled ? 'pill--enrolled' : 'pill--open'}">${c.isEnrolled ? 'Enrolled' : 'Open'}</span>`
          : `<span class="pill pill--open">${c.enrolledCount} enrolled</span>`}
      </div>
      <h3 style="margin-top:10px;">${escapeHtml(c.title)}</h3>
      <p class="meta">${escapeHtml(c.facultyName)}</p>
      <p class="desc">${escapeHtml(c.description || '')}</p>
      ${showEnroll ? `<button class="btn btn--primary btn--small enroll-btn" style="margin-top:14px;">Enroll</button>` : ''}
    </article>`;
}

function openNewCourseModal() {
  openModal(`
    <h2>New course</h2>
    <div class="form-field"><label>Course code</label><input id="f-code" placeholder="e.g. CS401" /></div>
    <div class="form-field"><label>Title</label><input id="f-title" placeholder="e.g. Operating Systems" /></div>
    <div class="form-field"><label>Description</label><textarea id="f-desc" placeholder="What this course covers"></textarea></div>
    <button class="btn btn--primary" id="f-submit">Create course</button>
  `);
  document.getElementById('f-submit').addEventListener('click', async () => {
    const code = document.getElementById('f-code').value.trim();
    const title = document.getElementById('f-title').value.trim();
    const description = document.getElementById('f-desc').value.trim();
    if (!code || !title) return showBanner('Course code and title are required.', true);
    try {
      await api('/courses', { method: 'POST', body: { code, title, description } });
      closeModal();
      showBanner(`${code} created.`);
      state.courses = [];
      setView('courses');
    } catch (err) {
      showBanner(err.message, true);
    }
  });
}

// ---------- Shared: course selector ----------

function courseSelectHtml(view, courses) {
  if (!courses.length) return '';
  const selected = state.selectedCourseId[view] || courses[0].id;
  state.selectedCourseId[view] = selected;
  return `
    <div class="form-field" style="max-width:320px; margin-bottom:20px;">
      <label>Course</label>
      <select id="course-select">
        ${courses.map((c) => `<option value="${c.id}" ${c.id === selected ? 'selected' : ''}>${escapeHtml(c.code)} — ${escapeHtml(c.title)}</option>`).join('')}
      </select>
    </div>`;
}

function bindCourseSelect(view, onChange) {
  const sel = document.getElementById('course-select');
  if (!sel) return;
  sel.addEventListener('change', () => {
    state.selectedCourseId[view] = sel.value;
    onChange(sel.value);
  });
}

// ---------- Attendance view ----------

async function renderAttendance() {
  const root = document.getElementById('view-root');
  const relevantCourses = state.user.role === 'student' ? state.courses.filter((c) => c.isEnrolled) : state.courses;

  if (!relevantCourses.length) {
    root.innerHTML = `<div class="empty-state"><h3>No courses to show attendance for</h3><p>Enroll in a course first.</p></div>`;
    return;
  }

  const courseId = state.selectedCourseId.attendance || relevantCourses[0].id;
  state.selectedCourseId.attendance = courseId;

  root.innerHTML = `${courseSelectHtml('attendance', relevantCourses)}<div id="attendance-body"></div>`;
  bindCourseSelect('attendance', renderAttendanceBody);
  await renderAttendanceBody(courseId);
}

async function renderAttendanceBody(courseId) {
  const body = document.getElementById('attendance-body');
  body.innerHTML = '<p style="color:var(--cream-text-soft); font-size:13.5px;">Loading…</p>';
  const data = await api(`/attendance/${courseId}`);

  if (state.user.role === 'student') {
    body.innerHTML = `
      <div class="stat-row">
        <div class="stat-block"><div class="num">${data.summary.percentage}%</div><div class="label">Attendance</div></div>
        <div class="stat-block"><div class="num">${data.summary.present}</div><div class="label">Present</div></div>
        <div class="stat-block"><div class="num">${data.summary.total}</div><div class="label">Sessions</div></div>
      </div>
      <div class="paper">
        <h2>Session log</h2>
        <table class="ledger">
          <thead><tr><th>Date</th><th>Status</th></tr></thead>
          <tbody>
            ${data.records.length
              ? data.records.map((r) => `<tr><td>${r.date}</td><td><span class="status-dot ${r.status}">${r.status}</span></td></tr>`).join('')
              : `<tr><td colspan="2" style="color:var(--ink-text-soft);">No sessions recorded yet.</td></tr>`}
          </tbody>
        </table>
      </div>`;
    return;
  }

  // Faculty / admin: mark attendance + summary
  const course = await api(`/courses/${courseId}`);
  const roster = course.roster || [];

  body.innerHTML = `
    <div class="paper">
      <h2>Mark attendance</h2>
      <div class="form-field" style="max-width:220px;">
        <label>Date</label>
        <input type="date" id="att-date" value="${new Date().toISOString().slice(0, 10)}" />
      </div>
      <hr class="hr" />
      ${roster.length ? `
      <table class="ledger">
        <thead><tr><th>Student</th><th>Status</th></tr></thead>
        <tbody>
          ${roster.map((s) => `
            <tr data-student="${s.id}">
              <td>${escapeHtml(s.name)}</td>
              <td>
                <div class="attendance-toggle">
                  <button type="button" class="present-btn active present" data-status="present">Present</button>
                  <button type="button" class="absent-btn" data-status="absent">Absent</button>
                </div>
              </td>
            </tr>`).join('')}
        </tbody>
      </table>
      <button class="btn btn--primary" id="save-attendance" style="margin-top:16px;">Save attendance</button>
      ` : `<p style="color:var(--ink-text-soft); font-size:13.5px;">No students enrolled yet.</p>`}
    </div>
    <div class="paper">
      <h2>Attendance summary</h2>
      <table class="ledger">
        <thead><tr><th>Student</th><th>Present</th><th>Total</th><th>%</th></tr></thead>
        <tbody>
          ${data.summary.length
            ? data.summary.map((s) => `<tr><td>${escapeHtml(s.name)}</td><td>${s.present}</td><td>${s.total}</td><td>${s.percentage}%</td></tr>`).join('')
            : `<tr><td colspan="4" style="color:var(--ink-text-soft);">No attendance recorded yet.</td></tr>`}
        </tbody>
      </table>
    </div>`;

  body.querySelectorAll('tr[data-student]').forEach((row) => {
    const buttons = row.querySelectorAll('.attendance-toggle button');
    buttons.forEach((btn) => {
      btn.addEventListener('click', () => {
        buttons.forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
      });
    });
  });

  const saveBtn = document.getElementById('save-attendance');
  if (saveBtn) {
    saveBtn.addEventListener('click', async () => {
      const date = document.getElementById('att-date').value;
      if (!date) return showBanner('Pick a date first.', true);
      const records = Array.from(body.querySelectorAll('tr[data-student]')).map((row) => ({
        studentId: row.dataset.student,
        status: row.querySelector('.attendance-toggle button.active').dataset.status,
      }));
      try {
        await api(`/attendance/${courseId}`, { method: 'POST', body: { date, records } });
        showBanner('Attendance saved.');
        renderAttendanceBody(courseId);
      } catch (err) {
        showBanner(err.message, true);
      }
    });
  }
}

// ---------- Assignments view ----------

async function renderAssignments() {
  const root = document.getElementById('view-root');
  const relevantCourses = state.user.role === 'student' ? state.courses.filter((c) => c.isEnrolled) : state.courses;

  if (!relevantCourses.length) {
    root.innerHTML = `<div class="empty-state"><h3>No coursework to show</h3><p>Enroll in a course first.</p></div>`;
    return;
  }

  const courseId = state.selectedCourseId.assignments || relevantCourses[0].id;
  state.selectedCourseId.assignments = courseId;

  const isFacultyOrAdmin = ['faculty', 'admin'].includes(state.user.role);
  if (isFacultyOrAdmin) {
    document.getElementById('view-actions').innerHTML = `<button class="btn btn--primary" id="new-assignment-btn">+ New assignment</button>`;
  }

  root.innerHTML = `${courseSelectHtml('assignments', relevantCourses)}<div id="assignments-body"></div>`;
  bindCourseSelect('assignments', (id) => { renderAssignmentsBody(id); wireNewAssignmentBtn(id); });
  await renderAssignmentsBody(courseId);
  wireNewAssignmentBtn(courseId);
}

function wireNewAssignmentBtn(courseId) {
  const btn = document.getElementById('new-assignment-btn');
  if (!btn) return;
  btn.onclick = () => openNewAssignmentModal(courseId);
}

async function renderAssignmentsBody(courseId) {
  const body = document.getElementById('assignments-body');
  body.innerHTML = '<p style="color:var(--cream-text-soft); font-size:13.5px;">Loading…</p>';
  const data = await api(`/assignments/course/${courseId}`);

  if (!data.assignments.length) {
    body.innerHTML = `<div class="empty-state"><h3>No assignments yet</h3><p>Nothing has been posted for this course.</p></div>`;
    return;
  }

  body.innerHTML = data.assignments.map((a) => assignmentCardHtml(a, courseId)).join('');

  if (state.user.role === 'student') {
    data.assignments.forEach((a) => {
      const submitBtn = document.getElementById(`submit-${a.id}`);
      if (submitBtn) {
        submitBtn.addEventListener('click', async () => {
          const textarea = document.getElementById(`content-${a.id}`);
          const content = textarea.value.trim();
          if (!content) return showBanner('Write a submission before sending.', true);
          try {
            await api(`/assignments/${a.id}/submit`, { method: 'POST', body: { content } });
            showBanner('Submission sent.');
            renderAssignmentsBody(courseId);
          } catch (err) {
            showBanner(err.message, true);
          }
        });
      }
    });
  } else {
    data.assignments.forEach((a) => {
      const viewBtn = document.getElementById(`submissions-${a.id}`);
      if (viewBtn) viewBtn.addEventListener('click', () => openSubmissionsModal(a, courseId));
    });
  }
}

function assignmentCardHtml(a, courseId) {
  if (state.user.role === 'student') {
    const sub = a.mySubmission;
    return `
      <div class="paper">
        <div class="course-card__top">
          <div><h2>${escapeHtml(a.title)}</h2><p class="meta">Due ${a.dueDate}</p></div>
          ${sub && sub.grade !== null && sub.grade !== undefined
            ? `<span class="grade-seal">Grade: ${escapeHtml(String(sub.grade))}</span>`
            : sub ? `<span class="grade-pending">Awaiting grade</span>` : ''}
        </div>
        <p class="desc">${escapeHtml(a.description || '')}</p>
        <hr class="hr" />
        <div class="form-field">
          <label>${sub ? 'Update your submission' : 'Your submission'}</label>
          <textarea id="content-${a.id}" placeholder="Write or paste your submission text...">${sub ? escapeHtml(sub.content) : ''}</textarea>
        </div>
        ${sub && sub.feedback ? `<p class="desc"><strong>Feedback:</strong> ${escapeHtml(sub.feedback)}</p>` : ''}
        <button class="btn btn--primary btn--small" id="submit-${a.id}">${sub ? 'Update submission' : 'Submit'}</button>
      </div>`;
  }

  return `
    <div class="paper">
      <div class="course-card__top">
        <div><h2>${escapeHtml(a.title)}</h2><p class="meta">Due ${a.dueDate}</p></div>
        <span class="pill pill--open">${a.submissionCount} submitted</span>
      </div>
      <p class="desc">${escapeHtml(a.description || '')}</p>
      <hr class="hr" />
      <button class="btn btn--small" id="submissions-${a.id}">View submissions</button>
    </div>`;
}

function openNewAssignmentModal(courseId) {
  openModal(`
    <h2>New assignment</h2>
    <div class="form-field"><label>Title</label><input id="f-title" placeholder="e.g. Midterm essay" /></div>
    <div class="form-field"><label>Description</label><textarea id="f-desc" placeholder="Instructions for students"></textarea></div>
    <div class="form-field"><label>Due date</label><input type="date" id="f-due" /></div>
    <button class="btn btn--primary" id="f-submit">Create assignment</button>
  `);
  document.getElementById('f-submit').addEventListener('click', async () => {
    const title = document.getElementById('f-title').value.trim();
    const description = document.getElementById('f-desc').value.trim();
    const dueDate = document.getElementById('f-due').value;
    if (!title || !dueDate) return showBanner('Title and due date are required.', true);
    try {
      await api(`/assignments/course/${courseId}`, { method: 'POST', body: { title, description, dueDate } });
      closeModal();
      showBanner('Assignment created.');
      renderAssignmentsBody(courseId);
    } catch (err) {
      showBanner(err.message, true);
    }
  });
}

async function openSubmissionsModal(assignment, courseId) {
  openModal(`<h2>${escapeHtml(assignment.title)} — Submissions</h2><p style="color:var(--ink-text-soft); font-size:13px;">Loading…</p>`);
  const data = await api(`/assignments/course/${courseId}`);
  const full = data.assignments.find((a) => a.id === assignment.id);
  const submissions = (full && full.submissions) || [];

  if (!submissions.length) {
    openModal(`<h2>${escapeHtml(assignment.title)} — Submissions</h2><div class="empty-state"><h3>No submissions yet</h3><p>Nobody has submitted this assignment.</p></div>`);
    return;
  }

  openModal(`
    <h2>${escapeHtml(assignment.title)} — Submissions</h2>
    ${submissions.map((s) => `
      <div style="border-top:1px solid var(--paper-dim); padding:12px 0;">
        <p style="margin:0; font-weight:600; font-size:13.5px;">${escapeHtml(s.studentName)}</p>
        <p class="meta" style="margin-top:2px;">Submitted ${new Date(s.submittedAt).toLocaleString()}</p>
        <p class="desc" style="white-space:pre-wrap;">${escapeHtml(s.content)}</p>
        <div class="form-field" style="margin-top:8px;">
          <label>Grade</label>
          <input type="number" min="0" max="100" id="grade-${s.id}" value="${s.grade ?? ''}" placeholder="0–100" />
        </div>
        <div class="form-field">
          <label>Feedback</label>
          <textarea id="feedback-${s.id}" placeholder="Optional feedback">${escapeHtml(s.feedback || '')}</textarea>
        </div>
        <button class="btn btn--small" data-submission="${s.id}" data-name="${escapeHtml(s.studentName)}">Save grade</button>
      </div>
    `).join('')}
  `);

  submissions.forEach((s) => {
    const btn = document.querySelector(`button[data-submission="${s.id}"]`);
    if (!btn) return;
    btn.addEventListener('click', async () => {
      const grade = document.getElementById(`grade-${s.id}`).value;
      const feedback = document.getElementById(`feedback-${s.id}`).value;
      if (grade === '') return showBanner('Enter a grade first.', true);
      try {
        await api(`/assignments/submissions/${s.id}/grade`, { method: 'POST', body: { grade: Number(grade), feedback } });
        showBanner(`Grade saved for ${btn.dataset.name}.`);
        closeModal();
        renderAssignmentsBody(courseId);
      } catch (err) {
        showBanner(err.message, true);
      }
    });
  });
}

// ---------- Results view ----------

async function renderResults() {
  const root = document.getElementById('view-root');

  if (state.user.role === 'student') {
    const data = await api('/results/me');
    root.innerHTML = `
      <div class="stat-row">
        <div class="stat-block"><div class="num">${data.gpa ?? '—'}</div><div class="label">GPA</div></div>
        <div class="stat-block"><div class="num">${data.results.length}</div><div class="label">Courses graded</div></div>
      </div>
      <div class="paper">
        <h2>Transcript</h2>
        <table class="ledger">
          <thead><tr><th>Course</th><th>Marks</th><th>Grade</th></tr></thead>
          <tbody>
            ${data.results.length
              ? data.results.map((r) => `<tr><td>${escapeHtml(r.courseCode)} — ${escapeHtml(r.courseTitle)}</td><td>${r.marks}</td><td><span class="grade-seal">${escapeHtml(r.grade)}</span></td></tr>`).join('')
              : `<tr><td colspan="3" style="color:var(--ink-text-soft);">No results posted yet.</td></tr>`}
          </tbody>
        </table>
      </div>`;
    return;
  }

  const relevantCourses = state.courses;
  if (!relevantCourses.length) {
    root.innerHTML = `<div class="empty-state"><h3>No courses yet</h3><p>Create a course to start entering results.</p></div>`;
    return;
  }
  const courseId = state.selectedCourseId.results || relevantCourses[0].id;
  state.selectedCourseId.results = courseId;

  document.getElementById('view-actions').innerHTML = `<button class="btn btn--primary" id="new-result-btn">+ Enter result</button>`;

  root.innerHTML = `${courseSelectHtml('results', relevantCourses)}<div id="results-body"></div>`;
  bindCourseSelect('results', (id) => { renderResultsBody(id); wireNewResultBtn(id); });
  await renderResultsBody(courseId);
  wireNewResultBtn(courseId);
}

function wireNewResultBtn(courseId) {
  const btn = document.getElementById('new-result-btn');
  if (!btn) return;
  btn.onclick = async () => {
    const course = await api(`/courses/${courseId}`);
    const roster = course.roster || [];
    openModal(`
      <h2>Enter result</h2>
      <div class="form-field">
        <label>Student</label>
        <select id="f-student">${roster.map((s) => `<option value="${s.id}">${escapeHtml(s.name)}</option>`).join('')}</select>
      </div>
      <div class="form-field"><label>Marks (0–100)</label><input type="number" min="0" max="100" id="f-marks" /></div>
      <div class="form-field">
        <label>Letter grade</label>
        <select id="f-grade">${GRADE_OPTIONS.map((g) => `<option value="${g}">${g}</option>`).join('')}</select>
      </div>
      <button class="btn btn--primary" id="f-submit">Save result</button>
    `);
    document.getElementById('f-submit').addEventListener('click', async () => {
      const studentId = document.getElementById('f-student').value;
      const marks = Number(document.getElementById('f-marks').value);
      const grade = document.getElementById('f-grade').value;
      try {
        await api(`/results/course/${courseId}`, { method: 'POST', body: { studentId, marks, grade } });
        closeModal();
        showBanner('Result saved.');
        renderResultsBody(courseId);
      } catch (err) {
        showBanner(err.message, true);
      }
    });
  };
}

async function renderResultsBody(courseId) {
  const body = document.getElementById('results-body');
  body.innerHTML = '<p style="color:var(--cream-text-soft); font-size:13.5px;">Loading…</p>';
  const data = await api(`/results/course/${courseId}`);
  body.innerHTML = `
    <div class="paper">
      <h2>Gradebook</h2>
      <table class="ledger">
        <thead><tr><th>Student</th><th>Marks</th><th>Grade</th></tr></thead>
        <tbody>
          ${data.results.length
            ? data.results.map((r) => `<tr><td>${escapeHtml(r.studentName)}</td><td>${r.marks}</td><td><span class="grade-seal">${escapeHtml(r.grade)}</span></td></tr>`).join('')
            : `<tr><td colspan="3" style="color:var(--ink-text-soft);">No results entered yet.</td></tr>`}
        </tbody>
      </table>
    </div>`;
}

// ---------- Modal ----------

const modalBackdrop = document.getElementById('modal-backdrop');
document.getElementById('modal-close').addEventListener('click', closeModal);
modalBackdrop.addEventListener('click', (e) => { if (e.target === modalBackdrop) closeModal(); });

function openModal(html) {
  document.getElementById('modal-body').innerHTML = html;
  modalBackdrop.classList.remove('hidden');
}

function closeModal() {
  modalBackdrop.classList.add('hidden');
}

// ---------- Utilities ----------

function escapeHtml(str) {
  return String(str ?? '').replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
}

// ---------- Boot ----------

if (state.token && state.user) {
  enterApp();
}
