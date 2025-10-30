# TA Git Commit Tracker

A production-ready MERN starter that helps teaching assistants manage student cohorts, fetch GitHub commit activity, and visualise progress across coursework and personal project groups.

## Features

- **Class management** – create classes, upload an Excel roster once, and manage students manually afterwards.
- **Roster ingestion** – parse `.xlsx` files with `Name`, `RollNo`, `RepoURL`, `GroupType` columns and persist students to MongoDB.
- **GitHub commit sync** – fetch commits per student repository, store them, and prevent duplicates via upserts.
- **Dashboard & analytics** – filter by group type and time window (7/14/30/custom days), display average commits, per-student totals, sortable tables, and charts.
- **Manual overrides** – add, edit, or remove students after the initial upload.
- **Role-aware editing** – share the dashboard in read-only mode; only admins with the token can change data or trigger syncs.
- **Optional cron sync** – enable scheduled background syncs with `node-cron`.
- **Tooling** – ESLint + Prettier configs for both backend and frontend projects.

## Tech Stack

- **Backend**: Node.js 18+, Express, Mongoose, Multer, XLSX, Axios, node-cron (optional)
- **Frontend**: React 18, Vite, React Router, Axios, Recharts, Tailwind CSS

## Project Structure

```
backend/   # Express API + Mongo models and services
frontend/  # Vite + React UI
```

## Getting Started

### Prerequisites

- Node.js 18+
- MongoDB instance (local or remote)
- (Optional) GitHub personal access token for higher rate limits

### Backend

```bash
cd backend
npm install
cp .env.example .env # update values
npm run dev
```

Environment variables (`backend/.env`):

- `PORT` – port for the API server (default `4000`).
- `MONGODB_URI` – MongoDB connection string.
- `ADMIN_TOKEN` – secret string that must be supplied as a bearer token for any write operations.
- `GITHUB_TOKEN` – optional token for authenticated GitHub API calls.
- `GITHUB_TIMEOUT_MS` – optional override for GitHub API timeout (default 45000ms).
- `ENABLE_AUTO_SYNC` – set to `true` to enable scheduled syncs.
- `SYNC_CRON` – cron expression for auto sync (defaults to `0 3 * * *`).
- `SYNC_WINDOW_DAYS` – look-back window (days) for auto sync.

All write endpoints require the `Authorization: Bearer <ADMIN_TOKEN>` header (or `X-Admin-Token` header) to succeed.

Key endpoints:

- `GET /api/auth/status` – health check for admin tokens.
- `POST /api/classes` – create a class.
- `GET /api/classes` – list classes.
- `GET /api/classes/:classId?includeStudents=true` – class details with students.
- `POST /api/classes/:classId/students/upload` – upload Excel roster (`file` field).
- `POST /api/classes/:classId/students` – add student manually.
- `PUT /api/classes/:classId/students/:studentId` – update student.
- `DELETE /api/classes/:classId/students/:studentId` – delete student + commit history.
- `GET /api/classes/:classId/students/export` – download the student roster as Excel.
- `GET /api/classes/:classId/dashboard/export` – download filtered commit dashboard data as Excel.
- `POST /api/classes/:classId/sync` – trigger GitHub commit sync (`{ days }`).
- `GET /api/classes/:classId/dashboard` – dashboard metrics (`groupType`, `days`, `sortBy`, `sortOrder`, `search`, `minCommits`, `maxCommits`).

Accepted Excel headers (case-insensitive):

| Name | RollNo | RepoURL | GroupType |
| ---- | ------ | ------- | --------- |
| Jane Doe | CS101 | https://github.com/org/repo | courseWork |

`GroupType` must be `courseWork` or `personalProjects`.

### Frontend

```bash
cd frontend
npm install
cp .env.example .env # set VITE_API_URL if different
npm run dev
```

Environment variables (`frontend/.env`):

- `VITE_API_URL` – base URL for the backend API.
- `VITE_API_TIMEOUT_MS` – optional override for frontend request timeout (default 60000ms).

The UI exposes:

- Class list + creation form.
- Roster management (upload, add, edit, delete).
- Export roster to Excel.
- Export commit dashboard data to Excel.
- Commit dashboard with search, commit count filters (<, >, between), charts, and sortable tables.

### Linting

- Backend: `cd backend && npm run lint`
- Frontend: `cd frontend && npm run lint`

### Useful Scripts

- Backend dev server: `npm run dev`
- Backend production build: `npm start`
- Frontend dev server: `npm run dev`
- Frontend build: `npm run build`

## Next Steps

- Configure deployment (e.g., Render/Vercel + MongoDB Atlas).
- Add authentication if needed for multiple TAs.
- Enhance charts with commit trends over time per subgroup.
