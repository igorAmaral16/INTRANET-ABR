import express from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import { authJwt } from "../middlewares/authJwt.js";
import { requireRole } from "../middlewares/requireRole.js";
import { requireNivel } from "../middlewares/requireNivel.js";

import {
    colabCriarConversa,
    colabListarConversas,
    colabObterConversa,
    colabEnviarMensagem,
    colabFecharConversa,
    colabMarcarComoLida,

    adminListarConversas,
    adminObterConversa,
    adminAceitarConversa,
    adminEnviarMensagem,
    adminFecharConversa,
    adminMarcarComoLida
} from "../controllers/faleRh.controller.js";

export const faleRhRouter = express.Router();

/* =========================
   COLAB (autenticado)
========================= */
faleRhRouter.post(
    "/colaborador/fale-rh/conversas",
    authJwt,
    requireRole("COLAB"),
    asyncHandler(colabCriarConversa)
);

faleRhRouter.get(
    "/colaborador/fale-rh/conversas",
    authJwt,
    requireRole("COLAB"),
    asyncHandler(colabListarConversas)
);

faleRhRouter.get(
    "/colaborador/fale-rh/conversas/:id",
    authJwt,
    requireRole("COLAB"),
    asyncHandler(colabObterConversa)
);

faleRhRouter.post(
    "/colaborador/fale-rh/conversas/:id/mensagens",
    authJwt,
    requireRole("COLAB"),
    asyncHandler(colabEnviarMensagem)
);

faleRhRouter.post(
    "/colaborador/fale-rh/conversas/:id/fechar",
    authJwt,
    requireRole("COLAB"),
    asyncHandler(colabFecharConversa)
);

faleRhRouter.post(
    "/colaborador/fale-rh/conversas/:id/lida",
    authJwt,
    requireRole("COLAB"),
    asyncHandler(colabMarcarComoLida)
);

/* =========================
   ADMIN (RH Jr/Sr): nível >= 1
========================= */
faleRhRouter.get(
    "/admin/fale-rh/conversas",
    authJwt,
    requireRole("ADMIN"),
    requireNivel(1),
    asyncHandler(adminListarConversas)
);

faleRhRouter.get(
    "/admin/fale-rh/conversas/:id",
    authJwt,
    requireRole("ADMIN"),
    requireNivel(1),
    asyncHandler(adminObterConversa)
);

faleRhRouter.post(
    "/admin/fale-rh/conversas/:id/aceitar",
    authJwt,
    requireRole("ADMIN"),
    requireNivel(1),
    asyncHandler(adminAceitarConversa)
);

faleRhRouter.post(
    "/admin/fale-rh/conversas/:id/mensagens",
    authJwt,
    requireRole("ADMIN"),
    requireNivel(1),
    asyncHandler(adminEnviarMensagem)
);

faleRhRouter.post(
    "/admin/fale-rh/conversas/:id/fechar",
    authJwt,
    requireRole("ADMIN"),
    requireNivel(1),
    asyncHandler(adminFecharConversa)
);

faleRhRouter.post(
    "/admin/fale-rh/conversas/:id/lida",
    authJwt,
    requireRole("ADMIN"),
    requireNivel(1),
    asyncHandler(adminMarcarComoLida)
);
