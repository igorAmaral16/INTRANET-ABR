import { BrowserRouter, Route, Routes, useNavigate } from "react-router-dom";
import { useEffect } from "react";

import { PaginaComunicados } from "./pages/PaginaComunicados";
import { PaginaMeuPerfil } from "./pages/PaginaMeuPerfil";
import { PaginaDocumentos } from "./pages/PaginaDocumentos";
import { PaginaFaq } from "./pages/PaginaFaq";
import { PaginaEmConstrucao } from "./pages/PaginaEmConstrucao";

import { PaginaAdminComunicados } from "./pages/PaginaAdminComunicados";
import { PaginaAdminCriarComunicado } from "./pages/admin/PaginaAdminCriarComunicado";
import { PaginaAdminDocumentos } from "./pages/admin/PaginaAdminDocumentos";
import { PaginaAdminColaboradores } from "./pages/admin/PaginaAdminColaboradores";
import { PaginaAdminFaq } from "./pages/admin/PaginaAdminFaq";
import { PaginaAdminRelatorios } from "./pages/admin/PaginaAdminRelatorios";

import { useSessaoAuth } from "./hooks/useSessaoAuth";

function AuthListener() {
  const { sair } = useSessaoAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const onLogout = (ev) => {
      sair();
      navigate("/", { replace: true });
      const msg = ev?.detail?.message || "Sua sessão expirou. Faça login novamente para continuar.";
      alert(msg);
    };

    window.addEventListener("auth:logout", onLogout);
    return () => window.removeEventListener("auth:logout", onLogout);
  }, [sair, navigate]);

  return null;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthListener />
      <Routes>
        {/* COLAB */}
        <Route path="/" element={<PaginaComunicados />} />
        <Route path="/meu-perfil" element={<PaginaMeuPerfil />} />
        <Route path="/documentos" element={<PaginaDocumentos />} />
        <Route path="/faq" element={<PaginaFaq />} />
        <Route path="/fale-com-rh" element={<PaginaEmConstrucao titulo="Fale com o RH" />} />

        {/* ADMIN */}
        <Route path="/admin" element={<PaginaAdminComunicados />} />
        <Route path="/admin/criar-comunicado" element={<PaginaAdminCriarComunicado />} />
        <Route path="/admin/comunicados/:id/editar" element={<PaginaAdminCriarComunicado />} />

        <Route path="/admin/documentos" element={<PaginaAdminDocumentos />} />
        <Route path="/admin/colaboradores" element={<PaginaAdminColaboradores />} />
        <Route path="/admin/faq" element={<PaginaAdminFaq />} />
        <Route path="/admin/relatorios" element={<PaginaAdminRelatorios />} />
      </Routes>
    </BrowserRouter>
  );
}
