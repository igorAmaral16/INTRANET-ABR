import express from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import { authJwt } from "../middlewares/authJwt.js";
import { requireRole } from "../middlewares/requireRole.js";
import { requireNivel } from "../middlewares/requireNivel.js";

import {
    listarPublico,
    listarAdmin,
    obterAdmin,
    criar,
    atualizar,
    excluir
} from "../controllers/faq.controller.js";

export const faqRouter = express.Router();

// Público (sem login)
faqRouter.get("/faq", asyncHandler(listarPublico));

// Admin (RH Jr/Sr): ADMIN nível >= 1
faqRouter.get("/admin/faq", authJwt, requireRole("ADMIN"), requireNivel(1), asyncHandler(listarAdmin));
faqRouter.get("/admin/faq/:id", authJwt, requireRole("ADMIN"), requireNivel(1), asyncHandler(obterAdmin));
faqRouter.post("/admin/faq", authJwt, requireRole("ADMIN"), requireNivel(1), asyncHandler(criar));
faqRouter.put("/admin/faq/:id", authJwt, requireRole("ADMIN"), requireNivel(1), asyncHandler(atualizar));
faqRouter.delete("/admin/faq/:id", authJwt, requireRole("ADMIN"), requireNivel(1), asyncHandler(excluir));
