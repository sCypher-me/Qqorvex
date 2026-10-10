import { Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ToastProvider } from "@qqorvex/ui";
import { AreaLayout } from "./shell/AreaLayout";
import { LEGACY_REDIRECTS } from "./shell/navigation";
import { AppUpdateBanner } from "./updates/AppUpdateBanner";
import { WebUpdateWatcher } from "./updates/WebUpdateWatcher";
import { lazyWithRecovery } from "./updates/webUpdate";
import { installSessionAwareFocus, retryQuery, retryQueryDelay } from "./sessionRecovery";

/**
 * Code-splitting por rota: cada página vira o próprio chunk, carregado só quando visitada.
 * "Bundle da app já passou de 500kB" (aviso do Vite) — resolvido aqui, sem mudar nada de
 * comportamento. `ModuleRegistrations` continua eager (roda no mount, pra alimentar a Hoje
 * independente da rota inicial), mas importa só as funções leves de `hoje-provider.ts` de cada
 * módulo — os componentes pesados (KanbanBoard, MonthView, GraphView, BasesPanel...) só entram
 * no bundle quando a página daquele módulo é aberta. `lazyWithRecovery` recarrega a página se um
 * deploy novo removeu o pedaço antigo da tela (ver `updates/webUpdate.ts`).
 */
const HojePage = lazyWithRecovery(() => import("../pages/HojeEditorial").then((m) => ({ default: m.HojeEditorialPage })));
const AppRuntime = lazyWithRecovery(() => import("./AppRuntime").then((m) => ({ default: m.AppRuntime })));
const ProtectedLayout = lazyWithRecovery(() => import("./ProtectedLayout").then((m) => ({ default: m.ProtectedLayout })));
const EmailLoginPage = lazyWithRecovery(() => import("../pages/EmailLogin").then((m) => ({ default: m.EmailLoginPage })));
const AcceptInvitePage = lazyWithRecovery(() => import("../pages/AcceptInvite").then((m) => ({ default: m.AcceptInvitePage })));
const LoginPage = lazyWithRecovery(() => import("../pages/Login").then((m) => ({ default: m.LoginPage })));
const RegistrarPage = lazyWithRecovery(() => import("../pages/Registrar").then((m) => ({ default: m.RegistrarPage })));
const TermosPage = lazyWithRecovery(() => import("../pages/Termos").then((m) => ({ default: m.TermosPage })));
const EsqueciSenhaPage = lazyWithRecovery(() => import("../pages/EsqueciSenha").then((m) => ({ default: m.EsqueciSenhaPage })));
const RedefinirSenhaPage = lazyWithRecovery(() => import("../pages/RedefinirSenha").then((m) => ({ default: m.RedefinirSenhaPage })));
const MfaPage = lazyWithRecovery(() => import("../pages/Mfa").then((m) => ({ default: m.MfaPage })));
const TarefasPage = lazyWithRecovery(() => import("../pages/Tarefas").then((m) => ({ default: m.TarefasPage })));
const AgendaPage = lazyWithRecovery(() => import("../pages/Agenda").then((m) => ({ default: m.AgendaPage })));
const MetasHabitosPage = lazyWithRecovery(() => import("../pages/MetasHabitos").then((m) => ({ default: m.MetasHabitosPage })));
const EstudosPage = lazyWithRecovery(() => import("../pages/Estudos").then((m) => ({ default: m.EstudosPage })));
const EstudosCadernoPage = lazyWithRecovery(() => import("../pages/EstudosCaderno").then((m) => ({ default: m.EstudosCadernoPage })));
const SegundoCerebroPage = lazyWithRecovery(() => import("../pages/SegundoCerebro").then((m) => ({ default: m.SegundoCerebroPage })));
const SegundoCerebroPaginaPage = lazyWithRecovery(() =>
  import("../pages/SegundoCerebroPagina").then((m) => ({ default: m.SegundoCerebroPaginaPage })),
);
const BibliotecaPage = lazyWithRecovery(() => import("../pages/Biblioteca").then((m) => ({ default: m.BibliotecaPage })));
const DocumentosPage = lazyWithRecovery(() => import("../pages/Documentos").then((m) => ({ default: m.DocumentosPage })));
const FinancasPage = lazyWithRecovery(() => import("../pages/Financas").then((m) => ({ default: m.FinancasPage })));
const VidaPessoalPage = lazyWithRecovery(() => import("../pages/VidaPessoal").then((m) => ({ default: m.VidaPessoalPage })));
const ConfiguracoesPage = lazyWithRecovery(() => import("../pages/Configuracoes").then((m) => ({ default: m.ConfiguracoesPage })));
const AssinaturaPage = lazyWithRecovery(() => import("../pages/Assinatura").then((m) => ({ default: m.AssinaturaPage })));
const ManagerPage = lazyWithRecovery(() => import("../pages/Manager").then((m) => ({ default: m.ManagerPage })));
const GamificacaoPage = lazyWithRecovery(() => import("../pages/Gamificacao").then((m) => ({ default: m.GamificacaoPage })));
const VexPage = lazyWithRecovery(() => import("../pages/Vex").then((m) => ({ default: m.VexPage })));

installSessionAwareFocus();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 20_000, refetchOnWindowFocus: true, retry: retryQuery, retryDelay: retryQueryDelay },
  },
});

function PageFallback() {
  return (
    <div aria-busy="true" aria-label="Carregando" role="status" className="flex min-h-[50vh] flex-1 items-center justify-center">
      <span className="h-1.5 w-1.5 animate-pulse-soft rounded-full bg-gold" />
      <span className="sr-only">Carregando…</span>
    </div>
  );
}

function LegacyRedirect({ from, to }: { from: string; to: string }) {
  const location = useLocation();
  const rest = location.pathname.slice(from.length);
  return <Navigate to={`${to}${rest}${location.search}`} replace />;
}

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <BrowserRouter>
          <AppUpdateBanner />
          <WebUpdateWatcher />
          <Suspense fallback={<PageFallback />}>
            <AppRuntime>
              <Routes>
                <Route element={<ProtectedLayout />}>
                  <Route path="/" element={<HojePage />} />
                  <Route path="/planejar" element={<AreaLayout areaKey="planejar" />}>
                    <Route path="tarefas" element={<TarefasPage />} />
                    <Route path="agenda" element={<AgendaPage />} />
                    <Route path="metas" element={<MetasHabitosPage />} />
                  </Route>
                  <Route path="/conhecimento" element={<AreaLayout areaKey="conhecimento" />}>
                    <Route path="estudos" element={<EstudosPage />} />
                    <Route path="estudos/:notebookId" element={<EstudosCadernoPage />} />
                    <Route path="notas" element={<SegundoCerebroPage />} />
                    <Route path="notas/:pageId" element={<SegundoCerebroPaginaPage />} />
                    <Route path="biblioteca" element={<BibliotecaPage />} />
                  </Route>
                  <Route path="/vida" element={<AreaLayout areaKey="vida" />}>
                    <Route path="financas" element={<FinancasPage />} />
                    <Route path="documentos" element={<DocumentosPage />} />
                    <Route path="pessoal" element={<VidaPessoalPage />} />
                  </Route>
                  <Route path="/vex" element={<VexPage />} />
                  <Route path="/conquistas" element={<GamificacaoPage />} />
                  <Route path="/assinatura" element={<AssinaturaPage />} />
                  <Route path="/configuracoes" element={<ConfiguracoesPage />} />
                  <Route path="/configuracoes/:secao" element={<ConfiguracoesPage />} />
                  <Route path="/manager" element={<ManagerPage />} />
                  {LEGACY_REDIRECTS.map((redirect) => (
                    <Route key={redirect.from} path={`${redirect.from}/*`} element={<LegacyRedirect from={redirect.from} to={redirect.to} />} />
                  ))}
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Route>
                <Route path="/mfa" element={<MfaPage />} />
                <Route path="/entrar-por-email" element={<EmailLoginPage />} />
                <Route path="/aceitar-convite" element={<AcceptInvitePage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/criar-conta" element={<RegistrarPage />} />
                <Route path="/termos" element={<TermosPage />} />
                <Route path="/esqueci-senha" element={<EsqueciSenhaPage />} />
                <Route path="/redefinir-senha" element={<RedefinirSenhaPage />} />
              </Routes>
            </AppRuntime>
          </Suspense>
        </BrowserRouter>
      </ToastProvider>
    </QueryClientProvider>
  );
}
