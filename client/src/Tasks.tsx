import { useEffect, useState } from "react";

const API = import.meta.env.VITE_API_URL ?? "http://localhost:5000/api";

type Project = {
    id: number;
    name: string;
};

type Developer = {
    id: number;
    name: string;
};

type Task = {
    id: number;
    title: string;
    description?: string;
    status: string;
    priority: string;
    dueDate: string;
    project?: {
        id: number;
        name: string;
    };
    assignedDeveloper?: {
        id: number;
        name: string;
    };
};

function Tasks() {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);
    const [developers, setDevelopers] = useState<Developer[]>([]);

    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [projectId, setProjectId] = useState("");
    const [developerId, setDeveloperId] = useState("");
    const [priority, setPriority] = useState("MEDIUM");
    const [dueDate, setDueDate] = useState("");

    const [filterStatus, setFilterStatus] = useState("");
    const [filterPriority, setFilterPriority] = useState("");
    const [filterDueDateFrom, setFilterDueDateFrom] = useState("");
    const [filterDueDateTo, setFilterDueDateTo] = useState("");

    const [loading, setLoading] = useState(true);
    const [adding, setAdding] = useState(false);

    useEffect(() => {
        loadData();
    }, [filterStatus, filterPriority, filterDueDateFrom, filterDueDateTo]);

    async function loadData() {
        try {
            const params = new URLSearchParams();
            if (filterStatus) params.append("status", filterStatus);
            if (filterPriority) params.append("priority", filterPriority);
            if (filterDueDateFrom) params.append("dueDateFrom", filterDueDateFrom);
            if (filterDueDateTo) params.append("dueDateTo", filterDueDateTo);
            
            const url = `${API}/tasks?${params.toString()}`;

            const [tasksRes, projectsRes, developersRes] = await Promise.all([
                fetch(url, { credentials: "include" }),
                fetch(`${API}/projects`, { credentials: "include" }),
                fetch(`${API}/developers`, { credentials: "include" }),
            ]);

            const tasksData = await tasksRes.json();
            const projectsData = await projectsRes.json();
            const developersData = await developersRes.json();

            setTasks(Array.isArray(tasksData) ? tasksData : []);
            setProjects(Array.isArray(projectsData) ? projectsData : []);
            setDevelopers(
                Array.isArray(developersData) ? developersData : []
            );
        } catch (error) {
            console.error("Failed to load task data:", error);
        } finally {
            setLoading(false);
        }
    }

    async function addTask() {
        if (
            !title.trim() ||
            !projectId ||
            !developerId ||
            !dueDate
        ) {
            alert("Please fill all required fields.");
            return;
        }

        try {
            setAdding(true);

            const response = await fetch(`${API}/tasks`, {
                method: "POST",
                credentials: "include",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    title,
                    description,
                    projectId: Number(projectId),
                    assignedDeveloperId: Number(developerId),
                    priority,
                    dueDate,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                alert(data.message || "Failed to create task");
                return;
            }

            setTasks((current) => [data.task, ...current]);

            setTitle("");
            setDescription("");
            setProjectId("");
            setDeveloperId("");
            setPriority("MEDIUM");
            setDueDate("");
        } catch (error) {
            console.error("Create task error:", error);
            alert("Failed to create task.");
        } finally {
            setAdding(false);
        }
    }

    async function updateStatus(taskId: number, status: string) {
        try {
            const response = await fetch(`${API}/tasks/${taskId}/status`, {
                method: "PATCH",
                credentials: "include",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    status,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                alert(data.message || "Failed to update task");
                return;
            }

            setTasks((current) =>
                current.map((task) =>
                    task.id === taskId
                        ? {
                            ...task,
                            status: data.task.status,
                        }
                        : task
                )
            );
        } catch (error) {
            console.error("Update task error:", error);
            alert("Failed to update task.");
        }
    }

    async function deleteTask(taskId: number) {
        const confirmed = window.confirm(
            "Are you sure you want to delete this task?"
        );

        if (!confirmed) {
            return;
        }

        try {
            const response = await fetch(`${API}/tasks/${taskId}`, {
                method: "DELETE",
                credentials: "include",
            });

            const data = await response.json();

            if (!response.ok) {
                alert(data.message || "Failed to delete task");
                return;
            }

            setTasks((current) =>
                current.filter((task) => task.id !== taskId)
            );
        } catch (error) {
            console.error("Delete task error:", error);
            alert("Failed to delete task.");
        }
    }

    if (loading) {
        return (
            <div className="page">
                <div className="page-loading">
                    Loading tasks...
                </div>
            </div>
        );
    }

    return (
        <div className="page">
            <div className="card tasks-card">
                <div className="card-header">
                    <div>
                        <h2>Tasks</h2>
                        <p>Manage tasks across your projects</p>
                    </div>
                </div>

                {/* Filter Bar */}
                <div className="task-filters">
                    <div className="task-filter-group">
                        <label className="task-filter-label">Status</label>
                        <select className="task-filter-control" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                            <option value="">All Statuses</option>
                            <option value="TODO">TODO</option>
                            <option value="IN_PROGRESS">IN PROGRESS</option>
                            <option value="IN_REVIEW">IN REVIEW</option>
                            <option value="DONE">DONE</option>
                            <option value="OVERDUE">OVERDUE</option>
                        </select>
                    </div>
                    <div className="task-filter-group">
                        <label className="task-filter-label">Priority</label>
                        <select className="task-filter-control" value={filterPriority} onChange={(e) => setFilterPriority(e.target.value)}>
                            <option value="">All Priorities</option>
                            <option value="LOW">LOW</option>
                            <option value="MEDIUM">MEDIUM</option>
                            <option value="HIGH">HIGH</option>
                            <option value="CRITICAL">CRITICAL</option>
                        </select>
                    </div>
                    <div className="task-filter-group">
                        <label className="task-filter-label">Due Date From</label>
                        <input className="task-filter-control" type="date" value={filterDueDateFrom} onChange={(e) => setFilterDueDateFrom(e.target.value)} />
                    </div>
                    <div className="task-filter-group">
                        <label className="task-filter-label">Due Date To</label>
                        <input className="task-filter-control" type="date" value={filterDueDateTo} onChange={(e) => setFilterDueDateTo(e.target.value)} />
                    </div>
                </div>

                {/* Creation Form */}
                <div className="task-creation-form">
                    <div className="task-creation-grid">
                        <input className="task-creation-control" type="text" placeholder="Task title" value={title} onChange={(e) => setTitle(e.target.value)} />
                        <input className="task-creation-control" type="text" placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value)} />
                        <select className="task-creation-control" value={projectId} onChange={(e) => setProjectId(e.target.value)}>
                            <option value="">Select project</option>
                            {projects.map((project) => (
                                <option key={project.id} value={project.id}>{project.name}</option>
                            ))}
                        </select>
                        <select className="task-creation-control" value={developerId} onChange={(e) => setDeveloperId(e.target.value)}>
                            <option value="">Assign developer</option>
                            {developers.map((developer) => (
                                <option key={developer.id} value={developer.id}>{developer.name}</option>
                            ))}
                        </select>
                        <select className="task-creation-control" value={priority} onChange={(e) => setPriority(e.target.value)}>
                            <option value="LOW">LOW</option>
                            <option value="MEDIUM">MEDIUM</option>
                            <option value="HIGH">HIGH</option>
                            <option value="CRITICAL">CRITICAL</option>
                        </select>
                        <input className="task-creation-control" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
                    </div>
                    <div className="task-creation-actions">
                        <button className="primary-button" onClick={addTask} disabled={adding}>
                            {adding ? "Adding..." : "Add Task"}
                        </button>
                    </div>
                </div>

                {/* Task Table */}
                {tasks.length === 0 ? (
                    <div className="empty">No tasks yet</div>
                ) : (
                    <div className="tasks-table-wrapper">
                        <table className="tasks-table">
                            <colgroup>
                                <col style={{ width: '15%' }} />
                                <col style={{ width: '20%' }} />
                                <col style={{ width: '13%' }} />
                                <col style={{ width: '13%' }} />
                                <col style={{ width: '10%' }} />
                                <col style={{ width: '10%' }} />
                                <col style={{ width: '13%' }} />
                                <col style={{ width: '6%' }} />
                            </colgroup>
                            <thead>
                                <tr>
                                    <th>TASK</th>
                                    <th>DESCRIPTION</th>
                                    <th>PROJECT</th>
                                    <th>DEVELOPER</th>
                                    <th>DUE DATE</th>
                                    <th>PRIORITY</th>
                                    <th>STATUS</th>
                                    <th style={{ textAlign: 'right' }}>ACTION</th>
                                </tr>
                            </thead>
                            <tbody>
                                {tasks.map((task) => (
                                    <tr key={task.id}>
                                        <td className="tasks-cell-wrap"><strong>{task.title}</strong></td>
                                        <td className="tasks-cell-wrap tasks-cell-desc">{task.description || "—"}</td>
                                        <td className="tasks-cell-wrap">{task.project?.name || "—"}</td>
                                        <td className="tasks-cell-wrap">{task.assignedDeveloper?.name || "—"}</td>
                                        <td style={{ whiteSpace: 'nowrap' }}>{new Date(task.dueDate).toLocaleDateString()}</td>
                                        <td>
                                            <span className={`priority-badge ${task.priority.toLowerCase()}`}>
                                                {task.priority}
                                            </span>
                                        </td>
                                        <td>
                                            <select
                                                className={`status-select ${task.status.toLowerCase().replace("_", "-")}`}
                                                value={task.status}
                                                onChange={(e) => updateStatus(task.id, e.target.value)}
                                            >
                                                <option value="TODO">TODO</option>
                                                <option value="IN_PROGRESS">IN PROGRESS</option>
                                                <option value="IN_REVIEW">IN REVIEW</option>
                                                <option value="DONE">DONE</option>
                                                <option value="OVERDUE">OVERDUE</option>
                                            </select>
                                        </td>
                                        <td style={{ textAlign: 'right' }}>
                                            <button className="delete-text-button" onClick={() => deleteTask(task.id)}>
                                                Delete
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}

export default Tasks;