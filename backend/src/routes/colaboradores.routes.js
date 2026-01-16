import express from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import { authJwt } from "../middlewares/authJwt.js";
import { requireRole } from "../middlewares/requireRole.js";
import { requireNivel } from "../middlewares/requireNivel.js";
import { listar, obter, criar, atualizar, excluir } from "../controllers/colaboradores.controller.js";

export const colaboradoresRouter = express.Router();

// IMPORTANTE:
// Antes estava: colaboradoresRouter.use(authJwt, requireRole("ADMIN"), requireNivel(2));
// Isso intercepta QUALQUER rota do sistema porque o router está montado em "/".
//
// Correção definitiva: aplica o gate SOMENTE no prefixo admin
colaboradoresRouter.use("/admin/colaboradores", authJwt, requireRole("ADMIN"), requireNivel(2));

colaboradoresRouter.get("/admin/colaboradores", asyncHandler(listar));
colaboradoresRouter.post("/admin/colaboradores", asyncHandler(criar));
colaboradoresRouter.get("/admin/colaboradores/:matricula", asyncHandler(obter));
colaboradoresRouter.put("/admin/colaboradores/:matricula", asyncHandler(atualizar));
colaboradoresRouter.delete("/admin/colaboradores/:matricula", asyncHandler(excluir));
