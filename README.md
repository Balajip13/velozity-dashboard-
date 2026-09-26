# Velozity Dashboard

Velozity Dashboard is a full-stack project and task management application built as a technical assessment. It provides role-based access for Admins, Project Managers, and Developers, featuring real-time task and activity updates, built-in notifications, and automated background processing.

## Live Demo

- **Frontend (Live Application):** [https://velozity-dashboard-git-main-balajis-projects-8fdf9e35.vercel.app/](https://velozity-dashboard-git-main-balajis-projects-8fdf9e35.vercel.app/)
- **Backend API:** [https://velozity-dashboard-y82j.onrender.com/](https://velozity-dashboard-y82j.onrender.com/)
- **Health Check:** [https://velozity-dashboard-y82j.onrender.com/healthz](https://velozity-dashboard-y82j.onrender.com/healthz)
- **GitHub Repository:** [https://github.com/Balajip13/velozity-dashboard-](https://github.com/Balajip13/velozity-dashboard-)

---

## Seed Data & Demo Credentials

The database comes pre-seeded with comprehensive assessment data. Running the seed script completely clears any existing data and repopulates the database. 

**Seeded Assessment Data:**
- 1 Admin
- 2 Project Managers
- 4 Developers
- 3 Clients
- 3 Projects
- 15 Tasks (exactly 5 tasks per project)
- 2 Overdue tasks
- 10 pre-existing activity logs
- 4 pre-existing notifications

**Demo Credentials:**

**ADMIN:**
- Email: `admin@velozity.com`
- Password: `Admin@123`

**PROJECT MANAGER:**
- Email: `sarah.pm@velozity.com`
- Password: `PM@123`
- Email: `michael.pm@velozity.com`
- Password: `PM@123`

**DEVELOPERS:**
- Email: `john@velozity.com`
- Password: `Dev@123`
- Email: `priya@velozity.com`
- Password: `Dev@123`
- Email: `arun@velozity.com`
- Password: `Dev@123`
- Email: `david@velozity.com`
- Password: `Dev@123`

---

## Features

- **Authentication:** JWT-based access and refresh tokens stored securely in HTTP-only cookies.
- **Role-Based Access Control (RBAC):** Data isolation and capabilities based on user role.
- **Project & Client Management:** Centralized project creation assigned to specific clients.
- **Task Management:** Granular tracking of tasks, assignments, priorities, and due dates.
- **Activity Feed:** Detailed audit logging of task status transitions.
- **Real-Time Updates:** Live propagation of task updates, activity logs, and notifications.
- **Notifications:** In-app notification system with unread counts, read receipts, and real-time delivery.
- **Background Scheduler:** Automated cron job that identifies and marks past-due tasks as OVERDUE.
- **Dashboard Stats:** Role-scoped metrics showing upcoming tasks, distribution, and project summaries.

---

## Tech Stack

**Frontend**
- React 19 (Vite)
- TypeScript
- Vanilla CSS
- Socket.IO Client

**Backend**
- Node.js & Express
- TypeScript
- Prisma ORM
- JSON Web Tokens (JWT) & bcrypt
- Socket.IO (WebSockets)
- node-cron

**Database**
- PostgreSQL (Hosted on Render)

**Deployment**
- Frontend: Vercel
- Backend & DB: Render

---

## Architecture

```text
       [ Vercel ]
   React + TypeScript
           |
   REST + Socket.IO
           |
       [ Render ]
Node + Express + TypeScript
           |
         Prisma
           |
   Render PostgreSQL
```

The frontend operates as a Single Page Application (SPA). It communicates with the Express backend via a REST API (using secure HTTP-only cookies for authentication) and establishes a persistent WebSocket connection for real-time dashboard events.

---

## Authentication

Authentication relies on robust JWT mechanisms:
- **Login:** Issues a short-lived `accessToken` (15m) and a long-lived `refreshToken` (7d).
- **Security:** Both tokens are stored in `HttpOnly` cookies. In production (`NODE_ENV=production`), they are configured with `Secure: true` and `SameSite: None` to safely cross origins from Vercel to Render.
- **Refresh Flow:** When the access token expires, the client silently requests a new one via the `/api/auth/refresh` endpoint.

---

## Role-Based Access Control (RBAC)

Role-based access is enforced on the backend by middleware (`authorize(...roles)`) and row-level data checks. Frontend UI components conditionally hide controls based on role, but the backend is the definitive security boundary.

### Admin
- Access to all resources across the application.
- Full project, task, client, and developer management capabilities.

### Project Manager
- **Isolation:** Restricted to viewing and managing tasks associated with their *own* created projects.
- **Capabilities:** Can create projects, create tasks, and fully manage tasks within their domain.
- **Visibility:** Can view all clients and developers to assign them to projects/tasks.

### Developer
- **Data Isolation:** Cannot access unrelated PM or project data. They only see projects and tasks they are explicitly assigned to.
- **Restrictions:** Cannot create projects, create tasks, or delete tasks.
- **Capabilities:** Can only update the status of their *own* assigned tasks. The backend rejects attempts to update another developer's task.

---

## Dashboards

### Project Manager Dashboard
Displays data scoped precisely to the PM's ownership:
- Statistics (Projects managed, Tasks managed, distribution by Priority/Status).
- Recent Tasks across their active projects.
- Relevant notifications and activity logs for tasks within their purview.

### Developer Dashboard
Displays data isolated to the developer's assigned work:
- Statistics (Total assigned tasks, Status distribution, Priority distribution).
- Upcoming assigned tasks ordered by priority and due date.
- Relevant notifications and personal activity logs.

---

## Task Management & Filtering

Tasks track title, description, assigned developer, project, status, priority, and due date. 

The API supports precise filtering via query parameters:
- `status`: Filter by status (`TODO`, `IN_PROGRESS`, `IN_REVIEW`, `DONE`, `OVERDUE`).
- `priority`: Filter by priority (`LOW`, `MEDIUM`, `HIGH`, `CRITICAL`).
- `dueDateFrom`: Filter tasks due on or after a specific Date string.
- `dueDateTo`: Filter tasks due on or before a specific Date string.
- `overdue`: Boolean flag.

**Example Usage:**
`GET /api/tasks?status=TODO&priority=HIGH`
`GET /api/tasks?dueDateFrom=2024-01-01&dueDateTo=2024-12-31`

---

## Activity Feed

The Activity Feed provides a chronological audit trail of task status transitions. 
Each activity entry explicitly contains:
- **Who:** The user who performed the action (e.g., "John Developer").
- **What:** The previous status and the new status (e.g., "TODO → IN_PROGRESS").
- **When:** The exact timestamp of the change.
- **Context:** The associated task and project names.

**Role-Filtered:** Developers only see activity for tasks they are assigned to. PMs see activity for all tasks within their projects.

---

## Real-Time & Offline Behavior

Real-time communication is powered entirely by **Socket.IO** (WebSockets) with zero HTTP polling.
- **Live Updates:** Task status changes, activity feed entries, and notifications are instantly pushed to connected clients.
- **Role/Access Filtering:** Socket emissions target specific user rooms (`dev_1`, `pm_2`), ensuring users only receive real-time data they are authorized to see.
- **Online Users:** The server tracks active socket connections to display a live "Online Users" count.
- **Offline Behavior:** Activity logs and notifications are persisted in the PostgreSQL database. When users who were offline return, the backend automatically retrieves their latest 20 persisted activity events upon dashboard load.

---

## Notifications

Notifications are fully persisted in the database and delivered in real time via Socket.IO.
**Actual Triggers:**
- A Developer receives a notification when a new task is assigned to them.
- A Project Manager receives a notification when a task moves to `IN_REVIEW`.
- Both receive notifications when the background scheduler marks a task as `OVERDUE`.

**Capabilities:**
- Unread notification count is available and updates live.
- Individual notifications can be marked as read (`PUT /api/notifications/:id/read`).
- Mark-all-as-read is fully implemented (`PUT /api/notifications/read-all`).
- Notifications can be permanently deleted (`DELETE /api/notifications/:id`).

---

## Background Scheduler

A background job runs automatically using `node-cron`.
Every minute, the scheduler queries the database for tasks that are past their due date and not currently `DONE` or `OVERDUE`. It automatically transitions these tasks to `OVERDUE`, generates an activity log, and emits real-time WebSocket notifications to the assigned Developer and the Project Manager.

---

## Main API Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/auth/login` | Authenticate user & set HTTP-only cookies |
| POST | `/api/auth/refresh` | Refresh expired access token via cookie |
| POST | `/api/auth/logout` | Clear authentication cookies |
| GET | `/api/auth/me` | Retrieve authenticated user profile |
| GET | `/api/dashboard/stats` | Retrieve role-scoped dashboard metrics |
| GET | `/api/projects` | List projects (role-scoped) |
| POST | `/api/projects` | Create a project (Admin/PM only) |
| GET | `/api/tasks` | List tasks (role-scoped, supports query filters) |
| POST | `/api/tasks` | Create a task (Admin/PM only) |
| PATCH | `/api/tasks/:id/status`| Update task status (Row-level access check) |
| DELETE | `/api/tasks/:id` | Delete a task (Admin/PM only) |
| GET | `/api/activity` | Retrieve last 20 activity logs (role-scoped) |
| GET | `/api/notifications` | Get user notifications |
| PUT | `/api/notifications/:id/read` | Mark specific notification as read |
| PUT | `/api/notifications/read-all`| Mark all notifications as read |
| DELETE | `/api/notifications/:id` | Delete notification |
| GET | `/healthz` | Express server health check |

---

## Project Structure

```text
client/
server/
  ├── prisma/
  │    ├── schema.prisma
  │    └── seed.ts
  └── src/
       ├── jobs/
       ├── lib/
       ├── middleware/
       ├── routes/
       └── index.ts
```

---

## Local Setup

### 1. Clone the repository
```bash
git clone https://github.com/Balajip13/velozity-dashboard-.git
cd velozity-dashboard-
```

### 2. Install Dependencies
```bash
# Terminal 1: Backend
cd server
npm install

# Terminal 2: Frontend
cd client
npm install
```

### 3. Environment Configuration
Create a `.env` file in the `server` directory:
```env
DATABASE_URL="postgresql://user:password@localhost:5432/velozity"
JWT_SECRET="your-super-secret-jwt-key"
REFRESH_TOKEN_SECRET="your-super-secret-refresh-key"
PORT=5000
NODE_ENV="development"
```

Create a `.env` file in the `client` directory:
```env
VITE_API_URL="http://localhost:5000/api"
```

### 4. Database Setup & Seeding
Ensure PostgreSQL is running locally, then initialize the database:
```bash
cd server
npx prisma generate
npx prisma db push
npm run seed
```

### 5. Run the Application
```bash
# Terminal 1: Backend
cd server
npm run dev

# Terminal 2: Frontend
cd client
npm run dev
```

---

## Security

- **JWT & HttpOnly Cookies:** Access and refresh tokens are securely stored in `HttpOnly` cookies, preventing XSS extraction.
- **Production Cookies:** In production (`NODE_ENV=production`), cookies use `Secure: true` and `SameSite: None`.
- **Password Hashing:** Passwords are mathematically salted and hashed via `bcrypt` before storage.
- **CORS Configuration:** Express REST routes and Socket.IO allow cross-origin requests only from localhost and the explicit Vercel domain.
- **Backend RBAC:** Access to project and task data is checked based on the authenticated user's role and permissions.
- **Environment Secrets:** Sensitive credentials and database URLs are injected via `.env` variables.

---

## Known Limitations

- **Render Cold Starts:** The backend is hosted on Render's free tier. The Render free-tier backend may experience a cold start after a period of inactivity.

---

## Assessment Requirement Coverage

| Assessment Requirement | Implementation |
|---|---|
| React + TypeScript | Implemented |
| Node/Express + TypeScript | Implemented |
| PostgreSQL & Prisma | Implemented |
| JWT Access & Refresh Tokens | Implemented |
| HTTP-only Refresh Cookie | Implemented |
| RBAC (Admin, PM, Developer) | Implemented |
| Developer Data Isolation | Implemented |
| Projects & Tasks | Implemented |
| Task Status, Priority, Due Dates | Implemented |
| Activity Logs (Who/What/When) | Implemented |
| WebSocket / Socket.IO | Implemented |
| No Polling | Implemented |
| Role-filtered real-time data | Implemented |
| Online Users | Implemented |
| Offline Activity Retrieval (Latest 20) | Implemented |
| Assignment Notifications | Implemented |
| PM Notification for IN REVIEW | Implemented |
| Unread Notification Count | Implemented |
| Mark Read / Mark All Read | Implemented |
| Background Overdue Scheduler | Implemented |
| Task Filtering | Implemented |
| Server-side Validation & API Errors | Implemented |
| Environment Secrets | Implemented |
| Seed Data with required counts | Implemented |
| Vercel & Render Deployment | Implemented |

---

## Technical Summary

This project implements a full-stack project and task management dashboard using React, TypeScript, Node.js, Express, Prisma, PostgreSQL, JWT authentication, Socket.IO, and node-cron. It includes role-based access for Admins, Project Managers, and Developers, project and task management, activity tracking, real-time updates, notifications, overdue task processing, dashboard filtering, and seeded demo data. The application is deployed with Vercel for the frontend and Render for the backend and PostgreSQL database.
