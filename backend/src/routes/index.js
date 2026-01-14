import express from "express";
import { healthRouter } from "./health.routes.js";
import { authRouter } from "./auth.routes.js";
import { colaboradoresRouter } from "./colaboradores.routes.js";

export const router = express.Router();

router.use(healthRouter);
router.use(authRouter);
router.use(colaboradoresRouter);
