export function requireNivel(minNivel) {
    return function (req, res, next) {
        if (!req.user) {
            return res.status(401).json({
                error: { message: "Não autenticado.", requestId: req.id }
            });
        }

        // Permitir acesso com base no nível (`nivel`) do usuário.
        // Não exige papel `ADMIN` — qualquer usuário com `nivel` >= minNivel terá acesso.
        const nivel = Number(req.user?.nivel);
        if (!Number.isFinite(nivel) || nivel < minNivel) {
            return res.status(403).json({
                error: { message: "Acesso negado.", requestId: req.id }
            });
        }

        return next();
    };
}
