export function requireNivel(minNivel) {
    return function (req, res, next) {
        if (req.user?.role !== "ADMIN") {
            return res.status(403).json({
                error: { message: "Acesso negado.", requestId: req.id }
            });
        }

        const nivel = Number(req.user?.nivel);
        if (!nivel || nivel < minNivel) {
            return res.status(403).json({
                error: { message: "Acesso negado.", requestId: req.id }
            });
        }

        return next();
    };
}
