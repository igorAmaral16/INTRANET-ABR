import mysql from "mysql2/promise";
import { env } from "./env.js";
import { logger } from "../utils/logger.js";

export const pool = mysql.createPool({
    host: env.DB_HOST,
    port: env.DB_PORT,
    user: env.DB_USER,
    password: env.DB_PASSWORD,
    database: env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0,
    namedPlaceholders: true,
    connectTimeout: 10_000
});

export async function testConnection() {
    const conn = await pool.getConnection();
    try {
        await conn.ping();
        logger.info({ dbHost: env.DB_HOST, dbName: env.DB_NAME }, "DB connection OK");
    } finally {
        conn.release();
    }
}
