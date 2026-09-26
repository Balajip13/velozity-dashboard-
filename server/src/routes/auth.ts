import { Router } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import type { PrismaClient } from "../generated/prisma/client.js";

const ACCESS_TOKEN_SECRET =
    process.env.JWT_SECRET || "velozity-access-secret";

const REFRESH_TOKEN_SECRET =
    process.env.REFRESH_TOKEN_SECRET ||
    "velozity-refresh-secret";

const ACCESS_TOKEN_EXPIRES_IN = "15m";
const REFRESH_TOKEN_EXPIRES_IN = "7d";

export default function authRoutes(prisma: PrismaClient) {
    const router = Router();


    router.post("/register", async (req, res) => {
        try {
            const { name, email, password } = req.body;

            if (!name || !email || !password) {
                return res.status(400).json({
                    message: "Name, email and password are required",
                });
            }

            const existingUser = await prisma.user.findUnique({
                where: { email },
            });

            if (existingUser) {
                return res.status(409).json({
                    message: "User already exists",
                });
            }

            const hashedPassword = await bcrypt.hash(password, 10);

            const user = await prisma.user.create({
                data: {
                    name,
                    email,
                    password: hashedPassword,
                    role: "DEVELOPER",
                },
            });

            return res.status(201).json({
                message: "User registered successfully",
                user: {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    role: user.role,
                },
            });
        } catch (error) {
            console.error("REGISTRATION ERROR:", error);

            return res.status(500).json({
                message: "Registration failed",
                error: error instanceof Error ? error.message : String(error),
            });
        }
    });


    router.post("/login", async (req, res) => {
        try {
            const { email, password } = req.body;

            if (!email || !password) {
                return res.status(400).json({
                    message: "Email and password are required",
                });
            }

            const user = await prisma.user.findUnique({
                where: {
                    email,
                },
            });

            if (!user) {
                return res.status(401).json({
                    message: "Invalid email or password",
                });
            }

            const validPassword = await bcrypt.compare(
                password,
                user.password
            );

            if (!validPassword) {
                return res.status(401).json({
                    message: "Invalid email or password",
                });
            }


            const accessToken = jwt.sign(
                {
                    id: user.id,
                    role: user.role,
                },
                ACCESS_TOKEN_SECRET,
                {
                    expiresIn: ACCESS_TOKEN_EXPIRES_IN,
                }
            );


            const refreshToken = jwt.sign(
                {
                    id: user.id,
                    role: user.role,
                },
                REFRESH_TOKEN_SECRET,
                {
                    expiresIn: REFRESH_TOKEN_EXPIRES_IN,
                }
            );

            res.cookie("accessToken", accessToken, {
                httpOnly: true,
                secure: false,
                sameSite: "lax",
                maxAge: 15 * 60 * 1000,
            });

            res.cookie("refreshToken", refreshToken, {
                httpOnly: true,
                secure: false,
                sameSite: "lax",
                maxAge: 7 * 24 * 60 * 60 * 1000,
            });

            return res.json({
                message: "Login successful",
                user: {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    role: user.role,
                },
            });
        } catch (error) {
            console.error("LOGIN ERROR:", error);

            return res.status(500).json({
                message: "Login failed",
                error: error instanceof Error ? error.message : String(error),
            });
        }
    });


    router.post("/refresh", async (req, res) => {
        try {
            const refreshToken = req.cookies?.refreshToken;

            if (!refreshToken) {
                return res.status(401).json({
                    message: "Refresh token required",
                });
            }

            const decoded = jwt.verify(
                refreshToken,
                REFRESH_TOKEN_SECRET
            ) as {
                id: number;
                role:
                | "ADMIN"
                | "PROJECT_MANAGER"
                | "DEVELOPER";
            };

            const user = await prisma.user.findUnique({
                where: {
                    id: decoded.id,
                },
            });

            if (!user) {
                return res.status(401).json({
                    message: "User no longer exists",
                });
            }

            const newAccessToken = jwt.sign(
                {
                    id: user.id,
                    role: user.role,
                },
                ACCESS_TOKEN_SECRET,
                {
                    expiresIn: ACCESS_TOKEN_EXPIRES_IN,
                }
            );

            res.cookie("accessToken", newAccessToken, {
                httpOnly: true,
                secure: false,
                sameSite: "lax",
                maxAge: 15 * 60 * 1000,
            });

            return res.json({
                message: "Access token refreshed",
            });
        } catch (error) {
            console.error("REFRESH TOKEN ERROR:", error);

            return res.status(401).json({
                message: "Invalid or expired refresh token",
                error: error instanceof Error ? error.message : String(error),
            });
        }
    });


    router.get("/me", async (req, res) => {
        try {
            const accessToken = req.cookies?.accessToken;

            if (!accessToken) {
                return res.status(401).json({
                    message: "Authentication required",
                });
            }

            const decoded = jwt.verify(
                accessToken,
                ACCESS_TOKEN_SECRET
            ) as {
                id: number;
                role:
                | "ADMIN"
                | "PROJECT_MANAGER"
                | "DEVELOPER";
            };

            const user = await prisma.user.findUnique({
                where: {
                    id: decoded.id,
                },
                select: {
                    id: true,
                    name: true,
                    email: true,
                    role: true,
                },
            });

            if (!user) {
                return res.status(401).json({
                    message: "User not found",
                });
            }

            return res.json(user);
        } catch (error) {
            console.error("ME ERROR:", error);

            return res.status(401).json({
                message: "Invalid or expired access token",
            });
        }
    });


    router.post("/logout", (_req, res) => {
        res.clearCookie("accessToken", {
            httpOnly: true,
            secure: false,
            sameSite: "lax",
        });

        res.clearCookie("refreshToken", {
            httpOnly: true,
            secure: false,
            sameSite: "lax",
        });

        return res.json({
            message: "Logout successful",
        });
    });

    return router;
}