import express from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import { authJwt } from "../middlewares/authJwt.js";
import { requireRole } from "../middlewares/requireRole.js";
import { alterarMinhaSenha } from "../controllers/colaboradorPassword.controller.js";

export const colaboradorPasswordRouter = express.Router();

colaboradorPasswordRouter.post(
    "/colaborador/minha-senha",
    authJwt,
    requireRole("COLAB"),
    asyncHandler(alterarMinhaSenha)
);
