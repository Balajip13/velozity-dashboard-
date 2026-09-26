# Velozity Dashboard

This is a full-stack project management dashboard I built for my technical assessment. It lets admins, project managers and developers manage clients, projects and tasks. The main things I focused on were role-based access control, real-time updates via Socket.IO, and a background job for overdue task detection. The frontend is React with TypeScript and the backend is Express with PostgreSQL.

---

## Tech Stack

**Frontend**
- React 19
- TypeScript
- Vite

**Backend**
- Node.js
- Express 5
- TypeScript

**Database**
- PostgreSQL
- Prisma 7

**Other**
- Socket.IO (real-time updates)
- JWT + HttpOnly cookies (authentication)
- bcrypt (password hashing)
- node-cron (background job)

---

## Features

- Login and logout with JWT access and refresh tokens stored in HttpOnly cookies
- Session restoration on browser refresh (tries `/auth/me`, falls back to `/auth/refresh`)
- Role-based access control for Admin, Project Manager and Developer
- Project creation and management
- Task creation with title, description, assigned developer, priority and due date
- Task status management (TODO, IN_PROGRESS, IN_REVIEW, DONE, OVERDUE)
- Activity log for every task status change
- Real-time activity feed over Socket.IO
- Online user count shown on the dashboard
- Notifications on task assignment, task review, and overdue detection
- Real-time notification badge (unread count)
- Background job that marks tasks as OVERDUE every minute
- Role-scoped dashboard statistics
- Server-side task filtering by status, priority and overdue flag
- Responsive layout (mobile, tablet, desktop)

---

## Roles

### Admin
Has full access. Can manage clients, create projects and tasks, view all data across the system and see any user's notifications.

### Project Manager
Can create and manage their own projects and the tasks under those projects. Can assign tasks to developers. Can view clients and the developer list. Cannot manage clients.

### Developer
Can view projects they are assigned to and tasks assigned to them. Can update the status of their own tasks. Cannot create projects or tasks, and cannot view clients or other developers.

All role restrictions are enforced on the server — not just on the frontend.

---

## Authentication

Authentication uses JWT. On login, the server issues an access token (15 minutes) and a refresh token (7 days), both set as HttpOnly cookies.

Every protected API route goes through `authenticate` middleware that reads and verifies the `accessToken` cookie. Routes that need a specific role go through `authorize` middleware on top of that.

When the page is refreshed, the frontend calls `GET /api/auth/me`. If the access token is still valid it gets the user and stays on the dashboard. If `/me` returns a 401, it tries `POST /api/auth/refresh`. If the refresh token is still valid, a new access token is issued and `/me` is retried. Only if both fail does the user get redirected to the login page.

Logout calls `POST /api/auth/logout` which clears both cookies on the server side.

Socket.IO connections are authenticated the same way — the server reads the `accessToken` cookie from the WebSocket handshake before letting the connection through.

---

## Real-Time Features

I used Socket.IO for the real-time parts. When a user connects, the server puts them into a room based on their role:

- Admin → `admin` room
- Project Manager → `pm_{userId}` room
- Developer → `dev_{userId}` room

When a task status changes, the server emits `taskStatusChanged` to the admin, the relevant PM and the assigned developer. The activity feed on the dashboard updates immediately without any polling.

On connection, the server also sends the last 20 activity log entries scoped to what the user is allowed to see, and the current unread notification count.

Online user count is tracked per unique user ID (not per socket), so if the same user has two tabs open it counts as one.

---

## Overdue Task Job

There is a node-cron job that runs every minute. It queries for tasks where the due date has passed and the status is not `DONE` or `OVERDUE`. For each task found it:

1. Updates the status to `OVERDUE`
2. Creates an activity log entry
3. Sends a notification to the assigned developer and the project manager
4. Emits the status change via Socket.IO

The job has a guard flag to prevent overlapping runs. It runs inside the same process as the server, so it is not a distributed job queue — it is just a simple in-process scheduler.

---

## Database

PostgreSQL with Prisma for database access.

**Models:**
- `User` — stores name, email, hashed password and role
- `Client` — external client organization linked to projects
- `Project` — created by a user, associated with a client, has many tasks
- `Task` — assigned to a developer, belongs to a project, has status, priority and due date
- `ActivityLog` — records every task status change with the user who made it and the from/to status
- `Notification` — per-user messages with a `read` flag

**Relationships:**
- A user can create many projects and be assigned many tasks
- A client has many projects
- A project has many tasks
- A task has many activity logs

---

## Project Structure

```
velozity-dashboard/
├── client/
│   ├── src/
│   │   ├── lib/
│   │   │   └── socket.ts
│   │   ├── App.tsx
│   │   ├── Login.tsx
│   │   ├── Projects.tsx
│   │   ├── Tasks.tsx
│   │   ├── Clients.tsx
│   │   ├── Developers.tsx
│   │   └── Notifications.tsx
│   └── package.json
│
├── server/
│   ├── prisma/
│   │   ├── schema.prisma
│   │   ├── seed.ts
│   │   └── migrations/
│   ├── src/
│   │   ├── jobs/
│   │   │   └── overdueTasks.ts
│   │   ├── lib/
│   │   │   ├── prisma.ts
│   │   │   └── socket.ts
│   │   ├── middleware/
│   │   │   └── auth.ts
│   │   ├── routes/
│   │   │   ├── auth.ts
│   │   │   ├── clients.ts
│   │   │   ├── dashboard.ts
│   │   │   ├── developers.ts
│   │   │   ├── notifications.ts
│   │   │   ├── projects.ts
│   │   │   ├── tasks.ts
│   │   │   └── activity.ts
│   │   └── index.ts
│   ├── .env
│   ├── .env.example
│   └── package.json
│
└── README.md
```

---

## Running Locally

### Prerequisites
- Node.js (LTS)
- PostgreSQL running locally
- npm

### 1. Clone the repository

```bash
git clone <repository-url>
cd velozity-dashboard
```

### 2. Set up the server

```bash
cd server
npm install
```

Create a `.env` file using `.env.example` as a reference:

```env
DATABASE_URL=postgresql://USER:PASSWORD@localhost:5432/velozity_dashboard
JWT_SECRET=your_access_token_secret
REFRESH_TOKEN_SECRET=your_refresh_token_secret
```

Run the migrations and seed the database:

```bash
npx prisma generate
npx prisma migrate dev
npm run seed
```

Start the server:

```bash
npm run dev
```

The API runs on `http://localhost:5000`.

### 3. Set up the client

Open a second terminal:

```bash
cd client
npm install
npm run dev
```

The frontend runs on `http://localhost:5173`.

---

## Environment Variables

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Secret for signing access tokens |
| `REFRESH_TOKEN_SECRET` | Secret for signing refresh tokens |

Do not use the same value for both secrets.

---

## Test Credentials

These are created by the seed script.

| Role | Email | Password |
|---|---|---|
| Admin | admin@velozity.com | Admin@123 |
| Project Manager | sarah.pm@velozity.com | PM@123 |
| Project Manager | michael.pm@velozity.com | PM@123 |
| Developer | john@velozity.com | Dev@123 |
| Developer | priya@velozity.com | Dev@123 |
| Developer | arun@velozity.com | Dev@123 |
| Developer | david@velozity.com | Dev@123 |

The seed also creates 3 clients, 3 projects, 15 tasks (5 per project), 10 activity logs, 2 overdue tasks and 4 notifications.

---

## API Access by Role

| Capability | Admin | Project Manager | Developer |
|---|---|---|---|
| View clients | Yes | Yes | No |
| Create / edit / delete client | Yes | No | No |
| View projects | All | Own only | Assigned tasks only |
| Create project | Yes | Yes | No |
| Edit / delete project | Yes | Own only | No |
| View tasks | All | Own projects | Assigned only |
| Create task | Yes | Own projects | No |
| Edit task (all fields) | Yes | Own projects | No |
| Update task status | Yes | Own projects | Assigned only |
| View developers | Yes | Yes | No |
| View notifications | All (any user) | Own | Own |

---

## Known Limitations

- The overdue task job runs in the same process as the server. There is no separate worker or job queue. If the server goes down, the job stops until it restarts.
- Refresh tokens are not stored in the database. There is no server-side token revocation — once a refresh token is issued, it stays valid until it expires (7 days) even after logout, unless the cookie is cleared from the browser.
- No pagination on list endpoints. All matching records are returned.
- CORS is currently configured to allow any `localhost` origin. This needs to be updated before deploying.
- Cookies use `secure: false` for local development over HTTP. For production this needs to be `secure: true` with HTTPS.

---

## Deployment

Not deployed. Configured for local development only.

To deploy, the main things to update are:

- `DATABASE_URL` to a hosted PostgreSQL instance
- Cookie settings: `secure: true`, appropriate `sameSite` value
- CORS origin to the production frontend URL
- The hardcoded API URL in the frontend (`http://localhost:5000/api`) to the production URL
- Build commands: `npm run build` in both `client` and `server`, then serve `server/dist/index.js`

---

## Architecture Decisions

- **Frontend (React/TypeScript)**: Chosen for component reusability and strong typing, which prevents a lot of runtime errors and makes the codebase easier to scale.
- **Backend (Node/Express)**: Simple, lightweight, and fast to set up. Provides a great ecosystem for building REST APIs.
- **Database (PostgreSQL/Prisma)**: Postgres is robust for relational data with strict constraints. Prisma provides excellent type safety and auto-completion, acting as a great ORM.
- **Authentication (JWT/Cookies)**: JWT with HttpOnly cookies keeps tokens secure from XSS attacks while maintaining a stateless backend.
- **Real-time (Socket.IO)**: Socket.IO handles fallbacks and reconnection automatically, making it perfect for the live activity feed and notification counters without the complexity of raw WebSockets.
- **Background Jobs (node-cron)**: A simple in-memory cron job is enough for this size of project to mark overdue tasks, avoiding the overhead of external job queues like Redis/BullMQ.

---

## Database Indexing

Indexes are defined in `schema.prisma` to optimize query performance on frequently filtered or sorted columns:

- `Project`: `[clientId]`, `[createdById]` - for faster PM dashboard queries.
- `Task`: `[projectId]`, `[assignedDeveloperId]`, `[status]`, `[priority]`, `[dueDate]` - speeds up developer task filtering and the overdue cron job.
- `ActivityLog`: `[taskId]`, `[userId]`, `[createdAt]` - optimizes fetching the most recent activity feed.
- `Notification`: `[userId]`, `[read]`, `[createdAt]` - for quickly counting unread notifications per user.

---

## Assessment Explanation

**The hardest technical problem and how I solved it:**
The hardest problem was managing the real-time Socket.IO connections alongside the stateless HTTP JWT authentication. Since WebSockets are stateful, maintaining security when a token expires is tricky. I solved this by adding authentication middleware directly to the Socket.IO handshake that reads the `accessToken` cookie. If the token is invalid, the connection is rejected. On the frontend, the socket connects only after HTTP authentication is successful, keeping the auth state synchronized.

**My approach for the real-time activity feed:**
For the activity feed, I needed a way to broadcast updates without spamming users who shouldn't see them. I assigned users to specific Socket.IO "rooms" based on their role and ID (e.g., `pm_{id}`, `dev_{id}`, `admin`). When a task changes, the server explicitly emits the event only to the rooms of the relevant PM, Developer, and Admins. This keeps the logic clean and secure.

**One thing I would do differently:**
If I had to do this again, I would implement a dedicated state management library (like Redux Toolkit or Zustand) on the frontend. Passing state around and re-fetching full arrays (like projects and tasks) in `App.tsx` on every change works for a small app, but as the app grows, a structured global state with optimistic UI updates would be much more maintainable and performant.
