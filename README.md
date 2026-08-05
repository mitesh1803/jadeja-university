# Jadeja University — Smart Portal

A fully restructured three-tier architecture:

| Layer       | Technology                                   | Directory    |
|-------------|----------------------------------------------|--------------|
| **Frontend**| React 18 + Vite                              | `frontend/`  |
| **Backend** | Node.js + Express + JWT Auth                 | `backend/`   |
| **Database**| SQLite via **Prisma ORM**                    | `db/`        |

---

## Quick Start

### 1. Setup & seed the database

```bash
cd backend
npm install
npx prisma migrate deploy
node src/utils/seed.js
```

### 2. Start the backend (port 4000)

```bash
cd backend
npm run dev
```

### 3. Start the frontend (port 5173)

```bash
cd frontend
npm install
npm run dev
```

Open **http://localhost:5173**

---

## Demo Accounts

| Role    | Email                       | Password    |
|---------|-----------------------------|-------------|
| Student | student1@university.edu     | student123  |
| Faculty | faculty1@university.edu     | faculty123  |
| Admin   | admin@university.edu        | admin123    |

---

## Project Structure

```
university-portal/
├── frontend/                 # React + Vite
│   └── src/
│       ├── api.js            # Fetch utility (JWT injection)
│       ├── App.jsx           # Root component + routing
│       ├── context/
│       │   ├── AuthContext.jsx
│       │   └── ToastContext.jsx
│       ├── components/
│       │   ├── Sidebar.jsx
│       │   └── UI.jsx
│       └── pages/
│           ├── LoginPage.jsx
│           ├── CoursesPage.jsx
│           ├── AttendancePage.jsx
│           ├── AssignmentsPage.jsx
│           └── ResultsPage.jsx
│
├── backend/                  # Node.js + Express
│   ├── prisma/
│   │   └── schema.prisma     # Database models
│   └── src/
│       ├── index.js          # Express entry point
│       ├── middleware/auth.js # JWT verify + role guard
│       ├── routes/
│       │   ├── auth.js
│       │   ├── courses.js
│       │   ├── attendance.js
│       │   ├── assignments.js
│       │   └── results.js
│       └── utils/
│           ├── prisma.js     # Prisma client singleton
│           └── seed.js       # Demo data seeder
│
└── db/
    └── jadeja.db             # SQLite database (auto-created)
```

---

## API Reference

All endpoints under `/api/v1`. Except `/auth/login`, all require `Authorization: Bearer <token>`.

```
POST   /auth/login
GET    /auth/me

GET    /courses
POST   /courses                          (faculty/admin)
GET    /courses/:courseId
POST   /courses/:courseId/enroll

GET    /attendance/:courseId
POST   /attendance/:courseId             (faculty/admin)

GET    /assignments/course/:courseId
POST   /assignments/course/:courseId     (faculty/admin)
POST   /assignments/:assignmentId/submit (student)
POST   /assignments/submissions/:id/grade (faculty/admin)

GET    /results/course/:courseId         (faculty/admin)
POST   /results/course/:courseId         (faculty/admin)
GET    /results/me                       (student)
```
