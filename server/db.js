const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const DB_PATH = path.join(__dirname, 'data.json');

function id(prefix) {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

function seed() {
  const passwordHash = (pw) => bcrypt.hashSync(pw, 8);

  const users = [
    { id: 'u_admin', name: 'Priya Nair', email: 'admin@university.edu', role: 'admin', passwordHash: passwordHash('admin123') },
    { id: 'u_faculty1', name: 'Dr. Elena Cross', email: 'faculty1@university.edu', role: 'faculty', passwordHash: passwordHash('faculty123') },
    { id: 'u_faculty2', name: 'Dr. Raj Malhotra', email: 'faculty2@university.edu', role: 'faculty', passwordHash: passwordHash('faculty123') },
    { id: 'u_student1', name: 'Amara Okafor', email: 'student1@university.edu', role: 'student', passwordHash: passwordHash('student123') },
    { id: 'u_student2', name: 'Kenji Watanabe', email: 'student2@university.edu', role: 'student', passwordHash: passwordHash('student123') },
    { id: 'u_student3', name: 'Sofia Reyes', email: 'student3@university.edu', role: 'student', passwordHash: passwordHash('student123') },
  ];

  const courses = [
    { id: 'c_cs301', code: 'CS301', title: 'Distributed Systems', facultyId: 'u_faculty1', description: 'Consensus, replication, and fault tolerance in large-scale systems.' },
    { id: 'c_ma210', code: 'MA210', title: 'Linear Algebra', facultyId: 'u_faculty2', description: 'Vector spaces, matrices, eigenvalues, and applications.' },
  ];

  const enrollments = [
    { id: id('e'), courseId: 'c_cs301', studentId: 'u_student1' },
    { id: id('e'), courseId: 'c_cs301', studentId: 'u_student2' },
    { id: id('e'), courseId: 'c_ma210', studentId: 'u_student1' },
    { id: id('e'), courseId: 'c_ma210', studentId: 'u_student3' },
  ];

  const assignments = [
    { id: 'a_cs301_1', courseId: 'c_cs301', title: 'Raft Consensus Report', description: 'Summarize leader election and log replication in Raft.', dueDate: '2026-08-20' },
    { id: 'a_ma210_1', courseId: 'c_ma210', title: 'Eigenvalue Problem Set', description: 'Problems 1-12 from Chapter 6.', dueDate: '2026-08-18' },
  ];

  const submissions = [
    { id: id('sub'), assignmentId: 'a_cs301_1', studentId: 'u_student1', submittedAt: '2026-08-15T10:00:00Z', content: 'Draft submitted.', grade: 88, feedback: 'Solid analysis of leader election; expand on log compaction.' },
  ];

  const attendance = [
    { id: id('att'), courseId: 'c_cs301', studentId: 'u_student1', date: '2026-08-01', status: 'present' },
    { id: id('att'), courseId: 'c_cs301', studentId: 'u_student2', date: '2026-08-01', status: 'absent' },
    { id: id('att'), courseId: 'c_cs301', studentId: 'u_student1', date: '2026-08-03', status: 'present' },
    { id: id('att'), courseId: 'c_cs301', studentId: 'u_student2', date: '2026-08-03', status: 'present' },
  ];

  const results = [
    { id: id('res'), courseId: 'c_cs301', studentId: 'u_student1', marks: 91, grade: 'A' },
    { id: id('res'), courseId: 'c_ma210', studentId: 'u_student1', marks: 78, grade: 'B+' },
  ];

  const notifications = [
    { id: id('n'), userId: 'u_student1', message: 'New assignment posted in CS301: Raft Consensus Report.', createdAt: '2026-08-10T09:00:00Z', read: false },
  ];

  return { users, courses, enrollments, attendance, assignments, submissions, results, notifications, videos: [] };
}

function load() {
  if (!fs.existsSync(DB_PATH)) {
    const initial = seed();
    fs.writeFileSync(DB_PATH, JSON.stringify(initial, null, 2));
    return initial;
  }
  return JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
}

let data = load();

function save() {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

function reset() {
  data = seed();
  save();
  return data;
}

module.exports = {
  get db() { return data; },
  save,
  reset,
  id,
};
