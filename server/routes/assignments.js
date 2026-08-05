const express = require('express');
const { db, id, save } = require('../db');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

function ownsCourse(req, course) {
  return req.user.role === 'admin' || (req.user.role === 'faculty' && course.facultyId === req.user.id);
}

// List assignments for a course
router.get('/course/:courseId', (req, res) => {
  const course = db.courses.find((c) => c.id === req.params.courseId);
  if (!course) return res.status(404).json({ error: 'Course not found.' });

  const assignments = db.assignments
    .filter((a) => a.courseId === course.id)
    .map((a) => {
      if (req.user.role === 'student') {
        const submission = db.submissions.find((s) => s.assignmentId === a.id && s.studentId === req.user.id);
        return { ...a, mySubmission: submission || null };
      }
      const submissions = db.submissions
        .filter((s) => s.assignmentId === a.id)
        .map((s) => {
          const student = db.users.find((u) => u.id === s.studentId);
          return { ...s, studentName: student ? student.name : 'Unknown' };
        });
      return { ...a, submissionCount: submissions.length, submissions };
    });

  res.json({ assignments });
});

// Create an assignment (faculty/admin, own course only)
router.post('/course/:courseId', authorize('faculty', 'admin'), (req, res) => {
  const course = db.courses.find((c) => c.id === req.params.courseId);
  if (!course) return res.status(404).json({ error: 'Course not found.' });
  if (!ownsCourse(req, course)) return res.status(403).json({ error: 'You can only add assignments to your own courses.' });

  const { title, description, dueDate } = req.body || {};
  if (!title || !dueDate) return res.status(400).json({ error: 'title and dueDate are required.' });

  const assignment = { id: id('a'), courseId: course.id, title, description: description || '', dueDate };
  db.assignments.push(assignment);
  save();
  res.status(201).json({ assignment });
});

// Submit an assignment (student)
router.post('/:assignmentId/submit', authorize('student'), (req, res) => {
  const assignment = db.assignments.find((a) => a.id === req.params.assignmentId);
  if (!assignment) return res.status(404).json({ error: 'Assignment not found.' });

  const enrolled = db.enrollments.some((e) => e.courseId === assignment.courseId && e.studentId === req.user.id);
  if (!enrolled) return res.status(403).json({ error: 'You must be enrolled in this course to submit.' });

  const { content } = req.body || {};
  if (!content) return res.status(400).json({ error: 'content is required (text submission for this demo).' });

  const existing = db.submissions.find((s) => s.assignmentId === assignment.id && s.studentId === req.user.id);
  if (existing) {
    existing.content = content;
    existing.submittedAt = new Date().toISOString();
    save();
    return res.json({ submission: existing, message: 'Submission updated.' });
  }

  const submission = {
    id: id('sub'),
    assignmentId: assignment.id,
    studentId: req.user.id,
    content,
    submittedAt: new Date().toISOString(),
    grade: null,
    feedback: null,
  };
  db.submissions.push(submission);
  save();
  res.status(201).json({ submission });
});

// Grade a submission (faculty/admin)
router.post('/submissions/:submissionId/grade', authorize('faculty', 'admin'), (req, res) => {
  const submission = db.submissions.find((s) => s.id === req.params.submissionId);
  if (!submission) return res.status(404).json({ error: 'Submission not found.' });

  const assignment = db.assignments.find((a) => a.id === submission.assignmentId);
  const course = db.courses.find((c) => c.id === assignment.courseId);
  if (!ownsCourse(req, course)) return res.status(403).json({ error: 'You can only grade submissions for your own courses.' });

  const { grade, feedback } = req.body || {};
  if (grade === undefined) return res.status(400).json({ error: 'grade is required.' });

  submission.grade = grade;
  submission.feedback = feedback || '';
  save();
  res.json({ submission });
});

module.exports = router;
