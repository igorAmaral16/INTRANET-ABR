import express from "express";
import multer from "multer";

import { asyncHandler } from "../utils/asyncHandler.js";
import { authJwt } from "../middlewares/authJwt.js";
import { requireRole } from "../middlewares/requireRole.js";
import { requireNivel } from "../middlewares/requireNivel.js";

import {
    listarPastasPublico,
    listarDocumentosPublico,
    downloadDocumentoPublico,
    criarPasta,
    adicionarDocumento,
    excluirDocumento,
    listarArvorePublico,
    atualizarPasta,
    excluirPasta
} from "../controllers/biblioteca.controller.js";

export const bibliotecaRouter = express.Router();

// upload temporário (vai ser movido no controller)
const upload = multer({
    dest: "uploads/tmp",
    limits: { fileSize: 15 * 1024 * 1024 } // 15MB (ajuste depois)
});

// Público (sem login)
bibliotecaRouter.get("/biblioteca/pastas", asyncHandler(listarPastasPublico));
bibliotecaRouter.get("/biblioteca/pastas/:pastaId/documentos", asyncHandler(listarDocumentosPublico));
bibliotecaRouter.get("/biblioteca/documentos/:docId/download", asyncHandler(downloadDocumentoPublico));

// Admin (RH Jr/Sr): ADMIN nível >= 1
bibliotecaRouter.post(
    "/admin/biblioteca/pastas",
    authJwt,
    requireRole("ADMIN"),
    requireNivel(1),
    asyncHandler(criarPasta)
);

bibliotecaRouter.post(
    "/admin/biblioteca/pastas/:pastaId/documentos",
    authJwt,
    requireRole("ADMIN"),
    requireNivel(1),
    upload.single("file"),
    asyncHandler(adicionarDocumento)
);

bibliotecaRouter.delete(
    "/admin/biblioteca/documentos/:docId",
    authJwt,
    requireRole("ADMIN"),
    requireNivel(1),
    asyncHandler(excluirDocumento)
);

bibliotecaRouter.put(
    "/admin/biblioteca/pastas/:pastaId",
    authJwt,
    requireRole("ADMIN"),
    requireNivel(1),
    asyncHandler(atualizarPasta)
);

bibliotecaRouter.delete(
    "/admin/biblioteca/pastas/:pastaId",
    authJwt,
    requireRole("ADMIN"),
    requireNivel(1),
    asyncHandler(excluirPasta)
);

bibliotecaRouter.get("/biblioteca/arvore", asyncHandler(listarArvorePublico));