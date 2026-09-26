import { Router } from "express";
import type { PrismaClient } from "../generated/prisma/client.js";
import { authorize, AuthRequest } from "../middleware/auth.js";
import { emitTaskStatusChanged, emitNotification } from "../lib/socket.js";

export default function taskRoutes(prisma: PrismaClient) {
    const router = Router();

    router.get("/", async (req, res) => {
        try {
            const authReq = req as AuthRequest;
            const user = authReq.user!;
            
            let whereClause: any = {};
            if (user.role === "PROJECT_MANAGER") {
                whereClause = { project: { createdById: user.id } };
            } else if (user.role === "DEVELOPER") {
                whereClause = { assignedDeveloperId: user.id };
            }

            const { status, priority, overdue, dueDateFrom, dueDateTo } = req.query;
            
            const validStatuses = ["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE", "OVERDUE"];
            const validPriorities = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];

            if (typeof status === "string" && status) {
                if (!validStatuses.includes(status)) {
                    return res.status(400).json({ message: "Invalid status filter" });
                }
                whereClause.status = status;
            }
            if (typeof priority === "string" && priority) {
                if (!validPriorities.includes(priority)) {
                    return res.status(400).json({ message: "Invalid priority filter" });
                }
                whereClause.priority = priority;
            }
            if (overdue === "true") {
                whereClause.status = "OVERDUE";
            }
            if (overdue === "false" || overdue === "true" === false && overdue !== undefined) {
                 if (overdue !== "false" && overdue !== "true") {
                    return res.status(400).json({ message: "Invalid overdue filter" });
                 }
            }

            if (dueDateFrom || dueDateTo) {
                let dateFilter: any = {};
                if (typeof dueDateFrom === "string" && dueDateFrom) {
                    const d = new Date(dueDateFrom);
                    if (Number.isNaN(d.getTime())) return res.status(400).json({ message: "Invalid dueDateFrom" });
                    dateFilter.gte = d;
                }
                if (typeof dueDateTo === "string" && dueDateTo) {
                    const d = new Date(dueDateTo);
                    if (Number.isNaN(d.getTime())) return res.status(400).json({ message: "Invalid dueDateTo" });
                    dateFilter.lte = d;
                }
                if (dateFilter.gte && dateFilter.lte && dateFilter.gte > dateFilter.lte) {
                    return res.status(400).json({ message: "dueDateFrom cannot be after dueDateTo" });
                }
                if (Object.keys(dateFilter).length > 0) {
                    whereClause.dueDate = dateFilter;
                }
            }

            let orderByClause: any = {
                createdAt: "desc",
            };

            if (user.role === "DEVELOPER") {
                orderByClause = [
                    { priority: "desc" },
                    { dueDate: "asc" }
                ];
            }

            const tasks = await prisma.task.findMany({
                where: whereClause,
                include: {
                    project: true,
                    assignedDeveloper: true,
                    activityLogs: {
                        orderBy: {
                            createdAt: "desc",
                        },
                    },
                },
                orderBy: orderByClause,
            });

            res.json(tasks);
        } catch (error) {
            console.error("Get tasks error:", error);

            res.status(500).json({
                message: "Failed to fetch tasks",
            });
        }
    });

    router.get("/:id", async (req, res) => {
        try {
            const id = Number(req.params.id);
            const authReq = req as AuthRequest;
            const user = authReq.user!;

            if (Number.isNaN(id)) {
                return res.status(400).json({
                    message: "Invalid task ID",
                });
            }

            const task = await prisma.task.findUnique({
                where: {
                    id,
                },
                include: {
                    project: true,
                    assignedDeveloper: true,
                    activityLogs: {
                        orderBy: {
                            createdAt: "desc",
                        },
                    },
                },
            });

            if (!task) {
                return res.status(404).json({
                    message: "Task not found",
                });
            }

            if (user.role === "PROJECT_MANAGER" && task.project.createdById !== user.id) {
                return res.status(403).json({ message: "Forbidden" });
            }

            if (user.role === "DEVELOPER" && task.assignedDeveloperId !== user.id) {
                return res.status(403).json({ message: "Forbidden" });
            }

            res.json(task);
        } catch (error) {
            console.error("Get task error:", error);

            res.status(500).json({
                message: "Failed to fetch task",
            });
        }
    });

    router.post("/", authorize("ADMIN", "PROJECT_MANAGER"), async (req, res) => {
        try {
            const authReq = req as AuthRequest;
            const user = authReq.user!;
            const {
                title,
                description,
                projectId,
                assignedDeveloperId,
                status,
                priority,
                dueDate,
            } = req.body;

            if (
                !title ||
                !projectId ||
                !assignedDeveloperId ||
                !dueDate
            ) {
                return res.status(400).json({
                    message:
                        "Title, projectId, assignedDeveloperId and dueDate are required",
                });
            }

            const parsedDueDate = new Date(dueDate);
            if (Number.isNaN(parsedDueDate.getTime())) {
                return res.status(400).json({ message: "Invalid dueDate format" });
            }

            const validStatuses = ["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE", "OVERDUE"];
            if (status && !validStatuses.includes(status)) {
                return res.status(400).json({ message: "Invalid status value" });
            }

            const validPriorities = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];
            if (priority && !validPriorities.includes(priority)) {
                return res.status(400).json({ message: "Invalid priority value" });
            }

            const developerUser = await prisma.user.findUnique({ where: { id: Number(assignedDeveloperId) }});
            if (!developerUser || developerUser.role !== "DEVELOPER") {
                return res.status(400).json({ message: "Assigned user must be a DEVELOPER" });
            }

            if (user.role === "PROJECT_MANAGER") {
                const project = await prisma.project.findUnique({ where: { id: Number(projectId) }});
                if (!project || project.createdById !== user.id) {
                    return res.status(403).json({ message: "Forbidden: Cannot create task for this project" });
                }
            }

            const task = await prisma.task.create({
                data: {
                    title,
                    description: description || null,
                    projectId: Number(projectId),
                    assignedDeveloperId: Number(assignedDeveloperId),
                    status: status || "TODO",
                    priority: priority || "MEDIUM",
                    dueDate: parsedDueDate,
                },
                include: {
                    project: true,
                    assignedDeveloper: true,
                },
            });

            if (task.assignedDeveloperId) {
                const message = `You have been assigned to a new task: ${task.title}`;
                const notification = await prisma.notification.create({
                    data: { userId: task.assignedDeveloperId, message }
                });
                const unreadCount = await prisma.notification.count({ where: { userId: task.assignedDeveloperId, read: false } });
                emitNotification(task.assignedDeveloperId, notification, unreadCount);
            }

            res.status(201).json({
                message: "Task created successfully",
                task,
            });
        } catch (error) {
            console.error("Create task error:", error);

            res.status(500).json({
                message: "Failed to create task",
            });
        }
    });

    router.put("/:id", async (req, res) => {
        try {
            const id = Number(req.params.id);
            const authReq = req as AuthRequest;
            const user = authReq.user!;

            if (Number.isNaN(id)) {
                return res.status(400).json({
                    message: "Invalid task ID",
                });
            }

            const existingTask = await prisma.task.findUnique({
                where: {
                    id,
                },
                include: {
                    project: true
                }
            });

            if (!existingTask) {
                return res.status(404).json({
                    message: "Task not found",
                });
            }

            if (user.role === "PROJECT_MANAGER" && existingTask.project.createdById !== user.id) {
                return res.status(403).json({ message: "Forbidden" });
            }

            if (user.role === "DEVELOPER") {
                if (existingTask.assignedDeveloperId !== user.id) {
                    return res.status(403).json({ message: "Forbidden" });
                }
                // Check if developer tries to update restricted fields
                const forbiddenUpdate = ["title", "description", "projectId", "assignedDeveloperId", "priority", "dueDate"].some(field => req.body[field] !== undefined);
                if (forbiddenUpdate) {
                    return res.status(403).json({ message: "Forbidden: Developers can only update task status" });
                }
            }

            const {
                title,
                description,
                projectId,
                assignedDeveloperId,
                status,
                priority,
                dueDate,
            } = req.body;

            const validStatuses = ["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE", "OVERDUE"];
            if (status !== undefined && !validStatuses.includes(status)) {
                return res.status(400).json({ message: "Invalid status value" });
            }

            const validPriorities = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];
            if (priority !== undefined && !validPriorities.includes(priority)) {
                return res.status(400).json({ message: "Invalid priority value" });
            }

            let parsedDueDate: Date | undefined;
            if (dueDate !== undefined) {
                parsedDueDate = new Date(dueDate);
                if (Number.isNaN(parsedDueDate.getTime())) {
                    return res.status(400).json({ message: "Invalid dueDate format" });
                }
            }

            if (assignedDeveloperId !== undefined) {
                const developerUser = await prisma.user.findUnique({ where: { id: Number(assignedDeveloperId) }});
                if (!developerUser || developerUser.role !== "DEVELOPER") {
                    return res.status(400).json({ message: "Assigned user must be a DEVELOPER" });
                }
            }

            const task = await prisma.task.update({
                where: {
                    id,
                },
                data: {
                    ...(title !== undefined && {
                        title,
                    }),

                    ...(description !== undefined && {
                        description,
                    }),

                    ...(projectId !== undefined && {
                        projectId: Number(projectId),
                    }),

                    ...(assignedDeveloperId !== undefined && {
                        assignedDeveloperId: Number(
                            assignedDeveloperId
                        ),
                    }),

                    ...(status !== undefined && {
                        status,
                    }),

                    ...(priority !== undefined && {
                        priority,
                    }),

                    ...(dueDate !== undefined && {
                        dueDate: parsedDueDate,
                    }),
                },
                include: {
                    project: true,
                    assignedDeveloper: true,
                },
            });

            if (
                status &&
                status !== existingTask.status
            ) {
                const activity = await prisma.activityLog.create({
                    data: {
                        taskId: id,
                        userId: user.id, // Overwrite with actual user.id
                        fromStatus: existingTask.status,
                        toStatus: status,
                    },
                    include: { user: true }
                });

                emitTaskStatusChanged({
                    id: activity.id,
                    taskId: task.id,
                    taskTitle: task.title,
                    projectId: task.project.id,
                    projectName: task.project.name,
                    fromStatus: activity.fromStatus,
                    toStatus: activity.toStatus,
                    userId: user.id,
                    userName: activity.user.name,
                    createdAt: activity.createdAt,
                }, task.project.createdById, task.assignedDeveloperId);

                if (status === "IN_REVIEW") {
                    const pmId = task.project.createdById;
                    const message = `Task "${task.title}" is ready for review`;
                    const notification = await prisma.notification.create({ data: { userId: pmId, message } });
                    const unreadCount = await prisma.notification.count({ where: { userId: pmId, read: false } });
                    emitNotification(pmId, notification, unreadCount);
                }
            }

            if (assignedDeveloperId && Number(assignedDeveloperId) !== existingTask.assignedDeveloperId) {
                const newDevId = Number(assignedDeveloperId);
                const message = `You have been assigned to task: ${task.title}`;
                const notification = await prisma.notification.create({ data: { userId: newDevId, message } });
                const unreadCount = await prisma.notification.count({ where: { userId: newDevId, read: false } });
                emitNotification(newDevId, notification, unreadCount);
            }

            res.json({
                message: "Task updated successfully",
                task,
            });
        } catch (error) {
            console.error("Update task error:", error);

            res.status(500).json({
                message: "Failed to update task",
            });
        }
    });

    router.patch("/:id/status", async (req, res) => {
        try {
            const id = Number(req.params.id);
            const authReq = req as AuthRequest;
            const user = authReq.user!;
            const { status } = req.body;

            if (Number.isNaN(id)) {
                return res.status(400).json({
                    message: "Invalid task ID",
                });
            }

            if (!status) {
                return res.status(400).json({
                    message: "Status is required",
                });
            }

            const validStatuses = ["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE", "OVERDUE"];
            if (!validStatuses.includes(status)) {
                return res.status(400).json({ message: "Invalid status value" });
            }

            const existingTask = await prisma.task.findUnique({
                where: {
                    id,
                },
                include: { project: true }
            });

            if (!existingTask) {
                return res.status(404).json({
                    message: "Task not found",
                });
            }

            if (user.role === "PROJECT_MANAGER" && existingTask.project.createdById !== user.id) {
                return res.status(403).json({ message: "Forbidden" });
            }

            if (user.role === "DEVELOPER" && existingTask.assignedDeveloperId !== user.id) {
                return res.status(403).json({ message: "Forbidden" });
            }

            const updatedTask = await prisma.task.update({
                where: {
                    id,
                },
                data: {
                    status,
                },
                include: {
                    project: true,
                    assignedDeveloper: true,
                },
            });

            if (
                status !== existingTask.status
            ) {
                const activity = await prisma.activityLog.create({
                    data: {
                        taskId: id,
                        userId: user.id, // Server side auth
                        fromStatus: existingTask.status,
                        toStatus: status,
                    },
                    include: { user: true }
                });

                emitTaskStatusChanged({
                    id: activity.id,
                    taskId: updatedTask.id,
                    taskTitle: updatedTask.title,
                    projectId: updatedTask.project.id,
                    projectName: updatedTask.project.name,
                    fromStatus: activity.fromStatus,
                    toStatus: activity.toStatus,
                    userId: user.id,
                    userName: activity.user.name,
                    createdAt: activity.createdAt,
                }, updatedTask.project.createdById, updatedTask.assignedDeveloperId);

                if (status === "IN_REVIEW") {
                    const pmId = updatedTask.project.createdById;
                    const message = `Task "${updatedTask.title}" is ready for review`;
                    const notification = await prisma.notification.create({ data: { userId: pmId, message } });
                    const unreadCount = await prisma.notification.count({ where: { userId: pmId, read: false } });
                    emitNotification(pmId, notification, unreadCount);
                }
            }

            res.json({
                message: "Task status updated successfully",
                task: updatedTask,
            });
        } catch (error) {
            console.error(
                "Update task status error:",
                error
            );

            res.status(500).json({
                message: "Failed to update task status",
            });
        }
    });

    router.delete("/:id", authorize("ADMIN", "PROJECT_MANAGER"), async (req, res) => {
        try {
            const id = Number(req.params.id);
            const authReq = req as AuthRequest;
            const user = authReq.user!;

            if (Number.isNaN(id)) {
                return res.status(400).json({
                    message: "Invalid task ID",
                });
            }

            const existingTask = await prisma.task.findUnique({
                where: {
                    id,
                },
                include: { project: true }
            });

            if (!existingTask) {
                return res.status(404).json({
                    message: "Task not found",
                });
            }

            if (user.role === "PROJECT_MANAGER" && existingTask.project.createdById !== user.id) {
                return res.status(403).json({ message: "Forbidden" });
            }

            // Delete related activity logs first.
            await prisma.activityLog.deleteMany({
                where: {
                    taskId: id,
                },
            });

            // Delete the task.
            await prisma.task.delete({
                where: {
                    id,
                },
            });

            res.json({
                message: "Task deleted successfully",
            });
        } catch (error) {
            console.error("Delete task error:", error);

            res.status(500).json({
                message: "Failed to delete task",
            });
        }
    });

    return router;
}