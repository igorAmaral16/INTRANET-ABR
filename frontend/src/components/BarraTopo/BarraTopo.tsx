import "./BarraTopo.css";

type Props = {
    busca: string;
    aoMudarBusca: (v: string) => void;
    aoClicarEntrar: () => void;
};

export function BarraTopo({ busca, aoMudarBusca, aoClicarEntrar }: Props) {
    return (
        <header className="barraTopo">
            <div className="barraTopo__conteudo">
                <div className="barraTopo__marca" aria-label="Marca">
                    <span className="barraTopo__logo">ABR</span>
                </div>

                <div className="barraTopo__busca">
                    <input
                        value={busca}
                        onChange={(e) => aoMudarBusca(e.target.value)}
                        placeholder="Pesquisar comunicados"
                        aria-label="Pesquisar comunicados"
                    />
                </div>

                <button className="barraTopo__botaoEntrar" onClick={aoClicarEntrar} type="button">
                    Entrar
                </button>
            </div>
        </header>
    );
}
