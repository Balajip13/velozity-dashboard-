import { useState } from "react";
import "./App.css";

const API = "http://localhost:5000/api";

type LoginProps = {
    onLoginSuccess: (user: any) => void;
};

export default function Login({ onLoginSuccess }: LoginProps) {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    async function handleLogin(e: React.FormEvent) {
        e.preventDefault();
        setError("");
        setLoading(true);

        try {
            const response = await fetch(`${API}/auth/login`, {
                method: "POST",
                credentials: "include",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ email, password }),
            });

            const data = await response.json();

            if (!response.ok) {
                setError(data.message || "Invalid credentials");
                return;
            }

            onLoginSuccess(data.user);
        } catch (err) {
            setError("Failed to connect to server");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="login-container">
            <div className="card">
                <div style={{ marginBottom: '40px', display: 'flex', flexDirection: 'column', alignItems: 'center', lineHeight: '1.2' }}>
                    <h2 style={{ margin: 0, fontSize: '32px', fontWeight: 'bold', color: '#111111' }}>Velozity</h2>
                    <span style={{ fontSize: '13px', fontWeight: '600', color: '#666666', letterSpacing: '1px', marginTop: '4px' }}>DASHBOARD</span>
                </div>

                <form onSubmit={handleLogin} style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    {error && (
                        <div style={{ padding: '10px', background: '#FFF5F5', color: '#E31B23', borderRadius: '4px', fontSize: '14px', textAlign: 'center', border: '1px solid #E31B23' }}>
                            {error}
                        </div>
                    )}
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <label htmlFor="email" style={{ fontSize: '13px', fontWeight: '600' }}>EMAIL ADDRESS</label>
                        <input
                            id="email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="Enter email address"
                            required
                        />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <label htmlFor="password" style={{ fontSize: '13px', fontWeight: '600' }}>PASSWORD</label>
                        <input
                            id="password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Enter your password"
                            required
                        />
                    </div>

                    <button 
                        type="submit" 
                        className="primary-button" 
                        disabled={loading}
                        style={{ marginTop: '10px' }}
                    >
                        {loading ? "AUTHENTICATING..." : "LOG IN"}
                    </button>
                </form>
            </div>
        </div>
    );
}
