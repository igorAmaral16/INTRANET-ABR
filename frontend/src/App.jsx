import { BrowserRouter, Route, Routes, useNavigate } from "react-router-dom";
import { useEffect, useMemo } from "react";

import { PaginaComunicados } from "./pages/PaginaComunicados";
import { PaginaMeuPerfil } from "./pages/PaginaMeuPerfil";
import { PaginaDocumentos } from "./pages/PaginaDocumentos";
import { PaginaFaq } from "./pages/PaginaFaq";
import { PaginaFaleComRh } from "./pages/PaginaFaleComRh";
import { PaginaCalendario } from "./pages/PaginaCalendario";

import { PaginaAdminComunicados } from "./pages/admin/PaginaAdminComunicados";
import { PaginaAdminCriarComunicado } from "./pages/admin/PaginaAdminCriarComunicado";
import { PaginaAdminDocumentos } from "./pages/admin/PaginaAdminDocumentos";
import { PaginaAdminColaboradores } from "./pages/admin/PaginaAdminColaboradores";
import { PaginaAdminFaq } from "./pages/admin/PaginaAdminFaq";
import { PaginaAdminRelatorios } from "./pages/admin/PaginaAdminRelatorios";
import { PaginaAdminFaleRh } from "./pages/admin/PaginaAdminFaleRh";
import { PaginaAdminCalendario } from "./pages/admin/PaginaAdminCalendario";

import { useSessaoAuth } from "./hooks/useSessaoAuth";
import { useSocketAuth } from "./hooks/useSocketAuth";
import { NotificacoesRhProvider } from "./contexts/NotificacoesRhContext";

function normalizeRole(roleRaw) {
  const r = String(roleRaw || "").toUpperCase();
  if (["ADMIN", "ADMINISTRACAO", "ADMINISTRATIVO"].includes(r)) return "ADMIN";
  if (["COLAB", "COLABORADOR", "COLABORADORES"].includes(r)) return "COLAB";
  return null;
}

function AuthListener() {
  const { sair } = useSessaoAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const onLogout = (ev) => {
      sair();
      navigate("/", { replace: true });
      const msg =
        ev?.detail?.message ||
        "Sua sessão expirou. Faça login novamente para continuar.";
      alert(msg);
    };

    window.addEventListener("auth:logout", onLogout);
    return () => window.removeEventListener("auth:logout", onLogout);
  }, [sair, navigate]);

  return null;
}

function AppInner() {
  const { sessao } = useSessaoAuth();

  const roleNormalizada = useMemo(() => normalizeRole(sessao?.role), [sessao?.role]);

  // Conecta/desconecta o socket conforme o token
  useSocketAuth(sessao?.token);

  return (
    <NotificacoesRhProvider role={roleNormalizada} token={sessao?.token}>
      <AuthListener />
      <Routes>
        {/* COLAB */}
        <Route path="/" element={<PaginaComunicados />} />
        <Route path="/meu-perfil" element={<PaginaMeuPerfil />} />
        <Route path="/documentos" element={<PaginaDocumentos />} />
        <Route path="/faq" element={<PaginaFaq />} />
        <Route path="/fale-com-rh" element={<PaginaFaleComRh />} />
        <Route path="/calendario" element={<PaginaCalendario />} />

        {/* ADMIN */}
        <Route path="/admin" element={<PaginaAdminComunicados />} />
        <Route path="/admin/criar-comunicado" element={<PaginaAdminCriarComunicado />} />
        <Route path="/admin/comunicados/:id/editar" element={<PaginaAdminCriarComunicado />} />
        <Route path="/admin/documentos" element={<PaginaAdminDocumentos />} />
        <Route path="/admin/colaboradores" element={<PaginaAdminColaboradores />} />
        <Route path="/admin/faq" element={<PaginaAdminFaq />} />
        <Route path="/admin/relatorios" element={<PaginaAdminRelatorios />} />
        <Route path="/admin/fale-com-rh" element={<PaginaAdminFaleRh />} />
        <Route path="/admin/calendario" element={<PaginaAdminCalendario />} />
      </Routes>
    </NotificacoesRhProvider>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppInner />
    </BrowserRouter>
  );
}
