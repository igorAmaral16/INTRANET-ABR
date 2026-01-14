import express from "express";
import rateLimit from "express-rate-limit";
import { login, me } from "../controllers/auth.controller.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { authJwt } from "../middlewares/authJwt.js";

export const authRouter = express.Router();

const loginLimiter = rateLimit({
    windowMs: 60 * 1000,
    limit: 20,
    standardHeaders: "draft-7",
    legacyHeaders: false
});

authRouter.post("/auth/login", loginLimiter, asyncHandler(login));
authRouter.get("/auth/me", authJwt, asyncHandler(me));
