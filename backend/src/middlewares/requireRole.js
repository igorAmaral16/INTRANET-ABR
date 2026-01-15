const ROLE_ALIASES = {
    ADMIN: new Set(["ADMIN", "ADMINISTRACAO", "ADMINISTRATIVO"]),
    COLAB: new Set(["COLAB", "COLABORADOR", "COLABORADORES"])
};

function normalizeRole(role) {
    return String(role || "").trim().toUpperCase();
}

function matchesRole(userRole, requiredRole) {
    const ur = normalizeRole(userRole);
    const rr = normalizeRole(requiredRole);

    if (!ur || !rr) return false;
    if (ur === rr) return true;

    const aliases = ROLE_ALIASES[rr];
    if (!aliases) return false;

    return aliases.has(ur);
}

export function requireRole(requiredRole) {
    return function (req, res, next) {
        const userRole = req.user?.role;

        if (!matchesRole(userRole, requiredRole)) {
            // Retorna o que interessa para depuração (sem expor token)
            req.log?.warn(
                { userRole, requiredRole, user: req.user },
                "Role check failed"
            );

            return res.status(403).json({
                error: { message: "Acesso negado.", requestId: req.id }
            });
        }

        return next();
    };
}
