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
    const [mesAtual, setMesAtual] = useState(new Date().getMonth() + 1);
    const [anoAtual, setAnoAtual] = useState(ano);

    // Mapa de feriados para acesso rápido
    const feriadosMap = useMemo(() => {
        const map = new Map();
        feriados.forEach(f => {
            map.set(f.data, f);
        });
        return map;
    }, [feriados]);

    const getDaysInMonth = (ano, mes) => {
        return new Date(ano, mes, 0).getDate();
    };

    const getFirstDayOfMonth = (ano, mes) => {
        return new Date(ano, mes - 1, 1).getDay();
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
        if (mesAtual === mesInicio && anoAtual === ano) return;

        if (mesAtual === 1) {
            setMesAtual(12);
            setAnoAtual(anoAtual - 1);
        } else {
            setMesAtual(mesAtual - 1);
        }
    };

    const handleProxMes = () => {
        if (mesAtual === mesFim && anoAtual === ano) return;

        if (mesAtual === 12) {
            setMesAtual(1);
            setAnoAtual(anoAtual + 1);
        } else {
            setMesAtual(mesAtual + 1);
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
        return feriadosMap.get(dataStr);
    };

    function hexToRgb(hex) {
        if (!hex) return null;
        const h = hex.replace('#', '').trim();
        if (h.length === 3) {
            return {
                r: parseInt(h[0] + h[0], 16),
                g: parseInt(h[1] + h[1], 16),
                b: parseInt(h[2] + h[2], 16)
            };
        }
        if (h.length === 6) {
            return {
                r: parseInt(h.substring(0, 2), 16),
                g: parseInt(h.substring(2, 4), 16),
                b: parseInt(h.substring(4, 6), 16)
            };
        }
        return null;
    }

    function getTextColorForBg(hex) {
        const rgb = hexToRgb(hex);
        if (!rgb) return '#000';
        // relative luminance
        const { r, g, b } = rgb;
        const rs = r / 255;
        const gs = g / 255;
        const bs = b / 255;
        const lum = 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
        // threshold: if luminance is high, use dark text
        return lum > 0.65 ? '#000' : '#fff';
    }

    const ehSabado = (indice) => {
        return (indice + 1) % 7 === 6;
    };

    const ehDomingo = (indice) => {
        return (indice + 1) % 7 === 0;
    };

    const nomeMes = [
        'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];

    const podeVoltarMes = mesAtual > mesInicio || anoAtual > ano;
    const podeAvancarMes = mesAtual < mesFim || anoAtual < ano;

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
                    const feriado = dia ? isFeriado(dia) : null;
                    const isSab = dia && ehSabado(indice);
                    const isDom = dia && ehDomingo(indice);
                    const classNames = [
                        'day',
                        dia ? 'active' : 'empty',
                        feriado ? 'feriado' : '',
                        isSab || isDom ? 'weekend' : ''
                    ].filter(Boolean).join(' ');

                    const textColor = feriado ? getTextColorForBg(feriado.cor_hex) : undefined;

                    return (
                        <div
                            key={indice}
                            className={classNames}
                            onClick={() => handleDataClick(dia)}
                            title={feriado ? feriado.nome : ''}
                            style={feriado ? { color: textColor } : {}}
                        >
                            {feriado && (
                                <div
                                    className="day-bg"
                                    style={{ backgroundColor: feriado.cor_hex }}
                                />
                            )}

                            {dia && (
                                <>
                                    <div className="day-number">{dia}</div>
                                    {feriado && <div className="feriado-dot" style={{ backgroundColor: textColor }} />}
                                </>
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
                                const [ano, mes] = f.data.split('-').map(Number);
                                return ano === anoAtual && mes === mesAtual;
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
