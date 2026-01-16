export function requireNivel(minNivel) {
    return function (req, res, next) {
        if (!req.user) {
            return res.status(401).json({
                error: { message: "Não autenticado.", requestId: req.id }
            });
        }

        if (req.user?.role !== "ADMIN") {
            return res.status(403).json({
                error: { message: "Acesso negado.", requestId: req.id }
            });
        }

        const nivel = Number(req.user?.nivel);
        if (!Number.isFinite(nivel) || nivel < minNivel) {
            return res.status(403).json({
                error: { message: "Acesso negado.", requestId: req.id }
            });
        }

        return next();
    };
}
