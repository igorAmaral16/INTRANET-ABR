import mysql from "mysql2/promise";
import { env } from "./env.js";
import { logger, logStartup, logError } from "../utils/logger.js";

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
    const timestamp = new Date().toLocaleTimeString("pt-BR", { 
        hour12: false,
        hour: "2-digit", 
        minute: "2-digit", 
        second: "2-digit" 
    });

    logStartup("Testando conexao com banco de dados MySQL", {
        host: env.DB_HOST,
        port: env.DB_PORT,
        database: env.DB_NAME,
        user: env.DB_USER
    });

    try {
        const conn = await pool.getConnection();
        try {
            await conn.ping();
            logStartup("Conexao MySQL verificada com sucesso", {
                host: env.DB_HOST,
                database: env.DB_NAME,
                connectionLimit: 10
            });
            logger.info({ 
                dbHost: env.DB_HOST, 
                dbName: env.DB_NAME, 
                dbPort: env.DB_PORT,
                timestamp
            }, `[${timestamp}] DATABASE: Conexao com ${env.DB_NAME}@${env.DB_HOST}:${env.DB_PORT} estabelecida`);
        } finally {
            conn.release();
        }
    } catch (err) {
        logError("Falha ao conectar ao banco de dados MySQL", err, {
            host: env.DB_HOST,
            port: env.DB_PORT,
            database: env.DB_NAME,
            user: env.DB_USER,
            severity: "CRITICAL"
        });
        throw err;
    }
}
