import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSessaoAuth } from '../../hooks/useSessaoAuth';
import './PaginaAdminCalendario.css';
// @ts-ignore
import { CalendarWidget } from '../../components/CalendarWidget/CalendarWidget';
import { BarraTopo } from '../../components/BarraTopo/BarraTopo';
import { X, Plus, Edit2, Trash2 } from 'lucide-react';

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

interface ConfigForm {
    ano_vigencia: number;
    mes_inicio: number;
    mes_fim: number;
    titulo: string;
    descricao: string;
}

interface FeriadoForm {
    data: string;
    nome: string;
    descricao: string;
    cor_hex: string;
}

export function PaginaAdminCalendario() {
    const navigate = useNavigate();
    const { sessao, sair } = useSessaoAuth();
    const [configuracao, setConfiguracao] = useState<Configuracao | null>(null);
    const [feriados, setFeriados] = useState<Feriado[]>([]);
    const [carregando, setCarregando] = useState(true);
    const [erro, setErro] = useState<string | null>(null);
    const [sucesso, setSucesso] = useState<string | null>(null);

    // Modal de Configuração
    const [showConfigModal, setShowConfigModal] = useState(false);
    const [configForm, setConfigForm] = useState<ConfigForm>({
        ano_vigencia: new Date().getFullYear(),
        mes_inicio: 1,
        mes_fim: 12,
        titulo: '',
        descricao: ''
    });

    // Modal de Feriado
    const [showFeriadoModal, setShowFeriadoModal] = useState(false);
    const [feriadoForm, setFeriadoForm] = useState<FeriadoForm>({
        data: '',
        nome: '',
        descricao: '',
        cor_hex: '#FF6B6B'
    });
    const [editandoFeriado, setEditandoFeriado] = useState<Feriado | null>(null);

    // Filtro de feriados
    const [filtroMes, setFiltroMes] = useState(new Date().getMonth() + 1);
    const [filtroAno, setFiltroAno] = useState(new Date().getFullYear());

    useEffect(() => {
        buscarDados();
    }, []);

    const buscarDados = async () => {
        try {
            setCarregando(true);
            setErro(null);

            console.log('🔄 Carregando configuração e feriados...');

            const confRes = await fetch('/api/calendario/configuracao');
            if (!confRes.ok) {
                if (confRes.status === 404) {
                    setErro('Nenhuma configuração de calendário ativa encontrada. Por favor, crie uma configuração.');
                    setCarregando(false);
                    return;
                }
                let bodyText = null;
                try { bodyText = await confRes.text(); } catch (_) { /* ignore */ }
                throw new Error(`Erro ao carregar configuração (status ${confRes.status}): ${bodyText || confRes.statusText}`);
            }

            const conf = await confRes.json();
            console.log('✅ Configuração carregada:', conf);

            const feriadosRes = await fetch(`/api/calendario/feriados?ano=${conf.ano_vigencia}`);

            if (!feriadosRes.ok) {
                throw new Error('Erro ao carregar feriados');
            }

            const { feriados: feriadosData } = await feriadosRes.json();

            console.log('✅ Feriados carregados:', feriadosData?.map((f: Feriado) => ({
                id: f.id,
                data: f.data,
                nome: f.nome,
                cor_hex: f.cor_hex
            })));

            setConfiguracao(conf);
            setConfigForm({
                ano_vigencia: conf.ano_vigencia,
                mes_inicio: conf.mes_inicio,
                mes_fim: conf.mes_fim,
                titulo: conf.titulo || '',
                descricao: conf.descricao || ''
            });
            setFeriados(feriadosData || []);
            setFiltroAno(conf.ano_vigencia);
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Erro ao carregar dados';
            console.error('❌ Erro ao carregar dados:', message, err);
            setErro(message);
        } finally {
            setCarregando(false);
        }
    };

    const salvarConfiguracao = async () => {
        try {
            setErro(null);

            if (configForm.mes_fim < configForm.mes_inicio) {
                setErro('Mês de término deve ser maior ou igual ao mês de início');
                return;
            }

            const ehProximoFimDeAno = () => {
                const agora = new Date();
                return agora.getMonth() >= 9; // Outubro em diante
            };

            // Se estamos próximo do fim do ano e o ano não foi alterado, sugerir atualizar
            if (ehProximoFimDeAno() && configuracao && configForm.ano_vigencia === configuracao.ano_vigencia) {
                const proximoAno = configForm.ano_vigencia + 1;
                if (window.confirm(`Você está próximo do fim do ano. Deseja atualizar o calendário para ${proximoAno}?`)) {
                    configForm.ano_vigencia = proximoAno;
                }
            }

            const url = configuracao
                ? `/api/admin/calendario/configuracao/${configuracao.id}`
                : '/api/admin/calendario/configuracao';

            const method = configuracao ? 'PATCH' : 'POST';

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json', ...(sessao?.token ? { Authorization: `Bearer ${sessao.token}` } : {}) },
                body: JSON.stringify(configForm)
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error((data.error?.message as string) || 'Erro ao salvar configuração');
            }

            const novaConfig = await res.json();
            setConfiguracao(novaConfig);
            setShowConfigModal(false);
            setSucesso('Configuração salva com sucesso!');
            // Recarregar feriados do novo ano
            await buscarDados();
            setTimeout(() => setSucesso(null), 3000);
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Erro desconhecido';
            setErro(message);
        }
    };

    const salvarFeriado = async () => {
        try {
            if (!feriadoForm.data || !feriadoForm.nome) {
                setErro('Data e nome são obrigatórios');
                return;
            }

            // Garantir que a cor é válida
            const corValida = feriadoForm.cor_hex && /^#[0-9A-F]{6}$/i.test(feriadoForm.cor_hex)
                ? feriadoForm.cor_hex
                : '#FF6B6B';

            const dadosEnvio = {
                ...feriadoForm,
                cor_hex: corValida
            };

            console.log('📝 Enviando feriado:', dadosEnvio);

            const url = editandoFeriado
                ? `/api/admin/calendario/feriados/${editandoFeriado.id}`
                : '/api/admin/calendario/feriados';

            const method = editandoFeriado ? 'PATCH' : 'POST';

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json', ...(sessao?.token ? { Authorization: `Bearer ${sessao.token}` } : {}) },
                body: JSON.stringify(dadosEnvio)
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error((data.error?.message as string) || 'Erro ao salvar feriado');
            }

            const resposta = await res.json();

            console.log('✅ Resposta do servidor:', {
                id: resposta.id,
                data: resposta.data,
                cor_hex: resposta.cor_hex,
                nome: resposta.nome
            });

            if (editandoFeriado) {
                console.log('Atualizando feriado existente');
                setFeriados(feriados.map(f => f.id === resposta.id ? resposta : f));
            } else {
                console.log('Adicionando novo feriado');
                setFeriados([...feriados, resposta]);
            }

            setShowFeriadoModal(false);
            setFeriadoForm({ data: '', nome: '', descricao: '', cor_hex: '#FF6B6B' });
            setEditandoFeriado(null);
            setSucesso(editandoFeriado ? 'Feriado atualizado!' : 'Feriado criado!');
            setTimeout(() => setSucesso(null), 3000);
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Erro desconhecido';
            console.error('❌ Erro ao salvar feriado:', message);
            setErro(message);
        }
    };

    const excluirFeriado = async (id: number) => {
        if (!window.confirm('Tem certeza que deseja excluir este feriado?')) return;

        try {
            const res = await fetch(`/api/admin/calendario/feriados/${id}`, {
                method: 'DELETE',
                headers: { ...(sessao?.token ? { Authorization: `Bearer ${sessao.token}` } : {}) }
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error((data.error?.message as string) || 'Erro ao excluir feriado');
            }

            setFeriados(feriados.filter(f => f.id !== id));
            setSucesso('Feriado excluído com sucesso!');
            setTimeout(() => setSucesso(null), 3000);
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Erro desconhecido';
            setErro(message);
        }
    };

    const abrirEditarFeriado = (feriado: Feriado) => {
        setEditandoFeriado(feriado);
        setFeriadoForm({
            data: feriado.data,
            nome: feriado.nome,
            descricao: feriado.descricao || '',
            cor_hex: feriado.cor_hex
        });
        setShowFeriadoModal(true);
    };

    const feriadosFiltrados = feriados.filter(f => {
        if (!f.data) return false;
        // Normaliza antes de quebrar em partes (tolerante a "YYYY-MM-DDTHH:MM:SS")
        const partes = String(f.data).slice(0, 10).split('-');
        if (partes.length < 3) return false;
        const ano = parseInt(partes[0], 10);
        const mes = parseInt(partes[1], 10);
        return ano === filtroAno && mes === filtroMes;
    });

    const nomeMeses = [
        'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];

    return (
        <div className="pagina-admin-calendario">
            <BarraTopo
                busca=""
                aoMudarBusca={() => { }}
                mostrarBusca={false}
                aoIrParaInicio={() => navigate('/admin')}
                estaLogado={Boolean(sessao?.token)}
                role={sessao?.role}
                aoClicarEntrar={() => navigate('/')}

                aoAdminCriarComunicado={() => navigate('/admin/criar-comunicado')}
                aoAdminDocumentos={() => navigate('/admin/documentos')}
                aoAdminColaboradores={() => navigate('/admin/colaboradores')}
                aoAdminFaq={() => navigate('/admin/faq')}
                aoAdminFaleComRh={() => navigate('/admin/fale-com-rh')}
                aoAdminRelatorios={() => navigate('/admin/relatorios')}
                aoAdminCalendario={() => navigate('/admin/calendario')}

                aoSair={() => {
                    sair();
                    navigate('/', { replace: true });
                }}
            />

            <div className="container-admin">
                {erro && (
                    <div className="alert alert-error">
                        <span>{erro}</span>
                        <button onClick={() => setErro(null)}>
                            <X size={18} />
                        </button>
                    </div>
                )}

                {sucesso && (
                    <div className="alert alert-success">
                        <span>{sucesso}</span>
                        <button onClick={() => setSucesso(null)}>
                            <X size={18} />
                        </button>
                    </div>
                )}

                {carregando ? (
                    <div className="loading">
                        <div className="spinner" />
                        <p>Carregando dados...</p>
                    </div>
                ) : (
                    <>
                        {/* Seção de Configuração */}
                        <section className="admin-section">
                            <div className="section-header">
                                <h2>Configuração do Calendário</h2>
                                <button
                                    className="btn btn-primary"
                                    onClick={() => setShowConfigModal(true)}
                                >
                                    {configuracao ? 'Editar Configuração' : 'Criar Configuração'}
                                </button>
                            </div>

                            {configuracao && (
                                <div className="config-card">
                                    <div className="config-item">
                                        <label>Ano de Vigência:</label>
                                        <span>{configuracao.ano_vigencia}</span>
                                    </div>
                                    <div className="config-item">
                                        <label>Período:</label>
                                        <span>
                                            {nomeMeses[configuracao.mes_inicio - 1]} a {nomeMeses[configuracao.mes_fim - 1]}
                                        </span>
                                    </div>
                                    {configuracao.titulo && (
                                        <div className="config-item">
                                            <label>Título:</label>
                                            <span>{configuracao.titulo}</span>
                                        </div>
                                    )}
                                    {configuracao.descricao && (
                                        <div className="config-item">
                                            <label>Descrição:</label>
                                            <span>{configuracao.descricao}</span>
                                        </div>
                                    )}
                                </div>
                            )}
                        </section>

                        {/* Seção de Feriados */}
                        <section className="admin-section">
                            <div className="section-header">
                                <h2>Feriados</h2>
                                <button
                                    className="btn btn-success"
                                    onClick={() => {
                                        setEditandoFeriado(null);
                                        setFeriadoForm({ data: '', nome: '', descricao: '', cor_hex: '#FF6B6B' });
                                        setShowFeriadoModal(true);
                                    }}
                                >
                                    <Plus size={18} />
                                    Novo Feriado
                                </button>
                            </div>

                            <div className="filtro-feriados">
                                <select
                                    value={filtroMes}
                                    onChange={(e) => setFiltroMes(Number(e.target.value))}
                                    className="form-select"
                                >
                                    {nomeMeses.map((mes, idx) => (
                                        <option key={idx} value={idx + 1}>{mes}</option>
                                    ))}
                                </select>
                                <select
                                    value={filtroAno}
                                    onChange={(e) => setFiltroAno(Number(e.target.value))}
                                    className="form-select"
                                >
                                    {[2024, 2025, 2026, 2027, 2028].map(ano => (
                                        <option key={ano} value={ano}>{ano}</option>
                                    ))}
                                </select>
                            </div>

                            {feriadosFiltrados.length === 0 ? (
                                <p className="vazio">Nenhum feriado neste período</p>
                            ) : (
                                <div className="feriados-grid">
                                    {feriadosFiltrados.map(feriado => (
                                        <div key={feriado.id} className="feriado-card">
                                            <div
                                                className="feriado-color"
                                                style={{ backgroundColor: feriado.cor_hex }}
                                            />
                                            <div className="feriado-info">
                                                <div className="feriado-data">{feriado.data}</div>
                                                <h4>{feriado.nome}</h4>
                                                {feriado.descricao && <p>{feriado.descricao}</p>}
                                                <span className={`tipo ${feriado.tipo.toLowerCase()}`}>
                                                    {feriado.tipo === 'NACIONAL' ? 'Nacional' : 'Customizado'}
                                                </span>
                                            </div>
                                            {feriado.tipo === 'CUSTOMIZADO' && (
                                                <div className="feriado-actions">
                                                    <button
                                                        className="btn-icon edit"
                                                        onClick={() => abrirEditarFeriado(feriado)}
                                                        title="Editar"
                                                    >
                                                        <Edit2 size={16} />
                                                    </button>
                                                    <button
                                                        className="btn-icon delete"
                                                        onClick={() => excluirFeriado(feriado.id)}
                                                        title="Deletar"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </section>

                        {/* Pré-visualização do Calendário */}
                        <section className="admin-section">
                            <h2>Pré-visualização do Calendário</h2>
                            {configuracao && (
                                <CalendarWidget
                                    feriados={feriados}
                                    ano={configuracao.ano_vigencia}
                                    mesInicio={configuracao.mes_inicio}
                                    mesFim={configuracao.mes_fim}
                                    readOnly={true}
                                />
                            )}
                        </section>
                    </>
                )}
            </div>

            {/* Modal de Configuração */}
            {showConfigModal && (
                <div className="modal-overlay" onClick={() => setShowConfigModal(false)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>Configuração do Calendário</h3>
                            <button
                                className="btn-close"
                                onClick={() => setShowConfigModal(false)}
                            >
                                <X size={24} />
                            </button>
                        </div>

                        <div className="modal-body">
                            <div className="form-group">
                                <label>Ano de Vigência</label>
                                <input
                                    type="number"
                                    min="2020"
                                    max="2100"
                                    value={configForm.ano_vigencia}
                                    onChange={(e) => setConfigForm({ ...configForm, ano_vigencia: Number(e.target.value) })}
                                    className="form-input"
                                />
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label>Mês Inicial</label>
                                    <select
                                        value={configForm.mes_inicio}
                                        onChange={(e) => setConfigForm({ ...configForm, mes_inicio: Number(e.target.value) })}
                                        className="form-select"
                                    >
                                        {nomeMeses.map((mes, idx) => (
                                            <option key={idx} value={idx + 1}>{mes}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="form-group">
                                    <label>Mês Final</label>
                                    <select
                                        value={configForm.mes_fim}
                                        onChange={(e) => setConfigForm({ ...configForm, mes_fim: Number(e.target.value) })}
                                        className="form-select"
                                    >
                                        {nomeMeses.map((mes, idx) => (
                                            <option key={idx} value={idx + 1}>{mes}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="form-group">
                                <label>Título (Opcional)</label>
                                <input
                                    type="text"
                                    placeholder="Ex: Calendário 2025"
                                    value={configForm.titulo}
                                    onChange={(e) => setConfigForm({ ...configForm, titulo: e.target.value })}
                                    className="form-input"
                                />
                            </div>

                            <div className="form-group">
                                <label>Descrição (Opcional)</label>
                                <textarea
                                    placeholder="Descreva o calendário..."
                                    value={configForm.descricao}
                                    onChange={(e) => setConfigForm({ ...configForm, descricao: e.target.value })}
                                    className="form-textarea"
                                    rows={4}
                                />
                            </div>
                        </div>

                        <div className="modal-footer">
                            <button
                                className="btn btn-secondary"
                                onClick={() => setShowConfigModal(false)}
                            >
                                Cancelar
                            </button>
                            <button
                                className="btn btn-primary"
                                onClick={salvarConfiguracao}
                            >
                                Salvar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de Feriado */}
            {showFeriadoModal && (
                <div className="modal-overlay" onClick={() => setShowFeriadoModal(false)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>{editandoFeriado ? 'Editar Feriado' : 'Novo Feriado'}</h3>
                            <button
                                className="btn-close"
                                onClick={() => setShowFeriadoModal(false)}
                            >
                                <X size={24} />
                            </button>
                        </div>

                        <div className="modal-body">
                            <div className="form-group">
                                <label>Data *</label>
                                <input
                                    type="date"
                                    value={feriadoForm.data}
                                    onChange={(e) => setFeriadoForm({ ...feriadoForm, data: e.target.value })}
                                    className="form-input"
                                />
                            </div>

                            <div className="form-group">
                                <label>Nome *</label>
                                <input
                                    type="text"
                                    placeholder="Ex: Feriado Customizado"
                                    value={feriadoForm.nome}
                                    onChange={(e) => setFeriadoForm({ ...feriadoForm, nome: e.target.value })}
                                    className="form-input"
                                />
                            </div>

                            <div className="form-group">
                                <label>Descrição (Opcional)</label>
                                <textarea
                                    placeholder="Motivo ou informações adicionais..."
                                    value={feriadoForm.descricao}
                                    onChange={(e) => setFeriadoForm({ ...feriadoForm, descricao: e.target.value })}
                                    className="form-textarea"
                                    rows={3}
                                />
                            </div>

                            <div className="form-group">
                                <label>Cor</label>
                                <div className="color-picker">
                                    <input
                                        type="color"
                                        value={feriadoForm.cor_hex}
                                        onChange={(e) => setFeriadoForm({ ...feriadoForm, cor_hex: e.target.value })}
                                        className="form-color"
                                    />
                                    <span className="color-value">{feriadoForm.cor_hex}</span>
                                </div>
                            </div>
                        </div>

                        <div className="modal-footer">
                            <button
                                className="btn btn-secondary"
                                onClick={() => setShowFeriadoModal(false)}
                            >
                                Cancelar
                            </button>
                            <button
                                className="btn btn-primary"
                                onClick={salvarFeriado}
                            >
                                {editandoFeriado ? 'Atualizar' : 'Criar'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
