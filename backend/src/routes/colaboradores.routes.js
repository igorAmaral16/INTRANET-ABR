import express from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import { authJwt } from "../middlewares/authJwt.js";
import { requireNivel } from "../middlewares/requireNivel.js";
import { listar, obter, criar, atualizar, excluir } from "../controllers/colaboradores.controller.js";

export const colaboradoresRouter = express.Router();

// RH Senior (nível >= 2)
colaboradoresRouter.use(authJwt, requireNivel(2));

colaboradoresRouter.get("/colaboradores", asyncHandler(listar));
colaboradoresRouter.post("/colaboradores", asyncHandler(criar));
colaboradoresRouter.get("/colaboradores/:matricula", asyncHandler(obter));
colaboradoresRouter.put("/colaboradores/:matricula", asyncHandler(atualizar));
colaboradoresRouter.delete("/colaboradores/:matricula", asyncHandler(excluir));
