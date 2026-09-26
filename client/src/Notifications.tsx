import { useEffect, useState } from "react";

const API = import.meta.env.VITE_API_URL ?? "http://localhost:5000/api";

type Notification = {
    id: number;
    userId: number;
    message: string;
    read: boolean;
    createdAt: string;
};

export default function Notifications() {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);

    async function loadNotifications() {
        try {
            const response = await fetch(`${API}/notifications`, {
                credentials: "include"
            });

            if (!response.ok) {
                throw new Error("Failed to fetch notifications");
            }

            const data = await response.json();

            setNotifications(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error("Notifications loading error:", error);
            setNotifications([]);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        loadNotifications();
    }, []);

    async function markAsRead(id: number) {
        try {
            const response = await fetch(`${API}/notifications/${id}/read`, {
                method: "PUT",
                credentials: "include",
            });

            if (!response.ok) {
                throw new Error("Failed to mark notification as read");
            }

            setNotifications((current) =>
                current.map((notification) =>
                    notification.id === id
                        ? { ...notification, read: true }
                        : notification
                )
            );
        } catch (error) {
            console.error("Mark notification read error:", error);
        }
    }

    async function markAllAsRead() {
        try {
            const unreadNotifications = notifications.filter(
                (notification) => !notification.read
            );

            await Promise.all(
                unreadNotifications.map((notification) =>
                    fetch(`${API}/notifications/${notification.id}/read`, {
                        method: "PUT",
                        credentials: "include",
                    })
                )
            );

            setNotifications((current) =>
                current.map((notification) => ({
                    ...notification,
                    read: true,
                }))
            );
        } catch (error) {
            console.error("Mark all notifications read error:", error);
        }
    }

    if (loading) {
        return (
            <div className="page-content">
                <div className="page-title" style={{ textAlign: 'center' }}>
                    <h1>Notifications</h1>
                    <p>Stay updated with your project activity</p>
                </div>

                <div className="card">
                    <div className="empty">
                        Loading notifications...
                    </div>
                </div>
            </div>
        );
    }

    const unreadCount = notifications.filter(
        (notification) => !notification.read
    ).length;

    return (
        <div className="page-content">
            <div className="card tasks-card">
                <div className="card-header notifications-header">
                    <div className="notifications-title">
                        <h2>Notifications</h2>
                        <p>Stay updated with your project activity</p>
                    </div>

                    {unreadCount > 0 && (
                        <button
                            className="small-button mark-all-read"
                            onClick={markAllAsRead}
                        >
                            Mark all as read
                        </button>
                    )}
                </div>
                {notifications.length === 0 ? (
                    <div className="empty">
                        No notifications yet. You are all caught up.
                    </div>
                ) : (
                    <div className="list">
                        {notifications.map((notification) => (
                            <div
                                key={notification.id}
                                className="list-item"
                                style={{
                                    borderLeft: !notification.read ? '3px solid #E31B23' : '3px solid transparent',
                                    paddingLeft: '12px'
                                }}
                            >
                                <div className="list-info">
                                    <strong>
                                        {notification.message}
                                    </strong>
                                    <small>
                                        {new Date(
                                            notification.createdAt
                                        ).toLocaleString()}
                                    </small>
                                </div>

                                {!notification.read && (
                                    <button
                                        className="small-button"
                                        onClick={() =>
                                            markAsRead(notification.id)
                                        }
                                    >
                                        Mark as read
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}