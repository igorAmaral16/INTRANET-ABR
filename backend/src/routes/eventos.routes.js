import express from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import { authJwt } from "../middlewares/authJwt.js";
import { requireNivel } from "../middlewares/requireNivel.js";
import {
    listarEventosPublicados,
    obterEventoAtual,
    listar,
    obter,
    criar,
    atualizar,
    excluir,
} from "../controllers/eventos.controller.js";

export const eventosRouter = express.Router();

// Público - Listar eventos publicados
eventosRouter.get("/eventos", asyncHandler(listarEventosPublicados));
eventosRouter.get("/eventos/atual", asyncHandler(obterEventoAtual));
eventosRouter.get("/eventos/:id", asyncHandler(obter));

// Admin - Gerenciar eventos
eventosRouter.get("/admin/eventos", asyncHandler(listar));
eventosRouter.post("/admin/eventos", authJwt, requireNivel(1), asyncHandler(criar));
eventosRouter.put("/admin/eventos/:id", authJwt, requireNivel(1), asyncHandler(atualizar));
eventosRouter.delete("/admin/eventos/:id", authJwt, requireNivel(1), asyncHandler(excluir));
