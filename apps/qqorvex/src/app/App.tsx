import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

/**
 * Code-splitting por rota: cada página vira o próprio chunk, carregado só quando visitada.
 * "Bundle da app já passou de 500kB" (aviso do Vite) — resolvido aqui, sem mudar nada de
 * comportamento. `ModuleRegistrations` continua eager (roda no mount, pra alimentar a Hoje
 * independente da rota inicial), mas importa só as funções leves de `hoje-provider.ts` de cada
 * módulo — os componentes pesados (KanbanBoard, MonthView, GraphView, BasesPanel...) só entram
 * no bundle quando a página daquele módulo é aberta.
 */
const HojePage = lazy(() => import("../pages/HojeEditorial").then((m) => ({ default: m.HojeEditorialPage })));
const AppRuntime = lazy(() => import("./AppRuntime").then((m) => ({ default: m.AppRuntime })));
const ProtectedLayout = lazy(() => import("./ProtectedLayout").then((m) => ({ default: m.ProtectedLayout })));
const LoginPage = lazy(() => import("../pages/Login").then((m) => ({ default: m.LoginPage })));
const RegistrarPage = lazy(() => import("../pages/Registrar").then((m) => ({ default: m.RegistrarPage })));
const EsqueciSenhaPage = lazy(() => import("../pages/EsqueciSenha").then((m) => ({ default: m.EsqueciSenhaPage })));
const RedefinirSenhaPage = lazy(() => import("../pages/RedefinirSenha").then((m) => ({ default: m.RedefinirSenhaPage })));
const MfaPage = lazy(() => import("../pages/Mfa").then((m) => ({ default: m.MfaPage })));
const TarefasPage = lazy(() => import("../pages/Tarefas").then((m) => ({ default: m.TarefasPage })));
const AgendaPage = lazy(() => import("../pages/Agenda").then((m) => ({ default: m.AgendaPage })));
const MetasHabitosPage = lazy(() => import("../pages/MetasHabitos").then((m) => ({ default: m.MetasHabitosPage })));
const EstudosPage = lazy(() => import("../pages/Estudos").then((m) => ({ default: m.EstudosPage })));
const EstudosCadernoPage = lazy(() => import("../pages/EstudosCaderno").then((m) => ({ default: m.EstudosCadernoPage })));
const SegundoCerebroPage = lazy(() => import("../pages/SegundoCerebro").then((m) => ({ default: m.SegundoCerebroPage })));
const SegundoCerebroPaginaPage = lazy(() =>
  import("../pages/SegundoCerebroPagina").then((m) => ({ default: m.SegundoCerebroPaginaPage })),
);
const BibliotecaPage = lazy(() => import("../pages/Biblioteca").then((m) => ({ default: m.BibliotecaPage })));
const DocumentosPage = lazy(() => import("../pages/Documentos").then((m) => ({ default: m.DocumentosPage })));
const FinancasPage = lazy(() => import("../pages/Financas").then((m) => ({ default: m.FinancasPage })));
const VidaPessoalPage = lazy(() => import("../pages/VidaPessoal").then((m) => ({ default: m.VidaPessoalPage })));
const PerfilPage = lazy(() => import("../pages/Perfil").then((m) => ({ default: m.PerfilPage })));
const AssinaturaPage = lazy(() => import("../pages/Assinatura").then((m) => ({ default: m.AssinaturaPage })));
const ManagerPage = lazy(() => import("../pages/Manager").then((m) => ({ default: m.ManagerPage })));
const GamificacaoPage = lazy(() => import("../pages/Gamificacao").then((m) => ({ default: m.GamificacaoPage })));
const VexPage = lazy(() => import("../pages/Vex").then((m) => ({ default: m.VexPage })));

const queryClient = new QueryClient();

function PageFallback() {
  return (
    <main
      aria-busy="true"
      aria-label="Carregando Qqorvex"
      className="flex min-h-screen flex-1 items-center justify-center py-24"
    >
      <div className="flex flex-col items-center gap-3" role="status" aria-live="polite">
        <h1 className="sr-only">Carregando Qqorvex</h1>
        <span className="flex items-center gap-2.5 text-sm text-text-secondary">
          <span className="w-[7px] h-[7px] rounded-full bg-vex-cyan-bright animate-core-glow" />
          Carregando...
        </span>
      </div>
    </main>
  );
}

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Suspense fallback={<PageFallback />}>
          <AppRuntime>
            <Routes>
              <Route element={<ProtectedLayout />}>
                <Route path="/" element={<HojePage />} />
                <Route path="/tarefas" element={<TarefasPage />} />
                <Route path="/agenda" element={<AgendaPage />} />
                <Route path="/metas-habitos" element={<MetasHabitosPage />} />
                <Route path="/estudos" element={<EstudosPage />} />
                <Route path="/estudos/:notebookId" element={<EstudosCadernoPage />} />
                <Route path="/segundo-cerebro" element={<SegundoCerebroPage />} />
                <Route path="/segundo-cerebro/:pageId" element={<SegundoCerebroPaginaPage />} />
                <Route path="/biblioteca" element={<BibliotecaPage />} />
                <Route path="/documentos" element={<DocumentosPage />} />
                <Route path="/financas" element={<FinancasPage />} />
                <Route path="/vida-pessoal" element={<VidaPessoalPage />} />
                <Route path="/perfil" element={<PerfilPage />} />
                <Route path="/assinatura" element={<AssinaturaPage />} />
                <Route path="/gamificacao" element={<GamificacaoPage />} />
                <Route path="/manager" element={<ManagerPage />} />
                <Route path="/seguranca" element={<Navigate to="/perfil?aba=seguranca" replace />} />
                <Route path="/vex" element={<VexPage />} />
              </Route>
              <Route path="/mfa" element={<MfaPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/criar-conta" element={<RegistrarPage />} />
              <Route path="/esqueci-senha" element={<EsqueciSenhaPage />} />
              <Route path="/redefinir-senha" element={<RedefinirSenhaPage />} />
            </Routes>
          </AppRuntime>
        </Suspense>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
