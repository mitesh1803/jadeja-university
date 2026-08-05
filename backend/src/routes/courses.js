const express = require('express');
const prisma = require('../utils/prisma');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

// Helper: build public course view
async function courseView(course, viewerId) {
  const enrolledCount = await prisma.enrollment.count({ where: { courseId: course.id } });
  const isEnrolled = viewerId
    ? !!(await prisma.enrollment.findUnique({ where: { courseId_studentId: { courseId: course.id, studentId: viewerId } } }))
    : false;
  return {
    id: course.id,
    code: course.code,
    title: course.title,
    description: course.description,
    facultyId: course.facultyId,
    facultyName: course.faculty?.name ?? 'Unassigned',
    enrolledCount,
    isEnrolled,
  };
}

// GET /courses — list (scoped by role)
router.get('/', async (req, res, next) => {
  try {
    const { role, id: uid } = req.user;
    const where = role === 'faculty' ? { facultyId: uid } : {};

    const courses = await prisma.course.findMany({
      where,
      include: { faculty: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'asc' },
    });

    const views = await Promise.all(courses.map((c) => courseView(c, uid)));
    res.json({ courses: views });
  } catch (err) {
    next(err);
  }
});

// POST /courses — create (faculty / admin)
router.post('/', authorize('admin', 'faculty'), async (req, res, next) => {
  try {
    const { code, title, description } = req.body || {};
    if (!code || !title) {
      return res.status(400).json({ error: 'Course code and title are required.' });
    }
    const facultyId =
      req.user.role === 'faculty' ? req.user.id : req.body.facultyId || req.user.id;

    const course = await prisma.course.create({
      data: { code, title, description: description || '', facultyId },
      include: { faculty: { select: { id: true, name: true } } },
    });

    res.status(201).json({ course: await courseView(course, req.user.id) });
  } catch (err) {
    if (err.code === 'P2002') {
      return res.status(409).json({ error: 'A course with that code already exists.' });
    }
    next(err);
  }
});

// GET /courses/:courseId — detail + optional roster
router.get('/:courseId', async (req, res, next) => {
  try {
    const course = await prisma.course.findUnique({
      where: { id: req.params.courseId },
      include: { faculty: { select: { id: true, name: true } } },
    });
    if (!course) return res.status(404).json({ error: 'Course not found.' });

    const { role, id: uid } = req.user;
    if (role === 'faculty' && course.facultyId !== uid) {
      return res.status(403).json({ error: 'You can only view rosters for your own courses.' });
    }

    let roster;
    if (role !== 'student') {
      const enrollments = await prisma.enrollment.findMany({
        where: { courseId: course.id },
        include: { student: { select: { id: true, name: true, email: true } } },
      });
      roster = enrollments.map((e) => e.student);
    }

    res.json({ course: await courseView(course, uid), roster });
  } catch (err) {
    next(err);
  }
});

// POST /courses/:courseId/enroll
router.post('/:courseId/enroll', async (req, res, next) => {
  try {
    const course = await prisma.course.findUnique({ where: { id: req.params.courseId } });
    if (!course) return res.status(404).json({ error: 'Course not found.' });

    if (req.user.role === 'faculty') {
      return res.status(403).json({ error: 'Faculty cannot enroll students directly.' });
    }

    const studentId = req.user.role === 'student' ? req.user.id : req.body.studentId;
    if (!studentId) return res.status(400).json({ error: 'studentId is required.' });

    await prisma.enrollment.create({ data: { courseId: course.id, studentId } });

    const updatedCourse = await prisma.course.findUnique({
      where: { id: course.id },
      include: { faculty: { select: { id: true, name: true } } },
    });

    res.status(201).json({
      message: 'Enrolled.',
      course: await courseView(updatedCourse, studentId),
    });
  } catch (err) {
    if (err.code === 'P2002') {
      return res.status(409).json({ error: 'Already enrolled in this course.' });
    }
    next(err);
  }
});

module.exports = router;
