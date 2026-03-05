import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { randomUUID } from "crypto";
import { fileURLToPath } from "url";

import { asyncHandler } from "../utils/asyncHandler.js";
import { authJwt } from "../middlewares/authJwt.js";
import { requireRole } from "../middlewares/requireRole.js";
import { requireNivel } from "../middlewares/requireNivel.js";

import {
    listarPublico,
    obterPublico,
    listarAdmin,
    criarAdmin,
    excluirAdmin,
    atualizarAdmin
} from "../controllers/tutorials.controller.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// storage that places videos into uploads/tutorials/<setor>
const videoStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        const setor = String(req.body.setor || "").trim();
        const destDir = path.join(__dirname, "..", "..", "uploads", "tutorials", setor);
        fs.mkdirSync(destDir, { recursive: true });
        cb(null, destDir);
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname || "").toLowerCase();
        const safeExt = ext && ext.length <= 10 ? ext : "";
        cb(null, `${randomUUID()}${safeExt}`);
    }
});

const ALLOWED_VIDEO = new Set(["video/mp4", "video/webm", "video/ogg"]);
const MAX_VIDEO_BYTES = 200 * 1024 * 1024; // 200 MB

const uploadVideo = multer({
    storage: videoStorage,
    limits: { fileSize: MAX_VIDEO_BYTES },
    fileFilter: (req, file, cb) => {
        if (!ALLOWED_VIDEO.has(file.mimetype)) {
            return cb(new Error("Tipo de arquivo não permitido."));
        }
        cb(null, true);
    }
});

export const tutorialsRouter = express.Router();

// Public endpoints
tutorialsRouter.get("/tutorials", asyncHandler(listarPublico));
tutorialsRouter.get("/tutorials/:id", asyncHandler(obterPublico));

// Admin endpoints (RH Jr ou Sr): nível >= 1

tutorialsRouter.post(
    "/admin/tutorials",
    authJwt,
    requireRole("ADMIN"),
    requireNivel(1),
    uploadVideo.single("file"),
    asyncHandler(criarAdmin)
);

tutorialsRouter.put(
    "/admin/tutorials/:id",
    authJwt,
    requireRole("ADMIN"),
    requireNivel(1),
    uploadVideo.single("file"),
    asyncHandler(atualizarAdmin)
);

tutorialsRouter.delete(
    "/admin/tutorials/:id",
    authJwt,
    requireRole("ADMIN"),
    requireNivel(1),
    asyncHandler(excluirAdmin)
);

// for listing from admin interface we can reuse listAdmin

tutorialsRouter.get(
    "/admin/tutorials",
    authJwt,
    requireRole("ADMIN"),
    requireNivel(1),
    asyncHandler(listarAdmin)
);
