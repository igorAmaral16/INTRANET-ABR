import bcrypt from "bcryptjs";
import { pool } from "../config/db.js";

function buildDefaultPassword(username) {
    const first4 = username.slice(0, 4);
    const len = String(username.length).padStart(3, "0");
    return `@@${first4}${len}#*`;
}

const users = [
    { username: "PedroTI", nome: "PedroTI", nivel: 3 },
    { username: "IgorTI", nome: "IgorTI", nivel: 3 },
    { username: "MaraRH", nome: "MaraRH", nivel: 2 },
    { username: "EduardaRH", nome: "EduardaRH", nivel: 1 }
];

async function run() {
    for (const u of users) {
        const password = buildDefaultPassword(u.username);
        const password_hash = await bcrypt.hash(password, 12);

        await pool.query(
            `INSERT INTO Administracao (username, nome, nivel, password_hash, ativo)
       VALUES (:username, :nome, :nivel, :password_hash, 1)
       ON DUPLICATE KEY UPDATE
         nome = VALUES(nome),
         nivel = VALUES(nivel),
         password_hash = VALUES(password_hash),
         ativo = 1`,
            { ...u, password_hash }
        );
    }

    console.log("Seed OK (Administracao)");
}

run()
    .then(async () => {
        await pool.end();
        process.exit(0);
    })
    .catch(async (err) => {
        console.error(err);
        try { await pool.end(); } catch { }
        process.exit(1);
    });
