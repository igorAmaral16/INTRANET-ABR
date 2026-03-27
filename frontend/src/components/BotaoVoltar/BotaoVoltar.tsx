import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import './BotaoVoltar.css';

interface BotaVoltarProps {
    destino?: 'anterior' | string; // 'anterior' usar navigate(-1), ou caminho específico
    discreto?: boolean;
    label?: string;
}

export function BotaoVoltar({ destino = 'anterior', discreto = true, label }: BotaVoltarProps) {
    const navigate = useNavigate();

    const handleClick = () => {
        if (destino === 'anterior') {
            navigate(-1);
        } else {
            navigate(destino);
        }
    };

    const ariaLabel = label || 'Voltar para página anterior';

    return (
        <button
            className={`botaoVoltar ${discreto ? 'botaoVoltar--discreto' : ''}`}
            type="button"
            onClick={handleClick}
            title={ariaLabel}
            aria-label={ariaLabel}
        >
            <ArrowLeft size={18} />
            <span>Voltar</span>
        </button>
    );
}
