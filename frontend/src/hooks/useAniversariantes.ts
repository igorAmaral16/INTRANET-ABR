import { useEffect, useState } from "react";
import { listarColaboradoresAdmin } from "../api/colaborador.api";

export type Aniversariante = {
    nome_completo: string;
    data_nascimento: string;
    dia: number;
};

export function useAniversariantes(token?: string) {
    const [aniversariantes, setAniversariantes] = useState<Aniversariante[]>([]);
    const [estado, setEstado] = useState<"carregando" | "pronto" | "erro">("carregando");
    const [erro, setErro] = useState<string | null>(null);

    useEffect(() => {
        if (!token) {
            setEstado("pronto");
            return;
        }
        buscarAniversariantes();
    }, [token]);

    const buscarAniversariantes = async () => {
        if (!token) return;

        try {
            setEstado("carregando");
            setErro(null);

            // Buscar todos os colaboradores ativos
            const { items } = await listarColaboradoresAdmin({
                token,
                page: 1,
                pageSize: 500,
                status: "ATIVO",
            });

            const hoje = new Date();
            const mesAtual = hoje.getMonth() + 1;

            const aniversariantesMes = items
                .filter((colaborador) => {
                    if (!colaborador.data_nascimento) return false;

                    // Parse data: pode ser YYYY-MM-DD ou DD/MM/YYYY
                    let dia, mes;
                    if (colaborador.data_nascimento.includes("-")) {
                        const partes = colaborador.data_nascimento.split("-");
                        mes = parseInt(partes[1]);
                        dia = parseInt(partes[2]);
                    } else {
                        const partes = colaborador.data_nascimento.split("/");
                        dia = parseInt(partes[0]);
                        mes = parseInt(partes[1]);
                    }

                    return mes === mesAtual;
                })
                .map((colaborador) => {
                    let dia, mes;
                    if (colaborador.data_nascimento.includes("-")) {
                        const partes = colaborador.data_nascimento.split("-");
                        mes = parseInt(partes[1]);
                        dia = parseInt(partes[2]);
                    } else {
                        const partes = colaborador.data_nascimento.split("/");
                        dia = parseInt(partes[0]);
                        mes = parseInt(partes[1]);
                    }

                    // Extrair primeiro e segundo nome
                    const nomes = colaborador.nome_completo.trim().split(/\s+/);
                    const nome =
                        nomes.length > 1
                            ? `${nomes[0]} ${nomes[1]}`
                            : colaborador.nome_completo;

                    return {
                        nome_completo: nome,
                        data_nascimento: colaborador.data_nascimento,
                        dia,
                    };
                })
                .sort((a, b) => a.dia - b.dia);

            setAniversariantes(aniversariantesMes);
            setEstado("pronto");
        } catch (err: any) {
            const mensagem = err?.message || "Erro ao carregar aniversariantes";
            setErro(mensagem);
            setEstado("erro");
        }
    };

    return {
        aniversariantes,
        estado,
        erro,
        recarregar: buscarAniversariantes,
    };
}
