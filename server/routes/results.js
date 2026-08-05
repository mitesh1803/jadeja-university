const express = require('express');
const { db, id, save } = require('../db');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

const GRADE_POINTS = { 'A+': 4.0, A: 4.0, 'A-': 3.7, 'B+': 3.3, B: 3.0, 'B-': 2.7, 'C+': 2.3, C: 2.0, D: 1.0, F: 0.0 };

function ownsCourse(req, course) {
  return req.user.role === 'admin' || (req.user.role === 'faculty' && course.facultyId === req.user.id);
}

// Enter/update a result (faculty/admin, own course only)
router.post('/course/:courseId', authorize('faculty', 'admin'), (req, res) => {
  const course = db.courses.find((c) => c.id === req.params.courseId);
  if (!course) return res.status(404).json({ error: 'Course not found.' });
  if (!ownsCourse(req, course)) return res.status(403).json({ error: 'You can only enter results for your own courses.' });

  const { studentId, marks, grade } = req.body || {};
  if (!studentId || marks === undefined || !grade) {
    return res.status(400).json({ error: 'studentId, marks, and grade are required.' });
  }

  const existing = db.results.find((r) => r.courseId === course.id && r.studentId === studentId);
  if (existing) {
    existing.marks = marks;
    existing.grade = grade;
  } else {
    db.results.push({ id: id('res'), courseId: course.id, studentId, marks, grade });
  }
  save();
  res.status(201).json({ message: 'Result saved.' });
});

// Gradebook for a course (faculty/admin)
router.get('/course/:courseId', authorize('faculty', 'admin'), (req, res) => {
  const course = db.courses.find((c) => c.id === req.params.courseId);
  if (!course) return res.status(404).json({ error: 'Course not found.' });
  if (!ownsCourse(req, course)) return res.status(403).json({ error: 'You can only view results for your own courses.' });

  const results = db.results
    .filter((r) => r.courseId === course.id)
    .map((r) => {
      const student = db.users.find((u) => u.id === r.studentId);
      return { ...r, studentName: student ? student.name : 'Unknown' };
    });
  res.json({ results });
});

// A student's own results across all courses, with computed GPA
router.get('/me', authorize('student'), (req, res) => {
  const results = db.results
    .filter((r) => r.studentId === req.user.id)
    .map((r) => {
      const course = db.courses.find((c) => c.id === r.courseId);
      return { ...r, courseCode: course ? course.code : '—', courseTitle: course ? course.title : 'Unknown course' };
    });

  const points = results.map((r) => GRADE_POINTS[r.grade]).filter((p) => p !== undefined);
  const gpa = points.length ? +(points.reduce((a, b) => a + b, 0) / points.length).toFixed(2) : null;

  res.json({ results, gpa });
});

module.exports = router;
