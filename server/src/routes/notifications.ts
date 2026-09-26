import { Router } from "express";
import type { PrismaClient } from "../generated/prisma/client.js";
import { AuthRequest } from "../middleware/auth.js";
import { getIO } from "../lib/socket.js";

export default function notificationRoutes(prisma: PrismaClient) {
    const router = Router();

    router.get("/", async (req, res) => {
        try {
            const authReq = req as AuthRequest;
            const user = authReq.user!;
            let targetUserId = user.id;

            if (user.role === "ADMIN" && req.query.userId) {
                targetUserId = Number(req.query.userId);
            }

            const notifications = await prisma.notification.findMany({
                where: { userId: targetUserId },
                orderBy: {
                    createdAt: "desc",
                },
            });

            res.json(notifications);
        } catch (error) {
            console.error("Get notifications error:", error);

            res.status(500).json({
                message: "Failed to fetch notifications",
            });
        }
    });

    router.post("/", async (req, res) => {
        try {
            const authReq = req as AuthRequest;
            const user = authReq.user!;
            let { userId, message } = req.body;

            if (!message) {
                return res.status(400).json({
                    message: "message is required",
                });
            }

            if (!userId) {
                userId = user.id;
            } else if (user.role !== "ADMIN" && Number(userId) !== user.id) {
                return res.status(403).json({ message: "Forbidden" });
            }

            const notification = await prisma.notification.create({
                data: {
                    userId: Number(userId),
                    message,
                },
            });

            res.status(201).json({
                message: "Notification created successfully",
                notification,
            });
        } catch (error) {
            console.error("Create notification error:", error);

            res.status(500).json({
                message: "Failed to create notification",
            });
        }
    });

    router.put("/:id/read", async (req, res) => {
        try {
            const id = Number(req.params.id);
            const authReq = req as AuthRequest;
            const user = authReq.user!;

            const existing = await prisma.notification.findUnique({ where: { id }});
            if (!existing) {
                return res.status(404).json({ message: "Notification not found" });
            }

            if (user.role !== "ADMIN" && existing.userId !== user.id) {
                return res.status(403).json({ message: "Forbidden" });
            }

            const notification = await prisma.notification.update({
                where: { id },
                data: {
                    read: true,
                },
            });

            try {
                const unreadCount = await prisma.notification.count({ where: { userId: user.id, read: false } });
                const io = getIO();
                io.to(`admin`).to(`pm_${user.id}`).to(`dev_${user.id}`).emit("notificationUnreadCount", { count: unreadCount });
            } catch (e) {}

            res.json({
                message: "Notification marked as read",
                notification,
            });
        } catch (error) {
            console.error("Mark notification read error:", error);

            res.status(500).json({
                message: "Failed to update notification",
            });
        }
    });

    router.put("/read-all", async (req, res) => {
        try {
            const authReq = req as AuthRequest;
            const user = authReq.user!;

            await prisma.notification.updateMany({
                where: { userId: user.id, read: false },
                data: { read: true },
            });

            try {
                const unreadCount = 0;
                const io = getIO();
                io.to(`admin`).to(`pm_${user.id}`).to(`dev_${user.id}`).emit("notificationUnreadCount", { count: unreadCount });
            } catch (e) {}

            res.json({
                message: "All notifications marked as read",
            });
        } catch (error) {
            console.error("Mark all notifications read error:", error);
            res.status(500).json({
                message: "Failed to update notifications",
            });
        }
    });

    router.delete("/:id", async (req, res) => {
        try {
            const id = Number(req.params.id);
            const authReq = req as AuthRequest;
            const user = authReq.user!;

            const existing = await prisma.notification.findUnique({ where: { id }});
            if (!existing) {
                return res.status(404).json({ message: "Notification not found" });
            }

            if (user.role !== "ADMIN" && existing.userId !== user.id) {
                return res.status(403).json({ message: "Forbidden" });
            }

            await prisma.notification.delete({
                where: { id },
            });

            try {
                const unreadCount = await prisma.notification.count({ where: { userId: user.id, read: false } });
                const io = getIO();
                io.to(`admin`).to(`pm_${user.id}`).to(`dev_${user.id}`).emit("notificationUnreadCount", { count: unreadCount });
            } catch (e) {}

            res.json({
                message: "Notification deleted successfully",
            });
        } catch (error) {
            console.error("Delete notification error:", error);

            res.status(500).json({
                message: "Failed to delete notification",
            });
        }
    });

    return router;
}