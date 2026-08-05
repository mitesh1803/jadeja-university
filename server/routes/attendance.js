const express = require('express');
const { db, id, save } = require('../db');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

function assertCourseOwnership(req, res, course) {
  if (req.user.role === 'faculty' && course.facultyId !== req.user.id) {
    res.status(403).json({ error: 'You can only manage attendance for your own courses.' });
    return false;
  }
  return true;
}

// Mark attendance for one or more students on a given date (faculty/admin)
router.post('/:courseId', authorize('faculty', 'admin'), (req, res) => {
  const course = db.courses.find((c) => c.id === req.params.courseId);
  if (!course) return res.status(404).json({ error: 'Course not found.' });
  if (!assertCourseOwnership(req, res, course)) return;

  const { date, records } = req.body || {};
  // records: [{ studentId, status: 'present'|'absent' }]
  if (!date || !Array.isArray(records) || records.length === 0) {
    return res.status(400).json({ error: 'date and a non-empty records array are required.' });
  }

  const saved = records.map(({ studentId, status }) => {
    if (!['present', 'absent'].includes(status)) {
      throw new Error(`Invalid status "${status}" for student ${studentId}.`);
    }
    // Overwrite existing record for same course/student/date if present.
    const existing = db.attendance.find(
      (a) => a.courseId === course.id && a.studentId === studentId && a.date === date
    );
    if (existing) {
      existing.status = status;
      return existing;
    }
    const record = { id: id('att'), courseId: course.id, studentId, date, status };
    db.attendance.push(record);
    return record;
  });

  save();
  res.status(201).json({ records: saved });
});

// View attendance for a course (student sees own; faculty/admin see all, with % summary)
router.get('/:courseId', (req, res) => {
  const course = db.courses.find((c) => c.id === req.params.courseId);
  if (!course) return res.status(404).json({ error: 'Course not found.' });

  let records = db.attendance.filter((a) => a.courseId === course.id);

  if (req.user.role === 'student') {
    records = records.filter((a) => a.studentId === req.user.id);
    const present = records.filter((r) => r.status === 'present').length;
    const total = records.length;
    return res.json({
      records,
      summary: { total, present, percentage: total ? Math.round((present / total) * 100) : 0 },
    });
  }

  if (!assertCourseOwnership(req, res, course)) return;

  // Faculty/admin: per-student summary
  const byStudent = {};
  for (const r of records) {
    byStudent[r.studentId] = byStudent[r.studentId] || { total: 0, present: 0 };
    byStudent[r.studentId].total += 1;
    if (r.status === 'present') byStudent[r.studentId].present += 1;
  }
  const summary = Object.entries(byStudent).map(([studentId, s]) => {
    const student = db.users.find((u) => u.id === studentId);
    return {
      studentId,
      name: student ? student.name : 'Unknown',
      total: s.total,
      present: s.present,
      percentage: s.total ? Math.round((s.present / s.total) * 100) : 0,
    };
  });

  res.json({ records, summary });
});

module.exports = router;
