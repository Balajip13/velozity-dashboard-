import { Server } from "socket.io";
import { Server as HttpServer } from "http";
import jwt from "jsonwebtoken";
import { PrismaClient } from "../generated/prisma/client.js";
import { prisma } from "./prisma.js";

const ACCESS_TOKEN_SECRET = process.env.JWT_SECRET || "velozity-access-secret";

let io: Server;

// Keep track of connected sockets by user ID.
// Key: userId, Value: Set of socket IDs.
const connectedUsers = new Map<number, Set<string>>();

export function getIO() {
    if (!io) {
        throw new Error("Socket.io not initialized!");
    }
    return io;
}

const SOCKET_ALLOWED_ORIGINS = [
    /^http:\/\/localhost:\d+$/,
    /^https:\/\/.*\.vercel\.app$/,
];

export function initSocket(server: HttpServer) {
    io = new Server(server, {
        cors: {
            origin: (origin, callback) => {
                if (!origin || SOCKET_ALLOWED_ORIGINS.some((r) => r.test(origin))) {
                    callback(null, true);
                } else {
                    callback(new Error("Not allowed by CORS"));
                }
            },
            credentials: true,
        },
    });

    io.use((socket, next) => {
        try {
            const rawCookie = socket.request.headers.cookie;
            if (!rawCookie) {
                return next(new Error("Authentication error: No cookies"));
            }

            const cookies = Object.fromEntries(rawCookie.split('; ').map(c => {
                const [k, ...v] = c.split('=');
                return [k, decodeURIComponent(v.join('='))];
            }));
            const token = cookies.accessToken;

            if (!token) {
                return next(new Error("Authentication error: No access token"));
            }

            const decoded = jwt.verify(token, ACCESS_TOKEN_SECRET) as {
                id: number;
                role: string;
            };

            (socket as any).user = {
                id: decoded.id,
                role: decoded.role,
            };

            next();
        } catch (err) {
            next(new Error("Authentication error: Invalid token"));
        }
    });

    io.on("connection", async (socket) => {
        const user = (socket as any).user;
        
        if (!connectedUsers.has(user.id)) {
            connectedUsers.set(user.id, new Set());
        }
        connectedUsers.get(user.id)!.add(socket.id);
        
        io.emit("onlineUsers", { count: connectedUsers.size });

        if (user.role === "ADMIN") {
            socket.join("admin");
        } else if (user.role === "PROJECT_MANAGER") {
            socket.join(`pm_${user.id}`);
        } else if (user.role === "DEVELOPER") {
            socket.join(`dev_${user.id}`);
        }

        socket.on("disconnect", () => {
            const userSockets = connectedUsers.get(user.id);
            if (userSockets) {
                userSockets.delete(socket.id);
                if (userSockets.size === 0) {
                    connectedUsers.delete(user.id);
                    io.emit("onlineUsers", { count: connectedUsers.size });
                }
            }
        });

        try {
            let whereClause: any = {};
            if (user.role === "PROJECT_MANAGER") {
                whereClause = { task: { project: { createdById: user.id } } };
            } else if (user.role === "DEVELOPER") {
                whereClause = { task: { assignedDeveloperId: user.id } };
            }

            const activities = await prisma.activityLog.findMany({
                where: whereClause,
                include: {
                    task: {
                        include: { project: true }
                    },
                    user: true,
                },
                orderBy: {
                    createdAt: "desc",
                },
                take: 20,
            });

            const formattedActivities = activities.map(a => ({
                id: a.id,
                userName: a.user.name,
                taskTitle: a.task.title,
                projectName: a.task.project.name,
                fromStatus: a.fromStatus,
                toStatus: a.toStatus,
                createdAt: a.createdAt,
            }));

            socket.emit("activityHistory", { activities: formattedActivities });

            const unreadCount = await prisma.notification.count({
                where: { userId: user.id, read: false }
            });
            socket.emit("notificationUnreadCount", { count: unreadCount });
        } catch (err) {
            console.error("Error sending initial socket data:", err);
        }
    });

    return io;
}

export function emitTaskStatusChanged(data: any, pmId: number, devId: number) {
    if (!io) return;
    io.to("admin").to(`pm_${pmId}`).to(`dev_${devId}`).emit("taskStatusChanged", data);
}

export function emitNotification(userId: number, notification: any, unreadCount: number) {
    if (!io) return;
    io.to(`admin`).to(`pm_${userId}`).to(`dev_${userId}`).emit("notificationCreated", notification);
    io.to(`admin`).to(`pm_${userId}`).to(`dev_${userId}`).emit("notificationUnreadCount", { count: unreadCount });
}
