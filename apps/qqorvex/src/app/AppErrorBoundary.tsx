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
      <main className="flex min-h-screen items-center justify-center bg-[#06080b] px-5 py-10 text-text-primary">
        <section className="qv-card w-full max-w-[520px] p-6 sm:p-8" role="alert" aria-labelledby="app-error-title">
          <span className="qv-eyebrow text-vex-gold-bright">Qqorvex</span>
          <h1 id="app-error-title" className="mt-2 font-display text-2xl font-semibold">
            Algo interrompeu esta tela
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-text-secondary">
            O aplicativo não conseguiu renderizar esta página. Seus dados continuam protegidos. Tente recarregar para continuar.
          </p>
          <button type="button" onClick={this.handleReload} className="qv-btn qv-btn-primary mt-6">
            Recarregar aplicativo
          </button>
        </section>
      </main>
    );
  }
}
