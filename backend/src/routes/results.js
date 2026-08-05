const express = require('express');
const prisma = require('../utils/prisma');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

const GRADE_POINTS = {
  'A+': 4.0, A: 4.0, 'A-': 3.7,
  'B+': 3.3, B: 3.0, 'B-': 2.7,
  'C+': 2.3, C: 2.0,
  D: 1.0, F: 0.0,
};

function ownsCourse(req, course) {
  return req.user.role === 'admin' || (req.user.role === 'faculty' && course.facultyId === req.user.id);
}

// POST /results/course/:courseId — enter / update a result (faculty / admin)
router.post('/course/:courseId', authorize('faculty', 'admin'), async (req, res, next) => {
  try {
    const course = await prisma.course.findUnique({ where: { id: req.params.courseId } });
    if (!course) return res.status(404).json({ error: 'Course not found.' });
    if (!ownsCourse(req, course)) {
      return res.status(403).json({ error: 'You can only enter results for your own courses.' });
    }

    const { studentId, marks, grade } = req.body || {};
    if (!studentId || marks === undefined || !grade) {
      return res.status(400).json({ error: 'studentId, marks, and grade are required.' });
    }

    await prisma.result.upsert({
      where: { courseId_studentId: { courseId: course.id, studentId } },
      update: { marks: Number(marks), grade },
      create: { courseId: course.id, studentId, marks: Number(marks), grade },
    });

    res.status(201).json({ message: 'Result saved.' });
  } catch (err) {
    next(err);
  }
});

// GET /results/course/:courseId — gradebook (faculty / admin)
router.get('/course/:courseId', authorize('faculty', 'admin'), async (req, res, next) => {
  try {
    const course = await prisma.course.findUnique({ where: { id: req.params.courseId } });
    if (!course) return res.status(404).json({ error: 'Course not found.' });
    if (!ownsCourse(req, course)) {
      return res.status(403).json({ error: 'You can only view results for your own courses.' });
    }

    const results = await prisma.result.findMany({
      where: { courseId: course.id },
      include: { student: { select: { id: true, name: true } } },
    });

    res.json({
      results: results.map((r) => ({
        ...r,
        studentName: r.student?.name ?? 'Unknown',
      })),
    });
  } catch (err) {
    next(err);
  }
});

// GET /results/me — student's own transcript with GPA
router.get('/me', authorize('student'), async (req, res, next) => {
  try {
    const results = await prisma.result.findMany({
      where: { studentId: req.user.id },
      include: { course: { select: { code: true, title: true } } },
    });

    const enriched = results.map((r) => ({
      ...r,
      courseCode: r.course?.code ?? '—',
      courseTitle: r.course?.title ?? 'Unknown course',
    }));

    const points = enriched
      .map((r) => GRADE_POINTS[r.grade])
      .filter((p) => p !== undefined);
    const gpa = points.length
      ? +(points.reduce((a, b) => a + b, 0) / points.length).toFixed(2)
      : null;

    res.json({ results: enriched, gpa });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
