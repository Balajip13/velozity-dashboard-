import "dotenv/config";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { createServer } from "http";
import authRoutes from "./routes/auth.js";
import clientRoutes from "./routes/clients.js";
import { prisma } from "./lib/prisma.js";
import projectRoutes from "./routes/projects.js";
import taskRoutes from "./routes/tasks.js";
import dashboardRoutes from "./routes/dashboard.js";
import activityRoutes from "./routes/activity.js";
import notificationRoutes from "./routes/notifications.js";
import developerRoutes from "./routes/developers.js";
import { initSocket } from "./lib/socket.js";
import { startOverdueTasksJob } from "./jobs/overdueTasks.js";

const app = express();
const httpServer = createServer(app);

initSocket(httpServer);

startOverdueTasksJob();

const PORT = process.env.PORT || 5000;

const ALLOWED_ORIGINS = [
    /^http:\/\/localhost:\d+$/,
    /^https:\/\/.*\.vercel\.app$/,
];

app.use(
    cors({
        origin: (origin, callback) => {
            if (!origin || ALLOWED_ORIGINS.some((r) => r.test(origin))) {
                callback(null, true);
            } else {
                callback(new Error("Not allowed by CORS"));
            }
        },
        credentials: true,
    })
);

app.use(express.json());
app.use(cookieParser());

import { authenticate } from "./middleware/auth.js";

app.use("/api/auth", authRoutes(prisma));

app.get("/healthz", (_req, res) => {
    res.status(200).json({ status: "ok" });
});

app.use(authenticate);

app.use("/api/clients", clientRoutes(prisma));
app.use("/api/projects", projectRoutes(prisma));
app.use("/api/tasks", taskRoutes(prisma));
app.use("/api/dashboard", dashboardRoutes(prisma));
app.use("/api/activity", activityRoutes(prisma));
app.use("/api/notifications", notificationRoutes(prisma));
app.use("/api/developers", developerRoutes(prisma));

app.get("/", (_req, res) => {
    res.json({
        message: "Velozity Dashboard API is running",
    });
});


app.get("/api/health", async (_req, res) => {
    try {
        await prisma.$queryRaw`SELECT 1`;

        res.json({
            status: "OK",
            message: "Server is healthy",
            database: "connected",
        });
    } catch (error) {
        console.error("Database connection error:", error);

        res.status(500).json({
            status: "ERROR",
            message: "Database connection failed",
        });
    }
});

httpServer.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});