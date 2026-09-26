import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export type UserRole =
    | "ADMIN"
    | "PROJECT_MANAGER"
    | "DEVELOPER";

export type AuthRequest = Request & {
    user?: {
        id: number;
        role: UserRole;
    };
};

const ACCESS_TOKEN_SECRET =
    process.env.JWT_SECRET || "velozity-access-secret";

function verifyAccessToken(token: string) {
    return jwt.verify(token, ACCESS_TOKEN_SECRET) as {
        id: number;
        role: UserRole;
    };
}

export function authenticate(
    req: AuthRequest,
    res: Response,
    next: NextFunction
) {
    try {
        const token = req.cookies?.accessToken;

        if (!token) {
            return res.status(401).json({
                message: "Authentication required",
            });
        }

        const decoded = verifyAccessToken(token);

        req.user = {
            id: decoded.id,
            role: decoded.role,
        };

        next();
    } catch {
        return res.status(401).json({
            message: "Access token is invalid or expired",
        });
    }
}

export function authorize(...allowedRoles: UserRole[]) {
    return (
        req: AuthRequest,
        res: Response,
        next: NextFunction
    ) => {
        if (!req.user) {
            return res.status(401).json({
                message: "Authentication required",
            });
        }

        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({
                message: "You do not have permission to access this resource",
            });
        }

        next();
    };
}