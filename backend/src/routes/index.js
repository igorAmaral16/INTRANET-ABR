import express from "express";
import { healthRouter } from "./health.routes.js";
import { authRouter } from "./auth.routes.js";
import { colaboradoresRouter } from "./colaboradores.routes.js";
import { comunicadosRouter } from "./comunicados.routes.js";
import { uploadsRouter } from "./uploads.routes.js";
import { bibliotecaRouter } from "./biblioteca.routes.js";

export const router = express.Router();

router.use(healthRouter);
router.use(authRouter);
router.use(colaboradoresRouter);
router.use(comunicadosRouter);
router.use(uploadsRouter);
router.use(bibliotecaRouter);
