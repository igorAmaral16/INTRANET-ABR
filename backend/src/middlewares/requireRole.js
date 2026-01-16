const ROLE_ALIASES = {
    ADMIN: new Set(["ADMIN", "ADMINISTRACAO", "ADMINISTRATIVO"]),
    COLAB: new Set(["COLAB", "COLABORADOR", "COLABORADORES"])
};

function matchesRole(userRole, requiredRole) {
    if (!userRole) return false;
    if (userRole === requiredRole) return true;

    const aliases = ROLE_ALIASES[requiredRole];
    if (!aliases) return false;

    return aliases.has(String(userRole).toUpperCase());
}

export function requireRole(role) {
    return function (req, res, next) {
        if (!req.user) {
            return res.status(401).json({
                error: { message: "Não autenticado.", requestId: req.id }
            });
        }

        const userRole = String(req.user?.role || "").toUpperCase();

        if (!matchesRole(userRole, role)) {
            return res.status(403).json({
                error: { message: "Acesso negado.", requestId: req.id }
            });
        }

        return next();
    };
}
