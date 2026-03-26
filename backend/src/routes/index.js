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
import { eventosRouter } from "./eventos.routes.js";                 // PUBLIC+ADMIN eventos
import { relatoriosRouter } from "./relatorios.routes.js";           // ADMIN nivel>=2
import { tutorialsRouter } from "./tutorials.routes.js";           // PÚBLICO + ADMIN exemplos
import { carouselRouter } from "./carousel.routes.js";           // PÚBLICO + ADMIN slides/carrossel

export const router = express.Router();

// livres
router.use(healthRouter);
router.use(authRouter);

// público
router.use(comunicadosRouter);
router.use(bibliotecaRouter);
router.use(faqRouter);
router.use(calendarioRouter);
router.use(eventosRouter);

// colaborador
router.use(comunicadoReadsRouter);
router.use(faleRhRouter);

// admin
router.use(colaboradoresRouter);
router.use(uploadsRouter);
router.use(relatoriosRouter);

// tutorials (public + admin)
router.use(tutorialsRouter);

// carousel/slides (public + admin)
router.use(carouselRouter);
