import { lazy, Suspense, useEffect } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "@qqorvex/auth";
import { ProtectedLayout } from "./ProtectedLayout";
import { registerHojeProvider } from "@qqorvex/module-hoje";
import { createTasksHojeProvider } from "@qqorvex/module-tarefas";
import { createAgendaHojeProvider } from "@qqorvex/module-agenda";
import { createGoalsHabitsHojeProvider } from "@qqorvex/module-metas-habitos";
import { createEstudosHojeProvider } from "@qqorvex/module-estudos";
import { createSegundoCerebroHojeProvider } from "@qqorvex/module-segundo-cerebro";
import { createBibliotecaHojeProvider } from "@qqorvex/module-biblioteca";
import { createDocumentosHojeProvider } from "@qqorvex/module-documentos";
import { createFinancasHojeProvider } from "@qqorvex/module-financas";
import { createVidaPessoalHojeProvider } from "@qqorvex/module-vida-pessoal";
import { supabase } from "./supabase";

/**
 * Code-splitting por rota: cada página vira o próprio chunk, carregado só quando visitada.
 * "Bundle da app já passou de 500kB" (aviso do Vite) — resolvido aqui, sem mudar nada de
 * comportamento. `ModuleRegistrations` continua eager (roda no mount, pra alimentar a Hoje
 * independente da rota inicial), mas importa só as funções leves de `hoje-provider.ts` de cada
 * módulo — os componentes pesados (KanbanBoard, MonthView, GraphView, BasesPanel...) só entram
 * no bundle quando a página daquele módulo é aberta.
 */
const HojePage = lazy(() => import("../pages/Hoje").then((m) => ({ default: m.HojePage })));
const LoginPage = lazy(() => import("../pages/Login").then((m) => ({ default: m.LoginPage })));
const MfaPage = lazy(() => import("../pages/Mfa").then((m) => ({ default: m.MfaPage })));
const SegurancaPage = lazy(() => import("../pages/Seguranca").then((m) => ({ default: m.SegurancaPage })));
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
const VexPage = lazy(() => import("../pages/Vex").then((m) => ({ default: m.VexPage })));

const queryClient = new QueryClient();

function ModuleRegistrations() {
  useEffect(() => {
    const unregisterFns = [
      registerHojeProvider(createTasksHojeProvider(supabase)),
      registerHojeProvider(createAgendaHojeProvider(supabase)),
      registerHojeProvider(createGoalsHabitsHojeProvider(supabase)),
      registerHojeProvider(createEstudosHojeProvider(supabase)),
      registerHojeProvider(createSegundoCerebroHojeProvider(supabase)),
      registerHojeProvider(createBibliotecaHojeProvider(supabase)),
      registerHojeProvider(createDocumentosHojeProvider(supabase)),
      registerHojeProvider(createFinancasHojeProvider(supabase)),
      registerHojeProvider(createVidaPessoalHojeProvider(supabase)),
    ];
    return () => unregisterFns.forEach((unregister) => unregister());
  }, []);
  return null;
}

function PageFallback() {
  return (
    <main className="min-h-screen bg-background flex items-center justify-center">
      <p className="font-sans text-sm text-text-secondary-warm">Carregando...</p>
    </main>
  );
}

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider client={supabase}>
        <ModuleRegistrations />
        <BrowserRouter>
          <Suspense fallback={<PageFallback />}>
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
                <Route path="/seguranca" element={<SegurancaPage />} />
                <Route path="/vex" element={<VexPage />} />
              </Route>
              <Route path="/mfa" element={<MfaPage />} />
              <Route path="/login" element={<LoginPage />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}
