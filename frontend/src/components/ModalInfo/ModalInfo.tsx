import { Modal } from "../Modal/Modal";

type Props = {
    aberto: boolean;
    titulo: string;
    mensagem: string;
    aoFechar: () => void;
};

export function ModalInfo({ aberto, titulo, mensagem, aoFechar }: Props) {
    return (
        <Modal aberto={aberto} titulo={titulo} aoFechar={aoFechar}>
            <div style={{ display: "grid", gap: 12 }}>
                <p style={{ margin: 0, lineHeight: 1.45, opacity: 0.85 }}>{mensagem}</p>
                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                    <button type="button" onClick={aoFechar} style={{ height: 42, borderRadius: 14, padding: "0 14px" }}>
                        Entendi
                    </button>
                </div>
            </div>
        </Modal>
    );
}
