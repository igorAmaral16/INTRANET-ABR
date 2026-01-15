import { z } from "zod";
import { changePassword } from "../services/colaboradorPassword.service.js";

const Schema = z.object({
    senhaAtual: z.string().min(1).max(200),
    novaSenha: z.string().min(6).max(200)
});

export async function alterarMinhaSenha(req, res) {
    const body = Schema.parse(req.body);

    const colaboradorId = Number(req.user?.id);
    if (!colaboradorId) {
        return res.status(401).json({
            error: { message: "Não autenticado.", requestId: req.id }
        });
    }

    await changePassword({
        colaboradorId,
        currentPassword: body.senhaAtual,
        newPassword: body.novaSenha
    });

    return res.status(204).send();
}
