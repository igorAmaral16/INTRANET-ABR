import express from "express";

import { healthRouter } from "./health.routes.js";
import { authRouter } from "./auth.routes.js";

import { comunicadosRouter } from "./comunicados.routes.js";
import { comunicadoReadsRouter } from "./comunicadoReads.routes.js"; // COLAB
import { colaboradoresRouter } from "./colaboradores.routes.js";     // ADMIN
import { uploadsRouter } from "./uploads.routes.js";                 // ADMIN
import { bibliotecaRouter } from "./biblioteca.routes.js";           // PUBLIC+ADMIN
import { faqRouter } from "./faq.routes.js";
import { faleRhRouter } from "./faleRh.routes.js";                    // PUBLIC+ADMIN
import { calendarioRouter } from "./calendario.routes.js";           // PUBLIC+ADMIN
import { relatoriosRouter } from "./relatorios.routes.js";           // ADMIN nivel>=2

export const router = express.Router();

// livres
router.use(healthRouter);
router.use(authRouter);

// público
router.use(comunicadosRouter);
router.use(bibliotecaRouter);
router.use(faqRouter);
router.use(calendarioRouter);

// colaborador
router.use(comunicadoReadsRouter);
router.use(faleRhRouter);

// admin
router.use(colaboradoresRouter);
router.use(uploadsRouter);
router.use(relatoriosRouter);
