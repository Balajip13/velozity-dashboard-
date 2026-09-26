import { useEffect, useState } from "react";

const API = "http://localhost:5000/api";

type Client = {
    id: number;
    name: string;
};

type Project = {
    id: number;
    name: string;
    description?: string;
    client?: Client;
};

function Projects() {
    const [projects, setProjects] = useState<Project[]>([]);
    const [clients, setClients] = useState<Client[]>([]);

    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [clientId, setClientId] = useState("");

    async function loadData() {
        try {
            const [projectsRes, clientsRes] = await Promise.all([
                fetch(`${API}/projects`, { credentials: "include" }),
                fetch(`${API}/clients`, { credentials: "include" }),
            ]);

            const projectsData = await projectsRes.json();
            const clientsData = await clientsRes.json();

            setProjects(Array.isArray(projectsData) ? projectsData : []);
            setClients(Array.isArray(clientsData) ? clientsData : []);
        } catch (error) {
            console.error("Projects loading error:", error);
        }
    }

    useEffect(() => {
        loadData();
    }, []);

    async function createProject(e: React.FormEvent) {
        e.preventDefault();

        if (!name || !clientId) {
            alert("Project name and client are required");
            return;
        }

        const response = await fetch(`${API}/projects`, {
            method: "POST",
            credentials: "include",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                name,
                description,
                clientId: Number(clientId),
            }),
        });

        if (response.ok) {
            setName("");
            setDescription("");
            setClientId("");
            await loadData();
        } else {
            const error = await response.json();
            alert(error.message || "Failed to create project");
        }
    }

    return (
        <div className="page-content">
            <div className="page-title">
                <h1>Projects</h1>
                <p>Manage your projects and clients</p>
            </div>

            <form className="project-form" onSubmit={createProject}>
                <input
                    placeholder="Project name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                />

                <input
                    placeholder="Description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                />

                <select
                    value={clientId}
                    onChange={(e) => setClientId(e.target.value)}
                >
                    <option value="">Select client</option>

                    {clients.map((client) => (
                        <option key={client.id} value={client.id}>
                            {client.name}
                        </option>
                    ))}
                </select>

                <button type="submit" className="primary-button">Add Project</button>
            </form>

            <div className="card tasks-card">
                <div className="card-header">
                    <h2>All Projects</h2>
                </div>
                {projects.length === 0 ? (
                    <div className="empty">No projects yet</div>
                ) : (
                    <div className="table-wrapper">
                        <table>
                            <thead>
                                <tr>
                                    <th style={{ width: '32%' }}>PROJECT NAME</th>
                                    <th style={{ width: '43%' }}>DESCRIPTION</th>
                                    <th style={{ width: '25%' }}>CLIENT</th>
                                </tr>
                            </thead>
                            <tbody>
                                {projects.map((project) => (
                                    <tr key={project.id}>
                                        <td><strong>{project.name}</strong></td>
                                        <td>{project.description || "-"}</td>
                                        <td>{project.client?.name || "Unknown"}</td>
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

export default Projects;