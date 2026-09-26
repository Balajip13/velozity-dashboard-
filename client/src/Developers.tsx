import { useEffect, useState } from "react";

const API = import.meta.env.VITE_API_URL ?? "http://localhost:5000/api";

type Developer = {
    id: number;
    name: string;
    email: string;
    role: string;
};

export default function Developers() {
    const [developers, setDevelopers] = useState<Developer[]>([]);
    const [loading, setLoading] = useState(true);

    async function loadDevelopers() {
        try {
            const response = await fetch(`${API}/developers`, { credentials: "include" });

            if (!response.ok) {
                throw new Error("Failed to fetch developers");
            }

            const data = await response.json();

            setDevelopers(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error("Developers loading error:", error);
            setDevelopers([]);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        loadDevelopers();
    }, []);

    if (loading) {
        return (
            <div className="page-content">
                <div className="page-title">
                    <h1>Developers</h1>
                    <p>Manage your development team</p>
                </div>

                <div className="card">
                    <div className="empty">
                        Loading developers...
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="page-content">
            <div className="page-title">
                <h1>Developers</h1>
                <p>Manage your development team</p>
            </div>

            <div className="card tasks-card">
                <div className="card-header">
                    <h2>Team Members</h2>
                </div>
                {developers.length === 0 ? (
                    <div className="empty">
                        No developers found.
                    </div>
                ) : (
                    <div className="table-wrapper">
                        <table>
                            <thead>
                                <tr>
                                    <th>Name</th>
                                    <th>Email</th>
                                    <th>Role</th>
                                </tr>
                            </thead>
                            <tbody>
                                {developers.map((developer) => (
                                    <tr key={developer.id}>
                                        <td><strong>{developer.name}</strong></td>
                                        <td>{developer.email}</td>
                                        <td>
                                            <span className="status">
                                                {developer.role.replace("_", " ")}
                                            </span>
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