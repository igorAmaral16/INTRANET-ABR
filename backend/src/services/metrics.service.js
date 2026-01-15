import { pool } from "../config/db.js";

export async function incrementAcessoHoje() {
    // Define “acesso” como abertura da home pública (GET /comunicados)
    await pool.query(
        `INSERT INTO AcessosDaily (dia, acessos_total)
     VALUES (CURDATE(), 1)
     ON DUPLICATE KEY UPDATE acessos_total = acessos_total + 1`
    );
}

export async function incrementComunicadoViewHoje(comunicadoId) {
    await pool.query(
        `INSERT INTO ComunicadoViewsDaily (comunicado_id, dia, views_total)
     VALUES (:comunicadoId, CURDATE(), 1)
     ON DUPLICATE KEY UPDATE views_total = views_total + 1`,
        { comunicadoId }
    );
}
