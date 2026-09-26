import { Router, Response } from "express";
import type { PrismaClient } from "../generated/prisma/client.js";
import { authorize, AuthRequest } from "../middleware/auth.js";

export default function projectRoutes(prisma: PrismaClient) {
    const router = Router();

    router.get("/", async (req, res) => {
        try {
            const authReq = req as AuthRequest;
            const user = authReq.user!;
            
            let whereClause: any = {};
            
            if (user.role === "PROJECT_MANAGER") {
                whereClause = { createdById: user.id };
            } else if (user.role === "DEVELOPER") {
                whereClause = { tasks: { some: { assignedDeveloperId: user.id } } };
            }

            const projects = await prisma.project.findMany({
                where: whereClause,
                include: {
                    client: true,
                    createdBy: true,
                    tasks: true,
                },
                orderBy: {
                    createdAt: "desc",
                },
            });

            res.json(projects);
        } catch (error) {
            console.error("Get projects error:", error);
            res.status(500).json({
                message: "Failed to fetch projects",
            });
        }
    });

    router.get("/:id", async (req, res) => {
        try {
            const id = Number(req.params.id);
            const authReq = req as AuthRequest;
            const user = authReq.user!;

            const project = await prisma.project.findUnique({
                where: { id },
                include: {
                    client: true,
                    createdBy: true,
                    tasks: true,
                },
            });

            if (!project) {
                return res.status(404).json({
                    message: "Project not found",
                });
            }

            if (user.role === "PROJECT_MANAGER" && project.createdById !== user.id) {
                return res.status(403).json({ message: "Forbidden" });
            }

            if (user.role === "DEVELOPER") {
                const isAssigned = project.tasks.some(t => t.assignedDeveloperId === user.id);
                if (!isAssigned) {
                    return res.status(403).json({ message: "Forbidden" });
                }
            }

            res.json(project);
        } catch (error) {
            console.error("Get project error:", error);
            res.status(500).json({
                message: "Failed to fetch project",
            });
        }
    });

    router.post("/", authorize("ADMIN", "PROJECT_MANAGER"), async (req, res) => {
        try {
            const authReq = req as AuthRequest;
            const user = authReq.user!;
            const {
                name,
                description,
                clientId,
            } = req.body;
            let { createdById } = req.body;

            if (!name || !clientId) {
                return res.status(400).json({
                    message: "Name and clientId are required",
                });
            }

            const client = await prisma.client.findUnique({ where: { id: Number(clientId) } });
            if (!client) {
                return res.status(400).json({ message: "Invalid clientId: Client does not exist" });
            }

            if (user.role === "PROJECT_MANAGER") {
                createdById = user.id;
            } else if (!createdById) {
                createdById = user.id;
            }

            const project = await prisma.project.create({
                data: {
                    name,
                    description,
                    clientId: Number(clientId),
                    createdById: Number(createdById),
                },
                include: {
                    client: true,
                    createdBy: true,
                },
            });

            res.status(201).json({
                message: "Project created successfully",
                project,
            });
        } catch (error) {
            console.error("Create project error:", error);
            res.status(500).json({
                message: "Failed to create project",
            });
        }
    });

    router.put("/:id", authorize("ADMIN", "PROJECT_MANAGER"), async (req, res) => {
        try {
            const id = Number(req.params.id);
            const authReq = req as AuthRequest;
            const user = authReq.user!;

            const existingProject = await prisma.project.findUnique({ where: { id } });
            if (!existingProject) {
                return res.status(404).json({ message: "Project not found" });
            }

            if (user.role === "PROJECT_MANAGER" && existingProject.createdById !== user.id) {
                return res.status(403).json({ message: "Forbidden" });
            }

            const { name, description, clientId } = req.body;

            if (clientId !== undefined) {
                const client = await prisma.client.findUnique({ where: { id: Number(clientId) } });
                if (!client) {
                    return res.status(400).json({ message: "Invalid clientId: Client does not exist" });
                }
            }

            const project = await prisma.project.update({
                where: { id },
                data: {
                    ...(name !== undefined && { name }),
                    ...(description !== undefined && { description }),
                    ...(clientId !== undefined && {
                        clientId: Number(clientId),
                    }),
                },
                include: {
                    client: true,
                },
            });

            res.json({
                message: "Project updated successfully",
                project,
            });
        } catch (error) {
            console.error("Update project error:", error);
            res.status(500).json({
                message: "Failed to update project",
            });
        }
    });

    router.delete("/:id", authorize("ADMIN", "PROJECT_MANAGER"), async (req, res) => {
        try {
            const id = Number(req.params.id);
            const authReq = req as AuthRequest;
            const user = authReq.user!;

            const existingProject = await prisma.project.findUnique({ where: { id } });
            if (!existingProject) {
                return res.status(404).json({ message: "Project not found" });
            }

            if (user.role === "PROJECT_MANAGER" && existingProject.createdById !== user.id) {
                return res.status(403).json({ message: "Forbidden" });
            }

            await prisma.project.delete({
                where: { id },
            });

            res.json({
                message: "Project deleted successfully",
            });
        } catch (error) {
            console.error("Delete project error:", error);
            res.status(500).json({
                message: "Failed to delete project",
            });
        }
    });

    return router;
}