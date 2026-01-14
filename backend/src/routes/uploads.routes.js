import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { randomUUID } from "crypto";
import { fileURLToPath } from "url";

import { authJwt } from "../middlewares/authJwt.js";
import { requireRole } from "../middlewares/requireRole.js";
import { requireNivel } from "../middlewares/requireNivel.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// uploads/announcements
const uploadDir = path.join(__dirname, "..", "..", "uploads", "announcements");
fs.mkdirSync(uploadDir, { recursive: true });

const MAX_BYTES = 5 * 1024 * 1024; // 5MB (ajuste depois se precisar)

const ALLOWED = new Set([
    "image/png",
    "image/jpeg",
    "image/webp",
    "application/pdf"
]);

function inferType(mime) {
    if (mime.startsWith("image/")) return "IMAGEM";
    if (mime === "application/pdf") return "DOCUMENTO";
    return "NENHUM";
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname || "").toLowerCase();
        const safeExt = ext && ext.length <= 10 ? ext : "";
        cb(null, `${randomUUID()}${safeExt}`);
    }
});

const upload = multer({
    storage,
    limits: { fileSize: MAX_BYTES },
    fileFilter: (req, file, cb) => {
        if (!ALLOWED.has(file.mimetype)) {
            return cb(new Error("Tipo de arquivo não permitido."));
        }
        cb(null, true);
    }
});

export const uploadsRouter = express.Router();

// ADMIN (RH Jr ou Sr): nível >= 1
uploadsRouter.post(
    "/admin/uploads",
    authJwt,
    requireRole("ADMIN"),
    requireNivel(1),
    upload.single("file"),
    asyncHandler(async (req, res) => {
        if (!req.file) {
            return res.status(400).json({
                error: { message: "Arquivo é obrigatório (field: file).", requestId: req.id }
            });
        }

        const type = inferType(req.file.mimetype);
        const url = `/uploads/announcements/${req.file.filename}`;

        res.status(201).json({
            url,
            type,
            size: req.file.size,
            mime: req.file.mimetype
        });
    })
);
