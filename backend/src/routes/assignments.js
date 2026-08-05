const express = require('express');
const prisma = require('../utils/prisma');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

function ownsCourse(req, course) {
  return req.user.role === 'admin' || (req.user.role === 'faculty' && course.facultyId === req.user.id);
}

// GET /assignments/course/:courseId
router.get('/course/:courseId', async (req, res, next) => {
  try {
    const course = await prisma.course.findUnique({ where: { id: req.params.courseId } });
    if (!course) return res.status(404).json({ error: 'Course not found.' });

    const rawAssignments = await prisma.assignment.findMany({
      where: { courseId: course.id },
      orderBy: { dueDate: 'asc' },
      include: {
        submissions: {
          include: { student: { select: { id: true, name: true } } },
        },
      },
    });

    const assignments = rawAssignments.map((a) => {
      if (req.user.role === 'student') {
        const mySubmission = a.submissions.find((s) => s.studentId === req.user.id) || null;
        const { submissions: _, ...rest } = a;
        return { ...rest, mySubmission };
      }
      return {
        ...a,
        submissionCount: a.submissions.length,
        submissions: a.submissions.map((s) => ({
          ...s,
          studentName: s.student?.name ?? 'Unknown',
        })),
      };
    });

    res.json({ assignments });
  } catch (err) {
    next(err);
  }
});

// POST /assignments/course/:courseId — create (faculty / admin)
router.post('/course/:courseId', authorize('faculty', 'admin'), async (req, res, next) => {
  try {
    const course = await prisma.course.findUnique({ where: { id: req.params.courseId } });
    if (!course) return res.status(404).json({ error: 'Course not found.' });
    if (!ownsCourse(req, course)) {
      return res.status(403).json({ error: 'You can only add assignments to your own courses.' });
    }

    const { title, description, dueDate } = req.body || {};
    if (!title || !dueDate) {
      return res.status(400).json({ error: 'title and dueDate are required.' });
    }

    const assignment = await prisma.assignment.create({
      data: { courseId: course.id, title, description: description || '', dueDate },
    });

    res.status(201).json({ assignment });
  } catch (err) {
    next(err);
  }
});

// POST /assignments/:assignmentId/submit — submit (student)
router.post('/:assignmentId/submit', authorize('student'), async (req, res, next) => {
  try {
    const assignment = await prisma.assignment.findUnique({
      where: { id: req.params.assignmentId },
    });
    if (!assignment) return res.status(404).json({ error: 'Assignment not found.' });

    const enrolled = await prisma.enrollment.findUnique({
      where: {
        courseId_studentId: { courseId: assignment.courseId, studentId: req.user.id },
      },
    });
    if (!enrolled) {
      return res.status(403).json({ error: 'You must be enrolled in this course to submit.' });
    }

    const { content } = req.body || {};
    if (!content) {
      return res.status(400).json({ error: 'content is required (text submission for this demo).' });
    }

    const submission = await prisma.submission.upsert({
      where: { assignmentId_studentId: { assignmentId: assignment.id, studentId: req.user.id } },
      update: { content, submittedAt: new Date() },
      create: {
        assignmentId: assignment.id,
        studentId: req.user.id,
        content,
        submittedAt: new Date(),
      },
    });

    res.status(201).json({ submission });
  } catch (err) {
    next(err);
  }
});

// POST /assignments/submissions/:submissionId/grade — grade (faculty / admin)
router.post('/submissions/:submissionId/grade', authorize('faculty', 'admin'), async (req, res, next) => {
  try {
    const submission = await prisma.submission.findUnique({
      where: { id: req.params.submissionId },
      include: { assignment: { include: { course: true } } },
    });
    if (!submission) return res.status(404).json({ error: 'Submission not found.' });

    if (!ownsCourse(req, submission.assignment.course)) {
      return res.status(403).json({ error: 'You can only grade submissions for your own courses.' });
    }

    const { grade, feedback } = req.body || {};
    if (grade === undefined) return res.status(400).json({ error: 'grade is required.' });

    const updated = await prisma.submission.update({
      where: { id: submission.id },
      data: { grade: Number(grade), feedback: feedback || '' },
    });

    res.json({ submission: updated });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
