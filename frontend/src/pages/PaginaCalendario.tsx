import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSessaoAuth } from '../hooks/useSessaoAuth';
import './PaginaCalendario.css';
// @ts-ignore
import { CalendarWidget } from '../components/CalendarWidget/CalendarWidget';
import { BarraTopo } from '../components/BarraTopo/BarraTopo';

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
        <div className="pagina-calendario">
            <BarraTopo
                busca=""
                aoMudarBusca={() => { }}
                mostrarBusca={false}
                aoIrParaInicio={() => navigate('/')}
                estaLogado={Boolean(sessao?.token)}
                role={sessao?.role}
                aoClicarEntrar={() => navigate('/')}

                aoMeuPerfil={() => navigate('/meu-perfil')}
                aoVerDocumentos={() => navigate('/documentos')}
                aoCalendario={() => navigate('/calendario')}
                aoFaq={() => navigate('/faq')}
                aoFaleComRh={() => navigate('/fale-com-rh')}

                aoSair={() => {
                    sair();
                    navigate('/', { replace: true });
                }}
            />

            <div className="container">
                <div className="calendario-content">
                    {carregando && (
                        <div className="loading">
                            <div className="spinner" />
                            <p>Carregando calendário...</p>
                        </div>
                    )}

                    {erro && (
                        <div className="error-message">
                            <p>{erro}</p>
                            <button onClick={buscarDados}>Tentar Novamente</button>
                        </div>
                    )}

                    {!carregando && !erro && (
                        <>
                            {configuracao && (
                                <div className="config-info">
                                    {configuracao.titulo && (
                                        <h1 className="config-title">{configuracao.titulo}</h1>
                                    )}
                                    {configuracao.descricao && (
                                        <p className="config-description">{configuracao.descricao}</p>
                                    )}
                                </div>
                            )}

                            <CalendarWidget
                                feriados={feriados}
                                ano={configuracao?.ano_vigencia || new Date().getFullYear()}
                                mesInicio={configuracao?.mes_inicio || 1}
                                mesFim={configuracao?.mes_fim || 12}
                                readOnly={true}
                            />

                            <div className="info-rodape">
                                <div className="info-item">
                                    <span className="color-sample" style={{ backgroundColor: '#FF6B6B' }} />
                                    <span>Feriados Nacionais e Customizados</span>
                                </div>
                                <p className="info-texto">
                                    Visualize os feriados nacionais e aqueles criados pela administração.
                                    Clique sobre qualquer data para mais informações.
                                </p>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
