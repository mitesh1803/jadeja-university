const express = require('express');
const prisma = require('../utils/prisma');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

// POST /attendance/:courseId — mark attendance (faculty / admin)
router.post('/:courseId', authorize('faculty', 'admin'), async (req, res, next) => {
  try {
    const course = await prisma.course.findUnique({ where: { id: req.params.courseId } });
    if (!course) return res.status(404).json({ error: 'Course not found.' });

    if (req.user.role === 'faculty' && course.facultyId !== req.user.id) {
      return res.status(403).json({ error: 'You can only manage attendance for your own courses.' });
    }

    const { date, records } = req.body || {};
    if (!date || !Array.isArray(records) || records.length === 0) {
      return res.status(400).json({ error: 'date and a non-empty records array are required.' });
    }

    const saved = await Promise.all(
      records.map(async ({ studentId, status }) => {
        if (!['present', 'absent'].includes(status)) {
          throw new Error(`Invalid status "${status}" for student ${studentId}.`);
        }
        return prisma.attendance.upsert({
          where: { courseId_studentId_date: { courseId: course.id, studentId, date } },
          update: { status },
          create:  { courseId: course.id, studentId, date, status },
        });
      })
    );

    res.status(201).json({ records: saved });
  } catch (err) {
    next(err);
  }
});

// GET /attendance/:courseId — view attendance
router.get('/:courseId', async (req, res, next) => {
  try {
    const course = await prisma.course.findUnique({ where: { id: req.params.courseId } });
    if (!course) return res.status(404).json({ error: 'Course not found.' });

    if (req.user.role === 'student') {
      const records = await prisma.attendance.findMany({
        where: { courseId: course.id, studentId: req.user.id },
        orderBy: { date: 'desc' },
      });
      const present = records.filter((r) => r.status === 'present').length;
      const total = records.length;
      return res.json({
        records,
        summary: { total, present, percentage: total ? Math.round((present / total) * 100) : 0 },
      });
    }

    // Faculty / admin ownership check
    if (req.user.role === 'faculty' && course.facultyId !== req.user.id) {
      return res.status(403).json({ error: 'You can only view attendance for your own courses.' });
    }

    const records = await prisma.attendance.findMany({
      where: { courseId: course.id },
      include: { student: { select: { id: true, name: true } } },
      orderBy: { date: 'desc' },
    });

    // Build per-student summary
    const byStudent = {};
    for (const r of records) {
      if (!byStudent[r.studentId]) {
        byStudent[r.studentId] = { name: r.student.name, total: 0, present: 0 };
      }
      byStudent[r.studentId].total += 1;
      if (r.status === 'present') byStudent[r.studentId].present += 1;
    }

    const summary = Object.entries(byStudent).map(([studentId, s]) => ({
      studentId,
      name: s.name,
      total: s.total,
      present: s.present,
      percentage: s.total ? Math.round((s.present / s.total) * 100) : 0,
    }));

    res.json({ records, summary });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
