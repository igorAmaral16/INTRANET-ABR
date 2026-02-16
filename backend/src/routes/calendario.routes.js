import express from "express";
import {
    obterConfiguracao,
    criarConfiguracao,
    atualizarConfiguracao,
    listarFeriadosPorAno,
    listarFeriadosPorRange,
    obterFeriado,
    criarFeriado,
    atualizarFeriado,
    excluirFeriado
} from "../controllers/calendario.controller.js";
import { authJwt } from "../middlewares/authJwt.js";
import { requireNivel } from "../middlewares/requireNivel.js";

export const calendarioRouter = express.Router();

// Público - Obter Configuração e Feriados
calendarioRouter.get("/calendario/configuracao", obterConfiguracao);
calendarioRouter.get("/calendario/feriados", listarFeriadosPorAno);
calendarioRouter.get("/calendario/feriados-range", listarFeriadosPorRange);

// Admin - Gerenciar Configuração
calendarioRouter.post(
    "/admin/calendario/configuracao",
    authJwt,
    requireNivel(1),
    criarConfiguracao
);

calendarioRouter.patch(
    "/admin/calendario/configuracao/:id",
    authJwt,
    requireNivel(1),
    atualizarConfiguracao
);

// Admin - Gerenciar Feriados
calendarioRouter.get(
    "/admin/calendario/feriados/:id",
    authJwt,
    requireNivel(1),
    obterFeriado
);

calendarioRouter.post(
    "/admin/calendario/feriados",
    authJwt,
    requireNivel(1),
    criarFeriado
);

calendarioRouter.patch(
    "/admin/calendario/feriados/:id",
    authJwt,
    requireNivel(1),
    atualizarFeriado
);

calendarioRouter.delete(
    "/admin/calendario/feriados/:id",
    authJwt,
    requireNivel(1),
    excluirFeriado
);
