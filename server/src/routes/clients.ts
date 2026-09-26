import { Router } from "express";
import type { PrismaClient } from "../generated/prisma/client.js";
import { authorize } from "../middleware/auth.js";

export default function clientRoutes(prisma: PrismaClient) {
    const router = Router();

    router.get("/", authorize("ADMIN", "PROJECT_MANAGER"), async (_req, res) => {
        try {
            const clients = await prisma.client.findMany({
                orderBy: {
                    createdAt: "desc",
                },
            });

            res.json(clients);
        } catch (error) {
            console.error("Get clients error:", error);
            res.status(500).json({
                message: "Failed to fetch clients",
            });
        }
    });

    router.get("/:id", authorize("ADMIN", "PROJECT_MANAGER"), async (req, res) => {
        try {
            const id = Number(req.params.id);

            const client = await prisma.client.findUnique({
                where: { id },
                include: {
                    projects: true,
                },
            });

            if (!client) {
                return res.status(404).json({
                    message: "Client not found",
                });
            }

            res.json(client);
        } catch (error) {
            console.error("Get client error:", error);
            res.status(500).json({
                message: "Failed to fetch client",
            });
        }
    });

    router.post("/", authorize("ADMIN"), async (req, res) => {
        try {
            const { name, email } = req.body;

            if (!name || !email) {
                return res.status(400).json({
                    message: "Name and email are required",
                });
            }

            const client = await prisma.client.create({
                data: {
                    name,
                    email,
                },
            });

            res.status(201).json({
                message: "Client created successfully",
                client,
            });
        } catch (error) {
            console.error("Create client error:", error);
            res.status(500).json({
                message: "Failed to create client",
            });
        }
    });

    router.put("/:id", authorize("ADMIN"), async (req, res) => {
        try {
            const id = Number(req.params.id);
            const { name, email } = req.body;

            const client = await prisma.client.update({
                where: { id },
                data: {
                    ...(name !== undefined && { name }),
                    ...(email !== undefined && { email }),
                },
            });

            res.json({
                message: "Client updated successfully",
                client,
            });
        } catch (error) {
            console.error("Update client error:", error);
            res.status(500).json({
                message: "Failed to update client",
            });
        }
    });

    router.delete("/:id", authorize("ADMIN"), async (req, res) => {
        try {
            const id = Number(req.params.id);

            await prisma.client.delete({
                where: { id },
            });

            res.json({
                message: "Client deleted successfully",
            });
        } catch (error) {
            console.error("Delete client error:", error);
            res.status(500).json({
                message: "Failed to delete client",
            });
        }
    });

    return router;
}