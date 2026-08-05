'use strict';

const bcrypt = require('bcryptjs');
const prisma = require('./prisma');
const { STATIC_ADMIN } = require('../config/admin');
const { ensureStaticAdmin } = require('./ensureAdmin');

async function seed() {
  console.log('🌱 Seeding database…');

  await ensureStaticAdmin();

  // Skip only when academic sample data is already present
  const existingCourse = await prisma.course.findFirst();
  if (existingCourse) {
    console.log('✅ Sample data already present — skipping.');
    console.log(`\nStatic admin: ${STATIC_ADMIN.email} / ${STATIC_ADMIN.password}`);
    return;
  }

  const hash = (pw) => bcrypt.hashSync(pw, 10);

  async function upsertUser({ name, email, password, role }) {
    return prisma.user.upsert({
      where: { email },
      create: { name, email, passwordHash: hash(password), role },
      update: {},
    });
  }

  const [faculty1, faculty2, student1, student2, student3] = await Promise.all([
    upsertUser({ name: 'Dr. Elena Cross',  email: 'faculty1@university.edu', password: 'faculty123', role: 'faculty' }),
    upsertUser({ name: 'Dr. Raj Malhotra', email: 'faculty2@university.edu', password: 'faculty123', role: 'faculty' }),
    upsertUser({ name: 'Amara Okafor',     email: 'student1@university.edu', password: 'student123', role: 'student' }),
    upsertUser({ name: 'Kenji Watanabe',   email: 'student2@university.edu', password: 'student123', role: 'student' }),
    upsertUser({ name: 'Sofia Reyes',      email: 'student3@university.edu', password: 'student123', role: 'student' }),
  ]);

  console.log('👤 Sample users ready');

  const [btech101, bca201, mba301] = await Promise.all([
    prisma.course.create({
      data: {
        code: 'BTECH101',
        title: 'Introduction to Engineering',
        facultyId: faculty1.id,
        description: 'Foundations of engineering principles.',
      },
    }),
    prisma.course.create({
      data: {
        code: 'BCA201',
        title: 'Data Structures using C',
        facultyId: faculty2.id,
        description: 'Core data structures and algorithms.',
      },
    }),
    prisma.course.create({
      data: {
        code: 'MBA301',
        title: 'Business Communication',
        facultyId: faculty1.id,
        description: 'Professional writing and presentation skills.',
      },
    }),
  ]);

  console.log('📚 Courses created');

  await prisma.enrollment.createMany({
    data: [
      { courseId: btech101.id, studentId: student1.id },
      { courseId: btech101.id, studentId: student2.id },
      { courseId: bca201.id, studentId: student1.id },
      { courseId: bca201.id, studentId: student3.id },
      { courseId: mba301.id, studentId: student2.id },
      { courseId: mba301.id, studentId: student3.id },
    ],
    skipDuplicates: true,
  });

  console.log('📋 Enrollments created');

  const [a1, a2, a3] = await Promise.all([
    prisma.assignment.create({
      data: {
        courseId: btech101.id,
        title: 'Engineering Ethics Essay',
        description: 'Discuss the role of ethics in engineering design.',
        dueDate: '2026-08-20',
      },
    }),
    prisma.assignment.create({
      data: {
        courseId: bca201.id,
        title: 'Implement Linked List',
        description: 'Write a C program to implement a doubly linked list.',
        dueDate: '2026-08-18',
      },
    }),
    prisma.assignment.create({
      data: {
        courseId: mba301.id,
        title: 'Pitch Deck Draft',
        description: 'Prepare a 5-slide pitch for a campus startup idea.',
        dueDate: '2026-08-25',
      },
    }),
  ]);

  console.log('📝 Assignments created');

  await prisma.submission.createMany({
    data: [
      {
        assignmentId: a1.id,
        studentId: student1.id,
        content: 'Draft submitted focusing on safety and reliability.',
        grade: 88,
        feedback: 'Solid analysis; expand on real-world case studies.',
        submittedAt: new Date('2026-08-15T10:00:00Z'),
      },
      {
        assignmentId: a2.id,
        studentId: student3.id,
        content: 'Doubly linked list with insert, delete, and traverse.',
        grade: 92,
        feedback: 'Clean code and good edge-case handling.',
        submittedAt: new Date('2026-08-16T14:30:00Z'),
      },
    ],
  });

  console.log('📤 Submissions created');

  await prisma.attendance.createMany({
    data: [
      { courseId: btech101.id, studentId: student1.id, date: '2026-08-01', status: 'present' },
      { courseId: btech101.id, studentId: student2.id, date: '2026-08-01', status: 'absent'  },
      { courseId: btech101.id, studentId: student1.id, date: '2026-08-03', status: 'present' },
      { courseId: btech101.id, studentId: student2.id, date: '2026-08-03', status: 'present' },
      { courseId: bca201.id, studentId: student1.id, date: '2026-08-02', status: 'present' },
      { courseId: bca201.id, studentId: student3.id, date: '2026-08-02', status: 'absent'  },
      { courseId: mba301.id, studentId: student2.id, date: '2026-08-04', status: 'present' },
      { courseId: mba301.id, studentId: student3.id, date: '2026-08-04', status: 'present' },
    ],
    skipDuplicates: true,
  });

  console.log('📅 Attendance created');

  await prisma.result.createMany({
    data: [
      { courseId: btech101.id, studentId: student1.id, marks: 91, grade: 'A'  },
      { courseId: bca201.id, studentId: student1.id, marks: 78, grade: 'B+' },
      { courseId: bca201.id, studentId: student3.id, marks: 85, grade: 'A'  },
      { courseId: mba301.id, studentId: student2.id, marks: 80, grade: 'A-' },
    ],
    skipDuplicates: true,
  });

  console.log('🏆 Results created');

  await prisma.notification.createMany({
    data: [
      {
        userId: student1.id,
        message: 'New assignment posted in BTECH101: Engineering Ethics Essay.',
      },
      {
        userId: student3.id,
        message: 'Your Linked List assignment was graded: 92.',
      },
      {
        userId: faculty1.id,
        message: '2 new enrollments in MBA301 this week.',
      },
    ],
  });

  console.log('🔔 Notifications created');
  console.log('✅ Database seeded successfully!');
  console.log(`\nStatic admin: ${STATIC_ADMIN.email} / ${STATIC_ADMIN.password}`);
  console.log('Sample logins (password in parentheses):');
  console.log('  faculty1@university.edu (faculty123)');
  console.log('  student1@university.edu (student123)');
}

seed()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
