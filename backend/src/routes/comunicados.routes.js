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
    excluir
} from "../controllers/comunicados.controller.js";

export const comunicadosRouter = express.Router();

/* Público (sem login) */
comunicadosRouter.get("/comunicados", asyncHandler(listarPublico));
comunicadosRouter.get("/comunicados/:id", asyncHandler(obterPublico));

/* Admin (RH Jr/Sr): ADMIN nível >= 1 */
comunicadosRouter.get(
    "/admin/comunicados",
    authJwt,
    requireRole("ADMIN"),
    requireNivel(1),
    asyncHandler(listarAdmin)
);

comunicadosRouter.get(
    "/admin/comunicados/:id",
    authJwt,
    requireRole("ADMIN"),
    requireNivel(1),
    asyncHandler(obterAdmin)
);

comunicadosRouter.post(
    "/admin/comunicados",
    authJwt,
    requireRole("ADMIN"),
    requireNivel(1),
    asyncHandler(criar)
);

comunicadosRouter.put(
    "/admin/comunicados/:id",
    authJwt,
    requireRole("ADMIN"),
    requireNivel(1),
    asyncHandler(atualizar)
);

comunicadosRouter.delete(
    "/admin/comunicados/:id",
    authJwt,
    requireRole("ADMIN"),
    requireNivel(1),
    asyncHandler(excluir)
);
