import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import './BotaoVoltar.css';

interface BotaVoltarProps {
    destino?: 'anterior' | string; // 'anterior' usar navigate(-1), ou caminho específico
    discreto?: boolean;
}

export function BotaoVoltar({ destino = 'anterior', discreto = true }: BotaVoltarProps) {
    const navigate = useNavigate();

    const handleClick = () => {
        if (destino === 'anterior') {
            navigate(-1);
        } else {
            navigate(destino);
        }
    };

    return (
        <button
            className={`botaoVoltar ${discreto ? 'botaoVoltar--discreto' : ''}`}
            type="button"
            onClick={handleClick}
            title="Voltar para página anterior"
        >
            <ArrowLeft size={18} />
            <span>Voltar</span>
        </button>
    );
}
