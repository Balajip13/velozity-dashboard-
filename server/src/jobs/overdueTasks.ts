import cron from "node-cron";
import { prisma } from "../lib/prisma.js";
import { emitTaskStatusChanged, emitNotification } from "../lib/socket.js";

let isRunning = false;


export async function executeOverdueTasksJob() {
    if (isRunning) return;
    isRunning = true;

    try {
        const now = new Date();

            const overdueTasks = await prisma.task.findMany({
                where: {
                    dueDate: {
                        lt: now,
                    },
                    status: {
                        notIn: ["DONE", "OVERDUE"],
                    },
                },
                include: {
                    project: true,
                    assignedDeveloper: true,
                },
            });

            for (const task of overdueTasks) {
                const oldStatus = task.status;

                const updatedTask = await prisma.task.update({
                    where: { id: task.id },
                    data: { status: "OVERDUE" },
                });

                const activityUserId = task.project.createdById;
                const activity = await prisma.activityLog.create({
                    data: {
                        taskId: task.id,
                        userId: activityUserId,
                        fromStatus: oldStatus,
                        toStatus: "OVERDUE",
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
                    userId: activityUserId,
                    userName: activity.user.name + " (System)",
                    createdAt: activity.createdAt,
                }, task.project.createdById, task.assignedDeveloperId!);

                const message = `Task "${task.title}" is now OVERDUE!`;
                
                if (task.assignedDeveloperId) {
                    const devNotification = await prisma.notification.create({
                        data: { userId: task.assignedDeveloperId, message }
                    });
                    const devUnread = await prisma.notification.count({ where: { userId: task.assignedDeveloperId, read: false } });
                    emitNotification(task.assignedDeveloperId, devNotification, devUnread);
                }

                if (task.project.createdById) {
                    const pmNotification = await prisma.notification.create({
                        data: { userId: task.project.createdById, message }
                    });
                    const pmUnread = await prisma.notification.count({ where: { userId: task.project.createdById, read: false } });
                    emitNotification(task.project.createdById, pmNotification, pmUnread);
                }
            }

            if (overdueTasks.length > 0) {
                console.log(`[Scheduler] Marked ${overdueTasks.length} tasks as OVERDUE.`);
            }

    } catch (error) {
        console.error("[Scheduler] Error running overdue tasks job:", error);
    } finally {
        isRunning = false;
    }
}

export function startOverdueTasksJob() {
    cron.schedule("* * * * *", executeOverdueTasksJob);

    console.log("[Scheduler] Overdue tasks background job initialized.");
}
