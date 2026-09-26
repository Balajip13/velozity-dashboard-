import { useEffect, useState } from "react";

const API = import.meta.env.VITE_API_URL ?? "http://localhost:5000/api";

type Client = {
    id: number;
    name: string;
    email: string;
};

function Clients() {
    const [clients, setClients] = useState<Client[]>([]);
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");

    async function loadClients() {
        const response = await fetch(`${API}/clients`, { credentials: "include" });
        const data = await response.json();
        setClients(Array.isArray(data) ? data : []);
    }

    useEffect(() => {
        loadClients();
    }, []);

    async function createClient(e: React.FormEvent) {
        e.preventDefault();

        if (!name || !email) return;

        const response = await fetch(`${API}/clients`, {
            method: "POST",
            credentials: "include",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                name,
                email,
            }),
        });

        if (response.ok) {
            setName("");
            setEmail("");
            loadClients();
        }
    }

    return (
        <div className="page-content">
            <div className="page-title">
                <h1>Clients</h1>
                <p>Manage your clients</p>
            </div>

            <form className="project-form" onSubmit={createClient}>
                <input
                    placeholder="Client name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                />

                <input
                    placeholder="Client email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                />

                <button type="submit" className="primary-button">Add Client</button>
            </form>

            <div className="card tasks-card">
                <div className="card-header">
                    <h2>All Clients</h2>
                </div>
                {clients.length === 0 ? (
                    <div className="empty">No clients yet</div>
                ) : (
                    <div className="table-wrapper">
                        <table>
                            <thead>
                                <tr>
                                    <th>Name</th>
                                    <th>Email</th>
                                </tr>
                            </thead>
                            <tbody>
                                {clients.map((client) => (
                                    <tr key={client.id}>
                                        <td><strong>{client.name}</strong></td>
                                        <td>{client.email}</td>
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

export default Clients;