import express from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import { authJwt } from "../middlewares/authJwt.js";
import { requireRole } from "../middlewares/requireRole.js";
import { requireNivel } from "../middlewares/requireNivel.js";
import { gerarRelatorioPdf } from "../controllers/relatorios.controller.js";

export const relatoriosRouter = express.Router();

relatoriosRouter.post(
    "/admin/relatorios",
    authJwt,
    requireRole("ADMIN"),
    requireNivel(2),
    asyncHandler(gerarRelatorioPdf)
);
