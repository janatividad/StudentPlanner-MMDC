# Backend Architecture (Roadmap & Specifications)

> **Priority Notice:**
> The current development priority is focused 100% on the **Frontend UI** with client-side state persistence (`localStorage`).
> This backend directory outlines the planned API architecture and database integration for subsequent development phases.

---

## 📁 Directory Structure
```
backend/
├── src/
│   ├── config/          # Environment variables & database connection configuration
│   ├── controllers/     # Request handlers (parsing input, calling services, responding)
│   ├── models/          # Data schemas / ORM models (Subjects, Projects, Assignments)
│   ├── routes/          # API route declarations (REST / GraphQL)
│   ├── services/        # Business logic & database operations
│   └── server.js        # Server entry point
├── package.json
└── README.md
```

---

## 🎯 Planned API Endpoints

### 1. Projects
- `GET /api/v1/projects` - List all projects/semesters
- `POST /api/v1/projects` - Create a new project
- `PUT /api/v1/projects/:id` - Update project details
- `DELETE /api/v1/projects/:id` - Delete project and cascade delete child subjects

### 2. Subjects
- `GET /api/v1/subjects?projectId=:id` - List subjects for a project
- `POST /api/v1/subjects` - Create a subject
- `PUT /api/v1/subjects/:id` - Update subject info or custom properties
- `DELETE /api/v1/subjects/:id` - Delete subject

### 3. Assignments
- `GET /api/v1/assignments` - List assignments with optional status/date filters
- `POST /api/v1/assignments` - Create a new assignment
- `PUT /api/v1/assignments/:id` - Update assignment status or fields
- `DELETE /api/v1/assignments/:id` - Remove assignment

---

## 🚀 Future Setup
When ready to implement the backend:
```bash
cd backend
npm install
npm run dev
```
