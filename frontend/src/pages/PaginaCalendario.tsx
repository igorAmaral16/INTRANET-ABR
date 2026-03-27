import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSessaoAuth } from '../hooks/useSessaoAuth';
import { BotaoVoltar } from '../components/BotaoVoltar/BotaoVoltar';
import { SidebarFixed } from '../components/SidebarFixed/SidebarFixed';
import './PaginaCalendario.css';
// @ts-ignore
import { CalendarWidget } from '../components/CalendarWidget/CalendarWidget';

interface Configuracao {
    id: number;
    ano_vigencia: number;
    mes_inicio: number;
    mes_fim: number;
    titulo?: string;
    descricao?: string;
    ativo: number;
    created_at: string;
    updated_at: string;
}

interface Feriado {
    id: number;
    ano_feriado: number;
    data: string;
    nome: string;
    descricao?: string;
    tipo: 'NACIONAL' | 'CUSTOMIZADO';
    cor_hex: string;
    created_at: string;
    updated_at: string;
}

export function PaginaCalendario() {
    const navigate = useNavigate();
    const { sessao, sair } = useSessaoAuth();

    const [configuracao, setConfiguracao] = useState<Configuracao | null>(null);
    const [feriados, setFeriados] = useState<Feriado[]>([]);
    const [carregando, setCarregando] = useState(true);
    const [erro, setErro] = useState<string | null>(null);

    useEffect(() => {
        buscarDados();
    }, []);

    const buscarDados = async () => {
        try {
            setCarregando(true);
            setErro(null);

            const confRes = await fetch('/api/calendario/configuracao');

            if (!confRes.ok) {
                const text = await confRes.text().catch(() => '');
                throw new Error(`Erro ao carregar configuração (status ${confRes.status}) ${text}`);
            }

            const conf = await confRes.json();

            // Buscar feriados do ano da configuração
            const feriadosRes = await fetch(`/api/calendario/feriados?ano=${conf.ano_vigencia}`);
            if (!feriadosRes.ok) {
                const text = await feriadosRes.text().catch(() => '');
                throw new Error(`Erro ao carregar feriados (status ${feriadosRes.status}) ${text}`);
            }

            const { feriados: feriadosData } = await feriadosRes.json();

            setConfiguracao(conf);
            setFeriados(feriadosData || []);
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Erro ao carregar dados';
            setErro(message);
            console.error('Erro:', err);
        } finally {
            setCarregando(false);
        }
    };

    return (
        <div className="paginaCalendario">
            <SidebarFixed
                estaLogado={Boolean(sessao?.token)}
                role={sessao?.role}
                aoIrParaHome={() => navigate('/')}
                aoMeuPerfil={() => navigate('/meu-perfil')}
                aoVerDocumentos={() => navigate('/documentos')}
                aoMeusDocumentos={() => navigate('/meus-documentos')}
                aoCalendario={() => navigate('/calendario')}
                aoFaq={() => navigate('/faq')}
                aoFaleComRh={() => navigate('/fale-com-rh')}
                aoClicarEntrar={() => navigate('/')}
                aoSair={() => {
                    sair();
                    navigate('/', { replace: true });
                }}
            />

            <main className="paginaCalendario__conteudo">
                <BotaoVoltar destino="/" />
                {carregando && (
                    <div className="paginaCalendario__loading">
                        <div className="paginaCalendario__spinner" />
                        <p>Carregando calendário...</p>
                    </div>
                )}

                {erro && (
                    <div className="paginaCalendario__erro">
                        <p>{erro}</p>
                        <button onClick={buscarDados} className="paginaCalendario__btnRetry">
                            Tentar Novamente
                        </button>
                    </div>
                )}

                {!carregando && !erro && (
                    <>
                        {configuracao && (
                            <div className="paginaCalendario__header">
                                {configuracao.titulo && (
                                    <h1 className="paginaCalendario__titulo">{configuracao.titulo}</h1>
                                )}
                                {configuracao.descricao && (
                                    <p className="paginaCalendario__descricao">{configuracao.descricao}</p>
                                )}
                            </div>
                        )}

                        <div className="paginaCalendario__widget">
                            <CalendarWidget
                                feriados={feriados}
                                ano={configuracao?.ano_vigencia || new Date().getFullYear()}
                                mesInicio={configuracao?.mes_inicio || 1}
                                mesFim={configuracao?.mes_fim || 12}
                                readOnly={true}
                            />
                        </div>

                        <div className="paginaCalendario__info">
                            <div className="paginaCalendario__infoItem">
                                <span className="paginaCalendario__colorSample" style={{ backgroundColor: '#FF6B6B' }} />
                                <span>Feriados Nacionais e Customizados</span>
                            </div>
                            <p className="paginaCalendario__infoTexto">
                                Visualize os feriados nacionais e aqueles criados pela administração.
                                Clique sobre qualquer data para mais informações.
                            </p>
                        </div>
                    </>
                )}
            </main>
        </div>
    );
}
