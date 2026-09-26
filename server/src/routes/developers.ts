import { Router } from "express";
import type { PrismaClient } from "../generated/prisma/client.js";
import { authorize } from "../middleware/auth.js";

export default function developerRoutes(prisma: PrismaClient) {
    const router = Router();

    router.get("/", authorize("ADMIN", "PROJECT_MANAGER"), async (_req, res) => {
        try {
            const developers = await prisma.user.findMany({
                where: {
                    role: "DEVELOPER",
                },
                select: {
                    id: true,
                    name: true,
                    email: true,
                    role: true,
                },
                orderBy: {
                    createdAt: "desc",
                },
            });

            res.json(developers);
        } catch (error) {
            console.error("Get developers error:", error);

            res.status(500).json({
                message: "Failed to fetch developers",
            });
        }
    });

    return router;
}