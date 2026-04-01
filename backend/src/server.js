import http from "http";
import https from "https";
import fs from "fs";
import path from "path";
import { buildApp } from "./app.js";
import { env } from "./config/env.js";
import { logger, logStartup, logError, logWarning } from "./utils/logger.js";
import { pool, testConnection } from "./config/db.js";
import { initSocket } from "./realtime/socket.js";

async function start() {
    const app = buildApp();

    // Verifica conexao com banco de dados
    logStartup("Testando conexao com banco de dados...");
    try {
        await testConnection();
        logStartup("Conexao com banco de dados estabelecida com sucesso");
    } catch (err) {
        logError("Falha ao conectar ao banco de dados", err, { critical: true });
        throw err;
    }

    const server = http.createServer(app);

    // tenta criar servidor https quando ambas chaves forem fornecidas
    let httpsServer;
    if (env.SSL_KEY_PATH && env.SSL_CERT_PATH) {
        const resolveFile = (p) => {
            if (path.isAbsolute(p)) return p;
            return path.resolve(process.cwd(), p);
        };

        try {
            const keyPath = resolveFile(env.SSL_KEY_PATH);
            const certPath = resolveFile(env.SSL_CERT_PATH);
            const key = fs.readFileSync(keyPath);
            const cert = fs.readFileSync(certPath);
            httpsServer = https.createServer({ key, cert }, app);
            logStartup("Certificados HTTPS carregados com sucesso", {
                keyPath,
                certPath
            });
        } catch (err) {
            logError("Falha ao carregar certificados HTTPS", err, {
                keyPath: env.SSL_KEY_PATH,
                certPath: env.SSL_CERT_PATH,
                critical: false
            });
            logWarning("Continuando sem HTTPS");
        }
    }

    // registra sockets em todos os servidores disponíveis
    logStartup("Inicializando websockets...");
    initSocket(server);
    if (httpsServer) initSocket(httpsServer);
    logStartup("Websockets inicializados");

    const HOST = env.HOST || "0.0.0.0";
    const PORT = Number(env.PORT) || 5053;
    // evita conflito: se não informado, usa porta seguinte
    const HTTPS_PORT = env.HTTPS_PORT != null ? Number(env.HTTPS_PORT) : PORT + 1;

    // Inicia servidor HTTP
    server.listen(PORT, HOST, () => {
        const timestamp = new Date().toLocaleTimeString("pt-BR", {
            hour12: false,
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit"
        });
        const url = `http://${HOST === "0.0.0.0" ? "localhost" : HOST}:${PORT}`;
        console.log(`
╔════════════════════════════════════════════════════════════════╗
║                     SERVIDOR INICIADO                          ║
╠════════════════════════════════════════════════════════════════╣
║ Protocolo: HTTP                                                ║
║ Host: ${HOST.padEnd(50)}║
║ Porta: ${String(PORT).padEnd(55)}║
║ URL: ${url.padEnd(56)}║
║ Ambiente: ${env.NODE_ENV.padEnd(49)}║
║ Timestamp: ${timestamp.padEnd(53)}║
╚════════════════════════════════════════════════════════════════╝
        `);
        logger.info({
            protocol: "HTTP",
            host: HOST,
            port: PORT,
            nodeEnv: env.NODE_ENV,
            url
        }, `API HTTP listening on ${url}`);
    });

    server.on("error", (err) => {
        logError("Erro no servidor HTTP", err, {
            port: PORT,
            host: HOST,
            severity: "CRITICAL"
        });
    });

    // Inicia servidor HTTPS se configurado
    if (httpsServer) {
        httpsServer.listen(HTTPS_PORT, HOST, () => {
            const timestamp = new Date().toLocaleTimeString("pt-BR", {
                hour12: false,
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit"
            });
            const url = `https://${HOST === "0.0.0.0" ? "localhost" : HOST}:${HTTPS_PORT}`;
            console.log(`
╔════════════════════════════════════════════════════════════════╗
║                 SERVIDOR HTTPS INICIADO                        ║
╠════════════════════════════════════════════════════════════════╣
║ Protocolo: HTTPS                                               ║
║ Host: ${HOST.padEnd(50)}║
║ Porta: ${String(HTTPS_PORT).padEnd(55)}║
║ URL: ${url.padEnd(56)}║
║ Ambiente: ${env.NODE_ENV.padEnd(49)}║
║ Timestamp: ${timestamp.padEnd(53)}║
╚════════════════════════════════════════════════════════════════╝
        `);
            logger.info({
                protocol: "HTTPS",
                host: HOST,
                port: HTTPS_PORT,
                nodeEnv: env.NODE_ENV,
                url
            }, `API HTTPS listening on ${url}`);
        });

        httpsServer.on("error", (err) => {
            logError("Erro no servidor HTTPS", err, {
                port: HTTPS_PORT,
                host: HOST,
                severity: "CRITICAL"
            });
        });
    }

    async function shutdown(signal) {
        const timestamp = new Date().toLocaleTimeString("pt-BR", {
            hour12: false,
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit"
        });
        console.log(`
╔════════════════════════════════════════════════════════════════╗
║                    ENCERRANDO SERVIDOR                         ║
╠════════════════════════════════════════════════════════════════╣
║ Sinal: ${signal.padEnd(58)}║
║ Timestamp: ${timestamp.padEnd(53)}║
║ Status: Finalizando conexoes...                                ║
╚════════════════════════════════════════════════════════════════╝
        `);
        logger.warn({ signal, timestamp }, `Servidor encerrando gracosamente (sinal: ${signal})`);

        const closePromises = [];
        closePromises.push(new Promise((r) => server.close(r)));
        if (httpsServer) closePromises.push(new Promise((r) => httpsServer.close(r)));

        Promise.all(closePromises)
            .then(async () => {
                try {
                    logStartup("Fechando pool de conexoes do banco de dados...");
                    await pool.end();
                    logStartup("Pool de conexoes fechado com sucesso");
                    console.log(`
╔════════════════════════════════════════════════════════════════╗
║              SERVIDOR ENCERRADO COM SUCESSO                    ║
╠════════════════════════════════════════════════════════════════╣
║ Timestamp: ${new Date().toLocaleTimeString("pt-BR", {
                        hour12: false,
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit"
                    }).padEnd(51)}║
║ Status: Todos os servicos finalizados                          ║
╚════════════════════════════════════════════════════════════════╝
                    `);
                } catch (err) {
                    logError("Erro ao fechar pool de conexoes", err);
                } finally {
                    process.exit(0);
                }
            })
            .catch((err) => {
                logError("Erro durante encerramento do servidor", err, {
                    severity: "CRITICAL"
                });
                process.exit(1);
            });

        setTimeout(() => {
            console.error(`
╔════════════════════════════════════════════════════════════════╗
║          ENCERRAMENTO FORCADO APOS TIMEOUT                     ║
╠════════════════════════════════════════════════════════════════╣
║ Timeout: 10 segundos                                           ║
║ Timestamp: ${new Date().toLocaleTimeString("pt-BR", {
                hour12: false,
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit"
            }).padEnd(48)}║
╚════════════════════════════════════════════════════════════════╝
            `);
            logger.fatal("Encerramento forcado apos timeout de 10 segundos");
            process.exit(1);
        }, 10_000).unref();
    }

    process.on("SIGINT", () => shutdown("SIGINT"));
    process.on("SIGTERM", () => shutdown("SIGTERM"));

    process.on("unhandledRejection", (reason) => {
        logError("Rejeicao nao tratada (Promise rejection)", reason, {
            type: "unhandledRejection",
            severity: "HIGH"
        });
    });

    process.on("uncaughtException", (err) => {
        logError("Excecao nao capturada", err, {
            type: "uncaughtException",
            severity: "CRITICAL"
        });
        process.exit(1);
    });
}

start().catch((err) => {
    console.error(`
╔════════════════════════════════════════════════════════════════╗
║                   FALHA NA INICIALIZACAO                       ║
╠════════════════════════════════════════════════════════════════╣
║ Erro: ${err.message.padEnd(49)}║
║ Timestamp: ${new Date().toLocaleTimeString("pt-BR", {
        hour12: false,
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit"
    }).padEnd(48)}║
╚════════════════════════════════════════════════════════════════╝
    `);
    logger.fatal({ err }, "Inicializacao do servidor falhou");
    process.exit(1);
});
