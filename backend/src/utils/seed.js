'use strict';

const bcrypt = require('bcryptjs');
const prisma = require('./prisma');

async function seed() {
  console.log('🌱 Seeding database…');

  // Check if already seeded
  const existingUser = await prisma.user.findFirst();
  if (existingUser) {
    console.log('✅ Database already seeded — skipping.');
    return;
  }

  const hash = (pw) => bcrypt.hashSync(pw, 10);

  // Create users
  const [admin, faculty1, faculty2, student1, student2, student3] = await Promise.all([
    prisma.user.create({ data: { name: 'Priya Nair',       email: 'admin@university.edu',    passwordHash: hash('admin123'),   role: 'admin'   } }),
    prisma.user.create({ data: { name: 'Dr. Elena Cross',  email: 'faculty1@university.edu', passwordHash: hash('faculty123'), role: 'faculty' } }),
    prisma.user.create({ data: { name: 'Dr. Raj Malhotra', email: 'faculty2@university.edu', passwordHash: hash('faculty123'), role: 'faculty' } }),
    prisma.user.create({ data: { name: 'Amara Okafor',     email: 'student1@university.edu', passwordHash: hash('student123'), role: 'student' } }),
    prisma.user.create({ data: { name: 'Kenji Watanabe',   email: 'student2@university.edu', passwordHash: hash('student123'), role: 'student' } }),
    prisma.user.create({ data: { name: 'Sofia Reyes',      email: 'student3@university.edu', passwordHash: hash('student123'), role: 'student' } }),
  ]);

  console.log('👤 Users created');

  // Create courses
  const [btech101, bca201] = await Promise.all([
    prisma.course.create({ data: { code: 'BTECH101', title: 'Introduction to Engineering',  facultyId: faculty1.id, description: 'Foundations of engineering principles.' } }),
    prisma.course.create({ data: { code: 'BCA201', title: 'Data Structures using C',        facultyId: faculty2.id, description: 'Core data structures and algorithms.' } }),
  ]);

  console.log('📚 Courses created');

  // Enrollments
  await prisma.enrollment.createMany({
    data: [
      { courseId: btech101.id, studentId: student1.id },
      { courseId: btech101.id, studentId: student2.id },
      { courseId: bca201.id, studentId: student1.id },
      { courseId: bca201.id, studentId: student3.id },
    ],
  });

  console.log('📋 Enrollments created');

  // Assignments
  const [a1, a2] = await Promise.all([
    prisma.assignment.create({ data: { courseId: btech101.id, title: 'Engineering Ethics Essay',   description: 'Discuss the role of ethics in engineering design.', dueDate: '2026-08-20' } }),
    prisma.assignment.create({ data: { courseId: bca201.id, title: 'Implement Linked List',  description: 'Write a C program to implement a doubly linked list.', dueDate: '2026-08-18' } }),
  ]);

  console.log('📝 Assignments created');

  // One existing submission + grade
  await prisma.submission.create({
    data: {
      assignmentId: a1.id,
      studentId: student1.id,
      content: 'Draft submitted focusing on safety and reliability.',
      grade: 88,
      feedback: 'Solid analysis; expand on real-world case studies.',
      submittedAt: new Date('2026-08-15T10:00:00Z'),
    },
  });

  console.log('📤 Submissions created');

  // Attendance records
  await prisma.attendance.createMany({
    data: [
      { courseId: btech101.id, studentId: student1.id, date: '2026-08-01', status: 'present' },
      { courseId: btech101.id, studentId: student2.id, date: '2026-08-01', status: 'absent'  },
      { courseId: btech101.id, studentId: student1.id, date: '2026-08-03', status: 'present' },
      { courseId: btech101.id, studentId: student2.id, date: '2026-08-03', status: 'present' },
    ],
  });

  console.log('📅 Attendance created');

  // Results
  await prisma.result.createMany({
    data: [
      { courseId: btech101.id, studentId: student1.id, marks: 91, grade: 'A'  },
      { courseId: bca201.id, studentId: student1.id, marks: 78, grade: 'B+' },
    ],
  });

  console.log('🏆 Results created');

  // Notification
  await prisma.notification.create({
    data: {
      userId: student1.id,
      message: 'New assignment posted in BTECH101: Engineering Ethics Essay.',
    },
  });

  console.log('🔔 Notifications created');
  console.log('✅ Database seeded successfully!');
  console.log('\nDemo accounts:');
  console.log('  Student  → student1@university.edu / student123');
  console.log('  Faculty  → faculty1@university.edu / faculty123');
  console.log('  Admin    → admin@university.edu    / admin123');
}

seed()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
