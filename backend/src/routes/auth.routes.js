import express from "express";
import rateLimit from "express-rate-limit";
import { asyncHandler } from "../utils/asyncHandler.js";
import { authJwt } from "../middlewares/authJwt.js";
import { requireRole } from "../middlewares/requireRole.js";
import { loginAdmin, loginColaborador, me, perfilColaborador } from "../controllers/auth.controller.js";

export const authRouter = express.Router();

const loginLimiter = rateLimit({
    windowMs: 60 * 1000,
    limit: 20,
    standardHeaders: "draft-7",
    legacyHeaders: false
});

authRouter.post("/auth/admin/login", loginLimiter, asyncHandler(loginAdmin));
authRouter.post("/auth/colaborador/login", loginLimiter, asyncHandler(loginColaborador));
authRouter.get("/auth/me", authJwt, asyncHandler(me));
authRouter.get(
    "/colaborador/perfil",
    authJwt,
    requireRole("COLAB"),
    asyncHandler(perfilColaborador)
);