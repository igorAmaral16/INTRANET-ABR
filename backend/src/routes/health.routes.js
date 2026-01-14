import express from "express";
import { pool } from "../config/db.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const healthRouter = express.Router();

healthRouter.get(
    "/health",
    asyncHandler(async (req, res) => {
        let db = "down";
        try {
            await pool.query("SELECT 1 AS ok");
            db = "ok";
        } catch (err) {
            req.log?.warn({ err }, "DB healthcheck failed");
        }

        res.json({
            status: "ok",
            env: process.env.NODE_ENV,
            db,
            uptimeSeconds: Math.floor(process.uptime()),
            startedAt: req.app.locals.startedAt
        });
    })
);
