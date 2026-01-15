import express from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import { authJwt } from "../middlewares/authJwt.js";
import { requireRole } from "../middlewares/requireRole.js";
import { confirmarLeitura } from "../controllers/comunicadoReads.controller.js";

export const comunicadoReadsRouter = express.Router();

// Painel colaborador: exige token COLAB
comunicadoReadsRouter.post(
    "/colaborador/comunicados/:id/confirmar-leitura",
    authJwt,
    requireRole("COLAB"),
    asyncHandler(confirmarLeitura)
);
