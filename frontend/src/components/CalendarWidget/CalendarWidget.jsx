import React, { useState, useMemo } from 'react';
import './CalendarWidget.css';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export function CalendarWidget({
    feriados = [],
    ano = new Date().getFullYear(),
    mesInicio = 1,
    mesFim = 12,
    onDateClick = null,
    readOnly = true
}) {
    // Inicializar mês/ano para ficar consistente com a configuração recebida.
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const initialMes = (() => {
        // Se mesInicio estiver definido, iniciar nele;
        // caso contrário tentar usar mês atual se estiver dentro do intervalo,
        // senão usar mesInicio.
        if (mesInicio && mesFim) {
            if (currentMonth >= mesInicio && currentMonth <= mesFim && ano === now.getFullYear()) {
                return currentMonth;
            }
            return mesInicio;
        }
        return currentMonth;
    })();

    const [mesAtual, setMesAtual] = useState(initialMes);
    const [anoAtual, setAnoAtual] = useState(ano);

    // Normaliza feriados para um Map com chave YYYY-MM-DD (primeiros 10 caracteres)
    const feriadosMap = useMemo(() => {
        const map = new Map();

        if (!Array.isArray(feriados)) {
            console.warn('⚠️ feriados não é um array:', feriados);
            return map;
        }

        feriados.forEach(f => {
            if (f && f.data) {
                // Normaliza chave para "YYYY-MM-DD" independentemente do formato vindo do backend
                const key = String(f.data).slice(0, 10);
                map.set(key, {
                    ...f,
                    data: key // garante que f.data no map esteja no formato YYYY-MM-DD
                });
            }
        });

        return map;
    }, [feriados]);

    const getDaysInMonth = (ano, mes) => {
        return new Date(ano, mes, 0).getDate();
    };

    const getFirstDayOfMonth = (ano, mes) => {
        return new Date(ano, mes - 1, 1).getDay(); // 0=Dom, ... 6=Sab
    };

    const diasNoMes = getDaysInMonth(anoAtual, mesAtual);
    const primeiroDia = getFirstDayOfMonth(anoAtual, mesAtual);

    const dias = [];
    for (let i = 0; i < primeiroDia; i++) {
        dias.push(null);
    }
    for (let i = 1; i <= diasNoMes; i++) {
        dias.push(i);
    }

    const handleMesAnterior = () => {
        // não permite voltar antes de mesInicio/ano
        if (anoAtual === ano && mesAtual === mesInicio) return;

        if (mesAtual === 1) {
            setMesAtual(12);
            setAnoAtual(prev => prev - 1);
        } else {
            setMesAtual(prev => prev - 1);
        }
    };

    const handleProxMes = () => {
        // não permite avançar além de mesFim/ano
        if (anoAtual === ano && mesAtual === mesFim) return;

        if (mesAtual === 12) {
            setMesAtual(1);
            setAnoAtual(prev => prev + 1);
        } else {
            setMesAtual(prev => prev + 1);
        }
    };

    const handleDataClick = (dia) => {
        if (!readOnly && onDateClick && dia) {
            const data = `${anoAtual}-${String(mesAtual).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
            onDateClick(data);
        }
    };

    const isFeriado = (dia) => {
        if (!dia) return null;
        const dataStr = `${anoAtual}-${String(mesAtual).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
        return feriadosMap.get(dataStr) || null;
    };

    const ehSabado = (indice) => {
        const weekdayIndex = indice % 7; // 0=Dom ... 6=Sab
        return weekdayIndex === 6;
    };

    const ehDomingo = (indice) => {
        const weekdayIndex = indice % 7;
        return weekdayIndex === 0;
    };

    const nomeMes = [
        'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];

    // Habilitar/desabilitar navegação (respeita ano prop como limite)
    const podeVoltarMes = !(anoAtual === ano && mesAtual === mesInicio);
    const podeAvancarMes = !(anoAtual === ano && mesAtual === mesFim);

    return (
        <div className="calendar-widget">
            <div className="calendar-header">
                <button
                    className="btn-nav"
                    onClick={handleMesAnterior}
                    disabled={!podeVoltarMes}
                >
                    <ChevronLeft size={20} />
                </button>

                <h2 className="month-year">
                    {nomeMes[mesAtual - 1]} de {anoAtual}
                </h2>

                <button
                    className="btn-nav"
                    onClick={handleProxMes}
                    disabled={!podeAvancarMes}
                >
                    <ChevronRight size={20} />
                </button>
            </div>

            <div className="calendar-weekdays">
                <div className="weekday">Dom</div>
                <div className="weekday">Seg</div>
                <div className="weekday">Ter</div>
                <div className="weekday">Qua</div>
                <div className="weekday">Qui</div>
                <div className="weekday">Sex</div>
                <div className="weekday">Sab</div>
            </div>

            <div className="calendar-days">
                {dias.map((dia, indice) => {
                    // Obter feriado para este dia
                    const feriado = dia ? isFeriado(dia) : null;

                    const isSab = dia && ehSabado(indice);
                    const isDom = dia && ehDomingo(indice);

                    // Classes CSS
                    const classNames = [
                        'day',
                        dia ? 'active' : 'empty',
                        feriado ? 'feriado' : '',
                        isSab || isDom ? 'weekend' : ''
                    ].filter(Boolean).join(' ');

                    // Cor de fundo - se tem feriado, usa a cor do feriado
                    const backgroundColor = feriado ? feriado.cor_hex : null;

                    return (
                        <div
                            key={indice}
                            className={classNames}
                            onClick={() => handleDataClick(dia)}
                            title={feriado ? feriado.nome : ''}
                            style={backgroundColor ? { backgroundColor: backgroundColor, color: '#fff' } : {}}
                        >
                            {dia && (
                                <div className="day-number">{dia}</div>
                            )}

                            {feriado && (
                                <div className="feriado-indicator" style={{ backgroundColor: feriado.cor_hex }} />
                            )}
                        </div>
                    );
                })}
            </div>

            {feriados.length > 0 && (
                <div className="calendar-legend">
                    <h3>Feriados</h3>
                    <ul className="feriados-list">
                        {feriados
                            .filter(f => {
                                if (!f || !f.data) return false;
                                const partes = String(f.data).slice(0, 10).split('-').map(Number);
                                const anoF = partes[0];
                                const mesF = partes[1];
                                return anoF === anoAtual && mesF === mesAtual;
                            })
                            .map(f => (
                                <li key={f.id} className="feriado-item">
                                    <span
                                        className="color-box"
                                        style={{ backgroundColor: f.cor_hex }}
                                    />
                                    <div className="feriado-info">
                                        <strong>{f.nome}</strong>
                                        {f.descricao && <p>{f.descricao}</p>}
                                    </div>
                                </li>
                            ))}
                    </ul>
                </div>
            )}
        </div>
    );
}
