import { Router } from "express";
import type { PrismaClient } from "../generated/prisma/client.js";
import { AuthRequest } from "../middleware/auth.js";

export default function dashboardRoutes(prisma: PrismaClient) {
    const router = Router();

    router.get("/stats", async (req, res) => {
        try {
            const authReq = req as AuthRequest;
            const user = authReq.user!;
            
            let projectWhere: any = {};
            let taskWhere: any = {};
            
            if (user.role === "PROJECT_MANAGER") {
                projectWhere = { createdById: user.id };
                taskWhere = { project: { createdById: user.id } };
            } else if (user.role === "DEVELOPER") {
                projectWhere = { tasks: { some: { assignedDeveloperId: user.id } } };
                taskWhere = { assignedDeveloperId: user.id };
            }

            const [
                totalClients,
                totalProjects,
                totalTasks,
                completedTasks,
                overdueTasks,
                todoTasks,
                inProgressTasks,
                inReviewTasks,
                developers,
                lowTasks,
                mediumTasks,
                highTasks,
                criticalTasks,
            ] = await Promise.all([
                prisma.client.count(),

                prisma.project.count({ where: projectWhere }),

                prisma.task.count({ where: taskWhere }),

                prisma.task.count({
                    where: {
                        ...taskWhere,
                        status: "DONE",
                    },
                }),

                prisma.task.count({
                    where: {
                        ...taskWhere,
                        status: "OVERDUE",
                    },
                }),

                prisma.task.count({
                    where: {
                        ...taskWhere,
                        status: "TODO",
                    },
                }),

                prisma.task.count({
                    where: {
                        ...taskWhere,
                        status: "IN_PROGRESS",
                    },
                }),

                prisma.task.count({
                    where: {
                        ...taskWhere,
                        status: "IN_REVIEW",
                    },
                }),

                prisma.user.count({
                    where: {
                        role: "DEVELOPER",
                    },
                }),

                prisma.task.count({ where: { ...taskWhere, priority: "LOW" } }),
                prisma.task.count({ where: { ...taskWhere, priority: "MEDIUM" } }),
                prisma.task.count({ where: { ...taskWhere, priority: "HIGH" } }),
                prisma.task.count({ where: { ...taskWhere, priority: "CRITICAL" } }),
            ]);

            res.json({
                clients: totalClients, // For DEVELOPER, maybe 0? The requirement says DEVELOPER receives only their assigned-task stats.
                projects: totalProjects,
                tasks: totalTasks,
                completedTasks,
                overdueTasks,
                developers,
                taskStatus: {
                    todo: todoTasks,
                    inProgress: inProgressTasks,
                    inReview: inReviewTasks,
                    done: completedTasks,
                    overdue: overdueTasks,
                },
                taskPriority: {
                    low: lowTasks,
                    medium: mediumTasks,
                    high: highTasks,
                    critical: criticalTasks,
                }
            });
        } catch (error) {
            console.error("Dashboard stats error:", error);

            res.status(500).json({
                message: "Failed to fetch dashboard statistics",
            });
        }
    });

    return router;
}