import { BrowserRouter, Route, Routes } from "react-router-dom";
import { PaginaComunicados } from "./pages/PaginaComunicados";
import { PaginaMeuPerfil } from "./pages/PaginaMeuPerfil";
import { PaginaDocumentos } from "./pages/PaginaDocumentos";
import { PaginaFaq } from "./pages/PaginaFaq";
import { PaginaEmConstrucao } from "./pages/PaginaEmConstrucao";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<PaginaComunicados />} />
        <Route path="/meu-perfil" element={<PaginaMeuPerfil />} />
        <Route path="/documentos" element={<PaginaDocumentos />} />
        <Route path="/faq" element={<PaginaFaq />} />
        <Route path="/fale-com-rh" element={<PaginaEmConstrucao titulo="Fale com o RH" />} />
      </Routes>
    </BrowserRouter>
  );
}
