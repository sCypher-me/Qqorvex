import { Component, type ErrorInfo, type ReactNode } from "react";

interface AppErrorBoundaryProps {
  children: ReactNode;
}

interface AppErrorBoundaryState {
  hasError: boolean;
}

/**
 * Última barreira contra tela branca. O detalhe técnico fica no console do navegador;
 * a interface mostra uma recuperação segura sem expor stack trace ao usuário.
 */
export class AppErrorBoundary extends Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): AppErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Erro não tratado na interface do Qqorvex", { error, errorInfo });
  }

  private handleReload = () => {
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <main className="flex min-h-screen items-center justify-center bg-[#06080b] px-5 py-10 text-fg">
        <section className="flex min-w-0 flex-col gap-3 rounded-xl border border-line bg-surface p-4 w-full max-w-[520px] p-6 sm:p-8" role="alert" aria-labelledby="app-error-title">
          <span className="text-[11px] font-medium uppercase tracking-wider text-fg-4 text-gold-fg">Qqorvex</span>
          <h1 id="app-error-title" className="mt-2 font-display text-2xl font-semibold">
            Algo interrompeu esta tela
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-fg-2">
            O aplicativo não conseguiu renderizar esta página. Seus dados continuam protegidos. Tente recarregar para continuar.
          </p>
          <button type="button" onClick={this.handleReload} className="inline-flex items-center justify-center gap-1.5 rounded-lg font-medium transition-colors disabled:pointer-events-none disabled:opacity-45 h-9 px-3.5 text-[13.5px] bg-gold text-on-gold hover:bg-gold-hover mt-6">
            Recarregar aplicativo
          </button>
        </section>
      </main>
    );
  }
}
