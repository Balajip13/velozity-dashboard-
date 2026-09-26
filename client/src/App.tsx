import { useEffect, useState } from "react";
import "./App.css";
import Clients from "./Clients";
import Projects from "./Projects";
import Developers from "./Developers";
import Tasks from "./Tasks";
import Notifications from "./Notifications";
import Login from "./Login";
import { socket } from "./lib/socket";

const API = "http://localhost:5000/api";

type Stats = {
  clients: number;
  projects: number;
  tasks: number;
  completedTasks: number;
  overdueTasks: number;
  developers: number;
  taskStatus: {
    todo: number;
    inProgress: number;
    inReview: number;
    done: number;
    overdue: number;
  };
  taskPriority?: {
    low: number;
    medium: number;
    high: number;
    critical: number;
  };
};

type Project = {
  id: number;
  name: string;
  description?: string;
  client?: {
    name: string;
  };
};

type Task = {
  id: number;
  title: string;
  status: string;
  priority: string;
  dueDate: string;
  project?: {
    name: string;
  };
  assignedDeveloper?: {
    name: string;
  };
};

type Activity = {
  id: number;
  userName: string;
  taskTitle: string;
  projectName: string;
  fromStatus: string;
  toStatus: string;
  createdAt: string;
};

function App() {
  const [user, setUser] = useState<any>(null);
  const [authChecking, setAuthChecking] = useState(true);

  const [stats, setStats] = useState<Stats | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState("dashboard");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notificationsDropdownOpen, setNotificationsDropdownOpen] = useState(false);
  const [dropdownNotifications, setDropdownNotifications] = useState<any[]>([]);

  const handleNavClick = (pageName: string) => {
    setPage(pageName);
    setMobileMenuOpen(false);
  };


  const [onlineUsers, setOnlineUsers] = useState(0);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [activities, setActivities] = useState<Activity[]>([]);

  useEffect(() => {
    checkAuth();
  }, []);

  async function checkAuth() {
    try {
      // Step 1: Try the existing access token
      const res = await fetch(`${API}/auth/me`, { credentials: "include" });
      if (res.ok) {
        // /api/auth/me returns the user object directly: { id, name, email, role }
        const data = await res.json();
        setUser(data);
        return;
      }

      // Step 2: Access token failed — attempt a refresh
      const refreshRes = await fetch(`${API}/auth/refresh`, {
        method: "POST",
        credentials: "include",
      });

      if (!refreshRes.ok) {
        // Refresh token is also invalid/expired → force login
        setUser(null);
        return;
      }

      // Step 3: Refresh succeeded — retry /me to get user info
      const retryRes = await fetch(`${API}/auth/me`, { credentials: "include" });
      if (retryRes.ok) {
        const data = await retryRes.json();
        setUser(data);
      } else {
        setUser(null);
      }
    } catch (e) {
      setUser(null);
    } finally {
      setAuthChecking(false);
    }
  }

  useEffect(() => {
    if (!user) return;

    loadDashboard();


    socket.connect();

    socket.on("onlineUsers", (data) => setOnlineUsers(data.count));
    socket.on("notificationUnreadCount", (data) => setUnreadNotifications(data.count));
    socket.on("activityHistory", (data) => setActivities(data.activities || []));
    socket.on("taskStatusChanged", (data) => {
      setActivities((prev) => [data, ...prev].slice(0, 20));

      loadDashboard();
    });

    return () => {
      socket.disconnect();
      socket.off("onlineUsers");
      socket.off("notificationUnreadCount");
      socket.off("activityHistory");
      socket.off("taskStatusChanged");
    };

  }, [user]);

  async function loadDashboard() {
    try {
      const [statsRes, projectsRes, tasksRes] = await Promise.all([
        fetch(`${API}/dashboard/stats`, { credentials: "include" }),
        fetch(`${API}/projects`, { credentials: "include" }),
        fetch(`${API}/tasks`, { credentials: "include" }),
      ]);

      if (!statsRes.ok || !projectsRes.ok || !tasksRes.ok) {
        throw new Error("Failed to load dashboard data");
      }

      const statsData = await statsRes.json();
      const projectsData = await projectsRes.json();
      const tasksData = await tasksRes.json();

      setStats(statsData);
      setProjects(Array.isArray(projectsData) ? projectsData : []);
      setTasks(Array.isArray(tasksData) ? tasksData : []);
    } catch (error) {
      console.error("Dashboard loading error:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleLogout() {
    try {
      await fetch(`${API}/auth/logout`, { method: "POST", credentials: "include" });
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      setUser(null);
      setPage("dashboard");
      socket.disconnect();
    }
  }

  if (authChecking) {
    return (
      <div className="loading">
        <h2>Verifying session...</h2>
      </div>
    );
  }

  if (!user) {
    return <Login onLoginSuccess={(u) => setUser(u)} />;
  }

  if (loading) {
    return (
      <div className="loading">
        <h2>Loading Velozity Dashboard...</h2>
      </div>
    );
  }

  return (
    <div className="app">

      {mobileMenuOpen && (
        <div 
          className="mobile-sidebar-overlay" 
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      <aside className={`sidebar ${mobileMenuOpen ? "open" : ""}`}>
        <div className="brand">
          <h2>Velozity</h2>
          <span>DASHBOARD</span>
        </div>

        <nav>
          <a
            className={page === "dashboard" ? "active" : ""}
            onClick={() => handleNavClick("dashboard")}
          >
            Dashboard
          </a>

          <a
            className={page === "projects" ? "active" : ""}
            onClick={() => handleNavClick("projects")}
          >
            Projects
          </a>

          <a
            className={page === "tasks" ? "active" : ""}
            onClick={() => handleNavClick("tasks")}
          >
            Tasks
          </a>

          <a
            className={page === "clients" ? "active" : ""}
            onClick={() => handleNavClick("clients")}
          >
            Clients
          </a>

          <a
            className={page === "developers" ? "active" : ""}
            onClick={() => handleNavClick("developers")}
          >
            Developers
          </a>

          <a
            className={page === "notifications" ? "active" : ""}
            onClick={() => handleNavClick("notifications")}
          >
            Notifications
            {unreadNotifications > 0 && <span className="nav-badge">{unreadNotifications}</span>}
          </a>
        </nav>

        <div className="sidebar-bottom">
          <div className="user-info-section">
            <div className="user-role-only">
              {user.role.replace("_", " ")}
            </div>
            
            <button 
              className="logout-text-button"
              onClick={handleLogout}
            >
              Logout
            </button>
          </div>
        </div>
      </aside>


      <div className="mobile-header">
        <div className="brand-mobile">
          <h2>Velozity</h2>
        </div>
        <div className="mobile-header-right">
          <div className="notif-trigger" id="notif-trigger">
            <button
              className="notif-bell-btn"
              onClick={() => setNotificationsDropdownOpen(!notificationsDropdownOpen)}
              aria-label="Notifications"
            >
              Alerts
              {unreadNotifications > 0 && <span className="notif-count">{unreadNotifications}</span>}
            </button>
            {notificationsDropdownOpen && (
              <NotificationDropdown
                onClose={() => setNotificationsDropdownOpen(false)}
                onNavigate={() => handleNavClick("notifications")}
              />
            )}
          </div>
          <button 
            className="mobile-menu-btn" 
            onClick={() => setMobileMenuOpen(true)}
            aria-label="Open Menu"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="12" x2="21" y2="12"></line>
              <line x1="3" y1="6" x2="21" y2="6"></line>
              <line x1="3" y1="18" x2="21" y2="18"></line>
            </svg>
          </button>
        </div>
      </div>

      {/* Desktop notification bell — sits above main content */}
      <div className="app-topbar">
        <div className="notif-trigger" id="notif-trigger-desktop">
          <button
            className="notif-bell-btn"
            onClick={() => setNotificationsDropdownOpen(!notificationsDropdownOpen)}
            aria-label="Notifications"
          >
            Alerts
            {unreadNotifications > 0 && <span className="notif-count">{unreadNotifications}</span>}
          </button>
          {notificationsDropdownOpen && (
            <NotificationDropdown
              onClose={() => setNotificationsDropdownOpen(false)}
              onNavigate={() => handleNavClick("notifications")}
            />
          )}
        </div>
      </div>

      <main className="main">
        {page === "clients" ? (
          <Clients />
        ) : page === "projects" ? (
          <Projects />
        ) : page === "developers" ? (
          <Developers />
        ) : page === "tasks" ? (
          <Tasks />
        ) : page === "notifications" ? (
          <Notifications />
        ) : (
          <>

            <header className="topbar">
              <div>
                <h1>Dashboard</h1>
                <p>Welcome back, {user.name.replace(" User", "")}</p>
              </div>

              <div className="top-actions">
                <div className="online-indicator">
                  <span className="online-dot"></span>
                  {onlineUsers} Online
                </div>
              </div>
            </header>


            <section className="stats-grid">
              <StatCard
                title="Total Clients"
                value={stats?.clients ?? 0}
              />

              <StatCard
                title="Total Projects"
                value={stats?.projects ?? 0}
              />

              <StatCard
                title="Total Tasks"
                value={stats?.tasks ?? 0}
              />

              <StatCard
                title="Developers"
                value={stats?.developers ?? 0}
              />
            </section>


            <section className="content-grid">
              <div className="card">
                <div className="card-header">
                  <div>
                    <h2>Task Overview</h2>
                    <p>Current task distribution</p>
                  </div>
                </div>

                <div className="task-overview">
                  <ProgressRow
                    label="To Do"
                    value={stats?.taskStatus.todo ?? 0}
                    total={stats?.tasks ?? 0}
                  />

                  <ProgressRow
                    label="In Progress"
                    value={stats?.taskStatus.inProgress ?? 0}
                    total={stats?.tasks ?? 0}
                  />

                  <ProgressRow
                    label="In Review"
                    value={stats?.taskStatus.inReview ?? 0}
                    total={stats?.tasks ?? 0}
                  />

                  <ProgressRow
                    label="Completed"
                    value={stats?.taskStatus.done ?? 0}
                    total={stats?.tasks ?? 0}
                  />

                  <ProgressRow
                    label="Overdue"
                    value={stats?.taskStatus.overdue ?? 0}
                    total={stats?.tasks ?? 0}
                  />
                </div>
              </div>

              <div className="card">
                <div className="card-header">
                  <div>
                    <h2>Projects</h2>
                    <p>Recent projects</p>
                  </div>

                  <button
                    className="small-button"
                    onClick={() => setPage("projects")}
                  >
                    View all
                  </button>
                </div>

                <div className="list">
                  {projects.length === 0 ? (
                    <div className="empty">No projects yet</div>
                  ) : (
                    projects.slice(0, 5).map((project) => (
                      <div className="list-item" key={project.id}>
                        <div className="list-info">
                          <strong>{project.name}</strong>

                          <span>
                            {project.client?.name || "No client"}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {user.role === "PROJECT_MANAGER" && (
                <>
                  <div className="card">
                    <div className="card-header">
                      <div>
                        <h2>Priority Breakdown</h2>
                        <p>Tasks by priority</p>
                      </div>
                    </div>
                    <div className="task-overview">
                      <ProgressRow label="Critical" value={stats?.taskPriority?.critical ?? 0} total={stats?.tasks ?? 0} />
                      <ProgressRow label="High" value={stats?.taskPriority?.high ?? 0} total={stats?.tasks ?? 0} />
                      <ProgressRow label="Medium" value={stats?.taskPriority?.medium ?? 0} total={stats?.tasks ?? 0} />
                      <ProgressRow label="Low" value={stats?.taskPriority?.low ?? 0} total={stats?.tasks ?? 0} />
                    </div>
                  </div>
                  
                  <div className="card">
                    <div className="card-header">
                      <div>
                        <h2>Upcoming Due This Week</h2>
                        <p>Tasks due by end of the week</p>
                      </div>
                    </div>
                    <div className="list">
                      {tasks.filter(t => {
                        if (t.status === "DONE" || t.status === "OVERDUE") return false;
                        const d = new Date(t.dueDate);
                        const now = new Date();
                        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                        const startOfWeek = new Date(today);
                        startOfWeek.setDate(today.getDate() - today.getDay());
                        const endOfWeek = new Date(startOfWeek);
                        endOfWeek.setDate(startOfWeek.getDate() + 6);
                        endOfWeek.setHours(23, 59, 59, 999);
                        return d >= startOfWeek && d <= endOfWeek;
                      }).length === 0 ? (
                        <div className="empty" style={{padding: '1rem'}}>No tasks due this week</div>
                      ) : (
                        tasks.filter(t => {
                          if (t.status === "DONE" || t.status === "OVERDUE") return false;
                          const d = new Date(t.dueDate);
                          const now = new Date();
                          const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                          const startOfWeek = new Date(today);
                          startOfWeek.setDate(today.getDate() - today.getDay());
                          const endOfWeek = new Date(startOfWeek);
                          endOfWeek.setDate(startOfWeek.getDate() + 6);
                          endOfWeek.setHours(23, 59, 59, 999);
                          return d >= startOfWeek && d <= endOfWeek;
                        }).sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
                        .map(task => (
                          <div className="list-item" key={task.id}>
                            <div className="list-info">
                              <strong>{task.title}</strong>
                              <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                Due: {new Date(task.dueDate).toLocaleDateString()}
                                <span className={`priority ${task.priority.toLowerCase()}`} style={{ fontSize: '0.7rem' }}>
                                  {task.priority}
                                </span>
                              </span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </>
              )}

              <div className="card activity-feed-card">
                <div className="card-header">
                  <div>
                    <h2>Activity Feed</h2>
                    <p>Real-time updates</p>
                  </div>
                </div>
                <div className="activity-feed">
                  {activities.length === 0 ? (
                    <div className="empty">No activity yet</div>
                  ) : (
                    activities.map((a) => (
                      <div className="activity-item" key={a.id}>
                        <div className="activity-item-left">
                          <div className="activity-actor">{a.userName.replace(" User", "")}</div>
                          <div className="activity-action">Changed "{a.taskTitle}"</div>
                          <div className="activity-transition">
                            {a.fromStatus.replace("_", " ")} &rarr; {a.toStatus.replace("_", " ")}
                          </div>
                        </div>
                        <div className="activity-time">
                          {new Date(a.createdAt).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true }).toUpperCase()}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </section>


            <section className="card tasks-card">
              <div className="card-header">
                <div>
                  <h2>Recent Tasks</h2>
                  <p>Latest tasks across your projects</p>
                </div>

                <button
                  className="small-button"
                  onClick={() => setPage("tasks")}
                >
                  View all
                </button>
              </div>

              {tasks.length === 0 ? (
                <div className="empty">No tasks yet</div>
              ) : (
                <div className="table-wrapper">
                  <table>
                    <colgroup>
                      <col style={{ width: '25%' }} />
                      <col style={{ width: '25%' }} />
                      <col style={{ width: '22%' }} />
                      <col style={{ width: '14%' }} />
                      <col style={{ width: '14%' }} />
                    </colgroup>
                    <thead>
                      <tr>
                        <th>Task</th>
                        <th>Project</th>
                        <th>Developer</th>
                        <th>Priority</th>
                        <th>Status</th>
                      </tr>
                    </thead>

                    <tbody>
                      {tasks.slice(0, 8).map((task) => (
                        <tr key={task.id}>
                          <td>
                            <strong>{task.title}</strong>
                          </td>

                          <td>{task.project?.name || "-"}</td>

                          <td>
                            {task.assignedDeveloper?.name || "-"}
                          </td>

                          <td>
                            <span
                              className={`priority ${task.priority.toLowerCase()}`}
                            >
                              {task.priority}
                            </span>
                          </td>

                          <td>
                            <span
                              className={`status ${task.status.toLowerCase()}`}
                            >
                              {task.status.replace("_", " ")}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
}

function StatCard({
  title,
  value,
}: {
  title: string;
  value: number;
}) {
  return (
    <div className="stat-card">
      <span>{title}</span>
      <strong>{value}</strong>
    </div>
  );
}

function ProgressRow({
  label,
  value,
  total,
}: {
  label: string;
  value: number;
  total: number;
}) {
  const percentage = total > 0 ? (value / total) * 100 : 0;

  return (
    <div className="progress-row">
      <div className="progress-label">
        <span>{label}</span>
        <strong>{value}</strong>
      </div>

      <div className="progress">
        <div
          className={`progress-fill ${label === 'Overdue' ? 'red' : ''}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

function NotificationDropdown({ onClose, onNavigate }: { onClose: () => void, onNavigate: () => void }) {
  const [notifications, setNotifications] = useState<any[]>([]);

  useEffect(() => {
    fetch(`${API}/notifications`, { credentials: "include" })
      .then(res => res.json())
      .then(data => setNotifications(data))
      .catch(console.error);

    const handleNewCount = () => {
      fetch(`${API}/notifications`, { credentials: "include" })
        .then(res => res.json())
        .then(data => setNotifications(data))
        .catch(console.error);
    };

    socket.on("notificationUnreadCount", handleNewCount);

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.notif-trigger')) {
        onClose();
      }
    };
    document.addEventListener('click', handleClickOutside);

    return () => {
      socket.off("notificationUnreadCount", handleNewCount);
      document.removeEventListener('click', handleClickOutside);
    };
  }, [onClose]);

  async function markRead(id: number) {
    await fetch(`${API}/notifications/${id}/read`, { method: "PUT", credentials: "include" });
    setNotifications(notifications.map(n => n.id === id ? { ...n, read: true } : n));
  }

  async function markAllRead() {
    await fetch(`${API}/notifications/read-all`, { method: "PUT", credentials: "include" });
    setNotifications(notifications.map(n => ({ ...n, read: true })));
  }

  const unreadOnly = notifications.filter(n => !n.read);

  return (
    <div className="notification-dropdown">
      <div className="dropdown-header">
        <h4>Notifications</h4>
        {unreadOnly.length > 0 && <button onClick={markAllRead} className="small-button text-xs">Mark all read</button>}
      </div>
      <div className="dropdown-body">
        {unreadOnly.length === 0 ? (
          <div className="empty" style={{padding: '1rem', textAlign: 'center'}}>No new notifications</div>
        ) : (
          unreadOnly.map(n => (
            <div key={n.id} className="dropdown-item">
              <div className="dropdown-item-content">
                <p>{n.message}</p>
                <small>{new Date(n.createdAt).toLocaleString()}</small>
              </div>
              <button onClick={() => markRead(n.id)} className="small-button">✓</button>
            </div>
          ))
        )}
      </div>
      <div className="dropdown-footer">
        <a onClick={(e) => { e.preventDefault(); onNavigate(); onClose(); }}>View all</a>
      </div>
    </div>
  );
}

export default App;