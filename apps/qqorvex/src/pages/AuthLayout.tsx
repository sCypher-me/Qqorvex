import type { ReactNode } from "react";
import { BRAND_ASSETS } from "../app/shell/navigation";
import { ThemeToggle } from "../app/shell/ThemeToggle";

export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="relative grid min-h-svh grid-cols-1 bg-surface-1 desktop:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
      <div className="absolute right-5 top-5 z-10"><ThemeToggle /></div>
      <section className="relative hidden overflow-hidden border-r border-border/70 bg-background p-8 desktop:flex desktop:flex-col desktop:justify-between wide:p-12">
        <div className="relative z-[2] flex items-center gap-3">
          <img src={BRAND_ASSETS.symbol} alt="" className="h-8 w-8 object-contain" />
          <img src={BRAND_ASSETS.wordmark} alt="Qqorvex" className="h-[22px] object-contain" />
        </div>
        <div className="relative z-[2] flex max-w-[620px] flex-col gap-6 pr-3">
          <p className="qv-eyebrow m-0 text-brand-primary">Seu mapa pessoal</p>
          <h2 className="m-0 font-display text-[clamp(3rem,4.2vw,5rem)] font-semibold leading-[1.02] tracking-[-0.04em]">
            Um lugar para enxergar o que importa.
          </h2>
          <p className="m-0 max-w-[470px] text-[16px] leading-[1.7] text-text-secondary">
            Tarefas, agenda, estudos, finanças e memória na mesma casa. Você mantém o controle; a Vex participa quando chamada.
          </p>
          <div className="qv-observatory-track mt-4 max-w-[430px] border-t border-border/70 pt-5" aria-label="Observar, organizar, continuar">
            <span>Observar</span><span>Organizar</span><span>Continuar</span>
          </div>
        </div>
        <span className="relative z-[2] border-t border-border/70 pt-5 text-xs text-text-muted">Observação · memória · continuidade</span>
      </section>

      <section className="relative flex min-w-0 items-center justify-center px-5 py-8 sm:px-8 desktop:px-12 desktop:py-16">
        <div className="flex w-full max-w-[490px] flex-col gap-8 animate-page-in">
          <div className="flex items-center gap-3 border-b border-border/70 pb-6 desktop:hidden">
            <img src={BRAND_ASSETS.symbol} alt="" className="w-[26px] h-[26px] object-contain" />
            <img src={BRAND_ASSETS.wordmark} alt="Qqorvex" className="h-[22px] object-contain" />
          </div>
          {children}
        </div>
      </section>
    </main>
  );
}
