import { z } from "zod";
import { confirmRead } from "../services/comunicadoReads.service.js";

export async function confirmarLeitura(req, res) {
    // Apenas COLAB (controle via rota/middleware)
    const comunicadoId = z.coerce.number().int().positive().parse(req.params.id);

    const colaboradorId = Number(req.user?.id);
    if (!colaboradorId) {
        return res.status(401).json({
            error: { message: "Não autenticado.", requestId: req.id }
        });
    }

    await confirmRead({ comunicadoId, colaboradorId });
    return res.status(204).send();
}
