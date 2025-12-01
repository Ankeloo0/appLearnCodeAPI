import { Request, Response, NextFunction } from "express";

export const authAdmin = (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
        return res.status(401).json({ message: "No autenticado" });
    }

    if (req.user.role !== "admin") {
        return res.status(403).json({ message: "Acceso denegado: se requiere rol de administrador" });
    }

    next();
};
