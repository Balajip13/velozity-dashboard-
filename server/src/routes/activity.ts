import { Router } from "express";
import type { PrismaClient } from "../generated/prisma/client.js";
import { AuthRequest } from "../middleware/auth.js";

export default function activityRoutes(prisma: PrismaClient) {
    const router = Router();

    router.get("/", async (req, res) => {
        try {
            const authReq = req as AuthRequest;
            const user = authReq.user!;
            
            let whereClause: any = {};
            if (user.role === "PROJECT_MANAGER") {
                whereClause = { task: { project: { createdById: user.id } } };
            } else if (user.role === "DEVELOPER") {
                whereClause = { task: { assignedDeveloperId: user.id } };
            }

            const activities = await prisma.activityLog.findMany({
                where: whereClause,
                include: {
                    task: true,
                    user: true,
                },
                orderBy: {
                    createdAt: "desc",
                },
                take: 20,
            });

            res.json(activities);
        } catch (error) {
            console.error("Activity feed error:", error);

            res.status(500).json({
                message: "Failed to fetch activity feed",
            });
        }
    });

    return router;
}