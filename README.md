# Jadeja University — Smart Portal

Three-tier university LMS:

| Layer        | Technology                          | Directory   |
|--------------|-------------------------------------|-------------|
| **Frontend** | React 19 + Vite + React Router      | `frontend/` |
| **Backend**  | Node.js + Express + JWT Auth        | `backend/`  |
| **Database** | PostgreSQL (Docker) via Prisma ORM  | —           |

---

## Quick Start

### 1. Start PostgreSQL in Docker

If the container does not exist yet:

```bash
docker run --name jadeja-postgres \
  -e POSTGRES_USER=meetesh \
  -e POSTGRES_PASSWORD=1234 \
  -e POSTGRES_DB=jadeja-project \
  -p 5432:5432 \
  -d postgres:16
```

If it already exists:

```bash
docker start jadeja-postgres
```

`backend/.env` should match:

```env
DATABASE_URL="postgresql://meetesh:1234@localhost:5432/jadeja-project"
JWT_SECRET="jadeja-super-secret-change-me"
PORT=4000
FRONTEND_URL="http://localhost:5173"
```

### 2. Setup & seed the database

```bash
cd backend
npm install
npx prisma migrate deploy
npm run db:seed
```

### 3. Start the backend (port 4000)

```bash
cd backend
npm run dev
# or: npm start
```

On boot the API ensures the static admin account exists.

### 4. Start the frontend (port 5173)

```bash
cd frontend
npm install
npm run dev
```

Open **http://localhost:5173** — unauthenticated users are redirected to **/signin**.

| Path       | Purpose                          |
|------------|----------------------------------|
| `/signin`  | Sign in with an existing account |
| `/login`   | Redirects to `/signin`           |
| `/signup`  | Redirects to `/signin` (disabled)|

---

## Auth & roles

### Static admin

| Email              | Password    |
|--------------------|-------------|
| `admin@jadeja.edu` | `Admin@123` |

- Defined in `backend/src/config/admin.js`
- Upserted automatically on API start
- **Only admin** can create **students** and **teachers (faculty)** from the Users page
- There is **no public signup**
- Admin cannot create additional admin accounts via the API

### Sample seed accounts

After `npm run db:seed`:

| Role     | Email                       | Password     |
|----------|-----------------------------|--------------|
| Faculty  | `faculty1@university.edu`   | `faculty123` |
| Faculty  | `faculty2@university.edu`   | `faculty123` |
| Student  | `student1@university.edu`   | `student123` |
| Student  | `student2@university.edu`   | `student123` |
| Student  | `student3@university.edu`   | `student123` |

Seed also creates sample courses, enrollments, assignments, attendance, and results.

### How faculty / student LMS connects

- A **faculty** user only sees courses where `course.facultyId` = their user id
- A **student** only appears on a course roster after an **enrollment** row exists
- Creating a user alone does **not** enroll them or assign courses — use Courses enroll (students) or assign/create courses for faculty

---

## Project Structure

```
jadeja-university-main/
├── frontend/
│   └── src/
│       ├── api.js
│       ├── App.jsx                 # Router + auth gate
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
│           ├── ResultsPage.jsx
│           └── UsersPage.jsx       # Admin-only
│
├── backend/
│   ├── prisma/
│   │   └── schema.prisma
│   └── src/
│       ├── index.js
│       ├── config/
│       │   └── admin.js            # Static admin credentials
│       ├── middleware/
│       │   └── auth.js
│       ├── routes/
│       │   ├── auth.js
│       │   ├── courses.js
│       │   ├── attendance.js
│       │   ├── assignments.js
│       │   ├── results.js
│       │   └── users.js            # Admin-only user management
│       └── utils/
│           ├── prisma.js
│           ├── ensureAdmin.js
│           └── seed.js
│
└── (PostgreSQL in Docker — see Quick Start §1)
```

---

## API Reference

All endpoints under `/api/v1`. Except `/auth/login` and `/health`, all require `Authorization: Bearer <token>`.

```
POST   /auth/login
GET    /auth/me

GET    /users                            (admin)
POST   /users                            (admin — student|faculty only)

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

GET    /health
```
