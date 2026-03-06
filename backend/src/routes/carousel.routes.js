import express from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import { authJwt } from "../middlewares/authJwt.js";
import { requireRole } from "../middlewares/requireRole.js";
import { requireNivel } from "../middlewares/requireNivel.js";

import {
    listarPublico,
    obterPublico,
    listarAdmin,
    obterAdmin,
    criar,
    atualizar,
    excluir,
} from "../controllers/carousel.controller.js";

export const carouselRouter = express.Router();

// Público
carouselRouter.get("/carousel", asyncHandler(listarPublico));
carouselRouter.get("/carousel/:id", asyncHandler(obterPublico));

// Admin (RH nível>=1)
carouselRouter.get(
    "/admin/carousel",
    authJwt,
    requireRole("ADMIN"),
    requireNivel(1),
    asyncHandler(listarAdmin)
);
carouselRouter.get(
    "/admin/carousel/:id",
    authJwt,
    requireRole("ADMIN"),
    requireNivel(1),
    asyncHandler(obterAdmin)
);
carouselRouter.post(
    "/admin/carousel",
    authJwt,
    requireRole("ADMIN"),
    requireNivel(1),
    asyncHandler(criar)
);
carouselRouter.put(
    "/admin/carousel/:id",
    authJwt,
    requireRole("ADMIN"),
    requireNivel(1),
    asyncHandler(atualizar)
);
carouselRouter.delete(
    "/admin/carousel/:id",
    authJwt,
    requireRole("ADMIN"),
    requireNivel(1),
    asyncHandler(excluir)
);
