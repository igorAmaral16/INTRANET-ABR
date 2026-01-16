type Props = { mensagem: string; aoTentarNovamente: () => void };

export function EstadoErro({ mensagem, aoTentarNovamente }: Props) {
    return (
        <div style={{ padding: 16 }}>
            <p style={{ margin: 0, fontWeight: 800 }}>Falha ao carregar</p>
            <p style={{ marginTop: 8, opacity: 0.8 }}>{mensagem}</p>
            <button onClick={aoTentarNovamente} type="button">
                Tentar novamente
            </button>
        </div>
    );
}
