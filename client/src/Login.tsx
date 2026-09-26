import { useState } from "react";
import "./App.css";

const API = import.meta.env.VITE_API_URL ?? "http://localhost:5000/api";

type LoginProps = {
    onLoginSuccess: (user: any) => void;
};

export default function Login({ onLoginSuccess }: LoginProps) {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

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
                        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                            <input
                                id="password"
                                type={showPassword ? "text" : "password"}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Enter your password"
                                required
                                style={{ paddingRight: '40px' }}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                aria-label={showPassword ? "Hide password" : "Show password"}
                                style={{
                                    position: 'absolute',
                                    right: '10px',
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer',
                                    padding: '0',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: '#666666'
                                }}
                            >
                                {showPassword ? (
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24M1 1l22 22"/></svg>
                                ) : (
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                                )}
                            </button>
                        </div>
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
