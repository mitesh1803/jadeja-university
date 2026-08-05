const express = require('express');
const { db, id, save } = require('../db');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

function courseView(course, viewerId) {
  const enrolledCount = db.enrollments.filter((e) => e.courseId === course.id).length;
  const faculty = db.users.find((u) => u.id === course.facultyId);
  const isEnrolled = db.enrollments.some((e) => e.courseId === course.id && e.studentId === viewerId);
  return {
    ...course,
    facultyName: faculty ? faculty.name : 'Unassigned',
    enrolledCount,
    isEnrolled,
  };
}

// List courses (scoped by role)
router.get('/', (req, res) => {
  const { role, id: uid } = req.user;
  let courses = db.courses;
  if (role === 'faculty') {
    courses = courses.filter((c) => c.facultyId === uid);
  }
  res.json({ courses: courses.map((c) => courseView(c, uid)) });
});

// Create a course (admin, or faculty creating their own)
router.post('/', authorize('admin', 'faculty'), (req, res) => {
  const { code, title, description } = req.body || {};
  if (!code || !title) {
    return res.status(400).json({ error: 'Course code and title are required.' });
  }
  const facultyId = req.user.role === 'faculty' ? req.user.id : (req.body.facultyId || req.user.id);
  const course = { id: id('c'), code, title, description: description || '', facultyId };
  db.courses.push(course);
  save();
  res.status(201).json({ course: courseView(course, req.user.id) });
});

// Course detail + roster
router.get('/:courseId', (req, res) => {
  const course = db.courses.find((c) => c.id === req.params.courseId);
  if (!course) return res.status(404).json({ error: 'Course not found.' });

  const { role, id: uid } = req.user;
  if (role === 'faculty' && course.facultyId !== uid) {
    return res.status(403).json({ error: 'You can only view rosters for your own courses.' });
  }

  const roster = db.enrollments
    .filter((e) => e.courseId === course.id)
    .map((e) => db.users.find((u) => u.id === e.studentId))
    .filter(Boolean)
    .map((u) => ({ id: u.id, name: u.name, email: u.email }));

  res.json({ course: courseView(course, uid), roster: role === 'student' ? undefined : roster });
});

// Enroll in a course
router.post('/:courseId/enroll', (req, res) => {
  const course = db.courses.find((c) => c.id === req.params.courseId);
  if (!course) return res.status(404).json({ error: 'Course not found.' });

  const studentId = req.user.role === 'student' ? req.user.id : req.body.studentId;
  if (!studentId) return res.status(400).json({ error: 'studentId is required.' });
  if (req.user.role === 'faculty') {
    return res.status(403).json({ error: 'Faculty cannot enroll students directly.' });
  }

  const already = db.enrollments.some((e) => e.courseId === course.id && e.studentId === studentId);
  if (already) return res.status(409).json({ error: 'Already enrolled in this course.' });

  db.enrollments.push({ id: id('e'), courseId: course.id, studentId });
  save();
  res.status(201).json({ message: 'Enrolled.', course: courseView(course, studentId) });
});

module.exports = router;
